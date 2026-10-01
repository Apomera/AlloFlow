// Track 10: exercise the current JSX without rebuilding shared deployment files.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
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
  const sourceRoot = process.env.PREPARED_HELP_SOURCE_DIR || process.cwd();
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js']) loadAlloModule(resolve(sourceRoot, file));
  ({ InstructionalContext: contract, PureHelpers: pure, PhaseNHelpers: phase } = window.AlloModules);
  // Newer integration baselines embed both the place and support-draft helpers.
  const source = ['reader_place_store.js', 'reader_support_drafts.js', 'view_simplified_source.jsx']
    .map(file => resolve(sourceRoot, file)).filter(file => existsSync(file)).map(file => readFileSync(file, 'utf8')).join('\n');
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
  vi.useRealTimers();
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
    const sourceWords = words('radio').filter(word => word.closest('[data-reading-language]').getAttribute('data-reading-language') === 'Spanish');
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

  it.each([
    ['## Birds\n\nA **heron** rests. A heron flies.', 'heron', 'English'],
    ['Le café ferme. Le café ouvre.', 'café', 'French'],
    ['Le cafe\u0301 ferme. Le cafe\u0301 ouvre.', 'cafe\u0301', 'French'],
    ['猫在这里。猫在家里。', '猫', 'Chinese'],
    ['الطائر هنا. الطائر هناك.', 'الطائر', 'Arabic'],
    ['A 𐐀 rests. A 𐐀 flies.', '𐐀', 'English'],
  ])('keeps the exact repeated occurrence and unchanged passage: %s', (data, quote, language) => {
    const item = itemWithHelp(data, quote, data.lastIndexOf(quote), language), saved = JSON.stringify(item);
    const { props } = mount(item);
    const before = host.querySelector('[data-reading-passage]').textContent;
    const supported = [...host.querySelectorAll('[data-prepared-word-help]')];
    expect(supported.length).toBeGreaterThan(0);
    click(supported.at(-1));
    expect(card()?.querySelector('h5').textContent).toBe(quote);
    expect(props.handleWordClick).not.toHaveBeenCalled(); expect(props.handleSpeak).not.toHaveBeenCalled();
    expect(JSON.stringify(item)).toBe(saved);
    expect(host.querySelector('[data-reading-passage]').textContent).toBe(before);
  });

  it('keeps a phrase across a line break anchored to its own range', () => {
    const data = 'A river\nbank. A river bank.';
    const { props } = mount(itemWithHelp(data, 'river bank', data.lastIndexOf('river bank')));
    click(words('bank')[0]); expect(card()).toBeNull();
    props.handleWordClick.mockClear();
    click(words('bank')[1]); expect(card()?.querySelector('h5').textContent).toBe('river bank');
    expect(props.handleWordClick).not.toHaveBeenCalled();
  });

  it('offers prepared help for a link without replacing the link or nesting controls', () => {
    const item = itemWithHelp('Read [heron](https://example.org/source) today.', 'heron');
    const { props } = mount(item);
    const link = host.querySelector('[data-reading-passage] a');
    expect(link.textContent).toBe('heron'); expect(link.href).toBe('https://example.org/source');
    expect(link.querySelector('[role="button"], button')).toBeNull();
    const opener = host.querySelector('[data-prepared-help-open]');
    key(opener, 'Enter'); // Native buttons activate through their click event.
    click(opener);
    expect(card()?.querySelector('h5').textContent).toBe('heron');
    expect(props.handleSpeak).not.toHaveBeenCalled(); expect(props.handleWordClick).not.toHaveBeenCalled();
    key(card(), 'Escape'); expect(document.activeElement).toBe(opener);
  });

  it('leaves exact support accessible through the list when displayed text cannot be matched', () => {
    const data = '| Bird |\n| --- |\n| heron |';
    const { props } = mount(itemWithHelp(data, 'heron'), { renderFormattedText: () => React.createElement('table', null,
      React.createElement('tbody', null, React.createElement('tr', null, React.createElement('td', null, 'heron')))) });
    click(host.querySelector('[data-prepared-help-open]'));
    expect(card()?.querySelector('h5').textContent).toBe('heron');
    expect(props.handleWordClick).not.toHaveBeenCalled();
  });
});

