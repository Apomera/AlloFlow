#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const adjudicationPath = path.join(root, 'test_prep', 'eppp_distractor_review_wave_01.json');
const outputRoots = [
  path.join(root, 'test_prep'),
  path.join(root, 'prismflow-deploy', 'public', 'test_prep'),
];
const outputBasename = 'eppp_distractor_action_docket';
const generatedAt = '2026-07-22';

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

function pairKey(leftId, rightId) {
  return [leftId, rightId].sort().join('::');
}

function escapeMarkdown(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
const adjudication = JSON.parse(fs.readFileSync(adjudicationPath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (!Array.isArray(diagnostics.priorityDocket) || diagnostics.priorityDocket.length !== 20) throw new Error('Expected the bounded 20-item raw diagnostic docket.');
if (adjudication.reportType !== 'human-editorial-warning-adjudication' || !Array.isArray(adjudication.items)) {
  throw new Error('Missing EPPP distractor adjudication evidence.');
}

const bankById = new Map(bank.map((item) => [item.id, item]));
const rawDocketById = new Map(diagnostics.priorityDocket.map((item) => [item.id, item]));
const pairsByItem = new Map();
for (const pair of diagnostics.semanticConceptDuplicates.pairs) {
  for (const id of [pair.leftId, pair.rightId]) {
    if (!pairsByItem.has(id)) pairsByItem.set(id, []);
    pairsByItem.get(id).push(pairKey(pair.leftId, pair.rightId));
  }
}

const applied = [];
const stale = [];
for (const review of adjudication.items) {
  const item = bankById.get(review.id);
  const docketItem = rawDocketById.get(review.id);
  const mismatchReasons = [];
  if (!item) mismatchReasons.push('item-missing');
  if (!docketItem) mismatchReasons.push('not-in-current-raw-docket');
  if (item && item.prompt !== review.prompt) mismatchReasons.push('prompt-changed');
  if (item && item.answerIndex !== review.answerIndex) mismatchReasons.push('answer-position-changed');
  if (item && item.choices[item.answerIndex] !== review.keyedChoice) mismatchReasons.push('keyed-choice-changed');
  if (docketItem && JSON.stringify(docketItem.diagnostics) !== JSON.stringify(review.diagnosticsReviewed)) mismatchReasons.push('diagnostics-changed');
  const currentPairKeys = (pairsByItem.get(review.id) || []).sort();
  const reviewedPairKeys = (review.pairedItems || []).map((pair) => pair.pairKey).sort();
  if (JSON.stringify(currentPairKeys) !== JSON.stringify(reviewedPairKeys)) mismatchReasons.push('duplicate-pair-fingerprint-changed');
  if (review.resolution !== 'reviewed-no-revision') mismatchReasons.push('unsupported-resolution');

  const result = {
    id: review.id,
    resolution: review.resolution,
    classification: review.classification,
    reviewWave: adjudication.reviewWave,
    mismatchReasons,
  };
  if (mismatchReasons.length) stale.push(result);
  else applied.push(result);
}

const appliedIds = new Set(applied.map((item) => item.id));
const actionItems = diagnostics.priorityDocket
  .filter((item) => !appliedIds.has(item.id))
  .map((item, index) => ({
    ...item,
    originalDiagnosticRank: item.rank,
    actionRank: index + 1,
    status: 'editorial-review-needed',
  }));

const report = {
  schemaVersion: 1,
  reportType: 'adjudication-aware-editorial-action-docket',
  generatedAt,
  sourceDiagnostics: 'test_prep/eppp_distractor_quality_diagnostics.json',
  sourceAdjudication: 'test_prep/eppp_distractor_review_wave_01.json',
  policy: {
    separation: 'The raw diagnostic report remains unchanged and retains every heuristic warning. This companion view filters only fingerprint-current reviewed-no-revision decisions from the actionable queue.',
    staleReview: 'A changed prompt, key, answer position, diagnostic family, or duplicate-pair fingerprint automatically returns the item to the action docket.',
    limitation: 'Docket priority is editorial triage, not psychometric severity, item-response analysis, or independent expert validation.',
  },
  summary: {
    rawPriorityDocketItems: diagnostics.priorityDocket.length,
    currentAdjudicationsApplied: applied.length,
    staleAdjudications: stale.length,
    actionItems: actionItems.length,
    learnerFacingItemsChanged: 0,
    status: stale.length ? 'review-required' : 'pass',
  },
  appliedAdjudications: applied,
  staleAdjudications: stale,
  actionItems,
};

const markdown = `# EPPP distractor editorial action docket

Generated: ${generatedAt}

## Result

- Preserved all ${report.summary.rawPriorityDocketItems} entries in the raw warning-only diagnostic.
- Applied ${report.summary.currentAdjudicationsApplied} fingerprint-current editorial adjudications.
- Advanced ${report.summary.actionItems} unreviewed items into the bounded action queue.
- Found ${report.summary.staleAdjudications} stale adjudications.

> ${report.policy.limitation}

| Action rank | Raw rank | Item | Domain | Diagnostics | Editorial reason |
| ---: | ---: | --- | --- | --- | --- |
${actionItems.map((item) => `| ${item.actionRank} | ${item.originalDiagnosticRank} | ${item.id} | ${item.domainId} | ${item.diagnostics.join(', ')} | ${escapeMarkdown(item.editorialNote)} |`).join('\n')}
`;

const json = JSON.stringify(report, null, 2) + '\n';
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.json'), json);
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.md'), markdown);
}

console.log('EPPP distractor action docket: ' + actionItems.length + ' unreviewed items; ' + applied.length + ' current adjudications; ' + stale.length + ' stale.');
