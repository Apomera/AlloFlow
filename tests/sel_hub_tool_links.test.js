// SEL Hub · a pack can name a Hub tool as a link, and the link opens that tool.
//
// AlloPacks had no way to open an SEL Hub tool: directions could only say
// "open the SEL Hub and choose Emotion Zones" in prose. The convention is a
// plain markdown link, [Emotion Zones](#sel-hub/zones). The host renderer keeps
// `#` hrefs (with target=_blank), so the hub module owns a capture-phase click
// handler that opens the hub at the tool instead of following the href. The hub
// component is only mounted while open, so the always-mounted history panel
// lends the open setter through window.__alloSelHubOpener, and the requested
// tool waits in window.__alloSelHubPendingTool until the hub mounts and the
// tool has registered. None of this touches AlloFlowANTI.txt.
//
// Layers: (1) parse + click handling as real DOM events, (2) the mounted hub
// consuming a pending tool through the REAL component, (3) every #sel-hub link
// shipped in allopacks/ resolves to a registered tool id, (4) the history panel
// source and built module carry the opener, and the deploy mirrors match.

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
  readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort()
    .forEach((f) => { try { load(join(SEL, f)); } catch { /* tool-local load issue */ } });
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
}

function clickAnchor(href) {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  a.setAttribute('target', '_blank');
  a.textContent = 'Emotion Zones';
  const wrap = document.createElement('div');
  wrap.appendChild(a);
  document.body.appendChild(wrap);
  const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  a.dispatchEvent(ev);
  wrap.remove();
  return ev;
}

