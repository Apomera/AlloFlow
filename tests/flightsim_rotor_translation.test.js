import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const KTS_PER_FPS = 0.5924838;
const FEET_PER_NM = 6076.12;
const radians = degrees => degrees * Math.PI / 180;
let FS, snapshot;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
});
beforeEach(() => { snapshot = Object.getOwnPropertyDescriptors(FS.Physics); });
afterEach(() => {
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(snapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, snapshot);
});
function aircraft(id) { return FS.AIRCRAFT.find(item => item.id === id); }
function configure(id) {
  const ac = aircraft(id);
  Object.assign(FS.Physics, {
    WING_AREA: ac.wingArea, WEIGHT: ac.weight, MAX_THRUST: ac.maxThrust,
    CL0: ac.cl0, CL_PER_AOA: ac.clPerAoa, CD0: ac.cd0, CD_INDUCED_K: ac.cdK,
    IS_HELICOPTER: !!ac.isHelicopter, IS_DRONE: !!ac.isDrone,
    MAX_SPEED_KTS: ac.maxSpeed, AGL_CEILING: ac.isDrone ? 400 : null, SPRINT_MODE: false,
  });
  return ac;
}
const state = patch => ({ speed: 0, altitude: 100, fieldElev: 0, vsi: 0, heading: 0,
  lat: 43.646, lon: -70.309, onGround: false, ...patch });
const controls = patch => ({ throttle: 0.5, pitch: 0, bank: 0, yawRate: 0, brake: 0, ...patch });
const signedState = (forward, patch) => state({ speed: Math.abs(forward), rotorForwardFps: forward, ...patch });
function telemetry(current, input, weather, selected) {
  return FS.computeFlightTelemetry(current, input, weather, 0, 50, null, null, selected);
}
function horizontalDisplacement(previous, next, dt) {
  return { x: (next.lon - previous.lon) * 60 * Math.cos(radians(previous.lat)) * FEET_PER_NM / dt,
    z: -(next.lat - previous.lat) * 60 * FEET_PER_NM / dt };
}

