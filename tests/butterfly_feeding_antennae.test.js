import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const ZERO={left:0,right:0};
let BF,world,patches;
beforeAll(()=>{
 resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
 BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);
 patches=BF.habitats(BF.freshState()).filter(patch=>patch.nectar);
});
afterAll(()=>{
 if(!world)return;
 world.watchVisitor(null);const resources=new Set();
 world.scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));});
 resources.forEach(resource=>resource.dispose());
});
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function meshes(root){const result=[];root.traverse(object=>{if(object.isMesh)result.push(object);});return result;}
function body(root){return meshes(root).find(mesh=>/^(monarch|butterfly)-body$/.test(mesh.name));}
function shaderFor(material){const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);return shader;}
function peak(value){return Math.max(...Object.values(value).map(Math.abs));}
function feedingTime(index){return 9.2+index*.9+3.8+(5.2+index*.55)*.5-(index*5.7+1.1);}
function feedingPose(index){const visitor=world.visitors[index];return BF.visitorVisitPose(BF.visitorPatch(patches,index),index,feedingTime(index),false,visitor.speciesId);}
function triangles(root){return meshes(root).reduce((sum,mesh)=>sum+(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1),0);}
// Evaluate the displacement and derivatives from the actual injected GLSL.
// Its scalar arithmetic is valid JavaScript after changing the declarations.
function shaderWarp(material){
 const shader=shaderFor(material),match=shader.vertexShader.match(/vec3 bfVisitorAntennaWarp\(vec3 p\)\{([\s\S]*?)\n\}/);
 expect(match).not.toBeNull();
 const evaluate=new Function('p','bfVisitorAntennaFlex','clamp','vec3',match[1].replace(/\bfloat\b/g,'const'));
 return {shader,evaluate:(point,left=.115,right=-.114)=>evaluate(point,{x:left,y:right},(x,a,b)=>Math.min(b,Math.max(a,x)),(...values)=>values)};
}

