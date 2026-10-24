import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
const neutral={turn:0,thrust:0,brake:0};
function airborne(extra={}){return Object.assign(BF.freshState(),{paused:false},extra);}
function fly(state,seconds,keys={},dt=1/60){for(let time=0;time<seconds-1e-9;time+=dt)BF.advanceFrame(state,Math.min(dt,seconds-time),keys);return state;}
function speed(state){return Math.hypot(state.vx,state.vz);}
function turn(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}

describe('Butterfly analog steering pad',()=>{
 it('keeps a circular neutral zone and smoothly follows the drag direction',()=>{
  for(const point of [[0,0],[3,4],[-5,-4],[6,0],[0,-6]])expect(BF.steeringPad(...point,60)).toEqual(neutral);
  const slight=BF.steeringPad(0,-12,60),half=BF.steeringPad(0,-30,60),full=BF.steeringPad(0,-60,60);
  expect(slight.turn).toBe(0);expect(slight.brake).toBe(0);
  expect(slight.thrust).toBeGreaterThan(0);expect(half.thrust).toBeGreaterThan(slight.thrust);expect(full.thrust).toBe(1);
  expect(BF.steeringPad(60,0,60)).toEqual({turn:1,thrust:0,brake:0});
  expect(BF.steeringPad(-60,0,60)).toEqual({turn:-1,thrust:0,brake:0});
  expect(BF.steeringPad(0,60,60)).toEqual({turn:0,thrust:0,brake:1});
 });

 it('bounds distant and diagonal drags without a diagonal power advantage',()=>{
  const diagonal=BF.steeringPad(100,-100,60);
  expect(diagonal.turn).toBeGreaterThan(0);expect(diagonal.thrust).toBeGreaterThan(0);expect(diagonal.brake).toBe(0);
  expect(Math.hypot(diagonal.turn,diagonal.thrust)).toBeCloseTo(1,12);
  expect(BF.steeringPad(1000,-1000,60)).toEqual(diagonal);
  for(const [dx,dy,radius] of [[1e308,-1e308,1e-308],[-1e308,1e308,1e-300],[1e-300,-1e-300,1e-308]]){
   const input=BF.steeringPad(dx,dy,radius);
   expect(Object.values(input).every(Number.isFinite)).toBe(true);
   expect(Math.hypot(input.turn,input.thrust,input.brake)).toBeLessThanOrEqual(1.000000000001);
  }
 });

 it('treats invalid pad inputs as neutral instead of producing drift',()=>{
  for(const value of [undefined,null,NaN,Infinity,-Infinity,'60',{},[]]){
   expect(BF.steeringPad(value,20,60)).toEqual(neutral);
   expect(BF.steeringPad(20,value,60)).toEqual(neutral);
   expect(BF.steeringPad(20,20,value)).toEqual(neutral);
  }
  for(const radius of [0,-1,-60])expect(BF.steeringPad(20,20,radius)).toEqual(neutral);
 });
});

