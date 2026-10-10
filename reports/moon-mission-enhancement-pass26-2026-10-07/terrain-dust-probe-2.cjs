// Portable, independent numerical probe. This file does not run browser or unit suites.
// Usage: node moon-pass26-terrain-dust-probe.cjs REPO [OUTPUT_JSON]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = path.resolve(process.argv[2] || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated');
const output = path.resolve(process.argv[3] || path.join(__dirname, 'moon-pass26-terrain-dust-probe.json'));
const THREE = require(path.join(repo, 'vendor/three-r128/three.min.js'));
const sourcePath = path.join(repo, 'stem_lab/stem_tool_moonmission.js');
const sourceBytes = fs.readFileSync(sourcePath);
const source = sourceBytes.toString('utf8');
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const tolerance = Object.freeze({age: 2e-8, position: 2e-7, clearance: 2e-7});

function extractFunction(name) {
  const head = source.match(new RegExp('^  function ' + name + '\\([^\\n]*\\) \\{[^\\n]*', 'm'));
  assert(head, 'Cannot extract source function ' + name);
  if (head[0].trimEnd().endsWith('}')) return head[0];
  const start = head.index;
  const tail = source.slice(start + head[0].length).match(/^  \}/m);
  assert(tail, 'Cannot find source function end ' + name);
  return source.slice(start, start + head[0].length + tail.index + tail[0].length);
}
function extractConstant(name) {
  const match = source.match(new RegExp('^  var ' + name + '\\s*=[\\s\\S]*?;[ \\t]*(?:\\r?\\n|$)', 'm'));
  assert(match, 'Cannot extract source constant ' + name);
  return match[0];
}
function sourceApiName(publicName) {
  const match = source.match(new RegExp('\\b' + publicName + '\\s*:\\s*([A-Za-z_$][\\w$]*)'));
  assert(match, 'Source has no exported API ' + publicName);
  return match[1];
}
// Extract the actual transitive helper dependencies, rather than reproducing
// implementation logic in this probe. Only these source declarations execute.
const functionNames = new Set(Array.from(source.matchAll(/^  function ([A-Za-z_$][\w$]*)\(/gm), match => match[1]));
const constantNames = new Set(Array.from(source.matchAll(/^  var (MM_[A-Z0-9_]+)\s*=/gm), match => match[1]));
const roots = ['mmCreateDescentTerrainSampler', '_seededRand',
  sourceApiName('descentDustTerrainFlight'), sourceApiName('newDescentTerrainDust')];
const declarations = new Map();
function include(name, kind) {
  if (declarations.has(name)) return;
  const text = kind === 'function' ? extractFunction(name) : extractConstant(name);
  declarations.set(name, text);
  for (const dependency of new Set(text.match(/\b(?:mm[A-Za-z0-9_]+|MM_[A-Z0-9_]+|_seededRand)\b/g) || [])) {
    if (dependency === name) continue;
    if (functionNames.has(dependency)) include(dependency, 'function');
    else if (constantNames.has(dependency)) include(dependency, 'constant');
  }
}
roots.forEach(name => include(name, 'function'));
include('MM_DESCENT_DUST', 'constant');
include('MM_DESCENT_TERRAIN_DUST', 'constant');
const orderedDeclarations = Array.from(declarations.values()).sort((a, b) => source.indexOf(a) - source.indexOf(b));
const Physics = new Function(orderedDeclarations.join('\n') + '\nreturn {' +
  'createSampler:mmCreateDescentTerrainSampler,seeded:_seededRand,' +
  'descentDustTerrainFlight:' + roots[2] + ',newDescentTerrainDust:' + roots[3] + ',' +
  'dust:MM_DESCENT_DUST,terrainDust:MM_DESCENT_TERRAIN_DUST};')();
const S = Physics.dust.worldScale;
const G = Physics.dust.gravity;
const H = Physics.dust.initialHeight;
const LIMIT = Physics.terrainDust.maxAge;
const TRAIL_LIMIT = Physics.terrainDust.maxTrailSegments;
assert.equal(S, .6); assert.equal(G, 1.624); assert.equal(LIMIT, 2.5); assert.equal(TRAIL_LIMIT, 16);

// Use the canonical terrain creation verbatim, including Float32 storage,
// both graphics tiers, nonuniform grid placement, indices and seeded craters.
const terrainStart = source.indexOf('    var TERRAIN_SPAN = 16000;');
const terrainEnd = source.indexOf('    var microSize = lowPower ? 128 : 256;', terrainStart);
assert(terrainStart > 0 && terrainEnd > terrainStart, 'Cannot extract source terrain construction');
const buildSourceTerrain = new Function('THREE', 'lowPower', '_seededRand', 'mmCreateDescentTerrainSampler', 'glCv',
  source.slice(terrainStart, terrainEnd) + '\nreturn {geometry:terGeo,surface:renderedTerrain,segments:seg};');

// Each oracle face is read directly from the actual geometry index. Independent
// edge half-plane clipping finds the horizontal path's interval inside that
// triangle. Its plane and the ballistic parabola then give contact analytically.
// The sampler's heightAt/trace are never used by any oracle computation.
function triangleOracle(geometry) {
  const p = geometry.attributes.position, index = geometry.index;
  const nx = geometry.parameters.widthSegments, nz = geometry.parameters.heightSegments;
  assert.equal(index.count, nx * nz * 6);
  const xs = Array.from({length: nx + 1}, (_, i) => p.getX(i));
  const zs = Array.from({length: nz + 1}, (_, i) => p.getZ(i * (nx + 1)));
  const bounds = Object.freeze({minX: xs[0], maxX: xs[nx], minZ: zs[0], maxZ: zs[nz]});
  const stride = 14, faces = new Float64Array(index.count / 3 * stride);
  for (let f = 0; f < index.count / 3; f++) {
    const a = index.getX(f * 3), b = index.getX(f * 3 + 1), c = index.getX(f * 3 + 2);
    const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a);
    const bx = p.getX(b), by = p.getY(b), bz = p.getZ(b);
    const cx = p.getX(c), cy = p.getY(c), cz = p.getZ(c);
    const dx1 = bx - ax, dz1 = bz - az, dx2 = cx - ax, dz2 = cz - az;
    const determinant = dx1 * dz2 - dz1 * dx2;
    assert(determinant !== 0, 'Degenerate indexed terrain footprint');
    const hx = ((by - ay) * dz2 - (cy - ay) * dz1) / determinant;
    const hz = (dx1 * (cy - ay) - dx2 * (by - ay)) / determinant;
    faces.set([ax, az, bx, bz, cx, cz, hx, hz, ay - hx * ax - hz * az,
      Math.min(ax, bx, cx), Math.max(ax, bx, cx), Math.min(az, bz, cz), Math.max(az, bz, cz), Math.sign(determinant)], f * stride);
  }
  function locate(axis, value) {
    let lo = 0, hi = axis.length - 2;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (axis[m] <= value) lo = m; else hi = m - 1; }
    return lo;
  }
  function visitCandidates(x0, z0, x1, z1, visit) {
    if (Math.max(x0, x1) < bounds.minX || Math.min(x0, x1) > bounds.maxX ||
      Math.max(z0, z1) < bounds.minZ || Math.min(z0, z1) > bounds.maxZ) return;
    const left = Math.max(0, locate(xs, Math.max(bounds.minX, Math.min(x0, x1))) - 1);
    const right = Math.min(nx - 1, locate(xs, Math.min(bounds.maxX, Math.max(x0, x1))) + 1);
    const top = Math.max(0, locate(zs, Math.max(bounds.minZ, Math.min(z0, z1))) - 1);
    const bottom = Math.min(nz - 1, locate(zs, Math.min(bounds.maxZ, Math.max(z0, z1))) + 1);
    for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) {
      const cell = (row * nx + col) * 2;
      visit(cell * stride); visit((cell + 1) * stride);
    }
  }
  function clippedInterval(offset, x0, z0, ux, uz, maxTime) {
    let lo = 0, hi = maxTime;
    const winding = faces[offset + 13];
    for (let edge = 0; edge < 3; edge++) {
      const next = (edge + 1) % 3;
      const ax = faces[offset + edge * 2], az = faces[offset + edge * 2 + 1];
      const dx = faces[offset + next * 2] - ax, dz = faces[offset + next * 2 + 1] - az;
      const start = winding * (dx * (z0 - az) - dz * (x0 - ax));
      const rate = winding * (dx * uz - dz * ux);
      if (Math.abs(rate) < 1e-14) { if (start < -1e-9) return null; }
      else { const crossing = -start / rate; if (rate > 0) lo = Math.max(lo, crossing); else hi = Math.min(hi, crossing); }
      if (lo > hi + 1e-11) return null;
    }
    if (hi < 0 || lo > maxTime) return null;
    return [Math.max(0, lo), Math.min(maxTime, hi)];
  }
  function height(x, z) {
    let value = null;
    visitCandidates(x, z, x, z, offset => {
      if (!clippedInterval(offset, x, z, 0, 0, 0)) return;
      const h = faces[offset + 6] * x + faces[offset + 7] * z + faces[offset + 8];
      value = value === null ? h : Math.max(value, h);
    });
    assert(value !== null, 'Independent height query outside indexed triangles at ' + x + ',' + z);
    return value;
  }
  function meshExit(x, z, vx, vz) {
    assert(x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ, 'Birth outside mesh');
    let time = Infinity;
    if (vx > 0) time = Math.min(time, (bounds.maxX - x) / vx);
    else if (vx < 0) time = Math.min(time, (bounds.minX - x) / vx);
    if (vz > 0) time = Math.min(time, (bounds.maxZ - z) / vz);
    else if (vz < 0) time = Math.min(time, (bounds.minZ - z) / vz);
    return {time: Math.max(0, Math.min(LIMIT, time)), exited: time <= LIMIT};
  }
  function flight(grain) {
    const x0 = grain.launchX * S, z0 = grain.launchZ * S;
    const ux = grain.vx * S, uz = grain.vz * S;
    const launchY = height(x0, z0), meshEnd = meshExit(x0, z0, ux, uz), exit = meshEnd.time;
    let contact = Infinity, faceIntervals = 0;
    visitCandidates(x0, z0, x0 + ux * exit, z0 + uz * exit, offset => {
      const interval = clippedInterval(offset, x0, z0, ux, uz, exit);
      if (!interval) return;
      faceIntervals++;
      const a = -.5 * G * S;
      const b = grain.vy * S - faces[offset + 6] * ux - faces[offset + 7] * uz;
      const c = launchY + H * S - faces[offset + 6] * x0 - faces[offset + 7] * z0 - faces[offset + 8];
      let discriminant = b * b - 4 * a * c;
      if (discriminant < -1e-10) return;
      discriminant = Math.max(0, discriminant);
      const radical = Math.sqrt(discriminant), q = -.5 * (b + (b >= 0 ? radical : -radical));
      const roots = q === 0 ? [-b / (2 * a)] : [q / a, c / q];
      for (const t of roots) {
        if (!Number.isFinite(t) || t < -1e-10 || t < interval[0] - 1e-10 || t > interval[1] + 1e-10 || t > exit + 1e-10) continue;
        if (b + 2 * a * t > 1e-10) continue; // First entry into the terrain, not the other quadratic root.
        contact = Math.min(contact, Math.max(0, t));
      }
    });
    const impacted = Number.isFinite(contact);
    const life = impacted ? contact : exit;
    const impact = impacted ? Object.freeze({age: life, x: x0 + ux * life,
      y: launchY + S * (H + grain.vy * life - .5 * G * life * life), z: z0 + uz * life}) : null;
    return Object.freeze({launchY, life, endKind: impacted ? 'impact' : meshEnd.exited ? 'mesh-exit' : 'display-limit', impact, faceIntervals});
  }
  function segmentClearance(a, b) {
    let minimum = Infinity, clippedFaces = 0;
    const ux = b.x - a.x, uz = b.z - a.z;
    visitCandidates(a.x, a.z, b.x, b.z, offset => {
      const interval = clippedInterval(offset, a.x, a.z, ux, uz, 1);
      if (!interval) return;
      clippedFaces++;
      for (const fraction of interval) {
        const x = a.x + ux * fraction, z = a.z + uz * fraction;
        const y = a.y + (b.y - a.y) * fraction;
        minimum = Math.min(minimum, y - faces[offset + 6] * x - faces[offset + 7] * z - faces[offset + 8]);
      }
    });
    assert(clippedFaces > 0, 'Trail segment missed all actual triangle footprints');
    return {minimum, clippedFaces};
  }
  return Object.freeze({height, flight, segmentClearance, bounds});
}

