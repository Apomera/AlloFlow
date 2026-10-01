// SEL Hub — a tab bar that says it is a tablist must move with the arrow keys.
//
// 66 SEL tool tab bars declare role="tablist" / role="tab". A screen reader
// announces that as "use the arrow keys to switch tabs", and 54 of them never
// handled a key, so Left/Right did nothing. The fix lives in the HOST shell
// (sel_hub_module.js renderTool / _wrapStandardToolShell): one delegated
// onKeyDown that moves focus between the tabs of the focused tab's own
// tablist, wrapping, with Home/End. Activation stays on Enter/Space (manual
// activation) so arrowing past a tab never fires that tab's onClick.
//
// These assertions MOUNT real tools through the real renderTool and dispatch
// real key events. A source grep would pass on a handler that never fires.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }

// A spread of tab-bar shapes: inline-style bars (mindfulness, journal), Tailwind
// bars (cultureexplorer), the small "sections" bars of the clinical tools
// (sensoryregulation), and a tool that ALREADY handles its own keys (teamwork
// declares onKeyDown on its tablist) — the shell must not fight it.
const TOOLS = ['mindfulness', 'journal', 'cultureexplorer', 'sensoryregulation', 'teamwork'];

let React, RDC, act;

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
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort()
    .forEach((f) => { try { load(join(SEL, f)); } catch { /* tool-local load issue */ } });
}

function ctxFor(id) {
  const noop = () => {};
  const pal = { bg: '#0f172a', bgCard: '#1e293b', text: '#f1f5f9', textMuted: '#94a3b8', border: '#64748b', accent: '#7c3aed', accentText: '#fff' };
  const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const base = {
    React, toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: id,
    addToast: noop, awardXP: noop, getXP: () => 0,
    getSavePolicy: () => ({ checkpointLabel: 'Private checkpoint', sharePacketLabel: 'Share Packet eligible' }),
    announceToSR: noop, celebrate: noop, beep: noop, t: (k) => k, theme,
    isDark: true, isContrast: false, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }),
    gradeLevel: '8th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: { onExportRequested: noop },
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

function toolIdFor(name) {
  const src = readFileSync(join(SEL, 'sel_tool_' + name + '.js'), 'utf8');
  const m = src.match(/registerTool\(\s*'([^']+)'/);
  return m ? m[1] : name;
}

// Mount through the shell (what students get) or the bare tool.render (the
// calibration control): the bare tool must NOT move focus, or this suite would
// pass on tools that happen to handle keys themselves and prove nothing about
// the shell.
function mount(id, { bare = false } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const ctx = ctxFor(id);
  const Probe = () => (bare ? window.SelHub._registry[id].render(ctx) : window.SelHub.renderTool(id, ctx));
  const root = RDC.createRoot(container);
  act(() => { root.render(React.createElement(Probe)); });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

function press(el, key) {
  act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}

function firstTablist(container) {
  const list = container.querySelector('[role="tablist"]');
  if (!list) return null;
  const tabs = Array.from(list.querySelectorAll('[role="tab"]')).filter((t) => t.closest('[role="tablist"]') === list);
  return tabs.length >= 2 ? { list, tabs } : null;
}

describe.skipIf(!R)('SEL Hub · tablists move with the arrow keys', () => {
  beforeAll(() => { setup(); }, 60000);

  it('the shell exposes the delegated handler', () => {
    expect(typeof window.SelHub._tablistKeyNav).toBe('function');
  });

  it.each(TOOLS)('%s: Right/Left/Home/End move focus within the tablist, wrapping', (name) => {
    const id = toolIdFor(name);
    const m = mount(id);
    try {
      const tl = firstTablist(m.container);
      expect(tl, name + ': no tablist with 2+ tabs rendered on first paint').toBeTruthy();
      const { tabs } = tl;
      tabs[0].focus();
      expect(document.activeElement, name + ': could not focus the first tab').toBe(tabs[0]);

      press(tabs[0], 'ArrowRight');
      expect(document.activeElement, name + ': ArrowRight did not move to the second tab').toBe(tabs[1]);

      press(tabs[1], 'ArrowLeft');
      expect(document.activeElement, name + ': ArrowLeft did not move back').toBe(tabs[0]);

      press(tabs[0], 'ArrowLeft');
      expect(document.activeElement, name + ': ArrowLeft on the first tab did not wrap to the last').toBe(tabs[tabs.length - 1]);

      press(tabs[tabs.length - 1], 'ArrowRight');
      expect(document.activeElement, name + ': ArrowRight on the last tab did not wrap to the first').toBe(tabs[0]);

      press(tabs[0], 'End');
      expect(document.activeElement, name + ': End did not jump to the last tab').toBe(tabs[tabs.length - 1]);

      press(tabs[tabs.length - 1], 'Home');
      expect(document.activeElement, name + ': Home did not jump to the first tab').toBe(tabs[0]);

      // Manual activation: moving focus must not select the tab.
      const selectedBefore = tabs.map((t) => t.getAttribute('aria-selected'));
      press(tabs[0], 'ArrowRight');
      const selectedAfter = tabs.map((t) => t.getAttribute('aria-selected'));
      expect(selectedAfter, name + ': arrow key changed aria-selected (activation must stay on Enter/Space)').toEqual(selectedBefore);

      // Other keys fall through untouched: Tab must never be swallowed.
      const ev = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      act(() => { tabs[1].dispatchEvent(ev); });
      expect(ev.defaultPrevented, name + ': Tab was preventDefault-ed inside the tablist').toBe(false);
    } finally { m.unmount(); }
  }, 30000);

  it('calibration: without the shell the arrow keys do nothing (proves the shell is the mechanism)', () => {
    // mindfulness has no key handling of its own; journal likewise.
    for (const name of ['mindfulness', 'journal']) {
      const id = toolIdFor(name);
      const m = mount(id, { bare: true });
      try {
        const tl = firstTablist(m.container);
        expect(tl, name + ': bare mount rendered no tablist').toBeTruthy();
        tl.tabs[0].focus();
        press(tl.tabs[0], 'ArrowRight');
        expect(document.activeElement, name + ': arrow moved focus WITHOUT the shell — the calibration is broken').toBe(tl.tabs[0]);
      } finally { m.unmount(); }
    }
  }, 30000);

  it('arrows stay inside the tab\'s OWN tablist when a tool renders more than one', () => {
    // coping renders a main tab bar and, on the Learn tab, a sub-section bar.
    const id = toolIdFor('coping');
    const m = mount(id);
    try {
      const lists = Array.from(m.container.querySelectorAll('[role="tablist"]'));
      const groups = lists.map((list) => Array.from(list.querySelectorAll('[role="tab"]')).filter((t) => t.closest('[role="tablist"]') === list)).filter((g) => g.length >= 2);
      expect(groups.length, 'coping did not render a tablist with 2+ tabs').toBeGreaterThan(0);
      const tabs = groups[0];
      tabs[tabs.length - 1].focus();
      press(tabs[tabs.length - 1], 'ArrowRight');
      expect(tabs.includes(document.activeElement), 'focus left the tablist').toBe(true);
      expect(document.activeElement).toBe(tabs[0]);
    } finally { m.unmount(); }
  }, 30000);
});
