// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const require=createRequire(import.meta.url),runtime=process.env.KITCHEN_SCALE_FOCUS_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_scene.js'));
const R=require(path.join(runtime,'recipe_lab_engine.js')),THREE=require('../vendor/three-r128/three.min.js'),$=id=>document.getElementById(id);
const actions=[['record','sceneRecordWeight'],['restore','sceneRestoreWeight']];
let ui;
beforeEach(()=>{
 const panel=()=>({render:vi.fn(),dispose:vi.fn()});
 window.KitchenRecipes=R;
 // Exercise the actual scene controller and recipe engine without allocating a renderer.
 for(const name of ['KitchenSauceCheck','KitchenPlating','KitchenPanFolding','KitchenJugPour','KitchenLadleCarry','KitchenTomatoPress','KitchenToolRack','KitchenObjectTools','KitchenDryPasta','KitchenCuttingBench'])window[name]={mountPanel:panel};
 window.KitchenWorkspace={mountTools:()=>({render:vi.fn(),clearHover:vi.fn(),dismissHover:()=>false,gesture:vi.fn(),dispose:vi.fn()})};
 window.KitchenSampling={reading:()=>null};window.KitchenTurning={reading:()=>null};window.KitchenOil={info:()=>({amount:0,goal:20,detail:'Measure oil before carrying it.'})};
 new Function('window',readFileSync(path.join(runtime,'recipe_lab_scene.js'),'utf8'))(window);
});
afterEach(()=>{if(ui)ui.dispose();ui=null;vi.restoreAllMocks();document.body.replaceChildren();});

function mounted(options={}){
 document.body.innerHTML='<div id="recipeScene"><canvas></canvas></div><div class="kitchen-action-feedback"></div><button id="outside">Another activity</button>';
 let state=R.act(R.start(),'weigh',160,'keyboard'),amount=180,locked=false;
 const host={THREE,canvas:document.querySelector('canvas'),orbit:{enabled:true},getState:()=>state,locked:()=>locked,oilInfo:()=>({amount:0}),scaleInfo:()=>({amount,recorded:state.prep.pasta,locked,historical:locked,inPot:false})};
 for(const name of ['clearPreview','highlightTarget','draw','selectRack','sauceActive','foldActive','crushActive','weighActive','frameWeigh','pause'])host[name]=vi.fn();
 host.recordScale=vi.fn(()=>{state=R.act(state,'weigh',amount,'scene-weigh');ui.update(state);if(options.afterAction)options.afterAction('record');});
 host.changeScale=vi.fn(value=>{amount=value;ui.refreshScale();if(options.afterAction)options.afterAction('restore');});
 ui=window.KitchenSceneTools.mount3D(host);
 const drawer=document.createElement('details');drawer.id='sceneToolDrawer';drawer.open=true;drawer.innerHTML='<summary>Tools & keyboard controls</summary>';const controls=document.querySelector('.scene-direct-tools');controls.before(drawer);drawer.append(controls);
 const target=$('sceneKeyboardTools');target.getClientRects=()=>options.noTargetLayout?[]:[{left:20,top:900,width:180,height:44}];target.scrollIntoView=vi.fn();
 $('sceneKitchenTool').value='weigh';$('sceneKitchenTool').dispatchEvent(new Event('change',{bubbles:true}));
 return {ui,host,target,drawer,state:()=>state,amount:()=>amount,setAmount(value){amount=value;},setLocked(value){locked=value;},setState(value){state=value;}};
}

