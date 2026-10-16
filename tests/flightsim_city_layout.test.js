import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('dev-tools/skyschool-city-layout.js', 'utf8'), api);
const layout = api.getFlightCityLayout;
const city = (popK = 1500, lat = 35.032, lon = 135.748) => ({ lat, lon, popK });

describe('illustrative city neighborhoods', () => {
  it('is stable for the same location and population without mutating the city', () => {
    const source = Object.freeze(city());
    expect(layout(source)).toEqual(layout(source));
    expect(layout({ ...source, name: 'Renamed city', id: 'another-alias' })).toEqual(layout(source));
    expect(layout(city(1500, 35.062))).not.toEqual(layout(source));
  });

  it('uses the existing population-based box budget with a hard limit of 64', () => {
    for (const population of [0, 1, 10, 100, 1500, 50000, 1e20]) {
      const expected = Math.min(64, 8 + Math.round(Math.sqrt(Math.min(50000, population)) * 1.4));
      expect(layout(city(population))).toHaveLength(expected);
    }
  });

  it('keeps buildings compact, finite, and separated by clear gaps', () => {
    for (const population of [0, 10, 100, 1500, 50000]) {
      for (const latitude of [-65.4, 0, 35.032, 78.2]) {
        const buildings = layout(city(population, latitude));
        for (let i = 0; i < buildings.length; i++) {
          const a = buildings[i];
          for (const value of Object.values(a)) expect(Number.isFinite(value)).toBe(true);
          expect(a.width).toBeGreaterThan(0);
          expect(a.depth).toBeGreaterThan(0);
          expect(a.height).toBeGreaterThan(18);
          expect(a.height).toBeLessThan(968);
          expect(Math.abs(a.x) + a.width / 2).toBeLessThan(1000);
          expect(Math.abs(a.z) + a.depth / 2).toBeLessThan(1000);
          for (let j = i + 1; j < buildings.length; j++) {
            const b = buildings[j];
            const gapX = Math.abs(a.x - b.x) - (a.width + b.width) / 2;
            const gapZ = Math.abs(a.z - b.z) - (a.depth + b.depth) / 2;
            expect(Math.max(gapX, gapZ)).toBeGreaterThanOrEqual(15 - 1e-8);
          }
        }
      }
    }
  });

  it('forms a taller core with lower buildings around its edge', () => {
    const buildings = layout(city(50000));
    const average = items => items.reduce((total, item) => total + item.height, 0) / items.length;
    expect(average(buildings.slice(0, 4))).toBeGreaterThan(average(buildings.slice(-16)) * 3);
    expect(Math.max(...buildings.slice(-16).map(item => item.height))).toBeLessThan(120);
  });

  it('uses one stable layout across equivalent wrapped longitudes', () => {
    expect(layout(city(1500, 35, 180))).toEqual(layout(city(1500, 35, -180)));
    expect(layout(city(1500, 35, 135))).toEqual(layout(city(1500, 35, 495)));
  });

  it('handles missing populations and rejects invalid coordinates', () => {
    expect(layout({ lat: 35, lon: 135 })).toEqual(layout(city(100, 35, 135)));
    expect(layout(city(-10))).toEqual(layout(city(0)));
    expect(layout(city(NaN))).toEqual(layout(city(100)));
    for (const value of [null, {}, { lat: 91, lon: 0 }, { lat: NaN, lon: 0 }, { lat: 0, lon: Infinity }]) {
      expect(layout(value)).toEqual([]);
    }
  });
});
