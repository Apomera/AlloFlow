// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),Changes=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js'),Sampling=require('../stem_lab/kitchen_studio/recipe_lab_sampling.js');
const $=id=>document.getElementById(id);
let state,ui;
function render(historical=false){ui.render(state,historical,true);}
function select(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function entries(s=state){return s.log.map((entry,index)=>({entry,index})).filter(({entry})=>entry.accepted&&entry.inspection?.kind==='sauce');}
function addCheck(s,amount){return R.act(R.act(R.act(s,'pour',amount),'stirSweep','button'),'taste');}
function threeChecks(mode='practice'){return addCheck(addCheck(R.act(R.startRescue('dry',0,mode),'taste'),50),20);}
function mountReplay(){window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));ui=window.KitchenSauceReplay.mount({container:$('replayHost')});}
beforeEach(()=>{
 document.body.innerHTML='<div id="replayHost"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenSauceChanges=Changes;window.KitchenSampling=Sampling;
 Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});
 vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 mountReplay();state=threeChecks();render();
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();document.body.replaceChildren();delete window.KitchenSauceChanges;});
describe('Choose a recorded comparison without changing the cook',()=>{
 it('defaults to the latest two and identifies timed checks by order and log index',()=>{
  const checks=entries();expect($('sauceReplayEarlier').value).toBe('previous');expect($('sauceReplayLater').value).toBe('latest');expect($('sauceReplayLatestPair').disabled).toBe(true);
  expect($('sauceReplayPrevious').dataset.checkIndex).toBe(String(checks[1].index));expect($('sauceReplayCurrent').dataset.checkIndex).toBe(String(checks[2].index));
  expect($('sauceReplayEarlier').options[1].textContent).toContain('Check 1 · 0:00');expect($('sauceReplayEarlier').options[2].textContent).toContain('Check 2 · 0:06');
  expect($('sauceChangesWater').textContent).toContain('Saved cooking water added20 mL');
 });
 it('keeps distinct selector choices for read-only checks at the same clock time',()=>{
  state=R.startRescue('dry',0,'practice');for(let i=0;i<3;i++)state=R.act(state,'taste');render();
  expect(entries().map(c=>c.entry.time)).toEqual([0,0,0]);
  expect($('sauceReplayEarlier').options[1].textContent).toContain('Check 1 · 0:00');expect($('sauceReplayEarlier').options[2].textContent).toContain('Check 2 · 0:00');
  expect($('sauceReplayPrevious').dataset.checkIndex).toBe('1');expect($('sauceReplayCurrent').dataset.checkIndex).toBe('2');
 });
 it('pins an earlier baseline across more checks and includes every intervening adjustment in the ledger',()=>{
  const baseline=entries()[0].index,before=JSON.stringify(state);select('sauceReplayEarlier',baseline);expect(JSON.stringify(state)).toBe(before);
  expect($('sauceReplayPrevious').querySelector('h5').textContent).toBe('Reference check');expect($('sauceChangesWater').textContent).toContain('Saved cooking water added70 mL');
  state=addCheck(state,10);render();expect($('sauceReplayEarlier').value).toBe(String(baseline));expect($('sauceReplayPrevious').dataset.checkIndex).toBe(String(baseline));expect($('sauceReplayCurrent').dataset.checkIndex).toBe(String(entries().at(-1).index));expect($('sauceChangesWater').textContent).toContain('Saved cooking water added80 mL');
 });
 it('holds a selected later endpoint as further actions and checks occur, with a precise older-pair notice',()=>{
  const checks=entries();select('sauceReplayLater',checks[1].index);const beforeWater=$('sauceChangesWater').textContent,beforeContext=$('sauceChangesContext').textContent;
  expect($('sauceReplayPrevious').dataset.checkIndex).toBe(String(checks[0].index));expect($('sauceReplayCurrent').querySelector('h5').textContent).toBe('Selected later check');expect($('sauceChangesStale').textContent).toContain('Newer checks exist');
  state=R.act(state,'advance',30);render();expect($('sauceChangesStale').textContent).not.toContain('dish has changed since the latest check');
  state=R.act(state,'taste');render();expect($('sauceReplayLater').value).toBe(String(checks[1].index));expect($('sauceChangesWater').textContent).toBe(beforeWater);expect($('sauceChangesContext').textContent).toBe(beforeContext);
 });
 it('returns both selectors to following the latest two through one reset',()=>{
  const checks=entries();select('sauceReplayEarlier',checks[0].index);select('sauceReplayLater',checks[1].index);$('sauceReplayLatestPair').click();
  expect($('sauceReplayEarlier').value).toBe('previous');expect($('sauceReplayLater').value).toBe('latest');expect($('sauceReplayPrevious').dataset.checkIndex).toBe(String(checks[1].index));expect($('sauceReplayCurrent').dataset.checkIndex).toBe(String(checks[2].index));expect($('sauceChangesWater').textContent).toContain('Saved cooking water added20 mL');
 });
 it('offers only ordered, distinct endpoints and uses actual log indices rather than timestamps or check numbers',()=>{
  const checks=entries();expect(checks.map(c=>c.index)).toEqual([0,3,6]);select('sauceReplayEarlier',3);
  expect(Array.from($('sauceReplayLater').options).map(o=>o.value)).toEqual(['latest','6']);select('sauceReplayEarlier','previous');select('sauceReplayLater',3);
  expect(Array.from($('sauceReplayEarlier').options).map(o=>o.value)).toEqual(['previous','0']);expect($('sauceChangesInterval').textContent).toContain('recorded actions 1 and 4');
 });
 it('retains the selected snapshots after live adjustments and changes neither time, checks, criteria nor stored evidence',()=>{
  select('sauceReplayEarlier',entries()[0].index);const water=$('sauceChangesWater').textContent,reference=$('sauceReplayPrevious').textContent;
  state=R.act(state,'pour',10);const before=JSON.stringify(state),criteria=R.criteria(state);render();expect($('sauceChangesWater').textContent).toBe(water);expect($('sauceReplayPrevious').textContent).toBe(reference);expect($('sauceChangesStale').textContent).toContain('still ends at that recorded check');
  $('sauceReplayTime').value='1';$('sauceReplayTime').dispatchEvent(new Event('input'));expect(R.criteria(state)).toEqual(criteria);expect(JSON.stringify(state)).toBe(before);
 });
 it('resets references for a new cook, a restored cook, and entering or leaving a historical replay',()=>{
  const pin=()=>select('sauceReplayEarlier',entries()[0].index);pin();state=threeChecks();render();expect($('sauceReplayEarlier').value).toBe('previous');
  pin();state=R.restore(state);render();expect($('sauceReplayEarlier').value).toBe('previous');pin();render(true);expect($('sauceReplayEarlier').value).toBe('previous');pin();render();expect($('sauceReplayEarlier').value).toBe('previous');
 });
 it('keeps chosen observations available in demonstrate while clearing diagnostic content until submission',()=>{
  state=threeChecks('demonstrate');render();select('sauceReplayEarlier',entries()[0].index);expect($('sauceReplayPrevious').dataset.type).toBe('dry');expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceChangesBody').textContent).toBe('');
  state=R.submit({...R.act(state,'plate'),answers:[0,null]});render();expect($('sauceChangesLedger').hidden).toBe(false);expect($('sauceChangesWater').textContent).toContain('Saved cooking water added70 mL');
 });
 it('uses selected trail duration and resets the timeline when the pair changes',()=>{
  const records=entries();records[0].entry.inspection.closureSeconds=4;render();expect($('sauceReplayTime').max).toBe('3');select('sauceReplayEarlier',records[0].index);expect($('sauceReplayTime').max).toBe('4');
  $('sauceReplayTime').value='4';$('sauceReplayTime').dispatchEvent(new Event('input'));$('sauceReplayLatestPair').click();expect($('sauceReplayTime').max).toBe('3');expect($('sauceReplayTime').value).toBe('0.00');
 });
 it('hides endpoint controls until there are two checks and safely clears pinning when checks disappear',()=>{
  select('sauceReplayEarlier',entries()[0].index);state=R.startRescue('dry',0);render();expect($('sauceReplaySelectionControls').hidden).toBe(true);expect($('sauceReplayEarlier').disabled).toBe(true);expect($('sauceReplayCurrent').dataset.checkIndex).toBeUndefined();
  state=R.act(state,'taste');render();expect($('sauceReplaySelectionControls').hidden).toBe(true);state=addCheck(state,50);render();expect($('sauceReplaySelectionControls').hidden).toBe(false);expect($('sauceReplayEarlier').value).toBe('previous');
 });
});
describe('Observed body and oil beads are independent evidence',()=>{
 function observation(bodyType='thick'){return {kind:'sauce',type:'separated',bodyType,label:'Oil beads remain',time:0,closureSeconds:4,observation:'Thick patches and separate oil droplets.',chemistry:{bodyType,oilDroplets:true,flowText:'The spoon trail closes slowly.',coatingText:'Thick patches cling to the spoon.',separationText:'Separate oil droplets remain.'}};}
 it('draws thick patches and oil beads together without thin drips in a recorded replay',()=>{
  state=R.act(R.startRescue('dry',0),'taste');state.log.at(-1).inspection=observation();render();const card=$('sauceReplayCurrent');expect(S.cues(S.reading(state))).toMatchObject({thin:false,patches:true,oilDroplets:true});expect(card.querySelector('.sauce-replay-coating-patches')).not.toBeNull();expect(card.querySelector('.sauce-replay-oil-droplets')).not.toBeNull();expect(card.querySelector('.sauce-replay-drip')).toBeNull();expect($('sauceReplayTime').max).toBe('4');
 });
 it('keeps body fallback compatible with older separated records and top-level new snapshots',()=>{
  const old={type:'separated',closureSeconds:.5};expect(S.cues(old)).toMatchObject({thin:true,patches:false,oilDroplets:true,coating:'Oil beads interrupt the coating'});
  expect(S.cues({...old,bodyType:'coating'})).toMatchObject({thin:false,patches:false,oilDroplets:true,coating:'An even layer stays'});
  expect(S.cues({...old,bodyType:'dry'})).toMatchObject({thin:false,patches:true,oilDroplets:true});
 });
 it('preserves the unmixed observation instead of revealing an underlying body assessment',()=>{
  expect(S.cues({...observation(),type:'unmixed',closureSeconds:.5})).toMatchObject({thin:true,patches:false,track:'Closes quickly',coating:'Thin liquid runs off',oilDroplets:true});
 });
 it('uses the same independent evidence in the keyboard inspection artwork and retains it after unobserved changes',()=>{
  ui.dispose();document.body.innerHTML='<nav id="sauceTools"></nav>';for(const name of ['recipe_lab_sample_studio.js','recipe_lab_inspection.js'])window.eval(readFileSync('stem_lab/kitchen_studio/'+name,'utf8'));
  state=R.act(R.startRescue('dry',0),'taste');state.log.at(-1).inspection=observation();ui=window.KitchenRecipeInspection.mount({getState:()=>state,pause:vi.fn(),cancelNative:vi.fn(),ended:()=>false,selectTool:vi.fn(),apply:vi.fn()});
  ui.render(state,'pan',false,true);expect($('foodCheckCoatPatches').style.display).toBe('');expect($('foodCheckCoatLayer').style.display).toBe('none');expect($('foodCheckDrip').style.display).toBe('none');expect($('foodCheckOilCoat').style.display).toBe('');
  state=R.act(state,'pour',50);ui.render(state,'pan',false,true);expect($('foodCheckCoatPatches').style.display).toBe('');expect($('foodCheckDrip').style.display).toBe('none');expect($('foodCheckOilCoat').style.display).toBe('');
 });
});
