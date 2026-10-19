import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const act=(s,steps)=>steps.reduce((state,[action,value])=>R.act(state,action,value),s);
const last=s=>R.inspections(s).at(-1);
const assessed=(composition,options={})=>C.assess(composition,{model:2,observationModel:2,recipe:'mushroom',temperature:90,waterMl:100,...options});
const burned=(version)=>{
 const initial={...R.startRescue('dry',0,'demonstrate'),sauceObservationModel:version,mixingModel:1};if(version===undefined)delete initial.sauceObservationModel;
 return act(R.restore(initial),[['panHeat',3],['advance',60],['advance',60],['panHeat',0],['taste']]);
};
const cooled=s=>act(s,Array.from({length:5},()=>['advance',60]).concat([['taste']]));

describe('Scorch damage remains separate from current sauce body and oil',()=>{
 for(const model of [1,2,3])for(const [bodyType,waterMl,starchG] of [['dry',8,.35],['watery',300,.15],['thick',40,3],['coating',100,1.2]])for(const dispersion of [.08,.95]){
  it('keeps '+bodyType+' body with model '+model+' and dispersion '+dispersion+' after scorching',()=>{
   const composition=Object.freeze({oilMl:25,starchG,dispersion}),options={model,waterMl};
   const ordinary=assessed(composition,options),scorched=assessed(composition,{...options,damage:1});
   expect(ordinary).toMatchObject({observationModel:2,scorched:false,bodyType});
   expect(scorched).toMatchObject({observationModel:2,scorched:true,type:'scorched',bodyType,coating:false});
   for(const key of ['waterMl','starchG','oilMl','starchPercent','oilFraction','freeOilMl','dispersion','viscosity','oilDroplets','flowText','coatingText','separationText'])expect(scorched[key]).toBe(ordinary[key]);
   expect(scorched.oilDroplets).toBe(dispersion===.08);expect(scorched.observation).toContain('cannot undo');
   if(dispersion===.08)expect(scorched.observation).toContain('oil beads');
   expect(composition).toEqual({oilMl:25,starchG,dispersion});
  });
 }
 it('keeps the previous overall classifications and unburnt observation text',()=>{
  for(const [waterMl,starchG,dispersion] of [[8,.35,.08],[300,.15,.08],[40,3,.95],[100,1.2,.08],[100,1.2,.95]]){
   const composition={oilMl:25,starchG,dispersion},old=assessed(composition,{waterMl,observationModel:1}),modern=assessed(composition,{waterMl});
   const {observationModel,scorched,...rest}=modern;expect(observationModel).toBe(2);expect(scorched).toBe(false);expect(rest).toEqual(old);
  }
 });
 it('retains the exact legacy scorch fields and descriptions for model one and absence',()=>{
  for(const observationModel of [undefined,1]){
   const reading=assessed({oilMl:25,starchG:1.2,dispersion:.08},{damage:1,observationModel});
   expect(reading).toMatchObject({type:'scorched',coating:false,oilDroplets:true,flowText:'Dark residue remains in the spoon trail.',coatingText:'Dark patches cling to the spoon.',observation:'Scorched patches remain. Water or folding can change the consistency but cannot undo the damage.'});
   expect(reading).not.toHaveProperty('observationModel');expect(reading).not.toHaveProperty('scorched');
   if(observationModel===1)expect(reading.bodyType).toBe('scorched');else expect(reading).not.toHaveProperty('bodyType');
  }
 });
 it('rejects unknown observation protocols',()=>{
  for(const observationModel of [null,0,3,'1','2',NaN])expect(()=>assessed({oilMl:1},{observationModel})).toThrow(RangeError);
  for(const sauceObservationModel of [null,0,3,'1','2',NaN])expect(R.restore({...R.start(),sauceObservationModel})).toBeNull();
 });
});

