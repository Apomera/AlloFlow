import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,ID='broadclub_cuttlefish',make=(quality='high',options={})=>S.create(T,ID,{quality,seed:7,...options});
function meshes(h){const a=[];h.root.traverse(m=>{if(m.isMesh)a.push(m);});return a;}
function buffers(h){return meshes(h).map(m=>Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,[...a.array]])));}
function pose(h){const a=[];h.root.traverse(n=>a.push([...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()]));return a;}
function bounds(ms){const b=new T.Box3(),p=new T.Vector3();for(const m of ms)for(let i=0;i<m.geometry.attributes.position.count;i++)b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position,i));return b;}

describe('Broadclub cuttlefish specimen',()=>{
  it('registers a suspended specimen with full posed length, not mantle length',()=>{
    expect(S.ids).toContain(ID);expect(S.ids.indexOf(ID)).toBeGreaterThan(S.ids.indexOf('varicose_phyllidia'));expect(S.info(ID)).toMatchObject({group:'invertebrate',habit:'hover',lengthM:.30,depthM:[5,30],origin:'centre',healthStates:['healthy']});expect(()=>S.createSchool(T,ID,3)).toThrow();
  });
  for(const quality of ['low','high']){
    it('builds finite anatomy at a natural full-body scale and bounded cost at '+quality,()=>{
      for(const seed of [7,23]){const h=make(quality,{seed});try{const ms=meshes(h),b=bounds(ms),d=ms[0].geometry.userData.broadclubCuttlefish;expect(ms).toHaveLength(2);expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='high'?6000:1500);expect(b.min.y).toBeLessThan(0);expect(b.max.y).toBeGreaterThan(0);expect(b.getSize(new T.Vector3()).x).toBeGreaterThan(.27);expect(b.getSize(new T.Vector3()).x).toBeLessThan(.32);expect(b.getSize(new T.Vector3()).z).toBeGreaterThan(.12);expect(b.getSize(new T.Vector3()).z).toBeLessThan(.17);expect(d).toMatchObject({nominalPosedLengthM:.30,approximateMantleLengthM:.19,appearance:'unsexed-brown-cream-example',visibleArms:8,retractedFeedingTentacles:2,exposedTentacleClubs:0});for(const m of ms){for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true);expect(m.material.transparent).toBe(false);expect(m.material.emissive.getHex()).toBe(0);}}finally{h.dispose();}}
    });
    it('keeps eight distinct tapered arms and four true recessed sucker rows at '+quality,()=>{
      const h=make(quality);try{const g=meshes(h)[0].geometry,d=g.userData.broadclubCuttlefish,pos=g.attributes.position;expect(d.arms).toHaveLength(8);expect(new Set(d.arms.map(a=>a.tip.join(','))).size).toBe(8);expect(d.suckerRows).toBe(4);for(const arm of d.arms){expect(arm.tip[0]).toBeGreaterThan(arm.root[0]+.18);for(let row=0;row<4;row++){const cs=d.cups.filter(q=>q.arm===arm.index&&q.row===row);expect(cs).toHaveLength(quality==='high'?8:3);for(const q of cs){const rim=new T.Vector3();for(let j=0;j<q.count-1;j++)rim.add(new T.Vector3().fromBufferAttribute(pos,q.first+j));rim.divideScalar(q.count-1);const well=new T.Vector3().fromBufferAttribute(pos,q.first+q.count-1);expect(well.distanceTo(rim)).toBeCloseTo(.35*q.radius*d.scaleM,7);}}}expect(d.ranges['retracted-tentacle-pocket-folds'].count).toBeGreaterThan(10);expect(d.ranges['recessed-funnel'].count).toBeGreaterThan(20);}finally{h.dispose();}
    });
    it('holds mantle, arms, eyes and world placement still during hovering at '+quality,()=>{
      const h=make(quality);try{h.root.position.set(4,-2,7);h.root.rotation.y=.72;const ms=meshes(h),b=Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]])),versions=Object.values(ms[0].geometry.attributes).map(a=>a.version),p=pose(h);for(const t of [0,1,10,1000]){h.update(.016,t,{current:{x:1,z:1,strength:1}});expect(pose(h)).toEqual(p);expect(Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]]))).toEqual(b);expect(Object.values(ms[0].geometry.attributes).map(a=>a.version)).toEqual(versions);}}finally{h.dispose();}
    });
    it('anchors fin attachments and bounds every animated vertex at '+quality,()=>{
      const h=make(quality);try{const g=meshes(h)[1].geometry,d=g.userData.broadclubCuttlefish,before=[...g.attributes.position.array],box=g.boundingBox.clone(),sphere=g.boundingSphere.clone();let moved=0;for(const t of [1,2.3,20,1000]){h.update(.016,t);const a=g.attributes.position.array;for(const f of d.fins)for(let q=0;q<=f.longitudinalSegments;q++)for(let j=0;j<=f.widthSegments;j++){const i=(f.first+q*(f.widthSegments+1)+j)*3;if(j===0||q===0||q===f.longitudinalSegments)expect([...a.slice(i,i+3)]).toEqual(before.slice(i,i+3));const dist=Math.hypot(a[i]-before[i],a[i+1]-before[i+1],a[i+2]-before[i+2]);expect(dist).toBeLessThanOrEqual(d.maximumDisplacementM+1e-8);const p=new T.Vector3(a[i],a[i+1],a[i+2]);expect(box.containsPoint(p)).toBe(true);expect(sphere.containsPoint(p)).toBe(true);if(dist>1e-6)moved++;}}expect(moved).toBeGreaterThan(30);expect(g.attributes.color.version).toBe(0);expect(g.attributes.uv.version).toBe(0);}finally{h.dispose();}
    });
  }
  it('retains W-shaped pupil geometry, warm ventral eyes and seeded anatomy across tiers',()=>{
    const a=make(),b=make(),lo=make('low'),other=make('high',{seed:8});try{expect(buffers(a)).toEqual(buffers(b));expect(buffers(a)).not.toEqual(buffers(other));const g=meshes(a)[0].geometry,x=g.userData.broadclubCuttlefish,y=meshes(lo)[0].geometry.userData.broadclubCuttlefish;expect(x.arms.map(q=>[q.root,q.tip])).toEqual(y.arms.map(q=>[q.root,q.tip]));expect(x.papillae.map(q=>[q.root,q.height])).toEqual(y.papillae.map(q=>[q.root,q.height]));expect(x.eyes).toHaveLength(2);for(const eye of x.eyes){expect(eye).toMatchObject({pupilShape:'W',yellowLowerRim:true,pupilCount:48});const ys=Array.from({length:eye.pupilCount},(_,i)=>g.attributes.position.getY(eye.pupilFirst+i));expect(Math.max(...ys)-Math.min(...ys)).toBeGreaterThan(.0035);for(let i=0;i<eye.pupilCount;i++){const k=eye.pupilFirst+i;expect(g.attributes.color.getX(k)).toBeLessThan(.02);expect(g.attributes.uv.getX(k)).toBe(1);}}for(const q of y.cups)expect(x.cups.find(p=>p.arm===q.arm&&p.row===q.row&&p.station===q.station).radius).toBe(q.radius);}finally{a.dispose();b.dispose();lo.dispose();other.dispose();}
  });
  it('uses continuous absolute-time fin waves independent of frame step size',()=>{
    const a=make(),b=make();try{a.update(.016,2);const g=meshes(a)[1].geometry,first=[...g.attributes.position.array];a.update(.001,2.001);expect(Math.max(...g.attributes.position.array.map((v,i)=>Math.abs(v-first[i])))).toBeLessThan(.000005);a.update(.01,4);b.update(4,4);expect(buffers(a)).toEqual(buffers(b));expect(pose(a)).toEqual(pose(b));}finally{a.dispose();b.dispose();}
  });
  it('fully freezes the fin skirt for reduced-motion inspection',()=>{
    const h=make('high',{reducedMotion:true});try{const before=pose(h),geometry=buffers(h);for(const t of [1,100,10000])h.update(.016,t);expect(pose(h)).toEqual(before);expect(buffers(h)).toEqual(geometry);}finally{h.dispose();}
  });
  it('shares mottled skin resources and releases owned resources exactly once',()=>{
    const a=make(),b=make(),ms=meshes(a);let ng=0,nm=0,nt=0;for(const m of ms)m.geometry.addEventListener('dispose',()=>ng++);const mats=new Set(ms.map(m=>m.material));for(const m of mats)m.addEventListener('dispose',()=>nm++);const ts=new Set(ms.flatMap(m=>[m.material.map,m.material.bumpMap]));for(const t of ts)t.addEventListener('dispose',()=>nt++);expect(mats.size).toBe(1);expect(ms[0].material.map).toBe(meshes(b)[0].material.map);const pixels=ms[0].material.map.image.data;expect(new Set(Array.from(pixels).filter((v,i)=>i%4===0)).size).toBeGreaterThan(40);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([2,1,0]);b.dispose();b.dispose();expect(nt).toBe(ts.size);expect(()=>a.update(.1,2)).not.toThrow();
  });
  it('retains pigment and anatomy without derivative extensions',()=>{
    const h=make('low',{derivatives:false});try{for(const m of meshes(h)){expect(m.material.bumpMap).toBeNull();expect(m.material.map).toBeTruthy();}expect(()=>h.update(.1,2)).not.toThrow();}finally{h.dispose();}
  });
});
