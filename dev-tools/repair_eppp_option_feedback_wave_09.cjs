#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { revisions, wave08WarningSnapshot, wave09WarningSnapshot } = require('./eppp_option_feedback_wave_09_data.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const reviewedAt = '2026-07-18';
const reviewWave = 'eppp-option-feedback-wave-09';
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
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
if (Object.keys(revisions).length !== 16) throw new Error('Wave 09 must contain exactly 16 reviewed items.');
const warningSummaryKeys = ['itemsWithWarnings', 'incorrectOptionsWithWarnings', 'insufficientDetailOptions', 'genericTemplateOptions', 'choiceRestatementOptions', 'fullKeyEchoOptions'];
if (!wave08WarningSnapshot || warningSummaryKeys.some((key) => !Number.isInteger(wave08WarningSnapshot[key]) || wave08WarningSnapshot[key] < 0)) throw new Error('Wave 09 needs a complete explicit wave-08 warning snapshot.');
if (!wave09WarningSnapshot || warningSummaryKeys.some((key) => !Number.isInteger(wave09WarningSnapshot[key]) || wave09WarningSnapshot[key] < 0)) throw new Error('Wave 09 needs a complete explicit wave-09 warning snapshot.');
const baseline = { ...wave08WarningSnapshot };
const auditItems = [];

for (const [id, revision] of Object.entries(revisions)) {
  const matches = bank.filter((item) => item.id === id);
  if (matches.length !== 1) throw new Error('Expected exactly one ' + id + ' item, found ' + matches.length + '.');
  const item = matches[0];

  if (!Number.isInteger(revision.expectedAnswerIndex) || revision.expectedAnswerIndex < 0 || revision.expectedAnswerIndex > 3) throw new Error(id + ' needs an explicit expected answer index from 0 through 3.');
  if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(id + ' answer index drifted: expected ' + revision.expectedAnswerIndex + ', found ' + item.answerIndex + '.');
  const incorrectIndexes = item.choices.map((_choice, optionIndex) => optionIndex).filter((optionIndex) => optionIndex !== item.answerIndex);
  const suppliedIndexes = Object.keys(revision.incorrectFeedback).map(Number).sort((left, right) => left - right);
  if (JSON.stringify(suppliedIndexes) !== JSON.stringify(incorrectIndexes)) throw new Error(id + ' must supply feedback for exactly the three incorrect options.');
  if (!Array.isArray(revision.feedbackDesign) || revision.feedbackDesign.length !== 3 || new Set(revision.feedbackDesign).size !== 3) throw new Error(id + ' needs three distinct misconception labels.');
  if (!revision.sourceCheck || revision.sourceCheck.length < 100) throw new Error(id + ' needs a substantive source-check note.');

  if (revision.difficulty) item.difficulty = revision.difficulty;
  if (revision.prompt) item.prompt = revision.prompt;
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
  item.optionFeedbackRefinementWave = reviewWave;
  item.optionFeedbackRefinedAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;

  if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(id + ' changed answer position.');
  if (!['foundation', 'intermediate', 'advanced'].includes(item.difficulty)) throw new Error(id + ' has an unsupported difficulty label.');
  if (item.choiceRationales.length !== 4 || item.choices.length !== 4) throw new Error(id + ' must retain four choices and four explanations.');
  if (new Set(item.choices.map(normalize)).size !== 4) throw new Error(id + ' has duplicate choices.');
  if (item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) throw new Error(id + ' uses an aggregate response option.');
  if (item.choices.some((choice) => extremeCuePattern.test(choice))) throw new Error(id + ' retains an asymmetric extreme cue word.');
  if (!item.references.length) throw new Error(id + ' lost its source references.');
  if (revision.sourceDetails && (item.sourceDetails.length !== item.references.length || item.sourceDetails.some((source) => !item.references.includes(source.url) || String(source.title || '').length < 20 || String(source.organization || '').length < 5 || String(source.summary || '').length < 80 || String(source.credibility || '').length < 100))) throw new Error(id + ' needs complete source metadata for every strengthened citation.');
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
    expectedAnswerIndex: revision.expectedAnswerIndex,
    keyPositionPreserved: item.answerIndex === revision.expectedAnswerIndex,
    sourceCheck: revision.sourceCheck,
    feedbackDesign: revision.feedbackDesign,
    qualityFlags: revision.qualityFlags || [],
    incorrectOptionExplanations: 3,
    difficultyRefined: Boolean(revision.difficulty),
    choicesRefined: revision.choices ? Object.keys(revision.choices).length : 0,
    promptRefined: Boolean(revision.prompt),
    rationaleRefined: Boolean(revision.rationale),
    referencesStrengthened: Boolean(revision.references),
  });
}

