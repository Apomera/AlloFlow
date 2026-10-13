import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;
let physicsSnapshot;
const KTS_PER_FPS = 0.5924838;
const FPS_PER_WIND_KT = 1.68781;
const FEET_PER_NM = 6076.12;
const radians = (degrees) => degrees * Math.PI / 180;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  if (!FS) throw new Error('Flight simulator test exports are unavailable');
});

beforeEach(() => {
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
});

afterEach(() => {
  // Restore added flags as well as existing properties: the sim shares this
  // mutable model among every aircraft and other suites load its defaults.
  for (const key of Reflect.ownKeys(FS.Physics)) {
    if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  }
  Object.defineProperties(FS.Physics, physicsSnapshot);
});

function aircraft(id) {
  const selected = FS.AIRCRAFT.find((candidate) => candidate.id === id);
  if (!selected) throw new Error('Unknown test aircraft: ' + id);
  return selected;
}

function configureAircraft(id) {
  const selected = aircraft(id);
  Object.assign(FS.Physics, {
    WING_AREA: selected.wingArea,
    WEIGHT: selected.weight,
    MAX_THRUST: selected.maxThrust,
    CL0: selected.cl0,
    CL_PER_AOA: selected.clPerAoa,
    CD0: selected.cd0,
    CD_INDUCED_K: selected.cdK,
    IS_HELICOPTER: !!selected.isHelicopter,
    IS_DRONE: !!selected.isDrone,
    MAX_SPEED_KTS: selected.maxSpeed,
    AGL_CEILING: selected.isDrone ? 400 : null,
    SPRINT_MODE: false,
  });
  return selected;
}

function flightState(overrides = {}) {
  return {
    speed: 100, altitude: 1000, vsi: 0, heading: 0,
    lat: 43.646, lon: -70.309, fieldElev: 0,
    aoa: 0, stalling: false, onGround: false,
    ...overrides,
  };
}

function telemetry(state, controls = {}, weather = {}, jetKts = 0, selected) {
  return FS.computeFlightTelemetry(state, controls, weather, jetKts, 50, null, null, selected);
}

function expectVector(actual, expected, precision = 8) {
  for (const axis of ['x', 'y', 'z']) {
    expect(actual[axis], axis).toBeCloseTo(expected[axis], precision);
  }
}

function displacementVelocity(previous, next, dt) {
  return {
    x: (next.lon - previous.lon) * 60 * Math.cos(radians(previous.lat)) * FEET_PER_NM / dt,
    y: (next.altitude - previous.altitude) / dt,
    z: -(next.lat - previous.lat) * 60 * FEET_PER_NM / dt,
  };
}

