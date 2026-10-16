import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);});
afterAll(()=>{if(!world)return;const resources=new Set();world.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));});resources.forEach(resource=>resource.dispose());});
function landed(id='bergamot',plan){
 const s=BF.freshState();if(plan)BF.applyPlan(s,plan,plan==='mixed'?'both':plan==='flowers'?'nectar':'neither');
 const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z,clock:23,energy:41});expect(BF.land(s).ok).toBe(true);return s;
}
function finite(value){if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);else if(value&&typeof value==='object')Object.values(value).forEach(finite);}

describe('Visible nectar feeding and flower-to-flower pollination',()=>{
 it('requires a landed flowering patch rather than proximity or a saved observation',()=>{
  const s=BF.freshState({observations:['bergamot']});expect(BF.feedingVisual(s)).toBeNull();
  Object.assign(s,{x:38,z:-54});expect(BF.feedingVisual(s)).toBeNull();
  expect(BF.land(s).ok).toBe(true);expect(BF.feedingVisual(s)).toMatchObject({patch:'bergamot',species:'bergamot'});
  s.landed=null;expect(BF.feedingVisual(s)).toBeNull();s.landed='unknown';expect(BF.feedingVisual(s)).toBeNull();
 });

 it.each([['lawn',undefined],['restoration','lawn']])('does not invent nectar or pollen on %s / %s',(id,plan)=>{
  expect(BF.feedingVisual(landed(id,plan))).toBeNull();
 });

 it.each([
  ['milkweed',undefined,'milkweed',34],['bergamot',undefined,'bergamot',34],
  ['restoration','flowers','bergamot',34],['restoration','mixed','bergamot',17],
 ])('uses two distinct, real flowers of one species in %s / %s',(id,plan,species,count)=>{
  const s=landed(id,plan),v=BF.feedingVisual(s);
  world.restoration.children.forEach(group=>{group.visible=group.name==='restoration-'+(plan||'lawn');});world.scene.updateMatrixWorld(true);
  expect(v).toMatchObject({patch:id,species});if(plan)expect(v.plan).toBe(plan);
  expect(v.name.length).toBeGreaterThan(0);expect(v.source.index).not.toBe(v.destination.index);
  for(const anchor of [v.source,v.destination]){
   expect(Number.isInteger(anchor.index)).toBe(true);expect(anchor.index).toBeGreaterThanOrEqual(0);expect(anchor.index).toBeLessThan(count);
   const point=new THREE.Vector3(anchor.x,anchor.y,anchor.z),matrix=new THREE.Matrix4(),position=new THREE.Vector3();let nearest=Infinity;
   const parent=id==='restoration'?world.restoration:world.scene;
   parent.traverseVisible(object=>{
    if(!object.isInstancedMesh||object.geometry.name!==(species==='milkweed'?'milkweed-flower-umbel':'bergamot-tubular-flower-head'))return;
    for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix).applyMatrix4(object.matrixWorld);nearest=Math.min(nearest,position.distanceTo(point));}
   });
   expect(nearest).toBeLessThan(.00001);
  }
  expect(Math.hypot(v.source.x-v.destination.x,v.source.z-v.destination.z)).toBeGreaterThan(.5);finite(v);
 });

 it('keeps replay, framing and phase reading separate from energy, time and field evidence',()=>{
  const s=landed('restoration','mixed'),before=JSON.stringify(s),saved=BF.save(s),v=BF.feedingVisual(s);
  for(const phase of ['sip','carry','deposit'])for(const aspect of [.45,1,1.8,3]){BF.feedingPhase(phase);BF.feedingCamera(v,phase,aspect);BF.feedingVisual(s);}
  expect(JSON.stringify(s)).toBe(before);expect(BF.save(s)).toEqual(saved);expect(s.restoration.prediction).toBe('both');expect(s.restoration.trials).toEqual([]);
  expect(s.energy).toBe(41);expect(s.clock).toBe(23);expect(s.observations).toEqual([]);
 });

 it('presents distinct explanatory steps without changing the biological generation',()=>{
  const s=landed('milkweed');BF.observe(s);BF.layEggs(s,'milkweed','complete');const before=JSON.stringify(s.lifecycle);
  const phases=['sip','carry','deposit'].map(id=>BF.feedingPhase(id));
  expect(phases.map(p=>p.id)).toEqual(['sip','carry','deposit']);expect(new Set(phases.map(p=>p.title)).size).toBe(3);
  phases.forEach(p=>{expect(p.title.length).toBeGreaterThan(0);expect(p.note.length).toBeGreaterThan(20);});
  expect(phases.map(p=>p.note).join(' ')).toMatch(/nectar/i);expect(phases.map(p=>p.note).join(' ')).toMatch(/pollen/i);
  expect(JSON.stringify(s.lifecycle)).toBe(before);
 });

 it('returns finite closeups for each phase on narrow and wide displays without moving the plant',()=>{
  for(const id of ['milkweed','bergamot']){
   const v=BF.feedingVisual(landed(id)),before=JSON.stringify(v);
   for(const phase of ['sip','carry','deposit'])for(const aspect of [.4,.75,1,1.8,3]){
    const camera=BF.feedingCamera(v,phase,aspect);expect(camera.position).toHaveLength(3);expect(camera.target).toHaveLength(3);finite(camera);
    expect(camera.position[1]).toBeGreaterThan(0);expect(camera.fov).toBeGreaterThan(0);expect(camera.fov).toBeLessThan(120);
    expect(Math.hypot(...camera.position.map((n,i)=>n-camera.target[i]))).toBeGreaterThan(.1);
   }
   expect(JSON.stringify(v)).toBe(before);
  }
 });

 it('drops the current demonstration when its restoration flowers are replanted',()=>{
  const s=landed('restoration','mixed');expect(BF.feedingVisual(s)).not.toBeNull();BF.applyPlan(s,'lawn','neither');expect(BF.feedingVisual(s)).toBeNull();
  expect(s.restoration.trials).toEqual([]);expect(BF.save(s).restoration).toMatchObject({design:'lawn',prediction:'neither'});
 });

 it('does not restore a feeding animation or landing from saved fieldwork',()=>{
  const s=landed('bergamot');BF.observe(s);const saved=BF.save(s),keys=Object.keys(saved);
  BF.feedingVisual(s);for(const phase of ['sip','carry','deposit'])BF.feedingPhase(phase);
  expect(Object.keys(BF.save(s))).toEqual(keys);expect(BF.save(s)).toEqual(saved);
  const restored=BF.freshState(saved);expect(BF.feedingVisual(restored)).toBeNull();expect(restored.observations).toContain('bergamot');
 });

 it('moves pollen to the recipient only during contact and restores the source load on replay',()=>{
  for(const species of ['milkweed','bergamot']){
   const v=BF.feedingVisual(landed(species)),model=world.feeding;
   model.sync(v,'sip',0,false);expect(model.root.getObjectByName('feeding-pollen-carried').visible).toBe(false);expect(model.root.getObjectByName('feeding-pollen-deposited').visible).toBe(false);
   model.sync(v,'carry',1,false);expect(model.root.getObjectByName('feeding-pollen-carried').visible).toBe(true);expect(model.root.getObjectByName('feeding-pollen-deposited').visible).toBe(false);
   model.sync(v,'deposit',1,false);const receiver=model.root.getObjectByName('feeding-pollen-deposited');expect(receiver.visible).toBe(true);
   const destination=new THREE.Vector3(v.destination.x,v.destination.y+.8,v.destination.z+.37);world.scene.updateMatrixWorld(true);
   expect(receiver.getWorldPosition(new THREE.Vector3()).distanceTo(destination)).toBeLessThan(.2);
   model.sync(v,'sip',1,true);expect(receiver.visible).toBe(false);expect(model.root.getObjectByName('feeding-pollen-carried').visible).toBe(true);
  }
  world.feeding.sync(null,'sip',1,true);expect(world.feeding.root.visible).toBe(false);
 });
});
