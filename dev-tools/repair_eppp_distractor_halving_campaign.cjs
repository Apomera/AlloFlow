#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  CAMPAIGN_MODES,
  assertMetricCeilings,
  assertMetricMonotonicity,
  buildRevision,
  prepareCampaign,
  stableStringify,
  writePairedFiles,
} = require('./eppp_quality_campaign_core.cjs');
const {
  BASELINE_METRICS,
  BUFFERED_TARGETS,
  CAMPAIGN_ID,
  CAMPAIGN_ITEMS,
  CAMPAIGN_ITEM_IDS,
  HALVING_CEILINGS,
} = require('./eppp_distractor_halving_campaign_manifest.cjs');
const { hydrateItemSources } = require('./eppp_quality_campaign_sources.cjs');
const {
  buildOptionFeedback,
  feedbackCodes,
  normalize: normalizeFeedback,
} = require('./repair_eppp_feedback_halving_campaign.cjs');

const root = path.resolve(__dirname, '..');
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
const sourceCatalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'reference_catalog.json');
const sourceAuditPath = path.join(root, 'test_prep', 'eppp_quality_halving_distractor_campaign.json');
const deployAuditPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_quality_halving_distractor_campaign.json');
const sourceAuditMarkdownPath = path.join(root, 'test_prep', 'eppp_quality_halving_distractor_campaign.md');
const deployAuditMarkdownPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_quality_halving_distractor_campaign.md');
const distractorDiagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const reviewedAt = '2026-07-25';
const shardFiles = [
  './eppp_distractor_halving_revisions_a.cjs',
  './eppp_distractor_halving_revisions_b.cjs',
  './eppp_distractor_halving_revisions_c.cjs',
];

const metricKeys = Object.freeze(Object.keys(BASELINE_METRICS));
const manifestById = new Map(CAMPAIGN_ITEMS.map((record) => [record.id, record]));
const mutableReplacementFields = Object.freeze([
  'prompt',
  'choices',
  'rationale',
  'choiceRationales',
  'learningObjectiveId',
  'cognitiveProcess',
  'distractorDesign',
]);
const replayContentFields = Object.freeze([
  'prompt',
  'choices',
  'rationale',
  'references',
  'sourceDetails',
  'learningObjectiveId',
  'cognitiveProcess',
  'distractorDesign',
  'qualityCampaignReview',
  'qualityReviewHistory',
  'qaReviewedAt',
  'clueReviewStatus',
  'biasAccessibilityStatus',
  'domainAlignmentStatus',
]);

function contentFingerprint(item) {
  const projection = {
    prompt: item.prompt,
    choices: item.choices,
    rationale: item.rationale,
    references: item.references,
  };
  return crypto.createHash('sha256').update(JSON.stringify(projection)).digest('hex');
}

function loadAuthoredRevisions() {
  const combined = {};
  const shardSummaries = [];
  for (const file of shardFiles) {
    const shard = require(file);
    const ids = Object.keys(shard.revisions || {});
    shardSummaries.push({ shardId: shard.shardId, items: ids.length, domains: [...(shard.assignedDomains || [])] });
    for (const id of ids) {
      if (combined[id]) throw new Error(`Duplicate authored distractor revision: ${id}.`);
      combined[id] = shard.revisions[id];
    }
  }
  const actual = Object.keys(combined).sort();
  const expected = [...CAMPAIGN_ITEM_IDS].sort();
  if (stableStringify(actual) !== stableStringify(expected)) {
    const missing = expected.filter((id) => !combined[id]);
    const extra = actual.filter((id) => !manifestById.has(id));
    throw new Error(`Authored distractor cohort mismatch; missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}.`);
  }
  return { revisions: combined, shardSummaries };
}

function diagnosticMetrics(report) {
  return Object.fromEntries(metricKeys.map((key) => [key, report.summary[key]]));
}

function campaignMarker(item) {
  return (item.qualityReviewHistory || []).find((entry) => entry && entry.campaignId === CAMPAIGN_ID && entry.mode === CAMPAIGN_MODES.DEEP_REWRITE);
}

