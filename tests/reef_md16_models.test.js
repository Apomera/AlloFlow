// Round 16 lane models (md16): growth forms the Species guide names must show
// on six rebuilt coral models. Each check failed on the round 16 base file.
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
function size(h) { h.root.updateMatrixWorld(true); const b = new T.Box3().setFromObject(h.root), s = b.getSize(new T.Vector3()); return { W: Math.max(s.x, s.z), H: s.y }; }
// Separate tubes in a mesh: each branch is its own vertex island.
function islands(g) {
  const n = g.attributes.position.count, par = new Int32Array(n).map((_, i) => i), idx = g.index.array;
  const f = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
  for (let k = 0; k < idx.length; k += 3) { const a = f(idx[k]), b = f(idx[k + 1]), c = f(idx[k + 2]); par[b] = a; par[f(c)] = a; }
  const roots = new Set(); for (let i = 0; i < n; i++) roots.add(f(i)); return roots.size;
}
// Mean angle in degrees between the normals of faces sharing an edge: high for a faceted, pyramid-studded mesh.
function crease(g) {
  const p = g.attributes.position, idx = g.index.array, fn = [], edges = new Map(), v = (i) => new T.Vector3().fromBufferAttribute(p, i);
  for (let k = 0; k < idx.length; k += 3) {
    const a = v(idx[k]), b = v(idx[k + 1]), c = v(idx[k + 2]), nrm = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a));
    if (nrm.lengthSq() < 1e-16) { fn.push(null); continue; } fn.push(nrm.normalize());
    for (const [x, y] of [[idx[k], idx[k + 1]], [idx[k + 1], idx[k + 2]], [idx[k + 2], idx[k]]]) { const key = Math.min(x, y) + ',' + Math.max(x, y); if (!edges.has(key)) edges.set(key, []); edges.get(key).push(k / 3); }
  }
  let s = 0, n = 0; edges.forEach((f2) => { if (f2.length === 2 && fn[f2[0]] && fn[f2[1]]) { s += Math.acos(Math.max(-1, Math.min(1, fn[f2[0]].dot(fn[f2[1]])))) * 180 / Math.PI; n++; } });
  return s / n;
}

describe('md16 rebuilt coral models', () => {
  for (const quality of ['low', 'high']) {
    it('grows staghorn coral as one colony: trunks rise from a shared base and every tip stays up at ' + quality, () => {
      const h = make('staghorn_coral', quality);
      try {
        const g = part(h, 'colony').geometry, p = g.attributes.position, n = p.count, idx = g.index.array;
        let foot = 0, Y0 = Infinity, Y1 = -Infinity, minI = 0, far = 0;
        for (let i = 0; i < n; i++) { const y = p.getY(i); if (y < Y0) { Y0 = y; minI = i; } Y1 = Math.max(Y1, y); if (y < 0.03) foot = Math.max(foot, Math.hypot(p.getX(i), p.getZ(i))); }
        expect(foot, 'a shared encrusting base, not one point').toBeGreaterThan(0.12);
        // Nothing lies along the ground outside that base.
        for (let i = 0; i < n; i++) if (p.getY(i) < Y0 + 0.06) far = Math.max(far, Math.hypot(p.getX(i), p.getZ(i)));
        expect(far, 'no branch lying on the ground').toBeLessThan(0.17);
        // Each tube is a vertex island; a tip is a branch segment no higher segment carries on from.
        const par = new Int32Array(n).map((_, i) => i), f = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
        for (let k = 0; k < idx.length; k += 3) { const a = f(idx[k]), b = f(idx[k + 1]), c = f(idx[k + 2]); par[b] = a; par[f(c)] = a; }
        const root = new Int32Array(n), top = new Map(), cnt = new Map(), at = new Map();
        for (let i = 0; i < n; i++) { const r = root[i] = f(i), y = p.getY(i); cnt.set(r, (cnt.get(r) || 0) + 1); if (!top.has(r) || y > top.get(r)) { top.set(r, y); at.set(r, i); } }
        const base = root[minI], isBranch = (r) => r !== base && cnt.get(r) >= 10;
        let lowest = Infinity, tips = 0;
        top.forEach((t, r) => {
          if (!isBranch(r)) return;
          const i0 = at.get(r), x = p.getX(i0), y = p.getY(i0), z = p.getZ(i0); let on = false;
          for (let i = 0; i < n && !on; i++) { const o = root[i]; if (o !== r && isBranch(o) && top.get(o) > t && Math.hypot(p.getX(i) - x, p.getY(i) - y, p.getZ(i) - z) < 0.03) on = true; }
          if (!on) { tips++; lowest = Math.min(lowest, t); }
        });
        expect(tips, 'many antler tips').toBeGreaterThan(25);
        expect((lowest - Y0) / (Y1 - Y0), 'lowest branch tip as a share of colony height').toBeGreaterThan(1 / 3);
      } finally { h.dispose(); }
    });

    it('rounds the cauliflower coral knobs instead of studding it with pyramids at ' + quality, () => {
      const h = make('cauliflower_coral', quality);
      try { expect(crease(part(h, 'colony').geometry)).toBeLessThan(quality === 'high' ? 36 : 43); } finally { h.dispose(); }
    });

    it('packs the birdsnest coral with more, finer branches at ' + quality, () => {
      const h = make('birdsnest_coral', quality);
      try { expect(islands(part(h, 'colony').geometry), 'separate branch tubes').toBeGreaterThan(340); } finally { h.dispose(); }
    });

    it('builds Acropora millepora as a low cushion of short branches at ' + quality, () => {
      const h = make('acropora_millepora', quality);
      try { const b = size(h); expect(b.H / b.W, 'cushion, not a brush of tall fingers').toBeLessThan(0.4); expect(b.H, 'branches stay short').toBeLessThan(0.32); } finally { h.dispose(); }
    });

    it('gives hammer coral fat, round tentacle tubes at ' + quality, () => {
      const h = make('hammer_coral', quality);
      try {
        const g = part(h, 'tentacles').geometry, p = g.attributes.position, st = g.userData.hammerCoral;
        expect(st.sides, 'round, not square, tubes').toBeGreaterThanOrEqual(quality === 'high' ? 6 : 4);
        for (const s of st.strands) {
          let cx = 0, cz = 0, r = 0;
          for (let i = 0; i < st.sides; i++) { cx += p.getX(s.first + i) / st.sides; cz += p.getZ(s.first + i) / st.sides; }
          for (let i = 0; i < st.sides; i++) r += Math.hypot(p.getX(s.first + i) - cx, p.getZ(s.first + i) - cz) / st.sides;
          expect(r, 'stalk radius').toBeGreaterThan(0.005);
        }
      } finally { h.dispose(); }
    });

    it('stands the orange cup coral cups on a rounded mound at ' + quality, () => {
      const h = make('orange_cup_coral', quality);
      try {
        const p = part(h, 'skeletal-cups').geometry.attributes.position; let top = 0;
        for (let i = 0; i < p.count; i++) if (Math.hypot(p.getX(i), p.getZ(i)) < 0.003) top = Math.max(top, p.getY(i));
        expect(top, 'mound crown height in m').toBeGreaterThan(0.015);
      } finally { h.dispose(); }
    });
  }
});
