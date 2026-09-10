import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const host={};vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js','utf8'),host);const K=host.WaterWorldsKernel;
const finish=s=>K.advance(K.begin(s,false),240);
describe('Water Worlds flow evidence and reversible design',()=>{
 it('diagnoses exactly the solver transfers without mutating stored water',()=>{
  const w=K.advance(K.begin(K.initial(),false),20).world,before=JSON.stringify(w),trace={};
  const actual=K.step(w,45,.25,{trace}),plain=K.step(w,45,.25),d=K.diagnose(w,45);
  expect(actual).toEqual(plain);expect(d).toEqual(trace);expect(JSON.stringify(w)).toBe(before);
  expect(d.routes.length).toBeGreaterThan(0);
  const out=d.routes.filter(r=>r.to<0).reduce((n,r)=>n+r.flowM3s,0);
  expect(out).toBeCloseTo(actual.discharge,12);
  w.cells.forEach((c,i)=>{
   const t=d.cells[i],incoming=d.routes.filter(r=>r.to===i).reduce((n,r)=>n+r.depthMm,0),outgoing=d.routes.filter(r=>r.from===i).reduce((n,r)=>n+r.depthMm,0);
   const subsurface=c.cover==='stream'?d.cells.reduce((n,t)=>n+t.releaseMm,0)/16:0;
   const surfaceEvap=Math.min(c.surface+45*.25/60-t.infiltrationMm,.1*.25/60);
   expect(actual.cells[i].surface).toBeCloseTo(c.surface+45*.25/60-t.infiltrationMm-surfaceEvap+subsurface+incoming-outgoing,10);
   expect(actual.cells[i].ground).toBeCloseTo(c.ground+t.drainageMm-t.releaseMm,10);
  });
 });
 it('shows no transfers or infiltration without available water',()=>{
  const d=K.diagnose(K.create(0),0);expect(d.routes).toHaveLength(0);expect(d.cells.every(c=>c.infiltrationMm===0&&c.releaseMm===0)).toBe(true);
 });
 it('undoes cover edits and restores displaced evidence with the exact water stores',()=>{
  const original=K.record(finish(K.initial())),edit=K.edit(original,[0,1,5],'paved');
  expect(edit.run).toBe(null);expect(edit.world.cells[5].cover).toBe('stream');
  const undo=K.undo(edit);expect(undo.world).toEqual(original.world);expect(undo.run).toEqual(original.run);expect(undo.baseline).toEqual(original.baseline);
  expect(undo.editHistory).toHaveLength(0);
 });
 it('preserves completed results for no-op edits and limits undo history',()=>{
  const s=finish(K.initial());expect(K.edit(s,[0],'forest')).toBe(s);expect(K.edit(s,[5],'paved')).toBe(s);
  let edited=s;for(let i=0;i<20;i++)edited=K.edit(edited,[0],i%2?'forest':'paved');
  expect(edited.editHistory).toHaveLength(8);
  const running=K.begin(edited,false);expect(running.editHistory).toHaveLength(0);expect(K.undo(running)).toBe(running);
  expect(K.restore(edited).editHistory).toHaveLength(0);
 });
 it('rejects corrupt saved time series instead of crashing or resuming impossible runs',()=>{
  const s=K.advance(K.begin(K.initial(),false),15);
  for(const samples of [[],[null],[{t:1,q:0,surface:0,soil:0}],[s.run.samples[0],s.run.samples[0]]]){
   const bad=JSON.parse(JSON.stringify(s));bad.run.samples=samples;expect(K.restore(bad).run).toBe(null);
  }
  const future=JSON.parse(JSON.stringify(s));future.world.minutes=0;expect(K.restore(future).run).toBe(null);
  const fakeComplete=JSON.parse(JSON.stringify(s));fakeComplete.run.complete=true;expect(K.restore(fakeComplete).run).toBe(null);
  const pendingBaseline={...s,baseline:{world:s.world,run:s.run}};expect(K.restore(pendingBaseline).baseline).toBe(null);
  expect(K.restore(s).run).toEqual(s.run);
 });
});
