import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, ID = 'ribbon_eel';
const make = (quality = 'high', options = {}) => S.create(T, ID, { quality, seed: 7, ...options });
function meshes(h) { const out = []; h.root.traverse(m => { if (m.isMesh) out.push(m); }); return out; }
function buffers(h) { return meshes(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function pose(h) { const out = []; h.root.traverse(n => out.push([...n.position.toArray(), ...n.quaternion.toArray(), ...n.scale.toArray()])); return out; }
function uniforms(m) { const s = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>' }; m.material.onBeforeCompile(s); return s.uniforms; }
function region(g, r) { const b = new T.Box3(), a = g.attributes.position; for (let i = r.first; i < r.first + r.count; i++) b.expandByPoint(new T.Vector3().fromBufferAttribute(a, i)); return b; }
function actualBounds(h) { h.root.updateMatrixWorld(true); const b = new T.Box3(), p = new T.Vector3(); for (const m of meshes(h)) for (let i = 0; i < m.geometry.attributes.position.count; i++) b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld)); return b; }
// Same analytical displacement as the shared non-rigged body shader, including
// its smooth envelope. This checks fixed geometry on the GPU path, not just a
// root transform which could stay still while its rock/attachment vertices sway.
function bodyShaderPoint(m, i, u) { const p = new T.Vector3().fromBufferAttribute(m.geometry.attributes.position, i), s = u.reefSwimShape.value, swim = u.reefSwim.value; let w = Math.max(0, Math.min(1, (s.x - p.x) / Math.max(s.x - s.y, .0001))); w = w * w * (3 - 2 * w); p.z += swim.y * s.z * w * w * Math.sin(swim.x - swim.z * p.x); return p; }

describe('Ribbon eel specimen', () => {
  it('registers a partial unsexed appearance with total-length metadata', () => {
    expect(S.ids).toContain(ID); expect(S.ids.indexOf(ID)).toBeGreaterThan(S.ids.indexOf('peacock_mantis_shrimp'));
    expect(S.info(ID)).toMatchObject({ group: 'fish', habit: 'crevice', lengthM: 1, depthM: [1, 57], origin: 'base', healthStates: ['healthy'] });
    expect(() => S.createSchool(T, ID, 3)).toThrow();
  });
  for (const quality of ['low', 'high']) {
    it('keeps finite geometry, two draws and the original animal budgets at ' + quality, () => {
      for (const seed of [7, 23]) { const h = make(quality, { seed }); try {
        const ms = meshes(h), box = actualBounds(h), d = ms[0].geometry.userData.ribbonEel;
        expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
        expect(box.min.y).toBe(0); expect(box.getSize(new T.Vector3()).y).toBeGreaterThan(.29); expect(box.getSize(new T.Vector3()).y).toBeLessThan(.34);
        expect(d.nominalTotalLengthM).toBe(1); expect(d.exposedCenterlineM).toBeGreaterThan(.42); expect(d.exposedCenterlineM).toBeLessThan(.49); expect(d.buriedTailImplied).toBe(true); expect(d.appearance).toBe('blue-yellow-unsexed');
        for (const m of ms) { expect(m.userData).toMatchObject({ speciesId: ID, group: 'fish' }); for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true); expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true); expect(m.material.emissive.getHex()).toBe(0); expect(m.material.transparent).toBe(false); }
      } finally { h.dispose(); } }
    });
    it('has real open nostril fans, one upper projection and three lower projections at ' + quality, () => {
      const h = make(quality); try {
        const ms = meshes(h), g = ms[1].geometry, d = g.userData.ribbonEel, table = g.userData.batch;
        expect(d.nostrils).toHaveLength(2); expect(d.nostrils.map(n => n.side)).toEqual([-1, 1]); expect(d.upperSnoutProjectionCount).toBe(1); expect(d.chinProjections).toHaveLength(3); expect(d.chinProjections.map(p => p.side)).toEqual([-1, 0, 1]); expect(d.mouthInterior).toBe(true);
        for (const side of [-1, 1]) { const n = d.nostrils.find(n => n.side === side), q = n.opening; expect(q[0]).toBeLessThan(0); expect(q[1]).toBeGreaterThan(.34); expect(q[2] * side).toBeGreaterThan(.005); expect(n.count).toBeGreaterThan(25); }
        const central = d.chinProjections.find(p => p.side === 0), side = d.chinProjections.find(p => p.side === 1); expect(central.tip[0]).toBeLessThan(side.tip[0]); expect(side.tip[1]).toBeLessThan(central.tip[1]);
        expect(d.independentPectoralFins).toBe(false); expect(ms[0].geometry.userData.ribbonEel.pairedFins).toBe(false); expect(table.map(p => p.part)).toEqual(['nostrils-gills-snout', 'eyes', 'lower-jaw-three-chin-projections', 'continuous-fin-margins']);
        const jaw = region(g, table[2]), head = region(ms[0].geometry, ms[0].geometry.userData.ribbonEel.ranges['upper-head']), rig = uniforms(ms[1]).reefRig.value; expect(jaw.min.y).toBeLessThan(head.min.y); expect(table[1].slot).toBe(1); expect(table[2].slot).toBe(2); expect(rig[19]).toBe(1); expect(rig[39]).toBe(-1);
      } finally { h.dispose(); }
    });
    it('holds every burrow and lower attachment vertex exactly under active shader motion at ' + quality, () => {
      for (const seed of [7, 23]) { const h = make(quality, { seed }); try {
        h.root.position.set(3, -2, 4); h.root.rotation.y = .7; h.root.updateMatrixWorld(true);
        const m = meshes(h)[0], g = m.geometry, d = g.userData.ribbonEel, r = d.ranges['burrow-support'], u = uniforms(m), anchors = [];
        for (let i = 0; i < g.attributes.position.count; i++) if ((i >= r.first && i < r.first + r.count) || (i < d.ranges['compressed-forebody'].count && g.attributes.position.getY(i) < .045 * d.scale)) anchors.push(i);
        expect(anchors.length).toBeGreaterThan(50); const before = anchors.map(i => bodyShaderPoint(m, i, u).toArray()), rootPose = [...h.root.position.toArray(), ...h.root.quaternion.toArray()];
        for (const t of [1, 2.3, 10, 1000]) { h.update(.016, t, { current: { x: 1, z: .7, strength: 1 } }); expect(u.reefSwim.value.y).toBeGreaterThan(0); expect(anchors.map(i => bodyShaderPoint(m, i, u).toArray())).toEqual(before); }
        expect([...h.root.position.toArray(), ...h.root.quaternion.toArray()]).toEqual(rootPose); expect(region(g, r).min.y).toBe(0);
      } finally { h.dispose(); } }
    });
    it('keeps every fin root attached while uploading only the narrow membrane range at ' + quality, () => {
      const h = make(quality); try {
        const ms = meshes(h), g = ms[1].geometry, d = g.userData.ribbonEel, range = d.finRange, before = [...g.attributes.position.array], body = [...ms[0].geometry.attributes.position.array];
        h.update(.016, 2); const after = [...g.attributes.position.array]; let distalMoved = 0;
        for (const section of d.finSections) { expect(section.side === -1 || section.side === 1).toBe(true); for (let v = 0; v < section.count; v++) { const i = range.first + section.first + v, row = v % (section.rows + 1); if (row === 0) expect(after.slice(i * 3, i * 3 + 3)).toEqual(before.slice(i * 3, i * 3 + 3)); else distalMoved += after[i * 3 + 2] !== before[i * 3 + 2]; } }
        expect(d.finSections).toHaveLength(2); expect(distalMoved).toBeGreaterThan(20); expect(after.slice(0, range.first * 3)).toEqual(before.slice(0, range.first * 3)); expect(after.slice((range.first + range.count) * 3)).toEqual(before.slice((range.first + range.count) * 3)); expect([...ms[0].geometry.attributes.position.array]).toEqual(body);
        expect(g.attributes.position.updateRange).toEqual({ offset: range.first * 3, count: range.count * 3 }); expect(g.attributes.normal.updateRange).toEqual({ offset: range.first * 3, count: range.count * 3 }); expect(g.attributes.color.version).toBe(0); expect(g.attributes.uv.version).toBe(0); expect(g.attributes.reefPart.version).toBe(0);
      } finally { h.dispose(); }
    });
  }
  it('keeps seeded biological stations across tiers and varies individuals deterministically', () => {
    const a = make(), b = make(), low = make('low'), other = make('high', { seed: 8 }); try {
      expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other)); const ad = meshes(a)[0].geometry.userData.ribbonEel, ld = meshes(low)[0].geometry.userData.ribbonEel;
      expect(ad.route).toEqual(ld.route); expect(ad.scale).toBe(ld.scale); expect(ad.exposedCenterlineM).toBe(ld.exposedCenterlineM); expect(meshes(a)[1].geometry.userData.ribbonEel.nostrils.map(n => n.opening)).toEqual(meshes(low)[1].geometry.userData.ribbonEel.nostrils.map(n => n.opening));
    } finally { a.dispose(); b.dispose(); low.dispose(); other.dispose(); }
  });
  it('breathes gently with absolute-time motion and small continuous frame-to-frame changes', () => {
    const a = make(), b = make(); try {
      const u = uniforms(meshes(a)[0]); a.update(.016, 2); const first = pose(a), fin = [...meshes(a)[1].geometry.attributes.position.array], swim = u.reefSwim.value.clone(); a.update(.001, 2.001);
      expect(Math.max(...pose(a).flatMap((p, i) => p.map((v, j) => Math.abs(v - first[i][j]))))).toBeLessThan(.001); expect(Math.max(...meshes(a)[1].geometry.attributes.position.array.map((v, i) => Math.abs(v - fin[i])))).toBeLessThan(.00001); expect(u.reefSwim.value.clone().sub(swim).length()).toBeLessThan(.002);
      a.update(.01, 4); b.update(4, 4); expect(pose(a)).toEqual(pose(b)); expect(buffers(a)).toEqual(buffers(b)); expect(u.reefSwim.value.y).toBeLessThan(.0025);
    } finally { a.dispose(); b.dispose(); }
  });
  it('fully freezes geometry, local jaw and shader values for reduced-motion inspection', () => {
    const h = make('high', { reducedMotion: true }); try { const before = pose(h), geometry = buffers(h), u = uniforms(meshes(h)[0]), swim = u.reefSwim.value.toArray(); for (const t of [1, 100, 10000]) h.update(.016, t, { current: { x: 1, z: 1, strength: 1 } }); expect(pose(h)).toEqual(before); expect(buffers(h)).toEqual(geometry); expect(u.reefSwim.value.toArray()).toEqual(swim); } finally { h.dispose(); }
  });
  it('shares skin maps and releases every owned resource exactly once', () => {
    const a = make(), b = make(), ms = meshes(a), textures = new Set(ms.flatMap(m => [m.material.map, m.material.bumpMap])); let ng = 0, nm = 0, nt = 0;
    for (const m of ms) { m.geometry.addEventListener('dispose', () => ng++); m.material.addEventListener('dispose', () => nm++); } for (const t of textures) t.addEventListener('dispose', () => nt++);
    expect(ms[0].material.map).toBe(ms[1].material.map); expect(ms[0].material.map).toBe(meshes(b)[0].material.map); a.dispose(); a.dispose(); expect([ng, nm, nt]).toEqual([2, 2, 0]); b.dispose(); b.dispose(); expect(nt).toBe(textures.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
  it('retains the skin and complete two-draw model without derivative extensions', () => {
    const h = make('low', { derivatives: false }); try { expect(meshes(h)).toHaveLength(2); for (const m of meshes(h)) { expect(m.material.bumpMap).toBeNull(); expect(m.material.map).toBeTruthy(); } expect(() => h.update(.1, 2)).not.toThrow(); } finally { h.dispose(); }
  });
});
