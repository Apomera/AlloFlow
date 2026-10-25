import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),A=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const source=fs.readFileSync(require.resolve('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),'utf8');
function fresh(activity='avatar-sauce-rescue',mode='independent',model=A){return model.create({activity,mode});}
function stage(s,kind,options={},model=A){let n=model.begin(s,kind,options);if(n===s)return s;while(n.pending.phase!=='ready')n=model.advance(n,n.pending.token);return n;}
function act(s,kind,options={},model=A){const ready=stage(s,kind,options,model);return ready===s?s:model.commit(ready,ready.pending.token);}
function watched(activity,model=A){let s=fresh(activity,'watch',model);for(let i=0;!s.guide.complete&&i<96;i++){const next=model.demonstrateNext(s);if(next===s)throw new Error('Watch did not advance: '+activity);s=next;}return s;}
function quantity(view,id){return view.quantities.find(row=>row.id===id);}
function read(facts,path){return path.split('.').reduce((value,key)=>value===null||value===undefined?null:value[key],facts);}
function injected(engine){const context={KitchenRecipes:engine,module:{exports:{}}};vm.runInNewContext(source,context);return context.module.exports;}

describe('Chef action notebook: committed evidence without recooking',()=>{
 it('requires an authenticated session and accepts only a valid 1-based action number',()=>{
  const empty=fresh(),s=act(empty,'inspect');
  for(const bad of [null,undefined,{},s.state,{...s},A.createRecord(s),JSON.parse(JSON.stringify(s))]){expect(A.actionTimeline(bad)).toBeNull();expect(A.actionReview(bad)).toBeNull();}
  expect(A.actionTimeline(empty)).toEqual({activity:'avatar-sauce-rescue',mode:'independent',count:0,limit:96,entries:[]});expect(A.actionReview(empty)).toBeNull();
  for(const index of [0,-1,2,.5,'1',NaN,Infinity,null])expect(A.actionReview(s,index)).toBeNull();expect(A.actionReview(s)).toEqual(A.actionReview(s,1));
 });
 it('keeps same-clock releases separate and records the real actor, method and duration',()=>{
  let s=act(fresh(),'inspect',{method:'keyboard'});s=act(s,'pour',{source:'plain',amountMl:20,method:'pointer'});s=act(s,'fold',{method:'button'});
  const timeline=A.actionTimeline(s);expect(timeline.count).toBe(3);expect(timeline.entries.map(e=>[e.actionNumber,e.startedAt,e.endedAt,e.durationSeconds,e.actor,e.method,e.observationKind])).toEqual([[1,0,0,0,'learner','keyboard','sauce'],[2,0,0,0,'learner','pointer',null],[3,0,6,6,'learner','button',null]]);
  expect(A.actionReview(s).actionNumber).toBe(3);expect(A.actionReview(s).label).toBe('Fold the sauce');
 });
 it('compares actual sauce quantities while keeping a pour separate from an inspection',()=>{
  let s=act(fresh(),'inspect');s=act(s,'pour',{source:'reduced',amountMl:50});const v=A.actionReview(s);
  expect(quantity(v,'freeWaterMl')).toMatchObject({before:45,after:95,delta:50,changed:true,unit:'mL'});expect(quantity(v,'reducedRemainingMl')).toMatchObject({before:150,after:100,delta:-50});expect(quantity(v,'starchG')).toMatchObject({before:3,after:5,delta:2});expect(quantity(v,'pendingMl')).toMatchObject({before:0,after:50,delta:50});expect(v.observation).toBeNull();expect(v.observationStatus).toBe('not-recorded');expect(v.details.join(' ')).toContain('2 g of starch');expect(v.previousObservationAction).toBe(1);
 });
 it('records unchanged values explicitly and preserves real zero changes',()=>{
  const s=act(fresh(),'inspect'),v=A.actionReview(s);expect(v.quantities.every(row=>row.before===row.after&&row.delta===0&&!row.changed)).toBe(true);expect(quantity(v,'heat')).toMatchObject({before:0,after:0,delta:0,changed:false});expect(v.observationStatus).toBe('recorded');expect(v.observation).toMatchObject({kind:'sauce',label:'Thick and sticky',time:0});
 });
 it('shows cooling, water use and mixing from a fold without manufacturing a new coating observation',()=>{
  let s=act(fresh('hold-and-recheck-sauce'),'pour',{source:'reduced',amountMl:20});s=act(s,'fold');const v=A.actionReview(s);
  expect(v.durationSeconds).toBe(6);expect(quantity(v,'freeWaterMl').delta).toBeLessThan(0);expect(quantity(v,'pendingMl').delta).toBeLessThan(0);expect(quantity(v,'holding.absorbedWaterMl').delta).toBeGreaterThan(0);expect(quantity(v,'holding.evaporatedWaterMl').delta).toBeGreaterThan(0);expect(v.observation).toBeNull();expect(JSON.stringify(v)).not.toMatch(/pastaProgress|pastaTexture|viscosity|dispersion/);
 });
 it('does not turn a wait or burner adjustment into a new sample, including protocol 1 rest and heat',()=>{
  let s=act(fresh(),'inspect');s=A.heat(s,3);s=A.rest(s,30);const heat=A.actionReview(s,2),wait=A.actionReview(s,3);
  expect(heat).toMatchObject({label:'Set the pan burner to 3',startedAt:0,endedAt:0,durationSeconds:0,observationStatus:'not-recorded'});expect(quantity(heat,'heat')).toMatchObject({before:0,after:3,delta:3});expect(wait).toMatchObject({label:'Wait 30 kitchen seconds',startedAt:0,endedAt:30,durationSeconds:30,observation:null,previousObservationAction:1});expect(wait.details.join(' ')).toContain('without recording a new spoon check');
 });
 it('links real observations in either direction while retaining their historical labels',()=>{
  let s=act(fresh('hold-and-recheck-sauce'),'inspect');const old=A.actionReview(s,1).observation;s=act(s,'pour',{source:'reduced',amountMl:20});s=act(s,'fold');s=act(s,'inspect');s=act(s,'waitPan',{seconds:60});s=act(s,'inspect');
  expect(A.actionReview(s,1)).toMatchObject({previousObservationAction:null,nextObservationAction:4,observation:old});expect(A.actionReview(s,4)).toMatchObject({previousObservationAction:1,nextObservationAction:6});expect(A.actionReview(s,5)).toMatchObject({previousObservationAction:4,nextObservationAction:6,observation:null});expect(A.actionReview(s,6)).toMatchObject({previousObservationAction:4,nextObservationAction:null});
 });
 it('retains exact old evidence after later cooking instead of interpreting it as a live result',()=>{
  let s=act(fresh('hold-and-recheck-sauce'),'inspect');const first=A.actionReview(s,1);s=act(s,'setPanHeat',{setting:3});s=act(s,'waitPan',{seconds:60});s=act(s,'waitPan',{seconds:60});
  expect(A.actionReview(s,1)).toEqual(first);expect(A.actionReview(s).observation).toBeNull();expect(A.actionReview(s,1).observation.details.join(' ')).toContain('Tender with a slight bite');expect(A.actionReview(s).details.join(' ')).not.toContain('Tender with a slight bite');
 });
 it('reads pasta texture only from an actual committed sample and suppresses hidden progress between samples',()=>{
  let s=act(fresh('cover-and-check-pasta'),'samplePasta');const reading=A.actionReview(s).observation;s=act(s,'waitPot',{seconds:60});const interval=A.actionReview(s);s=act(s,'samplePasta');
  expect(reading).toMatchObject({kind:'pasta',label:'Still firm',time:480});expect(interval).toMatchObject({durationSeconds:60,observation:null});expect(JSON.stringify(interval)).not.toMatch(/progress|range|coreFraction|compression|Still firm|Tender/);expect(A.actionReview(s).observation.kind).toBe('pasta');expect(A.actionReview(s).previousObservationAction).toBe(1);
 });
 it('keeps a supplied sauce check out of the serving timeline and uses exact finite spoonful counts',()=>{
  let s=fresh('portion-and-plate');expect(s.state.log.some(e=>e.inspection)).toBe(true);expect(A.actionTimeline(s).entries).toEqual([]);s=act(s,'serve',{plate:0});const served=A.actionReview(s);s=act(s,'return',{plate:0});const returned=A.actionReview(s);
  expect(served).toMatchObject({startedAt:12,endedAt:12,observation:null,previousObservationAction:null});expect(quantity(served,'serving.remaining')).toMatchObject({before:8,after:7,delta:-1});expect(quantity(served,'serving.plates.0')).toMatchObject({before:0,after:1,delta:1});expect(quantity(returned,'serving.remaining')).toMatchObject({before:7,after:8,delta:1});expect(quantity(returned,'serving.plates.0').after).toBe(0);expect(returned.details.join(' ')).toContain('plate 1 → pan');
 });
 it('keeps initial unknown rinse water unknown instead of counting an invented zero-to-30 measurement',()=>{
  const s=act(fresh('rinse-and-dry-produce'),'rinseProduce'),v=A.actionReview(s);
  expect(quantity(v,'rinsing.surfaceWaterMl')).toMatchObject({before:null,after:30,delta:null,changed:true});expect(quantity(v,'rinsing.wrungWaterMl')).toMatchObject({before:null,after:0,delta:null});expect(quantity(v,'rinsing.clothWaterMl')).toMatchObject({before:0,after:0,delta:0});expect(v.details.join(' ')).toContain('Faucet use was not measured');expect(v.observation).toBeNull();
 });
 it('distinguishes a finite actual water transfer from its planned maximum without duplicate generic claims',()=>{
  let s=act(fresh('reserve-and-drain'),'samplePasta');for(let i=0;i<3;i++)s=act(s,'drainPasta',{amountMl:250});s=act(s,'drainPasta',{amountMl:250});s=act(s,'reserveWater');const v=A.actionReview(s),transfer=s.lastReceipt.waterTransfer;
  expect(transfer.actualMl).toBeCloseTo(20,6);expect(transfer.requestedMl).toBe(50);expect(v.details).toHaveLength(2);expect(v.details[0]).toContain('20 mL actually moved');expect(v.details[0]).toContain('maximum was 50 mL');expect(v.details.join(' ')).not.toMatch(/undefined|null|NaN/);expect(v.observation).toBeNull();
 });
 it('keeps an empty pot temperature unavailable when draining the last water',()=>{
  let s=watched('reserve-and-drain');const v=A.actionReview(s),row=quantity(v,'drainage.potTemperature');expect(row.after).toBeNull();expect(row.delta).toBeNull();expect(v.observation).toBeNull();expect(v.details.join(' ')).not.toContain('undefined');
 });
 it('charges finishing evaporation only since the supplied setup and labels dry-weight transfer honestly',()=>{
  const s=act(fresh('finish-pasta-in-sauce'),'combinePasta'),v=A.actionReview(s);expect(s.lastReceipt.before.finishing.evaporatedWaterMl).toBeGreaterThan(200);expect(quantity(v,'finishing.evaporatedSinceStartMl').before).toBe(0);expect(quantity(v,'finishing.evaporatedSinceStartMl').delta).toBeCloseTo(s.lastReceipt.pastaTransfer.evaporatedWaterMl,10);expect(v.details.join(' ')).toContain('160 g dry-weight equivalent');expect(v.details.join(' ')).toContain('Cooked mass is not modeled');expect(v.observation).toBeNull();
 });
 it('records only the face revealed by an actual turn and never publishes the hidden face state',()=>{
  let s=act(fresh('mushroom-turning'),'turnMushroom',{piece:0});const v=A.actionReview(s);expect(v.observation).toMatchObject({kind:'mushroom-face',label:'Face A · golden',time:195});expect(v.observation.description).toContain('mushroom 1');expect(v.quantities.filter(row=>row.id.includes('visible')).map(row=>row.id)).toEqual(['browning.visible.pale','browning.visible.golden','browning.visible.dark','browning.visible.scorched']);expect(JSON.stringify(v)).not.toMatch(/topBrowning|topDamage|revealedFace|faces\[|\.damage/);s=act(s,'waitPan',{seconds:60});expect(A.actionReview(s).observation).toBeNull();
 });
 it('retains a failed recorded cutting result instead of changing it to a successful finish',()=>{
  let s=act(fresh('precision-mushroom-cuts'),'sliceProduce',{piece:0,cutMm:1});const cut=A.actionReview(s);s=act(s,'finishCuts');const v=A.actionReview(s);expect(cut.observation).toBeNull();expect(cut.details.join(' ')).toContain('40 mm → 1 mm + 39 mm');expect(v.observation).toMatchObject({kind:'cut-profile',description:'1, 39 mm.'});expect(v.observation.details.join(' ')).toContain('do not meet');expect(quantity(v,'cutting.totalMm')).toMatchObject({before:40,after:40,delta:0});
 });
 it('omits unfinished, canceled and duplicate releases from every notebook view',()=>{
  const original=act(fresh(),'inspect'),timeline=A.actionTimeline(original),review=A.actionReview(original);for(const [kind,options]of [['inspect',{}],['pour',{source:'plain',amountMl:20}],['fold',{}]])for(let i=0;i<A.phases[kind].length;i++){let s=A.begin(original,kind,options);const token=s.pending.token;for(let j=0;j<i;j++)s=A.advance(s,token);expect(A.actionTimeline(s)).toEqual(timeline);expect(A.actionReview(s)).toEqual(review);s=A.cancel(s,token);expect(A.actionTimeline(s)).toEqual(timeline);expect(A.actionReview(s)).toEqual(review);}const ready=stage(original,'fold'),s=A.commit(ready,ready.pending.token),duplicate=A.commit(s,ready.pending.token);expect(A.actionTimeline(duplicate)).toEqual(A.actionTimeline(s));
 });
 it('keeps demonstrator evidence attributed to the demonstrator',()=>{
  const s=watched('hold-and-recheck-sauce'),timeline=A.actionTimeline(s);expect(timeline.mode).toBe('watch');expect(timeline.entries.every(e=>e.actor==='demonstrator'&&e.method==='demonstrator')).toBe(true);expect(A.actionReview(s).actor).toBe('demonstrator');expect(A.actionReview(s).observationStatus).toBe('recorded');
 });
 it('rebuilds views from committed intents while ignoring forged imported notebook evidence',()=>{
  const s=watched('finish-pasta-in-sauce'),record=A.createRecord(s),restored=A.restoreRecord({...record,actionTimeline:{count:999},actionReview:{observation:{label:'invented'}},receipts:[{index:1,inspection:{kind:'sauce',label:'invented'}}]});expect(A.actionTimeline(restored)).toEqual(A.actionTimeline(s));expect(A.actionReview(restored)).toEqual(A.actionReview(s));expect(A.createRecord(restored)).toEqual(record);
 });
 it('returns detached deeply frozen views with no engine work or session mutation',()=>{
  let calls=0;const engine={...R};for(const key of ['act','inspect','mixing','sauceChemistry','serving','panSurface'])engine[key]=(...args)=>{calls++;return R[key](...args);};const B=injected(engine),s=watched('hold-and-recheck-sauce',B),before=JSON.stringify(s);calls=0;const timeline=B.actionTimeline(s),v=B.actionReview(s,1);expect(calls).toBe(0);expect(JSON.stringify(s)).toBe(before);expect(Object.isFrozen(timeline.entries[0])).toBe(true);expect(Object.isFrozen(v.quantities[0])).toBe(true);expect(Object.isFrozen(v.observation.details)).toBe(true);expect(v.observation).not.toBe(s.receipts[0].inspection);expect(()=>{v.quantities[0].after=999;}).toThrow();expect(()=>{v.observation.details.push('invented');}).toThrow();
 });
 it('stays bounded at the 96-action limit and does not depend on replaying any prefix',()=>{
  let s=fresh();for(let i=0;i<96;i++)s=act(s,'inspect');const timeline=A.actionTimeline(s);expect(timeline.count).toBe(96);expect(timeline.entries.at(-1).actionNumber).toBe(96);expect(A.actionReview(s,96)).toMatchObject({previousObservationAction:95,nextObservationAction:null});expect(A.actionReview(s,97)).toBeNull();expect(A.actionTimeline(act(s,'inspect'))).toEqual(timeline);
 });
 for(const activity of A.activities)it('uses finite allowed receipt fields and preserves the completed '+activity.id+' attempt',()=>{
  const s=watched(activity.id),snapshot=JSON.stringify(s),record=A.createRecord(s),timeline=A.actionTimeline(s);expect(s.guide.complete).toBe(true);expect(timeline.entries).toHaveLength(s.receipts.length);
  for(const receipt of s.receipts){const v=A.actionReview(s,receipt.index);expect(v.quantities.length).toBeGreaterThan(0);expect(v.quantities.length).toBeLessThanOrEqual(8);expect(v.startedAt).toBe(receipt.before.time);expect(v.endedAt).toBe(receipt.after.time);expect(v.endedAt-v.startedAt).toBe(v.durationSeconds);expect(v.quantities.map(row=>row.id)).not.toEqual(expect.arrayContaining(['progress','pastaProgress','pastaTexture','damage']));for(const row of v.quantities){const before=read(receipt.before,row.id),after=read(receipt.after,row.id);expect(row.before).toBe(typeof before==='number'?before:null);expect(row.after).toBe(typeof after==='number'?after:null);expect(row.delta).toBe(row.before===null||row.after===null?null:row.after-row.before);}expect(JSON.stringify(v)).not.toMatch(/undefined|NaN|Infinity/);}
  expect(JSON.stringify(s)).toBe(snapshot);expect(A.createRecord(s)).toEqual(record);expect(A.actionTimeline(A.restoreRecord(record))).toEqual(timeline);
 });
});
