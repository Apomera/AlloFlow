// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),G=require('../stem_lab/kitchen_studio/recipe_lab_sampling.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_clock.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
let state,ui,host,timers;const originalScroll=HTMLElement.prototype.scrollIntoView;
const $=id=>document.getElementById(id);
function render(historical=false,zone='pan'){ui.render(state,zone,historical,true);}
function record(){state=R.act(state,'taste');render();}
beforeEach(()=>{
 document.body.innerHTML='<nav id="sauceTools"></nav>';window.KitchenRecipes=R;window.KitchenSampling=G;window.KitchenSauceCheck=S;
 window.matchMedia=()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()});window.requestAnimationFrame=vi.fn(()=>1);window.cancelAnimationFrame=vi.fn();
 for(const n of ['recipe_lab_sample_studio.js','recipe_lab_sauce_replay.js','recipe_lab_inspection.js'])window.eval(readFileSync('stem_lab/kitchen_studio/'+n,'utf8'));
 state=R.startRescue('holding',0,'demonstrate');timers={pot:null,pan:null};
 host={getState:()=>state,pause:vi.fn(),cancelNative:vi.fn(),ended:()=>state.plated||state.submitted,selectTool:vi.fn(),apply:vi.fn((a,v,m)=>{state=R.act(state,a,a==='advance'?C.limit(timers,state.time,v):v,m);render();})};
 ui=window.KitchenRecipeInspection.mount(host);render();
});
afterEach(()=>{if(ui)ui.dispose();ui=null;vi.restoreAllMocks();document.body.replaceChildren();if(originalScroll)HTMLElement.prototype.scrollIntoView=originalScroll;else delete HTMLElement.prototype.scrollIntoView;});
describe('Rechecking sauce after a serving pause',()=>{
 it('advances ordinary kitchen time without inventing a new observation',()=>{
  expect($('foodCheckWait').hidden).toBe(true);record();const checks=R.inspections(state),before=state;
  expect($('foodCheckWait').hidden).toBe(false);$('foodCheckWait30').click();
  expect(host.apply).toHaveBeenCalledExactlyOnceWith('advance',30);expect(state.time).toBe(before.time+30);
  expect(R.inspections(state)).toEqual(checks);expect(S.reading(state).stale).toBe(true);
  expect($('foodCheckResult').textContent).toContain('food has changed');expect($('foodCheckWaitHelp').textContent).toContain('both vessels');
  expect($('sauceReplayCurrent').textContent).toContain('Earlier observation');
 });
 it('honors the ordinary earlier timer and still requires a deliberate fresh check',()=>{
  record();timers.pan=C.create(state.time,15);$('foodCheckWait30').click();
  expect(state.time).toBe(15);expect(R.inspections(state)).toHaveLength(1);
  $('foodCheckEquivalent').click();expect(R.inspections(state)).toHaveLength(2);expect(S.reading(state).stale).toBe(false);
 });
 it('does not allow a wait to mutate recorded, finished, serving, or hidden kitchens',()=>{
  record();render(true);$('foodCheckWait30').click();expect(host.apply).not.toHaveBeenCalled();
  render(false,'pot');$('foodCheckWait30').click();expect(host.apply).not.toHaveBeenCalled();
  render();state=R.act(state,'servePortion',0);render();$('foodCheckWait30').click();expect(host.apply).not.toHaveBeenCalled();
  state={...state,plated:true};render();$('foodCheckWait30').click();expect(host.apply).not.toHaveBeenCalled();
 });
 it('keeps earlier sauce models on their existing workflow',()=>{
  state=R.restore({...R.startRescue('dry',0),sauceModel:1});record();
  expect($('foodCheckWait').hidden).toBe(true);$('foodCheckWait30').click();expect(host.apply).not.toHaveBeenCalled();
 });
 it('retains recorded spoon cues after water moves into pasta and reveals the change only on a new check',()=>{
  record();const observed=$('foodCheckResult').textContent,first=R.inspections(state)[0];
  $('foodCheckWait30').click();expect(R.inspections(state)[0]).toEqual(first);expect($('foodCheckResult').textContent).toContain(observed);
  expect($('foodCheckResult').textContent).not.toMatch(/absorbedWaterMl|coolingFactor|dispersion|starchPercent/);
 });
});
describe('Water distribution in completed rescue comparisons',()=>{
 function attempt(wait){let s=R.startRescue('holding',0,'demonstrate');s=R.act(R.act(s,'pour',50),'stirSweep','button');s=R.act(s,'taste');if(wait){s=R.act(s,'advance',60);s=R.act(s,'advance',60);s=R.act(s,'taste');}s=R.act(R.act(s,'servePortion',0),'returnPortion',0);s=R.act(R.act(s,'taste'),'plate');return R.submit({...s,answers:[0,null]});}
 it('exports detached water distribution and preserves historical values in each frame',()=>{
  const a=attempt(false),b=attempt(true),comparison=M.compare(a,b),before=JSON.stringify([a,b]);
  expect(comparison.sauceModel).toBe(2);expect(comparison.b.chemistry.absorbedWaterMl).toBeGreaterThan(comparison.a.chemistry.absorbedWaterMl);
  expect(M.frame(b,0).chemistry.absorbedWaterMl).toBe(0);expect(M.frame(b,b.log.length).chemistry.absorbedWaterMl).toBe(comparison.b.chemistry.absorbedWaterMl);
  comparison.b.chemistry.absorbedWaterMl=999;
  const inspection=comparison.b.actions.find(action=>action.inspection),transfer=comparison.b.actions.find(action=>action.transfer);
  expect(inspection).toBeTruthy();expect(transfer).toBeTruthy();inspection.inspection.chemistry.absorbedWaterMl=999;transfer.transfer.spoonfuls=999;
  expect(JSON.stringify([a,b])).toBe(before);
 });
 it('shows the modeled destinations only in the completed comparison workspace',()=>{
  ui.dispose();ui=null;document.body.innerHTML='<div class="recipe-layout"></div><div class="evidence-actions"></div><button id="retryRescue"></button>';
  const attempts=[attempt(false),attempt(true)];window.KitchenRecipeCompare=M;HTMLElement.prototype.scrollIntoView=vi.fn();
  window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_compare_ui.js','utf8'));
  window.KitchenRecipeComparisonUI.mount({getAttempts:()=>attempts,onOpen:vi.fn(),onPractice:vi.fn()});$('compareRescues').click();
  expect($('compareBody').textContent).toContain('Free sauce water:');expect($('compareBody').textContent).toContain('Water absorbed by pasta:');expect($('compareBody').textContent).toContain('Water evaporated from the sauce:');
  expect($('compareBody').textContent).not.toMatch(/NaN|undefined/);
 });
});
