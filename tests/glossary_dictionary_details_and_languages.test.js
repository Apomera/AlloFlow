// Glossary without AI, display side (lane glossaryB, 2026-11-23):
//  - a quiet dictionary-details line (syllables with stress, part of speech) for English entries,
//  - "Other meanings (N)" inside the card back's dictionary fold,
//  - one dictionary credit line for glossaries with dictionary-made definitions,
//  - "Check meaning" (teachers) and "Add a definition" on entries,
//  - "Add a language": a hand-typed translation column that flows into every language consumer.
// Runs the built modules with the real Word Sounds syllable/stress data and a fake dictionary bank.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require(REPO + '/tests/helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.React = React;
  new Function(readFileSync(REPO + '/syllable_table_en.js', 'utf8'))();
  new Function(readFileSync(REPO + '/word_sounds_pronunciations.js', 'utf8'))();
  new Function(readFileSync(DIR + '/games_module.js', 'utf8'))();
  new Function(readFileSync(DIR + '/export_module.js', 'utf8'))();
  new Function(readFileSync(DIR + '/view_glossary_module.js', 'utf8'))();
}, 60000);

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  delete window.AlloVocabBank;
  delete window.AlloDictionary;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const sense = (word, pos, def, checked = 'good', example = '') => ({ word, pos, def, example, checked, source: 'simple' });
const SENSES = {
  leaf: [
    sense('leaf', 'noun', 'The flat green part of a plant that makes food from sunlight.', 'good', 'The leaf fell.'),
    sense('leaf', 'noun', 'A sheet of paper in a book.', 'good', 'He tore a leaf out of the diary in the news story.'),
    sense('leaf', 'verb', 'To turn pages without reading closely.', ''),
    sense('leaf', 'verb', 'If you ___ through a book, you turn its pages quickly.', 'fixed'),
    sense('leaf', 'noun', 'A very thin sheet of gold or silver metal.', 'good'),
    sense('leaf', 'noun', 'A part of a table top that can be folded down.', 'good'),
  ],
  habitat: [sense('habitat', 'noun', 'The natural home of an animal or plant.'), sense('habitat', 'noun', 'A place where something is usually found.')],
  record: [sense('record', 'noun', 'A written account of something.'), sense('record', 'verb', 'To write something down so it is kept.')],
  bank: [sense('bank', 'noun', 'A business that keeps money.'), sense('bank', 'noun', 'The land beside a river.'), sense('bank', 'noun', 'A row of things.', '')],
};
function installBank(extra = {}) {
  window.AlloVocabBank = {
    ready: () => true, has: (w) => !!SENSES[String(w).toLowerCase()],
    senses: (w) => (SENSES[String(w).toLowerCase()] || []).slice(),
    ensureForWords: () => Promise.resolve(true), ...extra,
  };
}

function mount(element) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  act(() => root.render(element));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
  return { container, rerender: (next) => act(() => root.render(next)) };
}
const view = (props) => React.createElement(window.AlloModules.GlossaryView, props);
const rows = (data) => data.map((item, i) => ({ ...item, _originalIdx: i }));
const glossary = (data, extra = {}) => ({ id: 'g', type: 'glossary', language: 'English', data, ...extra });
function tableProps(data, extra = {}, resource = {}) {
  return glossaryMediaProps({ generatedContent: glossary(data, resource), filteredGlossaryData: rows(data), displayLanguages: [], selectedLanguages: [], ...extra });
}
const rowOf = (container, id) => container.querySelector('tr[data-glossary-entry-key="entry:' + id + '"]');
const detailsOf = (root) => root && root.querySelector('[data-glossary-details]');
const click = (el) => { expect(el).toBeTruthy(); act(() => { el.click(); }); };
function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  act(() => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}

