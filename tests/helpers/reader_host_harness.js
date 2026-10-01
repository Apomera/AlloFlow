// Host + reader harness (2026-09-28): the real reader, the real HostHandlers and
// GenerationHelpers modules, and verbatim host code sliced out of AlloFlowANTI.txt
// by text anchors. ALLO_VIEW_CANDIDATE / ALLO_ANTI_CANDIDATE point mutation runs
// at scratch copies so a mutant never reaches the shared files.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from '../setup.js';

export const REPO = process.cwd();
const require = createRequire(REPO + '/package.json');
export const env = {};

export function boot() {
  const React = require(REPO + '/desktop/web-app/node_modules/react');
  const { createRoot } = require(REPO + '/desktop/web-app/node_modules/react-dom/client');
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const name of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js',
    'text_pipeline_helpers_module.js', 'generation_helpers_module.js', 'host_handlers_module.js']) loadAlloModule(name);
  new Function(readFileSync(process.env.ALLO_VIEW_CANDIDATE || REPO + '/view_simplified_module.js', 'utf8'))();
  Object.assign(env, { React, createRoot, act: React.act, M: window.AlloModules });
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } } });
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
  return env;
}

// Verbatim host blocks, found by anchors (line numbers move under other sessions).
export function antiBlocks() {
  const src = readFileSync(process.env.ALLO_ANTI_CANDIDATE || REPO + '/AlloFlowANTI.txt', 'utf8');
  const cut = (start, end) => {
    const s = src.indexOf(start), e = s < 0 ? -1 : src.indexOf(end, s);
    if (s < 0 || e < 0) throw new Error('ANTI anchor missing: ' + start);
    if (src.indexOf(start, s + 1) >= 0) throw new Error('ANTI anchor not unique: ' + start);
    return src.slice(s, e);
  };
  return {
    simplifiedChange: cut('  const handleSimplifiedTextChange = (value) => {', '  const handleSelectReadingSource = (item) => {'),
    textUndo: cut('  const textUndoRef = useRef({ undo: [], redo: [], prevInput: null', '  const handleAiRefineSource = async'),
    complexity: cut('  const handleComplexityAdjustment = async (plan) => {', '  const handlePresentationOptionClick'),
  };
}

export function makeHostHook(blocks, patch = body => body) {
  const body = `
    const { supportDraftSessionRef, requestReadingSupportTransition, generatedContent, addToast, getArtifactInstanceId, _alloArtifactMatchesInstanceId,
      _alloHostHandlers, setGeneratedContent, setHistory, inputText, history, t, annotationUndoStackRef, handleAnnotationUndo, _alloGenerationHelpersDeps } = env;
    const _applySimplifiedTextMutation = (...__a) => _alloHostHandlers()._applySimplifiedTextMutation(...__a);
    ${blocks.simplifiedChange}
    ${blocks.textUndo}
    ${blocks.complexity}
    return { handleSimplifiedTextChange, textUndoRef, _textUndoLiveRef, _recordTextChange, _readTextDomain, _applyTextDomain, _textDomainLabel, _shiftTextStack, handleTextUndo, handleTextRedo, handleComplexityAdjustment };
  `;
  return new Function('React', 'useRef', 'env', patch(body));
}

export function readerBaseProps() {
  const { React, M } = env;
  const noop = () => {};
  const pure = M.PureHelpers, phase = M.PhaseNHelpers;
  return { ComplexityGauge: () => null, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop, setInteractionMode: noop,
    setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, gradeLevel: '5', leveledTextLanguage: 'English',
    studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isPlaying: false, interactionMode: 'read',
    splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop,
    handleQuickAddGlossary: noop, handlePhonicsClick: noop, isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {},
    getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [] };
}

