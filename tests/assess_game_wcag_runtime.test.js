import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const strings=JSON.parse(readFileSync('ui_strings.js','utf8'));
const t=(key,params={})=>{let value=key.split('.').reduce((node,part)=>node?.[part],strings);if(typeof value!=='string')return key;return value.replace(/\{(\w+)\}/g,(match,name)=>params[name]??match);};
let root,host,write,api;
const object={id:'o1',name:'Telescope',emoji:'🔭'},puzzle={id:'p1',type:'mcq',linkedObjectId:'o1',question:'Choose the star',options:['Star','Moon'],correctIndex:0};
const room=(patch={})=>({isActive:true,isPaused:false,startedAt:100,endsAt:Date.now()+300000,timeRemaining:300,room:{theme:'Observatory',description:'Find the clues.'},objects:[object],puzzles:[puzzle],teams:{u:'Red'},teamProgress:{Red:{progressVersion:2,maxLives:3,maxHints:3,solved:{},misses:{},revealedHints:{}}},...patch});
const teacher=state=>({sessionData:{escapeRoomState:state},activeSessionCode:'LIVE',appId:'app',t});
const student=state=>({sessionData:{escapeRoomState:state},user:{uid:'u'},activeSessionCode:'LIVE',targetAppId:'app',t});
beforeAll(()=>{
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 window.AlloLanguageContext=React.createContext({t});window.UiLanguageSelector=()=>null;
 write=vi.fn(async()=>{});window.__alloShared={db:{},warnLog(){}};
 window.__alloFirebase={doc:(_db,...parts)=>parts.join('/'),updateDoc:(...args)=>write(...args)};
 window._fbDoc=window.__alloFirebase.doc;window._fbUpdateDoc=(...args)=>write(...args);window.__alloHooks={useFocusTrap(){}};
 loadAlloModule('escape_room_module.js');loadAlloModule('teacher_module.js');api=window.AlloModules;
});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;write.mockReset();write.mockResolvedValue(undefined);delete window.__alloFirebase.runTransaction;delete window.__alloFirebase.getDoc;delete window.__alloLessonBoardConditionalUpdate;vi.useRealTimers();});
async function mount(Component,props){if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(Component,props)));}
async function click(selector){const button=typeof selector==='string'?host.querySelector(selector):selector;expect(button).toBeTruthy();await act(async()=>button.click());}

