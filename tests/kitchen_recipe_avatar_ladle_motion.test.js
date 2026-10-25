import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const phases=['pickup','dip','lift','carry','tip','level','ready'];
const variants=[{actualMl:50,potSurfaceY:350},{actualMl:20,potSurfaceY:369},{actualMl:10,potSurfaceY:388},{activity:'cook-save-and-drain-pasta',actualMl:50,potSurfaceY:350}];
const pose=(phase,progress=0,extra={})=>V.pose({kind:'reserveWater',phase,nextPhase:phases[phases.indexOf(phase)+1],progress,ladleAware:true,...extra});
const park=(source,progress,extra={})=>V.park(source,pose('ready',0,extra),progress,{ladleAware:true,...extra});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDistance=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
const bowl=p=>({x:p.tool.x-7*Math.sin(p.tool.angle*Math.PI/180),y:p.tool.y+7*Math.cos(p.tool.angle*Math.PI/180)});
const bottom=p=>bowl(p).y+Math.hypot(19*Math.sin(p.tool.angle*Math.PI/180),23*Math.cos(p.tool.angle*Math.PI/180));
const projection=p=>({tool:p.tool,grip:p.grip,supportHand:p.supportHand,body:p.body,head:p.head,shoulders:p.shoulders,gaze:p.gaze,left:V.handPresentation(p,'left'),right:V.handPresentation(p,'right'),loaded:p.ladleTransfer.loadedFraction,received:p.ladleTransfer.destinationFraction,immersion:p.ladleTransfer.immersion});
const assertAllocation=d=>{for(const key of ['sourceFraction','loadedFraction','destinationFraction','immersion','flow','ladleContact','supportContact'])expect(d[key]).toBeGreaterThanOrEqual(-1e-10);expect(d.sourceFraction+d.loadedFraction+d.destinationFraction).toBeCloseTo(1,12);expect(d.loadedMl).toBeCloseTo(d.loadedFraction*d.amountMl,12);expect(d.capacityMl).toBe(50);expect(d.fillFraction).toBeCloseTo(d.loadedMl/50,12);expect(d.flow).toBeLessThanOrEqual(1);};

