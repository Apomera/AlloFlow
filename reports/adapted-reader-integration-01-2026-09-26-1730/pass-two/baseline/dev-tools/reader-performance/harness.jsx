import { makeFixture, marker } from './fixtures.cjs';

const React = window.React, h = React.createElement, modules = window.AlloModules;
const contract = modules.InstructionalContext, pure = modules.PureHelpers, phase = modules.PhaseNHelpers;
const spec = window.fixtureSpec, fixture = makeFixture(spec), noop = () => {}, metrics = window.readerMetrics;
for (const name of ['fingerprintSourceText', 'getSourceSnapshot', 'validateReadingSupports', 'validateAdaptedReadingSupports', 'getAdaptedSupportSnapshot']) metrics.wrap(contract, name);
metrics.wrap(pure, 'splitTextToSentences');
metrics.wrap(phase, 'formatInteractiveText');
const t = key => key.split('.').reduce((value, part) => value?.[part], window.fixtureStrings) || key;
function sideBySide(text) {
  const parts = String(text || '').split(marker);
  if (parts.length !== 2) return null;
  const [sourceFull, targetFull] = parts.map(part => part.trim());
  return { sourceFull, targetFull, source: sourceFull.split(/\n{2,}/), target: targetFull.split(/\n{2,}/) };
}
const split = text => pure.splitTextToSentences(text, {});
const original = contract.createSupportedReading(
  contract.createSourceSnapshot(fixture.originalText, { sourceArtifactId: 'fixture-source', capturedAt: '2026-09-26T00:00:00.000Z' }),
  { id: 'fixture-original', sourceFamilyId: 'fixture-family', config: { language: 'English' } }
);
const base = {
  t, inputText: '', gradeLevel: '5', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1,
  isProcessing: false, isEditingLeveledText: false, isFluencyMode: false, isSideBySide: !!spec.bilingual,
  textEditorRef: React.createRef(), splitTextToSentences: split, getSideBySideContent: sideBySide,
  cursorStyles: { read: '', define: '', phonics: '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false,
  renderFormattedText: text => h('div', null, text),
  formatInteractiveText: (text, cloze, dark, key) => phase.formatInteractiveText(text, cloze, false,
    { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }, key),
  highlightGlossaryTerms: x => x, latestGlossary: [], SourceReferencesPanel: () => null, ComplexityGauge: () => null,
  ErrorBoundary: ({ children }) => children,
  ImmersiveToolbar: modules.ImmersiveToolbar, ImmersiveWord: modules.ImmersiveWord,
  FocusReaderOverlay: modules.FocusReaderOverlay, PerspectiveCrawlOverlay: modules.PerspectiveCrawlOverlay,
  KaraokeReaderOverlay: modules.KaraokeReaderOverlay,
  callTTS: async () => '/tone.wav', handleWordClick: noop, handlePhonicsClick: noop, handleQuickAddGlossary: noop,
  handleTextMouseUp: noop, handleFormatText: noop, handleSimplifiedTextChange: noop,
  closeDefinition: noop, closePhonics: noop, closeRevision: noop, setRevisionData: noop, setPhonicsData: noop,
  setSelectionMenu: noop, setIsCustomReviseOpen: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop,
  handleToggleIsEditingLeveledText: noop, setIsFluencyMode: noop, setReadingTheme: noop,
  isLineFocusMode: false, lineHeight: 1.6, letterSpacing: 0, playbackRate: 1,
  chunkReaderSpeed: 200, chunkReaderMood: 'calm', isChunkReaderActive: true, chunkReaderReadAlong: true,
  chunkReaderAutoPlay: false, readingTheme: 'default'
};
window.__alloResolveReadAloudAudio = async () => '/tone.wav';
window.__alloCaptureKaraokeAudio = async () => false;
function App() {
  const [state, setState] = React.useState({
    resource: 'fixture-a', revision: 0, supportVersion: 0, learner: spec.learner || '',
    immersive: !!spec.immersive, compare: !!spec.compare, mode: 'read',
    sweep: 0, sentence: 0, playing: false, playingId: null, focus: false, crawl: false, karaoke: false
  });
  const patch = React.useCallback(update => setState(previous => ({ ...previous, ...update })), []);
  const stop = React.useCallback(() => patch({ playing: false, playingId: null }), [patch]);
  const speak = React.useCallback((text, id, index, restart, language) => {
    window.readerFixture.lastSpoken = { text, id, index, language };
    patch({ playing: true, playingId: id, sentence: index || 0 });
  }, [patch]);
  const item = React.useMemo(() => {
    const data = fixture.data + (state.revision ? '\n\nThis reading changed ' + state.revision + ' times.' : '');
    const current = { id: state.resource, type: 'simplified', title: 'Reader performance fixture', data,
      instructionalText: { form: 'adapted', role: 'supplemental' },
      sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'fixture-family',
      config: { language: fixture.language }, immersiveSource: data, posEnriched: true,
      immersiveData: modules.TextPipelineHelpers.parseTaggedContent(data) };
    if (fixture.annotations.length) {
      current.adaptedReadingSupports = contract.validateAdaptedReadingSupports(current, {
        schemaVersion: 1, passageLength: fixture.supportText.length, sourceFingerprint: contract.fingerprintSourceText(fixture.supportText),
        shown: true, annotations: fixture.annotations.map(entry => ({ ...entry, text: entry.text + ' Version ' + state.supportVersion }))
      });
    }
    return current;
  }, [state.resource, state.revision, state.supportVersion]);
  const [focused, setFocused] = React.useState(null), [ruler, setRuler] = React.useState(150);
  const [settings, setSettings] = React.useState({ textSize: spec.fontSize || 24, bgColor: '#ffffff', fontColor: '#1e293b', lineFocus: false });
  const props = { ...base, generatedContent: item, history: [original, item], leveledTextLanguage: fixture.language,
    isTeacherMode: !!spec.teacher, isZenMode: !spec.teacher, readingLearnerKey: state.learner,
    isImmersiveReaderActive: state.immersive, handleCloseImmersiveReader: () => patch({ immersive: false }),
    immersiveSettings: settings, setImmersiveSettings: setSettings, immersiveRulerY: ruler, setImmersiveRulerY: setRuler,
    isCompareMode: state.compare, setIsCompareMode: compare => patch({ compare }),
    interactionMode: state.mode, setInteractionMode: mode => patch({ mode }),
    isPlaying: state.playing, playingContentId: state.playingId, playbackState: { currentIdx: state.sentence },
    handleSpeak: speak, stopPlayback: stop, focusedParagraphIndex: focused, setFocusedParagraphIndex: setFocused,
    chunkReaderSweepPct: state.sweep, chunkReaderIdx: state.sentence, setChunkReaderIdx: sentence => patch({ sentence }),
    setIsChunkReaderActive: noop, setChunkReaderAutoPlay: noop, setChunkReaderReadAlong: noop, setChunkReaderSpeed: noop, setChunkReaderMood: noop,
    isFocusReaderActive: state.focus, setIsFocusReaderActive: focus => patch({ focus }), handleCloseSpeedReader: () => patch({ focus: false }),
    isCrawlReaderActive: state.crawl, setIsCrawlReaderActive: crawl => patch({ crawl }),
    isKaraokeOverlayActive: state.karaoke, setIsKaraokeOverlayActive: karaoke => patch({ karaoke }),
    setPlaybackRate: noop, setLineHeight: noop, setLetterSpacing: noop,
    handleToggleIsZenMode: noop, setGeneratedContent: noop
  };
  const inventory = React.useMemo(() => ({ ...fixture.inventory, acceptedSupports: item.adaptedReadingSupports?.annotations.length || 0,
    canonicalSentences: (sideBySide(item.data) ? [...sideBySide(item.data).source, ...sideBySide(item.data).target] : item.data.split(/\n{2,}/)).flatMap(split).length }), [item]);
  React.useLayoutEffect(() => { window.readerFixture.ready = true; });
  Object.assign(window.readerFixture, { patch, state, item,
    inventory });
  return <React.Profiler id="reader" onRender={metrics.onRender}><modules.SimplifiedView {...props} /></React.Profiler>;
}
window.readerFixture = { ready: false, limitations: [
  'Synthetic host: handleSpeak records calls; integrated host playback mapping is a separate required acceptance check.',
  'Local tone audio only; no cloud synthesis or persistence. No production learner/resource data.',
  'Public helper call counts exclude nested lexical calls; instrumented timings are not production timings.'
] };
const root = window.createRoot(document.getElementById('root'));
window.readerFixture.unmount = () => { root.unmount(); delete window.readerFixture.patch; delete window.readerFixture.item; delete window.readerFixture.state; };
root.render(<App />);

