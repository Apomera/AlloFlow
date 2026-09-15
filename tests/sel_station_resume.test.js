// SEL Hub · an active station survives closing the hub and a reload, and says when it is done.
//
// A Crew station's self-check is a week-long commitment ("I did a one-word check-in at the start
// of a class this week"), and its time step only counts while the station is active. The hub
// component exists only while open, so React state forgot the station every time a student
// closed the hub; on Thursday they had to find it in the History panel again. The active id now
// lives in a module memo (page lifetime, storage or not) and localStorage (reload), is dropped
// when its record disappears, and the guide says when every step is recorded.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
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
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  }
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  ['sel_tool_zones.js', 'sel_tool_sensoryregulation.js'].forEach((f) => { try { load(join(SEL, f)); } catch { /* tool-local */ } });
  if (!window.SelHub.isRegistered('zones')) {
    readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort().forEach((f) => { try { load(join(SEL, f)); } catch { /* tool-local */ } });
  }
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
    selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '7th Grade',
    callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
    ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon,
    onExportRequested: noop,
  }, props));
  act(() => { root.render(el); });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

const STATION = { id: 'sel_station_resume_test', name: 'Crew station: resume test', tools: ['zones', 'sensoryRegulation'], teacherNote: 'note',
  quests: [{ qid: 'q_time', type: 'timeSpent', toolId: 'zones', label: 'Spend 5 minutes in Emotion Zones', params: { minutes: 5 } },
           { qid: 'q_check', type: 'manualComplete', toolId: 'sensoryRegulation', label: 'I did a one-word check-in this week', params: {} }],
  createdAt: '2026-09-13T18:00:00.000Z', source: 'allopack' };

function seedStations(list) {
  window.localStorage.setItem('alloflow_sel_stations', JSON.stringify(list));
  window.__alloflowSelStations = list;
}
function guide() { return document.getElementById('sel-active-station-guide'); }
function click(el) { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); }
function startViaLink(extraProps) {
  window.__alloSelHubPendingTool = { toolId: '', label: '', stationId: STATION.id, at: Date.now() };
  const h = mountHub(extraProps || {});
  expect(guide(), 'station started').toBeTruthy();
  return h;
}
function reset() {
  ['alloflow_sel_stations', 'alloflow_sel_active_station', 'alloflow_sel_station_progress'].forEach((k) => { try { window.localStorage.removeItem(k); } catch { /* blocked */ } });
  window.__alloflowSelStations = null; window.__alloflowSelProgress = null; window.__alloSelHubPendingTool = null;
}

