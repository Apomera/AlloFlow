const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const report = 'reports/circuit-lesson-writing-space-2026-10-01';
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const runner = report + '/run-regression.cjs';
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

function execute(selected, stem) {
  const name = stem + '.json';
  assert.ok(!fs.existsSync(path.join(__dirname, name)), 'Preserve existing raw results; inspect before rerunning');
  const args = ['node_modules/vitest/vitest.mjs', 'run', ...selected,
    '--pool=forks', '--maxWorkers=1', '--testTimeout=30000', '--hookTimeout=60000',
    '--silent', '--reporter=dot', '--reporter=json', '--outputFile=' + report + '/' + name];
  const startedAt = new Date().toISOString(), startedMs = Date.now();
  const start = { startedAt, cwd: root, command: [process.execPath, ...args], runnerSha256: files[runner], files, expectedCounts };
  write(stem + '-start.json', start);
  console.log('Running ' + selected.length + ' test files with one forks worker on ' + files[source]);
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
    filesAtEnd, changedDuringRun };
  write(stem + '-receipt.json', receipt);
  assert.deepEqual(changedDuringRun, [], 'Source, mirror, tests or runner changed during execution');
  assert.equal(receipt.processError, null, 'Vitest process failed before completion');
  assert.equal(receipt.signal, null, 'Vitest process was interrupted');
  assert.ok(receipt.reportSha256, 'Vitest did not produce complete JSON results');
  return receipt;
}

function validateCovered(result, selected) {
  assert.equal(result.numFailedTests, 0);
  assert.equal(result.numPendingTests || 0, 0);
  assert.equal(result.numTodoTests || 0, 0);
  const paths = result.testResults.map(relative);
  assert.equal(new Set(paths).size, paths.length, 'Each reported file must occur exactly once');
  assert.ok(paths.every(file => selected.includes(file)), 'Unexpected reported test file');
  for (const file of result.testResults) {
    const name = relative(file);
    assert.equal(file.status, 'passed', name);
    assert.equal(file.assertionResults.length, expectedCounts[name], name + ' assertion coverage');
    assert.ok(file.assertionResults.every(test => test.status === 'passed'), name + ' has a skipped or failed assertion');
    assert.equal(new Set(file.assertionResults.map(test => test.fullName)).size, file.assertionResults.length, name + ' duplicated an assertion');
  }
  return paths;
}

const recoveryOnly = process.argv.includes('--recover');
let basisReceipt;
if (recoveryOnly) {
  basisReceipt = read('regression-run-receipt.json');
  assert.deepEqual(basisReceipt.files, files); assert.deepEqual(basisReceipt.filesAtEnd, files);
  assert.equal(basisReceipt.exitCode, 1); assert.deepEqual(basisReceipt.changedDuringRun, []);
  assert.equal(basisReceipt.reportSha256, hash(report + '/' + basisReceipt.report));
} else basisReceipt = execute(tests, 'regression-run');
const basis = read(basisReceipt.report), covered = validateCovered(basis, tests);
const missing = tests.filter(file => !covered.includes(file));
let recoveryReceipt = null, recovery = null;
if (missing.length) {
  assert.equal(basisReceipt.exitCode, 1);
  const output = fs.readFileSync(path.join(__dirname, basisReceipt.stdout), 'utf8') + fs.readFileSync(path.join(__dirname, basisReceipt.stderr), 'utf8');
  assert.match(output, /Timeout starting (?:forks|threads) runner|Failed to start (?:forks|threads) worker|Timed out (?:starting|initializing) (?:a )?(?:worker|fork|thread)/i, 'Only documented worker-startup omissions may be recovered');
  recoveryReceipt = execute(missing, 'regression-recovery');
  assert.equal(recoveryReceipt.exitCode, 0); recovery = read(recoveryReceipt.report); assert.equal(recovery.success, true);
  assert.deepEqual(validateCovered(recovery, missing).sort(), missing.slice().sort());
} else {
  assert.equal(basisReceipt.exitCode, 0); assert.equal(basis.success, true);
}
const testResults = [...basis.testResults, ...(recovery ? recovery.testResults : [])].sort((a, b) => relative(a).localeCompare(relative(b)));
assert.deepEqual(testResults.map(relative).sort(), tests.slice().sort());
assert.equal(testResults.reduce((n, file) => n + file.assertionResults.length, 0), expectedTotal);
const results = { success: true, startTime: basis.startTime, aggregate: !!recovery,
  coverage: { basis: basisReceipt.report, recovery: recoveryReceipt?.report || null, expectedCounts }, testResults };
for (const field of ['numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numPendingTestSuites', 'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests']) results[field] = (basis[field] || 0) + (recovery ? recovery[field] || 0 : 0);
assert.equal(results.numTotalTests, expectedTotal); assert.equal(results.numPassedTests, expectedTotal);
const filesAtEnd = hashes(), changedDuringRun = Object.keys(files).filter(file => filesAtEnd[file] !== files[file]);
assert.deepEqual(changedDuringRun, []);
const attempts = [basisReceipt, ...(recoveryReceipt ? [recoveryReceipt] : [])], last = attempts.at(-1);
write('regression.json', results);
write('regression-receipt.json', {
  startedAt: basisReceipt.startedAt, finishedAt: last.finishedAt,
  durationMs: attempts.reduce((n, item) => n + item.durationMs, 0),
  elapsedMs: Date.parse(last.finishedAt) - Date.parse(basisReceipt.startedAt),
  cwd: root, command: last.command, runnerSha256: files[runner], runnerSha256AtEnd: filesAtEnd[runner],
  exitCode: 0, files, filesAtEnd, changedDuringRun, aggregate: !!recovery, attempts,
  report: 'regression.json', reportSha256: hash(report + '/regression.json'), expectedCounts,
  assertionCoverage: testResults.map(file => ({ file: relative(file), count: file.assertionResults.length, fullNames: file.assertionResults.map(test => test.fullName) }))
});
console.log('Scoped Circuit regression: ' + results.numPassedTests + '/' + expectedTotal + ' tests passed across ' + tests.length + ' files; ' + (recovery ? 'startup omission recovered' : 'one complete run') + '.');
