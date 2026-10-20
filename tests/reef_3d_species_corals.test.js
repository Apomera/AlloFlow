import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// Coral and sessile invertebrate models (morphology, colour, health states,
// sizes, load-cost guards). REEF3D_SPECIES_SOURCE points at a scratch copy for
// mutation checks. Baking every coral's maps in three health states takes a few
// seconds (about 11 s here unloaded, 45 s under heavy load), so allow plenty.
vi.setConfig({ testTimeout: 120000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const S = (() => { const w = {}; new Function('window', SOURCE)(w); return w.Reef3DSpecies; })();

const CORALS = ['brain_coral', 'staghorn_coral', 'table_coral', 'mushroom_coral', 'boulder_coral', 'cauliflower_coral', 'foliose_coral'];
const SESSILE = ['magnificent_anemone', 'giant_clam', 'christmas_tree_worm', 'sea_fan', 'barrel_sponge', 'soft_coral'];
const mesh = (h, part) => h.root.getObjectByName(h.root.userData.speciesId + '-' + part);
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const sat = (c) => { const mx = Math.max(...c), mn = Math.min(...c); return mx > 0 ? (mx - mn) / mx : 0; };
function build(id, o, fn) { const h = S.create(THREE, id, Object.assign({ seed: 9, quality: 'low' }, o)); try { return fn(h); } finally { h.dispose(); } }
// What each texel-vertex pair looks like: vertex colour (linear) times the map texel (sRGB -> linear) at its uv.
function surfaceColours(h, part) {
  const m = mesh(h, part || 'colony'), g = m.geometry, col = g.attributes.color, uv = g.attributes.uv, map = m.material.map, out = [];
  const d = map && map.image && map.image.data, w = d ? map.image.width : 0, hh = d ? map.image.height : 0, rep = map ? map.repeat.x : 1;
  for (let i = 0; i < g.attributes.position.count; i++) {
    let r = col ? col.getX(i) : 1, gg = col ? col.getY(i) : 1, b = col ? col.getZ(i) : 1;
    if (d) {
      const u = ((uv.getX(i) * rep) % 1 + 1) % 1, v = ((uv.getY(i) * rep) % 1 + 1) % 1, k = (Math.min(hh - 1, Math.floor(v * hh)) * w + Math.min(w - 1, Math.floor(u * w))) * 4;
      r *= lin(d[k] / 255); gg *= lin(d[k + 1] / 255); b *= lin(d[k + 2] / 255);
    }
    out.push([r, gg, b]);
  }
  return out;
}
function texels(tex) { const d = tex.image.data, out = []; for (let i = 0; i < d.length; i += 4) out.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]); return out; }
// Brown-olive turf (sRGB): warm, darker than the skeleton, red and green above blue.
const isTurf = (c) => c[0] > c[2] + 0.04 && c[1] > c[2] + 0.03 && Math.abs(c[0] - c[1]) < 0.14 && lum(c) < 0.62;
const isSkeleton = (c) => sat(c) < 0.12 && lum(c) > 0.42;
const sheenK = (mat) => { const shader = { uniforms: {}, vertexShader: '#include <common>', fragmentShader: '#include <common>' }; mat.onBeforeCompile(shader); return shader.uniforms.reefSheenK.value; };

