#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { replacements } = require('./eppp_native_quality_wave_06_data.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const reviewedAt = '2026-07-18';
const reviewWave = 'eppp-native-quality-wave-06';
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

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

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
const originalKeyPositions = {};
for (const [id, replacement] of Object.entries(replacements)) {
  const matches = bank.filter((item) => item.id === id);
  if (matches.length !== 1) throw new Error('Expected exactly one ' + id + ' item, found ' + matches.length + '.');
  const item = matches[0];
  originalKeyPositions[id] = item.answerIndex;
  if (item.answerIndex !== replacement.answerIndex) throw new Error(id + ' key position changed; review before applying this repair.');
  Object.assign(item, replacement, {
    qaReviewedAt: reviewedAt,
    wordingReviewStatus: 'editorial-deep-rewrite-pass',
    wordingReviewWave: reviewWave,
  });
  item.choiceRationales[item.answerIndex] = item.rationale;
  if (item.difficulty !== 'advanced') throw new Error(id + ' did not receive the intended advanced rewrite.');
  if (new Set(item.choices.map((choice) => choice.toLowerCase())).size !== 4) throw new Error(id + ' choices must be distinct.');
  if (item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) throw new Error(id + ' uses an aggregate response option.');
  if (item.choices.some((choice) => extremeCuePattern.test(choice))) throw new Error(id + ' retains an asymmetric extreme cue word.');
  if (item.choiceRationales.length !== 4 || item.choiceRationales.some((feedback) => feedback.length < 100)) throw new Error(id + ' needs four extended option-specific explanations.');
  item.choiceRationales.forEach((feedback, optionIndex) => {
    if (optionIndex === item.answerIndex) return;
    const normalizedFeedback = normalize(feedback);
    const normalizedChoice = normalize(item.choices[optionIndex]);
    const normalizedKey = normalize(item.choices[item.answerIndex]);
    if (genericFeedbackPattern.test(feedback)) throw new Error(id + ' retains generic feedback at option ' + optionIndex + '.');
    if (normalizedChoice.length >= 25 && normalizedFeedback.startsWith(normalizedChoice.slice(0, Math.min(60, normalizedChoice.length)))) throw new Error(id + ' restates option ' + optionIndex + ' instead of explaining it.');
    if (normalizedKey.length >= 25 && normalizedFeedback.includes(normalizedKey)) throw new Error(id + ' repeats the full key in feedback for option ' + optionIndex + '.');
  });
  if (!item.references.length || item.references.length !== item.sourceDetails.length || item.sourceDetails.some((source) => !item.references.includes(source.url) || source.title.length < 20 || source.credibility.length < 100)) throw new Error(id + ' needs complete source provenance.');
  if (!['application', 'analysis'].includes(item.cognitiveProcess) || /^complete the statement\b/i.test(item.prompt)) throw new Error(id + ' did not receive the intended applied rewrite.');
  if (!Array.isArray(item.distractorDesign) || item.distractorDesign.length !== 3) throw new Error(id + ' needs three named adjacent-misconception designs.');
}

const auditItems = Object.keys(replacements).map((id) => {
  const item = bank.find((entry) => entry.id === id);
  return {
    id,
    domainId: item.domainId,
    difficulty: item.difficulty,
    answerIndex: item.answerIndex,
    keyPositionPreserved: item.answerIndex === originalKeyPositions[id],
    learningObjectiveId: item.learningObjectiveId,
    cognitiveProcess: item.cognitiveProcess,
    distractorDesign: item.distractorDesign,
    sourceCount: item.sourceDetails.length,
    incorrectOptionExplanations: 3,
  };
});
const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'Eight dual-docket rewrites addressing challenge-quality warnings and weak incorrect-option explanations with source-checked advanced scenarios.',
  correctedAccuracyIssues: [
    'SEM is a precision estimate used with a confidence multiplier, not itself a score interval.',
    'The conventional SEM confidence interval is presented with its normal-error model assumptions rather than as an unconditional probability claim.',
    'Gilligan care reasoning is not characterized as inherently female or justice reasoning as inherently male.',
    'Stereotype threat is framed as a conditional situational interaction rather than a universal group effect or single-mediator claim.',
    'Realistic conflict and social identity are treated as distinguishable but potentially co-occurring mechanisms.',
  ],
  challengeCriteria: ['advanced scenario-based application or analysis', 'three plausible adjacent-concept distractors', 'no extreme cue words', 'no aggregate response options', 'one defensible best answer', 'option-specific teaching feedback'],
  feedbackCriteria: ['at least 100 characters', 'no stock rejection template', 'no distractor restatement', 'no full-key echo', 'specific misconception and corrective distinction'],
  summary: {
    totalItems: bank.length,
    rewrittenItems: auditItems.length,
    advancedItems: auditItems.filter((item) => item.difficulty === 'advanced').length,
    appliedOrAnalysisItems: auditItems.filter((item) => ['application', 'analysis'].includes(item.cognitiveProcess)).length,
    keyPositionsPreserved: auditItems.filter((item) => item.keyPositionPreserved).length,
    aggregateResponseOptionsAdded: 0,
    optionSpecificExplanations: auditItems.length * 4,
    detailedIncorrectOptionExplanations: auditItems.length * 3,
    status: 'pass',
  },
  items: auditItems,
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};
const markdown = `# EPPP native quality repair - wave 06

Reviewed: ${reviewedAt}

## Result

- Rewrote eight dual-docket items as advanced application or analysis scenarios with adjacent-concept distractors.
- Corrected the SEM item so SEM is used to construct, rather than equated with, a model-qualified confidence interval.
- Removed the Gilligan item's unsupported women-versus-men dichotomy and taught care reasoning without gender essentialism.
- Reframed stereotype threat as a conditional randomized-framing interaction and realistic conflict as the best account for a scarcity-driven increment over baseline identity preference.
- Added applied distinctions for an assimilated CPT stuck point, protected test materials under Standard 9.11, and organizational demands under Standard 1.03.
- Preserved all eight answer positions and the 375-per-position bank balance.
- Added 24 detailed incorrect-option explanations that pass the nonredundancy and instructional-feedback gates.
- Added no all/none-of-the-above response options.

> Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.
`;
const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFileWithRetry(sourcePath, bankJson);
writeFileWithRetry(deployPath, bankJson);
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, 'eppp_native_quality_audit_wave_06.json'), JSON.stringify(audit, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, 'eppp_native_quality_audit_wave_06.md'), markdown);
}
console.log('EPPP quality wave 06: rewrote 8 dual-docket items with advanced scenarios and detailed incorrect-option feedback.');
