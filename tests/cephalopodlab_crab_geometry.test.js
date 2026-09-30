import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('var CRAB_TYPES = {'), end = source.indexOf('// Seed with mix:', start);
assert.ok(start >= 0 && end > start, 'The actual crab factory must exist');
const construct = new Function('THREE', 'Math', 'var scene=new THREE.Scene(),octopus={position:new THREE.Vector3(10,.55,-8)};' + source.slice(start, end) + ';return {scene,crabs,types:CRAB_TYPES,spawn:spawnCrab};');
const allocated = [];
function fixture() {
  const draws = [], sequence = [.125, .25, .375, .5], math = Object.assign(Object.create(Math), { random() { const value = sequence[draws.length % sequence.length]; draws.push(value); return value; } });
  const result = construct(THREE, math); allocated.push(result); return { ...result, draws };
}
function records(crab) {
  return crab.children.map(mesh => ({ name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(),
    attributes: Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(mesh.geometry.index.array), parts: mesh.geometry.userData.clCrabParts,
    material: [mesh.material.type, mesh.material.color.toArray(), mesh.material.roughness, mesh.material.vertexColors] }));
}
function points(mesh, section) {
  const p = mesh.geometry.attributes.position, index = mesh.geometry.index, result = [];
  const first = section?.indexStart || 0, count = section?.indexCount || index.count;
  mesh.updateMatrix();
  for (let i = first; i < first + count; i++) result.push(new THREE.Vector3().fromBufferAttribute(p, index.getX(i)).applyMatrix4(mesh.matrix));
  return result;
}
function triangles(mesh, section) { const vertices = points(mesh, section), result = []; for (let i = 0; i < vertices.length; i += 3) result.push(new THREE.Triangle(vertices[i], vertices[i + 1], vertices[i + 2])); return result; }
function distance(point, surface) { const closest = new THREE.Vector3(); let best = Infinity; for (const face of surface) { face.closestPointToPoint(point, closest); best = Math.min(best, closest.distanceTo(point)); } return best; }
function part(mesh, name) { const section = mesh.geometry.userData.clCrabParts.find(item => item.name === name); assert.ok(section, mesh.name + ': ' + name); return section; }
function surface(mesh, section) {
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', mesh.geometry.attributes.position);
  geometry.setIndex(Array.from(mesh.geometry.index.array.slice(section?.indexStart || 0, section ? section.indexStart + section.indexCount : undefined)));
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), object = new THREE.Mesh(geometry, material);
  object.position.copy(mesh.position); object.rotation.copy(mesh.rotation); object.scale.copy(mesh.scale); object.updateMatrixWorld(true);
  return { object, close() { geometry.dispose(); material.dispose(); } };
}
function inside(point, object) {
  const direction = new THREE.Vector3(.9123, .1731, .3737).normalize(), hits = new THREE.Raycaster(point, direction).intersectObject(object, false), distances = [];
  for (const hit of hits) if (!distances.some(value => Math.abs(value - hit.distance) < 1e-7)) distances.push(hit.distance);
  return distances.some(value => value < 1e-7) || distances.length % 2 === 1;
}
function capRing(mesh, contactName) {
  const contact = mesh.geometry.userData.clCrabGeometry.contacts.find(item => item.name === contactName); assert.ok(contact, mesh.name + ': ' + contactName);
  mesh.updateMatrix(); const target = new THREE.Vector3().fromArray(contact.point), p = mesh.geometry.attributes.position; let closest = -1, best = Infinity;
  for (let vertex = 0; vertex < p.count; vertex++) { const d = new THREE.Vector3().fromBufferAttribute(p, vertex).applyMatrix4(mesh.matrix).distanceTo(target); if (d < best) { best = d; closest = vertex; } }
  assert.ok(best < 2e-7, 'The contact is an actual cap vertex, not detached test metadata');
  const vertices = new Set([closest]), indices = mesh.geometry.index;
  for (let at = 0; at < indices.count; at += 3) { const ids = [0, 1, 2].map(offset => indices.getX(at + offset)); if (ids.includes(closest)) ids.forEach(index => vertices.add(index)); }
  assert.ok(vertices.size >= 7); return [...vertices];
}
afterEach(() => {
  for (const item of allocated.splice(0)) item.scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); });
});

