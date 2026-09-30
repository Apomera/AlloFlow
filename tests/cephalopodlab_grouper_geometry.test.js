import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('function createCLHuntGrouperGeometry(T,kind,side)'), end = source.indexOf('// ─── Shelter system', start);
assert.ok(start >= 0 && end > start, 'The actual grouper geometry helper and complete constructor must exist');
const construct = new Function('THREE', 'Math', 'var scene=new THREE.Scene();' + source.slice(start, end) + ';return {scene,grouper};');
const allocated = [];
function fixture() {
  const math = Object.assign(Object.create(Math), { random() { throw new Error('Grouper construction must not consume the dive RNG'); } });
  const item = construct(THREE, math); allocated.push(item); return item.grouper;
}
function part(mesh, name) { const result = mesh.geometry.userData.clGrouperParts.find(item => item.name === name); assert.ok(result, mesh.name + ': ' + name); return result; }
function vertices(mesh, section) {
  mesh.updateMatrix(); const p = mesh.geometry.attributes.position;
  return Array.from({ length: section?.vertexCount || p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, (section?.vertexStart || 0) + i).applyMatrix4(mesh.matrix));
}
function triangles(mesh, sections) {
  const points = vertices(mesh), indices = mesh.geometry.index, result = [];
  for (const section of sections || [{ indexStart: 0, indexCount: indices.count }]) for (let i = section.indexStart; i < section.indexStart + section.indexCount; i += 3)
    result.push(new THREE.Triangle(points[indices.getX(i)], points[indices.getX(i + 1)], points[indices.getX(i + 2)]));
  return result;
}
function distance(point, faces) { let best = Infinity; const closest = new THREE.Vector3(); for (const face of faces) { face.closestPointToPoint(point, closest); best = Math.min(best, point.distanceTo(closest)); } return best; }
function unique(points) { const result = []; for (const point of points) if (!result.some(other => point.distanceTo(other) < 1e-6)) result.push(point); return result; }
function surface(mesh, sections) {
  const positions = triangles(mesh, sections).flatMap(face => [...face.a.toArray(), ...face.b.toArray(), ...face.c.toArray()]);
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), object = new THREE.Mesh(geometry, material); object.updateMatrixWorld(true);
  return { object, close() { geometry.dispose(); material.dispose(); } };
}
function inside(point, object) {
  const hits = new THREE.Raycaster(point, new THREE.Vector3(.9123, .1731, .3737).normalize()).intersectObject(object, false), distances = [];
  for (const hit of hits) if (!distances.some(value => Math.abs(value - hit.distance) < 1e-7)) distances.push(hit.distance);
  return distances.some(value => value < 1e-7) || distances.length % 2 === 1;
}
function records(root) { return root.children.map(mesh => ({ name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), attributes: Object.entries(mesh.geometry.attributes).map(([name, value]) => [name, Array.from(value.array)]), index: Array.from(mesh.geometry.index.array), parts: mesh.geometry.userData.clGrouperParts, material: [mesh.material.type, mesh.material.color.toArray(), mesh.material.vertexColors, mesh.material.roughness, mesh.material.side] })); }
afterEach(() => { for (const item of allocated.splice(0)) item.scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); });

