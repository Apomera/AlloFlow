// Round 14 lane models (md14): field marks the Species guide names must show
// on the rebuilt 3D models. Each check failed on the round 14 base file.
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
const meshes = (h) => { const a = []; h.root.traverse((m) => { if (m.isMesh) a.push(m); }); return a; };
const points = (g, first = 0, count = g.attributes.position.count) => { const p = g.attributes.position, a = []; for (let i = first; i < first + count; i++) a.push([p.getX(i), p.getY(i), p.getZ(i), i]); return a; };
const texel = (im, u, v) => { const k = (Math.min(im.height - 1, Math.floor(v * im.height)) * im.width + Math.min(im.width - 1, Math.floor(u * im.width))) * 4; return [im.data[k], im.data[k + 1], im.data[k + 2]]; };

describe('md14 rebuilt species models', () => {
  for (const quality of ['low', 'high']) {
    it('keeps the whitetip white to the tips of the first back fin and upper tail lobe at ' + quality, () => {
      const h = make('whitetip_reef_shark', quality), L = S.info('whitetip_reef_shark').lengthM;
      try {
        const g = part(h, 'fins').geometry, c = g.attributes.color, all = points(g);
        const white = (q) => c.getX(q[3]) + c.getY(q[3]) + c.getZ(q[3]) > 1.5;
        // First dorsal: fin vertices ahead of the tail and above the back.
        const dorsal = all.filter((q) => q[0] > -0.36 * L && q[1] > 0.07 * L), top = Math.max(...dorsal.map((q) => q[1])), root = Math.min(...dorsal.map((q) => q[1]));
        const wd = dorsal.filter(white);
        expect(wd.length, 'a white tip exists').toBeGreaterThan(2);
        expect(Math.min(...wd.map((q) => q[1])), 'white only in the top third of the fin').toBeGreaterThan(top - (top - root) * 0.33);
        // Upper tail lobe: white only near its point (the highest tail vertex).
        const tail = all.filter((q) => q[0] < -0.28 * L), tip = tail.reduce((a, b) => (b[1] > a[1] ? b : a));
        const wt = tail.filter(white);
        expect(wt.length, 'a white tail tip exists').toBeGreaterThan(0);
        expect(Math.max(...wt.map((q) => Math.hypot(q[0] - tip[0], q[1] - tip[1]))) / L, 'white only near the lobe point').toBeLessThan(0.1);
      } finally { h.dispose(); }
    });

    it('curves the harlequin shrimp abdomen into an arch at ' + quality, () => {
      const h = make('harlequin_shrimp', quality);
      try {
        const g = meshes(h)[0].geometry, r = g.userData.harlequinShrimp.ranges['segmented-abdomen'], pts = points(g, r.first, r.count);
        const x0 = Math.min(...pts.map((q) => q[0])), x1 = Math.max(...pts.map((q) => q[0])), span = x1 - x0;
        const topAt = (f) => Math.max(...pts.filter((q) => Math.abs(q[0] - (x1 - f * span)) < 0.08 * span).map((q) => q[1]));
        // Mark 4: a curved abdomen. The back rises above the straight line
        // joining its front and rear ends (a straight abdomen sits on it).
        const front = topAt(0.1), mid = topAt(0.5), rear = topAt(0.9);
        expect((mid - (front + rear) / 2) / span, 'arched back').toBeGreaterThan(0.06);
      } finally { h.dispose(); }
    });

    it('builds the yellow boxfish as a box, not an egg, at ' + quality, () => {
      const h = make('yellow_boxfish', quality), L = S.info('yellow_boxfish').lengthM;
      try {
        const pts = points(part(h, 'body').geometry);
        const cols = [...new Set(pts.map((q) => q[0].toFixed(5)))].map(Number);
        const height = (x) => { const at = cols.reduce((a, b) => (Math.abs(b - x * L) < Math.abs(a - x * L) ? b : a)), s = pts.filter((q) => Math.abs(q[0] - at) < 1e-5); return Math.max(...s.map((q) => q[1])) - Math.min(...s.map((q) => q[1])); };
        const mid = height(0.2);
        // Mark 1: nearly the full shell height close behind the blunt front face.
        expect(height(0.43) / mid, 'square front of the shell').toBeGreaterThan(0.85);
        expect(height(0.47) / mid, 'blunt front face').toBeGreaterThan(0.62);
      } finally { h.dispose(); }
    });

    it('bulges the bumphead forehead forward over the beak at ' + quality, () => {
      const h = make('bumphead_parrotfish', quality), L = S.info('bumphead_parrotfish').lengthM;
      try {
        const pts = points(part(h, 'body').geometry), front = (a, b) => Math.max(...pts.filter((q) => q[1] > a * L && q[1] < b * L).map((q) => q[0]));
        // Mark 2: the bump stands at least as far forward as the face just above the beak.
        expect((front(0.14, 0.2) - front(0.03, 0.07)) / L, 'forehead bump forward of the face').toBeGreaterThan(0.002);
      } finally { h.dispose(); }
    });

    it('scatters more, smaller spots on the blackspotted puffer and keeps its side fins short at ' + quality, () => {
      const h = make('blackspotted_puffer', quality);
      try {
        const ms = meshes(h), d = ms[2].geometry.userData.blackspottedPuffer, fin = d.fins.find((f) => f.name === 'pectoral-left'), pts = points(ms[2].geometry, fin.first, fin.count);
        // Mark 3: small side fins (a short rounded fan, not a long blade).
        expect((Math.max(...pts.map((q) => q[0])) - Math.min(...pts.map((q) => q[0]))) / S.info('blackspotted_puffer').lengthM, 'pectoral length').toBeLessThan(0.15);
        // Mark 2: irregular black spots scatter across the body, the back included.
        const im = ms[0].material.map.image; let dark = 0, n = 0;
        for (let j = 0; j < im.height; j++) { const up = Math.sin(-Math.PI / 2 + (j + 0.5) / im.height * Math.PI * 2); if (up < 0.3 || up > 0.9) continue; for (let i = Math.floor(im.width * 0.25); i < im.width; i++) { n++; if (texel(im, i / im.width, j / im.height)[0] < 70) dark++; } }
        expect(dark / n, 'spots on the upper flank and back').toBeGreaterThan(0.105);
        expect(ms[0].geometry.userData.blackspottedPuffer.spots.length).toBeGreaterThan(80);
      } finally { h.dispose(); }
    });
  }

  it('paints the yellow longnose butterflyfish a deep golden yellow', () => {
    const h = make('yellow_longnose_butterflyfish');
    try {
      const im = meshes(h)[0].material.map.image, [r, g, b] = texel(im, 0.5 / 0.82, 0.25);
      expect(r).toBeGreaterThan(220); expect(b).toBeLessThan(50);
      expect(g / r, 'golden, not lemon').toBeLessThan(0.8);
    } finally { h.dispose(); }
  });

  it('gives the regal angelfish narrow pale bars on a yellow-orange body', () => {
    const h = make('regal_angelfish');
    try {
      const im = meshes(h)[0].material.map.image; let pale = 0, n = 0, warm = 0;
      for (let i = 0; i < 300; i++) {
        const x = -0.25 + i / 299 * 0.6, c = texel(im, (0.5 - x) / 0.79, 0.25); n++;
        if (c[0] > 175 && c[1] > 185 && c[2] > 170) pale++;
        if (c[0] > 210 && c[2] < 70 && c[1] < c[0] * 0.8) warm++;
      }
      // Mark 1: pale, dark-edged bars cross a yellow-orange body: the body
      // colour, not the bars, fills most of the flank.
      expect(pale / n, 'bars narrower than the gaps').toBeLessThan(0.35);
      expect(warm / n, 'yellow-orange gaps').toBeGreaterThan(0.4);
    } finally { h.dispose(); }
  });

  it('gives the mandarin dragonet blue-green skin between its orange bands', () => {
    const h = make('mandarin_dragonet');
    try {
      const im = meshes(h)[0].material.map.image; let teal = 0, n = 0;
      for (let i = 0; i < 320; i++) { const c = texel(im, (0.5 - (-0.23 + i / 319 * 0.63)) / 0.77, 0.25); n++; if (c[1] > c[0] * 1.3 && c[2] > c[0] * 1.1) teal++; }
      // Mark 1: winding blue-green and orange bands (the skin was olive).
      expect(teal / n, 'blue-green skin').toBeGreaterThan(0.35);
    } finally { h.dispose(); }
  });
});
