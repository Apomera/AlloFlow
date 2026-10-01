import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
const build = new Function('THREE', 'Math', '__alloT', 'var scene=new THREE.Scene();' + region('var SHELTER_PICKUP_RANGE =', '// ─── Audio (synthesized') + ';return{scene,shelters,types:SHELTER_TYPES,make:makeConchMesh,age:function(now){' + region('// Age dropped shelters', '// Treat dropped + static shelters') + '}};');
const fixtures = [];
function fixture() { const draws = [], math = Object.assign(Object.create(Math), { random() { const value = .72 + ((draws.length * 17) % 20) / 100; draws.push(value); return value; } }); const item = build(THREE, math, (_key, fallback) => fallback); fixtures.push(item); return { ...item, math, draws, conches: item.shelters.filter(root => root.userData.shelterType === 'conch') }; }
function record(g) { return { attributes: Object.entries(g.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(g.index.array) }; }
function center(g, indices) { return indices.reduce((sum, index) => sum.add(new THREE.Vector3().fromBufferAttribute(g.attributes.position, index)), new THREE.Vector3()).multiplyScalar(1 / indices.length); }
afterEach(() => { for (const item of fixtures.splice(0)) { const resources = new Set(); item.scene.traverse(object => { if (object.geometry) resources.add(object.geometry); if (object.material) resources.add(object.material); }); resources.forEach(resource => resource.dispose()); } });

describe('Cephalopod Hunter continuous conch shelter', () => {
  it('preserves the two real free shelters, ordered spawn draws and carrying tradeoffs with one owned mesh each', () => {
    const item = fixture(); assert.equal(item.shelters.length, 12); assert.equal(item.conches.length, 2); assert.equal(item.draws.length, 36);
    for (const [offset, root] of item.conches.entries()) {
      const draws = item.draws.slice((7 + offset) * 3, (7 + offset) * 3 + 3); assert.deepEqual(root.position.toArray(), [(draws[0] - .5) * 110, .32, (draws[1] - .5) * 110]); assert.deepEqual(root.userData, { shelterType: 'conch', state: 'free', createdAt: 0, wobble: draws[2] * Math.PI * 2 });
      assert.equal(root.children.length, 1); const mesh = root.children[0]; assert.equal(mesh.name, 'cl-conch-shell'); assert.deepEqual(mesh.position.toArray(), [0, 0, 0]); assert.deepEqual(mesh.rotation.toArray(), [0, 0, 0, 'XYZ']); assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
      assert.equal(mesh.material.name, 'cl-conch-material'); assert.equal(mesh.material.type, 'MeshStandardMaterial'); assert.equal(mesh.material.color.getHex(), 0xffffff); assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.side, THREE.FrontSide); assert.ok(!Object.values(mesh.material).some(value => value?.isTexture)); const shader = { uniforms: {}, vertexShader: 'v', fragmentShader: 'f' }; mesh.material.onBeforeCompile(shader); assert.deepEqual(shader, { uniforms: {}, vertexShader: 'v', fragmentShader: 'f' });
      assert.equal(mesh.geometry.groups.length, 0); assert.ok(mesh.geometry.attributes.position.count <= 2200); assert.ok(mesh.geometry.index.count / 3 <= 3400);
    }
    assert.equal(item.types.conch.carriable, true); assert.equal(item.types.conch.camoBonus, .4); assert.equal(item.types.conch.speedPenalty, .15); assert.equal(item.types.conch.dropLifeMs, 60000);
    item.math.random = () => { throw new Error('Conch geometry must not consume world randomness'); }; const copy = item.make(); copy.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
  });

  it('builds finite unit-normal anatomy with consistently wound noncollapsed triangles and a closed indexed surface', () => {
    const g = fixture().conches[0].children[0].geometry, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, edges = new Map();
    assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position']); assert.ok([...p.array, ...n.array, ...c.array].every(Number.isFinite)); assert.equal(n.count, p.count); assert.equal(c.count, p.count); assert.ok(Array.from(c.array).every(value => value >= 0 && value <= 1));
    for (let i = 0; i < p.count; i++) { const point = new THREE.Vector3().fromBufferAttribute(p, i); assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5); assert.ok(g.boundingBox.distanceToPoint(point) < 1e-7); assert.ok(point.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7); }
    let end = 0; for (const part of g.userData.clConchParts) { assert.equal(part.indexStart, end); assert.ok(part.indexCount > 0 && part.indexCount % 3 === 0); end += part.indexCount; } assert.equal(end, g.index.count);
    for (let i = 0; i < g.index.count; i += 3) {
      const ix = [0, 1, 2].map(j => g.index.getX(i + j)); assert.ok(ix.every(index => Number.isInteger(index) && index >= 0 && index < p.count)); const points = ix.map(index => new THREE.Vector3().fromBufferAttribute(p, index)), cross = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])), normal = new THREE.Vector3(); ix.forEach(index => normal.add(new THREE.Vector3().fromBufferAttribute(n, index))); assert.ok(cross.length() > 1e-10); assert.ok(cross.dot(normal) > 0, 'Visible normals agree with actual triangle ' + i / 3);
      for (let j = 0; j < 3; j++) { const a = ix[j], b = ix[(j + 1) % 3], key = Math.min(a, b) + ':' + Math.max(a, b), edge = edges.get(key) || { count: 0, winding: 0 }; edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge); }
    }
    assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0), 'Spire, whorl, lip and cavity form one closed physical surface');
  });

  it('joins the actual spire, whorl and aperture at shared triangle boundary rings without floating contact pieces', () => {
    const g = fixture().conches[0].children[0].geometry, meta = g.userData.clConchGeometry, parts = g.userData.clConchParts;
    function boundary(name) { const part = parts.find(row => row.name === name); assert.ok(part); const edges = new Map(); for (let i = part.indexStart; i < part.indexStart + part.indexCount; i += 3) for (let j = 0; j < 3; j++) { const a = g.index.getX(i + j), b = g.index.getX(i + (j + 1) % 3), key = Math.min(a, b) + ':' + Math.max(a, b); edges.set(key, (edges.get(key) || 0) + 1); } return edges; }
    for (const [ring, left, right] of [[meta.spireBodyRingIndices, 'spire-outer', 'body-whorl'], [meta.outerMouthRingIndices, 'body-whorl', 'flared-lip'], [meta.lipInnerRingIndices, 'flared-lip', 'aperture-recess']]) {
      assert.ok(ring.length >= 20); assert.equal(new Set(ring).size, ring.length); const a = boundary(left), b = boundary(right);
      for (let i = 0; i < ring.length; i++) { const first = ring[i], second = ring[(i + 1) % ring.length], key = Math.min(first, second) + ':' + Math.max(first, second); assert.equal(a.get(key), 1, left + ' actual edge'); assert.equal(b.get(key), 1, right + ' shares the very same rendered edge'); }
    }
    const opening = center(g, meta.lipInnerRingIndices), outer = center(g, meta.lipOuterRingIndices), radial = ring => ring.map(index => new THREE.Vector3().fromBufferAttribute(g.attributes.position, index).distanceTo(center(g, ring)));
    assert.ok(Math.max(...radial(meta.lipOuterRingIndices)) > Math.max(...radial(meta.outerMouthRingIndices)), 'The lip truly flares outside the body opening'); assert.ok(opening.distanceTo(outer) < .03, 'The rolled inner and outer lip remain a connected small-thickness rim');
  });

  it('opens toward +Z with an actual recessed cavity visible through center and offset aperture rays', () => {
    const root = fixture().conches[0], mesh = root.children[0], g = mesh.geometry, meta = g.userData.clConchGeometry; root.position.set(0, 0, 0); root.updateMatrixWorld(true);
    const opening = center(g, meta.lipInnerRingIndices), backRing = center(g, meta.apertureSectionRingIndices.at(-1)), outward = opening.clone().sub(backRing).normalize(); assert.ok(outward.z > .9); assert.ok(opening.x > .1, 'The opening sits to the side of the spire');
    const right = new THREE.Vector3().fromBufferAttribute(g.attributes.position, meta.lipInnerRingIndices[0]).sub(opening).normalize(), up = outward.clone().cross(right).normalize();
    for (const offset of [new THREE.Vector3(), right.clone().multiplyScalar(.025), right.clone().multiplyScalar(-.025), up.clone().multiplyScalar(.035), up.clone().multiplyScalar(-.035)]) {
      const origin = opening.clone().add(offset).addScaledVector(outward, .2), hit = new THREE.Raycaster(origin, outward.clone().negate()).intersectObject(mesh, false)[0]; assert.ok(hit, 'A ray through the real lip reaches the interior'); assert.ok(hit.distance > .26, 'The aperture is not capped by a superficial colored patch');
    }
    const inner = g.userData.clConchParts.find(part => part.name === 'aperture-recess'), lip = g.userData.clConchParts.find(part => part.name === 'flared-lip'), colors = g.attributes.color;
    function brightness(part) { let sum = 0; for (let i = part.vertexStart; i < part.vertexStart + part.vertexCount; i++) sum += colors.getX(i) + colors.getY(i) + colors.getZ(i); return sum / part.vertexCount; }
    assert.ok(brightness(inner) < brightness(lip) * .75, 'Interior depth is supported by material color as well as geometry');
  });

  it('keeps the existing shelter envelope and static resources through carrying wobble and drop poses', () => {
    const [root, neighbor] = fixture().conches, mesh = root.children[0], g = mesh.geometry, before = record(g), attrs = Object.values(g.attributes), index = g.index, versions = attrs.map(attr => attr.version);
    assert.deepEqual(record(neighbor.children[0].geometry), before); assert.notEqual(g, neighbor.children[0].geometry); assert.notEqual(mesh.material, neighbor.children[0].material);
    assert.ok(g.boundingBox.min.x > -.43 && g.boundingBox.max.x < .43); assert.ok(g.boundingBox.min.y > -.36 && g.boundingBox.max.y < .73); assert.ok(g.boundingBox.min.z > -.52 && g.boundingBox.max.z < .52);
    const meta = g.userData.clConchGeometry, small = center(g, meta.sectionRingIndices[0]), large = center(g, meta.outerMouthRingIndices); assert.ok(small.y - large.y > .55); assert.ok(g.attributes.position.getY(meta.tipVertexIndex) > .6);
    for (let frame = 0; frame < 40; frame++) { root.position.set(Math.sin(frame), -.1, .6); root.rotation.set(0, frame * .17, Math.sin(frame * .3) * .12); root.updateMatrixWorld(true); }
    assert.deepEqual(record(g), before); assert.deepEqual(Object.values(g.attributes), attrs); assert.deepEqual(attrs.map(attr => attr.version), versions); assert.equal(g.index, index); assert.equal(root.children.length, 1);
  });

  it('uses the actual strict sixty-second placed lifetime and disposes only the expired conch once', () => {
    const item = fixture(), [first, second] = item.conches, mesh = first.children[0]; let expired = 0, neighbor = 0;
    [mesh.geometry, mesh.material].forEach(resource => resource.addEventListener('dispose', () => expired++)); [second.children[0].geometry, second.children[0].material].forEach(resource => resource.addEventListener('dispose', () => neighbor++));
    first.userData.state = 'dropped'; first.userData.createdAt = 1234; item.age(1234 + 59999.9); assert.equal(first.parent, item.scene); assert.equal(expired, 0); item.age(1234 + 60000); assert.equal(first.parent, item.scene); assert.equal(expired, 0);
    item.age(1234 + 60000.001); assert.equal(first.parent, null); assert.ok(!item.shelters.includes(first)); assert.equal(expired, 2); assert.equal(neighbor, 0); assert.equal(second.userData.state, 'free'); assert.equal(second.parent, item.scene); item.age(1234 + 90000); assert.equal(expired, 2); assert.equal(neighbor, 0);
  });
});