// A host that mirrors AlloFlowContent's wiring for the reader: plain state setters,
// verbatim ANTI handlers, the real HostHandlers module behind a live __d proxy,
// and the real GenerationHelpers.handleComplexityAdjustment.
export function makeHost({ hook, item, generate, gradeLevel = 'Grade 4', saveOriginalOnAdjust = false, inputText: input0 = '' }) {
  const { React, M } = env;
  const TP = M.TextPipelineHelpers;
  const exposed = { toasts: [], warnings: [] };
  const t = key => key;
  function Host() {
    const [history, setHistory] = React.useState(() => [item]);
    const [generatedContent, setGeneratedContent] = React.useState(item);
    const [inputText, setInputText] = React.useState(input0);
    const [isEditingLeveledText, setIsEditingLeveledText] = React.useState(false);
    const [complexityLevel, setComplexityLevel] = React.useState(5);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const liveRef = React.useRef({}), handlersRef = React.useRef(null);
    const addToast = (message, kind) => exposed.toasts.push([message, kind]);
    const _alloHostHandlers = () => {
      if (!handlersRef.current) handlersRef.current = M.createHostHandlers(new Proxy({}, { get: (_, key) => (key in liveRef.current ? liveRef.current[key] : handlersRef.current[key]) }));
      return handlersRef.current;
    };
    const deps = () => ({ complexityLevel, generatedContent, gradeLevel, leveledTextLanguage: 'English', translationMode: 'auto', resolveTranslationPolicy: TP.resolveTranslationPolicy,
      currentUiLanguage: 'English', standardsContext: null, standardsInput: '', targetStandards: [], saveOriginalOnAdjust, generatedTerms: [], setIsProcessing, setGeneratedContent, setHistory,
      setError: () => {}, setComplexityLevel, setWordSoundsCustomTerms: () => {}, setWsPreloadedWords: () => {}, callGemini: async () => { throw new Error('no model in probe'); },
      cleanJson: v => v, addToast, t, warnLog: (...a) => exposed.warnings.push(a), extractSourceTextForProcessing: TP.extractSourceTextForProcessing, generateBilingualText: generate,
      getDefaultTitle: () => 'Leveled Text' });
    const h = hook(React, React.useRef, { supportDraftSessionRef: { current: null }, requestReadingSupportTransition: () => {}, generatedContent, addToast,
      getArtifactInstanceId: () => '', _alloArtifactMatchesInstanceId: () => false, _alloHostHandlers, setGeneratedContent, setHistory, inputText, history, t,
      annotationUndoStackRef: { current: [] }, handleAnnotationUndo: () => {}, _alloGenerationHelpersDeps: deps });
    liveRef.current = { textUndoRef: h.textUndoRef, _textUndoLiveRef: h._textUndoLiveRef, _readTextDomain: h._readTextDomain, _textDomainLabel: h._textDomainLabel, t, addToast,
      setInputText, setHistory, setGeneratedContent, gradeLevel, leveledTextLanguage: 'English', activeResolvedStandardsContext: null, standardsInput: '', targetStandards: [],
      splitReferencesFromBody: TP.splitReferencesFromBody, extractSourceTextForProcessing: TP.extractSourceTextForProcessing };
    Object.assign(exposed, { history, generatedContent, h, setHistory, setGeneratedContent, setIsEditingLeveledText, inputText });
    return React.createElement(M.SimplifiedView, { ...readerBaseProps(), t, generatedContent, history, setGeneratedContent, setHistory,
      handleSimplifiedTextChange: h.handleSimplifiedTextChange, handleComplexityAdjustment: h.handleComplexityAdjustment, complexityLevel, setComplexityLevel,
      saveOriginalOnAdjust, isTeacherMode: true, isZenMode: false, isTeacherToolbarExpanded: true, isEditingLeveledText,
      handleToggleIsEditingLeveledText: () => setIsEditingLeveledText(v => !v), inputText, isProcessing, readingLearnerKey: 'teacher|default',
      textEditorRef: exposed.textEditorRef || (exposed.textEditorRef = React.createRef()), splitReferencesFromBody: TP.splitReferencesFromBody });
  }
  return { Host, exposed };
}

export function dom(host) {
  const { act } = env;
  const $ = selector => host.querySelector(selector);
  const click = async node => { if (!node) throw new Error('click target missing'); await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
  const settle = async (ms = 0) => { await act(async () => { await new Promise(done => setTimeout(done, ms)); }); };
  const typeInto = async (node, value) => {
    const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
  };
  const key = async (k, extra = {}) => {
    const target = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    await act(async () => { target.dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true, cancelable: true, ...extra })); });
    return target;
  };
  return { $, click, settle, typeInto, key };
}
