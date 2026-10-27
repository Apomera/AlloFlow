// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const runtime=process.env.KITCHEN_MOTION_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_engine.js'));
const load=file=>require(path.join(runtime,'recipe_lab_'+file+'.js'));
const R=load('engine');window.KitchenRecipes=R;
const Pan=load('pan_choice'),Lid=load('lid'),Rinse=load('rinsing'),Pot=load('pot_lab'),Garlic=load('garlic');
const $=id=>document.getElementById(id);
let cleanups=[];
afterEach(()=>{cleanups.reverse().forEach(fn=>fn());cleanups=[];vi.restoreAllMocks();document.body.replaceChildren();});

function mounted(module,initial){
 document.body.innerHTML='<div id="beforeLesson"></div>';let state=initial;
 const host={after:$('beforeLesson'),getState:()=>state,has3D:()=>true,pause:vi.fn(),cancelNative:vi.fn(),openNative:vi.fn(),openHandwashing:vi.fn(),openDrying:vi.fn(),open:vi.fn(),clock:vi.fn(),apply:vi.fn()};
 const ui=module.mount(host);ui.render(state,false,true);cleanups.push(()=>ui.dispose());
 return {ui,host,state:()=>state,render(next=state,historical=false){state=next;ui.render(state,historical,false);}};
}
function watch(id){
 const node=$(id),observer=new MutationObserver(()=>{});observer.observe(node,{childList:true,characterData:true,subtree:true});cleanups.push(()=>observer.disconnect());
 expect(node.getAttribute('role')).toBe('status');expect(node.getAttribute('aria-live')).toBe('polite');expect(node.getAttribute('aria-atomic')).toBe('true');
 return {node,take:()=>observer.takeRecords()};
}
function accepted(state,action,value){const next=R.act(state,action,value);expect(next.log.at(-1)).toMatchObject({action,accepted:true});return next;}

describe('Kitchen status updates announce changes without repeating unchanged guidance',()=>{
 it.each([
  {name:'empty-pan readiness',module:Pan,status:'panChoiceStatus',initial:()=>R.start(),unrelated:['wash'],changed:['panHeat',1],message:'Turn the pan burner off'},
  {name:'lid placement',module:Lid,status:'lidStatus',initial:()=>R.act(R.start(),'fill'),unrelated:['wash'],changed:['lidPlace','covered'],message:'carry it to the marked rest'},
  {name:'rinsing readiness',module:Rinse,status:'rinseStatus',initial:()=>R.start(),unrelated:['fill'],changed:['wash'],message:'Carry the basket to the sensor faucet'}
 ])('keeps $name quiet on unrelated accepted actions and announces its next meaningful change',spec=>{
  const m=mounted(spec.module,spec.initial()),status=watch(spec.status),initialText=status.node.textContent;
  expect(initialText).not.toBe('');for(let i=0;i<3;i++)m.render();
  m.render(accepted(m.state(),...spec.unrelated));expect(status.take()).toHaveLength(0);expect(status.node.textContent).toBe(initialText);
  m.render(accepted(m.state(),...spec.changed));expect(status.take()).toHaveLength(1);expect(status.node.textContent).toContain(spec.message);expect(status.node.textContent).not.toBe(initialText);
  m.render();m.render();expect(status.take()).toHaveLength(0);expect(m.host.apply).not.toHaveBeenCalled();
 });

 it('announces a prediction and observed pot change once, while unrelated cooking leaves both statuses quiet',()=>{
  const m=mounted(Pot,R.act(R.start(),'fill')),outcome=watch('potLabOutcome'),observation=watch('potLabObservation');
  m.render();m.render(accepted(m.state(),'wash'));expect(outcome.take()).toHaveLength(0);expect(observation.take()).toHaveLength(0);
  const prediction=document.querySelector('#potLabChoices input[value="0"]');prediction.checked=true;prediction.dispatchEvent(new Event('change',{bubbles:true}));
  expect(outcome.take()).toHaveLength(1);expect(outcome.node.textContent).toContain('Prediction noted.');expect(observation.take()).toHaveLength(0);
  m.render(accepted(m.state(),'potHeat',3));expect(outcome.take()).toHaveLength(1);expect(observation.take()).toHaveLength(1);expect(outcome.node.textContent).toContain('Your prediction matches this observation.');expect(observation.node.textContent).toContain('The dial changed from off to high.');
  for(let i=0;i<3;i++)m.render();expect(outcome.take()).toHaveLength(0);expect(observation.take()).toHaveLength(0);expect(m.host.apply).not.toHaveBeenCalled();
 });

 it('keeps an earlier selected pot reading quiet as new readings arrive, then announces deliberate navigation',()=>{
  let state=accepted(R.start(),'fill');state=accepted(state,'potHeat',3);
  const m=mounted(Pot,state);$('potLabPrevious').click();const observation=watch('potLabObservation'),earlier=observation.node.textContent;
  m.render(accepted(m.state(),'potHeat',2));expect(observation.take()).toHaveLength(0);expect(observation.node.textContent).toBe(earlier);
  $('potLabLatest').click();expect(observation.take()).toHaveLength(1);expect(observation.node.textContent).toContain('The dial changed from high to medium.');
  m.render();expect(observation.take()).toHaveLength(0);
 });

 it('keeps the garlic preparation summary quiet until a clove or replay status changes',()=>{
  document.body.innerHTML='<div id="benchObservation"></div>';let state=accepted(R.start(),'wash');
  // This older panel has no dispose method, so remove only the listeners it installs.
  for(const target of [window,document]){
   const add=target.addEventListener.bind(target),listeners=[];
   vi.spyOn(target,'addEventListener').mockImplementation((...args)=>{listeners.push(args);return add(...args);});
   cleanups.push(()=>listeners.forEach(args=>target.removeEventListener(...args)));
  }
  const host={getState:()=>state,ended:()=>false,pause:vi.fn(),apply:vi.fn()},ui=Garlic.mount(host);ui.render(state,'prep',false);
  const status=watch('garlicPrepStatus'),original=status.node.textContent;ui.render(state,'prep',false);state=accepted(state,'fill');ui.render(state,'prep',false);
  for(let i=0;i<2;i++){state=accepted(state,'minceGarlic',0);ui.render(state,'prep',false);}
  expect(status.take()).toHaveLength(0);expect(status.node.textContent).toBe(original);
  state=accepted(state,'minceGarlic',0);ui.render(state,'prep',false);expect(status.take()).toHaveLength(1);expect(status.node.textContent).toContain('1 of 2 cloves minced.');
  ui.render(state,'prep',false);expect(status.take()).toHaveLength(0);ui.render(state,'prep',true);expect(status.take()).toHaveLength(1);expect(status.node.textContent).toContain('Knife passes are locked in replay.');ui.render(state,'prep',true);expect(status.take()).toHaveLength(0);expect(host.apply).not.toHaveBeenCalled();
 });
});
