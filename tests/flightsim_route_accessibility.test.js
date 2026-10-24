import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 20000 });
let FS, tool, host, root, latest, patchSaved, frameCallback, wallTime, errors;
const hooks = () => window.__testHooks.flightSim;
const plan = () => hooks().getFlightPlanRef().current;
const description = () => host.querySelector('[data-flight-route-description]');
const cockpit = () => host.querySelector('canvas[role="application"]');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const london = { name: 'London', lat: 51.5, lon: -.12 };

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  window.SkySchoolCityServices = { enabled: false };
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, name) => name in target ? target[name] : () => {},
    set: (target, name, value) => { target[name] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  // Real route/telemetry calculations and input/RAF behavior; hold dynamics
  // so narration tests measure their stated fixture position, including pause.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, thrust: 0, drag: 0 } }));
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; frameCallback = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(seed = {}, t) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false,
      aircraft: 'cessna172', planDep: 'kpwm', planDest: 'kjfk', cityOnline: false,
      menuSections: { plan: true, challenges: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    patchSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}),
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function frame() {
  expect(frameCallback).toBeTypeOf('function'); wallTime += 100;
  await act(async () => { frameCallback(); vi.advanceTimersByTime(100); });
  expect(errors).not.toHaveBeenCalled();
}
async function launchAirport() {
  await click(host.querySelector('[aria-label="File Route: file the flight plan and depart"]'));
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  await frame();
}
async function key(value) {
  await act(async () => {
    cockpit().focus();
    for (const type of ['keydown', 'keyup']) cockpit().dispatchEvent(new KeyboardEvent(type,
      { key: value, bubbles: true, cancelable: true }));
  });
  await frame();
}
async function info() {
  const before = hooks().timeRef.current, paused = hooks().pausedRef.current;
  await key('i');
  const after = hooks().timeRef.current;
  expect(hooks().pausedRef.current).toBe(paused);
  if (paused) expect(after).toBe(before);
  else expect(after - before).toBeCloseTo(.1, 8); // Only the ordinary RAF step.
  return document.getElementById('skyschool-a11y-live').textContent;
}
function expectRoute() {
  const state = hooks().flightRef.current, target = plan().destination;
  const distance = FS.haversineNm(state.lat, state.lon, target.lat, target.lon);
  expect(description().hidden).toBe(false);
  expect(description().getAttribute('aria-live')).toBe('off');
  expect(cockpit().getAttribute('aria-describedby').split(/\s+/)).toContain(description().id);
  expect(description().textContent).toContain(target.name);
  expect(description().textContent).toContain('bearing ' + (Math.round(FS.bearing(state.lat, state.lon, target.lat, target.lon)) % 360) + '°');
  expect(description().textContent).toContain(distance.toFixed(distance < 1 ? 2 : 1) + ' nm');
  expect(description().textContent).not.toMatch(/NaN|Infinity|undefined|null/);
}
async function endToMenu() {
  await click(button('✕ Exit')); expect(latest.view).toBe('debrief');
  await click(button('🏠 Back to Menu')); expect(latest.view).toBe('menu');
}

