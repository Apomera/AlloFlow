import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Model round 7: the marks that make each rebuilt Guide model recognizable.
// Pins only these models' own marks and tiers, so other lanes can add species alongside them.
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies;
const make = (id, quality = 'high', o = {}) => S.create(T, id, Object.assign({ seed: 7, reducedMotion: true, quality, growth: 1 }, o));
const part = (h, name) => { let m = null; h.root.traverse((o) => { if (o.isMesh && o.userData.part === name) m = o; }); return m; };
const meshes = (h) => { const a = []; h.root.traverse((o) => { if (o.isMesh) a.push(o); }); return a; };
const tris = (h) => meshes(h).reduce((n, m) => n + m.geometry.index.count / 3, 0);
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const sat = (c) => { const M = Math.max(...c), m = Math.min(...c); return M ? (M - m) / M : 0; };
const elevation = (id) => { const d = S.info(id).portrait.dir; return Math.atan2(d[1], Math.hypot(d[0], d[2])); };
const colours = (g, first = 0, count = g.attributes.position.count) => { const c = g.attributes.color, out = []; for (let i = first; i < first + count; i++) out.push([c.getX(i), c.getY(i), c.getZ(i)]); return out; };
const pixels = (image, x0 = 0, x1 = 1, y0 = 0, y1 = 1) => { const out = []; for (let y = Math.floor(image.height * y0); y < image.height * y1; y++) for (let x = Math.floor(image.width * x0); x < image.width * x1; x++) { const k = (y * image.width + x) * 4; out.push([image.data[k] / 255, image.data[k + 1] / 255, image.data[k + 2] / 255]); } return out; };
const TIERS = ['low', 'high'];
const REBUILT = { pincushion_sea_star: [1500, 6000], soft_coral: [1500, 6000], long_spined_urchin: [1500, 6000], day_octopus: [1500, 6000], ocellated_eagle_ray: [1500, 6000], porcelain_anemone_crab: [1500, 6000], blue_coral: [4000, 12000], spanish_dancer: [1500, 6000], coral_tree_nursery: [4000, 12000], goldmouth_sea_squirt: [1500, 6000] };

describe('every rebuilt model', () => {
  for (const [id, caps] of Object.entries(REBUILT)) it(id + ' stays in budget fully grown, finite and frozen under reduced motion', () => {
    TIERS.forEach((quality, t) => {
      const h = make(id, quality);
      try {
        expect(tris(h), id + ' ' + quality).toBeLessThanOrEqual(caps[t]);
        for (const m of meshes(h)) for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), m.name).toBe(true);
        const before = meshes(h).map((m) => [...m.geometry.attributes.position.array]);
        h.update(0.016, 5);
        meshes(h).forEach((m, i) => expect([...m.geometry.attributes.position.array]).toEqual(before[i]));
      } finally { h.dispose(); }
    });
  });
  it('still gives every rebuilt model a portrait inside the guide limits', () => {
    for (const id of Object.keys(REBUILT)) { const len = Math.hypot(...S.info(id).portrait.dir); expect(len, id).toBeGreaterThan(1.3); expect(len, id).toBeLessThan(4.5); }
  });
});

describe('pincushion sea star', () => {
  for (const quality of TIERS) it('is a rounded pentagon with five soft ridges on top at ' + quality, () => {
    const h = make('pincushion_sea_star', quality);
    try {
      const g = part(h, 'inflated-cushion-body').geometry, d = g.userData.pincushionStar, r = d.ranges['inflated-aboral-cushion'], p = g.attributes.position, bins = new Array(40).fill(0);
      for (let i = r.first; i < r.first + r.count; i++) { const k = Math.floor((Math.atan2(p.getZ(i), p.getX(i)) + Math.PI) / (2 * Math.PI) * 40) % 40; bins[k] = Math.max(bins[k], Math.hypot(p.getX(i), p.getZ(i))); }
      let peaks = 0; for (let k = 0; k < 40; k++) if (bins[k] > bins[(k + 39) % 40] && bins[k] >= bins[(k + 1) % 40]) peaks++;
      expect(peaks).toBe(5);
      expect(Math.max(...bins) / Math.min(...bins), 'clearly a pentagon, not a pebble').toBeGreaterThan(1.14);
      expect(Math.max(...bins) / Math.min(...bins), 'arms stay barely visible').toBeLessThan(1.25);
    } finally { h.dispose(); }
  });
  it('wears a mosaic of cream, olive and red plates in a dark net, seen from above', () => {
    const h = make('pincushion_sea_star');
    try {
      const px = pixels(part(h, 'inflated-cushion-body').material.map.image, 0.1, 0.8, 0.1, 0.8), share = (f) => px.filter(f).length / px.length;
      expect(share((c) => c[1] > c[0] * 1.02 && c[1] > c[2] * 1.3), 'olive plates').toBeGreaterThan(0.08);
      expect(share((c) => c[0] > c[1] * 1.5 && c[0] > 0.35), 'red plates').toBeGreaterThan(0.04);
      expect(share((c) => lum(c) > 0.7 && c[2] > 0.45), 'cream granules').toBeGreaterThan(0.03);
      expect(share((c) => lum(c) < 0.32), 'dark net of pore fields').toBeGreaterThan(0.04);
      expect(elevation('pincushion_sea_star'), 'the picture shows the pentagon').toBeGreaterThan(0.65);
    } finally { h.dispose(); }
  });
});

