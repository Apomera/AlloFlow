// Run from the repository with Node: node reports/moon-mission-enhancement-pass25-2026-10-04/terrain-probe.cjs
// This probe loads the current helper and exact terrain construction from source.
// Expected heights come from Three's ray/triangle intersection, independently of
// the sampler's interpolation and trace implementation.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../..');
const THREE = require(path.join(repo, 'vendor/three-r128/three.min.js'));
const sourcePath = path.join(repo, 'stem_lab/stem_tool_moonmission.js');
const sourceBytes = fs.readFileSync(sourcePath);
const source = sourceBytes.toString('utf8');
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');

function extract(name, indent = 2) {
  const expression = new RegExp('^' + ' '.repeat(indent) + 'function ' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?^' + ' '.repeat(indent) + '\\}', 'm');
  const match = source.match(expression);
  assert(match, 'Cannot extract source function ' + name);
  return match[0];
}

const finiteNumberSource = source.match(/^  function mmNum\([^\n]*\) \{[^\n]*\}$/m);
assert(finiteNumberSource, 'Cannot extract source mmNum');
const createSampler = new Function(finiteNumberSource[0] + '\n' + extract('mmCreateDescentTerrainSampler') + '\nreturn mmCreateDescentTerrainSampler;')();
const seeded = new Function(extract('_seededRand') + '\nreturn _seededRand;')();
const start = source.indexOf('    var TERRAIN_SPAN = 16000;');
const end = source.indexOf('    var microSize = lowPower ? 128 : 256;', start);
assert(start > 0 && end > start, 'Cannot extract the exact source terrain construction');
const build = new Function('THREE', 'lowPower', '_seededRand', 'mmCreateDescentTerrainSampler', 'glCv',
  source.slice(start, end) + '\nreturn {geometry:terGeo,analytic:terrainHeight,segments:seg,sampler:renderedTerrain};');

