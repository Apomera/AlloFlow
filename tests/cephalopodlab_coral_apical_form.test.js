import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The accepted geometry comes from a reviewed literal inverse of the actual
// production factory. All live checks below execute the real Three.js factory.
const require = createRequire(import.meta.url);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = require(resolve(repo, 'vendor/three-r128/three.min.js'));
const { restorePass64CoralSource } = require('./helpers/cephalopod_pass64_reference.cjs');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || resolve(repo, 'stem_lab/stem_tool_cephalopodlab.js'), 'utf8').replace(/\r\n/g, '\n');
const restored = restorePass64CoralSource(source);
function region(value, start, end) {
  const a = value.indexOf(start), b = value.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Missing actual production region: ' + start);
  return value.slice(a, b);
}
const begin = 'function createReefCoralGeometry(height,index){', end = '        var coralColors =';
const liveFactory = region(source, begin, end), acceptedFactory = region(restored, begin, end);
const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Static coral geometry consumed dive RNG'); } });
function builder(factory) { return new Function('THREE', 'Math', factory + ';return createReefCoralGeometry;')(THREE, noRandom); }
const liveBuild = builder(liveFactory), acceptedBuild = builder(acceptedFactory);
function bytes(attribute) { return Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength); }
function sameAttribute(actual, expected, name) {
  assert.equal(actual.itemSize, expected.itemSize, name + ' item size');
  assert.equal(actual.count, expected.count, name + ' count');
  assert.equal(actual.array.constructor, expected.array.constructor, name + ' storage type');
  assert.ok(bytes(actual).equals(bytes(expected)), name + ' bytes changed');
}
function branches(geometry) {
  const p = geometry.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), result = [];
  let start = 0;
  for (let row = 0; row < p.count / 9; row++) {
    a.fromBufferAttribute(p, row * 9); b.fromBufferAttribute(p, row * 9 + 4);
    if (a.distanceTo(b) < 1e-7) { result.push({ start, last: row, steps: row - start - 3 }); start = row + 1; }
  }
  assert.equal(start * 9, p.count, 'A real branch did not terminate in a closed pole');
  assert.ok(result.every(branch => branch.steps >= 2 && branch.steps <= 6));
  return result;
}
function ring(positions, row) { return Array.from({ length: 8 }, (_, side) => new THREE.Vector3().fromBufferAttribute(positions, row * 9 + side)); }
function center(points) { return points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length); }
function areaVector(points) {
  const result = new THREE.Vector3(), cross = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) result.add(cross.crossVectors(points[i], points[(i + 1) % points.length]));
  return result.multiplyScalar(.5);
}
function fixtures(check) {
  for (const height of [1, 1.75, 2.5]) for (let index = 0; index < 18; index++) {
    const actual = liveBuild(height, index), accepted = acceptedBuild(height, index);
    try { check(actual, accepted, height, index); } finally { actual.dispose(); accepted.dispose(); }
  }
}
function stream(seed) {
  let state = seed >>> 0;
  const draws = [], math = Object.create(Math);
  math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const value = state / 4294967296; draws.push(value); return value; };
  return { math, draws };
}
function spawn(value, seed, derivatives) {
  const rng = stream(seed), renderer = { capabilities: { isWebGL2: derivatives }, extensions: { has() { return false; } } };
  const body = region(value, begin, '        // ─── Sea grass') + ';return {scene,meshes:corals};';
  const result = new Function('THREE', 'Math', 'renderer', 'var scene=new THREE.Scene();function reefSurface(){}function shadeCLHuntCoralSurface(){}' + body)(THREE, rng.math, renderer);
  return { ...result, draws: rng.draws };
}
function surfacePolicy(mesh) {
  const m = mesh.material;
  return { type: m.type, color: m.color.toArray(), roughness: m.roughness, metalness: m.metalness, side: m.side, shadowSide: m.shadowSide,
    transparent: m.transparent, opacity: m.opacity, vertexColors: m.vertexColors, extensions: m.extensions, hook: m.onBeforeCompile.name,
    program: m.customProgramCacheKey(), castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow };
}
function release(scene) { scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); }

