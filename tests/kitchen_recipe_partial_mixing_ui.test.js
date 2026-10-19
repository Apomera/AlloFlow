// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),F=require('../stem_lab/kitchen_studio/recipe_lab_folding.js'),G=require('../stem_lab/kitchen_studio/recipe_lab_sampling.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const $=id=>document.getElementById(id),act=(s,steps)=>steps.reduce((v,[a,b])=>R.act(v,a,b),s);
let state,fold,inspection,native,host,motion;
function render(){fold.render(state,false,true);inspection.render(state,'pan',false,true);native.render(state,true,false);}
function key(key){$('mixSvg').dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));}
function gesture(){key('Enter');for(let i=0;i<4;i++)key('ArrowRight');for(let i=0;i<4;i++)key('ArrowDown');}
function sequence(mode='practice',model=2){let s=R.startRescue('cooled',0,mode);s.mixingModel=model;return act(s,[['taste'],['pour',100],['taste']]);}
function choose(id,index){$(id).value=String(index);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
beforeEach(()=>{
 document.body.innerHTML='<nav id="sauceTools"></nav><div id="foldHost"></div><div id="nativeHost"></div>';
 Object.assign(window,{KitchenRecipes:R,KitchenSauceCheck:S,KitchenPanFolding:F,KitchenSampling:G,KitchenSauceChanges:C});
 motion={matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()};Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>motion)});Object.defineProperty(document,'hidden',{configurable:true,value:false});vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 for(const file of ['recipe_lab_fold_studio.js','recipe_lab_sample_studio.js','recipe_lab_sauce_replay.js','recipe_lab_inspection.js','recipe_lab_quests.js'])window.eval(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
 state=sequence();host={container:$('foldHost'),getState:()=>state,pause:vi.fn(),cancelNative:vi.fn(),preview:vi.fn(),check:vi.fn(),ended:()=>false,selectTool:vi.fn(),apply:vi.fn((a,v,m)=>{state=R.act(state,a,v,m);render();})};
 fold=window.KitchenFoldStudio.mount(host);inspection=window.KitchenRecipeInspection.mount(host);native=F.mountPanel({container:$('nativeHost'),choose:vi.fn()});render();
});
afterEach(()=>{fold.dispose();inspection.dispose();native.dispose();vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();});
describe('Remaining added liquid and recorded mixing effort',()=>{
 it('retains a shrinking physical pool after the first fold while dose history resets',()=>{
  const before=state,rx=Number($('foldStudioUnmixedPool').getAttribute('rx'));gesture();key('Enter');
  expect(state).toEqual(R.act(before,'stirSweep','gesture','keyboard'));expect(R.mixing(state).liquidSinceMix).toBe(0);expect(R.mixing(state).needsMixing).toBe(true);
  expect($('foldStudioWater').textContent).toBe('0 mL');expect($('foldStudioWaterLabel').textContent).toContain('added since previous mix');expect($('foldStudioPool').textContent).toContain('Separate added liquid remains');expect($('sceneFoldPool').textContent).toBe($('foldStudioPool').textContent);expect(Number($('foldStudioUnmixedPool').getAttribute('rx'))).toBeLessThan(rx);expect(Number($('foldStudioUnmixedPool').getAttribute('opacity'))).toBeGreaterThan(0);expect($('foldStudioReceipt').textContent).toContain(state.log.at(-1).observation);expect($('foldStudioReceipt').textContent).not.toContain('incorporated 100');
  gesture();key('Enter');expect(R.mixing(state).pending.totalMl).toBeGreaterThan(0);expect(R.needsMixing(state)).toBe(false);expect($('foldStudioUnmixedPool').getAttribute('opacity')).toBe('0');expect($('foldStudioPool').textContent).toContain('No distinct added-liquid pool');
 });
 it('does not shrink liquid while a gesture is previewed or cancelled',()=>{
  const saved=JSON.stringify(state),pool=$('foldStudioUnmixedPool').outerHTML;gesture();expect($('foldStudioUnmixedPool').outerHTML).toBe(pool);key('Escape');expect($('foldStudioUnmixedPool').outerHTML).toBe(pool);expect(JSON.stringify(state)).toBe(saved);expect(host.apply).not.toHaveBeenCalled();
 });
 it('clears an evaporated pool without erasing the historical amount added or creating a flowing trail',()=>{
  state=act(R.startRescue('dry',0),[['pour',50],['panHeat',3],['advance',60],['advance',60],['taste']]);render();expect(state.pan.moisture).toBe(0);expect(R.mixing(state).waterSinceMix).toBe(50);expect($('foldStudioWater').textContent).toBe('50 mL');expect($('foldStudioUnmixedPool').getAttribute('opacity')).toBe('0');expect($('foodCheckPendingPool').style.display).toBe('none');expect($('foodCheckSvg').dataset.bodyType).toBe('dry');expect(S.reading(state).closureSeconds).toBe(0);expect(Number($('foodCheckTrail').getAttribute('stroke-width'))).toBeGreaterThan(0);expect($('sauceReplayCurrent').querySelector('.sauce-replay-liquid-pool')).toBeNull();
 });
 it('shows separate local liquid together with thicker patches in a partial recorded check',()=>{
  state=act(state,[['stirPan'],['taste']]);render();const r=S.reading(state),c=S.cues(r);expect(c).toMatchObject({mixingModel:2,pooling:true,thin:true,patches:true});expect(c.track).toContain('parts of the trail');expect($('foodCheckPendingPool').style.display).toBe('');expect($('foodCheckRivulets').style.display).toBe('');expect($('foodCheckBodyRidges').style.display).toBe('');for(const cls of ['liquid-pool','rivulets','body-ridges','coating-patches'])expect($('sauceReplayCurrent').querySelector('.sauce-replay-'+cls)).not.toBeNull();expect($('foodCheckVisualDescription').textContent).toContain(c.poolText);expect($('sauceReplayCurrent').querySelector('desc').textContent).toContain(c.poolText);
 });
 it('uses identical pool geometry with reduced motion and without it',()=>{
  const pool=$('foodCheckPendingPool').outerHTML,foldPool=$('foldStudioUnmixedPool').outerHTML,replay=$('sauceReplayCurrent').querySelector('.sauce-replay-liquid-pool').outerHTML;motion.matches=false;render();expect($('foodCheckPendingPool').outerHTML).toBe(pool);expect($('foldStudioUnmixedPool').outerHTML).toBe(foldPool);expect($('sauceReplayCurrent').querySelector('.sauce-replay-liquid-pool').outerHTML).toBe(replay);
 });
 it('keeps stale inspection and pinned replay pools tied to recorded checks',()=>{
  const indices=C.checks(state).map(c=>c.index);choose('sauceReplayEarlier',indices[0]);choose('sauceReplayLater',indices[1]);const pool=$('foodCheckPendingPool').outerHTML,art=$('sauceReplayCurrent').querySelector('svg').outerHTML,context=$('sauceBulkMixingContext').textContent;
  state=R.act(state,'stirPan');render();expect($('foodCheckPendingPool').outerHTML).toBe(pool);expect($('foodCheckResult').textContent).toContain('food has changed');state=R.act(state,'taste');const frozen=JSON.stringify(state);render();expect($('sauceReplayCurrent').querySelector('svg').outerHTML).toBe(art);expect($('sauceBulkMixingContext').textContent).toBe(context);expect($('foodCheckPendingPool').outerHTML).not.toBe(pool);expect(JSON.stringify(state)).toBe(frozen);
 });
 it('explains recorded pending water as a subset and distinguishes losses from incorporation',()=>{
  state=act(state,[['stirPan'],['taste']]);render();const table=$('sauceBulkMixingContext');expect(table.textContent).toContain('6 mL');expect(table.textContent).toContain('3.8 %');expect($('sauceBulkMixingHelp').textContent).toContain('subset');expect($('sauceBulkMixingHelp').textContent).toContain('evaporation or pasta uptake');expect($('sauceBulkMixingHelp').textContent).toContain('selected recorded checks');
 });
 it('reports missing recorded pending quantities as unknown and never substitutes live values',()=>{
  state=act(state,[['stirPan'],['taste']]);state=JSON.parse(JSON.stringify(state));const checks=state.log.filter(e=>e.inspection&&e.inspection.kind==='sauce');delete checks.at(-1).inspection.pendingLiquidMl;render();expect($('sauceBulkMixingContext').textContent).toContain('Not recorded');expect($('sauceChangesBody').textContent).toContain('not fully recorded');expect($('sauceBulkMixingContext').textContent).not.toContain('6 mL');
 });
 it('keeps new pending diagnostics out of active demonstrate while showing observable pools',()=>{
  state=act(sequence('demonstrate'),[['stirPan'],['taste']]);render();expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceBulkMixingContext')).toBeNull();expect($('foodCheckPoolCue').textContent).toContain('Separate added liquid');expect($('foldStudioPool').textContent).not.toMatch(/6\.0|3\.8|%/);const q=window.KitchenSkillQuests.describe(state,'sauce');expect(q.observationOnly).toBe(true);expect(q.try).not.toMatch(/need.*mix|remaining.*mL/);
 });
 it('keeps quests on a further mixing step until the physical pool is no longer visible',()=>{
  state=act(state,[['stirPan'],['taste']]);let q=window.KitchenSkillQuests.describe(state,'sauce');expect(q.next.tool).toBe('stir');expect(q.try).toContain('part of the liquid');state=act(state,[['stirPan'],['taste']]);q=window.KitchenSkillQuests.describe(state,'sauce');expect(q.next.tool).toBe('check');
 });
 it('preserves historical mixing-one labels, cues and pool behavior',()=>{
  state=sequence('practice',1);render();const r=S.reading(state);expect(r).not.toHaveProperty('mixingModel');expect(S.cues(r)).not.toHaveProperty('pooling');expect($('foldStudioPool').hidden).toBe(true);expect($('foldStudioWaterLabel').textContent).toContain('awaiting a mix');expect($('sceneFoldPool').hidden).toBe(true);expect($('foodCheckPoolCue').hidden).toBe(true);expect($('sauceBulkMixingContext')).toBeNull();expect($('sauceReplayCurrent').querySelector('.sauce-replay-liquid-pool')).toBeNull();state=R.act(state,'stirPan');render();expect($('foldStudioUnmixedPool').getAttribute('opacity')).toBe('0');expect($('foldStudioReceipt').textContent).toContain('Last mix spread 100 mL');
 });
 it('mirrors the runtime integration files',()=>{for(const file of ['recipe_lab_folding.js','recipe_lab_fold_studio.js','recipe_lab_sauce_check.js','recipe_lab_inspection.js','recipe_lab_sauce_replay.js','recipe_lab_quests.js'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));});
});
