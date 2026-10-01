import {describe,it,expect} from 'vitest';
import {internals} from './helpers/dino_lab_harness.js';
const {dinoMotionStep}=internals();
describe('Dino Lab active motion clock',()=>{
 for(const fps of [15,30,60,120])it('advances one second consistently at '+fps+' fps',()=>{
  const clock={last:null,elapsed:0};let spin=0;dinoMotionStep(clock,10000,true);
  for(let f=1;f<=fps;f++)spin+=dinoMotionStep(clock,10000+f*1000/fps,true)*.21;
  expect(clock.elapsed).toBeCloseTo(1,10);expect(spin).toBeCloseTo(.21,10);
 });
 it('freezes time for arbitrarily long pauses and resumes without catching up',()=>{
  const c={last:null,elapsed:0};dinoMotionStep(c,1000,true);dinoMotionStep(c,1050,true);
  for(const t of [1100,5000,1000000])expect(dinoMotionStep(c,t,false)).toBe(0);
  expect(c.elapsed).toBe(.05);expect(dinoMotionStep(c,1000050,true)).toBe(0);
  expect(dinoMotionStep(c,1000100,true)).toBe(.05);expect(c.elapsed).toBe(.1);
 });
 it('caps a stalled visible frame to 100 milliseconds',()=>{
  const c={last:1000,elapsed:.5};expect(dinoMotionStep(c,30000,true)).toBe(.1);expect(c.elapsed).toBe(.6);
 });
 it('restarts a visibility-suspended clock without moving the pose',()=>{
  const c={last:1000,elapsed:2};c.last=null;expect(dinoMotionStep(c,30000,true)).toBe(0);expect(c.elapsed).toBe(2);
 });
 it('ignores reversed or invalid timestamps and recovers cleanly',()=>{
  const c={last:1000,elapsed:2};expect(dinoMotionStep(c,900,true)).toBe(0);
  expect(dinoMotionStep(c,NaN,true)).toBe(0);expect(c.last).toBeNull();expect(c.elapsed).toBe(2);
  expect(dinoMotionStep(c,1100,true)).toBe(0);expect(dinoMotionStep(c,1150,true)).toBe(.05);
 });
});
