#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const wave02 = require('./eppp_distractor_review_wave_02_data.cjs');

const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const wave01Path = path.join(root, 'test_prep', 'eppp_distractor_review_wave_01.json');
const wave02DefinitionPath = path.join(__dirname, 'eppp_distractor_review_wave_02_data.cjs');
const outputRoots = [
  path.join(root, 'test_prep'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep'),
];
const outputBasename = 'eppp_distractor_action_docket';
const generatedAt = '2026-07-28';

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

function sha256(value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function pairKey(leftId, rightId) {
  return [leftId, rightId].sort().join('::');
}

function escapeMarkdown(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function itemFingerprint(item) {
  return sha256({
    id: item.id,
    prompt: item.prompt,
    choices: item.choices,
    answerIndex: item.answerIndex,
    keyedChoice: item.choices[item.answerIndex],
    references: item.references,
  });
}

function warningFingerprint(docketItem, extremeFinding) {
  return sha256({
    diagnostics: docketItem.diagnostics,
    docketRank: docketItem.rank,
    extremeDistractorIndexes: extremeFinding.extremeDistractorIndexes,
    termsByDistractor: extremeFinding.termsByDistractor,
  });
}

function wave02Markdown(review) {
  return `# EPPP distractor warning adjudication - wave 02

Reviewed: ${review.reviewedAt}

## Result

- Reviewed all ${review.summary.reviewedItems} unresolved entries from the bounded action docket.
- Retained ${review.summary.retainedWithoutRevision} source-aligned foundation items without learner-facing changes.
- Preserved every answer position; A-D distribution for the reviewed tranche is ${review.summary.keyDistribution.join(' / ')}.
- Independent licensed-psychologist validation and psychometric calibration completed: ${review.summary.independentExpertValidated}.

> ${review.policy.expertValidation}

| Action rank | Raw rank | Item | Domain | Resolution | Classification |
| ---: | ---: | --- | --- | --- | --- |
${review.items.map((item) => `| ${item.actionRank} | ${item.previousDocketRank} | ${item.id} | ${item.domainId} | ${item.resolution} | ${escapeMarkdown(item.classification)} |`).join('\n')}
`;
}

const bankText = fs.readFileSync(bankPath, 'utf8');
const diagnosticsText = fs.readFileSync(diagnosticsPath, 'utf8');
const wave01Text = fs.readFileSync(wave01Path, 'utf8');
const wave02DefinitionText = fs.readFileSync(wave02DefinitionPath, 'utf8');
const bank = JSON.parse(bankText);
const diagnostics = JSON.parse(diagnosticsText);
const wave01 = JSON.parse(wave01Text);

if (!Array.isArray(bank) || bank.length !== 1500) {
  throw new Error('Expected the 1,500-item EPPP native bank.');
}
if (!Array.isArray(diagnostics.priorityDocket) || diagnostics.priorityDocket.length !== 20) {
  throw new Error('Expected the bounded 20-item raw diagnostic docket.');
}
if (diagnostics.sourceSha256 !== sha256(bankText)) {
  throw new Error('The distractor diagnostic does not match the current native-bank bytes.');
}
for (const review of [wave01, wave02]) {
  if (!['human-editorial-warning-adjudication', 'assisted-editorial-warning-adjudication']
    .includes(review.reportType) || !Array.isArray(review.items)) {
    throw new Error(`Missing EPPP distractor adjudication evidence for ${review.reviewWave || 'unknown wave'}.`);
  }
}
if (wave02.summary.reviewedItems !== 18 || wave02.items.length !== 18
  || wave02.summary.learnerFacingItemsChanged !== 0
  || wave02.summary.independentExpertValidated !== 0) {
  throw new Error('Wave 02 must retain the frozen 18-item, non-expert, no-content-change contract.');
}

const allReviews = [wave01, wave02];
const reviewIds = allReviews.flatMap((review) => review.items.map((item) => item.id));
if (new Set(reviewIds).size !== reviewIds.length) {
  throw new Error('An item cannot be adjudicated by more than one active distractor review wave.');
}

const wave02Json = JSON.stringify(wave02, null, 2) + '\n';
const wave02Md = wave02Markdown(wave02);
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, 'eppp_distractor_review_wave_02.json'), wave02Json);
  writeFileWithRetry(path.join(outputRoot, 'eppp_distractor_review_wave_02.md'), wave02Md);
}

