'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(__dirname, name));
const json = name => JSON.parse(read(name));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = json('manifest.json');
for (const file of manifest.files) {
 const bytes = read(file.name);
 assert.equal(bytes.length, file.bytes, file.name + ' size');
 assert.equal(sha(bytes), file.sha256, file.name + ' hash');
}
const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const sources = paths.map(file => {
 const bytes = fs.readFileSync(path.join(root, file));
 assert.equal(sha(bytes), manifest.sourceSHA256, file + ' hash');
 new vm.Script(bytes.toString('utf8'), { filename: file });
 return bytes.toString('utf8');
});
assert.equal(sources[0], sources[1], 'mirrored runtime');
let baseline = sources[0];
for (const name of ['contrast-changes.json', 'refine-changes.json', 'changes.json']) {
 const delta = json(name);
 assert.equal(sha(baseline), delta.after, name + ' final hash');
 for (const change of [...delta.changes].reverse()) {
  assert.equal(baseline.split(change.after).length - 1, 1, name + ' unique reversal');
  baseline = baseline.replace(change.after, change.before);
 }
 assert.equal(sha(baseline), delta.before, name + ' starting hash');
}
const review = json('review-readonly-result.json');
assert.equal(sha(baseline), review.baseline);
assert.equal(review.current, manifest.sourceSHA256);
assert.equal(review.exactReversal, true);
function section(source, name) {
 const start = source.indexOf('  function ' + name + '(');
 assert(start >= 0, name + ' exists');
 const end = source.indexOf('\n  function ', start + 2);
 return source.slice(start, end < 0 ? undefined : end);
}
for (const body of review.bodies) {
 assert.equal(body.unchanged, true, body.name);
 assert.equal(section(sources[0], body.name), section(baseline, body.name), body.name);
 assert.equal(sha(section(sources[0], body.name)), body.sha256, body.name + ' hash');
}
const unit = json('actual-source-results.json');
const unitRun = json('actual-source-run.json');
assert.equal(unit.success, true);
assert.equal(unit.numPassedTests, 11);
assert.equal(unit.numFailedTests, 0);
assert.equal(unitRun.exitCode, 0);
assert.equal(unitRun.runtimesUnchanged, true);
assert.equal(unitRun.expectedSHA256, manifest.sourceSHA256);
assert.equal(sha(fs.readFileSync(path.join(root, unitRun.test.path))), unitRun.test.sha256);
for (const snapshot of [...unitRun.before, ...unitRun.after]) assert.equal(snapshot.sha256, manifest.sourceSHA256);
const browser = json('browser-results.json');
assert.equal(browser.passed, true);
assert.equal(browser.cases.length, 14);
assert.equal(browser.captures.length, 11);
assert.equal(browser.layouts.length, 11);
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.failedRequests, []);
assert.equal(browser.keyboard.compareButtonSpaceOpensAndFocuses, true);
assert.equal(browser.keyboard.nativeSliderArrowUpdatesGraph, true);
for (const hashes of [browser.startHashes, browser.endHashes]) {
 for (const file of paths) assert.equal(hashes[file], manifest.sourceSHA256);
}
for (const layout of browser.layouts) {
 assert.equal(layout.documentOverflow, false, layout.name);
 assert.deepEqual(layout.overflowingElements, [], layout.name);
}
for (const capture of browser.captures) assert(manifest.files.some(file => file.name === capture));
console.log(JSON.stringify({ passed: true, sourceSHA256: manifest.sourceSHA256, unitTests: unit.numPassedTests, browserCases: browser.cases.length, screenshots: browser.captures.length, unchangedModelSections: review.bodies.length }));
