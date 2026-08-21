#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { reviewedAt, reviewWave, revisions } = require('./eppp_native_quality_wave_49_data.cjs');
const feedbackRepair = require('./repair_eppp_feedback_halving_campaign.cjs');

const root = path.resolve(__dirname, '..');
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
const distractorReportPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackReportPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const auditBasename = 'eppp_question_quality_audit_wave_49.json';
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop', 'web-app', 'public', 'test_prep')];
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const baselineDistractor = Object.freeze({
  totalItems: 1500, warningOnly: true, forbiddenAggregateChoices: 0,
  uniqueKeyStemLexicalLeakageCandidates: 13, asymmetricExtremeDistractorCandidates: 25,
  advancedDirectRecallCandidates: 0, semanticConceptDuplicatePairs: 39,
  semanticConceptDuplicateClusters: 27, editorialAnchorsWithActiveWarnings: 0,
  editorialAnchorsWithNoCurrentWarning: 10, priorityDocketItems: 20,
});
const baselineFeedback = Object.freeze({
  totalItems: 1500, totalIncorrectOptions: 4500, itemsWithWarnings: 367,
  incorrectOptionsWithWarnings: 1031, insufficientDetailOptions: 499,
  genericTemplateOptions: 482, choiceRestatementOptions: 111,
  fullKeyEchoOptions: 58, priorityDocketItems: 100,
});

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
    duplicate: [...ids].filter((id) => duplicateIds.has(id)),
  };
}

const sourceText = fs.readFileSync(sourceBankPath, 'utf8');
if (fs.readFileSync(deployBankPath, 'utf8') !== sourceText) throw new Error('Source and deploy EPPP banks differ before wave 49.');
const bank = JSON.parse(sourceText);
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (revisions.length !== 52 || new Set(revisions.map((revision) => revision.id)).size !== revisions.length) throw new Error('Wave 49 needs fifty-two unique revisions.');
const selectedIds = new Set(revisions.map((revision) => revision.id));
const itemsById = new Map(bank.map((item) => [item.id, item]));

// Reconstitute the frozen post-campaign states before this cleanup. Selected
// items are left in their current state so older wave markers and source
// metadata remain intact while wave 49 supplies a superseding wording field.
for (let waveNumber = 25; waveNumber <= 48; waveNumber += 1) {
  const priorWave = require('./eppp_native_quality_wave_' + String(waveNumber).padStart(2, '0') + '_data.cjs');
  for (const prior of priorWave.revisions) {
    if (selectedIds.has(prior.id)) continue;
    const item = itemsById.get(prior.id);
    if (!item) continue;
    const priorChoiceRationales = Array.isArray(prior.choiceRationales) ? [...prior.choiceRationales] : Array(4);
    if (!Array.isArray(prior.choiceRationales)) {
      priorChoiceRationales[prior.expectedAnswerIndex] = prior.rationale;
      for (const [optionIndex, feedback] of Object.entries(prior.feedback || {})) priorChoiceRationales[Number(optionIndex)] = feedback;
    }
    Object.assign(item, {
      prompt: prior.prompt, choices: [...prior.choices], rationale: prior.rationale,
      choiceRationales: priorChoiceRationales, cognitiveProcess: prior.cognitiveProcess,
      learningObjectiveId: prior.learningObjectiveId, distractorDesign: [...prior.distractorDesign],
      ...(prior.targetDifficulty ? { difficulty: prior.targetDifficulty } : {}),
      wordingReviewStatus: 'editorial-deep-rewrite-pass', wordingReviewWave: priorWave.reviewWave,
      optionFeedbackRefinementWave: priorWave.reviewWave, optionFeedbackRefinedAt: priorWave.reviewedAt || reviewedAt,
      qaReviewedAt: priorWave.reviewedAt || reviewedAt, clueReviewStatus: 'editorial-pass-after-manual-option-review',
    });
  }
}

