import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('dev-tools/skyschool-clouds.js', 'utf8') + '\n' +
  readFileSync('dev-tools/skyschool-sky-life.js', 'utf8'), api);
const activity = api.getFlightSkyActivity, pose = api.getFlightAmbientJetPose;
const none = { balloons: false, birds: false, aircraft: false };

describe('shared decorative sky activity', () => {
  it('defaults omitted weather to a populated clear sky without mutating input', () => {
    const all = { balloons: true, birds: true, aircraft: true };
    expect(activity()).toEqual(all); expect(activity(null)).toEqual(all);
    const empty = Object.freeze({}); expect(activity(empty, false, 0)).toEqual(all);
    expect(activity(Object.freeze({ type: 'clear', wind: 0, visibility: 1 }), false, 1)).toEqual(all);
  });

  it('uses one weather policy for balloons, birds, and background aircraft', () => {
    const cases = [
      ['clear', 5, 1, [true, true, true]],
      ['breezy', 20, 1, [false, true, true]],
      ['gusty', 35, 0.9, [false, false, true]],
      ['overcast', 15, 0.7, [false, false, true]],
      ['stormy', 45, 0.4, [false, false, false]],
      ['foggy', 0, 1, [false, false, false]],
      ['partly_cloudy', 0, 1, [false, false, true]],
    ];
    for (const [type, wind, visibility, expected] of cases) {
      const result = activity({ type, wind, visibility }, false, 0);
      expect([result.balloons, result.birds, result.aircraft]).toEqual(expected);
    }
  });

  it('honors exact visibility and absolute wind boundaries independently', () => {
    for (const sign of [-1, 1]) {
      expect(activity({ type: 'breezy', wind: sign * 12, visibility: 0.75 }).balloons).toBe(true);
      expect(activity({ type: 'breezy', wind: sign * 12.01, visibility: 0.75 }).balloons).toBe(false);
      expect(activity({ type: 'breezy', wind: sign * 12, visibility: 0.749 }).balloons).toBe(false);
      expect(activity({ type: 'gusty', wind: sign * 25, visibility: 0.55 }).birds).toBe(true);
      expect(activity({ type: 'gusty', wind: sign * 25.01, visibility: 0.55 }).birds).toBe(false);
    }
    expect(activity({ visibility: 0.549 })).toEqual(none);
    expect(activity({ type: 'overcast', visibility: 0.55 }).aircraft).toBe(true);
  });

  it('suppresses optional moving scenery for reduced motion and the lowest quality tier', () => {
    for (const weather of [{}, { type: 'clear' }, { type: 'gusty' }, { type: 'overcast' }]) {
      expect(activity(weather, true, 0)).toEqual(none);
      expect(activity(weather, false, 2)).toEqual(none);
      expect(activity(weather, false, 3)).toEqual(none);
    }
    expect(activity({}, false, NaN)).toEqual(none);
  });

  it('fails conservatively for malformed explicitly supplied weather fields', () => {
    for (const weather of ['clear', [], { type: undefined }, { type: 'unrecognized' },
      { wind: NaN }, { wind: Infinity }, { wind: '5' }, { wind: undefined },
      { visibility: NaN }, { visibility: -0.1 }, { visibility: 1.1 }, { visibility: '1' }]) {
      expect(activity(weather)).toEqual(none);
    }
  });
});

describe('world-relative ambient jet routes', () => {
  it('reuses caller output and follows three distinct level routes with realistic cruise speed scale', () => {
    const output = { previous: true };
    for (const index of [0, 1, 2]) {
      const a = pose(index, 0, 0, 0), b = pose(index, 1, 0, 0, output);
      expect(b).toBe(output); expect(b.previous).toBe(true);
      expect(b.y).toBe(30000 + index * 4000); expect(a.y).toBe(b.y);
      const speed = Math.hypot(b.x - a.x, b.z - a.z);
      expect(speed).toBeCloseTo([720, 780, 750][index], 8);
      expect(Math.atan2(b.x - a.x, b.z - a.z)).toBeCloseTo(b.heading, 10);
      expect(b.heading).toBe(a.heading);
    }
  });

  it('keeps fixed-time world positions when the camera translates within one tile', () => {
    for (const index of [0, 1, 2]) for (const time of [0, 10, 1600]) {
      const a = pose(index, time, 0, 0), b = pose(index, time, 150, -100);
      expect(b.x).toBeCloseTo(a.x, 8); expect(b.z).toBeCloseTo(a.z, 8);
      expect(b.y).toBe(a.y); expect(b.heading).toBe(a.heading);
      expect(Math.hypot((b.x - 150) - a.x, (b.z + 100) - a.z)).toBeCloseTo(Math.hypot(150, 100), 8);
    }
  });

  it('selects only equivalent periodic copies across large positive and negative camera travel', () => {
    for (const index of [0, 1, 2]) {
      const original = pose(index, 34, 0, 0);
      for (const [x, z] of [[250000, -370000], [-250000, 370000], [1e7, -7e6], [-1e7, 7e6]]) {
        const current = pose(index, 34, x, z);
        expect(current.x - x).toBeGreaterThanOrEqual(-100000);
        expect(current.x - x).toBeLessThan(100000);
        expect(current.z - z).toBeGreaterThanOrEqual(-100000);
        expect(current.z - z).toBeLessThan(100000);
        for (const axis of ['x', 'z']) {
          const periods = (current[axis] - original[axis]) / 200000;
          expect(periods).toBeCloseTo(Math.round(periods), 10);
        }
        expect(current.y).toBe(original.y); expect(current.heading).toBe(original.heading);
        expect(current.fade).toBeGreaterThanOrEqual(0); expect(current.fade).toBeLessThanOrEqual(1);
      }
    }
  });

  it('hides route copies at a wrapping boundary and retains full intensity nearby', () => {
    const original = pose(0, 0, 0, 0);
    expect(pose(0, 0, original.x, original.z).fade).toBe(1);
    for (const delta of [-0.1, 0, 0.1]) {
      expect(pose(0, 0, original.x - 100000 + delta, original.z).fade).toBeLessThan(1e-9);
    }
  });

  it('returns deterministic finite poses for invalid and extreme inputs', () => {
    for (const input of [undefined, null, NaN, Infinity, -Infinity]) expect(pose(input, input, input, input)).toEqual(pose(0, 0, 0, 0));
    expect(pose(-10, -1, 0, 0)).toEqual(pose(0, 0, 0, 0));
    expect(pose(8, 1e300, 0, 0)).toEqual(pose(2, 1e9, 0, 0));
    for (const index of [0, 1, 2]) {
      const result = pose(index, 1e300, 1e308, -1e308);
      expect(Object.values(result).every(Number.isFinite)).toBe(true);
      expect(result.fade).toBeGreaterThanOrEqual(0); expect(result.fade).toBeLessThanOrEqual(1);
    }
  });
});