const domains = [...new Set(auditItems.map((item) => item.domainId))].sort();
if (domains.length !== 8) throw new Error('Wave 09 must cover all eight EPPP domains.');
for (const domainId of domains) {
  if (auditItems.filter((item) => item.domainId === domainId).length !== 2) throw new Error(domainId + ' must have exactly two reviewed items.');
}

const liveAfter = diagnosticSummary(bank);
for (const key of warningSummaryKeys) {
  if (liveAfter[key] > wave09WarningSnapshot[key]) throw new Error('Wave 09 replay increased ' + key + ' beyond its reviewed snapshot.');
}
const after = { ...wave09WarningSnapshot };
const selectedIds = new Set(Object.keys(revisions));
const selectedWarningsAfter = bank.reduce((total, item) => {
  if (!selectedIds.has(item.id)) return total;
  return total + item.choiceRationales.reduce((sum, feedback, optionIndex) => sum + (optionIndex !== item.answerIndex && feedbackCodes(item, optionIndex, feedback).length ? 1 : 0), 0);
}, 0);
if (selectedWarningsAfter !== 0) throw new Error('Wave 09 did not clear every selected incorrect-option warning.');

const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'Two source-checked questions per EPPP domain, replacing generic incorrect-option feedback and refining conspicuously weak distractors or source alignment where the explanation audit exposed them.',
  feedbackCriteria: [
    'at least 100 characters and 16 words',
    'names the actual neighboring concept or misconception',
    'explains when that concept would apply',
    'contrasts the option with the stem',
    'does not restate the distractor, paste the overall rationale, append the full key, or use a stock rejection template',
  ],
  sourceCorrections: [
    'Added complete learner-facing publication names, summaries, organizations, and credibility explanations for every reviewed citation.',
    'Supplemented score-interval interpretation with an NCME instructional source and alpha interpretation with a modern Psychometrika methodological review.',
    'Added foundational fluid-intelligence and current HPG-axis references, replaced the self-serving-bias source with a 266-study meta-analysis, and moved telepsychology to APA\'s stable final-guidelines page.',
    'Corrected APA Standard 2.06 so consultation or assistance precedes a proportionate determination about limiting, suspending, or terminating affected duties.',
  ],
  challengeCorrections: [
    'Reframed all 16 foundation prompts as intermediate application or interpretation questions with plausible neighboring-concept distractors.',
    'Replaced a duplicate alpha definition with a two-factor-versus-alpha interpretation and converted the Hawthorne item to an observation-reactivity vignette.',
    'Tempered PKU outcome claims, repaired the Festinger prompt grammar, and replaced scrambled endocrine alternatives with valid neighboring axes.',
    'Removed answer-word leakage and extreme-cue alternatives while preserving every expected answer position.',
  ],
  summary: {
    totalItems: bank.length,
    reviewedItems: auditItems.length,
    domainsCovered: domains.length,
    detailedIncorrectOptionExplanations: auditItems.length * 3,
    keyPositionsPreserved: auditItems.filter((item) => item.keyPositionPreserved).length,
    selectedOptionsWithWarningsAfter: selectedWarningsAfter,
    choicesRefined: auditItems.reduce((sum, item) => sum + item.choicesRefined, 0),
    challengeRefinedItems: auditItems.filter((item) => item.choicesRefined || item.promptRefined || item.rationaleRefined).length,
    promptsRefined: auditItems.filter((item) => item.promptRefined).length,
    rationalesRefined: auditItems.filter((item) => item.rationaleRefined).length,
    difficultyRefinedItems: auditItems.filter((item) => item.difficultyRefined).length,
    itemsWithStrengthenedReferences: auditItems.filter((item) => item.referencesStrengthened).length,
    bankWarningsBefore: baseline,
    bankWarningsAfter: after,
    status: 'pass',
  },
  items: auditItems,
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};

const markdown = `# EPPP incorrect-option explanation repair - wave 09

Reviewed: ${reviewedAt}

## Result

- Reviewed 16 questions: two in each of the eight EPPP domains.
- Replaced 48 generic or redundant incorrect-option explanations with misconception-specific teaching feedback.
- Preserved all 16 answer positions and cleared every selected explanation warning.
- Refined ${audit.summary.choicesRefined} response options across ${audit.summary.challengeRefinedItems} questions, emphasizing neighboring constructs rather than obvious or absolute cues.
- Added complete learner-facing source metadata for all reviewed citations and corrected or supplemented multiple source records where the prior evidence was indirect, incomplete, or outdated.
- The bank-wide warning count moved from ${baseline.incorrectOptionsWithWarnings} to ${after.incorrectOptionsWithWarnings}.

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
  writeFileWithRetry(path.join(outputRoot, 'eppp_option_feedback_audit_wave_09.json'), JSON.stringify(audit, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, 'eppp_option_feedback_audit_wave_09.md'), markdown);
}
console.log('EPPP option feedback wave 09: reviewed 16 items, replaced 48 explanations, and refined ' + audit.summary.choicesRefined + ' response options; selected warning count 0.');
