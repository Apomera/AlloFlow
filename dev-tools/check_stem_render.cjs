#!/usr/bin/env node
/*
 * check_stem_render.cjs — render-smoke gate for STEM Lab plugin tools.
 *
 * WHY: check_render_refs.cjs only resolves identifiers in hook DEPENDENCY ARRAYS.
 * It cannot catch the render-phase crash class that has repeatedly reached the live
 * pilot tool (2026-06-05: stem_tool_angles `g.tabs.map` undefined; annotation Toolbar
 * bare `t`): a TypeError thrown while a component renders (undefined.map, reading a
 * prop off undefined, a mis-shaped data literal). Only actually RENDERING the tool
 * surfaces it. This gate does that headlessly.
 *
 * HOW: load every stem_lab/stem_tool_*.js into a jsdom window (each self-registers via
 * window.StemLab.registerTool), then renderToStaticMarkup each registered tool through
 * renderTool(id, ctx) with a faithful STUB ctx that mirrors the real one built by
 * stem_lab_module.js StemPluginBridge (~line 4794). A throw = the tool's RENDER PHASE
 * is broken. SSR-only: this exercises render (incl. the crash-prone paths) but not
 * useEffect/handlers, so it won't catch effect-time or click-time bugs.
 *
 * Stub philosophy: be PERMISSIVE about environment (icons/palette/unknown ctx fields →
 * harmless stubs) so a throw points at the tool's own render logic, not a ctx gap —
 * minimizing false positives while still catching real data-shape crashes.
 *
 * Usage:  node dev-tools/check_stem_render.cjs [--quiet]
 * Exit:   non-zero if any tool fails to load or throws on render.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'prismflow-deploy', 'node_modules');
const QUIET = process.argv.includes('--quiet');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
  React = require(path.join(MODULES, 'react'));
  RDS = require(path.join(MODULES, 'react-dom', 'server'));
} catch (e) {
  // No test deps in this environment (e.g. a CI job that didn't install prismflow-deploy/
  // node_modules). SKIP rather than fail — this gate is best-effort where React+jsdom exist
  // (locally + the test jobs); it must never block a deploy/CI lane that simply lacks them.
  console.warn('[check_stem_render] SKIPPED — React/jsdom not found at ' + MODULES + ' (' + e.message + ')');
  process.exit(0);
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true });
// Some globals (e.g. navigator in Node 18+/24) are read-only getters — assign defensively.
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

// Faithful stub of the ctx built by stem_lab_module.js StemPluginBridge (~4794-4950).
function makeCtx() {
  const base = {
    React: React,
    toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
    setStemLabTool: noop, setStemLabTab: noop, stemLabTab: '', stemLabTool: '',
    toolSnapshots: [], setToolSnapshots: noop,
    addToast: noop, awardXP: noop, getXP: function () { return 0; },
    announceToSR: noop, canvasNarrate: noop, setCanvasNarrateEnabled: noop, celebrate: noop,
    callGemini: null, getHint: noop, aiHintsEnabled: false, aiChat: null,
    sourceText: '', inputText: '', sourceTopic: '', gradeLevel: '5th Grade', gradeBand: 'g68',
    gridRange: { min: -10, max: 10 },
    t: function (k) { return k; },
    icons: iconsProxy,
    _codingCanvasRef: { current: null },
    saveSnapshot: noop, renderTutorial: function () { return null; }, _tutGalaxy: [], beep: noop,
    callTTS: null, callImagen: null, callGeminiVision: null, callGeminiImageEdit: null,
    srOnly: function (text) { return React.createElement('span', { className: 'sr-only' }, text); },
    a11yClick: function (h) { return { onClick: h, role: 'button', tabIndex: 0 }; },
    canvasA11yDesc: function (d) { return { role: 'img', 'aria-label': d }; },
    props: {},
    activeSessionCode: null, studentNickname: null, isTeacherMode: false,
    isDark: false, isContrast: false, theme: 'default', pal: palProxy,
    exploreScore: { correct: 0, total: 0 }, setExploreScore: noop,
    exploreDifficulty: 'medium', setExploreDifficulty: noop,
    angleValue: 45, setAngleValue: noop, angleChallenge: null, setAngleChallenge: noop,
    angleFeedback: null, setAngleFeedback: noop,
    multTableAnswer: '', setMultTableAnswer: noop, multTableChallenge: null, setMultTableChallenge: noop,
    multTableFeedback: null, setMultTableFeedback: noop, multTableHidden: false, setMultTableHidden: noop,
    multTableHover: null, setMultTableHover: noop, multTableRevealed: new Set(), setMultTableRevealed: noop,
    labToolData: {}, setLabToolData: noop, _renderingFlag: { current: false },
  };
  // Unknown ctx reads → noop fn (used-as-callback safe). Real fields above cover the
  // documented contract; this only catches drift, not the tool's own render logic.
  return new Proxy(base, { get: function (o, p) { return (p in o) ? o[p] : noop; } });
}

const dir = path.join(ROOT, 'stem_lab');
const files = fs.readdirSync(dir).filter(function (f) { return /^stem_tool_.*\.js$/.test(f); });
const loadErrors = [];
files.forEach(function (f) {
  try {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    new Function(src)(); // eslint-disable-line no-new-func
  } catch (e) {
    loadErrors.push({ file: f, error: (e && e.message) || String(e) });
  }
});

const registry = (window.StemLab && window.StemLab._registry) || {};
const ids = Object.keys(registry).sort();
const renderErrors = []; // uncaught throw → ErrorBoundary would take down the app (angles class)
const swallowed = [];    // tool caught its own render error → shows fallback UI, not the real tool
const _origErr = console.error;
ids.forEach(function (id) {
  // Tools wrap render in try/catch and log "[StemLab] Error rendering <id>" then show a
  // fallback. That error is swallowed (no uncaught throw) — capture it so the gate sees the
  // degraded-tool class too, not just app-crashes.
  const caught = [];
  console.error = function () {
    try {
      var s = Array.prototype.map.call(arguments, function (x) { return x && x.message ? x.message : String(x); }).join(' ');
      if (/error rendering/i.test(s)) caught.push(s);
    } catch (_) {}
  };
  try {
    const ctx = makeCtx();
    RDS.renderToStaticMarkup(React.createElement(function StemSmoke() {
      return window.StemLab.renderTool(id, ctx);
    }));
  } catch (e) {
    renderErrors.push({ id: id, error: (e && e.message) || String(e) });
  } finally {
    console.error = _origErr;
  }
  if (caught.length) swallowed.push({ id: id, error: caught[0] });
});

if (!QUIET) {
  console.log('[check_stem_render] ' + files.length + ' tool file(s), ' + ids.length + ' registered tool(s)');
}
if (loadErrors.length) {
  console.error('✗ ' + loadErrors.length + ' tool file(s) failed to LOAD:');
  loadErrors.forEach(function (e) { console.error('   - ' + e.file + ': ' + e.error); });
}
if (renderErrors.length) {
  console.error('✗ ' + renderErrors.length + ' tool(s) THREW (uncaught → ErrorBoundary crashes the app):');
  renderErrors.forEach(function (e) { console.error('   - ' + e.id + ': ' + e.error); });
}
if (swallowed.length) {
  // ADVISORY (non-blocking for now): these tools catch their own render error and show a
  // DEGRADED fallback UI instead of the real tool — typically a first-render bug (unhandled
  // empty/initial state). Promote to a hard failure once the current backlog is cleared
  // (set STEM_RENDER_STRICT=1 to fail on these today).
  console.warn('⚠ ' + swallowed.length + ' STEM tool(s) render DEGRADED (caught render error → fallback UI, not the real tool):');
  swallowed.forEach(function (e) { console.warn('   - ' + e.id + ': ' + e.error); });
}
const STRICT = process.env.STEM_RENDER_STRICT === '1';
if (loadErrors.length || renderErrors.length || (STRICT && swallowed.length)) {
  process.exit(1);
}
console.log('✓ check_stem_render: no app-crash render failures across ' + ids.length + ' STEM tools'
  + (swallowed.length ? ' (' + swallowed.length + ' degraded-render advisory — see ⚠ above)' : '') + '.');
