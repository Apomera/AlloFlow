#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { revisions, wave10WarningSnapshot, wave11WarningSnapshot } = require('./eppp_option_feedback_wave_11_data.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'prismflow-deploy', 'public', 'test_prep', 'reference_catalog.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'prismflow-deploy', 'public', 'test_prep')];
const reviewedAt = '2026-07-22';
const reviewWave = 'eppp-option-feedback-wave-11';
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

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

function feedbackCodes(item, optionIndex, feedback) {
  const text = String(feedback || '').trim();
  const normalizedFeedback = normalize(text);
  const normalizedChoice = normalize(item.choices[optionIndex]);
  const normalizedKey = normalize(item.choices[item.answerIndex]);
  const codes = [];
  if (text.length < 100 || wordCount(text) < 16) codes.push('insufficient-detail');
  if (genericFeedbackPattern.test(text)) codes.push('generic-template');
  if (normalizedChoice.length >= 25 && normalizedFeedback.startsWith(normalizedChoice.slice(0, Math.min(60, normalizedChoice.length)))) codes.push('choice-restatement');
  if (normalizedKey.length >= 25 && normalizedFeedback.includes(normalizedKey)) codes.push('full-key-echo');
  return codes;
}

function diagnosticSummary(bank) {
  const findings = [];
  const itemIds = new Set();
  for (const item of bank) {
    item.choiceRationales.forEach((feedback, optionIndex) => {
      if (optionIndex === item.answerIndex) return;
      const codes = feedbackCodes(item, optionIndex, feedback);
      if (!codes.length) return;
      itemIds.add(item.id);
      findings.push({ id: item.id, optionIndex, codes });
    });
  }
  const count = (code) => findings.filter((finding) => finding.codes.includes(code)).length;
  return {
    itemsWithWarnings: itemIds.size,
    incorrectOptionsWithWarnings: findings.length,
    insufficientDetailOptions: count('insufficient-detail'),
    genericTemplateOptions: count('generic-template'),
    choiceRestatementOptions: count('choice-restatement'),
    fullKeyEchoOptions: count('full-key-echo'),
  };
}

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (Object.keys(revisions).length !== 16) throw new Error('Wave 11 must contain exactly 16 reviewed items.');

const snapshotKeys = ['itemsWithWarnings', 'incorrectOptionsWithWarnings', 'insufficientDetailOptions', 'genericTemplateOptions', 'choiceRestatementOptions', 'fullKeyEchoOptions'];
for (const [label, snapshot] of [['wave 10', wave10WarningSnapshot], ['wave 11', wave11WarningSnapshot]]) {
  if (!snapshot || snapshotKeys.some((key) => !Number.isInteger(snapshot[key]) || snapshot[key] < 0)) {
    throw new Error(label + ' needs a complete warning snapshot.');
  }
}

const auditItems = [];
for (const [id, revision] of Object.entries(revisions)) {
  const matches = bank.filter((item) => item.id === id);
  if (matches.length !== 1) throw new Error('Expected exactly one ' + id + ' item, found ' + matches.length + '.');
  const item = matches[0];
  if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(id + ' answer index drifted.');

  const incorrectIndexes = item.choices.map((_choice, optionIndex) => optionIndex).filter((optionIndex) => optionIndex !== item.answerIndex);
  const suppliedIndexes = Object.keys(revision.incorrectFeedback).map(Number).sort((left, right) => left - right);
  if (JSON.stringify(suppliedIndexes) !== JSON.stringify(incorrectIndexes)) throw new Error(id + ' must supply feedback for exactly the three incorrect options.');
  if (!Array.isArray(revision.feedbackDesign) || revision.feedbackDesign.length !== 3 || new Set(revision.feedbackDesign).size !== 3) throw new Error(id + ' needs three distinct misconception labels.');
  if (!revision.sourceCheck || revision.sourceCheck.length < 100) throw new Error(id + ' needs a substantive source-check note.');

  if (revision.references) item.references = [...revision.references];
  if (revision.sourceDetails) item.sourceDetails = revision.sourceDetails.map((source) => ({ ...source }));
  const choiceRationales = [...item.choiceRationales];
  for (const [optionIndexText, feedback] of Object.entries(revision.incorrectFeedback)) choiceRationales[Number(optionIndexText)] = feedback;
  choiceRationales[item.answerIndex] = item.rationale;
  item.choiceRationales = choiceRationales;
  item.optionFeedbackRefinementWave = reviewWave;
  item.optionFeedbackRefinedAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;

  if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(id + ' changed answer position.');
  if (item.choices.length !== 4 || item.choiceRationales.length !== 4) throw new Error(id + ' must retain four choices and explanations.');
  if (!item.references || !item.references.length) throw new Error(id + ' lost its source references.');
  if (revision.sourceDetails && (
    item.sourceDetails.length !== item.references.length
    || item.sourceDetails.some((source) => !item.references.includes(source.url)
      || String(source.title || '').length < 20
      || String(source.organization || '').length < 5
      || String(source.summary || '').length < 80
      || String(source.credibility || '').length < 100)
  )) throw new Error(id + ' needs complete source metadata for every strengthened citation.');

  const normalizedExplanations = [];
  for (const optionIndex of incorrectIndexes) {
    const feedback = item.choiceRationales[optionIndex];
    const codes = feedbackCodes(item, optionIndex, feedback);
    if (codes.length) throw new Error(id + ' option ' + optionIndex + ' failed feedback gates: ' + codes.join(', ') + '.');
    if (normalize(feedback) === normalize(item.rationale)) throw new Error(id + ' option ' + optionIndex + ' repeats the overall rationale.');
    normalizedExplanations.push(normalize(feedback));
  }
  if (new Set(normalizedExplanations).size !== 3) throw new Error(id + ' needs three nonduplicate incorrect-option explanations.');

  auditItems.push({
    id,
    domainId: item.domainId,
    answerIndex: item.answerIndex,
    expectedAnswerIndex: revision.expectedAnswerIndex,
    keyPositionPreserved: true,
    sourceCheck: revision.sourceCheck,
    feedbackDesign: revision.feedbackDesign,
    incorrectOptionExplanations: 3,
    referencesStrengthened: Boolean(revision.references),
  });
}

