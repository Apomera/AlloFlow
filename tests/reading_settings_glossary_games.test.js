// Reading settings inside the glossary's full-screen activities (2026-10-20).
//
// Flash cards, Word Search and the glossary games (Memory, Matching, Crossword,
// Bingo, Student Bingo, Word Scramble, Definition Detective) each get an "Aa"
// button by Close. It shows only when the host publishes the settings, opens the
// panel inside the activity's dialog, and the activity's reading text is sized
// in rem, so the text-size setting (the root font size) reaches it.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require(REPO + '/tests/helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const FONTS = [
  { id: 'default', label: 'Default (System)', family: '', cssClass: '' },
  { id: 'opendyslexic', label: 'OpenDyslexic', family: "'OpenDyslexic', sans-serif", cssClass: 'font-opendyslexic' },
];
const PX_TEXT = /(^|[\s:])text-\[\d+(\.\d+)?px\]/;

let lib;
beforeAll(() => {
  window.React = React;
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  new Function(readFileSync(DIR + '/view_glossary_module.js', 'utf8'))();
  new Function(readFileSync(DIR + '/games_module.js', 'utf8'))();
  new Function(readFileSync(process.env.UI_FONT_LIBRARY_MODULE || REPO + '/ui_font_library_module.js', 'utf8'))();
  lib = window.AlloModules.UIFontLibrary;
}, 60000);

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  lib.closeReadingSettings();
  delete window.__alloReadingSettings;
  delete window.AlloDictionary;
  vi.restoreAllMocks();
});

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? React.createElement('p', { 'data-crash': '1' }, String(this.state.error.message)) : this.props.children; }
}
function mount(element) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(Boundary, null, element)));
  let live = true;
  const unmount = () => { if (!live) return; live = false; act(() => root.unmount()); container.remove(); };
  cleanups.push(unmount);
  expect(container.querySelector('[data-crash]'), 'the activity rendered').toBeNull();
  return { container, unmount };
}
// A fake host bridge that counts live subscriptions, so a panel left open by an
// activity that closed shows up as a leak.
function installBridge() {
  const state = { fontId: 'default', fontFamily: '', fontClass: '', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, fonts: FONTS };
  const bridge = {
    live: 0,
    get: () => ({ ...state }),
    set: vi.fn((p) => { Object.assign(state, p); window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed', { detail: { ...state } })); }),
    subscribe: (fn) => {
      const h = (e) => fn(e.detail);
      bridge.live += 1;
      window.addEventListener('alloflow:reading-settings-changed', h);
      return () => { bridge.live -= 1; window.removeEventListener('alloflow:reading-settings-changed', h); };
    },
  };
  window.__alloReadingSettings = bridge;
  return bridge;
}
const aaButtons = (root) => [...root.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Aa');
function readingButton(root) {
  const found = aaButtons(root);
  expect(found, 'exactly one Aa button').toHaveLength(1);
  const button = found[0];
  expect(button.getAttribute('aria-label')).toBe('Reading settings');
  expect(button.getAttribute('type')).toBe('button');
  expect(button.getAttribute('aria-haspopup')).toBe('dialog');
  expect(button.className.includes('min-h-11') && button.className.includes('min-w-11'), 'a 44 px target').toBe(true);
  expect(button.className.includes('focus-visible:ring-2'), 'a visible focus ring').toBe(true);
  return button;
}
const click = (el) => { expect(el).toBeTruthy(); act(() => { el.click(); }); };
const press = (el, key) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
const openPanel = () => document.querySelector('[data-allo-reading-settings]');
const pxText = (root) => [...root.querySelectorAll('[class]')].filter((el) => PX_TEXT.test(el.getAttribute('class'))).map((el) => el.getAttribute('class'));
const withText = (root, selector, text) => [...root.querySelectorAll(selector)].find((el) => el.textContent.trim() === text);

// Opening, then Escape: the panel closes, focus returns to Aa, the activity stays open.
function expectPanelInside(button, container, onClose) {
  click(button);
  const panel = openPanel();
  expect(panel, 'the reading settings panel opened').toBeTruthy();
  expect(container.contains(panel), 'opened inside the activity').toBe(true);
  expect(button.getAttribute('aria-expanded')).toBe('true');
  expect(button.getAttribute('aria-controls')).toBe(panel.id);
  press(panel.querySelector('select'), 'Escape');
  expect(openPanel(), 'Escape closed the panel').toBeNull();
  expect(document.activeElement).toBe(button);
  if (onClose) expect(onClose, 'Escape in the panel must not close the activity').not.toHaveBeenCalled();
}

// ── Glossary view: flash cards and Word Search ──
const view = (props) => React.createElement(window.AlloModules.GlossaryView, props);
const words = () => [
  { entryId: 'leaf', term: 'Leaf', def: 'A plant part that makes food.', tier: 'Academic' },
  { entryId: 'root', term: 'Root', def: 'The part of a plant under the ground.', tier: 'Domain-Specific' },
];
const noop = () => {};
function flashcards(extra = {}) {
  const data = words();
  return view(glossaryMediaProps({
    isInteractiveFlashcards: true, generatedContent: { id: 'deck', type: 'glossary', data },
    filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })),
    flashcardIndex: 0, setFlashcardIndex: noop, setQuizSelectedOption: noop, setFlashcardFeedback: noop, setFlashcardScore: noop,
    setFlashcardOptions: noop, setIsFlashcardFlipped: noop, setIsFlashcardQuizMode: noop, setStandardDeckLang: noop, ...extra,
  }));
}
const flashcardDialog = (container) => container.querySelector('[role="dialog"][aria-modal="true"]');
function wordSearch(extra = {}) {
  return view(glossaryMediaProps({
    gameMode: 'wordsearch', handleSetGameModeToNull: noop,
    gameData: { grid: [['L', 'E', 'A', 'F'], ['R', 'O', 'O', 'T']], words: ['LEAF', 'ROOT'], solutions: [], wordLocations: {}, isRtl: false },
    ...extra,
  }));
}
const wordSearchCard = (container) => container.querySelector('[id="word-search-grid"]').closest('.border-teal-200');

