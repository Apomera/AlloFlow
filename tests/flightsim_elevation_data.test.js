import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const directory = 'vendor/skyschool-elevation/';
const data = JSON.parse(readFileSync(directory + 'elevation-grid.json', 'utf8'));
const fixtures = JSON.parse(readFileSync(directory + 'source-samples.json', 'utf8'));
const independentChecks = JSON.parse(readFileSync(directory + 'independent-source-checks.json', 'utf8'));
const lakes = JSON.parse(readFileSync(directory + 'lake-levels.json', 'utf8'));
const coast = JSON.parse(readFileSync('vendor/skyschool-geography/land-water-mask.json', 'utf8'));
const coastRows = coast.rle.split(';');
let api;

beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterAll(() => { delete window.__RR_TEST_EXPORTS__; });

function sourceWater(lat, lon) {
  const row = Math.min(coast.height - 1, Math.max(0, Math.floor((90 - lat) / coast.resolutionDegrees)));
  const column = Math.floor(((lon + 180) % 360 + 360) % 360 / coast.resolutionDegrees);
  let end = 0, water = true;
  for (const run of coastRows[row].split(',')) {
    end += parseInt(run, 36);
    if (column < end) return water;
    water = !water;
  }
  throw new Error('Uncovered coast cell');
}
function sourceLake(lat, lon) {
  const row = Math.min(lakes.height - 1, Math.max(0, Math.floor((90 - lat) / lakes.resolutionDegrees)));
  const column = Math.floor(((lon + 180) % 360 + 360) % 360 / lakes.resolutionDegrees);
  for (const [start, end, id] of lakes.rows[row] || []) {
    if (column >= start && column < end) return lakes.levelsMeters[id];
  }
  return null;
}
function surfaceAtSourceSample(sample) {
  if (sample.waterMask) return sourceLake(sample.lat, sample.lon) ?? 0;
  return Math.floor(sample.rawSourceMeters + 0.5);
}

// Independent decoder: Node handles Base64 and token arithmetic uses ordinary
// integers, separately from the browser's bit-stream/bitwise implementation.
const testRowCache = new Map();
function decodedRow(grid, row) {
  const key = grid.id + ':' + row;
  if (testRowCache.has(key)) return testRowCache.get(key);
  const bytes = Buffer.from(grid.rows[row], 'base64'), values = [];
  let offset = 0, previous = 0;
  function token() {
    let value = 0, multiplier = 1;
    for (;;) {
      if (offset >= bytes.length) throw new Error('Truncated test fixture token');
      const digit = bytes[offset++]; value += (digit % 128) * multiplier;
      if (digit < 128) return value;
      multiplier *= 128;
    }
  }
  while (values.length < grid.width) {
    const value = token();
    if (value === 0) {
      const count = token();
      for (let index = 0; index < count; index++) values.push(previous);
    } else {
      const zigzag = value - 1;
      previous += zigzag % 2 ? -(zigzag + 1) / 2 : zigzag / 2;
      values.push(previous);
    }
  }
  expect(values).toHaveLength(grid.width); expect(offset).toBe(bytes.length);
  testRowCache.set(key, values);
  return values;
}
function gridInterpolation(grid, lat, lon, wrap = false) {
  const horizontal = ((lon - grid.lon0) % 360 + 360) % 360 / grid.step;
  const vertical = (lat - grid.lat0) / grid.step;
  const x = Math.floor(horizontal), y = Math.floor(vertical);
  const dx = horizontal - x, dy = vertical - y;
  const sample = (column, row) => {
    const c = wrap ? column % grid.width : column;
    const r = Math.max(0, Math.min(grid.height - 1, row));
    const lake = sourceLake(grid.lat0 + r * grid.step, grid.lon0 + c * grid.step);
    return lake ?? decodedRow(grid, r)[c];
  };
  return sample(x, y) * (1 - dx) * (1 - dy) + sample(x + 1, y) * dx * (1 - dy)
    + sample(x, y + 1) * (1 - dx) * dy + sample(x + 1, y + 1) * dx * dy;
}

