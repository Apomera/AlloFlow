import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const KTS_PER_FPS = 0.5924838;
let FS, tool, physicsSnapshot, host, reactRoot, cockpit, latest, frameCallback, errors, frameTime;
const hooks = () => window.__testHooks.flightSim;
const flight = patch => ({ speed: 100 / KTS_PER_FPS, altitude: 5000, vsi: 0, heading: 180,
  lat: 43.646, lon: -70.309, fieldElev: 0, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const input = patch => ({ throttle: 0.5, pitch: 0, bank: 0, yawRate: 0, flaps: 0, brake: 0, ...patch });

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
});

afterEach(async () => {
  if (reactRoot) await act(async () => reactRoot.unmount());
  reactRoot = null;
  host?.remove();
  host = null;
  cockpit = null;
  frameCallback = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(FS.Physics)) {
    if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  }
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete window.__RR_TEST_EXPORTS__;
  delete window.__testHooks;
  vi.useRealTimers();
});

function configure() {
  const aircraft = FS.AIRCRAFT.find(item => item.id === 'cessna172');
  expect(aircraft).toBeTruthy();
  // The same engine and speed-limit model the cockpit configures for this aircraft.
  FS.Physics.configureAircraft(aircraft);
  Object.assign(FS.Physics, { AGL_CEILING: null, SPRINT_MODE: false });
  return aircraft;
}

