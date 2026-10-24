import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Lane D: guide portrait hints, shared baked textures, shader program families
// and field marks the guide teaches. REEF3D_SPECIES_SOURCE points at a scratch
// copy for mutation checks.
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
function load() { const w = {}; new Function('window', SOURCE)(w); return w.Reef3DSpecies; }
const S = load();

function trackingThree() {
  const created = [], disposed = new Map(), T = { ...THREE };
  for (const [name, value] of Object.entries(THREE)) {
    if (typeof value !== 'function' || !value.prototype || !(value.prototype.isBufferGeometry || value.prototype.isMaterial || value.prototype.isTexture)) continue;
    T[name] = class extends value {
      constructor(...args) { super(...args); created.push(this); }
      dispose() { disposed.set(this, (disposed.get(this) || 0) + 1); return super.dispose(); }
    };
  }
  return { T, created, disposed };
}
const mesh = (h, part) => h.root.getObjectByName(h.root.userData.speciesId + '-' + part);
const texel = (tex, u, v) => { const { width: w, height: hh, data } = tex.image, i = (Math.min(hh - 1, Math.floor(v * hh)) * w + Math.min(w - 1, Math.floor(u * w))) * 4; return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]; };
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

describe('Lane D guide portraits', () => {
  it('names a well-formed camera for the species whose default view reads badly', () => {
    const must = ['reef_manta', 'bluespotted_stingray', 'giant_moray', 'cleaner_wrasse', 'whitetip_reef_shark', 'sea_fan', 'nudibranch', 'cleaner_shrimp',
      'crown_of_thorns', 'blue_sea_star', 'long_spined_urchin', 'mushroom_coral', 'coral_tree_nursery'];
    for (const id of must) expect(S.info(id).portrait, id + ' has a portrait hint').toBeTruthy();
    let hinted = 0;
    for (const id of S.ids) {
      const p = S.info(id).portrait; if (!p) continue; hinted++;
      expect(p.dir, id).toHaveLength(3);
      expect(p.dir.every(Number.isFinite), id).toBe(true);
      const len = Math.hypot(...p.dir);
      expect(len, id + ' camera stays outside the model and close enough to fill the picture').toBeGreaterThan(1.3);
      expect(len, id).toBeLessThan(4.5);
      expect(p.lookY, id).toBeGreaterThanOrEqual(0); expect(p.lookY, id).toBeLessThanOrEqual(1);
    }
    expect(hinted).toBeGreaterThanOrEqual(must.length);
    // The manta reads from above (not edge-on) and the sea fan face-on (its plane is YZ).
    const m = S.info('reef_manta').portrait.dir; expect(m[1] / Math.hypot(m[0], m[2]), 'manta camera well above the disc').toBeGreaterThan(0.6);
    const f = S.info('sea_fan').portrait.dir; expect(Math.abs(f[0]) / Math.hypot(f[1], f[2]), 'fan seen face-on').toBeGreaterThan(2);
    // info() hands out copies.
    S.info('reef_manta').portrait.dir[0] = 99; expect(S.info('reef_manta').portrait.dir[0]).not.toBe(99);
  });
});

describe('Lane D load cost', () => {
  it('shares one baked texture object per THREE namespace and frees it with its last user', () => {
    const { T, disposed } = trackingThree();
    const a = S.create(T, 'clownfish', { seed: 1, quality: 'high' }), b = S.create(T, 'clownfish', { seed: 2, quality: 'high' });
    const ma = mesh(a, 'body').material, mb = mesh(b, 'body').material;
    expect(ma, 'each fish keeps its own material (own swimming uniforms)').not.toBe(mb);
    expect(ma.map, 'pigment shared').toBe(mb.map); expect(ma.bumpMap, 'relief shared').toBe(mb.bumpMap);
    a.dispose();
    expect(disposed.get(ma.map) || 0, 'still in use by the second fish').toBe(0);
    b.dispose();
    expect(disposed.get(ma.map), 'freed once with the last fish').toBe(1);
    // A later dive (new namespace) gets a new texture object over the same baked pixels.
    const c = S.create(T, 'clownfish', { seed: 3, quality: 'high' }), d = S.create(THREE, 'clownfish', { seed: 3, quality: 'high' });
    expect(mesh(c, 'body').material.map).not.toBe(ma.map);
    expect(mesh(c, 'body').material.map.image.data, 'pixels baked once per page').toBe(ma.map.image.data);
    expect(mesh(d, 'body').material.map).not.toBe(mesh(c, 'body').material.map);
    c.dispose(); d.dispose();
    // Seed-drawn maps (a brain coral's valleys) are keyed by the seed: same seed, same pixels.
    const e1 = S.create(THREE, 'brain_coral', { seed: 5, quality: 'low' }), e2 = S.create(THREE, 'brain_coral', { seed: 6, quality: 'low' });
    expect(mesh(e1, 'colony').material.map.image.data).not.toBe(mesh(e2, 'colony').material.map.image.data);
    e1.dispose(); e2.dispose();
  });

  it('shares one patch key and keeps material feature families within the established budget', () => {
    const keys = new Set(), sigs = new Set();
    const add = (h) => h.root.traverse((m) => {
      if (!m.isMesh) return; const t = m.material;
      keys.add(t.customProgramCacheKey());
      sigs.add([!!t.map, !!t.bumpMap, !!t.normalMap, !!t.roughnessMap, !!t.vertexColors, t.side, t.alphaTest, !!m.isInstancedMesh, !!m.instanceColor].join());
    });
    for (const id of S.ids) { const h = S.create(THREE, id, { seed: 3, quality: 'high' }); add(h); h.dispose(); }
    for (const id of ['anthias', 'bumphead_parrotfish']) { const h = S.createSchool(THREE, id, 5, { seed: 3 }); add(h); h.dispose(); }
    expect([...keys]).toEqual(['reef3d-species-v7|d']);
    // The cucumber's existing roughness map adds the eleventh family. The new
    // firefish and copperband reuse existing signatures. The pipefish's textured
    // fin batch adds the twelfth family (including instanced schools).
    expect(sigs.size, 'material families across the complete specimen collection').toBeLessThanOrEqual(12);
  }, 120000);
});

