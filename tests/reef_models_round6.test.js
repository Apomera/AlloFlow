import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Model round 6: the field marks a student should see on six rebuilt Guide models.
// Pins only these models' own marks, so other lanes can add species alongside them.
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies;
const make = (id, quality = 'high', o = {}) => S.create(T, id, Object.assign({ seed: 7, reducedMotion: true, quality }, o));
const part = (h, name) => h.root.getObjectByName(h.root.userData.speciesId + '-' + name);
const sat = (c) => { const M = Math.max(...c), m = Math.min(...c); return M ? (M - m) / M : 0; };
const lumOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

// Top-down coverage of a mesh on a grid: the filled share and the number of enclosed gaps.
function topDown(mesh, n) {
  const g = mesh.geometry, p = g.attributes.position, idx = g.index, box = new T.Box3().setFromBufferAttribute(p), grid = new Uint8Array(n * n);
  const sx = (n - 1) / (box.max.x - box.min.x), sz = (n - 1) / (box.max.z - box.min.z);
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
    const ax = (p.getX(a) - box.min.x) * sx, az = (p.getZ(a) - box.min.z) * sz, bx = (p.getX(b) - box.min.x) * sx, bz = (p.getZ(b) - box.min.z) * sz, cx = (p.getX(c) - box.min.x) * sx, cz = (p.getZ(c) - box.min.z) * sz;
    const steps = Math.ceil(Math.max(Math.hypot(ax - bx, az - bz), Math.hypot(ax - cx, az - cz), Math.hypot(bx - cx, bz - cz))) + 1;
    for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps - i; j++) {
      const u = i / steps, v = j / steps, q = 1 - u - v;
      grid[Math.round(az * u + bz * v + cz * q) * n + Math.round(ax * u + bx * v + cx * q)] = 1;
    }
  }
  const seen = new Uint8Array(n * n);
  function flood(start) {
    const stack = [start]; let edge = false, size = 0; seen[start] = 1;
    while (stack.length) {
      const k = stack.pop(), x = k % n, y = (k - x) / n; size++;
      if (x === 0 || y === 0 || x === n - 1 || y === n - 1) edge = true;
      for (const m of [x > 0 ? k - 1 : -1, x < n - 1 ? k + 1 : -1, y > 0 ? k - n : -1, y < n - 1 ? k + n : -1]) if (m >= 0 && !seen[m] && !grid[m]) { seen[m] = 1; stack.push(m); }
    }
    return { edge, size };
  }
  let gaps = 0, filled = 0;
  for (let k = 0; k < grid.length; k++) { if (grid[k]) { filled++; continue; } if (!seen[k]) { const f = flood(k); if (!f.edge && f.size >= 4) gaps++; } }
  return { gaps, filled: filled / grid.length };
}

describe('Drupella cluster (marks 1-3)', () => {
  for (const quality of ['low', 'high']) {
    it('lays four shells close together, side on to the portrait, at ' + quality, () => {
      const h = make('drupella_snail', quality);
      try {
        const soft = part(h, 'siphons-tentacles').geometry.userData.drupellaCluster.snails, dir = new T.Vector3(...S.info('drupella_snail').portrait.dir).normalize();
        expect(soft).toHaveLength(4);
        let sideOn = 0;
        for (const s of soft) if (Math.abs(new T.Vector3(...s.axis).dot(dir)) < 0.45) sideOn++;
        expect(sideOn, 'shell outlines, not end-on balls').toBeGreaterThanOrEqual(3);
        for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) expect(new T.Vector3(...soft[a].origin).distanceTo(new T.Vector3(...soft[b].origin)), 'pressed close together').toBeLessThan(1);
      } finally { h.dispose(); }
    });

    it('keeps a white grazed end and living brown branchlets at the other end at ' + quality, () => {
      const h = make('drupella_snail', quality);
      try {
        const m = part(h, 'coral-tip-and-shells').geometry, r = m.userData.drupellaCluster.ranges['branch-tip-live-tissue-and-scar'], p = m.attributes.position, c = m.attributes.color, box = new T.Box3().setFromBufferAttribute(p), mid = (box.min.x + box.max.x) / 2;
        let whiteLeft = 0, whiteRight = 0, brownLeft = 0, brownRight = 0;
        for (let i = r.first; i < r.first + r.count; i++) {
          const col = [c.getX(i), c.getY(i), c.getZ(i)], white = lumOf(col) > 0.65 && sat(col) < 0.2, brown = col[0] > col[2] * 1.6, left = p.getX(i) < mid;
          if (white) { if (left) whiteLeft++; else whiteRight++; }
          if (brown) { if (left) brownLeft++; else brownRight++; }
        }
        expect(whiteLeft, 'the scar runs along the older end').toBeGreaterThan(whiteRight);
        expect(brownRight, 'living tissue at the far end').toBeGreaterThan(brownLeft * 3);
      } finally { h.dispose(); }
    });
  }
});

