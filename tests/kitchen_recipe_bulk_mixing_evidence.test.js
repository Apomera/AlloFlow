import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),L=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js'),V=require('../stem_lab/kitchen_studio/recipe_lab_cooking.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const act=(s,steps)=>steps.reduce((n,[a,v])=>R.act(n,a,v),s);
const pair=()=>act(R.startRescue('dry',0),[['pour',100],['taste'],['stirSweep','button'],['taste']]);
const checks=s=>s.log.filter(e=>e.inspection).map(e=>e.inspection);
const P=require('../stem_lab/kitchen_studio/recipe_lab_tomato_press.js');

describe('Recorded pooling evidence and live pan water',()=>{
 it('compares the liquid still awaiting incorporation, separately from doses and total water',()=>{
  const s=pair(),[a,b]=checks(s),ledger=L.betweenChecks(s),before=JSON.stringify(s);
  expect(ledger.bulkMixing).toEqual({beforeMl:a.pendingLiquidMl,afterMl:b.pendingLiquidMl,beforeFraction:a.pendingFraction,afterFraction:b.pendingFraction,complete:true});
  expect(a.pendingLiquidMl).toBe(100);expect(b.pendingLiquidMl).toBeGreaterThan(0);expect(b.pendingLiquidMl).toBeLessThan(100);
  expect(ledger.water.savedAddedMl).toBe(0);expect(ledger.water.balanced).toBe(true);expect(ledger.notes.join(' ')).toContain('evaporation and pasta uptake');
  expect(JSON.stringify(s)).toBe(before);
 });
 it('keeps a selected pair fixed after later doses and folds',()=>{
  let s=pair();const records=L.checks(s),selection={fromIndex:records[0].index,toIndex:records[1].index},before=L.betweenChecks(s,selection);
  s=act(s,[['pour',30],['stirSweep','button'],['taste']]);
  for(const state of [s,R.restore(s)]){const selected=L.betweenChecks(state,selection);expect(selected.bulkMixing).toEqual(before.bulkMixing);expect(selected.water).toEqual(before.water);expect(selected.from).toEqual(before.from);expect(selected.to).toEqual(before.to);expect(selected.newerChecks).toBe(true);}
 });
 it('keeps absent or contradictory pending observations unknown without reading live values',()=>{
  for(const patch of [{pendingLiquidMl:undefined},{pendingLiquidMl:-1},{pendingLiquidMl:Infinity},{pendingLiquidMl:10000},{pendingFraction:NaN},{pendingFraction:1.1},{pendingFraction:.8},{needsMixing:false},{mixingModel:1}]){
   const s=pair();Object.assign(checks(s)[0],patch);const bulk=L.betweenChecks(s).bulkMixing;
   expect(bulk.complete).toBe(false);expect(bulk.beforeMl).toBeNull();expect(bulk.beforeFraction).toBeNull();expect(bulk.afterMl).not.toBeNull();
  }
 });
 it('reports zero only for a genuinely empty free-water pool and shows a dry trail',()=>{
  let s=act(R.startRescue('dry',0),[['pour',50],['taste'],['panHeat',3],['advance',60],['advance',60],['taste']]);
  expect(s.pan.moisture).toBe(0);expect(s.pan.damage).toBeLessThan(1);expect(R.mixing(s).waterSinceMix).toBe(50);expect(R.mixing(s).pending.totalMl).toBe(0);
  expect(checks(s).at(-1)).toMatchObject({type:'dry',bodyType:'dry',closureSeconds:0,pendingLiquidMl:0,needsMixing:false});
  expect(V.describe(s).pan).toMatchObject({type:'dry',bodyType:'dry',loose:false,pendingFraction:0});
  expect(L.betweenChecks(s).bulkMixing).toMatchObject({afterMl:0,afterFraction:0,complete:true});
  checks(s).at(-1).pendingLiquidMl=1e-8;expect(L.betweenChecks(s).bulkMixing.complete).toBe(false);
 });
 it('keeps pool size tied to accepted cooking states and separate from oil or scorch',()=>{
  const s=pair(),initial=V.describe(s),unchanged=R.act(s,'stirSweep','unfinished');
  expect(unchanged).toBe(s);expect(V.describe(unchanged)).toEqual(initial);
  const next=R.act(s,'stirSweep','button');expect(V.describe(next).pan.pendingFraction).toBeLessThan(initial.pan.pendingFraction);
  const burnt={...s,pan:{...s.pan,damage:2}},cue=V.describe(burnt).pan;
  expect(cue.scorched).toBe(true);expect(cue.loose).toBe(true);expect(cue.baseBodyType).not.toBe('scorched');
 });
 it('exports the actual mixing protocol and rejects cross-protocol comparisons',()=>{
  const finish=s=>R.submit({...R.act(R.act(s,'taste'),'plate'),answers:[0,null]});
  const current=finish(act(R.startRescue('dry',0),[['pour',50],['stirPan'],['stirPan']])),old=R.restore({...current,mixingModel:1});
  expect(M.compare(current,R.restore(current))).toMatchObject({mixingModel:2,a:{mixingModel:2},b:{mixingModel:2}});
  expect(M.compare(current,old)).toBeNull();expect(M.incompatibility(current,old)).toContain('mixing models');
  expect(M.compare(old,R.restore(old))).toMatchObject({mixingModel:1});expect(L.betweenChecks({...pair(),mixingModel:1})).not.toHaveProperty('bulkMixing');
 });
 it('keeps tomato puddle markers within actual remaining juice through folds and drying',()=>{
  let s=R.startRescue('cooled',0);for(let i=0;i<14;i++)s=act(s,[['crushTomato',i],['crushTomato',i]]);
  s=act(s,[['pour',100],['stirPan']]);const before=JSON.stringify(s),pending=P.pending(s);
  expect(R.needsMixing(s)).toBe(true);expect(pending.reduce((a,b)=>a+b,0)).toBeCloseTo(R.mixing(s).pending.tomatoJuiceMl,12);expect(pending.some(n=>n>0)).toBe(true);expect(JSON.stringify(s)).toBe(before);
  s=R.act(s,'panHeat',3);for(let i=0;i<20&&s.pan.moisture>0;i++)s=R.act(s,'advance',30);
  expect(s.pan.moisture).toBe(0);expect(P.pending(s)).toEqual(Array(14).fill(0));
 });
 it('does not attribute a later water pool to an invisible residual juice marker',()=>{
  const s=act(R.startRescue('cooled',0),[['crushTomato',0],['stirPan'],['stirPan'],['pour',100],['taste']]),reading=checks(s).at(-1);
  expect(R.mixing(s).pending.tomatoJuiceMl).toBeGreaterThan(0);expect(R.mixing(s).pending.tomatoJuiceMl).toBeLessThan(.01);
  expect(reading.label).toBe('Added liquid not folded through');expect(reading.observation).not.toContain('Released tomato juice pools');
 });
});
