import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const geography = readFileSync('stem_lab/stem_data_skyschool_geo.js', 'utf8');
const dataset = JSON.parse(readFileSync('vendor/skyschool-geography/land-water-mask.json', 'utf8'));
const oracle = JSON.parse(readFileSync('tests/fixtures/skyschool_geography_points.json', 'utf8'));
const encodedRows = dataset.rle.split(';');
const hash = value => createHash('sha256').update(value).digest('hex');

// Run the actual standalone module in an isolated world. Instrument allocation
// rather than exposing its private geographic caches just for these tests.
function geographicRuntime() {
  const allocations = { spans: [], bytes: [] };
  class TracedUint16Array extends Uint16Array {
    constructor(...args) {
      if (typeof args[0] === 'number' && args[0] > 1000000) throw new Error('Geographic span allocation exceeds budget');
      super(...args);
      allocations.spans.push(this.byteLength);
    }
  }
  class TracedUint8Array extends Uint8Array {
    constructor(...args) {
      if (typeof args[0] === 'number' && args[0] > 2000000) throw new Error('Geography attempted to allocate a full bitmap');
      super(...args);
      allocations.bytes.push(this.byteLength);
    }
  }
  const sandbox = {
    window: { __RR_TEST_EXPORTS__: {} },
    // All module-level DOM work only ensures shared style/live-region nodes.
    // Rendering is covered by the component suites, not this geographic oracle.
    document: { getElementById: () => ({}) },
    console: { log() {}, warn() {}, error() {} },
    Uint16Array: TracedUint16Array,
    Uint8Array: TracedUint8Array,
  };
  // The geography loads first, as the STEM loader does (stemModuleDependencies).
  runInNewContext(geography, sandbox, { timeout: 5000 });
  runInNewContext(source, sandbox, { timeout: 5000 });
  const api = sandbox.window.__RR_TEST_EXPORTS__.flightSim;
  expect(api.isWaterMask).toBeTypeOf('function');
  return { water: api.isWaterMask, allocations };
}

let water;
beforeAll(() => { water = geographicRuntime().water; });

const cellLatitude = row => 90 - (row + 0.5) * dataset.resolutionDegrees;
const cellLongitude = column => -180 + (column + 0.5) * dataset.resolutionDegrees;

describe('SkySchool offline Natural Earth geographic provenance', () => {
  it('ships the verified source archives and independent polygon oracle', () => {
    expect(dataset.format).toBe('skyschool-land-water-rle-v1');
    expect(dataset.resolutionDegrees).toBe(0.01);
    expect(dataset.width).toBe(36000);
    expect(dataset.height).toBe(18000);
    expect(dataset.bounds).toEqual([-180, -90, 180, 90]);
    expect(oracle.resolutionDegrees).toBe(dataset.resolutionDegrees);
    expect(oracle.sourceArchives).toEqual(dataset.sourceArchives);
    expect(dataset.sourceArchives).toHaveLength(2);
    for (const archive of dataset.sourceArchives) {
      expect(hash(readFileSync('vendor/skyschool-geography/' + archive.file)), archive.file).toBe(archive.sha256);
    }
    expect(hash(dataset.rle)).toBe(dataset.rleSha256);
    expect(oracle.points.length).toBeGreaterThanOrEqual(30);
    expect(oracle.points.some(point => point.expectedWater)).toBe(true);
    expect(oracle.points.some(point => !point.expectedWater)).toBe(true);
  });

  it('contains complete north-to-south rows with valid water-first runs', () => {
    expect(encodedRows).toHaveLength(dataset.height);
    let endpointBytes = 0;
    for (let row = 0; row < encodedRows.length; row++) {
      const tokens = encodedRows[row].split(',');
      let width = 0;
      for (const token of tokens) {
        if (!/^[0-9a-z]+$/.test(token)) throw new Error('Invalid base36 token in row ' + row);
        const length = Number.parseInt(token, 36);
        if (!Number.isInteger(length) || length < 0 || length > dataset.width) throw new Error('Invalid run length in row ' + row);
        width += length;
      }
      if (width !== dataset.width) throw new Error('Incomplete geographic row ' + row + ': ' + width);
      endpointBytes += tokens.length * Uint16Array.BYTES_PER_ELEMENT;
    }
    expect(endpointBytes).toBeLessThan(2000000);
    expect(Buffer.byteLength(dataset.rle)).toBeLessThan(2000000);
  });
});

