import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS, physicsSnapshot;
const radians = degrees => degrees * Math.PI / 180;
const headingChange = (next, previous) => ((next - previous + 540) % 360) - 180;
const controls = (patch = {}) => ({ throttle: 0, pitch: 0, bank: 30, flaps: 0, brake: 0, ...patch });
const flight = (patch = {}) => ({ speed: 200, altitude: 1000, vsi: 0, heading: 90,
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
  const selected = FS.AIRCRAFT.find(aircraft => aircraft.id === 'cessna172');
  Object.assign(FS.Physics, { WING_AREA: selected.wingArea, WEIGHT: selected.weight,
    MAX_THRUST: selected.maxThrust, CL0: selected.cl0, CL_PER_AOA: selected.clPerAoa,
    CD0: selected.cd0, CD_INDUCED_K: selected.cdK, MAX_SPEED_KTS: selected.maxSpeed,
    IS_HELICOPTER: false, IS_DRONE: false, SPRINT_MODE: false });
});
afterEach(() => {
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
});

describe('fixed-wing turns follow signed lateral lift', () => {
  it('does not invent a turn when the wing is unloaded despite a visible bank', () => {
    const start = flight();
    const zeroLiftPitch = -FS.Physics.CL0 / FS.Physics.CL_PER_AOA;
    for (const bank of [-45, 45]) {
      const next = FS.Physics.step(start, 0.01, controls({ pitch: zeroLiftPitch, bank }));
      expect(Math.abs(next.forces.lift)).toBeLessThan(1e-8);
      expect(next.heading).toBeCloseTo(start.heading, 10);
      expect(next.vsi).toBeLessThan(0);
    }
  });

  it('turns opposite the bank when the same model wing produces negative lift', () => {
    const start = flight();
    const rightBank = FS.Physics.step(start, 0.01, controls({ pitch: -5, bank: 45 }));
    const leftBank = FS.Physics.step(start, 0.01, controls({ pitch: -5, bank: -45 }));
    expect(rightBank.forces.lift).toBeLessThan(0);
    expect(leftBank.forces.lift).toBeCloseTo(rightBank.forces.lift, 10);
    expect(headingChange(rightBank.heading, start.heading)).toBeLessThan(0);
    expect(headingChange(leftBank.heading, start.heading)).toBeGreaterThan(0);
    expect(headingChange(rightBank.heading, start.heading)).toBeCloseTo(-headingChange(leftBank.heading, start.heading), 10);
  });

  it('retains a smaller, nonzero turn when separated flow reduces positive lift', () => {
    const start = flight();
    const attached = FS.Physics.step(start, 0.001, controls({ pitch: 14, bank: 30 }));
    const stalled = FS.Physics.step(start, 0.001, controls({ pitch: 25, bank: 30 }));
    expect(attached.stalling).toBe(false);
    expect(stalled.stalling).toBe(true);
    expect(stalled.forces.lift).toBeGreaterThan(0);
    expect(stalled.forces.lift).toBeLessThan(attached.forces.lift);
    const attachedTurn = headingChange(attached.heading, start.heading);
    const stalledTurn = headingChange(stalled.heading, start.heading);
    expect(stalledTurn).toBeGreaterThan(0);
    expect(stalledTurn).toBeLessThan(attachedTurn * 0.6);
  });

  it.each([-45, -20, 20, 45])('recovers the steady level coordinated-turn special case at %s degrees', bank => {
    const speed = 200, weight = 2550;
    const levelLift = weight / Math.cos(radians(bank));
    const expected = FS.Physics.G * Math.tan(radians(bank)) / speed * 180 / Math.PI;
    expect(FS.getFlightAirborneTurnRate(speed, 0, bank, levelLift, weight)).toBeCloseTo(expected, 10);
  });

  it('uses horizontal airspeed for heading curvature during a climb', () => {
    // The same lateral force bends a slower horizontal track more quickly.
    const weight = 2550, lift = weight, bank = 30;
    const level = FS.getFlightAirborneTurnRate(100, 0, bank, lift, weight);
    const climbing = FS.getFlightAirborneTurnRate(100, 60, bank, lift, weight);
    expect(climbing).toBeCloseTo(level * 100 / 80, 10);
    expect(FS.getFlightAirborneTurnRate(100, -60, bank, lift, weight)).toBeCloseTo(climbing, 10);
  });

  it('responds continuously to a small bank instead of a one-degree heading dead zone', () => {
    expect(FS.getFlightAirborneTurnRate(200, 0, 0, 2550, 2550)).toBe(0);
    expect(FS.getFlightAirborneTurnRate(200, 0, 0.5, 2550, 2550)).toBeGreaterThan(0);
    expect(FS.getFlightAirborneTurnRate(200, 0, -0.5, 2550, 2550)).toBeLessThan(0);
  });

  it.each([[0, 0], [20, 0], [100, 100], [200, -199]])('keeps slow or near-vertical flight finite at TAS %s and VSI %s', (speed, vsi) => {
    const start = flight({ speed, vsi });
    const next = FS.Physics.step(start, 0.01, controls({ bank: 45 }));
    for (const key of ['speed', 'altitude', 'vsi', 'heading', 'lat', 'lon']) expect(Number.isFinite(next[key]), key).toBe(true);
    expect(next.heading).toBe(start.heading);
  });

  it('retains wheel steering on a rolling aircraft and cannot pivot while parked', () => {
    const dt = 0.01;
    const start = flight({ speed: 100, altitude: 0, onGround: true });
    const rolling = FS.Physics.step(start, dt, controls({ bank: 45 }));
    expect(rolling.onGround).toBe(true);
    expect(headingChange(rolling.heading, start.heading)).toBeCloseTo(FS.getFlightGroundTurnRate(rolling.speed, 45) * dt, 10);
    expect(rolling.heading).toBeGreaterThan(start.heading);
    const parked = FS.Physics.step({ ...start, speed: 0 }, dt, controls({ bank: 45 }));
    expect(parked.onGround).toBe(true);
    expect(parked.heading).toBe(start.heading);
  });

  it.each([
    [NaN, 0, 30, 2550, 2550], [Infinity, 0, 30, 2550, 2550],
    [200, NaN, 30, 2550, 2550], [200, 0, Infinity, 2550, 2550],
    [200, 0, 30, NaN, 2550], [200, 0, 30, 2550, 0],
    [-200, 0, 30, 2550, 2550], [200, 250, 30, 2550, 2550],
  ])('returns no artificial heading change for invalid or nonhorizontal inputs %j', (speed, vsi, bank, lift, weight) => {
    expect(FS.getFlightAirborneTurnRate(speed, vsi, bank, lift, weight)).toBe(0);
  });
});
