import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
const production = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const solarStart = production.indexOf('  function getFlightSolarFrame(');
const solarEnd = production.indexOf('  // BEGIN GENERATED ATMOSPHERE', solarStart);
if (solarStart < 0 || solarEnd <= solarStart) throw new Error('Production solar helpers were not found');
runInNewContext(production.slice(solarStart, solarEnd), api);
runInNewContext(readFileSync('dev-tools/skyschool-atmosphere.js', 'utf8'), api);
runInNewContext(readFileSync('dev-tools/skyschool-canvas-atmosphere.js', 'utf8'), api);
const stops = api.getFlightCanvasSkyStops;
const palette = { horizon: [0.7, 0.8, 0.9], zenith: [0.1, 0.3, 0.6] };
const luminance = rgb => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
function view(pitch = 0, heading = 0, focalLength) {
  const p = pitch * Math.PI / 180, h = heading * Math.PI / 180;
  return { forward: { x: Math.sin(h) * Math.cos(p), y: Math.sin(p), z: -Math.cos(h) * Math.cos(p) },
    up: { x: -Math.sin(h) * Math.sin(p), y: Math.cos(p), z: Math.cos(h) * Math.sin(p) },
    fov: 60, ...(focalLength === undefined ? {} : { focalLength }) };
}
function bounded(result) {
  expect(result).toHaveLength(17);
  result.forEach((stop, index) => {
    expect(stop.offset).toBe(index / 16);
    expect(stop.color).toHaveLength(3);
    stop.color.forEach(channel => {
      expect(Number.isFinite(channel)).toBe(true);
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    });
  });
}

describe('Canvas world-elevation atmosphere', () => {
  it('keeps the horizon exact at the level center and all downward rays', () => {
    const result = stops(view(), 600, palette);
    bounded(result);
    for (let i = 8; i < result.length; i++) expect(result[i].color).toEqual(palette.horizon);
    expect(luminance(result[0].color)).toBeLessThan(luminance(result[8].color));
  });

  it('tracks upward pitch into a deeper sky and the same horizon when looking down', () => {
    const level = stops(view(), 600, palette), high = stops(view(45), 600, palette);
    high[8].color.forEach((channel, i) => expect(channel).toBeCloseTo(palette.zenith[i], 14));
    expect(luminance(high[8].color)).toBeLessThan(luminance(level[8].color));
    expect(stops(view(-45), 600, palette)[8].color).toEqual(palette.horizon);
    stops(view(45, 123), 600, palette).forEach((stop, index) => {
      stop.color.forEach((channel, i) => expect(channel).toBeCloseTo(high[index].color[i], 14));
    });
  });

  it('matches the shader smoothstep using the normalized world-up ray', () => {
    const result = stops(view(), 600, palette);
    // A level 60-degree view's top-center ray is 30 degrees above horizontal.
    const t = Math.sin(Math.PI / 6) / 0.65;
    const mix = t * t * (3 - 2 * t);
    result[0].color.forEach((channel, i) => {
      expect(channel).toBeCloseTo(palette.horizon[i] + (palette.zenith[i] - palette.horizon[i]) * mix, 14);
    });
  });

  it('preserves colors at matching center-relative pixels when banking pads the canvas', () => {
    const originalFocal = 400 / (2 * Math.tan(Math.PI / 6));
    const original = stops(view(10, 0, originalFocal), 400, palette);
    const padded = stops(view(10, 0, originalFocal), 800, palette);
    // Both samples lie 100 pixels above their respective centers.
    padded[6].color.forEach((channel, i) => expect(channel).toBeCloseTo(original[4].color[i], 14));
    expect(stops(view(10), 800, palette)[6].color).not.toEqual(original[4].color);
    expect(padded[8].color).toEqual(original[8].color);
  });

  it('accepts real day, twilight, night, altitude and weather palettes', () => {
    const environment = { haze: [175, 195, 210], visibilityFactor: 0.85 };
    for (const hour of [0, 5.8, 6, 12, 17.8, 18, 22, 24]) {
      for (const type of ['clear', 'partly_cloudy', 'overcast', 'stormy', 'foggy']) {
        const weather = { type, visibility: type === 'clear' ? 1 : 0.4 };
        const colors = api.getFlightSkyPalette(hour, environment, 25000, weather.visibility, weather);
        bounded(stops(view(25, 250), 844, colors));
        expect(stops(view(), 844, colors)[8].color).toEqual(colors.horizon);
      }
    }
  });

  it('falls back to a level 60-degree view for invalid bases and missing projection', () => {
    const fallback = stops(null, 600, palette);
    for (const invalid of [undefined, {}, { forward: {}, up: {} },
      { forward: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 }, focalLength: 2 },
      { forward: { x: NaN, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 }, fov: 120 },
      { forward: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 1, z: 0 } }]) {
      expect(stops(invalid, 600, palette)).toEqual(fallback);
    }
    for (const invalid of [null, NaN, Infinity, -1, 0]) {
      expect(stops({ ...view(), focalLength: invalid, fov: invalid }, 600, palette)).toEqual(fallback);
    }
  });

  it('bounds finite extreme projections without mutating views or palettes', () => {
    const immutableView = Object.freeze({ ...view(10), forward: Object.freeze(view(10).forward), up: Object.freeze(view(10).up), focalLength: 300 });
    const immutablePalette = Object.freeze({ horizon: Object.freeze([...palette.horizon]), zenith: Object.freeze([...palette.zenith]) });
    expect(stops(immutableView, 600, immutablePalette)).toEqual(stops(view(10, 0, 300), 600, palette));
    for (const height of [Number.MIN_VALUE, 1, 1e300, Number.MAX_VALUE]) {
      for (const focal of [Number.MIN_VALUE, 1, Number.MAX_VALUE]) bounded(stops(view(89, 45, focal), height, palette));
    }
    bounded(stops({ forward: { x: 0, y: 0, z: -1e308 }, up: { x: 0, y: 1e308, z: 0 } }, 600, palette));
  });

  it('rejects invalid heights or non-normalized palette colors', () => {
    for (const height of [undefined, null, NaN, Infinity, -Infinity, 0, -1, '600']) expect(stops(view(), height, palette)).toEqual([]);
    for (const colors of [undefined, null, {}, { horizon: [], zenith: [] },
      { horizon: [NaN, 0, 0], zenith: [0, 0, 0] }, { horizon: [0, 0, 0], zenith: [0, Infinity, 0] },
      { horizon: [-0.1, 0, 0], zenith: [0, 0, 0] }, { horizon: [0, 0, 0], zenith: [0, 1.1, 0] }]) {
      expect(stops(view(), 600, colors)).toEqual([]);
    }
  });
});
