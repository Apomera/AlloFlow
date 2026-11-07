import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
function meshes(m){const out=[];m.root.traverse(o=>{if(o.isMesh)out.push(o);});return out;}
const point=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
function colour(g,hex){const c=g.attributes.color,t=new T.Color(hex).convertSRGBToLinear();return i=>Math.max(Math.abs(c.getX(i)-t.r),Math.abs(c.getY(i)-t.g),Math.abs(c.getZ(i)-t.b))<.00001;}
function headSurface(g,p,side){const ray=new T.Ray(new T.Vector3(p.x,p.y,side),new T.Vector3(0,0,-side)),hit=new T.Vector3();let nearest=Infinity,z;for(let n=0;n<g.index.count;n+=3){const ids=[0,1,2].map(j=>g.index.getX(n+j)),pts=ids.map(i=>point(g,i));if(ray.intersectTriangle(...pts,false,hit)){const d=hit.distanceTo(ray.origin);if(d<nearest){nearest=d;z=hit.z;}}}return z;}
describe('cone-snail water intake and garden-eel corneas',()=>{
 it.each(['low','high'])('keeps a genuinely open siphon with a recessed throat through local motion in %s detail',quality=>{
  const m=S.create(T,'textile_cone',{quality,seed:7});try{const mesh=m.root.getObjectByName('textile_cone-sensory-appendages'),g=mesh.geometry,d=g.userData.textileCone,a=d.appendages.find(a=>a.name==='siphon'),l=a.lumen,k=d.scale,dark=colour(g,0x251d18);expect(l).toBeTruthy();expect(Array.from(g.index.array),'former solid tube tip is not drawn').not.toContain(l.closedTipVertex);
   for(const time of [0,1.3,4]){if(time)m.update(.016,time);m.root.updateMatrixWorld(true);const lip=Array.from({length:a.sides},(_,i)=>point(g,l.lipFirst+i)).reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(1/a.sides),floor=point(g,l.floorVertex),axis=new T.Vector3(...l.axis);expect(lip.clone().sub(floor).dot(axis)/k,'floor remains behind open lip').toBeGreaterThan(.0016);const view=lip.clone().sub(floor).normalize(),origin=lip.clone().addScaledVector(view,.003*k),hits=new T.Raycaster(origin,view.clone().negate()).intersectObject(m.root,true);expect(hits.length).toBeGreaterThan(0);expect(hits[0].object).toBe(mesh);expect([hits[0].face.a,hits[0].face.b,hits[0].face.c].every(dark),'view through opening reaches dark throat first').toBe(true);expect(hits[0].distance/k).toBeGreaterThan(.0046);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('seats both garden-eel corneas on the real curved head in %s detail',quality=>{
  const m=S.create(T,'spotted_garden_eel',{quality,seed:7,reducedMotion:true});try{const [body,detail]=meshes(m),g=detail.geometry,data=g.userData.gardenEel,r=data.eyes,uv=g.attributes.uv,sides=new Set();let rims=0;for(let i=r.first;i<r.first+r.count;i++){const p=point(g,i),side=Math.sign(p.z),z=headSurface(body.geometry,p,side),lift=side*(p.z-z)/data.scale;expect(Number.isFinite(lift)).toBe(true);expect(lift).toBeGreaterThan(0);expect(lift).toBeLessThan(.00065);sides.add(side);expect(uv.getX(i)).toBeGreaterThan(1.8);if(Math.hypot(uv.getX(i)-2.5,uv.getY(i)-.5)>.52){rims++;expect(lift,'limbus rolls into head').toBeLessThan(.00008);}expect(Math.max(g.attributes.color.getX(i),g.attributes.color.getY(i),g.attributes.color.getZ(i)),'no fixed white highlight bead').toBeLessThan(.85);}
   expect([...sides].sort()).toEqual([-1,1]);expect(rims).toBe(quality==='low'?16:32);const shader={uniforms:{},vertexShader:'#include <common>',fragmentShader:'#include <common>'};detail.material.onBeforeCompile(shader,{});expect(shader.uniforms.reefFeature.value.y).toBe(1);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains the %s animal budgets and established draw counts',quality=>{
  for(const [id,draws]of [['textile_cone',3],['spotted_garden_eel',2]]){const m=S.create(T,id,{quality,seed:7});try{const parts=meshes(m);expect(parts).toHaveLength(draws);expect(parts.reduce((n,o)=>n+o.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='low'?1500:6000);for(const o of parts)for(const attr of Object.values(o.geometry.attributes))expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);}finally{m.dispose();}}
 });
 it('separates the cone respiratory siphon, burrow retreat and squid jet outlet in cited guidance',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,p=x.marineProfiles((k,f)=>f);
  expect(p.textile_cone.behavior).toMatch(/respiration.*proboscis is a separate structure.*not animated/);expect(p.textile_cone.observe).toMatch(/red-tipped siphon.*without handling/);expect(p.spotted_garden_eel.behavior).toMatch(/current bending.*attachment remains fixed.*not animated/);expect(p.spotted_garden_eel.observe).toMatch(/eyes and narrow mouth.*gill opening/);expect(p.giant_triton.observe).toMatch(/Beneath the shell, find the head, muscular foot.*proboscis.*broad opening with the textile cone’s long narrow aperture/);expect(p.bigfin_reef_squid.observe).toMatch(/funnel.*jet propulsion.*separate from the mouth/);expect(x.marineEntrySources(p.textile_cone).map(s=>s.id)).toContain('dx-aims-cone-siphon');
 });
});
