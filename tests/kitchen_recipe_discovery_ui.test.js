// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
window.KitchenRecipes=R;
for(const [name,file] of [
 ['KitchenPanChoice','pan_choice'],['KitchenTimerWinding','timer_winding'],['KitchenHandwashing','handwashing'],
 ['KitchenRinsing','rinsing'],['KitchenLid','lid'],['KitchenThermometer','thermometer'],['KitchenOil','oil'],
 ['KitchenSauceCheck','sauce_check'],['KitchenSampling','sampling'],['KitchenTurning','turning'],['KitchenFoodLens','lens'],
 ['KitchenIngredientHandoff','handoff'],['KitchenBurnerDials','burners']
])window[name]=require('../stem_lab/kitchen_studio/recipe_lab_'+file+'.js');
const W=require('../stem_lab/kitchen_studio/recipe_lab_workspace.js'),$=id=>document.getElementById(id);
afterEach(()=>{vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();});
function mount(options={}){
 document.body.innerHTML='<div class="scene-direct-tools"><label>Tool<select id="sceneKitchenTool">'+W.catalog.map(t=>'<option value="'+t[0]+'">'+t[2]+'</option>').join('')+'</select></label><button id="sceneKeyboardTools" type="button">Keyboard controls</button><p id="sceneToolHelp">Gesture help</p><p id="sceneActionStatus" role="status"></p></div><div id="recipeScene"><canvas></canvas></div><div class="camera-row"><div></div></div>';
 let state=options.state||R.start(),tool=options.tool||'move',locked=!!options.locked;
 const host={container:document.querySelector('.scene-direct-tools'),getState:()=>state,tool:()=>tool,locked:()=>locked,cancel:vi.fn(),choose:vi.fn()};
 if(options.finder!==false)host.findStart=vi.fn();
 const tools=W.mountTools(host);
 return {tools,host,state:()=>state,select(id){tool=id;$('sceneKitchenTool').value=id;tools.render(state);},lock(value=true){locked=value;tools.render(state);},update(next){state=next;tools.render(state);}};
}
const ready={name:'Fresh-water jug',instruction:'Hold the jug handle, then carry it to the empty pot.',ready:true,detail:'Carry, tip and release.'};
const blocked={name:'Cutting board',instruction:'Follow the ruler for a straight knife pass.',ready:false,detail:'Wash hands and rinse produce before cutting.'};
describe('Read-only object discovery in the kitchen tray',()=>{
 it('offers one Find start button next to Change tool and connects it to a noninteractive scene cue',()=>{
  mount();const button=$('sceneFindStart'),scene=$('recipeScene');
  expect(document.querySelectorAll('#sceneFindStart')).toHaveLength(1);expect(button.type).toBe('button');expect(button.textContent).toMatch(/find start/i);expect(button.getAttribute('aria-controls')).toBe('sceneStartCue');
  expect(button.parentNode).toBe($('sceneChooseTool').parentNode);expect(button.disabled).toBe(false);expect(scene.contains($('sceneStartCue'))).toBe(true);expect(scene.contains($('sceneStartMarker'))).toBe(true);
  expect($('sceneStartCue').hidden).toBe(true);expect($('sceneStartMarker').hidden).toBe(true);expect($('sceneStartCue').querySelector('button,input,select,a')).toBeNull();expect($('sceneStartCue').getAttribute('aria-hidden')).toBe('true');
 });
 it('keeps older host integrations usable and disables discovery when no finder callback exists',()=>{
  const m=mount({finder:false});expect($('sceneFindStart').disabled).toBe(true);$('sceneFindStart').click();expect(m.host.cancel).not.toHaveBeenCalled();expect(m.host.choose).not.toHaveBeenCalled();
 });
 it('calls the finder once on deliberate activation and preserves the button’s focus and recipe evidence',()=>{
  const m=mount(),before=JSON.stringify(m.state());$('sceneFindStart').focus();$('sceneFindStart').click();expect(m.host.findStart).toHaveBeenCalledOnce();expect(document.activeElement).toBe($('sceneFindStart'));expect(m.host.choose).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);
 });
 it('keeps unavailable tools discoverable so their prerequisite can be explained without choosing another tool',()=>{
  const m=mount({tool:'cut'}),before=JSON.stringify(m.state());expect($('workspaceToolStatus').dataset.ready).toBe('false');expect($('sceneFindStart').disabled).toBe(false);$('sceneFindStart').click();expect(m.host.findStart).toHaveBeenCalledOnce();expect(m.host.choose).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);
 });
 it('disables discovery for camera-only exploration and historical or finished kitchens',()=>{
  const m=mount();m.select('camera');expect($('sceneFindStart').disabled).toBe(true);$('sceneFindStart').click();expect(m.host.findStart).not.toHaveBeenCalled();m.select('move');expect($('sceneFindStart').disabled).toBe(false);m.lock();expect($('sceneFindStart').disabled).toBe(true);$('sceneFindStart').click();expect(m.host.findStart).not.toHaveBeenCalled();
 });
 it('shows the actual object, movement instruction and ready state while retaining all original scene nodes',()=>{
  const m=mount(),scene=$('recipeScene'),canvas=scene.firstElementChild,parent=scene.parentNode,before=JSON.stringify(m.state());m.tools.start(ready);
  expect($('sceneStartCue').hidden).toBe(false);expect($('sceneStartCue').dataset.ready).toBe('true');expect($('sceneStartCue').querySelector('strong').textContent).toBe(ready.name);expect($('sceneStartCue').querySelector('p').textContent).toBe(ready.instruction);expect($('sceneStartCue').textContent).toContain('Ready');
  expect($('sceneGestureAnnouncement').textContent).toContain(ready.name);expect($('sceneGestureAnnouncement').textContent).toContain(ready.instruction);expect(scene.firstElementChild).toBe(canvas);expect(scene.parentNode).toBe(parent);expect(JSON.stringify(m.state())).toBe(before);expect(m.host.choose).not.toHaveBeenCalled();
 });
 it('shows a prerequisite explanation instead of an actionable movement for a blocked tool',()=>{
  const m=mount({tool:'cut'}),before=JSON.stringify(m.state());m.tools.start(blocked);expect($('sceneStartCue').dataset.ready).toBe('false');expect($('sceneStartCue').querySelector('p').textContent).toBe(blocked.detail);expect($('sceneStartCue').textContent).toContain('Before you start');expect($('sceneGestureAnnouncement').textContent).toContain(blocked.detail);expect(JSON.stringify(m.state())).toBe(before);
 });
 it('projects a marker separately from cue text without repeating live announcements on animation frames',()=>{
  const m=mount();m.tools.start(ready);const announcement=$('sceneGestureAnnouncement').textContent,cue=$('sceneStartCue').textContent;
  m.tools.position({x:180,y:120,visible:true});expect($('sceneStartMarker').hidden).toBe(false);expect($('sceneStartMarker').dataset.ready).toBe('true');for(let i=0;i<10;i++)m.tools.position({x:180+i,y:120+i,visible:true});
  expect($('sceneGestureAnnouncement').textContent).toBe(announcement);expect($('sceneStartCue').textContent).toBe(cue);expect(document.querySelectorAll('#sceneGestureAnnouncement[aria-live="polite"]')).toHaveLength(1);m.tools.position({x:200,y:140,visible:false});expect($('sceneStartMarker').hidden).toBe(true);expect($('sceneStartCue').hidden).toBe(false);
 });
 it('clears the cue and projected marker when discovery is cancelled without recording an action',()=>{
  const m=mount(),before=JSON.stringify(m.state());m.tools.start(ready);m.tools.position({x:180,y:120,visible:true});m.tools.start(null);expect($('sceneStartCue').hidden).toBe(true);expect($('sceneStartMarker').hidden).toBe(true);expect(JSON.stringify(m.state())).toBe(before);expect(m.host.choose).not.toHaveBeenCalled();
 });
 it('keeps discovery overlays free from sequential keyboard navigation',()=>{
  const m=mount();m.tools.start(ready);m.tools.position({x:180,y:120,visible:true});for(const id of ['sceneStartCue','sceneStartMarker']){const el=$(id);expect(el.querySelector('button,input,select,a,[tabindex="0"]')).toBeNull();expect(el.tabIndex).toBe(-1);}
 });
});

it('returns from a scrolled expanded tool drawer with the compact guidance visible and no canvas scroll or cooking action',()=>{
 const m=mount(),before=JSON.stringify(m.state()),dialog=document.createElement('dialog');dialog.id='expandedKitchen';dialog.open=true;dialog.scrollTop=213;document.body.append(dialog);const scroll=vi.fn();$('recipeScene').scrollIntoView=scroll;$('sceneReturnToKitchen').click();expect(dialog.scrollTop).toBe(0);expect(document.activeElement).toBe($('sceneChooseTool'));expect(scroll).not.toHaveBeenCalled();expect(m.host.choose).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);
});
