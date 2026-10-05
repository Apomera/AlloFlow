import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b <= a || source.indexOf(start, a + start.length) >= 0) throw Error('Missing or duplicate live collision region: ' + start);
  return source.slice(a, b);
}
// Inspect the actual collision functions; adjacent decorative factories are not part of the hot path.
function functionSource(marker) {
  const start=source.indexOf(marker),open=source.indexOf('{',start);
  if(start<0||open<=start||source.indexOf(marker,start+marker.length)>=0)throw Error('Missing or duplicate live function: '+marker);
  let depth=0;for(let i=open;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);}
  throw Error('Unclosed live function: '+marker);
}
const resolverSource = functionSource('function resolveCLHuntRockCollision(');
const helpers = functionSource('function createCLHuntRockCollisionFootprint(')+'\n'+resolverSource;
if (!resolverSource.startsWith('function resolveCLHuntRockCollision(')) throw Error('Missing live collision resolver');
const noRandom = Object.assign(Object.create(Math), { random() { throw Error('Collision consumed dive RNG'); } });
const forbiddenGlobal = new Proxy(function () {}, {
  get() { throw Error('Collision read a THREE or Array global'); },
  apply() { throw Error('Collision allocated an Array'); },
  construct() { throw Error('Collision allocated a vector or Array'); }
});
const { footprint, resolve } = new Function('Math', 'THREE', 'Array', '"use strict";\n' + helpers + ';return {footprint:createCLHuntRockCollisionFootprint,resolve:resolveCLHuntRockCollision};')(noRandom, forbiddenGlobal, forbiddenGlobal);
const scalePrefix = region('function createCLHuntAnimal(', '  var root = new T.Group();');
const scaleFor = new Function('species', scalePrefix.slice(scalePrefix.indexOf('{') + 1) + ';return scale;');
const owned = [], restoreOwnerFields = [];
function rock(geometry = new THREE.BoxGeometry(4, 2, 2)) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  owned.push(mesh);return mesh;
}
afterEach(() => {
  for (const restore of restoreOwnerFields.splice(0)) restore();
  const geometries = new Set(), materials = new Set();
  for (const root of owned.splice(0)) root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  geometries.forEach(geometry => geometry.dispose());materials.forEach(material => material.dispose());
});
function prism() {
  const geometry = new THREE.BufferGeometry();
  // Duplicate and collinear points must not introduce zero-length hull edges.
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -2, -1, -1, 2, -1, -1, 0, -1, 2,
    -2, 1, -1, 2, 1, -1, 0, 1, 2,
    -2, -1, -1, 0, 0, -1, 0, 0, 0
  ], 3));
  return geometry;
}
function transformedVertices(mesh) {
  // Independent scaling then rotation uses THREE's quaternion operation, not the
  // cache helper's composed matrix or the mesh's translation/world matrix.
  const attribute = mesh.geometry.attributes.position, vertices = [];
  for (let i = 0; i < attribute.count; i++) vertices.push(new THREE.Vector3().fromBufferAttribute(attribute, i).multiply(mesh.scale).applyQuaternion(mesh.quaternion));
  return vertices;
}
const cross = (a, b, p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
function supportingHull(vertices) {
  const points = [];
  for (const p of vertices) if (!points.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 1e-10)) points.push({ x: p.x, z: p.z });
  const endpoints = new Set();
  // Enumerate supporting lines instead of reproducing the production hull algorithm.
  for (const a of points) for (const b of points) {
    if (a === b) continue;
    const dx = b.x - a.x, dz = b.z - a.z, lengthSq = dx * dx + dz * dz;
    if (points.every(p => {
      const side = cross(a, b, p);
      if (side < -1e-9) return false;
      if (Math.abs(side) > 1e-9) return true;
      const along = ((p.x - a.x) * dx + (p.z - a.z) * dz) / lengthSq;
      return along >= -1e-9 && along <= 1 + 1e-9;
    })) { endpoints.add(a);endpoints.add(b); }
  }
  const hull = [...endpoints], center = hull.reduce((sum, p) => ({ x: sum.x + p.x / hull.length, z: sum.z + p.z / hull.length }), { x: 0, z: 0 });
  return hull.sort((a, b) => Math.atan2(a.z - center.z, a.x - center.x) - Math.atan2(b.z - center.z, b.x - center.x));
}
function distanceToHull(point, hull) {
  if (hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], point) >= -1e-12)) return 0;
  let distance = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length], dx = b.x - a.x, dz = b.z - a.z;
    const along = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(point.x - a.x - along * dx, point.z - a.z - along * dz));
  }
  return distance;
}
function expectXZ(actual, expected) {
  expect(actual.x).toBeCloseTo(expected.x, 8);expect(actual.z).toBeCloseTo(expected.z, 8);
}
function immutable(cache) {
  cache.hull.forEach(Object.freeze);cache.edges.forEach(Object.freeze);
  Object.freeze(cache.hull);Object.freeze(cache.edges);return Object.freeze(cache);
}