const domains = [...new Set(auditItems.map((item) => item.domainId))].sort();
if (domains.length !== 8) throw new Error('Wave 11 must cover all eight EPPP domains.');
for (const domainId of domains) {
  if (auditItems.filter((item) => item.domainId === domainId).length !== 2) throw new Error(domainId + ' must have exactly two reviewed items.');
}

const liveAfter = diagnosticSummary(bank);
for (const key of snapshotKeys) {
  if (liveAfter[key] > wave11WarningSnapshot[key]) throw new Error('Wave 11 replay increased ' + key + ' beyond its reviewed snapshot (' + liveAfter[key] + ' > ' + wave11WarningSnapshot[key] + ').');
}
const selectedIds = new Set(Object.keys(revisions));
const selectedWarningsAfter = bank.reduce((total, item) => {
  if (!selectedIds.has(item.id)) return total;
  return total + item.choiceRationales.reduce((sum, feedback, optionIndex) => sum + (optionIndex !== item.answerIndex && feedbackCodes(item, optionIndex, feedback).length ? 1 : 0), 0);
}, 0);
if (selectedWarningsAfter !== 0) throw new Error('Wave 11 did not clear every selected incorrect-option warning.');

const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'Two questions per EPPP domain selected from the highest-severity option-feedback warnings, with item-level source and key review before all three incorrect explanations were replaced.',
  feedbackCriteria: [
    'at least 100 characters and 16 words',
    'identifies the specific neighboring construct or misconception',
    'explains when the neighboring construct would apply',
    'contrasts that construct with the evidence in the stem',
    'does not restate the option, paste the rationale, append the full key, or use a stock rejection template',
  ],
  summary: {
    totalItems: bank.length,
    reviewedItems: auditItems.length,
    domainsCovered: domains.length,
    detailedIncorrectOptionExplanations: auditItems.length * 3,
    keyPositionsPreserved: auditItems.filter((item) => item.keyPositionPreserved).length,
    selectedOptionsWithWarningsAfter: selectedWarningsAfter,
    itemsWithStrengthenedReferences: auditItems.filter((item) => item.referencesStrengthened).length,
    bankWarningsBefore: { ...wave10WarningSnapshot },
    bankWarningsAfter: { ...wave11WarningSnapshot },
    status: 'pass',
  },
  items: auditItems,
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};

const markdown = `# EPPP incorrect-option explanation repair - wave 11

Reviewed: ${reviewedAt}

## Result

- Reviewed 16 questions: two in each of the eight EPPP domains.
- Replaced 48 generic, underspecified, distractor-restating, or full-key-echo explanations with option-specific teaching feedback.
- Preserved all 16 answer positions and cleared every selected explanation warning.
- Strengthened six indirect source records with primary, official, or directly relevant peer-reviewed sources.
- Reduced bank-wide feedback warnings from ${wave10WarningSnapshot.incorrectOptionsWithWarnings} to ${wave11WarningSnapshot.incorrectOptionsWithWarnings} incorrect options across ${wave11WarningSnapshot.itemsWithWarnings} questions.

> Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.
`;

const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFileWithRetry(sourcePath, bankJson);
writeFileWithRetry(deployPath, bankJson);

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
for (const revision of Object.values(revisions)) {
  for (const source of revision.sourceDetails || []) {
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

for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, 'eppp_option_feedback_audit_wave_11.json'), JSON.stringify(audit, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, 'eppp_option_feedback_audit_wave_11.md'), markdown);
}

console.log('EPPP option feedback wave 11: reviewed 16 items, replaced 48 explanations, and strengthened ' + audit.summary.itemsWithStrengthenedReferences + ' source records; selected warning count 0.');
