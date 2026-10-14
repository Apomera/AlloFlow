// Run from the repository root. Native Vitest groups execute serially.
// A failed attempt must remain in its original directory; use a fresh path to retry.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const FROZEN = 'ead716145aa5dda704b6f3fe3dd0e624b57456054af2a1036a6c0e69c38152b3';
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source;
const file = 'tests/machinelab_prediction.test.js', helper = 'tests/helpers/stem_widgets_smoke_harness.js';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const groups = [
  { pattern: '^Machine Lab: prediction arithmetic checks all four ', expected: 6 },
  { pattern: '^Machine Lab: prediction arithmetic reverses the ', expected: 6 },
  { pattern: '^Machine Lab: prediction arithmetic (normalizes|chooses|uses percentage|uses vertical)', expected: 4 },
  { pattern: '^Machine Lab: prediction lifecycle ', expected: 6 },
  { pattern: '^Machine Lab: prediction isolation and structure ', expected: 6 }
];
const out = path.resolve(process.argv[2] || 'reports/machinelab-prediction-2026-10-13/new-tests/run-01');
if (fs.existsSync(out)) throw Error('Preserve existing evidence; use a fresh output directory');
fs.mkdirSync(path.join(out, 'test-temp'), { recursive: true });
const write = (name, value) => {
  const target = path.join(out, name), temp = target + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n'); fs.renameSync(temp, target);
};
const sourceSha256 = hash(source), testSha256 = hash(file), helperSha256 = hash(helper), runnerSha256 = hash(__filename);
if (sourceSha256 !== FROZEN || hash(mirror) !== FROZEN) throw Error('Source or mirror is not the reviewed candidate');
fs.copyFileSync(__filename, path.join(out, 'runner-at-run.cjs'));
fs.copyFileSync(file, path.join(out, 'test-at-run.js'));
const manifest = { format: 'machine-lab-new-prediction-native-processes-v1', sourceSha256, testSha256, helperSha256, runnerSha256,
  file, nodeHeapMiB: 512, nodeSemiSpaceMiB: 8, workers: 1, pool: 'forks', isolate: false, testTimeoutMs: 30000, childTimeoutMs: 120000, runs: [] };
const verifyInputs = () => { if (hash(source) !== FROZEN || hash(mirror) !== FROZEN || hash(file) !== testSha256 || hash(helper) !== helperSha256) throw Error('Frozen inputs changed'); };
async function runChild(args, log) {
  const logPath = path.join(out, log), fd = fs.openSync(logPath, 'wx');
  let error, timedOut = false;
  return new Promise(resolve => {
    const child = cp.spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512 --max-semi-space-size=8', TEMP: path.join(out, 'test-temp'), TMP: path.join(out, 'test-temp') } });
    const timer = setTimeout(() => {
      timedOut = true; fs.writeSync(fd, '\nNative child exceeded 120000 ms; terminating this child process tree.\n');
      if (process.platform === 'win32' && child.pid) cp.spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else child.kill('SIGKILL');
    }, 120000);
    child.stdout.on('data', chunk => fs.writeSync(fd, chunk)); child.stderr.on('data', chunk => fs.writeSync(fd, chunk));
    child.on('error', e => { error = String(e); fs.writeSync(fd, '\n' + error + '\n'); });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer); fs.closeSync(fd);
      const normalized = fs.readFileSync(logPath, 'utf8').replace(/\r\n/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n';
      fs.writeFileSync(logPath, normalized); resolve({ exitCode, signal, error: error || null, timedOut });
    });
  });
}
async function main() {
  let names, counts;
  for (let index = 0; index < groups.length; index++) {
    verifyInputs(); const group = groups[index], stem = 'group-' + String(index + 1).padStart(2, '0');
    const receipt = stem + '.json', log = stem + '.log';
    const args = ['node_modules/vitest/vitest.mjs', 'run', file, '--maxWorkers=1', '--pool=forks', '--no-isolate', '--testTimeout=30000',
      '--reporter=default', '--reporter=json', '--outputFile', path.join(out, receipt), '--testNamePattern', group.pattern];
    const record = { file, pattern: group.pattern, expected: group.expected, command: [process.execPath, ...args], receipt, log,
      startedAt: new Date().toISOString(), sourceSha256: hash(source), mirrorBeforeSha256: hash(mirror), testSha256: hash(file), status: 'running' };
    manifest.runs.push(record); write('processes.json', manifest);
    Object.assign(record, await runChild(args, log), { finishedAt: new Date().toISOString(), sourceAfterSha256: hash(source),
      mirrorAfterSha256: hash(mirror), testAfterSha256: hash(file), logSha256: hash(path.join(out, log)), status: 'completed' });
    if (fs.existsSync(path.join(out, receipt))) record.receiptSha256 = hash(path.join(out, receipt));
    write('processes.json', manifest);
    if (record.exitCode !== 0 || record.error || record.timedOut) throw Error('Native child failed: ' + stem + ' exit ' + record.exitCode);
    verifyInputs(); const report = read(path.join(out, receipt));
    if (!report.success || report.numFailedTests || report.numPassedTests !== group.expected || report.testResults.length !== 1) throw Error('Unexpected native receipt: ' + stem);
    const tests = report.testResults[0].assertionResults;
    if (!names) { names = tests.map(a => a.fullName); counts = tests.map(() => 0); }
    if (tests.length !== names.length || tests.some((a, i) => a.fullName !== names[i])) throw Error('Native assertion inventory changed');
    tests.forEach((test, i) => {
      if (test.status === 'passed') counts[i]++;
      else if (!['pending', 'skipped'].includes(test.status)) throw Error('Unresolved assertion: ' + test.fullName);
    });
    record.passed = report.numPassedTests; write('processes.json', manifest);
    console.log(stem + ': ' + record.passed + ' passed; observed native exit ' + record.exitCode);
  }
  verifyInputs();
  if (names.length !== 28 || counts.some(n => n !== 1) || manifest.runs.length !== 5) throw Error('Incomplete or duplicate native coverage');
  write('inventory.json', { file, sha256: testSha256, assertions: names.map((fullName, index) => ({ index, fullName, executedPassCount: counts[index] })) });
  write('final.json', { format: 'machine-lab-new-prediction-coverage-v1', sourceSha256: FROZEN, publicMirrorSha256: hash(mirror),
    file, testSha256, helper, helperSha256, passed: 28, failed: 0, uncovered: 0, nativeProcesses: 5, inventory: { path: 'inventory.json', sha256: hash(path.join(out, 'inventory.json')) },
    processManifest: { path: 'processes.json', sha256: hash(path.join(out, 'processes.json')) },
    receipts: manifest.runs.map(r => ({ path: r.receipt, sha256: r.receiptSha256, passed: r.passed, observedExitCode: r.exitCode })) });
  console.log(JSON.stringify({ passed: 28, nativeProcesses: 5, sourceSha256: FROZEN, out }));
}
main().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
