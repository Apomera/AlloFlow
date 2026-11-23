#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { reviewedAt, reviewWave, revisions } = require('./eppp_length_balance_wave_56/index.cjs');
const { warningCodes } = require('./non_eppp_warning_checks.cjs');

const root = path.resolve(__dirname, '..');
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
const distractorReportPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackReportPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const qaReportPath = path.join(root, 'test_prep', 'eppp_native_qa.json');
const auditBasename = 'eppp_length_balance_audit_wave_56.json';
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
if (deployText !== sourceText) writeFile(deployBankPath, sourceText);

const bank = JSON.parse(sourceText);
if (!Array.isArray(bank) || bank.length !== 1500) {
  throw new Error('Expected the 1,500-item EPPP native bank.');
}

function countLongest(items) {
  let count = 0;
  for (const item of items) {
    const lens = item.choices.map((c) => String(c || '').length);
    const k = lens[item.answerIndex];
    const maxD = Math.max(...lens.filter((_, idx) => idx !== item.answerIndex));
    if (k >= maxD) count += 1;
  }
  return count;
}

const itemsById = new Map(bank.map((item) => [item.id, item]));
for (const revision of revisions) {
  const item = itemsById.get(revision.id);
  if (!item) throw new Error('Missing wave 56 item: ' + revision.id);
  if (item.answerIndex !== revision.answerIndex) {
    throw new Error(revision.id + ' answer position drifted.');
  }
  if (!Array.isArray(revision.choices) || revision.choices.length !== 4 || new Set(revision.choices).size !== 4) {
    throw new Error(revision.id + ' must provide 4 distinct choices.');
  }
  const lens = revision.choices.map((c) => c.length);
  const k = lens[revision.answerIndex];
  const maxD = Math.max(...lens.filter((_, idx) => idx !== revision.answerIndex));
  if (k >= maxD) {
    throw new Error(`${revision.id} keyed choice (${k}) must be shorter than longest distractor (${maxD}).`);
  }
  if (typeof revision.prompt === 'string' && revision.prompt.trim()) {
    item.prompt = revision.prompt.trim();
  }
  item.choices = [...revision.choices];
  const codes = warningCodes(item);
  if (codes.length) {
    throw new Error(`${revision.id} has non-EPPP editorial warning(s): ${codes.join(', ')}`);
  }
  item.lengthBalanceWave = reviewWave;
  item.lengthBalanceAt = reviewedAt;
  item.qaReviewedAt = reviewedAt;
}

const longestAfter = countLongest(bank);
const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFile(sourceBankPath, bankJson);
writeFile(deployBankPath, bankJson);

execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_part_one_pack.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_distractor_quality.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'audit_eppp_option_feedback.cjs')], { cwd: root, stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'dev-tools', 'qa_eppp_native_pack.cjs')], { cwd: root, stdio: 'pipe' });

const distractorAfter = JSON.parse(fs.readFileSync(distractorReportPath, 'utf8'));
const feedbackAfter = JSON.parse(fs.readFileSync(feedbackReportPath, 'utf8'));
const qaAfter = JSON.parse(fs.readFileSync(qaReportPath, 'utf8'));

const issues = [];
if ((distractorAfter.asymmetricExtremeDistractors || []).length) {
  issues.push('Extreme-word: ' + distractorAfter.asymmetricExtremeDistractors.map((e) => e.id).join(', '));
}
if ((distractorAfter.uniqueKeyStemLexicalLeakage || []).length) {
  issues.push('Lexical: ' + distractorAfter.uniqueKeyStemLexicalLeakage.map((e) => `${e.id}(${(e.uniqueKeyStemTerms || []).join(',')})`).join(', '));
}
if ((distractorAfter.semanticConceptDuplicates?.pairs || []).length) {
  issues.push('Duplicates: ' + distractorAfter.semanticConceptDuplicates.pairs.map((p) => `${p.leftId}/${p.rightId}(${p.similarity})`).join(', '));
}
if ((feedbackAfter.optionFindings || []).length) {
  issues.push('Feedback: ' + feedbackAfter.optionFindings.map((f) => `${f.id}[${f.optionIndex}]`).join(', '));
}
if (qaAfter.summary.status !== 'pass' || qaAfter.summary.passedItems !== 1500) {
  issues.push(`Native QA failed: ${JSON.stringify(qaAfter.summary)}`);
}
if (issues.length) {
  console.error('Wave 56 QA diagnostics flagged issues:\n' + issues.join('\n'));
  process.exit(1);
}

execFileSync(process.execPath, [path.join(root, 'dev-tools', 'build_eppp_distractor_action_docket.cjs')], { cwd: root, stdio: 'pipe' });

const audit = {
  schemaVersion: 1,
  reviewWave,
  reviewedAt,
  scope: 'Third choice-length balancing and editorial warning-cleanup pass across 81 strictly unpinned EPPP Part 1 items, bringing key=longest below 29% of the bank while preserving zero EPPP diagnostic warnings.',
  summary: {
    totalItems: bank.length,
    rewrittenItems: revisions.length,
    keyIsLongestBefore: 498,
    keyIsLongestAfter: longestAfter,
    keyIsLongestRateAfter: Number((longestAfter / bank.length).toFixed(4)),
    extremeCandidatesAfter: distractorAfter.asymmetricExtremeDistractors.length,
    lexicalCandidatesAfter: distractorAfter.uniqueKeyStemLexicalLeakage.length,
    duplicatePairsAfter: distractorAfter.semanticConceptDuplicates.pairs.length,
    feedbackWarningsAfter: feedbackAfter.summary,
    nativeQaPassedItems: qaAfter.summary.passedItems,
    status: 'pass',
  },
  items: revisions.map((revision) => ({
    id: revision.id,
    domainId: itemsById.get(revision.id).domainId,
    answerIndex: revision.answerIndex,
    lengthBalanceWave: reviewWave,
  })),
  limitations: ['Choice-length balancing is an editorial clue-reduction pass and does not replace psychometric calibration or licensed-psychologist review.'],
};

const auditJson = JSON.stringify(audit, null, 2) + '\n';
for (const outputRoot of outputRoots) writeFile(path.join(outputRoot, auditBasename), auditJson);
console.log(`EPPP length-balance wave 56: balanced ${revisions.length} items; key=longest 498 -> ${longestAfter}/1500 (${(longestAfter / 15).toFixed(1)}%); all EPPP QA & diagnostic gates pass (0 warnings).`);
