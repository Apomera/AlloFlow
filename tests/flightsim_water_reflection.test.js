import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const start = source.indexOf('  function getFlightSolarFrame(');
const end = source.indexOf('  // BEGIN GENERATED ATMOSPHERE', start);
if (start < 0 || end <= start) throw new Error('Production solar and lighting helpers were not found');
const api = {};
runInNewContext(source.slice(start, end) + '\n' + readFileSync('dev-tools/skyschool-celestial.js', 'utf8') + '\n' +
  readFileSync('dev-tools/skyschool-water-reflection.js', 'utf8'), api);
const frame = api.getFlightWaterFrame, glint = api.getFlightWaterGlint;
const degree = Math.PI / 180;
const dawnHourAt = elevation => 6 + Math.asin(elevation / 1.15) * 12 / Math.PI;
const mirror = value => [-value.sunDirection.x, value.sunDirection.y, -value.sunDirection.z];
const appearance = value => [value.shimmerStrength, value.glintStrength];
function bounded(value) {
  expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
}

describe('shared water reflection appearance', () => {
  it('stays finite and bounded through solar hours, weather, wind and quality tiers', () => {
    for (let hour = 0; hour < 24; hour += 0.25) for (const weather of [{}, { type: 'breezy', wind: 12, visibility: 0.7 },
      { type: 'gusty', wind: 45 }, { type: 'stormy', visibility: 0.4 }, { type: 'foggy', visibility: 0.2 }]) {
      for (const tier of [0, 1, 2]) {
        const result = frame(hour, weather, false, tier); appearance(result).forEach(bounded);
        expect(result.reflectionPower).toBeGreaterThanOrEqual(32); expect(result.reflectionPower).toBeLessThanOrEqual(96);
        expect(Math.hypot(...Object.values(result.sunDirection))).toBeCloseTo(1, 12);
        bounded(glint(result, ...mirror(result)));
      }
    }
  });

  it('uses existing solar direction and finite defaults without modifying weather', () => {
    for (const hour of [undefined, null, NaN, Infinity, -Infinity]) expect(frame(hour)).toEqual(frame(12));
    for (const [hour, wrapped] of [[-1, 23], [25, 1], [-48, 0], [48, 0]]) expect(frame(hour)).toEqual(frame(wrapped));
    const weather = Object.freeze({ type: 'breezy', visibility: 0.7, wind: -12 });
    expect(frame(8, weather)).toEqual(frame(8, { ...weather }));
    expect(frame(8, weather).sunDirection).toEqual(api.getFlightSolarFrame(8).sun.direction);
    expect(frame(8, weather).reflectionPower).toBeCloseTo(96 - 64 * 12 / 45, 12);
  });

  it('fades continuously across sunrise, sunset and the former .01-radian threshold', () => {
    const boundaries = [0, 0.01, 6 * degree].map(dawnHourAt);
    for (const hour of [...boundaries, ...boundaries.map(value => 24 - value), 0, 24]) {
      const before = appearance(frame(hour - 1e-7)), after = appearance(frame(hour + 1e-7));
      expect(Math.max(...before.map((value, index) => Math.abs(value - after[index])))).toBeLessThan(1e-5);
    }
    expect(frame(dawnHourAt(-0.1 * degree)).glintStrength).toBe(0);
    expect(frame(dawnHourAt(0)).glintStrength).toBe(0);
    expect(frame(dawnHourAt(0.01) - 1e-4).glintStrength).toBeGreaterThan(0);
    expect(frame(12).glintStrength).toBeGreaterThan(0.14);
    expect(frame(7).glintStrength).toBeGreaterThan(frame(12).glintStrength);
    for (const hour of [6.02, 6.2, 7, 9, 12]) expect(frame(hour).glintStrength).toBeCloseTo(frame(24 - hour).glintStrength, 10);
  });

  it('shares the celestial cloud policy while leaving muted water texture in storm and fog', () => {
    const clear = frame(8);
    for (const [type, factor] of [['breezy', 0.92], ['gusty', 0.8], ['partly_cloudy', 0.65], ['overcast', 0.08]]) {
      expect(frame(8, { type }).glintStrength).toBeCloseTo(clear.glintStrength * factor, 12);
    }
    for (const type of ['stormy', 'foggy']) {
      const result = frame(8, { type, visibility: 0.3 });
      expect(result.glintStrength).toBe(0); expect(result.shimmerStrength).toBeGreaterThan(0);
      expect(result.shimmerStrength).toBeCloseTo(clear.shimmerStrength * 0.3, 12);
    }
    for (const type of ['unknown', undefined]) expect(frame(8, { type }).glintStrength).toBe(0);
    expect(frame(0).glintStrength).toBe(0); expect(frame(0).shimmerStrength).toBeCloseTo(0.2, 12);
  });

  it('retains static reflection in reduced motion and removes only the effects excluded by each quality tier', () => {
    const full = frame(8), reduced = frame(8, {}, true, 0);
    expect(reduced.glintStrength).toBe(full.glintStrength); expect(reduced.shimmerStrength).toBe(0);
    const eco = frame(8, {}, false, 1);
    expect(eco.glintStrength).toBe(0); expect(eco.shimmerStrength).toBe(full.shimmerStrength);
    for (const tier of [2, 3, NaN, Infinity, -1, '0']) expect(appearance(frame(8, {}, false, tier))).toEqual([0, 0]);
    expect(appearance(frame(8, {}, true, 1))).toEqual([0, 0]);
  });

  it('clamps visibility and absolute wind while treating malformed explicit visibility conservatively', () => {
    expect(frame(8, { visibility: -1 }).shimmerStrength).toBe(0);
    expect(frame(8, { visibility: 2 }).shimmerStrength).toBe(frame(8).shimmerStrength);
    for (const visibility of [undefined, null, NaN, Infinity, -Infinity, '1']) expect(appearance(frame(8, { visibility }))).toEqual([0, 0]);
    for (const weather of ['clear', [], 1]) expect(appearance(frame(8, weather))).toEqual([0, 0]);
    for (const wind of [0, 15, 45, 100, 1e300]) {
      expect(frame(8, { wind }).reflectionPower).toBe(frame(8, { wind: -wind }).reflectionPower);
    }
    expect(frame(8, { wind: 1e300 }).reflectionPower).toBe(32);
    for (const wind of [undefined, null, NaN, Infinity, -Infinity, '20']) expect(frame(8, { wind }).reflectionPower).toBe(96);
  });
});

