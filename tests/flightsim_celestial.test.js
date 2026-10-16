import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const start = source.indexOf('  function getFlightSolarFrame(');
const end = source.indexOf('  // BEGIN GENERATED ATMOSPHERE', start);
if (start < 0 || end <= start) throw new Error('Production solar and lighting helpers were not found');
const api = {};
runInNewContext(source.slice(start, end) + '\n' + readFileSync('dev-tools/skyschool-celestial.js', 'utf8'), api);
const frame = api.getFlightCelestialFrame, star = api.getFlightStar;
const degree = Math.PI / 180;
function bounded(value) {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(1);
}
function appearance(result) {
  return [result.sun.opacity, result.sun.haloOpacity, ...result.sun.color,
    result.moon.opacity, result.moon.haloOpacity, ...result.moon.color, result.starOpacity];
}
const dawnHourAt = elevation => 6 + Math.asin(elevation / 1.15) * 12 / Math.PI;

describe('shared celestial appearance', () => {
  it('keeps all appearance values bounded and body directions normalized throughout the day', () => {
    for (let hour = 0; hour < 24; hour += 0.125) {
      for (const weather of [{}, { type: 'breezy', visibility: 0.7 }, { type: 'overcast' }, { type: 'stormy' }]) {
        const result = frame(hour, weather, 42000);
        appearance(result).forEach(bounded);
        for (const body of [result.sun, result.moon]) {
          expect(Math.hypot(...Object.values(body.direction))).toBeCloseTo(1, 12);
          expect(Math.asin(body.direction.y)).toBeCloseTo(body.elevationRad, 12);
        }
      }
    }
  });

  it('uses the existing world clock and finite defaults without modifying weather', () => {
    for (const hour of [undefined, null, NaN, Infinity, -Infinity]) expect(frame(hour)).toEqual(frame(12));
    for (const [hour, wrapped] of [[-1, 23], [25, 1], [-48, 0], [48, 0]]) expect(frame(hour)).toEqual(frame(wrapped));
    const weather = Object.freeze({ type: 'breezy', visibility: 0.7 });
    for (const altitude of [undefined, null, NaN, Infinity, -Infinity]) expect(frame(5.9, weather, altitude)).toEqual(frame(5.9, weather, 0));
    expect(frame(9).sun.direction).toEqual(api.getFlightSolarFrame(9).sun.direction);
    expect(frame(21).moon.direction).toEqual(api.getFlightSolarFrame(21).moon.direction);
  });

  it('gives both discs a realistic fixed angular diameter independent of atmosphere or altitude', () => {
    for (const hour of [0, 6, 12, 18]) for (const altitude of [0, 35000, 1e9]) {
      const result = frame(hour, { type: 'breezy' }, altitude);
      for (const body of [result.sun, result.moon]) expect(body.angularDiameterRad / degree).toBeCloseTo(0.53, 12);
      expect(result.sun.haloScale).toBe(12); expect(result.moon.haloScale).toBe(5);
      expect(result.sun.haloOpacity).toBeCloseTo(result.sun.opacity * 0.25, 12);
      expect(result.moon.haloOpacity).toBeCloseTo(result.moon.opacity * 0.12, 12);
      // At a 60-degree vertical lens and 720px height, half a degree is ~6px.
      const diameterPx = 720 / Math.tan(30 * degree) * Math.tan(result.sun.angularDiameterRad / 2);
      expect(diameterPx).toBeGreaterThan(5); expect(diameterPx).toBeLessThan(7);
    }
  });

  it('smoothly reveals the solar limb through sunrise and mirrors sunset without hard gates', () => {
    const low = dawnHourAt(-0.265 * degree), high = dawnHourAt(1.5 * degree);
    expect(frame(low - 0.00001).sun.opacity).toBe(0);
    let previous = 0;
    for (let index = 0; index <= 60; index++) {
      const hour = low + (high - low) * index / 60, sunrise = frame(hour).sun.opacity;
      expect(sunrise).toBeGreaterThanOrEqual(previous);
      expect(sunrise).toBeCloseTo(frame(24 - hour).sun.opacity, 10);
      previous = sunrise;
    }
    expect(previous).toBeGreaterThan(0.85);
    for (const hour of [low, 6, high, 18, 24 - low, 24 - high, 0, 24]) {
      const before = appearance(frame(hour - 1e-7)), after = appearance(frame(hour + 1e-7));
      expect(Math.max(...before.map((value, i) => Math.abs(value - after[i])))).toBeLessThan(1e-5);
    }
    expect(frame(low + 1e-6).sun.opacity).toBeLessThan(1e-8);
  });

  it('shares conservative cloud transmission across discs, halos, and stars', () => {
    const noon = frame(12), midnight = frame(0);
    for (const [type, bodyScale, starScale] of [['clear', 1, 1], ['breezy', 0.92, 0.95],
      ['gusty', 0.8, 0.85], ['partly_cloudy', 0.65, 0.65]]) {
      expect(frame(12, { type }).sun.opacity).toBeCloseTo(noon.sun.opacity * bodyScale, 12);
      expect(frame(0, { type }).moon.opacity).toBeCloseTo(midnight.moon.opacity * bodyScale, 12);
      expect(frame(0, { type }).starOpacity).toBeCloseTo(midnight.starOpacity * starScale, 12);
    }
    expect(frame(12, { type: 'overcast' }).sun.opacity).toBeCloseTo(noon.sun.opacity * 0.08, 12);
    expect(frame(0, { type: 'overcast' }).moon.opacity).toBe(0);
    expect(frame(0, { type: 'overcast' }).starOpacity).toBe(0);
    for (const type of ['foggy', 'stormy', 'unknown', undefined]) for (const hour of [0, 6, 12, 18]) {
      const result = frame(hour, { type });
      expect([result.sun.opacity, result.sun.haloOpacity, result.moon.opacity, result.moon.haloOpacity, result.starOpacity]).toEqual([0, 0, 0, 0, 0]);
    }
  });

  it('fades poor visibility continuously and treats explicit malformed values conservatively', () => {
    for (const hour of [0, 12]) {
      let previous = 0;
      const select = result => hour === 12 ? result.sun.opacity : result.starOpacity;
      for (let visibility = 0; visibility <= 1; visibility += 0.01) {
        const opacity = select(frame(hour, { visibility }));
        expect(opacity).toBeGreaterThanOrEqual(previous); previous = opacity;
      }
      expect(select(frame(hour, { visibility: 0.15 }))).toBe(0);
      expect(select(frame(hour, { visibility: 0.9 }))).toBe(select(frame(hour)));
      for (const visibility of [NaN, Infinity, -Infinity, null, undefined, '1']) expect(select(frame(hour, { visibility }))).toBe(0);
      for (const weather of [[], 'clear', 1]) expect(select(frame(hour, weather))).toBe(0);
      for (const boundary of [0.15, 0.9]) {
        const delta = Math.abs(select(frame(hour, { visibility: boundary - 1e-5 })) - select(frame(hour, { visibility: boundary + 1e-5 })));
        expect(delta).toBeLessThan(1e-8);
      }
    }
  });

  it('never reveals stars or the moon in daylight even at extreme altitude', () => {
    for (let hour = 6; hour <= 18; hour += 0.25) for (const altitude of [0, 20000, 40000, 1e300]) {
      expect(frame(hour, {}, altitude).starOpacity).toBe(0);
      if (hour > 6 && hour < 18) expect(frame(hour, {}, altitude).moon.opacity).toBe(0);
    }
    const twilight = dawnHourAt(-1 * degree);
    expect(frame(twilight, {}, 40000).starOpacity).toBeGreaterThan(frame(twilight, {}, 0).starOpacity);
    expect(frame(twilight, {}, 40000)).toEqual(frame(twilight, {}, 1e300));
    expect(frame(0).starOpacity).toBe(1); expect(frame(0).moon.opacity).toBeCloseTo(0.9, 12);
  });
});

