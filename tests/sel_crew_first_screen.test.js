// SEL Hub · the first screen of the Crew-linked tools, second pass (see review queue 19o).
//
// After the screenshot walk: Zones opened on 23 tabs, Executive Function's unexplored tabs looked
// disabled under a "2/11" badge, Growth Mindset offered an "AI Coach" chat with a disabled input
// when no AI provider exists, and eight of the thirteen Crew tools showed the hub's generic
// "Complete one small step" line. Mounted through the REAL renderTool with the host's updater
// arity; no AI provider.

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
let React, RDC, act;

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  ['sel_tool_zones.js', 'sel_tool_execfunction.js', 'sel_tool_growthmindset.js'].forEach((f) => load(join(SEL, f)));
}

let store = {};
function mount(toolId, toolData) {
  const noop = () => {};
  store = { [toolId]: Object.assign({}, toolData) };
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  let root, container;
  const render = () => { act(() => { root.render(React.createElement(() => window.SelHub.renderTool(toolId, ctx()))); }); };
  const setToolData = (fn) => { store = typeof fn === 'function' ? fn(store) : Object.assign({}, store, fn); render(); };
  const ctx = () => new Proxy({
    React, toolData: store, setToolData,
    update: (id, key, val) => setToolData((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id], { [key]: val }); return n; }),
    updateMulti: (id, patch) => setToolData((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id], patch); return n; }),
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: toolId, addToast: noop, awardXP: noop, getXP: () => 0,
    getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle', toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: { onExportRequested: noop },
  }, { get: (o, p) => (p in o ? o[p] : noop) });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = RDC.createRoot(container);
  render();
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
function click(el) { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); }

describe('SEL Hub · every Crew-linked tool has a specific Next step in the tool header', () => {
  const hub = readFileSync(resolve(SEL, 'sel_hub_module.js'), 'utf8');
  const start = hub.indexOf('_standardShellTools: {');
  const block = hub.slice(start, hub.indexOf('\n        registerTool: function', start));
  // Every tool the Crew packs link, read from the packs so a new week cannot ship a generic line.
  const crew = [...new Set(readdirSync(resolve(ROOT, 'allopacks')).filter((f) => f.startsWith('crew_') && f.endsWith('.allopack.json'))
    .flatMap((f) => [...readFileSync(resolve(ROOT, 'allopacks', f), 'utf8').matchAll(/\]\(#sel-hub\/([A-Za-z]+)(?:\?[^)]*)?\)/g)].map((m) => m[1])))].sort();
  it('the packs link at least thirteen tools', () => { expect(crew.length).toBeGreaterThanOrEqual(13); });
  it.each(crew)('%s', (id) => {
    const m = new RegExp('\\n\\s*' + id + ': \\{[^}]*next: \'([^\']+)\'').exec(block);
    expect(m, id + ' has a next line').toBeTruthy();
    expect(m[1].length).toBeGreaterThan(30);
    expect(m[1]).not.toMatch(/Complete one small step/);
  });
});

describe.skipIf(!R)('Crew-linked tools · first screen', () => {
  beforeAll(setup);

  it('Zones: nine core tabs show, the rest sit behind "More", and a hidden tab that is active opens the row', () => {
    const h = mount('zones', {});
    const tabs = () => Array.from(h.container.querySelectorAll('[role="tab"]'));
    expect(tabs().length).toBe(9);
    expect(tabs().some((b) => /Check-In/.test(b.textContent))).toBe(true);
    const more = Array.from(h.container.querySelectorAll('button')).find((b) => /^▸ More \(\d+\)$/.test(b.textContent.trim()));
    expect(more, 'More toggle').toBeTruthy();
    expect(more.getAttribute('aria-expanded')).toBe('false');
    click(more);
    expect(tabs().length).toBe(23);
    expect(store.zones.showMoreTabs).toBe(true);
    h.unmount();
    const h2 = mount('zones', { activeTab: 'triggers' });
    expect(Array.from(h2.container.querySelectorAll('[role="tab"]')).length).toBe(23);
    h2.unmount();
  });

  it('Zones: arrow keys move within the visible tabs', () => {
    const h = mount('zones', {});
    const first = h.container.querySelector('[data-zones-tab="checkin"]');
    act(() => { first.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })); });
    expect(store.zones.activeTab).toBe('history');
    h.unmount();
  });

  it('Executive Function: the badge says what it counts, and unexplored tabs are not dimmed', () => {
    const h = mount('execfunction', {});
    expect(h.container.textContent).toMatch(/\d+ of 11 explored/);
    expect(h.container.textContent).not.toMatch(/\b\d\/11\b/);
    const hold = Array.from(h.container.querySelectorAll('[role="tab"]')).find((b) => b.getAttribute('aria-label') === 'Hold');
    expect(hold).toBeTruthy();
    expect(hold.style.color).not.toMatch(/71, 85, 105/); // not the old slate-600
    h.unmount();
  });

  it('Growth Mindset: with no AI provider the coach tab says so and hands off to Reframe It', () => {
    const h = mount('growthmindset', { activeTab: 'coach' });
    const tab = Array.from(h.container.querySelectorAll('[role="tab"], button')).find((b) => /AI Coach/.test(b.textContent));
    expect(tab).toBeTruthy();
    expect(tab.textContent).toContain('AI Coach (off)');
    const off = h.container.querySelector('[data-gm-coach-off]');
    if (off) {
      expect(off.textContent).toContain('The AI coach is off here');
      expect(h.container.querySelector('input[placeholder*="struggling"]')).toBeNull();
      const go = Array.from(off.querySelectorAll('button')).find((b) => /Open Reframe It/.test(b.textContent));
      click(go);
      expect(store.growthmindset.activeTab).toBe('reframe');
    } else {
      // A consent screen stands in front of the coach; the tab label alone tells the student.
      expect(h.container.textContent).toMatch(/consent|agree|before you start/i);
    }
    h.unmount();
  });
});
