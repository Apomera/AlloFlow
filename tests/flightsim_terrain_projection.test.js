import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;
let terrainFunction;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
  const start = source.indexOf('var drawTerrain = function') + 'var drawTerrain = '.length;
  const end = source.indexOf('// ── Mini-map ──', start);
  terrainFunction = source.slice(start, end).trim().replace(/;$/, '');
});

const state = patch => ({ lat: 43, lon: -70, heading: 90, altitude: 5000, fieldElev: 0, ...patch });
const sample = (y, patch = {}, ground = 0) => FS.getCanvasTerrainSample(state(patch), y, 360, 720, ground);
const distance = (origin, point) => FS.haversineNm(origin.lat, origin.lon, point.lat, point.lon);

function drawBands(flight, localGround, horizon = 360, focalLength) {
  const cells = [];
  const rectangles = [];
  const graphics = new Proxy({ _flightFocalLength: focalLength }, {
    get(target, key) {
      if (key === 'fillRect') return (x, y, w, h) => rectangles.push({ x, y, w, h, fill: target.fillStyle });
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  // Execute the actual Canvas terrain pass, with a uniform sea and no random
  // landmarks so the observations contain only geographic bands and haze.
  const draw = new Function('getCanvasTerrainSample', 'isWater', 'groundBelowAircraft', 'getWorldEnvironment', 'terrainHash',
    'return (' + terrainFunction + ');')(
    FS.getCanvasTerrainSample, () => true, () => localGround,
    (lat, lon) => { cells.push({ lat, lon }); return { id: 'ocean', color: [20, 80, 150] }; }, () => 0);
  draw(graphics, 1280, 720, horizon, flight, 0, null);
  return { cells, bands: rectangles.filter(rect => String(rect.fill).startsWith('rgb(')) };
}

describe('Canvas terrain perspective', () => {
  it('looks farther ahead at the horizon and closer ahead in the foreground', () => {
    const samples = Array.from({ length: 16 }, (_, row) => sample(360 + (row + 0.5) * 22.5));
    const ranges = samples.map(point => distance(state(), point));
    for (let row = 1; row < ranges.length; row++) expect(ranges[row]).toBeLessThan(ranges[row - 1]);
    expect(ranges[0] / ranges[15]).toBeCloseTo(31, 8);
  });

  it('uses inverse projected distance rather than growing the range with row depth', () => {
    expect(sample(420).distanceNm).toBeCloseTo(sample(480).distanceNm * 2, 10);
    expect(sample(480).distanceNm).toBeCloseTo(5000 * (720 / (2 * Math.tan(Math.PI / 6))) / 120 / 6076.12, 10);
  });

  it('uses height above local terrain consistently at sea level and high-elevation airports', () => {
    const low = sample(500, { altitude: 1200 }, 0);
    const denver = sample(500, { altitude: 6631, fieldElev: 5431 }, 5431);
    expect(denver).toEqual(low);
    expect(sample(500, { altitude: 5431 }, 5431).heightAboveGroundFt).toBe(100);
  });

  it('preserves perspective when a padded Canvas keeps the original focal length', () => {
    const flight = state();
    const original = FS.getCanvasTerrainSample(flight, 500, 360, 720, 0, 300);
    const padded = FS.getCanvasTerrainSample(flight, 500, 360, 1440, 0, 300);
    expect(padded).toEqual(original);
    expect(original.distanceNm).toBeCloseTo(5000 * 300 / 140 / 6076.12, 10);
  });

  it('bounds the coarse flat-ground approximation near the horizon', () => {
    const point = sample(360, { altitude: 35000 });
    expect(point.distanceNm).toBe(120);
    expect(distance(state({ altitude: 35000 }), point)).toBeCloseTo(120, 8);
  });

  for (const latitude of [0, 43, 75, -75]) {
    for (const heading of [0, 90, 180, 270]) {
      it('preserves distance and initial heading at latitude ' + latitude + ' heading ' + heading, () => {
        const origin = state({ lat: latitude, heading });
        const point = sample(500, { lat: latitude, heading });
        expect(distance(origin, point)).toBeCloseTo(point.distanceNm, 8);
        const error = ((FS.bearing(origin.lat, origin.lon, point.lat, point.lon) - heading + 540) % 360) - 180;
        expect(error).toBeCloseTo(0, 8);
      });
    }
  }

  it('accounts for narrower longitude spacing at high latitude', () => {
    const equator = sample(500, { lat: 0 });
    const arctic = sample(500, { lat: 75 });
    expect((arctic.lon + 70) / (equator.lon + 70)).toBeCloseTo(1 / Math.cos(75 * Math.PI / 180), 3);
  });

  it.each([{ lon: 179.99, heading: 90 }, { lon: -179.99, heading: 270 }])('wraps samples across the dateline: %j', patch => {
    const origin = state({ ...patch, lat: 0 });
    const point = sample(500, { ...patch, lat: 0 });
    expect(point.lon).toBeGreaterThanOrEqual(-180);
    expect(point.lon).toBeLessThan(180);
    expect(Math.sign(point.lon)).toBe(-Math.sign(patch.lon));
    expect(distance(origin, point)).toBeCloseTo(point.distanceNm, 8);
  });

  it.each([89.99, -89.99])('keeps a pole-crossing sample finite at latitude %s', lat => {
    const point = sample(361, { lat, heading: lat > 0 ? 0 : 180 });
    expect(Number.isFinite(point.lat) && Number.isFinite(point.lon)).toBe(true);
    expect(Math.abs(point.lat)).toBeLessThanOrEqual(90);
    expect(distance(state({ lat }), point)).toBeCloseTo(point.distanceNm, 7);
  });
});

describe('Canvas terrain drawing uses the sampled perspective', () => {
  it('paints complete bands from the horizon while sampling the center of each band', () => {
    const flight = state();
    const { cells, bands } = drawBands(flight, 0);
    expect(cells).toHaveLength(16);
    expect(bands).toHaveLength(16);
    expect(bands[0].y).toBe(360);
    expect(bands[15].y + bands[15].h).toBeGreaterThanOrEqual(720);
    cells.forEach((cell, row) => {
      const center = 360 + (row + 0.5) * 22.5;
      const expected = FS.getCanvasTerrainSample(flight, center, 360, 720, 0);
      expect(cell).toEqual({ lat: expected.lat, lon: expected.lon });
    });
    expect(distance(flight, cells[0])).toBeGreaterThan(distance(flight, cells[15]) * 30);
  });

  it('renders the same local range at high and low field elevations', () => {
    const low = drawBands(state({ altitude: 3000 }), 0);
    const high = drawBands(state({ altitude: 8431, fieldElev: 5431 }), 5431);
    expect(high.cells).toEqual(low.cells);
    expect(high.bands).toEqual(low.bands);
  });

  it('uses the supplied camera focal length in the actual painted terrain bands', () => {
    const flight = state();
    const { cells } = drawBands(flight, 0, 360, 300);
    expect(cells).toHaveLength(16);
    cells.forEach((cell, row) => {
      const center = 360 + (row + 0.5) * 22.5;
      const expected = FS.getCanvasTerrainSample(flight, center, 360, 720, 0, 300);
      expect(cell).toEqual({ lat: expected.lat, lon: expected.lon });
    });
    const defaultCells = drawBands(flight, 0).cells;
    expect(distance(flight, cells[15])).toBeLessThan(distance(flight, defaultCells[15]) * 0.5);
  });

  it('skips terrain bands when the visible horizon is below the screen', () => {
    const result = drawBands(state(), 0, 800);
    expect(result.cells).toEqual([]);
    expect(result.bands).toEqual([]);
  });
});
