import { makeFixture, marker } from './fixtures.cjs';

const React = window.React, h = React.createElement, modules = window.AlloModules;
const contract = modules.InstructionalContext, pure = modules.PureHelpers, phase = modules.PhaseNHelpers;
const spec = window.fixtureSpec, fixture = makeFixture(spec), noop = () => {}, metrics = window.readerMetrics;
for (const name of ['fingerprintSourceText', 'getSourceSnapshot', 'selectReadingSupports', 'validateReadingSupports', 'validateAdaptedReadingSupports', 'getAdaptedSupportSnapshot']) metrics.wrap(contract, name);
metrics.wrap(pure, 'splitTextToSentences');
metrics.wrap(phase, 'formatInteractiveText');
metrics.wrap(modules.TextPipelineHelpers.readingText, 'plain', 'readingTextPlain');
const t = key => key.split('.').reduce((value, part) => value?.[part], window.fixtureStrings) || key;
function sideBySide(text) {
  const parts = String(text || '').split(marker);
  if (parts.length !== 2) return null;
  const [sourceFull, targetFull] = parts.map(part => part.trim());
  return { sourceFull, targetFull, source: sourceFull.split(/\n{2,}/), target: targetFull.split(/\n{2,}/) };
}
const split = text => pure.splitTextToSentences(text, {});
const mediaRows = [['Morning', '4'], ['Afternoon', '7'], ['Evening', '5']];
const mediaReadingData = [
  '## Observing water',
  'We measure the water level at three times of day. The same container and measuring scale make the observations easier to compare.',
  '## Comparing measurements',
  'The table records each measurement. The chart shows how the amounts compare.',
  '| Time | Level |\n| --- | --- |\n' + mediaRows.map(row => '| ' + row.join(' | ') + ' |').join('\n'),
  '[[CHART: {"type":"bar","title":"Water levels","labels":["Morning","Afternoon","Evening"],"values":[4,7,5]}]]',
  '## Reviewing the observations',
  Array.from({ length: 24 }, () => 'Compare each observation with the previous measurement. Record what changed and explain how the table and chart support that conclusion.').join(' ')
].join('\n\n');
function renderMediaReading(text) {
  if (String(text).trim().startsWith('|')) return h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
    h('caption', null, 'Water measurements'),
    h('thead', null, h('tr', null, ...['Time', 'Level'].map(label => h('th', { key: label, scope: 'col', style: { padding: 12, border: '1px solid #64748b' } }, label)))),
    h('tbody', null, ...mediaRows.map(row => h('tr', { key: row[0] }, ...row.map((value, index) => h('td', { key: index, style: { padding: 12, border: '1px solid #64748b' } }, value))))));
  if (String(text).trim().startsWith('[[CHART:')) return h('figure', { style: { margin: 0 } },
    h('figcaption', null, 'Water levels'),
    h('svg', { role: 'img', 'aria-label': 'Water levels: morning 4, afternoon 7, evening 5', viewBox: '0 0 300 190', style: { display: 'block', width: '100%', maxWidth: 480, height: 'auto' } },
      ...mediaRows.map((row, index) => h('g', { key: row[0] },
        h('rect', { 'data-media-bar': row[0], x: 15 + index * 100, y: 155 - Number(row[1]) * 19, width: 70, height: Number(row[1]) * 19, fill: ['#0f766e', '#b91c1c', '#4338ca'][index] }),
        h('text', { x: 50 + index * 100, y: 180, textAnchor: 'middle', fontSize: 14 }, row[0])))));
  return h('div', null, text);
}
const original = contract.createSupportedReading(
  contract.createSourceSnapshot(fixture.originalText, { sourceArtifactId: 'fixture-source', capturedAt: '2026-09-26T00:00:00.000Z' }),
  { id: 'fixture-original', sourceFamilyId: 'fixture-family', config: { language: 'English' } }
);
if (spec.originalSupports) {
  const originalFixture = makeFixture({ sentences: spec.sentences, supports: spec.originalSupports });
  original.readingSupports = contract.validateReadingSupports(original, { annotations: originalFixture.annotations });
}
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
let peerRoot, peerHost;
function unmountPeer() {
  peerRoot?.unmount(); peerRoot = null;
  peerHost?.remove(); peerHost = null;
}
function mountPeer(props, before) {
  unmountPeer();
  const item = { ...props.generatedContent, id: 'fixture-position-peer', sourceFamilyId: 'fixture-position-peer-family' };
  const peerProps = Object.fromEntries(Object.entries(props).map(([key, value]) => [key,
    typeof value === 'function' && /^(set|handle|stopPlayback$)/.test(key) ? noop : value]));
  Object.assign(peerProps, { generatedContent: item, history: [item], readingLearnerKey: 'fixture-position-peer-learner',
    readingLearnerSession: 'fixture-position-peer-session', textEditorRef: React.createRef(),
    focusedParagraphIndex: null, isPlaying: false, playingContentId: null });
  peerHost = document.createElement('div'); peerHost.dataset.readerFixturePeer = '';
  const primary = document.getElementById('root');
  primary.insertAdjacentElement(before ? 'beforebegin' : 'afterend', peerHost);
  peerRoot = window.createRoot(peerHost); peerRoot.render(<modules.SimplifiedView {...peerProps} />);
}
function App() {
  const [state, setState] = React.useState({
    resource: 'fixture-a', revision: 0, supportVersion: 0, learner: spec.learner || '', learnerSession: 'fixture-session-a', mediaReading: false,
    immersive: !!spec.immersive, compare: !!spec.compare, mode: 'read',
    sweep: 0, sentence: 0, playing: false, playingId: null, focus: false, crawl: !!spec.crawl, karaoke: false
  });
  const patch = React.useCallback(update => setState(previous => ({ ...previous, ...update })), []);
  const stop = React.useCallback(() => patch({ playing: false, playingId: null }), [patch]);
  const speak = React.useCallback((text, id, index, restart, language) => {
    window.readerFixture.lastSpoken = { text, id, index, language };
    patch({ playing: true, playingId: id, sentence: index || 0 });
  }, [patch]);
  const item = React.useMemo(() => {
    const data = state.mediaReading ? mediaReadingData : fixture.data + (state.revision ? '\n\nThis reading changed ' + state.revision + ' times.' : '');
    if (spec.protectedOriginal) {
      const current = contract.createSupportedReading(
        contract.createSourceSnapshot(fixture.originalText + (state.revision ? '\n\nThis reading changed ' + state.revision + ' times.' : ''), { sourceArtifactId: 'fixture-source', capturedAt: '2026-09-26T00:00:00.000Z' }),
        { id: state.resource, sourceFamilyId: 'fixture-family', config: { language: 'English' } }
      );
      current.readingSupports = contract.validateReadingSupports(current, {
        annotations: (original.readingSupports?.annotations || []).map(entry => ({ ...entry, text: entry.text + ' Version ' + state.supportVersion }))
      });
      return current;
    }
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
  }, [state.resource, state.revision, state.supportVersion, state.mediaReading]);
  const [focused, setFocused] = React.useState(null), [ruler, setRuler] = React.useState(150);
  const [settings, setSettings] = React.useState({ textSize: spec.fontSize || 24, bgColor: '#ffffff', fontColor: '#1e293b', lineFocus: false });
  const props = { ...base, generatedContent: item, history: [original, item], leveledTextLanguage: fixture.language,
    renderFormattedText: state.mediaReading ? renderMediaReading : base.renderFormattedText,
    isTeacherMode: !!spec.teacher, isZenMode: !spec.teacher, readingLearnerKey: state.learner, readingLearnerSession: state.learnerSession,
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
    acceptedOriginalSupports: original.readingSupports?.annotations.length || 0,
    readingForm: item.instructionalText.form,
    displayedOriginalSupports: item.readingSupports?.annotations.length || 0,
    sourcePreserved: item.instructionalText.form === 'same-text-supported' && item.data === item.sourceSnapshot.text,
    canonicalSentences: (sideBySide(item.data) ? [...sideBySide(item.data).source, ...sideBySide(item.data).target] : item.data.split(/\n{2,}/)).flatMap(split).length }), [item]);
  React.useLayoutEffect(() => { window.readerFixture.ready = true; });
  Object.assign(window.readerFixture, { patch, state, item, mountPeer: before => mountPeer(props, before), unmountPeer,
    expectedOriginalText: spec.protectedOriginal ? fixture.originalText + (state.revision ? '\n\nThis reading changed ' + state.revision + ' times.' : '') : undefined,
    inventory });
  return <React.Profiler id="reader" onRender={metrics.onRender}><modules.SimplifiedView {...props} /></React.Profiler>;
}
window.readerFixture = { ready: false, limitations: [
  'Synthetic host: handleSpeak records calls; integrated host playback mapping is a separate required acceptance check.',
  'Local tone audio only; no cloud synthesis or persistence. No production learner/resource data.',
  'Public helper call counts exclude nested lexical calls; instrumented timings are not production timings.'
] };
const root = window.createRoot(document.getElementById('root'));
window.readerFixture.cleanupBaseline = metrics.lifecycleSnapshot();
window.readerFixture.unmount = () => { unmountPeer(); root.unmount(); delete window.readerFixture.patch; delete window.readerFixture.item; delete window.readerFixture.state; delete window.readerFixture.expectedOriginalText; delete window.readerFixture.mountPeer; delete window.readerFixture.unmountPeer; };
root.render(<App />);
