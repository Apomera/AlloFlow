// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),G=require('../stem_lab/kitchen_studio/recipe_lab_sampling.js');
const $=id=>document.getElementById(id);
let state,ui,host,frames,nextFrame,now,reduced,motion;
function render(zone='pan',historical=false,active=true){ui.render(state,zone,historical,active);}
function width(){return Number($('foodCheckTrail').getAttribute('stroke-width'));}
function key(value){$('foodCheckSvg').dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true}));}
function tick(at){now=at;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(at));}
function check(){const before=state.time;$('foodCheckEquivalent').click();expect(state.time).toBe(before);return S.reading(state);}
beforeEach(()=>{
 document.body.innerHTML='<nav id="sauceTools"></nav>';window.KitchenRecipes=R;window.KitchenSampling=G;window.KitchenSauceCheck=S;frames=new Map();nextFrame=0;now=0;reduced=false;
 vi.stubGlobal('requestAnimationFrame',vi.fn(fn=>{frames.set(++nextFrame,fn);return nextFrame;}));vi.stubGlobal('cancelAnimationFrame',vi.fn(id=>frames.delete(id)));vi.spyOn(performance,'now').mockImplementation(()=>now);
 motion=new EventTarget();Object.defineProperty(motion,'matches',{get:()=>reduced});Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>motion)});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 for(const file of ['recipe_lab_sample_studio.js','recipe_lab_sauce_replay.js','recipe_lab_inspection.js'])window.eval(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
 state=R.startRescue('cooled',0,'demonstrate');host={getState:()=>state,pause:vi.fn(),cancelNative:vi.fn(),ended:()=>state.plated||state.submitted,selectTool:vi.fn(),apply:vi.fn((a,v,m)=>{state=R.act(state,a,v,m);render();})};ui=window.KitchenRecipeInspection.mount(host);render();
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();});

