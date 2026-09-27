// Disposable browser fixture: production engine/reader, synthetic text, mock providers.
window.warnLog = window.debugLog = () => {};
window.__alloUtils = { cleanJson: value => value };
window.AlloIcons = new Proxy({}, { get: () => () => null });
window.mountLookup = function (options = {}) {
  window.lookupRoot?.unmount(); document.body.replaceChildren();
  window.getSelection().removeAllRanges(); delete window.__alloStudentAiDisabled;
  const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
  const requests = [], speech = [], audio = [], dictionary = deferred(); let props = options, state, engine;
  window.Audio = function (url) { this.src = url; this.play = async () => { audio.push(url); }; this.pause = () => {}; };
  window.AlloDictionary = { lookup: () => dictionary.promise };
  const callGemini = (...args) => { const request = deferred(); requests.push({ ...request, args }); return request.promise; };
  const callTTS = async (...args) => { speech.push(args); return 'fixture:audio'; };
  const handleSpeak = (...args) => speech.push(args), noop = () => {};
  const item = { id: 'lookup-browser', type: 'simplified', data: 'El banco está cerca.\n\n--- ENGLISH TRANSLATION ---\n\nThe river bank is steep.', config: { grade: '3', language: 'Spanish' } };
  const pure = AlloModules.PureHelpers, phase = AlloModules.PhaseNHelpers;
  function Harness() {
    const [definitionData, setDefinitionData] = React.useState(null), [phonicsData, setPhonicsData] = React.useState(null), [selectionMenu, setSelectionMenu] = React.useState(null);
    state = { t: key => key, generatedContent: item, activeView: 'simplified', inputText: '', gradeLevel: '9', leveledTextLanguage: 'French', sourceTopic: 'Wrong ambient topic', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: true, isZenMode: true, isProcessing: false, isPlaying: false, playingContentId: null, interactionMode: 'define', history: [], textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}),
      getSideBySideContent: text => { const p = text.split('--- ENGLISH TRANSLATION ---'); return p.length === 2 ? { source: p[0].trim().split(/\n{2,}/), target: p[1].trim().split(/\n{2,}/), sourceFull: p[0].trim(), targetFull: p[1].trim() } : null; },
      handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS, handleSpeak, handleQuickAddGlossary: noop, stopPlayback: noop, closeRevision: noop, isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: AlloModules.ModuleScopeExtras.getContentDirection, isRtlLang: AlloModules.ModuleScopeExtras.isRtlLang,
      renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: text => text, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null,
      playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [], setIsCustomReviseOpen: noop, setCustomReviseInstruction: noop, ...props,
      definitionData, phonicsData, selectionMenu, setDefinitionData, setPhonicsData, setSelectionMenu };
    engine = AlloModules.createContentEngine({ getState: () => state, callGemini, callTTS, addToast: noop, t: key => key });
    return React.createElement(AlloModules.SimplifiedView, { ...state, handleWordClick: engine.handleWordClick, handleDefineSelection: engine.handleDefineSelection, handlePhonicsClick: engine.handlePhonicsClick, handleTextMouseUp: engine.handleTextMouseUp, closeDefinition: engine.closeDefinition, closePhonics: engine.closePhonics });
  }
  const host = document.createElement('div'); document.body.append(host); window.lookupRoot = ReactDOM.createRoot(host);
  const render = () => ReactDOM.flushSync(() => lookupRoot.render(React.createElement(Harness)));
  render();
  window.lookupFixture = { requests, dictionary, speech, audio, get state() { return state; }, get engine() { return engine; }, rerender: update => { props = { ...props, ...update }; render(); } };
};