const bankById = new Map(bank.map((item) => [item.id, item]));
const rawDocketById = new Map(diagnostics.priorityDocket.map((item) => [item.id, item]));
const extremeById = new Map(
  diagnostics.asymmetricExtremeDistractors.map((finding) => [finding.id, finding]),
);
const lexicalIds = new Set(
  diagnostics.uniqueKeyStemLexicalLeakage.map((finding) => finding.id),
);
const extremeIds = new Set(
  diagnostics.asymmetricExtremeDistractors.map((finding) => finding.id),
);
const recallIds = new Set(
  diagnostics.advancedDirectRecall.map((finding) => finding.id),
);
const duplicateIds = new Set(
  diagnostics.semanticConceptDuplicates.pairs.flatMap((pair) => [pair.leftId, pair.rightId]),
);
const pairsByItem = new Map();
for (const pair of diagnostics.semanticConceptDuplicates.pairs) {
  for (const id of [pair.leftId, pair.rightId]) {
    if (!pairsByItem.has(id)) pairsByItem.set(id, []);
    pairsByItem.get(id).push(pairKey(pair.leftId, pair.rightId));
  }
}

function diagnosticsForId(id) {
  return [
    ...(lexicalIds.has(id) ? ['unique-key/stem-lexical-leakage'] : []),
    ...(extremeIds.has(id) ? ['asymmetric-extreme-distractors'] : []),
    ...(recallIds.has(id) ? ['advanced-direct-recall'] : []),
    ...(duplicateIds.has(id) ? ['semantic-concept-duplicate-candidate'] : []),
  ];
}

const applied = [];
const retired = [];
const stale = [];
for (const adjudication of allReviews) {
  for (const review of adjudication.items) {
    const item = bankById.get(review.id);
    const docketItem = rawDocketById.get(review.id);
    const currentDiagnostics = diagnosticsForId(review.id);
    const mismatchReasons = [];

    if (!item) mismatchReasons.push('item-missing');
    if (!docketItem) mismatchReasons.push('not-in-current-raw-docket');
    if (item && item.prompt !== review.prompt) mismatchReasons.push('prompt-changed');
    if (item && item.answerIndex !== review.answerIndex) mismatchReasons.push('answer-position-changed');
    if (item && item.choices[item.answerIndex] !== review.keyedChoice) {
      mismatchReasons.push('keyed-choice-changed');
    }
    if (item && review.itemFingerprintSha256
      && itemFingerprint(item) !== review.itemFingerprintSha256) {
      mismatchReasons.push('item-fingerprint-changed');
    }
    if (item && Array.isArray(review.sourceUrls)
      && review.sourceUrls.some((url) => !(item.references || []).includes(url))) {
      mismatchReasons.push('source-references-changed');
    }
    if (docketItem
      && JSON.stringify(docketItem.diagnostics) !== JSON.stringify(review.diagnosticsReviewed)) {
      mismatchReasons.push('diagnostics-changed');
    }

    const currentPairKeys = (pairsByItem.get(review.id) || []).sort();
    const reviewedPairKeys = (review.pairedItems || []).map((pair) => pair.pairKey).sort();
    if (review.pairedItems
      && JSON.stringify(currentPairKeys) !== JSON.stringify(reviewedPairKeys)) {
      mismatchReasons.push('duplicate-pair-fingerprint-changed');
    }

    if (review.extremeDistractorFingerprint) {
      const finding = extremeById.get(review.id);
      if (!finding) {
        mismatchReasons.push('extreme-warning-cleared');
      } else {
        const expectedExtreme = review.extremeDistractorFingerprint;
        if (JSON.stringify(finding.extremeDistractorIndexes)
          !== JSON.stringify(expectedExtreme.extremeDistractorIndexes)
          || JSON.stringify(finding.termsByDistractor)
          !== JSON.stringify(expectedExtreme.termsByDistractor)) {
          mismatchReasons.push('extreme-warning-fingerprint-changed');
        }
        if (docketItem && review.warningFingerprintSha256
          && warningFingerprint(docketItem, finding) !== review.warningFingerprintSha256) {
          mismatchReasons.push('warning-fingerprint-changed');
        }
      }
    }
    if (review.resolution !== 'reviewed-no-revision') {
      mismatchReasons.push('unsupported-resolution');
    }

    const result = {
      id: review.id,
      resolution: review.resolution,
      classification: review.classification,
      reviewWave: adjudication.reviewWave,
      sourceReportType: adjudication.reportType,
      originalDiagnosticRank: docketItem?.rank ?? review.previousDocketRank,
      mismatchReasons,
    };

    if (!docketItem && item && currentDiagnostics.length === 0
      && review.resolution === 'reviewed-no-revision') {
      retired.push({
        ...result,
        retirementReason: 'reviewed-warning-cleared-by-later-quality-work',
      });
    } else if (mismatchReasons.length) {
      stale.push(result);
    } else {
      applied.push(result);
    }
  }
}

