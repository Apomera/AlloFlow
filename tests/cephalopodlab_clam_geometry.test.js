import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('var DRILL_RANGE = 1.2;'), end = source.indexOf('// ─── Fish schools', start);
assert.ok(start >= 0 && end > start, 'The actual clam construction block must exist');
const math = Object.assign(Object.create(Math), { random() { throw new Error('Clam shaping consumed world randomness'); } });
const build = new Function('THREE', 'Math', 'var scene=new THREE.Scene();' + source.slice(start, end) + ';return {scene,clams,range:DRILL_RANGE,duration:DRILL_DURATION};');
const allocated = [];
function fixture() { const result = build(THREE, math); allocated.push(result); return result; }
function records(clam) {
  return clam.children.map(mesh => ({ attributes: Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(mesh.geometry.index.array),
    metadata: mesh.geometry.userData, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), material: [mesh.material.type, mesh.material.color.toArray(), mesh.material.roughness, mesh.material.metalness, mesh.material.vertexColors] }));
}
afterEach(() => {
  for (const item of allocated.splice(0)) item.scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); });
});

describe('Cephalopod Hunter hinged clam valves', () => {
  it('preserves all eight food anchors and drill metadata with two independently owned opaque valves', () => {
    const item = fixture(), positions = [[-10, 8], [18, -5], [-22, -10], [6, 22], [-5, -18], [35, 15], [12, 28], [-38, 18]];
    assert.equal(item.range, 1.2); assert.equal(item.duration, 1.8); assert.equal(item.clams.length, 8);
    const resources = new Set();
    item.clams.forEach((clam, index) => {
      assert.equal(clam.name, 'cl-prey-clam'); assert.equal(clam.parent, item.scene); assert.deepEqual(clam.position.toArray(), [positions[index][0], .1, positions[index][1]]);
      assert.deepEqual(clam.userData, { alive: true, drillProgress: 0 }); assert.deepEqual(clam.children.map(mesh => mesh.name), ['cl-clam-lower', 'cl-clam-upper']);
      assert.deepEqual(clam.children[0].position.toArray(), [0, 0, 0]); assert.deepEqual(clam.children[1].position.toArray(), [0, 0, -.29]);
      let vertices = 0, triangles = 0;
      for (const mesh of clam.children) {
        assert.ok(mesh.isMesh); assert.deepEqual(mesh.rotation.toArray(), [0, 0, 0, 'XYZ']); assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
        assert.equal(mesh.material.type, 'MeshStandardMaterial'); assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.opacity, 1); assert.equal(mesh.material.color.getHex(), 0xffffff); assert.equal(mesh.material.metalness, 0);
        assert.ok(!Object.values(mesh.material).some(value => value?.isTexture)); assert.equal(mesh.geometry.groups.length, 0);
        for (const resource of [mesh.geometry, mesh.material]) { assert.ok(!resources.has(resource), 'Every valve owns its resource independently'); resources.add(resource); }
        vertices += mesh.geometry.attributes.position.count; triangles += mesh.geometry.index.count / 3;
      }
      assert.ok(vertices <= 1100 && triangles <= 2000); assert.equal(vertices, 1052);
    });
    assert.equal(resources.size, 32);
  });

  it('builds finite outward-wound closed shell walls with unit normals and actual bounded thickness', () => {
    const item = fixture();
    for (const mesh of item.clams[0].children) {
      const geometry = mesh.geometry, p = geometry.attributes.position, n = geometry.attributes.normal, colors = geometry.attributes.color;
      assert.deepEqual(Object.keys(geometry.attributes).sort(), ['color', 'normal', 'position']); assert.equal(n.count, p.count); assert.equal(colors.count, p.count);
      assert.ok([...p.array, ...n.array, ...colors.array].every(Number.isFinite)); assert.ok(Array.from(colors.array).every(value => value >= 0 && value <= 1));
      assert.ok(geometry.boundingBox && geometry.boundingSphere); mesh.updateMatrix();
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3(), edges = new Map();
      const key = index => [p.getX(index), p.getY(index), p.getZ(index)].map(value => Math.round(value * 1e7)).join(',');
      for (let vertex = 0; vertex < p.count; vertex++) {
        a.fromBufferAttribute(p, vertex); assert.ok(geometry.boundingBox.distanceToPoint(a) < 1e-7); assert.ok(a.distanceTo(geometry.boundingSphere.center) <= geometry.boundingSphere.radius + 1e-7);
        const rooted = a.clone().applyMatrix4(mesh.matrix); assert.ok(Math.abs(rooted.x) <= .4 + 1e-7 && Math.abs(rooted.z) <= .4 + 1e-7 && rooted.y >= -.4 - 1e-7 && rooted.y <= .45 + 1e-7, 'Closed valves stay inside the original clam envelope');
        assert.ok(Math.abs(Math.hypot(n.getX(vertex), n.getY(vertex), n.getZ(vertex)) - 1) < 1e-5, 'Unit shell normal at ' + vertex);
      }
      for (let index = 0; index < geometry.index.count; index += 3) {
        const ids = [0, 1, 2].map(offset => geometry.index.getX(index + offset)); assert.ok(ids.every(id => Number.isInteger(id) && id >= 0 && id < p.count));
        a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]); b.sub(a).cross(c.sub(a));
        normal.set(0, 0, 0); for (const id of ids) normal.add(new THREE.Vector3().fromBufferAttribute(n, id));
        assert.ok(b.lengthSq() > 1e-18, 'No collapsed shell triangles'); assert.ok(b.dot(normal) > 0, 'Winding agrees with visible normals');
        for (let edge = 0; edge < 3; edge++) {
          const from = key(ids[edge]), to = key(ids[(edge + 1) % 3]), tag = [from, to].sort().join('|');
          const entry = edges.get(tag) || { count: 0, balance: 0 }; entry.count++; entry.balance += from < to ? 1 : -1; edges.set(tag, entry);
        }
      }
      // The hinge deliberately welds exterior/interior positions. Test physical
      // closure, allowing separate shading vertices on a coincident seam.
      for (const edge of edges.values()) { assert.equal(edge.count, 2, 'Every geometric edge is shared'); assert.equal(edge.balance, 0, 'Adjacent walls have consistent winding'); }
      const sections = geometry.userData.clClamParts; assert.deepEqual(sections.map(part => part.name), ['exterior', 'interior', 'rim']);
      let indexStart = 0; for (const section of sections) { assert.equal(section.indexStart, indexStart); assert.ok(section.indexCount > 0 && section.indexCount % 3 === 0); indexStart += section.indexCount; } assert.equal(indexStart, geometry.index.count);
      const rayMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), rayMesh = new THREE.Mesh(geometry, rayMaterial);
      try {
        rayMesh.updateMatrixWorld(true);
        const localZ = geometry.userData.clClamValve.upper ? .14 : -.15;
        const hits = new THREE.Raycaster(new THREE.Vector3(0, 1, localZ), new THREE.Vector3(0, -1, 0)).intersectObject(rayMesh, false);
        const depths = [...new Set(hits.map(hit => Math.round(hit.point.y * 1e6)))].sort((x, y) => x - y);
        assert.equal(depths.length, 2, 'The shell is a hollow wall, not an open hemisphere or solid overlapping cap');
        const thickness = (depths[1] - depths[0]) / 1e6; assert.ok(thickness > .015 && thickness < .035);
      } finally { rayMaterial.dispose(); }
    }
  });

  it('keeps actual posterior hinge samples fixed while the front opens without crossing the lower valve', () => {
    const clam = fixture().clams[0], lower = clam.children[0], upper = clam.children[1];
    clam.position.set(3, .1, -2); clam.rotation.y = .73; clam.updateMatrixWorld(true);
    const lp = lower.geometry.attributes.position, up = upper.geometry.attributes.position, meta = upper.geometry.userData.clClamValve;
    assert.equal(meta.hingeZ, -.29); assert.equal(meta.sides, 24); assert.equal(meta.hingeColumns.length, 3);
    const hingeIndices = [meta.outerRimStart, meta.innerRimStart].flatMap(start => meta.hingeColumns.map(column => start + column));
    const fixed = hingeIndices.map(index => new THREE.Vector3().fromBufferAttribute(up, index).applyMatrix4(upper.matrixWorld));
    const lowerMeta = lower.geometry.userData.clClamValve;
    for (let i = 0; i < meta.hingeColumns.length; i++) {
      const bottom = new THREE.Vector3().fromBufferAttribute(lp, lowerMeta.outerRimStart + meta.hingeColumns[i]).applyMatrix4(lower.matrixWorld);
      assert.ok(bottom.distanceTo(fixed[i]) < 1e-7, 'Valves meet along the real posterior hinge');
    }
    let front = 0; for (let i = 1; i < up.count; i++) if (up.getZ(i) > up.getZ(front)) front = i;
    let priorFrontY = -Infinity;
    for (let step = 0; step <= 16; step++) {
      upper.rotation.x = -step / 16 * Math.PI / 6; clam.updateMatrixWorld(true);
      hingeIndices.forEach((index, i) => assert.ok(new THREE.Vector3().fromBufferAttribute(up, index).applyMatrix4(upper.matrixWorld).distanceTo(fixed[i]) < 1e-7));
      const frontY = new THREE.Vector3().fromBufferAttribute(up, front).applyMatrix4(upper.matrixWorld).y;
      assert.ok(frontY > priorFrontY); priorFrontY = frontY;
      for (let vertex = 0; vertex < up.count; vertex++) {
        const posed = new THREE.Vector3().fromBufferAttribute(up, vertex).applyMatrix4(upper.matrix);
        assert.ok(posed.y >= -1e-7, 'Upper shell never cuts below the hinge plane');
        assert.ok(Math.abs(posed.x) <= .4 + 1e-7 && Math.abs(posed.z) <= .4 + 1e-7 && posed.y <= .45 + 1e-7, 'Opening remains inside the original closed-shell envelope');
      }
    }
    assert.ok(priorFrontY > clam.position.y + .3);
    upper.rotation.x = 0; clam.updateMatrixWorld(true);
    const outer = meta.outerRimStart, bottomOuter = lowerMeta.outerRimStart;
    for (let column = 0; column < meta.sides; column++) {
      const a = new THREE.Vector3().fromBufferAttribute(up, outer + column).applyMatrix4(upper.matrix), b = new THREE.Vector3().fromBufferAttribute(lp, bottomOuter + column).applyMatrix4(lower.matrix);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-7); assert.ok(a.y - b.y >= -1e-7 && a.y - b.y <= .017);
    }
  });

  it('keeps the same static geometry and material resources across opening, cancellation and deterministic construction', () => {
    const a = fixture().clams[0], b = fixture().clams[0]; assert.deepEqual(records(a), records(b));
    const snapshots = a.children.map(mesh => ({ geometry: mesh.geometry, material: mesh.material, index: mesh.geometry.index, indexArray: mesh.geometry.index.array,
      attrs: Object.values(mesh.geometry.attributes).map(attr => ({ attr, array: attr.array, version: attr.version, values: attr.array.slice() })) }));
    for (const angle of [0, -.08, -.25, -Math.PI / 6, -.11, 0]) {
      a.children[1].rotation.x = angle; a.updateMatrixWorld(true);
      a.children.forEach((mesh, i) => { const before = snapshots[i]; assert.equal(mesh.geometry, before.geometry); assert.equal(mesh.material, before.material); assert.equal(mesh.geometry.index, before.index); assert.equal(mesh.geometry.index.array, before.indexArray);
        for (const row of before.attrs) { assert.equal(row.attr.array, row.array); assert.equal(row.attr.version, row.version); assert.deepEqual(row.array, row.values); } });
    }
  });

  it('disposes each eaten valve exactly once without touching a surviving clam', () => {
    const item = fixture(), eaten = item.clams[0], neighbor = item.clams[1], counters = [];
    for (const [owner, clam] of [['eaten', eaten], ['neighbor', neighbor]]) for (const mesh of clam.children) for (const resource of [mesh.geometry, mesh.material]) {
      const row = { owner, count: 0 }; resource.addEventListener('dispose', () => row.count++); counters.push(row);
    }
    // The production capture path traverses each mesh separately. Materials are
    // deliberately per valve so that this unchanged traversal is single-owner.
    eaten.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); });
    assert.equal(counters.filter(row => row.owner === 'eaten').length, 4); assert.ok(counters.every(row => row.count === (row.owner === 'eaten' ? 1 : 0)));
    assert.equal(neighbor.userData.alive, true); assert.equal(neighbor.parent, item.scene);
  });
});