describe('Progressive butterfly flight',()=>{
 it('lets a lighter hold fly more slowly and use less energy along the same heading',()=>{
  const mild=fly(airborne({yaw:-.7}),1.2,{thrust:.35}),full=fly(airborne({yaw:-.7}),1.2,{thrust:1});
  const mildDistance=Math.hypot(mild.x,mild.z-52),fullDistance=Math.hypot(full.x,full.z-52);
  expect(mildDistance).toBeGreaterThan(1);expect(fullDistance).toBeGreaterThan(mildDistance*2);
  expect(speed(mild)).toBeLessThan(speed(full));expect(mild.energy).toBeGreaterThan(full.energy);
  expect(mild.x/mildDistance).toBeCloseTo(-Math.sin(-.7),9);expect((mild.z-52)/mildDistance).toBeCloseTo(-Math.cos(-.7),9);
 });

 it('gives proportional heading control in a hover without spending flight energy',()=>{
  const mild=fly(airborne(),.5,{turn:.25}),right=fly(airborne(),.5,{turn:.8}),left=fly(airborne(),.5,{turn:-.8});
  expect(right.yaw).toBeLessThan(mild.yaw);expect(mild.yaw).toBeLessThan(0);expect(left.yaw).toBeCloseTo(-right.yaw,10);
  expect(right.bank).toBeLessThan(0);expect(left.bank).toBeGreaterThan(0);
  for(const state of [mild,right,left]){expect(state.x).toBe(0);expect(state.z).toBe(52);expect(state.energy).toBe(100);}
 });

 it('brakes progressively without generating reverse thrust',()=>{
  const moving=fly(airborne(),1,{thrust:1}),coast={...moving},half={...moving},full={...moving};
  fly(coast,.3);fly(half,.3,{brake:.5});fly(full,.3,{brake:1});
  expect(speed(full)).toBeLessThan(speed(half));expect(speed(half)).toBeLessThan(speed(coast));
  expect(full.z).toBeGreaterThan(half.z);expect(half.z).toBeGreaterThan(coast.z);
  const stopped=fly(airborne(),1,{thrust:1,brake:1});expect(stopped.x).toBe(0);expect(stopped.z).toBe(52);expect(stopped.energy).toBe(100);
  fly(full,1,{brake:1});expect(full.vz).toBe(0);expect(full.z).toBeLessThanOrEqual(moving.z);
 });

 it('lets partial braking slow an actively steered glide and partial lift change altitude',()=>{
  const free=fly(airborne({gliding:true,y:10}),1,{turn:.2}),braked=fly(airborne({gliding:true,y:10}),1,{turn:.2,brake:.6});
  expect(speed(braked)).toBeLessThan(speed(free));expect(braked.yaw).toBeCloseTo(free.yaw,10);
  expect(braked.gliding).toBe(true);expect(braked.y).toBeLessThan(10);
  const rise=fly(airborne({y:10}),.5,{lift:.35}),lower=fly(airborne({y:10}),.5,{lift:-.35});
  expect(rise.y).toBeGreaterThan(10);expect(lower.y).toBeLessThan(10);
 });

 it('lets keyboard commands take priority on their axes while retaining analog control on other axes',()=>{
  const expected=fly(airborne(),.4,{right:true,forward:true,rise:true}),mixed=fly(airborne(),.4,{right:true,forward:true,rise:true,turn:-1,thrust:.2,lift:-1});
  expect(mixed).toEqual(expected);
  const opposed=fly(airborne(),.4,{left:true,right:true,turn:1});expect(opposed.yaw).toBe(0);
  const digitalBrake=fly(airborne(),.5,{forward:true,back:true,thrust:1,brake:.2});expect(speed(digitalBrake)).toBe(0);
 });

 it('keeps analog fields out of map-direction movement',()=>{
  const expected=fly(airborne({controlMode:'map'}),.7,{forward:true}),mixed=fly(airborne({controlMode:'map'}),.7,{forward:true,turn:1,thrust:1,brake:1,lift:1});
  expect(mixed).toEqual(expected);
 });

 it.each(['turn','thrust','brake','lift'])('allows active analog %s to take over guidance without changing saved evidence',axis=>{
  const state=airborne({target:'milkweed',observations:['milkweed']}),saved=BF.save(state);
  BF.step(state,.05,{[axis]:.4});expect(state.target).toBeNull();expect(state.paused).toBe(false);expect(BF.save(state)).toEqual(saved);
 });

 it('ignores invalid analog fields and leaves neutral guidance uninterrupted',()=>{
  const expected=airborne({target:'milkweed'}),neutralState=airborne({target:'milkweed'});
  BF.step(expected,.05,{});BF.step(neutralState,.05,{turn:NaN,thrust:Infinity,brake:'1',lift:{}});expect(neutralState).toEqual(expected);expect(neutralState.target).toBe('milkweed');
  for(const value of [NaN,Infinity,-Infinity,'1',{},null]){
   const state=airborne();BF.step(state,.05,{turn:value,thrust:value,brake:value,lift:value});
   expect([state.x,state.y,state.z,state.yaw,state.vx,state.vy,state.vz,state.turnVelocity].every(Number.isFinite)).toBe(true);
   expect(state.x).toBe(0);expect(state.z).toBe(52);expect(state.yaw).toBe(0);
  }
 });

 it('keeps a mixed analog route consistent across slow and fast frames',()=>{
  const smooth=airborne({y:10}),slow=airborne({y:10});
  for(const [seconds,input] of [[1.3,{turn:.38,thrust:.67,lift:.3}],[.8,{turn:-.2,thrust:.4,brake:.22}],[.3,{brake:1}]]){
   fly(smooth,seconds,input,1/120);fly(slow,seconds,input,.1);
  }
  expect(turn(smooth.yaw,slow.yaw)).toBeCloseTo(0,8);expect(smooth.energy).toBeCloseTo(slow.energy,8);
  expect(Math.hypot(smooth.x-slow.x,smooth.z-slow.z)).toBeLessThan(.1);expect(Math.hypot(smooth.vx-slow.vx,smooth.vz-slow.vz)).toBeLessThan(.05);
  expect(smooth.y).toBeCloseTo(slow.y,8);
 });

 it('slows to a hover after release and cannot move a paused or landed butterfly',()=>{
  const state=fly(airborne(),.6,{turn:.6,thrust:.7}),released=fly(state,1.5),before={x:released.x,z:released.z,yaw:released.yaw};
  expect(speed(released)).toBe(0);fly(released,.5);
  expect(Math.hypot(released.x-before.x,released.z-before.z)).toBeLessThan(.001);expect(Math.abs(turn(before.yaw,released.yaw))).toBeLessThan(.001);
  for(const blocked of [{paused:true},{landed:'milkweed'}]){
   const frozen=Object.assign(airborne(),blocked),snapshot=JSON.stringify(frozen);BF.advanceFrame(frozen,.25,{turn:1,thrust:1,brake:.2,lift:1});expect(JSON.stringify(frozen)).toBe(snapshot);
  }
 });
});
