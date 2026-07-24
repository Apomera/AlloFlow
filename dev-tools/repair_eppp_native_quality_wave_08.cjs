#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { reviewedAt, reviewWave, warningCountsBefore, revisions } = require('./eppp_native_quality_wave_08_data.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const actionDocketPath = path.join(root, 'test_prep', 'eppp_distractor_action_docket.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const outputRoots = [
  path.join(root, 'test_prep'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep'),
];
const diagnosticsScript = path.join(root, 'dev-tools', 'audit_eppp_distractor_quality.cjs');
const outputBasename = 'eppp_native_quality_audit_wave_08';
const existingAuditPath = path.join(outputRoots[0], outputBasename + '.json');
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, contents);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

const sourceText = fs.readFileSync(sourcePath, 'utf8');
if (fs.readFileSync(deployPath, 'utf8') !== sourceText) {
  throw new Error('Source and deploy EPPP banks must match before wave 08.');
}
const bank = JSON.parse(sourceText);
const actionDocket = JSON.parse(fs.readFileSync(actionDocketPath, 'utf8'));
const diagnosticsBefore = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (!Array.isArray(revisions) || revisions.length !== 8) throw new Error('Wave 08 must contain exactly eight revisions.');
if (!Array.isArray(actionDocket.actionItems)) throw new Error('Missing the EPPP distractor action docket.');

const bankById = new Map(bank.map((item) => [item.id, item]));
const actionById = new Map(actionDocket.actionItems.map((item) => [item.id, item]));
const existingAudit = fs.existsSync(existingAuditPath) ? JSON.parse(fs.readFileSync(existingAuditPath, 'utf8')) : null;
const existingAuditById = new Map((existingAudit?.items || []).map((item) => [item.id, item]));
const auditItems = [];
for (const revision of revisions) {
  const item = bankById.get(revision.id);
  const action = actionById.get(revision.id);
  if (!item) throw new Error('Missing selected item: ' + revision.id);
  if ((!action || action.actionRank !== revision.expectedActionRank) && item.wordingReviewWave !== reviewWave) {
    throw new Error(revision.id + ' action-docket rank drifted.');
  }
  if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(revision.id + ' answer position drifted.');
  if (item.prompt !== revision.expectedPrompt && item.wordingReviewWave !== reviewWave) {
    throw new Error(revision.id + ' source prompt drifted.');
  }
  if (!Array.isArray(revision.choices) || revision.choices.length !== 4
    || new Set(revision.choices.map((choice) => choice.toLowerCase())).size !== 4) {
    throw new Error(revision.id + ' needs four distinct choices.');
  }
  if (!Array.isArray(revision.choiceRationales) || revision.choiceRationales.length !== 4
    || revision.choiceRationales.some((feedback) => feedback.length < 120 || genericFeedbackPattern.test(feedback))) {
    throw new Error(revision.id + ' needs four substantive, non-generic explanations.');
  }
  if (revision.choices.some((choice) => extremeCuePattern.test(choice))) {
    throw new Error(revision.id + ' still contains an extreme cue.');
  }
  if (!revision.sourceCheck || revision.sourceCheck.length < 150) {
    throw new Error(revision.id + ' needs a substantive source check.');
  }
  if (!Array.isArray(revision.sourceDetails) || revision.sourceDetails.length !== revision.references.length
    || revision.sourceDetails.some((source) => !revision.references.includes(source.url)
      || source.title.length < 20
      || source.organization.length < 10
      || source.summary.length < 120
      || source.credibility.length < 120)) {
    throw new Error(revision.id + ' needs complete source metadata.');
  }
  if (!['application', 'analysis'].includes(revision.cognitiveProcess)) {
    throw new Error(revision.id + ' needs applied or analytic demand.');
  }
  if (!Array.isArray(revision.distractorDesign) || revision.distractorDesign.length !== 3) {
    throw new Error(revision.id + ' needs three distractor rationales.');
  }

  item.prompt = revision.prompt;
  item.choices = [...revision.choices];
  item.rationale = revision.rationale;
  item.choiceRationales = [...revision.choiceRationales];
  item.choiceRationales[item.answerIndex] = item.rationale;
  item.references = [...revision.references];
  item.sourceDetails = revision.sourceDetails.map((source) => ({ ...source }));
  item.learningObjectiveId = revision.learningObjectiveId;
  item.cognitiveProcess = revision.cognitiveProcess;
  item.distractorDesign = [...revision.distractorDesign];
  item.wordingReviewStatus = 'editorial-deep-rewrite-pass';
  item.wordingReviewWave = reviewWave;
  item.optionFeedbackRefinementWave = reviewWave;
  item.optionFeedbackRefinedAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;
  item.sourceReviewBasis = 'item-specific-authoritative-source-review';
  delete item.sourceAnchorItemId;
  delete item.sourceMatchScore;
  item.clueReviewStatus = 'editorial-pass-after-manual-option-review';
  item.biasAccessibilityStatus = 'editorial-pass';

  auditItems.push({
    id: item.id,
    domainId: item.domainId,
    difficulty: item.difficulty,
    answerIndex: item.answerIndex,
    expectedAnswerIndex: revision.expectedAnswerIndex,
    keyPositionPreserved: item.answerIndex === revision.expectedAnswerIndex,
    cognitiveProcess: item.cognitiveProcess,
    learningObjectiveId: item.learningObjectiveId,
    sourceCheck: revision.sourceCheck,
    diagnosticsBefore: [...(action?.diagnostics || existingAuditById.get(item.id)?.diagnosticsBefore || [])],
  });
}

