// SEL Hub · a pack link opens a tool the app has not loaded yet, and the hub keeps the tool data a
// project loaded while it was closed.
//
// Since 2026-09-20 the app loads the hub with only its two support files; each sel_tool_*.js is
// fetched when something asks for it (window.__alloEnsureSelPluginLoaded). A pack link only waited
// for its tool to register and nothing asked for it, so every tool link in every Crew pack opened
// an empty hub and, 20 s later, "X is not available in this SEL Hub" (found in Chromium,
// 2026-09-22). Every other link test preloads all the tool files, which is how that stayed green.
// This one loads what the app loads and stands in for the host's lazy loader.
//
// The hub also remounts on every open and started its per-tool data from {}, so its mirror effect
// wiped what a project load had put in window.__alloflowSelToolData (a week-4 goal, week-6 HOWL
// check-ins) before anything read it.
//
// SEL_HUB_MODULE_PATH points the suite at a copy of sel_hub_module.js for mutation runs.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }

let React, RDC, act;
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);

// The host's lazy loader, reduced to what the hub can see: a request per tool (repeats ignored,
// as the real loadOne does while a load is in flight or done) and a state per tool.
const requested = [];
const states = {};
function finishLoading(toolId, file) {
  load(join(SEL, file));
  states[toolId] = { module: file, status: 'loaded', error: '', attempt: 1, startedAt: Date.now(), finishedAt: Date.now() };
  window.dispatchEvent(new window.CustomEvent('allo-plugins-changed', { detail: { label: 'Sel', module: file } }));
}

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  }
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  // What the app loads up front: the hub and its two support files. No tools.
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
    if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* support file, optional here */ } }
  }
  window.__alloEnsureSelPluginLoaded = (toolId) => {
    requested.push(toolId);
    if (!states[toolId]) states[toolId] = { module: 'sel_tool_' + toolId + '.js', status: 'loading', error: '', attempt: 1, startedAt: Date.now(), finishedAt: 0 };
    return true;
  };
  window.__alloGetSelPluginState = (toolId) => states[toolId] || null;
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
}

function mountHub(props) {
  const noop = () => {};
  const Icon = () => null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  const el = React.createElement(window.AlloModules.SelHub, Object.assign({
    showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
    selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '8th Grade',
    callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
    ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon,
    onExportRequested: noop,
  }, props));
  act(() => { root.render(el); });
  return { unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe.skipIf(!R)('SEL Hub · a pack link to a tool the app has not loaded', () => {
  beforeAll(setup);
  afterEach(() => { window.__alloSelHubPendingTool = null; });

  it('loads the hub the way the app does: no tool is registered up front', () => {
    expect(window.SelHub && window.SelHub.toolLinks).toBeTruthy();
    expect(window.SelHub.isRegistered('zones')).toBe(false);
  });

  it('asks the host for the tool, then opens it when it registers, with no "not available"', async () => {
    const opened = [];
    const toasts = [];
    window.__alloSelHubPendingTool = { toolId: 'zones', label: 'Emotion Zones', stationId: '', at: Date.now() };
    const h = mountHub({ setSelHubTool: (id) => opened.push(id), addToast: (m, k) => toasts.push([m, k]) });
    expect(requested, 'the link never asked the host to load its tool').toContain('zones');
    expect(opened).toEqual([]);
    expect(window.__alloSelHubPendingTool && window.__alloSelHubPendingTool.toolId).toBe('zones');
    await act(async () => {
      finishLoading('zones', 'sel_tool_zones.js');
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(window.SelHub.isRegistered('zones')).toBe(true);
    expect(opened).toEqual(['zones']);
    expect(window.__alloSelHubPendingTool).toBeNull();
    expect(toasts.filter(([m]) => /not available/i.test(String(m)))).toEqual([]);
    h.unmount();
  });
});

describe.skipIf(!R)('SEL Hub · tool data a project loaded while the hub was closed', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.toolLinks) setup(); });
  afterEach(() => { window.__alloflowSelToolData = undefined; });

  it('the hub starts from the window slot, so opening it does not wipe the saved data', () => {
    const saved = {
      goals: { goals: [{ id: 'g1', text: 'Pack my bag at 8 pm', createdWeek: 4 }] },
      howlTracker: { checkins: [{ week: 6, ratings: { respect: 3, responsibility: 2, perseverance: 3 } }] },
    };
    window.__alloflowSelToolData = saved;
    const h = mountHub({});
    expect(window.__alloflowSelToolData, 'opening the hub replaced the loaded data with {}').toEqual(saved);
    h.unmount();
    const again = mountHub({});
    expect(window.__alloflowSelToolData.goals.goals[0].text).toBe('Pack my bag at 8 pm');
    again.unmount();
  });

  it('a slot that is not a plain object still starts from {}', () => {
    window.__alloflowSelToolData = ['not', 'a', 'map'];
    const h = mountHub({});
    expect(window.__alloflowSelToolData).toEqual({});
    h.unmount();
  });
});
