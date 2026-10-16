import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function create(id, quality) {
  const window = {};
  new Function('window', source)(window);
  return window.AvianWoodlandBirds.create(THREE, id, { quality });
}
function targetsFor(id) {
  const stance = id === 'grouse' ? .024 : .014, leg = id === 'grouse' ? .056 : .034;
  return [-1, 1].map(side => ({ x: side * stance, y: leg, z: .006, swing: -1, yaw: 0 }));
}
function parts(geometry) {
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  for (let i = 0; i < geometry.index.array.length; i += 3) {
    const [a, b, c] = geometry.index.array.slice(i, i + 3);
    parent[find(b)] = find(a); parent[find(c)] = find(a);
  }
  const groups = new Map();
  parent.forEach((_, index) => { const key = find(index); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(index); });
  return [...groups.values()].sort((a, b) => a[0] - b[0]);
}
function positions(mesh, indices) {
  const point = new THREE.Vector3(), out = [], position = mesh.geometry.attributes.position;
  for (const index of indices) {
    point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
    out.push(point.x, point.y, point.z);
  }
  return out;
}
function delta(a, b) { let max = 0; for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i])); return max; }
function neckRing(bird, end) {
  const geometry = bird.root.getObjectByName('woodland-neck-plumage').geometry, center = new THREE.Vector3();
  const { position, uv, featherInfo } = geometry.attributes; let count = 0;
  for (let i = 0; i < position.count; i++) if (featherInfo.getX(i) === 6 && uv.getY(i) === end) {
    center.x += position.getX(i); center.y += position.getY(i); center.z += position.getZ(i); count++;
  }
  expect(count).toBeGreaterThan(5);
  return center.divideScalar(count);
}
function snapshot(bird) {
  const values = [];
  bird.root.traverse(object => {
    values.push(...object.position.toArray(), ...object.quaternion.toArray());
    if (object.isMesh) for (const value of object.geometry.attributes.position.array) values.push(value);
  });
  return values;
}
function meshes(bird) { const all = []; bird.root.traverse(object => { if (object.isMesh) all.push(object); }); return all; }

