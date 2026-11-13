import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// The owner-approved math and vocabulary fixes of AlloFlow Packets, 2026-11-13, second pass (the list, L1 to L16, is in
// C:\tmp\packets_build_1111\polish_mv\FINDINGS.md; notes in C:\tmp\packets_build_1111\polish_mv2\NOTES.txt):
//   L1  Fill the blank takes a sentence with a plain form of the word (predators, condensed), the wrong words written the same way.
//   L2  A list word typed in another form (cats): Meaning to word writes the wrong words the same way, or asks for the base word.
//   L3  A blank (___) is a line on screen and the word "blank" for a screen reader.
//   L6  A vocabulary check opens with one sample question, not scored.
//   L7  The Math Fluency sample is of the form's own operation and size.
//   L8  Make 10's known 1 + 9 and 9 + 1 take turns as one known fact: never side by side.
//   L9  Typed facts: a turnaround in the list is noted and kept apart; a known fact never gives a new one away.
//   L10 Missing Number shows the minus sign and says "minus".
//   L11 With both kinds on, Meaning to word comes first: no meaning is a choice before it is asked.
//   L12 Fill the blank's wrong words are of the same kind; the bank's "does not fit" words fill a short list.
//   L13 The check maker notes answers below 0.
//   L14 Numbers of 10000 or more are grouped in threes; a problem stays on one line.
//   L16 A check that allows remainders tells the student to leave them out.
// The adapters (word_sounds_take_home/check_adapters) are run from their FILES in place of the copies in the loader, so
// these pass before the loader is rebuilt (node dev-tools/build_word_sounds_take_home.cjs) and after.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const ADAPTERS = ['math_computation', 'missing_number', 'math_ccc', 'math_rehearsal', 'vocab_meaning', 'vocab_word', 'vocab_blank'];
const parts = {};
parts.window = parts;
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
for (const id of ADAPTERS) TH.CHECK_ADAPTERS[id] = require('../word_sounds_take_home/check_adapters/' + id + '.js');
// The same files, for a page run in jsdom: put in place of the loader's copies before the page's own script starts.
const adaptersInto = (w) => {
  for (const id of ADAPTERS) {
    const mod = { exports: {} };
    new w.Function('module', 'exports', read('word_sounds_take_home/check_adapters/' + id + '.js'))(mod, mod.exports);
    w.AlloWordSoundsTakeHome.CHECK_ADAPTERS[id] = mod.exports;
  }
};
const MP = require('../packet_math_practice_builder.js');
const PC = require('../packet_check_builder.js');
const V = require('../packet_vocab_builder.js');
const BANK = JSON.parse(read('psychometric_math_probes.json'));
const fixture = require('./fixtures/packets_vocab_bank_fixture.js');
await fixture.load();
// The real definition bank, fed its two data files by hand.
const real = require('../packets_vocab_bank_en.js');
if (!real.ready()) real.shards.forEach((s, i) => real.add(JSON.parse(read(s.url)), i + 1));

const MINUS = String.fromCharCode(0x2212), TIMES = String.fromCharCode(0xD7), GAP = String.fromCharCode(0x202F);
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

const rowsOf = (words, edits, bank = fixture) => V.draftRows({ words: V.parseWords(words).words, bank, edits });
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const texts = (item) => item.choices.map((c) => (typeof c === 'string' ? c : c.text));
// What is seen, and what a screen reader reads (aria-hidden parts left out).
const seenText = (node) => { const c = node.cloneNode(true); c.querySelectorAll('.sr').forEach((n) => n.remove()); return c.textContent; };
const heardText = (node) => { const c = node.cloneNode(true); c.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove()); return c.textContent; };

