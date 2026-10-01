import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(a, b) { const start = source.indexOf(a), end = source.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return source.slice(start, end); }
const build = new Function('THREE', 'Math', '__alloT', 'var scene=new THREE.Scene();' + region('var SHELTER_PICKUP_RANGE =', '// ─── Audio (synthesized') + ';return{scene,shelters,types:SHELTER_TYPES,make:makeBottleMesh,age:function(now){' + region('// Age dropped shelters', '// Treat dropped + static shelters') + '}};');
const fixtures = [];
function fixture() { const draws = [], math = Object.assign(Object.create(Math), { random() { const value = .72 + ((draws.length * 17) % 20) / 100; draws.push(value); return value; } }); const item = build(THREE, math, (_key, fallback) => fallback); fixtures.push(item); return { ...item, math, draws, bottles: item.shelters.filter(root => root.userData.shelterType === 'bottle') }; }
const point = (g, i) => new THREE.Vector3().fromBufferAttribute(g.attributes.position, i);
const record = g => ({ attrs: Object.entries(g.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(g.index.array) });
afterEach(() => { for (const item of fixtures.splice(0)) { const resources = new Set(); item.scene.traverse(o => { if (o.geometry) resources.add(o.geometry); if (o.material) resources.add(o.material); }); resources.forEach(resource => resource.dispose()); } });

describe('Cephalopod Hunter open glass bottle shelter', () => {
  it('preserves three real actors, ordered spawn draws and original sideways frame with two owned material slots', () => {
    const item = fixture(); assert.equal(item.shelters.length, 12); assert.equal(item.bottles.length, 3); assert.equal(item.draws.length, 36);
    item.bottles.forEach((root, offset) => { const d = item.draws.slice((4 + offset) * 3, (4 + offset) * 3 + 3); assert.deepEqual(root.position.toArray(), [(d[0] - .5) * 110, .32, (d[1] - .5) * 110]); assert.deepEqual(root.userData, { shelterType: 'bottle', state: 'free', createdAt: 0, wobble: d[2] * Math.PI * 2 }); assert.deepEqual(root.rotation.toArray(), [0, 0, Math.PI / 2, 'XYZ']); assert.deepEqual(root.children.map(m => m.name), ['cl-glass-bottle-wall', 'cl-glass-bottle-finish']);
      assert.equal(new Set(root.children.map(m => m.material)).size, 2); assert.equal(new Set(root.children.map(m => m.geometry)).size, 2); let vertices = 0, triangles = 0;
      root.children.forEach(mesh => { assert.deepEqual(mesh.position.toArray(), [0, 0, 0]); assert.deepEqual(mesh.rotation.toArray(), [0, 0, 0, 'XYZ']); assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]); const mat = mesh.material; assert.equal(mat.type, 'MeshStandardMaterial'); assert.equal(mat.color.getHex(), 0xffffff); assert.equal(mat.vertexColors, true); assert.equal(mat.metalness, 0); assert.ok(!Object.values(mat).some(v => v?.isTexture)); assert.equal(mesh.geometry.groups.length, 0); vertices += mesh.geometry.attributes.position.count; triangles += mesh.geometry.index.count / 3; const shader = { uniforms: {}, vertexShader: 'v', fragmentShader: 'f' }; mat.onBeforeCompile(shader); assert.deepEqual(shader, { uniforms: {}, vertexShader: 'v', fragmentShader: 'f' }); });
      assert.ok(vertices <= 1600 && triangles <= 2800); const [glass, finish] = root.children.map(m => m.material); assert.equal(glass.transparent, true); assert.equal(glass.opacity, .38); assert.equal(glass.depthWrite, false); assert.equal(glass.side, THREE.DoubleSide); assert.equal(finish.transparent, false); assert.equal(finish.opacity, 1); assert.equal(finish.depthWrite, true); assert.equal(finish.side, THREE.FrontSide);
    });
    assert.equal(item.types.bottle.carriable, true); assert.equal(item.types.bottle.camoBonus, .2); assert.equal(item.types.bottle.speedPenalty, .05); assert.equal(item.types.bottle.dropLifeMs, 120000);
    item.math.random = () => { throw new Error('Bottle geometry must not consume dive randomness'); }; const copy = item.make(); copy.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  });

  it('makes a physically closed combined wall with no overlapping triangles, noncollapsed faces and finite unit normals', () => {
    const root = fixture().bottles[0], welded = new Map(), edges = new Map(), faces = new Set();
    for (const mesh of root.children) { const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, ids = []; assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position']); assert.ok([...p.array, ...n.array, ...c.array].every(Number.isFinite)); assert.equal(n.count, p.count); assert.equal(c.count, p.count); assert.ok(Array.from(c.array).every(v => v >= 0 && v <= 1));
      for (let i = 0; i < p.count; i++) { const v = point(g, i), key = v.toArray().map(value => value.toFixed(6)).join(','); if (!welded.has(key)) welded.set(key, welded.size); ids.push(welded.get(key)); assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5); assert.ok(g.boundingBox.distanceToPoint(v) < 1e-7); assert.ok(v.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7); assert.ok(c.getY(i) > c.getX(i) && c.getY(i) > c.getZ(i), 'The rendered vertex pigment remains green glass'); }
      let end = 0; for (const part of g.userData.clBottleParts) { assert.equal(part.start, end); assert.ok(part.count > 0 && part.count % 3 === 0); end += part.count; } assert.equal(end, g.index.count);
      for (let i = 0; i < g.index.count; i += 3) { const ix = [0, 1, 2].map(j => g.index.getX(i + j)); assert.ok(ix.every(index => Number.isInteger(index) && index >= 0 && index < p.count)); const [a, b, d] = ix.map(index => point(g, index)), cross = b.sub(a).cross(d.sub(a)), normal = new THREE.Vector3(); ix.forEach(index => normal.add(new THREE.Vector3().fromBufferAttribute(n, index))); assert.ok(cross.length() > 1e-10); assert.ok(cross.dot(normal) > 0, mesh.name + ' visible normals agree with triangle ' + i / 3); const face = ix.map(index => ids[index]).sort((a, b) => a - b).join(':'); assert.ok(!faces.has(face), 'Transparent and opaque partitions must not overlap physical faces'); faces.add(face);
        for (let j = 0; j < 3; j++) { const a = ids[ix[j]], b = ids[ix[(j + 1) % 3]], key = Math.min(a, b) + ':' + Math.max(a, b), edge = edges.get(key) || { count: 0, winding: 0 }; edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge); }
      }
    }
    assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0), 'Both material partitions join into a physically closed thick glass shell');
  });

  it('joins actual triangle edges at every glass/finish boundary without a gap or duplicated face', () => {
    const [wall, finish] = fixture().bottles[0].children.map(m => m.geometry), sides = wall.userData.clBottleVisual.sides;
    function edges(g) { const result = new Map(); for (let i = 0; i < g.index.count; i += 3) for (let j = 0; j < 3; j++) { const a = g.index.getX(i + j), b = g.index.getX(i + (j + 1) % 3), key = Math.min(a, b) + ':' + Math.max(a, b); result.set(key, (result.get(key) || 0) + 1); } return result; }
    const wallEdges = edges(wall), finishEdges = edges(finish);
    for (const row of [3, 17, 25, 39]) { const a = wall.userData.clBottleVisual.profileToRing[row], b = finish.userData.clBottleVisual.profileToRing[row]; assert.ok(Number.isInteger(a) && Number.isInteger(b)); for (let side = 0; side < sides; side++) { assert.deepEqual(point(wall, a + side).toArray(), point(finish, b + side).toArray()); const next = (side + 1) % sides, key = first => Math.min(first + side, first + next) + ':' + Math.max(first + side, first + next); assert.equal(wallEdges.get(key(a)), 1); assert.equal(finishEdges.get(key(b)), 1); } }
  });

  it('leaves a real open neck leading to the deep floor with nonzero body, neck and base thickness', () => {
    const root = fixture().bottles[0]; root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.updateMatrixWorld(true);
    for (const [x, z] of [[0, 0], [.03, 0], [-.03, 0], [0, .03], [0, -.03]]) { const hit = new THREE.Raycaster(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0)).intersectObject(root, true)[0]; assert.ok(hit); assert.ok(hit.point.y < -.27 && hit.point.y > -.29, 'A real aperture ray reaches the deep floor, not a cap or surface patch'); }
    const up = new THREE.Raycaster(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)).intersectObject(root, true)[0], down = new THREE.Raycaster(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0)).intersectObject(root, true)[0]; assert.ok(up && down); assert.ok(down.point.y - up.point.y > .04 && down.point.y - up.point.y < .05);
    for (const y of [0, .49]) for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)), outer = new THREE.Raycaster(direction.clone().setY(y), direction.clone().negate()).intersectObject(root, true)[0], inner = new THREE.Raycaster(new THREE.Vector3(0, y, 0), direction).intersectObject(root, true)[0]; assert.ok(outer && inner); assert.ok(outer.point.distanceTo(inner.point) > (y === 0 ? .01 : .007)); }
  });

  it('keeps the original envelope and exposed mouth in the unchanged sideways grounding pose', () => {
    const root = fixture().bottles[0], local = new THREE.Box3(); root.rotation.set(0, 0, 0); root.position.set(0, 0, 0); root.updateMatrixWorld(true); local.setFromObject(root); assert.ok(local.min.y >= -.3250001 && local.max.y <= .6200001); assert.ok(Math.max(Math.abs(local.min.x), Math.abs(local.max.x), Math.abs(local.min.z), Math.abs(local.max.z)) <= .2200001);
    root.rotation.z = Math.PI / 2; root.position.y = .12; root.updateMatrixWorld(true); const world = new THREE.Box3().setFromObject(root); assert.ok(world.min.y >= -.1000001 && world.max.y <= .3400001, 'Keep the existing partly buried body rather than silently changing shelter placement'); const finish = root.children[1], g = finish.geometry, meta = g.userData.clBottleVisual;
    for (let side = 0; side < meta.sides; side++) assert.ok(point(g, meta.landmarks.rimInnerRing + side).applyMatrix4(finish.matrixWorld).y > .04, 'The sideways mouth remains clear of a flat seabed');
    const origin = new THREE.Vector3(0, 1, 0).applyMatrix4(root.matrixWorld), direction = new THREE.Vector3(0, -1, 0).transformDirection(root.matrixWorld), hit = new THREE.Raycaster(origin, direction).intersectObject(root, true)[0]; assert.ok(hit && hit.distance > 1.27);
  });

  it('keeps static independently owned resources and the strict two-minute expiry without disposing neighbors', () => {
    const item = fixture(), [first, neighbor] = item.bottles, before = first.children.map(m => record(m.geometry)), owned = first.children.map(m => ({ mesh: m, geometry: m.geometry, material: m.material, attrs: Object.values(m.geometry.attributes), arrays: Object.values(m.geometry.attributes).map(a => a.array), versions: Object.values(m.geometry.attributes).map(a => a.version), index: m.geometry.index }));
    item.bottles.slice(1).forEach(root => root.children.forEach((m, i) => { assert.deepEqual(record(m.geometry), before[i]); assert.notEqual(m.geometry, owned[i].geometry); assert.notEqual(m.material, owned[i].material); }));
    for (let frame = 0; frame < 40; frame++) { first.position.set(0, -.1, .6); first.rotation.set(0, 0, Math.sin(frame * .3) * .12); first.updateMatrixWorld(true); } first.rotation.set(0, 0, Math.PI / 2);
    owned.forEach((r, i) => { assert.equal(r.mesh.geometry, r.geometry); assert.equal(r.mesh.material, r.material); assert.deepEqual(record(r.geometry), before[i]); assert.deepEqual(Object.values(r.geometry.attributes), r.attrs); assert.deepEqual(Object.values(r.geometry.attributes).map(a => a.array), r.arrays); assert.deepEqual(Object.values(r.geometry.attributes).map(a => a.version), r.versions); assert.equal(r.geometry.index, r.index); });
    let expired = 0, other = 0; first.children.forEach(m => [m.geometry, m.material].forEach(r => r.addEventListener('dispose', () => expired++))); neighbor.children.forEach(m => [m.geometry, m.material].forEach(r => r.addEventListener('dispose', () => other++)));
    first.userData.state = 'dropped'; first.userData.createdAt = 1000; item.age(120999.9); item.age(121000); assert.equal(first.parent, item.scene); assert.equal(expired, 0); item.age(121000.001); assert.equal(first.parent, null); assert.ok(!item.shelters.includes(first)); assert.equal(expired, 4); assert.equal(other, 0); assert.equal(neighbor.userData.state, 'free'); item.age(300000); assert.equal(expired, 4); assert.equal(other, 0);
  });
});
