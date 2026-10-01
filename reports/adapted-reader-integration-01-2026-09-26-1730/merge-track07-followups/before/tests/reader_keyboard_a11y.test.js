// Keyboard and screen reader access in the reading view.
//
// WHY (2026-09-24 audit):
// - Every sentence was its own Tab stop, so a 30-sentence passage took 30 Tabs
//   to get past. Words already used one stop per paragraph with arrow keys.
// - Revise worked only by dragging a mouse across the text.
// - "# Title" rendered as an h1 inside the page, which already has one; the
//   main renderer makes a passage's top heading h2.
// - About 30 of the app's languages (Farsi, Dari, Tagalog, Amharic, "Chinese
//   (Traditional)"...) had no lang tag, so screen readers read them in English.
// - The active reading mode was a pale tint only, and not marked pressed in
//   Both even when that mode was on.
// - Buttons were announced with names that did not contain their visible words
//   ("Define" read as "Search"), which breaks voice control.
// - Save notices were inserted with their text already in them, which many
//   screen readers do not announce.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, api;
// The real English strings, so names are compared as users meet them.
const STRINGS = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const t = k => { const v = k.split('.').reduce((o, p) => o && o[p], STRINGS); return typeof v === 'string' ? v : k; };
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; window.getSelection()?.removeAllRanges(); });
const adapted = (data, extra = {}) => ({ id: 'adapted', type: 'simplified', data, config: { language: 'English', grade: '5' }, ...extra });
function mount(extra = {}) {
  const noop = () => {};
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t, generatedContent: adapted('One sentence here. Two sentences here. Three here.\n\nNext paragraph starts. It ends.'), inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: vi.fn(), highlightGlossaryTerms: x => x, latestGlossary: [], onReadOriginal: noop, onOpenReadingArtifact: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const sentences = () => [...host.querySelectorAll('[data-reading-sentence]')];
const key = (el, value) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })));
const focus = el => act(() => el.focus());

describe('sentences', () => {
  it('take one Tab stop per paragraph, and arrow keys, Home and End move between them', () => {
    mount();
    const all = sentences();
    expect(all.length).toBe(5);
    expect(all.map(s => s.tabIndex)).toEqual([0, -1, -1, 0, -1]);
    focus(all[0]); key(all[0], 'ArrowRight');
    expect(document.activeElement).toBe(all[1]);
    expect(all.slice(0, 3).map(s => s.tabIndex)).toEqual([-1, 0, -1]);
    key(all[1], 'End'); expect(document.activeElement).toBe(all[2]);
    key(all[2], 'ArrowRight'); expect(document.activeElement).toBe(all[2]);
    key(all[2], 'Home'); expect(document.activeElement).toBe(all[0]);
  });
  it('Enter still reads from the sentence, even with a leftover selection on the page', () => {
    const props = mount();
    focus(sentences()[1]); // jsdom clears the selection on focus, so select afterwards
    const range = document.createRange(); range.selectNodeContents(sentences()[3]);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    expect(window.getSelection().toString().trim()).toBe('Next paragraph starts.');
    key(sentences()[1], 'Enter');
    expect(props.handleSpeak).toHaveBeenCalledWith(expect.any(String), 'simplified-main', 1, true, 'English');
  });
});

describe('Revise without a mouse', () => {
  it('Enter on a sentence selects it and opens the revise menu', () => {
    const props = mount({ isTeacherMode: true, interactionMode: 'revise' });
    const second = sentences()[1];
    expect(second.getAttribute('aria-label')).toBe('Revise: Two sentences here.');
    focus(second); key(second, 'Enter');
    expect(window.getSelection().toString().trim()).toBe('Two sentences here.');
    expect(props.handleTextMouseUp).toHaveBeenCalledTimes(1);
    expect(props.handleTextMouseUp.mock.calls[0][0].currentTarget).toBe(second.closest('[data-reading-paragraph]'));
  });
  it('a mouse click leaves the pointer free to drag or double-click words', () => {
    const props = mount({ isTeacherMode: true, interactionMode: 'revise' });
    act(() => sentences()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
    expect(props.handleTextMouseUp).not.toHaveBeenCalled();
    act(() => sentences()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })));
    expect(props.handleTextMouseUp).toHaveBeenCalledTimes(1);
  });
});

