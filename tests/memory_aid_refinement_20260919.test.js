import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
let React,DOM,act,H,rules,S,root,host,render,resource,lockDescriptor;
const question='What happens to the shape and volume of a solid when its container changes?';
const card=(extra={})=>({id:'solid',target:'A solid keeps its shape',type:'keyword-association',mode:'generated',essentialFacts:['A solid keeps its shape.','A solid has a definite volume.'],factLocked:true,factVerified:true,aiExample:'A solid statue stays in shape.',mapping:'A statue holds its shape and takes up space.',connections:[{cue:'statue',factIndex:0,explanation:'It stays the same shape.'},{cue:'space',factIndex:1,explanation:'Its volume stays the same.'}],recallQuestion:question,applicationQuestion:'A wooden block moves from a tall jar to a wide bowl. What changes?',applicationGuidance:'The block retains its shape and volume.',visualStatus:'off',...extra});
const data=(cards=[card()])=>({schemaVersion:2,title:'Solids keep shape and volume',cards});
const completed=(c=card(),extra={})=>H.normalizeMemoryAidPracticeAttempt({...H.createMemoryAidPracticeAttempt(c,{response:'Shape and volume.',supportMode:'none'}),factChecks:['recalled','recalled'],...extra},c,0);
const saved=()=>H.loadMemoryAidPrivatePractice('resource:refinement',resource.data.cards,'refinement-learner');
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));DOM=require(resolve('desktop/web-app/node_modules/react-dom/client'));act=React.act;global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 for(const f of ['image_asset_editor_module.js','memory_aid_module.js','studio_response_module.js','doc_pipeline_module.js'])loadAlloModule(f);
 H=window.AlloModules.MemoryAid._testing;rules=window.AlloModules.MemoryAid.exportRules;S=window.AlloModules.StudioResponse;
});
beforeEach(()=>{lockDescriptor=Object.getOwnPropertyDescriptor(navigator,'locks');Object.defineProperty(navigator,'locks',{configurable:true,value:{request:vi.fn((name,opts,cb)=>cb())}});});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;window.localStorage.clear();window.sessionStorage.clear();vi.restoreAllMocks();if(lockDescriptor)Object.defineProperty(navigator,'locks',lockDescriptor);else delete navigator.locks;});
const visible=node=>node&&!node.closest('[hidden]');
const button=name=>[...host.querySelectorAll('button')].find(node=>visible(node)&&node.textContent===name);
async function click(name){expect(button(name),'Button '+name).toBeTruthy();await act(async()=>button(name).click());}
async function input(el,value){expect(el).toBeTruthy();const proto=el.tagName==='SELECT'?window.HTMLSelectElement.prototype:el.tagName==='INPUT'?window.HTMLInputElement.prototype:window.HTMLTextAreaElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
async function mount(cards=[card()],props={}){
 resource={id:'refinement',type:'memory-aid',data:data(cards)};host=document.createElement('div');document.body.append(host);root=DOM.createRoot(host);
 let settings=props;
 function App(){const [current,setCurrent]=React.useState(resource);return React.createElement(window.AlloModules.MemoryAidView,{generatedContent:current,isTeacherMode:false,isProcessing:false,activeProfileId:'refinement-learner',addToast:()=>{},handleNoteUpdate:(field,value)=>setCurrent(old=>{const next={...old,data:{...old.data,[field]:typeof value==='function'?value(old.data[field]):value}};resource=next;return next;}),...settings});}
 render=async(extra={})=>{settings={...settings,...extra};await act(async()=>root.render(React.createElement(App)));};await render();
}
async function finish(){await click('Start recall practice');await input(host.querySelector('textarea[aria-label^="Recall response"]'),'The shape and volume stay the same.');await click('Reveal the facts');for(const radio of [...host.querySelectorAll('input[type=radio][value=recalled]')].filter(visible))await act(async()=>radio.click());}
async function seed(cards){for(const c of cards)await H.mutateMemoryAidPrivatePractice('resource:refinement',{action:'upsert-attempt',cardId:c.id,attempt:completed(c,{id:'old-'+c.id,nextReviewDate:'2026-01-01',applicationQuestion:c.applicationQuestion,applicationResponse:'Earlier private explanation'})},cards,'refinement-learner');}

describe('neutral recall and compatible review plans',()=>{
 it('shows a neutral question and omits copied answers and all answer-bearing metadata in a no-hints export',()=>{
  const c=card();expect(H.memoryAidRecallQuestion(c)).toBe(question);
  for(const answer of [c.target,c.aiExample,...c.essentialFacts])expect(H.memoryAidRecallQuestion({...c,recallQuestion:'Remember: '+answer})).toBe('');
  const html=rules.renderPreset(data([c]),'no-hints');expect(html).toContain(question);
  for(const answer of [c.target,c.aiExample,...c.essentialFacts,c.mapping,c.applicationQuestion])expect(html).not.toContain(answer);
  expect(rules.renderPreset(data([card({recallQuestion:''})]),'no-hints')).toContain('No recall question was saved');
  expect(H.applyMemoryAidCardPatch(c,{essentialFacts:['New fact']}).recallQuestion).toBe('');
 });
 it('retains a review date after changing only the cue, but never credits it as practice with the new cue',()=>{
  const c=card(),old=completed(c,{nextReviewDate:'2026-09-20'}),changed=card({studentDraft:'My rock reminds me about shape and space.'});
  expect(rules.reviewPlan(changed,[old],'2026-09-21')).toMatchObject({earlierCue:true,needsPractice:true,due:true,date:'2026-09-20'});
  expect(rules.reviewPlan(card({essentialFacts:['Different fact']}),[old])).toMatchObject({latest:null,contentChanged:true});
  expect(rules.reviewPlan(changed,[old,completed(changed,{id:'new',createdAt:'2099-01-01T12:00:00Z'})])).toMatchObject({earlierCue:false,needsPractice:false});
 });
 it('requests and retains a bounded recall question during generation',()=>{
  const source=readFileSync(resolve('generate_dispatcher_source.jsx'),'utf8');expect(source).toContain('Include recallQuestion: a short neutral question');expect(source).toContain("recallQuestion: String(item.recallQuestion || '').trim().slice(0, 1600)");
 });
});
describe('targeted private follow-up writes',()=>{
 it('merges concurrent field patches without changing recall evidence or another attempt',async()=>{
  const c=card(),first=completed(c,{id:'first'}),second=completed(c,{id:'second'}),key='resource:patch';
  for(const attempt of [first,second])await H.mutateMemoryAidPrivatePractice(key,{action:'upsert-attempt',cardId:c.id,attempt},[c],'patch-person');
  await Promise.all([{applicationResponse:'My explanation',response:'Must not replace recall',factChecks:['practice']},{nextReviewDate:'2026-10-10',reviewSchedule:'date'}].map(patch=>H.mutateMemoryAidPrivatePractice(key,{action:'patch-followup',cardId:c.id,attemptId:'first',patch},[c],'patch-person')));
  const rows=H.loadMemoryAidPrivatePractice(key,[c],'patch-person').solid;expect(rows[0]).toMatchObject({applicationResponse:'My explanation',nextReviewDate:'2026-10-10',response:first.response,factChecks:first.factChecks});expect(rows[1]).toEqual(second);
  expect(H.loadMemoryAidPrivatePractice(key,[c],'other-person')).toEqual({});
 });
 it('cannot recreate a missing or explicitly deleted attempt',async()=>{
  const c=card(),key='resource:removed',patch={applicationResponse:'Do not resurrect'};
  expect(await H.mutateMemoryAidPrivatePractice(key,{action:'patch-followup',cardId:c.id,attemptId:'absent',patch},[c],'p')).toMatchObject({ok:true,applied:false,reason:'attempt-missing'});
  await H.mutateMemoryAidPrivatePractice(key,{action:'upsert-attempt',cardId:c.id,attempt:completed(c,{id:'deleted'})},[c],'p');
  await H.mutateMemoryAidPrivatePractice(key,{action:'delete-attempt',cardId:c.id,attemptId:'deleted'},[c],'p');
  expect(await H.mutateMemoryAidPrivatePractice(key,{action:'patch-followup',cardId:c.id,attemptId:'deleted',patch},[c],'p')).toMatchObject({ok:true,applied:false,reason:'attempt-tombstoned'});
 });
 it('autosaves typing, self-checks and dates and resumes the same attempt after remount',async()=>{
  await mount();await click('Try recall');await finish();const id=saved().solid[0].id;
  await input(host.querySelector('[aria-label="Your explanation"]'),'The wooden block keeps its volume.');await click('Compare my explanation');await input(host.querySelector('[aria-label="How did your explanation connect?"]'),'connected');await input(host.querySelector('[aria-label="Review again on"]'),'2026-10-15');
  expect(saved().solid[0]).toMatchObject({id,applicationResponse:'The wooden block keeps its volume.',applicationCheck:'connected',nextReviewDate:'2026-10-15'});
  await act(async()=>root.unmount());host.remove();await mount();await click('Continue my application and plan');expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('The wooden block keeps its volume.');expect(saved().solid).toHaveLength(1);
 });
 it('retains unsaved text on a storage error and retries without losing the response',async()=>{
  await mount();await click('Try recall');await finish();navigator.locks.request.mockRejectedValueOnce(new Error('unavailable'));
  await input(host.querySelector('[aria-label="Your explanation"]'),'Keep this draft on error.');expect(host.textContent).toContain('Could not save these changes');expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('Keep this draft on error.');
  await click('Save private practice plan');expect(saved().solid[0].applicationResponse).toBe('Keep this draft on error.');
 });
 it('does not expose an old application response as an answer to a changed question',async()=>{
  await seed([card()]);await mount([card({applicationQuestion:'A different application question?'})]);await click('Continue my application and plan');expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('');expect(host.textContent).toContain('My explanation for the earlier question');expect(host.textContent).toContain('Earlier private explanation');
 });
 it('prevents a pending save from appearing in the next learner profile',async()=>{
  await mount();await click('Try recall');await finish();let release;navigator.locks.request.mockImplementationOnce((name,opts,cb)=>new Promise(resolve=>{release=()=>resolve(cb());}));
  await input(host.querySelector('[aria-label="Your explanation"]'),'Only the original learner.');await render({activeProfileId:'another-learner'});await act(async()=>release());expect(host.textContent).not.toContain('Only the original learner.');expect(H.loadMemoryAidPrivatePractice('resource:refinement',[card()],'another-learner')).toEqual({});expect(saved().solid[0].applicationResponse).toBe('Only the original learner.');
 });
});
describe('due review sequence and learner connections',()=>{
 it('counts only new completed recalls, allows skip, and finishes a due sequence',async()=>{
  const cards=[card(),card({id:'second',target:'Second target'})];await seed(cards);await mount(cards);await click('Practice due targets');expect(host.textContent).toContain('Planned review 1 of 2');await finish();await click('Next review target');expect(host.textContent).toContain('Planned review 2 of 2');await click('Skip this target');expect(host.textContent).toContain('Review finished: 1 completed, 1 skipped.');
 });
 it('does not count a resumed older application plan as new recall',async()=>{
  await seed([card()]);await mount();await click('Practice due targets');await click('Continue my application and plan');expect(button('Next review target')).toBeUndefined();await click('Skip this target');expect(host.textContent).toContain('Review finished: 0 completed, 1 skipped.');
 });
 it('keeps copied cues mapped and requires reconfirmation when learner connections become stale',()=>{
  const c=H.normalizeMemoryAidCard(card(),0,{}),copy={...c,studentDraft:c.aiExample};expect(H.memoryAidCustomCue(copy)).toBe(false);expect(rules.renderPreset(data([copy]),'study')).toContain('It stays the same shape.');
  const changed={...c,studentDraft:'My new cue'};const row={factKey:H.memoryAidConnectionFactKeys(changed)[0],cue:'new',explanation:'My reason',cueKey:H.memoryAidConnectionKey(changed)};changed.studentConnections=[row];expect(H.memoryAidActiveConnections(changed)).toMatchObject([{factIndex:0,learnerIdentified:true}]);
  expect(H.memoryAidActiveConnections({...changed,studentDraft:'A different cue'})).toEqual([]);expect(H.normalizeMemoryAidCard({...changed,essentialFacts:['New fact']},0,{}).studentConnections).toEqual([row]);
 });
 it('lets a learner write, revise and reconfirm their connection without treating it as accuracy evidence',async()=>{
  await mount();await click('Make it mine');await input(host.querySelector('[aria-label="Cue part for fact 1"]'),'statue');expect(resource.data.cards[0].studentConnections[0].cue).toBe('statue');expect(host.textContent).toContain('1 of 2 facts have a current connection from you.');
  await input(host.querySelector('textarea[id$="-draft"]'),'A different rock cue');expect(host.textContent).toContain('Your cue changed. Recheck this connection.');await click('This connection still fits');expect(H.memoryAidActiveConnections(resource.data.cards[0])[0]).toMatchObject({cue:'statue',learnerIdentified:true});
 });
 it('round-trips bounded learner connections through backups without teacher facts, media or private attempts',()=>{
  const c=card({studentDraft:'My cue'});c.studentConnections=[{factKey:H.memoryAidConnectionFactKeys(c)[0],cue:'My cue',explanation:'My reason',cueKey:H.memoryAidConnectionKey(c),practiceAttempts:[{response:'PRIVATE'}],visualImage:'SECRET_IMAGE'},{factKey:'fact:PRIVATE_TEACHER_FACT',cue:'unsafe identity'}];
  const r={id:'backup',type:'memory-aid',data:data([c])},response=S.responseFromData('memory-aid',r.data),json=S.serializeBackup(r,response),restored=S.readBackup(r,JSON.parse(json));
  expect(restored.cards[0].studentConnections).toHaveLength(1);for(const text of ['PRIVATE','SECRET_IMAGE',c.essentialFacts[0]])expect(json).not.toContain(text);
  expect(S.project(r,restored).data.cards[0].studentConnections[0].explanation).toBe('My reason');expect(S.emptyResponse(r).cards[0].studentConnections).toEqual([]);
  expect(Object.values(S.toResponseEntries(r,restored))).toContain('My reason');
 });
 it('escapes active and stale connection text in full exports with a safe missing-module fallback',()=>{
  const c=card({studentDraft:'My cue'});c.studentConnections=[{factKey:H.memoryAidConnectionFactKeys(c)[0],cue:'<img onerror=bad>',explanation:'My connection',cueKey:H.memoryAidConnectionKey(c)}];
  const pipeline=window.AlloModules.createDocPipeline({t:key=>key,isRtlLang:()=>false,getDefaultTitle:()=> 'Document',state:{}}),r={id:'export',type:'memory-aid',data:data([c])};
  const output=()=>pipeline.generateFullPackHTML([r],'Memory',false,{}, {includeTeacherKey:false,annotations:[]});expect(output()).toContain('&lt;img onerror=bad&gt;');expect(output()).toContain('My connection');
  const mod=window.AlloModules.MemoryAid;try{delete window.AlloModules.MemoryAid;expect(output()).toContain('recheck against the current cue and facts');expect(output()).toContain('My connection');}finally{window.AlloModules.MemoryAid=mod;}
 });
});

describe('Memory Aid returning learners and flexible recall',()=>{
 it('opens and focuses the saved application directly without reopening it after each autosave',async()=>{
  await seed([card()]);await mount();await click('Continue my application and plan');
  const details=host.querySelector('[data-memory-application]'),summary=details.querySelector('summary');
  expect(details.open).toBe(true);expect(document.activeElement).toBe(summary);expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('Earlier private explanation');
  await act(async()=>{details.open=false;});await input(host.querySelector('[aria-label="Review again on"]'),'2026-10-20');
  expect(details.open).toBe(false);expect(saved().solid).toHaveLength(1);
 });
 it('preserves writing when switching response modes, then saves it only when the learner chooses written recall',async()=>{
  await mount();await click('Try recall');await click('Start recall practice');await input(host.querySelector('textarea[aria-label^="Recall response"]'),'Keep my current writing.');
  await act(async()=>host.querySelector('input[value="self-check"]').click());expect(host.querySelector('textarea[aria-label^="Recall response"]')).toBeNull();expect(host.textContent).toContain('Your writing is kept in this open attempt');
  await act(async()=>host.querySelector('input[value="written"]').click());expect(host.querySelector('textarea[aria-label^="Recall response"]').value).toBe('Keep my current writing.');
  await click('Reveal the facts');for(const radio of [...host.querySelectorAll('input[type=radio][value=recalled]')].filter(visible))await act(async()=>radio.click());expect(saved().solid[0]).toMatchObject({responseMode:'written',response:'Keep my current writing.'});
 });
 it('keeps a cue-assisted rescue honest and does not save hidden writing for a non-written response',async()=>{
  await mount();await click('Try recall');const none=[...host.querySelectorAll('input[type=radio]')].find(el=>visible(el)&&el.parentElement.textContent==='Without hints');await act(async()=>none.click());await click('Start recall practice');
  await input(host.querySelector('textarea[aria-label^="Recall response"]'),'HIDDEN_WRITING_MUST_NOT_BE_SAVED');await act(async()=>host.querySelector('input[value="self-check"]').click());await act(async()=>host.querySelector('.memory-aid-practice-panel input[type=checkbox]').click());
  expect(button('Reveal the facts').disabled).toBe(false);await click('Show my cue');expect(document.activeElement.getAttribute('aria-label')).toBe('Your memory cue');expect(host.querySelector('.memory-aid-practice-panel input[type=checkbox]').checked).toBe(false);expect(button('Reveal the facts').disabled).toBe(true);expect(button('Show my cue')).toBeUndefined();
  await act(async()=>host.querySelector('.memory-aid-practice-panel input[type=checkbox]').click());await click('Reveal the facts');for(const radio of [...host.querySelectorAll('input[type=radio][value=recalled]')].filter(visible))await act(async()=>radio.click());
  expect(saved().solid[0]).toMatchObject({supportMode:'cue',responseMode:'self-check',response:''});expect(JSON.stringify(saved())).not.toContain('HIDDEN_WRITING_MUST_NOT_BE_SAVED');
 });
 it('retains a written response when requesting the cue and records the completed attempt as supported',async()=>{
  await mount();await click('Try recall');const none=[...host.querySelectorAll('input[type=radio]')].find(el=>visible(el)&&el.parentElement.textContent==='Without hints');await act(async()=>none.click());await click('Start recall practice');
  await input(host.querySelector('textarea[aria-label^="Recall response"]'),'My first thoughts stay here.');await click('Show my cue');expect(host.querySelector('textarea[aria-label^="Recall response"]').value).toBe('My first thoughts stay here.');
  await click('Reveal the facts');for(const radio of [...host.querySelectorAll('input[type=radio][value=recalled]')].filter(visible))await act(async()=>radio.click());expect(saved().solid[0]).toMatchObject({supportMode:'cue',response:'My first thoughts stay here.'});
 });
 it('starts a fresh recall normally after resuming an earlier application',async()=>{
  await seed([card()]);await mount();await click('Continue my application and plan');await click('Practice again');expect(document.activeElement.tagName).toBe('H3');expect(host.querySelector('textarea[aria-label^="Recall response"]').value).toBe('');
  await input(host.querySelector('textarea[aria-label^="Recall response"]'),'A fresh attempt.');await click('Reveal the facts');for(const radio of [...host.querySelectorAll('input[type=radio][value=recalled]')].filter(visible))await act(async()=>radio.click());expect(host.querySelector('[data-memory-application]').open).toBe(false);expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('');expect(saved().solid).toHaveLength(2);
 });
});

describe('Memory Aid revision drafts and saved plans',()=>{
 const needsWork=(extra={})=>completed(card(),{id:'needs-work',factChecks:['practice','recalled'],...extra});
 const put=async(attempt,cards=[card()])=>H.mutateMemoryAidPrivatePractice('resource:refinement',{action:'upsert-attempt',cardId:'solid',attempt},cards,'refinement-learner');
 it('autosaves an unfinished revision idea privately and recovers it without committing a goal',async()=>{
  await put(needsWork());await mount();await click('Continue my application and plan');
  await input(host.querySelector('[aria-label^="Revision goal for"]'),'PRIVATE_REVISION_DRAFT: make the shape cue clearer.');
  expect(saved().solid[0]).toMatchObject({revisionDraft:'PRIVATE_REVISION_DRAFT: make the shape cue clearer.',revisionPlan:null});expect(H.memoryAidPracticeRevisionState(saved().solid,card())).toBeNull();
  await act(async()=>root.unmount());host.remove();await mount();await click('Continue my application and plan');expect(host.querySelector('[aria-label^="Revision goal for"]').value).toContain('PRIVATE_REVISION_DRAFT');
  expect(S.serializeBackup(resource,S.responseFromData('memory-aid',resource.data))).not.toContain('PRIVATE_REVISION_DRAFT');expect(rules.renderPreset(resource.data,'teacher')).not.toContain('PRIVATE_REVISION_DRAFT');
 });
 it('commits an explicit revision goal without replacing newer application work in storage',async()=>{
  await put(needsWork({revisionDraft:'Make the shape link clearer.'}));await mount();await click('Continue my application and plan');
  await H.mutateMemoryAidPrivatePractice('resource:refinement',{action:'patch-followup',cardId:'solid',attemptId:'needs-work',patch:{applicationQuestion:card().applicationQuestion,applicationResponse:'Newer work from another view.',nextReviewDate:'2026-10-21'}},[card()],'refinement-learner');
  await click('Save goal and revise cue');expect(saved().solid[0]).toMatchObject({applicationResponse:'Newer work from another view.',nextReviewDate:'2026-10-21',revisionPlan:{strategy:'Make the shape link clearer.',targetFactIndexes:[0]}});
  expect(host.querySelector('textarea[id$="-draft"]').closest('[hidden]')).toBeNull();
 });
 it('patches self-checks independently of concurrent follow-up text and rejects an incomplete patch',async()=>{
  await put(needsWork());const key='resource:refinement',c=card();
  await Promise.all([
   H.mutateMemoryAidPrivatePractice(key,{action:'patch-followup',cardId:'solid',attemptId:'needs-work',patch:{applicationResponse:'Keep the application.',revisionDraft:'Keep the revision draft.'}},[c],'refinement-learner'),
   H.mutateMemoryAidPrivatePractice(key,{action:'patch-self-check',cardId:'solid',attemptId:'needs-work',factChecks:['recalled','practice'],patch:{applicationResponse:'Not allowed'}},[c],'refinement-learner')
  ]);
  let rows=H.loadMemoryAidPrivatePractice(key,[c],'refinement-learner');expect(rows.solid[0]).toMatchObject({factChecks:['recalled','practice'],applicationResponse:'Keep the application.',revisionDraft:'Keep the revision draft.'});
  expect(await H.mutateMemoryAidPrivatePractice(key,{action:'patch-self-check',cardId:'solid',attemptId:'needs-work',factChecks:['unrated','practice']},[c],'refinement-learner')).toMatchObject({ok:false,applied:false,reason:'invalid-attempt'});
  await H.mutateMemoryAidPrivatePractice(key,{action:'delete-attempt',cardId:'solid',attemptId:'needs-work'},[c],'refinement-learner');
  expect(await H.mutateMemoryAidPrivatePractice(key,{action:'patch-self-check',cardId:'solid',attemptId:'needs-work',factChecks:['recalled','recalled']},[c],'refinement-learner')).toMatchObject({ok:true,applied:false,reason:'attempt-tombstoned'});
 });
 it('lets the learner continue a specific older plan with its own question, response and timestamp',async()=>{
  await put(completed(card(),{id:'older',createdAt:'2026-08-10T12:00:00Z',applicationQuestion:card().applicationQuestion,applicationResponse:'My older application.'}));
  await put(completed(card(),{id:'newer',createdAt:'2026-08-11T12:00:00Z',applicationQuestion:card().applicationQuestion,applicationResponse:'My newer application.'}));
  await mount();await click('Try recall');const older=host.querySelector('[data-memory-attempt="older"]');expect(older.textContent).toContain('My older application.');expect(older.querySelector('time').dateTime).toBe('2026-08-10T12:00:00.000Z');
  await act(async()=>host.querySelector('[aria-label="Continue saved plan from attempt 1"]').click());expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('My older application.');expect(host.textContent).toContain('Continuing this plan does not create a new recall attempt.');expect(saved().solid).toHaveLength(2);
  await input(host.querySelector('[aria-label="Your explanation"]'),'An edit to the older plan.');expect(saved().solid.find(a=>a.id==='older').applicationResponse).toBe('An edit to the older plan.');expect(saved().solid.find(a=>a.id==='newer').applicationResponse).toBe('My newer application.');
 });
 it('keeps earlier facts and application answers visible as history without enabling resume against changed facts',async()=>{
  await put(needsWork({applicationQuestion:'Earlier question?',applicationResponse:'Earlier answer.',revisionDraft:'Earlier revision idea.'}));
  await mount([card({essentialFacts:['A different fact.']})]);await click('Try recall');const old=host.querySelector('[data-memory-attempt="needs-work"]');expect(old.textContent).toContain('Earlier facts — review only');expect(old.textContent).toContain(card().essentialFacts[0]);expect(old.textContent).toContain('Earlier question?');expect(old.textContent).toContain('Earlier answer.');expect(old.textContent).toContain('Earlier revision idea.');expect(old.querySelector('[aria-label^="Continue saved plan"]')).toBeNull();
 });
 it('does not let a pending goal save navigate away from a newer recall attempt',async()=>{
  await put(needsWork({revisionDraft:'My pending goal.'}));await mount();await click('Continue my application and plan');let release;navigator.locks.request.mockImplementationOnce((name,options,callback)=>new Promise(resolve=>{release=()=>resolve(callback());}));
  await click('Save goal and revise cue');await click('Try without hints');await input(host.querySelector('textarea[aria-label^="Recall response"]'),'New recall stays open.');await act(async()=>release());
  expect(host.querySelector('textarea[aria-label^="Recall response"]').value).toBe('New recall stays open.');expect(saved().solid[0].revisionPlan.strategy).toBe('My pending goal.');
 });
 it('preserves private drafts when the learner revises a completed self-check',async()=>{
  await put(needsWork());await mount();await click('Continue my application and plan');await input(host.querySelector('[aria-label^="Revision goal for"]'),'Draft before a self-check change.');await input(host.querySelector('[aria-label="Your explanation"]'),'Application before a self-check change.');
  await act(async()=>host.querySelector('input[aria-label^="I recalled fact 1:"]').click());expect(saved().solid[0]).toMatchObject({factChecks:['recalled','recalled'],revisionDraft:'Draft before a self-check change.',applicationResponse:'Application before a self-check change.'});
 });
});

describe('Memory Aid first-save recovery',()=>{
 it('can retry the first failed save through another self-check without replacing saved follow-up fields',async()=>{
  await mount();await click('Try recall');navigator.locks.request.mockRejectedValueOnce(new Error('Temporary storage failure'));await finish();expect(saved().solid).toBeUndefined();
  await act(async()=>host.querySelector('input[aria-label^="Needs more practice for fact 1:"]').click());expect(saved().solid[0].factChecks).toEqual(['practice','recalled']);
  const id=saved().solid[0].id;await H.mutateMemoryAidPrivatePractice('resource:refinement',{action:'patch-followup',cardId:'solid',attemptId:id,patch:{applicationResponse:'Newer private application.',revisionDraft:'Newer private draft.'}},[card()],'refinement-learner');
  await act(async()=>host.querySelector('input[aria-label^="I recalled fact 1:"]').click());expect(saved().solid[0]).toMatchObject({applicationResponse:'Newer private application.',revisionDraft:'Newer private draft.',factChecks:['recalled','recalled']});
 });
 it('can explicitly commit a fresh goal after a first-save failure while retaining local application text',async()=>{
  await mount();await click('Try recall');await click('Start recall practice');await input(host.querySelector('textarea[aria-label^="Recall response"]'),'My fresh recall.');await click('Reveal the facts');
  await act(async()=>host.querySelector('input[aria-label^="Needs more practice for fact 1:"]').click());navigator.locks.request.mockRejectedValueOnce(new Error('Temporary storage failure'));await act(async()=>host.querySelector('input[aria-label^="I recalled fact 2:"]').click());expect(saved().solid).toBeUndefined();
  await input(host.querySelector('[aria-label="Your explanation"]'),'Keep my local application too.');await input(host.querySelector('[aria-label^="Revision goal for"]'),'My recovery goal.');await click('Save goal and revise cue');
  expect(saved().solid[0]).toMatchObject({applicationResponse:'Keep my local application too.',revisionDraft:'My recovery goal.',revisionPlan:{strategy:'My recovery goal.'}});
 });
});


describe('Memory Aid comparable revision evidence',()=>{
 const planned=(c=card(),targets=[0,1])=>completed(c,{id:'revision-plan',factChecks:['practice','practice'],revisionPlan:{strategy:'Make the shape and volume connections clear.',targetFactIndexes:targets,cueBefore:c.aiExample}});
 const storeAttempt=async(c,a)=>H.mutateMemoryAidPrivatePractice('resource:refinement',{action:'upsert-attempt',cardId:c.id,attempt:a},[c],'refinement-learner');
 it('does not treat changed targeted facts as failed recall or a completed revision',()=>{
  const before=card(),after=card({essentialFacts:['A different fact.','A solid has a definite volume.'],studentDraft:'Different cue'});
  const state=H.memoryAidPracticeRevisionState([planned(before),completed(after)],after);
  expect(state).toMatchObject({contentChanged:true,pending:false,followUpAttemptId:'',recalledAfter:0,targetCount:2});
 });
 it('ignores follow-up attempts missing any targeted fact, including duplicate occurrences',()=>{
  const before=card({essentialFacts:['Check the lock.','Check the lock.']}),after={...before,studentDraft:'First check, then check again.'};
  const incompleteFacts=completed({...after,essentialFacts:['Check the lock.']},{id:'missing-occurrence',factChecks:['recalled']});
  expect(H.memoryAidPracticeRevisionState([planned(before),incompleteFacts],after)).toMatchObject({pending:true,contentChanged:false,followUpAttemptId:''});
 });
 it('compares the current cue only, without carrying success to another revision or a reverted cue',()=>{
  const before=card(),v2=card({studentDraft:'A new shape and volume cue'}),v3=card({studentDraft:'An even newer cue'}),plan=planned(before),followUp=completed(v2,{id:'v2-result'});
  expect(H.memoryAidPracticeRevisionState([plan,followUp],v2)).toMatchObject({pending:false,recalledAfter:2,followUpAttemptId:'v2-result',followUpSupportMode:'none'});
  for(const current of [v3,before])expect(H.memoryAidPracticeRevisionState([plan,followUp],current)).toMatchObject({pending:true,followUpAttemptId:'',recalledAfter:0});
 });
 it('uses targeted fact identities across reordering and changes to unrelated facts',()=>{
  const before=card(),after=card({essentialFacts:['A new unrelated fact.','A solid keeps its shape.'],studentDraft:'Shape is the statue.'});
  expect(H.memoryAidPracticeRevisionState([planned(before,[0]),completed(after,{id:'targeted',factChecks:['practice','recalled'],supportMode:'cue'})],after)).toMatchObject({pending:false,contentChanged:false,recalledAfter:1,targetCount:1,followUpSupportMode:'cue'});
 });
 it('shows an earlier-facts explanation instead of a recall result or active goal for changed targets',async()=>{
  const before=card(),after=card({essentialFacts:['A changed shape fact.','A solid has a definite volume.'],studentDraft:'New cue'});
  await storeAttempt(before,planned(before));await storeAttempt(after,completed(after,{id:'after'}));await mount([after]);await click('Try recall');
  expect(host.textContent).toContain('Your saved goal refers to facts that have changed.');expect(host.textContent).not.toContain('your self-check marked');
  await click('Make it mine');expect(host.textContent).toContain('Your saved goal refers to facts that have changed.');expect(host.textContent).not.toContain('Your private revision goal');
 });
 it('identifies support in the current-cue result and requests fresh practice after another cue edit',async()=>{
  const before=card(),after=card({studentDraft:'New shape cue'});await storeAttempt(before,planned(before));await storeAttempt(after,completed(after,{id:'after',supportMode:'cue'}));await mount([after]);await click('Try recall');
  expect(host.textContent).toContain('marked 2 of 2 targeted facts as recalled. Support: With my cue.');
  await click('Make it mine');await input(host.querySelector('textarea[id$="-draft"]'),'Another new cue');await click('Try recall');
  expect(host.textContent).toContain('Complete a recall attempt with this cue');expect(host.textContent).not.toContain('marked 2 of 2 targeted facts');
 });
});

describe('Memory Aid easier private review dates',()=>{
 it('chooses dates from the local calendar across a year boundary and retains an explicit no-date choice',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,11,30,23,40));
  try{
   await seed([card()]);await mount();await click('Continue my application and plan');const id=saved().solid[0].id;
   vi.setSystemTime(new Date(2026,11,31,23,40));
   await click('Tomorrow');expect(saved().solid[0]).toMatchObject({id,nextReviewDate:'2027-01-01',reviewSchedule:'date',applicationResponse:'Earlier private explanation'});
   await click('In one week');expect(saved().solid[0].nextReviewDate).toBe('2027-01-07');
   await click('No date');expect(saved().solid[0]).toMatchObject({nextReviewDate:'',reviewSchedule:'off'});expect(host.textContent).toContain('No review date set.');
   await act(async()=>root.unmount());host.remove();await mount();await click('Continue my application and plan');
   expect(host.querySelector('[aria-label="Review again on"][type="date"]').value).toBe('');
   await input(host.querySelector('[aria-label="Review again on"][type="date"]'),'2027-02-12');expect(saved().solid[0]).toMatchObject({nextReviewDate:'2027-02-12',reviewSchedule:'date'});expect(saved().solid).toHaveLength(1);
  }finally{vi.useRealTimers();}
 });
 it('lets the overview clear only the chosen target date and removes its due marker',async()=>{
  const cards=[card(),card({id:'second',target:'Second target'})];await seed(cards);await mount(cards);
  const clear=host.querySelector('button[aria-label="No date for A solid keeps its shape"]');expect(clear).toBeTruthy();await act(async()=>clear.click());
  const rows=H.loadMemoryAidPrivatePractice('resource:refinement',cards,'refinement-learner');expect(rows.solid[0].reviewSchedule).toBe('off');expect(rows.second[0].nextReviewDate).toBe('2026-01-01');
  expect(host.textContent).toContain('1 target is ready to revisit.');expect(host.textContent).not.toContain('1 targets are ready');
 });
});
