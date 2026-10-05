const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const folder = 'reports/micro-lab-resistance-visuals-2026-10-04';
const report = path.join(root, folder);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(report, file), 'utf8'));
function verify() {
  const config = read('candidate.json');
  assert.equal(config.newUnitCases, 32);
  assert.equal(config.newBrowserCases, 6);
  const unit = read('unit-polish-results.json'), browser = read('browser-polish-results.json');
  assert.equal(unit.success, true); assert.equal(unit.numPassedTests, 1027 + config.newUnitCases);
  assert.equal(unit.numFailedTests, 0); assert.equal(unit.numPendingTests, 0); assert.equal(unit.testResults.length, 28);
  assert(unit.testResults.every(file => file.status === 'passed' && file.assertionResults.every(test => test.status === 'passed')));
  assert.equal(unit.testResults.reduce((sum, file) => sum + file.assertionResults.length, 0), 1059);
  assert.equal(browser.stats.expected, 84); assert.equal(browser.stats.unexpected, 0);
  assert.equal(browser.stats.flaky, 0); assert.equal(browser.stats.skipped, 0); assert.deepEqual(browser.errors, []);
  const rows = [];
  function walk(suites) { for (const suite of suites || []) {
    for (const spec of suite.specs || []) rows.push(spec);
    walk(suite.suites);
  } }
  walk(browser.suites);
  assert.equal(rows.length, 84); assert.equal(new Set(rows.map(row => row.id)).size, 84);
  const fileCounts = {};
  for (const row of rows) {
    assert.equal(row.ok, true); assert.equal(row.tests.length, 1);
    const test = row.tests[0];
    assert.equal(test.projectName, 'chromium'); assert.equal(test.expectedStatus, 'passed'); assert.equal(test.status, 'expected');
    assert.equal(test.results.length, 1); assert.equal(test.results[0].status, 'passed');
    assert.equal(test.results[0].retry, 0); assert.deepEqual(test.results[0].errors, []);
    fileCounts[row.file.replace(/\\/g, '/')] = (fileCounts[row.file.replace(/\\/g, '/')] || 0) + 1;
  }
  assert.equal(Object.keys(fileCounts).length, 13);
  assert.equal(fileCounts['microbiology-resistance-rounds.spec.ts'], 8);
  assert.deepEqual(fileCounts, Object.fromEntries(Object.entries({
    'annotation-integrity': 7, 'evidence-recovery': 6, 'evidence-review': 6, 'experiment-design': 6,
    'growth-citations': 7, 'guided-resume': 5, 'home-integrity': 7, 'measurement-conversion': 7,
    'mystery-integrity': 7, 'portfolio-selection': 6, 'portfolio': 6, 'resistance-rounds': 8, 'resistance-visuals': 6
  }).map(([name, count]) => ['microbiology-' + name + '.spec.ts', count])));
  assert.equal(browser.config.workers, 1);
  const runners = ['unit-polish', 'browser-polish'].map(kind => read(kind + '-run-status.json'));
  const inputs = {};
  const support = ['playwright.config.ts', 'tests/e2e/helpers/stem_gl_harness.ts', 'tests/helpers/stem_widgets_smoke_harness.js', 'tests/e2e/helpers/png_pixels.ts',
    'desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
    'vendor/three-r128/three.min.js', 'node_modules/@playwright/test/package.json', 'node_modules/playwright/package.json', 'node_modules/playwright-core/package.json'];
  for (const status of runners) {
    assert.equal(status.kind, status === runners[0] ? 'unit' : 'browser');
    assert.equal(status.phase, 'passed'); assert.equal(status.exitCode, 0); assert.equal(status.signal, null);
    assert(status.finished); assert.equal(status.sourceSha256, config.sourceSha256);
    assert.equal(status.expected, status.kind === 'unit' ? 1027 + config.newUnitCases : 84);
    assert.equal(status.files.length, status.kind === 'unit' ? 28 : 13);
    for (const key of ['sourceStillMatches', 'testInputsStillMatch', 'syntaxChecksPassed']) assert.equal(status[key], true);
    for (const file of status.files) assert(Object.hasOwn(status.testInputs, file));
    assert.deepEqual(Object.keys(status.testInputs).sort(), [...status.files, ...support].sort());
    if (status.kind === 'unit') {
      const names = unit.testResults.map(file => path.relative(root, file.name).replace(/\\/g, '/')).sort();
      assert.deepEqual(names, [...status.files].sort());
      assert.equal(unit.testResults.find(file => file.name.endsWith('microbiology_resistance_visuals.test.js')).assertionResults.length, 32);
    } else assert.deepEqual(Object.keys(fileCounts).sort(), status.files.map(file => path.basename(file)).sort());
    for (const [file, expected] of Object.entries(status.testInputs)) {
      assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Validated input changed: ' + file);
      if (inputs[file]) assert.equal(inputs[file], expected);
      inputs[file] = expected;
    }
  }
  assert.equal(Object.keys(inputs).length, 51);
  const runtime = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
  for (const file of runtime) assert.equal(hash(fs.readFileSync(path.join(root, file))), config.sourceSha256);
  const labels = JSON.parse(cp.execFileSync(process.execPath, [path.join(report, 'check-defaults.cjs')], { cwd: root, encoding: 'utf8' }));
  assert.equal(labels.mirrored, true);
  for (const registry of labels.registries) { assert.deepEqual(registry.missing, []); assert.deepEqual(registry.changedFallbacks, []); }
  const namespaces = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].map(file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).stem.microbiology);
  assert.deepEqual(namespaces[0], namespaces[1]);
  return { date: '2026-10-04', sourceSha256: config.sourceSha256,
    unit: { passed: unit.numPassedTests, failed: 0, files: 28 },
    browser: { passed: 84, failed: 0, skipped: 0, flaky: 0, files: 13, project: 'chromium', retries: 0, fileCounts },
    runners, testInputs: inputs, supplementaryInputs: [],
    reportsSha256: Object.fromEntries(['unit-polish-results.json', 'browser-polish-results.json'].map(file => [file, hash(fs.readFileSync(path.join(report, file)))])),
    interface: { keys: labels.keys, missing: 0, changedFallbacks: 0, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true },
    visualReview: ['resistance-visual-divergence-desktop.png', 'resistance-visuals-phone-320.png', 'resistance-visuals-400-percent.png'] };
}
module.exports = verify;
if (require.main === module) {
  const summary = verify();
  fs.writeFileSync(path.join(report, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ unit: summary.unit, browser: summary.browser, interface: summary.interface }));
}
