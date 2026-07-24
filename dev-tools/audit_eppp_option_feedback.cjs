#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const reportBasename = 'eppp_option_feedback_diagnostics';
const wave05Ids = new Set([
  'eppp-v3-intervention-002',
  'eppp-v3-intervention-066',
  'eppp-v3-intervention-010',
  'eppp-v2-professional-050',
  'eppp-v2-professional-045',
  'eppp-b024-professional-1',
  'eppp-v2-cognitive-affective-031',
  'eppp-v2-assessment-059',
]);
const wave06Ids = new Set([
  'eppp-v2-assessment-026',
  'eppp-v2-cognitive-affective-039',
  'eppp-v2-lifespan-040',
  'eppp-v3-social-cultural-002',
  'eppp-v2-social-cultural-047',
  'eppp-v2-intervention-006',
  'eppp-v3-professional-030',
  'eppp-v2-professional-073',
]);
const wave07Ids = new Set([
  'eppp-b001-assessment-2',
  'eppp-b003-assessment-2',
  'eppp-b001-biological-2',
  'eppp-b003-biological-1',
  'eppp-b001-cognitive-1',
  'eppp-b001-cognitive-2',
  'eppp-b001-intervention-1',
  'eppp-b001-intervention-2',
  'eppp-b001-lifespan-2',
  'eppp-b003-lifespan-1',
  'eppp-b001-professional-1',
  'eppp-b001-professional-2',
  'eppp-b001-research-2',
  'eppp-b005-research-1',
  'eppp-b003-social-1',
  'eppp-b003-social-2',
]);
const wave08Ids = new Set([
  'eppp-b007-assessment-2',
  'eppp-b005-assessment-1',
  'eppp-b003-biological-2',
  'eppp-b004-biological-2',
  'eppp-b002-cognitive-1',
  'eppp-b002-cognitive-2',
  'eppp-b002-intervention-2',
  'eppp-b003-intervention-1',
  'eppp-b003-lifespan-2',
  'eppp-b004-lifespan-1',
  'eppp-b002-professional-1',
  'eppp-b002-professional-2',
  'eppp-b007-research-1',
  'eppp-b008-research-1',
  'eppp-b004-social-2',
  'eppp-b006-social-1',
]);
const wave09Ids = new Set([
  'eppp-b004-assessment-2',
  'eppp-b008-assessment-1',
  'eppp-b008-research-2',
  'eppp-b009-research-1',
  'eppp-b005-biological-1',
  'eppp-b006-biological-1',
  'eppp-b003-cognitive-1',
  'eppp-b003-cognitive-2',
  'eppp-b005-lifespan-1',
  'eppp-b005-lifespan-2',
  'eppp-b003-intervention-2',
  'eppp-b004-intervention-1',
  'eppp-b003-professional-1',
  'eppp-b003-professional-2',
  'eppp-b007-social-1',
  'eppp-b007-social-2',
]);
const wave10Ids = new Set([
  'eppp-b014-assessment-2',
  'eppp-v3-assessment-041',
  'eppp-v3-research-002',
  'eppp-v2-research-003',
  'eppp-b013-biological-2',
  'eppp-v2-biological-008',
  'eppp-v3-cognitive-affective-061',
  'eppp-v3-cognitive-affective-059',
  'eppp-b014-lifespan-2',
  'eppp-v3-lifespan-013',
  'eppp-v3-intervention-067',
  'eppp-v2-intervention-025',
  'eppp-b016-professional-2',
  'eppp-b015-professional-2',
  'eppp-b011-social-1',
  'eppp-b026-social-2',
]);
const wave11Ids = new Set([
  'eppp-v3-assessment-020',
  'eppp-b008-assessment-2',
  'eppp-b009-research-2',
  'eppp-b010-research-1',
  'eppp-v3-biological-028',
  'eppp-v3-biological-041',
  'eppp-v3-cognitive-affective-034',
  'eppp-b004-cognitive-2',
  'eppp-v3-lifespan-005',
  'eppp-v3-lifespan-036',
  'eppp-v3-intervention-043',
  'eppp-v3-intervention-042',
  'eppp-v3-professional-065',
  'eppp-b004-professional-1',
  'eppp-b008-social-1',
  'eppp-b009-social-1',
]);
const genericTemplatePattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function escapeMarkdown(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

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

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');

const optionFindings = [];
const itemFindings = [];
for (const item of bank) {
  const findings = [];
  item.choiceRationales.forEach((feedback, optionIndex) => {
    if (optionIndex === item.answerIndex) return;
    const text = String(feedback || '').trim();
    const normalizedFeedback = normalize(text);
    const normalizedChoice = normalize(item.choices[optionIndex]);
    const normalizedKey = normalize(item.choices[item.answerIndex]);
    const codes = [];
    if (text.length < 100 || wordCount(text) < 16) codes.push('insufficient-detail');
    if (genericTemplatePattern.test(text)) codes.push('generic-template');
    if (normalizedChoice.length >= 25 && normalizedFeedback.startsWith(normalizedChoice.slice(0, Math.min(60, normalizedChoice.length)))) codes.push('choice-restatement');
    if (normalizedKey.length >= 25 && normalizedFeedback.includes(normalizedKey)) codes.push('full-key-echo');
    if (!codes.length) return;
    const finding = { id: item.id, domainId: item.domainId, difficulty: item.difficulty, optionIndex, feedbackLength: text.length, feedbackWordCount: wordCount(text), codes };
    findings.push(finding);
    optionFindings.push(finding);
  });
  if (findings.length) {
    const codes = [...new Set(findings.flatMap((finding) => finding.codes))];
    const score = findings.reduce((sum, finding) => sum + finding.codes.length + (finding.codes.includes('generic-template') ? 2 : 0) + (finding.codes.includes('full-key-echo') ? 1 : 0), 0);
    itemFindings.push({ id: item.id, domainId: item.domainId, difficulty: item.difficulty, affectedIncorrectOptions: findings.length, codes, score });
  }
}

itemFindings.sort((left, right) => right.score - left.score || right.affectedIncorrectOptions - left.affectedIncorrectOptions || left.id.localeCompare(right.id));
const countOptions = (code) => optionFindings.filter((finding) => finding.codes.includes(code)).length;
const wave05Findings = optionFindings.filter((finding) => wave05Ids.has(finding.id));
const wave06Findings = optionFindings.filter((finding) => wave06Ids.has(finding.id));
const wave07Findings = optionFindings.filter((finding) => wave07Ids.has(finding.id));
const wave08Findings = optionFindings.filter((finding) => wave08Ids.has(finding.id));
const wave09Findings = optionFindings.filter((finding) => wave09Ids.has(finding.id));
const wave10Findings = optionFindings.filter((finding) => wave10Ids.has(finding.id));
const wave11Findings = optionFindings.filter((finding) => wave11Ids.has(finding.id));
const waveDefinitions = [
  ['eppp-native-quality-wave-05', wave05Ids, wave05Findings],
  ['eppp-native-quality-wave-06', wave06Ids, wave06Findings],
  ['eppp-option-feedback-wave-07', wave07Ids, wave07Findings],
  ['eppp-option-feedback-wave-08', wave08Ids, wave08Findings],
  ['eppp-option-feedback-wave-09', wave09Ids, wave09Findings],
  ['eppp-option-feedback-wave-10', wave10Ids, wave10Findings],
  ['eppp-option-feedback-wave-11', wave11Ids, wave11Findings],
];
const waves = Object.fromEntries(waveDefinitions.map(([reviewWave, ids, findings]) => [reviewWave, {
  reviewWave,
  ids: [...ids],
  incorrectOptions: ids.size * 3,
  optionsWithWarnings: findings.length,
  status: findings.length ? 'review-required' : 'pass',
  findings,
}]));
const wave05 = waves['eppp-native-quality-wave-05'];
const wave06 = waves['eppp-native-quality-wave-06'];
const wave07 = waves['eppp-option-feedback-wave-07'];
const wave08 = waves['eppp-option-feedback-wave-08'];
const wave09 = waves['eppp-option-feedback-wave-09'];
const wave10 = waves['eppp-option-feedback-wave-10'];
const wave11 = waves['eppp-option-feedback-wave-11'];
const report = {
  schemaVersion: 1,
  generatedAt: '2026-07-22',
  warningOnly: true,
  criteria: {
    insufficientDetail: 'Incorrect-option feedback has at least 100 characters and 16 words, enough room to identify the misconception and teach the relevant distinction.',
    genericTemplate: 'Feedback avoids known stock phrases that merely reject an option or announce the supported response.',
    choiceRestatement: 'Feedback does not begin by repeating a substantial portion of the selected option.',
    fullKeyEcho: 'Feedback explains the distinction instead of appending the complete correct option as a repeated answer cue.',
    limitation: 'These heuristics find likely editorial problems; they cannot prove conceptual accuracy, pedagogical usefulness, or independent expert validation.',
  },
  summary: {
    totalItems: bank.length,
    totalIncorrectOptions: bank.length * 3,
    itemsWithWarnings: itemFindings.length,
    incorrectOptionsWithWarnings: optionFindings.length,
    insufficientDetailOptions: countOptions('insufficient-detail'),
    genericTemplateOptions: countOptions('generic-template'),
    choiceRestatementOptions: countOptions('choice-restatement'),
    fullKeyEchoOptions: countOptions('full-key-echo'),
    currentWaveIncorrectOptions: wave05.incorrectOptions,
    currentWaveOptionsWithWarnings: wave05.optionsWithWarnings,
    previousWaveIncorrectOptions: wave06.incorrectOptions,
    previousWaveOptionsWithWarnings: wave06.optionsWithWarnings,
    latestWaveIncorrectOptions: wave07.incorrectOptions,
    latestWaveOptionsWithWarnings: wave07.optionsWithWarnings,
    activeWaveIncorrectOptions: wave08.incorrectOptions,
    activeWaveOptionsWithWarnings: wave08.optionsWithWarnings,
    wave09IncorrectOptions: wave09.incorrectOptions,
    wave09OptionsWithWarnings: wave09.optionsWithWarnings,
    wave10IncorrectOptions: wave10.incorrectOptions,
    wave10OptionsWithWarnings: wave10.optionsWithWarnings,
    wave11IncorrectOptions: wave11.incorrectOptions,
    wave11OptionsWithWarnings: wave11.optionsWithWarnings,
    priorityDocketItems: Math.min(100, itemFindings.length),
  },
  waves,
  // Legacy aliases retained for consumers that have not migrated to report.waves.
  currentWave: wave05,
  previousWave: wave06,
  latestWave: wave07,
  activeWave: wave08,
  mostRecentWave: wave11,
  latestReviewWave: wave11.reviewWave,
  priorityDocket: itemFindings.slice(0, 100),
  optionFindings,
};

const reviewedWaves = Object.values(report.waves);
const reviewedIncorrectOptions = reviewedWaves.reduce((sum, wave) => sum + wave.incorrectOptions, 0);
const failingWaves = reviewedWaves.filter((wave) => wave.status !== 'pass');
const reviewedWaveNames = reviewedWaves.map((wave) => wave.reviewWave);
const waveStatusProse = failingWaves.length === 0
  ? `The reviewed waves (${reviewedWaveNames.join(', ')}) pass this diagnostic: all ${reviewedIncorrectOptions} incorrect-option explanations identify the option-specific misconception and teach the relevant distinction without the flagged stock patterns.`
  : `Review is still required for ${failingWaves.map((wave) => wave.reviewWave).join(', ')}; ${failingWaves.reduce((sum, wave) => sum + wave.optionsWithWarnings, 0)} reviewed incorrect-option explanations retain one or more diagnostic warnings.`;

const markdown = `# EPPP incorrect-option feedback diagnostics

Generated: ${report.generatedAt}

## Summary

| Measure | Count |
| --- | ---: |
| Questions scanned | ${report.summary.totalItems} |
| Incorrect options scanned | ${report.summary.totalIncorrectOptions} |
| Questions with one or more warnings | ${report.summary.itemsWithWarnings} |
| Incorrect options with one or more warnings | ${report.summary.incorrectOptionsWithWarnings} |
| Insufficient-detail warnings | ${report.summary.insufficientDetailOptions} |
| Generic-template warnings | ${report.summary.genericTemplateOptions} |
| Choice-restatement warnings | ${report.summary.choiceRestatementOptions} |
| Full-key-echo warnings | ${report.summary.fullKeyEchoOptions} |
| Wave-05 incorrect options with warnings | ${report.summary.currentWaveOptionsWithWarnings} of ${report.summary.currentWaveIncorrectOptions} |
| Wave-06 incorrect options with warnings | ${report.summary.previousWaveOptionsWithWarnings} of ${report.summary.previousWaveIncorrectOptions} |
| Wave-07 incorrect options with warnings | ${report.summary.latestWaveOptionsWithWarnings} of ${report.summary.latestWaveIncorrectOptions} |
| Wave-08 incorrect options with warnings | ${report.summary.activeWaveOptionsWithWarnings} of ${report.summary.activeWaveIncorrectOptions} |
| Wave-09 incorrect options with warnings | ${report.summary.wave09OptionsWithWarnings} of ${report.summary.wave09IncorrectOptions} |
| Wave-10 incorrect options with warnings | ${report.summary.wave10OptionsWithWarnings} of ${report.summary.wave10IncorrectOptions} |
| Wave-11 incorrect options with warnings | ${report.summary.wave11OptionsWithWarnings} of ${report.summary.wave11IncorrectOptions} |

${waveStatusProse}

## Highest-priority repair docket

| Item | Domain | Incorrect options affected | Warning types | Score |
| --- | --- | ---: | --- | ---: |
${report.priorityDocket.slice(0, 50).map((item) => `| ${escapeMarkdown(item.id)} | ${escapeMarkdown(item.domainId)} | ${item.affectedIncorrectOptions} | ${escapeMarkdown(item.codes.join(', '))} | ${item.score} |`).join('\n')}

## Interpretation

This report is an editorial triage tool. A warning does not establish that feedback is false, and clearing a warning does not establish psychometric quality or independent expert validation. Each repair still needs item-level source and one-best-answer review.
`;

for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, reportBasename + '.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, reportBasename + '.md'), markdown);
}
console.log('EPPP option-feedback diagnostics: ' + report.summary.totalIncorrectOptions + ' incorrect options scanned; ' + report.summary.incorrectOptionsWithWarnings + ' with warnings; wave 11 ' + report.waves[report.latestReviewWave].status + '.');
