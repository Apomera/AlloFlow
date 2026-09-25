// SEL Hub · a tool selected before its module has loaded is requested, and a failed load says so.
//
// Found 2026-09-24: the hub's "Loading tool... The plugin file is still being fetched." screen showed
// whenever the selected tool was not registered, but nothing fetched it. Since tools load on demand
// (2026-09-20) only a card click (openSelToolById) requested a module; a tool selected any other way
// waited forever. The worst case is the Anxiety Toolkit's triage, which sends a student who says
// they are not safe to Crisis Companion with setSelHubTool('crisiscompanion'): if Crisis Companion
// had not been opened yet that session, the student got a loading screen that never ended.
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
const requested = [];
const retried = [];
const states = {};
const changed = (toolId) => window.dispatchEvent(new window.CustomEvent('allo-plugins-changed', { detail: { label: 'Sel', module: 'sel_tool_' + toolId + '.js' } }));

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
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
    if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* optional */ } }
  }
  window.__alloEnsureSelPluginLoaded = (toolId) => {
    requested.push(toolId);
    if (!states[toolId]) states[toolId] = { status: 'loading', error: '', attempt: 1, startedAt: Date.now(), finishedAt: 0 };
    return true;
  };
  window.__alloGetSelPluginState = (toolId) => states[toolId] || null;
  window.__alloRetrySelPlugin = (toolId) => { retried.push(toolId); states[toolId] = { status: 'loading', error: '', attempt: 2 }; return true; };
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
}

function mountHub(selHubTool) {
  const noop = () => {};
  const Icon = () => null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool, setSelHubTool: noop, addToast: noop, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }));
  });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe.skipIf(!R)('SEL Hub · a tool selected before its module loads', () => {
  beforeAll(setup);
  afterEach(() => { requested.length = 0; retried.length = 0; });

  it('the Anxiety Toolkit really does send a student to Crisis Companion by id', () => {
    const src = readFileSync(join(SEL, 'sel_tool_anxietytoolkit.js'), 'utf8');
    expect(src).toMatch(/setSelHubTool\('crisiscompanion'\)/);
  });

  it('Crisis Companion, selected before it has loaded, is requested and then opens', async () => {
    expect(window.SelHub.isRegistered('crisiscompanion')).toBe(false);
    const h = mountHub('crisiscompanion');
    expect(requested, 'nothing asked for the Crisis Companion module').toContain('crisiscompanion');
    expect(h.container.textContent).toContain('Loading tool');
    await act(async () => {
      load(join(SEL, 'sel_tool_crisiscompanion.js'));
      states.crisiscompanion = { status: 'loaded', error: '', attempt: 1, finishedAt: Date.now() };
      changed('crisiscompanion');
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(window.SelHub.isRegistered('crisiscompanion')).toBe(true);
    expect(h.container.textContent).not.toContain('Loading tool');
    h.unmount();
  });

  it('a module that fails to load says so and offers a retry, instead of loading forever', async () => {
    const h = mountHub('tipp');
    expect(requested).toContain('tipp');
    await act(async () => {
      states.tipp = { status: 'error', error: 'The file was blocked.', attempt: 1, finishedAt: Date.now() };
      changed('tipp');
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(h.container.textContent).not.toContain('Loading tool');
    expect(h.container.textContent).toMatch(/could not load/i);
    const retry = [...h.container.querySelectorAll('button')].find((b) => /try again/i.test(b.textContent));
    expect(retry, 'no retry button').toBeTruthy();
    act(() => { retry.click(); });
    expect(retried).toEqual(['tipp']);
    h.unmount();
  });
});
