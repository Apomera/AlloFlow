import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, ID = 'spotted_seahorse';
const make = (quality = 'high', opts = {}) => S.create(T, ID, { seed: 7, quality, ...opts });
function meshes(h) { const a = []; h.root.traverse(m => { if (m.isMesh) a.push(m); }); return a; }
function buffers(h) { return meshes(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function state(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray()])); return a; }
function region(g, r) { const b = new T.Box3(), p = g.attributes.position; for (let i = r.first; i < r.first + r.count; i++) b.expandByPoint(new T.Vector3().fromBufferAttribute(p, i)); return b; }
function uniforms(m) {
  const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} };
  m.material.onBeforeCompile(shader); return shader.uniforms;
}

describe('Singapore spotted seahorse specimen', () => {
  it('appends a nominal posed-height example with a base origin', () => {
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
      'banded_pipefish', 'yellow_longnose_butterflyfish', 'pajama_cardinalfish', 'banggai_cardinalfish',
      'giant_triton', 'blue_velvet_headshield_slug', 'regal_angelfish', 'mandarin_dragonet',
      'harlequin_shrimp', 'spotted_seahorse'
    ];
    expect(S.ids.slice(0, registeredPrefix.length)).toEqual(registeredPrefix);
    expect(new Set(S.ids).size).toBe(S.ids.length);
    expect(S.info(ID)).toMatchObject({ group: 'fish', habit: 'bottom', lengthM: .12, depthM: [0, 55], origin: 'base', healthStates: ['healthy'] });
    expect(() => S.createSchool(T, ID, 2)).toThrow();
  });
  for (const quality of ['low', 'high']) {
    it('keeps finite upright geometry, two draws and a planted holdfast at ' + quality, () => {
      for (const seed of [7, 23]) {
        const h = make(quality, { seed });
        try {
          const ms = meshes(h), box = new T.Box3().setFromObject(h.root), size = box.getSize(new T.Vector3());
          expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThan(quality === 'high' ? 6000 : 1600);
          expect(Math.abs(box.min.y)).toBeLessThan(1e-8); expect(size.y).toBeGreaterThan(.11); expect(size.y).toBeLessThan(.13);
          expect(size.y / size.x).toBeGreaterThan(2); expect(size.z).toBeLessThan(.026);
          for (const m of ms) {
            expect(m.userData).toMatchObject({ speciesId: ID, group: 'fish' });
            for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true);
            expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true);
          }
        } finally { h.dispose(); }
      }
    });
    it('retains the connected rounded coronet and an actually recessed thick snout at ' + quality, () => {
      const h = make(quality);
      try {
        const g = meshes(h)[0].geometry, r = g.userData.spottedSeahorse.ranges, p = g.attributes.position;
        const head = region(g, r['head-thick-snout']), trunk = region(g, r['armoured-trunk']), crown = region(g, r['rounded-rear-coronet']);
        expect(trunk.max.y).toBeGreaterThan(head.min.y + .005);
        expect(crown.min.y).toBeLessThan(head.max.y - .0015); expect(crown.max.y).toBeGreaterThan(head.max.y + .003); expect(crown.max.y - head.max.y).toBeLessThan(.007);
        const mouth = r['recessed-terminal-mouth'], mb = region(g, mouth), ms = mb.getSize(new T.Vector3());
        expect(ms.x).toBeGreaterThan(.0015); expect(ms.y).toBeGreaterThan(.005); expect(ms.z).toBeGreaterThan(.0035);
        expect(ms.y / head.getSize(new T.Vector3()).x).toBeGreaterThan(.12);
        // The former loft cap is unreferenced; the inner ring lies behind the lip.
        expect([...g.index.array]).not.toContain(r['head-thick-snout'].first + r['head-thick-snout'].count - 2);
        expect(p.getX(mouth.first) - p.getX(mouth.first + 2)).toBeGreaterThan(.0015);
        const c = g.attributes.color; expect(c.getX(mouth.first + 2)).toBeLessThan(.03); expect(c.getX(mouth.first)).toBeGreaterThan(.4);
      } finally { h.dispose(); }
    });
    it('keeps a curled prehensile tail, subordinate holdfast and warm ring relief at ' + quality, () => {
      const h = make(quality);
      try {
        const ms = meshes(h), g = ms[0].geometry, data = g.userData.spottedSeahorse, r = data.ranges;
        const tail = region(g, r['prehensile-tail']), holdfast = region(g, r['subordinate-holdfast']), trunk = region(g, r['armoured-trunk']);
        expect(tail.min.x).toBeLessThan(-.012); expect(tail.max.x).toBeGreaterThan(.004); expect(tail.min.y).toBeLessThan(.01);
        expect(holdfast.max.y).toBeLessThan(trunk.max.y * .25); expect(holdfast.min.y).toBeCloseTo(0, 7);
        const tip = new T.Vector3(...data.tailTerminalCentreUnit), anchor = new T.Vector3(...data.holdfastContactCentreUnit);
        expect(Math.abs(tip.distanceTo(anchor) - data.tailTerminalRadiusUnit - .011)).toBeLessThan(.003);
        expect(data.visibleSex).toBe('unspecified'); expect(Object.keys(r).some(k => /tail.fin/i.test(k))).toBe(false);
        const pigment = ms[0].material.map.image, relief = ms[0].material.bumpMap.image, red = [];
        expect(pigment.width).toBe(quality === 'high' ? 256 : 128);
        for (let i = 0; i < relief.data.length; i += 4) red.push(relief.data[i]);
        expect(Math.min(...red)).toBeLessThan(110); expect(Math.max(...red)).toBeGreaterThan(125);
        expect(meshes(h)[1].geometry.userData.batch.map(e => e.part)).toEqual(['dorsal-fin', 'pectoral-left', 'pectoral-right']);
      } finally { h.dispose(); }
    });
    it('freezes all inspection geometry and fin poses deterministically at ' + quality, () => {
      const a = make(quality, { reducedMotion: true }), b = make(quality, { reducedMotion: true }), other = make(quality, { seed: 8, reducedMotion: true });
      try {
        expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other));
        a.root.position.set(3, -2, 4); a.root.rotation.y = .8;
        const before = state(a), geometry = buffers(a), rig = [...uniforms(meshes(a)[1]).reefRig.value];
        for (const t of [.5, 10, 1000]) a.update(.016, t, { speed: 1, turn: 1, current: { x: .8, z: .5, strength: 1 } });
        expect(state(a)).toEqual(before); expect(buffers(a)).toEqual(geometry); expect([...uniforms(meshes(a)[1]).reefRig.value]).toEqual(rig);
      } finally { a.dispose(); b.dispose(); other.dispose(); }
    });
  }
  it('flutters only attached fins while body, tail and placement remain fixed', () => {
    const a = make(), b = make();
    try {
      a.root.position.set(4, -2, 6); a.root.rotation.y = .7; b.root.position.copy(a.root.position); b.root.rotation.copy(a.root.rotation);
      const placement = [...a.root.position.toArray(), ...a.root.quaternion.toArray()], pivots = a.root.children.filter(n => n.isGroup), positions = pivots.map(n => n.position.toArray());
      const geometry = buffers(a), versions = meshes(a).map(m => Object.values(m.geometry.attributes).map(v => v.version)), before = state(a);
      a.update(.016, 2); expect(state(a)).not.toEqual(before); const previous = state(a); a.update(.001, 2.001);
      expect(Math.max(...state(a).flatMap((p, i) => p.map((v, j) => Math.abs(v - previous[i][j]))))).toBeLessThan(.01);
      expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(placement); expect(pivots.map(n => n.position.toArray())).toEqual(positions);
      expect(buffers(a)).toEqual(geometry); expect(meshes(a).map(m => Object.values(m.geometry.attributes).map(v => v.version))).toEqual(versions);
      a.update(.016, 4); b.update(4, 4); expect(state(a)).toEqual(state(b));
    } finally { a.dispose(); b.dispose(); }
  });
  it('shares atlas resources and disposes owned geometry and materials once', () => {
    const a = make(), b = make(), ms = meshes(a), maps = new Set();
    for (const m of ms) for (const key of ['map', 'bumpMap']) if (m.material[key]) maps.add(m.material[key]);
    expect(meshes(a)[0].material.map).toBe(meshes(b)[0].material.map);
    let textures = 0, geometry = 0, materials = 0;
    for (const t of maps) t.addEventListener('dispose', () => textures++);
    for (const m of ms) { m.geometry.addEventListener('dispose', () => geometry++); m.material.addEventListener('dispose', () => materials++); }
    a.dispose(); a.dispose(); expect(geometry).toBe(2); expect(materials).toBe(2); expect(textures).toBe(0);
    b.dispose(); b.dispose(); expect(textures).toBe(maps.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
  it('keeps pigment and both draws when derivative extensions are unavailable', () => {
    const h = make('low', { derivatives: false });
    try { expect(meshes(h)).toHaveLength(2); expect(meshes(h)[0].material.bumpMap).toBeNull(); expect(meshes(h)[0].material.map.image.width).toBe(128); expect(() => h.update(.016, 4)).not.toThrow(); }
    finally { h.dispose(); }
  });
});
