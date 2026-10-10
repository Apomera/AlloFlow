// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),runtime=process.env.KITCHEN_WATCH_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_workspace.js'));
const R=require(path.join(runtime,'recipe_lab_engine.js')),C=require(path.join(runtime,'recipe_lab_clock.js')),W=require(path.join(runtime,'recipe_lab_vessel_watch.js')),U=require(path.join(runtime,'recipe_lab_vessel_watch_ui.js')),$=id=>document.getElementById(id);
let ui,host,state,clock,timing,settings,timeStep,speed,play,originalPlay,originalSpeed,order;
function pan(){let s=R.start('mushroom');for(const [a,v] of [['wash'],['rinse'],['cut'],['dry'],['oil'],['produce']])s=R.act(s,a,v);return s;}
function pasta(){let s=pan();s=R.act(s,'measure',R.ingredients(s).pasta);s=R.act(s,'fill');s=R.act(s,'potHeat',3);for(let n=0;n<40&&s.pot.temp<96;n++)s=R.act(s,'advance',30);s=R.act(s,'pasta');s=R.act(s,'stirPot');s=R.act(s,'sample');return s;}
function model(options={}){return W.describe(state,options);}
function render(options={}){const next=model(options);ui.render(next);return next;}
function summary(){return $('sceneVesselWatch').querySelector('summary');}
function openWatch(){summary().click();}
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}
beforeEach(()=>{
 document.body.innerHTML='<button id="outsideControl" type="button">Elsewhere</button><div id="sceneWorkspaceClock"><p id="sceneRecordedClock" hidden></p><div class="time-controls"><div><strong id="clock">0:00</strong><span id="clockStatus">simulated time · paused</span></div><button id="play" type="button">Run kitchen</button><button id="advance" type="button">Advance 30 seconds</button><details id="sceneClockSettings"><summary>Clock settings</summary><label for="timeStep">Clock step<select id="timeStep"><option value="30">30 seconds</option></select></label><label for="speed">Speed<select id="speed"><option value="1">1×</option><option value="2">2×</option></select></label></details></div></div><div id="recipeScene"><canvas></canvas></div>';
 const style=document.createElement('style');style.textContent=readFileSync(path.join(runtime,'recipe_lab_vessel_watch.css'),'utf8');document.head.append(style);style.dataset.watchTest='true';
 clock=$('sceneWorkspaceClock');timing=clock.querySelector('.time-controls');settings=$('sceneClockSettings');timeStep=$('timeStep');speed=$('speed');play=$('play');originalPlay=vi.fn();originalSpeed=vi.fn();play.addEventListener('click',originalPlay);speed.addEventListener('change',originalSpeed);order=[];
 host={container:clock,pause:vi.fn(()=>order.push('pause')),cancel:vi.fn(()=>order.push('cancel')),resize:vi.fn(),apply:vi.fn(),open:vi.fn((station,method)=>order.push([station,method,$('sceneVesselWatch').open]))};ui=U.mount(host);state=pan();render();
});
afterEach(()=>{if(ui)ui.dispose();document.querySelectorAll('style[data-watch-test]').forEach(node=>node.remove());document.body.replaceChildren();vi.restoreAllMocks();});

