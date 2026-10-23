import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, ID = 'bennetts_feather_star';
const make = (quality = 'high', options = {}) => S.create(T, ID, { quality, seed: 7, ...options });
function meshes(h) { const out = []; h.root.traverse(m => { if (m.isMesh) out.push(m); }); return out; }
function bufferState(h) { return meshes(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function pose(h) { const out = []; h.root.traverse(n => out.push([...n.position.toArray(), ...n.quaternion.toArray(), ...n.scale.toArray()])); return out; }
function uniforms(m) {
  const s = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>' };
  m.material.onBeforeCompile(s); return s.uniforms;
}
function actualBounds(h) { h.root.updateMatrixWorld(true); const box = new T.Box3(), p = new T.Vector3(); for (const m of meshes(h)) for (let i = 0; i < m.geometry.attributes.position.count; i++) box.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld)); return box; }

describe('Bennett’s feather star specimen', () => {
  it('registers a base-rooted example whose nominal measurement is crown spread', () => {
    expect(S.ids.at(-1)).toBe(ID); expect(S.info(ID)).toMatchObject({ group: 'invertebrate', habit: 'bottom', lengthM: .32, depthM: [0, 50], origin: 'base', healthStates: ['healthy'] });
    expect(() => S.createSchool(T, ID, 2)).toThrow();
  });
  for (const quality of ['low', 'high']) {
    it('keeps complete finite geometry, real base contact and existing budgets at ' + quality, () => {
      for (const seed of [7, 23]) {
        const h = make(quality, { seed });
        try {
          const ms = meshes(h), box = actualBounds(h), size = box.getSize(new T.Vector3());
          expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
          expect(box.min.y).toBeCloseTo(0, 9); expect(size.y).toBeGreaterThan(.14); expect(size.y).toBeLessThan(.21); expect(size.x).toBeGreaterThan(.29); expect(size.x).toBeLessThan(.36);
          expect(h.radius).toBeGreaterThan(0); expect(Number.isFinite(h.radius)).toBe(true);
          for (const m of ms) {
            expect(m.userData).toMatchObject({ speciesId: ID, group: 'invertebrate' });
            for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true);
            expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true);
            expect(m.material.emissive.getHex()).toBe(0); expect(m.material.transparent).toBe(false);
          }
        } finally { h.dispose(); }
      }
    });
    it('retains five true basal origins, successive binary divisions and fifty tips at ' + quality, () => {
      const h = make(quality);
      try {
        const d = meshes(h)[1].geometry.userData.featherStar, roots = d.nodes.filter(n => n.parent === -1);
        expect(d.basalRays).toBe(5); expect(roots).toHaveLength(5); expect(d.terminalArmCount).toBe(50); expect(d.arms).toHaveLength(50);
        expect(new Set(d.arms.map(a => a.index)).size).toBe(50);
        for (const n of d.nodes) { expect(n.children).toHaveLength(2); expect(n.point[1] - .052).toBeLessThan(d.staticEnvelopeHeightM / d.scale); }
        for (const a of d.arms) { expect(d.nodes[a.node].children).toContain('arm-' + a.index); expect(a.start).toEqual(d.nodes[a.node].point); }
        const counts = roots.map(root => { const index = d.nodes.indexOf(root); return d.arms.filter(a => { let n = a.node; while (d.nodes[n].parent !== -1) n = d.nodes[n].parent; return n === index; }).length; });
        expect(counts).toEqual([10, 10, 10, 10, 10]);
      } finally { h.dispose(); }
    });
    it('attaches alternating real pinnules to every sampled arm at ' + quality, () => {
      const h = make(quality);
      try {
        const g = meshes(h)[1].geometry, d = g.userData.featherStar, p = g.attributes.position;
        expect(d.pinnulesPerArm).toBe(quality === 'high' ? 64 : 18);
        for (const a of d.arms) {
          expect(a.pinnules).toHaveLength(d.pinnulesPerArm);
          for (let j = 0; j < a.pinnules.length; j++) {
            const v = a.pinnules[j], mid = new T.Vector3().fromBufferAttribute(p, v.first).add(new T.Vector3().fromBufferAttribute(p, v.first + 1)).multiplyScalar(.5);
            const root = new T.Vector3(-(v.root[1] - .052) * d.scale, v.root[0] * d.scale, v.root[2] * d.scale);
            expect(mid.distanceTo(root)).toBeLessThan(2e-8); expect(v.side).toBe(j % 2 ? 1 : -1);
            const end = new T.Vector3().fromBufferAttribute(p, v.first + v.count - 1); expect(end.distanceTo(root)).toBeGreaterThan(.0015); expect(end.distanceTo(root)).toBeLessThan(.019);
          }
        }
      } finally { h.dispose(); }
    });
    it('separates robust fixed hooked cirri from the feather crown and perch at ' + quality, () => {
      const h = make(quality);
      try {
        const g = meshes(h)[0].geometry, d = g.userData.featherStar, p = g.attributes.position, crown = meshes(h)[1].geometry.userData.featherStar;
        expect(d.cirri).toHaveLength(30); expect(d.cirri.filter(c => c.tube)).toHaveLength(quality === 'high' ? 8 : 4);
        const r = d.ranges.perch, box = new T.Box3(); for (let i = r.first; i < r.first + r.count; i++) box.expandByPoint(new T.Vector3().fromBufferAttribute(p, i));
        expect(box.min.y).toBeCloseTo(0, 9); expect(box.max.y).toBeLessThan(crown.discHeightM); expect(box.getSize(new T.Vector3()).x).toBeLessThan(.08);
        for (const cirrus of d.cirri) { const contact = new T.Vector3(cirrus.contact[0] * d.scale, cirrus.contact[1] * d.scale - d.baseCorrectionM, cirrus.contact[2] * d.scale); expect(box.containsPoint(contact)).toBe(true); expect(cirrus.count).toBeGreaterThan(10); }
        expect(d.ranges.oralOpening.first).toBeLessThan(d.ranges.cirri.first);
      } finally { h.dispose(); }
    });
  }
  it('preserves seeded terminal geometry across tiers and changes individuals deterministically', () => {
    const a = make('high'), b = make('high'), low = make('low'), other = make('high', { seed: 8 });
    try {
      expect(bufferState(a)).toEqual(bufferState(b)); expect(bufferState(a)).not.toEqual(bufferState(other));
      const hiData = meshes(a)[1].geometry.userData.featherStar, lowData = meshes(low)[1].geometry.userData.featherStar;
      expect(hiData.nodes).toEqual(lowData.nodes); expect(hiData.arms.map(a => a.params)).toEqual(lowData.arms.map(a => a.params));
      expect(hiData.arms.map(a => a.start)).toEqual(lowData.arms.map(a => a.start));
    } finally { a.dispose(); b.dispose(); low.dispose(); other.dispose(); }
  });
  it('moves only soft distal crown through analytic uniforms without CPU uploads or root drift', () => {
    const a = make(), b = make();
    try {
      a.root.position.set(3, -2, 4); a.root.rotation.y = .7; b.root.position.copy(a.root.position); b.root.rotation.copy(a.root.rotation);
      const before = pose(a), buffers = bufferState(a), versions = meshes(a).map(m => Object.values(m.geometry.attributes).map(a => a.version)), ua = uniforms(meshes(a)[1]), ub = uniforms(meshes(b)[1]);
      a.update(.016, 2, { current: { x: 1, z: .4, strength: 1 } }); const v = ua.reefSwim.value.clone();
      a.update(.001, 2.001, { current: { x: 1, z: .4, strength: 1 } }); expect(ua.reefSwim.value.clone().sub(v).length()).toBeLessThan(.002);
      expect(ua.reefSwim.value.y).toBeGreaterThan(0); expect(ua.reefSwim.value.y).toBeLessThan(.0028); expect(ua.reefSwimShape.value.x).toBeLessThan(0); expect(ua.reefSwimShape.value.z).toBe(1);
      expect(pose(a)).toEqual(before); expect(bufferState(a)).toEqual(buffers); expect(meshes(a).map(m => Object.values(m.geometry.attributes).map(a => a.version))).toEqual(versions);
      a.update(.01, 4); b.update(4, 4); expect(ua.reefSwim.value.toArray()).toEqual(ub.reefSwim.value.toArray());
    } finally { a.dispose(); b.dispose(); }
  });
  it('fully freezes reduced-motion geometry, attachment poses and shader uniforms', () => {
    const h = make('high', { reducedMotion: true });
    try {
      const before = pose(h), buffers = bufferState(h), u = uniforms(meshes(h)[1]), swim = u.reefSwim.value.toArray();
      for (const t of [1, 100, 10000]) h.update(.016, t, { current: { x: 1, z: 1, strength: 1 } });
      expect(pose(h)).toEqual(before); expect(bufferState(h)).toEqual(buffers); expect(u.reefSwim.value.toArray()).toEqual(swim);
    } finally { h.dispose(); }
  });
  it('shares existing texture resources and disposes each owned resource once', () => {
    const a = make(), b = make(), ms = meshes(a), textures = new Set(ms.flatMap(m => [m.material.map, m.material.bumpMap]));
    let ng = 0, nm = 0, nt = 0; for (const m of ms) { m.geometry.addEventListener('dispose', () => ng++); m.material.addEventListener('dispose', () => nm++); } for (const t of textures) t.addEventListener('dispose', () => nt++);
    expect(ms[0].material.map).toBe(meshes(b)[0].material.map); expect(ms[0].material.bumpMap).toBe(meshes(b)[0].material.bumpMap);
    a.dispose(); a.dispose(); expect([ng, nm, nt]).toEqual([2, 2, 0]); b.dispose(); b.dispose(); expect(nt).toBe(textures.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
  it('retains colour and two draws without derivative extensions', () => {
    const h = make('low', { derivatives: false }); try { expect(meshes(h)).toHaveLength(2); for (const m of meshes(h)) { expect(m.material.bumpMap).toBeNull(); expect(m.material.map).toBeTruthy(); } expect(() => h.update(.1, 2)).not.toThrow(); } finally { h.dispose(); }
  });
});
