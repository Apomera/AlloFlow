import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const start=(prediction=0)=>R.startRescue('cooled',prediction,'demonstrate');
const act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s);
const warm=(s,seconds=45,heat=1)=>act(s,[['panHeat',heat],['advance',seconds],['panHeat',0],['taste']]);
const finish=s=>R.submit({...R.act(s,'plate'),answers:[1,null]});
const waterTotal=s=>s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl+s.pot.reserve+s.pan.pieces.reduce((sum,p)=>sum+(p.juice||0),0);

describe('Rescuing a coating that became heavy while cooling',()=>{
 it('supplies a cool, heavy tomato coating with intact starch, oil and finite saved water',()=>{
  const s=start(),checked=R.act(s,'taste'),reading=R.inspections(checked).at(-1);
  expect(s).toMatchObject({sauceModel:2,sauceObservationModel:2,thermalModel:3,mixingModel:2});
  expect(s.pan).toMatchObject({temp:35,moisture:60,heat:0,combined:true,chemistry:{oilMl:15,starchG:.8,dispersion:.9}});
  expect(s.pot.reserve).toBe(150);expect(s.pot).not.toHaveProperty('plainWater');expect(s.pan.pieces).toHaveLength(14);
  expect(reading).toMatchObject({type:'thick',bodyType:'thick',closureSeconds:4,chemistry:{oilDroplets:false,coolingFactor:1.7}});
  expect(R.sauceChemistry(s).warmViscosity).toBeLessThan(R.sauceChemistry(s).viscosity);
  expect(R.coolingCheck(checked)).toMatchObject({enabled:true,baselineIndex:0,baselineAt:0,comparisonIndex:null,comparisonAt:null,latestCheckAt:0,after:null,deltas:null,met:false});
 });
 it('permits warming to improve the coating without adding or removing starch',()=>{
  const initial=R.act(start(),'taste'),checked=warm(initial),done=finish(checked),comparison=R.coolingCheck(done);
  expect(R.criteria(done).every(c=>c.met)).toBe(true);expect(R.evidence(done).status).toBe('Rescue demonstrated independently');
  expect(checked.pot.reserve).toBe(150);expect(checked.pan.chemistry.starchG).toBe(.8);expect(checked.pan.moisture).toBeLessThan(initial.pan.moisture);
  expect(comparison).toMatchObject({baselineIndex:0,baselineAt:0,comparisonIndex:4,comparisonAt:45,latestCheckAt:45,met:true});
  expect(comparison.deltas.temperature).toBeGreaterThan(0);expect(comparison.deltas.waterMl).toBeLessThan(0);expect(comparison.deltas.starchG).toBe(0);
  expect(comparison.deltas.bodyIndex).toBeLessThan(0);expect(comparison.deltas.warmBodyIndex).toBeGreaterThan(0);expect(comparison.deltas.coolingFactor).toBeLessThan(0);
  expect(waterTotal(checked)).toBeCloseTo(waterTotal(initial),10);
 });
 it('accepts several short heating choices according to the resulting observation',()=>{
  for(const [heat,seconds] of [[1,45],[1,60],[2,30],[2,45],[2,60],[3,30],[3,45]]){
   const done=finish(warm(R.act(start(),'taste'),seconds,heat));expect(R.criteria(done).every(c=>c.met)).toBe(true);
  }
 });
 it('does not reward continued high heat after faster warming has concentrated the sauce again',()=>{
  const previous=finish(warm(R.act(R.restore({...start(),thermalModel:2}),'taste'),60,3)),current=finish(warm(R.act(start(),'taste'),60,3));
  expect(R.criteria(previous).every(c=>c.met)).toBe(true);expect(R.sauceChemistry(previous).type).toBe('coating');
  expect(current.pan.temp).toBeGreaterThan(previous.pan.temp);expect(current.pan.moisture).toBeLessThan(previous.pan.moisture);expect(current.pan.chemistry.starchG).toBe(previous.pan.chemistry.starchG);
  expect(R.sauceChemistry(current).type).toBe('thick');expect(R.coolingCheck(current).met).toBe(false);expect(R.evidence(current).status).toBe('Review and retry');expect(waterTotal(current)).toBeCloseTo(waterTotal(previous),10);
 });
 it('also accepts measured liquid repairs at lower temperatures without demanding a particular dose',()=>{
  for(const dose of [30,50,100]){
   const initial=R.act(start(),'taste');let repaired=act(initial,[['pour',dose],['stirSweep','button'],['taste']]);
   for(let fold=0;fold<3&&R.needsMixing(repaired);fold++)repaired=act(repaired,[['stirSweep','button'],['taste']]);
   const done=finish(repaired),check=R.coolingCheck(done);
   expect(R.criteria(done).every(c=>c.met)).toBe(true);expect(check.after.temperature).toBeLessThan(50);expect(check.deltas.starchG).toBeCloseTo(dose*.012,12);
   expect(done.pot.reserve).toBe(150-dose);expect(waterTotal(done)).toBeCloseTo(waterTotal(initial),10);
  }
 });
 it('allows retained tomato juice to loosen the sauce without using the saved jug or heating',()=>{
  const initial=R.act(start(),'taste');let s=initial;
  for(let index=0;index<4;index++)s=act(s,[['crushTomato',index],['crushTomato',index]]);
  s=finish(act(s,[['stirSweep','button'],['taste']]));
  expect(R.criteria(s).every(c=>c.met)).toBe(true);expect(s.pot.reserve).toBe(150);expect(s.pan.temp).toBeLessThan(initial.pan.temp);
  expect(R.coolingCheck(s).deltas.starchG).toBe(0);expect(s.pan.chemistry.starchG).toBe(.8);expect(waterTotal(s)).toBeCloseTo(waterTotal(initial),10);
  expect(R.restore(s)).toEqual(s);expect(R.replay(s,s.log.length).state.pan.pieces).toEqual(s.pan.pieces);
 });
 it('does not grade the initial prediction as a prescribed repair route',()=>{
  for(const prediction of [0,1,2]){
   const done=finish(warm(R.act(start(prediction),'taste')));expect(R.evidence(done).status).toBe('Rescue demonstrated independently');
  }
 });
 it('requires the explanation to distinguish temperature-sensitive body from concentration',()=>{
  const plated=R.act(warm(R.act(start(),'taste')),'plate');
  for(const answer of [0,2])expect(R.evidence(R.submit({...plated,answers:[answer,null]})).status).toBe('Review and retry');
  expect(R.rescueExplanationsFor('cooled')[1]).toContain('Cooling can increase');expect(R.rescueExplanationsFor('cooled')[1]).toContain('concentration');
 });
 it('does not credit blind repairs, elapsed time alone or unchanged rapid checks',()=>{
  const blind=finish(warm(start()));expect(R.criteria(blind)[0].met).toBe(true);expect(R.coolingCheck(blind).baselineIndex).toBeNull();expect(R.evidence(blind).status).toBe('Review and retry');
  const initial=R.act(start(),'taste'),rapid=R.act(initial,'taste');expect(R.coolingCheck(rapid)).toMatchObject({baselineIndex:0,comparisonIndex:1,met:false});
  const elapsed=act(initial,[['panHeat',1],['advance',45],['panHeat',0]]);expect(R.sauceChemistry(elapsed).coating).toBe(true);expect(R.coolingCheck(elapsed).met).toBe(false);
 });
 it('keeps the first qualifying baseline when later checks remain heavy or the dish is repaired again',()=>{
  const initial=R.act(start(),'taste'),stillHeavy=warm(initial,15),first=R.coolingCheck(stillHeavy);
  expect(first).toMatchObject({baselineIndex:0,comparisonIndex:4,met:false});expect(first.after.bodyType).toBe('thick');
  const fixed=warm(stillHeavy,30);expect(R.coolingCheck(fixed)).toMatchObject({baselineIndex:0,baselineAt:0,met:true});
  expect(R.coolingCheck(fixed).before).toEqual(first.before);
 });
 it('does not mistake unmixed liquid for an observed heavy baseline or an even coating',()=>{
  const poured=R.act(start(),'pour',10),unmixed=R.act(poured,'taste');expect(R.inspections(unmixed).at(-1).type).toBe('unmixed');expect(R.coolingCheck(unmixed).baselineIndex).toBeNull();
  const diagnosed=act(start(),[['taste'],['pour',30],['taste']]),check=R.coolingCheck(diagnosed);
  expect(check.after.bodyType).toBe('unmixed');expect(check.met).toBe(false);
 });
 it('invalidates stale success after an adjustment and uses the latest fresh check',()=>{
  const ready=warm(R.act(start(),'taste')),changed=R.act(ready,'pour',10);
  expect(R.coolingCheck(ready).met).toBe(true);expect(R.coolingCheck(changed).met).toBe(false);expect(R.coolingCheck(changed).comparisonIndex).toBe(R.coolingCheck(ready).comparisonIndex);
  const fresh=act(changed,[['stirSweep','button'],['taste']]);expect(R.coolingCheck(fresh)).toMatchObject({baselineIndex:0,met:true});expect(R.coolingCheck(fresh).comparisonIndex).toBe(fresh.log.length-1);
 });
 it('shows that an initially repaired warm coating can become heavy again during another pause',()=>{
  const ready=warm(R.act(start(),'taste')),cooled=act(ready,[['advance',60],['advance',60],['taste']]);
  expect(R.sauceChemistry(ready).type).toBe('coating');expect(R.sauceChemistry(cooled).type).toBe('thick');expect(R.coolingCheck(cooled).met).toBe(false);
  expect(cooled.pan.temp).toBeLessThan(ready.pan.temp);expect(cooled.pan.chemistry.starchG).toBe(ready.pan.chemistry.starchG);expect(waterTotal(cooled)).toBeCloseTo(waterTotal(ready),10);
 });
 it('keeps over-reduction and excessive dilution reviewable failures rather than rewarding heat alone',()=>{
  const initial=R.act(start(),'taste'),tooHot=act(initial,[['panHeat',3],['advance',60],['advance',60],['panHeat',0],['taste']]);
  expect(R.sauceChemistry(tooHot).type).toBe('dry');expect(R.coolingCheck(tooHot).met).toBe(false);
  const tooMuch=act(initial,[['pour',100],['pour',50],['stirSweep','button'],['taste']]);expect(R.sauceChemistry(tooMuch).type).toBe('watery');expect(R.coolingCheck(tooMuch).met).toBe(false);expect(tooMuch.pot.reserve).toBe(0);
  const rejected=R.act(tooMuch,'pour',10);expect(rejected.log.at(-1).accepted).toBe(false);expect(rejected.pan).toEqual(tooMuch.pan);
 });
 it('retains irreversible scorch damage even if a later liquid adjustment improves body',()=>{
  const initial=R.act(start(),'taste');initial.pan.damage=1.1;
  const done=act(initial,[['pour',50],['stirSweep','button'],['taste']]);expect(R.sauceChemistry(done).type).toBe('scorched');expect(R.coolingCheck(done).met).toBe(false);
 });
 it('returns detached recorded values and never substitutes changed live chemistry for a check',()=>{
  const s=warm(R.act(start(),'taste')),before=JSON.stringify(s),check=R.coolingCheck(s),changed=JSON.parse(before);
  changed.pan.temp=200;changed.pan.moisture=999;changed.pan.chemistry.starchG=99;expect(R.coolingCheck(changed)).toEqual(check);
  check.before.temperature=999;check.after.waterMl=999;check.deltas.starchG=999;expect(JSON.stringify(s)).toBe(before);
  const e=R.evidence(s);e.coolingCheck.before.bodyIndex=999;expect(JSON.stringify(s)).toBe(before);
 });
 it('describes recorded changes without claiming they isolate a cause',()=>{
  const done=finish(act(R.act(start(),'taste'),[['pour',30],['stirSweep','button'],['taste']])),review=R.review(done);
  expect(review.findings).toHaveLength(4);expect(review.findings[3].observation).toContain('do not isolate one cause');expect(review.findings[3].observation).toContain('starch');
  const unfinished=finish(R.act(start(),'taste'));expect(R.review(unfinished).findings[0].nextPractice).toContain('gentle warming');
 });
 it('reconstructs starting composition, time and check evidence instead of trusting saved claims',()=>{
  const done=finish(warm(R.act(start(),'taste'))),raw=JSON.parse(JSON.stringify(done));raw.pan.temp=999;raw.pan.chemistry.starchG=999;
  raw.log[0].inspection.chemistry.coolingFactor=0;raw.log[0].inspection.bodyType='coating';raw.coolingCheck={met:true};
  expect(R.restore(raw)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);
  expect(R.coolingCheck(R.replay(done,1).state)).toMatchObject({baselineIndex:0,comparisonIndex:null,met:false});
 });
 it('requires the new rescue protocol and does not add cooling evidence to other challenges',()=>{
  const done=finish(warm(R.act(start(),'taste')));
  for(const flag of ['sauceObservationModel','thermalModel','mixingModel'])for(const value of [undefined,null,0,flag==='mixingModel'?3:flag==='thermalModel'?4:3,'1']){
   const changed={...done,[flag]:value};expect(R.restore(changed)).toBeNull();expect(R.replay(changed,0)).toBeNull();
  }
  for(const sauceModel of [undefined,1,3,4])expect(R.restore({...done,sauceModel})).toBeNull();
  for(const rescue of R.rescues.filter(r=>r.id!=='cooled')){const s=R.startRescue(rescue.id,0);expect(R.coolingCheck(s).enabled).toBe(false);expect(R.evidence(s)).not.toHaveProperty('coolingCheck');}
 });
});