describe('A compact watch shares the original clock workspace',()=>{
 it('starts closed next to the same Clock settings and time controls',()=>{
  expect($('sceneVesselWatch').open).toBe(false);expect($('watchSummaryText').textContent).toBe('Watch vessels');expect(clock.dataset.watchOpen).toBe('false');expect($('sceneClockOptions').contains(settings)).toBe(true);expect($('sceneClockOptions').contains($('sceneVesselWatch'))).toBe(true);expect(settings.closest('.time-controls')).toBe(timing);expect($('timeStep')).toBe(timeStep);expect($('speed')).toBe(speed);expect($('play')).toBe(play);expect(clock.querySelectorAll('#sceneClockSettings')).toHaveLength(1);expect(host.pause).not.toHaveBeenCalled();expect(host.cancel).not.toHaveBeenCalled();
 });
 it('pauses and cancels on explicit user opening and closing without a cooking action',()=>{
  const before=JSON.stringify(state);summary().focus();openWatch();expect($('sceneVesselWatch').open).toBe(true);expect(clock.dataset.watchOpen).toBe('true');expect(order).toEqual(['pause','cancel']);expect(host.resize).toHaveBeenCalledTimes(1);openWatch();expect($('sceneVesselWatch').open).toBe(false);expect(clock.dataset.watchOpen).toBe('false');expect(order).toEqual(['pause','cancel','pause','cancel']);expect(document.activeElement).toBe(summary());expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();expect(host.open).not.toHaveBeenCalled();
 });
 it('supports summary Enter and Space once per key press and ignores repeat',()=>{
  summary().focus();summary().dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));expect($('sceneVesselWatch').open).toBe(true);summary().dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}));expect($('sceneVesselWatch').open).toBe(true);expect(host.pause).toHaveBeenCalledTimes(1);summary().dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));expect($('sceneVesselWatch').open).toBe(false);expect(host.pause).toHaveBeenCalledTimes(2);expect(document.activeElement).toBe(summary());
 });
 it('retains the original clock listeners and selector values while watch renders',()=>{
  speed.value='2';for(let n=0;n<4;n++)render();play.click();speed.dispatchEvent(new Event('change',{bubbles:true}));expect(originalPlay).toHaveBeenCalledTimes(1);expect(originalSpeed).toHaveBeenCalledTimes(1);expect(speed.value).toBe('2');expect($('clock').textContent).toBe('0:00');expect($('advance').textContent).toBe('Advance 30 seconds');expect(settings.open).toBe(false);expect(settings.closest('.time-controls')).toBe(timing);
 });
 it('renders public model fields exactly in paired cards without new live regions or score controls',()=>{
  const next=render();for(const [station,key] of [['pot','Pot'],['pan','Pan']]){expect($('watch'+key+'Title').textContent).toBe(next[station].name);expect($('watch'+key+'Cue').textContent).toBe(next[station].cue);expect($('watch'+key+'Context').textContent).toBe(next[station].context);expect($('watch'+key+'Check').textContent).toBe(next[station].checkText);expect($('watch'+key+'Reminder').textContent).toBe(next[station].reminder.text);expect($('watch'+key+'Attention').textContent).toBe(next[station].attentionText);expect($('watch'+key+'Card').querySelector('svg').getAttribute('aria-hidden')).toBe('true');expect($('watch'+key+'Card').querySelector('svg').getAttribute('focusable')).toBe('false');}expect($('sceneVesselWatch').querySelector('[aria-live],[role="status"],input,select,progress,meter')).toBeNull();expect(getComputedStyle($('watchPotOpen')).minHeight).toBe('44px');expect(getComputedStyle($('watchPanKeyboard')).minHeight).toBe('44px');expect(host.open).not.toHaveBeenCalled();
 });
 it('does not open, focus, announce or mutate evidence during repeated render updates',()=>{
  const next=frozen(model()),before=JSON.stringify(state),observer=new MutationObserver(()=>{});$('outsideControl').focus();ui.render(next);observer.observe($('watchSharedCue'),{childList:true,characterData:true,subtree:true});for(let n=0;n<5;n++)ui.render(next);expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect($('sceneVesselWatch').open).toBe(false);expect(document.activeElement).toBe($('outsideControl'));expect(JSON.stringify(state)).toBe(before);expect(host.pause).not.toHaveBeenCalled();expect(host.cancel).not.toHaveBeenCalled();expect(host.apply).not.toHaveBeenCalled();expect(host.open).not.toHaveBeenCalled();
 });
});

