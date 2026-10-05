// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
window.KitchenRecipes=R;
for(const [name,file] of [
 ['KitchenPanChoice','pan_choice'],['KitchenTimerWinding','timer_winding'],['KitchenHandwashing','handwashing'],
 ['KitchenRinsing','rinsing'],['KitchenLid','lid'],['KitchenThermometer','thermometer'],['KitchenOil','oil'],
 ['KitchenSauceCheck','sauce_check'],['KitchenSampling','sampling'],['KitchenTurning','turning'],['KitchenFoodLens','lens'],
 ['KitchenIngredientHandoff','handoff'],['KitchenBurnerDials','burners']
])window[name]=require('../stem_lab/kitchen_studio/recipe_lab_'+file+'.js');
const W=require('../stem_lab/kitchen_studio/recipe_lab_workspace.js'),$=id=>document.getElementById(id);
const dialogMethods=new Map(['showModal','close'].map(name=>[name,Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,name)]));
const scrollDescriptor=Object.getOwnPropertyDescriptor(Element.prototype,'scrollIntoView');
afterEach(()=>{
 vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();document.documentElement.style.overflow='';localStorage.clear();
 for(const [name,descriptor] of dialogMethods){if(descriptor)Object.defineProperty(HTMLDialogElement.prototype,name,descriptor);else delete HTMLDialogElement.prototype[name];}
 if(scrollDescriptor)Object.defineProperty(Element.prototype,'scrollIntoView',scrollDescriptor);else delete Element.prototype.scrollIntoView;
});
function fixture(){
 document.body.innerHTML='<section class="recipe-scene"><div class="scene-heading"><div><h2 id="kitchenTitle">Kitchen</h2></div><button id="textView" type="button">Use text view</button></div><div class="replay-launch"></div><section id="recipeReplayControls" hidden></section><div class="scene-direct-tools"><label>Tool<select id="sceneKitchenTool">'+W.catalog.map(t=>'<option value="'+t[0]+'">'+t[2]+'</option>').join('')+'</select></label><button id="sceneKeyboardTools" type="button">Keyboard tool controls</button><p id="sceneToolHelp">Complete tool help</p><p id="sceneActionStatus" role="status"></p><section id="specialPanel"><label for="specialRange">A precise setting</label><input id="specialRange" type="range"><button id="specialButton" type="button">Apply precise setting</button></section></div><div id="recipeScene"><canvas></canvas></div><div id="recipeFallback" hidden>Text kitchen</div><div class="camera-row"><span id="sceneNotice">Explore</span><div><button type="button" data-view="bench">Whole bench</button><button type="button" data-view="pot">Pot</button><button type="button" data-view="pan">Pan</button><button type="button" data-view="timers">Timers</button></div></div><div class="readouts"><div><strong id="potTemp">22°C</strong></div><div><strong id="panTemp">22°C</strong></div></div><div class="time-controls"><div><strong id="clock">0:00</strong><span id="clockStatus">simulated time · paused</span></div><button id="play" type="button">Run kitchen</button><button id="advance" type="button">Advance 30 seconds</button><label for="timeStep">Time per step<select id="timeStep"><option value="15">15 seconds</option><option value="30" selected>30 seconds</option></select></label><label for="speed">Playback speed<select id="speed"><option value="5">5×</option><option value="15">15×</option></select></label></div><div class="timer-bench-summary"><p id="benchTimerSummary">No reminders</p><button id="openCheckTimers" type="button">Set a timer</button></div><p class="time-note">Both vessels advance together.</p></section>';
}
function mounted(initial=R.start()){
 fixture();let s=initial,tool='move',locked=false,ended=false;const original=Object.fromEntries(['clock','clockStatus','play','advance','timeStep','speed','recipeScene'].map(id=>[id,$(id)]));
 vi.stubGlobal('requestAnimationFrame',callback=>{callback();return 1;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 Object.defineProperty(Element.prototype,'scrollIntoView',{configurable:true,value:vi.fn()});
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.open=true;}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.open=false;this.dispatchEvent(new Event('close'));}});
 const host={container:document.querySelector('.scene-direct-tools'),tool:()=>tool,locked:()=>locked,getState:()=>s,cancel:vi.fn(),choose:vi.fn(id=>{tool=id;$('sceneKitchenTool').value=id;tools.render(s);})};
 const tools=W.mountTools(host);
 const stageHost={cancel:host.cancel,resize:vi.fn(),view:vi.fn(),ended:()=>ended,apply:vi.fn()};
 const stage=W.mountStage(stageHost);stage.render(s,false);host.choose.mockClear();host.cancel.mockClear();stageHost.resize.mockClear();
 function autoTool(id){tool=id;$('sceneKitchenTool').value=id;tools.render(s);}
 return {host,stageHost,tools,stage,original,state:()=>s,tool:()=>tool,autoTool,lock(value=true){locked=value;tools.render(s);},end(value=true){ended=value;stage.render(s,false);},setState(next,historical=false){s=next;tools.render(s);stage.render(s,historical);}};
}
function station(name){document.querySelector('[data-tool-group="'+name+'"]').click();}
function card(name){document.querySelector('[data-kitchen-tool="'+name+'"]').click();}
function expand(){ $('expandKitchen').click();expect($('expandedKitchen').open).toBe(true); }
function toggle(id){$(id).querySelector(':scope > summary').click();}

