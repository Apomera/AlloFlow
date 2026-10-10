import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CLH_WRECK_TEST_SOURCE || process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
function region(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Expected live wreck region: ' + start);
  return text.slice(a, b);
}
const helper = region(source, 'function createCLHuntWreckGeometry(', 'function makeShipwreck(');
const factory = region(source, 'function makeShipwreck(', 'function makeAnchor(');
const geometryFactory = new Function('Math', helper + ';return createCLHuntWreckGeometry;')(Object.assign(Object.create(Math), { random() { throw Error('Wreck shaping must not consume dive randomness'); } }));

// Accepted Pass57 constructor. It is deliberately independent of the new
// geometry implementation and captures its child, material and RNG contract.
const acceptedFactory = `function makeShipwreck() {
  var g = new THREE.Group();
  var hullMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.95 });
  var hull = new THREE.Mesh(new THREE.BoxGeometry(7, 2.5, 2.5), hullMat);
  hull.position.y = 1.2; hull.rotation.z = -0.15; g.add(hull);
  var mastMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 });
  var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3, 6), mastMat);
  mast.position.set(0.5, 2.5, 0); mast.rotation.z = 0.4; g.add(mast);
  var coralEncrustColors = [0xc94e6d, 0x8e5572, 0xff6b35];
  for (var ec = 0; ec < 6; ec++) {
    var ecc = new THREE.Mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.12, 6, 5), new THREE.MeshStandardMaterial({ color: coralEncrustColors[ec % 3], roughness: 0.7 }));
    ecc.position.set(-3 + Math.random() * 6, 0.8 + Math.random() * 1.6, -0.9 + Math.random() * 1.8); g.add(ecc);
  }
  return g;
}`;
function construct(text = helper + factory, seed = 2741) {
  const values = [], math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const value = seed / 4294967296; values.push(value); return value; };
  const group = new Function('THREE', 'Math', text + ';return makeShipwreck();')(THREE, math);
  group.updateMatrixWorld(true);
  return { group, values };
}
function dispose(group) {
  const geometry = new Set(), material = new Set();
  group.traverse(object => { if (object.geometry) geometry.add(object.geometry); if (object.material) material.add(object.material); });
  geometry.forEach(value => value.dispose()); material.forEach(value => value.dispose());
}
function bytes(geometry) { return Object.values(geometry.attributes).reduce((sum, value) => sum + value.array.byteLength, geometry.index.array.byteLength); }
function geometryEqual(a, b) {
  assert.deepEqual(Object.keys(a.attributes), Object.keys(b.attributes));
  for (const key of Object.keys(a.attributes)) assert.deepEqual(a.attributes[key].array, b.attributes[key].array);
  assert.deepEqual(a.index.array, b.index.array);
}
function nearestSurfaceDistance(mesh, point) {
  const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
  const triangle = new THREE.Triangle(), closest = new THREE.Vector3(); let distance = Infinity;
  for (let i = 0; i < index.count; i += 3) {
    triangle.a.fromBufferAttribute(p, index.getX(i)).applyMatrix4(mesh.matrixWorld);
    triangle.b.fromBufferAttribute(p, index.getX(i + 1)).applyMatrix4(mesh.matrixWorld);
    triangle.c.fromBufferAttribute(p, index.getX(i + 2)).applyMatrix4(mesh.matrixWorld);
    triangle.closestPointToPoint(point, closest); distance = Math.min(distance, closest.distanceTo(point));
  }
  return distance;
}

