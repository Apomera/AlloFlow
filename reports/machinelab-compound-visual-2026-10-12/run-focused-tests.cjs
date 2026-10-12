// Run from the repository root. Use a fresh output directory, or --resume to
// verify and reuse only completed native runs with unchanged source and tests.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const out = path.resolve(process.argv.slice(2).find(arg => arg !== '--resume') || 'reports/machinelab-compound-visual-2026-10-12');
fs.mkdirSync(path.join(out, 'test-temp'), { recursive: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, data) => fs.writeFileSync(path.join(out, file), JSON.stringify(data, null, 2) + '\n');
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source, sourceSha256 = hash(source);
const runs = [
  ...['physics', 'comparison', 'skills', 'identity', 'records'].map(group => ({ name: 'planning-' + group, file: 'tests/machinelab_compound_planning.test.js', pattern: 'Machine Lab: compound planning ' + group })),
  ...['physics', 'comparison', 'skills', 'identity', 'records'].map(group => ({ name: 'power-' + group, file: 'tests/machinelab_compound_power.test.js', pattern: 'Machine Lab: compound power ' + group })),
  ...[
    ['physics', 'Machine Lab: compound physics'], ['comparison', 'Machine Lab: optional compound comparison'],
    ['grading', 'Machine Lab: compound skill grading'], ['practice', 'Machine Lab: guided compound practice'], ['records', 'Machine Lab: honest saved compound skills']
  ].map(([group, pattern]) => ({ name: 'legacy-' + group, file: 'tests/machinelab_compound_lab.test.js', pattern }))
].map(run => ({ ...run, testSha256: hash(run.file) }));
const manifest = { sourceSha256, nodeHeapMiB: 512, nodeSemiSpaceMiB: 8, workers: 1, pool: 'forks', isolate: false, testTimeoutMs: 30000, runs: [] };
const prior = process.argv.includes('--resume') ? read(path.join(out, 'focused-processes.json')) : null;
if (prior && prior.sourceSha256 !== sourceSha256) throw Error('Cannot resume after a source change');
if (!prior && fs.existsSync(path.join(out, 'focused-processes.json'))) throw Error('Use a fresh output directory or --resume');
const inventories = new Map();
for (let index = 0; index < runs.length; index++) {
  if (hash(source) !== sourceSha256 || hash(mirror) !== sourceSha256) throw Error('Source or mirror changed');
  const run = runs[index], receipt = 'tests-' + run.name + '.json', log = 'tests-' + run.name + '.log', previous = prior && prior.runs[index];
  let record;
  if (previous && previous.exitCode === 0 && previous.passed > 0) {
    if (previous.file !== run.file || previous.pattern !== run.pattern || previous.testSha256 !== run.testSha256 || previous.testAfterSha256 !== run.testSha256 ||
      previous.sourceSha256 !== sourceSha256 || previous.sourceAfterSha256 !== sourceSha256 || previous.mirrorAfterSha256 !== sourceSha256 ||
      previous.receipt !== receipt || hash(path.join(out, receipt)) !== previous.receiptSha256 || hash(path.join(out, log)) !== previous.logSha256)
      throw Error('Prior receipt no longer matches frozen inputs: ' + receipt);
    record = { ...previous };
  } else {
    if (fs.existsSync(path.join(out, receipt)) || fs.existsSync(path.join(out, log))) throw Error('Preserve interrupted/failed files before retrying: ' + receipt);
    const args = ['node_modules/vitest/vitest.mjs', 'run', run.file, '--maxWorkers=1', '--pool=forks', '--no-isolate', '--testTimeout=30000', '--reporter=json', '--outputFile', path.join(out, receipt), '--testNamePattern', run.pattern];
    const result = cp.spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512 --max-semi-space-size=8', TEMP: path.join(out, 'test-temp'), TMP: path.join(out, 'test-temp') } });
    const output = ((result.stdout || '') + '\n' + (result.stderr || '') + (result.error ? '\n' + String(result.error) : '')).replace(/\r\n/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n';
    fs.writeFileSync(path.join(out, log), output);
    record = { ...run, receipt, log, exitCode: result.status, signal: result.signal, sourceSha256, sourceAfterSha256: hash(source), mirrorAfterSha256: hash(mirror), testAfterSha256: hash(run.file), logSha256: hash(path.join(out, log)) };
    if (fs.existsSync(path.join(out, receipt))) record.receiptSha256 = hash(path.join(out, receipt));
    if (result.status !== 0 || result.error) { manifest.runs.push(record); write('focused-processes.json', manifest); throw Error('Native test process failed: ' + run.name + ' exit ' + result.status); }
  }
  manifest.runs.push(record); write('focused-processes.json', manifest);
  if (record.testAfterSha256 !== run.testSha256 || hash(run.file) !== run.testSha256 || hash(source) !== sourceSha256 || hash(mirror) !== sourceSha256) throw Error('Inputs changed during child run');
  const report = read(path.join(out, receipt));
  if (!report.success || report.numFailedTests || report.numPassedTests === 0 || report.testResults.length !== 1) throw Error('Incomplete native receipt: ' + receipt);
  record.passed = report.numPassedTests; record.receiptSha256 = hash(path.join(out, receipt)); write('focused-processes.json', manifest);
  const tests = report.testResults[0].assertionResults;
  if (!inventories.has(run.file)) inventories.set(run.file, { names: tests.map(test => test.fullName), counts: tests.map(() => 0) });
  const inventory = inventories.get(run.file);
  if (tests.length !== inventory.names.length || tests.some((test, i) => test.fullName !== inventory.names[i])) throw Error('Native test inventory changed');
  tests.forEach((test, i) => { if (test.status === 'passed') inventory.counts[i]++; else if (!['pending', 'skipped'].includes(test.status)) throw Error('Unresolved native assertion'); });
  console.log(run.name + ': ' + record.passed + ' passed; observed exit ' + record.exitCode + (previous ? ' (verified prior run)' : ''));
}
const coverage = [...inventories].map(([file, inventory]) => {
  if (inventory.counts.some(count => count !== 1)) throw Error('Missing or duplicated executed cases: ' + file);
  return { file, sha256: hash(file), passed: inventory.counts.length };
});
const expected = { 'tests/machinelab_compound_planning.test.js': 159, 'tests/machinelab_compound_power.test.js': 156, 'tests/machinelab_compound_lab.test.js': 223 };
for (const file of coverage) if (file.passed !== expected[file.file]) throw Error('Unexpected inventory size: ' + file.file + ' ' + file.passed);
const passed = coverage.reduce((sum, file) => sum + file.passed, 0);
if (passed !== 538 || coverage.length !== 3 || manifest.runs.length !== 15) throw Error('Unexpected aggregate coverage');
write('focused-final.json', { format: 'machine-lab-independent-run-coverage-v1', sourceSha256, passed, failed: 0, uncovered: 0, files: coverage.length, nativeReceipts: manifest.runs.length,
  description: 'Fresh serial native processes. Filtered pending cases count only in the group that executes them; every stable inventory position passed exactly once.', coverage,
  receipts: manifest.runs.map(run => ({ receipt: run.receipt, sha256: run.receiptSha256, passed: run.passed })), processManifest: 'focused-processes.json' });
console.log(JSON.stringify({ passed, files: coverage.length, processes: manifest.runs.length, sourceSha256 }));
