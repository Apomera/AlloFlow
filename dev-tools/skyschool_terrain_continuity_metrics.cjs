// Reproduce bounded before/after analytic terrain probes. No browser or Vitest.
// Run from any directory: node dev-tools/skyschool_terrain_continuity_metrics.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sourcePath = 'stem_lab/stem_tool_flightsim.js';
const mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_flightsim.js';
const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
const sourceSha256 = hash(source);
if (hash(fs.readFileSync(path.join(root, mirrorPath))) !== sourceSha256) throw new Error('Source and mirror differ');
const sandbox = {
  window: { __RR_TEST_EXPORTS__: {} },
  document: { getElementById: () => ({}) },
  console: { log() {}, warn() {}, error() {} },
};
vm.runInNewContext(source, sandbox, { timeout: 5000 });
const newHeight = sandbox.window.__RR_TEST_EXPORTS__.flightSim.getFlightTerrainHeight;
if (typeof newHeight !== 'function') throw new Error('Missing production terrain helper');

// Exact trimmed block from the pre-improvement canonical source, SHA-256:
// f067c3c682e4b103cc205c41a3eba3cf1738b209c0a99b1630f0c491b3fd4a74
// Kept here so the measurement does not depend on a temporary baseline file.
const legacySource = `var terrainHash = function(x, y) {
        var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
      };
      var terrainHeight = function(lat, lon) {
        // Major mountain ranges of the world
        // Each falloff factor is clamped individually: with the old
        // max(0, product) form, two NEGATIVE factors (far away in both lat
        // AND lon) multiplied into a huge positive — phantom max-height
        // peaks at the diagonal corners of every range, growing without
        // bound with distance.
        var range = function(peak, latC, latW, lonC, lonW) {
          return peak * Math.max(0, 1 - Math.abs(lat - latC) / latW) * Math.max(0, 1 - Math.abs(lon - lonC) / lonW);
        };
        var h = 0;
        h += range(8000, 39, 5, -105, 8);   // Rocky Mountains
        h += range(6000, 46, 3, 10, 5);     // Alps (centered ~10°E; the old -7 put them in the Atlantic)
        h += range(12000, 28, 4, 85, 8);    // Himalayas
        h += range(5000, 44, 4, -120, 3);   // Cascades
        h += range(7000, -33, 8, -70, 3);   // Andes
        h += range(4000, 57, 4, -5, 8);     // Scottish Highlands
        h += range(5500, 3, 3, 37, 3);      // East African Rift / Kilimanjaro
        h += range(4500, -44, 4, 170, 3);   // Southern Alps NZ
        h += range(5000, 43, 5, 45, 5);     // Caucasus
        h += range(3500, 35, 3, 137, 4);    // Japanese Alps
        h += range(3000, 62, 5, 15, 5);     // Scandinavian Mountains
        h += range(4000, 37, 2, -119, 2);   // Sierra Nevada
        // Multi-octave noise for natural variation
        h += terrainHash(lat * 10, lon * 10) * 500;
        h += terrainHash(lat * 20 + 5, lon * 20 + 5) * 200;
        h += terrainHash(lat * 40 + 10, lon * 40 + 10) * 80;
        return h;
      };`;
const legacyBlockSha256 = hash(legacySource);
if (legacyBlockSha256 !== '4bafa0d62afb6dff55efad8ec060b5ec02ff8c98993ad25d772435f079ebafc9') {
  throw new Error('Frozen baseline block changed');
}
const legacySandbox = {};
vm.runInNewContext(legacySource, legacySandbox, { timeout: 5000 });
const oldHeight = legacySandbox.terrainHeight;

const routes = [
  [39.73, -104.96, 290], [37.74, -122.47, 45], [28.03, 85.04, 70],
  [46.03, 10.04, 180], [-44.03, 170.04, 330], [12.4, 24.6, 20],
  [-18.3, -46.2, 135], [78.4, 15.6, 90], [-78.4, -176.6, 210],
];
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
function makeAccumulator() { return { count: 0, squared: 0, sum: 0, maximumFt: 0, maximumProbe: null }; }
function add(accumulator, value, probe) {
  if (!Number.isFinite(value)) throw new Error('Nonfinite terrain measurement');
  const magnitude = Math.abs(value);
  accumulator.count++;
  accumulator.squared += magnitude * magnitude;
  accumulator.sum += magnitude;
  if (magnitude > accumulator.maximumFt) { accumulator.maximumFt = magnitude; accumulator.maximumProbe = probe; }
}
function statistics(accumulator) {
  return { count: accumulator.count, rmsFt: Math.sqrt(accumulator.squared / accumulator.count),
    meanAbsoluteFt: accumulator.sum / accumulator.count, maximumFt: accumulator.maximumFt,
    maximumProbe: accumulator.maximumProbe };
}
function comparison(before, after) {
  const b = statistics(before), a = statistics(after);
  if (a.count !== b.count) throw new Error('Unpaired samples');
  return { before: b, after: a, rmsReductionPercent: (1 - a.rmsFt / b.rmsFt) * 100,
    maximumReductionPercent: (1 - a.maximumFt / b.maximumFt) * 100 };
}

