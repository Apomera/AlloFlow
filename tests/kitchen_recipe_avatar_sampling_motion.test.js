import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const phases=['pickup','dip','lift','check','ready'];
const pose=(phase,progress=0,extra={})=>V.pose({kind:'samplePasta',phase,nextPhase:phases[phases.indexOf(phase)+1],progress,sampleAware:true,...extra});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const resting=()=>V.keyframe('samplePasta','pickup',{sampleAware:true});
const park=(source,progress,extra={})=>V.park(source,source,progress,{sampleAware:true,...extra});
const toolBottom=p=>{const a=p.tool.angle*Math.PI/180;return p.tool.y+7*Math.cos(a)+Math.hypot(13*Math.sin(a),20*Math.cos(a));};
const finite=(p)=>[p.tool,p.grip,p.supportHand,p.body,p.head,p.gaze].every(v=>['x','y'].every(k=>Number.isFinite(v[k])));

describe('Retained pasta sample choreography',()=>{
 it('keeps opt-in behavior separate from legacy tools and sampling',()=>{
  for(const phase of phases)for(const progress of [0,27,67,100]){
   const options={kind:'samplePasta',phase,nextPhase:phases[phases.indexOf(phase)+1],progress};
   expect(V.pose({...options,sampleAware:false})).toEqual(V.pose(options));
   expect(V.pose(options).samplingTransfer).toBeUndefined();
   for(const kind of ['inspect','fold','pour','serve','return'])expect(V.pose({...options,kind,sampleAware:true})).toEqual(V.pose({...options,kind}));
  }
 });
 it('reaches the pot empty and acquires a sample only at the completed dip',()=>{
  for(const progress of [0,25,50,75,99.999])expect(pose('pickup',progress).samplingTransfer.loaded).toBe(0);
  const dipped=pose('pickup',100);expect(dipped.samplingTransfer.loaded).toBe(1);expect(dipped.samplingTransfer.bowl).toEqual({x:450,y:350});
  expect(dipped.samplingTransfer.source).toEqual({kind:'pot',x:450,y:350});
 });
 it('lifts vertically clear of the pot before carrying the retained sample',()=>{
  for(let progress=0;progress<=100;progress++){
   const raised=pose('dip',progress);expect(raised.tool.x).toBe(450);expect(raised.samplingTransfer.loaded).toBe(1);
   const carried=pose('lift',progress);expect(toolBottom(carried)).toBeLessThan(300);expect(carried.samplingTransfer.loaded).toBe(1);
  }
 });
 it('keeps a solid sample through inspection and the explicit-release checkpoint',()=>{
  for(const phase of ['dip','lift','check','ready'])for(const progress of [0,15,50,99.99,100]){
   const p=pose(phase,progress);expect(p.samplingTransfer.loaded).toBe(1);expect(p.samplingTransfer.foodRetained).toBe(true);expect(p.held).toBe(true);
  }
  expect(pose('check',100).tool).toEqual(pose('ready').tool);
 });
 it('joins every tool, wrist, body and gaze endpoint without a positional jump',()=>{
  for(const reducedMotion of [false,true])for(let i=0;i<phases.length-1;i++){
   const a=pose(phases[i],100,{reducedMotion}),b=pose(phases[i+1],0,{reducedMotion});
   for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders'])expect(a[key]).toEqual(b[key]);
   expect(a.samplingTransfer.loaded).toBe(b.samplingTransfer.loaded);expect(a.samplingTransfer.bowl).toEqual(b.samplingTransfer.bowl);
  }
 });
 it('keeps both arms reachable with the working wrist attached across the complete sequence',()=>{
  const errors=[];
  for(const reducedMotion of [false,true])for(const phase of phases)for(let progress=0;progress<=100;progress++){
   const p=pose(phase,progress,{reducedMotion});if(!finite(p))errors.push('non-finite pose');
   if(distance(p.grip,V.grip(p.tool,'samplePasta'))>1e-8)errors.push('disconnected spoon');
   for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,arm=V.arm({side,shoulder:p.shoulders[side],hand});if(!arm.reachable||distance(arm.hand,hand)>1e-7)errors.push('unreachable '+phase+' '+progress+' '+side);}
  }
  expect(errors).toEqual([]);
 });
 it.each([false,true])('returns retained food to the source pot before parking when committed=%s',sampleCommitted=>{
  const source=pose('ready'),seen=new Set();let previous=park(source,0,{sampleCommitted}),returned=false;
  expect(previous.samplingTransfer.loaded).toBe(1);expect(previous.samplingTransfer.committed).toBe(sampleCommitted);
  for(let tick=1;tick<=1000;tick++){
   const p=park(source,tick/10,{sampleCommitted});seen.add(p.parkStage);
   expect(p.samplingTransfer.committed).toBe(sampleCommitted);
   if(previous.samplingTransfer.loaded===1&&p.samplingTransfer.loaded===0){returned=true;expect(distance(previous.samplingTransfer.bowl,{x:450,y:350})).toBeLessThan(.01);expect(distance(p.samplingTransfer.bowl,{x:450,y:350})).toBeLessThan(.01);}
   if(returned)expect(p.samplingTransfer.loaded).toBe(0);
   if(p.parkStage==='sample-carry'||p.parkStage==='empty-carry')expect(toolBottom(p)).toBeLessThan(300);
   previous=p;
  }
  expect(returned).toBe(true);expect(seen.has('sample-return')).toBe(true);expect(previous.held).toBe(false);expect(previous.tool).toMatchObject(resting());expect(previous.kind).toBe(null);expect(previous.samplingTransfer.foodRetained).toBe(false);
 });
 it('cancels every partial pickup without creating a pasta sample',()=>{
  for(const progress of [0,15,30,50,80,99.9])for(const t of [0,20,50,75,100]){
   const p=park(pose('pickup',progress),t);expect(p.samplingTransfer.loaded).toBe(0);expect(p.samplingTransfer.foodRetained).toBe(false);expect(finite(p)).toBe(true);
  }
 });
 it('can restart any return without duplicating food or jumping a hand or utensil',()=>{
  const source=pose('ready'),errors=[];
  for(const sampleCommitted of [false,true])for(let p=0;p<=100;p+=2){
   const a=park(source,p,{sampleCommitted}),b=park(a,0,{sampleCommitted}),near=park(a,.0001,{sampleCommitted});
   for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))errors.push('restart discontinuity '+p+' '+key);
   for(const side of ['left','right']){const before=V.handPresentation(a,side),after=V.handPresentation(near,side);if(Math.abs(before.closure-after.closure)>.0001||Math.abs(before.contact-after.contact)>.0001||Math.abs(before.rotation-after.rotation)>.001)errors.push('hand presentation jump '+p+' '+side);}
   if(!a.samplingTransfer.loaded)for(const t of [0,30,60,100])if(park(a,t,{sampleCommitted}).samplingTransfer.loaded)errors.push('duplicate sample');
   expect(park(a,100,{sampleCommitted}).samplingTransfer.loaded).toBe(0);
  }
  expect(errors).toEqual([]);
 });
 it('uses reduced motion to reach the same empty parked result without leaving a sample behind',()=>{
  for(const phase of phases)for(const p of [0,50,100])for(const sampleCommitted of [false,true]){
   const source=pose(phase,p),normal=park(source,100,{sampleCommitted}),reduced=park(source,0,{sampleCommitted,reducedMotion:true});
   expect(reduced).toEqual(normal);expect(reduced.samplingTransfer.loaded).toBe(0);expect(reduced.held).toBe(false);
   expect(V.parkDuration(source,source,{sampleAware:true,sampleCommitted})).toBeGreaterThan(0);
  }
 });
 it('does not mutate caller poses while constructing returns and descriptors',()=>{
  const source=pose('ready'),before=JSON.stringify(source);
  for(let p=0;p<=100;p+=5)park(source,p,{sampleCommitted:true});expect(JSON.stringify(source)).toBe(before);
  const returned=park(source,50);returned.samplingTransfer.source.x=999;expect(source.samplingTransfer.source.x).toBe(450);
 });
});
