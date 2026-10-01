const EXPECTED="384eca9416719d616d50623847aa6fdabec346106967153f678cd76ee508be6c";
const BASELINE="942198fca1f8aae4c530764920afa5ed2fbd10c29b4fee68d7e4be560814d776";
const EXPECTED_BROWSER=653;
const EXPECTED_AUDITS=18;
const REPORT_PINS={
  "baseline-results.json": "5f71651508cb594a6e05ddb585792dbe113b9cfe6c404b19ab575973939a12e3",
  "legacy-results.json": "2fd3ff38bb95d79c01f9e61e1d518d63298cdd295281deedc57126c044b06fba",
  "preflight.json": "550a5bfcb4cc899fde26dbe778b203984e59e0fa9dfbb5c2179c9fdaf0629429",
  "results.json": "66ee0134d80b49b619683ac3875865bed4360f87b5f69c1fc28c2f2d3d0b45b2",
  "final-browser-summary.json": "f3adf5eda445597e62ff7f763962db23463dc51c119cbbe604ac86fd7e20b0f3",
  "unit-results.json": "b55588b233250b84288e477ba269b08928306c47170a62dad1b5d55261c618e3",
  "regression-results.json": "5025a8daeb0074cb17645b9064563e6836a6c9a5eb5acb252b1ebc30081eb7b2",
  "preview-check.json": "95b611c813424442ff95437706ff2dbf5b17cc2464ac8c9b9b5f65d25d5a6563"
};

