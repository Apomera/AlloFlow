import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const previous=require('./helpers/reference_fixture.cjs')('kitchen-sauce-dilution-2026-10-18/model-two-fixtures.json.gz');
// Preserve the original six-second dilution schedules; mixing2 routes are tested separately.
const start=()=>R.restore({...R.startRescue('starchy',0,'demonstrate'),mixingModel:1});
function act(s,steps){for(const [a,v] of steps)s=R.act(s,a,v);return s;}
function finish(s){s=act(s,[['taste'],['plate']]);return R.submit({...s,answers:[0,null]});}
function balance(s){return s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl+s.pot.reserve+s.pot.plainWater;}

describe('Choosing a liquid for a heavy starch coating',()=>{
 it('makes equal measured pours carry different starch while conserving both supplies',()=>{
  const s=R.act(start(),'taste'),before=JSON.stringify(s);
  const plainPoured=R.act(s,'pourPlain',50),savedPoured=R.act(s,'pour',50);
  const plain=act(plainPoured,[['stirSweep','button'],['taste']]),saved=act(savedPoured,[['stirSweep','button'],['taste']]);
  expect(s.sauceModel).toBe(3);expect(R.sauceChemistry(s).type).toBe('thick');
  expect(plainPoured.pan.moisture).toBe(savedPoured.pan.moisture);expect(plainPoured.pan.moisture).toBe(95);
  // The two supplies carry different heat as well as starch. During each timed
  // fold, water follows the same uptake/evaporation as an equal elapsed interval.
  expect(plain.pan.moisture).toBe(R.act(plainPoured,'advance',6).pan.moisture);
  expect(saved.pan.moisture).toBe(R.act(savedPoured,'advance',6).pan.moisture);
  expect(plain.pan.moisture).toBeGreaterThan(saved.pan.moisture);expect(plain.pan.chemistry.starchG).toBe(3);expect(saved.pan.chemistry.starchG).toBe(5);
  expect(R.sauceChemistry(plain).type).toBe('coating');expect(R.sauceChemistry(saved).type).toBe('thick');
  for(const n of [plain,saved]){expect(balance(n)).toBe(balance(s));expect(n.pan.chemistry.starchG+n.pot.reserveStarchG).toBe(9);expect(n.pan.chemistry.oilMl).toBe(15);}
  expect(plain.pot.reserve).toBe(150);expect(plain.pot.plainWater).toBe(200);expect(plain.pan.waterAdded).toBe(s.pan.waterAdded);
  expect(plain.log.find(e=>e.action==='pourPlain').transfer).toMatchObject({from:'plain water',to:'sauce',amount:50,starchG:0,sourceTemperature:80});
  expect(saved.log.find(e=>e.action==='pour').transfer).toMatchObject({from:'reduced cooking water',amount:50,starchG:2});
  expect(JSON.stringify(s)).toBe(before);
 });
 it('requires folding every new source and a deliberate fresh observation',()=>{
  const s=R.act(start(),'taste'),poured=R.act(s,'pourPlain',50);
  expect(poured.pan.tasted).toBe(false);expect(R.mixing(poured)).toMatchObject({waterSinceMix:0,plainSinceMix:50,liquidSinceMix:50});
  expect(R.criteria(poured)[0].met).toBe(false);expect(R.inspections(R.act(poured,'taste')).at(-1).type).toBe('unmixed');
  const folded=R.act(poured,'stirSweep','button');expect(R.dilutionCheck(folded).met).toBe(false);
  const checked=R.act(folded,'taste');expect(R.dilutionCheck(checked).met).toBe(true);
  expect(R.dilutionCheck(R.act(checked,'pourPlain',10)).met).toBe(false);
 });
 it('uses action order for before/after evidence and cannot award an unobserved diagnosis',()=>{
  const blind=finish(act(start(),[['pourPlain',50],['stirSweep','button']]));
  expect(R.criteria(blind)[0].met).toBe(true);expect(R.dilutionCheck(blind).met).toBe(false);expect(R.evidence(blind).status).toBe('Review and retry');
  const observed=finish(act(start(),[['taste'],['pourPlain',50],['stirSweep','button']]));
  expect(observed.time).toBe(6);expect(R.dilutionCheck(observed)).toMatchObject({baselineAt:0,baselineIndex:0,latestCheckAt:6,adjusted:true,met:true});
  expect(R.criteria(observed).every(c=>c.met)).toBe(true);expect(R.evidence(observed).status).toBe('Rescue demonstrated independently');
 });
 it('permits several measured solutions and a correction after choosing concentrated water',()=>{
  for(const amount of [50,60,80,100]){
   const done=finish(act(start(),[['taste'],['pourPlain',amount],['stirSweep','button']]));
   expect(R.criteria(done).every(c=>c.met)).toBe(true);
  }
  const failed=act(start(),[['taste'],['pour',50],['stirSweep','button'],['taste']]);
  expect(R.dilutionCheck(failed).met).toBe(false);
  const fixed=finish(act(failed,[['pourPlain',70],['stirSweep','button']]));
  expect(R.criteria(fixed).every(c=>c.met)).toBe(true);expect(fixed.pan.chemistry.starchG).toBe(5);
  expect(R.evidence(fixed).dilution).toMatchObject({plainWaterUsed:70,savedWaterUsed:50,startingStarchG:3,finalStarchG:5});
 });
 it('keeps a large starchy mixture heavy but makes excessive plain dilution thin',()=>{
  const concentrated=act(start(),[['taste'],['pour',100],['pour',50],['stirSweep','button'],['taste']]);
  expect(concentrated.pan.moisture).toBeLessThan(195);expect(concentrated.pan.moisture+concentrated.pan.absorbedWaterMl+concentrated.pan.evaporatedWaterMl).toBeCloseTo(195,10);expect(R.sauceChemistry(concentrated).type).toBe('thick');expect(concentrated.feedback).not.toContain('loose');
  const diluted=act(start(),[['taste'],['pourPlain',100],['pourPlain',100],['pourPlain',50],['stirSweep','button'],['taste']]);
  expect(diluted.pot.plainWater).toBe(0);expect(R.sauceChemistry(diluted).type).toBe('watery');expect(R.criteria(diluted)[0].met).toBe(false);
  const rejected=R.act(diluted,'pourPlain',10);expect(rejected.log.at(-1).accepted).toBe(false);expect(rejected.pan).toEqual(diluted.pan);expect(rejected.pot).toEqual(diluted.pot);
 });
 it('transfers the source heat and cools the separate plain supply only as time advances',()=>{
  const s=start(),poured=R.act(s,'pourPlain',50);expect(poured.pan.temp).toBeLessThan(s.pan.temp);expect(poured.pan.temp).toBeGreaterThan(s.pot.plainTemp);
  expect(poured.pot.plainTemp).toBe(80);const mixed=R.act(s,'stirPan');expect(mixed.pot.plainTemp).toBe(R.act(s,'advance',6).pot.plainTemp);expect(mixed.pot.plainTemp).toBeLessThan(80);
  const waited=R.act(s,'advance',60);expect(waited.pot.plainTemp).toBeLessThan(80);expect(waited.pot.plainTemp).toBeGreaterThan(22);
  expect(balance(waited)).toBeCloseTo(balance(s),10);
  const cold=R.act(waited,'pourPlain',50);expect(cold.log.at(-1).transfer.sourceTemperature).toBe(waited.pot.plainTemp);
 });
 it('can use the concentrated supply to restore body after excessive plain dilution',()=>{
  const thin=act(start(),[['taste'],['pourPlain',100],['pourPlain',100],['pourPlain',50],['stirSweep','button'],['taste']]);
  expect(R.sauceChemistry(thin).type).toBe('watery');
  const restored=finish(act(thin,[['pour',50],['stirSweep','button']]));
  expect(restored.pan.moisture).toBeGreaterThan(thin.pan.moisture);
  expect(restored.pan.chemistry.starchG).toBe(5);expect(R.sauceChemistry(restored).type).toBe('coating');
  expect(R.criteria(restored).every(c=>c.met)).toBe(true);expect(balance(restored)).toBeCloseTo(balance(thin),10);
 });
 it('does not manufacture supplies or erase scorch damage',()=>{
  const s=start();for(const value of [undefined,NaN,Infinity,-10,0,9,15,110,'50',{}])expect(R.act(s,'pourPlain',value)).toBe(s);
  for(const id of ['dry','watery','separated','holding']){const other=R.startRescue(id,0);expect(R.act(other,'pourPlain',50)).toBe(other);expect(R.sauceLiquids(other)).toHaveLength(1);}
  const scorched={...s,pan:{...s.pan,damage:1.1}};expect(R.sauceChemistry(act(scorched,[['pourPlain',50],['stirSweep','button']])).type).toBe('scorched');
  const ready=act(s,[['taste'],['pourPlain',50],['stirSweep','button'],['taste']]),serving=R.act(ready,'servePortion',0);
  expect(R.act(serving,'pourPlain',10).log.at(-1).accepted).toBe(false);expect(R.act({...ready,plated:true},'pourPlain',10).pan).toEqual(ready.pan);
 });
 it('reconstructs source balances, chemistry, observations and detached exported evidence',()=>{
  const done=finish(act(start(),[['taste'],['pour',50],['stirSweep','button'],['taste'],['pourPlain',70],['stirSweep','button']])),before=JSON.stringify(done);
  const raw=JSON.parse(before);raw.pot.plainWater=999;raw.pot.plainTemp=999;raw.pot.reserveStarchG=999;raw.pan.plainWaterAdded=999;raw.log.find(e=>e.transfer).transfer.starchG=999;
  expect(R.restore(raw)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);
  const index=done.log.findIndex(e=>e.action==='pourPlain')+1,frame=R.replay(done,index);
  expect(frame.changes.some(c=>c.startsWith('Plain water remaining'))).toBe(true);
  const e=R.evidence(done);e.dilution.plainWaterUsed=999;e.actions.find(a=>a.transfer).transfer.starchG=999;expect(JSON.stringify(done)).toBe(before);
  for(const sauceModel of [undefined,1,2,4])expect(R.restore({...done,sauceModel})).toBeNull();
  expect(R.restore({...R.startRescue('dry',0),sauceModel:3})).toBeNull();
 });
 for(const f of previous)it('preserves existing model2 '+f.label+' exactly',()=>{
  const s=R.restore(f.state);expect(s).toEqual(f.state);expect(R.evidence(s)).toEqual(f.evidence);expect(R.inspections(s)).toEqual(f.inspections);
 });
});
