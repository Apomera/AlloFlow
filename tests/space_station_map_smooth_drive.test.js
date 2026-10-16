import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { drive } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { drive: issMapDriveStep };'
)();
const orbitPeriod = 2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418);
const orbitRate = 360 / orbitPeriod;
const angularDifference = (target, actual) => ((target - actual + 180) % 360 + 360) % 360 - 180;
const smoothManual = {
  tracking: false, motorEnabled: true, motorSmooth: true,
  motorRate: .2, motorAcceleration: .01,
  arrayAlpha: 80, arrayFeather: -70,
  actualAlpha: 0, actualFeather: 0,
  actualAlphaRate: 0, actualFeatherRate: 0
};

function continueDrive(options, result, seconds, changes = {}) {
  return drive({
    ...options, phase: result.phase,
    actualAlpha: result.alpha, actualFeather: result.feather,
    actualAlphaRate: result.alphaRate, actualFeatherRate: result.featherRate,
    ...changes
  }, seconds);
}

describe('space station map acceleration-limited array drive', () => {
  it('requires explicit motor and smooth modes and supplies finite acceleration and rate defaults', () => {
    const enabled = drive({ motorEnabled: true, motorSmooth: true }, 0);
    expect(enabled.smooth).toBe(true);
    expect(enabled.accelerationLimit).toBe(.002);
    expect(enabled.alphaRate).toBe(0);
    expect(enabled.featherRate).toBe(0);
    for (const mode of [
      {}, { motorSmooth: true }, { motorEnabled: true },
      { motorEnabled: true, motorSmooth: false },
      { motorEnabled: true, motorSmooth: 'true' },
      { motorEnabled: 'true', motorSmooth: true }
    ]) {
      const result = drive({ ...mode, actualAlphaRate: .4, actualFeatherRate: -.3 }, 0);
      expect(result.smooth).toBe(false);
      expect(result.alphaRate).toBe(0);
      expect(result.featherRate).toBe(0);
    }
  });

  it('sanitizes rates independently of the requested speed and bounds acceleration', () => {
    for (const value of [NaN, Infinity, -Infinity, 'corrupt', null, '', undefined]) {
      const result = drive({
        ...smoothManual, motorAcceleration: value,
        actualAlphaRate: value, actualFeatherRate: value
      }, 0);
      expect(result.accelerationLimit).toBe(.002);
      expect(result.alphaRate).toBe(0);
      expect(result.featherRate).toBe(0);
    }
    for (const [input, expected] of [[-1, .0001], [0, .0001], [.02, .02], [10, .05]]) {
      expect(drive({ ...smoothManual, motorAcceleration: input }, 0).accelerationLimit).toBe(expected);
    }
    const fast = drive({ ...smoothManual, motorRate: .02, actualAlphaRate: 8, actualFeatherRate: -8 }, 0);
    expect(fast.alphaRate).toBe(1);
    expect(fast.featherRate).toBe(-1);
  });

  it('preserves physical angles and rates when a paused target or speed setting changes', () => {
    const settings = { ...smoothManual, phase: 19, actualAlpha: 12, actualFeather: -24, actualAlphaRate: .18, actualFeatherRate: -.12 };
    const paused = drive(settings, 0);
    const retargeted = continueDrive(settings, paused, 0, {
      arrayAlpha: -80, arrayFeather: 50, motorRate: .02, motorAcceleration: .0001
    });
    expect(retargeted).toMatchObject({
      phase: 19, alpha: 12, feather: -24, alphaRate: .18, featherRate: -.12,
      commandAlpha: -80, commandFeather: 50, elapsedSeconds: 0, speedLimit: .02
    });
    const changedSun = continueDrive(settings, paused, 0, { phase: 250, beta: 30, tracking: true });
    expect(changedSun).toMatchObject({ alpha: 12, feather: -24, alphaRate: .18, featherRate: -.12 });
    expect(changedSun.commandAlpha).toBe(-110);
    expect(changedSun.commandFeather).toBe(-30);
  });

  it('accelerates from rest with the expected constant-acceleration displacement on both axes', () => {
    const seconds = 2, acceleration = .01;
    const result = drive({ ...smoothManual, motorAcceleration: acceleration }, seconds);
    expect(result.alphaRate).toBeCloseTo(acceleration * seconds, 10);
    expect(result.featherRate).toBeCloseTo(-acceleration * seconds, 10);
    expect(result.alpha).toBeCloseTo(.5 * acceleration * seconds ** 2, 9);
    expect(result.feather).toBeCloseTo(-.5 * acceleration * seconds ** 2, 9);
    expect(Math.abs(result.alpha)).toBeLessThan(smoothManual.motorRate * seconds);
    expect(result.slewing).toBe(true);
  });

  it('bounds every velocity change and brakes before reversing toward a new command', () => {
    const settings = {
      ...smoothManual, arrayAlpha: -90, arrayFeather: 70,
      actualAlphaRate: .12, actualFeatherRate: -.12, motorAcceleration: .02
    };
    let state = drive(settings, 0);
    const first = continueDrive(settings, state, .5);
    expect(first.alpha).toBeGreaterThan(state.alpha);
    expect(first.feather).toBeLessThan(state.feather);
    expect(first.alphaRate).toBeGreaterThan(0);
    expect(first.featherRate).toBeLessThan(0);
    for (let i = 0; i < 80; i++) {
      const next = continueDrive(settings, state, .2);
      expect(Math.abs(next.alphaRate - state.alphaRate)).toBeLessThanOrEqual(.02 * .2 + 1e-10);
      expect(Math.abs(next.featherRate - state.featherRate)).toBeLessThanOrEqual(.02 * .2 + 1e-10);
      expect(Math.abs(next.alphaRate)).toBeLessThanOrEqual(.2 + 1e-10);
      expect(Math.abs(next.featherRate)).toBeLessThanOrEqual(.2 + 1e-10);
      expect(Math.abs(angularDifference(next.alpha, state.alpha))).toBeLessThanOrEqual(.2 * .2 + 1e-9);
      expect(Math.abs(next.feather - state.feather)).toBeLessThanOrEqual(.2 * .2 + 1e-9);
      state = next;
    }
    expect(state.alphaRate).toBeLessThan(0);
    expect(state.featherRate).toBeGreaterThan(0);
  });

  it('decelerates toward a lowered or zero speed limit without an instantaneous velocity reset', () => {
    const settings = { ...smoothManual, actualAlphaRate: .2, actualFeatherRate: -.2 };
    const reduced = drive({ ...settings, motorRate: .02 }, 1);
    expect(reduced.alphaRate).toBeCloseTo(.19, 10);
    expect(reduced.featherRate).toBeCloseTo(-.19, 10);
    expect(reduced.alpha).toBeCloseTo(.195, 9);
    expect(reduced.feather).toBeCloseTo(-.195, 9);
    const braking = drive({ ...settings, motorRate: 0 }, 5);
    expect(braking.alphaRate).toBeCloseTo(.15, 10);
    expect(braking.featherRate).toBeCloseTo(-.15, 10);
    expect(braking.alpha).toBeGreaterThan(0);
    expect(braking.feather).toBeLessThan(0);
    const stopped = continueDrive(settings, braking, 30, { motorRate: 0 });
    expect(stopped.alphaRate).toBeCloseTo(0, 10);
    expect(stopped.featherRate).toBeCloseTo(0, 10);
    const held = continueDrive(settings, stopped, 30, { motorRate: 0 });
    expect(held.alpha).toBeCloseTo(stopped.alpha, 9);
    expect(held.feather).toBeCloseTo(stopped.feather, 9);
    expect(held.phase).not.toBe(stopped.phase);
  });

  it('takes the short rotation through the angular seam with continuous velocity', () => {
    const settings = { ...smoothManual, arrayAlpha: -170, arrayFeather: 0, actualAlpha: 170 };
    const first = drive(settings, 30);
    expect(angularDifference(first.alpha, settings.actualAlpha)).toBeGreaterThan(0);
    expect(first.alphaRate).toBeGreaterThan(0);
    let state = first, crossed = false;
    for (let i = 0; i < 300; i++) {
      const next = continueDrive(settings, state, .5);
      expect(Math.abs(angularDifference(next.alpha, state.alpha))).toBeLessThanOrEqual(.2 * .5 + 1e-8);
      expect(Math.abs(next.alphaRate - state.alphaRate)).toBeLessThanOrEqual(.01 * .5 + 1e-10);
      if (state.alpha > 0 && next.alpha < 0) crossed = true;
      state = next;
    }
    expect(crossed).toBe(true);
    expect(Math.abs(angularDifference(state.alpha, -170))).toBeLessThan(.01);
    expect(Math.abs(state.alphaRate)).toBeLessThan(.001);
  });

  it('respects feather hard stops and removes only outward velocity on contact', () => {
    for (const direction of [-1, 1]) {
      const settings = {
        ...smoothManual, arrayAlpha: 0, arrayFeather: -direction * 90,
        actualFeather: direction * 89.999, actualFeatherRate: direction * .2
      };
      const collision = drive(settings, .05);
      expect(collision.feather).toBe(direction * 90);
      expect(collision.featherRate).toBe(0);
      const inward = continueDrive(settings, collision, .2);
      expect(Math.abs(inward.feather)).toBeLessThan(90);
      expect(inward.featherRate * direction).toBeLessThan(0);
      expect(Math.abs(inward.featherRate)).toBeLessThanOrEqual(.01 * .2 + 1e-10);
    }
  });

  it('converges to a static target with both angular rate and pointing error settling', () => {
    const settings = { ...smoothManual, arrayAlpha: 12, arrayFeather: -8 };
    const result = drive(settings, 300);
    expect(Math.abs(angularDifference(result.alpha, 12))).toBeLessThan(.001);
    expect(Math.abs(result.feather + 8)).toBeLessThan(.001);
    expect(Math.abs(result.alphaRate)).toBeLessThan(.0001);
    expect(Math.abs(result.featherRate)).toBeLessThan(.0001);
    expect(result.jointError).toBeLessThan(.001);
    expect(result.slewing).toBe(false);
    const later = continueDrive(settings, result, 100);
    expect(later.jointError).toBeLessThanOrEqual(result.jointError + 1e-9);
  });

  it('follows the moving Sun at its orbital rate without artificial lag when already synchronized', () => {
    const settings = {
      ...smoothManual, phase: 355, beta: 20, tracking: true,
      actualAlpha: -5, actualFeather: -20,
      actualAlphaRate: orbitRate, actualFeatherRate: 0
    };
    const result = drive(settings, 120);
    expect(result.phase).toBeLessThan(10);
    expect(Math.abs(angularDifference(result.alpha, result.commandAlpha))).toBeLessThan(1e-8);
    expect(result.feather).toBeCloseTo(-20, 10);
    expect(result.alphaRate).toBeCloseTo(orbitRate, 10);
    expect(result.featherRate).toBe(0);
    expect(result.slewing).toBe(false);
    const continued = continueDrive(settings, result, 180);
    expect(Math.abs(angularDifference(continued.alpha, continued.commandAlpha))).toBeLessThan(1e-8);
    expect(continued.alphaRate).toBeCloseTo(orbitRate, 10);
  });

  it('catches a moving target when motor speed allows, while a slow motor accumulates lag', () => {
    const settings = {
      ...smoothManual, phase: 0, beta: 20, tracking: true,
      actualAlpha: -30, actualFeather: 40
    };
    const caught = drive(settings, 700);
    expect(Math.abs(angularDifference(caught.alpha, caught.commandAlpha))).toBeLessThan(.001);
    expect(Math.abs(caught.feather + 20)).toBeLessThan(.001);
    expect(caught.alphaRate).toBeCloseTo(orbitRate, 4);
    expect(Math.abs(caught.featherRate)).toBeLessThan(.0001);
    const slow = drive({
      ...settings, beta: 0, actualAlpha: 0, actualFeather: 0,
      motorRate: .02, motorAcceleration: .002
    }, 600);
    expect(slow.alphaRate).toBeCloseTo(.02, 9);
    expect(slow.alphaError).toBeGreaterThan((orbitRate - .02) * 600);
    expect(slow.errorAngle).toBeGreaterThan(20);
    expect(slow.slewing).toBe(true);
  });

  it('keeps physical motion consistent across uneven simulation-time steps', () => {
    const settings = {
      ...smoothManual, phase: 350, beta: 20, tracking: true,
      actualAlpha: 20, actualFeather: 30, actualAlphaRate: -.12,
      actualFeatherRate: -.08, motorAcceleration: .003
    };
    const whole = drive(settings, 120);
    let split = drive(settings, 0);
    for (const seconds of [13, 3.7, 27.3, 1, 75]) split = continueDrive(settings, split, seconds);
    expect(Math.abs(angularDifference(split.phase, whole.phase))).toBeLessThan(1e-8);
    expect(Math.abs(angularDifference(split.alpha, whole.alpha))).toBeLessThan(.02);
    expect(Math.abs(split.feather - whole.feather)).toBeLessThan(.02);
    expect(Math.abs(split.alphaRate - whole.alphaRate)).toBeLessThan(.001);
    expect(Math.abs(split.featherRate - whole.featherRate)).toBeLessThan(.001);
  });

  it('leaves the existing speed-only and instantaneous behaviors independent of saved velocity', () => {
    const settings = {
      ...smoothManual, phase: 350, tracking: true, actualAlpha: -80, actualFeather: 30,
      motorSmooth: false, motorRate: .08
    };
    const baseline = drive(settings, 120);
    expect(drive({ ...settings, actualAlphaRate: .9, actualFeatherRate: -.9 }, 120)).toEqual(baseline);
    expect(baseline).toMatchObject({ smooth: false, alphaRate: 0, featherRate: 0 });
    const instant = drive({ ...settings, motorEnabled: false, motorSmooth: true, actualAlphaRate: .9, actualFeatherRate: -.9 }, 120);
    expect(instant).toMatchObject({ smooth: false, alphaRate: 0, featherRate: 0 });
    expect(Math.abs(angularDifference(instant.alpha, instant.commandAlpha))).toBeLessThan(1e-9);
    expect(instant.feather).toBe(instant.commandFeather);
  });
});
