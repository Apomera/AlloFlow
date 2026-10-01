import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, api, pure, phase, helpers, host, root, props;
const SOURCE = 'A thane met a king. The thane greeted the king.\n\nThe king thanked the thane.';
const ADAPTED = 'A thane saw a king. The thane welcomed the king.\n\nThe king thanked the thane.';
const PICTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTY/h/neE/PsyALoCOh4cCAJZbtUFVl2i9AAAAAElFTkSuQmCC';
const GLOSSARY = [{ term: 'thane', def: 'A Scottish lord.', image: PICTURE }, { term: 'king', def: 'A ruler of a kingdom.', image: { src: PICTURE, alt: 'A crown.' } }];
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  const ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; globalThis.React = window.React = React; globalThis.ReactDOM = window.ReactDOM = ReactDOM;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.AlloIcons = new Proxy({}, { get: () => () => null });
  globalThis.__reportReaderHostGlossaryAdapter = readFileSync('AlloFlowANTI.txt', 'utf8').match(/^  const highlightGlossaryTerms =[\s\S]*?^  };/m)?.[0];
  if (!globalThis.__reportReaderHostGlossaryAdapter) throw new Error('Canonical host glossary adapter missing');
  for (const file of ['text_pipeline_helpers_module.js', 'instructional_context_module.js', 'phase_n_misc_helpers_module.js']) loadAlloModule(file);
  // Canonical source compiled in memory; shared generated outputs remain untouched.
  const { transformSync } = require('@babel/core');
  new Function(transformSync(readFileSync('text_utility_helpers_source.jsx', 'utf8'), { plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { useBuiltIns: false }]], babelrc: false, configFile: false }).code)();
  const { INPUTS, renderReaderModule } = require('../dev-tools/lib/reader_compiler.cjs');
  new Function(renderReaderModule(INPUTS.map(file => readFileSync(file, 'utf8'))))();
  View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; helpers = window.AlloModules.TextUtilityHelpers;
}, 60000);
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); host = root = null;
  document.querySelectorAll('[role="tooltip"]').forEach(node => node.remove()); localStorage.clear(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks();
});
function pair(source = SOURCE, adaptedText = ADAPTED) {
  const original = api.createSupportedReading(source, { id: 'original', sourceFamilyId: 'report-reader', config: { language: 'English' } }), start = source.indexOf('thane');
  original.readingSupports = api.upsertReadingSupport(original, undefined, { id: 'curated-thane', start, end: start + 5, quote: 'thane', text: 'Existing curated annotation.', origin: 'teacher', kind: 'gloss', image: { src: PICTURE, alt: 'Existing annotation picture.' } });
  const adapted = { id: 'adapted', type: 'simplified', data: adaptedText, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'report-reader', instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English' } };
  return { original, adapted };
}
function mount(mode = 'adapted', extra = {}) {
  const items = pair(), noop = () => {}, deps = { leveledTextLanguage: 'English', isLineFocusMode: false, clozeInstanceSet: new Set(), ClozeInput: () => null };
  const highlight = new Function('_alloTextUtilityHelpersDeps', globalThis.__reportReaderHostGlossaryAdapter + '\nreturn highlightGlossaryTerms;')(() => deps);
  props = {
    ComplexityGauge: () => null, t: key => key, generatedContent: mode === 'original' ? items.original : items.adapted,
    history: [items.original, items.adapted], inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [],
    selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isZenMode: true, isCompareMode: mode === 'both', isEditingLeveledText: false, isProcessing: false, isPlaying: false, interactionMode: 'read',
    textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text,
    highlightGlossaryTerms: highlight, latestGlossary: GLOSSARY,
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: highlight, latestGlossary: GLOSSARY, MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(),
    handleTextMouseUp: noop, setFocusedParagraphIndex: noop, setSelectionMenu: vi.fn(), setIsCustomReviseOpen: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop,
    setInteractionMode: vi.fn(), setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: vi.fn(), closeDefinition: noop, closePhonics: noop, closeRevision: noop,
    setGeneratedContent: vi.fn(), setHistory: vi.fn(), handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleToggleIsEditingLeveledText: noop, ...extra,
  };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host); act(() => root.render(React.createElement(View, props))); return items;
}
const find = selector => host.querySelector(selector), terms = scope => [...(scope || host).querySelectorAll('.allo-glossary-term')];
const key = (node, value) => act(() => node.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })));
const click = node => act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))), tooltip = () => document.querySelector('[role="tooltip"]');
function passageText(node) { const copy = node.cloneNode(true); copy.querySelectorAll('[data-reading-gloss], [data-sentence-read], .sr-only').forEach(child => child.remove()); return copy.textContent.replace(/\s+/g, ' ').trim(); }
function expectNoNestedControls() { expect(host.querySelector('button button, button [role="button"], [role="button"] button, [role="button"] [role="button"], a [role="button"]')).toBeNull(); }
describe('actual reader glossary parity', () => {
  it.each(['adapted', 'original', 'both'])('marks repeated occurrences and opens definition/picture in %s', mode => {
    const items = mount(mode), panes = mode === 'both' ? [find('[data-compare-version="source"]'), find('[data-compare-version="adapted"]')] : [find(mode === 'original' ? '[data-original-source]' : '[data-reading-passage]')];
    for (const pane of panes) {
      expect(terms(pane).map(node => node.textContent)).toEqual(['thane', 'king', 'thane', 'king', 'king', 'thane']);
      for (const term of terms(pane)) {
        click(term); expect(tooltip().textContent).toContain(term.textContent === 'thane' ? 'A Scottish lord.' : 'A ruler of a kingdom.');
        expect(tooltip().querySelector('img').getAttribute('src')).toBe(PICTURE); expect(term.getAttribute('aria-describedby')).toBe(tooltip().id);
        key(term, 'Escape'); expect(tooltip()).toBeNull();
      }
    }
    expect(props.handleSpeak).not.toHaveBeenCalled(); expectNoNestedControls(); expect(items.original.data).toBe(SOURCE); expect(items.adapted.data).toBe(ADAPTED);
  });
  it('keeps exact Original wording and curated annotation/picture', () => {
    const items = mount('original'), source = find('[data-original-source]');
    expect(passageText(source)).toBe(SOURCE.replace(/\s+/g, ' ')); expect(source.querySelector('[data-reading-gloss]').textContent).toContain('Existing curated annotation.');
    expect(source.querySelector('[data-reading-gloss-picture]').alt).toBe('Existing annotation picture.'); expect(items.original.readingSupports.annotations[0].text).toBe('Existing curated annotation.');
  });
  it('retains glossary help in both Show changes columns, then restores inline annotations', () => {
    mount('both'); click(find('input[aria-label="Show changes"]'));
    for (const kind of ['source', 'adapted']) {
      const pane = find('[data-compare-version="' + kind + '"]'); expect(terms(pane)).toHaveLength(6);
      expect(passageText(pane)).toBe((kind === 'source' ? SOURCE : ADAPTED).replace(/\s+/g, ' '));
      click(terms(pane)[4]); expect(tooltip().textContent).toContain('A ruler of a kingdom.'); key(terms(pane)[4], 'Escape');
    }
    expect(find('[data-compare-version="source"] del')).not.toBeNull(); expect(find('[data-compare-version="adapted"] ins')).not.toBeNull();
    click(find('input[aria-label="Show changes"]')); expect(find('[data-compare-version="source"] [data-reading-gloss]').textContent).toContain('Existing curated annotation.'); expectNoNestedControls();
  });
  it.each(['adapted', 'original', 'both'])('keeps glossary available in student preview %s', mode => {
    mount(mode, { isStudentPreview: true, previewLimitId: 'preview-limits' }); click(terms()[0]); expect(tooltip().textContent).toContain('A Scottish lord.');
    expect(props.handleWordClick).not.toHaveBeenCalled(); expect(props.handleSpeak).not.toHaveBeenCalled(); expectNoNestedControls();
  });
});
describe('glossary access alongside reader actions', () => {
  it.each(['adapted', 'original'])('keeps focused help anchored after viewport scroll in %s, then respects Escape', mode => {
    mount(mode); const term = terms()[0];
    vi.spyOn(term, 'getBoundingClientRect').mockReturnValue({ left: 32, top: 1000, right: 82, bottom: 1044, width: 50, height: 44 });
    act(() => term.focus()); expect(tooltip()).not.toBeNull();
    term.getBoundingClientRect.mockReturnValue({ left: 32, top: 420, right: 82, bottom: 464, width: 50, height: 44 });
    act(() => document.dispatchEvent(new Event('scroll')));
    expect(document.activeElement).toBe(term); expect(tooltip()).not.toBeNull();
    expect(tooltip().style.top).toBe('410px'); expect(tooltip().style.left).toBe('8px');
    key(term, 'Escape'); expect(tooltip()).toBeNull();
    act(() => document.dispatchEvent(new Event('scroll'))); expect(tooltip()).toBeNull();
    expect(document.activeElement).toBe(term); expect(props.handleSpeak).not.toHaveBeenCalled();
  });
  it('still dismisses pointer-only help when its passage scrolls', () => {
    mount('original'); const term = terms()[0];
    act(() => term.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(tooltip()).not.toBeNull(); expect(document.activeElement).not.toBe(term);
    act(() => document.dispatchEvent(new Event('scroll'))); expect(tooltip()).toBeNull();
  });
  it.each(['adapted', 'original', 'both'])('marks the playing sentence current and clears it when stopped in %s', mode => {
    mount(mode);
    const selector = mode === 'adapted' ? '[data-reading-sentence]' : '[data-exact-sentence-stop]';
    const control = find(mode === 'adapted' ? '[data-sentence-read]' : '[data-exact-sentence-stop]');
    expect(host.querySelector(selector + '[aria-current="true"]')).toBeNull();
    click(control);
    const [text, contentId, start] = props.handleSpeak.mock.calls.at(-1);
    const sentences = text.split(/\n{2,}/).flatMap(part => pure.splitTextToSentences(part, {}));
    Object.assign(props, { isPlaying: true, playingContentId: contentId, playbackState: { currentIdx: start, sentences } });
    act(() => root.render(React.createElement(View, props)));
    expect(host.querySelectorAll(selector + '[aria-current="true"]')).toHaveLength(1);
    if (mode === 'both') expect(find('[data-compare-version="adapted"] [aria-current="true"]')).toBeNull();
    Object.assign(props, { isPlaying: false, playingContentId: null, playbackState: { currentIdx: -1 } });
    act(() => root.render(React.createElement(View, props)));
    expect(host.querySelector(selector + '[aria-current="true"]')).toBeNull();
  });
  it.each(['adapted', 'original'])('focus, Enter, Space and Escape work without speech in %s', mode => {
    mount(mode); const term = terms()[0]; act(() => term.focus()); expect(tooltip()).not.toBeNull(); key(term, 'Escape'); expect(tooltip()).toBeNull(); expect(document.activeElement).toBe(term);
    key(term, 'Enter'); expect(tooltip()).not.toBeNull(); key(term, 'Escape'); key(term, ' '); expect(tooltip()).not.toBeNull(); expect(props.handleSpeak).not.toHaveBeenCalled();
    key(term, 'Escape'); expect(document.activeElement).toBe(term); const sentence = find(mode === 'original' ? '[data-exact-sentence-stop]' : '[data-sentence-read]');
    act(() => sentence.focus());
    // jsdom does not synthesize the native button click from Enter; Chromium
    // coverage checks that keyboard activation on the built candidate separately.
    if (sentence.tagName === 'BUTTON') click(sentence); else key(sentence, 'Enter');
    expect(props.handleSpeak).toHaveBeenCalledTimes(1);
  });
  it.each(['adapted', 'original'])('Word meaning uses glossary before AI and preserves arrows in %s', mode => {
    mount(mode, { interactionMode: 'define' }); const selector = mode === 'original' ? '[data-exact-word]' : '[data-reading-word]', words = [...host.querySelectorAll(selector)], term = words.find(node => node.classList.contains('allo-glossary-term')), before = words[words.indexOf(term) - 1];
    act(() => before.focus()); key(before, 'ArrowRight'); expect(document.activeElement).toBe(term); expect(tooltip()).not.toBeNull(); click(term);
    expect(props.handleWordClick).not.toHaveBeenCalled(); expect(tooltip().querySelector('img')).not.toBeNull(); key(term, 'ArrowRight'); expect(document.activeElement).toBe(words[words.indexOf(term) + 1]);
    click(words.find(node => node.textContent === 'met' || node.textContent === 'saw')); expect(props.handleWordClick).toHaveBeenCalledTimes(1); expectNoNestedControls();
  });
  it('preserves Original word sounds on glossary words', () => {
    mount('original', { interactionMode: 'phonics' }); const word = [...host.querySelectorAll('[data-exact-word]')].find(node => node.textContent === 'thane');
    click(word); expect(props.handlePhonicsClick).toHaveBeenCalledWith('thane', expect.anything(), { audioPlayback: 'reader', language: 'English' }); expect(tooltip()).toBeNull();
  });
  it('shows on hover, keeps the card hoverable and dismisses outside touch', () => {
    vi.useFakeTimers();
    try {
      mount('original'); const term = terms()[0]; act(() => term.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))); expect(tooltip()).not.toBeNull();
      act(() => term.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: tooltip() })));
      act(() => tooltip().dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: term })));
      act(() => vi.advanceTimersByTime(200)); expect(tooltip()).not.toBeNull(); act(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))); expect(tooltip()).toBeNull(); click(term); expect(tooltip()).not.toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it('keeps source hyperlinks free of interactive glossary children', () => {
    const items = pair('A [thane](https://example.com/thane) met a king.', 'A thane saw a king.');
    mount('original', { generatedContent: items.original, history: [items.original] });
    const link = find('[data-original-source] a').cloneNode(true); link.querySelectorAll('[data-reading-gloss]').forEach(node => node.remove());
    expect(link.textContent).toBe('thane'); expect(find('a .allo-glossary-term')).toBeNull(); expectNoNestedControls();
  });
  it('handles original-only readings, selection and boundaries', () => {
    const original = api.createSupportedReading('A thane met thanes and C++. A thane.', { id: 'only-original', config: { language: 'English' } });
    mount('original', { generatedContent: original, history: [original], latestGlossary: [GLOSSARY[0], { term: 'C++', def: 'A language.' }, { term: 'met', def: 'Hidden.', isSelected: false }] });
    expect(terms().map(node => node.textContent)).toEqual(['thane', 'C++', 'thane']); expect(passageText(find('[data-original-source]'))).toBe(original.data);
  });
});
