import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const start = source.indexOf('function createCLHuntAnimal(');
const end = source.indexOf('// Compact, individually owned prey rig.', start);
if (start < 0 || end <= start) throw new Error('Could not locate the actual animal rig');
const build = new Function('T', 'species', 'Math', source.slice(start, end) + ';return createCLHuntAnimal(T,species);');
const noRigRandom = Object.assign(Object.create(Math), {
  random() { throw new Error('Rig geometry or animation consumed the dive RNG'); },
});
const state = (extra = {}) => ({ moving: false, jet: false, strike: 0, strikeAim: null, camo: 0, substrate: 'sand', reducedMotion: false, ...extra });
const rig = (id = 'humboldtSquid') => build(THREE, { id, bodyColor: 0xbc6048 }, noRigRandom);
const limbs = animal => animal.root.children.filter(mesh => /^cl-(arm|tentacle)-\d+$/.test(mesh.name));

function ringCenter(mesh, ring) {
  const positions = mesh.geometry.attributes.position, stride = positions.count / 21;
  if (stride !== 9) throw new Error('Expected the existing twenty-ring, eight-sided limb topology');
  const center = new THREE.Vector3();
  for (let side = 0; side < stride - 1; side++) center.add(new THREE.Vector3().fromBufferAttribute(positions, ring * stride + side));
  return center.multiplyScalar(1 / (stride - 1));
}

function ringFrame(mesh, ring) {
  const positions = mesh.geometry.attributes.position, center = ringCenter(mesh, ring);
  const axisA = new THREE.Vector3().fromBufferAttribute(positions, ring * 9).sub(center);
  const axisB = new THREE.Vector3().fromBufferAttribute(positions, ring * 9 + 2).sub(center);
  const radiusA = axisA.length(), radiusB = axisB.length();
  axisA.normalize(); axisB.normalize();
  const tangent = ringCenter(mesh, Math.min(20, ring + 1)).sub(ringCenter(mesh, Math.max(0, ring - 1))).normalize();
  const perimeter = Array.from({ length: 8 }, (_, side) => new THREE.Vector3().fromBufferAttribute(positions, ring * 9 + side));
  return { center, axisA, axisB, radiusA, radiusB, tangent, perimeter };
}

function cupShape(cups) {
  const positions = cups.geometry.attributes.position;
  let baseY = Infinity, rimY = -Infinity, radius = 0;
  for (let i = 0; i < positions.count; i++) {
    baseY = Math.min(baseY, positions.getY(i)); rimY = Math.max(rimY, positions.getY(i));
    radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getZ(i)));
  }
  return { baseY, rimY, radius };
}

function cupRows(animal) {
  const cups = animal.root.getObjectByName('cl-suckers'), shape = cupShape(cups), rows = [];
  let instance = 0;
  for (const [kind, count, first, last] of [['arm', 8, 3, 14], ['tentacle', 2, 16, 19]]) {
    for (let index = 0; index < count; index++) {
      const mesh = animal.root.getObjectByName(`cl-${kind}-${index}`);
      for (let ring = first; ring <= last; ring++) {
        const frame = ringFrame(mesh, ring), pair = [];
        for (let row = 0; row < 2; row++) {
          const matrix = new THREE.Matrix4(); cups.getMatrixAt(instance++, matrix);
          const scale = new THREE.Vector3().setFromMatrixScale(matrix);
          const opening = new THREE.Vector3(0, 1, 0).transformDirection(matrix);
          const base = new THREE.Vector3(0, shape.baseY, 0).applyMatrix4(matrix);
          const origin = new THREE.Vector3().setFromMatrixPosition(matrix);
          pair.push({ opening, base, origin, radius: shape.radius * scale.x });
        }
        rows.push({ kind, index, ring, frame, pair });
      }
    }
  }
  expect(cups.count).toBe(instance);
  return rows;
}

function geometrySnapshot(animal) {
  const records = [];
  animal.root.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    records.push([object.name, Array.from(geometry.attributes.position.array), geometry.attributes.normal ? Array.from(geometry.attributes.normal.array) : null, geometry.index ? Array.from(geometry.index.array) : null, object.position.toArray(), object.quaternion.toArray(), object.scale.toArray(), object.isInstancedMesh ? Array.from(object.instanceMatrix.array) : null]);
  });
  return records;
}

function assertFiniteNormals(animal) {
  for (const mesh of limbs(animal)) {
    const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
    expect(Array.from(positions.array).every(Number.isFinite), mesh.name).toBe(true);
    expect(Array.from(normals.array).every(Number.isFinite), mesh.name).toBe(true);
    for (let i = 0; i < normals.count; i++) expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)), `${mesh.name} normal ${i}`).toBeCloseTo(1, 5);
  }
}

