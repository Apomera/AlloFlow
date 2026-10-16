import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { drive, lighting, arrayPose } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { drive: issMapDriveStep, lighting: issMapLighting, arrayPose: issMapArrayPose };'
)();
const radians = Math.PI / 180;
const orbitPeriod = 2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418);
const orbitRate = 360 / orbitPeriod;
const phaseWrap = value => ((value % 360) + 360) % 360;
const angularDifference = (target, actual) => ((target - actual + 180) % 360 + 360) % 360 - 180;

function continueDrive(options, result, seconds, changes = {}) {
  return drive({ ...options, phase: result.phase, actualAlpha: result.alpha, actualFeather: result.feather, ...changes }, seconds);
}

describe('space station map finite-rate array drive', () => {
  it('uses finite defaults, bounded elapsed time, and bounded motor speed', () => {
    const defaults = drive({}, 0);
    for (const options of [undefined, null, {}]) expect(drive(options, 0)).toEqual(defaults);
    expect(defaults.phase).toBe(35);
    expect(defaults.alpha).toBe(35);
    expect(defaults.feather).toBe(-20);
    expect(defaults.speedLimit).toBe(.08);
    expect(defaults.elapsedSeconds).toBe(0);
    for (const value of [NaN, Infinity, -Infinity, 'corrupt', undefined, null, '']) {
      expect(drive({}, value)).toEqual(defaults);
    }
    expect(drive({}, -10)).toEqual(defaults);
    expect(drive({}, 5000)).toEqual(drive({}, 3600));
    for (const [input, expected] of [[-2, 0], [2, 1], [.25, .25]]) {
      expect(drive({ motorRate: input }, 0).speedLimit).toBe(expected);
    }
    for (const value of [NaN, Infinity, -Infinity, 'corrupt']) {
      expect(drive({ phase: value, beta: value, motorRate: value }, 0)).toEqual(defaults);
      const manual = { tracking: false, motorEnabled: true, arrayAlpha: 62, arrayFeather: -17, actualAlpha: value, actualFeather: value };
      expect(drive(manual, 0)).toMatchObject({ alpha: 62, feather: -17 });
    }
  });

  it('keeps instantaneous mode aligned with the command at the new orbital phase', () => {
    const duration = 73;
    const tracked = drive({ phase: 350, beta: 30, actualAlpha: -80, actualFeather: 60, motorEnabled: false }, duration);
    expect(tracked.phase).toBeCloseTo(phaseWrap(350 + orbitRate * duration), 10);
    expect(angularDifference(tracked.commandAlpha, tracked.alpha)).toBeCloseTo(0, 10);
    expect(tracked.commandFeather).toBe(-30);
    expect(tracked.feather).toBe(-30);
    expect(tracked.slewing).toBe(false);
    const manual = drive({ tracking: false, arrayAlpha: 42, arrayFeather: -26, actualAlpha: -70, actualFeather: 50, motorEnabled: false }, 0);
    expect(manual).toMatchObject({ alpha: 42, feather: -26, commandAlpha: 42, commandFeather: -26, slewing: false });
    expect(manual.errorAngle).toBeCloseTo(0, 5);
  });

  it('limits each manual axis independently and reaches a static command without overshoot', () => {
    const settings = { tracking: false, arrayAlpha: 60, arrayFeather: -50, actualAlpha: -20, actualFeather: 30, motorEnabled: true, motorRate: .4 };
    const first = drive(settings, 20);
    expect(first.alpha).toBeCloseTo(-12, 10);
    expect(first.feather).toBeCloseTo(22, 10);
    expect(first.commandAlpha).toBe(60);
    expect(first.commandFeather).toBe(-50);
    expect(first.slewing).toBe(true);
    const settled = continueDrive(settings, first, 200);
    expect(settled.alpha).toBeCloseTo(60, 10);
    expect(settled.feather).toBeCloseTo(-50, 10);
    expect(settled.alphaError).toBeCloseTo(0, 10);
    expect(settled.featherError).toBeCloseTo(0, 10);
    expect(settled.errorAngle).toBeCloseTo(0, 5);
    expect(settled.slewing).toBe(false);
    const later = continueDrive(settings, settled, 200);
    expect(later.alpha).toBeCloseTo(settled.alpha, 10);
    expect(later.feather).toBeCloseTo(settled.feather, 10);
  });

  it('takes the short alpha path through 180 degrees in both directions', () => {
    const settings = { tracking: false, arrayAlpha: -170, arrayFeather: 0, actualAlpha: 170, actualFeather: 0, motorEnabled: true, motorRate: 1 };
    const first = drive(settings, 5);
    expect(first.alpha).toBeCloseTo(175, 10);
    expect(Math.abs(first.alphaError)).toBeCloseTo(15, 10);
    const endpoint = continueDrive(settings, first, 5);
    expect(endpoint.alpha).toBe(180);
    const settled = continueDrive(settings, endpoint, 30);
    expect(settled.alpha).toBeCloseTo(-170, 10);
    expect(settled.slewing).toBe(false);
    const reverse = drive({ ...settings, arrayAlpha: 170, actualAlpha: -170 }, 5);
    expect(reverse.alpha).toBeCloseTo(-175, 10);
    expect(Math.abs(reverse.alphaError)).toBeCloseTo(15, 10);
    const wrappedCommand = drive({ ...settings, arrayAlpha: 540, actualAlpha: 180 }, 0);
    expect(wrappedCommand.commandAlpha).toBe(180);
    expect(wrappedCommand.alpha).toBe(180);
  });

  it('preserves actual angles at zero elapsed time even when the command or speed changes', () => {
    const settings = { phase: 10, beta: 20, tracking: false, arrayAlpha: 90, arrayFeather: -50, actualAlpha: 15, actualFeather: 30, motorEnabled: true, motorRate: .02 };
    const first = drive(settings, 0);
    expect(first).toMatchObject({ alpha: 15, feather: 30, phase: 10, elapsedSeconds: 0 });
    const changed = continueDrive(settings, first, 0, { arrayAlpha: -80, arrayFeather: 70, motorRate: 1 });
    expect(changed).toMatchObject({ alpha: 15, feather: 30, commandAlpha: -80, commandFeather: 70, phase: 10 });
    const moved = continueDrive(settings, changed, 2, { arrayAlpha: -80, arrayFeather: 70, motorRate: 1 });
    expect(moved.alpha).toBeCloseTo(13, 10);
    expect(moved.feather).toBeCloseTo(32, 10);
  });

  it('holds both physical axes with stopped motors while the station continues along its orbit', () => {
    for (const tracking of [true, false]) {
      const settings = { phase: 20, beta: 20, tracking, arrayAlpha: 100, arrayFeather: -70, actualAlpha: -60, actualFeather: 44, motorEnabled: true, motorRate: 0 };
      const result = drive(settings, 1200);
      expect(result.alpha).toBe(-60);
      expect(result.feather).toBe(44);
      expect(result.phase).toBeCloseTo(phaseWrap(20 + orbitRate * 1200), 9);
      expect(result.elapsedSeconds).toBe(1200);
      expect(result.speedLimit).toBe(0);
      expect(Math.abs(result.alphaError)).toBeGreaterThan(0);
    }
  });

  it('clamps feather commands and initial feather position while wrapping alpha', () => {
    const result = drive({ tracking: false, arrayAlpha: 1080, arrayFeather: -140, actualAlpha: 450, actualFeather: 130, motorEnabled: true, motorRate: 1 }, 30);
    expect(result.commandAlpha).toBe(0);
    expect(result.commandFeather).toBe(-90);
    expect(result.alpha).toBeCloseTo(60, 10);
    expect(result.feather).toBeCloseTo(60, 10);
    const settled = drive({ tracking: false, arrayAlpha: -720, arrayFeather: 200, actualAlpha: 0, actualFeather: -100, motorEnabled: true, motorRate: 1 }, 300);
    expect(settled.alpha).toBeCloseTo(0, 10);
    expect(settled.feather).toBe(90);
    expect(settled.commandFeather).toBe(90);
    expect(settled.slewing).toBe(false);
  });

  it('advances phase continuously through the orbital seam and a complete orbit', () => {
    const settings = { phase: 359, beta: 20, tracking: false, arrayAlpha: 20, arrayFeather: -10, motorEnabled: true, motorRate: 0 };
    const wrapped = drive(settings, 100);
    expect(wrapped.phase).toBeCloseTo(phaseWrap(359 + orbitRate * 100), 9);
    expect(wrapped.phase).toBeGreaterThan(0);
    expect(wrapped.phase).toBeLessThan(10);
    const first = drive(settings, 3600);
    const fullOrbit = continueDrive(settings, first, orbitPeriod - 3600);
    expect(angularDifference(fullOrbit.phase, settings.phase)).toBeCloseTo(0, 8);
    expect(fullOrbit.alpha).toBeCloseTo(20, 10);
    expect(fullOrbit.feather).toBeCloseTo(-10, 10);
    const before = drive({ ...settings, phase: 360 - orbitRate * .001 }, 0);
    const after = continueDrive(settings, before, .002);
    expect(angularDifference(after.phase, before.phase)).toBeCloseTo(orbitRate * .002, 10);
  });

  it('allows sufficiently fast motors to catch and follow the moving Sun-pointing command', () => {
    const settings = { phase: 0, beta: 20, tracking: true, actualAlpha: -90, actualFeather: 50, motorEnabled: true, motorRate: .5 };
    const result = drive(settings, 300);
    expect(result.phase).toBeCloseTo(orbitRate * 300, 9);
    expect(angularDifference(result.commandAlpha, result.alpha)).toBeCloseTo(0, 5);
    expect(result.feather).toBeCloseTo(-20, 8);
    expect(result.errorAngle).toBeCloseTo(0, 5);
    expect(result.slewing).toBe(false);
    const next = continueDrive(settings, result, 90);
    expect(angularDifference(next.commandAlpha, next.alpha)).toBeCloseTo(0, 5);
    expect(next.feather).toBeCloseTo(-20, 8);
  });

  it('produces measurable pointing lag and cosine loss when the motor is slower than orbital motion', () => {
    const duration = 600, rate = .02;
    const result = drive({ phase: 0, beta: 0, tracking: true, actualAlpha: 0, actualFeather: 0, motorEnabled: true, motorRate: rate }, duration);
    const lag = (orbitRate - rate) * duration;
    expect(result.alpha).toBeCloseTo(rate * duration, 8);
    expect(result.commandAlpha).toBeCloseTo(orbitRate * duration, 8);
    expect(Math.abs(result.alphaError)).toBeCloseTo(lag, 8);
    expect(result.errorAngle).toBeCloseTo(lag, 7);
    expect(result.slewing).toBe(true);
    const actual = arrayPose({ tracking: false, alpha: result.alpha, feather: result.feather });
    const input = lighting({ phase: result.phase, beta: 0, tracking: false, normal: actual.normal });
    expect(input.eclipse).toBe(false);
    expect(input.incidence).toBeCloseTo(Math.cos(lag * radians), 10);
    expect(input.generation).toBeCloseTo(Math.cos(lag * radians), 10);
    expect(input.generation).toBeLessThan(.95);
  });

  it('keeps moving-target integration consistent when the same duration is split into uneven steps', () => {
    const settings = { phase: 350, beta: 20, tracking: true, actualAlpha: 0, actualFeather: 30, motorEnabled: true, motorRate: .04 };
    const whole = drive(settings, 120);
    let split = drive(settings, 0);
    for (const seconds of [13, 3.7, 27.3, 1, 75]) split = continueDrive(settings, split, seconds);
    expect(angularDifference(split.phase, whole.phase)).toBeCloseTo(0, 8);
    expect(Math.abs(angularDifference(split.alpha, whole.alpha))).toBeLessThan(.02);
    expect(Math.abs(split.feather - whole.feather)).toBeLessThan(.02);
    expect(Math.abs(split.errorAngle - whole.errorAngle)).toBeLessThan(.02);
    expect(Math.abs(angularDifference(split.alpha, settings.actualAlpha))).toBeLessThanOrEqual(.04 * 120 + 1e-8);
    expect(Math.abs(split.feather - settings.actualFeather)).toBeLessThanOrEqual(.04 * 120 + 1e-8);
  });

  it('reports physical normal-angle error rather than adding axis errors and never mutates caller state', () => {
    const settings = Object.freeze({ phase: 35, beta: 20, tracking: false, arrayAlpha: 65, arrayFeather: -50, actualAlpha: -35, actualFeather: 15, motorEnabled: true, motorRate: .08 });
    const result = drive(settings, 0);
    const cosine = Math.sin(15 * radians) * Math.sin(-50 * radians) +
      Math.cos(15 * radians) * Math.cos(-50 * radians) * Math.cos((65 + 35) * radians);
    expect(result.errorAngle).toBeCloseTo(Math.acos(cosine) / radians, 9);
    expect(Math.abs(result.alphaError)).toBeCloseTo(100, 10);
    expect(Math.abs(result.featherError)).toBeCloseTo(65, 10);
    expect(result.errorAngle).toBeLessThan(165);
    expect(settings).toEqual({ phase: 35, beta: 20, tracking: false, arrayAlpha: 65, arrayFeather: -50, actualAlpha: -35, actualFeather: 15, motorEnabled: true, motorRate: .08 });
    result.alpha = 999;
    expect(drive(settings, 0).alpha).toBe(-35);
  });
});
