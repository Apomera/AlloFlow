// Run from the repository root into a fresh evidence directory.
// Existing tests are pinned to the baseline; selected cases run once, serially.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process'), assert = require('assert/strict');
const FROZEN = '25d51a5672a1cf55bbaed925203e136be895a5cf8cde7f9adbb9ca2f10115603';
const BASELINE = '4eeb666c7';
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source;
const helper = 'tests/helpers/stem_widgets_smoke_harness.js';
const hashBytes = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => hashBytes(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const groups = [
  ['machinelab_i18n_hygiene', null, 8], ['machinelab_a11y', null, 28],
  ['machinelab_practice_flow', '^Machine Lab: practice flow routes ', 7],
  ['machinelab_practice_flow', '^Machine Lab: practice flow DOM navigation ', 10],
  ['machinelab_practice_flow', '^Machine Lab: practice flow feedback steps ', 8],
  ['machinelab_power_lab', '^Machine Lab: power skill grading requires ', 8],
  ['machinelab_power_lab', '^Machine Lab: power skill grading rejects malformed ', 7],
  ['machinelab_power_lab', '^Machine Lab: power skill grading (accepts the|rejects zero|accepts exact|preserves near|checks on Enter)', 5],
  ['machinelab_power_lab', '^Machine Lab: guided power skill practice (keeps solution|rechecks the current|advances practice)', 3],
  ['machinelab_power_lab', '^Machine Lab: guided power skill practice rejects delayed ', 5],
  ['machinelab_power_lab', '^Machine Lab: honest saved power skills saves fixed ', 6],
  ['machinelab_power_lab', '^Machine Lab: honest saved power skills (does not save|permits a worked)', 2],
  ['machinelab_power_lab', '^Machine Lab: honest saved power skills preserves saved ', 1],
  ['machinelab_skill_map', '^Machine Lab: skill map guarded navigation (selects|invalidates|treats)', 5],
  ['machinelab_skill_map', '^Machine Lab: skill map guarded navigation ignores a delayed ', 7]
].map(([name, pattern, expected]) => ({ file: 'tests/' + name + '.test.js', pattern, expected }));
const tests = [...new Set(groups.map(group => group.file))].map(file => {
  const sha256 = hash(file), baselineSha256 = hashBytes(cp.execFileSync('git', ['show', BASELINE + ':' + file], { maxBuffer: 4e6 }));
  assert.equal(sha256, baselineSha256, 'Existing test differs from baseline: ' + file);
  return { file, sha256, baselineSha256 };
});
const out = path.resolve(process.argv[2] || 'reports/machinelab-calculation-visual-2026-10-14/tests/run-01');
assert(!fs.existsSync(out), 'Preserve prior evidence; use a fresh directory');
assert.equal(hash(source), FROZEN, 'Source is not the reviewed candidate'); assert.equal(hash(mirror), FROZEN, 'Mirror differs');
fs.mkdirSync(path.join(out, 'test-temp'), { recursive: true });
const write = (name, data) => { const file = path.join(out, name); fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n'); fs.renameSync(file + '.tmp', file); };
const manifest = { format: 'machine-lab-calculation-visual-native-processes-v1', sourceSha256: FROZEN, baselineCommit: BASELINE,
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
    const selected = cases.map(test => groups.some(g => g.file === group.file && (!g.pattern || new RegExp(g.pattern).test(test.fullName))));
    if (!inventory.has(group.file)) inventory.set(group.file, { names: cases.map(test => test.fullName), selected, counts: cases.map(() => 0) });
    const entry = inventory.get(group.file); assert.deepEqual(cases.map(test => test.fullName), entry.names); assert.deepEqual(selected, entry.selected);
    cases.forEach((test, i) => {
      const selectedByThisGroup = !group.pattern || new RegExp(group.pattern).test(test.fullName);
      if (selectedByThisGroup) { assert.equal(test.status, 'passed'); entry.counts[i]++; }
      else assert(['pending', 'skipped'].includes(test.status), 'Unselected test executed: ' + test.fullName);
    });
    row.passed = group.expected; write('processes.json', manifest); console.log(stem + ': ' + group.expected + ' passed; observed native exit 0');
  }
  verify(); let passed = 0;
  for (const entry of inventory.values()) {
    assert(entry.counts.every((count, i) => count === (entry.selected[i] ? 1 : 0)), 'Each selected test must execute exactly once, with unselected tests skipped');
    passed += entry.selected.filter(Boolean).length;
  }
  assert.equal(passed, 110); assert.equal(inventory.size, 5); assert.equal(manifest.runs.length, 15);
  write('inventory.json', { baselineCommit: BASELINE, selection: 'Scoped existing tests; zero execution outside the listed patterns', files: [...inventory].map(([file, entry]) => ({ file, sha256: hash(file), ...entry })) });
  write('final.json', { format: 'machine-lab-calculation-visual-coverage-v1', sourceSha256: FROZEN, publicMirrorSha256: hash(mirror), baselineCommit: BASELINE,
    passed, failed: 0, uncoveredSelected: 0, files: inventory.size, nativeProcesses: manifest.runs.length,
    inventory: { path: 'inventory.json', sha256: hash(path.join(out, 'inventory.json')) },
    processManifest: { path: 'processes.json', sha256: hash(path.join(out, 'processes.json')) } });
  console.log(JSON.stringify({ passed, nativeProcesses: manifest.runs.length, sourceSha256: FROZEN, out }));
}
main().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
