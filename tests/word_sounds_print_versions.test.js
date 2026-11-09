// Word Sounds printables, 2026-11-09: answer key fixes (segmentation sounds once, syllable parts, the
// missing letter), versions (A untouched, B/C/new mix reorder items and choices with the key built from the
// same objects), How many, Easier, answer key placement, a words-to-say page, Large print, lesson-language
// student text, letter tracing guides, the missing-letter box, editable choices, neutral picture alt text,
// and the new Blank sheet, Review sheet and Sorting cards printouts.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadModal, mount, unmountAll, click, settle, act, makeHatItem, React, client, Modal, mounted, wait } from './helpers/word_sounds_present_harness.js';
import { makePackItem, studentProps } from './helpers/word_sounds_pack_fixture.js';

const REPO = process.cwd().replace(/\\/g, '/');
const english = JSON.parse(readFileSync(REPO + '/ui_strings.js', 'utf8')).word_sounds;
const text = (html) => new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html').body.textContent;
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

// The PRINTABLES section on its own, as pure functions over hand-built items.
function loadPrintables() {
  const lines = readFileSync(REPO + '/word_sounds_module.js', 'utf8').split('\n');
  const begin = lines.findIndex((l) => l.includes('// BEGIN WORD SOUNDS PRINTABLES'));
  const end = lines.findIndex((l) => l.includes('// END WORD SOUNDS PRINTABLES'));
  const shuffle = lines.findIndex((l) => l.startsWith('    const wsPresentShuffle = '));
  const shuffleEnd = lines.findIndex((l, i) => i > shuffle && l === '    };');
  if (begin < 0 || end < 0 || shuffle < 0 || shuffleEnd - shuffle > 6) throw Error('printables section not found');
  const code = lines.slice(shuffle, shuffleEnd + 1).join('\n') + '\n' + lines.slice(begin, end).join('\n');
  return new Function('wsPresentWord', 'wsPresentSound', 'window', code +
    '\nreturn { wsPresentShuffle, wsPrintWorksheet, wsPrintSheets, wsPrintPrepare, wsPrintBlank, wsPrintCards, wsPrintKeyLine, WS_PRINT_CSS, WS_PRINT_READER_CSS, WS_PRINT_LARGE_CSS };')(
    (x) => x.word, (x) => x, {});
}
const P = loadPrintables();
const ch = (v) => ({ value: v, label: v });
const seg = (w, ph) => ({ activity: 'segmentation', word: w, promptText: 'Say each sound you hear.', display: { kind: 'boxes', count: ph.length }, choices: [], correct: [], audio: [{ text: w }],
  answer: { label: ph.map((p) => '/' + p + '/').join(' '), sounds: ph } });
const trace = (w, letter) => ({ activity: 'letter_tracing', word: w, promptText: 'Trace ' + letter, display: { kind: 'word', text: letter }, choices: [], correct: [], audio: [], answer: { label: w } });
const missing = { activity: 'missing_letter', word: 'fish', promptText: 'Which letter is missing?', display: { kind: 'blank_word', letters: ['f', 'i', 's', 'h'], hidden: 2 },
  choices: [ch('s'), ch('t'), ch('m')], correct: ['s'], audio: [], answer: { label: 'fish' } };
const rhyme = { activity: 'rhyming', word: 'cat', promptText: 'Which word rhymes with cat?', display: null, choices: ['hat', 'dog', 'sun', 'bed'].map(ch), correct: ['hat'], audio: [], answer: { label: 'hat' } };
const recordedParts = (entry) => ({ activity: 'syllable_blending', word: 'rabbit', entry, promptText: 'Listen to the parts.', display: { kind: 'parts', steps: [{ src: 'a.wav' }, { src: 'b.wav' }] },
  audio: [{ src: 'a.wav' }, { src: 'b.wav' }], choices: ['rabbit', 'robot', 'ribbon'].map(ch), correct: ['rabbit'], answer: { label: 'rabbit' } });
const TEXT = { title: 'Sheet', name: 'Name:', directions: 'Do it.', listen: 'Listen to your teacher.', all: 'Circle every one that fits.', picture: 'Picture {n}', keyTitle: 'Answer key', say: 'Say:',
  sayTitle: 'What to say', sayNote: 'Read each one aloud.', print: 'Print' };
const pics = { cat: 'data:image/png;base64,AAAA', fish: 'data:image/png;base64,BBBB' };
const picture = (w) => pics[w] || null;

