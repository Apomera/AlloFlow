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
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); loadAlloModule('view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { localStorage.removeItem('alloflow_reading_width'); localStorage.removeItem('alloflow_reading_show_changes'); if (root) act(() => root.unmount()); host?.remove(); root = null; });
const splitParts = text => {
  const parts = String(text).split('--- ENGLISH TRANSLATION ---');
  return parts.length < 2 ? null : { source: parts[0].trim().split(/\n{2,}/), target: parts[1].trim().split(/\n{2,}/), sourceFull: parts[0].trim(), targetFull: parts[1].trim() };
};
function mount(extra = {}) {
  const noop = () => {}, handleSpeak = vi.fn(), handleWordClick = vi.fn(), handleQuickAddGlossary = vi.fn();
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, generatedContent: { id: 'reading', type: 'simplified', data: '## Water\n\nWater is **important**.\n\n1. Watch.\n2. Explain.' }, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: splitParts, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak, handleWordClick, handleQuickAddGlossary, handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: lang => lang === 'Arabic' ? 'rtl' : 'ltr', isRtlLang: lang => lang === 'Arabic', renderFormattedText: text => React.createElement('div', { 'data-table-fixture': true }, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], ...extra };
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
    const { body } = mount({ interactionMode, isTeacherMode: ['revise', 'add-glossary'].includes(interactionMode) });
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
    const { handleQuickAddGlossary } = mount({ isTeacherMode: true, interactionMode: 'add-glossary', generatedContent: content('Dos palabras.\n\n--- ENGLISH TRANSLATION ---\n\nTwo words.') });
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
    mount({ isTeacherMode: true, isCompareMode: true, history: [{ id: 'source', type: 'analysis', data: 'Agua.\n\nMás agua.', config: { language: 'Spanish' } }], generatedContent: { ...content('Agua.\n\nOtra agua.\n\n--- ENGLISH TRANSLATION ---\n\nWater.'), config: { language: 'Spanish' }, instructionalText: { sourceArtifactId: 'source' } } });
    expect(host.querySelector('[data-compare-version="adapted"]').textContent).toBe('Agua.\n\nOtra agua.');
    expect(host.querySelector('[data-compare-version="source"]').textContent).toBe('Agua.\n\nMás agua.');
  });
  it('preserves complete long text without allocating an unbounded comparison matrix', () => {
    const text = ('Water flows.\n\n').repeat(1200);
    mount({ isTeacherMode: true, isCompareMode: true, inputText: 'Different current input', history: [{ id: 'long-source', type: 'analysis', data: { originalText: text } }], generatedContent: { ...content(text + 'FINAL_SENTINEL'), instructionalText: { sourceArtifactId: 'long-source' } } });
    expect(host.textContent).toContain('without word change highlighting'); expect(host.querySelector('[data-compare-version="adapted"]').textContent).toBe(text + 'FINAL_SENTINEL');
  });
});


