import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const KTS_PER_FPS = 0.5924838;
const factor = Math.sqrt(Math.pow(1 - 0.0000068756 * 5000, 4.2561));
const input = patch => ({ throttle: 0.5, pitch: 0, bank: 0, yawRate: 0, flaps: 0, brake: 0, ...patch });
const flight = patch => ({ speed: 100 / KTS_PER_FPS / factor, altitude: 5000, vsi: 0, heading: 180,
  lat: 43.646, lon: -70.309, fieldElev: 76, onGround: false, stalling: false, lowAirspeed: false, ...patch });
let FS, tool, snapshot, host, root, cockpit, latest, updateSaved, frameCallback, wallTime, errors;
const hooks = () => window.__testHooks.flightSim;
const controls = () => hooks().controlsRef.current;

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  snapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime); frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; cockpit = null;
  for (const name of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(snapshot, name)) delete FS.Physics[name];
  Object.defineProperties(FS.Physics, snapshot);
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

function configure() {
  const aircraft = FS.AIRCRAFT.find(item => item.id === 'cessna172');
  Object.assign(FS.Physics, { WING_AREA: aircraft.wingArea, WEIGHT: aircraft.weight, MAX_THRUST: aircraft.maxThrust,
    CL0: aircraft.cl0, CL_PER_AOA: aircraft.clPerAoa, CD0: aircraft.cd0, CD_INDUCED_K: aircraft.cdK,
    IS_HELICOPTER: false, IS_DRONE: false, MAX_SPEED_KTS: aircraft.maxSpeed, AGL_CEILING: null, SPRINT_MODE: false });
  return aircraft;
}
function bisect(residual, low, high) {
  expect(residual(low)).toBeLessThan(0); expect(residual(high)).toBeGreaterThan(0);
  for (let iteration = 0; iteration < 52; iteration++) {
    const middle = (low + high) / 2;
    if (residual(middle) < 0) low = middle; else high = middle;
  }
  return (low + high) / 2;
}
function cruiseTrim(current) {
  const powerAt = pitch => bisect(throttle =>
    FS.Physics.step(current, 1 / 60, input({ pitch, throttle })).speed - current.speed, 0, 1);
  const pitch = bisect(angle =>
    FS.Physics.step(current, 1 / 60, input({ pitch: angle, throttle: powerAt(angle) })).vsi, -2, 4);
  return input({ pitch, throttle: powerAt(pitch) });
}
function assisted(current, command, ap, dt) {
  return FS.getAutopilotFlightControls(current, command, ap, configure(), dt);
}

