import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const host={};vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js','utf8'),host);const K=host.WaterWorldsKernel;
const finish=s=>K.advance(K.begin(s,false),240);
describe('Water Worlds time-varying rain',()=>{
 it('distributes identical total rain into steady, early, and late patterns',()=>{
  for(const pattern of ['steady','early','late']){
   const f={rain:100,duration:11.1,pattern};let depth=0;
   for(let t=0;t<12;t+=.25)depth+=K.rainDuring(f,t,.25)*.25/60;
   expect(depth).toBeCloseTo(18.5,10);expect(K.rainAt(f,11.1)).toBe(0);
  }
  expect(K.rainAt({rain:60,duration:40,pattern:'early'},0)).toBe(90);
  expect(K.rainAt({rain:60,duration:40,pattern:'early'},20)).toBe(30);
  expect(K.rainAt({rain:60,duration:40,pattern:'late'},0)).toBe(30);
  expect(K.rainAt({rain:60,duration:40,pattern:'late'},20)).toBe(90);
 });
 it('integrates midpoint and storm-end boundaries without losing rainfall',()=>{
  const f={rain:60,duration:10.2,pattern:'early'};
  expect(K.rainDuring(f,5,.2)).toBeCloseTo(60,10);
  expect(K.rainDuring(f,10.1,.2)).toBeCloseTo(15,10);
  expect(K.rainDuring(f,0,0)).toBe(0);
 });
 it('conserves mass at the full 150 mm/h peak and makes timing affect runoff',()=>{
  const runs=['steady','early','late'].map(pattern=>{const s=K.initial();s.settings={...s.settings,rain:100,duration:40,pattern};return finish(s);});
  for(const s of runs){expect(s.world.rainM3).toBeCloseTo(2560,7);expect(Math.abs(K.measure(s.world).errorM3)).toBeLessThan(1e-7);expect(s.world.cells.every(c=>c.surface>=0&&c.soil>=0&&c.soil<=120)).toBe(true);}
  expect(Math.abs(runs[1].world.peak-runs[2].world.peak)).toBeGreaterThan(.0001);
 });
 it('reconstructs and replays the full pattern even if the next storm controls change',()=>{
  const s=K.initial();s.settings.pattern='late';const first=K.record(finish(s));first.settings.pattern='early';
  const replay=K.advance(K.begin(first,true),240);expect(replay.run.forcing.pattern).toBe('late');expect(replay.world).toEqual(first.world);
  expect(K.atTime(first.run,100)).toEqual(first.world);
  expect(K.comparison(replay).fair).toBe(true);
  replay.run.forcing.pattern='early';expect(K.comparison(replay).fair).toBe(false);
 });
 it('isolates the timing experiment from current land, weather, and water changes',()=>{
  const base=K.record(finish(K.initial())),edited=K.edit(base,[0,1,2],'paved');edited.settings={rain:5,duration:10,pattern:'late',wetness:100};
  const s=K.begin(edited,'timing');expect(s.run.start.cells).toEqual(base.baseline.run.start.cells);
  expect(s.run.forcing).toEqual({...base.baseline.run.forcing,pattern:'late'});expect(K.timingComparison(s)).toBe(true);expect(K.comparison(s).fair).toBe(false);
  const complete=K.advance(s,240);expect(K.evidence(complete).comparison).toMatch(/Timing test/);expect(K.spatialDifference(complete)).toBe(null);
  expect(K.report(complete)).toContain('Pattern: Heavier second half');
  complete.run.start.cells[0].cover='paved';expect(K.timingComparison(complete)).toBe(false);
 });
 it('restores old constant-rain evidence without changing its results',()=>{
  const s=K.record(finish(K.initial()));delete s.settings.pattern;delete s.run.forcing.pattern;delete s.baseline.run.forcing.pattern;
  const restored=K.restore(s);expect(restored.settings.pattern).toBe('steady');expect(K.atTime(restored.run,100)).toEqual(s.world);
  expect(K.advance(K.begin(restored,true),240).world).toEqual(s.world);
  const bad=JSON.parse(JSON.stringify(restored));bad.run.forcing.pattern='unknown';expect(K.restore(bad).run).toBe(null);
 });
});
