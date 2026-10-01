const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-investigation-2026-09-29/';
const source = fs.readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
if (source !== fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_bridgelab.js', 'utf8')) throw new Error('Bridge mirrors differ');
const keys = new Map();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === '__alloT'
    && typeof node.arguments[0]?.value === 'string' && typeof node.arguments[1]?.value === 'string') {
    const [key, value] = node.arguments.map(argument => argument.value);
    if (keys.has(key) && keys.get(key) !== value) throw new Error('Conflicting fallback: ' + key);
    keys.set(key, value);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(acorn.parse(source, { ecmaVersion: 'latest' }));
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  for (const [key, value] of keys) {
    if (key.split('.').reduce((object, part) => object?.[part], registry) !== value) throw new Error(file + ': mismatch for ' + key);
  }
}
const tests = new Map(), covered = new Set();
const unitReports = ['initial-unit-results.json', 'regression-unit-results.json'];
for (const file of fs.readdirSync(folder).filter(name => /^followup-unit-.*\.json$/.test(name)).sort()) unitReports.push(file);
for (const file of unitReports) {
  const report = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  for (const suite of report.testResults) {
    const name = suite.name.replaceAll('\\', '/').split('/').pop();
    for (const test of suite.assertionResults) if (test.status === 'passed' || test.status === 'failed') {
      tests.set(name + '::' + test.fullName, test.status);
      covered.add(name);
    }
  }
}
if ([...tests.values()].some(status => status !== 'passed')) throw new Error('Unit assertions remain failed');
const expectedFiles = fs.readdirSync('tests').filter(name => /^bridgelab.*\.test\.js$/.test(name)).concat([
  'bridge_buckling_governing_member.test.js', 'stem_fullscreen_live_toggle.test.js',
  'stem_position_bias_fixes_wave4.test.js', 'stem_orbit_camera.test.js',
  'stem_orbit_visibility.test.js', 'stem_sim_tools_golden.test.js'
]);
for (const name of expectedFiles) if (!covered.has(name)) throw new Error('No completed results for ' + name);
const browserTests = new Map();
const browserReports = ['browser-results.json', 'browser-final-results.json'];
for (const file of browserReports) {
  const report = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  if (report.errors.length || report.stats.unexpected || report.stats.flaky || report.stats.skipped) throw new Error('Browser runner failed: ' + file);
  function collect(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests) {
      browserTests.set(test.projectName + '::' + spec.title, test.results.at(-1)?.status || 'not run');
    }
    for (const child of suite.suites || []) collect(child);
  }
  report.suites.forEach(collect);
}
if (browserTests.size !== 8 || [...browserTests.values()].some(status => status !== 'passed')) throw new Error('Browser coverage incomplete');
const result = { syntax: 'passed', sourceMirrors: 'identical',
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  matchingEnglishKeys: keys.size, missingOrMismatchedEnglishKeys: 0,
  unitReports, coveredTestFiles: covered.size, unitAndSnapshotChecksPassed: tests.size,
  browserReports, distinctBrowserChecksPassed: browserTests.size, totalDistinctChecksPassed: tests.size + browserTests.size };
fs.writeFileSync(folder + 'source-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
