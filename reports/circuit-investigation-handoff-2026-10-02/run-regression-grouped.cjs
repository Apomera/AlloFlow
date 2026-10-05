const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const report = 'reports/circuit-investigation-handoff-2026-10-02';
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const runner = report + '/run-regression-grouped.cjs';
const individualRunner = report + '/run-regression.cjs';
const expectedSource = '3424b78369802606dd709faf9c308c1d444b0d18633c69062a7e7486e5614453';
const mode = 'mixed-isolated-processes-and-grouped-isolated-environments';
const expectedCounts = {
  'tests/circuit_investigation_handoff.test.js': 12,
  'tests/circuit_lesson_continuation.test.js': 23,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_guided_entry.test.js': 26,
  'tests/circuit_investigation.test.js': 25,
  'tests/circuit_lesson_writing_space.test.js': 19,
  'tests/circuit_active_lesson_records.test.js': 20,
  'tests/circuit_prediction_guide.test.js': 12,
  'tests/circuit_localization.test.js': 4,
  'tests/circuit_form_labels_a11y.test.js': 4
};
const tests = Object.keys(expectedCounts), retainedTests = tests.slice(0, 2), groupedTests = tests.slice(2);
const expectedTotal = Object.values(expectedCounts).reduce((a, b) => a + b, 0);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(__dirname, file), JSON.stringify(value, null, 2));
const relative = file => path.relative(root, file.name).replace(/\\/g, '/');
const retainedStems = ['regression-file-01-circuit_investigation_handoff', 'regression-file-02-circuit_lesson_continuation'];
const retainedArtifacts = retainedStems.flatMap(stem => ['.json', '-start.json', '-receipt.json', '-stdout.log', '-stderr.log'].map(suffix => report + '/' + stem + suffix));
const archiveNames = ['initial-startup-attempt', 'retry-startup-attempt', 'threads-startup-attempt'];
const priorStartupAttempts = archiveNames.map(name => ({
  path: name,
  files: fs.readdirSync(path.join(__dirname, name)).sort().map(file => ({ path: name + '/' + file, sha256: hash(report + '/' + name + '/' + file) }))
}));
const proofFiles = ['continuation-helper-correction.json', 'circuit_lesson_continuation.before.test.js', 'circuit_lesson_continuation.after.test.js', 'pool-change.json', 'worker-strategy.json'].map(file => report + '/' + file);
const strategy = read('worker-strategy.json');
assert.equal(strategy.cliEvidence.vitestVersion, JSON.parse(fs.readFileSync(path.join(root, 'node_modules/vitest/package.json'), 'utf8')).version);
assert.equal(strategy.cliEvidence.sha256, hash(strategy.cliEvidence.path));
assert.ok(strategy.cliEvidence.declaration.includes('Run every test file in isolation'));
assert.equal(strategy.mode, mode);
const inputs = [...new Set([source, mirror, runner, individualRunner, ...tests, ...proofFiles, ...retainedArtifacts, strategy.cliEvidence.path, ...priorStartupAttempts.flatMap(archive => archive.files.map(file => report + '/' + file.path))])];
const hashes = () => Object.fromEntries(inputs.map(file => [file, hash(file)]));
const files = hashes();
assert.equal(files[source], expectedSource); assert.equal(files[mirror], expectedSource);
assert.equal(files[individualRunner], '904f43bab62d11ff5121a0b7a7b6e76806d8bc96cd85bd87bb455a2c48783146');

