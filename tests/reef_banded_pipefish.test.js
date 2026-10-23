import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, ID = 'banded_pipefish';
function make(quality = 'high', options = {}) { return S.create(T, ID, { seed: 7, quality, ...options }); }
function parts(h) { const out = []; h.root.traverse(n => { if (n.isMesh) out.push(n); }); return out; }
function snapshot(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([key, a]) => [key, [...a.array]]))); }
function uniforms(m) { const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} }; m.material.onBeforeCompile(shader); return shader.uniforms; }
function pixel(image, u, v) { const x = Math.min(image.width - 1, Math.floor(u * image.width)), y = Math.min(image.height - 1, Math.floor(v * image.height)), at = (y * image.width + x) * 4; return [...image.data.slice(at, at + 3)]; }

describe('banded pipefish specimen', () => {
  it('reports the named, marine, centred adult example independently of a maximum-size claim', () => {
    expect(S.ids.filter(id => id === ID)).toHaveLength(1);
    expect(S.info(ID)).toMatchObject({ group: 'fish', habit: 'hover', lengthM: .17, depthM: [5, 56], origin: 'centre', schoolSize: null, healthStates: ['healthy'] });
    expect(S.info(ID).portrait.dir).toEqual([.12, .24, 2.7]);
    expect(() => S.createSchool(T, ID, 3)).toThrow(/No school model/);
  });
  for (const quality of ['low', 'high']) {
    it('keeps finite tagged geometry in two draws within the ' + quality + ' animal budget', () => {
      const h = make(quality);
      try {
        const ms = parts(h); expect(ms).toHaveLength(2);
        expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThan(quality === 'high' ? 6000 : 1500);
        for (const m of ms) {
          expect(m.userData).toMatchObject({ speciesId: ID, group: 'fish' });
          for (const attr of Object.values(m.geometry.attributes)) expect([...attr.array].every(Number.isFinite)).toBe(true);
          const p = m.geometry.attributes.position;
          expect([...m.geometry.index.array].every(v => v >= 0 && v < p.count)).toBe(true);
          expect(m.geometry.boundingBox.isEmpty()).toBe(false);
          expect(Number.isFinite(m.geometry.boundingSphere.radius)).toBe(true);
        }
        const box = new T.Box3().setFromObject(h.root), size = box.getSize(new T.Vector3());
        expect(size.x).toBeGreaterThan(.16); expect(size.x).toBeLessThan(.18);
        expect(size.y).toBeGreaterThan(.015); expect(size.y).toBeLessThan(.022);
        expect(h.radius).toBeGreaterThan(.08); expect(h.radius).toBeLessThan(.095);
      } finally { h.dispose(); }
    });
    it('retains a deterministic fully frozen inspection pose at ' + quality, () => {
      const a = make(quality, { reducedMotion: true }), b = make(quality, { reducedMotion: true }), other = make(quality, { seed: 8, reducedMotion: true });
      try {
        const base = snapshot(a); expect(snapshot(b)).toEqual(base); expect(snapshot(other)).not.toEqual(base);
        const tail = a.root.getObjectByName(ID + '-tail-pivot'), dorsal = a.root.getObjectByName(ID + '-dorsal-pivot');
        const pose = [...tail.position.toArray(), ...tail.quaternion.toArray(), ...dorsal.quaternion.toArray()];
        a.root.position.set(3, 2, -4); a.root.rotation.y = .6;
        const root = [...a.root.position.toArray(), ...a.root.quaternion.toArray()];
        const u = uniforms(parts(a)[0]), initialSwim = [...u.reefSwim.value.toArray()];
        for (const t of [.5, 20, 1000]) a.update(.016, t, { speed: 1, turn: .9 });
        expect(snapshot(a)).toEqual(base); expect([...u.reefSwim.value.toArray()]).toEqual(initialSwim);
        expect([...tail.position.toArray(), ...tail.quaternion.toArray(), ...dorsal.quaternion.toArray()]).toEqual(pose);
        expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(root);
      } finally { a.dispose(); b.dispose(); other.dispose(); }
    });
  }
  it('preserves every common body station and the exact diagnostic pigment across detail tiers', () => {
    const high = make('high'), low = make('low');
    try {
      const hp = parts(high)[0].geometry.attributes.position, lp = parts(low)[0].geometry.attributes.position;
      for (let row = 0; row <= 48; row++) for (let side = 0; side <= 10; side++) {
        const a = row * 11 + side, b = row * 2 * 21 + side * 2;
        expect([lp.getX(a), lp.getY(a), lp.getZ(a)]).toEqual([hp.getX(b), hp.getY(b), hp.getZ(b)]);
      }
      for (let m = 0; m < 2; m++) expect(parts(high)[m].material.map).toBe(parts(low)[m].material.map);
      expect(parts(high)[0].material.bumpMap).toBe(parts(low)[0].material.bumpMap);
      const field = h => parts(h)[1].geometry.userData.batch.filter(p => p.part === 'eyes-mouth')[0];
      expect(field(high).slot).toBe(field(low).slot);
    } finally { high.dispose(); low.dispose(); }
  });
  it('has a narrow feeding tube, visible paired eyes and an actual recessed terminal mouth', () => {
    const h = make();
    try {
      const body = parts(h)[0].geometry.attributes.position, detail = parts(h)[1].geometry, p = detail.attributes.position, uv = detail.attributes.uv;
      let snoutWidth = 0, bodyWidth = 0, left = 0, right = 0, lipFront = -Infinity, innerFront = Infinity;
      for (let i = 0; i < body.count; i++) {
        if (body.getX(i) > .062) snoutWidth = Math.max(snoutWidth, Math.abs(body.getZ(i)));
        if (body.getX(i) > -.03 && body.getX(i) < .03) bodyWidth = Math.max(bodyWidth, Math.abs(body.getZ(i)));
      }
      expect(snoutWidth).toBeLessThan(bodyWidth * .5);
      const eyes = detail.userData.batch.find(e => e.part === 'eyes-mouth');
      for (let i = eyes.first; i < eyes.first + eyes.count; i++) {
        if (uv.getX(i) > 1.8 && p.getZ(i) > .001) right++;
        if (uv.getX(i) > 1.8 && p.getZ(i) < -.001) left++;
        if (p.getX(i) > .084) { lipFront = Math.max(lipFront, p.getX(i)); innerFront = Math.min(innerFront, p.getX(i)); }
      }
      expect(left).toBeGreaterThan(20); expect(right).toBeGreaterThan(20); expect(lipFront - innerFront).toBeGreaterThan(.0003);
    } finally { h.dispose(); }
  });
  it('paints separate pale and red bars along both snout and trunk, and a pale oval on the red flag tail', () => {
    const h = make();
    try {
      const image = parts(h)[0].material.map.image;
      for (const range of [[0, .19], [.3, .9]]) {
        let pale = 0, red = 0, transitions = 0, last;
        for (let i = 0; i < 100; i++) {
          const c = pixel(image, range[0] + (range[1] - range[0]) * i / 100, .25), state = Math.min(...c) > 180;
          pale += state; red += c[0] > c[1] * 1.5; if (last !== undefined && state !== last) transitions++; last = state;
        }
        expect(pale).toBeGreaterThan(30); expect(red).toBeGreaterThan(30); expect(transitions).toBeGreaterThan(3);
      }
      const tail = parts(h)[1].material.map.image, spot = pixel(tail, .5, .64), red = pixel(tail, .5, .92), margin = pixel(tail, .98, .8);
      expect(Math.min(...spot)).toBeGreaterThan(190); expect(red[0]).toBeGreaterThan(red[1] * 2); expect(Math.min(...margin)).toBeGreaterThan(190);
    } finally { h.dispose(); }
  });
  it('makes fine dorsal strokes and small posterior corrections without changing roots or vertex buffers', () => {
    const a = make(), b = make();
    try {
      a.root.position.set(4, -2, 6); a.root.rotation.y = .7;
      const root = [...a.root.position.toArray(), ...a.root.quaternion.toArray()], ms = parts(a), arrays = ms.map(m => Object.values(m.geometry.attributes).map(attr => attr.array)), versions = ms.map(m => Object.values(m.geometry.attributes).map(attr => attr.version));
      const tail = a.root.getObjectByName(ID + '-tail-pivot'), dorsal = a.root.getObjectByName(ID + '-dorsal-pivot'), u = uniforms(ms[0]); let flutter = 0, correction = 0;
      for (let frame = 0; frame < 120; frame++) { a.update(1/60, frame/60); flutter = Math.max(flutter, Math.abs(dorsal.rotation.x)); correction = Math.max(correction, Math.abs(tail.position.z)); }
      expect(flutter).toBeGreaterThan(.15); expect(correction).toBeGreaterThan(.0004); expect(correction).toBeLessThan(.0008);
      expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(root);
      for (let m = 0; m < ms.length; m++) for (let n = 0; n < arrays[m].length; n++) expect(Object.values(ms[m].geometry.attributes)[n].array).toBe(arrays[m][n]);
      expect(ms.map(m => Object.values(m.geometry.attributes).map(attr => attr.version))).toEqual(versions);
      b.update(2, 119/60); const bu = uniforms(parts(b)[0]); expect(u.reefSwim.value.toArray()).toEqual(bu.reefSwim.value.toArray());
      expect(tail.position.toArray()).toEqual(b.root.getObjectByName(ID + '-tail-pivot').position.toArray());
    } finally { a.dispose(); b.dispose(); }
  });
  it('reference-counts pigment resources and disposes owned geometry and material exactly once', () => {
    const a = make(), b = make(), ms = parts(a), maps = new Set();
    for (const m of ms) for (const key of ['map', 'bumpMap', 'roughnessMap']) if (m.material[key]) maps.add(m.material[key]);
    let textures = 0, geometry = 0, material = 0;
    for (const t of maps) t.addEventListener('dispose', () => textures++);
    for (const m of ms) { m.geometry.addEventListener('dispose', () => geometry++); m.material.addEventListener('dispose', () => material++); }
    a.dispose(); a.dispose(); expect(geometry).toBe(2); expect(material).toBe(2); expect(textures).toBe(0);
    b.dispose(); b.dispose(); expect(textures).toBe(maps.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
});
