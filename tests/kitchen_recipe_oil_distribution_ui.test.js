// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),Changes=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const $=id=>document.getElementById(id);
let state,ui,review;
function render(historical=false){ui.render(state,historical,true);}
function pair(mode='practice'){let s=R.act(R.startRescue('fragile',2,mode),'taste');return R.act(R.act(s,'stirSweep','button'),'taste');}
function records(){return state.log.filter(e=>e.accepted&&e.inspection&&e.inspection.kind==='sauce').map(e=>e.inspection);}
function rows(){return [...document.querySelectorAll('#sauceOilDistribution .sauce-oil-row')];}
function segmentWidths(row){return [...row.querySelectorAll('.sauce-oil-segment')].map(el=>Number.parseFloat(el.style.width));}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
// Renderer-contract fixtures; engine behavior is exercised by the real rescue pair.
function recordedOil(index,total,free){Object.assign(records()[index].chemistry,{oilMl:total,freeOilMl:free,dispersion:total?1-free/total:.9});}
beforeEach(()=>{
 document.body.innerHTML='<div id="replayHost"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenSauceChanges=Changes;review=false;
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));ui=window.KitchenSauceReplay.mount({container:$('replayHost'),reviewAllowed:()=>review});state=pair();
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();document.body.replaceChildren();delete window.KitchenSauceChanges;});

