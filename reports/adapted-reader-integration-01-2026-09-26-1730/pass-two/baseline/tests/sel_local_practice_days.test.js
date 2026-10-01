// SEL practice history lands on the student's LOCAL day (2026-09-24).
//
// - Mindfulness "Streak" tab read entry.date, which logPractice never writes
//   ({ type, id, timestamp }), so it showed a 0-day streak and an empty 8-week
//   map however much a student practised.
// - Zones "Heatmap" read d.checkins, which nothing in Zones writes (check-ins go
//   to checkInLog, pulses to pulseRecent), so it always said "No check-ins yet".
// - Zones "In-the-Moment" check-in toasted "Check-in saved" and saved nothing.
// - Days were keyed by toISOString(), the UTC date: in Portland a 6 pm practice
//   counted as tomorrow, so calendars lit the wrong square and "streak_3" badges
//   in seven tools counted UTC days. Emotions' calendar also parsed its first
//   day as UTC midnight, which put every square one weekday column early.
// Mounted through the real renderTool, at 7:30 pm Pacific (already tomorrow in UTC).

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const TOOLS = ['mindfulness', 'zones', 'emotions', 'social', 'teamwork', 'perspective', 'decisions', 'conflict', 'community'];
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
let savedTz;
vi.setConfig({ testTimeout: 60000, hookTimeout: 120000 }); // three 20k-line tools load in jsdom

// Tue 2026-10-06, 7:30 pm PDT = 2026-10-07T02:30Z.
const NOW = '2026-10-07T02:30:00Z';
const ts = (iso) => Date.parse(iso);

function useClock(iso, tz = 'America/Los_Angeles') {
  process.env.TZ = tz;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
  // The zone must really apply, or the test proves nothing.
  const offset = new Date().getTimezoneOffset();
  expect(tz === 'Asia/Tokyo' ? offset === -540 : offset === 420 || offset === 480).toBe(true);
}

