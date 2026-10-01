// SwimLab — Rules-of-Hooks regression gate for the CONDITIONAL VIEW DISPATCH.
//
// The bug this pins (reported from a live session 2026-07-23): SwimLab's render
// ends in a long `if (view === 'menu') … else if (view === 'coldShock') …` chain,
// and the branch bodies each called their own useState/useEffect (scenarioCard's
// reveal state, miniQuizBlock's index+results, renderAskLifeguard's q/ans/loading,
// renderCumulative's badge effect). All of those hooks belong to the HOST
// component (stem_lab_module.js StemPluginBridge), so opening a module from the
// menu grew the hook count mid-life and React threw:
//   "Rendered more hooks than during the previous render."
// The tool's own try/catch swallowed it into the red "SwimLab error:" box and
// re-threw on every subsequent render, so the console filled with the same stack
// ~every 2s while the module stayed unusable.
//
// The golden digest test (stem_sim_tools_golden.test.js) could not catch this:
// it renders swimLab ONCE, in the default 'menu' view. A hook-count violation
// only appears on the SECOND render with a different view. So this file mounts
// the tool statefully and walks every view, asserting each transition commits
// without a hooks error and without the error box.
//
// If this fails, the fix is NOT to re-order hooks inside the branch — it is to
// allocate the hook in the fixed hook budget at the top of render() and hand the
// slot down (see the "Fixed hook budget" block in stem_tool_swimlab.js).

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

// Deliberately NOT using tests/helpers/stem_widgets_smoke_harness.js: that helper
// pins the React copy to a single hard-coded vendor path, and this suite must
// keep running while that directory is being relocated. Resolve React from
// whichever vendor tree is present, newest layout first.
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('stem_swimlab_hook_order: no vendored React found');

const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_FILE = 'stem_lab/stem_tool_swimlab.js';

// Minimal stand-in for the host registry. The tool file is a self-registering
// IIFE, so loading it is just evaluating the source against this window.
function loadSwimLab() {
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
  const cfg = reg._registry.swimLab;
  if (!cfg) throw new Error(TOOL_FILE + ' did not register "swimLab"');
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
  'menu', 'howSwimming', 'coldShock', 'ripCurrents', 'reachThrow', 'pfd',
  'iceSafety', 'hypothermia', 'drainEntrap', 'autismWater', 'cumulative',
  'askLifeguard', 'resources', 'strokeHunt', 'menu',
];

// Stateful host that owns toolData the way StemPluginBridge does, and exposes
// ctx.update so the test can navigate without synthesising click events.
function mountSwimLab(cfg) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {};
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });

  function Harness() {
    const [toolData, setToolData] = React.useState({ swimLab: {} });
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
      stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
      icons: Icons, t: (k, f) => f || k, tryAward: noop, getXP: () => 0,
    });
  }

  act(() => { root.render(React.createElement(Harness)); });
  api.html = () => host.innerHTML;
  api.goTo = (view) => { act(() => { api.update('swimLab', 'view', view); }); };
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
  consoleErrors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrors.push(args.map((a) => (a && a.message) || String(a)).join(' '));
  });
});

function hookErrors() {
  return consoleErrors.filter((line) =>
    /Rendered (more|fewer) hooks|order of Hooks|Rules of Hooks/i.test(line));
}

describe('SwimLab — hook order across the view dispatch', () => {
  it('walks every view in one mounted instance without a hooks-order error', () => {
    const app = mountSwimLab(loadSwimLab());
    try {
      for (const view of VIEWS) {
        app.goTo(view);
        const html = app.html();
        // The tool's own try/catch turns a render throw into this box rather
        // than propagating, so a plain "did not throw" assertion is not enough.
        expect(html, 'error box rendered after navigating to ' + view).not.toContain('SwimLab error:');
        expect(html.length, 'empty render for view ' + view).toBeGreaterThan(200);
        expect(hookErrors(), 'hooks violation after navigating to ' + view).toEqual([]);
      }
    } finally {
      app.teardown();
    }
  }, 20_000);

  it('survives module → module → menu → module round trips', () => {
    const app = mountSwimLab(loadSwimLab());
    try {
      // The hook-count delta is largest between the menu (no branch hooks) and a
      // module (scenario cards + mini-quiz), so hammer that specific edge.
      for (let i = 0; i < 3; i++) {
        app.goTo('coldShock');
        app.goTo('menu');
        app.goTo('askLifeguard');
        app.goTo('autismWater');
      }
      expect(hookErrors()).toEqual([]);
      expect(app.html()).not.toContain('SwimLab error:');
    } finally {
      app.teardown();
    }
  });

  // NOTE: this is a cheap supplement, not the gate. It only sees hooks written
  // INLINE in the dispatch chain (the strokeHunt branch is an inline IIFE) — the
  // original defect lived in helper functions defined above the dispatch and
  // merely CALLED from a branch, which no line-position check can see. The two
  // runtime walks above are what actually catch that.
  it('keeps hook calls out of the inline dispatch branches (static guard)', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');
    const dispatchAt = src.indexOf("if (view === 'menu')");
    expect(dispatchAt).toBeGreaterThan(0);
    const below = src.slice(dispatchAt);
    const strays = below.match(/\buse(State|Effect|Ref|Memo|Callback|LayoutEffect|Reducer)\s*\(/g) || [];
    expect(strays, 'hook call found below the conditional view dispatch').toEqual([]);
  });
});