const rollCases = [30, 60, 144].flatMap(fps => [-45, 45].map(bank => ({ fps, bank })));
const pitchCases = [30, 60, 144].flatMap(fps => [-15, 15].map(pitch => ({ fps, pitch })));
describe('assistance handover starts at the actual legal attitude', () => {
  it.each(rollCases)('rolls from $bank degrees at 30 degrees per second, $fps FPS', ({ fps, bank }) => {
    const command = Object.freeze(input({ bank })), current = Object.freeze(flight());
    const ap = Object.freeze({ hdg: true, tgtHdg: 180 });
    const next = assisted(current, command, ap, 1 / fps);
    expect(next.bank).toBeCloseTo(bank - Math.sign(bank) * 30 / fps, 10);
    expect(Math.abs(next.bank - bank) * fps).toBeCloseTo(30, 9);
    expect(next.pitch).toBe(command.pitch); expect(command.bank).toBe(bank);
  });

  it.each(pitchCases)('returns from $pitch degrees at 2 degrees per second, $fps FPS', ({ fps, pitch }) => {
    const command = Object.freeze(input({ pitch })), current = Object.freeze(flight());
    const next = assisted(current, command, { alt: true, tgtAlt: 5000 }, 1 / fps);
    expect(next.pitch).toBeCloseTo(pitch - Math.sign(pitch) * 2 / fps, 10);
    expect(Math.abs(next.pitch - pitch) * fps).toBeCloseTo(2, 9);
    expect(next.bank).toBe(command.bank); expect(command.pitch).toBe(pitch);
  });

  it('preserves stall unloading direction while returning from either pitch limit', () => {
    for (const sign of [-1, 1]) {
      const command = input({ pitch: sign * 15 });
      const next = assisted(flight({ stalling: true, aoa: sign * 22 }), command,
        { alt: true, tgtAlt: sign > 0 ? 8000 : 2000 }, 1 / 60);
      expect(Math.abs(next.pitch)).toBeLessThan(Math.abs(command.pitch));
      expect(next.pitch).toBeCloseTo(sign * (15 - 2 / 60), 10);
    }
  });

  it('freezes controls for invalid elapsed time and bounds a delayed frame to 100 milliseconds', () => {
    const command = Object.freeze(input({ pitch: 15 })), current = Object.freeze(flight());
    const ap = { hdg: true, tgtHdg: 90, alt: true, tgtAlt: 5000 };
    for (const dt of [0, -1, NaN, Infinity]) expect(assisted(current, command, ap, dt)).toEqual(command);
    const delayed = assisted(current, command, ap, 10);
    expect(delayed.bank).toBeCloseTo(-3, 10); expect(delayed.pitch).toBeCloseTo(14.8, 10);
  });

  it('leaves unavailable heading and altitude targets under manual control', () => {
    const command = Object.freeze(input({ pitch: 12, bank: 35 }));
    for (const target of [undefined, NaN, Infinity]) {
      expect(assisted(flight(), command, { hdg: true, tgtHdg: target, alt: true, tgtAlt: target }, 1 / 60)).toEqual(command);
    }
    expect(assisted(flight({ heading: NaN, vsi: NaN }), command,
      { hdg: true, tgtHdg: 180, alt: true, tgtAlt: 5000 }, 1 / 60)).toEqual(command);
  });
});

function turn(fps, bank) {
  const aircraft = configure(); let current = flight({ heading: 350 }), command = { ...cruiseTrim(current), bank };
  const ap = { hdg: true, tgtHdg: 30, alt: true, tgtAlt: 5000, spd: true, tgtSpd: 100 };
  let maximumRollRate = 0, maximumPitchRate = 0, maximumBank = 0, stalled = false, grounded = false;
  for (let frame = 0; frame < 120 * fps; frame++) {
    const next = FS.getAutopilotFlightControls(current, command, ap, aircraft, 1 / fps);
    maximumRollRate = Math.max(maximumRollRate, Math.abs(next.bank - command.bank) * fps);
    maximumPitchRate = Math.max(maximumPitchRate, Math.abs(next.pitch - command.pitch) * fps);
    maximumBank = Math.max(maximumBank, Math.abs(next.bank)); command = next;
    current = FS.Physics.step(current, 1 / fps, command); stalled ||= current.stalling; grounded ||= current.onGround;
  }
  const ias = FS.computeFlightTelemetry(current, command, {}, 0, 0, null, null, aircraft).iasKts;
  return { state: current, controls: command, ias, maximumRollRate, maximumPitchRate, maximumBank, stalled, grounded };
}
describe('heading capture with the real flight integrator', () => {
  it.each([-45, 45])('recovers an initial %s degree bank and captures a heading across north at 30/60/144 FPS', bank => {
    const results = [30, 60, 144].map(fps => turn(fps, bank)), reference = results[1];
    for (const result of results) {
      const headingError = ((30 - result.state.heading) % 360 + 540) % 360 - 180;
      expect(Math.abs(headingError)).toBeLessThan(0.5); expect(Math.abs(result.controls.bank)).toBeLessThan(0.5);
      expect(result.maximumRollRate).toBeLessThanOrEqual(30.001); expect(result.maximumPitchRate).toBeLessThanOrEqual(2.001);
      expect(result.maximumBank).toBeLessThanOrEqual(45); expect(result.stalled).toBe(false); expect(result.grounded).toBe(false);
      expect(Math.abs(result.state.altitude - 5000)).toBeLessThan(10); expect(Math.abs(result.ias - 100)).toBeLessThan(1);
      expect(Math.abs(result.state.heading - reference.state.heading)).toBeLessThan(0.1);
      expect(Math.abs(result.state.altitude - reference.state.altitude)).toBeLessThan(1.5);
    }
  });
});