describe('tree soft coral', () => {
  for (const quality of TIERS) it('branches low from a short bare trunk into coloured tufts at ' + quality, () => {
    const h = make('soft_coral', quality);
    try {
      const st = part(h, 'stalks').geometry, po = part(h, 'polyps').geometry, sb = new T.Box3().setFromBufferAttribute(st.attributes.position), pb = new T.Box3().setFromBufferAttribute(po.attributes.position), top = pb.max.y;
      expect(pb.min.y / top, 'the lower stem carries no polyps').toBeGreaterThan(0.35);
      const p = st.attributes.position; let lowWide = 0, lowAll = 0;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > top * 0.45 && p.getY(i) < top * 0.6) { lowAll++; if (Math.hypot(p.getX(i), p.getZ(i)) > top * 0.1) lowWide++; }
      expect(lowWide / lowAll, 'already split into branches by mid height').toBeGreaterThan(0.5);
      expect(sb.max.x - sb.min.x, 'a spreading crown, not a post').toBeGreaterThan(top * 0.5);
      const cs = colours(po);
      expect(cs.reduce((n, c) => n + sat(c), 0) / cs.length, 'polyp tufts are colourful').toBeGreaterThan(0.45);
      expect(new Set(cs.map((c) => c.map((v) => v.toFixed(3)).join())).size, 'tufts and paler tentacles differ').toBeGreaterThan(1);
    } finally { h.dispose(); }
  });
  it('keeps a pale trunk under much more saturated polyp knots', () => {
    const h = make('soft_coral');
    try {
      const st = part(h, 'stalks').geometry, p = st.attributes.position, all = colours(st), low = all.filter((c, i) => p.getY(i) < 0.04), b = colours(part(h, 'polyps').geometry), mean = (l) => [0, 1, 2].map((k) => l.reduce((n, c) => n + c[k], 0) / l.length);
      expect(lum(mean(low)), 'pale trunk base').toBeGreaterThan(Math.min(...b.map(lum)) * 1.5);
      expect(sat(mean(b)), 'colour lives in the polyps').toBeGreaterThan(sat(mean(low)));
    } finally { h.dispose(); }
  });
});

describe('long-spined urchin', () => {
  for (const quality of TIERS) it('keeps black spines thick enough to read, and the orange ring at ' + quality, () => {
    const h = make('long_spined_urchin', quality);
    try {
      const sp = part(h, 'spines').geometry, cs = colours(sp);
      expect(Math.max(...cs.map(lum)), 'spines stay black or near black').toBeLessThan(0.06);
      const p = sp.attributes.position, sides = quality === 'high' ? 6 : 3; let r = 0;
      for (let j = 0; j < sides; j++) r = Math.max(r, new T.Vector3().fromBufferAttribute(p, j).distanceTo(new T.Vector3().fromBufferAttribute(p, (j + (sides >> 1)) % sides)) / 2);
      expect(r, 'shaft radius at the base').toBeGreaterThan(0.0012);
      const te = part(h, 'test').geometry, tc = te.attributes.color, tp = te.attributes.position; let orange = 0, rmax = 0;
      for (let i = 0; i < tp.count; i++) if (tc.getX(i) > 0.6 && tc.getX(i) > tc.getY(i) * 2 && tc.getY(i) > tc.getZ(i) * 2) { orange++; rmax = Math.max(rmax, Math.hypot(tp.getX(i), tp.getZ(i))); }
      expect(orange, 'orange ring present').toBeGreaterThan(20);
      expect(rmax, 'around the cone, not the whole test').toBeLessThan(0.02);
      expect(elevation('long_spined_urchin'), 'seen from above enough to find the ring').toBeGreaterThan(0.55);
      expect(elevation('long_spined_urchin'), 'but with spines against the water').toBeLessThan(0.85);
    } finally { h.dispose(); }
  });
});

