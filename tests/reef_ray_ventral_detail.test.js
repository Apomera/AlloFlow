import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync('stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const IDS = ['reef_manta', 'bluespotted_stingray'];
function material(model, id, part) { return model.root.getObjectByName(id + '-' + part).material; }
function range(texture, channel) {
  const data = texture.image.data; let lo = 255, hi = 0;
  for (let i = channel; i < data.length; i += 4) { lo = Math.min(lo, data[i]); hi = Math.max(hi, data[i]); }
  return hi - lo;
}
function runs(values, threshold) {
  let n = 0, inside = false;
  for (const value of values) { const next = value < threshold; if (next && !inside) n++; inside = next; }
  return n;
}
function gillScan(surface, id) {
  const { data, width, height } = surface.image;
  const manta = id === 'reef_manta', xmin = manta ? -0.62 : -0.1304, xmax = manta ? 0.6 : 0.15;
  const halfSpan = manta ? 1.75 : 0.125, z = manta ? 0.29 : 0.039;
  const row = Math.floor((z / halfSpan + 1) * 0.5 * height);
  const left = manta ? -0.03 : -0.018, right = manta ? 0.38 : 0.06, values = [];
  for (let col = 0; col < width; col++) {
    const x = xmin + (xmax - xmin) * (col + 0.5) / width;
    if (x >= left && x <= right) values.push(data[(row * width + col) * 4]);
  }
  return values;
}

describe('Ray ventral skin detail', () => {
  it('keeps five readable paired openings in both texture tiers with a smoothly mirrored relief field', () => {
    for (const quality of ['low', 'high']) for (const id of IDS) {
      const model = S.create(THREE, id, { quality, seed: 7 });
      try {
        const surface = material(model, id, 'disc-bottom').bumpMap;
        expect(runs(gillScan(surface, id), 110), id + ' ' + quality + ' five gills').toBe(5);
        const { data, width, height } = surface.image;
        for (let row = 0; row < height / 2; row++) for (let col = 0; col < width; col++) {
          expect(Math.abs(data[(row * width + col) * 4] - data[((height - row - 1) * width + col) * 4]), id + ' paired relief').toBeLessThanOrEqual(1);
        }
      } finally { model.dispose(); }
    }
  });

  it('packs shallow relief and wet-skin roughness in one linear map while keeping pigmentation in sRGB', () => {
    for (const id of IDS) {
      const model = S.create(THREE, id, { quality: 'high', seed: 7 });
      try {
        const mat = material(model, id, 'disc-bottom');
        expect(mat.map.encoding).toBe(THREE.sRGBEncoding);
        expect(mat.bumpMap.encoding).toBe(THREE.LinearEncoding);
        expect(mat.roughnessMap).toBe(mat.bumpMap);
        expect(range(mat.bumpMap, 0)).toBeGreaterThan(30);
        expect(range(mat.bumpMap, 1)).toBeGreaterThan(10);
        expect(mat.bumpScale / S.info(id).lengthM).toBeLessThan(0.003);
        expect(mat.transparent).toBe(false);
        const meshes = []; model.root.traverse(m => { if (m.isMesh) meshes.push(m); });
        expect(meshes).toHaveLength(3);
      } finally { model.dispose(); }
    }
  });

  it('shares the ventral maps between animals and retains marks without derivative support', () => {
    for (const id of IDS) {
      const a = S.create(THREE, id, { quality: 'high', seed: 7 });
      const b = S.create(THREE, id, { quality: 'high', seed: 42 });
      const fallback = S.create(THREE, id, { quality: 'high', seed: 7, derivatives: false });
      try {
        const am = material(a, id, 'disc-bottom'), bm = material(b, id, 'disc-bottom'), fm = material(fallback, id, 'disc-bottom');
        expect(bm.map.image.data).toBe(am.map.image.data);
        expect(bm.bumpMap.image.data).toBe(am.bumpMap.image.data);
        expect(fm.bumpMap).toBeNull(); expect(fm.normalMap).toBeNull();
        expect(fm.map.image.data).toEqual(am.map.image.data);
        expect(fallback.radius).toBe(a.radius);
      } finally { a.dispose(); b.dispose(); fallback.dispose(); }
    }
  });
});
