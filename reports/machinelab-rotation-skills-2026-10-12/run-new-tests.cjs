// Run from the repository root. All four native Vitest processes run serially.
// Use a fresh output directory for failed attempts; --resume verifies completed
// receipts and refuses to overwrite incomplete or failed process evidence.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const FROZEN = '727615aa085a7170b435773189f605414f79e6b866983c2489a610be29c6cdd7';
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source;
const file = 'tests/machinelab_rotation_skills.test.js';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const groups = [
  { pattern: '^Machine Lab: independent rotary geometry and visuals ', expected: 13 },
  { pattern: '^Machine Lab: rotary calculation practice ', expected: 27 },
  { pattern: '^Machine Lab: rotary practice state integrity ', expected: 11 },
  { pattern: '^Machine Lab: verifiable rotary records ', expected: 16 }
];
const out = path.resolve(process.argv.slice(2).find(a => a !== '--resume') || 'reports/machinelab-rotation-skills-2026-10-12/new-tests/run-01');
const manifestPath = path.join(out, 'processes.json');
fs.mkdirSync(path.join(out, 'test-temp'), { recursive: true });
const write = (name, value) => {
  const target = path.join(out, name), temp = target + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n'); fs.renameSync(temp, target);
};
const sourceSha256 = hash(source), testSha256 = hash(file), runnerSha256 = hash(__filename);
if (sourceSha256 !== FROZEN || hash(mirror) !== FROZEN) throw Error('Source or mirror is not the reviewed candidate');
const prior = process.argv.includes('--resume') ? read(manifestPath) : null;
if (!prior && fs.existsSync(manifestPath)) throw Error('Use a fresh output directory or --resume');
if (prior && (prior.sourceSha256 !== FROZEN || prior.testSha256 !== testSha256 || prior.runnerSha256 !== runnerSha256)) throw Error('Resume inputs changed');
const manifest = { format: 'machine-lab-new-rotation-skills-native-processes-v1', sourceSha256, testSha256, runnerSha256,
  file, nodeHeapMiB: 512, nodeSemiSpaceMiB: 8, workers: 1, pool: 'forks', isolate: false, testTimeoutMs: 30000, runs: [] };
const verifyInputs = () => { if (hash(source) !== FROZEN || hash(mirror) !== FROZEN || hash(file) !== testSha256) throw Error('Frozen inputs changed'); };
async function runChild(args, log) {
  const logPath = path.join(out, log), fd = fs.openSync(logPath, 'wx');
  let error;
  return new Promise(resolve => {
    const child = cp.spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512 --max-semi-space-size=8', TEMP: path.join(out, 'test-temp'), TMP: path.join(out, 'test-temp') } });
    child.stdout.on('data', chunk => fs.writeSync(fd, chunk)); child.stderr.on('data', chunk => fs.writeSync(fd, chunk));
    child.on('error', e => { error = String(e); fs.writeSync(fd, '\n' + error + '\n'); });
    child.on('close', (exitCode, signal) => {
      fs.closeSync(fd);
      const normalized = fs.readFileSync(logPath, 'utf8').replace(/\r\n/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n';
      fs.writeFileSync(logPath, normalized); resolve({ exitCode, signal, error: error || null });
    });
  });
}
async function main() {
  let names, counts;
  for (let index = 0; index < groups.length; index++) {
    verifyInputs(); const group = groups[index], stem = 'group-' + String(index + 1).padStart(2, '0');
    const receipt = stem + '.json', log = stem + '.log';
    const args = ['node_modules/vitest/vitest.mjs', 'run', file, '--maxWorkers=1', '--pool=forks', '--no-isolate', '--testTimeout=30000',
      '--reporter=json', '--outputFile', path.join(out, receipt), '--testNamePattern', group.pattern];
    const previous = prior && prior.runs[index]; let record;
    if (previous && previous.exitCode === 0 && previous.passed === group.expected) {
      if (previous.pattern !== group.pattern || previous.sourceSha256 !== FROZEN || previous.sourceAfterSha256 !== FROZEN ||
          previous.mirrorAfterSha256 !== FROZEN || previous.testAfterSha256 !== testSha256 ||
          hash(path.join(out, receipt)) !== previous.receiptSha256 || hash(path.join(out, log)) !== previous.logSha256) throw Error('Prior receipt mismatch: ' + stem);
      record = { ...previous }; manifest.runs.push(record);
    } else {
      if (fs.existsSync(path.join(out, receipt)) || fs.existsSync(path.join(out, log))) throw Error('Preserve failed or interrupted evidence before a retry: ' + stem);
      record = { file, pattern: group.pattern, expected: group.expected, command: [process.execPath, ...args], receipt, log,
        startedAt: new Date().toISOString(), sourceSha256: hash(source), mirrorBeforeSha256: hash(mirror), testSha256: hash(file), status: 'running' };
      manifest.runs.push(record); write('processes.json', manifest);
      Object.assign(record, await runChild(args, log), { finishedAt: new Date().toISOString(), sourceAfterSha256: hash(source),
        mirrorAfterSha256: hash(mirror), testAfterSha256: hash(file), logSha256: hash(path.join(out, log)), status: 'completed' });
      if (fs.existsSync(path.join(out, receipt))) record.receiptSha256 = hash(path.join(out, receipt));
      write('processes.json', manifest);
      if (record.exitCode !== 0 || record.error) throw Error('Native child failed: ' + stem + ' exit ' + record.exitCode);
    }
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
  if (names.length !== 67 || counts.some(n => n !== 1) || manifest.runs.length !== 4) throw Error('Incomplete or duplicate native coverage');
  write('inventory.json', { file, sha256: testSha256, assertions: names.map((fullName, index) => ({ index, fullName, executedPassCount: counts[index] })) });
  write('final.json', { format: 'machine-lab-new-rotation-skills-coverage-v1', sourceSha256: FROZEN, publicMirrorSha256: hash(mirror),
    file, testSha256, passed: 67, failed: 0, uncovered: 0, nativeProcesses: 4, inventory: { path: 'inventory.json', sha256: hash(path.join(out, 'inventory.json')) },
    processManifest: { path: 'processes.json', sha256: hash(manifestPath) },
    receipts: manifest.runs.map(r => ({ path: r.receipt, sha256: r.receiptSha256, passed: r.passed, observedExitCode: r.exitCode })) });
  console.log(JSON.stringify({ passed: 67, nativeProcesses: 4, sourceSha256: FROZEN, out }));
}
main().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
