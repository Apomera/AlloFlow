// SEL Hub · HOWL Tracker: no per-item boilerplate, curated micro-actions, station record as evidence.
//
// A duplication scan of the tool's generated libraries found fields whose value was identical on
// every row: 80 exemplars each "explained" by the same sentence behind a "Why is this L3?" button,
// 41 misconceptions sharing one "truth" and one "reframe", 150 coaching moves with the same four
// notes, 200 micro-actions that were 50 actions copied under all four HOWLs with the same "why".
// Shown per item that text pretends to be specific. The tool now strips constant fields at load,
// says each once where it is true, and carries 50 curated micro-actions placed under the HOWL they
// serve. The weekly check-in also offers the student's recorded Crew station steps as evidence.
// Mounted through the REAL renderTool.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
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
  load(resolve(SEL, 'sel_tool_howl.js'));
}

let store = {};
function mount(toolData) {
  const noop = () => {};
  store = { howlTracker: Object.assign({}, toolData) };
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  let root, container;
  const render = () => { act(() => { root.render(React.createElement(() => window.SelHub.renderTool('howlTracker', ctx()))); }); };
  const setToolData = (fn) => { store = typeof fn === 'function' ? fn(store) : Object.assign({}, store, fn); render(); };
  const ctx = () => new Proxy({
    // Real host arity: update(toolId, key, val) and updateMulti(toolId, patch); a (key, val) stub
    // would silently replace the tool's state with a string (see the harness-arity memory).
    React, toolData: store, setToolData,
    update: (toolId, key, val) => setToolData((p) => { const n = Object.assign({}, p); n[toolId] = Object.assign({}, p[toolId], { [key]: val }); return n; }),
    updateMulti: (toolId, patch) => setToolData((p) => { const n = Object.assign({}, p); n[toolId] = Object.assign({}, p[toolId], patch); return n; }),
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: 'howlTracker', addToast: noop, awardXP: noop, getXP: () => 0,
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
  return { container, rerender: render, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
function click(el) { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); }
function tabButton(container, label) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim().indexOf(label) >= 0);
}

const src = readFileSync(resolve(SEL, 'sel_tool_howl.js'), 'utf8');

describe('HOWL Tracker · the source no longer carries the duplicated bank', () => {
  it('MICRO_ACTIONS is 50 curated rows with howls arrays and a reason each', () => {
    const start = src.indexOf('var MICRO_ACTIONS = [');
    const block = src.slice(start, src.indexOf('\n  ];', start));
    const rows = block.match(/\{ id: "ma_\d+"/g) || [];
    expect(rows.length).toBe(50);
    expect((block.match(/howls: \[/g) || []).length).toBe(50);
    expect((block.match(/why: "/g) || []).length).toBe(50);
    expect(block).not.toContain('Consistent small action builds the habit.');
    expect(block).not.toContain('Lally et al');
  });
  it('a load-time scrub removes fields that are identical on every row', () => {
    expect(src).toContain('function _howScrubConstants(name, lib)');
    expect(src).toContain("_howScrubConstants(pair[0], pair[1])");
  });
});

describe.skipIf(!R)('HOWL Tracker · what the student sees', () => {
  beforeAll(setup);
  afterEach(() => { window.__alloflowSelStations = null; window.__alloflowSelProgress = null; });

  it('Goals: micro-actions carry their own reason, and the boilerplate line is gone', () => {
    const h = mount({ view: 'goals' });
    const text = h.container.textContent;
    expect(text).toContain('Micro-actions you could try this week');
    expect(text).not.toContain('Consistent small action builds the habit.');
    const adds = Array.from(h.container.querySelectorAll('button[aria-label^="Add micro-action: "]'));
    expect(adds.length).toBeGreaterThanOrEqual(6);
    // Crew Membership suggestions are Crew actions, not the same list as Active Engagement.
    const byHowl = {};
    h.container.querySelectorAll('h4').forEach((h4) => {
      const list = h4.nextSibling; if (!list) return;
      byHowl[h4.textContent] = Array.from(list.querySelectorAll('button[aria-label^="Add micro-action: "]')).map((b) => b.getAttribute('aria-label'));
    });
    const keys = Object.keys(byHowl);
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(byHowl[keys[0]].join('|')).not.toBe(byHowl[keys[1]].join('|'));
    h.unmount();
  });

  it('Exemplars: no "Why is this L?" reveal that would answer with one shared sentence', () => {
    const h = mount({ view: 'exemplars' });
    const text = h.container.textContent;
    expect(text).toContain('Exemplar Stories');
    expect(h.container.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(Array.from(h.container.querySelectorAll('button')).some((b) => /Why is this L\d/.test(b.textContent))).toBe(false);
    // The sentence that was behind every reveal now appears once, up front.
    expect(text.split('sustained pattern, not a single moment').length - 1).toBe(1);
    h.unmount();
  });

  it('Misconceptions: the reveal keeps the per-item "why" and drops the shared truth/reframe', () => {
    const h = mount({ view: 'misconceptions' });
    const reframe = Array.from(h.container.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Reframe');
    expect(reframe).toBeTruthy();
    click(reframe);
    const text = h.container.textContent;
    expect(text).toContain('Why:');
    expect(text).not.toContain('I see you are operating from this assumption');
    expect(text).not.toContain('Your interpretation makes complete sense given what you have experienced');
    expect(text.split('practices that can be learned').length - 1).toBe(1);
    h.unmount();
  });

  it('Rituals: the one facilitator tip that was on every opener is stated once in the intro', () => {
    const h = mount({ view: 'rituals' });
    const text = h.container.textContent;
    expect(text.split('offer a pass option').length - 1).toBe(1);
    h.unmount();
  });

  it('Weekly check-in: recorded Crew station steps are offered as evidence and land in the HOWL evidence box', () => {
    window.__alloflowSelStations = [{ id: 'st1', name: 'Crew station: Week 3', tools: ['zones'], quests: [
      { qid: 'q_time', type: 'timeSpent', toolId: 'zones', label: 'Spend 5 minutes in Emotion Zones', params: { minutes: 5 } },
      { qid: 'q_check', type: 'manualComplete', toolId: 'zones', label: 'I did a one-word check-in this week', params: {} }] }];
    window.__alloflowSelProgress = { st1: { q_check: { complete: true, completedAt: new Date().toISOString() }, q_time: { timeAccumMs: 60000 } } };
    const h = mount({ view: 'checkin' });
    const block = h.container.querySelector('[data-howl-station-evidence]');
    expect(block, 'station record block').toBeTruthy();
    expect(block.textContent).toContain('I did a one-word check-in this week');
    expect(block.textContent).not.toContain('Spend 5 minutes in Emotion Zones');
    const add = block.querySelector('button[aria-label^="Add "]');
    expect(add).toBeTruthy();
    const howlName = add.getAttribute('aria-label').replace(/^Add .* to /, '').replace(/ evidence$/, '');
    click(add);
    const box = Array.from(h.container.querySelectorAll('textarea[id^="howl-evidence-"]')).find((t) => t.value.indexOf('I did a one-word check-in this week') >= 0);
    expect(box, 'evidence box for ' + howlName).toBeTruthy();
    expect(box.value).toMatch(/I did a one-word check-in this week \(.*\) — $/);
    h.unmount();
  });

  it('Weekly check-in: no block when nothing is recorded', () => {
    window.__alloflowSelStations = [{ id: 'st1', name: 'x', tools: ['zones'], quests: [{ qid: 'q', type: 'manualComplete', toolId: 'zones', label: 'Step', params: {} }] }];
    window.__alloflowSelProgress = { st1: { q: { passed: true } } };
    const h = mount({ view: 'checkin' });
    expect(h.container.querySelector('[data-howl-station-evidence]')).toBeNull();
    h.unmount();
  });
});
