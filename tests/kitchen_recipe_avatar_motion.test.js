import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const sequences={inspect:['pickup','dip','lift','ready'],pour:['pickup','measure','position','tilt','level','ready'],fold:['pickup','immerse','across','turn','ready'],mince:['pickup','position','cut','clear','ready'],serve:['pickup','scoop','lift','carry','tip','level','ready'],return:['pickup','scoop','lift','carry','tip','level','ready'],finish:['pickup','review','ready'],press:['pickup','position','contact','press','lift','ready'],blot:['pickup','position','contact','lift','ready'],wring:['pickup','carry','twist','release','ready'],addDry:['pickup','carry','tilt','level','ready'],returnDry:['pickup','scoop','carry','tip','ready'],addPasta:['pickup','lift','carry','tip','level','ready'],samplePasta:['pickup','dip','lift','check','ready'],reserveWater:['pickup','dip','lift','carry','tip','level','ready'],drainPasta:['pickup','lift','carry','tilt','level','ready']};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const worldDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
describe('Chef station anatomical motion and tool choreography',()=>{
 it('eases with a stationary start and finish and clamps invalid progress',()=>{
  expect(M.ease(-1)).toBe(0);expect(M.ease(Infinity)).toBe(0);expect(M.ease(2)).toBe(1);expect(M.ease(.5)).toBe(.5);
  expect(M.ease(.0001)).toBeLessThan(.000000001);expect(1-M.ease(.9999)).toBeLessThan(.000000001);
 });
 it('keeps both hands reachable and tools on the workstation across every activity and plate',()=>{
  const violations=[];
  for(const [kind,steps] of Object.entries(sequences))for(const plate of [0,1])for(const clove of [0,1])for(let i=0;i<steps.length;i++)for(let progress=0;progress<=100;progress++){
   const p=M.pose({kind,phase:steps[i],nextPhase:steps[i+1],progress,plate,clove}),label=kind+'/'+steps[i]+'/'+progress+'/plate'+plate+'/clove'+clove;
   if(!['x','y','angle'].every(key=>Number.isFinite(p.tool[key]))||p.tool.x<200||p.tool.x>750||p.tool.y<=230||p.tool.y>=380)violations.push(label+': tool outside finite work area');
   for(const [side,hand] of [[p.activeHand,p.grip],[p.activeHand==='left'?'right':'left',p.supportHand]]){
    const shoulder={x:side==='left'?373:526,y:229},a=M.arm({side,shoulder,hand});
    if(!a.reachable||distance(a.hand,hand)>=.01)violations.push(label+'/'+side+': wrist disconnected');
    if(Math.abs(worldDistance(shoulder,a.elbow)-108)>1e-7||Math.abs(worldDistance(a.elbow,a.hand)-126)>1e-7)violations.push(label+'/'+side+': bone stretched');
   }
  }
  expect(violations).toEqual([]);
 });
 it('keeps each transition endpoint continuous, with grips attached to the tool',()=>{
  for(const [kind,steps] of Object.entries(sequences))for(let i=0;i<steps.length-1;i++){
   const end=M.pose({kind,phase:steps[i],nextPhase:steps[i+1],progress:100}),start=M.pose({kind,phase:steps[i+1],nextPhase:steps[i+2],progress:0});
   expect(end.tool).toEqual(start.tool);expect(end.grip).toEqual(start.grip);expect(end.targetGrip).toEqual(end.grip);
   expect(end.grip).toEqual(M.grip(end.tool,kind));
  }
 });
 it('rocks the knife around a planted tip while keeping the hand on the handle',()=>{
  for(const clove of [0,1])for(const phase of ['position','cut'])for(const progress of [0,25,50,75,100]){
   const p=M.pose({kind:'mince',clove,phase,nextPhase:phase==='position'?'cut':'clear',progress});
   expect(p.tool.x).toBe(clove?465:405);expect(p.tool.y).toBe(350);expect(distance(p.grip,p.tool)).toBeCloseTo(116,8);
   expect(p.supportHand.y).toBeLessThan(p.tool.y-20);expect(p.supportHand.x).toBeLessThan((clove?540:480)-10);
  }
 });
 it('raises carry movements above the straight path and dips a fold into the pan',()=>{
  const p=M.pose({kind:'pour',phase:'measure',nextPhase:'position',progress:50}),a=M.keyframe('pour','measure'),b=M.keyframe('pour','position');
  expect(p.tool.y).toBeLessThan((a.y+b.y)/2-10);
  const f=M.pose({kind:'fold',phase:'immerse',nextPhase:'across',progress:50});expect(f.tool.y).toBeGreaterThan(360);expect(f.tool.x).toBeGreaterThan(450);expect(f.tool.x).toBeLessThan(574);
 });
 it('moves food pan to plate for serving, and plate to pan for returning',()=>{
  for(const plate of [0,1]){
   expect(M.pose({kind:'serve',plate}).activeHand).toBe(plate?'right':'left');
   expect(M.keyframe('serve','scoop',{plate}).x).toBe(500);expect(M.keyframe('serve','tip',{plate}).x).toBe(plate?720:285);
   expect(M.keyframe('return','scoop',{plate}).x).toBe(plate?720:285);expect(M.keyframe('return','tip',{plate}).x).toBe(514);
  }
  for(const phase of ['pickup','ready']){const p=M.pose({kind:'finish',phase});expect(p.grip.x).toBeGreaterThan(670);expect(p.supportHand.x).toBeLessThan(225);}
  for(const kind of ['serve','return']){expect(M.pose({kind,plate:1}).supportHand.x).toBeLessThan(225);expect(M.pose({kind,plate:0}).supportHand.x).toBeGreaterThan(670);}
  expect(M.pose({kind:'finish'}).held).toBe(false);expect(M.pose({kind:'finish'}).tool.visible).toBe(false);
 });
 it('clamps impossible wrists without stretching limbs and chooses downward elbows',()=>{
  for(const side of ['left','right'])for(const hand of [{x:9999,y:-1000},{x:side==='left'?373:526,y:229},{x:NaN,y:Infinity}]){
   const shoulder={x:side==='left'?373:526,y:229},a=M.arm({side,shoulder,hand});expect(worldDistance(shoulder,a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);
   expect(a.upperPath+a.lowerPath).not.toMatch(/NaN|Infinity/);
  }
  for(const side of ['left','right'])expect(M.arm({side}).elbow.y).toBeGreaterThan(280);
 });
 it('keeps elbows continuous throughout every tool transition',()=>{
  for(const [kind,steps] of Object.entries(sequences))for(const plate of [0,1])for(const clove of [0,1])for(let i=0;i<steps.length-1;i++){
   let previous=null;
   for(let progress=0;progress<=100;progress++){const p=M.pose({kind,phase:steps[i],nextPhase:steps[i+1],progress,plate,clove}),a=M.arm({side:p.activeHand,hand:p.grip});if(previous)expect(distance(previous,a.elbow),kind+'/'+steps[i]+'/'+progress).toBeLessThan(16);previous=a.elbow;}
  }
 });
 it('projects forward-reaching arms with natural elbows and genuine foreshortening',()=>{
  for(const side of ['left','right']){const a=M.arm({side});expect(a.elbow.y).toBeGreaterThan(300);expect(side==='left'?a.elbow.x<373:a.elbow.x>526).toBe(true);expect(a.hand.z).toBeGreaterThan(0);expect(distance(a.elbow,a.hand)).toBeLessThan(a.lengths.lower);}
  const across=M.pose({kind:'fold',phase:'immerse'}),a=M.arm({side:across.activeHand,hand:across.grip});expect(a.elbow.y).toBeGreaterThan(300);expect(a.elbow.x).toBeGreaterThan(526);
  for(const progress of [0,25,50,75,100]){const p=M.pose({kind:'inspect',phase:'ready',progress});expect(p.targetGrip).toBe(null);expect(p.tool).toEqual({...M.keyframe('inspect','ready'),visible:true});}
 });
 it('is deterministic, accepts frozen options, and has no kitchen state side effects',()=>{
  const input=Object.freeze({kind:'serve',phase:'lift',nextPhase:'carry',progress:50,plate:1}),first=M.pose(input);expect(M.pose(input)).toEqual(first);expect(Object.keys(input)).toHaveLength(5);
  expect(Object.keys(first)).not.toContain('state');expect(Object.keys(first)).not.toContain('seconds');
 });
 it('keeps moving shoulders, head, and both arms continuous without stretching any reach',()=>{
  const failures=[];
  for(const [kind,steps] of Object.entries(sequences)){
   const variants=kind==='press'?Array.from({length:14},(_,piece)=>({piece})):kind==='blot'?Array.from({length:8},(_,area)=>({area})):kind==='mince'?[{clove:0},{clove:1}]:kind==='serve'||kind==='return'?[{plate:0},{plate:1}]:[{}];
   for(const variant of variants)for(let index=0;index<steps.length-1;index++){
    let previous=null;
    for(let progress=0;progress<=100;progress++){
     const p=M.pose({...variant,kind,phase:steps[index],nextPhase:steps[index+1],progress});
     const arms={};
     for(const side of ['left','right']){
      const hand=side===p.activeHand?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]});arms[side]=a;
      if(!a.reachable||distance(hand,a.hand)>.001||Math.abs(worldDistance(p.shoulders[side],a.elbow)-108)>1e-7||Math.abs(worldDistance(a.elbow,a.hand)-126)>1e-7)failures.push(kind+'/'+index+'/'+progress+'/'+side+': invalid reach');
      if(previous&&distance(previous.arms[side].elbow,a.elbow)>12)failures.push(kind+'/'+index+'/'+progress+'/'+side+': elbow jump');
     }
     if(Math.abs(p.body.x)>3.5||Math.abs(p.body.angle)>2.4||Math.abs(p.head.angle)>6||Math.abs(p.gaze.x)>2||p.gaze.y>1.4)failures.push(kind+': attention outside natural bounds');
     previous={p,arms};
    }
    const end=M.pose({...variant,kind,phase:steps[index],nextPhase:steps[index+1],progress:100}),start=M.pose({...variant,kind,phase:steps[index+1],nextPhase:steps[index+2],progress:0});
    for(const field of ['body','head','gaze','shoulders','supportHand']){
     if(JSON.stringify(end[field])!==JSON.stringify(start[field])){
      const close=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<1e-10:a&&typeof a==='object'?Object.keys(a).every(k=>close(a[k],b[k])):a===b;
      if(!close(end[field],start[field]))failures.push(kind+'/'+index+': '+field+' boundary jump');
     }
    }
   }
  }
  expect(failures).toEqual([]);
 });
 it('keeps tool positions meaningful when reduced motion suppresses ancillary movement',()=>{
  const input={kind:'press',piece:13,phase:'contact',nextPhase:'press',progress:65},moving=M.pose(input),still=M.pose({...input,reducedMotion:true});
  expect(still.tool).toEqual(moving.tool);expect(still.grip).toEqual(moving.grip);expect(still.supportHand).toEqual(moving.supportHand);
  expect(still.body).toEqual({x:0,y:0,angle:0,pivot:{x:450,y:335}});expect(still.head).toEqual({x:0,y:0,angle:0,pivot:{x:450,y:181}});expect(still.gaze.x).toBe(0);expect(still.gaze.y).toBe(0);
  expect(still.shoulders.left).toEqual({x:373,y:229,angle:0});expect(still.shoulders.right).toEqual({x:526,y:229,angle:0});
  for(const side of ['left','right'])expect(M.arm({side,shoulder:still.shoulders[side],hand:side===still.activeHand?still.grip:still.supportHand}).reachable).toBe(true);
 });
 it('targets each tomato and cloth region accurately, and keeps pressure localized',()=>{
  for(let piece=0;piece<14;piece++){
   const p=M.pose({kind:'press',piece,phase:'contact',nextPhase:'press',progress:100});expect(p.activeHand).toBe('left');expect(p.contact).toEqual({x:420+piece%7*28,y:341+Math.floor(piece/7)*16,amount:1});expect(p.tool.x).toBe(p.contact.x);expect(p.tool.y).toBe(p.contact.y+2);expect(p.supportHand).toEqual({x:705,y:349,angle:-8});
  }
  for(let area=0;area<8;area++){
   const p=M.pose({kind:'blot',area,phase:'position',nextPhase:'contact',progress:100});expect(p.tool.x).toBe(355+area%4*70);expect(p.tool.y).toBe(335+Math.floor(area/4)*23);expect(p.cloth.compression).toBe(1);expect(p.contact.amount).toBe(1);
  }
  expect(M.keyframe('press','press',{piece:Infinity})).toEqual(M.keyframe('press','press',{piece:0}));expect(M.keyframe('blot','contact',{area:99})).toEqual(M.keyframe('blot','contact',{area:7}));
 });
 it('uses both hands to twist the cloth only after carrying it over the bowl',()=>{
  for(const progress of [0,25,50,75,100]){
   const p=M.pose({kind:'wring',phase:'carry',nextPhase:'twist',progress});expect(p.tool.x).toBe(300);expect(p.tool.y).toBe(306);expect(distance(p.grip,p.tool)).toBeCloseTo(25,8);expect(distance(p.supportHand,p.tool)).toBeCloseTo(25,8);expect(distance(p.grip,p.supportHand)).toBeCloseTo(50,8);expect(p.cloth.compression).toBe(M.ease(progress/100));
  }
  const carry=M.pose({kind:'wring',phase:'pickup',nextPhase:'carry',progress:0}),ready=M.pose({kind:'wring',phase:'ready'});expect(carry.supportHand).toEqual(ready.supportHand);expect(ready.cloth.dripping).toBe(false);expect(ready.cloth.compression).toBe(0);
 });
 it('paces preparation, contact, and carrying without introducing simulated time',()=>{
  expect(M.transitionDuration('mince','cut','clear')).toBeLessThan(M.transitionDuration('serve','lift','carry'));expect(M.transitionDuration('wring','carry','twist')).toBeGreaterThan(M.transitionDuration('wring','twist','release'));
  for(const [kind,steps] of Object.entries(sequences))for(let i=0;i<steps.length-1;i++){const ms=M.transitionDuration(kind,steps[i],steps[i+1]);expect(ms).toBeGreaterThanOrEqual(300);expect(ms).toBeLessThanOrEqual(1000);expect(ms).toBe(M.transitionDuration(kind,steps[i],steps[i+1]));}
  expect(M.transitionDuration('press','ready')).toBe(0);expect(M.transitionDuration('inspect','ready',null)).toBe(0);
 });
 it('reaches with the same physical hands when the next action switches tool hands',()=>{
  const from=M.pose({kind:'pour',phase:'ready'}),to=M.pose({kind:'fold',phase:'pickup'}),start=M.reach(from,to,0),middle=M.reach(from,to,50),finish=M.reach(from,to,100);
  expect(start.activeHand).toBe('right');expect(start.grip.x).toBe(from.supportHand.x);expect(start.grip.y).toBe(from.supportHand.y);expect(start.supportHand.x).toBe(from.grip.x);expect(start.supportHand.y).toBe(from.grip.y);
  expect(start.body).toEqual(from.body);expect(start.head).toEqual(from.head);expect(middle.kind).toBe(null);expect(middle.transitionKind).toBe('fold');expect(middle.reaching).toBe(true);expect(middle.held).toBe(false);expect(middle.tool.visible).toBe(false);expect(middle.pose).toBe(null);
  expect(middle.targetGrip).toEqual(to.grip);expect(finish).toEqual(to);expect(finish).not.toBe(to);expect(finish.grip).not.toBe(to.grip);expect(finish.tool.visible).toBe(true);
 });
 it('raises an empty hand during a long reach while preserving the exact endpoints',()=>{
  const from=M.pose({kind:'finish',phase:'ready'}),to=M.pose({kind:'wring',phase:'pickup'}),middle=M.reach(from,to,50);
  expect(middle.grip.x).toBeCloseTo((from.grip.x+to.grip.x)/2,10);expect(middle.grip.y).toBeLessThan((from.grip.y+to.grip.y)/2);expect(M.reach(from,to,-100)).toEqual(M.reach(from,to,0));expect(M.reach(from,to,NaN)).toEqual(M.reach(from,to,0));expect(M.reach(from,to,200)).toEqual(to);
  expect(M.reach(from,to,100).supportHand).toEqual(to.supportHand);expect(M.reach(from,to,100).shoulders).toEqual(to.shoulders);
 });
 it('supports reduced-motion and interrupted reaches without state mutation or a position jump',()=>{
  const freeze=value=>{Object.freeze(value);Object.values(value).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return value;},from=freeze(M.pose({kind:'press',phase:'ready'})),to=freeze(M.pose({kind:'inspect',phase:'pickup'})),before=JSON.stringify({from,to}),moving=M.reach(from,to,43);
  expect(M.reach(from,to,0,{reducedMotion:true})).toEqual(to);expect(JSON.stringify({from,to})).toBe(before);expect(M.reach(from,to,43)).toEqual(moving);
  const third=M.pose({kind:'serve',plate:0,phase:'pickup'}),restarted=M.reach(moving,third,0),hands=p=>p.activeHand==='left'?{left:p.grip,right:p.supportHand}:{left:p.supportHand,right:p.grip};
  for(const side of ['left','right']){expect(hands(restarted)[side].x).toBe(hands(moving)[side].x);expect(hands(restarted)[side].y).toBe(hands(moving)[side].y);}
  expect(restarted.body).toEqual(moving.body);expect(restarted.head).toEqual(moving.head);expect(Object.keys(moving)).not.toContain('state');expect(Object.keys(moving)).not.toContain('seconds');
 });
 it('keeps both arms connected for every change between existing tool pickups',()=>{
  const variants=Object.keys(sequences).flatMap(kind=>kind==='serve'||kind==='return'?[{kind,plate:0},{kind,plate:1}]:[{kind}]),failures=[];
  for(const a of variants)for(const b of variants){
   const from=M.pose({...a,phase:'ready'}),to=M.pose({...b,phase:'pickup'});let previous=null;
   for(let progress=0;progress<=100;progress++){
    const p=M.reach(from,to,progress),arms={};
    for(const side of ['left','right']){const hand=side===p.activeHand?p.grip:p.supportHand,arm=M.arm({side,hand,shoulder:p.shoulders[side]});arms[side]=arm;if(!arm.reachable||distance(hand,arm.hand)>1e-7||Math.abs(worldDistance(p.shoulders[side],arm.elbow)-108)>1e-7||Math.abs(worldDistance(arm.elbow,arm.hand)-126)>1e-7)failures.push(a.kind+'→'+b.kind+'/'+progress+'/'+side+': disconnected');if(previous&&distance(previous[side].elbow,arm.elbow)>12)failures.push(a.kind+'→'+b.kind+'/'+progress+'/'+side+': elbow jump');}
    if(progress<100&&(p.held||p.tool.visible||p.kind!==null))failures.push(a.kind+'→'+b.kind+'/'+progress+': tool attached too early');previous=arms;
   }
  }
  expect(failures).toEqual([]);
 });
 it('paces empty-hand reaches by distance and skips an already aligned pickup',()=>{
  const from=M.pose({kind:'pour',phase:'ready'}),to=M.pose({kind:'inspect',phase:'pickup'});
  expect(M.reachDuration(from,from)).toBe(0);expect(M.reachDuration(from,to)).toBeGreaterThanOrEqual(320);expect(M.reachDuration(from,to)).toBeLessThanOrEqual(650);expect(M.reachDuration(from,to)).toBe(M.reachDuration(to,from));
  const p=M.reach(undefined,undefined,30);expect(p.grip.x+p.grip.y+p.supportHand.x+p.supportHand.y).not.toBeNaN();expect(p.held).toBe(false);
 });
 it('keeps both hands on the weighing tray and directs each transfer toward its vessel',()=>{
  for(let i=0;i<sequences.addPasta.length;i++)for(const progress of [0,25,50,75,100]){
   const p=M.pose({kind:'addPasta',phase:sequences.addPasta[i],nextPhase:sequences.addPasta[i+1],progress});expect(p.activeHand).toBe('right');expect(distance(p.tool,p.grip)).toBeCloseTo(60,8);expect(distance(p.tool,p.supportHand)).toBeCloseTo(60,8);expect(distance(p.grip,p.supportHand)).toBeCloseTo(120,8);
  }
  const tray=M.pose({kind:'addPasta',phase:'tip'}),packet=M.pose({kind:'addDry',phase:'tilt'}),scoop=M.pose({kind:'returnDry',phase:'tip'});expect(tray.spout.x).toBeGreaterThan(530);expect(tray.spout.x).toBeLessThan(590);expect(tray.spout.y).toBeLessThan(350);expect(packet.spout.x).toBeGreaterThan(330);expect(packet.spout.x).toBeLessThan(370);expect(packet.spout.y).toBeLessThan(320);expect(packet.tool.angle).toBeLessThan(-90);expect(packet.spout.y).toBeGreaterThan(packet.tool.y);expect(scoop.spout.x).toBeGreaterThan(640);expect(scoop.spout.y).toBeLessThan(300);
  expect(M.pose({kind:'addDry',grams:10,phase:'tilt'})).toEqual(M.pose({kind:'addDry',grams:80,phase:'tilt'}));
 });
 it('orients each grasp to its tool and fixes supporting fingers at their contact',()=>{
  for(const [kind,gesture,offset] of [['inspect','wrap',0],['press','wrap',0],['mince','pinch',90],['pour','hook',0],['addDry','pinch',90],['addPasta','handle',90]]){
   const p=M.pose({kind,phase:'pickup'}),h=M.handPresentation(p,p.activeHand);expect(h.gesture).toBe(gesture);expect(h.rotation).toBe(p.tool.angle+offset);expect(h.contact).toBe(1);expect(h.role).toBe('working');expect(h.anchor).toEqual({x:p.grip.x,y:p.grip.y});
  }
  for(const progress of [0,20,50,80,100]){const p=M.pose({kind:'press',phase:'pickup',nextPhase:'position',progress}),h=M.handPresentation(p,'right');expect(h.rotation).toBe(82);expect(h.anchor).toEqual({x:705,y:349});expect(h.role).toBe('stabilizing');}
  const p=M.pose({kind:'mince',phase:'position',nextPhase:'cut',progress:55});expect(M.handPresentation(p,'left')).toMatchObject({gesture:'claw',rotation:-28,closure:.9,role:'stabilizing'});
 });
 it('flattens blotting fingers and tightens the wringing grip continuously with pressure',()=>{
  const hovering=M.handPresentation(M.pose({kind:'blot',phase:'position',nextPhase:'contact',progress:0}),'right'),pressed=M.handPresentation(M.pose({kind:'blot',phase:'position',nextPhase:'contact',progress:100}),'right');expect(hovering.gesture).toBe('palm');expect(hovering.pressure).toBe(0);expect(pressed.pressure).toBe(1);expect(pressed.closure).toBeLessThan(hovering.closure);
  for(const side of ['left','right']){const loose=M.handPresentation(M.pose({kind:'wring',phase:'carry',nextPhase:'twist',progress:0}),side),tight=M.handPresentation(M.pose({kind:'wring',phase:'carry',nextPhase:'twist',progress:100}),side);expect(tight.gesture).toBe('pinch');expect(tight.closure).toBeGreaterThan(loose.closure);expect(tight.pressure).toBe(1);expect(tight.contact).toBe(1);}
  for(const reducedMotion of [false,true])for(const [phase,nextPhase] of [['pickup','carry'],['release','ready']]){let previous=null;for(let progress=0;progress<=100;progress++){const h=M.handPresentation(M.pose({kind:'wring',phase,nextPhase,progress,reducedMotion}),'left');if(previous!==null)expect(Math.abs(((h.rotation-previous)%360+540)%360-180)).toBeLessThan(5);previous=h.rotation;}}
 });
 it('preserves hand orientation, finger closure and exact anchors at every phase boundary',()=>{
  const angularDifference=(a,b)=>Math.abs(((a-b)%360+540)%360-180),errors=[];
  for(const [kind,steps] of Object.entries(sequences))for(let i=0;i<steps.length-1;i++){
   const end=M.pose({kind,phase:steps[i],nextPhase:steps[i+1],progress:100}),start=M.pose({kind,phase:steps[i+1],nextPhase:steps[i+2],progress:0});
   for(const side of ['left','right']){const a=M.handPresentation(end,side),b=M.handPresentation(start,side);if(angularDifference(a.rotation,b.rotation)>1e-8||Math.abs(a.closure-b.closure)>1e-8||Math.abs(a.pressure-b.pressure)>1e-8||distance(a.anchor,b.anchor)>1e-8)errors.push(kind+'/'+steps[i]+'/'+side);}
  }
  expect(errors).toEqual([]);
 });
 it('opens the hand during empty travel and takes the shortest turn into the next grip',()=>{
  const from=M.pose({kind:'mince',phase:'ready'}),to=M.pose({kind:'pour',phase:'pickup'}),middle=M.reach(from,to,50);
  for(const side of ['left','right']){const h=M.handPresentation(middle,side);expect(h.closure).toBe(0);expect(h.contact).toBe(0);expect(h.role).toBe('free');}
  for(const side of ['left','right']){
   let previous=M.handPresentation(from,side).rotation;
   for(let progress=0;progress<=100;progress++){const p=M.reach(from,to,progress),h=M.handPresentation(p,side),change=Math.abs(((h.rotation-previous)%360+540)%360-180);expect(change).toBeLessThan(5);previous=h.rotation;const hand=p.activeHand===side?p.grip:p.supportHand;expect(h.anchor).toEqual({x:hand.x,y:hand.y});}
   expect(M.handPresentation(M.reach(from,to,100),side)).toEqual(M.handPresentation(to,side));
  }
 });
 it('uses the final visible hand positions for idle overrides and never mutates the pose',()=>{
  const p=M.pose({kind:'addPasta',phase:'pickup'});p.kind=null;p.held=false;p.grip={x:705,y:349};p.supportHand={x:220,y:338};const serialized=JSON.stringify(p),h=M.handPresentation(p,'right'),a=M.arm({side:'right',hand:p.grip,shoulder:p.shoulders.right});expect(h.anchor).toEqual({x:705,y:349});expect(h.rotation).toBe(a.wristAngle+90);expect(h.gesture).toBe('relaxed');expect(h.contact).toBe(0);expect(JSON.stringify(p)).toBe(serialized);
  const reduced=M.pose({kind:'drainPasta',phase:'tilt',reducedMotion:true});expect(M.handPresentation(reduced,'right').gear).toBe('mitt');expect(M.handPresentation(reduced,'left').gear).toBe('mitt');
 });
 it('carries the pot level with protected hands before directing its lip over the colander',()=>{
  for(let i=0;i<sequences.drainPasta.length;i++)for(const progress of [0,25,50,75,100]){
   const phase=sequences.drainPasta[i],p=M.pose({kind:'drainPasta',phase,nextPhase:sequences.drainPasta[i+1],progress});expect(distance(p.grip,p.supportHand)).toBeCloseTo(200,8);expect(distance(p.grip,p.tool)).toBeCloseTo(Math.hypot(100,8),8);expect(distance(p.supportHand,p.tool)).toBeCloseTo(Math.hypot(100,8),8);
   if(phase==='pickup'||phase==='lift')expect(p.tool.angle).toBe(0);
   for(const side of ['left','right'])expect(M.handPresentation(p,side)).toMatchObject({gesture:'handle',gear:'mitt',rotation:p.tool.angle+90,contact:1});
  }
  const tipped=M.pose({kind:'drainPasta',phase:'tilt'});expect(tipped.spout.x).toBeGreaterThan(630);expect(tipped.spout.x).toBeLessThan(680);expect(tipped.spout.y).toBeLessThan(365);expect(tipped.spout.y).toBeGreaterThan(tipped.tool.y);
  const reserve=M.pose({kind:'reserveWater',phase:'tip'});expect(reserve.activeHand).toBe('left');expect(M.handPresentation(reserve,'right')).toMatchObject({gear:'mitt',role:'stabilizing',anchor:{x:550,y:342}});expect(reserve.spout.x).toBeGreaterThan(220);expect(reserve.spout.x).toBeLessThan(270);
  const sample=M.pose({kind:'samplePasta',phase:'check'});expect(M.handPresentation(sample,'left')).toMatchObject({gear:'mitt',role:'stabilizing',anchor:{x:350,y:342}});
 });
 it('empties a measured sauce jug only during its downward tilt and stops at the endpoint',()=>{
  let previous=0,flowing=0;
  for(let progress=0;progress<=100;progress++){
   const p=M.pose({kind:'pour',phase:'position',nextPhase:'tilt',progress}),cue=M.sauceInteraction(p);
   expect(cue.transferred).toBeGreaterThanOrEqual(previous);expect(cue.transferred+cue.remaining).toBeCloseTo(1,12);expect(cue.spout).toEqual({x:p.spout.x,y:p.spout.y});
   if(p.tool.angle>=-30)expect(cue.transferred).toBe(0);
   if(cue.flowing){flowing++;expect(p.tool.angle).toBeLessThan(-30);expect(cue.transferred).toBeGreaterThan(0);expect(cue.remaining).toBeGreaterThan(0);}
   previous=cue.transferred;
  }
  expect(flowing).toBeGreaterThan(0);expect(previous).toBe(1);
  for(const [phase,nextPhase] of [['pickup','measure'],['measure','position']])for(const progress of [0,50,100])expect(M.sauceInteraction(M.pose({kind:'pour',phase,nextPhase,progress}))).toMatchObject({transferred:0,remaining:1,flowing:false});
  for(const [phase,nextPhase] of [['tilt','level'],['level','ready'],['ready',null]])for(const progress of [0,50,100])expect(M.sauceInteraction(M.pose({kind:'pour',phase,nextPhase,progress}))).toMatchObject({transferred:1,remaining:0,flowing:false});
  expect(M.sauceInteraction(M.pose({kind:'pour',phase:'position',nextPhase:'tilt',progress:100})).flowing).toBe(false);
 });
 it('keeps sauce contact on the actual spoon bowl and fades it out before parking',()=>{
  const middle=M.pose({kind:'fold',phase:'immerse',nextPhase:'across',progress:50}),sweep=M.sauceInteraction(middle),upturn=M.sauceInteraction(M.pose({kind:'fold',phase:'across',nextPhase:'turn',progress:50}));
  expect(sweep.bowl.x).toBeCloseTo(middle.tool.x-7*Math.sin(middle.tool.angle*Math.PI/180),10);expect(sweep.bowl.y).toBeCloseTo(middle.tool.y+7*Math.cos(middle.tool.angle*Math.PI/180),10);expect(sweep.contact).toBe(1);expect(sweep.pressure).toBeGreaterThan(upturn.pressure);expect(sweep.immersion).toBeGreaterThan(upturn.immersion);
  for(const phase of ['pickup','ready'])expect(M.sauceInteraction(M.pose({kind:'fold',phase}))).toMatchObject({contact:0,immersion:0,pressure:0});
  const outside={...middle,tool:{x:700,y:349,angle:0}};expect(M.sauceInteraction(outside)).toMatchObject({contact:0,immersion:0,pressure:0});
 });
 it('keeps sauce visual quantities continuous across checkpoints and useful in reduced motion',()=>{
  for(const kind of ['pour','fold']){
   const steps=sequences[kind];
   for(let i=0;i<steps.length;i++){
    let previous=null;
    for(let progress=0;progress<=100;progress++){
     const options={kind,phase:steps[i],nextPhase:steps[i+1],progress},p=M.pose(options),cue=M.sauceInteraction(p),reduced=M.sauceInteraction(M.pose({...options,reducedMotion:true}));
     expect(reduced).toEqual(cue);
     const amounts=kind==='pour'?['transferred','remaining']:['contact','immersion','pressure'];
     for(const name of amounts){expect(cue[name]).toBeGreaterThanOrEqual(0);expect(cue[name]).toBeLessThanOrEqual(1);if(previous)expect(Math.abs(cue[name]-previous[name])).toBeLessThan(.15);}
     if(kind==='fold'&&cue.contact>0)expect(((cue.bowl.x-514)/132)**2+((cue.bowl.y-349)/34)**2).toBeLessThan(1);
     previous=cue;
    }
    if(steps[i+1]){const end=M.sauceInteraction(M.pose({kind,phase:steps[i],nextPhase:steps[i+1],progress:100})),start=M.sauceInteraction(M.pose({kind,phase:steps[i+1],nextPhase:steps[i+2],progress:0}));expect(end).toEqual(start);}
   }
  }
 });
 it('never turns a visual sauce cue into a new reading or mutates its source pose',()=>{
  const p=M.pose({kind:'pour',phase:'position',nextPhase:'tilt',progress:75}),before=JSON.stringify(p);Object.freeze(p.tool);Object.freeze(p.spout);Object.freeze(p);
  const cue=M.sauceInteraction(p);expect(M.sauceInteraction(p)).toEqual(cue);expect(JSON.stringify(p)).toBe(before);cue.spout.x=0;expect(p.spout.x).not.toBe(0);expect(Object.keys(cue)).not.toContain('state');expect(Object.keys(cue)).not.toContain('reading');
  for(const input of [undefined,{},M.pose({kind:'inspect'}),{...p,held:false},{...p,tool:{x:NaN,y:0,angle:0}}])expect(M.sauceInteraction(input)).toBe(null);
  expect(M.sauceInteraction(M.reach(p,M.pose({kind:'fold'}),50))).toBe(null);
 });
 it('returns the actually held tool without a hand jump and releases at its exact parked anchor',()=>{
  for(const kind of Object.keys(sequences).filter(kind=>kind!=='finish')){
   const steps=sequences[kind],from=M.pose({kind,phase:steps[1],nextPhase:steps[2],progress:55}),home=M.pose({kind,phase:'ready'});from.pose=from.tool;
   const initial=M.park(from,home,0),final=M.park(from,home,100);
   expect(initial.tool).toEqual(from.tool);expect(initial.pose).toBe(initial.tool);expect(initial.grip).toEqual(from.grip);expect(distance(initial.supportHand,from.supportHand)).toBeLessThan(1e-8);expect(initial.body).toEqual(from.body);
   for(const side of ['left','right']){const a=M.handPresentation(initial,side),b=M.handPresentation(from,side);expect(a.rotation).toBeCloseTo(b.rotation,8);expect(a.closure).toBeCloseTo(b.closure,8);expect(M.handPresentation(final,side)).toMatchObject({contact:0,closure:.18,pressure:0,role:'free'});}
   expect(final).toMatchObject({kind:null,parkedKind:kind,held:false,parking:false,parkStage:'parked',targetGrip:null,pose:null});expect(final.tool).toEqual({...home.tool,visible:false});expect(final.grip).toEqual(home.grip);expect(final.supportHand).toEqual(home.supportHand);
   const next=M.pose({kind:kind==='pour'?'fold':'pour',phase:'pickup'}),reach=M.reach(final,next,0),physical=p=>p.activeHand==='left'?{left:p.grip,right:p.supportHand}:{left:p.supportHand,right:p.grip};
   for(const side of ['left','right'])expect(distance(physical(reach)[side],physical(final)[side])).toBeLessThan(1e-8);
  }
 });
 it('lifts clear, levels a tipped vessel, carries it level, and lowers before finger release',()=>{
  for(const [kind,phase] of [['pour','tilt'],['addDry','tilt'],['returnDry','tip'],['addPasta','tip'],['drainPasta','tilt'],['reserveWater','tip']]){
   const from=M.pose({kind,phase}),home=M.pose({kind,phase:'ready'});let carried=false;
   for(let progress=0;progress<100;progress++){
    const p=M.park(from,home,progress);expect(p.held).toBe(true);expect(p.pose).toBe(p.tool);expect(p.grip).toEqual(M.grip(p.tool,kind));
    if(p.parkStage==='lift'||p.parkStage==='level')expect(p.tool.x).toBe(from.tool.x);
    if(p.parkStage==='carry'){carried=true;expect(p.tool.angle).toBe(0);expect(p.tool.y).toBeLessThanOrEqual(Math.min(from.tool.y,home.tool.y,310));}
    if(p.parkStage==='lower'||p.parkStage==='release')expect(p.tool.x).toBe(home.tool.x);
    if(p.parkStage==='release')expect(p.tool).toEqual(home.tool);
    if(kind==='addPasta'||kind==='drainPasta'){expect(distance(p.grip,p.supportHand)).toBeCloseTo(kind==='addPasta'?120:200,8);for(const side of ['left','right'])expect(M.handPresentation(p,side).gear).toBe(kind==='drainPasta'?'mitt':'bare');}
   }
   expect(carried).toBe(true);
  }
 });
 it('untwists a joined cloth before the support hand releases and keeps return effects inactive',()=>{
  const from=M.pose({kind:'wring',phase:'twist'}),home=M.pose({kind:'wring',phase:'ready'}),early=M.park(from,home,20),carried=M.park(from,home,60);
  expect(distance(early.grip,early.supportHand)).toBeCloseTo(50,8);expect(M.handPresentation(early,'left').contact).toBe(1);expect(early.cloth.dripping).toBe(false);
  expect(carried.parkStage).toBe('carry');expect(carried.tool.angle).toBe(0);expect(carried.supportHand.x).toBeGreaterThanOrEqual(home.supportHand.x);expect(carried.supportHand.x).toBeLessThanOrEqual(from.tool.x-25);expect(M.handPresentation(carried,'left').contact).toBe(0);expect(carried.cloth).toEqual({compression:0,twist:0,dripping:false});
  for(const kind of ['press','blot','fold']){const p=M.park(M.pose({kind,phase:kind==='fold'?'immerse':'contact'}),M.pose({kind,phase:'ready'}),50);expect(p.contact).toBeUndefined();expect(p.targetGrip).toBe(null);expect(p.next).toBe(null);}
 });
 it('returns empty pickup hands without spawning a tool or leaving an action target',()=>{
  const home=M.pose({kind:'pour',phase:'ready'}),from=M.reach(M.pose({kind:'fold',phase:'ready'}),M.pose({kind:'pour',phase:'pickup'}),42),physical=p=>p.activeHand==='left'?{left:p.grip,right:p.supportHand}:{left:p.supportHand,right:p.grip};
  for(const progress of [0,25,50,75,100]){const p=M.park(from,home,progress);expect(p.held).toBe(false);expect(p.kind).toBe(null);expect(p.tool.visible).toBe(false);expect(p.next).toBe(null);expect(p.targetGrip).toBe(null);if(progress===0)for(const side of ['left','right'])expect(distance(physical(p)[side],physical(from)[side])).toBeLessThan(1e-8);}
  expect(M.park(undefined,undefined,50).held).toBe(false);
 });
 it('supports immediate reduced-motion parking, clamping and interruptions without mutating either pose',()=>{
  const freeze=value=>{Object.freeze(value);Object.values(value).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return value;},from=freeze(M.pose({kind:'drainPasta',phase:'carry',nextPhase:'tilt',progress:72})),home=freeze(M.pose({kind:'drainPasta',phase:'ready'})),serialized=JSON.stringify({from,home}),final=M.park(from,home,100);
  expect(M.park(from,home,0,{reducedMotion:true})).toEqual(final);expect(M.park(from,home,200)).toEqual(final);expect(M.park(from,home,-10)).toEqual(M.park(from,home,0));expect(M.park(from,home,NaN)).toEqual(M.park(from,home,0));
  const partial=M.park(from,home,52),restart=M.park(partial,home,0);expect(restart.grip).toEqual(partial.grip);expect(restart.supportHand).toEqual(partial.supportHand);expect(restart.body).toEqual(partial.body);expect(JSON.stringify({from,home})).toBe(serialized);expect(Object.keys(final)).not.toContain('state');expect(Object.keys(final)).not.toContain('seconds');
  expect(M.parkDuration(from,home)).toBeGreaterThanOrEqual(800);expect(M.parkDuration(from,home)).toBeLessThanOrEqual(1300);
 });
 it('keeps long cross-body tool returns and near-boundary finger pressure finite and continuous',()=>{
  const origins=[{kind:'press',piece:13,phase:'contact',nextPhase:'press',progress:75},{kind:'wring',phase:'twist'},{kind:'addDry',phase:'tilt'}];
  for(const options of origins){const from=M.pose(options),home=M.pose({...options,phase:'ready',nextPhase:null,progress:0});let previous=null;
   for(const progress of [...Array.from({length:101},(_,i)=>i),13.99999,14.00001,15.99999,16.00001,33.99999,34.00001,75.99999,76.00001,89.99999,90.00001].sort((a,b)=>a-b)){
    const p=M.park(from,home,progress),arms={};
    for(const side of ['left','right']){const hand=side===p.activeHand?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]}),h=M.handPresentation(p,side);arms[side]=a;expect(a.reachable).toBe(true);expect(distance(a.hand,hand)).toBeLessThan(1e-7);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);expect(h.pressure).toBeGreaterThanOrEqual(0);expect(h.pressure).toBeLessThanOrEqual(1);if(previous)expect(distance(previous[side].elbow,a.elbow)).toBeLessThan(12);}
    previous=arms;
   }
  }
 });
 it('targets the staged mushroom anchor and closes the tongs before lifting a single preview piece',()=>{
  const opts={kind:'turnMushroom',piece:8,pieceX:468,pieceY:366},approach=M.pose({...opts,phase:'position',nextPhase:'grip',progress:99}),touch=M.pose({...opts,phase:'grip'}),lift=M.pose({...opts,phase:'lift',nextPhase:'turn',progress:50});
  expect(approach.food.preview).toBe(false);expect(touch.food).toMatchObject({piece:8,origin:{x:468,y:366},position:{x:468,y:366},preview:true,attached:true,lift:0,roll:0});expect(touch.tongs.closure).toBe(1);
  expect(lift.food).toMatchObject({position:{x:468,y:342},preview:true,attached:true,lift:24,roll:.5});expect(lift.tool.angle).toBe(0);expect(lift.grip).toEqual(M.grip(lift.tool,'turnMushroom'));expect(distance(lift.grip,lift.tool)).toBeCloseTo(66,10);expect(lift.activeHand).toBe('left');expect(M.handPresentation(lift,'right')).toMatchObject({gear:'mitt',contact:1,anchor:{x:705,y:349}});
  const pickup=M.pose({...opts,phase:'pickup'}),reaching=M.reach(M.pose({kind:'fold',phase:'ready'}),pickup,50);expect(pickup.food.preview).toBe(false);expect(reaching.held).toBe(false);expect(reaching.food?.preview||false).toBe(false);
 });
 it('preserves new motion contacts and limb lengths for every piece, phase and reduced-motion mode',()=>{
  const steps=['pickup','position','grip','lift','turn','lower','ready'];
  for(let piece=0;piece<14;piece++)for(const reducedMotion of [false,true])for(let i=0;i<steps.length;i++)for(const progress of [0,25,50,75,100]){
   const p=M.pose({kind:'turnMushroom',piece,phase:steps[i],nextPhase:steps[i+1],progress,reducedMotion});expect(p.grip).toEqual(M.grip(p.tool,p.kind));expect(p.food.lift).toBeGreaterThanOrEqual(0);expect(p.food.lift).toBeLessThanOrEqual(24);
   for(const side of ['left','right']){const hand=side===p.activeHand?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]});expect(a.reachable).toBe(true);expect(distance(a.hand,hand)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}
   if(p.food.attached)expect(p.food.position).toEqual({x:p.tool.x,y:p.tool.y});if(reducedMotion)expect(p.body).toMatchObject({x:0,y:0,angle:0});
  }
  const invalid=M.pose({kind:'turnMushroom',piece:Infinity,pieceX:1e20,pieceY:-1e20,phase:'grip'});expect(invalid.food.origin).toEqual({x:585,y:325});expect(M.arm({side:'left',hand:invalid.grip,shoulder:invalid.shoulders.left}).reachable).toBe(true);
 });
 it('joins all new phase boundaries without shifting the working contact or changing finger closure',()=>{
  const newSequences={turnMushroom:['pickup','position','grip','lift','turn','lower','ready'],waitPan:['pickup','observe','ready'],setPanHeat:['pickup','reach','adjust','ready']};
  for(const [kind,steps] of Object.entries(newSequences))for(let i=0;i<steps.length-1;i++){
   const opts={kind,piece:13,initialSetting:1,setting:3},a=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress:100}),b=M.pose({...opts,phase:steps[i+1],nextPhase:steps[i+2],progress:0});
   expect(a.tool).toEqual(b.tool);expect(a.grip).toEqual(b.grip);expect(a.supportHand).toEqual(b.supportHand);expect(a.food).toEqual(b.food);expect(a.tongs).toEqual(b.tongs);expect(a.knob).toEqual(b.knob);expect(a.body).toEqual(b.body);
   for(const side of ['left','right'])expect(M.handPresentation(a,side)).toEqual(M.handPresentation(b,side));
  }
 });
 it('opens the jaws at the pan before returning empty tongs and keeps the preview face unobserved',()=>{
  const opts={kind:'turnMushroom',piece:6,phase:'lower',nextPhase:'ready'},start=M.pose({...opts,progress:0}),opening=M.pose({...opts,progress:10}),released=M.pose({...opts,progress:20}),returning=M.pose({...opts,progress:60}),ready=M.pose({...opts,progress:100});
  expect(opening.tool).toEqual(start.tool);expect(opening.tongs.closure).toBe(.5);expect(opening.food.preview).toBe(true);expect(released.tool).toEqual(start.tool);expect(released.tongs.closure).toBe(0);expect(released.food.preview).toBe(false);expect(returning.food.preview).toBe(false);expect(returning.tool.x).not.toBe(start.tool.x);expect(ready.food).toMatchObject({preview:false,attached:false,lift:0,roll:0});expect(Object.keys(start.food).some(key=>/color|face|browning|reading/i.test(key))).toBe(false);
 });
 it('turns the heat knob only at its fixed contact and releases it before withdrawing the hand',()=>{
  for(const initialSetting of [0,1,2,3])for(const setting of [0,1,2,3])for(const phase of ['pickup','reach','adjust','ready'])for(const progress of [0,20,50,80,100]){
   const steps=['pickup','reach','adjust','ready'],p=M.pose({kind:'setPanHeat',initialSetting,setting,phase,nextPhase:steps[steps.indexOf(phase)+1],progress});expect(p.held).toBe(false);expect(p.tool.visible).toBe(false);expect(p.grip).toEqual(M.grip(p.tool,p.kind));
   if(p.knob.contact>0){expect(p.grip.x).toBe(650);expect(p.grip.y).toBe(375);expect(M.handPresentation(p,'right').gesture).toBe('pinch');}expect(M.handPresentation(p,'left').role).toBe('free');
   for(const side of ['left','right']){const hand=side===p.activeHand?p.grip:p.supportHand;expect(((hand.x-450)/150)**2+((hand.y-350)/43)**2).toBeGreaterThan(1);expect(M.arm({side,hand,shoulder:p.shoulders[side]}).reachable).toBe(true);}
  }
  const start=M.pose({kind:'setPanHeat',initialSetting:0,setting:3,phase:'reach'}),end=M.pose({kind:'setPanHeat',initialSetting:0,setting:3,phase:'adjust'});expect(start.tool.angle).toBe(-60);expect(end.tool.angle).toBe(60);expect(start.grip.x).toBe(end.grip.x);expect(start.grip.y).toBe(end.grip.y);
  for(const phase of ['pickup','observe','ready']){const p=M.pose({kind:'waitPan',phase,seconds:60});expect(p.held).toBe(false);expect(p.grip).toMatchObject({x:690,y:390});expect(p.supportHand).toMatchObject({x:255,y:365});expect(p.gaze.target).toMatchObject({x:450,y:350});expect(p.seconds).toBeUndefined();for(const side of ['left','right']){const hand=side===p.activeHand?p.grip:p.supportHand;expect(((hand.x-450)/150)**2+((hand.y-350)/43)**2).toBeGreaterThan(1);expect(M.arm({side,hand,shoulder:p.shoulders[side]}).reachable).toBe(true);}}
 });
 it('cancels a held mushroom by unrolling and replacing it before parking empty tongs',()=>{
  const source=M.pose({kind:'turnMushroom',piece:11,phase:'lift',nextPhase:'turn',progress:75}),home=M.pose({kind:'turnMushroom',piece:11,phase:'ready'}),serialized=JSON.stringify({source,home});
  const beginning=M.park(source,home,0);expect(beginning.tool).toEqual(source.tool);expect(beginning.grip).toEqual(source.grip);expect(beginning.food).toEqual(source.food);for(const side of ['left','right'])expect(M.handPresentation(beginning,side)).toEqual(M.handPresentation(source,side));
  for(const progress of [16,24,32,40,48,54,59.99,60,75,94,99]){const p=M.park(source,home,progress);expect(p.grip).toEqual(M.grip(p.tool,'turnMushroom'));expect(p.pose).toBe(p.tool);if(progress<60){expect(p.food.preview).toBe(true);expect(p.food.position).toEqual({x:p.tool.x,y:p.tool.y});}else expect(p.food.preview).toBe(false);if(progress>=32)expect(p.food.roll).toBe(0);if(progress>=48)expect(p.food.position).toEqual(source.food.origin);}
  const final=M.park(source,home,100);expect(final).toMatchObject({kind:null,held:false,parkStage:'parked',food:{preview:false,attached:false,lift:0,roll:0}});expect(M.park(source,home,0,{reducedMotion:true})).toEqual(final);expect(M.parkDuration(source,home)).toBe(2400);expect(JSON.stringify({source,home})).toBe(serialized);
  const partial=M.park(source,home,27),restart=M.park(partial,home,0);expect(restart.tool).toEqual(partial.tool);expect(restart.grip).toEqual(partial.grip);expect(restart.food).toEqual(partial.food);
 });
 it('lifts the hot lid clear before leveling and carrying to the opposite anchor',()=>{
  for(const placement of ['covered','rest']){
   const opts={kind:'moveLid',placement,fromPlacement:placement==='covered'?'rest':'covered'},origin=M.keyframe('moveLid','pickup',opts),target=M.keyframe('moveLid','lower',opts);
   for(const progress of [0,20,40,59]){const p=M.pose({...opts,phase:'pickup',nextPhase:'lift',progress});expect(p.tool.x).toBe(origin.x);expect(p.tool.angle).toBe(origin.angle);expect(p.lid.position).toEqual({x:p.tool.x,y:p.tool.y,angle:p.tool.angle});expect(p.lid.attached).toBe(true);expect(p.grip).toEqual(M.grip(p.tool,'moveLid'));}
   for(const progress of [60,75,100])expect(M.pose({...opts,phase:'pickup',nextPhase:'lift',progress}).tool.y).toBe(250);
   for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:'lift',nextPhase:'carry',progress});expect(p.tool.y).toBeLessThanOrEqual(250);expect(p.tool.angle).toBe(0);expect(M.handPresentation(p,'right')).toMatchObject({gear:'mitt',contact:1,role:'working'});expect(M.handPresentation(p,'left')).toMatchObject({gear:'bare',contact:0,role:'free'});}
   expect(origin).toEqual(placement==='covered'?{x:310,y:299,angle:65}:{x:450,y:322,angle:0});expect(target).toEqual(placement==='covered'?{x:450,y:322,angle:0}:{x:310,y:299,angle:65});
  }
 });
 it('sets the lid down and releases before withdrawing while retaining exactly one preview lid',()=>{
  for(const placement of ['covered','rest']){
   const opts={kind:'moveLid',placement,phase:'lower',nextPhase:'ready'},start=M.pose({...opts,progress:0}),opening=M.pose({...opts,progress:12.5}),released=M.pose({...opts,progress:25}),withdrawn=M.pose({...opts,progress:75}),ready=M.pose({...opts,progress:100});
   expect(opening.tool).toEqual(start.tool);expect(opening.lid.contact).toBe(.5);expect(opening.lid.attached).toBe(true);expect(released.grip).toEqual(M.grip(released.tool,'moveLid'));expect(released.lid.attached).toBe(false);expect(withdrawn.grip.x).not.toBe(withdrawn.tool.x);
   for(const p of [opening,released,withdrawn,ready]){expect(p.lid.preview).toBe(true);expect(p.lid.position).toEqual(p.lid.target);expect(p.held).toBe(p.lid.attached);expect(p.lid.held).toBe(p.lid.attached);}
   expect(ready.grip).toEqual({x:585,y:390,angle:0});expect(ready.supportHand).toEqual({x:210,y:365,angle:0});expect(M.handPresentation(ready,'right')).toMatchObject({gear:'mitt',contact:0,closure:.18,role:'free'});
  }
 });
 it('keeps lid phase boundaries exact and both arms rigid across the complete path',()=>{
  const steps=['pickup','lift','carry','lower','ready'];
  for(const placement of ['covered','rest'])for(const reducedMotion of [false,true])for(let i=0;i<steps.length;i++){
   const opts={kind:'moveLid',placement,reducedMotion};for(let progress=0;progress<=100;progress++){const p=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress});for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]});expect(a.reachable).toBe(true);expect(distance(a.hand,hand)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}if(reducedMotion)expect(p.body).toMatchObject({x:0,y:0,angle:0});}
   if(steps[i+1]){const a=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress:100}),b=M.pose({...opts,phase:steps[i+1],nextPhase:steps[i+2],progress:0});for(const key of ['tool','grip','supportHand','lid','body','head','gaze'])expect(a[key]).toEqual(b[key]);for(const side of ['left','right'])expect(M.handPresentation(a,side)).toEqual(M.handPresentation(b,side));}
  }
 });
 it('reacquires a released preview lid and cancels back to its original covered or rest placement',()=>{
  for(const placement of ['covered','rest'])for(const phase of ['lift','lower','ready']){
   const opts={kind:'moveLid',placement,fromPlacement:placement==='covered'?'rest':'covered'},source=M.pose({...opts,phase}),home=M.pose({...opts,phase:'ready'}),initial=M.park(source,home,0),final=M.park(source,home,100);let sawReacquire=false,sawCarry=false;
   for(const key of ['tool','grip','supportHand','lid','body'])expect(initial[key]).toEqual(source[key]);
   for(let progress=0;progress<100;progress++){const p=M.park(source,home,progress);expect(p.lid.preview).toBe(true);expect(p.pose).toBe(p.tool);if(p.lid.contact>0)expect(distance(p.grip,p.tool)).toBeLessThan(1e-8);if(p.parkStage==='lid-reach'){sawReacquire=true;expect(p.tool).toEqual(source.tool);}if(p.parkStage==='lid-carry'){sawCarry=true;expect(p.tool.angle).toBe(0);expect(p.tool.y).toBeLessThanOrEqual(250);}if(p.parkStage==='lid-release'||p.parkStage==='empty-return')expect(p.lid.position).toEqual(source.lid.origin);}
   expect(sawReacquire).toBe(!source.lid.attached);expect(sawCarry).toBe(true);expect(final).toMatchObject({kind:null,held:false,parkStage:'parked',lid:{preview:false,attached:false,contact:0}});expect(final.lid.position).toEqual(source.lid.origin);expect(final.lid.target).toEqual(source.lid.target);expect(M.park(source,home,0,{reducedMotion:true})).toEqual(final);expect(M.parkDuration(source,home)).toBe(phase==='ready'?4000:3000);
  }
 });
 it('keeps interrupted lid recovery and partially open fingers continuous without changing inputs',()=>{
  const source=M.pose({kind:'moveLid',placement:'covered',phase:'lower',nextPhase:'ready',progress:20}),home=M.pose({kind:'moveLid',placement:'covered',phase:'ready'}),saved=JSON.stringify({source,home});let previous=null;
  expect(M.parkDuration(source,home)).toBe(4000);
  for(let progress=0;progress<=100;progress++){
   const p=M.park(source,home,progress),h=M.handPresentation(p,'right'),a=M.arm({side:'right',hand:p.grip,shoulder:p.shoulders.right});if(previous){expect(distance(previous.arm.elbow,a.elbow)).toBeLessThan(22);expect(Math.abs(((h.rotation-previous.hand.rotation)%360+540)%360-180)).toBeLessThan(15);}previous={arm:a,hand:h};
   if([10,35,70,85].includes(progress)){const restart=M.park(p,home,0);for(const key of ['tool','grip','supportHand','lid','body'])expect(restart[key]).toEqual(p[key]);expect(M.handPresentation(restart,'right')).toEqual(h);}
  }
  expect(saved).toBe(JSON.stringify({source,home}));expect(Object.keys(source)).not.toContain('state');expect(Object.keys(source)).not.toContain('seconds');
 });
 it('keeps pot waiting hands on the cold counter and adjusts the burner only at its fixed dial',()=>{
  for(const seconds of [15,30,60])for(const phase of ['pickup','observe','ready']){const p=M.pose({kind:'waitPot',phase,seconds});expect(p.grip).toEqual({x:585,y:390,angle:0});expect(p.supportHand).toEqual({x:210,y:365,angle:0});expect(p.held).toBe(false);expect(p.tool.visible).toBe(false);expect(p.gaze.target).toMatchObject({x:450,y:350});expect(p.seconds).toBeUndefined();}
  const steps=['pickup','reach','adjust','ready'];for(const initialSetting of [0,1,2,3])for(const setting of [0,1,2,3])for(let i=0;i<steps.length;i++)for(const progress of [0,25,50,75,100]){
   const p=M.pose({kind:'setPotHeat',initialSetting,setting,phase:steps[i],nextPhase:steps[i+1],progress});expect(p.held).toBe(false);expect(p.supportHand).toEqual({x:210,y:365,angle:0});if(p.knob.contact>0){expect(p.grip.x).toBe(650);expect(p.grip.y).toBe(375);}for(const side of ['left','right'])expect(M.arm({side,hand:side==='right'?p.grip:p.supportHand,shoulder:p.shoulders[side]}).reachable).toBe(true);
  }
  expect(M.pose({kind:'setPotHeat',setting:3,phase:'adjust'}).tool.angle).toBe(60);expect(M.pose({kind:'setPotHeat',initialSetting:0,phase:'reach'}).tool.angle).toBe(-60);
 });
 it('plants both protected pan grips before lifting and carries the hot pan level',()=>{
  for(const placement of ['burner','trivet']){
   const opts={activity:'cool-and-fold-sauce',kind:'movePan',placement},origin=M.keyframe('movePan','pickup',opts),target=M.keyframe('movePan','lower',opts);
   for(const progress of [0,40,85,95,100]){const p=M.pose({...opts,phase:'pickup',nextPhase:'grip',progress});expect(p.tool.x).toBe(origin.x);expect(p.tool.y).toBe(350);expect(p.held).toBe(progress===100);if(p.panTransport.contact>0){expect(p.grip).toEqual({x:origin.x+185,y:346,angle:0});expect(p.supportHand).toEqual({x:origin.x-125,y:342,angle:0});}}
   for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:'grip',nextPhase:'lift',progress});expect(p.tool.x).toBe(origin.x);expect(p.tool.angle).toBe(0);expect(p.panTransport.attached).toBe(true);for(const side of ['left','right']){const hand=M.handPresentation(p,side);expect(hand).toMatchObject({gesture:'handle',gear:'mitt',contact:1});expect(hand.rotation).toBeCloseTo(90,10);}}
   for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:'lift',nextPhase:'carry',progress});expect(p.tool.y).toBeLessThanOrEqual(285);expect(p.tool.angle).toBe(0);expect(p.grip).toEqual(M.grip(p.tool,'movePan'));expect(p.supportHand).toEqual({x:p.tool.x-125,y:p.tool.y-8,angle:0});expect(distance(p.grip,p.supportHand)).toBeCloseTo(Math.hypot(310,4),10);}
   expect(origin).toEqual({x:placement==='trivet'?520:300,y:350,angle:0});expect(target).toEqual({x:placement==='trivet'?300:520,y:350,angle:0});
  }
 });
 it('settles the pan at its destination and opens the mitts before withdrawing',()=>{
  for(const placement of ['burner','trivet']){
   const opts={activity:'cool-and-fold-sauce',kind:'movePan',placement,phase:'lower',nextPhase:'ready'},start=M.pose({...opts,progress:0}),opening=M.pose({...opts,progress:15}),released=M.pose({...opts,progress:30}),withdrawn=M.pose({...opts,progress:75}),ready=M.pose({...opts,progress:100});
   expect(opening.panTransport.contact).toBe(.5);expect(opening.grip).toEqual(start.grip);expect(opening.supportHand).toEqual(start.supportHand);expect(released.held).toBe(false);expect(released.grip).toEqual(start.grip);expect(withdrawn.grip.x).not.toBe(start.grip.x);
   for(const p of [opening,released,withdrawn,ready]){expect(p.panTransport.preview).toBe(true);expect(p.panTransport.position).toEqual(p.panTransport.target);expect(p.tool.angle).toBe(0);}
   expect(ready.grip).toEqual({x:690,y:390,angle:0});expect(ready.supportHand).toEqual({x:220,y:300,angle:0});for(const side of ['left','right'])expect(M.handPresentation(ready,side)).toMatchObject({gear:'mitt',contact:0,closure:.18,role:'free'});
  }
 });
 it('keeps the pan phase joins exact and preserves rigid arms with useful reduced-motion poses',()=>{
  const steps=['pickup','grip','lift','carry','lower','ready'];
  for(const placement of ['burner','trivet'])for(const reducedMotion of [false,true])for(let i=0;i<steps.length;i++){
   const opts={activity:'cool-and-fold-sauce',kind:'movePan',placement,reducedMotion};
   for(const progress of [0,10,30,50,70,90,100]){const p=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress});for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]});expect(a.reachable).toBe(true);expect(distance(a.hand,hand)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}if(reducedMotion)expect(p.body).toMatchObject({x:0,y:0,angle:0});}
   if(steps[i+1]){const end=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress:100}),start=M.pose({...opts,phase:steps[i+1],nextPhase:steps[i+2],progress:0});for(const key of ['tool','grip','supportHand','body','head','gaze','panSurface','panTransport'])expect(end[key]).toEqual(start[key]);for(const side of ['left','right'])expect(M.handPresentation(end,side)).toEqual(M.handPresentation(start,side));}
  }
 });
 it('reacquires a released pan and returns it to its original station before releasing',()=>{
  for(const placement of ['burner','trivet'])for(const phase of ['lift','lower','ready']){
   const opts={activity:'cool-and-fold-sauce',kind:'movePan',placement},source=M.pose({...opts,phase}),home=M.pose({...opts,phase:'ready'}),saved=JSON.stringify({source,home}),initial=M.park(source,home,0),final=M.park(source,home,100);let sawReach=false,sawCarry=false;
   for(const key of ['tool','grip','supportHand','body','panTransport'])expect(initial[key]).toEqual(source[key]);
   for(let progress=0;progress<100;progress++){const p=M.park(source,home,progress);expect(p.panTransport.preview).toBe(true);expect(p.pose).toBe(p.tool);if(p.panTransport.contact>0){expect(p.grip).toEqual(M.grip(p.tool,'movePan'));expect(p.supportHand).toEqual({x:p.tool.x-125,y:p.tool.y-8,angle:0});}if(p.parkStage==='pan-reach'){sawReach=true;expect(p.tool).toEqual(source.tool);}if(p.parkStage==='pan-carry'){sawCarry=true;expect(p.tool.y).toBeLessThanOrEqual(285);expect(p.tool.angle).toBe(0);}if(['pan-release','empty-return'].includes(p.parkStage))expect(p.panTransport.position).toEqual(source.panTransport.origin);}
   expect(sawReach).toBe(phase==='ready');expect(sawCarry).toBe(true);expect(final).toMatchObject({kind:null,held:false,parkStage:'parked',panTransport:{preview:false,attached:false,contact:0}});expect(final.panTransport.position).toEqual(source.panTransport.origin);expect(M.park(source,home,0,{reducedMotion:true})).toEqual(final);expect(M.parkDuration(source,home)).toBe(phase==='ready'?4100:3200);expect(JSON.stringify({source,home})).toBe(saved);
  }
 });
 it('keeps partly released pan recovery continuous and supports interruption without changing the kitchen',()=>{
  const source=M.pose({activity:'cool-and-fold-sauce',kind:'movePan',placement:'trivet',phase:'lower',nextPhase:'ready',progress:20}),home=M.pose({activity:'cool-and-fold-sauce',kind:'movePan',placement:'trivet',phase:'ready'}),saved=JSON.stringify({source,home});let previous=null;
  for(let progress=0;progress<=100;progress++){const p=M.park(source,home,progress),current={};for(const side of ['left','right']){const h=M.handPresentation(p,side),a=M.arm({side,hand:side==='right'?p.grip:p.supportHand,shoulder:p.shoulders[side]});if(previous){expect(distance(previous[side].arm.elbow,a.elbow)).toBeLessThan(22);expect(Math.abs(((h.rotation-previous[side].hand.rotation)%360+540)%360-180)).toBeLessThan(15);}current[side]={arm:a,hand:h};}previous=current;
   if([10,35,70,85].includes(progress)){const restart=M.park(p,home,0);for(const key of ['tool','grip','supportHand','body','panTransport'])expect(restart[key]).toEqual(p[key]);for(const side of ['left','right'])expect(M.handPresentation(restart,side)).toEqual(M.handPresentation(p,side));}
  }
  expect(M.parkDuration(source,home)).toBe(4100);expect(JSON.stringify({source,home})).toBe(saved);expect(source.state).toBeUndefined();expect(source.seconds).toBeUndefined();
 });
 it('follows the relocated sauce with the spoon while stabilizing its actual hot handle',()=>{
  for(const panPlacement of ['burner','trivet'])for(const kind of ['inspect','fold']){
   const opts={activity:'cool-and-fold-sauce',kind,panPlacement},cx=panPlacement==='trivet'?300:520,steps=sequences[kind];
   expect(M.keyframe(kind,'pickup',opts)).toEqual({x:140,y:375,angle:90});expect(M.keyframe(kind,'ready',opts)).toEqual({x:140,y:375,angle:90});
   for(let i=0;i<steps.length;i++)for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress});expect(p.activeHand).toBe('left');expect(p.panSurface).toEqual({x:cx,y:350,rx:110,ry:34});expect(p.grip).toEqual(M.grip(p.tool,kind));expect(p.supportHand).toEqual({x:cx+185,y:346,angle:0});expect(M.handPresentation(p,'right')).toMatchObject({gesture:'handle',gear:'mitt',contact:1});if(kind==='fold'){const cue=M.sauceInteraction(p);expect(cue.bowl.x).toBeCloseTo(p.tool.x-7*Math.sin(p.tool.angle*Math.PI/180),10);expect(cue.bowl.y).toBeCloseTo(p.tool.y+7*Math.cos(p.tool.angle*Math.PI/180),10);if(cue.contact>0)expect(((cue.bowl.x-cx)/110)**2+((cue.bowl.y-350)/34)**2).toBeLessThan(1);}}
  }
 });
 it('keeps thermal waiting and knob support hands clear of both hot pan placements',()=>{
  for(const kind of ['waitPan','setPanHeat'])for(const panPlacement of ['burner','trivet']){
   const steps=kind==='waitPan'?['pickup','observe','ready']:['pickup','reach','adjust','ready'];for(let i=0;i<steps.length;i++)for(const progress of [0,25,50,75,100]){const p=M.pose({activity:'cool-and-fold-sauce',kind,panPlacement,phase:steps[i],nextPhase:steps[i+1],progress,initialSetting:0,setting:3});expect(p.supportHand).toEqual({x:220,y:300,angle:0});expect(p.held).toBe(false);expect(p.tool.visible).toBe(false);for(const side of ['left','right'])expect(M.arm({side,hand:side==='right'?p.grip:p.supportHand,shoulder:p.shoulders[side]}).reachable).toBe(true);if(p.knob?.contact>0)expect(p.grip).toMatchObject({x:650,y:375});}
  }
  const left=M.pose({activity:'cool-and-fold-sauce',kind:'waitPan'}).supportHand;expect(distance(left,{x:175,y:342})).toBeGreaterThan(60);expect(((left.x-300)/110)**2+((left.y-350)/34)**2).toBeGreaterThan(1);
 });
 it('parks the thermal spoon below the helper mitt silhouette throughout a pan transfer',()=>{
  const rest=M.keyframe('inspect','pickup',{activity:'cool-and-fold-sauce'}),grip=M.grip(rest,'inspect'),steps=['pickup','grip','lift','carry','lower','ready'];
  expect(grip).toEqual({x:206,y:375,angle:90});
  for(const placement of ['burner','trivet'])for(let i=0;i<steps.length;i++)for(const progress of [0,25,50,75,100]){const p=M.pose({kind:'movePan',placement,phase:steps[i],nextPhase:steps[i+1],progress});if(p.panTransport.contact>0){const mittBottom=p.supportHand.y+21,shaftTop=rest.y-5;expect(shaftTop-mittBottom).toBeGreaterThanOrEqual(7);}}
  // The horizontal bowl and its shaft sit within the front counter, while the
  // working grip still stays inside the reduced-motion arm's fixed reach.
  expect(rest.y+14).toBeLessThan(390);expect(M.arm({side:'left',hand:grip}).reachable).toBe(true);
 });
 it('sweeps the actual spoon bowl through the selected pasta bundle while a mitt stabilizes the pot',()=>{
  for(let group=0;group<6;group++){
   const angle=group*Math.PI/3+Math.PI/6,target={x:450+150*Math.cos(angle)*.32,y:350+38*Math.sin(angle)*.32},opts={kind:'separatePasta',group,groupX:target.x,groupY:target.y,phase:'dip',nextPhase:'sweep'};
   for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,progress}),d=p.pastaInteraction;expect(d.group).toBe(group);expect(d.target).toEqual(target);expect(d.bowl.y).toBeCloseTo(target.y,10);expect(d.bowl.x).toBeCloseTo(target.x-10+20*M.ease(progress/100),10);expect(d.contact).toBe(1);expect(d.immersion).toBe(.72);expect(p.grip).toEqual(M.grip(p.tool,'separatePasta'));expect(p.activeHand).toBe('right');expect(p.supportHand).toEqual({x:350,y:342,angle:0});expect(M.handPresentation(p,'left')).toMatchObject({gesture:'handle',gear:'mitt',contact:1,role:'stabilizing'});expect(((d.bowl.x-450)/78)**2+((d.bowl.y-350)/21)**2).toBeLessThan(1);}
  }
 });
 it('raises the entire separating spoon above the pot rim before any lateral return',()=>{
  for(let group=0;group<6;group++){
   const opts={kind:'separatePasta',group},start=M.pose({...opts,phase:'sweep'});
   for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:'sweep',nextPhase:'lift',progress});expect(p.pastaInteraction.bowl.x).toBeCloseTo(start.pastaInteraction.bowl.x,10);expect(p.tool.angle).toBe(10);}
   for(const progress of [0,10,30,50,62]){const p=M.pose({...opts,phase:'lift',nextPhase:'ready',progress});expect(p.pastaInteraction.bowl.y+20).toBeLessThanOrEqual(312+1e-8);expect(p.pastaInteraction.contact).toBe(0);}
   for(const progress of [62,70,80,90,100]){const p=M.pose({...opts,phase:'lift',nextPhase:'ready',progress});expect(p.tool.x).toBeCloseTo(690,10);expect(p.tool.angle).toBe(-32);}
  }
 });
 it('puts the separating spoon onto its rest before opening the working fingers',()=>{
  const opts={kind:'separatePasta',group:2,phase:'lift',nextPhase:'ready'},placed=M.pose({...opts,progress:90}),opening=M.pose({...opts,progress:95}),ready=M.pose({...opts,progress:100}),next=M.pose({kind:'separatePasta',group:2,phase:'ready'});
  expect(placed.tool).toEqual({x:690,y:350,angle:-32,visible:true});expect(opening.tool).toEqual(placed.tool);expect(opening.spoonGrip).toBeCloseTo(.5,10);expect(ready.spoonGrip).toBe(0);expect(ready.held).toBe(false);expect(ready.tool.visible).toBe(false);expect(ready.pastaInteraction.contact).toBe(0);
  for(const key of ['tool','grip','supportHand','body','head','gaze','pastaInteraction','spoonGrip'])expect(ready[key]).toEqual(next[key]);expect(M.handPresentation(ready,'right')).toMatchObject({contact:0,closure:.18,role:'free'});expect(M.handPresentation(ready,'left')).toMatchObject({gear:'mitt',contact:1,role:'stabilizing'});
 });
 it('keeps every bundle phase boundary and reduced-motion contact exact with rigid arms',()=>{
  const steps=['pickup','position','dip','sweep','lift','ready'];
  for(let group=0;group<6;group++)for(const reducedMotion of [false,true])for(let i=0;i<steps.length;i++){
   const opts={kind:'separatePasta',group,reducedMotion};for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress});for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]});expect(a.reachable).toBe(true);expect(distance(a.hand,hand)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}if(reducedMotion)expect(p.body).toMatchObject({x:0,y:0,angle:0});}
   if(steps[i+1]){const end=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress:100}),start=M.pose({...opts,phase:steps[i+1],nextPhase:steps[i+2],progress:0});for(const key of ['tool','grip','supportHand','body','head','gaze','pastaInteraction','spoonGrip'])expect(end[key]).toEqual(start[key]);for(const side of ['left','right'])expect(M.handPresentation(end,side)).toEqual(M.handPresentation(start,side));}
  }
 });
 it('cancels separation by lifting clear before carrying the spoon home without resuming contact',()=>{
  for(let group=0;group<6;group++){
   const source=M.pose({kind:'separatePasta',group,phase:'dip',nextPhase:'sweep',progress:55}),home=M.pose({kind:'separatePasta',group,phase:'ready'}),saved=JSON.stringify({source,home}),initial=M.park(source,home,0),final=M.park(source,home,100);let previous=1,sawCarry=false;
   for(const key of ['tool','grip','supportHand','body','pastaInteraction'])expect(initial[key]).toEqual(source[key]);for(const side of ['left','right'])expect(M.handPresentation(initial,side)).toEqual(M.handPresentation(source,side));
   for(let progress=0;progress<100;progress++){const p=M.park(source,home,progress);expect(p.grip).toEqual(M.grip(p.tool,'separatePasta'));expect(p.pastaInteraction.contact).toBeLessThanOrEqual(previous);previous=p.pastaInteraction.contact;expect(M.handPresentation(p,'left').gear).toBe('mitt');if(p.parkStage==='lift')expect(p.pastaInteraction.bowl.x).toBeCloseTo(source.pastaInteraction.bowl.x,10);if(p.parkStage==='carry'){sawCarry=true;expect(p.pastaInteraction.bowl.y+20).toBeLessThanOrEqual(312+1e-8);expect(p.pastaInteraction.contact).toBe(0);}if(p.parkStage==='release')expect(p.tool).toEqual({...home.tool,visible:true});}
   expect(sawCarry).toBe(true);expect(final).toMatchObject({kind:null,held:false,pastaInteraction:{preview:false,contact:0,immersion:0}});expect(M.handPresentation(final,'left').gear).toBe('mitt');expect(M.park(source,home,0,{reducedMotion:true})).toEqual(final);expect(M.parkDuration(source,home)).toBe(1800);expect(JSON.stringify({source,home})).toBe(saved);
  }
 });
 it('keeps interrupted bundle recovery continuous and never invents separated food or a texture reading',()=>{
  const source=M.pose({kind:'separatePasta',group:3,phase:'dip'}),home=M.pose({kind:'separatePasta',group:3,phase:'ready'});let previous=null;
  for(let progress=0;progress<=100;progress++){const p=M.park(source,home,progress),hand=M.handPresentation(p,'right'),arm=M.arm({side:'right',hand:p.grip,shoulder:p.shoulders.right});if(previous){expect(distance(previous.arm.elbow,arm.elbow)).toBeLessThan(12);expect(Math.abs(((hand.rotation-previous.hand.rotation)%360+540)%360-180)).toBeLessThan(15);}previous={hand,arm};if([20,50,85,95].includes(progress)){const restart=M.park(p,home,0);for(const key of ['grip','supportHand','body','pastaInteraction'])expect(restart[key]).toEqual(p[key]);}expect(Object.keys(p.pastaInteraction).some(key=>/released|texture|reading|cling|seconds|state/i.test(key))).toBe(false);}
  const atRest=M.pose({kind:'separatePasta',phase:'pickup'}),cancel=M.park(atRest,home,50);expect(cancel.tool).toEqual(atRest.tool);expect(cancel.parkStage).toBe('release');expect(M.parkDuration(atRest,home)).toBe(280);
  for(const invalid of [Infinity,NaN,-1e20,1e20]){const p=M.pose({kind:'separatePasta',group:invalid,groupX:invalid,groupY:invalid,phase:'dip'});expect(Number.isFinite(p.tool.x)&&Number.isFinite(p.tool.y)).toBe(true);expect(((p.pastaInteraction.target.x-450)/54)**2+((p.pastaInteraction.target.y-350)/14)**2).toBeLessThanOrEqual(1+1e-8);}
 });
 it('locks the precision blade to the measured plane with the claw on the larger side',()=>{
  for(const [selectedWidth,cutMm] of [[40,1],[40,20],[40,39],[7,2],[2,1]]){
   const cutX=330+240*cutMm/selectedWidth,supportX=cutX+(cutMm<selectedWidth/2?45:-45),p=M.pose({kind:'sliceProduce',selectedWidth,cutMm,piece:17,cutX,cutY:350,supportX,supportY:345,phase:'cut'}),d=p.cutInteraction;
   expect(d).toMatchObject({piece:17,selectedWidth,cutMm,line:{x:cutX,y:350},support:{x:supportX,y:345},contact:1,braced:1,cutProgress:1,preview:true});expect(p.tool).toMatchObject({x:cutX,y:350,angle:0});expect(p.grip).toEqual(M.grip(p.tool,'sliceProduce'));expect(p.grip).toMatchObject({x:cutX+20,y:284});expect(p.supportHand).toMatchObject({x:supportX,y:345});
   const gap=supportX<cutX?d.bounds.minX-(supportX+20):(supportX-20)-d.bounds.maxX;expect(gap).toBeGreaterThanOrEqual(7);expect(M.handPresentation(p,'left')).toMatchObject({gesture:'claw',role:'stabilizing',contact:1});expect(Object.keys(d).some(key=>/widths|result|state|seconds/i.test(key))).toBe(false);
  }
 });
 it('braces before the controlled knife descent and lifts the whole blade before lateral retreat',()=>{
  const opts={kind:'sliceProduce',selectedWidth:40,cutMm:1};
  for(const progress of [0,25,50,75,100]){
   const joining=M.pose({...opts,phase:'position',nextPhase:'brace',progress});expect(joining.tool.y).toBe(306);expect(joining.cutInteraction.contact).toBe(0);if(joining.cutInteraction.braced>0)expect(joining.supportHand).toMatchObject({x:381,y:345});
   const descending=M.pose({...opts,phase:'brace',nextPhase:'cut',progress});expect(descending.tool.x).toBe(336);expect(descending.tool.angle).toBe(0);expect(descending.cutInteraction.braced).toBe(1);
   const rising=M.pose({...opts,phase:'cut',nextPhase:'lift',progress});expect(rising.tool.x).toBe(336);expect(rising.tool.angle).toBe(0);expect(rising.cutInteraction.braced).toBe(1);
  }
  for(const progress of [0,10,25,40,62]){const p=M.pose({...opts,phase:'lift',nextPhase:'ready',progress});expect(p.cutInteraction.bounds.maxY).toBeLessThan(334);expect(p.cutInteraction.contact).toBe(0);}
  const opening=M.pose({...opts,phase:'lift',nextPhase:'ready',progress:94}),placed=M.keyframe('sliceProduce','ready',opts);expect(opening.tool).toEqual({...placed,visible:true});expect(opening.knifeGrip).toBeCloseTo(.5,10);expect(opening.supportHand).toEqual({x:255,y:365,angle:0});
 });
 it('joins precision-cut phases exactly with rigid arms and useful reduced-motion poses',()=>{
  const steps=['pickup','position','brace','cut','lift','ready'];
  for(const [selectedWidth,cutMm] of [[40,1],[40,39],[2,1]])for(const reducedMotion of [false,true])for(let i=0;i<steps.length;i++){
   const opts={kind:'sliceProduce',selectedWidth,cutMm,reducedMotion};for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress});for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]});expect(a.reachable).toBe(true);expect(distance(a.hand,hand)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}if(reducedMotion)expect(p.body).toMatchObject({x:0,y:0,angle:0});}
   if(steps[i+1]){const a=M.pose({...opts,phase:steps[i],nextPhase:steps[i+1],progress:100}),b=M.pose({...opts,phase:steps[i+1],nextPhase:steps[i+2],progress:0});for(const key of ['tool','grip','supportHand','body','head','gaze','cutInteraction','knifeGrip','clawJoining','clawWithdrawal'])expect(a[key]).toEqual(b[key]);for(const side of ['left','right'])expect(M.handPresentation(a,side)).toEqual(M.handPresentation(b,side));}
  }
  for(const phase of ['pickup','review','ready']){const p=M.pose({kind:'finishCuts',phase});expect(p.held).toBe(false);expect(p.tool.visible).toBe(false);expect(p.grip).toMatchObject({x:620,y:390});expect(p.supportHand).toMatchObject({x:255,y:365});}
 });
 it('cancels precision cutting by clearing the entire blade before withdrawing the claw or carrying home',()=>{
  for(const [selectedWidth,cutMm] of [[40,1],[40,39],[2,1]]){
   const opts={kind:'sliceProduce',selectedWidth,cutMm},source=M.pose({...opts,phase:'cut'}),home=M.pose({...opts,phase:'ready'}),saved=JSON.stringify({source,home}),initial=M.park(source,home,0);let previous=1;
   for(const key of ['tool','grip','supportHand','body','cutInteraction'])expect(initial[key]).toEqual(source[key]);for(const side of ['left','right'])expect(M.handPresentation(initial,side)).toEqual(M.handPresentation(source,side));
   for(const progress of [0,10,20,22,28,34,50,66,84,95]){const p=M.park(source,home,progress);expect(p.grip).toEqual(M.grip(p.tool,'sliceProduce'));expect(p.cutInteraction.contact).toBeLessThanOrEqual(previous);previous=p.cutInteraction.contact;if(progress<=22){expect(p.tool.x).toBe(source.tool.x);expect(p.tool.angle).toBe(0);expect(p.supportHand).toEqual(source.supportHand);}if(p.parkStage==='carry'){expect(p.cutInteraction.bounds.maxY).toBeLessThan(334);expect(p.cutInteraction.contact).toBe(0);}if(p.parkStage==='release')expect(p.tool).toEqual({...home.tool,visible:true});const restart=M.park(p,home,0);for(const key of ['tool','grip','supportHand','body','cutInteraction'])expect(restart[key]).toEqual(p[key]);}
   const end=M.park(source,home,100);expect(end).toMatchObject({kind:null,held:false,cutInteraction:{preview:false,contact:0,braced:0}});expect(M.park(source,home,0,{reducedMotion:true})).toEqual(end);expect(M.parkDuration(source,home)).toBe(2100);expect(JSON.stringify({source,home})).toBe(saved);
  }
 });
 it('animates a grip-only handoff even when the next tool uses the same hand anchors',()=>{
  const from=M.pose({kind:'sliceProduce',selectedWidth:40,cutMm:5,phase:'ready'}),to=M.pose({kind:'sliceProduce',selectedWidth:35,cutMm:5,phase:'pickup'});let previous=.18;
  expect(M.reachDuration(from,to)).toBe(0);expect(M.reachDuration(from,to,{contactAware:true})).toBe(240);
  for(let progress=0;progress<=100;progress++){const p=M.reach(from,to,progress,{contactAware:true}),h=M.handPresentation(p,'right');expect(p.grip).toEqual(from.grip);expect(p.supportHand).toEqual(from.supportHand);expect(h.closure).toBeGreaterThanOrEqual(previous);previous=h.closure;}
  expect(M.reach(from,to,100,{contactAware:true})).toEqual(to);expect(M.reach(from,to,0,{contactAware:true,reducedMotion:true})).toEqual(to);expect(M.reachDuration(to,to,{contactAware:true})).toBe(0);
 });
 it('retains a stationary held knife while the supporting hand releases before moving to the next clove',()=>{
  const from=M.pose({kind:'mince',clove:0,phase:'ready'}),to=M.pose({kind:'mince',clove:1,phase:'pickup'}),saved=JSON.stringify({from,to});
  for(let progress=0;progress<100;progress++){const p=M.reach(from,to,progress,{contactAware:true}),left=M.handPresentation(p,'left');expect(p.kind).toBe('mince');expect(p.held).toBe(true);expect(p.tool).toEqual(from.tool);expect(p.grip).toEqual(from.grip);expect(M.handPresentation(p,'right').contact).toBe(1);if(p.handoff.stage==='release')expect(p.supportHand).toEqual(from.supportHand);else if(p.handoff.stage==='travel')expect(left.contact).toBe(0);else if(left.contact>0)expect(p.supportHand).toEqual(to.supportHand);}
  expect(M.reach(from,to,100,{contactAware:true})).toEqual(to);expect(JSON.stringify({from,to})).toBe(saved);
 });
 it('keeps contact-aware handoffs planted while opening and closes only after arrival',()=>{
  const from=M.pose({kind:'reserveWater',phase:'ready'}),to=M.pose({kind:'samplePasta',phase:'pickup'}),saved=JSON.stringify({from,to});let released=false,travelled=false,closed=false;
  for(let progress=0;progress<100;progress++){const p=M.reach(from,to,progress,{contactAware:true});for(const side of ['left','right']){const h=M.handPresentation(p,side),a=M.handPresentation(from,side),b=M.handPresentation(to,side);if(p.handoff.retainedContacts[side])expect(h.contact).toBe(a.contact);else if(p.handoff.stage==='release'){released=true;expect(h.anchor).toEqual(a.anchor);}else if(p.handoff.stage==='travel'){travelled=true;expect(h.contact).toBe(0);}else if(h.contact>0){closed=true;expect(distance(h.anchor,b.anchor)).toBeLessThan(1e-8);}}}
  expect(released&&travelled&&closed).toBe(true);expect(M.reach(from,to,100,{contactAware:true})).toEqual(to);expect(M.reach(from,to,0,{contactAware:true,reducedMotion:true})).toEqual(to);expect(JSON.stringify({from,to})).toBe(saved);
 });
});

