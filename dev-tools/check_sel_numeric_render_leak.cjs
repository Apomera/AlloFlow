#!/usr/bin/env node
'use strict';
/*
 * Sweep every SEL tool for `0 && <jsx>` leaks.
 *
 * `cond && h(...)` renders a literal "0" when cond is the NUMBER zero — React
 * treats 0 as a renderable child, unlike false/null/undefined. A grep cannot
 * find these: the guard is syntactically identical to a boolean one, and
 * whether it bites depends on runtime state (a counter at 0, a timestamp never
 * set, an empty-string length).
 *
 * This wraps createElement during a real render of each tool at its INITIAL
 * state — which is exactly the state a student meets on first open — and
 * reports any element receiving a numeric 0 child.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const QUIET = process.argv.includes('--quiet');
const { JSDOM } = require(path.join(MODULES, 'jsdom'));
const React = require(path.join(MODULES, 'react'));
const RDS = require(path.join(MODULES, 'react-dom/server'));

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
function setGlobal(k, v) {
  try { global[k] = v; } catch (e) {
    try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {}
  }
}
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('getComputedStyle', dom.window.getComputedStyle);
setGlobal('React', React);
dom.window.React = React;
dom.window.AlloIcons = new Proxy({}, { get: () => () => null });
dom.window.callGemini = null;
if (typeof dom.window.matchMedia !== 'function') {
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}

const realCreate = React.createElement;
let current = null;
const hits = [];
React.createElement = function (type, props, ...children) {
  const flat = [];
  const walk = (c) => { if (Array.isArray(c)) c.forEach(walk); else flat.push(c); };
  children.forEach(walk);
  // A lone numeric child is a VALUE being displayed (a stat card showing 0).
  // A leaked `0 &&` guard appears as a 0 ALONGSIDE element siblings.
  const zeros = flat.filter((c) => typeof c === 'number' && c === 0);
  const elements = flat.filter((c) => c && typeof c === 'object' && c.type);
  const isDisplay = flat.length === 1 && zeros.length === 1;
  if (zeros.length && !isDisplay && elements.length) {
    const label = typeof type === 'string' ? type : (type && type.name) || 'Component';
    const near = flat
      .filter((c) => c && c.props && typeof c.props.children === 'string')
      .map((c) => c.props.children.slice(0, 50))[0] || '';
    // The tool source is eval'd via new Function, so its frames appear as
    // <anonymous>:LINE:COL — enough to locate the guard in the file.
    var frame = '';
    try {
      var st = String(new Error().stack).split(/\r?\n/);
      for (var si = 1; si < st.length; si++) {
        if (/<anonymous>:\d+:\d+/.test(st[si])) { frame = (st[si].match(/<anonymous>:(\d+):\d+/) || [])[1] || ''; break; }
      }
    } catch (e) {}
    hits.push({ tool: current, type: label, near, line: frame });
  }
  return realCreate.apply(React, [type, props, ...children]);
};

const noop = () => {};
const registry = {};
dom.window.SelHub = {
  _registry: registry, _order: [],
  registerTool(id, c) { c.id = id; registry[id] = c; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: (id) => !!registry[id],
  renderTool(id, ctx) { const t = registry[id]; return t && t.render ? t.render(ctx) : null; },
};

const SUPPORT = ['sel_safety_layer.js', 'sel_standards_alignment.js', 'sel_learning_guides.json'];
for (const f of SUPPORT) {
  const p = path.join(ROOT, 'sel_hub', f);
  if (f.endsWith('.js') && fs.existsSync(p)) {
    try { new Function(fs.readFileSync(p, 'utf8')).call(dom.window); } catch (e) {}
  }
}

const files = fs.readdirSync(path.join(ROOT, 'sel_hub')).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort();
for (const f of files) {
  try { new Function(fs.readFileSync(path.join(ROOT, 'sel_hub', f), 'utf8')).call(dom.window); }
  catch (e) { /* a tool that will not load is check_sel_render's problem */ }
}

const palProxy = new Proxy({}, { get: () => '#888888' });
const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette: palProxy },
  { get: (o, p) => (p in o ? o[p] : '#888888') });

function makeCtx() {
  const base = {
    React, theme, isDark: true, isContrast: false, isCompact: false,
    toolData: {}, setToolData: noop, labToolData: {}, setLabToolData: noop,
    update: noop, updateMulti: noop, setSelHubTool: noop, setSelHubTab: noop,
    addToast: noop, awardXP: noop, getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k, callGemini: null, onSafetyFlag: noop,
    icons: new Proxy({}, { get: () => () => null }),
    gradeLevel: '5th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => realCreate('span', { className: 'sr-only' }, t),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

let rendered = 0;
for (const id of Object.keys(registry)) {
  current = id;
  try {
    const Probe = () => dom.window.SelHub.renderTool(id, makeCtx());
    RDS.renderToStaticMarkup(realCreate(Probe));
    rendered += 1;
  } catch (e) { /* render crashes belong to check_sel_render */ }
}

const byTool = {};
for (const h of hits) (byTool[h.tool] = byTool[h.tool] || []).push(h);

for (const [tool, list] of Object.entries(byTool)) {
  console.log(`[NUMERIC-RENDER-LEAK] ${tool} (${list.length})`);
  for (const h of list.slice(0, 6)) {
    console.log(`    near source line ~${h.line}  <${h.type}>  ${h.near}`);
  }
  console.log('    A `count && h(...)` guard renders a literal 0 when count is the');
  console.log('    NUMBER zero. Make the operand boolean: `count > 0 &&` or `!!count &&`.');
  console.log();
}
if (!QUIET) console.log(`tools rendered: ${rendered}`);
if (hits.length === 0) {
  console.log(`✓ check_sel_numeric_render_leak: no stray numeric renders across ${rendered} SEL tools.`);
} else {
  console.log(`✗ check_sel_numeric_render_leak: ${hits.length} stray numeric render(s) across ${Object.keys(byTool).length} tool(s).`);
}
process.exit(hits.length ? 1 : 0);