async function mount(commandPatch = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim; updateSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, name, value) => setData(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  cockpit = host.querySelector('canvas[role="application"]'); cockpit.focus(); configure();
  const current = flight(); Object.assign(hooks().flightRef.current, current);
  Object.assign(controls(), cruiseTrim(current), commandPatch);
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
}
function key(type, value) {
  cockpit.focus(); cockpit.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
}
async function frames(count = 1) {
  for (let frame = 0; frame < count; frame++) {
    expect(frameCallback).toBeTypeOf('function');
    await act(async () => { wallTime += 1000 / 60; vi.advanceTimersByTime(1000 / 60); frameCallback(); });
    expect(errors).not.toHaveBeenCalled();
  }
}
async function engage() { key('keydown', 'b'); key('keyup', 'b'); await frames(); }

describe('attitude ownership through actual cockpit keyboard and RAF', () => {
  it.each([{ bank: 45 }, { pitch: 15 }, { pitch: -15 }])('captures B from $bank bank/$pitch pitch without a first-frame jump', async patch => {
    await mount(patch); const before = { ...controls() }; await engage();
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true });
    expect(Math.abs(controls().bank - before.bank)).toBeLessThanOrEqual(30 / 60 + 1e-10);
    expect(Math.abs(controls().pitch - before.pitch)).toBeLessThanOrEqual(2 / 60 + 1e-10);
    if (patch.bank) expect(controls().bank).toBeCloseTo(44.5, 10);
    else expect(controls().pitch).toBeCloseTo(Math.sign(patch.pitch) * (15 - 2 / 60), 10);
  });

  it.each([['bank', 'ArrowRight'], ['pitch', 'ArrowUp']])('preserves manual %s input on the frame that disengages assistance', async (axis, value) => {
    await mount({ bank: 30 }); await engage(); const before = { ...controls() };
    key('keydown', value); await frames(); key('keyup', value);
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    if (axis === 'bank') expect(controls().bank).toBeCloseTo(before.bank + 0.5, 10);
    else expect(controls().pitch).toBeCloseTo(before.pitch + 0.25, 10);
  });

  it('holds a banked handover while paused and resumes at the bounded roll rate', async () => {
    await mount({ bank: 45 }); await engage();
    await act(async () => host.querySelector('button[aria-label="Pause flight"]').click());
    const held = { ...controls() }, current = { ...hooks().flightRef.current }, clock = hooks().timeRef.current;
    await frames(3); expect(controls()).toEqual(held); expect(hooks().flightRef.current).toEqual(current);
    expect(hooks().timeRef.current).toBe(clock);
    await act(async () => host.querySelector('button[aria-label="Resume flight"]').click()); await frames();
    expect(controls().bank).toBeCloseTo(held.bank - 0.5, 10);
    expect(latest.autopilot.hdg).toBe(true);
  });

  it('retains the current bank on B release and restores ordinary auto-centering on the next idle frame', async () => {
    await mount({ bank: 45 }); await engage(); const bank = controls().bank;
    key('keydown', 'b'); key('keyup', 'b'); await frames();
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false }); expect(controls().bank).toBe(bank);
    await frames(); expect(controls().bank).toBeCloseTo(bank * Math.pow(0.95, 0.5), 10);
  });

  it('keeps normal auto-centering when a restored heading target is invalid', async () => {
    await mount({ bank: 30 });
    await act(async () => updateSaved({ autopilot: { hdg: true, tgtHdg: NaN, alt: false, spd: false } }));
    await frames(); expect(controls().bank).toBeCloseTo(30 * Math.pow(0.95, 0.5), 10);
  });
});
