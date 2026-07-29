#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { repairText } = require('./fix_mojibake.cjs');
const reviewWave02 = require('./eppp_distractor_review_wave_02_data.cjs');

const normalizationWave = 'eppp-native-unicode-normalization-wave-01';
const reviewedAt = '2026-07-28';
const learnerFieldNames = ['prompt', 'choices', 'rationale', 'choiceRationales'];

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
  return crypto.createHash('sha256').update(value).digest('hex');
}

function repairLearnerFields(item) {
  const next = { ...item };
  const changes = [];
  const repairField = (field, value) => {
    const repaired = repairText(String(value));
    if (repaired.changes.length) {
      changes.push({
        field,
        repairSites: repaired.changes.length,
      });
    }
    return repaired.out;
  };

  next.prompt = repairField('prompt', item.prompt);
  next.choices = item.choices.map((choice, index) => repairField(`choices[${index}]`, choice));
  next.rationale = repairField('rationale', item.rationale);
  next.choiceRationales = item.choiceRationales.map(
    (feedback, index) => repairField(`choiceRationales[${index}]`, feedback),
  );
  return { item: next, changes };
}

function remainingLearnerMojibake(item) {
  const values = [
    ['prompt', item.prompt],
    ...item.choices.map((choice, index) => [`choices[${index}]`, choice]),
    ['rationale', item.rationale],
    ...item.choiceRationales.map(
      (feedback, index) => [`choiceRationales[${index}]`, feedback],
    ),
  ];
  return values
    .filter(([, value]) => repairText(String(value)).changes.length)
    .map(([field]) => field);
}

function normalizeBank(bank) {
  if (!Array.isArray(bank) || bank.length !== 1500) {
    throw new Error('Expected the 1,500-item EPPP native bank.');
  }

  const idsBefore = bank.map((item) => item.id);
  const answersBefore = bank.map((item) => item.answerIndex);
  const changedItems = [];
  const normalized = bank.map((item) => {
    if (!Array.isArray(item.choices) || item.choices.length !== 4
      || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) {
      throw new Error(`${item.id || '(missing id)'} has an invalid learner-facing structure.`);
    }
    const repaired = repairLearnerFields(item);
    if (repaired.changes.length) {
      changedItems.push({
        id: item.id,
        fields: repaired.changes.map((change) => change.field),
        repairSites: repaired.changes.reduce((sum, change) => sum + change.repairSites, 0),
      });
    }
    return repaired.item;
  });

  if (JSON.stringify(normalized.map((item) => item.id)) !== JSON.stringify(idsBefore)) {
    throw new Error('Unicode normalization changed item identity or ordering.');
  }
  if (JSON.stringify(normalized.map((item) => item.answerIndex)) !== JSON.stringify(answersBefore)) {
    throw new Error('Unicode normalization changed an answer position.');
  }
  const remaining = normalized.flatMap((item) => (
    remainingLearnerMojibake(item).map((field) => `${item.id}:${field}`)
  ));
  if (remaining.length) {
    throw new Error(`Repairable learner-facing mojibake remains: ${remaining.join(', ')}`);
  }

  return {
    bank: normalized,
    changedItems,
    repairedFields: changedItems.reduce((sum, item) => sum + item.fields.length, 0),
    repairedSites: changedItems.reduce((sum, item) => sum + item.repairSites, 0),
  };
}

function run({ rootPath = path.resolve(__dirname, '..'), write = true } = {}) {
  const sourcePath = path.join(rootPath, 'test_prep', 'eppp_native_items.json');
  const deployPath = path.join(
    rootPath,
    'desktop',
    'web-app',
    'public',
    'test_prep',
    'eppp_native_items.json',
  );
  const outputRoots = [
    path.join(rootPath, 'test_prep'),
    path.join(rootPath, 'desktop', 'web-app', 'public', 'test_prep'),
  ];
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const deployText = fs.readFileSync(deployPath, 'utf8');
  if (deployText !== sourceText) {
    throw new Error('Source and deploy EPPP banks must match before Unicode normalization.');
  }

  const before = JSON.parse(sourceText);
  const result = normalizeBank(before);
  const normalizedText = JSON.stringify(result.bank, null, 2) + '\n';
  const reviewedIds = new Set(reviewWave02.items.map((item) => item.id));
  const reviewedItems = result.bank.filter((item) => reviewedIds.has(item.id));
  if (reviewedItems.length !== reviewWave02.summary.reviewedItems) {
    throw new Error('Unicode normalization did not find all 18 reviewed docket items.');
  }
  const reviewedRemaining = reviewedItems.flatMap((item) => (
    remainingLearnerMojibake(item).map((field) => `${item.id}:${field}`)
  ));
  if (reviewedRemaining.length) {
    throw new Error(`Reviewed docket mojibake remains: ${reviewedRemaining.join(', ')}`);
  }

  const report = {
    schemaVersion: 1,
    normalizationWave,
    reviewedAt,
    reportType: 'deterministic-learner-facing-unicode-normalization',
    sourceFile: 'test_prep/eppp_native_items.json',
    sourceSha256Before: sha256(sourceText),
    sourceSha256After: sha256(normalizedText),
    scope: {
      totalItems: result.bank.length,
      learnerFields: learnerFieldNames,
      reviewedDocketItemsVerified: reviewedItems.length,
    },
    summary: {
      changedItems: result.changedItems.length,
      repairedFields: result.repairedFields,
      repairedSites: result.repairedSites,
      answerPositionsChanged: 0,
      itemIdsChanged: 0,
      remainingRepairableLearnerFields: 0,
      status: 'pass',
    },
    changedItems: result.changedItems,
    limitations: [
      'This deterministic encoding repair does not constitute content validation, psychometric calibration, item-response analysis, or independent licensed-psychologist review.',
    ],
  };

  if (write) {
    writeFileWithRetry(sourcePath, normalizedText);
    writeFileWithRetry(deployPath, normalizedText);
    const json = JSON.stringify(report, null, 2) + '\n';
    const markdown = `# EPPP learner-facing Unicode normalization

Reviewed: ${reviewedAt}

- Scanned ${report.scope.totalItems} native items across prompt, choices, rationale, and option feedback.
- Repaired ${report.summary.repairedSites} encoding sites in ${report.summary.changedItems} items.
- Verified all ${report.scope.reviewedDocketItemsVerified} reviewed docket items are free of repairable learner-facing mojibake.
- Preserved every item ID and answer position.

> ${report.limitations[0]}
`;
    for (const outputRoot of outputRoots) {
      writeFileWithRetry(
        path.join(outputRoot, 'eppp_native_unicode_normalization_wave_01.json'),
        json,
      );
      writeFileWithRetry(
        path.join(outputRoot, 'eppp_native_unicode_normalization_wave_01.md'),
        markdown,
      );
    }
  }

  console.log(`EPPP Unicode normalization: ${result.changedItems.length} items; `
    + `${result.repairedSites} repair sites; 18 docket items clean; pass.`);
  return report;
}

if (require.main === module) run();

module.exports = {
  learnerFieldNames,
  normalizeBank,
  normalizationWave,
  remainingLearnerMojibake,
  repairLearnerFields,
  run,
};
