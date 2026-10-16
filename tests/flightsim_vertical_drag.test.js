import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS, physicsSnapshot;
const flight = (patch = {}) => ({ speed: 200, altitude: 10000, vsi: 0, heading: 90,
  lat: 43.646, lon: -70.309, fieldElev: 0, onGround: false, ...patch });

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  if (!FS) throw new Error('SkySchool test exports are unavailable');
});
beforeEach(() => {
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  const aircraft = FS.AIRCRAFT.find(item => item.id === 'cessna172');
  Object.assign(FS.Physics, { WING_AREA: aircraft.wingArea, WEIGHT: aircraft.weight,
    MAX_THRUST: aircraft.maxThrust, CL0: aircraft.cl0, CL_PER_AOA: aircraft.clPerAoa,
    CD0: aircraft.cd0, CD_INDUCED_K: aircraft.cdK, MAX_SPEED_KTS: aircraft.maxSpeed,
    IS_HELICOPTER: false, IS_DRONE: false, SPRINT_MODE: false });
});
afterEach(() => {
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
});

function pairedDrag(initial, patch = {}, dt = 1 / 60) {
  const input = { throttle: 0, pitch: Math.asin(initial.vsi / initial.speed) * 180 / Math.PI + 4,
    bank: 0, flaps: 0, brake: 0, ...patch };
  const originalState = { ...initial }, originalInput = { ...input };
  const low = FS.Physics.step(initial, dt, input);
  // Isolate parasite drag while keeping the actual lift polar, attitude,
  // power, configuration, and starting air-relative velocity identical.
  FS.Physics.CD0 += 0.3;
  const high = FS.Physics.step(initial, dt, input);
  expect(high.forces.drag).toBeGreaterThan(low.forces.drag);
  expect(high.forces.lift).toBeCloseTo(low.forces.lift, 10);
  expect(high.forces.thrust).toBeCloseTo(low.forces.thrust, 10);
  expect(high.aoa).toBeCloseTo(low.aoa, 10);
  expect(high.stalling).toBe(low.stalling);
  expect(high.speed).toBeLessThan(low.speed);
  expect(high.onGround).toBe(false);
  expect(low.onGround).toBe(false);
  expect(initial).toEqual(originalState);
  expect(input).toEqual(originalInput);
  for (const state of [low, high]) {
    for (const key of ['speed', 'altitude', 'vsi', 'heading', 'lat', 'lon']) expect(Number.isFinite(state[key]), key).toBe(true);
  }
  return { low, high };
}

describe('fixed-wing drag opposes the vertical component of the flight path', () => {
  it.each([[0, 0], [0.6, 35]])('reduces climb rate with throttle %s and bank %s while other forces stay fixed', (throttle, bank) => {
    const { low, high } = pairedDrag(flight({ vsi: 50 }), { throttle, bank });
    expect(high.vsi).toBeGreaterThan(0);
    expect(high.vsi).toBeLessThan(low.vsi);
    expect(high.altitude).toBeLessThan(low.altitude);
  });

  it.each([[0, 0], [0.6, 35]])('reduces descent magnitude with throttle %s and bank %s while other forces stay fixed', (throttle, bank) => {
    const { low, high } = pairedDrag(flight({ vsi: -50 }), { throttle, bank });
    expect(high.vsi).toBeLessThan(0);
    expect(high.vsi).toBeGreaterThan(low.vsi);
    expect(high.altitude).toBeGreaterThan(low.altitude);
  });

  it('opposes a descent even when the nose remains above the horizon', () => {
    const { low, high } = pairedDrag(flight({ vsi: -35 }), { pitch: 4, bank: 20 });
    expect(high.vsi).toBeLessThan(0);
    expect(high.vsi).toBeGreaterThan(low.vsi);
    expect(high.altitude).toBeGreaterThan(low.altitude);
  });

  it('opposes a climb even when the nose points below the horizon', () => {
    const { low, high } = pairedDrag(flight({ vsi: 35 }), { pitch: -2, bank: -20 });
    expect(high.vsi).toBeGreaterThan(0);
    expect(high.vsi).toBeLessThan(low.vsi);
    expect(high.altitude).toBeLessThan(low.altitude);
  });

  it.each([-5, 8])('has no vertical contribution on a horizontal flight path despite pitch %s', pitch => {
    const { low, high } = pairedDrag(flight(), { pitch, bank: 25, throttle: 0.6 });
    expect(high.vsi).toBe(low.vsi);
    expect(high.altitude).toBe(low.altitude);
  });
});
