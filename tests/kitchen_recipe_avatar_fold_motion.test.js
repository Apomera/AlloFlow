import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const phases=['pickup','immerse','across','turn','ready'];
const variants=[{}, {activity:'cool-and-fold-sauce',panPlacement:'burner'}, {activity:'cool-and-fold-sauce',panPlacement:'trivet'}];
const pose=(phase,progress=0,extra={})=>V.pose({kind:'fold',phase,nextPhase:phases[phases.indexOf(phase)+1],progress,foldAware:true,...extra});
const park=(source,progress,extra={})=>V.park(source,pose('ready',0,extra),progress,{foldAware:true,...extra});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDistance=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
const bowl=p=>({x:p.tool.x-7*Math.sin(p.tool.angle*Math.PI/180),y:p.tool.y+7*Math.cos(p.tool.angle*Math.PI/180)});
const bottom=p=>bowl(p).y+Math.hypot(13*Math.sin(p.tool.angle*Math.PI/180),20*Math.cos(p.tool.angle*Math.PI/180));
const projection=p=>({tool:p.tool,grip:p.grip,supportHand:p.supportHand,body:p.body,head:p.head,shoulders:p.shoulders,gaze:p.gaze,left:V.handPresentation(p,'left'),right:V.handPresentation(p,'right'),contact:p.folding.contact,pressure:p.folding.pressure,immersion:p.folding.immersion});

