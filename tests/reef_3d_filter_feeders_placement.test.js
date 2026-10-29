import { describe, expect, it } from 'vitest';
import { runtime, census, THREE } from './helpers/reef_life_harness.js';

describe('filter feeders attached to rendered rock', () => {
  it.each(['low', 'high'])('seats each small specimen on hard substrate at %s detail', quality => {
    for (const seed of [7, 29]) {
      const errors = [], t = runtime({ quality, reducedMotion: true, onError: error => errors.push(String(error)), site: {
        seed, depthM: 9, health: { coralCover: .5, bleaching: 0, algae: .05 }, restoration: null,
        population: ['goldmouth_sea_squirt', 'feather_duster_worm'].map(id => ({ id, count: 2 }))
      } }, { species: 'real' });
      try {
        const animals = census(t), rock = t.scene.getObjectByName('reef-explore-bommies'), floor = t.scene.getObjectByName('reef-explore-floor');
        t.scene.updateMatrixWorld(true);
        expect(animals).toHaveLength(4);
        const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
        for (const animal of animals) {
          const p = animal.object.position;
          ray.set(new THREE.Vector3(p.x, 1, p.z), down);
          const support = ray.intersectObject(rock, false)[0], sand = ray.intersectObject(floor, false)[0];
          expect(support, animal.speciesId + ' has actual rock beneath its attachment').toBeTruthy();
          expect(support.point.y - sand.point.y, 'rock rises above the sandy floor').toBeGreaterThan(.1);
          expect(support.point.y - p.y, 'base seated just into its rendered supporting face').toBeCloseTo(.002, 5);
          const normal = support.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(rock.matrixWorld));
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(animal.object.quaternion);
          expect(up.dot(normal), 'attachment follows the actual rock face').toBeGreaterThan(.999);
          const upper = new THREE.Box3().setFromObject(animal.object);
          expect(upper.max.y - support.point.y, 'living body remains above its attachment').toBeGreaterThan(.035);
        }
        expect(errors).toEqual([]);
      } finally { t.dispose(); }
    }
  }, 60000);
});