describe('Cephalopod Hunter grouper anatomy and visible heading', () => {
  it('retains the exact spawn metadata and four original owned child frames without advancing world randomness', () => {
    const root = fixture();
    assert.deepEqual(root.position.toArray(), [-25, 1.8, -20]);
    assert.deepEqual(root.userData, { state: 'patrol', patrolAngle: 0, patrolTimer: 0, stateTimer: 0, aggroRange: 10, speed: 3.2, cooldownUntil: 0 });
    assert.deepEqual(root.children.map(mesh => mesh.name), ['cl-grouper-body', 'cl-grouper-tail', 'cl-grouper-eye-left', 'cl-grouper-eye-right']);
    assert.deepEqual(root.children.map(mesh => mesh.position.toArray()), [[0, 0, 0], [-1.5, 0, 0], [.9, .25, .35], [.9, -.25, .35]]);
    assert.deepEqual(root.children.map(mesh => mesh.rotation.z), [0, -Math.PI / 2, 0, 0]);
    assert.equal(new Set(root.children.map(mesh => mesh.geometry)).size, 4); assert.equal(new Set(root.children.map(mesh => mesh.material)).size, 4);
    let vertexCount = 0, triangleCount = 0;
    for (const mesh of root.children) {
      assert.ok(mesh.isMesh); assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]); assert.equal(mesh.geometry.groups.length, 0);
      vertexCount += mesh.geometry.attributes.position.count; triangleCount += mesh.geometry.index.count / 3;
      assert.equal(mesh.material.type, 'MeshStandardMaterial'); assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.color.getHex(), 0xffffff);
      assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.opacity, 1); assert.ok(!Object.values(mesh.material).some(value => value?.isTexture));
      const shader = { vertexShader: 'unchanged vertex', fragmentShader: 'unchanged fragment', uniforms: {} }; mesh.material.onBeforeCompile(shader);
      assert.deepEqual(shader, { vertexShader: 'unchanged vertex', fragmentShader: 'unchanged fragment', uniforms: {} });
    }
    assert.ok(vertexCount <= 1600 && triangleCount <= 2600, 'The complete predator must stay within its accepted geometry budget');
  });

  it('uses finite bounded indexed surfaces, unit normals, visible winding and complete semantic spans', () => {
    for (const mesh of fixture().children) {
      const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, color = g.attributes.color;
      assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position']); assert.equal(n.count, p.count); assert.equal(color.count, p.count);
      assert.ok([...p.array, ...n.array, ...color.array].every(Number.isFinite)); assert.ok(Array.from(color.array).every(value => value >= 0 && value <= 1));
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        a.fromBufferAttribute(p, i); assert.ok(g.boundingBox.distanceToPoint(a) < 1e-7); assert.ok(a.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-7);
        assert.ok(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 2e-5, mesh.name + ' unit normal ' + i);
      }
      let vertexEnd = 0, indexEnd = 0;
      for (const section of g.userData.clGrouperParts) {
        assert.equal(section.vertexStart, vertexEnd); assert.equal(section.indexStart, indexEnd); assert.ok(section.vertexCount > 0 && section.indexCount > 0); assert.equal(section.indexCount % 3, 0);
        vertexEnd += section.vertexCount; indexEnd += section.indexCount;
        for (let i = section.indexStart; i < indexEnd; i += 3) {
          const ids = [0, 1, 2].map(offset => g.index.getX(i + offset)); assert.ok(ids.every(id => Number.isInteger(id) && id >= section.vertexStart && id < vertexEnd));
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]).sub(a); c.fromBufferAttribute(p, ids[2]).sub(a); b.cross(c); normal.set(0, 0, 0);
          for (const id of ids) normal.add(new THREE.Vector3().fromBufferAttribute(n, id));
          assert.ok(b.length() > 1e-9, mesh.name + ' collapsed face ' + i / 3); assert.ok(b.dot(normal) > 0, mesh.name + ' visible normal opposes face ' + i / 3);
        }
      }
      assert.equal(vertexEnd, p.count); assert.equal(indexEnd, g.index.count);
    }
  });

  it('joins six fins to actual skin triangles and embeds bilateral gills and dark pupils without floating seams', () => {
    const [body, , left, right] = fixture().children, skin = triangles(body, [part(body, 'skin')]);
    for (const name of ['dorsal', 'anal', 'pectoral-left', 'pectoral-right', 'pelvic-left', 'pelvic-right']) {
      const points = unique(vertices(body, part(body, name))), roots = points.filter(point => distance(point, skin) < 2e-7);
      assert.ok(roots.length >= 3, name + ' needs several attached roots'); assert.ok(new THREE.Box3().setFromPoints(roots).getSize(new THREE.Vector3()).length() > .2);
      assert.ok(points.some(point => distance(point, skin) > .035), name + ' must have an exposed membrane, not just skin vertices');
    }
    for (const name of ['gill-left', 'gill-right']) for (const point of vertices(body, part(body, name))) assert.ok(distance(point, skin) > 0 && distance(point, skin) < .005, name + ' follows the actual body surface');
    for (const eye of [left, right]) {
      const iris = vertices(eye, part(eye, 'iris')), pupil = vertices(eye, part(eye, 'pupil')), joined = unique(iris.filter(point => distance(point, triangles(eye, [part(eye, 'pupil')])) < 2e-7));
      assert.ok(joined.length >= 12, 'The visible iris and pupil meet around a complete ring');
      for (const point of [...iris, ...pupil]) assert.ok(distance(point, skin) < .041 && point.z > .8 && point.y > .15, 'Both eyes must remain attached on the upper forward flanks');
      assert.ok(iris.some(point => distance(point, skin) < .0011));
      const colors = eye.geometry.attributes.color, mean = section => { let sum = 0; for (let i = section.vertexStart; i < section.vertexStart + section.vertexCount; i++) sum += colors.getX(i) + colors.getY(i) + colors.getZ(i); return sum / section.vertexCount; };
      assert.ok(mean(part(eye, 'pupil')) < mean(part(eye, 'iris')) * .25, 'Pupils remain clearly darker than their iris');
    }
  });

  it('has a genuinely recessed closed mouth and a joined tail waist in the actual preserved child transforms', () => {
    const [body, tail] = fixture().children, shellParts = [part(body, 'skin'), part(body, 'mouth-recess')], shell = surface(body, shellParts), peduncle = surface(tail, [part(tail, 'peduncle')]);
    try {
      const mouthHits = new THREE.Raycaster(new THREE.Vector3(0, -.12, 2), new THREE.Vector3(0, 0, -1)).intersectObject(shell.object, false);
      assert.ok(mouthHits.length > 0); assert.ok(mouthHits[0].point.z > 1.1 && mouthHits[0].point.z < 1.25, 'The center ray must enter the mouth before reaching its recessed back');
      const skin = vertices(body, part(body, 'skin')), mouth = vertices(body, part(body, 'mouth-recess'));
      assert.ok(unique(mouth.filter(point => skin.some(other => point.distanceTo(other) < 2e-7))).length >= 20, 'The lip must share the complete actual snout ring');
      const edges = new Map(), key = point => point.toArray().map(value => Math.round(value * 1e6)).join(',');
      for (const face of triangles(body, shellParts)) for (const [a, b] of [[face.a, face.b], [face.b, face.c], [face.c, face.a]]) { const edge = [key(a), key(b)].sort().join('|'); edges.set(edge, (edges.get(edge) || 0) + 1); }
      assert.ok([...edges.values()].every(count => count === 2), 'Position-welded skin and mouth must form a closed physical envelope');
      const waist = vertices(tail, part(tail, 'peduncle')), lead = Math.max(...waist.map(point => point.z)), leadingRing = unique(waist.filter(point => Math.abs(point.z - lead) < 1e-6));
      assert.ok(leadingRing.length >= 16); for (const point of leadingRing) assert.ok(inside(point, shell.object), 'The tail waist must overlap the body across its entire leading section');
      const caudal = unique(vertices(tail, part(tail, 'caudal'))); assert.ok(caudal.some(point => inside(point, peduncle.object)), 'The fan must meet its actual peduncle');
      assert.ok(Math.min(...caudal.map(point => point.z)) < -1.8); assert.ok(Math.max(...skin.map(point => point.z)) > 1.3, '+Z is the anatomical front');
    } finally { shell.close(); peduncle.close(); }
  });

  it('points its actual nose along the production patrol displacement at every cardinal and oblique heading', () => {
    const root = fixture(), patrolStart = source.indexOf('grouper.position.x += Math.sin(gr.patrolAngle)'), patrolEnd = source.indexOf('// Detection:', patrolStart);
    assert.ok(patrolStart >= 0 && patrolEnd > patrolStart); const move = new Function('grouper', 'gr', 'dt', 'now', source.slice(patrolStart, patrolEnd));
    const body = root.children[0], mouth = vertices(body, part(body, 'mouth-recess')), nose = new THREE.Vector3(); for (const point of mouth) nose.add(point); nose.divideScalar(mouth.length);
    const tail = vertices(root.children[1], part(root.children[1], 'peduncle')), rear = new THREE.Vector3(); for (const point of tail) rear.add(point); rear.divideScalar(tail.length);
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .37, 2.2]) {
      root.position.set(0, 1.8, 0); root.rotation.set(0, 0, 0); const before = root.position.clone();
      move(root, { patrolAngle: angle }, .05, 1000); root.updateMatrixWorld(true);
      const displacement = root.position.clone().sub(before); displacement.y = 0; displacement.normalize();
      const heading = nose.clone().applyMatrix4(root.matrixWorld).sub(rear.clone().applyMatrix4(root.matrixWorld)); heading.y = 0; heading.normalize();
      assert.ok(heading.dot(displacement) > .99999, 'The visible grouper must swim nose-first at angle ' + angle);
    }
  });

  it('keeps deterministic buffers and independent resource ownership through poses and teardown', () => {
    const root = fixture(), neighbor = fixture(), before = records(root); assert.deepEqual(before, records(neighbor));
    const identities = root.children.map(mesh => ({ geometry: mesh.geometry, material: mesh.material, index: mesh.geometry.index, attrs: Object.values(mesh.geometry.attributes), versions: [...Object.values(mesh.geometry.attributes), mesh.geometry.index].map(attr => attr.version) }));
    for (let i = 0; i < 24; i++) { root.position.set(Math.sin(i) * 5, 1 + Math.cos(i), i); root.lookAt(new THREE.Vector3(i - 2, 1.4, i + 4)); root.updateMatrixWorld(true); }
    assert.deepEqual(records(root), before);
    root.children.forEach((mesh, i) => { assert.equal(mesh.geometry, identities[i].geometry); assert.equal(mesh.material, identities[i].material); assert.equal(mesh.geometry.index, identities[i].index); assert.deepEqual(Object.values(mesh.geometry.attributes), identities[i].attrs); assert.deepEqual([...Object.values(mesh.geometry.attributes), mesh.geometry.index].map(attr => attr.version), identities[i].versions); });
    const disposed = [], survivor = []; root.children.forEach(mesh => { mesh.geometry.addEventListener('dispose', () => disposed.push(mesh.geometry)); mesh.material.addEventListener('dispose', () => disposed.push(mesh.material)); });
    neighbor.children.forEach(mesh => { mesh.geometry.addEventListener('dispose', () => survivor.push(mesh.geometry)); mesh.material.addEventListener('dispose', () => survivor.push(mesh.material)); });
    root.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); root.parent.remove(root);
    assert.equal(disposed.length, 8); assert.equal(new Set(disposed).size, 8); assert.deepEqual(survivor, []); assert.deepEqual(records(neighbor), before);
  });
});
