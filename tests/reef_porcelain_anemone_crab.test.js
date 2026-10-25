import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,ID='porcelain_anemone_crab',make=(quality='high',options={})=>S.create(T,ID,{quality,seed:7,...options});
function meshes(h){const a=[];h.root.traverse(m=>{if(m.isMesh)a.push(m);});return a;}
function buffers(h){return meshes(h).map(m=>Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,[...a.array]])));}
function pose(h){const a=[];h.root.traverse(n=>a.push([...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()]));return a;}
function bounds(ms){const b=new T.Box3(),p=new T.Vector3();for(const m of ms)for(let i=0;i<m.geometry.attributes.position.count;i++)b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position,i));return b;}

describe('Porcelain anemone crab specimen',()=>{
  it('registers an isolated bottom specimen using its posed span convention',()=>{
    expect(S.ids).toContain(ID);expect(S.ids.indexOf(ID)).toBeGreaterThan(S.ids.indexOf('chocolate_chip_sea_star'));expect(S.info(ID)).toMatchObject({group:'invertebrate',habit:'bottom',lengthM:.04,depthM:[1,10],origin:'base',healthStates:['healthy']});expect(()=>S.createSchool(T,ID,3)).toThrow();
  });
  for(const quality of ['low','high']){
    it('builds complete finite grounded anatomy within budget at '+quality,()=>{
      for(const seed of [7,23]){const h=make(quality,{seed});try{const ms=meshes(h),b=bounds(ms),shell=bounds([ms[0]]),d=ms[0].geometry.userData.porcelainCrab;expect(ms).toHaveLength(2);expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='high'?6000:1500);expect(b.min.y).toBe(0);expect(shell.getSize(new T.Vector3()).z).toBeGreaterThan(.036);expect(shell.getSize(new T.Vector3()).z).toBeLessThan(.042);expect(b.max.y).toBeGreaterThan(.012);expect(b.max.y).toBeLessThan(.016);expect(d).toMatchObject({nominalLegClawSpanM:.04,nominalCarapaceLengthM:.012,antennaeExcludedFromSpan:true,hostOmitted:true,appearance:'finely-red-spotted-unsexed'});for(const m of ms){for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true);expect(m.material.transparent).toBe(false);expect(m.material.emissive.getHex()).toBe(0);}}finally{h.dispose();}}
    });
    it('retains crab limb layout, real claw clefts and distinct feeding fans at '+quality,()=>{
      const h=make(quality);try{const ms=meshes(h),body=ms[0],d=body.geometry.userData.porcelainCrab,f=ms[1].geometry.userData.porcelainCrab;expect(d.walkingPairs).toBe(3);expect(d.reducedPair).toBe(1);expect(d.legs).toHaveLength(6);expect(d.claws).toHaveLength(2);expect(d.ranges['reduced-folded-fourth-pair'].count).toBeGreaterThan(10);expect(d.ranges['folded-abdomen-tail-fan'].count).toBeGreaterThan(20);expect(d.ranges['paired-stalked-eyes'].count).toBeGreaterThan(20);for(const side of [-1,1])expect(d.legs.filter(q=>q.side===side).map(q=>q.pair)).toEqual([0,1,2]);expect(f.fans).toHaveLength(2);expect(f.antennae).toHaveLength(2);expect(f.fans.every(q=>q.bristles===(quality==='high'?32:14))).toBe(true);body.updateMatrixWorld(true);for(const claw of d.claws){for(const [name,hit] of [['palmProbe',true],['cleftProbe',false]]){const q=claw[name],ray=new T.Raycaster(new T.Vector3(q[0]*d.scaleM,.05,q[2]*d.scaleM),new T.Vector3(0,-1,0));expect(ray.intersectObject(body).length>0).toBe(hit);}}}finally{h.dispose();}
    });
    it('keeps shell, claws, leg contacts and placement fixed during feeding at '+quality,()=>{
      const h=make(quality);try{h.root.position.set(4,-2,7);h.root.rotation.y=.72;const ms=meshes(h),b=Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]])),versions=Object.values(ms[0].geometry.attributes).map(a=>a.version),p=pose(h);for(const t of [0,1,10,1000]){h.update(.016,t,{current:{x:1,z:1,strength:1}});expect(pose(h)).toEqual(p);expect(Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]]))).toEqual(b);expect(Object.values(ms[0].geometry.attributes).map(a=>a.version)).toEqual(versions);}expect(ms[0].geometry.userData.porcelainCrab.legs.every(q=>q.contact[1]===0)).toBe(true);}finally{h.dispose();}
    });
    it('anchors mouthpart and antenna bases and bounds actual local sweeps at '+quality,()=>{
      const h=make(quality);try{const g=meshes(h)[1].geometry,d=g.userData.porcelainCrab,before=[...g.attributes.position.array];let moved=0;for(const t of [1,2.3,20,1000]){h.update(.016,t);const a=g.attributes.position.array;for(const f of [...d.fans,...d.antennae]){const roots=d.fans.includes(f)?(quality==='high'?6:3):3;for(let j=0;j<f.count;j++){const i=(f.first+j)*3;if(j<roots)expect([...a.slice(i,i+3)]).toEqual(before.slice(i,i+3));const dist=Math.hypot(a[i]-before[i],a[i+1]-before[i+1],a[i+2]-before[i+2]);expect(dist).toBeLessThanOrEqual(d.maximumDisplacementM+1e-8);expect(a[i+1]).toBeGreaterThan(0);if(dist>1e-7)moved++;}}}expect(moved).toBeGreaterThan(30);expect(g.attributes.color.version).toBe(0);expect(g.attributes.uv.version).toBe(0);}finally{h.dispose();}
    });
  }
  it('keeps contact and fan stations consistent across quality tiers and seeds reproducible',()=>{
    const a=make(),b=make(),lo=make('low'),other=make('high',{seed:8});try{expect(buffers(a)).toEqual(buffers(b));expect(buffers(a)).not.toEqual(buffers(other));const x=meshes(a)[0].geometry.userData.porcelainCrab,y=meshes(lo)[0].geometry.userData.porcelainCrab;expect(x.scaleM).toBe(y.scaleM);expect(x.legs.map(q=>[q.root,q.contact])).toEqual(y.legs.map(q=>[q.root,q.contact]));expect(meshes(a)[1].geometry.userData.porcelainCrab.fans.map(q=>q.root)).toEqual(meshes(lo)[1].geometry.userData.porcelainCrab.fans.map(q=>q.root));}finally{a.dispose();b.dispose();lo.dispose();other.dispose();}
  });
  it('uses smooth absolute-time fan motion independent of elapsed-step partitioning',()=>{
    const a=make(),b=make();try{a.update(.016,2);const g=meshes(a)[1].geometry,first=[...g.attributes.position.array];a.update(.001,2.001);expect(Math.max(...g.attributes.position.array.map((v,i)=>Math.abs(v-first[i])))).toBeLessThan(.000003);a.update(.01,4);b.update(4,4);expect(buffers(a)).toEqual(buffers(b));expect(pose(a)).toEqual(pose(b));}finally{a.dispose();b.dispose();}
  });
  it('fully freezes all appendages for reduced-motion inspection',()=>{
    const h=make('high',{reducedMotion:true});try{const before=pose(h),geometry=buffers(h);for(const t of [1,100,10000])h.update(.016,t);expect(pose(h)).toEqual(before);expect(buffers(h)).toEqual(geometry);}finally{h.dispose();}
  });
  it('shares pigment resources and releases each owned resource exactly once',()=>{
    const a=make(),b=make(),ms=meshes(a);let ng=0,nm=0,nt=0;for(const m of ms)m.geometry.addEventListener('dispose',()=>ng++);const mats=new Set(ms.map(m=>m.material));for(const m of mats)m.addEventListener('dispose',()=>nm++);const ts=new Set(ms.flatMap(m=>[m.material.map,m.material.bumpMap]));for(const t of ts)t.addEventListener('dispose',()=>nt++);expect(mats.size).toBe(1);expect(ms[0].material.map).toBe(meshes(b)[0].material.map);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([2,1,0]);b.dispose();b.dispose();expect(nt).toBe(ts.size);expect(()=>a.update(.1,2)).not.toThrow();
  });
  it('retains its spotted pigment and anatomy without derivative extensions',()=>{
    const h=make('low',{derivatives:false});try{for(const m of meshes(h)){expect(m.material.bumpMap).toBeNull();expect(m.material.map).toBeTruthy();}expect(()=>h.update(.1,2)).not.toThrow();}finally{h.dispose();}
  });
});