const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm'), acorn = require('acorn');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const checks = [];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileSha = file => hash(fs.readFileSync(path.join(root, file)));
const json = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
function check(label, passed) { checks.push({ label, passed: !!passed }); if (!passed) throw new Error(label); }
function command(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  if (result.error) throw result.error;
  check('git ' + args.join(' '), result.status === 0);
  return result.stdout.trim();
}
function tests(report, count, files) {
  const items = report.testResults.flatMap(file => file.assertionResults.map(test => ({ name: path.relative(root, file.name).replace(/\\/g, '/') + ' :: ' + test.fullName, status: test.status })));
  check('All ' + count + ' tests passed without skips', report.success && report.numTotalTests === count && report.numPassedTests === count && report.numFailedTests === 0 && report.numPendingTests === 0 && report.numTodoTests === 0 && items.length === count && items.every(test => test.status === 'passed'));
  const meta = report.waterCycleNotebookVerification;
  check('Test report pins final source/public', meta.sourceSha256 === EXPECTED && meta.publicSha256 === EXPECTED && meta.sourcePublicIdentical);
  check('Test file pins match', report.testResults.length === files && meta.testFiles.length === files && meta.testFiles.every(file => fileSha(file.path) === file.sha256));
  return items;
}
function extract(source, names) {
  const pending = [acorn.parse(source, { ecmaVersion: 'latest' })], result = {};
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    let name = (node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator') && node.id && node.id.name;
    if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'Identifier') name = node.left.name + ':assignment';
    if (names.includes(name)) {
      if (result[name]) throw new Error('Non-unique calculation/state anchor: ' + name);
      result[name] = source.slice(node.start, node.end);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  return result;
}
function slice(source, start, end) {
  check('Unique derivation start ' + start, source.split(start).length === 2);
  const first = source.indexOf(start), last = source.indexOf(end, first);
  check('Derivation end found ' + end, last > first);
  return source.slice(first, last);
}
check('Current runtime hash', fileSha('stem_lab/stem_tool_watercycle.js') === EXPECTED);
check('Public mirror hash', fileSha('desktop/web-app/public/stem_lab/stem_tool_watercycle.js') === EXPECTED);
check('Frozen tested runtime hash', fileSha('reports/watercycle-notebook-clarity/tested-runtime.js') === EXPECTED);
check('Frozen baseline hash', fileSha('reports/watercycle-notebook-clarity/baseline-runtime.js') === BASELINE);
for (const [file, sha] of Object.entries(REPORT_PINS)) check('Report hash ' + file, fileSha('reports/watercycle-notebook-clarity/' + file) === sha);
for (const file of ['baseline-results.json', 'legacy-results.json']) {
  const report = json(file);
  check('Baseline inspection completed: ' + file, report.completed && report.successful && report.browserClosed && report.serverClosed && report.errors.length === 0 && report.sourceSha256 === BASELINE);
}
const preflight = json('preflight.json');
check('Final preflight passed and closed', preflight.completed && preflight.successful && preflight.failed === 0 && preflight.errors.length === 0 && preflight.browserClosed && preflight.serverClosed && preflight.sourceSha256 === EXPECTED);
const browser = json('results.json');
check('Final browser source pinned', browser.sourceSha256 === EXPECTED && browser.publicSha256 === EXPECTED && browser.finalSourceSha256 === EXPECTED && browser.finalPublicSha256 === EXPECTED);
check('Final browser checks passed', browser.completed && browser.successful && browser.failed === 0 && browser.failures.length === 0 && browser.errors.length === 0 && browser.passed === EXPECTED_BROWSER && browser.checks.length === EXPECTED_BROWSER && browser.checks.every(check => check.pass));
check('All scoped accessibility audits clean', browser.audits.length === EXPECTED_AUDITS && browser.audits.every(audit => audit.violations.length === 0));
check('QA browser and ephemeral server closed', browser.browserClosed && browser.serverClosed);
const unit = json('unit-results.json'), regression = json('regression-results.json');
const assertions = [...tests(unit, 57, 4), ...tests(regression, 23, 3)];
check('80 distinct test assertions', assertions.length === 80 && new Set(assertions.map(test => test.name)).size === 80);
const anchors = unit.waterCycleNotebookVerification.baselinePreservation;
check('34 unique calculation/state anchors', anchors.length === 34 && new Set(anchors.map(anchor => anchor.name)).size === 34);
const before = fs.readFileSync(path.join(__dirname, 'baseline-runtime.js'), 'utf8').replace(/\r\n/g, '\n');
const after = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js'), 'utf8').replace(/\r\n/g, '\n');
const names = anchors.map(anchor => anchor.name), oldNodes = extract(before, names), newNodes = extract(after, names);
for (const anchor of anchors) check('Unchanged calculation/state ' + anchor.name, anchor.unchanged && oldNodes[anchor.name] && newNodes[anchor.name] && oldNodes[anchor.name] === newNodes[anchor.name] && hash(oldNodes[anchor.name]) === anchor.baselineSha256 && hash(newNodes[anchor.name]) === anchor.currentSha256);
const derivations = [];
for (const [start, end] of [['var wcScenarioBaseline = d.wcScenarioBaseline || null;', 'var wcRouteBaselineActive'], ['var wcCausalStageIds = [];', 'var wcDataTrailStatus']]) {
  const oldCode = slice(before, start, end), newCode = slice(after, start, end);
  check('Unchanged full derivation ' + start, oldCode === newCode);
  derivations.push({ start, end, sha256: hash(newCode), unchanged: true });
}
for (const file of ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js', 'dev-tools/watercycle_notebook_clarity_qa.cjs']) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  check('JavaScript syntax ' + file, true);
}
const preview = json('preview-check.json');
check('Local preview serves final runtime', preview.successful && preview.rootStatus === 200 && preview.runtimeStatus === 200 && preview.servedRuntimeSha256 === EXPECTED && preview.sourceSha256 === EXPECTED && preview.publicSha256 === EXPECTED);
for (const match of fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  const target = match[1];
  if (/^https?:\/\//.test(target) || target === 'verification-summary.json') continue;
  check('Review artifact exists: ' + target, fs.existsSync(path.join(__dirname, target)));
}
const scope = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js', 'tests/watercycle_notebook_clarity.test.js', 'tests/watercycle_experiment_trail.test.js', 'tests/watercycle_replay_indicator.test.js', 'dev-tools/watercycle_notebook_clarity_qa.cjs', 'docs/water-cycle-visual-design.md', 'reports/watercycle-notebook-clarity'];
command(['diff', '--check', '--', ...scope]);
check('No enhancement files staged', command(['diff', '--cached', '--name-only', '--', ...scope]) === '');
const summary = { title: 'Water Cycle evidence notebook clarity: final verification', recordedAt: new Date().toISOString(), successful: true, sourceSha256: EXPECTED, publicSha256: EXPECTED, baselineSha256: BASELINE, reportSha256: REPORT_PINS, tests: { total: 80, passed: 80, focused: 20, existingNotebook: 37, comparisonRegression: 23, distinctFiles: 7, skipped: 0 }, browser: { passed: EXPECTED_BROWSER, failed: 0, snapshots: browser.cases.length, scopedAccessibilityAudits: EXPECTED_AUDITS, violations: 0, browserClosed: true, serverClosed: true }, unchangedCalculationAndStateAnchors: 34, derivations, preview, git: { scopedWhitespaceCheckPassed: true, stagedEnhancementFiles: [] }, checks };
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ successful: true, tests: 80, browserChecks: EXPECTED_BROWSER, accessibilityAudits: EXPECTED_AUDITS, sourceSha256: EXPECTED, verificationChecks: checks.length, stagedEnhancementFiles: [] }, null, 2));
