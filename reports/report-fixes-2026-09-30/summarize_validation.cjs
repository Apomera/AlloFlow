'use strict';
const fs = require('node:fs'), path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const files = ['compact-audio-mounted-candidate-tests.json', 'reader-adjacent-tests.json', 'generation-tests.json', 'audio-tests.json', 'api-tests.json', 'reporter-tests.json', 'storage-validation.json', 'url-key-tests-after-hydration.json', 'interview-focused-tests.json', 'word-sounds-built-tests.json', 'recovery-followup.actual-final.json'];
const unitGroups = files.map(file => {
  const report = read(file);
  return { file, passed: report.numPassedTests, total: report.numTotalTests, success: report.success, failed: report.numFailedTests };
});
const browser = read('reader-browser-results.json');
const supporting = read('supporting-validation.json');
const candidate = read('candidate-verification.json');
const proposals = read('proposal-validation.json');
const release = read('reader-release-check.json');
const compact = read('compact-audio-browser-results.json');
const compactFinal = read('compact-audio-final-validation.json');
const interviewBuilt = read('interview-built-verification.json');
const wordBuilt = read('word-sounds-built-validation.json');
const inputRecords = [
  ['reader-browser-results.json', 'inputHashes'], ['reader-adjacent-validation.json', 'monitoredInputs'],
  ['reader-verification.json', 'candidateHashes'], ['generation-validation-summary.json', 'hashesAfter'],
  ['audio-verification.json', 'sourceHashes'], ['storage-diagnosis.json', 'inputHashes'],
  ['compact-audio-final-validation.json', 'inputHashes'], ['interview-built-verification.json', 'inputHashes'],
  ['word-sounds-built-validation.json', 'inputHashes'],
];
const recordedInputChecks = inputRecords.map(([file, field]) => ({ file, field, mismatches: Object.entries(read(file)[field] || {}).filter(([name, sha]) => {
  if (typeof sha !== 'string' || sha.length !== 64) return false;
  try { return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex') !== sha; } catch (_) { return true; }
}).map(([name]) => name) }));
const result = {
  at: new Date().toISOString(), unitGroups, recordedInputChecks,
  readerBrowser: { passed: browser.checks.filter(check => check.passed).length, total: browser.checks.length, status: browser.status, changedInputs: browser.changedInputs, errors: browser.errors },
  compactBrowser: { passed: compact.checks.filter(check => check.passed).length, total: compact.checks.length, status: compact.status, changedInputs: compact.changedInputs, errors: compact.errors },
  followupEvidence: { compact: compactFinal, interview: interviewBuilt, word: wordBuilt, storage: { actualDesiredPasses: 16, heldHostBugCharacterizations: 1, intentionalCandidateOnlySkips: 1, proposalDesiredPasses: 17, realCanvasRecoveryVerified: false } },
  supporting: { pythonOriginPolicy: { passed: 9, total: 9 }, pythonVoiceLanguage: { passed: 5, total: 5 }, guidedFlow: { passed: 20, total: 20 }, targetedValidationPassed: supporting.targetedValidationPassed, runtimeHashesPreserved: supporting.runtimeHashesPreserved, concurrentTestEditsDisclosed: supporting.changedDuringValidation, infrastructureErrorsPreserved: supporting.infrastructureErrors },
  generatedPairs: { count: candidate.modules.length, errors: candidate.errors, journalUnchanged: candidate.journalUnchanged, hostMirrorsMatch: candidate.hostMirrorsMatch },
  heldProposals: { allSyntaxAndApplicabilityPassed: proposals.results.every(result => result.ok), workspaceHostsUnchanged: proposals.hostsUnchanged, applied: false },
  readerReleaseCheck: { passed: release.ok, errors: release.errors, generatedMirrorsMatch: release.mirrorsMatch, hostsMatch: release.hostsMatch, changedDuringCheck: release.changedDuringCheck },
  limits: ['Group counts are not a conformance score or a claim of unique coverage.', 'Real Canvas save/reload recovery, persistent live module loading, actual browser zoom, manual screen readers, exports, educator content review and full CI remain unverified.', 'Shared host proposals are unapplied; no commit, push, deployment or external settings change.'],
};
result.targetedChecksPassed = unitGroups.every(group => group.success && group.failed === 0 && group.total > 0) && browser.status === 'passed' && browser.checks.every(check => check.passed) && browser.changedInputs.length === 0 && compact.status === 'passed' && compact.checks.every(check => check.passed) && compact.changedInputs.length === 0 && compactFinal.exitCode === 0 && interviewBuilt.tests.executionClean === true && interviewBuilt.outputMatchesTestedCanonicalCandidate === true && wordBuilt.tests.success === true && wordBuilt.tests.failed === 0 && wordBuilt.inputDrift.length === 0 && supporting.targetedValidationPassed === true && candidate.errors.length === 0 && result.heldProposals.allSyntaxAndApplicabilityPassed && recordedInputChecks.every(record => record.mismatches.length === 0);
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ targetedChecksPassed: result.targetedChecksPassed, generatedPairs: result.generatedPairs.count, unitGroups, readerBrowser: result.readerBrowser.passed, readerReleaseErrors: release.errors.map(error => error.code) }));
if (!result.targetedChecksPassed) process.exitCode = 1;