describe('flight telemetry velocity and track', () => {
  it('points the drift cue toward the actual ground track, including headwind in the angle', () => {
    const state = flightState({ speed: 200, heading: 0 });
    const eastWind = telemetry(state, {}, { wind: 20, windDir: 90 }, 0, aircraft('cessna172'));
    const westWind = telemetry(state, {}, { wind: 20, windDir: 270 }, 0, aircraft('cessna172'));
    expect(eastWind.driftAngleDeg).toBeCloseTo(Math.atan2(-20 * FPS_PER_WIND_KT, 200) * 180 / Math.PI, 8);
    expect(westWind.driftAngleDeg).toBeCloseTo(-eastWind.driftAngleDeg, 8);
    const diagonal = telemetry(state, {}, { wind: 20, windDir: 45 }, 0, aircraft('cessna172'));
    const component = 20 * FPS_PER_WIND_KT / Math.sqrt(2);
    expect(diagonal.driftAngleDeg).toBeCloseTo(Math.atan2(-component, 200 - component) * 180 / Math.PI, 8);
    expect(telemetry(flightState({ speed: 0, vsi: 0 })).driftAngleDeg).toBeNull();
  });

  it('uses the horizontal component of TAS in a climb, then adds crosswind and eastbound jet drift', () => {
    const state = flightState({ speed: 100, vsi: 60 });
    const east = 35 * FPS_PER_WIND_KT;
    const actual = telemetry(state, { bank: 30 }, { wind: 20, windDir: 270 }, 15, aircraft('cessna172'));
    expectVector(actual.groundVelocity, { x: east, y: 60, z: -80 });
    expect(actual.tasKts).toBeCloseTo(100 * KTS_PER_FPS, 8);
    expect(actual.gsKts).toBeCloseTo(Math.hypot(east, 80) * KTS_PER_FPS, 8);
    expect(actual.trackDeg).toBeCloseTo(Math.atan2(east, 80) * 180 / Math.PI, 8);
  });

  it('keeps air flight-path angle independent of wind while reporting the ground flight-path angle', () => {
    const state = flightState({ speed: 100, vsi: 60 });
    const calm = telemetry(state, {}, {}, 0, aircraft('cessna172'));
    const tailwind = telemetry(state, {}, { wind: 30, windDir: 180 }, 0, aircraft('cessna172'));
    const airAngle = Math.atan2(60, 80) * 180 / Math.PI;
    expect(calm.flightPathAngleDeg).toBeCloseTo(airAngle, 8);
    expect(calm.groundFlightPathAngleDeg).toBeCloseTo(airAngle, 8);
    expect(tailwind.flightPathAngleDeg).toBeCloseTo(airAngle, 8);
    expect(tailwind.groundFlightPathAngleDeg).toBeCloseTo(
      Math.atan2(60, 80 + 30 * FPS_PER_WIND_KT) * 180 / Math.PI, 8);
    expect(tailwind.groundFlightPathAngleDeg).toBeLessThan(tailwind.flightPathAngleDeg);
  });

  it('keeps the existing seven-argument call compatible with fixed-wing motion', () => {
    const state = flightState({ speed: 100, vsi: -60, heading: 270 });
    const legacy = FS.computeFlightTelemetry(state, {}, {}, 0, 50, null, null);
    const explicit = telemetry(state, {}, {}, 0, aircraft('cessna172'));
    expect(legacy).toEqual(explicit);
    expectVector(legacy.groundVelocity, { x: -80, y: -60, z: 0 });
    expect(legacy.trackDeg).toBeCloseTo(270, 8);
  });

  it.each([
    ['rescue_heli', 9],
    ['drone', 15],
  ])('includes %s lateral drift and vertical speed in rotor TAS', (id, lateralFps) => {
    const selected = aircraft(id);
    const state = flightState({ speed: 30, vsi: 40, heading: 90, altitude: 0 });
    const actual = telemetry(state, { throttle: 0.6, bank: 30 }, { wind: 20, windDir: 180 }, 10, selected);
    expectVector(actual.groundVelocity, {
      x: 30 + 10 * FPS_PER_WIND_KT, y: 40, z: lateralFps - 20 * FPS_PER_WIND_KT,
    });
    const horizontalAir = Math.hypot(30, lateralFps);
    expect(actual.tasKts).toBeCloseTo(Math.hypot(horizontalAir, 40) * KTS_PER_FPS, 8);
    expect(actual.iasKts).toBeCloseTo(actual.tasKts, 8);
    expect(actual.flightPathAngleDeg).toBeCloseTo(Math.atan2(40, horizontalAir) * 180 / Math.PI, 8);
    expect(actual.stallIasKts).toBeNull();
  });

  it('reports a hover strafe as ground motion even when forward speed is zero', () => {
    const actual = telemetry(flightState({ speed: 0, vsi: 0 }),
      { throttle: 0.5, bank: 30 }, {}, 0, aircraft('drone'));
    expectVector(actual.groundVelocity, { x: 12.5, y: 0, z: 0 });
    expect(actual.gsKts).toBeCloseTo(12.5 * KTS_PER_FPS, 8);
    expect(actual.tasKts).toBeCloseTo(actual.gsKts, 8);
    expect(actual.trackDeg).toBeCloseTo(90, 8);
  });

  it('reverses ground track when a headwind exceeds forward airspeed', () => {
    const actual = telemetry(flightState({ speed: 10 }), {}, { wind: 20, windDir: 0 }, 0, aircraft('cessna172'));
    expect(actual.groundVelocity.z).toBeGreaterThan(0);
    expect(actual.trackDeg).toBeCloseTo(180, 8);
    expect(actual.gsKts).toBeCloseTo((20 * FPS_PER_WIND_KT - 10) * KTS_PER_FPS, 8);
    expect(actual.tasKts).toBeCloseTo(10 * KTS_PER_FPS, 8);
  });

  it.each(['cessna172', 'rescue_heli', 'drone'])('ignores wind, jet, and lateral bank drift during %s ground motion', (id) => {
    const state = flightState({ onGround: true, speed: 30, altitude: 0, heading: 90 });
    const actual = telemetry(state, { throttle: 0.8, bank: 45 }, { wind: 80, windDir: 270 }, 150, aircraft(id));
    expectVector(actual.groundVelocity, { x: 30, y: 0, z: 0 });
    expect(actual.gsKts).toBeCloseTo(30 * KTS_PER_FPS, 8);
    expect(actual.trackDeg).toBeCloseTo(90, 8);
  });

  it('has no track for a parked aircraft or imperceptible motion', () => {
    const parked = telemetry(flightState({ speed: 0, onGround: true }), {}, { wind: 30, windDir: 90 }, 100);
    expect(parked.gsKts).toBe(0);
    expect(parked.trackDeg).toBeNull();
    const creeping = telemetry(flightState({ speed: 0.05 }), {}, {}, 0);
    expect(creeping.gsKts).toBeGreaterThan(0);
    expect(creeping.trackDeg).toBeNull();
  });
});