describe('Student reading workflow and teacher boundaries', () => {
  it.each(['revise', 'add-glossary'])('keeps stale %s state out of student view', interactionMode => {
    const { props } = mount({ interactionMode, isZenMode: false, isCompareMode: true, isEditingLeveledText: true, revisionData: { type: 'simplify', result: 'TEACHER_REVISION', x: 10, y: 10 }, generatedContent: { ...content('Student passage.'), levelCheck: { feedback: 'TEACHER_LEVEL' }, alignmentCheck: { rigorReport: 'TEACHER_RIGOR' } } });
    expect(host.querySelector('[data-reading-comparison]')).not.toBeNull();
    expect(host.querySelector('textarea')).toBeNull();
    expect(host.querySelector('[data-reading-comparison]')).not.toBeNull();
    expect(host.querySelector('[data-instructional-role]')).not.toBeNull();
    expect(host.textContent).not.toMatch(/TEACHER_|Instructional use|Primary replacement/);
    expect(props.setInteractionMode).toHaveBeenCalledWith('read');
    expect(host.querySelector('select[aria-label="Set instructional text role"]')).toBeNull();
    expect(props.handleToggleIsEditingLeveledText).toHaveBeenCalledTimes(1);
  });
  it('removes authoring UI on a live teacher-to-student role switch', () => {
    const { props } = mount({ isTeacherMode: true, isCompareMode: true });
    expect(host.querySelector('[data-reading-comparison]')).not.toBeNull();
    act(() => root.render(React.createElement(View, { ...props, isTeacherMode: false })));
    expect(host.querySelector('[data-reading-comparison]')).not.toBeNull();
    expect(host.querySelector('select[aria-label="Set instructional text role"]')).toBeNull();
  });
  it('clears previous help and stops passage audio when the resource changes', () => {
    const { props } = mount({ isPlaying: true, playingContentId: 'simplified-main' });
    act(() => root.render(React.createElement(View, { ...props, generatedContent: { ...content('New reading.'), id: 'new-reading' } })));
    expect(props.closeDefinition).toHaveBeenCalled(); expect(props.closePhonics).toHaveBeenCalled(); expect(props.closeRevision).toHaveBeenCalled();
    expect(props.stopPlayback).toHaveBeenCalled(); expect(props.setSelectionMenu).toHaveBeenCalledWith(null);
  });
  it('starts paragraph focus with a readable first paragraph', () => {
    mount({ isLineFocusMode: true });
    expect(host.querySelector('[data-reading-paragraph]').className).toContain('opacity-100');
  });
  it('skips controls to the start of the passage', () => {
    mount();
    const skip = [...host.querySelectorAll('button')].find(el => el.textContent === 'Skip reading controls');
    act(() => skip.click());
    expect(document.activeElement).toBe(host.querySelector('[data-reading-passage]'));
    expect(document.activeElement.textContent).toContain('Water');
  });
  it('starts and stops whole-passage listening through shared playback', () => {
    const { props } = mount();
    act(() => host.querySelector('[data-reader-listen]').click());
    expect(props.handleSpeak).toHaveBeenCalledWith(props.generatedContent.data, 'simplified-main', 0);
    act(() => root.render(React.createElement(View, { ...props, isPlaying: true, playingContentId: 'simplified-main' })));
    act(() => host.querySelector('[data-reader-listen]').click());
    expect(props.stopPlayback).toHaveBeenCalledTimes(1);
  });
  it('does not highlight passage sentences while a popup is speaking', () => {
    mount({ playingContentId: 'simplified-define-popup', isPlaying: true, playbackState: { currentIdx: 0 } });
    expect(host.querySelector('[data-reading-sentence][aria-current]')).toBeNull();
  });
  it('keeps practice collapsed and exposes its expanded state', () => {
    mount(); const button = host.querySelector('[aria-controls="simplified-practice-tools"]');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('#simplified-practice-tools').hidden).toBe(true);
    act(() => button.click());
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#simplified-practice-tools').hidden).toBe(false);
  });
  it('clears old help, comparison and editing when choosing a reading mode', () => {
    const { props } = mount({ isTeacherMode: true, isEditingLeveledText: true });
    act(() => host.querySelector('[data-reading-mode="define"]').click());
    expect(props.setInteractionMode).toHaveBeenCalledWith('define');
    expect(props.setSelectionMenu).toHaveBeenCalledWith(null);
    expect(props.closeDefinition).toHaveBeenCalled(); expect(props.closeRevision).toHaveBeenCalled();
    expect(props.handleToggleIsEditingLeveledText).toHaveBeenCalledTimes(1);
  });
  it('offers sentence explanation by keyboard with segment language', () => {
    const { props } = mount({ interactionMode: 'explain', generatedContent: { ...content('Agua.\n\n--- ENGLISH TRANSLATION ---\n\nWater.'), config: { language: 'Spanish' } } });
    const sentence = host.querySelectorAll('[data-reading-sentence]')[1]; key(sentence, 'Enter');
    expect(props.setSelectionMenu).toHaveBeenCalledWith(expect.objectContaining({ text: 'Water.', language: 'English' }));
    expect(props.handleSpeak).not.toHaveBeenCalled();
  });
  it('contains selection-menu focus and dismisses with Escape', () => {
    const { props } = mount({ interactionMode: 'explain', selectionMenu: { text: 'Water.', x: 1, y: 1 } });
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.contains(document.activeElement)).toBe(true);
    key(document.activeElement, 'Escape');
    expect(props.setSelectionMenu).toHaveBeenCalledWith(null);
  });
  it('requires an explicit apply action and exposes the keep-original checkbox', () => {
    const adjust = vi.fn();
    const { props } = mount({ isTeacherMode: true, isZenMode: false, complexityLevel: 5, saveOriginalOnAdjust: true, handleComplexityAdjustment: adjust });
    expect(host.querySelector('[data-apply-complexity]').disabled).toBe(true);
    const slider = host.querySelector('input[type="range"]');
    act(() => { slider.value = '3'; slider.dispatchEvent(new Event('change', { bubbles: true })); slider.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
    expect(adjust).not.toHaveBeenCalled();
    act(() => root.render(React.createElement(View, { ...props, complexityLevel: 3 })));
    act(() => host.querySelector('[data-apply-complexity]').click());
    expect(adjust).toHaveBeenCalledTimes(1);
    expect(host.querySelector('input[type="checkbox"]').className).not.toContain('hidden');
  });
});

