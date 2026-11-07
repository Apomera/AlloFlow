// Round 13 lane models (md13): field marks the Species guide names must show
// on the rebuilt 3D models. Each check failed on the round 13 base file.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const T = createRequire(path.resolve(process.cwd(), 'package.json'))(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js'));
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies;
const make = (id, quality = 'high') => S.create(T, id, { seed: 7, quality, reducedMotion: true });
const part = (h, name) => h.root.getObjectByName(h.root.userData.speciesId + '-' + name);
const elevation = (id) => { const d = S.info(id).portrait.dir; return Math.atan2(d[1], Math.hypot(d[0], d[2])); };
// Distinct surfaces a ray crosses (hits closer than 1.5 cm are one plate).
function plates(mesh, origin, dir) {
  const hits = new T.Raycaster(new T.Vector3(...origin), new T.Vector3(...dir).normalize()).intersectObject(mesh).map((x) => x.distance).sort((a, b) => a - b);
  let n = 0, last = -1;
  for (const d of hits) { if (d - last > 0.015) n++; last = d; }
  return n;
}

describe('md13 rebuilt species models', () => {
  for (const quality of ['low', 'high']) {
    it('stands the table coral on a central stalk the guide portrait can see at ' + quality, () => {
      const h = make('table_coral', quality);
      try {
        const p = part(h, 'colony').geometry.attributes.position;
        let under = Infinity, R = 0;
        for (let i = 0; i < p.count; i++) R = Math.max(R, Math.hypot(p.getX(i), p.getZ(i)));
        for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); if (r > 0.4 * R && r < 0.7 * R) under = Math.min(under, p.getY(i)); }
        // Mark 1: a flat plate held up on a central stalk. The plate's underside
        // stands clear of the bottom, and the portrait camera is low enough to
        // look under the rim at the stalk (below the rim-to-stalk angle).
        expect(under, 'plate underside height').toBeGreaterThan(0.22);
        expect(elevation('table_coral'), 'portrait looks under the rim').toBeLessThan(Math.atan2(under, R) * 1.25);
      } finally { h.dispose(); }
    });

    it('gives Anna\'s chromodoris a long, narrow mantle with black lines along the back at ' + quality, () => {
      const h = make('nudibranch', quality);
      try {
        const b = new T.Box3().setFromBufferAttribute(part(h, 'body').geometry.attributes.position), L = b.max.x - b.min.x;
        expect((b.max.z - b.min.z) / L, 'about a third as wide as long, not a pillow').toBeLessThan(0.43);
        expect((b.max.y - b.min.y) / L, 'low mantle').toBeLessThan(0.2);
        const im = part(h, 'body').material.map.image;
        let dark = 0, n = 0;
        for (let j = 0; j < im.height; j++) {
          const up = Math.sin(-Math.PI / 2 + (j + 0.5) / im.height * Math.PI * 2);
          if (up > 0.8) for (let i = 0; i < im.width; i++) { const k = (j * im.width + i) * 4; n++; if (im.data[k] + im.data[k + 1] + im.data[k + 2] < 150) dark++; }
        }
        // Mark 1: black lines run lengthwise where a viewer from above sees them.
        expect(dark / n, 'black lines on the back').toBeGreaterThan(0.015);
      } finally { h.dispose(); }
    });

    it('builds the giant triton spire as a tall widening cone, not a thin horn, at ' + quality, () => {
      const h = make('giant_triton', quality);
      try {
        const g = part(h, 'shell').geometry, r = g.userData.triton.spire, p = g.attributes.position, row = Math.round((r.rows - 1) / 2), z = [];
        for (let j = 0; j < r.columns; j++) z.push(p.getZ(r.first + row * r.columns + j));
        // Mark 1: tall, pointed spire. Halfway along, a real spire is about half
        // as wide as where it meets the body whorl.
        expect((Math.max(...z) - Math.min(...z)) / 2, 'mid-spire radius').toBeGreaterThan(0.02);
      } finally { h.dispose(); }
    });

    it('joins many thin fire coral plates into a honeycomb at ' + quality, () => {
      const h = make('fire_coral', quality);
      try {
        h.root.updateMatrixWorld(true);
        const m = part(h, 'colony');
        // Mark 1: thin upright plates join into box-like cells: a line across the
        // colony crosses five long plates, and one along a cell row several cross plates.
        expect(plates(m, [0.02, 0.09, -1], [0, 0, 1]), 'long plates').toBeGreaterThanOrEqual(5);
        expect(plates(m, [-1, 0.09, 0.05], [1, 0, 0]) + plates(m, [-1, 0.09, -0.05], [1, 0, 0]), 'cross plates').toBeGreaterThanOrEqual(10);
      } finally { h.dispose(); }
    });
  }

  it('sets the whitetip first back fin well behind the side fins and keeps its tip white', () => {
    const h = make('whitetip_reef_shark');
    try {
      const L = S.info('whitetip_reef_shark').lengthM, g = part(h, 'fins').geometry, p = g.attributes.position, c = g.attributes.color;
      let top = -1, at = -1;
      // The tail's upper lobe is higher; look ahead of the tail for the first dorsal apex.
      for (let i = 0; i < p.count; i++) if (p.getX(i) > -0.36 * L && p.getY(i) > top) { top = p.getY(i); at = i; }
      // The first dorsal sits behind the free tips of the side fins (pectoral roots at 0.28 L).
      expect(p.getX(at) / L, 'first dorsal apex set well back').toBeLessThan(0.02);
      expect(c.getX(at) + c.getY(at) + c.getZ(at), 'white apex').toBeGreaterThan(1.5);
    } finally { h.dispose(); }
  });

  it('gives the blue-green chromis a deeply forked tail with long pointed lobes', () => {
    const h = make('blue_green_chromis'), L = S.info('blue_green_chromis').lengthM;
    try {
      const g = part(h, 'fins').geometry, r = g.userData.batch.find((q) => q.part === 'tail'), p = g.attributes.position;
      let a = Infinity, b = -Infinity;
      for (let i = r.first; i < r.first + r.count; i++) { a = Math.min(a, p.getX(i)); b = Math.max(b, p.getX(i)); }
      expect((b - a) / L, 'tail lobe length').toBeGreaterThan(0.28);
    } finally { h.dispose(); }
  });

  it('paints copperband bars copper-orange, not pale yellow', () => {
    const h = make('copperband_butterflyfish');
    try {
      const im = part(h, 'body').material.map.image, u = (0.5 - 0.117) / 0.803, i = (Math.floor(im.height * 0.25) * im.width + Math.floor(u * im.width)) * 4;
      const [r, g, b] = im.data.slice(i, i + 3);
      expect(r).toBeGreaterThan(b * 3);
      expect(g / r, 'orange, not yellow').toBeLessThan(0.6);
    } finally { h.dispose(); }
  });
});