describe('a line written directly above a table', () => {
  // Read-aloud skips table paragraphs (phase_k_helpers handleSpeak: isTable -> []).
  const TEXT = 'Intro one. Look at this:\n| Planet | Size |\n|---|---|\n| Mars | Small |\nAfter table.';
  it('is its own paragraph: read aloud, clickable, and not inside the table', () => {
    const props = mount({ generatedContent: adapted(TEXT) });
    expect(sentences().map(s => s.textContent.trim())).toEqual(['Intro one.', 'Look at this:', 'After table.']);
    expect(host.querySelector('[data-reading-table]').textContent).not.toContain('Look at this');
    act(() => host.querySelector('[data-reader-listen]').click());
    const spoken = props.handleSpeak.mock.calls[0][0];
    const isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    const read = spoken.split(/\n{2,}/).flatMap(p => isTable(p) ? [] : pure.splitTextToSentences(p, {}));
    expect(read).toEqual(['Intro one.', 'Look at this:', 'After table.']);
  });
  it('the stored text is unchanged', () => {
    const item = adapted(TEXT);
    mount({ generatedContent: item });
    expect(item.data).toBe(TEXT);
  });
});

describe('headings follow the page outline', () => {
  it('the top heading of an adapted text is h2 and deeper ones keep their order', () => {
    mount({ generatedContent: adapted('# Water\n\nWater moves.\n\n## Rain\n\nRain falls.') });
    const body = host.querySelector('[data-simplified-reading-body]');
    expect(body.querySelector('h1')).toBeNull();
    expect(body.querySelector('h2').textContent.trim()).toBe('Water');
    expect(body.querySelector('h3').textContent.trim()).toBe('Rain');
  });
  it('a text whose only headings are ### starts at h2 too', () => {
    mount({ generatedContent: adapted('### Water\n\nWater moves.') });
    expect(host.querySelector('[data-simplified-reading-body] h2').textContent.trim()).toBe('Water');
  });
});

describe('language tags', () => {
  it.each([['Farsi', 'fa'], ['Dari', 'fa-AF'], ['Pashto', 'ps'], ['Tagalog', 'tl'], ['Amharic', 'am'], ['Tigrinya', 'ti'], ['Hmong', 'hmn'], ['Nepali', 'ne'], ['Chinese (Traditional)', 'zh-Hant'], ['Chinese (Simplified)', 'zh-Hans'], ['Spanish (Latin America)', 'es-419'], ['Portuguese (Brazil)', 'pt-BR'], ['French (Canadian)', 'fr-CA'], ['Chin (Hakha)', 'cnh'], ['Spanish', 'es'], ['Spanish (Mexico)', 'es'], ['  Hmong  ', 'hmn']])('%s is %s', (name, tag) => {
    expect(View.languageTag(name)).toBe(tag);
  });
  it('the passage carries the tag', () => {
    mount({ generatedContent: adapted('سلام. خوبی؟', { config: { language: 'Farsi', grade: '5' } }), leveledTextLanguage: 'Farsi', getContentDirection: () => 'rtl' });
    expect(host.querySelector('[data-reading-paragraph]').getAttribute('lang')).toBe('fa');
  });
});

describe('reading mode buttons', () => {
  it('mark the active mode with a border as well as a tint', () => {
    mount({ interactionMode: 'define' });
    const active = host.querySelector('[data-reading-mode="define"]');
    expect(active.getAttribute('aria-pressed')).toBe('true');
    expect(active.className).toContain('border-indigo-700');
    expect(host.querySelector('[data-reading-mode="read"]').className).toContain('border-transparent');
  });
  it('show the active word tool as pressed in Both', () => {
    const snapshot = api.createSourceSnapshot('Old text here.', { language: 'English', sourceArtifactId: 'analysis', selection: 'input' });
    const original = api.createSupportedReading(snapshot, { id: 'orig', title: 'Scene' });
    mount({ interactionMode: 'define', isCompareMode: true, history: [original, adapted('New text here.', { sourceSnapshot: snapshot, instructionalText: { role: 'supplemental', form: 'adapted' } })], generatedContent: adapted('New text here.', { sourceSnapshot: snapshot, instructionalText: { role: 'supplemental', form: 'adapted' } }) });
    expect(host.querySelector('[data-reading-mode="define"]').getAttribute('aria-pressed')).toBe('true');
  });
});

