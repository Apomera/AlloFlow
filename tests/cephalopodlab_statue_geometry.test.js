import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CLH_STATUE_TEST_SOURCE || process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
function region(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Expected live statue region: ' + start);
  return text.slice(a, b);
}
const helpers = region(source, 'function createCLHuntStatueStone(', 'function makeStatue(');
const factory = region(source, 'function makeStatue(', '// Place landmarks at non-recycled');
const rock = region(source, 'function shadeCLHuntRockSurface(', 'function shadeCLHuntCoralSurface(');
// Independent accepted Pass59 factory protects allocation order and the dive RNG.
const acceptedFactory = `function makeStatue() {
  var g=new THREE.Group(), stoneMat=new THREE.MeshStandardMaterial({color:0x6a6055,roughness:0.95});
  var ped=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.5,1.6),stoneMat);ped.position.y=0.25;g.add(ped);
  var body=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.6,0.7),stoneMat);body.position.y=1.3;g.add(body);
  for(var sei=0;sei<2;sei++){var eye=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.05),new THREE.MeshBasicMaterial({color:0x080608}));eye.position.set(sei===0?-0.2:0.2,1.7,0.36);g.add(eye);}
  for(var ali=0;ali<5;ali++){var alga=new THREE.Mesh(new THREE.PlaneGeometry(0.18,0.3),new THREE.MeshBasicMaterial({color:0x2a8c4a,side:THREE.DoubleSide,transparent:true,opacity:0.7}));alga.position.set((Math.random()-0.5)*0.9,0.6+Math.random()*1.4,0.36+(Math.random()-0.5)*0.1);alga.rotation.y=Math.random()*Math.PI;g.add(alga);}
  return g;
}`;
function construct(text = rock + helpers + factory, seed = 2741, webgl2 = true, derivatives = false) {
  const values = [], queries = [], math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const value = seed / 4294967296; values.push(value); return value; };
  const renderer = { capabilities: { isWebGL2: webgl2 }, extensions: { has(name) { queries.push(name); return derivatives; } } };
  const group = new Function('THREE', 'Math', 'renderer', text + ';return makeStatue();')(THREE, math, renderer);
  group.updateMatrixWorld(true); return { group, values, queries };
}
function dispose(group) {
  const geometries = new Set(), materials = new Set();
  group.traverse(mesh => { if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) materials.add(mesh.material); });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
}
function geometryEqual(a, b) {
  assert.deepEqual(Object.keys(a.attributes), Object.keys(b.attributes));
  for (const key of Object.keys(a.attributes)) assert.deepEqual(a.attributes[key].array, b.attributes[key].array);
  assert.deepEqual(a.index.array, b.index.array);
}
function surface(mesh, x, y, fromBack = false) {
  const hits = new THREE.Raycaster(new THREE.Vector3(x, y, fromBack ? -3 : 3), new THREE.Vector3(0, 0, fromBack ? 1 : -1)).intersectObject(mesh, false);
  assert.ok(hits.length, 'Expected real carved stone at ' + x + ',' + y); return hits[0].point.z;
}
function nearestSurfaceDistance(mesh, point) {
  const p = mesh.geometry.attributes.position, index = mesh.geometry.index, triangle = new THREE.Triangle(), closest = new THREE.Vector3(); let distance = Infinity;
  for (let i = 0; i < index.count; i += 3) {
    triangle.a.fromBufferAttribute(p, index.getX(i)).applyMatrix4(mesh.matrixWorld);
    triangle.b.fromBufferAttribute(p, index.getX(i + 1)).applyMatrix4(mesh.matrixWorld);
    triangle.c.fromBufferAttribute(p, index.getX(i + 2)).applyMatrix4(mesh.matrixWorld);
    triangle.closestPointToPoint(point, closest); distance = Math.min(distance, closest.distanceTo(point));
  }
  return distance;
}

