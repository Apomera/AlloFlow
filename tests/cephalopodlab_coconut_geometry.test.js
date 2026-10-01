import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
const build = new Function('THREE', 'Math', '__alloT', 'var scene=new THREE.Scene();' + region('var SHELTER_PICKUP_RANGE =', '// ─── Audio (synthesized') + ';return{scene,shelters,types:SHELTER_TYPES,make:makeCoconutMesh,age:function(now){' + region('// Age dropped shelters', '// Treat dropped + static shelters') + '}};');
const fixtures = [];
function fixture() { const draws = [], math = Object.assign(Object.create(Math), { random() { const value = .72 + ((draws.length * 17) % 20) / 100; draws.push(value); return value; } }); const item = build(THREE, math, (_key, fallback) => fallback); fixtures.push(item); return { ...item, math, draws, coconuts: item.shelters.filter(root => root.userData.shelterType === 'coconut') }; }
const point = (g, i) => new THREE.Vector3().fromBufferAttribute(g.attributes.position, i);
const center = (g, ring) => ring.reduce((sum, i) => sum.add(point(g, i)), new THREE.Vector3()).multiplyScalar(1 / ring.length);
const record = g => ({ attrs: Object.entries(g.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(g.index.array) });
afterEach(() => { for (const item of fixtures.splice(0)) { const resources = new Set(); item.scene.traverse(o => { if (o.geometry) resources.add(o.geometry); if (o.material) resources.add(o.material); }); resources.forEach(resource => resource.dispose()); } });

describe('Cephalopod Hunter hollow coconut shelter', () => {
  it('preserves four real free actors, ordered spawn randomness and carry costs with one owned draw each', () => {
    const item = fixture(); assert.equal(item.shelters.length, 12); assert.equal(item.coconuts.length, 4); assert.equal(item.draws.length, 36);
    item.coconuts.forEach((root, i) => { const d = item.draws.slice(i * 3, i * 3 + 3); assert.deepEqual(root.position.toArray(), [(d[0] - .5) * 110, .32, (d[1] - .5) * 110]); assert.deepEqual(root.userData, { shelterType: 'coconut', state: 'free', createdAt: 0, wobble: d[2] * Math.PI * 2 }); assert.equal(root.children.length, 1);
      const mesh = root.children[0]; assert.equal(mesh.name, 'cl-coconut-shell'); assert.deepEqual(mesh.position.toArray(), [0, 0, 0]); assert.deepEqual(mesh.rotation.toArray(), [0, 0, 0, 'XYZ']); assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]); assert.equal(mesh.material.name, 'cl-coconut-material'); assert.equal(mesh.material.type, 'MeshStandardMaterial'); assert.equal(mesh.material.color.getHex(), 0xffffff); assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.side, THREE.FrontSide); assert.equal(mesh.material.roughness, .88); assert.ok(!Object.values(mesh.material).some(value => value?.isTexture)); assert.equal(mesh.geometry.groups.length, 0); assert.ok(mesh.geometry.attributes.position.count <= 1700); assert.ok(mesh.geometry.index.count / 3 <= 3000);
      const shader = { uniforms: {}, vertexShader: 'v', fragmentShader: 'f' }; mesh.material.onBeforeCompile(shader); assert.deepEqual(shader, { uniforms: {}, vertexShader: 'v', fragmentShader: 'f' });
    });
    assert.equal(item.types.coconut.carriable, true); assert.equal(item.types.coconut.camoBonus, .3); assert.equal(item.types.coconut.speedPenalty, .1); assert.equal(item.types.coconut.dropLifeMs, 90000);
    item.math.random = () => { throw new Error('Model construction must not consume dive randomness'); }; const copy = item.make(); copy.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  });

  it('forms one closed consistently wound surface with finite unit normals and conservative culling bounds', () => {
    const g = fixture().coconuts[0].children[0].geometry, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, edges = new Map();
    assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position']); assert.ok([...p.array, ...n.array, ...c.array].every(Number.isFinite)); assert.equal(n.count, p.count); assert.equal(c.count, p.count); assert.ok(Array.from(c.array).every(value => value >= 0 && value <= 1));
    for (let i = 0; i < p.count; i++) { const v = point(g, i); assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5); assert.ok(g.boundingBox.distanceToPoint(v) < 1e-7); assert.ok(v.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7); }
    let end = 0; for (const part of g.userData.clCoconutParts) { assert.equal(part.indexStart, end); assert.ok(part.indexCount > 0 && part.indexCount % 3 === 0); end += part.indexCount; } assert.equal(end, g.index.count);
    for (let i = 0; i < g.index.count; i += 3) { const ix = [0, 1, 2].map(j => g.index.getX(i + j)); assert.ok(ix.every(index => Number.isInteger(index) && index >= 0 && index < p.count)); const [a, b, d] = ix.map(index => point(g, index)), cross = b.sub(a).cross(d.sub(a)), normal = new THREE.Vector3(); ix.forEach(index => normal.add(new THREE.Vector3().fromBufferAttribute(n, index))); assert.ok(cross.length() > 1e-10); assert.ok(cross.dot(normal) > 0, 'Visible normals agree with triangle ' + i / 3);
      for (let j = 0; j < 3; j++) { const a = ix[j], b = ix[(j + 1) % 3], key = Math.min(a, b) + ':' + Math.max(a, b), edge = edges.get(key) || { count: 0, winding: 0 }; edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge); }
    }
    assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0), 'The exposed opening has a true wall and floor, not an unclosed shell');
  });

  it('shares rendered triangle boundaries across the cortex, ivory cut edge and bowl', () => {
    const g = fixture().coconuts[0].children[0].geometry, meta = g.userData.clCoconutGeometry;
    function boundary(name) { const part = g.userData.clCoconutParts.find(row => row.name === name); assert.ok(part); const edges = new Map(); for (let i = part.indexStart; i < part.indexStart + part.indexCount; i += 3) for (let j = 0; j < 3; j++) { const a = g.index.getX(i + j), b = g.index.getX(i + (j + 1) % 3), key = Math.min(a, b) + ':' + Math.max(a, b); edges.set(key, (edges.get(key) || 0) + 1); } return edges; }
    for (const [ring, left, right] of [[meta.outerRimRingIndices, 'outer-cortex', 'ivory-cut-edge'], [meta.innerRimRingIndices, 'ivory-cut-edge', 'inner-bowl']]) { assert.ok(ring.length >= 24); const a = boundary(left), b = boundary(right); for (let i = 0; i < ring.length; i++) { const first = ring[i], second = ring[(i + 1) % ring.length], key = Math.min(first, second) + ':' + Math.max(first, second); assert.equal(a.get(key), 1); assert.equal(b.get(key), 1); } }
    const outer = center(g, meta.outerRimRingIndices), inner = center(g, meta.innerRimRingIndices); assert.ok(outer.distanceTo(inner) < .025);
    for (let i = 0; i < meta.innerRimRingIndices.length; i++) { const a = point(g, meta.outerRimRingIndices[i]), b = point(g, meta.innerRimRingIndices[i]); assert.ok(a.distanceTo(b) > .03 && a.distanceTo(b) < .07, 'The pale cut edge has real shell thickness'); }
    const c = g.attributes.color, average = part => { let sum = 0; for (let i = part.vertexStart; i < part.vertexStart + part.vertexCount; i++) sum += c.getX(i) + c.getY(i) + c.getZ(i); return sum / part.vertexCount; };
    const [cortex, edge] = g.userData.clCoconutParts; assert.ok(average(edge) > average(cortex) * 2, 'The cut flesh is distinct from the dark exterior');
  });

  it('has a genuinely open upward bowl and thick wall above a supported floor', () => {
    const root = fixture().coconuts[0], mesh = root.children[0], g = mesh.geometry; root.position.set(0, 0, 0); root.updateMatrixWorld(true);
    for (const [x, z] of [[0, 0], [.10, 0], [-.10, 0], [0, .10], [0, -.10]]) { const hit = new THREE.Raycaster(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0]; assert.ok(hit); assert.ok(hit.point.y < .02 && hit.point.y > -.06, 'Aperture rays reach the deep bowl instead of a pale lid'); }
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)), outside = new THREE.Raycaster(dir.clone().multiplyScalar(1).setY(.17), dir.clone().negate()).intersectObject(mesh)[0], inside = new THREE.Raycaster(new THREE.Vector3(0, .17, 0), dir).intersectObject(mesh)[0]; assert.ok(outside && inside); assert.ok(outside.point.distanceTo(inside.point) > .025); }
    const meta = g.userData.clCoconutGeometry; assert.ok(point(g, meta.bowlFloorVertexIndex).y - point(g, meta.baseVertexIndex).y > .06);
    root.position.y = .12; root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root); assert.ok(Math.abs(box.min.y) < 1e-7); assert.ok(box.max.y < .40); assert.ok(Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) < .37);
  });

  it('keeps independent static buffers and materials under the actual carry and grounded poses', () => {
    const item = fixture(), first = item.coconuts[0], mesh = first.children[0], g = mesh.geometry, before = record(g), attrs = Object.values(g.attributes), index = g.index, versions = attrs.map(attr => attr.version);
    for (const other of item.coconuts.slice(1)) { assert.deepEqual(record(other.children[0].geometry), before); assert.notEqual(other.children[0].geometry, g); assert.notEqual(other.children[0].material, mesh.material); }
    for (let frame = 0; frame < 40; frame++) { first.position.set(Math.sin(frame), -.1, .6); first.rotation.set(0, frame * .17, Math.sin(frame * .3) * .12); first.updateMatrixWorld(true); } first.position.set(28, -4, 0); first.rotation.set(0, 0, 0); first.updateMatrixWorld(true);
    assert.deepEqual(record(g), before); assert.deepEqual(Object.values(g.attributes), attrs); assert.deepEqual(attrs.map(attr => attr.version), versions); assert.equal(g.index, index);
  });

  it('retains the strict ninety-second dropped lifetime and disposes only the expired coconut', () => {
    const item = fixture(), [first, neighbor] = item.coconuts; let expired = 0, other = 0; [first.children[0].geometry, first.children[0].material].forEach(resource => resource.addEventListener('dispose', () => expired++)); [neighbor.children[0].geometry, neighbor.children[0].material].forEach(resource => resource.addEventListener('dispose', () => other++));
    first.userData.state = 'dropped'; first.userData.createdAt = 1000; item.age(90999.9); item.age(91000); assert.equal(first.parent, item.scene); assert.equal(expired, 0); item.age(91000.001); assert.equal(first.parent, null); assert.ok(!item.shelters.includes(first)); assert.equal(expired, 2); assert.equal(other, 0); assert.equal(neighbor.userData.state, 'free'); item.age(200000); assert.equal(expired, 2); assert.equal(other, 0);
  });
});
