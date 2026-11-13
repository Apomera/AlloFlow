import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// "Print word cards" on the maker page (packets-print-cards.js + .css). Part 1: the pure helpers. Part 2: the
// view in jsdom, driven the way the maker drives it (wire(button, getState)). Part 3: the files and the hook.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const cards = require('../packets-print-cards.js');
const SOURCE = read('packets-print-cards.js');
const CSS = read('packets-print-cards.css');

// The real picture index, with all its drawings read from disk (the maker fetches the same files).
const SYMBOLS = require('../word_sounds_symbols_en.js');
for (const shard of SYMBOLS.shards) SYMBOLS.add(JSON.parse(read(shard.url)));
const mulberryWord = 'cat';
const openmojiWord = SYMBOLS.words().find((word) => SYMBOLS.set(word) === 'openmoji');
const plainWord = 'hat';
// The credit line the maker's sources list uses for a set.
const makerLine = (set) => { const c = SYMBOLS.credits[set]; return c.set + ' by ' + c.author + '. License: ' + c.license + (c.license === 'CC BY-SA 4.0' ? ' (creativecommons.org/licenses/by-sa/4.0)' : '') + '. ' + c.url; };

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function fakeSymbols(words, { ready = true } = {}) {
  const loaded = { ready };
  const index = {
    bytes: 6744637,
    credits: SYMBOLS.credits,
    has: (word) => Object.prototype.hasOwnProperty.call(words, word),
    set: (word) => words[word] || null,
    get: (word) => (loaded.ready && index.has(word) ? { svg: '<svg xmlns="x"><title>' + word + '</title></svg>', set: words[word] } : null),
    ready: () => loaded.ready,
  };
  return { index, loaded };
}

function openView() {
  const dom = new JSDOM('<!doctype html><html><body><main><p class="actions"><button type="button" id="print-cards" hidden>Print word cards</button></p></main></body></html>', { pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  const printed = [];
  w.print = () => printed.push(d.querySelectorAll('.pc-sheet').length);
  w.scrollTo = () => {};
  const api = cards.create(d, w);
  const button = d.getElementById('print-cards');
  let state = { words: [], title: '', pictures: false };
  api.wire(button, () => state);
  const view = {
    w, d, api, button, printed,
    set(next) { state = next; },
    async press() { button.focus(); button.click(); await new Promise((resolve) => setTimeout(resolve, 0)); await new Promise((resolve) => setTimeout(resolve, 0)); },
    sheets: () => [...d.querySelectorAll('.pc-sheet')],
    cardPages: () => [...d.querySelectorAll('.pc-sheet.pc-cards')],
    words: () => [...d.querySelectorAll('.pc-card')].map((card) => (card.querySelector('.pc-word') || card.querySelector('img')).textContent || card.querySelector('img').alt),
    said: () => d.querySelector('.pc-said').textContent,
    choose(name, value) { const radio = d.querySelector('input[name="pc-' + name + '"][value="' + value + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); },
  };
  return view;
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the helpers', () => {
  it('cut the words into pages of the card size, in order', () => {
    const words = Array.from({ length: 13 }, (_, i) => 'w' + i);
    expect(cards.layout(words, 6).map((page) => page.length)).toEqual([6, 6, 1]);
    expect(cards.layout(words, 12).map((page) => page.length)).toEqual([12, 1]);
    expect(cards.layout(words, 4).map((page) => page.length)).toEqual([4, 4, 4, 1]);
    expect(cards.layout(words, 99).map((page) => page.length)).toEqual([6, 6, 1]);
    expect(cards.layout(words, 6).flat()).toEqual(words);
    expect(cards.layout([], 6)).toEqual([]);
  });

  it('size a word by its length, with one class for each length up to the longest word a teacher can add', () => {
    expect(cards.lengthClass('at')).toBe('pc-len-2');
    expect(cards.lengthClass('a'.repeat(24))).toBe('pc-len-24');
    expect(cards.lengthClass('a'.repeat(40))).toBe('pc-len-24');
    for (let n = 1; n <= 24; n++) expect(CSS, 'pc-len-' + n).toMatch(new RegExp('\\.pc-len-' + n + ' \\{ --n: \\d+; \\}'));
    // The word shrinks with its length and with its card, and cannot run over the edge.
    expect(CSS).toContain('font-size: min(var(--word-max), calc(150cqi / var(--n, 6)));');
    expect(CSS).toMatch(/\.pc-card \{[^}]*container-type: inline-size;[^}]*overflow: hidden;/);
    expect(CSS).toMatch(/\.pc-word \{[^}]*overflow-wrap: anywhere;/);
  });

  it('take the teacher\'s picture first, then the symbol, and only real pictures', () => {
    const { index } = fakeSymbols({ cat: 'mulberry', alien: 'openmoji' });
    const own = { cat: { picture: { dataUri: PNG, credit: { own: true } } }, dog: { picture: { dataUri: 'javascript:alert(1)' } } };
    const got = cards.picturesOf(['cat', 'alien', 'dog', 'hat'], own, index);
    expect(got.cat).toEqual({ uri: PNG, set: 'own', credit: { own: true } });
    expect(got.alien.set).toBe('openmoji');
    expect(got.alien.uri).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
    expect(got.dog).toBeNull();
    expect(got.hat).toBeNull();
    expect(cards.picturesOf(['cat'], null, null)).toEqual({ cat: null });
  });

  it('credit each picture set used, in the maker\'s own words, and nothing that is not used', () => {
    const real = cards.picturesOf([mulberryWord, openmojiWord, plainWord], null, SYMBOLS);
    expect(cards.creditsFor([mulberryWord, plainWord], real, SYMBOLS)).toEqual(['Pictures: ' + makerLine('mulberry')]);
    expect(cards.creditsFor([openmojiWord], real, SYMBOLS)).toEqual(['Pictures: ' + makerLine('openmoji')]);
    expect(cards.creditsFor([openmojiWord, mulberryWord], real, SYMBOLS)).toEqual(['Pictures: ' + makerLine('mulberry'), 'Pictures: ' + makerLine('openmoji')]);
    expect(cards.creditsFor([plainWord], real, SYMBOLS)).toEqual([]);
    expect(makerLine('openmoji')).toContain('CC BY-SA 4.0');
    // A picture the teacher found elsewhere carries its credit; the teacher's own needs none.
    const myWords = require('../packets_my_words.js');
    const pictures = { fox: { uri: PNG, set: 'own', credit: { title: 'Red fox', author: 'A. Person', license: 'CC BY 4.0', source: 'Openverse' } }, owl: { uri: PNG, set: 'own', credit: { own: true } } };
    expect(cards.creditsFor(['fox', 'owl'], pictures, SYMBOLS, myWords.creditLine)).toEqual(['Picture for "fox": "Red fox" by A. Person, CC BY 4.0, from Openverse.']);
  });
});

