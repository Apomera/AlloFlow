import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function airborne(extra={}){return Object.assign(BF.freshState(),{paused:false},extra);}
function fly(s,seconds,keys={},dt=1/60){for(let time=0;time<seconds-1e-9;time+=dt)BF.advanceFrame(s,Math.min(dt,seconds-time),keys);return s;}

describe('Butterfly flight handling',()=>{
 it('accelerates into world-axis movement without a diagonal speed advantage',()=>{
   const forward=airborne({controlMode:'map'}),diagonal=airborne({controlMode:'map'});
   BF.step(forward,.05,{forward:true});BF.step(diagonal,.05,{forward:true,right:true});
   expect(forward.vz).toBeLessThan(0);expect(forward.vx).toBe(0);
   const firstSpeed=Math.hypot(forward.vx,forward.vz);
   expect(firstSpeed).toBeGreaterThan(0);
   expect(Math.hypot(diagonal.vx,diagonal.vz)).toBeCloseTo(firstSpeed,9);
   expect(Math.hypot(diagonal.x,diagonal.z-52)).toBeCloseTo(Math.abs(forward.z-52),9);
   fly(forward,1,{forward:true});expect(Math.hypot(forward.vx,forward.vz)).toBeGreaterThan(firstSpeed);
   const sideways=airborne({controlMode:'map',yaw:Math.PI/2});BF.step(sideways,.05,{right:true});
   expect(sideways.x).toBeGreaterThan(0);expect(sideways.z).toBe(52);
 });

 it('starts in direct steering and turns the heading while hovering',()=>{
   const left=airborne(),right=airborne(),opposed=airborne();
   expect(left.controlMode).toBe('steer');expect(left.turnVelocity).toBe(0);
   fly(left,.5,{left:true});fly(right,.5,{right:true});fly(opposed,.5,{left:true,right:true});
   expect(left.yaw).toBeGreaterThan(0);expect(right.yaw).toBeLessThan(0);
   expect(left.yaw).toBeCloseTo(-right.yaw,10);
   expect(left.bank).toBeGreaterThan(0);expect(right.bank).toBeLessThan(0);
   for(const s of [left,right,opposed]){
     expect(s.x).toBe(0);expect(s.z).toBe(52);expect(s.energy).toBe(100);
     expect(s.observations).toEqual([]);
   }
   expect(opposed.yaw).toBe(0);expect(opposed.turnVelocity).toBe(0);
 });

 it('applies forward thrust along the butterfly heading instead of a world axis',()=>{
   for(const yaw of [0,Math.PI/2,-Math.PI/3,Math.PI]){
     const s=fly(airborne({yaw}),.8,{forward:true}),distance=Math.hypot(s.x,s.z-52);
     expect(distance).toBeGreaterThan(5);
     expect(s.x/distance).toBeCloseTo(-Math.sin(yaw),9);
     expect((s.z-52)/distance).toBeCloseTo(-Math.cos(yaw),9);
     expect(s.yaw).toBeCloseTo(yaw,9);
   }
 });

 it('brakes more firmly than coasting and never turns back into reverse thrust',()=>{
   const moving=fly(airborne(),1,{forward:true}),coasting={...moving},braking={...moving};
   fly(coasting,.35);fly(braking,.35,{back:true});
   expect(Math.hypot(braking.vx,braking.vz)).toBeLessThan(Math.hypot(coasting.vx,coasting.vz));
   expect(braking.z).toBeLessThan(moving.z);
   expect(braking.z).toBeGreaterThan(coasting.z);
   const stoppedAt=braking.z;fly(braking,2,{forward:true,back:true});
   expect(braking.z).toBeLessThanOrEqual(stoppedAt);expect(braking.vz).toBe(0);
   const stationary=fly(airborne(),1,{back:true});
   expect(stationary.x).toBe(0);expect(stationary.z).toBe(52);expect(stationary.energy).toBe(100);
 });

 it('keeps the same journey and energy use across slow and fast frame rates',()=>{
   const smooth=airborne(),slow=airborne();
   fly(smooth,2,{forward:true},1/60);fly(slow,2,{forward:true},.1);
   expect(smooth.clock).toBeCloseTo(2,8);expect(slow.clock).toBeCloseTo(2,8);
   expect(smooth.energy).toBeCloseTo(slow.energy,8);
   expect(Math.abs(smooth.z-slow.z)).toBeLessThan(.02);
   expect(Math.abs(smooth.vz-slow.vz)).toBeLessThan(.02);
 });

 it('keeps a curved direct-flight journey consistent across frame rates',()=>{
   const smooth=airborne(),slow=airborne();
   for(const [seconds,keys] of [[1.4,{forward:true,right:true}],[.6,{forward:true}],[.3,{back:true,left:true}]]){
     fly(smooth,seconds,keys,1/60);fly(slow,seconds,keys,.1);
   }
   expect(smooth.clock).toBeCloseTo(slow.clock,9);
   expect(smooth.energy).toBeCloseTo(slow.energy,9);
   expect(Math.atan2(Math.sin(smooth.yaw-slow.yaw),Math.cos(smooth.yaw-slow.yaw))).toBeCloseTo(0,8);
   expect(Math.hypot(smooth.x-slow.x,smooth.z-slow.z)).toBeLessThan(.15);
   expect(Math.hypot(smooth.vx-slow.vx,smooth.vz-slow.vz)).toBeLessThan(.05);
 });

 it('turns the body gradually and banks while changing direction',()=>{
   const s=fly(airborne(),1,{forward:true}),before=s.yaw;
   BF.step(s,.05,{right:true});
   const turn=Math.atan2(Math.sin(s.yaw-before),Math.cos(s.yaw-before));
   expect(Math.abs(turn)).toBeGreaterThan(0);expect(Math.abs(turn)).toBeLessThan(Math.PI/2);
   // Forward is local -Z and the right wing is +X, so a right turn needs
   // negative Z roll to lower the inside wing rather than bank outward.
   expect(s.bank).toBeLessThan(0);expect(Math.abs(s.bank)).toBeLessThan(Math.PI/2);
   expect(Number.isFinite(s.pitch)).toBe(true);
   const left=fly(airborne(),1,{forward:true});BF.step(left,.05,{left:true});expect(left.bank).toBeGreaterThan(0);
 });

 it('stops transient momentum without moving the butterfly or changing its records',()=>{
   const s=fly(airborne({observations:['milkweed']}),1,{forward:true,rise:true});
   const before={x:s.x,y:s.y,z:s.z,clock:s.clock,energy:s.energy,saved:BF.save(s)};
   s.gliding=true;s.turnVelocity=.8;BF.stopFlight(s);
   expect(s).toMatchObject({vx:0,vy:0,vz:0,bank:0,pitch:0,gliding:false,turnVelocity:0});
   expect({x:s.x,y:s.y,z:s.z,clock:s.clock,energy:s.energy,saved:BF.save(s)}).toEqual(before);
   for(const paused of [true,false]){
     const frozen={...s,paused,landed:paused?null:'milkweed',turnVelocity:.8},snapshot=JSON.stringify(frozen);
     BF.advanceFrame(frozen,.25,{right:true,rise:true});expect(JSON.stringify(frozen)).toBe(snapshot);
   }
 });

 it('glides along the heading while descending, with manual control still tied to world axes',()=>{
   const s=airborne({controlMode:'map',gliding:true,yaw:Math.PI/2,y:10});fly(s,1);
   expect(s.x).toBeLessThan(0);expect(Math.abs(s.z-52)).toBeLessThan(.001);expect(s.y).toBeLessThan(10);
   const manual=airborne({controlMode:'map',gliding:true,yaw:Math.PI/2,y:10});fly(manual,.5,{right:true});
   expect(manual.x).toBeGreaterThan(0);
 });

 it('steers a direct glide along its changing heading and lets back brake it',()=>{
   const straight=fly(airborne({gliding:true,y:10}),1),turning=fly(airborne({gliding:true,y:10}),1,{right:true});
   expect(turning.x).toBeGreaterThan(2);expect(turning.z).toBeLessThan(52);
   expect(turning.yaw).toBeLessThan(0);expect(turning.bank).toBeLessThan(0);
   expect(turning.y).toBeLessThan(10);expect(turning.gliding).toBe(true);
   expect(straight.x).toBe(0);expect(turning.z).toBeGreaterThan(straight.z);
   const coasting={...turning},braking={...turning};fly(coasting,.4);fly(braking,.4,{back:true});
   expect(Math.hypot(braking.vx,braking.vz)).toBeLessThan(Math.hypot(coasting.vx,coasting.vz));
 });

 it.each(['left','right','forward','back','rise','lower'])('lets direct %s control take over guidance without changing fieldwork',direction=>{
   const s=airborne({target:'lawn',y:10,observations:['milkweed']}),before=BF.save(s);
   BF.step(s,.05,{[direction]:true});
   expect(s.target).toBeNull();expect(s.paused).toBe(false);
   expect(BF.save(s)).toEqual(before);
   if(direction==='left'||direction==='right'){
     expect(Math.sign(s.yaw)).toBe(direction==='left'?1:-1);
     expect(s.x).toBe(0);expect(s.z).toBe(52);
   }
 });

 it.each(['rise','lower'])('lets %s take over altitude from guided travel',direction=>{
   const s=airborne({target:'milkweed',y:10});
   BF.step(s,.05,{[direction]:true});
   expect(s.target).toBeNull();expect(s.paused).toBe(false);
   if(direction==='rise')expect(s.y).toBeGreaterThan(10);
   else expect(s.y).toBeLessThan(10);
   expect(s.observations).toEqual([]);
 });

 it('slows into each guided patch and leaves landing and evidence to the learner',()=>{
   for(const p of BF.habitats(BF.freshState())){
     const s=airborne({target:p.id});
     for(let i=0;i<2000&&!s.paused;i++)BF.step(s,.05,{});
     expect(s.paused).toBe(true);expect(s.target).toBeNull();expect(s.landed).toBeNull();
     expect(BF.nearest(s).plant.id).toBe(p.id);expect(BF.nearest(s).distance).toBeLessThan(4);
     expect(Math.hypot(s.vx,s.vy,s.vz)).toBe(0);expect(s.observations).toEqual([]);
     expect(BF.land(s).ok).toBe(true);expect(s.observations).toEqual([]);
   }
 });

 it('restores fieldwork safely without persisting flight momentum or visual pose',()=>{
   const s=fly(airborne(),1,{forward:true,rise:true}),saved=BF.save(s);
   for(const key of ['vx','vy','vz','bank','pitch','wingPhase','gliding','turnVelocity','controlMode'])expect(saved).not.toHaveProperty(key);
   const restored=BF.freshState({...saved,vx:Infinity,vy:50,vz:-99,bank:4,pitch:2,gliding:true,turnVelocity:20,controlMode:'map'});
   expect(restored).toMatchObject({paused:true,vx:0,vy:0,vz:0,bank:0,pitch:0,gliding:false,turnVelocity:0,controlMode:'steer'});
 });

 it('perches at the planned plant location without silently examining it',()=>{
   for(const id of ['milkweed','bergamot','lawn']){
     const s=BF.freshState(),p=BF.habitats(s).find(item=>item.id===id);
     Object.assign(s,{x:p.x,z:p.z,energy:41,clock:8});
     const pose=BF.landingPose(s,p);
     expect(Math.hypot(pose.x-p.x,pose.z-p.z)).toBeLessThan(14);
     expect(pose.y).toBeGreaterThan(0);expect(Number.isFinite(pose.yaw)).toBe(true);
     expect(BF.land(s).ok).toBe(true);expect(s).toMatchObject(pose);
     expect(s.observations).toEqual([]);expect(s.energy).toBe(41);expect(s.clock).toBe(8);
   }
 });
});

