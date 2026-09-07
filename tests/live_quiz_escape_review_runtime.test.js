import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let host, root, api, write;
const t = (key, params) => params?.defaultValue || key;
const q = { id:'p1', type:'mcq', linkedObjectId:'o1', question:'Choose the star', options:['Star','Moon'], correctIndex:0, hint:'A star shines.' };
const room = (patch={}) => ({ isActive:true, isPaused:false, startedAt:100, endsAt:Date.now()+300000, timeRemaining:300, room:{theme:'Observatory',description:'Find the clues.'}, objects:[{id:'o1',name:'Telescope',emoji:'🔭'}], puzzles:[q], teams:{u:'Red'}, teamProgress:{Red:{progressVersion:2,maxLives:3,maxHints:3,solved:{},misses:{},revealedHints:{}}}, ...patch });
const quiz = (patch={}) => ({isActive:true, activityId:'quiz:test', roundId:'r1', currentQuestionIndex:0, phase:'answering', mode:'live-pulse', responses:{}, teams:{}, ...patch});
const content = {type:'quiz',data:{questions:[{type:'mcq', question:'Planet?',options:['Earth','Moon'],correctAnswer:'Earth'},{type:'mcq',question:'Star?',options:['Sun','Moon'],correctAnswer:'Sun'}]}};
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({t}); window.UiLanguageSelector = () => null;
  write=vi.fn(async()=>{});
  window.__alloShared={db:{},warnLog(){}};
  window.__alloFirebase={doc:(_db,...parts)=>parts.join('/'),updateDoc:(...args)=>write(...args)};
  window._fbDoc=window.__alloFirebase.doc; window._fbUpdateDoc=(...args)=>write(...args);
  window.__alloHooks={useFocusTrap(){}};
  loadAlloModule('teacher_module.js');loadAlloModule('ui_modals_module.js');loadAlloModule('quiz_live_aggregators.js');
  api=window.AlloModules;
});
afterEach(async()=>{ if(root) await act(async()=>root.unmount());host?.remove();host=root=null;write.mockReset();write.mockResolvedValue(undefined);delete window.__alloQuizChannelSend;vi.useRealTimers(); });
async function render(Component,props){if(!root){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}await act(async()=>{root.render(React.createElement(Component,props));});}
const studentProps = state => ({sessionData:{escapeRoomState:state},user:{uid:'u'},activeSessionCode:'LIVE',targetAppId:'app',t});
const teacherProps = state => ({sessionData:{escapeRoomState:state},activeSessionCode:'LIVE',appId:'app',t});
const quizProps = state => ({sessionData:{quizState:state,roster:{u:{uid:'u'}},groups:{}},generatedContent:content,user:{uid:'u'},activeSessionCode:'LIVE',targetAppId:'app',appId:'app'});
async function click(selector){const el=typeof selector==='string'?host.querySelector(selector):selector;expect(el).toBeTruthy();await act(async()=>el.click());return el;}
const button = text => [...host.querySelectorAll('button')].find(el=>el.textContent.includes(text));
async function input(el,value){await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}

