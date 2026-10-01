import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, SimplifiedView, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, {get: () => () => null});
  loadAlloModule('view_simplified_module.js');
  SimplifiedView = window.AlloModules.SimplifiedView;
});
afterEach(() => { if(root) act(()=>root.unmount());host?.remove();root=null;host=null; });
const splitSentences = text => String(text || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(value=>value.trim()).filter(Boolean) || [];
function mount(options={}) {
  const noop=()=>{};
  const content='First paragraph. More evidence.\n\nSecond paragraph.';
  const bilingual=options.bilingual===true;
  function Harness() {
    const [focusedParagraphIndex,setFocusedParagraphIndex]=React.useState(null);
    return React.createElement(SimplifiedView, {
      t:key=>key,generatedContent:{id:'focus-reading',type:'simplified',data:content},inputText:'',gradeLevel:'5',
      leveledTextLanguage:'English',selectedVoice:'Kore',voiceSpeed:1,isTeacherMode:false,isEditingLeveledText:false,
      isImmersiveReaderActive:false,isCompareMode:false,isSideBySide:false,isZenMode:true,isProcessing:false,
      isPlaying:false,interactionMode:options.interactionMode||'read',history:[],textEditorRef:React.createRef(),
      splitTextToSentences:splitSentences,
      getSideBySideContent:()=>bilingual?{source:['First source. More evidence.','Second source.'],target:['First translation.','Second translation.']}:null,
      handleFormatText:noop,handleSimplifiedTextChange:noop,callTTS:noop,handleSpeak:noop,
      isLineFocusMode:options.enabled!==false,focusedParagraphIndex,setFocusedParagraphIndex,
      cursorStyles:{read:'',revise:''},getContentDirection:()=> 'ltr',isRtlLang:()=>false,
      renderFormattedText:value=>value,formatInteractiveText:(value,cloze)=>cloze?React.createElement('input',{'aria-label':'Answer',defaultValue:value}):value,
      SourceReferencesPanel:()=>null,playbackState:{currentIdx:-1},handleTextMouseUp:noop,
      highlightGlossaryTerms:value=>value, latestGlossary:[]
    });
  }
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  act(()=>root.render(React.createElement(Harness)));
  return [...host.querySelectorAll('[data-line-focus-paragraph]')];
}

describe('Adapted Reading Line Focus keyboard coverage',()=>{
  it.each([false,true])('reveals a keyboard-focused paragraph and its sentences (bilingual=%s)',bilingual=>{
    const paragraphs=mount({bilingual});
    const second=paragraphs[1];
    expect(second.className).toContain('opacity-20');
    expect(second.tabIndex).toBe(0);
    act(()=>second.focus());
    expect(second.className).toContain('opacity-100');
    expect(second.className).not.toContain('blur-[1px]');
    const word=second.querySelector('[tabindex="0"]');
    if(word) {
      act(()=>word.focus());
      expect(second.className).not.toContain('opacity-20');
    }
    act(()=>paragraphs[0].focus());
    expect(second.className).toContain('opacity-20');
    expect(paragraphs[0].className).not.toContain('opacity-20');
  });
  it.each([false,true])('supports keyboard focus in plain revision paragraphs (bilingual=%s)',bilingual=>{
    const paragraphs=mount({bilingual,interactionMode:'revise'});
    act(()=>paragraphs[1].focus());
    expect(paragraphs[1].className).toContain('opacity-100');
    expect(paragraphs[0].className).toContain('opacity-20');
  });
  it('keeps a focused learner response visible after pointer leave',()=>{
    const paragraphs=mount({interactionMode:'cloze'});
    const input=paragraphs[1].querySelector('input');
    act(()=>input.focus());
    expect(paragraphs[1].className).not.toContain('opacity-20');
    act(()=>paragraphs[1].dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body})));
    expect(paragraphs[1].className).not.toContain('opacity-20');
    act(()=>input.blur());
    expect(paragraphs[1].className).toContain('opacity-20');
  });
  it('does not add paragraph tab stops when Line Focus is disabled',()=>{
    const paragraphs=mount({enabled:false});
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs.every(paragraph=>!paragraph.hasAttribute('tabindex'))).toBe(true);
  });
});