describe('Selected recorded oil amounts share one honest visual scale',()=>{
 it('shows a real fold redistributing constant total oil with explicit amounts and patterns',()=>{
  const before=JSON.stringify(state);render();const [a,b]=rows(),readings=records();expect($('sauceOilDistribution').dataset.scaleMl).toBe('25');
  for(const row of [a,b]){expect(Number(row.dataset.totalMl)).toBe(25);expect(segmentWidths(row).reduce((x,y)=>x+y)).toBeCloseTo(100);expect(row.querySelector('.sauce-oil-track').getAttribute('aria-hidden')).toBe('true');expect(row.querySelector('.sauce-oil-values').textContent).toContain('25 mL total');}
  expect(Number(a.dataset.freeMl)).toBe(readings[0].chemistry.freeOilMl);expect(Number(b.dataset.freeMl)).toBe(readings[1].chemistry.freeOilMl);expect(segmentWidths(b)[0]).toBeGreaterThan(segmentWidths(a)[0]);expect(segmentWidths(b)[1]).toBeLessThan(segmentWidths(a)[1]);
  expect($('sauceOilDistribution').textContent).toContain('Dispersed oil · solid');expect($('sauceOilDistribution').textContent).toContain('Modeled free oil · hatched');expect($('sauceOilDistributionHelp').textContent).toContain('not droplet sizes');expect($('sauceChangesOilContext')).not.toBeNull();expect(JSON.stringify(state)).toBe(before);
 });
 it('uses unequal total lengths rather than normalizing every row to 100 percent',()=>{
  recordedOil(0,10,6);recordedOil(1,25,5);render();expect($('sauceOilDistribution').dataset.scaleMl).toBe('25');expect(segmentWidths(rows()[0])).toEqual([16,24]);expect(segmentWidths(rows()[1])).toEqual([80,20]);expect(rows()[0].textContent).toContain('10 mL total');expect(rows()[1].textContent).toContain('25 mL total');
 });
 it('keeps zero oil distinct from missing data, including when both records are empty',()=>{
  recordedOil(0,0,0);render();expect(segmentWidths(rows()[0])).toEqual([0,0]);expect(rows()[0].textContent).toContain('0 mL total; no oil recorded');expect($('sauceOilDistributionUnknown')).toBeNull();recordedOil(1,0,0);render();expect($('sauceOilDistribution').dataset.scaleMl).toBe('0');expect(segmentWidths(rows()[1])).toEqual([0,0]);expect($('sauceOilDistribution').textContent).toContain('Neither check records any oil');expect($('sauceOilDistribution').outerHTML).not.toMatch(/NaN|Infinity|undefined/);
 });
 it('does not round small positive oil amounts down to a claim of no oil',()=>{
  recordedOil(0,.03,.01);recordedOil(1,.05,.02);render();expect(rows()[0].textContent).toContain('<0.1 mL');expect(rows()[0].textContent).not.toContain('no oil recorded');expect(Number(rows()[0].dataset.totalMl)).toBe(.03);expect(segmentWidths(rows()[0]).reduce((a,b)=>a+b)).toBeCloseTo(60);
 });
 it.each(['oilMl','freeOilMl','dispersion'])('withholds the graphic when recorded %s is missing',field=>{
  delete records()[1].chemistry[field];const before=JSON.stringify(state);render();expect($('sauceOilDistribution')).toBeNull();expect($('sauceOilDistributionUnknown').textContent).toContain('later check has incomplete oil records');expect($('sauceChangesOilContext')).not.toBeNull();expect(JSON.stringify(state)).toBe(before);
 });
 it.each([
  {oilMl:-1},{oilMl:Infinity},{freeOilMl:-1},{freeOilMl:26},{freeOilMl:NaN},{dispersion:-.1},{dispersion:1.1},{dispersion:Infinity},{freeOilMl:5,dispersion:.9}
 ])('withholds inconsistent recorded quantities %j',bad=>{
  Object.assign(records()[0].chemistry,bad);render();expect($('sauceOilDistribution')).toBeNull();expect($('sauceOilDistributionUnknown').textContent).toContain('earlier check has inconsistent oil records');expect($('sauceOilDistributionUnknown').textContent).not.toMatch(/NaN|Infinity|undefined|0 mL/);
 });
 it('accepts floating-point roundoff but does not repair an inconsistent free-oil amount',()=>{
  recordedOil(0,25,5);records()[0].chemistry.freeOilMl+=1e-9;render();expect($('sauceOilDistribution')).not.toBeNull();records()[0].chemistry.freeOilMl+=.1;render();expect($('sauceOilDistribution')).toBeNull();expect($('sauceOilDistributionUnknown')).not.toBeNull();
 });
 it('uses the pinned pair after new checks, live chemistry changes and timeline scrubbing',()=>{
  render();const indices=Changes.checks(state).map(c=>c.index);choose('sauceReplayEarlier',indices[0]);choose('sauceReplayLater',indices[1]);const chart=$('sauceOilDistribution').outerHTML;
  state=R.act(R.act(state,'advance',60),'taste');state.pan.chemistry.oilMl=500;state.pan.chemistry.dispersion=0;const before=JSON.stringify(state);render();expect($('sauceOilDistribution').outerHTML).toBe(chart);expect($('sauceChangesStale').textContent).toContain('earlier recorded pair');$('sauceReplayTime').value='1';$('sauceReplayTime').dispatchEvent(new Event('input',{bubbles:true}));expect($('sauceOilDistribution').outerHTML).toBe(chart);expect(JSON.stringify(state)).toBe(before);
 });
 it('keeps the last recorded values while the current dish becomes stale',()=>{
  render();const chart=$('sauceOilDistribution').outerHTML;state=R.act(state,'advance',60);render();expect($('sauceOilDistribution').outerHTML).toBe(chart);expect($('sauceChangesStale').textContent).toContain('still ends at that recorded check');
 });
 it('withholds diagnostics from active or plated demonstrate and reveals only after submission',()=>{
  state=pair('demonstrate');render();expect($('sauceOilDistribution')).toBeNull();expect($('sauceOilDistributionUnknown')).toBeNull();state=R.act(state,'plate');render(true);expect($('sauceChangesBody').textContent).toBe('');state=R.submit({...state,answers:[2,null]});render();expect($('sauceOilDistribution')).not.toBeNull();
 });
 it('allows submitted-source review only through the existing explicit callback',()=>{
  const source=R.submit({...R.act(pair('demonstrate'),'plate'),answers:[2,null]});state=R.replay(source,source.log.length).state;render(true);expect($('sauceOilDistribution')).toBeNull();review=true;render(true);expect($('sauceOilDistribution')).not.toBeNull();review=false;render(true);expect($('sauceChangesBody').textContent).toBe('');
 });
 it('leaves historical observation-one layouts unchanged and requires both modern markers',()=>{
  state=R.restore({...state,sauceObservationModel:1});render();expect($('sauceChangesOilContext')).toBeNull();expect($('sauceOilDistribution')).toBeNull();expect($('sauceOilDistributionUnknown')).toBeNull();state=pair();delete records()[0].observationModel;render();expect($('sauceOilDistribution')).toBeNull();
 });
 it('provides full numeric alternatives and responsive patterned system-color styling',()=>{
  render();const figure=$('sauceOilDistribution');expect($(figure.getAttribute('aria-labelledby')).textContent).toBe('Recorded oil distribution');for(const row of rows())expect(row.querySelector('.sauce-oil-values').textContent).toMatch(/total = .*dispersed \+ .*modeled free oil/);
  const css=readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.css','utf8');expect(css).toContain('repeating-linear-gradient(135deg,var(--oil-hatch)');expect(css).toContain('--oil-solid:CanvasText;--oil-hatch:CanvasText;--oil-paper:Canvas');expect(css).toContain('.sauce-oil-segment,.sauce-oil-legend i{forced-color-adjust:none}');expect(css).toContain('@media(max-width:360px){.sauce-oil-distribution');
 });
 it('mirrors the renderer and styling exactly',()=>{for(const file of ['recipe_lab_sauce_replay.js','recipe_lab_sauce_replay.css'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));});
});
