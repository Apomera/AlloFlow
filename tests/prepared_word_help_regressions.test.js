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
  window.__alloUtils = { cleanJson: value => value };
  loadAlloModule(resolve(sourceRoot, 'content_engine_module.js'));
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

// Exercise the real lookup boundary with provider calls mocked, so a plausible
// callback payload cannot hide a wrong passage or occurrence in the request.
function lookupHost(item, mode = 'define') {
  let definition = null;
  const state = { interactionMode: mode, gradeLevel: '5', generatedContent: item, activeView: 'simplified',
    setDefinitionData: value => { definition = typeof value === 'function' ? value(definition) : value; },
    setPhonicsData: () => {}, setSelectionMenu: () => {} };
  const callGemini = vi.fn().mockResolvedValue('A further explanation.');
  const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, addToast: vi.fn(), t: value => value });
  return { engine, callGemini, definition: () => definition };
}

describe('Prepared help lookup handoff', () => {
  it.each(['first word', 'last word', 'list'])('keeps the exact prepared phrase when requesting more from the %s', async origin => {
    const data = 'A bank **account**. A bank account.', quote = 'bank account';
    const item = itemWithHelp(data, quote, data.lastIndexOf(quote)), lookup = lookupHost(item);
    const { props } = mount(item, { handleWordClick: lookup.engine.handleWordClick });
    const opener = origin === 'list' ? host.querySelector('[data-prepared-help-open]') : words(origin === 'last word' ? 'account' : 'bank')[1];
    click(opener);
    expect(lookup.callGemini).not.toHaveBeenCalled();
    click(card().querySelector('[data-word-help-card-more]'));
    await act(async () => {});
    expect(lookup.callGemini).toHaveBeenCalledTimes(1);
    const request = lookup.definition().lookupRequest;
    expect(request.passageText.slice(request.selectionStart, request.selectionStart + quote.length)).toBe(quote);
    expect(request.passageText.slice(request.selectionStart, request.selectionEnd)).toBe(quote);
    expect(request.passageText).toBe(data);
    expect(request.selectionStart).toBe(data.lastIndexOf(quote));
    expect(request.selectionEnd).toBe(data.length - 1);
    expect(request.passageText.slice(request.selectionStart, request.selectionEnd)).toBe(quote);
    expect(request.lookupText).toBe(quote);
    expect(request.preparedText).toBe('Meaning for the selected occurrence.');
    expect(lookup.callGemini.mock.calls[0][0]).toContain(JSON.stringify({
      passage: data, selectedText: quote, selectionStart: data.lastIndexOf(quote), selectionEnd: data.length - 1, occurrence: null,
    }));
    expect(props.handleSpeak).not.toHaveBeenCalled(); expect(card()).toBeNull();
  });

  it('keeps the source-language passage when more help starts from a bilingual list', async () => {
    const source = 'La radio suena.\n\nLa radio calla.', quote = 'radio';
    const data = source + '\n\n--- ENGLISH TRANSLATION ---\n\nThe radio plays.\n\nThe radio stops.';
    const item = itemWithHelp(data, quote, source.lastIndexOf(quote), 'Spanish'), lookup = lookupHost(item);
    mount(item, { isSideBySide: true, handleWordClick: lookup.engine.handleWordClick });
    click(host.querySelector('[data-prepared-help-open]'));
    click(card().querySelector('[data-word-help-card-more]'));
    await act(async () => {});
    expect(lookup.definition().lookupRequest).toMatchObject({ passageText: source, language: 'Spanish',
      selectionStart: source.lastIndexOf(quote), selectionEnd: source.lastIndexOf(quote) + quote.length, lookupText: quote });
    expect(lookup.callGemini).toHaveBeenCalledTimes(1);
  });

  it('retains exact lookup context when only the prepared list can locate a table support', async () => {
    const data = '| Bird |\n| --- |\n| heron |', quote = 'heron';
    const item = itemWithHelp(data, quote), lookup = lookupHost(item);
    mount(item, { handleWordClick: lookup.engine.handleWordClick, renderFormattedText: () => React.createElement('table', null,
      React.createElement('tbody', null, React.createElement('tr', null, React.createElement('td', null, 'heron')))) });
    expect(host.querySelector('[data-prepared-word-help]')).toBeNull();
    click(host.querySelector('[data-prepared-help-open]'));
    click(card().querySelector('[data-word-help-card-more]'));
    await act(async () => {});
    expect(lookup.definition().lookupRequest).toMatchObject({ passageText: data, selectionStart: data.indexOf(quote),
      selectionEnd: data.indexOf(quote) + quote.length, lookupText: quote });
  });

  it('keeps prepared help and its exact context available when live AI is disabled', async () => {
    vi.stubGlobal('__alloStudentAiDisabled', true);
    const data = 'The heron rests. The heron flies.', quote = 'heron';
    const item = itemWithHelp(data, quote, data.lastIndexOf(quote)), lookup = lookupHost(item);
    mount(item, { handleWordClick: lookup.engine.handleWordClick });
    click(host.querySelector('[data-prepared-help-open]'));
    expect(card().textContent).toContain('Meaning for the selected occurrence.');
    expect(lookup.callGemini).not.toHaveBeenCalled();
    click(card().querySelector('[data-word-help-card-more]'));
    await act(async () => {});
    expect(lookup.callGemini).not.toHaveBeenCalled();
    expect(lookup.definition()).toMatchObject({ aiStatus: 'disabled', preparedText: 'Meaning for the selected occurrence.',
      lookupRequest: { passageText: data, selectionStart: data.lastIndexOf(quote), selectionEnd: data.lastIndexOf(quote) + quote.length } });
  });

  it('does not offer a lookup action the host ignores outside Word meaning', async () => {
    const item = itemWithHelp('The heron rests.', 'heron'), lookup = lookupHost(item, 'read');
    await lookup.engine.handleWordClick('heron', null);
    expect(lookup.definition()).toBeNull();
    mount(item, { interactionMode: 'read', handleWordClick: lookup.engine.handleWordClick });
    click(host.querySelector('[data-prepared-help-open]'));
    expect(card()).not.toBeNull();
    expect(card().querySelector('[data-word-help-card-more]')).toBeNull();
    expect(lookup.callGemini).not.toHaveBeenCalled();
  });

  it('keeps the real preview free of lookup callbacks and More controls', () => {
    const { props } = mount(itemWithHelp('The heron rests.', 'heron'), { isTeacherMode: true, isZenMode: false });
    click(host.querySelector('[data-student-preview-open]'));
    const preview = host.querySelector('[data-student-preview]');
    click([...preview.querySelectorAll('button')].find(button => button.textContent === 'Word meaning'));
    click(preview.querySelector('[data-prepared-help-open]'));
    expect(preview.querySelector('[data-word-help-card]')).not.toBeNull();
    expect(preview.querySelector('[data-word-help-card-more]')).toBeNull();
    expect(props.handleWordClick).not.toHaveBeenCalled();
  });
});