function sourceAndReplacementSet(item, authored, catalog, record) {
  const set = {};
  for (const field of mutableReplacementFields) {
    if (Object.prototype.hasOwnProperty.call(authored, field)) set[field] = authored[field];
  }
  const nextRationale = Object.prototype.hasOwnProperty.call(set, 'rationale') ? set.rationale : item.rationale;
  const initialFeedback = Object.prototype.hasOwnProperty.call(set, 'choiceRationales')
    ? set.choiceRationales
    : item.choiceRationales;
  if (!Array.isArray(initialFeedback) || initialFeedback.length !== 4) {
    throw new Error(`${item.id} must provide four choice explanations.`);
  }
  const nextFeedback = [...initialFeedback];
  nextFeedback[item.answerIndex] = nextRationale;

  const hydrated = hydrateItemSources(item, catalog);
  set.references = hydrated.references;
  set.sourceDetails = hydrated.sourceDetails;
  const nextItem = {
    ...item,
    ...set,
    choiceRationales: nextFeedback,
  };
  const feedbackModes = {};
  for (let optionIndex = 0; optionIndex < nextItem.choices.length; optionIndex += 1) {
    if (optionIndex === nextItem.answerIndex) continue;
    const codes = feedbackCodes(nextItem, optionIndex, nextFeedback[optionIndex]);
    if (codes.length) {
      const built = buildOptionFeedback(nextItem, optionIndex);
      nextFeedback[optionIndex] = built.text;
      feedbackModes[optionIndex] = built.mode;
    } else {
      feedbackModes[optionIndex] = 'authored-or-precleared-feedback-preserved';
    }
  }
  set.choiceRationales = nextFeedback;
  const incorrectFeedback = nextFeedback
    .filter((_feedback, optionIndex) => optionIndex !== nextItem.answerIndex)
    .map(normalizeFeedback);
  if (new Set(incorrectFeedback).size !== 3) {
    throw new Error(`${item.id} needs three distinct incorrect-option explanations.`);
  }
  for (let optionIndex = 0; optionIndex < nextItem.choices.length; optionIndex += 1) {
    if (optionIndex === nextItem.answerIndex) continue;
    const codes = feedbackCodes({ ...nextItem, choiceRationales: nextFeedback }, optionIndex, nextFeedback[optionIndex]);
    if (codes.length) throw new Error(`${item.id} option ${optionIndex} retained feedback warnings: ${codes.join(', ')}.`);
  }
  set.qualityCampaignReview = {
    campaignId: CAMPAIGN_ID,
    mode: CAMPAIGN_MODES.DEEP_REWRITE,
    reviewedAt,
    expectedWarningFamilies: [...record.expectedWarningFamilies],
    editorialNote: authored.editorialNote,
    feedbackModes,
  };
  const history = Array.isArray(item.qualityReviewHistory) ? item.qualityReviewHistory.filter((entry) => entry?.campaignId !== CAMPAIGN_ID) : [];
  history.push({
    campaignId: CAMPAIGN_ID,
    mode: CAMPAIGN_MODES.DEEP_REWRITE,
    reviewedAt,
    expectedWarningFamilies: [...record.expectedWarningFamilies],
  });
  set.qualityReviewHistory = history;
  set.qaReviewedAt = reviewedAt;
  set.clueReviewStatus = 'editorial-pass-after-manual-option-review';
  set.biasAccessibilityStatus = 'editorial-pass';
  set.domainAlignmentStatus = 'editorial-pass';
  return { set, hydrated };
}

function isReviewedAfterState(item, set) {
  if (!campaignMarker(item)) return false;
  const reviewedContentMatches = replayContentFields.every((field) => (
    !Object.prototype.hasOwnProperty.call(set, field)
    || stableStringify(item[field]) === stableStringify(set[field])
  ));
  if (!reviewedContentMatches) return false;
  if (item.feedbackHalvingCampaign) return true;
  return stableStringify(item.choiceRationales) === stableStringify(set.choiceRationales);
}

function warningIdsForCampaign(report) {
  const selected = new Set(CAMPAIGN_ITEM_IDS);
  const lexical = report.uniqueKeyStemLexicalLeakage.filter((entry) => selected.has(entry.id)).map((entry) => entry.id);
  const extreme = report.asymmetricExtremeDistractors.filter((entry) => selected.has(entry.id)).map((entry) => entry.id);
  const recall = report.advancedDirectRecall.filter((entry) => selected.has(entry.id)).map((entry) => entry.id);
  const duplicatePairs = report.semanticConceptDuplicates.pairs
    .filter((pair) => selected.has(pair.leftId) || selected.has(pair.rightId))
    .map((pair) => `${pair.leftId} / ${pair.rightId}`);
  return { lexical, extreme, recall, duplicatePairs };
}

