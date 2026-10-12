// Run from repository root after all native processes finish and images are inspected.
// This verifier never reruns tests or the browser and never removes earlier attempts.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const crypto = require('crypto'), assert = require('assert');
const out = 'reports/machinelab-efficiency-envelope-2026-10-12';
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source;
const frozen = 'e10d476980428471e6ddd5d31f193da4d071f259d10cca7a275f8e34ae126b0c';
const expected = { existing: 473, existingFiles: 8, existingProcesses: 21, added: 96, addedProcesses: 5 };
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, data) => fs.writeFileSync(out + '/' + file, JSON.stringify(data, null, 2) + '\n');
const artifact = file => ({ path: file, sha256: hash(file), bytes: fs.statSync(file).size });
assert.equal(hash(source), frozen, 'Canonical source changed');
assert.equal(hash(mirror), frozen, 'Public mirror changed');

function nativeRuns(runs, directory) {
  const inventories = new Map(), receiptNames = new Set();
  for (const run of runs) {
    assert.equal(run.exitCode, 0, run.receipt + ': child exit');
    assert.equal(run.signal, null, run.receipt + ': signal');
    assert(!run.error, run.receipt + ': child error');
    for (const field of ['sourceSha256', 'sourceAfterSha256', 'mirrorAfterSha256']) assert.equal(run[field], frozen, field);
    if ('mirrorBeforeSha256' in run) assert.equal(run.mirrorBeforeSha256, frozen);
    assert.equal(hash(run.file), run.testSha256, run.file + ': current test differs');
    assert.equal(run.testAfterSha256, run.testSha256);
    assert(!receiptNames.has(run.receipt), 'Duplicate process receipt: ' + run.receipt);
    receiptNames.add(run.receipt);
    assert.equal(hash(directory + '/' + run.receipt), run.receiptSha256);
    assert.equal(hash(directory + '/' + run.log), run.logSha256);
    const native = read(directory + '/' + run.receipt);
    assert.equal(native.success, true); assert.equal(native.numFailedTests, 0);
    assert.equal(native.numPassedTests, run.passed); assert.equal(native.testResults.length, 1);
    assert(Number.isInteger(run.passed) && run.passed > 0);
    if ('expected' in run) assert.equal(run.passed, run.expected);
    const tests = native.testResults[0].assertionResults;
    if (!inventories.has(run.file)) inventories.set(run.file, { names: tests.map(test => test.fullName), counts: tests.map(() => 0) });
    const inventory = inventories.get(run.file);
    assert.deepEqual(tests.map(test => test.fullName), inventory.names, run.file + ': unstable inventory');
    tests.forEach((test, index) => {
      if (test.status === 'passed') inventory.counts[index]++;
      else assert(['pending', 'skipped'].includes(test.status), run.receipt + ': unresolved assertion');
    });
    assert.equal(tests.filter(test => test.status === 'passed').length, run.passed);
  }
  return [...inventories].map(([file, inventory]) => {
    assert(inventory.counts.every(count => count === 1), file + ': missing or duplicate executed assertions');
    return { file, sha256: hash(file), passed: inventory.counts.length };
  });
}

const aggregate = read(out + '/regression-final.json'), manifest = read(out + '/regression-processes.json');
assert.equal(aggregate.sourceSha256, frozen); assert.equal(manifest.sourceSha256, frozen);
assert.equal(aggregate.passed, expected.existing); assert.equal(aggregate.failed, 0); assert.equal(aggregate.uncovered, 0);
assert.equal(aggregate.files, expected.existingFiles); assert.equal(aggregate.nativeReceipts, expected.existingProcesses);
assert.equal(manifest.runs.length, expected.existingProcesses); assert.equal(aggregate.processManifest, 'regression-processes.json');
assert.deepEqual(aggregate.receipts, manifest.runs.map(run => ({ receipt: run.receipt, sha256: run.receiptSha256, passed: run.passed })));
const coverage = nativeRuns(manifest.runs, out);
assert.equal(coverage.length, expected.existingFiles);
assert.equal(coverage.reduce((sum, entry) => sum + entry.passed, 0), expected.existing);
assert.deepEqual(coverage, aggregate.coverage);

