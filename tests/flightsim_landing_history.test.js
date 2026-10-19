import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;
let api, tool, root, host, latest, frameCallback, wallTime;
const hooks = () => window.__testHooks.flightSim;

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
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
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

async function frame() {
  wallTime += 100;
  await act(async () => frameCallback());
}

async function fly(airportId = 'kpwm', cross = 0, along = 0) {
  const airport = api.WAYPOINTS.find(w => w.id === airportId);
  const runway = api.getFlightRunway(airport);
  const position = api.getFlightRunwayPosition(runway, cross, along);
  Object.assign(hooks().flightRef.current, position, { altitude: airport.alt + 200, fieldElev: airport.alt,
    heading: runway.headingDeg, speed: 180, vsi: 0, onGround: false, stalling: false,
    lowAirspeed: false, groundContact: null });
  await frame();
  return { airport, position };
}

async function land(fpm, airportId = 'kpwm', cross = 0, along = 0) {
  const { airport, position } = await fly(airportId, cross, along);
  Object.assign(hooks().flightRef.current, position, { altitude: airport.alt, fieldElev: airport.alt,
    speed: 80, vsi: 0, onGround: true, groundContact: { vsi: -fpm / 60, speed: 80 } });
  await frame();
  expect(hooks().getLandingRef().current.scored).toBe(true);
}

async function finish() {
  hooks().keysRef.current.escape = true;
  await frame();
  expect(latest.view).toBe('debrief');
}

describe('landing evidence survives subsequent takeoffs', () => {
  it('retains a touchdown and personal best when the flight ends airborne', async () => {
    await mount({ personalBests: { landingFpm: 250 } }); await start(); await land(120); await fly(); await finish();
    expect(latest.lastDebrief).toMatchObject({ landings: 1, bestLanding: 120, touchdownAirportId: 'kpwm', newLandingBest: true });
    expect(latest.personalBests.landingFpm).toBe(120);
  });

  it('counts each touchdown once and keeps the softer landing with its own airport', async () => {
    await mount(); await start(); await land(120, 'kpwm');
    await frame(); await frame(); // Continuous ground contact must not add landings.
    await land(260, 'kden'); await finish();
    expect(latest.lastDebrief).toMatchObject({ landings: 2, bestLanding: 120, touchdownAirportId: 'kpwm' });
    expect(latest.personalBests.landingFpm).toBe(120);
  });

  it('does not attach an airport to the best off-runway contact after a later airport landing', async () => {
    await mount(); await start(); await land(80, 'kpwm', 20000);
    await land(180, 'kden'); await finish();
    expect(latest.lastDebrief).toMatchObject({ landings: 2, bestLanding: 80, touchdownAirportId: null });
  });

  it('starts a fresh flight without carrying forward its preceding landing count', async () => {
    await mount(); await start(); await land(120); await finish();
    await act(async () => hooks().startFlightChallenge('first_flight'));
    await finish();
    expect(latest.lastDebrief).toMatchObject({ landings: 0, bestLanding: null });
    expect(latest.personalBests.landingFpm).toBe(120);
  });
});

describe('onboarding records the objective actually demonstrated', () => {
  it('does not infer lift learning or runway contact from unrelated legacy progress', async () => {
    await mount({ completedLessons: { thrust: true, lift: false }, firstAirportLanding: 'legacy-vicinity' });
    expect(host.querySelector('[data-flight-start-step="lesson"]').dataset.done).toBe('false');
    expect(host.querySelector('[data-flight-start-step="landing"]').dataset.done).toBe('false');
  });

  it.each([[0, 0], [75, 4000], [-75, -4000]])('recognizes a controlled touchdown inside the runway at %s/%s feet', async (cross, along) => {
    await mount(); await start(); await land(120, 'kpwm', cross, along);
    expect(latest.firstRunwayLanding).toEqual(expect.any(String));
    expect(hooks().getLandingRef().current.onRunway).toBe(true);
  });

  it.each([[1000, 0], [76, 0], [0, 4001]])('rejects an airport-vicinity touchdown outside the runway at %s/%s feet', async (cross, along) => {
    await mount(); await start(); await land(120, 'kpwm', cross, along);
    expect(latest.firstAirportLanding).toEqual(expect.any(String));
    expect(latest.firstRunwayLanding).toBeUndefined();
    expect(hooks().getLandingRef().current.onRunway).toBe(false);
  });

  it('does not complete a controlled-landing objective after a crash on the strip', async () => {
    await mount(); await start(); await land(600);
    expect(hooks().getLandingRef().current.onRunway).toBe(true);
    expect(latest.firstRunwayLanding).toBeUndefined();
  });
});
