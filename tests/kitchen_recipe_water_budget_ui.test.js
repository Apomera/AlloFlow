// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),Changes=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const $=id=>document.getElementById(id);
let state,ui,review;
function render(historical=false){ui.render(state,historical,true);}
function pair(mode='practice'){let s=R.act(R.startRescue('dry',2,mode),'taste');s=R.act(s,'pour',50);s=R.act(s,'stirSweep','button');return R.act(s,'taste');}
function side(which){return document.querySelector('#sauceWaterBudget [data-budget-side="'+which+'"]');}
function widths(which){return [...side(which).querySelectorAll('.sauce-water-segment')].map(el=>parseFloat(el.style.width));}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function rendererWater(water){window.KitchenSauceChanges={...Changes,betweenChecks:(s,selection)=>({...Changes.betweenChecks(s,selection),water})};}
function validWater(){return {beforeMl:40,savedAddedMl:20,plainAddedMl:10,juiceAddedMl:30,afterMl:70,absorbedMl:20,evaporatedMl:10,complete:true,balanced:true};}
beforeEach(()=>{
 document.body.innerHTML='<div id="replayHost"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenSauceChanges=Changes;review=false;
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));ui=window.KitchenSauceReplay.mount({container:$('replayHost'),reviewAllowed:()=>review});state=pair();
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();document.body.replaceChildren();delete window.KitchenSauceChanges;});