describe('Sea cucumber (marks 1-3)', () => {
  for (const [quality, least] of [['low', 10], ['high', 40]]) {
    it('scatters small low bumps over the back and both flanks at ' + quality, () => {
      for (const seed of [7, 23]) {
        const h = make('sea_cucumber', quality, { seed });
        try {
          const g = part(h, 'body').geometry, p = g.attributes.position, box = new T.Box3().setFromBufferAttribute(p), length = box.max.x - box.min.x, bumps = g.userData.cucumber.papillae;
          expect(bumps.length).toBeGreaterThanOrEqual(least);
          const xs = bumps.map((b) => b.x), zs = bumps.map((b) => b.z), midZ = (Math.max(...zs) + Math.min(...zs)) / 2;
          expect(Math.max(...xs) - Math.min(...xs), 'along the body').toBeGreaterThan(length * 0.55);
          expect(zs.filter((z) => z > midZ + length * 0.03).length, 'one flank').toBeGreaterThan(1);
          expect(zs.filter((z) => z < midZ - length * 0.03).length, 'other flank').toBeGreaterThan(1);
          for (const b of bumps) { expect(b.radius, 'visible at Guide size').toBeGreaterThan(length * 0.005); expect(b.radius, 'a bump, never a spine').toBeLessThan(length * 0.015); }
        } finally { h.dispose(); }
      }
    });
  }

  it('lies in a slack curve instead of a straight rod', () => {
    for (const seed of [7, 23, 41]) {
      const h = make('sea_cucumber', 'high', { seed });
      try {
        const p = part(h, 'body').geometry.attributes.position, box = new T.Box3().setFromBufferAttribute(p), L = box.max.x - box.min.x;
        const centre = (a, b) => { let s = 0, n = 0; for (let i = 0; i < p.count; i++) { const t = (p.getX(i) - box.min.x) / L; if (t >= a && t < b && p.getY(i) > box.max.y * 0.3) { s += p.getZ(i); n++; } } return s / n; };
        const bow = centre(0.45, 0.55) - (centre(0.15, 0.25) + centre(0.75, 0.85)) / 2;
        expect(Math.abs(bow), 'seed ' + seed).toBeGreaterThan(L * 0.006);
      } finally { h.dispose(); }
    }
  });
});

describe('Christmas tree worm (marks 1-2)', () => {
  for (const quality of ['low', 'high']) {
    it('splays the two crowns of each worm from one tube at ' + quality, () => {
      const h = make('christmas_tree_worm', quality);
      try {
        const m = part(h, 'worms'), up = (i) => { const q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), e = new T.Matrix4(); m.getMatrixAt(i, e); e.decompose(p, q, s); return new T.Vector3(0, 1, 0).applyQuaternion(q); };
        for (let i = 0; i < m.count; i += 2) expect(up(i).angleTo(up(i + 1)), 'pair ' + i).toBeGreaterThan(0.45);
      } finally { h.dispose(); }
    });

    it('gives each crown real size on its host, in colours that do not wash out, at ' + quality, () => {
      const h = make('christmas_tree_worm', quality);
      try {
        const m = part(h, 'worms'), crown = new T.Box3().setFromBufferAttribute(m.geometry.attributes.position), head = new T.Box3().setFromBufferAttribute(part(h, 'coral-head').geometry.attributes.position), c = m.geometry.attributes.color;
        expect((crown.max.y - crown.min.y) / (head.max.x - head.min.x), 'crown height against the head').toBeGreaterThan(0.2);
        let top = 0; for (let i = 0; i < c.count; i++) top = Math.max(top, c.getX(i));
        expect(top, 'a vertex tint above 1 pushes colours to white').toBeLessThanOrEqual(1.06);
      } finally { h.dispose(); }
    });
  }
});