function makeGrid(xs, zs, height, mixed = false) {
  const geometry = new THREE.BufferGeometry(), positions = [], indices = [];
  geometry.parameters = {widthSegments: xs.length - 1, heightSegments: zs.length - 1};
  for (const z of zs) for (const x of xs) positions.push(x, height(x, z), z);
  for (let row = 0; row < zs.length - 1; row++) for (let col = 0; col < xs.length - 1; col++) {
    const a = row * xs.length + col, b = a + xs.length, c = b + 1, d = a + 1;
    if (mixed && ((row + col) & 1)) indices.push(a, b, c, a, c, d);
    else indices.push(a, b, d, b, c, d);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3)); geometry.setIndex(indices);
  return geometry;
}
function birth(id, x = 0, z = 0, speed = 20, azimuth = 0, elevationDegrees = 2, born = 0) {
  const elevation = elevationDegrees * Math.PI / 180, vy = speed * Math.sin(elevation);
  return Object.freeze({id, born, launchX: x / S, launchZ: z / S,
    vx: speed * Math.cos(elevation) * Math.cos(azimuth), vz: speed * Math.cos(elevation) * Math.sin(azimuth), vy,
    strength: .7, life: (vy + Math.sqrt(vy * vy + 2 * G * H)) / G});
}
function close(actual, expected, tol, message) {
  assert(Number.isFinite(actual) && Number.isFinite(expected), message + ': nonfinite comparison');
  assert(Math.abs(actual - expected) <= tol, message + ': ' + actual + ' vs ' + expected);
}
function poolFor(births) {
  assert(births.length <= 256);
  const grains = new Array(256).fill(null); births.forEach((p, i) => { grains[i] = p; });
  return Object.freeze({capacity: 256, grains: Object.freeze(grains)});
}
const report = {source: path.relative(repo, sourcePath).replaceAll('\\', '/'), sourceSha256, sourceBytes: sourceBytes.length,
  oracle: 'Indexed triangle edge half-plane clipping; independent plane/parabola roots; continuous line/face clearance',
  constants: {worldScale: S, gravity: G, initialHeight: H, displayHorizon: LIMIT, maxTrailSegments: TRAIL_LIMIT},
  tolerance, cases: [], totals: {flights: 0, impacts: 0, meshExits: 0, displayLimits: 0, sampleRows: 0,
    trailSegments: 0, trailInteriorPoints: 0, continuousTriangleIntervals: 0},
  maxima: {lifeError: 0, launchHeightError: 0, impactPositionError: 0, headPositionError: 0}, minimumTrailClearance: Infinity};

