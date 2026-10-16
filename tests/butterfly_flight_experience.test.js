import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function airborne(extra={}){return Object.assign(BF.freshState(),{paused:false},extra);}
function fly(s,seconds,keys={},dt=1/60){for(let time=0;time<seconds-1e-9;time+=dt)BF.advanceFrame(s,Math.min(dt,seconds-time),keys);return s;}

describe('Butterfly flight handling',()=>{
 it('accelerates into world-axis movement without a diagonal speed advantage',()=>{
   const forward=airborne(),diagonal=airborne();
   BF.step(forward,.05,{forward:true});BF.step(diagonal,.05,{forward:true,right:true});
   expect(forward.vz).toBeLessThan(0);expect(forward.vx).toBe(0);
   const firstSpeed=Math.hypot(forward.vx,forward.vz);
   expect(firstSpeed).toBeGreaterThan(0);
   expect(Math.hypot(diagonal.vx,diagonal.vz)).toBeCloseTo(firstSpeed,9);
   expect(Math.hypot(diagonal.x,diagonal.z-52)).toBeCloseTo(Math.abs(forward.z-52),9);
   fly(forward,1,{forward:true});expect(Math.hypot(forward.vx,forward.vz)).toBeGreaterThan(firstSpeed);
   const sideways=airborne({yaw:Math.PI/2});BF.step(sideways,.05,{right:true});
   expect(sideways.x).toBeGreaterThan(0);expect(sideways.z).toBe(52);
 });

 it('keeps the same journey and energy use across slow and fast frame rates',()=>{
   const smooth=airborne(),slow=airborne();
   fly(smooth,2,{forward:true},1/60);fly(slow,2,{forward:true},.1);
   expect(smooth.clock).toBeCloseTo(2,8);expect(slow.clock).toBeCloseTo(2,8);
   expect(smooth.energy).toBeCloseTo(slow.energy,8);
   expect(Math.abs(smooth.z-slow.z)).toBeLessThan(.02);
   expect(Math.abs(smooth.vz-slow.vz)).toBeLessThan(.02);
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
   s.gliding=true;BF.stopFlight(s);
   expect(s).toMatchObject({vx:0,vy:0,vz:0,bank:0,pitch:0,gliding:false});
   expect({x:s.x,y:s.y,z:s.z,clock:s.clock,energy:s.energy,saved:BF.save(s)}).toEqual(before);
   for(const paused of [true,false]){
     const frozen={...s,paused,landed:paused?null:'milkweed'},snapshot=JSON.stringify({...s,paused,landed:paused?null:'milkweed'});
     BF.advanceFrame(frozen,.25,{right:true,rise:true});expect(JSON.stringify(frozen)).toBe(snapshot);
   }
 });

 it('glides along the heading while descending, with manual control still tied to world axes',()=>{
   const s=airborne({gliding:true,yaw:Math.PI/2,y:10});fly(s,1);
   expect(s.x).toBeLessThan(0);expect(Math.abs(s.z-52)).toBeLessThan(.001);expect(s.y).toBeLessThan(10);
   const manual=airborne({gliding:true,yaw:Math.PI/2,y:10});fly(manual,.5,{right:true});
   expect(manual.x).toBeGreaterThan(0);
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
   for(const key of ['vx','vy','vz','bank','pitch','wingPhase','gliding'])expect(saved).not.toHaveProperty(key);
   const restored=BF.freshState({...saved,vx:Infinity,vy:50,vz:-99,bank:4,pitch:2,gliding:true});
   expect(restored).toMatchObject({paused:true,vx:0,vy:0,vz:0,bank:0,pitch:0,gliding:false});
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

 it('keeps the field-lens target exact and separate from flight framing',()=>{
   const s=BF.freshState();Object.assign(s,{x:-42,z:-28});BF.land(s);
   const detail=BF.fieldDetail(s,'leaves'),snapshot=JSON.stringify(s);
   const camera=BF.cameraPose(s,'wing',detail,false);
   expect(camera.target).toEqual([detail.point.x,detail.point.y,detail.point.z]);
   expect(JSON.stringify(s)).toBe(snapshot);
 });
});
