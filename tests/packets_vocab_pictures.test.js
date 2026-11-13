// @vitest-environment jsdom
// Picture questions in vocabulary files (2026-11-12): "Which picture shows this word?" (vocab_picture, 4 pictures)
// and "Which word goes with this picture?" (vocab_picture_word), only for list words with a picture in the Word
// Sounds picture set (word_sounds_symbols_en.js, Mulberry Symbols and OpenMoji), offered when at least 4 list words
// have one. The other pictures are pictures of other list words, then of the word list's wrong-answer words, and never
// a second right answer. Each set is credited in the file, and its notice carried, as in a Word Sounds file. Also
// here: the online lookup page for words the word list does not have (packets-vocab-lookup.html), and the maker's
// step 3 for pictures and recordings.
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const V = require('../packet_vocab_builder.js');
const art = require('../word_sounds_packet_builder.js');
const symbols = require('../word_sounds_symbols_en.js');
for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));
const bank = require('./fixtures/packets_vocab_bank_fixture.js');
const verify = require('../packets_verify_core.js');
const reader = require('../packets_results_reader.js');
await bank.load();

const WORDS = 'bat, nest, owl, hunt, habitat, alien, cat';
const IDS = ['vocab_picture', 'vocab_picture_word'];
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const rowsOf = (words = WORDS, edits) => V.draftRows({ words: V.parseWords(words).words, bank, edits, pictures: symbols });
const make = ({ words = WORDS, types = ['picture', 'picword'], mode = 'practice', edits, ...more } = {}) => {
  const rows = rowsOf(words, edits);
  const lesson = V.lessonFromVocab({ loader: TH, rows, types, mode, pictures: symbols, art, ...more });
  return { rows, lesson, ...V.buildVocabPacket({ lesson, loader: TH, rows, bank, ...more }) };
};
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function play(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/v.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.speechSynthesis = { getVoices: () => [{ lang: 'en-US', localService: true, name: 'On device' }], cancel() {}, speak() {}, addEventListener() {} };
    w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  } });
  opened.push(dom.window);
  const d = dom.window.document;
  const seen = (n) => !!n && !n.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  return { w: dom.window, d, seen, button, start: () => { d.getElementById('learner-name').value = 'Owl1'; (button('Start') || d.querySelector('#app button.primary')).click(); if (d.querySelector('[data-check-begin]')) d.querySelector('[data-check-begin]').click(); } };
}

describe('the two picture activities in the engine', () => {
  it('are built in, beside the check activities the app never lists, and are the same code apart from the prefix of their labels', () => {
    for (const id of IDS) { expect(TH.CHECK_ADAPTERS[id], id).toBeTruthy(); expect(TH.ADAPTERS[id]).toBeUndefined(); }
    const plain = (a, part) => a[part].toString().split(a.id + '_').join('X_');
    for (const part of ['prepare', 'render', 'score']) expect(plain(TH.CHECK_ADAPTERS.vocab_picture_word, part), part).toBe(plain(TH.CHECK_ADAPTERS.vocab_picture, part));
    for (const id of IDS) {
      const a = TH.CHECK_ADAPTERS[id];
      expect(a.render.toString()).not.toMatch(/\b(?:document|window|localStorage|sessionStorage|globalThis)\b/);
      expect(a.render.toString()).toContain('v.localService === true');
      expect(Object.values(a.labels).join('\n')).not.toMatch(/\b(?:tests?|quiz|learners?|assessments?)\b|licence|colour/i);
    }
  });

  it('take pictures as choices, or one picture as the question, never both, and different pictures', () => {
    const A = TH.CHECK_ADAPTERS.vocab_picture;
    const good = { word: 'cat', ask: 'cat', choices: [{ text: 'cat', image: 'p1' }, { text: 'dog', image: 'p2' }, { text: 'sun', image: 'p3' }, { text: 'pen', image: 'p4' }], answer: 'cat', read: true };
    expect(A.prepare(good).item.choices[0]).toEqual({ text: 'cat', image: 'p1' });
    expect(A.prepare({ ...good, image: 'p9' }).missing).toEqual(['pictures']);
    expect(A.prepare({ ...good, choices: good.choices.map((c, i) => (i ? c : { text: 'cat' })) }).missing).toEqual(['pictures']);
    expect(A.prepare({ ...good, choices: good.choices.map((c) => ({ ...c, image: 'p1' })) }).missing).toEqual(['different pictures']);
    expect(A.prepare({ ...good, choices: good.choices.map((c) => ({ ...c, image: 'javascript:x' })) }).missing).toEqual(['pictures']);
    const B = TH.CHECK_ADAPTERS.vocab_picture_word;
    expect(B.prepare({ word: 'cat', ask: 'picture', image: 'p1', choices: ['cat', 'dog', 'sun', 'pen'], answer: 'cat', read: true }).item).toEqual({ word: 'cat', ask: 'picture', image: 'p1',
      choices: [{ text: 'cat' }, { text: 'dog' }, { text: 'sun' }, { text: 'pen' }], answer: 'cat', read: true, lang: 'en' });
  });
});