describe('rotor longitudinal translation preserves direction', () => {
  it('uses legacy forward-speed states and safely falls back from missing signed samples', () => {
    expect(FS.getFlightRotorForwardSpeed(state({ speed: 18 }))).toBe(18);
    expect(FS.getFlightRotorForwardSpeed(state({ speed: 18, rotorForwardFps: NaN }))).toBe(18);
    expect(FS.getFlightRotorForwardSpeed(signedState(-18))).toBe(-18);
    expect(FS.getFlightRotorForwardSpeed(null)).toBe(0);
    expect(FS.getFlightRotorForwardSpeed({ speed: Infinity })).toBe(0);
    expect(FS.getFlightRotorForwardSpeed({ speed: NaN, rotorForwardFps: Infinity })).toBe(0);
  });

  it.each(['rescue_heli', 'drone'])('allows %s to translate both ways from hover with symmetric cyclic input', id => {
    configure(id);
    const initial = state();
    const forward = FS.Physics.step(initial, 0.1, controls({ pitch: 10 }));
    const backward = FS.Physics.step(initial, 0.1, controls({ pitch: -10 }));
    expect(forward.rotorForwardFps).toBeGreaterThan(0);
    expect(backward.rotorForwardFps).toBeLessThan(0);
    expect(backward.rotorForwardFps).toBeCloseTo(-forward.rotorForwardFps, 10);
    expect(backward.speed).toBeCloseTo(forward.speed, 10);
    expect(backward.speed).toBeGreaterThan(0);
    expect(backward.lat).toBeLessThan(initial.lat);
    expect(forward.lat).toBeGreaterThan(initial.lat);
    expect(backward.heading).toBe(initial.heading);
    expect(backward.forces.forward).toBeLessThan(0);
  });

  it.each(['rescue_heli', 'drone'])('lets %s continue through a stop into reverse rather than sticking at zero', id => {
    configure(id);
    let current = signedState(1);
    for (let i = 0; i < 60; i++) current = FS.Physics.step(current, 1 / 60, controls({ pitch: -10, throttle: 0.8 }));
    expect(current.rotorForwardFps).toBeLessThan(-1);
    expect(current.speed).toBeCloseTo(Math.abs(current.rotorForwardFps), 12);
    expect(current.heading).toBe(0);
  });

  it.each(['rescue_heli', 'drone'])('opposes %s drag to forward and reverse motion without adding energy', id => {
    configure(id);
    const input = controls({ throttle: 0, pitch: 0 });
    const forward = FS.Physics.step(signedState(30), 0.1, input);
    const backward = FS.Physics.step(signedState(-30), 0.1, input);
    expect(forward.rotorForwardFps).toBeGreaterThan(0);
    expect(forward.rotorForwardFps).toBeLessThan(30);
    expect(backward.rotorForwardFps).toBeLessThan(0);
    expect(backward.rotorForwardFps).toBeGreaterThan(-30);
    expect(backward.rotorForwardFps).toBeCloseTo(-forward.rotorForwardFps, 10);
    expect(backward.forces.drag).toBeCloseTo(forward.forces.drag, 12);
    expect(backward.forces.drag).toBeGreaterThan(0); // Force readout reports a magnitude.
    expect(forward.forces.forwardDrag).toBeGreaterThan(0);
    expect(backward.forces.forwardDrag).toBeCloseTo(-forward.forces.forwardDrag, 12);
  });

  it.each(['rescue_heli', 'drone'])('caps the %s forward and reverse components at the same speed envelope', id => {
    const selected = configure(id);
    const limit = selected.maxSpeed * 1.6878;
    for (const sign of [-1, 1]) {
      const next = FS.Physics.step(signedState(sign * limit * 2), 0, controls());
      expect(next.rotorForwardFps).toBeCloseTo(sign * limit, 10);
      expect(next.speed).toBeCloseTo(limit, 10);
    }
  });

  it.each(['rescue_heli', 'drone'])('brings %s ground motion to rest in either direction and holds parked controls', id => {
    configure(id);
    const input = controls({ throttle: 0.25, pitch: -15, bank: 20, yawRate: 20 });
    for (const sign of [-1, 1]) {
      const initial = signedState(sign * 12, { altitude: 0, onGround: true, heading: 35 });
      const rolling = FS.Physics.step(initial, 0.1, input);
      expect(Math.sign(rolling.rotorForwardFps)).toBe(sign);
      expect(rolling.speed).toBeLessThan(12);
      const stopped = FS.Physics.step(rolling, 2, input);
      expect(stopped.speed).toBe(0);
      expect(stopped.rotorForwardFps).toBe(0);
      expect(stopped.heading).toBe(35);
      const held = FS.Physics.step(stopped, 1, input);
      expect(held.lat).toBe(stopped.lat); expect(held.lon).toBe(stopped.lon);
      expect(held.heading).toBe(35); expect(held.forces.forward).toBe(0);
    }
  });

  it.each(['rescue_heli', 'drone'])('keeps %s yaw input direction independent of reverse translation', id => {
    const selected = configure(id);
    const input = controls({ yawRate: 15, throttle: selected.weight / selected.maxThrust });
    const next = FS.Physics.step(signedState(-15, { heading: 350 }), 1, input);
    expect(next.heading).toBeCloseTo(5, 10);
    expect(next.rotorForwardFps).toBeLessThan(0);
    const vector = FS.getFlightVelocity(next, input, {}, 0, selected);
    expect(vector.x).toBeLessThan(0); expect(vector.z).toBeGreaterThan(0);
    const displacement = horizontalDisplacement(signedState(-15, { heading: 350 }), next, 1);
    expect(displacement.x).toBeCloseTo(vector.x, 5); expect(displacement.z).toBeCloseTo(vector.z, 5);
  });

  it.each(['rescue_heli', 'drone'])('gives comparable %s reverse motion at 30 and 120 frames per second', id => {
    const selected = configure(id);
    const input = controls({ pitch: -8, throttle: selected.weight / selected.maxThrust / Math.cos(radians(8)) });
    const samples = [30, 120].map(hz => {
      let current = state();
      for (let i = 0; i < hz * 2; i++) current = FS.Physics.step(current, 1 / hz, input);
      return current;
    });
    expect(samples[0].rotorForwardFps).toBeLessThan(0); expect(samples[1].rotorForwardFps).toBeLessThan(0);
    expect(Math.abs(samples[0].rotorForwardFps - samples[1].rotorForwardFps)).toBeLessThan(0.08);
  });
});

