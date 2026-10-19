// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),P=require('../stem_lab/kitchen_studio/recipe_lab_pan_carry.js'),Q=require('../stem_lab/kitchen_studio/recipe_lab_quests.js');
const main=readFileSync('stem_lab/kitchen_studio/recipe_lab.js','utf8'),html=readFileSync('stem_lab/kitchen_studio/recipe_lab.html','utf8'),$=id=>document.getElementById(id);
const act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s);
const warmed=(level,seconds=30,mode='demonstrate')=>act(R.startRescue('cooled',0,mode),[['taste'],['panHeat',level],['advance',seconds],['panHeat',0],['taste']]);
let ui;
function note(view){const source=main.slice(main.indexOf('function renderHeatModel('),main.indexOf('function chooseZone('));new Function('$',source+'return renderHeatModel;')($)(view);return $('panPowerHelp').textContent;}
function mount(s){window.KitchenRecipes=R;window.KitchenPanCarry=P;window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_heat.js','utf8'));const host={getState:()=>s,pause:vi.fn(),ended:()=>false,apply:vi.fn()};ui=window.KitchenHeatTools.mount(host);return host;}
beforeEach(()=>{document.body.innerHTML=html+'<p id="handsDialHelp">Turn the burner dial.</p>';});
afterEach(()=>{if(ui)ui.dispose();ui=null;});

describe('Power-dependent warming explanations follow the displayed heat model',()=>{
 it('explains both warming and evaporation without prescribing a rescue setting or duration',()=>{
  const s=R.startRescue('cooled',0,'demonstrate'),before=JSON.stringify(s),text=note(s);
  expect(s.thermalModel).toBe(3);expect(text).toContain('higher sauce-pan power warms cool, wet food faster');expect(text).toContain('can remove water faster');expect(text).toContain('Off or on the trivet');expect(text).toContain('stored heat');expect(text).not.toMatch(/\b(?:30|45|60|low|medium|high|ready|successful|coating achieved)\b/);expect(JSON.stringify(s)).toBe(before);
 });
 it('keeps historical model-one and unversioned notes distinct from new warming behavior',()=>{
  for(const model of [1,undefined]){const s=R.start('tomato',2);if(model===undefined)delete s.thermalModel;else s.thermalModel=model;const legacy=R.restore(s),before=JSON.stringify(legacy),text=note(legacy);expect(text).toContain('earlier heat model');expect(text).toContain('Stored heat remains');expect(text).not.toContain('faster');expect(JSON.stringify(legacy)).toBe(before);}
  expect(note(R.start())).not.toContain('earlier heat model');
 });
 it('uses the replay frame heat model and keeps a historical pan panel read-only',()=>{
  const old=R.restore({...R.startRescue('cooled',0,'demonstrate'),thermalModel:1});const done=R.submit({...act(old,[['taste'],['panHeat',1],['advance',30],['panHeat',0],['taste'],['plate']]),answers:[1,null]});const frame=R.replay(done,done.log.length).state,before=JSON.stringify(done),host=mount(done);
  expect(note(frame)).toContain('earlier heat model');ui.render(frame,'pan',true);expect($('panPlacementReading').textContent).not.toContain('warms cool, wet food faster');expect($('panPlacementToggle').disabled).toBe(true);$('panPlacementToggle').click();expect(host.apply).not.toHaveBeenCalled();expect(JSON.stringify(done)).toBe(before);
 });
 it('shows the new mechanism beside pan handling and retains residual-heat guidance on the trivet',()=>{
  const s=warmed(3),before=JSON.stringify(s);mount(s);ui.render(s,'pan',false);expect($('panPlacementReading').textContent).toContain('Higher burner power warms cool, wet food faster');expect($('panPlacementReading').textContent).toContain('do not advance time');
  const parked=R.act(s,'panPlace','trivet');ui.render(parked,'pan',false);expect($('panPlacementReading').textContent).toContain('No burner heat reaches the pan');expect($('panPlacementReading').textContent).toContain('Stored heat can keep cooking');expect($('panPlacementReading').textContent).not.toContain('Higher burner power');expect(JSON.stringify(s)).toBe(before);
 });
 it('does not turn differing outcomes at the same elapsed time into hidden demonstrate-mode hints',()=>{
  const low=warmed(1),medium=warmed(2);expect(R.inspections(low).at(-1).bodyType).toBe('thick');expect(R.inspections(medium).at(-1).bodyType).toBe('coating');expect(R.coolingCheck(low).met).toBe(false);expect(R.coolingCheck(medium).met).toBe(true);
  const before=JSON.stringify([low,medium]);expect(note(low)).toBe(note(medium));expect(Q.describe(low,'sauce')).toEqual(Q.describe(medium,'sauce'));expect(Q.describe(low,'sauce').complete).toBe(false);expect(JSON.stringify([low,medium])).toBe(before);
 });
 it('lets an observed low-power rescue succeed after further warming without teaching a fixed timer',()=>{
  const s=warmed(1,45,'practice');expect(R.coolingCheck(s).met).toBe(true);expect(Q.describe(s,'sauce').complete).toBe(true);expect(note(s)).toContain('Inspect between short clock steps');expect(note(s)).not.toContain('45');
 });
 it('ships the version-aware note and heat panel in both runtimes',()=>{
  expect(main).toContain('renderHeatModel(view);');for(const file of ['recipe_lab.js','recipe_lab.html','recipe_lab_heat.js'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
 });
});
