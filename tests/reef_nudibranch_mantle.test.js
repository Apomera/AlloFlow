import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(T, 'nudibranch', { seed: 7, ...options });
const body = h => h.root.getObjectByName('nudibranch-body').geometry;
const pose = h => {
  h.root.updateMatrixWorld(true);
  return ['nudibranch-rhinophores', 'nudibranch-gills-pivot'].map(name => h.root.getObjectByName(name).matrixWorld.elements.slice());
};

describe('nudibranch mantle margin', () => {
  for (const quality of ['high', 'low']) {
    it(`has shallow smooth folds confined to the narrow margin at ${quality}`, () => {
      const h = create({ quality });
      try {
        const g = body(h), p = g.attributes.position, uv = g.attributes.uv;
        const sides = quality === 'high' ? 24 : 12, stations = quality === 'high' ? 20 : 10, stride = sides + 1;
        const length = (g.boundingBox.max.x - g.boundingBox.min.x) / 1.004;
        const deltas = [];
        let largest = 0;
        // The untouched top and sole independently recover each original
        // superellipse section, exposing folds without duplicating their noise.
        for (let row = 0; row <= stations; row++) {
          const bottom = p.getY(row * stride), top = p.getY(row * stride + sides / 2), section = [];
          for (let side = 0; side <= sides; side++) {
            const i = row * stride + side, up = Math.sin(-Math.PI / 2 + side / sides * Math.PI * 2);
            const smoothY = (top + bottom) / 2 + Math.sign(up) * Math.pow(Math.abs(up), 2 / 3) * (top - bottom) / 2;
            const delta = p.getY(i) - smoothY, u = uv.getX(i);
            if (u <= .06 || u >= .94 || up <= -.08 || up >= .58) expect(Math.abs(delta)).toBeLessThan(1e-8);
            largest = Math.max(largest, Math.abs(delta)); section.push(delta);
            if (row > 0) expect(Math.abs(delta - deltas[row - 1][side])).toBeLessThan(length * .008);
          }
          deltas.push(section);
          expect(p.getY(row * stride)).toBe(p.getY(row * stride + sides));
        }
        expect(largest).toBeGreaterThan(length * .001);
        expect(largest).toBeLessThan(length * .008);
        for (const attr of Object.values(g.attributes)) expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
        for (let i = 0; i < p.count; i++) expect(new T.Vector3().fromBufferAttribute(g.attributes.normal, i).length()).toBeCloseTo(1, 5);
      } finally { h.dispose(); }
    });

    it(`keeps the mantle fixed and crown poses deterministic at ${quality}`, () => {
      const a = create({ quality }), b = create({ quality }), still = create({ quality, reducedMotion: true });
      try {
        const rest = body(a).attributes.position.array.slice(), stillPose = pose(still);
        expect(body(b).attributes.position.array).toEqual(rest);
        for (const t of [.25, 1, 2, 4]) a.update(.25, t);
        b.update(4, 4); still.update(4, 4);
        expect(pose(a)).toEqual(pose(b));
        expect(pose(a)).not.toEqual(stillPose);
        expect(pose(still)).toEqual(stillPose);
        for (const h of [a, b, still]) {
          h.update(.016, 3600);
          expect(body(h).attributes.position.array).toEqual(rest);
        }
        expect(pose(still)).toEqual(stillPose);
      } finally { a.dispose(); b.dispose(); still.dispose(); }
    });
  }
});
