// Track 10: exercise the current JSX without rebuilding shared deployment files.
// Pending the 04/09 integration dependency: these acceptance cases expose known
// baseline defects and intentionally remain red until the corresponding fixes land.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, View, contract, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js']) loadAlloModule(file);
  ({ InstructionalContext: contract, PureHelpers: pure, PhaseNHelpers: phase } = window.AlloModules);
  const source = readFileSync('reader_place_store.js', 'utf8') + '\n' + readFileSync('view_simplified_source.jsx', 'utf8');
  const compiled = require('@babel/core').transformSync(source, {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  }).code;
  View = new Function('React', compiled + '\nreturn SimplifiedView;')(React);
});
beforeEach(() => localStorage.clear());
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function itemWithHelp(data, quote, start = data.indexOf(quote), language = 'English') {
  const snapshot = contract.createSourceSnapshot('An original reading about ' + quote + '.', { language });
  const item = { id: 'prepared-regression', type: 'simplified', data, sourceSnapshot: snapshot,
    instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language } };
  const supports = contract.upsertAdaptedReadingSupport(item, null, {
    id: 'exact-support', start, end: start + quote.length, quote, text: 'Meaning for the selected occurrence.',
  });
  item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, supports, true);
  return item;
}
function bilingual(text) {
  const parts = text.split('--- ENGLISH TRANSLATION ---');
  return parts.length < 2 ? null : { source: parts[0].trim().split(/\n{2,}/), target: parts[1].trim().split(/\n{2,}/), sourceFull: parts[0].trim(), targetFull: parts[1].trim() };
}
function mount(item, extra = {}) {
  const noop = () => {};
  const props = {
    ComplexityGauge: () => null, t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: item.config.language,
    studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isZenMode: true,
    isPlaying: false, interactionMode: 'define', history: [item], generatedContent: item,
    textEditorRef: React.createRef(), playbackState: { currentIdx: -1 }, cursorStyles: {}, latestGlossary: [],
    setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop,
    setIsCustomReviseOpen: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop,
    setFocusedParagraphIndex: noop, handleToggleIsEditingLeveledText: noop, handleTextMouseUp: noop,
    handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop,
    stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(),
    handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: bilingual,
    getContentDirection: language => language === 'Arabic' ? 'rtl' : 'ltr', isRtlLang: () => false,
    renderFormattedText: text => React.createElement('div', null, text),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, {
      highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text }) => text,
    }),
    highlightGlossaryTerms: value => value, SourceReferencesPanel: () => null, ...extra,
  };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const update = patch => act(() => { Object.assign(props, patch); root.render(React.createElement(View, props)); });
  update({});
  return { props, update };
}
const click = node => act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const key = (node, value) => act(() => node.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })));
const words = (text, selector = '[data-reading-passage]') => [...host.querySelectorAll(selector + ' [role="button"]')].filter(node => node.textContent === text);
const card = () => host.querySelector('[data-word-help-card]');

describe('Prepared help exact occurrence regressions', () => {
  it('does not give a later phrase explanation to an earlier phrase split by emphasis', () => {
    const data = 'A bank **account**. A bank account.';
    const { props } = mount(itemWithHelp(data, 'bank account', data.lastIndexOf('bank account')));
    click(words('bank')[0]);
    expect(card()).toBeNull();
    expect(props.handleWordClick).toHaveBeenCalledTimes(1);
    props.handleWordClick.mockClear();
    click(words('account')[1]);
    expect(card()?.querySelector('h5').textContent).toBe('bank account');
    expect(props.handleWordClick).not.toHaveBeenCalled();
    expect(props.handleSpeak).not.toHaveBeenCalled();
  });

  it('does not count an English table between paired Spanish source paragraphs', () => {
    const source = 'La radio suena.\n\nLa radio calla.';
    const data = source + '\n\n--- ENGLISH TRANSLATION ---\n\n| Device |\n| --- |\n| radio |\n\nThe radio stops.';
    const { props } = mount(itemWithHelp(data, 'radio', source.lastIndexOf('radio'), 'Spanish'), {
      isSideBySide: true,
      renderFormattedText: () => React.createElement('table', null, React.createElement('tbody', null,
        React.createElement('tr', null, React.createElement('td', null, 'radio')))),
    });
    const sourceWords = words('radio', '[data-reading-language="Spanish"]');
    click(sourceWords[1]);
    expect(card()?.querySelector('h5').textContent).toBe('radio');
    expect(props.handleWordClick).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' '])('opens prepared help once with %s and returns focus with Escape', activation => {
    const { props } = mount(itemWithHelp('The heron rests.', 'heron'));
    const opener = words('heron')[0];
    act(() => opener.focus()); key(opener, activation);
    expect(card()).not.toBeNull(); expect(document.activeElement).toBe(card());
    expect(props.handleSpeak).not.toHaveBeenCalled(); expect(props.handleWordClick).not.toHaveBeenCalled();
    key(card(), 'Escape'); expect(card()).toBeNull(); expect(document.activeElement).toBe(opener);
  });

  it('identifies prepared help before activation', () => {
    mount(itemWithHelp('The heron rests.', 'heron'));
    expect(words('heron')[0].getAttribute('aria-label')).toMatch(/prepared|teacher/i);
  });
});

describe('Prepared help lifecycle regressions', () => {
  it('dismisses an open card when comparison switches to Show changes', () => {
    mount(itemWithHelp('The heron rests.', 'heron'), { isCompareMode: true });
    click(words('heron', '[data-compare-version="adapted"]')[0]);
    expect(card()).not.toBeNull();
    click(host.querySelector('input[aria-label="Show changes"]'));
    expect(card()).toBeNull();
  });

  it.each(['word-help-word', 'word-help-card', 'simplified-main'])('closing stops only prepared-card audio: %s', pane => {
    const view = mount(itemWithHelp('The heron rests.', 'heron'));
    click(words('heron')[0]);
    view.update({ isPlaying: true, playingContentId: pane === 'simplified-main' ? pane : 'reading-prepared-regression-' + pane });
    view.props.stopPlayback.mockClear(); key(card(), 'Escape');
    expect(view.props.stopPlayback).toHaveBeenCalledTimes(pane === 'simplified-main' ? 0 : 1);
  });

  it('does not claim a highlight when locating a word without CSS Highlights', () => {
    vi.stubGlobal('Highlight', undefined);
    mount(itemWithHelp('The heron rests.', 'heron'));
    click(host.querySelector('[data-adapted-word-help-spot]'));
    const notice = host.querySelector('[data-adapted-word-help-spot-notice]').textContent;
    expect(notice).toContain('heron'); expect(notice).not.toMatch(/highlighted/i);
    expect(host.querySelector('[data-adapted-word-help-tip]').textContent).not.toMatch(/underlined/i);
  });
});
