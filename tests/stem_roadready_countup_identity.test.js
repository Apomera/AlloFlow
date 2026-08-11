// RoadReady — CountUp must keep a stable component identity.
//
// The bug this pins (found by dev-tools/scan_render_scoped_components.cjs,
// 2026-08-11): CountUp was defined INSIDE render(), so every host re-render
// produced a new function identity. React compares element types by
// reference, so both menu-dashboard stat counters (`h(CountUp, ...)`)
// unmounted and remounted on every toolData write — restarting the 0→target
// count-up animation from scratch whenever anything else touched state.
// Same class as birdlab's species views (stem_birdlab_view_state_stability):
// no crash, no console error, just a subtree that can't hold state.
//
// The observable: a remount DETACHES the old DOM node. So we grab the
// percent spans CountUp renders, write an unrelated toolData key, and assert
// the original nodes are still connected (reconciled in place).
//
// Fix: module-scope factory getRoadReadyCountUp(React) — built once, stable
// identity; the render-scope `var CountUp = getRoadReadyCountUp(React)` keeps
// every call site unchanged.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('stem_roadready_countup_identity: no vendored React found');

const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_FILE = 'stem_lab/stem_tool_roadready.js';

function loadRoadReady() {
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
  new Function(readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8'))();
  const cfg = reg._registry.roadReady;
  if (!cfg) throw new Error(TOOL_FILE + ' did not register "roadReady"');
  return cfg;
}

const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const noop = () => {};

function mountRoadReady(cfg) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {};
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });

  function Harness() {
    const [toolData, setToolData] = React.useState({ roadReady: {} });
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
  api.set = (key, val) => { act(() => { api.update('roadReady', key, val); }); };
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

// CountUp renders `(prefix)(number)(suffix)` in a span; on the menu dashboard
// both usages carry a '%' suffix and start at 0 (the rAF stub never ticks).
function percentSpans(host) {
  return [...host.querySelectorAll('span')].filter((s) => /^\d+(\.\d+)?%$/.test(s.textContent));
}

describe('RoadReady — CountUp identity across host re-renders', () => {
  it('keeps the dashboard counter DOM nodes attached across an unrelated toolData write', () => {
    const app = mountRoadReady(loadRoadReady());
    try {
      const before = percentSpans(app.host);
      expect(before.length, 'expected CountUp percent spans on the menu dashboard').toBeGreaterThan(0);

      // Unrelated write → host re-render. A stable component reconciles its
      // span in place; a per-render identity remounts (old node detaches).
      app.set('rrIdentityProbe', 1);

      const detached = before.filter((s) => !s.isConnected);
      expect(detached.length,
        'CountUp remounted on host re-render (component identity is not stable)').toBe(0);
    } finally {
      app.teardown();
    }
  }, 30_000);
});
