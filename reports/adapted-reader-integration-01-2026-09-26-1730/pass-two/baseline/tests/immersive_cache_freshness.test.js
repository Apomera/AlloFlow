// Immersive Reader shows the current text, not the words cached before an edit.
//
// WHY (2026-09-24): the reader's words (immersiveData) were cached on the
// resource with nothing recording which text they came from. Every edit,
// "Simpler" change or new version copies the item, so reopening Immersive
// Reader (and the Crawl and Karaoke overlays, which read those words) showed
// the old wording. The cache now records its source text; items saved before
// that are compared word by word.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  const env = process.env;
  loadAlloModule(env.ALLO_HOST_CANDIDATE || 'host_handlers_module.js');
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
const words = text => String(text).split(/\s+/).filter(Boolean).map(w => ({ text: w, pos: 'noun' }));

describe('opening Immersive Reader', () => {
  const open = content => {
    const deps = { generatedContent: content, isImmersiveReaderActive: false, setIsImmersiveReaderActive: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), _stripForImmersive: x => String(x || ''), parseTaggedContent: words, warnLog: vi.fn(), addToast: vi.fn(), t: k => k };
    window.AlloModules.createHostHandlers(deps).handleAnalyzePOS();
    return deps;
  };
  it('reuses tagged words that match the current text', () => {
    const d = open({ id: 'r', type: 'simplified', data: 'Plants grow fast.', immersiveData: words('Plants grow fast.'), immersiveSource: 'Plants grow fast.', posEnriched: true });
    expect(d.setGeneratedContent).not.toHaveBeenCalled();
    expect(d.setIsImmersiveReaderActive).toHaveBeenCalledWith(true);
  });
  it('rebuilds words from the current text after an edit', () => {
    const d = open({ id: 'r', type: 'simplified', data: 'Plants grow slowly now.', immersiveData: words('Plants grow fast.'), immersiveSource: 'Plants grow fast.', posEnriched: true });
    const next = d.setGeneratedContent.mock.calls[0][0];
    expect(next.immersiveData.map(w => w.text).join(' ')).toBe('Plants grow slowly now.');
    expect(next.immersiveSource).toBe('Plants grow slowly now.');
    expect(next.posEnriched).toBe(false);
  });
  it('items saved before the source was recorded are compared word by word', () => {
    const same = open({ id: 'r', type: 'simplified', data: 'Plants grow fast.', immersiveData: words('Plants grow fast.'), posEnriched: true });
    expect(same.setGeneratedContent).not.toHaveBeenCalled();
    const changed = open({ id: 'r', type: 'simplified', data: 'Plants grow slowly.', immersiveData: words('Plants grow fast.'), posEnriched: true });
    expect(changed.setGeneratedContent.mock.calls[0][0].immersiveData.map(w => w.text).join(' ')).toBe('Plants grow slowly.');
  });
});

describe('the Crawl and Karaoke overlays', () => {
  function mount(content) {
    const seen = {};
    const Crawl = props => { seen.crawl = props.text; return null; };
    const Karaoke = props => { seen.karaoke = props.text; return null; };
    const noop = () => {};
    const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, generatedContent: content, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], PerspectiveCrawlOverlay: Crawl, KaraokeReaderOverlay: Karaoke, isCrawlReaderActive: true,
      // The overlays open from inside Immersive Reader.
      isImmersiveReaderActive: true, ErrorBoundary: ({ children }) => children, FocusReaderOverlay: () => null, ImmersiveToolbar: () => null, ImmersiveWord: () => null, ConfettiExplosion: () => null, immersiveSettings: {} };
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View, props)));
    return seen;
  }
  it('read the current text when the cached words are from an older version', () => {
    const seen = mount({ id: 'r', type: 'simplified', data: 'Plants grow slowly now.', immersiveData: words('Plants grow fast.'), immersiveSource: 'Plants grow fast.', posEnriched: true });
    expect(seen.crawl).toBe('Plants grow slowly now.');
    expect(seen.karaoke).toBe('Plants grow slowly now.');
  });
  it('still read the cached words when they match', () => {
    const seen = mount({ id: 'r', type: 'simplified', data: 'Plants grow fast.', immersiveData: words('Plants grow fast.'), immersiveSource: 'Plants grow fast.', posEnriched: true });
    expect(seen.crawl).toBe('Plants grow fast.');
  });
});