describe('Focused kitchen tool navigation and continuity',()=>{
 it('places only compact station and selected-tool guidance above the kitchen while the complete tools stay in a closed native drawer',()=>{
  mounted();const stage=$('kitchenStage'),scene=$('recipeScene'),drawer=$('sceneToolDrawer'),tray=$('sceneToolTray');
  expect(tray.querySelectorAll('[data-tool-group]')).toHaveLength(5);expect(tray.contains($('workspaceToolName'))).toBe(true);
  expect(tray.contains($('workspaceToolStatus'))).toBe(true);expect(tray.contains($('workspaceToolInstruction'))).toBe(true);
  expect(drawer.tagName).toBe('DETAILS');expect(drawer.open).toBe(false);expect(drawer.querySelectorAll('[data-kitchen-tool]')).toHaveLength(W.catalog.length);
  expect(drawer.contains($('sceneKitchenTool'))).toBe(true);expect(drawer.contains($('sceneKeyboardTools'))).toBe(true);expect(drawer.contains($('specialRange'))).toBe(true);expect(drawer.contains($('sceneGestureGuide'))).toBe(true);
  expect(Array.from(stage.children).indexOf(tray)).toBeLessThan(Array.from(stage.children).indexOf(scene));expect(Array.from(stage.children).indexOf(drawer)).toBeGreaterThan(Array.from(stage.children).indexOf(scene));
 });
 it('restores the most recent explicit tool independently for each station',()=>{
  const m=mounted(),before=JSON.stringify(m.state());station('prep');card('mince');station('pot');card('lid');station('pan');card('inspect');station('prep');
  expect(m.host.choose).toHaveBeenLastCalledWith('mince');expect(m.tool()).toBe('mince');station('pot');expect(m.host.choose).toHaveBeenLastCalledWith('lid');station('pan');expect(m.host.choose).toHaveBeenLastCalledWith('inspect');expect(JSON.stringify(m.state())).toBe(before);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('remembers automatic object pickup without calling choose, resizing, opening drawers or moving the canvas',()=>{
  const m=mounted(),scene=$('recipeScene'),canvas=scene.firstElementChild,parent=scene.parentNode,before=JSON.stringify(m.state());
  m.autoTool('timer');expect(m.host.choose).not.toHaveBeenCalled();expect(m.stageHost.resize).not.toHaveBeenCalled();expect($('sceneToolDrawer').open).toBe(false);expect(scene.parentNode).toBe(parent);expect(scene.firstElementChild).toBe(canvas);expect(document.querySelector('[data-tool-group="general"]').getAttribute('aria-pressed')).toBe('true');
  station('prep');card('cut');station('general');expect(m.host.choose).toHaveBeenLastCalledWith('timer');expect(JSON.stringify(m.state())).toBe(before);
 });
 it('remembers a native selector change delivered through the same tool render path',()=>{
  const m=mounted();m.autoTool('mince');station('pot');m.autoTool('sample');station('prep');expect(m.tool()).toBe('mince');station('pot');expect(m.tool()).toBe('sample');
 });
 it('keeps exactly one selected station and card after repeated renders and preserves the cook and action log',()=>{
  const s=R.act(R.act(R.start(),'wash'),'rinse'),m=mounted(s),before=JSON.stringify(s);m.autoTool('cut');for(let n=0;n<5;n++)m.tools.render(s);
  expect(document.querySelectorAll('[data-tool-group][aria-pressed="true"]')).toHaveLength(1);expect(document.querySelectorAll('[data-kitchen-tool][aria-pressed="true"]')).toHaveLength(1);expect($('workspaceToolName').textContent).toBe('Cut produce');expect($('workspaceToolStatus').dataset.ready).toBe('true');expect(JSON.stringify(s)).toBe(before);expect(m.host.choose).not.toHaveBeenCalled();expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('shows each tool’s actual prerequisites on cards without disabling tools that remain available for exploration',()=>{
  const m=mounted();station('prep');const cut=document.querySelector('[data-kitchen-tool="cut"]');expect(cut.dataset.ready).toBe('false');expect(cut.querySelector('.kitchen-tool-readiness').textContent).toMatch(/before|wash|start/i);expect(cut.disabled).toBe(false);m.setState(R.act(R.act(m.state(),'wash'),'rinse'));expect(cut.dataset.ready).toBe('true');expect(cut.querySelector('.kitchen-tool-readiness').textContent).toMatch(/ready/i);
 });
 it('locks both compact station selection and all tools during historical viewing without issuing a tool callback',()=>{
  const m=mounted(),before=JSON.stringify(m.state());m.lock();for(const el of document.querySelectorAll('[data-tool-group],[data-kitchen-tool]'))expect(el.disabled).toBe(true);station('pot');card('weigh');expect(m.host.choose).not.toHaveBeenCalled();expect($('workspaceToolStatus').textContent).toBe('View only');expect(JSON.stringify(m.state())).toBe(before);
 });
 it('preserves target and gesture guidance after cards move into the drawer',()=>{
  const m=mounted();m.tools.hover({name:'Pasta packet',detail:'Lift the packet',ready:true});expect($('sceneTargetHint').hidden).toBe(false);expect($('sceneTargetHint').textContent).toContain('Pasta packet');
  m.tools.gesture({title:'Wind a reminder',phase:'wind',tool:'timer-wind',instruction:'Wind clockwise',detail:'Preview until release',invalid:false,over:false,progress:.5,progressLabel:'Winding'});expect($('sceneGestureCoach').hidden).toBe(false);expect($('sceneTargetHint').hidden).toBe(true);expect($('gestureInstruction').textContent).toBe('Wind clockwise');expect($('gestureProgress').value).toBe(50);expect($('sceneGestureAnnouncement').textContent).toContain('Wind clockwise');
 });
 it('opens Change tool on the selected card then returns focus to the compact tray after a deliberate choice',()=>{
  const m=mounted(),before=JSON.stringify(m.state());m.autoTool('cut');$('sceneChooseTool').click();expect($('sceneToolDrawer').open).toBe(true);expect(document.activeElement).toBe(document.querySelector('[data-kitchen-tool="cut"]'));card('mince');expect($('sceneToolDrawer').open).toBe(false);expect(document.activeElement).toBe($('sceneChooseTool'));expect(m.tool()).toBe('mince');expect(JSON.stringify(m.state())).toBe(before);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
});

describe('Scene-first stage, disclosures and keyboard routes',()=>{
 it('moves the original clock controls intact above the canvas and keeps settings in one native disclosure',()=>{
  const {original}=mounted(),ids=['clock','clockStatus','play','advance','timeStep','speed'];for(const id of ids){expect(document.querySelectorAll('#'+id)).toHaveLength(1);expect($('sceneWorkspaceClock').contains($(id))).toBe(true);expect($(id)).toBe(original[id]);}expect($('sceneClockSettings').tagName).toBe('DETAILS');expect($('sceneClockSettings').contains($('timeStep'))).toBe(true);expect($('sceneClockSettings').contains($('speed'))).toBe(true);expect($('sceneClockSettings').open).toBe(false);
  expect(Array.from($('kitchenStage').children).indexOf($('sceneWorkspaceClock'))).toBeLessThan(Array.from($('kitchenStage').children).indexOf($('recipeScene')));
 });
 it('cancels a held gesture before opening or closing an auxiliary drawer and restores focus to its summary on close',()=>{
  const m=mounted(),drawer=$('sceneToolDrawer');toggle('sceneToolDrawer');expect(drawer.open).toBe(true);expect(m.host.cancel).toHaveBeenCalled();expect(m.host.cancel.mock.invocationCallOrder[0]).toBeLessThan(m.stageHost.resize.mock.invocationCallOrder[0]);const count=m.host.cancel.mock.calls.length;$('specialButton').focus();toggle('sceneToolDrawer');expect(drawer.open).toBe(false);expect(m.host.cancel.mock.calls.length).toBeGreaterThan(count);expect(document.activeElement).toBe(drawer.querySelector(':scope > summary'));expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('reveals all managed ancestor disclosures before programmatic focus, including the detailed gesture guide',()=>{
  const m=mounted();expect($('sceneToolDrawer').open).toBe(false);expect($('sceneGestureGuide').open).toBe(false);m.stage.revealControls($('sceneToolHelp'));expect($('sceneToolDrawer').open).toBe(true);expect($('sceneGestureGuide').open).toBe(true);expect(m.host.cancel).toHaveBeenCalled();m.stage.revealControls($('timeStep'));expect($('sceneClockSettings').open).toBe(true);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('keeps camera controls available through More views and leaves the original view callback intact',()=>{
  const m=mounted(),more=$('sceneMoreViews');expect(more.tagName).toBe('DETAILS');expect(more.open).toBe(false);expect(more.querySelector('[data-view="pot"]')).not.toBeNull();expect(document.querySelector('.camera-row>div').contains($('sceneGuideToggle'))).toBe(true);expect(document.querySelector('.camera-row>div > [data-view="bench"]')).not.toBeNull();toggle('sceneMoreViews');const top=more.querySelector('[data-view="top"]');top.focus();top.click();expect(m.stageHost.view).toHaveBeenCalledWith('top');toggle('sceneMoreViews');expect(more.open).toBe(false);expect(document.activeElement).toBe(more.querySelector(':scope > summary'));expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('returns from complete controls to the visible kitchen without choosing a tool or applying an action',()=>{
  const m=mounted(),before=JSON.stringify(m.state());toggle('sceneToolDrawer');$('sceneReturnToKitchen').click();expect($('sceneToolDrawer').open).toBe(false);expect(document.activeElement).toBe($('sceneChooseTool'));expect(m.host.choose).not.toHaveBeenCalled();expect(m.stageHost.apply).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);
 });
 it('cancels a held gesture before the original clock button and select handlers run',()=>{
  const m=mounted(),calls=[];$('play').addEventListener('click',()=>calls.push({control:'play',cancelCount:m.host.cancel.mock.calls.length}));$('timeStep').addEventListener('change',()=>calls.push({control:'step',cancelCount:m.host.cancel.mock.calls.length}));$('play').click();$('timeStep').value='15';$('timeStep').dispatchEvent(new Event('change',{bubbles:true}));expect(calls).toHaveLength(2);expect(calls[0].cancelCount).toBeGreaterThan(0);expect(calls[1].cancelCount).toBeGreaterThan(calls[0].cancelCount);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('expands the same canvas and clock nodes, then explicit exit returns them and focus to the original page',()=>{
  const m=mounted(),scene=$('recipeScene'),canvas=scene.firstElementChild,clock=$('play'),before=JSON.stringify(m.state());expand();expect($('expandedKitchen').contains(scene)).toBe(true);expect(scene.firstElementChild).toBe(canvas);expect($('play')).toBe(clock);expect(document.documentElement.style.overflow).toBe('hidden');$('expandKitchen').click();expect($('expandedKitchen').open).toBe(false);expect(document.querySelector('.recipe-scene').contains(scene)).toBe(true);expect(document.activeElement).toBe($('expandKitchen'));expect(document.documentElement.style.overflow).toBe('');expect(JSON.stringify(m.state())).toBe(before);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('handles Escape through the modal cancel event and restores prior overflow and focus without applying an action',()=>{
  const m=mounted();document.documentElement.style.overflow='clip';expand();const event=new Event('cancel',{cancelable:true});$('expandedKitchen').dispatchEvent(event);expect(event.defaultPrevented).toBe(true);expect($('expandedKitchen').open).toBe(false);expect(document.documentElement.style.overflow).toBe('clip');expect(document.activeElement).toBe($('expandKitchen'));expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('exits before opening the existing keyboard tool route without stealing focus back from that route',()=>{
  const m=mounted();m.stage.revealControls($('sceneKeyboardTools'));expand();const route=document.createElement('button');route.id='keyboardTask';document.body.append(route);$('sceneKeyboardTools').addEventListener('click',()=>route.focus());$('sceneKeyboardTools').click();expect($('expandedKitchen').open).toBe(false);expect(document.activeElement).toBe(route);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('keeps text and graphics fallback controls available and closes expansion without applying any recipe action',()=>{
  const m=mounted(),before=JSON.stringify(m.state());expand();m.stage.set3D(false);expect($('expandedKitchen').open).toBe(false);expect($('expandKitchen').hidden).toBe(true);expect($('play').closest('[hidden]')).toBeNull();expect($('advance').closest('[hidden]')).toBeNull();expect($('sceneToolTray').hidden).toBe(true);expect($('sceneToolDrawer').hidden).toBe(true);expect(document.documentElement.style.overflow).toBe('');expect(JSON.stringify(m.state())).toBe(before);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('shows the recorded scene time instead of presenting the current clock as the historical moment, then restores live controls',()=>{
  const m=mounted(),historical={...m.state(),time:75},before=JSON.stringify(m.state());m.stage.render(historical,true);expect($('sceneRecordedClock').hidden).toBe(false);expect($('sceneRecordedClock').textContent).toMatch(/1:15|75/);expect($('sceneWorkspaceClock').dataset.mode).toBe('recorded');expect($('scenepotHeat').disabled).toBe(true);m.stage.render(m.state(),false);expect($('sceneRecordedClock').hidden).toBe(true);expect($('sceneWorkspaceClock').dataset.mode).toBe('live');expect(JSON.stringify(m.state())).toBe(before);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('only applies deliberate burner edits and never synthesizes cooking actions from disclosure, station or expansion navigation',()=>{
  const m=mounted(),before=JSON.stringify(m.state());station('pot');toggle('sceneToolDrawer');toggle('sceneToolDrawer');toggle('sceneMoreViews');toggle('sceneMoreViews');expand();m.stage.exit();expect(m.stageHost.apply).not.toHaveBeenCalled();const heat=$('scenepotHeat');heat.value='2';heat.dispatchEvent(new Event('change'));expect(m.stageHost.apply).toHaveBeenCalledOnce();expect(m.stageHost.apply).toHaveBeenCalledWith('potHeat',2);expect(JSON.stringify(m.state())).toBe(before);
 });
 it('restores burner readouts from view state and disables them for replay, ended cooks and partial serving',()=>{
  const m=mounted();m.stage.render({...m.state(),pot:{...m.state().pot,heat:2},pan:{...m.state().pan,heat:1}},false);expect($('scenepotHeat').value).toBe('2');expect($('scenepanHeat').value).toBe('1');m.stage.render(m.state(),true);expect($('scenepotHeat').disabled).toBe(true);expect($('scenepanHeat').disabled).toBe(true);m.end();expect($('scenepotHeat').disabled).toBe(true);m.end(false);let dish=R.start();for(const [a,v] of cook().steps){if(a==='plate')break;dish=R.act(dish,a,v);}const partial=R.act(dish,'servePortion',0);expect(R.serving(partial).started).toBe(true);m.stage.render(partial,false);expect($('scenepotHeat').disabled).toBe(true);expect($('scenepanHeat').disabled).toBe(true);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
});

describe('Visible focus after leaving the graphical kitchen',()=>{
 it('keeps focus on the visible text-view button when an explicit switch closes expansion',()=>{
  const m=mounted(),before=JSON.stringify(m.state());expand();
  $('textView').addEventListener('click',()=>{m.stage.set3D(false);$('recipeScene').hidden=true;$('recipeFallback').hidden=false;document.querySelector('.camera-row>div').hidden=true;});
  $('textView').focus();$('textView').click();
  expect($('expandedKitchen').open).toBe(false);expect($('expandKitchen').hidden).toBe(true);expect(document.activeElement).toBe($('textView'));
  expect(JSON.stringify(m.state())).toBe(before);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('recovers focus from the hidden expanded invoker or camera controls into the visible graphics-fallback notice',()=>{
  const m=mounted(),before=JSON.stringify(m.state());expand();expect(document.activeElement).toBe($('expandKitchen'));
  $('sceneNotice').textContent='3D interrupted. All cooking controls remain available in text view.';
  m.stage.set3D(false);$('recipeScene').hidden=true;$('recipeFallback').hidden=false;document.querySelector('.camera-row>div').hidden=true;
  expect($('expandedKitchen').open).toBe(false);expect(document.activeElement).toBe($('sceneNotice'));expect($('sceneNotice').tabIndex).toBe(-1);
  m.stage.set3D(true);$('recipeScene').hidden=false;document.querySelector('.camera-row>div').hidden=false;
  document.querySelector('[data-view="bench"]').focus();m.stage.set3D(false);document.querySelector('.camera-row>div').hidden=true;
  expect(document.activeElement).toBe($('sceneNotice'));expect(JSON.stringify(m.state())).toBe(before);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
 it('does not steal focus from an external text control when graphics become unavailable',()=>{
  const m=mounted(),field=document.createElement('input');field.setAttribute('aria-label','Recipe reflection');document.body.append(field);field.focus();
  m.stage.set3D(false);$('recipeScene').hidden=true;$('recipeFallback').hidden=false;document.querySelector('.camera-row>div').hidden=true;
  expect(document.activeElement).toBe(field);expect(m.stageHost.apply).not.toHaveBeenCalled();
 });
});