describe('answer key lines', () => {
  it('prints a segmentation answer\'s sounds once', () => {
    expect(text(P.wsPrintKeyLine(seg('cat', ['k', 'a', 't']), TEXT))).toBe('cat — /k/ /a/ /t/');
  });
  it('keeps the sounds after a counting answer, where the label is a number', () => {
    const counting = { activity: 'counting', word: 'cat', correct: ['3'], audio: [], answer: { label: '3', sounds: ['k', 'a', 't'] } };
    expect(text(P.wsPrintKeyLine(counting, TEXT))).toBe('cat — 3 (/k/ /a/ /t/)');
  });
  it('says the syllables for recorded parts when the word has them, and drops "Say:" when it does not', () => {
    expect(text(P.wsPrintKeyLine(recordedParts({ syllables: ['rab', 'bit'] }), TEXT))).toBe('rabbit · Say: rab bit');
    expect(text(P.wsPrintKeyLine(recordedParts({}), TEXT))).toBe('rabbit');
    expect(text(P.wsPrintKeyLine(recordedParts({ syllables: ['rabbit'] }), TEXT)), 'one syllable cannot be two parts').toBe('rabbit');
  });
  it('names the missing letter', () => {
    expect(text(P.wsPrintKeyLine(missing, TEXT))).toBe('fish — s');
  });
});

