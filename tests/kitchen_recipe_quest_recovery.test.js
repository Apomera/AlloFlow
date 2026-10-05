import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const Q=require('../stem_lab/kitchen_studio/recipe_lab_quests.js');

function oversizedPieces(id='mushroom',servings=2,inPan=true){
 let s=R.start(id,servings);
 for(const [action,value] of [['wash'],['rinse'],['slice','0:20'],['finishCuts'],['oil']]){
  s=R.act(s,action,value);
  expect(s.log.at(-1).accepted).toBe(true);
 }
 if(inPan)s=R.act(s,'produce');
 return s;
}
function finishGarlic(s){
 for(let index=0;index<R.ingredients(s).garlic;index++)for(let pass=0;pass<3;pass++)s=R.act(s,'minceGarlic',index);
 return s;
}

describe('Preparation quests recover from irreversible cut choices',()=>{
 for(const id of ['mushroom','tomato'])for(const servings of [2,4]){
  it(id+' keeps earned progress and offers remaining garlic for '+servings+' servings',()=>{
   const s=oversizedPieces(id,servings),before=JSON.stringify(s),d=Q.describe(s,'prep');
   expect(d.steps.map(step=>step.done)).toEqual([true,false,false]);
   expect(d.count).toBe(1);
   expect(d.complete).toBe(false);
   expect(d.blocked).toBe(false);
   expect(d.next).toMatchObject({tool:'mince',view:'garlic',zone:'prep'});
   expect(d.retry).toContain('fresh cook');
   expect(d.try).toContain('remaining garlic clove');
   expect(d.try).not.toContain('Follow the ruler');
   expect(Q.describe(R.restore(s),'prep')).toEqual(d);
   expect(JSON.stringify(s)).toBe(before);
  });
 }

 it('continues partial garlic preparation without offering another cut',()=>{
  const s=R.act(oversizedPieces(),'minceGarlic',0),d=Q.describe(s,'prep');
  expect(R.garlicPreparation(s).cloves[0].stage).toBe(1);
  expect(d.next.tool).toBe('mince');
  expect(d.blocked).toBe(false);
  expect(d.count).toBe(1);
 });

 it('ends available preparation practice while preserving two earned steps',()=>{
  const s=finishGarlic(oversizedPieces()),d=Q.describe(s,'prep');
  expect(d.steps.map(step=>step.done)).toEqual([true,false,true]);
  expect(d.count).toBe(2);
  expect(d.complete).toBe(false);
  expect(d.blocked).toBe(true);
  expect(d.next).toBeNull();
  expect(d.try).toContain('target-width cuts in a fresh cook');
  const transferred=Q.describe(R.act(s,'garlic'),'prep');
  expect(transferred).toMatchObject({steps:d.steps,count:2,complete:false,blocked:true,next:null,retry:d.retry});
  expect(transferred.notice).toContain('Prepared garlic is in the sauce pan');
 });

 it('still offers editable cuts before those pieces enter the pan',()=>{
  const s=oversizedPieces('mushroom',2,false),d=Q.describe(s,'prep');
  expect(d.next.tool).toBe('cut');
  expect(d.retry).toBeUndefined();
  expect(d.blocked).toBeUndefined();
  const reset=R.act(s,'resetCuts');
  expect(reset.log.at(-1).accepted).toBe(true);
  expect(reset.prep.cut).toBe(false);
 });

 it('keeps target-width preparation fully achievable after transfer',()=>{
  let s=R.start();
  for(const action of ['wash','rinse','cut','oil','produce'])s=R.act(s,action);
  expect(Q.describe(s,'prep').next.tool).toBe('mince');
  const d=Q.describe(finishGarlic(s),'prep');
  expect(d.count).toBe(3);
  expect(d.complete).toBe(true);
  expect(d.retry).toBeUndefined();
 });
});

describe('Preparation recovery controls',()=>{
 let host,ui;
 beforeEach(()=>{
  document.body.innerHTML='<div class="camera-row"></div>';
  host={pause:vi.fn(),ended:()=>false,has3D:()=>true,open:vi.fn()};
  ui=Q.mount(host);
 });

 it('shows the retry explanation and opens only remaining garlic practice',()=>{
  ui.render(oversizedPieces(),false);
  expect(document.getElementById('questStatus').textContent).toContain('fresh cook');
  expect(document.getElementById('questTry').disabled).toBe(false);
  expect(document.querySelector('[data-quest="prep"]').textContent).toContain('1 / 3 steps');
  document.getElementById('questTry').click();
  expect(host.open).toHaveBeenCalledWith(expect.objectContaining({tool:'mince'}),false);
 });

 it('disables impossible launches without calling the incomplete quest finished',()=>{
  ui.render(finishGarlic(oversizedPieces()),false);
  expect(document.querySelector('[data-quest="prep"]').textContent).toContain('2 / 3 steps');
  expect(document.getElementById('questStatus').textContent).toContain('Completed preparation steps are kept');
  expect(document.getElementById('questInstruction').textContent).not.toContain('Three steps practiced');
  for(const id of ['questTry','questKeyboard']){
   const button=document.getElementById(id);
   expect(button.disabled).toBe(true);
   button.click();
  }
  expect(host.open).not.toHaveBeenCalled();
 });
});