describe('A measured ladle retains water until the learner releases it',()=>{
 it('requires an explicit opt-in and does not alter any other utensil or older opt-in',()=>{
  for(const phase of phases)for(const progress of [0,30,65,100]){
   const o={kind:'reserveWater',phase,nextPhase:phases[phases.indexOf(phase)+1],progress};expect(V.pose({...o,ladleAware:false})).toEqual(V.pose(o));expect(V.pose(o).ladleTransfer).toBeUndefined();expect(V.keyframe('reserveWater',phase,{ladleAware:false})).toEqual(V.keyframe('reserveWater',phase));
   for(const kind of ['inspect','fold','pour','serve','return','samplePasta','wring','press','drainPasta','movePan','setPotHeat']){const previous={...o,kind,foldAware:true,pressAware:true,clothAware:true,sampleAware:true,portionAware:true};expect(V.pose({...previous,ladleAware:true})).toEqual(V.pose(previous));}
  }
 });
 it('keeps the actual shaft attached to a reachable left hand while a mitt braces the fixed pot handle',()=>{
  for(const extra of variants)for(const phase of phases)for(let n=0;n<=100;n++){
   const p=pose(phase,n,extra),d=p.ladleTransfer;expect(p.activeHand).toBe('left');expect(distance(p.grip,V.grip(p.tool,'reserveWater'))).toBeLessThan(1e-8);expect(angleDistance(V.handPresentation(p,'left').rotation,p.tool.angle)).toBeLessThan(1e-8);expect(distance(d.bowl,bowl(p))).toBeLessThan(1e-8);assertAllocation(d);
   if(d.supportContact>0){expect(distance(p.supportHand,{x:550,y:342})).toBeLessThan(1e-8);expect(V.handPresentation(p,'right')).toMatchObject({gear:'mitt',role:'stabilizing'});}
   for(const side of ['left','right'])expect(V.arm({side,shoulder:p.shoulders[side],hand:side==='left'?p.grip:p.supportHand}).reachable).toBe(true);
  }
 });
 it('crosses the rim at full-bowl clearance, then fills only while lowered into the actual water surface',()=>{
  for(const extra of variants){let prior=0;for(let n=0;n<=100;n++){
   const p=pose('pickup',n,extra),d=p.ladleTransfer;expect(d.loadedFraction).toBeGreaterThanOrEqual(prior);prior=d.loadedFraction;
   if(d.stage==='ladle-carry'){expect(bottom(p)).toBeLessThan(310);expect(d.loadedFraction).toBe(0);expect(d.immersion).toBe(0);}
   if(d.stage==='ladle-enter'||d.stage==='ladle-fill')expect(d.bowl.x).toBe(450);
   if(d.loadedFraction>0){expect(d.stage).toBe('ladle-fill');expect(d.immersion).toBe(1);expect(d.bowl.y).toBe(extra.potSurfaceY-8);}
  }expect(prior).toBe(1);}
 });
 it('lifts vertically, pauses over the pot, opens support before withdrawing and carries the full dose level',()=>{
  for(const extra of variants){for(let n=0;n<=100;n++){
   const lifted=pose('dip',n,extra);expect(lifted.ladleTransfer.bowl.x).toBe(450);expect(lifted.ladleTransfer.loadedMl).toBe(extra.actualMl);expect(lifted.ladleTransfer.supportContact).toBe(1);
   const p=pose('lift',n,extra),d=p.ladleTransfer;expect(d.loadedMl).toBe(extra.actualMl);expect(d.destinationFraction).toBe(0);
   if(d.stage==='pot-release'||d.stage==='support-withdraw')expect(d.bowl).toEqual({x:450,y:270});
   if(d.stage==='support-withdraw')expect(d.supportContact).toBe(0);
   if(d.stage==='ladle-carry'){expect(d.supportContact).toBe(0);expect(p.tool.angle).toBe(0);expect(bottom(p)).toBeLessThan(310);}
  }}
 });
 it('has continuous tool, wrist, hands, body, immersion and dose allocation at every phase boundary',()=>{
  for(const extra of variants)for(let n=0;n<phases.length-1;n++)expect(projection(pose(phases[n],100,extra))).toEqual(projection(pose(phases[n+1],0,extra)));
 });
 it('keeps the jug empty during all preparation and holds the full measured dose above its opening at ready',()=>{
  for(const extra of variants)for(const phase of phases)for(const n of [0,25,50,75,100]){const p=pose(phase,n,extra),d=p.ladleTransfer;expect(d.destinationFraction).toBe(0);expect(d.flow).toBe(0);expect(d.streamTarget).toBeNull();if(['carry','tip','level','ready'].includes(phase))expect(d.loadedMl).toBe(extra.actualMl);}
  const d=pose('ready').ladleTransfer;expect(d.lip.x).toBeCloseTo(242,10);expect(d.lip.y).toBeCloseTo(286,10);expect(d.lip.x).toBeGreaterThan(198);expect(d.lip.x).toBeLessThan(260);expect(d.lip.y).toBeLessThan(310);
 });
 it('pours only after commit, around a stationary lip over the jug, with a retained dose and continuous receiving level',()=>{
  for(const extra of variants){const source=pose('ready',0,extra);let previous=0,sawFlow=false;
   for(let n=0;n<=100;n+=.5){const p=park(source,n,{...extra,ladleCommitted:true}),d=p.ladleTransfer;assertAllocation(d);expect(d.committed).toBe(true);expect(d.destinationFraction).toBeGreaterThanOrEqual(previous-1e-10);previous=d.destinationFraction;
    if(d.flow>0){sawFlow=true;expect(d.stage).toBe('ladle-pour');expect(d.streamTarget).toEqual({kind:'jug',x:230,y:324});expect(d.lip.x).toBeCloseTo(242,9);expect(d.lip.y).toBeCloseTo(286,9);expect(p.tool.angle).toBeLessThan(-32);expect(p.tool.angle).toBeGreaterThan(-68);expect(d.loadedMl).toBeGreaterThan(0);expect(d.destinationFraction).toBeGreaterThan(0);}
    if(['ladle-return','ladle-rest','ladle-release','hands-withdraw','parked'].includes(d.stage)){expect(d.loadedMl).toBe(0);expect(d.destinationFraction).toBe(1);}
   }expect(sawFlow).toBe(true);expect(previous).toBe(1);
  }
 });
 it('recovers a canceled full or partial dose into its source before the empty ladle crosses back to its rest',()=>{
  for(const extra of variants)for(const source of [pose('pickup',90,extra),pose('dip',45,extra),pose('lift',65,extra),pose('ready',0,extra)]){
   const before=JSON.stringify(source);let last=source.ladleTransfer.loadedFraction,sawRecovery=false;
   for(let n=0;n<=100;n++){const p=park(source,n,extra),d=p.ladleTransfer;assertAllocation(d);expect(d.destinationFraction).toBe(0);expect(d.loadedFraction).toBeLessThanOrEqual(last+1e-10);last=d.loadedFraction;
    if(d.flow>0){sawRecovery=true;expect(d.stage).toBe('ladle-recover');expect(d.streamTarget).toEqual(d.source);expect(d.supportContact).toBe(1);expect(d.lip.x).toBeCloseTo(d.source.x,9);expect(d.lip.y).toBeCloseTo(d.source.y-36,9);}
    if(d.stage==='ladle-return'){expect(d.loadedMl).toBe(0);expect(bottom(p)).toBeLessThan(310);}
   }expect(sawRecovery).toBe(true);expect(last).toBe(0);expect(JSON.stringify(source)).toBe(before);
  }
 });
 it('starts any held cancellation exactly at its partial pose and keeps both arms reachable during recovery',()=>{
  for(const extra of variants)for(const phase of phases)for(const n of [0,15,55,90,100]){
   const source=pose(phase,n,extra);expect(projection(park(source,0,extra))).toEqual(projection(source));
   for(let r=0;r<=100;r+=4){const p=park(source,r,extra);if(p.held)expect(distance(p.grip,V.grip(p.tool,'reserveWater'))).toBeLessThan(1e-8);for(const side of ['left','right'])expect(V.arm({side,shoulder:p.shoulders[side],hand:side==='left'?p.grip:p.supportHand}).reachable).toBe(true);}
  }
 });
 it('joins and releases supporting contact only with stationary fingers on the handle, then releases the ladle at its rest',()=>{
  const source=pose('ready');let sawJoin=false,sawRelease=false;
  for(let n=0;n<=100;n+=.25){const p=park(source,n),d=p.ladleTransfer;if(d.supportContact>0){expect(distance(p.supportHand,{x:550,y:342})).toBeLessThan(1e-8);}
   if(d.stage==='support-approach'){sawJoin=true;expect(d.supportContact).toBe(0);}
   if(d.stage==='ladle-release'){sawRelease=true;expect(p.tool).toMatchObject(V.keyframe('reserveWater','pickup'));expect(d.loadedMl).toBe(0);expect(d.supportContact).toBe(0);}
   if(d.stage==='hands-withdraw'){expect(p.held).toBe(false);expect(d.ladleContact).toBe(0);expect(d.supportContact).toBe(0);}
  }expect(sawJoin&&sawRelease).toBe(true);expect(park(source,100)).toMatchObject({kind:null,parkedKind:'reserveWater',held:false,parking:false,ladleTransfer:{preview:false,loadedMl:0,sourceFraction:1,destinationFraction:0,flow:0}});
 });
 it('cancels a pregrasp reach without inventing a held ladle, support grip or water dose',()=>{
  const rest=park(pose('ready'),100),target=pose('pickup');
  for(const n of [0,25,60,90,99]){const source=V.reach(rest,target,n,{contactAware:true,articulatedApproach:true});expect(source.held).toBe(false);for(const r of [0,30,80,100]){const p=park(source,r);expect(p.held).toBe(false);expect(p.tool.visible).toBe(false);expect(p.ladleTransfer?.loadedMl||0).toBe(0);}}
 });
 it('can resume cancellation or a committed pour without restoring water to the wrong vessel',()=>{
  for(const committed of [false,true])for(const n of [8,20,35,55,75,90]){const source=park(pose('ready'),n,{ladleCommitted:committed});if(!source.held)continue;
   expect(projection(park(source,0))).toEqual(projection(source));const end=park(source,100);expect(end.ladleTransfer.loadedMl).toBe(0);expect(end.ladleTransfer.committed).toBe(committed);expect(end.ladleTransfer.destinationFraction).toBe(committed?1:0);expect(end.ladleTransfer.sourceFraction).toBe(committed?0:1);
  }
 });
 it('uses conserved visual allocation against both original and already-committed vessel quantities',()=>{
  const source=pose('ready',0,{actualMl:20}),amount=20;
  for(const committed of [false,true])for(let n=0;n<=100;n++){const p=park(source,n,{ladleCommitted:committed}),d=p.ladleTransfer,modelPot=committed?80:100,modelJug=committed?70:50,pot=committed?modelPot:modelPot-amount*(1-d.sourceFraction),jug=committed?modelJug-amount*(1-d.destinationFraction):modelJug+amount*d.destinationFraction;expect(pot+jug+d.loadedMl).toBeCloseTo(150,10);expect(pot).toBeGreaterThanOrEqual(80);expect(jug).toBeGreaterThanOrEqual(50);}
 });
 it('suppresses ancillary sway under reduced motion and goes directly to an empty, correctly allocated rest',()=>{
  for(const extra of variants)for(const phase of phases){const a=pose(phase,50,extra),b=pose(phase,50,{...extra,reducedMotion:true});expect(b.tool).toEqual(a.tool);expect(b.grip).toEqual(a.grip);expect(b.ladleTransfer).toEqual(a.ladleTransfer);for(const part of [b.body,b.head])expect([part.x,part.y,part.angle]).toEqual([0,0,0]);for(const committed of [false,true])expect(park(a,5,{...extra,ladleCommitted:committed,reducedMotion:true})).toEqual(park(a,100,{...extra,ladleCommitted:committed}));}
 });
 it('clamps finite dose, source depth and progress while never showing flow for an empty ladle',()=>{
  for(const amount of [0,-10,20,90,NaN,Infinity])for(const depth of [NaN,0,350,388,900])for(const n of [NaN,Infinity,-20,150]){const p=pose('pickup',n,{actualMl:amount,potSurfaceY:depth});assertAllocation(p.ladleTransfer);expect(p.ladleTransfer.amountMl).toBeGreaterThanOrEqual(0);expect(p.ladleTransfer.amountMl).toBeLessThanOrEqual(50);expect(p.ladleTransfer.source.y).toBeGreaterThanOrEqual(350);expect(p.ladleTransfer.source.y).toBeLessThanOrEqual(388);for(const part of [p.tool,p.grip,p.supportHand,p.body,p.head])expect(Number.isFinite(part.x)&&Number.isFinite(part.y)).toBe(true);}
  const empty=pose('ready',0,{actualMl:0});for(let n=0;n<=100;n++){const p=park(empty,n,{ladleCommitted:true});expect(p.ladleTransfer.loadedMl).toBe(0);expect(p.ladleTransfer.flow).toBe(0);}
 });
 it('paces only the opted-in ladle and locates the new activity burner knob away from its colander',()=>{
  for(let i=0;i<phases.length-1;i++)expect(V.transitionDuration('reserveWater',phases[i],phases[i+1],{ladleAware:true})).toBeGreaterThanOrEqual(V.transitionDuration('reserveWater',phases[i],phases[i+1]));expect(V.transitionDuration('reserveWater','ready',null,{ladleAware:true})).toBe(0);expect(V.parkDuration(pose('ready'),pose('ready'),{ladleAware:true})).toBeGreaterThan(V.parkDuration(pose('ready'),pose('ready'),{ladleAware:true,ladleCommitted:true}));
  for(const phase of ['reach','adjust']){expect(V.keyframe('setPotHeat',phase,{activity:'cook-save-and-drain-pasta'}).y).toBe(285);for(const activity of [undefined,'reserve-and-drain','cover-and-cook-pasta','separate-and-cook-pasta'])expect(V.keyframe('setPotHeat',phase,{activity}).y).toBe(375);}
  for(let n=0;n<=100;n++){const p=V.pose({kind:'setPotHeat',phase:'reach',nextPhase:'adjust',progress:n,activity:'cook-save-and-drain-pasta',initialSetting:1,setting:3});expect(p.grip).toMatchObject({x:650,y:285});expect(p.knob.contact).toBe(1);}
  for(const phase of ['carry','tip','level','ready']){const p=pose(phase,50,{activity:'cook-save-and-drain-pasta'});expect(p.supportHand).toEqual({x:590,y:282,angle:0});expect(p.supportHand.x+27).toBeLessThan(650-29);expect(p.ladleTransfer.supportContact).toBe(0);expect(pose(phase,50).supportHand).toEqual({x:620,y:290,angle:0});}
 });
 it('rests the new activity sampling spoon beside the colander with reachable loaded and empty hands',()=>{
  const samplingPhases=['pickup','dip','lift','check','ready'],options={activity:'cook-save-and-drain-pasta',sampleAware:true},home={x:770,y:351,angle:-40};
  expect(V.keyframe('samplePasta','pickup',options)).toEqual(home);
  for(const activity of ['reserve-and-drain','cover-and-check-pasta','separate-and-check-pasta']){const p=V.pose({kind:'samplePasta',phase:'pickup',sampleAware:true,activity});expect(p.tool).toMatchObject({x:690,y:350,angle:-32});expect(p.samplingTransfer.home).toBeUndefined();}
  for(const reducedMotion of [false,true])for(let i=0;i<samplingPhases.length;i++)for(let n=0;n<=100;n+=4){
   const p=V.pose({kind:'samplePasta',phase:samplingPhases[i],nextPhase:samplingPhases[i+1],progress:n,...options,reducedMotion});expect(p.samplingTransfer.home).toEqual(home);expect(distance(p.grip,V.grip(p.tool,'samplePasta'))).toBeLessThan(1e-8);
   for(const side of ['left','right'])expect(V.arm({side,shoulder:p.shoulders[side],hand:side==='right'?p.grip:p.supportHand}).reachable).toBe(true);
   if(n===0)for(const sampleCommitted of [false,true]){for(let r=0;r<=100;r+=5){const returned=V.park(p,p,r,{sampleAware:true,sampleCommitted});expect(returned.samplingTransfer.home).toEqual(home);for(const side of ['left','right'])expect(V.arm({side,shoulder:returned.shoulders[side],hand:side==='right'?returned.grip:returned.supportHand}).reachable).toBe(true);if(r===100){expect(returned.tool).toMatchObject(home);expect(returned.samplingTransfer.loaded).toBe(0);expect(returned.held).toBe(false);expect(bowl(returned).x-13).toBeGreaterThan(750);}}
   }
  }
 });
});
