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
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); loadAlloModule('view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });
const splitParts = text => {
  const parts = String(text).split('--- ENGLISH TRANSLATION ---');
  return parts.length < 2 ? null : { source: parts[0].trim().split(/\n{2,}/), target: parts[1].trim().split(/\n{2,}/), sourceFull: parts[0].trim(), targetFull: parts[1].trim() };
};
function mount(extra = {}) {
  const noop = () => {}, handleSpeak = vi.fn(), handleWordClick = vi.fn(), handleQuickAddGlossary = vi.fn();
  const props = { t: k => k, generatedContent: { id: 'reading', type: 'simplified', data: '## Water\n\nWater is **important**.\n\n1. Watch.\n2. Explain.' }, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: splitParts, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak, handleWordClick, handleQuickAddGlossary, handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: lang => lang === 'Arabic' ? 'rtl' : 'ltr', isRtlLang: lang => lang === 'Arabic', renderFormattedText: text => React.createElement('div', { 'data-table-fixture': true }, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return { props, handleSpeak, handleWordClick, handleQuickAddGlossary, body: host.querySelector('[data-simplified-reading-body]') };
}
const key = (element, value) => act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })));
const content = data => ({ id: 'reading', type: 'simplified', data });
describe('Adapted reading structure and content retention', () => {
  it('renders semantic headings, ordered lists and inline emphasis', () => {
    const { body } = mount();
    expect(body.querySelector('h2').textContent.trim()).toBe('Water');
    expect(body.querySelector('strong').textContent).toBe('important');
    expect([...body.querySelectorAll('ol > li')].map(x => x.textContent.trim())).toEqual(['Watch.', 'Explain.']);
    expect(body.textContent).not.toContain('**');
  });
  it('keeps nested lists, explicit numbering and following paragraphs in order', () => {
    const { body } = mount({ generatedContent: content('3. Observe\n  - Ice\n  - Steam\n7. Explain\n\nFinish here.') });
    expect(body.querySelector('ol').start).toBe(3);
    expect(body.querySelectorAll('ol > li')).toHaveLength(2);
    expect([...body.querySelectorAll('ol > li')].map(x => x.value)).toEqual([3, 7]);
    expect(body.querySelectorAll('ol > li > ul > li')).toHaveLength(2);
    expect(body.textContent.indexOf('Observe')).toBeLessThan(body.textContent.indexOf('Ice'));
    expect(body.textContent.indexOf('Explain')).toBeLessThan(body.textContent.indexOf('Finish'));
  });
  it.each(['revise', 'explain', 'define', 'phonics', 'add-glossary'])('preserves structure in %s', interactionMode => {
    const { body } = mount({ interactionMode });
    expect(body.querySelector('h2')).not.toBeNull(); expect(body.querySelector('ol')).not.toBeNull(); expect(body.querySelector('strong')).not.toBeNull();
  });
  it.each([false, true])('retains both tables with side-by-side=%s', isSideBySide => {
    const table = '| State | Example |\n| --- | --- |\n| Solid | TABLE_VALUE |';
    const { body } = mount({ isSideBySide, generatedContent: content('First.\n\n' + table + '\n\n--- ENGLISH TRANSLATION ---\n\nSecond.\n\n' + table) });
    expect(body.querySelectorAll('[data-reading-table]')).toHaveLength(2);
    expect(body.textContent.match(/TABLE_VALUE/g)).toHaveLength(2);
    expect([...body.querySelectorAll('[data-reading-sentence]')].map(x => Number(x.dataset.readingSentence))).toEqual([0, 1]);
  });
  it('changes reading width without changing content', () => {
    const { body } = mount(); const before = body.querySelector('section').textContent;
    const select = body.querySelector('select'); act(() => { select.value = '40'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(body.style.maxWidth).toContain('40ch'); expect(body.querySelector('section').textContent).toBe(before);
  });
});
describe('Adapted reading keyboard and multilingual parity', () => {
  it.each([false, true])('activates bilingual sentences with keyboard, side-by-side=%s', isSideBySide => {
    const { handleSpeak } = mount({ isSideBySide, generatedContent: content('Uno.\n\n--- ENGLISH TRANSLATION ---\n\nOne.') });
    const sentences = host.querySelectorAll('[data-reading-sentence]');
    expect(sentences).toHaveLength(2); key(sentences[1], 'Enter');
    expect(handleSpeak).toHaveBeenCalledWith(expect.any(String), 'simplified-main', 1);
    expect(sentences[1].tabIndex).toBe(0);
  });
  it('uses roving word focus and keyboard glossary activation in stacked bilingual reading', () => {
    const { handleQuickAddGlossary } = mount({ interactionMode: 'add-glossary', generatedContent: content('Dos palabras.\n\n--- ENGLISH TRANSLATION ---\n\nTwo words.') });
    const paragraph = host.querySelector('[data-reading-paragraph]'), words = paragraph.querySelectorAll('[data-reading-word]');
    expect([...words].filter(x => x.tabIndex === 0)).toHaveLength(1);
    act(() => words[0].focus()); key(words[0], 'ArrowRight'); expect(document.activeElement).toBe(words[1]);
    key(words[1], ' '); expect(handleQuickAddGlossary).toHaveBeenCalledWith('palabras', true);
  });
  it('segments unspaced words without changing punctuation or text', () => {
    const text = '水变成水蒸气。它升到空中。';
    const { body } = mount({ interactionMode: 'define', generatedContent: { ...content(text), config: { language: 'Chinese' } } });
    expect(body.querySelectorAll('[data-reading-word]').length).toBeGreaterThan(2);
    expect(body.querySelector('[data-reading-paragraph]').textContent).toBe(text);
    expect(body.querySelector('[data-reading-paragraph]').lang).toBe('zh');
  });
  it('uses the saved language and marks unmatched paragraphs', () => {
    const { body } = mount({ isSideBySide: true, leveledTextLanguage: 'French', generatedContent: { ...content('واحد.\n\nاثنان.\n\n--- ENGLISH TRANSLATION ---\n\nOne.'), config: { language: 'Arabic' } } });
    expect(body.textContent).toContain('Arabic'); expect(body.textContent).not.toContain('French');
    expect(body.querySelector('[data-reading-paragraph]').dir).toBe('rtl');
    expect(body.textContent).toContain('No corresponding paragraph');
  });
  it('keeps multilingual, list and paragraph sentence enumeration consistent', () => {
    const text = '## 水\n\n1. 水变成蒸气。它升高。\n2. 雨落下。\n\n> Think\n\nDr. Smith explains. [⁽¹⁾](https://example.com/a.b)';
    mount({ generatedContent: content(text) });
    const expected = pure.splitTextToSentences(text, {});
    expect([...host.querySelectorAll('[data-reading-sentence]')].map(x => Number(x.dataset.readingSentence))).toEqual(expected.map((_, i) => i));
    expect(expected).toContain('Dr. Smith explains. [⁽¹⁾](https://example.com/a.b)');
    expect(pure.splitTextToSentences('水变成水蒸气。它升到空中。', {})).toHaveLength(2);
  });
  it.each(['> Think\nMore thought', '1. Observe\nNext paragraph', 'Intro without stop\n- List item', '## Title\nBody', '1. Observe\n  Continue here\n2. Explain'])('keeps structural sentence boundaries consistent: %s', text => {
    mount({ generatedContent: content(text) });
    expect(host.querySelectorAll('[data-reading-sentence]').length).toBe(pure.splitTextToSentences(text, {}).length);
  });
  it('has a safe segmentation fallback with exact text retention', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
    try { Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true });
      const text = '水、ไทย! café'; expect(View.wordSegments(text, 'invalid language').map(x => x.text).join('')).toBe(text);
    } finally { Object.defineProperty(Intl, 'Segmenter', descriptor); }
  });
});
describe('Teacher comparison', () => {
  it('defaults to a comparable saved language and preserves newline text', () => {
    mount({ isCompareMode: true, history: [{ id: 'source', type: 'analysis', data: 'Agua.\n\nMás agua.', config: { language: 'Spanish' } }], generatedContent: { ...content('Agua.\n\nOtra agua.\n\n--- ENGLISH TRANSLATION ---\n\nWater.'), config: { language: 'Spanish' }, instructionalText: { sourceArtifactId: 'source' } } });
    expect(host.querySelector('[data-compare-version="adapted"]').textContent).toBe('Agua.\n\nOtra agua.');
    expect(host.querySelector('[data-compare-version="source"]').textContent).toBe('Agua.\n\nMás agua.');
  });
  it('preserves complete long text without allocating an unbounded comparison matrix', () => {
    const text = ('Water flows.\n\n').repeat(1200);
    mount({ isCompareMode: true, inputText: text, generatedContent: content(text + 'FINAL_SENTINEL') });
    expect(host.textContent).toContain('without word change highlighting'); expect(host.querySelector('[data-compare-version="adapted"]').textContent).toBe(text + 'FINAL_SENTINEL');
  });
});
