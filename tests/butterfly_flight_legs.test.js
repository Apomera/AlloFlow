import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let BF,world,patches;
beforeAll(()=>{
 resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
 BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);
 patches=BF.habitats(BF.freshState()).filter(patch=>patch.nectar);
});
afterAll(()=>{
 if(!world)return;world.watchVisitor(null);const resources=new Set();
 world.scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));});
 resources.forEach(resource=>resource.dispose());
});
function meshes(root){const list=[];root.traverse(object=>{if(object.isMesh)list.push(object);});return list;}
function body(root){return meshes(root).find(mesh=>/^(monarch|butterfly)-body$/.test(mesh.name));}
function shaderFor(material){const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);return shader;}
function envelope(material){
 const shader=shaderFor(material),match=shader.vertexShader.match(/vec3 bfVisitorLegEnvelope\(vec3 p\)\{([\s\S]*?)\n\}/);
 expect(match).not.toBeNull();expect(match[1]).toMatch(/return bfVisitorLegTuck\*vec3\((.+)\);/);
 const code=match[1].replace(/\bfloat\b/g,'const').replace(/return bfVisitorLegTuck\*vec3\((.+)\);/,'return vec3($1).map(v=>v*bfVisitorLegTuck);');
 const run=new Function('p','bfVisitorLegTuck','clamp','abs','vec3',code);
 const forward=shader.vertexShader.match(/transformed\+=vec3\((position\.x<0\.\?.+?)\)\*bfVisitorLegEnvelope\(position\)\.x;/);
 const normal=shader.vertexShader.match(/vec3 bfLegDirection=vec3\((.+?)\);/);
 expect(forward).not.toBeNull();expect(normal).not.toBeNull();expect(normal[1]).toBe(forward[1]);
 const direction=new Function('position','vec3','return vec3('+forward[1]+');');
 return {shader,evaluate:(p,amount=1)=>run(p,amount,(x,a,b)=>Math.min(b,Math.max(a,x)),Math.abs,(...v)=>v),direction:p=>direction(p,(...values)=>new THREE.Vector3(...values))};
}
function displaced(p,warp,amount=1){return p.clone().addScaledVector(warp.direction(p),warp.evaluate(p,amount)[0]);}