describe('Prepared help lifecycle regressions', () => {
  it('does not expose the old card during a render that hides its supports', () => {
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    let observedCard;
    function ObservedReader({ current }) {
      React.useLayoutEffect(() => { observedCard = !!host.querySelector('[data-word-help-card]'); });
      return React.createElement(View, { ...view.props, generatedContent: current });
    }
    act(() => root.render(React.createElement(ObservedReader, { current: item })));
    click(words('heron')[0]); expect(card()).not.toBeNull();
    const hidden = { ...item, adaptedReadingSupports: { ...item.adaptedReadingSupports, shown: false } };
    act(() => root.render(React.createElement(ObservedReader, { current: hidden })));
    expect(observedCard).toBe(false);
  });

  it('only references an existing popup and labels both activation paths', () => {
    mount(itemWithHelp('The heron rests.', 'heron'));
    const word = words('heron')[0], listed = host.querySelector('[data-prepared-help-open]');
    expect(word.hasAttribute('aria-controls')).toBe(false);
    expect(listed.getAttribute('aria-haspopup')).toBe('dialog');
    click(listed);
    expect(listed.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(listed.getAttribute('aria-controls'))).toBe(card());
    key(card(), 'Escape');
    expect(listed.getAttribute('aria-expanded')).toBe('false');
    expect(listed.hasAttribute('aria-controls')).toBe(false);
  });

  it('stops its pending speech even before isPlaying becomes true', () => {
    const view = mount(itemWithHelp('The heron rests.', 'heron'));
    click(words('heron')[0]); click(card().querySelector('[data-word-help-card-hear]'));
    view.update({ isPlaying: false, playingContentId: view.props.handleSpeak.mock.calls.at(-1)[1] });
    view.props.stopPlayback.mockClear(); key(card(), 'Escape');
    expect(view.props.stopPlayback).toHaveBeenCalledTimes(1);
  });

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
    click(card().querySelector(pane === 'word-help-word' ? '[data-word-help-card-hear]' : '[data-word-help-card-listen]'));
    const ownId = view.props.handleSpeak.mock.calls.at(-1)[1];
    view.update({ isPlaying: true, playingContentId: pane === 'simplified-main' ? pane : ownId });
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

  it.each(['hidden', 'edited', 'cloze', 'editing'])('dismisses a card and removes prepared actions after %s', transition => {
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    click(words('heron')[0]); expect(card()).not.toBeNull();
    if (transition === 'hidden') view.update({ generatedContent: { ...item, adaptedReadingSupports: { ...item.adaptedReadingSupports, shown: false } } });
    if (transition === 'edited') view.update({ generatedContent: { ...item, data: 'The heron flies.' } });
    if (transition === 'cloze') view.update({ interactionMode: 'cloze' });
    if (transition === 'editing') view.update({ isTeacherMode: true, isEditingLeveledText: true });
    expect(card()).toBeNull();
    expect(host.querySelector('[data-prepared-word-help], [data-prepared-help-open]')).toBeNull();
  });

  it('stops owned audio on unmount', () => {
    const view = mount(itemWithHelp('The heron rests.', 'heron'));
    click(words('heron')[0]); click(card().querySelector('[data-word-help-card-listen]'));
    const call = view.props.handleSpeak.mock.calls.at(-1);
    expect(call[0]).toBe('heron. Meaning for the selected occurrence.'); expect(call[4]).toBe('English');
    view.update({ isPlaying: true, playingContentId: call[1] }); view.props.stopPlayback.mockClear();
    act(() => root.unmount()); root = null;
    expect(view.props.stopPlayback).toHaveBeenCalledTimes(1);
  });

  it('uses different audio ownership for a replacement card', () => {
    const view = mount(itemWithHelp('The heron rests.', 'heron'));
    click(words('heron')[0]); click(card().querySelector('[data-word-help-card-hear]'));
    const firstId = view.props.handleSpeak.mock.calls.at(-1)[1];
    view.update({ isPlaying: true, playingContentId: firstId }); view.props.stopPlayback.mockClear();
    click(host.querySelector('[data-prepared-help-open]'));
    expect(view.props.stopPlayback).toHaveBeenCalledTimes(1);
    click(card().querySelector('[data-word-help-card-hear]'));
    expect(view.props.handleSpeak.mock.calls.at(-1)[1]).not.toBe(firstId);
  });
});

