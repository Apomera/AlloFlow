import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { forecast, at, crossings, guide, lighting } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { forecast: issMapDriveForecast, at: issMapForecastAt, crossings: issMapForecastCrossings, guide: issMapForecastGuide, lighting: issMapLighting };'
)();
const radians = Math.PI / 180;
const ratio = 6371 / (6371 + 420);
const period = 2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418);
const orbitRate = 360 / period;
const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const normalize = vector => vector.map(value => value / Math.hypot(...vector));
const offset = (point, origin) => point.map((value, axis) => value - origin[axis]);

function expectVector(actual, expected, precision = 9) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, axis) => {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeCloseTo(expected[axis], precision);
  });
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function grazingCase(duration = .4, center = 7.5) {
  const half = duration * orbitRate / 2 * radians;
  const beta = Math.acos(Math.sqrt(1 - ratio ** 2) / Math.cos(half)) / radians;
  return { phase: 180 - center * orbitRate, beta, tracking: true };
}

function entryPhase(beta) {
  return 180 - Math.acos(Math.sqrt(1 - ratio ** 2) / Math.cos(beta * radians)) / radians;
}

function expectArc(result) {
  expect(result.arc).toHaveLength(33);
  expect(Math.hypot(...result.normal)).toBeCloseTo(1, 10);
  expect(Math.hypot(...result.sun)).toBeCloseTo(1, 10);
  expect(result.angle).toBeGreaterThanOrEqual(0);
  expect(result.angle).toBeLessThanOrEqual(180);
  expectVector(result.arc[0], result.origin.map((value, axis) => value + .85 * result.normal[axis]));
  expectVector(result.arc.at(-1), result.origin.map((value, axis) => value + .85 * result.sun[axis]));
  result.arc.forEach((point, index) => {
    point.forEach(value => expect(Number.isFinite(value)).toBe(true));
    const direction = offset(point, result.origin).map(value => value / .85);
    expect(Math.hypot(...offset(point, result.origin))).toBeCloseTo(.85, 9);
    expect(dot(direction, result.normal)).toBeCloseTo(Math.cos(result.angle * radians * index / 32), 8);
    if (index) {
      const previous = offset(result.arc[index - 1], result.origin).map(value => value / .85);
      expect(dot(direction, previous)).toBeCloseTo(Math.cos(result.angle * radians / 32), 8);
    }
  });
}

