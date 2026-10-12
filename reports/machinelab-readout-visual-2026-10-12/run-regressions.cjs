// Run from the repository root after the reviewed source SHA is frozen.
// Three native processes execute serially. Existing evidence is never overwritten.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const FROZEN = 'd9a463bab0000a52be4d585de4ecf45ae6ed894dd5b4fbff49027f2b39fc6735';
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source;
const files = [
  { file: 'tests/machinelab_grade_bands.test.js', expected: 37, testSha256: 'c9ca6bc0aa0796f41467b3af1bcc928b729c0cc8790a2a2cffc21d82d5bfd5b4' },
  { file: 'tests/machinelab_a11y.test.js', expected: 28, testSha256: 'b28748e3b3606bca2461c4fc323b8405eac6b5dd491a2b3c466255eed6a772a3' },
  { file: 'tests/machinelab_i18n_hygiene.test.js', expected: 8, testSha256: 'bb94c2dfae94226e2bff99fdff3370480438ee538d76c5ef480470af8374a6ad' }
];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const out = path.resolve(process.argv[2] || 'reports/machinelab-readout-visual-2026-10-12/native/run-01');
const verifyInputs = () => {
  if (hash(source) !== FROZEN || hash(mirror) !== FROZEN) throw Error('Source or mirror is not the frozen candidate');
  for (const item of files) if (hash(item.file) !== item.testSha256) throw Error('Existing regression changed: ' + item.file);
};
verifyInputs();
if (fs.existsSync(path.join(out, 'regression-processes.json'))) throw Error('Preserve existing evidence and provide a fresh output directory');
fs.mkdirSync(path.join(out, 'test-temp'), { recursive: true });
const write = (name, data) => {
  const target = path.join(out, name), temp = target + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n'); fs.renameSync(temp, target);
};
const manifest = { format: 'machine-lab-readout-native-processes-v1', sourceSha256: FROZEN, runnerSha256: hash(__filename),
  nodeHeapMiB: 512, nodeSemiSpaceMiB: 8, workers: 1, pool: 'forks', isolate: false, testTimeoutMs: 30000, runs: [] };
async function child(args, log) {
  const logPath = path.join(out, log), fd = fs.openSync(logPath, 'wx'); let error;
  return new Promise(resolve => {
    const nativeChild = cp.spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512 --max-semi-space-size=8', TEMP: path.join(out, 'test-temp'), TMP: path.join(out, 'test-temp') } });
    nativeChild.stdout.on('data', data => fs.writeSync(fd, data)); nativeChild.stderr.on('data', data => fs.writeSync(fd, data));
    nativeChild.on('error', reason => { error = String(reason); fs.writeSync(fd, '\n' + error + '\n'); });
    nativeChild.on('close', (exitCode, signal) => {
      fs.closeSync(fd);
      const normalized = fs.readFileSync(logPath, 'utf8').replace(/\r\n/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n';
      fs.writeFileSync(logPath, normalized); resolve({ exitCode, signal, error: error || null });
    });
  });
}
async function main() {
  const inventory = [];
  for (let index = 0; index < files.length; index++) {
    verifyInputs(); const item = files[index], stem = 'regression-' + String(index + 1).padStart(2, '0'), receipt = stem + '.json', log = stem + '.log';
    if (fs.existsSync(path.join(out, receipt)) || fs.existsSync(path.join(out, log))) throw Error('Evidence already exists: ' + stem);
    const args = ['node_modules/vitest/vitest.mjs', 'run', item.file, '--maxWorkers=1', '--pool=forks', '--no-isolate', '--testTimeout=30000',
      '--reporter=json', '--outputFile', path.join(out, receipt)];
    const record = { ...item, pattern: null, command: [process.execPath, ...args], receipt, log, startedAt: new Date().toISOString(), status: 'running',
      sourceSha256: hash(source), mirrorBeforeSha256: hash(mirror) };
    manifest.runs.push(record); write('regression-processes.json', manifest);
    Object.assign(record, await child(args, log), { finishedAt: new Date().toISOString(), status: 'completed', sourceAfterSha256: hash(source),
      mirrorAfterSha256: hash(mirror), testAfterSha256: hash(item.file), logSha256: hash(path.join(out, log)) });
    if (fs.existsSync(path.join(out, receipt))) record.receiptSha256 = hash(path.join(out, receipt));
    write('regression-processes.json', manifest);
    if (record.exitCode !== 0 || record.error || record.signal) throw Error('Native child failed: ' + stem + ' exit ' + record.exitCode);
    verifyInputs(); const report = read(path.join(out, receipt));
    if (!report.success || report.numFailedTests || report.numPassedTests !== item.expected || report.testResults.length !== 1) throw Error('Incomplete receipt: ' + stem);
    const assertions = report.testResults[0].assertionResults;
    if (assertions.length !== item.expected || assertions.some(test => test.status !== 'passed')) throw Error('Skipped or unresolved regression: ' + stem);
    inventory.push({ file: item.file, sha256: item.testSha256, assertions: assertions.map((test, index) => ({ index, fullName: test.fullName, executedPassCount: 1 })) });
    record.passed = report.numPassedTests; write('regression-processes.json', manifest);
    console.log(stem + ': ' + record.passed + ' passed; observed native exit ' + record.exitCode);
  }
  verifyInputs();
  const passed = inventory.reduce((sum, item) => sum + item.assertions.length, 0);
  if (passed !== 73 || inventory.length !== 3 || manifest.runs.length !== 3) throw Error('Incomplete coverage');
  write('regression-inventory.json', { format: 'machine-lab-readout-native-inventory-v1', files: inventory });
  write('regression-final.json', { format: 'machine-lab-independent-run-coverage-v1', sourceSha256: FROZEN, publicMirrorSha256: hash(mirror),
    runnerSha256: manifest.runnerSha256, passed, failed: 0, uncovered: 0, files: inventory.length, nativeReceipts: manifest.runs.length,
    coverage: inventory.map(item => ({ file: item.file, sha256: item.sha256, passed: item.assertions.length })),
    inventory: { path: 'regression-inventory.json', sha256: hash(path.join(out, 'regression-inventory.json')) },
    receipts: manifest.runs.map(run => ({ receipt: run.receipt, sha256: run.receiptSha256, passed: run.passed, observedExitCode: run.exitCode })),
    processManifest: 'regression-processes.json', processManifestSha256: hash(path.join(out, 'regression-processes.json')) });
  console.log(JSON.stringify({ passed, files: inventory.length, processes: manifest.runs.length, sourceSha256: FROZEN, out }));
}
main().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