describe('Cephalopod Hunter pass64 coral apical form', () => {
  it('confines the reviewed inverse to the static coral factory, preserving gameplay and random call sites', () => {
    assert.notEqual(liveFactory, acceptedFactory, 'Apical form improvement is absent');
    assert.equal(source.replace(liveFactory, acceptedFactory), restored, 'Inverse changed source outside coral geometry');
    assert.deepEqual(source.split('\n').filter(line => line.includes('Math.random')), restored.split('\n').filter(line => line.includes('Math.random')));
    assert.equal((source.match(/function createReefCoralGeometry\(/g) || []).length, 1);
  });

  it('preserves all 54 growth-form budgets, pore coordinates and tissue colors with deterministic construction', () => {
    fixtures((actual, accepted, height, index) => {
      const repeated = liveBuild(height, index);
      try {
        assert.deepEqual(Object.keys(actual.attributes), Object.keys(accepted.attributes));
        assert.deepEqual(actual.userData, accepted.userData); assert.deepEqual(actual.groups, accepted.groups);
        assert.equal(actual.userData.growthForm, ['finger', 'antler', 'corymbose'][index % 3]);
        assert.equal(actual.attributes.position.count, [675, 711, 972][index % 3]);
        assert.equal(actual.index.count / 3, [984, 1024, 1320][index % 3]);
        for (const name of Object.keys(actual.attributes)) {
          const a = actual.attributes[name], b = accepted.attributes[name];
          assert.equal(a.count, b.count); assert.equal(a.itemSize, b.itemSize); assert.equal(a.array.byteLength, b.array.byteLength);
          assert.ok(Array.from(a.array).every(Number.isFinite), name + ' contains nonfinite values');
          sameAttribute(a, repeated.attributes[name], name + ' deterministic repeat');
        }
        for (const name of ['color', 'clCoralSurface']) sameAttribute(actual.attributes[name], accepted.attributes[name], name);
        sameAttribute(actual.index, accepted.index, 'index'); sameAttribute(actual.index, repeated.index, 'repeat index');
      } finally { repeated.dispose(); }
    });
  }, 90000);

  it('retains every basal ring, supporting trunk and terminal pole while sculpting inside each old convex cross-section', () => {
    const changedByForm = [0, 0, 0], taperedByForm = [0, 0, 0], shiftedByForm = [0, 0, 0];
    let anchors = 0;
    fixtures((actual, accepted, height, index) => {
      const p = actual.attributes.position, old = accepted.attributes.position, epsilon = height * 2e-6;
      const parts = branches(accepted);
      for (let branchIndex = 0; branchIndex < parts.length; branchIndex++) {
        const branch = parts[branchIndex];
        for (let row = branch.start; row <= branch.last; row++) {
          if (branchIndex === 0 || row === branch.start || row === branch.last) {
            assert.deepEqual(Array.from(p.array.slice(row * 27, (row + 1) * 27)), Array.from(old.array.slice(row * 27, (row + 1) * 27)), 'A structural anchor moved');
            anchors++; continue;
          }
          const previous = ring(old, row), current = ring(p, row), originalCenter = center(previous), currentCenter = center(current);
          const oldAreaVector = areaVector(previous), newAreaVector = areaVector(current), planeNormal = oldAreaVector.clone().normalize();
          const beforeArea = oldAreaVector.length(), afterArea = newAreaVector.length(), radius = Math.max(...previous.map(point => point.distanceTo(originalCenter)));
          assert.ok(beforeArea > 0 && afterArea >= beforeArea * .18 - epsilon * radius, 'An apical ring collapsed or became excessively thin');
          assert.ok(afterArea <= beforeArea + epsilon * radius, 'An apical ring expanded');
          assert.ok(newAreaVector.dot(oldAreaVector) > 0, 'Apical ring winding reversed');
          for (let side = 0; side < 8; side++) {
            const point = current[side];
            assert.ok(Math.abs(point.clone().sub(originalCenter).dot(planeNormal)) <= epsilon, 'Vertex left its accepted cross-section plane');
            for (let edge = 0; edge < 8; edge++) {
              const a = previous[edge], segment = previous[(edge + 1) % 8].clone().sub(a);
              const inward = segment.clone().cross(point.clone().sub(a)).dot(planeNormal);
              assert.ok(inward >= -epsilon * segment.length(), 'Vertex escaped an accepted convex ring edge');
            }
            if (point.distanceTo(previous[side]) > height * 1e-5) changedByForm[index % 3]++;
          }
          if (row - branch.start >= branch.steps) {
            assert.ok(afterArea < beforeArea * .82, 'An upper cap ring kept its old broad cross-section');
            taperedByForm[index % 3]++;
            if (currentCenter.distanceTo(originalCenter) > radius * .01) shiftedByForm[index % 3]++;
          }
        }
      }
    });
    assert.ok(anchors > 1500, 'Fixture missed structural anchors');
    assert.ok(changedByForm.every(count => count > 0), 'A growth form was not sculpted');
    assert.ok(taperedByForm.every(count => count > 200), 'Fixture missed upper branch rings');
    assert.deepEqual(shiftedByForm, taperedByForm, 'Some tapered tips lack asymmetric growth direction');
  }, 90000);

  it('keeps every real vertex inside the accepted colony envelope and reports accurate finite bounds', () => {
    fixtures((actual, accepted, height) => {
      const p = actual.attributes.position, box = actual.boundingBox, sphere = actual.boundingSphere, point = new THREE.Vector3(), epsilon = height * 2e-6;
      assert.ok(box && sphere && Number.isFinite(sphere.radius) && sphere.radius > 0);
      for (let vertex = 0; vertex < p.count; vertex++) {
        point.fromBufferAttribute(p, vertex);
        assert.ok(box.containsPoint(point), 'Current bounds omit a rendered vertex');
        assert.ok(point.distanceTo(sphere.center) <= sphere.radius + epsilon, 'Current sphere omits a rendered vertex');
        assert.ok(point.distanceTo(accepted.boundingSphere.center) <= accepted.boundingSphere.radius + epsilon, 'Coral escaped its original bounding sphere');
      }
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(box.min[axis] >= accepted.boundingBox.min[axis] - epsilon, 'Coral grew outside accepted minimum ' + axis);
        assert.ok(box.max[axis] <= accepted.boundingBox.max[axis] + epsilon, 'Coral grew outside accepted maximum ' + axis);
      }
    });
  }, 90000);

  it('closes seams and pole fans with unit normals facing the actual sculpted triangle surfaces', () => {
    fixtures((actual, accepted, height) => {
      const p = actual.attributes.position, n = actual.attributes.normal, indices = actual.index;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), face = new THREE.Vector3(), edge = new THREE.Vector3(), normal = new THREE.Vector3();
      const centers = Array.from({ length: p.count / 9 }, (_, row) => center(ring(p, row)));
      for (let vertex = 0; vertex < n.count; vertex++) {
        normal.fromBufferAttribute(n, vertex);
        assert.ok(Number.isFinite(normal.length()) && Math.abs(normal.length() - 1) < 1e-6, 'Static normal is not a finite unit vector');
      }
      for (const branch of branches(accepted)) for (let row = branch.start; row <= branch.last; row++) {
        a.fromBufferAttribute(p, row * 9); b.fromBufferAttribute(p, row * 9 + 8);
        assert.ok(a.distanceTo(b) <= height * 1e-6, 'Position seam opened');
        assert.deepEqual(Array.from(n.array.slice(row * 27, row * 27 + 3)), Array.from(n.array.slice(row * 27 + 24, row * 27 + 27)), 'Normal seam split');
        if (row === branch.last) for (let side = 1; side < 9; side++) {
          b.fromBufferAttribute(p, row * 9 + side); assert.ok(a.distanceTo(b) <= height * 1e-6, 'Terminal pole opened');
          assert.deepEqual(Array.from(n.array.slice(row * 27, row * 27 + 3)), Array.from(n.array.slice((row * 9 + side) * 3, (row * 9 + side + 1) * 3)), 'Pole normal fan split');
        }
      }
      for (let triangle = 0; triangle < indices.count; triangle += 3) {
        a.fromBufferAttribute(p, indices.getX(triangle)); b.fromBufferAttribute(p, indices.getX(triangle + 1)); c.fromBufferAttribute(p, indices.getX(triangle + 2));
        face.subVectors(b, a).cross(edge.subVectors(c, a));
        assert.ok(face.lengthSq() > 0, 'Sculpting collapsed a rendered triangle'); face.normalize();
        const centerline = new THREE.Vector3();
        for (let corner = 0; corner < 3; corner++) centerline.add(centers[Math.floor(indices.getX(triangle + corner) / 9)]);
        centerline.multiplyScalar(1 / 3);
        const radial = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(centerline);
        assert.ok(face.dot(radial) > 0, 'Rendered face winding turned inward');
        for (let corner = 0; corner < 3; corner++) {
          normal.fromBufferAttribute(n, indices.getX(triangle + corner));
          assert.ok(face.dot(normal) > 0, 'Vertex normal opposes a real incident face');
        }
      }
    });
  }, 90000);

  it('retains seeded colony placement, camouflage and one mesh/material per colony in both shader capability paths', () => {
    for (const seed of [2741, 73, 12345]) for (const derivatives of [true, false]) {
      const actual = spawn(source, seed, derivatives), accepted = spawn(restored, seed, derivatives);
      try {
        assert.deepEqual(actual.draws, accepted.draws, 'Dive spawn stream changed');
        assert.equal(actual.meshes.length, accepted.meshes.length); assert.equal(actual.scene.children.length, actual.meshes.length);
        assert.equal(new Set(actual.meshes.map(mesh => mesh.geometry)).size, actual.meshes.length);
        assert.equal(new Set(actual.meshes.map(mesh => mesh.material)).size, actual.meshes.length);
        for (let i = 0; i < actual.meshes.length; i++) {
          const a = actual.meshes[i], b = accepted.meshes[i];
          assert.equal(a.children.length, 0); assert.equal(a.name, b.name);
          assert.deepEqual(a.position.toArray(), b.position.toArray()); assert.deepEqual(a.rotation.toArray(), b.rotation.toArray()); assert.deepEqual(a.scale.toArray(), b.scale.toArray());
          assert.deepEqual(a.userData, b.userData); assert.deepEqual(a.geometry.userData, b.geometry.userData);
          assert.deepEqual(surfacePolicy(a), surfacePolicy(b));
          assert.equal(a.geometry.attributes.position.count, b.geometry.attributes.position.count); sameAttribute(a.geometry.index, b.geometry.index, 'spawn index');
        }
      } finally { release(actual.scene); release(accepted.scene); }
    }
  }, 90000);
});
