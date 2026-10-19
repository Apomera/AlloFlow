import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Place this file in tests/ and the reviewed literal source inverse in helpers/.
// The accepted factory is restored from the live production source, not copied
// into a test implementation or looked up from a historical report directory.
const require = createRequire(import.meta.url);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = require(resolve(repo, 'vendor/three-r128/three.min.js'));
const { restorePass38CoralSource } = require('./helpers/cephalopod_coral_organic_reference.cjs');
// Retain the pass38 historical cap contract; current tips have their own exhaustive suite.
const rawSource = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || resolve(repo, 'stem_lab/stem_tool_cephalopodlab.js'), 'utf8').replace(/\r\n/g, '\n');
// Pass74 young branchlets are appended after this geometry; living_coral_branches covers them.
const source = require('./helpers/cephalopod_pass64_reference.cjs').restorePass64CoralSource(require('./helpers/cephalopod_pass74_reference.cjs').restorePass74CoralSource(rawSource));
const restored = restorePass38CoralSource(source);

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
  assert.equal(actual.itemSize, expected.itemSize, name + ' itemSize');
  assert.equal(actual.count, expected.count, name + ' count');
  assert.equal(actual.array.constructor, expected.array.constructor, name + ' typed storage');
  assert.ok(bytes(actual).equals(bytes(expected)), name + ' bytes changed');
}
function rings(geometry) {
  const p = geometry.attributes.position, first = new THREE.Vector3(), opposite = new THREE.Vector3();
  const branches = []; let start = 0;
  for (let row = 0; row < p.count / 9; row++) {
    first.fromBufferAttribute(p, row * 9); opposite.fromBufferAttribute(p, row * 9 + 4);
    if (first.distanceTo(opposite) < 1e-7) { branches.push({ start, last: row, steps: row - start - 3 }); start = row + 1; }
  }
  assert.equal(start * 9, p.count, 'A branch did not end with a closed rounded tip');
  assert.ok(branches.every(branch => branch.steps >= 2 && branch.steps <= 6), 'Unexpected branch ring topology');
  return branches;
}
function fixtures(check) {
  for (const height of [1, 1.75, 2.5]) for (let index = 0; index < 18; index++) {
    const actual = liveBuild(height, index), accepted = acceptedBuild(height, index);
    try { check(actual, accepted, height, index); } finally { actual.dispose(); accepted.dispose(); }
  }
}

