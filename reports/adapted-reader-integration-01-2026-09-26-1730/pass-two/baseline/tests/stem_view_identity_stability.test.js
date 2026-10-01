// Cross-tool gate: view components must keep a STABLE React identity.
//
// The class (see feedback memory + dev-tools/scan_render_scoped_components.cjs):
// components defined inside a tool's render() get a new function identity on
// every host re-render, so React unmounts/remounts the open view on ANY
// toolData write (XP, badges, hydration) — silently wiping local useState and
// tearing the DOM. Proven live in birdlab species views and roadready CountUp
// (their own gates), then fixed repo-wide 2026-08-11 with the stableType()
// shim: a per-mount stable wrapper type whose impl closure is refreshed each
// render (same principle as printingpress's _ViewWrapper).
//
// The observable: a remount DETACHES the view's old DOM nodes. Each describe
// mounts one tool at a flagged view, captures its buttons, performs an
// unrelated toolData write, and asserts every captured node is still
// connected (reconciled in place, not remounted).

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('stem_view_identity_stability: no vendored React found');

const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
if (!global.ResizeObserver) {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

const noop = () => {};

function loadStemTool(file, regId) {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    loadScriptResilient() { return new Promise(() => {}); },
    ensureThree() { return new Promise(() => {}); },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]); },
    renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  if (!window.React) window.React = React;
  if (!globalThis.React) globalThis.React = React;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
  const cfg = reg._registry[regId];
  if (!cfg) throw new Error(file + ' did not register "' + regId + '"');
  return cfg;
}

function mountStemTool(cfg, regId, initial) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {};
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });

  function Harness() {
    const [toolData, setToolData] = React.useState({ [regId]: initial || {} });
    api.update = (toolId, key, val) =>
      setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: val } }));
    api.updateMulti = (toolId, obj) =>
      setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), ...obj } }));
    return cfg.render({
      React, toolData, setToolData, update: api.update, updateMulti: api.updateMulti,
      setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, addToast: noop,
      announceToSR: noop, awardXP: noop, beep: noop, celebrate: noop, canvasNarrate: noop,
      canvasA11yDesc: noop, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, callGeminiImageEdit: null, gradeLevel: '5th Grade',
      gradeBand: 'g68', isContrast: false,
      stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
      icons: Icons, t: (k, f) => f || k, tryAward: noop, getXP: () => 0,
    });
  }

  act(() => { root.render(React.createElement(Harness)); });
  api.host = host;
  api.set = (key, val) => { act(() => { api.update(regId, key, val); }); };
  api.click = (el) => { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); };
  api.teardown = () => {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  };
  return api;
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T15:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => {
  try { localStorage.clear(); } catch (_) {}
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// One representative flagged view per tool. If the fix regresses anywhere in
// a tool (the shim removed, a new in-render component added to the dispatch),
// the scanner (scan_render_scoped_components.cjs) is the wide net; this is
// the runtime proof of the class.
const CASES = [
  { name: 'BikeLab',      file: 'stem_lab/stem_tool_bikelab.js',      id: 'bikeLab',      initial: { view: 'safety' },        label: 'safety' },
  { name: 'WeldLab',      file: 'stem_lab/stem_tool_weldlab.js',      id: 'weldLab',      initial: { view: 'defectHunt' },    label: 'defectHunt' },
  { name: 'EvoLab',       file: 'stem_lab/stem_tool_evolab.js',       id: 'evoLab',       initial: { view: 'misconceptions' }, label: 'misconceptions' },
  { name: 'BirdLab',      file: 'stem_lab/stem_tool_birdlab.js',      id: 'birdLab',      initial: { view: 'ispy' },          label: 'ispy' },
  { name: 'NutritionLab', file: 'stem_lab/stem_tool_nutritionlab.js', id: 'nutritionLab', initial: { view: 'microAtlas' },    label: 'microAtlas' },
  // llmLiteracy's section is component-local state (useState('home')), so the
  // test clicks into a section from the home tiles instead of seeding it.
  { name: 'LLMLiteracy',  file: 'stem_lab/stem_tool_llm_literacy.js', id: 'llmLiteracy',  initial: {},                        label: 'tokens (via home tile)',
    navigate: (app) => {
      const tile = [...app.host.querySelectorAll('button')].find((b) => /How LLMs/i.test(b.textContent));
      if (!tile) throw new Error('llmLiteracy: no "How LLMs" home tile found');
      app.click(tile);
    } },
  // solarSystem's orrery route renders the CanvasPanel views.
  { name: 'SolarSystem',  file: 'stem_lab/stem_tool_solarsystem.js',  id: 'solarSystem',  initial: { orreryMode: true },      label: 'orrery' },
];

describe.each(CASES)('$name — view identity across host re-renders', ({ file, id, initial, label, navigate }) => {
  it('keeps view DOM attached across an unrelated toolData write (' + label + ')', () => {
    const app = mountStemTool(loadStemTool(file, id), id, initial);
    try {
      if (navigate) navigate(app);
      const before = [...app.host.querySelectorAll('button, canvas')];
      expect(before.length, 'expected interactive content on the "' + label + '" view').toBeGreaterThan(0);

      app.set('identityProbe', 1);

      const detached = before.filter((b) => !b.isConnected);
      expect(detached.length,
        'view remounted on host re-render (' + detached.length + '/' + before.length
        + ' nodes detached) — component identity is not stable').toBe(0);
    } finally {
      app.teardown();
    }
  }, 40_000);
});