describe.skipIf(!R)('SEL Hub · #sel-hub/<toolId> links', () => {
  beforeAll(setup);
  afterEach(() => { window.__alloSelHubPendingTool = null; window.__alloSelHubOpener = null; });

  it('installs the link API on the shared registry at load time', () => {
    const links = window.SelHub && window.SelHub.toolLinks;
    expect(links).toBeTruthy();
    expect(typeof links.parse).toBe('function');
    expect(typeof links.open).toBe('function');
    expect(typeof links.consumePending).toBe('function');
  });

  it('parses only the #sel-hub shape', () => {
    const { parse, href } = window.SelHub.toolLinks;
    expect(parse('#sel-hub/zones')).toBe('zones');
    expect(parse('http://localhost/app/#sel-hub/dearMan')).toBe('dearMan');
    expect(parse('#sel-hub/')).toBe('');
    expect(parse('#sel-hub')).toBe('');
    expect(parse('#sel-hub/zones/extra')).toBeNull();
    expect(parse('#sel-hubx/zones')).toBeNull();
    expect(parse('resource:abc')).toBeNull();
    expect(parse('https://example.com')).toBeNull();
    expect(parse('#')).toBeNull();
    expect(parse(undefined)).toBeNull();
    expect(href('zones')).toBe('#sel-hub/zones');
    expect(href('bad id!')).toBe('#sel-hub/badid');
  });

  it('reads an optional ?station=<id> query without changing what parse() returns', () => {
    const { parse, station, href } = window.SelHub.toolLinks;
    expect(parse('#sel-hub/zones?station=sel_station_crew_launch_zones')).toBe('zones');
    expect(station('#sel-hub/zones?station=sel_station_crew_launch_zones')).toBe('sel_station_crew_launch_zones');
    expect(parse('#sel-hub?station=sel_station_1700000000000')).toBe('');
    expect(station('#sel-hub?station=sel_station_1700000000000')).toBe('sel_station_1700000000000');
    expect(station('http://localhost/app/#sel-hub/zones?x=1&station=abc')).toBe('abc');
    expect(station('#sel-hub/zones')).toBeNull();
    expect(station('#sel-hub/zones?station=')).toBeNull();
    expect(parse('#sel-hub/zones?station=has space')).toBeNull();
    expect(station('https://example.com/?station=abc')).toBeNull();
    expect(href('zones', 'sel_station_crew_launch_zones')).toBe('#sel-hub/zones?station=sel_station_crew_launch_zones');
    expect(href('zones', 'bad id!')).toBe('#sel-hub/zones?station=badid');
    expect(href('', 'abc')).toBe('#sel-hub/?station=abc');
    expect(parse(href('', 'abc'))).toBe('');
    expect(station(href('', 'abc'))).toBe('abc');
  });

  it('a click on a tool link is intercepted, opens the hub through the lent setter, and records the tool', () => {
    const calls = [];
    window.__alloSelHubOpener = (id) => calls.push(id);
    const ev = clickAnchor('#sel-hub/zones');
    expect(ev.defaultPrevented).toBe(true);
    expect(calls).toEqual(['zones']);
    expect(window.__alloSelHubPendingTool && window.__alloSelHubPendingTool.toolId).toBe('zones');
    expect(window.__alloSelHubPendingTool.label).toBe('Emotion Zones');
    expect(window.__alloSelHubPendingTool.stationId).toBe('');
  });

  it('a click on a link that names a station records the station with the tool', () => {
    const calls = [];
    window.__alloSelHubOpener = (id) => calls.push(id);
    const ev = clickAnchor('#sel-hub/zones?station=sel_station_crew_launch_zones');
    expect(ev.defaultPrevented).toBe(true);
    expect(calls).toEqual(['zones']);
    expect(window.__alloSelHubPendingTool.toolId).toBe('zones');
    expect(window.__alloSelHubPendingTool.stationId).toBe('sel_station_crew_launch_zones');
    // A station-only link is a real request: it opens the hub with the station active, no tool.
    const ev2 = clickAnchor('#sel-hub?station=sel_station_crew_launch_zones');
    expect(ev2.defaultPrevented).toBe(true);
    expect(calls).toEqual(['zones', '']);
    expect(window.__alloSelHubPendingTool.toolId).toBe('');
    expect(window.__alloSelHubPendingTool.stationId).toBe('sel_station_crew_launch_zones');
  });

  it('a click with no opener available still records the tool and does not follow the href', () => {
    window.__alloSelHubOpener = null;
    const ev = clickAnchor('#sel-hub/dearMan');
    expect(ev.defaultPrevented).toBe(true);
    expect(window.__alloSelHubPendingTool.toolId).toBe('dearMan');
  });

  it('leaves ordinary links alone', () => {
    const calls = [];
    window.__alloSelHubOpener = (id) => calls.push(id);
    expect(clickAnchor('https://example.com/page').defaultPrevented).toBe(false);
    expect(clickAnchor('#top').defaultPrevented).toBe(false);
    expect(calls).toEqual([]);
    expect(window.__alloSelHubPendingTool).toBeFalsy();
  });

  it('consumePending hands back a registered tool once, waits for an unregistered one, and gives up after the TTL', () => {
    const links = window.SelHub.toolLinks;
    expect(window.SelHub.isRegistered('zones')).toBe(true);
    window.__alloSelHubPendingTool = { toolId: 'zones', label: 'Emotion Zones', at: Date.now() };
    expect(links.consumePending()).toEqual({ toolId: 'zones', label: 'Emotion Zones', stationId: '', status: 'ready' });
    expect(window.__alloSelHubPendingTool).toBeNull();
    expect(links.consumePending()).toBeNull();
    window.__alloSelHubPendingTool = { toolId: 'notARealTool', label: '', at: Date.now() };
    expect(links.consumePending().status).toBe('waiting');
    expect(window.__alloSelHubPendingTool).toBeTruthy();
    window.__alloSelHubPendingTool = { toolId: 'notARealTool', label: 'Ghost', at: Date.now() - links.PENDING_TTL_MS - 1 };
    expect(links.consumePending()).toEqual({ toolId: 'notARealTool', label: 'Ghost', stationId: '', status: 'unknown' });
    expect(window.__alloSelHubPendingTool).toBeNull();
    window.__alloSelHubPendingTool = { toolId: '', label: '', stationId: 'st_1', at: Date.now() };
    expect(links.consumePending()).toEqual({ toolId: '', label: '', stationId: 'st_1', status: 'ready' });
    expect(window.__alloSelHubPendingTool).toBeNull();
  });
});

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
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe.skipIf(!R)('SEL Hub · the mounted hub lands on the requested tool', () => {
  beforeAll(() => { if (!window.SelHub || !window.SelHub.toolLinks) setup(); });
  afterEach(() => { window.__alloSelHubPendingTool = null; });

  it('opens a registered pending tool on mount and clears the request', () => {
    const opened = [];
    window.__alloSelHubPendingTool = { toolId: 'zones', label: 'Emotion Zones', at: Date.now() };
    const h = mountHub({ setSelHubTool: (id) => opened.push(id) });
    expect(opened).toEqual(['zones']);
    expect(window.__alloSelHubPendingTool).toBeNull();
    h.unmount();
  });

  it('opens a tool requested while the hub is already open', async () => {
    const opened = [];
    const h = mountHub({ setSelHubTool: (id) => opened.push(id) });
    expect(opened).toEqual([]);
    await act(async () => {
      window.SelHub.toolLinks.open('dearMan', 'DEAR MAN');
      await Promise.resolve();
    });
    expect(opened).toEqual(['dearMan']);
    h.unmount();
  });

  const STATION = { id: 'sel_station_test_link', name: 'Crew station: link test', tools: ['zones', 'sensoryRegulation'], teacherNote: 'note',
    quests: [{ qid: 'q_time', type: 'timeSpent', toolId: 'zones', label: 'Spend 5 minutes in Emotion Zones', params: { minutes: 5 } },
             { qid: 'q_check', type: 'manualComplete', toolId: 'sensoryRegulation', label: 'I did a one-word check-in this week', params: {} }],
    createdAt: '2026-09-13T18:00:00.000Z', source: 'allopack' };
  function seedStations(list) {
    window.localStorage.setItem('alloflow_sel_stations', JSON.stringify(list));
    window.__alloflowSelStations = list;
  }
  afterEach(() => { window.localStorage.removeItem('alloflow_sel_stations'); window.__alloflowSelStations = null; });

  it('a link that names a station the project carries opens the tool AND starts that station', () => {
    seedStations([STATION]);
    const opened = []; const toasts = []; const said = [];
    window.__alloSelHubPendingTool = { toolId: 'zones', label: 'Emotion Zones', stationId: STATION.id, at: Date.now() };
    const h = mountHub({ setSelHubTool: (id) => opened.push(id), addToast: (m, k) => toasts.push([m, k]) });
    expect(opened).toEqual(['zones']);
    const guide = document.getElementById('sel-active-station-guide');
    expect(guide, 'station guide rendered').toBeTruthy();
    expect(guide.getAttribute('aria-label')).toBe('Active SEL Station: ' + STATION.name);
    expect(guide.textContent).toContain('0 of 2 steps recorded');
    expect(guide.textContent).toContain('Spend 5 minutes in Emotion Zones');
    expect(toasts.some(([m, k]) => k === 'success' && m.indexOf(STATION.name) >= 0)).toBe(true);
    expect(window.__alloSelHubPendingTool).toBeNull();
    h.unmount();
  });

  it('a station-only link starts the station in the catalog view', () => {
    seedStations([STATION]);
    const opened = [];
    window.__alloSelHubPendingTool = { toolId: '', label: '', stationId: STATION.id, at: Date.now() };
    const h = mountHub({ setSelHubTool: (id) => opened.push(id) });
    expect(opened).toEqual([]);
    const guide = document.getElementById('sel-active-station-guide');
    expect(guide).toBeTruthy();
    expect(guide.textContent).toContain(STATION.name);
    h.unmount();
  });

  it('a station a project load adds while the hub is open is found when its link fires', async () => {
    seedStations([]);
    const h = mountHub({});
    // misc_handlers, on project load: window slot + localStorage, then the restore event.
    await act(async () => {
      window.__alloflowSelStations = [STATION];
      window.localStorage.setItem('alloflow_sel_stations', JSON.stringify([STATION]));
      window.dispatchEvent(new window.CustomEvent('alloflow-sel-stations-restored'));
    });
    await act(async () => {
      window.SelHub.toolLinks.open('zones', 'Emotion Zones', STATION.id);
      await Promise.resolve();
    });
    const guide = document.getElementById('sel-active-station-guide');
    expect(guide).toBeTruthy();
    expect(guide.textContent).toContain(STATION.name);
    h.unmount();
  });

  it('when storage is blocked, a hub that mounts after a project load still finds the station in the window slot', () => {
    // Found in a real Chromium: a page whose localStorage throws (opaque origin, or a policy)
    // made the hub start from [] and then mirror that [] over the loaded stations, so every
    // pack link said "not in this project". The initializer now falls back to the slot.
    const desc = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    try {
      window.__alloflowSelStations = [STATION];
      window.__alloSelHubPendingTool = { toolId: 'zones', label: 'Emotion Zones', stationId: STATION.id, at: Date.now() };
      const h = mountHub({});
      const guide = document.getElementById('sel-active-station-guide');
      expect(guide).toBeTruthy();
      expect(guide.textContent).toContain(STATION.quests[0].label);
      expect(Array.isArray(window.__alloflowSelStations) && window.__alloflowSelStations.length, 'slot not wiped by the persist effect').toBe(1);
      h.unmount();
    } finally {
      if (desc) Object.defineProperty(window, 'localStorage', desc); else delete window.localStorage;
    }
  });

  it('a station id the project does not carry opens the tool, says so, and starts nothing', () => {
    seedStations([]);
    const opened = []; const toasts = [];
    window.__alloSelHubPendingTool = { toolId: 'zones', label: 'Emotion Zones', stationId: 'sel_station_missing', at: Date.now() };
    const h = mountHub({ setSelHubTool: (id) => opened.push(id), addToast: (m, k) => toasts.push([m, k]) });
    expect(opened).toEqual(['zones']);
    expect(document.getElementById('sel-active-station-guide')).toBeNull();
    expect(toasts.some(([m, k]) => k === 'info' && /not in this project/.test(m))).toBe(true);
    h.unmount();
  });

  it('a station requested while the hub is already open starts without a remount', async () => {
    seedStations([STATION]);
    const h = mountHub({});
    expect(document.getElementById('sel-active-station-guide')).toBeNull();
    await act(async () => {
      window.SelHub.toolLinks.open('zones', 'Emotion Zones', STATION.id);
      await Promise.resolve();
    });
    expect(document.getElementById('sel-active-station-guide')).toBeTruthy();
    h.unmount();
  });

  it('tells the student when a requested tool id does not exist', () => {
    const toasts = [];
    const opened = [];
    window.__alloSelHubPendingTool = { toolId: 'notARealTool', label: 'Ghost Tool', at: Date.now() - 60000 };
    const h = mountHub({ setSelHubTool: (id) => opened.push(id), addToast: (m, k) => toasts.push([m, k]) });
    expect(opened).toEqual([]);
    expect(toasts.some(([m, k]) => k === 'error' && /Ghost Tool/.test(m))).toBe(true);
    expect(window.__alloSelHubPendingTool).toBeNull();
    h.unmount();
  });
});