describe('Cephalopod Hunter cached rock outline collision', () => {
  it('caches the actual rotated/scaled box and prism vertices with outward CCW edge planes and unchanged ownership', () => {
    expect(THREE.REVISION).toBe('128');
    for (const geometry of [new THREE.BoxGeometry(4, 2, 2), prism()]) {
      const mesh = rock(geometry);mesh.rotation.set(.37, .83, -.19);mesh.scale.set(1.3, .7, 1.9);mesh.position.set(300, -20, 500);
      mesh.userData = { substrate: 'rock', substrateRadius: 2.4, reefFootprint: { sentinel: 4 } };
      const before = { position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(), vertices: Array.from(geometry.attributes.position.array), metadata: JSON.stringify(mesh.userData), box: geometry.boundingBox };
      const material = mesh.material, vertices = transformedVertices(mesh), expectedHull = supportingHull(vertices), cache = footprint(THREE, mesh);
      expect(Object.keys(cache).sort()).toEqual(['edges', 'hull', 'maxY', 'minY']);
      expect(cache.minY).toBeCloseTo(Math.min(...vertices.map(p => p.y)), 10);expect(cache.maxY).toBeCloseTo(Math.max(...vertices.map(p => p.y)), 10);
      expect(cache.hull).toHaveLength(expectedHull.length);expect(cache.edges).toHaveLength(expectedHull.length);
      for (const p of expectedHull) expect(cache.hull.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 1e-9)).toBe(true);
      let area = 0;
      cache.hull.forEach((a, i) => {
        const b = cache.hull[(i + 1) % cache.hull.length], edge = cache.edges[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
        area += a.x * b.z - b.x * a.z;
        expect(length).toBeGreaterThan(1e-8);expectXZ(edge, a);
        expect(edge.dx).toBeCloseTo(dx, 10);expect(edge.dz).toBeCloseTo(dz, 10);expect(edge.lengthSq).toBeCloseTo(length * length, 10);
        expect(edge.nx).toBeCloseTo(dz / length, 10);expect(edge.nz).toBeCloseTo(-dx / length, 10);expect(edge.constant).toBeCloseTo(edge.nx * a.x + edge.nz * a.z, 10);
        for (const p of vertices) expect(edge.nx * p.x + edge.nz * p.z - edge.constant).toBeLessThanOrEqual(1e-9);
      });
      expect(area).toBeGreaterThan(0);
      expect(mesh.geometry).toBe(geometry);expect(mesh.material).toBe(material);
      expect({ position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(), vertices: Array.from(geometry.attributes.position.array), metadata: JSON.stringify(mesh.userData), box: geometry.boundingBox }).toEqual(before);
    }
  });

  it('resolves face overlap with each real species body margin and preserves face-tangent sliding', () => {
    const mesh = rock(), cache = footprint(THREE, mesh);
    const ids = ['commonOcto', 'blueRinged', 'mimicOcto', 'giantPacific', 'caribReef', 'coconutOcto', 'humboldtSquid', 'nautilus', 'cuttlefish', 'bobtailSquid', 'dumboOcto', 'vampireSquid'];
    for (const id of ids) {
      const margin = scaleFor({ id }) * .22, position = { x: 2 + margin * .5, y: 17, z: .3 };
      expect(margin, id).toBeGreaterThan(0);expect(resolve(position, 0, mesh.position, cache, margin), id).toBe(true);
      expectXZ(position, { x: 2 + margin, z: .3 });expect(position.y).toBe(17);
      position.z += .25;
      const tangent = { ...position };
      expect(resolve(position, 0, mesh.position, cache, margin), id).toBe(false);expect(position).toEqual(tangent);
      position.x -= .07;
      expect(resolve(position, 0, mesh.position, cache, margin), id).toBe(true);expectXZ(position, { x: 2 + margin, z: .55 });
    }
  });

  it('uses circular corner clearance and leaves free points byte unchanged', () => {
    const mesh = rock(), cache = footprint(THREE, mesh), margin = .22;
    for (const position of [{ x: 2 + margin, y: 5, z: .2 }, { x: 2.16, y: 5, z: 1.16 }, { x: 20, y: 5, z: -30 }]) {
      const before = { ...position };
      expect(resolve(position, 0, mesh.position, cache, margin)).toBe(false);expect(position).toEqual(before);
    }
    const corner = { x: 2.1, y: 5, z: 1.1 };
    expect(resolve(corner, 0, mesh.position, cache, margin)).toBe(true);
    expectXZ(corner, { x: 2 + margin / Math.SQRT2, z: 1 + margin / Math.SQRT2 });expect(corner.y).toBe(5);
    expect(distanceToHull(corner, supportingHull(transformedVertices(mesh)))).toBeGreaterThanOrEqual(margin);
  });

  it('escapes exact center, boundary midpoint and vertex positions finitely and only once', () => {
    const mesh = rock(), cache = footprint(THREE, mesh), margin = .22, hull = supportingHull(transformedVertices(mesh));
    for (const start of [{ x: 0, z: 0 }, { x: 2, z: .35 }, { x: 2, z: 1 }]) {
      const position = { ...start, y: 6 };
      expect(resolve(position, 0, mesh.position, cache, margin)).toBe(true);
      expect(Number.isFinite(position.x) && Number.isFinite(position.z)).toBe(true);expect(position.y).toBe(6);
      expect(distanceToHull(position, hull)).toBeGreaterThanOrEqual(margin);
      expect(Math.hypot(position.x - start.x, position.z - start.z)).toBeCloseTo((start.x === 0 ? 1 : 0) + margin, 8);
      if (start.x === 0) expect(position.x).toBe(0);
      const corrected = { ...position };
      expect(resolve(position, 0, mesh.position, cache, margin)).toBe(false);expect(position).toEqual(corrected);
    }
    for (const position of [{ x: 2, z: 0 }, { x: 2, z: 1 }]) {
      const before = { ...position };
      expect(resolve(position, 0, mesh.position, cache, 0)).toBe(false);expect(position).toEqual(before);
    }
    const zeroMarginInside = { x: 1.9, z: .25 };
    expect(resolve(zeroMarginInside, 0, mesh.position, cache, 0)).toBe(true);expectXZ(zeroMarginInside, { x: 2, z: .25 });
    const zeroCorrected = { ...zeroMarginInside };
    expect(resolve(zeroMarginInside, 0, mesh.position, cache, 0)).toBe(false);expect(zeroMarginInside).toEqual(zeroCorrected);
  });

  it('permits a clear corridor between two translated hulls in the existing one-pass rock order', () => {
    const left = rock(), right = rock(), margin = .22;
    left.position.x = -2.4;right.position.x = 2.4;
    const pairs = [[left, footprint(THREE, left)], [right, footprint(THREE, right)]];
    for (const z of [-.8, 0, .8]) {
      const position = { x: 0, y: 11, z }, before = { ...position };
      for (const [mesh, cache] of pairs) expect(resolve(position, 0, mesh.position, cache, margin)).toBe(false);
      expect(position).toEqual(before);
    }
  });

  it('pushes an interior prism point through its nearest face and permits its empty bounding-box corner', () => {
    const mesh = rock(prism()), cache = footprint(THREE, mesh), margin = .22;
    const inside = { x: 0, z: -.8 };
    expect(resolve(inside, 0, mesh.position, cache, margin)).toBe(true);expectXZ(inside, { x: 0, z: -1 - margin });
    const emptyCorner = { x: 1.6, y: 7, z: 1.6 }, before = { ...emptyCorner };
    expect(resolve(emptyCorner, 0, mesh.position, cache, margin)).toBe(false);expect(emptyCorner).toEqual(before);
  });

  it('matches independent face and vertex distances on a rotated, tilted, nonuniformly scaled outline', () => {
    const mesh = rock();mesh.rotation.set(.37, .83, -.19);mesh.scale.set(1.3, .7, 1.9);
    const cache = footprint(THREE, mesh), hull = supportingHull(transformedVertices(mesh)), margin = .31;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length], previous = hull[(i + hull.length - 1) % hull.length];
      const length = Math.hypot(b.x - a.x, b.z - a.z), nx = (b.z - a.z) / length, nz = -(b.x - a.x) / length;
      const midpoint = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, position = { x: midpoint.x + nx * margin * .3, z: midpoint.z + nz * margin * .3 };
      expect(resolve(position, 0, mesh.position, cache, margin)).toBe(true);expectXZ(position, { x: midpoint.x + nx * margin, z: midpoint.z + nz * margin });
      const previousLength = Math.hypot(a.x - previous.x, a.z - previous.z), sumX = nx + (a.z - previous.z) / previousLength, sumZ = nz - (a.x - previous.x) / previousLength, norm = Math.hypot(sumX, sumZ);
      const cornerX = sumX / norm, cornerZ = sumZ / norm, corner = { x: a.x + cornerX * margin * .3, z: a.z + cornerZ * margin * .3 };
      expect(resolve(corner, 0, mesh.position, cache, margin)).toBe(true);expectXZ(corner, { x: a.x + cornerX * margin, z: a.z + cornerZ * margin });
      expect(distanceToHull(position, hull)).toBeGreaterThanOrEqual(margin - 1e-10);expect(distanceToHull(corner, hull)).toBeGreaterThanOrEqual(margin - 1e-10);
    }
  });

  it('uses inclusive vertical clearance at both limits and resolves just inside the interval', () => {
    const mesh = rock();mesh.position.y = 7;
    const cache = footprint(THREE, mesh), margin = .22, above = mesh.position.y + cache.maxY + margin, below = mesh.position.y + cache.minY - margin;
    for (const height of [above, above + 1e-6, below, below - 1e-6]) {
      const position = { x: 0, y: -900, z: 0 }, before = { ...position };
      expect(resolve(position, height, mesh.position, cache, margin)).toBe(false);expect(position).toEqual(before);
    }
    for (const height of [above - 1e-6, below + 1e-6]) {
      const position = { x: 0, y: 900, z: 0 };
      expect(resolve(position, height, mesh.position, cache, margin)).toBe(true);expect(position.y).toBe(900);
    }
  });

  it('reuses frozen outlines across X/Y/Z recycling translations without geometry reads, RNG or new vectors', () => {
    const mesh = rock();mesh.rotation.y = .63;mesh.scale.set(1.3, .8, 1.1);
    const cache = immutable(footprint(THREE, mesh)), hull = cache.hull, edges = cache.edges, snapshot = JSON.stringify(cache), margin = .22;
    const first = { x: .1, y: 40, z: -.2 };
    expect(resolve(first, 0, mesh.position, cache, margin)).toBe(true);
    mesh.position.set(230, -12, -160);
    const second = { x: 230.1, y: 40, z: -160.2 };
    for (const key of ['geometry', 'material', 'rotation', 'scale', 'quaternion', 'userData']) {
      const descriptor = Object.getOwnPropertyDescriptor(mesh, key);
      restoreOwnerFields.push(() => Object.defineProperty(mesh, key, descriptor));
      Object.defineProperty(mesh, key, { configurable: true, get() { throw Error('Per-frame collision read rock ' + key); } });
    }
    const guardedPosition = new Proxy(mesh.position, { get(target, key) { if (!['x', 'y', 'z'].includes(key)) throw Error('Collision read uncached transform ' + String(key));return target[key]; } });
    expect(resolve(second, -12, guardedPosition, cache, margin)).toBe(true);
    expectXZ(second, { x: first.x + 230, z: first.z - 160 });expect(second.y).toBe(40);
    expect(cache.hull).toBe(hull);expect(cache.edges).toBe(edges);expect(JSON.stringify(cache)).toBe(snapshot);
    expect(resolverSource).not.toMatch(/\bnew\b|\bArray\b|\bTHREE\b|\.geometry\b|\.attributes\b|\.userData\b|\.(?:map|filter|slice|concat)\s*\(|=\s*\[|return\s*\[/);
  });

  it('wires the static parallel cache to current authoritative altitude and the original bodyScale margin', () => {
    expect(source).toContain('var rockCollisionFootprints=rocks.map(function(rock){return createCLHuntRockCollisionFootprint(THREE,rock);});');
    const motionStart = source.indexOf('gameState.verticalY = (gameState.verticalY ||'), collisionStart = source.indexOf('rocks.forEach(', motionStart), collisionEnd = source.indexOf('});', collisionStart);
    if (motionStart < 0 || collisionStart <= motionStart || collisionEnd <= collisionStart) throw Error('Missing live movement collision loop');
    const loop = source.slice(collisionStart, collisionEnd + 3), calls = [];
    const rocks = [{ position: { x: 3, y: 2, z: 1 } }, { position: { x: -4, y: 5, z: 6 } }], caches = [{ sentinel: 1 }, { sentinel: 2 }];
    const position = { x: 0, y: -300, z: 0 }, gameState = { verticalY: 8.2 };
    new Function('rocks', 'rockCollisionFootprints', 'octopus', 'gameState', 'bodyScale', 'resolveCLHuntRockCollision', loop)(rocks, caches, { position }, gameState, 1.4, (...args) => { calls.push(args);return false; });
    expect(calls).toEqual(rocks.map((mesh, i) => [position, gameState.verticalY, mesh.position, caches[i], 1.4 * .22]));
    expect(loop).not.toMatch(/substrateRadius|Math\.hypot|new\s|createCLHuntRockCollisionFootprint/);
  });
});
