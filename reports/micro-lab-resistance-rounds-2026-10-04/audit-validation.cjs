const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const folder = 'reports/micro-lab-resistance-rounds-2026-10-04';
const report = path.join(root, folder);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(report, file), 'utf8'));
function verify() {
  const config = read('candidate.json');
  assert.equal(config.newUnitCases, 86);
  assert.equal(config.newBrowserCases, 8);
  const unit = read('unit-results.json'), browser = read('browser-results.json');
  assert.equal(unit.success, true); assert.equal(unit.numPassedTests, 941 + config.newUnitCases);
  assert.equal(unit.numFailedTests, 0); assert.equal(unit.numPendingTests, 0); assert.equal(unit.testResults.length, 27);
  assert(unit.testResults.every(file => file.status === 'passed' && file.assertionResults.every(test => test.status === 'passed')));
  assert.equal(unit.testResults.reduce((sum, file) => sum + file.assertionResults.length, 0), 1027);
  assert.equal(browser.stats.expected, 78); assert.equal(browser.stats.unexpected, 0);
  assert.equal(browser.stats.flaky, 0); assert.equal(browser.stats.skipped, 0); assert.deepEqual(browser.errors, []);
  const rows = [];
  function walk(suites) { for (const suite of suites || []) {
    for (const spec of suite.specs || []) rows.push(spec);
    walk(suite.suites);
  } }
  walk(browser.suites);
  assert.equal(rows.length, 78); assert.equal(new Set(rows.map(row => row.id)).size, 78);
  const fileCounts = {};
  for (const row of rows) {
    assert.equal(row.ok, true); assert.equal(row.tests.length, 1);
    const test = row.tests[0];
    assert.equal(test.projectName, 'chromium'); assert.equal(test.expectedStatus, 'passed'); assert.equal(test.status, 'expected');
    assert.equal(test.results.length, 1); assert.equal(test.results[0].status, 'passed');
    assert.equal(test.results[0].retry, 0); assert.deepEqual(test.results[0].errors, []);
    fileCounts[row.file.replace(/\\/g, '/')] = (fileCounts[row.file.replace(/\\/g, '/')] || 0) + 1;
  }
  assert.equal(Object.keys(fileCounts).length, 12);
  assert.equal(fileCounts['microbiology-resistance-rounds.spec.ts'], 8);
  assert.deepEqual(fileCounts, Object.fromEntries(Object.entries({
    'annotation-integrity': 7, 'evidence-recovery': 6, 'evidence-review': 6, 'experiment-design': 6,
    'growth-citations': 7, 'guided-resume': 5, 'home-integrity': 7, 'measurement-conversion': 7,
    'mystery-integrity': 7, 'portfolio-selection': 6, 'portfolio': 6, 'resistance-rounds': 8
  }).map(([name, count]) => ['microbiology-' + name + '.spec.ts', count])));
  assert.equal(browser.config.workers, 1);
  const runners = ['unit', 'browser'].map(kind => read(kind + '-run-status.json'));
  const inputs = {};
  const support = ['playwright.config.ts', 'tests/e2e/helpers/stem_gl_harness.ts', 'tests/helpers/stem_widgets_smoke_harness.js',
    'desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
    'vendor/three-r128/three.min.js', 'node_modules/@playwright/test/package.json', 'node_modules/playwright/package.json', 'node_modules/playwright-core/package.json'];
  for (const status of runners) {
    assert.equal(status.kind, status === runners[0] ? 'unit' : 'browser');
    assert.equal(status.phase, 'passed'); assert.equal(status.exitCode, 0); assert.equal(status.signal, null);
    assert(status.finished); assert.equal(status.sourceSha256, config.sourceSha256);
    assert.equal(status.expected, status.kind === 'unit' ? 941 + config.newUnitCases : 78);
    assert.equal(status.files.length, status.kind === 'unit' ? 27 : 12);
    for (const key of ['sourceStillMatches', 'testInputsStillMatch', 'syntaxChecksPassed']) assert.equal(status[key], true);
    for (const file of status.files) assert(Object.hasOwn(status.testInputs, file));
    assert.deepEqual(Object.keys(status.testInputs).sort(), [...status.files, ...support].sort());
    if (status.kind === 'unit') {
      const names = unit.testResults.map(file => path.relative(root, file.name).replace(/\\/g, '/')).sort();
      assert.deepEqual(names, [...status.files].sort());
      assert.equal(unit.testResults.find(file => file.name.endsWith('microbiology_resistance_rounds.test.js')).assertionResults.length, 86);
    } else assert.deepEqual(Object.keys(fileCounts).sort(), status.files.map(file => path.basename(file)).sort());
    for (const [file, expected] of Object.entries(status.testInputs)) {
      assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Validated input changed: ' + file);
      if (inputs[file]) assert.equal(inputs[file], expected);
      inputs[file] = expected;
    }
  }
  assert.equal(Object.keys(inputs).length, 48);
  // This helper was observed after the browser run; do not describe its hash
  // as a pre-run capture. Its timestamps and parent blob provide separate proof.
  const supplementary = read('support-observation.json');
  assert.equal(supplementary.file, 'tests/e2e/helpers/png_pixels.ts');
  assert.equal(supplementary.observation, 'after-browser-run');
  assert.equal(hash(fs.readFileSync(path.join(root, supplementary.file))), supplementary.sha256);
  assert.equal(fs.statSync(path.join(root, supplementary.file)).mtimeMs, supplementary.mtimeMs);
  assert(supplementary.mtimeMs < Date.parse(runners[1].started));
  assert(Date.parse(supplementary.observedAt) >= Date.parse(runners[1].finished));
  const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(git(['hash-object', supplementary.file]), supplementary.cleanOid);
  assert.equal(git(['rev-parse', '36d70aaa36bddf4789ef5d56dca420283a11098d:' + supplementary.file]), supplementary.cleanOid);
  const runtime = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js'];
  for (const file of runtime) assert.equal(hash(fs.readFileSync(path.join(root, file))), config.sourceSha256);
  const labels = JSON.parse(cp.execFileSync(process.execPath, [path.join(report, 'check-defaults.cjs')], { cwd: root, encoding: 'utf8' }));
  assert.equal(labels.mirrored, true);
  for (const registry of labels.registries) { assert.deepEqual(registry.missing, []); assert.deepEqual(registry.changedFallbacks, []); }
  const namespaces = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].map(file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).stem.microbiology);
  assert.deepEqual(namespaces[0], namespaces[1]);
  return { date: '2026-10-04', sourceSha256: config.sourceSha256,
    unit: { passed: unit.numPassedTests, failed: 0, files: 27 },
    browser: { passed: 78, failed: 0, skipped: 0, flaky: 0, files: 12, project: 'chromium', retries: 0, fileCounts },
    runners, testInputs: inputs, supplementaryInputs: [supplementary],
    reportsSha256: Object.fromEntries(['unit-results.json', 'browser-results.json'].map(file => [file, hash(fs.readFileSync(path.join(report, file)))])),
    interface: { keys: labels.keys, missing: 0, changedFallbacks: 0, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true },
    visualReview: ['resistance-earlier-round-desktop.png', 'resistance-round-phone.png', 'resistance-round-400-percent.png'] };
}
module.exports = verify;
if (require.main === module) {
  const summary = verify();
  fs.writeFileSync(path.join(report, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ unit: summary.unit, browser: summary.browser, interface: summary.interface }));
}