const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFileWithRetry(sourcePath, bankJson);
writeFileWithRetry(deployPath, bankJson);

const catalogText = fs.readFileSync(catalogPath, 'utf8');
if (fs.readFileSync(deployCatalogPath, 'utf8') !== catalogText) {
  throw new Error('Source and deploy reference catalogs must match before wave 08.');
}
const catalog = JSON.parse(catalogText);
for (const revision of revisions) {
  for (const source of revision.sourceDetails) {
    catalog[source.url] = {
      title: source.title,
      organization: source.organization,
      summary: source.summary,
      credibility: source.credibility,
      metadataSource: 'pack-authored',
    };
  }
}
const orderedCatalog = Object.fromEntries(Object.entries(catalog).sort(([left], [right]) => left.localeCompare(right)));
const catalogJson = JSON.stringify(orderedCatalog, null, 2) + '\n';
writeFileWithRetry(catalogPath, catalogJson);
writeFileWithRetry(deployCatalogPath, catalogJson);

execFileSync(process.execPath, [diagnosticsScript], { cwd: root, stdio: 'pipe' });
const diagnosticsAfter = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
const selectedIds = new Set(revisions.map((revision) => revision.id));
const afterByFamily = {
  lexical: diagnosticsAfter.uniqueKeyStemLexicalLeakage.filter((entry) => selectedIds.has(entry.id)).map((entry) => entry.id),
  extreme: diagnosticsAfter.asymmetricExtremeDistractors.filter((entry) => selectedIds.has(entry.id)).map((entry) => entry.id),
  recall: diagnosticsAfter.advancedDirectRecall.filter((entry) => selectedIds.has(entry.id)).map((entry) => entry.id),
  duplicate: diagnosticsAfter.semanticConceptDuplicates.pairs
    .filter((pair) => selectedIds.has(pair.leftId) || selectedIds.has(pair.rightId))
    .map((pair) => [pair.leftId, pair.rightId].sort().join(' / ')),
};
const selectedWarningIdsAfter = [...new Set([
  ...afterByFamily.lexical,
  ...afterByFamily.extreme,
  ...afterByFamily.recall,
  ...afterByFamily.duplicate.flatMap((pair) => pair.split(' / ').filter((id) => selectedIds.has(id))),
])].sort();

for (const auditItem of auditItems) {
  auditItem.diagnosticsAfter = [
    ...(afterByFamily.lexical.includes(auditItem.id) ? ['unique-key/stem-lexical-leakage'] : []),
    ...(afterByFamily.extreme.includes(auditItem.id) ? ['asymmetric-extreme-distractors'] : []),
    ...(afterByFamily.recall.includes(auditItem.id) ? ['advanced-direct-recall'] : []),
    ...(afterByFamily.duplicate.some((pair) => pair.split(' / ').includes(auditItem.id))
      ? ['semantic-concept-duplicate-candidate']
      : []),
  ];
}

const report = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  reportType: 'source-checked-native-item-repair',
  scope: 'Deep-rewrite the next eight unreviewed items in the adjudication-aware distractor action docket while preserving answer positions and full option-level teaching feedback.',
  challengeCriteria: [
    'replace definition completion with application or analysis where difficulty warrants',
    'use adjacent, instructionally plausible distractors without stacked absolute cues',
    'avoid keyed lexical echoes that allow answer selection without construct knowledge',
    'separate intentionally related coverage by decision, context, or cognitive demand',
    'verify the key and rationale against an item-specific authoritative or peer-reviewed source',
    'provide four substantive, option-specific explanations and preserve answer positions',
  ],
  summary: {
    totalItems: bank.length,
    rewrittenItems: auditItems.length,
    domainsCovered: new Set(auditItems.map((item) => item.domainId)).size,
    appliedOrAnalysisItems: auditItems.filter((item) => ['application', 'analysis'].includes(item.cognitiveProcess)).length,
    keyPositionsPreserved: auditItems.filter((item) => item.keyPositionPreserved).length,
    optionSpecificExplanations: auditItems.length * 4,
    selectedItemsWithWarningsAfter: selectedWarningIdsAfter.length,
    selectedWarningIdsAfter,
    warningCountsBefore: { ...warningCountsBefore },
    warningCountsAfter: { ...diagnosticsAfter.summary },
    status: selectedWarningIdsAfter.length ? 'review-required' : 'pass',
  },
  items: auditItems,
  limitations: ['Editorial/source review is not psychometric calibration, item-response analysis, or independent licensed-psychologist validation.'],
};

const markdown = `# EPPP native distractor-quality repair - wave 08

Reviewed: ${reviewedAt}

## Result

- Deep-rewrote ${report.summary.rewrittenItems} source-checked questions across ${report.summary.domainsCovered} domains.
- Preserved all ${report.summary.keyPositionsPreserved} answer positions and supplied ${report.summary.optionSpecificExplanations} option-specific explanations.
- Converted every selected item to application or analysis and removed stacked absolute distractors.
- ${report.summary.selectedItemsWithWarningsAfter
    ? `Kept ${report.summary.selectedItemsWithWarningsAfter} selected items in review because at least one warning remains: ${report.summary.selectedWarningIdsAfter.join(', ')}.`
    : 'Cleared all four warning families for the selected tranche.'}

> Editorial/source review is not psychometric calibration, item-response analysis, or independent licensed-psychologist validation.
`;

const json = JSON.stringify(report, null, 2) + '\n';
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.json'), json);
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.md'), markdown);
}

console.log('EPPP native quality wave 08: ' + auditItems.length + ' rewritten; '
  + selectedWarningIdsAfter.length + ' selected items retain diagnostics; ' + report.summary.status + '.');
