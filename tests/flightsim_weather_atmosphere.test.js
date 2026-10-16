import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const start = source.indexOf('  function getFlightSolarFrame(');
const end = source.indexOf('  // BEGIN GENERATED ATMOSPHERE', start);
if (start < 0 || end <= start) throw new Error('Production solar and lighting helpers were not found');
const api = {};
runInNewContext(source.slice(start, end) + '\n' + readFileSync('dev-tools/skyschool-atmosphere.js', 'utf8') + '\n' +
  readFileSync('dev-tools/skyschool-celestial.js', 'utf8'), api);
const appearance = api.getFlightWeatherAppearance, fog = api.getFlightFogFrame, sky = api.getFlightSkyPalette;
const environment = Object.freeze({ haze: [151, 184, 166], visibilityFactor: 0.91 });
const weatherTypes = ['clear', 'breezy', 'gusty', 'partly_cloudy', 'overcast', 'stormy', 'foggy', 'unknown'];
const luma = rgb => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
const chroma = rgb => Math.max(...rgb) - Math.min(...rgb);
const colors = palette => [...palette.horizon, ...palette.zenith];
function bounded(value) {
  expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
}

describe('shared visual weather appearance', () => {
  it('defaults missing weather to clear and preserves frozen inputs', () => {
    const clear = { cloudCover: 0, directTransmission: 1, ambientTransmission: 1, visibility: 1 };
    for (const weather of [undefined, null, {}, { type: 'clear' }]) expect(appearance(weather)).toEqual(clear);
    const weather = Object.freeze({ type: 'overcast', visibility: 0.7 });
    expect(appearance(weather)).toEqual(appearance({ ...weather }));
    expect(weather).toEqual({ type: 'overcast', visibility: 0.7 });
  });

  it('matches celestial direct-light transmission while keeping diffuse illumination under cloud', () => {
    const clearSun = api.getFlightCelestialFrame(12).sun.opacity;
    for (const type of weatherTypes) for (const visibility of [0, 0.2, 0.4, 0.7, 1]) {
      const wx = { type, visibility }, result = appearance(wx);
      Object.values(result).forEach(bounded);
      expect(result.directTransmission).toBeCloseTo(api.getFlightCelestialFrame(12, wx).sun.opacity / clearSun, 12);
      expect(result.ambientTransmission).toBeGreaterThanOrEqual(0.72);
    }
    for (const [type, cover] of [['clear', 1], ['breezy', 0.92], ['gusty', 0.8], ['partly_cloudy', 0.65],
      ['overcast', 0.08], ['stormy', 0], ['foggy', 0], ['unknown', 0]]) {
      const result = appearance({ type });
      expect(result.cloudCover).toBeCloseTo(1 - cover, 12);
      expect(result.directTransmission).toBe(cover);
      expect(result.ambientTransmission).toBeCloseTo(type === 'foggy' ? 0.92 : 1 - 0.28 * (1 - cover), 12);
    }
  });

  it('separates the finite fog floor from visibility of direct sunlight', () => {
    for (const visibility of [undefined, null, NaN, Infinity, -Infinity, '1']) {
      const result = appearance({ visibility });
      expect(result.visibility).toBe(0.25); expect(result.directTransmission).toBe(0);
    }
    expect(appearance({ visibility: -10 }).visibility).toBe(0.25);
    expect(appearance({ visibility: -10 }).directTransmission).toBe(0);
    expect(appearance({ visibility: 10 })).toEqual(appearance({ visibility: 1 }));
    for (const weather of ['clear', [], 1, { type: undefined }]) {
      const result = appearance(weather); Object.values(result).forEach(bounded);
      expect(result.directTransmission).toBe(0); expect(result.cloudCover).toBe(1);
    }
  });
});

