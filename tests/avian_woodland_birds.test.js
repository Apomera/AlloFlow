import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function library() {
  const window = {};
  new Function('window', source)(window);
  return window.AvianWoodlandBirds;
}
function transforms(root) {
  const values = [];
  root.traverse(object => values.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()));
  return values;
}
function actualBounds(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3(), point = new THREE.Vector3();
  root.traverse(object => {
    if (!object.isMesh) return;
    const position = object.geometry.attributes.position;
    for (let index = 0; index < position.count; index++) bounds.expandByPoint(point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld));
  });
  return bounds;
}
function resources(root) {
  const found = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    found.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      found.add(material);
      for (const value of Object.values(material)) if (value && value.isTexture) found.add(value);
    }
  });
  return found;
}

// Every added resident meets the contracts the original residents meet.
const ADDED_RESIDENTS = ['darkEyedJunco', 'tuftedTitmouse', 'easternTowhee', 'americanRobin', 'blackCappedChickadee'];
describe('shared woodland bird models', () => {
  it('advertises only the available species and exposes the common articulation contract', () => {
    const api = library();
    expect(api.version).toBe('1.0.0');
    for (const id of ['mourningDove', 'grouse', ...ADDED_RESIDENTS]) expect(api.supports(id)).toBe(true);
    for (const id of ['hawk', '', null, undefined]) expect(api.supports(id)).toBe(false);
    const bird = api.create(THREE, 'mourningDove', { quality: 'high' });
    try {
      for (const name of ['root', 'body', 'head', 'tail']) expect(bird[name].isGroup).toBe(true);
      expect(bird.wings).toHaveLength(2);
      expect(bird.wings.left).toBe(bird.wings[0]); expect(bird.wings.right).toBe(bird.wings[1]);
      for (const wing of bird.wings) expect(wing.isGroup).toBe(true);
      expect(typeof bird.update).toBe('function'); expect(typeof bird.dispose).toBe('function');
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('builds finite feather geometry with distinct species silhouettes and grounded feet (%s)', quality => {
    const api = library(), birds = ['mourningDove', 'grouse'].map(id => api.create(THREE, id, { quality }));
    try {
      const sizes = [];
      for (const bird of birds) {
        bird.update({ flight: 0, phase: 0, effort: 0, peck: 0, walking: 0 });
        let vertices = 0, largestNormalError = 0;
        bird.root.traverse(object => {
          if (!object.isMesh) return;
          const { position, normal } = object.geometry.attributes;
          expect(position.count).toBeGreaterThan(0); expect(normal.count).toBe(position.count);
          vertices += position.count;
          for (const attribute of Object.values(object.geometry.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
          if (object.geometry.index) {
            let lowest = Infinity, highest = -Infinity;
            for (const index of object.geometry.index.array) { lowest = Math.min(lowest, index); highest = Math.max(highest, index); }
            expect(lowest).toBeGreaterThanOrEqual(0); expect(highest).toBeLessThan(position.count);
          }
          for (let index = 0; index < normal.count; index++) largestNormalError = Math.max(largestNormalError,
            Math.abs(Math.hypot(normal.getX(index), normal.getY(index), normal.getZ(index)) - 1));
        });
        expect(vertices).toBeGreaterThan(200); expect(largestNormalError).toBeLessThan(2e-5);
        const bounds = actualBounds(bird.root), size = bounds.getSize(new THREE.Vector3()); sizes.push(size);
        expect(bounds.min.y).toBeGreaterThan(-.004); expect(size.z).toBeGreaterThan(.24); expect(size.z).toBeLessThan(.52);
        const head = bird.head.getWorldPosition(new THREE.Vector3()), body = bird.body.getWorldPosition(new THREE.Vector3());
        const tail = bird.tail.getWorldPosition(new THREE.Vector3());
        expect(head.z).toBeGreaterThan(body.z); expect(tail.z).toBeLessThan(body.z);
        for (const name of ['woodland-left-foot', 'woodland-right-foot']) {
          const foot = bird.root.getObjectByName(name); expect(foot).toBeTruthy();
          const footBounds = actualBounds(foot);
          expect(Math.abs(footBounds.min.y)).toBeLessThan(.004);
        }
      }
      expect(sizes[1].y).toBeGreaterThan(sizes[0].y * 1.2);
      expect(sizes[1].z).toBeGreaterThan(sizes[0].z * 1.1);
    } finally { birds.forEach(bird => bird.dispose()); }
  });

  it.each(['mourningDove', 'grouse', ...ADDED_RESIDENTS])('articulates %s with bounded flight and preserves its caller-owned placement', id => {
    const bird = library().create(THREE, id, { quality: 'high' });
    try {
      bird.update({ flight: 0, phase: 0, effort: 0 });
      const folded = actualBounds(bird.root).getSize(new THREE.Vector3());
      let widest = 0;
      for (let index = 0; index < 48; index++) {
        const phase = index * Math.PI / 12;
        bird.update({ flight: 1, phase, effort: .8, bank: Math.sin(phase) * .5, tailSpread: .7 });
        const size = actualBounds(bird.root).getSize(new THREE.Vector3()); widest = Math.max(widest, size.x);
        expect(size.x).toBeLessThan(1); expect(size.y).toBeLessThan(.8); expect(size.z).toBeLessThan(.7);
        expect(transforms(bird.root).every(Number.isFinite)).toBe(true);
      }
      expect(widest).toBeGreaterThan(folded.x * 1.5);
      const point = new THREE.Vector3();
      for (let index = 0; index <= 24; index++) {
        bird.update({ flight: index / 24, phase: index * .47, effort: .9, peck: .7, tailSpread: .8 });
        const size = actualBounds(bird.root).getSize(new THREE.Vector3());
        expect(size.toArray().every(Number.isFinite)).toBe(true);
        expect(size.x).toBeLessThan(1); expect(size.y).toBeLessThan(.8); expect(size.z).toBeLessThan(.7);
        let boundExcess = -Infinity, normalError = 0;
        bird.root.traverse(object => {
          if (!object.isMesh) return;
          const { position, normal } = object.geometry.attributes, sphere = object.geometry.boundingSphere;
          for (let vertex = 0; vertex < position.count; vertex++) {
            point.fromBufferAttribute(position, vertex);
            boundExcess = Math.max(boundExcess, point.distanceTo(sphere.center) - sphere.radius);
            normalError = Math.max(normalError, Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
          }
        });
        expect(boundExcess).toBeLessThan(0); expect(normalError).toBeLessThan(2e-5);
      }
      bird.root.position.set(12, 3, -7); bird.root.rotation.set(.2, -.6, .12); bird.root.scale.set(1.1, 1.2, .9);
      const placement = [...bird.root.position.toArray(), ...bird.root.quaternion.toArray(), ...bird.root.scale.toArray()];
      for (let index = 0; index <= 64; index++) {
        bird.update({ flight: index / 64, phase: index * .41, effort: .7, bank: -.3, lookYaw: .4, lookPitch: -.2,
          peck: Math.sin(index * .1) ** 2, stride: index * .3, walking: .8, tailSpread: index / 64 });
        expect([...bird.root.position.toArray(), ...bird.root.quaternion.toArray(), ...bird.root.scale.toArray()]).toEqual(placement);
        expect(transforms(bird.root).every(Number.isFinite)).toBe(true);
      }
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('retains resources and attribute arrays while updates remain deterministic (%s)', quality => {
    const bird = library().create(THREE, 'grouse', { quality }), meshes = [];
    try {
      bird.root.traverse(object => {
        if (object.isMesh) meshes.push({ object, geometry: object.geometry, material: object.material,
          attributes: Object.entries(object.geometry.attributes).map(([name, attribute]) => [name, attribute, attribute.array]) });
      });
      const initialResources = resources(bird.root), pose = { flight: .46, phase: 2.7, effort: .65, bank: .2,
        lookYaw: -.3, lookPitch: .1, peck: .2, stride: 1.8, walking: .7, tailSpread: .6 };
      bird.update(pose); const expectedTransforms = transforms(bird.root);
      const expectedPositions = meshes.map(({ geometry }) => geometry.attributes.position.array.slice());
      for (let frame = 0; frame < 250; frame++) bird.update({ flight: (1 + Math.sin(frame * .07)) / 2, phase: frame * .3,
        effort: .8, peck: .3, walking: .6, stride: frame * .2, tailSpread: .8 });
      bird.update(pose);
      expect(transforms(bird.root)).toEqual(expectedTransforms);
      expect(resources(bird.root)).toEqual(initialResources);
      meshes.forEach(({ object, geometry, material, attributes }, index) => {
        expect(object.geometry).toBe(geometry); expect(object.material).toBe(material);
        for (const [name, attribute, array] of attributes) {
          expect(geometry.attributes[name]).toBe(attribute); expect(attribute.array).toBe(array);
          expect([...array].every(Number.isFinite)).toBe(true);
        }
        expect(geometry.attributes.position.array).toEqual(expectedPositions[index]);
      });
    } finally { bird.dispose(); }
  });

  it.each(['mourningDove', 'grouse', ...ADDED_RESIDENTS])('brings the %s bill to the ground without penetrating it during a peck', id => {
    for (const quality of ['high', 'low']) {
      const bird = library().create(THREE, id, { quality }), point = new THREE.Vector3();
      try {
        const face = bird.root.getObjectByName('woodland-eyes-and-bill'), position = face.geometry.attributes.position;
        let foremost = -Infinity;
        for (let vertex = 0; vertex < position.count; vertex++) foremost = Math.max(foremost, position.getZ(vertex));
        const tip = [];
        for (let vertex = 0; vertex < position.count; vertex++) if (Math.abs(position.getZ(vertex) - foremost) < 1e-7) tip.push(vertex);
        expect(tip.length).toBeGreaterThan(0);
        let lowestFace = Infinity;
        for (let step = 0; step <= 40; step++) {
          bird.update({ flight: 0, peck: step / 40, lookPitch: 0, lookYaw: 0 }); bird.root.updateMatrixWorld(true);
          for (let vertex = 0; vertex < position.count; vertex++) {
            point.fromBufferAttribute(position, vertex).applyMatrix4(face.matrixWorld);
            lowestFace = Math.min(lowestFace, point.y);
          }
        }
        expect(lowestFace).toBeGreaterThanOrEqual(0);
        let tipHeight = Infinity;
        for (const vertex of tip) tipHeight = Math.min(tipHeight, point.fromBufferAttribute(position, vertex).applyMatrix4(face.matrixWorld).y);
        expect(tipHeight).toBeGreaterThanOrEqual(0); expect(tipHeight).toBeLessThan(.003);
      } finally { bird.dispose(); }
    }
  });

  it.each(['mourningDove', 'grouse', ...ADDED_RESIDENTS])('refreshes cached Box3 bounds in place when %s changes wing and neck shape', id => {
    for (const quality of ['high', 'low']) {
      const bird = library().create(THREE, id, { quality });
      try {
        bird.update({ flight: 0, peck: 0 });
        const resting = new THREE.Box3().setFromObject(bird.root), references = [];
        bird.root.traverse(object => { if (object.isMesh) references.push([object.geometry, object.geometry.boundingBox]); });
        bird.update({ flight: 1, phase: 0, effort: 0, tailSpread: 1 });
        const extended = new THREE.Box3().setFromObject(bird.root);
        expect(extended.max.x - extended.min.x).toBeGreaterThan((resting.max.x - resting.min.x) * 1.5);
        for (const pose of [{ flight: 1, phase: .7, effort: .8, tailSpread: 1 },
          { flight: .45, phase: 2.2, effort: .5, peck: .7, tailSpread: .4 }, { flight: 0, peck: 1, tailSpread: 0 }]) {
          bird.update(pose);
          const cached = new THREE.Box3().setFromObject(bird.root), actual = actualBounds(bird.root);
          for (const axis of ['x', 'y', 'z']) {
            expect(cached.min[axis] - actual.min[axis]).toBeLessThanOrEqual(1e-10);
            expect(actual.max[axis] - cached.max[axis]).toBeLessThanOrEqual(1e-10);
          }
          for (const [geometry, boundingBox] of references) expect(geometry.boundingBox).toBe(boundingBox);
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps overlapping folded vanes separated at observation-scale depth precision (%s)', quality => {
    for (const id of ['mourningDove', 'grouse', ...ADDED_RESIDENTS]) {
      const bird = library().create(THREE, id, { quality }), origin = new THREE.Vector3(), ray = new THREE.Raycaster();
      try {
        bird.update({ flight: 0 }); bird.root.updateMatrixWorld(true);
        const wing = bird.wings.right.getObjectByName('woodland-layered-wing'), geometry = wing.geometry;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox, direction = new THREE.Vector3(0, -1, 0).transformDirection(wing.matrixWorld);
        let pairs = 0, nearPairs = 0, visiblePairs = 0, nearVisiblePairs = 0;
        // Jittered rays avoid repeatedly hitting shared triangle edges. Allow
        // isolated feather-edge crossings, but reject a mantle whose layers
        // collapse onto the same surface and fight at micrometre depth scales.
        for (let x = 0; x < 20; x++) for (let z = 0; z < 28; z++) {
          origin.set(box.min.x + (box.max.x - box.min.x) * (x + .371) / 20, box.max.y + .1,
            box.min.z + (box.max.z - box.min.z) * (z + .413) / 28).applyMatrix4(wing.matrixWorld);
          ray.set(origin, direction);
          const hits = ray.intersectObject(wing, false);
          if (hits.length > 1) { visiblePairs++; if (hits[1].distance - hits[0].distance < .000005) nearVisiblePairs++; }
          for (let hit = 1; hit < hits.length; hit++) {
            pairs++; if (hits[hit].distance - hits[hit - 1].distance < .000005) nearPairs++;
          }
        }
        expect(visiblePairs).toBeGreaterThan(200); expect(pairs).toBeGreaterThan(1000);
        expect(nearPairs / pairs).toBeLessThan(.04);
        expect(nearVisiblePairs / visiblePairs).toBeLessThan(.06);
      } finally { bird.dispose(); }
    }
  });

  it.each(['mourningDove', 'grouse', ...ADDED_RESIDENTS])('keeps %s wingbeat phase periodic and eases wing and foot deployment', id => {
    const bird = library().create(THREE, id, { quality: 'high' }), epsilon = .0005;
    function articulation() {
      const values = [];
      for (const wing of bird.wings) {
        values.push(...wing.position.toArray(), ...wing.quaternion.toArray());
        const mesh = wing.getObjectByName('woodland-layered-wing');
        for (const value of mesh.geometry.attributes.position.array) values.push(value);
      }
      for (const foot of bird.feet) values.push(...foot.position.toArray(), ...foot.quaternion.toArray());
      return values;
    }
    try {
      const samples = [-epsilon, 0, epsilon, Math.PI * 2].map(phase => {
        bird.update({ flight: 1, phase, effort: .8 }); return articulation();
      });
      let periodicError = 0, velocityJump = 0;
      for (let index = 0; index < samples[0].length; index++) {
        periodicError = Math.max(periodicError, Math.abs(samples[1][index] - samples[3][index]));
        velocityJump = Math.max(velocityJump, Math.abs((samples[2][index] - 2 * samples[1][index] + samples[0][index]) / epsilon));
      }
      expect(periodicError).toBeLessThan(1e-7); expect(velocityJump).toBeLessThan(.01);
      for (const boundary of [0, .1, .88, 1]) {
        const poses = [-epsilon, 0, epsilon].map(offset => {
          bird.update({ flight: boundary + offset, phase: 4.2, effort: .8 }); return articulation();
        });
        let jump = 0;
        for (let index = 0; index < poses[0].length; index++) jump = Math.max(jump,
          Math.abs((poses[2][index] - 2 * poses[1][index] + poses[0][index]) / epsilon));
        expect(jump).toBeLessThan(.012);
      }
    } finally { bird.dispose(); }
  });

  it.each(['mourningDove', 'grouse', ...ADDED_RESIDENTS])('recovers the %s outer hand independently while the shoulder vanes stay seated', id => {
    const bird = library().create(THREE, id, { quality: 'high' });
    try {
      const mesh = bird.wings.right.getObjectByName('woodland-layered-wing'), position = mesh.geometry.attributes.position;
      bird.update({ flight: 1, phase: 0, effort: 0 });
      const extended = position.array.slice();
      let span = 0;
      for (let vertex = 0; vertex < position.count; vertex++) span = Math.max(span, extended[vertex * 3]);
      bird.update({ flight: 1, phase: Math.PI * .5, effort: 1 }); const power = position.array.slice();
      bird.update({ flight: 1, phase: Math.PI * 1.5, effort: 1 });
      let innerMovement = 0, outerMovement = 0, innerCount = 0, outerCount = 0;
      for (let vertex = 0; vertex < position.count; vertex++) {
        const offset = vertex * 3, distance = Math.hypot(position.array[offset] - power[offset], position.array[offset + 2] - power[offset + 2]);
        if (extended[offset] < span * .14) { innerCount++; innerMovement = Math.max(innerMovement, distance); }
        if (extended[offset] > span * .75) { outerCount++; outerMovement = Math.max(outerMovement, distance); }
      }
      expect(innerCount).toBeGreaterThan(20); expect(outerCount).toBeGreaterThan(20);
      expect(innerMovement).toBeLessThan(1e-7); expect(outerMovement).toBeGreaterThan(.01);
    } finally { bird.dispose(); }
  });

  it.each(['bank', 'landing'])('updates wing loading when only %s changes and restores it on reverse seeks', property => {
    for (const id of ['mourningDove', 'grouse', ...ADDED_RESIDENTS]) {
      const api = library(), bird = api.create(THREE, id, { quality: 'low' }), direct = api.create(THREE, id, { quality: 'low' });
      const pose = { flight: .7, phase: 1.2, effort: .8, bank: 0, landing: 0 };
      try {
        const positions = model => model.wings.map(wing => wing.getObjectByName('woodland-layered-wing').geometry.attributes.position.array.slice());
        bird.update(pose); const initial = positions(bird);
        const changed = { ...pose, [property]: .6 };
        bird.update(changed); direct.update(changed);
        expect(positions(bird)).not.toEqual(initial);
        expect(positions(bird)).toEqual(positions(direct));
        bird.update(pose); expect(positions(bird)).toEqual(initial);
      } finally { bird.dispose(); direct.dispose(); }
    }
  });

  it.each(['high', 'low'])('retains a finite feathered neck with its upper ring inside the moving head (%s)', quality => {
    for (const id of ['mourningDove', 'grouse', ...ADDED_RESIDENTS]) {
      const bird = library().create(THREE, id, { quality }), point = new THREE.Vector3(), center = new THREE.Vector3(), inverse = new THREE.Matrix4();
      try {
        const neck = bird.root.getObjectByName('woodland-neck-plumage'), geometry = neck.geometry;
        const position = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv, kind = geometry.attributes.featherInfo;
        const head = bird.root.getObjectByName('woodland-head-plumage'); head.geometry.computeBoundingBox();
        const samples = [{}, { flight: 1, phase: 1.2 }, { flight: .5, landing: .8, phase: 4.1 },
          { peck: .5 }, { peck: 1 }, { lookYaw: .9, lookPitch: .5 }, { lookYaw: -.9, lookPitch: -.5 },
          { peck: 1, lookYaw: .8 }, { flight: 1, lookYaw: -.8, lookPitch: .4 }];
        for (const pose of samples) {
          bird.update(pose); bird.root.updateMatrixWorld(true);
          expect(geometry.attributes.position).toBe(position); expect(geometry.attributes.normal).toBe(normal);
          center.set(0, 0, 0); let upperCount = 0, normalError = 0, boundExcess = -Infinity;
          for (let vertex = 0; vertex < position.count; vertex++) {
            point.fromBufferAttribute(position, vertex);
            expect(point.toArray().every(Number.isFinite)).toBe(true);
            boundExcess = Math.max(boundExcess, point.distanceTo(geometry.boundingSphere.center) - geometry.boundingSphere.radius);
            normalError = Math.max(normalError, Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
            if (kind.getX(vertex) === 6 && uv.getY(vertex) > .999) { center.add(point); upperCount++; }
          }
          expect(normalError).toBeLessThan(2e-5); expect(boundExcess).toBeLessThan(0); expect(upperCount).toBeGreaterThan(0);
          center.multiplyScalar(1 / upperCount).applyMatrix4(neck.matrixWorld);
          inverse.copy(head.matrixWorld).invert(); center.applyMatrix4(inverse);
          expect(head.geometry.boundingBox.containsPoint(center)).toBe(true);
        }
      } finally { bird.dispose(); }
    }
  }, 20000);

  it('keeps instances independent and disposes each owned resource exactly once', () => {
    const api = library(), a = api.create(THREE, 'mourningDove', { quality: 'low' });
    const b = api.create(THREE, 'mourningDove', { quality: 'low' });
    const countsA = new Map([...resources(a.root)].map(resource => [resource, 0]));
    const countsB = new Map([...resources(b.root)].map(resource => [resource, 0]));
    for (const [resource] of countsA) resource.addEventListener('dispose', () => countsA.set(resource, countsA.get(resource) + 1));
    for (const [resource] of countsB) resource.addEventListener('dispose', () => countsB.set(resource, countsB.get(resource) + 1));
    try {
      b.update({ flight: .35, phase: 1.2, peck: .3 }); const original = transforms(b.root);
      const arrays = [];
      b.root.traverse(object => { if (object.isMesh) arrays.push([object.geometry.attributes.position.array, object.geometry.attributes.position.array.slice()]); });
      a.update({ flight: 1, phase: 4.2, effort: 1, lookYaw: .7, tailSpread: 1 });
      expect(transforms(b.root)).toEqual(original);
      for (const [current, expected] of arrays) expect(current).toEqual(expected);
      a.dispose(); a.dispose();
      expect([...countsA.values()].every(count => count === 1)).toBe(true);
      expect([...countsB.values()].every(count => count === 0)).toBe(true);
      b.update({ flight: 1, phase: 3, effort: .8 });
      expect(transforms(b.root).every(Number.isFinite)).toBe(true);
      b.dispose(); b.dispose();
      expect([...countsB.values()].every(count => count === 1)).toBe(true);
    } finally { a.dispose(); b.dispose(); }
  });
});
