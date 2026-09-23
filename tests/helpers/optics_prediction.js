// Save a prediction for the CURRENT setup of an Optics topic tab, so a test can
// assert the text the prediction gate reveals.
//
// The gate unlocks only when opPredictionSetups[tab] equals the tool's own
// setup key: sorted `key=value` pairs over OPTICS_PREDICTION_KEYS[tab],
// counting only keys present in state with a non-object value. The key list is
// read out of the TOOL SOURCE rather than copied here, so this helper cannot go
// on agreeing with itself after the tool's list changes. If the two ever
// disagree, the gated text stays masked and the caller's assertion fails loudly.
import fs from 'node:fs';
import path from 'node:path';

let cached = null;
function controlKeys() {
  if (cached) return cached;
  // Same resolution as stem_widgets_smoke_harness.js: suites run from the repo root.
  const src = fs.readFileSync(path.resolve(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
  const start = src.indexOf('var OPTICS_PREDICTION_KEYS = {');
  if (start < 0) throw new Error('OPTICS_PREDICTION_KEYS not found in stem_tool_optics.js');
  const open = src.indexOf('{', start);
  const close = src.indexOf('};', open);
  // The literal is plain `tab: ['a', 'b'],` lines; comments are stripped first.
  const body = src.slice(open, close + 1).replace(/\/\/[^\n]*/g, '');
  cached = Function('"use strict"; return (' + body + ');')();
  return cached;
}

export function opticsSetupKey(tab, state) {
  const keys = controlKeys()[tab];
  if (!keys) throw new Error('unknown optics tab: ' + tab);
  const captured = {};
  keys.forEach((k) => {
    if (state && state[k] != null && typeof state[k] !== 'object') captured[k] = state[k];
  });
  return Object.keys(captured).sort().map((k) => k + '=' + captured[k]).join('|');
}

export function withPrediction(tab, state, note = 'My prediction.') {
  return Object.assign({}, state, {
    opPredictionNotes: Object.assign({}, state && state.opPredictionNotes, { [tab]: note }),
    opPredictionSetups: Object.assign({}, state && state.opPredictionSetups, { [tab]: opticsSetupKey(tab, state) }),
  });
}

// Read a string constant (`var NAME = '...';`) out of the tool source, so a test
// asserts the tool's own placeholder rather than a copy of it.
export function opticsConstant(name) {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'stem_lab/stem_tool_optics.js'), 'utf8');
  const m = src.match(new RegExp('var ' + name + " = '([^']*)';"));
  if (!m) throw new Error(name + ' not found in stem_tool_optics.js');
  return m[1];
}

// The tool's own per-tab prediction key lists, for code that has to build the
// key in the browser (an e2e page cannot import this module).
export function predictionKeys() {
  return controlKeys();
}
