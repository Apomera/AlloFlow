const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const report = 'reports/circuit-comparison-notes-2026-10-04';
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const runner = report + '/run-regression.cjs';
const expectedSource = '6c25d629097876a19c030e8236351c32191eea9085c20e7e6f4a99eb3dd2402b';
const expectedCounts = {
  'tests/circuit_comparison_notes.test.js': 13,
  'tests/circuit_comparison_context.test.js': 16,
  'tests/circuit_explanation_navigation.test.js': 8,
  'tests/circuit_second_reading_guidance.test.js': 18,
  'tests/circuit_active_observation_comparison.test.js': 14,
  'tests/circuit_evidence_writing.test.js': 22,
  'tests/circuit_active_notebook_continuity.test.js': 16,
  'tests/circuit_observation_summary.test.js': 10
};
const tests = Object.keys(expectedCounts);
const expectedTotal = Object.values(expectedCounts).reduce((a, b) => a + b, 0);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const hashes = () => Object.fromEntries([source, mirror, runner, ...tests].map(file => [file, hash(file)]));
const files = hashes();
assert.equal(files[source], expectedSource, 'The grouped regression requires the frozen product source');
assert.equal(files[source], files[mirror], 'Source and mirror must match');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2));
const relative = file => path.relative(root, file.name).replace(/\\/g, '/');
const artifacts = ['regression-start.json', 'regression-raw.json', 'regression-stdout.log', 'regression-stderr.log', 'regression-receipt.json', 'regression.json'];
for (const file of artifacts) assert.ok(!fs.existsSync(path.join(__dirname, file)), 'Preserve the existing regression artifact before another attempt: ' + file);

const args = ['node_modules/vitest/vitest.mjs', 'run', ...tests,
  '--pool=threads', '--maxWorkers=1', '--isolate', '--testTimeout=30000', '--hookTimeout=60000',
  '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + report + '/regression-raw.json'];
const startedAt = new Date().toISOString(), startedMs = Date.now();
const start = { startedAt, cwd: root, command: [process.execPath, ...args], runner: 'run-regression.cjs', runnerSha256: files[runner], files, selected: tests, expectedCounts, expectedAssertions: expectedTotal, mode: 'single-process-isolated-files' };
write('regression-start.json', start);
console.log('Grouped Circuit regression: ' + expectedTotal + ' assertions / ' + tests.length + ' files on ' + files[source]);
const run = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true });
const finishedAt = new Date().toISOString(), durationMs = Date.now() - startedMs;
fs.writeFileSync(path.join(__dirname, 'regression-stdout.log'), run.stdout || '');
fs.writeFileSync(path.join(__dirname, 'regression-stderr.log'), run.stderr || '');
const filesAtEnd = hashes(), changedDuringRun = Object.keys(files).filter(file => filesAtEnd[file] !== files[file]);
const rawExists = fs.existsSync(path.join(__dirname, 'regression-raw.json'));
const raw = rawExists ? JSON.parse(fs.readFileSync(path.join(__dirname, 'regression-raw.json'), 'utf8')) : null;
const assertionCoverage = (raw?.testResults || []).map(file => ({ file: relative(file), status: file.status, count: file.assertionResults.length, fullNames: file.assertionResults.map(test => test.fullName) }));
const receipt = { ...start, finishedAt, durationMs, elapsedMs: durationMs, exitCode: run.status, signal: run.signal || null,
  processError: run.error ? { message: run.error.message, code: run.error.code } : null,
  rawReport: 'regression-raw.json', rawReportSha256: rawExists ? hash(report + '/regression-raw.json') : null,
  stdout: 'regression-stdout.log', stdoutSha256: hash(report + '/regression-stdout.log'),
  stderr: 'regression-stderr.log', stderrSha256: hash(report + '/regression-stderr.log'),
  start: 'regression-start.json', startSha256: hash(report + '/regression-start.json'),
  runnerSha256AtEnd: filesAtEnd[runner], filesAtEnd, changedDuringRun, assertionCoverage };
write('regression-receipt.json', receipt);
assert.deepEqual(changedDuringRun, []); assert.equal(receipt.processError, null); assert.equal(receipt.signal, null); assert.equal(run.status, 0);
assert.ok(rawExists, 'Complete raw Vitest JSON was not written');
assert.equal(raw.success, true); assert.equal(raw.numFailedTests, 0); assert.equal(raw.numPendingTests || 0, 0); assert.equal(raw.numTodoTests || 0, 0);
assert.equal(raw.numTotalTests, expectedTotal); assert.equal(raw.numPassedTests, expectedTotal);
assert.deepEqual(raw.testResults.map(relative).sort(), tests.slice().sort());
for (const result of raw.testResults) {
  assert.equal(result.status, 'passed'); assert.equal(result.assertionResults.length, expectedCounts[relative(result)]);
  assert.ok(result.assertionResults.every(test => test.status === 'passed'));
  assert.equal(new Set(result.assertionResults.map(test => test.fullName)).size, result.assertionResults.length);
}
// Keep raw reporter bytes untouched; the common report path is an exact copy.
fs.copyFileSync(path.join(__dirname, 'regression-raw.json'), path.join(__dirname, 'regression.json'));
Object.assign(receipt, { passed: true, report: 'regression.json', reportSha256: hash(report + '/regression.json') });
write('regression-receipt.json', receipt);
console.log('Passed ' + expectedTotal + '/' + expectedTotal + ' assertions across ' + tests.length + ' isolated test files in ' + (durationMs / 1000).toFixed(2) + 's; source, mirror, tests and runner unchanged.');
