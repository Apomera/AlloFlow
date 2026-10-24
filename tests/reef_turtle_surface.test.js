import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
new Function('window', readFileSync('stem_lab/reef_3d_species.js', 'utf8'))(scope);
const Species = scope.Reef3DSpecies;

function stats(texture, channel) {
  const data = texture.image.data;
  let min = 255, max = 0;
  for (let i = channel; i < data.length; i += 4) { min = Math.min(min, data[i]); max = Math.max(max, data[i]); }
  return { min, max, range: max - min };
}

describe('turtle shell and paddle surface finish', () => {
  it('packs roughness beside the original paddle relief without another texture or draw', () => {
    for (const id of ['green_turtle', 'hawksbill_turtle']) for (const quality of ['low', 'high']) {
      const h = Species.create(THREE, id, { quality, seed: 7 });
      try {
        const mat = h.root.getObjectByName(id + '-flippers').material;
        expect(mat.roughnessMap).toBe(mat.bumpMap);
        expect(mat.bumpMap.encoding).toBe(THREE.LinearEncoding);
        expect(mat.map.encoding).toBe(THREE.sRGBEncoding);
        const d = mat.bumpMap.image.data;
        let edges = 0, crowns = 0, ne = 0, nc = 0, channelMismatch = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] !== d[i + 2]) channelMismatch++;
          if (d[i] < 128) { edges += d[i + 1]; ne++; }
          if (d[i] > 210) { crowns += d[i + 1]; nc++; }
        }
        expect(channelMismatch).toBe(0); expect(ne).toBeGreaterThan(20); expect(nc).toBeGreaterThan(20);
        expect(edges / ne - crowns / nc, 'scale margins scatter more light').toBeGreaterThan(8);
        expect(stats(mat.roughnessMap, 1).range).toBeGreaterThan(20);
        expect(stats(mat.roughnessMap, 1).min * mat.roughness / 255, 'no polished paddle patches').toBeGreaterThan(.5);
        let draws = 0; h.root.traverse((m) => { if (m.isMesh) draws++; });
        expect(draws).toBe(5); expect(mat.metalness).toBe(0); expect(mat.transparent).toBe(false);
      } finally { h.dispose(); }
    }
  }, 60000);

  it('keeps the green shell smooth with slightly stronger hawksbill plate relief', () => {
    for (const quality of ['low', 'high']) {
      const a = Species.create(THREE, 'green_turtle', { quality }), b = Species.create(THREE, 'hawksbill_turtle', { quality });
      try {
        const green = a.root.getObjectByName('green_turtle-carapace').material, hawk = b.root.getObjectByName('hawksbill_turtle-carapace').material;
        for (const mat of [green, hawk]) {
          expect(mat.bumpMap.encoding).toBe(THREE.LinearEncoding);
          expect(mat.roughnessMap.encoding).toBe(THREE.LinearEncoding);
          expect(stats(mat.roughnessMap, 1).range).toBeGreaterThan(20);
          expect(stats(mat.bumpMap, 0).range).toBeLessThan(135);
          expect(mat.metalness).toBe(0);
        }
        expect(stats(green.bumpMap, 0).range).toBeLessThan(stats(hawk.bumpMap, 0).range);
      } finally { a.dispose(); b.dispose(); }
    }
  }, 60000);

  it('preserves exact pigmentation and the small texture budget without derivative relief', () => {
    for (const id of ['green_turtle', 'hawksbill_turtle']) {
      const a = Species.create(THREE, id, { quality: 'low', derivatives: false }), b = Species.create(THREE, id, { quality: 'low' });
      try {
        for (const part of ['carapace', 'flippers']) {
          const fallback = a.root.getObjectByName(id + '-' + part).material, full = b.root.getObjectByName(id + '-' + part).material;
          expect(fallback.bumpMap).toBeNull();
          expect(fallback.map.image.data).toEqual(full.map.image.data);
          if (part === 'carapace') expect(fallback.roughnessMap.image.data).toEqual(full.roughnessMap.image.data);
          else { expect(fallback.roughnessMap.image.width).toBe(4); expect(fallback.roughness).toBe(.57); }
          expect(fallback.roughnessMap.encoding).toBe(THREE.LinearEncoding);
        }
      } finally { a.dispose(); b.dispose(); }
    }
  }, 60000);
});
