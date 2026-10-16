import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function fixture(options = {}) {
  const localWindow = {}, scene = new THREE.Scene();
  new Function('window', source)(localWindow);
  const wildlife = localWindow.BirdLab3DWildlife.create(THREE, scene, options);
  return { scene, wildlife };
}
function transforms(root) {
  const result = [];
  root.traverse(object => result.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()));
  return result;
}

describe('BirdLab woodland residents', () => {
  it.each(['high', 'low'])('keeps recognizable species at distinct authentic scales without network or canvas assets (%s)', quality => {
    const { scene, wildlife } = fixture({ quality });
    try {
      expect(wildlife.snapshot().map(b => [b.id, b.scientificName])).toEqual([
        ['robin', 'Turdus migratorius'], ['chickadee', 'Poecile atricapillus'],
      ]);
      const robin = scene.getObjectByName('woodland-robin'), chickadee = scene.getObjectByName('woodland-chickadee');
      expect(chickadee.scale.x / robin.scale.x).toBe(.57);
      expect(chickadee.getObjectByName('head-plumage').userData.fieldmarks).toEqual(['black-cap', 'white-cheek', 'black-bib']);
      expect(robin.getObjectByName('broken-eye-ring')).toBeTruthy();
      for (const bird of [robin, chickadee]) {
        expect(bird.getObjectByName('layered-primaries')).toBeTruthy();
        expect(bird.getObjectByName('layered-secondaries')).toBeTruthy();
        expect(bird.getObjectByName('individual-tail-feathers')).toBeTruthy();
        const size = new THREE.Box3().setFromObject(bird).getSize(new THREE.Vector3());
        expect(size.length()).toBeGreaterThan(.1);
        expect(size.length()).toBeLessThan(.36);
      }
    } finally { wildlife.dispose(); }
  });

  it('repeats exactly after seeks, across playback cadence, and around the 44-second seam', () => {
    const { wildlife } = fixture();
    try {
      for (const t of [0, 3.1, 7.5, 14.6, 26.9, 33.2, 43.999]) {
        wildlife.update(t); const expected = transforms(wildlife.root), observation = wildlife.snapshot();
        wildlife.update(t + 17); wildlife.update(t);
        expect(transforms(wildlife.root)).toEqual(expected); expect(wildlife.snapshot()).toEqual(observation);
        wildlife.update(t + 44);
        const repeated = transforms(wildlife.root);
        expect(Math.max(...repeated.map((value, index) => Math.abs(value - expected[index])))).toBeLessThan(2e-12);
      }
      for (const fps of [30, 60, 144]) {
        for (let frame = 0; frame <= fps * 15; frame++) wildlife.update(frame / fps);
        const played = transforms(wildlife.root); wildlife.update(31); wildlife.update(15);
        expect(transforms(wildlife.root)).toEqual(played);
      }
    } finally { wildlife.dispose(); }
  });

  it('has continuous value and velocity at launch, landing, hops and loop boundaries', () => {
    const { wildlife } = fixture(), epsilon = 1e-5;
    try {
      const boundaries = [0, 2.25, 2.7, 3.35, 3.8, 4.2, 4.8, 13.25, 13.54, 13.7, 14.04, 14.72, 14.9, 15.12,
        15.35, 22.1, 22.7, 24.2, 24.8, 31.55, 31.84, 32, 32.97, 33.15, 33.37, 33.6, 44];
      for (const offset of [0, -7.3]) for (const boundary of boundaries) {
        wildlife.update(boundary + offset - epsilon); const before = transforms(wildlife.root);
        wildlife.update(boundary + offset); const at = transforms(wildlife.root);
        wildlife.update(boundary + offset + epsilon); const after = transforms(wildlife.root);
        const jump = Math.max(...at.map((value, i) => Math.abs(value - before[i])));
        const velocityJump = Math.max(...at.map((value, i) => Math.abs((after[i] - value) / epsilon - (value - before[i]) / epsilon)));
        expect(jump).toBeLessThan(.001);
        expect(velocityJump).toBeLessThan(.06);
      }
    } finally { wildlife.dispose(); }
  });

  it('plants both feet on the supplied slope while stationary and at touchdown', () => {
    const groundHeight = (x, z) => .08 * x - .04 * z;
    const { scene, wildlife } = fixture({ groundHeight }), point = new THREE.Vector3();
    try {
      for (const id of ['robin', 'chickadee']) {
        const phase = id === 'robin' ? 0 : 7.3, bird = scene.getObjectByName('woodland-' + id);
        for (const time of [0, 5.5, 7.5, 14.9, 15.05, 29, 33.15, 40]) {
          wildlife.update(time - phase); scene.updateMatrixWorld(true);
          for (const side of [-1, 1]) {
            const foot = bird.getObjectByName(id + '-foot-' + side); foot.getWorldPosition(point);
            expect(point.y).toBeCloseTo(groundHeight(point.x, point.z), 10);
            expect(foot.rotation.x).toBeCloseTo(0, 10);
          }
        }
      }
    } finally { wildlife.dispose(); }
  });

  it('anchors each robin stance foot in world space while the body advances over it', () => {
    const groundHeight = (x, z) => .07 * x - .035 * z;
    const { scene, wildlife } = fixture({ groundHeight });
    const bird = scene.getObjectByName('woodland-robin'), feet = [-1, 1].map(side => bird.getObjectByName('robin-foot-' + side));
    const point = new THREE.Vector3(), first = new THREE.Vector3(), bodyStart = new THREE.Vector3();
    try {
      for (const [start, end] of [[2.7, 3.35], [4.2, 4.8], [22.1, 22.7], [24.2, 24.8]]) {
        for (let step = 0; step < 6; step++) {
          const stance = feet[1 - step % 2], swing = feet[step % 2];
          let sampled = false;
          for (const sample of [.12, .35, .62, .88]) {
            wildlife.update(start + (end - start) * (step + sample) / 6); scene.updateMatrixWorld(true);
            stance.getWorldPosition(point);
            expect(point.y).toBeCloseTo(groundHeight(point.x, point.z), 10);
            if (!sampled) { first.copy(point); bodyStart.copy(bird.position); sampled = true; }
            else expect(point.distanceTo(first)).toBeLessThan(1e-10);
            swing.getWorldPosition(point);
            expect(point.y - groundHeight(point.x, point.z)).toBeGreaterThan(.002);
            expect(Math.abs(stance.position.z)).toBeLessThan(.037);
          }
          expect(bird.position.distanceTo(bodyStart)).toBeGreaterThan(.001);
        }
        for (const time of [start, end]) {
          wildlife.update(time);
          for (const foot of feet) expect(foot.position.z).toBeCloseTo(-.002, 12);
        }
      }
    } finally { wildlife.dispose(); }
  });

  it('keeps toe placement and velocity continuous through each swing and contact handoff', () => {
    const { wildlife } = fixture(), epsilon = 1e-6;
    try {
      for (const [start, end] of [[2.7, 3.35], [4.2, 4.8], [22.1, 22.7], [24.2, 24.8]]) for (let step = 0; step <= 6; step++) {
        const time = start + (end - start) * step / 6;
        wildlife.update(time - epsilon); const before = transforms(wildlife.root);
        wildlife.update(time); const at = transforms(wildlife.root);
        wildlife.update(time + epsilon); const after = transforms(wildlife.root);
        expect(Math.max(...at.map((value, index) => Math.abs(after[index] - 2 * value + before[index]) / epsilon))).toBeLessThan(.015);
      }
    } finally { wildlife.dispose(); }
  });

  it('holds a sightline between brief smooth head turns instead of continuously swaying', () => {
    const { scene, wildlife } = fixture(), epsilon = 1e-5;
    try {
      for (const [id, phase] of [['robin', 0], ['chickadee', 7.3]]) {
        const head = scene.getObjectByName(id + '-head');
        for (const [start, end] of [[.2, .8], [1.6, 2.1], [5.1, 5.3], [10.9, 11.4], [18, 19], [36, 37]]) {
          wildlife.update(start - phase); const held = head.quaternion.clone();
          for (let i = 1; i <= 12; i++) {
            wildlife.update(start + (end - start) * i / 12 - phase);
            expect(1 - Math.abs(held.dot(head.quaternion))).toBeLessThan(1e-12);
          }
        }
        let previous = Infinity;
        for (let i = 0; i <= 100; i++) {
          wildlife.update(1.1 + .24 * i / 100 - phase);
          expect(head.rotation.y).toBeLessThanOrEqual(previous + 1e-12); previous = head.rotation.y;
        }
        for (const boundary of [0, 1.1, 1.34, 5.5, 5.78, 17.2, 17.49, 35.1, 35.4, 40.7, 40.99, 44]) {
          wildlife.update(boundary - phase - epsilon); const before = head.rotation.y;
          wildlife.update(boundary - phase); const at = head.rotation.y;
          wildlife.update(boundary - phase + epsilon); const after = head.rotation.y;
          expect(Math.abs((after - 2 * at + before) / epsilon)).toBeLessThan(.002);
        }
      }
    } finally { wildlife.dispose(); }
  });

  it('brings the robin bill to the leaf litter and keeps flights in the open clearing', () => {
    const { scene, wildlife } = fixture(), tip = new THREE.Vector3();
    try {
      wildlife.update(7.5); scene.updateMatrixWorld(true);
      const bill = scene.getObjectByName('woodland-robin').getObjectByName('tapered-bill');
      tip.set(0, .5, 0).applyMatrix4(bill.matrixWorld);
      expect(tip.y).toBeGreaterThan(0); expect(tip.y).toBeLessThan(.008);
      let airborne = false, robinRan = false, chickadeeHopped = false;
      for (let tick = 0; tick <= 880; tick++) {
        wildlife.update(tick * .05);
        for (const bird of wildlife.snapshot()) {
          const origin = bird.id === 'robin' ? [1.65, -.75] : [-1.45, 1.3];
          expect(Math.hypot(bird.position[0] - origin[0], bird.position[2] - origin[1])).toBeLessThan(.52);
          expect(bird.altitude).toBeGreaterThanOrEqual(0); expect(bird.altitude).toBeLessThan(.48);
          airborne ||= bird.altitude > .3; robinRan ||= bird.behavior === 'Scurrying'; chickadeeHopped ||= bird.behavior === 'Hopping';
        }
      }
      expect(airborne && robinRan && chickadeeHopped).toBe(true);
    } finally { wildlife.dispose(); }
  });

  it.each(['high', 'low'])('lays folded flight feathers down their own flank without crossing the torso (%s)', quality => {
    const { scene, wildlife } = fixture({ quality }), point = new THREE.Vector3(), normal = new THREE.Vector3();
    const inverse = new THREE.Matrix4(), transform = new THREE.Matrix4(), normals = new THREE.Matrix3();
    try {
      for (const [id, phase] of [['robin', 0], ['chickadee', 7.3]]) {
        wildlife.update(-phase); scene.updateMatrixWorld(true);
        inverse.copy(scene.getObjectByName(id + '-body').matrixWorld).invert();
        for (const side of [-1, 1]) {
          const wing = scene.getObjectByName(id + '-wing-' + side);
          let lateralNormal = 0, vertices = 0;
          wing.traverse(mesh => {
            if (!mesh.isMesh) return;
            transform.copy(inverse).multiply(mesh.matrixWorld); normals.getNormalMatrix(transform);
            const position = mesh.geometry.attributes.position, attributes = mesh.geometry.attributes.normal;
            for (let vertex = 0; vertex < position.count; vertex++) {
              point.fromBufferAttribute(position, vertex).applyMatrix4(transform);
              expect(point.x * side).toBeGreaterThan(mesh.name === 'layered-secondaries' ? .022 : .013);
              expect(point.x * side).toBeLessThan(.040);
              expect(point.y).toBeGreaterThan(-.030);
              expect(point.z).toBeLessThan(.106);
              normal.fromBufferAttribute(attributes, vertex).applyMatrix3(normals).normalize();
              lateralNormal += Math.abs(normal.x); vertices++;
            }
          });
          expect(lateralNormal / vertices).toBeGreaterThan(.90);
        }
      }
    } finally { wildlife.dispose(); }
  });

  it('preserves fully open flight poses and keeps wing vanes above the ground through deployment', () => {
    const { scene, wildlife } = fixture(), expected = new THREE.Quaternion(), point = new THREE.Vector3();
    try {
      for (const [id, phase, rate] of [['robin', 0, 7], ['chickadee', 7.3, 11]]) {
        for (const time of [14.1, 14.3, 14.5, 32.5, 32.7]) {
          wildlife.update(time - phase);
          const beat = Math.PI * 2 * rate * time, stroke = Math.sin(beat) + .18 * Math.sin(beat * 2);
          for (const side of [-1, 1]) {
            const wing = scene.getObjectByName(id + '-wing-' + side);
            expected.setFromEuler(new THREE.Euler(0, 0, side * (.13 + stroke * .79), 'XYZ'));
            expect(1 - Math.abs(expected.dot(wing.quaternion))).toBeLessThan(1e-12);
            expect(wing.position.x).toBe(side * .027);
            const wrist = wing.getObjectByName('wrist');
            expect(wrist.rotation.z).toBeCloseTo(.14 + Math.sin(beat - .38) * .28, 10);
          }
        }
        let minimumHeight = Infinity;
        for (let tick = 0; tick <= 180; tick++) {
          const time = 13.3 + tick * .012;
          wildlife.update(time - phase); scene.updateMatrixWorld(true);
          for (const side of [-1, 1]) scene.getObjectByName(id + '-wing-' + side).traverse(mesh => {
            if (!mesh.isMesh) return;
            const position = mesh.geometry.attributes.position;
            for (let vertex = 0; vertex < position.count; vertex++) {
              point.fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
              minimumHeight = Math.min(minimumHeight, point.y);
            }
          });
        }
        expect(minimumHeight).toBeGreaterThan(0);
      }
    } finally { wildlife.dispose(); }
  });

  it('retains geometry and materials through animation and disposes each resource once', () => {
    const { scene, wildlife } = fixture(), resources = new Map(), identity = [];
    wildlife.root.traverse(object => {
      if (!object.isMesh) return;
      identity.push([object, object.geometry, object.material]);
      for (const resource of [object.geometry, object.material]) if (!resources.has(resource)) {
        resources.set(resource, 0); resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
      }
      for (const attribute of Object.values(object.geometry.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
    });
    for (let frame = 0; frame < 400; frame++) wildlife.update(frame * .11);
    for (const [object, geometry, material] of identity) { expect(object.geometry).toBe(geometry); expect(object.material).toBe(material); }
    const focus = new THREE.Vector3();
    expect(wildlife.getFocus('chickadee', focus)).toBe(focus); expect(focus.y).toBeGreaterThan(0);
    expect(wildlife.getFocus('unknown', focus)).toBeNull();
    wildlife.dispose(); const frozen = transforms(wildlife.root); wildlife.update(15); wildlife.dispose();
    expect(transforms(wildlife.root)).toEqual(frozen); expect(scene.children).not.toContain(wildlife.root);
    expect([...resources.values()].every(count => count === 1)).toBe(true);
  });

  it('ships the identical model to the desktop app', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/birdlab_3d_wildlife.js', 'utf8')).toBe(source);
  });
});
