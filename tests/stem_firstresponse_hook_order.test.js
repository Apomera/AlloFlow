// FirstResponse — Rules-of-Hooks regression gate for the CONDITIONAL VIEW DISPATCH.
//
// The bug this pins (diagnosed 2026-08-11): renderCprAed() declared its own
// useState (metronome beat) + 2 useRef (audio ctx, interval) + 2 useEffect, but
// was only invoked from the `case 'cprAed':` branch of the view switch. All of
// those hooks belong to the HOST component (stem_lab_module.js
// StemPluginBridge), so opening CPR & AED from the menu grew the hook count
// mid-life and React threw:
//   "Rendered more hooks than during the previous render."  (minified: #310)
// The tool's own try/catch swallowed it into the red "First Response Lab
// failed to render." box and re-threw on every subsequent render, so the
// console filled with the same stack while the module stayed unusable.
//
// The golden digest test (stem_sim_tools_golden.test.js) could not catch this:
// it renders firstResponse ONCE, in its default view. A hook-count violation
// only appears on the SECOND render with a different view. So this file mounts
// the tool statefully and walks every view, asserting each transition commits
// without a hooks error and without the error box.
//
// If this fails, the fix is NOT to re-order hooks inside the branch — it is to
// allocate the hook in the fixed hook budget at the top of render() and hand
// the slot down (see the "CPR & AED metronome (fixed hook slots)" block in
// stem_tool_firstresponse.js, and the same pattern in stem_tool_swimlab.js).

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

// Same vendor-resolution approach as stem_swimlab_hook_order.test.js: resolve
// React from whichever vendor tree is present, newest layout first.
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('stem_firstresponse_hook_order: no vendored React found');

const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_FILE = 'stem_lab/stem_tool_firstresponse.js';
const ERROR_BOX = 'First Response Lab failed to render';

// Minimal stand-in for the host registry. The tool file is a self-registering
// IIFE, so loading it is just evaluating the source against this window.
// No makeBayViewer on the stub → the tool's BODY3D falls back to its
// FR_NULL_VIEWER and the body3d view renders its 2D controls (by design).
function loadFirstResponse() {
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
  const cfg = reg._registry.firstResponse;
  if (!cfg) throw new Error(TOOL_FILE + ' did not register "firstResponse"');
  return cfg;
}

const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const noop = () => {};

// Every branch of the view dispatch, menu last so the walk also covers
// "leave a hook-heavy module and come back".
const VIEWS = [
  'menu', 'recognize', 'call', 'cprAed', 'body3d', 'bleed', 'choking',
  'disabilityAware', 'scenarios', 'firstAction', 'aiPractice', 'resources',
  'mastery', 'decisionHunt', 'menu',
];

// Stateful host that owns toolData the way StemPluginBridge does, and exposes
// ctx.update so the test can navigate without synthesising click events.
// consentAccepted is seeded true: the consent gate blocks every module view
// (see the firstresponse tests' convention), and the gate itself renders
// before the dispatch so it cannot exercise the branch hooks.
function mountFirstResponse(cfg) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {};
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });

  function Harness() {
    const [toolData, setToolData] = React.useState({ firstResponse: { consentAccepted: true } });
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
  api.html = () => host.innerHTML;
  api.set = (key, val) => { act(() => { api.update('firstResponse', key, val); }); };
  api.goTo = (view) => api.set('view', view);
  api.teardown = () => {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  };
  return api;
}

let consoleErrors = [];

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => {
  // The tool hydrates from a window slot + localStorage; a previous test's
  // persistence effect must not leak state into the next mount.
  try { delete window.__alloflowFirstResponse; } catch (_) {}
  try { localStorage.clear(); } catch (_) {}
  consoleErrors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrors.push(args.map((a) => (a && a.message) || String(a)).join(' '));
  });
});

function hookErrors() {
  return consoleErrors.filter((line) =>
    /Rendered (more|fewer) hooks|order of Hooks|Rules of Hooks/i.test(line));
}

describe('FirstResponse — hook order across the view dispatch', () => {
  it('walks every view in one mounted instance without a hooks-order error', () => {
    const app = mountFirstResponse(loadFirstResponse());
    try {
      for (const view of VIEWS) {
        app.goTo(view);
        const html = app.html();
        // The tool's own try/catch turns a render throw into this box rather
        // than propagating, so a plain "did not throw" assertion is not enough.
        expect(html, 'error box rendered after navigating to ' + view).not.toContain(ERROR_BOX);
        expect(html.length, 'empty render for view ' + view).toBeGreaterThan(200);
        expect(hookErrors(), 'hooks violation after navigating to ' + view).toEqual([]);
      }
    } finally {
      app.teardown();
    }
  }, 20_000);

  it('survives menu → cprAed round trips (the hook-count edge)', () => {
    const app = mountFirstResponse(loadFirstResponse());
    try {
      // The hook-count delta is between the menu (no branch hooks) and the
      // CPR & AED module (metronome hooks), so hammer that specific edge.
      for (let i = 0; i < 3; i++) {
        app.goTo('cprAed');
        app.goTo('menu');
        app.goTo('body3d');
        app.goTo('cprAed');
      }
      expect(hookErrors()).toEqual([]);
      expect(app.html()).not.toContain(ERROR_BOX);
    } finally {
      app.teardown();
    }
  });

  it('keeps the metronome sub-views stable while the interval ticks', () => {
    const app = mountFirstResponse(loadFirstResponse());
    try {
      app.goTo('cprAed');
      for (const sub of ['overview', 'metronome', 'practice', 'aed']) {
        app.set('cprView', sub);
        act(() => { vi.advanceTimersByTime(1200); }); // let the beat interval fire
        expect(hookErrors(), 'hooks violation on cprAed sub-view ' + sub).toEqual([]);
        expect(app.html(), 'error box on cprAed sub-view ' + sub).not.toContain(ERROR_BOX);
      }
      // Leaving the module entirely must tear the metronome down without a
      // hooks error (the interval effect gates on view === 'cprAed').
      app.goTo('menu');
      act(() => { vi.advanceTimersByTime(1200); });
      expect(hookErrors()).toEqual([]);
    } finally {
      app.teardown();
    }
  });

  // NOTE: this is a cheap supplement, not the gate. It only sees hooks written
  // INLINE in the dispatch (the decisionHunt branch is an inline IIFE) — the
  // actual defect lived in renderCprAed, defined above the dispatch and merely
  // CALLED from a branch, which no line-position check can see. The runtime
  // walks above are what actually catch that.
  it('keeps hook calls out of the inline dispatch branches (static guard)', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');
    const dispatchAt = src.indexOf('switch (view)');
    expect(dispatchAt).toBeGreaterThan(0);
    const below = src.slice(dispatchAt);
    const strays = below.match(/\buse(State|Effect|Ref|Memo|Callback|LayoutEffect|Reducer)\s*\(/g) || [];
    expect(strays, 'hook call found below the conditional view dispatch').toEqual([]);
  });
});
