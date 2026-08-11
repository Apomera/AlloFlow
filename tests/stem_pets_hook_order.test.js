// Pets Lab — Rules-of-Hooks regression gate for the CONDITIONAL VIEW DISPATCH.
//
// The bug this pins (found by dev-tools/scan_hook_order_branches.cjs,
// 2026-08-11): renderNutrition() declared a useEffect (ESC dismisses the Toxic
// Foods Sleuth modal) but was only invoked from the `case 'nutrition':` branch
// of the view switch. All hooks in _renderPets belong to the HOST component
// (stem_lab_module.js StemPluginBridge), so opening Nutrition from the menu
// grew the hook count mid-life and React threw:
//   "Rendered more hooks than during the previous render."  (minified: #310)
// The tool's own try/catch swallowed it into the red "Pets Lab failed to
// render." box and re-threw on every subsequent render.
//
// The sting: _renderPets' own top-of-render comment (sensory 3D hooks, ~L2025)
// states this exact rule. The nutrition effect was added later and slipped in
// anyway — which is why this is a runtime gate, not a convention.
//
// Same shape as tests/stem_swimlab_hook_order.test.js and
// tests/stem_firstresponse_hook_order.test.js: stateful mount, walk every
// view, assert no hooks error and no error box. Fix pattern: allocate the
// hook in the fixed budget at the top of _renderPets and gate the effect on
// `view === 'nutrition'`.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('stem_pets_hook_order: no vendored React found');

const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_FILE = 'stem_lab/stem_tool_pets.js';
const ERROR_BOX = 'Pets Lab failed to render';

function loadPetsLab() {
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
  const cfg = reg._registry.petsLab;
  if (!cfg) throw new Error(TOOL_FILE + ' did not register "petsLab"');
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
  'menu', 'dogs', 'cats', 'smallMammals', 'birds', 'reptiles', 'training',
  'nutrition', 'genetics', 'zoonoses', 'service', 'welfare', 'careSim',
  'sensory', 'picker', 'bodyLang', 'cost', 'lifespan', 'famous', 'aiPractice',
  'diagrams', 'glossary', 'myths', 'careers', 'action', 'quiz', 'resources',
  'teacher', 'decoderMastery', 'menu',
];

function mountPetsLab(cfg) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {};
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });

  function Harness() {
    const [toolData, setToolData] = React.useState({ petsLab: {} });
    api.data = () => toolData.petsLab || {};
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
  api.set = (key, val) => { act(() => { api.update('petsLab', key, val); }); };
  api.goTo = (view) => api.set('view', view);
  api.pressEscape = () => {
    act(() => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
  };
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
  try { delete window.__alloflowPetsLab; } catch (_) {}
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

describe('Pets Lab — hook order across the view dispatch', () => {
  it('walks every view in one mounted instance without a hooks-order error', () => {
    const app = mountPetsLab(loadPetsLab());
    try {
      for (const view of VIEWS) {
        app.goTo(view);
        const html = app.html();
        expect(html, 'error box rendered after navigating to ' + view).not.toContain(ERROR_BOX);
        expect(html.length, 'empty render for view ' + view).toBeGreaterThan(200);
        expect(hookErrors(), 'hooks violation after navigating to ' + view).toEqual([]);
      }
    } finally {
      app.teardown();
    }
  }, 20_000);

  it('survives menu → nutrition round trips (the hook-count edge)', () => {
    const app = mountPetsLab(loadPetsLab());
    try {
      for (let i = 0; i < 3; i++) {
        app.goTo('nutrition');
        app.goTo('menu');
        app.goTo('sensory');
        app.goTo('nutrition');
      }
      expect(hookErrors()).toEqual([]);
      expect(app.html()).not.toContain(ERROR_BOX);
    } finally {
      app.teardown();
    }
  });

  it('ESC still dismisses the Toxic Foods Sleuth modal from the hoisted slot', () => {
    const app = mountPetsLab(loadPetsLab());
    try {
      app.goTo('nutrition');
      app.set('tfsOpen', true);
      app.pressEscape();
      expect(app.data().tfsOpen, 'ESC on the nutrition view should close the modal').toBe(false);
      expect(hookErrors()).toEqual([]);

      // Off the nutrition view the listener must be detached: ESC elsewhere
      // must NOT touch the modal flag.
      app.set('tfsOpen', true);
      app.goTo('menu');
      app.pressEscape();
      expect(app.data().tfsOpen, 'ESC on the menu must not reach the nutrition listener').toBe(true);
      expect(hookErrors()).toEqual([]);
    } finally {
      app.teardown();
    }
  });

  // Cheap supplement, not the gate — see the NOTE in the firstresponse twin.
  it('keeps hook calls out of the inline dispatch branches (static guard)', () => {
    const src = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');
    const dispatchAt = src.indexOf('switch (view)');
    expect(dispatchAt).toBeGreaterThan(0);
    const below = src.slice(dispatchAt);
    const strays = below.match(/\buse(State|Effect|Ref|Memo|Callback|LayoutEffect|Reducer)\s*\(/g) || [];
    expect(strays, 'hook call found below the conditional view dispatch').toEqual([]);
  });
});
