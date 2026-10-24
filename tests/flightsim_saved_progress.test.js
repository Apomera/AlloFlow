import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;
let api, tool, root, host, latest, frameCallback, wallTime;
const hooks = () => window.__testHooks.flightSim;
const quest = id => tool.questHooks.find(item => item.id === id);

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});
async function mount(initial = {}) {
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'menu', railCollapsed: true,
      menuSections: { airports: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(a => [a.id, true])), ...initial } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: update,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function start() {
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0, type: 'clear' });
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, thrust: 0, drag: 0 } }));
}
async function frame() { wallTime += 100; await act(async () => frameCallback()); }
async function land(id) {
  const airport = api.WAYPOINTS.find(item => item.id === id);
  const runway = api.getFlightRunway(airport);
  const position = api.getFlightRunwayPosition(runway, 0, 0);
  Object.assign(hooks().flightRef.current, position, { altitude: airport.alt + 200, fieldElev: airport.alt,
    heading: runway.headingDeg, speed: 180, vsi: 0, onGround: false, stalling: false,
    lowAirspeed: false, groundContact: null });
  await frame();
  Object.assign(hooks().flightRef.current, position, { altitude: airport.alt, fieldElev: airport.alt,
    speed: 80, vsi: 0, onGround: true, groundContact: { vsi: -2, speed: 80 } });
  await frame();
}
async function finish() {
  hooks().keysRef.current.escape = true;
  await frame();
  expect(latest.view).toBe('debrief');
}

describe('saved airport visit and airborne-time progress', () => {
  it('counts distinct supported airport IDs without mutating earlier progress', () => {
    const saved = ['kpwm', 'kpwm', 'obsolete', null, 'kjfk', 'KDEN', 3, 'kden'];
    expect(api.normalizeFlightVisitedAirports(saved)).toEqual(['kpwm', 'kjfk', 'kden']);
    expect(saved).toHaveLength(8);
    expect(quest('visit_3_airports').check({ visitedAirports: saved })).toBe(true);
    expect(quest('visit_3_airports').progress({ visitedAirports: saved })).toBe('3/3 airports');
    expect(quest('visit_5_airports').check({ visitedAirports: saved })).toBe(false);
  });
  it('does not award airport quests for duplicate, unknown, or malformed saved lists', () => {
    for (const saved of [null, undefined, 'kpwm', { length: 99 }, ['kpwm', 'kpwm', 'kpwm', 'retired']]) {
      expect(quest('visit_3_airports').check({ visitedAirports: saved })).toBe(false);
      expect(quest('visit_5_airports').check({ visitedAirports: saved })).toBe(false);
    }
    expect(quest('visit_3_airports').progress()).toBe('0/3 airports');
  });
  it('keeps nonfinite, negative, coerced, and unsafe saved times from completing a flight-time quest', () => {
    for (const saved of [null, undefined, '600', -1, Infinity, NaN, true, {}, Number.MAX_SAFE_INTEGER + 1]) {
      expect(api.normalizeFlightTotalTime(saved)).toBe(0);
      expect(quest('fly_10_min').check({ totalFlightTime: saved })).toBe(false);
      expect(quest('fly_10_min').progress({ totalFlightTime: saved })).toBe('0/10 min');
    }
    expect(quest('fly_10_min').progress()).toBe('0/10 min');
    expect(quest('fly_10_min').check({ totalFlightTime: 599.99 })).toBe(false);
    expect(quest('fly_10_min').check({ totalFlightTime: 600 })).toBe(true);
    expect(quest('fly_10_min').progress({ totalFlightTime: 720 })).toBe('12/10 min');
  });
  it('shows the same airport count and markers in the menu as the quests', async () => {
    await mount({ visitedAirports: ['kpwm', 'kpwm', 'obsolete', 'kden'], totalFlightTime: 720 });
    expect(host.querySelector('[data-flightsim-briefing]').textContent).toContain('2 airports');
    expect(host.querySelector('[data-flightsim-briefing]').textContent).toContain('12 min');
    const visited = [...host.querySelectorAll('#skyschool-secbody-airports button')].filter(node => node.getAttribute('aria-label').endsWith(', visited'));
    expect(visited).toHaveLength(2);
    expect(visited.map(node => node.getAttribute('aria-label').slice(0, 3))).toEqual(['PWM', 'DEN']);
  });
  it('recovers a malformed airport list without crashing the departure menu', async () => {
    await mount({ visitedAirports: { kpwm: true }, totalFlightTime: Infinity });
    const briefing = host.querySelector('[data-flightsim-briefing]').textContent;
    expect(briefing).toContain('0 airports'); expect(briefing).toContain('0 min');
    expect(briefing).not.toContain('Infinity');
    expect(host.querySelectorAll('#skyschool-secbody-airports button')).toHaveLength(api.WAYPOINTS.length);
  });
  it('preserves earlier valid visits and records each new qualifying landing once', async () => {
    const saved = ['kjfk', 'kjfk', 'obsolete'];
    await mount({ visitedAirports: saved, keep: 'preserved' }); await start();
    hooks().getLogRef().current.airborneSeconds = 20;
    await land('kpwm'); await frame(); await land('kden'); await frame();
    expect(latest.visitedAirports).toEqual(['kjfk', 'kpwm', 'kden']);
    expect(quest('visit_3_airports').check(latest)).toBe(true);
    expect(saved).toEqual(['kjfk', 'kjfk', 'obsolete']); expect(latest.keep).toBe('preserved');
  });
  it('does not record an airport merely from a runway departure or a brief hop', async () => {
    await mount({ visitedAirports: [] }); await start(); await frame(); await land('kpwm');
    expect(latest.visitedAirports).toEqual([]);
  });
  it('keeps both new airport visits when landing frames arrive before React commits', async () => {
    await mount({ visitedAirports: ['kjfk'] }); await start();
    hooks().getLogRef().current.airborneSeconds = 20;
    await act(async () => {
      for (const id of ['kpwm', 'kden']) {
        const airport = api.WAYPOINTS.find(item => item.id === id);
        const runway = api.getFlightRunway(airport);
        const position = api.getFlightRunwayPosition(runway, 0, 0);
        Object.assign(hooks().flightRef.current, position, { altitude: airport.alt + 200, fieldElev: airport.alt,
          heading: runway.headingDeg, speed: 180, vsi: 0, onGround: false, stalling: false,
          lowAirspeed: false, groundContact: null });
        wallTime += 100; frameCallback();
        Object.assign(hooks().flightRef.current, position, { altitude: airport.alt, fieldElev: airport.alt,
          speed: 80, vsi: 0, onGround: true, groundContact: { vsi: -2, speed: 80 } });
        wallTime += 100; frameCallback();
      }
    });
    expect(latest.visitedAirports).toEqual(['kjfk', 'kpwm', 'kden']);
  });
  it.each([[600, 611], ['600', 11], [-600, 11], [Infinity, 11]])('adds newly recorded time numerically after a saved value of %s', async (saved, expected) => {
    await mount({ totalFlightTime: saved, keep: 'preserved' }); await start();
    hooks().getLogRef().current.airborneSeconds = 11.2;
    await finish();
    expect(latest.totalFlightTime).toBe(expected);
    expect(latest.lastDebrief.flightTime).toBe(11);
    expect(latest.keep).toBe('preserved');
  });
});
