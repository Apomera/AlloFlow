#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { baselineMetrics, reviewedAt, reviewWave, revisions } = require('./eppp_native_quality_wave_44_data.cjs');

const root = path.resolve(__dirname, '..');
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
const distractorReportPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackReportPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const auditBasename = 'eppp_question_quality_audit_wave_44.json';
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop', 'web-app', 'public', 'test_prep')];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try { if (fs.readFileSync(filePath, 'utf8') === contents) return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { fs.writeFileSync(filePath, contents); return; } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

function selectedDistractorWarnings(report, ids) {
  const duplicateIds = new Set((report.semanticConceptDuplicates?.pairs || []).flatMap((pair) => [pair.leftId, pair.rightId]));
  return {
    lexical: (report.uniqueKeyStemLexicalLeakage || []).filter((entry) => ids.has(entry.id)).map((entry) => entry.id),
    extreme: (report.asymmetricExtremeDistractors || []).filter((entry) => ids.has(entry.id)).map((entry) => entry.id),
    recall: (report.advancedDirectRecall || []).filter((entry) => ids.has(entry.id)).map((entry) => entry.id),
    duplicate: [...ids].filter((id) => duplicateIds.has(id)),
  };
}

const sourceText = fs.readFileSync(sourceBankPath, 'utf8');
if (fs.readFileSync(deployBankPath, 'utf8') !== sourceText) throw new Error('Source and deploy EPPP banks must match before wave 44.');
const bank = JSON.parse(sourceText);
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (revisions.length !== 24 || new Set(revisions.map((revision) => revision.id)).size !== 24) throw new Error('Wave 44 needs twenty-four unique revisions.');
const selectedIds = new Set(revisions.map((revision) => revision.id));
const itemsById = new Map(bank.map((item) => [item.id, item]));

// Wave 41 owns this legacy intervention item. If an interrupted Wave 44
// attempt left it marked as the current wave, restore its frozen Wave 41
// wording before applying the new batch so earlier wave contracts remain
// replayable and diagnostic baselines stay comparable.
const priorWave41 = require('./eppp_native_quality_wave_41_data.cjs').revisions.find((revision) => revision.id === 'eppp-b025-intervention-1');
const priorWave41Item = itemsById.get('eppp-b025-intervention-1');
if (priorWave41 && priorWave41Item && priorWave41Item.wordingReviewWave === reviewWave) {
  const priorChoiceRationales = Array(4);
  priorChoiceRationales[priorWave41.expectedAnswerIndex] = priorWave41.rationale;
  for (const [optionIndex, feedback] of Object.entries(priorWave41.feedback || {})) priorChoiceRationales[Number(optionIndex)] = feedback;
  Object.assign(priorWave41Item, {
    prompt: priorWave41.prompt, difficulty: priorWave41.targetDifficulty, choices: [...priorWave41.choices], rationale: priorWave41.rationale,
    choiceRationales: priorChoiceRationales, cognitiveProcess: priorWave41.cognitiveProcess,
    learningObjectiveId: priorWave41.learningObjectiveId, distractorDesign: [...priorWave41.distractorDesign],
    wordingReviewStatus: 'editorial-deep-rewrite-pass', wordingReviewWave: 'eppp-native-quality-wave-41',
    optionFeedbackRefinementWave: 'eppp-native-quality-wave-41', optionFeedbackRefinedAt: priorWave41.reviewedAt || reviewedAt,
    qaReviewedAt: priorWave41.reviewedAt || reviewedAt, clueReviewStatus: 'editorial-pass-after-manual-option-review',
  });
}