describe('view-dependent water reflection lobe', () => {
  it('peaks along the mirror ray and rejects points facing away from sunlight', () => {
    for (const hour of [6.5, 8, 12, 16, 17.5]) {
      const result = frame(hour), reflected = mirror(result);
      expect(glint(result, ...reflected)).toBeCloseTo(result.glintStrength, 10);
      expect(glint(result, -reflected[0], -reflected[1], -reflected[2])).toBe(0);
      // A vertical camera ray has no horizontal component: this is a very
      // poor reflection alignment at low sun even if its bearing agrees.
      if (hour < 9 || hour > 15) expect(glint(result, 0, 1, 0)).toBeLessThan(result.glintStrength * 0.01);
    }
  });

  it('uses camera height and distance instead of lighting an entire azimuth lane', () => {
    const result = frame(8), reflected = mirror(result);
    const [x, y, z] = reflected.map(value => value * 10000);
    const peak = glint(result, x, y, z);
    expect(glint(result, x, y * 4, z)).toBeLessThan(peak * 0.1);
    expect(glint(result, x * 4, y, z * 4)).toBeLessThan(peak * 0.1);
    expect(glint(result, x * 4, y * 4, z * 4)).toBeCloseTo(peak, 12);
    expect(glint(result, x, 0, z)).toBe(0); expect(glint(result, x, -10, z)).toBe(0);
  });

  it('broadens smoothly with wind without changing the aligned peak or reflection center', () => {
    const calm = frame(8, { wind: 0 }), rough = frame(8, { wind: 45 });
    const reflected = mirror(calm), length = Math.hypot(reflected[0], reflected[2]);
    const side = [-reflected[2] / length, 0, reflected[0] / length];
    const ray = reflected.map((value, index) => value * Math.cos(10 * degree) + side[index] * Math.sin(10 * degree));
    const offCalm = glint(calm, ...ray), offRough = glint(rough, ...ray);
    expect(offRough).toBeGreaterThan(offCalm * 2); expect(offRough).toBeLessThan(rough.glintStrength);
    expect(glint(calm, ...reflected)).toBeCloseTo(glint(rough, ...reflected), 12);
    expect(frame(8, { wind: 22.5 }).reflectionPower).toBe(64);
  });

  it('has no abrupt angular cutoff and is invariant to finite view-vector magnitude', () => {
    const result = frame(8), reflected = mirror(result);
    const length = Math.hypot(reflected[0], reflected[2]), side = [-reflected[2] / length, 0, reflected[0] / length];
    const atDot = dot => glint(result, ...reflected.map((value, index) => value * dot + side[index] * Math.sqrt(1 - dot * dot)));
    for (const boundary of [0.8, 0.9]) {
      expect(atDot(boundary - 1e-7)).toBeGreaterThan(0);
      expect(Math.abs(atDot(boundary + 1e-7) - atDot(boundary - 1e-7))).toBeLessThan(1e-7);
    }
    const expected = glint(result, ...reflected);
    for (const scale of [1e-300, 0.001, 1, 1e9, 1e300]) expect(glint(result, ...reflected.map(value => value * scale))).toBeCloseTo(expected, 10);
  });

  it('returns zero for malformed frames, zero vectors and nonfinite view coordinates', () => {
    const result = frame(8), direction = mirror(result);
    for (const malformed of [null, {}, { ...result, glintStrength: NaN }, { ...result, glintStrength: 2 },
      { ...result, reflectionPower: Infinity }, { ...result, reflectionPower: 0 }, { ...result, sunDirection: null },
      { ...result, sunDirection: { x: 0, y: 0, z: 0 } }, { ...result, sunDirection: { x: NaN, y: 1, z: 0 } }]) {
      expect(glint(malformed, ...direction)).toBe(0);
    }
    expect(glint(result, 0, 0, 0)).toBe(0);
    for (const bad of [NaN, Infinity, -Infinity, undefined, null, '1']) {
      for (let axis = 0; axis < 3; axis++) {
        const ray = [...direction]; ray[axis] = bad; expect(glint(result, ...ray)).toBe(0);
      }
    }
  });
});