describe('Prepared help exact occurrence regressions', () => {
  it('includes the visible list action in its accessible name', () => {
    mount(itemWithHelp('The heron rests.', 'heron'));
    const button = host.querySelector('[data-prepared-help-open]');
    expect(button.getAttribute('aria-label')).toContain(button.textContent.trim());
    expect(button.getAttribute('aria-label')).toContain('heron');
  });

  it('gives a truthful preview instruction without CSS Highlights', () => {
    vi.stubGlobal('Highlight', undefined);
    mount(itemWithHelp('The heron rests.', 'heron'), { isTeacherMode: true, isZenMode: false });
    click(host.querySelector('[data-student-preview-open]'));
    const preview = host.querySelector('[data-student-preview]');
    click([...preview.querySelectorAll('button')].find(button => button.textContent === 'Word meaning'));
    expect(preview.textContent).not.toMatch(/underlined word/i);
    expect(preview.textContent).toMatch(/Word help after the passage/i);
    click(preview.querySelector('[data-prepared-help-open]'));
    expect(preview.querySelector('[data-word-help-card-text]').textContent).toBe('Meaning for the selected occurrence.');
  });

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

  it('refocuses a prepared card when its same keyboard trigger is activated again', () => {
    const { props } = mount(itemWithHelp('The heron rests.', 'heron'));
    const opener = words('heron')[0];
    act(() => opener.focus()); key(opener, 'Enter');
    expect(document.activeElement).toBe(card());
    act(() => opener.focus()); key(opener, 'Enter');
    expect(document.activeElement).toBe(card());
    expect(props.handleWordClick).not.toHaveBeenCalled();
    expect(props.handleSpeak).not.toHaveBeenCalled();
    key(card(), 'Escape'); expect(document.activeElement).toBe(opener);
  });

  it('keeps a cross-paragraph prepared phrase highlight out of translated text and controls', () => {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class extends Set { constructor(...ranges) { super(ranges); } });
    const source = 'La radio suena.\n\nLa radio calla.';
    const quote = 'suena.\n\nLa radio';
    const data = source + '\n\n--- ENGLISH TRANSLATION ---\n\nThe radio plays.\n\nThe radio stops.';
    const item = itemWithHelp(data, quote, source.indexOf(quote), 'Spanish'), saved = JSON.stringify(item);
    const { props, update } = mount(item, { isSideBySide: true });
    const unchanged = host.querySelector('[data-reading-passage]').textContent;
    const checkRanges = name => {
      const ranges = [...registry.get(name)];
      expect(ranges.length).toBeGreaterThan(0);
      expect(ranges.map(range => range.toString()).join('')).toBe('suena.La radio');
      for (const range of ranges) {
        expect(range.startContainer.parentElement.closest('[data-reading-language]').getAttribute('data-reading-language')).toBe('Spanish');
        expect(range.endContainer.parentElement.closest('[data-reading-language]').getAttribute('data-reading-language')).toBe('Spanish');
        expect(range.cloneContents().querySelector('button, [data-reading-ui], [data-reading-language="English"]')).toBeNull();
      }
    };
    checkRanges('allo-word-help');
    click(host.querySelector('[data-adapted-word-help-spot]'));
    checkRanges('allo-word-help-focus');
    click(words('radio').filter(word => word.closest('[data-reading-language]').getAttribute('data-reading-language') === 'Spanish')[1]);
    expect(card()?.querySelector('h5').textContent).toBe(quote);
    expect(props.handleSpeak).not.toHaveBeenCalled(); expect(props.handleWordClick).not.toHaveBeenCalled();
    expect(host.querySelector('[data-reading-passage]').textContent).toBe(unchanged);
    expect(JSON.stringify(item)).toBe(saved);
    item.adaptedReadingSupports.shown = false; update({});
    expect(registry.has('allo-word-help')).toBe(false);
    expect(registry.has('allo-word-help-focus')).toBe(false);
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
  it.each(['original', 'same-text-supported'])('dismisses prepared help and its owned audio when the reading becomes %s', form => {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class extends Set { constructor(...ranges) { super(ranges); } });
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    click(host.querySelector('[data-adapted-word-help-spot]'));
    click(words('heron')[0]); click(card().querySelector('[data-word-help-card-listen]'));
    const ownedId = view.props.handleSpeak.mock.calls.at(-1)[1];
    view.update({ isPlaying: false, playingContentId: ownedId });
    view.props.stopPlayback.mockClear();
    const changed = { ...item, instructionalText: { ...item.instructionalText, form } };
    expect(contract.isAdaptedReading(changed)).toBe(false);
    view.update({ generatedContent: changed });
    expect(card()).toBeNull();
    expect(host.querySelector('[data-prepared-help-open], [data-prepared-word-help]')).toBeNull();
    expect(view.props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(registry.has('allo-word-help')).toBe(false);
    expect(registry.has('allo-word-help-focus')).toBe(false);
    view.update({ generatedContent: item, playingContentId: null });
    expect(card()).toBeNull();
    expect(view.props.handleSpeak).toHaveBeenCalledTimes(1);
    click(words('heron')[0]);
    expect(card().querySelector('[data-word-help-card-text]').textContent).toBe('Meaning for the selected occurrence.');
    expect(view.props.handleWordClick).not.toHaveBeenCalled();
  });

  it('removes obsolete prepared trigger labels when validation changes without an open card', () => {
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    expect(words('heron')[0].getAttribute('aria-label')).toMatch(/Prepared word help/);
    view.update({ generatedContent: { ...item, instructionalText: { ...item.instructionalText, form: 'original' } } });
    const word = words('heron')[0];
    expect(word.hasAttribute('data-prepared-word-help')).toBe(false);
    expect(word.hasAttribute('aria-haspopup')).toBe(false);
    expect(word.getAttribute('aria-label')).not.toMatch(/Prepared word help/);
    click(word);
    expect(card()).toBeNull(); expect(view.props.handleWordClick).toHaveBeenCalledTimes(1);
    view.update({ generatedContent: item });
    expect(words('heron')[0].getAttribute('aria-label')).toMatch(/Prepared word help/);
    click(words('heron')[0]); expect(card()).not.toBeNull();
    expect(view.props.handleWordClick).toHaveBeenCalledTimes(1);
  });

  it('removes invalid prepared content before paint and leaves unrelated audio alone', () => {
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    let seen;
    function ObservedReader({ current }) {
      React.useLayoutEffect(() => { seen = { card: !!card(), labels: host.querySelectorAll('[data-prepared-word-help]').length }; });
      return React.createElement(View, { ...view.props, generatedContent: current, isPlaying: true, playingContentId: 'unrelated-reading' });
    }
    act(() => root.render(React.createElement(ObservedReader, { current: item })));
    click(words('heron')[0]); expect(card()).not.toBeNull();
    view.props.stopPlayback.mockClear();
    act(() => root.render(React.createElement(ObservedReader, { current: { ...item, instructionalText: { ...item.instructionalText, form: 'original' } } })));
    expect(seen).toEqual({ card: false, labels: 0 });
    expect(view.props.stopPlayback).not.toHaveBeenCalled();
  });

  it.each(['hidden', 'changed explanation', 'removed entry'])('invalidates the card and controls after an in-place support change: %s', change => {
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    click(words('heron')[0]); click(card().querySelector('[data-word-help-card-listen]'));
    const ownedId = view.props.handleSpeak.mock.calls.at(-1)[1];
    view.update({ isPlaying: true, playingContentId: ownedId });
    view.props.stopPlayback.mockClear();
    if (change === 'hidden') item.adaptedReadingSupports.shown = false;
    if (change === 'changed explanation') item.adaptedReadingSupports.annotations[0].text = 'A revised explanation.';
    if (change === 'removed entry') item.adaptedReadingSupports.annotations.length = 0;
    view.update({ generatedContent: item });
    expect(card()).toBeNull();
    expect(view.props.stopPlayback).toHaveBeenCalledTimes(1);
    if (change === 'changed explanation') {
      click(words('heron')[0]);
      expect(card().querySelector('[data-word-help-card-text]').textContent).toBe('A revised explanation.');
      expect(view.props.handleWordClick).not.toHaveBeenCalled();
    } else expect(host.querySelector('[data-prepared-word-help], [data-prepared-help-open]')).toBeNull();
  });

  it.each(['learner', 'role'])('dismisses prepared help on a %s boundary without stopping unrelated playback', boundary => {
    const view = mount(itemWithHelp('The heron rests.', 'heron'), { readingLearnerKey: 'learner-a', isTeacherMode: true });
    click(words('heron')[0]);
    view.update({ isPlaying: true, playingContentId: 'unrelated-reading' });
    view.props.stopPlayback.mockClear();
    view.update(boundary === 'learner' ? { readingLearnerKey: 'learner-b' } : { isTeacherMode: false });
    expect(card()).toBeNull();
    expect(view.props.stopPlayback).not.toHaveBeenCalled();
  });

  it.each(['hear', 'listen'])('a second activation cancels pending %s instead of requesting speech twice', control => {
    const view = mount(itemWithHelp('The heron rests.', 'heron'));
    click(words('heron')[0]);
    click(card().querySelector('[data-word-help-card-' + control + ']'));
    const ownedId = view.props.handleSpeak.mock.calls.at(-1)[1];
    view.update({ isPlaying: false, playingContentId: ownedId });
    view.props.stopPlayback.mockClear();
    const button = card().querySelector('[data-word-help-card-' + control + ']');
    expect(button.textContent).toBe('Stop');
    click(button);
    expect(view.props.stopPlayback).toHaveBeenCalledTimes(1);
    expect(view.props.handleSpeak).toHaveBeenCalledTimes(1);
  });

  it('retains an open card across unchanged read-aloud updates without revalidating supports', () => {
    const view = mount(itemWithHelp('The heron rests.', 'heron'));
    click(words('heron')[0]);
    const popup = card(), validation = vi.spyOn(contract, 'validateAdaptedReadingSupports');
    const listen = popup.querySelector('[data-word-help-card-listen]');
    act(() => listen.focus());
    // Settle the hook's dependency on the spied function, then measure stable frames.
    view.update({ playbackState: { currentIdx: 0 } }); validation.mockClear();
    view.update({ playbackState: { currentIdx: 1 } }); view.update({ playbackState: { currentIdx: 2 } });
    expect(card()).toBe(popup); expect(validation).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(listen);
  });

  it.each(['replacement', 'in-place'])('does not expose the old card during a render that hides supports by %s', change => {
    const item = itemWithHelp('The heron rests.', 'heron'), view = mount(item);
    let observedCard;
    function ObservedReader({ current }) {
      React.useLayoutEffect(() => { observedCard = !!host.querySelector('[data-word-help-card]'); });
      return React.createElement(View, { ...view.props, generatedContent: current });
    }
    act(() => root.render(React.createElement(ObservedReader, { current: item })));
    click(words('heron')[0]); expect(card()).not.toBeNull();
    const hidden = change === 'in-place' ? item : { ...item, adaptedReadingSupports: { ...item.adaptedReadingSupports } };
    hidden.adaptedReadingSupports.shown = false;
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