describe('the sheet itself', () => {
  it('draws the missing letter as a box to write in, and lets choices, the big word and tiles be edited', () => {
    const scramble = { activity: 'word_scramble', word: 'cat', promptText: 'Unscramble.', display: { kind: 'tiles', tiles: ['t', 'c', 'a'] }, choices: [], correct: [], audio: [], answer: { label: 'cat' } };
    const decoding = { activity: 'decoding', word: 'dog', promptText: 'Read this word.', display: { kind: 'word', text: 'dog' }, choices: [], correct: ['dog'], audio: [], answer: { label: 'dog' } };
    const doc = parse(P.wsPrintWorksheet([missing, scramble, decoding], '', TEXT, picture, false));
    const big = doc.querySelector('.ws-ws-big');
    expect(big.innerHTML).toBe('fi<span class="ws-ws-blank"></span>h');
    expect(P.WS_PRINT_CSS).toMatch(/\.ws-ws-blank\{display:inline-block;min-width:1\.4em;[^}]*border:3px solid #000/);
    for (const el of [big, ...doc.querySelectorAll('.ws-ws-choice'), ...doc.querySelectorAll('.ws-ws-tile'), doc.querySelectorAll('.ws-ws-big')[1]]) expect(el.hasAttribute('data-ws-edit'), el.outerHTML).toBe(true);
  });
  it('gives a picture neutral alt text where the word is the answer, and the word elsewhere', () => {
    const doc = parse(P.wsPrintWorksheet([seg('cat', ['k', 'a', 't']), seg('fish', ['f', 'i', 'sh']), rhyme, missing], '', TEXT, picture, false));
    expect([...doc.querySelectorAll('.ws-ws-cue img')].map((img) => img.getAttribute('alt'))).toEqual(['Picture 1', 'Picture 2', 'cat', 'Picture 4']);
  });
  it('traces each letter once, five times on a three-line guide with an empty guide after it', () => {
    const items = P.wsPrintPrepare([trace('cat', 'c'), trace('cup', 'c'), trace('can', 'c'), trace('dog', 'd'), trace('Cat', 'C'), trace('कमल', 'क')], {});
    expect(items.map((i) => i.word)).toEqual(['cat', 'dog', 'Cat', 'कमल']);
    const doc = parse(P.wsPrintWorksheet(items, ' lang="en"', TEXT, picture, false));
    const rows = [...doc.querySelectorAll('.ws-ws-item')];
    for (const row of rows) {
      const [traced, blank] = row.querySelectorAll('.ws-ws-guide');
      expect(traced.querySelectorAll('.ws-ws-trace')).toHaveLength(5);
      expect(blank.children).toHaveLength(0);
      expect(row.querySelector('.ws-ws-write'), 'the guide replaces the plain line').toBeNull();
    }
    expect(rows[0].querySelector('.ws-ws-guide').className).toBe('ws-ws-guide');
    expect(rows[3].querySelector('.ws-ws-guide').className, 'another script: an even guide').toBe('ws-ws-guide ws-ws-guide-plain');
    expect(P.WS_PRINT_CSS).toContain(".ws-ws-guide::before{content:'';position:absolute;inset-inline:0;top:.197em;border-top:2px dashed #000}");
  });
});

describe('versions, How many and Easier', () => {
  const list = ['cat', 'fish', 'stamp', 'ship', 'cup', 'hat', 'map', 'dog'].map((w) => ({ ...rhyme, word: w, choices: ['hat', 'dog', 'sun', 'bed'].map(ch) }));
  it('A returns the same item objects in the same order', () => {
    const out = P.wsPrintPrepare(list, { version: 'A' });
    expect(out).toHaveLength(list.length);
    out.forEach((item, i) => expect(item).toBe(list[i]));
    expect(P.wsPrintWorksheet(P.wsPrintPrepare(list, {}), '', TEXT, picture, true)).toBe(P.wsPrintWorksheet(list, '', TEXT, picture, true));
  });
  it('B and C reorder items and their choices, the same way every time, and never change the right answer', () => {
    const b = P.wsPrintPrepare(list, { version: 'B' }), c = P.wsPrintPrepare(list, { version: 'C' });
    expect(b.map((i) => i.word)).not.toEqual(list.map((i) => i.word));
    expect(b.map((i) => i.word)).not.toEqual(c.map((i) => i.word));
    expect(b.some((i) => i.choices.map((x) => x.value).join() !== 'hat,dog,sun,bed')).toBe(true);
    expect(P.wsPrintPrepare(list, { version: 'B' }).map((i) => i.word + ':' + i.choices.map((x) => x.value).join())).toEqual(b.map((i) => i.word + ':' + i.choices.map((x) => x.value).join()));
    for (const item of b) expect([...item.choices.map((x) => x.value)].sort()).toEqual(['bed', 'dog', 'hat', 'sun']);
    expect(P.wsPrintPrepare(list, { version: 'mix', seed: 4821 }).map((i) => i.word)).not.toEqual(P.wsPrintPrepare(list, { version: 'mix', seed: 1234 }).map((i) => i.word));
  });
  it('keeps counting choices in number order in every version', () => {
    const counting = ['cat', 'fish', 'stamp'].map((w) => ({ activity: 'counting', word: w, choices: ['1', '2', '3', '4', '5'].map(ch), correct: ['3'], audio: [], answer: { label: '3' } }));
    for (const item of P.wsPrintPrepare(counting, { version: 'B' })) expect(item.choices.map((x) => x.value)).toEqual(['1', '2', '3', '4', '5']);
  });
  it('a scramble never comes out solved', () => {
    const scramble = ['ab', 'at', 'it', 'on', 'up', 'go'].map((w) => ({ activity: 'word_scramble', word: w, display: { kind: 'tiles', tiles: [...w].reverse() }, choices: [], correct: [], audio: [], answer: { label: w } }));
    for (const version of ['B', 'C']) for (const item of P.wsPrintPrepare(scramble, { version })) expect(item.display.tiles.join('')).not.toBe(item.word);
  });
  it('How many takes the first 5 or 10 of the version\'s order', () => {
    expect(P.wsPrintPrepare(list, { count: 5 }).map((i) => i.word)).toEqual(['cat', 'fish', 'stamp', 'ship', 'cup']);
    expect(P.wsPrintPrepare(list, { version: 'B', count: 5 }).map((i) => i.word)).toEqual(P.wsPrintPrepare(list, { version: 'B' }).slice(0, 5).map((i) => i.word));
    expect(P.wsPrintPrepare(list, { count: 10 })).toHaveLength(8);
  });
  it('Easier keeps the right answer and one wrong choice; every right answer stays on a sort', () => {
    const [easy] = P.wsPrintPrepare([rhyme], { easier: true });
    expect(easy.choices.map((c) => c.value)).toEqual(['hat', 'dog']);
    const sort = { activity: 'sound_sort', word: 'cat', multi: true, choices: ['sun', 'kite', 'map', 'key'].map(ch), correct: ['kite', 'key'], audio: [], answer: { label: 'kite, key' } };
    expect(P.wsPrintPrepare([sort], { easier: true })[0].choices.map((c) => c.value)).toEqual(['sun', 'kite', 'key']);
    expect(P.wsPrintPrepare([{ ...rhyme, choices: ['hat', 'dog'].map(ch) }], { easier: true })[0].choices).toHaveLength(2);
  });
  it('builds the key from the same objects as the sheet, so a version\'s key follows its order', () => {
    const items = P.wsPrintPrepare(list.map((item, i) => ({ ...item, correct: [['hat', 'dog', 'sun', 'bed'][i % 4]], answer: { label: ['hat', 'dog', 'sun', 'bed'][i % 4] } })), { version: 'C', count: 5, easier: true });
    const doc = parse(P.wsPrintWorksheet(items, '', { ...TEXT, form: 'Form C', keyForm: 'Form C' }, picture, 'last'));
    expect(doc.querySelector('.ws-ws-form').textContent).toBe('Form C');
    expect(doc.querySelector('.ws-ws-key h2').textContent).toBe('Answer key · Form C');
    const sheet = [...doc.querySelectorAll('.ws-ws-item')].map((li) => li.querySelector('.ws-ws-prompt').textContent);
    expect(sheet).toHaveLength(5);
    const keyed = [...doc.querySelectorAll('.ws-ws-key li')].map((li) => li.textContent);
    items.forEach((item, i) => {
      expect(keyed[i]).toBe(item.word + ' — ' + item.correct[0]);
      const choices = [...doc.querySelectorAll('.ws-ws-item')[i].querySelectorAll('.ws-ws-choice')].map((c) => c.textContent);
      expect(choices, 'the key answer is on the sheet').toContain(item.correct[0]);
      expect(choices).toHaveLength(2);
    });
  });
});

describe('answer key placement and the words to say', () => {
  const items = [seg('cat', ['k', 'a', 't']), seg('fish', ['f', 'i', 'sh'])];
  it('On the last page: the key, and no separate word list (the key lists the words)', () => {
    const doc = parse(P.wsPrintWorksheet(items, '', TEXT, picture, 'last'));
    expect(doc.querySelectorAll('.ws-ws-key')).toHaveLength(1);
    expect(doc.querySelector('.ws-ws-say')).toBeNull();
  });
  it('No key: a teacher page lists what to say, in item order, on a page of its own', () => {
    const doc = parse(P.wsPrintWorksheet(items, '', TEXT, picture, 'none'));
    expect(doc.querySelector('.ws-ws-key')).toBeNull();
    const say = doc.querySelector('.ws-ws-say');
    expect(say.classList.contains('ws-ws-newpage')).toBe(true);
    expect([...say.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['cat', 'fish']);
    expect(parse(P.wsPrintWorksheet([rhyme], '', TEXT, picture, 'none')).querySelector('.ws-ws-say'), 'the word is printed: nothing to say').toBeNull();
  });
  it('As a separate printout: the sheet holds neither; a template holds only the key and the word list', () => {
    const doc = parse(P.wsPrintWorksheet([...items, recordedParts({ syllables: ['rab', 'bit'] })], '', { ...TEXT, keyForm: 'Form B' }, picture, 'separate'));
    expect(doc.querySelector('.ws-ws-key')).toBeNull();
    expect(doc.querySelector('.ws-ws-say')).toBeNull();
    const tpl = doc.querySelector('template#ws-key-doc');
    expect(tpl.getAttribute('data-title')).toBe('Answer key · Form B');
    const key = parse('<!doctype html><body>' + tpl.innerHTML + '</body>');
    expect(key.querySelector('.ws-ws-item')).toBeNull();
    expect(key.querySelector('h1')).toBeNull();
    expect([...key.querySelectorAll('section')].map((s) => s.querySelector('h2').textContent)).toEqual(['Answer key · Form B', 'What to say · Form B']);
    expect([...key.querySelectorAll('.ws-ws-say li')].map((li) => li.textContent)).toEqual(['cat', 'fish', 'rab bit (rabbit)']);
    expect(key.querySelector('.print-bar button').getAttribute('onclick')).toBe('window.print()');
  });
});

describe('review sheet', () => {
  it('numbers run on across sections, each with its own heading and directions, and one key covers them all', () => {
    const sections = [
      { heading: 'Say It', directions: 'Listen.', items: [seg('cat', ['k', 'a', 't']), seg('fish', ['f', 'i', 'sh'])] },
      { heading: 'Rhyme Time', directions: 'Read.', items: [rhyme] },
      { heading: 'Missing Letter', directions: 'Read.', items: [missing] },
    ];
    const doc = parse(P.wsPrintSheets(sections, '', { ...TEXT, directions: '' }, picture, 'last'));
    expect([...doc.querySelectorAll('.ws-ws-section')].map((s) => s.querySelector('h2').textContent + '|' + s.querySelector('p').textContent)).toEqual(['Say It|Listen.', 'Rhyme Time|Read.', 'Missing Letter|Read.']);
    expect([...doc.querySelectorAll('.ws-ws-num')].map((n) => n.textContent)).toEqual(['1.', '2.', '3.', '4.']);
    const key = doc.querySelectorAll('.ws-ws-key');
    expect(key).toHaveLength(1);
    expect([...key[0].querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Say It', 'Rhyme Time', 'Missing Letter']);
    expect([...key[0].querySelectorAll('ol')].map((ol) => ol.getAttribute('start'))).toEqual(['1', '3', '4']);
    expect([...key[0].querySelectorAll('li')].map((li) => li.textContent)).toEqual(['cat — /k/ /a/ /t/', 'fish — /f/ /i/ /sh/', 'cat — hat', 'fish — s']);
    const none = parse(P.wsPrintSheets(sections, '', TEXT, picture, 'none'));
    expect([...none.querySelectorAll('.ws-ws-say h3')].map((h) => h.textContent), 'only the listening section').toEqual(['Say It']);
  });
});

describe('blank sheet and sorting cards', () => {
  it('Blank sheet: five rows of empty frames and the chosen number of boxes, then three handwriting rows', () => {
    const doc = parse(P.wsPrintBlank(4, { title: 'Sound boxes', name: 'Name:', directions: 'Fill it.' }));
    const rows = doc.querySelectorAll('.ws-print-row');
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.querySelectorAll('.ws-print-box')).toHaveLength(4);
      expect(row.querySelector('.ws-print-cue-blank')).toBeTruthy();
    }
    expect(doc.querySelectorAll('.ws-ws-blank-rows .ws-ws-guide')).toHaveLength(3);
  });
  it('Sorting cards: header cards with their caption, picture-only cards when asked, the word when there is no picture', () => {
    const doc = parse(P.wsPrintCards([
      { word: '/k/', head: true, kicker: 'Starts with' }, { word: 'Something else', head: true },
      { word: 'cat', image: pics.cat, pictureOnly: true }, { word: 'kite', image: null, pictureOnly: true },
    ], 8, '', null));
    const cards = [...doc.querySelectorAll('.ws-print-card')];
    expect(cards.map((c) => c.className)).toEqual(['ws-print-card ws-print-head', 'ws-print-card ws-print-head', 'ws-print-card ws-print-pic', 'ws-print-card']);
    expect(cards[0].querySelector('.ws-print-kicker').textContent).toBe('Starts with');
    expect(cards[0].querySelector('.ws-print-word').textContent).toBe('/k/');
    expect(cards[2].querySelector('.ws-print-word')).toBeNull();
    expect(cards[2].querySelector('img').getAttribute('alt')).toBe('cat');
    expect(cards[3].querySelector('.ws-print-word').textContent).toBe('kite');
    expect(doc.querySelector('.ws-print-page').className).toBe('ws-print-page ws-print-8');
  });
});

// ---- Through the real Print materials dialog ----
let written;
const lastDoc = () => parse(written[written.length - 1]);
beforeAll(() => { loadModal(); });
beforeEach(() => {
  written = [];
  vi.spyOn(window, 'open').mockImplementation(() => ({ document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn(), images: [] }, focus: vi.fn(), print: vi.fn() }));
});
afterEach(() => { unmountAll(); vi.restoreAllMocks(); document.documentElement.removeAttribute('lang'); });

const plain = (word, phonemes) => ({ id: 'w-' + word, term: word, word, targetWord: word, displayWord: word, phonemes, phonemeCount: phonemes.length });
const teacher = { isTeacherMode: true, allowRuntimeAi: true, callGemini: async () => '', callTTS: async () => null };
async function openDialog(host) {
  await click(host.querySelector('[data-ws-share-open]'));
  await click(host.querySelector('[data-ws-print-open]'));
  await settle(10);
  return host.querySelector('[data-ws-print-dialog]');
}
async function dialog(extra = {}) {
  const { host } = await mount({ ...teacher, words: [makePackItem(), makeHatItem()], ...extra });
  return openDialog(host);
}
const choose = (select, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
});
const items = (doc) => [...doc.querySelectorAll('.ws-ws-item')].map((li) => li.querySelector('.ws-ws-prompt').textContent + ' [' + [...li.querySelectorAll('.ws-ws-choice')].map((c) => c.textContent).join(',') + ']');