describe('woodland walking weight transfer', () => {
  it.each(['high', 'low'])('follows actual support contacts while steady eyes, mantle and planted soles stay attached (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), targets = targetsFor(id), restBody = bird.body.position.clone();
      const restHead = [...bird.head.position.toArray(), ...bird.head.quaternion.toArray()];
      const restRotation = bird.body.quaternion.toArray(), followers = [...bird.wings, bird.tail];
      const offsets = followers.map(part => part.position.clone().sub(restBody));
      const lower = neckRing(bird, 0), upper = neckRing(bird, 1);
      const feet = bird.feet.map(foot => foot.children[0]), soles = feet.map(foot => parts(foot.geometry).slice(1).flat());
      try {
        for (const moving of [0, 1]) {
          const support = 1 - moving; let planted;
          targets[support].swing = -1;
          for (const progress of [0, .2, .5, .8, 1, .5, 0]) {
            targets[moving].swing = progress;
            targets[moving].y = targetsFor(id)[moving].y + Math.sin(Math.PI * progress) ** 2 * .008;
            // Deliberately contradict the external contact phase. The shared
            // Raptor scheduler does not promise phase alignment with stride.
            bird.update({ walking: 1, stride: moving === 0 ? Math.PI * 1.5 : Math.PI * .5, footTargets: targets });
            bird.root.updateMatrixWorld(true);
            const sole = positions(feet[support], soles[support]);
            if (!planted) planted = sole; else expect(delta(sole, planted)).toBeLessThan(1e-8);
            const translation = bird.body.position.clone().sub(restBody);
            if (progress === .5) {
              expect(translation.x * (moving === 0 ? 1 : -1)).toBeGreaterThan(.001);
              expect(Math.abs(translation.x)).toBeLessThan(.0025);
              expect(translation.y).toBeGreaterThan(.0003); expect(translation.y).toBeLessThan(.0011);
            }
            if (progress === 0 || progress === 1) expect(translation.length()).toBe(0);
            expect([...bird.head.position.toArray(), ...bird.head.quaternion.toArray()]).toEqual(restHead);
            expect(bird.body.quaternion.toArray()).toEqual(restRotation);
            followers.forEach((part, i) => expect(part.position.clone().sub(bird.body.position).distanceTo(offsets[i])).toBeLessThan(1e-12));
            expect(neckRing(bird, 0).distanceTo(lower.clone().add(translation))).toBeLessThan(1e-8);
            expect(neckRing(bird, 1).distanceTo(upper)).toBeLessThan(1e-8);
          }
        }
        targets.forEach(target => { target.swing = -1; });
        for (const stride of [0, 1, 3, 5]) {
          bird.update({ walking: 1, stride, footTargets: targets });
          expect(bird.body.position.toArray()).toEqual(restBody.toArray());
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps cadence joins smooth, poses seekable and geometry buffers retained (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), all = meshes(bird), retained = all.map(mesh => mesh.geometry.attributes.position.array);
      const idle = snapshot(bird), targets = targetsFor(id);
      try {
        for (const boundary of [0, Math.PI, Math.PI * 2]) {
          const samples = [-1e-5, 0, 1e-5].map(offset => {
            bird.update({ walking: 1, stride: boundary + offset });
            return bird.body.position.toArray();
          });
          expect(delta(samples[0], samples[2])).toBeLessThan(1e-7);
          expect(Math.max(...samples[0].map((value, i) => Math.abs(samples[2][i] - 2 * samples[1][i] + value) / 1e-5))).toBeLessThan(.00001);
        }
        targets[0].swing = .37; targets[0].y += .008;
        const pose = { walking: .8, stride: 5.7, footTargets: targets };
        bird.update(pose); const expected = snapshot(bird), versions = all.map(mesh => mesh.geometry.attributes.position.version);
        bird.update(pose); bird.update({ ...pose, footTargets: targets.map(target => ({ ...target })) });
        expect(all.map(mesh => mesh.geometry.attributes.position.version)).toEqual(versions);
        for (const other of [{}, { walking: 1, stride: .4 }, { flight: 1, phase: 2, effort: .9 }]) {
          bird.update(other); bird.update(pose); expect(delta(snapshot(bird), expected)).toBe(0);
        }
        targets[0].swing = .73; bird.update(pose);
        expect(delta(snapshot(bird), expected)).toBeGreaterThan(.0001);
        targets[0].swing = .37; bird.update(pose); expect(delta(snapshot(bird), expected)).toBe(0);
        bird.update({ walking: 0, stride: 2 }); expect(delta(snapshot(bird), idle)).toBe(0);
        bird.update({ flight: 1, phase: 1.8, effort: .7, walking: 0 }); const flight = snapshot(bird);
        bird.update({ flight: 1, phase: 1.8, effort: .7, walking: 1, stride: 4 });
        expect(delta(snapshot(bird), flight)).toBe(0);
        all.forEach((mesh, i) => expect(mesh.geometry.attributes.position.array).toBe(retained[i]));
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('releases external contact continuously with exact default and target endpoints (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), targets = targetsFor(id), all = meshes(bird);
      targets[0].z -= .012; targets[0].yaw = .6; targets[1].swing = .35; targets[1].y += .007;
      const base = { walking: .85, stride: .6, lookYaw: .1 };
      try {
        bird.update(base); const absent = snapshot(bird);
        bird.update({ ...base, footTargets: targets }); const full = snapshot(bird);
        bird.update({ ...base, footTargets: targets, footTargetBlend: 1 }); expect(delta(snapshot(bird), full)).toBe(0);
        bird.update({ ...base, footTargets: targets, footTargetBlend: 0 }); expect(delta(snapshot(bird), absent)).toBe(0);
        let previous = absent;
        for (let step = 0; step <= 40; step++) {
          const pose = { ...base, footTargets: targets, footTargetBlend: step / 40 };
          bird.update(pose); const current = snapshot(bird);
          expect(current.every(Number.isFinite)).toBe(true);
          expect(delta(current, previous)).toBeLessThan(.002);
          previous = current;
        }
        expect(delta(previous, full)).toBe(0);
        const pose = { ...base, footTargets: targets, footTargetBlend: .42 };
        bird.update(pose); const middle = snapshot(bird), versions = all.map(mesh => mesh.geometry.attributes.position.version);
        bird.update(pose); expect(all.map(mesh => mesh.geometry.attributes.position.version)).toEqual(versions);
        pose.footTargetBlend = .58; bird.update(pose); expect(delta(snapshot(bird), middle)).toBeGreaterThan(.0001);
        pose.footTargetBlend = .42; bird.update(pose); expect(delta(snapshot(bird), middle)).toBe(0);
        // Target release remains exact even for a stopped but displaced leg.
        bird.update({ walking: 0, footTargets: targets });
        bird.update({ walking: 0, footTargets: targets, footTargetBlend: 0 }); const released = snapshot(bird);
        bird.update({ walking: 0 }); expect(delta(snapshot(bird), released)).toBe(0);
      } finally { bird.dispose(); }
    }
  });
});
