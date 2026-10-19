import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_investigation_model.js');
const source=fs.readFileSync(require.resolve('../stem_lab/kitchen_studio/recipe_lab_investigation_model.js'),'utf8');
const last=arm=>arm.stages.at(-1),copy=value=>JSON.parse(JSON.stringify(value));
function injected(engine){const context={KitchenRecipes:engine,module:{exports:{}}};vm.runInNewContext(source,context);return context.module.exports;}

describe('Controlled sauce source investigation protocol 1',()=>{
 it('starts with identical normalized dishes and changes the starch input at equal liquid temperature',()=>{
  const result=S.run(),[plain,reduced]=result.arms;
  expect(result.configuration).toEqual({doseMl:60,folds:2,waitSeconds:0});expect(result.protocol).toBe(1);expect(result.activity).toBe('liquid-choice');
  expect(plain.stages[0].state).toEqual(reduced.stages[0].state);expect(plain.stages[0].state.pan).toMatchObject({temp:90,moisture:45,heat:0});
  for(const arm of result.arms){expect(arm.stages[0].state.pot).toMatchObject({reserveTemp:80,plainTemp:80});expect(arm.source.temperature).toBe(80);}
  expect(plain.source.starchGPer100Ml).toBe(0);expect(reduced.source.starchGPer100Ml).toBe(4);expect(last(plain).reading.type).toBe('coating');expect(last(reduced).reading.type).toBe('thick');
  expect(last(plain).state.pan.chemistry.starchG).toBe(3);expect(last(reduced).state.pan.chemistry.starchG).toBeCloseTo(5.4,12);
  expect(result.validity.valid).toBe(true);expect(result.validity.checks.every(c=>c.equal)).toBe(true);
 });
 it('records accepted real checks at every stage and counts the actual six-second folds',()=>{
  const result=S.run({doseMl:60,folds:4,waitSeconds:75});
  for(const arm of result.arms){
   expect(arm.stages.map(s=>s.id)).toEqual(['baseline','poured','fold-1','fold-2','fold-3','fold-4','rested']);
   expect(arm.stages.map(s=>s.state.time)).toEqual([0,0,6,12,18,24,99]);
   for(const stage of arm.stages){expect(stage.state.log.every(e=>e.accepted)).toBe(true);expect(stage.state.log.at(-1).action).toBe('taste');expect(stage.reading).toEqual(stage.state.log.at(-1).inspection);expect(stage.reading.kind).toBe('sauce');}
   const log=last(arm).state.log;expect(log.filter(e=>e.action==='advance').map(e=>e.value)).toEqual([60,15]);expect(log.filter(e=>e.action==='stirPan').map(e=>e.durationSeconds)).toEqual([6,6,6,6]);
  }
 });
 it('preserves matched temperature, free water, pasta uptake and evaporation over the supported control grid',()=>{
  for(const doseMl of [10,20,30,40,50,60,70,80,90,100])for(const folds of [0,1,2,3,4])for(const waitSeconds of [0,15,60,120]){
   const result=S.run({doseMl,folds,waitSeconds}),[plain,reduced]=result.arms;
   expect(result.validity.valid).toBe(true);
   plain.stages.forEach((stage,i)=>{
    const a=stage.state,b=reduced.stages[i].state;expect(a.time).toBe(b.time);expect(a.pan.temp).toBe(b.pan.temp);expect(a.pan.moisture).toBe(b.pan.moisture);
    expect(a.pan.absorbedWaterMl).toBe(b.pan.absorbedWaterMl);expect(a.pan.evaporatedWaterMl).toBe(b.pan.evaporatedWaterMl);expect(a.pot.progress).toBe(b.pot.progress);
    for(const state of [a,b]){const n=state.pan,p=state.pot;expect(n.moisture+n.absorbedWaterMl+n.evaporatedWaterMl+p.reserve+p.plainWater).toBeCloseTo(445,10);expect(n.chemistry.starchG+p.reserveStarchG).toBeCloseTo(9,12);expect(n.chemistry.oilMl).toBe(15);}
   });
  }
 });
 it('conserves water, starch and oil instead of treating incorporation or uptake as disappearance',()=>{
  const result=S.run({doseMl:100,folds:3,waitSeconds:120});
  for(const arm of result.arms)arm.stages.forEach((stage,i)=>{
   const n=stage.state.pan,m=R.mixing(stage.state);expect(n.moisture+n.absorbedWaterMl+n.evaporatedWaterMl).toBeCloseTo(45+(i?100:0),10);
   expect(n.chemistry.starchG).toBeCloseTo(3+(i&&arm.id==='reduced'?4:0),12);expect(n.chemistry.oilMl).toBe(15);expect(m.pending.totalMl).toBeLessThanOrEqual(n.moisture+1e-7);
   expect(n.chemistry.starchG+stage.state.pot.reserveStarchG).toBeCloseTo(9,12);
  });
 });
 it('keeps pooling explicit until enough folds and shows that a flowing result can thicken during a pause',()=>{
  const unworked=S.run({doseMl:60,folds:0,waitSeconds:120});
  for(const arm of unworked.arms){expect(last(arm).reading.type).toBe('unmixed');expect(last(arm).reading.needsMixing).toBe(true);}
  const paused=S.run({doseMl:60,folds:2,waitSeconds:120}),plain=paused.arms[0],before=plain.stages.find(s=>s.id==='fold-2'),after=last(plain);
  expect(plain.stages.find(s=>s.id==='fold-1').reading.type).toBe('unmixed');expect(before.reading.type).toBe('coating');expect(after.reading.type).toBe('thick');
  expect(after.state.pan.moisture).toBeLessThan(before.state.pan.moisture);expect(after.reading.chemistry.starchG).toBe(before.reading.chemistry.starchG);expect(after.reading.chemistry.coolingFactor).toBeGreaterThan(before.reading.chemistry.coolingFactor);
 });
 it('does not require different categorical outcomes to establish a measured difference',()=>{
  const [plain,reduced]=S.run({doseMl:20,folds:2,waitSeconds:0}).arms;
  expect(last(plain).reading.type).toBe('thick');expect(last(reduced).reading.type).toBe('thick');expect(last(reduced).reading.chemistry.starchPercent).toBeGreaterThan(last(plain).reading.chemistry.starchPercent);
 });
 it('returns detached stage snapshots and repeatable results without modifying the normal recipe baseline',()=>{
  const config={doseMl:60,folds:2,waitSeconds:15},original=R.startRescue('starchy',0,'practice'),before=copy(original),a=S.run(config),expected=S.run(config);
  const later=copy(last(a.arms[0]));a.arms[0].stages[0].state.pan.moisture=999;a.arms[0].stages[0].reading.chemistry.starchG=999;
  expect(last(a.arms[0])).toEqual(later);expect(S.run(config)).toEqual(expected);expect(original).toEqual(before);expect(R.startRescue('starchy',0,'practice').pot.reserveTemp).toBe(92);expect(config).toEqual({doseMl:60,folds:2,waitSeconds:15});
 });
 it('rejects invalid controls rather than silently changing the experiment',()=>{
  for(const value of [null,[],1,'60'])expect(()=>S.run(value)).toThrow();
  for(const doseMl of [0,5,55,110,NaN,Infinity,'60',null])expect(()=>S.run({doseMl})).toThrow();
  for(const folds of [-1,.5,5,'2',null])expect(()=>S.run({folds})).toThrow();
  for(const waitSeconds of [-15,1,121,Infinity,'15',null])expect(()=>S.run({waitSeconds})).toThrow();
 });
 it('refuses future engine flags or changed supplied dishes before claiming protocol 1',()=>{
  for(const [field,value]of [['thermalModel',4],['mixingModel',3],['sauceObservationModel',3],['sauceModel',4],['panModel',3],['pieceModel',2],['dryingModel',2],['pastaModel',2],['tomatoModel',2]]){
   const model=injected({...R,startRescue(...args){const s=R.startRescue(...args);s[field]=value;return s;}});expect(()=>model.run()).toThrow(/no longer matches/);
  }
  const model=injected({...R,startRescue(...args){const s=R.startRescue(...args);s.pan.moisture=46;return s;}});expect(()=>model.run()).toThrow(/no longer matches/);
  const malformed=injected({...R,startRescue(...args){const s=R.startRescue(...args);delete s.pan.pendingLiquid;return s;}});expect(()=>malformed.run()).toThrow(/no longer matches/);
 });
 it('validates actual mix duration instead of calling a changed engine schedule controlled',()=>{
  const model=injected({...R,act(s,action,value){const next=R.act(s,action,value);if(action==='stirPan')next.log.at(-1).durationSeconds=7;return next;}}),result=model.run();
  expect(result.validity.valid).toBe(false);expect(result.validity.checks.find(c=>c.label==='Prescribed fold duration').equal).toBe(false);
 });
 it('round-trips a separate versioned record and rebuilds outputs without ordinary save restoration',()=>{
  let restores=0;const model=injected({...R,restore(){restores++;throw new Error('Ordinary recipe restoration must not run.');}});
  const record=model.createRecord({doseMl:100,folds:1,waitSeconds:15,prediction:'reduced',reflection:'Compare concentration and pooling.'}),restored=model.restoreRecord(JSON.parse(JSON.stringify(record)));
  expect(restored.record).toEqual(record);expect(JSON.stringify(restored.investigation)).toBe(JSON.stringify(model.run(record.configuration)));expect(restores).toBe(0);
  expect(Object.keys(record)).toEqual(['protocol','activity','configuration','prediction','reflection']);expect(record).not.toHaveProperty('arms');
 });
 it('ignores imported states and logs while rejecting future, partial and malformed records',()=>{
  const record=S.createRecord(),tampered={...copy(record),arms:[{state:{pan:{moisture:999}}}],log:[{action:'panHeat',value:3}],submitted:true};
  expect(S.restoreRecord(tampered)).toEqual(S.restoreRecord(record));
  for(const value of [null,[],{}, {...record,protocol:2},{...record,activity:'future'},{...record,prediction:'correct'},{...record,reflection:4},{...record,configuration:{doseMl:60,folds:2}},{...record,configuration:{...record.configuration,waitSeconds:10}}])expect(S.restoreRecord(value)).toBeNull();
  for(const key of ['prediction','reflection']){const partial=copy(record);delete partial[key];expect(S.restoreRecord(partial)).toBeNull();}
  expect(()=>S.createRecord({reflection:'a'.repeat(2001)})).toThrow();expect(()=>S.createRecord({prediction:'unknown'})).toThrow();expect(S.createRecord({reflection:'a'.repeat(2000)}).reflection).toHaveLength(2000);
 });
});
