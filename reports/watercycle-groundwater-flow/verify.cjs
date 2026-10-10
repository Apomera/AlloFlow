'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const dir = __dirname, root = process.env.WC_REPO || path.resolve(dir, '../..');
const BASELINE_SHA = '906f5470210c266c4c0fd7bebba5874fa081fd53cfbb9ca48bb283fed59a70ef';
const RUNTIMES = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TESTS = ['tests/watercycle_groundwater_flow.test.js', 'tests/watercycle_groundwater_lens.test.js', 'tests/watercycle_investigation.test.js'];
const THEMES = ['desktop-light','desktop-dark','phone320-light','phone390-dark','host400-dark','phone320-contrast','phone320-forced','phone390-zoom150'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (ok, message) => { if (!ok) throw Error(message); };
const safe = name => typeof name === 'string' && name.length && !path.isAbsolute(name) && !name.split(/[\\/]/).some(part => !part || part === '..' || part === '.');
const read = name => { assert(safe(name), 'Unsafe artifact path'); return fs.readFileSync(path.join(dir, name)); };
const json = name => JSON.parse(read(name));
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const proof = json('source-proof.json'), inventory = json('artifact-hashes.json');
assert(proof.baselineSHA256 === BASELINE_SHA && proof.mirrorEqual === true && proof.existingSourceBytesPreserved === true, 'Source proof is incomplete');
assert(Array.isArray(inventory) && inventory.length && new Set(inventory.map(item => item.path)).size === inventory.length, 'Artifact inventory is empty or duplicated');
for (const item of inventory) {
  const bytes = read(item.path);
  assert(bytes.length === item.bytes && hash(bytes) === item.sha256, 'Artifact changed: ' + item.path);
}
function filesIn(directory, prefix='') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const name = prefix + entry.name, file = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), 'Unexpected artifact symlink: ' + name);
    if (entry.isDirectory()) files.push(...filesIn(file, name + '/'));
    else if (entry.isFile() && name !== 'artifact-hashes.json') files.push(name);
    else if (!entry.isFile()) throw Error('Unexpected artifact type: ' + name);
  }
  return files.sort();
}
assert(same(filesIn(dir), inventory.map(item => item.path).sort()), 'Uninventoried or missing artifacts');
const source = fs.readFileSync(path.join(root, RUNTIMES[0]));
for (const file of RUNTIMES) assert(hash(fs.readFileSync(path.join(root, file))) === proof.candidateSHA256, 'Installed runtime differs: ' + file);
new vm.Script(source.toString('utf8'));
let baseline = source.toString('utf8');
assert(proof.additions.length === 5 && new Set(proof.additions.map(item => item.name)).size === 5, 'Expected five unique source additions');
for (const addition of [...proof.additions].reverse()) {
  assert(hash(addition.addition) === addition.sha256 && Buffer.byteLength(addition.addition) === addition.bytes, 'Addition metadata differs: ' + addition.name);
  assert(baseline.split(addition.addition).length === 2, 'Nonunique source addition: ' + addition.name);
  baseline = baseline.replace(addition.addition, '');
}
assert(hash(baseline) === BASELINE_SHA, 'Earlier source bytes changed');
new vm.Script(baseline);

