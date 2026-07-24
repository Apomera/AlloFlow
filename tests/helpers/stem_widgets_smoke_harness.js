// Smoke-test harness for the 29 H7b'' inquiry widgets shipped in
// session batches 11-17. Pins ONE thing per widget: when the tool is
// loaded and rendered under a state that exposes the inquiry block, the
// SSR render does NOT throw and produces output containing the inquiry
// signature text. This is a ReferenceError gate, not a visual lock —
// snapshots intentionally NOT taken (the H7b'' blocks contain
// timestamps via Date when "Log" is clicked, so per-block snapshots
// would drift). Pattern mirrors tests/helpers/dino_lab_harness.js +
// tests/helpers/lumen_harness.js.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));
export const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));

const noop = () => { };

// Some tools read `window.React` directly (e.g. alloBotSage,
// assessmentLiteracy). Make sure the same React 18 the harness uses is
// reachable as a global.
if (!window.React) window.React = React;
if (!globalThis.React) globalThis.React = React;

// Provide a real, fresh StemLab registry. Each test's beforeEach calls
// resetStemLab() so tool re-registration is allowed.
export function resetStemLab() {
  const reg = {
    _registry: {},
    _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    // Loader stubs matching the real host API (stem_lab_module.js). A
    // forever-pending promise keeps tools in their loading state under jsdom —
    // exactly what the old inline script tags did (they never load here).
    loadScriptResilient: function () { return new Promise(function () {}); },
    ensureThree: function () { return new Promise(function () {}); },
    getRegisteredTools: function () {
      const self = this;
      return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
    },
    renderTool: function (id, ctx) {
      const tool = this._registry[id];
      if (!tool || !tool.render) return null;
      try { return tool.render(ctx); } catch (e) { console.error('[StemLab smoke harness] Render error in ' + id, e); return null; }
    }
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  return reg;
}

const _srcCache = new Map();
function readSource(file) {
  if (_srcCache.has(file)) return _srcCache.get(file);
  const src = readFileSync(resolve(process.cwd(), file), 'utf8');
  _srcCache.set(file, src);
  return src;
}

/**
 * Load a stem_tool_*.js IIFE against the jsdom window. Returns the
 * registered tool's config (the object passed to registerTool).
 *
 * Each load is independent: caller is expected to resetStemLab() first
 * in beforeEach so dedup guards don't suppress the re-load.
 */
export function loadTool(file, toolId) {
  const src = readSource(file);
  // eslint-disable-next-line no-new-func
  new Function(src)();
  const cfg = window.StemLab && window.StemLab._registry[toolId];
  if (!cfg) {
    throw new Error('Smoke harness: ' + file + ' did not register tool id "' + toolId + '". Available: ' + Object.keys(window.StemLab._registry || {}).join(', '));
  }
  return cfg;
}

/**
 * Build a defensive ctx with no-op stubs for every callback most tools
 * reach for. Per-tool overrides can be merged in by the test.
 */
export function makeCtx(overrides) {
  const Icons = new Proxy({}, {
    get: function () {
      // Every icon is a function component that renders an empty span.
      // This dodges crashes on ctx.icons.ArrowLeft etc. without
      // requiring tests to know which icons each tool reaches for.
      return function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
    }
  });
  const base = {
    React: React,
    toolData: {},
    setToolData: function (fn) {
      // setToolData typically takes (prev) => next. We just call with current
      // toolData and discard — render is pure under defaults for the smoke.
      if (typeof fn === 'function') { try { fn(base.toolData); } catch (e) { /* ignore */ } }
    },
    update: noop,
    updateMulti: noop,
    setStemLabTool: noop,
    setStemLabTab: noop,
    setToolSnapshots: noop,
    addToast: noop,
    announceToSR: noop,
    awardXP: noop,
    beep: noop,
    celebrate: noop,
    canvasNarrate: noop,
    canvasA11yDesc: noop,
    callGemini: null,
    callTTS: null,
    callImagen: null,
    callGeminiVision: null,
    callGeminiImageEdit: null,
    gradeLevel: '5th Grade',
    stemLabTab: 'explore',
    stemLabTool: null,
    toolSnapshots: [],
    props: {},
    srOnly: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 },
    a11yClick: function (fn) {
      return {
        onClick: fn,
        role: 'button',
        tabIndex: 0,
        onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') fn(); }
      };
    },
    icons: Icons,
    t: function (key, fallback) { return fallback || key; },
    tryAward: noop,
    getXP: function () { return 0; }
  };
  return Object.assign(base, overrides || {});
}

/**
 * SSR-render a registered tool under a given toolData state. The render
 * is wrapped in a function component so the tool's React.useState /
 * useRef / useEffect calls have a valid hooks context.
 *
 * Returns the static markup string. Throws if render throws — callers
 * (test cases) catch and convert to a per-widget failure.
 */
export function renderTool(toolId, toolData, overrides) {
  const cfg = window.StemLab && window.StemLab._registry[toolId];
  if (!cfg || typeof cfg.render !== 'function') {
    throw new Error('renderTool: ' + toolId + ' has no render fn (load first?)');
  }
  const ctx = makeCtx(Object.assign({ toolData: toolData || {} }, overrides || {}));
  const Comp = function () { return cfg.render(ctx); };
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Comp));
}

/**
 * Asserts the SSR output contains an H7b'' inquiry signature. The
 * canonical anchors (in order of preference) are: the "Inquiry widget —
 * no score, no reveal" italic design note, the "I'm stuck" opt-in
 * button text, and the "🔬" emoji prefix common to inquiry headers.
 *
 * Returns the matched signature string so the test can include it in
 * the failure message.
 */
export function findInquirySignal(html) {
  const signals = [
    'no score, no reveal',
    "I'm stuck",
    '🔬',
    'Inquiry widget',
    'hypothesis'
  ];
  for (let i = 0; i < signals.length; i++) {
    if (html.indexOf(signals[i]) !== -1) return signals[i];
  }
  return null;
}
