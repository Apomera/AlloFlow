import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { timeline, forecast, drive, lighting } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { timeline: issMapEclipseTimeline, forecast: issMapDriveForecast, drive: issMapDriveStep, lighting: issMapLighting };'
)();
const radians = Math.PI / 180;
const radiusRatio = 6371 / (6371 + 420);
const period = 2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418);
const orbitRate = 360 / period;

function shadowBounds(beta) {
  const cutoff = Math.sqrt(1 - radiusRatio ** 2) / Math.cos(beta * radians);
  const half = cutoff < 1 - 1e-12 ? Math.acos(cutoff) / radians : 0;
  return half > 0 ? { entry: 180 - half, exit: 180 + half } : null;
}

function expectPartition(result, options) {
  expect(result.intervals.length).toBeGreaterThan(0);
  expect(result.intervals[0].startSeconds).toBe(0);
  expect(result.intervals.at(-1).endSeconds).toBe(result.horizonSeconds);
  let totalShadow = 0;
  for (let index = 0; index < result.intervals.length; index++) {
    const interval = result.intervals[index];
    expect(interval.endSeconds).toBeGreaterThan(interval.startSeconds);
    if (index) {
      expect(interval.startSeconds).toBe(result.intervals[index - 1].endSeconds);
      expect(interval.eclipse).not.toBe(result.intervals[index - 1].eclipse);
    }
    const middle = (interval.startSeconds + interval.endSeconds) / 2;
    const initial = lighting(options);
    expect(interval.eclipse).toBe(lighting({
      phase: initial.phase + middle * orbitRate, beta: initial.beta
    }).eclipse);
    if (interval.eclipse) totalShadow += interval.endSeconds - interval.startSeconds;
  }
  expect(result.shadowSeconds).toBeCloseTo(totalShadow, 8);
  expect(result.events).toHaveLength(result.intervals.length - 1);
  result.events.forEach((event, index) => {
    expect(event.seconds).toBe(result.intervals[index].endSeconds);
    expect(event.seconds).toBeGreaterThan(1e-8);
    expect(event.seconds).toBeLessThan(result.horizonSeconds - 1e-8);
    expect(event.type).toBe(result.intervals[index + 1].eclipse ? 'sunset' : 'sunrise');
  });
}

function grazingCase(duration = 5, center = 7.5) {
  const half = duration * orbitRate / 2 * radians;
  const beta = Math.acos(Math.sqrt(1 - radiusRatio ** 2) / Math.cos(half)) / radians;
  return { phase: 180 - center * orbitRate, beta };
}

function incidenceAt(result, seconds) {
  const previous = result.samples.filter(sample => sample.seconds <= seconds).at(-1);
  const pose = drive({
    ...result.base, phase: previous.phase,
    actualAlpha: previous.alpha, actualFeather: previous.feather,
    actualAlphaRate: previous.alphaRate, actualFeatherRate: previous.featherRate
  }, seconds - previous.seconds);
  const a = pose.alpha * radians, f = pose.feather * radians;
  const b = result.base.beta * radians, p = pose.phase * radians;
  const normal = [-Math.sin(f), Math.cos(a) * Math.cos(f), Math.sin(a) * Math.cos(f)];
  const sun = [Math.sin(b), Math.cos(b) * Math.cos(p), Math.cos(b) * Math.sin(p)];
  return Math.max(0, Math.min(1, normal.reduce((sum, value, axis) => sum + value * sun[axis], 0)));
}

