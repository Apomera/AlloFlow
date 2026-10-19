import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const act=(s,steps)=>steps.reduce((n,[a,v])=>R.act(n,a,v),s);
const pair=(id='starchy',steps=[])=>act(R.startRescue(id,0),[['taste'],...steps,['taste']]);
const checks=s=>s.log.filter(e=>e.inspection).map(e=>e.inspection);

describe('Selected recorded starch mass and free-water concentration',()=>{
 it('shows that equal water amounts carry different starch without treating temperature as isolated',()=>{
  const plain=C.starchBudget(pair('starchy',[['pourPlain',60],['stirPan'],['stirPan']])),saved=C.starchBudget(pair('starchy',[['pour',60],['stirPan'],['stirPan']]));
  expect(plain.before).toMatchObject({starchG:3,waterMl:45,concentrationKnown:true,heterogeneous:false});
  expect(plain.before.concentrationGPer100Ml).toBeCloseTo(3/45*100,12);expect(plain.after.starchG).toBe(3);expect(saved.after.starchG).toBeCloseTo(5.4,12);
  expect(plain.added.starchG).toBe(0);expect(saved.added.starchG).toBeCloseTo(2.4,12);expect(saved.after.concentrationGPer100Ml).toBeGreaterThan(plain.after.concentrationGPer100Ml);
  for(const v of [plain,saved]){expect(v.balance.balanced).toBe(true);expect(v.after.concentrationGPer100Ml).toBeCloseTo(v.after.starchG/v.after.waterMl*100,12);}
 });
 it('shows continued concentration from uptake and evaporation with no starch loss',()=>{
  const s=pair('holding',[['advance',60],['advance',60]]),v=C.starchBudget(s),water=C.betweenChecks(s).water;
  expect(v.before.starchG).toBe(v.after.starchG);expect(v.added).toEqual({starchG:0,events:[],complete:true});expect(v.balance.balanced).toBe(true);
  expect(v.after.waterMl).toBeLessThan(v.before.waterMl);expect(v.after.concentrationGPer100Ml).toBeGreaterThan(v.before.concentrationGPer100Ml);expect(water.absorbedMl).toBeGreaterThan(0);expect(water.evaporatedMl).toBeGreaterThan(0);
 });
 it('labels composition averages as heterogeneous while a pool remains and preserves small amounts',()=>{
  const s=pair('cooled',[['pour',100],['stirPan']]),v=C.starchBudget(s);
  expect(v.after.heterogeneous).toBe(true);expect(v.after.concentrationKnown).toBe(true);expect(v.added.events[0]).toMatchObject({waterMl:100,starchG:1.2,concentrationGPer100Ml:1.2,complete:true});
  checks(s)[1].chemistry.starchG=.0001;expect(C.starchBudget(s).after.starchG).toBe(.0001);
 });
 it('keeps dry zero-water concentration unknown, distinct from genuinely zero starch',()=>{
  const dry=pair('dry',[['panHeat',3],['advance',60],['advance',60]]),v=C.starchBudget(dry);
  expect(v.after).toMatchObject({waterMl:0,massKnown:true,concentrationKnown:false,concentrationGPer100Ml:null});expect(v.balance.balanced).toBe(true);
  checks(dry)[0].chemistry.starchG=0;expect(C.starchBudget(dry).before).toMatchObject({concentrationKnown:true,concentrationGPer100Ml:0});
 });
 it('pins quantities to selected accepted checks through later cooking, restore and replay',()=>{
  let s=pair('starchy',[['pourPlain',60],['stirPan'],['stirPan']]);const before=JSON.stringify(s),list=C.checks(s),selection={fromIndex:list[0].index,toIndex:list[1].index},v=C.starchBudget(s,selection);
  expect(JSON.stringify(s)).toBe(before);s=act(s,[['pour',20],['stirPan'],['taste']]);
  expect(C.starchBudget(s,selection)).toEqual(v);expect(C.starchBudget(R.restore(s),selection)).toEqual(v);
  const plated=R.submit({...R.act(s,'plate'),answers:[0,null]});expect(C.starchBudget(R.replay(plated,plated.log.length).state,selection)).toEqual(v);
  Object.assign(s.pan,{moisture:999,temp:250});s.pan.chemistry.starchG=999;expect(C.starchBudget(s,selection)).toEqual(v);
 });
 it('rejects malformed mass records and does not replace unknowns with live values',()=>{
  for(const key of ['starchG','waterMl'])for(const value of [undefined,null,-1,NaN,Infinity,'1']){
   const s=pair();checks(s)[0].chemistry[key]=value;const v=C.starchBudget(s);
   expect(v.before.massKnown).toBe(key==='waterMl');expect(v.before.concentrationKnown).toBe(false);expect(v.before.concentrationGPer100Ml).toBeNull();if(key==='waterMl')expect(v.before.starchG).toBe(3);
  }
  const s=pair();checks(s)[0].chemistry.waterMl=Number.MIN_VALUE;checks(s)[0].chemistry.starchG=100;expect(C.starchBudget(s).before.concentrationKnown).toBe(false);
 });
 it('marks missing or inconsistent receipts unknown and a contradictory starch sum unbalanced',()=>{
  const patches=[{starchG:undefined},{starchG:-1},{starchG:Infinity},{amount:50},{to:'jug'},{from:''},{from:'plain water'}];
  for(const patch of patches){const s=pair('starchy',[['pour',60]]);Object.assign(s.log[1].transfer,patch);const v=C.starchBudget(s);expect(v.added.complete).toBe(false);expect(v.added.starchG).toBeNull();expect(v.balance.complete).toBe(false);}
  const s=pair('starchy',[['pourPlain',60]]);s.log[1].transfer.starchG=.1;expect(C.starchBudget(s).added.complete).toBe(false);
  const contradiction=pair('starchy',[['pour',60]]);checks(contradiction)[1].chemistry.starchG=8;expect(C.starchBudget(contradiction).balance).toMatchObject({complete:true,balanced:false});
  for(const time of [-1,999,NaN]){const s=pair('starchy',[['advance',15],['pour',60]]);s.log[2].time=time;expect(C.starchBudget(s).added.complete).toBe(false);}
  const early=pair('starchy',[['advance',15],['taste'],['pour',60]]),list=C.checks(early);early.log[3].time=0;expect(C.starchBudget(early,{fromIndex:list[1].index,toIndex:list[2].index}).added.complete).toBe(false);
  const wrongSource=pair('starchy',[['pourPlain',60]]);wrongSource.log[1].transfer.from='reduced cooking water';expect(C.starchBudget(wrongSource).added.complete).toBe(false);
 });
 it('uses only accepted receipts strictly within the chosen interval',()=>{
  const s=pair('cooled',[['pour',100],['pour',100],['pour',10]]),v=C.starchBudget(s);
  expect(s.log[2].accepted).toBe(false);expect(v.added.events).toHaveLength(2);expect(v.added.starchG).toBeCloseTo(1.32,12);expect(v.balance.balanced).toBe(true);
  const earlier=R.act(R.act(R.startRescue('dry',0),'pour',50),'taste'),later=R.act(earlier,'taste');expect(C.starchBudget(later).added.events).toEqual([]);
 });
 it('does not invent concentration or receipt data in older records',()=>{
  let s=R.restore({...R.startRescue('dry',0),thermalModel:2,mixingModel:1});s=act(s,[['taste'],['pour',50],['stirPan'],['taste']]);
  const v=C.starchBudget(s);expect(v.before.massKnown).toBe(true);expect(v.added.complete).toBe(false);expect(v.balance.complete).toBe(false);
  delete checks(s)[1].chemistry;expect(C.starchBudget(s).after.massKnown).toBe(false);
 });
 it('requires valid ordered check selections and returns detached explanation data',()=>{
  expect(C.starchBudget(R.start())).toEqual({status:'needs-checks'});const s=pair();expect(C.starchBudget(s,{fromIndex:1,toIndex:0})).toEqual({status:'invalid-pair'});
  const before=JSON.stringify(s),v=C.starchBudget(s);v.before.starchG=999;v.from.label='changed';expect(JSON.stringify(s)).toBe(before);
 });
});
