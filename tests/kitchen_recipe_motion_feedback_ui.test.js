// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
// Resolve CommonJS files through require; jsdom may expose an http module URL.
import path from 'node:path';
const require=createRequire(import.meta.url);
const runtime=process.env.KITCHEN_MOTION_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_workspace.js'));
const load=file=>require(path.join(runtime,'recipe_lab_'+file+'.js'));
const R=load('engine');window.KitchenRecipes=R;
for(const [name,file] of [
 ['KitchenPanChoice','pan_choice'],['KitchenTimerWinding','timer_winding'],['KitchenHandwashing','handwashing'],
 ['KitchenRinsing','rinsing'],['KitchenLid','lid'],['KitchenThermometer','thermometer'],['KitchenOil','oil'],
 ['KitchenSauceCheck','sauce_check'],['KitchenSampling','sampling'],['KitchenTurning','turning'],['KitchenFoodLens','lens'],
 ['KitchenIngredientHandoff','handoff'],['KitchenBurnerDials','burners']
])window[name]=load(file);
const W=load('workspace'),$=id=>document.getElementById(id);
afterEach(()=>{vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();});
function mounted(options={}){
 if(options.hints===false)localStorage.setItem('alloflow-kitchen-movement-hints','off');
 document.body.innerHTML='<div class="scene-direct-tools"><label>Tool<select id="sceneKitchenTool">'+W.catalog.map(t=>'<option value="'+t[0]+'">'+t[2]+'</option>').join('')+'</select></label><button id="sceneKeyboardTools" type="button">Keyboard controls</button><p id="sceneToolHelp">Gesture help</p><p id="sceneActionStatus" role="status">Existing action feedback</p></div><div id="recipeScene"><canvas></canvas></div><div class="camera-row"><div></div></div>';
 let state=options.state||R.start(),locked=!!options.locked;
 const host={container:document.querySelector('.scene-direct-tools'),getState:()=>state,tool:()=>options.tool||'stir',locked:()=>locked,cancel:vi.fn(),choose:vi.fn(),apply:vi.fn(),pause:vi.fn(),findStart:vi.fn()};
 const tools=W.mountTools(host);
 return {tools,host,state:()=>state,update(next){state=next;tools.render(state);},setState(next){state=next;},lock(value=true){locked=value;tools.render(state);}};
}
function result(outcome='completed',extra={}){
 const labels={completed:'Movement completed',unfinished:'Practice unfinished',stopped:'Practice stopped',kept:'Completed work kept'};
 return {tool:'stir',title:'Stir and fold',label:labels[outcome],outcome,instruction:outcome==='completed'?'One completed fold recorded.':outcome==='kept'?'30 mL stays in the pan.':outcome==='stopped'?'The spoon is put down.':'The sauce is unchanged.',detail:outcome==='unfinished'?'Draw inward after gathering before releasing.':'Compare the sauce coating before adding more water.',phase:'fold',...extra};
}
const active={tool:'stir',title:'Stir and fold',phase:'fold',instruction:'Draw inward to the center.',detail:'Keep holding before release.',invalid:false,over:true,progress:.65,progressLabel:'Gather and fold'};
const finder={name:'Sauce pan ring',instruction:'Hold the spoon on the dotted ring.',ready:true,detail:'Complete a circle, then fold.'};