describe('space station forecast shadow-crossing inspection', () => {
  it('provides one-second observation points around separated events', () => {
    const input = freezeDeep({ horizonSeconds: 600, sunlight: { events: [
      { type: 'sunset', seconds: 31.75 }, { type: 'sunrise', seconds: 421.125 }
    ] } });
    expect(crossings(input)).toEqual([
      { type: 'sunset', seconds: 31.75, beforeSeconds: 30.75, afterSeconds: 32.75 },
      { type: 'sunrise', seconds: 421.125, beforeSeconds: 420.125, afterSeconds: 422.125 }
    ]);
  });

  it('keeps observation points within a subsecond shadow interval', () => {
    const result = crossings({ horizonSeconds: 30, sunlight: { events: [
      { type: 'sunset', seconds: 7.3 }, { type: 'sunrise', seconds: 7.7 }
    ] } });
    expect(result[0].beforeSeconds).toBeCloseTo(6.3, 10);
    expect(result[0].afterSeconds).toBeCloseTo(7.5, 10);
    expect(result[1].beforeSeconds).toBeCloseTo(7.5, 10);
    expect(result[1].afterSeconds).toBeCloseTo(8.7, 10);
    expect(result[0].afterSeconds).toBeLessThan(result[1].seconds);
    expect(result[1].beforeSeconds).toBeGreaterThan(result[0].seconds);
  });

  it('stays strictly inside the horizon near the start and end', () => {
    const result = crossings({ horizonSeconds: 10, sunlight: { events: [
      { type: 'sunset', seconds: .02 }, { type: 'sunrise', seconds: 9.99 }
    ] } });
    expect(result[0].beforeSeconds).toBeCloseTo(.01, 12);
    expect(result[0].afterSeconds).toBeCloseTo(1.02, 12);
    expect(result[1].beforeSeconds).toBeCloseTo(8.99, 12);
    expect(result[1].afterSeconds).toBeCloseTo(9.995, 12);
    expect(result[0].beforeSeconds).toBeGreaterThan(0);
    expect(result[1].afterSeconds).toBeLessThan(10);
  });

  it('returns no observations without a forecast or an interior crossing', () => {
    expect(crossings()).toEqual([]);
    expect(crossings(null)).toEqual([]);
    expect(crossings(forecast({ phase: 180, beta: 80 }, 600))).toEqual([]);
    expect(crossings(forecast({ phase: 180, beta: 0 }, 60))).toEqual([]);
    expect(crossings(forecast({}, 0))).toEqual([]);
  });

  it('selects the physical sunlight and shadow sides of ordinary and grazing events', () => {
    for (const options of [
      { phase: entryPhase(20) - 31.75 * orbitRate, beta: 20, tracking: true },
      grazingCase()
    ]) {
      const result = forecast(options, 600);
      const events = crossings(result);
      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        const before = at(result, event.beforeSeconds), after = at(result, event.afterSeconds);
        expect(before.eclipse).toBe(event.type === 'sunrise');
        expect(after.eclipse).toBe(event.type === 'sunset');
        expect(before.eclipse).toBe(lighting({ phase: options.phase + event.beforeSeconds * orbitRate, beta: options.beta }).eclipse);
        expect(after.eclipse).toBe(lighting({ phase: options.phase + event.afterSeconds * orbitRate, beta: options.beta }).eclipse);
        expect(before.generation).toBeCloseTo(before.eclipse ? 0 : 1, 8);
        expect(after.generation).toBeCloseTo(after.eclipse ? 0 : 1, 8);
      }
      if (options.beta > 60) {
        expect(events).toHaveLength(2);
        expect(events[1].seconds - events[0].seconds).toBeCloseTo(.4, 5);
      }
    }
  });

  it('returns independent records without changing cached events', () => {
    const result = freezeDeep(forecast(grazingCase(), 30));
    const before = JSON.stringify(result), first = crossings(result), expected = crossings(result);
    first[0].seconds = -99;
    first[0].type = 'changed';
    first[0].beforeSeconds = -88;
    expect(crossings(result)).toEqual(expected);
    expect(JSON.stringify(result)).toBe(before);
  });
});