const freshDir = out + '/new-tests/run-01', fresh = read(freshDir + '/final.json');
const freshManifest = read(freshDir + '/processes.json');
assert.equal(fresh.sourceSha256, frozen); assert.equal(fresh.publicMirrorSha256, frozen);
assert.equal(freshManifest.sourceSha256, frozen); assert.equal(freshManifest.file, fresh.file);
assert.equal(fresh.passed, expected.added); assert.equal(fresh.failed, 0); assert.equal(fresh.uncovered, 0);
assert.equal(fresh.nativeProcesses, expected.addedProcesses); assert.equal(freshManifest.runs.length, expected.addedProcesses);
assert.equal(hash(out + '/run-new-tests.cjs'), freshManifest.runnerSha256, 'New-test runner changed');
assert.equal(hash(fresh.file), fresh.testSha256); assert.equal(freshManifest.testSha256, fresh.testSha256);
assert.equal(fresh.inventory.path, 'inventory.json'); assert.equal(fresh.processManifest.path, 'processes.json');
for (const item of [fresh.inventory, fresh.processManifest, ...fresh.receipts]) assert.equal(hash(freshDir + '/' + item.path), item.sha256);
assert.deepEqual(fresh.receipts, freshManifest.runs.map(run => ({ path: run.receipt, sha256: run.receiptSha256, passed: run.passed, observedExitCode: run.exitCode })));
assert(freshManifest.runs.every(run => run.file === fresh.file && run.mirrorBeforeSha256 === frozen));
const freshCoverage = nativeRuns(freshManifest.runs, freshDir);
assert.equal(freshCoverage.length, 1); assert.equal(freshCoverage[0].passed, expected.added);
const inventory = read(freshDir + '/inventory.json');
assert.equal(inventory.file, fresh.file); assert.equal(inventory.sha256, fresh.testSha256);
assert.equal(inventory.assertions.length, expected.added);
assert(inventory.assertions.every((item, index) => item.index === index && item.executedPassCount === 1));
assert.deepEqual(inventory.assertions.map(item => item.fullName), read(freshDir + '/' + freshManifest.runs[0].receipt).testResults[0].assertionResults.map(item => item.fullName));

const pointer = read(out + '/browser/final.json');
assert.equal(hash(pointer.path), pointer.sha256, 'Browser final pointer changed');
const browser = read(pointer.path), results = read(browser.results.path);
assert.equal(browser.observedExitCode, 0); assert.equal(browser.signal, null); assert.equal(browser.error, null);
for (const key of ['sourceSha256', 'sourceSha256After', 'publicMirrorSha256', 'publicMirrorSha256After']) assert.equal(browser[key], frozen);
assert.equal(browser.sourceExactInNativePage, true); assert.equal(results.sourceSha256, frozen);
assert.equal(browser.errors.length, 0); assert.equal(results.errors.length, 0);
assert.equal(browser.checks, results.checks.length); assert.equal(browser.scenarios, results.scenarios);
assert(results.checks.length > 40); assert(Number.isInteger(browser.scenarios) && browser.scenarios >= 6);
assert(browser.screenshots.length >= 5); assert(browser.screenshots.every(item => item.visuallyInspected === true));
assert.equal(new Set(browser.screenshots.map(item => item.path)).size, browser.screenshots.length);
assert(browser.downloadedRecord && browser.downloadedRecord.path && browser.downloadedRecord.sha256, 'Missing native work-record download');
assert(browser.nativePage && browser.nativePage.path && browser.nativePage.sha256);
function browserArtifacts(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.path === 'string' && typeof value.sha256 === 'string') {
    // The generated native host is intentionally excluded from the committed report.
    // Its exact-source assertion and receipt hash remain in the native manifest.
    if (value.path !== browser.nativePage.path || fs.existsSync(value.path)) {
      assert.equal(hash(value.path), value.sha256, value.path + ': artifact changed');
      if (value.bytes !== undefined) assert.equal(fs.statSync(value.path).size, value.bytes);
    }
  }
  Object.values(value).forEach(browserArtifacts);
}
browserArtifacts(browser);
assert.equal(browser.harness.sha256, browser.harnessSnapshot.sha256, 'Native harness snapshot differs');
assert(fs.statSync(browser.downloadedRecord.path).size > 0);
if (fs.existsSync(browser.nativePage.path)) assert(fs.readFileSync(browser.nativePage.path, 'utf8').includes(fs.readFileSync(source, 'utf8')));

const scope = read(out + '/source-scope.json');
assert.equal(scope.sourceSha256, frozen); assert.equal(scope.baselineCommit, '86d2b7fc6');
for (const field of ['byteParity', 'outsideEfficiencyRegionAndNewHelperByteIdentical', 'existingPhysicalMathHelpersByteIdentical', 'changeCallbackByteIdentical', 'existingQuestionCalculationsByteIdentical', 'answerGradingByteIdentical', 'existingTestOnlySkillInventoryAndDescriptionsChanged']) assert.equal(scope[field], true, field);
assert.equal(hash(scope.existingTest.path), scope.existingTest.sha256);
const changedTestRuns = manifest.runs.filter(run => run.file === scope.existingTest.path);
assert(changedTestRuns.length > 0);
assert(changedTestRuns.every(run => run.testSha256 === scope.existingTest.sha256 && run.baselineTestSha256 === scope.existingTest.baselineSha256));
const allCoverage = coverage.concat(freshCoverage);
assert.equal(new Set(allCoverage.map(entry => entry.file)).size, expected.existingFiles + 1);
const syntaxFiles = [source, mirror, ...allCoverage.map(entry => entry.file), browser.harness.path, out + '/browser/run-native.cjs', out + '/run-regressions.cjs', out + '/run-new-tests.cjs', out + '/verify-source-scope.cjs', out + '/verify-evidence.cjs'];
for (const file of syntaxFiles) {
  const result = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, file + ': ' + result.stderr); assert.equal(result.signal, null); assert(!result.error);
}
assert.equal(hash(source), frozen); assert.equal(hash(mirror), frozen);