describe('Recorded water has explicit sources and destinations on one scale',()=>{
 it('shows a real rescue pour, continued evaporation and pasta uptake without changing the kitchen',()=>{
  const before=JSON.stringify(state),water=Changes.betweenChecks(state).water;render();expect(Number($('sauceWaterBudget').dataset.scaleMl)).toBeCloseTo(58);expect(Number(side('sources').dataset.totalMl)).toBe(58);expect(Number(side('destinations').dataset.totalMl)).toBeCloseTo(58);
  const sourceWidths=widths('sources');expect(sourceWidths[0]).toBeCloseTo(8/58*100);expect(sourceWidths[1]).toBeCloseTo(50/58*100);expect(sourceWidths.slice(2)).toEqual([0,0]);expect(widths('destinations').reduce((a,b)=>a+b)).toBeCloseTo(100);
  expect(Number(side('destinations').querySelector('.sauce-water-absorbed').dataset.amountMl)).toBe(water.absorbedMl);expect(water.absorbedMl).toBeGreaterThan(0);expect(water.evaporatedMl).toBeGreaterThan(0);expect(side('destinations').textContent).toContain('still in the dish');expect($('sauceWaterBudgetHelp').textContent).toContain('already part of the free water');expect($('sauceChangesWater')).not.toBeNull();expect(JSON.stringify(state)).toBe(before);
 });
 it('preserves each addition source and each destination without adding pending liquid twice',()=>{
  rendererWater(validWater());render();expect(widths('sources')).toEqual([40,20,10,30]);expect(widths('destinations')).toEqual([70,20,10]);expect(side('sources').querySelectorAll('dl>div')).toHaveLength(4);expect(side('destinations').querySelectorAll('dl>div')).toHaveLength(3);expect($('sauceWaterBudget').textContent).toContain('Juice released from tomatoes30 mL');expect($('sauceWaterBudgetHelp').textContent).toContain('not an extra destination');
 });
 it('shows genuine zero water as empty outlines without a fabricated share',()=>{
  const water=validWater();for(const key of ['beforeMl','savedAddedMl','plainAddedMl','juiceAddedMl','afterMl','absorbedMl','evaporatedMl'])water[key]=0;rendererWater(water);render();expect($('sauceWaterBudget').dataset.scaleMl).toBe('0');expect(widths('sources')).toEqual([0,0,0,0]);expect(widths('destinations')).toEqual([0,0,0]);expect($('sauceWaterBudget').textContent).toContain('No free water, additions, uptake or evaporation');expect($('sauceWaterBudget').outerHTML).not.toMatch(/NaN|Infinity|undefined/);
 });
 it('does not round tiny positive amounts down to an assertion of zero',()=>{
  rendererWater({...validWater(),beforeMl:.01,savedAddedMl:.02,plainAddedMl:0,juiceAddedMl:0,afterMl:.02,absorbedMl:.005,evaporatedMl:.005});render();expect(Number($('sauceWaterBudget').dataset.scaleMl)).toBeCloseTo(.03);expect(side('sources').textContent).toContain('<0.1 mL');expect(widths('destinations').reduce((a,b)=>a+b)).toBeCloseTo(100);expect($('sauceWaterBudget').textContent).not.toContain('No free water');
 });
 it.each(['beforeMl','savedAddedMl','plainAddedMl','juiceAddedMl','afterMl','absorbedMl','evaporatedMl'])('withholds a misleading balance when %s is missing',key=>{
  const water=validWater();delete water[key];rendererWater(water);render();expect($('sauceWaterBudget')).toBeNull();expect($('sauceWaterBudgetUnknown').textContent).toContain('unknown, not zero');expect($('sauceChangesWater')).not.toBeNull();
 });
 it.each([{beforeMl:-1},{savedAddedMl:Infinity},{plainAddedMl:NaN},{juiceAddedMl:'30'},{afterMl:71},{absorbedMl:-1},{evaporatedMl:null},{complete:false},{balanced:false},{beforeMl:Number.MAX_VALUE,savedAddedMl:Number.MAX_VALUE,afterMl:Number.MAX_VALUE}])('independently rejects invalid or unreconciled data %j',bad=>{
  rendererWater({...validWater(),...bad});render();expect($('sauceWaterBudget')).toBeNull();expect($('sauceWaterBudgetUnknown')).not.toBeNull();expect($('sauceWaterBudgetUnknown').textContent).not.toMatch(/NaN|Infinity|undefined/);
 });
 it('tolerates arithmetic roundoff without pretending a larger discrepancy is balanced',()=>{
  rendererWater({...validWater(),afterMl:70+1e-9});render();expect($('sauceWaterBudget')).not.toBeNull();rendererWater({...validWater(),afterMl:70.01});render();expect($('sauceWaterBudget')).toBeNull();
 });
 it('pins both bars to the selected pair after later water additions, checks and live edits',()=>{
  render();const indices=Changes.checks(state).map(c=>c.index);choose('sauceReplayEarlier',indices[0]);choose('sauceReplayLater',indices[1]);const chart=$('sauceWaterBudget').outerHTML;state=R.act(R.act(R.act(state,'pour',20),'advance',30),'taste');state.pan.moisture=500;render();expect($('sauceWaterBudget').outerHTML).toBe(chart);expect($('sauceChangesStale').textContent).toContain('earlier recorded pair');$('sauceReplayTime').value='1';$('sauceReplayTime').dispatchEvent(new Event('input',{bubbles:true}));expect($('sauceWaterBudget').outerHTML).toBe(chart);
 });
 it('withholds the graphic from active and plated demonstrate attempts until submission',()=>{
  state=pair('demonstrate');render();expect($('sauceWaterBudget')).toBeNull();expect($('sauceWaterBudgetUnknown')).toBeNull();state=R.act(state,'plate');render(true);expect($('sauceChangesBody').textContent).toBe('');state=R.submit({...state,answers:[0,null]});render();expect($('sauceWaterBudget')).not.toBeNull();
 });
 it('leaves incomplete historical water destinations unknown',()=>{
  let old={...R.startRescue('dry',2),sauceModel:1};delete old.mixingModel;old=R.restore(old);state=R.act(R.act(R.act(R.act(old,'taste'),'pour',50),'stirSweep','button'),'taste');render();expect($('sauceWaterBudget')).toBeNull();expect($('sauceWaterBudgetUnknown')).not.toBeNull();expect($('sauceChangesWater').textContent).toContain('Not recorded');
 });
 it('has numeric alternatives for every patterned segment and system-color support',()=>{
  render();const figure=$('sauceWaterBudget');expect($(figure.getAttribute('aria-labelledby')).textContent).toBe('Follow the sauce water');for(const row of figure.querySelectorAll('.sauce-water-row')){expect(row.querySelector('.sauce-water-track').getAttribute('aria-hidden')).toBe('true');for(const item of row.querySelectorAll('dl>div'))expect(item.querySelector('dd').textContent).toMatch(/mL$/);}
  const css=readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.css','utf8');expect(css).toContain('.sauce-water-segment,.sauce-water-values i{forced-color-adjust:none}');expect(css).toContain('--water-ink:CanvasText;--water-paper:Canvas');expect(css).toContain('@media(max-width:360px){.sauce-water-budget');
 });
 it('keeps both runtime copies identical',()=>{for(const file of ['recipe_lab_sauce_replay.js','recipe_lab_sauce_replay.css'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));});
});

describe('Recorded starch mass is distinct from concentration and body',()=>{
 it('explains plain-water dilution without inventing starch loss or even mixing',()=>{
  state=R.act(R.startRescue('starchy',2),'taste');state=R.act(R.act(R.act(state,'pourPlain',50),'stirSweep','button'),'taste');const before=JSON.stringify(state);render();const [a,b]=[...document.querySelectorAll('.sauce-starch-snapshot')];expect(a.textContent).toContain('6.67 g starch per 100 mL free water');expect(b.textContent).toContain('3.2 g starch per 100 mL free water');expect($('sauceStarchMassBalance').textContent).toContain('3 g earlier + 0 g added ≈ 3 g later');expect($('sauceStarchSourceConcentrations').textContent).toContain('plain water');expect($('sauceStarchSourceConcentrations').textContent).toContain('source concentration 0 g per 100 mL');expect($('sauceStarchHeterogeneous').textContent).toContain('bulk average');expect($('sauceStarchBudgetHelp').textContent).toContain('Cooling can change body without changing this ratio');expect(JSON.stringify(state)).toBe(before);
 });
 it('shows saved cooking water adding starch as well as water',()=>{
  const model=Changes.starchBudget(state);render();expect(model.added.starchG).toBeGreaterThan(0);expect($('sauceStarchMassBalance').textContent).toContain('0.6 g added');expect($('sauceStarchSourceConcentrations').textContent).toContain('source concentration 1.2 g per 100 mL');expect($('sauceStarchBudgetHelp').textContent).toContain('Oil dispersion is separate');
 });
 it('keeps starch mass visible at zero free water without showing zero concentration',()=>{
  const model=Changes.starchBudget(state);model.before={starchG:2,waterMl:0,concentrationGPer100Ml:null,massKnown:true,concentrationKnown:false,heterogeneous:false};window.KitchenSauceChanges={...Changes,starchBudget:()=>model};render();const card=document.querySelector('.sauce-starch-snapshot[data-check=before]');expect(card.dataset.concentrationKnown).toBe('false');expect(card.textContent).toContain('Starch in sauce: 2 g');expect(card.textContent).toContain('concentration is undefined');expect(card.querySelector('.sauce-starch-concentration').textContent).toBe('Concentration: Not recorded');expect(card.textContent).not.toContain('0 g starch per 100 mL');
 });
 it('shows known check concentrations when a transfer receipt is incomplete, without claiming zero added',()=>{
  delete state.log.find(e=>e.action==='pour').transfer.starchG;render();expect($('sauceStarchBudget')).not.toBeNull();expect(document.querySelector('.sauce-starch-snapshot[data-check=before]').dataset.concentrationKnown).toBe('true');expect($('sauceStarchMassBalance').textContent).toContain('Starch added: Not recorded completely');expect($('sauceStarchMassBalance').textContent).not.toContain('0 g added');expect($('sauceStarchSourceConcentrations').textContent).toContain('Not recorded');
 });
 it('withholds inconsistent concentration numbers and independently checks starch mass balance',()=>{
  const model=Changes.starchBudget(state);model.after.concentrationGPer100Ml=500;model.added.starchG+=2;window.KitchenSauceChanges={...Changes,starchBudget:()=>model};render();expect(document.querySelector('.sauce-starch-snapshot[data-check=after]').dataset.concentrationKnown).toBe('false');expect($('sauceStarchMassBalance').textContent).toContain('do not establish a complete');expect($('sauceStarchMassBalance').textContent).not.toContain('≈');
 });
 it('keeps tiny positive starch distinct from no starch',()=>{
  const model=Changes.starchBudget(state);model.before={starchG:.001,waterMl:100,concentrationGPer100Ml:.001,massKnown:true,concentrationKnown:true,heterogeneous:false};window.KitchenSauceChanges={...Changes,starchBudget:()=>model};render();expect(document.querySelector('.sauce-starch-snapshot[data-check=before]').textContent).toContain('<0.01 g');expect(document.querySelector('.sauce-starch-snapshot[data-check=before]').textContent).not.toContain('0 g');
 });
 it.each(['incomplete','sum'])('does not claim a starch proof when a provider has contradictory %s receipts',bad=>{
  const model=Changes.starchBudget(state);if(bad==='incomplete')model.added.events[0].complete=false;else model.added.events[0].starchG+=1;window.KitchenSauceChanges={...Changes,starchBudget:()=>model};render();expect($('sauceStarchMassBalance').textContent).toContain('Not recorded completely');expect($('sauceStarchMassBalance').textContent).not.toContain('≈');
 });
 it('preserves selected starch evidence while a live pan and later checks change',()=>{
  render();const indices=Changes.checks(state).map(c=>c.index);choose('sauceReplayEarlier',indices[0]);choose('sauceReplayLater',indices[1]);const panel=$('sauceStarchBudget').outerHTML;state=R.act(R.act(R.act(state,'pour',20),'advance',30),'taste');state.pan.chemistry.starchG=99;render();expect($('sauceStarchBudget').outerHTML).toBe(panel);expect($('sauceChangesStale').textContent).toContain('earlier recorded pair');
 });
 it('uses the assessment diagnostics gate and degrades if the optional helper is absent',()=>{
  state=pair('demonstrate');render();expect($('sauceStarchBudget')).toBeNull();state=R.submit({...R.act(state,'plate'),answers:[0,null]});render();expect($('sauceStarchBudget')).not.toBeNull();window.KitchenSauceChanges={checks:Changes.checks,betweenChecks:Changes.betweenChecks};render();expect($('sauceStarchBudget')).toBeNull();expect($('sauceWaterBudget')).not.toBeNull();
 });
});
