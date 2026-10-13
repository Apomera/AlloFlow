import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DEG = Math.PI / 180;
const SITES = [
  { m: 11, lon: 23.473, lat: 0.674, daylight: true },
  { m: 12, lon: -23.422, lat: -3.012, daylight: false },
  { m: 14, lon: -17.471, lat: -3.645, daylight: false },
  { m: 15, lon: 3.634, lat: 26.132, daylight: false },
  { m: 16, lon: 15.501, lat: -8.973, daylight: true },
  { m: 17, lon: 30.772, lat: 20.191, daylight: true },
];
const SEAS = [
  { key: 'A', name: 'Oceanus Procellarum', label: 'Ocean of Storms', lon: -52, lat: 14 },
  { key: 'B', name: 'Mare Imbrium', label: 'Sea of Rains', lon: -17, lat: 33 },
  { key: 'C', name: 'Mare Frigoris', label: 'Sea of Cold', lon: 5, lat: 57 },
  { key: 'D', name: 'Mare Serenitatis', label: 'Sea of Serenity', lon: 21, lat: 33 },
  { key: 'E', name: 'Mare Tranquillitatis', label: 'Sea of Tranquility', lon: 31, lat: 9 },
  { key: 'F', name: 'Mare Crisium', label: 'Sea of Crises', lon: 59, lat: 17 },
  { key: 'G', name: 'Mare Fecunditatis', label: 'Sea of Fertility', lon: 51, lat: -8 },
  { key: 'H', name: 'Mare Nubium', label: 'Sea of Clouds', lon: -17, lat: -21 },
];

function canvasRecorder() {
  const calls = [];
  const record = (key, args) => {
    for (const value of args) {
      if (typeof value === 'number') expect(Number.isFinite(value), String(key)).toBe(true);
    }
    calls.push([key, ...args]);
  };
  const gradient = (...args) => {
    record('gradient', args);
    return { addColorStop: (...stop) => record('stop', stop) };
  };
  const known = {
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    measureText: (text) => ({ width: String(text).length * 5 }),
  };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => record(key, args)),
    set: (target, key, value) => {
      if (typeof value === 'number') expect(Number.isFinite(value), String(key)).toBe(true);
      target[key] = value;
      calls.push(['set', key, value]);
      return true;
    },
  });
  return { ctx, calls };
}

let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

