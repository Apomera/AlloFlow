import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, tool, portland, root, host, latest, setSaved, frameCallback, wallTime, errors, awardXP;
const hooks = () => window.__testHooks.flightSim;
const aircraft = id => FS.AIRCRAFT.find(item => item.id === id);
const state = (patch = {}) => ({ lat: portland.lat, lon: portland.lon, altitude: portland.alt,
  fieldElev: portland.alt, heading: 0, speed: 0, rotorForwardFps: 0, vsi: 0, onGround: true,
  groundContact: { vsi: -2, speed: 0, rotorForwardFps: 0 }, ...patch });
const controls = (id = 'drone', patch = {}) => ({ pitch: 0, bank: 0, yawRate: 0,
  throttle: aircraft(id).weight / aircraft(id).maxThrust, ...patch });
const missionData = mode => mode === 'rescue' ? { rescue: { active: true, recovered: true,
  completed: false, startedAt: 1, recoveredAt: 10, survivorLat: portland.lat - .04,
  survivorLon: portland.lon + .07 } } : { survey: { active: true, mode, completed: false,
  battery: 100, launchLat: portland.lat, launchLon: portland.lon,
  photos: [{ name: 'Captured site', lat: portland.lat + .001, lon: portland.lon, captured: true }] } };
const telemetry = (position, mode = 'aerial', weather = {}, ctrl = {}) => FS.computeFlightTelemetry(
  position, controls(mode === 'rescue' ? 'rescue_heli' : 'drone', ctrl), weather, 0, 0,
  null, null, aircraft(mode === 'rescue' ? 'rescue_heli' : 'drone'));
const guidance = (position, mode = 'aerial', weather = {}, ctrl = {}) =>
  FS.getFlightMissionGuidance(position, missionData(mode), telemetry(position, mode, weather, ctrl));

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  portland = FS.WAYPOINTS.find(item => item.id === 'kpwm');
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) })
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  expect(errors).not.toHaveBeenCalled(); host?.remove(); root = host = frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

describe('mission return guidance requires a physical controlled touchdown', () => {
  it.each([['rescue', 10, .5], ['aerial', 8, .2], ['powerline', 5, .2]])(
    'shares the %s return limits and accepts gentle descending contact', (mode, maxKts, radiusNm) => {
      const result = guidance(state(), mode);
      expect(result).toMatchObject({ phase: 'return', ready: true, returnRadiusNm: radiusNm,
        returnLimits: { maxKts, maxDescentFpm: 600 }, returnContact: { descentFpm: 120, groundSpeedKts: 0 },
        gates: { distance: true, height: true, speed: true, vertical: true }, verticalFpm: -120 });
    });

  it.each(['rescue', 'aerial', 'powerline'])('does not let a parked/taxi %s substitute for a landing', mode => {
    for (const position of [state({ groundContact: null }),
      state({ groundContact: null, speed: 1, rotorForwardFps: 1 })]) {
      const result = guidance(position, mode);
      expect(result.ready).toBe(false); expect(result.returnContact).toBeNull();
      expect(result.gates.speed).toBe(false); expect(result.gates.vertical).toBe(false);
    }
  });

  it.each(['rescue', 'aerial', 'powerline'])('rejects the existing crash threshold and worse impacts for %s', mode => {
    for (const fpm of [600, 1200, Infinity, NaN]) {
      const result = guidance(state({ groundContact: { vsi: -fpm / 60, speed: 0 } }), mode);
      expect(result.ready).toBe(false); expect(result.gates.vertical).toBe(false);
    }
    expect(guidance(state({ groundContact: { vsi: -599 / 60, speed: 0 } }), mode).ready).toBe(true);
  });

  it.each([['rescue', 10], ['aerial', 8], ['powerline', 5]])('checks %s impact speed before ground friction', (mode, maxKts) => {
    const result = guidance(state({ speed: 0, groundContact: { vsi: -2,
      speed: (maxKts + .01) / .5924838, rotorForwardFps: (maxKts + .01) / .5924838 } }), mode);
    expect(result.groundSpeedKts).toBeCloseTo(maxKts + .01, 7);
    expect(result.ready).toBe(false); expect(result.gates.speed).toBe(false);
    expect(result.gates.vertical).toBe(true);
  });

  it('includes crosswind and sideways rotor motion at the instant of impact', () => {
    const position = state();
    const crosswind = guidance(position, 'aerial', { wind: 9, windDir: 270 });
    expect(crosswind.returnContact.groundSpeedKts).toBeCloseTo(9, 3);
    expect(crosswind.ready).toBe(false);
    const sideways = guidance(position, 'powerline', {}, { bank: 30, throttle: 1 });
    expect(sideways.returnContact.groundSpeedKts).toBeGreaterThan(5);
    expect(sideways.ready).toBe(false);
    // Grounded telemetry itself is still zero: the return check uses the
    // separately retained airborne contact velocity.
    expect(telemetry(position, 'aerial', { wind: 9, windDir: 270 }).gsKts).toBe(0);
  });

  it.each([
    { groundContact: { vsi: 0, speed: 0 } }, { groundContact: { vsi: 2, speed: 0 } },
    { groundContact: { vsi: -2, speed: -1 } }, { groundContact: { vsi: -2, speed: Infinity } },
    { altitude: 100 }, { fieldElev: undefined }, { onGround: false },
  ])('rejects corrupt or inconsistent contact: %j', patch => {
    expect(guidance(state(patch)).ready).toBe(false);
  });

  it('does not invent contact from a speed-only or missing telemetry observation', () => {
    for (const observed of [undefined, null, {}, { gsKts: 0 }, { gsKts: 0, contactEvidence: {} }]) {
      expect(FS.getFlightMissionGuidance(state(), missionData('aerial'), observed).ready).toBe(false);
    }
    expect(FS.getFlightMissionGuidance(state({ groundContact: null }), missionData('aerial'),
      { gsKts: 0, contactEvidence: { descentFpm: 120, groundSpeedKts: 0 } }).ready).toBe(false);
  });
});

