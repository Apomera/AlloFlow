import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(T, 'christmas_tree_worm', { seed: 7, ...options });
const crowns = model => model.root.getObjectByName('christmas_tree_worm-worms');
function poses(mesh) {
  return Array.from({ length: mesh.count }, (_, i) => {
    const matrix = new T.Matrix4(), position = new T.Vector3(), rotation = new T.Quaternion(), scale = new T.Vector3();
    mesh.getMatrixAt(i, matrix); matrix.decompose(position, rotation, scale);
    return { position, rotation, scale };
  });
}

describe('Christmas tree worm anchored crown motion', () => {
  for (const quality of ['high', 'low']) {
    it(`keeps roots fixed and crown turns bounded at ${quality}`, () => {
      const h = create({ quality }), mesh = crowns(h), rest = poses(mesh);
      try {
        let maxAngle = 0;
        for (const time of [0, .1, 2, 8, 21, 42, 123, 3600, 86400]) {
          h.update(.016, time);
          const current = poses(mesh);
          for (let i = 0; i < current.length; i++) {
            expect(current[i].position.toArray()).toEqual(rest[i].position.toArray());
            const angle = rest[i].rotation.angleTo(current[i].rotation);
            expect(angle).toBeLessThan(.12001); maxAngle = Math.max(maxAngle, angle);
            const originalUp = new T.Vector3(0, 1, 0).applyQuaternion(rest[i].rotation);
            const currentUp = new T.Vector3(0, 1, 0).applyQuaternion(current[i].rotation);
            expect(originalUp.distanceTo(currentUp)).toBeLessThan(1e-6);
          }
          for (let i = 0; i < current.length; i += 2) {
            const a = rest[i].rotation.clone().invert().multiply(current[i].rotation);
            const b = rest[i + 1].rotation.clone().invert().multiply(current[i + 1].rotation);
            expect(a.angleTo(b)).toBeLessThan(.001);
            expect(current[i].scale.distanceTo(current[i + 1].scale)).toBeLessThan(1e-6);
          }
        }
        expect(maxAngle).toBeGreaterThan(.035);
        h.update(.016, 8);
        const atEight = new Float32Array(mesh.instanceMatrix.array);
        h.update(.016, 86400); h.update(.016, 8);
        expect(mesh.instanceMatrix.array).toEqual(atEight);
      } finally { h.dispose(); }
    });

    it(`retains forced withdrawal and resumes the same phased pose at ${quality}`, () => {
      const h = create({ quality }), mesh = crowns(h);
      try {
        h.update(.016, 8); const before = new Float32Array(mesh.instanceMatrix.array);
        h.retract(true);
        for (const pose of poses(mesh)) for (const scale of pose.scale.toArray()) expect(scale).toBeCloseTo(.04, 6);
        h.update(.016, 21);
        for (const pose of poses(mesh)) for (const scale of pose.scale.toArray()) expect(scale).toBeCloseTo(.04, 6);
        h.update(.016, 8); h.retract(false);
        expect(mesh.instanceMatrix.array).toEqual(before);
      } finally { h.dispose(); }
    });

    it(`keeps reduced-motion crowns still while retaining explicit withdrawal at ${quality}`, () => {
      const h = create({ quality, reducedMotion: true }), mesh = crowns(h), rest = new Float32Array(mesh.instanceMatrix.array);
      try {
        for (const time of [8, 21, 3600]) h.update(.016, time);
        expect(mesh.instanceMatrix.array).toEqual(rest);
        h.retract(true);
        for (const pose of poses(mesh)) for (const scale of pose.scale.toArray()) expect(scale).toBeCloseTo(.04, 6);
        const retracted = new Float32Array(mesh.instanceMatrix.array); h.update(.016, 3600);
        expect(mesh.instanceMatrix.array).toEqual(retracted);
        h.retract(false); expect(mesh.instanceMatrix.array).toEqual(rest);
      } finally { h.dispose(); }
    });
  }
});
