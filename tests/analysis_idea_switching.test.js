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
  loadAlloModule(resolve(process.env.CLASSROOM_CONTINUITY_CANDIDATES||'.','view_analysis_module.js'));
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

const ideaButtons=()=>[...host.querySelectorAll('button')].filter(b=>b.textContent==='Use this idea');
const choose=index=>act(()=>ideaButtons()[index].click());
function editInstructions(text,type='quiz'){const f=host.querySelector('form');act(()=>Simulate.change(f.querySelector('select'),{target:{value:type}}));act(()=>Simulate.change(f.querySelector('textarea'),{target:{value:text}}));}
function twoIdeas(generate){const p=props(generate);p.generatedContent.data.depthOfKnowledge.ideas=['Discuss plants','Compare roots'];return p;}
it('keeps different instructions and resource choices when switching and collapsing ideas',()=>{
 const p=twoIdeas();render(p);choose(0);editInstructions('Keep my first custom task.','quiz');choose(1);editInstructions('Keep my second custom task.','outline');
 choose(0);expect(instructions()).toBe('Keep my first custom task.');expect(host.querySelector('form select').value).toBe('quiz');choose(0);expect(host.querySelector('form')).toBeNull();choose(1);expect(instructions()).toBe('Keep my second custom task.');
 close();render(p);expect(instructions()).toBe('Keep my second custom task.');choose(0);expect(instructions()).toBe('Keep my first custom task.');
});
it('failure and success affect only the submitted idea',async()=>{
 const generate=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({id:'new-quiz',type:'quiz'});render(twoIdeas(generate));choose(1);editInstructions('Keep the other idea.','outline');choose(0);editInstructions('Retry this idea.');submit();await flush();
 choose(1);expect(instructions()).toBe('Keep the other idea.');choose(0);expect(instructions()).toBe('Retry this idea.');expect(host.textContent).toContain('Generation did not finish');submit();await flush();expect(host.querySelector('form')).toBeNull();choose(1);expect(instructions()).toBe('Keep the other idea.');
});
it('separates drafts by report and exact source',()=>{
 const first=twoIdeas(),second=twoIdeas();render(first);choose(0);editInstructions('First report only.');render(second);choose(0);expect(instructions()).toBe('Discuss plants');editInstructions('Second report only.');render(first);expect(instructions()).toBe('First report only.');
 render({...first,generatedContent:{...first.generatedContent,data:{...first.generatedContent.data,originalText:'New source.'}}});choose(0);expect(instructions()).toBe('Discuss plants');
});