// Find an equilibrium with the actual integrator, independently of the
// assistance controller. Power balances forward acceleration for each pitch;
// the outer root finds the pitch that also balances vertical acceleration.
function bisect(residual, low, high) {
  expect(residual(low)).toBeLessThan(0);
  expect(residual(high)).toBeGreaterThan(0);
  for (let iteration = 0; iteration < 52; iteration++) {
    const middle = (low + high) / 2;
    if (residual(middle) < 0) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function cruiseTrim(current = flight()) {
  const powerAt = pitch => bisect(throttle =>
    FS.Physics.step(current, 1 / 60, input({ pitch, throttle })).speed - current.speed, 0, 1);
  // A propeller's thrust falls with airspeed, so at 4 degrees full power can no
  // longer hold 100 KIAS; the level-flight trim (about 1.3 degrees) lies well inside.
  const pitch = bisect(angle =>
    FS.Physics.step(current, 1 / 60, input({ pitch: angle, throttle: powerAt(angle) })).vsi, -2, 3);
  const trim = input({ pitch, throttle: powerAt(pitch) });
  const next = FS.Physics.step(current, 1 / 60, trim);
  expect(trim.pitch).toBeGreaterThan(1);
  expect(trim.pitch).toBeLessThan(3);
  expect(next.speed).toBeCloseTo(current.speed, 9);
  expect(next.vsi).toBeCloseTo(0, 9);
  return trim;
}

function simulate({ target = 5000, seconds = 120, fps = 60, state = flight(), controls = cruiseTrim(), modes = {} } = {}) {
  const aircraft = configure();
  // Speed assistance holds the same IAS initially shown on the cockpit tape.
  const initialIas = FS.computeFlightTelemetry(state, controls, {}, 0, 0, null, null, aircraft).iasKts;
  const autopilot = { alt: true, spd: true, tgtAlt: target, tgtSpd: initialIas, ...modes };
  let current = { ...state }, command = { ...controls };
  let minimumAltitude = current.altitude, maximumAltitude = current.altitude;
  let maximumPitchRate = 0, stalled = false, landed = false;
  const samples = [];
  for (let frame = 0; frame < seconds * fps; frame++) {
    const nextCommand = FS.getAutopilotFlightControls(current, command, autopilot, aircraft, 1 / fps);
    maximumPitchRate = Math.max(maximumPitchRate, Math.abs(nextCommand.pitch - command.pitch) * fps);
    command = nextCommand;
    current = FS.Physics.step(current, 1 / fps, command);
    minimumAltitude = Math.min(minimumAltitude, current.altitude);
    maximumAltitude = Math.max(maximumAltitude, current.altitude);
    stalled ||= current.stalling;
    landed ||= current.onGround;
    if ((frame + 1) % fps === 0) samples.push({ ...current, pitch: command.pitch });
  }
  return { state: current, controls: command, initialIas, minimumAltitude, maximumAltitude, maximumPitchRate, stalled, landed, samples };
}

describe('fixed-wing altitude assistance uses the aircraft trim', () => {
  it('retains balanced cruise for two minutes without replacing its nonzero pitch with level attitude', () => {
    configure();
    const trim = cruiseTrim();
    const result = simulate({ controls: trim });
    expect(result.maximumAltitude - result.minimumAltitude).toBeLessThan(0.1);
    expect(result.state.altitude).toBeCloseTo(5000, 3);
    expect(result.state.vsi).toBeCloseTo(0, 3);
    expect(result.state.speed * KTS_PER_FPS).toBeCloseTo(100, 3);
    expect(result.controls.pitch).toBeCloseTo(trim.pitch, 3);
    expect(result.stalled).toBe(false);
    expect(result.landed).toBe(false);
  });

  it.each([4700, 5300])('captures a %s foot target progressively and settles without a stall', target => {
    configure();
    const result = simulate({ target });
    const first = result.samples[0];
    expect(Math.sign(first.altitude - 5000)).toBe(Math.sign(target - 5000));
    expect(Math.abs(first.altitude - 5000)).toBeLessThan(15);
    expect(Math.abs(result.state.altitude - target)).toBeLessThan(5);
    expect(Math.abs(result.state.vsi)).toBeLessThan(0.3);
    const heldIas = FS.computeFlightTelemetry(result.state, result.controls, {}, 0, 0, null, null, configure()).iasKts;
    expect(Math.abs(heldIas - result.initialIas)).toBeLessThan(2);
    expect(Math.abs(result.state.speed * KTS_PER_FPS - 100)).toBeLessThan(2);
    expect(result.maximumPitchRate).toBeLessThanOrEqual(2.01);
    expect(result.minimumAltitude).toBeGreaterThan(Math.min(5000, target) - 15);
    expect(result.maximumAltitude).toBeLessThan(Math.max(5000, target) + 15);
    expect(result.stalled).toBe(false);
    expect(result.landed).toBe(false);
    expect(Math.abs(result.controls.pitch)).toBeLessThanOrEqual(8);
  });

  it.each([4700, 5300])('captures %s feet consistently at 30, 60, and 144 frames per second', target => {
    configure();
    const trim = cruiseTrim();
    const results = [30, 60, 144].map(fps => simulate({ target, fps, controls: trim }));
    const reference = results[1];
    for (const result of results) {
      expect(Math.abs(result.state.altitude - reference.state.altitude)).toBeLessThan(1);
      expect(Math.abs(result.state.vsi - reference.state.vsi)).toBeLessThan(0.05);
      expect(Math.abs(result.state.speed - reference.state.speed) * KTS_PER_FPS).toBeLessThan(0.2);
      expect(result.samples[29].altitude).toBeCloseTo(reference.samples[29].altitude, 0);
      expect(result.stalled).toBe(false);
    }
  });

  it('brakes a climb before reaching its target and a descent before falling below it', () => {
    const aircraft = configure(), trim = cruiseTrim();
    const climb = FS.getAutopilotFlightControls(flight({ altitude: 4995, vsi: 5 }), trim,
      { alt: true, tgtAlt: 5000 }, aircraft, 1 / 60);
    const descent = FS.getAutopilotFlightControls(flight({ altitude: 5005, vsi: -5 }), trim,
      { alt: true, tgtAlt: 5000 }, aircraft, 1 / 60);
    expect(climb.pitch).toBeLessThan(trim.pitch);
    expect(descent.pitch).toBeGreaterThan(trim.pitch);
    expect(Math.abs(climb.pitch - trim.pitch)).toBeLessThan(0.1);
    expect(Math.abs(descent.pitch - trim.pitch)).toBeLessThan(0.1);
  });

  it.each(['stalling', 'lowAirspeed'])('does not add nose-up demand to a climb target while %s', warning => {
    const aircraft = configure(), trim = cruiseTrim();
    const next = FS.getAutopilotFlightControls(flight({ [warning]: true }), trim,
      { alt: true, tgtAlt: 8000 }, aircraft, 1 / 60);
    expect(next.pitch).toBeLessThan(trim.pitch);
    expect(next.throttle).toBe(trim.throttle);
  });

  it.each([{ aoa: 22, pitch: 6 }, { aoa: -22, pitch: -6 }])('unloads a stall at $aoa degrees AoA toward attached flow', ({ aoa, pitch }) => {
    const aircraft = configure(), command = input({ pitch });
    // The altitude target asks for an increase of the existing stall sign.
    // Recovery must have authority in either direction before that request.
    const next = FS.getAutopilotFlightControls(flight({ stalling: true, aoa }), command,
      { alt: true, tgtAlt: aoa > 0 ? 8000 : 2000 }, aircraft, 1 / 60);
    expect(Math.abs(next.pitch)).toBeLessThan(Math.abs(pitch));
    expect(Math.sign(next.pitch)).toBe(Math.sign(pitch));
    expect(Math.abs(next.pitch - pitch)).toBeLessThan(0.1);
  });

  it('keeps an altitude target from controlling pitch while the aircraft is on the runway', () => {
    const aircraft = configure(), command = input({ pitch: 4, throttle: 0.7 });
    const next = FS.getAutopilotFlightControls(flight({ onGround: true, altitude: 0, fieldElev: 0, speed: 20 }), command,
      { alt: true, tgtAlt: 5000 }, aircraft, 1 / 60);
    expect(next).toEqual(command);
  });

  it.each([NaN, Infinity, undefined])('leaves pitch under pilot control if VSI is unavailable: %s', vsi => {
    const aircraft = configure(), command = input({ pitch: 3 });
    const next = FS.getAutopilotFlightControls(flight({ vsi }), command,
      { alt: true, tgtAlt: 8000 }, aircraft, 1 / 60);
    expect(next).toEqual(command);
  });

  it('returns separate controls without changing the aircraft, target, or input objects', () => {
    const aircraft = configure(), trim = cruiseTrim();
    const current = Object.freeze(flight());
    const command = Object.freeze({ ...trim });
    const autopilot = Object.freeze({ alt: true, tgtAlt: 5300 });
    const next = FS.getAutopilotFlightControls(current, command, autopilot, aircraft, 1 / 60);
    expect(next).not.toBe(command);
    expect(next.pitch).toBeGreaterThan(command.pitch);
    expect(command).toEqual(trim);
    expect(current).toEqual(flight());
    expect(autopilot).toEqual({ alt: true, tgtAlt: 5300 });
  });
});

async function mountCruise() {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  frameTime = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => frameTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172',
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => reactRoot.render(React.createElement(App)));
  const launch = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(launch).toBeTruthy();
  await act(async () => launch.click());
  cockpit = host.querySelector('canvas[role="application"]');
  expect(cockpit).toBeTruthy();
  vi.spyOn(cockpit, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, width: 1000, height: 600, right: 1100, bottom: 650 });
  cockpit.focus();
  const aircraft = configure();
  // An integer indicated speed makes rounded B capture an exact equilibrium.
  const factor = Math.sqrt(Math.pow(1 - 0.0000068756 * 5000, 4.2561));
  const current = flight({ speed: 100 / KTS_PER_FPS / factor });
  expect(FS.computeFlightTelemetry(current, input(), {}, 0, 0, null, null, aircraft).iasKts).toBeCloseTo(100, 10);
  const trim = cruiseTrim(current);
  Object.assign(hooks().flightRef.current, current);
  Object.assign(hooks().controlsRef.current, trim);
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  return trim;
}

