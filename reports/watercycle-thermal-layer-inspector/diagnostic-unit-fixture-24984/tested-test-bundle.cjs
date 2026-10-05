const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const { spawn } = require('node:child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const scratch = 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-7';
const dir = 'reports/watercycle-thermal-layer-inspector';
const sourcePath = 'stem_lab/stem_tool_watercycle.js', publicPath = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const testPath = 'tests/watercycle_thermal_layer_inspector.test.js';
const expected = process.argv[2];
if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Require the frozen final runtime SHA256');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const write = (relative, value) => fs.writeFileSync(path.join(repo, relative), JSON.stringify(value, null, 2) + '\n');
const pin = relative => { const bytes = read(relative); return { path: relative, sha256: hash(bytes), bytes: bytes.length }; };
const auditScriptPath = path.resolve(__dirname).toLowerCase() === path.resolve(repo, dir).toLowerCase()
  ? path.join(__dirname, 'tested-read-audit.cjs') : path.join(scratch, 'thermal-layer-read-audit.cjs');
const recipes = [
  { path: dir + '/tested-test-bundle.cjs', executionPath: __filename },
  { path: dir + '/tested-read-audit.cjs', executionPath: auditScriptPath },
].map(item => { const bytes = fs.readFileSync(item.executionPath); fs.writeFileSync(path.join(repo, item.path), bytes); return { ...item, sha256: hash(bytes), bytes: bytes.length }; });
const progressPath = path.join(scratch, 'thermal-layer-test-progress.json');
const state = { pid: process.pid, activeChildPid: null, expectedRuntimeSha256: expected, startedAt: new Date().toISOString(), status: 'starting', stage: 'preparing', results: [] };
function update(patch) { Object.assign(state, patch, { updatedAt: new Date().toISOString() }); fs.writeFileSync(progressPath, JSON.stringify(state, null, 2) + '\n'); }
function closures() {
  return ['baseline', 'browser-preflight', 'browser'].map(mode => {
    const relative = dir + '/' + mode + '-results.json', report = JSON.parse(read(relative)), frozen = pin(dir + '/' + mode + '-tested-runtime.js');
    const wanted = mode === 'baseline' ? 'd68b832b562d75b4f12eddf0638187eabd27ccf92b0f1ddaa787442566b44603'
      : mode === 'browser-preflight' ? '129f53f2e028efd743ffcc205ea6d9b44c6c96a4f815f924b9020ab3ef78ae08' : expected;
    if (report.mode !== mode || report.completed !== true || report.browserClosed !== true || report.resourcesClosed !== true ||
        report.serverUsed !== false || report.serverClosed !== true || report.serverClosedAt !== null || !Number.isFinite(Date.parse(report.browserClosedAt)) ||
        mode === 'browser' && report.successful !== true || report.sourceSha256 !== wanted || report.publicHostSha256 !== wanted ||
        report.loadedRuntimeSha256 !== wanted || report.loadedRuntimeBytes !== frozen.bytes || report.sourceBytes !== frozen.bytes || frozen.sha256 !== wanted) throw new Error('Browser closure/runtime mismatch: ' + relative);
    return { ...pin(relative), mode, sourceSha256: wanted, publicSha256: report.publicHostSha256, frozenRuntime: frozen,
      browserClosedAt: report.browserClosedAt, resourcesClosed: true, serverUsed: false, serverClosed: true, serverClosedAt: null };
  });
}
function preservation() {
  const text = read(testPath).toString('utf8'), fragment = text.slice(text.indexOf('const SOURCE_PATH ='), text.indexOf('const loadedAt ='));
  const api = vm.runInNewContext(fragment + '\n({ baselinePath: BASELINE_PATH, baselineSha: BASELINE_SHA, preservedNames: PRESERVED, exactDeclarations, kernelAssignment });',
    { parse: require(path.join(repo, 'node_modules/acorn')).parse, createHash: crypto.createHash }, { timeout: 10000 });
  if (hash(read(api.baselinePath)) !== api.baselineSha) throw new Error('Frozen baseline changed');
  const baseline = api.exactDeclarations(read(api.baselinePath).toString('utf8')), kernel = api.kernelAssignment(read(api.baselinePath).toString('utf8'));
  if (Object.keys(baseline).length !== api.preservedNames.length || api.preservedNames.some(name => !baseline[name])) throw new Error('Missing original anchor');
  for (const relative of [sourcePath, publicPath]) {
    const current = api.exactDeclarations(read(relative).toString('utf8'));
    for (const name of api.preservedNames) if (current[name] !== baseline[name]) throw new Error('Preservation mismatch: ' + name);
    if (api.kernelAssignment(read(relative).toString('utf8')) !== kernel) throw new Error('Public kernel changed');
  }
  return { baselinePath: api.baselinePath, baselineSha256: api.baselineSha, kernelExportSha256: hash(kernel), anchors: api.preservedNames.map(name => ({ name, sha256: hash(baseline[name]) })) };
}
async function run(mode) {
  const files = mode === 'unit' ? [testPath] : [
    'tests/watercycle_precipitation_lab.test.js', 'tests/watercycle_sleet_vs_freezing_rain.test.js',
    'tests/watercycle_storm_experiment.test.js', 'tests/watercycle_storm_immersion.test.js', 'tests/watercycle_storm_moments.test.js',
  ];
  const runtimes = [sourcePath, publicPath].map(pin), tests = files.map(pin);
  const fixturePins = mode === 'unit' ? [pin(dir + '/baseline-runtime.js')] : [pin('reports/watercycle-storm-moments/baseline-runtime.js')];
  const fixtureExpected = mode === 'unit' ? 'd68b832b562d75b4f12eddf0638187eabd27ccf92b0f1ddaa787442566b44603' : '3677bd11a38cd0f20ff4fd6dfb3808384bda0cbae4b3ebec254a1beb8476405d';
  if (fixturePins.some(item => item.sha256 !== fixtureExpected) || runtimes.some(item => item.sha256 !== expected)) throw new Error('Frozen runtime or fixture changed');
  const recipePins = recipes.map(item => {
    const copied = pin(item.path);
    if (copied.sha256 !== item.sha256 || hash(fs.readFileSync(item.executionPath)) !== item.sha256) throw new Error('Recipe changed');
    return { ...copied, executionPath: item.executionPath };
  });
  const closed = closures(), preserved = preservation(), startedAt = new Date().toISOString();
  if (closed.some(item => Date.parse(item.browserClosedAt) > Date.parse(startedAt))) throw new Error('Browser closure follows test start');
  const before = { mode, runnerPid: process.pid, expectedRuntimeSha256: expected, startedAt, runtimeFiles: runtimes, testFiles: tests,
    fixtureFiles: fixturePins, recipeFiles: recipePins, closureEvidence: closed, preservation: preserved, singleWorker: true, fileParallelism: false };
  write(dir + '/' + mode + '-verification-before.json', before);
  const output = path.join(repo, dir, mode + '-results.json'), loadedPath = path.join(repo, dir, mode + '-loaded-runtime.json');
  const auditDir = path.join(scratch, 'thermal-layer-read-' + mode + '-' + process.pid + '-' + Date.now()); fs.mkdirSync(auditDir);
  const env = { ...process.env, WATER_THERMAL_LAYER_READ_AUDIT_DIR: auditDir,
    WATER_THERMAL_LAYER_READ_AUDIT_TARGETS: JSON.stringify([...runtimes, ...tests, ...fixturePins].map(item => ({ relative: item.path, absolute: path.join(repo, item.path) }))),
    NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --require "' + auditScriptPath.replace(/\\/g, '/') + '"').trim() };
  if (mode === 'unit') env.WATER_CYCLE_THERMAL_LAYER_LOADED_REPORT = loadedPath;
  else env.WATER_CYCLE_STORM_MOMENTS_LOADED_REPORT = loadedPath;
  const runLog = fs.createWriteStream(path.join(repo, dir, mode + '-run.log'));
  const completion = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repo, 'node_modules/vitest/vitest.mjs'), 'run', ...files,
      '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=120000', '--hookTimeout=120000',
      '--reporter=default', '--reporter=json', '--outputFile=' + output], { cwd: repo, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    update({ stage: mode, status: 'running', activeChildPid: child.pid });
    child.stdout.on('data', data => { runLog.write(data); process.stdout.write(data); });
    child.stderr.on('data', data => { runLog.write(data); process.stderr.write(data); });
    child.once('error', reject);
    child.once('close', (exitCode, signal) => { const closedAt = new Date().toISOString(); update({ activeChildPid: null }); runLog.end(() => resolve({ exitCode, signal, pid: child.pid, closedAt })); });
  });
  const completedAt = new Date().toISOString(), runtimeFilesAfter = [sourcePath, publicPath].map(pin), testFilesAfter = files.map(pin), fixtureFilesAfter = fixturePins.map(item => pin(item.path));
  const loadedFiles = fs.readdirSync(auditDir).filter(file => /^loaded-\d+\.json$/.test(file)).flatMap(file => JSON.parse(fs.readFileSync(path.join(auditDir, file), 'utf8')));
  const loaded = fs.existsSync(loadedPath) ? JSON.parse(fs.readFileSync(loadedPath, 'utf8')) : null;
  const after = { ...before, completedAt, processPid: completion.pid, processExitCode: completion.exitCode, processSignal: completion.signal,
    processClosed: true, processClosedAt: completion.closedAt, runtimeFilesAfter, testFilesAfter, fixtureFilesAfter, loadedFiles, loadedReport: loaded,
    closureEvidenceAfter: closures(), recipeFilesAfter: recipes.map(item => ({ ...pin(item.path), executionPath: item.executionPath, executionSha256After: hash(fs.readFileSync(item.executionPath)) })) };
  write(dir + '/' + mode + '-verification-after.json', after);
  if (!fs.existsSync(output)) throw new Error('No Vitest raw report');
  const report = JSON.parse(fs.readFileSync(output, 'utf8')); report.waterCycleThermalLayerVerification = after; write(dir + '/' + mode + '-results.json', report);
  if (JSON.stringify(closed) !== JSON.stringify(after.closureEvidenceAfter)) throw new Error('Browser evidence changed');
  for (const [prior, current] of [[runtimes, runtimeFilesAfter], [tests, testFilesAfter], [fixturePins, fixtureFilesAfter]]) {
    if (prior.some((item, index) => item.sha256 !== current[index].sha256 || item.bytes !== current[index].bytes)) throw new Error('Inputs changed during tests');
  }
  for (const input of [...runtimes, ...tests, ...fixturePins]) {
    const observed = loadedFiles.filter(item => item.path === input.path);
    if (!observed.length || observed.some(item => item.sha256 !== input.sha256 || item.bytes !== input.bytes)) throw new Error('Actual read mismatch: ' + input.path);
  }
  if (loadedFiles.some(item => !Number.isFinite(Date.parse(item.loadedAt)) || Date.parse(item.loadedAt) < Date.parse(startedAt) || Date.parse(item.loadedAt) > Date.parse(completedAt))) throw new Error('Actual read time outside process');
  const expectedLoadedTest = mode === 'unit' ? tests[0] : tests.find(item => item.path === 'tests/watercycle_storm_moments.test.js');
  if (!loaded || loaded.loadedRuntimes.some(item => item.sha256 !== expected) || loaded.loadedTest.sha256 !== expectedLoadedTest.sha256 ||
      Date.parse(loaded.loadedAt) < Date.parse(startedAt) || Date.parse(loaded.completedAt) > Date.parse(completedAt)) throw new Error('Custom actual-loaded receipt mismatch');
  if (after.recipeFilesAfter.some((item, index) => item.sha256 !== recipePins[index].sha256 || item.executionSha256After !== recipePins[index].sha256)) throw new Error('Recipe changed during tests');
  const summary = { mode, successful: report.success, tests: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests,
    pending: report.numPendingTests, todo: report.numTodoTests, files: files.length, processExitCode: completion.exitCode, processPid: completion.pid,
    processClosedAt: completion.closedAt, sourceSha256: expected, failures: report.testResults.flatMap(file => file.assertionResults.filter(item => item.status !== 'passed').map(item => ({ name: item.fullName, messages: item.failureMessages }))) };
  state.results.push(summary); update({}); console.log(JSON.stringify(summary));
  if (completion.exitCode !== 0 || !report.success || report.numFailedTests || report.numPendingTests || report.numTodoTests) throw new Error(mode + ' tests failed');
}
(async () => { update({}); await run('unit'); await run('regression'); update({ stage: 'complete', status: 'complete', completedAt: new Date().toISOString() }); })()
  .catch(error => { update({ stage: 'failed', status: 'failed', activeChildPid: null, error: error.stack || String(error), completedAt: new Date().toISOString() }); console.error(error.stack || error); process.exitCode = 1; });
