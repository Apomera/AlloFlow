import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const SPECIES = ['americanGoldfinch', 'easternBluebird', 'whiteThroatedSparrow'];
function library() { const window = {}; new Function('window', source)(window); return window.AvianWoodlandBirds; }
function meshes(bird) { const result = []; bird.root.traverse(object => { if (object.isMesh) result.push(object); }); return result; }
function meanColor(mesh, select) {
  const attributes = mesh.geometry.attributes, sum = [0, 0, 0]; let count = 0;
  for (let index = 0; index < attributes.position.count; index++) {
    if (!select(attributes, index)) continue;
    sum[0] += attributes.color.getX(index); sum[1] += attributes.color.getY(index); sum[2] += attributes.color.getZ(index); count++;
  }
  expect(count).toBeGreaterThan(4);
  return sum.map(value => value / count);
}
function positionsHash(bird) {
  const hash = createHash('sha256');
  for (const mesh of meshes(bird)) {
    const positions = mesh.geometry.attributes.position.array;
    hash.update(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength));
    hash.update(JSON.stringify([...mesh.position.toArray(), ...mesh.quaternion.toArray()]));
  }
  bird.root.traverse(object => hash.update(JSON.stringify([...object.position.toArray(), ...object.quaternion.toArray()])));
  return hash.digest('hex');
}
function bounds(bird) {
  bird.root.updateMatrixWorld(true); const box = new THREE.Box3(), point = new THREE.Vector3();
  for (const mesh of meshes(bird)) for (let index = 0; index < mesh.geometry.attributes.position.count; index++) {
    point.fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld); box.expandByPoint(point);
  }
  return box;
}

