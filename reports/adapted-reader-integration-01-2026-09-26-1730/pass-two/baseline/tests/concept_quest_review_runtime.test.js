import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url),engine=require('../concept_quest_engine.js');
const React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const question={question:'What helps plants grow?',options:['Water','Stone'],correctAnswer:'Water',concept:'Plant needs'};
const quest=()=>engine.createSession({title:'The Plant Expedition',questions:[question]});
const encounter=()=>engine.resolveTravel(quest(),{},'room-2').quest;
const action=(q,patch={})=>({abilityId:'analyze',roleId:'analyst',answerIndex:engine.getRoom(q,q.currentRoomId).challenge.correctIndex,submittedAt:100,turnKey:engine.getTurnKey(q),...patch});
const actFor=(q,values={})=>Object.fromEntries(Object.entries(values).map(([uid,patch])=>[uid,action(q,patch)]));

describe('Concept Quest progression and teaching correctness',()=>{
 it('resolves letter and numeric keys without grading an unscored opinion',()=>{
  expect(engine.questionAnswerIndex({options:['Earth','Mars'],correctAnswer:'B'})).toBe(1);
  expect(engine.questionAnswerIndex({options:['Earth','Mars'],correctAnswer:'1'})).toBe(1);
  expect(engine.questionAnswerIndex({type:'opinion-mcq',options:['Yes','No'],correctAnswer:0})).toBe(-1);
  expect(engine.questionAnswerIndex({options:['Earth','Mars']})).toBe(-1);
  const q=engine.createSession({questions:[question,{type:'likert',options:['1','2'],correctIndex:0}]});expect(q.excludedQuestions).toBe(1);
  expect(()=>engine.createSession({questions:[]})).toThrow(/valid answer key/);
 });
 it.each([1,2])('finishes the entire map with only %i distinct concepts',count=>{
  let q=engine.createSession({questions:Array.from({length:count},(_,i)=>({...question,concept:'Concept '+i}))});
  expect(engine.requiredSigils(q)).toBe(count);
  for(let room=2;room<=8;room++){
   const travel=engine.resolveTravel(q,{},'room-'+room);expect(travel.error).toBeUndefined();q=travel.quest;
   for(let round=0;q.phase==='battle'&&round<20;round++)q=engine.resolveBattle(q,actFor(q,{u:{},v:{abilityId:'explain',roleId:'explainer'},w:{abilityId:'connect',roleId:'connector'}})).quest;
   expect(q.phase).not.toBe('battle');
  }
  expect(q.phase).toBe('complete');expect(engine.createDebrief(q).accuracy).toBe(100);
 });
 it('rejects malformed, coerced, missing, and stale actions without counting them as wrong',()=>{
  const q=encounter();const result=engine.resolveBattle(q,{valid:action(q),nullAnswer:action(q,{answerIndex:null}),stringAnswer:action(q,{answerIndex:'0'}),unknown:action(q,{abilityId:'bad'}),stale:action(q,{turnKey:'old'}),missing:{abilityId:'analyze',answerIndex:0}});
  expect(result.summary).toMatchObject({total:1,correct:1});
  expect(engine.resolveBattle(q,{stale:action(q,{turnKey:'old'})}).error).toContain('student action');
 });
 it('separates restarted quests and credits the concept actually answered',()=>{
  const old=encounter(),fresh=encounter();expect(engine.getTurnKey(old)).not.toBe(engine.getTurnKey(fresh));expect(engine.currentActions(fresh,{u:action(old)})).toEqual({});
  let q=engine.resolveTravel(engine.createSession({questions:[question,{...question,concept:'Evidence',question:'Which claim has evidence?'}]}),{},'room-2').quest;
  q=engine.resolveBattle(q,{u:action(q)}).quest;q=engine.resolveBattle(q,{u:action(q)}).quest;
  expect(q.roundHistory.map(round=>round.concept)).toEqual(['Evidence','Plant needs']);
  expect(engine.createDebrief(q).conceptBreakdown).toHaveLength(2);
 });
 it('retains a treasure reward when shared inventory is full',()=>{
  const q=encounter();q.currentRoomId='room-3';q.phase='explore';q.inventory=Array.from({length:12},(_,i)=>({id:'item-'+i}));
  const result=engine.resolveTravel(q,{},'room-4');expect(result.error).toContain('full');expect(engine.getRoom(result.quest,'room-4').reward).toBeTruthy();expect(result.quest.currentRoomId).toBe('room-3');
 });
 it('uses the role committed with the action even if the live role map changes',()=>{
  const q=encounter();expect(engine.resolveBattle(q,{u:action(q)},{u:'connector'}).summary.synergyCount).toBe(1);
 });
 it('resumes the current enemy after rally or a healing item',()=>{
  const q=encounter();q.phase='defeat';q.party.hp=0;
  const rallied=engine.adjustEncounter(q,'heal',3).quest;expect(rallied.phase).toBe('battle');expect(rallied.party.hp).toBe(3);expect(rallied.turnKey).not.toBe(q.turnKey);
  q.inventory=[{id:'tonic',name:'Tonic',effect:{type:'heal',amount:2}}];const used=engine.useItem(q,0).quest;expect(used.phase).toBe('battle');expect(used.party.hp).toBe(2);expect(used.inventory).toHaveLength(0);
 });
 it('awards items without applying them and consumes their effect exactly once',()=>{
  const q=encounter();q.party.hp=5;const awarded=engine.publishGmDraft(q,{type:'item',title:'Tonic',item:{effect:{type:'heal',amount:3}}});
  expect(awarded.party.hp).toBe(5);expect(awarded.inventory).toHaveLength(1);const used=engine.useItem(awarded,0).quest;expect(used.party.hp).toBe(8);expect(engine.useItem(used,0).error).toBeTruthy();
 });
 it('keeps an item when it cannot help and rejects a full inventory without dropping old items',()=>{
  const q=quest();q.inventory=[{id:'tonic',effect:{type:'heal',amount:3}}];expect(engine.useItem(q,0).error).toContain('Save this item');expect(q.inventory).toHaveLength(1);
  q.inventory=Array.from({length:12},(_,i)=>({id:'item-'+i}));expect(()=>engine.publishGmDraft(q,{type:'item'})).toThrow(/inventory is full/);expect(q.inventory[0].id).toBe('item-0');
 });
 it('keeps a teacher-authored challenge after resolving its first round',()=>{
  const q=engine.publishGmDraft(encounter(),{type:'challenge',challenge:{prompt:'New evidence?',options:['Measure','Guess'],correctIndex:0,explanation:'Measurements are evidence.'}});
  const result=engine.resolveBattle(q,{u:action(q,{roleId:''})});expect(engine.getRoom(result.quest,q.currentRoomId).challenge.prompt).toBe('New evidence?');expect(result.quest.lastRound.prompt).toBe('New evidence?');
 });
 it('does not let pacing adjustments skip the learning check or reopen defeated enemies',()=>{
  const q=encounter();engine.getRoom(q,q.currentRoomId).enemy.hp=2;const softened=engine.adjustEncounter(q,'enemy',-3).quest;expect(engine.getRoom(softened,softened.currentRoomId).enemy.hp).toBe(1);expect(softened.phase).toBe('battle');
  q.phase='explore';engine.getRoom(q,q.currentRoomId).enemy.hp=0;expect(engine.adjustEncounter(q,'enemy',3).error).toBeTruthy();
 });
 it('invalidates GM undo after student learning progress, preserving XP and evidence',()=>{
  const q=engine.adjustEncounter(encounter(),'shield',2).quest;const learned=engine.resolveBattle(q,{u:action(q)}).quest;expect(learned.gmHistory).toHaveLength(0);expect(engine.undoLastGmChange(learned).error).toBeTruthy();expect(learned.party.xp).toBe(5);expect(learned.roundHistory).toHaveLength(1);
 });
 it('validates GM answer keys and keeps enemy HP consistent with its maximum',()=>{
  expect(()=>engine.normalizeGmDraft({type:'challenge',challenge:{options:['A','B']}})).toThrow(/correct answer/);
  const draft=engine.normalizeGmDraft({type:'enemy',enemy:{hp:16,maxHp:4},challenge:{options:['A','B'],correctIndex:1}});expect(draft.enemy.hp).toBeLessThanOrEqual(draft.enemy.maxHp);
 });
 it('filters late votes, unavailable rooms, and locked boss choices',()=>{
  const q=quest(),key=engine.getTurnKey(q);expect(engine.currentVotes(q,{u:'room-2',v:'room-8',w:'room-2'},{u:key,v:key,w:'old'})).toEqual({u:'room-2'});
  expect(engine.tallyVotes({},['room-1','room-2'])).toBeNull();
 });
});

