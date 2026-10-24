import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const act=(s,steps)=>steps.reduce((v,[a,n])=>R.act(v,a,n),s);
function warmed(model=2,heat=1,seconds=45){const s=R.restore({...R.startRescue('cooled',0,'demonstrate'),thermalModel:model});return act(s,[['taste'],['panHeat',heat],['advance',seconds],['panHeat',0],['taste']]);}
const finish=s=>R.submit({...R.act(s,'plate'),answers:[1,null]});
describe('Recorded evidence distinguishes heating protocols',()=>{
 it('exports the actual protocol and rejects cross-version outcome comparisons',()=>{
  const prior=finish(warmed(1,1,30)),current=finish(warmed()),before=JSON.stringify([prior,current]);
  expect(R.criteria(prior).every(c=>c.met)).toBe(true);expect(R.criteria(current).every(c=>c.met)).toBe(true);
  expect(M.incompatibility(prior,current)).toContain('different heat models');expect(M.compare(prior,current)).toBeNull();
  for(const s of [prior,current]){const copy=R.restore(s),comparison=M.compare(s,copy);expect(copy.thermalModel).toBe(s.thermalModel);expect(comparison.thermalModel).toBe(s.thermalModel);expect(comparison.a.thermalModel).toBe(s.thermalModel);expect(comparison.b.thermalModel).toBe(s.thermalModel);expect(R.evidence(copy).thermalModel).toBe(s.thermalModel);}
  expect(JSON.stringify([prior,current])).toBe(before);
 });
 it('compares successful settings within one protocol without treating speed as a score',()=>{
  const low=finish(warmed(2,1,45)),high=finish(warmed(2,3,30)),comparison=M.compare(low,high);
  expect(comparison.a.seconds).toBe(45);expect(comparison.b.seconds).toBe(30);expect(comparison.changes.every(c=>c.change==='unchanged')).toBe(true);
  expect(comparison.a.status).toBe('Rescue demonstrated independently');expect(comparison.b.status).toBe(comparison.a.status);
 });
 it('keeps a chosen power-response interval tied to its recorded checks',()=>{
  const checked=warmed(2,3,30),checks=C.checks(checked),selection={fromIndex:checks[0].index,toIndex:checks[1].index},before=C.betweenChecks(checked,selection);
  expect(before.temperature.changeC).toBeGreaterThan(0);expect(before.water.balanced).toBe(true);expect(before.starch.changeG).toBe(0);
  const moved=act(checked,[['panHeat',1],['advance',30]]),snapshot=JSON.stringify(moved),after=C.betweenChecks(moved,selection);
  expect(after).toEqual({...before,stale:true});expect(C.betweenChecks(R.restore(moved),selection)).toEqual(after);expect(JSON.stringify(moved)).toBe(snapshot);
 });
});