describe('A movement receipt shares the existing coach',()=>{
 it.each(['completed','unfinished','stopped','kept'])('renders a %s result without adding controls, moving focus or changing recipe evidence',outcome=>{
  const m=mounted(),before=JSON.stringify(m.state()),scene=$('recipeScene'),canvas=scene.firstElementChild,parent=scene.parentNode,info=Object.freeze(result(outcome));
  $('sceneChooseTool').focus();const focus=document.activeElement;m.tools.receipt(info);
  const coach=$('sceneGestureCoach');expect(document.querySelectorAll('#sceneGestureCoach')).toHaveLength(1);expect(coach.hidden).toBe(false);expect(coach.dataset.mode).toBe('receipt');expect(coach.dataset.outcome).toBe(outcome);expect(coach.dataset.tool).toBe('stir');expect(coach.dataset.phase).toBe('fold');
  expect($('gestureTitle').textContent).toBe(info.title);expect(coach.querySelector('.gesture-clock').textContent).toBe(info.label);expect($('gestureInstruction').textContent).toBe(info.instruction);expect($('gestureDetail').textContent).toBe(info.detail);expect($('gestureProgress').hidden).toBe(true);expect(coach.querySelector('.gesture-exit').hidden).toBe(true);
  expect(coach.querySelector('button,input,select,a,[tabindex]')).toBeNull();expect(coach.querySelector('[aria-live],[role="status"]')).toBeNull();expect(coach.tabIndex).toBe(-1);expect(document.querySelectorAll('#sceneGestureAnnouncement[aria-live="polite"]')).toHaveLength(1);
  expect(document.activeElement).toBe(focus);expect(scene.firstElementChild).toBe(canvas);expect(scene.parentNode).toBe(parent);expect(JSON.stringify(m.state())).toBe(before);expect(m.host.apply).not.toHaveBeenCalled();expect(m.host.pause).not.toHaveBeenCalled();expect(m.host.choose).not.toHaveBeenCalled();
 });
 it('announces an identical receipt only once and retains it through repeated same-state renders',()=>{
  const m=mounted(),info=result();m.tools.receipt(info);const announce=$('sceneGestureAnnouncement'),text=announce.textContent,observer=new MutationObserver(()=>{});observer.observe(announce,{childList:true,subtree:true,characterData:true});
  for(let i=0;i<6;i++){m.tools.receipt({...info});m.tools.render(m.state());}
  expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect(announce.textContent).toBe(text);expect(text).toContain(info.label);expect(text).toContain(info.instruction);expect(text).toContain(info.detail);expect($('sceneGestureCoach').hidden).toBe(false);
 });
 it('announces changed evidence even when the tool and outcome stay the same',()=>{
  const m=mounted();m.tools.receipt(result('kept'));const next=result('kept',{instruction:'40 mL stays in the pan.'});m.tools.receipt(next);expect($('sceneGestureAnnouncement').textContent).toContain('40 mL');expect($('sceneGestureAnnouncement').textContent).not.toContain('30 mL');expect($('gestureInstruction').textContent).toBe(next.instruction);
 });
 it('restores live caption, progress and release instruction on the next real gesture',()=>{
  const m=mounted();m.tools.receipt(result('unfinished'));m.tools.gesture(active);const coach=$('sceneGestureCoach');expect(coach.hidden).toBe(false);expect(coach.dataset.mode).toBe('gesture');expect(coach.dataset.outcome).toBeUndefined();expect(coach.querySelector('.gesture-clock').textContent).toBe('Clock paused');expect(coach.querySelector('.gesture-exit').hidden).toBe(false);expect($('gestureProgress').hidden).toBe(false);expect($('gestureProgress').value).toBe(65);expect($('gestureProgress').getAttribute('aria-label')).toBe(active.progressLabel);expect($('gestureInstruction').textContent).toBe(active.instruction);expect($('sceneGestureAnnouncement').textContent).toBe(active.title+'. '+active.instruction);
 });
 it('clears terminal guidance with gesture(null) without changing focus or the action feedback',()=>{
  const m=mounted();$('sceneChooseTool').focus();m.tools.receipt(result());m.tools.gesture(null);const coach=$('sceneGestureCoach');expect(coach.hidden).toBe(true);expect(coach.dataset.mode).toBe('gesture');expect(coach.dataset.outcome).toBeUndefined();expect(coach.querySelector('.gesture-clock').textContent).toBe('Clock paused');expect(coach.querySelector('.gesture-exit').hidden).toBe(false);expect($('gestureProgress').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expect($('sceneActionStatus').textContent).toBe('Existing action feedback');expect(document.activeElement).toBe($('sceneChooseTool'));
 });
 it('clears a stale receipt before announcing a newly found starting object',()=>{
  const m=mounted();m.tools.receipt(result());m.tools.start(finder);expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneStartCue').hidden).toBe(false);expect($('sceneGestureAnnouncement').textContent).toContain('Start here.');expect($('sceneGestureAnnouncement').textContent).toContain(finder.instruction);expect($('sceneGestureAnnouncement').textContent).not.toContain('One completed fold');m.tools.clearReceipt();expect($('sceneGestureAnnouncement').textContent).toContain(finder.instruction);
 });
 it('removes finder and hover overlays when a result replaces the gesture',()=>{
  const m=mounted();m.tools.start(finder);m.tools.position({x:140,y:160,visible:true});m.tools.hover({name:'Pan',detail:'Carry to the trivet',ready:true});m.tools.receipt(result());expect($('sceneStartCue').hidden).toBe(true);expect($('sceneStartMarker').hidden).toBe(true);expect($('sceneTargetHint').hidden).toBe(true);expect($('sceneGestureCoach').hidden).toBe(false);
 });
 it('provides an idempotent clearReceipt API that leaves unrelated live or finder guidance intact',()=>{
  const m=mounted();m.tools.receipt(result());m.tools.clearReceipt();m.tools.clearReceipt();expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');m.tools.gesture(active);const announcement=$('sceneGestureAnnouncement').textContent;m.tools.clearReceipt();expect($('sceneGestureCoach').hidden).toBe(false);expect($('sceneGestureAnnouncement').textContent).toBe(announcement);
 });
 it('keeps a terminal receipt readable without stacking a second target tooltip on hover',()=>{
  const m=mounted(),target={name:'Sauce pan',detail:'Carry to the trivet.',ready:true};m.tools.receipt(result());m.tools.hover(target);expect($('sceneTargetHint').hidden).toBe(true);expect($('sceneGestureCoach').hidden).toBe(false);m.tools.clearReceipt();m.tools.hover(target);expect($('sceneTargetHint').hidden).toBe(false);expect($('sceneTargetHint').textContent).toContain(target.detail);
 });
});

describe('Receipt lifecycle and learner preferences',()=>{
 it('clears a result when state identity changes, even with identical visible recipe values',()=>{
  const m=mounted();m.tools.receipt(result());const next={...m.state()};m.update(next);expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('keeps a receipt published after a state save when its first render uses that same saved state',()=>{
  const m=mounted(),next=R.act(m.state(),'wash');m.setState(next);m.tools.receipt(result());m.tools.render(next);expect($('sceneGestureCoach').hidden).toBe(false);expect($('sceneGestureAnnouncement').textContent).toContain('Movement completed');
 });
 it('treats the same receipt text in a distinct saved state as a new result, then retains it on that state',()=>{
  const m=mounted(),info=result();m.tools.receipt(info);const next=R.act(m.state(),'wash'),observer=new MutationObserver(()=>{});observer.observe($('sceneGestureAnnouncement'),{childList:true,subtree:true,characterData:true});m.setState(next);m.tools.receipt({...info});expect(observer.takeRecords()).toHaveLength(1);observer.disconnect();m.tools.render(next);expect($('sceneGestureCoach').hidden).toBe(false);
 });
 it('clears existing receipts on replay lock and rejects new terminal feedback while locked',()=>{
  const m=mounted();m.tools.receipt(result());m.lock();expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');m.tools.receipt(result('kept'));expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('respects a saved Movement hints preference without removing ordinary action feedback',()=>{
  const m=mounted({hints:false});m.tools.receipt(result());expect(m.tools.guidesEnabled()).toBe(false);expect($('sceneGuideToggle').getAttribute('aria-pressed')).toBe('false');expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expect($('sceneActionStatus').textContent).toBe('Existing action feedback');expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('removes a visible receipt when hints are switched off and does not resurrect it on switching back',()=>{
  const m=mounted();m.tools.receipt(result());$('sceneGuideToggle').focus();$('sceneGuideToggle').click();expect(m.host.cancel).toHaveBeenCalledOnce();expect($('sceneGuideToggle').getAttribute('aria-pressed')).toBe('false');expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expect(document.activeElement).toBe($('sceneGuideToggle'));expect(localStorage.getItem('alloflow-kitchen-movement-hints')).toBe('off');m.tools.receipt(result('unfinished'));expect($('sceneGestureCoach').hidden).toBe(true);$('sceneGuideToggle').click();expect($('sceneGestureCoach').hidden).toBe(true);m.tools.receipt(result('unfinished'));expect($('sceneGestureCoach').hidden).toBe(false);expect(localStorage.getItem('alloflow-kitchen-movement-hints')).toBe('on');expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('supports a result without an optional lesson and does not synthesize blank live text',()=>{
  const m=mounted(),info=result('stopped',{detail:''});m.tools.receipt(info);expect($('gestureDetail').textContent).toBe('');expect($('sceneGestureAnnouncement').textContent).toBe(info.label+'. '+info.title+'. '+info.instruction);m.tools.receipt(null);expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');
 });
});

it('clears a previous tool result when an automatic tool render changes the selected tool without replacing recipe state',()=>{const m=mounted(),before=JSON.stringify(m.state());m.tools.receipt(result());m.host.tool=()=> 'wash';m.tools.render(m.state());expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expect(m.host.choose).not.toHaveBeenCalled();expect(m.host.apply).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);});
