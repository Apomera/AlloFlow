// SEL Hub · Zones of Regulation's tab bar is a valid tab list.
//
// Found 2026-09-24 by an axe sweep of every Crew station tool in Chromium (week 3 opens Zones):
// aria-required-children, CRITICAL, on desktop and phone. The "More (N)" / "Fewer tabs" toggle was
// concatenated INTO role="tablist", which may only own tabs. The toggle now sits beside the list.
// Mounted through the REAL renderTool; axe itself is the check.
// ZONES_TOOL_PATH points the suite at a copy of sel_tool_zones.js for mutation runs.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const ZONES = process.env.ZONES_TOOL_PATH ? resolve(process.env.ZONES_TOOL_PATH) : resolve(SEL, 'sel_tool_zones.js');
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act, axe;

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  load(ZONES);
  axe = req('axe-core');
}

function mount(zonesData) {
  const noop = () => {};
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const updates = [];
  const base = {
    React, toolData: { zones: zonesData }, setToolData: noop, update: (tool, key, val) => updates.push([tool, key, val]), updateMulti: (tool, patch) => updates.push([tool, patch]),
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: 'zones',
    addToast: noop, awardXP: noop, getXP: () => 0, getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle', toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: { onExportRequested: noop },
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => { root.render(React.createElement(() => window.SelHub.renderTool('zones', ctx))); });
  return { container, updates, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

const moreToggle = (c) => [...c.querySelectorAll('button')].find((b) => /More \(\d+\)|Fewer tabs/.test(b.textContent));
const tabRules = { runOnly: { type: 'rule', values: ['aria-required-children', 'aria-required-parent'] } };

describe.skipIf(!R)('Zones of Regulation tab bar', () => {
  beforeAll(setup);

  it.each([
    ['the nine main tabs', {}],
    ['all tabs shown', { showMoreTabs: true }],
  ])('%s: axe finds no tab-structure violation, and the tab list owns only tabs', async (_name, data) => {
    const h = mount(data);
    const list = h.container.querySelector('[role="tablist"][aria-label="Zones of Regulation tabs"]');
    expect(list, 'Zones tab list not rendered').toBeTruthy();
    expect(list.querySelectorAll('[role="tab"]').length).toBeGreaterThanOrEqual(data.showMoreTabs ? 10 : 9);
    expect([...list.children].map((c) => c.getAttribute('role')).filter((r) => r !== 'tab')).toEqual([]);
    const res = await axe.run(h.container, tabRules);
    expect(res.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(', '))).toEqual([]);
    h.unmount();
  });

  it('the More toggle is still there, outside the list, and still toggles', () => {
    const h = mount({});
    const btn = moreToggle(h.container);
    expect(btn, 'More toggle missing').toBeTruthy();
    expect(btn.closest('[role="tablist"]')).toBeNull();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    act(() => { btn.click(); });
    expect(h.updates.some((u) => JSON.stringify(u).includes('showMoreTabs'))).toBe(true);
    h.unmount();
    const open = mount({ showMoreTabs: true });
    expect(moreToggle(open.container).getAttribute('aria-expanded')).toBe('true');
    open.unmount();
  });
});
