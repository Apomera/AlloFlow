import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { forecast, drive, lighting } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { forecast: issMapDriveForecast, drive: issMapDriveStep, lighting: issMapLighting };'
)();
const radians = Math.PI / 180;
const orbitPeriod = 2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418);
const orbitRate = 360 / orbitPeriod;
const phaseWrap = value => ((value % 360) + 360) % 360;
const angularDifference = (target, actual) => ((target - actual + 180) % 360 + 360) % 360 - 180;
const tipRadius = Math.hypot(.45, .02, 3.7);

function expectedNormal(alpha, feather) {
  const a = alpha * radians, f = feather * radians;
  return [-Math.sin(f), Math.cos(a) * Math.cos(f), Math.sin(a) * Math.cos(f)];
}

function expectedCorner(alpha, feather) {
  const a = alpha * radians, f = feather * radians;
  const x = .45 * Math.cos(f) - .02 * Math.sin(f);
  const y = .45 * Math.sin(f) + .02 * Math.cos(f);
  return [x, y * Math.cos(a) - 3.7 * Math.sin(a), y * Math.sin(a) + 3.7 * Math.cos(a)];
}

function expectVector(actual, expected, precision = 10) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, index) => {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeCloseTo(expected[index], precision);
  });
}

function expectReplay(result) {
  let previous = null;
  for (const sample of result.samples) {
    const options = previous ? {
      ...result.base,
      phase: previous.phase,
      actualAlpha: previous.alpha, actualFeather: previous.feather,
      actualAlphaRate: previous.alphaRate, actualFeatherRate: previous.featherRate
    } : result.base;
    const expected = drive(options, previous ? sample.seconds - previous.seconds : 0);
    for (const key of ['phase', 'alpha', 'feather', 'commandAlpha', 'commandFeather',
      'alphaRate', 'featherRate', 'alphaError', 'featherError', 'jointError', 'errorAngle']) {
      expect(Math.abs(sample[key] - expected[key]), key + ' at ' + sample.seconds + ' s').toBeLessThan(1e-7);
    }
    expect(sample.slewing).toBe(expected.slewing);
    expect(sample.smooth).toBe(expected.smooth);
    previous = sample;
  }
}