describe('retained NOAA source and runtime elevations', () => {
  it('records metre heights, the source vertical datum, and distinct native-aligned regional grids', () => {
    const schema = readFileSync(directory + 'source-schema.dds', 'utf8');
    const attributes = readFileSync(directory + 'source-metadata.das', 'utf8');
    expect(schema).toContain('Float32 z[lat = 10800][lon = 21600]');
    expect(attributes).toContain('String units "meters"');
    expect(attributes).toContain('String vert_crs_name "EGM2008"');
    expect(attributes).toContain('String positive "up"');
    expect(data.units).toBe('meters'); expect(data.verticalDatum).toBe('EGM2008');
    expect(new Set(data.grids.map(grid => grid.id)).size).toBe(data.grids.length);
    expect(data.grids[0].step).toBeCloseTo(5 / 60, 12);
    // Airport regions keep the 60 arc-second source; mountain patches use the
    // native 15 arc-second product, indexed in a global 15-second frame.
    const airports = data.grids.filter(grid => grid.id.endsWith('-1min'));
    const mountains = data.grids.filter(grid => grid.id.endsWith('-15s'));
    expect(airports).toHaveLength(11);
    expect(mountains.length).toBeGreaterThanOrEqual(12);
    expect(airports.every(grid => grid.step === 1 / 60 && grid.sourceArcSeconds === 60)).toBe(true);
    expect(mountains.every(grid => grid.step === 1 / 240 && grid.sourceArcSeconds === 15 && /^[NS]\d\d[EW]\d{3}$/.test(grid.sourceTile))).toBe(true);
    expect(airports.length + mountains.length).toBe(data.grids.length - 1);
    for (const grid of data.grids) {
      const cells = 3600 / grid.sourceArcSeconds;
      expect(grid.lat0).toBeCloseTo(-90 + (grid.sourceRowStart + 0.5) / cells, 10);
      expect(grid.lon0).toBeCloseTo(-180 + (grid.sourceColStart + 0.5) / cells, 10);
      expect(grid.rows).toHaveLength(grid.height);
    }
  });

  it('cross-checks committed source fixtures against independently retrieved NOAA ASCII responses', () => {
    const samples = [...fixtures.samples, ...fixtures.interpolationCases.flatMap(item =>
      item.corners.map(corner => ({ ...corner, gridId: item.gridId })))];
    for (const sample of samples) {
      const grid = data.grids.find(item => item.id === sample.gridId);
      expect(sample.sourceRow).toBe(grid.sourceRowStart + sample.row * grid.sourceStride);
      expect(sample.sourceColumn).toBe(grid.sourceColStart + sample.column * grid.sourceStride);
      expect(sample.runtimeMeters).toBe(sample.waterMask ? 0 : Math.floor(sample.rawSourceMeters + 0.5));
    }
    expect(independentChecks.checks.length).toBeGreaterThanOrEqual(12);
    for (const check of independentChecks.checks) {
      expect(createHash('sha256').update(check.responseText).digest('hex')).toBe(check.responseSha256);
      const responseValue = Number(check.responseText.match(/^\[0\],\s*([-+\d.eE]+)\s*$/m)?.[1]);
      expect(Number.isFinite(responseValue)).toBe(true); expect(responseValue).toBe(check.asciiMeters);
      const source = fixtures.samples.find(sample => sample.gridId === check.gridId
        && sample.sourceRow === check.sourceRow && sample.sourceColumn === check.sourceColumn);
      expect(source, check.label).toBeTruthy();
      expect(Math.abs(source.rawSourceMeters - responseValue)).toBeLessThan(0.001);
      const url = new URL(check.url);
      expect(url.hostname).toBe('www.ngdc.noaa.gov');
      expect(url.pathname.endsWith('.nc.ascii')).toBe(true);
      expect(url.search).toContain('[' + check.sourceRow + ':1:' + check.sourceRow + ']');
      expect(url.search).toContain('[' + check.sourceColumn + ':1:' + check.sourceColumn + ']');
    }
  });

  it('reproduces official sample centres with metre-to-foot conversion and lake surface overrides', () => {
    // A finer patch that reaches a sample replaces (or blends over) the coarser grid there,
    // and 15-second nodes do not coincide with 60-second ones, so each sample
    // is checked only where its own grid is the finest at full weight.
    const covers = (grid, lat, lon) => {
      const dx = lon - grid.lon0, dy = lat - grid.lat0;
      return Math.min(dx, dy, (grid.width - 1) * grid.step - dx, (grid.height - 1) * grid.step - dy) > 0;
    };
    const finest = sample => {
      const grid = data.grids.find(item => item.id === sample.gridId);
      return !data.grids.some(other => other.step < grid.step && covers(other, sample.lat, sample.lon));
    };
    const checked = fixtures.samples.filter(finest);
    expect(checked.filter(sample => sample.gridId.endsWith('-15s')).length).toBeGreaterThanOrEqual(12);
    for (const sample of checked) {
      expect(sourceWater(sample.lat, sample.lon)).toBe(sample.waterMask);
      expect(api.getFlightTerrainHeight(sample.lat, sample.lon) * 0.3048, sample.label + ' ' + sample.gridId)
        .toBeCloseTo(surfaceAtSourceSample(sample), 5);
    }
  });

  it('interpolates independent native source corners, using the finer complete region when present', () => {
    // Regional fixtures follow global fixtures and replace the same location.
    const selected = new Map(fixtures.interpolationCases.map(item => [item.label, item]));
    for (const sample of selected.values()) {
      const [sw, se, nw, ne] = sample.corners.map(surfaceAtSourceSample);
      const x = sample.fractionX, y = sample.fractionY;
      const interpolated = sw * (1 - x) * (1 - y) + se * x * (1 - y) + nw * (1 - x) * y + ne * x * y;
      const water = sourceWater(sample.queryLat, sample.queryLon);
      const expected = water ? (sourceLake(sample.queryLat, sample.queryLon) ?? 0) : interpolated;
      expect(api.getFlightTerrainHeight(sample.queryLat, sample.queryLon) * 0.3048, sample.label).toBeCloseTo(expected, 5);
    }
  });

  it('preserves a real below-sea land basin while separating ocean and inland water surfaces from seabed values', () => {
    const valley = fixtures.samples.find(sample => sample.label === 'Death Valley');
    expect(valley.rawSourceMeters).toBeLessThan(0); expect(valley.waterMask).toBe(false);
    expect(api.isWaterMask(valley.lat, valley.lon)).toBe(false);
    expect(api.getFlightTerrainHeight(valley.lat, valley.lon)).toBeCloseTo(valley.runtimeMeters / 0.3048, 5);
    expect(api.getFlightGroundElevation(valley.lat, valley.lon)).toBeCloseTo(valley.runtimeMeters / 0.3048, 5);
    for (const sample of fixtures.samples.filter(item => ['Pacific Ocean', 'Atlantic Ocean'].includes(item.label))) {
      expect(sample.rawSourceMeters).toBeLessThan(-1000);
      expect(api.getFlightTerrainHeight(sample.lat, sample.lon)).toBe(0);
    }
    for (const [lat, lon] of [[47.7, -87.5], [39.1, -120.05], [-15.85, -69.4], [42, 51], [31.5, 35.5]]) {
      const expected = sourceLake(lat, lon);
      expect(expected).not.toBeNull();
      expect(api.getFlightTerrainHeight(lat, lon) * 0.3048).toBeCloseTo(expected, 7);
    }
  });

  it('does not flood separately mapped islands inside a lake polygon', () => {
    const [lat, lon] = [46.435, 53.005];
    expect(sourceWater(lat, lon)).toBe(false); expect(sourceLake(lat, lon)).toBeNull();
    expect(api.isWaterMask(lat, lon)).toBe(false);
    expect(api.getFlightLakeElevationMeters(lat, lon)).toBeNull();
  });
});