// A built file, played in jsdom with a device voice and a test clock.
function play(html) {
  const spoken = [], saved = [], time = { t: 1000 };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(blobParts) { this.body = blobParts.join(''); } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:x'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    w.speechSynthesis = { getVoices: () => [{ lang: 'en-US', localService: true, name: 'On device' }], cancel() {}, speak(u) { spoken.push(u.text); }, addEventListener() {} };
    w.SpeechSynthesisUtterance = function (text) { this.text = text; };
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const shown = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(shown).find((b) => b.textContent === text);
  const t = { w, d, spoken, time, q: (s) => d.querySelector(s), button, heading: () => d.querySelector('#app h2').textContent };
  t.json = () => { t.q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); };
  t.start = () => { d.getElementById('learner-name').value = 'Fox1'; (button('Start') || button('Next')).click(); };
  t.choices = () => [...d.querySelectorAll('[data-choice]')].map((b) => seenText(b).replace(/^\d/, ''));
  t.pick = (text) => { time.t += 400; const i = t.choices().indexOf(text); if (i < 0) throw Error('no choice ' + text + ' in ' + t.choices().join(' / ')); t.q('[data-choice="' + (i + 1) + '"]').click(); };
  t.type = (value) => { time.t += 400; const box = t.q('[data-pad-input]'); box.value = String(value); box.dispatchEvent(new w.Event('input', { bubbles: true })); box.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); };
  return t;
}
// A page of the site in jsdom, its own scripts in its order, the adapter files in place of the loader's copies.
function openPage(file, url, storage = {}) {
  const dom = new JSDOM(read(file), { runScripts: 'outside-only', pretendToBeVisual: true, url });
  const w = dom.window, d = w.document;
  opened.push(w);
  for (const [key, value] of Object.entries(storage)) w.localStorage.setItem(key, value);
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.fetch = async () => { throw new TypeError('Failed to fetch'); };
  w.Blob = class { constructor(blobParts) { this.body = blobParts.join(''); this.size = this.body.length; } };
  w.URL.createObjectURL = () => 'blob:x';
  w.URL.revokeObjectURL = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  for (const script of d.querySelectorAll('script[src]')) {
    const src = script.getAttribute('src');
    w.eval(read(src === 'packets_vocab_bank_en.js' ? 'tests/fixtures/packets_vocab_bank_fixture.js' : src));
    if (src === 'word_sounds_take_home_loader.js') adaptersInto(w);
  }
  const $ = (id) => d.getElementById(id);
  const until = async (ok, what) => { for (let i = 0; i < 2000; i++) { if (ok()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out: ' + what); };
  const choose = (name, value) => { const r = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); r.checked = true; r.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const set = (id, value) => { $(id).value = value; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  return { w, d, $, until, choose, set };
}

// ---------------------------------------------------------------------------
// L1 and L12: Fill the blank
// ---------------------------------------------------------------------------
describe('Fill the blank: a plain form of the word, and wrong words of the same kind (L1, L12)', () => {
  it('makes the plain forms by the rules, and leaves out what it cannot make safely', () => {
    const cases = [
      [['habitat', 's', 'noun', 'A natural place that a plant or an animal lives in'], 'habitats'],
      [['box', 's', 'noun', 'A container with flat sides'], 'boxes'],
      [['colony', 's', 'noun', 'A group of animals that live together'], 'colonies'],
      [['erosion', 's', 'noun', 'The loss of land because of water and wind'], ''],
      [['leaf', 's', 'noun', 'A flat green part of a plant'], ''],
      [['prey', 's', 'noun', 'An animal that is hunted'], ''],
      [['adapt', 's', 'verb', ''], 'adapts'],
      [['carry', 'ed', 'verb', ''], 'carried'],
      [['stop', 'ed', 'verb', ''], 'stopped'],
      [['condense', 'ed', 'verb', ''], 'condensed'],
      [['visit', 'ed', 'verb', ''], ''],
      [['gather', 'ed', 'verb', ''], 'gathered'],
      [['offer', 'ed', 'verb', ''], ''],
      [['hide', 'ed', 'verb', ''], ''],
      [['understand', 'ed', 'verb', ''], ''],
      [['make', 'ing', 'verb', ''], 'making'],
      [['run', 'ing', 'verb', ''], 'running'],
      [['lie', 'ing', 'verb', ''], 'lying'],
      [['big', 'er', 'adjective', ''], 'bigger'],
      [['dense', 'er', 'adjective', ''], 'denser'],
      [['happy', 'est', 'adjective', ''], 'happiest'],
      [['beautiful', 'er', 'adjective', ''], ''],
      [['good', 'er', 'adjective', ''], ''],
      [['habitat', 'ed', 'noun', 'A place'], ''],
    ];
    for (const [args, want] of cases) expect(V.inflect(...args), args.join(' ')).toBe(want);
    expect([V.formOf('volcanoes', 'volcano', 'noun'), V.formOf('stopped', 'stop', 'verb'), V.formOf('farmer', 'farm', 'noun'), V.formOf('cells', 'cell', 'adverb'), V.formOf('cell', 'cell', 'noun')])
      .toEqual(['s', 'ed', null, null, '']);
  });

  it('a sentence with "predators": the answer is "predators", and every wrong word is a list noun written the same way', () => {
    const rows = rowsOf('predator, habitat, prey, cell, bat, owl, camouflage', { senses: { 'predator|n|1': { example: 'Owls are predators of mice.' } } });
    const row = rows.find((r) => r.key === 'predator');
    expect([row.blank.ask, row.blank.answer, row.blank.form, row.blank.why]).toEqual(['Owls are ___ of mice.', 'predators', 's', '']);
    const plural = { habitats: 1, cells: 1, bats: 1, owls: 1 };
    expect(row.blank.wrong).toHaveLength(3);
    for (const w of row.blank.wrong) expect(plural[w], w).toBe(1);
    // prey has no plain plural and camouflage's meaning is not for one thing: neither is made plural.
    expect(row.blank.pool).not.toContain('preys');
    expect(row.blank.pool.some((w) => /^camouflages$/.test(w))).toBe(false);
    // The file asks it so.
    const item = V.lessonFromVocab({ loader: TH, rows, types: ['blank'], mode: 'practice' }).blocks[0].items.find((it) => it.ask === 'Owls are ___ of mice.');
    expect(item.answer).toBe('predators');
    expect(texts(item).every((t) => /s$/.test(t))).toBe(true);
  });

  it('a sentence in the past: "adapted", with the other verbs of the list in the past; an irregular verb (hide) is left out', () => {
    const rows = rowsOf('adapt, migrate, hibernate, hunt, gather, hide, habitat', { senses: { 'adapt|v|1': { example: 'The animals adapted to the cold.' } } });
    const row = rows.find((r) => r.key === 'adapt');
    expect([row.blank.ask, row.blank.answer, row.blank.form]).toEqual(['The animals ___ to the cold.', 'adapted', 'ed']);
    expect(row.blank.pool.sort()).toEqual(['gathered', 'hibernated', 'hunted', 'migrated']);
  });

  it('the word twice (in two forms) is still twice, and a sentence without any form of the word says so', () => {
    expect(V.blankSentence('The cell splits into two cells.', 'cell', { bank: fixture, pos: 'noun' }).why).toBe('The word is in the sentence more than once. Edit the sentence.');
    expect(V.blankSentence('The owl hunts.', 'cell', { bank: fixture, pos: 'noun' }).why).toMatch(/^The sentence does not have the word as it is written in your list, or with a plain ending/);
    // A word of another kind never counts as a form: "farmer" is not a plural of farm.
    expect(V.blankSentence('The farmer has a farm.', 'farm', { pos: 'noun' }).answer).toBe('farm');
  });

  it('a list word typed in another form: the sentence\'s own form is the answer, and "a" still needs a consonant', () => {
    const rows = rowsOf('Bats, owl, insect, habitat, cell, predator, prey');
    const bats = rows.find((r) => r.key === 'bats');
    expect([bats.blank.ask, bats.blank.answer, bats.blank.form]).toEqual(['A ___ sleeps in the cave all day.', 'Bat', '']);
    expect(bats.blank.wrong.every((w) => !/^[aeiou]/i.test(w))).toBe(true);
    expect(bats.blank.pool).not.toContain('owl');
    expect(bats.blank.pool).not.toContain('insect');
  });

  it('wrong words are of the same kind; a verb with no 3 other verbs in the list is left out, and says so', () => {
    const rows = rowsOf('habitat, predator, prey, cell, bat, adapt, camouflage');
    for (const row of rows) for (const w of row.blank.wrong) expect(rows.find((r) => r.word === w || r.key === V.keyOf(w)).pos, row.word + ' / ' + w).toBe(row.pos);
    const adapt = rows.find((r) => r.key === 'adapt');
    expect(adapt.blank.why).toBe('Fill the blank needs 3 other verbs from your list. Add words to the list.');
    expect(V.rowStop(adapt, 'blank')).toBe(adapt.blank.why);
  });

  it('with the real word list: forms of the word work, the bank\'s "does not fit" words fill a short list, the kind and the article agree', () => {
    const rows = rowsOf('predator, condense, habitat, prey, cell, erosion, adapt, orbit, mineral, organism', null, real);
    const predator = rows.find((r) => r.key === 'predator');
    expect(predator.blank.answer).toBe('predators');
    expect(predator.blank.wrong.every((w) => /s$/.test(w))).toBe(true);
    const condense = rows.find((r) => r.key === 'condense');
    expect([condense.blank.answer, condense.blank.form]).toEqual(['condensed', 'ed']);
    expect(condense.blank.wrong).toHaveLength(3);
    expect(condense.blank.wrong.every((w) => /ed$/.test(w))).toBe(true);
    // adapt is the only other verb of the list: the rest come from the bank's words that do not fit the sentence.
    expect(condense.blank.wrong.filter((w) => !rows.some((r) => w.indexOf(r.key) === 0)).length).toBeGreaterThan(0);
    expect(condense.blank.wrong.filter((w) => !rows.some((r) => w.indexOf(r.key) === 0)).every((w) => condense.sense.blanks.includes(w))).toBe(true);
    for (const row of rows) {
      if (!row.blank.ask) continue;
      if (row.blank.article === 'a') expect(row.blank.wrong.every((w) => !/^[aeiou]/i.test(w)), row.word).toBe(true);
      if (row.blank.article === 'an') expect(row.blank.wrong.every((w) => /^[aeiou]/i.test(w)), row.word).toBe(true);
      for (const w of row.blank.wrong) {
        const kinds = real.senses(w).map((s) => s.pos);
        if (kinds.length) expect(kinds, row.word + ' / ' + w).toContain(row.pos);
      }
    }
  });

  it('a teacher\'s swapped words are kept for the same sentence when the file is opened again', () => {
    const rows = rowsOf('predator, habitat, prey, cell, bat, owl', { senses: { 'predator|n|1': { example: 'Owls are predators of mice.' } } });
    const row = rows.find((r) => r.key === 'predator');
    expect(V.blankSentence(row.example, row.word, { bank: fixture, pos: row.pos }).ask).toBe(row.blank.ask);
  });
});

// ---------------------------------------------------------------------------
// L2: Meaning to word with a list word typed in another form
// ---------------------------------------------------------------------------
describe('Meaning to word: a list word typed in another form (L2)', () => {
  it('"habitats": the wrong words are written the same way, and the question asks for "habitats"', () => {
    const rows = rowsOf('habitats, predator, prey, cell, bat');
    const row = rows.find((r) => r.key === 'habitats');
    expect(row.wordAsk).toMatchObject({ answer: 'habitats', base: false, form: 's' });
    expect(row.wordAsk.wrong.every((w) => /s$/.test(w))).toBe(true);
    const item = V.lessonFromVocab({ loader: TH, rows, types: ['word'], mode: 'practice' }).blocks[0].items.find((it) => it.answer === 'habitats');
    expect(texts(item).every((t) => /s$/.test(t))).toBe(true);
  });

  it('when a wrong word cannot be written that way (climate, "The usual weather..."), it asks for "bat", and step 2 says so', async () => {
    const LIST = 'bats, owl, climate, nest, insect';
    const bats = rowsOf(LIST).find((r) => r.key === 'bats');
    expect(bats.wordAsk).toMatchObject({ answer: 'bats', base: false, form: 's' });
    const kept = { words: { bats: { wrongFor: bats.senseId, wrong: [{ id: 'climate|n|1', word: 'climate', def: 'The usual weather of a place over many years', from: 'list' }, bats.wrong[1], bats.wrong[2]] } } };
    const row = rowsOf(LIST, kept).find((r) => r.key === 'bats');
    expect(row.wordAsk).toMatchObject({ answer: 'bat', base: true });
    expect(row.wordAsk.wrong).toContain('climate');
    const item = V.lessonFromVocab({ loader: TH, rows: rowsOf(LIST, kept), types: ['word'], mode: 'practice' }).blocks[0].items.find((it) => it.ask === row.def);
    expect(item.answer).toBe('bat');
    // The page, step 2.
    const p = openPage('packets-vocab.html', 'https://site.test/packets-vocab.html', { 'alloflow-packets-vocab-edits/1': JSON.stringify({ v: 1, words: kept.words, senses: {} }) });
    await new Promise((r) => setTimeout(r, 5));
    p.set('f-words', LIST);
    p.$('next-1').click();
    await p.until(() => p.d.querySelector('[data-row="bats"] .v-out'), 'step 2');
    expect(p.d.querySelector('[data-row="bats"] .v-out').textContent).toBe('The meaning is for bat. Students see bats as you typed it, except in Meaning to word: there the answer is bat, because its wrong words cannot all be written like bats. To ask about bat, type bat in step 1.');
  });
});

// ---------------------------------------------------------------------------
// L3: a blank for screen readers
// ---------------------------------------------------------------------------
describe('a blank is a line on screen and "blank" for a screen reader (L3)', () => {
  it('in the question of Fill the blank and in a meaning written with a blank', () => {
    const edits = { senses: { 'adapt|v|1': { def: 'If animals ___, they change so they can live in a new place' } } };
    const rows = rowsOf('habitat, predator, prey, cell, bat, adapt', edits);
    for (const types of [['blank'], ['meaning']]) {
      const lesson = V.lessonFromVocab({ loader: TH, rows, types, mode: 'practice' });
      const t = play(V.buildVocabPacket({ lesson, loader: TH, rows, bank: fixture }).html);
      t.start();
      const items = lesson.blocks[0].items;
      for (const item of items) {
        const ask = t.q('[data-read]');
        expect(seenText(ask)).toBe(item.ask);
        expect(heardText(ask)).toBe(item.ask.replace(/_{2,}/g, 'blank'));
        for (const b of t.d.querySelectorAll('[data-choice]')) expect(heardText(b)).not.toMatch(/_/);
        if (/_{2,}/.test(item.ask)) expect(ask.querySelector('.sr').textContent).toBe('blank');
        t.pick(item.answer);
        (t.button('Next') || t.button('See my results')).click();
      }
      if (types[0] === 'meaning') expect(items.some((it) => texts(it).some((c) => /_{2,}/.test(c)))).toBe(true);
    }
    for (const id of ['vocab_meaning', 'vocab_word', 'vocab_blank']) expect(TH.CHECK_ADAPTERS[id].labels[id + '_blank']).toBe('blank');
  });
});

// ---------------------------------------------------------------------------
// L6 and L11: a vocabulary check's sample, and the order of the kinds
// ---------------------------------------------------------------------------
describe('a vocabulary check opens with a sample question (L6)', () => {
  const words = 'habitat, predator, prey, cell, bat, adapt, camouflage';
  it('one sample, not scored, of the first kind, whose words are not in the list', () => {
    const rows = rowsOf(words);
    for (const types of [['meaning', 'word'], ['meaning'], ['blank']]) {
      const lesson = V.lessonFromVocab({ loader: TH, rows, types, mode: 'check' });
      const first = lesson.blocks[0].items[0];
      expect(first.practice, types.join()).toBe(true);
      expect(first.id).toBe(lesson.blocks[0].activity + '-p0');
      expect(lesson.blocks.flatMap((b) => b.items).filter((it) => it.practice)).toHaveLength(1);
      const all = [first.ask].concat(first.choices).join(' ').toLowerCase();
      for (const r of rows) expect(all, r.word).not.toMatch(new RegExp('\\b' + r.key + '\\b'));
    }
    // Practice files have none.
    expect(V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word'], mode: 'practice' }).blocks.flatMap((b) => b.items).some((it) => it.practice)).toBe(false);
  });

  it('a sample that shares a word with the list is not used: the next one is, and with both taken there is none', () => {
    const second = V.lessonFromVocab({ loader: TH, rows: rowsOf(words + ', chairs'), types: ['word'], mode: 'check' }).blocks[0].items[0];
    expect([second.practice, second.choices.map((c) => c.toLowerCase()).sort()]).toEqual([true, ['apple', 'cloud', 'pencil', 'shoe']]);
    const none = V.lessonFromVocab({ loader: TH, rows: rowsOf(words + ', chair, apples'), types: ['word'], mode: 'check' }).blocks[0].items[0];
    expect(none.practice).toBeUndefined();
  });

  it('plays: "Practice 1 of 1" with right or wrong, then Get ready; the score and the count leave it out', () => {
    const rows = rowsOf(words);
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word'], mode: 'check' });
    const made = V.buildVocabPacket({ lesson, loader: TH, rows, bank: fixture });
    expect(made.manifest.check).toMatchObject({ items: 14, practiceItems: 1 });
    const t = play(made.html);
    t.start();
    expect(t.heading()).toBe('Practice 1 of 1');
    const [sample, ...scored] = lesson.blocks.flatMap((b) => b.items);
    t.pick(sample.choices.find((c) => c !== sample.answer));
    expect(t.q('[data-feedback]').textContent).toBe('Not quite. Here is the right answer.');
    t.q('[data-practice-next]').click();
    expect(t.heading()).toBe('Get ready');
    t.q('[data-check-begin]').click();
    expect(t.heading()).toBe('Question 1 of 14');
    scored.forEach((it, i) => t.pick(i === 0 ? it.choices.find((c) => c !== it.answer) : it.answer));
    const json = t.json();
    expect(json.score).toMatchObject({ measure: 'vocab_items', score: 13, itemsAttempted: 14 });
    expect(json.items[0]).toMatchObject({ itemId: lesson.blocks[0].activity + '-p0', practice: 'practice' });
  });
});

describe('Meaning to word comes before Word to meaning (L11)', () => {
  const words = 'habitat, predator, prey, cell, bat, adapt, camouflage';
  it('no meaning is shown as a choice before the question that asks it, in practice and in a check', () => {
    const rows = rowsOf(words);
    for (const mode of ['practice', 'check']) {
      const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word', 'blank'], mode });
      expect(lesson.blocks.map((b) => b.activity), mode).toEqual(['vocab_word', 'vocab_meaning', 'vocab_blank']);
      const items = lesson.blocks.flatMap((b) => b.items.map((it) => ({ ...it, activity: b.activity }))).filter((it) => !it.practice);
      rows.forEach((row) => {
        const asked = items.findIndex((it) => it.activity === 'vocab_word' && it.ask === row.def);
        const shown = items.findIndex((it) => texts(it).includes(row.def));
        expect(asked, mode + ' ' + row.word).toBeGreaterThanOrEqual(0);
        expect(shown, mode + ' ' + row.word).toBeGreaterThan(asked);
      });
      // Word to meaning asks the words in the order Meaning to word did: a word's two questions are a whole round apart.
      const order = (activity) => items.filter((it) => it.activity === activity).map((it) => (activity === 'vocab_word' ? rows.find((r) => r.def === it.ask).key : rows.find((r) => r.word === it.word || r.def === it.answer).key));
      expect(order('vocab_meaning'), mode).toEqual(order('vocab_word'));
    }
    // The file says what the teacher chose, in the page's order.
    const made = V.buildVocabPacket({ lesson: V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word'], mode: 'practice' }), loader: TH, rows, bank: fixture });
    expect(made.manifest.vocab.types).toEqual(['meaning', 'word']);
  });
});

// ---------------------------------------------------------------------------
// L7, L14, L16, L10, L13: checks
// ---------------------------------------------------------------------------
describe('Math Fluency: the sample is of the form\'s own operation and size (L7)', () => {
  it('every form: the first problem\'s operation, as many digits, never a problem of the form or its turnaround', () => {
    const sets = BANK.MATH_PROBE_BANKS;
    for (const grade of Object.keys(sets)) for (const form of Object.keys(sets[grade])) {
      const lesson = PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade, form });
      const [sample] = lesson.blocks[0].items;
      const problems = sets[grade][form].problems, first = problems[0];
      expect([sample.practice, sample.op], grade + form).toEqual([true, first.op]);
      expect([String(sample.a).length, String(sample.b).length], grade + form).toEqual([String(first.a).length, String(first.b).length]);
      for (const p of problems) expect([p.a, p.b, p.op].join(), grade + form).not.toBe([sample.a, sample.b, sample.op].join());
      if (sample.op === 'add' || sample.op === 'mul') for (const p of problems) expect([p.a, p.b, p.op].join(), grade + form).not.toBe([sample.b, sample.a, sample.op].join());
    }
    // Grade 3 (multiply and divide): 2 x 3. Kindergarten form B has 1 + 1 as a problem: its sample is another.
    expect(PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'A' }).blocks[0].items[0]).toMatchObject({ a: 2, b: 3, op: 'mul' });
    expect(PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: 'K', form: 'B' }).blocks[0].items[0]).toMatchObject({ a: 2, b: 2, op: 'add' });
    // The other checks keep theirs, and a sample the caller gives is used.
    expect(PC.lessonFromMathForm({ bank: BANK, measure: 'missing_number', grade: '1', form: 'A' }).blocks[0].items[0]).toMatchObject({ display: '2 + __ = 3', practice: true });
    expect(PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'A', practice: [{ a: 1, b: 1, op: 'add' }] }).blocks[0].items[0]).toMatchObject({ a: 1, b: 1, op: 'add' });
  });

  it('plays the grade 3 sample as a multiplication', () => {
    const lesson = PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'B' });
    const t = play(PC.buildCheckPacket({ lesson, loader: TH }).html);
    t.start();
    expect(t.heading()).toBe('Practice 1 of 1');
    expect(t.q('.prompt').textContent).toBe('2 ' + TIMES + ' 3 =');
  });
});

