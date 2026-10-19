// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js'),F=require('../stem_lab/kitchen_studio/recipe_lab_folding.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
let state,ui,host;const $=id=>document.getElementById(id);
function render(historical=false,active=true){ui.render(state,historical,active);}
function amount(n){$('plainWaterAmount').value=String(n);$('plainWaterAmount').dispatchEvent(new Event('input',{bubbles:true}));}
beforeEach(()=>{
 document.body.innerHTML='<section id="pourPanel"><div class="pour-heading"></div></section>';window.KitchenRecipes=R;
 for(const f of ['recipe_lab_dilution.js','recipe_lab_ingredients.js','recipe_lab_quests.js'])window.eval(readFileSync('stem_lab/kitchen_studio/'+f,'utf8'));
 state=R.startRescue('starchy',0,'demonstrate');host={container:$('pourPanel'),getState:()=>state,pause:vi.fn(),cancel:vi.fn(),ended:()=>state.plated||state.submitted,apply:vi.fn((a,v,m)=>{state=R.act(state,a,v,m);render();})};
 ui=window.KitchenDilutionWater.mount(host);render();
});
afterEach(()=>{if(ui)ui.dispose();ui=null;vi.restoreAllMocks();document.body.replaceChildren();});
describe('Independent finite water choices',()=>{
 it('labels both finite supplies without revealing diagnostic chemistry',()=>{
  expect($('dilutionSavedRemaining').textContent).toBe('150 mL remaining');expect($('dilutionPlainRemaining').textContent).toBe('250 mL remaining');
  expect($('dilutionSavedName').textContent).toMatch(/cooking water/i);expect($('dilutionPlainName').textContent).toMatch(/plain/i);
  expect($('dilutionWaterPanel').textContent).not.toMatch(/4%|6\.7|starchPercent|viscosity|coating: true|correct choice/i);ui.focus();expect(document.activeElement.id).toBe('dilutionWaterTitle');
 });
 it('previews amounts without changing evidence and pours only from the named plain vessel',()=>{
  const before=JSON.stringify(state);amount(70);expect(JSON.stringify(state)).toBe(before);expect($('plainWaterPreview').textContent).toContain('180 mL plain water would remain');
  $('pourPlainWater').click();expect(host.cancel).toHaveBeenCalledOnce();expect(host.pause).toHaveBeenCalledOnce();expect(host.apply).toHaveBeenCalledExactlyOnceWith('pourPlain',70,'keyboard');
  expect(state.pot.plainWater).toBe(180);expect(state.pot.reserve).toBe(150);expect(state.pan.plainWaterAdded).toBe(70);expect(state.time).toBe(0);expect(R.inspections(state)).toEqual([]);
  expect($('plainWaterFeedback').textContent).toContain('70');
 });
 it('adapts the last dose to the remaining supply and disables empty pours',()=>{
  amount(100);$('pourPlainWater').click();$('pourPlainWater').click();expect($('plainWaterAmount').max).toBe('50');expect($('pourPlainWater').textContent).toBe('Pour 50 mL plain water');$('pourPlainWater').click();
  expect(state.pot.plainWater).toBe(0);expect($('pourPlainWater').disabled).toBe(true);const before=JSON.stringify(state);$('pourPlainWater').click();expect(JSON.stringify(state)).toBe(before);
 });
 it('keeps replay, inactive, serving, finished and obsolete views read-only',()=>{
  render(true);$('pourPlainWater').click();render(false,false);$('pourPlainWater').click();expect(host.apply).not.toHaveBeenCalled();
  render();state=R.act(state,'taste');$('pourPlainWater').click();expect(host.apply).not.toHaveBeenCalled();render();state.pan.moisture+=1;$('pourPlainWater').click();expect(host.apply).not.toHaveBeenCalled();
  state=R.act(state,'servePortion',0);render();$('pourPlainWater').click();expect(host.apply).not.toHaveBeenCalled();state={...state,plated:true};render();$('pourPlainWater').click();expect(host.apply).not.toHaveBeenCalled();
 });
 it('does not apply a pour if cancelling a different gesture changes the cook',()=>{
  host.cancel.mockImplementation(()=>{state=R.act(state,'taste');});$('pourPlainWater').click();expect(host.apply).not.toHaveBeenCalled();expect(state.pot.plainWater).toBe(250);
 });
 it('does not add the new supply to ordinary recipes or earlier rescue models',()=>{
  for(const s of [R.start(),R.startRescue('dry',0),R.restore({...R.startRescue('dry',0),sauceModel:1})]){state=s;render();expect($('dilutionWaterPanel').hidden).toBe(true);$('pourPlainWater').click();}
  expect(host.apply).not.toHaveBeenCalled();
 });
 it('stops responding after disposal',()=>{const button=$('pourPlainWater');ui.dispose();button.click();expect(host.apply).not.toHaveBeenCalled();});
});
describe('Rescue guidance and finished evidence',()=>{
 it('routes both ingredient cards to the water choice panel even when the saved jug is empty',()=>{
  const saved=window.KitchenIngredients.describe(state,'saved'),plain=window.KitchenIngredients.describe(state,'water');
  expect(saved.tool).toBe('pour');expect(plain.tool).toBe('pour');expect(plain.name).toMatch(/plain/i);
  state=R.act(R.act(state,'pour',100),'pour',50);
  expect(window.KitchenIngredients.describe(state,'saved').tool).toBe('pour');expect(window.KitchenIngredients.describe(state,'water').notice).toContain('250 mL');
 });
 it('recognizes a plain-water adjustment in the sauce quest and asks for observations first',()=>{
  let quest=window.KitchenSkillQuests.describe(state,'sauce');expect(quest.next.tool).toBe('check');
  state=R.act(state,'taste');quest=window.KitchenSkillQuests.describe(state,'sauce');expect(quest.next.tool).toBe('pour');
  state=R.act(state,'pourPlain',50);quest=window.KitchenSkillQuests.describe(state,'sauce');expect(quest.steps[1].done).toBe(true);expect(quest.next.tool).toBe('stir');
  state=R.act(R.act(state,'stirSweep','button'),'taste');expect(R.needsMixing(state)).toBe(true);for(let folds=0;R.needsMixing(state)&&folds<8;folds++)state=R.act(R.act(state,'stirSweep','button'),'taste');expect(R.needsMixing(state)).toBe(false);quest=window.KitchenSkillQuests.describe(state,'sauce');expect(quest.steps.every(step=>step.done)).toBe(true);expect(quest.unavailable).toBeUndefined();
 });
 it('includes detached source-specific water evidence in completed comparisons',()=>{
  function finish(action,volume){let s=R.startRescue('starchy',0,'demonstrate');s=R.act(s,'taste');s=R.act(R.act(R.act(s,action,volume),'stirSweep','button'),'taste');s=R.act(s,'plate');return R.submit({...s,answers:[0,null]});}
  const a=finish('pour',50),b=finish('pourPlain',50),before=JSON.stringify([a,b]),comparison=M.compare(a,b);
  expect(comparison.sauceModel).toBe(3);expect(comparison.a.dilution.savedWaterUsed).toBe(50);expect(comparison.b.dilution.plainWaterUsed).toBe(50);expect(comparison.b.dilution.plainWaterRemaining).toBe(200);
  comparison.b.dilution.plainWaterUsed=999;comparison.b.actions.find(a=>a.transfer).transfer.starchG=999;expect(JSON.stringify([a,b])).toBe(before);
 });
 it('preserves historical source-dose receipts before and after a fold in both mixing views',()=>{
  state=R.restore({...state,mixingModel:1});
  window.KitchenPanFolding=F;window.KitchenSauceCheck=S;window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_fold_studio.js','utf8'));
  const native=F.mountPanel({container:host.container,choose:vi.fn()}),studio=window.KitchenFoldStudio.mount({container:host.container,getState:()=>state,pause:vi.fn(),cancelNative:vi.fn(),preview:vi.fn(),check:vi.fn(),apply:vi.fn()});
  function mixingViews(){native.render(state,true,false,null);studio.render(state,false,true);}
  try{
   state=R.act(R.act(state,'pourPlain',50),'pour',20);mixingViews();
   expect($('sceneFoldPlain').textContent).toBe('50 mL');expect($('foldStudioPlain').textContent).toBe('50 mL');expect($('sceneFoldWater').textContent).toBe('20 mL');expect($('foldStudioWater').textContent).toBe('20 mL');
   expect($('sceneFoldWaterLabel').textContent).toContain('Reduced cooking water');expect($('foldStudioPlainRow').hidden).toBe(false);
   state=R.act(state,'stirSweep','button');mixingViews();const receipt=F.lastMix(state),text=$('sceneFoldReceipt').textContent;
   expect(receipt).toMatchObject({water:20,plainWater:50,juice:0});expect($('sceneFoldPlain').textContent).toBe('0 mL');expect($('foldStudioPlain').textContent).toBe('0 mL');
   for(const id of ['sceneFoldReceipt','foldStudioReceipt']){expect($(id).textContent).toContain('20 mL reduced cooking water');expect($(id).textContent).toContain('50 mL plain water');}
   state=R.act(state,'pourPlain',10);mixingViews();expect($('sceneFoldPlain').textContent).toBe('10 mL');expect($('foldStudioPlain').textContent).toBe('10 mL');expect(F.lastMix(state)).toEqual(receipt);expect($('sceneFoldReceipt').textContent).toBe(text);
   state=R.act(R.act(R.restore({...R.startRescue('dry',0),mixingModel:1}),'pour',30),'stirSweep','button');mixingViews();expect(F.lastMix(state)).not.toHaveProperty('plainWater');expect($('sceneFoldPlainRow').hidden).toBe(true);expect($('foldStudioPlainRow').hidden).toBe(true);
   expect($('sceneFoldReceipt').textContent).toBe('Last mix incorporated 30 mL saved water and 0 mL released juice. '+state.log.at(-1).observation);expect($('foldStudioReceipt').textContent).toBe('Last mix spread 30 mL saved water and 0 mL released juice. '+state.log.at(-1).observation);
  }finally{native.dispose();studio.dispose();}
 });
});
