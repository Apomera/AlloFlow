#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { baselineMetrics, reviewedAt, reviewWave, revisions } = require('./eppp_native_quality_wave_25_data.cjs');

const root = path.resolve(__dirname, '..');
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
const distractorReportPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackReportPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const auditBasename = 'eppp_question_quality_audit_wave_25.json';
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop', 'web-app', 'public', 'test_prep')];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    if (fs.readFileSync(filePath, 'utf8') === contents) return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
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
if (fs.readFileSync(deployBankPath, 'utf8') !== sourceText) throw new Error('Source and deploy EPPP banks must match before wave 25.');
const bank = JSON.parse(sourceText);
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (revisions.length !== 8 || new Set(revisions.map((revision) => revision.id)).size !== 8) throw new Error('Wave 25 needs eight unique revisions.');

const selectedIds = new Set(revisions.map((revision) => revision.id));
const existingAuditPath = path.join(outputRoots[0], auditBasename);
const existingAudit = fs.existsSync(existingAuditPath) ? JSON.parse(fs.readFileSync(existingAuditPath, 'utf8')) : null;
const distractorBefore = existingAudit?.summary?.distractorWarningsBefore || baselineMetrics.distractor;
const feedbackBefore = existingAudit?.summary?.feedbackWarningsBefore || baselineMetrics.feedback;
const itemsById = new Map(bank.map((item) => [item.id, item]));
const replayOnly = revisions.every((revision) => itemsById.get(revision.id)?.wordingReviewWave === reviewWave);

for (const revision of revisions) {
  const item = itemsById.get(revision.id);
  if (!item) throw new Error('Missing selected item: ' + revision.id);
  const recognizedReplay = item.prompt === revision.prompt && item.wordingReviewWave === reviewWave;
  if (!recognizedReplay && item.prompt !== revision.expectedPrompt) throw new Error(revision.id + ' prompt drifted before wave 25.');
  if (item.answerIndex !== revision.expectedAnswerIndex) throw new Error(revision.id + ' answer position drifted.');
  if (revision.choices.length !== 4 || new Set(revision.choices.map(normalize)).size !== 4) throw new Error(revision.id + ' needs four distinct choices.');
  if (revision.choices.some((choice) => extremeCuePattern.test(choice))) throw new Error(revision.id + ' retains an extreme answer cue.');
  if (revision.choiceRationales.length !== 4) throw new Error(revision.id + ' needs four option explanations.');
  revision.choiceRationales.forEach((feedback, optionIndex) => {
    if (feedback.length < 100 || wordCount(feedback) < 16) throw new Error(revision.id + ' option ' + optionIndex + ' explanation is too thin.');
    if (wordCount(feedback) > 60) throw new Error(revision.id + ' option ' + optionIndex + ' explanation is too long.');
    if (genericFeedbackPattern.test(feedback)) throw new Error(revision.id + ' option ' + optionIndex + ' uses stock feedback.');
    if (optionIndex !== revision.expectedAnswerIndex && normalize(feedback).startsWith(normalize(revision.choices[optionIndex]))) {
      throw new Error(revision.id + ' option ' + optionIndex + ' explanation restates the choice.');
    }
  });
  if (revision.choiceRationales[revision.expectedAnswerIndex] !== revision.rationale) throw new Error(revision.id + ' keyed explanation must match its rationale.');

  item.prompt = revision.prompt;
  item.choices = [...revision.choices];
  item.rationale = revision.rationale;
  item.choiceRationales = [...revision.choiceRationales];
  item.cognitiveProcess = revision.cognitiveProcess;
  item.learningObjectiveId = revision.learningObjectiveId;
  item.distractorDesign = [...revision.distractorDesign];
  item.wordingReviewStatus = 'editorial-deep-rewrite-pass';
  item.wordingReviewWave = reviewWave;
  item.optionFeedbackRefinementWave = reviewWave;
  item.optionFeedbackRefinedAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;
  item.clueReviewStatus = 'editorial-pass-after-manual-option-review';
}

const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFile(sourceBankPath, bankJson);
writeFile(deployBankPath, bankJson);

// Rematerialize the feedback-only campaign's protected-content fingerprint
// after this wave changes prompts and choices. Warning-free authored feedback is
// preserved by that campaign, while its paired audit remains truthful.
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'repair_eppp_feedback_halving_campaign.cjs'), '--write'], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_part_one_pack.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_distractor_quality.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_option_feedback.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_distractor_action_docket.cjs')], { cwd: root, stdio: 'pipe' });

const distractorAfterReport = JSON.parse(fs.readFileSync(distractorReportPath, 'utf8'));
const feedbackAfterReport = JSON.parse(fs.readFileSync(feedbackReportPath, 'utf8'));
const selectedDistractorAfter = selectedDistractorWarnings(distractorAfterReport, selectedIds);
const selectedFeedbackAfter = (feedbackAfterReport.optionFindings || []).filter((finding) => selectedIds.has(finding.id));
const selectedWarningIdsAfter = [...new Set(Object.values(selectedDistractorAfter).flat())];
if (selectedWarningIdsAfter.length) throw new Error('Selected distractor warnings remain: ' + selectedWarningIdsAfter.join(', ') + '.');
if (selectedFeedbackAfter.length) throw new Error('Selected option-feedback warnings remain: ' + selectedFeedbackAfter.map((finding) => finding.id + ':' + finding.optionIndex).join(', ') + '.');

const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'Eight source-reviewed EPPP items, one per domain, rewritten to remove answer-style cues and redundant option feedback while preserving every keyed position.',
  summary: {
    totalItems: bank.length,
    rewrittenItems: revisions.length,
    domainsCovered: new Set(revisions.map((revision) => itemsById.get(revision.id).domainId)).size,
    keyPositionsPreserved: revisions.length,
    optionSpecificExplanations: revisions.length * 4,
    selectedDistractorWarningsAfter: 0,
    selectedFeedbackWarningsAfter: 0,
    distractorWarningsBefore: distractorBefore,
    distractorWarningsAfter: distractorAfterReport.summary,
    feedbackWarningsBefore: feedbackBefore,
    feedbackWarningsAfter: feedbackAfterReport.summary,
    status: 'pass',
  },
  items: revisions.map((revision) => ({
    id: revision.id,
    domainId: itemsById.get(revision.id).domainId,
    answerIndex: revision.expectedAnswerIndex,
    cognitiveProcess: revision.cognitiveProcess,
    learningObjectiveId: revision.learningObjectiveId,
  })),
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};
const auditJson = JSON.stringify(audit, null, 2) + '\n';
if (!replayOnly || !fs.existsSync(existingAuditPath)) {
  for (const outputRoot of outputRoots) writeFile(path.join(outputRoot, auditBasename), auditJson);
}

console.log('EPPP quality wave 25: rewrote 8 items across 8 domains; selected distractor and feedback warnings after = 0.');
