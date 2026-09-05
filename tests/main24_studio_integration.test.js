import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let api, root, host;
beforeAll(() => {
 global.React=window.React=React; global.IS_REACT_ACT_ENVIRONMENT=true;
 ['studio_response_module.js','anchor_charts_module.js','note_taking_templates_module.js','resource_content_fingerprint_module.js','view_alignment_report_module.js'].forEach(loadAlloModule);
 api=window.AlloModules.StudioResponse;
});
afterEach(()=>{ if(root) act(()=>root.unmount());root=null;host?.remove();delete window.callGemini;delete window.callGeminiImageEdit; });
const chart = (id='a')=>({id,type:'anchor-chart',data:{title:id,sections:[{id:'s1',label:'Explain',bullets:['TEACHER ANSWER'],bulletIds:['b1']}],interactive:{armed:true,rubric:'TEACHER RUBRIC'}}});
const notes = (id='n')=>({id,type:'note-taking',data:{title:'Notes',templateType:'cornell-notes',cues:[{id:'c1',text:'TEACHER PROMPT'},{id:'c2',text:'Other cue'}],notes:[{id:'n1',text:''},{id:'n2',text:''}],summary:''}});
function mount(element){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);act(()=>root.render(element));}
async function change(input,value){ await act(async()=>Simulate.change(input,{target:{value}})); }
function harness(initial,extra={}){
 let control;
 function Harness(){
  const [resource,setResource]=React.useState(initial),[responses,setResponses]=React.useState({});
  control={resource,setResource,responses,setResponses};
  const View=resource.type==='anchor-chart'?window.AlloModules.AnchorChartView:window.AlloModules.NoteTakingView;
  return React.createElement(api.Boundary,{View,generatedContent:resource,isTeacherMode:false,studentResponses:responses,studentWorkStatus:'saved',onResponseChange:(id,studio)=>setResponses(p=>({...p,[id]:{studio}})),handleNoteUpdate:vi.fn(),allowRuntimeAi:false,t:(k,d)=>typeof d==='string'?d:k,...extra});
 }
 mount(React.createElement(Harness));return ()=>control;
}
describe('legacy resource response integration',()=>{
 it('restores anchor answers after navigation and never carries them to another resource',async()=>{
  const a=chart(),before=JSON.stringify(a),get=harness(a);
  await change(host.querySelector('input[type="text"]'),'Learner answer');
  expect(get().responses.a.studio.studentAnswers.s1.b1).toBe('Learner answer');
  await act(async()=>get().setResource(chart('b')));expect(host.querySelector('input[type="text"]').value).toBe('');
  await act(async()=>get().setResource(a));expect(host.querySelector('input[type="text"]').value).toBe('Learner answer');expect(JSON.stringify(a)).toBe(before);
  expect(JSON.stringify(api.toSubmission(a,get().responses.a.studio))).not.toMatch(/TEACHER ANSWER|TEACHER RUBRIC/);
  expect(Object.values(api.toResponseEntries(a,get().responses.a.studio))).toContain('Learner answer');
 });
 it('keeps stable bullet responses through reference reordering and exports learner bullets',()=>{
  const r=chart();r.data.sections[0].bullets.push('SECOND KEY');r.data.sections[0].bulletIds.push('b2');
  const response={studentAnswers:{s1:{b1:'First',b2:'Second'}}};
  r.data.sections[0].bullets.reverse();r.data.sections[0].bulletIds.reverse();
  expect(api.projectForExport(r,response).data.sections[0].bullets).toEqual(['Second','First']);
  expect(r.data.sections[0].bullets).toEqual(['SECOND KEY','TEACHER ANSWER']);
 });
 it('saves Cornell learner writing separately and strips untouched seeded prompts from submission',async()=>{
  const r=notes(),before=JSON.stringify(r),get=harness(r);
  const input=[...host.querySelectorAll('textarea')].find(el=>(el.getAttribute('aria-label')||'').includes('Notes for row 1')) || host.querySelectorAll('textarea')[1];
  await change(input,'My explanation');
  expect(JSON.stringify(get().responses.n.studio)).toContain('My explanation');expect(JSON.stringify(r)).toBe(before);
  expect(JSON.stringify(api.toSubmission(r,get().responses.n.studio))).not.toContain('TEACHER PROMPT');
 });
 it('migrates guided learner answers without submitting the answer key or source excerpts',()=>{
  const r={id:'g',type:'note-taking',data:{templateType:'guided-notes',lessonRef:{sourceText:'SOURCE SECRET'},blanks:[{id:'x',before:'BEFORE SECRET',answer:'CORRECT SECRET',after:'AFTER SECRET',studentAnswer:'Learner guess'}],notesExtra:'My extra note'}};
  const response=api.responseFromData(r.type,r.data),submitted=api.toSubmission(r,response),backup=api.backup(r,response);
  expect(JSON.stringify([submitted,backup])).not.toMatch(/SECRET/);expect(JSON.stringify(submitted)).toContain('Learner guess');
  const restored=api.project(r,api.readBackup(r,JSON.parse(JSON.stringify(backup))));
  expect(restored.data.blanks[0]).toMatchObject({answer:'CORRECT SECRET',studentAnswer:'Learner guess'});
 });
 it('preserves legacy reading reflections and omits row identifiers from flat responses',()=>{
  const r={id:'reading',type:'note-taking',data:{templateType:'reading-response',favoriteLine:'Chosen passage',question:'My question',thinkings:'My reflection'}};
  expect(api.toSubmission(r).data).toMatchObject({favoriteLine:'Chosen passage',question:'My question',thinkings:'My reflection'});
  const n=notes();n.data.notes=[{id:'INTERNAL ID',text:'Learner text'}];
  expect(Object.values(api.toResponseEntries(n))).not.toContain('INTERNAL ID');
 });
 it('does not attribute seeded Q&A study answers to learners',()=>{
  const r={id:'q',type:'note-taking',data:{templateType:'q-and-a',pairs:[{id:'p',question:'TEACHER QUESTION',answer:'TEACHER ANSWER'}]}};
  expect(JSON.stringify(api.toSubmission(r))).not.toMatch(/TEACHER/);
  const submitted=api.toSubmission(r,{pairs:[{id:'p',question:'TEACHER QUESTION',answer:'My revision'}]});
  expect(submitted.data.pairs).toEqual([{id:'p',answer:'My revision'}]);
  expect(api.project(r,api.readBackup(r,api.backup(r,{pairs:[{id:'p',question:'TEACHER QUESTION',answer:'My revision'}]}))).data.pairs[0]).toEqual({id:'p',question:'TEACHER QUESTION',answer:'My revision'});
 });
 it('ignores a delayed callback captured before a resource or profile switch',()=>{
  let child;const save=vi.fn();function View(props){child=props;return null;}
  const p={View,generatedContent:chart(),isTeacherMode:false,studentResponses:{},onResponseChange:save,activeProfileId:'one'};
  mount(React.createElement(api.Boundary,p));const late=child.handleNoteUpdate;
  act(()=>root.render(React.createElement(api.Boundary,{...p,activeProfileId:'two'})));
  act(()=>late('studentAnswers',{s1:{b1:'Wrong profile'}}));expect(save).not.toHaveBeenCalled();
 });
 it('disables Notes feedback when runtime AI is restricted',()=>{
  const callGemini=vi.fn();harness(notes(),{callGemini,allowRuntimeAi:false});
  expect(host.querySelector('[data-help-key="notes_feedback_button"]').disabled).toBe(true);expect(callGemini).not.toHaveBeenCalled();
 });
 it('never revives explicitly null Anchor providers from globals or synthesizes on a restricted mount',()=>{
  window.callGemini=vi.fn();window.callGeminiImageEdit=vi.fn();const callImagen=vi.fn();const r=chart();r.data.sections[0].iconPrompt='Draw idea';
  harness(r,{callGemini:null,callGeminiImageEdit:null,callImagen,allowRuntimeAi:false});
  expect([...host.querySelectorAll('button')].find(b=>b.textContent.includes('Submit for AI feedback')).disabled).toBe(true);
  expect(host.querySelector('[data-help-key="anchor_chart_edit_toggle"]')).toBeNull();expect(callImagen).not.toHaveBeenCalled();expect(window.callGemini).not.toHaveBeenCalled();
 });
 it('merges a delayed icon into its originating section without reverting newer label edits or changing the active chart',async()=>{
  let finish;const image=new Promise(resolve=>finish=resolve);let records={a:chart(),b:chart('b')};records.a.data.sections[0].iconPrompt='A prompt';
  let switchTo;function Harness(){const [id,setId]=React.useState('a');switchTo=setId;return React.createElement(window.AlloModules.AnchorChartView,{generatedContent:records[id],isTeacherMode:true,allowRuntimeAi:true,callImagen:()=>image,callGeminiImageEdit:null,t:(k,d)=>d||k,onUpdateResource:(id,update)=>records[id]=update(records[id]),handleNoteUpdate:vi.fn()});}
  mount(React.createElement(Harness));records.a={...records.a,data:{...records.a.data,sections:[{...records.a.data.sections[0],label:'Changed while pending'}]}};
  await act(async()=>switchTo('b'));await act(async()=>finish('data:image/png;base64,AAAA'));
  expect(records.a.data.sections[0]).toMatchObject({label:'Changed while pending',iconUrl:'data:image/png;base64,AAAA'});expect(records.b.data.sections[0].iconUrl).toBeUndefined();expect(host.querySelector('h1').textContent).toBe('b');
 });
 it('persists Notes feedback through reopening and invalidates it on learner edits',async()=>{
  const r=notes();r.data.notes=[{id:'n1',text:'One explanation'},{id:'n2',text:'Another explanation'}];
  const provider=vi.fn().mockResolvedValue(JSON.stringify({strength:'Specific strong reasoning',growthNudge:'Try an example',rubric:{completion:3,quality:10,alignment:4}}));
  const get=harness(r,{allowRuntimeAi:true,callGemini:provider,handleScoreUpdate:vi.fn()});
  await act(async()=>host.querySelector('[data-help-key="notes_feedback_button"]').click());
  expect(get().responses.n.studio.feedback.strength).toBe('Specific strong reasoning');
  expect(JSON.stringify(api.toSubmission(r,get().responses.n.studio))).not.toContain('TEACHER PROMPT');
  await act(async()=>get().setResource(notes('other')));await act(async()=>get().setResource(r));expect(host.textContent).toContain('Specific strong reasoning');
  await change(host.querySelectorAll('textarea')[1],'Changed reasoning');expect(get().responses.n.studio.feedback).toBeNull();
 });
 it('keeps teacher Notes preview edits temporary and never awards preview XP',async()=>{
  const r=notes(),before=JSON.stringify(r),save=vi.fn(),author=vi.fn(),score=vi.fn();
  mount(React.createElement(api.Boundary,{View:window.AlloModules.NoteTakingView,generatedContent:r,isTeacherMode:true,onResponseChange:save,handleNoteUpdate:author,handleScoreUpdate:score,studentResponses:{},allowRuntimeAi:false}));
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Preview as student').click());
  await change(host.querySelectorAll('textarea')[1],'Temporary thinking');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Reset preview').click());
  expect(host.querySelectorAll('textarea')[1].value).toBe('');expect(save).not.toHaveBeenCalled();expect(author).not.toHaveBeenCalled();expect(score).not.toHaveBeenCalled();expect(JSON.stringify(r)).toBe(before);
 });
 it('discards Notes feedback that finishes after the learner revises the draft',async()=>{
  let finish;const provider=vi.fn(()=>new Promise(resolve=>finish=resolve));const r=notes();r.data.notes=[{id:'n1',text:'First note'},{id:'n2',text:'Second note'}];
  const get=harness(r,{allowRuntimeAi:true,callGemini:provider});
  act(()=>host.querySelector('[data-help-key="notes_feedback_button"]').click());
  await change(host.querySelectorAll('textarea')[1],'New draft while pending');
  await act(async()=>finish(JSON.stringify({strength:'Feedback on old draft',growthNudge:'Old nudge'})));
  expect(get().responses.n.studio.feedback).toBeNull();expect(host.textContent).not.toContain('Feedback on old draft');
 });
 it('discards a backup read that completes after a profile switch on the same resource',async()=>{
  let finish;const save=vi.fn(),r=chart();function View(){return null;}
  const base={View,generatedContent:r,isTeacherMode:false,onResponseChange:save,studentResponses:{},activeProfileId:'one'};
  mount(React.createElement(api.Boundary,base));
  act(()=>Simulate.change(host.querySelector('input[type="file"]'),{target:{value:'file',files:[{size:20,text:()=>new Promise(resolve=>finish=resolve)}]}}));
  act(()=>root.render(React.createElement(api.Boundary,{...base,activeProfileId:'two'})));
  await act(async()=>finish(JSON.stringify(api.backup(r,{studentAnswers:{s1:{b1:'Profile one'}}}))));
  expect(save).not.toHaveBeenCalled();
 });
 it('shows and filters the newer studios in the actual work shelf',async()=>{
  const history=[{id:'m',type:'memory-aid',data:{title:'Memory work',cards:[{studentDraft:'Recall'}]}},{id:'c',type:'applied-challenge',data:{title:'Challenge work',workspace:{response:'Plan'}}}];
  mount(React.createElement(window.AlloModules.NotebookOverlay,{isOpen:true,history,onClose:()=>{},t:()=>null}));
  expect(host.textContent).toContain('Memory work');expect(host.textContent).toContain('Challenge work');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent.startsWith('Memory Aids')).click());
  expect(host.textContent).toContain('Memory work');expect(host.textContent).not.toContain('Challenge work');
 });
 it('includes both newer studios in the common work shelf',()=>{
  const H=window.AlloModules.NoteTakingTemplates._testing;
  expect(H._entryKind({type:'memory-aid'})).toBe('memory-aid');expect(H._entryKind({type:'applied-challenge'})).toBe('applied-challenge');
 });
});
describe('audit content versions',()=>{
 it('uses the same deterministic data-only fingerprint in Node and the runtime',()=>{
  const common=require(resolve('resource_content_fingerprint_module.js')),r=notes();
  expect(common.fingerprint(r)).toBe(window.AlloModules.ResourceContentFingerprint.fingerprint(r));
  expect(common.fingerprint(r)).toBe(common.fingerprint({...r,updatedAt:'later',data:{...r.data}}));
  expect(common.fingerprint(r)).not.toBe(common.fingerprint({...r,data:{...r.data,summary:'Changed'}}));
 });
 it('reports edits to an included ID even if the timestamp is unchanged',()=>{
  const r=notes(),versions=window.AlloModules.ResourceContentFingerprint.snapshot([r]);
  const audit={id:'audit',timestamp:'2026-09-04T12:00:00Z',data:{comprehensive:{auditScope:{includedArtifactIds:[r.id],artifactFingerprints:versions}}}};
  const compute=window.AlloModules.AuditResourceFreshness.compute;
  expect(compute(audit,[r]).stale).toBe(false);
  expect(compute(audit,[{...r,data:{...r.data,summary:'Edited'}}])).toMatchObject({stale:true,modified:['note-taking']});
 });
 it('qualifies older audits that cannot detect edits and catches later updatedAt values',()=>{
  const audit={id:'audit',timestamp:'2026-09-04T12:00:00Z',data:{comprehensive:{auditScope:{includedArtifactIds:['n']}}}};
  const compute=window.AlloModules.AuditResourceFreshness.compute;
  expect(compute(audit,[notes()]).unverified).toBe(1);
  expect(compute(audit,[{...notes(),updatedAt:'2026-09-04T13:00:00Z'}]).stale).toBe(true);
 });
});
