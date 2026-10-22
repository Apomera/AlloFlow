import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const IDS = ['firefish', 'copperband_butterflyfish'];
function meshes(h) { const out = []; h.root.traverse(m => { if (m.isMesh) out.push(m); }); return out; }
function snapshot(h) {
  h.root.updateMatrixWorld(true); const out = [];
  h.root.traverse(n => { out.push([...n.matrixWorld.elements]); if (n.isMesh) for (const a of Object.values(n.geometry.attributes)) out.push([...a.array]); }); return out;
}
function make(id, quality, extra = {}) { return S.create(T, id, { seed: 7, quality, ...extra }); }
function colourAt(h, id, x) {
  const image = h.root.getObjectByName(id + '-body').material.map.image;
  const from = .5, to = id === 'firefish' ? -.31 : -.3, u = (from - x) / (from - to);
  const i = Math.floor(u * image.width), j = Math.floor(.25 * image.height), k = (j * image.width + i) * 4;
  return Array.from(image.data.slice(k, k + 3));
}

describe('new Indo-Pacific specimens', () => {
  for (const id of IDS) for (const quality of ['high', 'low']) {
    it(id + ' has finite detailed geometry at real scale within the ' + quality + ' budget', () => {
      const h = make(id, quality);
      try {
        const parts = meshes(h), budget = quality === 'high' ? 6000 : 1500;
        expect(parts).toHaveLength(2);
        expect(parts.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThanOrEqual(budget);
        for (const m of parts) {
          for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), id + ' ' + a.name).toBe(true);
          expect(m.geometry.boundingBox.isEmpty()).toBe(false);
          expect(Number.isFinite(m.geometry.boundingSphere.radius)).toBe(true);
        }
        const body = h.root.getObjectByName(id + '-body').geometry.boundingBox;
        const length = body.max.x - body.min.x;
        expect(length).toBeGreaterThan(S.info(id).lengthM * .65);
        expect(length).toBeLessThan(S.info(id).lengthM * 1.1);
        expect(S.info(id).origin).toBe('centre');
      } finally { h.dispose(); }
    });

    it(id + ' preserves deterministic geometry and a fully still inspection pose at ' + quality, () => {
      const a = make(id, quality, { reducedMotion: true }), b = make(id, quality, { reducedMotion: true });
      try {
        const initial = snapshot(a); expect(snapshot(b)).toEqual(initial);
        a.root.position.set(3, 2, -4); const placed = snapshot(a);
        for (const time of [.5, 10, 1000]) a.update(.016, time, { speed: 1, turn: .8 });
        expect(snapshot(a)).toEqual(placed);
      } finally { a.dispose(); b.dispose(); }
    });
  }

  it('makes the firefish dorsal sail and white-to-red transition legible', () => {
    const h = make('firefish', 'high');
    try {
      const body = h.root.getObjectByName('firefish-body').geometry.boundingBox;
      const fins = h.root.getObjectByName('firefish-fins').geometry.boundingBox;
      expect(fins.max.y).toBeGreaterThan(body.max.y * 2.5);
      const head = colourAt(h, 'firefish', .26), rear = colourAt(h, 'firefish', -.22);
      expect(Math.min(...head)).toBeGreaterThan(190);
      expect(rear[0]).toBeGreaterThan(rear[1] * 2);
      expect(rear[0]).toBeGreaterThan(rear[2] * 2);
    } finally { h.dispose(); }
  });

  it('keeps the narrow firefish pennant silhouette through level-of-detail changes', () => {
    const high = make('firefish', 'high'), low = make('firefish', 'low');
    try {
      const height = h => h.root.getObjectByName('firefish-fins').geometry.boundingBox.max.y;
      // The established detailed fin adds a 3.5% alternate-ray scallop.
      // Keep the full pennant sampled in both tiers instead of losing its tip.
      expect(Math.abs(height(low) / height(high) - 1)).toBeLessThan(.04);
    } finally { high.dispose(); low.dispose(); }
  });

  it('gives the copperband an elongated narrow adult snout and separate orange bands', () => {
    const h = make('copperband_butterflyfish', 'high');
    try {
      const body = h.root.getObjectByName('copperband_butterflyfish-body').geometry, p = body.attributes.position, unit = body.boundingBox.max.x / .503;
      let frontHalfWidth = 0, trunkHalfWidth = 0;
      for (let i = 0; i < p.count; i++) {
        if (p.getX(i) > .4 * unit) frontHalfWidth = Math.max(frontHalfWidth, Math.abs(p.getZ(i)));
        if (p.getX(i) < .15 * unit) trunkHalfWidth = Math.max(trunkHalfWidth, Math.abs(p.getZ(i)));
      }
      expect(frontHalfWidth).toBeLessThan(trunkHalfWidth * .4);
      const bar = colourAt(h, 'copperband_butterflyfish', .117), gap = colourAt(h, 'copperband_butterflyfish', .02);
      expect(bar[0]).toBeGreaterThan(bar[2] * 2);
      expect(Math.min(...gap)).toBeGreaterThan(190);
    } finally { h.dispose(); }
  });

  it('animates the existing rig without changing placement or uploading new vertex buffers', () => {
    for (const id of IDS) {
      const h = make(id, 'high');
      try {
        h.root.position.set(4, 2, -6); h.root.rotation.y = .8;
        const placement = [...h.root.position.toArray(), ...h.root.quaternion.toArray()], parts = meshes(h), versions = parts.map(m => [m.geometry.attributes.position.version, m.geometry.attributes.normal.version]);
        const tail = h.root.getObjectByName(id + '-tail-pivot'), before = tail.rotation.y;
        let change = 0;
        for (let f = 0; f < 120; f++) { h.update(1/60, f/60, { speed: .1, turn: .2 }); change = Math.max(change, Math.abs(tail.rotation.y - before)); }
        expect(change).toBeGreaterThan(.02);
        expect([...h.root.position.toArray(), ...h.root.quaternion.toArray()]).toEqual(placement);
        expect(parts.map(m => [m.geometry.attributes.position.version, m.geometry.attributes.normal.version])).toEqual(versions);
      } finally { h.dispose(); }
    }
  });

  it('reference-counts shared maps and releases each model resource once', () => {
    for (const id of IDS) {
      const a = make(id, 'high'), b = make(id, 'high'), am = meshes(a), bm = meshes(b), maps = new Set();
      for (const m of am) for (const key of ['map', 'bumpMap', 'roughnessMap']) if (m.material[key]) maps.add(m.material[key]);
      const shared = am[0].material.map; expect(bm[0].material.map).toBe(shared);
      let textureDisposed = 0, geometryDisposed = 0, materialDisposed = 0;
      for (const map of maps) map.addEventListener('dispose', () => textureDisposed++);
      for (const geometry of new Set(am.map(m => m.geometry))) geometry.addEventListener('dispose', () => geometryDisposed++);
      for (const material of new Set(am.map(m => m.material))) material.addEventListener('dispose', () => materialDisposed++);
      a.dispose(); a.dispose();
      expect(geometryDisposed).toBe(2); expect(materialDisposed).toBe(2); expect(textureDisposed).toBe(0);
      b.dispose(); b.dispose(); expect(textureDisposed).toBe(maps.size);
    }
  });
});
