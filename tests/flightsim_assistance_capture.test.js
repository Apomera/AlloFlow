import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const AIRCRAFT = ['cessna172', 'rescue_heli', 'drone'];
const cases = AIRCRAFT.flatMap(id => ['button', 'B'].map(control => [id, control]));
const hooks = () => window.__testHooks.flightSim;
const hold = () => host.querySelector('[data-flight-assistance]');
const cockpit = () => host.querySelector('canvas[role="application"]');
let FS, tool, host, root, latest, frameCallback, wallTime, physicsSnapshot, consoleError;

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.useRealTimers();
});

async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { wallTime += 1000 / 60; frameCallback(); });
  expect(consoleError).not.toHaveBeenCalled();
}

async function mount(id) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: id,
      railCollapsed: false, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (toolId, key, value) => setData(old => ({ ...old, [toolId]: { ...old[toolId], [key]: value } })),
      updateMulti: (toolId, patch) => setData(old => ({ ...old, [toolId]: { ...old[toolId], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  const launch = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(launch).toBeTruthy();
  await act(async () => launch.click());
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  return FS.AIRCRAFT.find(aircraft => aircraft.id === id);
}

function pose(selected, altitude, onGround) {
  const rotor = selected.isHelicopter || selected.isDrone;
  Object.assign(hooks().flightRef.current, { altitude, fieldElev: 76, onGround, vsi: 0,
    speed: rotor ? 0 : 120 / 0.5924838, rotorForwardFps: 0, heading: 183, aoa: 3,
    stalling: false, lowAirspeed: false });
  Object.assign(hooks().controlsRef.current, { throttle: rotor ? selected.weight / selected.maxThrust : 0.6,
    pitch: 0, bank: 0, yawRate: 0, flaps: 0, brake: 0 });
}

async function activate(control) {
  if (control === 'button') {
    await act(async () => { hold().focus(); hold().click(); });
  } else {
    await act(async () => {
      cockpit().focus();
      for (const type of ['keydown', 'keyup']) cockpit().dispatchEvent(new KeyboardEvent(type,
        { key: 'b', bubbles: true, cancelable: true }));
    });
    await frame();
  }
}

function integrate(selected, initial, initialControls, autopilot, seconds) {
  // Keep the real aircraft physics and assistance controller. The fixed local
  // ground and calm air isolate an altitude command from terrain and weather.
  const model = Object.create(FS.Physics).configureAircraft(selected);
  let state = { ...initial }, controls = { ...initialControls };
  for (let count = 0; count < seconds * 60; count++) {
    controls = FS.getAutopilotFlightControls(state, controls, autopilot, selected, 1 / 60);
    state = model.step(state, 1 / 60, controls);
  }
  return { state, controls };
}

describe('hold-current-flight capture', () => {
  it.each(cases)('captures the actual %s altitude through %s without selecting a different hundred feet', async (id, control) => {
    const selected = await mount(id);
    const rotor = selected.isHelicopter || selected.isDrone;
    const altitude = rotor ? 127.4 : 5032.4;
    pose(selected, altitude, false);
    await frame(); // Enable the native hold control after liftoff.
    pose(selected, altitude, false);
    expect(hold().disabled).toBe(false);
    await activate(control);
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true, tgtAlt: altitude });
    expect(hold().getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('#skyschool-assistance-targets').textContent)
      .toContain(Math.round(altitude).toLocaleString() + ' ft MSL');
    await act(async () => vi.advanceTimersByTime(60));
    const announcement = document.getElementById('skyschool-a11y-live').textContent;
    expect(announcement).toContain('altitude ' + Math.round(altitude) + ',');
    expect(announcement).not.toContain(String(altitude));
    expect(announcement).not.toMatch(/NaN|Infinity/);
    if (rotor) {
      const result = integrate(selected, hooks().flightRef.current, hooks().controlsRef.current, latest.autopilot, 60);
      expect(result.state.altitude).toBeCloseTo(altitude, 7);
      expect(result.state.onGround).toBe(false);
      expect(result.state.vsi).toBeCloseTo(0, 7);
      expect(result.controls.throttle).toBeCloseTo(selected.weight / selected.maxThrust, 7);
    }
  });

  it.each(cases)('does not start a parked %s departure through %s', async (id, control) => {
    const selected = await mount(id);
    const initial = { ...hooks().flightRef.current };
    // Slight rotor motion on the ground must not become a rounded speed-hold
    // target whose tilt compensation raises the collective above hover power.
    if (selected.isHelicopter || selected.isDrone) {
      Object.assign(hooks().flightRef.current, { speed: 1, rotorForwardFps: 1 });
    }
    expect(hold().disabled).toBe(true);
    await activate(control);
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    expect(hooks().controlsRef.current.throttle).toBe(0);
    const result = integrate(selected, hooks().flightRef.current, hooks().controlsRef.current, latest.autopilot, 30);
    expect(result.state.onGround).toBe(true);
    expect(result.state.altitude).toBeCloseTo(initial.altitude, 9);
    expect(result.state.speed).toBe(0);
    expect(result.controls.throttle).toBe(0);
  });

  it.each(AIRCRAFT)('updates %s native hold availability after takeoff and landing even with tutorials dismissed', async id => {
    const selected = await mount(id);
    expect(hold().disabled).toBe(true);
    pose(selected, 127.4, false);
    await frame();
    expect(hold().disabled).toBe(false);
    pose(selected, 76, true);
    Object.assign(hooks().flightRef.current, { speed: 0, rotorForwardFps: 0 });
    hooks().controlsRef.current.throttle = 0;
    await frame();
    expect(hooks().flightRef.current.onGround).toBe(true);
    expect(hold().disabled).toBe(true);
  });

  it.each(['button', 'B'])('still lets %s disengage existing assistance after ground contact', async control => {
    const selected = await mount('rescue_heli');
    pose(selected, 127.4, false); await frame(); pose(selected, 127.4, false);
    await activate('button');
    Object.assign(hooks().flightRef.current, { altitude: 76, fieldElev: 76, vsi: -3, onGround: false });
    await frame();
    expect(hooks().flightRef.current.onGround).toBe(true);
    expect(hold().disabled).toBe(false);
    await activate(control);
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
  });
});
