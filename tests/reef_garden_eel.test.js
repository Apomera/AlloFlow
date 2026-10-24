import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
vi.setConfig({testTimeout:30000});
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, ID = 'spotted_garden_eel';
function make(quality = 'high', options = {}) { return S.create(T, ID, { seed: 7, quality, ...options }); }
function parts(h) { const list = []; h.root.traverse(n => { if (n.isMesh) list.push(n); }); return list; }
function snap(h) { return parts(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([key, a]) => [key, [...a.array]]))); }
function pigment(h, u, v) { const image = h.root.getObjectByName(ID + '-body').material.map.image, x = Math.min(image.width-1, Math.floor(u*image.width)), y = Math.min(image.height-1, Math.floor(v*image.height)), at = (y*image.width+x)*4; return Array.from(image.data.slice(at,at+3)); }

describe('spotted garden eel specimen', () => {
  it('reports a complete adult length separately from its partial feeding emergence', () => {
    const info = S.info(ID); expect(info.group).toBe('fish'); expect(info.origin).toBe('base'); expect(info.habit).toBe('crevice'); expect(info.lengthM).toBe(.4); expect(info.depthM).toEqual([5,50]); expect(info.schoolSize).toBe(null); expect(info.healthStates).toEqual(['healthy']);
    const h = make(); try { const p = h.root.getObjectByName(ID+'-body').geometry.attributes.position; let min=Infinity,max=-Infinity;for(let i=0;i<p.count;i++){min=Math.min(min,p.getY(i));max=Math.max(max,p.getY(i));} expect(min).toBeLessThan(0);expect(max).toBeGreaterThan(.195);expect(max).toBeLessThan(.225);expect(max).toBeLessThan(info.lengthM*.6); } finally {h.dispose();}
  });
  for (const quality of ['low','high']) {
    it('builds finite, tagged, slender geometry within the '+quality+' animal budget', () => {
      const h=make(quality);try {const ms=parts(h);expect(ms).toHaveLength(2);expect(ms.reduce((sum,m)=>sum+m.geometry.index.count/3,0)).toBeLessThan(quality==='high'?6000:1500);
        for(const m of ms){expect(m.userData.speciesId).toBe(ID);for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);expect(m.geometry.boundingBox.isEmpty()).toBe(false);expect(m.geometry.boundingSphere.radius).toBeGreaterThan(0);}
        const body=ms[0].geometry.attributes.position;let width=0;const sides=quality==='high'?20:10,steps=quality==='high'?72:36;for(let row=0;row<=steps;row++){let min=Infinity,max=-Infinity;for(let side=0;side<=sides;side++){const z=body.getZ(row*(sides+1)+side);min=Math.min(min,z);max=Math.max(max,z);}width=Math.max(width,max-min);}expect(width).toBeGreaterThan(.008);expect(width).toBeLessThan(.012);expect(h.radius).toBeGreaterThan(.19);expect(h.radius).toBeLessThan(.24);
      }finally{h.dispose();}
    });
    it('retains deterministic geometry and the frozen '+quality+' inspection pose',()=>{
      const a=make(quality,{reducedMotion:true}),b=make(quality,{reducedMotion:true}),other=make(quality,{seed:8,reducedMotion:true});try{const base=snap(a);expect(snap(b)).toEqual(base);expect(snap(other)).not.toEqual(base);a.root.position.set(3,2,-4);a.root.rotation.y=.6;const transform=[...a.root.position.toArray(),...a.root.quaternion.toArray()];for(const time of [.5,20,1000])a.update(.016,time,{current:{x:.4,z:.3,strength:1}});expect(snap(a)).toEqual(base);expect([...a.root.position.toArray(),...a.root.quaternion.toArray()]).toEqual(transform);}finally{a.dispose();b.dispose();other.dispose();}
    });
    it('bends in the current without moving its attachment or placement root at '+quality,()=>{
      const h=make(quality);try{h.root.position.set(3,-4,6);h.root.rotation.y=.7;const root=[...h.root.position.toArray(),...h.root.quaternion.toArray()],ms=parts(h),geo=ms[0].geometry,base=geo.attributes.position.array.slice(),arrays=ms.map(m=>[m.geometry.attributes.position.array,m.geometry.attributes.normal.array]),versions=ms.map(m=>m.geometry.attributes.position.version);let change=0,anchors=0,anchored=true,vertical=true,contained=true;const point=new T.Vector3();
      for(let frame=0;frame<160;frame++){h.update(1/20,frame/20,{current:{x:.3,z:.2,strength:.9}});const out=geo.attributes.position.array;for(let v=0;v<base.length;v+=3){if(base[v+1]<=0){anchored=anchored&&out[v]===base[v]&&out[v+2]===base[v+2];anchors++;}vertical=vertical&&out[v+1]===base[v+1];change=Math.max(change,Math.abs(out[v]-base[v]),Math.abs(out[v+2]-base[v+2]));}for(const m of ms){const p=m.geometry.attributes.position;for(let v=0;v<p.count;v++){contained=contained&&m.geometry.boundingBox.containsPoint(point.fromBufferAttribute(p,v));}}}
      expect(anchored).toBe(true);expect(vertical).toBe(true);expect(contained).toBe(true);expect(anchors).toBeGreaterThan(0);expect(change).toBeGreaterThan(.001);expect(change).toBeLessThan(.014);expect([...h.root.position.toArray(),...h.root.quaternion.toArray()]).toEqual(root);for(let i=0;i<ms.length;i++){expect(ms[i].geometry.attributes.position.array).toBe(arrays[i][0]);expect(ms[i].geometry.attributes.normal.array).toBe(arrays[i][1]);expect(ms[i].geometry.attributes.position.version).toBeGreaterThan(versions[i]);}
      const normal=geo.attributes.normal,sides=quality==='high'?20:10,steps=quality==='high'?72:36;for(let i=0;i<=steps;i++){const a=i*(sides+1),b=a+sides;expect([normal.getX(a),normal.getY(a),normal.getZ(a)]).toEqual([normal.getX(b),normal.getY(b),normal.getZ(b)]);}
      }finally{h.dispose();}
    });
  }
  it('keeps the same morphology, pigment and diagnostic stations across tiers',()=>{
    const high=make('high'),low=make('low');try{const hp=parts(high)[0].geometry.attributes.position,lp=parts(low)[0].geometry.attributes.position;for(let row=0;row<=36;row++)for(let side=0;side<=10;side++){const a=row*11+side,b=row*2*21+side*2;expect([lp.getX(a),lp.getY(a),lp.getZ(a)]).toEqual([hp.getX(b),hp.getY(b),hp.getZ(b)]);}expect(parts(high)[0].material.map).toBe(parts(low)[0].material.map);}finally{high.dispose();low.dispose();}
  });
  it('paints pale skin with fine spots and two exposed large flank patches',()=>{
    const h=make();try{const image=parts(h)[0].material.map.image,data=image.data;let pale=0,dark=0;for(let i=0;i<data.length;i+=4){if(Math.min(data[i],data[i+1],data[i+2])>175)pale++;if(Math.max(data[i],data[i+1],data[i+2])<75)dark++;}expect(pale/(data.length/4)).toBeGreaterThan(.5);expect(dark/(data.length/4)).toBeGreaterThan(.12);expect(dark/(data.length/4)).toBeLessThan(.4);expect(Math.max(...pigment(h,.25,.80))).toBeLessThan(60);expect(Math.max(...pigment(h,.75,.19))).toBeLessThan(60);}finally{h.dispose();}
  });
  it('uses absolute time rather than accumulated motion and responds to reversed flow',()=>{
    const a=make(),b=make();try{const flow={current:{x:.2,z:.1,strength:.8}};for(let frame=0;frame<=90;frame++)a.update(1/30,frame/30,flow);b.update(3,3,flow);expect(snap(a)).toEqual(snap(b));const before=parts(b)[0].geometry.attributes.position.array.slice();b.update(3,3,{current:{x:-.2,z:-.1,strength:.8}});expect([...parts(b)[0].geometry.attributes.position.array]).not.toEqual([...before]);}finally{a.dispose();b.dispose();}
  });
  it('has both eyes and a narrow terminal mouth ahead of the neck in the real model',()=>{
    const h=make();try{const p=parts(h)[1].geometry.attributes.position;let left=0,right=0,mouth=0;for(let v=0;v<p.count;v++){const box=new T.Box3().setFromBufferAttribute(p);if(p.getY(v)>box.max.y-.004&&p.getZ(v)<-.004)left++;if(p.getY(v)>box.max.y-.004&&p.getZ(v)>.004)right++;if(p.getX(v)>box.max.x-.001&&p.getY(v)>box.max.y-.004)mouth++;}expect(left).toBeGreaterThan(5);expect(right).toBeGreaterThan(5);expect(mouth).toBeGreaterThan(5);}finally{h.dispose();}
  });
  it('releases each owned resource once and reference-counts the shared skin maps',()=>{
    const a=make(),b=make(),ms=parts(a),maps=new Set();for(const m of ms)for(const key of ['map','bumpMap','roughnessMap'])if(m.material[key])maps.add(m.material[key]);let textures=0,geos=0,mats=0;for(const t of maps)t.addEventListener('dispose',()=>textures++);for(const m of ms){m.geometry.addEventListener('dispose',()=>geos++);m.material.addEventListener('dispose',()=>mats++);}expect(parts(a)[0].material.map).toBe(parts(b)[0].material.map);a.dispose();a.dispose();expect(geos).toBe(2);expect(mats).toBe(2);expect(textures).toBe(0);b.dispose();b.dispose();expect(textures).toBe(maps.size);expect(()=>a.update(.01,5)).not.toThrow();
  });
});
