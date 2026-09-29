import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const host={};vm.runInNewContext(readFileSync('stem_lab/water_worlds_kernel.js','utf8'),host);
const K=host.WaterWorldsKernel,copy=value=>JSON.parse(JSON.stringify(value));
function fixture({selected=44,wetness=85,pattern='late',minutes=[12,45],consecutive=false}={}){
 let s=K.initial();s.world=K.create(wetness);s.settings=K.settings({rain:80,duration:40,wetness,pattern});
 s=K.advance(K.begin(s,false),240);if(consecutive)s=K.advance(K.begin(s,false),240);
 s.selected=selected;for(const minute of minutes)s=K.observe(s,minute,'My saved evidence');return s;
}
function asRun(entry){return {start:entry.provenance.start,forcing:entry.provenance.forcing,samples:[{t:0,q:0,surface:0,soil:0}]};}

describe('Water Worlds accounting between saved moments',()=>{
 it.each(['steady','early','late'])('balances all stores and reproduces recorded endpoints under %s rain',pattern=>{
  for(const selected of [0,44,46,89]){
   const s=fixture({selected,pattern}),[a,b]=s.observations,budget=K.observationBudget(a,b);
   expect(budget.eligible).toBe(true);expect(budget.selected).toBe(selected);
   for(const key of ['surface','soil','ground']){
    const store=budget.stores[key];expect(store.beforeMm).toBe(a.cell[key]);expect(store.afterMm).toBe(b.cell[key]);
    expect(store.beforeMm+store.inputsMm-store.outputsMm).toBeCloseTo(store.afterMm,9);
    expect(store.changeMm).toBeCloseTo(store.inputsMm-store.outputsMm,9);expect(Math.abs(store.errorMm)).toBeLessThan(1e-8);
   }
   expect(Math.abs(budget.balance.errorMm)).toBeLessThan(1e-8);
   expect(Object.values(budget.transfers).every(value=>Number.isFinite(value)&&value>=0)).toBe(true);
  }
 });
 it('sums actual traced solver movements rather than attributing a net change to one process',()=>{
  const s=fixture({selected:89,minutes:[20,35]}),[a,b]=s.observations,budget=K.observationBudget(a,b),expected={rainMm:0,infiltrationMm:0,drainageMm:0,releaseMm:0,surfaceEvaporationMm:0,soilEvapotranspirationMm:0,incomingSurfaceMm:0,outgoingSurfaceMm:0,streamReceiptMm:0};
  let w=K.atTime(asRun(a),20);
  for(let minute=20;minute<35;minute+=.25){
   const rain=K.rainDuring(a.provenance.forcing,minute,.25),trace={};w=K.step(w,rain,.25,{trace});const c=trace.cells[89];
   expected.rainMm+=rain*.25/60;for(const key of ['infiltrationMm','drainageMm','releaseMm','surfaceEvaporationMm','soilEvapotranspirationMm'])expected[key]+=c[key];
   for(const route of trace.routes){if(route.to===89)expected.incomingSurfaceMm+=route.depthMm;if(route.from===89)expected.outgoingSurfaceMm+=route.depthMm;}
   expected.streamReceiptMm+=trace.cells.reduce((sum,c)=>sum+c.releaseMm,0)/16;
  }
  for(const key of Object.keys(expected))expect(budget.transfers[key]).toBeCloseTo(expected[key],10);
  expect(budget.transfers.incomingSurfaceMm).toBeGreaterThan(0);expect(budget.transfers.outgoingSurfaceMm).toBeGreaterThan(0);
  expect(budget.transfers.streamReceiptMm).toBeGreaterThan(0);
 });
 it.each([[12.1,45.4],[19.99,20.01],[39.99,40.01],[.2499,.2501]])('reconstructs fractional moments %s and %s without changing step cadence',(...minutes)=>{
  const s=fixture({minutes}),[a,b]=s.observations,budget=K.observationBudget(a,b);
  for(const key of ['surface','soil','ground']){expect(budget.stores[key].beforeMm).toBe(K.atTime(asRun(a),minutes[0]).cells[a.selected][key]);expect(budget.stores[key].afterMm).toBe(K.atTime(asRun(b),minutes[1]).cells[b.selected][key]);expect(Math.abs(budget.stores[key].errorMm)).toBeLessThan(1e-8);}
 });
 it('orders accounting chronologically while exposing reversed learner selection',()=>{
  const [a,b]=fixture().observations,normal=K.observationBudget(a,b),reversed=K.observationBudget(b,a);
  expect(reversed.reverseSelection).toBe(true);expect(reversed.fromId).toBe(a.id);expect(reversed.toId).toBe(b.id);
  expect(reversed.transfers).toEqual(normal.transfers);expect(reversed.stores).toEqual(normal.stores);
 });
 it('uses elapsed minutes for later storms with a nonzero model start time',()=>{
  const [a,b]=fixture({consecutive:true,minutes:[0,45]}).observations,budget=K.observationBudget(a,b);
  expect(a.provenance.start.minutes).toBe(100);expect(budget.fromMinute).toBe(0);expect(budget.toMinute).toBe(45);
  expect(budget.stores.soil.beforeMm).toBe(a.cell.soil);expect(budget.stores.soil.afterMm).toBe(b.cell.soil);
  expect(Math.abs(budget.balance.errorMm)).toBeLessThan(1e-8);
 });
 it('preserves saved conditions and reconstructs totals independently of cached readings or notes',()=>{
  const [a,b]=fixture().observations,saved=JSON.stringify([a,b]),expected=K.observationBudget(a,b);const edited=copy(a);edited.cell.surface=999;edited.totals.discharge=999;edited.note='Another explanation';
  expect(K.observationBudget(edited,b)).toEqual(expected);expect(JSON.stringify([a,b])).toBe(saved);
  expected.stores.soil.afterMm=-1;expected.transfers.rainMm=-1;expect(K.observationBudget(a,b).transfers.rainMm).toBeGreaterThan(0);
 });
 it('explains why different places, setups, or identical times cannot form an interval account',()=>{
  const [a,b]=fixture().observations,otherCell=copy(b),otherRain=copy(b),otherStart=copy(b),sameTime=copy(b);
  otherCell.selected=45;otherRain.provenance.forcing.rain=70;otherStart.provenance.start.cells[0].soil-=1;sameTime.minute=a.minute;
  expect(K.observationBudget(a,otherCell)).toEqual({eligible:false,reason:'different-cell'});
  expect(K.observationBudget(a,otherRain)).toEqual({eligible:false,reason:'different-setup'});
  expect(K.observationBudget(a,otherStart)).toEqual({eligible:false,reason:'different-setup'});
  expect(K.observationBudget(a,sameTime)).toEqual({eligible:false,reason:'same-minute'});
 });
 it('rejects malformed identities and future times without throwing',()=>{
  const [a,b]=fixture().observations;
  for(const bad of [null,{}, {...b,minute:NaN},{...b,minute:101},{...b,selected:1.5},{...b,selected:-1},{...b,selected:96},{...b,provenance:{...b.provenance,forcing:{...b.provenance.forcing,pattern:'unknown'}}}])expect(K.observationBudget(a,bad)).toEqual({eligible:false,reason:'invalid-observation'});
 });
});