describe('continuous geographic sampling and bounded decoding', () => {
  it('wraps repeated longitudes and joins Antarctic terrain across the dateline', () => {
    // The shipped coastline mask classifies the -80° dateline ice shelf as
    // water; -85° is verified land on both sides of this seam.
    for (const lat of [-85, -16, 0, 64]) {
      const atSeam = api.getFlightTerrainHeight(lat, 180);
      for (const lon of [-900, -540, -180, 540, 900]) expect(api.getFlightTerrainHeight(lat, lon)).toBeCloseTo(atSeam, 6);
      expect(api.getFlightTerrainHeight(lat, 180 - 1e-8)).toBeCloseTo(api.getFlightTerrainHeight(lat, -180 + 1e-8), 2);
    }
    expect(sourceWater(-85, 180)).toBe(false);
    expect(api.isWaterMask(-85, 180)).toBe(false);
  });

  it('converges all meridians to one finite elevation at each pole', () => {
    for (const pole of [-90, 90]) {
      const expected = api.getFlightTerrainHeight(pole, 0);
      expect(Number.isFinite(expected)).toBe(true);
      for (const lon of [-180, -120, -45, 0, 87, 179.99]) {
        expect(api.getFlightTerrainHeight(pole, lon)).toBeCloseTo(expected, 6);
        expect(api.getFlightTerrainHeight(pole - Math.sign(pole) * 1e-8, lon)).toBeCloseTo(expected, 2);
      }
    }
  });

  it('blends the Denver detail edge into the global source without a step or double-counted relief', () => {
    const global = data.grids[0], regional = data.grids.find(grid => grid.id === 'denver-1min');
    const lat = regional.lat0 + 1.5, edgeLon = regional.lon0;
    for (const inset of [-0.001, 0, 0.075, 0.15, 0.25]) {
      const lon = edgeLon + inset, base = gridInterpolation(global, lat, lon, true);
      const detail = inset > 0 ? gridInterpolation(regional, lat, lon) : base;
      const t = Math.max(0, Math.min(1, inset / 0.15)), weight = 3 * t * t - 2 * t * t * t;
      expect(sourceWater(lat, lon)).toBe(false);
      expect(api.getFlightTerrainHeight(lat, lon) * 0.3048).toBeCloseTo(base * (1 - weight) + detail * weight, 5);
    }
    for (const edge of [edgeLon, edgeLon + 0.15]) {
      expect(api.getFlightTerrainHeight(lat, edge - 1e-8)).toBeCloseTo(api.getFlightTerrainHeight(lat, edge + 1e-8), 2);
    }
  });

  it('evicts old decoded rows within its documented cache bound without changing sampled heights', () => {
    const sample = fixtures.samples.find(item => item.label === 'Death Valley');
    const before = api.getFlightTerrainHeight(sample.lat, sample.lon);
    for (let lat = -89; lat < 89; lat += 0.5) {
      for (const lon of [-100, 20, 100]) {
        expect(Number.isFinite(api.getFlightTerrainHeight(lat, lon))).toBe(true);
        expect(api.getFlightElevationInfo().cachedRows).toBeLessThanOrEqual(api.getFlightElevationInfo().cacheLimit);
      }
    }
    const info = api.getFlightElevationInfo();
    // 512 rows hold a full 15 arc-second patch (up to 217 rows) plus the
    // global and airport rows one terrain rebuild and the distant ring visit.
    expect(info.cacheLimit).toBe(512); expect(info.cachedRows).toBe(info.cacheLimit); expect(info.decodeFailure).toBe(false);
    expect(api.getFlightTerrainHeight(sample.lat, sample.lon)).toBe(before);
  });

  it('returns a finite neutral surface for invalid inputs without decoding extra rows', () => {
    const count = api.getFlightElevationInfo().cachedRows;
    for (const [lat, lon] of [[NaN, 0], [0, NaN], [Infinity, 0], [0, Infinity], [-90.01, 0], [90.01, 0]]) {
      expect(api.getFlightTerrainHeight(lat, lon)).toBe(0);
      expect(api.getFlightLakeElevationMeters(lat, lon)).toBeNull();
    }
    expect(api.getFlightElevationInfo().cachedRows).toBe(count);
  });
});
