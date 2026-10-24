import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);});
afterAll(()=>{const resources=new Set();world.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));});resources.forEach(r=>r.dispose());});
function generation(id='milkweed',plan){
 const s=BF.freshState();if(plan)BF.applyPlan(s,plan,'both');const p=BF.habitats(s).find(p=>p.id===id);
 Object.assign(s,{x:p.x,z:p.z});expect(BF.land(s).ok).toBe(true);expect(BF.observe(s).ok).toBe(true);expect(BF.layEggs(s,id,'complete').ok).toBe(true);return s;
}
function finite(value){if(typeof value==='number')expect(Number.isFinite(value)).toBe(true);else if(value&&typeof value==='object')Object.values(value).forEach(finite);}
function point(value){return new THREE.Vector3(value.x,value.y,value.z);}
function expectPoint(actual,expected){expect(point(actual).distanceTo(expected)).toBeLessThan(1e-9);}
function inspectAll(s,fn){for(const stage of ['egg','caterpillar','chrysalis','adult']){const v=BF.lifecycleVisual(s);expect(v.stage).toBe(stage);fn(v);if(stage!=='adult')expect(BF.advanceStage(s).ok).toBe(true);}}

describe('Lifecycle inspection and manually selected moments',()=>{
 it('normalizes focus and hostile progress without losing reduced-motion scrubbing',()=>{
  expect(BF.lifecycleInspection(null,'detail',.5,true)).toBeNull();
  inspectAll(generation(),v=>{
   for(const p of [undefined,NaN,Infinity,-Infinity,-3,0,.2,.5,.9,1,3]){
    const pose=BF.lifecyclePose(v,p,true);finite(pose);expect(pose).toEqual(BF.lifecyclePose(v,p,false));
    expect(pose.growth).toBeGreaterThanOrEqual(.32);expect(pose.growth).toBeLessThanOrEqual(1);
    for(const focus of [undefined,null,'unknown','context','specimen','detail']){
     const inspection=BF.lifecycleInspection(v,focus,p,true);finite(inspection);
     expect(inspection.focus).toBe(['specimen','detail'].includes(focus)?focus:'context');
     expect(inspection.label).toBeTruthy();expect(inspection.detailLabel).toContain('close-up');
    }
   }
   expect(BF.lifecyclePose(v,-2,true)).toEqual(BF.lifecyclePose(v,0,true));expect(BF.lifecyclePose(v,2,true)).toEqual(BF.lifecyclePose(v,1,true));
  });
 });

 it('preserves the original context camera when its new arguments are omitted',()=>{
  inspectAll(generation(),v=>{
   const egg=v.stage==='egg'&&v.support==='leaf',offset=egg?[1.3,-.7,1.65]:v.stage==='adult'?[2.2,-.45,3]:v.stage==='chrysalis'?[1.4,-.25,2.15]:[1.8,1.2,2.4];
   const group=new THREE.Object3D();group.position.set(v.anchor.x,v.anchor.y,v.anchor.z);group.rotation.set(0,v.anchor.yaw,v.anchor.tilt);group.updateMatrixWorld(true);
   const origin=group.localToWorld(new THREE.Vector3(...offset)),camera=BF.lifecycleCamera(v);
   camera.position.forEach((n,i)=>expect(n).toBeCloseTo(i===1?Math.max(.24,origin.y):origin.toArray()[i],12));
   expect(camera.target).toEqual([v.point.x,v.point.y,v.point.z]);expect(camera.fov).toBe(egg?38:42);
   expect(BF.lifecycleCamera(v,1,'context',.4,true)).toEqual(camera);
  });
 });

 it.each([['milkweed',undefined],['restoration','mixed']])('tracks actual transformed anatomy on %s / %s through each stage',(id,plan)=>{
  inspectAll(generation(id,plan),v=>{
   for(const progress of [0,.25,.6,1]){
    world.syncLifecycle(v,progress,true);world.lifecycle.updateMatrixWorld(true);
    const inspection=BF.lifecycleInspection(v,'detail',progress,true);let expected;
    if(v.stage==='egg')expected=world.lifecycle.getObjectByName('lifecycle-egg').localToWorld(new THREE.Vector3(0,.13,.09));
    else if(v.stage==='caterpillar')expected=world.lifecycle.getObjectByName('lifecycle-caterpillar').localToWorld(new THREE.Vector3(.665,.113,-.023));
    else if(v.stage==='chrysalis')expected=world.lifecycle.getObjectByName('lifecycle-chrysalis').localToWorld(new THREE.Vector3(0,-.04,0));
    else{
     const forewing=world.lifecycle.getObjectByName('lifecycle-adult').getObjectByName('monarch-forewing-right');
     const x=3.7,z=-2.92,y=BF.monarchWingHeight(x,z,true)+.03;
     expected=forewing.localToWorld(new THREE.Vector3(x,y,z));
     // The chosen point is on the vein geometry, not an empty space beside a wing.
     const positions=forewing.geometry.attributes.position;let nearest=Infinity;
     for(let i=0;i<positions.count;i++){const sample=new THREE.Vector3().fromBufferAttribute(positions,i);nearest=Math.min(nearest,sample.distanceTo(new THREE.Vector3(x,y,z)));}
     expect(nearest).toBeLessThan(.06);
    }
    expectPoint(inspection.point,expected);
   }
  });
 });

 it('centers every inspected feature for portrait and landscape cameras without going underground',()=>{
  inspectAll(generation(),v=>{
   for(const progress of [0,.5,1])for(const focus of ['context','specimen','detail'])for(const aspect of [NaN,0,-2,.25,.48,.85,1,1.9,4,Infinity]){
    const camera=BF.lifecycleCamera(v,aspect,focus,progress,true),inspection=BF.lifecycleInspection(v,focus,progress,true);finite(camera);
    expect(camera.position[1]).toBeGreaterThanOrEqual(.24);expect(camera.target).toEqual([inspection.point.x,inspection.point.y,inspection.point.z]);
    const view=new THREE.PerspectiveCamera(camera.fov,Number.isFinite(aspect)&&aspect>0?aspect:1,.01,500);view.position.fromArray(camera.position);view.lookAt(...camera.target);view.updateMatrixWorld(true);
    const projected=point(inspection.point).project(view);expect(Math.abs(projected.x)).toBeLessThan(1e-8);expect(Math.abs(projected.y)).toBeLessThan(1e-8);expect(projected.z).toBeGreaterThan(-1);expect(projected.z).toBeLessThan(1);
   }
   const wide=BF.lifecycleCamera(v,1.9,'specimen',1,false),tall=BF.lifecycleCamera(v,.48,'specimen',1,false);
   expect(new THREE.Vector3(...tall.position).distanceTo(new THREE.Vector3(...tall.target))).toBeGreaterThan(new THREE.Vector3(...wide.position).distanceTo(new THREE.Vector3(...wide.target)));
  });
 });

 it('keeps an unfed larva small and still in every inspection view, including on mown ground',()=>{
  for(const id of ['bergamot','lawn']){
   const s=generation(id);BF.advanceStage(s);const v=BF.lifecycleVisual(s),first=BF.lifecycleInspection(v,'detail',0,true);
   expect(v.blocked).toBe(true);expect(first.note).toContain('no milkweed');
   for(const progress of [0,.25,.5,.75,1]){
    expect(BF.lifecyclePose(v,progress,true)).toMatchObject({growth:.32,crawl:0});expect(BF.lifecycleInspection(v,'detail',progress,true).point).toEqual(first.point);
    for(const focus of ['context','specimen','detail']){const camera=BF.lifecycleCamera(v,.48,focus,progress,true);finite(camera);expect(camera.position[1]).toBeGreaterThanOrEqual(.24);}
   }
   expect(BF.advanceStage(s).ok).toBe(false);expect(BF.lifecycleVisual(s).stage).toBe('caterpillar');
  }
 });

 it('describes visible surfaces without presenting hidden metamorphosis or actual duration as visible',()=>{
  const s=generation();BF.advanceStage(s);BF.advanceStage(s);const chrysalis=BF.lifecycleInspection(BF.lifecycleVisual(s),'detail',.4,true);
  expect(chrysalis.detailLabel).toBe('Chrysalis attachment close-up');expect(chrysalis.note).toContain('out of sight inside');
  BF.advanceStage(s);const wing=BF.lifecycleInspection(BF.lifecycleVisual(s),'detail',.4,true);expect(wing.note).toContain('compresses');expect(wing.note).toContain('dry before flight');
 });

 it('inspects without changing saved evidence, stage, energy, clock, or allocating new scene resources',()=>{
  const s=generation();BF.advanceStage(s);s.energy=43;s.clock=37;
  const before=JSON.stringify(s),saved=JSON.stringify(BF.save(s)),v=BF.lifecycleVisual(s),visual=JSON.stringify(v),geometries=[];
  world.lifecycle.traverse(o=>{if(o.geometry)geometries.push(o.geometry);});
  for(const progress of [0,.2,.5,.8,1,.5,0])for(const focus of ['context','specimen','detail']){BF.lifecycleInspection(v,focus,progress,true);BF.lifecycleCamera(v,.48,focus,progress,true);world.syncLifecycle(v,progress,true);}
  expect(JSON.stringify(s)).toBe(before);expect(JSON.stringify(BF.save(s))).toBe(saved);expect(JSON.stringify(v)).toBe(visual);
  const after=[];world.lifecycle.traverse(o=>{if(o.geometry)after.push(o.geometry);});expect(after).toEqual(geometries);
 });
});
