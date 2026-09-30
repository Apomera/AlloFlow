import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('function createCLHuntFish('), end = source.indexOf('\n}\n', start) + 3;
if (start < 0 || end <= start) throw new Error('Actual prey-fish factory was not found');
const math = Object.assign(Object.create(Math), { random() { throw new Error('Prey geometry consumed the dive random stream'); } });
const build = new Function('T', 'index', 'Math', source.slice(start, end) + ';return createCLHuntFish(T,index);');
const allocated = [], hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fish(index = 0) { const result = build(THREE, index, math); allocated.push(result); return result; }
function meshes(root) { const all = []; root.traverse(object => { if (object.isMesh) all.push(object); }); return all; }
function part(mesh, name) {
  const found = mesh.geometry.userData.clFishParts?.find(item => item.name === name);
  if (!found) throw new Error('Missing merged fish surface: ' + name);
  return found;
}
function points(mesh, name) {
  if (name === 'caudal') return ['caudal-lower', 'caudal-upper'].flatMap(section => points(mesh, section));
  const { start, count } = part(mesh, name), positions = mesh.geometry.attributes.position;
  return Array.from({ length: count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, start + index));
}
function center(vertices) { return vertices.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / vertices.length); }
function triangles(mesh, name) {
  const vertices = points(mesh, name), result = [];
  for (let i = 0; i < vertices.length; i += 3) result.push(new THREE.Triangle(vertices[i], vertices[i + 1], vertices[i + 2]));
  return result;
}
function distanceToSkin(point, skin) {
  const closest = new THREE.Vector3(); let distance = Infinity;
  for (const triangle of skin) { triangle.closestPointToPoint(point, closest); distance = Math.min(distance, closest.distanceTo(point)); }
  return distance;
}
function records(root) {
  return meshes(root).map(mesh => ({ name: mesh.name, attributes: Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)]),
    index: mesh.geometry.index && Array.from(mesh.geometry.index.array), parts: mesh.geometry.userData.clFishParts,
    material: [mesh.material.type, mesh.material.color.toArray(), mesh.material.roughness, mesh.material.metalness, mesh.material.side, mesh.material.vertexColors] }));
}
afterEach(() => {
  for (const root of allocated.splice(0)) {
    const geometries = new Set(), materials = new Set();
    meshes(root).forEach(mesh => { geometries.add(mesh.geometry); materials.add(mesh.material); });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  }
});

