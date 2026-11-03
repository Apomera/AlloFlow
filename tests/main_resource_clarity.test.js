import {afterEach,beforeAll,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {transformSync}=require('@babel/core');
const {act}=React;
const dir=process.env.ALLO_CLARITY_CANDIDATE||'.';
const read=f=>readFileSync(resolve(dir,f),'utf8');
const roots=[];
const t=key=>key;
let Footer,Notes;
function mount(Component,props){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);act(()=>root.render(React.createElement(Component,props)));return{host,rerender:p=>act(()=>root.render(React.createElement(Component,p)))};}
const buttons=host=>[...host.querySelectorAll('button')];
beforeAll(()=>{
 globalThis.React=window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 for(const file of ['studio_response_module.js','timeline_revision_module.js','view_timeline_module.js','anchor_charts_module.js','view_faq_module.js','tool_catalog_module.js','view_sentence_frames_module.js'])new Function(read(file))();
 let notes=read('note_taking_templates_module.js').replace('window.AlloModules.NoteTakingTemplates = {','window.AlloModules.__ClarityNotes = { _notesSourceScope, _useNotesFeedback, _NotesFeedbackPanel };\nwindow.AlloModules.NoteTakingTemplates = {');new Function(notes)();Notes=window.AlloModules.__ClarityNotes;
 const src=readFileSync('resource_clarity_footer_source.jsx','utf8');Footer=new Function('React',transformSync(src,{plugins:['@babel/plugin-transform-react-jsx'],babelrc:false,configFile:false}).code+';return ResourceClarityFooter;')(React);
});
afterEach(()=>{roots.splice(0).forEach(root=>act(()=>root.unmount()));document.body.innerHTML='';vi.restoreAllMocks();delete window.AlloModules.AltText;});
describe('resource navigation and limited teacher checks',()=>{
 const history=[{id:'a',title:'Read the river text'},{id:'b',title:'Compare the evidence'},{id:'c',title:'Write a response'}];
 const common={resource:history[1],history,index:1,teacher:false,sync:false,hasPrev:true,hasNext:true,onNavigate:vi.fn(),t};
 it('names destinations and focuses the resource heading after navigation',()=>{
  const frame=[];vi.stubGlobal('requestAnimationFrame',fn=>frame.push(fn));
  const h=document.createElement('h2');h.id='alloflow-resource-heading';h.tabIndex=-1;h.getClientRects=()=>[{width:100,height:20}];document.body.append(h);
  const go=vi.fn();const {host}=mount(Footer,{...common,onNavigate:go});const next=buttons(host)[1];expect(next.getAttribute('aria-label')).toBe('Next resource: Write a response');act(()=>next.click());while(frame.length)frame.shift()();expect(go).toHaveBeenCalledWith('next');expect(document.activeElement).toBe(h);expect(host.textContent).toContain('Resource 2 of 3');vi.unstubAllGlobals();
 });
 it('explains teacher-follow navigation and prevents local movement',()=>{const go=vi.fn();const {host}=mount(Footer,{...common,sync:true,onNavigate:go});expect(buttons(host).every(b=>b.disabled)).toBe(true);buttons(host)[0].click();expect(go).not.toHaveBeenCalled();expect(host.textContent).toContain('Your teacher controls navigation');});
 it('reports missing/stale descriptions and preserves decorative images without claiming full readiness',()=>{
  window.AlloModules.AltText={hashImage:()=> 'current'};
  const resource={id:'r',data:{panels:[{imageUrl:'one'},{image:'two',alt:'Old view',altHash:'old'},{image:'decoration',decorative:true}]}};
  const {host}=mount(Footer,{...common,teacher:true,resource});expect(host.textContent).toContain('1 informative image needs a description');expect(host.textContent).toContain('1 image description needs review');expect(host.textContent).toContain('not a complete accessibility or accuracy review');expect(host.textContent).toContain('Confirm that instructions');
 });
 it('keeps teacher checks out of the learner view and detects unchecked/flagged timeline items',()=>{
  const props={...common,resource:{type:'timeline',data:[{verification:{factual:true,position:true}},{verification:{factual:false,position:true}},{}]}};
  const {host,rerender}=mount(Footer,props);expect(host.querySelector('details')).toBeNull();rerender({...props,teacher:true});expect(host.textContent).toContain('1 timeline item has no saved AI review');expect(host.textContent).toContain('AI flagged 1 timeline items');
 });
});
describe('deterministic Notes feedback source coverage',()=>{
 const valid={strength:'You linked two ideas.',growthNudge:'Explain how they connect.',sourceAlignment:{found:true,message:''},rubric:{completion:2,quality:10,alignment:3}};
 const resource={id:'notes',type:'note-taking',data:{templateType:'cornell-notes',notes:[{text:'First idea'},{text:'Second idea'}]}};
 it.each([{source:'',status:'none',included:0},{source:'abc',status:'full',included:3},{source:'x'.repeat(50001),status:'partial',included:50000}])('records $status source coverage independently of model prose',({source,status,included})=>{const scope=Notes._notesSourceScope(source);expect(scope.status).toBe(status);expect(scope.includedCharacters).toBe(included);expect(scope.totalCharacters).toBe(source.length);const {host}=mount(Notes._NotesFeedbackPanel,{feedback:{...valid,sourceScope:scope},t});expect(host.querySelector('[data-notes-source-scope]')).not.toBeNull();expect(host.textContent).toContain(status==='none'?'No source text':status==='full'?'full supplied source':'Only 50000 of 50001');});
 it('marks legacy feedback scope unknown and retains saved scope on reopening',()=>{const {host,rerender}=mount(Notes._NotesFeedbackPanel,{feedback:valid,t});expect(host.textContent).toContain('coverage was not recorded');const kept=JSON.parse(JSON.stringify({...valid,sourceScope:Notes._notesSourceScope('x'.repeat(50001))}));rerender({feedback:kept,t,earlierSource:true});expect(host.textContent).toContain('Only 50000 of 50001');expect(host.textContent).toContain('source text has changed');});
 it('saves app-computed scope even when AI omits a caveat',async()=>{let hook;const update=vi.fn();function Harness(p){hook=Notes._useNotesFeedback(p,'cornell-notes');return null;}mount(Harness,{generatedContent:resource,inputText:'x'.repeat(50001),callGemini:async()=>JSON.stringify(valid),handleNoteUpdate:update,t});await act(async()=>hook.requestFeedback());const saved=update.mock.calls.find(c=>c[0]==='feedback')[1];expect(saved.sourceScope).toMatchObject({status:'partial',includedCharacters:50000,totalCharacters:50001});expect(saved.sourceAlignment.message).toBe('');});
 it('keeps bounded source coverage through learner submission/export and excludes extra source text',()=>{const scope={...Notes._notesSourceScope('x'.repeat(50001)),privateSource:'SECRET'};const draft={...resource,data:{...resource.data,feedback:{...valid,sourceScope:scope}}};const saved=window.AlloModules.StudioResponse.toSubmission(draft);expect(saved.data.feedback.sourceScope).toEqual(Notes._notesSourceScope('x'.repeat(50001)));expect(JSON.stringify(saved)).not.toContain('SECRET');});
 it('discards a delayed review after the supplied source changes',async()=>{let hook,finish;const update=vi.fn(),ai=()=>new Promise(r=>finish=r);function Harness(p){hook=Notes._useNotesFeedback(p,'cornell-notes');return null;}const props={generatedContent:resource,inputText:'original',callGemini:ai,handleNoteUpdate:update,t};const {rerender}=mount(Harness,props);let pending;act(()=>{pending=hook.requestFeedback();});rerender({...props,inputText:'replacement'});await act(async()=>{finish(JSON.stringify(valid));await pending;});expect(update).not.toHaveBeenCalled();});
});
describe('Timeline review truthfulness',()=>{
 it.each([[2,'no issues in 2'],[1,'1 of 2']])('shows checked coverage without a verification claim',async(count,expected)=>{
  const resource={id:'tl',type:'timeline',data:[{date:'1',event:'Start'},{date:'2',event:'Finish'}]};const toasts=[];let current=resource;const callGemini=vi.fn(async()=>JSON.stringify(Array.from({length:count},(_,index)=>({index,isFactuallyAccurate:true,isPositionCorrect:true,rationale:'General knowledge only'}))));
  const api=window.AlloModules.createTimelineRevision({callGemini});await api.handleVerifyTimelineAccuracy({generatedContent:resource,gradeLevel:'Grade 5',cleanJson:v=>v,t,addToast:(...v)=>toasts.push(v),setIsVerifyingTimeline:()=>{},setGeneratedContent:fn=>{current=typeof fn==='function'?fn(current):fn;},setHistory:()=>{}});expect(toasts.at(-1)[0]).toContain(expected);expect(toasts.at(-1)[0]).not.toContain('Verified:');expect(callGemini.mock.calls[0][0]).toContain('no retrieved sources');
 });
});
describe('FAQ action intent and teacher response mode',()=>{
 const faq={generatedContent:{id:'faq',data:[{question:'Why is the river blue?',answer:'Light is reflected.'}]},t,isTeacherMode:false,isEditingFaq:false,splitTextToSentences:s=>[s],formatInteractiveText:s=>s,voiceSpeed:1,playbackState:{currentIdx:-1},handleSpeak:vi.fn()};
 it('reveals an answer without starting audio, and offers an explicit Listen action',()=>{const speak=vi.fn();const {host}=mount(window.AlloModules.FaqView,{...faq,handleSpeak:speak});act(()=>host.querySelector('h4').click());expect(speak).not.toHaveBeenCalled();const reveal=buttons(host).find(b=>b.textContent.includes('Show answer'));act(()=>reveal.click());expect(host.querySelector('#faq-answer-0').hidden).toBe(false);expect(speak).not.toHaveBeenCalled();act(()=>host.querySelector('[data-faq-listen-question]').click());expect(speak).toHaveBeenCalledWith('Why is the river blue?','faq-active',0);});
 it('uses plain response-mode labels and previews blanks without exposing reference bullets',()=>{const {host}=mount(window.AlloModules.AnchorChartView,{generatedContent:{id:'ac',type:'anchor-chart',data:{title:'Water',sections:[{id:'one',label:'Evaporation',bullets:['SECRET REFERENCE ANSWER']}],interactive:{armed:false,rubric:''}}},isTeacherMode:true,t,handleNoteUpdate:vi.fn()});const enable=host.querySelector('[data-help-key="anchor_chart_interactive_mode_toggle"]');act(()=>enable.click());const dialog=host.querySelector('[role=dialog]');expect(dialog.textContent).toContain('Student response mode');expect(dialog.textContent).not.toContain('Arm for');expect(dialog.querySelector('[data-anchor-student-preview]').textContent).toContain('Evaporation');expect(dialog.querySelector('[data-anchor-student-preview]').textContent).not.toContain('SECRET REFERENCE ANSWER');});
 it('localizes the entire response setup rather than embedding English button text',()=>{const translations={'anchor_chart.response_mode':'MODE TEST','anchor_chart.enable_responses':'ENABLE TEST','anchor_chart.response_rubric':'CRITERIA TEST','common.cancel':'CANCEL TEST'};const tr=k=>translations[k]||k;const {host}=mount(window.AlloModules.AnchorChartView,{generatedContent:{id:'ac2',type:'anchor-chart',data:{sections:[],interactive:{armed:false}}},isTeacherMode:true,t:tr,handleNoteUpdate:vi.fn()});act(()=>host.querySelector('[data-help-key="anchor_chart_interactive_mode_toggle"]').click());const dialog=host.querySelector('[role=dialog]');expect(dialog.textContent).toContain('MODE TEST');expect(dialog.textContent).toContain('ENABLE TEST');expect(dialog.textContent).toContain('CANCEL TEST');expect(dialog.querySelector('textarea').getAttribute('aria-label')).toBe('CRITERIA TEST');});
 it('describes Math practice separately from the STEAM Lab and preserves the existing Analysis customization',()=>{const catalog=window.AlloModules.ToolCatalog;expect(catalog.getToolEntry('math').description).toContain('Generates math practice problems');expect(catalog.getToolEntry('math').whenToUse).toContain('arithmetic');expect(catalog.getToolEntry('analysis').whenToUse).toBe('Include first only when the exact current source has not been checked. Reuse an existing source check.');});
});
