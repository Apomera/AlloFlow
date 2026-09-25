// Two badges earned by one action must both be kept (2026-09-24).
//
// Seventeen SEL tools award a badge by copying the badge map captured at render
// time, adding one id and saving the copy. When one click earns two badges (a
// fifth check-in that is also the first in the fourth zone), the second save
// replaced the first: the student saw both "Badge earned" toasts and the XP, and
// only one badge was kept. Mounted through the real renderTool; the updater has
// the host's per-key semantics (stem_lab / sel_hub ctx.update(toolId, key, val)).

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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
vi.setConfig({ testTimeout: 60000, hookTimeout: 120000 });
const TOOLS = ['zones', 'civicaction', 'mindfulness'];

let loaded = false;
function setup() {
  if (loaded) return;
  loaded = true;
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
  TOOLS.forEach((id) => load(join(SEL, `sel_tool_${id}.js`)));
}

function mount(toolId, dataKey, toolData) {
  const noop = () => {};
  let store = { [dataKey]: Object.assign({}, toolData) };
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  let root;
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
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = RDC.createRoot(container);
  render();
  const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
  const button = (re) => Array.from(container.querySelectorAll('button')).find((b) => re.test(b.textContent));
  return { container, click, button, data: () => store[dataKey], unmount: () => { act(() => root.unmount()); container.remove(); } };
}

// The same one-line fix in every tool whose helper copies the render-time map. Zones
// and Mindfulness are driven below; this pins the line in the rest.
describe('every copying badge helper keeps its render copy current', () => {
  const HELPERS = ['zones', 'upstander', 'teamwork', 'social', 'safety', 'restorativecircle', 'perspective', 'mindfulness', 'journal', 'emotions', 'digitalwellbeing', 'decisions', 'coping', 'conflict', 'community', 'civicaction', 'advocacy'];
  it.each(HELPERS)('%s', (id) => {
    const lines = readFileSync(join(SEL, `sel_tool_${id}.js`), 'utf8').split('\n');
    const copies = lines.map((l, i) => [l.match(/var (\w+) = (?:Object\.assign\(\{\}, *earnedBadges\)|earnedBadges\.concat\()/), i]).filter(([m]) => m);
    expect(copies.length).toBeGreaterThan(0);
    copies.forEach(([m, i]) => {
      const save = lines.findIndex((l, j) => j > i && j < i + 25 && new RegExp(`upd\\((?:'earnedBadges',\\s*${m[1]}\\s*\\)|\\{[^}]*\\bearnedBadges:\\s*${m[1]}\\b)`).test(l));
      expect(save, `${id}:${i + 1} saves its copy`).toBeGreaterThan(i);
      expect(lines[save + 1].trim().startsWith(`earnedBadges = ${m[1]};`), `${id}:${save + 2} keeps the copy current`).toBe(true);
    });
  });
});

describe.skipIf(!R)('one action that earns two badges keeps both', () => {
  beforeAll(setup);

  it('Zones: the fifth check-in, in the fourth zone, keeps "5 check-ins" and "all zones"', () => {
    const log = ['blue', 'green', 'yellow', 'green'].map((zone, i) => ({ zone, note: '', intensity: 5, timestamp: 1000 + i }));
    const m = mount('zones', 'zones', { activeTab: 'checkin', selectedZone: 'red', checkInLog: log, earnedBadges: { first_checkin: 1 } });
    try {
      const save = m.button(/Save Check-In/);
      expect(save, 'save button').toBeTruthy();
      m.click(save);
      expect(m.data().checkInLog).toHaveLength(5);
      expect(Object.keys(m.data().earnedBadges).sort()).toEqual(['all_zones', 'checkin_5', 'first_checkin']);
    } finally { m.unmount(); }
  });

  it('Mindfulness: finishing a grounding round that also makes a 7-day streak keeps all six badges', () => {
    // Nine practices over the previous six local days; this round is the tenth, today.
    const now = new Date();
    const day = (k) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - k, 12).getTime();
    const practiceLog = [1, 2, 3, 4, 5, 6, 6, 5, 4].map((k, i) => ({ type: 'breathe', id: 'box' + i, timestamp: day(k) }));
    const m = mount('mindfulness', 'mindfulness', { activeTab: 'ground', groundStep: 4, groundCompleted: 2, practiceLog, earnedBadges: {} });
    try {
      const done = m.button(/Complete Grounding!/);
      expect(done, 'complete button').toBeTruthy();
      m.click(done);
      expect(m.data().practiceLog).toHaveLength(10);
      expect(Object.keys(m.data().earnedBadges).sort()).toEqual(['grounding_3', 'grounding_done', 'streak_3', 'streak_7', 'streak_7_new', 'total_10']);
    } finally { m.unmount(); }
  });

  it('Civic Action: opening every tab earns "Civic Champion", which nothing awarded', () => {
    const m = mount('civicAction', 'civicAction', {});
    try {
      // Re-query each time: every render here replaces the DOM, so held nodes go stale.
      const tabs = () => Array.from(m.container.querySelectorAll('[role="tab"]'));
      const count = tabs().length;
      expect(count).toBeGreaterThan(10);
      // The starting tab counts as opened; every other tab but the last:
      for (let i = 1; i < count - 1; i++) m.click(tabs()[i]);
      expect(m.data().earnedBadges || []).not.toContain('civic_champion');
      m.click(tabs()[count - 1]);
      expect(Object.keys(m.data().tabsVisited)).toHaveLength(count);
      expect(m.data().earnedBadges).toContain('civic_champion');
    } finally { m.unmount(); }
  });
});
