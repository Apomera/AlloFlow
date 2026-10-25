import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
let React,createRoot,act,View,phase,pure,textUtility,root,host;
beforeAll(()=>{
  React=require(resolve('desktop/web-app/node_modules/react'));({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));act=React.act;
  globalThis.React=window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  window.AlloIcons=new Proxy({},{get:()=>()=>null});
  for(const file of ['instructional_context_module.js','text_pipeline_helpers_module.js','phase_n_misc_helpers_module.js','text_utility_helpers_module.js'])loadAlloModule(file);
  phase=window.AlloModules.PhaseNHelpers;pure=window.AlloModules.PureHelpers;textUtility=window.AlloModules.TextUtilityHelpers;
  new Function(readFileSync(resolve(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js'),'utf8'))();
  new Function(readFileSync(resolve(process.env.ALLO_HOST_CANDIDATE || 'host_handlers_module.js'),'utf8'))();
  View=window.AlloModules.SimplifiedView;
});
beforeEach(()=>{
  window.AlloModules.PhaseNHelpers=phase;
  window.AlloModules.PureHelpers=pure;window.AlloModules.TextUtilityHelpers=textUtility;
  window.__alloModuleRegistry={PhaseNHelpersModule:{status:'pending'},PureHelpersModule:{status:'pending'},TextUtilityHelpersModule:{status:'pending'}};
  window.__alloPromoteModule=vi.fn(()=>true);
});
afterEach(()=>{
  if(root)act(()=>root.unmount());host?.remove();root=null;host=null;
  window.AlloModules.PhaseNHelpers=phase;window.AlloModules.PureHelpers=pure;window.AlloModules.TextUtilityHelpers=textUtility;delete window.__alloModuleRegistry;delete window.__alloPromoteModule;
  vi.restoreAllMocks();vi.useRealTimers();document.body.innerHTML='';
});
const notify=()=>window.dispatchEvent(new CustomEvent('alloflow:module-registry-changed'));
function mountReader(){
  const noop=()=>{},text='A proposal can stay the same when its reasons address another idea.';
  const generatedContent=window.AlloModules.InstructionalContext.createSupportedReading(text,{id:'test-reading'});
  const props={ComplexityGauge:()=>null,setComplexityLevel:noop,setSaveOriginalOnAdjust:noop,setReadingTheme:noop,setSelectionMenu:noop,setIsCustomReviseOpen:noop,setInteractionMode:noop,setIsCompareMode:noop,setIsFluencyMode:noop,stopPlayback:noop,closeDefinition:noop,closePhonics:noop,closeRevision:noop,handleToggleIsEditingLeveledText:noop,t:k=>k,generatedContent,inputText:'',gradeLevel:'6',leveledTextLanguage:'English',studentInterests:[],selectedVoice:'Kore',voiceSpeed:1,isTeacherMode:false,isEditingLeveledText:false,isImmersiveReaderActive:false,isCompareMode:false,isSideBySide:false,isZenMode:true,isProcessing:false,isPlaying:false,interactionMode:'read',history:[],textEditorRef:React.createRef(),splitTextToSentences:s=>pure.splitTextToSentences(s,{}),getSideBySideContent:()=>null,handleFormatText:noop,handleSimplifiedTextChange:noop,callTTS:noop,handleSpeak:noop,handleWordClick:noop,handleQuickAddGlossary:noop,handlePhonicsClick:noop,isLineFocusMode:false,focusedParagraphIndex:null,setFocusedParagraphIndex:noop,cursorStyles:{read:'',define:'','add-glossary':'',revise:''},getContentDirection:()=> 'ltr',isRtlLang:()=>false,renderFormattedText:s=>s,formatInteractiveText:(s,cloze)=>window.AlloModules.PhaseNHelpers.formatInteractiveText(s,cloze,false,{highlightGlossaryTerms:x=>x,latestGlossary:[],MathSymbol:({text})=>text}),SourceReferencesPanel:()=>null,playbackState:{currentIdx:-1},handleTextMouseUp:noop,highlightGlossaryTerms:x=>x,latestGlossary:[]};
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  act(()=>root.render(React.createElement(View,props)));return{text,props};
}
describe('reader formatter dependency boundary',()=>{
  it('promotes all missing hard render dependencies together and waits for all of them',()=>{
    delete window.AlloModules.PhaseNHelpers;delete window.AlloModules.PureHelpers;delete window.AlloModules.TextUtilityHelpers;
    const{text}=mountReader();expect(window.__alloPromoteModule.mock.calls.map(call=>call[0]).sort()).toEqual(['PhaseNHelpersModule','PureHelpersModule','TextUtilityHelpersModule']);
    act(()=>{window.AlloModules.PhaseNHelpers=phase;notify();});expect(host.textContent).not.toContain(text);
    act(()=>{window.AlloModules.PureHelpers=pure;notify();});expect(host.textContent).not.toContain(text);
    act(()=>{window.AlloModules.TextUtilityHelpers=textUtility;notify();});expect(host.textContent).toContain(text);
  });
  it('preserves standalone renderers with injected functions and no host loader',()=>{delete window.__alloModuleRegistry;delete window.__alloPromoteModule;delete window.AlloModules.TextUtilityHelpers;const{text}=mountReader();expect(host.textContent).toContain(text);});
  it('shows the reader immediately when its formatter is already present',()=>{const{text}=mountReader();expect(host.textContent).toContain(text);expect(host.querySelector('[data-reader-dependency-state]')).toBeNull();expect(window.__alloPromoteModule).not.toHaveBeenCalled();});
  it('promotes a delayed helper and renders after its registry notification',()=>{
    delete window.AlloModules.PhaseNHelpers;const{text}=mountReader();expect(host.querySelector('[role="status"]')).toBeTruthy();expect(host.textContent).not.toContain(text);expect(window.__alloPromoteModule).toHaveBeenCalledWith('PhaseNHelpersModule');
    act(()=>{window.AlloModules.PhaseNHelpers=phase;window.__alloModuleRegistry.PhaseNHelpersModule.status='loaded';notify();});expect(host.textContent).toContain(text);expect(host.querySelector('[data-reader-dependency-state]')).toBeNull();
  });
  it('rechecks a helper registered synchronously by promotion',()=>{delete window.AlloModules.PhaseNHelpers;window.__alloPromoteModule=vi.fn(()=>{window.AlloModules.PhaseNHelpers=phase;return true;});const{text}=mountReader();expect(host.textContent).toContain(text);});
  it('rechecks an already fulfilled promotion promise without requiring an event',async()=>{
    delete window.AlloModules.PhaseNHelpers;window.__alloPromoteModule=vi.fn(()=>Promise.resolve().then(()=>{window.AlloModules.PhaseNHelpers=phase;}));const{text}=mountReader();await act(async()=>{await Promise.resolve();await Promise.resolve();});expect(host.textContent).toContain(text);
  });
  it('shows a recoverable failure and retries the exact helper',()=>{
    delete window.AlloModules.PhaseNHelpers;mountReader();act(()=>{window.__alloModuleRegistry.PhaseNHelpersModule.status='failed';notify();});expect(host.querySelector('[role="alert"]')).toBeTruthy();
    window.__alloPromoteModule=vi.fn(()=>{window.AlloModules.PhaseNHelpers=phase;window.__alloModuleRegistry.PhaseNHelpersModule.status='loaded';return true;});act(()=>host.querySelector('button').click());expect(window.__alloPromoteModule).toHaveBeenCalledWith('PhaseNHelpersModule');expect(host.querySelector('[data-original-source]')).toBeTruthy();
  });
  it('does not stay loading when promotion cannot start',()=>{delete window.AlloModules.PhaseNHelpers;window.__alloPromoteModule=vi.fn(()=>false);mountReader();expect(host.querySelector('[role="alert"]')).toBeTruthy();expect(host.querySelector('button').textContent).toBe('Retry');});
  it('does not stay loading after a rejected promotion',async()=>{delete window.AlloModules.PhaseNHelpers;window.__alloPromoteModule=vi.fn(()=>Promise.reject(new Error('network unavailable')));mountReader();await act(async()=>{await Promise.resolve();await Promise.resolve();});expect(host.querySelector('[role="alert"]')).toBeTruthy();});
  it('treats a loaded module without the formatter as a recoverable failure',()=>{delete window.AlloModules.PhaseNHelpers;window.__alloModuleRegistry.PhaseNHelpersModule.status='loaded';mountReader();expect(host.querySelector('[role="alert"]')).toBeTruthy();});
  it.each([
    ['PureHelpersModule','PureHelpers','splitTextToSentences'],
    ['PureHelpersModule','PureHelpers','diffWords'],
    ['PhaseNHelpersModule','PhaseNHelpers','formatInteractiveText'],
    ['TextUtilityHelpersModule','TextUtilityHelpers','highlightGlossaryTerms']
  ])('requires and retries the exact missing %s export %s.%s',(key,name,method)=>{
    const complete=window.AlloModules[name];window.AlloModules[name]={...complete,[method]:undefined};window.__alloModuleRegistry[key].status='loaded';
    mountReader();expect(host.querySelector('[role="alert"]')).toBeTruthy();expect(window.__alloPromoteModule.mock.calls.map(call=>call[0])).toEqual([key]);
    window.__alloPromoteModule=vi.fn(requested=>{expect(requested).toBe(key);window.AlloModules[name]=complete;return true;});
    act(()=>host.querySelector('button').click());expect(window.__alloPromoteModule).toHaveBeenCalledTimes(1);expect(host.querySelector('[data-original-source]')).toBeTruthy();
  });
  it('cleans its listener and ignores late resolution after leaving the reader',async()=>{
    delete window.AlloModules.PhaseNHelpers;let finish;window.__alloPromoteModule=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));const add=vi.spyOn(window,'addEventListener'),remove=vi.spyOn(window,'removeEventListener');mountReader();
    const callback=add.mock.calls.find(([name])=>name==='alloflow:module-registry-changed')[1];act(()=>root.unmount());root=null;expect(remove).toHaveBeenCalledWith('alloflow:module-registry-changed',callback);
    await act(async()=>{window.AlloModules.PhaseNHelpers=phase;finish(true);notify();await Promise.resolve();});expect(host.textContent).toBe('');
  });
});
function navigationFixture(){
  vi.useFakeTimers();const container=document.createElement('div');container.className='overflow-y-auto';container.scrollTop=87;const content=document.createElement('article');container.appendChild(content);document.body.appendChild(container);
  const current={id:'first',type:'directions'},next={id:'second',type:'simplified'},ref={current:content};
  const deps={getFilteredHistory:()=>[current,next],generatedContent:current,contentRef:ref,setIsMapLocked:vi.fn(),setGeneratedContent:vi.fn(),setActiveView:vi.fn(),setStickers:vi.fn(),stopPlayback:vi.fn(),_alloFollowResourceLive:vi.fn(),t:k=>k};
  const handlers=window.AlloModules.createHostHandlers(deps);handlers.handleNavigateResource('next');return{container,content,ref,deps};
}
describe('delayed resource navigation scrolling',()=>{
  it('resets the connected original content container after navigation',()=>{const{container,deps}=navigationFixture();vi.advanceTimersByTime(50);expect(container.scrollTop).toBe(0);expect(deps.setGeneratedContent).toHaveBeenCalledWith({id:'second',type:'simplified'});});
  it('does not throw when the content ref is cleared before the timer',()=>{const{ref,container}=navigationFixture();ref.current=null;expect(()=>vi.advanceTimersByTime(50)).not.toThrow();expect(container.scrollTop).toBe(87);});
  it('ignores a detached original node',()=>{const{content,container}=navigationFixture();content.remove();vi.advanceTimersByTime(50);expect(container.scrollTop).toBe(87);});
  it('does not query or scroll a replacement resource node',()=>{const{ref,container}=navigationFixture();const replacement=document.createElement('article'),replacementContainer=document.createElement('div');replacementContainer.className='overflow-y-auto';replacementContainer.scrollTop=99;replacementContainer.appendChild(replacement);document.body.appendChild(replacementContainer);const closest=vi.spyOn(replacement,'closest');ref.current=replacement;vi.advanceTimersByTime(50);expect(closest).not.toHaveBeenCalled();expect(replacementContainer.scrollTop).toBe(99);expect(container.scrollTop).toBe(87);});
});
