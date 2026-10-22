import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
const ZERO={left:0,right:0,leftTwist:0,rightTwist:0};
beforeAll(()=>{
 resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
 BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);
});
afterAll(()=>{
 if(!world)return;
 world.watchVisitor(null);const resources=new Set();
 world.scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));});
 resources.forEach(resource=>resource.dispose());
});
function airborne(extra={}){return Object.assign(BF.freshState(),{paused:false,clock:6,wingPhase:1,wingGlide:0,wingBrake:0,vz:-14},extra);}
function peak(flex){return Math.max(...Object.values(flex).map(Math.abs));}
function meshes(root){const parts=[];root.traverse(object=>{if(object.isMesh)parts.push(object);});return parts;}
function wingParts(root){return meshes(root).filter(mesh=>/^(monarch|butterfly)-(forewing|hindwing)-(left|right)$/.test(mesh.name));}
function shaderFor(material){const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);return shader;}
function triangles(root){return meshes(root).reduce((sum,mesh)=>sum+(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1),0);}

describe('Player butterfly elastic wing presentation',()=>{
 it('changes the membrane load through a stroke and settles into a much quieter glide',()=>{
  const powered=[],gliding=[];
  for(let phase=0;phase<Math.PI*2;phase+=Math.PI/30){
   powered.push(BF.playerWingFlex(airborne({wingPhase:phase}),false,90));
   gliding.push(BF.playerWingFlex(airborne({wingPhase:phase,gliding:true,wingGlide:1}),false,90));
  }
  expect(Math.max(...powered.map(f=>f.left))).toBeGreaterThan(.2);
  expect(Math.min(...powered.map(f=>f.left))).toBeLessThan(-.2);
  const poweredPeak=Math.max(...powered.map(peak)),glidePeak=Math.max(...gliding.map(peak));
  expect(poweredPeak).toBeGreaterThan(.3);expect(glidePeak).toBeLessThan(poweredPeak*.2);
 });

 it('uses meadow time for the flight-paused hover rather than the frozen flight clock',()=>{
  const idle=airborne({paused:true}),changed=Object.assign({},idle,{clock:900,wingPhase:5,vz:0,wingGlide:1,gliding:true});
  const times=[.2,.8,1.4],poses=times.map(time=>BF.playerWingFlex(idle,false,time));
  expect(new Set(poses.map(pose=>JSON.stringify(pose))).size).toBeGreaterThan(1);
  times.forEach((time,index)=>expect(BF.playerWingFlex(changed,false,time)).toEqual(poses[index]));
  expect(poses.some(pose=>peak(pose)>.15)).toBe(true);
 });

 it('derives repeatable paused loads without mutating state, the rendered pose or saved evidence',()=>{
  const state=airborne({observations:['milkweed']}),saved=BF.save(state),before=JSON.stringify(state),pose=Object.freeze(BF.flightPose(state,false));
  Object.freeze(state);const frozen=BF.playerWingFlex(state,false,55,pose);
  expect(BF.playerWingFlex(state,false,55)).toEqual(frozen);
  BF.playerWingFlex({...state,clock:15,wingPhase:4},false,160);
  expect(BF.playerWingFlex(state,false,55,pose)).toEqual(frozen);
  expect(JSON.stringify(state)).toBe(before);expect(BF.save(state)).toEqual(saved);
  expect(Object.keys(state)).not.toContain('playerWingFlex');
 });

 it('returns still membranes for reduced motion or landing and remains finite for malformed transient input',()=>{
  for(const clock of [0,7,90]){
   expect(BF.playerWingFlex(airborne(),true,clock)).toEqual(ZERO);
   expect(BF.playerWingFlex(airborne({landed:'milkweed'}),false,clock)).toEqual(ZERO);
  }
  for(const state of [null,undefined,{},airborne({paused:true})])for(const clock of [NaN,Infinity,-Infinity,Number.MAX_VALUE]){
   const flex=BF.playerWingFlex(state,false,clock);
   expect(Object.values(flex).every(Number.isFinite)).toBe(true);expect(peak(flex)).toBeLessThanOrEqual(.62);
  }
  for(const value of [undefined,NaN,Infinity,-Infinity,-100,100,Number.MAX_VALUE]){
   const state=airborne({vx:value,vy:value,vz:value,turnVelocity:value,wingGlide:value,wingBrake:value,wingPhase:value,clock:value,bank:value,pitch:value});
   const flex=BF.playerWingFlex(state,false,value,{leftWing:value,rightWing:value,hindLag:value});
   expect(Object.values(flex).every(Number.isFinite)).toBe(true);
   expect(Math.max(Math.abs(flex.left),Math.abs(flex.right))).toBeLessThanOrEqual(.62);
   expect(Math.max(Math.abs(flex.leftTwist),Math.abs(flex.rightTwist))).toBeLessThanOrEqual(.26);
  }
 });

 it('binds one isolated player uniform to the same four wing meshes without touching body, eyes or teaching models',()=>{
  const wings=wingParts(world.player.root),playerUniform=world.player.wingFlex;
  expect(wings).toHaveLength(4);expect(meshes(world.player.root)).toHaveLength(7);
  expect(new Set(wings.map(wing=>wing.material)).size).toBe(1);
  for(const wing of wings){
   const shader=shaderFor(wing.material);
   expect(wing.material.userData.playerWingFlex).toBe(playerUniform);
   expect(wing.material.userData.visitorWingFlex).toBeUndefined();
   expect(shader.uniforms.bfPlayerWingFlex).toBe(playerUniform);expect(shader.uniforms.bfVisitorWingFlex).toBeUndefined();
   expect(shader.vertexShader).toContain('bfPlayerWingWarp');expect(wing.frustumCulled).toBe(false);
  }
  const untouched=meshes(world.player.root).filter(mesh=>!wings.includes(mesh)).concat(
   meshes(world.feeding.root.getObjectByName('feeding-monarch')),meshes(world.scene.getObjectByName('lifecycle-adult'))
  );
  for(const mesh of untouched){
   const shader=shaderFor(mesh.material);
   expect(mesh.material.userData.playerWingFlex).toBeUndefined();expect(mesh.material.userData.visitorWingFlex).toBeUndefined();
   expect(shader.uniforms.bfPlayerWingFlex).toBeUndefined();expect(shader.uniforms.bfVisitorWingFlex).toBeUndefined();
  }
 });

 it('keeps visitor uniforms independent across watching, player updates and visitor animation',()=>{
  const patches=BF.habitats(BF.freshState()).filter(patch=>patch.nectar),state=airborne(),playerMaterials=wingParts(world.player.root).map(wing=>wing.material);
  world.animateVisitors(8.125,false,patches,false);
  const visitors=world.visitors.map(visitor=>visitor.wingFlex.value.toArray());
  world.updatePlayerWingFlex(state,false,8.125,BF.flightPose(state,false),false);
  expect(world.visitors.map(visitor=>visitor.wingFlex.value.toArray())).toEqual(visitors);
  const player=world.player.wingFlex.value.toArray();
  for(const visitor of world.visitors){
   for(const part of wingParts(visitor.root).concat(wingParts(world.speciesTemplates[visitor.speciesId]))){
    expect(part.material.userData.playerWingFlex).toBeUndefined();
    const shader=shaderFor(part.material);expect(shader.uniforms.bfPlayerWingFlex).toBeUndefined();expect(shader.uniforms.bfVisitorWingFlex).toBe(visitor.wingFlex);
   }
   world.watchVisitor(visitor);
  }
  world.animateVisitors(9,false,patches,false);world.watchVisitor(null);
  expect(world.player.wingFlex.value.toArray()).toEqual(player);
  expect(wingParts(world.player.root).map(wing=>wing.material)).toEqual(playerMaterials);
 });

 it('freezes the rendered uniform at repeated time, resets hidden views and retains geometry and mesh counts',()=>{
  const state=airborne(),parts=meshes(world.scene),resources=parts.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material}));
  const playerGeometry=new Map(meshes(world.player.root).map(mesh=>[mesh.geometry,mesh.geometry.attributes.position.array.slice()]));
  const count=triangles(world.scene),pose=BF.flightPose(state,false);
  world.updatePlayerWingFlex(state,false,18,pose,false);const paused=world.player.wingFlex.value.toArray();expect(Math.max(...paused.map(Math.abs))).toBeGreaterThan(.1);
  for(let repaint=0;repaint<8;repaint++){world.updatePlayerWingFlex(state,false,18,pose,false);expect(world.player.wingFlex.value.toArray()).toEqual(paused);}
  world.updatePlayerWingFlex(state,false,18,pose,true);expect(world.player.wingFlex.value.toArray()).toEqual([0,0,0,0]);
  world.updatePlayerWingFlex(state,false,18,pose,false);expect(world.player.wingFlex.value.toArray()).toEqual(paused);
  world.updatePlayerWingFlex(state,true,18,pose,false);expect(world.player.wingFlex.value.toArray()).toEqual([0,0,0,0]);
  world.updatePlayerWingFlex({...state,landed:'milkweed'},false,18,pose,false);expect(world.player.wingFlex.value.toArray()).toEqual([0,0,0,0]);
  expect(meshes(world.scene)).toHaveLength(parts.length);expect(triangles(world.scene)).toBe(count);
  for(const part of resources){expect(part.mesh.geometry).toBe(part.geometry);expect(part.mesh.material).toBe(part.material);}
  for(const [geometry,positions] of playerGeometry)expect(geometry.attributes.position.array).toEqual(positions);
 });
});
