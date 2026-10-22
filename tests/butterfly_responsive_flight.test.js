import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function airborne(extra={}){return Object.assign(BF.freshState(),{paused:false,wingGlide:0,wingBrake:0},extra);}
function fly(s,seconds,keys={},dt=1/60){for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)BF.advanceFrame(s,Math.min(dt,seconds-elapsed),keys);return s;}
function excursion(s,key){const values=Array.from({length:120},(_,index)=>BF.flightPose({...s,wingPhase:index*Math.PI*2/120,clock:0},false)[key]);return Math.max(...values)-Math.min(...values);}
function poseDelta(a,b){return Math.max(...Object.keys(a).map(key=>Math.abs(a[key]-b[key])));}

describe('Responsive butterfly wing presentation',()=>{
 it('uses broader strokes for powered travel and climbing, with distinct turn and braking articulation',()=>{
  const hover=airborne(),powered=airborne({vz:-16}),climbing=airborne({vz:-16,vy:6}),turning=airborne({vz:-16,turnVelocity:1.4,bank:.3}),braking=airborne({vz:-16,wingBrake:1});
  expect(excursion(powered,'rightWing')).toBeGreaterThan(excursion(hover,'rightWing')*1.08);
  expect(excursion(climbing,'rightWing')).toBeGreaterThan(excursion(powered,'rightWing'));
  expect(excursion(turning,'hindLag')).toBeGreaterThan(excursion(powered,'hindLag')+.004);
  const ordinary=BF.flightPose({...powered,wingPhase:1.2},false),brake=BF.flightPose({...braking,wingPhase:1.2},false);
  expect(brake.pitch).toBeGreaterThan(ordinary.pitch);expect(brake.rightWing-brake.leftWing).toBeGreaterThan(ordinary.rightWing-ordinary.leftWing);
  expect(excursion(powered,'bob')).toBeLessThan(excursion(hover,'bob'));
 });

 it('eases both sides of a glide change and settles into quiet open wings',()=>{
  const s=airborne({vz:-12,y:10}),before=BF.flightPose(s,false);
  s.gliding=true;BF.step(s,.001,{});const first=BF.flightPose(s,false);
  expect(poseDelta(before,first)).toBeLessThan(.05);
  fly(s,1.2);expect(BF.flightResponse(s).glide).toBeGreaterThan(.99);
  expect(excursion(s,'rightWing')).toBeLessThan(.1);
  const open=BF.flightPose(s,false);s.gliding=false;BF.step(s,.001,{});
  expect(poseDelta(open,BF.flightPose(s,false))).toBeLessThan(.05);
  fly(s,1.2,{forward:true});expect(BF.flightResponse(s).glide).toBeLessThan(.01);
  expect(excursion(s,'rightWing')).toBeGreaterThan(1);
 });

 it('reflects partial braking smoothly and preserves the simulation across frame rates',()=>{
  const partial=airborne({vz:-12}),full={...partial};
  fly(partial,.3,{brake:.35});fly(full,.3,{back:true});
  expect(BF.flightResponse(partial).brake).toBeGreaterThan(.1);expect(BF.flightResponse(partial).brake).toBeLessThan(BF.flightResponse(full).brake);
  const smooth=airborne(),slow=airborne();fly(smooth,1,{forward:true,rise:true},1/60);fly(slow,1,{forward:true,rise:true},.1);
  smooth.gliding=true;slow.gliding=true;fly(smooth,.7,{},1/60);fly(slow,.7,{},.1);
  expect(BF.flightResponse(smooth).glide).toBeCloseTo(BF.flightResponse(slow).glide,9);
  const phase=Math.atan2(Math.sin(smooth.wingPhase-slow.wingPhase),Math.cos(smooth.wingPhase-slow.wingPhase));
  expect(Math.abs(phase)).toBeLessThan(.18);expect(Math.hypot(smooth.x-slow.x,smooth.y-slow.y,smooth.z-slow.z)).toBeLessThan(.03);
 });

 it('keeps pauses and reduced motion exact and leaves saved investigation data untouched',()=>{
  const s=airborne({observations:['milkweed']}),saved=BF.save(s);fly(s,.6,{forward:true,right:true});s.gliding=true;fly(s,.2);
  const before=JSON.stringify(s),pose=BF.flightPose(s,false);BF.flightPose(s,false);BF.flightResponse(s);
  expect(JSON.stringify(s)).toBe(before);expect(BF.save(s)).toEqual(saved);
  s.paused=true;const paused=JSON.stringify(s),still=BF.flightPose(s,false);BF.advanceFrame(s,.25,{forward:true,back:true});
  expect(JSON.stringify(s)).toBe(paused);expect(BF.flightPose(s,false)).toEqual(still);
  expect(BF.flightPose(s,true)).toEqual(BF.flightPose({...s,clock:s.clock+30,wingPhase:5,wingGlide:0,wingBrake:1},true));
  expect(BF.flightPose(s,true)).toMatchObject({bob:0,bank:0,pitch:0,hindLag:0});expect(pose).not.toEqual(BF.flightPose(s,true));
  BF.stopFlight(s);expect(s.wingGlide).toBe(0);expect(s.wingBrake).toBe(0);expect(BF.save(s)).toEqual(saved);
  for(const key of ['wingGlide','wingBrake'])expect(BF.save(s)).not.toHaveProperty(key);
 });

 it('keeps presentation finite and restrained for missing or hostile transient values',()=>{
  for(const value of [undefined,NaN,Infinity,-Infinity,-100,100]){
   const s=airborne({vx:value,vy:value,vz:value,turnVelocity:value,wingGlide:value,wingBrake:value,wingPhase:value,clock:value,bank:value,pitch:value});
   const response=BF.flightResponse(s),pose=BF.flightPose(s,false);
   expect(Object.values(response).every(Number.isFinite)).toBe(true);expect(Object.values(pose).every(Number.isFinite)).toBe(true);
   expect(response.glide).toBeGreaterThanOrEqual(0);expect(response.glide).toBeLessThanOrEqual(1);expect(response.brake).toBeGreaterThanOrEqual(0);expect(response.brake).toBeLessThanOrEqual(1);
   expect(Math.max(Math.abs(pose.leftWing),Math.abs(pose.rightWing))).toBeLessThan(1.7);
  }
 });
});
