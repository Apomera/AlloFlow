const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8').replace(/^\uFEFF/, ''));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const source = 'stem_lab/stem_tool_circuit.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const sourceHash = hash(source);
const browser = read('browser-results.json');
assert.equal(hash(mirror), sourceHash, 'Source and deployment copy must match');
assert.equal(browser.sourceSha256, sourceHash, 'Browser evidence must match the current source');
assert.equal(browser.passed, true);
assert.equal(browser.errors.length, 0);
assert.equal(browser.axe.reduce((total, scan) => total + scan.violations.length, 0), 0);
assert.ok(browser.layouts.every(check => check.scrollWidth <= check.width));

const initial = read('regression-initial.json');
const rerun = read('regression-rerun.json');
const focus = read('regression-focus.json');
assert.equal(rerun.success, true, 'The rerun must finish successfully');
assert.equal(rerun.numFailedTests, 0);
assert.equal(focus.success, true, 'The focus follow-up checks must finish successfully');
assert.equal(focus.numFailedTests, 0);
const cases = ['onboarding', 'guided_journey', 'workbench_guide', 'challenge_engagement',
  'learning', 'learning_regressions', 'investigation', 'reorder_parts', 'a11y',
  'svg_alternatives_a11y', 'workspace_tabs_a11y', 'localization', 'snapshots',
  'reference_workflows', 'confirmation_dialog_a11y', 'form_labels_a11y',
  'reduced_motion_a11y', 'canvas_alternative_a11y', 'table_semantics_a11y',
  'ai_tutor', 'files', 'model', 'panels_smoke', 'image_export', 'meter_safety', 'probe_practice'];
const byName = new Map();
for (const [run, result] of [['regression-initial.json', initial], ['regression-rerun.json', rerun], ['regression-focus.json', focus]]) {
  for (const suite of result.testResults) byName.set(path.basename(suite.name), { run, suite });
}
const suites = cases.map(name => {
  const file = `circuit_${name}.test.js`;
  const found = byName.get(file);
  assert.ok(found, `Missing suite: ${file}`);
  assert.equal(found.suite.status, 'passed', `Suite failed: ${file}`);
  assert.ok(found.suite.assertionResults.length > 0, `Empty suite: ${file}`);
  assert.ok(found.suite.assertionResults.every(test => test.status === 'passed'), `Incomplete assertions: ${file}`);
  return { file: `tests/${file}`, resultFile: found.run, passed: found.suite.assertionResults.length };
});
const regression = {
  scope: 'Affected onboarding, learning, targets, history, accessibility, and Simple circuit suites',
  method: 'Use the latest result for each file. Ten suites passed in the initial run; the six setup-timeout suites and ten missing suites were rerun with one worker. The final narrow focus change was followed by another run of the affected learning and onboarding suites and the complete browser workflow checks.',
  files: suites.length,
  total: suites.reduce((total, suite) => total + suite.passed, 0),
  passed: suites.reduce((total, suite) => total + suite.passed, 0),
  failed: 0,
  pending: 0,
  suites
};
execFileSync(process.execPath, ['--check', source], { cwd: root, stdio: 'pipe' });
execFileSync('git', ['diff', '--check', '--', source, mirror,
  'tests/circuit_onboarding.test.js', 'tests/circuit_guided_journey.test.js',
  'tests/circuit_workbench_guide.test.js', 'tests/circuit_challenge_engagement.test.js',
  'tests/circuit_reorder_parts.test.js', 'tests/circuit_svg_alternatives_a11y.test.js'],
  { cwd: root, stdio: 'pipe' });
write('regression-combined.json', regression);
const summary = {
  verifiedAt: new Date().toISOString(),
  source: { path: source, sha256: sourceHash, mirror, mirrorMatches: true },
  regression,
  browser: { workflows: browser.checks.length, axeScans: browser.axe.length,
    violations: 0, layoutChecks: browser.layouts.length, pageErrors: browser.errors.length },
  syntaxCheck: 'passed',
  patchWhitespaceCheck: 'passed'
};
write('validation-summary.json', summary);
console.log(JSON.stringify({ tests: regression.passed, files: regression.files, browser: summary.browser, sourceHash }, null, 2));
