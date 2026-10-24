import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
// Fixed historical action indices exercise exact selected-check identity; model2 stages have separate coverage.
function stages(){let s=R.restore({...R.startRescue('starchy',0,'practice'),mixingModel:1});for(const [a,v] of [['taste'],['pour',50],['stirSweep','button'],['taste'],['pourPlain',70],['stirSweep','button'],['taste']])s=R.act(s,a,v);return s;}
describe('Chosen recorded sauce references',()=>{
 it('identifies checks by action order across completed mixing intervals',()=>{
  const s=stages(),checks=C.checks(s);expect(checks.map(c=>c.index)).toEqual([0,3,6]);expect(checks.map(c=>c.time)).toEqual([0,6,12]);
  checks[0].label='Changed';expect(C.checks(s)[0].label).not.toBe('Changed');
 });
 it('keeps repeated read-only checks distinct when they share a clock time',()=>{
  let s=R.startRescue('starchy',0,'practice');for(let i=0;i<3;i++)s=R.act(s,'taste');
  expect(C.checks(s).map(c=>c.index)).toEqual([0,1,2]);expect(C.checks(s).map(c=>c.time)).toEqual([0,0,0]);
  expect(C.betweenChecks(s,{fromIndex:0,toIndex:2})).toMatchObject({elapsedSeconds:0,mixing:{seconds:0,complete:true}});
 });
 it('compares the original fault across several corrections without losing intermediate additions',()=>{
  const s=stages(),before=JSON.stringify(s),whole=C.betweenChecks(s,{fromIndex:0,toIndex:6}),last=C.betweenChecks(s);
  expect(whole.from.type).toBe('thick');expect(whole.to.type).toBe('coating');
  expect(whole.water.savedAddedMl).toBe(50);expect(whole.water.plainAddedMl).toBe(70);expect(whole.starch.changeG).toBe(2);expect(whole.actions.folds).toBe(2);expect(whole.water.balanced).toBe(true);
  expect(last.water.savedAddedMl).toBe(0);expect(last.water.plainAddedMl).toBe(70);expect(last.starch.changeG).toBe(0);expect(last).not.toHaveProperty('newerChecks');
  expect(JSON.stringify(s)).toBe(before);
 });
 it('keeps an older selected pair distinct from a stale latest observation',()=>{
  let s=stages();s=R.act(s,'pourPlain',10);
  const older=C.betweenChecks(s,{fromIndex:0,toIndex:3}),latest=C.betweenChecks(s,{fromIndex:3,toIndex:6});
  expect(older.newerChecks).toBe(true);expect(older.stale).toBe(false);expect(older.water.plainAddedMl).toBe(0);
  expect(latest.newerChecks).toBe(false);expect(latest.stale).toBe(true);expect(latest.water.plainAddedMl).toBe(70);
 });
 it('rejects missing, reversed, equal, fractional or non-check endpoints instead of inventing a comparison',()=>{
  const s=stages();for(const selection of [null,{}, {fromIndex:0,toIndex:0},{fromIndex:6,toIndex:0},{fromIndex:1,toIndex:6},{fromIndex:0,toIndex:5},{fromIndex:0,toIndex:7},{fromIndex:'0',toIndex:6},{fromIndex:.5,toIndex:6}])expect(C.betweenChecks(s,selection)).toEqual({status:'invalid-pair',stale:false});
  expect(C.betweenChecks(R.startRescue('starchy',0),{fromIndex:0,toIndex:6}).status).toBe('needs-checks');
 });
 it('ignores rejected inspection-shaped records and returns no live pan quantities',()=>{
  const s=stages(),recorded=C.betweenChecks(s,{fromIndex:0,toIndex:3});
  const altered={...s,pan:{...s.pan,moisture:999,temp:999,tasted:false},log:[...s.log,{accepted:false,action:'taste',inspection:{kind:'sauce',time:999,type:'coating'}}]};
  expect(C.checks(altered).map(c=>c.index)).toEqual([0,3,6]);expect(C.betweenChecks(altered,{fromIndex:0,toIndex:3})).toEqual(recorded);
 });
 it('reconstructs identical selected evidence after save restore and submitted replay',()=>{
  let s=stages();s=R.act(s,'plate');s=R.submit({...s,answers:[0,null]});
  const selection={fromIndex:0,toIndex:6},report=C.betweenChecks(s,selection);
  expect(C.betweenChecks(R.restore(s),selection)).toEqual(report);expect(C.betweenChecks(R.replay(s,s.log.length).state,selection)).toEqual(report);
 });
});
