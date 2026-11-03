import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,point=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
function model(id,quality){return S.create(T,id,{quality,seed:7,reducedMotion:false});}
describe('clam mantle eyes and adult Moorish idol anatomy',()=>{
 it.each(['low','high'])('draws small dark apertures on both living mantle margins in %s detail',quality=>{
  const m=model('giant_clam',quality);try{
   const mesh=m.root.getObjectByName('giant_clam-mantle'),g=mesh.geometry,uv=g.attributes.uv,faces=Array.from({length:uv.count},()=>[]);
   const marked=i=>uv.getX(i)>.998&&uv.getY(i)>.998;
   for(let n=0;n<g.index.count;n+=3)for(let j=0;j<3;j++)faces[g.index.getX(n+j)].push(n);
   const eyes=faces.map((f,i)=>marked(i)&&f.length===(quality==='low'?4:6)?i:-1).filter(i=>i>=0);
   expect(eyes.length,'many individual apertures, rather than decorative mantle spots').toBeGreaterThanOrEqual(20);
   expect(eyes.filter(i=>point(g,i).z>0).length).toBe(eyes.length/2);
   expect(eyes.filter(i=>point(g,i).z<0).length).toBe(eyes.length/2);
   mesh.updateMatrixWorld(true);const snapshots=[];
   for(const i of eyes){
    const normal=new T.Vector3().fromBufferAttribute(g.attributes.normal,i).normalize(),p=point(g,i);
    expect(normal.y,'aperture opens above the mantle').toBeGreaterThan(.2);
    const hits=new T.Raycaster(p.clone().addScaledVector(normal,.003),normal.clone().negate()).intersectObject(mesh);
    expect(hits[0],'eye is exposed, not hidden inside the mantle').toBeTruthy();
    expect([hits[0].face.a,hits[0].face.b,hits[0].face.c].every(marked)).toBe(true);
    const below=hits.find(h=>![h.face.a,h.face.b,h.face.c].some(marked));expect(below).toBeTruthy();
    const surface=[below.face.a,below.face.b,below.face.c],bary=new T.Vector3();T.Triangle.getBarycoord(below.point,...surface.map(v=>point(g,v)),bary);
    snapshots.push({i,p,surface,bary,base:below.point.clone()});
   }
   m.update(.1,2.3,{current:{x:.08,z:-.05,strength:.7}});
   let moved=0;
   for(const s of snapshots){const surface=s.surface.map(v=>point(g,v)),now=surface[0].multiplyScalar(s.bary.x).addScaledVector(surface[1],s.bary.y).addScaledVector(surface[2],s.bary.z),delta=point(g,s.i).sub(s.p),expected=now.sub(s.base);expect(delta.distanceTo(expected),'eyes follow local mantle tissue while it flexes').toBeLessThan(.00009);moved=Math.max(moved,delta.length());}
   expect(moved,'animation check actually flexes the mantle').toBeGreaterThan(.0001);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('places a short projection above each eye in the %s-detail adult idol',quality=>{
  const m=model('moorish_idol',quality);try{
   const mesh=m.root.getObjectByName('moorish_idol-fins'),g=mesh.geometry,r=g.userData.batch.find(r=>r.part==='detail');
   expect(r).toBeTruthy();const p=g.attributes.position,body=m.root.getObjectByName('moorish_idol-body');body.geometry.computeBoundingBox();const L=S.info('moorish_idol').lengthM||.18;
   const candidates=[];for(let i=r.first;i<r.first+r.count;i++){const v=point(g,i);if(v.x>.30*L&&v.x<.35*L&&v.y>.125*L)candidates.push(v);}
   expect(candidates.length,'paired raised structures ahead of the real eyes').toBeGreaterThan(6);
   expect(candidates.some(v=>v.z>0)).toBe(true);expect(candidates.some(v=>v.z<0)).toBe(true);
   expect(Math.max(...candidates.map(v=>v.y))).toBeLessThan(.17*L);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('preserves existing draw counts and animal budgets in %s detail',quality=>{
  for(const id of ['giant_clam','moorish_idol']){const m=model(id,quality);try{let calls=0,tris=0;m.root.traverse(o=>{if(o.isMesh){calls++;tris+=o.geometry.index.count/3;}});expect(calls).toBe(id==='giant_clam'?3:2);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);}finally{m.dispose();}}
 });
 it('ties the reviewed entries to their biological scope and supporting sources',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);
  const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(t.giant_clam.fact).toMatch(/2003 study.*Tridacna maxima/);expect(p.giant_clam.observe).toMatch(/sample of the real eye count/);
  expect(t.moorish_idol.fact).toMatch(/Adults develop.*above their eyes/);expect(t.longfin_bannerfish.fact).toMatch(/beyond the corner of the anal fin/);
  expect(t.threadfin_butterflyfish.fact).toMatch(/Red Sea individuals lack/);expect(p.threadfin_butterflyfish.observe).toMatch(/real eye.*black head band/);
  for(const [id,citation]of [['giant_clam','dx-clam-eyes-study'],['moorish_idol','dx-foa-moorish_idol'],['longfin_bannerfish','dx-foa-longfin_bannerfish'],['threadfin_butterflyfish','dx-foa-threadfin_butterflyfish']])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain(citation);
 });
});
