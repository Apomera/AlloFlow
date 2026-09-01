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
    // The real shell lives in stem_lab_module.js. SSR never mounts a canvas
    // (renderToStaticMarkup does not invoke refs), so tools only need a
    // correctly-shaped viewer that reports "host present, 3D not loaded yet" —
    // which is exactly the state the forever-pending ensureThree above models.
    // The real implementation is exercised by the browser smoke, not here.
    makeBayViewer: function () {
      return {
        attach: function () {}, sync: function () {}, nudge: function () {},
        zoom: function () {}, reset: function () {}, status: function () { return 'idle'; }
      };
    },
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
export function newStore(seedToolData) {
  return { toolData: seedToolData || {}, labToolData: {}, dirty: false };
}

// Upper bound on state-settling passes in renderTool().
export const SETTLE_PASSES = 5;

export function makeCtx(overrides, store) {
  store = store || newStore();
  function applyUpdater(key, arg) {
    const prev = store[key] || {};
    const next = (typeof arg === 'function') ? arg(prev) : arg;
    if (next && next !== prev) {
      store[key] = next;
      store.dirty = true;
    }
  }
  // React state setters keep the same identity for the lifetime of a mounted
  // component. Preserve that contract across SSR settle passes so tools that
  // key instance-local resources by setter do not mistake every pass for a new
  // mount and leave redundant timers behind.
  store._stableSetters = store._stableSetters || {};
  if (!store._stableSetters.toolData) store._stableSetters.toolData = function (fn) { applyUpdater('toolData', fn); };
  if (!store._stableSetters.labToolData) store._stableSetters.labToolData = function (fn) { applyUpdater('labToolData', fn); };
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
    toolData: store.toolData,
    // State setters write into `store` rather than discarding. Many tools
    // self-initialize on first render (setLabToolData/setToolData, then return a
    // "Loading..." placeholder) and only show their real UI once state exists.
    // Discarding the write pinned those tools' snapshots to the placeholder.
    // renderTool() below replays until the writes stop.
    setToolData: store._stableSetters.toolData,
    labToolData: store.labToolData,
    setLabToolData: store._stableSetters.labToolData,
    update: function (k, v) {
      applyUpdater('toolData', function (p) { const n = Object.assign({}, p); n[k] = v; return n; });
    },
    updateMulti: function (o) {
      applyUpdater('toolData', function (p) { return Object.assign({}, p, o || {}); });
    },
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
  // Replay until the tool stops writing state, so self-initializing tools are
  // snapshotted on their real UI instead of their "Loading..." placeholder.
  const store = newStore(toolData || {});
  let html = '';
  for (let pass = 0; pass < SETTLE_PASSES; pass++) {
    store.dirty = false;
    const ctx = makeCtx(Object.assign({ toolData: store.toolData }, overrides || {}), store);
    const Comp = function () { return cfg.render(ctx); };
    html = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp));
    if (!store.dirty) break;
  }
  return html;
}

/**
 * React SSR escapes text children, including quotes inside a <style> element.
 * HTML treats style contents as raw text, so feeding that serialized markup
 * straight to a browser leaves entities such as &quot; literal and can silently
 * invalidate declarations like grid-template-areas. Decode each style block
 * exactly once and preserve its parse boundary, matching the client render.
 */
export function extractReactSsrStyles(markup) {
  const doc = globalThis.document;
  if (!doc) throw new Error('extractReactSsrStyles requires a DOM document.');
  const host = doc.createElement('div');
  const decoder = doc.createElement('textarea');
  host.innerHTML = markup;
  const cssSheets = [...host.querySelectorAll('style')].map((style) => {
    decoder.innerHTML = style.textContent || '';
    const css = decoder.value;
    style.remove();
    return css;
  });
  return { html: host.innerHTML, cssSheets };
}

/**
 * Prepare one rendered STEM tool for a real-browser fixture. Styles inserted
 * into document.head by the tool come first; styles emitted inline by React
 * follow in their original order, as they do in the application.
 */
export function prepareStemBrowserRender(markup) {
  const prepared = extractReactSsrStyles(markup);
  const headCssSheets = [...globalThis.document.head.querySelectorAll('style')]
    .map((style) => style.textContent || '');
  return {
    html: prepared.html,
    cssSheets: [...headCssSheets, ...prepared.cssSheets],
  };
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
