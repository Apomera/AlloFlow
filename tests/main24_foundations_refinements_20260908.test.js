import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url), noop = () => {};
let React, createRoot, act, root, host, M;
beforeAll(() => {
  React=require(resolve('desktop/web-app/node_modules/react'));
  ({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act=React.act; global.React=window.React=React; global.IS_REACT_ACT_ENVIRONMENT=true;
  window.AlloIcons=new Proxy({}, {get:()=>()=>null});
  ['faq','image','word_sounds_preview','simplified','analysis'].forEach(name=>loadAlloModule('view_'+name+'_module.js'));
  M=window.AlloModules;
});
afterEach(()=>{
  if(root)act(()=>root.unmount());host?.remove();root=null;host=null;
  vi.restoreAllMocks();vi.unstubAllGlobals();
  delete window.__alloPrepareReadAloud;delete window.__alloRegenerateSentenceAudio;
  delete window.__alloPrepareReadAloudCancel; delete window.ai;
});
function mount(name, props) {
  if(!host){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}
  act(()=>root.render(React.createElement(M[name],props)));
}
function click(button){expect(button).toBeTruthy();act(()=>button.click());}
function byText(text){return [...host.querySelectorAll('button')].find(button=>button.textContent.includes(text));}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function settle(){await act(async()=>{for(let i=0;i<5;i++)await Promise.resolve();});}
const split=text=>String(text||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];
const faq=(overrides={})=>({
  t:k=>k, generatedContent:{id:'faq-a',type:'faq',data:[{question:'Why rain?',answer:'Clouds release water.'}]},
  isPlaying:false,playingContentId:null,voiceSpeed:1,isTeacherMode:true,isEditingFaq:true,
  leveledTextLanguage:'English',effectiveLanguage:'English',selectedVoice:'Kore',playbackState:{currentIdx:-1},
  audioRef:{current:null},playbackSessionRef:{current:null},setVoiceSpeed:noop,setIsPlaying:noop,setPlayingContentId:noop,
  handleToggleIsEditingFaq:noop,handleFaqChange:noop,handleSpeak:noop,getRows:()=>1,splitTextToSentences:split,formatInteractiveText:s=>s,...overrides
});
describe('FAQ audio request ownership and recovery',()=>{
  it('reports unavailable audio tools and allows retry after they load',async()=>{
    mount('FaqView',faq());click(byText('Save TTS'));expect(host.textContent).toContain('still loading');
    window.__alloPrepareReadAloud=vi.fn(async()=>({ok:true}));
    click(byText('Save TTS'));await settle();expect(host.querySelector('[role=status]').textContent).toContain('saved for all');
  });
  it('catches save failures and retries without duplicate submissions',async()=>{
    const pending=deferred();window.__alloPrepareReadAloud=vi.fn(()=>pending.promise);
    mount('FaqView',faq());const save=byText('Save TTS');click(save);
    expect(window.__alloPrepareReadAloud).toHaveBeenCalledOnce();
    expect([...host.querySelectorAll('button[aria-label*="Regenerate audio"]')].every(b=>b.disabled)).toBe(true);
    await act(async()=>pending.reject(new Error('provider offline')));
    expect(host.textContent).toContain('could not be saved');expect(byText('Save TTS').disabled).toBe(false);
    window.__alloPrepareReadAloud.mockResolvedValue({ok:true});click(byText('Save TTS'));await settle();expect(window.__alloPrepareReadAloud).toHaveBeenCalledTimes(2);
  });
  it('announces partial preparation rather than claiming everything is saved',async()=>{
    window.__alloPrepareReadAloud=vi.fn(async()=>({ok:false,remaining:1}));
    mount('FaqView',faq());click(byText('Save TTS'));await settle();
    expect(host.querySelector('[role=status]').textContent).toContain('still missing');
  });
  it('stops its own save through an AbortSignal',async()=>{
    const pending=deferred();window.__alloPrepareReadAloud=vi.fn(()=>pending.promise);
    mount('FaqView',faq());click(byText('Save TTS'));
    const signal=window.__alloPrepareReadAloud.mock.calls[0][2].signal;
    click(host.querySelector('button[aria-busy=true]'));expect(signal.aborted).toBe(true);
    await act(async()=>pending.resolve({ok:false,remaining:1}));
    expect(host.querySelector('[role=status]').textContent).toContain('stopped');
  });
  it('ignores old progress and completion after navigating to another FAQ',async()=>{
    const old=deferred(),next=deferred();window.__alloPrepareReadAloud=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    mount('FaqView',faq());click(byText('Save TTS'));
    const progress=window.__alloPrepareReadAloud.mock.calls[0][1],signal=window.__alloPrepareReadAloud.mock.calls[0][2].signal;
    mount('FaqView',faq({generatedContent:{id:'faq-b',data:[{question:'What next?',answer:'Another answer.'}]}}));
    expect(signal.aborted).toBe(true);click(byText('Save TTS'));
    act(()=>progress(88,100));expect(host.textContent).not.toContain('88/100');
    await act(async()=>old.reject(new Error('late error')));
    expect(host.textContent).not.toContain('could not be saved');
    expect(host.querySelector('button[aria-busy=true]')).not.toBeNull();
    await act(async()=>next.resolve({ok:true}));expect(host.textContent).toContain('saved for all');
  });
  it.each([null,Promise.reject])('reports regeneration failures and releases the Save button (%s)',async result=>{
    window.__alloRegenerateSentenceAudio=vi.fn(()=>result===null?Promise.resolve(null):Promise.reject(new Error('unavailable')));
    mount('FaqView',faq());click(host.querySelector('button[aria-label*="Regenerate audio"]'));await settle();
    expect(host.textContent).toContain('could not be generated');expect(byText('Save TTS').disabled).toBe(false);
  });
  it('resets disclosure state between resources and reflects external speed changes',()=>{
    const props=faq({isEditingFaq:false,isPlaying:true,playingContentId:'faq-active'});
    mount('FaqView',props);click(byText('Show all'));expect(host.querySelector('[aria-expanded=true]')).not.toBeNull();
    mount('FaqView',{...props,generatedContent:{...props.generatedContent,id:'faq-b'},voiceSpeed:1.8});
    expect(host.querySelector('[aria-expanded=true]')).toBeNull();
    expect(host.querySelector('input[type=range]').value).toBe('1.8');
    expect(host.querySelector('input[type=range]').getAttribute('aria-valuetext')).toBe('1.8×');
  });
  it('aborts preparation on unmount without unhandled rejection',async()=>{
    const pending=deferred();window.__alloPrepareReadAloud=vi.fn(()=>pending.promise);
    mount('FaqView',faq());click(byText('Save TTS'));
    const signal=window.__alloPrepareReadAloud.mock.calls[0][2].signal;
    act(()=>root.unmount());root=null;expect(signal.aborted).toBe(true);
    await act(async()=>pending.reject(new Error('late')));
  });
});
describe('Lesson Image uploads respect the latest author choice',()=>{
  let readers,current,update;
  function setup(){
    readers=[];vi.stubGlobal('FileReader',class {constructor(){this.abort=vi.fn();readers.push(this);}readAsDataURL(){}});
    current={id:'image-a',type:'image',data:{imageUrl:'data:image/png;base64,old',prompt:'Diagram'}};
    update=vi.fn((id,updater)=>{current=updater(current);});
    mount('ImageView',{t:()=>'',generatedContent:current,isTeacherMode:true,leveledTextLanguage:'English',singleImageFileRef:React.createRef(),onUpdateResource:update,imageRefinementInput:'',addToast:noop});
  }
  function upload(name){
    const input=host.querySelector('input[type=file]');
    Object.defineProperty(input,'files',{value:[new File(['data'],name,{type:'image/png'})],configurable:true});
    act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  }
  it('rejects an earlier file when a later choice finishes first',()=>{
    setup();upload('first.png');upload('second.png');expect(readers[0].abort).toHaveBeenCalledOnce();
    act(()=>readers[1].onload({target:{result:'data:image/png;base64,second'}}));
    act(()=>readers[0].onload({target:{result:'data:image/png;base64,first'}}));
    expect(current.data.imageUrl).toBe('data:image/png;base64,second');
  });
  it('preserves a newer restored or regenerated image while a file is reading',()=>{
    setup();upload('slow.png');current={...current,data:{...current.data,imageUrl:'data:image/png;base64,regenerated'}};
    act(()=>readers[0].onload({target:{result:'data:image/png;base64,upload'}}));
    expect(current.data.imageUrl).toBe('data:image/png;base64,regenerated');
  });
  it('aborts pending file readers on unmount and ignores late load events',()=>{
    setup();upload('slow.png');act(()=>root.unmount());root=null;
    expect(readers[0].abort).toHaveBeenCalledOnce();
    act(()=>readers[0].onload({target:{result:'data:image/png;base64,upload'}}));expect(update).not.toHaveBeenCalled();
  });
});
describe('Word Sounds deferred practice launches stay with their lesson',()=>{
  function props(extra={}){return {
    t:k=>k,generatedContent:{id:'ws-a',data:[{word:'cat'}],sessionConfig:{difficulty:'easy'}},
    wsActivitySequence:['blending'],setWordSoundsActivity:vi.fn(),setIsWordSoundsMode:vi.fn(),setWordSoundsAutoReview:vi.fn(),
    prepareWordSoundsSession:vi.fn(),wordSoundsAudioCoverage:{total:2,ready:0,complete:false},isTeacherMode:true,...extra
  };}
  it('ignores a stale confirmation after resource navigation',()=>{
    let confirm;const p=props({requestIncompleteAudioConfirmation:(_,run)=>{confirm=run;}});
    mount('WordSoundsPreviewView',p);click(byText('Start Practice'));
    mount('WordSoundsPreviewView',{...p,generatedContent:{...p.generatedContent,id:'ws-b'}});
    act(()=>confirm());expect(p.prepareWordSoundsSession).not.toHaveBeenCalled();
  });
  it('ignores stale confirmation after lesson settings change',()=>{
    let confirm;const p=props({requestIncompleteAudioConfirmation:(_,run)=>{confirm=run;}});
    mount('WordSoundsPreviewView',p);click(byText('Start Practice'));
    mount('WordSoundsPreviewView',{...p,wsActivitySequence:['segmenting']});
    act(()=>confirm());expect(p.setIsWordSoundsMode).not.toHaveBeenCalled();
  });
  it('honors the selected sequence and accepts each confirmation once',()=>{
    let confirm;const p=props({requestIncompleteAudioConfirmation:(_,run)=>{confirm=run;}});
    mount('WordSoundsPreviewView',p);click(byText('Start Practice'));act(()=>{confirm();confirm();});
    expect(p.prepareWordSoundsSession).toHaveBeenCalledOnce();
    expect(p.prepareWordSoundsSession).toHaveBeenCalledWith({difficulty:'easy',resourceId:'ws-a',initialActivity:'blending'});
    expect(p.setWordSoundsAutoReview).toHaveBeenCalledWith(false);
  });
  it('does not launch an unmounted resource',()=>{
    let confirm;const p=props({requestIncompleteAudioConfirmation:(_,run)=>{confirm=run;}});
    mount('WordSoundsPreviewView',p);click(byText('Start Practice'));act(()=>root.unmount());root=null;
    act(()=>confirm());expect(p.setIsWordSoundsMode).not.toHaveBeenCalled();
  });
});
function readingProps(){
  return {t:k=>k,generatedContent:{id:'adapted-a',type:'simplified',data:'A short passage.'},inputText:'',gradeLevel:'5',
      leveledTextLanguage:'English',selectedVoice:'Kore',voiceSpeed:1,isTeacherMode:true,isEditingLeveledText:false,
      isImmersiveReaderActive:false,isCompareMode:false,isSideBySide:false,isZenMode:false,isProcessing:false,
      isPlaying:false,interactionMode:'read',history:[],textEditorRef:React.createRef(),splitTextToSentences:split,
      getSideBySideContent:()=>null,handleFormatText:noop,handleSimplifiedTextChange:noop,callTTS:noop,handleSpeak:noop,
      cursorStyles:{read:''},getContentDirection:()=> 'ltr',isRtlLang:()=>false,renderFormattedText:v=>v,formatInteractiveText:v=>v,
      ComplexityGauge:()=>null,SourceReferencesPanel:()=>null,playbackState:{currentIdx:-1},handleTextMouseUp:noop,highlightGlossaryTerms:v=>v,latestGlossary:[],
      studentInterests:[],standardsInput:'',isTeacherToolbarExpanded:false,handleToggleIsTeacherToolbarExpanded:noop, readingTheme:'default',theme:'light'};
}
describe('Adapted Reading teacher toolbar disclosure',()=>{
  it('removes closed tools from layout and keyboard navigation, and exposes its disclosure state',()=>{
    const p=readingProps();
    mount('SimplifiedView',p);
    const toggle=host.querySelector('[data-help-key=simplified_teacher_tools]');
    const panel=host.querySelector('#'+toggle.getAttribute('aria-controls'));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');expect(panel.hidden).toBe(true);expect(getComputedStyle(panel).display).toBe('none');
    mount('SimplifiedView',{...p,isTeacherToolbarExpanded:true});
    expect(toggle.getAttribute('aria-expanded')).toBe('true');expect(panel.hidden).toBe(false);expect(panel.style.display).toBe('');
  });
});

describe('Adapted Reading audio preparation lifecycle',()=>{
  it('announces failures outside the edit panel and allows retry',async()=>{
    const p={...readingProps(),isTeacherToolbarExpanded:true};
    window.__alloPrepareReadAloud=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ok:true});
    mount('SimplifiedView',p);click(host.querySelector('[data-help-key=simplified_save_tts]'));await settle();
    expect(host.textContent).toContain('Audio could not be saved');
    click(host.querySelector('[data-help-key=simplified_save_tts]'));await settle();
    expect(host.textContent).toContain('saved for all sentences');expect(window.__alloPrepareReadAloud).toHaveBeenCalledTimes(2);
  });
  it('aborts and ignores old preparation after changing the reading',async()=>{
    const old=deferred(),next=deferred(),p={...readingProps(),isTeacherToolbarExpanded:true};
    window.__alloPrepareReadAloud=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    mount('SimplifiedView',p);click(host.querySelector('[data-help-key=simplified_save_tts]'));
    const signal=window.__alloPrepareReadAloud.mock.calls[0][2].signal,progress=window.__alloPrepareReadAloud.mock.calls[0][1];
    mount('SimplifiedView',{...p,generatedContent:{...p.generatedContent,id:'adapted-b',data:'Another reading.'}});
    expect(signal.aborted).toBe(true);click(host.querySelector('[data-help-key=simplified_save_tts]'));
    act(()=>progress(88,99));expect(host.textContent).not.toContain('88/99');
    await act(async()=>old.reject(new Error('late')));expect(host.textContent).not.toContain('could not be saved');
    await act(async()=>next.resolve({ok:true}));expect(host.textContent).toContain('saved for all sentences');
  });
});