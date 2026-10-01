import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const host={};vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js','utf8'),host);const K=host.WaterWorldsKernel;
const finish=s=>K.advance(K.begin(s,false),240);
describe('Water Worlds recorded-time inquiry',()=>{
 it('reconstructs intermediate water states from the same fixed solver steps',()=>{
  const start=K.begin(K.initial(),false),mid=K.advance(start,23),end=K.advance(mid,240);
  expect(K.atTime(end.run,23)).toEqual(mid.world);
  expect(K.atTime(end.run,0)).toEqual(start.world);
  expect(K.atTime(end.run,100)).toEqual(end.world);
  expect(K.atTime(end.run,-10)).toEqual(start.world);
  expect(K.atTime(end.run,999)).toEqual(end.world);
 });
 it('reconstructs later storms using their own nonzero start time and initial stores',()=>{
  const first=finish(K.initial()),second=K.begin(first,false),mid=K.advance(second,13),end=K.advance(mid,240);
  expect(mid.world.minutes).toBe(113);expect(K.atTime(end.run,13)).toEqual(mid.world);
  expect(K.atTime(end.run,100)).toEqual(end.world);
 });
 it('keeps results, evidence, and baseline immutable when inspecting a recorded run',()=>{
  let s=K.record(finish(K.initial()));s=K.edit(s,[0,1],'paved');s=K.advance(K.begin(s,true),240);
  const saved=JSON.stringify(s),evidence=K.evidence(s);
  const past=K.atTime(s.run,40);past.cells[0].soil=0;
  expect(JSON.stringify(s)).toBe(saved);expect(K.evidence(s)).toEqual(evidence);
 });
 it('checks actual comparison conditions and counts changed cover without counting stream beds',()=>{
  const baseline=K.record(finish(K.initial())),edited=K.edit(baseline,[0,1,5],'paved');
  expect(K.comparison(edited)).toEqual({fair:false,changedCells:2});
  const paired=K.advance(K.begin(edited,true),240);expect(K.comparison(paired).fair).toBe(true);
  const wrongWater=JSON.parse(JSON.stringify(paired));wrongWater.baseline.run.start.cells[0].soil+=1;expect(K.comparison(wrongWater).fair).toBe(false);
  const wrongRain=JSON.parse(JSON.stringify(paired));wrongRain.baseline.run.forcing.rain=10;expect(K.comparison(wrongRain).fair).toBe(false);
  expect(K.evidence(wrongWater).comparison).toMatch(/Exploratory/);
  expect(K.comparison(finish(paired)).fair).toBe(false);
 });
 it('preserves the chosen question and learning level in saved sessions and exported evidence',()=>{
  const s={...finish(K.initial()),question:'memory',level:'notice'},restored=K.restore(s);
  expect(restored.question).toBe('memory');expect(K.evidence(restored).learningLevel).toBe('notice');
  expect(K.evidence(restored).question).toBe('memory');expect(K.restore({...s,question:'unknown'}).question).toBe('free');
 });
 it('exports readable, ungraded evidence with units, observation duration, and learner writing',()=>{
  const s={...K.record(finish(K.initial())),prediction:'Water will stay in the soil.',reflection:'I saw water in the soil after the rain stopped.'};
  const text=K.report(s);expect(text).toContain(s.prediction);expect(text).toContain(s.reflection);
  expect(text).toContain('Current run — completed');expect(text).toContain('Pinned baseline — completed');
  expect(text).toContain('Observation: 100.0 min');expect(text).toContain('m³/s');expect(text).toContain('Minute samples');
  expect(text).toContain('Not a flood or aquifer forecast');expect(text.split('\n').length).toBeGreaterThan(100);
  expect(K.report(K.advance(K.begin(K.initial(),false),10))).toContain('Current run — in progress');
 });
});
