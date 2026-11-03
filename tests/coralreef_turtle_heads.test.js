import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
function part(m,name){let found;m.root.traverse(o=>{if(o.isMesh)for(const r of o.geometry.userData.batch||[])if(r.part===name&&!found)found={mesh:o,range:r};});return found;}
function roofOrSide(head,p,axis,side=1){const origin=p.clone();origin.setComponent(axis,side);const dir=new T.Vector3().setComponent(axis,-side),ray=new T.Ray(origin,dir),hit=new T.Vector3(),g=head.geometry,a=g.attributes.position;let dist=Infinity,value;
 for(let n=0;n<g.index.count;n+=3){const pts=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,g.index.getX(n+j)));if(ray.intersectTriangle(...pts,false,hit)){const d=hit.distanceTo(origin);if(d<dist){dist=d;value=hit.getComponent(axis);}}}return value;}
function local(g,i){const p=g.attributes.reefPart;return new T.Vector3(p.getX(i),p.getY(i),p.getZ(i));}
function rig(mat){const shader={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <emissivemap_fragment>'};mat.onBeforeCompile(shader,{});return shader.uniforms.reefRig.value;}
describe('turtle surface details and encyclopedia identification',()=>{
 it.each(['low','high'])('seats both corneas on the real head in %s detail',quality=>{
  for(const id of ['green_turtle','hawksbill_turtle']){const m=S.create(T,id,{quality,seed:7});try{const head=m.root.getObjectByName(id+'-head'),unit=head.geometry.boundingBox.max.x,{mesh,range}=part(m,'eyes'),g=mesh.geometry,uv=g.attributes.uv,sides=new Set();let rims=0;
   for(let i=range.first;i<range.first+range.count;i++){const p=local(g,i),side=Math.sign(p.z),surface=roofOrSide(head,p,2,side),lift=(side*(p.z-surface))/unit;expect(Number.isFinite(lift)).toBe(true);expect(lift).toBeGreaterThan(0);expect(lift).toBeLessThan(.025);sides.add(side);expect(uv.getX(i)).toBeGreaterThan(1.8);if(Math.hypot(uv.getX(i)-2.5,uv.getY(i)-.5)>.52){expect(lift,'limbus rolls back into head').toBeLessThan(.005);rims++;}}
   expect([...sides].sort()).toEqual([-1,1]);expect(rims).toBe(2*(quality==='high'?24:8));
   const r=rig(mesh.material);expect(r[(range.slot-1)*20+19],'existing wet-eye shader selected only for eye part').toBe(1);
  }finally{m.dispose();}}
 });
 it.each(['low','high'])('keeps nasal depressions flush with both snout surfaces in %s detail',quality=>{
  for(const id of ['green_turtle','hawksbill_turtle']){const m=S.create(T,id,{quality,seed:7});try{const head=m.root.getObjectByName(id+'-head'),unit=head.geometry.boundingBox.max.x,{mesh,range}=part(m,'nostrils'),g=mesh.geometry,n=quality==='high'?12:8,centres=[];
   expect(range.count).toBe(2*(1+2*n));for(let i=range.first;i<range.first+range.count;i++){const p=local(g,i),surface=roofOrSide(head,p,1),lift=(p.y-surface)/unit;expect(Number.isFinite(lift)).toBe(true);expect(p.x/unit).toBeGreaterThan(.93);expect(lift,'no hovering nasal blobs or buried features').toBeGreaterThan(.0004);expect(lift).toBeLessThan(.0027);if((i-range.first)%(1+2*n)===0){expect(lift,'dark floor sits below the surrounding rim').toBeCloseTo(.0006,4);centres.push(Math.sign(p.z));}else if((i-range.first)%(1+2*n)>n)expect(lift).toBeCloseTo(.0024,4);}
   expect(centres.sort()).toEqual([-1,1]);expect(rig(mesh.material)[(range.slot-1)*20+19],'nasal skin stays matte').toBe(0);
  }finally{m.dispose();}}
 });
 it.each(['low','high'])('moves both details with the head within five draws and the %s budget',quality=>{
  for(const id of ['green_turtle','hawksbill_turtle']){const m=S.create(T,id,{quality,seed:7});try{let draws=0,tris=0;m.root.traverse(o=>{if(o.isMesh){draws++;tris+=o.geometry.index.count/3;}});expect(draws).toBe(5);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);
   const head=m.root.getObjectByName(id+'-head'),maps=head.material.map.image;expect(maps.width).toBe(quality==='low'?256:512);expect(maps.height).toBe(quality==='low'?128:256);
   const eyes=part(m,'eyes'),nose=part(m,'nostrils');expect(nose.mesh).toBe(eyes.mesh);for(const time of [0,2.4]){m.update(.1,time);const r=rig(eyes.mesh.material),a=(eyes.range.slot-1)*20,b=(nose.range.slot-1)*20;expect(Array.from(r.slice(a,a+12))).toEqual(Array.from(r.slice(b,b+12)));expect(Array.from(r)).toHaveLength(80);expect(Math.max(eyes.range.slot,nose.range.slot)).toBeLessThanOrEqual(4);}
  }finally{m.dispose();}}
 });
 it('explains scale pairs, variable diet, female egg laying and male brooding with entry-linked sources',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(t.green_turtle.marks[0]).toMatch(/One pair.*prefrontal/);expect(t.hawksbill_turtle.marks[1]).toMatch(/Two pairs.*prefrontal/);expect(p.green_turtle.observe).toMatch(/Choose Above.*one pair.*path to the surface/);expect(p.hawksbill_turtle.observe).toMatch(/two pairs.*serrated.*features together/);expect(p.hawksbill_turtle.diet).toMatch(/varies by place.*Hawaiian/);expect(t.banded_sea_krait.fact).toMatch(/Females lay eggs.*on land/);expect(t.spotted_seahorse.fact).toMatch(/Adult males.*brood pouch.*not animated/);for(const id of ['green_turtle','hawksbill_turtle'])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain('dx-widecast-head-scales');expect(x.marineEntrySources(p.spotted_seahorse).map(s=>s.id)).toContain('dx-cmfri-spotted-seahorse');
 });
});
