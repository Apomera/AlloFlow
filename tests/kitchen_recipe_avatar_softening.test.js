import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),A=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const source=fs.readFileSync(require.resolve('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),'utf8'),clone=value=>JSON.parse(JSON.stringify(value)),id='soften-and-press-tomatoes';
const fresh=(mode='independent',model=A)=>model.create({activity:id,mode});
function injected(engine){const context={KitchenRecipes:engine,module:{exports:{}}};vm.runInNewContext(source,context);return context.module.exports;}
function stage(s,kind,options={},model=A){let p=model.begin(s,kind,options);if(p===s)return s;while(p.pending.phase!=='ready')p=model.advance(p,p.pending.token);return p;}
function act(s,kind,options={},model=A){const p=stage(s,kind,options,model);return p===s?s:model.commit(p,p.pending.token);}
function cook(s=fresh(),model=A){s=act(s,'setPanHeat',{setting:2},model);for(let i=0;i<5;i++)s=act(s,'waitPan',{seconds:60},model);return act(s,'waitPan',{seconds:30},model);}
function pressPair(s=cook(),pieces=[0,1],model=A){for(const piece of pieces)for(let i=0;i<2;i++)s=act(s,'press',{piece},model);return s;}
function finish(s=pressPair(),model=A){s=act(s,'fold',{},model);return act(s,'setPanHeat',{setting:0},model);}
function replay(s,model=A){const restored=model.restoreRecord(model.createRecord(s));expect(restored).not.toBeNull();for(const key of['state','setup','reading','inspectionFresh','record','receipts','guide'])expect(restored[key]).toEqual(s[key]);expect(model.softening(restored)).toEqual(model.softening(s));return restored;}

describe('Raw tomatoes soften before a recorded press can change their texture',()=>{
 it('rebuilds a cold canonical supplied pan without learner checks or credited preparation',()=>{
  const s=fresh();let expected=R.start('tomato',2,'practice');for(const action of['wash','rinse','cut','oil','produce'])expected=R.act(expected,action,undefined,'select');expect(s.state).toEqual(expected);expect(s.setup).toMatchObject({id:'raw-tomato-pan-finite-juice-v1',provided:true,clockAtStart:0,produceGrams:300,pieceCount:14,startingFreeWaterMl:250,startingRetainedJuiceMl:60,waterBudgetMl:310,requiredCrushedPieces:2});expect(s.record.intents).toEqual([]);expect(s.receipts).toEqual([]);expect(s.reading).toBeNull();expect(s.inspectionFresh).toBe(false);expect(A.sauceReview(s)).toBeNull();expect(A.softening(s)).toMatchObject({panTemperature:22,heat:0,pieceCount:14,freeWaterMl:250,releasedJuiceMl:0,oilMl:15,waterConserved:true,pressCount:0,latestPress:null,complete:false,targetMet:false});expect(A.softening(s).pieces.every(p=>p.texture==='firm chunk'&&!p.ready&&p.stage===0)).toBe(true);
 });
 it('exposes only the four real operation families and immutable authenticated projections',()=>{
  const s=fresh(),f=A.softening(s);expect(A.getActivity(id).kinds).toEqual(['setPanHeat','waitPan','press','fold']);expect(Object.isFrozen(f)).toBe(true);expect(Object.isFrozen(f.pieces[0])).toBe(true);expect(Object.isFrozen(f.limitations)).toBe(true);for(const other of[null,{},clone(s),{...s},A.create()])expect(A.softening(other)).toBeNull();for(const kind of['inspect','pour','combinePasta','finish','samplePasta','turnMushroom','loadMushrooms'])expect(A.begin(s,kind,{piece:0,source:'reduced',amountMl:50})).toBe(s);expect(A.rest(s,60)).toBe(s);expect(A.heat(s,2)).toBe(s);
 });
 it('does not turn a raw piece into a cooked one by pressing or waiting on a cold burner',()=>{
  let s=fresh();expect(A.canBegin(s,'press',{piece:0})).toBe(false);expect(act(s,'press',{piece:0})).toBe(s);s=act(s,'waitPan',{seconds:60});expect(s.state.time).toBe(60);expect(A.softening(s)).toMatchObject({panTemperature:22,freeWaterMl:250,evaporatedWaterMl:0,pressCount:0});expect(A.canBegin(s,'press',{piece:0})).toBe(false);expect(A.actionReview(s).observation).toBeNull();expect(A.actionTimeline(s).entries[0].observationKind).toBeNull();replay(s);
 });
 it('keeps every permitted preparation phase reversible and only explicit Release advances time or records evidence',()=>{
  const ready=cook();for(const[kind,options]of[['press',{piece:2}],['fold',{}],['waitPan',{seconds:30}],['setPanHeat',{setting:1}]])for(let n=0;n<A.phases[kind].length;n++){
   let s=A.begin(ready,kind,options);expect(s).not.toBe(ready);for(let j=0;j<n;j++)s=A.advance(s,s.pending.token);expect(s.state).toBe(ready.state);expect(s.record).toBe(ready.record);expect(s.receipts).toBe(ready.receipts);expect(A.softening(s)).toEqual(A.softening(ready));expect(A.commit(s,s.pending.token+1)).toBe(s);if(s.pending.phase!=='ready')expect(A.commit(s)).toBe(s);const canceled=A.cancel(s,s.pending.token);expect(canceled.state).toBe(ready.state);expect(canceled.receipts).toBe(ready.receipts);expect(canceled.pending).toBeNull();
  }
 });
 it('stages the 15-action Watch route and finishes using actual finite juice and cooked-piece evidence',()=>{
  let s=fresh('watch');for(let index=0;index<15;index++){const before=s;let p=A.beginDemonstration(s);expect(p).not.toBe(s);while(p.pending.phase!=='ready')p=A.advance(p,p.pending.token);expect(p.state).toBe(before.state);s=A.commit(p,p.pending.token);expect(s).not.toBe(p);expect(A.softening(s).waterConserved).toBe(true);}
  const f=A.softening(s);expect(s.state.time).toBe(342);expect(s.guide).toMatchObject({kind:null,complete:true,targetMet:true});expect(f).toMatchObject({heat:0,crushedPieceCount:2,splitPieceCount:0,pressCount:4,foldCount:2,totalWaitSeconds:330,complete:true,targetMet:true,damaged:false,needsMixing:false});expect(f.freeWaterMl).toBeCloseTo(113.76657605655753,9);expect(f.retainedJuiceMl).toBeCloseTo(60*12/14,10);expect(f.freeWaterMl+f.retainedJuiceMl+f.evaporatedWaterMl).toBeCloseTo(310,10);expect(s.record.intents.every(i=>i.actor==='demonstrator'&&i.method==='demonstrator')).toBe(true);expect(A.demonstrateNext(s)).toBe(s);expect(A.beginDemonstration(s)).toBe(s);expect(s.reading).toBeNull();expect(s.state.pot.pasta).toBe(false);replay(s);
 });
 it('coaches Practice from real state and accepts an alternative independent choice of softened pieces',()=>{
  let s=fresh('practice');for(let n=0;n<30&&!s.guide.complete;n++){const guide=s.guide,next=act(s,guide.kind,guide);expect(next).not.toBe(s);s=next;}expect(A.softening(s).targetMet).toBe(true);expect(s.record.intents.every(i=>i.actor==='learner')).toBe(true);replay(s);
  let alternate=finish(pressPair(cook(),[6,13]));expect(A.softening(alternate)).toMatchObject({pressedPieceCount:2,crushedPieceCount:2,pressCount:4,complete:true,targetMet:true});expect(A.softening(alternate).presses.map(p=>p.piece)).toEqual([6,6,13,13]);replay(alternate);
 });
 it('records a selected yielding piece without advancing time, altering its cooking state or changing other pieces',()=>{
  const before=cook(),s=act(before,'press',{piece:5,method:'pointer'});expect(s.state).toEqual(R.act(before.state,'crushTomato',5,'scene-masher'));expect(s.state.time).toBe(330);expect(s.lastReceipt).toMatchObject({kind:'press',action:'crushTomato',value:5,actor:'learner',method:'pointer',durationSeconds:0,inspection:null,tomatoPress:{piece:5,fromStage:0,toStage:1,fromTexture:'softened chunk',toTexture:'split',time:330}});expect(s.lastReceipt.tomatoPress.releasedMl).toBeCloseTo(30/14,12);expect(s.state.pan.pieces[5].soft).toBe(before.state.pan.pieces[5].soft);for(let index=0;index<14;index++)if(index!==5)expect(s.state.pan.pieces[index]).toEqual(before.state.pan.pieces[index]);expect(A.softening(s).waterConserved).toBe(true);replay(s);
 });
 it('respects individual cooking differences instead of declaring every tomato softened from one successful press',()=>{
  let s=cook();expect(A.canBegin(s,'press',{piece:0})).toBe(true);expect(A.canBegin(s,'press',{piece:9})).toBe(false);s=act(s,'press',{piece:0});const before=s;expect(act(s,'press',{piece:9})).toBe(before);expect(A.softening(s).pieces[9].texture).toBe('firm chunk');s=act(s,'waitPan',{seconds:30});expect(A.canBegin(s,'press',{piece:9})).toBe(true);expect(A.actionReview(s).observation).toBeNull();expect(A.softening(s).latestPress.piece).toBe(0);s=act(s,'press',{piece:9});expect(A.softening(s).latestPress.piece).toBe(9);replay(s);
 });
 it('spends each piece’s retained juice only twice and preserves the same total water through folds and evaporation',()=>{
  let s=act(cook(),'waitPan',{seconds:30});for(let piece=0;piece<14;piece++){expect(A.canBegin(s,'press',{piece})).toBe(true);s=act(s,'press',{piece});s=act(s,'press',{piece});expect(act(s,'press',{piece})).toBe(s);expect(A.softening(s).waterConserved).toBe(true);}const before=s;s=act(s,'fold',{method:'keyboard'});expect(s.state).toEqual(R.act(before.state,'stirSweep','button','keyboard'));expect(s.lastReceipt.durationSeconds).toBe(6);expect(A.softening(s)).toMatchObject({retainedJuiceMl:0,pressCount:28,waterConserved:true});expect(A.softening(s).releasedJuiceMl).toBeCloseTo(60,10);expect(A.softening(s).evaporatedWaterMl).toBeGreaterThan(A.softening(before).evaporatedWaterMl);expect(s.state.time).toBe(366);replay(s);
 });
 it('permits a new press after folding without resetting oil dispersion or previously recorded texture evidence',()=>{
  let s=finish();const old=clone(A.softening(s).latestPress),dispersion=s.state.pan.chemistry.dispersion;s=act(s,'press',{piece:2});expect(s.lastReceipt.kind).toBe('press');expect(s.state.pan.chemistry.dispersion).toBeLessThan(dispersion);expect(A.softening(s)).toMatchObject({complete:false,targetMet:false,foldsSinceLastPress:0,pressCount:5});expect(A.softening(s).presses[3]).toEqual(old);s=act(s,'fold');expect(A.softening(s).targetMet).toBe(true);replay(s);
 });
 it('requires two pieces proven crushed, a subsequent fold and an off burner rather than a count of arbitrary actions',()=>{
  let s=cook();for(let i=0;i<8;i++)s=act(s,'fold');s=act(s,'setPanHeat',{setting:0});expect(A.softening(s)).toMatchObject({foldCount:8,pressCount:0,complete:false,targetMet:false});s=act(act(s,'press',{piece:0}),'press',{piece:0});s=act(s,'fold');expect(A.softening(s)).toMatchObject({crushedPieceCount:1,complete:false,targetMet:false});s=act(act(s,'press',{piece:1}),'press',{piece:1});expect(A.softening(s).complete).toBe(false);s=act(s,'fold');expect(A.softening(s).targetMet).toBe(true);s=act(s,'setPanHeat',{setting:1});expect(A.softening(s).complete).toBe(false);replay(s);
 });
 it('preserves irreversible scorch damage and marks a completed handling sequence as missing its target',()=>{
  let s=pressPair();s=act(s,'setPanHeat',{setting:3});for(let i=0;i<12;i++)s=act(s,'waitPan',{seconds:60});expect(A.softening(s).damaged).toBe(true);const damage=s.state.pan.damage,press=clone(A.softening(s).latestPress);s=finish(s);expect(A.softening(s)).toMatchObject({complete:true,targetMet:false,damaged:true,burnerOff:true,latestPress:press});expect(s.state.pan.damage).toBeGreaterThanOrEqual(damage);expect(s.guide.label).toContain('cannot be reversed');replay(s);
 });
 it('keeps actual press evidence in the notebook while timed waits remain bookkeeping and never fabricate a taste',()=>{
  let s=act(cook(),'press',{piece:4}),review=A.actionReview(s),actionNumber=s.receipts.length;expect(review).toMatchObject({observationKind:'tomato-press',observationStatus:'recorded',observation:{kind:'tomato-press',label:'Piece 5 yielded · split'}});expect(review.quantities).toHaveLength(8);expect(review.quantities.every(row=>row.before!==null&&row.after!==null)).toBe(true);expect(review.observation.details.join(' ')).toContain('not a spoon check');const historical=clone(review);s=act(s,'fold');s=act(s,'waitPan',{seconds:30});expect(A.actionReview(s).observation).toBeNull();expect(A.actionReview(s).previousObservationAction).toBe(actionNumber);expect(A.actionReview(s,actionNumber)).toEqual(historical);expect(s.reading).toBeNull();expect(s.inspectionFresh).toBe(false);expect(A.sauceReview(s)).toBeNull();expect(JSON.stringify(review)).not.toMatch(/"soft"|"damage"|"chemistry"/);replay(s);
 });
 it('rejects malformed options and tampered records instead of trusting snapshots',()=>{
  const cold=fresh(),ready=cook();for(const options of[{setting:-1},{setting:4},{setting:1.5},{setting:'2'}])expect(A.begin(cold,'setPanHeat',options)).toBe(cold);for(const seconds of[0,14,120,'60',Infinity])expect(A.begin(cold,'waitPan',{seconds})).toBe(cold);for(const piece of[-1,14,.5,'0'])expect(A.begin(ready,'press',{piece})).toBe(ready);
  const s=finish(),raw=A.createRecord(s);for(const edit of[r=>{r.intents[0].setting=4;},r=>{r.intents.find(i=>i.kind==='press').piece=14;},r=>{r.intents[0].unexpected=1;},r=>{r.intents[0].actor='demonstrator';},r=>{r.activity='unknown';}]){const bad=clone(raw);edit(bad);expect(A.restoreRecord(bad)).toBeNull();}const attempted=clone(raw);attempted.state={pan:{damage:0}};const rebuilt=A.restoreRecord(attempted);expect(rebuilt.state).toEqual(s.state);
 });
 it('rejects changes to the pinned setup or unrelated engine state on a committed transition',()=>{
  for(const mutate of[s=>{s.pan.temp=23;},s=>{s.prep.cuts=[10];},s=>{s.pot.water=1;},s=>{s.tomatoModel=0;}]){const B=injected({...R,start(...args){const s=R.start(...args);mutate(s);return s;}});expect(()=>fresh('independent',B)).toThrow();}
  for(const mutate of[s=>{s.pot.water=1;},s=>{s.prep.garlic=true;},s=>{s.pan.pieces[0].juice+=1;},s=>{s.pan.chemistry.starchG=1;}]){let enabled=false;const B=injected({...R,act(...args){const s=R.act(...args);if(enabled&&s!==args[0])mutate(s);return s;}});const initial=fresh('independent',B);enabled=true;const pending=stage(initial,'setPanHeat',{setting:2},B);expect(B.commit(pending,pending.pending.token)).toBe(pending);}
 });
 it('honors the global action and kitchen time limits without a clipped or partial final interval',()=>{
  let s=fresh();for(let i=0;i<60;i++)s=act(s,'waitPan',{seconds:60});expect(s.state.time).toBe(3600);expect(A.begin(s,'waitPan',{seconds:15})).toBe(s);expect(A.begin(s,'fold')).toBe(s);expect(A.begin(s,'setPanHeat',{setting:1})).toBe(s);replay(s);
  s=fresh();for(let i=0;i<96;i++)s=act(s,'setPanHeat',{setting:i%2?0:1});expect(s.limitReached).toBe(true);expect(s.receipts).toHaveLength(96);expect(A.begin(s,'waitPan',{seconds:15})).toBe(s);replay(s);
 });
});
