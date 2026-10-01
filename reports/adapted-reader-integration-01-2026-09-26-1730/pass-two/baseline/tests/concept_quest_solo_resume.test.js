import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const resource={id:'resume-assessment',type:'quiz',title:'Plant expedition',data:{questions:[{type:'short-answer',question:'Explain how roots help a plant.',expectedAnswer:'Roots absorb water from the soil.',concept:'Plant needs'},{type:'mcq',question:'Which part collects light?',options:['Leaves','Roots'],correctAnswer:'Leaves',concept:'Photosynthesis'}]}};
const defaults={generatedContent:resource,inputText:'Observe the plant carefully, compare evidence, and explain what its structures do.',user:{uid:'learner-a'},appId:'school-a',t:key=>key,onClose:vi.fn()};
let host,root,api;
const context=(patch={})=>({generatedContent:resource,userId:'learner-a',appId:'school-a',...patch});
const button=text=>[...host.querySelectorAll('button')].find(node=>node.textContent===text);
const click=async node=>{expect(node).toBeTruthy();await act(async()=>node.click());};
const change=async(node,value)=>{expect(node).toBeTruthy();await act(async()=>{const proto=node.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:node.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);node.dispatchEvent(new window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
const mount=async(patch={})=>{if(!root){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(api.ConceptQuestSolo,{...defaults,...patch})));};
const unmount=async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;};
const startWritten=async()=>{await mount();await click(button('Start solo adventure'));await click(host.querySelector('[data-solo-travel="room-2"]'));expect(host.querySelector('[data-solo-question-type="short-answer"]')).toBeTruthy();};
const question=()=>host.querySelector('[data-solo-question-type]');
beforeAll(()=>{window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;loadAlloModule('concept_quest_solo_module.js');api=window.AlloModules;});
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.useFakeTimers();});
afterEach(async()=>{await unmount();vi.restoreAllMocks();vi.useRealTimers();localStorage.clear();sessionStorage.clear();});
describe('Solo adventure save and resume integration',()=>{
 it('closes and reopens at the same encounter with response, guide, ability, and GM conversation intact',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'Roots take up water and help the plant stay in place.');await click(button('Compare with answer guide'));await change(question().querySelector('select'),'needs-practice');
  const connect=[...host.querySelectorAll('button')].find(node=>node.textContent.startsWith('🔗 Connect'));await click(connect);
  const gm=host.querySelector('[data-concept-quest-solo-gm]');await change(gm.querySelector('select'),'talk');await change(gm.querySelector('textarea'),'What should I look for in these notes?');await click(button('Send to game master'));
  const sessionBefore=api.ConceptQuestSoloStorage.read(localStorage,context()).snapshot.quest.sessionId;
  await click(button('Back to Assess'));expect(defaults.onClose).toHaveBeenCalled();await unmount();await mount();
  expect(host.querySelector('[data-solo-resume]')).toBeTruthy();expect(question()).toBeNull();await click(button('Resume adventure'));
  expect(question().querySelector('textarea').value).toContain('Roots take up water');expect(question().querySelector('select').value).toBe('needs-practice');expect(question().textContent).toContain('Answer guide');expect(question().textContent).toContain('Roots absorb water from the soil.');
  expect([...host.querySelectorAll('button')].find(node=>node.textContent.startsWith('🔗 Connect')).getAttribute('aria-pressed')).toBe('true');
  const saved=api.ConceptQuestSoloStorage.read(localStorage,context());expect(saved.snapshot.quest.sessionId).toBe(sessionBefore);expect(saved.snapshot.gmState.history.some(entry=>entry.role==='player'&&entry.text==='What should I look for in these notes?')).toBe(true);
 });
 it('resumes a completed written checkpoint with self-review recorded and no automatic score',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'Roots absorb water.');await click(button('Compare with answer guide'));await change(question().querySelector('select'),'needs-practice');await click(button('3. Record self-review and continue'));await unmount();
  const saved=api.ConceptQuestSoloStorage.read(localStorage,context());expect(saved.status).toBe('saved');expect(saved.snapshot.quest.solo.history[0]).toMatchObject({status:'self-reviewed',correct:null,score:null,maxScore:null,selfReview:'needs-practice'});expect(saved.snapshot.quest.party.xp).toBe(0);await mount();await click(button('Resume adventure'));expect(host.textContent).toContain('Self-review recorded');expect(host.textContent).toContain('Added to your ideas for more practice.');
 });
 it('flushes the final committed response on unmount before the autosave delay elapses',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'This final draft has not reached the autosave timer.');
  await unmount();const restored=api.ConceptQuestSoloStorage.read(localStorage,context());expect(restored.status).toBe('saved');expect(restored.snapshot.response.text).toContain('final draft');await mount();await click(button('Resume adventure'));expect(question().querySelector('textarea').value).toContain('final draft');
 });
 it('flushes a departing learner without sharing their active run with the next account',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'Private draft for learner A.');await mount({user:{uid:'learner-b'}});
  expect(button('Start solo adventure')).toBeTruthy();expect(host.querySelector('[data-solo-resume]')).toBeNull();expect(api.ConceptQuestSoloStorage.read(localStorage,context()).snapshot.response.text).toBe('Private draft for learner A.');expect(api.ConceptQuestSoloStorage.read(localStorage,context({userId:'learner-b'})).status).toBe('empty');
 });
 it('saves the old resource draft before showing changed-source recovery instead of resuming stale content',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'A draft from the original source.');
  const changed={...resource,data:{questions:[{...resource.data.questions[0],modelAnswer:'A revised answer guide.'}]}};await mount({generatedContent:changed});
  expect(host.textContent).toContain('assessment changed');expect(button('Resume adventure')).toBeUndefined();expect(api.ConceptQuestSoloStorage.read(localStorage,context()).snapshot.response.text).toBe('A draft from the original source.');
  await click(button('Start solo adventure'));expect(api.ConceptQuestSoloStorage.read(localStorage,context({generatedContent:changed})).status).toBe('saved');
 });
 it('stops autosaving after another tab changes the run and loads its latest response explicitly',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'Local draft.');await act(async()=>vi.advanceTimersByTime(301));
  const current=api.ConceptQuestSoloStorage.read(localStorage,context());const external=api.ConceptQuestSoloStorage.save(localStorage,{...context(),expectedRevision:current.revision},{...current.snapshot,response:{text:'A newer draft from another tab.'}});expect(external.status).toBe('saved');
  await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key:api.ConceptQuestSoloStorage.keyFor(context())})));
  expect(host.textContent).toContain('Another tab changed');await change(question().querySelector('textarea'),'Unsaved local edit after conflict.');await act(async()=>vi.advanceTimersByTime(301));
  expect(api.ConceptQuestSoloStorage.read(localStorage,context()).snapshot.response.text).toBe('A newer draft from another tab.');await click(button('Load saved progress instead'));expect(question().querySelector('textarea').value).toBe('A newer draft from another tab.');
 });
 it('replaces the other tab only after the explicit keep-current action',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'Keep this local response.');const current=api.ConceptQuestSoloStorage.read(localStorage,context());api.ConceptQuestSoloStorage.save(localStorage,{...context(),expectedRevision:current.revision},{...current.snapshot,response:{text:'Other tab response.'}});
  await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key:api.ConceptQuestSoloStorage.keyFor(context())})));
  await click(button('Save this adventure instead'));expect(api.ConceptQuestSoloStorage.read(localStorage,context()).snapshot.response.text).toBe('Keep this local response.');expect(host.querySelector('[data-solo-save-status]').textContent).toContain('saved on this device');
 });
 it('offers accurate quota recovery while keeping the adventure playable',async()=>{
  const denied=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});await startWritten();await change(question().querySelector('textarea'),'Keep playing with this draft.');await act(async()=>vi.advanceTimersByTime(301));expect(host.querySelector('[data-solo-save-status]').textContent).toContain('could not be saved');expect(button('Retry saving')).toBeTruthy();denied.mockRestore();await click(button('Retry saving'));expect(api.ConceptQuestSoloStorage.read(localStorage,context()).snapshot.response.text).toBe('Keep playing with this draft.');
 });
 it('preserves the newer tab save when a conflicted adventure unmounts',async()=>{
  await startWritten();await change(question().querySelector('textarea'),'Local draft before conflict.');const current=api.ConceptQuestSoloStorage.read(localStorage,context());api.ConceptQuestSoloStorage.save(localStorage,{...context(),expectedRevision:current.revision},{...current.snapshot,response:{text:'Protected other-tab draft.'}});
  await act(async()=>window.dispatchEvent(new StorageEvent('storage',{key:api.ConceptQuestSoloStorage.keyFor(context())})));await unmount();expect(api.ConceptQuestSoloStorage.read(localStorage,context()).snapshot.response.text).toBe('Protected other-tab draft.');
 });
 function finishAdventure(content,missFirstIndices=[]) {
  const solo=api.ConceptQuestSoloEngine,base=api.ConceptQuestEngine;
  let quest=solo.createSession(base,content,(_key,fallback)=>fallback);
  for(let room=2;room<=8;room++) {
   const move=solo.travel(base,quest,'room-'+room);expect(move.error).toBeUndefined();quest=move.quest;
   for(let turns=0;quest.phase==='battle'&&turns<content.data.questions.length+20;turns++) {
    const item=solo.currentItem(quest),first=!quest.solo.attempts[item.sourceIndex];
    const response=item.selfReviewRequired?{text:'My explanation for '+item.sourceIndex,guideRevealed:true,selfReview:item.sourceIndex%4===1?'needs-practice':'understood'}:{answerIndex:first&&missFirstIndices.includes(item.sourceIndex)?1:0};
    const result=solo.resolveTurn(base,quest,{roleId:'analyst',abilityId:'analyze',response});expect(result.error).toBeUndefined();quest=result.quest;
   }
   expect(quest.phase).not.toBe('battle');expect(quest.phase).not.toBe('defeat');
  }
  expect(quest.phase).toBe('complete');return quest;
 }
 function saveCompleted(content,quest) {
  const saved=api.ConceptQuestSoloStorage.save(localStorage,context({generatedContent:content}),{quest,roleId:'analyst',abilityId:'analyze',response:{},recapOpen:false,gmState:null,aiEnabled:false});
  expect(saved.status).toBe('saved');return saved;
 }
 it('restores all 101 mixed-item debrief rows with guides and distinct first-versus-latest accuracy',async()=>{
  const questions=Array.from({length:101},(_,index)=>index%2?{type:'short-answer',question:'Written prompt '+index,expectedAnswer:'Written guide '+index,concept:'Concept '+(index%3)}:{type:'mcq',question:'Scored prompt '+index,options:['Expected answer '+index,'Distractor '+index],correctIndex:0,explanation:'Authored explanation '+index,concept:'Concept '+(index%3)});
  const content={...resource,id:'mixed-terminal-101',data:{questions}},quest=finishAdventure(content,[0,100]),progress=api.ConceptQuestSoloEngine.coverage(quest);
  expect(progress.attempted).toBe(101);expect(progress.graded).toBe(51);expect(progress.selfReviewed).toBe(50);expect(progress.accuracy).toBe(98);expect(progress.firstAttemptAccuracy).toBe(96);
  saveCompleted(content,quest);await mount({generatedContent:content});await click(button('Resume adventure'));
  const panel=host.querySelector('[data-solo-debrief-items]'),rows=panel.querySelectorAll(':scope > ol > li');expect(panel.querySelector(':scope > summary').textContent).toBe('Review all 101 assessment items');expect(rows).toHaveLength(101);
  rows.forEach((row,index)=>{expect(row.textContent).toContain((index%2?'Written prompt ':'Scored prompt ')+index);expect(row.textContent).toContain((index%2?'Written guide ':'Expected answer ')+index);if(index%2){expect(row.textContent).toContain(index%4===1?'Self-reviewed: more practice requested':'Self-reviewed: key ideas understood');expect(row.textContent).not.toContain('Correct on the most recent attempt');}else{expect(row.textContent).toContain('Authored explanation '+index);expect(row.textContent).toContain(index===100?'Review this idea again':'Correct on the most recent attempt');}});
  expect(host.textContent).toContain('98% correct on automatically scored responses.');expect(host.textContent).toContain('96% correct on first attempts.');expect(host.textContent).toContain('50 items were self-reviewed and excluded from that score.');expect(rows[100].textContent).toContain('Expected answer 100');
 });
 it('restores a written-only terminal debrief without inventing an automatic accuracy percentage',async()=>{
  const content={...resource,id:'written-terminal',data:{questions:Array.from({length:3},(_,index)=>({type:'self-explanation',question:'Explain idea '+index,rubric:'Written-only guide '+index,concept:'Idea '+index}))}},quest=finishAdventure(content);
  expect(api.ConceptQuestSoloEngine.coverage(quest).accuracy).toBeNull();saveCompleted(content,quest);await mount({generatedContent:content});await click(button('Resume adventure'));
  const rows=host.querySelectorAll('[data-solo-debrief-items] > ol > li');expect(rows).toHaveLength(3);rows.forEach((row,index)=>{expect(row.textContent).toContain('Written-only guide '+index);expect(row.textContent).toContain('Self-reviewed:');expect(row.textContent).not.toContain('Correct on the most recent attempt');});
  expect(host.textContent).toContain('No automatic accuracy score was assigned.');expect(host.textContent).toContain('3 items were self-reviewed and excluded from that score.');expect(host.textContent).not.toMatch(/\d+% correct/);
 });

});
