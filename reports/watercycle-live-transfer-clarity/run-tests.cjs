'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const repo = path.resolve(__dirname, '..', '..');
const mode = process.argv[2];
const expectedSha = process.argv[3];
if (!['unit', 'regression'].includes(mode) || !/^[a-f0-9]{64}$/.test(expectedSha || '')) throw new Error('Usage: node run-tests.cjs unit|regression FINAL_SOURCE_SHA');
const tests = mode === 'unit' ? ['tests/watercycle_live_transfer_clarity.test.js'] : [
  'tests/watercycle_matter_energy.test.js',
  'tests/watercycle_hydrologic_time_rendering.test.js',
  'tests/watercycle_2d_process_evidence.test.js',
  'tests/watercycle_journey_controls.test.js',
  'tests/watercycle_process_compare.test.js',
];
const sourcePaths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pin = relative => { const bytes = fs.readFileSync(path.resolve(repo, relative)); return { path: relative, sha256: hash(bytes), bytes: bytes.length }; };
const relative = name => 'reports/watercycle-live-transfer-clarity/' + name;
const reportPath = relative(mode + '-results.json');
const logPath = relative(mode + '-results.log');
const receiptPath = relative(mode + '-receipt.json');
const loadedPath = relative('unit-loaded-runtime.json');
const before = sourcePaths.map(pin), testsBefore = tests.map(pin);
if (before.some(file => file.sha256 !== expectedSha)) throw new Error('Frozen source/public hash mismatch before ' + mode);
const recipe = pin(relative('run-tests.cjs'));
const baseline = pin(relative('baseline-runtime.js'));
const args = [path.join(repo, 'node_modules/vitest/vitest.mjs'), 'run', ...tests,
  '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=120000', '--hookTimeout=120000',
  '--reporter=default', '--reporter=json', '--outputFile=' + path.resolve(repo, reportPath)];
const env = { ...process.env };
if (mode === 'unit') env.WATER_CYCLE_LIVE_TRANSFER_LOADED_REPORT = path.resolve(repo, loadedPath);
else delete env.WATER_CYCLE_LIVE_TRANSFER_LOADED_REPORT;
const startedAt = new Date().toISOString();
const log = fs.createWriteStream(path.resolve(repo, logPath));
const child = spawn(process.execPath, args, { cwd: repo, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', chunk => { log.write(chunk); process.stdout.write(chunk); });
child.stderr.on('data', chunk => { log.write(chunk); process.stderr.write(chunk); });
child.once('error', error => { log.write(String(error)); });
child.once('close', async (exitCode, signal) => {
  await new Promise(resolve => log.end(resolve));
  const completedAt = new Date().toISOString();
  const after = sourcePaths.map(pin), testsAfter = tests.map(pin);
  const preserved = JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(testsBefore) === JSON.stringify(testsAfter);
  let raw = null, summary = null;
  if (fs.existsSync(path.resolve(repo, reportPath))) {
    raw = pin(reportPath);
    const results = JSON.parse(fs.readFileSync(path.resolve(repo, reportPath), 'utf8'));
    summary = { success: results.success, total: results.numTotalTests, passed: results.numPassedTests,
      failed: results.numFailedTests, pending: results.numPendingTests, failedSuites: results.numFailedTestSuites };
  }
  const complete = !!summary && summary.passed === summary.total && summary.pending === 0;
  const receipt = { mode, runnerPid: process.pid, childPid: child.pid, startedAt, completedAt,
    command: { executable: process.execPath, args, cwd: repo }, exitCode, signal,
    expectedSha, sourceBefore: before, sourceAfter: after, testsBefore, testsAfter, preserved,
    recipe, baseline, results: raw, log: pin(logPath), summary, complete,
    loadedRuntime: mode === 'unit' && fs.existsSync(path.resolve(repo, loadedPath)) ? pin(loadedPath) : null };
  fs.writeFileSync(path.resolve(repo, receiptPath), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ mode, receipt: receiptPath, childPid: child.pid, preserved, summary }));
  process.exitCode = exitCode === 0 && preserved && complete && summary.success && summary.failed === 0 && summary.failedSuites === 0 ? 0 : 1;
});
