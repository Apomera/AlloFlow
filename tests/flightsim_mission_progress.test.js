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

async function mountMission(missionId, seed = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172',
      railCollapsed: true, menuSections: { challenges: true }, takeoffTutorialDismissed: true,
      landingTutorialDismissed: true, earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
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

describe('Sky School mission completion counts', () => {
  it('accepts only finite nonnegative safe integer counts without coercion', () => {
    for (const count of [undefined, null, false, true, '4', NaN, Infinity, -1, 1.5, {}, [], Number.MAX_SAFE_INTEGER + 1]) {
      expect(FS.normalizeFlightMissionCount(count)).toBe(0);
    }
    for (const count of [0, 1, 42, Number.MAX_SAFE_INTEGER]) expect(FS.normalizeFlightMissionCount(count)).toBe(count);
  });

  it.each(['coastal_rescue', 'drone_survey', 'drone_powerline'])(
    'credits one genuine %s completion from a malformed counter', async missionId => {
      const counter = missionId === 'coastal_rescue' ? 'rescuesCompleted' : 'surveysCompleted';
      const other = counter === 'rescuesCompleted' ? 'surveysCompleted' : 'rescuesCompleted';
      const mode = await mountMission(missionId, { [counter]: '4', [other]: 7, unrelated: 'kept' });
      pose({ altitude: portland.alt + .01, onGround: false, vsi: -2 });
      await frame();
      expect(progress(mode).completed).toBe(true);
      expect(latest[counter]).toBe(1); expect(latest[other]).toBe(7); expect(latest.unrelated).toBe('kept');
      expect(awardXP).toHaveBeenCalledTimes(1);
      hooks().keysRef.current.escape = true; await frame();
      expect(latest[counter]).toBe(1);
      expect(latest.lastDebrief.mission).toMatchObject({ outcome: 'complete', returned: true });
    });

  it.each(['coastal_rescue', 'drone_survey', 'drone_powerline'])(
    'credits %s once even when multiple physical frames run before React commits', async missionId => {
      const counter = missionId === 'coastal_rescue' ? 'rescuesCompleted' : 'surveysCompleted';
      const mode = await mountMission(missionId, { [counter]: 3 });
      pose({ altitude: portland.alt + .01, onGround: false, vsi: -2 });
      await act(async () => {
        wallTime += 100; frameCallback();
        wallTime += 100; frameCallback();
        wallTime += 100; frameCallback();
      });
      expect(progress(mode).completed).toBe(true); expect(latest[counter]).toBe(4);
      expect(awardXP).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 3; i++) await frame();
      expect(latest[counter]).toBe(4); expect(awardXP).toHaveBeenCalledTimes(1);
      if (mode === 'rescue') expect(latest.personalBests.rescueSeconds).toBeGreaterThan(0);
    });

  it.each(['coastal_rescue', 'drone_survey', 'drone_powerline'])(
    'keeps a completed %s count within safe integer precision', async missionId => {
      const counter = missionId === 'coastal_rescue' ? 'rescuesCompleted' : 'surveysCompleted';
      const mode = await mountMission(missionId, { [counter]: Number.MAX_SAFE_INTEGER });
      pose({ altitude: portland.alt + .01, onGround: false, vsi: -2 });
      await frame();
      expect(progress(mode).completed).toBe(true); expect(latest[counter]).toBe(Number.MAX_SAFE_INTEGER);
      expect(awardXP).toHaveBeenCalledTimes(1);
    });
});