describe('live escape room behavior',()=>{
 it('rejects wrong matches and duplicate pairs; accepts canonically equivalent answers',()=>{
  const h=api.LiveEscapeRoomInternals;const p={pairs:[{left:'A',right:'1'},{left:'B',right:'2'}]};
  expect(h.answer(p,[{left:'A',right:'2'},{left:'B',right:'1'}],'matching')).toBe(false);
  expect(h.answer(p,[p.pairs[0],p.pairs[0]],'matching')).toBe(false);
  expect(h.answer(p,p.pairs,'matching')).toBe(true);
  expect(h.answer({answer:'café'},' CAFE\u0301 ','cipher')).toBe(true);
 });
 it('combines simultaneous teammates without losing solves or life deductions',()=>{
  const p=api.LiveEscapeRoomInternals.progress({progressVersion:2,maxLives:3,maxHints:3,solved:{a:'p1',b:'p2'},misses:{x:true,y:true},revealedHints:{p1:true}},[q,{id:'p2'}]);
  expect(p).toMatchObject({solvedPuzzles:['p1','p2'],lives:1,wrongAttempts:2,hintsRemaining:2,isEscaped:true});
 });
 it('counts streaks across teammate solves and resets them after a shared miss or hint',()=>{
  const raw={progressVersion:2,maxLives:3,solved:{a:'a',b:'b',c:'c'},solvedAt:{a:100,b:200,c:400},misses:{m:300}};
  expect(api.LiveEscapeRoomInternals.progress(raw,[{id:'a'},{id:'b'},{id:'c'}]).streak).toBe(1);
  expect(api.LiveEscapeRoomInternals.progress({...raw,hintedAt:{c:500}},[]).streak).toBe(0);
 });
 it('restores sequence indices and labels, including duplicate item text',()=>{
  expect(api.LiveEscapeRoomInternals.sequence({items:['same','same','last'],shuffledItems:[1,2,0]})).toEqual([1,2,0]);
  expect(api.LiveEscapeRoomInternals.sequence({items:['same','same','last'],shuffledItems:['same','last','same']})).toEqual([0,2,1]);
 });
 it('uses the deadline after a delayed tab and freezes paused time',()=>{
  expect(api.LiveEscapeRoomInternals.seconds({endsAt:12000},5500)).toBe(7);
  expect(api.LiveEscapeRoomInternals.seconds({endsAt:12000},15000)).toBe(0);
  expect(api.LiveEscapeRoomInternals.seconds({endsAt:12000,isPaused:true,timeRemaining:9},15000)).toBe(9);
 });
 it('keeps hints hidden until saved, and writes a separate solve field',async()=>{
  await render(api.StudentEscapeRoomOverlay,studentProps(room()));await click('[data-help-key="escape_room_object"]');
  expect(host.textContent).not.toContain(q.hint);
  await click('[data-help-key="escape_room_mcq_option"]');
  expect(write).toHaveBeenCalledWith('artifacts/app/public/data/sessions/LIVE',expect.objectContaining({'escapeRoomState.teamProgress.Red.solved.p1':'p1'}));
 });
 it('retains failed answers and prevents duplicate pending submissions',async()=>{
  let reject;write.mockImplementation(()=>new Promise((_,r)=>{reject=r;}));
  await render(api.StudentEscapeRoomOverlay,studentProps(room()));await click('[data-help-key="escape_room_object"]');
  await click('[data-help-key="escape_room_mcq_option"]');await click('[data-help-key="escape_room_mcq_option"]');
  expect(write).toHaveBeenCalledTimes(1);expect(host.querySelector('fieldset').disabled).toBe(true);
  await act(async()=>reject(new Error('offline')));
  expect(host.querySelector('[role="alert"]').textContent).toContain('could not be saved');expect(host.querySelector('[role="dialog"]')).toBeTruthy();
 });
 it('keeps separate puzzle drafts through switching and pause',async()=>{
  const puzzles=[{id:'a',type:'cipher',linkedObjectId:'o1',question:'First',answer:'alpha'},{id:'b',type:'cipher',linkedObjectId:'o2',question:'Second',answer:'beta'}];
  const state=room({puzzles,objects:[{id:'o1',name:'First'},{id:'o2',name:'Second'}]});
  await render(api.StudentEscapeRoomOverlay,studentProps(state));await click('[data-help-key="escape_room_object"]');await input(host.querySelector('input'),'draft alpha');await click('[data-help-key="escape_room_close_btn"]');
  await click(host.querySelectorAll('[data-help-key="escape_room_object"]')[1]);expect(host.querySelector('input').value).toBe('');await click('[data-help-key="escape_room_close_btn"]');
  await click('[data-help-key="escape_room_object"]');expect(host.querySelector('input').value).toBe('draft alpha');
  await render(api.StudentEscapeRoomOverlay,studentProps({...state,isPaused:true}));expect(host.querySelector('[role="dialog"]')).toBeNull();
  await render(api.StudentEscapeRoomOverlay,studentProps(state));expect(host.querySelector('input').value).toBe('draft alpha');
 });
 it('shows timeout without a host write, preserves a winning team, and tolerates unmount state',async()=>{
  const state=room({endsAt:Date.now()-1000});await render(api.StudentEscapeRoomOverlay,studentProps(state));expect(host.textContent).toContain('escape_room.time_up');
  state.teamProgress.Red.solved={p1:'p1'};await render(api.StudentEscapeRoomOverlay,studentProps({...state,isGameOver:true}));expect(host.textContent).toContain('escape_room.class_escaped'.replace('class_escaped','first_escape'));
  await render(api.StudentEscapeRoomOverlay,studentProps({isActive:false}));expect(host.textContent).toBe('');
 });
 it('pauses and ends the actual live session; paused controls show an error on failure',async()=>{
  const state=room();await render(api.EscapeRoomTeacherControls,teacherProps(state));await click(button('escape_room.pause'));
  expect(write.mock.calls[0][0]).toBe('artifacts/app/public/data/sessions/LIVE');expect(write.mock.calls[0][1]).toMatchObject({'escapeRoomState.isPaused':true,'escapeRoomState.endsAt':null});
  await click(button('escape_room.end_game'));await click(host.querySelector('[role="alertdialog"] button:last-child'));
  expect(write.mock.calls.at(-1)[1]).toMatchObject({'escapeRoomState.isActive':false,'escapeRoomState.isGameOver':false});
 });
});

