import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;

function components(g) {
  const parent = Array.from({ length: g.attributes.position.count }, (_, i) => i);
  const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const index = g.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const root = find(index[i]);
    parent[find(index[i + 1])] = root;
    parent[find(index[i + 2])] = root;
  }
  const groups = new Map();
  parent.forEach((_, i) => { const key = find(i); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
  return [...groups.values()];
}
const vertex = (p, i) => new THREE.Vector3().fromBufferAttribute(p, i);
function measures(p, ids) {
  const byDistance = ids.slice().sort((a, b) => vertex(p, a).lengthSq() - vertex(p, b).lengthSq());
  const anchor = byDistance.slice(0, -1).reduce((sum, i) => sum.add(vertex(p, i)), new THREE.Vector3()).divideScalar(ids.length - 1);
  const lengths = [];
  ids.forEach((a, n) => ids.slice(n + 1).forEach((b) => lengths.push(vertex(p, a).distanceTo(vertex(p, b)))));
  return { anchor, lengths };
}

describe('close-view invertebrate movement', () => {
  for (const quality of ['low', 'high']) it(`keeps ${quality} urchin spines rigid and attached while probing`, () => {
    const h = S.create(THREE, 'long_spined_urchin', { seed: 19, quality });
    try {
      const g = h.root.getObjectByName('long_spined_urchin-spines').geometry;
      const groups = components(g), start = g.attributes.position.array.slice();
      expect(groups.length).toBeGreaterThan(50);
      const before = groups.map((ids) => measures(g.attributes.position, ids));
      let moved = 0;
      for (const t of [0.7, 6.2, 28.9]) {
        h.update(1 / 60, t);
        groups.forEach((ids, i) => {
          const after = measures(g.attributes.position, ids);
          expect(after.anchor.distanceTo(before[i].anchor)).toBeLessThan(2e-8);
          after.lengths.forEach((length, j) => expect(Math.abs(length - before[i].lengths[j])).toBeLessThan(5e-8));
        });
        const p = g.attributes.position, n = g.attributes.normal, box = g.boundingBox.clone().expandByScalar(1e-7);
        for (let i = 0; i < p.count; i++) {
          expect(box.containsPoint(vertex(p, i))).toBe(true);
          expect(vertex(p, i).distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius + 1e-7);
          expect(Math.abs(vertex(n, i).length() - 1)).toBeLessThan(1e-6);
        }
        moved = Math.max(moved, ...p.array.map((value, i) => Math.abs(value - start[i])));
      }
      expect(moved).toBeGreaterThan(0.002);
      expect(moved).toBeLessThan(0.022);
    } finally { h.dispose(); }
  });

  it('is deterministic across cadences and leaves reduced-motion geometry still', () => {
    const a = S.create(THREE, 'long_spined_urchin', { seed: 3, quality: 'low' });
    const b = S.create(THREE, 'long_spined_urchin', { seed: 3, quality: 'low' });
    const still = S.create(THREE, 'long_spined_urchin', { seed: 3, quality: 'low', reducedMotion: true });
    const geo = (h) => h.root.getObjectByName('long_spined_urchin-spines').geometry;
    try {
      const frozen = geo(still).attributes.position.array.slice();
      for (let t = 0; t < 3; t += 0.02) a.update(0.02, t);
      a.update(0.01, 3); b.update(3, 3); still.update(3, 3);
      expect(geo(a).attributes.position.array).toEqual(geo(b).attributes.position.array);
      expect(geo(a).attributes.normal.array).toEqual(geo(b).attributes.normal.array);
      expect(geo(still).attributes.position.array).toEqual(frozen);
    } finally { a.dispose(); b.dispose(); still.dispose(); }
  });

  it('keeps detailed invertebrates in two draws and bounded triangle budgets', () => {
    for (const quality of ['low', 'high']) for (const id of ['long_spined_urchin', 'nudibranch']) {
      const h = S.create(THREE, id, { seed: 7, quality });
      try {
        let meshes = 0, triangles = 0;
        h.root.traverse((m) => { if (m.isMesh) { meshes++; triangles += m.geometry.index.count / 3; } });
        expect(meshes).toBe(2);
        expect(triangles).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
      } finally { h.dispose(); }
    }
  });
});
