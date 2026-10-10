import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, latest, awardXP, canvasContext, downloaded, exportedBlob;

async function mount(initial = {}) {
  if (root) await act(async () => root.unmount());
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false, ...initial } });
    latest = data.flightSim;
    return tool.render(makeCtx({
      toolData: data, setToolData: updateData, awardXP,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}

async function clickContaining(text) {
  const target = [...host.querySelectorAll('button')].find(button => button.textContent.includes(text));
  expect(target, `Button containing ${text}`).toBeTruthy();
  await act(async () => target.click());
}

const sampleFlight = () => ({
  flightTime: 42, sessionTime: 50, distance: 1, maxAlt: 5500, maxSpeed: 130,
  airports: 0, discovered: 0, badges: 0, bestLanding: null, landings: 0,
  aircraft: 'Cessna 172 Skyhawk', aircraftId: 'cessna172',
  airborneSeconds: 42, peakAGL: 5424, bestStableSeconds: 15, startedAirborne: true,
  samples: Array.from({ length: 5 }, (_, index) => ({
    t: index * 10, lat: 43.646 + index * 0.002, lon: -70.309 + index * 0.003,
    alt: 5000 + index * 100, spd: 110 + index * 5, hdg: 90,
  })),
});

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  awardXP = vi.fn();
  canvasContext = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  downloaded = null;
  exportedBlob = null;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    downloaded = { href: this.href, filename: this.download };
  });
  const NativeBlob = Blob;
  vi.stubGlobal('Blob', class extends NativeBlob {
    constructor(parts, options) {
      super(parts, options);
      this.testContents = parts.join('');
    }
  });
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob) { exportedBlob = blob; return 'blob:skyschool-export'; }
    static revokeObjectURL() {}
  });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  delete window.__testHooks;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool debrief and exit integration', () => {
  it('requires measured flight before awarding badges and never treats a guided airborne start as a takeoff', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: { phase: 'transfer' } });
    await clickContaining('Try flight practice');
    let hooks = window.__testHooks.flightSim;
    await act(async () => hooks.checkAchievements());
    expect(latest.earnedBadges || {}).not.toHaveProperty('first_takeoff');
    expect(latest.earnedBadges || {}).not.toHaveProperty('speed100');
    const state = hooks.flightRef.current;
    const physicsExports = window.__RR_TEST_EXPORTS__.flightSim;
    for (let i = 0; i < 10; i++) physicsExports.updateFlightPractice(hooks.getLogRef().current, state, hooks.controlsRef.current, 1);
    await act(async () => hooks.checkAchievements());
    expect(latest.earnedBadges).toHaveProperty('speed100', true);
    expect(latest.earnedBadges).not.toHaveProperty('first_takeoff');

    await mount({ view: 'menu' });
    await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
    hooks = window.__testHooks.flightSim;
    // A high airport can satisfy the altitude table's condition while the
    // tracker correctly withholds flight badges until actual airborne time.
    Object.assign(hooks.flightRef.current, { altitude: 5431, fieldElev: 5431, onGround: true });
    hooks.timeRef.current = 90;
    await act(async () => hooks.checkAchievements());
    expect(latest.earnedBadges || {}).not.toHaveProperty('mile_high');
    expect(latest.earnedBadges || {}).not.toHaveProperty('first_takeoff');
    Object.assign(hooks.flightRef.current, { altitude: 5561, onGround: false });
    for (let i = 0; i < 10; i++) physicsExports.updateFlightPractice(hooks.getLogRef().current, hooks.flightRef.current, hooks.controlsRef.current, 1);
    await act(async () => hooks.checkAchievements());
    expect(latest.earnedBadges).toHaveProperty('first_takeoff', true);
  });

  it('exiting a parked session records zero flight evidence, airports, airborne time, and XP', async () => {
    await mount({ totalFlightTime: 120, visitedAirports: [] });
    const launch = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
    expect(launch).toBeTruthy();
    await act(async () => launch.click());
    expect(latest.view).toBe('flying');
    const hooks = window.__testHooks.flightSim;
    expect(hooks.flightRef.current).toMatchObject({ onGround: true, speed: 0 });
    // Session clock time can pass while parked; only observed airborne
    // physics frames count toward flight time and practice milestones.
    hooks.timeRef.current = 90;
    await clickContaining('Exit');
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief).toMatchObject({
      sessionTime: 90, flightTime: 0, airborneSeconds: 0, airports: 0,
      landings: 0, bestLanding: null, bestStableSeconds: 0, peakAGL: 0,
    });
    expect(latest.totalFlightTime).toBe(120);
    expect(latest.visitedAirports).toEqual([]);
    expect(hooks.flyingRef.current).toBe(false);
    expect(host.textContent).toContain('0 of 3 practice milestones observed');
    expect(host.querySelector('[aria-label="Observed practice milestones: 0 percent"]')).toBeTruthy();
    expect(host.textContent).not.toMatch(/\+\s*\d+\s*XP/i);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('restores flight-path plots and exports the saved samples after a full remount', async () => {
    await mount({ view: 'debrief', lastDebrief: sampleFlight() });
    const saved = JSON.parse(JSON.stringify(latest));
    canvasContext.lineTo.mockClear();
    await mount(saved);
    expect(latest.lastDebrief.samples).toHaveLength(5);
    expect(host.textContent).toContain('Flight Path');
    expect(host.querySelectorAll('canvas')).toHaveLength(2);
    expect(canvasContext.lineTo).toHaveBeenCalled();
    expect(canvasContext.lineTo.mock.calls.flat().every(Number.isFinite)).toBe(true);
    await clickContaining('Export Flight Data');
    expect(downloaded).toMatchObject({ href: 'blob:skyschool-export' });
    expect(downloaded.filename).toMatch(/^flight_data_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(exportedBlob.type).toBe('text/csv');
    const rows = exportedBlob.testContents.split('\n');
    expect(rows).toHaveLength(6);
    expect(rows[0]).toBe('Time(s),Lat,Lon,Alt(ft),Speed(kts),Heading');
    expect(rows[1]).toBe('0,43.6460,-70.3090,5000,110,90');
    expect(rows[5]).toBe('40,43.6540,-70.2970,5400,130,90');
  });

  it('shows two applicable milestones for airborne starts and does not score a missing takeoff', async () => {
    const debrief = { ...sampleFlight(), landings: 1, bestLanding: 180 };
    await mount({ view: 'debrief', lastDebrief: debrief });
    expect(host.textContent).toContain('2 of 2 practice milestones observed');
    expect(host.textContent).toContain('This session began airborne; takeoff is not assessed.');
    const milestones = host.querySelector('section[aria-label="Observed practice milestones"]');
    expect(milestones.textContent).not.toContain('Takeoff:');
    expect(host.querySelector('[aria-label="Observed practice milestones: 100 percent"]')).toBeTruthy();
    expect(awardXP).not.toHaveBeenCalled();
  });
});
