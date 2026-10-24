// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),G=require('../stem_lab/kitchen_studio/recipe_lab_sampling.js');
const $=id=>document.getElementById(id),act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s);
let state,ui,host;
function render(historical=false,zone='pan'){ui.render(state,zone,historical,true);}
function scrub(value){$('sauceReplayTime').value=String(value);$('sauceReplayTime').dispatchEvent(new Event('input',{bubbles:true}));}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function burntSequence(){let s=act(R.startRescue('dry',0,'demonstrate'),[['panHeat',3],['advance',60],['advance',60],['panHeat',0]]);for(let i=0;i<5;i++)s=R.act(s,'advance',60);const dry=R.act(s,'taste'),unmixed=act(dry,[['pour',100],['taste']]),firstFold=act(unmixed,[['stirSweep','button'],['taste']]);let folded=firstFold;for(let i=0;R.needsMixing(folded)&&i<8;i++)folded=act(folded,[['stirSweep','button'],['taste']]);expect(R.needsMixing(folded)).toBe(false);return {dry,unmixed,folded};}
// Deliberately chosen physical conditions exercise independent visual combinations.
function bodyFixture(body,model=2){let s=R.startRescue('dry',0,'demonstrate');s.sauceObservationModel=model;s.pan.damage=1;s.pan.temp=90;s.pan.moisture={dry:5,watery:240,thick:40,coating:80}[body];s.pan.chemistry.starchG=body==='thick'?3:body==='coating'?1.5:.35;s.pan.chemistry.dispersion=.08;return R.act(s,'taste');}
beforeEach(()=>{
 document.body.innerHTML='<nav id="sauceTools"></nav>';window.KitchenRecipes=R;window.KitchenSampling=G;window.KitchenSauceCheck=S;
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 for(const file of ['recipe_lab_sample_studio.js','recipe_lab_sauce_replay.js','recipe_lab_inspection.js'])window.eval(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
 state=R.startRescue('dry',0,'demonstrate');host={getState:()=>state,pause:vi.fn(),cancelNative:vi.fn(),ended:()=>state.plated||state.submitted,selectTool:vi.fn(),apply:vi.fn((a,v,m)=>{state=R.act(state,a,v,m);render();})};ui=window.KitchenRecipeInspection.mount(host);render();
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();});

describe('Recorded sauce body, oil and scorch have independent visual layers',()=>{
 it('reveals the new cue panel and surface layers only after a real check',()=>{
  state.pan.damage=1;state.pan.chemistry.dispersion=0;const before=JSON.stringify(state);render();expect($('foodCheckCues').hidden).toBe(true);expect($('foodCheckResiduePan').style.display).toBe('none');expect($('foodCheckResidueSpoon').style.display).toBe('none');expect($('foodCheckOilDroplets').style.display).toBe('none');expect(document.querySelectorAll('.sauce-replay-art')).toHaveLength(0);expect(JSON.stringify(state)).toBe(before);
 });
 it.each(['dry','watery','thick','coating'])('shows %s body together with oil beads and persistent residue',body=>{
  state=bodyFixture(body);const before=JSON.stringify(state),reading=S.reading(state);expect(reading.bodyType).toBe(body);render();const art=$('sauceReplayCurrent');expect(art.dataset.type).toBe('scorched');expect(art.dataset.bodyType).toBe(body);expect(art.dataset.scorched).toBe('true');expect(art.querySelector('.sauce-replay-residue')).not.toBeNull();expect(art.querySelector('.sauce-replay-oil-droplets')).not.toBeNull();expect(art.querySelector('.sauce-replay-oil-highlights')).not.toBeNull();expect($('foodCheckResiduePan').style.display).toBe('');expect($('foodCheckResidueSpoon').style.display).toBe('');expect($('foodCheckOilCoat').style.display).toBe('');expect($('foodCheckSauceFill').getAttribute('fill')).toBe('#b99358');
  const feature=body==='watery'?'.sauce-replay-rivulets':body==='coating'?'.sauce-replay-film-shine':'.sauce-replay-body-ridges';expect(art.querySelector(feature)).not.toBeNull();expect($('foodCheckRivulets').style.display).toBe(body==='watery'?'':'none');expect($('foodCheckBodyRidges').style.display).toBe(body==='dry'||body==='thick'?'':'none');expect($('foodCheckFilmShine').style.display).toBe(body==='coating'?'':'none');expect(R.criteria(state)[0].met).toBe(false);expect(JSON.stringify(state)).toBe(before);
 });
 it('shows a real burnt sauce becoming flowing while scorch remains and the outcome still fails',()=>{
  const states=burntSequence();state=states.dry;render();expect($('foodCheckSvg').dataset.bodyType).toBe('dry');expect($('foodCheckOilDroplets').style.display).toBe('');state=states.unmixed;render();expect($('foodCheckSvg').dataset.bodyType).toBe('unmixed');expect($('foodCheckRivulets').style.display).toBe('');expect($('foodCheckCues').textContent).toContain('Thicker patches and separate liquid');expect($('foodCheckResiduePan').style.display).toBe('');
  state=states.folded;render();expect($('foodCheckSvg').dataset.bodyType).toBe('coating');expect($('foodCheckFilmShine').style.display).toBe('');expect($('foodCheckOilDroplets').style.display).toBe('none');expect($('foodCheckResiduePan').style.display).toBe('');expect(S.reading(state).closureSeconds).toBeGreaterThan(1);
  state=R.submit({...R.act(state,'plate'),answers:[0,null]});expect(R.evidence(state).status).toBe('Review and retry');expect(R.restore(state)).toEqual(state);render(true);expect($('foodCheckCues').textContent).toContain('Scorched residue remains');expect($('foodCheckEquivalent').disabled).toBe(true);
 });
 it('keeps stale and explicitly pinned views tied to their selected recorded checks',()=>{
  const states=burntSequence();state=states.unmixed;render();const indices=state.log.flatMap((e,i)=>e.inspection&&e.inspection.kind==='sauce'?[i]:[]);choose('sauceReplayEarlier',indices[0]);choose('sauceReplayLater',indices[1]);const pinned=$('sauceReplayCurrent').querySelector('svg').outerHTML;state=states.folded;render();expect($('sauceReplayCurrent').querySelector('svg').outerHTML).toBe(pinned);expect($('sauceReplayCurrent').dataset.bodyType).toBe('unmixed');
  const spoon=$('foodCheckSpoon').innerHTML,pan=$('foodCheckResiduePan').outerHTML;state=R.act(state,'pour',10);state.pan.chemistry.dispersion=0;state.pan.moisture=300;const before=JSON.stringify(state);render();expect($('foodCheckSpoon').innerHTML).toBe(spoon);expect($('foodCheckResiduePan').outerHTML).toBe(pan);expect($('foodCheckResult').textContent).toContain('food has changed');expect($('sauceReplayCurrent').querySelector('svg').outerHTML).toBe(pinned);expect(JSON.stringify(state)).toBe(before);
 });
 it('closes the recorded flowing trail while residue remains during reduced-motion scrubbing',()=>{
  state=burntSequence().folded;render();const before=JSON.stringify(state),seconds=S.reading(state).closureSeconds;expect($('sauceReplayPlay').disabled).toBe(true);scrub(seconds/2);expect(Number($('sauceReplayCurrent').querySelector('.sauce-replay-trail').getAttribute('height'))).toBeCloseTo(10);scrub(seconds);expect($('sauceReplayCurrent').querySelector('.sauce-replay-trail').getAttribute('visibility')).toBe('hidden');expect($('sauceReplayCurrent').querySelector('.sauce-replay-residue')).not.toBeNull();expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('provides the same independent cues in text and SVG descriptions without numerical quality leaks',()=>{
  state=bodyFixture('watery');render();const cues=S.cues(S.reading(state)),text=$('foodCheckCues').textContent,desc=$('sauceReplayCurrent').querySelector('desc').textContent;for(const value of [cues.track,cues.coating,cues.separation,cues.residue]){expect(text).toContain(value);expect(desc).toContain(value);expect($('foodCheckVisualDescription').textContent).toContain(value);}expect($('foodCheckCues').querySelectorAll('dt')).toHaveLength(4);expect($('sauceReplayCurrent').querySelectorAll('dt')).toHaveLength(5);expect($('sauceReplayCurrent').textContent).toContain(cues.poolText);expect($('foodCheckPoolCue').textContent).toBe(cues.poolText);expect(text).not.toMatch(/starchPercent|dispersion|body index|success|ready to plate/);expect($('sauceChangesLedger').hidden).toBe(true);
 });
 it('retains original model-one scorch art and does not apply new layers to old records',()=>{
  state=bodyFixture('watery',1);render();expect(S.reading(state)).not.toHaveProperty('observationModel');expect(S.cues(S.reading(state)).oilDroplets).toBe(false);expect($('foodCheckCues').hidden).toBe(true);expect($('foodCheckScorch').style.display).toBe('');expect($('foodCheckResiduePan').style.display).toBe('none');expect($('foodCheckSauceFill').getAttribute('fill')).toBe('#76503a');expect($('sauceReplayCurrent').querySelector('.sauce-replay-coating-patches').getAttribute('fill')).toBe('#51392a');expect($('sauceReplayCurrent').querySelector('.sauce-replay-residue')).toBeNull();expect($('sauceReplayCurrent').querySelector('.sauce-replay-oil-droplets')).toBeNull();expect($('sauceReplayCurrent').dataset.observationModel).toBeUndefined();
 });
 it('clears previous new-model cues when changing to a kitchen without checks',()=>{
  state=bodyFixture('thick');render();state=R.startRescue('cooled',0);render();expect($('foodCheckCues').hidden).toBe(true);expect($('foodCheckVisualDescription').textContent).toBe('');expect($('foodCheckResiduePan').style.display).toBe('none');expect($('foodCheckBodyRidges').style.display).toBe('none');expect($('sauceReplayCurrent').dataset.bodyType).toBeUndefined();expect($('sauceReplayCurrent').dataset.scorched).toBeUndefined();
 });
 it('mirrors the new inspection and replay assets',()=>{for(const file of ['recipe_lab_inspection.js','recipe_lab_inspection.css','recipe_lab_sauce_replay.js','recipe_lab_sauce_replay.css'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));});
});
