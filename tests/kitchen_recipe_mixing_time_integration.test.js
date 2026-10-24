import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_clock.js'),L=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s);
const start=()=>R.startRescue('fragile',2,'practice');
const finish=s=>R.submit({...act(s,[['taste'],['plate']]),answers:[2,null]});

describe('Completed mixing shares the kitchen clock',()=>{
 it('records exact deadlines crossed by an atomic fold without shortening the operation',()=>{
  const s=act(start(),[['stirSweep','button'],['stirSweep','button']]),timers={pan:C.create(0,15),pot:C.create(2,15)},before=JSON.stringify(timers),next=R.act(s,'stirSweep','button');
  expect(s.time).toBe(12);expect(next.time).toBe(18);expect(next.log.at(-1)).toMatchObject({startedAt:12,durationSeconds:6,time:18});
  expect(C.crossed(timers,s.time,next.time)).toEqual([{vessel:'pot',dueAt:17,finishedAt:18,lateSeconds:1},{vessel:'pan',dueAt:15,finishedAt:18,lateSeconds:3}]);
  expect(C.settle(timers,next.time).pan.status).toBe('elapsed');expect(JSON.stringify(timers)).toBe(before);
 });
 it('keeps later timers waiting and excludes old or invalid intervals',()=>{
  const timers={pan:C.create(0,15),pot:C.create(0,30)};expect(C.crossed(timers,9,15)).toEqual([{vessel:'pan',dueAt:15,finishedAt:15,lateSeconds:0}]);
  expect(C.settle(timers,18).pot.status).toBe('waiting');expect(C.crossed(C.settle(timers,18),18,24)).toEqual([]);
  for(const [a,b] of [[18,18],[18,17],[-1,6],[NaN,6],[0,Infinity]])expect(C.crossed(timers,a,b)).toEqual([]);
 });
 it('includes concurrent losses in the recorded water balance and six seconds in the check interval',()=>{
  const s=act(start(),[['taste'],['pour',30],['stirSweep','button'],['taste']]),ledger=L.betweenChecks(s);
  expect(ledger.elapsedSeconds).toBe(6);expect(ledger.mixing).toEqual({seconds:6,complete:true});expect(ledger.actions.folds).toBe(1);
  expect(ledger.water.absorbedMl).toBeGreaterThan(0);expect(ledger.water.evaporatedMl).toBeGreaterThan(0);expect(ledger.water.balanced).toBe(true);expect(ledger.notes.join(' ')).toContain('During the recorded mixing time');
 });
 it('sums only mixing inside the selected evidence interval rather than adding it to waiting time',()=>{
  const s=act(start(),[['taste'],['stirSweep','button'],['taste'],['advance',15],['stirSweep','button'],['taste']]),checks=L.checks(s),whole=L.betweenChecks(s,{fromIndex:checks[0].index,toIndex:checks[2].index}),latest=L.betweenChecks(s);
  expect(whole.elapsedSeconds).toBe(27);expect(whole.mixing.seconds).toBe(12);expect(latest.elapsedSeconds).toBe(21);expect(latest.mixing.seconds).toBe(6);
 });
 it('keeps incomplete mixing timing unknown instead of reporting a false zero',()=>{
  const s=act(start(),[['taste'],['stirSweep','button'],['taste']]);delete s.log[1].durationSeconds;
  expect(L.betweenChecks(s).mixing).toEqual({seconds:null,complete:false});expect(L.betweenChecks(s).notes.join(' ')).toContain('unknown');
 });
 it('recognizes a complete mix after a fractional clock step and restore',()=>{
  const s=act(start(),[['advance',10.1],['taste'],['stirSweep','button'],['taste']]);
  expect(s.log.at(-2)).toMatchObject({startedAt:10.1,time:16.1,durationSeconds:6});
  expect(L.betweenChecks(s).mixing).toEqual({seconds:6,complete:true});
  expect(L.betweenChecks(R.restore(s)).mixing).toEqual({seconds:6,complete:true});
  s.log.at(-2).durationSeconds=5;
  expect(L.betweenChecks(s).mixing).toEqual({seconds:null,complete:false});
 });
 it('keeps old instantaneous records exact without inserting new timing fields',()=>{
  const raw=start();delete raw.mixingModel;let s=R.restore(raw);s=act(s,[['taste'],['stirSweep','button'],['taste']]);
  const ledger=L.betweenChecks(s);expect(ledger.elapsedSeconds).toBe(0);expect(ledger).not.toHaveProperty('mixing');expect(s.log[1]).not.toHaveProperty('durationSeconds');expect(R.restore(s)).toEqual(s);
 });
 it('retains selected timing on restore and replay without changing the completed cook',()=>{
  const s=finish(act(start(),[['taste'],['pour',30],['stirSweep','button'],['taste'],['advance',60],['advance',60],['taste']])),before=JSON.stringify(s),ledger=L.betweenChecks(s,{fromIndex:0,toIndex:3});
  expect(L.betweenChecks(R.restore(s),{fromIndex:0,toIndex:3})).toEqual(ledger);expect(L.betweenChecks(R.replay(s,s.log.length).state,{fromIndex:0,toIndex:3})).toEqual(ledger);expect(JSON.stringify(s)).toBe(before);
 });
 it('blocks incompatible mixing comparisons and labels exported current evidence',()=>{
  const current=finish(act(start(),[['taste'],['pour',30],['stirSweep','button'],['taste'],['advance',60],['advance',60]])),raw=JSON.parse(JSON.stringify(current));delete raw.mixingModel;const legacy=R.restore(raw);
  expect(M.incompatibility(legacy,current)).toContain('different mixing models');expect(M.compare(legacy,current)).toBeNull();
  expect(M.compare(current,R.restore(current))).toMatchObject({mixingModel:2,a:{mixingModel:2},b:{mixingModel:2}});expect(M.compare(legacy,R.restore(legacy))).not.toHaveProperty('mixingModel');
 });
});
