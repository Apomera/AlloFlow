import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const previous=require('./helpers/reference_fixture.cjs')('kitchen-sauce-emulsion-2026-10-18/thermal-rescue-fixtures.json.gz');
const act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s);
const start=()=>R.startRescue('fragile',2,'demonstrate');
const wait=(s,seconds=120,step=60)=>{while(seconds>0){const dt=Math.min(step,seconds);s=R.act(s,'advance',dt);seconds-=dt;}return s;};
function adjusted(amount=30){let s=R.act(start(),'taste');if(amount)s=R.act(s,'pour',amount);s=act(s,[['stirSweep','button'],['taste']]);for(let fold=0;fold<3&&R.needsMixing(s);fold++)s=act(s,[['stirSweep','button'],['taste']]);return s;}
const checkedHold=s=>R.act(wait(s),'taste');
const finish=s=>R.submit({...R.act(s,'plate'),answers:[2,null]});
const balance=s=>s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl+s.pot.reserve+s.pan.pieces.reduce((n,p)=>n+(p.juice||0),0);

describe('Observing an emulsion through a serving pause',()=>{
 it('starts with separate oil and coating body, finite saved water, and no plain-water supply',()=>{
  const s=start(),r=R.inspections(R.act(s,'taste')).at(-1);
  expect(s).toMatchObject({sauceModel:3,thermalModel:3,sauceObservationModel:2});
  expect(s.pan).toMatchObject({temp:90,moisture:120,heat:0,chemistry:{oilMl:25,starchG:.12,dispersion:.08}});
  expect(s.pot.reserve).toBe(150);expect(s.pot.reserveStarchG).toBeCloseTo(1.8,12);expect(s.pot).not.toHaveProperty('plainWater');
  expect(R.sauceLiquids(s)).toHaveLength(1);expect(R.act(s,'pourPlain',10)).toBe(s);
  expect(r).toMatchObject({type:'separated',bodyType:'coating',chemistry:{oilDroplets:true,bodyType:'coating'}});expect(r.closureSeconds).toBeGreaterThan(1);
 });
 it('records slower body with oil beads as an existing separated sauce reduces',()=>{
  const first=R.act(R.startRescue('separated',2),'taste'),middle=R.act(R.act(first,'advance',30),'taste'),heavy=R.act(R.act(middle,'advance',30),'taste');
  const a=R.inspections(first).at(-1),b=R.inspections(middle).at(-1),c=R.inspections(heavy).at(-1);
  expect(a.bodyType).toBe('coating');expect(b.bodyType).toBe('coating');expect(b.closureSeconds).toBeGreaterThan(a.closureSeconds);
  expect(c).toMatchObject({type:'thick',bodyType:'thick',closureSeconds:4,chemistry:{oilDroplets:true}});expect(c.observation).toContain('oil beads');
  expect(R.inspections(heavy)[0]).toEqual(a);expect(heavy.feedback).toContain(c.observation);
 });
 it('shows that one fold can coat immediately and separate again during the pause',()=>{
  const first=adjusted(0),later=checkedHold(first);
  expect(R.sauceChemistry(first).type).toBe('coating');expect(R.sauceChemistry(later).type).toBe('separated');
  expect(R.sauceChemistry(later).bodyType).toBe('coating');expect(R.emulsionCheck(later).met).toBe(false);
  expect(later.pan.chemistry.oilMl).toBe(first.pan.chemistry.oilMl);expect(later.pan.chemistry.starchG).toBe(first.pan.chemistry.starchG);
  expect(balance(later)).toBeCloseTo(balance(first),10);expect(later.pot.progress).toBeLessThan(1.2);
 });
 it('allows several measured amounts and a no-addition solution judged by observed outcomes',()=>{
  for(const amount of [10,20,30,50,100]){
   const first=adjusted(amount),s=finish(checkedHold(first));expect(R.criteria(s).every(c=>c.met)).toBe(true);expect(R.evidence(s).status).toBe('Rescue demonstrated independently');
   expect(R.needsMixing(first)).toBe(false);expect(R.emulsionCheck(s)).toMatchObject({baselineIndex:0,firstCheckIndex:first.log.length-1,firstCheckAt:first.time,observedSeconds:120,met:true});
  }
  const noAddition=act(start(),[['taste'],['stirSweep','button'],['stirSweep','button'],['taste']]),done=finish(checkedHold(noAddition));
  expect(done.pot.reserve).toBe(150);expect(R.criteria(done).every(c=>c.met)).toBe(true);
 });
 it('requires an actual separate-oil diagnosis and two later coating checks, not elapsed time or quick checks',()=>{
  const blind=act(start(),[['pour',30],['stirSweep','button'],['taste']]),blindDone=finish(checkedHold(blind));
  expect(R.sauceChemistry(blindDone).coating).toBe(true);expect(R.emulsionCheck(blindDone).baselineIndex).toBeNull();expect(R.evidence(blindDone).status).toBe('Review and retry');
  const first=adjusted();expect(R.emulsionCheck(R.act(first,'taste')).met).toBe(false);
  const waited=wait(first);expect(R.emulsionCheck(waited)).toMatchObject({observedSeconds:0,waitingSeconds:120,met:false});
  const checked=R.act(waited,'taste');expect(R.emulsionCheck(checked).met).toBe(true);
  expect(R.emulsionCheck(R.act(checked,'advance',1)).met).toBe(false);
  const lateFirst=R.act(wait(act(start(),[['taste'],['pour',30],['stirSweep','button']])),'taste');expect(R.emulsionCheck(lateFirst).observedSeconds).toBe(0);
 });
 it('resets the interval after material changes, but not rejected or identical controls',()=>{
  const ready=checkedHold(adjusted());
  for(const[a,v] of [['pour',10],['water'],['stirPan'],['stirSweep','button'],['panHeat',1],['panPlace','trivet'],['crushTomato',0]]){
   const changed=R.act(ready,a,v);expect(changed.log.at(-1).accepted).toBe(true);expect(R.emulsionCheck(changed)).toMatchObject({baselineIndex:0,firstCheckIndex:null,met:false});
  }
  expect(R.emulsionCheck(R.act(ready,'panHeat',0)).met).toBe(true);expect(R.act(ready,'panPlace','burner')).toBe(ready);
  const rejected=R.act(ready,'combine');expect(rejected.log.at(-1).accepted).toBe(false);expect(R.emulsionCheck(rejected).met).toBe(true);
  const repaired=act(ready,[['pour',10],['stirSweep','button'],['taste']]);expect(R.emulsionCheck(repaired).observedSeconds).toBe(0);
 });
 it('starts a fresh stability interval after a failed coating check and a later repair',()=>{
  const failed=checkedHold(adjusted(0)),index=failed.log.length-1;
  expect(R.emulsionCheck(failed)).toMatchObject({baselineIndex:index,firstCheckIndex:null,met:false});
  const repaired=act(failed,[['pour',30],['stirSweep','button'],['taste']]),done=finish(checkedHold(repaired));
  expect(R.emulsionCheck(done)).toMatchObject({baselineIndex:index,firstCheckAt:132,observedSeconds:120,met:true});expect(R.criteria(done).every(c=>c.met)).toBe(true);
 });
 it('does not use an unmixed splash as the separate-oil diagnosis',()=>{
  const s=act(start(),[['pour',30],['taste'],['stirSweep','button'],['taste']]);
  expect(R.inspections(s)[0].type).toBe('unmixed');expect(R.inspections(s)[0].bodyType).toBe('unmixed');expect(R.emulsionCheck(checkedHold(s)).met).toBe(false);
 });
 it('conserves supplied water, oil and starch through pouring, folding, waiting and tomato pressing',()=>{
  const initial=start(),s=act(initial,[['taste'],['pour',30],['stirSweep','button'],['advance',60],['crushTomato',0]]);
  expect(balance(s)).toBeCloseTo(balance(initial),10);expect(s.pan.chemistry.oilMl).toBe(25);
  expect(s.pan.chemistry.starchG+s.pot.reserveStarchG).toBeCloseTo(.12+1.8,12);
  expect(s.pan.chemistry.starchG).toBeCloseTo(.12+.012*30,12);expect(s.pan.absorbedWaterMl).toBeGreaterThan(0);expect(s.pan.evaporatedWaterMl).toBeGreaterThan(0);
 });
 it('does not require cooling an already cool separated sauce in its review advice',()=>{
  const s=finish(checkedHold(adjusted(0))),finding=R.review(s).findings[0];
  expect(s.pan.temp).toBeLessThan(70);expect(finding.nextPractice).toContain('Fold the separate oil');expect(finding.nextPractice).not.toContain('hot pan cool');
  expect(R.review(s).findings[3].observation).toContain('Separate oil was recorded');
 });
 it('rebuilds physics, evidence and stable-check provenance from actions rather than saved claims',()=>{
  const done=finish(checkedHold(adjusted())),immutable=JSON.stringify(done),raw=JSON.parse(immutable);
  raw.pan.chemistry.dispersion=0;raw.pan.chemistry.starchG=999;raw.pan.moisture=999;raw.log[0].inspection.bodyType='watery';raw.log[0].inspection.chemistry.oilDroplets=false;
  expect(R.restore(raw)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);
  const exported=R.evidence(done);expect(exported.sauceObservationModel).toBe(2);expect(exported.emulsionCheck).toEqual(R.emulsionCheck(done));
  exported.emulsionCheck.met=false;exported.actions[0].inspection.bodyType='watery';expect(JSON.stringify(done)).toBe(immutable);
  const split=R.act(wait(adjusted(),120,15),'taste');expect(split.pan).toEqual(R.act(wait(adjusted()),'taste').pan);
 });
 it('rejects unsupported observation versions and invalid fragile source combinations',()=>{
  const done=finish(checkedHold(adjusted()));
  for(const flag of [undefined,null,0,3,'1'])for(const operation of ['restore','replay'])expect(R[operation]({...done,sauceObservationModel:flag},0)).toBeNull();
  for(const sauceModel of [undefined,1,2,4])expect(R.restore({...done,sauceModel})).toBeNull();
  expect(R.restore({...done,thermalModel:undefined})).toBeNull();
  for(const flag of [null,0,3,'1'])expect(R.restore({...R.start(),sauceObservationModel:flag})).toBeNull();
 });
 for(const fixture of previous)it('keeps historical '+fixture.label+' observations and results exact',()=>{
  const s=R.restore(fixture.state);expect(s).toEqual(fixture.state);expect(R.evidence(s)).toEqual(fixture.evidence);expect(s).not.toHaveProperty('sauceObservationModel');
  if(fixture.inspections)expect(R.inspections(s)).toEqual(fixture.inspections);
 });
});
