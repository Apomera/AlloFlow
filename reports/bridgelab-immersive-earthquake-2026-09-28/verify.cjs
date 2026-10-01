// Run from the repository root after final unit and snapshot reports exist.
const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-immersive-earthquake-2026-09-28/';
const source = fs.readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const mirrors = {};
for (const name of ['stem_tool_bridgelab.js', 'stem_lab_module.js']) {
  const original = fs.readFileSync('stem_lab/' + name, 'utf8');
  const mirror = fs.readFileSync('desktop/web-app/public/stem_lab/' + name, 'utf8');
  if (original !== mirror) throw new Error('Source mirror differs: ' + name);
  acorn.parse(original, { ecmaVersion: 'latest' });
  mirrors[name] = crypto.createHash('sha256').update(original).digest('hex');
}
const keys = new Map();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === '__alloT'
    && typeof node.arguments[0]?.value === 'string' && typeof node.arguments[1]?.value === 'string') {
    const [key, fallback] = node.arguments.map(argument => argument.value);
    if (keys.has(key) && keys.get(key) !== fallback) throw new Error('Conflicting fallback: ' + key);
    keys.set(key, fallback);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(acorn.parse(source, { ecmaVersion: 'latest' }));
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  for (const [key, fallback] of keys) {
    const registered = key.split('.').reduce((value, part) => value?.[part], registry);
    if (registered !== fallback) throw new Error(file + ': fallback mismatch for ' + key);
  }
}
const reports = ['final-unit-results.json', 'final-unit-followup-results.json', 'final-snapshot-results.json'];
const checks = [];
const coveredFiles = new Set();
for (const file of reports) {
  const report = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  if (!report.success) throw new Error('Failed test report: ' + file);
  const assertions = report.testResults.flatMap(suite => suite.assertionResults);
  for (const suite of report.testResults) {
    if (suite.assertionResults.some(test => test.status === 'passed')) {
      coveredFiles.add(suite.name.replaceAll('\\', '/').split('/').pop());
    }
  }
  const failures = assertions.filter(test => test.status === 'failed');
  if (failures.length) throw new Error(JSON.stringify(failures));
  checks.push({ report: file, passed: assertions.filter(test => test.status === 'passed').length,
    skipped: assertions.filter(test => test.status === 'skipped' || test.status === 'pending').length });
}
const expectedFiles = fs.readdirSync('tests').filter(name => /^bridgelab.*\.test\.js$/.test(name)).concat([
  'bridge_buckling_governing_member.test.js', 'stem_fullscreen_live_toggle.test.js',
  'stem_position_bias_fixes_wave4.test.js', 'stem_orbit_camera.test.js',
  'stem_orbit_visibility.test.js', 'stem_sim_tools_golden.test.js'
]);
for (const file of expectedFiles) if (!coveredFiles.has(file)) throw new Error('Missing test results: ' + file);
const browserReports = ['final-browser-results.json', 'followup-browser-results.json'];
const browserChecks = new Map();
const browserRuns = [];
for (const file of browserReports) {
  const report = JSON.parse(fs.readFileSync(folder + file, 'utf8'));
  function collect(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests) {
      browserChecks.set(test.projectName + '::' + spec.title, test.results.at(-1)?.status || 'not run');
    }
    for (const child of suite.suites || []) collect(child);
  }
  report.suites.forEach(collect);
  browserRuns.push({ report: file, ...report.stats });
  if (file === 'followup-browser-results.json' && (report.stats.expected !== 9 || report.stats.unexpected
    || report.stats.flaky || report.stats.skipped || report.errors.length)) {
    throw new Error('Browser follow-up is incomplete or failed: ' + JSON.stringify(report.stats));
  }
}
if (browserChecks.size !== 25 || [...browserChecks.values()].some(status => status !== 'passed')) {
  throw new Error('Some browser checks remain unverified: ' + JSON.stringify([...browserChecks]));
}
const verification = { syntax: 'passed', sourceMirrors: 'identical', sha256: mirrors,
  matchingEnglishKeys: keys.size, missingEnglishKeys: 0, mismatchedEnglishFallbacks: 0,
  testReports: checks, coveredFiles: expectedFiles.length,
  focusedChecksPassed: checks.reduce((sum, report) => sum + report.passed, 0),
  browserRuns, browserChecksPassed: browserChecks.size,
  totalChecksPassed: checks.reduce((sum, report) => sum + report.passed, 0) + browserChecks.size };
fs.writeFileSync(folder + 'source-verification.json', JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify(verification, null, 2));
