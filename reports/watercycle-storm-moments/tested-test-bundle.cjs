const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const scratch = 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-7';
const dir = 'reports/watercycle-storm-moments';
const sourcePath = 'stem_lab/stem_tool_watercycle.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const testPath = 'tests/watercycle_storm_moments.test.js';
const expected = process.argv[2];
const closurePaths = process.argv.slice(3);
if (!/^[a-f0-9]{64}$/.test(expected || '') || closurePaths.length < 2 || new Set(closurePaths).size !== closurePaths.length) throw new Error('Require final hash and every distinct closed baseline, primary and supplemental browser report path');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => fs.readFileSync(path.join(repo, relative));
const write = (relative, value) => fs.writeFileSync(path.join(repo, relative), JSON.stringify(value, null, 2) + '\n');
const pin = relative => { const bytes = read(relative); return { path: relative, sha256: hash(bytes), bytes: bytes.length }; };
const auditScriptPath = path.resolve(__dirname).toLowerCase() === path.resolve(repo, dir).toLowerCase()
  ? path.join(__dirname, 'tested-read-audit.cjs') : path.join(scratch, 'storm-moments-read-audit.cjs');
const recipeSources = [
  { path: dir + '/tested-test-bundle.cjs', executionPath: __filename },
  { path: dir + '/tested-read-audit.cjs', executionPath: auditScriptPath },
];
const executedRecipes = recipeSources.map(item => {
  const bytes = fs.readFileSync(item.executionPath);
  fs.writeFileSync(path.join(repo, item.path), bytes);
  return { ...item, sha256: hash(bytes), bytes: bytes.length };
});
const progressPath = path.join(scratch, 'storm-moments-test-progress.json');
const state = { pid: process.pid, activeChildPid: null, expectedRuntimeSha256: expected,
  startedAt: new Date().toISOString(), status: 'starting', stage: 'preparing', results: [] };