describe('Cephalopod Hunter silver schooling prey', () => {
  it('builds two finite render surfaces with one owned material and bounded geometry for every school index', () => {
    expect(THREE.REVISION).toBe('128');
    for (let index = 0; index < 8; index++) {
      const root = fish(index), all = meshes(root);
      expect(root.isGroup).toBe(true); expect(root.name).toBe('cl-prey-fish'); expect(root.rotation.order).toBe('YXZ');
      expect(all.map(mesh => mesh.name)).toEqual(['cl-fish-body', 'cl-fish-tail']); expect(new Set(all.map(mesh => mesh.material)).size).toBe(1);
      expect(root.userData.tail).toBe(all[1]); expect(root.userData.swimPhase).toBe(index * 1.7);
      expect(all[1].position.toArray()).toEqual([0, 0, -.185]);
      const vertices = all.reduce((count, mesh) => count + mesh.geometry.attributes.position.count, 0);
      expect(vertices).toBeLessThanOrEqual(2500); expect(vertices / 3).toBeLessThanOrEqual(850);
      for (const mesh of all) {
        const geometry = mesh.geometry, p = geometry.attributes.position, n = geometry.attributes.normal, c = geometry.attributes.color;
        expect(geometry.index).toBe(null); expect(geometry.groups).toHaveLength(0); expect(n.count).toBe(p.count); expect(c.count).toBe(p.count);
        expect(geometry.boundingBox).not.toBe(null); expect(geometry.boundingSphere).not.toBe(null);
        assert.ok([...p.array, ...n.array, ...c.array].every(Number.isFinite));
        assert.ok(Array.from(c.array).every(value => value >= 0 && value <= 1));
        let next = 0;
        for (const section of geometry.userData.clFishParts) { expect(section.start).toBe(next); expect(section.count % 3).toBe(0); expect(section.count).toBeGreaterThan(0); next += section.count; }
        expect(next).toBe(p.count);
        const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), normal = new THREE.Vector3();
        for (let vertex = 0; vertex < p.count; vertex++) {
          assert.ok(Math.abs(Math.hypot(n.getX(vertex), n.getY(vertex), n.getZ(vertex)) - 1) < 1e-5, mesh.name + ' normal ' + vertex);
          a.fromBufferAttribute(p, vertex); assert.ok(geometry.boundingBox.distanceToPoint(a) < 1e-7); assert.ok(a.distanceTo(geometry.boundingSphere.center) <= geometry.boundingSphere.radius + 1e-7);
        }
        for (let vertex = 0; vertex < p.count; vertex += 3) {
          a.fromBufferAttribute(p, vertex); b.fromBufferAttribute(p, vertex + 1); d.fromBufferAttribute(p, vertex + 2);
          b.sub(a).cross(d.sub(a)); normal.fromBufferAttribute(n, vertex).add(new THREE.Vector3().fromBufferAttribute(n, vertex + 1)).add(new THREE.Vector3().fromBufferAttribute(n, vertex + 2));
          assert.ok(b.lengthSq() > 1e-16, mesh.name + ' collapsed face ' + vertex / 3); assert.ok(b.dot(normal) > 0, mesh.name + ' reversed face ' + vertex / 3);
        }
      }
    }
  });

  it('keeps a forward nose, bilateral eyes and a bright lateral silver band with a darker back', () => {
    const root = fish(), body = root.getObjectByName('cl-fish-body'), tail = root.userData.tail;
    const skin = points(body, 'skin'), bounds = new THREE.Box3().setFromPoints(skin), size = bounds.getSize(new THREE.Vector3());
    expect(size.z).toBeGreaterThan(size.x * 2); expect(size.z).toBeGreaterThan(size.y * 1.5);
    for (const [side, sign] of [['left', -1], ['right', 1]]) {
      const eye = center(points(body, 'pupil-' + side));
      expect(eye.x * sign).toBeGreaterThan(0); expect(eye.z).toBeGreaterThan(bounds.getCenter(new THREE.Vector3()).z + .05);
    }
    tail.updateMatrix(); const caudal = points(tail, 'caudal').map(point => point.applyMatrix4(tail.matrix));
    expect(center(caudal).z).toBeLessThan(bounds.getCenter(new THREE.Vector3()).z - .15);
    const { start, count } = part(body, 'skin'), p = body.geometry.attributes.position, colors = body.geometry.attributes.color;
    const dorsal = [], flank = [];
    for (let vertex = start; vertex < start + count; vertex++) {
      if (Math.abs(p.getZ(vertex)) > .12) continue;
      const luminance = .2126 * colors.getX(vertex) + .7152 * colors.getY(vertex) + .0722 * colors.getZ(vertex);
      if (p.getY(vertex) > .04) dorsal.push(luminance);
      if (Math.abs(p.getY(vertex)) < .022 && Math.abs(p.getX(vertex)) > .025) flank.push(luminance);
    }
    expect(dorsal.length).toBeGreaterThan(0); expect(flank.length).toBeGreaterThan(0);
    const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean(flank)).toBeGreaterThan(mean(dorsal) + .1);
    const material = body.material;
    expect(material.type).toBe('MeshStandardMaterial'); expect(material.vertexColors).toBe(true); expect(material.transparent).toBe(false); expect(material.opacity).toBe(1);
    expect(material.emissive.getHex()).toBe(0); expect(Object.values(material).some(value => value?.isTexture)).toBe(false);
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
    material.onBeforeCompile(shader, { capabilities: { isWebGL2: true } });
    expect(shader.vertexShader).toBe(THREE.ShaderLib.standard.vertexShader); expect(shader.fragmentShader).toBe(THREE.ShaderLib.standard.fragmentShader); expect(shader.uniforms).toEqual({});
  });

  it('joins each visible fin and eye patch to the actual triangulated body without detached ornament', () => {
    const body = fish().getObjectByName('cl-fish-body'), skin = triangles(body, 'skin');
    const finNames = ['dorsal-front', 'dorsal-rear', 'anal', 'pectoral-left', 'pectoral-right', 'pelvic-left', 'pelvic-right'];
    for (const name of finNames) {
      const vertices = points(body, name), attached = vertices.filter(point => distanceToSkin(point, skin) < .00002);
      expect(attached.length, name).toBeGreaterThanOrEqual(2);
      expect(Math.max(...attached.map(point => point.distanceTo(attached[0]))), name + ' attachment span').toBeGreaterThan(.005);
      expect(Math.max(...vertices.map(point => distanceToSkin(point, skin))), name + ' membrane silhouette').toBeGreaterThan(.005);
    }
    const front = new THREE.Box3().setFromPoints(points(body, 'dorsal-front')), rear = new THREE.Box3().setFromPoints(points(body, 'dorsal-rear'));
    expect(front.min.z).toBeGreaterThan(rear.max.z);
    for (const side of ['left', 'right']) for (const kind of ['iris', 'pupil']) {
      const distances = points(body, kind + '-' + side).map(point => distanceToSkin(point, skin));
      expect(Math.max(...distances), kind + '-' + side + ' relief').toBeLessThan(.008);
    }
  });

  it('keeps the real tail waist inside the body through the full live yaw range and leaves a true caudal fork', () => {
    const root = fish(), body = root.getObjectByName('cl-fish-body'), tail = root.userData.tail;
    const skinPart = part(body, 'skin'), skinGeometry = new THREE.BufferGeometry();
    skinGeometry.setAttribute('position', new THREE.Float32BufferAttribute(body.geometry.attributes.position.array.slice(skinPart.start * 3, (skinPart.start + skinPart.count) * 3), 3));
    const skinMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), skinMesh = new THREE.Mesh(skinGeometry, skinMaterial);
    const waist = [], vertices = points(tail, 'peduncle');
    function add(point) { if (!waist.some(prior => prior.distanceToSquared(point) < 1e-16)) waist.push(point); }
    for (let i = 0; i < vertices.length; i += 3) for (let edge = 0; edge < 3; edge++) {
      const a = vertices[i + edge], b = vertices[i + (edge + 1) % 3];
      if (Math.abs(a.z) < 1e-8) add(a.clone());
      if (a.z * b.z < 0) add(a.clone().lerp(b, -a.z / (b.z - a.z)));
    }
    expect(waist.length).toBeGreaterThanOrEqual(6);
    try {
      skinMesh.updateMatrixWorld(true);
      const directions = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
      for (const yaw of [-.36, -.22, 0, .22, .36]) {
        tail.rotation.y = yaw; tail.updateMatrix();
        for (const vertex of waist) for (const direction of directions) {
          const point = vertex.clone().applyMatrix4(tail.matrix), hits = new THREE.Raycaster(point, direction, .000001, 1).intersectObject(skinMesh, false);
          expect(hits.length, 'tail/body overlap at yaw ' + yaw).toBeGreaterThan(0);
        }
      }
      const caudal = points(tail, 'caudal'), maxY = Math.max(...caudal.map(point => Math.abs(point.y)));
      const tips = caudal.filter(point => Math.abs(point.y) > maxY * .8), centerline = caudal.filter(point => Math.abs(point.y) < maxY * .2);
      expect(tips.some(point => point.y > 0) && tips.some(point => point.y < 0)).toBe(true); expect(centerline.length).toBeGreaterThan(0);
      expect(Math.min(...centerline.map(point => point.z))).toBeGreaterThan(Math.min(...tips.map(point => point.z)) + .025);
      // The short leading attachment may overlap the body; the trailing and
      // vertical silhouette must stay within the previous tail envelope.
      expect(Math.min(...caudal.map(point => point.z))).toBeGreaterThanOrEqual(-.180001);
      expect(maxY).toBeLessThanOrEqual(.130001);
    } finally { skinGeometry.dispose(); skinMaterial.dispose(); }
  });

  it('constructs deterministically without shared buffers and keeps all resources static as the rig turns and swims', () => {
    const first = fish(3), second = fish(3), all = meshes(first), other = meshes(second), before = hash(records(first));
    expect(hash(records(second))).toBe(before);
    const saved = all.map(mesh => ({ mesh, geometry: mesh.geometry, material: mesh.material,
      attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, { attr, array: attr.array, version: attr.version }])) }));
    expect(other.every(mesh => !all.some(prior => prior.geometry === mesh.geometry || prior.material === mesh.material))).toBe(true);
    for (let frame = 0; frame < 32; frame++) {
      first.position.set(frame * .1, 4 + Math.sin(frame * .2), -7); first.rotation.set(.1 * Math.sin(frame), frame * .17, .12 * Math.cos(frame), 'YXZ'); first.userData.tail.rotation.y = .36 * Math.sin(frame * .7); first.updateMatrixWorld(true);
      expect(all.every(mesh => mesh.matrixWorld.elements.every(Number.isFinite))).toBe(true);
      for (const owned of saved) {
        expect(owned.mesh.geometry).toBe(owned.geometry); expect(owned.mesh.material).toBe(owned.material);
        for (const [name, prior] of Object.entries(owned.attributes)) { expect(owned.geometry.attributes[name]).toBe(prior.attr); expect(prior.attr.array).toBe(prior.array); expect(prior.attr.version).toBe(prior.version); }
      }
    }
    expect(hash(records(first))).toBe(before);
  });

  it('owns exactly two geometries and one material whose disposal leaves another fish usable', () => {
    const first = meshes(fish()), second = meshes(fish()), owned = new Set(first.flatMap(mesh => [mesh.geometry, mesh.material])), neighbor = new Set(second.flatMap(mesh => [mesh.geometry, mesh.material]));
    expect(owned.size).toBe(3); expect(neighbor.size).toBe(3);
    const disposed = new Set(), neighborDisposed = new Set();
    owned.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource)));
    neighbor.forEach(resource => resource.addEventListener('dispose', () => neighborDisposed.add(resource)));
    owned.forEach(resource => resource.dispose()); expect(disposed.size).toBe(3); expect(neighborDisposed.size).toBe(0);
    expect(second.every(mesh => mesh.geometry.attributes.position.array.every(Number.isFinite))).toBe(true);
  });
});