describe('space station map array motion forecast', () => {
  it('uses a ten-minute default horizon with an initial sample and fifteen-second spacing', () => {
    const result = forecast();
    expect(result.horizonSeconds).toBe(600);
    expect(result.sampleSeconds).toBe(15);
    expect(result.samples).toHaveLength(41);
    expect(result.samples.map(sample => sample.seconds)).toEqual(Array.from({ length: 41 }, (_, index) => index * 15));
    expect(result.base).toMatchObject({
      phase: 35, beta: 20, tracking: true, motorEnabled: false,
      motorSmooth: false, motorRate: .08, motorAcceleration: .002,
      actualAlpha: 35, actualFeather: -20, actualAlphaRate: 0, actualFeatherRate: 0
    });
    expect(result.samples[0]).toMatchObject({ phase: 35, alpha: 35, feather: -20, seconds: 0 });
    expect(forecast(null)).toEqual(result);
    expect(forecast({})).toEqual(result);
  });

  it('sanitizes the horizon and includes an exact endpoint without duplicate samples', () => {
    for (const value of [undefined, null, '', NaN, Infinity, -Infinity, 'corrupt']) {
      expect(forecast({}, value).horizonSeconds).toBe(600);
    }
    for (const [input, horizon, times] of [
      [-10, 0, [0]], [0, 0, [0]], [.125, .125, [0, .125]],
      [15, 15, [0, 15]], [31.75, 31.75, [0, 15, 30, 31.75]],
      ['30', 30, [0, 15, 30]]
    ]) {
      const result = forecast({}, input);
      expect(result.horizonSeconds).toBe(horizon);
      expect(result.samples.map(sample => sample.seconds)).toEqual(times);
      expect(new Set(result.samples.map(sample => sample.seconds)).size).toBe(result.samples.length);
    }
    const capped = forecast({}, 5000);
    expect(capped.horizonSeconds).toBe(1200);
    expect(capped.samples).toHaveLength(81);
    expect(capped.samples.at(-1).seconds).toBe(1200);
  });

  it('exposes a sanitized physical base suitable for reproducing the initial state', () => {
    const options = {
      phase: -1, beta: 100, tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: 2, motorAcceleration: -1, arrayAlpha: 540, arrayFeather: 200,
      actualAlpha: 270, actualFeather: 130, actualAlphaRate: 8, actualFeatherRate: -8
    };
    const result = forecast(options, 0);
    expect(result.base).toMatchObject({
      phase: 359, beta: 80, tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: 1, motorAcceleration: .0001, arrayAlpha: 180, arrayFeather: 90,
      actualAlpha: -90, actualFeather: 90, actualAlphaRate: 1, actualFeatherRate: -1
    });
    const initial = drive(options, 0);
    for (const key of ['phase', 'alpha', 'feather', 'alphaRate', 'featherRate', 'commandAlpha', 'commandFeather']) {
      expect(result.samples[0][key]).toBe(initial[key]);
    }
    expectReplay(result);
  });

  it('replays cached states exactly by advancing sequentially with both angular rates', () => {
    const cases = [
      { phase: 350, beta: 25, tracking: false, motorEnabled: true, motorRate: .2,
        arrayAlpha: -160, arrayFeather: 12, actualAlpha: 170, actualFeather: -35 },
      { phase: 90, beta: 20, tracking: false, motorEnabled: true, motorSmooth: true,
        motorRate: .2, motorAcceleration: .002, arrayAlpha: -60, arrayFeather: 70,
        actualAlpha: 20, actualFeather: -10, actualAlphaRate: .12, actualFeatherRate: -.09 },
      { phase: 358, beta: 40, tracking: true, motorEnabled: true, motorSmooth: true,
        motorRate: .2, motorAcceleration: .01, actualAlpha: -30, actualFeather: 10,
        actualAlphaRate: -.04, actualFeatherRate: .02 }
    ];
    for (const options of cases) {
      const result = forecast(options, 133.4);
      expect(result.samples.at(-1).seconds).toBe(133.4);
      expectReplay(result);
    }
  });

  it('preserves nonzero initial velocity and forecasts braking before reversing', () => {
    const options = {
      phase: 35, tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: .2, motorAcceleration: .002, arrayAlpha: -90, arrayFeather: 70,
      actualAlpha: 0, actualFeather: 0, actualAlphaRate: .12, actualFeatherRate: -.12
    };
    const result = forecast(options, 120);
    const start = result.samples[0], first = result.samples[1], end = result.samples.at(-1);
    expect(start).toMatchObject({ alpha: 0, feather: 0, alphaRate: .12, featherRate: -.12 });
    expect(first.alpha).toBeGreaterThan(start.alpha);
    expect(first.feather).toBeLessThan(start.feather);
    expect(first.alphaRate).toBeGreaterThan(0);
    expect(first.featherRate).toBeLessThan(0);
    expect(first.alphaRate).toBeLessThan(start.alphaRate);
    expect(Math.abs(first.featherRate)).toBeLessThan(Math.abs(start.featherRate));
    expect(end.alphaRate).toBeLessThan(0);
    expect(end.featherRate).toBeGreaterThan(0);
    for (let index = 1; index < result.samples.length; index++) {
      const previous = result.samples[index - 1], next = result.samples[index];
      const maxChange = options.motorAcceleration * (next.seconds - previous.seconds);
      expect(Math.abs(next.alphaRate - previous.alphaRate)).toBeLessThanOrEqual(maxChange + 1e-9);
      expect(Math.abs(next.featherRate - previous.featherRate)).toBeLessThanOrEqual(maxChange + 1e-9);
    }
  });

  it('advances the orbit and Sun while a held manual pose remains stationary', () => {
    const options = {
      phase: 359, beta: 30, tracking: false, motorEnabled: true, motorRate: 0,
      arrayAlpha: -30, arrayFeather: 25, actualAlpha: -30, actualFeather: 25
    };
    const result = forecast(options, 90);
    for (const sample of result.samples) {
      expect(sample.alpha).toBe(-30);
      expect(sample.feather).toBe(25);
      expect(sample.phase).toBeCloseTo(phaseWrap(options.phase + orbitRate * sample.seconds), 9);
      expectVector(sample.normal, expectedNormal(-30, 25));
      expectVector(sample.corner, expectedCorner(-30, 25));
    }
    expect(result.samples.at(-1).phase).toBeLessThan(10);
    expect(result.samples.at(-1).sun).not.toEqual(result.samples[0].sun);
  });

  it('follows the moving Sun in instant tracking and reveals lag with a slow motor', () => {
    const ideal = forecast({ phase: 350, beta: 40, tracking: true }, 300);
    for (const sample of ideal.samples) {
      expect(angularDifference(sample.alpha, sample.phase)).toBeCloseTo(0, 9);
      expect(sample.feather).toBe(-40);
      expectVector(sample.normal, sample.sun);
      expect(sample.incidence).toBeCloseTo(1, 10);
    }
    const slow = forecast({
      phase: 0, beta: 0, tracking: true, motorEnabled: true, motorRate: .02,
      actualAlpha: 0, actualFeather: 0
    }, 600);
    const end = slow.samples.at(-1);
    const expectedLag = (orbitRate - .02) * 600;
    expect(end.alpha).toBeCloseTo(12, 8);
    expect(end.alphaError).toBeCloseTo(expectedLag, 8);
    expect(end.incidence).toBeCloseTo(Math.cos(expectedLag * radians), 10);
    expect(end.generation).toBeCloseTo(end.incidence, 10);
    expect(end.generation).toBeLessThan(.95);
  });

  it('uses each future actual normal for front-face collection and suppresses generation in eclipse', () => {
    const result = forecast({
      phase: 90, beta: 0, tracking: false, arrayAlpha: 90, arrayFeather: 0
    }, 1200);
    expect(result.samples.some(sample => !sample.eclipse)).toBe(true);
    expect(result.samples.some(sample => sample.eclipse)).toBe(true);
    for (const sample of result.samples) {
      const p = sample.phase * radians;
      const expectedSun = [0, Math.cos(p), Math.sin(p)];
      const normal = expectedNormal(sample.alpha, sample.feather);
      const cosine = normal.reduce((sum, value, axis) => sum + value * expectedSun[axis], 0);
      const expected = lighting({ phase: sample.phase, beta: 0, tracking: false, normal });
      expectVector(sample.sun, expectedSun);
      expectVector(sample.normal, normal);
      expect(sample.incidence).toBeCloseTo(Math.max(0, Math.min(1, cosine)), 10);
      expect(sample.eclipse).toBe(expected.eclipse);
      expect(sample.generation).toBeCloseTo(sample.eclipse ? 0 : sample.incidence, 10);
      if (sample.eclipse) expect(sample.incidence).toBeGreaterThan(0);
    }
  });

  it('keeps high-beta orbits sunlit and gives rear-facing arrays no front-face power', () => {
    const highBeta = forecast({ phase: 160, beta: 80, tracking: true }, 1200);
    expect(highBeta.samples.every(sample => !sample.eclipse)).toBe(true);
    for (const sample of highBeta.samples) {
      expect(sample.generation).toBeCloseTo(1, 10);
      expect(sample.generation).toBe(sample.incidence);
    }
    const rear = forecast({ phase: 0, beta: 0, tracking: false, arrayAlpha: 180, arrayFeather: 0 }, 30);
    for (const sample of rear.samples) {
      expect(sample.eclipse).toBe(false);
      expect(sample.incidence).toBe(0);
      expect(sample.generation).toBe(0);
    }
  });

  it('rotates the physical corner with both joints without adding a station pivot translation', () => {
    for (const [alpha, feather] of [[0, 0], [90, 0], [0, 90], [-120, 37], [180, -90]]) {
      const sample = forecast({ tracking: false, arrayAlpha: alpha, arrayFeather: feather }, 0).samples[0];
      expectVector(sample.corner, expectedCorner(alpha, feather));
      expect(Math.hypot(...sample.corner)).toBeCloseTo(tipRadius, 10);
      expectVector(sample.normal, expectedNormal(alpha, feather));
      expect(Math.hypot(...sample.normal)).toBeCloseTo(1, 10);
    }
  });

  it('draws a continuous physical tip path when the alpha representation crosses 180 degrees', () => {
    const result = forecast({
      phase: 35, beta: 20, tracking: false, motorEnabled: true, motorRate: .2,
      arrayAlpha: -170, arrayFeather: -20, actualAlpha: 170, actualFeather: -20
    }, 180);
    expect(result.samples.some(sample => sample.alpha > 170)).toBe(true);
    expect(result.samples.some(sample => sample.alpha < -170)).toBe(true);
    expect(result.samples.at(-1).alpha).toBeCloseTo(-170, 9);
    for (let index = 0; index < result.samples.length; index++) {
      const sample = result.samples[index];
      expectVector(sample.corner, expectedCorner(sample.alpha, sample.feather));
      if (!index) continue;
      const previous = result.samples[index - 1], elapsed = sample.seconds - previous.seconds;
      const separation = Math.hypot(...sample.corner.map((value, axis) => value - previous.corner[axis]));
      expect(separation).toBeLessThanOrEqual(tipRadius * .2 * elapsed * radians + 1e-9);
      expect(Math.abs(angularDifference(sample.alpha, previous.alpha))).toBeLessThanOrEqual(.2 * elapsed + 1e-9);
    }
  });

  it('never mutates input or aliases vector arrays between cached samples', () => {
    const options = Object.freeze({
      phase: 30, beta: 20, tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: .2, motorAcceleration: .01, arrayAlpha: 80, arrayFeather: -50,
      actualAlpha: 0, actualFeather: 30, actualAlphaRate: .1, actualFeatherRate: -.02
    });
    const original = { ...options }, result = forecast(options, 45);
    const originalResult = JSON.parse(JSON.stringify(result));
    expect(options).toEqual(original);
    for (const field of ['normal', 'sun', 'corner']) {
      expect(new Set(result.samples.map(sample => sample[field])).size).toBe(result.samples.length);
      result.samples[0][field][0] = 999;
      expect(result.samples[1][field][0]).toBe(originalResult.samples[1][field][0]);
    }
    result.base.actualAlpha = 999;
    expect(options).toEqual(original);
    expect(forecast(options, 45)).toEqual(originalResult);
  });

  it('keeps every cached numeric value and physical vector finite for invalid numeric inputs', () => {
    const result = forecast({
      phase: Infinity, beta: NaN, tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: 'corrupt', motorAcceleration: -Infinity,
      arrayAlpha: NaN, arrayFeather: Infinity,
      actualAlpha: 'corrupt', actualFeather: NaN,
      actualAlphaRate: Infinity, actualFeatherRate: 'corrupt'
    }, 31.5);
    for (const value of Object.values(result.base)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
    for (const sample of result.samples) {
      for (const value of Object.values(sample)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      for (const field of ['normal', 'sun', 'corner']) {
        expect(sample[field]).toHaveLength(3);
        expect(sample[field].every(Number.isFinite)).toBe(true);
      }
      expect(sample.incidence).toBeGreaterThanOrEqual(0);
      expect(sample.incidence).toBeLessThanOrEqual(1);
      expect(sample.generation).toBeGreaterThanOrEqual(0);
      expect(sample.generation).toBeLessThanOrEqual(1);
    }
    expectReplay(result);
  });
});