describe('Visitor butterflies prepare their legs for landing',()=>{
 it('eases from a compact flight pose to the exact contact pose before touchdown',()=>{
  const fresh=BF.freshState(),saved=BF.save(fresh),phases=new Set();let changed=0;
  for(let index=0;index<world.visitors.length;index++){
   const visitor=world.visitors[index],site=BF.visitorPatch(patches,index);let last;
   for(let tick=0;tick<=7200;tick++){
    const time=tick/60,pose=Object.freeze(BF.visitorVisitPose(site,index,time,false,visitor.speciesId)),amount=BF.visitorLegTuck(pose,false);
    phases.add(pose.phase);expect(amount).toBeGreaterThanOrEqual(0);expect(amount).toBeLessThanOrEqual(1);
    if(pose.phase==='cruising')expect(amount).toBe(1);
    if(pose.perch>=.65||pose.phase==='feeding')expect(amount).toBe(0);
    if(last!==undefined){expect(Math.abs(amount-last)).toBeLessThan(.04);if(amount!==last)changed++;}last=amount;
    expect(BF.visitorLegTuck(pose,false)).toBe(amount);expect(BF.visitorLegTuck(pose,true)).toBe(0);
   }
  }
  expect(phases).toEqual(new Set(['cruising','approaching','feeding','departing']));expect(changed).toBeGreaterThan(200);
  for(const pose of [undefined,null,{}, {perch:NaN}, {perch:Infinity}])expect(BF.visitorLegTuck(pose,false)).toBe(0);
  expect(BF.save(fresh)).toEqual(saved);
 });

 it('moves only distal legs while retaining protected anatomy, mouth and feeding feet',()=>{
  for(const visitor of world.visitors){
   for(const part of [body(visitor.root),body(world.speciesTemplates[visitor.speciesId])]){
    const warp=envelope(part.material),p=part.geometry.attributes.position;let moved=0;
    for(let i=0;i<p.count;i++){
     const point=new THREE.Vector3().fromBufferAttribute(p,i),value=warp.evaluate(point),shift=displaced(point,warp).sub(point);
     expect(value.every(Number.isFinite)).toBe(true);expect(shift.length()).toBeLessThanOrEqual(Math.hypot(.14,.18)+1e-12);
     // All actual torso, head, antenna and reduced foreleg vertices lie outside this lower-lateral region.
     if(point.y>=-.42||Math.abs(point.x)<=.42)expect(value.map(Math.abs)).toEqual([0,0,0]);
     if(shift.length()>1e-8)moved++;
     expect(warp.evaluate(point,0).map(Math.abs)).toEqual([0,0,0]);
    }
    expect(moved).toBeGreaterThan(30);
    for(const values of [[0,-.17,-1.68],[0,-.96,-1.66],[-.16,.19,-1.62],[.16,.19,-1.62],[-.25,-.43,-.75],[.25,-.43,-.75],[-.32,-.19,-.42],[.32,-.19,-.42]])expect(warp.evaluate(new THREE.Vector3(...values)).map(Math.abs)).toEqual([0,0,0]);
    for(const values of [[-1.02,-.88,.51],[1.02,-.88,.51],[-.84,-.84,1.67],[.84,-.84,1.67]]){
     const point=new THREE.Vector3(...values),flight=displaced(point,warp);
     expect(flight.y).toBeGreaterThan(point.y);expect(Math.abs(flight.x)).toBeLessThan(Math.abs(point.x));expect(flight.z).toBe(point.z);
     expect(displaced(point,warp,0).toArray()).toEqual(point.toArray());
    }
   }
  }
 });

 it('transports the actual shader normal through an invertible bend',()=>{
  const warp=envelope(body(world.visitors[0].root).material),epsilon=1e-7;
  expect(warp.shader.vertexShader).toContain('objectNormal-bfLegGradient*(dot(bfLegDirection,objectNormal)/(1.+dot(bfLegDirection,bfLegGradient)))');
  for(const side of [-1,1])for(let ix=0;ix<=30;ix++)for(let iy=0;iy<=30;iy++){
   const p=new THREE.Vector3(side*(.36+ix*.017),-.36-iy*.02,.35),a=warp.evaluate(p),d=warp.direction(p),g=new THREE.Vector3(a[1],a[2],0),det=1+d.dot(g);
   expect(det).toBeGreaterThan(.20);
   const dx=(warp.evaluate(p.clone().add(new THREE.Vector3(epsilon,0,0)))[0]-warp.evaluate(p.clone().add(new THREE.Vector3(-epsilon,0,0)))[0])/(2*epsilon);
   const dy=(warp.evaluate(p.clone().add(new THREE.Vector3(0,epsilon,0)))[0]-warp.evaluate(p.clone().add(new THREE.Vector3(0,-epsilon,0)))[0])/(2*epsilon);
   expect(a[1]).toBeCloseTo(dx,5);expect(a[2]).toBeCloseTo(dy,5);
   const normal=new THREE.Vector3(.4,.6,.7).normalize(),tangent=new THREE.Vector3(-normal.y,normal.x,0).normalize();
   const corrected=normal.clone().addScaledVector(g,-d.dot(normal)/det).normalize();
   const forward=displaced(p.clone().addScaledVector(tangent,epsilon),warp).sub(displaced(p.clone().addScaledVector(tangent,-epsilon),warp)).multiplyScalar(.5/epsilon);
   expect(Math.abs(corrected.dot(forward))).toBeLessThan(2e-5);
  }
 });

 it('shares one uniform between each visitor and its detail model, freezing on repaint and clearing when hidden',()=>{
  const parts=meshes(world.scene),resources=parts.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material})),arrays=world.visitors.map(visitor=>body(visitor.root).geometry.attributes.position.array.slice());
  const seen=new Set();
  for(const visitor of world.visitors){
   const low=body(visitor.root),detail=body(world.speciesTemplates[visitor.speciesId]);seen.add(visitor.legTuck);
   for(const part of [low,detail]){
    expect(part.material.userData.visitorLegTuck).toBe(visitor.legTuck);expect(shaderFor(part.material).uniforms.bfVisitorLegTuck).toBe(visitor.legTuck);
    expect(part.material.userData.visitorAntennaFlex).toBe(visitor.antennaFlex);
   }
  }
  expect(seen.size).toBe(world.visitors.length);
  for(const time of [0,5,10,15,22,30]){
   world.animateVisitors(time,false,patches,false);const frozen=world.visitors.map(visitor=>visitor.legTuck.value);
   const contacts=world.visitors.map(visitor=>({position:visitor.root.position.toArray(),rotation:visitor.root.rotation.toArray(),tube:visitor.proboscis.morphTargetInfluences[0],flower:visitor.root.userData.flowerAnchor}));
   world.visitors.forEach((visitor,index)=>{
    const pose=BF.visitorVisitPose(BF.visitorPatch(patches,index),index,time,false,visitor.speciesId);
    expect(visitor.legTuck.value).toBe(BF.visitorLegTuck(pose,false));
    if(pose.phase==='feeding'||pose.perch>=.65)expect(visitor.legTuck.value).toBe(0);
   });
   for(let paint=0;paint<3;paint++){
    world.watchVisitor(world.visitors[paint%world.visitors.length]);world.animateVisitors(time,false,patches,false);
    expect(world.visitors.map(visitor=>visitor.legTuck.value)).toEqual(frozen);
    expect(world.visitors.map(visitor=>({position:visitor.root.position.toArray(),rotation:visitor.root.rotation.toArray(),tube:visitor.proboscis.morphTargetInfluences[0],flower:visitor.root.userData.flowerAnchor}))).toEqual(contacts);
   }
   world.animateVisitors(time,false,patches,true);expect(world.visitors.every(visitor=>visitor.legTuck.value===0)).toBe(true);
   world.animateVisitors(time,false,patches,false);expect(world.visitors.map(visitor=>visitor.legTuck.value)).toEqual(frozen);
   world.animateVisitors(time,true,patches,false);expect(world.visitors.every(visitor=>visitor.legTuck.value===0)).toBe(true);
   world.animateVisitors(time,false,[],false);expect(world.visitors.every(visitor=>visitor.legTuck.value===0)).toBe(true);
  }
  world.watchVisitor(null);expect(meshes(world.scene)).toHaveLength(parts.length);
  for(const resource of resources){expect(resource.mesh.geometry).toBe(resource.geometry);expect(resource.mesh.material).toBe(resource.material);}
  world.visitors.forEach((visitor,index)=>expect(body(visitor.root).geometry.attributes.position.array).toEqual(arrays[index]));
  for(const part of meshes(world.player.root).concat(meshes(world.feeding.root.getObjectByName('feeding-monarch')),meshes(world.scene.getObjectByName('lifecycle-adult'))))expect(shaderFor(part.material).uniforms.bfVisitorLegTuck).toBeUndefined();
 });
});
