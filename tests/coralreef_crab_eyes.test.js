import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies;
function pixel(map,u,v){const {width,height,data}=map.image,x=Math.min(width-1,Math.floor(u*width)),y=Math.min(height-1,Math.floor(v*height));return [...data.slice((y*width+x)*4,(y*width+x)*4+4)];}
describe('stalked crustacean compound eyes',()=>{
 it.each(['low','high'])('isolates porcelain eye pigment and wet finish from the shell at %s detail',quality=>{
  const m=S.create(T,'porcelain_anemone_crab',{quality,seed:7});try{const mesh=m.root.getObjectByName('porcelain_anemone_crab-fixed-shell-chelae-legs'),g=mesh.geometry,d=g.userData.porcelainCrab,mat=mesh.material;
   expect(d.eyes.map(e=>e.side)).toEqual([-1,1]);expect(mat.roughnessMap).toBe(mat.bumpMap);expect(mat.roughnessMap.encoding).toBe(T.LinearEncoding);
   expect(pixel(mat.map,.25,.75).slice(0,3).every(c=>c<70)).toBe(true);expect(mat.roughness*pixel(mat.roughnessMap,.25,.75)[1]/255,'cornea is glossier than the shell').toBeLessThan(.21);
   for(const uv of [[.25,.25],[.75,.25],[.75,.75],[.5,.5]])expect(pixel(mat.roughnessMap,...uv)[1],'non-eye finish stays at original roughness').toBe(255);
   for(const e of d.eyes)for(let i=e.first;i<e.first+e.count;i++){expect(g.attributes.uv.getX(i)).toBeGreaterThanOrEqual(.01999);expect(g.attributes.uv.getX(i)).toBeLessThanOrEqual(.48001);expect(g.attributes.uv.getY(i)).toBeGreaterThanOrEqual(.51999);expect(g.attributes.uv.getY(i)).toBeLessThanOrEqual(.98001);expect(g.attributes.color.getX(i)).toBe(1);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('keeps hermit stalks, antennae and hairs in a neutral guard and removes fixed glint beads at %s detail',quality=>{
  const m=S.create(T,'white_spotted_hermit_crab',{quality,seed:7});try{const mesh=m.root.getObjectByName('white_spotted_hermit_crab-eyes-antennae-setae'),g=mesh.geometry,d=g.userData.whiteSpottedHermitCrab,mat=mesh.material,eyes=new Set();expect(d.eyes).toHaveLength(2);
   expect(mat.roughnessMap).toBe(mat.bumpMap);expect(mat.roughnessMap.encoding).toBe(T.LinearEncoding);expect(pixel(mat.map,.5,.95)).toEqual([255,255,255,255]);expect(pixel(mat.roughnessMap,.5,.95)).toEqual([128,255,128,255]);
   expect(mat.roughness*pixel(mat.roughnessMap,.5,.45)[1]/255).toBeLessThan(.22);
   for(const e of d.eyes){const all=d.ranges['eye-'+e.side];expect(all.first+all.count,'no extra spherical highlight attached after the cornea').toBe(e.first+e.count);for(let i=e.first;i<e.first+e.count;i++){eyes.add(i);expect(g.attributes.uv.getY(i)).toBeLessThanOrEqual(.90001);expect(g.attributes.color.getX(i)).toBe(1);}}
   for(let i=0;i<g.attributes.position.count;i++)if(!eyes.has(i)){expect(g.attributes.uv.getX(i)).toBe(.5);expect(g.attributes.uv.getY(i)).toBeCloseTo(.95,6);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains fine corneal variation, shared budgets and static eyes through motion at %s detail',quality=>{
  for(const [id,draws,name,key]of [['porcelain_anemone_crab',2,'fixed-shell-chelae-legs','porcelainCrab'],['white_spotted_hermit_crab',3,'eyes-antennae-setae','whiteSpottedHermitCrab']]){const m=S.create(T,id,{quality,seed:7});try{const parts=[];m.root.traverse(o=>{if(o.isMesh)parts.push(o);});expect(parts).toHaveLength(draws);expect(parts.reduce((n,o)=>n+o.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='low'?1500:6000);const mesh=m.root.getObjectByName(id+'-'+name),g=mesh.geometry,eyes=g.userData[key].eyes,before=eyes.map(e=>[...g.attributes.position.array.slice(e.first*3,(e.first+e.count)*3)]),map=mesh.material.map,{width,height,data}=map.image,values=[];
   for(let y=Math.floor(height*(id==='porcelain_anemone_crab'?.55:.15));y<height*(id==='porcelain_anemone_crab'?.95:.8);y++)for(let x=Math.floor(width*(id==='porcelain_anemone_crab'?.04:.1));x<width*(id==='porcelain_anemone_crab'?.46:.9);x++)values.push(data[(y*width+x)*4]);expect(Math.max(...values)-Math.min(...values),'compound cornea retains fine surface detail').toBeGreaterThan(3);
   for(const time of [0,1.3,4]){m.update(.016,time);expect(eyes.map(e=>[...g.attributes.position.array.slice(e.first*3,(e.first+e.count)*3)])).toEqual(before);}expect([...g.attributes.uv.array].every(u=>u<1.8),'no fish iris stamp').toBe(true);
  }finally{m.dispose();}}
 });
 it('separates compound eyes, feeding fans and borrowed shelter in sourced guidance',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,p=x.marineProfiles((k,f)=>f),t=x.speciesText((k,f)=>f);
  expect(t.porcelain_anemone_crab.fact).toMatch(/bristly mouthparts.*compound eyes.*ommatidia/);expect(t.white_spotted_hermit_crab.fact).toMatch(/borrowed.*soft abdomen.*compound eye/);expect(p.porcelain_anemone_crab.observe).toMatch(/Front.*stalked eyes.*feeding fans.*not a species-identification clue/);expect(p.white_spotted_hermit_crab.observe).toMatch(/brown-green eyes.*larger left claw.*four exposed walking legs/);expect(p.white_spotted_hermit_crab.behavior).toMatch(/walking and retreat.*not animated there/);
  for(const id of ['porcelain_anemone_crab','white_spotted_hermit_crab'])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain('dx-crustacean-compound-eye');
 });
});
