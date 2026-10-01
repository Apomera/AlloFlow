
window.AlloIcons = new Proxy({}, { get: () => () => null });
window.warnLog = window.debugLog = () => {};
window.mountReading = function (options = {}) {
  if (window.readerRoot) ReactDOM.flushSync(() => window.readerRoot.unmount());
  document.body.innerHTML = '<div id="reader"></div>';
  const React = window.React, noop = () => {};
  const contract=AlloModules.InstructionalContext, pure=AlloModules.PureHelpers, phase=AlloModules.PhaseNHelpers;
  const data=options.source || 'Herons are wading birds. They eat fish.';
  const original=contract.createSupportedReading(contract.createSourceSnapshot('A source reading.', {sourceArtifactId:'src'}),{id:'orig',sourceFamilyId:'birds'});
  const content={id:'fixture-1', type:'simplified', data, config:{language:options.language || 'English'}, sourceSnapshot:original.sourceSnapshot, instructionalText:{form:'adapted',role:'supplemental'}};
  const extra={};
  const props={ ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop, t: k => k, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: content, readingLearnerKey: 'learner|Blue Fox', ...extra };
  window.fixture={...options, initial:content, toasts:[], requests:[], preview:null};
  function Host() {
    const [current,setCurrent]=React.useState(content), [history,setHistory]=React.useState([content]);
    const [processing,setProcessing]=React.useState(false),[level,setLevel]=React.useState(5);
    const setGeneratedContent=React.useCallback(update=>{if(!window.fixture.decline) setCurrent(update);},[]);
    fixture.state={current,history,processing};
    fixture.changeSource=data=>setCurrent(previous=>({...previous,data}));
    const handleComplexityAdjustment=async plan=>{
      const result=await AlloModules.GenerationHelpers.handleComplexityAdjustment({generatedContent:current, complexityLevel:level, gradeLevel:'Grade 4',leveledTextLanguage:content.config.language,
        adaptationPlan:plan,saveOriginalOnAdjust:!!fixture.keepOriginal,setIsProcessing:setProcessing,setComplexityLevel:setLevel,setGeneratedContent,setHistory,
        setWordSoundsCustomTerms:noop,setWsPreloadedWords:noop,setError:noop,addToast:(message,tone)=>fixture.toasts.push({message,tone}),warnLog:noop,
        callGemini:noop,cleanJson:value=>value,t:key=>key,getDefaultTitle:()=> 'Reading',
        extractSourceTextForProcessing:AlloModules.TextPipelineHelpers.extractSourceTextForProcessing,
        generateBilingualText:async(...args)=>{fixture.requests.push(args);return fixture.delayed ? new Promise(resolve=>fixture.finish=resolve) : fixture.candidate || 'Herons are wading birds. They catch fish.';}
      });
      if(result?.status==='preview') fixture.preview=result;
      return result;
    };
    return React.createElement(AlloModules.SimplifiedView,{...props,generatedContent:current, history, setGeneratedContent,setHistory,
      complexityLevel:level,setComplexityLevel:setLevel,isProcessing:processing,handleComplexityAdjustment,isTeacherMode:true,isZenMode:false,isTeacherToolbarExpanded:true,
      saveOriginalOnAdjust:!!fixture.keepOriginal,readingLearnerKey:'',getSideBySideContent:text=>{const parts=text.split(/--- ENGLISH TRANSLATION ---/);return parts.length===2 ? {source:parts[0].trim().split(/\n{2,}/),target:parts[1].trim().split(/\n{2,}/),sourceFull:parts[0].trim(),targetFull:parts[1].trim()} : null;}
    });
  }
  window.readerRoot=ReactDOM.createRoot(document.getElementById('reader'));
  ReactDOM.flushSync(()=>readerRoot.render(React.createElement(React.StrictMode,null,React.createElement(Host))));
  document.querySelector('[data-teacher-reading-review]').open=true;
};
