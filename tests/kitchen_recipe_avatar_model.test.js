import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),A=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const source=fs.readFileSync(require.resolve('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
function injected(engine){const context={KitchenRecipes:engine,module:{exports:{}}};vm.runInNewContext(source,context);return context.module.exports;}
function ready(session,kind,options={}){let s=A.begin(session,kind,options);if(s===session)return s;while(s.pending.phase!=='ready')s=A.advance(s,s.pending.token);return s;}
function doAction(s,kind,options){const preview=ready(s,kind,options);return A.commit(preview,preview.pending?.token);}
function sequence(mode='practice',source='plain',amountMl=60){let s=A.create({mode});for(const kind of ['inspect','pour','fold','fold','inspect'])s=doAction(s,kind,{source,amountMl});return s;}
function water(s){const n=s.state.pan,p=s.state.pot;return n.moisture+n.absorbedWaterMl+n.evaporatedWaterMl+p.reserve+p.plainWater;}

describe('Avatar sauce station: model-backed deliberate character actions',()=>{
 it('starts a separate untouched real rescue with actual unequal source temperatures and pinned model flags',()=>{
  const s=A.create();expect(s.mode).toBe('practice');expect(s.state).toEqual(R.startRescue('starchy',0,'practice'));expect(s.state.pot).toMatchObject({plainTemp:80,reserveTemp:92,plainWater:250,reserve:150,reserveStarchG:6});
  expect(s.state).toMatchObject({thermalModel:3,mixingModel:2,sauceObservationModel:2,sauceModel:3});expect(s.state.pan).toMatchObject({temp:90,moisture:45,heat:0,chemistry:{starchG:3,oilMl:15}});
  expect(s.reading).toBeNull();expect(s.inspectionFresh).toBe(false);expect(s.record.intents).toEqual([]);expect(s.guide).toMatchObject({index:0,kind:'inspect',complete:false});
 });
 it('changes only the character preview through every ordered pour milestone, committing a measured dose on release',()=>{
  const initial=A.create({mode:'independent'}),state=clone(initial.state);let s=A.begin(initial,'pour',{source:'plain',amountMl:60,method:'pointer'});
  expect(s.pending).toMatchObject({kind:'pour',phase:'pickup',stepIndex:0,source:'plain',amountMl:60});expect(Number.isInteger(s.pending.token)).toBe(true);
  for(const phase of ['measure','position','tilt','level','ready']){s=A.step(s,phase,s.pending.token);expect(s.state).toEqual(state);expect(s.record.intents).toEqual([]);expect(s.receipts).toEqual([]);}
  const done=A.commit(s,s.pending.token);expect(done.state).toEqual(R.act(initial.state,'pourPlain',60,'scene-pour'));expect(done.pending).toBeNull();expect(done.state.time).toBe(0);
  expect(done.lastReceipt).toMatchObject({action:'pourPlain',method:'pointer',actor:'learner',durationSeconds:0,transfer:{amount:60,starchG:0,sourceTemperature:80}});
 });
 it('rejects phase skipping, malformed or stale tokens, unready releases and repeated releases',()=>{
  const s=A.begin(A.create(),'inspect',{method:'keyboard'});expect(A.commit(s,s.pending.token)).toBe(s);expect(A.step(s,'ready',s.pending.token)).toBe(s);expect(A.advance(s,0)).toBe(s);expect(A.advance(s,'1')).toBe(s);
  let prepared=s;while(prepared.pending.phase!=='ready')prepared=A.advance(prepared,prepared.pending.token);
  expect(A.commit(prepared,prepared.pending.token+1000)).toBe(prepared);const done=A.commit(prepared,prepared.pending.token);expect(done.state.log).toHaveLength(1);expect(A.commit(done,s.pending.token)).toBe(done);expect(A.advance(done)).toBe(done);
 });
 it('keeps stale callback tokens distinct across new modes and restored attempts',()=>{
  const first=A.begin(A.create(),'inspect'),second=A.begin(A.create({mode:'independent'}),'inspect');expect(first.pending.token).not.toBe(second.pending.token);expect(A.advance(second,first.pending.token)).toBe(second);
  const restored=A.restoreRecord(A.createRecord(A.create())),third=A.begin(restored,'inspect');expect(third.pending.token).not.toBe(first.pending.token);expect(A.cancel(third,first.pending.token)).toBe(third);expect(A.commit(third,second.pending.token)).toBe(third);
 });
 it('cancels at every inspect, pour and fold milestone with no quantity, inspection, time or record change',()=>{
  for(const kind of ['inspect','pour','fold'])for(let count=0;count<A.phases[kind].length;count++){
   const initial=A.create({mode:'independent'});let s=A.begin(initial,kind,{source:'plain',amountMl:60});for(let i=0;i<count;i++)s=A.advance(s,s.pending.token);
   const canceled=A.cancel(s,s.pending.token);expect(canceled.state).toBe(initial.state);expect(canceled.reading).toBeNull();expect(canceled.record).toBe(initial.record);expect(canceled.receipts).toEqual([]);expect(canceled.pending).toBeNull();
   const retry=A.begin(canceled,kind,{source:'plain',amountMl:60});expect(retry.pending.token).toBeGreaterThan(s.pending.token);expect(A.commit(retry,s.pending.token)).toBe(retry);expect(A.cancel(retry,s.pending.token)).toBe(retry);
  }
 });
 it('gates guided practice by actual committed actions and labels sequence completion without guaranteeing rescue',()=>{
  let s=A.create();expect(A.begin(s,'pour',{source:'plain',amountMl:60})).toBe(s);expect(A.begin(s,'fold')).toBe(s);expect(A.rest(s,15)).toBe(s);expect(A.heat(s,1)).toBe(s);
  s=sequence('practice','plain',10);expect(s.guide.complete).toBe(true);expect(s.guide.kind).toBeNull();expect(s.reading.type).toBe('thick');expect(R.dilutionCheck(s.state).met).toBe(false);expect(s.state.submitted).toBe(false);
  expect(A.begin(s,'fold')).toBe(s);expect(s.guide.label).toContain('Judge the actual sauce');expect(A.create().record.intents).toEqual([]);
 });
 it('uses one explicit demonstrator action per watch step and preserves demonstrator provenance',()=>{
  let s=A.create({mode:'watch'});expect(A.begin(s,'inspect')).toBe(s);expect(A.rest(s,15)).toBe(s);
  for(let i=0;i<5;i++){const prior=s;s=A.demonstrateNext(s);expect(s.state.log.length-prior.state.log.length).toBe(1);expect(s.record.intents.at(-1)).toMatchObject({actor:'demonstrator',method:'demonstrator',mode:'watch'});}
  expect(s.state.time).toBe(12);expect(s.reading.type).toBe('coating');expect(s.guide.complete).toBe(true);expect(s.pending).toBeNull();expect(A.demonstrateNext(s)).toBe(s);
  expect(s.state.log.map(entry=>entry.action)).toEqual(['taste','pourPlain','stirSweep','stirSweep','taste']);expect(s.state.log[1].transfer.sourceTemperature).toBe(80);
 });
 it('keeps a deliberate check distinct from live state after pours, folds, heat settings and waits',()=>{
  let s=doAction(A.create({mode:'independent'}),'inspect');const original=s.reading;expect(s.inspectionFresh).toBe(true);
  s=doAction(s,'pour',{source:'plain',amountMl:60});expect(s.reading).toBe(original);expect(s.inspectionFresh).toBe(false);expect(s.state.pan.moisture).not.toBe(s.reading.chemistry.waterMl);
  s=doAction(s,'fold');s=A.heat(s,1);s=A.rest(s,15);expect(s.reading).toBe(original);expect(s.inspectionFresh).toBe(false);
  s=doAction(s,'inspect');expect(s.inspectionFresh).toBe(true);expect(s.reading).toEqual(s.state.log.at(-1).inspection);expect(s.reading.time).toBe(s.state.time);
 });
 it('stages visible watch movements with the same reversible milestones before one demonstrator release',()=>{
  let s=A.create({mode:'watch'});for(let action=0;action<5;action++){
   const initial=s;let staged=A.beginDemonstration(s);expect(staged.pending.kind).toBe(initial.guide.kind);expect(staged.pending.intent).toMatchObject({actor:'demonstrator',method:'demonstrator',mode:'watch'});
   const canceled=A.cancel(staged,staged.pending.token);expect(canceled.state).toBe(initial.state);expect(canceled.record).toBe(initial.record);staged=A.beginDemonstration(canceled);
   for(const phase of staged.pending.steps.slice(1)){staged=A.step(staged,phase,staged.pending.token);expect(staged.state).toBe(initial.state);expect(staged.record).toBe(initial.record);}
   s=A.commit(staged,staged.pending.token);expect(s.state.log.length).toBe(initial.state.log.length+1);expect(s.record.intents.at(-1).actor).toBe('demonstrator');
  }expect(s.guide.complete).toBe(true);expect(s.state.time).toBe(12);expect(s.reading.type).toBe('coating');expect(A.beginDemonstration(s)).toBe(s);expect(A.beginDemonstration(A.create())).toMatchObject({mode:'practice',pending:null});
 });
 it('maps button, keyboard and pointer folds to supported canonical provenance with the same six-second physics',()=>{
  const physical=[];for(const method of ['button','keyboard','pointer']){
   const initial=A.create({mode:'independent'}),done=doAction(initial,'fold',{method}),entry=done.state.log.at(-1);
   expect(entry.action).toBe('stirSweep');expect(entry.value).toBe(method==='pointer'?'gesture':'button');expect(entry.durationSeconds).toBe(6);expect(done.state.time).toBe(6);expect(entry.interaction).toBe(method==='keyboard'?'keyboard':'scene-stir');
   expect(done.state).toEqual(R.act(initial.state,'stirSweep',method==='pointer'?'gesture':'button',method==='keyboard'?'keyboard':'scene-stir'));physical.push(done.state.pan);
  }expect(physical[0]).toEqual(physical[1]);expect(physical[1]).toEqual(physical[2]);
 });
 it('conserves water, starch and oil over both source choices and measured dose boundaries',()=>{
  for(const source of ['plain','reduced'])for(const amountMl of [10,30,60,100]){
   const initial=A.create(),done=sequence('practice',source,amountMl);expect(water(done)).toBeCloseTo(water(initial),10);expect(done.state.pan.chemistry.starchG+done.state.pot.reserveStarchG).toBeCloseTo(9,12);expect(done.state.pan.chemistry.oilMl).toBe(15);
   const transfer=done.receipts.find(receipt=>receipt.kind==='pour').transfer;expect(transfer.amount).toBe(amountMl);expect(transfer.starchG).toBeCloseTo(source==='plain'?0:amountMl*.04,12);expect(transfer.sourceTemperature).toBe(source==='plain'?80:92);
   expect(R.mixing(done.state).pending.totalMl).toBeLessThanOrEqual(done.state.pan.moisture);expect(done.state.time).toBe(12);
  }
 });
 it('permits independent correction instead of prescribing a guaranteed successful liquid',()=>{
  let s=A.create({mode:'independent'});s=doAction(s,'inspect');s=doAction(s,'pour',{source:'reduced',amountMl:60});s=doAction(s,'fold');s=doAction(s,'fold');s=doAction(s,'inspect');expect(s.reading.type).toBe('thick');expect(s.state.pan.chemistry.starchG).toBeCloseTo(5.4,12);
  s=doAction(s,'pour',{source:'plain',amountMl:80});s=doAction(s,'fold');s=doAction(s,'fold');s=doAction(s,'inspect');expect(s.reading.type).toBe('coating');expect(s.state.pan.chemistry.starchG).toBeCloseTo(5.4,12);expect(water(s)).toBeCloseTo(445,10);
 });
 it('rejects exhausted sources and malformed amounts rather than manufacturing water',()=>{
  let s=A.create({mode:'independent'});for(const amountMl of [100,100,50])s=doAction(s,'pour',{source:'plain',amountMl});expect(s.state.pot.plainWater).toBe(0);expect(A.begin(s,'pour',{source:'plain',amountMl:10})).toBe(s);
  const fresh=A.create({mode:'independent'});for(const amountMl of [null,undefined,0,5,15,110,Infinity,NaN,'60'])expect(A.begin(fresh,'pour',{source:'plain',amountMl})).toBe(fresh);
  for(const source of ['saved','water','',null])expect(A.begin(fresh,'pour',{source,amountMl:60})).toBe(fresh);expect(A.begin(fresh,'pour',{source:'plain',amountMl:60,method:'robot'})).toBe(fresh);
 });
 it('runs only allowed independent clock and burner changes, rejecting them while a hand is staged',()=>{
  let s=A.create({mode:'independent'});const original=s;s=A.heat(s,2,'keyboard');expect(s.state).toEqual(R.act(original.state,'panHeat',2,'keyboard'));expect(s.lastReceipt).toMatchObject({action:'panHeat',durationSeconds:0,value:2});
  const before=s;s=A.rest(s,30);expect(s.state).toEqual(R.act(before.state,'advance',30,'select'));expect(s.state.time).toBe(30);expect(s.state.pot.plainTemp).toBeLessThan(80);
  const staged=A.begin(s,'fold');expect(A.heat(staged,0)).toBe(staged);expect(A.rest(staged,15)).toBe(staged);
  for(const setting of [-1,4,5,.5,'1',null])expect(A.heat(s,setting)).toBe(s);for(const seconds of [0,1,16,120,'15',null])expect(A.rest(s,seconds)).toBe(s);
 });
 it('does not let direct imported sessions or mutable snapshots alter trusted physics',()=>{
  const s=A.create();expect(Object.isFrozen(s)).toBe(true);expect(Object.isFrozen(s.state.pan.chemistry)).toBe(true);expect(()=>{s.state.pan.moisture=999;}).toThrow();
  const fake={...s,state:{...s.state,pan:{...s.state.pan,moisture:999}}};expect(A.begin(fake,'inspect')).toBe(fake);expect(A.demonstrateNext(fake)).toBe(fake);expect(()=>A.createRecord(fake)).toThrow();expect(A.create().state.pan.moisture).toBe(45);
 });
 it('reconstructs exact actual engine actions and receipts from only versioned committed intents',()=>{
  let s=A.create({mode:'independent'});s=doAction(s,'inspect',{method:'keyboard'});s=doAction(s,'pour',{source:'reduced',amountMl:20,method:'pointer'});s=doAction(s,'fold',{method:'pointer'});s=A.heat(s,1);s=A.rest(s,15,'keyboard');s=doAction(s,'inspect');
  const record=A.createRecord(s,{reflection:'The supplies began at different temperatures.'}),restored=A.restoreRecord(clone(record));expect(restored.state).toEqual(s.state);expect(restored.receipts).toEqual(s.receipts);expect(restored.reading).toEqual(s.reading);expect(restored.inspectionFresh).toBe(s.inspectionFresh);expect(A.createRecord(restored)).toEqual(record);
  expect(Object.keys(record)).toEqual(['protocol','activity','mode','intents','reflection']);expect(record).not.toHaveProperty('state');expect(record).not.toHaveProperty('receipts');expect(record).not.toHaveProperty('pending');
 });
 it('discards unfinished previews on save/restore and ignores externally supplied physical snapshots',()=>{
  const checked=doAction(A.create(),'inspect'),pending=ready(checked,'pour',{source:'plain',amountMl:60}),record=A.createRecord(pending);
  expect(record.intents).toHaveLength(1);const fake={...record,state:{pan:{moisture:999}},receipts:[{action:'plate'}],pending:{phase:'ready'},log:[{action:'panHeat',value:3}]},restored=A.restoreRecord(fake);
  expect(restored.state).toEqual(checked.state);expect(restored.pending).toBeNull();expect(restored.state.time).toBe(0);expect(restored.state.pot.plainWater).toBe(250);
 });
 it('preserves assistance provenance and refuses to relabel a saved demonstration or practice as independent',()=>{
  const practice=A.createRecord(sequence()),watch=A.createRecord(A.demonstrateNext(A.create({mode:'watch'})));
  expect(practice.intents.every(intent=>intent.mode==='practice'&&intent.actor==='learner')).toBe(true);expect(A.restoreRecord({...practice,mode:'independent'})).toBeNull();expect(A.restoreRecord({...watch,mode:'independent'})).toBeNull();
  const changed=clone(watch);changed.mode='independent';changed.intents[0].mode='independent';changed.intents[0].actor='learner';expect(A.restoreRecord(changed)).toBeNull();
  const wrongActor=clone(practice);wrongActor.intents[0].actor='demonstrator';expect(A.restoreRecord(wrongActor)).toBeNull();
 });
 it('rejects unsupported, malformed, reordered or over-limit records without partial restoration',()=>{
  const record=A.createRecord(sequence());const cases=[null,[],{}, {...record,protocol:2},{...record,activity:'future'},{...record,mode:'expert'},{...record,reflection:4},{...record,reflection:'a'.repeat(2001)},{...record,intents:null}];
  for(const modify of [r=>{r.intents[1].amountMl=15;},r=>{r.intents[1].source='saved';},r=>{r.intents[1].method='robot';},r=>{r.intents[0].kind='plate';},r=>{r.intents[1].action='pourPlain';},r=>{r.intents.reverse();},r=>{r.intents.push(r.intents[0]);},r=>{r.intents[0].mode='watch';}]){const r=clone(record);modify(r);cases.push(r);}
  for(const value of cases)expect(A.restoreRecord(value)).toBeNull();expect(()=>A.createRecord(sequence(),{reflection:4})).toThrow();expect(()=>A.createRecord(sequence(),{reflection:'a'.repeat(2001)})).toThrow();expect(A.createRecord(sequence(),{reflection:'a'.repeat(2000)}).reflection).toHaveLength(2000);
 });
 it('caps the notebook action record without truncation or further unrecorded engine changes',()=>{
  let s=A.create({mode:'independent'});for(let i=0;i<A.limit;i++)s=A.heat(s,i%4);expect(s.record.intents).toHaveLength(A.limit);expect(s.limitReached).toBe(true);expect(A.heat(s,0)).toBe(s);expect(A.rest(s,15)).toBe(s);expect(A.begin(s,'inspect')).toBe(s);
  const record=A.createRecord(s),restored=A.restoreRecord(record);expect(restored.state).toEqual(s.state);expect(restored.limitReached).toBe(true);expect(A.restoreRecord({...record,intents:record.intents.concat(record.intents[0])})).toBeNull();
 });
 it('preflights the engine clock boundary instead of staging a fold or wait that could only partly finish',()=>{
  let s=A.create({mode:'independent'});for(let i=0;i<59;i++)s=A.rest(s,60);for(let i=0;i<3;i++)s=A.rest(s,15);s=doAction(s,'fold');s=doAction(s,'fold');expect(s.state.time).toBe(3597);
  expect(A.begin(s,'fold')).toBe(s);expect(A.rest(s,15)).toBe(s);const checked=doAction(s,'inspect');expect(checked.state.time).toBe(3597);expect(checked.inspectionFresh).toBe(true);expect(A.restoreRecord(A.createRecord(checked)).state).toEqual(checked.state);
  let end=A.create({mode:'independent'});for(let i=0;i<60;i++)end=A.rest(end,60);expect(end.state.time).toBe(3600);expect(A.begin(end,'inspect')).toBe(end);expect(A.heat(end,0)).toBe(end);expect(A.rest(end,15)).toBe(end);expect(A.restoreRecord(A.createRecord(end)).state).toEqual(end.state);
 });
 it('refuses future models or changed baseline supplies instead of silently changing protocol 1',()=>{
  for(const [field,value]of [['thermalModel',4],['mixingModel',3],['sauceObservationModel',3],['sauceModel',4],['panModel',3]]){const model=injected({...R,startRescue(...args){const s=R.startRescue(...args);s[field]=value;return s;}});expect(()=>model.create()).toThrow(/no longer matches/);}
  for(const [field,value]of [['plainTemp',79],['reserveTemp',80],['plainWater',300],['reserveStarchG',5]]){const model=injected({...R,startRescue(...args){const s=R.startRescue(...args);s.pot[field]=value;return s;}});expect(()=>model.create()).toThrow(/no longer matches/);}
  const invalid=injected({...R,startRescue(...args){const s=R.startRescue(...args);s.pan.moisture=46;return s;}});expect(()=>invalid.create()).toThrow();expect(invalid.restoreRecord(A.createRecord(sequence()))).toBeNull();
  const changedIngredients=injected({...R,ingredients(s){return {...R.ingredients(s),produce:201};}});expect(()=>changedIngredients.create()).toThrow(/no longer matches/);
 });
 it('does not accept a changed mix duration as a valid completed character fold',()=>{
  const model=injected({...R,act(...args){const s=R.act(...args);if(args[1]==='stirSweep')s.log.at(-1).durationSeconds=7;return s;}});let s=model.create({mode:'independent'});s=model.begin(s,'fold');while(s.pending.phase!=='ready')s=model.advance(s,s.pending.token);expect(model.commit(s,s.pending.token)).toBe(s);expect(s.state.time).toBe(0);expect(s.record.intents).toEqual([]);
 });
 it('keeps ordinary recipe restoration and all existing cooking/history data outside the avatar protocol',()=>{
  let restoreCalls=0;const model=injected({...R,restore(){restoreCalls++;throw new Error('Do not restore ordinary recipes.');}});let s=model.create({mode:'watch'});for(let i=0;i<5;i++)s=model.demonstrateNext(s);const r=model.restoreRecord(model.createRecord(s));expect(r.state).toEqual(s.state);expect(restoreCalls).toBe(0);expect(R.startRescue('starchy',0,'practice').log).toEqual([]);
  expect(fs.readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_model.js','utf8')).toBe(fs.readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/recipe_lab_avatar_model.js','utf8'));
 });
});