describe('three additional native BirdLab species', () => {
  it('keeps explicit adult plumage, scale and profile contracts', () => {
    const api = library();
    const labels = ['Breeding adult male', 'Adult male', 'White-striped adult'], sizes = [.13, .18, .17];
    expect(api.supports('goldfinch')).toBe(false);
    SPECIES.forEach((id, index) => {
      expect(api.supports(id)).toBe(true); const bird = api.create(THREE, id, { quality: 'low' });
      try {
        expect(bird.root.name).toBe('avian-woodland-' + id); expect(bird.root.userData.plumage).toBe(labels[index]);
        expect(bird.profile.speciesId).toBe(id); expect(bird.profile.sizeM).toBe(sizes[index]); expect(Object.isFrozen(bird.profile)).toBe(true);
      } finally { bird.dispose(); }
    });
  });

  for (const quality of ['high', 'low']) {
    it.each(SPECIES)('retains finite seekable geometry, grounded pecks and paired hops: %s (' + quality + ')', id => {
      let allocations = 0;
      const counted = Object.fromEntries(Object.entries(THREE).map(([key, value]) => [key, typeof value === 'function' ?
        new Proxy(value, { construct(target, args, constructor) { allocations++; return Reflect.construct(target, args, constructor); } }) : value]));
      const bird = library().create(counted, id, { quality }), original = meshes(bird).map(mesh => ({ mesh,
        geometry: mesh.geometry, material: mesh.material, arrays: Object.entries(mesh.geometry.attributes).map(([name, value]) => [name, value, value.array]) }));
      const resources = new Set(original.flatMap(record => [record.geometry, record.material])); let disposed = 0;
      resources.forEach(resource => resource.addEventListener('dispose', () => disposed++));
      const scene = new THREE.Scene(); scene.add(bird.root);
      try {
        const foldedWidth = bounds(bird).getSize(new THREE.Vector3()).x;
        const pose = { flight: .67, phase: 1.7, effort: .8, bank: .25, peck: .15, tailSpread: .6, lookYaw: -.2 };
        bird.update(pose); const expected = positionsHash(bird); allocations = 0;
        for (let frame = 0; frame < 16; frame++) bird.update({ flight: frame / 15, phase: frame * .41, effort: .8,
          bank: -.3, peck: .2, tailSpread: .7, walking: .5, stride: frame * .3 });
        bird.update(pose); expect(allocations).toBe(0); expect(positionsHash(bird)).toBe(expected);
        bird.update({ flight: 1, phase: 1.57, effort: .8 });
        expect(bounds(bird).getSize(new THREE.Vector3()).x).toBeGreaterThan(foldedWidth * 1.4);
        bird.update({ hopPhase: .5, flight: 0 });
        expect(bird.feet[0].position.y).toBe(bird.feet[1].position.y);
        expect(bird.feet[0].position.z).toBe(bird.feet[1].position.z);
        expect(bird.feet[0].rotation.x).toBe(bird.feet[1].rotation.x);
        bird.update({ peck: 1 }); bird.root.updateMatrixWorld(true);
        const face = bird.root.getObjectByName('woodland-eyes-and-bill'), position = face.geometry.attributes.position;
        let tipZ = -Infinity, tipMinY = Infinity; const point = new THREE.Vector3();
        for (let index = 0; index < position.count; index++) tipZ = Math.max(tipZ, position.getZ(index));
        for (let index = 0; index < position.count; index++) if (position.getZ(index) > tipZ - .00001) {
          point.fromBufferAttribute(position, index).applyMatrix4(face.matrixWorld); tipMinY = Math.min(tipMinY, point.y);
        }
        expect(tipMinY).toBeGreaterThan(0); expect(tipMinY).toBeLessThan(.004);
        for (const record of original) {
          expect(record.mesh.geometry).toBe(record.geometry); expect(record.mesh.material).toBe(record.material);
          for (const [name, attribute, array] of record.arrays) {
            expect(record.geometry.attributes[name]).toBe(attribute); expect(attribute.array).toBe(array);
            for (const value of array) if (!Number.isFinite(value)) throw new Error('Non-finite ' + id + '/' + name);
          }
        }
      } finally { bird.dispose(); bird.dispose(); }
      expect(disposed).toBe(resources.size); expect(scene.children).toHaveLength(0);
    });

    it('paints goldfinch cap, yellow contours, two true wingbars and a notched tail (' + quality + ')', () => {
      const bird = library().create(THREE, 'americanGoldfinch', { quality });
      try {
        const cap = meanColor(bird.root.getObjectByName('woodland-head-plumage'), (a, i) => a.position.getY(i) > .012 && a.position.getZ(i) > .005);
        expect(Math.max(...cap)).toBeLessThan(.04);
        const yellow = meanColor(bird.root.getObjectByName('woodland-body-plumage'), (a, i) => a.position.getY(i) > 0 && a.position.getZ(i) > -.01);
        expect(yellow[0]).toBeGreaterThan(.4); expect(yellow[1]).toBeGreaterThan(.25); expect(yellow[2]).toBeLessThan(.13);
        const wing = bird.wings[1].getObjectByName('woodland-layered-wing');
        for (const row of [1, 2]) {
          const select = (a, i) => a.featherInfo.getX(i) === 3 && Math.floor(a.featherInfo.getY(i) / 13) === row;
          const tip = meanColor(wing, (a, i) => select(a, i) && a.uv.getY(i) > .9);
          const base = meanColor(wing, (a, i) => select(a, i) && a.uv.getY(i) < .3);
          expect(Math.min(...tip)).toBeGreaterThan(.55); expect(Math.max(...base)).toBeLessThan(.06);
        }
        const tail = bird.root.getObjectByName('woodland-layered-tail').geometry.attributes;
        let outerTip = 0, centerTip = 0;
        for (let i = 0; i < tail.position.count; i++) if (tail.uv.getY(i) > .99) {
          const feather = tail.featherInfo.getY(i), reach = -tail.position.getZ(i);
          if (feather === 0 || feather === 11) outerTip = Math.max(outerTip, reach);
          if (feather === 5 || feather === 6) centerTip = Math.max(centerTip, reach);
        }
        expect(outerTip).toBeGreaterThan(centerTip * 1.04);
      } finally { bird.dispose(); }
    });

    it('paints bluebird blue, rust and white body regions with a slender dark bill (' + quality + ')', () => {
      const bird = library().create(THREE, 'easternBluebird', { quality });
      try {
        const head = meanColor(bird.root.getObjectByName('woodland-head-plumage'), (a, i) => a.position.getY(i) > .008);
        expect(head[2]).toBeGreaterThan(head[0] * 2.5);
        const body = bird.root.getObjectByName('woodland-body-plumage');
        const rust = meanColor(body, (a, i) => a.position.getZ(i) > .034 && a.position.getY(i) < -.004);
        expect(rust[0]).toBeGreaterThan(rust[2] * 2);
        // The forward breast must remain rust above and below the body pole;
        // a down-only pigment mask creates a blue belt just under the neck.
        const upperBreast = meanColor(body, (a, i) => a.position.getZ(i) > .040 && a.position.getY(i) > -.004 && a.position.getY(i) < .016);
        expect(upperBreast[0]).toBeGreaterThan(upperBreast[2] * 3);
        expect(upperBreast[0]).toBeGreaterThan(.3);
        const white = meanColor(body, (a, i) => a.position.getY(i) < -.023 && a.position.getZ(i) < -.005);
        expect(Math.min(...white)).toBeGreaterThan(.55);
        const face = bird.root.getObjectByName('woodland-eyes-and-bill'), bill = meanColor(face, (a, i) => a.position.getZ(i) > .022);
        expect(Math.max(...bill)).toBeLessThan(.06);
        const a = face.geometry.attributes.position; let width = 0, tip = 0;
        for (let i = 0; i < a.count; i++) if (a.getZ(i) > .018) { width = Math.max(width, Math.abs(a.getX(i))); tip = Math.max(tip, a.getZ(i)); }
        expect(width / (tip - .01824)).toBeLessThan(.27);
      } finally { bird.dispose(); }
    });

    it('paints sparrow white/black crown, yellow lores, white throat and streaked wingbars (' + quality + ')', () => {
      const bird = library().create(THREE, 'whiteThroatedSparrow', { quality });
      try {
        const head = bird.root.getObjectByName('woodland-head-plumage');
        const center = meanColor(head, (a, i) => a.position.getY(i) > .014 && Math.abs(a.position.getX(i)) < .002);
        const stripe = meanColor(head, (a, i) => a.position.getY(i) > .011 && Math.abs(a.position.getX(i)) > .006 && Math.abs(a.position.getX(i)) < .011);
        expect(Math.min(...center)).toBeGreaterThan(.55); expect(Math.max(...stripe)).toBeLessThan(Math.min(...center) * .65);
        const lore = meanColor(head, (a, i) => a.position.getY(i) > 0 && a.position.getY(i) < .005 && a.position.getZ(i) > .010 && Math.abs(a.position.getX(i)) > .010);
        expect(lore[0]).toBeGreaterThan(lore[2] * 2); expect(lore[1]).toBeGreaterThan(lore[2] * 2);
        const throat = meanColor(head, (a, i) => a.position.getY(i) < -.011 && a.position.getZ(i) > .009);
        expect(Math.min(...throat)).toBeGreaterThan(.55);
        const wing = bird.wings[1].getObjectByName('woodland-layered-wing');
        for (const row of [1, 2]) {
          const tip = meanColor(wing, (a, i) => a.featherInfo.getX(i) === 3 && Math.floor(a.featherInfo.getY(i) / 13) === row && a.uv.getY(i) > .9);
          const base = meanColor(wing, (a, i) => a.featherInfo.getX(i) === 3 && Math.floor(a.featherInfo.getY(i) / 13) === row && a.uv.getY(i) < .3);
          expect(Math.min(...tip)).toBeGreaterThan(Math.max(...base) * 2);
        }
        const bill = meanColor(bird.root.getObjectByName('woodland-eyes-and-bill'), (a, i) => a.position.getZ(i) > .022);
        expect(Math.abs(bill[0] - bill[1])).toBeLessThan(.03); expect(Math.abs(bill[1] - bill[2])).toBeLessThan(.03);
      } finally { bird.dispose(); }
    });
  }
});
