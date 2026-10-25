import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,ID='varicose_phyllidia',make=(quality='high',options={})=>S.create(T,ID,{quality,seed:7,...options});
function meshes(h){const a=[];h.root.traverse(m=>{if(m.isMesh)a.push(m);});return a;}
function buffers(h){return meshes(h).map(m=>Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,[...a.array]])));}
function pose(h){const a=[];h.root.traverse(n=>a.push([...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray()]));return a;}
function bounds(ms){const b=new T.Box3(),p=new T.Vector3();for(const m of ms)for(let i=0;i<m.geometry.attributes.position.count;i++)b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position,i));return b;}
function pixel(texture,u,v){const {width,height,data}=texture.image,i=(Math.min(height-1,Math.floor(v*height))*width+Math.min(width-1,Math.floor(u*width)))*4;return [...data.slice(i,i+3)];}

describe('Varicose phyllidia specimen',()=>{
  it('registers a bottom specimen with nominal 60mm body and observation depths',()=>{
    expect(S.ids).toContain(ID);expect(S.ids.indexOf(ID)).toBeGreaterThan(S.ids.indexOf('porcelain_anemone_crab'));expect(S.info(ID)).toMatchObject({group:'invertebrate',habit:'bottom',lengthM:.06,depthM:[4,25],origin:'base',healthStates:['healthy']});expect(()=>S.createSchool(T,ID,3)).toThrow();
  });
  for(const quality of ['low','high']){
    it('builds finite, grounded anatomy within budget at '+quality,()=>{
      for(const seed of [7,23]){const h=make(quality,{seed});try{const ms=meshes(h),b=bounds(ms),d=ms[0].geometry.userData.varicosePhyllidia;expect(ms).toHaveLength(2);expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='high'?6000:1500);expect(b.min.y).toBe(0);expect(b.getSize(new T.Vector3()).x).toBeGreaterThan(.055);expect(b.getSize(new T.Vector3()).x).toBeLessThan(.063);expect(b.max.y).toBeGreaterThan(.012);expect(b.max.y).toBeLessThan(.018);expect(d).toMatchObject({nominalBodyLengthM:.06,appearance:'blue-grey-yellow-example',dorsalGillPlume:false,soleStripe:true});for(const m of ms){for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite)).toBe(true);expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true);expect(m.material.transparent).toBe(false);expect(m.material.emissive.getHex()).toBe(0);}}finally{h.dispose();}}
    });
    it('retains raised median ridge, variable yellow caps, sole stripe and lateral gills at '+quality,()=>{
      const h=make(quality);try{const ms=meshes(h),g=ms[0].geometry,d=g.userData.varicosePhyllidia,s=ms[1].geometry.userData.varicosePhyllidia;expect(d.ridges.map(q=>q.row)).toEqual([-2,-1,0,1,2]);expect(d.tubercles.length).toBeGreaterThan(40);expect(d.tubercles.filter(q=>q.row===0).every(q=>q.yellow>.9)).toBe(true);expect(d.tubercles.filter(q=>Math.abs(q.row)===2).every(q=>q.yellow<.3)).toBe(true);expect(d.rhinotubercles).toHaveLength(2);expect(d.rhinotubercles.every(q=>q.x<.352)).toBe(true);expect(d.gills.filter(q=>q.side<0)).toHaveLength(quality==='high'?20:10);expect(d.gills.filter(q=>q.side>0)).toHaveLength(quality==='high'?20:10);for(const q of d.gills){for(let i=q.first;i<q.first+q.count;i++)expect(g.attributes.position.getY(i)).toBeLessThan(.043*d.scaleM);}expect(s.rhinophores).toHaveLength(2);expect(s.rhinophores.every(q=>q.renderedLamellae===(quality==='high'?28:14))).toBe(true);const map=ms[0].material.map,dark=pixel(map,.75,.25).reduce((a,b)=>a+b,0),pale=pixel(map,.75,.35).reduce((a,b)=>a+b,0);expect(dark).toBeLessThan(pale*.4);expect(d.ranges['foot-and-striped-sole'].count).toBeGreaterThan(40);}finally{h.dispose();}
    });
    it('keeps mantle, sole, gills and world placement fixed during sensing at '+quality,()=>{
      const h=make(quality);try{h.root.position.set(4,-2,7);h.root.rotation.y=.72;const ms=meshes(h),b=Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]])),versions=Object.values(ms[0].geometry.attributes).map(a=>a.version),p=pose(h);for(const t of [0,1,10,1000]){h.update(.016,t,{current:{x:1,z:1,strength:1}});expect(pose(h)).toEqual(p);expect(Object.fromEntries(Object.entries(ms[0].geometry.attributes).map(([k,a])=>[k,[...a.array]]))).toEqual(b);expect(Object.values(ms[0].geometry.attributes).map(a=>a.version)).toEqual(versions);}}finally{h.dispose();}
    });
    it('anchors sensory bases and conservatively bounds actual displacement at '+quality,()=>{
      const h=make(quality);try{const g=meshes(h)[1].geometry,d=g.userData.varicosePhyllidia,before=[...g.attributes.position.array],box=g.boundingBox.clone(),sphere=g.boundingSphere.clone();let moved=0;for(const t of [1,2.3,20,1000]){h.update(.016,t);const a=g.attributes.position.array;for(const f of d.rhinophores)for(let j=0;j<f.count;j++){const i=(f.first+j)*3;if(j<f.rootVertices)expect([...a.slice(i,i+3)]).toEqual(before.slice(i,i+3));const dist=Math.hypot(a[i]-before[i],a[i+1]-before[i+1],a[i+2]-before[i+2]);expect(dist).toBeLessThanOrEqual(d.maximumDisplacementM+1e-8);const p=new T.Vector3(a[i],a[i+1],a[i+2]);expect(box.containsPoint(p)).toBe(true);expect(sphere.containsPoint(p)).toBe(true);if(dist>1e-7)moved++;}}expect(moved).toBeGreaterThan(30);expect(g.attributes.color.version).toBe(0);expect(g.attributes.uv.version).toBe(0);}finally{h.dispose();}
    });
  }
  it('preserves anatomical stations between tiers and deterministic variation',()=>{
    const a=make(),b=make(),lo=make('low'),other=make('high',{seed:8});try{expect(buffers(a)).toEqual(buffers(b));expect(buffers(a)).not.toEqual(buffers(other));const x=meshes(a)[0].geometry.userData.varicosePhyllidia,y=meshes(lo)[0].geometry.userData.varicosePhyllidia;expect(x.scaleM).toBe(y.scaleM);expect(x.tubercles.map(q=>[q.row,q.station,q.x,q.z,q.radius,q.height,q.yellow])).toEqual(y.tubercles.map(q=>[q.row,q.station,q.x,q.z,q.radius,q.height,q.yellow]));expect(meshes(a)[1].geometry.userData.varicosePhyllidia.rhinophores.map(q=>q.root)).toEqual(meshes(lo)[1].geometry.userData.varicosePhyllidia.rhinophores.map(q=>q.root));for(const g of y.gills)expect(x.gills.find(q=>q.side===g.side&&q.station===g.station).root).toEqual(g.root);}finally{a.dispose();b.dispose();lo.dispose();other.dispose();}
  });
  it('uses smooth absolute-time sensory movement independent of step size',()=>{
    const a=make(),b=make();try{a.update(.016,2);const g=meshes(a)[1].geometry,first=[...g.attributes.position.array];a.update(.001,2.001);expect(Math.max(...g.attributes.position.array.map((v,i)=>Math.abs(v-first[i])))).toBeLessThan(.000001);a.update(.01,4);b.update(4,4);expect(buffers(a)).toEqual(buffers(b));expect(pose(a)).toEqual(pose(b));}finally{a.dispose();b.dispose();}
  });
  it('fully freezes sensory structures for reduced-motion inspection',()=>{
    const h=make('high',{reducedMotion:true});try{const before=pose(h),geometry=buffers(h);for(const t of [1,100,10000])h.update(.016,t);expect(pose(h)).toEqual(before);expect(buffers(h)).toEqual(geometry);}finally{h.dispose();}
  });
  it('shares pigment resources and releases each owned resource exactly once',()=>{
    const a=make(),b=make(),ms=meshes(a);let ng=0,nm=0,nt=0;for(const m of ms)m.geometry.addEventListener('dispose',()=>ng++);const mats=new Set(ms.map(m=>m.material));for(const m of mats)m.addEventListener('dispose',()=>nm++);const ts=new Set(ms.flatMap(m=>[m.material.map,m.material.bumpMap]));for(const t of ts)t.addEventListener('dispose',()=>nt++);expect(mats.size).toBe(1);expect(ms[0].material.map).toBe(meshes(b)[0].material.map);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([2,1,0]);b.dispose();b.dispose();expect(nt).toBe(ts.size);expect(()=>a.update(.1,2)).not.toThrow();
  });
  it('retains pigments and anatomy without derivative extensions',()=>{
    const h=make('low',{derivatives:false});try{for(const m of meshes(h)){expect(m.material.bumpMap).toBeNull();expect(m.material.map).toBeTruthy();}expect(()=>h.update(.1,2)).not.toThrow();}finally{h.dispose();}
  });
});