describe('Chef station spacing, arm contours and anticipatory attention',()=>{
 const moveSteps=['pickup','position','grip','lift','carry','lower','release','ready'];
 const options={kind:'moveMushroom',piece:4,pieceAnchor:{x:327,y:350},targetAnchor:{x:450,y:377}};
 it('keeps exact legal mushroom endpoints, closes after arrival, and moves without turning',()=>{
  const left=M.pose({...options,phase:'grip'}),right=M.pose({...options,targetAnchor:{x:573,y:350},phase:'lower'});
  expect(left.food.origin).toEqual({x:327,y:350});expect(right.food.target).toEqual({x:573,y:350});
  for(const progress of [0,25,50,75,85,95,100]){const p=M.pose({...options,phase:'position',nextPhase:'grip',progress});expect(p.tongs.roll).toBe(0);expect(p.food.roll).toBe(0);if(p.tongs.closure>0){expect(p.tool.x).toBe(options.pieceAnchor.x);expect(p.tool.y).toBe(options.pieceAnchor.y);}expect(p.food.preview).toBe(progress===100);}
 });
 it('lifts before a loaded horizontal carry and lowers at the selected target',()=>{
  const clear=Math.min(options.pieceAnchor.y,options.targetAnchor.y)-36;
  for(let progress=0;progress<=100;progress+=10){const lift=M.pose({...options,phase:'grip',nextPhase:'lift',progress}),carry=M.pose({...options,phase:'lift',nextPhase:'carry',progress}),lower=M.pose({...options,phase:'carry',nextPhase:'lower',progress});expect(lift.tool.x).toBe(options.pieceAnchor.x);expect(carry.tool.y).toBeLessThanOrEqual(clear);expect(lower.tool.x).toBe(options.targetAnchor.x);for(const p of [lift,carry,lower]){expect(p.food.position).toEqual({x:p.tool.x,y:p.tool.y});expect(p.food.attached).toBe(true);expect(p.tongs.closure).toBe(1);expect(p.tool.angle).toBe(0);expect(M.handPresentation(p,'right')).toMatchObject({gear:'mitt',role:'stabilizing'});}}
 });
 it('keeps placed mushroom preview visible after jaw opening and parks fingers only after the tongs settle',()=>{
  for(const progress of [0,25,50,75,100]){const p=M.pose({...options,phase:'lower',nextPhase:'release',progress});expect(p.tool).toMatchObject(options.targetAnchor);expect(p.food.position).toEqual(options.targetAnchor);expect(p.food.preview).toBe(true);expect(p.food.attached).toBe(progress<100);expect(p.tongs.closure).toBeCloseTo(1-M.ease(progress/100),10);}
  const opening=M.pose({...options,phase:'release',nextPhase:'ready',progress:95}),ready=M.pose({...options,phase:'ready'});expect(opening.tool).toEqual({...ready.tool,visible:true});expect(opening.tongGrip).toBeCloseTo(.5,10);expect(ready.food.position).toEqual(options.targetAnchor);expect(ready.food.preview).toBe(true);expect(ready.food.attached).toBe(false);expect(ready.held).toBe(false);
 });
 it('joins every spacing phase exactly and retains rigid arms in reduced motion',()=>{
  for(const reducedMotion of [false,true])for(let i=0;i<moveSteps.length;i++){
   for(const progress of [0,25,50,75,100]){const p=M.pose({...options,reducedMotion,phase:moveSteps[i],nextPhase:moveSteps[i+1],progress});for(const side of ['left','right']){const wrist=side==='left'?p.grip:p.supportHand,a=M.arm({side,hand:wrist,shoulder:p.shoulders[side]});expect(a.reachable).toBe(true);expect(distance(a.hand,wrist)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}if(reducedMotion)expect(p.body).toMatchObject({x:0,y:0,angle:0});}
   if(moveSteps[i+1]){const a=M.pose({...options,reducedMotion,phase:moveSteps[i],nextPhase:moveSteps[i+1],progress:100}),b=M.pose({...options,reducedMotion,phase:moveSteps[i+1],nextPhase:moveSteps[i+2],progress:0});for(const key of ['tool','grip','supportHand','body','head','gaze','food','tongs','tongGrip'])expect(a[key]).toEqual(b[key]);for(const side of ['left','right'])expect(M.handPresentation(a,side)).toEqual(M.handPresentation(b,side));}
  }
 });
 it('returns a held preview to its source before opening and never rolls either face',()=>{
  const source=M.pose({...options,phase:'carry'}),home=M.pose({...options,phase:'ready'}),snapshot=JSON.stringify(source);let restored=false,released=false;
  for(let progress=0;progress<=100;progress++){const p=M.park(source,home,progress);expect(p.food.roll).toBe(0);expect(p.tongs.roll).toBe(0);if(p.food.attached)expect(p.food.position).toEqual({x:p.tool.x,y:p.tool.y});if(p.parkStage==='food-release'){restored=true;expect(p.food.position).toEqual(options.pieceAnchor);}if(!p.food.preview){released=true;expect(p.food.position).toEqual(options.pieceAnchor);expect(p.food.attached).toBe(false);}}
  expect(restored&&released).toBe(true);expect(JSON.stringify(source)).toBe(snapshot);
 });
 it('reacquires a placed preview even after ready, then restores it before parking',()=>{
  const source=M.pose({...options,phase:'ready'}),seen=new Set();let picked=false;
  for(let progress=0;progress<=100;progress++){const p=M.park(source,undefined,progress);seen.add(p.parkStage);if(p.parkStage==='food-grip'){expect(p.tool).toMatchObject(options.targetAnchor);expect(p.food.position).toEqual(options.targetAnchor);}if(p.parkStage==='food-lift'){picked=true;expect(p.food.attached).toBe(true);}if(p.parkStage==='food-release')expect(p.food.position).toEqual(options.pieceAnchor);if(progress===100){expect(p.food).toMatchObject({position:options.pieceAnchor,preview:false,attached:false,roll:0});expect(p.held).toBe(false);}}
  expect(picked).toBe(true);expect(seen.has('tool-grip')&&seen.has('food-grip')&&seen.has('food-release')).toBe(true);expect(M.park(source,undefined,0,{reducedMotion:true})).toEqual(M.park(source,undefined,100));
 });
 it('restarts a canceled spacing preview with its original identity and no position jump',()=>{
  const source=M.pose({...options,phase:'release',nextPhase:'ready',progress:65}),home=M.pose({...options,phase:'ready'}),wrongNext=M.pose({...options,piece:9,pieceAnchor:{x:573,y:350},targetAnchor:{x:450,y:323},phase:'ready'});
  for(const progress of [15,35,55,75,95]){const p=M.park(source,home,progress),again=M.park(p,wrongNext,0);for(const key of ['tool','grip','food','tongs','mushroomMove'])expect(again[key]).toEqual(p[key]);const done=M.park(p,wrongNext,100);expect(done.food.piece).toBe(4);expect(done.food.position).toEqual(options.pieceAnchor);expect(done.food.target).toEqual(options.targetAnchor);}
 });
 it('adds tapered limb contours without changing the rendered IK endpoints or input',()=>{
  for(const side of ['left','right'])for(const hand of [{x:327,y:284},{x:450,y:250},{x:573,y:311},{x:705,y:349}]){const a=M.arm({side,hand}),snapshot=JSON.stringify(a),c=M.armContours(a),upper=a.upperPath.match(/-?\d+(?:\.\d+)?/g).map(Number),lower=a.lowerPath.match(/-?\d+(?:\.\d+)?/g).map(Number);expect(c.shoulder).toEqual({x:upper[0],y:upper[1]});expect(c.elbow).toEqual({x:upper[2],y:upper[3]});expect(c.wrist).toEqual({x:lower[2],y:lower[3]});expect(c.widths.wrist).toBeLessThan(c.widths.elbow);expect(c.widths.cuff).toBeLessThan(c.widths.shoulder);expect(Object.values(c.bounds).every(Number.isFinite)).toBe(true);for(const key of ['sleevePath','forearmPath','cuffPath','elbowPath'])expect(c[key]).not.toMatch(/NaN|Infinity/);expect(JSON.stringify(a)).toBe(snapshot);expect(M.armContours(a)).toEqual(c);}
 });
 it('lets eyes anticipate the head while retaining every wrist, grip and tool trajectory',()=>{
  const from=M.pose({kind:'pour',phase:'ready'}),to=M.pose({kind:'inspect',phase:'pickup'}),changed=[];
  for(let progress=0;progress<=100;progress++){const old=M.reach(from,to,progress,{contactAware:true}),p=M.reach(from,to,progress,{contactAware:true,anticipatoryAttention:true});for(const key of ['tool','grip','supportHand','body','shoulders','handPoses','handoff'])expect(p[key]).toEqual(old[key]);if(progress===0||progress===100)expect(p).toEqual(old);else if(JSON.stringify(p.gaze)!==JSON.stringify(old.gaze))changed.push(progress);if(progress>=65)expect(p.gaze.target).toEqual({...to.gaze.target,angle:0});}
  expect(changed.length).toBeGreaterThan(20);expect(M.reach(from,to,0,{contactAware:true,anticipatoryAttention:true,reducedMotion:true})).toEqual(to);expect(M.reach(from,to,50,{anticipatoryAttention:true})).toEqual(M.reach(from,to,50));
 });
});

describe('Chef station contained rinsing and articulated approaches',()=>{
 const phases=['pickup','carry','lower','rinse','lift','drain','return','tip','ready'];
 const rinse=(phase,nextPhase,progress=0,reducedMotion=false)=>M.pose({kind:'rinseProduce',phase,nextPhase,progress,reducedMotion});
 const geometry=p=>{const {stage,...d}=p.rinseProduce;return d;};
 it('places the rinsing cloth on all eight compact food targets while preserving the original drying grid',()=>{
  for(let area=0;area<8;area++){
   const expected={x:415+40*(area%4),y:335+23*Math.floor(area/4)},opts={kind:'blot',area,activity:'rinse-and-dry-produce'};
   for(const progress of [0,25,50,75,100]){const p=M.pose({...opts,phase:'position',nextPhase:'contact',progress});expect(p.contact.x).toBe(expected.x);expect(p.contact.y).toBe(expected.y);expect(p.tool.x).toBe(expected.x);}
   const touch=M.pose({...opts,phase:'contact'});expect(touch.tool).toMatchObject(expected);expect(touch.grip).toMatchObject(expected);expect(touch.contact.amount).toBe(1);
   const previous=M.pose({kind:'blot',area,phase:'contact'});expect(previous).toEqual(M.pose({...opts,activity:'surface-drying',phase:'contact'}));expect(previous.tool.x).toBe(355+70*(area%4));
  }
 });
 it('keeps both bare hands on basket handles and all eight whole caps contained throughout rinsing',()=>{
  for(let i=0;i<phases.length;i++)for(const progress of [0,25,50,75,100]){
   const p=rinse(phases[i],phases[i+1],progress),d=p.rinseProduce,a=p.tool.angle*Math.PI/180;
   expect(p.grip).toEqual(M.grip(p.tool,'rinseProduce'));expect(p.supportHand.x).toBeCloseTo(p.tool.x-76*Math.cos(a)+8*Math.sin(a),10);expect(p.supportHand.y).toBeCloseTo(p.tool.y-76*Math.sin(a)-8*Math.cos(a),10);
   expect(d.foodRetained).toBe(true);expect(d.food).toHaveLength(8);expect(d).not.toHaveProperty('transferred');expect(d.waterSurface.angle).toBe(0);
   for(const cap of d.food){const dx=cap.x-p.tool.x,dy=cap.y-p.tool.y;expect(Math.abs(dx*Math.cos(a)+dy*Math.sin(a))).toBeLessThan(50);expect(Math.abs(-dx*Math.sin(a)+dy*Math.cos(a))).toBeLessThan(10);}
   for(const side of ['left','right'])expect(M.handPresentation(p,side)).toMatchObject({gesture:'handle',contact:1,gear:'bare',rotation:p.tool.angle+90});
  }
 });
 it('lifts vertically before carrying and drains above the basin before returning level',()=>{
  for(const progress of [0,10,20,35]){const p=rinse('pickup','carry',progress);expect(p.tool.x).toBe(450);expect(p.tool.angle).toBe(0);}
  for(const progress of [35,50,75,100])expect(rinse('pickup','carry',progress).tool.y).toBeLessThanOrEqual(278);
  for(const progress of [0,25,50,75,100]){const lift=rinse('rinse','lift',progress),drain=rinse('lift','drain',progress),carry=rinse('drain','return',progress);expect(lift.tool.x).toBe(300);expect(drain.tool).toMatchObject({x:300,y:278,angle:0});expect(drain.rinseProduce.drain).toBeCloseTo(1-M.ease(progress/100),10);expect(carry.tool.y).toBeLessThanOrEqual(278);expect(carry.rinseProduce.drain).toBe(0);expect(carry.tool.angle).toBe(0);}
 });
 it('confines running-water cues to the basin and keeps the ready tip contained until application Release',()=>{
  const middle=rinse('lower','rinse',50);expect(middle.rinseProduce.waterFlow).toBe(1);expect(middle.tool.x).toBeCloseTo(300,10);expect(middle.tool.y).toBeCloseTo(330,10);
  for(const phase of phases.filter(p=>p!=='lower'))expect(rinse(phase,phases[phases.indexOf(phase)+1],50).rinseProduce.waterFlow).toBe(0);
  const ready=rinse('ready');expect(ready).toMatchObject({held:true,tool:{x:450,y:314,angle:32},rinseProduce:{contact:1,foodRetained:true,waterFlow:0,drain:0}});expect(ready.rinseProduce.food).toHaveLength(8);
 });
 it('joins all rinse phases exactly and retains connected rigid arms with reduced motion',()=>{
  for(const reducedMotion of [false,true])for(let i=0;i<phases.length;i++){
   for(const progress of [0,25,50,75,100]){const p=rinse(phases[i],phases[i+1],progress,reducedMotion);for(const side of ['left','right']){const hand=side==='right'?p.grip:p.supportHand,a=M.arm({side,hand,shoulder:p.shoulders[side]});expect(a.reachable).toBe(true);expect(distance(a.hand,hand)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}if(reducedMotion)expect(p.body).toMatchObject({x:0,y:0,angle:0});}
   if(phases[i+1]){const end=rinse(phases[i],phases[i+1],100,reducedMotion),next=rinse(phases[i+1],phases[i+2],0,reducedMotion);for(const key of ['tool','grip','supportHand','body','head','gaze'])expect(end[key]).toEqual(next[key]);expect(geometry(end)).toEqual(geometry(next));for(const side of ['left','right'])expect(M.handPresentation(end,side)).toEqual(M.handPresentation(next,side));}
  }
 });
 it('cancels a tipped rinse by leveling contained produce before lifting and returning it to the source',()=>{
  const source=rinse('ready'),saved=JSON.stringify(source),seen=new Set();
  for(let progress=0;progress<=100;progress++){const p=M.park(source,undefined,progress);seen.add(p.parkStage);expect(p.rinseProduce.foodRetained).toBe(true);expect(p.rinseProduce.food).toHaveLength(8);if(p.parkStage==='basket-level'){expect(p.tool.x).toBe(source.tool.x);expect(p.tool.y).toBe(source.tool.y);}if(p.parkStage==='basket-carry'){expect(p.tool.angle).toBe(0);expect(p.tool.y).toBeLessThanOrEqual(278);}if(p.parkStage==='basket-release')expect(p.tool).toMatchObject({x:450,y:340,angle:0});}
  const done=M.park(source,undefined,100);expect(done).toMatchObject({kind:null,held:false,rinseProduce:{preview:false,contact:0,foodRetained:true,waterFlow:0,drain:0,position:{x:450,y:340,angle:0}}});expect(seen.has('basket-level')&&seen.has('basket-lift')&&seen.has('basket-release')).toBe(true);expect(M.park(source,undefined,0,{reducedMotion:true})).toEqual(done);expect(JSON.stringify(source)).toBe(saved);
 });
 it('returns an explicitly committed empty basket to its separate rest without inventing a second transfer',()=>{
  const source=rinse('ready');source.rinseProduce.foodRetained=false;source.rinseProduce.food=[];
  for(const progress of [0,25,50,75,100]){const p=M.park(source,undefined,progress);expect(p.rinseProduce.foodRetained).toBe(false);expect(p.rinseProduce.food).toEqual([]);if(p.parkStage==='basket-carry')expect(p.tool.y).toBeLessThanOrEqual(278);}
  expect(M.park(source,undefined,100)).toMatchObject({held:false,rinseProduce:{preview:false,foodRetained:false,position:{x:650,y:340,angle:0}}});
 });
 it('restarts canceled rinsing from the exact current basket, caps, wrists and attention without mutating its inputs',()=>{
  for(const phase of ['lower','rinse','lift','return','ready']){const source=rinse(phase,phases[phases.indexOf(phase)+1],55),snapshot=JSON.stringify(source);
   for(const progress of [0,15,40,70,95]){const p=M.park(source,undefined,progress),restart=M.park(p,undefined,0);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders','rinseProduce'])expect(restart[key]).toEqual(p[key]);for(const side of ['left','right'])expect(M.handPresentation(restart,side)).toEqual(M.handPresentation(p,side));}
   expect(JSON.stringify(source)).toBe(snapshot);
  }
 });
 it('lets the nearer hand settle earlier and aligns wrists before the farther hand arrives',()=>{
  const from=M.pose({kind:'reserveWater',phase:'ready'}),to=M.pose({kind:'samplePasta',phase:'pickup'}),options={contactAware:true,articulatedApproach:true},p=M.reach(from,to,80,options);
  // Left travels roughly 98 px; right travels roughly 115 px.
  expect(distance(M.handPresentation(p,'left').anchor,M.handPresentation(to,'left').anchor)).toBeLessThan(1e-8);expect(distance(M.handPresentation(p,'right').anchor,M.handPresentation(to,'right').anchor)).toBeGreaterThan(.01);
  for(const side of ['left','right'])expect(M.handPresentation(p,side).rotation).toBeCloseTo(M.handPresentation(to,side).rotation,10);
 });
 it('keeps articulated hands planted during release and never closes a moving grip',()=>{
  const from=M.pose({kind:'reserveWater',phase:'ready'}),to=M.pose({kind:'samplePasta',phase:'pickup'}),options={contactAware:true,anticipatoryAttention:true,articulatedApproach:true},saved=JSON.stringify({from,to});
  for(let progress=0;progress<100;progress++){const p=M.reach(from,to,progress,options);for(const side of ['left','right']){const h=M.handPresentation(p,side),a=M.handPresentation(from,side),b=M.handPresentation(to,side);if(p.handoff.stage==='release')expect(h.anchor).toEqual(a.anchor);else if(p.handoff.stage==='travel')expect(h.contact).toBe(0);else if(h.contact>0)expect(distance(h.anchor,b.anchor)).toBeLessThan(1e-8);if([30,60,90].includes(progress)){const restart=M.reach(p,to,0,options);expect(M.handPresentation(restart,side)).toEqual(h);}}
  }
  expect(M.reach(from,to,100,options)).toEqual(to);expect(M.reach(from,to,0,{...options,reducedMotion:true})).toEqual(to);expect(JSON.stringify({from,to})).toBe(saved);
 });
 it('retains held tools and stabilizing contacts and leaves legacy reaches exact when articulation is omitted',()=>{
  const from=M.pose({kind:'mince',clove:0,phase:'ready'}),to=M.pose({kind:'mince',clove:1,phase:'pickup'});
  for(const progress of [0,10,25,50,75,99]){const p=M.reach(from,to,progress,{contactAware:true,articulatedApproach:true});expect(p.tool).toEqual(from.tool);expect(p.grip).toEqual(from.grip);expect(M.handPresentation(p,'right').contact).toBe(1);expect(M.reach(from,to,progress,{contactAware:true,articulatedApproach:false})).toEqual(M.reach(from,to,progress,{contactAware:true}));expect(M.reach(from,to,progress,{articulatedApproach:true})).toEqual(M.reach(from,to,progress));}
 });
});

describe('Chef station smooth elbow depth, produce trays and released hands',()=>{
 const steps=['pickup','grip','lift','carry','lower','tilt','ready'];
 const load=(phase,nextPhase,progress=0,reducedMotion=false)=>M.pose({kind:'loadMushrooms',phase,nextPhase,progress,reducedMotion});
 const data=p=>{const {stage,...d}=p.loadMushrooms;return d;};
 it('softens the elbow depth limit while retaining exact wrists, bone lengths and default output',()=>{
  for(const side of ['left','right'])for(const hand of [{x:220,y:320},{x:450,y:280},{x:692,y:289},{x:705,y:349}]){
   const old=M.arm({side,hand}),smooth=M.arm({side,hand,smoothDepth:true}),shoulder={x:side==='left'?373:526,y:229};
   expect(M.arm({side,hand,smoothDepth:false})).toEqual(old);expect(smooth.hand.x).toBe(old.hand.x);expect(smooth.hand.y).toBe(old.hand.y);expect(smooth.reachable).toBe(old.reachable);expect(worldDistance(shoulder,smooth.elbow)).toBeCloseTo(108,8);expect(worldDistance(smooth.elbow,smooth.hand)).toBeCloseTo(126,8);expect(Object.values(M.armContours(smooth).bounds).every(Number.isFinite)).toBe(true);
  }
 });
 it('removes the projected elbow velocity kink at the old cap and joins both smoothing boundaries',()=>{
  const h=.0001,angle=20*Math.PI/180,jump=(raw,smoothDepth)=>{const d=Math.sqrt((234-.001)**2-(raw/.65)**2),elbow=offset=>M.arm({side:'right',hand:{x:526+Math.cos(angle)*(d+offset),y:229+Math.sin(angle)*(d+offset)},smoothDepth}).elbow,a=elbow(-h),b=elbow(0),c=elbow(h);return Math.hypot((c.x-2*b.x+a.x)/h,(c.y-2*b.y+a.y)/h);};
  expect(jump(100,false)).toBeGreaterThan(.3);for(const raw of [80,100,120])expect(jump(raw,true)).toBeLessThan(.00001);
 });
 it('joins both hands before lifting the tray and contains all fourteen pieces even at the ready tilt',()=>{
  for(const progress of [0,25,50,75,85,95,100]){const p=load('pickup','grip',progress);expect(p.tool).toMatchObject({x:270,y:340,angle:0});if(p.loadMushrooms.contact>0){expect(p.grip).toEqual(M.grip(p.tool,'loadMushrooms'));expect(p.supportHand).toEqual({x:205,y:332,angle:0});}}
  for(let i=0;i<steps.length;i++)for(const progress of [0,25,50,75,100]){const p=load(steps[i],steps[i+1],progress),a=p.tool.angle*Math.PI/180;expect(p.loadMushrooms.foodRetained).toBe(true);expect(p.loadMushrooms.food).toHaveLength(14);expect(p.loadMushrooms).not.toHaveProperty('transferred');for(const cap of p.loadMushrooms.food){const dx=cap.x-p.tool.x,dy=cap.y-p.tool.y;expect(Math.abs(dx*Math.cos(a)+dy*Math.sin(a))).toBeLessThanOrEqual(55+1e-8);expect(Math.abs(-dx*Math.sin(a)+dy*Math.cos(a))).toBeLessThanOrEqual(7+1e-8);}}
  expect(load('ready')).toMatchObject({held:true,tool:{x:450,y:292,angle:25},loadMushrooms:{contact:1,foodRetained:true}});
 });
 it('raises the tray vertically before a level carry and keeps the bottom clear of the hot pan',()=>{
  for(const progress of [0,25,50,75,100]){const lift=load('grip','lift',progress),carry=load('lift','carry',progress),lower=load('carry','lower',progress);expect(lift.tool.x).toBe(270);expect(carry.tool.y).toBeLessThanOrEqual(275);expect(carry.tool.angle).toBe(0);expect(lower.tool.x).toBe(450);expect(lower.tool.y+18).toBeLessThanOrEqual(310);}
 });
 it('joins every tray phase with exact hands, food and attention in both motion settings',()=>{
  for(const reducedMotion of [false,true])for(let i=0;i<steps.length-1;i++){const a=load(steps[i],steps[i+1],100,reducedMotion),b=load(steps[i+1],steps[i+2],0,reducedMotion);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders','trayJoining'])expect(a[key]).toEqual(b[key]);expect(data(a)).toEqual(data(b));for(const side of ['left','right'])expect(M.handPresentation(a,side)).toEqual(M.handPresentation(b,side));}
 });
 it('levels a canceled full tray and returns committed empty trays without recreating food',()=>{
  for(const empty of [false,true]){const source=load('ready');if(empty){source.loadMushrooms.foodRetained=false;source.loadMushrooms.food=[];}const saved=JSON.stringify(source);
   for(const progress of [0,10,30,50,70,80,90,100]){const p=M.park(source,undefined,progress);expect(p.loadMushrooms.food).toHaveLength(empty?0:14);expect(p.loadMushrooms.foodRetained).toBe(!empty);if(p.parkStage==='tray-level')expect(p.tool).toMatchObject({x:450,y:292});if(p.parkStage==='tray-carry'){expect(p.tool.angle).toBe(0);expect(p.tool.y).toBeLessThanOrEqual(275);}if(p.parkStage==='hands-withdraw'){expect(p.tool).toMatchObject({x:270,y:340,angle:0});expect(p.loadMushrooms.contact).toBe(0);}}
   const done=M.park(source,undefined,100);expect(done).toMatchObject({kind:null,held:false,grip:{x:363,y:280},supportHand:{x:177,y:280},loadMushrooms:{preview:false,position:{x:270,y:340,angle:0}}});expect(M.park(source,undefined,0,{reducedMotion:true})).toEqual(done);expect(JSON.stringify(source)).toBe(saved);
  }
 });
 it('opts rinsing into supported release followed by empty hand withdrawal while preserving the old default',()=>{
  for(const empty of [false,true]){const source=M.pose({kind:'rinseProduce',phase:'ready'});if(empty){source.rinseProduce.foodRetained=false;source.rinseProduce.food=[];}const homeX=empty?650:450;
   for(const progress of [0,25,50,75,85,95,100]){expect(M.park(source,undefined,progress,{relaxedRest:false})).toEqual(M.park(source,undefined,progress));const p=M.park(source,undefined,progress,{relaxedRest:true});if(progress>=78){expect(p.tool).toMatchObject({x:homeX,y:340,angle:0});for(const side of ['left','right'])expect(M.handPresentation(p,side)).toMatchObject({contact:0,closure:.18,role:'free'});}}
   const done=M.park(source,undefined,100,{relaxedRest:true});expect(done.grip).toMatchObject({x:homeX+104,y:280});expect(done.supportHand).toMatchObject({x:homeX-104,y:280});expect(M.parkDuration(source,undefined,{relaxedRest:true})).toBeGreaterThan(M.parkDuration(source));expect(M.park(source,undefined,0,{relaxedRest:true,reducedMotion:true})).toEqual(done);
  }
 });
 it('restarts withdrawal without a basket regrip or any wrist, tool, attention or food jump',()=>{
  for(const kind of ['rinseProduce','loadMushrooms']){const source=M.pose({kind,phase:'ready'}),options={relaxedRest:true};for(const progress of [81,90,97]){const p=M.park(source,undefined,progress,options),restart=M.park(p,undefined,0,options);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders',kind])expect(restart[key]).toEqual(p[key]);for(const side of ['left','right'])expect(M.handPresentation(restart,side)).toEqual(M.handPresentation(p,side));expect(M.park(p,undefined,50,options).parkStage).toBe('hands-withdraw');}}
 });
});

describe('Chef station contained pasta combining and spoon clearance',()=>{
 const steps=['pickup','grip','lift','carry','lower','tilt','ready'];
 const combine=(phase,nextPhase,progress=0,reducedMotion=false)=>M.pose({kind:'combinePasta',phase,nextPhase,progress,reducedMotion});
 const bottom=tool=>{const a=tool.angle*Math.PI/180;return tool.y+7*Math.cos(a)+Math.hypot(13*Math.sin(a),20*Math.cos(a));};
 it('closes both mitts only at the handles and keeps decorative pasta contained until Release',()=>{
  for(const progress of [0,25,50,75,85,95,100]){const p=combine('pickup','grip',progress);expect(p.tool).toMatchObject({x:270,y:340,angle:0});if(p.combinePasta.contact>0){expect(p.grip).toEqual(M.grip(p.tool,'combinePasta'));expect(p.supportHand).toEqual({x:200,y:332,angle:0});}}
  for(let i=0;i<steps.length;i++)for(const progress of [0,25,50,75,100]){const p=combine(steps[i],steps[i+1],progress),a=p.tool.angle*Math.PI/180;expect(p.combinePasta.foodRetained).toBe(true);expect(p.combinePasta.food).toHaveLength(12);expect(p.combinePasta).not.toHaveProperty('transferred');for(const food of p.combinePasta.food){const dx=food.x-p.tool.x,dy=food.y-p.tool.y;expect(Math.abs(dx*Math.cos(a)+dy*Math.sin(a))).toBeLessThanOrEqual(46+1e-8);expect(-dx*Math.sin(a)+dy*Math.cos(a)).toBeGreaterThanOrEqual(-9-1e-8);expect(-dx*Math.sin(a)+dy*Math.cos(a)).toBeLessThanOrEqual(11+1e-8);}for(const side of ['left','right'])expect(M.handPresentation(p,side).gear).toBe('mitt');}
  expect(combine('ready')).toMatchObject({held:true,tool:{x:480,y:280,angle:28},combinePasta:{contact:1,foodRetained:true}});
 });
 it('joins all colander phases exactly and raises it before carrying level over the pan',()=>{
  for(const reducedMotion of [false,true])for(let i=0;i<steps.length;i++){for(const progress of [0,25,50,75,100]){const p=combine(steps[i],steps[i+1],progress,reducedMotion);for(const side of ['left','right']){const h=M.handPresentation(p,side),a=M.arm({side,hand:h.anchor,shoulder:p.shoulders[side],smoothDepth:true});expect(a.reachable).toBe(true);expect(distance(a.hand,h.anchor)).toBeLessThan(1e-8);}if(steps[i]==='grip')expect(p.tool.x).toBe(270);if(steps[i]==='lift'){expect(p.tool.y).toBeLessThanOrEqual(260);expect(p.tool.angle).toBe(0);}}
   if(steps[i+1]){const a=combine(steps[i],steps[i+1],100,reducedMotion),b=combine(steps[i+1],steps[i+2],0,reducedMotion);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders','trayJoining'])expect(a[key]).toEqual(b[key]);expect(a.combinePasta.food).toEqual(b.combinePasta.food);for(const side of ['left','right'])expect(M.handPresentation(a,side)).toEqual(M.handPresentation(b,side));}
  }
 });
 it('returns full cancellations or empty committed colanders before opening and withdrawing the mitts',()=>{
  for(const empty of [false,true]){const source=combine('ready');if(empty){source.combinePasta.foodRetained=false;source.combinePasta.food=[];}const saved=JSON.stringify(source);
   for(const progress of [0,10,30,50,70,80,90,100]){const p=M.park(source,undefined,progress);expect(p.combinePasta.food).toHaveLength(empty?0:12);expect(p.combinePasta.foodRetained).toBe(!empty);if(p.parkStage==='colander-level')expect(p.tool).toMatchObject({x:480,y:280});if(p.parkStage==='colander-carry'){expect(p.tool.angle).toBe(0);expect(p.tool.y).toBeLessThanOrEqual(260);}if(p.parkStage==='hands-withdraw'){expect(p.tool).toMatchObject({x:270,y:340,angle:0});expect(p.combinePasta.contact).toBe(0);}for(const side of ['left','right'])expect(M.handPresentation(p,side).gear).toBe('mitt');}
   const done=M.park(source,undefined,100);expect(done).toMatchObject({kind:null,held:false,grip:{x:368,y:280},supportHand:{x:172,y:280},combinePasta:{preview:false,position:{x:270,y:340,angle:0}}});expect(M.park(source,undefined,0,{reducedMotion:true})).toEqual(done);expect(JSON.stringify(source)).toBe(saved);
   for(const progress of [15,45,75,85,95]){const p=M.park(source,undefined,progress),restart=M.park(p,undefined,0);for(const key of ['tool','grip','supportHand','body','head','gaze','shoulders','combinePasta'])expect(restart[key]).toEqual(p[key]);for(const side of ['left','right'])expect(M.handPresentation(restart,side)).toEqual(M.handPresentation(p,side));}
  }
 });
 it('lifts the whole spoon clear before crossing a pan rim and lowers only at the destination',()=>{
  for(const kind of ['fold','inspect'])for(const [phase,nextPhase] of kind==='fold'?[['pickup','immerse'],['turn','ready']]:[['pickup','dip'],['dip','lift'],['lift','ready']])for(const reducedMotion of [false,true]){
   const options={kind,phase,nextPhase,reducedMotion},start=M.keyframe(kind,phase),end=M.keyframe(kind,nextPhase);
   for(let progress=0;progress<=100;progress++){const p=M.pose({...options,progress,clearanceAware:true});expect(p.grip).toEqual(M.grip(p.tool,kind));if(progress<=25)expect(p.tool.x).toBe(start.x);if(progress>=25&&progress<=75)expect(bottom(p.tool)).toBeLessThan(307);if(progress>=75)expect(p.tool.x).toBe(end.x);if(progress===0||progress===100)expect(p).toEqual(M.pose({...options,progress}));}
  }
 });
 it('keeps canceled spoon carries high, opens only after rest, and preserves disabled and thermal output',()=>{
  for(const kind of ['fold','inspect']){const source=M.pose({kind,phase:kind==='fold'?'turn':'dip'}),home=M.pose({kind,phase:'ready'}),saved=JSON.stringify({source,home});
   for(let progress=0;progress<=100;progress++){expect(M.park(source,home,progress,{clearanceAware:false})).toEqual(M.park(source,home,progress));const p=M.park(source,home,progress,{clearanceAware:true});if(p.parkStage==='carry')expect(bottom(p.tool)).toBeLessThan(307);if(p.parkStage==='release')expect(p.tool).toEqual({...home.tool,visible:true});if([10,40,80,95].includes(progress)){const restart=M.park(p,home,0,{clearanceAware:true});for(const key of ['tool','grip','supportHand','body','head','gaze'])expect(restart[key]).toEqual(p[key]);}}
   expect(M.park(source,home,0,{clearanceAware:true,reducedMotion:true})).toEqual(M.park(source,home,100,{clearanceAware:true}));expect(M.parkDuration(source,home,{clearanceAware:true})).toBe(1700);expect(JSON.stringify({source,home})).toBe(saved);
   const thermal={kind,activity:'cool-and-fold-sauce',phase:'pickup',nextPhase:kind==='fold'?'immerse':'dip',progress:60};expect(M.pose({...thermal,clearanceAware:true})).toEqual(M.pose(thermal));
  }
 });
 it('gives the finishing water jug a reachable rest clear of the colander without moving other jug rests',()=>{
  for(const phase of ['pickup','ready']){const p=M.pose({kind:'pour',activity:'finish-pasta-in-sauce',phase});expect(p.tool).toMatchObject({x:110,y:290,angle:0});expect(p.grip).toMatchObject({x:153,y:295});expect(M.arm({side:'left',hand:p.grip,shoulder:p.shoulders.left}).reachable).toBe(true);expect(M.pose({kind:'pour',phase}).tool).toMatchObject({x:230,y:318,angle:0});}
 });
});

describe('Chef station retained serving spoon and reversible portion handling',()=>{
 const steps=['pickup','scoop','lift','carry','tip','level','ready'];
 const pose=(kind,plate,index,progress=0,reducedMotion=false)=>M.pose({kind,plate,phase:steps[index],nextPhase:steps[index+1],progress,reducedMotion,portionAware:true});
 const keys=['tool','grip','supportHand','body','head','gaze','shoulders'];
 const bottom=tool=>{const a=tool.angle*Math.PI/180;return tool.y+7*Math.cos(a)+Math.hypot(19*Math.sin(a),23*Math.cos(a))+1;};
 it('loads only after the completed scoop and holds the opaque spoonful through destination readiness',()=>{
  for(const kind of ['serve','return'])for(const plate of [0,1])for(let index=0;index<steps.length;index++)for(const progress of [0,25,50,75,99,100]){
   const p=pose(kind,plate,index,progress),loaded=index>0||progress===100;
   expect(p.servingTransfer.loaded).toBe(loaded?1:0);expect(p.servingTransfer.foodRetained).toBe(loaded);expect(p.servingTransfer.preview).toBe(true);expect(p.servingTransfer.committed).toBe(false);expect(p.servingTransfer.position).toEqual({x:p.tool.x,y:p.tool.y,angle:p.tool.angle});expect(p.servingTransfer.source.kind).toBe(kind==='serve'?'pan':'plate');expect(p.servingTransfer.destination.kind).toBe(kind==='serve'?'plate':'pan');
  }
  for(const kind of ['serve','return'])for(const plate of [0,1]){const ready=pose(kind,plate,6);expect(ready.tool.x).toBe(kind==='serve'?(plate?720:285):514);expect(ready.servingTransfer.loaded).toBe(1);expect(ready.tool.angle).toBe(0);expect(ready.grip).toEqual(M.grip(ready.tool,kind));}
 });
 it('joins every phase exactly with both hands and stays reachable in both motion settings',()=>{
  for(const kind of ['serve','return'])for(const plate of [0,1])for(const reducedMotion of [false,true])for(let index=0;index<steps.length;index++){
   for(const progress of [0,10,25,50,75,90,100]){const p=pose(kind,plate,index,progress,reducedMotion);for(const side of ['left','right']){const hand=M.handPresentation(p,side),a=M.arm({side,shoulder:p.shoulders[side],hand:hand.anchor,smoothDepth:true});expect(a.reachable).toBe(true);expect(distance(a.hand,hand.anchor)).toBeLessThan(1e-8);expect(worldDistance(p.shoulders[side],a.elbow)).toBeCloseTo(108,8);expect(worldDistance(a.elbow,a.hand)).toBeCloseTo(126,8);}}
   if(steps[index+1]){const a=pose(kind,plate,index,100,reducedMotion),b=pose(kind,plate,index+1,0,reducedMotion);for(const key of keys)expect(a[key]).toEqual(b[key]);const {stage:sa,...da}=a.servingTransfer,{stage:sb,...db}=b.servingTransfer;expect(da).toEqual(db);for(const side of ['left','right'])expect(M.handPresentation(a,side)).toEqual(M.handPresentation(b,side));}
  }
 });
 it('raises the entire ladle clear before any loaded lateral carry and lowers only above the destination',()=>{
  for(const kind of ['serve','return'])for(const plate of [0,1])for(let progress=0;progress<=100;progress++){
   const lift=pose(kind,plate,1,progress),carry=pose(kind,plate,2,progress),lower=pose(kind,plate,3,progress);expect(lift.tool.x).toBe(lift.servingTransfer.source.x);expect(carry.tool.angle).toBe(0);expect(bottom(carry.tool)).toBeLessThan(307);expect(lower.tool.x-7*Math.sin(lower.tool.angle*Math.PI/180)).toBeCloseTo(lower.servingTransfer.destination.x,10);const approach=pose(kind,plate,0,progress);if(progress>=28&&progress<=72)expect(bottom(approach.tool)).toBeLessThan(307);
  }
 });
 it('returns a canceled retained spoonful to its exact original source before any empty return',()=>{
  for(const kind of ['serve','return'])for(const plate of [0,1]){const source=pose(kind,plate,6),saved=JSON.stringify(source);let sawRelease=false,sawEmpty=false;
   for(let progress=0;progress<=100;progress++){const p=M.park(source,undefined,progress,{portionAware:true});if(p.parkStage==='food-release'){expect(p.tool).toMatchObject({x:source.servingTransfer.source.x,y:source.servingTransfer.source.y-7,angle:0});expect(p.servingTransfer.loaded).toBe(1);sawRelease=true;}if(p.parkStage?.startsWith('empty-')){expect(p.servingTransfer.loaded).toBe(0);sawEmpty=true;}if(p.parkStage==='food-carry'||p.parkStage==='empty-carry')expect(bottom(p.tool)).toBeLessThan(307);}
   expect(sawRelease&&sawEmpty).toBe(true);const done=M.park(source,undefined,100,{portionAware:true});expect(done).toMatchObject({kind:null,held:false,parkStage:'parked',tool:{x:514,y:350,angle:-35,visible:false},servingTransfer:{loaded:0,foodRetained:false,preview:false,committed:false}});for(const side of ['left','right'])expect(M.handPresentation(done,side)).toMatchObject({gesture:'relaxed',contact:0,closure:.18,role:'free'});expect(JSON.stringify(source)).toBe(saved);
  }
 });
 it('returns committed spoons empty directly from the actual destination without recreating a portion',()=>{
  for(const kind of ['serve','return'])for(const plate of [0,1]){const source=pose(kind,plate,6);for(let progress=0;progress<=100;progress++){const p=M.park(source,undefined,progress,{portionAware:true,servingCommitted:true});expect(p.servingTransfer).toMatchObject({loaded:0,foodRetained:false,committed:true});expect(p.parkStage).not.toMatch(/^food-/);if(progress===0){for(const key of keys)expect(p[key]).toEqual(source[key]);for(const side of ['left','right'])expect(M.handPresentation(p,side)).toEqual(M.handPresentation(source,side));}}}
 });
 it('preserves exact cancellation starts, restart hand semantics, immutability and reduced-motion endings',()=>{
  for(const kind of ['serve','return'])for(const plate of [0,1])for(const committed of [false,true])for(const index of [0,1,2,3,4,5,6]){
   const source=pose(kind,plate,index,50),options={portionAware:true,servingCommitted:committed},saved=JSON.stringify(source);for(const progress of [0,10,25,50,70,85,95]){const p=M.park(source,undefined,progress,options),restart=M.park(p,undefined,0,options);for(const key of keys)expect(restart[key]).toEqual(p[key]);expect(restart.servingTransfer).toEqual(p.servingTransfer);for(const side of ['left','right'])expect(M.handPresentation(restart,side)).toEqual(M.handPresentation(p,side));}
   expect(M.park(source,undefined,0,{...options,reducedMotion:true})).toEqual(M.park(source,undefined,100,options));expect(M.parkDuration(source,undefined,options)).toBeGreaterThan(0);expect(JSON.stringify(source)).toBe(saved);
  }
 });
 it('leaves disabled serving options and unrelated choreography exactly unchanged',()=>{
  for(const kind of ['serve','return'])for(const plate of [0,1])for(let index=0;index<steps.length;index++)for(const progress of [0,25,50,75,100]){const o={kind,plate,phase:steps[index],nextPhase:steps[index+1],progress,clearanceAware:true},p=M.pose(o);expect(M.pose({...o,portionAware:false})).toEqual(p);expect(M.keyframe(kind,steps[index],{plate,portionAware:false})).toEqual(M.keyframe(kind,steps[index],{plate}));expect(M.park(p,undefined,progress,{portionAware:false})).toEqual(M.park(p,undefined,progress));expect(M.parkDuration(p,undefined,{portionAware:false})).toBe(M.parkDuration(p));}
  for(const kind of ['inspect','fold','pour','combinePasta','loadMushrooms'])for(const progress of [0,50,100]){const o={kind,phase:'pickup',nextPhase:kind==='combinePasta'||kind==='loadMushrooms'?'grip':kind==='fold'?'immerse':'dip',progress,clearanceAware:true};expect(M.pose({...o,portionAware:true})).toEqual(M.pose(o));}
 });
});
