#!/usr/bin/env node
'use strict';

// Shared loader: give a RoadReady gate the tool's OWN pure functions instead
// of a re-derived copy of its formulas.
//
// Why this module exists (2026-09-21). Every RoadReady physics gate used to
// extract a constant by regex and then re-implement the physics locally. A
// test proved what that costs: dropping the factor of 2 from the real
// stoppingDistance() -- doubling every braking distance the tool shows a
// student -- left ALL SIX physics gates green while 14 vitest tests went red.
// The tests called the function; the gates each carried a private copy that
// stayed correct no matter what the tool did.
//
// The repo rule this violates: a gate that recomputes the value cannot fail.
//
// Loading is via the production-inert window.__RR_TEST_EXPORTS__ hook that the
// vitest suite already uses, so the gate and the suite read the same surface.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REL = 'stem_lab/stem_tool_roadready.js';

let cached = null;

// Loads the tool in a vm sandbox and returns its __RR_TEST_EXPORTS__ surface.
// THROWS if the tool does not load or does not export what was asked for -- a
// gate that cannot reach the model must fail, not silently fall back to its
// own arithmetic. That distinction is the whole point of this module.
function loadRoadReady(required) {
  if (cached) return check(cached, required);

  const src = fs.readFileSync(path.join(ROOT, REL), 'utf8');
  const win = { __RR_TEST_EXPORTS__: {} };
  const noop = function () {};
  const elStub = () => ({
    style: {}, setAttribute: noop, appendChild: noop, removeChild: noop,
    addEventListener: noop, removeEventListener: noop,
    getContext: () => null, classList: { add: noop, remove: noop, toggle: noop },
  });
  const doc = {
    createElement: elStub, createElementNS: elStub, getElementById: () => null,
    head: { appendChild: noop }, body: { appendChild: noop },
    addEventListener: noop, removeEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [],
  };
  const sandbox = {
    window: win, globalThis: win, self: win, document: doc,
    navigator: { userAgent: 'node', language: 'en' },
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
    Math, Date, JSON, Number, String, Object, Array, Boolean, Error,
    isNaN, isFinite, parseFloat, parseInt,
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
    requestAnimationFrame: noop, cancelAnimationFrame: noop,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    performance: { now: () => 0 },
  };
  win.document = doc;

  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'stem_tool_roadready.js', timeout: 60000 });
  } catch (e) {
    throw new Error('could not load ' + REL + ' in a sandbox: ' + e.message +
      '\n      This gate verifies the tool against its own model, so it fails here ' +
      'rather than falling back to a private copy of the formula.');
  }

  const RR = win.__RR_TEST_EXPORTS__ && win.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) {
    throw new Error(REL + ' loaded but did not populate window.__RR_TEST_EXPORTS__.roadReady ' +
      '-- is the export block at the end of the file still present?');
  }
  cached = RR;
  return check(RR, required);
}

function check(RR, required) {
  for (const name of required || []) {
    if (typeof RR[name] !== 'function' && RR[name] === undefined) {
      throw new Error('roadready exports no "' + name + '" -- this gate cannot verify ' +
        'anything without it. Add it to the __RR_TEST_EXPORTS__ block rather than ' +
        're-deriving it in the gate.');
    }
  }
  return RR;
}

module.exports = { loadRoadReady, ROOT, REL };
