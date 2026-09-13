import {beforeAll,describe,expect,it} from 'vitest';
import {loadAlloModule} from './setup.js';
let pipeline,AC;
beforeAll(()=>{window.React=window.React||{};loadAlloModule('applied_challenge_module.js');loadAlloModule('doc_pipeline_module.js');AC=window.AlloModules.AppliedChallenge;pipeline=window.AlloModules.createDocPipeline({callGemini:async()=>'{}',callGeminiVision:async()=>'{}',callImagen:async()=>null,addToast:()=>{},t:key=>key,isRtlLang:()=>false,updateExportPreview:()=>{},getDefaultTitle:()=>'Document',state:{}});});
const resource=()=>({id:'print-challenge',type:'applied-challenge',data:AC.normalize({title:'Water planning',sourceExcerpt:'PRIVATE SOURCE SENTINEL',plan:{materials:'Trays and water'},brief:{context:'A fictional garden comparison.',drivingQuestion:'Which plan should we test?',lockedLessonFacts:['Water can infiltrate soil.','Water can run off.'],criteria:['Compare options.'],constraints:['Use classroom materials.'],deliverable:'A reasoned recommendation.',factVerified:true},workspace:{workingQuestion:'Which plan should we try?',response:'STUDENT RESPONSE SENTINEL',artifactUrl:'https://example.org/student-work',artifactDescription:'A diagram showing my two options.'},feedback:{strength:'FEEDBACK SENTINEL',nextStep:'Check the soil.'}})});
const render=(item,extra={})=>pipeline.generateFullPackHTML([item],'Water planning',true,{}, {includeTeacherKey:false,annotations:[],pageSize:'a4',pageOrientation:'landscape',fontSize:20,...extra});
describe('Applied challenge print handoff',()=>{
 it.each(['task','paper','response','teacher'])('renders %s through the document pipeline without learner runtime',preset=>{
  const item=resource();item.data.appliedChallengeExportPreset=preset;const html=render(item);const doc=new DOMParser().parseFromString(html,'text/html');
  expect(doc.querySelector('[data-applied-preset]')?.getAttribute('data-applied-preset')).toBe(preset);expect(doc.querySelector('script,input,textarea')).toBeNull();expect(html).not.toContain('PRIVATE SOURCE SENTINEL');expect(html).toContain('size:a4 landscape');expect(html).toContain('font-size:20px');
  if(['task','paper'].includes(preset)){expect(html).not.toContain('STUDENT RESPONSE SENTINEL');expect(html).not.toContain('FEEDBACK SENTINEL');expect(html).not.toContain('https://example.org/student-work');expect(doc.querySelectorAll('.aps-copy-lines').length).toBeGreaterThan(5);}
  else{expect(html).toContain('STUDENT RESPONSE SENTINEL');expect(html).toContain('https://example.org/student-work');expect(html.includes('FEEDBACK SENTINEL')).toBe(preset==='teacher');}
 });
 it('keeps export exclusion effective with a dedicated preset',()=>{const item=resource();item.data.appliedChallengeExportPreset='response';expect(render(item,{includeAppliedChallenge:false})).not.toContain('STUDENT RESPONSE SENTINEL');});
 it('keeps the compact check and artifact when the UI module is unavailable',()=>{
  const item=resource();item.data.scope='compact';item.data.workspace.testReflection='FALLBACK CHECK';item.data.workspace.revision='FALLBACK REVISION';item.data.evidenceLedger=[{id:'legacy',claim:'A claim',evidence:'A connection',status:'verified'}];
  const module=window.AlloModules.AppliedChallenge;
  try{delete window.AlloModules.AppliedChallenge;const html=render(item);expect(html).toContain('FALLBACK CHECK');expect(html).toContain('FALLBACK REVISION');expect(html).toContain('https://example.org/student-work');const doc=new DOMParser().parseFromString(html,'text/html');expect(doc.querySelector('.ace-ledger').textContent).not.toContain('Verified lesson evidence');expect(doc.querySelector('.ace-ledger').textContent).toContain('Needs checking');}finally{window.AlloModules.AppliedChallenge=module;}
 });
 it('includes current source connections and reviewed visuals in the existing full export',()=>{
  const item=resource(),fact=item.data.brief.factSources[0];item.data.evidenceLedger=[{id:'row',claim:'Try slow watering.',evidence:'Give water time to soak in.',factId:fact.id,factRevision:fact.revision,status:'verified'}];item.data.visual={image:'https://example.org/garden.png',alt:'Garden scenario illustration',reviewed:true,purpose:'Show the setting'};
  const html=render(item);const doc=new DOMParser().parseFromString(html,'text/html');expect(doc.querySelector('.ace-ledger').textContent).toContain('Linked lesson fact:');expect(doc.querySelector('.ace-ledger').textContent).toContain(fact.text);expect(doc.querySelector('.applied-challenge-export img[alt="Garden scenario illustration"]')).toBeTruthy();
  item.data.visual.reviewed=false;expect(render(item)).not.toContain('https://example.org/garden.png');
 });
});

it('retains feedback input coverage in teacher print, full export and the module-free fallback',()=>{
 const item=resource();item.data.feedback.coverage={version:1,workspaceFields:2,evidenceRows:12,validationChecks:6,selfChecks:3,shortenedFields:4};
 expect(AC.renderPreset(item.data,'teacher')).toContain('12 evidence rows');
 expect(render(item)).toContain('4 long text fields were shortened');
 const module=window.AlloModules.AppliedChallenge;
 try{delete window.AlloModules.AppliedChallenge;expect(render(item)).toContain('12 evidence rows');expect(render(item)).toContain('4 long text fields were shortened');}finally{window.AlloModules.AppliedChallenge=module;}
});