describe('numbers of 10000 or more, one line, and remainders (L14, L16)', () => {
  const render = (raw, practice) => {
    const lesson = PC.lessonFromMathProblems({ problems: [raw], allowRemainders: true, practice: practice || [] });
    const t = play(PC.buildCheckPacket({ lesson, loader: TH }).html);
    t.start();
    if (t.q('[data-check-begin]')) t.q('[data-check-begin]').click();
    return t;
  };

  it('grouped in threes with a narrow no-break space on screen, the plain number for a screen reader, on one line', () => {
    let t = render({ display: '12000 + 3500 + 25', answer: 15525 });
    const prompt = t.q('.prompt');
    // 3500 has 4 digits: it is not grouped.
    expect(prompt.textContent).toBe('12' + GAP + '000 + 3500 + 25');
    expect(prompt.getAttribute('style')).toMatch(/^white-space:nowrap;font-size:min\(2\.6rem,\d+vw,\d+px\)$/);
    expect(t.q('[data-pad-input]').getAttribute('aria-label')).toBe('12000 + 3500 + 25. Type the answer.');
    // A 4-digit number is not grouped; a long problem gets a smaller size, a short one keeps the full size.
    t = render({ a: 9999, b: 9999, op: 'mul' });
    expect(t.q('.prompt').textContent).toBe('9999 ' + TIMES + ' 9999 =');
    expect(Number(/(\d+)vw/.exec(t.q('.prompt').getAttribute('style'))[1])).toBeLessThan(12);
    // A teacher's own problem gets the minus sign too, and the screen reader label has it.
    t = render({ display: '10 - 3 - 2', answer: 5 });
    expect(t.q('.prompt').textContent).toBe('10 ' + MINUS + ' 3 ' + MINUS + ' 2');
    expect(t.q('[data-pad-input]').getAttribute('aria-label')).toBe('10 ' + MINUS + ' 3 ' + MINUS + ' 2. Type the answer.');
  });

  it('allowRemainders: every division says "Leave out the remainder.", on screen and to a screen reader; others do not', () => {
    for (const raw of [{ a: 7, b: 2, op: 'div' }, { a: 8, b: 2, op: 'div' }]) {
      const t = render(raw);
      expect(t.q('[data-pad-input]').closest('.card').textContent).toContain('Leave out the remainder.');
      expect(t.q('[data-pad-input]').getAttribute('aria-label')).toBe(raw.a + ' ' + String.fromCharCode(0xF7) + ' 2. Type the answer. Leave out the remainder.');
    }
    const add = render({ a: 7, b: 2, op: 'add' });
    expect(add.q('[data-pad-input]').closest('.card').textContent).not.toContain('remainder');
    // Without allowRemainders a division has no such note (and one with a remainder is refused, as before).
    const t = play(PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ problems: [{ a: 8, b: 2, op: 'div' }] }), loader: TH }).html);
    t.start();
    if (t.q('[data-check-begin]')) t.q('[data-check-begin]').click();
    expect(t.q('[data-pad-input]').closest('.card').textContent).not.toContain('remainder');
    expect(() => PC.lessonFromMathProblems({ problems: [{ a: 7, b: 2, op: 'div' }] })).toThrow('Problem 1: 7 ' + String.fromCharCode(0xF7) + ' 2 has a remainder.');
  });
});