describe('the dialog', () => {
  it('groups Version, How many, Answer key and Easier together, with Large print for every printout', async () => {
    const d = await dialog();
    const options = d.querySelector('[data-ws-print-options]');
    expect(options.tagName).toBe('FIELDSET');
    for (const sel of ['[data-ws-print-version]', '[data-ws-print-count]', '[data-ws-print-key]', '[data-ws-print-easier]']) expect(options.querySelector(sel), sel).toBeTruthy();
    expect([...options.querySelector('[data-ws-print-version]').options].map((o) => o.value + '=' + o.textContent)).toEqual(['A=A (list order)', 'B=B', 'C=C', 'mix=New mix']);
    expect([...options.querySelector('[data-ws-print-count]').options].map((o) => o.textContent)).toEqual(['5', '10', 'All']);
    expect(options.querySelector('[data-ws-print-count]').value).toBe('0');
    expect([...options.querySelector('[data-ws-print-key]').options].map((o) => o.textContent)).toEqual(['On the last page', 'As a separate printout', 'No key']);
    expect(d.querySelector('[data-ws-print-large]').closest('label').textContent).toBe('Large print');
    expect(d.querySelector('[data-ws-print="review"]').disabled, 'needs two activities').toBe(true);
  });

  it('Version A prints the Present order unchanged; B reorders, labels the sheet and the key, and its key matches the sheet', async () => {
    const words = ['cat', 'fish', 'stamp', 'ship', 'cup', 'hat', 'map', 'dog'].map((w) => plain(w, [...w]));
    const { host } = await mount({ ...teacher, words });
    let d = await openDialog(host);
    await choose(d.querySelector('[data-ws-print-activity]'), 'segmentation');
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    const defaultHtml = written[written.length - 1];
    await choose(d.querySelector('[data-ws-print-version]'), 'A');
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    expect(written[written.length - 1], 'choosing A is the default').toBe(defaultHtml);
    let doc = lastDoc();
    expect(doc.querySelector('.ws-ws-form')).toBeNull();
    const keyA = [...doc.querySelectorAll('.ws-ws-key li')].map((li) => li.textContent);
    expect(keyA).toEqual(['cat — /c/ /a/ /t/', 'fish — /f/ /i/ /s/ /h/', 'stamp — /s/ /t/ /a/ /m/ /p/', 'ship — /s/ /h/ /i/ /p/', 'cup — /c/ /u/ /p/', 'hat — /h/ /a/ /t/', 'map — /m/ /a/ /p/', 'dog — /d/ /o/ /g/']);
    await choose(d.querySelector('[data-ws-print-version]'), 'B');
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    doc = lastDoc();
    expect(doc.querySelector('.ws-ws-form').textContent).toBe('Form B');
    expect(doc.querySelector('.ws-ws-key h2').textContent).toBe('Answer key · Form B');
    const keyB = [...doc.querySelectorAll('.ws-ws-key li')].map((li) => li.textContent);
    expect(keyB).not.toEqual(keyA);
    expect([...keyB].sort()).toEqual([...keyA].sort());
    // The boxes on the sheet follow the key's order.
    expect([...doc.querySelectorAll('.ws-ws-item')].map((li) => li.querySelectorAll('.ws-ws-box').length)).toEqual(keyB.map((line) => line.split('/').length / 2 | 0));
  });

  it('New mix draws a new seed each print and prints it on the sheet and the key', async () => {
    const d = await dialog();
    await choose(d.querySelector('[data-ws-print-activity]'), 'rhyming');
    await choose(d.querySelector('[data-ws-print-version]'), 'mix');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    let doc = lastDoc();
    expect(doc.querySelector('.ws-ws-form').textContent).toBe('Mix 5500');
    expect(doc.querySelector('.ws-ws-key h2').textContent).toBe('Answer key · Mix 5500');
    random.mockReturnValue(0.25);
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    expect(lastDoc().querySelector('.ws-ws-form').textContent).toBe('Mix 3250');
  });

  it('How many prints 5, 10 or all of the items', async () => {
    const words = Array.from({ length: 12 }, (_, i) => plain('w' + String.fromCharCode(97 + i) + 'x', ['w', String.fromCharCode(97 + i), 'x']));
    const { host } = await mount({ ...teacher, words });
    const d = await openDialog(host);
    await choose(d.querySelector('[data-ws-print-activity]'), 'segmentation');
    for (const [value, n] of [['5', 5], ['10', 10], ['0', 12]]) {
      await choose(d.querySelector('[data-ws-print-count]'), value);
      await click(d.querySelector('[data-ws-print="worksheet"]'));
      expect(lastDoc().querySelectorAll('.ws-ws-item'), value).toHaveLength(n);
      expect(lastDoc().querySelectorAll('.ws-ws-key li'), 'the key has the same items').toHaveLength(n);
    }
  });

  it('Easier: 2 choices keeps the right answer, and the key still gives it', async () => {
    const d = await dialog();
    await choose(d.querySelector('[data-ws-print-activity]'), 'rhyming');
    await click(d.querySelector('[data-ws-print-easier]'));
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    const doc = lastDoc();
    expect(items(doc)).toEqual(['Which word rhymes with cat? [hat,dog]', 'Which word rhymes with hat? [cat,dog]']);
    expect([...doc.querySelectorAll('.ws-ws-key li')].map((li) => li.textContent)).toEqual(['cat — hat', 'hat — cat']);
  });

  it('As a separate printout: a button on the sheet prints the key, and the dialog says where it is', async () => {
    const d = await dialog();
    await choose(d.querySelector('[data-ws-print-activity]'), 'isolation');
    await choose(d.querySelector('[data-ws-print-key]'), 'separate');
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    const doc = lastDoc();
    expect(doc.querySelector('.ws-ws-key')).toBeNull();
    expect(doc.querySelector('[data-ws-open-key]').textContent).toBe('Print the answer key');
    expect(doc.querySelector('#ws-key-blocked').hidden).toBe(true);
    const key = parse('<!doctype html><body>' + doc.querySelector('template#ws-key-doc').innerHTML + '</body>');
    expect([...key.querySelectorAll('.ws-ws-teacher h2')].map((h) => h.textContent)).toEqual(['Answer key', 'For the teacher: what to say for each number']);
    expect([...key.querySelectorAll('.ws-ws-say li')].map((li) => li.textContent)).toEqual(['cat', 'hat']);
    expect(written[written.length - 1]).toContain('function wsOpenKey()');
    expect(d.querySelector('[role="status"]').textContent).toContain('Print the answer key from the button at the top of that window.');
  });

  it('Large print sets a 1.5 times larger root size after the print CSS, so worksheet type (in rem) grows', async () => {
    const d = await dialog();
    await click(d.querySelector('[data-ws-print-large]'));
    for (const kind of ['worksheet', 'boxes', 'cards', 'blank']) {
      await click(d.querySelector('[data-ws-print="' + kind + '"]'));
      const css = lastDoc().querySelector('style').textContent;
      expect(css.indexOf('html{font-size:24px}'), kind).toBeGreaterThan(css.indexOf('.ws-ws-prompt{margin:0 0 8px;font-size:1.25rem'));
      expect(css, kind).toContain('.ws-print-box{flex-basis:1.15in;width:1.15in}');
    }
    await click(d.querySelector('[data-ws-print-large]'));
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    expect(lastDoc().querySelector('style').textContent).not.toContain('html{font-size:24px}');
  });

  it('Large print measures 1.5 times larger in Chromium', async () => {
    const d = await dialog();
    await choose(d.querySelector('[data-ws-print-activity]'), 'segmentation');
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    const normal = written[written.length - 1];
    await click(d.querySelector('[data-ws-print-large]'));
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    const large = written[written.length - 1];
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
      await page.emulateMedia({ media: 'print' });
      const measure = async (html) => { await page.setContent(html.replace(/<script>[\s\S]*?<\/script>/g, '')); return page.evaluate(() => ({
        prompt: parseFloat(getComputedStyle(document.querySelector('.ws-ws-prompt')).fontSize),
        box: document.querySelector('.ws-ws-box').getBoundingClientRect().width,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 })); };
      const a = await measure(normal), b = await measure(large);
      expect(a.prompt).toBe(20);
      expect(b.prompt).toBe(30);
      expect(b.box / a.box).toBeCloseTo(1.5, 1);
      expect(b.overflow).toBe(false);
    } finally { await browser.close(); }
  }, 60000);

  it('Review sheet: two activities chosen, continuous numbers, one key', async () => {
    const d = await dialog();
    await click(d.querySelector('[data-ws-print-review="rhyming"]'));
    expect(d.querySelector('[data-ws-print="review"]').disabled).toBe(true);
    await click(d.querySelector('[data-ws-print-review="isolation"]'));
    expect(d.querySelector('[data-ws-print="review"]').disabled).toBe(false);
    await click(d.querySelector('[data-ws-print="review"]'));
    const doc = lastDoc();
    expect(doc.querySelector('h1').textContent).toBe('Review sheet');
    expect([...doc.querySelectorAll('.ws-ws-section h2')].map((h) => h.textContent)).toEqual(['Find Sounds', 'Rhyme Time']);
    expect([...doc.querySelectorAll('.ws-ws-num')].map((n) => n.textContent)).toEqual(['1.', '2.', '3.', '4.']);
    expect(doc.querySelectorAll('.ws-ws-key')).toHaveLength(1);
    expect([...doc.querySelectorAll('.ws-ws-key ol')].map((ol) => ol.getAttribute('start'))).toEqual(['1', '3']);
  });

  it('allows at most four activities on a review sheet', async () => {
    const d = await dialog();
    const boxes = [...d.querySelectorAll('[data-ws-print-review]')];
    for (const box of boxes.slice(0, 4)) await click(box);
    expect(boxes.slice(4).every((b) => b.disabled)).toBe(true);
    expect(boxes.slice(0, 4).every((b) => b.checked && !b.disabled)).toBe(true);
  });

  it('Blank sheet uses the chosen number of boxes', async () => {
    const d = await dialog();
    await choose(d.querySelector('[data-ws-print-blank-boxes]'), '5');
    await click(d.querySelector('[data-ws-print="blank"]'));
    const rows = lastDoc().querySelectorAll('.ws-print-row');
    expect(rows).toHaveLength(5);
    expect([...rows].every((r) => r.querySelectorAll('.ws-print-box').length === 5)).toBe(true);
    expect(lastDoc().querySelector('.ws-print-row img')).toBeNull();
  });

  it('Sorting cards: header cards from the prepared board, then a card for every word on it', async () => {
    const d = await dialog();
    expect(d.querySelector('[data-ws-print-sort-activity]'), 'sound sort and word families').toBeTruthy();
    await choose(d.querySelector('[data-ws-print-sort-activity]'), 'sound_sort');
    await click(d.querySelector('[data-ws-print="sort"]'));
    let doc = lastDoc();
    const heads = [...doc.querySelectorAll('.ws-print-head')].map((c) => (c.querySelector('.ws-print-kicker')?.textContent || '') + '|' + c.querySelector('.ws-print-word').textContent);
    expect(heads).toEqual(['Starts with|/k/', '|Something else']);
    const cards = [...doc.querySelectorAll('.ws-print-card:not(.ws-print-head) .ws-print-word')].map((p) => p.textContent).sort();
    expect(cards).toEqual(['key', 'kite', 'map', 'sun']);
    await choose(d.querySelector('[data-ws-print-sort-activity]'), 'word_families');
    await click(d.querySelector('[data-ws-print="sort"]'));
    doc = lastDoc();
    expect([...doc.querySelectorAll('.ws-print-head .ws-print-word')].map((p) => p.textContent)).toEqual(['-at', 'Something else']);
    // With the word off a card with a picture is the picture alone (mat has none in this fixture).
    await click(d.querySelector('[data-ws-print-sort-word]'));
    await click(d.querySelector('[data-ws-print="sort"]'));
    doc = lastDoc();
    const pictured = [...doc.querySelectorAll('.ws-print-pic')];
    expect(pictured.map((c) => c.querySelector('img').getAttribute('alt')).sort()).toEqual(['bat', 'dog', 'hat', 'sun']);
    expect(pictured.every((c) => !c.querySelector('.ws-print-word'))).toBe(true);
    expect([...doc.querySelectorAll('.ws-print-card:not(.ws-print-head):not(.ws-print-pic) .ws-print-word')].map((p) => p.textContent).sort(), 'no picture: the word stays').toEqual(['mat']);
  });
});

