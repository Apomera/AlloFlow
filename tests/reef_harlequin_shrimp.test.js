import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const ID = 'harlequin_shrimp';
const make = (id, quality = 'high', opts = {}) => S.create(T, id, { seed: 7, quality, ...opts });
function parts(h) { const a = []; h.root.traverse(n => { if (n.isMesh) a.push(n); }); return a; }
function buffers(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function state(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray()])); return a; }
function uniforms(m) { const shader = { vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>', uniforms: {} }; m.material.onBeforeCompile(shader); return shader.uniforms; }
function region(g,first,count){const b=new T.Box3(),a=g.attributes.position;for(let i=first;i<first+count;i++)b.expandByPoint(new T.Vector3().fromBufferAttribute(a,i));return b;}
function vertexColour(m,i){const g=m.geometry,c=g.attributes.color,uv=g.attributes.uv,im=m.material.map.image,x=Math.min(im.width-1,Math.max(0,Math.floor(uv.getX(i)*im.width))),y=Math.min(im.height-1,Math.max(0,Math.floor(uv.getY(i)*im.height))),k=(y*im.width+x)*4,lin=v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);return[c.getX(i)*lin(im.data[k]/255),c.getY(i)*lin(im.data[k+1]/255),c.getZ(i)*lin(im.data[k+2]/255)];}
function colours(m,e){const a=[];for(let i=e.first;i<e.first+e.count;i++)a.push(...vertexColour(m,i));return a;}
describe('Pacific adult harlequin shrimp',()=>{
  it('appends an unsexed illustrative adult with substrate origin',()=>{
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
      'giant_triton', 'blue_velvet_headshield_slug', 'regal_angelfish', 'mandarin_dragonet', 'harlequin_shrimp'
    ];
    expect(S.ids.slice(0, registeredPrefix.length)).toEqual(registeredPrefix);
    expect(new Set(S.ids).size).toBe(S.ids.length);
    expect(S.info(ID)).toMatchObject({group:'invertebrate',habit:'bottom',lengthM:.045,depthM:[1,20],origin:'base',healthStates:['healthy']});
  });
  for(const quality of ['low','high']){
    it('keeps finite geometry, two draws and actual foot contact at '+quality,()=>{
      for(const seed of [7,23]){const h=make(ID,quality,{seed});try{const ms=parts(h),box=new T.Box3().setFromObject(h.root),size=box.getSize(new T.Vector3());expect(ms).toHaveLength(2);expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThan(quality==='high'?6000:1500);expect(Math.abs(box.min.y)).toBeLessThan(1e-8);expect(size.x).toBeGreaterThan(.058);expect(size.x).toBeLessThan(.073);expect(size.y).toBeGreaterThan(.029);expect(size.y).toBeLessThan(.04);for(const m of ms){expect(m.userData).toMatchObject({speciesId:ID,group:'invertebrate'});for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true);}}finally{h.dispose();}}
    });
    it('retains bilateral wine patches, blue margins and cream spaces at '+quality,()=>{
      const h=make(ID,quality);try{const ms=parts(h),g=ms[0].geometry,p=g.attributes.position,c=g.attributes.color;for(const side of [-1,1]){let wine=0,blue=0,cream=0;for(let i=0;i<p.count;i++){if(side*p.getZ(i)<.001)continue;const [r,v,b]=vertexColour(ms[0],i);wine+=r>v*1.7&&b>v*1.2&&b<r*1.5&&r<.55;blue+=b>r*1.7&&b>v*1.3;cream+=r>.45&&v>.35&&b>.25;}expect(wine).toBeGreaterThan(25);expect(blue).toBeGreaterThan(8);expect(cream).toBeGreaterThan(60);}
      expect(ms[0].material.map).toBe(ms[1].material.map);expect(ms[0].material.map.image.width).toBe(quality==='high'?256:128);for(const m of ms){for(const x of m.geometry.attributes.uv.array){expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThanOrEqual(1);}}
      const ag=ms[1].geometry,table=ag.userData.batch;for(const kind of ['claw','antennule']){const left=table.find(e=>e.part===kind+'-left'),right=table.find(e=>e.part===kind+'-right');expect(colours(ms[1],left)).toEqual(colours(ms[1],right));const cs=colours(ms[1],left);expect(cs.some((r,i)=>i%3===0&&r>cs[i+1]*1.7&&r<.55)).toBe(true);}
      expect(g.userData.harlequinShrimp.adultSex).toBe('unspecified');expect(Object.keys(g.userData.harlequinShrimp.ranges)).toEqual(['carapace-rostrum','segmented-abdomen','walking-legs','mouthparts-stalked-eyes','tail-fan']);}finally{h.dispose();}
    });
    it('has a closed broad pincer pair with real distal clefts at '+quality,()=>{
      const h=make(ID,quality);try{const g=parts(h)[1].geometry,p=g.attributes.position,table=g.userData.batch;expect(table.map(e=>e.slot)).toEqual([1,2,3,4]);const nr=quality==='high'?7:3,ns=quality==='high'?48:24,tube=quality==='high'?19:13,face=1+nr*ns;
      for(const side of [-1,1]){const name=side<0?'left':'right',e=table.find(e=>e.part==='claw-'+name),pv=h.root.getObjectByName(ID+'-claw-'+name),start=e.first+tube,thickness=Math.abs(p.getY(start+face)-p.getY(start));expect(thickness).toBeGreaterThan(.0015);expect(thickness).toBeLessThan(.0027);const a=region(g,start,face);expect(a.getSize(new T.Vector3()).z/thickness).toBeGreaterThan(6);const outer=start+1+(nr-1)*ns,points=[];for(let j=0;j<ns;j++){const i=outer+j,k=i+face;expect(new T.Vector3().fromBufferAttribute(p,i).distanceTo(new T.Vector3().fromBufferAttribute(p,k))).toBeLessThan(1e-8);points.push(new T.Vector3().fromBufferAttribute(p,i));}const front=Math.max(...points.map(p=>p.x)),middle=pv.position.z+side*.16*.045;expect(points.some(v=>Math.abs(v.z-middle)<.0012&&v.x<front-.004&&v.x>front-.009)).toBe(true);expect(points.some(v=>v.z>middle+.002&&v.x>front-.004)).toBe(true);expect(points.some(v=>v.z<middle-.002&&v.x>front-.004)).toBe(true);}
      const petals=table.filter(e=>e.part.startsWith('antennule'));expect(petals).toHaveLength(2);for(const e of petals){const b=region(g,e.first,e.count);expect(b.getSize(new T.Vector3()).z).toBeGreaterThan(.006);expect(b.max.y).toBeGreaterThan(.03);}}finally{h.dispose();}
    });
    it('keeps seeded shape and completely frozen inspection state at '+quality,()=>{
      const a=make(ID,quality,{reducedMotion:true}),b=make(ID,quality,{reducedMotion:true}),other=make(ID,quality,{seed:8,reducedMotion:true});try{expect(buffers(a)).toEqual(buffers(b));expect(buffers(a)).not.toEqual(buffers(other));a.root.position.set(2,-1,4);a.root.rotation.y=.7;const before=state(a),geometry=buffers(a),rig=[...uniforms(parts(a)[1]).reefRig.value];for(const t of [1,10,1000])a.update(.016,t,{current:{x:.8,z:.5,strength:1}});expect(state(a)).toEqual(before);expect(buffers(a)).toEqual(geometry);expect([...uniforms(parts(a)[1]).reefRig.value]).toEqual(rig);}finally{a.dispose();b.dispose();other.dispose();}
    });
  }
  it('moves only attached front appendages analytically without geometry uploads',()=>{
    const a=make(ID),b=make(ID);try{a.root.position.set(4,-2,6);a.root.rotation.y=.7;b.root.position.copy(a.root.position);b.root.rotation.copy(a.root.rotation);const placement=[...a.root.position.toArray(),...a.root.quaternion.toArray()],positions=a.root.children.filter(n=>n.isGroup).map(n=>n.position.toArray()),geometry=buffers(a),versions=parts(a).map(m=>Object.values(m.geometry.attributes).map(v=>v.version)),before=state(a);a.update(.016,2);expect(state(a)).not.toEqual(before);const previous=state(a);a.update(.001,2.001);expect(Math.max(...state(a).flatMap((p,i)=>p.map((v,j)=>Math.abs(v-previous[i][j]))))).toBeLessThan(.001);expect([...a.root.position.toArray(),...a.root.quaternion.toArray()]).toEqual(placement);expect(a.root.children.filter(n=>n.isGroup).map(n=>n.position.toArray())).toEqual(positions);expect(buffers(a)).toEqual(geometry);expect(parts(a).map(m=>Object.values(m.geometry.attributes).map(v=>v.version))).toEqual(versions);a.update(.016,4);b.update(4,4);expect(state(a)).toEqual(state(b));}finally{a.dispose();b.dispose();}
  });
  it('preserves both pigment-bearing draws without derivative extensions',()=>{
    const h=make(ID,'low',{derivatives:false});try{expect(parts(h)).toHaveLength(2);expect(parts(h)[0].material.bumpMap).toBeNull();expect(parts(h)[0].material.vertexColors).toBe(true);expect(()=>h.update(.016,4)).not.toThrow();}finally{h.dispose();}
  });
  it('shares its pigment maps and disposes owned geometry and materials exactly once', () => {
    const a = make(ID), b = make(ID), ms = parts(a), maps = new Set();
    for (const m of ms) for (const key of ['map', 'bumpMap', 'roughnessMap']) if (m.material[key]) maps.add(m.material[key]); expect(parts(a)[0].material.map).toBe(parts(b)[0].material.map);
    let textures = 0, geometry = 0, material = 0;
    for (const t of maps) t.addEventListener('dispose', () => textures++); for (const m of ms) { m.geometry.addEventListener('dispose', () => geometry++); m.material.addEventListener('dispose', () => material++); }
    a.dispose(); a.dispose(); expect(geometry).toBe(2); expect(material).toBe(2); expect(textures).toBe(0); b.dispose(); b.dispose(); expect(textures).toBe(maps.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
});