function inspectCase(name, geometry, births, expectedKinds = {}) {
  const surface = Physics.createSampler(geometry); assert(surface, name + ': source sampler rejected actual indexed fixture');
  const oracle = triangleOracle(geometry), flights = new Map(), rowsByTime = [];
  const counts = {impact: 0, 'mesh-exit': 0, 'display-limit': 0};
  let maxDisplayedTrailSegments = 0;
  for (const grain of births) {
    const expected = oracle.flight(grain), actual = Physics.descentDustTerrainFlight(grain, surface);
    assert(actual && Object.isFrozen(actual), name + ': helper result must be frozen');
    assert.equal(actual.endKind, expected.endKind, name + ': first end kind for grain ' + grain.id);
    assert(actual.life >= 0 && actual.life <= LIMIT + tolerance.age, name + ': exceeded display horizon');
    close(actual.life, expected.life, tolerance.age, name + ': first contact age ' + grain.id);
    close(actual.launchY, expected.launchY, tolerance.position, name + ': independent launch height ' + grain.id);
    report.maxima.lifeError = Math.max(report.maxima.lifeError, Math.abs(actual.life - expected.life));
    report.maxima.launchHeightError = Math.max(report.maxima.launchHeightError, Math.abs(actual.launchY - expected.launchY));
    assert(Array.isArray(actual.breaks) && Object.isFrozen(actual.breaks), name + ': immutable break ages');
    actual.breaks.forEach((age, i) => {
      assert(Number.isFinite(age) && age >= -tolerance.age && age <= LIMIT + tolerance.age, name + ': invalid break age');
      if (i) assert(age >= actual.breaks[i - 1], name + ': breaks out of order');
    });
    assert.equal(actual.impact === null, expected.impact === null, name + ': false or missed impact');
    if (expected.impact) {
      assert(Object.isFrozen(actual.impact), name + ': immutable impact');
      for (const key of ['age', 'x', 'y', 'z']) {
        close(actual.impact[key], expected.impact[key], key === 'age' ? tolerance.age : tolerance.position, name + ': impact ' + key);
        report.maxima.impactPositionError = Math.max(report.maxima.impactPositionError, Math.abs(actual.impact[key] - expected.impact[key]));
      }
      close(actual.impact.y, oracle.height(actual.impact.x, actual.impact.z), tolerance.position, name + ': contact actually touches indexed triangle');
    }
    counts[expected.endKind]++; flights.set(grain.id, expected); report.totals.flights++;
  }
  for (const [id, kind] of Object.entries(expectedKinds)) assert.equal(flights.get(Number(id)).endKind, kind, name + ': named fixture outcome');
  const pool = poolFor(births), poolBefore = JSON.stringify(pool), factory = Physics.newDescentTerrainDust(surface);
  assert(factory && typeof factory.sample === 'function', name + ': sample factory missing');
  for (const time of [.001, .03, .08, .2, .45, .8, 1.1, 1.5, 2.1, 2.4, 2.6]) {
    const rows = factory.sample(pool, time); assert(Array.isArray(rows) && Object.isFrozen(rows), name + ': samples must be frozen');
    assert(rows.length <= pool.capacity, name + ': sample pool overflow');
    const rowIds = new Set();
    for (const row of rows) {
      assert(Object.isFrozen(row), name + ': immutable row');
      assert(!rowIds.has(row.id), name + ': duplicate visible grain'); rowIds.add(row.id);
      const grain = births.find(p => p.id === row.id), flight = flights.get(row.id);
      assert(grain && flight, name + ': sample has no frozen birth');
      const age = time - grain.born;
      assert(age >= 0 && age < flight.life, name + ': sample resurrected after first end');
      close(row.age, age, tolerance.age, name + ': row age'); close(row.life, flight.life, tolerance.age, name + ': row life');
      close(row.flatLife, grain.life, tolerance.age, name + ': retained original flat lifetime');
      close(row.launchY, flight.launchY, tolerance.position, name + ': row launch height');
      assert.equal(row.endKind, flight.endKind);
      assert(Number.isFinite(row.opacity) && row.opacity >= 0 && row.opacity <= grain.strength + 1e-12, name + ': invalid fade');
      assert(Array.isArray(row.trail) && Object.isFrozen(row.trail), name + ': immutable trail');
      assert(row.trail.length >= 1 && row.trail.length <= TRAIL_LIMIT + 1, name + ': trail segment bound');
      maxDisplayedTrailSegments = Math.max(maxDisplayedTrailSegments, row.trail.length - 1);
      for (let i = 0; i < row.trail.length; i++) {
        const point = row.trail[i]; assert(Object.isFrozen(point), name + ': immutable trail point');
        assert(point.age >= 0 && point.age <= age + tolerance.age, name + ': invalid trail age');
        if (i) assert(point.age >= row.trail[i - 1].age, name + ': reversed trail');
        const x = (grain.launchX + grain.vx * point.age) * S, z = (grain.launchZ + grain.vz * point.age) * S;
        const y = flight.launchY + S * (H + grain.vy * point.age - .5 * G * point.age * point.age);
        close(point.x, x, tolerance.position, name + ': ballistic trail x'); close(point.y, y, tolerance.position, name + ': ballistic trail y');
        close(point.z, z, tolerance.position, name + ': ballistic trail z');
        assert(point.y - oracle.height(point.x, point.z) >= -tolerance.clearance, name + ': trail vertex beneath actual triangle');
        if (!i) continue;
        const a = row.trail[i - 1], check = oracle.segmentClearance(a, point);
        assert(check.minimum >= -tolerance.clearance, name + ': displayed trail crosses indexed terrain between vertices');
        report.minimumTrailClearance = Math.min(report.minimumTrailClearance, check.minimum);
        report.totals.continuousTriangleIntervals += check.clippedFaces; report.totals.trailSegments++;
        for (const fraction of [.125, .25, .375, .5, .625, .75, .875]) {
          const xx = a.x + (point.x - a.x) * fraction, zz = a.z + (point.z - a.z) * fraction;
          const yy = a.y + (point.y - a.y) * fraction;
          assert(yy - oracle.height(xx, zz) >= -tolerance.clearance, name + ': sampled trail interior under triangle');
          report.totals.trailInteriorPoints++;
        }
      }
      const head = row.trail[row.trail.length - 1]; close(head.age, age, tolerance.age, name + ': trail head time');
      const expectedHead = {x: (grain.launchX + grain.vx * age) * S, z: (grain.launchZ + grain.vz * age) * S,
        y: flight.launchY + S * (H + grain.vy * age - .5 * G * age * age)};
      for (const key of ['x', 'y', 'z']) report.maxima.headPositionError = Math.max(report.maxima.headPositionError, Math.abs(head[key] - expectedHead[key]));
      report.totals.sampleRows++;
    }
    // A fresh factory and a reused cache must project the same finite births.
    assert.deepEqual(factory.sample(pool, time), rows, name + ': repeated time changed cached projection');
    assert.deepEqual(Physics.newDescentTerrainDust(surface).sample(pool, time), rows, name + ': rebuild changed projection');
    for (const grain of births) {
      const age = time - grain.born, flight = flights.get(grain.id);
      if (age > 1e-8 && age < flight.life - 1e-7) assert(rowIds.has(grain.id), name + ': missed still-airborne grain ' + grain.id);
    }
    rowsByTime.push({time, rows: rows.length});
  }
  assert.equal(JSON.stringify(pool), poolBefore, name + ': sampling mutated immutable births');
  const replay = factory.sample(pool, .2); assert.deepEqual(replay, Physics.newDescentTerrainDust(surface).sample(pool, .2), name + ': backwards time depends on render history');
  report.totals.impacts += counts.impact; report.totals.meshExits += counts['mesh-exit']; report.totals.displayLimits += counts['display-limit'];
  report.cases.push({name, vertices: geometry.attributes.position.count, triangles: geometry.index.count / 3, births: births.length,
    counts, rowsByTime, maxDisplayedTrailSegments, bounds: oracle.bounds,
    selected: births.slice(0, 3).map(grain => ({id: grain.id, flatLife: grain.life, ...flights.get(grain.id)}))});
  geometry.dispose();
}

