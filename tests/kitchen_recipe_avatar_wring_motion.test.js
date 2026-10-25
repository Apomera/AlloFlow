import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const phases=['pickup','carry','twist','release','ready'];
const pose=(phase,progress=0,extra={})=>V.pose({kind:'wring',phase,nextPhase:phases[phases.indexOf(phase)+1],progress,clothAware:true,clothWaterMl:4,...extra});
const park=(source,progress,extra={})=>V.park(source,pose('ready'),progress,{clothAware:true,...extra});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDistance=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
const finite=p=>[p.tool,p.grip,p.supportHand,p.body,p.head,p.gaze].every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y));

describe('Contact-aware cloth wringing',()=>{
 it('preserves legacy motion and all unrelated tool behavior unless opted in',()=>{
  for(const phase of phases)for(const progress of [0,13,50,97,100]){
   const options={kind:'wring',phase,nextPhase:phases[phases.indexOf(phase)+1],progress};
   expect(V.pose({...options,clothAware:false})).toEqual(V.pose(options));
   expect(V.keyframe('wring',phase,{clothAware:false})).toEqual(V.keyframe('wring',phase));
   expect(V.pose(options).clothHandling).toBeUndefined();
   for(const kind of ['blot','press','mince','fold','pour','inspect','samplePasta'])expect(V.pose({...options,kind,clothAware:true})).toEqual(V.pose({...options,kind}));
  }
 });
 it('lifts and carries the cloth one-handed before lowering above the catch bowl',()=>{
  for(let progress=0;progress<=100;progress++){
   const p=pose('pickup',progress);expect(p.supportHand).toEqual({x:220,y:338,angle:0});expect(p.clothHandling.supportContact).toBe(0);expect(p.tool.angle).toBe(0);expect(p.cloth.compression).toBe(0);expect(p.cloth.dripping).toBe(false);
   if(p.clothHandling.stage==='cloth-carry'){expect(p.tool.y+14).toBeLessThan(300);expect(p.tool.x).toBeGreaterThanOrEqual(300);expect(p.tool.x).toBeLessThanOrEqual(620);}
  }
  expect(pose('pickup',100).tool).toMatchObject({x:300,y:306,angle:0});
 });
 it('joins the support hand and closes its grip before either wrist twists',()=>{
  for(let progress=0;progress<=100;progress++){
   const p=pose('carry',progress);expect(p.tool).toMatchObject({x:300,y:306,angle:0});
   if(p.clothHandling.supportContact>0)expect(distance(p.supportHand,p.clothHandling.leftGrip)).toBeLessThan(1e-8);
   if(p.cloth.twist>0){expect(p.clothHandling.supportContact).toBe(1);expect(p.clothHandling.joining).toBe(1);}
   if(progress<42){expect(p.clothHandling.supportContact).toBe(0);expect(p.cloth.twist).toBe(0);}
  }
 });
 it('counter-rotates both wrists without separating the two cloth-end anchors',()=>{
  for(let progress=58;progress<=100;progress++){
   const p=pose('carry',progress),left=V.handPresentation(p,'left'),right=V.handPresentation(p,'right');
   expect(left.rotation+right.rotation).toBeCloseTo(360,9);expect(left.rotation).toBeLessThanOrEqual(270);expect(right.rotation).toBeGreaterThanOrEqual(90);expect(left.pressure).toBe(p.cloth.compression);expect(right.pressure).toBe(p.cloth.compression);
   expect(distance(p.supportHand,p.clothHandling.leftGrip)).toBeLessThan(1e-8);expect(distance(p.grip,p.clothHandling.rightGrip)).toBeLessThan(1e-8);expect(distance(p.supportHand,p.grip)).toBeCloseTo(50,9);
   expect(p.cloth.shapePath).toContain('M-32-10');expect(p.cloth.shapePath).toContain('32-10L32 10');expect(p.cloth.shapePath).not.toMatch(/NaN|undefined|Infinity/);expect(p.cloth.waist).toBeGreaterThanOrEqual(4);
  }
  expect(pose('carry',100).cloth.waist).toBe(4);expect(V.handPresentation(pose('carry',100),'left').rotation).toBeCloseTo(238,10);expect(V.handPresentation(pose('carry',100),'right').rotation).toBe(122);
 });
 it('shows squeezing droplets only for supplied cloth water above the bowl',()=>{
  for(const clothWaterMl of [0,-1,NaN,Infinity,undefined])for(const phase of phases)for(const progress of [0,30,70,100])expect(pose(phase,progress,{clothWaterMl}).cloth.dripping).toBe(false);
  expect(pose('carry',85).cloth.dripping).toBe(true);
  for(const phase of phases)for(let progress=0;progress<=100;progress++){
   const p=pose(phase,progress);if(p.cloth.dripping){expect(p.tool).toMatchObject({x:300,y:306,angle:0});expect(p.clothHandling.supportContact).toBe(1);expect(p.clothHandling.workingContact).toBe(1);}
  }
 });
 it('releases and withdraws the second hand while the cloth remains over the bowl',()=>{
  for(let progress=0;progress<=100;progress++){
   const p=pose('release',progress);expect(p.cloth.twist).toBe(0);expect(p.cloth.dripping).toBe(false);
   if(progress<=32)expect(p.tool).toMatchObject({x:300,y:306,angle:0});
   if(p.clothHandling.supportContact>0)expect(distance(p.supportHand,p.clothHandling.leftGrip)).toBeLessThan(1e-8);
   if(p.tool.x!==300){expect(p.clothHandling.supportContact).toBe(0);expect(p.supportHand).toEqual({x:220,y:338,angle:0});}
   if(p.clothHandling.stage==='cloth-carry')expect(p.tool.y+14).toBeLessThan(300);
  }
  expect(pose('ready').tool).toMatchObject({x:620,y:336,angle:0});expect(pose('ready').held).toBe(true);
 });
 it('joins phase endpoints in position, wrist rotation, pressure, body and gaze',()=>{
  for(const reducedMotion of [false,true])for(let i=0;i<phases.length-1;i++){
   const a=pose(phases[i],100,{reducedMotion}),b=pose(phases[i+1],0,{reducedMotion});
   for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders'])expect(a[key]).toEqual(b[key]);
   for(const side of ['left','right'])expect(V.handPresentation(a,side)).toEqual(V.handPresentation(b,side));
   for(const field of ['compression','twist','shapePath','weavePath','wetPath'])expect(a.cloth[field]).toEqual(b.cloth[field]);
  }
 });
 it('keeps hands reachable and wrists continuous throughout every movement',()=>{
  const errors=[];
  for(const reducedMotion of [false,true])for(const phase of phases){let previous=null;for(let progress=0;progress<=100;progress++){
   const p=pose(phase,progress,{reducedMotion});if(!finite(p))errors.push('non-finite '+phase+'/'+progress);
   for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,arm=V.arm({side,hand,shoulder:p.shoulders[side]}),h=V.handPresentation(p,side);if(!arm.reachable||distance(arm.hand,hand)>1e-7)errors.push('unreachable '+phase+'/'+progress+'/'+side);if(previous&&angleDistance(h.rotation,V.handPresentation(previous,side).rotation)>6)errors.push('wrist jump '+phase+'/'+progress+'/'+side);}
   previous=p;
  }}expect(errors).toEqual([]);
 });
 it('untwists, releases the supporting grip, then returns one-handed on cancellation',()=>{
  const source=pose('twist'),seen=new Set();let previous=park(source,0);
  for(let tick=1;tick<=1000;tick++){
   const p=park(source,tick/10);seen.add(p.parkStage);
   if(p.clothHandling.supportContact>0){expect(distance(p.supportHand,p.clothHandling.leftGrip)).toBeLessThan(1e-8);expect(p.tool).toMatchObject({x:300,y:306,angle:0});}
   if(p.parkStage==='support-release')expect(p.cloth.twist).toBe(0);
   if(p.parkStage==='cloth-carry'){expect(p.clothHandling.supportContact).toBe(0);expect(p.tool.y+14).toBeLessThan(300);}
   if(p.parkStage==='cloth-release'){expect(p.tool).toMatchObject({x:620,y:336,angle:0});expect(distance(p.grip,p.clothHandling.rightGrip)).toBeLessThan(1e-8);}
   expect(distance(p.grip,previous.grip)).toBeLessThan(4);expect(distance(p.supportHand,previous.supportHand)).toBeLessThan(4);previous=p;
  }
  for(const stage of ['cloth-untwist','support-release','support-withdraw','cloth-lift','cloth-carry','cloth-lower','cloth-release','hands-withdraw','parked'])expect(seen.has(stage)).toBe(true);
  expect(previous.kind).toBe(null);expect(previous.held).toBe(false);expect(previous.clothHandling.preview).toBe(false);
 });
 it('cancels every partial phase without detached contact, unreachable hands or jumps',()=>{
  const errors=[];
  for(const phase of phases)for(const progress of [0,13,42,57,75,99.99,100]){
   const source=pose(phase,progress),start=park(source,0);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders'])if(JSON.stringify(source[key])!==JSON.stringify(start[key]))errors.push('initial jump '+phase+'/'+progress+'/'+key);
   let previous=start;for(let tick=1;tick<=200;tick++){
    const p=park(source,tick/2);if(!finite(p))errors.push('non-finite');
    for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,arm=V.arm({side,hand,shoulder:p.shoulders[side]}),h=V.handPresentation(p,side),before=V.handPresentation(previous,side);if(!arm.reachable||distance(arm.hand,hand)>1e-7)errors.push('unreachable '+phase+'/'+progress+'/'+tick+'/'+side);if(angleDistance(h.rotation,before.rotation)>10)errors.push('rotation jump '+phase+'/'+progress+'/'+tick+'/'+side);if(h.contact>0&&distance(hand,side==='right'?p.clothHandling.rightGrip:p.clothHandling.leftGrip)>1e-7)errors.push('detached '+phase+'/'+progress+'/'+tick+'/'+side);}
    previous=p;
   }
  }expect(errors).toEqual([]);
 });
 it('cancels a partial initial reach without picking up or moving the parked cloth',()=>{
  const rest=park(pose('ready'),100),target=pose('pickup');
  for(const progress of [0,15,50,80,99]){
   const source=V.reach(rest,target,progress,{contactAware:true});expect(source.held).toBe(false);
   for(const cancel of [0,25,50,75,100]){const p=park(source,cancel);expect(p.held).toBe(false);expect(p.tool.visible).toBe(false);expect(p.cloth&&p.cloth.dripping||false).toBe(false);expect(finite(p)).toBe(true);}
  }
 });
 it('can restart returns after release without creating a new grip or cloth motion',()=>{
  const source=pose('twist');
  for(let progress=0;progress<=100;progress+=2){
   const p=park(source,progress),again=park(p,0),near=park(p,.0001);
   for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders'])expect(again[key]).toEqual(p[key]);
   for(const side of ['left','right'])expect(angleDistance(V.handPresentation(near,side).rotation,V.handPresentation(p,side).rotation)).toBeLessThan(.001);
   if(!p.held)for(const cancel of [0,30,60,100])expect(park(p,cancel).held).toBe(false);
  }
 });
 it('uses reduced motion to reach the identical empty endpoint and deliberate opt-in pacing',()=>{
  for(const phase of phases)for(const progress of [0,50,100]){
   const source=pose(phase,progress);expect(park(source,0,{reducedMotion:true})).toEqual(park(source,100));expect(V.parkDuration(source,pose('ready'),{clothAware:true})).toBeGreaterThan(0);
  }
  expect(V.transitionDuration('wring','pickup','carry',{clothAware:true})).toBeGreaterThan(V.transitionDuration('wring','pickup','carry'));expect(V.transitionDuration('wring','ready',null,{clothAware:true})).toBe(0);
 });
 it('leaves caller input poses and water amounts unchanged',()=>{
  const source=pose('carry',90),before=JSON.stringify(source);for(let progress=0;progress<=100;progress+=5)park(source,progress);expect(JSON.stringify(source)).toBe(before);
  const p=park(source,20);p.clothHandling.leftGrip.x=999;expect(source.clothHandling.leftGrip.x).toBe(275);expect(source.clothHandling.waterMl).toBe(4);
 });
});
