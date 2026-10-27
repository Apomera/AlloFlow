import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const make = (quality, options = {}) => local.Reef3DSpecies.create(T, 'bigfin_reef_squid', { quality, seed: 7, ...options });
function fin(h) { return h.root.getObjectByName('bigfin_reef_squid-broad-oval-fins').geometry; }

describe('bigfin squid rolling fin web', () => {
  for (const quality of ['low', 'high']) {
    it('preserves web span and anchored roots while the free edge rolls laterally at ' + quality, () => {
      const h = make(quality);
      try {
        const g = fin(h), rest = g.attributes.position.array.slice(), data = g.userData.bigfinReefSquid;
        let widestRoll = 0, spanError = 0, verticalTravel = 0;
        for (const time of [0, .4, 1.2, 2.6, 4, 8, 30, 10000]) {
          h.update(.016, time, { speed: 1.6 });
          const p = g.attributes.position.array;
          for (const side of data.fins) for (let row = 0; row <= side.longitudinalSegments; row++) {
            const root = (side.first + row * (side.widthSegments + 1)) * 3, rootShift = p[root + 2] - rest[root + 2];
            expect(p[root]).toBe(rest[root]);
            expect(p[root + 1]).toBe(rest[root + 1]);
            expect(Math.abs(rootShift)).toBeLessThan(.0004);
            for (let across = 0; across <= side.widthSegments; across++) {
              const at = root + across * 3;
              const beforeSpan = Math.hypot(rest[at + 1] - rest[root + 1], rest[at + 2] - rest[root + 2]);
              const afterSpan = Math.hypot(p[at + 1] - p[root + 1], p[at + 2] - p[root + 2]);
              spanError = Math.max(spanError, Math.abs(beforeSpan - afterSpan));
              widestRoll = Math.max(widestRoll, Math.abs(p[at + 2] - rest[at + 2] - rootShift));
              verticalTravel = Math.max(verticalTravel, Math.abs(p[at + 1] - rest[at + 1]));
              expect(g.boundingBox.containsPoint(new T.Vector3(p[at], p[at + 1], p[at + 2]))).toBe(true);
            }
          }
        }
        expect(spanError).toBeLessThan(2e-8);
        expect(widestRoll).toBeGreaterThan(.0002);
        expect(verticalTravel).toBeGreaterThan(.003);
        expect(verticalTravel).toBeLessThan(.008);
        expect(g.attributes.position.usage).toBe(T.DynamicDrawUsage);
        expect(g.attributes.normal.usage).toBe(T.DynamicDrawUsage);
      } finally { h.dispose(); }
    });

    it('holds rest exactly under reduced motion and keeps analytic poses independent of update history at ' + quality, () => {
      const a = make(quality), b = make(quality), still = make(quality, { reducedMotion: true });
      try {
        const geometry = fin(still), positions = geometry.attributes.position.array.slice(), normals = geometry.attributes.normal.array.slice();
        for (const time of [0, .1, 1, 10, 10000]) { a.update(.016, time); still.update(.016, time, { speed: 1.6 }); }
        b.update(10000, 10000);
        expect(fin(a).attributes.position.array).toEqual(fin(b).attributes.position.array);
        expect(fin(a).attributes.normal.array).toEqual(fin(b).attributes.normal.array);
        expect(geometry.attributes.position.array).toEqual(positions);
        expect(geometry.attributes.normal.array).toEqual(normals);
        expect(geometry.attributes.position.version).toBe(0);
        expect(geometry.attributes.position.usage).toBe(T.StaticDrawUsage);
        const before = fin(a).attributes.position.array.slice();
        a.update(.001, 10000.001);
        expect(Math.max(...fin(a).attributes.position.array.map((value, i) => Math.abs(value - before[i])))).toBeLessThan(.00002);
      } finally { a.dispose(); b.dispose(); still.dispose(); }
    });
  }
});
