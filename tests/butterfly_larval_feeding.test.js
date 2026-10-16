import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);});
afterAll(()=>{const resources=new Set();world.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));});resources.forEach(r=>r.dispose());});
function generation(id='milkweed',plan){const s=BF.freshState();if(plan)BF.applyPlan(s,plan,'both');const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});BF.land(s);BF.observe(s);BF.layEggs(s,id,'complete');BF.advanceStage(s);return s;}
function finite(v){if(typeof v==='number')expect(Number.isFinite(v)).toBe(true);else if(v&&typeof v==='object')Object.values(v).forEach(finite);}
function polygonArea(points){return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.z-q.x*p.z;},0)/2);}
function triangleArea(geometry){const p=geometry.attributes.position,index=geometry.index;let area=0;for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);area+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getX(c)-p.getX(a))*(p.getZ(b)-p.getZ(a)))/2;}return area;}
function supports(){const leaves=[];world.scene.traverse(o=>{if(o.userData.larvalFeedingSupport)leaves.push(o);});return leaves;}
function resources(){const objects=[];world.scene.traverse(o=>{if(o.geometry)objects.push(o.geometry);if(o.material)objects.push(o.material);});return objects;}

describe('Caterpillar feeding on a real milkweed leaf margin',()=>{
 it('normalizes progress, restricts feeding to a fed larva, and retains four bounded illustrative bites',()=>{
  const v=BF.lifecycleVisual(generation());
  for(const p of [undefined,NaN,Infinity,-Infinity,-3,0,.1,.5,1,3]){const m=BF.larvalFeeding(v,p);finite(m);expect(m.progress).toBeGreaterThanOrEqual(0);expect(m.progress).toBeLessThanOrEqual(1);expect(m.scale).toBe(.48);}
  expect(BF.larvalFeeding(v,-1)).toEqual(BF.larvalFeeding(v,0));expect(BF.larvalFeeding(v,2)).toEqual(BF.larvalFeeding(v,1));
  const end=BF.larvalFeeding(v,1);expect(end).toMatchObject({active:true,phase:'complete',completedBites:4,jaw:1,gap:0});expect(end.notches).toHaveLength(4);
  const almost=BF.larvalFeeding(v,.999999);expect(almost.jaw).toBe(end.jaw);expect(almost.position).toEqual(end.position);expect(almost.notches).toEqual(end.notches);
  for(const invalid of [null,{...v,stage:'egg'},{...v,host:false},{...v,blocked:true},{...v,support:'ground'}]){const m=BF.larvalFeeding(invalid,.6);expect(m.active).toBe(false);expect(m.notches).toEqual([]);expect(m.completedBites).toBe(0);finite(m);}
 });

 it('cuts actual curved-edge gaps with monotonically decreasing area and an untouched midrib',()=>{
  const v=BF.lifecycleVisual(generation()),start=polygonArea(BF.larvalLeafOutline(BF.larvalFeeding(v,0)));let previous=start;
  for(let step=0;step<=80;step++){
   const m=BF.larvalFeeding(v,step/80),outline=BF.larvalLeafOutline(m),area=polygonArea(outline);expect(area).toBeLessThanOrEqual(previous+1e-10);previous=area;
   world.syncLifecycle(v,step/80,true,'feeding');const blade=world.lifecycle.getObjectByName('larval-feeding-leaf');
   expect(triangleArea(blade.geometry)).toBeCloseTo(area,7);expect(Array.from(blade.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);expect(Array.from(blade.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
   let minimumEdge=Infinity,maximumMidribOffset=0,minimumCircleClearance=0;
   for(let row=0;row<=192;row++){const positions=blade.geometry.attributes.position,edge=row*5+4;minimumEdge=Math.min(minimumEdge,positions.getZ(edge));maximumMidribOffset=Math.max(maximumMidribOffset,Math.abs(positions.getZ(row*5+2)));for(const n of m.notches){const dx=positions.getX(edge)-n.x;if(Math.abs(dx)<n.radius)minimumCircleClearance=Math.min(minimumCircleClearance,Math.hypot(dx,positions.getZ(edge)-n.z)-n.radius);}}
   expect(minimumEdge).toBeGreaterThanOrEqual(0);expect(maximumMidribOffset).toBe(0);expect(minimumCircleClearance).toBeGreaterThanOrEqual(-2e-7);
  }
  expect(previous).toBeLessThan(start*.95);expect(previous).toBeGreaterThan(start*.85);
 });

 it.each([['milkweed',undefined],['restoration','mixed']])('places visible jaw tips at the actual curved margin on %s / %s',(id,plan)=>{
  const v=BF.lifecycleVisual(generation(id,plan));
  for(const progress of [.05,.10,.18,.30,.36,.43,.55,.62,.68,.8,.88,.93,1]){
   const m=BF.larvalFeeding(v,progress);world.syncLifecycle(v,progress,true,'feeding');world.scene.updateMatrixWorld(true);
   const larva=world.lifecycle.getObjectByName('lifecycle-caterpillar'),actual=new THREE.Vector3();
   for(const name of ['caterpillar-jaw-left','caterpillar-jaw-right']){const jaw=larva.getObjectByName(name);actual.add(jaw.localToWorld(new THREE.Vector3(...jaw.userData.tip)).multiplyScalar(.5));}
   const expected=world.lifecycle.localToWorld(new THREE.Vector3(m.mouth.x,m.mouth.y,m.mouth.z));expect(actual.distanceTo(expected)).toBeLessThan(1e-8);
   const contact=new THREE.Vector3(m.contact.x,m.contact.y,m.contact.z);expect(contact.y).toBeCloseTo(BF.larvalLeafHeight(contact.x,contact.z),12);expect(m.mouth.y-m.contact.y).toBeCloseTo(m.gap,12);
   const inspection=BF.lifecycleInspection(v,'feeding',progress,true);expect(actual.distanceTo(new THREE.Vector3(inspection.point.x,inspection.point.y,inspection.point.z))).toBeLessThan(1e-8);
   const matching=supports().find(leaf=>leaf.userData.patch===id);expect(matching.visible).toBe(false);expect(supports().filter(leaf=>leaf.userData.patch!==id).every(leaf=>leaf.visible)).toBe(true);
   const blade=world.lifecycle.getObjectByName('larval-feeding-leaf');expect(blade.userData.mouthWorld).toEqual(expected.toArray());expect(blade.visible).toBe(true);
  }
 });

 it('keeps body and supporting feet above the leaf while the mouthparts touch its edge',()=>{
  const v=BF.lifecycleVisual(generation());
  for(const p of [.1,.2,.35,.45,.6,.7,.85,.95,1]){
   world.syncLifecycle(v,p,true,'feeding');world.lifecycle.updateMatrixWorld(true);const larva=world.lifecycle.getObjectByName('lifecycle-caterpillar');
   for(const x of [.536,.426,.316,.125,-.03,-.185,-.335,-.575])for(const z of [-.075,.075]){
    const foot=world.lifecycle.worldToLocal(larva.localToWorld(new THREE.Vector3(x,.009,z)));expect(foot.y).toBeGreaterThanOrEqual(BF.larvalLeafHeight(foot.x,foot.z)-.004);
   }
  }
 });

 it('closes the two visible mouthparts during a bite instead of opening them',()=>{
  const v=BF.lifecycleVisual(generation()),widths=[];
  for(const p of [.05,.199]){world.syncLifecycle(v,p,true,'feeding');world.lifecycle.updateMatrixWorld(true);const larva=world.lifecycle.getObjectByName('lifecycle-caterpillar');const tips=['caterpillar-jaw-left','caterpillar-jaw-right'].map(name=>{const jaw=larva.getObjectByName(name);return jaw.localToWorld(new THREE.Vector3(...jaw.userData.tip));});widths.push(tips[0].distanceTo(tips[1]));}
  expect(widths[1]).toBeLessThan(widths[0]*.9);
 });

 it('reverses leaf loss and jaw movement exactly without allocating resources or changing experiment evidence',()=>{
  const s=generation();s.energy=43;s.clock=37;const v=BF.lifecycleVisual(s),state=JSON.stringify(s),saved=JSON.stringify(BF.save(s)),before=resources();
  world.syncLifecycle(v,.43,false,'feeding');const blade=world.lifecycle.getObjectByName('larval-feeding-leaf'),positions=Array.from(blade.geometry.attributes.position.array),pose=world.lifecycle.getObjectByName('lifecycle-caterpillar').position.toArray();
  for(const p of [.9,1,.1,.8,0,.43]){BF.lifecycleCamera(v,.48,'feeding',p,true);world.syncLifecycle(v,p,true,'feeding');}
  expect(Array.from(blade.geometry.attributes.position.array)).toEqual(positions);expect(world.lifecycle.getObjectByName('lifecycle-caterpillar').position.toArray()).toEqual(pose);expect(resources()).toEqual(before);expect(JSON.stringify(s)).toBe(state);expect(JSON.stringify(BF.save(s))).toBe(saved);
 });

 it('restores original leaves and resting jaws on every exit, null generation, and unavailable stage',()=>{
  const fed=BF.lifecycleVisual(generation());
  for(const next of [null,{...fed,stage:'chrysalis'},BF.lifecycleVisual(generation('bergamot')),BF.lifecycleVisual(generation('lawn')),fed]){
   world.syncLifecycle(fed,1,false,'feeding');world.syncLifecycle(next,.5,true,next===fed?'detail':'feeding');
   expect(supports()).toHaveLength(2);expect(supports().every(leaf=>leaf.visible)).toBe(true);expect(world.lifecycle.getObjectByName('larval-feeding-leaf').visible).toBe(false);expect(world.lifecycle.userData.larvalFeeding).toBeNull();
   const larva=world.lifecycle.getObjectByName('lifecycle-caterpillar');expect(larva.rotation.toArray().slice(0,3)).toEqual([0,0,0]);for(const name of ['caterpillar-jaw-left','caterpillar-jaw-right'])expect(larva.getObjectByName(name).rotation.toArray().slice(0,3)).toEqual([0,0,0]);
  }
 });

 it('frames actual feeding mouthparts on tall and wide displays without opening feeding on blocked larvae',()=>{
  const fed=BF.lifecycleVisual(generation());for(const p of [0,.3,.5,.8,1])for(const aspect of [.25,.48,1,1.9,4]){
   const m=BF.larvalFeeding(fed,p),camera=BF.lifecycleCamera(fed,aspect,'feeding',p,true),inspection=BF.lifecycleInspection(fed,'feeding',p,true);finite(camera);expect(camera.target).toEqual([inspection.point.x,inspection.point.y,inspection.point.z]);expect(camera.position[1]).toBeGreaterThan(.24);expect(m.scale).toBe(.48);
   world.syncLifecycle(fed,p,true,'feeding');world.lifecycle.updateMatrixWorld(true);const view=new THREE.PerspectiveCamera(camera.fov,aspect,.01,500);view.position.fromArray(camera.position);view.lookAt(...camera.target);view.updateMatrixWorld(true);
   const blade=world.lifecycle.getObjectByName('larval-feeding-leaf');for(const n of m.notches){const edge=blade.localToWorld(new THREE.Vector3(n.x,BF.larvalLeafHeight(n.x,n.z-n.radius),n.z-n.radius)).project(view);expect(Math.abs(edge.x)).toBeLessThan(.95);expect(Math.abs(edge.y)).toBeLessThan(.95);}
  }
  for(const id of ['bergamot','lawn'])expect(BF.lifecycleInspection(BF.lifecycleVisual(generation(id)),'feeding',1,true).focus).toBe('context');
 });
});
