// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),F=require('../stem_lab/kitchen_studio/recipe_lab_folding.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
const $=id=>document.getElementById(id);
let state,ui,panel,host;
function render(locked=false){ui.render(state,locked,true);panel.render(state,true,locked,null);}
function key(key){$('mixSvg').dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));}
function gather(){key('Enter');for(let i=0;i<4;i++)key('ArrowRight');for(let i=0;i<4;i++)key('ArrowDown');}
function legacy(){const s=R.startRescue('dry',0);delete s.mixingModel;return R.act(s,'pour',30);}
beforeEach(()=>{
 document.body.innerHTML='<div id="studioHost"></div><div id="sceneHost"></div>';
 Object.defineProperty(document,'hidden',{value:false,configurable:true});
 window.KitchenRecipes=R;window.KitchenPanFolding=F;window.KitchenSauceCheck=C;
 window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_fold_studio.js','utf8'));
 state=R.act(R.startRescue('dry',0,'demonstrate'),'pour',30);
 host={container:$('studioHost'),getState:()=>state,pause:vi.fn(),cancelNative:vi.fn(),preview:vi.fn(),check:vi.fn(),apply:vi.fn((a,v,m)=>{state=R.act(state,a,v,m);render();})};
 ui=window.KitchenFoldStudio.mount(host);panel=F.mountPanel({container:$('sceneHost'),choose:vi.fn()});render();
});
afterEach(()=>{ui.dispose();panel.dispose();vi.useRealTimers();vi.restoreAllMocks();document.body.replaceChildren();});
describe('Mixing takes simulation time without measuring a learner’s movement speed',()=>{
 it('explains six seconds and concurrent cooking before either mixing interaction',()=>{
  for(const id of ['foldStudioTiming','sceneFoldTiming']){expect($(id).hidden).toBe(false);expect($(id).textContent).toContain('6 simulated seconds');expect($(id).textContent).toContain('pan and pot keep heating or cooling');expect($(id).textContent).toContain('movement speed is not scored');}
  expect($('mixSvg').getAttribute('aria-describedby').split(' ')).toContain('foldStudioTiming');
  for(const id of ['foldStudioLearning','sceneFoldLearning']){expect($(id).textContent).toContain('water can evaporate or move into pasta');expect($(id).textContent).not.toContain('reduce excess liquid');}
  expect($('foldStudioTiming').textContent).not.toMatch(/viscosity|dispersion|starchPercent|coating: true/);
 });
 it('keeps preview time and canceled motion out of cooking evidence',()=>{
  vi.useFakeTimers();const before=JSON.stringify(state);gather();vi.advanceTimersByTime(90000);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();key('Escape');expect(JSON.stringify(state)).toBe(before);expect(F.lastMix(state)).toBeNull();
 });
 it('records six seconds only on the completed release and retains the actual receipt',()=>{
  vi.useFakeTimers();const before=state;gather();vi.advanceTimersByTime(45000);key('Enter');
  expect(host.apply).toHaveBeenCalledExactlyOnceWith('stirSweep','gesture','keyboard');expect(state).toEqual(R.act(before,'stirSweep','gesture','keyboard'));
  expect(state.time-before.time).toBe(6);expect(F.lastMix(state)).toMatchObject({water:30,durationSeconds:6,time:state.time});
  for(const id of ['foldStudioReceipt','sceneFoldReceipt'])expect($(id).textContent).toContain('Mixed for 6 simulated seconds');
  const receipt=$('foldStudioReceipt').textContent;state=R.act(state,'pour',10);render();expect($('foldStudioReceipt').textContent).toBe(receipt);expect(F.lastMix(state).water).toBe(30);
 });
 it('allows exactly enough remaining simulation time for one whole mix',()=>{
  state={...state,time:3594};render();const before=state;expect(F.available(state,false)).toBe(true);gather();key('Enter');
  expect(state).toEqual(R.act(before,'stirSweep','gesture','keyboard'));expect(state.time).toBe(3600);expect(F.lastMix(state).durationSeconds).toBe(6);expect($('foldStudioPick').disabled).toBe(true);
 });
 it('disables pickup when a full mix cannot fit and describes the reason in both views',()=>{
  state={...state,time:3595};render();const before=JSON.stringify(state);expect(F.available(state,false)).toBe(false);expect($('foldStudioPick').disabled).toBe(true);expect($('sceneFoldKeyboard').disabled).toBe(true);
  for(const id of ['mixGestureStatus','sceneFoldInstruction'])expect($(id).textContent).toContain('not enough time to complete another mix');
  gather();key('Enter');expect(host.apply).not.toHaveBeenCalled();expect(JSON.stringify(state)).toBe(before);
 });
 it('keeps duration disclosure empty and legacy mixing unchanged, including its receipt shape',()=>{
  state=legacy();render();for(const id of ['foldStudioTiming','sceneFoldTiming']){expect($(id).hidden).toBe(true);expect($(id).textContent).toBe('');}
  expect($('mixSvg').getAttribute('aria-describedby')).toBe('foldStudioHelp mixGestureStatus');expect($('foldStudioLearning').textContent).toContain('does not add water or reduce excess liquid');
  const before=state;gather();key('Enter');expect(state.time).toBe(before.time);expect(state.pan.moisture).toBe(before.pan.moisture);expect(F.lastMix(state)).not.toHaveProperty('durationSeconds');expect($('foldStudioReceipt').textContent).not.toContain('simulated seconds');
  state={...legacy(),time:3599};render();expect(F.available(state,false)).toBe(true);expect($('foldStudioPick').disabled).toBe(false);
 });
 it('never invents a duration for legacy or rejected log entries',()=>{
  const s=legacy(),untimed=R.act(s,'stirPan'),receipt=F.lastMix(untimed);expect(receipt).not.toHaveProperty('durationSeconds');
  const rejected={...untimed,log:untimed.log.concat({action:'stirSweep',accepted:false,time:6,durationSeconds:6,observation:'Rejected'})};expect(F.lastMix(rejected)).toEqual(receipt);
 });
 it('keeps modern recorded kitchens read-only while preserving their duration explanation',()=>{
  state=R.act(state,'stirSweep','button');const before=JSON.stringify(state);render(true);expect($('foldStudioTiming').hidden).toBe(false);expect($('foldStudioPick').disabled).toBe(true);expect($('sceneFoldKeyboard').disabled).toBe(true);gather();key('Enter');expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
});
