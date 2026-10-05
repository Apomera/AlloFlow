const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
// Select the latest complete result for each suite. The final practice rerun
// replaces the earlier SSR-effect assertion; other affected suites already passed.
const suites = new Map();
for (const report of ['unit-results.json', 'final-unit-results.json', 'practice-unit-results.json']) {
  for (const suite of read(report).testResults) suites.set(suite.name, { suite, report });
}
const unitSuites = [...suites.values()].map(({ suite, report }) => {
  assert.equal(suite.status, 'passed', suite.name);
  assert.ok(suite.assertionResults.every(test => test.status === 'passed'), suite.name);
  return { name: path.basename(suite.name), passed: suite.assertionResults.length, resultFile: report };
});
const unitPassed = unitSuites.reduce((sum, suite) => sum + suite.passed, 0);
assert.equal(unitSuites.length, 7); assert.equal(unitPassed, 136);
const focused = fs.readFileSync(path.join(__dirname, 'browser-checks.log'), 'utf8');
const regression = fs.readFileSync(path.join(__dirname, 'regression-browser-checks.log'), 'utf8');
assert.match(focused, /\b8 passed/); assert.match(regression, /\b5 passed/);
const visual = read('after-metrics.json'); assert.equal(visual.length, 14);
assert.ok(visual.every(item => item.errors.length === 0 && item.scrollWidth <= item.width + 1 && item.minimumContrast >= 4.5 && item.minimumTargetHeight >= 43.5));
const canonical = fs.readFileSync('stem_lab/stem_tool_solarsystem.js');
const mirror = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'); assert.ok(canonical.equals(mirror));
const summary = {
  verifiedOn: '2026-10-04', uncommitted: true,
  unitPassed, unitSuites,
  focusedBrowserPassed: 8, regressionBrowserPassed: 5, visualStatesPassed: 14,
  minimumEnabledTextContrast: Math.min(...visual.map(item => item.minimumContrast)),
  minimumVisibleControlHeight: Math.min(...visual.map(item => item.minimumTargetHeight)),
  canonicalMirrorSHA256: crypto.createHash('sha256').update(canonical).digest('hex').toUpperCase(),
};
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
