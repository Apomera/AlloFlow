#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { reviewedAt, reviewWave, revisions } = require('./eppp_extreme_word_cleanup_wave_50_data.cjs');
const feedbackRepair = require('./repair_eppp_feedback_halving_campaign.cjs');

const root = path.resolve(__dirname, '..');
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
const distractorReportPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackReportPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const auditBasename = 'eppp_extreme_word_cleanup_audit_wave_50.json';
const outputRoots = [
  path.join(root, 'test_prep'),
  path.join(root, 'desktop', 'web-app', 'public', 'test_prep'),
];

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

const sourceText = fs.readFileSync(sourceBankPath, 'utf8');
const deployText = fs.readFileSync(deployBankPath, 'utf8');
if (deployText !== sourceText) {
  const sourceSnapshot = JSON.parse(sourceText);
  const deploySnapshot = JSON.parse(deployText);
  const sourceIds = sourceSnapshot.map((item) => item.id).join('|');
  const deployIds = deploySnapshot.map((item) => item.id).join('|');
  if (sourceSnapshot.length !== 1500 || deploySnapshot.length !== 1500 || sourceIds !== deployIds
      || !sourceSnapshot.some((item) => item.extremeWordCleanupWave === reviewWave)) {
    throw new Error('Source and deploy EPPP banks differ before extreme-word wave 50.');
  }
  writeFile(deployBankPath, sourceText);
}
const bank = JSON.parse(sourceText);
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
if (revisions.length !== 27 || new Set(revisions.map((revision) => revision.id)).size !== revisions.length) {
  throw new Error('Extreme-word wave 50 needs twenty-seven unique revisions.');
}

const itemsById = new Map(bank.map((item) => [item.id, item]));
for (const revision of revisions) {
  const item = itemsById.get(revision.id);
  if (!item) throw new Error('Missing wave 50 item: ' + revision.id);
  if (item.answerIndex !== revision.answerIndex) throw new Error(revision.id + ' answer position drifted.');
  if (!Array.isArray(revision.choices) || revision.choices.length !== 4) throw new Error(revision.id + ' needs four replacement choices.');
  if (revision.choices[revision.answerIndex] !== revision.key) throw new Error(revision.id + ' keyed choice does not match revision key.');
  item.choices = [...revision.choices];
  item.extremeWordCleanupWave = reviewWave;
  item.extremeWordCleanupAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;
  item.choiceRationales[item.answerIndex] = item.rationale;
  const feedbackModes = {};
  for (let optionIndex = 0; optionIndex < item.choices.length; optionIndex += 1) {
    if (optionIndex === item.answerIndex) continue;
    const built = feedbackRepair.buildOptionFeedback(item, optionIndex);
    item.choiceRationales[optionIndex] = built.text;
    feedbackModes[optionIndex] = built.mode;
  }
  item.feedbackCleanupWave = reviewWave;
  item.feedbackCleanupAt = reviewedAt;
  item.feedbackCleanupModes = feedbackModes;
}

const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFile(sourceBankPath, bankJson);
writeFile(deployBankPath, bankJson);
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_option_feedback.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_part_one_pack.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_distractor_quality.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_option_feedback.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'qa_eppp_native_pack.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_distractor_action_docket.cjs')], { cwd: root, stdio: 'pipe' });

const distractorAfter = JSON.parse(fs.readFileSync(distractorReportPath, 'utf8'));
const feedbackAfter = JSON.parse(fs.readFileSync(feedbackReportPath, 'utf8'));
if ((distractorAfter.asymmetricExtremeDistractors || []).length) {
  throw new Error('Extreme-word candidates remain: ' + distractorAfter.asymmetricExtremeDistractors.map((entry) => entry.id).join(', ') + '.');
}
if ((distractorAfter.uniqueKeyStemLexicalLeakage || []).length) throw new Error('Lexical leakage reappeared during wave 50.');
if ((distractorAfter.semanticConceptDuplicates?.pairs || []).length) throw new Error('Semantic duplicate pairs reappeared during wave 50.');
if ((feedbackAfter.optionFindings || []).length) throw new Error('Feedback warnings reappeared during wave 50.');

const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'A final distractor pass that removes absolute-word answer tells while preserving keyed answers and replay-safe feedback.',
  summary: {
    totalItems: bank.length,
    rewrittenItems: revisions.length,
    extremeCandidatesBefore: 27,
    extremeCandidatesAfter: distractorAfter.asymmetricExtremeDistractors.length,
    lexicalCandidatesAfter: distractorAfter.uniqueKeyStemLexicalLeakage.length,
    duplicatePairsAfter: distractorAfter.semanticConceptDuplicates.pairs.length,
    feedbackWarningsAfter: feedbackAfter.summary,
    status: 'pass',
  },
  items: revisions.map((revision) => ({
    id: revision.id,
    domainId: itemsById.get(revision.id).domainId,
    answerIndex: revision.answerIndex,
    extremeWordCleanupWave: reviewWave,
  })),
  limitations: ['Extreme-word heuristics are editorial triage aids and do not replace independent psychometric or licensed-psychologist review.'],
};
const auditJson = JSON.stringify(audit, null, 2) + '\n';
for (const outputRoot of outputRoots) writeFile(path.join(outputRoot, auditBasename), auditJson);
console.log('EPPP extreme-word wave 50: cleared all 27 warning candidates and preserved zero requested findings.');