describe('destination navigation uses closing speed', () => {
  const origin = { lat: 0, lon: 0 };
  const destination = { lat: 1, lon: 0 };

  function navigation(eastKts, northKts) {
    const trackDeg = ((Math.atan2(eastKts, northKts) * 180 / Math.PI) + 360) % 360;
    return FS.getFlightNavigation(origin, destination, {
      groundVelocity: { x: eastKts / KTS_PER_FPS, y: 100, z: -northKts / KTS_PER_FPS },
      gsKts: Math.hypot(eastKts, northKts), trackDeg,
    });
  }

  it('uses only motion toward the destination for ETE despite a large cross-track component', () => {
    const actual = navigation(160, 120);
    expect(actual.groundSpeedKts).toBe(200);
    expect(actual.closingSpeedKts).toBeCloseTo(120, 8);
    expect(actual.eteMinutes).toBeCloseTo(actual.distanceNm / 120 * 60, 8);
    expect(actual.eteMinutes).toBeGreaterThan(actual.distanceNm / actual.groundSpeedKts * 60);
    expect(actual.bearingDeg).toBeCloseTo(0, 8);
    expect(actual.trackErrorDeg).toBeCloseTo(-Math.atan2(160, 120) * 180 / Math.PI, 8);
  });

  it.each([
    ['flying away', 0, -120],
    ['flying perpendicular', 120, 0],
    ['stationary', 0, 0],
    ['closing below one knot', 50, 0.5],
    ['closing at exactly one knot', 50, 1],
  ])('has no ETE while %s', (_label, eastKts, northKts) => {
    const actual = navigation(eastKts, northKts);
    expect(actual.closingSpeedKts).toBeCloseTo(northKts, 8);
    expect(actual.eteMinutes).toBeNull();
  });

  it('reports ETE once closure exceeds one knot', () => {
    const actual = navigation(50, 1.01);
    expect(actual.eteMinutes).toBeCloseTo(actual.distanceNm / 1.01 * 60, 8);
  });

  it('returns no navigation for absent destinations, vectors, or invalid coordinates', () => {
    const valid = { groundVelocity: { x: 0, y: 0, z: -100 }, gsKts: 100 * KTS_PER_FPS, trackDeg: 0 };
    expect(FS.getFlightNavigation(origin, null, valid)).toBeNull();
    expect(FS.getFlightNavigation(origin, destination, {})).toBeNull();
    expect(FS.getFlightNavigation({ lat: Number.NaN, lon: 0 }, destination, valid)).toBeNull();
    expect(FS.getFlightNavigation(origin, { lat: 1, lon: Infinity }, valid)).toBeNull();
  });
});