describe('Cephalopod Hunter pass38 static organic coral form', () => {
  it('confines the reviewed inverse to the production coral factory and retains dive RNG call sites', () => {
    assert.notEqual(liveFactory, acceptedFactory, 'Reviewed organic form is absent');
    assert.equal(source.replace(liveFactory, acceptedFactory), restored, 'Reviewed inverse changed source outside coral geometry');
    assert.deepEqual(source.split('\n').filter(line => line.includes('Math.random')),
      restored.split('\n').filter(line => line.includes('Math.random')), 'Dive RNG call sites changed');
    assert.equal((source.match(/function createReefCoralGeometry\(/g) || []).length, 1);
  });

  it('preserves all 54 topology, tissue-color and pore-coordinate fixtures with deterministic static storage', () => {
    fixtures((actual, accepted, height, index) => {
      const repeated = liveBuild(height, index);
      try {
        assert.deepEqual(Object.keys(actual.attributes), Object.keys(accepted.attributes));
        assert.deepEqual(actual.userData, accepted.userData); assert.deepEqual(actual.groups, accepted.groups);
        assert.equal(actual.attributes.position.count, [675, 711, 972][index % 3]);
        assert.equal(actual.index.count / 3, [984, 1024, 1320][index % 3]);
        for (const name of Object.keys(actual.attributes)) {
          const a = actual.attributes[name], b = accepted.attributes[name];
          assert.equal(a.count, b.count); assert.equal(a.itemSize, b.itemSize);
          assert.equal(a.array.byteLength, b.array.byteLength); assert.equal(a.array.constructor, b.array.constructor);
          assert.ok(Array.from(a.array).every(Number.isFinite), name + ' contains nonfinite data');
          sameAttribute(a, repeated.attributes[name], name + ' deterministic repeat');
        }
        for (const name of ['color', 'clCoralSurface']) sameAttribute(actual.attributes[name], accepted.attributes[name], name);
        sameAttribute(actual.index, accepted.index, 'index'); sameAttribute(actual.index, repeated.index, 'deterministic index');
        const p = actual.attributes.position, box = actual.boundingBox, sphere = actual.boundingSphere;
        assert.ok(box && sphere && Number.isFinite(sphere.radius) && sphere.radius > 0);
        const point = new THREE.Vector3();
        for (let vertex = 0; vertex < p.count; vertex++) {
          point.fromBufferAttribute(p, vertex);
          assert.ok(box.containsPoint(point), 'Declared bounds omit a rendered vertex');
          assert.ok(point.distanceTo(sphere.center) <= sphere.radius + height * 1e-6, 'Declared sphere omits a rendered vertex');
        }
        for (const axis of ['x', 'y', 'z']) {
          assert.ok(box.min[axis] >= accepted.boundingBox.min[axis] - height * 1e-6, 'Coral escaped its accepted minimum');
          assert.ok(box.max[axis] <= accepted.boundingBox.max[axis] + height * 1e-6, 'Coral escaped its accepted maximum');
        }
      } finally { repeated.dispose(); }
    });
  }, 90000);

  it('contracts only interior tube rays by at most 22 percent while retaining every original basal and rounded-cap ring', () => {
    const changedByForm = [0, 0, 0]; let anchors = 0;
    const center = new THREE.Vector3(), point = new THREE.Vector3(), old = new THREE.Vector3(), currentRay = new THREE.Vector3(), oldRay = new THREE.Vector3(), cross = new THREE.Vector3();
    fixtures((actual, accepted, height, index) => {
      const p = actual.attributes.position, original = accepted.attributes.position;
      for (const branch of rings(accepted)) for (let row = branch.start; row <= branch.last; row++) {
        const local = row - branch.start;
        if (local === 0 || local >= branch.steps) {
          // Root and all rounded-cap positions are byte-exact accepted anchors.
          assert.deepEqual(Array.from(p.array.slice(row * 27, (row + 1) * 27)), Array.from(original.array.slice(row * 27, (row + 1) * 27)), 'An accepted basal or rounded-cap ring moved');
          anchors++; continue;
        }
        // Independently recover the accepted center from its eight unique
        // circular vertices. Do not average the duplicated ninth seam vertex.
        center.set(0, 0, 0);
        for (let side = 0; side < 8; side++) center.add(point.fromBufferAttribute(original, row * 9 + side));
        center.multiplyScalar(1 / 8);
        for (let side = 0; side < 9; side++) {
          const vertex = row * 9 + side, epsilon = height * 1e-6;
          old.fromBufferAttribute(original, vertex); point.fromBufferAttribute(p, vertex);
          oldRay.subVectors(old, center); currentRay.subVectors(point, center);
          const before = oldRay.length(), after = currentRay.length();
          assert.ok(after > 0 && after <= before + epsilon, 'Interior radius expanded');
          assert.ok(after >= before * .78 - epsilon, 'Interior radius exceeded the reviewed 22 percent contraction');
          assert.ok(currentRay.dot(oldRay) > 0, 'Interior vertex reversed its accepted origin ray');
          assert.ok(cross.crossVectors(currentRay, oldRay).length() <= epsilon * before, 'Interior vertex moved off its accepted center-to-surface ray');
          if (old.distanceTo(point) > height * 1e-5) changedByForm[index % 3]++;
        }
      }
    });
    assert.ok(anchors > 2500, 'Exhaustive branch anchors were not inspected');
    assert.ok(changedByForm.every(count => count > 0), 'An intended growth form has no organic shape variation');
  }, 90000);

  it('uses finite unit normals with closed meridians and pole fans aligned to real rendered faces', () => {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), edge = new THREE.Vector3(), face = new THREE.Vector3(), normal = new THREE.Vector3(), radial = new THREE.Vector3(), center = new THREE.Vector3();
    fixtures((actual, accepted, height) => {
      const p = actual.attributes.position, n = actual.attributes.normal, index = actual.index;
      const acceptedCenters = [];
      for (let row = 0; row < accepted.attributes.position.count / 9; row++) {
        const ringCenter = new THREE.Vector3();
        for (let side = 0; side < 8; side++) ringCenter.add(a.fromBufferAttribute(accepted.attributes.position, row * 9 + side));
        acceptedCenters.push(ringCenter.multiplyScalar(1 / 8));
      }
      assert.equal(n.itemSize, 3); assert.equal(n.count, p.count);
      for (let vertex = 0; vertex < n.count; vertex++) {
        normal.fromBufferAttribute(n, vertex);
        assert.ok(Math.abs(normal.length() - 1) < 1e-6, 'Static coral normal is not unit length');
      }
      for (const branch of rings(accepted)) for (let row = branch.start; row <= branch.last; row++) {
        a.fromBufferAttribute(p, row * 9); b.fromBufferAttribute(p, row * 9 + 8);
        assert.ok(a.distanceTo(b) <= height * 1e-6, 'Position meridian opened');
        assert.deepEqual(Array.from(n.array.slice(row * 27, row * 27 + 3)), Array.from(n.array.slice(row * 27 + 24, row * 27 + 27)), 'Normal meridian split');
        if (row === branch.last) for (let side = 1; side < 9; side++) {
          b.fromBufferAttribute(p, row * 9 + side); assert.ok(a.distanceTo(b) <= height * 1e-6, 'Rounded tip pole opened');
          assert.deepEqual(Array.from(n.array.slice(row * 27, row * 27 + 3)), Array.from(n.array.slice((row * 9 + side) * 3, (row * 9 + side + 1) * 3)), 'Rounded tip normal fan split');
        }
      }
      for (let triangle = 0; triangle < index.count; triangle += 3) {
        a.fromBufferAttribute(p, index.getX(triangle)); b.fromBufferAttribute(p, index.getX(triangle + 1)); c.fromBufferAttribute(p, index.getX(triangle + 2));
        face.subVectors(b, a).cross(edge.subVectors(c, a));
        assert.ok(face.lengthSq() > 0, 'Organic form collapsed a rendered face'); face.normalize();
        center.set(0, 0, 0);
        for (let corner = 0; corner < 3; corner++) center.add(acceptedCenters[Math.floor(index.getX(triangle + corner) / 9)]);
        center.multiplyScalar(1 / 3); radial.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(center);
        assert.ok(face.dot(radial) > 0, 'Rendered face winding turned toward its branch centerline');
        for (let corner = 0; corner < 3; corner++) {
          normal.fromBufferAttribute(n, index.getX(triangle + corner));
          assert.ok(face.dot(normal) > 0, 'Static normal opposes its real rendered face');
        }
      }
    });
  }, 90000);
});
