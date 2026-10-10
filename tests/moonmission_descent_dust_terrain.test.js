// Focused pass 26 checks. Run with Vitest's Node environment and no setup files.
// The implementation comes from the current canonical working source. Expected
// terrain contact uses actual indexed triangles, path clipping and bisection;
// it does not call the implementation's heightAt or trace methods.
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const repo = path.resolve(process.env.MOONMISSION_REPO || process.cwd());
const source = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_moonmission.js'), 'utf8');
const THREE = createRequire(import.meta.url)(path.join(repo, 'vendor/three-r128/three.min.js'));
function extract(name) {
  const one = source.match(new RegExp('^  function ' + name + '\\([^\\n]*\\) \\{[^\\n]*\\}$', 'm'));
  if (one) return one[0];
  const many = source.match(new RegExp('^  function ' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?^  \\}', 'm'));
  assert(many, 'Cannot extract exact source function ' + name);
  return many[0];
}
const descentStart = source.indexOf('  var MM_DESCENT = {');
const descentEnd = source.indexOf('  // Powered approach in a spherical, non-rotating lunar frame.', descentStart);
assert(descentStart > 0 && descentEnd > descentStart, 'Cannot extract the source pure descent block');
const Physics = new Function('window', [extract('mmNum'), extract('mmIsObj'), extract('_seededRand'),
  source.slice(descentStart, descentEnd),
  'return Object.assign({},window.MoonMissionPure,{descentStep:mmDescentStep});'].join('\n'))({});
for (const name of ['createDescentTerrainSampler', 'descentDustTerrainFlight', 'newDescentTerrainDust',
  'newDescentDust', 'stepDescentDust', 'sampleDescentDust', 'descentStep']) {
  assert.equal(typeof Physics[name], 'function', 'Missing source API: ' + name);
}

// Independent physical constants are explicit so a production constant change
// cannot silently change both the expected result and the implementation.
const SCALE = 0.6, GRAVITY = 1.624, HEIGHT = 0.02, HORIZON = 2.5, TRAIL_TIME = 0.07;
function near(actual, expected, tolerance = 1e-9, message = '') {
  assert(Number.isFinite(actual), 'Expected finite value: ' + message);
  assert(Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, received ${actual}, tolerance ${tolerance}`);
}
function grain(extra = {}, frozen = true) {
  const p = { id: 0, born: 0, launchX: 0, launchZ: 0, vx: 10, vy: 0.7, vz: 0, strength: 0.8, ...extra };
  if (!Object.hasOwn(extra, 'life')) p.life = (p.vy + Math.sqrt(p.vy * p.vy + 2 * GRAVITY * HEIGHT)) / GRAVITY;
  return frozen ? Object.freeze(p) : p;
}
function poolOf(...grains) {
  const pool = Physics.newDescentDust(Math.max(12, grains.length));
  for (let i = 0; i < grains.length; i++) pool.grains[i] = grains[i];
  return pool;
}
function mesh(xs = [-100, 100], zs = [-100, 100], height = () => 0, flipped = false) {
  const geometry = new THREE.BufferGeometry(), positions = [], indices = [];
  for (const z of zs) for (const x of xs) positions.push(x, height(x, z), z);
  for (let row = 0; row < zs.length - 1; row++) for (let col = 0; col < xs.length - 1; col++) {
    const a = row * xs.length + col, b = a + xs.length, c = b + 1, d = a + 1;
    const flip = typeof flipped === 'function' ? flipped(col, row) : flipped;
    indices.push(...(flip ? [a, b, c, a, c, d] : [a, b, d, b, c, d]));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.parameters = { widthSegments: xs.length - 1, heightSegments: zs.length - 1 };
  return geometry;
}
function vertices(geometry, offset) {
  const p = geometry.attributes.position;
  return [0, 1, 2].map(i => new THREE.Vector3().fromBufferAttribute(p, geometry.index.getX(offset + i)));
}
function actualHeight(geometry, x, z) {
  const ray = new THREE.Ray(new THREE.Vector3(x, 10000, z), new THREE.Vector3(0, -1, 0));
  const hit = new THREE.Vector3();
  let height = null;
  for (let i = 0; i < geometry.index.count; i += 3) {
    const [a, b, c] = vertices(geometry, i);
    if (ray.intersectTriangle(a, b, c, false, hit)) height = height === null ? hit.y : Math.max(height, hit.y);
  }
  return height;
}
function barycentric(a, b, c, x, z) {
  const determinant = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / determinant;
  const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / determinant;
  return [u, v, 1 - u - v];
}
function pointAt(p, launchY, age) {
  return { age, x: SCALE * (p.launchX + p.vx * age),
    y: launchY + SCALE * (HEIGHT + p.vy * age - GRAVITY * age * age / 2),
    z: SCALE * (p.launchZ + p.vz * age) };
}
function actualBounds(geometry) {
  const a = geometry.attributes.position;
  const xs = [], zs = [];
  for (let i = 0; i < a.count; i++) { xs.push(a.getX(i)); zs.push(a.getZ(i)); }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}
function oracle(geometry, p) {
  const originX = p.launchX * SCALE, originZ = p.launchZ * SCALE;
  const launchY = actualHeight(geometry, originX, originZ);
  assert.notEqual(launchY, null, 'Oracle launch must lie within a triangle');
  const bounds = actualBounds(geometry);
  let end = HORIZON;
  for (const [origin, speed, low, high] of [[originX, p.vx * SCALE, bounds.minX, bounds.maxX],
    [originZ, p.vz * SCALE, bounds.minZ, bounds.maxZ]]) {
    if (speed > 0) end = Math.min(end, Math.max(0, (high - origin) / speed));
    else if (speed < 0) end = Math.min(end, Math.max(0, (low - origin) / speed));
  }
  let first = null;
  for (let i = 0; i < geometry.index.count; i += 3) {
    const [a, b, c] = vertices(geometry, i);
    const atZero = barycentric(a, b, c, originX, originZ);
    const atOne = barycentric(a, b, c, originX + p.vx * SCALE, originZ + p.vz * SCALE);
    let lo = 0, hi = end, included = true;
    for (let k = 0; k < 3; k++) {
      const slope = atOne[k] - atZero[k];
      if (Math.abs(slope) < 1e-15) { if (atZero[k] < -1e-12) included = false; }
      else if (slope > 0) lo = Math.max(lo, -atZero[k] / slope);
      else hi = Math.min(hi, -atZero[k] / slope);
    }
    if (!included || hi < lo || hi < 0 || lo > end) continue;
    lo = Math.max(0, lo); hi = Math.min(end, hi);
    function clearance(age) {
      const point = pointAt(p, launchY, age), weights = barycentric(a, b, c, point.x, point.z);
      return point.y - weights[0] * a.y - weights[1] * b.y - weights[2] * c.y;
    }
    // Clearance is concave on one triangle, so positive endpoints establish
    // that this whole interval is airborne; a nonpositive end brackets impact.
    let impact = null;
    if (clearance(lo) <= 0) impact = lo;
    else if (clearance(hi) <= 0) {
      for (let iteration = 0; iteration < 100; iteration++) {
        const mid = (lo + hi) / 2;
        if (clearance(mid) > 0) lo = mid; else hi = mid;
      }
      impact = (lo + hi) / 2;
    }
    if (impact !== null && (first === null || impact < first)) first = impact;
  }
  return { launchY, life: first === null ? end : first,
    endKind: first !== null ? 'impact' : end < HORIZON ? 'mesh-exit' : 'display-limit',
    impact: first === null ? null : pointAt(p, launchY, first) };
}
function withSurface(geometry, task) {
  try {
    const surface = Physics.createDescentTerrainSampler(geometry);
    assert(surface, 'Fixture must produce a source terrain sampler');
    return task(surface);
  } finally { geometry.dispose(); }
}
function compare(geometry, surface, p, tolerance = 1e-8) {
  const expected = oracle(geometry, p), flight = Physics.descentDustTerrainFlight(p, surface);
  assert(flight, 'Valid grain must have a flight solution');
  assert(Object.isFrozen(flight)); assert(Object.isFrozen(flight.breaks));
  near(flight.launchY, expected.launchY, tolerance, 'launch terrain height');
  near(flight.life, expected.life, tolerance, 'first collision/domain retirement time');
  assert.equal(flight.endKind, expected.endKind);
  assert(flight.breaks.every((t, i, all) => Number.isFinite(t) && t >= 0 && t <= HORIZON + 1e-10 && (!i || t >= all[i - 1])));
  if (expected.impact) {
    assert(Object.isFrozen(flight.impact));
    for (const key of ['age', 'x', 'y', 'z']) near(flight.impact[key], expected.impact[key], tolerance, 'impact ' + key);
  } else assert.equal(flight.impact, null);
  return flight;
}
function validateTrail(geometry, p, row, tolerance = 1e-8, allowShorter = false) {
  assert(Object.isFrozen(row)); assert(Object.isFrozen(row.trail));
  assert(row.trail.length >= 2 && row.trail.length <= 17, 'Trail must fit sixteen segments');
  assert(Number.isFinite(row.opacity) && row.opacity >= 0 && row.opacity <= p.strength);
  if (allowShorter) {
    assert(row.trail[0].age >= Math.max(0, row.age - TRAIL_TIME) - tolerance,
      'A shortened dense-grid tail must remain within the latest .07 seconds');
    assert(row.trail[0].age < row.age, 'A shortened trail must retain a positive interval');
  } else near(row.trail[0].age, Math.max(0, row.age - TRAIL_TIME), tolerance, 'tail age');
  near(row.trail.at(-1).age, row.age, tolerance, 'head age');
  for (let i = 0; i < row.trail.length; i++) {
    const point = row.trail[i]; assert(Object.isFrozen(point));
    const expected = pointAt(p, row.launchY, point.age);
    for (const key of ['x', 'y', 'z']) near(point[key], expected[key], tolerance, 'ballistic trail ' + key);
    if (!i) continue;
    const previous = row.trail[i - 1]; assert(point.age > previous.age, 'Trail ages must increase');
    for (const fraction of [0, 0.2, 0.5, 0.8, 1]) {
      const x = previous.x + (point.x - previous.x) * fraction;
      const y = previous.y + (point.y - previous.y) * fraction;
      const z = previous.z + (point.z - previous.z) * fraction;
      const height = actualHeight(geometry, x, z);
      assert.notEqual(height, null); assert(y >= height - tolerance, 'Trail chord penetrates an indexed triangle');
    }
  }
}

describe('exact indexed-terrain ejecta flight', () => {
  it('matches flat return time on zero and translated level surfaces', () => {
    for (const height of [0, 37]) {
      const g = mesh(undefined, undefined, () => height), p = grain();
      withSurface(g, surface => {
        const flight = compare(g, surface, p);
        near(flight.life, p.life, 1e-10); near(flight.launchY, height, 1e-10);
        near(flight.impact.y, height, 1e-10);
      });
    }
  });
  it('contacts rising ground before flat return', () => {
    const g = mesh(undefined, undefined, (x, z) => 0.1 * x + 0.04 * z), p = grain({ vz: 3 });
    withSurface(g, surface => { const flight = compare(g, surface, p); assert(flight.life < p.life / 4); });
  });
  it('retains a grain past flat expiry over falling ground with finite opacity', () => {
    const g = mesh(undefined, undefined, x => -0.04 * x), p = grain({ vx: 20, vy: 0.4 });
    withSurface(g, surface => {
      const flight = compare(g, surface, p); assert(flight.life > p.life + 0.5);
      const age = (flight.life + p.life) / 2, sampler = Physics.newDescentTerrainDust(surface), rows = sampler.sample(poolOf(p), age);
      assert.equal(rows.length, 1); near(rows[0].flatLife, p.life); near(rows[0].life, flight.life);
      assert.equal(rows[0].endKind, 'impact'); validateTrail(g, p, rows[0]);
      assert(rows[0].trail.at(-1).y < rows[0].launchY, 'Hollow flight should descend below its launch terrain elevation');
    });
  });
  it('finds the first narrow rim intersection despite later airborne endpoints', () => {
    const g = mesh([-2, 0, 3, 3.2, 3.4, 40], [-10, 10], x => Math.abs(x - 3.2) < 1e-6 ? 5 : 0);
    const p = grain({ vx: 10, vy: 1.5 });
    withSurface(g, surface => {
      const flight = compare(g, surface, p); assert(flight.life > 0.5 && flight.life < 0.54);
      const later = pointAt(p, flight.launchY, 0.8); assert(later.y > actualHeight(g, later.x, later.z));
      const sampler = Physics.newDescentTerrainDust(surface), pool = poolOf(p);
      assert.equal(sampler.sample(pool, 0.8).length, 0, 'A grain cannot reappear past its first impact');
      assert.equal(sampler.sample(pool, flight.life).length, 0);
    });
  });
  it('follows both actual saddle diagonals rather than bilinear terrain', () => {
    const lives = [];
    for (const flip of [false, true]) {
      const g = mesh([0, 8], [0, 8], (x, z) => 10 * x * z / 64, flip);
      const p = grain({ launchX: 0.5 / SCALE, launchZ: 0.5 / SCALE, vx: 4, vz: 3 });
      withSurface(g, surface => { lives.push(compare(g, surface, p).life); });
    }
    assert(Math.abs(lives[0] - lives[1]) > 0.3, 'Different indexed faces must produce different contacts');
  });
  it('handles positive, negative, axial and stationary horizontal paths', () => {
    for (const [vx, vz] of [[3, 2], [-3, 2], [3, -2], [-3, -2], [0, 3], [3, 0], [0, 0]]) {
      const g = mesh([-20, -4, 0, 3, 20], [-20, -3, 0, 4, 20], (x, z) => 0.03 * x - 0.02 * z,
        (col, row) => (col + row) % 2 === 0);
      withSurface(g, surface => compare(g, surface, grain({ vx, vz })));
    }
  });
  it('resolves contact exactly at a shared grid edge', () => {
    const g = mesh([-1, 0, 1, 4], [-1, 0, 1]), p = grain({ vx: 5 / 3, vy: GRAVITY / 2 - HEIGHT });
    withSurface(g, surface => { const flight = compare(g, surface, p); near(flight.life, 1, 1e-10); near(flight.impact.x, 1, 1e-10); });
  });
  it('keeps a steep rising-face root positive without cancellation', () => {
    const g = mesh([-1, 0, 1], [-1, 1], x => 1e12 * x), p = grain({ vx: 5 });
    withSurface(g, surface => {
      const flight = Physics.descentDustTerrainFlight(p, surface), storedSlope = g.attributes.position.getY(2);
      const approximate = HEIGHT / (storedSlope * p.vx - p.vy);
      assert(flight.life > 0 && flight.life < 1e-12);
      near(flight.life / approximate, 1, 1e-7, 'small positive crossing root'); assert.equal(flight.endKind, 'impact');
    });
  });
  it('labels deep hollow retirement as a bounded display limit', () => {
    const g = mesh(undefined, undefined, x => -0.5 * x), p = grain({ vx: 5 });
    withSurface(g, surface => {
      const flight = compare(g, surface, p); assert.equal(flight.endKind, 'display-limit'); near(flight.life, HORIZON);
      const sampler = Physics.newDescentTerrainDust(surface), pool = poolOf(p);
      assert.equal(sampler.sample(pool, HORIZON).length, 0); assert.equal(sampler.sample(pool, HORIZON + 1).length, 0);
      validateTrail(g, p, sampler.sample(pool, HORIZON - 0.01)[0]);
    });
  });
  it('clips first mesh exit without declaring a terrain impact', () => {
    const g = mesh([0, 1], [-1, 1]), p = grain({ launchX: 0.9 / SCALE, vx: 10 });
    withSurface(g, surface => {
      const flight = compare(g, surface, p); assert.equal(flight.endKind, 'mesh-exit'); near(flight.life, 0.1 / (10 * SCALE));
      const sampler = Physics.newDescentTerrainDust(surface), pool = poolOf(p);
      assert.equal(sampler.sample(pool, flight.life).length, 0); assert.equal(flight.impact, null);
    });
  });
  it('finds an earlier rim collision on a path that later leaves the mesh', () => {
    const g = mesh([0, 0.2, 0.25, 1], [-1, 1], x => Math.abs(x - 0.25) < 1e-6 ? 0.5 : 0);
    withSurface(g, surface => {
      const flight = compare(g, surface, grain({ vx: 10 })); assert.equal(flight.endKind, 'impact');
      assert(flight.life < 1 / (10 * SCALE));
    });
  });
  it('handles launches on outer edges moving inward or immediately outward', () => {
    for (const vx of [-1, 1]) {
      const g = mesh([0, 4], [-2, 2]), p = grain({ launchX: 4 / SCALE, vx });
      withSurface(g, surface => {
        const flight = compare(g, surface, p);
        if (vx > 0) { near(flight.life, 0); assert.equal(flight.endKind, 'mesh-exit'); }
        else assert(flight.life > 0);
      });
    }
  });
});

describe('terrain dust trail sampling and bounded state', () => {
  it('splits a trail at a rim face and keeps segment interiors above real triangles', () => {
    const g = mesh([-2, 0, 3, 3.2, 3.4, 40], [-10, 10], x => Math.abs(x - 3.2) < 1e-6 ? 5 : 0);
    const p = grain({ vx: 10, vy: 1.5 });
    withSurface(g, surface => {
      const flight = compare(g, surface, p), sampler = Physics.newDescentTerrainDust(surface);
      const rows = sampler.sample(poolOf(p), (flight.life + 0.5) / 2); assert.equal(rows.length, 1);
      assert(rows[0].trail.length >= 3, 'The trail crossing the rising face must split'); validateTrail(g, p, rows[0]);
    });
  });
  it('clamps early trails to birth and emits no rows before birth', () => {
    const g = mesh(), p = grain({ born: 1 });
    withSurface(g, surface => {
      const sampler = Physics.newDescentTerrainDust(surface), pool = poolOf(p);
      assert.equal(sampler.sample(pool, 0.99).length, 0);
      const rows = sampler.sample(pool, 1.01); assert.equal(rows.length, 1); near(rows[0].age, 0.01);
      validateTrail(g, p, rows[0]); near(rows[0].trail[0].age, 0); near(rows[0].trail[0].y, HEIGHT * SCALE);
    });
  });
  it('bounds dense-grid trails to sixteen pieces while retaining the exact head', () => {
    const xs = Array.from({ length: 241 }, (_, i) => -2 + i * 0.02), g = mesh(xs, [-2, 2], () => 0);
    const p = grain({ vx: 10, vy: 1.5 });
    withSurface(g, surface => {
      const rows = Physics.newDescentTerrainDust(surface).sample(poolOf(p), 0.4); assert.equal(rows.length, 1);
      validateTrail(g, p, rows[0], 1e-8, true);
    });
  });
  it('returns detached frozen results without changing births, pool or flat samples', () => {
    const g = mesh(undefined, undefined, x => -0.04 * x), p = grain(), pool = poolOf(p), before = JSON.stringify(pool);
    const flatBefore = Physics.sampleDescentDust(pool, 0.2);
    withSurface(g, surface => {
      const sampler = Physics.newDescentTerrainDust(surface); assert(Object.isFrozen(sampler));
      const rows = sampler.sample(pool, 0.2); assert(Object.isFrozen(rows)); assert(rows.every(Object.isFrozen));
      rows.forEach(row => validateTrail(g, p, row));
      assert.equal(JSON.stringify(pool), before); assert.deepEqual(Physics.sampleDescentDust(pool, 0.2), flatBefore);
      assert.deepEqual(sampler.sample(pool, 0.2), rows);
    });
  });
  it('samples identical final geometry across sparse and frequent presentation cadence', () => {
    const g = mesh([-50, -3, 0, 2, 50], [-50, -2, 0, 3, 50], (x, z) => 0.01 * x - 0.01 * z,
      (col, row) => (col + row) % 2 === 0), p = grain({ vx: 3, vz: 2 }), pool = poolOf(p);
    withSurface(g, surface => {
      const a = Physics.newDescentTerrainDust(surface), b = Physics.newDescentTerrainDust(surface), before = JSON.stringify(pool);
      for (let i = 0; i <= 60; i++) a.sample(pool, i / 120);
      for (let i = 0; i <= 5; i++) b.sample(pool, i / 10);
      assert.deepEqual(a.sample(pool, 0.5), b.sample(pool, 0.5)); assert.equal(JSON.stringify(pool), before);
    });
  });
  it('caches frozen grain identities but does not cache mutable grains', () => {
    const g = mesh(), frozen = grain(), mutable = grain({}, false);
    withSurface(g, surface => {
      let traces = 0;
      const counted = Object.freeze({ ...surface, trace(...args) { traces++; return surface.trace(...args); } });
      const sampler = Physics.newDescentTerrainDust(counted), frozenPool = poolOf(frozen);
      sampler.sample(frozenPool, 0.1); const first = traces; assert(first > 0);
      sampler.sample(frozenPool, 0.2); assert.equal(traces, first, 'Frozen identity should reuse its resolved flight');
      const mutablePool = poolOf(mutable); sampler.sample(mutablePool, 0.1); const second = traces;
      mutable.vx = 2; sampler.sample(mutablePool, 0.2); assert(traces > second, 'Mutable grain must be solved again');
    });
  });
  it('does not reuse a rewind serial for a different grain or a different surface', () => {
    const flat = mesh(), incline = mesh(undefined, undefined, x => 0.1 * x), a = grain(), b = grain({ vx: 2 });
    withSurface(flat, flatSurface => withSurface(incline, inclineSurface => {
      const sampler = Physics.newDescentTerrainDust(flatSurface);
      sampler.sample(poolOf(a), 0.1);
      const afterReset = sampler.sample(poolOf(b), 0.1);
      assert.deepEqual(afterReset, Physics.newDescentTerrainDust(flatSurface).sample(poolOf(b), 0.1));
      const onIncline = Physics.newDescentTerrainDust(inclineSurface).sample(poolOf(a), 0.01);
      assert.notDeepEqual(onIncline, sampler.sample(poolOf(a), 0.01));
    }));
  });
  it('rejects invalid birth scalars without altering the emitter', () => {
    const g = mesh();
    withSurface(g, surface => {
      const sampler = Physics.newDescentTerrainDust(surface);
      const patches = [{ id: -1 }, { id: 0.5 }, { id: Infinity }, { born: -1 }, { born: NaN },
        { launchX: Infinity }, { launchZ: '0' }, { vx: NaN }, { vy: Infinity }, { vz: undefined },
        { life: 0 }, { life: -1 }, { life: NaN }, { strength: -0.01 }, { strength: 1.01 }, { strength: NaN }];
      for (const patch of patches) {
        const p = grain(patch), pool = poolOf(p), before = JSON.stringify(pool);
        assert.equal(Physics.descentDustTerrainFlight(p, surface), null, 'Invalid grain: ' + JSON.stringify(patch));
        assert.deepEqual(sampler.sample(pool, 0.1), []); assert.equal(JSON.stringify(pool), before);
      }
      assert.deepEqual(sampler.sample(null, 0.1), []);
      for (const time of [-1, NaN, Infinity, '0.1']) assert.deepEqual(sampler.sample(poolOf(grain()), time), []);
    });
  });
  it('rejects unavailable surfaces and bounds results by existing pool capacity', () => {
    for (const surface of [null, {}, { heightAt() { return 0; } }, { trace() { return []; } }])
      assert.equal(Physics.newDescentTerrainDust(surface), null);
    const g = mesh();
    withSurface(g, surface => {
      const pool = Physics.newDescentDust(256);
      for (let i = 0; i < pool.capacity; i++) pool.grains[i] = grain({ id: i, vx: 1, born: i * 1e-5 });
      const rows = Physics.newDescentTerrainDust(surface).sample(pool, 0.1);
      assert.equal(rows.length, 256); assert(rows.every(row => row.trail.length <= 17));
    });
  });
  it('terrain sampling cannot change the exact flight or flat emission sequence', () => {
    const g = mesh(undefined, undefined, (x, z) => 0.02 * x - 0.01 * z);
    withSurface(g, surface => {
      const sampler = Physics.newDescentTerrainDust(surface), pool = Physics.newDescentDust(12);
      const flight = { alt: 12, vVel: -1, hVel: 4, fuel: 100, thrust: 0.6, tilt: 0, x: 0, elapsed: 0 };
      const baseline = { ...flight }, baselinePool = Physics.newDescentDust(12);
      for (let i = 0; i < 60; i++) {
        Physics.descentStep(flight, { throttle: 0.4 }, 1 / 60); Physics.stepDescentDust(pool, flight);
        const before = JSON.stringify([flight, pool]); sampler.sample(pool, flight.elapsed);
        assert.equal(JSON.stringify([flight, pool]), before);
        Physics.descentStep(baseline, { throttle: 0.4 }, 1 / 60); Physics.stepDescentDust(baselinePool, baseline);
      }
      assert.deepEqual(flight, baseline); assert.deepEqual(pool, baselinePool);
      assert.deepEqual(Physics.sampleDescentDust(pool, flight.elapsed), Physics.sampleDescentDust(baselinePool, baseline.elapsed));
    });
  });
});