describe('Butterfly flight presentation',()=>{
 it('provides stable reduced-motion wings and removes bobbing and banking',()=>{
   const a=airborne({clock:2,wingPhase:2,bank:.3,pitch:.2}),b={...a,clock:15,wingPhase:15};
   const reducedA=BF.flightPose(a,true),reducedB=BF.flightPose(b,true);
   expect(reducedA).toMatchObject({bob:0,bank:0,pitch:0});expect(reducedB).toEqual(reducedA);
   expect(BF.flightPose(a,false)).not.toEqual(BF.flightPose(b,false));
   for(const value of Object.values(BF.flightPose(a,false)))expect(Number.isFinite(value)).toBe(true);
 });

 it('keeps expressive wing strokes visual, with quieter glides and frozen paused poses',()=>{
   const s=airborne({bank:.2}),snapshot=JSON.stringify(s),flapping=[],gliding=[];
   for(let n=0;n<120;n++){
     const frame={...s,clock:n/60,wingPhase:n*.28};
     flapping.push(BF.flightPose(frame,false).rightWing);
     gliding.push(BF.flightPose({...frame,gliding:true},false).rightWing);
   }
   expect(Math.max(...flapping)-Math.min(...flapping)).toBeGreaterThan(1);
   expect(Math.max(...gliding)-Math.min(...gliding)).toBeLessThan(.1);
   expect(JSON.stringify(s)).toBe(snapshot);
   const paused={...s,paused:true,clock:7,wingPhase:1.9},pose=BF.flightPose(paused,false);
   BF.advanceFrame(paused,.25,{forward:true});expect(BF.flightPose(paused,false)).toEqual(pose);
 });

 it('keeps wandering visitors above nectar, facing and banking into their actual smooth paths',()=>{
   const patch={x:-42,z:-28},epsilon=.001;
   for(let index=0;index<4;index++)for(let t=.1;t<60;t+=.75){
     const p=BF.visitorFlightPose(patch,index,t,false),before=BF.visitorFlightPose(patch,index,t-epsilon,false),after=BF.visitorFlightPose(patch,index,t+epsilon,false);
     for(const value of Object.values(p))expect(Number.isFinite(value)).toBe(true);
     expect(Math.hypot(p.x-patch.x,p.z-patch.z)).toBeLessThan(16);
     expect(p.y).toBeGreaterThan(5);expect(p.y).toBeLessThan(9);
     const dx=after.x-before.x,dz=after.z-before.z,speed=Math.hypot(dx,dz);
     expect((-Math.sin(p.yaw)*dx-Math.cos(p.yaw)*dz)/speed).toBeGreaterThan(.99999);
     const turn=Math.atan2(Math.sin(after.yaw-before.yaw),Math.cos(after.yaw-before.yaw));
     if(Math.abs(turn)>.000001)expect(p.bank*turn).toBeGreaterThan(0);
     expect(Math.abs(p.bank)).toBeLessThanOrEqual(.4);
     expect(Math.hypot(after.x-p.x,after.y-p.y,after.z-p.z)).toBeLessThan(.01);
     expect(Math.abs(after.rightWing-p.rightWing)).toBeLessThan(.04);
   }
 });

 it('repeats visitor poses at the same simulation time and completely freezes reduced motion',()=>{
   const patch={x:36,z:27},snapshot=JSON.stringify(patch);
   for(let index=0;index<4;index++){
     const pose=BF.visitorFlightPose(patch,index,9.3,false);
     BF.visitorFlightPose(patch,index,90,false);
     expect(BF.visitorFlightPose(patch,index,9.3,false)).toEqual(pose);
     expect(BF.visitorFlightPose(patch,index,9.3,true)).toEqual(BF.visitorFlightPose(patch,index,90,true));
     expect(BF.visitorFlightPose(patch,index,9.3,true)).toMatchObject({bank:0,pitch:0,hindLag:0});
   }
   expect(JSON.stringify(patch)).toBe(snapshot);
 });

 it('keeps the camera deterministic and uses a steady follow view for reduced-motion wing flight',()=>{
   const s=airborne({x:4,y:8,z:-10,yaw:Math.PI/2,vx:-10,vz:0}),snapshot=JSON.stringify(s);
   const follow=BF.cameraPose(s,'follow',null,false),wing=BF.cameraPose(s,'wing',null,false);
   expect(wing.position).not.toEqual(follow.position);
   expect(BF.cameraPose(s,'wing',null,true)).toEqual(BF.cameraPose(s,'follow',null,true));
   for(const view of ['follow','meadow','wing']){
     const camera=BF.cameraPose(s,view,null,false);
     expect(camera.position).toHaveLength(3);expect(camera.target).toHaveLength(3);
     for(const value of [...camera.position,...camera.target,camera.fov])expect(Number.isFinite(value)).toBe(true);
     expect(camera.fov).toBeGreaterThan(0);expect(camera.fov).toBeLessThan(120);
   }
   expect(JSON.stringify(s)).toBe(snapshot);
 });

 it('frames direct flight from behind the heading and keeps reduced-motion framing steady',()=>{
   const original=airborne({x:4,y:8,z:-10}),steady=BF.cameraPose(original,'follow',null,true);
   let distance;
   for(const yaw of [-Math.PI,-Math.PI/2,0,Math.PI/3]){
     const s={...original,yaw},snapshot=JSON.stringify(s),camera=BF.cameraPose(s,'follow',null,false);
     const x=camera.position[0]-s.x,z=camera.position[2]-s.z,range=Math.hypot(x,z);
     expect((x*Math.sin(yaw)+z*Math.cos(yaw))/range).toBeGreaterThan(.95);
     if(distance!==undefined)expect(range).toBeCloseTo(distance,9);distance=range;
     const targetX=camera.target[0]-s.x,targetZ=camera.target[2]-s.z;
     expect(targetX*-Math.sin(yaw)+targetZ*-Math.cos(yaw)).toBeGreaterThan(0);
     expect(targetX*Math.cos(yaw)-targetZ*Math.sin(yaw)).toBeCloseTo(0,9);
     expect(BF.cameraPose(s,'follow',null,true)).toEqual(steady);
     expect(BF.cameraPose(s,'wing',null,true)).toEqual(steady);
     expect(JSON.stringify(s)).toBe(snapshot);
   }
   const mapA=BF.cameraPose({...original,controlMode:'map',yaw:0},'follow',null,false);
   const mapB=BF.cameraPose({...original,controlMode:'map',yaw:Math.PI/2},'follow',null,false);
   expect(mapA).toEqual(mapB);
 });

 it('keeps the field-lens target exact and separate from flight framing',()=>{
   const s=BF.freshState();Object.assign(s,{x:-42,z:-28});BF.land(s);
   const detail=BF.fieldDetail(s,'leaves'),snapshot=JSON.stringify(s);
   const camera=BF.cameraPose(s,'wing',detail,false);
   expect(camera.target).toEqual([detail.point.x,detail.point.y,detail.point.z]);
   expect(JSON.stringify(s)).toBe(snapshot);
 });
});