describe('space station forecast Sun-angle geometry', () => {
  it('has no geometry without a selected sample', () => {
    expect(guide()).toBeNull();
    expect(guide(null)).toBeNull();
  });

  it('anchors the guide at the future panel center using both joint rotations', () => {
    const result = forecast({
      phase: 350, beta: 25, tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: .2, motorAcceleration: .002, arrayAlpha: -100, arrayFeather: 65,
      actualAlpha: 140, actualFeather: -20, actualAlphaRate: .12, actualFeatherRate: -.09
    }, 600);
    for (const seconds of [0, .1, 16.125, 289.37, 600]) {
      const sample = at(result, seconds), visual = guide(sample);
      const alpha = sample.alpha * radians, feather = sample.feather * radians;
      expectVector(visual.origin, [
        -.02 * Math.sin(feather),
        .02 * Math.cos(feather) * Math.cos(alpha) - 2 * Math.sin(alpha),
        .02 * Math.cos(feather) * Math.sin(alpha) + 2 * Math.cos(alpha)
      ]);
      expectVector(visual.normal, [-Math.sin(feather), Math.cos(alpha) * Math.cos(feather), Math.sin(alpha) * Math.cos(feather)]);
      const beta = result.base.beta * radians, phase = sample.phase * radians;
      expectVector(visual.sun, [Math.sin(beta), Math.cos(beta) * Math.cos(phase), Math.cos(beta) * Math.sin(phase)]);
      expect(visual.angle).toBeCloseTo(Math.acos(Math.max(-1, Math.min(1, dot(visual.normal, visual.sun)))) / radians, 8);
      expectArc(visual);
    }
  });

  it('shows the full front-to-Sun angle even when the array faces away', () => {
    const result = forecast({ phase: 0, beta: 0, tracking: false, arrayAlpha: 120, arrayFeather: 0 }, 0);
    const sample = at(result, 0), visual = guide(sample);
    expect(sample.eclipse).toBe(false);
    expect(sample.incidence).toBe(0);
    expect(sample.generation).toBe(0);
    expect(visual.angle).toBeCloseTo(120, 10);
    expectArc(visual);
  });

  it('normalizes direction magnitudes without changing the measured angle', () => {
    const sample = at(forecast({ phase: 25, beta: 30, tracking: false, arrayAlpha: -55, arrayFeather: 15 }, 0), 0);
    const scaled = { ...sample, normal: sample.normal.map(value => 3 * value), sun: sample.sun.map(value => 7 * value) };
    const expected = guide(sample), actual = guide(freezeDeep(scaled));
    expectVector(actual.normal, normalize(scaled.normal));
    expectVector(actual.sun, normalize(scaled.sun));
    expect(actual.angle).toBeCloseTo(expected.angle, 9);
    expectArc(actual);
  });

  it('keeps aligned and opposite directions finite with deterministic arcs', () => {
    for (const alpha of [0, 180]) {
      const sample = at(forecast({ phase: 0, beta: 0, tracking: false, arrayAlpha: alpha, arrayFeather: 0 }, 0), 0);
      const visual = guide(freezeDeep(sample));
      expect(visual.angle).toBeCloseTo(alpha, 8);
      expectArc(visual);
      expect(guide(sample)).toEqual(visual);
    }
  });

  it('preserves physical directions through the orbital and joint wrap', () => {
    const options = { phase: 359.99, beta: 25, tracking: true };
    const result = forecast(options, 1);
    const before = guide(at(result, 0)), after = guide(at(result, .5));
    expect(before.angle).toBeLessThan(1e-5);
    expect(after.angle).toBeLessThan(1e-5);
    expectVector(after.normal, after.sun);
    expect(Math.hypot(...offset(after.normal, before.normal))).toBeLessThan(.001);
    expectArc(before);
    expectArc(after);
    const equivalent = guide(at(forecast({ ...options, phase: options.phase - 720 }, 1), .5));
    expectVector(equivalent.origin, after.origin);
    expectVector(equivalent.normal, after.normal);
    expectVector(equivalent.sun, after.sun);
  });

  it('retains the geometric Sun direction while Earth blocks collection', () => {
    const sample = at(forecast({ phase: 180, beta: 20, tracking: true }, 60), 31.25);
    expect(sample.eclipse).toBe(true);
    expect(sample.generation).toBe(0);
    expect(sample.incidence).toBeCloseTo(1, 9);
    const visual = guide(sample);
    expectVector(visual.normal, sample.normal);
    expectVector(visual.sun, sample.sun);
    expect(visual.angle).toBeLessThan(1e-5);
    expectArc(visual);
  });

  it('is independent of selection order and does not share mutable sample vectors', () => {
    const result = freezeDeep(forecast({
      phase: 120, beta: 35, tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: .2, motorAcceleration: .004, arrayAlpha: -80, arrayFeather: -30,
      actualAlpha: 60, actualFeather: 20, actualAlphaRate: .1, actualFeatherRate: -.05
    }, 600));
    const samples = [at(result, 1.25), at(result, 301.875), at(result, 599.9)].map(freezeDeep);
    const before = JSON.stringify(samples), expected = samples.map(guide);
    for (const index of [2, 0, 1, 0, 2]) expect(guide(samples[index])).toEqual(expected[index]);
    const editable = guide(samples[1]);
    editable.normal[0] = 99;
    editable.sun[1] = 98;
    editable.origin[2] = 97;
    editable.arc[0][0] = 96;
    expect(guide(samples[1])).toEqual(expected[1]);
    expect(JSON.stringify(samples)).toBe(before);
  });
});
