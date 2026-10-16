import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);});
afterAll(()=>{
 if(!world)return;const resources=new Set();world.scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));});resources.forEach(resource=>resource.dispose());
});
function landed(id='bergamot'){
 const s=BF.freshState(),p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z,clock:37,energy:43});expect(BF.land(s).ok).toBe(true);return s;
}
function finite(value){if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);else if(value&&typeof value==='object')Object.values(value).forEach(finite);}
function load(species){
 const root=world.feeding.root,carried=root.getObjectByName('feeding-pollen-carried'),received=root.getObjectByName('feeding-pollen-deposited');
 const count=(name,visible)=>{if(!visible)return 0;const o=root.getObjectByName(name+(species==='milkweed'?'-pollinia':'-grains'));return species==='milkweed'?o.children.filter(child=>child.visible&&(name.includes('deposited')?child.isMesh:child.isGroup)).length:o.children.filter(child=>child.visible).length;};
 return {carrying:count('feeding-pollen-carried',carried.visible),received:count('feeding-pollen-deposited',received.visible)};
}

describe('Feeding observation playback and contact comparison',()=>{
 it('normalizes hostile phases and progress without an invalid coordinate or an out-of-range pose',()=>{
  for(const phase of ['sip','carry','deposit','unknown',null])for(const progress of [undefined,NaN,Infinity,-Infinity,-12,0,.4,1,9]){
   const moment=BF.feedingMoment(phase,progress,false);finite(moment);expect(['sip','carry','deposit']).toContain(moment.phase);
   for(const key of ['progress','travel','pickup','deposit']){expect(moment[key]).toBeGreaterThanOrEqual(0);expect(moment[key]).toBeLessThanOrEqual(1);}
   if(!['sip','carry','deposit'].includes(phase))expect(moment.phase).toBe('sip');
  }
  expect(BF.feedingMoment('carry',-5,false).progress).toBe(0);expect(BF.feedingMoment('carry',5,false).progress).toBe(1);
 });

 it('keeps manually chosen moments available in reduced motion for all three steps',()=>{
  for(const phase of ['sip','carry','deposit'])for(const progress of [0,.15,.5,.85,1]){
   const normal=BF.feedingMoment(phase,progress,false),reduced=BF.feedingMoment(phase,progress,true);
   expect(reduced).toEqual(normal);expect(reduced.progress).toBe(progress);
   const v=BF.feedingVisual(landed());world.feeding.sync(v,phase,progress,true,true);expect(world.feeding.root.userData.progress).toBe(progress);
  }
 });

 it('distinguishes carrying pollen, receptive contact, and a flower visit without transfer',()=>{
  for(const species of ['milkweed','bergamot']){
   const v=BF.feedingVisual(landed(species));
   expect(BF.feedingOutcome(v,'sip',0,true)).toMatchObject({carrying:false,received:false});
   expect(BF.feedingOutcome(v,'sip',1,true)).toMatchObject({carrying:true,received:false});
   expect(BF.feedingOutcome(v,'carry',1,true)).toMatchObject({carrying:true,received:false});
   expect(BF.feedingOutcome(v,'deposit',0,true)).toMatchObject({carrying:true,received:false});
   expect(BF.feedingOutcome(v,'deposit',.5,true)).toMatchObject({carrying:true,received:false,transferring:true});
   expect(BF.feedingOutcome(v,'deposit',1,true)).toMatchObject({carrying:true,received:true});
   const miss=BF.feedingOutcome(v,'deposit',1,false);expect(miss).toMatchObject({carrying:true,received:false,transferring:false});expect(miss.summary).toMatch(/no pollen|none|miss|not.*transfer/i);
   for(const result of [miss,BF.feedingOutcome(v,'deposit',1,true)])for(const key of ['carriedLabel','receivedLabel','summary'])expect(result[key].length).toBeGreaterThan(0);
  }
 });

 it.each([['milkweed',2,1],['bergamot',9,3]])('conserves the modeled %s pollen load and retains it all when contact is missed',(species,total,transfer)=>{
  const v=BF.feedingVisual(landed(species));world.feeding.sync(v,'sip',0,false,true);expect(load(species)).toEqual({carrying:0,received:0});
  world.feeding.sync(v,'carry',1,false,true);expect(load(species)).toEqual({carrying:total,received:0});
  for(const contact of [true,false,true,false]){
   world.feeding.sync(v,'deposit',1,false,contact);expect(world.feeding.root.userData.contact).toBe(contact);
   const actual=load(species);expect(actual).toEqual(contact?{carrying:total-transfer,received:transfer}:{carrying:total,received:0});expect(actual.carrying+actual.received).toBe(total);
  }
  // Rewinding a successful contact brings back the same load, rather than
  // duplicating a newly allocated set of particles on the next playthrough.
  world.feeding.sync(v,'deposit',1,false,true);world.feeding.sync(v,'deposit',0,false,true);expect(load(species)).toEqual({carrying:total,received:0});
  world.feeding.sync(v,'deposit',1,false);expect(load(species)).toEqual({carrying:total-transfer,received:transfer});
 });

 it('scrubs reversibly through the same proboscis geometry and butterfly position',()=>{
  const v=BF.feedingVisual(landed()),root=world.feeding.root,tube=root.getObjectByName('feeding-proboscis'),insect=root.getObjectByName('feeding-monarch'),geometry=tube.geometry;
  world.feeding.sync(v,'sip',.18,false,true);const coiled=Array.from(geometry.attributes.position.array);
  world.feeding.sync(v,'sip',1,false,true);expect(Array.from(geometry.attributes.position.array)).not.toEqual(coiled);
  world.feeding.sync(v,'sip',.18,true,true);expect(Array.from(geometry.attributes.position.array)).toEqual(coiled);expect(tube.geometry).toBe(geometry);
  world.feeding.sync(v,'carry',.33,false,true);const position=insect.position.toArray();world.feeding.sync(v,'carry',1,false,true);expect(insect.position.toArray()).not.toEqual(position);
  world.feeding.sync(v,'carry',.33,true,true);expect(insect.position.toArray()).toEqual(position);finite(Array.from(geometry.attributes.position.array));
 });

 it('frames the selected detail at the current moment on mobile and desktop without moving the flowers',()=>{
  for(const species of ['milkweed','bergamot']){
   const v=BF.feedingVisual(landed(species)),before=JSON.stringify(v);
   for(const phase of ['sip','carry','deposit'])for(const focus of ['whole','tube','pollen'])for(const aspect of [.45,1,1.8])for(const progress of [0,.5,1]){
    const camera=BF.feedingCamera(v,phase,aspect,focus,progress,false,true);finite(camera);expect(camera.position).toHaveLength(3);expect(camera.target).toHaveLength(3);
    expect(camera.fov).toBeGreaterThan(0);expect(camera.fov).toBeLessThan(120);expect(Math.hypot(...camera.position.map((n,i)=>n-camera.target[i]))).toBeGreaterThan(.1);
   }
   const whole=BF.feedingCamera(v,'sip',1,'whole',1,false,true),tube=BF.feedingCamera(v,'sip',1,'tube',1,false,true),pollen=BF.feedingCamera(v,'sip',1,'pollen',1,false,true);
   expect(tube.position).not.toEqual(whole.position);expect(pollen.position).not.toEqual(whole.position);expect(tube.target).not.toEqual(pollen.target);
   for(const focus of ['tube','pollen'])expect(BF.feedingCamera(v,'carry',1,focus,0,false,true).target).not.toEqual(BF.feedingCamera(v,'carry',1,focus,1,false,true).target);
   expect(JSON.stringify(v)).toBe(before);
  }
 });

 it('keeps scrubbing, camera choices and comparison outcomes outside stored evidence and flight state',()=>{
  const s=landed('milkweed');BF.observe(s);BF.layEggs(s,'milkweed','complete');s.energy=43;const before=JSON.stringify(s),saved=BF.save(s),v=BF.feedingVisual(s);
  for(const phase of ['sip','carry','deposit'])for(const progress of [0,.2,.5,1])for(const contact of [true,false]){
   BF.feedingMoment(phase,progress,true);BF.feedingOutcome(v,phase,progress,contact);BF.feedingCamera(v,phase,.5,'pollen',progress,true,contact);world.feeding.sync(v,phase,progress,true,contact);
  }
  expect(JSON.stringify(s)).toBe(before);expect(BF.save(s)).toEqual(saved);expect(s.energy).toBe(43);expect(s.clock).toBe(37);expect(s.lifecycle.broods).toEqual([]);
 });
});
