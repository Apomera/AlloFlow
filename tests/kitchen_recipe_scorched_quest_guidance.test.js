import {describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),Q=require('../stem_lab/kitchen_studio/recipe_lab_quests.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const act=(s,steps)=>steps.reduce((state,[action,value])=>R.act(state,action,value),s);
function burn(s){s=R.act(s,'panHeat',3);for(let i=0;i<20&&s.pan.damage<1;i++)s=R.act(s,'advance',60);return act(s,[['panHeat',0],['taste']]);}
function rescue(id,mode='practice'){return burn(R.act(R.startRescue(id,0,mode),'taste'));}
function ui(s,historical=false){document.body.innerHTML='<div class="camera-row"></div>';const host={pause:vi.fn(),ended:()=>false,has3D:()=>false,open:vi.fn()},view=Q.mount(host);view.render(s,historical);document.querySelector('[data-quest="sauce"]').click();return {host,view};}
const repairRoute={tool:'check',view:'pan',zone:'finish'};

describe('Sauce quests acknowledge irreversible damage before coaching another repair',()=>{
 for(const id of R.rescues.map(r=>r.id))it('offers a fresh '+id+' rescue while retaining the recorded cook',()=>{
  const s=rescue(id),before=JSON.stringify(s),criteria=R.criteria(s),evidence=R.evidence(s),d=Q.describe(s,'sauce');
  expect(s.pan.damage).toBeGreaterThanOrEqual(1);expect(d.next).toEqual(repairRoute);
  expect(d.try).toContain('Scorching cannot be undone. Start a fresh rescue');expect(d.try).toContain('record a final spoon check and review this attempt');
  expect(d.try).not.toMatch(/Try gentle|Choose an adjustment|Open water choices|Lift the saved-water jug/);
  expect(Q.describe(R.restore(s),'sauce')).toEqual(d);expect(R.criteria(s)).toEqual(criteria);expect(R.evidence(s)).toEqual(evidence);expect(JSON.stringify(s)).toBe(before);
  expect(d.count).toBe(d.steps.filter(step=>step.done).length);expect(d.complete).toBe(d.count===d.steps.length);
 });
 for(const id of ['mushroom','tomato'])it('uses a fresh full cook for a scorched '+id+' recipe',()=>{
  let s=R.start(id,2,'practice');for(const [action,value] of cook(id).steps){if(action==='plate')break;s=R.act(s,action,value);}s=burn(s);
  const d=Q.describe(s,'sauce');expect(s.pan.damage).toBeGreaterThanOrEqual(1);expect(d.try).toContain('Start a fresh cook');expect(d.next).toEqual(repairRoute);
 });
 for(const id of ['cooled','fragile','starchy','holding'])it('keeps demonstration guidance observational for '+id,()=>{
  const s=rescue(id,'demonstrate'),d=Q.describe(s,'sauce');expect(d.try).not.toContain('Start a fresh');expect(d.try).not.toContain('Scorching cannot');
  if(['cooled','fragile'].includes(id)){expect(d.observationOnly).toBe(true);expect(d.complete).toBe(false);}
 });
 it('does not change earlier mixing or observation protocol guidance',()=>{
  for(const model of [{mixingModel:1},{sauceObservationModel:1}])for(const id of ['dry','cooled','fragile','starchy']){
   const s=R.restore({...rescue(id),...model}),d=Q.describe(s,'sauce');expect(d.try).not.toContain('Scorching cannot be undone. Start a fresh');expect(d.next).not.toEqual(repairRoute);
  }
 });
 it('does not replace useful coaching before irreversible damage',()=>{
  for(const id of R.rescues.map(r=>r.id)){const s=R.act(R.startRescue(id,0,'practice'),'taste');expect(s.pan.damage).toBe(0);expect(Q.describe(s,'sauce').try).not.toContain('Start a fresh');}
 });
 it('shows the fresh-attempt guidance after all three practice steps were earned',()=>{
  let s=act(R.startRescue('dry',0,'practice'),[['pour',20],['stirSweep','button'],['taste']]);expect(Q.describe(s,'sauce').complete).toBe(true);s=burn(s);
  const d=Q.describe(s,'sauce');expect(d.steps.every(step=>step.done)).toBe(true);expect(d.complete).toBe(true);ui(s);
  expect(document.getElementById('questInstruction').textContent).toBe(d.try);expect(document.getElementById('questInstruction').textContent).toContain('Scorching cannot be undone');
 });
 it('opens a final check through existing controls without creating cooking evidence',()=>{
  const s=rescue('starchy'),before=JSON.stringify(s),{host}=ui(s);document.getElementById('questKeyboard').click();expect(host.open).toHaveBeenCalledWith(repairRoute,true);expect(JSON.stringify(s)).toBe(before);
 });
 it('keeps historical controls disabled while showing the recorded damage',()=>{
  const s=rescue('fragile'),before=JSON.stringify(s),{host}=ui(s,true);expect(document.getElementById('questInstruction').textContent).toContain('Scorching cannot be undone');expect(document.getElementById('questKeyboard').disabled).toBe(true);document.getElementById('questTry').click();expect(host.open).not.toHaveBeenCalled();expect(JSON.stringify(s)).toBe(before);
 });
});