describe('Missing Number: the minus sign, said as "minus" (L10)', () => {
  it('on screen and in the label; the item keeps the form\'s own text', () => {
    const lesson = PC.lessonFromMathForm({ bank: BANK, measure: 'missing_number', grade: '1', form: 'A' });
    const raw = lesson.blocks[0].items.find((it) => / - /.test(it.display || ''));
    const made = TH.CHECK_ADAPTERS.missing_number.prepare(raw);
    expect(made.item.word).toBe(raw.display);
    expect(made.item.shown).toBe(raw.display.replace(' - ', ' ' + MINUS + ' '));
    const t = play(PC.buildCheckPacket({ lesson, loader: TH }).html);
    t.start();
    t.type(1);
    t.q('[data-practice-next]').click();
    t.q('[data-check-begin]').click();
    const items = lesson.blocks[0].items.filter((it) => !it.practice);
    for (const it of items) {
      const prompt = t.q('.prompt');
      expect(prompt.textContent).not.toMatch(/-/);
      const label = t.q('[data-pad-input]').getAttribute('aria-label');
      if (/ - /.test(it.display)) { expect(prompt.textContent).toContain(MINUS); expect(label).toMatch(/ minus /); }
      expect(label).toMatch(/(^| )blank /);
      expect(label).not.toMatch(/[-_]/);
      t.type(it.answer);
    }
  });
});

