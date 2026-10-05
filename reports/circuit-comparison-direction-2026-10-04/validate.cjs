const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto'), vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), prior = path.join(root, 'reports/circuit-comparison-notes-2026-10-04');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const sourceFile = 'stem_lab/stem_tool_circuit.js', mirrorFile = 'desktop/web-app/public/stem_lab/stem_tool_circuit.js';
const source = fs.readFileSync(path.join(root, sourceFile)), mirror = fs.readFileSync(path.join(root, mirrorFile));
const preservation = read('source-preservation.json');
assert.ok(source.equals(mirror)); assert.equal(hash(source), preservation.sourceSha256); new vm.Script(source.toString('utf8'));
assert.ok(Buffer.from(source.toString('utf8')).equals(source), 'Source must round-trip as UTF-8');
let baseline = source.toString('utf8');
for (const fragment of [...preservation.changes].reverse()) { assert.equal(baseline.split(fragment.after).length, 2, fragment.name); baseline = baseline.replace(fragment.after, fragment.before); }
assert.equal(hash(baseline), preservation.baselineHash); assert.equal(preservation.changes.length, 7);
const priorValidation = JSON.parse(fs.readFileSync(path.join(prior, 'validation.json'), 'utf8'));
assert.equal(priorValidation.passed, true); assert.equal(priorValidation.sourceSha256, preservation.baselineHash);
const previous = JSON.parse(fs.readFileSync(path.join(prior, 'regression-receipt.json'), 'utf8'));
for (const file of previous.selected) assert.equal(hash(fs.readFileSync(path.join(root, file))), previous.files[file], 'Existing test preserved: ' + file);

const regression = read('regression-receipt.json'), raw = read('regression-raw.json');
assert.equal(regression.passed, true); assert.equal(regression.exitCode, 0); assert.equal(regression.signal, null); assert.equal(regression.processError, null);
assert.equal(regression.expectedAssertions, 132); assert.equal(regression.selected.length, 9); assert.equal(raw.numPassedTests, 132); assert.equal(raw.numFailedTests, 0); assert.equal(raw.success, true);
assert.deepEqual(regression.changedDuringRun, []); assert.equal(hash(fs.readFileSync(path.join(__dirname, 'regression-raw.json'))), regression.rawReportSha256);
for (const [file, sha] of Object.entries(regression.files)) assert.equal(hash(fs.readFileSync(path.join(root, file))), sha, 'Frozen test input: ' + file);
const regressionExit = read('regression-native-exit.json'); assert.equal(regressionExit.exitCode, 0); assert.equal(regressionExit.completed, true);
const firstRun = read('targeted-tests.json'); assert.equal(firstRun.numPassedTests, 13); assert.equal(firstRun.numFailedTests, 2);

const browser = read('browser-results.json'), browserExit = read('browser-native-exit.json'), review = read('visual-review.json');
assert.equal(browser.passed, true); assert.equal(browser.browserClosed, true); assert.deepEqual(browser.errors, []); assert.equal(browser.views.length, 6); assert.equal(browser.workflows.length, 3); assert.equal(browser.screenshots.length, 7);
assert.equal(browser.sourceSha256, hash(source)); assert.equal(browser.scriptSha256, hash(fs.readFileSync(path.join(__dirname, 'browser-check.cjs'))));
assert.equal(browserExit.exitCode, 0); assert.equal(browserExit.completed, true);
assert.equal(review.reviewer, '/root'); assert.equal(review.reviewedAtOriginalResolution, true); assert.equal(review.sourceSha256, hash(source)); assert.equal(review.screenshots.length, 7);
for (const screenshot of browser.screenshots) {
  assert.equal(hash(fs.readFileSync(path.join(__dirname, screenshot.file))), screenshot.sha256);
  const inspected = review.screenshots.find(item => item.file === screenshot.file); assert.ok(inspected); assert.equal(inspected.sha256, screenshot.sha256); assert.equal(inspected.passed, true);
}
for (const view of browser.views) { assert.deepEqual(view.axeViolations, []); assert.deepEqual(view.outside, []); assert.ok(view.pageWidth <= view.width + 1); }

const paths = [sourceFile, mirrorFile, 'tests/circuit_comparison_direction.test.js', 'reports/circuit-comparison-direction-2026-10-04'];
const git = args => { const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }); assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr || result.stdout); return result.stdout.trim(); };
const diffCheck = git(['diff', '--check', '--', ...paths]); assert.equal(diffCheck, '');
const staged = git(['diff', '--cached', '--name-only', '--', ...paths]); assert.equal(staged, '');
const status = git(['status', '--porcelain=v1', '--', ...paths]);
const artifacts = ['source-preservation.json', 'regression-receipt.json', 'regression-native-exit.json', 'browser-results.json', 'browser-native-exit.json', 'visual-review.json', 'test-fixture-correction.json', 'validate.cjs'];
const result = { passed: true, sourceSha256: hash(source), mirrorSha256: hash(mirror), baselineSha256: preservation.baselineHash, previousSourcePreserved: true, existingTestsPreserved: previous.selected.length, reversedFragments: preservation.changes.length, tests: raw.numPassedTests, testFiles: regression.selected.length, newTests: 15, browserViews: browser.views.length, nativeWorkflows: browser.workflows.length, screenshotsReviewed: review.screenshots.length, scopedChangesUnstaged: true, gitDiffCheck: true, scopedGitStatus: status, artifacts: Object.fromEntries(artifacts.map(file => [file, hash(fs.readFileSync(path.join(__dirname, file)))])) };
fs.writeFileSync(path.join(__dirname, 'validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
