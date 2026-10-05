// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),P=require('../stem_lab/kitchen_studio/recipe_lab_pan_choice.js'),T=require('../vendor/three-r128/three.min.js');
const $=id=>document.getElementById(id),p=at=>({x:at.x,z:at.z}),screen=(x=100,y=100)=>({x,y});
function carried(s,choice='wide'){return P.move(P.start(s,choice,p(P.sources[choice]),screen()),p(R.panPosition(s)),screen(200,160));}
let cleanups=[];
afterEach(()=>{cleanups.reverse().forEach(fn=>fn());cleanups=[];vi.restoreAllMocks();document.body.replaceChildren();});
function mounted(s=R.start(),is3D=true){
 document.body.innerHTML='<div id="prior"></div>';let live=s;
 const host={after:$('prior'),pause:vi.fn(),cancelNative:vi.fn(),openNative:vi.fn(),has3D:()=>is3D,getState:()=>live,apply:vi.fn((a,v,i)=>{live=R.act(live,a,v,i);ui.render(live,false,false);})},ui=P.mount(host);
 ui.render(s,false,true);cleanups.push(()=>ui.dispose());return {host,ui,state:()=>live,setLive:n=>live=n};
}
function press(key,repeat=false){$('panChoiceControl').dispatchEvent(new KeyboardEvent('keydown',{key,repeat,bubbles:true,cancelable:true}));}
function keys(){press('ArrowUp');press('ArrowRight');press('ArrowDown');}
function decorated(s=R.start()){
 const world=new T.Group(),canvas=document.createElement('canvas');
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillRect:vi.fn(),strokeRect:vi.fn(),fillText:vi.fn()});
 const mesh=(geometry,color,x,y,z,parent,extra)=>{const o=new T.Mesh(geometry,new T.MeshStandardMaterial({...extra,color}));o.position.set(x,y,z);(parent||world).add(o);return o;};
 const detail=P.decorate({THREE:T,world,canvas,mesh});detail.update(s);cleanups.push(()=>detail.dispose());return {world,canvas,detail};
}
describe('Consequential choice of empty cookware',()=>{
 it('reads the existing batch crowding model for both recipes and both serving choices',()=>{
  for(const id of ['mushroom','tomato'])for(const servings of [2,4]){
   const s=R.start(id,servings),before=JSON.stringify(s),d=P.comparison(s);expect(d.grams).toBe(R.ingredients(s).produce);expect(d.servings).toBe(servings);expect(d.selected).toBe('standard');expect(d.choices.map(item=>item.id)).toEqual(['standard','wide']);
   for(const item of d.choices){const expected=R.inspect({...s,pan:{...s.pan,size:item.id,produce:true}}).crowded;expect(item.crowded).toBe(expected);expect(item.grams).toBe(d.grams);expect(item.servings).toBe(servings);}
   expect(d.choices[0].crowded).toBe(servings===4);expect(d.choices[1].crowded).toBe(false);expect(d.modelNote).toMatch(/14 representative pieces.*illustrative model/);expect(JSON.stringify(s)).toBe(before);
  }
 });
 it('allows only cool empty cookware, respecting history, supplied rescue, serving and engine preparation locks',()=>{
  const s=R.start();expect(P.available(s,false)).toMatchObject({mode:'cookware',cameraView:'cookware',ready:true,label:'Choose empty cookware'});expect(P.available({...s,pan:{...s.pan,temp:30}},'wide',false).ready).toBe(true);
  for(const blocked of [{...s,pan:{...s.pan,oil:true}},{...s,pan:{...s.pan,garlic:true}},{...s,pan:{...s.pan,produce:true}},{...s,pan:{...s.pan,heat:1}},{...s,pan:{...s.pan,temp:30.01}},{...s,pan:{...s.pan,temp:NaN}},{...s,rescue:{id:'dry'}},{...s,plated:true},{...s,submitted:true},{...s,time:3600},{...s,log:Array(1200).fill({})}]){
   expect(P.available(blocked,'wide',false).ready).toBe(false);expect(P.drop(blocked,carried(s),false)).toBeNull();expect(P.start(blocked,'wide',p(P.sources.wide),screen(),false)).toBeNull();
  }
  const served={...s,pan:{...s.pan,combined:true,tasted:true},log:[{accepted:true,action:'servePortion',value:0}]};expect(R.serving(served).started).toBe(true);expect(P.available(served,'wide',false).ready).toBe(false);expect(P.available(s,true).ready).toBe(false);expect(P.drop(s,carried(s),true)).toBeNull();expect(P.available(null,false).ready).toBe(false);
 });
 it('picks physical handles across tools, reports the existing choice, and preserves camera exploration',()=>{
  const s=R.start();for(const tool of ['cookware','move','cut','inspect','weigh','stir'])expect(P.pickup(s,{panChoice:'wide'},tool,false)).toMatchObject({mode:'cookware',item:'pan-choice',name:'Wide pan',ready:true});
  expect(P.pickup(s,{panChoice:'standard'},'move',false).ready).toBe(false);expect(P.pickup(s,{panChoice:'wide'},'camera',false)).toBeNull();for(const hit of [null,{pan:true},{item:'wide'},{panChoice:'enormous'}])expect(P.pickup(s,hit,'cookware',false)).toBeNull();expect(P.available(s,'nonsense',false).ready).toBe(false);
 });
 it('requires world and client travel before a real release position, with no action for taps or same selected size',()=>{
  const s=R.start(),before=JSON.stringify(s),trace=P.start(s,'wide',p(P.sources.wide),screen());expect(trace).toMatchObject({source:s,choice:'wide',position:p(P.sources.wide),phase:'carry',moved:false});expect(P.drop(s,trace,false)).toBeNull();
  expect(P.drop(s,P.move(trace,p(R.panPosition(s)),screen()),false)).toBeNull();expect(P.drop(s,P.move(trace,p(P.sources.wide),screen(200,160)),false)).toBeNull();
  const done=carried(s);expect(P.drop(s,done,false)).toBe('wide');expect(P.drop(s,{trace:done},false)).toBe('wide');expect(P.drop(s,P.move(done,{x:5,z:5},screen(240,180)),false)).toBeNull();expect(P.start(s,'standard',p(P.sources.standard),screen())).toBeNull();expect(JSON.stringify(s)).toBe(before);
 });
 it('rejects stale source state and invalid input irreversibly, including a bad final release',()=>{
  const s=R.start(),done=carried(s),next=R.act(s,'wash');expect(P.drop(next,done,false)).toBeNull();expect(P.drop({...s},done,false)).toBeNull();
  for(const point of [null,{}, {x:NaN,z:0},{x:0,z:Infinity}]){expect(P.start(s,'wide',point,screen())).toBeNull();const bad=P.move(done,point,screen());expect(bad.invalid).toBe(true);expect(P.drop(s,P.move(bad,p(R.panPosition(s)),screen(210,160)),false)).toBeNull();}
  for(const client of [null,{}, {x:NaN,y:0},{x:0,y:Infinity}])expect(P.start(s,'wide',p(P.sources.wide),client)).toBeNull();
  expect(P.drop(s,P.move(done,p(R.panPosition(s)),{x:NaN,y:10}),false)).toBeNull();expect(P.move(null,p(R.panPosition(s)),screen())).toBeNull();expect(P.drop(null,null,false)).toBeNull();expect(P.guidance(s,null)).toBeNull();
 });
 it('follows the actual pan station to its trivet and guides release without changing cookware temperature or the cook',()=>{
  let s=R.act(R.start('tomato',4),'panPlace','trivet');const before=JSON.stringify(s),trace=carried(s),at=R.panPosition(s);expect(trace.current).toEqual(p(at));expect(P.drop(s,trace,false)).toBe('wide');expect(P.guidance(s,{trace})).toMatchObject({phase:'release',target:{pan:true},over:true,progress:1});
  const future=R.act(s,'panSize',P.drop(s,trace,false),'scene-pan-size');expect(future.pan.size).toBe('wide');expect(future.pan.temp).toBe(s.pan.temp);expect(future.pan.placement).toBe('trivet');expect(future.pot).toEqual(s.pot);expect(future.prep).toEqual(s.prep);expect(future.time).toBe(s.time);expect(JSON.stringify(s)).toBe(before);expect(R.restore(future).pan.size).toBe('wide');
  expect(P.guidance(s,{trace:P.move(trace,null,null)})).toMatchObject({phase:'retry',over:false,invalid:true,progress:0});
 });
 it('uses the existing slower warming and crowding effects rather than inventing a new cookware model',()=>{
  const s=R.start('mushroom',4),wide=R.act(s,'panSize','wide');let narrow=R.act(s,'panHeat',2),broad=R.act(wide,'panHeat',2);narrow=R.act(narrow,'advance',60);broad=R.act(broad,'advance',60);expect(broad.pan.temp).toBeLessThan(narrow.pan.temp);
  for(const action of ['wash','rinse','cut','oil','produce']){narrow=R.act(narrow,action);broad=R.act(broad,action);}expect(R.inspect(narrow).crowded).toBe(true);expect(R.inspect(broad).crowded).toBe(false);
 });
});
describe('Keyboard cookware practice and honest comparison',()=>{
 it('shows the same actual batch in both footprints and opens the public sequence without recording a decision',()=>{
  const s=R.start('tomato',4),{ui,host}=mounted(s,false);expect($('panChoiceComparison').children).toHaveLength(2);expect($('panChoiceBatch').textContent).toContain('600 g tomatoes for 4 people');expect($('panChoiceModel').textContent).toMatch(/Same batch.*representative pieces.*illustrative model/);expect($('panChoiceComparison').querySelectorAll('svg ellipse')).toHaveLength(28);expect($('panChoiceTry').hidden).toBe(true);
  ui.open();expect($('panChoiceLesson').open).toBe(true);expect($('panChoiceKeyboardPanel').hidden).toBe(false);expect(document.activeElement).toBe($('panChoiceControl'));expect(host.cancelNative).toHaveBeenCalledOnce();expect(host.apply).not.toHaveBeenCalled();expect($('panChoiceLift').disabled).toBe(false);expect($('panChoiceCarry').disabled).toBe(true);expect($('panChoicePlace').disabled).toBe(true);
 });
 it('requires selection, lift, carry, lower and release, applying once and using the existing action',()=>{
  const s=R.start(),before=JSON.stringify(s),{ui,host,state}=mounted(s);ui.open();press('Enter');press('ArrowRight');press('ArrowDown');expect(host.apply).not.toHaveBeenCalled();press('ArrowUp');expect($('panChoiceCarry').disabled).toBe(false);press('Enter');press('ArrowRight');expect($('panChoiceLower').disabled).toBe(false);press('Enter');expect(host.apply).not.toHaveBeenCalled();press('ArrowDown');expect($('panChoicePlace').disabled).toBe(false);press('Enter');expect(host.apply).toHaveBeenCalledOnce();expect(host.apply).toHaveBeenCalledWith('panSize','wide','keyboard-pan-size');press('Enter');expect(host.apply).toHaveBeenCalledOnce();expect(state().pan.size).toBe('wide');expect(state().time).toBe(s.time);expect(JSON.stringify(s)).toBe(before);expect($('panChoiceSummary').textContent).toBe('Wide pan');expect($('panChoiceReceipt').textContent).toContain('completed keyboard practice');
 });
 it('supports buttons in text view, keeps native launch separate, and permits a later switch to standard',()=>{
  const {ui,host,state}=mounted(R.start(),false);$('panChoiceKeyboard').click();$('panChoiceLift').click();$('panChoiceCarry').click();$('panChoiceLower').click();$('panChoicePlace').click();expect(host.apply).toHaveBeenCalledWith('panSize','wide','keyboard-pan-size');ui.open();$('panChoiceSelect').value='standard';$('panChoiceSelect').dispatchEvent(new Event('change',{bubbles:true}));press(' ');press('ArrowRight');press('ArrowDown');press('Enter');expect(state().pan.size).toBe('standard');expect(host.apply).toHaveBeenCalledTimes(2);
  host.has3D=()=>true;ui.set3D();expect($('panChoiceTry').hidden).toBe(false);$('panChoiceTry').click();expect(host.openNative).toHaveBeenCalledOnce();expect(host.apply).toHaveBeenCalledTimes(2);
 });
 it('cancels on a changed selection, incomplete sequence, repeated keys, put back, or Escape',()=>{
  const {ui,host}=mounted();ui.open();press('ArrowUp',true);press('ArrowRight');press('ArrowDown');press('Enter');expect(host.apply).not.toHaveBeenCalled();press('ArrowUp');$('panChoiceSelect').value='standard';$('panChoiceSelect').dispatchEvent(new Event('change',{bubbles:true}));press('ArrowRight');press('ArrowDown');press('Enter');expect(host.apply).not.toHaveBeenCalled();expect($('panChoiceStatus').textContent).toMatch(/already selected/);
  $('panChoiceSelect').value='wide';$('panChoiceSelect').dispatchEvent(new Event('change',{bubbles:true}));keys();$('panChoiceCancel').click();$('panChoicePlace').click();expect(host.apply).not.toHaveBeenCalled();keys();press('Escape');press('Enter');expect(host.apply).not.toHaveBeenCalled();
 });
 it('discards drafts when current state changes, even before a render has occurred',()=>{
  const s=R.start(),{ui,host,setLive}=mounted(s);ui.open();keys();setLive(R.act(s,'wash'));press('Enter');expect(host.apply).not.toHaveBeenCalled();ui.render(R.act(s,'rinse'),false,false);press('Enter');expect(host.apply).not.toHaveBeenCalled();
 });
 it('locks the lesson in history or after ingredients or heat, but leaves comparison readable',()=>{
  const s=R.start(),{ui,host}=mounted(s);ui.open();keys();ui.render(s,true,false);expect($('panChoiceTry').disabled).toBe(true);expect($('panChoiceKeyboard').disabled).toBe(true);expect($('panChoiceControl').getAttribute('aria-disabled')).toBe('true');press('Enter');expect(host.apply).not.toHaveBeenCalled();expect($('panChoiceComparison').children).toHaveLength(2);
  for(const state of [R.act(s,'oil'),R.act(s,'panHeat',1),{...s,pan:{...s.pan,temp:31}},R.startRescue('dry',0)]){ui.render(state,false,false);expect($('panChoiceTry').disabled).toBe(true);expect($('panChoiceSelect').disabled).toBe(true);expect($('panChoiceComparison').children).toHaveLength(2);}ui.render(R.start('tomato',4),false,true);expect($('panChoiceKeyboardPanel').hidden).toBe(true);expect($('panChoiceReceipt').textContent).toMatch(/starting setup.*No pan replacement/);
 });
 it('stops unfinished work on lifecycle interruption and removes every listener on disposal',()=>{
  const {ui,host}=mounted();for(const event of ['blur','resize','pagehide']){ui.open();keys();window.dispatchEvent(new Event(event));press('Enter');expect(host.apply).not.toHaveBeenCalled();}
  ui.open();keys();const hidden=Object.getOwnPropertyDescriptor(document,'hidden');Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));press('Enter');expect(host.apply).not.toHaveBeenCalled();if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;
  const native=$('panChoiceTry'),keyboard=$('panChoiceKeyboard'),control=$('panChoiceControl'),count=host.cancelNative.mock.calls.length;ui.dispose();native.click();keyboard.click();control.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));window.dispatchEvent(new Event('resize'));expect(host.cancelNative).toHaveBeenCalledTimes(count);expect(host.openNative).not.toHaveBeenCalled();expect(host.apply).not.toHaveBeenCalled();expect($('panChoiceLesson')).toBeNull();ui.dispose();
 });
 it('distinguishes native, keyboard, simplified and supplied choices from recorded actions alone',()=>{
  const {ui}=mounted();for(const [interaction,expected] of [['scene-pan-size','completed kitchen carry'],['keyboard-pan-size','completed keyboard practice'],[undefined,'simplified size control']]){const s=R.act(R.start(),'panSize','wide',interaction);ui.render(s,false,false);expect($('panChoiceReceipt').textContent).toContain(expected);ui.render(R.restore({...s,log:[]}),true,false);expect($('panChoiceReceipt').textContent).toContain('No pan replacement');}
  ui.render(R.startRescue('dry',0),false,false);expect($('panChoiceReceipt').textContent).toBe('Cookware supplied with this rescue.');
 });
});
describe('Recognizable cabinet cookware',()=>{
 it('stores each handle at its declared source and restricts picking to the handle ancestry',()=>{
  const {world,canvas,detail}=decorated();for(const choice of P.choices){const group=detail.sources[choice];expect(group.position.toArray()).toEqual([P.sources[choice].x,P.sources[choice].y,P.sources[choice].z]);expect(group.userData.kitchenPanChoice).toBe(choice);const handle=group.getObjectByName(choice+'-pan-handle');expect(handle.position.toArray()).toEqual([0,0,0]);expect(handle.userData.sceneDecoration).toBe(false);expect(group.getObjectByName('empty-pan-interior').userData.sceneDecoration).toBe(true);}expect(canvas.dataset).toMatchObject({panChoicePhase:'idle',panChoiceHeld:'',panChoiceSelected:'standard'});detail.setView('prep');expect(detail.sources.wide.visible).toBe(true);detail.dispose();expect(world.children).toHaveLength(0);
 });
 it('shows only a preview while carried, restores both sources on cancellation, and resets history or a fresh cook',()=>{
  const s=R.start(),before=JSON.stringify(s),{canvas,detail}=decorated(s);detail.preview({trace:P.start(s,'wide',p(P.sources.wide),screen())});expect(detail.sources.wide.visible).toBe(true);expect(detail.sources.wide.getObjectByName('pan-choice-bowl').visible).toBe(false);expect(detail.sources.wide.getObjectByName('pan-hook').visible).toBe(true);expect(detail.sources.wide.getObjectByName('pan-choice-nameplate').visible).toBe(true);expect(detail.sources.standard.visible).toBe(true);expect(canvas.dataset).toMatchObject({panChoiceHeld:'wide',panChoicePhase:'carry'});detail.preview({trace:carried(s)});expect(canvas.dataset.panChoicePhase).toBe('release');detail.reset(s);expect(detail.sources.wide.visible).toBe(true);expect(canvas.dataset).toMatchObject({panChoiceHeld:'',panChoicePhase:'idle'});detail.update(R.act(s,'panSize','wide'));expect(canvas.dataset.panChoiceSelected).toBe('wide');detail.update(R.start('tomato',4));expect(canvas.dataset.panChoiceSelected).toBe('standard');expect(JSON.stringify(s)).toBe(before);
 });
 it('leaves hooks and nameplates on the cupboard and carries each bowl at its working size and destination center',()=>{
  const {world,detail}=decorated();for(const choice of P.choices){const s=choice==='standard'?R.act(R.start(),'panSize','wide'):R.start(),trace=carried(s,choice);detail.update(s);detail.preview({trace});const held=world.getObjectByName('carried-pan-choice'),bowl=held.getObjectByName('pan-choice-bowl'),center=bowl.getWorldPosition(new T.Vector3()),target=R.panPosition(s),radius=choice==='wide'?.72*1.08:.72;expect(held.getObjectByName('pan-hook')).toBeUndefined();expect(held.getObjectByName('pan-choice-nameplate')).toBeUndefined();expect(detail.sources[choice].getObjectByName('pan-hook')).toBeDefined();expect(detail.sources[choice].getObjectByName('pan-choice-nameplate')).toBeDefined();expect(bowl.geometry.parameters.radiusTop*held.scale.x).toBeCloseTo(radius);expect(center.x).toBeCloseTo(target.x);expect(center.z).toBeCloseTo(target.z);expect(center.y).toBeCloseTo(P.height);expect(detail.sources[choice].scale.toArray()).toEqual([1,1,1]);}
 });
});
