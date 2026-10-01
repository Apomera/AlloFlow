// BirdLab — view-local state must survive host re-renders.
//
// The bug this pins (found 2026-08-11 while triaging the hook-order sweep):
// the Phase-4 species-family views were built by a factory INSIDE render()
// (`var SparrowsView = makeSpeciesView(...)`), so every host re-render created
// a brand-new function identity. React compares element types by reference,
// so `h(SparrowsView)` after any toolData write (XP award, badge, view sync,
// localStorage hydration) unmounted the old view and mounted a fresh one —
// silently resetting the component-local useState that tracks which species
// the student is reading. No crash, no console error: the student just snaps
// back to species #1 whenever anything else touches state.
//
// Fix: the species view is one module-scope component
// (BirdSpeciesFamilyView) with a stable identity, parameterized via props and
// keyed per family, so re-renders reconcile instead of remounting. Same
// pattern as numberline/punnett's cached components.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('stem_birdlab_view_state_stability: no vendored React found');

const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_FILE = 'stem_lab/stem_tool_birdlab.js';

function loadBirdLab() {
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
  const cfg = reg._registry.birdLab;
  if (!cfg) throw new Error(TOOL_FILE + ' did not register "birdLab"');
  return cfg;
}

const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const noop = () => {};

function mountBirdLab(cfg, initial) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {};
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });

  function Harness() {
    const [toolData, setToolData] = React.useState({ birdLab: initial || {} });
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
  api.click = (el) => { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); };
  api.set = (key, val) => { act(() => { api.update('birdLab', key, val); }); };
  api.teardown = () => {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  };
  return api;
}

// The species chips are the only text-xs buttons on a species-family view;
// the selected chip carries the solid accent + text-white classes.
function chips(host) {
  return [...host.querySelectorAll('button')].filter((b) => /text-xs/.test(b.className));
}
function selectedChipText(host) {
  const sel = chips(host).filter((b) => /text-white/.test(b.className));
  return sel.length === 1 ? sel[0].textContent : '(none or multiple: ' + sel.length + ')';
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

describe('BirdLab — species-family view state survives host re-renders', () => {
  it('keeps the selected species across an unrelated toolData write', () => {
    const app = mountBirdLab(loadBirdLab(), { view: 'sparrows' });
    try {
      const chipList = chips(app.host);
      expect(chipList.length, 'expected the sparrows view species chips').toBeGreaterThan(2);
      const target = chipList[1].textContent;

      app.click(chipList[1]);
      expect(selectedChipText(app.host), 'clicking a chip should select it').toBe(target);

      // An unrelated host write (XP award, badge, hydration…) re-renders the
      // host. The open species view must reconcile, not remount.
      app.set('blXp', 999);
      expect(selectedChipText(app.host),
        'selection must survive a host re-render (component identity must be stable)').toBe(target);
      expect(hookErrors()).toEqual([]);
    } finally {
      app.teardown();
    }
  }, 30_000);

  it('keeps the selection across every species family view', () => {
    for (const view of ['thrushes', 'woodpeckers', 'finches', 'blackbirds', 'hummswift', 'flyvireo']) {
      const app = mountBirdLab(loadBirdLab(), { view });
      try {
        const chipList = chips(app.host);
        expect(chipList.length, view + ': expected species chips').toBeGreaterThan(1);
        const target = chipList[1].textContent;
        app.click(chipList[1]);
        app.set('blXp', 7);
        expect(selectedChipText(app.host), view + ': selection lost on host re-render').toBe(target);
      } finally {
        app.teardown();
      }
    }
  }, 60_000);
});
