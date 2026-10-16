import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

let api;
beforeAll(() => {
  const sandbox = {
    window: { __RR_TEST_EXPORTS__: {} },
    document: { getElementById: () => ({}) },
    console: { log() {}, warn() {}, error() {} },
  };
  runInNewContext(readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8'), sandbox, { timeout: 5000 });
  api = sandbox.window.__RR_TEST_EXPORTS__.flightSim;
  expect(api.getFlightProceduralTerrainHeight).toBeTypeOf('function');
});

// Independent great-circle destinations let the continuity bounds describe
// feet of travel, including high latitudes, rather than arbitrary degree steps.
function destination(lat, lon, bearing, feet) {
  const radians = Math.PI / 180;
  const angular = feet * 0.3048 / 6371008.8;
  const latitude = lat * radians;
  const heading = bearing * radians;
  const nextLatitude = Math.asin(Math.sin(latitude) * Math.cos(angular)
    + Math.cos(latitude) * Math.sin(angular) * Math.cos(heading));
  const nextLongitude = lon * radians + Math.atan2(
    Math.sin(heading) * Math.sin(angular) * Math.cos(latitude),
    Math.cos(angular) - Math.sin(latitude) * Math.sin(nextLatitude));
  return [nextLatitude / radians, nextLongitude / radians];
}
const height = point => api.getFlightProceduralTerrainHeight(...point);

// Frozen pre-fix noise used only as a numerical regression baseline. The old
// direct hash produced hundreds of feet of discontinuity between nearby poses.
function legacyNoise(lat, lon) {
  const hash = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  return hash(lat * 10, lon * 10) * 500
    + hash(lat * 20 + 5, lon * 20 + 5) * 200
    + hash(lat * 40 + 10, lon * 40 + 10) * 80;
}
const routes = [
  [39.73, -104.96, 290], [37.74, -122.47, 45], [28.03, 85.04, 70],
  [46.03, 10.04, 180], [-44.03, 170.04, 330], [12.4, 24.6, 20],
  [-18.3, -46.2, 135], [78.4, 15.6, 90], [-78.4, -176.6, 210],
];

describe('SkySchool continuous procedural fallback terrain', () => {
  it('returns finite, nonnegative, bounded and deterministic elevations across the globe', () => {
    const samples = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      for (let lon = -180; lon <= 180; lon += 7.5) {
        const value = height([lat, lon]);
        expect(Number.isFinite(value), `${lat}, ${lon}`).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(13000);
        samples.push({ lat, lon, value });
      }
    }
    for (const sample of samples.reverse()) {
      expect(height([sample.lat, sample.lon])).toBe(sample.value);
    }
    expect(new Set(samples.map(sample => Math.round(sample.value))).size).toBeGreaterThan(100);
  });

  it('preserves the named mountain envelopes without making every location flat', () => {
    const peaks = [
      [39, -105, 8000], [46, 10, 6000], [28, 85, 12000],
      [44, -120, 5000], [-33, -70, 7000], [57, -5, 4000],
      [3, 37, 5500], [-44, 170, 4500], [43, 45, 5000],
      [35, 137, 3500], [62, 15, 3000], [37, -119, 4000],
    ];
    for (const [lat, lon, peak] of peaks) {
      const value = height([lat, lon]);
      expect(value, `${lat}, ${lon}`).toBeGreaterThanOrEqual(peak);
      expect(value, `${lat}, ${lon}`).toBeLessThanOrEqual(peak + 780);
    }
  });

  it('does not reintroduce phantom mountains outside all supported ranges', () => {
    for (const point of [[0, 0], [-25, 135], [40, -74], [46, -7], [-60, -130], [75, 90], [0, 179.9]]) {
      expect(height(point), point.join(', ')).toBeGreaterThanOrEqual(0);
      expect(height(point), point.join(', ')).toBeLessThanOrEqual(780);
    }
  });

  it('changes smoothly over one foot in every travel direction at representative flight locations', () => {
    for (const [lat, lon] of routes) {
      const start = height([lat, lon]);
      for (let bearing = 0; bearing < 360; bearing += 15) {
        const next = height(destination(lat, lon, bearing, 1));
        expect(Math.abs(next - start), `${lat}, ${lon} at ${bearing} degrees`).toBeLessThan(0.25);
      }
    }
  });

  it('removes the large elevation jumps that formerly occurred at normal frame travel distances', () => {
    let smoothSquared = 0, legacySquared = 0, count = 0;
    let smoothMaximum = 0, legacyMaximum = 0;
    for (const [lat, lon, bearing] of routes) {
      let previous = [lat, lon];
      for (let i = 1; i <= 120; i++) {
        const current = destination(lat, lon, bearing, i * 30);
        const smoothDelta = Math.abs(height(current) - height(previous));
        const legacyDelta = Math.abs(legacyNoise(...current) - legacyNoise(...previous));
        smoothSquared += smoothDelta * smoothDelta;
        legacySquared += legacyDelta * legacyDelta;
        smoothMaximum = Math.max(smoothMaximum, smoothDelta);
        legacyMaximum = Math.max(legacyMaximum, legacyDelta);
        count++;
        previous = current;
      }
    }
    expect(smoothMaximum).toBeLessThan(4);
    expect(legacyMaximum).toBeGreaterThan(200);
    expect(Math.sqrt(smoothSquared / count)).toBeLessThan(Math.sqrt(legacySquared / count) * 0.02);
  });

  it('uses one elevation for equivalent longitudes after any supported circuit of the world', () => {
    for (const lat of [-89.9, -44, 0, 28, 62, 89.9]) {
      for (const lon of [-180, -105.123, 37.25, 170.4, 180]) {
        const expected = height([lat, lon]);
        for (const turns of [-3, -1, 1, 3]) {
          expect(height([lat, lon + turns * 360])).toBeCloseTo(expected, 6);
        }
      }
    }
  });

  it('joins both sides of the dateline continuously at low and high latitudes', () => {
    for (const lat of [-89, -66, -30, 0, 30, 66, 89]) {
      const west = destination(lat, 180, 270, 0.5);
      const east = destination(lat, 180, 90, 0.5);
      expect(Math.abs(height(west) - height(east)), String(lat)).toBeLessThan(0.25);
      expect(height([lat, -180])).toBeCloseTo(height([lat, 180]), 7);
    }
  });

  it('gives each pole a single elevation regardless of longitude', () => {
    for (const pole of [-90, 90]) {
      const expected = height([pole, 0]);
      for (let lon = -180; lon <= 180; lon += 5) {
        expect(height([pole, lon]), `${pole}, ${lon}`).toBeCloseTo(expected, 7);
      }
    }
  });

  it('approaches each pole smoothly from every meridian', () => {
    for (const pole of [-90, 90]) {
      const expected = height([pole, 0]);
      // A metre from a pole must not develop a different random ridge just
      // because the longitude changes rapidly around this tiny circle.
      const latitude = pole > 0 ? 90 - 1 / 111195 : -90 + 1 / 111195;
      for (let lon = -180; lon < 180; lon += 15) {
        expect(Math.abs(height([latitude, lon]) - expected)).toBeLessThan(0.5);
      }
    }
  });

  it('keeps analytic relief close to the 4,000-foot triangles used by the visible terrain', () => {
    let squaredError = 0, legacySquaredError = 0, count = 0;
    // Use each of the renderer's two triangles independently. The oracle is
    // linear barycentric interpolation, not sampleFlightTerrainSurface itself.
    for (const [lat, lon] of routes.slice(0, 7)) {
      const feetPerLonDegree = 364800 * Math.cos(lat * Math.PI / 180);
      const point = (x, z) => [lat - z / 364800, lon + x / feetPerLonDegree];
      for (let cell = -2; cell <= 2; cell++) {
        const x = cell * 4000, z = cell * -4000;
        const a = point(x, z), b = point(x, z + 4000);
        const c = point(x + 4000, z + 4000), d = point(x + 4000, z);
        for (const triangle of [[a, b, d], [b, c, d]]) {
          for (const weights of [[1 / 3, 1 / 3, 1 / 3], [0.1, 0.45, 0.45], [0.6, 0.3, 0.1]]) {
            const sample = [0, 0];
            let interpolated = 0, oldInterpolated = 0;
            triangle.forEach((vertex, index) => {
              sample[0] += vertex[0] * weights[index]; sample[1] += vertex[1] * weights[index];
              interpolated += height(vertex) * weights[index];
              oldInterpolated += legacyNoise(...vertex) * weights[index];
            });
            const error = Math.abs(height(sample) - interpolated);
            const oldError = Math.abs(legacyNoise(...sample) - oldInterpolated);
            expect(error, `${sample.join(', ')} terrain triangle`).toBeLessThan(40);
            squaredError += error * error;
            legacySquaredError += oldError * oldError;
            count++;
          }
        }
      }
    }
    expect(Math.sqrt(squaredError / count)).toBeLessThan(Math.sqrt(legacySquaredError / count) * 0.1);
  });

  it('keeps every airport training pad at its published field elevation with the new terrain', () => {
    for (const airport of api.WAYPOINTS) {
      for (const distance of [0, 0.5, 1, 2]) {
        const point = destination(airport.lat, airport.lon, 70, distance * 6076.11549);
        expect(api.airportTrainingGround(height(point), airport.alt, distance), airport.id).toBe(airport.alt);
      }
    }
  });

  it('joins the airport pad and outer relief without elevation steps at either transition', () => {
    for (const airport of api.WAYPOINTS) {
      for (const boundary of [2, 6]) {
        const points = [boundary - 1e-6, boundary, boundary + 1e-6].map(distance => {
          const point = destination(airport.lat, airport.lon, 70, distance * 6076.11549);
          return api.airportTrainingGround(height(point), airport.alt, distance);
        });
        expect(Math.max(...points) - Math.min(...points), `${airport.id} at ${boundary} nm`).toBeLessThan(0.01);
      }
    }
  });
});
