// "Use this idea" through the REAL host launcher (handleGenerate sliced from ANTI),
// with the analysis view saving its pending draft into history as it does in the app.
import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const shell=readFileSync(process.env.ANTI_SOURCE||'AlloFlowANTI.txt','utf8');
const start=shell.indexOf('  const handleGenerate = (...args) => ');
const end=shell.indexOf('  generationSourceChoiceContextRef.current = ',start);
if(start<0||end<0)throw new Error('handleGenerate not found');
const createGenerate=new Function('generationSourceChoiceContextRef','_alloAwaitModules','_alloRunGenerate',shell.slice(start,end)+'; return handleGenerate;');
let View,root,host;
beforeAll(()=>{
  global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('view_analysis_module.js');
  View=window.AlloModules.AnalysisView;
});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();});
let serial=0;
const makeReport=()=>({id:'report-'+(++serial),type:'analysis',data:{originalText:'Plants need water.',sourceLanguage:'English',reportLanguage:'English',analysisTargets:{grade:'5th Grade',dok:'Level 2'},readingLevel:{range:'5th Grade',explanation:'Synthetic'},localStats:{score:5,words:3,syllables:4,sentences:1},concepts:[],accuracy:{rating:'High',discrepancies:[],verifiedFacts:[]},grammar:[],depthOfKnowledge:{level:2,reason:'Apply concepts',ideas:['Discuss plants']}}});
let switchLesson;
function mount(awaitModules){
  const report=makeReport();
  const run=vi.fn(async type=>({id:'made-'+type,type}));
  const ref={current:null};
  const generate=createGenerate(ref,awaitModules,run);
  function Host(){
    const [history,setHistory]=React.useState([report]);
    switchLesson=()=>setHistory([{...report,id:'other-lesson'}]);
    const generatedContent=history.find(item=>item.id===report.id)||report;
    // ANTI refreshes this ref on every render.
    ref.current={history,inputText:'Plants need water.',activeUnitId:'lesson',activeView:'analysis',isTeacherMode:true};
    const noop=()=>{};
    return React.createElement(View,{generatedContent,isTeacherMode:true,isProcessing:false,isEditingAnalysis:false,sourceRefineInstruction:'',selectedDiscrepancies:new Set(),selectedGrammarErrors:new Set(),analysisEditorRef:{current:null},t:()=>'',formatInlineText:x=>x,renderFormattedText:x=>x,splitReferencesFromBody:x=>({body:x,references:''}),BilingualFieldRenderer:p=>React.createElement('span',null,p.text),SourceReferencesPanel:()=>null,setGeneratedContent:noop,setInputText:noop,setIsProcessing:noop,setSelectedGrammarErrors:noop,setSourceRefineInstruction:noop,handleFormatText:noop,handleToggleIsEditingAnalysis:noop,handleAnalysisTextChange:noop,handleAiRefineSource:noop,handleAutoCorrectSource:noop,handleDownloadAudio:noop,addToast:noop,
      onUpdateResource:(id,updater)=>{setHistory(items=>items.map(item=>item.id===id?updater(item):item));return true;},
      onGenerateFromIdea:(type,instructions)=>generate(type,null,false,report.data.originalText,{customInstructions:instructions},true)});
  }
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  act(()=>root.render(React.createElement(Host)));
  return run;
}
const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes(text));
const flush=async()=>act(async()=>{for(let i=0;i<20;i++)await Promise.resolve();});
it.each([
  ['already loaded',()=>Promise.resolve()],
  ['still loading',()=>new Promise(r=>setTimeout(r,5))],
])('Generate resource starts the generator when modules are %s',async(_,awaitModules)=>{
  const run=mount(awaitModules);
  act(()=>button('Use this idea').click());
  act(()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await act(async()=>{await new Promise(r=>setTimeout(r,20));});await flush();
  expect(run).toHaveBeenCalledOnce();
  expect(run.mock.calls[0][0]).toBe('brainstorm');
  expect(run.mock.calls[0][4].customInstructions).toBe('Discuss plants');
  expect(host.textContent).not.toContain('Generation did not finish');
  expect(host.querySelector('form')).toBeNull();
});
it('still drops the request when a different lesson loads while the generator is getting ready',async()=>{
  let ready;const run=mount(()=>new Promise(r=>{ready=r;}));
  act(()=>button('Use this idea').click());
  act(()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  act(()=>switchLesson());
  await act(async()=>{ready();});await flush();
  expect(run).not.toHaveBeenCalled();
});
