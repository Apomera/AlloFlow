import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(THREE, 'sea_cucumber', { seed: 7, ...options });
const body = h => h.root.getObjectByName('sea_cucumber-body');

describe('sea cucumber fine skin finish', () => {
  for (const quality of ['high', 'low']) {
    it(`packs low-amplitude relief and roughness as a mipmapped linear surface at ${quality}`, () => {
      const h = create({ quality });
      try {
        const m = body(h).material, map = m.bumpMap, { width, height, data } = map.image;
        expect(m.roughnessMap).toBe(map); expect(m.map).toBeNull();
        expect(map.encoding).toBe(THREE.LinearEncoding);
        expect(map.wrapS).toBe(THREE.ClampToEdgeWrapping); expect(map.wrapT).toBe(THREE.RepeatWrapping);
        expect(map.generateMipmaps).toBe(true); expect(map.minFilter).toBe(THREE.LinearMipmapLinearFilter);
        expect(width).toBe(quality === 'high' ? 256 : 128); expect(height).toBe(quality === 'high' ? 128 : 64);
        const red = [], green = [];
        for (let i = 0; i < data.length; i += 4) { red.push(data[i]); green.push(data[i + 1]); expect(data[i + 2]).toBe(128); expect(data[i + 3]).toBe(255); }
        expect(Math.max(...red) - Math.min(...red)).toBeGreaterThan(8); expect(Math.max(...red) - Math.min(...red)).toBeLessThan(50);
        expect(Math.max(...green) - Math.min(...green)).toBeGreaterThan(15);
        expect(m.bumpScale * (Math.max(...red) - Math.min(...red)) / 255).toBeLessThan(.0001);
        // Opposite texel rows are neighboring samples on the wrapped surface.
        let seam = 0, interior = 0;
        for (let x = 0; x < width; x++) for (let c = 0; c < 2; c++) {
          seam += Math.abs(data[x * 4 + c] - data[((height - 1) * width + x) * 4 + c]);
          for (let y = 1; y < height; y++) interior += Math.abs(data[(y * width + x) * 4 + c] - data[((y - 1) * width + x) * 4 + c]);
        }
        expect(seam / (width * 2)).toBeLessThan(interior / ((height - 1) * width * 2) * 2.5);
      } finally { h.dispose(); }
    });

    it(`shares the packed skin across animals and releases it only after its last user at ${quality}`, () => {
      const a = create({ quality }), b = create({ quality, seed: 19 }), map = body(a).material.bumpMap;
      let disposed = 0; map.addEventListener('dispose', () => disposed++);
      expect(body(b).material.roughnessMap).toBe(map);
      a.dispose(); expect(disposed).toBe(0);
      b.dispose(); expect(disposed).toBe(1); a.dispose(); b.dispose(); expect(disposed).toBe(1);
    });

    it(`retains pigment and moving geometry when derivative bump mapping is unavailable at ${quality}`, () => {
      const a = create({ quality }), b = create({ quality, derivatives: false });
      try {
        expect(body(b).material.bumpMap).toBeNull(); expect(body(b).material.roughnessMap).toBe(body(a).material.roughnessMap);
        for (const time of [0, 2, 5]) {
          a.update(.016, time); b.update(.016, time);
          for (const key of Object.keys(body(a).geometry.attributes)) expect(body(a).geometry.attributes[key].array).toEqual(body(b).geometry.attributes[key].array);
        }
      } finally { a.dispose(); b.dispose(); }
    });
  }
});
