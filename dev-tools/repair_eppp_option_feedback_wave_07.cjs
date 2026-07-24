#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { revisions, wave06WarningSnapshot, wave07WarningSnapshot } = require('./eppp_option_feedback_wave_07_data.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');

const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const reviewedAt = '2026-07-18';
const reviewWave = 'eppp-option-feedback-wave-07';
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
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
  const optionFindings = [];
  const itemIds = new Set();
  for (const item of bank) {
    item.choiceRationales.forEach((feedback, optionIndex) => {
      if (optionIndex === item.answerIndex) return;
      const codes = feedbackCodes(item, optionIndex, feedback);
      if (!codes.length) return;
      itemIds.add(item.id);
      optionFindings.push({ id: item.id, optionIndex, codes });
    });
  }
  const count = (code) => optionFindings.filter((finding) => finding.codes.includes(code)).length;
  return {
    itemsWithWarnings: itemIds.size,
    incorrectOptionsWithWarnings: optionFindings.length,
    insufficientDetailOptions: count('insufficient-detail'),
    genericTemplateOptions: count('generic-template'),
    choiceRestatementOptions: count('choice-restatement'),
    fullKeyEchoOptions: count('full-key-echo'),
  };
}

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (Object.keys(revisions).length !== 16) throw new Error('Wave 07 must contain exactly 16 reviewed items.');
const warningSummaryKeys = ['itemsWithWarnings', 'incorrectOptionsWithWarnings', 'insufficientDetailOptions', 'genericTemplateOptions', 'choiceRestatementOptions', 'fullKeyEchoOptions'];
if (!wave06WarningSnapshot || warningSummaryKeys.some((key) => !Number.isInteger(wave06WarningSnapshot[key]) || wave06WarningSnapshot[key] < 0)) throw new Error('Wave 07 needs a complete explicit wave-06 warning snapshot.');
if (!wave07WarningSnapshot || warningSummaryKeys.some((key) => !Number.isInteger(wave07WarningSnapshot[key]) || wave07WarningSnapshot[key] < 0)) throw new Error('Wave 07 needs a complete explicit wave-07 warning snapshot.');
const baseline = { ...wave06WarningSnapshot };
const auditItems = [];

for (const [id, revision] of Object.entries(revisions)) {
  const matches = bank.filter((item) => item.id === id);
  if (matches.length !== 1) throw new Error('Expected exactly one ' + id + ' item, found ' + matches.length + '.');
  const item = matches[0];
  const originalAnswerIndex = item.answerIndex;
  const originalPrompt = item.prompt;
  const originalReferences = [...item.references];
  const incorrectIndexes = item.choices.map((_choice, optionIndex) => optionIndex).filter((optionIndex) => optionIndex !== item.answerIndex);
  const suppliedIndexes = Object.keys(revision.incorrectFeedback).map(Number).sort((left, right) => left - right);
  if (JSON.stringify(suppliedIndexes) !== JSON.stringify(incorrectIndexes)) throw new Error(id + ' must supply feedback for exactly the three incorrect options.');
  if (!Array.isArray(revision.feedbackDesign) || revision.feedbackDesign.length !== 3 || new Set(revision.feedbackDesign).size !== 3) throw new Error(id + ' needs three distinct misconception labels.');
  if (!revision.sourceCheck || revision.sourceCheck.length < 100) throw new Error(id + ' needs a substantive source-check note.');

  if (revision.choices) {
    for (const [optionIndexText, choice] of Object.entries(revision.choices)) item.choices[Number(optionIndexText)] = choice;
  }
  if (revision.rationale) item.rationale = revision.rationale;
  if (revision.references) item.references = [...revision.references];
  if (revision.sourceDetails) item.sourceDetails = revision.sourceDetails.map((source) => ({ ...source }));
  const choiceRationales = [...item.choiceRationales];
  for (const [optionIndexText, feedback] of Object.entries(revision.incorrectFeedback)) choiceRationales[Number(optionIndexText)] = feedback;
  choiceRationales[item.answerIndex] = item.rationale;
  item.choiceRationales = choiceRationales;
  if (item.optionFeedbackReviewWave === reviewWave) {
    item.optionFeedbackReviewWave = 'eppp-option-feedback-wave-01';
    item.optionFeedbackReviewedAt = '2026-07-16';
  }
  item.optionFeedbackRefinementWave = reviewWave;
  item.optionFeedbackRefinedAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;

  if (item.answerIndex !== originalAnswerIndex) throw new Error(id + ' changed answer position.');
  if (item.prompt !== originalPrompt) throw new Error(id + ' changed its prompt during an explanation-focused repair.');
  if (item.choiceRationales.length !== 4 || item.choices.length !== 4) throw new Error(id + ' must retain four choices and four explanations.');
  if (new Set(item.choices.map(normalize)).size !== 4) throw new Error(id + ' has duplicate choices.');
  if (!item.references.length) throw new Error(id + ' lost its source references.');
  if (revision.sourceDetails && (item.sourceDetails.length !== item.references.length || item.sourceDetails.some((source) => !item.references.includes(source.url) || source.title.length < 20 || source.credibility.length < 100))) throw new Error(id + ' needs complete source metadata for every corrected citation.');
  const normalizedExplanations = [];
  for (const optionIndex of incorrectIndexes) {
    const feedback = item.choiceRationales[optionIndex];
    const codes = feedbackCodes(item, optionIndex, feedback);
    if (codes.length) throw new Error(id + ' option ' + optionIndex + ' failed feedback gates: ' + codes.join(', ') + '.');
    if (normalize(feedback) === normalize(item.rationale)) throw new Error(id + ' option ' + optionIndex + ' merely repeats the overall rationale.');
    normalizedExplanations.push(normalize(feedback));
  }
  if (new Set(normalizedExplanations).size !== 3) throw new Error(id + ' needs three nonduplicate incorrect-option explanations.');

  auditItems.push({
    id,
    domainId: item.domainId,
    answerIndex: item.answerIndex,
    keyPositionPreserved: item.answerIndex === originalAnswerIndex,
    sourceCheck: revision.sourceCheck,
    feedbackDesign: revision.feedbackDesign,
    qualityFlags: revision.qualityFlags || [],
    incorrectOptionExplanations: 3,
    distractorsRefined: revision.choices ? Object.keys(revision.choices).length : 0,
    rationaleRefined: Boolean(revision.rationale),
    referencesCorrected: revision.references ? 1 : 0,
  });
}