function writeCampaignAudit(audit) {
  const markdown = `# EPPP distractor-quality halving campaign

Reviewed: ${reviewedAt}

## Result

- ${audit.summary.rewrittenItems} source-backed items are in the deep-rewrite campaign.
- All ${audit.summary.keyPositionsPreserved} answer positions were preserved.
- Distractor metrics moved from ${Object.values(audit.summary.metricsBefore).join(' / ')} to ${Object.values(audit.summary.metricsAfter).join(' / ')}.
- The campaign is **${audit.summary.status}** against the post-Wave 16 halving ceilings.

This is a source-grounded editorial campaign, not psychometric calibration or independent licensed-psychologist validation.
`;
  writePairedFiles({
    sourcePath: sourceAuditPath,
    deployPath: deployAuditPath,
    contents: JSON.stringify(audit, null, 2) + '\n',
  });
  writePairedFiles({
    sourcePath: sourceAuditMarkdownPath,
    deployPath: deployAuditMarkdownPath,
    contents: markdown,
  });
}

function run({ apply = false, enforceCeilings = true } = {}) {
  const { revisions: authoredById, shardSummaries } = loadAuthoredRevisions();
  const sourceBankText = fs.readFileSync(sourceBankPath, 'utf8');
  const deployBankText = fs.readFileSync(deployBankPath, 'utf8');
  const sourceCatalogText = fs.readFileSync(sourceCatalogPath, 'utf8');
  const deployCatalogText = fs.readFileSync(deployCatalogPath, 'utf8');
  if (sourceBankText !== deployBankText) throw new Error('Source and deploy EPPP banks differ before the distractor campaign.');
  if (sourceCatalogText !== deployCatalogText) throw new Error('Source and deploy reference catalogs differ before the distractor campaign.');

  const bank = JSON.parse(sourceBankText);
  const catalog = JSON.parse(sourceCatalogText);
  const diagnosticsBefore = JSON.parse(fs.readFileSync(distractorDiagnosticsPath, 'utf8'));
  const beforeMetrics = diagnosticMetrics(diagnosticsBefore);
  const bankById = new Map(bank.map((item) => [item.id, item]));
  const coreRevisions = [];
  const skippedAfterIds = [];
  const catalogUpdates = {};
  const sourceCorrections = [];

  for (const id of CAMPAIGN_ITEM_IDS) {
    const record = manifestById.get(id);
    const authored = authoredById[id];
    const item = bankById.get(id);
    if (!item) throw new Error(`Missing campaign item: ${id}.`);
    if (item.answerIndex !== record.expectedAnswerIndex || authored.expectedAnswerIndex !== record.expectedAnswerIndex) {
      throw new Error(`${id} answer position drifted.`);
    }
    if (authored.contentSha256 !== record.contentSha256) throw new Error(`${id} authored preimage fingerprint drifted.`);
    if (stableStringify(authored.expectedWarningFamilies) !== stableStringify(record.expectedWarningFamilies)) {
      throw new Error(`${id} authored warning-family contract drifted.`);
    }
    const { set, hydrated } = sourceAndReplacementSet(item, authored, catalog, record);
    Object.assign(catalogUpdates, hydrated.catalogUpdates);
    sourceCorrections.push(...hydrated.corrections.map((correction) => ({ id, ...correction })));

    if (isReviewedAfterState(item, set)) {
      skippedAfterIds.push(id);
      continue;
    }
    if (!campaignMarker(item) && contentFingerprint(item) !== record.contentSha256) {
      throw new Error(`${id} matches neither its frozen preimage nor its reviewed campaign state.`);
    }
    coreRevisions.push(buildRevision(item, {
      id,
      mode: CAMPAIGN_MODES.DEEP_REWRITE,
      expectedAnswerIndex: record.expectedAnswerIndex,
      set,
    }));
  }

  const prepared = prepareCampaign({
    bank,
    revisions: coreRevisions,
    validateOptions: {
      expectedItemCount: 1500,
      expectedAnswerPositions: [375, 375, 375, 375],
    },
  });
  const nextCatalog = { ...catalog, ...catalogUpdates };
  const retainedReferences = new Set(prepared.bank.flatMap((item) => item.references || []));
  for (const correction of sourceCorrections) {
    if (!retainedReferences.has(correction.from)) delete nextCatalog[correction.from];
  }
  const orderedCatalog = Object.fromEntries(Object.entries(nextCatalog).sort(([left], [right]) => left.localeCompare(right)));
  const preview = {
    campaignId: CAMPAIGN_ID,
    reviewedAt,
    requestedItems: CAMPAIGN_ITEM_IDS.length,
    revisionsReady: coreRevisions.length,
    alreadyAppliedItems: skippedAfterIds.length,
    sourceMetadataRecords: Object.keys(catalogUpdates).length,
    sourceCorrections,
    shardSummaries,
    bank: prepared.bank,
    catalog: orderedCatalog,
  };
  if (!apply) return preview;

  const nextBankText = JSON.stringify(prepared.bank, null, 2) + '\n';
  const nextCatalogText = JSON.stringify(orderedCatalog, null, 2) + '\n';

  try {
    writePairedFiles({ sourcePath: sourceBankPath, deployPath: deployBankPath, contents: nextBankText });
    writePairedFiles({ sourcePath: sourceCatalogPath, deployPath: deployCatalogPath, contents: nextCatalogText });
    execFileSync(process.execPath, [path.join(__dirname, 'audit_eppp_distractor_quality.cjs')], { cwd: root, stdio: 'pipe' });
    const diagnosticsAfter = JSON.parse(fs.readFileSync(distractorDiagnosticsPath, 'utf8'));
    const afterMetrics = diagnosticMetrics(diagnosticsAfter);
    const monotonicity = assertMetricMonotonicity(beforeMetrics, afterMetrics, metricKeys);
    const ceilingStatus = Object.fromEntries(metricKeys.map((key) => [key, {
      value: afterMetrics[key],
      ceiling: HALVING_CEILINGS[key],
      met: afterMetrics[key] <= HALVING_CEILINGS[key],
      bufferedTarget: BUFFERED_TARGETS[key],
    }]));
    if (enforceCeilings) assertMetricCeilings(afterMetrics, HALVING_CEILINGS);
    const warningsAfter = warningIdsForCampaign(diagnosticsAfter);
    const audit = {
      schemaVersion: 1,
      campaignId: CAMPAIGN_ID,
      reviewedAt,
      reportType: 'manifest-driven-source-backed-distractor-halving-campaign',
      baseline: { ...BASELINE_METRICS },
      halvingCeilings: { ...HALVING_CEILINGS },
      bufferedTargets: { ...BUFFERED_TARGETS },
      summary: {
        totalItems: prepared.bank.length,
        rewrittenItems: CAMPAIGN_ITEM_IDS.length,
        newlyAppliedItems: prepared.appliedIds.length,
        alreadyAppliedItems: skippedAfterIds.length,
        keyPositionsPreserved: CAMPAIGN_ITEM_IDS.length,
        answerPositionCounts: [375, 375, 375, 375],
        sourceRecordsHydrated: Object.keys(catalogUpdates).length,
        correctedReferenceUrls: sourceCorrections.length,
        metricsBefore: beforeMetrics,
        metricsAfter: afterMetrics,
        ceilingStatus,
        status: metricKeys.every((key) => afterMetrics[key] <= HALVING_CEILINGS[key]) ? 'pass' : 'review-required',
      },
      shards: shardSummaries,
      selectedWarningsAfter: warningsAfter,
      monotonicity,
      sourceCorrections,
      limitations: [
        'Warning heuristics support editorial triage and do not substitute for psychometric calibration or independent licensed-psychologist validation.',
      ],
    };
    writeCampaignAudit(audit);
    return { ...preview, diagnosticsAfter, audit };
  } catch (error) {
    writePairedFiles({ sourcePath: sourceBankPath, deployPath: deployBankPath, contents: sourceBankText });
    writePairedFiles({ sourcePath: sourceCatalogPath, deployPath: deployCatalogPath, contents: sourceCatalogText });
    execFileSync(process.execPath, [path.join(__dirname, 'audit_eppp_distractor_quality.cjs')], { cwd: root, stdio: 'pipe' });
    throw error;
  }
}

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  const result = run({
    apply: args.has('--apply'),
    enforceCeilings: !args.has('--allow-review-required'),
  });
  console.log(
    `${CAMPAIGN_ID}: ${result.requestedItems} reviewed items; `
    + `${result.revisionsReady} ready; ${result.alreadyAppliedItems} already applied`
    + (result.audit ? `; ${result.audit.summary.status}.` : '; verification only.'),
  );
}

module.exports = { contentFingerprint, diagnosticMetrics, loadAuthoredRevisions, run };