describe('Assess game accessibility repairs',()=>{
 it('uses visible settings labels and exposes the selected difficulty',async()=>{
  function Settings(){const [state,setState]=React.useState({showSettings:true,difficulty:'normal',puzzleCount:10});return React.createElement(api.EscapeRoomDialogs,{escapeRoomState:state,setEscapeRoomState:setState,handlers:{hasSavedEscapeRoom:()=>false,hasEscapeRoomDraft:()=>false,updateEscapeRoomSetting:(key,value)=>setState(previous=>({...previous,[key]:value}))},t,hasSourceOrAnalysis:true});}
  await mount(Settings,{});
  const slider=host.querySelector('input[type=range]');expect(slider.labels[0].textContent).toBe(t('escape_room.puzzle_count'));expect(slider.hasAttribute('aria-label')).toBe(false);
  const buttons=[...host.querySelectorAll('button')];
  for(const label of [t('common.cancel'),t('escape_room.start')]){const button=buttons.find(control=>control.textContent.trim()===label);expect(button).toBeTruthy();expect(button.hasAttribute('aria-label')).toBe(false);}
  const difficulty=host.querySelector('[aria-labelledby=escape-room-difficulty-label]'),choices=[...difficulty.querySelectorAll('button')];
  expect(choices.map(choice=>choice.getAttribute('aria-pressed'))).toEqual(['false','true','false']);
  await click(choices[2]);expect(choices.map(choice=>choice.getAttribute('aria-pressed'))).toEqual(['false','false','true']);
 });
 it.each([false,true])('publishes the configured live time limit (%s) without generation',async timerEnabled=>{
  const state={activeSessionCode:'LIVE',activeSessionAppId:'app',user:{uid:'host'},sessionData:{roster:{old:{signal:'slow',signalAt:Date.now()+600000},ready:{signal:'ready',signalAt:Date.now()}}},escapeRoomState:{...room(),timerEnabled,solvedPuzzles:new Set()}};
  const callGemini=vi.fn();
  const engine=api.createEscapeRoomEngine({getState:()=>state,setState:{setEscapeRoomState:value=>{state.escapeRoomState=typeof value==='function'?value(state.escapeRoomState):value;}},firebase:{db:{},doc:()=> 'session',updateDoc:write},t,callGemini,addToast:vi.fn(),playSound:vi.fn()});
  await engine.publishEscapeRoomLive();
  expect(write).toHaveBeenCalledTimes(1);expect(callGemini).not.toHaveBeenCalled();
  expect(write.mock.calls[0][1].escapeRoomState).toMatchObject({timerEnabled,timeRemaining:300,endsAt:timerEnabled?Date.now()+300000:null,isGameOver:false});
  expect(write.mock.calls[0][1].escapeRoomState.timeSupportBaseline).toEqual({old:Date.now()+600000});
 });
 it('lets the teacher select untimed play before publishing from the live preview',async()=>{
  let latest;
  function Preview(){const [state,setState]=React.useState({...room(),isActive:false,isPreview:true});latest=state;return React.createElement(api.EscapeRoomDialogs,{escapeRoomState:state,setEscapeRoomState:setState,handlers:{},t,liveSession:true});}
  await mount(Preview,{});await click('[data-escape-live-time-limit=off]');
  expect(latest.timerEnabled).toBe(false);expect(host.querySelector('[data-escape-live-time-limit=off]').getAttribute('aria-pressed')).toBe('true');
 });
 it('does not start or expire an untimed teacher clock, even with a stale deadline',async()=>{
  await mount(api.EscapeRoomTeacherControls,teacher(room({timerEnabled:false,timeRemaining:0,endsAt:Date.now()-1000})));
  await act(async()=>vi.advanceTimersByTimeAsync(301000));expect(write).not.toHaveBeenCalled();
  expect(host.textContent).toContain(t('common.time_limit')+': '+t('common.off'));expect(host.querySelector('[data-escape-add-time]').disabled).toBe(true);
 });
 it('allows untimed learners to submit after a stale deadline',async()=>{
  await mount(api.StudentEscapeRoomOverlay,student(room({timerEnabled:false,timeRemaining:0,endsAt:Date.now()-1000})));
  expect(host.textContent).not.toContain(t('escape_room.time_up'));
  expect(host.querySelector('[data-help-key=escape_room_timer]').textContent).toContain(t('common.off'));
  await click('[data-help-key=escape_room_object]');await click('[data-help-key=escape_room_mcq_option]');
  expect(write).toHaveBeenCalledWith('artifacts/app/public/data/sessions/LIVE',expect.objectContaining({'escapeRoomState.teamProgress.Red.solved.p1':'p1'}));
 });
 it('resumes an untimed room without creating a deadline',async()=>{
  await mount(api.EscapeRoomTeacherControls,teacher(room({timerEnabled:false,isPaused:true,timeRemaining:0,endsAt:null})));
  await click([...host.querySelectorAll('button')].find(button=>button.textContent.includes(t('escape_room.resume'))));
  expect(write.mock.calls[0][1]).toMatchObject({'escapeRoomState.isPaused':false,'escapeRoomState.endsAt':null});
 });
 it('offers a time request inside the puzzle and only writes the learner’s allowed pace signal',async()=>{
  await mount(api.StudentEscapeRoomOverlay,student(room({endsAt:Date.now()+50000})));
  expect(host.textContent).toContain('One minute or less remains');
  await click('[data-help-key=escape_room_object]');
  const request=host.querySelector('[role=dialog] [data-escape-request-time]');expect(request).toBeTruthy();
  await click(request);
  expect(write).toHaveBeenCalledWith('artifacts/app/public/data/sessions/LIVE',{'roster.u.signal':'slow','roster.u.signalAt':Date.now()});
  expect(host.textContent).toContain('current clock keeps running until they respond');
  expect(host.querySelectorAll('[data-escape-request-time]')).toHaveLength(1);
 });
 it('retains a retry when the learner’s time request fails',async()=>{
  write.mockRejectedValueOnce(new Error('offline'));await mount(api.StudentEscapeRoomOverlay,student(room()));await click('[data-escape-request-time]');
  expect(host.textContent).toContain('request could not be sent');expect(host.querySelector('[data-escape-request-time]').disabled).toBe(false);
  await click('[data-escape-request-time]');expect(write).toHaveBeenCalledTimes(2);
 });
 it('preserves an in-flight request through pause/resume and keeps its focused button available',async()=>{
  let resolve;write.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));const state=room();
  await mount(api.StudentEscapeRoomOverlay,student(state));host.querySelector('[data-escape-request-time]').focus();await click('[data-escape-request-time]');
  expect(document.activeElement).toBe(host.querySelector('[data-escape-request-time]'));expect(document.activeElement.getAttribute('aria-disabled')).toBe('true');
  await mount(api.StudentEscapeRoomOverlay,student({...state,isPaused:true,endsAt:null,timeRemaining:100}));
  await mount(api.StudentEscapeRoomOverlay,student({...state,endsAt:Date.now()+100000}));
  await click('[data-escape-request-time]');expect(write).toHaveBeenCalledTimes(1);
  await act(async()=>resolve());expect(host.textContent).toContain('More time requested');
 });
 it('ignores an older request completion after a new session has its own pending request',async()=>{
  const done=[];write.mockImplementation(()=>new Promise(resolve=>done.push(resolve)));const state=room();
  await mount(api.StudentEscapeRoomOverlay,student(state));await click('[data-escape-request-time]');
  await mount(api.StudentEscapeRoomOverlay,student({...state,startedAt:101}));await click('[data-escape-request-time]');
  await act(async()=>done[0]());expect(host.textContent).toContain('Sending your request');expect(host.textContent).not.toContain('More time requested');
  await act(async()=>done[1]());expect(host.textContent).toContain('More time requested');
 });
 it('restores a saved request and announces an exact acknowledgment even with a future learner timestamp',async()=>{
  const at=Date.now()+600000,state=room(),roster={u:{signal:'slow',signalAt:at}};
  await mount(api.StudentEscapeRoomOverlay,{...student(state),sessionData:{escapeRoomState:state,roster}});
  expect(host.textContent).toContain('More time requested');await click('[data-escape-request-time]');expect(write).not.toHaveBeenCalled();
  await mount(api.StudentEscapeRoomOverlay,{...student(state),sessionData:{escapeRoomState:{...state,endsAt:state.endsAt+300000,timeSupportAcknowledged:{u:at}},roster}});
  expect(host.textContent).toContain('teacher added more time');await click('[data-escape-request-time]');
  expect(write.mock.calls[0][1]['roster.u.signalAt']).toBe(at+1);
 });
 it('rejects an old request whose transaction reads a newer run, even when the learner clock is ahead',async()=>{
  const hostNow=Date.now(),state=room({startedAt:hostNow-1000,endsAt:hostNow+1200000});
  vi.setSystemTime(hostNow+600000);
  let resolveRead;const update=vi.fn();
  window.__alloFirebase.runTransaction=vi.fn(async(_db,run)=>run({get:()=>new Promise(resolve=>{resolveRead=resolve;}),update}));
  await mount(api.StudentEscapeRoomOverlay,student(state));await click('[data-escape-request-time]');
  expect(host.textContent).toContain('Sending your request');
  await act(async()=>resolveRead({data:()=>({escapeRoomState:{...state,startedAt:hostNow,timeSupportBaseline:{}}})}));
  expect(update).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
  expect(host.textContent).toContain('request could not be sent');expect(host.textContent).not.toContain('More time requested');
 });
 it('writes only the learner pace signal when its transaction still belongs to the active timed run',async()=>{
  const state=room(),update=vi.fn();
  window.__alloFirebase.runTransaction=vi.fn(async(_db,run)=>run({get:async()=>({data:()=>({escapeRoomState:state})}),update}));
  await mount(api.StudentEscapeRoomOverlay,student(state));await click('[data-escape-request-time]');
  expect(update).toHaveBeenCalledWith('artifacts/app/public/data/sessions/LIVE',{'roster.u.signal':'slow','roster.u.signalAt':Date.now()});
  expect(write).not.toHaveBeenCalled();expect(host.textContent).toContain('More time requested');
 });
 it.each(['__alloMbRef','__alloLanRef'])('checks the current run for %s student requests without invoking the host conditional writer',async kind=>{
  const state=room(),ref={[kind]:'session'},at=Date.now();
  window.__alloFirebase.runTransaction=vi.fn();window.__alloLessonBoardConditionalUpdate=vi.fn();
  window.__alloFirebase.getDoc=vi.fn(async()=>({data:()=>({escapeRoomState:{...state,startedAt:101}})}));
  expect(await api.LiveEscapeRoomInternals.writeTimeRequest(ref,state,'u',at,()=>null)).toBeNull();expect(write).not.toHaveBeenCalled();
  window.__alloFirebase.getDoc.mockResolvedValue({data:()=>({escapeRoomState:state})});
  await api.LiveEscapeRoomInternals.writeTimeRequest(ref,state,'u',at,()=>null);
  expect(write).toHaveBeenCalledWith(ref,{'roster.u.signal':'slow','roster.u.signalAt':at});
  expect(window.__alloFirebase.runTransaction).not.toHaveBeenCalled();expect(window.__alloLessonBoardConditionalUpdate).not.toHaveBeenCalled();
 });
 it('does not carry a previous run’s ahead-of-host-clock pace signal into the new activity',async()=>{
  const at=Date.now()+600000,state=room({timeSupportBaseline:{u:at}}),roster={u:{signal:'slow',signalAt:at}};
  expect(api.LiveEscapeRoomInternals.pendingTimeRequests(state,roster)).toEqual([]);
  await mount(api.StudentEscapeRoomOverlay,{...student(state),sessionData:{escapeRoomState:state,roster}});
  expect(host.textContent).not.toContain('More time requested');expect(host.textContent).not.toContain('teacher added more time');
  await click('[data-escape-request-time]');expect(write.mock.calls[0][1]['roster.u.signalAt']).toBe(at+1);
 });
 it('announces time being turned off without removing the request button that holds focus',async()=>{
  const state=room();await mount(api.StudentEscapeRoomOverlay,student(state));const button=host.querySelector('[data-escape-request-time]');button.focus();await click(button);
  await mount(api.StudentEscapeRoomOverlay,student({...state,timerEnabled:false,endsAt:null}));
  expect(document.activeElement).toBe(button);expect(host.textContent).toContain('Continue at your own pace');expect(button.getAttribute('aria-disabled')).toBe('true');
 });
 it('surfaces only current, unhandled pace requests beside teacher time controls',async()=>{
  const state=room({startedAt:1000,timeSupportHandledAt:2000});
  await mount(api.EscapeRoomTeacherControls,{...teacher(state),sessionData:{escapeRoomState:state,roster:{old:{signal:'slow',signalAt:100},handled:{signal:'slow',signalAt:1500},current:{signal:'slow',signalAt:3000},other:{signal:'ready',signalAt:3000}}}});
  expect(host.textContent).toContain('1 learner(s) requested a slower pace');
 });
 it.each([false,true])('adds five minutes while paused=%s and announces the new amount',async isPaused=>{
  await mount(api.EscapeRoomTeacherControls,teacher(room({timerEnabled:true,isPaused,timeRemaining:20,endsAt:isPaused?null:Date.now()+20000})));
  await click('[data-escape-add-time]');
  expect(write.mock.calls[0][1]).toMatchObject({'escapeRoomState.timeRemaining':320,'escapeRoomState.endsAt':isPaused?null:Date.now()+320000});
  expect([...host.querySelectorAll('[role=status]')].some(element=>element.textContent.includes('5:20'))).toBe(true);
 });
 it('lets the teacher turn off an active time limit and announces it',async()=>{
  await mount(api.EscapeRoomTeacherControls,teacher(room({timerEnabled:true})));await click('[data-escape-time-off]');
  expect(write.mock.calls[0][1]).toMatchObject({'escapeRoomState.timerEnabled':false,'escapeRoomState.endsAt':null});
  expect([...host.querySelectorAll('[role=status]')].some(element=>element.textContent===t('common.time_limit')+': '+t('common.off'))).toBe(true);
 });
 it('preserves expiry for legacy timed rooms without an explicit flag',async()=>{
  await mount(api.EscapeRoomTeacherControls,teacher(room({endsAt:Date.now()+1000})));
  await act(async()=>vi.advanceTimersByTimeAsync(2000));
  expect(write).toHaveBeenCalledWith('artifacts/app/public/data/sessions/LIVE',expect.objectContaining({'escapeRoomState.isGameOver':true,'escapeRoomState.gameOverReason':'time'}));
 });
 it('plans clock updates against current state, including both extension/expiry orders',()=>{
  const h=api.LiveEscapeRoomInternals,now=Date.now(),state=room({endsAt:now+1000});
  const apply=(document,patch)=>({...document,escapeRoomState:{...document.escapeRoomState,...Object.fromEntries(Object.entries(patch||{}).map(([key,value])=>[key.slice('escapeRoomState.'.length),value]))}});
  const initial={escapeRoomState:state},extended=apply(initial,h.clockPatch(initial,state,'extend',now));
  expect(h.clockPatch(extended,state,'expire',now+2000)).toBeNull();
  const expired=apply(initial,h.clockPatch(initial,state,'expire',now+2000));
  expect(h.clockPatch(expired,state,'extend',now+2000)).toBeNull();
  const twice=apply(extended,h.clockPatch(extended,state,'extend',now));expect(twice.escapeRoomState.endsAt).toBe(now+601000);
  expect(h.clockPatch({escapeRoomState:{...state,startedAt:101}},state,'off',now)).toBeNull();
 });
 it('acknowledges only observed request versions and leaves concurrent newer requests visible',()=>{
  const h=api.LiveEscapeRoomInternals,state=room(),at=Date.now()+600000;
  const patch=h.clockPatch({escapeRoomState:state,roster:{u:{signal:'slow',signalAt:at},v:{signal:'ready',signalAt:at}}},state,'extend');
  expect(patch['escapeRoomState.timeSupportAcknowledged']).toEqual({u:at});
  const next={...state,timeSupportAcknowledged:patch['escapeRoomState.timeSupportAcknowledged']};
  expect(h.pendingTimeRequests(next,{u:{signal:'slow',signalAt:at},v:{signal:'slow',signalAt:at+1}}).map(([uid])=>uid)).toEqual(['v']);
  expect(h.pendingTimeRequests(next,{u:{signal:'slow',signalAt:at+1}})).toHaveLength(1);
 });
 it('uses transaction current state for two teacher extensions and suppresses stale expiry',async()=>{
  const h=api.LiveEscapeRoomInternals,state=room({endsAt:Date.now()+1000});let stored={escapeRoomState:state};
  window.__alloFirebase.runTransaction=vi.fn(async(_db,run)=>run({
   get:async()=>({data:()=>stored}),
   update:(_ref,patch)=>{
    const fields=Object.fromEntries(Object.entries(patch).map(([key,value])=>[key.slice('escapeRoomState.'.length),value]));
    stored={...stored,escapeRoomState:{...stored.escapeRoomState,...fields}};
   }
  }));
  await h.writeClock('ref',state,'extend',()=>{throw Error('stale fallback used');});await h.writeClock('ref',state,'extend',()=>null);
  expect(stored.escapeRoomState.endsAt).toBe(Date.now()+601000);await vi.advanceTimersByTimeAsync(2000);
  expect(await h.writeClock('ref',state,'expire',()=>null)).toBeNull();expect(stored.escapeRoomState.isGameOver).not.toBe(true);expect(write).not.toHaveBeenCalled();
 });
 it('uses mailbox conditional writes and a fresh LAN read instead of a Firestore transaction',async()=>{
  const h=api.LiveEscapeRoomInternals,state=room(),fresh={escapeRoomState:{...state,endsAt:Date.now()+600000}};
  window.__alloLessonBoardConditionalUpdate=vi.fn(async(_ref,plan)=>{expect(plan(fresh)['escapeRoomState.timeRemaining']).toBe(900);});
  await h.writeClock({__alloMbRef:'session'},state,'extend',()=>null);expect(window.__alloLessonBoardConditionalUpdate).toHaveBeenCalledTimes(1);
  window.__alloFirebase.runTransaction=vi.fn();window.__alloFirebase.getDoc=vi.fn(async()=>({data:()=>fresh}));
  await h.writeClock({__alloLanRef:'session'},state,'extend',()=>null);expect(window.__alloFirebase.runTransaction).not.toHaveBeenCalled();
  expect(write.mock.calls[0][1]['escapeRoomState.timeRemaining']).toBe(900);
 });
});