describe('modeled load factor', () => {
  it('reports one G while grounded even without valid force samples', () => {
    expect(FS.getFlightLoadFactor({ onGround: true }, aircraft('drone'))).toBe(1);
    expect(FS.getFlightLoadFactor({ onGround: true, forces: { normal: Infinity, weight: 0 } })).toBe(1);
  });

  it.each(['cessna172', 'rescue_heli', 'drone'])('prefers modeled normal force over other force components for %s', (id) => {
    const selected = aircraft(id);
    const forces = { normal: selected.weight * 2.5, lift: selected.weight * 0.3,
      thrust: selected.weight * 0.8, weight: selected.weight };
    expect(FS.getFlightLoadFactor({ onGround: false, forces }, selected)).toBeCloseTo(2.5, 8);
    expect(FS.getFlightLoadFactor({ forces: { ...forces, normal: 0 } }, selected)).toBe(0);
  });

  it.each(['rescue_heli', 'drone'])('falls back to rotor-axis thrust for %s', (id) => {
    const selected = aircraft(id);
    const forces = { thrust: selected.weight * 1.2, lift: selected.weight * 0.2, weight: selected.weight };
    expect(FS.getFlightLoadFactor({ forces }, selected)).toBeCloseTo(1.2, 8);
  });

  it('falls back to fixed-wing lift and preserves signed normal load', () => {
    const selected = aircraft('cessna172');
    expect(FS.getFlightLoadFactor({ forces: { lift: 5100, thrust: 400, weight: 2550 } }, selected)).toBe(2);
    expect(FS.getFlightLoadFactor({ forces: { normal: -1275, lift: 5100, weight: 2550 } }, selected)).toBe(-0.5);
  });

  it('returns unknown load when the relevant force or positive finite weight is missing', () => {
    for (const forces of [{}, { normal: 10 }, { normal: 10, weight: 0 },
      { normal: 10, weight: -2 }, { normal: 10, weight: Number.NaN },
      { normal: 10, weight: Infinity }, { normal: Infinity, weight: 2 }]) {
      expect(FS.getFlightLoadFactor({ forces }, aircraft('cessna172'))).toBeNull();
    }
    expect(FS.getFlightLoadFactor({ forces: { lift: 2, weight: 2 } }, aircraft('drone'))).toBeNull();
    expect(FS.getFlightLoadFactor({ forces: { thrust: 2, weight: 2 } }, aircraft('cessna172'))).toBeNull();
  });
});

describe('elapsed-time load display response', () => {
  it('moves ten percent toward the new load in a single 60 Hz frame', () => {
    expect(FS.advanceFlightLoad(1, 3, 1 / 60)).toBeCloseTo(1.2, 12);
  });

  it('settles to the same load after the same elapsed time at 30, 60, and 144 Hz', () => {
    const samples = [30, 60, 144].map((fps) => {
      let displayed = 1;
      for (let frame = 0; frame < fps; frame++) displayed = FS.advanceFlightLoad(displayed, 3, 1 / fps);
      return displayed;
    });
    for (const sample of samples) expect(sample).toBeCloseTo(3 - 2 * Math.pow(0.9, 60), 12);
  });

  it('holds during paused or negative elapsed time and initializes an unavailable prior sample', () => {
    expect(FS.advanceFlightLoad(1.5, 3, 0)).toBe(1.5);
    expect(FS.advanceFlightLoad(1.5, 3, -1)).toBe(1.5);
    expect(FS.advanceFlightLoad(null, 2, 0)).toBe(2);
    expect(FS.advanceFlightLoad(Number.NaN, 2, 1 / 60)).toBe(2);
    expect(FS.advanceFlightLoad(1, null, 1 / 60)).toBeNull();
    expect(FS.advanceFlightLoad(1, Infinity, 1 / 60)).toBeNull();
  });
});