describe('dictionary details line', () => {
  it('table: syllables with the stressed syllable in bold, then the entry\'s part of speech', () => {
    const data = [{ entryId: 'a', term: 'Analyze', def: 'To study something closely.', tier: 'Academic', pos: 'verb' }];
    const { container } = mount(view(tableProps(data)));
    const line = detailsOf(rowOf(container, 'a').querySelector('td[data-glossary-term]'));
    expect(line, 'the details line under the term').toBeTruthy();
    expect(line.textContent.replace(/\s+/g, ' ').trim()).toBe('An·a·lyze · verb');
    const syllables = line.querySelector('[data-glossary-syllables]');
    expect(syllables.getAttribute('lang')).toBe('en');
    expect([...syllables.querySelectorAll('span.font-bold')].map((s) => s.textContent), 'stress from the pronunciation data').toEqual(['An']);
    expect(line.querySelector('[data-glossary-pos]').textContent).toBe('verb');
    // The dots are decoration: a screen reader hears the word, not "dot".
    expect([...line.querySelectorAll('[aria-hidden="true"]')].every((s) => s.textContent === '·')).toBe(true);
  });

  it('two pronunciations (record): syllables without a stress guess; two parts of speech: no part of speech', () => {
    installBank();
    const data = [{ entryId: 'r', term: 'record', def: 'A written account.', tier: 'Academic' }];
    const line = detailsOf(rowOf(mount(view(tableProps(data))).container, 'r'));
    expect(line.textContent.trim()).toBe('rec·ord');
    expect(line.querySelector('span.font-bold')).toBeNull();
    expect(line.querySelector('[data-glossary-pos]'), 'never guesses between noun and verb').toBeNull();
  });

  it('old glossary without pos: the dictionary\'s only part of speech is shown', () => {
    installBank();
    const data = [{ entryId: 'h', term: 'habitat', def: 'Where an animal lives.', tier: 'Domain-Specific' }];
    const line = detailsOf(rowOf(mount(view(tableProps(data))).container, 'h'));
    expect(line.textContent.replace(/\s+/g, ' ').trim()).toBe('hab·i·tat · noun');
  });

  it('multi-word term: no syllables, the part of speech alone; nothing known: no line at all', () => {
    const data = [
      { entryId: 'f', term: 'food chain', def: 'Who eats whom.', tier: 'Domain-Specific', pos: 'noun' },
      { entryId: 'z', term: 'Zzqxv', def: 'Not a word.', tier: 'Academic' },
      { entryId: 'l', term: 'leaf', def: 'A plant part.', tier: 'Academic' },
    ];
    const { container } = mount(view(tableProps(data)));
    const food = detailsOf(rowOf(container, 'f'));
    expect(food.querySelector('[data-glossary-syllables]')).toBeNull();
    expect(food.textContent.trim()).toBe('noun');
    expect(detailsOf(rowOf(container, 'z')), 'no empty line').toBeNull();
    expect(detailsOf(rowOf(container, 'l')), 'one syllable and no dictionary: nothing to add').toBeNull();
  });

  it('the shared data loads lazily after the first paint, through the app\'s plugin loader, only for English glossaries', async () => {
    const table = window.AlloModules.SyllableTableEn;
    delete window.AlloModules.SyllableTableEn;
    const load = vi.fn((file) => { if (file === 'syllable_table_en.js') window.AlloModules.SyllableTableEn = table; return Promise.resolve(true); });
    window.__alloLoadPlugin = load;
    cleanups.push(() => { delete window.__alloLoadPlugin; window.AlloModules.SyllableTableEn = table; });
    const data = [{ entryId: 'a', term: 'Analyze', def: 'To study something closely.', tier: 'Academic', pos: 'verb' }];
    const spanish = mount(view(tableProps(data, {}, { baseLanguage: 'Spanish' })));
    const { container } = mount(view(tableProps(data)));
    expect(detailsOf(container).textContent.trim(), 'first paint: what is known now').toBe('verb');
    expect(load, 'nothing loads during render').not.toHaveBeenCalled();
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(load.mock.calls.map((c) => c[0]), 'an AI glossary: syllables and the small stress add-on, never the 1.7 MB dictionary bank').toEqual(['syllable_table_en.js', 'syllable_stress_en.js']);
    expect(detailsOf(container).textContent.replace(/\s+/g, ' ').trim(), 'syllables once the table arrives').toBe('An·a·lyze · verb');
    expect(detailsOf(spanish.container)).toBeNull();
    load.mockClear();
    mount(view(tableProps([{ ...data[0], defSource: 'dictionary', dictSense: { word: 'analyze', index: 0, total: 1 } }])));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(load.mock.calls.map((c) => c[0]).sort(), 'a dictionary glossary loads the bank (and the loader that reads it)').toEqual(['dictionary_loader.js', 'packets_vocab_bank_en.js', 'syllable_stress_en.js']);
  });

  it('never downloads the pronunciation data: syllables without stress unless Word Sounds already has it', async () => {
    const pron = window.AlloModules.WordSoundsPronunciations;
    delete window.AlloModules.WordSoundsPronunciations;
    const load = vi.fn(() => Promise.resolve(true));
    window.__alloLoadPlugin = load;
    cleanups.push(() => { delete window.__alloLoadPlugin; window.AlloModules.WordSoundsPronunciations = pron; });
    const data = [{ entryId: 'a', term: 'Analyze', def: 'To study something closely.', tier: 'Academic', pos: 'verb' }];
    const { container } = mount(view(tableProps(data)));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(load.mock.calls.map((c) => c[0]), 'syllable table present: only the small stress add-on; pronunciations never fetched').toEqual(['syllable_stress_en.js']);
    const line = detailsOf(container);
    expect(line.textContent.replace(/\s+/g, ' ').trim()).toBe('An·a·lyze · verb');
    expect(line.querySelector('span.font-bold'), 'no stress without the data').toBeNull();
  });

  it('reuses a pronunciation or syllable load another module already started', async () => {
    const pron = window.AlloModules.WordSoundsPronunciations, table = window.AlloModules.SyllableTableEn;
    delete window.AlloModules.WordSoundsPronunciations; delete window.AlloModules.SyllableTableEn;
    const script = document.createElement('script');
    script.setAttribute('data-allo-syllable-table', '1');
    document.head.append(script);
    window.__alloSyllablePronunciationLoad = Promise.resolve().then(() => { window.AlloModules.WordSoundsPronunciations = pron; return true; });
    const load = vi.fn(() => Promise.resolve(true));
    window.__alloLoadPlugin = load;
    cleanups.push(() => { script.remove(); delete window.__alloSyllablePronunciationLoad; delete window.__alloLoadPlugin; window.AlloModules.WordSoundsPronunciations = pron; window.AlloModules.SyllableTableEn = table; });
    const data = [{ entryId: 'a', term: 'Analyze', def: 'To study something closely.', tier: 'Academic', pos: 'verb' }];
    const { container } = mount(view(tableProps(data)));
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(load.mock.calls.map((c) => c[0]), 'no second copy of either file (only the stress add-on, which nothing else loads)').toEqual(['syllable_stress_en.js']);
    window.AlloModules.SyllableTableEn = table;
    await act(async () => { script.dispatchEvent(new Event('load')); await new Promise((r) => setTimeout(r, 0)); });
    expect(detailsOf(container).textContent.replace(/\s+/g, ' ').trim()).toBe('An·a·lyze · verb');
  });

  it('non-English glossary: no details line even with pos and syllable data', () => {
    const data = [{ entryId: 'a', term: 'Analyze', def: 'Estudiar algo.', tier: 'Academic', pos: 'verb' }];
    const { container } = mount(view(tableProps(data, {}, { baseLanguage: 'Spanish' })));
    expect(detailsOf(container)).toBeNull();
  });

  it('flash cards: on the back (with bionic reading on), never on the front', () => {
    const data = [{ entryId: 'a', term: 'Analyze', def: 'To study something closely.', tier: 'Academic', pos: 'verb' },
      { entryId: 'b', term: 'Habitat', def: 'Home.', tier: 'Academic' }];
    window.__alloUseBionic = () => true;
    window.__alloBionicReact = (s) => React.createElement('span', { 'data-bionic': '1' }, s);
    cleanups.push(() => { delete window.__alloUseBionic; delete window.__alloBionicReact; });
    const props = tableProps(data, { isInteractiveFlashcards: true, isFlashcardFlipped: true, setQuizSelectedOption() {}, setFlashcardFeedback() {}, setFlashcardScore() {}, setFlashcardOptions() {}, setIsFlashcardFlipped() {}, setIsFlashcardQuizMode() {}, setStandardDeckLang() {} });
    const { container } = mount(view(props));
    const dialog = container.querySelector('[role="dialog"][aria-modal="true"]');
    const back = dialog.querySelector('[data-flashcard-face="back"]');
    const front = dialog.querySelector('[data-flashcard-face="front"]');
    expect(detailsOf(front), 'the front is unchanged').toBeNull();
    const line = detailsOf(back);
    expect(line.textContent.replace(/\s+/g, ' ').trim()).toBe('An·a·lyze · verb');
    expect(line.className).toContain('text-blue-50');
    expect(line.querySelector('[data-glossary-pos] [data-bionic]'), 'part of speech follows bionic reading').toBeTruthy();
    expect(line.querySelector('[data-glossary-syllables] [data-bionic]'), 'syllables are never split by bionic reading').toBeNull();
  });
});

