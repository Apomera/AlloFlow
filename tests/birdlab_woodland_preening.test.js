import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
const cases = ['mourningDove', 'grouse', 'blueJay'].flatMap(id => ['low', 'high'].map(quality => [id, quality]));
const bodyRadii = { mourningDove: [.037, .043, .073], grouse: [.066, .078, .124], blueJay: [.035, .043, .067] };

function digest(root) {
  root.updateMatrixWorld(true);
  const hash = createHash('sha256');
  root.traverse(object => {
    hash.update(JSON.stringify([object.name, object.position.toArray(), object.quaternion.toArray(), object.scale.toArray()]));
    if (object.geometry) for (const [name, attribute] of Object.entries(object.geometry.attributes)) {
      hash.update(name); hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
  });
  return hash.digest('hex');
}

function billTip(bird) {
  const face = bird.root.getObjectByName('woodland-eyes-and-bill');
  const position = face.geometry.attributes.position, tip = new THREE.Vector3();
  let front = -Infinity, count = 0;
  for (let i = 0; i < position.count; i++) front = Math.max(front, position.getZ(i));
  for (let i = 0; i < position.count; i++) if (Math.abs(position.getZ(i) - front) < 1e-8) {
    tip.add(new THREE.Vector3().fromBufferAttribute(position, i)); count++;
  }
  return tip.divideScalar(count).applyMatrix4(face.matrixWorld);
}

function shoulderDistance(wing, tip) {
  let distance = Infinity;
  const tri = new THREE.Triangle(), nearest = new THREE.Vector3();
  wing.traverse(mesh => {
    if (!mesh.isMesh) return;
    const { position, featherInfo } = mesh.geometry.attributes, index = mesh.geometry.index.array;
    for (let i = 0; i < index.length; i += 3) {
      if (featherInfo.getX(index[i]) !== 3) continue;
      tri.a.fromBufferAttribute(position, index[i]).applyMatrix4(mesh.matrixWorld);
      tri.b.fromBufferAttribute(position, index[i + 1]).applyMatrix4(mesh.matrixWorld);
      tri.c.fromBufferAttribute(position, index[i + 2]).applyMatrix4(mesh.matrixWorld);
      tri.closestPointToPoint(tip, nearest);
      distance = Math.min(distance, nearest.distanceTo(tip));
    }
  });
  return distance;
}

describe('shared woodland preening anatomy', () => {
  it.each(cases)('keeps the rendered bill outside the turned neck for %s (%s)', (id, quality) => {
    const bird = scope.AvianWoodlandBirds.create(THREE, id, { quality });
    const ray = new THREE.Raycaster(), point = new THREE.Vector3();
    try {
      const face = bird.root.getObjectByName('woodland-eyes-and-bill');
      const neck = bird.root.getObjectByName('woodland-neck-plumage');
      const position = face.geometry.attributes.position;
      const length = id === 'grouse' ? .023 : id === 'blueJay' ? .029 : .020;
      let front = -Infinity;
      for (let i = 0; i < position.count; i++) front = Math.max(front, position.getZ(i));
      for (const side of [-1, 1]) for (const stroke of [0, .5, 1]) {
        bird.update({ preen: 1, preenSide: side, preenStroke: stroke });
        bird.root.updateMatrixWorld(true);
        // Rays leave actual bill-surface vertices toward the groomed side.
        // A neck intersection here means the bill is inside the throat or
        // screened by its feathers, even when the tip reaches the wing.
        let sampled = 0;
        for (let i = 0; i < position.count; i += 3) {
          if (position.getZ(i) < front - length * .8) continue;
          point.fromBufferAttribute(position, i).applyMatrix4(face.matrixWorld);
          ray.set(point, new THREE.Vector3(side, 0, 0));
          expect(ray.intersectObject(neck, false)).toHaveLength(0);
          sampled++;
        }
        expect(sampled).toBeGreaterThan(10);
      }
    } finally { bird.dispose(); }
  });

  it.each(cases)('places the real bill against either upper shoulder without burying the skull for %s (%s)', (id, quality) => {
    const bird = scope.AvianWoodlandBirds.create(THREE, id, { quality });
    try {
      for (const side of [-1, 1]) for (const stroke of [0, .5, 1]) {
        bird.update({ preen: 1, preenSide: side, preenStroke: stroke });
        bird.root.updateMatrixWorld(true);
        const tip = billTip(bird), wing = bird.wings[side < 0 ? 0 : 1];
        expect(shoulderDistance(wing, tip)).toBeLessThan(.0018);
        expect(tip.x * side).toBeGreaterThan(.006);
        expect(tip.y).toBeGreaterThan(bird.body.position.y + bodyRadii[id][1] * .45);
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(bird.head.quaternion);
        expect(forward.z).toBeLessThan(-.35);
        expect(forward.y).toBeLessThan(-.5);
        // Test the rendered head vertices against the torso core, rather than
        // only checking the head pivot: a bill contact must not bury the face.
        const skull = bird.root.getObjectByName('woodland-head-plumage');
        const vertices = skull.geometry.attributes.position, point = new THREE.Vector3();
        let clearance = Infinity;
        for (let i = 0; i < vertices.count; i++) {
          point.fromBufferAttribute(vertices, i).applyMatrix4(skull.matrixWorld);
          bird.body.worldToLocal(point);
          const r = bodyRadii[id];
          clearance = Math.min(clearance, (point.x / r[0]) ** 2 + (point.y / r[1]) ** 2 + (point.z / r[2]) ** 2);
        }
        expect(clearance).toBeGreaterThan(.98);
      }
    } finally { bird.dispose(); }
  });

  it.each(cases)('keeps planted feet and all caller-owned placement through a smooth preen for %s (%s)', (id, quality) => {
    const bird = scope.AvianWoodlandBirds.create(THREE, id, { quality });
    try {
      bird.root.position.set(1.2, .3, -.7); bird.root.rotation.set(.03, .8, -.04);
      bird.update({});
      bird.root.updateMatrixWorld(true);
      const feet = bird.feet.map(digest), placement = bird.root.matrixWorld.toArray();
      let last = bird.head.position.clone();
      for (let frame = 0; frame <= 60; frame++) {
        bird.update({ preen: Math.sin(frame / 60 * Math.PI), preenSide: -1, preenStroke: frame / 60 });
        bird.root.updateMatrixWorld(true);
        expect(bird.feet.map(digest)).toEqual(feet);
        expect(bird.root.matrixWorld.toArray()).toEqual(placement);
        expect(bird.head.position.distanceTo(last)).toBeLessThan(.012);
        last.copy(bird.head.position);
      }
    } finally { bird.dispose(); }
  });

  it.each(cases)('restores exact absent/zero and suppressed poses after grooming for %s (%s)', (id, quality) => {
    const bird = scope.AvianWoodlandBirds.create(THREE, id, { quality });
    const reference = scope.AvianWoodlandBirds.create(THREE, id, { quality });
    try {
      for (const pose of [{}, { lookYaw: .4, lookPitch: -.15 }, { walking: .8, stride: 2.1 },
        { flight: .7, phase: 1.3, effort: .8, bank: -.3 }, { peck: .6 }, { landing: .5 }]) {
        reference.update(pose); const expected = digest(reference.root);
        bird.update({ preen: 1, preenSide: -1, preenStroke: .8 });
        bird.update({ ...pose, preen: 0, preenSide: -1, preenStroke: .9 });
        expect(digest(bird.root)).toBe(expected);
        bird.update({ preen: 1, preenSide: 1, preenStroke: .3 });
        bird.update(pose); expect(digest(bird.root)).toBe(expected);
        if (pose.walking || pose.flight || pose.peck || pose.landing) {
          bird.update({ ...pose, preen: 1, preenSide: -1, preenStroke: .8 });
          expect(digest(bird.root)).toBe(expected);
        }
      }
    } finally { bird.dispose(); reference.dispose(); }
  });

  it.each(cases)('seeks to the same grooming geometry and keeps allocations stable for %s (%s)', (id, quality) => {
    const bird = scope.AvianWoodlandBirds.create(THREE, id, { quality });
    try {
      const objects = [], resources = [];
      bird.root.traverse(object => { objects.push(object); if (object.geometry) resources.push(object.geometry, ...Object.values(object.geometry.attributes)); });
      const target = { preen: .82, preenSide: -1, preenStroke: .63 };
      bird.update(target); const expected = digest(bird.root);
      for (const pose of [{ preen: 1, preenSide: 1, preenStroke: 0 }, { flight: 1, phase: 9.2 },
        { walking: 1, stride: 4.4 }, { preen: .4, preenStroke: 1 }, {}]) bird.update(pose);
      bird.update(target); expect(digest(bird.root)).toBe(expected);
      bird.update(target); expect(digest(bird.root)).toBe(expected);
      const afterObjects = [], afterResources = [];
      bird.root.traverse(object => { afterObjects.push(object); if (object.geometry) afterResources.push(object.geometry, ...Object.values(object.geometry.attributes)); });
      expect(afterObjects).toEqual(objects); expect(afterResources).toEqual(resources);
    } finally { bird.dispose(); }
  });
});