applied.sort((left, right) => left.originalDiagnosticRank - right.originalDiagnosticRank);
retired.sort((left, right) => left.id.localeCompare(right.id));
stale.sort((left, right) => left.id.localeCompare(right.id));

const appliedIds = new Set(applied.map((item) => item.id));
const actionItems = diagnostics.priorityDocket
  .filter((item) => !appliedIds.has(item.id))
  .map((item, index) => ({
    ...item,
    originalDiagnosticRank: item.rank,
    actionRank: index + 1,
    status: 'editorial-review-needed',
  }));

const sourceAdjudications = [
  {
    reviewWave: wave01.reviewWave,
    file: 'test_prep/eppp_distractor_review_wave_01.json',
    sha256: sha256(wave01Text),
    reportType: wave01.reportType,
  },
  {
    reviewWave: wave02.reviewWave,
    file: 'test_prep/eppp_distractor_review_wave_02.json',
    sha256: sha256(wave02Json),
    definitionFile: 'dev-tools/eppp_distractor_review_wave_02_data.cjs',
    definitionSha256: sha256(wave02DefinitionText),
    reportType: wave02.reportType,
  },
];

const report = {
  schemaVersion: 2,
  reportType: 'adjudication-aware-editorial-action-docket',
  generatedAt,
  docketCycle: 'eppp-distractor-action-cycle-02',
  sourceBank: 'test_prep/eppp_native_items.json',
  sourceBankSha256: sha256(bankText),
  sourceDiagnostics: 'test_prep/eppp_distractor_quality_diagnostics.json',
  sourceDiagnosticsSha256: sha256(diagnosticsText),
  sourceAdjudications,
  policy: {
    separation: 'The raw diagnostic remains unchanged and retains every heuristic warning. This companion view closes only fingerprint-current reviewed-no-revision entries from the bounded 20-item cycle.',
    staleReview: 'A changed prompt, choices, source list, key, answer position, diagnostic family, raw rank, duplicate-pair fingerprint, or extreme-word fingerprint returns an active entry to the action docket.',
    retirement: 'A historical adjudication whose warning has been cleared by later quality work is retained as retired provenance rather than mislabeled as stale.',
    limitation: 'Docket closure is assisted editorial triage, not psychometric severity, item-response analysis, independent licensed-psychologist validation, or an official EPPP quality claim.',
  },
  summary: {
    rawPriorityDocketItems: diagnostics.priorityDocket.length,
    currentAdjudicationsApplied: applied.length,
    retiredAdjudications: retired.length,
    staleAdjudications: stale.length,
    actionItems: actionItems.length,
    learnerFacingItemsChanged: 0,
    independentExpertValidated: 0,
    expertValidationStatus: 'pending',
    status: stale.length || actionItems.length ? 'review-required' : 'pass',
  },
  appliedAdjudications: applied,
  retiredAdjudications: retired,
  staleAdjudications: stale,
  actionItems,
};

const markdown = `# EPPP distractor editorial action docket

Generated: ${generatedAt}

## Result

- Preserved all ${report.summary.rawPriorityDocketItems} entries in the raw warning-only diagnostic.
- Applied ${report.summary.currentAdjudicationsApplied} fingerprint-current editorial adjudications.
- Retired ${report.summary.retiredAdjudications} historical adjudications whose warning was cleared by later quality work.
- Remaining actionable entries: ${report.summary.actionItems}.
- Stale active adjudications: ${report.summary.staleAdjudications}.
- Independent expert validations recorded: ${report.summary.independentExpertValidated}.

> ${report.policy.limitation}

| Action rank | Raw rank | Item | Domain | Diagnostics | Editorial reason |
| ---: | ---: | --- | --- | --- | --- |
${actionItems.map((item) => `| ${item.actionRank} | ${item.originalDiagnosticRank} | ${item.id} | ${item.domainId} | ${item.diagnostics.join(', ')} | ${escapeMarkdown(item.editorialNote)} |`).join('\n')}
`.trimEnd() + '\n';

const json = JSON.stringify(report, null, 2) + '\n';
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.json'), json);
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.md'), markdown);
}

console.log('EPPP distractor action docket: '
  + `${actionItems.length} action items; ${applied.length} current adjudications; `
  + `${retired.length} retired; ${stale.length} stale; expert validation pending.`);

module.exports = report;
