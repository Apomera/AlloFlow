import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s);
const start=(thermalModel=2)=>({...R.startRescue('cooled',0,'demonstrate'),thermalModel});
const heated=(heat,seconds=30,thermalModel=2)=>act(start(thermalModel),[['panHeat',heat],['advance',seconds]]);
const finish=s=>R.submit({...act(s,[['panHeat',0],['taste'],['plate']]),answers:[1,null]});
const waterTotal=s=>s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl;

describe('Power-sensitive warming of wet food',()=>{
 it('starts new recipes and rescues with thermal model 3 and exposes the actual version in evidence',()=>{
  for(const state of [R.start('mushroom',2),R.start('tomato',4),...R.rescues.map(r=>R.startRescue(r.id,0))]){
   expect(state.thermalModel).toBe(3);expect(R.evidence(state).thermalModel).toBe(3);
  }
 });
 it('distinguishes low, medium and high warming before the wet pan approaches its target',()=>{
  const low=heated(1),medium=heated(2),high=heated(3);
  expect(low.pan.temp).toBeGreaterThan(35);expect(low.pan.temp).toBeLessThan(medium.pan.temp);expect(medium.pan.temp).toBeLessThan(high.pan.temp);
  expect(high.pan.temp).toBeLessThan(108);expect(R.sauceChemistry(low).type).toBe('thick');expect(R.sauceChemistry(medium).type).toBe('coating');expect(R.sauceChemistry(high).type).toBe('coating');
  for(const s of [low,medium,high]){expect(s.pan.chemistry.starchG).toBe(.8);expect(s.pan.chemistry.oilMl).toBe(15);expect(waterTotal(s)).toBeCloseTo(60,10);}
 });
 it('preserves medium warming exactly rather than silently retuning every heat setting',()=>{
  for(const seconds of [6,15,30,60]){
   const current=heated(2,seconds),previous=heated(2,seconds,1);expect(current.pan).toEqual(previous.pan);expect(current.pot).toEqual(previous.pot);
  }
 });
 it('allows gentler warming given more time without prescribing a burner choice',()=>{
  for(const [heat,seconds] of [[1,45],[1,60],[2,30],[3,30]]){
   const before=R.act(start(),'taste'),done=finish(act(before,[['panHeat',heat],['advance',seconds]]));
   expect(R.criteria(done).every(c=>c.met)).toBe(true);expect(done.pot.reserve).toBe(150);expect(R.evidence(done).status).toBe('Rescue demonstrated independently');
  }
 });
 it('does not change temperature immediately when a dial is turned',()=>{
  const initial=start(),high=R.act(initial,'panHeat',3),low=R.act(high,'panHeat',1),off=R.act(low,'panHeat',0);
  for(const s of [high,low,off]){expect(s.time).toBe(0);expect(s.pan.temp).toBe(initial.pan.temp);expect(s.pan.moisture).toBe(initial.pan.moisture);}
 });
 it('does not accelerate hot wet-pan cooling merely because burner power is higher',()=>{
  const results=[];
  for(const heat of [1,2,3]){
   const source={...R.startRescue('separated',2),thermalModel:2},current=act(source,[['panHeat',heat],['advance',10]]),previous=act({...source,thermalModel:1},[['panHeat',heat],['advance',10]]);
   expect(current.pan.temp).toBe(previous.pan.temp);expect(current.pan.temp).toBeLessThan(source.pan.temp);expect(current.pan.temp).toBeGreaterThan(108);results.push(current.pan.temp);
  }
  expect(results[0]).toBe(results[1]);expect(results[1]).toBe(results[2]);
 });
 it('removes burner input on the trivet and preserves the same residual cooling as switching off',()=>{
  const warm=heated(3),off=act(warm,[['panHeat',0],['advance',30]]),trivet=act(warm,[['panPlace','trivet'],['advance',30]]);
  expect(trivet.pan.heat).toBe(3);expect(R.panPosition(trivet).heat).toBe(0);
  for(const key of ['temp','moisture','absorbedWaterMl','evaporatedWaterMl'])expect(trivet.pan[key]).toBe(off.pan[key]);
  expect(trivet.pan.chemistry).toEqual(off.pan.chemistry);expect(trivet.pan.temp).toBeLessThan(warm.pan.temp);expect(trivet.pan.temp).toBeGreaterThan(22);
  const returned=act(trivet,[['panPlace','burner'],['advance',6]]);expect(returned.pan.temp).toBeGreaterThan(trivet.pan.temp);
 });
 it('leaves dry and empty pan heating unchanged',()=>{
  const empty=R.act({...R.start(),thermalModel:2},'panHeat',3),dry={...R.startRescue('dry',0),thermalModel:2};dry.pan.heat=3;
  for(const s of [empty,dry]){
   const current=R.act(s,'advance',6),previous=R.act({...s,thermalModel:1},'advance',6);
   expect(current.pan).toEqual(previous.pan);expect(current.pot).toEqual(previous.pot);
  }
 });
 it('retains the wider pan time response and power ordering for the same cool wet contents',()=>{
  const standard=start(),wide={...standard,pan:{...standard.pan,size:'wide'}};
  for(const heat of [1,2,3]){
   const a=act(standard,[['panHeat',heat],['advance',30]]),b=act(wide,[['panHeat',heat],['advance',30]]);expect(b.pan.temp).toBeLessThan(a.pan.temp);
  }
 });
 it('uses the new warming physics throughout a completed fold and keeps accessible inputs equivalent',()=>{
  for(const heat of [1,2,3]){
   const source=R.act(start(),'panHeat',heat),button=R.act(source,'stirSweep','button'),gesture=R.act(source,'stirSweep','gesture'),elapsed=R.act(source,'advance',6);
   expect(button.pan).toEqual(gesture.pan);expect(button.pot).toEqual(gesture.pot);expect(button.pan.temp).toBe(elapsed.pan.temp);expect(button.pan.moisture).toBe(elapsed.pan.moisture);expect(button.time).toBe(6);
  }
  expect(R.act(R.act(start(),'panHeat',3),'stirPan').pan.temp).toBeGreaterThan(R.act(R.act(start(),'panHeat',1),'stirPan').pan.temp);
 });
 it('remains consistent across equal time partitions and conserves water at each power',()=>{
  for(const heat of [1,2,3]){
   const source=R.act(start(),'panHeat',heat),whole=R.act(source,'advance',60),split=act(source,[['advance',15],['advance',15],['advance',15],['advance',15]]);
   expect(split.pan).toEqual(whole.pan);expect(split.pot).toEqual(whole.pot);expect(waterTotal(whole)).toBeCloseTo(waterTotal(source),10);
  }
 });
 it('still penalizes excessive high-heat reduction through the actual dry result',()=>{
  const source=R.act(start(),'taste'),reduced=act(source,[['panHeat',3],['advance',60],['advance',60],['panHeat',0],['taste']]);
  expect(R.sauceChemistry(reduced).type).toBe('dry');expect(R.coolingCheck(reduced).met).toBe(false);expect(reduced.pan.moisture).toBe(0);
  expect(reduced.pan.chemistry.starchG).toBe(.8);expect(reduced.pan.chemistry.oilMl).toBe(15);expect(waterTotal(reduced)).toBeCloseTo(waterTotal(source),10);
 });
 it('preserves modern scorch acceptance and recorded spoon wording for both thermal versions',()=>{
  for(const thermalModel of [1,2]){
   const s=start(thermalModel);Object.assign(s.pan,{temp:260,heat:3,moisture:0,damage:.99,tasted:true});
   const damaged=R.act(s,'advance',6),checked=R.act(damaged,'taste');expect(damaged.log.at(-1).accepted).toBe(true);expect(damaged.feedback).toContain('The pan has scorched');expect(damaged.pan.tasted).toBe(false);
   expect(checked.feedback).toContain(R.inspections(checked).at(-1).observation);expect(R.evidence(checked).thermalModel).toBe(thermalModel);
  }
 });
 it('rebuilds both versions from their own physics rather than upgrading historical actions',()=>{
  for(const thermalModel of [1,2]){
   const done=finish(act(R.act(start(thermalModel),'taste'),[['panHeat',1],['advance',45]])),raw=JSON.parse(JSON.stringify(done));raw.pan.temp=999;raw.time=999;
   expect(R.restore(raw)).toEqual(done);expect(R.restore(raw).thermalModel).toBe(thermalModel);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);expect(R.replay(done,0).state.thermalModel).toBe(thermalModel);
  }
  const old=heated(1,30,1),current=heated(1,30,2);expect(old.pan.temp).toBeGreaterThan(current.pan.temp);expect(old.pan.temp).toBe(heated(3,30,1).pan.temp);
 });
 it('preserves absent-version attempts and rejects unsupported versions or incomplete rescue protocols',()=>{
  let s=R.startRescue('holding',0);delete s.thermalModel;s=act(s,[['pour',50],['stirPan'],['taste'],['plate']]);s=R.submit({...s,answers:[0,null]});
  expect(R.restore(s)).toEqual(s);expect(R.replay(s,s.log.length).state).not.toHaveProperty('thermalModel');expect(R.evidence(s)).not.toHaveProperty('thermalModel');
  for(const id of ['fragile','cooled'])for(const thermalModel of [undefined,null,0,4,'2',true]){
   const raw={...R.startRescue(id,0),thermalModel};expect(R.restore(raw)).toBeNull();
  }
  for(const id of ['fragile','cooled'])for(const thermalModel of [1,2,3])expect(R.restore({...R.startRescue(id,0),thermalModel}).thermalModel).toBe(thermalModel);
 });
 for(const id of ['mushroom','tomato'])for(const servings of [2,4])it('keeps '+id+' for '+servings+' achievable with observed recipe adjustments',()=>{
  const s=cook(id,servings).state;expect(R.criteria(s).every(c=>c.met)).toBe(true);expect(R.evidence(s).corrections).toBe(0);expect(R.restore(s)).toEqual(s);
 });
});