function earlierAttempts(directory, selectedDirectory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^run-\d+$/.test(entry.name))
    .map(entry => directory + '/' + entry.name).filter(folder => path.resolve(folder) !== path.resolve(selectedDirectory))
    .map(folder => ({ path: folder, excludedFromFinalPassCount: true, evidence: ['final.json', 'processes.json', 'process.json', 'results.json'].map(name => folder + '/' + name).filter(file => fs.existsSync(file)).map(artifact) }));
}
const total = expected.existing + expected.added, processes = expected.existingProcesses + expected.addedProcesses;
write('validation-summary.json', {
  date: '2026-10-12',
  scope: 'Four efficiency-aware design calculations and an exact continuous-MA interval visualization with current geometry markers.',
  source: { canonical: source, publicMirror: mirror, sha256: frozen, byteParity: true, scopeProof: 'source-scope.json', scopeProofSha256: hash(out + '/source-scope.json') },
  tests: { passed: total, newCases: expected.added, existingCases: expected.existing, failed: 0, uncovered: 0, files: allCoverage.length,
    successfulNativeProcesses: processes, allObservedChildExits: 0, inventoryExactlyOnce: true, existingTestsPreservedWithSkillInventoryAndDescriptionsUpdate: true,
    coverage: allCoverage,
    regressions: { aggregate: 'regression-final.json', aggregateSha256: hash(out + '/regression-final.json'), processManifest: 'regression-processes.json', processManifestSha256: hash(out + '/regression-processes.json'), currentRunner: artifact(out + '/run-regressions.cjs') },
    added: { aggregate: 'new-tests/run-01/final.json', aggregateSha256: hash(freshDir + '/final.json'), processManifest: 'new-tests/run-01/processes.json', processManifestSha256: hash(freshDir + '/processes.json'), runner: artifact(out + '/run-new-tests.cjs'), runnerBoundToManifest: true } },
  browser: { checks: browser.checks, scenarios: browser.scenarios, errors: 0, observedExitCode: 0, process: pointer, screenshots: browser.screenshots, downloadedRecord: browser.downloadedRecord, sourceExactInNativePage: true },
  review: { agent: 'geometry_review', result: 'No remaining implementation blockers in independently reviewed source; native evidence bindings verified.', sourceSha256: frozen,
    approvedImplementation: 'One efficiencyEnvelope helper plus efficiency lab/session/question/record changes. Existing physical math, ideal design search, seven earlier calculations and their grading remain unchanged.',
    displaySemantics: 'New endpoints and efficiency thresholds retain full numeric precision. Reversed endpoints produce an empty overlap; equal endpoints produce one point with no invented interval width. Tiny intervals retain exact proportions. Existing fit checks retain their small numerical tolerance.',
    recordCompatibility: 'Original calculation kinds retain v1/v2. Four planning kinds use v3 with immutable numeric limits. New-kind signatures include limits; stale handlers and invalid limits cannot save or grade a different task. Saved viewed solutions remain identified as practice.' },
  earlierAttempts: { preserved: true, excludedFromFinalPassCount: true, attempts: earlierAttempts(out + '/new-tests', freshDir).concat(earlierAttempts(out + '/browser', path.dirname(pointer.path))) },
  staticChecks: { syntaxFiles, observedExitCodes: 0, observedSignals: null },
  limitations: [
    'Constant efficiency is an assumption. Strength, starting friction, acceleration and actual material behavior are not modeled.',
    'A continuous MA interval does not guarantee an available station geometry or whole-number pulley configuration; this view applies no settings.',
    'The efficiency threshold at current MA addresses effort only. Improving efficiency cannot repair excessive hand travel at fixed geometry.',
    'Efficiency thresholds below 1% and above 100% remain mathematical results; the input control remains 1–100%.',
    'Each station keeps its latest efficiency record. Practice and viewed solutions are not scores or mastery evidence.',
    'Scoped unit suites and a local Chromium host were checked, not a full application build, physical assistive-device session or deployment.'
  ],
  excludedGeneratedArtifacts: ['ml-shots.html', 'browser-temp/', 'test-temp/', 'downloads/']
});
console.log(JSON.stringify({ passed: total, files: allCoverage.length, processes, browserChecks: browser.checks, screenshots: browser.screenshots.length, sourceSha256: frozen }));