describe('Cephalopod Hunter articulated crab prey', () => {
  it('preserves the exact four-draw spawn contract, gameplay metadata and eleven/fifteen animated child slots', () => {
    const item = fixture(), expected = {
      rock: { score: 2, hunger: 40, fleeMul: 1, sizeMul: 1, speed: .8, dropShelter: null },
      red: { score: 3, hunger: 46, fleeMul: 1.5, sizeMul: 1.15, speed: .96, dropShelter: null },
      hermit: { score: 2, hunger: 32, fleeMul: .55, sizeMul: .9, speed: .48, dropShelter: 'conch' },
    };
    for (const request of ['rock', 'red', 'hermit', 'unknown']) {
      const before = item.draws.length, crab = item.spawn(request), type = request === 'unknown' ? 'rock' : request, cfg = expected[type], sm = cfg.sizeMul;
      assert.equal(item.draws.length - before, 4, 'Procedural geometry must not advance world randomness'); assert.deepEqual(item.draws.slice(before), [.125, .25, .375, .5]);
      assert.equal(crab.parent, item.scene); assert.equal(crab.userData.type, type); assert.equal(crab.userData.cfg, item.types[type]);
      for (const key of ['score', 'hunger', 'fleeMul', 'sizeMul', 'dropShelter']) assert.equal(crab.userData.cfg[key], cfg[key]);
      assert.deepEqual(crab.position.toArray(), [10 + Math.sin(Math.PI / 4) * 50, .18, -8 + Math.cos(Math.PI / 4) * 50]);
      assert.equal(crab.userData.wanderAngle, Math.PI * .75); assert.equal(crab.userData.wanderTimer, 0); assert.ok(Math.abs(crab.userData.speed - cfg.speed) < 1e-15);
      assert.equal(crab.userData.alive, true); assert.equal(crab.userData.legPhase, 0); assert.equal(crab.userData.hypnotized, 0);
      assert.equal(crab.children.length, type === 'hermit' ? 15 : 11); assert.ok(crab.children.every(mesh => mesh.isMesh));
      assert.deepEqual(crab.children.slice(0, 11).map(mesh => mesh.name), ['cl-crab-body', 'cl-crab-eye-0', 'cl-crab-eye-1', ...Array.from({ length: 6 }, (_, i) => 'cl-crab-leg-' + i), 'cl-crab-claw-0', 'cl-crab-claw-1']);
      assert.deepEqual(crab.children[0].position.toArray(), [0, 0, 0]);
      for (let eye = 0; eye < 2; eye++) assert.deepEqual(crab.children[eye + 1].position.toArray(), [(eye ? 1 : -1) * .12 * sm, .13 * sm, .18 * sm]);
      for (let leg = 0; leg < 6; leg++) {
        const side = leg % 2 ? 1 : -1, row = ((leg / 2) | 0) - 1, mesh = crab.children[leg + 3];
        assert.deepEqual(mesh.position.toArray(), [side * .28 * sm, -.05, row * .16 * sm]); assert.equal(mesh.rotation.z, side * .9);
      }
      for (let claw = 0; claw < 2; claw++) assert.deepEqual(crab.children[claw + 9].position.toArray(), [(claw ? 1 : -1) * .32 * sm, 0, .22 * sm]);
      if (type === 'hermit') {
        assert.deepEqual(crab.children.slice(11).map(mesh => mesh.name), ['cl-hermit-shell-outer', 'cl-hermit-shell-interior', 'cl-hermit-shell-lip', 'cl-hermit-shell-spire']);
        assert.deepEqual(crab.children[11].position.toArray(), [0, .18, -.05]); assert.deepEqual(crab.children[11].scale.toArray(), [1, .85, 1.2]);
        for (let i = 0; i < 3; i++) { assert.deepEqual(crab.children[12 + i].position.toArray(), [0, .12 + i * .06, -.05]); assert.equal(crab.children[12 + i].rotation.x, Math.PI / 2); }
      }
    }
  });

  it('constructs finite consistently wound indexed anatomy with unit normals, closed part spans and texture-free owned colors', () => {
    const item = fixture();
    for (const type of ['rock', 'red', 'hermit']) {
      const crab = item.spawn(type);
      for (const mesh of crab.children) {
        const geometry = mesh.geometry, p = geometry.attributes.position, n = geometry.attributes.normal, color = geometry.attributes.color;
        assert.deepEqual(Object.keys(geometry.attributes).sort(), ['color', 'normal', 'position']); assert.equal(n.count, p.count); assert.equal(color.count, p.count); assert.equal(geometry.groups.length, 0);
        assert.ok([...p.array, ...n.array, ...color.array].every(Number.isFinite)); assert.ok(Array.from(color.array).every(value => value >= 0 && value <= 1)); assert.ok(geometry.boundingBox && geometry.boundingSphere);
        assert.equal(mesh.material.vertexColors, true); assert.equal(mesh.material.color.getHex(), 0xffffff); assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.opacity, 1); assert.ok(!Object.values(mesh.material).some(value => value?.isTexture));
        const shader = { vertexShader: 'vertex sentinel', fragmentShader: 'fragment sentinel', uniforms: {} }; mesh.material.onBeforeCompile(shader); assert.deepEqual(shader, { vertexShader: 'vertex sentinel', fragmentShader: 'fragment sentinel', uniforms: {} });
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
        for (let vertex = 0; vertex < p.count; vertex++) {
          a.fromBufferAttribute(p, vertex); assert.ok(geometry.boundingBox.distanceToPoint(a) < 1e-7); assert.ok(a.distanceTo(geometry.boundingSphere.center) <= geometry.boundingSphere.radius + 1e-7);
          assert.ok(Math.abs(Math.hypot(n.getX(vertex), n.getY(vertex), n.getZ(vertex)) - 1) < 1e-5, mesh.name + ' unit normal ' + vertex);
        }
        for (let i = 0; i < geometry.index.count; i += 3) {
          const ids = [0, 1, 2].map(offset => geometry.index.getX(i + offset)); assert.ok(ids.every(id => Number.isInteger(id) && id >= 0 && id < p.count));
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]); b.sub(a).cross(c.sub(a)); normal.set(0, 0, 0);
          for (const id of ids) normal.add(new THREE.Vector3().fromBufferAttribute(n, id));
          assert.ok(b.lengthSq() > 1e-18, mesh.name + ' nonzero face'); assert.ok(b.dot(normal) > 0, mesh.name + ' consistent winding');
        }
        let indexStart = 0, vertexStart = 0;
        for (const part of geometry.userData.clCrabParts) {
          assert.ok(part.name); assert.equal(part.indexStart, indexStart); assert.equal(part.vertexStart, vertexStart); assert.ok(part.indexCount > 0 && part.indexCount % 3 === 0);
          assert.equal(part.triangleStart * 3, part.indexStart); assert.equal(part.triangleCount * 3, part.indexCount); indexStart += part.indexCount; vertexStart += part.vertexCount;
        }
        assert.equal(indexStart, geometry.index.count); assert.equal(vertexStart, p.count);
        if (geometry.userData.clCrabGeometry.kind !== 'shell' || mesh.name === 'cl-hermit-shell-spire') for (const section of geometry.userData.clCrabParts) {
          const signedVolume = triangles(mesh, section).reduce((sum, face) => sum + face.a.dot(new THREE.Vector3().crossVectors(face.b, face.c)) / 6, 0);
          assert.ok(signedVolume > 1e-10, mesh.name + '/' + section.name + ' has outward, not globally inverted, faces');
        }
      }
      const vertices = crab.children.reduce((n, mesh) => n + mesh.geometry.attributes.position.count, 0), triangleCount = crab.children.reduce((n, mesh) => n + mesh.geometry.index.count / 3, 0);
      assert.ok(vertices <= (type === 'hermit' ? 2300 : 1400)); assert.ok(triangleCount <= (type === 'hermit' ? 3000 : 1800));
    }
  });

  it('joins eyestalks, claws and all walking roots to the real carapace through the full existing leg lift', () => {
    const item = fixture();
    for (const type of ['rock', 'red', 'hermit']) {
      const crab = item.spawn(type), body = surface(crab.children[0]);
      try {
        let walking = 0, supports = 0;
        for (let index = 1; index <= 10; index++) {
          const mesh = crab.children[index], isLeg = index >= 3 && index <= 8;
          const contacts = mesh.geometry.userData.clCrabGeometry.contacts.filter(contact => /^(stalk-body|claw-body|leg-body-\d|support-body)$/.test(contact.name));
          assert.ok(contacts.length > 0, mesh.name + ' has a real body attachment');
          const rings = contacts.map(contact => capRing(mesh, contact.name));
          for (const lift of isLeg ? [-.04, 0, .04] : [0]) {
            if (isLeg) mesh.position.y = -.05 + lift; mesh.updateMatrix();
            for (const ring of rings) {
              const attached = ring.map(vertex => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, vertex).applyMatrix4(mesh.matrix)).filter(point => inside(point, body.object));
              assert.ok(attached.length >= 2, type + '/' + mesh.name + ' keeps an overlapping root cross-section at lift ' + lift);
              assert.ok(Math.max(...attached.map(point => point.distanceTo(attached[0]))) > .003 * crab.userData.cfg.sizeMul, 'The contact has width, not only a duplicated seam point');
            }
          }
          if (isLeg) mesh.position.y = -.05;
          for (const section of mesh.geometry.userData.clCrabParts) {
            if (section.name.startsWith('walking-leg-')) {
              walking++; const number = section.name.slice('walking-leg-'.length), metadata = mesh.geometry.userData.clCrabGeometry.contacts;
              const root = new THREE.Vector3().fromArray(metadata.find(contact => contact.name === 'leg-body-' + number).point), foot = new THREE.Vector3().fromArray(metadata.find(contact => contact.name === 'foot-' + number).point);
              const line = new THREE.Line3(root, foot), closest = new THREE.Vector3();
              const bend = Math.max(...points(mesh, section).map(point => { line.closestPointToPoint(point, true, closest); return closest.distanceTo(point); }));
              assert.ok(bend > .04 * crab.userData.cfg.sizeMul, 'Leg segments have a visible knee rather than one straight tube'); assert.ok(foot.y < root.y - .05 * crab.userData.cfg.sizeMul);
            } else if (section.name === 'rear-support-appendage') supports++;
          }
        }
        assert.equal(walking, type === 'hermit' ? 4 : 8); assert.equal(supports, type === 'hermit' ? 2 : 0);
        if (type !== 'hermit') for (const mesh of crab.children.slice(7, 9)) assert.equal(mesh.geometry.userData.clCrabParts.filter(section => section.name.startsWith('walking-leg-')).length, 2);
      } finally { body.close(); }
    }
  });

  it('connects each pincer finger to its palm and leaves a real ray-clear opening between the tapered tips', () => {
    const item = fixture();
    for (const type of ['rock', 'red', 'hermit']) {
      const crab = item.spawn(type);
      for (const mesh of crab.children.slice(9, 11)) {
        const palm = surface(mesh, part(mesh, 'claw-palm')), whole = surface(mesh);
        try {
          for (const contact of ['forearm-palm', 'fixed-palm', 'moving-palm']) {
            const vertices = capRing(mesh, contact); mesh.updateMatrix();
            assert.ok(vertices.some(vertex => inside(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, vertex).applyMatrix4(mesh.matrix), palm.object)), 'Pincer segments overlap the actual palm');
          }
          const tips = ['fixed-tip', 'moving-tip'].map(name => capRing(mesh, name).map(vertex => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, vertex).applyMatrix4(mesh.matrix)));
          const gap = Math.min(...tips[0].flatMap(a => tips[1].map(b => a.distanceTo(b)))); assert.ok(gap > .02 * crab.userData.cfg.sizeMul);
          const contacts = mesh.geometry.userData.clCrabGeometry.contacts, midpoint = new THREE.Vector3().fromArray(contacts.find(contact => contact.name === 'fixed-tip').point).add(new THREE.Vector3().fromArray(contacts.find(contact => contact.name === 'moving-tip').point)).multiplyScalar(.5);
          const hits = new THREE.Raycaster(midpoint.clone().add(new THREE.Vector3(0, .2, 0)), new THREE.Vector3(0, -1, 0), 0, .4).intersectObject(whole.object, false);
          assert.equal(hits.length, 0, 'The pincer opening is actual empty space, not a painted groove');
        } finally { palm.close(); whole.close(); }
      }
    }
  });

  it('joins the hermit aperture lip to both shell walls, embeds the spire and leaves the animal visible through the opening', () => {
    const crab = fixture().spawn('hermit'), outer = crab.children[11], inner = crab.children[12], lip = crab.children[13], spire = crab.children[14];
    const outerTriangles = triangles(outer), innerTriangles = triangles(inner), lipPosition = lip.geometry.attributes.position;
    lip.updateMatrix(); const edges = new Map(), indices = lip.geometry.index;
    const point = index => new THREE.Vector3().fromBufferAttribute(lipPosition, index).applyMatrix4(lip.matrix);
    const key = index => point(index).toArray().map(value => Math.round(value * 1e7)).join(',');
    for (let i = 0; i < indices.count; i += 3) for (let edge = 0; edge < 3; edge++) {
      const a = indices.getX(i + edge), b = indices.getX(i + (edge + 1) % 3), tag = [key(a), key(b)].sort().join('|');
      const row = edges.get(tag) || { count: 0, vertices: [a, b] }; row.count++; edges.set(tag, row);
    }
    const boundary = [...new Set([...edges.values()].filter(row => row.count === 1).flatMap(row => row.vertices))]; assert.ok(boundary.length >= 48);
    let outerJoins = 0, innerJoins = 0;
    for (const vertex of boundary) {
      const p = point(vertex), a = distance(p, outerTriangles), b = distance(p, innerTriangles);
      assert.ok(Math.min(a, b) < 2e-7, 'The lip boundary meets the actual shell triangles'); if (a < 2e-7) outerJoins++; if (b < 2e-7) innerJoins++;
    }
    assert.ok(outerJoins >= 24 && innerJoins >= 24);
    const shellSurface = surface(outer), bodySurface = surface(crab.children[0]);
    try {
      const basalRing = capRing(spire, 'spire-body'); spire.updateMatrix();
      for (const vertex of basalRing) {
        const p = new THREE.Vector3().fromBufferAttribute(spire.geometry.attributes.position, vertex).applyMatrix4(spire.matrix);
        const hit = new THREE.Raycaster(p, new THREE.Vector3(0, 1, 0), 1e-6, .2).intersectObject(shellSurface.object, false)[0]; assert.ok(hit, 'The spire base overlaps the body whorl');
      }
      const center = new THREE.Vector3().fromArray(outer.geometry.userData.clCrabGeometry.contacts.find(contact => contact.name === 'shell-opening-center').point), axis = new THREE.Vector3(0, -.62, Math.sqrt(1 - .62 * .62));
      const ray = new THREE.Raycaster(center.clone().addScaledVector(axis, .5), axis.clone().negate()), bodyHit = ray.intersectObject(bodySurface.object, false)[0], shellHit = ray.intersectObject(shellSurface.object, false)[0];
      assert.ok(bodyHit, 'The aperture exposes the actual carried animal'); assert.ok(!shellHit || bodyHit.distance < shellHit.distance, 'The outer shell does not seal its opening');
    } finally { shellSurface.close(); bodySurface.close(); }
  });

  it('keeps deterministic static buffers and single-owner resources through the existing leg-lift poses and independent capture', () => {
    const item = fixture();
    for (const type of ['rock', 'red', 'hermit']) {
      const crab = item.spawn(type), neighbor = item.spawn(type); assert.deepEqual(records(crab), records(neighbor));
      const resources = new Set(), counters = [], snapshots = crab.children.map(mesh => ({ geometry: mesh.geometry, material: mesh.material, index: mesh.geometry.index, indexArray: mesh.geometry.index.array,
        attrs: Object.values(mesh.geometry.attributes).map(attr => ({ attr, array: attr.array, values: attr.array.slice(), version: attr.version })) }));
      for (const [owner, animal] of [['crab', crab], ['neighbor', neighbor]]) for (const mesh of animal.children) for (const resource of [mesh.geometry, mesh.material]) {
        assert.ok(!resources.has(resource)); resources.add(resource); const row = { owner, count: 0 }; resource.addEventListener('dispose', () => row.count++); counters.push(row);
      }
      for (let frame = 0; frame < 24; frame++) {
        crab.children.forEach((child, index) => { if (index >= 3 && index <= 8) child.position.y = -.05 + Math.sin(frame * .4 + index) * .04; }); crab.updateMatrixWorld(true);
        crab.children.forEach((mesh, i) => { const before = snapshots[i]; assert.equal(mesh.geometry, before.geometry); assert.equal(mesh.material, before.material); assert.equal(mesh.geometry.index, before.index); assert.equal(mesh.geometry.index.array, before.indexArray);
          for (const row of before.attrs) { assert.equal(row.attr.array, row.array); assert.equal(row.attr.version, row.version); assert.deepEqual(row.array, row.values); } });
      }
      crab.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); });
      assert.ok(counters.every(row => row.count === (row.owner === 'crab' ? 1 : 0))); assert.equal(neighbor.userData.alive, true); assert.equal(neighbor.parent, item.scene);
    }
  });
});