describe('shared deterministic world star catalog', () => {
  it('preserves the existing 600 normalized directions independently of brightness', () => {
    const octants = [0, 0, 0, 0], unique = new Set();
    for (let index = 0; index < 600; index++) {
      const record = star(index), { x, y, z } = record.direction;
      const angle = index * 137.508 * degree;
      const hash = ((Math.sin(index * 78.233 + 12.9898) * 43758.5453) % 1 + 1) % 1;
      const polar = Math.acos(1 - hash);
      expect(x).toBeCloseTo(Math.cos(angle) * Math.sin(polar), 12);
      expect(y).toBeCloseTo(Math.cos(polar), 12); expect(z).toBeCloseTo(Math.sin(angle) * Math.sin(polar), 12);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12); bounded(y); bounded(record.brightness);
      octants[(x >= 0 ? 1 : 0) + (z >= 0 ? 2 : 0)]++; unique.add(JSON.stringify(record.direction));
      expect(star(index)).toEqual(record);
    }
    expect(unique.size).toBe(600); for (const count of octants) expect(count).toBeGreaterThan(130);
  });

  it('fades horizon stars and gives unobscured stars stable varied brightness', () => {
    const catalog = Array.from({ length: 600 }, (_, index) => star(index));
    const horizon = catalog.filter(record => record.direction.y <= 0.02);
    expect(horizon.length).toBeGreaterThan(0); horizon.forEach(record => expect(record.brightness).toBe(0));
    const high = catalog.filter(record => record.direction.y >= 0.18);
    high.forEach(record => expect(record.brightness).toBeGreaterThanOrEqual(0.55));
    expect(Math.max(...high.map(record => record.brightness)) - Math.min(...high.map(record => record.brightness))).toBeGreaterThan(0.4);
    expect(catalog.filter(record => record.direction.y > 0.02 && record.direction.y < 0.18).some(record => record.brightness > 0 && record.brightness < 0.55)).toBe(true);
  });

  it('bounds malformed indices and returns independent records for caller caching', () => {
    for (const index of [undefined, null, NaN, Infinity, -Infinity, -1, '2']) expect(star(index)).toEqual(star(0));
    expect(star(1e300)).toEqual(star(599)); expect(star(2.9)).toEqual(star(2));
    const record = star(10), original = star(10); record.direction.y = -1; record.brightness = -1;
    expect(star(10)).toEqual(original);
  });
});
