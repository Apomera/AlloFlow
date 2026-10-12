// Rebuild summary only from complete native receipts, observed exits and frozen inputs.
const fs = require('fs'), cp = require('child_process'), crypto = require('crypto'), assert = require('assert');
const out = 'reports/machinelab-compound-planning-2026-10-11';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, data) => fs.writeFileSync(out + '/' + file, JSON.stringify(data, null, 2) + '\n');
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source, sha = hash(source);
assert.equal(sha, 'c8782233487e8f5148ae3e8d4cba03d14e9591d074154dadbd33ddc81c3892b0');
assert.equal(hash(mirror), sha);
const inventories = new Map(), groups = [];
for (const [prefix, expectedPassed, expectedFiles, expectedRuns] of [['focused', 538, 3, 15], ['regression', 569, 8, 22]]) {
  const aggregate = read(out + '/' + prefix + '-final.json'), manifest = read(out + '/' + prefix + '-processes.json');
  assert.equal(manifest.sourceSha256, sha); assert.equal(aggregate.sourceSha256, sha);
  assert.equal(manifest.runs.length, expectedRuns); assert.equal(aggregate.nativeReceipts, expectedRuns);
  assert.equal(aggregate.passed, expectedPassed); assert.equal(aggregate.failed, 0); assert.equal(aggregate.uncovered, 0); assert.equal(aggregate.files, expectedFiles);
  const files = new Set();
  for (const run of manifest.runs) {
    assert.equal(run.exitCode, 0); assert.equal(run.signal, null);
    for (const key of ['sourceSha256', 'sourceAfterSha256', 'mirrorAfterSha256']) assert.equal(run[key], sha);
    assert.equal(hash(run.file), run.testSha256); assert.equal(run.testAfterSha256, run.testSha256);
    assert.equal(hash(out + '/' + run.receipt), run.receiptSha256); assert.equal(hash(out + '/' + run.log), run.logSha256);
    const native = read(out + '/' + run.receipt);
    assert(native.success); assert.equal(native.numFailedTests, 0); assert.equal(native.numPassedTests, run.passed); assert.equal(native.testResults.length, 1);
    const tests = native.testResults[0].assertionResults;
    if (!inventories.has(run.file)) inventories.set(run.file, { names: tests.map(t => t.fullName), counts: tests.map(() => 0) });
    const inventory = inventories.get(run.file); assert.deepEqual(tests.map(t => t.fullName), inventory.names);
    tests.forEach((test, i) => { if (test.status === 'passed') inventory.counts[i]++; else assert(['pending', 'skipped'].includes(test.status)); });
    assert.equal(tests.filter(t => t.status === 'passed').length, run.passed); files.add(run.file);
    const receiptEntry = aggregate.receipts.find(entry => entry.receipt === run.receipt);
    assert(receiptEntry); assert.equal(receiptEntry.sha256, run.receiptSha256); assert.equal(receiptEntry.passed, run.passed);
  }
  assert.equal(files.size, expectedFiles);
  for (const entry of aggregate.coverage) {
    assert(files.has(entry.file)); assert.equal(hash(entry.file), entry.sha256); assert.equal(inventories.get(entry.file).counts.length, entry.passed);
  }
  groups.push({ group: prefix, passed: expectedPassed, files: expectedFiles, processes: expectedRuns,
    aggregate: prefix + '-final.json', aggregateSha256: hash(out + '/' + prefix + '-final.json'),
    processManifest: prefix + '-processes.json', processManifestSha256: hash(out + '/' + prefix + '-processes.json') });
}
const coverage = [...inventories].map(([file, inventory]) => {
  assert(inventory.counts.every(count => count === 1), 'Missing or duplicate execution: ' + file);
  return { file, sha256: hash(file), passed: inventory.counts.length };
});
const passed = coverage.reduce((sum, item) => sum + item.passed, 0);
assert.equal(passed, 1107); assert.equal(coverage.length, 11);
const browser = read(out + '/browser/process.json'), results = read(out + '/browser/results.json');
assert.equal(browser.observedExitCode, 0); assert.equal(browser.signal, null); assert.equal(browser.error, null);
for (const key of ['sourceSha256', 'sourceSha256After', 'publicMirrorSha256', 'publicMirrorSha256After']) assert.equal(browser[key], sha);
assert.equal(results.sourceSha256, sha); assert.equal(browser.errors.length, 0); assert.equal(results.errors.length, 0);
assert.equal(results.checks.length, 684); assert.equal(browser.checks, 684); assert.equal(results.scenarios, 13); assert.equal(browser.scenarios, 13);
assert.equal(browser.screenshots.length, 4); assert(browser.screenshots.every(s => s.visuallyInspected)); assert(browser.sourceExactInNativePage);
function verifyArtifacts(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.path === 'string' && typeof value.sha256 === 'string') {
    // Generated browser HTML is intentionally excluded from the evidence commit.
    if (value.path === browser.nativePage.path && !fs.existsSync(value.path)) return;
    assert.equal(hash(value.path), value.sha256); if (value.bytes !== undefined) assert.equal(fs.statSync(value.path).size, value.bytes);
  }
  Object.values(value).forEach(verifyArtifacts);
}
verifyArtifacts(browser);
if (fs.existsSync(browser.nativePage.path)) assert(fs.readFileSync(browser.nativePage.path, 'utf8').includes(fs.readFileSync(source, 'utf8')));
const scope = read(out + '/source-scope.json'); assert.equal(scope.sourceSha256, sha); assert(scope.unchangedOutsideRegions && scope.originalCompoundWorkAndPowerHelpersUnchanged);
const syntaxFiles = [source, mirror, ...coverage.map(entry => entry.file), browser.harness.path, out + '/run-focused-tests.cjs', out + '/run-regressions.cjs', out + '/verify-source-scope.cjs', out + '/verify-evidence.cjs'];
for (const file of syntaxFiles) {
  const check = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  assert.equal(check.status, 0, file + ': ' + check.stderr);
}
write('tests-final.json', { format: 'machine-lab-independent-run-coverage-v1', sourceSha256: sha, passed, failed: 0, uncovered: 0, files: 11, nativeReceipts: 37,
  description: 'Final-source scoped coverage; every stable assertion inventory position executed exactly once. Filtered skips are not counted.', groups, coverage });