describe('Cephalopod Hunter open wooden shipwreck', () => {
  it('builds finite indexed geometry with nonzero outward-facing triangles inside the original hull envelope', () => {
    const geometry = geometryFactory(THREE), duplicate = geometryFactory(THREE);
    try {
      const p = geometry.attributes.position, n = geometry.attributes.normal;
      assert.deepEqual(Object.keys(geometry.attributes).sort(), ['color', 'normal', 'position', 'uv']);
      assert.ok(geometry.index && geometry.index.count % 3 === 0);
      assert.ok(geometry.boundingBox && geometry.boundingSphere);
      assert.ok(p.count > 24 && geometry.index.count / 3 < 3000, 'Detailed hull remains a modest static mesh');
      assert.ok(bytes(geometry) < 300000, 'Hull buffers stay below 300KB');
      const point = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), face = new THREE.Vector3();
      for (const attribute of Object.values(geometry.attributes)) for (const value of attribute.array) assert.ok(Number.isFinite(value));
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i);
        assert.ok(Math.abs(point.x) <= 3.500001 && Math.abs(point.y) <= 1.250001 && Math.abs(point.z) <= 1.250001);
        assert.ok(geometry.boundingBox.containsPoint(point));
        assert.ok(point.distanceTo(geometry.boundingSphere.center) <= geometry.boundingSphere.radius + 1e-5);
        assert.ok(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 2e-5, 'Authored normals are unit length');
      }
      for (let i = 0; i < geometry.index.count; i += 3) {
        const ids = [0, 1, 2].map(offset => geometry.index.getX(i + offset));
        assert.ok(ids.every(id => Number.isInteger(id) && id >= 0 && id < p.count));
        a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
        face.copy(b).sub(a).cross(c.clone().sub(a));
        assert.ok(face.lengthSq() > 1e-14, 'No collapsed plank triangles'); face.normalize();
        for (const id of ids) assert.ok(face.dot(point.fromBufferAttribute(n, id)) > .02, 'Normals agree with visible triangle winding');
      }
      for (const value of geometry.attributes.color.array) assert.ok(value >= 0 && value <= 1);
      assert.ok(geometry.boundingBox.max.x - geometry.boundingBox.min.x >= 6.5, 'Wreck retains its long navigation silhouette');
      geometryEqual(geometry, duplicate);
    } finally { geometry.dispose(); duplicate.dispose(); }
  });

  it('has an open hold over a solid interior floor rather than a box roof', () => {
    const geometry = geometryFactory(THREE), material = new THREE.MeshStandardMaterial(), mesh = new THREE.Mesh(geometry, material);
    try {
      mesh.updateMatrixWorld(true);
      for (const x of [-.5, 0, .5]) {
        const hits = new THREE.Raycaster(new THREE.Vector3(x, 2, 0), new THREE.Vector3(0, -1, 0)).intersectObject(mesh, false);
        assert.ok(hits.length, 'The hold has visible solid timber beneath it');
        assert.ok(hits[0].point.y < -.55, 'Central hold is open above the lower hull');
      }
      for (const z of [-1, 1]) {
        const hit = new THREE.Raycaster(new THREE.Vector3(0, -.95, z * 2), new THREE.Vector3(0, 0, -z)).intersectObject(mesh, false)[0];
        assert.ok(hit, 'Both lower hull sides are present');
      }
    } finally { geometry.dispose(); material.dispose(); }
  });

  it('uses closed consistently wound wooden solids, with no exposed paper-thin board edges', () => {
    const geometry = geometryFactory(THREE);
    try {
      const p = geometry.attributes.position, index = geometry.index;
      assert.equal(p.count % 24, 0); assert.equal(index.count / 36, p.count / 24); assert.equal(geometry.groups.length, 0);
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let part = 0; part < p.count / 24; part++) {
        const edges = new Map(); let volume = 0;
        const key = id => [p.getX(id), p.getY(id), p.getZ(id)].join(',');
        for (let triangle = part * 36; triangle < (part + 1) * 36; triangle += 3) {
          const ids = [0, 1, 2].map(offset => index.getX(triangle + offset));
          assert.ok(ids.every(id => id >= part * 24 && id < (part + 1) * 24));
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
          volume += a.dot(b.cross(c)) / 6;
          for (let edge = 0; edge < 3; edge++) {
            const from = key(ids[edge]), to = key(ids[(edge + 1) % 3]), canonical = from < to ? from + '|' + to : to + '|' + from;
            const entry = edges.get(canonical) || { count: 0, direction: 0 }; entry.count++; entry.direction += from < to ? 1 : -1; edges.set(canonical, entry);
          }
        }
        assert.ok(volume > 1e-8, 'Every timber encloses a positive outward-wound volume');
        for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 }, 'Each physical edge has an opposing triangle neighbor');
      }
    } finally { geometry.dispose(); }
  });

  it('preserves the eight existing children, mast, coral geometry and seeded simulation draws', () => {
    for (const seed of [0, 1, 2741, 8191, 0xffffffff]) {
      const current = construct(undefined, seed), accepted = construct(acceptedFactory, seed);
      try {
        assert.equal(current.group.children.length, 8);
        assert.equal(current.values.length, 24); assert.deepEqual(current.values, accepted.values);
        assert.equal(new Set(current.group.children.map(child => child.geometry)).size, 8);
        assert.equal(new Set(current.group.children.map(child => child.material)).size, 8);
        current.group.children.forEach((child, index) => {
          const old = accepted.group.children[index];
          assert.equal(child.children.length, 0); assert.equal(child.isMesh, true);
          assert.deepEqual(child.rotation.toArray(), old.rotation.toArray()); assert.deepEqual(child.scale.toArray(), old.scale.toArray());
          assert.equal(child.material.roughness, old.material.roughness); assert.equal(child.material.transparent, false);
          assert.equal(child.material.side, THREE.FrontSide); assert.ok(!child.material.map && !child.material.normalMap);
          if (index < 2) assert.deepEqual(child.position.toArray(), old.position.toArray());
          if (index > 0) { geometryEqual(child.geometry, old.geometry); assert.deepEqual(child.material.color.toArray(), old.material.color.toArray()); }
        });
        assert.equal(current.group.children[0].material.vertexColors, true);
      } finally { dispose(current.group); dispose(accepted.group); }
    }
  });

  it('embeds every existing coral growth in actual hull triangles without floating ornaments', () => {
    for (const seed of [0, 1, 2741, 8191, 0xffffffff]) {
      const fixture = construct(undefined, seed);
      try {
        const hull = fixture.group.children[0];
        for (const coral of fixture.group.children.slice(2)) {
          const radius = coral.geometry.parameters.radius;
          assert.ok(nearestSurfaceDistance(hull, coral.position) <= radius * .65, 'Coral intersects a real wooden surface');
        }
      } finally { dispose(fixture.group); }
    }
  });

  it('keeps the broken mast in contact with real supporting timber inside the open hold', () => {
    const fixture = construct();
    try {
      const [hull, mast] = fixture.group.children;
      const foot = new THREE.Vector3(0, -mast.geometry.parameters.height / 2, 0).applyMatrix4(mast.matrixWorld);
      assert.ok(nearestSurfaceDistance(hull, foot) < mast.geometry.parameters.radiusBottom, 'The mast foot overlaps its support rather than floating above the floor');
    } finally { dispose(fixture.group); }
  });

  it('does not add geometry/material allocations or change global UUID randomness', () => {
    const original = Math.random; let seed = 8127, draws = 0;
    const globalRandom = () => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const snapshot = group => [group.uuid, ...group.children.flatMap(child => [child.uuid, child.geometry.uuid, child.material.uuid])];
    let current, accepted;
    try {
      Math.random = globalRandom; accepted = construct(acceptedFactory); const oldDraws = draws, uuids = snapshot(accepted.group);
      seed = 8127; draws = 0; current = construct();
      assert.equal(draws, oldDraws); assert.deepEqual(snapshot(current.group), uuids);
    } finally { Math.random = original; if (current) dispose(current.group); if (accepted) dispose(accepted.group); }
  });

  it('retains fixed navigation anchors and pearl placement and collection distances', () => {
    const block = region(source, 'var LANDMARK_DEFS = [', 'var pearlState = loadPearls();');
    const constructors = { makeShipwreck: () => {}, makeAnchor: () => {}, makeStatue: () => {} };
    const definitions = new Function(...Object.keys(constructors), block + ';return LANDMARK_DEFS;')(...Object.values(constructors));
    assert.deepEqual(definitions.map(({ type, x, z, mkr, icon, pearlOffset }) => ({ type, x, z, mkr, icon, pearlOffset })), [
      { type: 'wreck', x: 39, z: 35, mkr: '#cbd5e1', icon: 'W', pearlOffset: { x: .5, y: .4, z: 1 } },
      { type: 'anchor', x: -50, z: 25, mkr: '#94a3b8', icon: 'A', pearlOffset: { x: 0, y: .3, z: .8 } },
      { type: 'statue', x: 20, z: -55, mkr: '#a8e6a8', icon: 'S', pearlOffset: { x: 0, y: .6, z: .95 } },
    ]);
    assert.match(source, /var PEARL_PICKUP_RANGE = 1\.4;/);
    assert.match(source, /p\.position\.set\(def\.x \+ def\.pearlOffset\.x, m\.position\.y\+def\.pearlOffset\.y, def\.z \+ def\.pearlOffset\.z\)/);
  });
});
