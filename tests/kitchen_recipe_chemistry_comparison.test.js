import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const originalScroll=HTMLElement.prototype.scrollIntoView;
function attempt(){let s=R.startRescue('dry',0,'demonstrate');s=R.act(R.act(s,'taste'),'plate');return R.submit({...s,answers:[0,null]});}
function legacyAttempt(){const s=attempt();delete s.sauceModel;delete s.sauceObservationModel;delete s.mixingModel;delete s.thermalModel;return R.restore(s);}

afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks();if(originalScroll)HTMLElement.prototype.scrollIntoView=originalScroll;else delete HTMLElement.prototype.scrollIntoView;});
describe('Sauce model comparison boundaries',()=>{
 it('explains why legacy and composition-based outcomes cannot be compared',()=>{
  const a=legacyAttempt(),b=attempt();
  expect(M.compare(a,b)).toBeNull();expect(M.incompatibility(a,b)).toContain('different sauce models');
  expect(M.incompatibility(a,b)).toContain('Record another attempt');
  expect(M.compare(a,legacyAttempt())).not.toBeNull();
 });
 it('keeps earlier composition outcomes separate from the absorption model',()=>{
  const current=attempt(),earlier=R.restore({...attempt(),sauceModel:1});
  expect(M.compare(earlier,current)).toBeNull();expect(M.incompatibility(earlier,current)).toContain('different sauce models');
  expect(M.incompatibility(earlier,current)).not.toContain('moisture-only');
  const another=R.restore({...attempt(),sauceModel:1});expect(M.compare(earlier,another).a.chemistry).not.toBeNull();
 });
 it('shows the incompatibility in the comparison workspace and disables export',()=>{
  const attempts=[legacyAttempt(),attempt()];
  document.body.innerHTML='<div class="recipe-layout"></div><div class="evidence-actions"></div><button id="retryRescue"></button>';
  window.KitchenRecipes=R;window.KitchenRecipeCompare=M;
  HTMLElement.prototype.scrollIntoView=vi.fn();
  new Function(readFileSync('stem_lab/kitchen_studio/recipe_lab_compare_ui.js','utf8'))();
  window.KitchenRecipeComparisonUI.mount({getAttempts:()=>attempts,onOpen:vi.fn(),onPractice:vi.fn()});
  document.getElementById('compareRescues').click();
  expect(document.getElementById('compareUnavailable').hidden).toBe(false);
  expect(document.getElementById('compareUnavailable').textContent).toContain('different sauce models');
  expect(document.getElementById('compareBody').hidden).toBe(true);
  expect(document.getElementById('downloadRescueComparison').disabled).toBe(true);
 });
 it('exports detached composition evidence and reconstructs chemistry at each recorded step',()=>{
  const a=attempt(),b=attempt(),before=JSON.stringify([a,b]),comparison=M.compare(a,b);
  expect(comparison.sauceModel).toBe(2);expect(comparison.a.chemistry.waterMl).toBe(a.pan.moisture);
  expect(M.frame(a,0).chemistry.type).toBe('dry');comparison.a.chemistry.observation='Changed copy';
  expect(JSON.stringify([a,b])).toBe(before);
 });
});
