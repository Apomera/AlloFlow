import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const phases=['pickup','position','contact','press','lift','ready'];
const pose=(phase,progress=0,extra={})=>V.pose({kind:'press',phase,nextPhase:phases[phases.indexOf(phase)+1],progress,pressAware:true,...extra});
const park=(source,progress,extra={})=>V.park(source,pose('ready'),progress,{pressAware:true,...extra});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDistance=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
const bottom=p=>p.tool.y+Math.hypot(25*Math.sin(p.tool.angle*Math.PI/180),7*Math.cos(p.tool.angle*Math.PI/180));
const finite=p=>[p.tool,p.grip,p.supportHand,p.body,p.head,p.gaze].every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y));

describe('Braced vertical tomato pressing',()=>{
 it('preserves all legacy behavior unless pressing is explicitly opted in',()=>{
  for(const phase of phases)for(const progress of [0,20,50,85,100]){
   const options={kind:'press',phase,nextPhase:phases[phases.indexOf(phase)+1],progress};
   expect(V.pose({...options,pressAware:false})).toEqual(V.pose(options));expect(V.keyframe('press',phase,{pressAware:false})).toEqual(V.keyframe('press',phase));expect(V.pose(options).pressInteraction).toBeUndefined();
   for(const kind of ['blot','wring','mince','fold','pour','inspect','samplePasta','serve'])expect(V.pose({...options,kind,pressAware:true})).toEqual(V.pose({...options,kind}));
  }
 });
 it('keeps all fourteen targets at the existing food coordinates and clamps invalid selections',()=>{
  for(let piece=0;piece<14;piece++){
   const p=pose('press',0,{piece});expect(p.pressInteraction.piece).toBe(piece);expect(p.pressInteraction.target).toEqual({x:420+piece%7*28,y:341+Math.floor(piece/7)*16});expect(p.contact).toEqual({x:p.pressInteraction.target.x,y:p.pressInteraction.target.y,amount:1});expect(p.tool.x).toBe(p.contact.x);expect(p.tool.y).toBe(p.contact.y+2);
  }
  for(const piece of [undefined,NaN,Infinity,-1])expect(pose('press',0,{piece})).toEqual(pose('press',0,{piece:0}));expect(pose('press',0,{piece:99})).toEqual(pose('press',0,{piece:13}));
 });
 it('braces the pan with an insulated support grip while the working hand remains attached',()=>{
  for(let piece=0;piece<14;piece++)for(const phase of phases)for(const progress of [0,20,50,80,100]){
   const p=pose(phase,progress,{piece}),left=V.handPresentation(p,'left'),right=V.handPresentation(p,'right');expect(p.activeHand).toBe('left');expect(distance(p.grip,V.grip(p.tool,'press'))).toBeLessThan(1e-8);expect(p.supportHand).toEqual({x:705,y:349,angle:-8});expect(right).toMatchObject({gear:'mitt',gesture:'handle',role:'stabilizing',contact:1});expect(left).toMatchObject({gear:'bare',gesture:'wrap',role:'working',contact:1});expect(p.pressInteraction.supportContact).toBe(1);
  }
 });
 it('raises the entire masher plate before lateral travel and lowers only above the selected piece',()=>{
  for(let piece=0;piece<14;piece++)for(let progress=0;progress<=100;progress++){
   const p=pose('pickup',progress,{piece}),d=p.pressInteraction;expect(d.pressure).toBe(0);
   if(d.stage==='masher-lift')expect(p.tool.x).toBe(300);
   if(d.stage==='masher-carry'){expect(bottom(p)).toBeLessThan(300);expect(p.tool.angle).toBe(0);}
   if(d.stage==='masher-position')expect(p.tool.x).toBe(d.target.x);
   const returning=pose('lift',progress,{piece});if(returning.pressInteraction.stage==='masher-return')expect(bottom(returning)).toBeLessThan(300);else expect(returning.tool.x).toBe(300);
  }
 });
 it('loads vertically, dwells under gentle pressure, then unloads before lifting clear',()=>{
  for(let piece=0;piece<14;piece++){
   let lastPressure=0;
   for(let progress=0;progress<=100;progress++){
    const loaded=pose('contact',progress,{piece}),unloaded=pose('press',progress,{piece});expect(loaded.tool.x).toBe(loaded.pressInteraction.target.x);expect(loaded.tool.angle).toBe(0);expect(loaded.pressInteraction.pressure).toBeGreaterThanOrEqual(lastPressure);lastPressure=loaded.pressInteraction.pressure;expect(loaded.contact.amount).toBe(loaded.pressInteraction.pressure);
    if(progress>=78){expect(loaded.tool.y).toBe(loaded.pressInteraction.target.y+2);expect(loaded.pressInteraction.pressure).toBe(1);}
    expect(unloaded.tool.x).toBe(unloaded.pressInteraction.target.x);expect(unloaded.tool.angle).toBe(0);
    if(progress<25)expect(unloaded.tool.y).toBeGreaterThanOrEqual(unloaded.pressInteraction.target.y-5);else expect(unloaded.pressInteraction.pressure).toBe(0);
   }
   expect(pose('press',100,{piece}).tool.y).toBe(286);
  }
 });
 it('joins tool, hands, force, body and gaze at every phase boundary',()=>{
  for(const reducedMotion of [false,true])for(let piece=0;piece<14;piece++)for(let i=0;i<phases.length-1;i++){
   const a=pose(phases[i],100,{piece,reducedMotion}),b=pose(phases[i+1],0,{piece,reducedMotion});for(const key of ['tool','grip','supportHand','contact','body','head','gaze','shoulders'])expect(a[key]).toEqual(b[key]);for(const side of ['left','right'])expect(V.handPresentation(a,side)).toEqual(V.handPresentation(b,side));expect(a.pressInteraction.pressure).toBe(b.pressInteraction.pressure);
  }
 });
 it('keeps both arms reachable and wrist rotation smooth for all target positions',()=>{
  const errors=[];for(const reducedMotion of [false,true])for(let piece=0;piece<14;piece++)for(const phase of phases){let previous=null;for(let progress=0;progress<=100;progress++){
   const p=pose(phase,progress,{piece,reducedMotion});if(!finite(p))errors.push('non-finite');
   for(const side of ['left','right']){const hand=side==='left'?p.grip:p.supportHand,arm=V.arm({side,hand,shoulder:p.shoulders[side]}),h=V.handPresentation(p,side);if(!arm.reachable||distance(hand,arm.hand)>1e-7)errors.push('unreachable '+piece+'/'+phase+'/'+progress+'/'+side);if(previous&&angleDistance(h.rotation,V.handPresentation(previous,side).rotation)>4)errors.push('wrist jump '+piece+'/'+phase+'/'+progress+'/'+side);}
   previous=p;
  }}expect(errors).toEqual([]);
 });
 it('unloads and clears the rim before returning, then releases both grips at the rest',()=>{
  const source=pose('press',0,{piece:13}),stages=new Set();let previous=park(source,0);
  for(let tick=1;tick<=1000;tick++){
   const p=park(source,tick/10),d=p.pressInteraction;stages.add(p.parkStage);
   if(d.pressure>0){expect(p.tool.x).toBe(d.target.x);expect(p.tool.y).toBeGreaterThanOrEqual(d.target.y-5);}
   if(p.parkStage==='masher-return'){expect(bottom(p)).toBeLessThan(300);expect(d.pressure).toBe(0);expect(d.supportContact).toBe(1);}
   if(['pan-release','masher-release'].includes(p.parkStage))expect(p.tool).toMatchObject({x:300,y:324,angle:-14});
   if(d.supportContact>0)expect(distance(p.supportHand,d.supportAnchor)).toBeLessThan(1e-8);
   if(d.toolContact>0)expect(distance(p.grip,V.grip(p.tool,'press'))).toBeLessThan(1e-8);
   expect(distance(p.grip,previous.grip)).toBeLessThan(5);expect(distance(p.supportHand,previous.supportHand)).toBeLessThan(5);previous=p;
  }
  for(const stage of ['masher-unload','masher-clear','masher-return','masher-rest','pan-release','masher-release','hands-withdraw','parked'])expect(stages.has(stage)).toBe(true);
  expect(previous.held).toBe(false);expect(previous.kind).toBe(null);expect(previous.pressInteraction.preview).toBe(false);
 });
 it('cancels every phase on near and far pieces with continuous anchored hands',()=>{
  const errors=[];for(const piece of [0,6,7,13])for(const phase of phases)for(const progress of [0,23,50,78,99.99,100]){
   const source=pose(phase,progress,{piece}),start=park(source,0);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders'])if(JSON.stringify(start[key])!==JSON.stringify(source[key]))errors.push('initial jump '+piece+'/'+phase+'/'+progress+'/'+key);
   let previous=start;for(let tick=1;tick<=200;tick++){
    const p=park(source,tick/2),d=p.pressInteraction;if(!finite(p))errors.push('non-finite');
    for(const side of ['left','right']){const hand=side==='left'?p.grip:p.supportHand,arm=V.arm({side,hand,shoulder:p.shoulders[side]}),h=V.handPresentation(p,side);if(!arm.reachable||distance(arm.hand,hand)>1e-7)errors.push('unreachable '+piece+'/'+phase+'/'+progress+'/'+tick+'/'+side);if(angleDistance(h.rotation,V.handPresentation(previous,side).rotation)>10)errors.push('rotation jump');if(h.contact>0&&distance(hand,side==='left'?V.grip(p.tool,'press'):d.supportAnchor)>1e-7)errors.push('detached grip');}
    previous=p;
   }
  }expect(errors).toEqual([]);
 });
 it('cancels an initial empty-hand reach without picking up the masher',()=>{
  const home=park(pose('ready'),100),target=pose('pickup');
  for(const progress of [0,15,50,80,99]){
   const source=V.reach(home,target,progress,{contactAware:true});expect(source.held).toBe(false);
   for(const cancel of [0,25,50,75,100]){const p=park(source,cancel);expect(p.held).toBe(false);expect(p.tool.visible).toBe(false);expect(finite(p)).toBe(true);}
  }
 });
 it('can restart a return at any stage without jumping or creating a new tool grip',()=>{
  const source=pose('press',0,{piece:13});for(let progress=0;progress<=100;progress+=2){
   const p=park(source,progress),restart=park(p,0),near=park(p,.0001);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders'])expect(restart[key]).toEqual(p[key]);for(const side of ['left','right'])expect(angleDistance(V.handPresentation(near,side).rotation,V.handPresentation(p,side).rotation)).toBeLessThan(.001);
   if(!p.held)for(const t of [0,25,50,75,100])expect(park(p,t).held).toBe(false);
  }
 });
 it('uses reduced motion for the same empty endpoint while retaining meaningful pressing positions',()=>{
  for(const phase of phases)for(const progress of [0,50,100]){
   const source=pose(phase,progress,{piece:13}),still=pose(phase,progress,{piece:13,reducedMotion:true});expect(still.tool).toEqual(source.tool);expect(still.grip).toEqual(source.grip);expect(still.body.x).toBe(0);expect(still.body.y).toBe(0);expect(still.body.angle).toBe(0);expect(park(source,0,{reducedMotion:true})).toEqual(park(source,100));expect(V.parkDuration(source,source,{pressAware:true})).toBeGreaterThan(0);
  }
  expect(V.transitionDuration('press','contact','press',{pressAware:true})).toBeGreaterThan(V.transitionDuration('press','contact','press'));expect(V.transitionDuration('press','ready',null,{pressAware:true})).toBe(0);
 });
 it('does not mutate inputs or include ingredient state in movement descriptors',()=>{
  const source=pose('contact',90,{piece:13}),before=JSON.stringify(source);for(let progress=0;progress<=100;progress+=5)park(source,progress);expect(JSON.stringify(source)).toBe(before);const p=park(source,30);p.pressInteraction.target.x=0;expect(source.pressInteraction.target.x).toBe(588);expect(source.pressInteraction).not.toHaveProperty('juice');expect(source.pressInteraction).not.toHaveProperty('texture');expect(source.pressInteraction).not.toHaveProperty('cookingTime');
 });
});