describe('Cephalopod Hunter weathered carved statue', () => {
  it('builds deterministic finite stone and fronds with valid normals and a small static buffer budget', () => {
    const current = construct(), duplicate = construct();
    try {
      let triangles = 0, bytes = 0;
      for (const [part, mesh] of current.group.children.entries()) {
        const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, index = g.index;
        assert.ok(index && index.count % 3 === 0); assert.ok(g.boundingBox && g.boundingSphere || part === 2 || part === 3);
        if (!g.boundingBox) g.computeBoundingBox(); if (!g.boundingSphere) g.computeBoundingSphere();
        triangles += index.count / 3; bytes += index.array.byteLength + Object.values(g.attributes).reduce((sum, attribute) => sum + attribute.array.byteLength, 0);
        for (const attribute of Object.values(g.attributes)) for (const value of attribute.array) assert.ok(Number.isFinite(value));
        const point = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), face = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
          point.fromBufferAttribute(p, i); assert.ok(g.boundingBox.containsPoint(point)); assert.ok(point.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-5);
          assert.ok(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 2e-5);
          point.applyMatrix4(mesh.matrixWorld);
          assert.ok(Math.abs(point.x) <= .801 && point.y >= -.00001 && point.y <= 2.101 && Math.abs(point.z) <= .801, 'Statue stays inside its navigation envelope');
        }
        for (let i = 0; i < index.count; i += 3) {
          const ids = [0, 1, 2].map(offset => index.getX(i + offset)); assert.ok(ids.every(id => Number.isInteger(id) && id >= 0 && id < p.count));
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]); face.copy(b).sub(a).cross(c.clone().sub(a));
          assert.ok(face.lengthSq() > 1e-14, 'No collapsed statue triangles'); face.normalize();
          for (const id of ids) assert.ok(face.dot(point.fromBufferAttribute(n, id)) > .05, 'Normals follow visible triangle winding');
        }
        if (g.attributes.color) for (const value of g.attributes.color.array) assert.ok(value >= 0 && value <= 1);
        geometryEqual(g, duplicate.group.children[part].geometry);
      }
      assert.ok(triangles < 700, 'All statue parts stay under 700 triangles'); assert.ok(bytes < 60000, 'All retained statue buffers stay below 60KB');
    } finally { dispose(current.group); dispose(duplicate.group); }
  });

  it('closes both carved stone meshes with opposing edge neighbors and outward volume', () => {
    const fixture = construct();
    try {
      for (const mesh of fixture.group.children.slice(0, 2)) {
        const p = mesh.geometry.attributes.position, index = mesh.geometry.index, edges = new Map(); let volume = 0;
        const key = id => [p.getX(id), p.getY(id), p.getZ(id)].map(value => Math.round(value * 1e6)).join(',');
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (let i = 0; i < index.count; i += 3) {
          const ids = [0, 1, 2].map(offset => index.getX(i + offset));
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]); volume += a.dot(b.cross(c)) / 6;
          for (let edge = 0; edge < 3; edge++) {
            const from = key(ids[edge]), to = key(ids[(edge + 1) % 3]); assert.notEqual(from, to);
            const canonical = from < to ? from + '|' + to : to + '|' + from, entry = edges.get(canonical) || { count: 0, direction: 0 };
            entry.count++; entry.direction += from < to ? 1 : -1; edges.set(canonical, entry);
          }
        }
        assert.ok(volume > .2, 'Stone encloses positive outward-wound volume'); assert.equal(mesh.geometry.groups.length, 0);
        for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 });
      }
    } finally { dispose(fixture.group); }
  });

  it('carves the nose, eyes and brow into real surface depth and joins the head to the pedestal', () => {
    const fixture = construct();
    try {
      const [ped, head, leftEye, rightEye] = fixture.group.children;
      assert.ok(surface(head, 0, 1.2) - surface(head, .2, 1.2) > .18, 'Nose projects from the cheek');
      for (const [side, eye] of [[-1, leftEye], [1, rightEye]]) {
        const recess = surface(head, side * .2, 1.7), brow = surface(head, side * .2, 1.8);
        assert.ok(brow - recess > .12, 'Stone brow projects over its eye recess');
        const back = eye.position.z - .025, front = eye.position.z + .025;
        assert.ok(back < recess && front > recess, 'Shadow eye intersects the recess'); assert.ok(front < brow - .08, 'Eye stays behind the brow');
      }
      const headFoot = new THREE.Vector3(0, -.8, 0).applyMatrix4(head.matrixWorld);
      assert.ok(nearestSurfaceDistance(ped, headFoot) < 1e-6, 'Head sits on real pedestal stone');
      assert.ok(surface(head, 0, 1.1, true) < -.34, 'Rear stone surface remains present');
    } finally { dispose(fixture.group); }
  });

  it('preserves nine children, eight materials, original stone placement and all twenty seeded habitat draws', () => {
    for (const seed of [0, 1, 2741, 8191, 0xffffffff]) {
      const current = construct(undefined, seed), accepted = construct(acceptedFactory, seed);
      try {
        assert.equal(current.group.children.length, 9); assert.equal(current.values.length, 20); assert.deepEqual(current.values, accepted.values);
        assert.equal(new Set(current.group.children.map(child => child.geometry)).size, 9); assert.equal(new Set(current.group.children.map(child => child.material)).size, 8);
        current.group.children.forEach((child, index) => {
          const old = accepted.group.children[index]; assert.equal(child.isMesh, true); assert.equal(child.children.length, 0); assert.deepEqual(child.scale.toArray(), old.scale.toArray());
          assert.ok(!child.material.map && !child.material.normalMap); assert.equal(child.material.transparent, false);
          if (index < 2) { assert.deepEqual(child.position.toArray(), old.position.toArray()); assert.deepEqual(child.rotation.toArray(), old.rotation.toArray()); assert.equal(child.material, current.group.children[0].material); assert.equal(child.material.vertexColors, true); }
          if (index === 2 || index === 3) { geometryEqual(child.geometry, old.geometry); assert.deepEqual(child.material.color.toArray(), old.material.color.toArray()); }
        });
      } finally { dispose(current.group); dispose(accepted.group); }
    }
  });

  it('attaches curved tapered growth close to real rear stone without obscuring the carved face', () => {
    for (const seed of [0, 1, 2741, 8191, 0xffffffff]) {
      const fixture = construct(undefined, seed);
      try {
        for (const alga of fixture.group.children.slice(4)) {
          const root = new THREE.Vector3(0, -.15, 0).applyMatrix4(alga.matrixWorld);
          assert.ok(nearestSurfaceDistance(fixture.group.children[1], root) < .012, 'Growth root remains within a small surface offset');
          const p = alga.geometry.attributes.position;
          assert.ok(p.count > 4 && alga.geometry.index.count <= 48); assert.ok(alga.geometry.boundingBox.max.z > .02, 'Frond has curved physical depth');
          assert.ok(p.getX(1) - p.getX(0) < p.getX(5) - p.getX(4), 'Blade narrows at the attachment');
          const point = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { point.fromBufferAttribute(p, i).applyMatrix4(alga.matrixWorld); assert.ok(point.z < -.31, 'Growth stays behind the head'); }
          assert.equal(alga.material.isMeshStandardMaterial, true); assert.equal(alga.material.side, THREE.DoubleSide); assert.equal(alga.material.transparent, false); assert.equal(alga.material.depthWrite, true);
        }
      } finally { dispose(fixture.group); }
    }
  });

  it('does not allocate extra geometries or materials or alter the global UUID stream', () => {
    const original = Math.random; let seed = 8127, draws = 0;
    const random = () => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const snapshot = group => [group.uuid, ...group.children.flatMap(child => [child.uuid, child.geometry.uuid, child.material.uuid])]; let current, accepted;
    try {
      Math.random = random; accepted = construct(acceptedFactory); const oldDraws = draws, uuids = snapshot(accepted.group);
      seed = 8127; draws = 0; current = construct(); assert.equal(draws, oldDraws); assert.deepEqual(snapshot(current.group), uuids);
    } finally { Math.random = original; if (current) dispose(current.group); if (accepted) dispose(accepted.group); }
  });

  it('gates mineral shading on derivative support and leaves fallback geometry and random streams identical', () => {
    const cases = [[true, false], [false, true], [false, false]], fixtures = cases.map(([webgl2, extension]) => construct(undefined, 2741, webgl2, extension));
    try {
      for (let i = 0; i < fixtures.length; i++) {
        const current = fixtures[i], material = current.group.children[0].material;
        const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
        const before = { ...shader }; material.onBeforeCompile(shader);
        assert.deepEqual(current.values, fixtures[0].values);
        current.group.children.forEach((mesh, part) => geometryEqual(mesh.geometry, fixtures[0].group.children[part].geometry));
        assert.deepEqual(current.queries, i === 0 ? [] : ['OES_standard_derivatives']);
        if (i < 2) { assert.equal(material.extensions.derivatives, true); assert.equal(material.customProgramCacheKey(), 'cl-rock-minerals-v2'); assert.match(shader.fragmentShader, /clRockRoughness/); assert.match(shader.fragmentShader, /fwidth\(clRockPosition/); assert.match(shader.vertexShader, /clRockPosition=position/); }
        else { assert.equal(material.extensions?.derivatives, undefined); assert.equal(shader.vertexShader, before.vertexShader); assert.equal(shader.fragmentShader, before.fragmentShader); }
        assert.deepEqual(shader.uniforms, {}, 'Stone adds no time uniform or frame update');
      }
    } finally { fixtures.forEach(fixture => dispose(fixture.group)); }
  });

  it('keeps the pearl outside stone with its original fixed navigation and pickup contract', () => {
    const block = region(source, 'var LANDMARK_DEFS = [', 'var pearlState = loadPearls();');
    const constructors = { makeShipwreck: () => {}, makeAnchor: () => {}, makeStatue: () => {} };
    const definitions = new Function(...Object.keys(constructors), block + ';return LANDMARK_DEFS;')(...Object.values(constructors));
    assert.deepEqual(definitions.map(({ type, x, z, mkr, icon, pearlOffset }) => ({ type, x, z, mkr, icon, pearlOffset })), [
      { type: 'wreck', x: 39, z: 35, mkr: '#cbd5e1', icon: 'W', pearlOffset: { x: .5, y: .4, z: 1 } },
      { type: 'anchor', x: -50, z: 25, mkr: '#94a3b8', icon: 'A', pearlOffset: { x: 0, y: .3, z: .8 } },
      { type: 'statue', x: 20, z: -55, mkr: '#a8e6a8', icon: 'S', pearlOffset: { x: 0, y: .6, z: .95 } },
    ]);
    const fixture = construct();
    try { const pearl = new THREE.Vector3(0, .6, .95); for (const mesh of fixture.group.children.slice(0, 2)) assert.ok(nearestSurfaceDistance(mesh, pearl) > .15, 'Pearl radius clears solid stone'); }
    finally { dispose(fixture.group); }
    assert.match(source, /var PEARL_PICKUP_RANGE = 1\.4;/);
    assert.match(source, /p\.position\.set\(def\.x \+ def\.pearlOffset\.x, m\.position\.y\+def\.pearlOffset\.y, def\.z \+ def\.pearlOffset\.z\)/);
  });
});