describe('Cephalopod squid arm and feeding-club detail', () => {
  it('faces both sucker rows inward around every arm at rest and during a sustained jet', () => {
    const animal = rig();
    for (const jet of [false, true]) {
      for (let step = 1; step <= 20; step++) animal.update(step * .05, .05, state({ jet, moving: jet }));
      for (const { kind, index, ring, frame, pair } of cupRows(animal)) {
        if (kind !== 'arm') continue;
        const inward = new THREE.Vector3(-frame.center.x, -.035 - frame.center.y, 0);
        inward.addScaledVector(frame.tangent, -inward.dot(frame.tangent)).normalize();
        for (const cup of pair) expect(cup.opening.dot(inward), `arm ${index}, ring ${ring}, jet ${jet}`).toBeGreaterThan(.85);
        expect(pair[0].opening.clone().add(pair[1].opening).normalize().dot(inward)).toBeGreaterThan(.995);
      }
    }
  });

  it('uses opaque open bowls whose bases sit on the measured arm or club skin with separated rows', () => {
    const animal = rig(), cups = animal.root.getObjectByName('cl-suckers'), shape = cupShape(cups);
    expect(cups.isInstancedMesh).toBe(true);
    expect(animal.root.children.filter(object => object.name === 'cl-suckers')).toHaveLength(1);
    expect(cups.material.transparent).toBe(false); expect(cups.material.opacity).toBe(1);
    const positions = cups.geometry.attributes.position;
    let recessedCenter = false, rimVertices = 0;
    for (let i = 0; i < positions.count; i++) {
      const radius = Math.hypot(positions.getX(i), positions.getZ(i)), y = positions.getY(i);
      if (radius < shape.radius * .2 && y < shape.rimY - (shape.rimY - shape.baseY) * .25) recessedCenter = true;
      if (radius > shape.radius * .85 && y > shape.rimY - (shape.rimY - shape.baseY) * .15) rimVertices++;
    }
    expect(recessedCenter).toBe(true); expect(rimVertices).toBeGreaterThan(8);
    for (const pose of [state(), state({ jet: true }), state({ strike: 1, strikeAim: new THREE.Vector3(.5, 1.4, -.6) })]) {
      animal.update(1.4, .05, pose);
      for (const { frame, pair } of cupRows(animal)) {
        for (const cup of pair) {
          const delta = cup.base.clone().sub(frame.center), a = delta.dot(frame.axisA), b = delta.dot(frame.axisB);
          // The visible skin is an eight-sided tube. Testing only the ideal
          // ellipse would let a cup float above the actual rendered facet.
          const gap = Math.min(...frame.perimeter.map((point, index) => {
            const edge = new THREE.Line3(point, frame.perimeter[(index + 1) % frame.perimeter.length]);
            return edge.closestPointToPoint(cup.base, true, new THREE.Vector3()).distanceTo(cup.base);
          }));
          expect(gap).toBeLessThan(.00001);
          expect(Math.abs(delta.dot(frame.tangent))).toBeLessThan(.00001);
          const gradient = frame.axisA.clone().multiplyScalar(a / (frame.radiusA * frame.radiusA)).addScaledVector(frame.axisB, b / (frame.radiusB * frame.radiusB)).normalize();
          expect(cup.opening.dot(gradient)).toBeGreaterThan(.9999);
          expect(cup.radius).toBeLessThan(Math.max(frame.radiusA, frame.radiusB));
        }
        expect(pair[0].origin.distanceTo(pair[1].origin)).toBeGreaterThan(pair[0].radius + pair[1].radius);
      }
    }
  });

  it('flattens the feeding clubs while preserving round stalks and correct finite unit normals', () => {
    const animal = rig();
    for (const aim of [null, new THREE.Vector3(0, 2.1, .48), new THREE.Vector3(-1.1, .6, -1.2)]) {
      animal.update(2, .05, state({ strike: aim ? 1 : 0, strikeAim: aim, jet: true }));
      assertFiniteNormals(animal);
      for (let index = 0; index < 2; index++) {
        const mesh = animal.root.getObjectByName('cl-tentacle-' + index), club = ringFrame(mesh, 18), stalk = ringFrame(mesh, 10);
        expect(Math.min(club.radiusA, club.radiusB) / Math.max(club.radiusA, club.radiusB)).toBeLessThan(.8);
        expect(stalk.radiusA / stalk.radiusB).toBeCloseTo(1, 5);
        for (let side = 0; side < 8; side++) {
          const vertex = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 18 * 9 + side).sub(club.center);
          const expected = club.axisA.clone().multiplyScalar(vertex.dot(club.axisA) / (club.radiusA * club.radiusA)).addScaledVector(club.axisB, vertex.dot(club.axisB) / (club.radiusB * club.radiusB)).normalize();
          const normal = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.normal, 18 * 9 + side);
          expect(normal.dot(expected)).toBeGreaterThan(.9999);
        }
      }
    }
  });

  it('updates the same geometry, materials and buffers deterministically without direct rig RNG', () => {
    const animal = rig(), other = rig(), owned = [];
    animal.root.traverse(object => {
      if (!object.isMesh) return;
      owned.push({ object, geometry: object.geometry, material: object.material, position: object.geometry.attributes.position.array, normal: object.geometry.attributes.normal?.array, instances: object.instanceMatrix?.array });
    });
    let disposed = false;
    for (const resource of new Set(owned.flatMap(row => [row.geometry, row.material]))) resource.addEventListener('dispose', () => { disposed = true; });
    for (let frame = 1; frame <= 90; frame++) {
      const pose = state({ moving: true, jet: frame > 20 && frame < 60, strike: frame > 60 ? (90 - frame) / 30 : 0, strikeAim: frame > 60 ? new THREE.Vector3(.8, .3, 1.6) : null });
      animal.update(frame * .05, .05, pose); other.update(frame * .05, .05, pose);
    }
    for (const row of owned) {
      expect(row.object.geometry).toBe(row.geometry); expect(row.object.material).toBe(row.material);
      expect(row.object.geometry.attributes.position.array).toBe(row.position); expect(row.object.geometry.attributes.normal?.array).toBe(row.normal);
      expect(row.object.instanceMatrix?.array).toBe(row.instances);
    }
    expect(disposed).toBe(false); expect(geometrySnapshot(animal)).toEqual(geometrySnapshot(other));
  });

  it('keeps every limb, cup matrix and fin static in reduced motion and on repeated frozen-time updates', () => {
    const animal = rig();
    animal.update(7, .05, state({ jet: true }));
    const frozen = geometrySnapshot(animal);
    // The live inspection loop freezes simulation time and skips the rig. This
    // additionally guards the rig against drift if it receives a frozen tick.
    for (let i = 0; i < 4; i++) animal.update(7, 0, state({ jet: true }));
    expect(geometrySnapshot(animal)).toEqual(frozen);
    animal.update(8, .05, state({ reducedMotion: true }));
    const still = geometrySnapshot(animal);
    for (const time of [8.5, 25, 10000]) {
      animal.update(time, .05, state({ moving: true, jet: true, strike: 1, strikeAim: new THREE.Vector3(1, 2, 0), reducedMotion: true }));
      expect(geometrySnapshot(animal)).toEqual(still);
    }
  });

  it('keeps the two rendered club centers on their directed contact target under full world transforms', () => {
    const animal = rig(); animal.root.position.set(12, -3, 8); animal.root.rotation.set(.27, 1.1, -.31, 'YXZ');
    for (const aim of [new THREE.Vector3(1.3, .5, .6), new THREE.Vector3(0, 2.1, .48), new THREE.Vector3(-1.1, .6, -1.2)]) {
      animal.update(4, .05, state({ jet: true, strike: 1, strikeAim: aim }));
      animal.root.updateMatrixWorld(true);
      const target = animal.root.localToWorld(aim.clone()), mean = new THREE.Vector3();
      for (let index = 0; index < 2; index++) {
        const mesh = animal.root.getObjectByName('cl-tentacle-' + index), center = mesh.localToWorld(ringCenter(mesh, 18));
        expect(center.distanceTo(target)).toBeLessThan(.04); mean.add(center);
      }
      expect(mean.multiplyScalar(.5).distanceTo(target)).toBeLessThan(.00001);
      assertFiniteNormals(animal);
    }
  });

  it('preserves pre-change non-squid geometry and sucker poses', () => {
    // Captured from the actual pass-eight rig before the squid-only change.
    // Include index/normal buffers and instance matrices, not UUIDs or shaders.
    const baselines = {
      commonOcto: '2dbf4f4a9910d0303e8a07b0638453ede78f7abefd6002432eb493b284583055',
      cuttlefish: '23c30f4c06eb9f9b25109e815882249a0fa9deef8c394ef6180e76bb6783b4d3',
      bobtailSquid: 'd64104849224e60d9fef039c05dd26ab8c1c7154fe132ca5eceb570a00edd0e2',
    };
    for (const [id, fingerprint] of Object.entries(baselines)) {
      const animal = rig(id);
      for (const [time, jet, strike] of [[1, false, 0], [1.1, true, 0], [1.2, false, .65]]) animal.update(time, .05, state({ moving: true, jet, strike, camo: .4, substrate: 'rock' }));
      expect(createHash('sha256').update(JSON.stringify(geometrySnapshot(animal))).digest('hex'), id).toBe(fingerprint);
    }
  });
});