function cardBack(item, extraResource = {}) {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  new Function(readFileSync(REPO + '/dictionary_loader.js', 'utf8'))();
  window.AlloDictionary = { ...window.AlloDictionary };
  window.AlloDictionary.getCached = () => ({ word: 'leaf', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The flat green part of a plant that makes food from sunlight.' }, { definition: 'A sheet of paper in a book.' }] }], source: 'Wiktionary' });
  const data = [item, { entryId: 'root', term: 'Root', def: 'The part under the ground.', tier: 'Academic' }];
  const props = tableProps(data, { isInteractiveFlashcards: true, isFlashcardFlipped: true, setQuizSelectedOption() {}, setFlashcardFeedback() {}, setFlashcardScore() {}, setFlashcardOptions() {}, setIsFlashcardFlipped() {}, setIsFlashcardQuizMode() {}, setStandardDeckLang() {} }, extraResource);
  const { container } = mount(view(props));
  const dialog = container.querySelector('[role="dialog"][aria-modal="true"]');
  return { dialog, fold: [...dialog.querySelectorAll('details')].find((d) => d.className.includes('bg-white/10')) };
}

describe('card back: Other meanings', () => {
  const leaf = { entryId: 'leaf', term: 'leaf', def: 'A plant part that makes food from sunlight.', tier: 'Academic' };
  it('a closed disclosure inside the dictionary fold: up to 3 other checked meanings, blanks filled, no examples', () => {
    installBank();
    const { fold } = cardBack(leaf);
    expect(fold, 'the verified dictionary fold').toBeTruthy();
    const other = fold.querySelector('[data-dict-other-meanings]');
    expect(other, 'Other meanings sits inside the same fold').toBeTruthy();
    expect(other.open, 'starts closed').toBe(false);
    expect(other.querySelector('summary').textContent).toBe('Other meanings (3)');
    const items = [...other.querySelectorAll('[data-dict-other-meaning]')].map((li) => li.textContent);
    expect(items).toEqual(['nounA sheet of paper in a book.', 'verbIf you leaf through a book, you turn its pages quickly.', 'nounA very thin sheet of gold or silver metal.']);
    expect(other.textContent, 'unchecked senses are left out').not.toContain('without reading closely');
    expect(other.textContent, 'the sense the fold already shows is not repeated').not.toContain('makes food from sunlight');
    expect(other.textContent, 'no example sentences').not.toContain('diary');
    expect(other.textContent).not.toContain('___');
  });
  it('a dictionary-made entry skips its own sense by index', () => {
    installBank();
    const item = { ...leaf, def: 'A sheet of paper in a book.', defSource: 'dictionary', dictSense: { word: 'leaf', index: 1, total: 6 } };
    const other = cardBack(item).fold.querySelector('[data-dict-other-meanings]');
    expect(other.textContent).not.toContain('sheet of paper in a book');
  });
  it('an AI glossary fetches the bank only once the card back shows its dictionary fold open', async () => {
    const load = vi.fn(() => Promise.resolve(true));
    window.__alloLoadPlugin = load;
    cleanups.push(() => { delete window.__alloLoadPlugin; });
    const { fold } = cardBack(leaf);
    expect(fold.open).toBe(true);
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(load.mock.calls.map((c) => c[0])).toContain('packets_vocab_bank_en.js');
  });
  it('hidden when the dictionary has no other checked meaning, or no bank is loaded', () => {
    installBank({ senses: () => [sense('leaf', 'noun', 'The flat green part of a plant that makes food from sunlight.'), sense('leaf', 'verb', 'To turn pages.', '')] });
    expect(cardBack(leaf).fold.querySelector('[data-dict-other-meanings]')).toBeNull();
    delete window.AlloVocabBank;
    expect(cardBack(leaf).fold.querySelector('[data-dict-other-meanings]')).toBeNull();
  });
});

describe('dictionary credit', () => {
  const dictWord = { entryId: 'h', term: 'habitat', def: 'The natural home of an animal or plant.', tier: 'Domain-Specific', pos: 'noun', defSource: 'dictionary', dictSense: { word: 'habitat', index: 0, total: 2 } };
  const aiWord = { entryId: 'r', term: 'Root', def: 'The part under the ground.', tier: 'Academic' };
  it('one credit line under the table when any definition came from the dictionary, with source and licence links', () => {
    const { container } = mount(view(tableProps([dictWord, aiWord])));
    const credits = container.querySelectorAll('[data-glossary-dictionary-credit]');
    expect(credits, 'one line for the whole glossary').toHaveLength(1);
    expect(credits[0].closest('[data-glossary-word-list]'), 'outside the scrolling table').toBeNull();
    expect(credits[0].textContent).toBe('Some definitions are adapted from Wiktionary (CC BY-SA 4.0) · Open English WordNet (CC BY 4.0).');
    expect([...credits[0].querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://en.wiktionary.org', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://en-word.net', 'https://creativecommons.org/licenses/by/4.0/']);
    expect([...credits[0].querySelectorAll('a')].every((a) => a.target === '_blank' && /noopener/.test(a.rel))).toBe(true);
  });
  it('a teacher-edited dictionary definition keeps the credit; a glossary without dictionary text has none', () => {
    expect(mount(view(tableProps([{ ...dictWord, defSource: 'dictionary-edited' }]))).container.querySelector('[data-glossary-dictionary-credit]')).toBeTruthy();
    expect(mount(view(tableProps([aiWord]))).container.querySelector('[data-glossary-dictionary-credit]')).toBeNull();
  });
  it('the card back of a dictionary-made entry carries the credit under its provenance note', () => {
    const { dialog } = cardBack({ ...dictWord, entryId: 'leaf', term: 'leaf' });
    const credit = dialog.querySelector('[data-flashcard-face="back"] [data-glossary-dictionary-credit]');
    expect(credit).toBeTruthy();
    expect(credit.previousElementSibling.textContent).toMatch(/^Provenance:/);
  });
});

// A tiny host: keeps the resource in state and applies onUpdateResource / handleGlossaryChange
// the way AlloFlowANTI and host_handlers do.
function Host({ initial, extra = {}, spy, onState }) {
  const [resource, setResource] = React.useState(initial);
  onState && onState(resource);
  const onUpdateResource = (id, updater, options) => {
    spy && spy(id, updater, options);
    setResource((prev) => { const next = updater(prev); return next && next !== prev ? { ...next, id: prev.id, type: prev.type } : prev; });
    return true;
  };
  const handleGlossaryChange = (index, field, value, lang) => setResource((prev) => {
    const data = prev.data.slice(); const item = { ...data[index] };
    if (lang) item.translations = { ...item.translations, [lang]: value }; else item[field] = value;
    data[index] = item; return { ...prev, data };
  });
  const displayLanguages = Array.from(new Set(resource.data.flatMap((item) => Object.keys(item.translations || {}))));
  return view(glossaryMediaProps({
    generatedContent: resource, filteredGlossaryData: rows(resource.data), displayLanguages, selectedLanguages: ['Spanish', 'Somali'],
    onUpdateResource, handleGlossaryChange, ErrorBoundary: ({ children }) => children, CrosswordGame: window.AlloModules.CrosswordGame,
    handleExportFlashcards() {}, launchInteractiveFlashcards() {}, generateWordSearch() {}, setWordSearchLang() {}, ...extra,
  }));
}

describe('Check meaning and Add a definition', () => {
  const bankWord = { entryId: 'b', term: 'bank', def: 'A business that keeps money.', tier: 'Academic', pos: 'noun', defSource: 'dictionary', dictSense: { word: 'bank', index: 0, total: 3 }, senseCheck: true, example: 'She went to the bank.' };
  it('teachers see it on senseCheck entries; students do not', () => {
    installBank();
    expect(mount(view(tableProps([bankWord], { isTeacherMode: false, onUpdateResource() {} }))).container.querySelector('[data-glossary-check-meaning]')).toBeNull();
    expect(mount(view(tableProps([{ ...bankWord, senseCheck: false }], { onUpdateResource() {} }))).container.querySelector('[data-glossary-check-meaning]')).toBeNull();
    expect(mount(view(tableProps([bankWord], { onUpdateResource() {} }))).container.querySelector('[data-glossary-check-meaning]')).toBeTruthy();
  });
  it('opens the checked senses (part of speech + definition); a choice replaces def, pos, example and dictSense and clears senseCheck', () => {
    installBank();
    let state = null;
    const spy = vi.fn();
    const { container } = mount(React.createElement(Host, { initial: glossary([bankWord]), spy, onState: (s) => { state = s; } }));
    const button = container.querySelector('[data-glossary-check-meaning="entry:b"]');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const panel = container.querySelector('#' + button.getAttribute('aria-controls'));
    const choices = [...panel.querySelectorAll('[data-glossary-sense-choice]')];
    expect(choices.map((c) => c.textContent)).toEqual(['nounA business that keeps money.', 'nounThe land beside a river.']);
    click(choices[1]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][2]).toEqual({ instanceId: '' });
    const row = state.data[0];
    expect(row).toMatchObject({ def: 'The land beside a river.', pos: 'noun', dictSense: { word: 'bank', index: 1, total: 3 }, defSource: 'dictionary' });
    expect(row.senseCheck).toBeUndefined();
    expect(row.example, 'the old sense\'s example is not kept').toBeUndefined();
    expect(container.querySelector('[data-glossary-check-meaning]'), 'done: the control goes away').toBeNull();
  });
  it('a phrase entry offers the phrase senses; a blank at the start of a meaning is filled with a capital', () => {
    installBank({ phraseSenses: (p) => (p === 'food chain' ? [sense('food chain', 'noun', 'A series of living things that eat one another.'), sense('food chain', 'noun', '___ is a ranking of power in a group.')] : []) });
    const item = { entryId: 'fc', term: 'food chain', def: 'A series of living things that eat one another.', tier: 'Domain-Specific', pos: 'noun', defSource: 'dictionary', dictSense: { word: 'food chain', index: 0, total: 2, phrase: true }, senseCheck: true };
    let state = null;
    const { container } = mount(React.createElement(Host, { initial: glossary([item]), onState: (s) => { state = s; } }));
    click(container.querySelector('[data-glossary-check-meaning="entry:fc"]'));
    const choices = [...container.querySelectorAll('[data-glossary-sense-choice]')];
    expect(choices.map((c) => c.textContent)).toEqual(['nounA series of living things that eat one another.', 'nounFood chain is a ranking of power in a group.']);
    click(choices[1]);
    expect(state.data[0].def).toBe('Food chain is a ranking of power in a group.');
    expect(state.data[0].dictSense).toEqual({ word: 'food chain', index: 1, total: 2, phrase: true });
  });
  it('the dictionary has no checked meaning: the panel says so (after the load settles) instead of an empty list', async () => {
    installBank({ senses: () => [sense('bank', 'noun', 'A business that keeps money.', '')] });
    const { container } = mount(view(tableProps([bankWord], { onUpdateResource() {} })));
    click(container.querySelector('[data-glossary-check-meaning]'));
    expect(container.querySelector('[data-glossary-sense-choices]').textContent, 'while the bank is checked for the word').toBe('Loading the dictionary…');
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(container.querySelector('[data-glossary-sense-choices]').textContent).toBe('The dictionary has no checked meanings for this word. You can edit the definition instead.');
  });
  it('an entry without a definition shows "Add a definition", which opens Edit on that entry\'s definition', () => {
    const toggle = vi.fn();
    // dictMissing is lane glossaryA's flag for a word the dictionary does not have (def left empty).
    const data = [{ entryId: 'w', term: 'watershed', def: '', tier: 'Domain-Specific', pos: '', dictMissing: true },{ entryId: 'x', term: 'Root', def: 'Under the ground.', tier: 'Academic' }];
    const { container, rerender } = mount(view(tableProps(data, { handleToggleIsEditingGlossary: toggle })));
    expect(container.querySelectorAll('[data-glossary-add-definition]')).toHaveLength(1);
    expect(mount(view(tableProps(data, { isTeacherMode: false }))).container.querySelector('[data-glossary-add-definition]'), 'students: no control').toBeNull();
    click(container.querySelector('[data-glossary-add-definition="entry:w"]'));
    expect(toggle).toHaveBeenCalledTimes(1);
    rerender(view(tableProps(data, { handleToggleIsEditingGlossary: toggle, isEditingGlossary: true })));
    expect(document.activeElement, 'the definition field of that entry').toBe(rowOf(container, 'w').querySelector('td[data-glossary-definition] textarea'));
  });
  it('editing a dictionary definition marks it dictionary-edited (credit stays)', () => {
    let state = null;
    const word = { entryId: 'h', term: 'habitat', def: 'The natural home of an animal.', tier: 'Academic', defSource: 'dictionary' };
    const { container } = mount(React.createElement(Host, { initial: glossary([word]), extra: { isEditingGlossary: true }, onState: (s) => { state = s; } }));
    type(rowOf(container, 'h').querySelector('td[data-glossary-definition] textarea'), 'Where an animal lives.');
    expect(state.data[0]).toMatchObject({ def: 'Where an animal lives.', defSource: 'dictionary-edited' });
    expect(container.querySelector('[data-glossary-dictionary-credit]')).toBeTruthy();
  });
});

describe('Add a language (hand-typed column)', () => {
  const data = () => [{ entryId: 'leaf', term: 'Leaf', def: 'A plant part.', tier: 'Academic' }, { entryId: 'root', term: 'Root', def: 'Under the ground.', tier: 'Academic' }];
  const headers = (container) => [...container.querySelectorAll('[data-glossary-word-list] thead th')].map((th) => th.textContent);
  function addSpanish(container) {
    const bar = container.querySelector('[data-glossary-add-language]');
    expect(bar, 'the control in Edit').toBeTruthy();
    const input = bar.querySelector('input');
    expect(input.getAttribute('aria-label'), 'the app\'s language-picker wording').toBe('Add a language (e.g., Spanish)');
    expect(input.getAttribute('list'), 'suggests the teacher\'s languages').toBe('glossary-language-suggestions');
    type(input, 'Spanish');
    click(bar.querySelector('[data-glossary-add-language-submit]'));
  }
  it('only in Edit, only for teachers', () => {
    expect(mount(React.createElement(Host, { initial: glossary(data()) })).container.querySelector('[data-glossary-add-language]')).toBeNull();
    expect(mount(React.createElement(Host, { initial: glossary(data()), extra: { isEditingGlossary: true, isTeacherMode: false } })).container.querySelector('[data-glossary-add-language]')).toBeNull();
  });
  it('adds an empty column with a format placeholder; the typed cell reaches the Language deck, exports, Word Search and Crossword', () => {
    let state = null;
    const host = (extra) => React.createElement(Host, { initial: glossary(data()), extra, onState: (s) => { state = s; } });
    const { container, rerender } = mount(host({ isEditingGlossary: true }));
    addSpanish(container);
    expect(state.addedLanguages).toEqual(['Spanish']);
    expect(state.data.every((item) => !item.translations), 'no empty strings written into the entries').toBe(true);
    expect(headers(container)).toContain('Spanish');
    const cell = rowOf(container, 'leaf').querySelector('td[data-glossary-translation] textarea');
    expect(cell.getAttribute('placeholder')).toBe('Word: meaning');
    expect(rowOf(container, 'leaf').querySelector('[data-glossary-translation-status="missing"]'), 'missing badge as today').toBeTruthy();
    expect(container.querySelector('[data-help-key="glossary_language_flashcards"]'), 'nothing to study yet').toBeNull();
    expect(container.querySelector('[data-glossary-remove-language="Spanish"]'), 'an empty added column can be removed').toBeTruthy();

    type(cell, 'Hoja: Una parte de la planta.');
    expect(state.data[0].translations).toEqual({ Spanish: 'Hoja: Una parte de la planta.' });
    expect(container.querySelector('[data-glossary-remove-language]'), 'a column with content is not removed here').toBeNull();
    expect(container.querySelector('[data-help-key="glossary_language_flashcards"]'), 'Language deck').toBeTruthy();
    expect(container.querySelector('[data-help-key="glossary_export_language"]'), 'language flashcard export').toBeTruthy();
    click(container.querySelector('[data-glossary-tools-toggle]'));
    click(container.querySelector('[aria-controls="glossary-games-tools"]'));
    const wordSearch = container.querySelector('select[aria-label="Word Search language"]');
    expect([...wordSearch.options].map((o) => o.value)).toEqual(['English', 'Spanish']);

    rerender(host({ isCrosswordGame: true }));
    const crossword = [...container.querySelectorAll('select')].find((s) => s !== wordSearch && s.isConnected && [...s.options].some((o) => o.value === 'Spanish'));
    expect(crossword && [...crossword.options].map((o) => o.value), 'Crossword language choice').toEqual(['English', 'Spanish']);

    const files = [];
    vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const api = window.AlloModules.createExport({ liveRef: { current: { generatedContent: state, t: (k) => k, addToast() {} } }, escapeXml: (s) => String(s) });
    expect(api.handleExportGlossaryFile('csv')).toBe(true);
    const lines = files[0].text.slice(1).split('\r\n');
    expect(lines[0], 'word-list export column').toBe('Term,Definition,Tier,Spanish');
    expect(lines[1]).toContain('Hoja: Una parte de la planta.');
  });
  it('an empty added column can be removed again; the same language twice is refused', () => {
    let state = null;
    const { container } = mount(React.createElement(Host, { initial: glossary(data()), extra: { isEditingGlossary: true }, onState: (s) => { state = s; } }));
    addSpanish(container);
    addSpanish(container);
    expect(state.addedLanguages, 'no duplicate column').toEqual(['Spanish']);
    expect(container.querySelector('[data-glossary-undo-status]').textContent).toBe('This glossary already has a Spanish column.');
    type(rowOf(container, 'leaf').querySelector('td[data-glossary-translation] textarea'), 'x');
    type(rowOf(container, 'leaf').querySelector('td[data-glossary-translation] textarea'), '');
    click(container.querySelector('[data-glossary-remove-language="Spanish"]'));
    expect(state.addedLanguages).toBeUndefined();
    expect(state.data[0].translations, 'the cleared cell key goes too').toBeUndefined();
    expect(headers(container)).not.toContain('Spanish');
  });
});

describe('dictionary credit travels with exports', () => {
  const CREDIT = 'Some definitions are adapted from Wiktionary, https://en.wiktionary.org (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/) · Open English WordNet, https://en-word.net (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/).';
  const dictWord = { entryId: 'h', term: 'habitat', def: 'The natural home of an animal or plant.', tier: 'Domain-Specific', pos: 'noun', defSource: 'dictionary', dictSense: { word: 'habitat', index: 0, total: 2 } };
  const aiWord = { entryId: 'r', term: 'Root', def: 'The part under the ground.', tier: 'Academic' };
  function capture() {
    const files = [];
    vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return files;
  }
  const exporter = (data, extra = {}) => window.AlloModules.createExport({ liveRef: { current: { generatedContent: glossary(data, extra), t: (k) => k, addToast() {} } }, escapeXml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;') });
  afterEach(() => { document.querySelectorAll('.agx-overlay').forEach((n) => n.remove()); });

  it('CSV: a last Source column carries the credit on dictionary-made rows only; none without dictionary rows', () => {
    const files = capture();
    exporter([dictWord, aiWord]).handleExportGlossaryFile('csv');
    const lines = files[0].text.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Term,Definition,Tier,Source');
    expect(lines[1]).toBe('habitat,The natural home of an animal or plant.,Domain-Specific,"' + CREDIT + '"');
    expect(lines[2], 'an AI row has an empty Source cell').toBe('Root,The part under the ground.,Academic,');
    exporter([aiWord]).handleExportGlossaryFile('csv');
    expect(files[1].text.slice(1).split('\r\n')[0]).toBe('Term,Definition,Tier');
  });
  it('Anki: a trailing # comment record (ignored by Anki); a translation back carries no dictionary text, so no credit', () => {
    const files = capture();
    const api = exporter([{ ...dictWord, translations: { Spanish: 'Hábitat: Casa natural.' } }]);
    api.handleExportGlossaryFile('anki');
    const lines = files[0].text.trim().split('\n');
    expect(lines.slice(0, 4).every((l) => l.startsWith('#'))).toBe(true);
    expect(lines[4]).toBe('habitat\tThe natural home of an animal or plant.\tDomain-Specific');
    expect(lines[5]).toBe('# ' + CREDIT);
    api.handleExportGlossaryFile('anki', { back: 'Spanish' });
    expect(files[1].text).not.toContain('adapted from');
  });
  it('Quizlet: the paste text stays one card per line; the credit is a note in the dialog', () => {
    const files = capture();
    exporter([dictWord, aiWord]).handleExportGlossaryFile('quizlet');
    const dialog = document.querySelector('.agx-overlay [role="dialog"]');
    expect(dialog.querySelector('textarea').value).toBe('habitat\tThe natural home of an animal or plant.\nRoot\tThe part under the ground.');
    const note = dialog.querySelector('[data-agx-dictionary-credit]');
    expect(note.textContent).toBe('Paste this credit into the description of your Quizlet set: ' + CREDIT);
    expect(files).toHaveLength(0);
  });
  it('flashcard export: one credit section when a card is dictionary-made, none otherwise', () => {
    const files = capture();
    exporter([dictWord, aiWord]).handleExportFlashcards('standard');
    const html = files.map((f) => f.text).join('');
    expect(html.match(/data-dictionary-credits/g)).toHaveLength(1);
    expect(html).toContain(CREDIT);
    exporter([aiWord, { ...aiWord, entryId: 'x', term: 'Stem' }]).handleExportFlashcards('standard');
    expect(files.slice(1).map((f) => f.text).join('')).not.toContain('data-dictionary-credits');
  });
  it('the vocabulary worksheet (fallback and Packets print layout) carries the credit before the answer key', () => {
    const files = capture();
    const { container } = mount(view(tableProps([dictWord, aiWord])));
    click(container.querySelector('[data-testid="glossary-download-worksheet"]'));
    const html = files[0].text;
    const at = html.indexOf('data-vocab-dictionary-credit'), key = html.indexOf('<section class="answer-key"');
    expect(at, 'credit present').toBeGreaterThan(0);
    expect(at, 'on the student pages, before the answer key').toBeLessThan(key);
    expect(html).toContain(CREDIT);
    window.AlloPacketPrintCards = { buildVocabWorksheetHtml: () => '<body><main>words</main><footer class="ws-credits"><p>Pictures: Mulberry</p></footer><section class="ws-key">key</section></body>' };
    cleanups.push(() => { delete window.AlloPacketPrintCards; });
    click(container.querySelector('[data-testid="glossary-download-worksheet"]'));
    expect(files[1].text).toMatch(/<footer class="ws-credits"><p data-vocab-dictionary-credit="true"[^>]*>Some definitions[^<]*<\/p><p>Pictures: Mulberry<\/p><\/footer><section class="ws-key">/);
    const ai = mount(view(tableProps([aiWord, { ...aiWord, entryId: 'y', term: 'Stem' }])));
    click(ai.container.querySelector('[data-testid="glossary-download-worksheet"]'));
    expect(files[2].text).not.toContain('data-vocab-dictionary-credit');
  });
});

describe('dictionary entries made through the loader route (no checked marks)', () => {
  const loaderEntry = () => ({ meanings: [
    { partOfSpeech: 'noun', definitions: [{ definition: 'A business that keeps money.' }, { definition: 'The land beside a river.' }] },
    { partOfSpeech: 'verb', definitions: [{ definition: 'If you ___ on someone, you rely on them.' }] }] });
  const bankWord = { entryId: 'b', term: 'bank', def: 'A business that keeps money.', tier: 'Academic', pos: 'noun', defSource: 'dictionary', dictSense: { word: 'bank', index: 0, total: 3, list: 'loader' }, senseCheck: true };
  it('Check meaning lists the flattened loader meanings under "Not checked yet."; a choice keeps list "loader" and its flattened index', () => {
    window.AlloDictionary = { lookupOfflineBank: (w) => (w === 'bank' ? loaderEntry() : null), loadOfflineBank: () => Promise.resolve(true) };
    let state = null;
    const { container } = mount(React.createElement(Host, { initial: glossary([bankWord]), onState: (s) => { state = s; } }));
    click(container.querySelector('[data-glossary-check-meaning="entry:b"]'));
    const panel = container.querySelector('[data-glossary-sense-choices]');
    expect(panel.querySelector('[data-glossary-senses-unchecked]').textContent).toBe('Not checked yet.');
    const choices = [...panel.querySelectorAll('[data-glossary-sense-choice]')];
    expect(choices.map((c) => c.getAttribute('data-glossary-sense-choice'))).toEqual(['0', '1', '2']);
    expect(choices[2].textContent).toBe('verbIf you bank on someone, you rely on them.');
    click(choices[2]);
    expect(state.data[0]).toMatchObject({ def: 'If you bank on someone, you rely on them.', pos: 'verb', dictSense: { word: 'bank', index: 2, total: 3, list: 'loader' } });
    expect(state.data[0].senseCheck).toBeUndefined();
  });
  it('Other meanings stays hidden on the loader route (nothing is checked there)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    window.AlloDictionary = { getCached: () => ({ word: 'bank', meanings: loaderEntry().meanings, source: 'Wiktionary' }), lookupOfflineBank: () => loaderEntry(), matchPassageSense: () => null, pickSense: () => null };
    installBank();
    const props = tableProps([{ ...bankWord, senseCheck: false }, { entryId: 'r', term: 'Root', def: 'Under the ground.', tier: 'Academic' }], { isInteractiveFlashcards: true, isFlashcardFlipped: true, setQuizSelectedOption() {}, setFlashcardFeedback() {}, setFlashcardScore() {}, setFlashcardOptions() {}, setIsFlashcardFlipped() {}, setIsFlashcardQuizMode() {}, setStandardDeckLang() {} });
    const { container } = mount(view(props));
    const fold = container.querySelector('details[data-dict-fold]');
    expect(fold, 'the dictionary fold itself still shows').toBeTruthy();
    expect(fold.querySelector('[data-dict-other-meanings]')).toBeNull();
  });
});

describe('offline pictures for glossaries made without AI', () => {
  it('the view module publishes GlossaryOfflinePictures with the call shapes the dispatcher uses; exact matches get a picture, weak ones do not', async () => {
    const pictures = window.AlloModules.GlossaryOfflinePictures;
    expect(pictures && typeof pictures.ensure).toBe('function');
    expect(typeof pictures.prepare).toBe('function');
    expect(pictures.attribution({ set: 'mulberry', word: 'leaf' })).toMatchObject({ set: 'Mulberry Symbols', license: 'CC BY-SA 4.0' });
    expect(pictures.creditBand).toBe(48);
    // The dispatcher's own picture step, sliced from its source (not edited here).
    const dispatcher = readFileSync(REPO + '/generate_dispatcher_source.jsx', 'utf8');
    const start = dispatcher.indexOf('async function attachOfflineGlossaryPictures(');
    const end = dispatcher.indexOf('\nfunction normalizeGenerationSeed(', start);
    expect(start > 0 && end > start, 'the dispatcher picture step is where expected').toBe(true);
    const attach = new Function(dispatcher.slice(start, end) + '\nreturn attachOfflineGlossaryPictures;')();
    // No picture scripts to fetch in jsdom: the shared modules are already "loaded".
    const matcher = { matchWord: ({ word }) => (word === 'leaf' ? { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', matchTier: 'exact', set: 'mulberry', word } : { svg: '<svg/>', matchTier: 'search', word }) };
    Object.assign(window.AlloModules, { WordSoundsSymbols: { ready: () => true }, ReadingSymbolsExt: { load: () => Promise.resolve() }, WordPictureSemantic: {}, WordPictureMatcher: matcher });
    cleanups.push(() => { ['WordSoundsSymbols', 'ReadingSymbolsExt', 'WordPictureSemantic', 'WordPictureMatcher'].forEach((k) => delete window.AlloModules[k]); });
    vi.stubGlobal('Image', class { set src(v) { if (v) setTimeout(() => { this.naturalWidth = 10; this.naturalHeight = 10; this.onload && this.onload(); }, 0); } });
    const ctx = { fillRect() {}, drawImage() {}, fillText() {} };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/png;base64,QUJD');
    const entries = [{ term: 'leaf', def: 'A flat green part of a plant.' }, { term: 'root', def: 'The part under the ground.' }, { term: 'stem', def: '' }];
    expect(await attach(entries)).toBe(1);
    expect(entries[0]).toMatchObject({ image: 'data:image/png;base64,QUJD', imageSource: 'mulberry', imageAttribution: { set: 'Mulberry Symbols' }, imageCreditBand: 48 });
    expect(entries[1].image, 'a search-tier match is not used').toBeUndefined();
    expect(entries[2].image, 'no definition: skipped').toBeUndefined();
  });
});

describe('host: syllable table pinned by content, dictionary cache listed as a cache', () => {
  const anti = readFileSync(REPO + '/AlloFlowANTI.txt', 'utf8');
  it('one pluginContentPins table shared by the STEM loader and __alloLoadPlugin, with the syllable table at its sha256-8 (as build.js computes it)', async () => {
    const { createHash } = await import('node:crypto');
    const pin = createHash('sha256').update(readFileSync(REPO + '/syllable_table_en.js')).digest('hex').slice(0, 8);
    expect(anti.match(/var pluginContentPins = \{/g), 'build.js rewrites only the first table').toHaveLength(1);
    expect(/var pluginContentPins = \{[^}]*'syllable_table_en\.js': '([0-9a-f]{8})'/.exec(anti)[1]).toBe(pin);
    expect(anti).toContain("const url = pluginCdnBase + file + '?v=' + (Object.prototype.hasOwnProperty.call(pluginContentPins, file) ? pluginContentPins[file] : pluginCdnVersion);");
    expect(anti).toContain('if (pluginContentPins[mod]) modeVersion = pluginContentPins[mod];');
    // The table is declared where both loaders can see it (before the STEM loader factory).
    expect(anti.indexOf('var pluginContentPins = {')).toBeLessThan(anti.indexOf('function makeEnsureLoader('));
    expect(anti.indexOf('var pluginContentPins = {')).toBeGreaterThan(anti.indexOf("var pluginCdnBase = usesLocalModuleAssets ? './' : 'https://alloflow-cdn.pages.dev/';"));
  });
  it('the storage review counts allo_dict_ word data in its own "Word data for glossaries" row, never in another category', () => {
    const start = anti.indexOf('const ALLO_STORAGE_INVENTORY = (() => {');
    const end = anti.indexOf('\nconst _alloCreateDefaultStudentProjectSettings', start);
    const inventory = new Function(anti.slice(start, end) + '\nreturn ALLO_STORAGE_INVENTORY;')();
    ['allo_dict_classify', 'allo_dict_progress', 'allo_dict_draft', 'allo_dict_habitat'].forEach((key) => expect(inventory.categoryForKey(key), key).toBe('reclaimable'));
    const keys = ['allo_dict_habitat', 'allo_dict_classify'];
    const storage = { length: keys.length, key: (i) => keys[i], getItem: () => '{"word":"x","meanings":[]}' };
    expect(inventory.collectLocalStorage(storage)).toEqual([]);
    expect(inventory.collectDictionaryCache(storage)).toEqual({ count: 2, approximateBytes: 2 * '{"word":"x","meanings":[]}'.length });
  });
});

describe('one credit line, from the resource when it carries one', () => {
  it('uses the sources saved on the resource (dictionary glossary builder) and still shows a single line', () => {
    const credits = [{ kind: 'dictionary', adapted: true, label: 'AlloFlow School Vocabulary', note: 'Definitions adapted from the saved note.', sources: [
      { set: 'English Wiktionary', license: 'CC BY-SA 4.0', url: 'https://en.wiktionary.org/wiki/Main_Page', deed: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      { set: 'Open English WordNet 2025', license: 'CC BY 4.0', url: 'https://en-word.net/', deed: 'https://creativecommons.org/licenses/by/4.0/' }] }];
    const data = [{ entryId: 'h', term: 'habitat', def: 'The natural home of an animal.', tier: 'Academic', defSource: 'dictionary' }];
    const { container } = mount(view(tableProps(data, {}, { credits })));
    const lines = container.querySelectorAll('[data-glossary-dictionary-credit]');
    expect(lines).toHaveLength(1);
    expect([...lines[0].querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://en.wiktionary.org/wiki/Main_Page', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://en-word.net/', 'https://creativecommons.org/licenses/by/4.0/']);
    expect(container.textContent, 'the saved note is not printed as a second line').not.toContain('saved note');
  });
});
