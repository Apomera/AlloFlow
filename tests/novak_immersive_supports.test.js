// Word supports stay with a preserved original inside Immersive Reader.
//
// WHY (2026-09-28, lane N1 parity audit): Immersive Reader draws words parsed
// from the text, not the exact-text renderer, so every word support (for
// example "heath (an area of open land)") disappeared in the most accessible
// view of the grade-level text. Katie Novak asked for supports throughout.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, api, pure, phase, parse, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule(process.env.ALLO_CONTEXT_CANDIDATE || 'instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
  parse = window.AlloModules.TextPipelineHelpers.parseTaggedContent;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; });

const MACBETH = 'SECOND WITCH.\nWhen the hurlyburly’s done,\nWhen the battle’s lost and won.\n\nTHIRD WITCH. That will be ere the set of sun.\n\nFIRST WITCH. Where the place?\n\nSECOND WITCH. Upon the heath.\n\nFIRST WITCH. I come, Graymalkin!';
const at = (word, text, id) => { const start = MACBETH.indexOf(word); return { id, start, end: start + word.length, quote: word, text, origin: 'educator' }; };
const SUPPORTS = [at('hurlyburly', 'noisy confusion; here, the battle', 'h'), at('ere', 'before', 'e'), at('heath', 'an area of open land', 'x'), at('Graymalkin', 'a grey cat, the witch’s spirit companion', 'g')];
function original(supports = SUPPORTS) {
  const item = api.createSupportedReading(MACBETH, { id: 'macbeth' });
  if (supports.length) item.readingSupports = api.validateReadingSupports(item, { annotations: supports });
  item.immersiveData = parse(MACBETH);
  return item;
}
function mount(item, extra = {}) {
  const noop = () => {};
  const props = { ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop,
    setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop,
    t: key => key, inputText: '', gradeLevel: '9', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false,
    isEditingLeveledText: false, isImmersiveReaderActive: true, immersiveSettings: { textSize: 24 }, isCompareMode: false, isSideBySide: false, isZenMode: false, isProcessing: false, isPlaying: false,
    interactionMode: 'read', history: [item], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null,
    handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop,
    isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr',
    isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: item,
    ErrorBoundary: p => p.children || null, FocusReaderOverlay: () => null, PerspectiveCrawlOverlay: () => null, KaraokeReaderOverlay: () => null, ConfettiExplosion: () => null,
    ImmersiveToolbar: () => null, ImmersiveWord: ({ wordData }) => React.createElement('span', { 'data-word': true }, wordData.text), setIsImmersiveReaderActive: noop, handleCloseImmersiveReader: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
}
const dialog = () => host.querySelector('[role=dialog]');
const chips = () => [...dialog().querySelectorAll('[data-immersive-gloss]')];
// The word a chip belongs to: the word span just before the chip (and any chips before it).
const wordBefore = chip => { let node = chip.previousElementSibling; while (node && node.hasAttribute('data-immersive-gloss')) node = node.previousElementSibling; return node && node.textContent; };

describe('mapping supports onto Immersive words', () => {
  it('places each support after the word that holds its end, keeping a word whole', () => {
    const words = parse(MACBETH);
    const after = View.mapSupportsToImmersiveWords(words, MACBETH, SUPPORTS);
    const placed = [...after.entries()].map(([index, entries]) => [words[index].text, entries.map(entry => entry.id).join('')]);
    expect(placed).toEqual([['s', 'h'], ['ere', 'e'], ['heath', 'x'], ['Graymalkin', 'g']]);
    // "s" here is the end of "hurlyburly’s": the chip does not split the word.
    const hurly = words.findIndex(word => word.text === 'hurlyburly');
    expect(words.slice(hurly, hurly + 3).map(word => word.text).join('')).toBe('hurlyburly’s');
  });
  it('places nothing it cannot find, and nothing for empty input', () => {
    // Past the end of the text: nowhere to put it.
    expect(View.mapSupportsToImmersiveWords(parse(MACBETH), MACBETH, [{ id: 'z', start: 5000, end: 5003, quote: 'zzz', text: 'x' }]).size).toBe(0);
    // A support ending inside a word goes after that whole word, as on the page.
    expect([...View.mapSupportsToImmersiveWords(parse(MACBETH), MACBETH, [{ id: 'm', start: 0, end: 3, quote: 'SEC', text: 'x' }]).keys()].map(index => parse(MACBETH)[index].text)).toEqual(['SECOND']);
    expect(View.mapSupportsToImmersiveWords([], MACBETH, SUPPORTS).size).toBe(0);
    expect(View.mapSupportsToImmersiveWords(parse(MACBETH), MACBETH, []).size).toBe(0);
  });
});

describe('Immersive Reader on a preserved original', () => {
  it('shows every word support beside its word, and the words themselves are unchanged', () => {
    mount(original());
    expect(dialog()).not.toBeNull();
    expect(chips().map(chip => chip.textContent)).toEqual(['(noisy confusion; here, the battle)', '(before)', '(an area of open land)', '(a grey cat, the witch’s spirit companion)']);
    expect(chips().map(wordBefore)).toEqual(['s', 'ere', 'heath', 'Graymalkin']);
    const words = [...dialog().querySelectorAll('[data-word]')].map(node => node.textContent).join('');
    // Line breaks render as blocks, so compare without whitespace: every word, in order, unchanged.
    expect(words.replace(/\s+/g, '')).toBe(MACBETH.replace(/\s+/g, ''));
    expect(chips()[0].getAttribute('aria-label')).toBe('Gloss for hurlyburly');
  });
  it('follows the page: turning Show glosses off removes them from Immersive Reader too', () => {
    mount(original());
    const toggle = [...host.querySelectorAll('label')].find(label => /Show glosses/.test(label.textContent)).querySelector('input');
    act(() => { toggle.click(); });
    expect(chips()).toHaveLength(0);
    act(() => { toggle.click(); });
    expect(chips()).toHaveLength(4);
  });
  it('an original with no supports, and an adapted text, show no support chips', () => {
    mount(original([]));
    expect(dialog()).not.toBeNull();
    expect(chips()).toHaveLength(0);
    act(() => root.unmount()); host.remove();
    // Its original, with supports, is in the lesson: those supports belong to the
    // original's words and must not be placed on the adapted text.
    const source = original();
    const adapted = { id: 'adapted', type: 'simplified', data: 'The witches plan to meet on the heath.', config: { language: 'English' }, immersiveData: parse('The witches plan to meet on the heath.'),
      sourceSnapshot: source.sourceSnapshot, sourceFamilyId: source.sourceFamilyId,
      instructionalText: { form: 'adapted', role: 'supplemental', replacementAuthorization: { authorized: false, source: 'none' } } };
    mount(adapted, { history: [source, adapted] });
    expect(dialog()).not.toBeNull();
    expect(chips()).toHaveLength(0);
  });
});
