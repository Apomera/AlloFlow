import {describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),Q=require('../stem_lab/kitchen_studio/recipe_lab_quests.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const act=(s,steps)=>steps.reduce((state,[action,value])=>R.act(state,action,value),s);
const start=(mode='demonstrate')=>R.startRescue('fragile',2,mode);
const coating=mode=>act(start(mode),[['taste'],['pour',30],['stirSweep','button'],['taste']]);
const durable=mode=>act(coating(mode),[['advance',60],['advance',60],['taste']]);
const finish=s=>R.submit({...R.act(s,'plate'),answers:[2,null]});

describe('Fragile emulsion challenge integration',()=>{
 it('routes diagnosis, adjustment, first coating and later evidence without prescribing a dose',()=>{
  let s=start('practice'),q=Q.describe(s,'sauce');expect(q.count).toBe(0);expect(q.next.tool).toBe('check');
  s=R.act(s,'taste');q=Q.describe(s,'sauce');expect(q.count).toBe(1);expect(q.next.tool).toBe('stir');
  s=R.act(s,'stirSweep','button');expect(Q.describe(s,'sauce').next.tool).toBe('check');
  s=R.act(s,'taste');expect(Q.describe(s,'sauce').count).toBe(2);expect(Q.describe(s,'sauce').try).toContain('Advance');
  s=act(s,[['advance',60],['advance',60],['taste']]);q=Q.describe(s,'sauce');expect(q.count).toBe(1);expect(q.complete).toBe(false);
 });
 it('completes from observed stability and reopens after a material adjustment',()=>{
  let s=durable('practice');expect(Q.describe(s,'sauce').complete).toBe(true);s=R.act(s,'pour',10);const q=Q.describe(s,'sauce');expect(q.count).toBe(1);expect(q.next.tool).toBe('stir');expect(q.try).toContain('restart');
 });
 it('keeps diagnosis and stability in detached comparison evidence',()=>{
  const a=finish(coating()),b=finish(durable()),before=JSON.stringify(b),comparison=M.compare(a,b);
  expect(comparison.sauceObservationModel).toBe(2);expect(comparison.a.emulsionCheck.met).toBe(false);expect(comparison.b.emulsionCheck.met).toBe(true);expect(comparison.changes[3].change).toBe('improved');
  comparison.b.emulsionCheck.baselineIndex=999;expect(JSON.stringify(b)).toBe(before);
  expect(M.compare(R.restore(a),R.restore(b))).toEqual(M.compare(a,b));
 });
 it('keeps recorded body protocols separate without inventing flags on legacy exports',()=>{
  let current=act(R.startRescue('dry',0),[['pour',50],['stirSweep','button'],['taste'],['plate']]);current=R.submit({...current,answers:[0,null]});
  const raw=JSON.parse(JSON.stringify(current));delete raw.sauceObservationModel;const legacy=R.restore(raw);
  expect(M.incompatibility(legacy,current)).toContain('different observation models');expect(M.compare(legacy,current)).toBeNull();
  const comparison=M.compare(legacy,R.restore(legacy));expect(comparison).not.toHaveProperty('sauceObservationModel');expect(comparison.a).not.toHaveProperty('sauceObservationModel');expect(comparison.a).not.toHaveProperty('emulsionCheck');
 });
 it('renders all four dilution milestones and returns to three emulsion milestones',()=>{
  document.body.innerHTML='<div class="camera-row"></div>';const ui=Q.mount({pause:vi.fn(),ended:()=>false,has3D:()=>false,open:vi.fn()});
  ui.render(R.startRescue('starchy',0),false);document.querySelector('[data-quest="sauce"]').click();
  expect(document.querySelectorAll('.quest-steps li')).toHaveLength(4);expect(document.querySelector('[data-quest="sauce"]').textContent).toContain('0 / 4');
  ui.render(durable('practice'),false);expect(document.querySelectorAll('.quest-steps li')).toHaveLength(3);expect(document.querySelector('#questInstruction').textContent).toContain('3 steps practiced');
 });
});


describe('Fragile demonstrate quests retain assessment integrity',()=>{
 it('gives identical neutral guidance for identical recorded checks despite different unobserved oil separation',()=>{
  const observed=act(coating(),[['advance',60]]),smooth=JSON.parse(JSON.stringify(observed)),separated=JSON.parse(JSON.stringify(observed));
  smooth.pan.chemistry.dispersion=.99;separated.pan.chemistry.dispersion=.01;
  expect(R.sauceChemistry(smooth).oilDroplets).toBe(false);expect(R.sauceChemistry(separated).oilDroplets).toBe(true);
  const before=JSON.stringify([smooth,separated]),a=Q.describe(smooth,'sauce'),b=Q.describe(separated,'sauce');
  expect(a).toEqual(b);expect(a.observationOnly).toBe(true);expect(a.try).toContain('Draw a fresh spoon trail');expect(a.next.tool).toBe('check');expect(a.complete).toBe(false);expect(JSON.stringify([smooth,separated])).toBe(before);
 });
 it('records the observation sequence without declaring either stable or re-separated sauce successful before submission',()=>{
  const stable=durable(),unstable=act(start(),[['taste'],['stirSweep','button'],['taste'],['advance',60],['advance',60],['taste']]);
  expect(R.emulsionCheck(stable).met).toBe(true);expect(R.emulsionCheck(unstable).met).toBe(false);
  for(const state of [stable,unstable]){const q=Q.describe(state,'sauce');expect(q.complete).toBe(false);expect(q.count).toBe(3);expect(q.observedCount).toBe(3);expect(q.try).toContain('Compare your recorded checks');expect(q.try).not.toMatch(/continuous|successful|lasted|separated again/);}
 });
 it('renders recorded observations without progress verdicts or disabling further checks',()=>{
  document.body.innerHTML='<div class="camera-row"></div>';const ui=Q.mount({pause:vi.fn(),ended:()=>false,has3D:()=>false,open:vi.fn()});
  ui.render(durable(),false);document.querySelector('[data-quest="sauce"]').click();
  expect(document.querySelector('#questInstruction').textContent).toContain('Compare your recorded checks');expect(document.querySelector('#questInstruction').textContent).not.toContain('practiced');
  expect(document.querySelector('#questStatus').textContent).toContain('not a verdict');expect(document.querySelector('[data-quest="sauce"]').textContent).toContain('3 spoon checks');expect(document.querySelectorAll('.quest-step-done')).toHaveLength(0);expect(document.querySelector('#questTry').disabled).toBe(false);
 });
 it('keeps practice advice responsive to heavy body and oil together',()=>{
  let s=act(start('practice'),[['taste'],['advance',120],['taste']]);s.pan.moisture=8;s.pan.chemistry.dispersion=.01;
  const chemistry=R.sauceChemistry(s);expect(chemistry.oilDroplets).toBe(true);expect(['dry','thick']).toContain(chemistry.bodyType);
  const q=Q.describe(s,'sauce');expect(q.try).toContain('Choose an adjustment');expect(q.try).not.toContain('first continuous coating');
 });
});