describe('Pan-braced sauce folding follows the actual spoon bowl',()=>{
 it('requires an explicit opt-in and leaves every other tool and existing opt-in unchanged',()=>{
  for(const extra of variants)for(const phase of phases)for(const progress of [0,20,50,85,100]){
   const o={kind:'fold',phase,nextPhase:phases[phases.indexOf(phase)+1],progress,...extra};expect(V.pose({...o,foldAware:false})).toEqual(V.pose(o));expect(V.keyframe('fold',phase,{...extra,foldAware:false})).toEqual(V.keyframe('fold',phase,extra));expect(V.pose(o).folding).toBeUndefined();
   for(const kind of ['inspect','pour','press','wring','samplePasta','serve','return','mince','separatePasta']){const other={...o,kind,pressAware:true,clothAware:true,sampleAware:true,portionAware:true};expect(V.pose({...other,foldAware:true})).toEqual(V.pose(other));}
  }
 });
 it('uses the correct pan, handedness, insulated support and original spoon rest',()=>{
  for(const extra of variants){const p=pose('pickup',0,extra),moved=!!extra.activity;expect(p.activeHand).toBe(moved?'left':'right');expect(p.tool).toMatchObject(V.keyframe('fold','pickup',extra));expect(p.panSurface).toEqual(moved?{x:extra.panPlacement==='trivet'?300:520,y:350,rx:110,ry:34}:{x:514,y:349,rx:132,ry:34});expect(p.folding.supportAnchor).toEqual(moved?{x:p.panSurface.x+185,y:346}:{x:358,y:349});}
 });
 it('keeps both hands attached and reachable through every pan variant and fractional movement',()=>{
  for(const extra of variants)for(const phase of phases)for(let progress=0;progress<=100;progress+=1){const p=pose(phase,progress,extra),active=p.activeHand,other=active==='left'?'right':'left';expect(distance(p.grip,V.grip(p.tool,'fold'))).toBeLessThan(1e-8);expect(distance(p.supportHand,p.folding.supportAnchor)).toBeLessThan(1e-8);expect(V.handPresentation(p,active)).toMatchObject({gesture:'wrap',gear:'bare',role:'working',contact:1});expect(V.handPresentation(p,other)).toMatchObject({gesture:'handle',gear:'mitt',role:'stabilizing',contact:1});expect(angleDistance(V.handPresentation(p,active).rotation,p.tool.angle)).toBeLessThan(1e-8);for(const side of ['left','right'])expect(V.arm({side,shoulder:p.shoulders[side],hand:side===active?p.grip:p.supportHand}).reachable).toBe(true);}
 });
 it('clears the whole bowl before crossing the rim, then enters vertically without contact in transit',()=>{
  for(const extra of variants)for(let progress=0;progress<=100;progress++){
   const p=pose('pickup',progress,extra),d=p.folding,home=bowl(pose('pickup',0,extra)),entry=bowl(pose('immerse',0,extra));
   if(d.stage==='spoon-lift')expect(d.bowl.x).toBeCloseTo(home.x,9);
   if(d.stage==='spoon-carry'){expect(bottom(p)).toBeLessThan(p.panSurface.y-p.panSurface.ry-20);expect(d.contact).toBe(0);}
   if(d.stage==='spoon-enter')expect(d.bowl.x).toBeCloseTo(entry.x,9);
   if(d.contact>0)expect(d.bowl.y).toBeGreaterThan(p.panSurface.y-14-1e-8);
  }
 });
 it('sweeps within the pan footprint and rolls inward while easing the load',()=>{
  for(const extra of variants){let last=1;
   for(let progress=0;progress<=100;progress++){const p=pose('immerse',progress,extra),d=p.folding,s=p.panSurface;expect(d.contact).toBe(1);expect(Math.pow((d.bowl.x-s.x)/s.rx,2)+Math.pow((d.bowl.y-s.y)/s.ry,2)).toBeLessThan(.9);expect(distance(d.bowl,bowl(p))).toBeLessThan(1e-8);const turn=pose('across',progress,extra);expect(turn.folding.contact).toBeLessThanOrEqual(last+1e-10);last=turn.folding.contact;expect(turn.folding.pressure).toBeLessThanOrEqual(.18+1e-9);}
   expect(pose('immerse',50,extra).folding.pressure).toBeCloseTo(.6,9);expect(pose('across',100,extra).folding.pressure).toBe(0);expect(pose('across',100,extra).folding.contact).toBeCloseTo(.18,9);
  }
 });
 it('lifts the bowl vertically before a high return, retaining support until the utensil is resting',()=>{
  for(const extra of variants)for(let progress=0;progress<=100;progress++){const p=pose('turn',progress,extra),d=p.folding,start=bowl(pose('turn',0,extra)),home=bowl(pose('ready',0,extra));if(d.stage==='spoon-clear')expect(d.bowl.x).toBeCloseTo(start.x,9);if(d.stage==='spoon-return'){expect(bottom(p)).toBeLessThan(p.panSurface.y-p.panSurface.ry-20);expect(d.contact).toBe(0);}if(d.stage==='spoon-rest')expect(d.bowl.x).toBeCloseTo(home.x,9);expect(d.supportContact).toBe(1);}
 });
 it('has continuous tool, hands, wrist, body and contact at every phase boundary',()=>{
  for(const extra of variants)for(let n=0;n<phases.length-1;n++){const end=pose(phases[n],100,extra),next=pose(phases[n+1],0,extra);expect(projection(end)).toEqual(projection(next));const before=pose(phases[n],99.999,extra),after=pose(phases[n+1],.001,extra);expect(distance(before.grip,after.grip)).toBeLessThan(.001);expect(angleDistance(V.handPresentation(before,before.activeHand).rotation,V.handPresentation(after,after.activeHand).rotation)).toBeLessThan(.001);}
 });
 it('exposes only reversible contact cues through the existing sauceInteraction contract',()=>{
  for(const extra of variants)for(const phase of phases)for(const progress of [0,25,50,80,100]){const p=pose(phase,progress,extra),before=JSON.stringify(p),d=p.folding;expect(V.sauceInteraction(p)).toEqual({kind:'fold',contact:d.contact,immersion:d.immersion,pressure:d.pressure,bowl:d.bowl,angle:p.tool.angle});expect(JSON.stringify(p)).toBe(before);expect(Object.keys(d)).not.toEqual(expect.arrayContaining(['waterMl','damage','temperature','recipeState']));}expect(V.sauceInteraction(park(pose('ready'),100))).toBeNull();
 });
 it('starts cancellation exactly from any partial movement, then unloads and clears before carrying',()=>{
  for(const extra of variants)for(const phase of phases)for(const progress of [0,7,30,50,85,100]){const source=pose(phase,progress,extra),before=JSON.stringify(source),start=park(source,0,extra);expect(projection(start)).toEqual(projection(source));let prior=null;
   for(let t=0;t<=100;t+=2){const p=park(source,t,extra),d=p.folding;if(p.parkStage==='spoon-return'){expect(bottom(p)).toBeLessThan(p.panSurface.y-p.panSurface.ry-20);expect(d.contact).toBe(0);expect(d.pressure).toBe(0);}if(p.held)expect(distance(p.grip,V.grip(p.tool,'fold'))).toBeLessThan(1e-8);for(const side of ['left','right'])expect(V.arm({side,shoulder:p.shoulders[side],hand:side===p.activeHand?p.grip:p.supportHand}).reachable).toBe(true);if(prior&&p.parkStage==='spoon-clear'&&prior.parkStage===p.parkStage)expect(d.bowl.x).toBeCloseTo(prior.folding.bowl.x,9);prior=p;}expect(JSON.stringify(source)).toBe(before);
  }
 });
 it('opens both grips at a stationary rest before withdrawing empty hands',()=>{
  for(const extra of variants){const source=pose('immerse',50,extra),home=pose('ready',0,extra);let releasedSupport=false,releasedSpoon=false;
   for(let t=0;t<=100;t+=.5){const p=park(source,t,extra),d=p.folding;if(d&&d.supportContact<1){releasedSupport=true;expect(distance(p.tool,home.tool)).toBeLessThan(1e-8);expect(angleDistance(p.tool.angle,home.tool.angle)).toBeLessThan(1e-8);}if(d&&d.spoonContact<1){releasedSpoon=true;expect(d.supportContact).toBe(0);}if(p.parkStage==='pan-release'||p.parkStage==='spoon-release'){expect(distance(p.supportHand,source.supportHand)).toBeLessThan(1e-8);expect(distance(p.grip,V.grip(home.tool,'fold'))).toBeLessThan(1e-8);}if(p.parkStage==='hands-withdraw'){expect(p.held).toBe(false);expect(d.supportContact).toBe(0);expect(d.spoonContact).toBe(0);}}
   expect(releasedSupport&&releasedSpoon).toBe(true);const end=park(source,100,extra);expect(end).toMatchObject({kind:null,parkedKind:'fold',held:false,parking:false,folding:{stage:'parked',preview:false,contact:0,pressure:0,supportContact:0,spoonContact:0}});expect(end.tool.visible).toBe(false);
  }
 });
 it('never grabs a phantom spoon when a preparatory reach or empty return is canceled',()=>{
  for(const extra of variants){const rest=park(pose('ready',0,extra),100,extra),target=pose('pickup',0,extra);
   for(const t of [0,20,60,90,99]){const reaching=V.reach(rest,target,t,{contactAware:true,articulatedApproach:true});expect(reaching.held).toBe(false);const before=JSON.stringify(reaching);for(const n of [0,20,60,99,100]){const returned=park(reaching,n,extra);expect(returned.held).toBe(false);expect(returned.tool.visible).toBe(false);}expect(JSON.stringify(reaching)).toBe(before);}expect(park(rest,100,extra)).toEqual(rest);
  }
 });
 it('continues safely when a held return is canceled again, without restoring released support contact',()=>{
  for(const extra of variants){const source=pose('across',35,extra);for(const t of [15,35,55,72,84,92]){const partial=park(source,t,extra);if(!partial.held)continue;const resumed=park(partial,0,extra);expect(projection(resumed)).toEqual(projection(partial));for(const n of [1,20,50,90]){const p=park(partial,n,extra);expect(p.folding.supportContact).toBeLessThanOrEqual(partial.folding.supportContact+1e-8);}expect(park(partial,100,extra)).toEqual(park(source,100,extra));}}
 });
 it('suppresses ancillary sway under reduced motion while preserving physical contact and empty final rest',()=>{
  for(const extra of variants)for(const phase of phases){const ordinary=pose(phase,50,extra),reduced=pose(phase,50,{...extra,reducedMotion:true});expect(reduced.tool).toEqual(ordinary.tool);expect(reduced.grip).toEqual(ordinary.grip);expect(reduced.supportHand).toEqual(ordinary.supportHand);expect(reduced.folding).toEqual(ordinary.folding);for(const part of [reduced.body,reduced.head])expect([part.x,part.y,part.angle]).toEqual([0,0,0]);expect(park(ordinary,5,{...extra,reducedMotion:true})).toEqual(park(ordinary,100,extra));}
 });
 it('keeps all computations finite, clamps progress and lengthens only opted-in folds',()=>{
  for(const progress of [NaN,Infinity,-20,150])for(const extra of variants){const p=pose('immerse',progress,extra);for(const obj of [p.tool,p.grip,p.supportHand,p.body,p.head,p.gaze])expect(Number.isFinite(obj.x)&&Number.isFinite(obj.y)).toBe(true);expect(p).toEqual(pose('immerse',Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):0,extra));}
  for(let n=0;n<phases.length-1;n++){const phase=phases[n],next=phases[n+1];expect(V.transitionDuration('fold',phase,next,{foldAware:true})).toBeGreaterThan(V.transitionDuration('fold',phase,next));}expect(V.transitionDuration('fold','ready',null,{foldAware:true})).toBe(0);for(const extra of variants){expect(V.parkDuration(pose('immerse',50,extra),pose('ready',0,extra),{foldAware:true})).toBeGreaterThan(1000);expect(V.parkDuration(pose('ready',0,extra),pose('ready',0,extra),{foldAware:true})).toBeGreaterThan(0);}
 });
});
