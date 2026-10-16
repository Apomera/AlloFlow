import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('dev-tools/skyschool-clouds.js', 'utf8'), api);
const wrap = api.wrapFlightCloudCoordinate;
const fade = api.getFlightCloudEdgeFade;
const presence = api.stepFlightCloudPresence;

describe('bounded cloud-field recycling', () => {
  it('preserves exact coordinates inside the half-open field without rounding drift', () => {
    for (const center of [-123456.789, 0, 123456.789]) {
      for (const offset of [-60000, -38123.456789, -0.1, 0, 0.1, 59999.999999]) {
        const value = center + offset;
        expect(wrap(value, center, 60000)).toBe(value);
        expect(wrap(wrap(value, center, 60000), center, 60000)).toBe(value);
      }
    }
    expect(Object.is(wrap(-0, 0, 60000), -0)).toBe(true);
  });

  it('wraps either direction and arbitrary multi-span travel in one update', () => {
    for (const center of [-1000000, 0, 1000000]) {
      for (const turns of [-1000000, -5, -1, 0, 1, 5, 1000000]) {
        for (const local of [-60000, -20000, 0, 59999]) {
          expect(wrap(center + local + turns * 120000, center, 60000)).toBe(center + local);
        }
      }
      expect(wrap(center + 60000, center, 60000)).toBe(center - 60000);
    }
  });

  it('remains finite and bounded for very large coordinates and invalid input', () => {
    for (const value of [-1e308, 1e308]) {
      const actual = wrap(value, 1e307, 1e306);
      expect(Number.isFinite(actual)).toBe(true);
      expect(actual).toBeGreaterThanOrEqual(9e306);
      expect(actual).toBeLessThan(1.1e307);
    }
    for (const args of [[NaN, 12, 60000], [Infinity, 12, 60000], [0, 12, 0], [0, 12, -1],
      [0, 12, Infinity], [0, 12, NaN], [1e308, 1e308, 1e308]]) expect(wrap(...args)).toBe(args[1]);
    expect(wrap(0, NaN, 60000)).toBe(0);
    expect(wrap(0, Infinity, 60000)).toBe(0);
  });
});

describe('cloud-field edge fade', () => {
  it('retains inner clouds and fades monotonically to zero before a wrap', () => {
    expect(fade(0, 0, 60000)).toBe(1);
    expect(fade(33000, 0, 60000)).toBe(1);
    let previous = 1;
    for (let radius = 33000; radius <= 60000; radius += 100) {
      const alpha = fade(radius, 0, 60000);
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(previous);
      previous = alpha;
    }
    expect(fade(60000, 0, 60000)).toBe(0);
    expect(fade(61000, 0, 60000)).toBe(0);
  });

  it('is radially symmetric and hides square-field corners', () => {
    for (const radius of [0, 33000, 40000, 55000, 60000]) {
      for (const angle of [-Math.PI, -1, 0, 1, Math.PI / 2]) {
        expect(fade(Math.cos(angle) * radius, Math.sin(angle) * radius, 60000)).toBeCloseTo(fade(radius, 0, 60000), 12);
      }
    }
    expect(fade(50000, 50000, 60000)).toBe(0);
    expect(fade(-60000, 60000, 60000)).toBe(0);
  });

  it('has zero-slope fade endpoints and no visible discontinuity when a coordinate wraps', () => {
    expect(1 - fade(33000.1, 0, 60000)).toBeLessThan(1e-9);
    expect(fade(59999.9, 0, 60000)).toBeLessThan(1e-9);
    for (const z of [0, 15000, 55000]) {
      const before = fade(wrap(59999.9, 0, 60000), z, 60000);
      const after = fade(wrap(60000.1, 0, 60000), z, 60000);
      expect(Math.abs(before - after)).toBeLessThan(1e-10);
      expect(Math.max(before, after)).toBeLessThan(1e-9);
    }
  });

  it('fails closed for malformed offsets or field sizes', () => {
    for (const args of [[NaN, 0, 60000], [0, Infinity, 60000], [0, 0, NaN], [0, 0, 0], [0, 0, -1]]) {
      expect(fade(...args)).toBe(0);
    }
    expect(fade(1e308, 1e308, 60000)).toBe(0);
  });
});

describe('weather and quality cloud-presence transitions', () => {
  it('advances at the same rate for different frame subdivisions', () => {
    for (const target of [0, 1]) {
      let coarse = 1 - target, fine = coarse;
      for (let index = 0; index < 10; index++) coarse = presence(coarse, target, 0.1);
      for (let index = 0; index < 60; index++) fine = presence(fine, target, 1 / 60);
      expect(coarse).toBeCloseTo(target ? 0.6 : 0.4, 12);
      expect(fine).toBeCloseTo(coarse, 12);
    }
  });

  it('can reverse transitions and reaches the exact target without overshooting', () => {
    expect(presence(0.4, 1, 0.1)).toBeCloseTo(0.46, 12);
    expect(presence(0.4, 0, 0.1)).toBeCloseTo(0.34, 12);
    expect(presence(0.98, 1, 0.1)).toBe(1);
    expect(presence(0.02, 0, 0.1)).toBe(0);
    expect(presence(0.49, 0.5, 0.1)).toBe(0.5);
    expect(presence(1, 1, 0.1)).toBe(1);
  });

  it('holds paused/invalid time and caps long frames without a flash', () => {
    for (const time of [0, -1, undefined, NaN, Infinity]) expect(presence(0.4, 1, time)).toBe(0.4);
    expect(presence(0.4, 1, 10)).toBeCloseTo(0.46, 12);
    expect(presence(0.4, 0, 10)).toBeCloseTo(0.34, 12);
  });

  it('bounds malformed values and initializes missing presence to the requested state', () => {
    expect(presence(undefined, 1, 0)).toBe(1);
    expect(presence(NaN, 0, 0)).toBe(0);
    expect(presence(Infinity, 5, 0)).toBe(1);
    expect(presence(-5, -3, 0)).toBe(0);
    expect(presence(5, 3, 0)).toBe(1);
    expect(presence(0.4, NaN, 0.1)).toBeCloseTo(0.34, 12);
  });
});