function update(patch) { Object.assign(state, patch, { updatedAt: new Date().toISOString() }); fs.writeFileSync(progressPath, JSON.stringify(state, null, 2) + '\n'); }
function closureEvidence() {
  return closurePaths.map(relative => {
    const report = JSON.parse(read(relative));
    const sourceSha256 = report.sourceSha256;
    const publicSha256 = report.publicSha256 || report.publicHostSha256;
    const historical = report.mode !== 'baseline' && relative !== dir + '/browser-results.json';
    const reviewedHistoricalHashes = ['f0ae2910497c3434623753a59fbeab46f7d1409858f7f15052c1947de6766446', '23a990788cde75820339dc70520239ecec868c18dd6bb84e09d780b8c3c95f04', '31371fb650d90e35e1ba61735f865f7e05b8a4847d6edce3fb9ab6ec4cd42fa4', '55700c6d618510dd60001c83bd69e8c600984ab59cf32410533e9b5b73be05b6', expected];
    const wanted = historical ? sourceSha256 : report.mode === 'baseline' ? '3677bd11a38cd0f20ff4fd6dfb3808384bda0cbae4b3ebec254a1beb8476405d' : expected;
    if (!relative.startsWith(dir + '/') || !relative.endsWith('-results.json') || historical && !reviewedHistoricalHashes.includes(wanted)) throw new Error('Unknown closed browser report: ' + relative);
    const frozenRuntime = pin(relative.replace(/-results\.json$/, '-tested-runtime.js'));
    if (frozenRuntime.sha256 !== wanted || !['baseline','browser-preflight','browser'].includes(report.mode)) throw new Error('Closed-browser snapshot mismatch: ' + relative);
    if (frozenRuntime.bytes !== report.sourceBytes || report.loadedRuntimeSha256 && report.loadedRuntimeSha256 !== wanted || report.loadedRuntimeBytes && report.loadedRuntimeBytes !== frozenRuntime.bytes) throw new Error('Closed-browser byte/load pin mismatch: ' + relative);
    if (report.completed !== true || !historical && report.successful !== true || report.resourcesClosed !== true || report.browserClosed !== true ||
        !report.browserClosedAt || !Number.isFinite(Date.parse(report.browserClosedAt)) || sourceSha256 !== wanted ||
        (report.publicSha256 && report.publicHostSha256 && report.publicSha256 !== report.publicHostSha256) ||
        (publicSha256 !== wanted) ||
        report.serverClosed !== true || (report.serverUsed !== false && !Number.isFinite(Date.parse(report.serverClosedAt))) ||
        (report.serverClosedAt !== null && !Number.isFinite(Date.parse(report.serverClosedAt)))) throw new Error('Browser evidence is not complete/closed/final: ' + relative);
    return { ...pin(relative), mode: report.mode, sourceSha256, publicSha256, successful: report.successful, historical, frozenRuntime,
      publicHashField: report.publicSha256 ? 'publicSha256' : 'publicHostSha256',
      browserClosedAt: report.browserClosedAt, resourcesClosed: report.resourcesClosed,
      serverUsed: report.serverUsed, serverClosed: report.serverClosed, serverClosedAt: report.serverClosedAt };
  });
}
function preservation() {
  const text = read(testPath).toString('utf8');
  const fragment = text.slice(text.indexOf('const SOURCE_PATH ='), text.indexOf('const loadedAt ='))
    .replace('export const waterCycleStormMomentsVerification', 'const waterCycleStormMomentsVerification');
  const api = vm.runInNewContext(fragment + '\nwaterCycleStormMomentsVerification;',
    { parse: require(path.join(repo, 'node_modules/acorn')).parse, createHash: crypto.createHash }, { timeout: 10000 });
  if (hash(read(api.baselinePath)) !== api.baselineSha) throw new Error('Baseline changed');
  const baseline = api.productionNodes(read(api.baselinePath).toString('utf8'));
  if (Object.keys(baseline).length !== api.preservedNames.length || api.preservedNames.some(name => !baseline[name])) throw new Error('Missing baseline anchor');
  for (const relative of [sourcePath, publicPath]) {
    const current = api.productionNodes(read(relative).toString('utf8'));
    for (const name of api.preservedNames) if (current[name] !== baseline[name]) throw new Error('Preservation mismatch: ' + relative + ': ' + name);
  }
  const rewards = api.scoredNodes(read(api.baselinePath).toString('utf8'));
  if (Object.keys(rewards).sort().join(',') !== 'myth,quiz') throw new Error('Missing quiz/myth reward anchor');
  for (const relative of [sourcePath, publicPath]) {
    if (JSON.stringify(api.scoredNodes(read(relative).toString('utf8'))) !== JSON.stringify(rewards)) throw new Error('Scored preservation mismatch: ' + relative);
  }
  const baselineText = read(api.baselinePath).toString('utf8');
  const kernel = api.kernelExport(baselineText), timeline = api.timelineNodes(baselineText);
  if (timeline.length !== 5) throw new Error('Missing original live timeline callbacks');
  for (const relative of [sourcePath, publicPath]) {
    const text = read(relative).toString('utf8');
    if (api.kernelExport(text) !== kernel || JSON.stringify(api.timelineNodes(text)) !== JSON.stringify(timeline)) throw new Error('Kernel/timeline preservation mismatch: ' + relative);
  }
  return { baselinePath: api.baselinePath, baselineSha256: api.baselineSha,
    kernelExportSha256: hash(kernel), timelineAnchors: timeline.map((value, index) => ({ index, sha256: hash(value) })),
    anchors: api.preservedNames.map(name => ({ name, sha256: hash(baseline[name]) })),
    scoredAnchors: Object.entries(rewards).map(([name, value]) => ({ name, sha256: hash(value) })) };
}
async function run(mode) {
  const files = mode === 'unit' ? [testPath] : ["tests/watercycle_precipitation_lab.test.js","tests/watercycle_storm_experiment.test.js","tests/watercycle_storm_immersion.test.js","tests/watercycle_cloud_evidence.test.js","tests/watercycle_groundwater_lens.test.js"];
  const runtimePins = [sourcePath, publicPath].map(pin), testPins = files.map(pin);
  const recipePins = executedRecipes.map(item => {
    const original = fs.readFileSync(item.executionPath), frozen = pin(item.path);
    if (hash(original) !== item.sha256 || frozen.sha256 !== item.sha256 || frozen.bytes !== item.bytes) throw new Error('Recipe changed before ' + mode);
    return { ...frozen, executionPath: item.executionPath };
  });
  const frozenInputs = mode === 'unit' ? [
    ['reports/watercycle-storm-moments/baseline-runtime.js', '3677bd11a38cd0f20ff4fd6dfb3808384bda0cbae4b3ebec254a1beb8476405d'],
  ] : [
    ['reports/watercycle-cloud-evidence/baseline-runtime.js', 'a0b86ac156e3045c52448226e518ed1ad4acd2b104c491d56efc7c1272b3579c'],
    ['reports/watercycle-steward-history/browser-tested-runtime.js', 'ed26499bf0435d1c613eb7d619e2537bc66ae06798382090ddb262cb20d6a29a'],
  ];
  const fixturePins = frozenInputs.map(([relative, expectedSha256]) => {
    const observed = pin(relative);
    if (observed.sha256 !== expectedSha256) throw new Error('Frozen suite input changed: ' + relative);
    return { ...observed, expectedSha256 };
  });
  if (runtimePins.some(item => item.sha256 !== expected)) throw new Error('Runtime changed before ' + mode);
  const closures = closureEvidence(), preserved = preservation();
  const startedAt = new Date().toISOString();
  if (closures.filter(item => item.mode === 'baseline').length !== 1 || !closures.some(item => item.path === dir + '/browser-results.json' && item.sourceSha256 === expected && item.successful === true)) throw new Error('Require one frozen baseline and candidate closure evidence');
  if (closures.some(item => Date.parse(item.browserClosedAt) > Date.parse(startedAt) || item.serverClosedAt && Date.parse(item.serverClosedAt) > Date.parse(startedAt))) throw new Error('Browser/server closure is after test start');
  const before = { mode, expectedRuntimeSha256: expected, startedAt, runtimeFiles: runtimePins, testFiles: testPins, fixtureFiles: fixturePins,
    closureEvidence: closures, preservation: preserved, recipeFiles: recipePins, singleWorker: true, fileParallelism: false };
  for (const suffix of ['verification-before.json', 'verification-after.json', 'run.log']) {
    const prior = path.join(repo, dir, mode + '-' + suffix);
    if (fs.existsSync(prior)) fs.writeFileSync(path.join(scratch, 'prior-storm-moments-' + Date.now() + '-' + path.basename(prior)), fs.readFileSync(prior));
  }
  write(dir + '/' + mode + '-verification-before.json', before);
  const loadedPath = path.join(repo, dir, mode + '-loaded-runtime.json');
  const output = path.join(repo, dir, mode + '-results.json');
  for (const file of [loadedPath, output]) {
    if (fs.existsSync(file)) {
      const bytes = fs.readFileSync(file);
      fs.writeFileSync(path.join(scratch, 'prior-storm-moments-' + mode + '-' + Date.now() + '-' + path.basename(file)), bytes);
    }
  }
  const auditDir = path.join(scratch, 'storm-moments-read-' + mode + '-' + process.pid + '-' + Date.now());
  fs.mkdirSync(auditDir);
  const env = { ...process.env,
    WATER_STORM_MOMENTS_READ_AUDIT_DIR: auditDir,
    WATER_STORM_MOMENTS_READ_AUDIT_TARGETS: JSON.stringify([...runtimePins, ...testPins, ...fixturePins].map(item => ({ relative: item.path, absolute: path.join(repo, item.path) }))),
    NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --require "' + auditScriptPath.replace(/\\/g, '/') + '"').trim() };
  if (mode === 'unit') env.WATER_CYCLE_STORM_MOMENTS_LOADED_REPORT = loadedPath;
  else env.WATER_CYCLE_CLOUD_EVIDENCE_LOADED_REPORT = loadedPath;
  const runLog = fs.createWriteStream(path.join(repo, dir, mode + '-run.log'));
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repo, 'node_modules/vitest/vitest.mjs'), 'run', ...files,
      '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=120000', '--hookTimeout=120000',
      '--reporter=default', '--reporter=json', '--outputFile=' + output],
    { cwd: repo, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    update({ stage: mode, status: 'running', activeChildPid: child.pid });
    child.stdout.on('data', data => { runLog.write(data); process.stdout.write(data); });
    child.stderr.on('data', data => { runLog.write(data); process.stderr.write(data); });
    child.once('error', reject);
    child.once('close', (exitCode, signal) => { const closedAt = new Date().toISOString(); update({ activeChildPid: null }); runLog.end(() => resolve({ exitCode, signal, pid: child.pid, closedAt })); });
  });
  const completedAt = new Date().toISOString();
  const afterRuntimes = [sourcePath, publicPath].map(pin), afterTests = files.map(pin), afterFixtures = fixturePins.map(item => pin(item.path));
  const loadedFiles = fs.readdirSync(auditDir).filter(file => /^loaded-\d+\.json$/.test(file))
    .flatMap(file => JSON.parse(fs.readFileSync(path.join(auditDir, file), 'utf8')));
  const loaded = fs.existsSync(loadedPath) ? JSON.parse(fs.readFileSync(loadedPath, 'utf8')) : null;
  const after = { ...before, completedAt, processExitCode: code.exitCode, processSignal: code.signal, processPid: code.pid, processClosed: true, processClosedAt: code.closedAt,
    runtimeFilesAfter: afterRuntimes, testFilesAfter: afterTests, fixtureFilesAfter: afterFixtures,
    closureEvidenceAfter: closureEvidence(), recipeFilesAfter: executedRecipes.map(item => ({ ...pin(item.path), executionPath: item.executionPath,
      executionSha256After: hash(fs.readFileSync(item.executionPath)) })), loadedFiles, loadedReport: loaded,
    sourceSha256Before: runtimePins[0].sha256, sourceSha256After: afterRuntimes[0].sha256,
    publicSha256Before: runtimePins[1].sha256, publicSha256After: afterRuntimes[1].sha256 };
  write(dir + '/' + mode + '-verification-after.json', after);
  if (!fs.existsSync(output)) throw new Error('Missing Vitest report for ' + mode);
  const report = JSON.parse(fs.readFileSync(output, 'utf8'));
  report.waterCycleStormMomentsVerification = after;
  write(dir + '/' + mode + '-results.json', report);
  if (JSON.stringify(after.closureEvidenceAfter) !== JSON.stringify(closures)) throw new Error('Closed browser evidence changed during ' + mode);
  if (after.recipeFilesAfter.some((item, index) => item.sha256 !== recipePins[index].sha256 || item.bytes !== recipePins[index].bytes || item.executionSha256After !== recipePins[index].sha256)) throw new Error('Test recipe changed during ' + mode);
  if (afterRuntimes.some(item => item.sha256 !== expected) || afterTests.some((item, index) => item.sha256 !== testPins[index].sha256)) throw new Error('Files changed during ' + mode);
  if (afterFixtures.some((item, index) => item.sha256 !== fixturePins[index].sha256 || item.bytes !== fixturePins[index].bytes)) throw new Error('Frozen inputs changed during ' + mode);
  for (const item of [...runtimePins, ...testPins, ...fixturePins]) {
    const observed = loadedFiles.filter(read => read.path === item.path);
    if (!observed.length || observed.some(read => read.sha256 !== item.sha256 || read.bytes !== item.bytes)) throw new Error('Loaded-file proof missing/mismatch: ' + item.path);
  }
  if (loadedFiles.some(item => !Number.isFinite(Date.parse(item.loadedAt)) || Date.parse(item.loadedAt) < Date.parse(startedAt) || Date.parse(item.loadedAt) > Date.parse(completedAt))) throw new Error('Loaded-file time is outside actual ' + mode + ' run');
  if (!loaded || mode === 'unit' && (!Number.isFinite(Date.parse(loaded.loadedAt)) || !Number.isFinite(Date.parse(loaded.completedAt)) || Date.parse(loaded.loadedAt) < Date.parse(startedAt) || Date.parse(loaded.completedAt) > Date.parse(completedAt)) || loaded.loadedRuntimes.some(item => item.sha256 !== expected)) throw new Error('Helper loaded runtime mismatch');
  const loadedTest = mode === 'unit' ? testPins[0] : testPins.find(item => item.path === 'tests/watercycle_cloud_evidence.test.js');
  if (loaded.loadedTest.sha256 !== loadedTest.sha256) throw new Error('Helper loaded test mismatch');
  const summary = { mode, successful: report.success, tests: report.numTotalTests, passed: report.numPassedTests,
    failed: report.numFailedTests, pending: report.numPendingTests, todo: report.numTodoTests,
    files: files.length, processExitCode: code.exitCode, sourceSha256: expected,
    failures: (report.testResults || []).flatMap(file => (file.assertionResults || []).filter(item => item.status !== 'passed').map(item => ({ name: item.fullName, messages: item.failureMessages }))) };
  console.log(JSON.stringify(summary)); state.results.push(summary); update({});
  if (code.exitCode !== 0 || !report.success || report.numFailedTests || report.numPendingTests || report.numTodoTests) throw new Error(mode + ' tests failed');
}
(async () => {
  update({}); await run('unit'); await run('regression');
  update({ stage: 'complete', status: 'complete', completedAt: new Date().toISOString() });
})().catch(error => { update({ stage: 'failed', status: 'failed', activeChildPid: null, error: error.stack || String(error), completedAt: new Date().toISOString() }); console.error(error.stack || error); process.exitCode = 1; });