describe('the builder', () => {
  it('offers picture questions when at least 4 list words have a picture, and says why not otherwise', () => {
    expect(V.pictureCount(rowsOf())).toEqual({ withPicture: 6, offered: true, need: 4 });
    expect(V.pictureCount(rowsOf('bat, nest, habitat, predator'))).toEqual({ withPicture: 2, offered: false, need: 4 });
    const habitat = rowsOf().find((r) => r.word === 'habitat');
    expect(V.rowStop(habitat, 'picture')).toBe('The picture set has no picture for it.');
    // Without the picture set no row has a picture.
    expect(V.draftRows({ words: V.parseWords(WORDS).words, bank }).every((r) => !r.picture && !r.pictureWrong.length)).toBe(true);
  });

  it('never makes a second right answer: not the word, not a form of it, not the same picture, no close meaning', () => {
    const rows = rowsOf('bat, nest, owl, hunt, ant, ants, apple, cat, kitten');
    for (const row of rows.filter((r) => r.picture)) {
      const files = [row.picture].concat(row.pictureWrong.map((c) => c.picture));
      expect(new Set(files).size, row.word).toBe(files.length);
      for (const c of row.pictureWrong) {
        expect(c.key, row.word).not.toBe(row.key);
        expect([c.key, row.key].sort().join('/'), row.word).not.toBe('ant/ants');
      }
    }
    // A word for a group of things (an orange is food) is never asked and never one of the other pictures.
    const food = rowsOf('apple, fruit, banana, orange, food, bread, cake, milk, toys');
    for (const w of ['fruit', 'food', 'toys']) expect(V.rowStop(food.find((r) => r.word === w), 'picture'), w).toBe('It is a word for a group of things, so more than one picture could show it.');
    for (const row of food) for (const c of row.pictureWrong) expect(['fruit', 'food', 'toys'], row.word).not.toContain(c.word);
  });

  it('puts the pictures in the file as data, names nothing in their ids, and credits each set with its notice', () => {
    const made = make();
    const lesson = lessonOf(made.html);
    const images = Object.keys(lesson.images);
    expect(images.length).toBeGreaterThanOrEqual(4);
    for (const id of images) { expect(id).toMatch(/^p[0-9a-f]{8}$/); expect(lesson.images[id]).toMatch(/^data:image\/svg\+xml;base64,/); }
    expect(lesson.blocks.map((b) => b.activity)).toEqual(['vocab_picture', 'vocab_picture_word']);
    const credits = made.manifest.attributions.join('\n');
    expect(credits).toContain('Mulberry Symbols by Steve Lee, CC BY-SA 4.0');
    expect(credits).toMatch(/designed by OpenMoji/);
    expect(made.manifest.notices.map((n) => n.id).sort()).toEqual(['mulberry', 'openmoji']);
    const r = verify.verifyPacket(made.html);
    expect([r.ok, r.result, r.script.verdict]).toEqual([true, 'closed', 'agree']);
    expect(r.counts).toMatchObject({ notExpected: 0, look: 0 });
    // A file with no picture question has no picture and no picture credit.
    const plain = make({ types: ['meaning'], words: 'habitat, predator, prey, cell, bat, adapt, camouflage, ancient' });
    expect(lessonOf(plain.html).images).toEqual({});
    expect(plain.manifest.attributions.join('\n')).not.toMatch(/Mulberry|OpenMoji/);
  });

  it('leaves a word out of the picture questions when the teacher says so, and keeps that in the file', () => {
    const made = make({ edits: { words: { bat: { noPicture: true } } } });
    const asked = lessonOf(made.html).blocks.flatMap((b) => b.items.map((it) => it.word));
    expect(asked).not.toContain('bat');
    expect(made.manifest.vocab.noPicture).toEqual(['bat']);
    expect(V.readBack({ manifest: made.manifest, lesson: lessonOf(made.html) }).noPicture).toEqual(['bat']);
  });
});

