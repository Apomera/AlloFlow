import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
const build = new Function('THREE', 'Math', '__alloT', 'var scene=new THREE.Scene();' + region('var SHELTER_PICKUP_RANGE =', '// ─── Audio (synthesized') + ';return{scene,shelters,types:SHELTER_TYPES,make:makeSpongeMesh,age:function(now){' + region('// Age dropped shelters', '// Treat dropped + static shelters') + '}};');
const fixtures = [];
function fixture() { const draws = [], math = Object.assign(Object.create(Math), { random() { const value = .72 + ((draws.length * 17) % 20) / 100; draws.push(value); return value; } }); const item = build(THREE, math, (_key, fallback) => fallback); fixtures.push(item); return { ...item, math, draws, sponges: item.shelters.filter(root => root.userData.shelterType === 'sponge') }; }
function record(g) { return { attributes: Object.entries(g.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(g.index.array) }; }
afterEach(() => { for (const item of fixtures.splice(0)) { const resources = new Set(); item.scene.traverse(object => { if (object.geometry) resources.add(object.geometry); if (object.material) resources.add(object.material); }); resources.forEach(resource => resource.dispose()); } });

describe('Cephalopod Hunter thick-walled barrel sponge', () => {
  it('keeps three stationary shelters and the original ordered spawn randomness while replacing thirteen mesh draws with one', () => {
    const item = fixture(); assert.equal(item.shelters.length, 12); assert.equal(item.sponges.length, 3); assert.equal(item.draws.length, 36);
    assert.deepEqual(item.shelters.map(root => root.userData.shelterType), ['coconut', 'coconut', 'coconut', 'coconut', 'bottle', 'bottle', 'bottle', 'conch', 'conch', 'sponge', 'sponge', 'sponge']);
    item.shelters.forEach((root, i) => { const d = item.draws.slice(i * 3, i * 3 + 3); assert.deepEqual(root.position.toArray(), [(d[0] - .5) * 110, i >= 9 ? 0 : .32, (d[1] - .5) * 110]); assert.equal(root.userData.wobble, d[2] * Math.PI * 2); assert.equal(root.userData.createdAt, 0); });
    for (const root of item.sponges) {
      assert.equal(root.userData.state, 'static'); assert.equal(root.children.length, 1); const mesh = root.children[0]; assert.equal(mesh.name, 'cl-barrel-sponge'); assert.deepEqual(mesh.position.toArray(), [0, 0, 0]); assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
      assert.equal(mesh.geometry.attributes.position.count, 1002); assert.equal(mesh.geometry.index.count / 3, 1920); assert.equal(mesh.material.type, 'MeshStandardMaterial'); assert.equal(mesh.material.color.getHex(), 0xffffff); assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.transparent, false); assert.equal(mesh.geometry.groups.length, 0); assert.ok(!Object.values(mesh.material).some(value => value?.isTexture));
    }
    item.math.random = () => { throw new Error('Sponge visual construction must not advance dive randomness'); }; const copy = item.make(); copy.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    assert.equal(item.types.sponge.carriable, false); assert.equal(item.types.sponge.camoBonus, .45); assert.equal(item.types.sponge.dropLifeMs, 0);
  });

  it('builds finite unit-normal faces and a physically closed shell through its duplicated basal shading seam', () => {
    for (const root of fixture().sponges) {
      const g = root.children[0].geometry, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
      assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position']); assert.ok([...p.array, ...n.array, ...c.array].every(Number.isFinite)); assert.ok(Array.from(c.array).every(value => value >= 0 && value <= 1));
      const ids = [], welded = new Map(), edges = new Map();
      for (let i = 0; i < p.count; i++) { const point = new THREE.Vector3().fromBufferAttribute(p, i), key = point.toArray().map(value => value.toFixed(6)).join(','); if (!welded.has(key)) welded.set(key, welded.size); ids.push(welded.get(key)); assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5); assert.ok(g.boundingBox.distanceToPoint(point) < 1e-7); assert.ok(point.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7); }
      let end = 0; for (const part of g.userData.clSpongeParts) { assert.equal(part.start, end); assert.ok(part.count > 0 && part.count % 3 === 0); end += part.count; } assert.equal(end, g.index.count);
      for (let i = 0; i < g.index.count; i += 3) {
        const ix = [0, 1, 2].map(j => g.index.getX(i + j)); assert.ok(ix.every(index => index >= 0 && index < p.count)); const points = ix.map(index => new THREE.Vector3().fromBufferAttribute(p, index)), cross = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])), normal = new THREE.Vector3(); ix.forEach(index => normal.add(new THREE.Vector3().fromBufferAttribute(n, index))); assert.ok(cross.length() > 1e-10); assert.ok(cross.dot(normal) > 0, 'Visible normals agree with actual triangle ' + i / 3);
        for (let j = 0; j < 3; j++) { const a = ids[ix[j]], b = ids[ix[(j + 1) % 3]], key = Math.min(a, b) + ':' + Math.max(a, b), edge = edges.get(key) || { count: 0, winding: 0 }; edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge); }
      }
      assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0), 'Position-welded walls, floor and base must form one closed surface');
    }
  });

  it('has a deep ray-open cavity with a substantial real wall and a smoothly joined rolled rim', () => {
    for (const root of fixture().sponges) {
      const mesh = root.children[0], g = mesh.geometry, p = g.attributes.position, meta = g.userData.clSpongeVisual; root.position.set(0, 0, 0); root.updateMatrixWorld(true);
      const center = new THREE.Raycaster(new THREE.Vector3(0, 3, 0), new THREE.Vector3(0, -1, 0)).intersectObject(mesh, false)[0]; assert.ok(center); assert.ok(center.point.y > .15 && center.point.y < .35, 'An aperture ray reaches the true cavity floor, not a shallow black lid');
      for (const [x, z] of [[.15, 0], [-.15, 0], [0, .15], [0, -.15]]) { const hit = new THREE.Raycaster(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh, false)[0]; assert.ok(hit && hit.point.y < .6); }
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)), outer = new THREE.Raycaster(direction.clone().multiplyScalar(2).setY(1.16), direction.clone().negate()).intersectObject(mesh, false)[0], inner = new THREE.Raycaster(new THREE.Vector3(0, 1.16, 0), direction).intersectObject(mesh, false)[0];
        assert.ok(outer && inner); assert.ok(Math.hypot(outer.point.x, outer.point.z) - Math.hypot(inner.point.x, inner.point.z) > .12, 'The cavity has a physical thick wall');
      }
      for (let side = 0; side < meta.sides; side++) {
        const outer = new THREE.Vector3().fromBufferAttribute(p, meta.rimOuterRing + side), crest = new THREE.Vector3().fromBufferAttribute(p, meta.rimCrestRing + side), inner = new THREE.Vector3().fromBufferAttribute(p, meta.rimInnerRing + side);
        assert.ok(crest.y > outer.y && crest.y > inner.y); assert.ok(Math.hypot(outer.x, outer.z) > Math.hypot(crest.x, crest.z)); assert.ok(Math.hypot(crest.x, crest.z) > Math.hypot(inner.x, inner.z));
      }
    }
  });

  it('embeds its basal skirt at the existing grounded root and forms real continuous flutes without extra rib meshes', () => {
    const item = fixture(), signatures = [];
    for (const root of item.sponges) {
      const g = root.children[0].geometry, p = g.attributes.position, meta = g.userData.clSpongeVisual, radius = [];
      for (let side = 0; side < meta.sides; side++) radius.push(Math.hypot(p.getX(meta.outerShoulderRing + side), p.getZ(meta.outerShoulderRing + side)));
      const peaks = radius.filter((value, i) => value > radius[(i + radius.length - 1) % radius.length] && value > radius[(i + 1) % radius.length]); assert.equal(peaks.length, 10); assert.ok(Math.max(...radius) - Math.min(...radius) > .025);
      root.position.set(0, .12, 0); root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root); assert.ok(Math.abs(box.min.y) < 1e-7); assert.ok(box.max.y < 1.78); assert.ok(Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) < .60); signatures.push(Array.from(p.array));
    }
    assert.notDeepEqual(signatures[0], signatures[1]); assert.notDeepEqual(signatures[1], signatures[2]);
  });

  it('keeps static sponges outside the placed-shelter expiry path and disposes only their own stable resources', () => {
    const item = fixture(), [first, neighbor] = item.sponges, mesh = first.children[0], before = record(mesh.geometry), attrs = Object.values(mesh.geometry.attributes), index = mesh.geometry.index;
    first.userData.createdAt = -1000000; item.age(1000000); assert.equal(first.parent, item.scene); assert.equal(first.userData.state, 'static'); assert.deepEqual(record(mesh.geometry), before); assert.deepEqual(Object.values(mesh.geometry.attributes), attrs); assert.equal(mesh.geometry.index, index);
    assert.notEqual(mesh.geometry, neighbor.children[0].geometry); assert.notEqual(mesh.material, neighbor.children[0].material); let disposed = 0, other = 0; [mesh.geometry, mesh.material].forEach(resource => resource.addEventListener('dispose', () => disposed++)); [neighbor.children[0].geometry, neighbor.children[0].material].forEach(resource => resource.addEventListener('dispose', () => other++));
    first.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); first.parent.remove(first); assert.equal(disposed, 2); assert.equal(other, 0);
  });
});
