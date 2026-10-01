const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const report = 'reports/circuit-lesson-writing-space-2026-10-01';
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const runner = report + '/run-regression-isolated.cjs';
const expectedSource = '6c61943ab672e958f0b93afd69487231e2604a30af53c78705a85f1ce3591e84';
const expectedCounts = {
  'tests/circuit_lesson_writing_space.test.js': 19,
  'tests/circuit_explanation_guide.test.js': 20,
  'tests/circuit_lesson_journey.test.js': 27,
  'tests/circuit_lesson_continuation.test.js': 20,
  'tests/circuit_active_lesson_records.test.js': 20,
  'tests/circuit_active_notebook_continuity.test.js': 16,
  'tests/circuit_evidence_writing.test.js': 22,
  'tests/circuit_localization.test.js': 4,
  'tests/circuit_a11y.test.js': 3,
  'tests/circuit_lesson_navigation.test.js': 13,
  'tests/circuit_form_labels_a11y.test.js': 4
};
const tests = Object.keys(expectedCounts);
const expectedTotal = Object.values(expectedCounts).reduce((a, b) => a + b, 0);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const hashes = () => Object.fromEntries([source, mirror, runner, ...tests].map(file => [file, hash(file)]));
const files = hashes();
assert.equal(files[source], expectedSource, 'The scoped regression requires the frozen product source');
assert.equal(files[source], files[mirror], 'Source and mirror must match');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2));
const relative = file => path.relative(root, file.name).replace(/\\/g, '/');


const initialReceiptFile = 'regression-run-receipt.json';
const initialReceipt = read(initialReceiptFile);
assert.equal(initialReceipt.reportSha256, null, 'This runner preserves an incomplete environment-crash attempt');
assert.notEqual(initialReceipt.exitCode, 0);
assert.deepEqual(initialReceipt.changedDuringRun, []);
for (const file of [source, mirror, ...tests]) assert.equal(initialReceipt.files[file], files[file]);
assert.equal(initialReceipt.runnerSha256, hash(report + '/run-regression.cjs'));
assert.equal(initialReceipt.stdoutSha256, hash(report + '/' + initialReceipt.stdout));
assert.equal(initialReceipt.stderrSha256, hash(report + '/' + initialReceipt.stderr));
const initialFailedAttempt = {
  receipt: initialReceiptFile, receiptSha256: hash(report + '/' + initialReceiptFile),
  runner: 'run-regression.cjs', runnerSha256: initialReceipt.runnerSha256,
  stdout: initialReceipt.stdout, stdoutSha256: initialReceipt.stdoutSha256,
  stderr: initialReceipt.stderr, stderrSha256: initialReceipt.stderrSha256,
  exitCode: initialReceipt.exitCode, durationMs: initialReceipt.durationMs,
  coverageIncluded: false, reason: 'Native process out of memory before a complete JSON report; no assertion coverage counted.'
};

function validateResult(result, selected) {
  assert.equal(result.success, true, selected);
  assert.equal(result.numFailedTests, 0); assert.equal(result.numPendingTests || 0, 0); assert.equal(result.numTodoTests || 0, 0);
  assert.equal(result.testResults.length, 1); assert.equal(relative(result.testResults[0]), selected);
  const file = result.testResults[0];
  assert.equal(file.status, 'passed'); assert.equal(file.assertionResults.length, expectedCounts[selected]);
  assert.equal(result.numTotalTests, expectedCounts[selected]); assert.equal(result.numPassedTests, expectedCounts[selected]);
  assert.ok(file.assertionResults.every(test => test.status === 'passed'));
  assert.equal(new Set(file.assertionResults.map(test => test.fullName)).size, file.assertionResults.length);
}

