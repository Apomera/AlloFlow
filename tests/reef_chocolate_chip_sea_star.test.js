import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,ID='chocolate_chip_sea_star',make=(quality='high',options={})=>S.create(T,ID,{quality,seed:7,...options});
function meshes(h){const a=[];h.root.traverse(m=>{if(m.isMesh)a.push(m);});return a;}
function buffers(h){return meshes(h).map(m=>Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,[...a.array]])));}
function pose(h){const a=[];h.root.traverse(n=>a.push([...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()]));return a;}
function bounds(h){h.root.updateMatrixWorld(true);const b=new T.Box3(),p=new T.Vector3();for(const m of meshes(h))for(let i=0;i<m.geometry.attributes.position.count;i++)b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld));return b;}

describe('Chocolate chip sea star specimen',()=>{
  it('registers a bottom animal with nominal arm-tip span and sourced depth',()=>{
    expect(S.ids).toContain(ID);expect(S.ids.indexOf(ID)).toBeGreaterThan(S.ids.indexOf('longnose_hawkfish'));expect(S.info(ID)).toMatchObject({group:'invertebrate',habit:'bottom',lengthM:.28,depthM:[0,30],origin:'base',healthStates:['healthy']});expect(()=>S.createSchool(T,ID,3)).toThrow();
  });
  for(const quality of ['low','high']){
    it('retains grounded finite complete geometry within the original budget at '+quality,()=>{
      for(const seed of [7,23]){const h=make(quality,{seed});try{const ms=meshes(h),b=bounds(h),d=ms[0].geometry.userData.chocolateChipStar;expect(ms).toHaveLength(2);expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='high'?6000:1500);expect(b.min.y).toBe(0);expect(b.getSize(new T.Vector3()).x).toBeGreaterThan(.26);expect(b.getSize(new T.Vector3()).x).toBeLessThan(.30);expect(b.max.y).toBeGreaterThan(.045);expect(b.max.y).toBeLessThan(.060);expect(d.nominalTipSpanM).toBe(.28);expect(d.appearance).toBe('cream-ochre-unsexed');for(const m of ms){for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true);expect(m.material.transparent).toBe(false);expect(m.material.emissive.getHex()).toBe(0);}}finally{h.dispose();}}
    });
    it('retains five inflated arms, conical knobs, oral grooves and paired feet at '+quality,()=>{
      const h=make(quality);try{const ms=meshes(h),g=ms[0].geometry,d=g.userData.chocolateChipStar,f=ms[1].geometry.userData.chocolateChipStar;expect(d.arms).toBe(5);expect(d.oralGrooves).toBe(5);expect(d.knobs).toHaveLength(25);expect(d.knobs.every(k=>k.actualHeight>0&&k.width>0)).toBe(true);expect(f.feet).toHaveLength(quality==='high'?120:60);for(let arm=0;arm<5;arm++){const a=f.feet.filter(q=>q.arm===arm);expect(a.filter(q=>q.side===1)).toHaveLength(f.pairsPerArm);expect(a.filter(q=>q.side===-1)).toHaveLength(f.pairsPerArm);expect(a.every(q=>q.root[1]>q.contact[1]&&q.contact[1]===0)).toBe(true);}expect(d.ranges['madreporite'].count).toBeGreaterThan(5);expect(d.ranges['central-oral-mouth'].count).toBeGreaterThan(5);const top=d.ranges['aboral-body'],bottom=d.ranges['oral-body-five-grooves'];expect(g.attributes.position.getY(top.first)).toBeGreaterThan(g.attributes.position.getY(bottom.first));const colors=g.attributes.color.array;expect(Math.max(...colors)-Math.min(...colors)).toBeGreaterThan(.3);}finally{h.dispose();}
    });
    it('keeps body, knobs and placement exactly fixed during local foot motion at '+quality,()=>{
      const h=make(quality);try{h.root.position.set(4,-2,7);h.root.rotation.y=.72;const ms=meshes(h),b=Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]])),versions=Object.values(ms[0].geometry.attributes).map(a=>a.version),p=pose(h);for(const t of [0,1,10,1000]){h.update(.016,t,{current:{x:1,z:1,strength:1}});expect(pose(h)).toEqual(p);expect(Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]]))).toEqual(b);expect(Object.values(ms[0].geometry.attributes).map(a=>a.version)).toEqual(versions);}}finally{h.dispose();}
    });
    it('preserves attached foot roots and planted soles while bounding every probe at '+quality,()=>{
      const h=make(quality);try{const g=meshes(h)[1].geometry,d=g.userData.chocolateChipStar,before=[...g.attributes.position.array],sides=quality==='high'?4:3;let moved=0;for(const t of [1,2.3,20,1000]){h.update(.016,t);const a=g.attributes.position.array;for(const f of d.feet)for(let j=0;j<f.count;j++){const i=(f.first+j)*3;if(!f.probing||j<sides)expect([...a.slice(i,i+3)]).toEqual(before.slice(i,i+3));const dist=Math.hypot(a[i]-before[i],a[i+1]-before[i+1],a[i+2]-before[i+2]);expect(dist).toBeLessThanOrEqual(d.maximumProbeDisplacementM+1e-8);expect(a[i+1]).toBeGreaterThanOrEqual(0);if(dist>1e-8)moved++;}}expect(moved).toBeGreaterThan(10);expect(d.feet.filter(f=>!f.probing).length).toBe(d.feet.length*2/3);expect(g.attributes.color.version).toBe(0);expect(g.attributes.uv.version).toBe(0);}finally{h.dispose();}
    });
  }
  it('preserves biological stations across tiers with deterministic individual variation',()=>{
    const a=make(),b=make(),lo=make('low'),other=make('high',{seed:8});try{expect(buffers(a)).toEqual(buffers(b));expect(buffers(a)).not.toEqual(buffers(other));const x=meshes(a)[0].geometry.userData.chocolateChipStar,y=meshes(lo)[0].geometry.userData.chocolateChipStar;expect(x.scaleM).toBe(y.scaleM);expect(x.knobs).toEqual(y.knobs);const all=meshes(a)[1].geometry.userData.chocolateChipStar.feet;for(const f of meshes(lo)[1].geometry.userData.chocolateChipStar.feet){const match=all.find(q=>q.arm===f.arm&&q.station===f.station&&q.side===f.side);expect(f.root).toEqual(match.root);expect(f.contact).toEqual(match.contact);}}finally{a.dispose();b.dispose();lo.dispose();other.dispose();}
  });
  it('uses smooth absolute-time probing and changes only the foot geometry',()=>{
    const a=make(),b=make();try{a.update(.016,2);const g=meshes(a)[1].geometry,first=[...g.attributes.position.array];a.update(.001,2.001);expect(Math.max(...g.attributes.position.array.map((v,i)=>Math.abs(v-first[i])))).toBeLessThan(.000002);a.update(.01,4);b.update(4,4);expect(buffers(a)).toEqual(buffers(b));expect(pose(a)).toEqual(pose(b));}finally{a.dispose();b.dispose();}
  });
  it('fully freezes feet and body for reduced-motion inspection',()=>{
    const h=make('high',{reducedMotion:true});try{const before=pose(h),geometry=buffers(h);for(const t of [1,100,10000])h.update(.016,t);expect(pose(h)).toEqual(before);expect(buffers(h)).toEqual(geometry);}finally{h.dispose();}
  });
  it('shares skin textures and releases every owned resource exactly once',()=>{
    const a=make(),b=make(),ms=meshes(a);let ng=0,nm=0,nt=0;for(const m of ms){m.geometry.addEventListener('dispose',()=>ng++);m.material.addEventListener('dispose',()=>nm++);}const ts=new Set(ms.flatMap(m=>[m.material.map,m.material.bumpMap]));for(const t of ts)t.addEventListener('dispose',()=>nt++);expect(ms[0].material.map).toBe(ms[1].material.map);expect(ms[0].material.map).toBe(meshes(b)[0].material.map);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([2,2,0]);b.dispose();b.dispose();expect(nt).toBe(ts.size);expect(()=>a.update(.1,2)).not.toThrow();
  });
  it('retains pigment, anatomy and probing without derivative extensions',()=>{
    const h=make('low',{derivatives:false});try{for(const m of meshes(h)){expect(m.material.bumpMap).toBeNull();expect(m.material.map).toBeTruthy();}expect(()=>h.update(.1,2)).not.toThrow();}finally{h.dispose();}
  });
});