describe('the print view', () => {
  it('shows the button only once it is wired, and explains when there are no words', async () => {
    const view = openView();
    expect(view.button.hidden).toBe(false);
    await view.press();
    expect(view.d.body.classList.contains('pc-on')).toBe(true);
    expect(view.said()).toBe(cards.TEXT.nothing);
    expect(view.sheets()).toHaveLength(0);
    expect(view.d.querySelector('.pc-actions .btn-primary').disabled).toBe(true);
    expect(view.d.querySelector('.pc-options').hidden).toBe(true);
    view.d.querySelector('.pc-actions .btn-primary').click();
    expect(view.printed).toEqual([]);
  });

  it('lays out the chosen words in order as cards, then one word list, with the options folded', async () => {
    const view = openView();
    const words = ['ship', 'chip', 'shop', 'chop', 'fish', 'dish', 'much', 'such', 'wish', 'rich', 'shell', 'chin', 'cash'];
    view.set({ words, title: 'Word Sounds: sh and ch', pictures: false });
    await view.press();
    expect(view.d.activeElement.id).toBe('pc-heading');
    expect(view.d.querySelector('.pc-options').open).toBe(false);
    expect(view.cardPages()).toHaveLength(3);
    expect(view.words()).toEqual(words);
    expect(view.cardPages()[0].getAttribute('aria-label')).toBe('Cards, page 1 of 3');
    expect(view.cardPages()[2].querySelector('.pc-foot-title').textContent).toBe('Word Sounds: sh and ch. Cards, page 3 of 3.');
    const list = view.d.querySelector('.pc-sheet.pc-list');
    expect(list.querySelector('h2').textContent).toBe('Word Sounds: sh and ch');
    expect([...list.querySelectorAll('li')].map((li) => li.textContent)).toEqual(words);
    expect(list.querySelector('ol').className).toContain('pc-list-cols-2');
    expect(view.said()).toBe('13 words. 3 pages of cards and a word list to print.');
    // Pictures are off in the maker: word cards only, no credit, and the note says how to add them.
    expect(view.d.querySelectorAll('.pc-card img')).toHaveLength(0);
    expect(view.d.querySelectorAll('.pc-credit')).toHaveLength(0);
    expect(view.d.querySelector('input[name="pc-shows"]').closest('fieldset').hidden).toBe(true);
    expect(view.d.querySelector('.pc-options').textContent).toContain(cards.TEXT.picturesOff);

    view.choose('size', '12');
    expect(view.cardPages().map((page) => page.querySelectorAll('.pc-card').length)).toEqual([12, 1]);
    expect(view.cardPages()[0].querySelector('.pc-grid').className).toBe('pc-grid pc-cols-3 pc-rows-4');
    view.choose('size', '4');
    expect(view.cardPages()).toHaveLength(4);

    expect(view.cardPages()[0].classList.contains('pc-lines')).toBe(true);
    const lines = view.d.getElementById('pc-lines');
    lines.checked = false;
    lines.dispatchEvent(new view.w.Event('change', { bubbles: true }));
    expect(view.cardPages()[0].classList.contains('pc-nolines')).toBe(true);

    view.choose('pages', 'list');
    expect(view.sheets().map((sheet) => sheet.className)).toEqual(['pc-sheet pc-list']);
    view.choose('pages', 'cards');
    expect(view.d.querySelector('.pc-list')).toBeNull();
    expect(view.said()).toBe('13 words. 4 pages of cards to print.');

    view.d.querySelector('.pc-actions .btn-primary').click();
    expect(view.printed).toEqual([4]);
  });

  it('shows the teacher\'s picture before the symbol, gets missing drawings once through the maker, and credits what it shows', async () => {
    const view = openView();
    const { index, loaded } = fakeSymbols({ cat: 'mulberry', sun: 'mulberry', alien: 'openmoji' }, { ready: false });
    let loads = 0, resolveLoad;
    const loadPictures = () => { loads++; return new Promise((resolve) => { resolveLoad = () => { loaded.ready = true; resolve(true); }; }); };
    const own = async (words) => ({ sun: { picture: { dataUri: PNG, credit: { own: true } } }, other: words.length });
    view.set({ words: ['sun', 'cat', 'hat', 'alien'], title: 'Pictures', pictures: true, symbols: index, loadPictures, own });
    await view.press();
    await settle();
    expect(loads).toBe(1);
    expect(view.said()).toBe('Getting the pictures, about 6.7 MB.');
    expect(view.d.querySelector('.pc-actions .btn-primary').disabled).toBe(true);
    expect(view.sheets()).toHaveLength(0);
    resolveLoad();
    await settle(); await settle();
    const pics = [...view.d.querySelectorAll('.pc-card')].map((card) => { const img = card.querySelector('img'); return img ? img.getAttribute('src').slice(0, 24) : null; });
    expect(pics).toEqual([PNG.slice(0, 24), 'data:image/svg+xml;chars', null, 'data:image/svg+xml;chars']);
    expect(view.said()).toBe('4 words. 1 page of cards and a word list to print. 3 cards of 4 with a picture.');
    expect([...view.d.querySelectorAll('.pc-credit')].map((p) => p.textContent)).toEqual(['Pictures: ' + makerLine('mulberry'), 'Pictures: ' + makerLine('openmoji')]);
    // Word and picture: the picture is decoration beside the word. Picture only: the picture says the word, and a word with none shows the word.
    expect(view.d.querySelector('.pc-card img').alt).toBe('');
    view.choose('shows', 'picture');
    expect([...view.d.querySelectorAll('.pc-card')].map((card) => card.querySelector('.pc-word') ? 'word:' + card.querySelector('.pc-word').textContent : 'picture:' + card.querySelector('img').alt))
      .toEqual(['picture:sun', 'picture:cat', 'word:hat', 'picture:alien']);
    view.choose('shows', 'word');
    expect(view.d.querySelectorAll('.pc-card img')).toHaveLength(0);
    expect(view.d.querySelectorAll('.pc-credit')).toHaveLength(0);
    // Open again: the drawings are here now, so nothing is loaded twice.
    view.d.querySelector('.pc-actions .btn:not(.btn-primary)').click();
    await view.press();
    await settle();
    expect(loads).toBe(1);
  });

  it('prints only the pictures the teacher added when the drawings cannot be downloaded, and says so', async () => {
    const view = openView();
    const { index } = fakeSymbols({ cat: 'mulberry' }, { ready: false });
    view.set({ words: ['cat', 'sun'], pictures: true, symbols: index, loadPictures: () => Promise.reject(new Error('offline')), own: async () => ({ sun: { picture: { dataUri: PNG, credit: { own: true } } } }) });
    await view.press();
    await settle(); await settle();
    expect(view.said()).toContain(cards.TEXT.gotNone);
    expect([...view.d.querySelectorAll('.pc-card')].map((card) => !!card.querySelector('img'))).toEqual([false, true]);
    expect(view.d.querySelectorAll('.pc-credit')).toHaveLength(0);
    expect(view.d.querySelector('.pc-actions .btn-primary').disabled).toBe(false);
  });

  it('goes back to the maker with the Back button or Escape, and gives focus back to the button', async () => {
    const view = openView();
    view.set({ words: ['cat'], pictures: false });
    await view.press();
    view.d.querySelector('.pc-actions .btn:not(.btn-primary)').click();
    expect(view.d.body.classList.contains('pc-on')).toBe(false);
    expect(view.api.view().hidden).toBe(true);
    expect(view.d.activeElement).toBe(view.button);
    await view.press();
    view.d.querySelector('.pc-actions .btn-primary').dispatchEvent(new view.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(view.api.view().hidden).toBe(true);
    expect(view.d.activeElement).toBe(view.button);
  });

  it('labels every control', async () => {
    const view = openView();
    view.set({ words: ['cat', 'dog'], pictures: true, symbols: null });
    await view.press();
    const root = view.api.view();
    for (const input of root.querySelectorAll('input')) {
      expect(input.closest('label'), input.name || input.id).not.toBeNull();
      expect(input.closest('label').textContent.trim().length).toBeGreaterThan(3);
    }
    for (const set of root.querySelectorAll('fieldset')) expect(set.querySelector('legend').textContent.trim().length).toBeGreaterThan(3);
    for (const button of root.querySelectorAll('button')) expect(button.textContent.trim().length).toBeGreaterThan(3);
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-labelledby')).toBe('pc-heading');
    expect(view.d.querySelector('.pc-said').getAttribute('role')).toBe('status');
    expect([...root.querySelectorAll('legend, label, button, summary')].map((node) => node.textContent.trim())).toEqual([
      'Print', 'Back to the maker', 'Card options', 'Card size', 'Big: 4 on a page', 'Medium: 6 on a page', 'Small: 12 on a page',
      'Each card shows', 'The word and its picture', 'Only the word', 'Only the picture, for matching games', 'Lines to cut along',
      'What to print', 'The cards and a word list', 'Only the cards', 'Only the word list']);
  });
});

describe('the files and the hook in the maker', () => {
  it('load nothing and keep nothing: the drawings come only through the maker\'s loader', () => {
    expect(SOURCE).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|cookie|\.innerHTML|eval\(|new Function|setAttribute\('style'|\.style\b/);
    expect(SOURCE).not.toMatch(/https?:\/\//);
    expect(CSS).not.toMatch(/@import|url\(|@font-face|https?:/i);
  });

  it('print only the cards, black on white, a sheet a page, inside margins that fit Letter and A4', () => {
    const print = CSS.slice(CSS.indexOf('@media print'));
    expect(print).toContain('@page { margin: 12mm; }');
    expect(CSS).toContain('body.pc-on > :not(.pc) { display: none !important; }');
    expect(print).toContain('.pc-bar { display: none !important; }');
    expect(print).toMatch(/\.pc-sheet \{[^}]*height: 252mm;[^}]*break-after: page;/);
    expect(print).toContain('.pc-sheet:last-child { break-after: auto;');
    // 252 mm fits inside the 255.4 mm of US Letter and the 273 mm of A4, both with 12 mm margins.
    expect(252).toBeLessThanOrEqual(279.4 - 24);
    expect(CSS).not.toMatch(/#(?!000000|ffffff|808080)[0-9a-f]{3,6}\b/i);
  });

  it('is wired into the maker with one button and one call that hands over the file\'s words, title and picture choice', () => {
    const doc = new JSDOM(read('packets-make.html')).window.document;
    const button = doc.getElementById('print-cards');
    expect(button.hidden).toBe(true);
    expect(button.textContent).toBe('Print word cards');
    expect(button.closest('#step-3')).not.toBeNull();
    expect(button.previousElementSibling.id).toBe('back-3');
    const scripts = [...doc.querySelectorAll('script')].map((script) => script.getAttribute('src'));
    expect(scripts.indexOf('packets-print-cards.js')).toBe(scripts.indexOf('packets-make.js') - 1);
    expect([...doc.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'))).toContain('packets-print-cards.css');
    const make = read('packets-make.js');
    expect(make).toContain("cards.wire($('print-cards'), function () {");
    expect(make).toContain('return { words: chosenWords(), title: titleNow(), pictures: !!$(\'f-pictures\').checked, symbols: symbols, loadPictures: symbols ? loadPictures : null, own: ownFor };');
  });
});