write('validation-summary.json', {
  date: '2026-10-11', scope: 'Compound-machine mechanical power budgets, four inverse planning skills and version-three fixed task records.',
  source: { canonical: source, publicMirror: mirror, sha256: sha, byteParity: true, exactBrowserEmbeddedSource: true, scopeProof: 'source-scope.json', scopeProofSha256: hash(out + '/source-scope.json') },
  tests: { passed, failed: 0, uncovered: 0, files: 11, successfulFreshProcesses: 37, existing: 948, added: 159, allFinalObservedExitCodes: 0,
    receiptAndTestHashesVerified: true, aggregate: 'tests-final.json', aggregateSha256: hash(out + '/tests-final.json'), nodeOldSpaceMiB: 512, nodeSemiSpaceMiB: 8, workers: 1, pool: 'forks', isolate: false, testTimeoutMs: 30000 },
  browser: { checks: 684, errors: 0, scenarios: 13, observedExitCode: 0, manifest: 'browser/process.json', manifestSha256: hash(out + '/browser/process.json'), screenshots: browser.screenshots, nativeDownload: browser.nativeDownload },
  review: { result: 'No blocking findings', independentAgent: 'power_planning_review', reviewedSourceSha256: sha,
    correctionsBeforeValidation: ['Use identical power-domain relative tolerance for current and ideal fit checks.', 'Give required-efficiency retry feedback its independent equation, excluding assumed efficiencies.'],
    visualReview: 'Browser agent and primary agent inspected all four native screenshots; no clipping of calculation cards, short selected skill labels, answer controls or saved record.' },
  staticChecks: { syntaxFiles, syntaxObservedExitCodes: 0 },
  attempts: { failed: 0, retried: 0 },
  normalization: 'Generated metadata and console logs use LF; native assertion JSON, screenshots and native download remain unchanged.',
  evidenceExclusions: ['Every nested ml-shots.html, browser-temp/ and downloads/', 'test-temp/'],
  limitations: ['Energy limits under sustained mechanical power and constant efficiency; no strength, peak-force, stroke, acceleration or electrical-input model.',
    'All 30 ordered pairs receive physics checks; new grading combinations cover four skills at each of six default station pairings.',
    'Scoped Machine Lab regressions, not the full repository suite or a full application build.',
    'Native Chromium React/THREE harness; no physical assistive-device session, performance benchmark, push or deployment.']
});
console.log(JSON.stringify({ passed, files: 11, successfulProcesses: 37, browserChecks: 684, sourceSha256: sha }));
