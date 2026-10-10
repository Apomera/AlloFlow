import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reviewed source inverses preserve frozen historical oracles. Current geometry
// is independently checked below for bounded form, closure, and static finish.
const require = createRequire(import.meta.url);
const directory = dirname(fileURLToPath(import.meta.url));
const repo = resolve(directory, '..');
const THREE = require(resolve(repo, 'vendor/three-r128/three.min.js'));
const { restorePass37ReefSource, restorePass37RockSource, restorePass37CoralSource } = require('./helpers/cephalopod_reef_form_reference.cjs');
const {restorePass38CoralSource}=require('./helpers/cephalopod_coral_organic_reference.cjs');
// This suite retains the accepted pass37 contracts; pass38 current geometry has its own exhaustive suite.
const {restorePass44Source}=require('./helpers/cephalopod_pass44_reference.cjs');
const {restorePass45Source}=require('./helpers/cephalopod_pass45_reference.cjs');
const {restorePass46Source}=require('./helpers/cephalopod_pass46_reference.cjs');
const {restorePass47Source:restorePass47Only}=require('./helpers/cephalopod_pass47_reference.cjs');
const {restorePass48Source:restorePass48Only}=require('./helpers/cephalopod_pass48_reference.cjs');
// These historical hashes predate the current oral tissue surface and motion.
const restorePass47Source=source=>restorePass47Only(restorePass48Source(source));
const source = restorePass38CoralSource(restorePass44Source(restorePass45Source(restorePass46Source(restorePass47Source(readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || resolve(repo, 'stem_lab/stem_tool_cephalopodlab.js'), 'utf8').replace(/\r\n/g, '\n'))))));
const restored = restorePass37ReefSource(source);

function region(value, start, end) {
  const a = value.indexOf(start), b = value.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Missing actual production region: ' + start);
  return value.slice(a, b);
}

function braced(value, marker) {
  const start = value.indexOf(marker), open = value.indexOf('{', start);
  assert.ok(start >= 0 && open > start, 'Missing actual production function: ' + marker);
  let depth = 0;
  for (let i = open; i < value.length; i++) {
    if (value[i] === '{') depth++;
    if (value[i] === '}' && --depth === 0) return value.slice(start, i + 1);
  }
  throw new Error('Unclosed actual production function: ' + marker);
}

const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Static reef geometry consumed gameplay RNG'); } });
const shape = new Function('Math', braced(source, 'function shapeCLHuntReefRock(') + ';return shapeCLHuntReefRock;')(noRandom);
const baselineRock = new Function('THREE', 'Math', 'rs', 'ri',
  region(restored, '          var rockGeo = new THREE.SphereGeometry(rs, 24, 16);', '          var ROCK_TINTS =') + ';return rockGeo;');
function coralBuilder(value) {
  return new Function('THREE', 'Math', region(value, 'function createReefCoralGeometry(height,index){', '        var coralColors =') + ';return createReefCoralGeometry;')(THREE, noRandom);
}
const candidateCoral = coralBuilder(source), baselineCoral = coralBuilder(restored);