const oneFootBefore = makeAccumulator(), oneFootAfter = makeAccumulator();
const travelBefore = makeAccumulator(), travelAfter = makeAccumulator();
for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
  const [lat, lon, bearing] = routes[routeIndex];
  for (let direction = 0; direction < 360; direction += 15) {
    const next = destination(lat, lon, direction, 1);
    const probe = { routeIndex, bearingDegrees: direction, start: [lat, lon], end: next };
    add(oneFootBefore, oldHeight(...next) - oldHeight(lat, lon), probe);
    add(oneFootAfter, newHeight(...next) - newHeight(lat, lon), probe);
  }
  let previous = [lat, lon];
  for (let step = 1; step <= 120; step++) {
    const current = destination(lat, lon, bearing, step * 30);
    const probe = { routeIndex, step, start: previous, end: current };
    add(travelBefore, oldHeight(...current) - oldHeight(...previous), probe);
    add(travelAfter, newHeight(...current) - newHeight(...previous), probe);
    previous = current;
  }
}

const triangleBefore = makeAccumulator(), triangleAfter = makeAccumulator();
const weightPatterns = [[1 / 3, 1 / 3, 1 / 3], [0.1, 0.45, 0.45], [0.6, 0.3, 0.1]];
for (let routeIndex = 0; routeIndex < 7; routeIndex++) {
  const [lat, lon] = routes[routeIndex];
  const feetPerLonDegree = 364800 * Math.cos(lat * Math.PI / 180);
  const point = (x, z) => [lat - z / 364800, lon + x / feetPerLonDegree];
  for (let cell = -2; cell <= 2; cell++) {
    const x = cell * 4000, z = cell * -4000;
    const a = point(x, z), b = point(x, z + 4000);
    const c = point(x + 4000, z + 4000), d = point(x + 4000, z);
    const triangles = [[a, b, d], [b, c, d]];
    triangles.forEach((vertices, triangleIndex) => {
      weightPatterns.forEach((weights, weightPatternIndex) => {
        const sample = [0, 0];
        let oldInterpolated = 0, newInterpolated = 0;
        vertices.forEach((vertex, index) => {
          sample[0] += vertex[0] * weights[index]; sample[1] += vertex[1] * weights[index];
          oldInterpolated += oldHeight(...vertex) * weights[index];
          newInterpolated += newHeight(...vertex) * weights[index];
        });
        const probe = { routeIndex, cell, triangleIndex, weightPatternIndex, point: sample };
        add(triangleBefore, oldHeight(...sample) - oldInterpolated, probe);
        add(triangleAfter, newHeight(...sample) - newInterpolated, probe);
      });
    });
  }
}

const scriptPath = 'dev-tools/skyschool_terrain_continuity_metrics.cjs';
const testPath = 'tests/flightsim_terrain_continuity.test.js';
const report = {
  format: 'skyschool-terrain-continuity-metrics-v1',
  source: { path: sourcePath, sha256: sourceSha256, mirrorPath, mirrorMatches: true },
  baseline: { canonicalSourceSha256: 'f067c3c682e4b103cc205c41a3eba3cf1738b209c0a99b1630f0c491b3fd4a74',
    extractedBlockSha256: legacyBlockSha256, embeddedInScript: true,
    functions: ['terrainHash', 'terrainHeight'], includesMountainEnvelopes: true },
  reproduction: { command: 'node dev-tools/skyschool_terrain_continuity_metrics.cjs',
    script: scriptPath, scriptSha256: hash(fs.readFileSync(__filename)),
    relatedTests: testPath, relatedTestsSha256: hash(fs.readFileSync(path.join(root, testPath))),
    runtime: process.version, v8: process.versions.v8 },
  probes: {
    routeColumns: ['latitudeDegrees', 'longitudeDegrees', 'bearingDegrees'], routes,
    greatCircleEarthRadiusMeters: 6371008.8, feetToMeters: 0.3048,
    oneFootMotion: { routes: 9, bearingsDegrees: { start: 0, step: 15, exclusiveEnd: 360 }, distanceFeet: 1 },
    thirtyFootMotion: { routes: 9, samplesPerRoute: 120, distanceFeetPerStep: 30,
      positionMethod: 'Great-circle destination from route origin at step * 30 feet; compare successive positions' },
    triangleInterpolation: { routeIndices: [0, 1, 2, 3, 4, 5, 6], cellOffsets: [-2, -1, 0, 1, 2],
      cellSizeFeet: 4000, originCoordinatesFeet: ['cellOffset * 4000', 'cellOffset * -4000'],
      geographicProjection: 'lat = originLat - z / 364800; lon = originLon + x / (364800 * cos(originLat))',
      cornersFeet: { a: [0, 0], b: [0, 4000], c: [4000, 4000], d: [4000, 0] },
      triangles: [['a', 'b', 'd'], ['b', 'c', 'd']], barycentricWeightPatterns: weightPatterns,
      measurement: 'Absolute difference between analytic height at interior point and linearly interpolated corner heights' },
  },
  results: {
    oneFootMotion: comparison(oneFootBefore, oneFootAfter),
    thirtyFootMotion: comparison(travelBefore, travelAfter),
    triangleInterpolation: comparison(triangleBefore, triangleAfter),
  },
  scope: [
    'These deterministic probes measure analytic illustrative relief, not global worst-case terrain error or surveyed elevation accuracy.',
    'Both before and after include mountain envelopes. The standalone test suite uses old noise alone as a conservative regression baseline; these full-height metrics are intentionally more directly comparable.',
    'Water classification, airport elevation blending, mesh Float32 storage, camera placement, and rendering are excluded from these measurements.',
    'Triangle probes reproduce the geometric interpolation and grid spacing independently; they do not call the production terrain sampler.',
  ],
};
for (const target of [sourcePath, mirrorPath]) {
  if (hash(fs.readFileSync(path.join(root, target))) !== sourceSha256) throw new Error('Source changed during measurement');
}
const outputPath = path.join(root, 'reports', 'skyschool-terrain-continuity-metrics.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ sourceSha256, results: report.results }, null, 2));
