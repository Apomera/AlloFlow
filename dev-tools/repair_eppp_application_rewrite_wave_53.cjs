#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { reviewedAt, reviewWave, revisions } = require('./eppp_application_rewrite_wave_53_data.cjs');

const root = path.resolve(__dirname, '..');
const sourceBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployBankPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
const distractorReportPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackReportPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const qaReportPath = path.join(root, 'test_prep', 'eppp_native_qa.json');
const auditBasename = 'eppp_application_rewrite_audit_wave_53.json';
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

function parseBank(text, label) {
  const bank = JSON.parse(text);
  if (!Array.isArray(bank) || bank.length !== 1500) {
    throw new Error(label + ' is not the expected 1,500-item EPPP bank.');
  }
  return bank;
}

function hasWave(bank) {
  return bank.some(function (item) {
    return item && item.applicationRewriteWave === reviewWave;
  });
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function incorrectWordCounts(item) {
  return item.choiceRationales
    .filter(function (_feedback, index) { return index !== item.answerIndex; })
    .map(wordCount);
}

function run(script, args) {
  execFileSync(process.execPath, [path.join(root, 'dev-tools', script)].concat(args || []), {
    cwd: root,
    stdio: 'pipe',
  });
}

let sourceText = fs.readFileSync(sourceBankPath, 'utf8');
let deployText = fs.readFileSync(deployBankPath, 'utf8');
let bank;
if (sourceText === deployText) {
  bank = parseBank(sourceText, 'source bank');
} else {
  const sourceBank = parseBank(sourceText, 'source bank');
  const deployBank = parseBank(deployText, 'deploy bank');
  const sourceHasWave = hasWave(sourceBank);
  const deployHasWave = hasWave(deployBank);
  if (sourceHasWave === deployHasWave) {
    throw new Error('Source and deploy banks differ without a single wave 53 recovery winner.');
  }
  bank = sourceHasWave ? sourceBank : deployBank;
  const recoveredText = JSON.stringify(bank, null, 2) + '\n';
  writeFile(sourceBankPath, recoveredText);
  writeFile(deployBankPath, recoveredText);
}

if (revisions.length !== 24 || new Set(revisions.map(function (revision) { return revision.id; })).size !== 24) {
  throw new Error('Application rewrite wave 53 requires twenty-four unique revisions.');
}

const before = JSON.parse(JSON.stringify(bank));
const itemsById = new Map(bank.map(function (item) { return [item.id, item]; }));
const beforeById = new Map(before.map(function (item) { return [item.id, item]; }));
const resultRows = [];

for (const revision of revisions) {
  const item = itemsById.get(revision.id);
  const prior = beforeById.get(revision.id);
  if (!item || !prior) throw new Error('Missing wave 53 item: ' + revision.id);
  if (item.answerIndex !== revision.answerIndex) throw new Error(revision.id + ' answer position drifted.');
  if (!Array.isArray(revision.choices) || revision.choices.length !== 4) {
    throw new Error(revision.id + ' needs four replacement choices.');
  }
  if (!Array.isArray(revision.choiceRationales) || revision.choiceRationales.length !== 4) {
    throw new Error(revision.id + ' needs four concise option explanations.');
  }
  if (item.applicationRewriteWave && item.applicationRewriteWave !== reviewWave) {
    throw new Error(revision.id + ' is already owned by another application wave.');
  }
  if (!item.applicationRewriteWave && item.difficulty !== 'foundation') {
    throw new Error(revision.id + ' expected a foundation-level preimage.');
  }

  const priorDifficulty = item.applicationRewritePriorDifficulty || item.difficulty;
  const priorCognitiveProcess = item.applicationRewritePriorCognitiveProcess || item.cognitiveProcess || null;
  item.prompt = revision.prompt;
  item.choices = revision.choices.slice();
  item.rationale = revision.rationale;
  item.choiceRationales = revision.choiceRationales.slice();
  item.choiceRationales[revision.answerIndex] = revision.rationale;
  item.difficulty = 'intermediate';
  item.cognitiveProcess = 'application';
  item.applicationRewriteWave = reviewWave;
  item.applicationRewriteAt = reviewedAt;
  item.applicationRewritePriorDifficulty = priorDifficulty;
  item.applicationRewritePriorCognitiveProcess = priorCognitiveProcess;
  item.wordingReviewStatus = 'editorial-application-rewrite';
  item.wordingReviewWave = reviewWave;
  item.wordingReviewAt = reviewedAt;
  item.optionFeedbackRefinementWave = reviewWave;
  item.optionFeedbackRefinedAt = reviewedAt;
  item.feedbackCleanupWave = reviewWave;
  item.feedbackCleanupAt = reviewedAt;
  item.feedbackCleanupModes = Object.fromEntries(
    item.choiceRationales.map(function (_text, index) {
      return [index, index === item.answerIndex ? 'keyed-rationale-preserved' : 'concise-editorial-contrast'];
    }),
  );
  item.qaReviewedAt = reviewedAt;

  resultRows.push({
    id: item.id,
    domainId: item.domainId,
    answerIndex: item.answerIndex,
    priorDifficulty: priorDifficulty,
    priorCognitiveProcess: priorCognitiveProcess,
    difficulty: item.difficulty,
    cognitiveProcess: item.cognitiveProcess,
    incorrectFeedbackWordsBefore: incorrectWordCounts(prior),
    incorrectFeedbackWordsAfter: incorrectWordCounts(item),
  });
}

const bankJson = JSON.stringify(bank, null, 2) + '\n';
writeFile(sourceBankPath, bankJson);
writeFile(deployBankPath, bankJson);

run('build_eppp_part_one_pack.cjs');
run('audit_eppp_distractor_quality.cjs');
run('audit_eppp_option_feedback.cjs');
run('qa_eppp_native_pack.cjs');

const distractorAfter = JSON.parse(fs.readFileSync(distractorReportPath, 'utf8'));
const feedbackAfter = JSON.parse(fs.readFileSync(feedbackReportPath, 'utf8'));
const qaAfter = JSON.parse(fs.readFileSync(qaReportPath, 'utf8'));
if ((distractorAfter.uniqueKeyStemLexicalLeakage || []).length) {
  throw new Error('Lexical leakage reappeared during wave 53.');
}
if ((distractorAfter.asymmetricExtremeDistractors || []).length) {
  throw new Error('Extreme-word distractors reappeared during wave 53.');
}
if ((distractorAfter.advancedDirectRecall || []).length) {
  throw new Error('Advanced direct-recall candidates remain after wave 53.');
}
if ((distractorAfter.semanticConceptDuplicates && distractorAfter.semanticConceptDuplicates.pairs || []).length) {
  throw new Error('Semantic duplicate pairs reappeared during wave 53.');
}
if ((feedbackAfter.optionFindings || []).length || feedbackAfter.summary && feedbackAfter.summary.itemsWithWarnings) {
  throw new Error('Option-feedback warnings reappeared during wave 53.');
}
if (qaAfter.summary && (qaAfter.summary.status !== 'pass' || qaAfter.summary.passedItems !== 1500)) {
  throw new Error('Native EPPP QA did not pass after wave 53.');
}

run('build_eppp_distractor_action_docket.cjs');

const beforeWords = resultRows.flatMap(function (row) { return row.incorrectFeedbackWordsBefore; });
const afterWords = resultRows.flatMap(function (row) { return row.incorrectFeedbackWordsAfter; });
const average = function (values) {
  return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
};
const audit = {
  schemaVersion: 1,
  reviewWave: reviewWave,
  reviewedAt: reviewedAt,
  scope: 'Applied-stem rewrites for short foundation items, with concise option-specific explanations.',
  summary: {
    totalItems: bank.length,
    rewrittenItems: revisions.length,
    duplicatePairRepairs: 0,
    foundationToIntermediate: resultRows.filter(function (row) { return row.priorDifficulty === 'foundation'; }).length,
    applicationCognitiveProcess: resultRows.filter(function (row) { return row.cognitiveProcess === 'application'; }).length,
    incorrectFeedbackOptionsReviewed: afterWords.length,
    averageIncorrectFeedbackWordsBefore: Number(average(beforeWords).toFixed(2)),
    averageIncorrectFeedbackWordsAfter: Number(average(afterWords).toFixed(2)),
    maximumIncorrectFeedbackWordsAfter: Math.max.apply(null, afterWords),
    lexicalCandidatesAfter: distractorAfter.uniqueKeyStemLexicalLeakage.length,
    extremeCandidatesAfter: distractorAfter.asymmetricExtremeDistractors.length,
    advancedDirectRecallCandidatesAfter: distractorAfter.advancedDirectRecall.length,
    duplicatePairsAfter: distractorAfter.semanticConceptDuplicates.pairs.length,
    feedbackWarningsAfter: feedbackAfter.summary,
    nativeQa: qaAfter.summary,
    status: 'pass',
  },
  items: resultRows,
  duplicatePairRepairs: [],
  limitations: [
    'Applied-stem rewrites improve transfer demand but do not replace independent psychometric calibration.',
    'Challenge labels are editorial classifications and should be checked against future response data.',
  ],
};
const auditJson = JSON.stringify(audit, null, 2) + '\n';
for (const outputRoot of outputRoots) writeFile(path.join(outputRoot, auditBasename), auditJson);

console.log(
  'EPPP application wave 53: rewrote ' + revisions.length + ' foundation items as applied questions; '
  + 'average incorrect-feedback length ' + audit.summary.averageIncorrectFeedbackWordsBefore + ' -> '
  + audit.summary.averageIncorrectFeedbackWordsAfter + ' words; all QA warnings remain at zero.',
);