describe('flash cards: the Aa button', () => {
  it('is absent without the host bridge, and a missing font library does not crash the deck', () => {
    const { container } = mount(flashcards());
    expect(flashcardDialog(container), 'the deck opened').toBeTruthy();
    expect(aaButtons(container)).toEqual([]);
    expect(container.querySelector('[aria-label="Reading settings"]')).toBeNull();
    installBridge();
    const saved = window.AlloModules.UIFontLibrary;
    delete window.AlloModules.UIFontLibrary;
    try {
      expect(aaButtons(mount(flashcards()).container)).toEqual([]);
    } finally { window.AlloModules.UIFontLibrary = saved; }
  });

  it('with the bridge: one "Reading settings" button beside Close in the dialog, label from the pack', () => {
    installBridge();
    const { container } = mount(flashcards());
    const button = readingButton(container);
    expect(flashcardDialog(container).contains(button)).toBe(true);
    expect(button.nextElementSibling.getAttribute('aria-label'), 'next to Close').toBe('common.close');
    const t = (k) => (k === 'reading_settings.title' ? 'Ajustes de lectura' : k);
    expect(aaButtons(mount(flashcards({ t })).container)[0].getAttribute('aria-label')).toBe('Ajustes de lectura');
  });

  it('opens the panel inside the flash-card dialog; Escape closes the panel, not the deck; changes reach the host', () => {
    const bridge = installBridge();
    const closeDeck = vi.fn();
    const { container } = mount(flashcards({ closeInteractiveFlashcards: closeDeck }));
    const button = readingButton(container);
    expectPanelInside(button, flashcardDialog(container), closeDeck);
    click(button);
    const larger = [...openPanel().querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Larger text');
    click(larger);
    expect(bridge.set).toHaveBeenLastCalledWith({ baseFontSize: 17 });
  });

  it('closing the deck with the panel open closes the panel too (no leftover subscription)', () => {
    const bridge = installBridge();
    const { container, unmount } = mount(flashcards());
    click(readingButton(container));
    expect(bridge.live, 'the open panel follows the settings').toBe(1);
    unmount();
    expect(bridge.live, 'unsubscribed when the deck closed').toBe(0);
    expect(openPanel()).toBeNull();
  });
});

describe('flash cards: reading text follows the text size', () => {
  it('the back of a card is in rem: definition label, provenance note, dictionary source; nothing in px', () => {
    window.AlloDictionary = { getCached: () => ({ word: 'leaf', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A flat green part of a plant.' }] }], source: 'Wiktionary' }), pickSense: () => null };
    const { container } = mount(flashcards({ isFlashcardFlipped: true }));
    const dialog = flashcardDialog(container);
    const label = withText(dialog, 'p', 'flashcards.back_label_def');
    expect(label, 'the definition label').toBeTruthy();
    expect(label.className.split(/\s+/)).toContain('text-[0.625rem]');
    const provenance = [...dialog.querySelectorAll('p')].find((p) => p.textContent.startsWith('Provenance:'));
    expect(provenance.className.split(/\s+/)).toContain('text-[0.6875rem]');
    const source = [...dialog.querySelectorAll('details')].find((d) => d.textContent.includes('Wiktionary') && d.className.includes('border-t'));
    expect(source, 'the dictionary source note').toBeTruthy();
    expect(source.className.split(/\s+/)).toContain('text-[0.6875rem]');
    expect(pxText(dialog), 'pixel-locked text in the flash-card dialog').toEqual([]);
  });
});

// 2026-10-27 review backlog: a dictionary sense that was not matched to the lesson's
// definition must not be presented as the lesson's meaning. Uses the real matchers.
describe('flash cards: dictionary sense provenance', () => {
  function backWith(meanings, def = 'A plant part that makes food.') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    new Function(readFileSync(REPO + '/dictionary_loader.js', 'utf8'))();
    window.AlloDictionary.getCached = () => ({ word: 'leaf', meanings: [{ partOfSpeech: 'noun', definitions: meanings.map((definition) => ({ definition })) }], source: 'Wiktionary' });
    const data = words().map((w, i) => (i === 0 ? { ...w, def } : w));
    const { container } = mount(flashcards({ isFlashcardFlipped: true, generatedContent: { id: 'deck', type: 'glossary', data }, filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })) }));
    const dialog = flashcardDialog(container);
    const box = [...dialog.querySelectorAll('details')].find((d) => d.className.includes('bg-white/10'));
    expect(box, 'the dictionary box').toBeTruthy();
    return { heading: box.querySelector('summary').textContent, text: box.textContent, note: box.querySelector('[data-dict-sense-unmatched]') };
  }
  const UNMATCHED = 'Dictionary meaning (not matched to this lesson)';

  it('a sense that matches the lesson definition is shown as verified', () => {
    const r = backWith(['A sheet of paper in a book.', 'The flat green part of a plant that makes food from sunlight.']);
    expect(r.heading).toBe('Verified dictionary');
    expect(r.text).toContain('makes food from sunlight');
    expect(r.note).toBeNull();
  });
  it('no matching sense: the first sense is labelled as not matched to the lesson', () => {
    const r = backWith(['A sheet of paper in a book.', 'To turn pages quickly.']);
    expect(r.heading).toBe(UNMATCHED);
    expect(r.text).toContain('A sheet of paper in a book.');
    expect(r.note, 'the unmatched-sense note').toBeTruthy();
  });
  it('a tie between senses is not a match', () => {
    const r = backWith(['A plant hormone.', 'Plant tissue in general.']);
    expect(r.heading).toBe(UNMATCHED);
  });
  it('a card with no lesson definition is not called matched', () => {
    const r = backWith(['A sheet of paper in a book.'], '');
    expect(r.heading).toBe(UNMATCHED);
  });
});

