'use strict';
// Reproduce the stale replay assertion against the frozen source without editing runtimes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = process.cwd();
const out = path.join(root, 'reports/watercycle-comparison-clarity');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const baseline = fs.readFileSync(path.join(out, 'baseline-runtime.js'));
assert.equal(hash(baseline), '239edf53b437848623cec592f72644ee69e6eb000b887e113175e09740b16003');
const current = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js'), 'utf8');
function clearHandler(source) {
  const start = source.indexOf('var clearWcExperimentLog = function()');
  const end = source.indexOf('var removeWcObservation = function(', start);
  assert.ok(start >= 0 && end > start, 'Bound the actual clear-trail handler');
  return source.slice(start, end).replace(/\r\n/g, '\n').trim();
}
const literal = "updMulti({ wcExperimentLog: [], wcReplayedObservation: '' });";
let originalFailure;
try { assert.ok(baseline.toString('utf8').includes(literal), 'Original replay test expects the exact two-field update literal'); }
catch (error) { originalFailure = { name: error.name, message: error.message, actual: error.actual, expected: error.expected }; }
assert.ok(originalFailure, 'The exact original assertion already fails the frozen baseline');
const baselineHandler = clearHandler(baseline.toString('utf8'));
const currentHandler = clearHandler(current);
assert.equal(currentHandler, baselineHandler, 'The clear-trail handler is unchanged by comparison clarity work');
const clearsObservations = /\bwcExperimentLog\s*:\s*\[\s*\]/;
const clearsReplay = /\bwcReplayedObservation\s*:\s*(['"])\1/;
assert.match(baselineHandler, clearsObservations);
assert.match(baselineHandler, clearsReplay);
assert.match(currentHandler, clearsObservations);
assert.match(currentHandler, clearsReplay);
assert.ok(baselineHandler.includes('wcExperimentUndo: collectWcRemovedEntries'), 'The already existing clear action retains undo entries');
const report = {
  recordedAt: new Date().toISOString(),
  baselineSourceSha256: hash(baseline),
  comparedSourceSha256: hash(current),
  originalReplayTest: 'tests/watercycle_replay_indicator.test.js',
  originalLiteral: literal,
  originalLiteralPresentInBaseline: false,
  originalAssertionFailure: originalFailure,
  clearHandlerUnchanged: true,
  clearHandlerSha256: hash(baselineHandler),
  clearHandler: baselineHandler,
  alignedAssertionPassesBaseline: true,
  alignedAssertionPassesCurrent: true,
  diagnostic: 'The replay failure predates this comparison change. Its exact two-field updMulti literal omitted the already existing wcExperimentUndo field. The aligned assertion stays inside the clear-trail handler and requires cleared observations plus an empty replay label, allowing other state fields. Undo behavior and runtime code are unchanged. The experiment-trail assertion only follows the accessible Save observation name, which now contains the visible button label.'
};
fs.writeFileSync(path.join(out, 'regression-alignment-proof.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ baselineSourceSha256: report.baselineSourceSha256, originalLiteralPresentInBaseline: false, clearHandlerUnchanged: true, alignedAssertionPassesBaseline: true, alignedAssertionPassesCurrent: true }, null, 2));