const unit = json('unit/unit-receipt.json'), result = json('unit/' + unit.resultFile);
assert(unit.successful === true && unit.sourceSha256 === proof.candidateSHA256 && unit.exitCode === 0 && !unit.signal && !unit.errors.length, 'Unit receipt did not pass on this source');
assert(unit.passed > 0 && unit.passed === unit.total && unit.failed === 0 && unit.skipped === 0 && unit.suiteCount === 3, 'Unit count differs');
assert(same(unit.files, TESTS), 'Wrong focused unit suites');
assert(result.success === true && result.numTotalTests === unit.total && result.numPassedTests === unit.passed && result.numFailedTests === 0 && result.numPendingTests === 0 && !result.numTodoTests, 'Raw unit result differs');
assert(result.testResults.length === 3 && result.testResults.every(suite => suite.status === 'passed' && suite.assertionResults.length > 0), 'A focused suite did not pass');
const assertions = result.testResults.flatMap(suite => suite.assertionResults);
assert(assertions.length === unit.total && assertions.every(test => test.status === 'passed') && new Set(assertions.map(test => test.fullName)).size === assertions.length, 'Raw assertions are incomplete or duplicated');
assert(hash(read('unit/' + unit.resultFile)) === unit.resultSha256 && hash(read('unit/' + unit.logFile)) === unit.logSha256, 'Unit result/log hashes differ');
for (const name of ['runtime','tests','helpers','support','executionInputs']) assert(Array.isArray(unit[name + 'Before']) && same(unit[name + 'Before'], unit[name + 'After']), 'Unit inputs changed: ' + name);
assert(same(unit.runtimeBefore.map(item => item.file).sort(), [...RUNTIMES].sort()) && unit.runtimeBefore.every(item => item.sha256 === proof.candidateSHA256), 'Unit runtime stamps differ');
assert(same(unit.testsBefore.map(item => item.file), TESTS), 'Unit test stamps differ');
for (const item of unit.testsBefore) assert(hash(read('unit/inputs/' + item.file)) === item.sha256, 'Frozen tested input differs: ' + item.file);
assert(same(unit.executionInputsBefore.map(item => item.file).sort(), ['groundwater-vitest.config.mjs','run-tests-node.cjs'].sort()), 'Native execution inputs differ');
for (const item of unit.executionInputsBefore) assert(hash(read('unit/' + item.file)) === item.sha256, 'Runner/config differs: ' + item.file);
for (const item of [...unit.helpersBefore,...unit.supportBefore]) assert(safe(item.file) && hash(fs.readFileSync(path.join(root, item.file))) === item.sha256, 'Existing test dependency differs: ' + item.file);
assert(unit.loadedReports.length === 2 && new Set(unit.loadedReports.map(item => item.file)).size === 2, 'Actual loaded-source reports missing');
for (const item of unit.loadedReports) {
  const bytes = read('unit/' + item.file), loaded = JSON.parse(bytes);
  assert(bytes.length === item.bytes && hash(bytes) === item.sha256, 'Actual loaded report differs: ' + item.file);
  assert(same(loaded.loadedRuntimes.map(runtime => runtime.path).sort(), [...RUNTIMES].sort()) && loaded.loadedRuntimes.every(runtime => runtime.sha256 === proof.candidateSHA256 && runtime.bytes === source.length), 'VM loaded different runtime bytes');
  const tested = unit.testsBefore.find(test => test.file === loaded.loadedTest.path);
  assert(tested && [TESTS[0],TESTS[1]].includes(tested.file) && loaded.loadedTest.sha256 === tested.sha256 && loaded.loadedTest.bytes === read('unit/inputs/' + tested.file).length, 'VM loaded a different test');
}

const browser = json('browser/results.json');
assert(browser.successful === true && browser.completed === true && browser.failed === 0 && !browser.errors.length && browser.browserClosed === true && browser.serverClosed === true, 'Browser evidence did not finish cleanly');
assert(browser.sourceSha256 === proof.candidateSHA256 && browser.publicSourceSha256 === proof.candidateSHA256 && browser.baselineSha256 === BASELINE_SHA, 'Browser source stamps differ');
assert(browser.checks.length > 0 && browser.passed === browser.checks.length && browser.checks.every(check => check.passed === true), 'Browser checks differ');
assert(browser.predictionCases.length === 9 && browser.cases.length === 8 && same(browser.cases.map(item => item.name).sort(), [...THEMES].sort()), 'Three-setup or theme coverage differs');
assert(browser.audits.length === 8 && same(browser.audits.map(item => item.name).sort(), [...THEMES].sort()) && browser.audits.every(audit => audit.violations.length === 0), 'Scoped accessibility audit failed');
assert(browser.captures.length === 10 && new Set(browser.captures.map(item => item.file)).size === 10, 'Folded, prediction, and theme captures missing');
assert(browser.loadedSources.length >= 10 && browser.loadedSources.some(item => item.baseline) && browser.loadedSources.every(item => item.sha256 === (item.baseline ? BASELINE_SHA : proof.candidateSHA256)), 'Browser actually loaded different source bytes');
assert(hash(read('browser/tested-harness.cjs')) === browser.harnessSha256, 'Tested browser harness differs');
assert(hash(fs.readFileSync(path.join(root, 'dev-tools/watercycle_groundwater_flow_qa.cjs'))) === browser.harnessSha256, 'Installed QA harness differs');
for (const capture of browser.captures) {
  const bytes = read('browser/' + capture.file);
  assert(capture.sourceSha256 === proof.candidateSHA256 && hash(bytes) === capture.sha256 && bytes.length === capture.bytes && bytes.readUInt32BE(16) === capture.width && bytes.readUInt32BE(20) === capture.height, 'Capture metadata differs: ' + capture.file);
}
const baselineFlag = process.argv.indexOf('--write-baseline');
if (baselineFlag >= 0) {
  const destination = process.argv[baselineFlag + 1]; assert(destination, 'Baseline destination required');
  if (fs.existsSync(destination)) assert(hash(fs.readFileSync(destination)) === BASELINE_SHA, 'Refusing to overwrite another baseline file');
  else fs.writeFileSync(destination, baseline, { flag:'wx' });
}
console.log(JSON.stringify({ successful:true, sourceSha256:proof.candidateSHA256, existingSourceBytesPreserved:true, unitTests:unit.passed, browserChecks:browser.passed, accessibilityAudits:browser.audits.length, artifacts:inventory.length }));