describe('the check maker (L13, L14, L10 on paper)', () => {
  const page = async (problems) => {
    const p = openPage('packets-check.html', 'https://packets.test/site/packets-check.html');
    p.choose('check', 'own');
    p.$('next-1').click();
    p.set('f-problems', problems);
    await p.until(() => p.$('own-list').children.length === problems.split(/[,\n]+/).filter((x) => x.trim()).length, 'the typed problems');
    await new Promise((r) => setTimeout(r, 300));
    return p;
  };

  it('notes answers below 0, in case one was typed the wrong way round', async () => {
    let p = await page('7 + 8, 5 - 8');
    expect(p.$('own-line').textContent).toBe('2 of 2 problems can be used. 5 ' + MINUS + ' 8 has an answer below 0: the keypad in the file gets a minus key. Change it if that is not what you meant.');
    p = await page('2 - 9, 3 - 7, 7 + 1');
    expect(p.$('own-line').textContent).toBe('3 of 3 problems can be used. 2 problems have an answer below 0 (2 ' + MINUS + ' 9 and 3 ' + MINUS + ' 7): the keypad in the file gets a minus key. Change them if that is not what you meant.');
    p = await page('7 + 8, 9 - 1');
    expect(p.$('own-line').textContent).toBe('2 of 2 problems can be used.');
  });

  it('the paper copy groups large numbers as the screen does, and shows the minus sign', async () => {
    const p = await page('9999 x 9999, 12000 + 500 + 1 = 12501, 3 - 8');
    p.$('next-2').click();
    await p.until(() => !p.$('summary').hidden || !p.$('build-problem').hidden, 'the file');
    const key = [...p.$('paper-key').children].map((li) => [li.querySelector('.kw').textContent, li.querySelector('.ka').textContent]);
    expect(key).toEqual([['9999 ' + TIMES + ' 9999', '99' + GAP + '980' + GAP + '001'], ['12' + GAP + '000 + 500 + 1', '12' + GAP + '501'], ['3 ' + MINUS + ' 8', MINUS + '5']]);
    expect(p.d.querySelector('.pl').textContent).toBe('12' + GAP + '000 + 500 + 1 = ');
  });
});