describe('day octopus', () => {
  for (const quality of TIERS) it('has strongly mottled skin and pale paired suckers at ' + quality, () => {
    const h = make('day_octopus', quality);
    try {
      const body = part(h, 'body').geometry, ls = colours(body).map(lum), mean = ls.reduce((a, b) => a + b, 0) / ls.length, spread = Math.sqrt(ls.reduce((a, b) => a + (b - mean) * (b - mean), 0) / ls.length);
      expect(spread / mean, 'mottled, not one brown').toBeGreaterThan(0.45);
      const cups = part(h, 'suckers').geometry, rims = colours(cups).map(lum);
      expect(Math.max(...rims), 'pale sucker rims stand out from the skin').toBeGreaterThan(mean * 1.8);
      expect(rims.length, 'suckers exist').toBeGreaterThan(50);
    } finally { h.dispose(); }
  });
  it('keeps both arm colours from the display flash reversible', () => {
    const h = S.create(T, 'day_octopus', { seed: 9, quality: 'low' }), col = () => Array.from(part(h, 'body').geometry.attributes.color.array);
    try {
      h.update(1 / 60, 0.5); const a = col(); h.update(1 / 60, Math.PI / 2 / 0.22); const b = col(); h.update(1 / 60, 0.5);
      expect(b).not.toEqual(a); expect(col()).toEqual(a);
    } finally { h.dispose(); }
  });
});

describe('ocellated eagle ray', () => {
  for (const quality of TIERS) it('has a bold spotted dark back, projecting bill and a long curving whip at ' + quality, () => {
    const h = make('ocellated_eagle_ray', quality);
    try {
      const disc = part(h, 'spotted-disc'), head = part(h, 'duckbill-head-pelvic-fins'), tail = part(h, 'long-whip-tail'), W = disc.geometry.userData.ocellatedEagleRay.scaleM;
      const px = pixels(disc.material.map.image, 0.05, 0.95, 0.02, 0.46), share = (f) => px.filter(f).length / px.length;
      expect(share((c) => lum(c) > 0.72), 'many pale spots').toBeGreaterThan(0.12);
      expect(share((c) => lum(c) < 0.3), 'on a dark back').toBeGreaterThan(0.4);
      const db = new T.Box3().setFromBufferAttribute(disc.geometry.attributes.position), hb = new T.Box3().setFromBufferAttribute(head.geometry.attributes.position), tb = new T.Box3().setFromBufferAttribute(tail.geometry.attributes.position);
      expect(hb.max.x, 'duck-bill head in front of the wings').toBeGreaterThan(db.max.x + 0.1);
      expect(tb.max.x - tb.min.x, 'whip about twice the disc span').toBeGreaterThan(3.2);
      expect(tb.min.y, 'the whip trails below the disc, so the picture can frame the disc').toBeLessThan(-0.3 * W);
    } finally { h.dispose(); }
  });
  it('looks down on the back in the picture', () => { expect(elevation('ocellated_eagle_ray')).toBeGreaterThan(0.4); });
});