describe('Feeding visitors quietly sense with their antennae',()=>{
 it('has independent, small sweeps that follow the existing feeding envelope',()=>{
  const samples=[];
  for(let index=0;index<world.visitors.length;index++){
   const pose=feedingPose(index),clock=feedingTime(index);
   expect(pose.phase).toBe('feeding');expect(pose.feeding).toBe(1);
   for(let time=clock;time<clock+24;time+=.125){
    const full=BF.visitorAntennaPose(index,time,false,pose),quarter=BF.visitorAntennaPose(index,time,false,{...pose,feeding:.25});
    expect(Object.values(full).every(Number.isFinite)).toBe(true);expect(peak(full)).toBeLessThanOrEqual(.115);
    expect(quarter.left).toBe(full.left*.25);expect(quarter.right).toBe(full.right*.25);samples.push(full);
   }
  }
  expect(Math.max(...samples.map(peak))).toBeGreaterThan(.08);
  expect(samples.some(sample=>Math.abs(sample.left-sample.right)>.04)).toBe(true);
  expect(samples.some(sample=>Math.abs(sample.left+sample.right)>.04)).toBe(true);
 });

 it('uses only shared time and frozen poses, leaving the habitat and saved evidence alone',()=>{
  const state=BF.freshState(),saved=BF.save(state),snapshot=JSON.stringify(state),pose=freeze(feedingPose(0)),before=JSON.stringify(pose);
  freeze(state);const sample=BF.visitorAntennaPose(0,14.5,false,pose);
  for(let repaint=0;repaint<6;repaint++){
   BF.visitorAntennaPose(3,26+repaint,false,feedingPose(3));
   expect(BF.visitorAntennaPose(0,14.5,false,pose)).toEqual(sample);
  }
  expect(BF.visitorAntennaPose(0,15.5,false,pose)).not.toEqual(sample);
  expect(JSON.stringify(pose)).toBe(before);expect(JSON.stringify(state)).toBe(snapshot);expect(BF.save(state)).toEqual(saved);
 });

 it('stays still outside feeding or in reduced motion, with finite bounded transient input',()=>{
  const pose=feedingPose(0);
  for(const phase of ['cruising','approaching','departing'])expect(BF.visitorAntennaPose(0,14.5,false,{...pose,phase})).toEqual(ZERO);
  for(const value of [null,undefined,{}, {...pose,flower:null}, {...pose,feeding:0}, {...pose,feeding:-1}, {...pose,feeding:NaN}, {...pose,feeding:Infinity}])expect(BF.visitorAntennaPose(0,14.5,false,value)).toEqual(ZERO);
  for(const clock of [0,14.5,NaN,Infinity,-Infinity,-20,Number.MAX_VALUE]){
   expect(BF.visitorAntennaPose(0,clock,true,pose)).toEqual(ZERO);
   for(const index of [0,3,undefined,NaN,Infinity,Number.MAX_VALUE]){
    const sample=BF.visitorAntennaPose(index,clock,false,{...pose,feeding:100});
    expect(Object.values(sample).every(Number.isFinite)).toBe(true);expect(peak(sample)).toBeLessThanOrEqual(.115);
   }
  }
  for(let index=0;index<world.visitors.length;index++){
   const visitor=world.visitors[index],site=BF.visitorPatch(patches,index),dwell=5.2+index*.55,period=9.2+index*.9+3.8+dwell+3.2;
   let start=feedingTime(index)-dwell*.5;if(start<0)start+=period;
   const touching=BF.visitorVisitPose(site,index,start,false,visitor.speciesId),settling=BF.visitorVisitPose(site,index,start+.01,false,visitor.speciesId);
   expect(peak(BF.visitorAntennaPose(index,start,false,touching))).toBeLessThan(1e-20);
   expect(peak(BF.visitorAntennaPose(index,start+.01,false,settling))).toBeLessThan(.001);
  }
 });

 it('clones only visitor body materials and shares each uniform with its own detail body',()=>{
  const distinct=new Set();
  for(const visitor of world.visitors){
   const low=body(visitor.root),detail=body(world.speciesTemplates[visitor.speciesId]),uniform=visitor.antennaFlex,originalMaterial=low.material;
   expect(uniform.value).toBeInstanceOf(THREE.Vector2);distinct.add(uniform);
   for(const part of [low,detail]){
    const shader=shaderFor(part.material);
    expect(part.material.userData.visitorAntennaFlex).toBe(uniform);expect(shader.uniforms.bfVisitorAntennaFlex).toBe(uniform);
    expect(part.material.userData.visitorWingFlex).toBeUndefined();expect(shader.uniforms.bfVisitorWingFlex).toBeUndefined();
    expect(part.material.customProgramCacheKey()).toContain('-visitor-feeding-antennae-v1');expect(part.frustumCulled).toBe(false);
   }
   expect(low.material).not.toBe(detail.material);
   const protectedParts=meshes(visitor.root).filter(part=>part!==low).concat(meshes(world.speciesTemplates[visitor.speciesId]).filter(part=>part!==detail));
   for(const material of new Set(protectedParts.map(part=>part.material))){
    expect(material.userData.visitorAntennaFlex).toBeUndefined();expect(shaderFor(material).uniforms.bfVisitorAntennaFlex).toBeUndefined();
   }
   world.watchVisitor(visitor);expect(low.material).toBe(detail.material);expect(low.geometry).toBe(detail.geometry);
   expect(shaderFor(low.material).uniforms.bfVisitorAntennaFlex).toBe(uniform);
   world.watchVisitor(null);expect(low.material).toBe(originalMaterial);
  }
  expect(distinct.size).toBe(world.visitors.length);
  const teachingParts=meshes(world.player.root).concat(meshes(world.feeding.root.getObjectByName('feeding-monarch')),meshes(world.scene.getObjectByName('lifecycle-adult')));
  for(const material of new Set(teachingParts.map(part=>part.material))){
   expect(material.userData.visitorAntennaFlex).toBeUndefined();expect(shaderFor(material).uniforms.bfVisitorAntennaFlex).toBeUndefined();
  }
  // The original anatomical surface compiler still supplies the complete surface.
  const visitor=world.visitors.find(item=>item.speciesId==='monarch'),teaching=world.feeding.root.getObjectByName('feeding-monarch');
  expect(shaderFor(body(visitor.root).material).fragmentShader).toBe(shaderFor(body(teaching).material).fragmentShader);
 });

 it('bends antenna tips while the roots, head, mouth, feet and drinking tip remain exact',()=>{
  for(const visitor of world.visitors){
   const part=body(visitor.root),warp=shaderWarp(part.material),positions=part.geometry.attributes.position;
   for(const point of [
    {x:-.16,y:.19,z:-1.62},{x:.16,y:.19,z:-1.62},
    {x:0,y:.34,z:-1.43},{x:0,y:.19,z:-1.73},
    {x:0,y:-.17,z:-1.68},{x:0,y:-.96,z:-1.66},
    {x:-1.02,y:-.88,z:.51},{x:1.02,y:-.88,z:.51}
   ])expect(warp.evaluate(point).map(Math.abs)).toEqual([0,0,0]);
   for(const key of ['proboscisOrigin','middleFeet']){
    const anchors=visitor.root.userData[key];if(!anchors)continue;
    for(const values of (key==='middleFeet'?anchors:[anchors]))expect(warp.evaluate({x:values[0],y:values[1],z:values[2]}).map(Math.abs)).toEqual([0,0,0]);
   }
   let moved=0;
   for(let i=0;i<positions.count;i++){
    const point={x:positions.getX(i),y:positions.getY(i),z:positions.getZ(i)},displacement=warp.evaluate(point);
    if(point.y<=.23||point.z>=-1.73)expect(Math.abs(displacement[0])).toBe(0);
    if(Math.abs(displacement[0])>1e-8)moved++;
    expect(Math.abs(displacement[0])).toBeLessThanOrEqual(.115);
   }
   expect(moved).toBeGreaterThan(20);
   const left=warp.evaluate({x:-.69,y:.65,z:-3.04}),right=warp.evaluate({x:.64,y:.64,z:-2.95});
   expect(left[0]).toBeGreaterThan(.1);expect(right[0]).toBeLessThan(-.1);
  }
 });

 it('uses the exact shear normal slopes including the soft mask boundaries',()=>{
  const warp=shaderWarp(body(world.visitors[0].root).material),epsilon=1e-6;
  expect(warp.shader.vertexShader).toContain('objectNormal.y-bfAntennaNormal.y*objectNormal.x');
  expect(warp.shader.vertexShader).toContain('objectNormal.z-bfAntennaNormal.z*objectNormal.x');
  for(const x of [-.48,.48])for(const y of [.1,.23,.28,.36,.42,.65])for(const z of [-1.5,-1.73,-1.9,-2.4,-3.13,-3.4]){
   const point={x,y,z},actual=warp.evaluate(point);
   const dy=(warp.evaluate({...point,y:y+epsilon})[0]-warp.evaluate({...point,y:y-epsilon})[0])/(2*epsilon);
   const dz=(warp.evaluate({...point,z:z+epsilon})[0]-warp.evaluate({...point,z:z-epsilon})[0])/(2*epsilon);
   expect(actual.every(Number.isFinite)).toBe(true);expect(actual[1]).toBeCloseTo(dy,5);expect(actual[2]).toBeCloseTo(dz,5);
  }
 });

 it('freezes with shared time, clears hidden or missing habitats and changes no geometry or contacts',()=>{
  world.watchVisitor(null);
  const parts=meshes(world.scene),count=triangles(world.scene),resources=parts.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material}));
  const anatomy=new Map(world.visitors.map(visitor=>[body(visitor.root).geometry,body(visitor.root).geometry.attributes.position.array.slice()]));
  const metadata=world.visitors.map(visitor=>JSON.stringify({origin:visitor.root.userData.proboscisOrigin,feet:visitor.root.userData.middleFeet}));
  for(let index=0;index<world.visitors.length;index++){
   const clock=feedingTime(index);world.animateVisitors(clock,false,patches,false);
   const frozen=world.visitors.map(visitor=>visitor.antennaFlex.value.toArray()),contacts=world.visitors.map(visitor=>({position:visitor.root.position.toArray(),rotation:visitor.root.rotation.toArray(),tube:visitor.proboscis.morphTargetInfluences[0],flower:visitor.root.userData.flowerAnchor}));
   expect(Math.max(...frozen[index].map(Math.abs))).toBeGreaterThan(.01);
   for(let repaint=0;repaint<4;repaint++){
    world.watchVisitor(world.visitors[(index+repaint)%world.visitors.length]);world.animateVisitors(clock,false,patches,false);
    expect(world.visitors.map(visitor=>visitor.antennaFlex.value.toArray())).toEqual(frozen);
    expect(world.visitors.map(visitor=>({position:visitor.root.position.toArray(),rotation:visitor.root.rotation.toArray(),tube:visitor.proboscis.morphTargetInfluences[0],flower:visitor.root.userData.flowerAnchor}))).toEqual(contacts);
   }
   world.animateVisitors(clock,false,patches,true);expect(world.visitors.every(visitor=>visitor.antennaFlex.value.toArray().every(value=>value===0))).toBe(true);
   world.animateVisitors(clock,false,patches,false);expect(world.visitors.map(visitor=>visitor.antennaFlex.value.toArray())).toEqual(frozen);
   world.animateVisitors(clock,true,patches,false);expect(world.visitors.every(visitor=>visitor.antennaFlex.value.toArray().every(value=>value===0))).toBe(true);
   world.animateVisitors(clock,false,[],false);expect(world.visitors.every(visitor=>visitor.antennaFlex.value.toArray().every(value=>value===0))).toBe(true);
  }
  world.watchVisitor(null);
  expect(meshes(world.scene)).toHaveLength(parts.length);expect(triangles(world.scene)).toBe(count);
  for(const resource of resources){expect(resource.mesh.geometry).toBe(resource.geometry);expect(resource.mesh.material).toBe(resource.material);}
  for(const [geometry,positions] of anatomy)expect(geometry.attributes.position.array).toEqual(positions);
  expect(world.visitors.map(visitor=>JSON.stringify({origin:visitor.root.userData.proboscisOrigin,feet:visitor.root.userData.middleFeet}))).toEqual(metadata);
 });
});
