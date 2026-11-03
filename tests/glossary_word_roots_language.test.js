import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const candidateRoot = process.env.GLOSSARY_WORD_ROOTS_CANDIDATES || '.';
const views = {};
const cleanups = [];
beforeAll(() => {
  window.React = React;
  const source = readFileSync(resolve(candidateRoot, 'glossary_image_controls_source.jsx'), 'utf8') + '\n'
    + readFileSync(resolve(candidateRoot, 'view_glossary_source.jsx'), 'utf8');
  const compiled = babel.transformSync(source, {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  }).code;
  views.source = new Function('React', 'Fragment', compiled + '\nreturn GlossaryView;')(React, React.Fragment);
  delete window.AlloModules.GlossaryView;
  new Function(readFileSync(resolve(candidateRoot, 'view_glossary_module.js'), 'utf8'))();
  views.runtime = window.AlloModules.GlossaryView;
}, 30000);
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

const englishOrigin = 'An older English explanation.';
const arabicOrigin = 'أصل الكلمة من وصفٍ قديم للنبات.';
const entry = () => ({ entryId: 'leaf', term: 'Leaf', def: 'جزء من النبات.', definitionLanguage: 'ar',
  etymology: englishOrigin, etymologyByLang: { English: englishOrigin, Arabic: arabicOrigin } });
const t = key => ({ 'glossary.etymology_label': 'Word roots', 'common.click_read_aloud': 'Read aloud' }[key] || key);
function mount(implementation, item, flashcards = false) {
  const data = [item], container = document.createElement('div');
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const props = glossaryMediaProps({ t, generatedContent: { id: 'word-origin-language', type: 'glossary', data },
    filteredGlossaryData: data.map((row, _originalIdx) => ({ ...row, _originalIdx })),
    handleSpeak: vi.fn(), isInteractiveFlashcards: flashcards, isFlashcardQuizMode: false,
    ErrorBoundary: ({ children }) => children });
  function Harness() {
    const [flipped, setFlipped] = React.useState(false);
    return React.createElement(views[implementation], { ...props, isFlashcardFlipped: flipped,
      setIsFlashcardFlipped: setFlipped, handleToggleIsFlashcardFlipped: () => setFlipped(value => !value) });
  }
  act(() => root.render(React.createElement(Harness)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, props };
}
const click = node => { expect(node).toBeTruthy(); act(() => node.click()); };
const attrs = node => [node.getAttribute('lang'), node.getAttribute('dir')];

describe.each(['source', 'runtime'])('live glossary word-origin language (%s)', implementation => {
  it('resolves a saved language name to the definition tag in the row and its read-aloud action', () => {
    const item = entry(), saved = JSON.stringify(item), view = mount(implementation, item);
    const details = view.container.querySelector('details[data-help-key="glossary_etymology_info"]');
    click(details.querySelector('summary'));
    const prose = details.querySelector('p');
    expect(prose.textContent).toBe(arabicOrigin);
    expect(attrs(prose)).toEqual(['ar', 'rtl']);
    click(details.querySelector('button[aria-label="Word roots: Leaf"]'));
    expect(view.props.handleSpeak).toHaveBeenCalledWith(arabicOrigin, 'etym-0', 0, false, 'Arabic');
    expect(JSON.stringify(item)).toBe(saved);
  });

  it('uses the same localized prose and audio after flipping the standard flashcard', () => {
    const item = entry(), saved = JSON.stringify(item), view = mount(implementation, item, true);
    click(view.container.querySelector('[data-flashcard-body]'));
    const back = view.container.querySelector('[data-flashcard-face="back"]');
    expect(back.style.display).not.toBe('none');
    const button = back.querySelector('button[aria-label="Read aloud: Word roots"]');
    expect(button.textContent).toBe(arabicOrigin);
    expect(attrs(button.querySelector('span'))).toEqual(['ar', 'rtl']);
    click(button);
    expect(view.props.handleSpeak).toHaveBeenCalledWith(arabicOrigin, 'fc-back-etym', 0, false, 'Arabic');
    expect(JSON.stringify(item)).toBe(saved);
  });

  it('prefers an exact script tag and preserves the script distinction', () => {
    const prose = 'Origin in Latin script.', item = { ...entry(), definitionLanguage: 'ar-Latn',
      etymologyByLang: { ar: arabicOrigin, ar_Latn: 'Alias prose.', 'ar-Latn': prose } };
    const view = mount(implementation, item);
    const details = view.container.querySelector('details[data-help-key="glossary_etymology_info"]');
    expect(details.querySelector('p').textContent).toBe(prose);
    expect(attrs(details.querySelector('p'))).toEqual(['ar-Latn', 'ltr']);
  });

  it.each([false, true])('keeps the legacy fallback and its known English language (flashcards=%s)', flashcards => {
    const item = { ...entry(), etymologyByLang: { English: englishOrigin } };
    const view = mount(implementation, item, flashcards);
    if (flashcards) click(view.container.querySelector('[data-flashcard-body]'));
    const button = view.container.querySelector(flashcards
      ? '[data-flashcard-face="back"] button[aria-label="Read aloud: Word roots"]'
      : 'details[data-help-key="glossary_etymology_info"] button[aria-label="Word roots: Leaf"]');
    const prose = flashcards ? button.querySelector('span') : button.previousElementSibling;
    expect(prose.textContent).toBe(englishOrigin);
    expect(attrs(prose)).toEqual(['en', 'ltr']);
    click(button);
    expect(view.props.handleSpeak).toHaveBeenCalledWith(englishOrigin, flashcards ? 'fc-back-etym' : 'etym-0', 0, false, 'English');
  });
});