function actualTriangleHeight(geometry, segments) {
  const positions = geometry.attributes.position;
  const indices = geometry.index;
  const columns = segments + 1;
  const xs = Array.from({length: columns}, (_, col) => positions.getX(col));
  const zs = Array.from({length: columns}, (_, row) => positions.getZ(row * columns));
  const ray = new THREE.Ray();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const hit = new THREE.Vector3();
  // Search the coordinates of the actual mesh. Each ray then tests its two
  // indexed cell faces; no terrain height formula participates in the oracle.
  function cell(axis, value) {
    assert(Number.isFinite(value) && value >= axis[0] && value <= axis[axis.length - 1], 'Ray outside the drawn mesh');
    let lo = 0;
    let hi = axis.length - 2;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (axis[mid] <= value) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  return function heightAt(x, z) {
    const col = cell(xs, x);
    const row = cell(zs, z);
    ray.origin.set(x, 10000, z);
    ray.direction.set(0, -1, 0);
    let actual = null;
    for (let triangle = 0; triangle < 2; triangle++) {
      const offset = (row * segments + col) * 6 + triangle * 3;
      a.fromBufferAttribute(positions, indices.getX(offset));
      b.fromBufferAttribute(positions, indices.getX(offset + 1));
      c.fromBufferAttribute(positions, indices.getX(offset + 2));
      if (ray.intersectTriangle(a, b, c, false, hit)) actual = actual === null ? hit.y : Math.max(actual, hit.y);
    }
    assert(actual !== null, 'Ray missed its actual mesh cell');
    return actual;
  };
}

const tiers = [];
const sampleFractions = [[.1, .1], [.4, .2], [.2, .7], [.7, .7], [.9, .2], [.5, .5]];
const tracePaths = [[-140, 0, 140, 0], [-130, -55, 160, 80], [60, 80, -60, -50], [0, -100, 0, 100]];
for (const lowPower of [true, false]) {
  const canvas = {dataset: {}};
  const {geometry, analytic, segments, sampler} = build(THREE, lowPower, seeded, createSampler, canvas);
  assert(sampler, 'Source terrain did not produce a sampler');
  assert.equal(canvas.dataset.descentTerrainMode, 'mesh-triangles');
  const positions = geometry.attributes.position;
  const expected = actualTriangleHeight(geometry, segments);
  let samples = 0;
  let maxSamplerError = 0;
  let worstAnalyticDisagreement = {difference: 0};
  let sumSquares = 0;
  for (let row = 0; row < segments; row++) for (let col = 0; col < segments; col++) {
    const vertex = row * (segments + 1) + col;
    const x0 = positions.getX(vertex);
    const x1 = positions.getX(vertex + 1);
    const z0 = positions.getZ(vertex);
    const z1 = positions.getZ(vertex + segments + 1);
    if (Math.abs(x0) > 400 || Math.abs(z0) > 250) continue;
    for (const [u, v] of sampleFractions) {
      const x = x0 + (x1 - x0) * u;
      const z = z0 + (z1 - z0) * v;
      const meshHeight = expected(x, z);
      const sampledHeight = sampler.heightAt(x, z);
      assert(sampledHeight !== null);
      maxSamplerError = Math.max(maxSamplerError, Math.abs(sampledHeight - meshHeight));
      const analyticHeight = analytic(x, z);
      const difference = Math.abs(analyticHeight - meshHeight);
      sumSquares += difference * difference;
      samples++;
      if (difference > worstAnalyticDisagreement.difference) worstAnalyticDisagreement = {difference, x, z, meshHeight, analyticHeight};
    }
  }
  let traceChecks = 0;
  let traceVertexChecks = 0;
  let traceSegments = 0;
  let maxTraceError = 0;
  let maxTraceVertexError = 0;
  let maxTracePoints = 0;
  const lift = .45;
  const pointBound = 2 * (sampler.columns + sampler.rows) + 2;
  for (const [x0, z0, x1, z1] of tracePaths) {
    const points = sampler.trace(x0, z0, x1, z1, lift);
    assert(points && Object.isFrozen(points));
    assert(points.length <= pointBound, 'Trace exceeded its storage bound');
    assert.equal(points[0].x, x0);
    assert.equal(points[0].z, z0);
    assert.equal(points[points.length - 1].x, x1);
    assert.equal(points[points.length - 1].z, z1);
    maxTracePoints = Math.max(maxTracePoints, points.length);
    for (const point of points) {
      assert(Object.isFrozen(point));
      maxTraceVertexError = Math.max(maxTraceVertexError, Math.abs(point.y - expected(point.x, point.z) - lift));
      traceVertexChecks++;
    }
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      traceSegments++;
      for (const t of [.2, .5, .8]) {
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const y = a.y + (b.y - a.y) * t;
        maxTraceError = Math.max(maxTraceError, Math.abs(y - expected(x, z) - lift));
        traceChecks++;
      }
    }
  }
  assert(maxSamplerError < 1e-9, 'Sampler disagrees with actual indexed triangles');
  assert(maxTraceError < 1e-9, 'Trace interiors leave the rendered triangles');
  assert(maxTraceVertexError < 1e-9, 'Trace vertices leave the rendered triangles');
  tiers.push({tier: lowPower ? 'lighter' : 'detailed', segments, samples, maxSamplerError,
    worstAnalyticDisagreement, rmsAnalyticDisagreement: Math.sqrt(sumSquares / samples),
    tracePaths: tracePaths.length, traceSegments, traceChecks, maxTraceError,
    traceVertexChecks, maxTraceVertexError, maxTracePoints, tracePointBound: pointBound,
    meshBounds: sampler.bounds});
  geometry.dispose();
}
const result = {
  source: 'stem_lab/stem_tool_moonmission.js', sourceSha256, sourceBytes: sourceBytes.length,
  oracle: 'Three r128 Ray.intersectTriangle against the actual indexed terrain faces',
  tolerances: {samplerHeight: 1e-9, traceInteriorHeight: 1e-9, traceVertexHeight: 1e-9},
  totals: {rayComparisons: tiers.reduce((sum, tier) => sum + tier.samples, 0),
    traceInteriorChecks: tiers.reduce((sum, tier) => sum + tier.traceChecks, 0),
    traceVertexChecks: tiers.reduce((sum, tier) => sum + tier.traceVertexChecks, 0)},
  tiers,
  scope: 'Exact source-generated meshes for both graphics tiers. Heights and errors are scene units, not physical altitude metres.',
  limits: 'Height comparisons use six fractional positions per mesh cell whose lower x/z coordinates lie within ±400/±250 scene units. Trace comparisons use four paths near approach. This checks geometry consistency; it does not verify landing collision physics, render-buffer rounding, or terrain outside the finite drawn field.'
};
fs.writeFileSync(path.join(__dirname, 'terrain-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
