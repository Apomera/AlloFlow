import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { forecast, at, drive } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { forecast: issMapDriveForecast, at: issMapForecastAt, drive: issMapDriveStep };'
)();
const radians = Math.PI / 180;
const radiusRatio = 6371 / (6371 + 420);
const period = 2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418);
const orbitRate = 360 / period;
const phaseWrap = value => ((value % 360) + 360) % 360;
const angularDifference = (target, actual) => ((target - actual + 180) % 360 + 360) % 360 - 180;
const tipRadius = Math.hypot(.45, .02, 3.7);
const smoothOptions = {
  phase: 358, beta: 25, tracking: false, motorEnabled: true, motorSmooth: true,
  motorRate: .2, motorAcceleration: .002, arrayAlpha: -90, arrayFeather: 65,
  actualAlpha: 20, actualFeather: -10, actualAlphaRate: .12, actualFeatherRate: -.09
};

function expectVector(actual, expected, precision = 9) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, index) => {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeCloseTo(expected[index], precision);
  });
}

function expectedGeometry(sample, beta) {
  const a = sample.alpha * radians, f = sample.feather * radians;
  const p = sample.phase * radians, b = beta * radians;
  const normal = [-Math.sin(f), Math.cos(a) * Math.cos(f), Math.sin(a) * Math.cos(f)];
  const sun = [Math.sin(b), Math.cos(b) * Math.cos(p), Math.cos(b) * Math.sin(p)];
  const x = .45 * Math.cos(f) - .02 * Math.sin(f);
  const y = .45 * Math.sin(f) + .02 * Math.cos(f);
  return {
    normal, sun,
    corner: [x, y * Math.cos(a) - 3.7 * Math.sin(a), y * Math.sin(a) + 3.7 * Math.cos(a)],
    incidence: Math.max(0, Math.min(1, normal.reduce((sum, value, axis) => sum + value * sun[axis], 0)))
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('space station continuous map forecast selection', () => {
  it('returns no selection without a cached forecast and supports zero-length horizons', () => {
    for (const value of [undefined, null, { samples: [] }]) expect(at(value, 7.5)).toBeNull();
    const zero = forecast(smoothOptions, 0);
    for (const seconds of [0, -10, 5, Infinity, null]) {
      expect(at(zero, seconds)).toEqual(zero.samples[0]);
      expect(at(zero, seconds)).not.toBe(zero.samples[0]);
    }
  });

  it('sanitizes time and clamps to the exact fractional endpoint', () => {
    const result = forecast(smoothOptions, 31.75);
    for (const seconds of [undefined, null, '', NaN, Infinity, -Infinity, 'bad', -1]) {
      expect(at(result, seconds)).toEqual(result.samples[0]);
    }
    expect(at(result, '22.125')).toEqual(at(result, 22.125));
    expect(at(result, 999)).toEqual(result.samples.at(-1));
    expect(at(result, 31.75)).toEqual(result.samples.at(-1));
    expect(at(result, 31.749).seconds).toBe(31.749);
  });

  it('preserves every cached knot exactly while returning independent vectors', () => {
    const result = forecast(smoothOptions, 91.375);
    for (const cached of result.samples) {
      const selected = at(result, cached.seconds);
      expect(selected).toEqual(cached);
      expect(selected).not.toBe(cached);
      for (const field of ['normal', 'sun', 'corner']) expect(selected[field]).not.toBe(cached[field]);
    }
  });

  it('replays fractional states from the preceding knot with both carried angular rates', () => {
    const configurations = [
      smoothOptions,
      { ...smoothOptions, tracking: true },
      { ...smoothOptions, motorSmooth: false },
      { ...smoothOptions, motorEnabled: false }
    ];
    for (const options of configurations) {
      const result = forecast(options, 91.375);
      for (const seconds of [.025, 7.125, 14.999, 15.001, 22.75, 46.125, 90.5, 91.374]) {
        const previous = result.samples.filter(sample => sample.seconds < seconds).at(-1);
        const expected = drive({
          ...result.base, phase: previous.phase,
          actualAlpha: previous.alpha, actualFeather: previous.feather,
          actualAlphaRate: previous.alphaRate, actualFeatherRate: previous.featherRate
        }, seconds - previous.seconds);
        const selected = at(result, seconds);
        expect(selected.seconds).toBe(seconds);
        for (const [field, value] of Object.entries(expected)) {
          if (typeof value === 'number') expect(selected[field], field + ' at ' + seconds).toBeCloseTo(value, 9);
          else expect(selected[field], field + ' at ' + seconds).toBe(value);
        }
        expect(selected.elapsedSeconds).toBeCloseTo(seconds - previous.seconds, 10);
      }
    }
  });

  it('respects smooth motor speed and acceleration at fractional selection times', () => {
    const result = forecast(smoothOptions, 135);
    for (const seconds of [.025, 2.5, 7.25, 14.875, 15.125, 22.5, 58.75, 89.25, 134.5]) {
      const previous = result.samples.filter(sample => sample.seconds <= seconds).at(-1);
      const selected = at(result, seconds), elapsed = seconds - previous.seconds;
      for (const field of ['alphaRate', 'featherRate']) {
        expect(Math.abs(selected[field])).toBeLessThanOrEqual(smoothOptions.motorRate + 1e-10);
        expect(Math.abs(selected[field] - previous[field])).toBeLessThanOrEqual(smoothOptions.motorAcceleration * elapsed + 1e-9);
      }
      expect(Math.abs(angularDifference(selected.alpha, previous.alpha))).toBeLessThanOrEqual(smoothOptions.motorRate * elapsed + 1e-9);
      expect(Math.abs(selected.feather - previous.feather)).toBeLessThanOrEqual(smoothOptions.motorRate * elapsed + 1e-9);
    }
  });

  it('retains excess starting velocity and physically brakes after a speed-limit reduction', () => {
    const result = forecast({
      ...smoothOptions, motorRate: .04, actualAlpha: 0, actualFeather: 0,
      actualAlphaRate: .12, actualFeatherRate: -.12
    }, 90);
    for (const seconds of [.025, 7.25, 22.125]) {
      const selected = at(result, seconds), rate = .12 - .002 * seconds;
      expect(selected.alphaRate).toBeCloseTo(rate, 9);
      expect(selected.featherRate).toBeCloseTo(-rate, 9);
      expect(selected.alphaRate).toBeGreaterThan(.04);
      expect(selected.alpha).toBeGreaterThan(0);
      expect(selected.feather).toBeLessThan(0);
      expect(selected.alpha).toBeCloseTo(.12 * seconds - .001 * seconds ** 2, 8);
    }
  });

  it('keeps rigid geometry and physical solar input at arbitrary times', () => {
    const result = forecast({ ...smoothOptions, phase: 90 }, 1200);
    for (const seconds of [.125, 8.3, 22.75, 179.6, 411.125, 807.25, 1199.875]) {
      const selected = at(result, seconds), expected = expectedGeometry(selected, result.base.beta);
      expectVector(selected.normal, expected.normal);
      expectVector(selected.sun, expected.sun);
      expectVector(selected.corner, expected.corner);
      expect(Math.hypot(...selected.corner)).toBeCloseTo(tipRadius, 10);
      expect(Math.hypot(...selected.normal)).toBeCloseTo(1, 10);
      expect(Math.hypot(...selected.sun)).toBeCloseTo(1, 10);
      expect(selected.incidence).toBeCloseTo(expected.incidence, 10);
      expect(selected.generation).toBeCloseTo(selected.eclipse ? 0 : expected.incidence, 10);
    }
  });

  it('passes continuously through the orbital phase and joint-angle seams', () => {
    const fixed = forecast({
      phase: 359, beta: 30, tracking: false, arrayAlpha: -30, arrayFeather: 25,
      motorEnabled: true, motorRate: 0, actualAlpha: -30, actualFeather: 25
    }, 60);
    for (const seconds of [.5, 15.4, 16.2, 31.75, 59.999]) {
      const sample = at(fixed, seconds);
      expect(sample.phase).toBeCloseTo(phaseWrap(359 + orbitRate * seconds), 9);
      expect(sample.alpha).toBe(-30);
      expect(sample.feather).toBe(25);
    }
    const turn = forecast({
      phase: 35, beta: 20, tracking: false, motorEnabled: true, motorRate: .2,
      arrayAlpha: -170, arrayFeather: -20, actualAlpha: 170, actualFeather: -20
    }, 90);
    const before = at(turn, 49.999), after = at(turn, 50.001);
    expect(before.alpha).toBeGreaterThan(179);
    expect(after.alpha).toBeLessThan(-179);
    expect(angularDifference(after.alpha, before.alpha)).toBeCloseTo(.0004, 9);
    const separation = Math.hypot(...after.corner.map((value, axis) => value - before.corner[axis]));
    expect(separation).toBeLessThanOrEqual(tipRadius * .0004 * radians + 1e-10);
  });

  it('resolves a grazing eclipse entirely between adjacent cached samples', () => {
    const halfShadowAngle = 2.5 * orbitRate * radians;
    const beta = Math.acos(Math.sqrt(1 - radiusRatio ** 2) / Math.cos(halfShadowAngle)) / radians;
    const result = forecast({ phase: 180 - 7.5 * orbitRate, beta, tracking: true }, 30);
    expect(result.samples.every(sample => !sample.eclipse)).toBe(true);
    for (const seconds of [5.125, 7.5, 9.875]) {
      const selected = at(result, seconds);
      expect(selected.eclipse).toBe(true);
      expect(selected.incidence).toBeCloseTo(1, 10);
      expect(selected.generation).toBe(0);
    }
    for (const seconds of [4.875, 10.125]) {
      const selected = at(result, seconds);
      expect(selected.eclipse).toBe(false);
      expect(selected.generation).toBeCloseTo(1, 10);
    }
  });

  it('keeps neighboring selections continuous across cached knots and angular seams', () => {
    const epsilon = .0001;
    const cases = [
      { options: smoothOptions, knots: [15, 30, 45, 60, 75, 90] },
      {
        options: {
          ...smoothOptions, tracking: true, phase: 35, beta: 20,
          actualAlpha: 35, actualFeather: -18, actualAlphaRate: .03, actualFeatherRate: -.01
        },
        knots: [15, 30, 60, 90]
      },
      {
        options: {
          phase: 360 - 15 * orbitRate, beta: 20, tracking: false,
          motorEnabled: true, motorRate: .2, arrayAlpha: -170, arrayFeather: -20,
          actualAlpha: 177, actualFeather: -20
        },
        knots: [15, 30, 60]
      }
    ];
    for (const { options, knots } of cases) {
      const result = forecast(options, 120);
      for (const seconds of knots) {
        const selected = [at(result, seconds - epsilon), at(result, seconds), at(result, seconds + epsilon)];
        for (let index = 1; index < selected.length; index++) {
          const before = selected[index - 1], after = selected[index];
          // Replaying the left interval repartitions its <= 50 ms substeps.
          // The small tolerance allows solver roundoff without hiding a visible pose jump.
          const positionBound = options.motorRate * epsilon + 2e-7;
          expect(Math.abs(angularDifference(after.alpha, before.alpha))).toBeLessThanOrEqual(positionBound);
          expect(Math.abs(after.feather - before.feather)).toBeLessThanOrEqual(positionBound);
          expect(angularDifference(after.phase, before.phase)).toBeCloseTo(orbitRate * epsilon, 8);
          const tipSeparation = Math.hypot(...after.corner.map((value, axis) => value - before.corner[axis]));
          expect(tipSeparation).toBeLessThanOrEqual(tipRadius * 2 * positionBound * radians + 1e-10);
          if (options.motorSmooth) {
            const rateBound = options.motorAcceleration * epsilon + 1e-7;
            expect(Math.abs(after.alphaRate - before.alphaRate)).toBeLessThanOrEqual(rateBound);
            expect(Math.abs(after.featherRate - before.featherRate)).toBeLessThanOrEqual(rateBound);
          }
        }
      }
    }
    const seam = forecast(cases[2].options, 30);
    expect(at(seam, 15 - epsilon).alpha).toBeGreaterThan(179);
    expect(at(seam, 15 + epsilon).alpha).toBeLessThan(-179);
    expect(at(seam, 15 - epsilon).phase).toBeGreaterThan(359);
    expect(at(seam, 15 + epsilon).phase).toBeLessThan(1);
  });

  it('crosses a cached braking reversal without snapping position or velocity', () => {
    const result = forecast({
      ...smoothOptions, actualAlpha: 0, actualAlphaRate: .12
    }, 90);
    const epsilon = .0001, before = at(result, 60 - epsilon), after = at(result, 60 + epsilon);
    expect(before.alphaRate).toBeGreaterThan(0);
    expect(after.alphaRate).toBeLessThan(0);
    expect(before.alphaRate).toBeCloseTo(.002 * epsilon, 9);
    expect(after.alphaRate).toBeCloseTo(-.002 * epsilon, 9);
    expect(before.alpha).toBeCloseTo(3.6 - .001 * epsilon ** 2, 8);
    expect(after.alpha).toBeCloseTo(before.alpha, 8);
    expect(at(result, 60).alphaRate).toBeCloseTo(0, 9);
  });

  it('keeps pose continuous when a feather travel stop falls at a cached knot', () => {
    const epsilon = .0001;
    for (const direction of [-1, 1]) {
      const result = forecast({
        ...smoothOptions, arrayFeather: direction * 90,
        actualFeather: direction * 88.725, actualFeatherRate: direction * .1
      }, 30);
      const before = at(result, 15 - epsilon), exact = at(result, 15), after = at(result, 15 + epsilon);
      expect(direction * before.featherRate).toBeGreaterThan(.069);
      expect(after.featherRate).toBe(0);
      expect(after.feather).toBe(direction * 90);
      expect(before.feather).toBeCloseTo(direction * (90 - .07 * epsilon - .001 * epsilon ** 2), 8);
      for (const selected of [before, exact, after]) {
        expect(selected.feather).toBeGreaterThanOrEqual(-90);
        expect(selected.feather).toBeLessThanOrEqual(90);
      }
      const tipSeparation = Math.hypot(...after.corner.map((value, axis) => value - before.corner[axis]));
      expect(tipSeparation).toBeLessThan(tipRadius * .8 * epsilon * radians + 1e-8);
      // A hard-stop contact cancels outward velocity impulsively; only the pose is continuous.
      expect(Math.abs(after.featherRate - before.featherRate)).toBeGreaterThan(.06);
    }
  });

  it('selects the same physics independent of seek order and never mutates the cache', () => {
    const result = deepFreeze(forecast(smoothOptions, 120));
    const original = JSON.stringify(result);
    const times = [0, .125, 14.875, 15, 15.125, 22.75, 60.375, 119.875, 120];
    const expected = new Map(times.map(seconds => [seconds, at(result, seconds)]));
    for (const seconds of [...times].reverse().concat([22.75, .125, 120, 60.375, 0])) {
      const selected = at(result, seconds);
      expect(selected).toEqual(expected.get(seconds));
      selected.alpha = 999;
      for (const field of ['normal', 'sun', 'corner']) selected[field][0] = 999;
      expect(at(result, seconds)).toEqual(expected.get(seconds));
    }
    expect(JSON.stringify(result)).toBe(original);
  });
});
