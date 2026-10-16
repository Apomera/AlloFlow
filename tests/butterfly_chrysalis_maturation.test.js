import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;world=BF.buildWorld(THREE,window.StemMeadow);});
afterAll(()=>{const resources=new Set();world.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));});resources.forEach(r=>r.dispose());});
function generation(id='milkweed',plan){const s=BF.freshState();if(plan)BF.applyPlan(s,plan,'both');const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});BF.land(s);BF.observe(s);BF.layEggs(s,id,'complete');BF.advanceStage(s);BF.advanceStage(s);return s;}
function finite(v){if(typeof v==='number')expect(Number.isFinite(v)).toBe(true);else if(v&&typeof v==='object')Object.values(v).forEach(finite);}
function surface(root=world.lifecycle.getObjectByName('lifecycle-chrysalis')){return root.getObjectByName('monarch-chrysalis-surface');}
function colors(mesh){return Array.from(mesh.geometry.attributes.color.array);}
function greenExcess(mesh){const c=mesh.geometry.attributes.color;let value=0;for(let i=0;i<c.count;i++)value+=Math.max(0,c.getY(i)-c.getX(i));return value;}
function resources(){const items=[];world.scene.traverse(o=>{if(o.geometry)items.push(o.geometry);if(o.material)items.push(o.material);});return items;}

