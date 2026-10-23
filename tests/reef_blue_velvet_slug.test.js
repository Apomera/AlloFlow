import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const ID = 'blue_velvet_headshield_slug';
const make = (id, quality = 'high', opts = {}) => S.create(T, id, { seed: 7, quality, ...opts });
function parts(h) { const a = []; h.root.traverse(n => { if (n.isMesh) a.push(n); }); return a; }
function buffers(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function state(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray()])); return a; }
function uniforms(m) { const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} }; m.material.onBeforeCompile(shader); return shader.uniforms; }
function pixel(h, x, v) { const im = parts(h)[0].material.map.image, u = (.5 - x) / .82, at = (Math.floor(v * im.height) * im.width + Math.floor(u * im.width)) * 4; return [...im.data.slice(at, at + 3)]; }

describe('blue velvet headshield slug specimen', () => {
  it('appends the accepted headshield-slug example and its illustrative encounter interval', () => {
    expect(S.ids).toHaveLength(56); expect(S.ids.at(-1)).toBe(ID); expect(S.ids[0]).toBe('clownfish');
    expect(S.info(ID)).toMatchObject({ group: 'invertebrate', habit: 'bottom', lengthM: .05, depthM: [5, 30], origin: 'base', healthStates: ['healthy'] });
  });
  for (const quality of ['low', 'high']) {
    it('keeps finite tagged geometry in two draws within the ' + quality + ' budget, with the sole at Y=0', () => {
      const h = make(ID, quality);
      try {
        const ms = parts(h), size = new T.Box3().setFromObject(h.root).getSize(new T.Vector3());
        expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThan(quality === 'high' ? 6000 : 1500);
        expect(size.x).toBeGreaterThan(.045); expect(size.x).toBeLessThan(.057); expect(size.y).toBeGreaterThan(.003); expect(size.y).toBeLessThan(.01);
        const y = ms.flatMap(m => [...m.geometry.attributes.position.array].filter((_, i) => i % 3 === 1)); expect(Math.min(...y)).toBeCloseTo(0, 9);
        for (const m of ms) { expect(m.userData).toMatchObject({ speciesId: ID, group: 'invertebrate' }); for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true); expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true); expect(m.geometry.boundingBox.isEmpty()).toBe(false); }
      } finally { h.dispose(); }
    });
    it('retains rolled parapodia, the blue head line, and the longer anatomical-left lobe at ' + quality, () => {
      const h = make(ID, quality);
      try {
        const ms = parts(h), head = ms[0].geometry.userData.headshieldSlug.headshield, hg = ms[0].geometry, hc = hg.attributes.color;
        const median = head.first + Math.floor(head.rows / 2) * head.columns + Math.floor(head.columns / 2); expect(hc.getZ(median)).toBeGreaterThan(.7); expect(hc.getY(median)).toBeGreaterThan(.2); expect(hc.getX(median)).toBeLessThan(.02);
        const g = ms[1].geometry, p = g.attributes.position, cols = quality === 'high' ? 8 : 6, row = quality === 'high' ? 14 : 7;
        for (const name of ['parapodium-left', 'parapodium-right']) { const e = g.userData.batch.find(x => x.part === name), points = [...Array(cols)].map((_, j) => new T.Vector3().fromBufferAttribute(p, e.first + row * cols + j)), free = points.at(-1); expect(Math.max(...points.map(v => Math.abs(v.z))) - Math.abs(free.z)).toBeGreaterThan(.0015); expect(free.y - points[0].y).toBeGreaterThan(.003); }
        const lobes = g.userData.headshieldSlug.posteriorLobes; expect(lobes.left.lengthM / lobes.right.lengthM).toBeCloseTo(.4 / .23, 12); expect(lobes.left.anatomicalSideZ).toBe(-1); expect(lobes.right.anatomicalSideZ).toBe(1);
        const names = []; h.root.traverse(n => names.push(n.name)); expect(names.some(n => /rhinophore|gill|eyestalk/i.test(n))).toBe(false);
      } finally { h.dispose(); }
    });
    it('keeps deterministic fully frozen ' + quality + ' inspection poses', () => {
      const a = make(ID, quality, { reducedMotion: true }), b = make(ID, quality, { reducedMotion: true }), other = make(ID, quality, { seed: 8, reducedMotion: true });
      try {
        expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other)); a.root.position.set(3, 2, -4); a.root.rotation.y = .8;
        const geometry = buffers(a), before = state(a), u = uniforms(parts(a)[1]), swim = u.reefSwim.value.toArray(), rig = [...u.reefRig.value];
        for (const t of [.5, 10, 1000]) a.update(.016, t, { current: { strength: 1 } });
        expect(buffers(a)).toEqual(geometry); expect(state(a)).toEqual(before); expect(u.reefSwim.value.toArray()).toEqual(swim); expect([...u.reefRig.value]).toEqual(rig);
      } finally { a.dispose(); b.dispose(); other.dispose(); }
    });
  }
  it('preserves every common posterior-lobe station between the high and low tiers', () => {
    const high = make(ID, 'high', { reducedMotion: true }), low = make(ID, 'low', { reducedMotion: true });
    try {
      const hg = parts(high)[1].geometry, lg = parts(low)[1].geometry, hp = hg.attributes.position, lp = lg.attributes.position, map = [0, 1, 2, 4, 6, 7, 8];
      for (const name of ['posterior-lobe-left', 'posterior-lobe-right']) { const h = hg.userData.batch.find(e => e.part === name), l = lg.userData.batch.find(e => e.part === name); for (let row = 0; row <= 12; row++) for (let j = 0; j < 7; j++) { const a = h.first + row * 2 * 9 + map[j], b = l.first + row * 7 + j; expect([lp.getX(b), lp.getY(b), lp.getZ(b)]).toEqual([hp.getX(a), hp.getY(a), hp.getZ(a)]); } }
    } finally { high.dispose(); low.dispose(); }
  });
  it('moves only local soft parts continuously, without moving the foot or uploading geometry', () => {
    const a = make(ID), b = make(ID);
    try {
      a.root.position.set(4, -2, 6); a.root.rotation.y = .7; b.root.position.copy(a.root.position); b.root.rotation.copy(a.root.rotation);
      const placement = [...a.root.position.toArray(), ...a.root.quaternion.toArray()], ms = parts(a), geometry = buffers(a), versions = ms.map(m => Object.values(m.geometry.attributes).map(v => v.version)), u = uniforms(ms[1]), start = state(a);
      a.update(.016, 2, { current: { strength: .8 } }); expect(state(a)).not.toEqual(start); expect(u.reefSwim.value.y).toBeGreaterThan(0); expect(u.reefSwim.value.y).toBeLessThan(.00012);
      const previous = state(a); a.update(.001, 2.001, { current: { strength: .8 } }); expect(Math.max(...state(a).flatMap((p, i) => p.map((v, j) => Math.abs(v - previous[i][j]))))).toBeLessThan(.005);
      expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(placement); expect(buffers(a)).toEqual(geometry); expect(ms.map(m => Object.values(m.geometry.attributes).map(v => v.version))).toEqual(versions);
      a.update(.016, 4); b.update(4, 4); expect(uniforms(parts(b)[1]).reefSwim.value.toArray()).toEqual(u.reefSwim.value.toArray()); expect(state(a)).toEqual(state(b));
    } finally { a.dispose(); b.dispose(); }
  });
  it('uses reflected blue pigment with opaque non-emissive flesh materials', () => {
    const h = make(ID);
    try { for (const m of parts(h)) { expect(m.material.emissive.getHex()).toBe(0); expect(m.material.transparent).toBe(false); expect(uniforms(m).reefFeature.value.x).toBe(0); expect(m.material.roughness).toBeGreaterThan(.4); } } finally { h.dispose(); }
  });
  it('shares its textures and disposes owned geometry and materials exactly once', () => {
    const a = make(ID), b = make(ID), ms = parts(a), maps = new Set();
    for (const m of ms) for (const key of ['map', 'bumpMap']) if (m.material[key]) maps.add(m.material[key]); expect(parts(a)[0].material.bumpMap).toBe(parts(b)[0].material.bumpMap);
    let textures = 0, geometry = 0, material = 0;
    for (const t of maps) t.addEventListener('dispose', () => textures++); for (const m of ms) { m.geometry.addEventListener('dispose', () => geometry++); m.material.addEventListener('dispose', () => material++); }
    a.dispose(); a.dispose(); expect(geometry).toBe(2); expect(material).toBe(2); expect(textures).toBe(0); b.dispose(); b.dispose(); expect(textures).toBe(maps.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
});
