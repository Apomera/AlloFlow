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
const W=load('workspace'),G=load('gesture_guide'),$=id=>document.getElementById(id);
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
const review=()=>document.querySelector('[data-movement-review="result"]');
const reviewButton=()=>document.querySelector('[data-movement-review="button"]');
function expectReview(info){
 expect(review().hidden).toBe(false);expect(review().textContent).toContain(info.instruction);expect(review().textContent).toContain(info.detail);expect(reviewButton().getAttribute('aria-disabled')).toBe('false');
 expect(review().querySelector('[aria-live],[role="status"],[role="alert"]')).toBeNull();expect(review().hasAttribute('aria-live')).toBe(false);
}
function expectNoReview(){expect(review().hidden).toBe(true);expect(reviewButton().getAttribute('aria-disabled')).toBe('true');expect(reviewButton().disabled).toBe(false);}

describe('Spoken movement instructions follow meaningful preview changes',()=>{
 it('announces each chosen timer interval while its release phase stays the same',()=>{
  const m=mounted({tool:'timer'}),T=window.KitchenTimerWinding,timers={},s=m.state(),before=JSON.stringify(s),announcer=$('sceneGestureAnnouncement'),observer=new MutationObserver(()=>{});let trace=T.start(s,timers,'pot',{x:0,y:.4},false);
  observer.observe(announcer,{childList:true,characterData:true,subtree:true});
  for(let index=1;index<=5;index++){
   const angle=index*Math.PI/3;trace=T.move(trace,{x:Math.sin(angle)*.4,y:Math.cos(angle)*.4});const info=T.guidance(s,{trace},timers,false);expect(info.phase).toBe('release');m.tools.gesture(info);expect(announcer.textContent).toBe(info.title+'. '+info.instruction);expect(announcer.textContent).toContain(['15 seconds','30 seconds','1 minute','2 minutes','5 minutes'][index-1]);expect(observer.takeRecords()).toHaveLength(1);
   m.tools.gesture({...info,progress:Math.min(1,info.progress+.01),detail:'Preview progress changed, but this is the same chosen interval.'});expect(observer.takeRecords()).toHaveLength(0);
  }
  observer.disconnect();expect(JSON.stringify(s)).toBe(before);expect(timers).toEqual({});expect(m.host.apply).not.toHaveBeenCalled();expect(m.host.pause).not.toHaveBeenCalled();
 });
 it('announces Low, Medium and High burner previews without waiting for a phase change',()=>{
  const m=mounted({tool:'burner'}),B=window.KitchenBurnerDials,s=m.state(),before=JSON.stringify(s),announcer=$('sceneGestureAnnouncement'),observer=new MutationObserver(()=>{});let trace=B.start(0,{x:0,z:-.4});observer.observe(announcer,{childList:true,characterData:true,subtree:true});
  for(let level=1;level<=3;level++){
   const angle=level*Math.PI/2;trace=B.move(trace,{x:Math.sin(angle)*.4,z:-Math.cos(angle)*.4});const info=G.describe(s,{kind:'burner',station:'pot',trace});expect(info.phase).toBe('release');m.tools.gesture(info);expect(announcer.textContent).toBe('Pot burner. Preview: '+B.levels[level]+'. Release to apply.');expect(observer.takeRecords()).toHaveLength(1);m.tools.gesture({...info});expect(observer.takeRecords()).toHaveLength(0);
  }
  observer.disconnect();expect(JSON.stringify(s)).toBe(before);expect(s.pot.heat).toBe(0);expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('keeps unchanged spoken instructions quiet through progress, counter and phase-only updates',()=>{
  const m=mounted(),announcer=$('sceneGestureAnnouncement');m.tools.gesture(active);const text=announcer.textContent,observer=new MutationObserver(()=>{});observer.observe(announcer,{childList:true,characterData:true,subtree:true});
  for(const next of [{...active,progress:.72},{...active,progress:.84,detail:'30 mL in the pan; 70 mL left in the jug.'},{...active,phase:'release',progress:1,detail:'40 mL in the pan; 60 mL left in the jug.'}])m.tools.gesture(next);
  expect(observer.takeRecords()).toHaveLength(0);expect(announcer.textContent).toBe(text);expect($('gestureProgress').value).toBe(100);expect($('gestureDetail').textContent).toContain('40 mL');observer.disconnect();
 });
 it('announces a changed correction within one phase and then its recovery once each',()=>{
  const m=mounted(),announcer=$('sceneGestureAnnouncement'),initial={...active,title:'Pour saved water',phase:'level',instruction:'Pull straight down to tilt; lift back here to stop.'};m.tools.gesture(initial);const observer=new MutationObserver(()=>{});observer.observe(announcer,{childList:true,characterData:true,subtree:true});
  const correction={...initial,instruction:'Move back to the tilt path, then level the jug.'};m.tools.gesture(correction);expect(announcer.textContent).toBe(correction.title+'. '+correction.instruction);expect(observer.takeRecords()).toHaveLength(1);m.tools.gesture({...correction,progress:.8});expect(observer.takeRecords()).toHaveLength(0);m.tools.gesture(initial);expect(announcer.textContent).toBe(initial.title+'. '+initial.instruction);expect(observer.takeRecords()).toHaveLength(1);observer.disconnect();
 });
});

describe('A movement result uses one announcer and a quiet review',()=>{
 it.each(['completed','unfinished','stopped','kept'])('renders a %s result without moving focus or changing recipe evidence',outcome=>{
  const m=mounted(),before=JSON.stringify(m.state()),scene=$('recipeScene'),canvas=scene.firstElementChild,parent=scene.parentNode,info=Object.freeze(result(outcome));
  $('sceneChooseTool').focus();const focus=document.activeElement;m.tools.receipt(info);
  const coach=$('sceneGestureCoach');expect(document.querySelectorAll('#sceneGestureCoach')).toHaveLength(1);expect(coach.hidden).toBe(false);expect(coach.dataset.mode).toBe('receipt');expect(coach.dataset.outcome).toBe(outcome);expect(coach.dataset.tool).toBe('stir');expect(coach.dataset.phase).toBe('fold');
  expect($('gestureTitle').textContent).toBe(info.title);expect(coach.querySelector('.gesture-clock').textContent).toBe(info.label);expect($('gestureInstruction').textContent).toBe(info.instruction);expect($('gestureDetail').textContent).toBe(info.detail);expect($('gestureProgress').hidden).toBe(true);expect(coach.querySelector('.gesture-exit').hidden).toBe(true);
  expect(coach.querySelector('button,input,select,a,[tabindex]')).toBeNull();expect(coach.querySelector('[aria-live],[role="status"]')).toBeNull();expect(coach.tabIndex).toBe(-1);expect(document.querySelectorAll('#sceneGestureAnnouncement[aria-live="polite"]')).toHaveLength(1);
  expectReview(info);expect(review().open).toBe(false);expect(document.querySelectorAll('[data-movement-review="button"]')).toHaveLength(1);expect(reviewButton().getAttribute('aria-controls')).toBe(review().id);
  expect(document.activeElement).toBe(focus);expect(scene.firstElementChild).toBe(canvas);expect(scene.parentNode).toBe(parent);expect(JSON.stringify(m.state())).toBe(before);expect(m.host.apply).not.toHaveBeenCalled();expect(m.host.pause).not.toHaveBeenCalled();expect(m.host.choose).not.toHaveBeenCalled();
 });
 it('announces an identical receipt only once and retains it through repeated same-state renders',()=>{
  const m=mounted(),info=result();m.tools.receipt(info);const announce=$('sceneGestureAnnouncement'),text=announce.textContent,observer=new MutationObserver(()=>{});observer.observe(announce,{childList:true,subtree:true,characterData:true});
  for(let i=0;i<6;i++){m.tools.receipt({...info});m.tools.render(m.state());}
  expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect(announce.textContent).toBe(text);expect(text).toContain(info.label);expect(text).toContain(info.instruction);expect(text).toContain(info.detail);expect($('sceneGestureCoach').hidden).toBe(false);expectReview(info);
 });
 it('announces changed evidence even when the tool and outcome stay the same',()=>{
  const m=mounted();m.tools.receipt(result('kept'));const next=result('kept',{instruction:'40 mL stays in the pan.'});m.tools.receipt(next);expect($('sceneGestureAnnouncement').textContent).toContain('40 mL');expect($('sceneGestureAnnouncement').textContent).not.toContain('30 mL');expect($('gestureInstruction').textContent).toBe(next.instruction);expectReview(next);expect(review().textContent).not.toContain('30 mL');
 });
 it('restores live caption, progress and release instruction on the next real gesture',()=>{
  const m=mounted();m.tools.receipt(result('unfinished'));m.tools.gesture(active);const coach=$('sceneGestureCoach');expect(coach.hidden).toBe(false);expect(coach.dataset.mode).toBe('gesture');expect(coach.dataset.outcome).toBeUndefined();expect(coach.querySelector('.gesture-clock').textContent).toBe('Clock paused');expect(coach.querySelector('.gesture-exit').hidden).toBe(false);expect($('gestureProgress').hidden).toBe(false);expect($('gestureProgress').value).toBe(65);expect($('gestureProgress').getAttribute('aria-label')).toBe(active.progressLabel);expect($('gestureInstruction').textContent).toBe(active.instruction);expect($('sceneGestureAnnouncement').textContent).toBe(active.title+'. '+active.instruction);expectNoReview();
 });
 it('clears the transient coach with gesture(null) while retaining review, focus and action feedback',()=>{
  const m=mounted(),info=result();$('sceneChooseTool').focus();m.tools.receipt(info);m.tools.gesture(null);const coach=$('sceneGestureCoach');expect(coach.hidden).toBe(true);expect(coach.dataset.mode).toBe('gesture');expect(coach.dataset.outcome).toBeUndefined();expect(coach.querySelector('.gesture-clock').textContent).toBe('Clock paused');expect(coach.querySelector('.gesture-exit').hidden).toBe(false);expect($('gestureProgress').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expect($('sceneActionStatus').textContent).toBe('Existing action feedback');expect(document.activeElement).toBe($('sceneChooseTool'));expectReview(info);
 });
 it('clears a stale receipt before announcing a newly found starting object',()=>{
  const m=mounted(),info=result();m.tools.receipt(info);m.tools.start(finder);expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneStartCue').hidden).toBe(false);expect($('sceneGestureAnnouncement').textContent).toContain('Start here.');expect($('sceneGestureAnnouncement').textContent).toContain(finder.instruction);expect($('sceneGestureAnnouncement').textContent).not.toContain('One completed fold');m.tools.clearReceipt();expect($('sceneGestureAnnouncement').textContent).toContain(finder.instruction);expectReview(info);
 });
 it('removes finder and hover overlays when a result replaces the gesture',()=>{
  const m=mounted();m.tools.start(finder);m.tools.position({x:140,y:160,visible:true});m.tools.hover({name:'Pan',detail:'Carry to the trivet',ready:true});m.tools.receipt(result());expect($('sceneStartCue').hidden).toBe(true);expect($('sceneStartMarker').hidden).toBe(true);expect($('sceneTargetHint').hidden).toBe(true);expect($('sceneGestureCoach').hidden).toBe(false);
 });
 it('provides an idempotent clearReceipt API that leaves unrelated live or finder guidance intact',()=>{
  const m=mounted(),info=result();m.tools.receipt(info);m.tools.clearReceipt();m.tools.clearReceipt();expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expectReview(info);m.tools.gesture(active);const announcement=$('sceneGestureAnnouncement').textContent;m.tools.clearReceipt();expect($('sceneGestureCoach').hidden).toBe(false);expect($('sceneGestureAnnouncement').textContent).toBe(announcement);expectNoReview();
 });
 it('keeps a terminal receipt readable without stacking a second target tooltip on hover',()=>{
  const m=mounted(),target={name:'Sauce pan',detail:'Carry to the trivet.',ready:true};m.tools.receipt(result());m.tools.hover(target);expect($('sceneTargetHint').hidden).toBe(true);expect($('sceneGestureCoach').hidden).toBe(false);m.tools.clearReceipt();m.tools.hover(target);expect($('sceneTargetHint').hidden).toBe(false);expect($('sceneTargetHint').textContent).toContain(target.detail);
 });
});

describe('Result lifecycle and learner preferences',()=>{
 it.each([true,false])('clears a result when state identity changes with movement hints %s',hints=>{
  const m=mounted({hints});m.tools.receipt(result());const next={...m.state()};m.update(next);expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expectNoReview();expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('keeps a receipt published after a state save when its first render uses that same saved state',()=>{
  const m=mounted(),next=R.act(m.state(),'wash'),info=result();m.setState(next);m.tools.receipt(info);m.tools.render(next);expect($('sceneGestureCoach').hidden).toBe(false);expect($('sceneGestureAnnouncement').textContent).toContain('Movement completed');expectReview(info);
 });
 it.each([true,false])('announces the same result once in a distinct saved state with movement hints %s',hints=>{
  const m=mounted({hints}),info=result();m.tools.receipt(info);const next=R.act(m.state(),'wash'),observer=new MutationObserver(()=>{});observer.observe($('sceneGestureAnnouncement'),{childList:true,subtree:true,characterData:true});m.setState(next);m.tools.receipt({...info});expect(observer.takeRecords()).toHaveLength(1);m.tools.render(next);m.tools.receipt({...info});expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect($('sceneGestureCoach').hidden).toBe(!hints);expectReview(info);
 });
 it.each([true,false])('clears review on replay lock and rejects locked results with movement hints %s',hints=>{
  const m=mounted({hints});m.tools.receipt(result());m.lock();expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expectNoReview();m.tools.receipt(result('kept'));expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expectNoReview();expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('keeps the result review and one announcement available when Movement hints is off',()=>{
  const m=mounted({hints:false}),info=result(),announcement=$('sceneGestureAnnouncement'),observer=new MutationObserver(()=>{});observer.observe(announcement,{childList:true,subtree:true,characterData:true});m.tools.receipt(info);expect(observer.takeRecords()).toHaveLength(1);m.tools.receipt({...info});m.tools.render(m.state());expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect(m.tools.guidesEnabled()).toBe(false);expect($('sceneGuideToggle').getAttribute('aria-pressed')).toBe('false');expect($('sceneGestureCoach').hidden).toBe(true);expect(announcement.textContent).toBe(info.label+'. '+info.title+'. '+info.instruction+' '+info.detail);expectReview(info);expect($('sceneActionStatus').textContent).toBe('Existing action feedback');expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('preserves review across hints toggles without replaying its announcement or resurrecting the coach',()=>{
  const m=mounted(),info=result();m.tools.receipt(info);$('sceneGuideToggle').focus();$('sceneGuideToggle').click();expect(m.host.cancel).toHaveBeenCalledOnce();expect($('sceneGuideToggle').getAttribute('aria-pressed')).toBe('false');expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expectReview(info);expect(document.activeElement).toBe($('sceneGuideToggle'));expect(localStorage.getItem('alloflow-kitchen-movement-hints')).toBe('off');
  const next=result('unfinished');m.tools.receipt(next);expect($('sceneGestureCoach').hidden).toBe(true);expectReview(next);$('sceneGuideToggle').click();expect($('sceneGestureCoach').hidden).toBe(true);expectReview(next);const observer=new MutationObserver(()=>{});observer.observe($('sceneGestureAnnouncement'),{childList:true,subtree:true,characterData:true});m.tools.receipt({...next});expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect($('sceneGestureCoach').hidden).toBe(true);expect(localStorage.getItem('alloflow-kitchen-movement-hints')).toBe('on');m.tools.gesture(active);expectNoReview();m.tools.receipt(next);expect($('sceneGestureCoach').hidden).toBe(false);expectReview(next);expect(m.host.apply).not.toHaveBeenCalled();
 });
 it('supports a result without an optional lesson and does not synthesize blank live text',()=>{
  const m=mounted(),info=result('stopped',{detail:''});m.tools.receipt(info);expect($('gestureDetail').textContent).toBe('');expect($('sceneGestureAnnouncement').textContent).toBe(info.label+'. '+info.title+'. '+info.instruction);expectReview(info);m.tools.receipt(null);expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expectNoReview();
 });
 it.each([true,false])('preserves an open review through routine gesture cleanup and finder updates with hints %s',hints=>{
  const m=mounted({hints}),info=result('unfinished');m.tools.receipt(info);reviewButton().click();const summary=review().querySelector('summary');expect(document.activeElement).toBe(summary);m.tools.gesture(null);m.tools.clearReceipt();m.tools.start(finder);m.tools.render(m.state());expectReview(info);expect(review().open).toBe(true);expect(document.activeElement).toBe(summary);expect($('sceneGestureAnnouncement').textContent).toContain(finder.instruction);expect(m.host.apply).not.toHaveBeenCalled();
 });
 it.each([true,false])('clears the previous review on a real new movement and repairs review focus with hints %s',hints=>{
  const m=mounted({hints});m.tools.receipt(result());reviewButton().click();m.tools.gesture(active);expectNoReview();expect(document.activeElement).toBe(reviewButton());expect($('sceneGestureCoach').hidden).toBe(!hints);expect($('sceneGestureAnnouncement').textContent).toBe(hints?active.title+'. '+active.instruction:'');
 });
});

it.each([true,false])('clears a previous tool result on automatic tool changes with movement hints %s',hints=>{const m=mounted({hints}),before=JSON.stringify(m.state());m.tools.receipt(result());m.host.tool=()=> 'wash';m.tools.render(m.state());expect($('sceneGestureCoach').hidden).toBe(true);expect($('sceneGestureAnnouncement').textContent).toBe('');expectNoReview();expect(m.host.choose).not.toHaveBeenCalled();expect(m.host.apply).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);});

it.each([true,false])('invalidates a changed practice amount or timer while hints are %s without inventing a cooking action',hints=>{const m=mounted({hints}),before=JSON.stringify(m.state());m.tools.receipt(result('kept'));m.tools.invalidateReceipt();expectNoReview();expect($('sceneGestureAnnouncement').textContent).toBe('');expect($('sceneGestureCoach').hidden).toBe(true);expect(JSON.stringify(m.state())).toBe(before);expect(m.host.apply).not.toHaveBeenCalled();});
