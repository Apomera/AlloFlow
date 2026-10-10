'use strict';
// Read-only verification of frozen evidence and the two installed runtime copies.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const flag = name => process.argv.find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3);
const report = path.resolve(flag('report') || __dirname);
const repo = path.resolve(flag('root') || path.join(report, '..', '..'));
const assert = (value, message) => { if (!value) throw Error(message); };
const read = name => fs.readFileSync(path.join(report, name));
const manifest = JSON.parse(read('presentation-changes.json'));
assert(manifest.baselineSha256 === 'f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36' &&
  manifest.sourceSha256 === 'f00632bfe4eb8f57091aca4550b05d0eb0272a745dccbdf7a1f8a8d740d50086', 'Report source anchors changed');
const baseline = read('baseline-runtime.js'), candidate = read('candidate-runtime.js');
assert(hash(baseline) === manifest.baselineSha256, 'Frozen baseline hash changed');
assert(hash(candidate) === manifest.sourceSha256 && candidate.length === manifest.sourceBytes, 'Frozen candidate changed');
let restored = candidate.toString('utf8');
for (const change of manifest.changes) {
  assert(restored.indexOf(change.replacement) >= 0 && restored.indexOf(change.replacement) === restored.lastIndexOf(change.replacement), 'Nonunique slice: ' + change.id);
  restored = restored.replace(change.replacement, change.original);
}
assert(Buffer.from(restored).equals(baseline), 'Changes outside reviewed presentation slices');
for (const file of ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
  assert(hash(fs.readFileSync(path.join(repo, file))) === manifest.sourceSha256, 'Installed runtime differs: ' + file);
}
const evidence = JSON.parse(read('artifact-hashes.json'));
for (const artifact of evidence.files) assert(hash(read(artifact.path)) === artifact.sha256, 'Frozen evidence changed: ' + artifact.path);
for (const name of evidence.browserReceipts) {
  const receipt = JSON.parse(read(name));
  assert(receipt.completed && receipt.successful && receipt.resourcesClosed, 'Browser receipt incomplete or failed: ' + name);
  assert(receipt.sourceSha256 === (name.startsWith('baseline3-') ? manifest.baselineSha256 : manifest.sourceSha256), 'Browser receipt source differs: ' + name);
  assert(receipt.loadedRuntimeSha256 === receipt.sourceSha256, 'Mounted runtime bytes differ: ' + name);
  assert(receipt.checks.length && receipt.checks.every(check => check.passed), 'A browser check failed: ' + name);
  assert(hash(read(receipt.prefix + '-tested-runtime.js')) === receipt.sourceSha256, 'Tested runtime snapshot differs: ' + name);
  assert(hash(read(receipt.prefix + '-tested-harness.cjs')) === receipt.harnessSha256, 'Tested harness snapshot differs: ' + name);
}
const focused = JSON.parse(read('focused-final.json'));
assert(focused.successful && focused.candidateSha256 === manifest.sourceSha256 && focused.baselineSha256 === manifest.baselineSha256 && focused.restoredBaselineSha256 === manifest.baselineSha256, 'Focused preservation evidence differs');
const regression = JSON.parse(read('regression-summary.json'));
assert(regression.completed && regression.sourceSha256 === manifest.sourceSha256 && regression.failed === 0, 'Regression evidence incomplete');
for (const group of regression.testGroups) assert(group.successful && group.exitCode === 0 && group.failed === 0, 'Regression group failed: ' + group.name);
for (const original of JSON.parse(read('original-test-hashes.json')).testFiles) {
  assert(hash(fs.readFileSync(path.join(repo, original.path))) === original.sha256, 'Original regression test changed: ' + original.path);
}
console.log(JSON.stringify({ successful: true, sourceSha256: manifest.sourceSha256, presentationSlices: manifest.changes.length,
  frozenArtifacts: evidence.files.length, browserReceipts: evidence.browserReceipts.length, passingRegressionTests: regression.passed }));