describe('SEL Hub · every #sel-hub link shipped in a pack resolves to a real tool', () => {
  const registered = new Set();
  readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).forEach((f) => {
    const src = readFileSync(join(SEL, f), 'utf8');
    for (const m of src.matchAll(/registerTool\(\s*'([^']+)'/g)) registered.add(m[1]);
  });

  it('has a registry to check against', () => {
    expect(registered.size).toBeGreaterThan(60);
    expect(registered.has('zones')).toBe(true);
  });

  const packs = readdirSync(resolve(ROOT, 'allopacks')).filter((f) => f.endsWith('.allopack.json'));
  it.each(packs)('%s', (file) => {
    const text = readFileSync(resolve(ROOT, 'allopacks', file), 'utf8');
    const links = [...text.matchAll(/\]\(#sel-hub\/([^)?]*)(\?[^)]*)?\)/g)];
    for (const m of links) expect(registered.has(m[1]), 'unregistered SEL tool id in ' + file + ': ' + m[1]).toBe(true);
    const pack = JSON.parse(text);
    const stations = pack.selStations || [];
    for (const m of links) {
      if (!m[2]) continue;
      const q = /^\?station=([A-Za-z0-9_.:-]+)$/.exec(m[2]);
      expect(q, 'malformed link query in ' + file + ': ' + m[2]).toBeTruthy();
      const st = stations.find((x) => x.id === q[1]);
      expect(st, file + ' links a station it does not carry: ' + q[1]).toBeTruthy();
      expect(st.tools, file + ' links ' + m[1] + ' to a station that does not include it').toContain(m[1]);
    }
  });

  it('every SEL Station a pack carries names registered tools and well-formed quests', () => {
    for (const f of packs) {
      const pack = JSON.parse(readFileSync(resolve(ROOT, 'allopacks', f), 'utf8'));
      if (!pack.selStations) continue;
      expect(Array.isArray(pack.selStations), f).toBe(true);
      for (const st of pack.selStations) {
        expect(typeof st.id === 'string' && st.id.length > 3, f + ' station id').toBe(true);
        expect(typeof st.name === 'string' && st.name.length > 3, f + ' station name').toBe(true);
        expect(st.tools.length, f + ' station tools').toBeGreaterThan(0);
        for (const id of st.tools) expect(registered.has(id), f + ' unregistered station tool: ' + id).toBe(true);
        for (const q of st.quests || []) {
          expect(['xpThreshold', 'timeSpent', 'freeResponse', 'manualComplete']).toContain(q.type);
          expect(st.tools, f + ' quest tool outside the station: ' + q.toolId).toContain(q.toolId);
          expect(typeof q.label === 'string' && q.label.length > 3, f + ' quest label').toBe(true);
          if (q.type === 'timeSpent') expect(q.params.minutes).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the six Crew Launch packs link at least one Hub tool each', () => {
    const crew = packs.filter((f) => f.startsWith('crew_'));
    expect(crew.length).toBe(6);
    for (const f of crew) {
      const text = readFileSync(resolve(ROOT, 'allopacks', f), 'utf8');
      expect(text, f).toMatch(/\]\(#sel-hub\/[A-Za-z]+\?station=sel_station_crew_launch_[a-z]+\)/);
    }
  });
});

describe('SEL Hub · the history panel lends the open setter, and mirrors match', () => {
  const source = readFileSync(resolve(ROOT, 'view_history_panel_source.jsx'), 'utf8');
  const built = readFileSync(resolve(ROOT, 'view_history_panel_module.js'), 'utf8');
  const deployed = readFileSync(resolve(ROOT, 'desktop/web-app/public/view_history_panel_module.js'), 'utf8');
  const hub = readFileSync(resolve(ROOT, 'sel_hub/sel_hub_module.js'), 'utf8');
  const hubDeployed = readFileSync(resolve(ROOT, 'desktop/web-app/public/sel_hub/sel_hub_module.js'), 'utf8');

  it('registers and clears window.__alloSelHubOpener in an effect keyed on the setters', () => {
    expect(source).toContain('window.__alloSelHubOpener = opener;');
    expect(source).toContain('if (window.__alloSelHubOpener === opener) window.__alloSelHubOpener = null;');
    expect(source).toContain('}, [setShowSelHub, setSelHubTab]);');
    expect(built).toContain('window.__alloSelHubOpener = opener;');
  });

  it('keeps the built module and its deploy mirror byte-identical', () => {
    expect(deployed).toBe(built);
    expect(hubDeployed).toBe(hub);
  });

  it('never reaches into the host: the hub reads the slot at click time and the panel only writes it', () => {
    expect(hub).toContain("document.addEventListener('click', toolLinks.handleClick, true)");
    expect(hub).not.toMatch(/setShowSelHub\(true\)/);
  });
});