describe('Lane F4 health states', () => {
  it('bleaches to white tissue with a pastel sheen, keeping every polyp and its relief', () => {
    for (const id of CORALS) {
      const healthy = build(id, {}, (h) => ({ tris: mesh(h, 'colony').geometry.index.count, normal: mesh(h, 'colony').material.normalMap.image.data, cols: surfaceColours(h) }));
      build(id, { health: 'bleached' }, (h) => {
        const m = mesh(h, 'colony'), cols = surfaceColours(h);
        expect(m.geometry.index.count, id + ' same polyps and branches').toBe(healthy.tris);
        expect(m.material.normalMap, id + ' corallite relief kept').toBeTruthy();
        expect(m.material.normalMap.image.data, id + ' the same cups and septa as the living colony').toEqual(healthy.normal);
        const pigmented = cols.filter((c) => sat(c) > 0.25).length / cols.length;
        expect(pigmented, id + ' no pigment colour left').toBeLessThan(0.02);
        expect(cols.filter((c) => lum(c) > 0.35).length / cols.length, id + ' stark white tissue').toBeGreaterThan(0.6);
        expect(sheenK(m.material), id + ' pastel sheen').toBeGreaterThan(0.1);
        expect(healthy.cols.filter((c) => sat(c) > 0.25).length / healthy.cols.length, id + ' living colony is pigmented').toBeGreaterThan(0.3);
      });
    }
  });

  it('covers a dead skeleton with a patchy brown-olive turf film over clean grey-white cups', () => {
    for (const id of CORALS) build(id, { health: 'dead' }, (h) => {
      const m = mesh(h, 'colony'), cols = surfaceColours(h).map((c) => c.map((v) => Math.pow(Math.max(0, v), 1 / 2.2)));
      const turf = cols.filter(isTurf).length / cols.length, bone = cols.filter(isSkeleton).length / cols.length;
      expect(turf, id + ' turf film').toBeGreaterThan(0.08);
      expect(turf, id + ' patchy, not a carpet').toBeLessThan(0.85);
      expect(bone + cols.filter((c) => sat(c) < 0.15).length / cols.length, id + ' bare skeleton shows').toBeGreaterThan(0.1);
      expect(sheenK(m.material), id + ' no living glow').toBe(0);
      build(id, {}, (live) => expect(surfaceColours(live).filter((c) => isTurf(c.map((v) => Math.pow(v, 1 / 2.2))) && sat(c) < 0.45).length / cols.length, id + ' living tissue is not turf-grey').toBeLessThan(turf));
    });
    // Tiled colonies use a skeleton map of their own: crisp empty cups under fuzzy filaments.
    for (const id of ['staghorn_coral', 'cauliflower_coral', 'boulder_coral']) {
      const live = build(id, {}, (h) => mesh(h, 'colony').material.map.image.data);
      build(id, { health: 'dead' }, (h) => {
        const t = texels(mesh(h, 'colony').material.map);
        expect(mesh(h, 'colony').material.map.image.data, id).not.toEqual(live);
        expect(t.filter(isTurf).length / t.length, id + ' filaments in the map').toBeGreaterThan(0.05);
        expect(t.filter((c) => lum(c) < 0.6 && sat(c) < 0.1).length / t.length, id + ' dark empty cups').toBeGreaterThan(0.012);
      });
    }
  });
});

