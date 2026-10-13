import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const KTS_PER_FPS = 0.5924838;
const FEET_PER_NM = 6076.12;
const radians = degrees => degrees * Math.PI / 180;
let FS, tool, physicsSnapshot, host, root, latest, frameCallback, errors;

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
  if (root) await act(async () => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
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

function aircraft(id) {
  const selected = FS.AIRCRAFT.find(item => item.id === id);
  expect(selected, `Aircraft ${id}`).toBeTruthy();
  return selected;
}

function configure(id) {
  const selected = aircraft(id);
  Object.assign(FS.Physics, {
    WING_AREA: selected.wingArea, WEIGHT: selected.weight, MAX_THRUST: selected.maxThrust,
    CL0: selected.cl0, CL_PER_AOA: selected.clPerAoa, CD0: selected.cd0, CD_INDUCED_K: selected.cdK,
    IS_HELICOPTER: !!selected.isHelicopter, IS_DRONE: !!selected.isDrone,
    MAX_SPEED_KTS: selected.maxSpeed, AGL_CEILING: selected.isDrone ? 400 : null, SPRINT_MODE: false,
  });
  return selected;
}

function state(patch = {}) {
  return { speed: 0, altitude: 100, vsi: 0, heading: 0, lat: 43.646, lon: -70.309,
    fieldElev: 0, onGround: false, stalling: false, ...patch };
}

function controls(patch = {}) {
  return { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0, flaps: 0, brake: 0, ...patch };
}

function assist(current, input, ap, selected, dt = 1 / 60) {
  expect(FS.getAutopilotFlightControls).toBeTypeOf('function');
  return FS.getAutopilotFlightControls(current, input, ap, selected, dt);
}

function runAssisted(selected, initial, ap, seconds, input = controls()) {
  let current = initial;
  let ctrl = input;
  for (let frame = 0; frame < seconds * 60; frame++) {
    ctrl = assist(current, ctrl, ap, selected);
    current = FS.Physics.step(current, 1 / 60, ctrl);
  }
  return { state: current, controls: ctrl };
}

describe('aircraft-specific autopilot assistance', () => {
  it('preserves the fixed-wing heading, altitude, and throttle responses without mutating inputs', () => {
    const current = Object.freeze(state({ speed: 30 / KTS_PER_FPS, heading: 350, altitude: 1000 }));
    const input = Object.freeze(controls({ throttle: 0.4, flaps: 10, brake: 1 }));
    const ap = Object.freeze({ hdg: true, alt: true, spd: true, tgtHdg: 10, tgtAlt: 1100, tgtSpd: 40 });
    const selected = configure('cessna172');
    const next = assist(current, input, ap, selected);
    expect(next).not.toBe(input);
    expect(next.bank).toBeCloseTo(16, 10);
    expect(next.pitch).toBeCloseTo(0.2, 10);
    expect(next.throttle).toBeCloseTo(0.405, 10);
    expect(next).toMatchObject({ yawRate: 0, flaps: 10, brake: 1 });
    expect(input).toEqual(controls({ throttle: 0.4, flaps: 10, brake: 1 }));
    expect(current.heading).toBe(350);
    expect(ap.tgtHdg).toBe(10);
    const stepped = FS.Physics.step(current, 0.1, next);
    expect(stepped.heading).toBeGreaterThan(current.heading);
    const velocity = FS.getFlightVelocity(stepped, next, {}, 0, selected);
    const lateral = velocity.x * Math.cos(radians(stepped.heading)) + velocity.z * Math.sin(radians(stepped.heading));
    expect(lateral).toBeCloseTo(0, 10);
  });

  it.each(['rescue_heli', 'drone'])('corrects %s heading through yaw and takes the short path across north', id => {
    const selected = configure(id);
    const input = Object.freeze(controls({ bank: 20 }));
    const clockwise = assist(state({ heading: 350 }), input, { hdg: true, tgtHdg: 10 }, selected);
    const counterclockwise = assist(state({ heading: 10 }), input, { hdg: true, tgtHdg: 350 }, selected);
    const wrapped = assist(state({ heading: 710 }), input, { hdg: true, tgtHdg: -350 }, selected);
    expect(clockwise).toMatchObject({ yawRate: 16, bank: 0 });
    expect(counterclockwise).toMatchObject({ yawRate: -16, bank: 0 });
    expect(wrapped.yawRate).toBeCloseTo(clockwise.yawRate, 10);
    const limited = assist(state({ heading: 0 }), input, { hdg: true, tgtHdg: 90 }, selected);
    expect(limited.yawRate).toBe(id === 'drone' ? 45 : 25);

    const result = runAssisted(selected, state({ heading: 350 }), { hdg: true, tgtHdg: 30 }, 8,
      controls({ throttle: selected.weight / selected.maxThrust, bank: 20 }));
    const remaining = ((30 - result.state.heading + 540) % 360) - 180;
    expect(Math.abs(remaining)).toBeLessThan(1);
    expect(result.state.lat).toBeCloseTo(43.646, 10);
    expect(result.state.lon).toBeCloseTo(-70.309, 10);
    expect(result.controls.bank).toBe(0);
  });

  it.each(['rescue_heli', 'drone'])('holds %s altitude with balanced thrust and compensates newly commanded pitch', id => {
    const selected = configure(id);
    const level = assist(state(), controls({ throttle: 0.1 }), { alt: true, tgtAlt: 100 }, selected);
    expect(level.throttle).toBeCloseTo(selected.weight / selected.maxThrust, 10);
    const next = FS.Physics.step(state(), 1, level);
    expect(next.forces.lift).toBeCloseTo(selected.weight, 8);
    expect(next.vsi).toBeCloseTo(0, 8);
    expect(next.altitude).toBeCloseTo(100, 8);

    const tilted = assist(state(), controls({ bank: 17, throttle: 0 }),
      { alt: true, spd: true, tgtAlt: 100, tgtSpd: 10 }, selected);
    expect(tilted.pitch).toBeCloseTo(6, 8);
    expect(tilted.bank).toBe(17);
    const tiltedForces = FS.Physics.step(state(), 0, tilted).forces;
    expect(tiltedForces.lift).toBeCloseTo(selected.weight, 8);
    expect(tiltedForces.forward).toBeGreaterThan(0);
  });

  it.each(['rescue_heli', 'drone'])('commands %s climb and descent through collective with the correct force signs', id => {
    const selected = configure(id);
    const initial = state({ altitude: 200 });
    const up = assist(initial, controls(), { alt: true, tgtAlt: 220 }, selected);
    const down = assist(initial, controls(), { alt: true, tgtAlt: 180 }, selected);
    expect(up.pitch).toBe(0);
    expect(down.pitch).toBe(0);
    const climbing = FS.Physics.step(initial, 0.1, up);
    const descending = FS.Physics.step(initial, 0.1, down);
    expect(climbing.forces.lift).toBeGreaterThan(selected.weight);
    expect(descending.forces.lift).toBeLessThan(selected.weight);
    expect(climbing.vsi).toBeGreaterThan(0);
    expect(descending.vsi).toBeLessThan(0);
    for (const target of [180, 220]) {
      const result = runAssisted(selected, initial, { alt: true, tgtAlt: target }, 60);
      expect(Math.abs(target - result.state.altitude)).toBeLessThan(Math.abs(target - initial.altitude) * 0.65);
    }
  });

  it.each(['rescue_heli', 'drone'])('reduces %s forward-speed error with pitch rather than collective', id => {
    const selected = configure(id);
    const hoverThrottle = selected.weight / selected.maxThrust;
    const faster = assist(state(), controls({ throttle: hoverThrottle }), { spd: true, tgtSpd: 12 }, selected);
    expect(faster.pitch).toBeCloseTo(7.2, 8);
    expect(faster.throttle).toBe(hoverThrottle);
    expect(FS.Physics.step(state(), 0.1, faster).speed).toBeGreaterThan(0);
    const tooFast = state({ speed: 20 / KTS_PER_FPS });
    const slower = assist(tooFast, controls({ throttle: hoverThrottle }), { spd: true, tgtSpd: 8 }, selected);
    expect(slower.pitch).toBeCloseTo(-7.2, 8);
    expect(FS.Physics.step(tooFast, 0.1, slower).speed).toBeLessThan(tooFast.speed);
    const result = runAssisted(selected, state(), { spd: true, alt: true, tgtSpd: 12, tgtAlt: 100 }, 20);
    expect(Math.abs(12 - result.state.speed * KTS_PER_FPS)).toBeLessThan(6);
    expect(Math.abs(100 - result.state.altitude)).toBeLessThan(1);
  });

  it('caps a drone altitude target above local terrain at its practice ceiling', () => {
    const selected = configure('drone');
    const atCeiling = state({ altitude: 1400, fieldElev: 1000 });
    const next = assist(atCeiling, controls({ throttle: 1 }), { alt: true, tgtAlt: 9000 }, selected);
    expect(next.throttle).toBeCloseTo(selected.weight / selected.maxThrust, 10);
    const stepped = FS.Physics.step(atCeiling, 1, next);
    expect(stepped.altitude).toBeCloseTo(1400, 8);
    expect(stepped.vsi).toBeCloseTo(0, 8);
  });

  it.each([0, -1])('holds every control when elapsed time is %s', dt => {
    const input = Object.freeze(controls({ throttle: 0.7, pitch: -4, bank: 11, yawRate: 9 }));
    for (const id of ['cessna172', 'rescue_heli', 'drone']) {
      const next = assist(state(), input, { hdg: true, alt: true, spd: true, tgtHdg: 90, tgtAlt: 500, tgtSpd: 25 }, aircraft(id), dt);
      expect(next).toEqual(input);
      expect(next).not.toBe(input);
    }
  });

  it('leaves disabled and unavailable targets inactive without mutating controls', () => {
    const input = Object.freeze(controls({ throttle: 0.7, pitch: -4, bank: 11, yawRate: 9 }));
    for (const id of ['cessna172', 'rescue_heli', 'drone']) {
      for (const ap of [{}, { hdg: false, alt: false, spd: false, tgtHdg: 90, tgtAlt: 500, tgtSpd: 25 },
        { hdg: true, alt: true, spd: true }, { hdg: true, alt: true, spd: true, tgtHdg: NaN, tgtAlt: Infinity, tgtSpd: NaN }]) {
        expect(assist(state(), input, Object.freeze(ap), aircraft(id))).toEqual(input);
      }
    }
  });
});

const hooks = () => window.__testHooks.flightSim;

async function mountMission(id) {
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
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', menuSections: { challenges: true },
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (toolId, key, value) => updateData(previous => ({ ...previous, [toolId]: { ...previous[toolId], [key]: value } })),
      updateMulti: (toolId, patch) => updateData(previous => ({ ...previous, [toolId]: { ...previous[toolId], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  const label = id === 'coastal_rescue' ? 'Coastal Rescue' : id === 'drone_powerline' ? 'Powerline Inspection' : 'Drone Aerial Survey';
  const launch = [...host.querySelectorAll('#skyschool-secbody-challenges button')].find(button => button.textContent.includes(label));
  expect(launch, label).toBeTruthy();
  await act(async () => launch.click());
  if (id !== 'coastal_rescue') {
    const briefing = [...host.querySelectorAll('button')].find(button => button.textContent.includes('I Understand'));
    expect(briefing).toBeTruthy();
    await act(async () => briefing.click());
  }
  const portland = FS.WAYPOINTS.find(item => item.id === 'kpwm');
  const target = id === 'coastal_rescue' ? { lat: portland.lat, lon: portland.lon } : latest.survey.photos[0];
  if (id === 'coastal_rescue') Object.assign(latest.rescue, { survivorLat: target.lat, survivorLon: target.lon });
  Object.assign(hooks().flightRef.current, state({ lat: target.lat, lon: target.lon, altitude: portland.alt + 30, fieldElev: portland.alt }));
  Object.assign(hooks().controlsRef.current, controls());
  const selected = aircraft(latest.aircraft);
  // Keep height and engine response stable so the production mission tick is
  // tested against only its motion gates. Preserve actual air displacement;
  // the loop adds wind afterward, including cancellation by opposing wind.
  vi.spyOn(FS.Physics, 'step').mockImplementation((current, dt, ctrl) => {
    const velocity = FS.getFlightVelocity(current, ctrl, {}, 0, selected);
    return { ...current, vsi: 0,
      forces: { lift: selected.weight, drag: 0, thrust: selected.weight, weight: selected.weight, normal: selected.weight },
      lat: current.lat - velocity.z / FEET_PER_NM / 60 * dt,
      lon: current.lon + velocity.x / FEET_PER_NM / (60 * Math.cos(radians(current.lat))) * dt,
    };
  });
  return target;
}

async function missionFrames(target, count) {
  for (let frame = 0; frame < count; frame++) {
    // Keep the candidate inside the capture radius even in wind; this makes
    // a rejected hold evidence of the speed gate, not of drifting too far.
    Object.assign(hooks().flightRef.current, { lat: target.lat, lon: target.lon });
    await act(async () => { vi.advanceTimersByTime(100); frameCallback(); });
    expect(errors).not.toHaveBeenCalled();
  }
}

describe('mission holds use motion over the ground', () => {
  it('blocks the rescue hoist in 20 kt wind even with zero forward speed', async () => {
    const target = await mountMission('coastal_rescue');
    Object.assign(hooks().getWeatherRef().current, { wind: 20, windDir: 0, turbulence: 0 });
    await missionFrames(target, 60);
    expect(latest.rescue.recovered).toBe(false);
    expect(latest.rescue.hoistTime || 0).toBe(0);
  });

  it('advances a stationary calm-air hoist and one with opposing airspeed and wind', async () => {
    const target = await mountMission('coastal_rescue');
    await missionFrames(target, 4);
    const calmProgress = latest.rescue.hoistTime;
    expect(calmProgress).toBeGreaterThan(0.1);
    Object.assign(hooks().flightRef.current, { speed: 20 / KTS_PER_FPS, heading: 0 });
    Object.assign(hooks().getWeatherRef().current, { wind: 20, windDir: 0, turbulence: 0 });
    await missionFrames(target, 4);
    expect(latest.rescue.hoistTime).toBeGreaterThan(calmProgress + 0.2);
  });

  it('holds mission progress and controls while the production loop is paused', async () => {
    const target = await mountMission('coastal_rescue');
    await missionFrames(target, 4);
    const progress = latest.rescue.hoistTime;
    const input = { ...hooks().controlsRef.current };
    hooks().pausedRef.current = true;
    await missionFrames(target, 10);
    expect(latest.rescue.hoistTime).toBe(progress);
    expect(hooks().controlsRef.current).toEqual(input);
  });

  it.each(['drone_survey', 'drone_powerline'])('blocks %s capture in wind and allows capture when forward motion cancels it', async id => {
    const target = await mountMission(id);
    Object.assign(hooks().getWeatherRef().current, { wind: 20, windDir: 0, turbulence: 0 });
    await missionFrames(target, 25);
    expect(latest.survey.capturedCount).toBe(0);
    expect(latest.survey.captureProgress).toBe(0);
    Object.assign(hooks().flightRef.current, { speed: 20 / KTS_PER_FPS, heading: 0 });
    await missionFrames(target, 25);
    expect(latest.survey.capturedCount).toBe(1);
    expect(latest.survey.photos[0].captured).toBe(true);
  });

  it('blocks a drone inspection hold while bank produces sideways speed above its limit', async () => {
    const target = await mountMission('drone_powerline');
    Object.assign(hooks().controlsRef.current, { bank: 25, throttle: 1 });
    // The production keyboard auto-centering would remove the sustained
    // bank, so reapply the held attitude each frame as a touch stick does.
    for (let frame = 0; frame < 20; frame++) {
      Object.assign(hooks().controlsRef.current, { bank: 25 });
      await missionFrames(target, 1);
    }
    expect(latest.survey.capturedCount).toBe(0);
    expect(latest.survey.captureProgress).toBe(0);
  });
});
