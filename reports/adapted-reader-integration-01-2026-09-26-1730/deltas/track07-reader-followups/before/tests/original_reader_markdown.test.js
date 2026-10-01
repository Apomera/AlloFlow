// The original reader (Read with supports / Read original with supports)
// draws the source's Markdown, like the adapted reader and the Both pane.
//
// WHY (2026-09-23): the original-only view called the exact renderer without
// its Markdown mode, so a generated source showed "# Water Cycle", a lone "#"
// and "## The Journey..." as literal text. A heading marker with no text also
// reached speech as "Say the sound: #". Word supports are anchored to exact
// character positions, so the fix keeps the exact renderer (not the adapted
// renderer, which rewrites the text) and checks those positions here.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, api;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
function mount(extra = {}) {
  const noop = () => {}, handleSpeak = vi.fn(), setSelectionMenu = vi.fn();
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu, setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak, handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return { props, handleSpeak, setSelectionMenu, source: () => host.querySelector('[data-original-source]') };
}
// The text from the reported screenshot: a heading, an empty heading marker, a subheading.
const WATER = '# Water Cycle\n\n#\n\n## The Journey Up and Down\n\nEarth contains a set amount of water. This water **never** leaves the planet.';
const supported = (text, supports = []) => {
  const item = api.createSupportedReading(text, { id: 'original' });
  if (supports.length) item.readingSupports = api.validateReadingSupports(item.sourceSnapshot, supports);
  return item;
};

describe('the original reader draws Markdown', () => {
  it('renders headings and emphasis, and no heading markers are shown', () => {
    const item = supported(WATER);
    const { source } = mount({ generatedContent: item });
    // As in the main renderer, the top heading is h2 (the page owns h1).
    expect(source().querySelector('h1')).toBeNull();
    expect(source().querySelector('h2').textContent).toBe('Water Cycle');
    expect(source().querySelector('h3').textContent).toBe('The Journey Up and Down');
    expect(source().querySelector('strong').textContent).toBe('never');
    expect(source().textContent).not.toMatch(/#|\*\*/);
    // Every word of the original is still shown, and the stored text is untouched.
    const words = s => s.replace(/[#*]/g, ' ').split(/\s+/).filter(Boolean);
    expect(words(source().textContent)).toEqual(words(WATER));
    expect(item.data).toBe(WATER);
  });

  it('an empty heading marker leaves no extra gap', () => {
    const { source } = mount({ generatedContent: supported(WATER) });
    const withMarker = source().textContent;
    act(() => root.unmount()); host.remove(); root = null;
    const { source: plainSource } = mount({ generatedContent: supported(WATER.replace('#\n\n', '')) });
    expect(withMarker).toBe(plainSource().textContent);
  });

  it('word supports stay on the right words in a heading and in the body', () => {
    const journey = WATER.indexOf('Journey');
    const planet = WATER.indexOf('planet');
    const item = supported(WATER, [
      { id: 'j', start: journey, end: journey + 7, quote: 'Journey', text: 'A long trip.' },
      { id: 'p', start: planet, end: planet + 6, quote: 'planet', text: 'Earth.' },
    ]);
    const { source } = mount({ generatedContent: item });
    const glosses = [...source().querySelectorAll('[data-reading-gloss]')];
    expect(glosses.map(g => g.textContent)).toEqual([expect.stringContaining('A long trip.'), expect.stringContaining('Earth.')]);
    expect(source().querySelector('h3').textContent).toMatch(/^The Journey \(A long trip\.\)/);
    expect(glosses[1].previousSibling.textContent.endsWith('planet')).toBe(true);
  });

  it('a line of dashes is a divider, not a bullet, and HTML headings render', () => {
    const { source } = mount({ generatedContent: supported('<h2>Part One</h2>\n\nFirst part.\n\n* * *\n\nSecond part.') });
    expect(source().querySelector('h2').textContent).toBe('Part One');
    expect(source().querySelector('hr')).not.toBeNull();
    expect(source().querySelector('li')).toBeNull();
    expect(source().textContent).not.toContain('<h2>');
  });

  it('Explain gets the words of a heading, not its markers', () => {
    const { source, setSelectionMenu } = mount({ generatedContent: supported(WATER), interactionMode: 'explain' });
    act(() => source().querySelector('h3').click());
    expect(setSelectionMenu).toHaveBeenCalledWith(expect.objectContaining({ text: 'The Journey Up and Down' }));
  });
});

describe('read-aloud skips an empty heading marker', () => {
  it('a lone "#" is not a sentence', () => {
    expect(pure.splitTextToSentences(WATER, {})).toEqual([
      '# Water Cycle', '## The Journey Up and Down', 'Earth contains a set amount of water.', 'This water **never** leaves the planet.',
    ]);
  });
  it('a real hashtag or number sign in a sentence is kept', () => {
    expect(pure.splitTextToSentences('Use #1 first. Then #2.', {})).toEqual(['Use #1 first.', 'Then #2.']);
  });
});
