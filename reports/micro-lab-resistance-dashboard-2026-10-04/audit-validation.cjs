const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const input = require('./validation-inputs.cjs');
const root = path.resolve(__dirname, '../..');
const folder = 'reports/micro-lab-resistance-dashboard-2026-10-04';
const report = path.join(root, folder);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(report, file), 'utf8'));
const sorted = values => [...values].sort();
function verify({ skipRegistryChecks = false } = {}) {
  const config = read('candidate.json');
  assert(/^[a-f0-9]{64}$/.test(config.sourceSha256));
  assert.equal(config.newUnitCases, 0); assert.equal(config.newBrowserCases, 5);
  assert(/^unit(?:-[a-z0-9]+)*$/.test(config.unitPhase) && !config.unitPhase.startsWith('unit-focused'));
  assert(/^browser(?:-[a-z0-9]+)*$/.test(config.browserPhase) && !config.browserPhase.startsWith('browser-focused'));
  const reportNames = [config.unitPhase + '-results.json', config.browserPhase + '-results.json'];
  const unit = read(reportNames[0]), browser = read(reportNames[1]);
  assert.equal(unit.success, true); assert.equal(unit.numPassedTests, input.expectedUnit);
  assert.equal(unit.numFailedTests, 0); assert.equal(unit.numPendingTests, 0); assert.equal(unit.testResults.length, 28);
  assert(unit.testResults.every(file => file.status === 'passed' && file.assertionResults.every(test => test.status === 'passed')));
  assert.equal(unit.testResults.reduce((sum, file) => sum + file.assertionResults.length, 0), input.expectedUnit);
  const actualUnitFiles = unit.testResults.map(file => path.relative(root, file.name).replace(/\\/g, '/'));
  assert.deepEqual(sorted(actualUnitFiles), sorted(input.unit));
  assert.equal(new Set(actualUnitFiles).size, 28);
  assert.equal(browser.stats.expected, input.expectedBrowser); assert.equal(browser.stats.unexpected, 0);
  assert.equal(browser.stats.flaky, 0); assert.equal(browser.stats.skipped, 0); assert.deepEqual(browser.errors, []);
  const rows = [];
  function walk(suites) { for (const suite of suites || []) {
    for (const spec of suite.specs || []) rows.push(spec);
    walk(suite.suites);
  } }
  walk(browser.suites);
  assert.equal(rows.length, input.expectedBrowser); assert.equal(new Set(rows.map(row => row.id)).size, input.expectedBrowser);
  const fileCounts = {};
  for (const row of rows) {
    assert.equal(row.ok, true); assert.equal(row.tests.length, 1);
    const test = row.tests[0];
    assert.equal(test.projectName, 'chromium'); assert.equal(test.expectedStatus, 'passed'); assert.equal(test.status, 'expected');
    assert.equal(test.results.length, 1); assert.equal(test.results[0].status, 'passed');
    assert.equal(test.results[0].retry, 0); assert.deepEqual(test.results[0].errors, []);
    const name = row.file.replace(/\\/g, '/'); fileCounts[name] = (fileCounts[name] || 0) + 1;
  }
  assert.deepEqual(fileCounts, input.browserCounts); assert.equal(Object.keys(fileCounts).length, 14);
  assert.equal(browser.config.workers, 1);
  const phaseNames = [config.unitPhase, config.browserPhase];
  const runners = phaseNames.map(phase => read(phase + '-run-status.json'));
  const inputs = {};
  for (const [index, status] of runners.entries()) {
    const unitRun = index === 0;
    assert.equal(status.kind, unitRun ? 'unit' : 'browser'); assert.equal(status.phaseName, phaseNames[index]);
    assert.equal(status.phase, 'passed'); assert.equal(status.exitCode, 0); assert.equal(status.signal, null);
    assert(status.finished); assert.equal(status.sourceSha256, config.sourceSha256);
    assert.equal(status.expected, unitRun ? input.expectedUnit : input.expectedBrowser);
    assert.deepEqual(sorted(status.files), sorted(unitRun ? input.unit : input.browser));
    for (const key of ['sourceStillMatches', 'testInputsStillMatch', 'syntaxChecksPassed']) assert.equal(status[key], true);
    assert.deepEqual(sorted(Object.keys(status.testInputs)), sorted([...status.files, ...input.support]));
    for (const [file, expected] of Object.entries(status.testInputs)) {
      assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Validated input changed: ' + file);
      if (inputs[file]) assert.equal(inputs[file], expected);
      inputs[file] = expected;
    }
  }
  assert.equal(Object.keys(inputs).length, 52);
  for (const file of input.runtime) assert.equal(hash(fs.readFileSync(path.join(root, file))), config.sourceSha256);
  assert(Array.isArray(config.visualReview) && config.visualReview.length >= 3, 'Record desktop, phone and zoom visual review artifacts.');
  assert.equal(new Set(config.visualReview).size, config.visualReview.length);
  for (const name of config.visualReview) {
    assert(/^[a-z0-9][a-z0-9-]*\.png$/.test(name), 'Visual review must name a top-level PNG artifact.');
    const bytes = fs.readFileSync(path.join(report, name));
    assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid visual PNG: ' + name);
  }
  const summary = { date: '2026-10-04', sourceSha256: config.sourceSha256,
    unit: { passed: input.expectedUnit, failed: 0, files: 28 },
    browser: { passed: input.expectedBrowser, failed: 0, skipped: 0, flaky: 0, files: 14, project: 'chromium', retries: 0, fileCounts },
    runners, testInputs: inputs, supplementaryInputs: [],
    reportsSha256: Object.fromEntries(reportNames.map(file => [file, hash(fs.readFileSync(path.join(report, file)))])),
    visualReview: config.visualReview };
  // A committed verification checks immutable registry blobs separately. It does not reuse today's unrelated working registry changes as validation-time evidence.
  if (!skipRegistryChecks) {
    const source = fs.readFileSync(path.join(root, input.runtime[0]), 'utf8');
    const previous = cp.execFileSync('git', ['show', input.parent + ':' + input.runtime[0]], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    const registryBytes = input.registries.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
    const labels = require('./check-defaults.cjs')(source, previous, registryBytes);
    assert.equal(labels.keys, 1924);
    for (const registry of labels.registries) {
      assert.deepEqual(registry.missing, []); assert.deepEqual(registry.changedFallbacks, []); assert.deepEqual(registry.dashboardMismatches, []);
    }
    assert.deepEqual(...registryBytes.map(([, bytes]) => JSON.parse(bytes).stem.microbiology));
    summary.interface = { keys: labels.keys, missing: 0, changedFallbacks: 0, dashboardLabels: 8, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true };
  }
  return summary;
}
module.exports = verify;
if (require.main === module) {
  const summary = verify();
  fs.writeFileSync(path.join(report, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ unit: summary.unit, browser: summary.browser, interface: summary.interface }));
}