for (const revision of revisions) {
  const item = itemsById.get(revision.id);
  if (!item) throw new Error('Missing wave 49 item: ' + revision.id);
  if (item.answerIndex !== revision.answerIndex) throw new Error(revision.id + ' answer position drifted.');
  item.prompt = revision.prompt;
  if (Array.isArray(revision.choices)) {
    if (revision.choices.length !== item.choices.length) throw new Error(revision.id + ' choice count drifted.');
    item.choices = [...revision.choices];
  } else {
    item.choices[item.answerIndex] = revision.key;
  }
  item.choices[item.answerIndex] = revision.key;
  item.wordingCleanupWave = reviewWave;
  item.wordingCleanupAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;
}

let feedbackRepaired = 0;
for (const item of bank) {
  if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== item.choices.length) throw new Error(item.id + ' has an incomplete feedback array.');
  item.choiceRationales[item.answerIndex] = item.rationale;
  for (let optionIndex = 0; optionIndex < item.choices.length; optionIndex += 1) {
    if (optionIndex === item.answerIndex) continue;
    const existing = item.choiceRationales[optionIndex];
    const codes = feedbackRepair.feedbackCodes(item, optionIndex, existing);
    if (!codes.length) continue;
    const built = feedbackRepair.buildOptionFeedback(item, optionIndex);
    item.choiceRationales[optionIndex] = built.text;
    item.feedbackCleanupWave = reviewWave;
    item.feedbackCleanupAt = reviewedAt;
    item.feedbackCleanupModes = { ...(item.feedbackCleanupModes || {}), [optionIndex]: built.mode };
    feedbackRepaired += 1;
  }
}

const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFile(sourceBankPath, bankJson);
writeFile(deployBankPath, bankJson);
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_option_feedback.cjs')], { cwd: root, stdio: 'pipe' });
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
if ((distractorAfter.uniqueKeyStemLexicalLeakage || []).length) throw new Error('Lexical leakage remains: ' + distractorAfter.uniqueKeyStemLexicalLeakage.map((entry) => entry.id).join(', ') + '.');
if ((distractorAfter.semanticConceptDuplicates?.pairs || []).length) throw new Error('Semantic duplicate pairs remain: ' + distractorAfter.semanticConceptDuplicates.pairs.map((pair) => pair.leftId + '/' + pair.rightId).join(', ') + '.');
if ((feedbackAfter.optionFindings || []).length) throw new Error('Feedback warnings remain: ' + feedbackAfter.optionFindings.map((finding) => finding.id + ':' + finding.optionIndex).join(', ') + '.');
if (selectedWarningIdsAfter.length || selectedFeedbackAfter.length) throw new Error('Selected cleanup warnings remain.');

const audit = {
  schemaVersion: 1, reviewWave, reviewedAt,
  scope: 'A final EPPP cleanup pass that removes all option-feedback warnings, semantic duplicate pairs, and unique-key stem lexical leakage while preserving answer positions.',
  summary: {
    totalItems: bank.length, rewrittenItems: revisions.length, feedbackOptionsRepaired: feedbackRepaired,
    duplicatePairsBefore: baselineDistractor.semanticConceptDuplicatePairs, lexicalFindingsBefore: baselineDistractor.uniqueKeyStemLexicalLeakageCandidates,
    feedbackWarningsBefore: baselineFeedback, distractorWarningsBefore: baselineDistractor,
    feedbackWarningsAfter: feedbackAfter.summary, distractorWarningsAfter: distractorAfter.summary,
    selectedDistractorWarningsAfter: 0, selectedFeedbackWarningsAfter: 0, status: 'pass',
  },
  items: revisions.map((revision) => ({ id: revision.id, domainId: itemsById.get(revision.id).domainId, answerIndex: revision.answerIndex, wordingCleanupWave: reviewWave })),
  limitations: ['Heuristic diagnostics and deterministic rationale-grounded drafts do not replace independent licensed-psychologist or psychometric review.'],
};
const auditJson = JSON.stringify(audit, null, 2) + '\n';
for (const outputRoot of outputRoots) writeFile(path.join(outputRoot, auditBasename), auditJson);
console.log('EPPP quality wave 49: cleared all feedback warnings, duplicate pairs, and lexical leakage. Repaired ' + feedbackRepaired + ' option explanations.');
