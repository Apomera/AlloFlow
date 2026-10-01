'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const testFiles = [
  'tests/report_word_sounds_content_guard.test.js', 'tests/report_word_sounds_built_contract.test.js',
  'tests/report_word_sounds_navigation_proposal.test.js', 'tests/word_sounds_grading.test.js',
  'tests/word_sounds_phoneme_check.test.js', 'tests/word_sounds_language_gating.test.js',
  'tests/word_sounds_board_lifecycle.test.js', 'tests/word_sounds_fixed_form_runtime_deep_regression.test.js',
  'tests/word_sounds_graded_rows.test.js'
];
const inputs = [
  'word_sounds_core.js', 'word_sounds_setup_source.jsx', 'word_sounds_module.js', 'word_sounds_setup_module.js',
  'desktop/web-app/public/word_sounds_module.js', 'desktop/web-app/public/word_sounds_setup_module.js',
  'dev-tools/sync_word_sounds_core.cjs', '_build_word_sounds_setup_module.js', '_build_simple_iife_module.js',
  'tests/helpers/word_sounds_core.js', 'tests/helpers/word_sounds_pack_fixture.js', 'tests/helpers/word_sounds_harness.js',
  'tests/setup.js', 'vitest.config.js', 'AlloFlowANTI.txt',
  'reports/report-fixes-2026-09-30/word-sounds-navigation-host-proposal.patch',
  ...testFiles
];
const hashes = () => Object.fromEntries(inputs.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const snapshot = path.join(__dirname, 'word-sounds-built-inputs.json');
if (process.argv.includes('--capture') || process.argv.includes('--capture-follow-up')) {
  if (fs.existsSync(snapshot)) {
    if (!process.argv.includes('--capture-follow-up')) throw Error('Existing built input capture must be reconciled rather than overwritten');
    const archived = path.join(__dirname, 'word-sounds-before-own-property', 'word-sounds-built-inputs.json');
    if (!fs.existsSync(archived) || !fs.readFileSync(archived).equals(fs.readFileSync(snapshot))) throw Error('Earlier capture was not preserved exactly before follow-up');
  }
  fs.writeFileSync(snapshot, JSON.stringify({ at: new Date().toISOString(), inputHashes: hashes(), testFiles }, null, 2) + '\n');
  console.log('Word Sounds built inputs captured before tests.');
} else {
  const before = JSON.parse(fs.readFileSync(snapshot, 'utf8'));
  const current = hashes();
  const drift = inputs.filter(file => before.inputHashes[file] !== current[file]);
  if (drift.length) throw Error('Test input drift: ' + drift.join(', '));
  const resultsFile = 'word-sounds-built-tests.json';
  const results = JSON.parse(fs.readFileSync(path.join(__dirname, resultsFile), 'utf8'));
  const exitArgument = process.argv.find(value => value.startsWith('--test-exit-code='));
  const commandExitCode = exitArgument ? Number(exitArgument.split('=')[1]) : null;
  if (commandExitCode === null || !Number.isInteger(commandExitCode)) throw Error('Record the actual completed test command exit code');
  const build = JSON.parse(fs.readFileSync(path.join(__dirname, 'build-word.json'), 'utf8'));
  const claim = JSON.parse(fs.readFileSync(path.join(__dirname, 'word-sounds-build-claim.json'), 'utf8'));
  for (const module of build.modules) if (current[module.output] !== module.sha256) throw Error('Built module does not match root evidence: ' + module.output);
  const assertions = (results.testResults || []).flatMap(file => (file.assertionResults || []).map(test => ({ ...test, file: file.name.replaceAll('\\', '/') })));
  const counts = predicate => {
    const selected = assertions.filter(predicate);
    return { total: selected.length, passed: selected.filter(test => test.status === 'passed').length, failed: selected.filter(test => test.status === 'failed').length };
  };
  const proposalFile = '/tests/report_word_sounds_navigation_proposal.test.js';
  const characterization = test => test.file.endsWith(proposalFile) && test.fullName.includes('reproduces the present shared callback defect');
  const appliedSource = test => !test.file.endsWith(proposalFile) && !test.file.endsWith('/tests/report_word_sounds_built_contract.test.js');
  const report = {
    at: new Date().toISOString(), frozenFrom: before.at,
    inputHashes: { ...current, ['reports/report-fixes-2026-09-30/' + resultsFile]: sha(fs.readFileSync(path.join(__dirname, resultsFile))) }, inputDrift: [],
    generatedPairs: build.modules.map(module => ({ output: module.output, sha256: module.sha256, mirrorEqual: module.mirrorEqual, syntax: module.syntax })),
    sourceChangesAfterClaim: {
      workflow: 'Documented dev-tools/sync_word_sounds_core.cjs replaced only canonical core markers in player and setup source.',
      beforeSync: claim.frozen, afterSync: Object.fromEntries(Object.keys(claim.frozen).map(file => [file, current[file]])),
      actualBuild: 'Root ran _build_word_sounds_setup_module.js and guarded player public mirror copy.'
    },
    tests: { resultFile: resultsFile, resultSha256: sha(fs.readFileSync(path.join(__dirname, resultsFile))),
      total: results.numTotalTests, passed: results.numPassedTests, failed: results.numFailedTests, skipped: results.numPendingTests,
      success: results.success && commandExitCode === 0, commandExitCode, files: testFiles,
      groups: {
        appliedWordSoundsSourceAndRuntime: counts(appliedSource),
        builtEmbeddingAndMirrorContracts: counts(test => test.file.endsWith('/tests/report_word_sounds_built_contract.test.js')),
        reviewOnlyProposedCloseCallback: { ...counts(test => test.file.endsWith(proposalFile) && !characterization(test)), appliedToWorkspace: false },
        presentCloseDefectCharacterization: { ...counts(characterization), defectFixed: false }
      },
      failures: (results.testResults || []).flatMap(file => (file.assertionResults || []).filter(test => test.status === 'failed').map(test => ({ file: file.name, test: test.fullName, messages: test.failureMessages }))) },
    hostNavigation: { proposalOnly: true, hostSha256: current['AlloFlowANTI.txt'],
      patchedCallbackTestedInMemory: true, productionFixApplied: false },
    limits: ['Mounted jsdom and source contract tests; no deployed browser, real TTS preparation timing, instructional content review, screen reader, or full CI claim.',
      'Unverified Sound Swap drafts remain editable but unscored. Missing connected-text examples require teacher review. Shared-host close fix is still held.']
  };
  fs.writeFileSync(path.join(__dirname, 'word-sounds-built-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ tests: report.tests, inputDrift: [], generatedPairs: report.generatedPairs }));
  if (!results.success || results.numFailedTests || commandExitCode !== 0) process.exitCode = 1;
}
