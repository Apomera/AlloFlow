import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const ids = ['yellow_longnose_butterflyfish', 'pajama_cardinalfish'];
const make = (id, quality = 'high', opts = {}) => S.create(T, id, { seed: 7, quality, ...opts });
function parts(h) { const a = []; h.root.traverse(n => { if (n.isMesh) a.push(n); }); return a; }
function buffers(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function state(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray()])); return a; }
function uniforms(m) { const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} }; m.material.onBeforeCompile(shader); return shader.uniforms; }
function pixel(h, x, v) { const im = parts(h)[0].material.map.image, u = (.5 - x) / .82, at = (Math.floor(v * im.height) * im.width + Math.floor(u * im.width)) * 4; return [...im.data.slice(at, at + 3)]; }

describe('longnose butterflyfish and pajama cardinalfish specimens', () => {
  it('registers adult examples with sourced depth ranges and authored portraits', () => {
    expect(S.info(ids[0])).toMatchObject({ group: 'fish', habit: 'pair', lengthM: .18, depthM: [2, 145], origin: 'centre', schoolSize: null, healthStates: ['healthy'], portrait: { dir: [.12, .18, 2.7] } });
    expect(S.info(ids[1])).toMatchObject({ group: 'fish', habit: 'hover', lengthM: .07, depthM: [1, 14], origin: 'centre', schoolSize: null, healthStates: ['healthy'], portrait: { dir: [.15, .18, 2.7] } });
    for (const id of ids) expect(S.ids.filter(x => x === id)).toHaveLength(1);
    // Later additions may follow this stable registration prefix.
    const registeredPrefix = [
      'clownfish', 'blue_tang', 'parrotfish', 'bumphead_parrotfish', 'moorish_idol', 'threadfin_butterflyfish',
      'emperor_angelfish', 'anthias', 'blue_green_chromis', 'lionfish', 'peacock_grouper', 'humphead_wrasse',
      'cleaner_wrasse', 'clown_triggerfish', 'porcupinefish', 'yellow_boxfish', 'giant_moray',
      'whitetip_reef_shark', 'bluespotted_stingray', 'bluestripe_snapper', 'oriental_sweetlips', 'reef_manta',
      'green_turtle', 'hawksbill_turtle', 'magnificent_anemone', 'giant_clam', 'crown_of_thorns',
      'blue_sea_star', 'long_spined_urchin', 'nudibranch', 'cleaner_shrimp', 'christmas_tree_worm',
      'day_octopus', 'sea_cucumber', 'sea_fan', 'barrel_sponge', 'soft_coral', 'brain_coral', 'staghorn_coral',
      'table_coral', 'mushroom_coral', 'boulder_coral', 'cauliflower_coral', 'foliose_coral', 'reef_star',
      'reef_ball', 'coral_tree_nursery', 'firefish', 'copperband_butterflyfish', 'spotted_garden_eel',
      'banded_pipefish', 'yellow_longnose_butterflyfish', 'pajama_cardinalfish'
    ];
    expect(S.ids.slice(0, registeredPrefix.length)).toEqual(registeredPrefix);
    expect(new Set(S.ids).size).toBe(S.ids.length);
    expect(S.ids[0]).toBe('clownfish');
  });
  for (const id of ids) {
    for (const quality of ['low', 'high']) {
      it(id + ' has finite tagged geometry in two draws within the ' + quality + ' budget', () => {
        const h = make(id, quality);
        try {
          const ms = parts(h), size = new T.Box3().setFromObject(h.root).getSize(new T.Vector3());
          expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThan(quality === 'high' ? 6000 : 1500);
          const nominal = S.info(id).lengthM; expect(size.x).toBeGreaterThan(nominal * .95); expect(size.x).toBeLessThan(nominal * 1.1); expect(size.y).toBeGreaterThan(nominal * .6); expect(size.z).toBeLessThan(nominal * .5);
          for (const m of ms) { expect(m.userData).toMatchObject({ speciesId: id, group: 'fish' }); for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true); expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true); expect(m.geometry.boundingBox.isEmpty()).toBe(false); expect(Number.isFinite(m.geometry.boundingSphere.radius)).toBe(true); }
        } finally { h.dispose(); }
      });
      it(id + ' keeps a deterministic fully frozen ' + quality + ' inspection pose', () => {
        const a = make(id, quality, { reducedMotion: true }), b = make(id, quality, { reducedMotion: true }), other = make(id, quality, { seed: 8, reducedMotion: true });
        try {
          expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other));
          a.root.position.set(3, -2, 7); a.root.rotation.y = .8;
          const initial = state(a), before = buffers(a), u = uniforms(parts(a)[0]), swim = u.reefSwim.value.toArray();
          for (const t of [.5, 10, 1000]) a.update(.016, t, { speed: 1, turn: .9, current: { x: 1, z: 1, strength: .8 } });
          expect(state(a)).toEqual(initial); expect(buffers(a)).toEqual(before); expect(u.reefSwim.value.toArray()).toEqual(swim);
        } finally { a.dispose(); b.dispose(); other.dispose(); }
      });
    }
    it(id + ' makes continuous local strokes without moving placement or uploading buffers', () => {
      const a = make(id), b = make(id);
      try {
        a.root.position.set(4, -2, 6); a.root.rotation.y = .7;
        b.root.position.copy(a.root.position); b.root.rotation.copy(a.root.rotation);
        const placement = [...a.root.position.toArray(), ...a.root.quaternion.toArray()], ms = parts(a), arrays = ms.map(m => Object.values(m.geometry.attributes).map(v => v.array)), versions = ms.map(m => Object.values(m.geometry.attributes).map(v => v.version));
        const tail = a.root.getObjectByName(id + '-tail-pivot'), u = uniforms(ms[0]); let motion = 0;
        for (let i = 0; i < 120; i++) { a.update(1 / 60, i / 60); motion = Math.max(motion, Math.abs(tail.position.z)); }
        expect(motion).toBeGreaterThan(.00005); expect(motion).toBeLessThan(S.info(id).lengthM * .02);
        expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(placement);
        const pose = state(a); a.update(.001, 119 / 60 + .001); expect(Math.max(...state(a).flatMap((p, i) => p.map((v, j) => Math.abs(v - pose[i][j]))))).toBeLessThan(.01);
        for (let m = 0; m < ms.length; m++) for (let n = 0; n < arrays[m].length; n++) expect(Object.values(ms[m].geometry.attributes)[n].array).toBe(arrays[m][n]);
        expect(ms.map(m => Object.values(m.geometry.attributes).map(v => v.version))).toEqual(versions);
        a.update(.016, 4); b.update(4, 4); expect(u.reefSwim.value.toArray()).toEqual(uniforms(parts(b)[0]).reefSwim.value.toArray()); expect(tail.position.toArray()).toEqual(b.root.getObjectByName(id + '-tail-pivot').position.toArray());
      } finally { a.dispose(); b.dispose(); }
    });
    it(id + ' shares pigment resources and releases all owned resources exactly once', () => {
      const a = make(id), b = make(id), ms = parts(a), maps = new Set();
      for (const m of ms) for (const key of ['map', 'bumpMap', 'roughnessMap']) if (m.material[key]) maps.add(m.material[key]);
      expect(parts(a)[0].material.map).toBe(parts(b)[0].material.map);
      let textures = 0, geometry = 0, material = 0;
      for (const t of maps) t.addEventListener('dispose', () => textures++);
      for (const m of ms) { m.geometry.addEventListener('dispose', () => geometry++); m.material.addEventListener('dispose', () => material++); }
      a.dispose(); a.dispose(); expect(geometry).toBe(2); expect(material).toBe(2); expect(textures).toBe(0);
      b.dispose(); b.dispose(); expect(textures).toBe(maps.size); expect(() => a.update(.1, 100)).not.toThrow();
    });
  }
  for (const quality of ['low', 'high']) {
    it('retains the longnose silhouette, mask and anal-web spot at ' + quality, () => {
      const h = make(ids[0], quality);
      try {
        const ms = parts(h), p = ms[0].geometry.attributes.position; let snout = 0, trunk = 0;
        for (let i = 0; i < p.count; i++) { if (p.getX(i) > .06) snout = Math.max(snout, Math.abs(p.getZ(i))); if (Math.abs(p.getX(i)) < .02) trunk = Math.max(trunk, Math.abs(p.getZ(i))); }
        expect(snout).toBeLessThan(trunk * .35);
        const yellow = pixel(h, 0, .25), upper = pixel(h, .23, .375), lower = pixel(h, .28, .125);
        expect(yellow[0]).toBeGreaterThan(220); expect(yellow[1]).toBeGreaterThan(180); expect(yellow[2]).toBeLessThan(50); expect(Math.max(...upper)).toBeLessThan(60); expect(Math.min(...lower)).toBeGreaterThan(200);
        const d = ms[1].geometry, dp = d.attributes.position, uv = d.attributes.uv, c = d.attributes.color; let left = 0, right = 0;
        for (let i = 0; i < dp.count; i++) if (uv.getX(i) < 1.8 && dp.getX(i) < -.035 && dp.getX(i) > -.05 && dp.getY(i) < -.023 && Math.max(c.getX(i), c.getY(i), c.getZ(i)) < .05) { if (dp.getZ(i) > .0003) left++; if (dp.getZ(i) < -.0003) right++; }
        expect(left).toBeGreaterThan(5); expect(right).toBeGreaterThan(5);
      } finally { h.dispose(); }
    });
    it('retains the pajama head, bar, rear spots and seated red eyes at ' + quality, () => {
      const h = make(ids[1], quality);
      try {
        const head = pixel(h, .25, .25), bar = pixel(h, .06, .25), im = parts(h)[0].material.map.image;
        expect(head[0]).toBeGreaterThan(160); expect(head[1]).toBeGreaterThan(head[2] * 1.5); expect(Math.max(...bar)).toBeLessThan(65);
        let spotted = 0, pearl = 0;
        for (let i = Math.floor(im.width * .64); i < Math.floor(im.width * .93); i++) for (let j = Math.floor(im.height * .12); j < Math.floor(im.height * .38); j++) { const k = (j * im.width + i) * 4, r = im.data[k], g = im.data[k + 1], b = im.data[k + 2]; if (r > g * 1.5 && r > b * 1.4) spotted++; if (Math.min(r, g, b) > 200) pearl++; }
        expect(spotted).toBeGreaterThan(30); expect(pearl).toBeGreaterThan(spotted);
        const d = parts(h)[1].geometry, uv = d.attributes.uv, c = d.attributes.color; let red = 0;
        for (let i = 0; i < uv.count; i++) if (uv.getX(i) > 1.8 && c.getX(i) > c.getY(i) * 3 && c.getX(i) > c.getZ(i) * 4) red++;
        expect(red).toBeGreaterThan(20);
      } finally { h.dispose(); }
    });
  }
});