async function mountMission(missionId) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172',
      railCollapsed: true, menuSections: { challenges: true }, takeoffTutorialDismissed: true,
      landingTutorialDismissed: true, earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim; setSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  const button = host.querySelector('[data-flight-challenge-id="' + missionId + '"]'); expect(button).toBeTruthy();
  await act(async () => button.click());
  if (missionId !== 'coastal_rescue') {
    const begin = [...host.querySelectorAll('button')].find(item => item.textContent.includes('I Understand — Begin Flight'));
    await act(async () => begin.click());
  }
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  const mode = missionId === 'coastal_rescue' ? 'rescue' : missionId === 'drone_powerline' ? 'powerline' : 'aerial';
  await act(async () => setSaved(missionData(mode)));
  hooks().timeRef.current = 20;
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0, visibility: 1 });
  Object.assign(hooks().controlsRef.current, controls(mode === 'rescue' ? 'rescue_heli' : 'drone'));
  return mode;
}
async function frame() { wallTime += 100; await act(async () => frameCallback()); }
function pose(patch) { Object.assign(hooks().flightRef.current, state({ groundContact: null, ...patch })); }
const progress = mode => mode === 'rescue' ? latest.rescue : latest.survey;

describe('mission loop awards return evidence once and only on a valid landing', () => {
  it.each(['coastal_rescue', 'drone_survey', 'drone_powerline'])(
    'rejects a crash for %s, then accepts a genuine gentle re-landing once', async missionId => {
      const mode = await mountMission(missionId);
      pose({ altitude: portland.alt + .01, onGround: false, vsi: -20 });
      await frame();
      expect(hooks().flightRef.current.groundContact.vsi * -60).toBeGreaterThan(600);
      expect(progress(mode).completed).toBe(false); expect(awardXP).not.toHaveBeenCalled();
      for (let i = 0; i < 3; i++) await frame();
      expect(progress(mode).completed).toBe(false); expect(awardXP).not.toHaveBeenCalled();
      pose({ altitude: portland.alt + .01, onGround: false, vsi: -2 });
      await frame();
      expect(progress(mode).completed).toBe(true); expect(awardXP).toHaveBeenCalledTimes(1);
      expect(mode === 'rescue' ? latest.rescuesCompleted : latest.surveysCompleted).toBe(1);
      for (let i = 0; i < 3; i++) await frame();
      expect(awardXP).toHaveBeenCalledTimes(1);
      hooks().keysRef.current.escape = true; await frame();
      expect(latest.lastDebrief.mission).toMatchObject({ outcome: 'complete', returned: true });
    });

  it.each(['coastal_rescue', 'drone_survey', 'drone_powerline'])(
    'does not complete %s from a parked state, a fast impact, or a ground slide into home', async missionId => {
      const mode = await mountMission(missionId); pose({}); await frame();
      expect(progress(mode).completed).toBe(false);
      pose({ altitude: portland.alt + .01, onGround: false, vsi: -2, speed: 30, rotorForwardFps: 30 });
      await frame(); expect(progress(mode).completed).toBe(false);
      // The landing happened outside the completion radius. Arriving inside
      // while still grounded is a slide, rather than a new descending contact.
      const radius = mode === 'rescue' ? .5 : .2;
      pose({ lat: portland.lat + (radius + .02) / 60, altitude: portland.alt + .01, onGround: false, vsi: -2 });
      await frame(); expect(progress(mode).completed).toBe(false);
      pose({}); await frame();
      expect(progress(mode).completed).toBe(false); expect(awardXP).not.toHaveBeenCalled();
    });

  it.each(['coastal_rescue', 'drone_survey'])('does not consume contact evidence in a paused %s frame', async missionId => {
    const mode = await mountMission(missionId);
    pose({ groundContact: { vsi: -2, speed: 0, rotorForwardFps: 0 } });
    hooks().pausedRef.current = true;
    await frame();
    expect(progress(mode).completed).toBe(false); expect(awardXP).not.toHaveBeenCalled();
  });
});
