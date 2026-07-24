#!/usr/bin/env node
/*
 * check_sel_render.cjs — render-smoke gate for SEL Hub plugin tools.
 *
 * WHY: SEL Hub (sel_hub/sel_tool_*.js, ~70 tools) uses the SAME plugin bridge as
 * STEM Lab — window.SelHub.registerTool(id, config) + window.SelHub.renderTool(id, ctx) —
 * but had NO headless render gate. check_stem_render closed that gap for STEM and
 * immediately surfaced 10 first-render crashes; this is the SEL counterpart. Static
 * gates (check_render_refs etc.) can't catch the render-phase TypeError class
 * (undefined.map, reading a prop off undefined, a mis-shaped data literal) — only
 * actually RENDERING the tool surfaces it. SEL's renderTool wraps tool.render in
 * try/catch and logs "[SelHub] Error rendering <id>" then returns null (a DEGRADED
 * fallback, not the real tool), so a crash is swallowed — this gate intercepts that.
 *
 * HOW: define a minimal window.SelHub shim that mirrors the real renderTool's error
 * behavior (sel_hub_module.js ~line 37-42), load every sel_hub/*.js plugin + support
 * file (each self-registers / defines its window globals), then renderToStaticMarkup
 * each registered tool through renderTool(id, ctx) with a FAITHFUL STUB ctx mirroring
 * the real ctx built by sel_hub_module.js (~line 2116-2222). SSR-only: exercises render
 * (incl. crash-prone first-open paths) but not useEffect/handlers.
 *
 * Stub philosophy: PERMISSIVE about environment (icons/theme/unknown ctx fields →
 * harmless stubs) so a throw points at the tool's own render logic, not a ctx gap.
 *
 * Usage:  node dev-tools/check_sel_render.cjs [--quiet]
 * Exit:   non-zero if any tool fails to load, throws on render, OR renders DEGRADED
 *         (catches its own render error → fallback UI). Set SEL_RENDER_LENIENT=1 to
 *         downgrade the degraded-render case to a non-blocking advisory.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const QUIET = process.argv.includes('--quiet');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
  React = require(path.join(MODULES, 'react'));
  RDS = require(path.join(MODULES, 'react-dom', 'server'));
} catch (e) {
  // No test deps (e.g. a CI lane without desktop/web-app/node_modules). SKIP rather
  // than fail — best-effort where React+jsdom exist (locally + the test jobs).
  console.warn('[check_sel_render] SKIPPED — React/jsdom not found at ' + MODULES + ' (' + e.message + ')');
  process.exit(0);
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true });
function setGlobal(k, v) {
  try { global[k] = v; }
  catch (e) { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {} }
}
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('getComputedStyle', dom.window.getComputedStyle);

const noop = function () {};
const stubComp = function () { return null; };
const iconsProxy = new Proxy({}, { get: function () { return stubComp; } });
const palProxy = new Proxy({}, { get: function () { return '#888888'; } });

global.React = React;
window.React = React;
window.AlloIcons = iconsProxy;
window.callGemini = null;
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = function () { return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }; };
}

// Minimal window.SelHub shim mirroring the real renderTool's error behavior
// (sel_hub_module.js:37-42). The real one also wraps the result in a dark-shell div;
// that's cosmetic for the smoke (we only need render to execute), so it's omitted.
// Defined BEFORE loading plugins so each sel_tool_*.js registers against it (the real
// module guards with `if (!window.SelHub)`, so plugins won't clobber this shim).
window.SelHub = {
  _registry: {},
  _order: [],
  registerTool: function (id, config) {
    if (!this._registry[id]) this._order.push(id);
    this._registry[id] = config;
  },
  isRegistered: function (id) { return !!this._registry[id]; },
  getRegisteredTools: function () { const self = this; return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function (id, ctx) {
    const tool = this._registry[id];
    if (!tool || !tool.render) return null;
    let rendered;
    try { rendered = tool.render(ctx); }
    catch (e) { console.error('[SelHub] Error rendering ' + id, e); return null; }
    return rendered == null ? null : rendered;
  },
};

// Faithful stub of the ctx built by sel_hub_module.js (~2116-2222).
function makeCtx() {
  const themeBase = { isDark: false, isContrast: false, reduceMotion: false, palette: palProxy };
  const theme = new Proxy(themeBase, { get: function (o, p) { return (p in o) ? o[p] : '#888888'; } });
  const base = {
    React: React,
    // State
    toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
    // Navigation
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: '', selHubTool: '',
    // Utilities
    addToast: noop, awardXP: noop, getXP: function () { return 0; },
    announceToSR: noop, celebrate: noop, beep: noop,
    t: function (k) { return k; },
    // Theme (object form; real code overwrites with _t tokens — Proxy covers both reads)
    theme: theme,
    isDark: false, isContrast: false,
    // AI integration (off in smoke)
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: null, selectedVoice: null, activeSessionCode: null,
    // Icons
    icons: iconsProxy,
    // Grade
    gradeLevel: '5th Grade', gradeBand: 'middle',
    // Snapshots
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    // A11y helpers
    srOnly: function (text) { return React.createElement('span', { className: 'sr-only' }, text); },
    a11yClick: function (h) { return { onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }; },
    props: {},
  };
  // Unknown ctx reads → noop fn (callback-safe). Catches drift, not the tool's own logic.
  return new Proxy(base, { get: function (o, p) { return (p in o) ? o[p] : noop; } });
}

// Load every sel_hub/*.js EXCEPT the React hub module (needs full env) and _build_* tools.
// Alphabetical order puts support files (sel_safety_layer, sel_standards_alignment) before
// sel_tool_* so their window globals exist when tools register/render.
const dir = path.join(ROOT, 'sel_hub');
const files = fs.readdirSync(dir).filter(function (f) {
  return /\.js$/.test(f) && f !== 'sel_hub_module.js' && !/^_build/.test(f);
}).sort();
const loadErrors = [];
files.forEach(function (f) {
  try {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    new Function(src)(); // eslint-disable-line no-new-func
  } catch (e) {
    loadErrors.push({ file: f, error: (e && e.message) || String(e) });
  }
});

const registry = (window.SelHub && window.SelHub._registry) || {};
const ids = Object.keys(registry).sort();
const renderErrors = []; // uncaught throw → ErrorBoundary would crash the hub
const swallowed = [];    // tool's render threw → renderTool caught it → fallback (not the real tool)
const _origErr = console.error;
ids.forEach(function (id) {
  const caught = [];
  console.error = function () {
    try {
      var s = Array.prototype.map.call(arguments, function (x) { return x && x.message ? x.message : String(x); }).join(' ');
      if (/error rendering/i.test(s)) caught.push(s);
    } catch (_) {}
  };
  try {
    const ctx = makeCtx();
    RDS.renderToStaticMarkup(React.createElement(function SelSmoke() {
      return window.SelHub.renderTool(id, ctx);
    }));
  } catch (e) {
    renderErrors.push({ id: id, error: (e && e.message) || String(e) });
  } finally {
    console.error = _origErr;
  }
  if (caught.length) swallowed.push({ id: id, error: caught[0] });
});

if (!QUIET) {
  console.log('[check_sel_render] ' + files.length + ' sel_hub file(s), ' + ids.length + ' registered tool(s)');
}
if (loadErrors.length) {
  console.error('✗ ' + loadErrors.length + ' sel_hub file(s) failed to LOAD:');
  loadErrors.forEach(function (e) { console.error('   - ' + e.file + ': ' + e.error); });
}
if (renderErrors.length) {
  console.error('✗ ' + renderErrors.length + ' tool(s) THREW (uncaught → ErrorBoundary crashes the hub):');
  renderErrors.forEach(function (e) { console.error('   - ' + e.id + ': ' + e.error); });
}
// BLOCKING by default (matches check_stem_render). A "degraded render" = the tool caught
// its own render error and showed a fallback instead of the real tool — almost always a
// first-render bug (unhandled empty/initial state). Escape hatch: SEL_RENDER_LENIENT=1.
const LENIENT = process.env.SEL_RENDER_LENIENT === '1';
if (swallowed.length) {
  const mark = LENIENT ? '⚠' : '✗';
  const tail = LENIENT ? ' (advisory — SEL_RENDER_LENIENT set)' : ' (BLOCKING — set SEL_RENDER_LENIENT=1 to override)';
  console.error(mark + ' ' + swallowed.length + ' SEL tool(s) render DEGRADED (caught render error → fallback UI, not the real tool)' + tail + ':');
  swallowed.forEach(function (e) { console.error('   - ' + e.id + ': ' + e.error); });
}
if (loadErrors.length || renderErrors.length || (!LENIENT && swallowed.length)) {
  process.exit(1);
}
console.log('✓ check_sel_render: no app-crash render failures across ' + ids.length + ' SEL tools'
  + (swallowed.length ? ' (' + swallowed.length + ' degraded-render advisory — LENIENT set, see above)' : '') + '.');
