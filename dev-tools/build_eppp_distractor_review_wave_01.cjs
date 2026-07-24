#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { reviewedAt, reviewWave, reviews } = require('./eppp_distractor_review_wave_01_data.cjs');

const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const outputRoots = [
  path.join(root, 'test_prep'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep'),
];
const outputBasename = 'eppp_distractor_review_wave_01';
const expectedDiagnostic = 'semantic-concept-duplicate-candidate';

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
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (!diagnostics || diagnostics.reportType !== 'warning-only-editorial-diagnostics') throw new Error('Missing EPPP distractor diagnostics.');
if (!Array.isArray(reviews) || reviews.length !== 5) throw new Error('Wave 01 must contain exactly five reviewed items.');

const bankById = new Map(bank.map((item) => [item.id, item]));
const docketById = new Map(diagnostics.priorityDocket.map((entry) => [entry.id, entry]));
const pairsByItem = new Map();
for (const pair of diagnostics.semanticConceptDuplicates.pairs) {
  for (const id of [pair.leftId, pair.rightId]) {
    if (!pairsByItem.has(id)) pairsByItem.set(id, []);
    pairsByItem.get(id).push(pair);
  }
}

const auditItems = reviews.map((review, reviewIndex) => {
  const item = bankById.get(review.id);
  const docket = docketById.get(review.id);
  if (!item) throw new Error('Missing reviewed item: ' + review.id);
  if (!docket) throw new Error(review.id + ' is no longer in the bounded priority docket; re-review the wave.');
  if (docket.rank !== reviewIndex + 1) throw new Error(review.id + ' priority rank drifted from ' + (reviewIndex + 1) + ' to ' + docket.rank + '.');
  if (item.answerIndex !== review.expectedAnswerIndex) throw new Error(review.id + ' answer index drifted.');
  if (item.prompt !== review.expectedPrompt) throw new Error(review.id + ' prompt drifted.');
  if (JSON.stringify(docket.diagnostics) !== JSON.stringify([expectedDiagnostic])) {
    throw new Error(review.id + ' has diagnostics outside the reviewed duplicate-candidate scope.');
  }
  if (!review.decision || review.decision.length < 180) throw new Error(review.id + ' needs a substantive editorial decision.');
  if (!review.sourceCheck || review.sourceCheck.length < 160) throw new Error(review.id + ' needs a substantive source check.');
  if (!Array.isArray(review.sourceUrls) || !review.sourceUrls.length
    || review.sourceUrls.some((url) => !item.references.includes(url))) {
    throw new Error(review.id + ' must bind its source check to an item reference.');
  }

  const currentPairs = (pairsByItem.get(review.id) || []).map((pair) => {
    const pairedItemId = pair.leftId === review.id ? pair.rightId : pair.leftId;
    return {
      pairKey: pairKey(review.id, pairedItemId),
      pairedItemId,
      similarity: pair.similarity,
      matchBasis: [...pair.matchBasis],
      sharedIdentifiers: [...pair.sharedIdentifiers],
    };
  }).sort((left, right) => left.pairedItemId.localeCompare(right.pairedItemId));
  const currentPairIds = currentPairs.map((pair) => pair.pairedItemId);
  const expectedPairIds = [...review.expectedPairIds].sort();
  if (JSON.stringify(currentPairIds) !== JSON.stringify(expectedPairIds)) {
    throw new Error(review.id + ' duplicate-pair fingerprint drifted.');
  }

  return {
    id: review.id,
    domainId: item.domainId,
    previousDocketRank: docket.rank,
    difficulty: item.difficulty,
    answerIndex: item.answerIndex,
    prompt: item.prompt,
    keyedChoice: item.choices[item.answerIndex],
    diagnosticsReviewed: [...docket.diagnostics],
    resolution: 'reviewed-no-revision',
    classification: review.classification,
    decision: review.decision,
    sourceCheck: review.sourceCheck,
    sourceUrls: [...review.sourceUrls],
    pairedItems: currentPairs,
    priorWordingReviewWave: item.wordingReviewWave || null,
  };
});

const report = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  reportType: 'human-editorial-warning-adjudication',
  sourceFile: 'test_prep/eppp_native_items.json',
  diagnosticsFile: 'test_prep/eppp_distractor_quality_diagnostics.json',
  scope: 'Source-check and adjudicate the five already-rewritten items occupying the top of the warning-only distractor docket, without hiding their raw heuristic signals.',
  policy: {
    reviewedWarningMeaning: 'A reviewed-no-revision result removes the item from the actionable priority docket only while its prompt, key, diagnostic family, and duplicate-pair fingerprint still match this audit.',
    rawSignalRetention: 'The distractor diagnostic continues to publish every raw warning and duplicate pair even after editorial adjudication.',
    limitation: 'Editorial/source review is not psychometric calibration, item-response analysis, or independent licensed-psychologist validation.',
  },
  summary: {
    reviewedItems: auditItems.length,
    retainedWithoutRevision: auditItems.filter((item) => item.resolution === 'reviewed-no-revision').length,
    distinctCoverageFalsePositives: auditItems.filter((item) => item.classification === 'distinct-coverage-false-positive').length,
    intentionalScaffolds: auditItems.filter((item) => item.classification === 'intentional-foundation-application-scaffold').length,
    differentInstrumentPairs: auditItems.filter((item) => item.classification === 'different-instrument-distinct-decision').length,
    answerPositionsChanged: 0,
    learnerFacingItemsChanged: 0,
    status: 'pass',
  },
  items: auditItems,
};

const markdown = `# EPPP distractor-warning adjudication - wave 01

Reviewed: ${reviewedAt}

## Result

- Reviewed the five previously rewritten items at the top of the warning-only distractor docket.
- Retained all five without learner-facing revision after item-level source, key, distractor, and paired-concept review.
- Classified three foundation/application scaffolds, one different-instrument pair, and one distinct-coverage false positive.
- Preserved every raw heuristic signal; these adjudications affect only actionable-docket priority while their fingerprints remain current.

> ${report.policy.limitation}

| Prior rank | Item | Classification | Paired item(s) | Decision |
| ---: | --- | --- | --- | --- |
${auditItems.map((item) => `| ${item.previousDocketRank} | ${item.id} | ${item.classification} | ${item.pairedItems.map((pair) => pair.pairedItemId).join(', ')} | ${escapeMarkdown(item.decision)} |`).join('\n')}
`;

const json = JSON.stringify(report, null, 2) + '\n';
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.json'), json);
  writeFileWithRetry(path.join(outputRoot, outputBasename + '.md'), markdown);
}

console.log('EPPP distractor review wave 01: 5 reviewed, 5 retained, 0 learner-facing changes.');