// ---------------------------------------------------------------------------
// L8, L9: math fact practice
// ---------------------------------------------------------------------------
const pairsIn = (cards) => cards.filter((c, i) => i > 0 && (MP.factKey(c.fact) === MP.factKey(cards[i - 1].fact) || MP.factKey(MP.turnaround(c.fact) || c.fact) === MP.factKey(cards[i - 1].fact))).length;

describe('Make 10: 1 + 9 and 9 + 1 take turns as one known fact (L8)', () => {
  it('both are used, as ticked, never side by side; a third known fact comes from the set before', () => {
    const plan = MP.planMathPractice({ mode: 'rehearsal', factSet: 'add-make-10' });
    expect(MP.knownByOrder('add-make-10').sort()).toEqual(['add:1:9', 'add:5:5', 'add:9:1']);
    expect(pairsIn(plan.cards)).toBe(0);
    const known = plan.cards.filter((c) => c.role === 'known').map((c) => MP.factKey(c.fact));
    expect(known).toContain('add:1:9');
    expect(known).toContain('add:9:1');
    expect(plan.pairs.map((p) => p.map(MP.factKey).sort())).toEqual([['add:1:9', 'add:9:1']]);
    expect(plan.chosenKnown).toBe(2);
    expect(plan.addedFrom).toEqual(['Doubles']);
    expect(plan.knownFacts.map(MP.factKey)).toEqual(expect.arrayContaining(['add:1:9', 'add:9:1', 'add:5:5']));
    // Within any run of known cards, a pair's two facts never both appear.
    let run = [];
    for (const c of plan.cards.concat({ role: 'new' })) {
      if (c.role === 'known') { run.push(MP.factKey(c.fact)); continue; }
      expect(run.includes('add:1:9') && run.includes('add:9:1'), run.join(' ')).toBe(false);
      run = [];
    }
  });

  it('the page keeps the boxes the teacher ticked and says why another fact is added', () => {
    const p = openPage('packets-math-practice.html', 'https://packets.test/site/packets-math-practice.html');
    p.choose('kind', 'add');
    p.choose('set', 'add-make-10');
    p.$('next-1').click();
    p.choose('method', 'rehearsal');
    const ticked = [...p.d.querySelectorAll('[data-known]')].filter((b) => b.checked).map((b) => b.value).sort();
    expect(ticked).toEqual(['add:1:9', 'add:5:5', 'add:9:1']);
    const sub = p.$('known-sub').textContent;
    expect(sub).toMatch(/1 \+ 9 and 9 \+ 1 are the same fact turned around, so they take turns as one known fact and are never side by side\.|9 \+ 1 and 1 \+ 9 are the same fact turned around, so they take turns as one known fact and are never side by side\./);
    expect(sub).toMatch(/Only 2 different facts can be used, so \d \+ \d from Doubles, the set before, is used as a known fact too\./);
  });
});