describe('space station map sunlight timeline', () => {
  it('partitions the default horizon and computes exact analytical entry time', () => {
    const bounds = shadowBounds(20);
    const options = { phase: bounds.entry - 12, beta: 20 };
    const result = timeline(options);
    const sunset = 12 / orbitRate;
    expect(result.horizonSeconds).toBe(600);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('sunset');
    expect(result.events[0].seconds).toBeCloseTo(sunset, 8);
    expect(result.intervals).toHaveLength(2);
    expect(result.intervals[0].eclipse).toBe(false);
    expect(result.intervals[1].eclipse).toBe(true);
    expect(result.shadowSeconds).toBeCloseTo(600 - sunset, 8);
    expectPartition(result, options);
  });

  it('preserves eclipse already in progress and finds its exact sunrise', () => {
    const options = { phase: shadowBounds(0).exit - 50 * orbitRate, beta: 0 };
    const result = timeline(options, 150);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('sunrise');
    expect(result.events[0].seconds).toBeCloseTo(50, 8);
    expect(result.intervals.map(interval => interval.eclipse)).toEqual([true, false]);
    expect(result.shadowSeconds).toBeCloseTo(50, 8);
    expectPartition(result, options);
    const full = timeline({ phase: 180, beta: 0 }, 300);
    expect(full.intervals).toEqual([{ startSeconds: 0, endSeconds: 300, eclipse: true }]);
    expect(full.events).toEqual([]);
    expect(full.shadowSeconds).toBe(300);
  });

  it('excludes horizon-edge events without creating zero-length intervals', () => {
    const bounds = shadowBounds(0), horizon = 120;
    const cases = [
      [{ phase: bounds.entry, beta: 0 }, true],
      [{ phase: bounds.exit, beta: 0 }, false],
      [{ phase: bounds.entry - horizon * orbitRate, beta: 0 }, false],
      [{ phase: bounds.exit - horizon * orbitRate, beta: 0 }, true]
    ];
    for (const [options, eclipse] of cases) {
      const result = timeline(options, horizon);
      expect(result.events).toEqual([]);
      expect(result.intervals).toEqual([{ startSeconds: 0, endSeconds: horizon, eclipse }]);
      expect(result.shadowSeconds).toBe(eclipse ? horizon : 0);
    }
  });

  it('normalizes wrapped phases while maintaining increasing absolute event times', () => {
    const base = { phase: shadowBounds(30).entry - 6, beta: 30 };
    const expected = timeline(base, 600);
    for (const turns of [-3, -1, 1, 4]) {
      const actual = timeline({ ...base, phase: base.phase + turns * 360 }, 600);
      expect(actual.events).toHaveLength(expected.events.length);
      expect(actual.events[0].seconds).toBeCloseTo(expected.events[0].seconds, 8);
      expect(actual.shadowSeconds).toBeCloseTo(expected.shadowSeconds, 8);
      expectPartition(actual, { ...base, phase: base.phase + turns * 360 });
    }
    const seam = timeline({ phase: 350, beta: 0 }, 600);
    expect(seam.intervals).toEqual([{ startSeconds: 0, endSeconds: 600, eclipse: false }]);
    expect(seam.events).toEqual([]);
  });

  it('keeps high-beta and exactly grazing orbits sunlit', () => {
    const criticalBeta = Math.asin(radiusRatio) / radians;
    for (const beta of [criticalBeta, 80, 100]) {
      const result = timeline({ phase: 179, beta }, 1200);
      expect(result.events).toEqual([]);
      expect(result.intervals).toEqual([{ startSeconds: 0, endSeconds: 1200, eclipse: false }]);
      expect(result.shadowSeconds).toBe(0);
    }
  });

  it('detects a five-second grazing eclipse between fifteen-second pose samples', () => {
    const options = grazingCase();
    const result = timeline(options, 30);
    expect(result.events.map(event => event.type)).toEqual(['sunset', 'sunrise']);
    expect(result.events[0].seconds).toBeCloseTo(5, 6);
    expect(result.events[1].seconds).toBeCloseTo(10, 6);
    expect(result.shadowSeconds).toBeCloseTo(5, 6);
    expect(result.intervals.map(interval => interval.eclipse)).toEqual([false, true, false]);
    expectPartition(result, options);
    for (const seconds of [0, 15, 30]) {
      expect(lighting({ phase: options.phase + seconds * orbitRate, beta: options.beta }).eclipse).toBe(false);
    }
  });

  it('uses fractional horizons and sanitizes missing, nonfinite and out-of-range inputs', () => {
    const expected = timeline();
    expect(timeline(null)).toEqual(expected);
    for (const horizon of [undefined, null, '', NaN, Infinity, -Infinity, 'bad']) {
      expect(timeline({}, horizon).horizonSeconds).toBe(600);
    }
    for (const horizon of [0, -5]) {
      expect(timeline({}, horizon)).toEqual({ horizonSeconds: 0, intervals: [], events: [], shadowSeconds: 0 });
    }
    expect(timeline({}, 9999).horizonSeconds).toBe(1200);
    const fraction = timeline({ phase: '15', beta: '80' }, '31.75');
    expect(fraction).toEqual({
      horizonSeconds: 31.75,
      intervals: [{ startSeconds: 0, endSeconds: 31.75, eclipse: false }],
      events: [], shadowSeconds: 0
    });
    expect(timeline({ phase: NaN, beta: Infinity })).toEqual(expected);
  });

  it('covers the full horizon without overlaps across representative orbital states', () => {
    for (const beta of [0, 20, 60, 69, 75, 80]) {
      for (const phase of [0, 100, 150, 180, 215, 270, 359]) {
        const options = { phase, beta };
        const result = timeline(options, 1199.125);
        expectPartition(result, options);
        expect(result.shadowSeconds).toBeGreaterThanOrEqual(0);
        expect(result.shadowSeconds).toBeLessThanOrEqual(result.horizonSeconds);
      }
    }
  });

  it('adds disconnected generation segments with exact endpoints and interior cached samples', () => {
    const options = { ...grazingCase(), tracking: true };
    const result = forecast(options, 30);
    const sun = result.sunlight, expected = timeline(options, 30);
    expect(sun.horizonSeconds).toBe(30);
    expect(sun.events).toEqual(expected.events);
    expect(sun.shadowSeconds).toBeCloseTo(5, 6);
    expect(sun.intervals).toHaveLength(3);
    expect(result.samples.every(sample => !sample.eclipse)).toBe(true);
    sun.intervals.forEach((interval, index) => {
      expect(interval).toMatchObject(expected.intervals[index]);
      const points = interval.points;
      const interior = result.samples.filter(sample =>
        sample.seconds > interval.startSeconds && sample.seconds < interval.endSeconds);
      expect(points.map(point => point.seconds)).toEqual([
        interval.startSeconds, ...interior.map(sample => sample.seconds), interval.endSeconds
      ]);
      expect(new Set(points.map(point => point.seconds)).size).toBe(points.length);
      points.forEach(point => expect(point.generation).toBeCloseTo(interval.eclipse ? 0 : 1, 8));
    });
    expect(sun.intervals[0].points.at(-1).seconds).toBe(sun.intervals[1].points[0].seconds);
    expect(sun.intervals[0].points.at(-1).generation).toBeCloseTo(1, 8);
    expect(sun.intervals[1].points[0].generation).toBe(0);
    expect(sun.intervals[1].points.at(-1).generation).toBe(0);
    expect(sun.intervals[2].points[0].generation).toBeCloseTo(1, 8);
  });

  it('replays actual motor orientation at fractional event endpoints instead of ideal pointing', () => {
    const eventTime = 22.75;
    const options = {
      phase: shadowBounds(20).exit - eventTime * orbitRate, beta: 20,
      tracking: true, motorEnabled: true, motorSmooth: true,
      motorRate: .2, motorAcceleration: .002,
      actualAlpha: -100, actualFeather: 10, actualAlphaRate: .12, actualFeatherRate: -.08
    };
    const result = forecast(options, 75.125);
    const sun = result.sunlight;
    expect(sun.events[0].type).toBe('sunrise');
    expect(sun.events[0].seconds).toBeCloseTo(eventTime, 8);
    expect(sun.intervals.map(interval => interval.eclipse)).toEqual([true, false]);
    const entry = sun.intervals[1].points[0];
    expect(entry.seconds).toBeCloseTo(eventTime, 8);
    expect(entry.generation).toBeGreaterThan(.2);
    expect(entry.generation).toBeLessThan(.95);
    for (const interval of sun.intervals) {
      for (const point of interval.points) {
        expect(Number.isFinite(point.generation)).toBe(true);
        expect(point.generation).toBeCloseTo(interval.eclipse ? 0 : incidenceAt(result, point.seconds), 9);
      }
    }
  });

  it('matches cached solar input throughout each segment and keeps shadow samples at zero', () => {
    const options = {
      phase: shadowBounds(0).entry - 23.5 * orbitRate, beta: 0,
      tracking: false, motorEnabled: true, motorSmooth: true,
      motorRate: .1, motorAcceleration: .002, arrayAlpha: 120, arrayFeather: 35,
      actualAlpha: 80, actualFeather: 0, actualAlphaRate: .05, actualFeatherRate: .03
    };
    const result = forecast(options, 90.25);
    let shadowSamples = 0, sunlightSamples = 0;
    for (const interval of result.sunlight.intervals) {
      for (const sample of result.samples) {
        if (sample.seconds < interval.startSeconds || sample.seconds > interval.endSeconds) continue;
        const point = interval.points.find(value => value.seconds === sample.seconds);
        expect(point).toBeDefined();
        expect(point.generation).toBeCloseTo(sample.generation, 10);
        if (interval.eclipse) {
          shadowSamples++;
          expect(point.generation).toBe(0);
        } else sunlightSamples++;
      }
    }
    expect(shadowSamples).toBeGreaterThan(0);
    expect(sunlightSamples).toBeGreaterThan(0);
    const shadow = forecast({ phase: 180, beta: 0, tracking: true }, 90);
    expect(shadow.sunlight.intervals).toHaveLength(1);
    expect(shadow.sunlight.intervals[0].points.every(point => point.generation === 0)).toBe(true);
  });

  it('handles a zero-length forecast and does not mutate inputs or share output point arrays', () => {
    const options = Object.freeze({
      ...grazingCase(), tracking: true, motorEnabled: true,
      motorSmooth: true, actualAlpha: 170, actualFeather: -60,
      actualAlphaRate: .1, actualFeatherRate: -.04
    });
    const before = JSON.stringify(options);
    expect(forecast(options, 0).sunlight).toEqual({
      horizonSeconds: 0, intervals: [], events: [], shadowSeconds: 0
    });
    const first = forecast(options, 30), second = forecast(options, 30);
    expect(JSON.stringify(options)).toBe(before);
    expect(first).toEqual(second);
    const original = second.sunlight.intervals[0].points[0].generation;
    first.sunlight.intervals[0].points[0].generation = 123;
    first.sunlight.events[0].seconds = -123;
    expect(second.sunlight.intervals[0].points[0].generation).toBe(original);
    expect(second.sunlight.events[0].seconds).toBeGreaterThan(0);
    expect(first.sunlight.intervals[0].points).not.toBe(first.sunlight.intervals[1].points);
    expect(first.sunlight.intervals[1].points[0].generation).toBe(0);
  });
});