describe('lesson language on the student pages', () => {
  // The interface is "Spanish" (every string comes back marked ES); the lesson is English.
  async function mountSpanishUi(extra = {}) {
    document.documentElement.setAttribute('lang', 'es');
    const props = { ...studentProps('rhyming', []), ...teacher, wsPreloadedWords: [makePackItem(), makeHatItem()], ...extra };
    props.getWordSoundsString = (_t, key) => (english[key.replace('word_sounds.', '')] ? 'ES ' + english[key.replace('word_sounds.', '')] : key);
    props.t = (key) => key;
    for (const name of ['setWordSoundsScore', 'onScoreUpdate', 'setWordSoundsHistory', 'setCurrentWordSoundsWord', 'setWordSoundsActivity', 'setWordSoundsFeedback', 'setWordSoundsPhonemes', 'onClose']) props[name] = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = client.createRoot(host);
    mounted.push({ host, root });
    await act(async () => { root.render(React.createElement(Modal, props)); await wait(30); });
    return openDialog(host);
  }
  it('an English lesson gets English student text, while the teacher pages stay in the interface language', async () => {
    const d = await mountSpanishUi({ wordSoundsLanguage: 'en' });
    await choose(d.querySelector('[data-ws-print-activity]'), 'isolation');
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    const doc = lastDoc();
    expect(doc.documentElement.getAttribute('lang')).toBe('es');
    const student = doc.querySelector('main > div[lang]');
    expect(student.getAttribute('lang')).toBe('en');
    expect(student.querySelector('.ws-print-name span').textContent).toBe('Student name:');
    expect(student.querySelector('.ws-ws-prompt').textContent).toBe('What is the first sound you hear?');
    expect(student.querySelector('.ws-ws-key')).toBeNull();
    const key = doc.querySelector('main > .ws-ws-key');
    expect(key.querySelector('h2').textContent).toBe('ES Answer key');
  });
  it('a lesson in the interface language keeps one language and no extra wrapper', async () => {
    const d = await mountSpanishUi({ wordSoundsLanguage: 'es' });
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    const doc = lastDoc();
    expect(doc.querySelector('main > div[lang]')).toBeNull();
    expect(doc.querySelector('.ws-print-name span').textContent).toBe('ES Student name:');
  });
});