function bytes(attribute) {
  return Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
}
function sameAttribute(actual, expected, name) {
  assert.equal(actual.itemSize, expected.itemSize, name + ' itemSize');
  assert.equal(actual.count, expected.count, name + ' count');
  assert.equal(actual.array.constructor, expected.array.constructor, name + ' typed array');
  assert.ok(bytes(actual).equals(bytes(expected)), name + ' bytes changed');
}
function sameGeometry(actual, expected, names = Object.keys(expected.attributes)) {
  assert.deepEqual(Object.keys(actual.attributes), Object.keys(expected.attributes), 'Attribute ownership changed');
  for (const name of names) sameAttribute(actual.attributes[name], expected.attributes[name], name);
  sameAttribute(actual.index, expected.index, 'index');
}
function release(scene) {
  scene.traverse(object => {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
    else object.material?.dispose();
  });
}
function stream(seed) {
  let state = seed >>> 0;
  const draws = [], math = Object.create(Math);
  math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const value = state / 4294967296; draws.push(value); return value; };
  return { math, draws };
}
function spawn(value, seed, kind) {
  const rng = stream(seed), renderer = { capabilities: { isWebGL2: true }, extensions: { has() { throw new Error('WebGL2 must not query the derivative fallback'); } } };
  const body = kind === 'rock'
    ? region(value, '        var rocks = [];', '        // ─── Curved branching coral colonies') + ';return {scene,meshes:rocks};'
    : region(value, 'function createReefCoralGeometry(height,index){', '        // ─── Sea grass') + ';return {scene,meshes:corals};';
  const result = new Function('THREE', 'Math', 'renderer',
    'var scene=new THREE.Scene();function reefSurface(){}function shadeCLHuntRockSurface(){}function shadeCLHuntCoralSurface(){}' + body)(THREE, rng.math, renderer);
  return { ...result, draws: rng.draws };
}
function surfacePolicy(mesh) {
  const material = mesh.material;
  return { type: material.type, color: material.color.toArray(), roughness: material.roughness, metalness: material.metalness,
    side: material.side, shadowSide: material.shadowSide, transparent: material.transparent, opacity: material.opacity,
    vertexColors: material.vertexColors, extensions: material.extensions, hook: material.onBeforeCompile.name,
    program: material.customProgramCacheKey(), castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow };
}