describe('Recorded scorched spoon checks show subsequent physical changes without a rescue',()=>{
 it('records dry residue, pooled liquid, and a folded flowing coating while damage persists',()=>{
  const dry=cooled(burned(2)),pooled=act(dry,[['pour',100],['taste']]),folded=act(pooled,[['stirSweep','button'],['taste']]);
  expect(last(dry)).toMatchObject({observationModel:2,scorched:true,type:'scorched',bodyType:'dry',closureSeconds:0,chemistry:{oilDroplets:true,coating:false}});
  expect(last(pooled)).toMatchObject({observationModel:2,scorched:true,type:'scorched',bodyType:'unmixed',closureSeconds:.3,chemistry:{bodyType:'coating',oilDroplets:true,coating:false}});
  expect(last(pooled).observation).toContain('pools');expect(last(pooled).observation).toContain('oil beads');expect(last(pooled).observation).toContain('cannot undo');
  expect(last(folded)).toMatchObject({observationModel:2,scorched:true,type:'scorched',bodyType:'coating',chemistry:{oilDroplets:false,coating:false}});
  expect(last(folded).closureSeconds).toBeGreaterThan(1);expect(last(folded).flowText).toContain('gradually');expect(last(folded).observation).toContain('cannot undo');
  expect(folded.pan.damage).toBeGreaterThanOrEqual(dry.pan.damage);expect(folded.time-pooled.time).toBe(6);
  expect(folded.pan.chemistry.oilMl).toBe(dry.pan.chemistry.oilMl);expect(folded.pan.chemistry.starchG+folded.pot.reserveStarchG).toBeCloseTo(dry.pan.chemistry.starchG+dry.pot.reserveStarchG,12);
  const total=s=>s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl+s.pot.reserve;
  expect(total(folded)).toBeCloseTo(total(dry),10);expect(R.criteria(folded)[0].met).toBe(false);
  const done=R.submit({...R.act(folded,'plate'),answers:[0,null]});expect(R.evidence(done).status).toBe('Review and retry');
  expect(R.restore(done)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);
  for(const [state,body] of [[dry,'dry'],[pooled,'unmixed'],[folded,'coating']])expect(last(R.replay(done,state.log.length).state).bodyType).toBe(body);
  const before=JSON.stringify(done),exported=R.evidence(done);exported.inspections.at(-1).chemistry.scorched=false;exported.actions.at(-1).observation='changed';expect(JSON.stringify(done)).toBe(before);
 });
 it('preserves canonical model-one and unversioned scorch observations on restore and replay',()=>{
  for(const version of [1,undefined]){
   const old=R.submit({...act(cooled(burned(version)),[['pour',100],['taste'],['stirSweep','button'],['taste'],['plate']]),answers:[0,null]});
   expect(old.sauceObservationModel).toBe(version);expect(last(old).type).toBe('scorched');expect(last(old).closureSeconds).toBe(0);
   expect(last(old)).not.toHaveProperty('observationModel');expect(last(old)).not.toHaveProperty('scorched');
   if(version===1)expect(last(old).bodyType).toBe('scorched');else expect(last(old)).not.toHaveProperty('bodyType');
   expect(R.restore(old)).toEqual(old);expect(R.replay(old,old.log.length).state.pan).toEqual(old.pan);
   expect(R.evidence(R.restore(old)).sauceObservationModel).toBe(version);
  }
 });
 it('uses physical closure with tomato texture and keeps released juice visibly unmixed',()=>{
  let s=R.startRescue('cooled',0);s.pan.damage=1;s.pan.temp=90;s=R.act(s,'taste');
  const reading=last(s),bodyClosure=Math.round(Math.max(1,Math.min(3,.9+reading.chemistry.viscosity*.65))*100)/100;
  expect(reading).toMatchObject({scorched:true,type:'scorched',bodyType:'coating'});expect(reading.closureSeconds).toBeCloseTo(bodyClosure+R.tomatoHandling(s).fraction*.8,12);
  s=act(s,[['crushTomato',0],['taste']]);expect(last(s)).toMatchObject({scorched:true,type:'scorched',bodyType:'unmixed',closureSeconds:.3});expect(last(s).observation).toContain('Liquid pools around thicker sauce');expect(R.mixing(s).pending.tomatoJuiceMl).toBeGreaterThan(0);expect(last(s).observation).toContain('cannot undo');
 });
 it('does not use damaged heavy body as a cooling diagnosis or recommend liquid as a scorch repair',()=>{
  const s=R.startRescue('cooled',0,'practice');s.pan.damage=1;const checked=R.act(s,'taste');
  expect(last(checked)).toMatchObject({type:'scorched',bodyType:'thick'});expect(R.coolingCheck(checked).baselineIndex).toBeNull();expect(R.coolingCheck(checked).met).toBe(false);
  const advice=R.review(R.act(checked,'plate')).findings[0].nextPractice;expect(advice).toContain('Scorching cannot be undone');expect(advice).not.toContain('warming');expect(advice).not.toContain('splash');
 });
 it('versions all new cooks and retains supported rescue protocols without weakening other flags',()=>{
  for(const s of [R.start(),...R.rescues.map(r=>R.startRescue(r.id,0))])expect(s.sauceObservationModel).toBe(2);
  for(const id of ['fragile','cooled'])for(const sauceObservationModel of [1,2]){
   const raw={...R.startRescue(id,0),sauceObservationModel};expect(R.restore(raw).sauceObservationModel).toBe(sauceObservationModel);
   for(const thermalModel of [undefined,null,0,4])expect(R.restore({...raw,thermalModel})).toBeNull();
   for(const value of [undefined,null,0,3])expect(R.restore({...raw,sauceObservationModel:value})).toBeNull();
   if(id==='cooled')expect(R.restore({...raw,mixingModel:undefined})).toBeNull();
  }
 });
});