for (const revision of revisions) {
  revision.choiceRationales = Array(4);
  revision.choiceRationales[revision.expectedAnswerIndex] = revision.rationale;
  for (const [optionIndex, feedback] of Object.entries(revision.feedback || {})) revision.choiceRationales[Number(optionIndex)] = feedback;
  const item = itemsById.get(revision.id);
  if (!item) throw new Error('Missing selected item: ' + revision.id);
  const recognizedReplay = item.wordingReviewWave === reviewWave;
  if (!recognizedReplay && item.prompt !== revision.expectedPrompt) throw new Error(revision.id + ' prompt drifted before wave 44.');
  if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(revision.id + ' answer position drifted.');
  if (!recognizedReplay && item.difficulty !== revision.expectedDifficulty) throw new Error(revision.id + ' difficulty drifted before wave 44.');
  if (revision.choices.length !== 4 || new Set(revision.choices.map(normalize)).size !== 4) throw new Error(revision.id + ' needs four distinct choices.');
  if (revision.choices.some((choice) => extremeCuePattern.test(choice))) throw new Error(revision.id + ' retains an extreme answer cue.');
  revision.choiceRationales.forEach((feedback, optionIndex) => {
    if (feedback.length < 100 || wordCount(feedback) < 16 || wordCount(feedback) > 60) throw new Error(revision.id + ' option ' + optionIndex + ' explanation length failed.');
    if (genericFeedbackPattern.test(feedback)) throw new Error(revision.id + ' option ' + optionIndex + ' uses stock feedback.');
    if (optionIndex !== revision.expectedAnswerIndex && normalize(feedback).startsWith(normalize(revision.choices[optionIndex]))) throw new Error(revision.id + ' option ' + optionIndex + ' restates its choice.');
  });
  if (revision.choiceRationales[revision.expectedAnswerIndex] !== revision.rationale) throw new Error(revision.id + ' keyed explanation must match its rationale.');
  Object.assign(item, {
    prompt: revision.prompt, difficulty: revision.targetDifficulty, choices: [...revision.choices], rationale: revision.rationale,
    choiceRationales: [...revision.choiceRationales], cognitiveProcess: revision.cognitiveProcess,
    learningObjectiveId: revision.learningObjectiveId, distractorDesign: [...revision.distractorDesign],
    wordingReviewStatus: 'editorial-deep-rewrite-pass', wordingReviewWave: reviewWave,
    optionFeedbackRefinementWave: reviewWave, optionFeedbackRefinedAt: reviewedAt, qaReviewedAt: reviewedAt,
    clueReviewStatus: 'editorial-pass-after-manual-option-review',
  });
}

const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFile(sourceBankPath, bankJson);
writeFile(deployBankPath, bankJson);
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'repair_eppp_feedback_halving_campaign.cjs'), '--write'], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_part_one_pack.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_distractor_quality.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_option_feedback.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_distractor_action_docket.cjs')], { cwd: root, stdio: 'pipe' });

const distractorAfter = JSON.parse(fs.readFileSync(distractorReportPath, 'utf8'));
const feedbackAfter = JSON.parse(fs.readFileSync(feedbackReportPath, 'utf8'));
const selectedDistractorAfter = selectedDistractorWarnings(distractorAfter, selectedIds);
const selectedFeedbackAfter = (feedbackAfter.optionFindings || []).filter((finding) => selectedIds.has(finding.id));
const selectedWarningIdsAfter = [...new Set(Object.values(selectedDistractorAfter).flat())];
if (selectedWarningIdsAfter.length) throw new Error('Selected distractor warnings remain: ' + selectedWarningIdsAfter.join(', ') + '.');
if (selectedFeedbackAfter.length) throw new Error('Selected option-feedback warnings remain: ' + selectedFeedbackAfter.map((finding) => finding.id + ':' + finding.optionIndex).join(', ') + '.');

const audit = {
  schemaVersion: 1, reviewWave, reviewedAt,
  scope: 'Twenty-four EPPP items, three per domain, rewritten as applied or analytic decisions with balanced distractors and misconception-specific feedback.',
  summary: {
    totalItems: bank.length, rewrittenItems: revisions.length, domainsCovered: 8,
    difficultyRetieredItems: revisions.filter((revision) => revision.expectedDifficulty !== revision.targetDifficulty).length,
    applicationItems: revisions.filter((revision) => revision.cognitiveProcess === 'application').length,
    analysisItems: revisions.filter((revision) => revision.cognitiveProcess === 'analysis').length,
    keyPositionsPreserved: revisions.length, optionSpecificExplanations: revisions.length * 4,
    selectedDistractorWarningsAfter: 0, selectedFeedbackWarningsAfter: 0,
    distractorWarningsBefore: baselineMetrics.distractor, distractorWarningsAfter: distractorAfter.summary,
    feedbackWarningsBefore: baselineMetrics.feedback, feedbackWarningsAfter: feedbackAfter.summary, status: 'pass',
  },
  items: revisions.map((revision) => ({ id: revision.id, domainId: itemsById.get(revision.id).domainId, answerIndex: revision.expectedAnswerIndex, difficultyBefore: revision.expectedDifficulty, difficultyAfter: revision.targetDifficulty, cognitiveProcess: revision.cognitiveProcess })),
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};
const auditJson = JSON.stringify(audit, null, 2) + '\n';
for (const outputRoot of outputRoots) writeFile(path.join(outputRoot, auditBasename), auditJson);
console.log('EPPP quality wave 44: rewrote 24 items across 8 domains; selected warnings after = 0.');
