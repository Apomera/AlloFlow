import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const ID = 'mandarin_dragonet';
const make = (id, quality = 'high', opts = {}) => S.create(T, id, { seed: 7, quality, ...opts });
function parts(h) { const a = []; h.root.traverse(n => { if (n.isMesh) a.push(n); }); return a; }
function buffers(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function state(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray()])); return a; }
function uniforms(m) { const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} }; m.material.onBeforeCompile(shader); return shader.uniforms; }
function fishPixel(h, x, v) { const im = parts(h)[0].material.map.image, at = (Math.floor(v * im.height) * im.width + Math.floor((.5 - x) / .77 * im.width)) * 4; return [...im.data.slice(at, at + 3)]; }
function region(g, first, count) { const b = new T.Box3(), a = g.attributes.position; for (let i = first; i < first + count; i++) b.expandByPoint(new T.Vector3().fromBufferAttribute(a, i)); return b; }
function colorAt(g, i) { const a = g.attributes.color; return [a.getX(i), a.getY(i), a.getZ(i)]; }
describe('Adult male mandarin dragonet specimen', () => {
  it('appends an illustrative six-centimetre substrate-associated adult', () => {
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
      'giant_triton', 'blue_velvet_headshield_slug', 'regal_angelfish', 'mandarin_dragonet'
    ];
    expect(S.ids.slice(0, registeredPrefix.length)).toEqual(registeredPrefix);
    expect(new Set(S.ids).size).toBe(S.ids.length);
    expect(S.info(ID)).toMatchObject({ group: 'fish', habit: 'bottom', lengthM: .06, depthM: [1,18], origin: 'centre', healthStates: ['healthy'], portrait: { dir: [.6,.58,2.7] } });
  });
  for (const quality of ['low','high']) {
    it('keeps finite tagged geometry in two draws within the '+quality+' budget', () => {
      const h = make(ID,quality);
      try {
        const ms = parts(h), size = new T.Box3().setFromObject(h.root).getSize(new T.Vector3());
        expect(ms).toHaveLength(2); expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThan(quality==='high'?6000:1500);
        expect(size.x).toBeGreaterThan(.058); expect(size.x).toBeLessThan(.067); expect(size.y).toBeLessThan(.042); expect(size.z).toBeGreaterThan(.035); expect(size.z).toBeLessThan(.045);
        for (const m of ms) { expect(m.userData).toMatchObject({speciesId:ID,group:'fish'}); for(const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true); expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true); }
      } finally {h.dispose();}
    });
    it('retains a low broad body, raised eyes, separate male sail and paired fans at '+quality, () => {
      const h=make(ID,quality);
      try {
        const ms=parts(h), body=ms[0].geometry.boundingBox, g=ms[1].geometry, entries=g.userData.batch;
        const bodySize=body.getSize(new T.Vector3()); expect(bodySize.x/bodySize.y).toBeGreaterThan(4); expect(bodySize.z/bodySize.y).toBeGreaterThan(1.1);
        const n=quality==='high'?22:7, firstCount=(n+1)*6, sail=region(g,0,firstCount), rearDorsal=region(g,firstCount,firstCount);
        expect(sail.max.y).toBeGreaterThan(rearDorsal.max.y*2); expect(sail.min.x).toBeGreaterThan(rearDorsal.min.x); expect(sail.max.y).toBeGreaterThan(body.max.y*3);
        const fans=entries.filter(e=>e.part==='pectoral').map(e=>region(g,e.first,e.count)); expect(fans).toHaveLength(2); expect(fans[0].min.z).toBeGreaterThan(0); expect(fans[1].max.z).toBeLessThan(0);
        for (const b of fans) {expect(b.getSize(new T.Vector3()).y).toBeGreaterThan(.013); expect(Math.max(Math.abs(b.min.z),Math.abs(b.max.z))).toBeGreaterThan(body.max.z*2.5);}
        const detail=entries.find(e=>e.part==='detail'), eyeVertices=2*(1+5*(quality==='high'?24:12)), eyes=region(g,detail.first,eyeVertices);
        expect(eyes.max.y).toBeGreaterThan(body.max.y); expect(eyes.min.z).toBeCloseTo(-eyes.max.z,6);
      } finally {h.dispose();}
    });
    it('keeps winding blue ribbons on both flanks and a blue tail perimeter at '+quality, () => {
      const h=make(ID,quality);
      try {
        const isBlue=c=>c[1]>70&&c[2]>70&&c[2]>c[0]*1.2;
        for (const v of [.25,.75]) {
          const row=Array.from({length:320},(_,i)=>fishPixel(h,-.23+i/319*.63,v)), blue=row.map(isBlue);
          expect(blue.filter(Boolean).length).toBeGreaterThan(25); expect(blue.reduce((n,x,i)=>n+(i&&x!==blue[i-1]?1:0),0)).toBeGreaterThanOrEqual(10);
          expect(row.filter(c=>c[0]>c[2]*1.5).length).toBeGreaterThan(70);
        }
        const g=parts(h)[1].geometry, e=g.userData.batch.find(e=>e.part==='tail'), uv=g.attributes.uv;
        let edge=0; for(let i=e.first;i<e.first+e.count;i++) if(uv.getY(i)>.99){const c=colorAt(g,i);expect(c[2]).toBeGreaterThan(c[0]*2);expect(c[1]).toBeGreaterThan(c[0]*2);edge++;} expect(edge).toBeGreaterThan(8);
        const relief=parts(h)[0].material.bumpMap.image.data, reds=[]; for(let i=0;i<relief.length;i+=4)reds.push(relief[i]); expect(Math.max(...reds)-Math.min(...reds)).toBeLessThanOrEqual(18);
      } finally {h.dispose();}
    });
    it('freezes deterministic inspection geometry and all local fin state at '+quality, () => {
      const a=make(ID,quality,{reducedMotion:true}),b=make(ID,quality,{reducedMotion:true}),other=make(ID,quality,{seed:8,reducedMotion:true});
      try {
        expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other)); a.root.position.set(3,2,-4);a.root.rotation.y=.8;
        const geometry=buffers(a),before=state(a),u=uniforms(parts(a)[1]),swim=u.reefSwim.value.toArray(),rig=[...u.reefRig.value];
        for(const t of [.5,10,1000])a.update(.016,t,{speed:1,turn:1,current:{strength:1}});
        expect(buffers(a)).toEqual(geometry);expect(state(a)).toEqual(before);expect(u.reefSwim.value.toArray()).toEqual(swim);expect([...u.reefRig.value]).toEqual(rig);
      } finally {a.dispose();b.dispose();other.dispose();}
    });
  }
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