const domains = [...new Set(auditItems.map((item) => item.domainId))].sort();
if (domains.length !== 8) throw new Error('Wave 07 must cover all eight EPPP domains.');
for (const domainId of domains) {
  if (auditItems.filter((item) => item.domainId === domainId).length !== 2) throw new Error(domainId + ' must have exactly two reviewed items.');
}
const liveAfter = diagnosticSummary(bank);
if (liveAfter.incorrectOptionsWithWarnings > wave07WarningSnapshot.incorrectOptionsWithWarnings) throw new Error('Wave 07 replay increased the bank-wide incorrect-option warning count beyond its reviewed snapshot.');
const after = { ...wave07WarningSnapshot };
const selectedIds = new Set(Object.keys(revisions));
const selectedWarningsAfter = bank.reduce((total, item) => {
  if (!selectedIds.has(item.id)) return total;
  return total + item.choiceRationales.reduce((sum, feedback, optionIndex) => sum + (optionIndex !== item.answerIndex && feedbackCodes(item, optionIndex, feedback).length ? 1 : 0), 0);
}, 0);
if (selectedWarningsAfter !== 0) throw new Error('Wave 07 did not clear every selected incorrect-option warning.');

const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'Two source-checked questions per EPPP domain, focused on replacing generic or redundant incorrect-option feedback with specific misconception-based teaching explanations.',
  feedbackCriteria: [
    'at least 100 characters and 16 words',
    'names the actual neighboring concept or misconception',
    'explains when that concept would apply',
    'contrasts the option with the evidence in the stem',
    'does not restate the distractor, paste the overall rationale, append the full key, or use a stock rejection template',
  ],
  sourceCorrections: [
    'Replaced an unresolvable insomnia-review DOI with the correct Bootzin and Epstein DOI and an AASM clinical practice guideline.',
    'Replaced an indirect implosive-therapy citation with direct APA Dictionary definitions of flooding and systematic desensitization.',
    'Qualified the intention-to-treat rationale so retention in the target analysis population is not confused with availability of every outcome.',
    'Reworded one LTP distractor to describe dynamic AMPA-receptor internalization rather than biologically misleading permanent receptor removal.',
  ],
  summary: {
    totalItems: bank.length,
    reviewedItems: auditItems.length,
    domainsCovered: domains.length,
    detailedIncorrectOptionExplanations: auditItems.length * 3,
    keyPositionsPreserved: auditItems.filter((item) => item.keyPositionPreserved).length,
    selectedOptionsWithWarningsAfter: selectedWarningsAfter,
    distractorsRefined: auditItems.reduce((sum, item) => sum + item.distractorsRefined, 0),
    rationalesRefined: auditItems.filter((item) => item.rationaleRefined).length,
    itemsWithReferenceCorrections: auditItems.filter((item) => item.referencesCorrected > 0).length,
    bankWarningsBefore: baseline,
    bankWarningsAfter: after,
    status: 'pass',
  },
  items: auditItems,
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};

const markdown = `# EPPP incorrect-option explanation repair - wave 07

Reviewed: ${reviewedAt}

## Result

- Reviewed 16 questions: two in each of the eight EPPP domains.
- Replaced 48 generic or redundant incorrect-option explanations with misconception-specific teaching feedback.
- Every explanation identifies the neighboring concept, states when it applies, and contrasts it with the stem without repeating the distractor or appending the full key.
- Preserved all 16 answer positions.
- Corrected two source lists, clarified one intention-to-treat rationale, and replaced one misleading permanent-receptor-removal distractor.
- Cleared all 48 selected incorrect-option warnings; the bank-wide warning count moved from ${baseline.incorrectOptionsWithWarnings} to ${after.incorrectOptionsWithWarnings}.
- Recorded the HPA-axis item for a later challenge-quality rewrite because its key is accurate but its distractors remain mostly source scrambles.

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
  writeFileWithRetry(path.join(outputRoot, 'eppp_option_feedback_audit_wave_07.json'), JSON.stringify(audit, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, 'eppp_option_feedback_audit_wave_07.md'), markdown);
}
console.log('EPPP option feedback wave 07: reviewed 16 items and replaced 48 incorrect-option explanations; selected warning count 0.');