try {
  const wide = [-100, -20, 0, 20, 100], zWide = [-100, 0, 100];
  const main = birth(0);
  inspectCase('flat plane', makeGrid(wide, zWide, () => 0), [main, birth(1, 4, -3, 30, 1.7, 1),
    Object.freeze({...birth(2), vx: 0, vz: 0})], {0: 'impact', 1: 'impact', 2: 'impact'});
  inspectCase('rising plane: contact before flat return', makeGrid(wide, zWide, x => .05 * x), [main, birth(1, -10, 0, 40, .3, 2.5)], {0: 'impact'});
  assert(report.cases.at(-1).selected[0].life < main.life, 'Rising plane did not demonstrate early contact');
  inspectCase('falling plane: airborne beyond flat return', makeGrid(wide, zWide, x => -.05 * x), [main], {0: 'impact'});
  assert(report.cases.at(-1).selected[0].life > main.life, 'Falling plane did not demonstrate extended bowl flight');
  inspectCase('display horizon: no invented contact', makeGrid(wide, zWide, x => -.2 * x), [main], {0: 'display-limit'});
  inspectCase('finite mesh exit before contact', makeGrid([-1, 0, 1], [-1, 0, 1], () => 0), [main, birth(1, .6, .6, 20, Math.PI / 4)], {0: 'mesh-exit', 1: 'mesh-exit'});
  const rimXs = [-80, -.2, .3, .45, .6, .8, 80];
  const rimHeight = x => x === .45 ? .6 : 0;
  inspectCase('narrow rim: first impact despite clear later endpoint', makeGrid(rimXs, [-80, 0, 80], rimHeight, true),
    [main, birth(1, 3, 0, 20, Math.PI, 2), birth(2, -.1, 0, 40, 0, 1)], {0: 'impact', 1: 'impact', 2: 'impact'});
  const bowlXs = [-80, -10, 0, 15, 35, 60, 80], bowlZs = [-80, -4, 0, 4, 80];
  inspectCase('mixed-diagonal bowl', makeGrid(bowlXs, bowlZs, (x, z) => -.045 * x + .004 * Math.abs(z), true),
    [main, birth(1, 0, 0, 25, .35, 1.8), birth(2, 10, 3, 35, Math.PI, 2.5)]);
  const mixed = [-90, -6, -1, 0, .4, 1, 6, 90];
  const varied = Array.from({length: 36}, (_, i) => birth(i, (i % 6 - 2.5) * 1.7, (Math.floor(i / 6) - 2.5) * 1.3,
    15 + (i * 7 % 26), i * 2.399963229728653, 1 + (i % 7) * .25));
  inspectCase('mixed diagonals and nonuniform relief', makeGrid(mixed, mixed, (x, z) => .012 * x + .019 * z + .14 * Math.sin(x * .8) * Math.cos(z * .6), true), varied);
  const dense = [-20, ...Array.from({length: 201}, (_, i) => -2 + i * .02), 20];
  inspectCase('dense face crossings shorten trail within sixteen segments', makeGrid(dense, [-3, 0, 3], () => 0, true), [main], {0: 'impact'});
  assert.equal(report.cases.at(-1).maxDisplayedTrailSegments, TRAIL_LIMIT, 'Dense fixture did not exercise the trail storage limit');
  for (const lowPower of [true, false]) {
    const glCv = {dataset: {}};
    const built = buildSourceTerrain(THREE, lowPower, Physics.seeded, Physics.createSampler, glCv);
    assert(built.surface); assert.equal(glCv.dataset.descentTerrainMode, 'mesh-triangles');
    const births = [];
    for (const x of [-200, -70, -3, 0, 5, 90, 170]) for (const z of [-80, 0, 60]) for (const angle of [0, 1.1, 2.8, 4.6]) {
      const id = births.length;
      births.push(birth(id, x, z, 15 + (id * 11 % 26), angle, 1 + (id % 7) * .25));
    }
    inspectCase(lowPower ? 'actual source lighter terrain (140 segments)' : 'actual source detailed terrain (220 segments)', built.geometry, births);
  }
  // A reused ID with a new frozen birth cannot retain an earlier cache result.
  const replacementGeometry = makeGrid(wide, zWide, x => -.05 * x);
  const replacementSurface = Physics.createSampler(replacementGeometry), replacementFactory = Physics.newDescentTerrainDust(replacementSurface);
  replacementFactory.sample(poolFor([birth(0)]), .2);
  const replacement = birth(0, 15, 0, 30, Math.PI, 1.2);
  assert.deepEqual(replacementFactory.sample(poolFor([replacement]), .1), Physics.newDescentTerrainDust(replacementSurface).sample(poolFor([replacement]), .1));
  replacementGeometry.dispose(); report.cacheReplacementCheck = 'passed';
  report.status = 'passed';
  report.scope = 'First contact and finite lifetime of illustrative scene dust only. The oracle uses actual indexed meshes for both source tiers and synthetic relief. Flight, recorder, grades and browser pixels are outside this numerical probe.';
  report.limits = 'The finite 2.5 s display horizon can retire grains that have no terrain impact. This does not assert physical settling beyond that horizon, physical-device rendering performance, or collision with decorative rocks.';
  if (!Number.isFinite(report.minimumTrailClearance)) report.minimumTrailClearance = null;
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  report.status = 'failed'; report.failure = {message: error.message, stack: error.stack};
  if (!Number.isFinite(report.minimumTrailClearance)) report.minimumTrailClearance = null;
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); console.error(error.stack); process.exitCode = 1;
}
