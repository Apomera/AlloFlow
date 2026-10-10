'use strict';
// Read-only verification of the accepted cutaway and its frozen evidence.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const SOURCE = '3931756397bb4943e201fe8b7761dc9d83facac7421d013d9ddb6d0e7db6c875';
const BASELINE = 'f00632bfe4eb8f57091aca4550b05d0eb0272a745dccbdf7a1f8a8d740d50086';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw Error(message); };
const read = file => fs.readFileSync(path.join(__dirname, file));
const json = file => JSON.parse(read(file));
const inventory = json('artifact-hashes.json');
for (const item of inventory.artifacts) {
  const resolved = path.resolve(__dirname, item.file);
  assert(resolved.startsWith(__dirname + path.sep), 'Artifact escaped report directory');
  assert(hash(fs.readFileSync(resolved)) === item.sha256, 'Artifact changed: ' + item.file);
}
const candidate = read('candidate-runtime.js'), baseline = read('baseline-runtime.js');
assert(hash(candidate) === SOURCE && hash(baseline) === BASELINE, 'Frozen runtime changed');
const changes = json('presentation-changes.json');
assert(changes.sourceSha256 === SOURCE && changes.baselineSha256 === BASELINE, 'Presentation receipt changed');
assert(changes.changes.map(change => change.id).join(',') === 'cutaway-styles,cutaway-renderer,cutaway-workbench', 'Presentation slice boundaries changed');
let restored = candidate.toString('utf8');
for (const change of changes.changes) {
  assert(restored.includes(change.replacement) && restored.indexOf(change.replacement) === restored.lastIndexOf(change.replacement), 'Nonunique presentation slice');
  restored = restored.replace(change.replacement, change.original);
}
assert(Buffer.from(restored).equals(baseline), 'Change outside the three reviewed presentation slices');
new Function(candidate.toString('utf8'));
const browser = json(inventory.browserResults);
assert(browser.successful && browser.errors.length === 0 && browser.failed === 0, 'Browser checks did not pass');
assert(browser.browserClosed && browser.serverClosed, 'Owned QA browser or server did not close');
assert(browser.sourceSha256 === SOURCE && browser.finalSourceSha256 === SOURCE && browser.publicSourceSha256 === SOURCE && browser.finalPublicSourceSha256 === SOURCE, 'Browser runtime receipt changed');
assert(browser.nativePreview.status === 200 && browser.nativePreview.sha256 === SOURCE, 'Native preview did not serve the tested runtime');
assert(browser.checks.every(check => check.passed) && browser.checks.length === browser.passed, 'Browser check count changed');
assert(browser.loadedSources.length === 8 && browser.loadedSources.every(item => item.sha256 === SOURCE), 'Browser loaded different runtime bytes');
assert(browser.captures.length === 8, 'Capture set changed');
for (const capture of browser.captures) {
  const file = path.join(path.dirname(inventory.browserResults), capture.file);
  assert(hash(read(file)) === capture.sha256, 'Capture changed: ' + capture.file);
}
assert(hash(read(path.join(path.dirname(inventory.browserResults), 'tested-harness.cjs'))) === browser.harnessSha256, 'Tested browser harness changed');
const unit = json('unit-receipt.json'), results = json('unit-results.json');
assert(unit.successful && unit.exitCode === 0 && results.success && results.numFailedTests === 0, 'Regression tests did not pass');
assert(unit.sourceSha256 === SOURCE && unit.passed === results.numPassedTests, 'Regression count changed');
assert(JSON.stringify(unit.runtimeBefore) === JSON.stringify(unit.runtimeAfter) && JSON.stringify(unit.testsBefore) === JSON.stringify(unit.testsAfter), 'Regression inputs changed during execution');
assert(unit.runtimeBefore.every(item => item.sha256 === SOURCE), 'Regression runtime receipt changed');
assert(results.testResults.length === 7 && new Set(results.testResults.map(suite => suite.name)).size === 7 && results.testResults.every(suite => suite.status === 'passed' && suite.assertionResults.every(test => test.status === 'passed')), 'Seven distinct passing regression suites required');
assert(results.testResults.reduce((sum, suite) => sum + suite.assertionResults.length, 0) === unit.passed, 'Regression assertion count changed');
for (const file of unit.runs) {
  const run = json(file);
  assert(run.sourceSha256 === SOURCE && JSON.stringify(run.runtimeBefore) === JSON.stringify(run.runtimeAfter) && JSON.stringify(run.testsBefore) === JSON.stringify(run.testsAfter), 'Raw regression inputs changed');
}
const fullRun = json('unit-runs/native-unit-results.json'), comparisonRun = json('unit-runs/comparison-rerun-results.json');
const acceptedSuites = [...fullRun.testResults.filter(suite => suite.status === 'passed'), ...comparisonRun.testResults];
assert(comparisonRun.success && JSON.stringify(acceptedSuites) === JSON.stringify(results.testResults), 'Aggregate differs from the two raw test runs');
const snapshotOnly = process.argv.includes('--snapshot-only');
if (!snapshotOnly) {
  for (const item of [...unit.runtimeBefore, ...unit.testsBefore]) assert(hash(fs.readFileSync(path.join(ROOT, item.file))) === item.sha256, 'Current input changed: ' + item.file);
  assert(hash(fs.readFileSync(path.join(ROOT, 'dev-tools/watercycle_land_cutaway_qa.cjs'))) === browser.harnessSha256, 'Current browser harness changed');
}
console.log(JSON.stringify({ successful: true, sourceSha256: SOURCE, restoredBaselineSha256: hash(Buffer.from(restored)), presentationSlices: 3, browserChecks: browser.passed, regressionTests: unit.passed, captures: browser.captures.length, artifactCount: inventory.artifacts.length, snapshotOnly }));
