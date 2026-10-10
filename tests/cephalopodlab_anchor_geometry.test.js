import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CLH_ANCHOR_TEST_SOURCE || process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
function region(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Expected live anchor region: ' + start);
  return text.slice(a, b);
}
const helper = region(source, 'function createCLHuntAnchorGeometry(', 'function makeAnchor(');
const factory = region(source, 'function makeAnchor(', 'function makeStatue(');

// Independent accepted Pass58 constructor: child allocation order and the
// seeded simulation stream must survive the landmark geometry replacement.
const acceptedFactory = `function makeAnchor() {
  var g = new THREE.Group();
  var ironMat = new THREE.MeshStandardMaterial({ color: 0x5a5050, roughness: 0.85, metalness: 0.3 });
  var shank = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 8), ironMat);
  shank.position.y = 1.2; g.add(shank);
  var crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.6, 6), ironMat);
  crown.position.y = 0.3; crown.rotation.x = Math.PI / 2; g.add(crown);
  for (var afi = 0; afi < 2; afi++) {
    var flukeSide = afi === 0 ? -1 : 1;
    var fluke = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4), ironMat);
    fluke.position.set(flukeSide * 0.75, 0.3, 0); fluke.rotation.z = flukeSide * Math.PI / 2; g.add(fluke);
  }
  var stock = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 6), ironMat);
  stock.position.y = 2.3; stock.rotation.x = Math.PI / 2; g.add(stock);
  for (var bag = 0; bag < 4; bag++) {
    var bg = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.9 }));
    bg.position.set((Math.random() - 0.5) * 1.2, 0.2 + Math.random() * 1.5, (Math.random() - 0.5) * 0.3); g.add(bg);
  }
  return g;
}`;
function construct(text = helper + factory, seed = 2741) {
  const values = [], math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const value = seed / 4294967296; values.push(value); return value; };
  const group = new Function('THREE', 'Math', text + ';return makeAnchor();')(THREE, math);
  group.updateMatrixWorld(true); return { group, values };
}
function dispose(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
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
function spanAt(mesh, x, y) {
  const front = new THREE.Raycaster(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1)).intersectObject(mesh, false);
  const back = new THREE.Raycaster(new THREE.Vector3(x, y, -3), new THREE.Vector3(0, 0, 1)).intersectObject(mesh, false);
  assert.ok(front.length && back.length, 'Expected solid landmark section at ' + x + ',' + y);
  return [back[0].point.z, front[0].point.z];
}