function validateResult(result, selected) {
  assert.equal(result.success, true); assert.equal(result.numFailedTests, 0);
  assert.equal(result.numPendingTests || 0, 0); assert.equal(result.numTodoTests || 0, 0);
  assert.deepEqual(result.testResults.map(relative).sort(), selected.slice().sort());
  const expected = selected.reduce((count, file) => count + expectedCounts[file], 0);
  assert.equal(result.numTotalTests, expected); assert.equal(result.numPassedTests, expected);
  for (const file of result.testResults) {
    assert.equal(file.status, 'passed'); assert.equal(file.assertionResults.length, expectedCounts[relative(file)]);
    assert.ok(file.assertionResults.every(test => test.status === 'passed'));
    assert.equal(new Set(file.assertionResults.map(test => test.fullName)).size, file.assertionResults.length);
  }
}
const retainedAttempts = retainedStems.map((stem, index) => {
  const receipt = read(stem + '-receipt.json');
  assert.equal(receipt.exitCode, 0); assert.equal(receipt.processError, null); assert.equal(receipt.signal, null);
  assert.deepEqual(receipt.changedDuringRun, []); assert.deepEqual(receipt.files, receipt.filesAtEnd);
  for (const [file, value] of Object.entries(receipt.files)) assert.equal(hash(file), value, 'Changed retained input: ' + file);
  assert.equal(receipt.runnerSha256, files[individualRunner]); assert.equal(receipt.runnerSha256AtEnd, files[individualRunner]);
  assert.ok(receipt.command.includes('--pool=threads')); assert.ok(receipt.command.includes('--maxWorkers=1'));
  for (const [name, digest] of [[receipt.report, receipt.reportSha256], [receipt.stdout, receipt.stdoutSha256], [receipt.stderr, receipt.stderrSha256]]) assert.equal(hash(report + '/' + name), digest);
  validateResult(read(receipt.report), [retainedTests[index]]);
  return { ...receipt, runner: 'run-regression.cjs', mode: 'one-file-process', isolation: 'default true' };
});
console.log('Retaining 35 verified assertions from two unchanged individual reports.');
const stem = 'regression-group-remaining', reportName = stem + '.json';
assert.ok(!fs.existsSync(path.join(__dirname, reportName)), 'Preserve any existing grouped attempt before executing.');
assert.ok(!fs.existsSync(path.join(__dirname, stem + '-receipt.json')), 'Preserve any existing grouped receipt.');
const args = ['node_modules/vitest/vitest.mjs', 'run', ...groupedTests,
  '--pool=threads', '--maxWorkers=1', '--isolate', '--testTimeout=30000', '--hookTimeout=60000',
  '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + report + '/' + reportName];
const startedAt = new Date().toISOString(), startedMs = Date.now();
const start = { startedAt, cwd: root, command: [process.execPath, ...args], runner: 'run-regression-grouped.cjs', runnerSha256: files[runner], files, selected: groupedTests, expectedAssertions: 137, mode: 'grouped-isolated-environments', pool: 'threads', maxWorkers: 1, isolate: true };
write(stem + '-start.json', start);
console.log('Running eight remaining files in one Vitest invocation with one thread worker and explicit file isolation.');
const run = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true });
const finishedAt = new Date().toISOString(), durationMs = Date.now() - startedMs;
fs.writeFileSync(path.join(__dirname, stem + '-stdout.log'), run.stdout || '');
fs.writeFileSync(path.join(__dirname, stem + '-stderr.log'), run.stderr || '');
const filesAtEnd = hashes(), changedDuringRun = Object.keys(files).filter(file => filesAtEnd[file] !== files[file]);
const groupReceipt = { ...start, finishedAt, durationMs, exitCode: run.status, signal: run.signal || null,
  processError: run.error ? { message: run.error.message, code: run.error.code } : null,
  report: reportName, reportSha256: fs.existsSync(path.join(__dirname, reportName)) ? hash(report + '/' + reportName) : null,
  stdout: stem + '-stdout.log', stdoutSha256: hash(report + '/' + stem + '-stdout.log'),
  stderr: stem + '-stderr.log', stderrSha256: hash(report + '/' + stem + '-stderr.log'),
  runnerSha256AtEnd: filesAtEnd[runner], filesAtEnd, changedDuringRun };
write(stem + '-receipt.json', groupReceipt);
assert.deepEqual(changedDuringRun, []); assert.equal(groupReceipt.processError, null); assert.equal(groupReceipt.signal, null);
assert.equal(groupReceipt.exitCode, 0, 'Grouped run did not complete successfully'); assert.ok(groupReceipt.reportSha256);
const groupedRaw = read(reportName); validateResult(groupedRaw, groupedTests);
const attempts = [...retainedAttempts, groupReceipt], raw = [...retainedAttempts.map(attempt => read(attempt.report)), groupedRaw];
const testResults = raw.flatMap(result => result.testResults).sort((a, b) => relative(a).localeCompare(relative(b)));
assert.deepEqual(testResults.map(relative).sort(), tests.slice().sort());
assert.equal(testResults.reduce((n, file) => n + file.assertionResults.length, 0), expectedTotal);
const groups = [
  { runner: 'run-regression.cjs', pool: 'threads', maxWorkers: 1, isolation: 'default true', files: retainedTests, expectedAssertions: 35, rawReports: retainedAttempts.map(attempt => attempt.report) },
  { runner: 'run-regression-grouped.cjs', pool: 'threads', maxWorkers: 1, isolate: true, files: groupedTests, expectedAssertions: 137, rawReports: [reportName] }
];
const results = { success: true, startTime: raw[0].startTime, aggregate: true, coverage: { mode, rawReports: attempts.map(attempt => attempt.report), expectedCounts, groups }, testResults };
for (const field of ['numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numPendingTestSuites', 'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests']) results[field] = raw.reduce((n, result) => n + (result[field] || 0), 0);
assert.equal(results.numTotalTests, expectedTotal); assert.equal(results.numPassedTests, expectedTotal);
write('regression.json', results);
write('regression-receipt.json', {
  startedAt: attempts[0].startedAt, finishedAt,
  durationMs: attempts.reduce((n, attempt) => n + attempt.durationMs, 0),
  elapsedMs: Date.parse(finishedAt) - Date.parse(attempts[0].startedAt),
  cwd: root, command: groupReceipt.command, runner: 'run-regression-grouped.cjs',
  runnerSha256: files[runner], runnerSha256AtEnd: filesAtEnd[runner],
  exitCode: 0, files, filesAtEnd, changedDuringRun, aggregate: true, mode, groups, attempts,
  priorStartupAttempts, workerStrategy: { path: 'worker-strategy.json', sha256: hash(report + '/worker-strategy.json') },
  report: 'regression.json', reportSha256: hash(report + '/regression.json'), expectedCounts,
  assertionCoverage: testResults.map(file => ({ file: relative(file), count: file.assertionResults.length, fullNames: file.assertionResults.map(test => test.fullName) }))
});
console.log('Scoped Circuit regression: 172 passing assertions across 10 complete file reports (35 retained + 137 grouped with isolation).');