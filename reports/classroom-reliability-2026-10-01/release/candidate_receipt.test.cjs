'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { capture, compare, normalizeSpec } = require('./candidate_receipt.cjs');
const ROOT = 'C:/candidate-fixture';
const HEAD = 'a'.repeat(40);
const spec = { schemaVersion: 1, inputs: ['source.js', 'mirror.js', 'test.js'], parityPairs: [['source.js', 'mirror.js']] };
function fixture() {
  const bytes = new Map([['source.js', Buffer.from('current')], ['mirror.js', Buffer.from('current')], ['test.js', Buffer.from('assert current')]]);
  return { bytes, options: { root: ROOT, read: file => bytes.get(file) || (() => { throw Object.assign(Error('missing'), { code: 'ENOENT' }); })(), readHead: () => HEAD } };
}
test('unchanged selected inputs remain traceable without claiming current CI', () => {
  const { options } = fixture(), baseline = capture(spec, options), after = compare(baseline, options);
  assert.equal(baseline.stableCapture, true);
  assert.equal(baseline.declaredParityMatches, true);
  assert.equal(after.unchanged, true);
  assert.equal(after.currentCI.status, 'unverified');
  assert.equal(after.baselineCandidateSha256, after.currentCandidateSha256);
  assert.equal(Object.keys(baseline.files).length, 3);
});
test('a changed production input invalidates the candidate while preserving baseline bytes', () => {
  const { bytes, options } = fixture(), baseline = capture(spec, options), fingerprint = baseline.files['source.js'].sha256;
  bytes.set('source.js', Buffer.from('newer'));
  const after = compare(baseline, options);
  assert.equal(after.unchanged, false);
  assert.deepEqual(after.changedInputs, ['source.js']);
  assert.equal(after.current.declaredParityMatches, false);
  assert.notEqual(after.baselineCandidateSha256, after.currentCandidateSha256);
  assert.equal(baseline.files['source.js'].sha256, fingerprint);
});
test('an input that changes during capture cannot supply a validation baseline', () => {
  const { options } = fixture();
  let reads = 0;
  const baseline = capture(spec, { ...options, read: file => file === 'source.js' && ++reads === 2 ? Buffer.from('changed mid-check') : options.read(file) });
  assert.equal(baseline.stableCapture, false);
  assert.deepEqual(baseline.changedDuringCapture, ['source.js']);
  assert.throws(() => compare(baseline, options), /unchanged successful capture/);
});
test('missing selected files and changing HEAD cannot be certified', () => {
  const { bytes, options } = fixture();
  bytes.delete('test.js');
  assert.equal(capture(spec, options).stableCapture, false);
  let heads = 0;
  assert.equal(capture(spec, { ...options, readHead: () => ++heads === 1 ? HEAD : 'b'.repeat(40) }).stableCapture, false);
});
test('scope rejects traversal and parity checks outside its explicit inputs', () => {
  assert.throws(() => normalizeSpec({ schemaVersion: 1, inputs: ['../outside.js'] }), /workspace-relative/);
  assert.throws(() => normalizeSpec({ ...spec, parityPairs: [['source.js', 'unselected.js']] }), /also appear in inputs/);
});
test('a changed scope fingerprint is rejected', () => {
  const { options } = fixture(), baseline = capture(spec, options);
  baseline.spec.inputs.push('extra.js');
  assert.throws(() => compare(baseline, options), /scope fingerprint/);
});