describe('visibility scales the capped fog range', () => {
  it('keeps noon fog ordered across clear, overcast and storm instead of saturating them at the same cap', () => {
    const clear = fog(12, { visibility: 1 }, environment);
    expect(clear).toEqual({ near: 23750, far: 95000 });
    for (const visibility of [0.25, 0.4, 0.7, 0.9, 1]) {
      const current = fog(12, { visibility }, environment);
      expect(current.far).toBeCloseTo(clear.far * visibility, 10);
      expect(current.near).toBe(current.far * 0.25);
    }
    expect(fog(12, { type: 'stormy', visibility: 0.4 }, environment).far).toBe(38000);
  });

  it('is monotonic with visibility at noon and midnight and remains inside the terrain edge', () => {
    for (const hour of [0, 6, 12, 18]) for (const visibilityFactor of [0.25, 0.7, 1]) {
      let previous = 0;
      for (let index = 0; index <= 20; index++) {
        const result = fog(hour, { visibility: index / 20 }, { visibilityFactor });
        expect(result.far).toBeGreaterThanOrEqual(previous); expect(result.far).toBeLessThanOrEqual(95000);
        expect(result.near).toBeGreaterThan(0); expect(result.near).toBeLessThan(result.far);
        previous = result.far;
      }
    }
    expect(fog(0, {}, environment).far).toBeLessThan(fog(12, {}, environment).far);
  });

  it('sanitizes solar, region and visibility inputs without nonfinite fog distances', () => {
    for (const hour of [undefined, null, NaN, Infinity, -Infinity]) expect(fog(hour, {}, environment)).toEqual(fog(12, {}, environment));
    for (const visibilityFactor of [undefined, null, NaN, Infinity, -Infinity, '1']) {
      expect(fog(0, {}, { visibilityFactor })).toEqual(fog(0));
    }
    expect(fog(0, {}, { visibilityFactor: -5 })).toEqual(fog(0, {}, { visibilityFactor: 0.25 }));
    expect(fog(0, {}, { visibilityFactor: 5 })).toEqual(fog(0, {}, { visibilityFactor: 1 }));
    for (const weather of [[], 'stormy', { visibility: NaN }]) {
      const result = fog(0, weather, environment);
      expect(Number.isFinite(result.far)).toBe(true); expect(result.far).toBeGreaterThan(0);
    }
  });
});

describe('cloud cover colors the shared horizon and zenith', () => {
  it('preserves the existing omitted and clear palettes exactly', () => {
    for (const hour of [0, 5.8, 6, 8, 12, 18, 20]) for (const altitude of [0, 12000, 65000]) for (const visibility of [0.25, 0.7, 1]) {
      const original = sky(hour, environment, altitude, visibility);
      expect(sky(hour, environment, altitude, visibility, {})).toEqual(original);
      expect(sky(hour, environment, altitude, visibility, { type: 'clear', visibility })).toEqual(original);
    }
    expect(sky(12, null, 0, 1)).toEqual({ horizon: [0.62, 0.74, 0.86], zenith: [0.18, 0.36, 0.65] });
    expect(sky(0, null, 0, 1)).toEqual({ horizon: [0.008, 0.014, 0.03], zenith: [0.002, 0.004, 0.012] });
  });

  it('makes overcast and storm skies darker and less blue without turning fog black', () => {
    const clear = sky(12, environment, 0, 1);
    for (const type of ['overcast', 'stormy']) {
      const cloudy = sky(12, environment, 0, 1, { type });
      for (const key of ['horizon', 'zenith']) {
        expect(luma(cloudy[key])).toBeLessThan(luma(clear[key]));
        expect(chroma(cloudy[key])).toBeLessThan(chroma(clear[key]));
      }
    }
    const foggy = sky(12, environment, 0, 0.25, { type: 'foggy' });
    const stormy = sky(12, environment, 0, 0.25, { type: 'stormy' });
    expect(luma(foggy.horizon)).toBeGreaterThan(luma(stormy.horizon));
    expect(Math.abs(luma(foggy.horizon) - luma(foggy.zenith))).toBeLessThan(0.1);
  });

  it('keeps weather palettes finite through malformed inputs and the full day at low and high altitude', () => {
    for (const type of weatherTypes) for (let hour = 0; hour < 24; hour += 0.5) for (const altitude of [0, 35000, 65000]) {
      colors(sky(hour, environment, altitude, 0.4, { type, visibility: 0.4 })).forEach(bounded);
    }
    for (const weather of [null, [], 'stormy', { type: undefined }, { visibility: NaN }]) {
      colors(sky(NaN, { haze: [NaN, '0', Infinity], visibilityFactor: NaN }, Infinity, NaN, weather)).forEach(bounded);
    }
  });

  it('has no time or altitude boundary flashes and stays dark through midnight', () => {
    for (const type of ['overcast', 'stormy', 'foggy']) {
      const weather = { type, visibility: 0.4 };
      for (const hour of [0, 6, 18, 24]) {
        const before = colors(sky(hour - 1e-6, environment, 1500, 0.4, weather));
        const after = colors(sky(hour + 1e-6, environment, 1500, 0.4, weather));
        expect(Math.max(...before.map((value, index) => Math.abs(value - after[index])))).toBeLessThan(1e-5);
        expect(Math.abs(fog(hour - 1e-6, weather, environment).far - fog(hour + 1e-6, weather, environment).far)).toBeLessThan(0.1);
      }
      for (const altitude of [0, 5000, 65000]) {
        const a = colors(sky(12, environment, altitude - 0.001, 0.4, weather));
        const b = colors(sky(12, environment, altitude + 0.001, 0.4, weather));
        expect(Math.max(...a.map((value, index) => Math.abs(value - b[index])))).toBeLessThan(1e-6);
      }
      for (const key of ['horizon', 'zenith']) {
        expect(luma(sky(0, environment, 0, 0.4, weather)[key])).toBeLessThan(luma(sky(12, environment, 0, 0.4, weather)[key]) * 0.1);
      }
    }
  });
});