describe('SkySchool real land, islands, lakes, and inland lake holes', () => {
  // expectedWater comes from direct source-polygon ray casting, not an RLE
  // decoder. These exact cell centres avoid promising sub-cell shoreline detail.
  it.each(oracle.points)('matches source polygons at $name', ({ lat, lon, expectedWater }) => {
    expect(water(lat, lon)).toBe(expectedWater);
  });

  it('preserves the polygon classifications across multiple circuits of longitude', () => {
    for (const point of oracle.points) {
      for (const circuits of [-3, -1, 1, 3]) {
        expect(water(point.lat, point.lon + circuits * 360), point.name + ' / ' + circuits).toBe(point.expectedWater);
      }
    }
  });

  it('keeps each cell stable when sampled in a different order or within its interior', () => {
    for (const point of [...oracle.points].reverse()) {
      for (const north of [-0.004, 0, 0.004]) {
        for (const east of [-0.004, 0, 0.004]) {
          expect(water(point.lat + north, point.lon + east), point.name).toBe(point.expectedWater);
        }
      }
    }
  });

  it('resolves both sides of every sampled row transition without shifting a column', () => {
    // Exercise the real decoder at cell centres immediately before/after RLE
    // boundaries. Include every 137th row plus both poles to span the globe.
    const rows = new Set([0, dataset.height - 1]);
    for (let row = 0; row < dataset.height; row += 137) rows.add(row);
    let checked = 0;
    for (const row of rows) {
      let column = 0;
      const lengths = encodedRows[row].split(',').map(token => Number.parseInt(token, 36));
      for (let run = 0; run < lengths.length; run++) {
        const length = lengths[run];
        if (length > 0) {
          const expectedWater = run % 2 === 0;
          for (const candidate of new Set([column, column + length - 1])) {
            if (water(cellLatitude(row), cellLongitude(candidate)) !== expectedWater) {
              throw new Error('Geographic transition mismatch at row ' + row + ', column ' + candidate);
            }
            checked++;
          }
        }
        column += length;
      }
    }
    expect(checked).toBeGreaterThan(5000);
  });
});

describe('SkySchool geographic coordinate boundaries and cache budget', () => {
  it('rejects nonfinite or nonnumeric coordinates without decoding a row', () => {
    const runtime = geographicRuntime();
    for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '43.665']) {
      expect(runtime.water(invalid, -70.255)).toBe(true);
      expect(runtime.water(43.665, invalid)).toBe(true);
    }
    expect(runtime.allocations.spans).toEqual([]);
    expect(runtime.allocations.bytes).toEqual([]);
  });

  it('clamps finite latitude to the polar rows and wraps the exact date line', () => {
    for (const longitude of [-180, -70, 0, 70, 180]) {
      expect(water(90, longitude)).toBe(water(cellLatitude(0), longitude));
      expect(water(190, longitude)).toBe(water(90, longitude));
      expect(water(-90, longitude)).toBe(water(cellLatitude(dataset.height - 1), longitude));
      expect(water(-190, longitude)).toBe(water(-90, longitude));
    }
    for (const latitude of [-89.995, -43.505, 0, 43.665, 89.995]) {
      for (const longitude of [-900, -540, -180, 180, 540, 900]) {
        expect(water(latitude, longitude)).toBe(water(latitude, -180));
      }
      expect(water(latitude, 179.999)).toBe(water(latitude, -180.001));
      expect(water(latitude, 180.001)).toBe(water(latitude, -179.999));
    }
  });

  it('decodes only newly visited rows and reuses them across longitude aliases', () => {
    const runtime = geographicRuntime();
    expect(runtime.allocations.spans).toEqual([]);
    const latitude = 43.665;
    runtime.water(latitude, -70.255);
    expect(runtime.allocations.spans).toHaveLength(1);
    const bytes = runtime.allocations.spans[0];
    for (const longitude of [-170, -70.255, 0, 80, 179, 649.745]) runtime.water(latitude, longitude);
    runtime.water(latitude + 0.004, -70.255);
    runtime.water(latitude - 0.004, -70.255);
    expect(runtime.allocations.spans).toEqual([bytes]);
    runtime.water(latitude + 0.01, -70.255);
    expect(runtime.allocations.spans).toHaveLength(2);
    expect(runtime.allocations.bytes).toEqual([]);
  });

  it('can visit the entire globe with less than two megabytes of decoded spans', () => {
    const runtime = geographicRuntime();
    for (let row = 0; row < dataset.height; row++) runtime.water(cellLatitude(row), 0);
    expect(runtime.allocations.spans).toHaveLength(dataset.height);
    const bytes = runtime.allocations.spans.reduce((total, size) => total + size, 0);
    const expected = encodedRows.reduce((total, encoded) => total + encoded.split(',').length * 2, 0);
    expect(bytes).toBe(expected);
    expect(bytes).toBeLessThan(2000000);
    expect(runtime.allocations.bytes).toEqual([]);
  });
});
