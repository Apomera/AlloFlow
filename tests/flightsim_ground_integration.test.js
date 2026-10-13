import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, frameCallback, error;
const hooks = () => window.__testHooks.flightSim;
async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { frameCallback(); });
  expect(error).not.toHaveBeenCalled();
}
beforeEach(async () => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
    return tool.render(makeCtx({
      toolData: data,
      setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click(); });
  Object.assign(hooks().flightRef.current, { fieldElev: 76, altitude: 76, onGround: true });
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null;
  host.remove();
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ground datum through the production flight loop', () => {
  it('replaces a high departure floor while flying above coastal Portland', async () => {
    Object.assign(hooks().flightRef.current, { fieldElev: 5431, altitude: 1000, speed: 150, onGround: false });
    await frame();
    expect(hooks().flightRef.current.fieldElev).toBe(76);
    expect(hooks().flightRef.current.onGround).toBe(false);
    expect(hooks().flightRef.current.altitude).toBeLessThan(1001);
  });

  it('records destination contact instead of falling through Denver to the coastal departure floor', async () => {
    Object.assign(hooks().flightRef.current, { lat: 39.856, lon: -104.674, altitude: 5431.01, fieldElev: 76,
      vsi: -5, speed: 100, onGround: false });
    Object.assign(hooks().getLandingRef().current, { wasAirborne: true, peakAGL: 100, lastVSI: -180 });
    hooks().getLogRef().current.airborneSeconds = 12;
    await frame();
    expect(hooks().flightRef.current).toMatchObject({ altitude: 5431, fieldElev: 5431, onGround: true });
    expect(hooks().getLandingRef().current).toMatchObject({ scored: true, touchdownAirportId: 'kden', airportVicinity: true });
    expect(hooks().getLandingRef().current.touchdownLat).toBeCloseTo(39.856, 3);
    expect(hooks().getLogRef().current.airports).toEqual(['DEN']);
  });

  it('cannot turn an off-airport touchdown into an airport arrival by moving on the ground', async () => {
    Object.assign(hooks().getLandingRef().current, { scored: true, touchdownFPM: 100,
      touchdownLat: 43.8, touchdownLon: -70.309, touchdownAirportId: 'kpwm', touchdownAirportDistance: 9.2 });
    hooks().getLogRef().current.airborneSeconds = 12;
    await frame();
    expect(hooks().getLogRef().current.airports).toEqual([]);
    await frame();
    expect(hooks().getLogRef().current.airports).toEqual([]);
  });

  it('retains one-shot takeoff callouts and ignition metadata across physics frames', async () => {
    hooks().timeRef.current = 10;
    const callouts = { airspeed: 8, vr: 0, climb: 0 };
    Object.assign(hooks().flightRef.current, { _callouts: callouts, _ignitionTime: 9 });
    await frame();
    await frame();
    expect(hooks().flightRef.current._callouts).toBe(callouts);
    expect(hooks().flightRef.current._ignitionTime).toBe(9);
  });

  it('announces a continuous stall once rather than re-arming on every frame', async () => {
    Object.assign(hooks().flightRef.current, { altitude: 1000, vsi: -5, speed: 185, onGround: false });
    Object.assign(hooks().controlsRef.current, { pitch: 15, throttle: 0.6, bank: 0 });
    hooks().keysRef.current.w = true;
    const region = document.getElementById('skyschool-a11y-live');
    const originalSet = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set;
    const messages = [];
    vi.spyOn(region, 'textContent', 'set').mockImplementation(function(value) {
      messages.push(value);
      originalSet.call(this, value);
    });
    await frame();
    await act(async () => { vi.advanceTimersByTime(60); });
    expect(hooks().flightRef.current.stalling).toBe(true);
    await frame();
    await act(async () => { vi.advanceTimersByTime(60); });
    expect(hooks().flightRef.current.stalling).toBe(true);
    expect(messages.filter(message => String(message).startsWith('Stall warning!'))).toHaveLength(1);
  });
});