describe('typed facts: turnarounds noted and kept apart; no known fact gives a new one away (L9)', () => {
  it('cover, copy, compare keeps the typed order but moves a turnaround apart; the page says so', async () => {
    expect(MP.planMathPractice({ mode: 'ccc', facts: '3 + 4, 4 + 3, 5 + 5, 6 + 6' }).cards.map((c) => MP.factKey(c.fact))).toEqual(['add:3:4', 'add:5:5', 'add:4:3', 'add:6:6']);
    const p = openPage('packets-math-practice.html', 'https://packets.test/site/packets-math-practice.html');
    p.choose('kind', 'own');
    p.set('f-facts', '3 + 4, 4 + 3, 5 + 5');
    await new Promise((r) => setTimeout(r, 350));
    const says = [...p.$('own-list').children].map((li) => li.querySelector('.s').textContent);
    expect(says).toEqual(['Ready. The answer is 7.', 'Ready. The answer is 7. 3 + 4 is in the list too, turned around: the file keeps the two apart.', 'Ready. The answer is 10.']);
  });

  it('rehearsal: a known fact that is a new fact turned around is not used, and the reason says why', () => {
    const plan = MP.planMathPractice({ mode: 'rehearsal', facts: '3 + 4, 4 + 3, 2 + 2, 5 + 5, 6 + 6', known: ['add:4:3', 'add:2:2', 'add:5:5', 'add:6:6'] });
    expect(plan.newFacts.map(MP.factKey)).toEqual(['add:3:4']);
    expect(plan.held.map((h) => [MP.factKey(h.fact), MP.factKey(h.gives)])).toEqual([['add:4:3', 'add:3:4']]);
    expect(plan.cards.some((c) => MP.factKey(c.fact) === 'add:4:3')).toBe(false);
    expect(pairsIn(plan.cards)).toBe(0);
    expect(() => MP.planMathPractice({ mode: 'rehearsal', facts: '3 + 4, 4 + 3, 5 + 5, 6 + 6', known: ['add:4:3', 'add:5:5', 'add:6:6'] }))
      .toThrow('Rehearsal needs at least 3 facts the student already knows. Only 2 are chosen. 4 + 3 is not used: it is the new fact 3 + 4 turned around, so it would give it away.');
    expect(() => MP.planMathPractice({ mode: 'rehearsal', facts: '7 + 1, 1 + 7, 5 + 5, 9 + 9', known: ['add:1:7', 'add:7:1', 'add:5:5'] }))
      .toThrow('Rehearsal needs at least 3 facts the student already knows. Only 2 different facts are chosen: a fact and its turnaround (');
  });
});
