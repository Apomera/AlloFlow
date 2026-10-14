// Run from the repository root with a fresh evidence directory.
// Existing tests must match the committed baseline. Native groups run serially.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process'), assert = require('assert/strict');
const FROZEN = '458d63e5be5dbceeb459959efff12b4c900ca00913a851946deb5116d2f5db04';
const BASELINE = '9891a85c1';
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source;
const helper = 'tests/helpers/stem_widgets_smoke_harness.js';
const hashBytes = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => hashBytes(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const groups = [
  ['machinelab_i18n_hygiene', null, 8], ['machinelab_a11y', null, 28],
  ['machinelab_prediction', '^Machine Lab: prediction arithmetic checks all four ', 6],
  ['machinelab_prediction', '^Machine Lab: prediction arithmetic reverses the ', 6],
  ['machinelab_prediction', '^Machine Lab: prediction arithmetic (normalizes|chooses|uses percentage|uses vertical)', 4],
  ['machinelab_prediction', '^Machine Lab: prediction lifecycle ', 6],
  ['machinelab_prediction', '^Machine Lab: prediction isolation and structure ', 6],
  ['machinelab_prediction_calculation', '^Machine Lab: prediction calculation arithmetic solves all four ', 6],
  ['machinelab_prediction_calculation', '^Machine Lab: prediction calculation arithmetic (converts|uses full|keeps relative)', 3],
  ['machinelab_prediction_calculation', '^Machine Lab: prediction calculation lifecycle (starts|checks the ratio|rejects blank|uses the latest|supports Enter)', 5],
  ['machinelab_prediction_calculation', '^Machine Lab: prediction calculation lifecycle (marks|keeps explicitly|identifies|resets)', 6],
  ['machinelab_prediction_calculation', '^Machine Lab: prediction calculation isolation ', 7]
].map(([name, pattern, expected]) => ({ file: 'tests/' + name + '.test.js', pattern, expected }));
const tests = [...new Set(groups.map(group => group.file))].map(file => {
  const sha256 = hash(file), baselineSha256 = hashBytes(cp.execFileSync('git', ['show', BASELINE + ':' + file], { maxBuffer: 4e6 }));
  assert.equal(sha256, baselineSha256, 'Existing test differs from baseline: ' + file);
  return { file, sha256, baselineSha256 };
});
const out = path.resolve(process.argv[2] || 'reports/machinelab-prediction-visual-2026-10-13/tests/run-01');
assert(!fs.existsSync(out), 'Preserve prior evidence; use a fresh directory');
assert.equal(hash(source), FROZEN, 'Source is not the reviewed candidate'); assert.equal(hash(mirror), FROZEN, 'Mirror differs');
fs.mkdirSync(path.join(out, 'test-temp'), { recursive: true });
const write = (name, data) => { const file = path.join(out, name); fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n'); fs.renameSync(file + '.tmp', file); };
const manifest = { format: 'machine-lab-prediction-visual-native-processes-v1', sourceSha256: FROZEN, baselineCommit: BASELINE,
  runnerSha256: hash(__filename), helper, helperSha256: hash(helper), tests, nodeHeapMiB: 512, nodeSemiSpaceMiB: 8,
  workers: 1, pool: 'forks', isolate: false, testTimeoutMs: 30000, childTimeoutMs: 120000, runs: [] };
fs.copyFileSync(__filename, path.join(out, 'runner-snapshot.cjs'));
function verify() {
  assert.equal(hash(source), FROZEN); assert.equal(hash(mirror), FROZEN); assert.equal(hash(helper), manifest.helperSha256);
  for (const test of tests) assert.equal(hash(test.file), test.sha256, 'Test changed during verification: ' + test.file);
}
function runChild(args, log) {
  const logPath = path.join(out, log), fd = fs.openSync(logPath, 'wx'); let error, timedOut = false;
  return new Promise(resolve => {
    const child = cp.spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512 --max-semi-space-size=8', TEMP: path.join(out, 'test-temp'), TMP: path.join(out, 'test-temp') } });
    const timer = setTimeout(() => {
      timedOut = true; fs.writeSync(fd, '\nNative child exceeded 120000 ms; terminating this child process tree.\n');
      if (process.platform === 'win32' && child.pid) cp.spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else child.kill('SIGKILL');
    }, 120000);
    child.stdout.on('data', data => fs.writeSync(fd, data)); child.stderr.on('data', data => fs.writeSync(fd, data));
    child.on('error', e => { error = String(e); fs.writeSync(fd, '\n' + error + '\n'); });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer); fs.closeSync(fd);
      fs.writeFileSync(logPath, fs.readFileSync(logPath, 'utf8').replace(/\r\n/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n');
      resolve({ exitCode, signal, error: error || null, timedOut });
    });
  });
}
async function main() {
  const inventory = new Map();
  for (const [index, group] of groups.entries()) {
    verify(); const stem = 'group-' + String(index + 1).padStart(2, '0'), receipt = stem + '.json', log = stem + '.log';
    const args = ['node_modules/vitest/vitest.mjs', 'run', group.file, '--maxWorkers=1', '--pool=forks', '--no-isolate', '--testTimeout=30000',
      '--reporter=default', '--reporter=json', '--outputFile', path.join(out, receipt)];
    if (group.pattern) args.push('--testNamePattern', group.pattern);
    const row = { ...group, receipt, log, command: [process.execPath, ...args], status: 'running', startedAt: new Date().toISOString(),
      sourceSha256: hash(source), mirrorBeforeSha256: hash(mirror), testSha256: hash(group.file) };
    manifest.runs.push(row); write('processes.json', manifest);
    Object.assign(row, await runChild(args, log), { status: 'completed', finishedAt: new Date().toISOString(), sourceAfterSha256: hash(source),
      mirrorAfterSha256: hash(mirror), testAfterSha256: hash(group.file), logSha256: hash(path.join(out, log)) });
    if (fs.existsSync(path.join(out, receipt))) row.receiptSha256 = hash(path.join(out, receipt));
    write('processes.json', manifest); assert.equal(row.exitCode, 0); assert.equal(row.signal, null); assert.equal(row.error, null); assert.equal(row.timedOut, false); verify();
    const report = read(path.join(out, receipt)); assert.equal(report.success, true); assert.equal(report.numFailedTests, 0);
    assert.equal(report.numPassedTests, group.expected); assert.equal(report.testResults.length, 1);
    const cases = report.testResults[0].assertionResults; assert.equal(cases.filter(test => test.status === 'passed').length, group.expected);
    if (!inventory.has(group.file)) inventory.set(group.file, { names: cases.map(test => test.fullName), counts: cases.map(() => 0) });
    const entry = inventory.get(group.file); assert.deepEqual(cases.map(test => test.fullName), entry.names);
    cases.forEach((test, i) => { if (test.status === 'passed') entry.counts[i]++; else assert(['pending', 'skipped'].includes(test.status)); });
    row.passed = group.expected; write('processes.json', manifest); console.log(stem + ': ' + group.expected + ' passed; observed native exit 0');
  }
  verify(); let passed = 0;
  for (const entry of inventory.values()) { assert(entry.counts.every(count => count === 1), 'Each existing test must execute exactly once'); passed += entry.names.length; }
  assert.equal(passed, 91); assert.equal(inventory.size, 4); assert.equal(manifest.runs.length, 12);
  write('inventory.json', { baselineCommit: BASELINE, files: [...inventory].map(([file, entry]) => ({ file, sha256: hash(file), ...entry })) });
  write('final.json', { format: 'machine-lab-prediction-visual-coverage-v1', sourceSha256: FROZEN, publicMirrorSha256: hash(mirror), baselineCommit: BASELINE,
    passed, failed: 0, uncovered: 0, files: inventory.size, nativeProcesses: manifest.runs.length,
    inventory: { path: 'inventory.json', sha256: hash(path.join(out, 'inventory.json')) },
    processManifest: { path: 'processes.json', sha256: hash(path.join(out, 'processes.json')) } });
  console.log(JSON.stringify({ passed, nativeProcesses: manifest.runs.length, sourceSha256: FROZEN, out }));
}
main().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
