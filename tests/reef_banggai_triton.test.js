import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const ids = ['banggai_cardinalfish', 'giant_triton'];
const make = (id, quality = 'high', opts = {}) => S.create(T, id, { seed: 7, quality, ...opts });
function parts(h) { const a = []; h.root.traverse(n => { if (n.isMesh) a.push(n); }); return a; }
function buffers(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function state(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray()])); return a; }
function uniforms(m) { const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} }; m.material.onBeforeCompile(shader); return shader.uniforms; }
function pixel(h, x, v) { const im = parts(h)[0].material.map.image, u = (.5 - x) / .82, at = (Math.floor(v * im.height) * im.width + Math.floor(u * im.width)) * 4; return [...im.data.slice(at, at + 3)]; }

describe('Banggai cardinalfish and living giant triton specimens', () => {
  it('appends IDs and reports sourced adult-example metadata', () => {
    expect(S.ids.slice(-2)).toEqual(ids); expect(S.ids).toHaveLength(55); expect(S.ids[0]).toBe('clownfish');
    expect(S.info(ids[0])).toMatchObject({ group: 'fish', habit: 'hover', lengthM: .075, depthM: [0, 16], origin: 'centre', healthStates: ['healthy'] });
    expect(S.info(ids[1])).toMatchObject({ group: 'invertebrate', habit: 'bottom', lengthM: .3, depthM: [1, 40], origin: 'base', healthStates: ['healthy'] });
  });
  for (const id of ids) {
    for (const quality of ['low', 'high']) {
      it(id + ' retains finite indexed geometry in two draws within the ' + quality + ' budget', () => {
        const h = make(id, quality);
        try {
          const ms = parts(h), size = new T.Box3().setFromObject(h.root).getSize(new T.Vector3());
          expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThan(quality === 'high' ? 6000 : 1500);
          expect(size.x).toBeGreaterThan(id === ids[0] ? .07 : .30); expect(size.x).toBeLessThan(id === ids[0] ? .085 : .39);
          for (const m of ms) { expect(m.userData).toMatchObject({ speciesId: id, group: S.info(id).group }); for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true); expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true); expect(m.geometry.boundingBox.isEmpty()).toBe(false); expect(Number.isFinite(m.geometry.boundingSphere.radius)).toBe(true); }
          if (id === ids[1]) { const y = ms.flatMap(m => [...m.geometry.attributes.position.array].filter((_, i) => i % 3 === 1)); expect(Math.min(...y)).toBeCloseTo(0, 7); }
        } finally { h.dispose(); }
      });
      it(id + ' preserves deterministic fully frozen ' + quality + ' inspection geometry', () => {
        const a = make(id, quality, { reducedMotion: true }), b = make(id, quality, { reducedMotion: true }), other = make(id, quality, { seed: 8, reducedMotion: true });
        try {
          expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other));
          a.root.position.set(3, -2, 7); a.root.rotation.y = .8;
          const before = buffers(a), transforms = state(a), u = uniforms(parts(a)[1]), rig = [...u.reefRig.value];
          for (const t of [.5, 10, 1000]) a.update(.016, t, { speed: 1, turn: .9, current: { x: 1, z: 1, strength: .8 } });
          expect(buffers(a)).toEqual(before); expect(state(a)).toEqual(transforms); expect([...u.reefRig.value]).toEqual(rig);
        } finally { a.dispose(); b.dispose(); other.dispose(); }
      });
    }
    it(id + ' makes continuous local movement without changing placement or buffer versions', () => {
      const a = make(id), b = make(id);
      try {
        a.root.position.set(4, -2, 6); a.root.rotation.y = .7; b.root.position.copy(a.root.position); b.root.rotation.copy(a.root.rotation);
        const placement = [...a.root.position.toArray(), ...a.root.quaternion.toArray()], ms = parts(a), arrays = ms.map(m => Object.values(m.geometry.attributes).map(v => v.array)), versions = ms.map(m => Object.values(m.geometry.attributes).map(v => v.version));
        const pivot = a.root.getObjectByName(id + (id === ids[1] ? '-tentacle-near' : '-tail-pivot')), poses = [];
        for (let i = 0; i < 120; i++) { a.update(1 / 60, i / 60); poses.push([...pivot.position.toArray(), ...pivot.quaternion.toArray()]); }
        expect(poses[0]).not.toEqual(poses[119]); expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(placement);
        const previous = state(a); a.update(.001, 119 / 60 + .001); expect(Math.max(...state(a).flatMap((p, i) => p.map((v, j) => Math.abs(v - previous[i][j]))))).toBeLessThan(.01);
        for (let m = 0; m < ms.length; m++) for (let n = 0; n < arrays[m].length; n++) expect(Object.values(ms[m].geometry.attributes)[n].array).toBe(arrays[m][n]);
        expect(ms.map(m => Object.values(m.geometry.attributes).map(v => v.version))).toEqual(versions);
        a.update(.016, 4); b.update(4, 4); expect(pivot.position.toArray()).toEqual(b.root.getObjectByName(pivot.name).position.toArray()); expect(pivot.quaternion.toArray()).toEqual(b.root.getObjectByName(pivot.name).quaternion.toArray());
      } finally { a.dispose(); b.dispose(); }
    });
    it(id + ' shares its textures and disposes model geometry and materials once', () => {
      const a = make(id), b = make(id), ms = parts(a), maps = new Set();
      for (const m of ms) for (const key of ['map', 'bumpMap', 'roughnessMap']) if (m.material[key]) maps.add(m.material[key]);
      expect(parts(a)[0].material.map).toBe(parts(b)[0].material.map);
      let textures = 0, geometry = 0, material = 0;
      for (const t of maps) t.addEventListener('dispose', () => textures++);
      for (const m of ms) { m.geometry.addEventListener('dispose', () => geometry++); m.material.addEventListener('dispose', () => material++); }
      a.dispose(); a.dispose(); expect(geometry).toBe(2); expect(material).toBe(2); expect(textures).toBe(0); b.dispose(); b.dispose(); expect(textures).toBe(maps.size); expect(() => a.update(.1, 100)).not.toThrow();
    });
  }
  for (const quality of ['low', 'high']) {
    it('keeps all three Banggai bars and soft-fin white marks at ' + quality, () => {
      const h = make(ids[0], quality);
      try {
        const im = parts(h)[0].material.map.image, at = x => { const u = (.5 - x) / .765, i = (Math.floor(im.height * .25) * im.width + Math.floor(u * im.width)) * 4; return [...im.data.slice(i, i + 3)]; };
        for (const x of [.32, .075, -.22]) expect(Math.max(...at(x))).toBeLessThan(70);
        expect(Math.min(...at(.2))).toBeGreaterThan(170);
        const g = parts(h)[1].geometry, p = g.attributes.position, c = g.attributes.color, uv = g.attributes.uv; let marks = 0;
        for (let i = 0; i < p.count; i++) if (uv.getX(i) < 1.8 && Math.abs(p.getY(i)) > .02 && Math.min(c.getX(i), c.getY(i), c.getZ(i)) > .7) marks++;
        expect(marks).toBeGreaterThan(30);
      } finally { h.dispose(); }
    });
    it('has a long sutured triton spire and a genuinely open recessed orange chamber at ' + quality, () => {
      const h = make(ids[1], quality);
      try {
        const shell = parts(h)[0], g = shell.geometry, p = g.attributes.position, ranges = g.userData.triton;
        expect(ranges.outer.rows).toBeGreaterThan(15); expect(ranges.inner.rows).toBeGreaterThan(5); expect(ranges.lip.rows).toBeGreaterThan(2); expect(ranges.spire.rows).toBeGreaterThan(20);
        const spire = ranges.spire, ring = row => [...Array(spire.columns - 1)].map((_, j) => new T.Vector3().fromBufferAttribute(p, spire.first + row * spire.columns + j));
        expect(Math.max(...ring(spire.rows - 1).map(v => v.x)) - Math.min(...ring(0).map(v => v.x))).toBeGreaterThan(.12);
        h.root.updateMatrixWorld(true);
        const hit = new T.Raycaster(new T.Vector3(0, .055, .3), new T.Vector3(0, 0, -1)).intersectObject(shell)[0];
        expect(hit).toBeDefined(); expect(hit.point.z).toBeLessThan(-.025);
        const color = g.attributes.color, inner = ranges.inner, lip = ranges.lip;
        const inside = inner.first + (inner.rows - 1) * inner.columns + 2;
        expect(color.getX(inside)).toBeGreaterThan(color.getZ(inside) * 2);
        expect(lip.first).toBeGreaterThan(inner.first + inner.rows * inner.columns - 1);
      } finally { h.dispose(); }
    });
  }
});