describe('Chrysalis maturation surface inspection',()=>{
 it('bounds hostile progress and only activates on a supported, unblocked chrysalis',()=>{
  const v=BF.lifecycleVisual(generation());let previousDark=0,previousPattern=0;
  for(let i=0;i<=40;i++){const m=BF.chrysalisMaturation(v,i/40);finite(m);expect(m.darkness).toBeGreaterThanOrEqual(previousDark);expect(m.pattern).toBeGreaterThanOrEqual(previousPattern);previousDark=m.darkness;previousPattern=m.pattern;}
  expect(BF.chrysalisMaturation(v,0)).toMatchObject({active:true,phase:'green',label:'Green chrysalis',darkness:0,pattern:0});
  expect(BF.chrysalisMaturation(v,.6)).toMatchObject({phase:'markings',label:'Wing markings appear'});expect(BF.chrysalisMaturation(v,1)).toMatchObject({phase:'pattern',label:'Wing pattern visible',darkness:1,pattern:1});
  for(const p of [undefined,NaN,Infinity,-Infinity])expect(BF.chrysalisMaturation(v,p)).toEqual(BF.chrysalisMaturation(v,1));
  expect(BF.chrysalisMaturation(v,-5)).toEqual(BF.chrysalisMaturation(v,0));expect(BF.chrysalisMaturation(v,5)).toEqual(BF.chrysalisMaturation(v,1));
  for(const invalid of [null,{...v,stage:'egg'},{...v,stage:'adult'},{...v,stage:'caterpillar'},{...v,host:false},{...v,support:'ground'},{...v,blocked:true}])expect(BF.chrysalisMaturation(invalid,.6)).toMatchObject({active:false,phase:'unavailable',darkness:0,pattern:0});
 });

 it('returns bounded shared sRGB colors with preserved green above the gold band and patterned lower wings',()=>{
  const v=BF.lifecycleVisual(generation()),first=BF.chrysalisMaturation(v,0),last=BF.chrysalisMaturation(v,1);let orange=0,dark=0,pale=0;
  for(let y=0;y<=80;y++)for(let x=-40;x<=40;x++){
   const u=x/40,w=y/80,rgb=BF.chrysalisSurface(u,w,last);expect(rgb.every(c=>Number.isFinite(c)&&c>=0&&c<=1)).toBe(true);
   if(w<.32)expect(rgb).toEqual(BF.chrysalisSurface(u,w,first));
   if(w>.4){if(rgb[0]>.6&&rgb[0]>rgb[1]*1.4)orange++;if(Math.max(...rgb)<.2)dark++;if(Math.min(...rgb)>.65)pale++;}
  }
  expect(orange).toBeGreaterThan(500);expect(dark).toBeGreaterThan(200);expect(pale).toBeGreaterThan(15);
  for(const u of [NaN,Infinity,-4,0,4])for(const w of [NaN,-4,0,4])for(const moment of [null,{},last,{active:true,darkness:NaN,pattern:Infinity}])expect(BF.chrysalisSurface(u,w,moment).every(c=>Number.isFinite(c)&&c>=0&&c<=1)).toBe(true);
 });

 it('blends wing veins and pale spots continuously across the lower case',()=>{
  const moment=BF.chrysalisMaturation(BF.lifecycleVisual(generation()),1),step=.0001;let transitionSamples=0;
  for(let y=45;y<=95;y++)for(let x=-95;x<=95;x++){
   const u=x/100,v=y/100,center=BF.chrysalisSurface(u,v,moment);
   for(const next of [BF.chrysalisSurface(u+step,v,moment),BF.chrysalisSurface(u,v+step,moment)]){
    const change=Math.max(...center.map((c,i)=>Math.abs(c-next[i])));expect(change).toBeLessThan(.035);if(change>.0005)transitionSamples++;
   }
  }
  expect(transitionSamples).toBeGreaterThan(200);
 });

 it.each([['milkweed',undefined],['restoration','mixed']])('changes actual surface colors reversibly on %s / %s while retaining shape',(id,plan)=>{
  const v=BF.lifecycleVisual(generation(id,plan)),mesh=surface(),position=mesh.geometry.attributes.position,originalPositions=Array.from(position.array),attribute=mesh.geometry.attributes.color,frames=[];let previous=Infinity;
  for(const p of [0,.2,.4,.6,.8,1]){
   world.syncLifecycle(v,p,true,'maturation');frames.push(colors(mesh));const excess=greenExcess(mesh);expect(excess).toBeLessThanOrEqual(previous+1e-6);previous=excess;
   expect(mesh.userData.maturation).toEqual(BF.chrysalisMaturation(v,p));expect(world.lifecycle.userData.chrysalisMaturation).toEqual(mesh.userData.maturation);
   expect(mesh.geometry.attributes.color).toBe(attribute);expect(Array.from(position.array)).toEqual(originalPositions);expect(frames.at(-1).every(Number.isFinite)).toBe(true);
  }
  expect(frames[0]).not.toEqual(frames[3]);expect(frames[3]).not.toEqual(frames[5]);world.syncLifecycle(v,.6,false,'maturation');expect(colors(mesh)).toEqual(frames[3]);world.syncLifecycle(v,0,false,'maturation');expect(colors(mesh)).toEqual(frames[0]);
 });

 it('preserves silk, cremaster, rings and gold through maturation and isolates the adult empty case',()=>{
  const s=generation(),v=BF.lifecycleVisual(s),pupa=world.lifecycle.getObjectByName('lifecycle-chrysalis'),shell=pupa.getObjectByName('monarch-chrysalis-shell'),gold=pupa.getObjectByName('monarch-chrysalis-gold'),empty=world.lifecycle.getObjectByName('lifecycle-empty-case'),emptySkin=surface(empty),originalEmpty=colors(emptySkin),originalShell=colors(shell),originalGold=colors(gold);
  expect(emptySkin.geometry).not.toBe(surface().geometry);expect(emptySkin.geometry.attributes.color.array).not.toBe(surface().geometry.attributes.color.array);
  for(const p of [0,.6,1,.4,1]){world.syncLifecycle(v,p,true,'maturation');expect(colors(shell)).toEqual(originalShell);expect(colors(gold)).toEqual(originalGold);expect(colors(emptySkin)).toEqual(originalEmpty);expect(shell.visible).toBe(true);expect(gold.visible).toBe(true);}
  BF.advanceStage(s);world.syncLifecycle(BF.lifecycleVisual(s),1,true,'maturation');expect(empty.visible).toBe(true);expect(emptySkin.visible).toBe(true);expect(colors(emptySkin)).toEqual(originalEmpty);expect(surface().userData.maturation).toBeNull();
 });

 it('restores exact default green colors when leaving the close-up, changing stage, or removing a generation',()=>{
  const s=generation(),v=BF.lifecycleVisual(s);world.syncLifecycle(v,.3,true,'context');const original=colors(surface());
  for(const focus of ['context','specimen','detail',undefined,'feeding']){world.syncLifecycle(v,1,true,'maturation');world.syncLifecycle(v,.9,true,focus);expect(colors(surface())).toEqual(original);expect(surface().userData.maturation).toBeNull();expect(world.lifecycle.userData.chrysalisMaturation).toBeNull();}
  for(const next of [null,{...v,stage:'adult'},{...v,host:false},{...v,blocked:true},{...v,support:'ground'}]){world.syncLifecycle(v,1,false,'maturation');world.syncLifecycle(next,.8,true,'maturation');expect(colors(surface())).toEqual(original);expect(world.lifecycle.userData.chrysalisMaturation).toBeNull();}
 });

 it('keeps the complete case and silk attachment inside tall and wide camera frames',()=>{
  const v=BF.lifecycleVisual(generation());
  for(const p of [0,.6,1])for(const aspect of [NaN,0,-1,.25,.48,1,1.9,4]){
   const result=BF.lifecycleCamera(v,aspect,'maturation',p,true),inspection=BF.lifecycleInspection(v,'maturation',p,true);finite(result);expect(inspection.focus).toBe('maturation');expect(result.target).toEqual([inspection.point.x,inspection.point.y,inspection.point.z]);
   world.syncLifecycle(v,p,true,'maturation');world.lifecycle.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(result.fov,Number.isFinite(aspect)&&aspect>0?aspect:1,.01,500);camera.position.fromArray(result.position);camera.lookAt(...result.target);camera.updateMatrixWorld(true);const pupa=world.lifecycle.getObjectByName('lifecycle-chrysalis');
   for(const local of [[0,0,0],[0,-.726,0],[-.18,-.43,0],[.18,-.43,0]]){const point=pupa.localToWorld(new THREE.Vector3(...local)).project(camera);expect(Math.abs(point.x)).toBeLessThan(.9);expect(Math.abs(point.y)).toBeLessThan(.9);expect(point.z).toBeGreaterThan(-1);expect(point.z).toBeLessThan(1);}
  }
  for(const invalid of [{...v,stage:'adult'},{...v,host:false}])expect(BF.lifecycleInspection(invalid,'maturation',1,true).focus).toBe('context');
 });

 it('keeps the native case clear of the mobile stage badge and caption',()=>{
  const v=BF.lifecycleVisual(generation()),result=BF.lifecycleCamera(v,366/390,'maturation',1,true),camera=new THREE.PerspectiveCamera(result.fov,366/390,.01,500);
  camera.position.fromArray(result.position);camera.lookAt(...result.target);camera.updateMatrixWorld(true);world.syncLifecycle(v,1,true,'maturation');world.lifecycle.updateMatrixWorld(true);
  const pupa=world.lifecycle.getObjectByName('lifecycle-chrysalis');let top=Infinity,bottom=-Infinity;
  pupa.traverse(mesh=>{const positions=mesh.geometry?.attributes.position;if(!positions||!mesh.visible)return;for(let i=0;i<positions.count;i++){const point=mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(positions,i)).project(camera),y=(1-point.y)*195;top=Math.min(top,y);bottom=Math.max(bottom,y);}});
  expect(top).toBeGreaterThan(48);expect(bottom).toBeLessThan(299);
 });

 it('leaves experiment state, saved evidence and render resources unchanged across inspection and replay',()=>{
  const s=generation();s.energy=43;s.clock=37;const v=BF.lifecycleVisual(s),before=JSON.stringify(s),saved=JSON.stringify(BF.save(s)),visual=JSON.stringify(v),allocated=resources();
  for(const p of [0,.4,.8,1,.6,0])for(const focus of ['maturation','detail','maturation','context']){BF.chrysalisMaturation(v,p);BF.lifecycleInspection(v,focus,p,true);BF.lifecycleCamera(v,.48,focus,p,true);world.syncLifecycle(v,p,true,focus);}
  expect(resources()).toEqual(allocated);expect(JSON.stringify(s)).toBe(before);expect(JSON.stringify(BF.save(s))).toBe(saved);expect(JSON.stringify(v)).toBe(visual);
 });
});
