import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,make=(id,quality)=>S.create(T,id,{quality,seed:7,reducedMotion:true}),part=(m,n)=>m.root.getObjectByName(m.root.userData.speciesId+'-'+n);
describe('anemone oral/basal anatomy and sea-fan relief',()=>{
 it.each(['low','high'])('exposes an elongated central mouth and closed basal disc in %s detail',quality=>{
  const m=make('magnificent_anemone',quality);try{const mesh=part(m,'column'),g=mesh.geometry,p=g.attributes.position,c=g.attributes.color,mouth=new T.Color(0x39252a).convertSRGBToLinear();mesh.updateMatrixWorld(true);
   const top=new T.Raycaster(new T.Vector3(0,.3,0),new T.Vector3(0,-1,0)).intersectObject(mesh)[0];expect(top).toBeTruthy();expect(top.point.y).toBeGreaterThan(.133);expect([top.face.a,top.face.b,top.face.c].some(i=>Math.abs(c.getX(i)-mouth.r)<.00001&&Math.abs(c.getY(i)-mouth.g)<.00001)).toBe(true);
   const dark=[];for(let i=0;i<p.count;i++)if(Math.abs(c.getX(i)-mouth.r)<.00001&&Math.abs(c.getY(i)-mouth.g)<.00001)dark.push(new T.Vector3().fromBufferAttribute(p,i));const b=new T.Box3().setFromPoints(dark),size=b.getSize(new T.Vector3());expect(size.x,'narrow slit rather than a circular spot').toBeGreaterThan(size.z*4);
   const bottom=new T.Raycaster(new T.Vector3(0,-.05,0),new T.Vector3(0,1,0)).intersectObject(mesh)[0];expect(bottom).toBeTruthy();expect(bottom.point.y).toBeLessThan(0);expect(bottom.face.normal.y).toBeLessThan(-.9);
   const map=mesh.material.bumpMap;expect(map).toBeTruthy();expect(mesh.material.roughnessMap).toBe(map);expect(new Set(Array.from(map.image.data).filter((_,i)=>i%4===0)).size).toBeGreaterThan(10);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('gives sea-fan branches relief while retaining open windows in %s detail',quality=>{
  const m=make('sea_fan',quality);try{const mat=part(m,'fan').material,map=mat.map,branch=part(m,'trunk').material,bump=branch.bumpMap;expect(bump).toBeTruthy();expect(branch.roughnessMap).toBe(bump);expect(mat.alphaTest).toBe(.42);const rgba=map.image.data,heights=Array.from(bump.image.data).filter((_,i)=>i%4===0);let transparent=0,solid=0;
   for(let i=0;i<rgba.length;i+=4){if(rgba[i+3]<107)transparent++;if(rgba[i+3]>245)solid++;}
   expect(transparent).toBeGreaterThan(rgba.length/12);expect(solid).toBeGreaterThan(100);expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(10);expect(map.mipmaps.length).toBeGreaterThan(5);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains two draws and the established %s-detail budgets',quality=>{
  for(const id of ['magnificent_anemone','sea_fan']){const m=make(id,quality);try{let calls=0,tris=0;m.root.traverse(o=>{if(o.isMesh){calls++;tris+=o.geometry.index.count/3*(o.isInstancedMesh?o.count:1);}});expect(calls).toBe(2);expect(tris).toBeLessThanOrEqual(id==='magnificent_anemone'?(quality==='low'?2500:8300):(quality==='low'?1500:6000));}finally{m.dispose();}}
 });
 it('keeps animal anatomy, native range and triton evidence appropriately scoped',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(p.magnificent_anemone.behavior).toMatch(/no separate anus/);expect(p.sea_fan.behavior).toMatch(/eight feather-like tentacles/);expect(p.sea_fan.observe).toMatch(/does not resolve individual tentacles/);
  expect(t.lionfish.fact).toMatch(/native to the Indo-Pacific.*introduced in the western Atlantic/);expect(p.lionfish.behavior).toMatch(/not an exclusively nocturnal/);expect(t.giant_triton.fact).toMatch(/not proof.*control.*outbreak/);
  for(const [id,citation]of [['magnificent_anemone','dx-anthozoan-opening'],['sea_fan','dx-gorgonian-polyp-anatomy'],['lionfish','dx-flm-lionfish-anatomy'],['giant_triton','dx-aims-giant_triton']])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain(citation);
 });
});