describe('Adapted reader theme selection', () => {
  it.each([false, true])('retains reading preferences in focused view with teacher=%s', isTeacherMode => {
    const { props } = mount({ isTeacherMode, isZenMode: true, readingTheme: 'warm' });
    const picker = host.querySelector('[data-adapted-theme-picker]');
    expect(picker.value).toBe('warm');
    expect(host.querySelector('[data-help-key="simplified_immersive_reader"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="simplified_teacher_tools"]')).toBeNull();
    expect(host.querySelector('[data-help-key="simplified_edit"]')).toBeNull();
    act(() => { picker.value = 'dark'; picker.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(props.setReadingTheme).toHaveBeenCalledWith('dark');
  });
  it.each(['light', 'dark', 'contrast'])('keeps every reading palette selectable under the %s app theme', theme => {
    const { props } = mount({ theme, readingTheme: 'dark', isZenMode: false });
    const select = host.querySelector('[data-adapted-theme-picker]');
    expect(select.value).toBe('dark');
    expect([...select.options].map(option => option.value)).toEqual(['default', 'warm', 'sepia', 'dark', 'dim', 'highContrast', 'blue', 'green', 'rose', 'dyslexia']);
    expect(select.options[0].textContent).toBe('Use app theme');
    act(() => { select.value = 'dim'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(props.setReadingTheme).toHaveBeenCalledWith('dim');
  });
  it('preserves reading content, width, practice, and open help when only the theme changes', () => {
    const { props } = mount({ isZenMode: false, readingTheme: 'warm', definitionData: { word: 'water', text: 'A liquid.', x: 10, y: 10 } });
    const passage = host.querySelector('[data-reading-passage]');
    const width = host.querySelector('select[aria-label="Reading width"]');
    act(() => { width.value = '40'; width.dispatchEvent(new Event('change', { bubbles: true })); host.querySelector('[aria-controls="simplified-practice-tools"]').click(); });
    act(() => root.render(React.createElement(View, { ...props, theme: 'dark', readingTheme: 'dim' })));
    expect(host.querySelector('[data-reading-passage]')).toBe(passage);
    expect(width.value).toBe('40');
    expect(host.querySelector('[data-adapted-theme-picker]').value).toBe('dim');
    expect(host.querySelector('[aria-controls="simplified-practice-tools"]').getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(props.closeDefinition).not.toHaveBeenCalled();
    expect(props.stopPlayback).not.toHaveBeenCalled();
  });
});


describe('Discoverable Focus view', () => {
  it.each([false, true])('lets a reader enter and exit with teacher=%s without losing reading state', isTeacherMode => {
    const onFocusViewChange = vi.fn();
    const { props } = mount({ isTeacherMode, isZenMode: false, onFocusViewChange, readingTheme: 'warm', isPlaying: true, playingContentId: 'simplified-main' });
    const toggle = host.querySelector('[data-reader-focus-view]');
    const passage = host.querySelector('[data-reading-passage]');
    const width = host.querySelector('select[aria-label="Reading width"]');
    expect(toggle.textContent).toBe('Focus view');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById(toggle.getAttribute('aria-describedby')).textContent).toContain('header and sidebar');
    act(() => { width.value = '40'; width.dispatchEvent(new Event('change', { bubbles: true })); toggle.focus(); toggle.click(); });
    expect(onFocusViewChange).toHaveBeenLastCalledWith(true);
    act(() => root.render(React.createElement(View, { ...props, isZenMode: true })));
    expect(host.querySelector('[data-reader-focus-view]')).toBe(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.textContent).toBe('Exit focus view');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-reading-passage]')).toBe(passage);
    expect(width.value).toBe('40');
    expect(host.querySelector('[data-adapted-theme-picker]').value).toBe('warm');
    expect(props.stopPlayback).not.toHaveBeenCalled();
    act(() => toggle.click());
    expect(onFocusViewChange).toHaveBeenLastCalledWith(false);
    act(() => root.render(React.createElement(View, props)));
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
  it('restores reader focus when the global exit control disappears', () => {
    const { props } = mount({ isZenMode: true, onFocusViewChange: vi.fn() });
    const exit = document.createElement('button');document.body.append(exit);exit.focus();exit.remove();
    act(() => root.render(React.createElement(View, { ...props, isZenMode: false })));
    expect(document.activeElement).toBe(host.querySelector('[data-reader-focus-view]'));
  });
  it('keeps focus on an existing reader control when focus view is exited elsewhere', () => {
    const { props } = mount({ isZenMode: true, onFocusViewChange: vi.fn() });
    const picker = host.querySelector('[data-adapted-theme-picker]');picker.focus();
    act(() => root.render(React.createElement(View, { ...props, isZenMode: false })));
    expect(document.activeElement).toBe(picker);
  });
});


describe('Novak source-preserving reading', () => {
  const captured = (source, adapted = 'Upon the open land.') => ({ ...content(adapted), instructionalText: { role: 'supplemental', form: 'adapted' }, sourceSnapshot: window.AlloModules.InstructionalContext.createSourceSnapshot(source, { language: 'English' }) });
  it('lets students toggle red/green changes without changing either text', () => {
    const original = 'Upon the heath.\n\nAnon!';
    const adapted = 'Upon the open land.\n\nSoon!';
    mount({ isCompareMode: true, generatedContent: captured(original, adapted) });
    const source = () => host.querySelector('[data-compare-version="source"]').textContent;
    const target = () => host.querySelector('[data-compare-version="adapted"]').textContent;
    const toggle = host.querySelector('input[aria-label="Show changes"]');
    expect(toggle.checked).toBe(false); expect(host.querySelector('del,ins')).toBeNull();
    expect(source()).toBe(original); expect(target()).toBe(adapted);
    act(() => toggle.click());
    expect(host.querySelector('del')).not.toBeNull(); expect(host.querySelector('ins')).not.toBeNull();
    expect(source()).toBe(original); expect(target()).toBe(adapted);
    act(() => toggle.click());
    expect(host.querySelector('del,ins')).toBeNull(); expect(source()).toBe(original); expect(target()).toBe(adapted);
  });
  it('never substitutes unrelated history when the captured source is missing', () => {
    mount({ isCompareMode: true, inputText: 'WRONG INPUT', history: [{ id: 'other', type: 'analysis', data: { originalText: 'WRONG LESSON' } }], generatedContent: { ...content('Adapted passage.'), instructionalText: { sourceArtifactId: 'missing' } } });
    expect(host.querySelector('[data-compare-version="source"]').textContent).toBe('');
    expect(host.textContent).toContain('Original not captured');
    expect(host.querySelector('input[aria-label="Show changes"]').disabled).toBe(true);
  });
  it('keeps exact original text and additive glosses separate, including CRLF', () => {
    const api = window.AlloModules.InstructionalContext;
    const original = 'THIRD WITCH\r\nUpon the heath.\r\n\r\nAnon!';
    const item = api.createSupportedReading(original, { id: 'original' });
    const start = original.indexOf('heath');
    item.readingSupports = api.validateReadingSupports(item.sourceSnapshot, [{ id: 'heath', start, end: start + 5, quote: 'heath', text: 'Open land with low shrubs.' }]);
    mount({ generatedContent: item, isTeacherMode: true, isZenMode: false, isEditingLeveledText: true });
    expect(host.querySelector('textarea')).toBeNull();
    expect(host.querySelector('[data-reading-gloss]').textContent).toContain('Open land');
    const toggle = Array.from(host.querySelectorAll('input[type="checkbox"]')).find(node => node.parentElement.textContent.includes('Show glosses'));
    act(() => toggle.click());
    expect(host.querySelector('[data-original-source]').textContent).toBe(original);
    expect(item.data).toBe(original); expect(api.isSupportedOriginal(item)).toBe(true);
  });
  it('keeps a supported original form on role changes without replacement authorization', () => {
    const api = window.AlloModules.InstructionalContext;
    const item = api.createSupportedReading('Upon the heath.', { id: 'original' });
    const updated = View.updateInstructionalRole(item, 'primary');
    expect(updated.instructionalText.form).toBe('same-text-supported');
    expect(updated.instructionalText.replacementAuthorization.authorized).toBe(false);
  });
  it('uses the selected comparison pane for word meaning context', () => {
    const item = captured('Upon the heath.');
    const { handleWordClick } = mount({ isCompareMode: true, interactionMode: 'define', generatedContent: item });
    const word = host.querySelector('[data-compare-version="source"] [data-exact-word]');
    act(() => word.click());
    expect(handleWordClick.mock.calls[0][2]).toEqual({ text: 'Upon the heath.', language: 'English' });
  });
});

describe('Paired reader playback and supported original continuity', () => {
  const api = () => window.AlloModules.InstructionalContext;
  function pair() {
    const original = api().createSupportedReading('Upon the heath.\r\nAnon!', { id: 'original', language: 'English' });
    const start = original.data.indexOf('heath');
    original.readingSupports = api().validateReadingSupports(original.sourceSnapshot, [{ id: 'heath', start, end: start + 5, quote: 'heath', text: 'Open land with low shrubs.' }]);
    const adapted = { ...content('Upon the open land.\nSoon!'), sourceSnapshot: original.sourceSnapshot, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } };
    return { original, adapted };
  }
  it('keeps the currently selected adapted version when another companion is newer', () => {
    const { original, adapted } = pair(), onOpenReadingArtifact = vi.fn();
    const newer = { ...adapted, id: 'newer', data: 'Another adaptation.' };
    mount({ generatedContent: adapted, history: [original, adapted, newer], onOpenReadingArtifact });
    const both = [...host.querySelectorAll('[data-reading-versions] button')].find(node => node.textContent === 'Both');
    act(() => both.click());
    expect(onOpenReadingArtifact).toHaveBeenCalledWith(adapted, true);
  });
  it('shows matching original glosses in Both and preserves clean/redline toggle behavior', () => {
    const { original, adapted } = pair();
    mount({ isCompareMode: true, generatedContent: adapted, history: [original, adapted] });
    expect(host.querySelector('[data-compare-version="source"] [data-reading-gloss]').textContent).toContain('Open land');
    expect(host.querySelector('[data-compare-version="adapted"] [data-reading-gloss]')).toBeNull();
    const glossToggle = host.querySelector('input[aria-label="Show glosses"]');
    act(() => glossToggle.click());
    expect(host.querySelector('[data-compare-version="source"]').textContent).toBe(original.data);
    act(() => glossToggle.click());
    const changes = host.querySelector('input[aria-label="Show changes"]');
    act(() => changes.click());
    expect(host.querySelector('[data-reading-gloss]')).toBeNull();
    expect(glossToggle.disabled).toBe(true);
    expect(host.querySelector('[data-compare-version="source"]').textContent).toBe(original.data);
    act(() => changes.click());
    expect(host.querySelector('[data-reading-gloss]')).not.toBeNull();
    expect(original.data).toBe(original.sourceSnapshot.text);
  });
  it('toggles the active original pane from Listen to Stop without restarting audio', () => {
    const { original, adapted } = pair();
    const { props } = mount({ isCompareMode: true, generatedContent: adapted, history: [original] });
    act(() => host.querySelector('button[aria-label="Listen to original"]').click());
    expect(props.handleSpeak).toHaveBeenCalledWith(original.data, 'reading-reading-source', 0, true, 'English');
    act(() => root.render(React.createElement(View, { ...props, isPlaying: true, playingContentId: 'reading-reading-source' })));
    expect(host.querySelector('button[aria-label="Stop original"]').textContent).toBe('Stop');
    act(() => host.querySelector('button[aria-label="Stop original"]').click());
    expect(props.handleSpeak).toHaveBeenCalledTimes(1);
    expect(props.stopPlayback).toHaveBeenCalledTimes(2);
  });
  it('provides a Stop action in the original-only reader', () => {
    const { original } = pair();
    const { props } = mount({ generatedContent: original, isPlaying: true, playingContentId: 'reading-original-original' });
    expect(host.querySelector('[data-reader-listen]').textContent).toBe('Stop original');
    act(() => host.querySelector('[data-reader-listen]').click());
    expect(props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(props.handleSpeak).not.toHaveBeenCalled();
  });
  it('uses the source pane language for phonics alongside a translated companion', () => {
    const { original, adapted } = pair();
    const { props } = mount({ generatedContent: { ...adapted, config: { language: 'Spanish' } }, history: [original], isCompareMode: true, interactionMode: 'phonics' });
    act(() => host.querySelector('[data-compare-version="source"] [data-exact-word]').click());
    expect(props.handlePhonicsClick.mock.calls[0][2]).toEqual({ language: 'English', audioPlayback: 'reader' });
  });
  it('reports unavailable gloss generation without claiming the supports are ready', async () => {
    const { original } = pair();
    mount({ generatedContent: original, isTeacherMode: true, onGenerateReadingSupports: async () => ({ status: 'unavailable', annotations: [] }) });
    const button = [...host.querySelectorAll('button')].find(node => ['Add word supports', 'Refresh suggested supports'].includes(node.textContent));
    await act(async () => button.click());
    expect(host.textContent).toContain('Word supports could not be generated. The original is unchanged.');
    expect(host.textContent).not.toContain('Word supports are ready.');
  });
});

it('disables change highlighting across languages and retains RTL source direction', () => {
  const api = window.AlloModules.InstructionalContext;
  const sourceSnapshot = api.createSourceSnapshot('على التل.\nقريبا!', { language: 'Arabic' });
  localStorage.setItem('alloflow_reading_show_changes', 'on');
  mount({ isCompareMode: true, generatedContent: { ...content('Upon the heath.\nSoon!'), sourceSnapshot, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } } });
  expect(host.querySelector('input[aria-label="Show changes"]').disabled).toBe(true);
  expect(host.querySelector('del,ins')).toBeNull();
  const sourcePane = host.querySelector('[data-compare-version="source"]');
  expect(sourcePane.dir).toBe('rtl');
  expect(sourcePane.lang).toBe('ar');
  expect(sourcePane.textContent).toBe(sourceSnapshot.text);
});

it('keeps a captured bilingual original complete when the adapted comparison language changes', () => {
  const original = 'Texto original.\r\n\r\n--- ENGLISH TRANSLATION ---\r\n\r\nOriginal text.\r\n';
  const sourceSnapshot = window.AlloModules.InstructionalContext.createSourceSnapshot(original, { language: 'Spanish' });
  mount({ isTeacherMode: true, isCompareMode: true, generatedContent: { ...content('Texto más fácil.\n\n--- ENGLISH TRANSLATION ---\n\nEasier text.'), sourceSnapshot, config: { language: 'Spanish' }, instructionalText: { form: 'adapted', role: 'supplemental' } } });
  const sourcePane = () => host.querySelector('[data-compare-version="source"]').textContent;
  expect(sourcePane()).toBe(original);
  const languageChoice = [...host.querySelectorAll('select')].find(node => [...node.options].some(option => option.value === 'english'));
  act(() => { languageChoice.value = 'english'; languageChoice.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(host.querySelector('[data-compare-version="adapted"]').textContent).toBe('Easier text.');
  expect(sourcePane()).toBe(original);
});


it('original reader describes its actual listen control and does not offer in-place cloze', () => {
  const api = window.AlloModules.InstructionalContext;
  const item = api.createSupportedReading('The original stays intact.', { id: 'original-hint' });
  mount({ generatedContent: item, interactionMode: 'cloze' });
  expect(host.textContent).toContain('Use Listen to hear the original.');
  expect(host.textContent).not.toContain('Choose any sentence to listen from there.');
  expect(host.querySelector('[data-help-key="simplified_cloze_mode"]')).toBeNull();
  expect(host.querySelector('[data-original-source]').textContent).toBe(item.data);
});


describe('Remembered reading width', () => {
  it('restores the last width when reopening the reader without changing text or playback', () => {
    const { props } = mount();const passage = host.querySelector('[data-reading-passage]');const text = passage.textContent;
    const select = host.querySelector('select[aria-label="Reading width"]');
    act(() => { select.value = '40';select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(localStorage.getItem('alloflow_reading_width')).toBe('40');expect(passage.textContent).toBe(text);expect(props.stopPlayback).not.toHaveBeenCalled();
    act(() => root.unmount());host.remove();root = null;mount();
    expect(host.querySelector('select[aria-label="Reading width"]').value).toBe('40');
    expect(host.querySelector('[data-simplified-reading-body]').style.maxWidth).toContain('40ch');
  });
  it('falls back to a valid width if saved settings are damaged', () => {
    localStorage.setItem('alloflow_reading_width', 'unexpected');mount();
    expect(host.querySelector('select[aria-label="Reading width"]').value).toBe('72');
  });
  it('allows changing width when browser storage is blocked', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    try {
      mount();const select = host.querySelector('select[aria-label="Reading width"]');
      expect(select.value).toBe('72');act(() => { select.value = '56';select.dispatchEvent(new Event('change', { bubbles: true })); });
      expect(select.value).toBe('56');expect(host.querySelector('[data-simplified-reading-body]').style.maxWidth).toContain('56ch');
    } finally { getItem.mockRestore();setItem.mockRestore(); }
  });
});
