// Arc City render + interaction harness.
//
// Pins the STATEFUL render behaviour of stem_lab/stem_tool_arccity.js — the parts
// the pure-core golden master can't reach: the tier-lock UI swap, the Gauntlet's
// Next / Restart / Fire handlers, and level switching. Unlike an SSR harness
// (renderToStaticMarkup discards handlers), this uses a MOCK React.createElement
// that RETAINS each element's onClick, so a test can invoke a control and fold the
// resulting setToolData reducer(s) into a new state — exactly how the host applies
// them. The arc render reads ctx.React.createElement, so the mock is transparent.
//
// Loaded via new Function(src)() with window.StemLab pre-set to capture the
// registration — the same load shape as tests/helpers/lumen_harness.js.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let _cfg = null;
function setup() {
  if (_cfg) return _cfg;
  const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_arccity.js'), 'utf8');
  const captured = {};
  // jsdom supplies window/document (the module's browser block needs both).
  window.StemLab = { registerTool: (id, cfg) => { captured.id = id; captured.cfg = cfg; } };
  globalThis.StemLab = window.StemLab;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  if (!captured.cfg || typeof captured.cfg.render !== 'function') {
    throw new Error('arc harness: tool did not register a render function (anchor changed?).');
  }
  _cfg = captured.cfg;
  return _cfg;
}

const h = (type, props, ...children) => ({ type, props: props || {}, children });

function walk(node, fn) {
  if (node == null || node === false || node === true) return;
  if (Array.isArray(node)) { node.forEach(n => walk(n, fn)); return; }
  if (typeof node === 'object') {
    fn(node);
    if (node.children) node.children.forEach(c => walk(c, fn));
  }
}

function collectText(node, out) {
  if (node == null || node === false || node === true) return;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
  if (Array.isArray(node)) { node.forEach(n => collectText(n, out)); return; }
  if (node.children) node.children.forEach(c => collectText(c, out));
}

function findByKey(tree, key) {
  let found = null;
  walk(tree, n => { if (!found && n.props && n.props.key === key) found = n; });
  return found;
}
function findAll(tree, pred) {
  const out = [];
  walk(tree, n => { if (pred(n)) out.push(n); });
  return out;
}

/** Render the tool under a given _arccity state. Returns the element tree, its
 *  flattened text, the captured render-phase setToolData reducers, SR announcement,
 *  and lookup helpers. */
export function render(arcState) {
  const cfg = setup();
  const reducers = [];
  let sr = null;
  const ctx = {
    React: { createElement: h },
    toolData: { _arccity: arcState },
    setToolData: (fn) => { reducers.push(fn); },
    t: (k, d) => d,
    announceToSR: (m) => { sr = m; },
    icons: {}
  };
  const tree = cfg.render(ctx);
  const txt = []; collectText(tree, txt);
  return {
    tree,
    text: txt.join(' '),
    reducers,
    get sr() { return sr; },
    find: (key) => findByKey(tree, key),
    findAll: (pred) => findAll(tree, pred),
    _ctxReducers: reducers
  };
}

function fold(arcState, reducers) {
  let s = { _arccity: arcState };
  for (const fn of reducers) { s = fn(s) || s; }
  return s._arccity;
}

/** Render `arcState`, invoke the onClick of the element with `key`, and return the
 *  resulting _arccity (only the reducers the handler queued — render-phase ones are
 *  excluded, so the result isolates the interaction). Returns null if the click is
 *  guarded (e.g. a locked level tile that calls no handler). */
export function click(arcState, key) {
  const r = render(arcState);
  const el = r.find(key);
  if (!el) throw new Error('arc harness: no element with key "' + key + '"');
  if (typeof el.props.onClick !== 'function') throw new Error('arc harness: element "' + key + '" has no onClick');
  const before = r.reducers.length;
  el.props.onClick({ preventDefault() {}, stopPropagation() {}, target: {}, currentTarget: {} });
  const handlerReducers = r.reducers.slice(before);
  if (!handlerReducers.length) return null; // guarded no-op (e.g. locked tile)
  return fold(arcState, handlerReducers);
}
