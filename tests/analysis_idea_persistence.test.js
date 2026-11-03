import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act,Simulate}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let View,root,host,serial=0;
beforeAll(()=>{
  global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
  loadAlloModule('instructional_context_module.js');
  loadAlloModule(resolve(process.env.CLASSROOM_DRAFT_CANDIDATES||'.','view_analysis_module.js'));
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

function persistent(generate){const p=twoIdeas(generate);let saved=p.generatedContent;p.onUpdateResource=(id,updater)=>{if(saved.id===id)saved=updater(saved);};return {p,saved:()=>JSON.parse(JSON.stringify(saved)),refresh(){close();delete window.AlloModules.AnalysisView;new Function(readFileSync(resolve(process.env.CLASSROOM_DRAFT_CANDIDATES||'.','view_analysis_module.js'),'utf8'))();View=window.AlloModules.AnalysisView;p.generatedContent=JSON.parse(JSON.stringify(saved));render(p);}};}
it('restores every idea and resource choice from the saved report in a fresh module after refresh',()=>{const t=persistent();render(t.p);choose(0);editInstructions('Remember first instructions.','quiz');choose(1);editInstructions('Remember second instructions.','outline');const before=t.saved();t.refresh();expect(instructions()).toBe('Remember second instructions.');expect(host.querySelector('form select').value).toBe('outline');choose(0);expect(instructions()).toBe('Remember first instructions.');expect(host.querySelector('form select').value).toBe('quiz');const {analysisIdeaDrafts,...report}=before.data;expect(report).toEqual(t.p.generatedContent.data && (({analysisIdeaDrafts,...x})=>x)(t.p.generatedContent.data));expect(analysisIdeaDrafts.drafts).toHaveLength(2);});
it('recovers an interrupted request as editable without automatically generating again',()=>{const generate=vi.fn(()=>new Promise(()=>{})),t=persistent(generate);render(t.p);choose(0);editInstructions('Keep interrupted request.');submit();expect(t.saved().data.analysisIdeaDrafts.drafts[0].pending).toBe(true);t.refresh();expect(instructions()).toBe('Keep interrupted request.');expect(host.textContent).toContain('Generation did not finish');expect(generate).toHaveBeenCalledTimes(1);expect(host.querySelector('form textarea').disabled).toBe(false);});
it('does not reuse persisted instructions when source text changed',()=>{const t=persistent();render(t.p);choose(0);editInstructions('For old text only.');t.p.onUpdateResource(t.p.generatedContent.id,p=>({...p,data:{...p.data,originalText:'Completely different passage.'}}));t.refresh();choose(0);expect(instructions()).toBe('Discuss plants');});
it('removes only a successful idea from persisted drafts',async()=>{const t=persistent(vi.fn(async()=>({id:'quiz',type:'quiz'})));render(t.p);choose(1);editInstructions('Keep other idea.','outline');choose(0);editInstructions('Submitted idea.');submit();await flush();t.refresh();expect(host.querySelector('form')).toBeNull();choose(1);expect(instructions()).toBe('Keep other idea.');expect(t.saved().data.analysisIdeaDrafts.drafts).toHaveLength(1);});
