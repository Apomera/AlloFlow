import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const cleanups = [];
let View;
let lib;
beforeAll(() => {
  window.React = React;
  new Function(readFileSync('text_pipeline_helpers_module.js', 'utf8'))();
  new Function(readFileSync('ui_font_library_module.js', 'utf8'))();
  lib = window.AlloModules.UIFontLibrary;
  // Exercise the authored JSX without rewriting the generated runtime during a test.
  const source = readFileSync('glossary_image_controls_source.jsx', 'utf8') + '\n' + readFileSync('view_glossary_source.jsx', 'utf8');
  const compiled = babel.transformSync(source, {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  }).code;
  View = new Function('React', 'Fragment', compiled + '\nreturn GlossaryView;')(React, React.Fragment);
}, 30000);

afterEach(() => {
  cleanups.splice(0).reverse().forEach(fn => fn());
  lib.closeReadingSettings();
  delete window.__alloReadingSettings;
  delete window.getSpeechLangCode;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(data, overrides = {}, resource = {}) {
  const container = document.createElement('div');
  container.lang = 'es';
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const props = glossaryMediaProps({
    generatedContent: { id: 'language-parts', type: 'glossary', baseLanguage: 'French', data, ...resource },
    filteredGlossaryData: data.map((item, index) => ({ ...item, _originalIdx: index })),
    displayLanguages: ['Arabic'], selectedLanguages: ['Arabic'], currentUiLanguage: 'Spanish',
    ErrorBoundary: ({ children }) => children, ...overrides,
  });
  const render = patch => act(() => root.render(React.createElement(View, { ...props, ...patch })));
  render();
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, render, props };
}
const row = { entryId: 'first', term: 'Pain', def: 'Un aliment.', translations: { Arabic: 'خبز: غذاء مصنوع من الدقيق.' } };
const attrs = node => {
  expect(node).toBeTruthy();
  return [node.getAttribute('lang'), node.getAttribute('dir')];
};
const click = node => { expect(node).toBeTruthy(); act(() => node.click()); };
function bridge() {
  const state = { fontId: 'default', fontFamily: '', fontClass: '', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0,
    fonts: [{ id: 'default', label: 'Default', family: '', cssClass: '' }, { id: 'opendyslexic', label: 'OpenDyslexic', family: 'OpenDyslexic', cssClass: 'font-opendyslexic' }] };
  const api = { get: () => ({ ...state }), set: vi.fn(patch => Object.assign(state, patch)), subscribe: () => () => {} };
  window.__alloReadingSettings = api;
  return api;
}

describe('discoverable glossary reading settings', () => {
  it('opens the existing localized settings panel from the visible word-list toolbar and restores focus', () => {
    const api = bridge();
    const { container } = mount([row], { t: key => key === 'reading_settings.title' ? 'Ajustes de lectura' : key });
    const button = container.querySelector('[data-glossary-compact-toolbar] [data-reading-settings-button]');
    expect(button.textContent).toBe('AaAjustes de lectura');
    expect(button.getAttribute('aria-label')).toBe('Ajustes de lectura');
    expect(button.closest('[hidden]')).toBeNull();
    click(button);
    let panel = document.querySelector('[data-allo-reading-settings]');
    expect(panel.textContent).toContain('Ajustes de lectura');
    const font = panel.querySelector('select');
    act(() => { font.value = 'opendyslexic'; font.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(api.set).toHaveBeenLastCalledWith(expect.objectContaining({ fontId: 'opendyslexic' }));
    act(() => font.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(document.querySelector('[data-allo-reading-settings]')).toBeNull();
    expect(document.activeElement).toBe(button);
    click(button);
    panel = document.querySelector('[data-allo-reading-settings]');
    expect(panel.querySelector('select').value).toBe('opendyslexic');
  });

  it('uses the same settings in student mode and remains absent without the host bridge', () => {
    expect(mount([row]).container.querySelector('[data-reading-settings-button]')).toBeNull();
    bridge();
    const { container } = mount([row], { isTeacherMode: false });
    expect(container.querySelector('[data-glossary-compact-toolbar] [data-reading-settings-button]')).toBeTruthy();
  });

  it('reveals the settings entry when the host publishes its bridge after the glossary mounts', () => {
    const { container } = mount([row]);
    expect(container.querySelector('[data-reading-settings-button]')).toBeNull();
    bridge();
    act(() => window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed')));
    const button = container.querySelector('[data-glossary-compact-toolbar] [data-reading-settings-button]');
    expect(button).toBeTruthy();
    click(button);
    expect(document.querySelector('[data-allo-reading-settings]')).toBeTruthy();
  });

  it('handles a late bridge inside an already-open card deck and removes its event listener on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { container } = mount([row], { isInteractiveFlashcards: true });
    bridge();
    act(() => window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed')));
    const button = container.querySelector('[data-flashcard-header] [data-reading-settings-button]');
    expect(button).toBeTruthy();
    click(button);
    expect(container.querySelector('[role="dialog"] [data-allo-reading-settings]')).toBeTruthy();
    const listeners = add.mock.calls.filter(([name]) => name === 'alloflow:reading-settings-changed').map(([, listener]) => listener);
    expect(listeners.length).toBeGreaterThan(0);
    cleanups.pop()();
    expect(document.querySelector('[data-allo-reading-settings]')).toBeNull();
    listeners.forEach(listener => expect(remove).toHaveBeenCalledWith('alloflow:reading-settings-changed', listener));
  });
});

describe('saved glossary content language of parts', () => {
  it('tags each same-spelling entry independently and keeps interface labels outside the content language', () => {
    const data = [
      { ...row, termLanguage: 'French (Canadian)', definitionLanguage: 'Arabic' },
      { ...row, entryId: 'second', termLanguage: 'English', definitionLanguage: 'Spanish' },
    ];
    const { container } = mount(data);
    expect([...container.querySelectorAll('[data-glossary-term-text]')].map(attrs)).toEqual([['fr-CA', 'ltr'], ['en', 'ltr']]);
    expect([...container.querySelectorAll('[data-glossary-definition-text]')].map(attrs)).toEqual([['ar', 'rtl'], ['es', 'ltr']]);
    expect([...container.querySelectorAll('[data-glossary-translation-text]')].map(attrs)).toEqual([['ar', 'rtl'], ['ar', 'rtl']]);
    expect(container.querySelector('[data-glossary-mobile-label]').closest('[lang]').lang).toBe('es');
    expect(container.querySelector('[data-help-key="glossary_speak_term"]').closest('[lang]').lang).toBe('es');
  });

  it.each([
    ['pa_Arab_PK', 'pa-Arab-PK', 'rtl'], ['ar-Latn', 'ar-Latn', 'ltr'],
    ['ar-u-nu-latn', 'ar-u-nu-latn', 'rtl'], ['Chinese (Traditional)', 'zh-Hant', 'ltr'],
    ['Dari', 'fa-AF', 'rtl'], ['Chin (Hakha)', 'cnh', 'ltr'], ['Unknown language', '', 'auto'],
  ])('resolves named languages and script-aware direction: %s', (language, tag, direction) => {
    window.getSpeechLangCode = () => 'en-US'; // A host default is not evidence of English.
    const { container } = mount([{ ...row, termLanguage: language, translations: { [language]: 'Translation text' } }], { displayLanguages: [language] });
    expect(attrs(container.querySelector('[data-glossary-term-text]'))).toEqual([tag, direction]);
    expect(attrs(container.querySelector('[data-glossary-translation-text]'))).toEqual([tag, direction]);
  });

  it('retains the legacy English base when current UI and saved translation destination differ', () => {
    const { container } = mount([row], {}, { baseLanguage: undefined, language: 'Arabic', config: { language: 'Arabic' } });
    expect(attrs(container.querySelector('[data-glossary-term-text]'))).toEqual(['en', 'ltr']);
    expect(attrs(container.querySelector('[data-glossary-definition-text]'))).toEqual(['en', 'ltr']);
  });

  it('labels each definition with its saved language and leaves a mixed-language column heading neutral', () => {
    const t = key => ({ 'glossary.table_def': 'Definición (inglés)', 'flashcards.back_label_def': 'Definición' })[key] || key;
    const { container } = mount([{ ...row, definitionLanguage: 'Arabic' }, { ...row, entryId: 'english', definitionLanguage: 'English' }], { t });
    expect([...container.querySelectorAll('[data-glossary-definition] [data-glossary-mobile-label]')].map(node => node.textContent)).toEqual(['Definición (árabe)', 'Definición (inglés)']);
    expect([...container.querySelectorAll('th')].some(node => node.textContent === 'Definición')).toBe(true);
    expect([...container.querySelectorAll('th')].some(node => node.textContent === 'Definición (inglés)')).toBe(false);
  });

  it('keeps a uniform saved-language heading accurate and preserves the localized legacy English heading', () => {
    const french = mount([row]).container;
    expect([...french.querySelectorAll('th')].some(node => node.textContent === 'Definition (francés)')).toBe(true);
    const legacy = mount([row], { t: key => key === 'glossary.table_def' ? 'Definición (inglés)' : key }, { baseLanguage: undefined, config: { language: 'Arabic' } }).container;
    expect(legacy.querySelector('[data-glossary-definition] [data-glossary-mobile-label]').textContent).toBe('Definición (inglés)');
    expect([...legacy.querySelectorAll('th')].some(node => node.textContent === 'Definición (inglés)')).toBe(true);
  });

  it('preserves field language and direction while editing the glossary', () => {
    const { container } = mount([{ ...row, termLanguage: 'Hebrew', definitionLanguage: 'French' }], { isEditingGlossary: true });
    expect([...container.querySelectorAll('[data-glossary-word-list] textarea')].map(attrs)).toEqual([['he', 'rtl'], ['fr', 'ltr'], ['ar', 'rtl']]);
  });

  it('keeps context labels in the interface language while tagging the saved quote', () => {
    const { container } = mount([{ ...row, contextSentence: 'هذا هو الخبز.', contextSentenceLanguage: 'Arabic' }]);
    const context = container.querySelector('[data-glossary-context-sentence]');
    expect(attrs(context.querySelector('q'))).toEqual(['ar', 'rtl']);
    expect(context.querySelector('span').closest('[lang]').lang).toBe('es');
  });

  it('gives a definition its own block and text-start alignment when its term uses another writing direction', () => {
    const { container } = mount([{ ...row, termLanguage: 'English', definitionLanguage: 'Arabic', def: 'تعريف باللغة العربية.' }]);
    const definition = container.querySelector('[data-glossary-definition-text]');
    expect(definition.classList.contains('block')).toBe(true);
    expect(definition.classList.contains('text-start')).toBe(true);
    expect(attrs(definition)).toEqual(['ar', 'rtl']);
    expect(attrs(definition.previousElementSibling)).toEqual(['en', 'ltr']);
  });
});

describe('mixed-language word-row keyboard navigation', () => {
  it.each(['rtl', 'ltr'])('reaches every action in both directions in a %s interface without a translation-boundary loop', direction => {
    const { container } = mount([{ ...row, translations: { French: 'Pain: Un aliment.', Arabic: 'خبز: غذاء.' } }], { displayLanguages: ['French', 'Arabic'] });
    container.setAttribute('dir', direction);
    const wordRow = container.querySelector('[data-glossary-entry-key]');
    const actions = [...wordRow.querySelectorAll('button')].filter(button => !button.disabled && !button.closest('[hidden]'));
    const press = key => act(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    act(() => actions[0].focus());
    const reached = [document.activeElement];
    for (let i = 1; i < actions.length; i++) { press(direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'); reached.push(document.activeElement); }
    expect(reached).toEqual(actions);
    for (let i = actions.length - 2; i >= 0; i--) { press(direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'); expect(document.activeElement).toBe(actions[i]); }
    press('End'); expect(document.activeElement).toBe(actions.at(-1));
    press('Home'); expect(document.activeElement).toBe(actions[0]);
    expect(actions.filter(button => button.tabIndex === 0)).toEqual([actions[0]]);
    expect([...wordRow.querySelectorAll('[data-glossary-translation] [role="toolbar"]')].every(toolbar => !toolbar.hasAttribute('dir'))).toBe(true);
    expect([...wordRow.querySelectorAll('[data-glossary-translation-text]')].map(attrs)).toEqual([['fr', 'ltr'], ['ar', 'rtl']]);
  });

  it('follows CSS row direction and leaves text-editing arrows untouched', () => {
    const { container } = mount([row], { isEditingGlossary: true });
    const wordRow = container.querySelector('[data-glossary-entry-key]');
    wordRow.style.direction = 'rtl';
    const actions = [...wordRow.querySelectorAll('button')].filter(button => !button.disabled && !button.closest('[hidden]'));
    act(() => actions[0].focus());
    act(() => actions[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(actions[1]);
    const field = wordRow.querySelector('textarea');
    const key = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    act(() => { field.focus(); field.dispatchEvent(key); });
    expect(document.activeElement).toBe(field);
    expect(key.defaultPrevented).toBe(false);
  });
});

describe('localized language display names preserve saved identities', () => {
  const taggedRow = { ...row, termLanguage: 'Hebrew', definitionLanguage: 'en-GB', translations: {
    'ar-Latn': 'Salam: Tahiyya.', 'zh-Hant-TW': '問候：打招呼的話。'
  } };
  const languages = ['ar-Latn', 'zh-Hant-TW'];
  const label = (tag, locale = 'es') => new Intl.DisplayNames([locale], { type: 'language', languageDisplay: 'standard', fallback: 'none' }).of(tag);

  it('uses each row’s term language for the source badge and follows the independent UI language', () => {
    const { container, render } = mount([taggedRow, { ...taggedRow, entryId: 'other-language', termLanguage: 'English' }], {
      isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'ar-Latn', displayLanguages: languages,
    });
    const badge = () => container.querySelector('[data-flashcard-source-language]');
    expect(badge().textContent).toBe('hebreo');
    expect(container.querySelector('[data-flashcard-term-text]').lang).toBe('he');
    render({ flashcardIndex: 1 });
    expect(badge().textContent).toBe('inglés');
    render({ currentUiLanguage: 'Arabic', flashcardIndex: 0 });
    expect(badge().textContent).toBe(label('he', 'ar'));
    expect(container.querySelector('[data-flashcard-term-text]').lang).toBe('he');
  });

  it('shows consistent names with scripts and regions in choices, columns, and card badges without changing select values', () => {
    const setStandardDeckLang = vi.fn();
    const { container, render } = mount([taggedRow], { isInteractiveFlashcards: true, flashcardMode: 'standard', standardDeckLang: 'ar-Latn', displayLanguages: languages, setStandardDeckLang });
    expect(label('ar-Latn')).toBe('árabe (latino)');
    expect(label('zh-Hant-TW')).toBe('chino (tradicional, Taiwán)');
    languages.forEach(tag => {
      const options = [...container.querySelectorAll('option')].filter(option => option.value === tag);
      expect(options.length).toBeGreaterThan(0);
      expect(options.every(option => option.textContent.replace(/^\+ /, '') === label(tag))).toBe(true);
      expect([...container.querySelectorAll('th')].some(node => node.textContent === label(tag))).toBe(true);
      expect([...container.querySelectorAll('[data-glossary-translation] [data-glossary-mobile-label]')].some(node => node.textContent === label(tag))).toBe(true);
    });
    expect([...container.querySelectorAll('[data-flashcard-translation-language]')].map(node => node.textContent)).toEqual([label('ar-Latn'), label('ar-Latn')]);
    expect(container.querySelector('[data-glossary-definition] [data-glossary-mobile-label]').textContent).toBe('Definition (' + label('en-GB') + ')');
    const select = container.querySelector('[data-flashcard-header] select');
    expect(select.value).toBe('ar-Latn');
    act(() => { select.value = 'zh-Hant-TW'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(setStandardDeckLang).toHaveBeenCalledWith('zh-Hant-TW');
    render({ standardDeckLang: 'zh-Hant-TW', currentUiLanguage: 'French' });
    expect(container.querySelector('[data-flashcard-translation-language]').textContent).toBe(label('zh-Hant-TW', 'fr'));
    expect(container.querySelector('[data-flashcard-translation-text]').lang).toBe('zh-Hant-TW');
  });

  it('keeps translation keys and audio requests unchanged when labels are localized', () => {
    const handleSpeak = vi.fn();
    const { container } = mount([taggedRow], { isInteractiveFlashcards: true, flashcardMode: 'standard', standardDeckLang: 'ar-Latn', displayLanguages: languages, handleSpeak });
    const translatedTerm = container.querySelector('[data-flashcard-face="front"] [data-flashcard-translation-text]');
    expect(translatedTerm.textContent).toBe('Salam');
    expect(translatedTerm.closest('button').getAttribute('aria-label')).toContain('árabe (latino)');
    click(translatedTerm.closest('button'));
    expect(handleSpeak).toHaveBeenCalledWith('Salam', 'fc-front-ar-Latn', 0, false, 'ar-Latn');
    expect(Object.keys(taggedRow.translations)).toEqual(languages);
  });

  it.each(['missing', 'throws'])('falls back to original names and tags when Intl.DisplayNames is %s', availability => {
    if (availability === 'missing') vi.stubGlobal('Intl', new Proxy(Intl, { get: (target, key) => key === 'DisplayNames' ? undefined : Reflect.get(target, key) }));
    else vi.spyOn(Intl, 'DisplayNames').mockImplementation(function () { throw new RangeError('Locale unsupported'); });
    const { container } = mount([taggedRow], { isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'ar-Latn', displayLanguages: languages });
    expect(container.querySelector('[data-flashcard-source-language]').textContent).toBe('Hebrew');
    expect(container.querySelector('[data-flashcard-translation-language]').textContent).toBe('ar-Latn');
    expect(container.querySelector('[data-flashcard-term-text]').lang).toBe('he');
  });

  it('leaves an unrecognized user-supplied language name intact', () => {
    const unknown = 'Classroom language (custom spelling)';
    const { container } = mount([{ ...row, termLanguage: unknown, translations: { [unknown]: 'A greeting.' } }], {
      isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: unknown, displayLanguages: [unknown],
    });
    expect(container.querySelector('[data-flashcard-source-language]').textContent).toBe(unknown);
    expect(container.querySelector('[data-flashcard-translation-language]').textContent).toBe(unknown);
    expect(container.querySelector('[data-flashcard-term-text]').lang).toBe('');
  });

  it('keeps selected reading styles when entering cards and changing deck and interface languages', () => {
    const api = bridge();
    const { container, render } = mount([taggedRow], { displayLanguages: languages });
    click(container.querySelector('[data-glossary-compact-toolbar] [data-reading-settings-button]'));
    const font = document.querySelector('[data-allo-reading-settings] select');
    act(() => { font.value = 'opendyslexic'; font.dispatchEvent(new Event('change', { bubbles: true })); });
    act(() => font.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    render({ isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'zh-Hant-TW', currentUiLanguage: 'French' });
    click(container.querySelector('[data-flashcard-header] [data-reading-settings-button]'));
    expect(document.querySelector('[data-allo-reading-settings] select').value).toBe('opendyslexic');
    expect(api.set).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-flashcard-translation-language]').textContent).toBe(label('zh-Hant-TW', 'fr'));
  });
});

describe('interactive card content language of parts', () => {
  it('follows CSS direction for card-progress arrows and leaves modified shortcuts alone', () => {
    const { container } = mount([row, { ...row, entryId: 'second' }, { ...row, entryId: 'third' }], { isInteractiveFlashcards: true });
    const progress = container.querySelector('[role="dialog"] [role="group"][aria-label="common.progress"]');
    progress.style.direction = 'rtl';
    const dots = [...progress.querySelectorAll('button')];
    act(() => dots[0].focus());
    act(() => dots[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(dots[1]);
    act(() => dots[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(dots[0]);
    const modified = new KeyboardEvent('keydown', { key: 'End', ctrlKey: true, bubbles: true, cancelable: true });
    act(() => dots[0].dispatchEvent(modified));
    expect(modified.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(dots[0]);
  });

  it('shows an independent localized definition-language cue when source fields use different languages', () => {
    const data = [
      { ...row, termLanguage: 'Hebrew', definitionLanguage: 'French' },
      { ...row, entryId: 'other-language', termLanguage: 'Hebrew', definitionLanguage: 'Arabic' },
    ];
    const { container, render } = mount(data, { isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'Arabic' });
    const cue = () => container.querySelector('[data-flashcard-definition-language]');
    expect(container.querySelector('[data-flashcard-source-language]').textContent).toBe('hebreo');
    expect(cue().textContent).toBe('Definition (francés)');
    expect(cue().closest('[lang]').lang).toBe('es');
    expect(attrs(container.querySelector('[data-flashcard-definition-text]'))).toEqual(['fr', 'ltr']);
    render({ flashcardIndex: 1 });
    expect(cue().textContent).toBe('Definition (árabe)');
    expect(attrs(container.querySelector('[data-flashcard-definition-text]'))).toEqual(['ar', 'rtl']);
    render({ flashcardIndex: 1, currentUiLanguage: 'Arabic' });
    expect(cue().textContent).toBe('Definition (' + new Intl.DisplayNames(['ar'], { type: 'language', languageDisplay: 'standard' }).of('ar') + ')');
  });

  it.each([
    { termLanguage: 'French', definitionLanguage: 'fr' },
    { termLanguage: 'French (Canadian)', definitionLanguage: 'fr_CA' },
    { termLanguage: 'Hebrew', definitionLanguage: 'iw' },
    { termLanguage: 'Custom language', definitionLanguage: 'custom language' },
    {},
  ])('avoids a redundant language cue for equivalent or inherited metadata: %j', fields => {
    const { container } = mount([{ ...row, ...fields }], { isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'Arabic' });
    expect(container.querySelector('[data-flashcard-definition-language]')).toBeNull();
  });

  it('keeps script distinctions visible and does not create a cue for an empty definition', () => {
    const { container, render, props } = mount([{ ...row, termLanguage: 'ar', definitionLanguage: 'ar-Latn' }], { isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'Arabic' });
    expect(container.querySelector('[data-flashcard-definition-language]').textContent).toBe('Definition (árabe (latino))');
    const saved = { ...props.generatedContent, data: [{ ...props.generatedContent.data[0], def: '' }] };
    render({ generatedContent: saved, filteredGlossaryData: [{ ...saved.data[0], _originalIdx: 0 }] });
    expect(container.querySelector('[data-flashcard-definition-language]')).toBeNull();
  });

  it.each(['standard', 'language'])('uses separate saved term, definition, and translation languages in %s mode', flashcardMode => {
    const { container, render } = mount([{ ...row, termLanguage: 'Hebrew', definitionLanguage: 'French' }, { ...row, entryId: 'other', termLanguage: 'English', definitionLanguage: 'Spanish' }], {
      isInteractiveFlashcards: true, flashcardMode, flashcardLang: 'Arabic', standardDeckLang: 'Arabic',
    });
    const card = () => container.querySelector('[role="dialog"]');
    expect(attrs(card().querySelector('[data-flashcard-term-text]'))).toEqual(['he', 'rtl']);
    expect(attrs(card().querySelector('[data-flashcard-definition-text]'))).toEqual(['fr', 'ltr']);
    expect([...card().querySelectorAll('[data-flashcard-translation-text]')].map(attrs)).toEqual([['ar', 'rtl'], ['ar', 'rtl']]);
    expect(card().querySelector('[data-flashcard-term-text]').closest('button').closest('[lang]').lang).toBe('es');
    render({ flashcardIndex: 1 });
    expect(attrs(card().querySelector('[data-flashcard-term-text]'))).toEqual(['en', 'ltr']);
    expect(attrs(card().querySelector('[data-flashcard-definition-text]'))).toEqual(['es', 'ltr']);
  });

  it('does not tag a localized missing-translation message as target-language content', () => {
    const { container } = mount([{ ...row, translations: {} }], { isInteractiveFlashcards: true, flashcardMode: 'language', flashcardLang: 'Arabic' });
    const missing = container.querySelector('[data-flashcard-translation-text]');
    expect(missing.textContent).toBe('Translation not available');
    expect(missing.getAttribute('lang')).toBeNull();
    expect(missing.closest('[lang]').lang).toBe('es');
  });

  it('tags quiz prompts and distractors by the actual displayed field, including ambiguous same-text answers', () => {
    const data = [
      { ...row, termLanguage: 'Hebrew', definitionLanguage: 'French' },
      { ...row, entryId: 'spanish', def: 'Comida.', definitionLanguage: 'Spanish' },
      { ...row, entryId: 'same-answer-en', def: 'Shared answer', definitionLanguage: 'English' },
      { ...row, entryId: 'same-answer-fr', def: 'Shared answer', definitionLanguage: 'French' },
    ];
    const { container } = mount(data, { isInteractiveFlashcards: true, isFlashcardQuizMode: true, isFlashcardFlipped: true, flashcardOptions: ['Un aliment.', 'Comida.', 'Shared answer'] });
    const back = container.querySelector('[data-flashcard-face="back"]');
    expect(attrs(back.querySelector('[data-flashcard-term-text]'))).toEqual(['he', 'rtl']);
    expect([...back.querySelectorAll('[data-flashcard-option-text]')].map(attrs)).toEqual([['fr', 'ltr'], ['es', 'ltr'], ['', 'auto']]);
  });

  it('uses target-language quiz text and the source-language fallback when a translated term is missing', () => {
    const data = [
      { ...row, termLanguage: 'Hebrew', translations: { Arabic: 'خبز: غذاء.' } },
      { ...row, entryId: 'definition-only', termLanguage: 'French', translations: { Arabic: 'طعام.' } },
    ];
    const { container, render } = mount(data, { isInteractiveFlashcards: true, isFlashcardQuizMode: true, isFlashcardFlipped: true,
      flashcardMode: 'language', flashcardLang: 'Arabic', flashcardOptions: ['غذاء.', 'طعام.'] });
    const back = () => container.querySelector('[data-flashcard-face="back"]');
    expect(attrs(back().querySelector('[data-flashcard-term-text]'))).toEqual(['ar', 'rtl']);
    expect([...back().querySelectorAll('[data-flashcard-option-text]')].map(attrs)).toEqual([['ar', 'rtl'], ['ar', 'rtl']]);
    render({ flashcardIndex: 1 });
    expect(attrs(back().querySelector('[data-flashcard-term-text]'))).toEqual(['fr', 'ltr']);
  });
});
