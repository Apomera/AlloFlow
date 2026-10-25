import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const oldCooks=require('./helpers/reference_fixture.cjs')('kitchen-sauce-holding-2026-10-18/model-one-fixtures.json.gz');
function wait(s,seconds=120,step=30){while(seconds>0){const n=Math.min(step,seconds);s=R.act(s,'advance',n);seconds-=n;}return s;}
function completeMix(s){for(let fold=0;fold<8&&R.needsMixing(s);fold++)s=R.act(s,'stirSweep','button');expect(R.needsMixing(s)).toBe(false);return s;}
function adjusted(amount=50){let s=R.startRescue('holding',0,'demonstrate');s=R.act(s,'pour',amount);return R.act(completeMix(s),'taste');}
function finish(s){s=R.act(s,'plate');return R.submit({...s,answers:[0,null]});}
function waterTotal(s){return s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl;}

describe('Sauce changes during a serving pause',()=>{
 it('keeps cooling, losing water to air, and absorbing water with the burner off',()=>{
  const s=R.act(R.startRescue('holding',0),'taste'),before=JSON.stringify(s),held=wait(s);
  expect(held.pan.heat).toBe(0);expect(held.pan.temp).toBeLessThan(s.pan.temp);
  expect(held.pan.absorbedWaterMl).toBeGreaterThan(0);expect(held.pan.evaporatedWaterMl).toBeGreaterThan(0);
  expect(waterTotal(held)).toBeCloseTo(waterTotal(s),10);expect(held.pan.chemistry.starchG).toBe(s.pan.chemistry.starchG);expect(held.pan.chemistry.oilMl).toBe(s.pan.chemistry.oilMl);
  expect(R.sauceChemistry(s).type).toBe('coating');expect(R.sauceChemistry(held).type).toBe('thick');expect(held.pan.tasted).toBe(false);
  expect(R.inspections(held)[0]).toEqual(R.inspections(s)[0]);expect(JSON.stringify(s)).toBe(before);
 });
 it('records slower spoon flow after cooling, even while both checks show a coating',()=>{
  const s=adjusted(),later=R.act(wait(s),'taste'),readings=R.inspections(later);
  expect(readings.map(r=>r.type)).toEqual(['coating','coating']);expect(readings[1].closureSeconds).toBeGreaterThan(readings[0].closureSeconds);
  expect(readings[1].chemistry.absorbedWaterMl).toBeGreaterThan(readings[0].chemistry.absorbedWaterMl);
 });
 it('requires actual observations across the delay, not rapid checks or elapsed time alone',()=>{
  const start=adjusted();expect(R.holdingCheck(R.act(start,'taste')).met).toBe(false);
  const waited=wait(start);expect(R.holdingCheck(waited)).toMatchObject({observedSeconds:0,waitingSeconds:120,met:false});
  const sampled=R.act(waited,'taste');expect(R.holdingCheck(sampled)).toMatchObject({observedSeconds:120,met:true});
  expect(R.holdingCheck(R.act(sampled,'advance',1)).met).toBe(false);
  const noBaseline=R.act(wait(R.startRescue('holding',0)),'taste');expect(R.holdingCheck(noBaseline).met).toBe(false);
 });
 it('resets the comparison for real adjustments, preserves it for rejected or identical controls',()=>{
  const ready=R.act(wait(adjusted()),'taste');
  for(const[a,v]of [['pour',10],['stirSweep','button'],['stirPan'],['panHeat',1],['panPlace','trivet']])expect(R.holdingCheck(R.act(ready,a,v)).met).toBe(false);
  expect(R.holdingCheck(R.act(ready,'panHeat',0)).met).toBe(true);
  const rejected=R.act(ready,'combine');expect(rejected.log.at(-1).accepted).toBe(false);expect(R.holdingCheck(rejected).met).toBe(true);
  const late=R.act(R.act(ready,'pour',10),'stirSweep','button');expect(R.holdingCheck(R.act(late,'taste')).observedSeconds).toBe(0);
 });
 it('permits different measured solutions and keeps over-dilution reviewable',()=>{
  for(const amount of [30,50,80]){const s=finish(R.act(wait(adjusted(amount)),'taste'));expect(R.criteria(s).every(c=>c.met)).toBe(true);expect(R.evidence(s).status).toBe('Rescue demonstrated independently');}
  let excessive=R.startRescue('holding',0);excessive=R.act(R.act(excessive,'pour',100),'pour',50);excessive=R.act(R.act(excessive,'stirPan'),'taste');
  expect(R.sauceChemistry(excessive).type).toBe('watery');expect(R.holdingCheck(excessive).met).toBe(false);
 });
 it('allows a later rescue after the original coating tightens',()=>{
  let s=R.act(wait(R.act(R.startRescue('holding',2,'demonstrate'),'taste')),'taste');expect(R.inspections(s).at(-1).type).toBe('thick');
  s=R.act(completeMix(R.act(s,'pour',50)),'taste');s=finish(R.act(wait(s),'taste'));
  expect(R.evidence(s).status).toBe('Rescue demonstrated independently');expect(R.review(s).findings[3].observation).toContain('moved into the pasta');
 });
 it('requires pasta in the pan for uptake and accounts for elapsed time during a fold',()=>{
  const start=R.startRescue('holding',0),uncombined={...start,pan:{...start.pan,combined:false}},held=wait(uncombined);
  expect(held.pan.absorbedWaterMl).toBe(0);expect(R.act(uncombined,'stirPan').pan.absorbedWaterMl).toBe(0);
  const folded=R.act(start,'stirPan'),elapsed=R.act(start,'advance',6);
  expect(folded.pan.absorbedWaterMl).toBeGreaterThan(0);expect(folded.pan.absorbedWaterMl).toBe(elapsed.pan.absorbedWaterMl);expect(folded.pan.moisture).toBe(elapsed.pan.moisture);
  expect(waterTotal(folded)).toBeCloseTo(waterTotal(start),10);
 });
 it('keeps the water balance when saved water is added after absorption and never exceeds finite uptake capacity',()=>{
  let s=wait(R.startRescue('holding',0));s=R.act(s,'pour',50);s=wait(s,600);
  expect(waterTotal(s)).toBeCloseTo(95,10);expect(s.pan.absorbedWaterMl).toBeLessThanOrEqual(s.prep.pasta*.15);expect(s.pan.moisture).toBeGreaterThanOrEqual(0);
 });
 it('replays equal time partitions consistently and rebuilds water destinations from actions',()=>{
  const s=adjusted(),a=R.act(wait(s,120,60),'taste'),b=R.act(wait(s,120,15),'taste');
  expect(a.pan).toEqual(b.pan);expect(a.pot).toEqual(b.pot);const done=finish(a),before=JSON.stringify(done);
  const raw=JSON.parse(before);raw.pan.absorbedWaterMl=999;raw.pan.evaporatedWaterMl=999;raw.log.find(e=>e.inspection).inspection.chemistry.absorbedWaterMl=999;
  expect(R.restore(raw)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);expect(JSON.stringify(done)).toBe(before);
  const exported=R.evidence(done);exported.actions.find(e=>e.inspection).inspection.chemistry.absorbedWaterMl=999;expect(JSON.stringify(done)).toBe(before);
  expect(R.restore({...done,sauceModel:1})).toBeNull();expect(R.restore({...done,sauceModel:undefined})).toBeNull();
 });
 for(const f of oldCooks)it('preserves model-one '+f.label+' state and assessed evidence exactly',()=>{
  const s=R.restore(f.state);expect(s).toEqual(f.state);expect(R.evidence(s)).toEqual(f.evidence);expect(s.pan).not.toHaveProperty('absorbedWaterMl');expect(s.pan).not.toHaveProperty('evaporatedWaterMl');
 });
});