describe('3D scale action focus continuity',()=>{
 it.each(actions)('keeps a focused %s action in the workflow after it disables itself', (action,id)=>{
  const m=mounted(),source=$(id),before=m.state(),logs=before.log.length,time=before.time;expect(source.hidden).toBe(false);expect(source.disabled).toBe(false);source.focus();source.click();
  expect(source.disabled).toBe(true);expect(document.activeElement).toBe(m.target);expect(m.target.scrollIntoView).toHaveBeenCalledExactlyOnceWith({block:'nearest',inline:'nearest'});
  expect($('sceneRecordWeight').disabled).toBe(true);expect($('sceneRestoreWeight').disabled).toBe(true);expect(m.state().time).toBe(time);
  if(action==='record'){expect(m.host.recordScale).toHaveBeenCalledOnce();expect(m.host.changeScale).not.toHaveBeenCalled();expect(m.state().prep.pasta).toBe(180);expect(m.state().log).toHaveLength(logs+1);expect(m.state().log.at(-1)).toMatchObject({action:'weigh',value:180,accepted:true,interaction:'scene-weigh'});expect($('sceneActionStatus').textContent).toBe(m.state().feedback);}
  else{expect(m.host.changeScale).toHaveBeenCalledExactlyOnceWith(160);expect(m.host.recordScale).not.toHaveBeenCalled();expect(m.amount()).toBe(160);expect(m.state()).toBe(before);expect($('sceneActionStatus').textContent).toBe('Recorded amount restored to the scale.');}
  source.click();expect(action==='record'?m.host.recordScale:m.host.changeScale).toHaveBeenCalledOnce();expect(m.target.scrollIntoView).toHaveBeenCalledTimes(1);
 });
 it.each(actions)('repairs native focus loss to body after a focused %s action', (action,id)=>{
  const m=mounted({afterAction:()=>$(id).blur()});$(id).focus();$(id).click();expect(document.activeElement).toBe(m.target);expect(action==='record'?m.host.recordScale:m.host.changeScale).toHaveBeenCalledOnce();
 });
 it.each(actions)('does not take focus for an unfocused programmatic %s action', (action,id)=>{
  const m=mounted();$('outside').focus();$(id).click();expect($(id).disabled).toBe(true);expect(document.activeElement).toBe($('outside'));expect(m.target.scrollIntoView).not.toHaveBeenCalled();expect(action==='record'?m.host.recordScale:m.host.changeScale).toHaveBeenCalledOnce();
 });
 it.each(actions)('preserves a host-directed destination during a focused %s action', (action,id)=>{
  const m=mounted({afterAction:()=>$('outside').focus()});$(id).focus();$(id).click();expect($(id).disabled).toBe(true);expect(document.activeElement).toBe($('outside'));expect(m.target.scrollIntoView).not.toHaveBeenCalled();
 });
 it.each(actions)('keeps focus on %s when the action leaves it enabled', (action,id)=>{
  const m=mounted();(action==='record'?m.host.recordScale:m.host.changeScale).mockImplementation(()=>{});$(id).focus();$(id).click();expect($(id).disabled).toBe(false);expect(document.activeElement).toBe($(id));expect(m.target.scrollIntoView).not.toHaveBeenCalled();
 });
 it('does not perform a handoff during passive scale refreshes or historical renders',()=>{
  const m=mounted(),focus=vi.spyOn(m.target,'focus');$('sceneRecordWeight').focus();m.setAmount(160);m.ui.refreshScale();expect($('sceneRecordWeight').disabled).toBe(true);expect(focus).not.toHaveBeenCalled();expect(m.target.scrollIntoView).not.toHaveBeenCalled();
  $('outside').focus();m.setAmount(180);m.setLocked(true);m.ui.update(m.state());expect($('sceneRestoreWeight').disabled).toBe(true);expect(focus).not.toHaveBeenCalled();expect(document.activeElement).toBe($('outside'));expect(m.host.recordScale).not.toHaveBeenCalled();expect(m.host.changeScale).not.toHaveBeenCalled();
 });
 it.each(['hidden','inert','closed','disabled','no-layout','visibility'])('does not hand focus into an unavailable %s destination',mode=>{
  const m=mounted({noTargetLayout:mode==='no-layout',afterAction:()=>{if(mode==='hidden')m.target.hidden=true;if(mode==='inert')m.drawer.setAttribute('inert','');if(mode==='closed')m.drawer.open=false;if(mode==='disabled')m.target.disabled=true;if(mode==='visibility')m.target.style.visibility='hidden';}}),focus=vi.spyOn(m.target,'focus');$('sceneRecordWeight').focus();$('sceneRecordWeight').click();expect(m.host.recordScale).toHaveBeenCalledOnce();expect(focus).not.toHaveBeenCalled();expect(m.target.scrollIntoView).not.toHaveBeenCalled();
 });
 it('removes the scale click handlers when the scene controller is disposed',()=>{
  const m=mounted(),record=$('sceneRecordWeight'),restore=$('sceneRestoreWeight');m.ui.dispose();ui=null;record.click();restore.click();expect(m.host.recordScale).not.toHaveBeenCalled();expect(m.host.changeScale).not.toHaveBeenCalled();
 });
});