let api,write,host,root;
const t=key=>key;
beforeAll(()=>{
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t});write=vi.fn(async()=>{});window.__alloShared={db:{},warnLog(){}};window.__alloFirebase={doc:(_db,...parts)=>parts.join('/'),updateDoc:(...args)=>write(...args)};window.__alloHooks={useFocusTrap(){}};
 loadAlloModule('concept_quest_engine.js');loadAlloModule('teacher_module.js');loadAlloModule('concept_quest_teacher_module.js');api=window.AlloModules;
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;write?.mockReset();write?.mockResolvedValue(undefined);});
const session=q=>({escapeRoomState:{isActive:true,mode:'concept-quest',isPaused:false,conceptQuest:q,teams:{u:'All'},teamProgress:{All:{questVotes:{},questVoteTurns:{},questActions:{},questRoles:{u:'analyst'}}}},roster:{u:{name:'You'},v:{name:'Teammate'}},groups:{}});
async function mount(q,teacher=false,patch={}){if(!host){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}const props={sessionData:session(q),user:{uid:'u'},activeSessionCode:'QUEST',targetAppId:'app',appId:'app',t,...patch};await act(async()=>root.render(React.createElement(teacher?api.ConceptQuestTeacherControls:api.StudentEscapeRoomOverlay,props)));return props;}
const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.trim()===text||b.textContent.includes(text));
async function click(el){expect(el).toBeTruthy();await act(async()=>el.click());}
async function change(el,value){expect(el).toBeTruthy();await act(async()=>{const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
const field=label=>[...host.querySelectorAll('label')].find(l=>l.textContent.startsWith(label))?.querySelector('input,textarea,select');

describe('Concept Quest teacher/student interaction',()=>{
 it('restores a committed answer and ability after remount and includes roster peers without uid fields',async()=>{
  const q=encounter(),data=session(q);data.escapeRoomState.teamProgress.All.questActions.u=action(q,{abilityId:'explain',answerIndex:1});await mount(q,false,{sessionData:data});expect(host.querySelectorAll('input[type="radio"]')[1].checked).toBe(true);expect(button('Commit turn').closest('fieldset').disabled).toBe(true);expect(host.textContent).toContain('Teammate');expect(button('💡 Explain').getAttribute('aria-pressed')).toBe('true');
 });
 it('shows a saved local commit while waiting for the session echo, then unlocks the next turn',async()=>{
  const q=encounter();await mount(q);await click(host.querySelector('input[type="radio"]'));await click(button('Commit turn'));expect(write.mock.calls[0][1]['escapeRoomState.teamProgress.All.questActions.u'].turnKey).toBe(engine.getTurnKey(q));expect(button('Commit turn').closest('fieldset').disabled).toBe(true);
  const next=engine.resolveBattle(q,{u:action(q,{roleId:''})}).quest;await mount(next);expect(button('Commit turn').closest('fieldset').disabled).toBe(false);expect([...host.querySelectorAll('input[type="radio"]')].some(el=>el.checked)).toBe(false);
 });
 it('keeps an answer on failed save and permits retry',async()=>{
  write.mockRejectedValueOnce(new Error('offline'));const q=encounter();await mount(q);await click(host.querySelector('input[type="radio"]'));await click(button('Commit turn'));expect(host.querySelector('[role="alert"]').textContent).toContain('could not be saved');expect(host.querySelector('input[type="radio"]').checked).toBe(true);await click(button('Commit turn'));expect(write).toHaveBeenCalledTimes(2);
 });
 it('disables all game choices during pause and restores focus to the encounter',async()=>{
  const q=encounter(),data=session(q);data.escapeRoomState.isPaused=true;await mount(q,false,{sessionData:data});expect(document.activeElement.textContent).toContain('Quest paused');expect(button('Evidence Analyst').disabled).toBe(true);expect(button('Commit turn').closest('fieldset').disabled).toBe(true);data.escapeRoomState.isPaused=false;await mount(q,false,{sessionData:data});expect(document.activeElement.tagName).toBe('H3');
 });
 it('saves votes with the matching turn identity',async()=>{
  const q=quest();await mount(q);await click([...host.querySelectorAll('button')].find(el=>!el.disabled&&el.getAttribute('aria-label')?.includes('battle')));expect(write.mock.calls[0][1]).toMatchObject({'escapeRoomState.teamProgress.All.questVotes.u':'room-2','escapeRoomState.teamProgress.All.questVoteTurns.u':engine.getTurnKey(q)});
 });
 it('edits the real GM question, options and key before publishing',async()=>{
  const q=encounter();await mount(q,true);await change(field('Type'),'challenge');await click(button('Manual draft'));expect(host.querySelector('h5')).toBe(document.activeElement);await change(field('Question'),'What counts as evidence?');await change(host.querySelector('[aria-label="Choice 1"]'),'Measurement');await change(host.querySelector('[aria-label="Choice 2"]'),'Guess');await click(host.querySelector('[aria-label="Correct answer: choice 2"]'));await click(button('Publish to class'));
  const patch=write.mock.calls[0][1],saved=patch['escapeRoomState.conceptQuest'];expect(engine.getRoom(saved,saved.currentRoomId).challenge).toMatchObject({prompt:'What counts as evidence?',options:['Measurement','Guess'],correctIndex:1});expect(patch['escapeRoomState.teamProgress.All.questActions']).toEqual({});expect(patch['escapeRoomState.teamProgress.All.isEscaped']).toBe(false);
 });
 it('keeps a stale GM draft for review and prevents publishing into a new turn accidentally',async()=>{
  const q=encounter();await mount(q,true);await click(button('Manual draft'));const next=engine.resolveBattle(q,{u:action(q)}).quest;await mount(next,true);expect(button('Publish to class').disabled).toBe(true);await click(button('Use in this encounter'));expect(button('Publish to class').disabled).toBe(false);
 });
 it('excludes delayed actions from the teacher resolution count',async()=>{
  const q=encounter(),data=session(q);data.escapeRoomState.teamProgress.All.questActions={u:action(q,{turnKey:'old'})};await mount(q,true,{sessionData:data});expect(button('Resolve 0 actions').disabled).toBe(true);
 });
 it('closes safely through a named end dialog and reports failure inside the dialog',async()=>{
  const q=quest();await mount(q,true);await click(button('End quest'));expect(host.querySelector('[role="alertdialog"]')).toBeTruthy();expect(document.activeElement.textContent).toBe('Keep playing');write.mockRejectedValueOnce(new Error('offline'));await click([...host.querySelectorAll('[role="alertdialog"] button')].at(-1));expect(host.querySelector('[role="alertdialog"] [role="alert"]').textContent).toContain('could not sync');await click(button('Keep playing'));expect(host.querySelector('[role="alertdialog"]')).toBeNull();
 });
});


describe('Concept Quest Class Mailbox transport',()=>{
 const context={};require('node:vm').runInNewContext(require('node:fs').readFileSync('apps_script/session_mailbox/Code.gs','utf8'),context);
 const base='escapeRoomState.teamProgress.All.';
 const state=phase=>({escapeRoomState:{mode:'concept-quest',isActive:true,isPaused:false,conceptQuest:{actionSchema:1,turnKey:'quest-one:2:room-2:abc',phase}}});
 const response={abilityId:'analyze',roleId:'analyst',answerIndex:0,submittedAt:100,turnKey:'quest-one:2:room-2:abc'};
 const allowed=(patch,data)=>context.participantCanPatchSession(patch,'u',data);
 it('accepts a current action and rejects stale, paused, ended, or cross-participant writes',()=>{
  const data=state('battle'),patch={[base+'questActions.u']:response};expect(allowed(patch,data)).toBe(true);
  expect(allowed({[base+'questActions.u']:{...response,turnKey:'old'}},data)).toBe(false);
  expect(allowed({[base+'questActions.v']:response},data)).toBe(false);
  data.escapeRoomState.isPaused=true;expect(allowed(patch,data)).toBe(false);
  data.escapeRoomState.isPaused=false;data.escapeRoomState.isActive=false;expect(allowed(patch,data)).toBe(false);
 });
 it('requires current vote metadata and rejects parent-map bypasses',()=>{
  const data=state('explore'),patch={[base+'questVotes.u']:'room-3',[base+'questVoteTurns.u']:data.escapeRoomState.conceptQuest.turnKey};expect(allowed(patch,data)).toBe(true);
  expect(allowed({[base+'questVotes.u']:'room-3'},data)).toBe(false);
  expect(allowed({...patch,[base+'questVoteTurns.u']:'old'},data)).toBe(false);
  expect(allowed({'escapeRoomState.teamProgress':{All:{questActions:{v:response}}}},data)).toBe(false);
  data.escapeRoomState.isPaused=true;expect(allowed(patch,data)).toBe(false);
 });
 it('retains legacy quest actions and classic escape progress',()=>{
  const old=state('battle');delete old.escapeRoomState.conceptQuest.actionSchema;const legacy={...response};delete legacy.turnKey;
  expect(allowed({[base+'questActions.u']:legacy},old)).toBe(true);
  expect(allowed({'escapeRoomState.teamProgress.Red.currentRoom':2},{escapeRoomState:{mode:'escape-room'}})).toBe(true);
 });
});
