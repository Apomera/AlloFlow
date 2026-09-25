// SEL Hub · "Pairs naturally with" names and opens tools that have not loaded yet.
//
// Found 2026-09-23 on the live app: a tool's "Pairs naturally with" panel listed raw ids
// ("sourcesOfStrength", "motivationalInterviewing", "crisiscompanion") as dead text. The panel only
// named a partner, and only made it a button, when that tool was already REGISTERED; since tools load
// on demand (2026-09-20) a partner is registered only if someone has already opened it. The hub now
// hands tools ctx.toolLabel (from its catalog, which exists before any tool module does) and
// ctx.openTool (the card's own open path, which requests the module first).
//
// SEL_HUB_MODULE_PATH / SEL_ALIGNMENT_PATH point the suite at copies for mutation runs.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');
const ALIGN = process.env.SEL_ALIGNMENT_PATH ? resolve(process.env.SEL_ALIGNMENT_PATH) : resolve(SEL, 'sel_standards_alignment.js');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);
const requested = [];
let hubCtx = null;

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
  // What the app loads up front: the hub and its support files. No tools.
  load(HUB);
  load(ALIGN);
  if (existsSync(join(SEL, 'sel_safety_layer.js'))) { try { load(join(SEL, 'sel_safety_layer.js')); } catch { /* optional */ } }
  window.__alloEnsureSelPluginLoaded = (toolId) => { requested.push(toolId); return true; };
  window.__alloGetSelPluginState = () => null;
  window.SelHub.registerTool('ctxProbe', { label: 'Ctx probe', icon: '', render: (ctx) => { hubCtx = ctx; return null; } });
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
  const Icon = () => null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: 'ctxProbe', setSelHubTool: noop, addToast: noop, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }));
  });
}

describe.skipIf(!R)('SEL Hub · tools can name and open a tool that has not loaded', () => {
  beforeAll(setup);

  it('the hub hands tools a catalog label and an open path that requests the module', () => {
    expect(hubCtx, 'probe tool never rendered').toBeTruthy();
    expect(typeof hubCtx.toolLabel, 'ctx.toolLabel missing').toBe('function');
    expect(typeof hubCtx.openTool, 'ctx.openTool missing').toBe('function');
    expect(window.SelHub.isRegistered('emotions')).toBe(false);
    const label = hubCtx.toolLabel('emotions');
    expect(label).toBeTruthy();
    expect(label).not.toBe('emotions');
    expect(hubCtx.toolLabel('notARealTool')).toBe('');
    act(() => { hubCtx.openTool('emotions', label); });
    expect(requested).toContain('emotions');
  });

  it('the Zones panel names its unloaded partners and opens them through ctx.openTool', () => {
    const partners = window.SelHubStandards.alignments.zones.pairsWith.map((p) => p.id);
    expect(partners.length).toBeGreaterThanOrEqual(2);
    partners.forEach((id) => expect(window.SelHub.isRegistered(id)).toBe(false));
    const openTool = vi.fn();
    const ctx = { toolLabel: hubCtx.toolLabel, openTool, setSelHubTool: vi.fn(), announceToSR: () => {} };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = RDC.createRoot(container);
    act(() => { root.render(React.createElement('div', null, window.SelHubStandards.render('zones', React.createElement, ctx))); });
    const text = container.textContent;
    for (const id of partners) {
      const label = hubCtx.toolLabel(id);
      expect(text, 'partner ' + id + ' is not named').toContain(label);
    }
    const buttons = [...container.querySelectorAll('button[aria-label^="Open "]')];
    expect(buttons.length, 'unloaded partners are dead text, not buttons').toBe(partners.length);
    act(() => { buttons[0].click(); });
    expect(openTool).toHaveBeenCalledWith(partners[0], hubCtx.toolLabel(partners[0]));
    act(() => root.unmount());
    container.remove();
  });
});