describe('Boulder coral (marks 1-3)', () => {
  it('shows polyp cups as a readable stipple in the living map, on both tiers', () => {
    for (const quality of ['low', 'high']) {
      const h = make('boulder_coral', quality), d = part(h, 'colony').material.map.image.data, v = [];
      for (let i = 0; i < d.length; i += 4) v.push(d[i]);
      v.sort((a, b) => a - b);
      expect(v[Math.floor(v.length * 0.97)] - v[Math.floor(v.length * 0.03)], quality + ' cup contrast').toBeGreaterThan(100);
      h.dispose();
    }
  });

  it('offers clearly brown, green and blue colonies across seeds', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 40; seed++) {
      const h = make('boulder_coral', 'low', { seed }), c = part(h, 'colony').geometry.attributes.color; let r = 0, g = 0, b = 0;
      for (let i = 0; i < c.count; i++) { r += c.getX(i); g += c.getY(i); b += c.getZ(i); }
      seen.add(b > r ? 'blue' : g > r ? 'green' : 'brown'); h.dispose();
    }
    expect([...seen].sort()).toEqual(['blue', 'brown', 'green']);
  });
});

describe('Acropora clathrata (its Guide clues)', () => {
  it('forms a joined net with open gaps, the same colony on both tiers, much wider than tall', () => {
    const low = make('acropora_clathrata', 'low'), high = make('acropora_clathrata', 'high');
    try {
      const a = topDown(part(low, 'colony'), 160), b = topDown(part(high, 'colony'), 160);
      expect(b.gaps, 'branches join around open spaces').toBeGreaterThanOrEqual(15);
      expect(Math.abs(a.gaps - b.gaps) / b.gaps, 'one colony, not one per tier').toBeLessThan(0.3);
      expect(b.filled).toBeGreaterThan(0.2); expect(b.filled).toBeLessThan(0.7);
      const box = new T.Box3().setFromObject(high.root);
      expect(Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / (box.max.y - box.min.y), 'a shelf').toBeGreaterThan(3);
    } finally { low.dispose(); high.dispose(); }
  });

  it('is deeper green near the attachment than at the growing rim', () => {
    const h = make('acropora_clathrata', 'high');
    try {
      const g = part(h, 'colony').geometry, p = g.attributes.position, c = g.attributes.color; let i0 = 0, n0 = 0, i1 = 0, n1 = 0;
      for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)), l = lumOf([c.getX(i), c.getY(i), c.getZ(i)]); if (r < 0.3) { i0 += l; n0++; } else if (r > 0.75) { i1 += l; n1++; } }
      expect(i1 / n1).toBeGreaterThan(i0 / n0 * 2);
    } finally { h.dispose(); }
  });

  it('keeps the net through the bleached and dead states', () => {
    const live = make('acropora_clathrata', 'low'), a = topDown(part(live, 'colony'), 160).gaps;
    for (const health of ['bleached', 'dead']) { const h = make('acropora_clathrata', 'low', { health }); expect(topDown(part(h, 'colony'), 160).gaps, health).toBe(a); h.dispose(); }
    live.dispose();
  });
});

describe('Foliose coral (marks 1-2)', () => {
  it('stacks plates in tiers, with a wide pale margin', () => {
    for (const quality of ['low', 'high']) {
      const h = make('foliose_coral', quality), g = part(h, 'colony').geometry, p = g.attributes.position, c = g.attributes.color, mat = new T.MeshBasicMaterial({ side: T.DoubleSide }), probe = new T.Mesh(g, mat), ray = new T.Raycaster();
      try {
        const box = new T.Box3().setFromBufferAttribute(p), R = (box.max.x - box.min.x) / 2; let layers = 0, n = 0;
        probe.updateMatrixWorld(true);
        for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; ray.set(new T.Vector3(Math.cos(t) * R * 0.42, 2, Math.sin(t) * R * 0.42), new T.Vector3(0, -1, 0)); layers += ray.intersectObject(probe).length; n++; }
        expect(layers / n, quality + ' plate over plate').toBeGreaterThan(2);
        const L = []; for (let i = 0; i < c.count; i++) L.push(lumOf([c.getX(i), c.getY(i), c.getZ(i)]));
        L.sort((x, y) => x - y);
        expect(L[Math.floor(L.length * 0.7)], quality + ' wide pale growing margin').toBeGreaterThan(L[Math.floor(L.length * 0.3)] * 2);
      } finally { mat.dispose(); h.dispose(); }
    }
  });
});