describe('filed airport and city route accessibility', () => {
  it.each([['kpwm', 'kjfk'], ['kden', 'ksfo']])('describes native %s to %s filing on the ground and in requested running/paused status', async (planDep, planDest) => {
    await mount({ planDep, planDest }); await launchAirport();
    expect(hooks().flightRef.current.onGround).toBe(true);
    expectRoute();
    expect(description().textContent).toContain(plan().destination.alt.toLocaleString() + ' ft elevation');
    expect(await info()).toContain(description().textContent);
    expect(await info()).toContain('On ground.');
    await key(' '); expect(hooks().pausedRef.current).toBe(true);
    expect(await info()).toContain(description().textContent);
    expect(host.querySelector('[data-flight-next-discovery]').hidden).toBe(true);
  });

  it.each([false, true])('describes a native city route without inventing airport elevation, near city %s', async near => {
    await mount({ cityDestination: london });
    const planner = host.querySelector('[data-flightsim-city-planner]'); await click(planner.querySelector('summary'));
    await click([...planner.querySelectorAll('button')].find(node => node.textContent.trim() === (near ? 'Fly near city' : 'Depart toward city')));
    Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 }); await frame();
    expectRoute(); expect(description().textContent).toContain('London');
    expect(description().textContent).not.toContain('ft elevation');
    expect(await info()).toContain(description().textContent);
    await key(' '); expect(await info()).toContain(description().textContent);
  });

  it('updates readable route values after motion without announcing every reading', async () => {
    await mount(); await launchAirport(); const before = description().textContent;
    Object.assign(hooks().flightRef.current, { lat: 42, lon: -71, altitude: 5000, onGround: false });
    await frame(); expectRoute(); expect(description().textContent).not.toBe(before);
    expect(document.getElementById('skyschool-a11y-live').textContent).not.toContain(description().textContent);
    expect(await info()).toContain(description().textContent);
  });

  it('refreshes a replaced route from the live plan even while the paused visual frame is held', async () => {
    await mount(); await launchAirport(); await key(' '); await frame();
    plan().destination = FS.WAYPOINTS.find(item => item.id === 'kden');
    const text = await info(); expectRoute();
    expect(text).toContain('DEN'); expect(text).not.toContain('JFK');
    plan().destination = null;
    expect(await info()).not.toContain('DEN');
    expect(description().hidden).toBe(true); expect(description().textContent).toBe('');
    expect(cockpit().getAttribute('aria-describedby').split(/\s+/)).not.toContain(description().id);
  });

  it('clears a filed destination after Exit, Menu and a native Free Flight departure', async () => {
    await mount(); await launchAirport(); expect(await info()).toContain('JFK'); await endToMenu();
    await click(host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
    await frame(); expect(description().hidden).toBe(true); expect(description().textContent).toBe('');
    const text = await info(); expect(text).not.toContain('JFK'); expect(text).toContain('Next discovery:');
  });

  it('replaces the accessible target after a newly filed airport departure', async () => {
    await mount(); await launchAirport(); await endToMenu();
    await act(async () => patchSaved({ planDep: 'kden', planDest: 'ksfo' })); await launchAirport();
    expectRoute(); const text = await info(); expect(text).toContain('SFO'); expect(text).not.toContain('JFK');
  });

  it('retains distance and direction when an airport elevation is unavailable', async () => {
    await mount(); await launchAirport(); await key(' ');
    for (const alt of [undefined, null, Infinity]) {
      plan().destination = { ...plan().destination, alt };
      const text = await info(); expectRoute();
      expect(text).toContain('JFK'); expect(description().textContent).not.toContain('ft elevation');
    }
  });

  it.each([{ lat: NaN }, { lon: Infinity }, { lat: 91 }, { name: '', code: '' }])('hides unavailable route text safely for %j', async invalid => {
    await mount(); await launchAirport(); await key(' '); await frame();
    plan().destination = { ...plan().destination, ...invalid };
    const text = await info();
    expect(description().hidden).toBe(true); expect(description().textContent).toBe('');
    expect(text).not.toContain('JFK'); expect(text).not.toMatch(/NaN|Infinity|undefined|null/);
    expect(cockpit().getAttribute('aria-describedby').split(/\s+/)).not.toContain(description().id);
  });

  it.each([180.1, -180.1])('keeps finite route direction on continuous longitude %s', async lon => {
    await mount({ planDest: 'ksfo' }); await launchAirport();
    Object.assign(hooks().flightRef.current, { lat: 35, lon, altitude: 5000, onGround: false });
    await frame(); expectRoute(); expect(await info()).toContain(description().textContent);
  });

  it('uses the existing translated route and airport elevation labels in both descriptions', async () => {
    const labels = {
      'stem.flightsim.mission_route': '{target}: Kurs {bearing}°, {distance} Seemeilen',
      'stem.flightsim.airport_region_elevation': '{region}; Platzhöhe {elev} Fuß',
    };
    await mount({}, (key, fallback) => labels[key] ?? fallback); await launchAirport();
    expect(description().textContent).toContain('JFK'); expect(description().textContent).toContain('Kurs');
    expect(description().textContent).toContain('Platzhöhe');
    expect(await info()).toContain(description().textContent);
  });
});

describe('navigation announcement priority', () => {
  it.each([['coastal_rescue', 'SURVIVOR'], ['cross_country', 'JFK']])('preserves %s guidance over an incidental filed route', async (activity, expected) => {
    await mount();
    await click(host.querySelector(`[data-flight-challenge-id="${activity}"]`));
    plan().destination = FS.WAYPOINTS.find(item => item.id === 'kden');
    await act(async () => patchSaved({ flightDetails: true }));
    Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 }); await frame();
    expect(description().hidden).toBe(true); expect(description().textContent).toBe('');
    const text = await info(); expect(text).toContain(expected); expect(text).not.toContain('DEN');
  });

  it('does not introduce a filed target while a first-flight challenge has no airport-homing phase yet', async () => {
    await mount(); await click(host.querySelector('[data-flight-challenge-id="first_flight"]'));
    plan().destination = FS.WAYPOINTS.find(item => item.id === 'kjfk');
    await frame(); expect(description().hidden).toBe(true);
    const text = await info(); expect(text).not.toContain('JFK'); expect(text).not.toContain('Next discovery:');
  });
});