describe('Lane D field marks', () => {
  it("paints the Bleeker's parrotfish male cheek patch and gives some fish the barred female phase", () => {
    const male = S.create(THREE, 'parrotfish', { seed: 7, quality: 'low' });
    const tex = mesh(male, 'body').material.map;
    // Body u runs snout (x 0.5) to peduncle (x -0.34); the patch spans x 0.31 to 0.42.
    const u = (x) => (0.5 - x) / 0.84;
    let pale = 0, n = 0;
    for (let v = 0.05; v < 1; v += 0.02) {
      const c = texel(tex, u(0.37), v); n++;
      if (lum(c) > 0.6 && Math.max(...c) - Math.min(...c) < 0.25) pale++;
    }
    expect(pale / n, 'whitish cheek patch on both flanks').toBeGreaterThan(0.12);
    const mid = texel(tex, u(0.1), 0.25);
    expect(lum(mid) < 0.6 || Math.max(...mid) - Math.min(...mid) > 0.25, 'the flank itself is not white').toBe(true);
    male.dispose();
    const phases = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      const h = S.create(THREE, 'parrotfish', { seed, quality: 'low' }), t = mesh(h, 'body').material.map, c = texel(t, u(0.1), 0.3);
      phases.add(c[0] > c[1] && c[1] > c[2] ? 'brown' : 'green'); h.dispose();
    }
    expect([...phases].sort()).toEqual(['brown', 'green']);
  });

  it('builds the pinkfish smooth and hot-dog sized: dark on top, pink underneath', () => {
    const h = S.create(THREE, 'sea_cucumber', { seed: 2, quality: 'low' }), g = mesh(h, 'body').geometry;
    const p = g.attributes.position, c = g.attributes.color, box = new THREE.Box3().setFromBufferAttribute(p);
    expect(box.max.x - box.min.x, 'about 20-30 cm long').toBeLessThan(0.34);
    expect(box.max.x - box.min.x).toBeGreaterThan(0.17);
    expect((box.max.z - box.min.z) / (box.max.x - box.min.x), 'long and slim, round in section').toBeLessThan(0.32);
    let top = [0, 0, 0, 0], bottom = [0, 0, 0, 0];
    const mid = (box.max.y + box.min.y) / 2;
    for (let i = 0; i < p.count; i++) { const o = p.getY(i) > mid ? top : bottom; o[0] += c.getX(i); o[1] += c.getY(i); o[2] += c.getZ(i); o[3]++; }
    top = top.map((v) => v / top[3]); bottom = bottom.map((v) => v / bottom[3]);
    expect(top[0] + top[1] + top[2], 'dark back').toBeLessThan(0.25);
    expect(bottom[0], 'pink underside is red-dominant').toBeGreaterThan(bottom[1] * 1.6);
    expect(bottom[0]).toBeGreaterThan(top[0] * 2.5);
    // No bumps or spikes: every vertex lies on the smooth lofted surface (no outliers).
    const r = []; for (let i = 0; i < p.count; i++) r.push(Math.hypot(p.getY(i) - mid, p.getZ(i)));
    expect(Math.max(...r), 'no spikes standing off the body').toBeLessThan((box.max.y - box.min.y) * 0.75);
    h.dispose();
  });

  it("shows the reef manta's pale mouth, Anna's chromodoris colours and the young boxfish's black spots", () => {
    const manta = S.create(THREE, 'reef_manta', { seed: 1, quality: 'low' }), det = mesh(manta, 'detail').geometry;
    let brightest = 0; for (let i = 0; i < det.attributes.color.count; i++) brightest = Math.max(brightest, det.attributes.color.getX(i) + det.attributes.color.getY(i) + det.attributes.color.getZ(i));
    expect(brightest, 'a pale mouth (oceanic mantas have a dark one)').toBeGreaterThan(1.8);
    manta.dispose();
    const nudi = S.create(THREE, 'nudibranch', { seed: 1, quality: 'low' }), t = mesh(nudi, 'body').material.map.image.data;
    let blue = 0, orange = 0, ink = 0; for (let i = 0; i < t.length; i += 4) { if (t[i + 2] > 180 && t[i + 2] > t[i] * 1.6) blue++; if (t[i] > 200 && t[i + 1] > 120 && t[i + 2] < 90) orange++; if (t[i] + t[i + 1] + t[i + 2] < 120) ink++; }
    expect(blue / (t.length / 4), 'blue mantle').toBeGreaterThan(0.25); expect(orange, 'orange-yellow border').toBeGreaterThan(20); expect(ink, 'black lines and specks').toBeGreaterThan(40);
    nudi.dispose();
    const box = S.create(THREE, 'yellow_boxfish', { seed: 1, quality: 'low' }), d = mesh(box, 'body').material.map.image.data;
    let black = 0, white = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] < 60 && d[i + 1] < 60) black++; if (d[i] > 220 && d[i + 1] > 220 && d[i + 2] > 200) white++; }
    expect(black / (d.length / 4), 'black spots').toBeGreaterThan(0.04); expect(white, 'no white spots').toBe(0);
    box.dispose();
  });
});
