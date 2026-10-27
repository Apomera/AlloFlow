// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),runtime=process.env.KITCHEN_INTERRUPT_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_scene.js'));
const load=name=>require(path.join(runtime,'recipe_lab_'+name+'.js'));
const R=load('engine'),H=load('hands'),W=load('weighing'),F=load('folding'),J=load('jug'),Feedback=load('motion_feedback'),Guide=load('gesture_guide'),Review=load('movement_review'),THREE=require('../vendor/three-r128/three.min.js');
const $=id=>document.getElementById(id);
let ui,queue,now,nextFrame;
beforeEach(()=>{
 queue=new Map();now=100;nextFrame=0;
 vi.stubGlobal('requestAnimationFrame',callback=>{queue.set(++nextFrame,callback);return nextFrame;});
 vi.stubGlobal('cancelAnimationFrame',id=>queue.delete(id));
 Object.defineProperty(document,'hidden',{configurable:true,value:false});
 const panel=()=>({render:vi.fn(),dispose:vi.fn()});
 window.KitchenRecipes=R;window.KitchenHands=H;window.KitchenWeighing=W;window.KitchenGestureGuide=Guide;window.KitchenMotionFeedback=Feedback;
 // The real scene controller, recognizers, recipe engine and review run without a renderer.
 // Unrelated tool panels and hit routing are isolated from this lifecycle contract.
 for(const name of ['KitchenTimerWinding','KitchenPanChoice','KitchenPanCarry','KitchenPotDrain','KitchenHandwashing','KitchenLid','KitchenRinsing','KitchenThermometer','KitchenFreshWater','KitchenDryPasta','KitchenIngredientHandoff','KitchenCuttingBench'])window[name]={pickup:()=>null,mountPanel:panel};
 for(const name of ['KitchenSauceCheck','KitchenPlating','KitchenLadleCarry','KitchenTomatoPress','KitchenToolRack'])window[name]={mountPanel:panel};
 window.KitchenObjectTools={resolve:()=>null,mountPanel:panel};
 window.KitchenPanFolding={...F,mountPanel:panel};window.KitchenJugPour={...J,mountPanel:panel};
 window.KitchenSampling={reading:()=>null};window.KitchenTurning={reading:()=>null};
 window.KitchenOil={info:()=>({amount:0,goal:20,detail:'Measure oil.'}),transfer:()=>null};
 new Function('window',readFileSync(path.join(runtime,'recipe_lab_scene.js'),'utf8'))(window);
});
afterEach(()=>{if(ui)ui.dispose();ui=null;vi.restoreAllMocks();vi.unstubAllGlobals();delete document.hidden;document.body.replaceChildren();});
function pointer(target,type,values={}){
 const event=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,buttons:type==='pointerup'?0:1,clientX:100,clientY:100,...values});
 Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'mouse'},isPrimary:{value:true}});target.dispatchEvent(event);return event;
}
function advance(ms=100){now+=ms;const callbacks=Array.from(queue.values());queue.clear();callbacks.forEach(callback=>callback(now));}
function setHidden(value,notify=true){Object.defineProperty(document,'hidden',{configurable:true,value});if(notify)document.dispatchEvent(new Event('visibilitychange'));}
function interrupt(type){if(type==='hidden')setHidden(true);else window.dispatchEvent(new Event(type));}
function mounted(){
 document.body.innerHTML='<div id="recipeScene"><canvas></canvas></div><div class="kitchen-action-feedback"></div><div id="reviewActions"><button id="sceneChooseTool">Change tool</button></div><button id="outside">Another activity</button>';
 let state=R.startRescue('dry',0,'practice'),amount=160,hit=null,at={x:0,z:0},shelf,review;
 const canvas=document.querySelector('canvas'),captures=new Set(),world=new THREE.Group(),jug=new THREE.Group(),pan=new THREE.Group(),packet=new THREE.Group();
 jug.userData.kitchenItem='jug';pan.userData.kitchenPan=true;packet.userData.kitchenItem='pasta';world.add(jug,pan,packet);
 canvas.getBoundingClientRect=()=>({left:0,top:0,width:420,height:420});canvas.getClientRects=()=>[canvas.getBoundingClientRect()];
 canvas.setPointerCapture=id=>captures.add(id);canvas.hasPointerCapture=id=>captures.has(id);
 canvas.releasePointerCapture=id=>{captures.delete(id);pointer(canvas,'lostpointercapture');};
 class Raycaster{
  constructor(){this.ray={intersectPlane:(plane,target)=>target.set(at.x,-plane.constant,at.z)};}
  setFromCamera(){}
  intersectObjects(){return hit?[{object:hit}]:[];}
 }
 const host={THREE:{...THREE,Raycaster},canvas,world,camera:new THREE.PerspectiveCamera(),orbit:{enabled:true},sources:{jug:[jug]},getState:()=>state,locked:()=>false,panPosition:()=>R.panPosition(state),servingPositions:()=>[],getCheckTimers:()=>({pot:null,pan:null}),scaleInfo:()=>({amount,recorded:state.prep.pasta,locked:false}),oilInfo:()=>({amount:0})};
 for(const name of ['clearPreview','highlightTarget','draw','selectRack','sauceActive','foldActive','crushActive','weighActive','frameTool','frameWeigh','pause','rackWorking','previewObjects','previewFold','previewJug','previewWeigh','hideFoodLens'])host[name]=vi.fn();
 host.apply=vi.fn((action,value,method)=>{state=R.act(state,action,value,method);ui.update(state);});
 host.changeScale=vi.fn(value=>{amount=value;ui.refreshScale();});
 window.KitchenWorkspace={mountTools:()=>{
  review=Review.mount({container:document.querySelector('.kitchen-action-feedback'),reviewContainer:$('reviewActions')});
  shelf={render:vi.fn(),clearHover:vi.fn(),dismissHover:()=>false,clearReceipt:vi.fn(),guidesEnabled:()=>true,
   gesture:vi.fn(info=>{if(info)review.clear();}),invalidateReceipt:vi.fn(()=>review.clear()),
   receipt:vi.fn(info=>{review.record(info,{time:state.time});return true;}),dispose:()=>review.dispose()};return shelf;
 }};
 ui=window.KitchenSceneTools.mount3D(host);ui.update(state);
 function choose(tool){$('sceneKitchenTool').value=tool;$('sceneKitchenTool').dispatchEvent(new Event('change',{bubbles:true}));}
 function stir(){choose('stir');hit=pan;const center=R.panPosition(state);at={x:center.x+.5,z:center.z};pointer(canvas,'pointerdown');}
 function pour(){choose('pour');hit=jug;at={x:-1.2,z:1.06};pointer(canvas,'pointerdown');at=R.panPosition(state);pointer(canvas,'pointermove');pointer(canvas,'pointermove',{clientY:180});advance();advance();advance();}
 function weigh(){choose('weigh');hit=packet;at=W.scene.packet;pointer(canvas,'pointerdown');at=W.scene.tray;pointer(canvas,'pointermove');pointer(canvas,'pointermove',{clientY:180});advance();advance();advance();}
 return {host,canvas,shelf,review,stir,pour,weigh,state:()=>state,amount:()=>amount,captures,choose,details:()=>document.querySelector('[data-movement-review="result"]')};
}
describe('Interrupted 3D movements preserve evidence and publish an accurate result',()=>{
 it.each(['blur','hidden','resize'])('reports an unfinished movement stopped by %s without committing it',type=>{
  const m=mounted();m.stir();const before=JSON.stringify(m.state());expect(m.captures.size).toBe(1);expect(m.host.orbit.enabled).toBe(false);
  interrupt(type);expect(m.shelf.receipt).toHaveBeenCalledTimes(1);const result=m.shelf.receipt.mock.calls[0][0];
  expect(result).toMatchObject({outcome:'stopped',instruction:'No mix recorded.'});expect(result.detail).toMatch(/window|page/i);
  expect(m.details().hidden).toBe(false);expect(m.details().textContent).toContain('No mix recorded.');expect($('sceneActionStatus').textContent).toBe('');
  expect(m.host.orbit.enabled).toBe(true);expect(m.captures.size).toBe(0);expect(m.host.apply).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);
  pointer(m.canvas,'pointerup');advance();expect(m.shelf.receipt).toHaveBeenCalledTimes(1);expect(m.host.apply).not.toHaveBeenCalled();
 });
 it.each(['blur','hidden','resize'])('reports exact partial water kept after %s and does not apply another dose',type=>{
  const m=mounted(),reserve=m.state().pot.reserve;m.pour();const added=reserve-m.state().pot.reserve;
  expect(added).toBeGreaterThan(0);expect(m.host.apply).toHaveBeenCalled();expect($('sceneActionStatus').textContent).toContain('Lift back to level');
  const before=JSON.stringify(m.state()),calls=m.host.apply.mock.calls.length,stale=Array.from(queue.values())[0];interrupt(type);
  expect(m.shelf.receipt).toHaveBeenCalledTimes(1);expect(m.shelf.receipt.mock.calls[0][0]).toMatchObject({outcome:'kept',instruction:added+' mL already added to the sauce remains.'});
  expect(m.details().textContent).toContain(added+' mL already added');expect($('sceneActionStatus').textContent).toBe('');expect(queue.size).toBe(0);
  stale(now+1000);pointer(m.canvas,'pointerup');advance();expect(m.host.apply).toHaveBeenCalledTimes(calls);expect(JSON.stringify(m.state())).toBe(before);
 });
 it('retains practice weight without recording a recipe portion on interruption',()=>{
  const m=mounted(),before=JSON.stringify(m.state());m.weigh();const added=m.amount()-160;expect(added).toBeGreaterThan(0);
  interrupt('blur');expect(m.shelf.receipt.mock.calls[0][0]).toMatchObject({outcome:'kept',instruction:added+' g already added remains on the tray.'});
  expect(m.host.apply).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);expect(queue.size).toBe(0);
 });
 it('reports hidden-page cancellation even when the pending frame sees hidden before visibilitychange',()=>{
  const m=mounted();m.pour();const before=JSON.stringify(m.state()),calls=m.host.apply.mock.calls.length;setHidden(true,false);advance();
  expect(m.shelf.receipt).toHaveBeenCalledTimes(1);expect(m.shelf.receipt.mock.calls[0][0].outcome).toBe('kept');
  document.dispatchEvent(new Event('visibilitychange'));expect(m.shelf.receipt).toHaveBeenCalledTimes(1);expect(m.details().hidden).toBe(false);
  expect(m.host.apply).toHaveBeenCalledTimes(calls);expect(JSON.stringify(m.state())).toBe(before);expect(queue.size).toBe(0);
 });
 it('retains one review result through blur, hidden, resize and lost-capture cascades',()=>{
  const m=mounted();m.pour();interrupt('blur');const contents=m.details().textContent,before=JSON.stringify(m.state());
  interrupt('hidden');interrupt('resize');pointer(m.canvas,'lostpointercapture');setHidden(false);window.dispatchEvent(new Event('focus'));
  expect(m.shelf.receipt).toHaveBeenCalledTimes(1);expect(m.details().textContent).toBe(contents);expect(m.details().hidden).toBe(false);expect(JSON.stringify(m.state())).toBe(before);
 });
 it('leaves an existing completed review and outside focus intact during idle cleanup',()=>{
  const m=mounted(),result={tool:'stir',title:'Stir and fold',label:'Action recorded',outcome:'completed',instruction:'One mix recorded.',detail:'Check the coating.'};
  m.shelf.receipt(result);const contents=m.details().textContent;$('outside').focus();interrupt('resize');interrupt('blur');interrupt('hidden');
  expect(m.shelf.receipt).toHaveBeenCalledTimes(1);expect(m.details().textContent).toBe(contents);expect(m.details().hidden).toBe(false);expect(document.activeElement).toBe($('outside'));expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('ignores in-page focus changes and even bubbling element blur during a movement',()=>{
  const m=mounted();m.stir();$('outside').focus();m.canvas.tabIndex=-1;m.canvas.focus();$('outside').dispatchEvent(new FocusEvent('blur',{bubbles:true}));
  expect(m.shelf.receipt).not.toHaveBeenCalled();expect(m.captures.size).toBe(1);expect(m.host.orbit.enabled).toBe(false);
  interrupt('blur');expect(m.shelf.receipt).toHaveBeenCalledTimes(1);expect(m.captures.size).toBe(0);
 });
 it('does not stop a movement when visibilitychange says the page is still visible',()=>{
  const m=mounted();m.stir();setHidden(false);expect(m.shelf.receipt).not.toHaveBeenCalled();expect(m.captures.size).toBe(1);expect(m.host.orbit.enabled).toBe(false);
 });
 it('keeps programmatic cancellation quiet and removes lifecycle listeners on disposal',()=>{
  const m=mounted();m.stir();ui.cancel();expect(m.shelf.receipt).not.toHaveBeenCalled();m.stir();ui.dispose();ui=null;
  interrupt('blur');interrupt('hidden');interrupt('resize');advance();expect(m.shelf.receipt).not.toHaveBeenCalled();expect(m.host.apply).not.toHaveBeenCalled();
 });
});
