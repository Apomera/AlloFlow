import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
const part=(m,n)=>m.root.getObjectByName(m.root.userData.speciesId+'-'+n),point=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
function api(){const w={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(w);return w.__RR_TEST_EXPORTS__.coralReef;}
describe('chromodoris creeping foot and octopus oral anatomy',()=>{
 it.each(['low','high'])('shows a narrow projecting foot that stays planted in %s detail',quality=>{
  const m=S.create(T,'nudibranch',{quality,seed:7});try{const mesh=part(m,'gills'),g=mesh.geometry,r=g.userData.batch.find(r=>r.part==='foot');expect(r).toBeTruthy();const foot=Array.from({length:r.count},(_,i)=>point(g,r.first+i)),box=new T.Box3().setFromPoints(foot);part(m,'body').geometry.computeBoundingBox();const mantle=part(m,'body').geometry.boundingBox;
   expect(box.min.x,'tail projects behind the mantle').toBeLessThan(mantle.min.x-.001);expect(box.max.z-box.min.z,'foot narrower than mantle skirt').toBeLessThan((mantle.max.z-mantle.min.z)*.8);expect(box.min.y).toBeGreaterThan(-.00005);
   let yellow=0;const c=g.attributes.color;for(let i=r.first;i<r.first+r.count;i++)if(c.getX(i)>.6&&c.getY(i)>.25&&c.getY(i)>c.getZ(i)*2)yellow++;expect(yellow,'warm foot margin remains distinct from the pale sole').toBeGreaterThan(5);
   const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);m.update(.1,3);const rig=shader.uniforms.reefRig.value,offset=(r.slot-1)*20;expect(Array.from(rig.slice(offset,offset+12)),'foot retains an identity transform while sensory clubs sway').toEqual([1,0,0,0,0,1,0,0,0,0,1,0]);
   const skin=part(m,'body').material.bumpMap;expect(new Set(Array.from(skin.image.data).filter((_,i)=>i%4===0)).size).toBeGreaterThan(3);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('shows one recessed central resting mouth below the arms in %s detail',quality=>{
  const m=S.create(T,'day_octopus',{quality,seed:7});try{const mesh=part(m,'suckers'),g=mesh.geometry,c=g.attributes.color,dark=new T.Color(0x211916).convertSRGBToLinear(),vertices=[];for(let i=0;i<c.count;i++)if(Math.max(Math.abs(c.getX(i)-dark.r),Math.abs(c.getY(i)-dark.g),Math.abs(c.getZ(i)-dark.b))<.00001)vertices.push(point(g,i));expect(vertices.length).toBeGreaterThan(5);const b=new T.Box3().setFromPoints(vertices),center=b.getCenter(new T.Vector3());
   for(const t of [0,3.1]){m.update(.1,t);m.root.updateMatrixWorld(true);const hit=new T.Raycaster(new T.Vector3(center.x,-.2,0),new T.Vector3(0,1,0)).intersectObject(m.root,true)[0];expect(hit).toBeTruthy();expect(hit.object===mesh,'the visible central aperture belongs to the oral batch').toBe(true);expect(hit.face.normal.y).toBeLessThan(-.5);expect([hit.face.a,hit.face.b,hit.face.c].some(i=>Math.abs(c.getX(i)-dark.r)<.00001)).toBe(true);expect(hit.point.y).toBeLessThan(.026);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains two draws and the %s animal triangle limit',quality=>{
  for(const id of ['nudibranch','day_octopus']){const m=S.create(T,id,{quality,seed:7,reducedMotion:true});try{let draws=0,tris=0;m.root.traverse(o=>{if(o.isMesh){draws++;tris+=o.geometry.index.count/3;}});expect(draws).toBe(2);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);}finally{m.dispose();}}
 });
 it('keeps the four revised entries tied to specific anatomical and study contexts',()=>{
  const x=api(),p=x.marineProfiles((k,f)=>f),t=x.speciesText((k,f)=>f);expect(p.nudibranch.behavior).toMatch(/muscular foot.*rhinophores.*chemicals/);expect(p.day_octopus.behavior).toMatch(/funnel.*separate from the feeding opening/);expect(p.day_octopus.observe).toMatch(/beak is kept inside/);expect(t.peacock_grouper.fact).toMatch(/1991 Gulf of Aqaba study/);expect(t.peacock_grouper.fact).toMatch(/not a fixed territory/);expect(t.yellow_boxfish.fact).toMatch(/represents a juvenile/);
  for(const [id,source]of [['nudibranch','dx-slug-foot-pattern'],['day_octopus','dx-octopus-oral-anatomy'],['peacock_grouper','dx-grouper-territory-study'],['yellow_boxfish','dx-worms-boxfish-name']])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain(source);
 });
 it('uses the accepted boxfish spelling and preserves historical-name search in both modes',()=>{
  const x=api(),meta=x.SPECIES_META.find(m=>m.id==='yellow_boxfish'),tx={name:'Yellow boxfish'};expect(meta.scientific).toBe('Ostracion cubicum');for(const mode of ['name','description'])for(const name of ['Ostracion cubicum','Ostracion cubicus'])expect(x.marineGuideSearch(name,tx,meta,{},mode)).toBe(true);
  expect(x.marineGuideSearchEvidence('Ostracion cubicus',tx,meta,{})).toEqual([]);expect(x.marineGuideSearch('unrelated fish',tx,meta,{},'name')).toBe(false);expect(x.marineGuideSearch('Ostracion cubicum',tx,{...meta,scientificAliases:[null,4,{}]}, {},'name')).toBe(true);
 });
});