describe('rotor motion, telemetry and contact evidence agree', () => {
  it.each(['rescue_heli', 'drone'])('keeps %s airspeed magnitudes positive while reverse ground track is aft', id => {
    const selected = configure(id);
    const current = signedState(-30, { heading: 90, vsi: 4 });
    const input = controls();
    const measured = telemetry(current, input, {}, selected);
    expect(measured.groundVelocity.x).toBeCloseTo(-30, 10);
    expect(measured.tasKts).toBeCloseTo(Math.hypot(30, 4) * KTS_PER_FPS, 10);
    expect(measured.iasKts).toBeGreaterThan(0); expect(measured.gsKts).toBeGreaterThan(0);
    expect(measured.trackDeg).toBeCloseTo(270, 10);
    expect(Math.abs(measured.driftAngleDeg)).toBeCloseTo(180, 10);
    expect(FS.flightEvidenceSample(current, input, 2, selected).spd).toBe(Math.round(30 * KTS_PER_FPS));
  });

  it.each(['rescue_heli', 'drone'])('matches %s reverse plus bank translation and wind to shared ground velocity', id => {
    const selected = configure(id);
    const initial = signedState(-20, { heading: 37, vsi: 2 });
    const input = controls({ pitch: -5, bank: 20, throttle: 0.7, yawRate: -10 });
    const dt = 0.1;
    const integrated = FS.Physics.step(initial, dt, input);
    const airDisplacement = horizontalDisplacement(initial, integrated, dt);
    const airVector = FS.getFlightVelocity(integrated, input, {}, 0, selected);
    expect(airDisplacement.x).toBeCloseTo(airVector.x, 5);
    expect(airDisplacement.z).toBeCloseTo(airVector.z, 5);
    const wind = { wind: 12, windDir: 270 };
    const ground = FS.getFlightVelocity(integrated, input, wind, 0, selected);
    expect(ground.x).toBeCloseTo(airDisplacement.x + 12 * 1.68781, 5);
    expect(ground.z).toBeCloseTo(airDisplacement.z, 5);
    expect(telemetry(integrated, input, wind, selected).gsKts).toBeCloseTo(Math.hypot(ground.x, ground.z) * KTS_PER_FPS, 10);
  });

  it.each(['rescue_heli', 'drone'])('retains the %s signed impact component before floor friction', id => {
    const selected = configure(id);
    const input = controls({ throttle: 0 });
    const next = FS.Physics.step(signedState(-20, { altitude: 0.01, vsi: -8 }), 0.1, input);
    expect(next.onGround).toBe(true);
    expect(next.groundContact.rotorForwardFps).toBeLessThan(0);
    expect(next.groundContact.speed).toBeCloseTo(Math.abs(next.groundContact.rotorForwardFps), 12);
    expect(Math.abs(next.groundContact.rotorForwardFps)).toBeGreaterThan(Math.abs(next.rotorForwardFps));
    const evidence = FS.getFlightContactEvidence(next, input, {}, 0, selected);
    expect(evidence.groundSpeedKts).toBeCloseTo(next.groundContact.speed * KTS_PER_FPS, 10);
    expect(evidence.descentFpm).toBeCloseTo(-next.groundContact.vsi * 60, 10);
  });

  it('restores reverse impact direction before composing wind after a stopped rollout', () => {
    const selected = configure('drone');
    const impact = signedState(0, { altitude: 0, onGround: true,
      groundContact: { speed: 20, rotorForwardFps: -20, vsi: -3 } });
    const evidence = FS.getFlightContactEvidence(impact, controls(), { wind: 20 / 1.68781, windDir: 180 }, 0, selected);
    expect(evidence.groundSpeedKts).toBeCloseTo(0, 10);
    expect(evidence.descentFpm).toBe(180);
    const legacyImpact = { ...impact, groundContact: { speed: 20, vsi: -3 } };
    const legacy = FS.getFlightContactEvidence(legacyImpact, controls(), { wind: 20 / 1.68781, windDir: 0 }, 0, selected);
    expect(legacy.groundSpeedKts).toBeCloseTo(0, 10);
  });

  it('retains reverse component when rising terrain resolves contact', () => {
    const next = FS.reconcileGroundContact(signedState(-12, { altitude: 100, fieldElev: 0, vsi: -2 }), 110);
    expect(next.groundContact).toMatchObject({ speed: 12, rotorForwardFps: -12, vsi: -2 });
    expect(next.onGround).toBe(true);
    const evidence = FS.getFlightContactEvidence(next, controls(), {}, 0, aircraft('rescue_heli'));
    expect(evidence.groundSpeedKts).toBeCloseTo(12 * KTS_PER_FPS, 10);
  });

  it.each(['rescue_heli', 'drone'])('commands %s speed assistance to brake either direction toward hover', id => {
    const selected = aircraft(id);
    const autopilot = { spd: true, tgtSpd: 0 };
    const forward = FS.getAutopilotFlightControls(signedState(10), controls(), autopilot, selected, 0.1);
    const backward = FS.getAutopilotFlightControls(signedState(-10), controls(), autopilot, selected, 0.1);
    expect(forward.pitch).toBeLessThan(0); expect(backward.pitch).toBeGreaterThan(0);
    expect(backward.pitch).toBeCloseTo(-forward.pitch, 10);
    expect(FS.getAutopilotFlightControls(signedState(-10), controls(), autopilot, selected, 0)).toEqual(controls());
  });

  it('projects reverse ground motion behind the cockpit rather than showing a forward flight cue', () => {
    const selected = aircraft('drone');
    const current = signedState(-20, { heading: 37 });
    const vector = FS.getFlightVelocity(current, controls(), {}, 0, selected);
    expect(FS.projectFlightDirection(vector, FS.getFlightViewBasis(37, 0, 0), 1280, 720)).toBeNull();
    const rear = FS.projectFlightDirection(vector, FS.getFlightViewBasis(217, 0, 0), 1280, 720);
    expect(rear.x).toBeCloseTo(640, 10); expect(rear.y).toBeCloseTo(360, 10);
  });

  it('keeps fixed-wing physics and telemetry independent of a rotor component', () => {
    const selected = configure('cessna172');
    const current = state({ speed: 100, vsi: 2, heading: 37 });
    const input = controls({ pitch: 5, bank: 10 });
    const staleRotor = { ...current, rotorForwardFps: -100 };
    expect(FS.Physics.step(staleRotor, 0.1, input)).toEqual(FS.Physics.step(current, 0.1, input));
    expect(telemetry(staleRotor, input, { wind: 12, windDir: 270 }, selected)).toEqual(telemetry(current, input, { wind: 12, windDir: 270 }, selected));
  });
});


