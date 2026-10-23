import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const ID = 'regal_angelfish';
const make = (id, quality = 'high', opts = {}) => S.create(T, id, { seed: 7, quality, ...opts });
function parts(h) { const a = []; h.root.traverse(n => { if (n.isMesh) a.push(n); }); return a; }
function buffers(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function state(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray()])); return a; }
function uniforms(m) { const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} }; m.material.onBeforeCompile(shader); return shader.uniforms; }
function pixel(h, x, v) { const im = parts(h)[0].material.map.image, u = (.5 - x) / .82, at = (Math.floor(v * im.height) * im.width + Math.floor(u * im.width)) * 4; return [...im.data.slice(at, at + 3)]; }

function fishPixel(h, x, v) { const im = parts(h)[0].material.map.image, at = (Math.floor(v * im.height) * im.width + Math.floor((.5 - x) / .79 * im.width)) * 4; return [...im.data.slice(at, at + 3)]; }
describe('Pacific adult regal angelfish specimen', () => {
  it('appends an adult example with the broader museum depth interval', () => {
    expect(S.ids).toHaveLength(57); expect(S.ids.at(-1)).toBe(ID); expect(S.ids[0]).toBe('clownfish');
    expect(S.info(ID)).toMatchObject({ group: 'fish', habit: 'solitary', lengthM: .2, depthM: [1, 80], origin: 'centre', healthStates: ['healthy'], portrait: { dir: [.18, .22, 2.7] } });
  });
  for (const quality of ['low', 'high']) {
    it('keeps finite tagged geometry in two draws within the ' + quality + ' budget', () => {
      const h = make(ID, quality);
      try {
        const ms = parts(h), size = new T.Box3().setFromObject(h.root).getSize(new T.Vector3()); expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThan(quality === 'high' ? 6000 : 1500);
        expect(size.x).toBeGreaterThan(.19); expect(size.x).toBeLessThan(.22); expect(size.y).toBeGreaterThan(.1); expect(size.y).toBeLessThan(.14); expect(size.z).toBeLessThan(.06);
        for (const m of ms) { expect(m.userData).toMatchObject({ speciesId: ID, group: 'fish' }); for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true); expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true); expect(m.geometry.boundingBox.isEmpty()).toBe(false); }
      } finally { h.dispose(); }
    });
    it('retains pale slanted bars, grey Pacific chin, striped anal fin and yellow tail at ' + quality, () => {
      const h = make(ID, quality);
      try {
        const pale = fishPixel(h, .175, .25), gold = fishPixel(h, .215, .25), chin = fishPixel(h, .46, .1), forehead = fishPixel(h, .46, .42);
        expect(Math.min(...pale)).toBeGreaterThan(180); expect(gold[0]).toBeGreaterThan(210); expect(gold[2]).toBeLessThan(70); expect(chin[2]).toBeGreaterThan(chin[0] * .9); expect(chin[1]).toBeGreaterThan(chin[0]); expect(forehead[0]).toBeGreaterThan(forehead[2] * 3);
        const g = parts(h)[1].geometry, c = g.attributes.color, tail = g.userData.batch.find(e => e.part === 'tail');
        for (let i = tail.first; i < tail.first + tail.count; i++) { expect(c.getX(i)).toBeGreaterThan(.65); expect(c.getY(i)).toBeGreaterThan(.3); expect(c.getZ(i)).toBeLessThan(.06); }
        const fins = g.userData.batch.find(e => e.part === 'fins'), analFirst = fins.first + (quality === 'high' ? 23 : 8) * 9, analCount = (quality === 'high' ? 23 : 8) * 9; let blue = 0, yellow = 0;
        for (let i = analFirst; i < analFirst + analCount; i++) { blue += c.getZ(i) > .2 && c.getZ(i) > c.getX(i) * 1.8; yellow += c.getX(i) > .65 && c.getY(i) > .35 && c.getZ(i) < .08; }
        expect(blue).toBeGreaterThan(8); expect(yellow).toBeGreaterThan(8);
      } finally { h.dispose(); }
    });
    it('keeps deterministic frozen ' + quality + ' inspection geometry', () => {
      const a = make(ID, quality, { reducedMotion: true }), b = make(ID, quality, { reducedMotion: true }), other = make(ID, quality, { seed: 8, reducedMotion: true });
      try {
        expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other)); a.root.position.set(3, 2, -4); a.root.rotation.y = .8;
        const geometry = buffers(a), before = state(a), u = uniforms(parts(a)[1]), swim = u.reefSwim.value.toArray(), rig = [...u.reefRig.value];
        for (const t of [.5, 10, 1000]) a.update(.016, t, { speed: 1, turn: 1, current: { strength: 1 } });
        expect(buffers(a)).toEqual(geometry); expect(state(a)).toEqual(before); expect(u.reefSwim.value.toArray()).toEqual(swim); expect([...u.reefRig.value]).toEqual(rig);
      } finally { a.dispose(); b.dispose(); other.dispose(); }
    });
  }
  it('preserves predominantly vertical body bars across both pigment detail tiers', () => {
    for (const quality of ['high', 'low']) {
      const h = make(ID, quality);
      try {
        function transitions(points) { let count = 0, previous; for (const [x, v] of points) { const c = fishPixel(h, x, v), pale = c[0] > 175 && c[1] > 185 && c[2] > 170; if (previous !== undefined && pale !== previous) count++; previous = pale; } return count; }
        const horizontal = transitions([...Array(300)].map((_, i) => [-.25 + i / 299 * .6, .25])), vertical = transitions([...Array(150)].map((_, i) => [.135, .14 + i / 149 * .22]));
        expect(horizontal).toBeGreaterThanOrEqual(12); expect(vertical).toBeLessThanOrEqual(4);
      } finally { h.dispose(); }
    }
  });
  it('makes smooth local fin strokes without moving placement or uploading geometry', () => {
    const a = make(ID), b = make(ID);
    try {
      a.root.position.set(4, -2, 6); a.root.rotation.y = .7; b.root.position.copy(a.root.position); b.root.rotation.copy(a.root.rotation);
      const placement = [...a.root.position.toArray(), ...a.root.quaternion.toArray()], ms = parts(a), geometry = buffers(a), versions = ms.map(m => Object.values(m.geometry.attributes).map(v => v.version)), tail = a.root.getObjectByName(ID + '-tail-pivot'), first = state(a);
      a.update(.016, 2); expect(state(a)).not.toEqual(first); const previous = state(a); a.update(.001, 2.001); expect(Math.max(...state(a).flatMap((p, i) => p.map((v, j) => Math.abs(v - previous[i][j]))))).toBeLessThan(.01);
      expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(placement); expect(buffers(a)).toEqual(geometry); expect(ms.map(m => Object.values(m.geometry.attributes).map(v => v.version))).toEqual(versions);
      a.update(.016, 4); b.update(4, 4); expect(tail.position.toArray()).toEqual(b.root.getObjectByName(ID + '-tail-pivot').position.toArray()); expect(state(a)).toEqual(state(b));
    } finally { a.dispose(); b.dispose(); }
  });
  it('shares its pigment maps and disposes owned geometry and materials exactly once', () => {
    const a = make(ID), b = make(ID), ms = parts(a), maps = new Set();
    for (const m of ms) for (const key of ['map', 'bumpMap', 'roughnessMap']) if (m.material[key]) maps.add(m.material[key]); expect(parts(a)[0].material.map).toBe(parts(b)[0].material.map);
    let textures = 0, geometry = 0, material = 0;
    for (const t of maps) t.addEventListener('dispose', () => textures++); for (const m of ms) { m.geometry.addEventListener('dispose', () => geometry++); m.material.addEventListener('dispose', () => material++); }
    a.dispose(); a.dispose(); expect(geometry).toBe(2); expect(material).toBe(2); expect(textures).toBe(0); b.dispose(); b.dispose(); expect(textures).toBe(maps.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
});