describe('in the file', () => {
  it('Word to picture: 4 pictures named "Picture 1" until the question is over, no Hear all; Picture to word: Hear all reads the words', async () => {
    const made = make();
    const p = play(made.html);
    p.start();
    const shows = () => [...p.d.querySelectorAll('[data-choice]')];
    expect(shows()).toHaveLength(4);
    expect(shows().map((b) => b.getAttribute('aria-label'))).toEqual(['Picture 1', 'Picture 2', 'Picture 3', 'Picture 4']);
    expect(shows().every((b) => b.querySelector('img').getAttribute('alt') === '')).toBe(true);
    expect(p.d.querySelector('[data-hear-all]')).toBeNull();
    const item = lessonOf(made.html).blocks[0].items[0];
    const right = item.choices.findIndex((c) => c.text === item.answer);
    shows()[right].click();
    expect(shows()[right].getAttribute('aria-label')).toBe('Picture ' + (right + 1) + ': ' + item.answer);
    expect(p.d.querySelector('#app .status').textContent).toBe('Yes. That picture shows it.');
    // On to Picture to word.
    for (let i = 0; i < 20 && !/Picture to word/.test(p.d.querySelector('#app h2').textContent); i++) {
      (p.button('Next') || p.button('See my results')).click();
      const it = p.d.querySelector('[data-choice="1"]');
      if (it && !p.button('Next')) { it.click(); if (!p.button('Next')) p.d.querySelector('[data-choice="2"]').click(); }
    }
    expect(p.d.querySelector('#app h2').textContent).toMatch(/^Picture to word: 1 of /);
    expect(p.d.querySelectorAll('#app img')).toHaveLength(1);
    expect(p.seen(p.d.querySelector('[data-hear-all]'))).toBe(true);
  });

  it('works as a check too: one try, a score, the pictures kept', () => {
    const made = make({ mode: 'check' });
    const lesson = lessonOf(made.html);
    expect(Object.keys(lesson.images).length).toBeGreaterThanOrEqual(4);
    expect(lesson.blocks[1].items.every((it) => /^Picture \d+$/.test(it.word))).toBe(true);
    const p = play(made.html);
    p.start();
    expect(p.d.querySelectorAll('[data-choice]')).toHaveLength(4);
  });

  it('the results readers know their names', () => {
    expect(read('packets_results_reader.js')).toContain("vocab_picture: ['Word to picture', 'vocabulary'],");
    expect(read('packets_results_reader.js')).toContain("vocab_picture_word: ['Picture to word', 'vocabulary'],");
    for (const f of ['student_analytics_module.js', 'desktop/web-app/public/student_analytics_module.js']) expect(read(f), f).toContain("vocab_picture_word: ['Picture to word', 'vocabulary']");
    expect(typeof reader).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// The lookup page
// ---------------------------------------------------------------------------
const EDITS_KEY = 'alloflow-packets-vocab-edits/1';
function lookupPage({ answer } = {}) {
  const dom = new JSDOM(read('packets-vocab-lookup.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab-lookup.html#word=photosynthesis' });
  const w = dom.window;
  opened.push(w);
  const asked = [];
  w.fetch = (url, opts) => { asked.push([url, opts]); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(answer) }); };
  w.eval(read('packets-page.js'));
  w.eval(read('packets-vocab-lookup.js'));
  return { w, d: w.document, $: (id) => w.document.getElementById(id), asked };
}
const ANSWER = [{ word: 'photosynthesis', license: { name: 'CC BY-SA 3.0', url: 'x' }, sourceUrls: ['https://en.wiktionary.org/wiki/photosynthesis'],
  meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The process by which plants use light to make food.', example: 'Photosynthesis happens in leaves.' }, { definition: 'Any similar process.' }] }] }];

describe('Look up a word online (packets-vocab-lookup.html)', () => {
  it('may reach that one dictionary and nothing else, and says so before anything is sent', () => {
    const doc = new JSDOM(read('packets-vocab-lookup.html')).window.document;
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'))
      .toBe("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src https://api.dictionaryapi.dev; form-action 'none'; base-uri 'none'");
    expect([...doc.querySelectorAll('script')].map((s) => s.getAttribute('src'))).toEqual(['packets-page.js', 'packets-vocab-lookup.js']);
    expect(doc.querySelectorAll('style, [style]')).toHaveLength(0);
    expect(doc.getElementById('online-about').textContent).toMatch(/the word you typed is sent to the Free Dictionary API \(api\.dictionaryapi\.dev\)/);
    const js = read('packets-vocab-lookup.js');
    expect([...new Set(js.match(/https?:\/\/[^'"\s,)]+/g))].every((u) => u.indexOf('https://api.dictionaryapi.dev') === 0)).toBe(true);
    expect(js).toContain("var API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';");
    expect(js).not.toMatch(/innerHTML|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest/);
  });

  it('sends nothing until the switch is on and Look it up is pressed, then only the word; the meaning chosen goes to the maker, marked', async () => {
    const p = lookupPage({ answer: ANSWER });
    expect(p.$('word').value).toBe('photosynthesis');
    expect(p.$('online-on').checked).toBe(false);
    p.$('look').click();
    expect(p.asked).toEqual([]);
    expect(p.$('look-line').textContent).toMatch(/Nothing has been sent/);
    p.$('online-on').checked = true;
    p.$('look').click();
    await wait(10);
    expect(p.asked.map((a) => a[0])).toEqual(['https://api.dictionaryapi.dev/api/v2/entries/en/photosynthesis']);
    expect(p.asked[0][1]).toMatchObject({ credentials: 'omit' });
    expect([...p.d.querySelectorAll('input[name="meaning"]')]).toHaveLength(2);
    p.d.querySelectorAll('input[name="meaning"]')[0].checked = true;
    p.$('use').click();
    const edits = JSON.parse(p.w.localStorage.getItem(EDITS_KEY));
    expect(edits.words.photosynthesis).toMatchObject({ def: 'The process by which plants use light to make food', pos: 'noun', example: 'Photosynthesis happens in leaves.',
      net: { def: 'The process by which plants use light to make food', license: 'CC BY-SA 3.0' } });
    // The maker shows it marked, and the file credits it.
    const rows = V.draftRows({ words: V.parseWords('photosynthesis, habitat, predator, prey').words, bank, edits });
    const row = rows.find((r) => r.word === 'photosynthesis');
    expect([row.own, row.def, row.net.changed]).toEqual([true, 'The process by which plants use light to make food', false]);
    expect(V.creditLines(bank, rows).join('\n')).toContain('Meanings found on the internet and not checked: photosynthesis (from Wiktionary, through the Free Dictionary API (dictionaryapi.dev), license CC BY-SA 3.0).');
    expect(V.creditLines(bank, rows).join('\n')).not.toContain('Meanings written by the teacher: photosynthesis');
  });
});

// ---------------------------------------------------------------------------
// The maker, step 3
// ---------------------------------------------------------------------------
const PAGE_SCRIPTS = ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_zip.js', 'packets_handoff.js', 'packets_vocab_bank_en.js',
  'word_sounds_symbols_en.js', 'word_sounds_packet_builder.js', 'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-vocab.js'];
async function maker() {
  const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab.html' });
  const w = dom.window, d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  // The picture files, read from disk in place of the site.
  w.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(read(String(url))) });
  for (const src of PAGE_SCRIPTS) w.eval(src === 'packets_vocab_bank_en.js' ? read('tests/fixtures/packets_vocab_bank_fixture.js') : read(src));
  await wait(5);
  const $ = (id) => d.getElementById(id);
  const fire = (n, t) => n.dispatchEvent(new w.Event(t, { bubbles: true }));
  return { w, d, $, fire, type: async (text) => { $('f-words').value = text; fire($('f-words'), 'input'); await wait(300); } };
}

describe('the maker page', () => {
  it('loads the picture list, the picture credits and its own loader for recordings, and its rule allows pictures as data only', () => {
    const doc = new JSDOM(read('packets-vocab.html')).window.document;
    expect([...doc.querySelectorAll('script')].map((s) => s.getAttribute('src'))).toEqual(PAGE_SCRIPTS);
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("img-src 'self' data:; connect-src 'self';");
    expect(doc.getElementById('f-voices')).toBeTruthy();
  });

  it('step 3: picture questions are off and closed with fewer than 4 pictured words, and say why; with 4 they can be chosen and checked', async () => {
    const p = await maker();
    await p.type('habitat, predator, prey, cell, bat, nest');
    p.$('next-1').click();
    p.$('next-2').click();
    await wait(60);
    const box = (id) => p.d.querySelector('[data-type="' + id + '"]');
    expect([box('picture').disabled, box('picture').checked]).toEqual([true, false]);
    expect(box('picture').closest('label').querySelector('.choice-note').textContent).toBe('Only 2 of 6 words have a picture. Picture questions need at least 4, so that the other pictures are mostly words from your list.');
    p.$('back-3').click();
    p.$('back-2').click();
    await p.type('bat, nest, owl, hunt, habitat, predator');
    p.$('next-1').click();
    p.$('next-2').click();
    await wait(60);
    expect(box('picture').disabled).toBe(false);
    box('picture').checked = true; p.fire(box('picture'), 'change');
    for (let i = 0; i < 50 && !p.d.querySelector('[data-picture-row="bat"] img'); i++) await wait(40);
    expect(p.$('picture-panel').hidden).toBe(false);
    expect(p.d.querySelectorAll('[data-picture-row="bat"] img')).toHaveLength(4);
    expect(p.d.querySelector('[data-no-picture="bat"]').checked).toBe(false);
    for (let i = 0; i < 50 && p.$('summary').hidden; i++) await wait(40);
    expect([...p.$('summary-rows').querySelectorAll('dt')].map((n) => n.textContent)).toContain('Pictures');
  });
});