describe('Inspection retains the timeline of its recorded sauce check',()=>{
 it('settles a running finite trail when reduced motion is enabled and leaves it settled afterward',()=>{
  const reading=check();tick(reading.closureSeconds*500);expect(width()).toBeCloseTo(10.5);const before=JSON.stringify(state);reduced=true;motion.dispatchEvent(new Event('change'));expect(width()).toBe(0);expect(frames.size).toBe(0);render();expect(width()).toBe(0);reduced=false;motion.dispatchEvent(new Event('change'));expect(width()).toBe(0);expect(frames.size).toBe(0);expect(JSON.stringify(state)).toBe(before);
 });
 it('keeps dry trails open and settles a hidden paused finite trail after a motion-preference change',()=>{
  state=R.startRescue('dry',0);render();check();reduced=true;motion.dispatchEvent(new Event('change'));expect(width()).toBe(21);
  reduced=false;state=R.startRescue('cooled',0);render();const reading=check();tick(now+reading.closureSeconds*500);render('pot');reduced=true;motion.dispatchEvent(new Event('change'));render();expect(width()).toBe(0);expect(frames.size).toBe(0);
 });
 it('keeps a completed closing trail closed across redraw, Escape, hide and reopen',()=>{
  const reading=check();expect(reading.closureSeconds).toBeGreaterThan(0);expect(width()).toBe(21);tick(reading.closureSeconds*1000);expect(width()).toBe(0);
  const before=JSON.stringify(state);render();expect(width()).toBe(0);key('Escape');expect(width()).toBe(0);render('pan',false,false);render();expect(width()).toBe(0);window.dispatchEvent(new Event('blur'));expect(width()).toBe(0);expect(JSON.stringify(state)).toBe(before);expect(host.apply).toHaveBeenCalledTimes(1);
 });
 it('preserves partial progress on an unchanged render and continues the same animation',()=>{
  const reading=check();tick(reading.closureSeconds*500);expect(width()).toBeCloseTo(10.5);const before=JSON.stringify(state);render();expect(width()).toBeCloseTo(10.5);tick(reading.closureSeconds*750);expect(width()).toBeCloseTo(5.25);tick(reading.closureSeconds*1000);expect(width()).toBe(0);expect(JSON.stringify(state)).toBe(before);
 });
 it('restores the paused recorded fraction when a new keyboard gesture is cancelled',()=>{
  const reading=check();tick(reading.closureSeconds*500);const before=JSON.stringify(state);key('Enter');key('ArrowRight');expect(width()).toBe(21);expect($('foodCheckSvg').dataset.checkPhase).toBe('draw');key('Escape');expect(width()).toBeCloseTo(10.5);expect(frames.size).toBe(0);expect($('foodCheckGesture').textContent).toContain('Observation paused');render('pan',false,false);render();expect(width()).toBeCloseTo(10.5);expect($('foodCheckGesture').textContent).toContain('replay below');expect(JSON.stringify(state)).toBe(before);
 });
 it('restores a completed observation after the host cancels an unfinished gesture',()=>{
  const reading=check();tick(reading.closureSeconds*1000);const before=JSON.stringify(state);key('Enter');key('ArrowRight');ui.cancel();expect(width()).toBe(0);render();expect(width()).toBe(0);expect(JSON.stringify(state)).toBe(before);
 });
 it('keeps the reduced-motion endpoint through redraw, cancellation and reopen',()=>{
  reduced=true;check();expect(width()).toBe(0);expect(frames.size).toBe(0);const before=JSON.stringify(state);render();key('Enter');key('ArrowRight');key('Escape');render('bench');render();expect(width()).toBe(0);expect(JSON.stringify(state)).toBe(before);
 });
 it('retains a stale recorded trail and its cues after food changes',()=>{
  reduced=true;check();const recorded=S.reading(state),description=$('foodCheckVisualDescription').textContent;state=R.act(state,'advance',30);const before=JSON.stringify(state);render();expect(width()).toBe(0);expect($('foodCheckResult').textContent).toContain('food has changed');expect($('foodCheckVisualDescription').textContent).toBe(description);expect(S.reading(state).closureSeconds).toBe(recorded.closureSeconds);key('Escape');expect(width()).toBe(0);expect(JSON.stringify(state)).toBe(before);
 });
 it('opens a fresh local check even when its time and reading match the previous check',()=>{
  const first=check();tick(first.closureSeconds*1000);const index=state.log.length;expect(width()).toBe(0);const second=check();expect(state.log.length).toBe(index+1);expect(second.time).toBe(first.time);expect(second.closureSeconds).toBe(first.closureSeconds);expect(width()).toBe(21);tick(now+second.closureSeconds*1000);expect(width()).toBe(0);
 });
 it('does not assign an older in-progress fraction to a separate identical check loaded from history',()=>{
  const first=check();tick(first.closureSeconds*500);expect(width()).toBeCloseTo(10.5);state=R.act(state,'taste');const before=JSON.stringify(state);render('pan',true);expect(S.reading(state).time).toBe(first.time);expect(S.reading(state).closureSeconds).toBe(first.closureSeconds);expect(width()).toBe(0);expect(frames.size).toBe(0);expect(JSON.stringify(state)).toBe(before);
 });
 it('shows existing and restored finite-closure observations at their settled endpoint',()=>{
  state=R.act(state,'taste');const before=JSON.stringify(state);render();expect(width()).toBe(0);state=R.restore(JSON.parse(before));render('pan',true);expect(width()).toBe(0);expect(frames.size).toBe(0);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('does not confuse an independently restored identical check with an in-progress local check',()=>{
  const reading=check();tick(reading.closureSeconds*500);expect(width()).toBeCloseTo(10.5);state=R.restore(JSON.parse(JSON.stringify(state)));const before=JSON.stringify(state);render('pan',true);expect(width()).toBe(0);expect(frames.size).toBe(0);expect(JSON.stringify(state)).toBe(before);
 });
 it('keeps zero-closure dry trails open, including stale and historical views',()=>{
  state=R.startRescue('dry',0,'demonstrate');render();const reading=check(),dryState=state;expect(reading.closureSeconds).toBe(0);expect(width()).toBe(21);render();key('Enter');key('Escape');expect(width()).toBe(21);state=R.act(state,'pour',50);render();expect(width()).toBe(21);state=dryState;render('pan',true);expect(width()).toBe(21);expect(S.reading(state).closureSeconds).toBe(0);
 });
 it('replaces a prior open dry observation with a newly checked flowing trail',()=>{
  state=R.startRescue('dry',0,'demonstrate');render();check();expect(width()).toBe(21);state=R.act(state,'pour',50);render();expect(width()).toBe(21);const reading=check();expect(reading.bodyType).toBe('unmixed');tick(reading.closureSeconds*1000);expect(width()).toBe(0);render();expect(width()).toBe(0);expect(S.reading(state).previous.closureSeconds).toBe(0);
 });
 it('preserves original observation-model readings while correcting their UI redraw',()=>{
  state.sauceObservationModel=1;reduced=true;const reading=check();expect(reading).not.toHaveProperty('observationModel');const before=JSON.stringify(state);render();expect(width()).toBe(0);expect(JSON.stringify(state)).toBe(before);expect($('foodCheckCues').hidden).toBe(true);
 });
 it('clears a prior check when starting a new kitchen without observations',()=>{
  const reading=check();tick(reading.closureSeconds*1000);state=R.startRescue('cooled',0,'demonstrate');render();expect($('foodCheckTrail').getAttribute('d')).toBe('M63 125H63');expect($('foodCheckCues').hidden).toBe(true);expect($('foodCheckResult').textContent).toContain('No sauce trail checked yet');expect(frames.size).toBe(0);check();expect(width()).toBe(21);
 });
 it('keeps the canonical and desktop inspection implementation identical',()=>{expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/recipe_lab_inspection.js','utf8')).toBe(readFileSync('stem_lab/kitchen_studio/recipe_lab_inspection.js','utf8'));});
});
