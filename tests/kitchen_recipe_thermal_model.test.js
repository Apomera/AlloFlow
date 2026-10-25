import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const old=require('./helpers/reference_fixture.cjs')('kitchen-sauce-heat-2026-10-18/pre-thermal-fixtures.json.gz');
const prior=require('./helpers/reference_fixture.cjs')('kitchen-sauce-dilution-2026-10-18/model-two-fixtures.json.gz');
function steps(s,list){for(const[a,v]of list)s=R.act(s,a,v);return s;}
function waterTotal(s){return s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl;}
function heated(heat,model=3){const s=R.restore({...R.startRescue('watery',1),thermalModel:model});return steps(s,[['panHeat',heat],['advance',60]]);}
function scorch(){let s=R.act(R.startRescue('dry',0,'demonstrate'),'panHeat',3),before;for(let i=0;i<10&&s.pan.damage<1;i++){s=R.act(s,'taste');before=s;s=R.act(s,'advance',60);}expect(s.pan.damage).toBeGreaterThanOrEqual(1);return {before,state:s};}

describe('Versioned burner power and recorded sauce checks',()=>{
 it('preserves version-1 reduction and its shared wet warming response',()=>{
  const low=heated(1,1),medium=heated(2,1),high=heated(3,1);
  expect(low.thermalModel).toBe(1);
  expect(high.pan.moisture).toBeLessThan(medium.pan.moisture);expect(medium.pan.moisture).toBeLessThan(low.pan.moisture);
  expect(high.pan.temp).toBe(low.pan.temp);expect(medium.pan.temp).toBe(low.pan.temp);expect(high.pan.temp).toBeLessThanOrEqual(108);
  expect(high.pan.evaporatedWaterMl).toBeGreaterThan(medium.pan.evaporatedWaterMl);
  for(const s of [low,medium,high]){expect(waterTotal(s)).toBeCloseTo(240,10);expect(s.pan.chemistry.starchG).toBe(1.6);expect(s.pan.chemistry.oilMl).toBe(15);}
 });
 it('keeps residual evaporation off heat and makes the trivet ignore the burner dial',()=>{
  const off=heated(0),trivet=steps(R.startRescue('watery',1),[['panHeat',3],['panPlace','trivet'],['advance',60]]);
  expect(off.pan.evaporatedWaterMl).toBeGreaterThan(0);expect(off.pan.evaporatedWaterMl).toBeLessThan(heated(1).pan.evaporatedWaterMl);
  expect(trivet.pan.temp).toBe(off.pan.temp);expect(trivet.pan.moisture).toBe(off.pan.moisture);expect(trivet.pan.evaporatedWaterMl).toBe(off.pan.evaporatedWaterMl);
  expect(trivet.pan.heat).toBe(3);expect(off.pan.heat).toBe(0);expect(waterTotal(off)).toBeCloseTo(240,10);
 });
 it('changes reduction only when time advances and consistently across equal clock partitions',()=>{
  const start=R.startRescue('watery',1),turned=R.act(start,'panHeat',3);
  expect(turned.pan.moisture).toBe(start.pan.moisture);expect(turned.pan.temp).toBe(start.pan.temp);expect(turned.time).toBe(start.time);
  const whole=R.act(turned,'advance',60),split=steps(turned,[['advance',15],['advance',15],['advance',15],['advance',15]]);
  expect(split.pan).toEqual(whole.pan);expect(split.pot).toEqual(whole.pot);
  expect(R.sauceChemistry(whole).starchPercent).toBeGreaterThan(R.sauceChemistry(start).starchPercent);
 });
 it('records a scorch-crossing clock step as applied, warns, and invalidates the earlier check',()=>{
  const {before,state}=scorch(),event=state.log.at(-1);
  expect(before.pan.damage).toBeLessThan(1);expect(before.pan.tasted).toBe(true);
  expect(event.action).toBe('advance');expect(event.accepted).toBe(true);expect(event.observation).toContain('has scorched');
  expect(state.time).toBe(before.time+60);expect(state.pan.tasted).toBe(false);
  expect(R.inspections(state).at(-1)).toEqual(R.inspections(before).at(-1));
  expect(R.evidence(state).corrections).toBe(0);
  const off=R.act(state,'panHeat',0),blocked=R.act(off,'plate');
  expect(blocked.plated).toBe(false);expect(blocked.log.at(-1).accepted).toBe(false);
  const checked=steps(off,[['taste'],['plate']]);expect(checked.plated).toBe(true);expect(R.inspections(checked).at(-1).type).toBe('scorched');expect(R.criteria(checked)[0].met).toBe(false);
 });
 it('reconstructs the applied warning and fresh-check requirement from recorded actions',()=>{
  const {state}=scorch(),done=R.submit({...steps(state,[['panHeat',0],['taste'],['plate']]),answers:[0,null]});
  expect(R.restore(done)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);
  const index=done.log.findIndex(e=>e.action==='advance'&&e.observation.includes('has scorched'))+1,frame=R.replay(done,index);
  expect(frame.action.accepted).toBe(true);expect(frame.state.pan.tasted).toBe(false);expect(frame.state.time).toBe(done.log[index-1].time);
 });
 it('uses the recorded observation for the same check receipt, including unmixed water and scorching',()=>{
  for(const [id,action] of [['dry','pour'],['starchy','pourPlain']]){
   const s=steps(R.startRescue(id,0),[[action,50],['taste']]),reading=R.inspections(s).at(-1);
   expect(reading.type).toBe('unmixed');expect(s.feedback).toContain(reading.label);expect(s.feedback).toContain(reading.observation);expect(s.log.at(-1).observation).toBe(s.feedback);
   expect(s.feedback).not.toContain('Sauce check: Oil droplets separating');
  }
  const checked=R.act(scorch().state,'taste');expect(checked.feedback).toContain(R.inspections(checked).at(-1).observation);
 });
 it('preserves invalid-clock and runtime boundaries without moving food',()=>{
  const s=R.startRescue('watery',1);
  for(const value of [undefined,null,-1,0,61,NaN,Infinity,'30'])expect(R.act(s,'advance',value)).toBe(s);
  for(const state of [{...s,time:3600},{...s,log:Array(1200).fill({})},{...s,plated:true},{...s,submitted:true}])expect(R.act(state,'advance',30)).toBe(state);
  const near={...s,time:3599},last=R.act(near,'advance',60);expect(last.time).toBe(3600);expect(last.pan.evaporatedWaterMl).toBeGreaterThan(0);expect(R.act(last,'advance',1)).toBe(last);
 });
 it('rejects unknown thermal save versions and replays only supported versions',()=>{
  const s=steps(R.startRescue('dry',0),[['pour',50],['stirSweep','button'],['taste'],['plate']]),done=R.submit({...s,answers:[0,null]});
  expect(R.evidence(done).thermalModel).toBe(3);
  for(const thermalModel of [null,0,4,-1,'1']){expect(R.restore({...done,thermalModel})).toBeNull();expect(R.replay({...done,thermalModel},0)).toBeNull();}
 });
 for(const id of ['mushroom','tomato'])for(const servings of [2,4])it('finishes '+id+' for '+servings+' using the new heat response',()=>{
  const s=cook(id,servings).state;expect(R.criteria(s).every(g=>g.met)).toBe(true);expect(R.restore(s)).toEqual(s);expect(s.thermalModel).toBe(3);
 });
 for(const f of old.concat(prior))it('preserves historical '+f.label+' exactly without the thermal flag',()=>{
  const s=R.restore(f.state);expect(s).toEqual(f.state);expect(R.evidence(s)).toEqual(f.evidence);expect(R.inspections(s)).toEqual(f.inspections);expect(s).not.toHaveProperty('thermalModel');
  if(s.plated&&s.submitted)expect(R.replay(s,s.log.length).state.pan).toEqual(s.pan);
 });
});