describe('porcelain anemone crab', () => {
  for (const quality of TIERS) it('shows broad spotted claws and fans ahead of the mouth at ' + quality, () => {
    const h = make('porcelain_anemone_crab', quality);
    try {
      const b = part(h, 'fixed-shell-chelae-legs').geometry, f = part(h, 'feeding-fans-antennae').geometry, d = b.userData.porcelainCrab, fd = f.userData.porcelainCrab;
      const cl = d.claws[0], p = b.attributes.position, L = d.scaleM; let lo = Infinity, hi = -Infinity, xl = Infinity, xh = -Infinity;
      const yaw = 0.42 * cl.side;
      for (let i = cl.first; i < cl.first + cl.count; i++) { const x = p.getX(i) / L, z = p.getZ(i) / L, along = x * Math.cos(yaw) + z * Math.sin(yaw), across = -x * Math.sin(yaw) + z * Math.cos(yaw); if (along < 0.27) continue; xl = Math.min(xl, along); xh = Math.max(xh, along); lo = Math.min(lo, across); hi = Math.max(hi, across); }
      expect((hi - lo) / (xh - xl), 'broad claw, not a blade').toBeGreaterThan(0.4);
      const shell = new T.Box3(); const c = d.ranges['convex-carapace']; for (let i = c.first; i < c.first + c.count; i++) shell.expandByPoint(new T.Vector3().fromBufferAttribute(p, i));
      let ahead = 0, all = 0; for (const fan of fd.fans) for (let i = fan.first; i < fan.first + fan.count; i++) { all++; if (f.attributes.position.getX(i) > shell.max.x + 0.0005) ahead++; }
      expect(ahead / all, 'fans sweep ahead of the mouth, where the picture shows them').toBeGreaterThan(0.5);
      const px = pixels(part(h, 'fixed-shell-chelae-legs').material.map.image, 0.02, 0.48, 0.02, 0.48);
      expect(px.filter((q) => q[0] > q[1] * 1.8).length / px.length, 'red spots on the pale shell').toBeGreaterThan(0.05);
    } finally { h.dispose(); }
  });
  it('faces the camera, claws to either side', () => {
    const dir = S.info('porcelain_anemone_crab').portrait.dir;
    expect(Math.abs(dir[2]) / Math.abs(dir[0]), 'near head-on').toBeLessThan(0.2);
    expect(elevation('porcelain_anemone_crab')).toBeGreaterThan(0.5);
  });
});

describe('blue coral', () => {
  const blue = (c) => c[2] > c[0] * 1.8 && c[2] > 0.2;
  it('shows blue up the sides of snapped lobes, in every health state and on both tiers', () => {
    for (const quality of TIERS) for (const health of ['healthy', 'bleached', 'dead']) {
      const h = make('blue_coral', quality, { health });
      try {
        const g = meshes(h)[0].geometry, cs = colours(g), p = g.attributes.position, ys = [];
        cs.forEach((c, i) => { if (blue(c)) ys.push(p.getY(i)); });
        expect(ys.length, quality + ' ' + health).toBeGreaterThan(20);
        if (health === 'healthy') expect(ys.length / cs.length, 'blue stays where the coral broke').toBeLessThan(0.15);
        expect(Math.max(...ys) - Math.min(...ys), 'fractures at several heights, not one flat slash').toBeGreaterThan(0.08);
      } finally { h.dispose(); }
    }
  });
  it('keeps the living surface grey-brown', () => {
    const h = make('blue_coral');
    try {
      const cs = colours(meshes(h)[0].geometry).filter((c) => !blue(c)), mean = [0, 1, 2].map((k) => cs.reduce((n, c) => n + c[k], 0) / cs.length);
      expect(mean[0]).toBeGreaterThan(mean[2]); expect(sat(mean)).toBeLessThan(0.55);
    } finally { h.dispose(); }
  });
});

describe('Spanish dancer', () => {
  for (const quality of TIERS) it('has a raised body, six pale gills and a white rim at ' + quality, () => {
    const h = make('spanish_dancer', quality);
    try {
      const b = part(h, 'body-rhinophores-gills').geometry, s = part(h, 'undulating-mantle-skirt').geometry, d = b.userData.spanishDancer, L = d.scaleM, c = b.attributes.color, p = b.attributes.position;
      expect(d.gills).toHaveLength(6);
      let pale = 0, tipTop = 0; for (const gill of d.gills) for (let i = gill.first; i < gill.first + gill.count; i++) { if (c.getX(i) > 0.5 && c.getY(i) > 0.2) pale++; tipTop = Math.max(tipTop, p.getY(i) / L - gill.root[1]); }
      expect(pale, 'pale rose gill tips').toBeGreaterThan(30);
      expect(tipTop, 'gills stand well clear of the back').toBeGreaterThan(0.1);
      expect(Math.max(...d.gills.map((q) => q.root[0])), 'at the rear').toBeLessThan(-0.15);
      const r = s.userData.spanishDancer.ranges, inner = colours(s, r['spread-mantle'].first, r['spread-mantle'].count), rim = colours(s, r['white-mantle-rim'].first, r['white-mantle-rim'].count);
      expect(Math.min(...inner.map(lum)), 'a shadow line sets the body off from the mantle').toBeLessThan(0.5);
      expect(Math.max(...inner.map(lum))).toBeGreaterThan(0.9);
      expect(rim.reduce((n, q) => n + lum(q), 0) / rim.length, 'pale edge').toBeGreaterThan(0.6);
      const ds = new T.Box3().setFromBufferAttribute(s.attributes.position), db = new T.Box3(); const dr = d.ranges['mottled-dorsum']; for (let i = dr.first; i < dr.first + dr.count; i++) db.expandByPoint(new T.Vector3().fromBufferAttribute(p, i));
      expect((db.max.y - db.min.y) / L, 'body hump clearly raised').toBeGreaterThan(0.09);
      expect(ds.max.z - ds.min.z, 'wide mantle').toBeGreaterThan(db.max.z - db.min.z);
    } finally { h.dispose(); }
  });
  it('is pictured from behind, so the gills come first', () => { expect(S.info('spanish_dancer').portrait.dir[0]).toBeLessThan(0); });
});