describe('signed force arrow geometry', () => {
  it('points reverse thrust aft and reverse aerodynamic drag forward with positive lengths', () => {
    const thrust = FS.getFlightForceArrow(-80, 0);
    const drag = FS.getFlightForceArrow(-30, 180);
    expect(thrust.magnitude).toBe(80); expect(thrust.length).toBe(12);
    expect(Math.cos(thrust.radians)).toBeCloseTo(-1, 12);
    expect(drag.magnitude).toBe(30); expect(drag.length).toBe(4.5);
    expect(Math.cos(drag.radians)).toBeCloseTo(1, 12);
  });
  it('caps either sign of large force at the same length and preserves ordinary force direction', () => {
    expect(FS.getFlightForceArrow(800, -90).length).toBe(60);
    expect(FS.getFlightForceArrow(-800, -90).length).toBe(60);
    expect(Math.sin(FS.getFlightForceArrow(80, -90).radians)).toBeCloseTo(-1, 12);
    expect(Math.sin(FS.getFlightForceArrow(-80, -90).radians)).toBeCloseTo(1, 12);
  });
  it('returns a finite zero-length arrow for missing or invalid force', () => {
    for (const force of [0, undefined, NaN, Infinity]) {
      const vector = FS.getFlightForceArrow(force, 180);
      expect(vector.magnitude).toBe(0); expect(vector.length).toBe(0);
      expect(Number.isFinite(vector.radians)).toBe(true);
    }
  });
});