describe('Cephalopod Hunter connected weathered anchor', () => {
  it('builds finite indexed iron with nondegenerate visible faces, unit normals and tight bounds', () => {
    const fixture = construct(), duplicate = construct();
    try {
      let triangles = 0, retainedBytes = 0;
      fixture.group.children.slice(0, 5).forEach((mesh, part) => {
        const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, index = g.index;
        assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position', 'uv']);
        assert.ok(index && index.count % 3 === 0); assert.ok(g.boundingBox && g.boundingSphere);
        triangles += index.count / 3; retainedBytes += bytes(g);
        assert.equal(g.groups.length, 0, 'A retained iron part still submits one material draw');
        for (const attribute of Object.values(g.attributes)) for (const value of attribute.array) assert.ok(Number.isFinite(value));
        const point = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), face = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
          point.fromBufferAttribute(p, i); assert.ok(g.boundingBox.containsPoint(point));
          assert.ok(point.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-5);
          assert.ok(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 2e-5, 'Iron normals remain unit length');
          point.applyMatrix4(mesh.matrixWorld);
          assert.ok(Math.abs(point.x) <= 1.31 && point.y >= -.011 && point.y <= 2.82 && Math.abs(point.z) <= .781, 'Anchor remains a compact navigation landmark');
        }
        for (let i = 0; i < index.count; i += 3) {
          const ids = [0, 1, 2].map(offset => index.getX(i + offset));
          assert.ok(ids.every(id => Number.isInteger(id) && id >= 0 && id < p.count));
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
          face.copy(b).sub(a).cross(c.clone().sub(a)); assert.ok(face.lengthSq() > 1e-14, 'No collapsed iron triangles'); face.normalize();
          for (const id of ids) assert.ok(face.dot(point.fromBufferAttribute(n, id)) > .01, 'Normals follow triangle winding');
        }
        for (const value of g.attributes.color.array) assert.ok(value >= 0 && value <= 1);
        geometryEqual(g, duplicate.group.children[part].geometry);
      });
      assert.ok(triangles < 3000, 'Anchor remains below 3,000 static triangles');
      assert.ok(retainedBytes < 100000, 'All detailed iron buffers stay below 100KB');
    } finally { dispose(fixture.group); dispose(duplicate.group); }
  });

  it('closes the iron surfaces with opposing edge neighbors and outward volume', () => {
    const fixture = construct();
    try {
      for (const mesh of fixture.group.children.slice(0, 5)) {
        const p = mesh.geometry.attributes.position, index = mesh.geometry.index, edges = new Map();
        const key = id => [p.getX(id), p.getY(id), p.getZ(id)].map(value => Math.round(value * 1e6)).join(',');
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); let volume = 0;
        for (let i = 0; i < index.count; i += 3) {
          const ids = [0, 1, 2].map(offset => index.getX(i + offset));
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]); volume += a.dot(b.cross(c)) / 6;
          for (let edge = 0; edge < 3; edge++) {
            const from = key(ids[edge]), to = key(ids[(edge + 1) % 3]); assert.notEqual(from, to);
            const canonical = from < to ? from + '|' + to : to + '|' + from, value = edges.get(canonical) || { count: 0, direction: 0 };
            value.count++; value.direction += from < to ? 1 : -1; edges.set(canonical, value);
          }
        }
        assert.ok(volume > 1e-5, 'Every retained iron mesh encloses positive volume');
        for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 }, 'Physical iron edges have opposing neighbors');
      }
    } finally { dispose(fixture.group); }
  });

  it('joins the crown to the shank and both rising flukes with overlapping solid sections', () => {
    const fixture = construct();
    try {
      const [shank, crown, left, right] = fixture.group.children;
      for (const [a, b, x, y] of [[shank, crown, 0, .18], [crown, left, -.84, .71], [crown, right, .84, .71]]) {
        const aa = spanAt(a, x, y), bb = spanAt(b, x, y);
        assert.ok(Math.min(aa[1], bb[1]) - Math.max(aa[0], bb[0]) > .035, 'Joined iron overlaps in depth');
      }
      for (const [mesh, side] of [[left, -1], [right, 1]]) spanAt(mesh, side * .72, 1.07);
    } finally { dispose(fixture.group); }
  });

  it('has a real open lifting eye and a stock that still crosses the shank', () => {
    const fixture = construct();
    try {
      const [shank, , , , stock] = fixture.group.children;
      for (const [x, y] of [[0, 2.56], [.08, 2.56], [0, 2.64]]) {
        const hits = new THREE.Raycaster(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1)).intersectObject(shank, false);
        assert.equal(hits.length, 0, 'The lifting eye aperture is genuinely empty');
      }
      for (const [x, y] of [[0, 2.76], [-.2, 2.56], [.2, 2.56]]) spanAt(shank, x, y);
      const aa = spanAt(shank, 0, 2.3), bb = spanAt(stock, 0, 2.3);
      assert.ok(Math.min(aa[1], bb[1]) - Math.max(aa[0], bb[0]) > .08);
    } finally { dispose(fixture.group); }
  });

  it('preserves nine children, shared iron, all original iron transforms and twelve seeded habitat draws', () => {
    for (const seed of [0, 1, 2741, 8191, 0xffffffff]) {
      const current = construct(undefined, seed), accepted = construct(acceptedFactory, seed);
      try {
        assert.equal(current.group.children.length, 9); assert.equal(current.values.length, 12); assert.deepEqual(current.values, accepted.values);
        assert.equal(new Set(current.group.children.map(child => child.geometry)).size, 9);
        assert.equal(new Set(current.group.children.map(child => child.material)).size, 5);
        current.group.children.forEach((child, index) => {
          const old = accepted.group.children[index]; assert.equal(child.children.length, 0); assert.equal(child.isMesh, true);
          assert.deepEqual(child.rotation.toArray(), old.rotation.toArray()); assert.deepEqual(child.scale.toArray(), old.scale.toArray());
          assert.equal(child.material.transparent, false); assert.equal(child.material.side, THREE.FrontSide);
          assert.ok(!child.material.map && !child.material.normalMap);
          if (index < 5) { assert.deepEqual(child.position.toArray(), old.position.toArray()); assert.equal(child.material, current.group.children[0].material); assert.equal(child.material.vertexColors, true); }
          else { geometryEqual(child.geometry, old.geometry); assert.deepEqual(child.material.color.toArray(), old.material.color.toArray()); }
        });
      } finally { dispose(current.group); dispose(accepted.group); }
    }
  });

  it('seats every existing barnacle on actual shank triangles across the seeded habitat stream', () => {
    for (const seed of [0, 1, 2741, 8191, 0xffffffff]) {
      const fixture = construct(undefined, seed);
      try {
        for (const barnacle of fixture.group.children.slice(5)) assert.ok(nearestSurfaceDistance(fixture.group.children[0], barnacle.position) < barnacle.geometry.parameters.radius * .65, 'Barnacle intersects retained iron instead of floating');
      } finally { dispose(fixture.group); }
    }
  });

  it('does not allocate extra geometries or materials or consume global UUID randomness', () => {
    const original = Math.random; let seed = 8127, draws = 0;
    const globalRandom = () => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const snapshot = group => [group.uuid, ...group.children.flatMap(child => [child.uuid, child.geometry.uuid, child.material.uuid])];
    let current, accepted;
    try {
      Math.random = globalRandom; accepted = construct(acceptedFactory); const oldDraws = draws, uuids = snapshot(accepted.group);
      seed = 8127; draws = 0; current = construct(); assert.equal(draws, oldDraws); assert.deepEqual(snapshot(current.group), uuids);
    } finally { Math.random = original; if (current) dispose(current.group); if (accepted) dispose(accepted.group); }
  });

  it('retains fixed navigation coordinates and reachable pearl placement and pickup distances', () => {
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
