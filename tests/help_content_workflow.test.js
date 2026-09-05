import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseExpression } from '@babel/parser';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
const helpSource=readFileSync('help_strings.js','utf8');
const help=new Function('return ('+helpSource+')')();
const ui=JSON.parse(readFileSync('ui_strings.js','utf8'));
const shell=readFileSync('AlloFlowANTI.txt','utf8');
const t=(key,options)=>key.split('.').reduce((value,part)=>value?.[part],ui)||options?.defaultValue||'';
let React,createRoot,act,Guided,Directions,root,host,helpHandler;
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));
 ({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));
 ({act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 loadAlloModule('view_guided_mode_banner_module.js');loadAlloModule('view_directions_composer_module.js');
 Guided=window.AlloModules.GuidedModeBanner.GuidedModeBanner;Directions=window.AlloModules.DirectionsComposer.DirectionsComposerView;
});
afterEach(()=>{if(helpHandler)document.removeEventListener('click',helpHandler,true);helpHandler=null;if(root)act(()=>root.unmount());host?.remove();root=host=null;localStorage.clear();});
function mount(View,props){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);act(()=>root.render(React.createElement(View,props)));}
function helpMode(){
 const start=shell.indexOf('    const handleHelpClick = (e) => {'),end=shell.indexOf("    document.addEventListener('click', handleHelpClick, true);",start);
 const show=vi.fn();helpHandler=new Function('t','_helpLookup','showSpotlight','setTimeout',`const DOM_TO_TOOL_ID_MAP={},currentUiLanguage='English',tourSteps=[];const warnLog=()=>{},setExpandedTools=()=>{};${shell.slice(start,end)}return handleHelpClick;`)(t,key=>help[key],show,fn=>{fn();return 1;});
 document.addEventListener('click',helpHandler,true);return show;
}
function guided(extra={}){
 const next=vi.fn(),input=vi.fn();const steps=[{id:'source-input',label:'Source',action:'Add source text'},{id:'analysis',label:'Analysis',action:'Analyze the text'},{id:'faq',label:'Questions'}];
 mount(Guided,{GUIDED_STEPS:steps,allGuidedSteps:steps,GUIDED_TOUR_MAP:{},guidedStep:1,guidedCompletedIds:['analysis'],guidedSkippedIds:[],guidedCreatedHistoryIds:[],history:[],tourSteps:[],inputText:'A source passage.',t,handleExitGuidedMode:vi.fn(),handleGuidedSkip:next,setGuidedStep:vi.fn(),setShowGuidedTip:vi.fn(),toggleGuidedStepId:vi.fn(),getDefaultTitle:x=>x,markGuidedStepDone:vi.fn(),setInputText:input,...extra});return {next,input};
}
function directions(){
 const draft=vi.fn(),add=vi.fn(),Icon=()=>React.createElement('span');
 mount(Directions,{ArrowRight:Icon,ClipboardList:Icon,Sparkles:Icon,X:Icon,_alloDirectionsGoalResources:[],_alloGoalOptionsForResource:()=>[],_alloStationStyle:()=>({}),_mbDirectionsChoiceDraftChoices:[],_mbDirectionsChoicePreviewItems:[],_mbDirectionsChoiceReady:false,_mbDirectionsChoiceStaleCount:0,addDirectionsToPack:add,deriveDirectionsDraft:draft,directionsDeriving:false,generateUUID:()=> 'goal',mbDirectionsDraft:{title:'Reading assignment',body:'Read and explain.',objectives:[],choiceBoard:{enabled:false,choices:[]}},setMbDirectionsDraft:vi.fn(),setShowDirectionsChoicePreview:vi.fn(),setShowDirectionsComposer:vi.fn(),showDirectionsChoicePreview:false,t});return {draft,add};
}
describe('Help catalog integrity and classroom workflow coverage',()=>{
 it('has no shadowed duplicate definitions or empty help text',()=>{
  const keys=parseExpression(helpSource).properties.map(p=>p.key.name||p.key.value);
  expect(new Set(keys).size).toBe(keys.length);
  expect(Object.values(help).every(text=>typeof text==='string'&&text.trim())).toBe(true);
 });
 it.each(['view_guided_mode_banner_source.jsx','view_directions_composer_source.jsx','view_export_preview_source.jsx'])('defines the literal help anchors in %s',file=>{
  const keys=[...readFileSync(file,'utf8').matchAll(/data-help-key="([^"]+)"/g)].map(m=>m[1]);expect(keys.length).toBeGreaterThan(0);
  for(const key of keys)expect(typeof (ui.help_mode?.[key]||help[key]),key).toBe('string');
 });
 it('describes directions drafting and saving instead of claiming this is tool documentation',()=>{
  expect(help.tool_directions).toContain('Assignment Directions');expect(help.tool_directions).toContain('Draft for me');expect(help.tool_directions).toContain('Add to pack');expect(help.tool_directions).not.toContain('short directions for the tool');
 });
 it('distinguishes print output and learner preview from completed delivery',()=>{
  expect(help.doc_builder_export_action).toContain('browser');expect(help.export_pdf).toContain('print window');expect(help.guided_learner_preview).toContain('does not create an export');expect(help.export_ims).not.toContain('most reliable');
 });
});
describe('Help Mode on real classroom controls',()=>{
 it('shows specific Customize help rather than its enclosing banner and does not open the picker',()=>{
  guided();const show=helpMode(),button=host.querySelector('[data-help-key="guided_customize"]');
  act(()=>button.querySelector('span').click());
  expect(show).toHaveBeenCalledWith(button,'Customize included steps',help.guided_customize);
  expect(button.getAttribute('aria-expanded')).toBe('false');expect(host.querySelector('#guided-step-picker')).toBeNull();
 });
 it('explains Next without advancing, then permits normal navigation after Help Mode ends',()=>{
  const h=guided(),show=helpMode(),button=host.querySelector('[data-help-key="guided_next_step"]');
  act(()=>button.click());expect(show).toHaveBeenCalledWith(button,'Continue to the next step',help.guided_next_step);expect(h.next).not.toHaveBeenCalled();
  document.removeEventListener('click',helpHandler,true);helpHandler=null;act(()=>button.click());expect(h.next).toHaveBeenCalledWith(false);
 });
 it('explains the sample without replacing source text',()=>{
  const h=guided({guidedStep:0,guidedCompletedIds:[],inputText:''}),show=helpMode(),button=host.querySelector('[data-help-key="guided_example_source"]');
  act(()=>button.click());expect(show).toHaveBeenCalledWith(button,'Try a sample passage',help.guided_example_source);expect(h.input).not.toHaveBeenCalled();
 });
 it.each([['directions_draft','Draft directions from the lesson','draft'],['directions_add_pack','Add reviewed directions to the pack','add']])('explains %s without triggering the action', (key,title,action)=>{
  const h=directions(),show=helpMode(),button=host.querySelector('[data-help-key="'+key+'"]');act(()=>button.click());expect(show).toHaveBeenCalledWith(button,title,help[key]);expect(h[action]).not.toHaveBeenCalled();
  document.removeEventListener('click',helpHandler,true);helpHandler=null;act(()=>button.click());expect(h[action]).toHaveBeenCalledTimes(1);
 });
 it('gives field-specific due-label help inside the composer',()=>{
  directions();const show=helpMode(),input=host.querySelector('[data-help-key="directions_due"]');act(()=>input.click());expect(show).toHaveBeenCalledWith(input,'Due label',help.directions_due);
 });
});