describe('Lane F4 morphology', () => {
  it('draws a brain coral maze: brown walls over paler valleys that meander in every direction', () => {
    build('brain_coral', { quality: 'high' }, (h) => {
      const tex = mesh(h, 'colony').material.map, w = tex.image.width, t = texels(tex), L = t.map(lum), sorted = [...L].sort((a, b) => a - b);
      const lo = sorted[Math.floor(L.length * 0.2)], hi = sorted[Math.floor(L.length * 0.8)];
      expect(hi - lo, 'walls and valleys differ').toBeGreaterThan(0.08);
      // Valleys (pale) and walls (dark) both run through the map with a near-constant width.
      let rows = 0, cols = 0, n = 0;
      const mid = (lo + hi) / 2;
      for (let j = w * 0.3; j < w * 0.7; j += 8) for (let i = Math.floor(w * 0.3); i < w * 0.7; i++) {
        const a = L[Math.floor(j) * w + i] > mid, b = L[Math.floor(j) * w + i + 1] > mid, c = L[(Math.floor(j) + 1) * w + i] > mid;
        if (a !== b) rows++; if (a !== c) cols++; n++;
      }
      expect(rows / n, 'many walls crossed along rows').toBeGreaterThan(0.06);
      expect(cols / n, 'and along columns').toBeGreaterThan(0.06);
      expect(Math.max(rows, cols) / Math.min(rows, cols), 'a maze, not parallel stripes').toBeLessThan(1.8);
      // Paler valleys are the greener ones.
      const pale = t.filter((c, i) => L[i] > hi), dark = t.filter((c, i) => L[i] < lo), avg = (a) => [0, 1, 2].map((k) => a.reduce((s, c) => s + c[k], 0) / a.length);
      expect(avg(pale)[1] - avg(pale)[0], 'pale valleys lean green').toBeGreaterThan(avg(dark)[1] - avg(dark)[0]);
    });
  });

  it('gives branching Acropora pale growing tips and a table its flat brush top on a stalk', () => {
    for (const quality of ['low', 'high']) build('staghorn_coral', { quality }, (h) => {
      const g = mesh(h, 'colony').geometry, p = g.attributes.position, c = g.attributes.color, ys = [];
      for (let i = 0; i < p.count; i++) ys.push(p.getY(i));
      const cut = [...ys].sort((a, b) => a - b)[Math.floor(ys.length * 0.9)];
      let top = 0, nt = 0, all = 0;
      for (let i = 0; i < p.count; i++) { const l = lum([c.getX(i), c.getY(i), c.getZ(i)]); all += l; if (ys[i] >= cut) { top += l; nt++; } }
      expect(top / nt, quality + ' pale tips').toBeGreaterThan(1.25 * all / p.count);
      const box = new THREE.Box3().setFromBufferAttribute(p);
      expect(box.max.x - box.min.x, quality + ' a spreading thicket, not a broom').toBeGreaterThan(0.6 * (box.max.y - box.min.y));
    });
    build('table_coral', { quality: 'high' }, (h) => {
      const g = mesh(h, 'colony').geometry, p = g.attributes.position, box = new THREE.Box3().setFromBufferAttribute(p), W = box.max.x - box.min.x, H = box.max.y - box.min.y;
      expect(W / H, 'wide and flat').toBeGreaterThan(2.5);
      let under = 0, near = 0;
      for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); if (p.getY(i) < box.min.y + 0.4 * H) { if (r < 0.15 * W) near++; under++; } }
      expect(near / under, 'only a central stalk holds it off the bottom').toBeGreaterThan(0.6);
      const t = texels(mesh(h, 'colony').material.map), inside = t.filter((c, i) => { const u = (i % 512) / 512 - 0.5, v = Math.floor(i / 512) / 512 - 0.5; return Math.hypot(u, v) < 0.45; });
      const tips = inside.filter((c) => lum(c) > 0.45 && c[2] >= c[0] - 0.02).length / inside.length;
      expect(tips, 'pale blue-lilac branchlet tips in the brush').toBeGreaterThan(0.04);
      expect(tips, 'on a brown living plate').toBeLessThan(0.5);
    });
  });

  it('keeps a distant sea fan a net: mip levels keep the solid share of the mesh', () => {
    build('sea_fan', { quality: 'high' }, (h) => {
      const tex = mesh(h, 'fan').material.map, cut = 0.42 * 255, cover = (d) => { let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] >= cut) n++; return n / (d.length / 4); };
      expect(tex.mipmaps.length, 'its own mip chain').toBeGreaterThan(6);
      expect(tex.generateMipmaps).toBe(false);
      const c0 = cover(tex.mipmaps[0].data);
      expect(c0, 'open windows between branches').toBeLessThan(0.55);
      expect(c0, 'a real mesh, not a few lines').toBeGreaterThan(0.12);
      for (const level of [3, 5]) expect(cover(tex.mipmaps[level].data) / c0, 'level ' + level).toBeGreaterThan(0.75);
    });
  });

  it('ridges a barrel sponge, crowds an anemone with tentacles and packs soft-coral polyps into heads', () => {
    build('barrel_sponge', { quality: 'high' }, (h) => {
      const p = mesh(h, 'sponge').geometry.attributes.position, ring = [];
      for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - 0.5) < 0.03) ring.push([Math.atan2(p.getZ(i), p.getX(i)), Math.hypot(p.getX(i), p.getZ(i))]);
      ring.sort((a, b) => a[0] - b[0]);
      const outer = ring.filter((q, i) => i % 2 === 0 || true), r = outer.map((q) => q[1]), mean = r.reduce((s, v) => s + v, 0) / r.length;
      let peaks = 0; for (let i = 0; i < r.length; i++) if (r[i] > r[(i + r.length - 1) % r.length] && r[i] >= r[(i + 1) % r.length] && r[i] > mean * 1.02) peaks++;
      expect(peaks, 'ridges round the wall').toBeGreaterThanOrEqual(12);
      expect((Math.max(...r) - Math.min(...r)) / mean, 'deep grooves').toBeGreaterThan(0.12);
    });
    build('magnificent_anemone', { quality: 'high' }, (h) => expect(mesh(h, 'tentacles').count, 'dense crown').toBeGreaterThanOrEqual(120));
    build('soft_coral', { quality: 'high' }, (h) => {
      const p = mesh(h, 'polyps').geometry.attributes.position;
      expect(p.count, 'clusters of polyps').toBeGreaterThan(1500);
    });
  });
});