let loaded = false;
function setup() {
  if (loaded) return;
  loaded = true;
  const sg =(k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
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
  ['mindfulness', 'zones', 'emotions'].forEach((id) => load(join(SEL, `sel_tool_${id}.js`)));
}

let store = {};
let mounted = null;
function mount(toolId, toolData) {
  const noop = () => {};
  store = { [toolId]: Object.assign({}, toolData) };
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
  mounted = { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
  return container;
}
const byTitle = (c, t) => c.querySelector(`[title="${t}"]`);
const statCard = (c, label) => Array.from(c.querySelectorAll('div')).find((el) => el.children.length === 3 && el.firstElementChild.textContent === label);

beforeAll(() => { savedTz = process.env.TZ; });
afterEach(() => { if (mounted) { mounted.unmount(); mounted = null; } vi.useRealTimers(); });
afterAll(() => { if (savedTz === undefined) delete process.env.TZ; else process.env.TZ = savedTz; });

// Sun 6 pm, Mon 4 pm, Tue 4 pm, Tue 6 pm (Pacific). UTC days: Mon, Mon, Tue, Wed.
const PRACTICE = [
  { type: 'breathe', id: 'box', timestamp: ts('2026-10-05T01:00:00Z') },
  { type: 'scan', id: 'body', timestamp: ts('2026-10-05T23:00:00Z') },
  { type: 'breathe', id: 'box', timestamp: ts('2026-10-06T23:00:00Z') },
  { type: 'gratitude', id: 'three', timestamp: ts('2026-10-07T01:00:00Z') },
];

describe.skipIf(!R)('Mindfulness practice days', () => {
  beforeAll(setup);

  it('the Streak tab counts the practice log, one square per local day', () => {
    useClock(NOW);
    const c = mount('mindfulness', { activeTab: 'streak', practiceLog: PRACTICE });
    expect(statCard(c, 'Current streak').textContent).toBe('Current streak3days');
    expect(statCard(c, 'Longest streak').textContent).toBe('Longest streak3days');
    expect(statCard(c, 'Total sessions').textContent).toBe('Total sessions4all time');
    expect(byTitle(c, '2026-10-06: 2 sessions')).toBeTruthy();
    expect(byTitle(c, '2026-10-05: 1 sessions')).toBeTruthy();
    expect(byTitle(c, '2026-10-04: 1 sessions')).toBeTruthy();
    expect(byTitle(c, '2026-10-07: 0 sessions')).toBeNull();
    expect(byTitle(c, '2026-10-06: 2 sessions').style.border).toContain('2px solid');
  });

  it('keeps the streak across the 23-hour spring-forward day', () => {
    useClock('2026-03-09T07:30:00Z'); // Mon Mar 9, 12:30 am PDT; now - 24 h is Sat Mar 7
    const c = mount('mindfulness', { activeTab: 'streak', practiceLog: [
      { type: 'a', id: 'x', timestamp: ts('2026-03-08T04:00:00Z') }, // Sat 8 pm
      { type: 'a', id: 'x', timestamp: ts('2026-03-09T03:00:00Z') }, // Sun 8 pm
      { type: 'a', id: 'x', timestamp: ts('2026-03-09T07:15:00Z') }, // Mon 12:15 am
    ] });
    expect(statCard(c, 'Current streak').textContent).toBe('Current streak3days');
    expect(byTitle(c, '2026-03-08: 1 sessions')).toBeTruthy();
  });

  it('the Log calendar marks today, not yesterday, for a practice this afternoon', () => {
    useClock(NOW);
    const c = mount('mindfulness', { activeTab: 'log', practiceLog: [PRACTICE[2]] });
    const today = byTitle(c, '2026-10-06');
    expect(today.textContent).toBe('6');
    expect(today.style.border).toContain('2px solid');
    expect(today.style.background).not.toBe(byTitle(c, '2026-10-05').style.background);
    expect(byTitle(c, '2026-10-07')).toBeNull();
  });
});

describe.skipIf(!R)('Zones check-in history', () => {
  beforeAll(setup);

  it('the Heatmap shows check-ins and pulses on their local day', () => {
    useClock(NOW);
    const c = mount('zones', {
      activeTab: 'zone_history',
      checkInLog: [
        { zone: 'green', note: '', intensity: 4, timestamp: ts('2026-10-06T01:00:00Z') }, // Mon 6 pm
        { zone: 'yellow', note: '', intensity: 6, timestamp: ts('2026-10-06T23:00:00Z') }, // Tue 4 pm
        { zone: 'yellow', note: '', intensity: 7, timestamp: ts('2026-10-07T01:00:00Z') }, // Tue 6 pm
      ],
      pulseRecent: [{ zone: 'red', note: '', date: '2026-10-07T02:00:00.000Z' }], // Tue 7 pm
    });
    expect(c.textContent).not.toContain('No check-ins yet');
    expect(byTitle(c, '2026-10-06: yellow zone')).toBeTruthy();
    expect(byTitle(c, '2026-10-05: green zone')).toBeTruthy();
    expect(byTitle(c, '2026-10-07: no check-in')).toBeNull();
    expect(c.textContent).toContain('yellow zone50%2 check-ins');
    expect(c.textContent).toContain('red zone25%1 check-ins');
  });

  it('the Heatmap has a square for the spring-forward day', () => {
    useClock('2026-03-09T07:30:00Z'); // Mon Mar 9, 12:30 am PDT
    const c = mount('zones', { activeTab: 'zone_history', checkInLog: [{ zone: 'green', note: '', intensity: 4, timestamp: ts('2026-03-09T03:00:00Z') }] }); // Sun 8 pm
    expect(byTitle(c, '2026-03-08: green zone')).toBeTruthy();
    expect(byTitle(c, '2026-03-09: no check-in')).toBeTruthy();
  });

  it('In-the-Moment "Save & restart" keeps the check-in it announces as saved', () => {
    useClock(NOW);
    const c = mount('zones', { activeTab: 'checkin_flow', cfStep: 3, cfPredicted: 'yellow', cfIntensity: 7, checkInLog: [{ zone: 'green', note: 'x', intensity: 3, timestamp: 1 }] });
    const save = Array.from(c.querySelectorAll('button')).find((b) => b.textContent === 'Save & restart');
    act(() => { save.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
    const log = store.zones.checkInLog;
    expect(log).toHaveLength(2);
    expect(log[1]).toMatchObject({ zone: 'yellow', intensity: 7, source: 'in_the_moment', timestamp: ts(NOW) });
    expect(store.zones.cfStep).toBe(0);
  });
});

describe.skipIf(!R)('Emotions mood calendar', () => {
  beforeAll(setup);

  it('an evening check-in lands on today, under the right weekday', () => {
    useClock(NOW);
    const c = mount('emotions', {
      activeTab: 'history',
      checkinHistory: [{ family: 'happy', feeling: 'happy', intensity: 6, timestamp: ts('2026-10-07T01:00:00Z') }], // Tue 6 pm
    });
    const cell = Array.from(c.querySelectorAll('[title]')).find((el) => el.getAttribute('title').startsWith('2026-10-06 '));
    expect(cell).toBeTruthy();
    expect(cell.style.fontWeight).toBe('800'); // today's square
    expect(Array.from(c.querySelectorAll('[title]')).some((el) => el.getAttribute('title').startsWith('2026-10-07'))).toBe(false);
    // 7 weekday headers, then padding, then days: Tuesday sits in column 2.
    const slots = Array.from(cell.parentNode.children).slice(7);
    expect(slots.indexOf(cell) % 7).toBe(2);
  });
});

describe('the seven practice-streak badges count local days', () => {
  // Pull logPractice out of each tool and run it with stubs, so the badge rule is exercised.
  function logPracticeOf(id, practiceLog, awarded) {
    const src = readFileSync(join(SEL, `sel_tool_${id}.js`), 'utf8');
    const start = src.indexOf('function logPractice(');
    let depth = 0; let end = -1;
    for (let i = src.indexOf('{', start); i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) { end = i + 1; break; }
    }
    const helper = src.slice(src.indexOf('function selLocalDay('), src.indexOf("window.SelHub.registerTool('"));
    const scope = new Proxy({ practiceLog, tryAwardBadge: (b) => awarded.push(b) }, {
      has: () => true,
      get: (o, k) => (k in o ? o[k] : (k === Symbol.unscopables ? undefined : (k in globalThis ? globalThis[k] : () => {}))),
    });
    // eslint-disable-next-line no-new-func
    return new Function('scope', `with (scope) { ${helper}; return (${src.slice(start, end)}); }`)(scope);
  }

  it.each(['mindfulness', 'social', 'teamwork', 'perspective', 'decisions', 'conflict', 'community'])('%s', (id) => {
    // Pacific, Tue 3 pm: Sun 4 pm + Mon 6 pm + now are three local days (UTC: Sun, Tue, Tue).
    useClock('2026-10-06T22:00:00Z');
    let awarded = [];
    logPracticeOf(id, [{ type: 'a', id: 'x', timestamp: ts('2026-10-04T23:00:00Z') }, { type: 'a', id: 'x', timestamp: ts('2026-10-06T01:00:00Z') }], awarded)('a', 'x');
    expect(awarded).toContain('streak_3');
    // Tokyo, Wed 8 am, where UTC is still yesterday: Mon 8 pm + Tue 8 pm + now.
    useClock('2026-10-06T23:00:00Z', 'Asia/Tokyo');
    awarded = [];
    logPracticeOf(id, [{ type: 'a', id: 'x', timestamp: ts('2026-10-05T11:00:00Z') }, { type: 'a', id: 'x', timestamp: ts('2026-10-06T11:00:00Z') }], awarded)('a', 'x');
    expect(awarded).toContain('streak_3');
  });
});

describe('no UTC calendar day is left in these tools', () => {
  it.each(TOOLS)('%s', (id) => {
    const src = readFileSync(join(SEL, `sel_tool_${id}.js`), 'utf8');
    expect(src).not.toMatch(/toISOString\(\)\.slice\(0, ?10\)/);
    expect(src.split('function selLocalDay(').length - 1).toBe(1);
    expect(readFileSync(join(ROOT, 'desktop/web-app/public/sel_hub', `sel_tool_${id}.js`), 'utf8')).toBe(src);
  });
});