async function frames(count = 1) {
  for (let frame = 0; frame < count; frame++) {
    expect(frameCallback).toBeTypeOf('function');
    await act(async () => {
      frameTime += 1000 / 60;
      vi.advanceTimersByTime(1000 / 60);
      frameCallback();
    });
    expect(errors).not.toHaveBeenCalled();
  }
}

function key(type, value) {
  cockpit.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
}

async function engage() {
  key('keydown', 'b');
  key('keyup', 'b');
  await frames();
  expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true, tgtHdg: 180, tgtAlt: 5000, tgtSpd: 100 });
}

function touch(type, point) {
  cockpit.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
    changedTouches: [point], touches: [point], targetTouches: [point] }));
}

describe('altitude hold through the production cockpit loop', () => {
  it('captures the current trim on a fast B tap and retains it across idle frames', async () => {
    const trim = await mountCruise();
    await engage();
    expect(hooks().controlsRef.current.pitch).toBeCloseTo(trim.pitch, 8);
    await frames(120);
    expect(hooks().controlsRef.current.pitch).toBeCloseTo(trim.pitch, 3);
    expect(hooks().flightRef.current.altitude).toBeCloseTo(5000, 3);
    expect(hooks().flightRef.current.vsi).toBeCloseTo(0, 3);
    expect(latest.autopilot.alt).toBe(true);
  });

  it('preserves a pilot pitch command in the frame that releases assistance', async () => {
    const trim = await mountCruise();
    await engage();
    key('keydown', 'ArrowUp');
    await frames();
    key('keyup', 'ArrowUp');
    expect(latest.autopilot).toMatchObject({ hdg: false, alt: false, spd: false });
    expect(hooks().controlsRef.current.pitch).toBeGreaterThan(trim.pitch + 0.2);
    expect(hooks().controlsRef.current.pitch).toBeLessThan(trim.pitch + 0.3);
  });

  it.each(['stick', 'power'])('gives a deflected touch %s ownership immediately', async zone => {
    await mountCruise();
    await engage();
    const point = zone === 'stick' ? { identifier: 3, clientX: 300, clientY: 350 }
      : { identifier: 4, clientX: 1030, clientY: 450 };
    const moved = { ...point, clientY: point.clientY - 40 };
    const previousThrottle = hooks().controlsRef.current.throttle;
    await act(async () => {
      touch('touchstart', point);
      touch('touchmove', moved);
    });
    expect(latest.autopilot).toMatchObject({ hdg: false, alt: false, spd: false });
    await frames();
    if (zone === 'stick') expect(hooks().controlsRef.current.pitch).toBe(7.5);
    else expect(hooks().controlsRef.current.throttle).toBeCloseTo(previousThrottle + 0.2, 9);
  });

  it('freezes trim, aircraft state, and the simulation clock during pause', async () => {
    await mountCruise();
    await engage();
    await act(async () => host.querySelector('button[aria-label="Pause flight"]').click());
    const state = { ...hooks().flightRef.current };
    const command = { ...hooks().controlsRef.current };
    const time = hooks().timeRef.current;
    await frames(5);
    expect(hooks().flightRef.current).toEqual(state);
    expect(hooks().controlsRef.current).toEqual(command);
    expect(hooks().timeRef.current).toBe(time);
    expect(latest.autopilot.alt).toBe(true);
    await act(async () => host.querySelector('button[aria-label="Resume flight"]').click());
    await frames(2);
    expect(hooks().timeRef.current).toBeGreaterThan(time);
    expect(hooks().controlsRef.current.pitch).toBeCloseTo(command.pitch, 3);
  });
});
