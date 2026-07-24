// Reusable SSR render harness for SEL Hub plugin tools (sel_hub/sel_tool_*.js).
//
// Mirrors dev-tools/check_sel_render.cjs but as an ESM test helper: it installs a
// minimal window.SelHub shim + real React, loads a tool's IIFE, and renders it via
// renderTool(id, ctx) with a faithful stub ctx. Unlike the smoke gate, this harness
// RE-THROWS render errors (so a golden test fails loudly) and lets the caller seed
// ctx.gradeBand + ctx.toolData (so specific tabs/states can be characterized — SEL
// tools read their state from ctx.toolData[toolId], no source seam required).

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES = resolve(process.cwd(), 'desktop/web-app/node_modules');
export const React = require(resolve(MODULES, 'react'));
export const ReactDOMServer = require(resolve(MODULES, 'react-dom/server'));

const noop = () => {};
const stubComp = () => null;
const iconsProxy = new Proxy({}, { get: () => stubComp });
const palProxy = new Proxy({}, { get: () => '#888888' });

function ensureSelHub() {
  if (window.SelHub) return;
  window.SelHub = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { const s = this; return this._order.map((id) => s._registry[id]).filter(Boolean); },
    // Re-throw (unlike the prod swallow-and-fallback) so golden tests fail loudly.
    renderTool(id, ctx) { const t = this._registry[id]; if (!t || !t.render) return null; return t.render(ctx); },
  };
}

const _loaded = new Set();
/** Load a SEL tool IIFE (+ best-effort support files) against the jsdom window. */
export function loadSelTool(file) {
  globalThis.React = window.React = React;
  window.AlloIcons = iconsProxy;
  ensureSelHub();
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  // Support files some tools reference (standards alignment, safety layer). Best-effort.
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
    if (_loaded.has(f)) continue;
    const p = resolve(process.cwd(), 'sel_hub', f);
    if (existsSync(p)) { try { new Function(readFileSync(p, 'utf8'))(); _loaded.add(f); } catch (e) { /* non-fatal */ } }
  }
  if (!_loaded.has(file)) {
    new Function(readFileSync(resolve(process.cwd(), 'sel_hub', file), 'utf8'))();
    _loaded.add(file);
  }
}

/** Faithful stub of the ctx built by sel_hub_module.js (~2116-2222), with seedable
 *  gradeBand + toolData. Unknown ctx reads → noop (callback-safe). */
export function makeCtx(opts = {}) {
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: false, palette: palProxy }, { get: (o, p) => (p in o ? o[p] : '#888888') });
  const base = {
    React, toolData: opts.toolData || {}, setToolData: noop, update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: '', selHubTool: '',
    addToast: noop, awardXP: noop, getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k, theme, isDark: false, isContrast: false,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: null, selectedVoice: null, activeSessionCode: null,
    icons: iconsProxy, gradeLevel: opts.gradeLevel || '5th Grade', gradeBand: opts.gradeBand || 'elementary',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

/** SSR-render a registered SEL tool. opts: { gradeBand, toolData, gradeLevel }. */
export function renderSelTool(id, opts = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(function SelGolden() {
    return window.SelHub.renderTool(id, makeCtx(opts));
  }));
}