describe('Lane F4 sizes and cost', () => {
  it('builds colonies at believable sizes, relative to each other and to reef fish', () => {
    const box = (id, part) => build(id, {}, (h) => { const b = new THREE.Box3().setFromObject(part ? mesh(h, part) : h.root); return { w: Math.max(b.max.x - b.min.x, b.max.z - b.min.z), h: b.max.y - b.min.y }; });
    const R = {
      brain_coral: [0.6, 1.0, 0.18, 0.42], boulder_coral: [1.2, 2.2, 0.4, 0.9], table_coral: [1.1, 1.8, 0.25, 0.55], staghorn_coral: [0.5, 1.4, 0.45, 1.1],
      cauliflower_coral: [0.2, 0.45, 0.15, 0.35], foliose_coral: [0.45, 1.0, 0.25, 0.65], mushroom_coral: [0.15, 0.3, 0.015, 0.06],
      barrel_sponge: [0.6, 1.4, 0.7, 1.25], giant_clam: [0.2, 0.36, 0.08, 0.2], soft_coral: [0.12, 0.35, 0.18, 0.4]
    };
    for (const [id, [w0, w1, h0, h1]] of Object.entries(R)) {
      const b = box(id);
      expect(b.w, id + ' width m').toBeGreaterThan(w0); expect(b.w, id + ' width m').toBeLessThan(w1);
      expect(b.h, id + ' height m').toBeGreaterThan(h0); expect(b.h, id + ' height m').toBeLessThan(h1);
    }
    const fan = build('sea_fan', {}, (h) => new THREE.Box3().setFromObject(mesh(h, 'fan')));
    expect(fan.max.y - fan.min.y).toBeGreaterThan(0.7); expect(fan.max.x - fan.min.x, 'a flat fan').toBeLessThan(0.15);
    // A clownfish fits inside its anemone's crown; a chromis is far smaller than a table.
    expect(box('magnificent_anemone', 'column').w).toBeGreaterThan(4 * S.info('clownfish').lengthM);
    expect(box('table_coral').w).toBeGreaterThan(12 * S.info('blue_green_chromis').lengthM);
  });

  it('adds no material family and keeps every coral one instanceable mesh', () => {
    const sig = (m) => { const t = m.material; return [!!t.map, !!t.bumpMap, !!t.normalMap, !!t.roughnessMap, !!t.vertexColors, t.side, t.alphaTest, !!m.isInstancedMesh, !!m.instanceColor].join(); };
    const all = new Set(), mine = new Set();
    for (const id of S.ids) for (const health of ['healthy', 'bleached', 'dead']) build(id, { quality: 'high', seed: 3, health }, (h) => h.root.traverse((m) => { if (!m.isMesh) return; all.add(sig(m)); if (CORALS.includes(id) || SESSILE.includes(id)) mine.add(sig(m)); }));
    expect(all.size, 'material families across all models').toBeLessThanOrEqual(10);
    // The families these species used before this lane, and no others.
    expect([...mine].sort()).toEqual([
      'false,false,false,false,true,0,0,false,false', 'false,false,false,false,true,0,0,true,true', 'false,false,false,false,true,2,0,false,false', 'false,false,false,false,true,2,0,true,true',
      'true,false,false,false,false,2,0.42,false,false', 'true,false,true,false,true,0,0,false,false', 'true,false,true,false,true,2,0,false,false', 'true,true,false,false,true,2,0,false,false'].sort());
    for (const id of CORALS) for (const health of ['healthy', 'bleached', 'dead']) build(id, { health }, (h) => {
      const ms = []; h.root.traverse((m) => { if (m.isMesh) ms.push(m); });
      expect(ms.length, id + ' one mesh: one instanced draw per reef state').toBe(1);
      expect(!!ms[0].isInstancedMesh, id).toBe(false);
    });
  }, 120000);

  it('grows the same colony on both tiers', () => {
    for (const id of ['staghorn_coral', 'cauliflower_coral', 'foliose_coral', 'brain_coral', 'table_coral']) {
      const a = build(id, { quality: 'low' }, (h) => new THREE.Box3().setFromObject(h.root)), b = build(id, { quality: 'high' }, (h) => new THREE.Box3().setFromObject(h.root));
      for (const k of ['x', 'y', 'z']) expect(Math.abs((a.max[k] - a.min[k]) - (b.max[k] - b.min[k])), id + ' ' + k).toBeLessThan(0.08 * (b.max[k] - b.min[k]) + 0.01);
    }
  });
});
