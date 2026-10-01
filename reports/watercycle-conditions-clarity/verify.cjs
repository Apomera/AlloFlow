const EXPECTED_FINAL = "239edf53b437848623cec592f72644ee69e6eb000b887e113175e09740b16003";
const EXPECTED_BASELINE = "d43969e8c5824b6f2b94b2b7e29b51ef33a24833495059c79cad6e9551951061";
const EXPECTED_REPORTS = {
  "baseline-results.json": "50037a3399585e7f7176a1868e1f24b27821306ee04a053ab90bc58ead08791a",
  "results.json": "7c6dc9a567de1af9911f5c9a9b2f8762cf421dcde75021a4163653cb923ea216",
  "unit-results.json": "536246b6cbe9f9b54611eb8239306317a97847c40184e9357695a8c727814c6b",
  "regression-results.json": "3ba60ca4c2d934324ccec405d4853dff3616fc86bb67ad6601ad9dd8ef3a3755"
};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const acorn = require('acorn');
const root = path.resolve(__dirname, '../..');
const checks = [];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileSha = file => sha(fs.readFileSync(path.join(root, file)));
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
function check(label, passed) {
  checks.push({ label, passed: !!passed });
  if (!passed) throw new Error(label);
}
function run(program, args) {
  const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  if (result.error) throw result.error;
  check(program + ' ' + args.join(' '), result.status === 0);
  return result.stdout.trim();
}
function assertions(report) {
  return report.testResults.flatMap(file => file.assertionResults.map(test => ({
    name: path.relative(root, file.name).replace(/\\/g, '/') + ' :: ' + test.fullName,
    status: test.status,
  })));
}
function verifyTestReport(report, expected, expectedFiles) {
  const items = assertions(report);
  check('Test report is successful with ' + expected + ' passing tests', report.success && report.numTotalTests === expected && report.numPassedTests === expected && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0);
  check('All recorded assertions passed', items.length === expected && items.every(x => x.status === 'passed'));
  check('Expected number of test files', report.testResults.length === expectedFiles);
  const meta = report.waterCycleConditionsVerification;
  check('Test run pins the final source and public hashes', meta.sourceSha256 === EXPECTED_FINAL && meta.publicSha256 === EXPECTED_FINAL && meta.sourcePublicIdentical);
  check('Test files match their recorded hashes', meta.testFiles.length === expectedFiles && meta.testFiles.every(x => fileSha(x.path) === x.sha256));
  return items;
}
function anchors(file, names) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  const tree = acorn.parse(source, { ecmaVersion: 'latest' });
  const selected = {};
  const nodes = [tree];
  while (nodes.length) {
    const node = nodes.pop();
    if (!node || typeof node !== 'object') continue;
    const name = (node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator') && node.id && node.id.name;
    if (names.includes(name)) {
      if (selected[name]) throw new Error('Non-unique production anchor: ' + name);
      selected[name] = source.slice(node.start, node.end);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) nodes.push(...value);
      else if (value && typeof value === 'object') nodes.push(value);
    }
  }
  return selected;
}

check('Final source hash matches', fileSha('stem_lab/stem_tool_watercycle.js') === EXPECTED_FINAL);
check('Final public mirror hash matches', fileSha('desktop/web-app/public/stem_lab/stem_tool_watercycle.js') === EXPECTED_FINAL);
check('Frozen final runtime hash matches', fileSha('reports/watercycle-conditions-clarity/tested-runtime.js') === EXPECTED_FINAL);
check('Frozen baseline hash matches', fileSha('reports/watercycle-conditions-clarity/baseline-runtime.js') === EXPECTED_BASELINE);
for (const [file, expected] of Object.entries(EXPECTED_REPORTS)) {
  check('Recorded report hash: ' + file, fileSha('reports/watercycle-conditions-clarity/' + file) === expected);
}

const baseline = read('baseline-results.json');
check('Baseline review completed and owned resources closed', baseline.completed && baseline.successful && baseline.browserClosed && baseline.serverClosed && baseline.errors.length === 0 && baseline.sourceSha256 === EXPECTED_BASELINE);
const browser = read('results.json');
check('Browser review completed on the exact final runtime', browser.completed && browser.successful && browser.sourceSha256 === EXPECTED_FINAL && browser.publicSha256 === EXPECTED_FINAL && browser.finalLiveSourceSha256 === EXPECTED_FINAL);
check('All 771 browser checks passed', browser.passed === 771 && browser.failed === 0 && browser.checks.length === 771 && browser.checks.every(x => x.pass) && browser.failures.length === 0 && browser.errors.length === 0);
check('135 browser snapshots recorded', browser.cases.length === 135);
check('18 scoped accessibility audits have zero violations', browser.audits.length === 18 && browser.audits.every(x => x.violations.length === 0));
check('QA browser and server closed', browser.browserClosed && browser.serverClosed);
const unit = read('unit-results.json');
const regression = read('regression-results.json');
const testItems = [...verifyTestReport(unit, 18, 2), ...verifyTestReport(regression, 119, 7)];
check('137 distinct passing tests, with no duplicated assertions', testItems.length === 137 && new Set(testItems.map(x => x.name)).size === 137);
const preserved = unit.waterCycleConditionsVerification.baselinePreservation;
check('15 calculation and state anchors recorded', preserved.length === 15 && new Set(preserved.map(x => x.name)).size === 15);
const names = preserved.map(x => x.name);
const oldCode = anchors('reports/watercycle-conditions-clarity/baseline-runtime.js', names);
const newCode = anchors('stem_lab/stem_tool_watercycle.js', names);
for (const item of preserved) {
  check('Unchanged calculation/state block: ' + item.name, item.unchanged && oldCode[item.name] && newCode[item.name] && oldCode[item.name] === newCode[item.name] && sha(oldCode[item.name]) === item.baselineSha256 && sha(newCode[item.name]) === item.currentSha256);
}
run(process.execPath, ['--check', 'stem_lab/stem_tool_watercycle.js']);
run(process.execPath, ['--check', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js']);
run(process.execPath, ['--check', 'dev-tools/watercycle_conditions_clarity_qa.cjs']);
const scope = [
  'stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
  'tests/watercycle_conditions_clarity.test.js', 'tests/watercycle_controls_a11y.test.js',
  'dev-tools/watercycle_conditions_clarity_qa.cjs', 'docs/water-cycle-visual-design.md',
  'reports/watercycle-conditions-clarity',
];
run('git', ['diff', '--check', '--', ...scope]);
const staged = run('git', ['diff', '--cached', '--name-only', '--', ...scope]);
check('No enhancement files staged', staged === '');
const summary = {
  title: 'Water Cycle Conditions clarity: final verification',
  recordedAt: new Date().toISOString(),
  successful: true,
  sourceSha256: EXPECTED_FINAL,
  publicSha256: EXPECTED_FINAL,
  baselineSha256: EXPECTED_BASELINE,
  reportSha256: EXPECTED_REPORTS,
  tests: { total: 137, passed: 137, focused: 18, regression: 119, distinctFiles: 9, skipped: 0 },
  browser: { passed: 771, failed: 0, snapshots: 135, scopedAccessibilityAudits: 18, violations: 0, browserClosed: true, serverClosed: true },
  unchangedCalculationAndStateBlocks: 15,
  git: { scopedWhitespaceCheckPassed: true, stagedEnhancementFiles: [] },
  checks,
};
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ successful: true, tests: 137, browserChecks: 771, accessibilityAudits: 18, sourceSha256: EXPECTED_FINAL, verificationChecks: checks.length, stagedEnhancementFiles: [] }, null, 2));
