import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let root;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);resetStemLab();document.body.innerHTML='<div id="root"></div>';loadTool('stem_lab/stem_tool_ratios.js','ratioLab');});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;vi.restoreAllMocks();vi.unstubAllGlobals();});
const model=(...args)=>window.RatioLabPure.buildUnitComparison(...args);
async function mount(patch={}){
  let latest;const awardXP=vi.fn(),callGemini=vi.fn();
  function App(){const[state,setState]=React.useState({_ratioLab:{mode:'unitRates',...patch}});latest=state;return window.StemLab._registry.ratioLab.render(makeCtx({toolData:state,setToolData:setState,awardXP,callGemini}));}
  root=ReactDOMClient.createRoot(document.getElementById('root'));await React.act(()=>root.render(React.createElement(App)));
  return {state:()=>latest._ratioLab,awardXP,callGemini};
}
const panel=()=>document.querySelector('[data-unit-comparison]');
async function click(label){const el=[...panel().querySelectorAll('button')].find(el=>el.textContent.trim()===label);expect(el,label).toBeTruthy();await React.act(()=>el.click());}
async function check(selector){const el=panel().querySelector(selector);expect(el).toBeTruthy();await React.act(()=>el.click());}
async function enter(label,value){const el=panel().querySelector('input[aria-label="'+label+'"]');expect(el).toBeTruthy();await React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});return el;}

describe('unit comparison mathematics',()=>{
  it('normalizes package prices and preserves the contrary sticker-price comparison',()=>{
    const result=model(12,3.6,20,5.4,10);expect(result).toMatchObject({ok:true,rates:[0.3,0.27],winner:'b',stickerWinner:'a',widths:[100,90]});expect(result.costs[0]).toBeCloseTo(3,12);expect(result.costs[1]).toBeCloseTo(2.7,12);
  });
  it.each([0.01,1,12,20,1000000])('preserves the ordering at shared quantity %s',q=>{const result=model(12,3.6,20,5.4,q);expect(result.winner).toBe('b');expect(result.costs[1]/result.costs[0]).toBeCloseTo(0.9,12);});
  it('recognizes equal decimal unit prices from different packages',()=>{const result=model(6,2.4,15,6,30);expect(result.winner).toBe('same');expect(result.costs[0]).toBeCloseTo(12,12);expect(result.costs[1]).toBeCloseTo(12,12);});
  it('normalizes fractional quantities without rounding them into whole packages',()=>{expect(model(0.5,2,1.5,5.25,2)).toMatchObject({rates:[4,3.5],costs:[8,7],winner:'b'});});
  it('draws zero cost as zero length including two free options',()=>{expect(model(4,0,10,1.5,10)).toMatchObject({winner:'a',widths:[0,100]});expect(model(4,0,10,0,10)).toMatchObject({winner:'same',widths:[0,0],maximum:0});});
  it('distinguishes close rates before display rounding and expands display precision',()=>{const result=model(1,1.0001,1,1.0002,1);expect(result.winner).toBe('a');expect(result.rateEvidence.displays[0]).not.toBe(result.rateEvidence.displays[1]);expect(result.costEvidence.displays[0]).not.toBe(result.costEvidence.displays[1]);});
  it('retains small nonzero cost evidence',()=>{const result=model(1000000,1,1000000,2,0.01);expect(result.winner).toBe('a');expect(result.costs[0]).toBe(1e-8);expect(result.costEvidence.displays).toEqual(['1e-8','2e-8']);});
  it.each([[0,1,2,1,1,'quantity'],[1,1,2,1,0,'quantity'],[-1,1,2,1,1,'range'],[1,Infinity,2,1,1,'range'],[1,1,2,1,1000001,'range'],[Number.MIN_VALUE,1,1,1,1,'scale'],[1000000,Number.MIN_VALUE,1,1,1,'scale']])('withholds invalid/extreme model %s %s %s %s %s',(a,c,b,d,q,reason)=>expect(model(a,c,b,d,q)).toEqual({ok:false,reason}));
});