describe('lunar atlas geographic lighting', () => {
  it('matches the independent Sun dot surface normal in geographic and projected coordinates', () => {
    for (const term of [-65, 12.673, 45]) {
      const sun = [Math.sin((term + 90) * DEG), 0, Math.cos((term + 90) * DEG)];
      for (const lon of [-80, 0, 30, 85]) {
        for (const lat of [-80, -40, 0, 60, 80]) {
          const normal = [Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];
          const dot = normal.reduce((sum, value, i) => sum + value * sun[i], 0);
          const light = P.lunarLight(lon, lat, term);
          expect(light.incidence).toBeCloseTo(dot, 12);
          expect(light.elevation).toBeCloseTo(Math.asin(dot) / DEG, 10);
          expect(light.daylight).toBe(dot > 0);
          expect(P.lunarSurfaceLight(normal[0], normal[1], term)).toBeCloseTo(dot, 12);
        }
      }
    }
  });

  it('puts sunrise at zero elevation for every latitude on the terminator meridian', () => {
    for (const term of [-40, 0, 12.673, 70]) {
      for (const lat of [-90, -75, -30, 0, 30, 75, 90]) {
        const light = P.lunarLight(term, lat, term);
        expect(light.incidence).toBe(0);
        expect(light.elevation).toBe(0);
        expect(light.daylight).toBe(false);
        if (Math.abs(lat) < 90) {
          expect(P.lunarLight(term - 0.01, lat, term).elevation).toBeLessThan(0);
          expect(P.lunarLight(term + 0.01, lat, term).elevation).toBeGreaterThan(0);
        }
      }
    }
  });

  it('reduces the magnitude of Sun elevation toward either pole on the day and night sides', () => {
    for (const lon of [-30, 30]) {
      let previous = Math.abs(P.lunarLight(lon, 0, 0).elevation);
      expect(previous).toBeCloseTo(30, 12);
      for (const latitude of [20, 45, 60, 80, 90]) {
        const north = P.lunarLight(lon, latitude, 0);
        const south = P.lunarLight(lon, -latitude, 0);
        expect(Math.abs(north.elevation)).toBeLessThan(previous);
        expect(south.elevation).toBeCloseTo(north.elevation, 12);
        expect(north.elevation).toBeCloseTo(Math.asin(Math.cos(latitude * DEG) * Math.sin(lon * DEG)) / DEG, 12);
        previous = Math.abs(north.elevation);
      }
    }
  });

  it('uses the Apollo 11 daylight example for all six fixed geographic landing sites', () => {
    expect(P.terminatorLon()).toBeCloseTo(12.673, 12);
    expect(P.moonSites().map(({ m, lon, lat }) => ({ m, lon, lat }))).toEqual(SITES.map(({ m, lon, lat }) => ({ m, lon, lat })));
    for (const site of SITES) {
      const light = P.lunarLight(site.lon, site.lat);
      expect(light.daylight, 'Apollo ' + site.m).toBe(site.daylight);
      expect(Math.sign(light.elevation)).toBe(site.daylight ? 1 : -1);
      const explicit = P.lunarLight(site.lon, site.lat, 12.673);
      expect(light.incidence).toBeCloseTo(explicit.incidence, 12);
      expect(light.elevation).toBeCloseTo(explicit.elevation, 12);
      expect(light.daylight).toBe(explicit.daylight);
    }
    expect(P.lunarLight(23.473, 0.674).elevation).toBeCloseTo(10.799, 3);
    expect(P.lunarLight(3.634, 26.132).elevation).toBeLessThan(-8);
  });

  it('matches the closed phase fraction when illumination is counted over equal area disk pixels', () => {
    const resolution = 240;
    for (const term of [-90, -45, 0, 12.673, 45, 90]) {
      let disk = 0, lit = 0;
      for (let row = 0; row < resolution; row += 1) {
        const v = 1 - 2 * (row + 0.5) / resolution;
        for (let col = 0; col < resolution; col += 1) {
          const u = 2 * (col + 0.5) / resolution - 1;
          if (u * u + v * v > 1) continue;
          disk += 1;
          if (P.lunarSurfaceLight(u, v, term) > 0) lit += 1;
        }
      }
      const expectedFraction = (1 + Math.cos((term + 90) * DEG)) / 2;
      expect(Math.abs(lit / disk - expectedFraction), 'terminator ' + term).toBeLessThan(0.003);
      if (term === 12.673) expect(lit / disk).toBeGreaterThan(0.38);
      if (term === 12.673) expect(lit / disk).toBeLessThan(0.40);
    }
  });

  it('rejects points outside the disk and nonfinite coordinates while retaining the exact limb', () => {
    for (const [u, v] of [[1.0001, 0], [-1.0001, 0], [0, 1.0001], [0.8, 0.8], [NaN, 0], [0, Infinity], [undefined, 0], ['0', 0]]) {
      expect(P.lunarSurfaceLight(u, v)).toBeNull();
    }
    const term = 12.673;
    expect(P.lunarSurfaceLight(1, 0, term)).toBeCloseTo(Math.sin((term + 90) * DEG), 12);
    expect(P.lunarSurfaceLight(-1, 0, term)).toBeCloseTo(-Math.sin((term + 90) * DEG), 12);
    expect(P.lunarSurfaceLight(0, 1, term)).toBe(0);
    expect(P.lunarSurfaceLight(0, -1, term)).toBe(0);
    expect(P.lunarSurfaceLight(0, 0, term)).toBeCloseTo(Math.cos((term + 90) * DEG), 12);
  });

  it('normalizes malformed saved site enums without coercing objects or accepting unflown missions', () => {
    for (const site of SITES) expect(P.lunarAtlasSite(site.m)).toBe(site.m);
    const coercionTrap = Object.freeze({
      valueOf: () => { throw new Error('Saved site objects must not be coerced'); },
      toString: () => { throw new Error('Saved site objects must not be coerced'); },
    });
    const savedObject = Object.freeze({ __proto__: null, site: 15, constructor: '17' });
    for (const value of [undefined, null, false, true, 0, 13, 18, -15, 15.5, NaN, Infinity, '15', '<script>17</script>', [17], {}, savedObject, coercionTrap]) {
      expect(P.lunarAtlasSite(value)).toBe(11);
    }
    expect(savedObject.site).toBe(15);
    expect(savedObject.constructor).toBe('17');
    expect(Object.getPrototypeOf(savedObject)).toBeNull();
  });

  it('keeps all named sea keys, labels and geographic coordinates stable across caller edits', () => {
    const seas = P.lunarSeas();
    expect(seas).toEqual(SEAS);
    expect(new Set(seas.map((sea) => sea.key)).size).toBe(8);
    for (const sea of seas) {
      expect(Math.abs(sea.lon)).toBeLessThan(90);
      expect(Math.abs(sea.lat)).toBeLessThan(90);
    }
    const second = P.lunarSeas();
    expect(second).not.toBe(seas);
    second.forEach((sea, i) => expect(sea).not.toBe(seas[i]));
    seas[0].key = 'Z';
    seas[0].lon = 999;
    seas.splice(1, 1);
    expect(second).toEqual(SEAS);
    expect(P.lunarSeas()).toEqual(SEAS);
  });

  it('draws finite geographic markers for every selected Apollo site at narrow and wide canvas sizes', () => {
    const originalSites = JSON.stringify(P.moonSites());
    for (const width of [280, 320, 1100]) {
      for (const site of SITES) {
        const options = Object.freeze({ labels: true, site: site.m });
        const recorder = canvasRecorder();
        const view = P.drawLunarAtlas(recorder.ctx, width, 400, options);
        const radius = Math.min(150, (width - 36) / 2);
        const x = width / 2 + radius * Math.cos(site.lat * DEG) * Math.sin(site.lon * DEG);
        const y = 204 - radius * Math.sin(site.lat * DEG);
        expect(view.selectedSite).toBe(site.m);
        expect(view.moonX).toBe(width / 2);
        expect(view.moonY).toBe(204);
        expect(view.moonRadius).toBe(radius);
        expect(view.selectedX).toBeCloseTo(x, 10);
        expect(view.selectedY).toBeCloseTo(y, 10);
        expect(view.light.daylight).toBe(site.daylight);
        const marker = recorder.calls.find((call) => call[0] === 'arc' && call[3] === 7);
        expect(marker).toBeDefined();
        expect(marker[1]).toBeCloseTo(x, 10);
        expect(marker[2]).toBeCloseTo(y, 10);
        const labels = recorder.calls.filter((call) => call[0] === 'fillText').map((call) => call[1]);
        for (const sea of SEAS) expect(labels).toContain(sea.key);
        expect(labels).toContain('Tranquility Base');
        for (const mission of ['12', '14', '15', '16', '17']) expect(labels).toContain(mission);
        expect(options).toEqual({ labels: true, site: site.m });
      }
    }
    expect(JSON.stringify(P.moonSites())).toBe(originalSites);
  });

  it('defaults to Tranquility Base and preserves its green marker when optional labels are hidden', () => {
    for (const options of [undefined, Object.freeze({}), Object.freeze({ labels: false, site: '<script>15</script>' })]) {
      const originalOptions = JSON.stringify(options);
      const recorder = canvasRecorder();
      const view = P.drawLunarAtlas(recorder.ctx, 320, 400, options);
      const x = 160 + 142 * Math.cos(0.674 * DEG) * Math.sin(23.473 * DEG);
      const y = 204 - 142 * Math.sin(0.674 * DEG);
      expect(view.selectedSite).toBe(11);
      expect(view.selectedX).toBeCloseTo(x, 10);
      expect(view.selectedY).toBeCloseTo(y, 10);
      expect(view.siteX).toBeCloseTo(x, 10);
      expect(view.siteY).toBeCloseTo(y, 10);
      expect(view.labels).toBe(options?.labels !== false);
      const markerIndex = recorder.calls.findIndex((call) => call[0] === 'arc' && call[3] === 3 && Math.abs(call[1] - x) < 1e-9 && Math.abs(call[2] - y) < 1e-9);
      expect(markerIndex).toBeGreaterThanOrEqual(0);
      const fillStyle = recorder.calls.slice(0, markerIndex).filter((call) => call[0] === 'set' && call[1] === 'fillStyle').slice(-1)[0];
      expect(fillStyle[2]).toBe('#6ee7b7');
      expect(recorder.calls.some((call) => call[0] === 'fillText' && call[1] === 'Tranquility Base')).toBe(true);
      if (options) expect(Object.isFrozen(options)).toBe(true);
      expect(JSON.stringify(options)).toBe(originalOptions);
    }
  });
});