describe('surface optical flow follows actual ground motion', () => {
  it.each(['rescue_heli', 'drone'])('moves %s runway flow in the opposite direction when reversing', id => {
    const initial = Object.freeze({ rwy: 0.5, px: 500 });
    const selected = aircraft(id);
    const forward = FS.advanceFlightSurfaceScroll(initial, signedState(10), controls(), {}, 0, selected, 0.1);
    const reverse = FS.advanceFlightSurfaceScroll(initial, signedState(-10), controls(), {}, 0, selected, 0.1);
    expect(forward.rwy).toBeGreaterThan(initial.rwy); expect(reverse.rwy).toBeLessThan(initial.rwy);
    expect(forward.rwy - initial.rwy).toBeCloseTo(initial.rwy - reverse.rwy, 10);
    expect(forward.px - initial.px).toBeCloseTo(initial.px - reverse.px, 8);
    expect(initial).toEqual({ rwy: 0.5, px: 500 });
  });
  it('holds a parked runway without fabricated idle motion or surface wind drift', () => {
    const initial = { rwy: 0.5, px: 500 };
    const parked = signedState(0, { onGround: true, altitude: 0 });
    for (const id of ['cessna172', 'rescue_heli', 'drone']) {
      expect(FS.advanceFlightSurfaceScroll(initial, parked, controls(), { wind: 20, windDir: 180 }, 0, aircraft(id), 1)).toEqual(initial);
    }
  });
  it('holds both phases while paused and wraps reverse phases into their positive ranges', () => {
    const initial = { rwy: 0.01, px: 0.01 };
    const selected = aircraft('drone');
    expect(FS.advanceFlightSurfaceScroll(initial, signedState(-10), controls(), {}, 0, selected, 0)).toEqual(initial);
    const reversed = FS.advanceFlightSurfaceScroll(initial, signedState(-10), controls(), {}, 0, selected, 0.1);
    expect(reversed.rwy).toBeCloseTo(0.965, 10);
    expect(reversed.px).toBeGreaterThan(99999); expect(reversed.px).toBeLessThan(100000);
  });
  it('keeps longitudinal flow still when opposing wind cancels reverse flight or bank only strafes', () => {
    const initial = { rwy: 0.5, px: 500 }, selected = aircraft('drone');
    const cancelled = FS.advanceFlightSurfaceScroll(initial, signedState(-20), controls(), { wind: 20 / 1.68781, windDir: 180 }, 0, selected, 1);
    expect(cancelled.rwy).toBeCloseTo(initial.rwy, 10); expect(cancelled.px).toBeCloseTo(initial.px, 8);
    const strafing = FS.advanceFlightSurfaceScroll(initial, signedState(0, { heading: 37 }), controls({ bank: 25 }), {}, 0, selected, 1);
    expect(strafing.rwy).toBeCloseTo(initial.rwy, 10); expect(strafing.px).toBeCloseTo(initial.px, 8);
  });
});