describe('unit comparison learning flow',()=>{
  it('connects both quantities through unitization and shows a common cost scale',async()=>{
    await mount();await click('Use A quantity');const rows=panel().querySelectorAll('[data-unit-scaling]');
    expect(rows[0].textContent).toContain('12 units ↔ $3.6');expect(rows[1].textContent).toContain('÷ 20 → both quantities');expect(rows[1].textContent).toContain('× 12 → both quantities');expect(rows[1].textContent).toContain('12 units ↔ $3.24');
    expect(parseFloat(panel().querySelector('[data-unit-cost-bar="1"]').style.width)).toBeCloseTo(90,10);expect(panel().textContent).toContain('Buying only whole packages');expect(panel().querySelector('[data-unit-package-insight]')).not.toBeNull();
  });
  it('withholds rates, verdict, scaling rows, and bar values during optional prediction',async()=>{
    const app=await mount();await check('input[type="checkbox"]');expect(panel().querySelector('[data-unit-worked-model]')).toBeNull();expect(panel().querySelector('[data-unit-verdict]')).toBeNull();expect(panel().querySelector('[data-unit-rate-card]')).toBeNull();expect(panel().textContent).not.toContain('$0.27');
    await check('input[name="unit-rate-prediction"][value="b"]');await click('Check prediction');expect(panel().querySelector('[data-unit-prediction-feedback]').textContent).toContain('Prediction confirmed');expect(panel().querySelector('[data-unit-normalized]')).not.toBeNull();expect(app.awardXP).not.toHaveBeenCalled();expect(app.callGemini).not.toHaveBeenCalled();
  });
  it('gives corrective feedback without scoring and supports an unscored worked reveal',async()=>{
    const app=await mount({unitPredictFirst:true});await check('input[value="a"]');await click('Check prediction');expect(panel().querySelector('[data-unit-prediction-feedback]').textContent).toContain('Revisit your prediction');
    await click('Show the comparison');expect(panel().querySelector('[data-unit-prediction-feedback]').textContent).not.toContain('confirmed');expect(app.state().unitPredictionChecked.choice).toBeNull();expect(app.awardXP).not.toHaveBeenCalled();
  });
  it('clears checked evidence after package edits but keeps it when scaling both options',async()=>{
    const app=await mount({unitPredictFirst:true});await click('Show the comparison');await click('Use B quantity');expect(panel().querySelector('[data-unit-normalized]')).not.toBeNull();
    await enter('Option A cost in dollars','9');expect(app.state().unitPredictionChecked).toBeNull();expect(panel().querySelector('[data-unit-normalized]')).toBeNull();
  });
  it('does not reuse a saved reveal for different values',async()=>{await mount({unitPredictFirst:true,unitPredictionChecked:{key:'12|3.6|20|5.4',choice:'b'},costA:9});expect(panel().querySelector('[data-unit-rate-card]')).toBeNull();});
  it('preserves incomplete or invalid package drafts through blur and another edit',async()=>{
    const app=await mount();const el=await enter('Option A quantity','');await React.act(()=>{el.focus();el.blur();});await enter('Option B cost in dollars','7');expect(el.value).toBe('');expect(app.state().amountADraft).toBe('');expect(panel().querySelector('[data-unit-normalized]')).toBeNull();
    await enter('Option A quantity','-2');await React.act(()=>{el.focus();el.blur();});expect(el.value).toBe('-2');expect(el.getAttribute('aria-invalid')).toBe('true');await enter('Option A quantity','0.5');expect(panel().querySelector('[data-unit-normalized]')).not.toBeNull();
  });
  it('explains zero quantities and disables a prediction check while retaining valid free options',async()=>{
    await mount({amountA:0,unitPredictFirst:true,unitPredictionChoice:'a'});expect(panel().textContent).toContain('Enter an amount greater than zero');expect([...panel().querySelectorAll('button')].find(b=>b.textContent==='Check prediction').disabled).toBe(true);
    await enter('Option A quantity','4');await enter('Option A cost in dollars','0');await check('input[value="a"]');await click('Check prediction');expect(panel().querySelector('[data-unit-cost-bar="0"]').style.width).toBe('0%');
  });
  it('withholds only the normalized model while its comparison quantity is unfinished',async()=>{
    await mount();const el=await enter('Quantity to compare for both options','0');await React.act(()=>{el.focus();el.blur();});expect(el.value).toBe('0');expect(panel().querySelector('[data-unit-normalized]')).toBeNull();expect(panel().querySelector('[data-unit-verdict]').textContent).toContain('Option B has the lower');
    await click('1 unit');expect(panel().querySelector('[data-unit-normalized]')).not.toBeNull();
  });
  it('resets examples and unfinished fields while preserving prediction preference',async()=>{
    const app=await mount({unitPredictFirst:true});await enter('Option A quantity','');await click('Same unit price');expect(app.state().amountADraft).toBeNull();expect(app.state().unitPredictFirst).toBe(true);expect(panel().querySelector('[data-unit-normalized]')).toBeNull();await check('input[value="same"]');await click('Check prediction');expect(panel().querySelector('[data-unit-verdict]').textContent).toContain('same cost per unit');
    await click('An option with zero cost');expect(panel().querySelector('[data-unit-normalized]')).toBeNull();
  });
});
