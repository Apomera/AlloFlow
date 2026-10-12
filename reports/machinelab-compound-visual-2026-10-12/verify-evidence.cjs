// Rebuild summary only from complete native receipts, observed exits and frozen inputs.
const fs = require('fs'), cp = require('child_process'), crypto = require('crypto'), assert = require('assert');
const out = 'reports/machinelab-compound-visual-2026-10-12';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, data) => fs.writeFileSync(out + '/' + file, JSON.stringify(data, null, 2) + '\n');
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source, sha = hash(source);
assert.equal(sha, 'faee373d6d9895fef3430b99cdf55ade04ded465ce0c400d288b9e9fa3b6b7ca');
assert.equal(hash(mirror), sha);
const inventories = new Map(), groups = [];
for (const [prefix, expectedPassed, expectedFiles, expectedRuns] of [['focused', 538, 3, 15], ['regression', 284, 6, 13]]) {
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
assert.equal(passed, 822); assert.equal(coverage.length, 9);
const browser = read(out + '/browser/process.json'), results = read(out + '/browser/results.json');
assert.equal(browser.observedExitCode, 0); assert.equal(browser.signal, null); assert.equal(browser.error, null);
for (const key of ['sourceSha256', 'sourceSha256After', 'publicMirrorSha256', 'publicMirrorSha256After']) assert.equal(browser[key], sha);
assert.equal(results.sourceSha256, sha); assert.equal(browser.errors.length, 0); assert.equal(results.errors.length, 0);
assert.equal(results.checks.length, 78); assert.equal(browser.checks, results.checks.length); assert.equal(results.scenarios, 4); assert.equal(browser.scenarios, results.scenarios);
assert.equal(browser.screenshots.length, 6); assert(browser.screenshots.every(s => s.visuallyInspected)); assert(browser.sourceExactInNativePage);
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
const visualReview = read(out + '/browser/visual-review.json');
assert.equal(visualReview.sourceSha256, sha); verifyArtifacts(visualReview);
for (const prior of visualReview.historical) {
  const record = read(prior.receipt.path), folder = prior.receipt.path.slice(0, prior.receipt.path.lastIndexOf('/'));
  assert.equal(hash(prior.harnessSnapshot.path), record.harness.sha256);
  for (const field of ['console', 'results']) if (record[field]) {
    const retained = folder + '/' + record[field].path.split('/').pop();
    assert.equal(hash(retained), record[field].sha256);
  }
  for (const shot of record.screenshots) assert.equal(hash(folder + '/' + shot.path.split('/').pop()), shot.sha256);
}
if (fs.existsSync(browser.nativePage.path)) assert(fs.readFileSync(browser.nativePage.path, 'utf8').includes(fs.readFileSync(source, 'utf8')));
const scope = read(out + '/source-scope.json'); assert.equal(scope.sourceSha256, sha); assert(scope.outsideRegionByteIdentical && scope.changeAndSaveCallbacksByteIdentical);
const syntaxFiles = [source, mirror, ...coverage.map(entry => entry.file), browser.harness.path, out + '/run-focused-tests.cjs', out + '/run-regressions.cjs', out + '/verify-source-scope.cjs', out + '/verify-evidence.cjs'];
for (const file of syntaxFiles) {
  const check = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  assert.equal(check.status, 0, file + ': ' + check.stderr);
}
write('tests-final.json', { format: 'machine-lab-independent-run-coverage-v1', sourceSha256: sha, passed, failed: 0, uncovered: 0, files: 9, nativeReceipts: 28,
  description: 'Final-source scoped coverage; every stable assertion inventory position executed exactly once. Filtered skips are not counted.', groups, coverage });
write('validation-summary.json', {
  date: '2026-10-12', scope: 'Compound-machine stage route, proportional patterned energy split, responsive setup and calculation hierarchy, and practice feedback styling.',
  source: { canonical: source, publicMirror: mirror, sha256: sha, byteParity: true, exactBrowserEmbeddedSource: true, scopeProof: 'source-scope.json', scopeProofSha256: hash(out + '/source-scope.json') },
  tests: { passed, failed: 0, uncovered: 0, files: 9, successfulFreshProcesses: 28, existing: 822, added: 0, allFinalObservedExitCodes: 0,
    receiptAndTestHashesVerified: true, aggregate: 'tests-final.json', aggregateSha256: hash(out + '/tests-final.json'), nodeOldSpaceMiB: 512, nodeSemiSpaceMiB: 8, workers: 1, pool: 'forks', isolate: false, testTimeoutMs: 30000 },
  browser: { checks: results.checks.length, errors: 0, scenarios: results.scenarios, observedExitCode: 0, manifest: 'browser/process.json', manifestSha256: hash(out + '/browser/process.json'), screenshots: browser.screenshots },
  review: { result: 'No blocking findings', independentAgent: 'visual_audit', reviewedSourceSha256: sha,
    correctionsBeforeValidation: ['Use background-color rather than background in the forced-colors legend rule to preserve stripe/dot pattern images.'],
    visualReview: 'Browser agent and primary agent inspected all six retained final screenshots for responsive chart, calculation and practice layout.',
    visualReviewManifest: 'browser/visual-review.json', visualReviewSha256: hash(out + '/browser/visual-review.json'),
    codeReview: 'review.json', codeReviewSha256: hash(out + '/review.json') },
  staticChecks: { syntaxFiles, syntaxObservedExitCodes: 0 },
  priorBrowserAttempts: browser.priorAttempts,
  interruptedTestRunner: { evidence: 'test-interruption/interruption.json', sha256: hash(out + '/test-interruption/interruption.json'),
    explanation: 'The original runner stopped after 14 observed successful groups. Verified resume reuses those groups and runs only the final group, with complete exactly-once coverage.' },
  interruptedRegressionOutput: { evidence: 'test-interruption/regression-interruption.json', sha256: hash(out + '/test-interruption/regression-interruption.json'),
    explanation: 'The output session closed, but all 13 native child processes completed with recorded exit 0. The complete manifest and final receipt/log were verified and restored after temporary diagnostic relocation; no native regression rerun was needed.' },
  normalization: 'Generated metadata and console logs use LF; native assertion JSON and screenshots remain unchanged.',
  evidenceExclusions: ['Every nested ml-shots.html, browser-temp/ and downloads/', 'test-temp/'],
  limitations: ['Presentation changes use the existing conceptual model; diagram is not a physically connected machine assembly.',
    'Very small energy shares can be below pixel resolution; numeric values remain available in the legend.',
    'Scoped Machine Lab regressions, not the full repository suite or a full application build.',
    'Native Chromium React/THREE harness; no physical assistive-device session, performance benchmark, push or deployment.']
});
console.log(JSON.stringify({ passed, files: 9, successfulProcesses: 28, browserChecks: results.checks.length, sourceSha256: sha }));
