import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const React=require('../desktop/web-app/node_modules/react');
const {createRoot}=require('../desktop/web-app/node_modules/react-dom/client');
const {act}=React;
const saved=JSON.parse(readFileSync('tests/fixtures/novak-native-quiz-saved-response.json','utf8'));
let QuizView,api,root,host;
const copy=value=>JSON.parse(JSON.stringify(value));
const t=key=>key;
beforeEach(()=>{
 localStorage.clear(); global.React=window.React=React; global.IS_REACT_ACT_ENVIRONMENT=true;
 window.AlloLanguageContext=React.createContext({t}); window.__alloT=t; window.AlloIcons={}; window.AlloModules={};
 const registration='  window.AlloModules.QuizView = QuizView;';
 const source=readFileSync('view_quiz_module.js','utf8').replace(registration,registration+'\n window.__projectRestoreTest={candidate:_quizProjectResponseCandidate,restore:_quizRestoreProjectResponses,namespace:_quizDraftNamespace,signature:_quizFeedbackSignature,compatible:_quizCompatibleFeedbackSignatures,read:_quizReadWorkingDraft,receipt:_quizReadAttemptReceipt,clear:_quizClearAttemptReceipt,snapshot:_quizResponseSnapshot};');
 new Function('window',source)(window); QuizView=window.AlloModules.QuizView; api=window.__projectRestoreTest;
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());host?.remove();root=host=null;vi.restoreAllMocks();delete navigator.locks;});
const quiz=()=>copy(saved.history.find(r=>r.id==='reading-space-exit'));
const record=()=>copy(saved.responses['reading-space-exit']);
const props=extra=>({t,isTeacherMode:false,isParentMode:false,isIndependentMode:false,studentProjectSettings:{},activeSessionCode:null,sessionData:{},isPresentationMode:false,isReviewGame:false,isEditingQuiz:false,escapeRoomState:{isActive:false},presentationState:{},reviewGameState:{},isFactChecking:{},showQuizAnswers:false,leveledTextLanguage:'English',formatInlineText:v=>v,renderFormattedText:v=>v,getReviewCategories:()=>[],getRows:()=>1,playSound:vi.fn(),addToast:vi.fn(),handleToggleIsPresentationMode:vi.fn(),handleToggleIsReviewGame:vi.fn(),handleToggleIsEditingQuiz:vi.fn(),handleToggleShowQuizAnswers:vi.fn(),handlePresentationOptionClick:vi.fn(),togglePresentationAnswer:vi.fn(),togglePresentationExplanation:vi.fn(),resetPresentation:vi.fn(),handleQuizChange:vi.fn(),handleFactCheck:vi.fn(),ErrorBoundary:({children})=>children,TeacherLiveQuizControls:()=>null,ConfettiExplosion:()=>null,Stamp:()=>null,generatedContent:quiz(),learnerResponseScope:'import-one',...extra});
async function render(p){if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host);} await act(async()=>{root.render(React.createElement(QuizView,props(p)));await Promise.resolve();});}
const context=(data,extra={})=>({resourceId:'reading-space-exit',sessionCode:'',activityId:'',userId:'',signature:api.signature(data),compatibleSignatures:api.compatible(data),workspaceScope:'import-one',...extra});
const namespace=(data,scope='import-one')=>api.namespace(data,'','reading-space-exit')+':workspace-'+scope;
const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.trim()===text);