describe('all live quiz modes share reliable round controls',()=>{
 it.each(['live-pulse','boss-battle','team-showdown'])('opens a fresh attempt when %s restarts the same question',async(mode)=>{
  window.__alloQuizChannelSend=vi.fn(()=>true);const state=quiz({mode});await render(api.StudentQuizOverlay,quizProps(state));await click('[data-help-key="quiz_student_answer_option"]');
  expect(window.__alloQuizChannelSend).toHaveBeenCalledWith('boss:0:r1',0);
  await render(api.StudentQuizOverlay,quizProps({...state,roundId:'r2'}));expect(host.querySelector('[data-help-key="quiz_student_answer_option"]').disabled).toBe(false);
  await click('[data-help-key="quiz_student_answer_option"]');expect(window.__alloQuizChannelSend).toHaveBeenLastCalledWith('boss:0:r2',0);
 });
 it('explains participation-only fallback without uploading answer content',async()=>{
  await render(api.StudentQuizOverlay,quizProps(quiz()));await click('[data-help-key="quiz_student_answer_option"]');
  expect(host.textContent).toContain('Participation recorded');const receipt=Object.values(write.mock.calls[0][1])[0];expect(Object.keys(receipt).sort()).toEqual(['activityId','flow','questionIndex','submittedAt']);
 });
 it('retries the retained answer through P2P when a connection returns',async()=>{
  await render(api.StudentQuizOverlay,quizProps(quiz()));await click('[data-help-key="quiz_student_answer_option"]');
  window.__alloQuizChannelSend=vi.fn(()=>true);await click(button('Retry sending answer'));
  expect(window.__alloQuizChannelSend).toHaveBeenCalledWith('boss:0:r1',0);expect(host.textContent).not.toContain('Participation recorded');
 });
 it('ignores an older round failure after a new answer was sent',async()=>{
  let reject;write.mockImplementationOnce(()=>new Promise((_,r)=>{reject=r;}));const state=quiz();await render(api.StudentQuizOverlay,quizProps(state));await click('[data-help-key="quiz_student_answer_option"]');
  await render(api.StudentQuizOverlay,quizProps({...state,roundId:'r2'}));window.__alloQuizChannelSend=()=>true;await click('[data-help-key="quiz_student_answer_option"]');await act(async()=>reject(new Error('old failure')));
  expect(host.querySelector('[data-help-key="quiz_student_answer_option"]').disabled).toBe(true);expect(host.textContent).not.toContain('errors.quiz_submit_failed');
 });
 it('explains the idle state and disables submission until the host starts',async()=>{
  await render(api.StudentQuizOverlay,quizProps(quiz({phase:'idle'})));expect(host.textContent).toContain('Waiting for your teacher');expect(host.querySelector('[data-help-key="quiz_student_answer_option"]').disabled).toBe(true);
 });
 it('locks destructive navigation and mode changes while answers are open',async()=>{
  await render(api.TeacherLiveQuizControls,quizProps(quiz()));expect(host.querySelector('[data-help-key="quiz_next_question_btn"]').disabled).toBe(true);expect(host.querySelector('[data-help-key="quiz_mode_select"]').disabled).toBe(true);
  expect(host.textContent).toContain('Reveal results before');
 });
 it('renders the student boss image without a host-only style constant',async()=>{
  await render(api.StudentQuizOverlay,quizProps(quiz({mode:'boss-battle',bossStats:{image:'keeper.png',maxHP:20,currentHP:20,classHP:100,classMaxHP:100,name:'Keeper'}})));
  expect(host.querySelector('img').style.imageRendering).toBe('pixelated');
 });
 it('applies each pre-round boss difficulty selection to the actual health pool',async()=>{
  const state=quiz({phase:'idle',mode:'boss-battle',bossStats:{difficulty:'normal',maxHP:20,currentHP:20,classHP:100,classMaxHP:100,name:'Keeper',image:'keeper.png',battleLog:[]}});
  await render(api.TeacherLiveQuizControls,quizProps(state));
  const select=[...host.querySelectorAll('select')].find(el=>[...el.options].some(option=>option.value==='hard'));
  for(const value of ['easy','hard'])await act(async()=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls.map(call=>call[1]['quizState.bossStats'].maxHP)).toEqual([10,30]);
 });
 it('displays failed host updates and permits a retry',async()=>{
  write.mockRejectedValueOnce(new Error('offline'));await render(api.TeacherLiveQuizControls,quizProps(quiz({phase:'idle'})));await click('[data-help-key="quiz_start_question_btn"]');expect(host.querySelector('[role="alert"]').textContent).toContain('could not be updated');
  await click('[data-help-key="quiz_start_question_btn"]');expect(write).toHaveBeenCalledTimes(2);expect(write.mock.calls[1][1]['quizState.roundId']).toBeTruthy();
 });
});