describe('Word Search: the Aa button and its text', () => {
  it('only with the bridge; beside Close in the header; opens the panel; Close still closes', () => {
    expect(aaButtons(mount(wordSearch()).container)).toEqual([]);
    installBridge();
    const closeSearch = vi.fn();
    const { container } = mount(wordSearch({ handleSetGameModeToNull: closeSearch }));
    const button = readingButton(container);
    expect(wordSearchCard(container).contains(button)).toBe(true);
    expect(button.nextElementSibling.getAttribute('aria-label'), 'next to Close').toBe('common.close');
    expectPanelInside(button, document.body, closeSearch);
    click(button.nextElementSibling);
    expect(closeSearch, 'Close still closes the search').toHaveBeenCalledTimes(1);
  });

  it('the grid and word list are in rem', () => {
    const { container } = mount(wordSearch());
    const card = wordSearchCard(container);
    expect(pxText(card)).toEqual([]);
    expect(withText(card, 'span', 'LEAF').className.split(/\s+/)).toContain('text-sm');
  });
});

// ── Games ──
const DATA = [
  { term: 'Leaf', def: 'A plant part that makes food.' },
  { term: 'Root', def: 'The part of a plant under the ground.' },
  { term: 'Stem', def: 'Holds the plant up.' },
  { term: 'Seed', def: 'Grows into a new plant.' },
  { term: 'Flower', def: 'Makes the seeds.' },
];
const BINGO_CARD = Array.from({ length: 25 }, (_, i) => (i === 12 ? { type: 'free' } : { type: 'term', term: DATA[i % 5].term }));
const classesOf = (el) => (el ? el.className.split(/\s+/) : []);
const GAMES = {
  MemoryGame: { props: {}, fullScreen: (c) => click(c.querySelector('[data-help-key="memory_fullscreen_btn"]')), rem: (c) => classesOf(withText(c, 'p', DATA[0].def)) },
  MatchingGame: {
    props: {},
    rem: (c) => {
      const select = c.querySelector('select[aria-describedby="matching-mode-help"]');
      act(() => { select.value = 'pictures'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      return classesOf([...c.querySelectorAll('span')].find((s) => s.textContent === 'Definition clue'));
    },
  },
  CrosswordGame: { props: {}, rem: (c) => classesOf([...c.querySelectorAll('[role="gridcell"] span')].find((s) => s.textContent === '1')) },
  BingoGame: {
    props: { settings: { cardCount: 1, includeImages: false }, setSettings: noop, onGenerate: noop, bingoState: { cards: [BINGO_CARD] }, setBingoState: noop },
    rem: (c) => classesOf(withText(c, 'span', 'Leaf')?.parentElement),
  },
  StudentBingoGame: { props: {}, rem: (c) => classesOf(withText(c, 'span', 'Leaf')) },
  WordScrambleGame: { props: {} },
  DefinitionDetectiveGame: { props: {} },
};
function mountGame(name, extra = {}) {
  const onClose = vi.fn();
  const element = React.createElement(window.AlloModules[name], { data: DATA, onClose, playSound: noop, ...GAMES[name].props, ...extra });
  return { ...mount(element), onClose };
}
const gameDialog = (container) => container.querySelector('[role="dialog"][aria-modal="true"]');

describe.each(Object.keys(GAMES))('%s', (name) => {
  it('no Aa without the host bridge', () => {
    const { container } = mountGame(name);
    expect(container.querySelectorAll('button').length, 'the game rendered its controls').toBeGreaterThan(0);
    expect(aaButtons(container)).toEqual([]);
  });

  it('with the bridge: "Reading settings" beside Close opens the panel inside the game; Escape leaves the game open', () => {
    installBridge();
    const { container, onClose } = mountGame(name);
    if (GAMES[name].fullScreen) GAMES[name].fullScreen(container);
    const button = readingButton(container);
    const close = button.nextElementSibling;
    expect(close.tagName).toBe('BUTTON');
    expect(/close/i.test(close.getAttribute('aria-label') || ''), 'next to Close: ' + close.getAttribute('aria-label')).toBe(true);
    const dialog = gameDialog(container);
    expect(dialog && dialog.contains(button), 'inside the game dialog').toBe(true);
    expectPanelInside(button, dialog, onClose);
  });

  it('closing the game with the panel open closes the panel', () => {
    const bridge = installBridge();
    const { container, unmount } = mountGame(name);
    click(aaButtons(container)[0]);
    expect(bridge.live).toBe(1);
    unmount();
    expect(bridge.live).toBe(0);
  });

  it('the label comes from the language pack', () => {
    installBridge();
    const t = (k) => (k === 'reading_settings.title' ? 'Ajustes de lectura' : k);
    const game = React.createElement(window.AlloModules[name], { data: DATA, onClose: noop, playSound: noop, ...GAMES[name].props });
    const { container } = mount(React.createElement(window.AlloLanguageContext.Provider, { value: { t } }, game));
    expect(aaButtons(container)[0].getAttribute('aria-label')).toBe('Ajustes de lectura');
  });

  it('reading text is in rem; nothing in the game is sized in px', () => {
    const { container } = mountGame(name);
    if (GAMES[name].rem) {
      const classes = GAMES[name].rem(container);
      expect(classes.some((c) => /^(sm:)?text-\[0\.\d+rem\]$/.test(c)), 'key text in rem: ' + classes.join(' ')).toBe(true);
    }
    expect(pxText(container), 'pixel-locked text').toEqual([]);
  });
});

describe('Memory outside full screen', () => {
  it('opens the panel on the page (no dialog to hold it) and still leaves the game open', () => {
    installBridge();
    const { container, onClose } = mountGame('MemoryGame');
    expect(gameDialog(container), 'not full screen').toBeNull();
    expectPanelInside(readingButton(container), document.body, onClose);
  });
});
