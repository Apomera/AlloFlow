import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act,Simulate}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let View,root,host,serial=0;
beforeAll(()=>{
  global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
  loadAlloModule('instructional_context_module.js');
  loadAlloModule(resolve(process.env.CLASSROOM_PRESERVE_CANDIDATES||'.','view_analysis_module.js'));
  View=window.AlloModules.AnalysisView;
});
function close(){if(root)act(()=>root.unmount());root=null;host?.remove();}
afterEach(close);
function props(generate=vi.fn(), id='idea-'+(++serial)){
  const noop=()=>{};
  return {generatedContent:{id,type:'analysis',data:{originalText:'Plants need water.',sourceLanguage:'English',reportLanguage:'English',analysisTargets:{grade:'5th Grade',dok:'Level 2'},readingLevel:{range:'5th Grade',explanation:'Synthetic'},localStats:{score:5,words:3,syllables:4,sentences:1},concepts:[],accuracy:{rating:'High',discrepancies:[],verifiedFacts:[]},grammar:[],depthOfKnowledge:{level:2,reason:'Apply concepts',ideas:['Discuss plants']}}},
    isTeacherMode:true,isProcessing:false,isEditingAnalysis:false,sourceRefineInstruction:'',selectedDiscrepancies:new Set(),selectedGrammarErrors:new Set(),analysisEditorRef:{current:null},t:()=>'',formatInlineText:x=>x,renderFormattedText:x=>x,splitReferencesFromBody:x=>({body:x,references:''}),BilingualFieldRenderer:p=>React.createElement('span',null,p.text),SourceReferencesPanel:()=>null,setGeneratedContent:noop,setInputText:noop,setIsProcessing:noop,setSelectedGrammarErrors:noop,setSourceRefineInstruction:noop,handleFormatText:noop,handleToggleIsEditingAnalysis:noop,handleAnalysisTextChange:noop,handleAiRefineSource:noop,handleAutoCorrectSource:noop,handleDownloadAudio:noop,addToast:noop,onGenerateFromIdea:generate};
}
function render(p){if(!root){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}act(()=>root.render(React.createElement(View,p)));}
const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes(text));
function customize(){act(()=>button('Use this idea').click());const form=host.querySelector('form');act(()=>{Simulate.change(form.querySelector('select'),{target:{value:'quiz'}});});act(()=>Simulate.change(form.querySelector('textarea'),{target:{value:'Use three short questions and familiar examples.'}}));}
const submit=()=>act(()=>host.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
const flush=async()=>act(async()=>{for(let i=0;i<12;i++)await Promise.resolve();});
const instructions=()=>host.querySelector('form textarea')?.value;
it.each(['reject','empty'])('keeps custom instructions and resource choice after %s generation',async mode=>{
  const generate=mode==='reject'?vi.fn().mockRejectedValue(Error('offline')):vi.fn().mockResolvedValue(undefined);
  const p=props(generate),before=JSON.stringify(p.generatedContent);render(p);customize();submit();await flush();
  expect(instructions()).toBe('Use three short questions and familiar examples.');expect(host.querySelector('form select').value).toBe('quiz');
  expect(host.textContent).toContain('Generation did not finish');expect(JSON.stringify(p.generatedContent)).toBe(before);
  close();render(p);expect(instructions()).toBe('Use three short questions and familiar examples.');
});
it('does not submit twice while pending and clears only after a matching resource exists',async()=>{
  let finish;const generate=vi.fn(()=>new Promise(resolve=>finish=resolve));const p=props(generate);render(p);customize();submit();submit();expect(generate).toHaveBeenCalledOnce();
  await act(async()=>finish({id:'created-quiz',type:'quiz'}));await flush();expect(host.querySelector('form')).toBeNull();
  close();render(p);expect(host.querySelector('form')).toBeNull();
});
it('a reopened view receives the pending request outcome',async()=>{
  let finish;const p=props(()=>new Promise(resolve=>finish=resolve));render(p);customize();submit();close();render(p);
  await act(async()=>finish(undefined));await flush();expect(instructions()).toBe('Use three short questions and familiar examples.');expect(host.textContent).toContain('Generation did not finish');
});
it('a late outcome from another report cannot erase the current report draft',async()=>{
  let finish;const first=props(()=>new Promise(resolve=>finish=resolve)),second=props();render(first);customize();submit();render(second);customize();
  await act(async()=>finish({id:'created-first',type:'quiz'}));await flush();expect(instructions()).toBe('Use three short questions and familiar examples.');
  expect(second.onGenerateFromIdea).not.toHaveBeenCalled();render({...first,generatedContent:{...first.generatedContent,data:{...first.generatedContent.data,originalText:'A different source.'}}});expect(host.querySelector('form')).toBeNull();
});