describe('Cephalopod Hunter pass37 static reef form and finish', () => {
  it('limits reviewed reversals to actual static rock and coral construction while retaining gameplay random call sites', () => {
    const rocks = region(source, '        var rocks = [];', '        // ─── Curved branching coral colonies');
    const corals = region(source, 'function createReefCoralGeometry(height,index){', '        // ─── Sea grass');
    const oldRocks = restorePass37RockSource(rocks), oldCorals = restorePass37CoralSource(corals);
    assert.notEqual(rocks, oldRocks, 'Reviewed rock form is absent');
    assert.notEqual(corals, oldCorals, 'Reviewed coral finish is absent');
    assert.equal(oldRocks, region(restored, '        var rocks = [];', '        // ─── Curved branching coral colonies'));
    assert.equal(oldCorals, region(restored, 'function createReefCoralGeometry(height,index){', '        // ─── Sea grass'));
    assert.equal(source.replace(rocks, oldRocks).replace(corals, oldCorals), restored, 'Reversal changed source outside static reef construction');
    assert.deepEqual(source.split('\n').filter(line => line.includes('Math.random')),
      restored.split('\n').filter(line => line.includes('Math.random')), 'Gameplay random call sites changed');
  });

  it('retains seeded rock and coral spawn streams, counts, ownership, layout, camouflage and material policy', () => {
    for (const seed of [2741, 73, 12345]) for (const kind of ['rock', 'coral']) {
      const current = spawn(source, seed, kind), baseline = spawn(restored, seed, kind);
      try {
        assert.deepEqual(current.draws, baseline.draws, kind + ' spawn stream changed at seed ' + seed);
        assert.equal(current.meshes.length, baseline.meshes.length);
        assert.equal(current.scene.children.length, baseline.scene.children.length);
        assert.equal(new Set(current.meshes.map(mesh => mesh.geometry)).size, current.meshes.length);
        assert.equal(new Set(current.meshes.map(mesh => mesh.material)).size, current.meshes.length);
        if (seed === 2741) {
          assert.equal(current.meshes.length, kind === 'rock' ? 44 : 18);
          assert.equal(current.draws.length, kind === 'rock' ? 354 : 108);
        }
        for (let i = 0; i < current.meshes.length; i++) {
          const a = current.meshes[i], b = baseline.meshes[i];
          assert.deepEqual(a.position.toArray(), b.position.toArray());
          assert.deepEqual(a.rotation.toArray(), b.rotation.toArray());
          assert.deepEqual(a.scale.toArray(), b.scale.toArray());
          assert.deepEqual(a.userData, b.userData, 'Camouflage or collision metadata changed');
          assert.equal(a.name, b.name); assert.equal(a.children.length, b.children.length);
          assert.deepEqual(surfacePolicy(a), surfacePolicy(b));
          assert.deepEqual(a.geometry.userData, b.geometry.userData);
          sameGeometry(a.geometry, b.geometry, kind === 'rock' ? ['uv'] : ['position', 'normal', 'clCoralSurface']);
        }
      } finally { release(current.scene); release(baseline.scene); }
    }
  }, 90000);

  it('erodes each accepted rock ray in place with fixed topology, closed seams and outward face-aligned unit normals', () => {
    const point = new THREE.Vector3(), oldPoint = new THREE.Vector3(), normal = new THREE.Vector3();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), face = new THREE.Vector3(), edge = new THREE.Vector3(), center = new THREE.Vector3();
    for (const radius of [0.6, 0.95, 1.4, 2]) for (let index = 0; index < 45; index++) {
      const geometry = new THREE.SphereGeometry(radius, 24, 16), repeated = new THREE.SphereGeometry(radius, 24, 16);
      const baseline = baselineRock(THREE, noRandom, radius, index);
      const owned = { position: geometry.attributes.position, normal: geometry.attributes.normal, uv: geometry.attributes.uv, index: geometry.index,
        positionArray: geometry.attributes.position.array, normalArray: geometry.attributes.normal.array, uvArray: geometry.attributes.uv.array, indexArray: geometry.index.array };
      try {
        shape(geometry, radius, index); shape(repeated, radius, index);
        assert.equal(geometry.attributes.position, owned.position); assert.equal(geometry.attributes.position.array, owned.positionArray);
        assert.equal(geometry.attributes.normal, owned.normal); assert.equal(geometry.attributes.normal.array, owned.normalArray);
        assert.equal(geometry.attributes.uv, owned.uv); assert.equal(geometry.attributes.uv.array, owned.uvArray);
        assert.equal(geometry.index, owned.index); assert.equal(geometry.index.array, owned.indexArray);
        sameGeometry(geometry, repeated); sameGeometry(geometry, baseline, ['uv']);
        assert.equal(geometry.attributes.position.count, 425); assert.equal(geometry.index.count, 2160);
        assert.equal(geometry.groups.length, baseline.groups.length);
        const p = geometry.attributes.position, n = geometry.attributes.normal, old = baseline.attributes.position, indices = geometry.index;
        assert.ok(Array.from(p.array).every(Number.isFinite)); assert.ok(Array.from(n.array).every(Number.isFinite));
        let changed = 0;
        for (let vertex = 0; vertex < p.count; vertex++) {
          point.fromBufferAttribute(p, vertex); oldPoint.fromBufferAttribute(old, vertex); normal.fromBufferAttribute(n, vertex);
          const length = point.length(), previous = oldPoint.length();
          assert.ok(length > 0 && length <= previous + radius * 1e-6, 'Rock grew beyond its accepted radial extent');
          assert.ok(point.dot(oldPoint) / (length * previous) > 1 - 1e-6, 'Rock moved off its accepted origin ray');
          assert.ok(Math.abs(normal.length() - 1) < 1e-6, 'Static normal is not unit length');
          assert.ok(normal.dot(point) > 0, 'Static normal faces inward');
          if (oldPoint.distanceTo(point) > radius * 1e-5) changed++;
        }
        assert.ok(changed > 0, 'Weathered form did not change any accepted rock vertex');
        geometry.computeBoundingBox(); baseline.computeBoundingBox();
        for (const axis of ['x', 'y', 'z']) {
          assert.ok(geometry.boundingBox.min[axis] >= baseline.boundingBox.min[axis] - radius * 1e-6, 'Rock escaped old minimum ' + axis);
          assert.ok(geometry.boundingBox.max[axis] <= baseline.boundingBox.max[axis] + radius * 1e-6, 'Rock escaped old maximum ' + axis);
        }
        for (let row = 0; row <= 16; row++) {
          const first = row * 25, last = first + 24;
          for (const attribute of [p, n]) {
            assert.deepEqual(Array.from(attribute.array.slice(first * 3, first * 3 + 3)), Array.from(attribute.array.slice(last * 3, last * 3 + 3)), 'Closing meridian split');
            if (row === 0 || row === 16) for (let side = 1; side < 25; side++)
              assert.deepEqual(Array.from(attribute.array.slice(first * 3, first * 3 + 3)), Array.from(attribute.array.slice((first + side) * 3, (first + side) * 3 + 3)), 'Pole fan split');
          }
        }
        // Independently inspect real triangle winding and corner normals, rather
        // than trusting helper metadata or repeating its shared-vertex algorithm.
        for (let triangle = 0; triangle < indices.count; triangle += 3) {
          a.fromBufferAttribute(p, indices.getX(triangle)); b.fromBufferAttribute(p, indices.getX(triangle + 1)); c.fromBufferAttribute(p, indices.getX(triangle + 2));
          face.subVectors(b, a).cross(edge.subVectors(c, a));
          assert.ok(face.lengthSq() > 0, 'Weathering collapsed a rendered face');
          center.copy(a).add(b).add(c); assert.ok(face.dot(center) > 0, 'Rendered face winding is inward');
          face.normalize();
          for (let corner = 0; corner < 3; corner++) {
            normal.fromBufferAttribute(n, indices.getX(triangle + corner));
            assert.ok(face.dot(normal) > 0, 'Vertex normal opposes its actual rendered face');
          }
        }
      } finally { geometry.dispose(); repeated.dispose(); baseline.dispose(); }
    }
  }, 90000);

  it('keeps all 54 coral shapes and pore coordinates byte exact while adding bounded deterministic tissue color with original basal rings', () => {
    const first = new THREE.Vector3(), opposite = new THREE.Vector3();
    let changed = 0, basalRings = 0, maxDelta = 0;
    for (const height of [1, 1.75, 2.5]) for (let index = 0; index < 18; index++) {
      const geometry = candidateCoral(height, index), baseline = baselineCoral(height, index), repeated = candidateCoral(height, index);
      try {
        sameGeometry(geometry, baseline, ['position', 'normal', 'clCoralSurface']);
        sameGeometry(geometry, repeated);
        assert.deepEqual(geometry.userData, baseline.userData);
        assert.deepEqual(geometry.groups, baseline.groups);
        assert.deepEqual(geometry.boundingBox, baseline.boundingBox); assert.deepEqual(geometry.boundingSphere, baseline.boundingSphere);
        const colors = geometry.attributes.color, oldColors = baseline.attributes.color, p = geometry.attributes.position;
        assert.equal(colors.count, p.count); assert.equal(colors.itemSize, 3);
        for (let i = 0; i < colors.array.length; i++) {
          const value = colors.array[i], delta = value - oldColors.array[i];
          assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, 'Coral tissue color is outside its finite linear range');
          assert.ok(delta >= -0.028001 && delta <= 0.063001, 'Coral finish exceeded the reviewed modest tissue-tone envelope');
          maxDelta = Math.max(maxDelta, Math.abs(delta)); if (delta !== 0) changed++;
        }
        // A collapsed hemisphere ring ends each real branch. Its successor is
        // a basal ring; t=0 appearance must retain the accepted anchor colors.
        const starts = [0];
        for (let row = 0; row < p.count; row += 9) {
          first.fromBufferAttribute(p, row); opposite.fromBufferAttribute(p, row + 4);
          if (first.distanceTo(opposite) < 1e-7 && row + 9 < p.count) starts.push(row + 9);
          for (let channel = 0; channel < 3; channel++)
            assert.ok(Math.abs(colors.array[row * 3 + channel] - colors.array[(row + 8) * 3 + channel]) <= 2e-7, 'Coral tissue color split at the wrapped seam');
        }
        for (const start of starts) {
          const end = (start + 9) * 3;
          assert.deepEqual(Array.from(colors.array.slice(start * 3, end)), Array.from(oldColors.array.slice(start * 3, end)), 'A basal branch ring changed its accepted color');
          basalRings++;
        }
      } finally { geometry.dispose(); baseline.dispose(); repeated.dispose(); }
    }
    assert.ok(changed > 0 && maxDelta > 0.015, 'Static tissue finish produced no material color change');
    assert.ok(basalRings > 500, 'The exhaustive fixture did not inspect the real branch anchors');
  }, 90000);
});

// Historical references predate the ink surface. Keep live fixtures on current visuals.
function restorePass48Source(source){return restorePass48Only(require('./helpers/cephalopod_pass49_reference.cjs').restorePass49Source(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)))))));}