describe('Prepared help with multiple readers', () => {
  function pair() {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class extends Set { constructor(...ranges) { super(ranges); } });
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    const render = (first = true, playback = {}) => act(() => root.render(React.createElement(React.Fragment, null,
      first && React.createElement(View, { ...view.props, ...playback, key: 'first' }),
      React.createElement(View, { ...view.props, ...playback, key: 'second' }))));
    render();
    return { registry, render, props: view.props, readers: () => [...host.querySelectorAll('[data-adapted-reader]')] };
  }

  it('gives same-item lists distinct accessible heading references', () => {
    pair();
    const lists = [...host.querySelectorAll('[data-adapted-word-help]')];
    expect(lists).toHaveLength(2);
    expect(new Set(lists.map(list => list.getAttribute('aria-labelledby'))).size).toBe(2);
    for (const list of lists) expect(list.contains(document.getElementById(list.getAttribute('aria-labelledby')))).toBe(true);
  });

  it.each(['timeout', 'unmount'])('an older reader cannot erase a newer reader spotlight on %s', action => {
    vi.useFakeTimers();
    const view = pair(), readers = view.readers();
    click(readers[0].querySelector('[data-adapted-word-help-spot]'));
    act(() => vi.advanceTimersByTime(1000));
    click(readers[1].querySelector('[data-adapted-word-help-spot]'));
    const newest = view.registry.get('allo-word-help-focus');
    if (action === 'timeout') act(() => vi.advanceTimersByTime(3000));
    else view.render(false);
    expect(view.registry.get('allo-word-help-focus')).toBe(newest);
    expect([...newest][0].startContainer.parentElement.closest('[data-adapted-reader]')).toBe(readers[1]);
    act(() => vi.advanceTimersByTime(action === 'timeout' ? 1000 : 4000));
    expect(view.registry.has('allo-word-help-focus')).toBe(false);
  });

  it('removes its spotlight when supports become hidden', () => {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class extends Set { constructor(...ranges) { super(ranges); } });
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    click(host.querySelector('[data-adapted-word-help-spot]'));
    expect(registry.has('allo-word-help-focus')).toBe(true);
    view.update({ generatedContent: { ...item, adaptedReadingSupports: { ...item.adaptedReadingSupports, shown: false } } });
    expect(registry.has('allo-word-help-focus')).toBe(false);
  });

  it('closing the first card leaves the second reader audio and focus intact', () => {
    const view = pair(), readers = view.readers();
    readers.forEach(reader => click(reader.querySelector('[data-prepared-help-open]')));
    const cards = [...host.querySelectorAll('[data-word-help-card]')];
    expect(new Set(cards.map(node => node.id)).size).toBe(2);
    click(cards[0].querySelector('[data-word-help-card-hear]'));
    const firstId = view.props.handleSpeak.mock.calls.at(-1)[1];
    click(cards[1].querySelector('[data-word-help-card-hear]'));
    const secondId = view.props.handleSpeak.mock.calls.at(-1)[1];
    expect(firstId).not.toBe(secondId);
    view.render(true, { isPlaying: true, playingContentId: secondId });
    view.props.stopPlayback.mockClear();
    key(cards[0], 'Escape');
    expect(view.props.stopPlayback).not.toHaveBeenCalled();
    expect(readers[1].querySelector('[data-word-help-card]')).toBe(cards[1]);
    click(cards[1].querySelector('[data-word-help-card-all]'));
    expect(document.activeElement).toBe(readers[1].querySelector('[data-adapted-word-help]'));
  });
});