describe('Observation routes open existing physical or keyboard tools',()=>{
 it.each([['pot','Pot','native','Open'],['pot','Pot','keyboard','Keyboard'],['pan','Pan','native','Open'],['pan','Pan','keyboard','Keyboard']])('closes before routing %s through %s', (station,key,method,suffix)=>{
  const before=JSON.stringify(state);openWatch();order=[];host.pause.mockClear();host.cancel.mockClear();host.open.mockImplementation((station,method)=>{order.push([station,method,$('sceneVesselWatch').open]);$('outsideControl').focus();});$('watch'+key+suffix).focus();$('watch'+key+suffix).click();expect(host.open).toHaveBeenCalledWith(station,method);expect(order).toEqual(['pause','cancel',[station,method,false]]);expect($('sceneVesselWatch').open).toBe(false);expect(clock.dataset.watchOpen).toBe('false');expect(document.activeElement).toBe($('outsideControl'));expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('labels the exact available check and explains the keyboard equivalent without taking that check',()=>{
  state=pasta();const next=render(),before=JSON.stringify(state);expect(next.pot.route.tool).toBe('sample');expect($('watchPotOpen').textContent).toBe(next.pot.route.label);expect($('watchPotKeyboard').getAttribute('aria-label')).toBe(next.pot.route.label+' with keyboard controls');expect($('watchPotKeyboard').getAttribute('aria-describedby')).toBe('watchPotRouteHint');expect($('watchPotRouteHint').textContent).toBe(next.pot.route.detail);expect($('watchPotRouteHint').hidden).toBe(true);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();expect(host.open).not.toHaveBeenCalled();
 });
 it('routes a covered pot to lifting its lid instead of pretending a sample is available',()=>{
  state=pasta();state=R.act(state,'lidPlace','covered');const next=render();expect(next.pot.route.tool).toBe('lid');expect($('watchPotOpen').textContent).toBe('Lift lid first');const card=$('watchPotCard');expect(card.querySelector('.watch-lid').style.display).toBe('');expect(card.querySelector('.watch-water').style.display).toBe('none');expect(card.querySelector('.watch-pasta').style.display).toBe('none');expect(card.querySelector('.watch-bubbles').style.display).toBe('none');openWatch();$('watchPotOpen').click();expect(host.open).toHaveBeenCalledWith('pot','native');
 });
 it('can close with focus restoration without stealing outside focus or performing a new action',()=>{
  openWatch();$('watchPanKeyboard').focus();host.pause.mockClear();host.cancel.mockClear();ui.close();expect($('sceneVesselWatch').open).toBe(false);expect(document.activeElement).toBe(summary());expect(host.pause).not.toHaveBeenCalled();expect(host.cancel).not.toHaveBeenCalled();openWatch();$('outsideControl').focus();ui.close();expect(document.activeElement).toBe($('outsideControl'));expect(host.open).not.toHaveBeenCalled();
 });
});

describe('Both public reactions stay current without inventing a check',()=>{
 it('updates both cards after an actual shared-clock step and retains the accepted sample timestamp',()=>{
  state=pasta();let next=render();expect(next.pot.lastCheck).not.toBeNull();const sampleTime=next.pot.lastCheck.time,oldCheck=$('watchPotCheck').textContent;state=R.act(state,'panHeat',2);state=R.act(state,'advance',30);const before=JSON.stringify(state);next=render();expect(next.pot.lastCheck.time).toBe(sampleTime);expect(next.pot.lastCheck.stale).toBe(true);expect($('watchPotCheck').textContent).toBe(next.pot.checkText);expect($('watchPotCheck').textContent).not.toBe(oldCheck);expect($('watchPotCue').textContent).toBe(next.pot.cue);expect($('watchPanCue').textContent).toBe(next.pan.cue);expect($('watchPanContext').textContent).toBe(next.pan.context);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('shows pan-on-trivet context and static sketch from the accepted placement',()=>{
  state=R.act(state,'panPlace','trivet');const next=render(),card=$('watchPanCard');expect(next.pan.visual.site).toBe('trivet');expect(card.dataset.site).toBe('trivet');expect($('watchPanContext').textContent).toContain('On trivet; no burner input');expect(card.querySelector('.watch-trivet').style.display).toBe('');expect(card.querySelector('.watch-pan-burner').style.display).toBe('none');expect(card.querySelector('.watch-pan-food').style.display).toBe('');
 });
 it('shows a due learner reminder once while retaining its exact accessible attention text',()=>{
  const timers={pot:C.create(state.time,15),pan:C.create(state.time,30)};state=R.act(state,'advance',15);const next=render({checkTimers:timers});expect(next.pot.reminder.status).toBe('elapsed');expect($('watchPotReminder').textContent).toBe(next.pot.reminder.text);expect($('watchPotReminder').dataset.status).toBe('elapsed');expect($('watchPotCard').dataset.attention).toBe('true');expect($('watchPotAttention').textContent).toBe(next.pot.attentionText);expect($('watchPotAttention').hidden).toBe(true);expect($('watchPanReminder').textContent).toBe(next.pan.reminder.text);expect($('watchSummaryText').textContent).toBe('Watch vessels');expect($('watchModeCaption').textContent).toBe('Check time');expect(summary().getAttribute('aria-label')).toContain('Check time');expect($('sceneVesselWatch').querySelector('[aria-live]')).toBeNull();
 });
 it('shows an existing concrete warning separately from a different reminder',()=>{
  state=R.act(R.start(),'potHeat',3);const next=render();expect(next.pot.attention).toBe(true);expect($('watchPotAttention').textContent).toContain('no water');expect($('watchPotAttention').hidden).toBe(false);expect($('watchPotReminder').textContent).toBe(next.pot.reminder.text);expect($('watchPotContext').textContent).toContain('No cooking water');expect($('watchModeCaption').textContent).toBe('Pot attention');expect($('sceneVesselWatch').dataset.attention).toBe('true');
 });
});

describe('Replay, finished cooks and disposal preserve the clock controls',()=>{
 it('moves only the watch outside hidden timing in replay and returns the same node on live view',()=>{
  openWatch();summary().focus();const watch=$('sceneVesselWatch');timing.hidden=true;const next=render({historical:true,checkTimers:{pot:C.create(state.time,15)}});expect(watch.parentNode).toBe(clock);expect(watch.open).toBe(true);expect(document.activeElement).toBe(summary());expect(settings.closest('.time-controls')).toBe(timing);expect(timeStep.closest('.time-controls')).toBe(timing);expect(speed.closest('.time-controls')).toBe(timing);expect(timing.hidden).toBe(true);expect($('watchSharedCue').textContent).toBe(next.summary);expect($('watchPotReminder').textContent).toBe('Live check reminders are hidden in replay.');expect($('watchPotOpen').disabled).toBe(true);expect($('watchPanKeyboard').disabled).toBe(true);expect($('watchPotRouteHint').hidden).toBe(false);timing.hidden=false;render();expect($('sceneVesselWatch')).toBe(watch);expect(watch.parentNode).toBe($('sceneClockOptions'));expect(watch.open).toBe(true);expect(document.activeElement).toBe(summary());
 });
 it.each([{historical:true},{ended:true}])('keeps locked observations descriptive without routing on %j',options=>{
  const before=JSON.stringify(state),next=render(options);openWatch();for(const id of ['watchPotOpen','watchPotKeyboard','watchPanOpen','watchPanKeyboard']){expect($(id).disabled).toBe(true);$(id).click();}expect($('sceneVesselWatch').dataset.mode).toBe(next.mode);expect(host.open).not.toHaveBeenCalled();expect(host.apply).not.toHaveBeenCalled();expect(JSON.stringify(state)).toBe(before);
 });
 it('disposes its own presentation and restores the same original settings, values and listeners',()=>{
  const watch=$('sceneVesselWatch'),route=$('watchPanOpen');speed.value='2';render({historical:true});ui.dispose();expect($('sceneVesselWatch')).toBeNull();expect($('sceneClockOptions')).toBeNull();expect($('sceneClockSettings')).toBe(settings);expect(settings.parentNode).toBe(timing);expect($('timeStep')).toBe(timeStep);expect($('speed')).toBe(speed);expect(speed.value).toBe('2');expect(clock.dataset.watchOpen).toBeUndefined();play.click();speed.dispatchEvent(new Event('change',{bubbles:true}));expect(originalPlay).toHaveBeenCalledTimes(1);expect(originalSpeed).toHaveBeenCalledTimes(1);const calls={pause:host.pause.mock.calls.length,cancel:host.cancel.mock.calls.length,resize:host.resize.mock.calls.length};route.click();watch.querySelector('summary').click();ui.render(model());ui.close();expect(host.open).not.toHaveBeenCalled();expect(host.pause).toHaveBeenCalledTimes(calls.pause);expect(host.cancel).toHaveBeenCalledTimes(calls.cancel);expect(host.resize).toHaveBeenCalledTimes(calls.resize);expect(clock.dataset.watchOpen).toBeUndefined();expect($('sceneVesselWatch')).toBeNull();
 });
});