function execute(selected, index) {
  const stem = 'regression-file-' + String(index + 1).padStart(2, '0') + '-' + path.basename(selected, '.test.js');
  const name = stem + '.json', receiptName = stem + '-receipt.json';
  // A resume reuses only complete, successful, byte-identical per-file evidence.
  if (fs.existsSync(path.join(__dirname, receiptName))) {
    const receipt = read(receiptName);
    assert.equal(receipt.exitCode, 0, 'Preserve a failed isolated attempt for diagnosis');
    assert.deepEqual(receipt.files, files); assert.deepEqual(receipt.filesAtEnd, files);
    assert.deepEqual(receipt.changedDuringRun, []); assert.equal(receipt.reportSha256, hash(report + '/' + name));
    assert.equal(receipt.stdoutSha256, hash(report + '/' + receipt.stdout)); assert.equal(receipt.stderrSha256, hash(report + '/' + receipt.stderr));
    validateResult(read(name), selected); console.log('Reusing verified complete report: ' + selected); return receipt;
  }
  assert.ok(!fs.existsSync(path.join(__dirname, name)), 'Do not replace an unreceipted raw result');
  const args = ['node_modules/vitest/vitest.mjs', 'run', selected,
    '--pool=forks', '--maxWorkers=1', '--testTimeout=30000', '--hookTimeout=60000',
    '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + report + '/' + name];
  const startedAt = new Date().toISOString(), startedMs = Date.now();
  const start = { startedAt, cwd: root, command: [process.execPath, ...args], runnerSha256: files[runner], files, selected, expectedAssertions: expectedCounts[selected] };
  write(stem + '-start.json', start);
  console.log('[' + (index + 1) + '/' + tests.length + '] ' + selected);
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  const finishedAt = new Date().toISOString(), durationMs = Date.now() - startedMs;
  fs.writeFileSync(path.join(__dirname, stem + '-stdout.log'), run.stdout || '');
  fs.writeFileSync(path.join(__dirname, stem + '-stderr.log'), run.stderr || '');
  const filesAtEnd = hashes(), changedDuringRun = Object.keys(files).filter(file => filesAtEnd[file] !== files[file]);
  const receipt = { ...start, finishedAt, durationMs, exitCode: run.status, signal: run.signal || null,
    processError: run.error ? { message: run.error.message, code: run.error.code } : null,
    report: name, reportSha256: fs.existsSync(path.join(__dirname, name)) ? hash(report + '/' + name) : null,
    stdout: stem + '-stdout.log', stdoutSha256: hash(report + '/' + stem + '-stdout.log'),
    stderr: stem + '-stderr.log', stderrSha256: hash(report + '/' + stem + '-stderr.log'),
    runnerSha256AtEnd: filesAtEnd[runner], filesAtEnd, changedDuringRun };
  write(receiptName, receipt);
  assert.deepEqual(changedDuringRun, []); assert.equal(receipt.processError, null); assert.equal(receipt.signal, null);
  assert.equal(receipt.exitCode, 0, selected + ' did not complete successfully');
  assert.ok(receipt.reportSha256, 'Missing complete JSON result: ' + selected);
  validateResult(read(name), selected);
  console.log('  Passed ' + expectedCounts[selected] + ' assertions in ' + (durationMs / 1000).toFixed(2) + 's');
  return receipt;
}

console.log('Isolated scoped regression on ' + files[source] + '; one fresh Vitest process and one fork worker per file.');
const attempts = tests.map(execute);
const raw = attempts.map(attempt => read(attempt.report));
const testResults = raw.flatMap(result => result.testResults).sort((a, b) => relative(a).localeCompare(relative(b)));
assert.deepEqual(testResults.map(relative).sort(), tests.slice().sort());
assert.equal(testResults.reduce((n, file) => n + file.assertionResults.length, 0), expectedTotal);
const results = { success: true, startTime: raw[0].startTime, aggregate: true,
  coverage: { mode: 'isolated-per-file-processes', rawReports: attempts.map(attempt => attempt.report), expectedCounts, initialFailedAttempt }, testResults };
for (const field of ['numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numPendingTestSuites', 'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests']) results[field] = raw.reduce((n, result) => n + (result[field] || 0), 0);
assert.equal(results.numTotalTests, expectedTotal); assert.equal(results.numPassedTests, expectedTotal);
const filesAtEnd = hashes(), changedDuringRun = Object.keys(files).filter(file => filesAtEnd[file] !== files[file]);
assert.deepEqual(changedDuringRun, []);
write('regression.json', results);
write('regression-receipt.json', {
  startedAt: attempts[0].startedAt, finishedAt: attempts.at(-1).finishedAt,
  durationMs: attempts.reduce((n, attempt) => n + attempt.durationMs, 0),
  elapsedMs: Date.parse(attempts.at(-1).finishedAt) - Date.parse(attempts[0].startedAt),
  cwd: root, command: attempts.at(-1).command, runner: 'run-regression-isolated.cjs',
  runnerSha256: files[runner], runnerSha256AtEnd: filesAtEnd[runner],
  exitCode: 0, files, filesAtEnd, changedDuringRun, aggregate: true, mode: 'isolated-per-file-processes', attempts,
  initialFailedAttempt, report: 'regression.json', reportSha256: hash(report + '/regression.json'), expectedCounts,
  assertionCoverage: testResults.map(file => ({ file: relative(file), count: file.assertionResults.length, fullNames: file.assertionResults.map(test => test.fullName) }))
});
console.log('Scoped Circuit regression: ' + expectedTotal + ' passing assertions across ' + tests.length + ' complete isolated file reports.');
