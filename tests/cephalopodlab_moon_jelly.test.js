import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('var jellyfish = [];'), end = source.indexOf('// ─── Surface light rays', start);
assert.ok(start >= 0 && end > start); const construct = new Function('THREE', 'Math', 'var scene=new THREE.Scene();' + source.slice(start, end) + ';return{scene,jellyfish,update:updateCLHuntMoonJellyVisual};');
const fixtures = [];
function fixture() { const draws = [], math = Object.assign(Object.create(Math), { random() { const value = ((draws.length * 31 + 19) % 101) / 101; draws.push(value); return value; } }); const item = construct(THREE, math); fixtures.push(item); return { ...item, draws }; }
function localPoints(mesh) { mesh.updateMatrix(); return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrix)); }
function records(root) { return root.children.map(mesh => ({ name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(), attrs: Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(mesh.geometry.index.array), material: [mesh.material.type, mesh.material.color.toArray(), mesh.material.opacity, mesh.material.transparent, mesh.material.depthWrite, mesh.material.blending] })); }
afterEach(() => { for (const item of fixtures.splice(0)) item.scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); });

describe('Cephalopod Hunter moon-jelly anatomy', () => {
  it('retains five ambient actors and all sixty-five ordered spawn and phase draws', () => {
    const item = fixture(); assert.equal(item.jellyfish.length, 5); assert.equal(item.draws.length, 65);
    item.jellyfish.forEach((jelly, i) => {
      const d = item.draws.slice(i * 13, i * 13 + 13), u = jelly.userData;
      assert.equal(jelly.name, 'cl-moon-jelly'); assert.equal(jelly.parent, item.scene); assert.equal(u.tents.length, 6);
      assert.deepEqual(u.tents.map(trail => trail.basePhase), d.slice(0, 6).map(value => value * Math.PI * 2));
      assert.deepEqual(jelly.position.toArray(), [(d[6] - .5) * 100, 4 + d[8] * 3, (d[7] - .5) * 100]);
      assert.equal(u.pulsePhase, d[9] * Math.PI * 2); assert.equal(u.driftAngle, d[10] * Math.PI * 2); assert.equal(u.driftSpeed, .4 + d[11] * .3); assert.equal(u.verticalPhase, d[12] * Math.PI * 2);
      assert.equal(u.alive, undefined); assert.equal(u.damage, undefined); assert.equal(u.aggroRange, undefined);
      assert.deepEqual(jelly.children.map(mesh => mesh.name), ['cl-jelly-bell', 'cl-jelly-anatomy', 'cl-jelly-oral-arm-0', 'cl-jelly-oral-arm-1', 'cl-jelly-oral-arm-2', 'cl-jelly-oral-arm-3', 'cl-jelly-margin-0', 'cl-jelly-margin-1']);
      assert.equal(u.bellGeo, jelly.children[0].geometry); assert.deepEqual(Array.from(u.bellBasePos), Array.from(u.bellGeo.attributes.position.array));
    });
  });

  it('uses eight bounded finite indexed surfaces with an upward crown, trailing anatomy and ordinary alpha ownership', () => {
    const item = fixture();
    for (const jelly of item.jellyfish) {
      assert.equal(new Set(jelly.children.map(mesh => mesh.geometry)).size, 8); assert.equal(new Set(jelly.children.map(mesh => mesh.material)).size, 8);
      assert.ok(jelly.children.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0) <= 2500); assert.ok(jelly.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0) <= 3500);
      for (const mesh of jelly.children) {
        const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
        assert.ok(g.index && g.boundingBox && g.boundingSphere); assert.equal(n.count, p.count); assert.equal(g.groups.length, 0); assert.ok(Object.values(g.attributes).every(attr => Array.from(attr.array).every(Number.isFinite)));
        assert.equal(mesh.material.transparent, true); assert.equal(mesh.material.depthWrite, false); assert.equal(mesh.material.blending, THREE.NormalBlending); assert.ok(mesh.material.opacity > 0 && mesh.material.opacity < 1); assert.ok(!Object.values(mesh.material).some(value => value?.isTexture));
        for (let i = 0; i < p.count; i++) { const point = new THREE.Vector3().fromBufferAttribute(p, i); assert.ok(g.boundingBox.distanceToPoint(point) < 1e-7); assert.ok(point.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7); assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5); }
        for (let i = 0; i < g.index.count; i += 3) {
          const ids = [0, 1, 2].map(j => g.index.getX(i + j)); assert.ok(ids.every(id => Number.isInteger(id) && id >= 0 && id < p.count));
          const points = ids.map(id => new THREE.Vector3().fromBufferAttribute(p, id)), cross = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])), normal = new THREE.Vector3(); ids.forEach(id => normal.add(new THREE.Vector3().fromBufferAttribute(n, id)));
          assert.ok(cross.length() > 1e-10, mesh.name + ' collapsed face ' + i / 3); assert.ok(cross.dot(normal) > 0, mesh.name + ' normal opposes face ' + i / 3);
        }
      }
      const bell = localPoints(jelly.children[0]); assert.ok(Math.max(...bell.map(point => point.y)) > .2); assert.ok(Math.min(...bell.map(point => point.y)) > -.15, 'The shallow dome crown points upward rather than hanging below the rim');
      for (const mesh of jelly.children.slice(2)) assert.ok(Math.min(...localPoints(mesh).map(point => point.y)) < -.2, 'Oral arms and margin tentacles trail below the bell');
    }
  });

  it('updates bell normals from the actual deformed triangles without reallocating or escaping fixed conservative bounds', () => {
    const item = fixture(), jelly = item.jellyfish[0], g = jelly.userData.bellGeo, position = g.attributes.position, normal = g.attributes.normal, index = g.index;
    const box = g.boundingBox.clone(), sphere = g.boundingSphere.clone(), original = new Float32Array(position.array), staticRows = jelly.children.slice(1).map(mesh => records({ children: [mesh] })[0]);
    for (const pulse of [0, .05, .25, .5, .75, .95, 1]) {
      item.update(jelly.userData, pulse, 17000 + pulse * 1000);
      assert.equal(g.attributes.position, position); assert.equal(g.attributes.normal, normal); assert.equal(g.index, index); assert.ok(g.boundingBox.equals(box)); assert.ok(g.boundingSphere.equals(sphere));
      const accumulated = Array.from({ length: position.count }, () => new THREE.Vector3());
      for (let i = 0; i < index.count; i += 3) { const ids = [0, 1, 2].map(j => index.getX(i + j)), points = ids.map(id => new THREE.Vector3().fromBufferAttribute(position, id)), cross = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])); assert.ok(cross.length() > 1e-10); ids.forEach(id => accumulated[id].add(cross)); }
      for (let i = 0; i < position.count; i++) { const point = new THREE.Vector3().fromBufferAttribute(position, i), actual = new THREE.Vector3().fromBufferAttribute(normal, i); assert.ok(box.distanceToPoint(point) < 1e-7); assert.ok(point.distanceTo(sphere.center) <= sphere.radius + 1e-7); assert.ok(Math.abs(actual.length() - 1) < 1e-5); assert.ok(actual.dot(accumulated[i].normalize()) > 1 - 1e-5, 'Lighting normals follow the live pulse surface'); }
      jelly.children.slice(1).forEach((mesh, i) => { const row = records({ children: [mesh] })[0]; assert.deepEqual(row.attrs, staticRows[i].attrs); assert.deepEqual(row.index, staticRows[i].index); assert.deepEqual(row.material, staticRows[i].material); });
    }
    assert.notDeepEqual(Array.from(position.array), Array.from(original)); assert.equal(item.draws.length, 65, 'Visual pulse evaluation must not advance world randomness');
  });

  it('keeps deterministic geometry and independently owned resources across all five actors', () => {
    const first = fixture(), second = fixture(); first.jellyfish.forEach((jelly, i) => assert.deepEqual(records(jelly), records(second.jellyfish[i])));
    const resources = first.jellyfish.map(jelly => new Set(jelly.children.flatMap(mesh => [mesh.geometry, mesh.material]))); resources.forEach(set => assert.equal(set.size, 16));
    for (let i = 0; i < resources.length; i++) for (let j = i + 1; j < resources.length; j++) assert.ok([...resources[i]].every(resource => !resources[j].has(resource)));
    let own = 0, neighbor = 0; resources[0].forEach(resource => resource.addEventListener('dispose', () => own++)); resources[1].forEach(resource => resource.addEventListener('dispose', () => neighbor++));
    first.jellyfish[0].traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); first.jellyfish[0].parent.remove(first.jellyfish[0]); assert.equal(own, 16); assert.equal(neighbor, 0);
  });

  it('attaches actual canal tips, four oral roots and all twenty-four margin roots throughout pulse and wave extrema', () => {
    const item = fixture(), jelly = item.jellyfish[0], bell = jelly.children[0], anatomy = jelly.children[1], meta = bell.geometry.userData.clJellyBell, organs = anatomy.geometry.userData.clJellyAnatomy;
    assert.equal(organs.canalTips.length, 12); assert.equal(organs.mouthCorners.length, 4);
    const tips = [];
    for (const pulse of [0, .25, .5, .75, 1]) for (const now of [0, 500, 2000, 70000]) {
      item.update(jelly.userData, pulse, now); const bp = localPoints(bell), ap = localPoints(anatomy), rim = bp.slice(meta.rimStart, meta.rimStart + meta.sides);
      for (const canal of organs.canalTips) {
        const center = ap[canal.indices[0]].clone().add(ap[canal.indices[1]]).multiplyScalar(.5);
        assert.ok(center.distanceTo(bp[canal.bellIndex]) < 3e-7, 'Actual canal endpoint meets the moving rim');
      }
      for (const mesh of jelly.children.slice(2, 6)) {
        const points = localPoints(mesh), attachment = mesh.geometry.userData.clJellyAttachment;
        assert.ok(points[attachment.rootIndex].distanceTo(ap[attachment.mouthCorner]) < 3e-7, 'Actual oral ribbon root follows the mouth corner during wave rotation');
        assert.ok(Math.min(...points.map(point => point.y)) < points[attachment.rootIndex].y - .4); tips.push(points.at(-1).toArray());
      }
      let rootCount = 0;
      for (const mesh of jelly.children.slice(6)) {
        const points = localPoints(mesh), attachment = mesh.geometry.userData.clJellyAttachment;
        for (const root of attachment.roots) {
          const point = points[root.index], nearest = new THREE.Vector3(); let gap = Infinity;
          for (let edge = 0; edge < rim.length; edge++) { new THREE.Line3(rim[edge], rim[(edge + 1) % rim.length]).closestPointToPoint(point, true, nearest); gap = Math.min(gap, point.distanceTo(nearest)); }
          const radius = Math.hypot(rim[0].x, rim[0].z), sagitta = radius * (1 - Math.cos(Math.PI / rim.length));
          assert.ok(gap <= sagitta + 4e-7, 'A rotated tube root stays on the actual faceted lip within its circular-edge sagitta'); rootCount++;
        }
      }
      assert.equal(rootCount, 24);
    }
    assert.ok(tips.some(point => point.some((value, i) => Math.abs(value - tips[0][i]) > .02)), 'The wave fixture actually exercises changing attached poses'); assert.equal(item.draws.length, 65);
  });

  it('renders four separate open horseshoes under the bell instead of a single closed glowing ring', () => {
    const item = fixture(), jelly = item.jellyfish[0], anatomy = jelly.children[1], g = anatomy.geometry, entries = g.userData.clJellyAnatomy.gonads;
    assert.equal(entries.length, 4); const centers = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i], section = g.userData.clJellyParts.find(part => part.name === 'gonad-' + i); assert.ok(section); const p = g.attributes.position;
      // Each terminal cap is an actual indexed vertex. Their gap must remain
      // open when ray-tested against the complete tube's real triangles.
      const first = new THREE.Vector3().fromBufferAttribute(p, entry.vertexStart + entry.vertexCount - 2), last = new THREE.Vector3().fromBufferAttribute(p, entry.vertexStart + entry.vertexCount - 1), gapCenter = first.clone().add(last).multiplyScalar(.5);
      assert.ok(first.distanceTo(last) > .04); const middle = new THREE.Vector3(); for (let k = 0; k < 5; k++) middle.add(new THREE.Vector3().fromBufferAttribute(p, entry.vertexStart + 6 * 5 + k)); middle.multiplyScalar(.2);
      assert.ok(Math.hypot(middle.x, middle.z) > Math.hypot(gapCenter.x, gapCenter.z) + .08); centers.push(middle);
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', p); geometry.setIndex(Array.from(g.index.array.slice(section.indexStart, section.indexStart + section.indexCount)));
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), mesh = new THREE.Mesh(geometry, material); mesh.updateMatrixWorld(true);
      try { assert.equal(new THREE.Raycaster(new THREE.Vector3(gapCenter.x, 1, gapCenter.z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh, false).length, 0, 'Each horseshoe has a real clear inward opening'); } finally { geometry.dispose(); material.dispose(); }
    }
    assert.equal(new Set(centers.map(point => (point.x > 0 ? 'R' : 'L') + (point.z > 0 ? 'F' : 'B'))).size, 4);
    const bell = jelly.children[0], material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), surface = new THREE.Mesh(bell.geometry, material); surface.updateMatrixWorld(true);
    try {
      for (const pulse of [0, .5, 1]) { item.update(jelly.userData, pulse, 1000); anatomy.updateMatrix(); for (const point of centers) { const actual = point.clone().applyMatrix4(anatomy.matrix), hit = new THREE.Raycaster(new THREE.Vector3(actual.x, 1, actual.z), new THREE.Vector3(0, -1, 0)).intersectObject(surface, false)[0]; assert.ok(hit && hit.point.y > actual.y + .02, 'The gonads remain under the actual pulsing bell'); } }
    } finally { material.dispose(); }
  });
});