describe('coral tree nursery', () => {
  for (const quality of TIERS) it('reads as a pole with arms, lines and hanging colonies clear of the bottom at ' + quality, () => {
    const h = make('coral_tree_nursery', quality);
    try {
      const tree = part(h, 'tree').geometry, frag = part(h, 'fragments').geometry, fb = new T.Box3().setFromBufferAttribute(frag.attributes.position), tb = new T.Box3().setFromBufferAttribute(tree.attributes.position);
      expect(tb.max.x - tb.min.x, 'arms a metre and more across').toBeGreaterThan(1.2);
      expect(fb.min.y, 'held off the bottom').toBeGreaterThan(0.2);
      expect(fb.max.y, 'colonies below the top of the pole').toBeLessThan(tb.max.y);
      expect(fb.max.x - fb.min.x, 'colonies hang along the arms').toBeGreaterThan(1.0);
      const p = tree.attributes.position; let onAxis = 0; for (let i = 0; i < p.count; i++) if (Math.hypot(p.getX(i), p.getZ(i)) < 0.03) onAxis++;
      expect(onAxis, 'central pole').toBeGreaterThan(8);
      expect(tb.max.y, 'float on top, tethered from the seabed').toBeGreaterThan(2);
      expect(tb.min.y).toBeLessThan(0.05);
      expect(frag.index.count / 3, 'real colonies, not twigs').toBeGreaterThan(1000);
    } finally { h.dispose(); }
  });
  it('starts small and grows: fragments are smaller at low growth', () => {
    const small = make('coral_tree_nursery', 'high', { growth: 0.1 }), big = make('coral_tree_nursery', 'high', { growth: 1 });
    try { expect(part(small, 'fragments').geometry.index.count).toBeLessThan(part(big, 'fragments').geometry.index.count); } finally { small.dispose(); big.dispose(); }
  });
});

describe('gold-mouth sea squirt', () => {
  for (const quality of TIERS) it('has small gold-rimmed siphons on a white tunic with purple marks at ' + quality, () => {
    const h = make('goldmouth_sea_squirt', quality);
    try {
      const tu = part(h, 'tunic'), si = part(h, 'siphons').geometry, b = new T.Box3().setFromBufferAttribute(tu.geometry.attributes.position), width = b.max.x - b.min.x, d = si.userData.goldmouthSeaSquirt.siphons, scale = (b.max.y - b.min.y) / 0.104;
      expect((b.max.y - b.min.y) / width, 'upright vase').toBeGreaterThan(1.15);
      for (const s of d) expect(s.openingRadius * 2 / width, s.name + ' siphon is small against the body').toBeLessThan(0.3);
      expect(d.find((s) => s.name === 'atrial').openingRadius).toBeLessThan(d.find((s) => s.name === 'oral').openingRadius);
      expect(scale).toBeGreaterThan(0.9);
      const px = pixels(tu.material.map.image), share = (f) => px.filter(f).length / px.length;
      expect(share((c) => lum(c) > 0.72 && c[2] > 0.6), 'mostly pale').toBeGreaterThan(0.3);
      expect(share((c) => c[2] > c[1] * 1.3 && c[0] > c[1] * 1.1), 'purple marks').toBeGreaterThan(0.08);
      expect(share((c) => c[0] > 0.75 && c[1] > 0.55 && c[2] < 0.45), 'yellow-orange marks').toBeGreaterThan(0.015);
      for (const s of d) { const cs = colours(si, s.first, s.count); expect(cs.filter((c) => c[0] > 0.6 && c[1] > 0.2 && c[2] < 0.2).length, s.name + ' gold rim').toBeGreaterThan(8); }
    } finally { h.dispose(); }
  });
});
