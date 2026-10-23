import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),A=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const source=fs.readFileSync(require.resolve('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),'utf8'),clone=v=>JSON.parse(JSON.stringify(v));
function injected(engine){const context={KitchenRecipes:engine,module:{exports:{}}};vm.runInNewContext(source,context);return context.module.exports;}
function stage(s,kind,options={}){let next=A.begin(s,kind,options);if(next===s)return next;while(next.pending.phase!=='ready')next=A.advance(next,next.pending.token);return next;}
function act(s,kind,options){const ready=stage(s,kind,options);if(ready===s)return s;return A.commit(ready,ready.pending.token);}
function share(s,plates=[0,1,0,1,0,1,0,1]){for(const plate of plates)s=act(s,'serve',{plate});return s;}
function minced(s){for(const clove of [0,0,0,1,1,1])s=act(s,'mince',{clove});return s;}

describe('Versioned avatar activity catalogue',()=>{
 it('adds two distinct activities while keeping the default sauce protocol and API ID',()=>{
  expect(A.activity).toBe('avatar-sauce-rescue');expect(A.protocol).toBe(1);expect(A.protocols).toEqual([1,2]);expect(A.activities.map(a=>a.id)).toEqual(['avatar-sauce-rescue','garlic-preparation','portion-and-plate','tomato-texture','surface-drying','pasta-weighing','reserve-and-drain','mushroom-turning','cover-and-check-pasta','cool-and-fold-sauce','separate-and-check-pasta','precision-mushroom-cuts','space-mushrooms','rinse-and-dry-produce','preheat-and-load-mushrooms','finish-pasta-in-sauce','hold-and-recheck-sauce']);
  expect(A.create().protocol).toBe(1);for(const id of ['garlic-preparation','portion-and-plate']){expect(A.getActivity(id).protocol).toBe(2);expect(A.create({activity:id}).protocol).toBe(2);expect(Object.isFrozen(A.getActivity(id).phases)).toBe(true);}
  expect(A.getActivity('future')).toBeNull();expect(()=>A.create({activity:'future'})).toThrow();expect(()=>A.create({activity:null})).toThrow();
 });
 it('provides clean hands by a canonical setup action and leaves both real cloves whole',()=>{
  const s=A.create({activity:'garlic-preparation'}),expected=R.act(R.start('mushroom',2,'practice'),'wash',undefined,'select');expect(s.state).toEqual(expected);expect(s.state.time).toBe(0);expect(s.setup).toMatchObject({id:'whole-garlic-clean-hands-v1',provided:true,clockAtStart:0});
  expect(s.setup.actions).toEqual([{action:'wash',value:null,interaction:'select'}]);expect(s.record.intents).toEqual([]);expect(s.receipts).toEqual([]);expect(s.reading).toBeNull();expect(R.garlicPreparation(s.state).cloves.map(c=>c.texture)).toEqual(['whole','whole']);
 });
 it('records every garlic pass as exactly one canonical whole-to-sliced-to-chopped-to-minced transition',()=>{
  let s=A.create({activity:'garlic-preparation'}),expected=s.state;const snapshots=[];
  for(const clove of [0,0,0,1,1,1]){s=act(s,'mince',{clove,method:'pointer'});expected=R.act(expected,'minceGarlic',clove,'scene-mince');expect(s.state).toEqual(expected);snapshots.push(s.lastReceipt.after.garlicPreparation.cloves.map(c=>c.stage));expect(s.state.time).toBe(0);expect(s.lastReceipt.durationSeconds).toBe(0);expect(s.lastReceipt.inspection).toBeNull();}
  expect(snapshots).toEqual([[1,0],[2,0],[3,0],[3,1],[3,2],[3,3]]);expect(s.guide.complete).toBe(true);expect(s.state.prep.garlic).toBe(true);expect(s.record.intents).toHaveLength(6);expect(s.state.log).toHaveLength(7);expect(A.canBegin(s,'mince',{clove:0})).toBe(false);
  expect(s.receipts[0].before.garlicPreparation.cloves[0].stage).toBe(0);expect(s.receipts[0].after.garlicPreparation.cloves[0].stage).toBe(1);expect(s.receipts[0].engineLogIndex).toBe(1);expect(s.receipts[5].engineLogIndex).toBe(6);
 });
 it('lets practice and independent learners choose either unfinished clove and rejects unavailable actions',()=>{
  for(const mode of ['practice','independent']){let s=A.create({activity:'garlic-preparation',mode});s=act(s,'mince',{clove:1,method:'keyboard'});expect(s.state.log.at(-1)).toMatchObject({action:'minceGarlic',value:1,interaction:'keyboard'});expect(s.guide.clove).toBe(0);
   for(const bad of [-1,2,.5,'0',null,undefined])expect(A.begin(s,'mince',{clove:bad})).toBe(s);for(const kind of ['inspect','pour','fold','serve','return','finish'])expect(A.begin(s,kind,{source:'plain',amountMl:60,plate:0})).toBe(s);
   expect(A.rest(s,15)).toBe(s);expect(A.heat(s,1)).toBe(s);s=act(s,'mince',{clove:1});s=act(s,'mince',{clove:1});expect(A.begin(s,'mince',{clove:1})).toBe(s);expect(R.garlicPreparation(s.state).cloves[0].stage).toBe(0);
  }
 });
 it('makes each new tool preview reversible without modifying the supplied dish or preparation record',()=>{
  const garlic=A.create({activity:'garlic-preparation'}),dish=A.create({activity:'portion-and-plate',mode:'independent'}),one=act(dish,'serve',{plate:0}),full=share(dish);
  for(const [initial,kind,options]of [[garlic,'mince',{clove:0}],[dish,'serve',{plate:0}],[one,'return',{plate:0}],[full,'finish',{}]])for(let count=0;count<A.phases[kind].length;count++){
   let s=A.begin(initial,kind,options);expect(s.pending).not.toBeNull();for(let i=0;i<count;i++)s=A.advance(s,s.pending.token);expect(s.state).toBe(initial.state);expect(s.record).toBe(initial.record);expect(s.receipts).toBe(initial.receipts);const canceled=A.cancel(s,s.pending.token);expect(canceled.state).toBe(initial.state);expect(canceled.pending).toBeNull();expect(A.createRecord(canceled)).toEqual(A.createRecord(initial));
  }
 });
 it('shows each garlic Watch movement before committing one demonstrator pass and preserves assistance provenance',()=>{
  let s=A.create({activity:'garlic-preparation',mode:'watch'});expect(A.begin(s,'mince',{clove:0})).toBe(s);
  for(let pass=0;pass<6;pass++){const before=s;let preview=A.beginDemonstration(s);expect(preview.pending.clove).toBe(pass<3?0:1);while(preview.pending.phase!=='ready'){expect(preview.state).toBe(before.state);preview=A.advance(preview,preview.pending.token);}s=A.commit(preview,preview.pending.token);expect(s.record.intents.at(-1)).toMatchObject({activity:'garlic-preparation',actor:'demonstrator',method:'demonstrator',mode:'watch'});}
  expect(s.guide.complete).toBe(true);expect(R.garlicPreparation(s.state).complete).toBe(true);expect(A.demonstrateNext(s)).toBe(s);
 });
 it('provides the plating dish from the recorded canonical sauce setup and excludes supplied preparation from learner actions',()=>{
  const s=A.create({activity:'portion-and-plate'});let expected=R.startRescue('starchy',0,'practice');for(const entry of s.setup.actions)expected=R.act(expected,entry.action,entry.value===null?undefined:entry.value,entry.interaction);
  expect(s.state).toEqual(expected);expect(s.state.time).toBe(12);expect(s.setup).toMatchObject({id:'checked-mushroom-eight-portions-v1',provided:true,clockAtStart:12});expect(s.setup.actions).toHaveLength(5);expect(s.record.intents).toEqual([]);expect(s.receipts).toEqual([]);expect(s.reading).toBeNull();expect(R.serving(s.state)).toMatchObject({ready:true,total:8,served:0,remaining:8,plates:[0,0]});
  expect(R.sauceChemistry(s.state).type).toBe('coating');expect(s.state.log.filter(e=>e.inspection)).toHaveLength(2);
 });
 it('prevents the engine automatic-plating shortcut and requires the actual eight spoon transfers',()=>{
  let s=A.create({activity:'portion-and-plate'});expect(R.act(s.state,'plate').plated).toBe(true);expect(A.canBegin(s,'finish')).toBe(false);expect(A.begin(s,'finish')).toBe(s);
  for(let i=0;i<7;i++)s=act(s,'serve',{plate:i%2});expect(A.begin(s,'finish')).toBe(s);s=act(s,'serve',{plate:1});expect(A.canBegin(s,'finish')).toBe(true);const done=act(s,'finish');expect(done.state.plated).toBe(true);expect(done.record.intents.map(i=>i.kind)).toEqual(['serve','serve','serve','serve','serve','serve','serve','serve','finish']);expect(done.state.log).toHaveLength(14);
 });
 it('conserves the finite portion count on every actual carry and return without reinterpreting whole-dish water as remaining-pan volume',()=>{
  const initial=A.create({activity:'portion-and-plate',mode:'independent'});let s=initial;
  for(const plate of [0,0,0,1,1]){s=act(s,'serve',{plate,method:'pointer'});const p=R.serving(s.state);expect(p.remaining+p.served).toBe(8);expect(s.state.pan).toEqual(initial.state.pan);expect(s.state.pot).toEqual(initial.state.pot);expect(s.state.time).toBe(12);expect(s.lastReceipt.transfer).toMatchObject({from:'pan',to:'plate '+(plate+1),spoonfuls:1});expect(s.lastReceipt.after).not.toHaveProperty('freeWaterMl');}
  s=act(s,'return',{plate:0});expect(R.serving(s.state)).toMatchObject({plates:[2,2],remaining:4,served:4});expect(s.lastReceipt.transfer).toEqual({from:'plate 1',to:'pan',spoonfuls:1});expect(s.lastReceipt.before.serving.plates).toEqual([3,2]);expect(s.lastReceipt.after.serving.plates).toEqual([2,2]);
 });
 it('lets guided practice correct an uneven distribution before an equal-share finish',()=>{
  let s=share(A.create({activity:'portion-and-plate'}),[0,0,0,0,0,1,1,1]);expect(R.serving(s.state)).toMatchObject({plates:[5,3],remaining:0,balanced:false});expect(s.guide).toMatchObject({kind:'return',plate:0,index:8,complete:false});expect(A.begin(s,'finish')).toBe(s);
  s=act(s,'return',{plate:0});expect(s.guide.kind).toBe('serve');expect(s.guide.plate).toBe(1);s=act(s,'serve',{plate:1});expect(s.guide.kind).toBe('finish');s=act(s,'finish');expect(R.serving(s.state).plates).toEqual([4,4]);expect(s.guide.complete).toBe(true);
 });
 it('allows an independent unequal final distribution while recording its actual counts rather than claiming equality',()=>{
  let s=share(A.create({activity:'portion-and-plate',mode:'independent'}),Array(8).fill(0));expect(R.serving(s.state).balanced).toBe(false);expect(A.canBegin(s,'finish')).toBe(true);s=act(s,'finish');expect(s.state.plated).toBe(true);expect(s.guide.complete).toBe(true);expect(s.guide.label).toContain('unequal');expect(s.lastReceipt.after.serving).toMatchObject({plates:[8,0],balanced:false});
 });
 it('locks all portion tools after finishing despite the base serving helper still reporting ready',()=>{
  const s=act(share(A.create({activity:'portion-and-plate',mode:'independent'})),'finish');expect(R.serving(s.state).ready).toBe(true);for(const kind of ['serve','return','finish']){expect(A.canBegin(s,kind,{plate:0})).toBe(false);expect(A.begin(s,kind,{plate:0})).toBe(s);}expect(A.rest(s,15)).toBe(s);expect(A.heat(s,1)).toBe(s);
 });
 it('uses Watch to alternate real plate targets and finish only after eight modeled spoonfuls',()=>{
  let s=A.create({activity:'portion-and-plate',mode:'watch'});for(let step=0;step<9;step++){expect(s.guide.kind).toBe(step===8?'finish':'serve');if(step<8)expect(s.guide.plate).toBe(step%2);s=A.demonstrateNext(s);expect(s.record.intents.at(-1).actor).toBe('demonstrator');}
  expect(s.state.plated).toBe(true);expect(R.serving(s.state).plates).toEqual([4,4]);expect(s.state.time).toBe(12);expect(s.record.intents).toHaveLength(9);expect(s.receipts.every(r=>r.durationSeconds===0)).toBe(true);
 });
 it('rejects empty plate returns, nonexistent targets, exhausted batches and unrelated sauce controls',()=>{
  let s=A.create({activity:'portion-and-plate',mode:'independent'});expect(A.begin(s,'return',{plate:0})).toBe(s);for(const plate of [-1,2,.5,'0',null,undefined])expect(A.begin(s,'serve',{plate})).toBe(s);
  for(const kind of ['inspect','pour','fold','mince'])expect(A.begin(s,kind,{source:'plain',amountMl:60,clove:0})).toBe(s);expect(A.heat(s,0)).toBe(s);expect(A.rest(s,15)).toBe(s);s=share(s);expect(A.begin(s,'serve',{plate:0})).toBe(s);expect(A.canBegin(s,'return',{plate:0})).toBe(true);
 });
 it('checks tool availability without allocating previews or tokens and rejects stale tokens across activities',()=>{
  const garlic=A.create({activity:'garlic-preparation'}),preview=A.begin(garlic,'mince',{clove:0}),token=preview.pending.token;for(let i=0;i<20;i++)expect(A.canBegin(garlic,'mince',{clove:0})).toBe(true);
  const dish=A.create({activity:'portion-and-plate'}),other=A.begin(dish,'serve',{plate:0});expect(other.pending.token).toBe(token+1);expect(A.advance(other,token)).toBe(other);expect(A.cancel(other,token)).toBe(other);expect(A.commit(other,token)).toBe(other);expect(A.canBegin(other,'return',{plate:0})).toBe(false);
 });
 it('round-trips new activity records exactly and restores only committed activity-specific intents',()=>{
  for(const session of [minced(A.create({activity:'garlic-preparation'})),act(share(A.create({activity:'portion-and-plate'})),'finish')]){
   const record=A.createRecord(session,{reflection:'Explain the observed preparation and counts.'}),restored=A.restoreRecord(clone(record));expect(record.protocol).toBe(2);expect(record.activity).toBe(session.activity);expect(restored.state).toEqual(session.state);expect(restored.setup).toEqual(session.setup);expect(restored.receipts).toEqual(session.receipts);expect(restored.guide).toEqual(session.guide);expect(A.createRecord(restored)).toEqual(record);expect(record.intents.every(i=>i.activity===record.activity&&i.mode===record.mode)).toBe(true);
   expect(record).not.toHaveProperty('state');expect(record).not.toHaveProperty('setup');expect(record).not.toHaveProperty('receipts');
  }
  const pending=stage(A.create({activity:'garlic-preparation'}),'mince',{clove:1}),record=A.createRecord(pending),restored=A.restoreRecord({...record,state:{prep:{garlic:true}},setup:{actions:[]},pending:{phase:'ready'},log:[{action:'garlicPrep'}]});expect(restored.pending).toBeNull();expect(R.garlicPreparation(restored.state).passes).toBe(0);expect(restored.state.log).toHaveLength(1);
 });
 it('rejects protocol, activity, assistance and intent relabeling instead of importing fabricated state',()=>{
  const record=A.createRecord(minced(A.create({activity:'garlic-preparation'})));for(const altered of [{...record,protocol:1},{...record,protocol:3},{...record,activity:'avatar-sauce-rescue'},{...record,activity:'portion-and-plate'},{...record,mode:'independent'},{...record,reflection:3},{...record,intents:null}])expect(A.restoreRecord(altered)).toBeNull();
  for(const mutate of [r=>{r.intents[0].activity='portion-and-plate';},r=>{r.intents[0].clove='0';},r=>{r.intents[0].actor='demonstrator';},r=>{r.intents[0].method='robot';},r=>{r.intents[0].action='garlicPrep';},r=>{r.intents.push(r.intents[0]);}]){const r=clone(record);mutate(r);expect(A.restoreRecord(r)).toBeNull();}
  const watch=A.createRecord(A.demonstrateNext(A.create({activity:'garlic-preparation',mode:'watch'})));expect(A.restoreRecord({...watch,mode:'independent'})).toBeNull();
 });
 it('caps repeated independent corrections and restores the full bounded record without truncating',()=>{
  let s=A.create({activity:'portion-and-plate',mode:'independent'});for(let i=0;i<48;i++){s=act(s,'serve',{plate:0});s=act(s,'return',{plate:0});}expect(s.record.intents).toHaveLength(96);expect(s.limitReached).toBe(true);expect(A.begin(s,'serve',{plate:1})).toBe(s);expect(A.restoreRecord(A.createRecord(s)).state).toEqual(s.state);
  const record=A.createRecord(s);expect(A.restoreRecord({...record,intents:record.intents.concat(record.intents[0])})).toBeNull();
 });
 it('guards supplied setups against future ingredient counts, model flags and elapsed-time changes',()=>{
  const ingredients=injected({...R,ingredients(s){return {...R.ingredients(s),garlic:3};}});expect(()=>ingredients.create({activity:'garlic-preparation'})).toThrow();
  const flags=injected({...R,start(...args){const s=R.start(...args);s.mixingModel=3;return s;}});expect(()=>flags.create({activity:'garlic-preparation'})).toThrow();
  const washTime=injected({...R,act(...args){const s=R.act(...args);if(args[1]==='wash')s.time=20;return s;}});expect(()=>washTime.create({activity:'garlic-preparation'})).toThrow();
  const foldTime=injected({...R,act(...args){const s=R.act(...args);if(args[1]==='stirSweep')s.time++;return s;}});expect(()=>foldTime.create({activity:'portion-and-plate'})).toThrow();
 });
 it('keeps new and legacy physical data outside ordinary save restoration and mirrors the expanded model',()=>{
  let calls=0;const model=injected({...R,restore(){calls++;throw new Error('No ordinary save import.');}});for(const activity of ['garlic-preparation','portion-and-plate']){let s=model.create({activity,mode:'watch'});while(!s.guide.complete)s=model.demonstrateNext(s);expect(model.restoreRecord(model.createRecord(s)).state).toEqual(s.state);}expect(calls).toBe(0);
  expect(fs.readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_model.js','utf8')).toBe(fs.readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/recipe_lab_avatar_model.js','utf8'));
 });
});