describe('aircraft motion and force telemetry agree', () => {
  it('balances the actual two-pound drone at half of its four-pound maximum thrust', () => {
    const selected = configureAircraft('drone');
    expect(selected.weight).toBe(2);
    expect(selected.maxThrust).toBe(4);
    const state = flightState({ speed: 0, altitude: 100 });
    const controls = { throttle: 0.5, pitch: 0, bank: 0 };
    const next = FS.Physics.step(state, 1, controls);
    expect(next.forces.thrust).toBe(2);
    expect(next.forces.lift).toBe(2);
    expect(next.forces.normal).toBe(2);
    expect(next.forces.weight).toBe(2);
    expect(next.vsi).toBe(0);
    expect(next.altitude).toBe(100);
    expect(next.speed).toBe(0);
    expect(next.onGround).toBe(false);
    expect(telemetry(next, controls, {}, 0, selected).loadFactor).toBe(1);
    const fullPower = FS.Physics.step(state, 0, { ...controls, throttle: 1 });
    expect(fullPower.forces.thrust).toBe(4);
    expect(FS.getFlightLoadFactor(fullPower, selected)).toBe(2);
  });

  it.each(['rescue_heli', 'drone'])('projects %s rotor thrust through both pitch and bank', (id) => {
    const selected = configureAircraft(id);
    const state = flightState({ speed: 0, altitude: 100 });
    const controls = { throttle: 0.8, pitch: 25, bank: 60 };
    const levelBank = FS.Physics.step(state, 0, { ...controls, bank: 0 });
    const banked = FS.Physics.step(state, 0, controls);
    const thrust = selected.maxThrust * controls.throttle;
    expect(banked.forces.thrust).toBeCloseTo(thrust, 8);
    expect(banked.forces.lift).toBeCloseTo(thrust * Math.cos(radians(25)) * Math.cos(radians(60)), 8);
    expect(banked.forces.forward).toBeCloseTo(thrust * Math.sin(radians(25)) * Math.cos(radians(60)), 8);
    expect(banked.forces.lift / levelBank.forces.lift).toBeCloseTo(0.5, 8);
    expect(banked.forces.forward / levelBank.forces.forward).toBeCloseTo(0.5, 8);
    expect(FS.getFlightLoadFactor(banked, selected)).toBeCloseTo(thrust / selected.weight, 8);
  });

  it.each(['cessna172', 'rescue_heli', 'drone'])('matches actual %s position integration to the shared velocity vector in calm air', (id) => {
    const selected = configureAircraft(id);
    const state = flightState({ speed: id === 'drone' ? 30 : 120,
      vsi: 2, altitude: 100, heading: 37 });
    const controls = { throttle: 0.7, pitch: 10, bank: 25, yawRate: 15 };
    const dt = 0.1;
    const next = FS.Physics.step(state, dt, controls);
    expect(next.onGround).toBe(false);
    expectVector(displacementVelocity(state, next, dt),
      FS.getFlightVelocity(next, controls, {}, 0, selected), 5);
  });

  it.each(['rescue_heli', 'drone'])('prevents bank strafe during %s ground rollout', (id) => {
    const selected = configureAircraft(id);
    const state = flightState({ speed: 30, altitude: 0, vsi: 0, heading: 30, onGround: true });
    const controls = { throttle: 0.25, pitch: 0, bank: 40 };
    const dt = 0.1;
    const next = FS.Physics.step(state, dt, controls);
    expect(next.onGround).toBe(true);
    expect(next.speed).toBeGreaterThan(0);
    const velocity = displacementVelocity(state, next, dt);
    const lateral = velocity.x * Math.cos(radians(next.heading)) + velocity.z * Math.sin(radians(next.heading));
    expect(lateral).toBeCloseTo(0, 5);
    expectVector(velocity, FS.getFlightVelocity(next, controls, { wind: 50, windDir: 0 }, 100, selected), 5);
  });
});