describe('portable native quiz responses',()=>{
 it('renders the actual saved submitted attempt in a fresh profile without AI or teacher keys',async()=>{
  const callGemini=vi.fn();await render({learnerResponses:record(),callGemini});
  expect(host.textContent).toContain('Assessment complete');
  const receipt=api.receipt(namespace(quiz().data));expect(api.snapshot(quiz().data,receipt.responses,{}).items.map(r=>r.response)).toEqual(record().assessmentSubmitted.items.map(r=>r.response));
  expect(host.textContent).toContain('3');expect(callGemini).not.toHaveBeenCalled();
  expect(host.querySelectorAll('textarea[aria-label^="Your response to question"]')).toHaveLength(0);
  expect(api.receipt(namespace(quiz().data)).delivery.status).toBe('local');
 });
 it('restores in-progress text and reflections into native inputs, including late host hydration',async()=>{
  const current=record();const snapshot=current.assessmentSubmitted; snapshot.status='in-progress';delete snapshot.submittedAt;snapshot.reflections[0].response='A preparation pause helped.';current.assessmentDraft=snapshot;current.assessmentSubmitted=null;
  await render({learnerResponses:null});await render({learnerResponses:current});
  expect([...host.querySelectorAll('textarea[aria-label^="Your response to question"]')].map(el=>el.value)).toEqual(snapshot.items.map(row=>row.answer.text));
  expect([...host.querySelectorAll('textarea')].some(el=>el.value==='A preparation pause helped.')).toBe(true);
 });
 it('rejects changed questions, reflection prompts, invalid choices, and a different signed-in learner',()=>{
  const data=quiz().data,current=record(),ctx=context(data);
  expect(api.candidate(data,current,ctx)).toBeTruthy();
  const changed=copy(data);changed.questions[0].question+=' Changed';expect(api.candidate(changed,current,context(changed))).toBeNull();
  current.assessmentSubmitted.reflections[0].prompt+=' Changed';expect(api.candidate(data,current,ctx)).toBeNull();
  const foreign=record();foreign.assessmentSubmitted.assessmentIdentity={...ctx,userId:'another-user'};expect(api.candidate(data,foreign,ctx)).toBeNull();
  expect(api.candidate(data,record(),{...ctx,sessionCode:'LIVE'})).toBeNull();
  const imported=record();imported.assessmentSubmitted.assessmentIdentity={...ctx,userId:'previous-anonymous-id',workspaceScope:'old-import'};expect(api.candidate(data,imported,{...ctx,userId:'fresh-anonymous-id',workspaceScope:'new-import'})).toBeTruthy();
  expect(api.candidate(data,imported,{...ctx,userId:'fresh-anonymous-id',workspaceScope:'old-import'})).toBeNull();
  expect(api.candidate({...data,questions:[null,...data.questions.slice(1)]},record(),ctx)).toBeNull();
 });
 it('restores all native typed answer shapes without importing scores',()=>{
  const data={questions:[{type:'mcq',question:'Pick',options:['a','b']},{type:'multi-select',question:'Many',options:['a','b','c']},{type:'answer-evidence',question:'Why',answerOptions:['a','b'],evidenceOptions:['x','y']},{type:'sequence-sense',question:'Order',items:['x','y'],presentedOrder:[0,1],principleOptions:['process']},{type:'relation-mismatch',question:'Pair',pairs:[{left:'x',right:'y'}],candidatePartners:['z']},{type:'numeric-response',question:'Number'},{type:'fill-blank',question:'Word'},{type:'self-explanation',question:'Reason'},{type:'short-answer',question:'Skip'}],reflections:['Reflect']};
  const items={root:{mcqAnswers:{0:1},reflectionAnswers:{0:{draft:'Thought'}}},'q-1':{selected:[0,2]},'q-2':{answerIdx:0},'q-3':{verifyAnswer:'no',clickedIdx:1,orderAnswer:[1,0],principleAnswer:'process'},'q-4':{clickedPairIdx:0,partnerAnswer:'z'},'q-5':{response:'3kg'},'q-6':{response:'word'},'q-7':{response:'because'},'q-8':{idk:true}};
  const snap=api.snapshot(data,items,{status:'in-progress',attemptId:'typed',startedAt:Date.now()});const result=api.candidate(data,{assessmentDraft:snap},context(data));expect(result).toBeTruthy();
  expect(api.snapshot(data,result.items,{}).items.map(r=>r.answer)).toEqual(snap.items.map(r=>r.answer));
  snap.items[0].answer.optionIdx=99;expect(api.candidate(data,{assessmentDraft:snap},context(data))).toBeNull();
 });
 it('does not overwrite local edits, another workspace, or a cancelled restore owner',async()=>{
  const data=quiz().data,key=namespace(data),ctx=context(data);localStorage.setItem(key,JSON.stringify({version:1,updatedAt:Date.now(),items:{root:{attemptMeta:{attemptId:'newer'}},'q-0':{response:'Newer local work'}}}));
  expect(await api.restore(key,data,record(),ctx,()=>true)).toBe(false);expect(api.read(key).items['q-0'].response).toBe('Newer local work');
  const second=namespace(data,'import-two');expect(await api.restore(second,data,record(),{...ctx,workspaceScope:'import-two'},()=>false)).toBe(false);expect(api.receipt(second)).toBeNull();
  expect(await api.restore(second,data,record(),{...ctx,workspaceScope:'import-two'},()=>true)).toBe(true);expect(api.read(key).items['q-0'].response).toBe('Newer local work');
 });
 it('restart clears the mirrored completion and never resurrects it on remount',async()=>{
  const mirrored=record();const recordChange=vi.fn((id,key,value)=>{mirrored[key]=value;});await render({learnerResponses:mirrored,onRecordQuizResponses:recordChange});
  const start=[...host.querySelectorAll('button')].find(el=>/Start another attempt/i.test(el.textContent));expect(start).toBeTruthy();await act(async()=>start.click());
  const confirm=[...host.querySelectorAll('button')].find(el=>/Clear and start again/i.test(el.textContent));expect(confirm).toBeTruthy();await act(async()=>confirm.click());
  expect(mirrored.assessmentSubmitted).toBeNull();expect(mirrored.assessmentDraft.status).toBe('in-progress');expect(mirrored.assessmentDraft.attemptId).not.toBe(record().assessmentSubmitted.attemptId);
  await act(async()=>root.unmount());root=null;host.remove();host=null;await render({learnerResponses:record(),onRecordQuizResponses:recordChange});
  expect(host.textContent).not.toContain('LOCAL TEST Q1');expect([...host.querySelectorAll('textarea[aria-label^="Your response to question"]')].every(el=>el.value==='')).toBe(true);
 });


 it('cancels queued restore when a different imported workspace takes ownership',async()=>{
  const pending=[];Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(name,options,operation)=>new Promise(resolve=>pending.push({name,operation,resolve}))}});
  await render({learnerResponses:record(),learnerResponseScope:'old-workspace'});
  await render({learnerResponses:record(),learnerResponseScope:'new-workspace'});
  expect(pending).toHaveLength(2);
  await act(async()=>{pending[0].resolve(pending[0].operation());await Promise.resolve();});
  expect(api.receipt(namespace(quiz().data,'old-workspace'))).toBeNull();
  await act(async()=>{pending[1].resolve(pending[1].operation());await Promise.resolve();});
  expect(api.receipt(namespace(quiz().data,'new-workspace')).summary.answered).toBe(3);
  expect(host.textContent).toContain('Assessment complete');
 });
 it('migrates only a matching owned legacy attempt and leaves ambiguous legacy work untouched',async()=>{
  const data=quiz().data,ctx=context(data),old=api.namespace(data,'','reading-space-exit'),key=namespace(data);
  const snapshot=record().assessmentSubmitted;const decoded=api.candidate(data,record(),ctx);
  const legacy={version:1,attemptId:snapshot.attemptId,submittedAt:snapshot.submittedAt,signature:ctx.signature,assessmentIdentity:ctx,responses:{...decoded.items,root:{...decoded.items.root,flaggedQuestions:{1:true}}}};
  localStorage.setItem('alloflow_assess_attempt_v1:'+old.slice('alloflow_assess_draft_v1:'.length),JSON.stringify(legacy));
  expect(await api.restore(key,data,record(),ctx,()=>true,old)).toBe(true);expect(api.receipt(key).responses.root.flaggedQuestions).toEqual({1:true});
  const other=namespace(data,'another-import');legacy.attemptId='different-learner';legacy.responses['q-0'].response='PRIVATE OTHER LEARNER';localStorage.setItem('alloflow_assess_attempt_v1:'+old.slice('alloflow_assess_draft_v1:'.length),JSON.stringify(legacy));
  expect(await api.restore(other,data,record(),ctx,()=>true,old)).toBe(true);expect(JSON.stringify(api.receipt(other))).not.toContain('PRIVATE OTHER LEARNER');
  expect(JSON.parse(localStorage.getItem('alloflow_assess_attempt_v1:'+old.slice('alloflow_assess_draft_v1:'.length))).attemptId).toBe('different-learner');
 });
 it('never hydrates project work into teacher, parent, or live views',async()=>{
  await render({learnerResponses:record(),isTeacherMode:true});expect(api.receipt(namespace(quiz().data))).toBeNull();
  await render({learnerResponses:record(),isParentMode:true});expect(api.receipt(namespace(quiz().data))).toBeNull();
  await render({learnerResponses:record(),activeSessionCode:'LIVE'});expect(api.receipt(namespace(quiz().data))).toBeNull();
 });
});