// A control's accessible name must contain the words it shows (WCAG 2.5.3).
const nameMismatches = scope => [...scope.querySelectorAll('button, [role=button], input[type=checkbox]')].filter(el => el.getAttribute('aria-label')).map(el => {
  const visible = (el.tagName === 'INPUT' ? el.closest('label')?.textContent || '' : el.textContent).replace(/\s+/g, ' ').trim();
  return { visible, name: el.getAttribute('aria-label') };
}).filter(({ visible, name }) => visible && !name.replace(/\s+/g, ' ').toLowerCase().includes(visible.toLowerCase()));

describe('names match what is shown', () => {
  it.each([
    ['student reading', {}],
    ['teacher reading', { isTeacherMode: true, isZenMode: false }],
    ['revise menu', { isTeacherMode: true, interactionMode: 'revise', selectionMenu: { text: 'Two sentences here.', x: 0, y: 0 } }],
    ['define menu', { interactionMode: 'define', selectionMenu: { text: 'sentences', x: 0, y: 0 } }],
    ['add term menu', { isTeacherMode: true, interactionMode: 'add-glossary', selectionMenu: { text: 'sentences', x: 0, y: 0 } }],
  ])('%s', (_, extra) => {
    mount(extra);
    expect(nameMismatches(host)).toEqual([]);
  });
  it('the menu buttons are named by their words', () => {
    mount({ isTeacherMode: true, interactionMode: 'revise', selectionMenu: { text: 'Two sentences here.', x: 0, y: 0 } });
    const simplify = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === t('text_tools.simplify'));
    expect(simplify).toBeTruthy();
    expect(simplify.getAttribute('aria-label')).toBeNull();
  });
  it('the audio button says what it saves, not a raw key', () => {
    mount({ isTeacherMode: true, isZenMode: false, isTeacherToolbarExpanded: true });
    const save = host.querySelector('[data-help-key="simplified_save_tts"]');
    expect(save.textContent.trim()).toBe('Save audio');
    expect(save.getAttribute('aria-label')).toBeNull();
    expect(save.title).not.toMatch(/prepare_all/);
  });
  it('the keep-original checkbox keeps one label; its tick shows the state', () => {
    const label = checked => {
      mount({ isTeacherMode: true, isZenMode: false, saveOriginalOnAdjust: checked });
      const box = host.querySelector('[data-help-key="simplified_overwrite_toggle"] input[type=checkbox]');
      const text = box.closest('label').textContent.trim();
      expect(box.checked).toBe(checked);
      expect(box.getAttribute('aria-label')).toBeNull();
      act(() => root.unmount()); host.remove(); root = null;
      return text;
    };
    expect(label(true)).toBe(t('common.keep_original'));
    expect(label(false)).toBe(t('common.keep_original'));
  });
});

describe('word support editor', () => {
  function editor() {
    const text = 'Fair is foul. Fair returns.';
    const item = api.createSupportedReading(text, { id: 'original' });
    const start = text.indexOf('foul');
    let supports = api.validateReadingSupports(item, [{ id: 'f', start, end: start + 4, quote: 'foul', text: 'Very bad.', priority: 'helpful', origin: 'generated', pinned: false, kind: 'gloss' }]);
    const onUpdate = vi.fn(async (owner, action) => { supports = api.setReadingSupportPinned(owner, supports, action.id, action.pinned); render(); return { ...owner, readingSupports: supports }; });
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    const render = () => root.render(React.createElement(View.ReadingGlossEditor, { item, supports, onUpdate, disabled: false }));
    act(render);
    const toggle = [...host.querySelectorAll('button')].find(b => b.textContent.startsWith('Review word supports'));
    if (toggle) act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }
  it('keeps its status region mounted, so a save is announced', async () => {
    editor();
    const status = host.querySelector('[data-gloss-notice]');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('');
    const pin = host.querySelector('input[type=checkbox]');
    await act(async () => { pin.click(); });
    expect(host.querySelector('[data-gloss-notice]')).toBe(status);
    expect(status.textContent).toMatch(/stay visible/);
  });
  it('names its checkbox with the words it shows', () => {
    editor();
    expect(nameMismatches(host)).toEqual([]);
  });
});
