const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-comparison-2026-09-29/';
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
const unit = JSON.parse(fs.readFileSync(folder + 'regression-unit-results.json', 'utf8'));
if (!unit.success || unit.numFailedTests || unit.numFailedTestSuites) throw new Error('Unit runner reported failures');
const completed = new Set();
let checks = 0;
for (const suite of unit.testResults) {
  const name = suite.name.replaceAll('\\', '/').split('/').pop();
  for (const test of suite.assertionResults) {
    if (test.status === 'failed') throw new Error('Failed assertion: ' + test.fullName);
    if (test.status === 'passed') { completed.add(name); checks++; }
  }
}
const expected = fs.readdirSync('tests').filter(name => /^bridgelab.*\.test\.js$/.test(name)).concat([
  'bridge_buckling_governing_member.test.js', 'stem_fullscreen_live_toggle.test.js',
  'stem_position_bias_fixes_wave4.test.js', 'stem_orbit_camera.test.js',
  'stem_orbit_visibility.test.js', 'stem_sim_tools_golden.test.js'
]);
for (const name of expected) if (!completed.has(name)) throw new Error('No completed results for ' + name);
const browser = JSON.parse(fs.readFileSync(folder + 'browser-final-results.json', 'utf8'));
if (browser.errors.length || browser.stats.unexpected || browser.stats.flaky || browser.stats.skipped || browser.stats.expected !== 14) throw new Error('Browser coverage incomplete');
const result = {
  syntax: 'passed', sourceMirrors: 'identical',
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  matchingEnglishKeys: keys.size, coveredTestFiles: completed.size,
  unitAndSnapshotChecksPassed: checks, browserChecksPassed: browser.stats.expected,
  totalDistinctChecksPassed: checks + browser.stats.expected,
  unitReport: 'regression-unit-results.json', browserReport: 'browser-final-results.json'
};
fs.writeFileSync(folder + 'source-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
