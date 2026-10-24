// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const $=id=>document.getElementById(id);
const act=(s,steps)=>steps.reduce((v,[a,n])=>R.act(v,a,n),s);
const warm=(mode='practice')=>act(R.startRescue('cooled',0,mode),[['taste'],['panHeat',1],['advance',45],['panHeat',0],['taste']]);
let state,ui;
function render(historical=false){ui.render(state,historical,true);}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
beforeEach(()=>{
 document.body.innerHTML='<div id="host"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenSauceChanges=C;
 Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});
 vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));ui=window.KitchenSauceReplay.mount({container:$('host')});
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();document.body.replaceChildren();});
describe('Recorded sauce body and temperature evidence',()=>{
 it('shows warming lowering body while water uptake increases the composition contribution',()=>{
  state=warm();const before=JSON.stringify(state);render();const checks=R.inspections(state),a=checks[0].chemistry,b=checks[1].chemistry;
  expect(b.waterMl).toBeLessThan(a.waterMl);expect(b.starchG).toBe(a.starchG);expect(b.warmViscosity).toBeGreaterThan(a.warmViscosity);expect(b.coolingFactor).toBeLessThan(a.coolingFactor);expect(b.viscosity).toBeLessThan(a.viscosity);
  for(const c of [a,b])expect(c.viscosity).toBeCloseTo(c.warmViscosity*c.coolingFactor,10);
  const text=$('sauceChangesBodyContext').textContent;for(const c of [a,b])for(const value of [c.warmViscosity,c.coolingFactor,c.viscosity])expect(text).toContain(String(Number(value.toFixed(2))));
  expect($('sauceChangesBodyHelp').textContent).toContain('not measured viscosity units');expect($('sauceChangesWater').textContent).toContain('Saved cooking water added0 mL');expect(JSON.stringify(state)).toBe(before);
 });
 it('keeps a chosen comparison fixed through later cooling and unobserved changes',()=>{
  state=warm();const checks=C.checks(state);state=act(state,[['advance',60],['taste']]);render();choose('sauceReplayEarlier',checks[0].index);choose('sauceReplayLater',checks[1].index);
  const table=$('sauceChangesBodyContext').textContent,water=$('sauceChangesWater').textContent;
  state=R.act(state,'pour',20);const before=JSON.stringify(state);render();
  expect($('sauceChangesBodyContext').textContent).toBe(table);expect($('sauceChangesWater').textContent).toBe(water);expect($('sauceChangesStale').textContent).toContain('Newer checks exist');expect(JSON.stringify(state)).toBe(before);
  $('sauceReplayLatestPair').click();expect($('sauceChangesBodyContext').textContent).not.toBe(table);
 });
 it('keeps the decomposition out of demonstrate until evidence is submitted',()=>{
  state=warm('demonstrate');render(true);expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceChangesBodyContext')).toBeNull();
  state=R.act(state,'plate');render();expect($('sauceChangesBodyContext')).toBeNull();
  state=R.submit({...state,answers:[R.rescueDefinition('cooled').correct,null]});const before=JSON.stringify(state);render();
  expect($('sauceChangesLedger').hidden).toBe(false);expect($('sauceChangesBodyContext')).not.toBeNull();expect(JSON.stringify(state)).toBe(before);
 });
 it('leaves absent historical temperature contributions unknown',()=>{
  state=act(R.startRescue('dry',0),[['taste'],['pour',50],['stirSweep','button'],['taste']]);
  state=R.restore({...state,sauceModel:1});render();expect($('sauceChangesBodyContext')).toBeNull();
  state=warm();delete state.log[0].inspection.chemistry.coolingFactor;delete state.log[0].inspection.chemistry.warmViscosity;render();expect($('sauceChangesBodyContext').textContent).toContain('Not recorded');
 });
 it('exports detached observed cooling comparisons without attributing all change to heat',()=>{
  const finish=s=>R.submit({...R.act(s,'plate'),answers:[R.rescueDefinition('cooled').correct,null]});
  const a=finish(warm('demonstrate')),b=finish(act(R.startRescue('cooled',0,'demonstrate'),[['taste'],['pour',30],['stirSweep','button'],['taste']])),before=JSON.stringify([a,b]),comparison=M.compare(a,b);
  expect(comparison.a.coolingCheck.met).toBe(true);expect(comparison.b.coolingCheck.met).toBe(true);
  expect(comparison.a.coolingCheck.deltas.starchG).toBe(0);expect(comparison.b.coolingCheck.deltas.starchG).toBeGreaterThan(0);
  comparison.a.coolingCheck.before.temperature=999;expect(JSON.stringify([a,b])).toBe(before);expect(M.compare(R.restore(a),R.restore(b))).toEqual(M.compare(a,b));
 });
});