describe.skipIf(!R)('SEL Hub · the active station comes back', () => {
  beforeAll(setup);
  afterEach(() => {
    // Leave no active station behind for the next test: mount, exit, unmount.
    seedStations([STATION]);
    const h = mountHub({});
    const exit = document.querySelector('[aria-label="Exit station mode"]');
    if (exit) click(exit);
    h.unmount();
    reset();
  });

  it('a station started from a link is still active after the hub closes and reopens', () => {
    seedStations([STATION]);
    const h = startViaLink();
    expect(window.localStorage.getItem('alloflow_sel_active_station')).toBe(STATION.id);
    h.unmount();
    expect(guide()).toBeNull();
    const h2 = mountHub({});
    expect(guide(), 'resumed on reopen').toBeTruthy();
    expect(guide().getAttribute('aria-label')).toBe('Active SEL Station: ' + STATION.name);
    h2.unmount();
  });

  it('survives a reload: a fresh page with only localStorage resumes it', () => {
    seedStations([STATION]);
    const h = startViaLink();
    h.unmount();
    // A reload keeps localStorage and loses the module memo; emulate by clearing the memo through
    // the only public path (a mount that exits would also clear storage), so reload the module instead.
    const req = createRequire(import.meta.url);
    delete window.AlloModules.SelHub;
    new Function('require', readFileSync(resolve(SEL, 'sel_hub_module.js'), 'utf8'))(req);
    expect(window.localStorage.getItem('alloflow_sel_active_station')).toBe(STATION.id);
    const h2 = mountHub({});
    expect(guide(), 'resumed from storage after module reload').toBeTruthy();
    h2.unmount();
  });

  it('"Exit station" ends it for good', () => {
    seedStations([STATION]);
    const h = startViaLink();
    click(document.querySelector('[aria-label="Exit station mode"]'));
    expect(guide()).toBeNull();
    expect(window.localStorage.getItem('alloflow_sel_active_station')).toBeNull();
    h.unmount();
    const h2 = mountHub({});
    expect(guide()).toBeNull();
    h2.unmount();
  });

  it('a station whose record is gone (deleted, or replaced by another project) does not resume', () => {
    seedStations([STATION]);
    const h = startViaLink();
    h.unmount();
    seedStations([]);
    const h2 = mountHub({});
    expect(guide()).toBeNull();
    expect(window.localStorage.getItem('alloflow_sel_active_station')).toBeNull();
    h2.unmount();
  });

  it('with storage blocked, the page-lifetime memo still brings the station back', () => {
    seedStations([STATION]);
    const desc = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    try {
      const h = startViaLink();
      h.unmount();
      const h2 = mountHub({});
      expect(guide(), 'resumed from the memo').toBeTruthy();
      h2.unmount();
    } finally {
      if (desc) Object.defineProperty(window, 'localStorage', desc); else delete window.localStorage;
    }
  });

  it('says when every step is recorded, and reopening a step takes it back', () => {
    seedStations([STATION]);
    // The time step is recorded by the engagement timer, not a button; give it its 5 minutes.
    window.localStorage.setItem('alloflow_sel_station_progress', JSON.stringify({ [STATION.id]: { q_time: { complete: true, timeAccumMs: 300000 } } }));
    const h = startViaLink();
    expect(guide().textContent).toContain('1 of 2 steps recorded');
    expect(document.querySelector('[data-sel-station-complete]')).toBeNull();
    const marks = () => Array.from(document.querySelectorAll('#sel-active-station-guide button')).filter((b) => (b.getAttribute('aria-label') || '').startsWith('Mark "'));
    expect(marks().length, 'only the self-check has a Mark complete button').toBe(1);
    click(marks()[0]);
    expect(guide().textContent).toContain('2 of 2 steps recorded');
    const done = document.querySelector('[data-sel-station-complete]');
    expect(done).toBeTruthy();
    expect(done.textContent).toMatch(/All steps recorded/);
    click(marks()[0]);
    expect(document.querySelector('[data-sel-station-complete]')).toBeNull();
    expect(guide().textContent).toContain('1 of 2 steps recorded');
    h.unmount();
  });

  it('on a phone with a tool open, the station tool chips fold into the steps disclosure', () => {
    seedStations([STATION]);
    const wide = window.innerWidth;
    window.innerWidth = 390;
    try {
      window.__alloSelHubPendingTool = { toolId: '', label: '', stationId: STATION.id, at: Date.now() };
      const h = mountHub({ selHubTool: 'zones' });
      const nav = document.querySelector('#sel-active-station-guide nav[aria-label="Station activities"]');
      expect(nav, 'station nav still rendered').toBeTruthy();
      expect(nav.closest('details'), 'nav is inside the disclosure on a phone').toBeTruthy();
      expect(document.querySelector('#sel-active-station-guide summary').textContent).toContain('Station tools, steps and reflection');
      h.unmount();
    } finally { window.innerWidth = wide; }
    // Desktop: the chips stay above the disclosure.
    window.__alloSelHubPendingTool = { toolId: '', label: '', stationId: STATION.id, at: Date.now() };
    const h2 = mountHub({ selHubTool: 'zones' });
    const nav2 = document.querySelector('#sel-active-station-guide nav[aria-label="Station activities"]');
    expect(nav2 && nav2.closest('details')).toBeNull();
    h2.unmount();
  });

  it('with storage blocked, quest progress a project loaded into the window slot is still shown', () => {
    seedStations([STATION]);
    const desc = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    try {
      window.__alloflowSelProgress = { [STATION.id]: { q_check: { complete: true, markedComplete: true, completedAt: '2026-09-14T13:00:00.000Z' } } };
      const h = startViaLink();
      expect(guide().textContent).toContain('1 of 2 steps recorded');
      h.unmount();
    } finally {
      if (desc) Object.defineProperty(window, 'localStorage', desc); else delete window.localStorage;
    }
  });
});
