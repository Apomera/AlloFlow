// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),Changes=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const $=id=>document.getElementById(id);
let state,ui,frames,nextFrame;
function render(historical=false){ui.render(state,historical,true);}
function scrub(seconds){$('sauceReplayTime').value=String(seconds);$('sauceReplayTime').dispatchEvent(new Event('input',{bubbles:true}));}
function tick(time){const entry=frames.entries().next().value;if(!entry)throw new Error('No replay frame queued');frames.delete(entry[0]);entry[1](time);}
beforeEach(()=>{
 document.body.innerHTML='<div id="replayHost"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenSauceChanges=Changes;frames=new Map();nextFrame=1;
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{const id=nextFrame++;frames.set(id,fn);return id;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
 Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));ui=window.KitchenSauceReplay.mount({container:$('replayHost')});
});
function pair(mode='practice',legacy=false){let s=R.startRescue('dry',0,mode);if(legacy){s={...s,sauceModel:1};delete s.mixingModel;s=R.restore(s);}s=R.act(s,'taste');s=R.act(s,'pour',50);s=R.act(s,'stirSweep','button');return R.act(s,'taste');}
describe('A ledger explains only recorded pairs of deliberate checks',()=>{
 it('shows conserved oil and changing dispersion after folding a separated sauce',()=>{
  state=R.act(R.startRescue('fragile',2),'taste');state=R.act(R.act(state,'stirSweep','button'),'taste');const before=JSON.stringify(state);render();
  const records=R.inspections(state),a=records[0].chemistry,b=records[1].chemistry,rows=$('sauceChangesOilContext').querySelectorAll('tbody tr');
  expect(a.oilMl).toBe(b.oilMl);expect(b.dispersion).toBeGreaterThan(a.dispersion);expect(b.freeOilMl).toBeLessThan(a.freeOilMl);
  expect(rows[0].textContent).toContain('0 mL');expect(rows[1].textContent).toContain('pp');expect($('sauceChangesNotes').textContent).toContain('redistributed, not removed');
  expect($('sauceChangesOilHelp').textContent).toContain('selected recorded checks');expect(JSON.stringify(state)).toBe(before);
 });
 it('records renewed separation during a pause without reporting oil loss',()=>{
  state=R.act(R.act(R.startRescue('fragile',2),'stirSweep','button'),'taste');state=R.act(R.act(R.act(state,'advance',60),'advance',60),'taste');render();
  const [a,b]=R.inspections(state).map(r=>r.chemistry);expect(b.dispersion).toBeLessThan(a.dispersion);expect(b.oilMl).toBe(a.oilMl);expect(b.freeOilMl).toBeGreaterThan(a.freeOilMl);
  expect($('sauceChangesNotes').textContent).toContain('smaller share');expect($('sauceChangesNotes').textContent).toContain('total oil stayed the same');
 });
 it('pins oil evidence to the selected pair after later folding and checks',()=>{
  state=pair();render();const indices=Changes.checks(state).map(r=>r.index);$('sauceReplayLater').value=String(indices[1]);$('sauceReplayLater').dispatchEvent(new Event('change',{bubbles:true}));
  const table=$('sauceChangesOilContext').textContent,notes=$('sauceChangesNotes').textContent;state=R.act(R.act(R.act(state,'pour',30),'stirSweep','button'),'taste');render();
  expect($('sauceChangesOilContext').textContent).toBe(table);expect($('sauceChangesNotes').textContent).toBe(notes.replace('The latest check still shows unmixed liquid.','The selected later check shows unmixed liquid.'));expect($('sauceChangesStale').textContent).toContain('earlier recorded pair');
 });
 it('withholds oil diagnostics in demonstrate and leaves older observation layouts intact',()=>{
  state=pair('demonstrate');render();expect($('sauceChangesOilContext')).toBeNull();
  state=R.submit({...R.act(state,'plate'),answers:[0,null]});render();expect($('sauceChangesOilContext')).not.toBeNull();
  state=R.restore({...pair(),sauceObservationModel:1});render();expect($('sauceChangesOilContext')).toBeNull();
 });
 it('treats absent oil fields as unknown and explains unmixed liquid even when scorched',()=>{
  state=R.startRescue('dry',0);state=R.act(state,'panHeat',3);for(let n=0;n<2;n++)state=R.act(state,'advance',60);state=R.act(R.act(R.act(state,'taste'),'pour',50),'taste');render();
  expect(R.inspections(state).at(-1)).toMatchObject({type:'scorched',bodyType:'unmixed'});expect($('sauceChangesNotes').textContent).toContain('after folding');expect($('sauceChangesNotes').textContent).toContain('cannot be undone');
  delete state.log.at(-1).inspection.chemistry.oilMl;delete state.log.at(-1).inspection.chemistry.dispersion;delete state.log.at(-1).inspection.chemistry.freeOilMl;render();
  expect($('sauceChangesOilContext').textContent).toContain('Not recorded');expect($('sauceChangesOilContext').textContent).not.toMatch(/NaN|undefined/);
 });
 it('appears after two checks and includes the completed mix in the recorded kitchen interval',()=>{
  state=R.startRescue('dry',0);render();expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceChangesBody').textContent).toBe('');
  state=R.act(state,'taste');render();expect($('sauceChangesLedger').hidden).toBe(true);
  state=pair();const before=JSON.stringify(state);render();expect($('sauceChangesLedger').hidden).toBe(false);expect($('sauceChangesLedger').open).toBe(false);
  expect($('sauceChangesInterval').textContent).toContain('recorded actions 1 and 4');expect($('sauceChangesInterval').textContent).toContain('0:06 of kitchen time');expect($('sauceChangesMixingTime').textContent).toContain('Completed mixing time: 6 simulated seconds');const balance=Changes.betweenChecks(state).water;expect(balance.evaporatedMl).toBeGreaterThan(0);expect(balance.absorbedMl).toBeGreaterThan(0);expect(balance.balanced).toBe(true);
  expect($('sauceChangesWater').textContent).toContain('Saved cooking water added50 mL');expect($('sauceChangesBalance').textContent).toContain('Water balance:');expect($('sauceChangesActions').textContent).toContain('1 completed mixing actions');expect(JSON.stringify(state)).toBe(before);
 });
 it('retains the completed pair until a fresh check and never pulls later quantities from the live pan',()=>{
  state=pair();render();$('sauceChangesLedger').open=true;const water=$('sauceChangesWater').textContent,context=$('sauceChangesContext').textContent,notes=$('sauceChangesNotes').textContent;
  state=R.act(R.act(state,'pour',30),'advance',30);const before=JSON.stringify(state);render();
  expect($('sauceChangesWater').textContent).toBe(water);expect($('sauceChangesContext').textContent).toBe(context);expect($('sauceChangesNotes').textContent).toBe(notes);expect($('sauceChangesLedger').open).toBe(true);
  expect($('sauceChangesStale').textContent).toContain('still ends at that recorded check');scrub(1);expect(JSON.stringify(state)).toBe(before);
  state=R.act(state,'taste');render();expect($('sauceChangesWater').textContent).toContain('Saved cooking water added30 mL');expect($('sauceChangesNotes').textContent).toContain('unmixed');
 });
 it('keeps diagnostic amounts and mechanisms out of demonstrate until submission, including plated historical views',()=>{
  state=pair('demonstrate');render();expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceChangesBody').textContent).toBe('');
  state=R.act(state,'plate');render(true);expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceChangesBody').textContent).toBe('');
  state=R.submit({...state,answers:[0,null]});render();expect($('sauceChangesLedger').hidden).toBe(false);expect($('sauceChangesBody').textContent).toContain('Cooking water carries water and starch');
 });
 it('allows a historical frame from a submitted source only through the explicit review callback',()=>{
  let source=R.submit({...R.act(pair('demonstrate'),'plate'),answers:[0,null]});state=R.replay(source,source.log.length).state;
  expect(state.submitted).toBe(false);render(true);expect($('sauceChangesLedger').hidden).toBe(true);
  ui.dispose();ui=window.KitchenSauceReplay.mount({container:$('replayHost'),reviewAllowed:()=>source.submitted===true});render(true);expect($('sauceChangesLedger').hidden).toBe(false);
  source={...source,submitted:false};render(true);expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceChangesBody').textContent).toBe('');
 });
 it('shows missing historical measurements as unknown and withholds a water equation',()=>{
  state=pair('practice',true);render();expect($('sauceChangesLedger').hidden).toBe(false);expect($('sauceChangesWater').textContent).toContain('Water evaporated from the sauceNot recorded');expect($('sauceChangesContext').textContent).toContain('Modeled pan temperatureNot recorded');
  expect($('sauceChangesInterval').textContent).toContain('0:00 of kitchen time');expect($('sauceChangesMixingTime')).toBeNull();expect($('sauceChangesBalance').textContent).toContain('does not include every quantity');expect($('sauceChangesBody').textContent).not.toMatch(/NaN|undefined/);
 });
 it('withholds a balanced equation when recorded endpoints do not reconcile',()=>{
  state=pair();state.log.at(-1).inspection.chemistry.waterMl+=7;render();expect($('sauceChangesBalance').textContent).toContain('do not reconcile');expect($('sauceChangesBalance').textContent).not.toContain('≈');
 });
 it('degrades to the recorded trails when the optional ledger module is unavailable',()=>{
  state=pair();delete window.KitchenSauceChanges;render();expect($('sauceChangesLedger').hidden).toBe(true);expect($('sauceReplayCurrent').dataset.type).toBe(S.reading(state).type);expect($('sauceReplayCurrent').querySelector('svg')).not.toBeNull();scrub(1);expect($('sauceReplayElapsed').textContent).toBe('1.00 s');
 });
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();document.body.replaceChildren();delete window.KitchenSauceChanges;});
describe('Recorded trails retain their full duration',()=>{
 it('extends a thick trail beyond three seconds and shows its final closure',()=>{
  state=R.act(R.startRescue('starchy',0),'taste');render();const before=JSON.stringify(state),reading=S.reading(state);
  expect(reading.closureSeconds).toBe(4);expect($('sauceReplayTime').max).toBe('4');expect($('sauceReplayEnd').textContent).toBe('4 seconds later');
  scrub(3);expect(Number($('sauceReplayCurrent').querySelector('svg').dataset.trailWidth)).toBeGreaterThan(0);scrub(4);
  expect($('sauceReplayCurrent').querySelector('.sauce-replay-trail').getAttribute('visibility')).toBe('hidden');expect(JSON.stringify(state)).toBe(before);
 });
 it('plays to the full recorded duration and preserves the longer prior trail after rescue',()=>{
  state=R.act(R.startRescue('starchy',0),'taste');state=R.act(R.act(R.act(state,'pourPlain',50),'stirSweep','button'),'taste');render();
  expect($('sauceReplayTime').max).toBe('4');$('sauceReplayPlay').click();tick(0);for(let time=250;time<=3000;time+=250)tick(time);
  expect(frames.size).toBe(1);expect($('sauceReplayPlay').getAttribute('aria-pressed')).toBe('true');for(let time=3250;time<=4000;time+=250)tick(time);
  expect(frames.size).toBe(0);expect($('sauceReplayPlay').getAttribute('aria-pressed')).toBe('false');expect(Number($('sauceReplayTime').value)).toBe(4);
 });
 it('returns ordinary and empty recordings to the existing three-second timeline',()=>{
  state=R.act(R.startRescue('starchy',0),'taste');render();scrub(4);state=R.act(R.startRescue('dry',0),'taste');render();
  expect($('sauceReplayTime').max).toBe('3');expect($('sauceReplayEnd').textContent).toBe('3 seconds later');expect(Number($('sauceReplayTime').value)).toBe(0);
  state=R.start();render();expect($('sauceReplayTime').max).toBe('3');expect($('sauceReplayTime').disabled).toBe(true);
 });
});
