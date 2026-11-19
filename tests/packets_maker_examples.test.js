// One worked example under each choice a teacher picks from on three Packets makers (2026-11-18), as Make Word Sounds
// practice has under each activity (tests/activity_examples.test.js): the two ways on Make math fact practice, the kinds
// of question on Make vocabulary practice, and the four cards on Make a math check. Each example is held against the
// builder and the file's own words (the adapters' labels), so it says what the file really asks.
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const parse = (file) => new JSDOM(read(file)).window.document;
const NBSP = String.fromCharCode(0xA0), TIMES = String.fromCharCode(0xD7);
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

const parts = {};
parts.window = parts;
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
const labelsOf = (activity) => TH.CHECK_ADAPTERS[activity].labels;
const MP = require('../packet_math_practice_builder.js');
const V = require('../packet_vocab_builder.js');
const PC = require('../packet_check_builder.js');
const bankText = read('psychometric_math_probes.json');
const BANK = JSON.parse(bankText.charCodeAt(0) === 0xFEFF ? bankText.slice(1) : bankText);

// Each card's examples: one .choice-example, after the card's line.
const examplesOf = (doc, host) => [...doc.querySelectorAll('#' + host + ' label.choice')].map((label) => {
  const all = label.querySelectorAll('.choice-example');
  expect(all, label.textContent).toHaveLength(1);
  expect(all[0].previousElementSibling.className, label.textContent).toBe('choice-line');
  return [label.querySelector('input').value, all[0].textContent];
});

describe('Make math fact practice: an example under each way to practice', () => {
  const shown = Object.fromEntries(examplesOf(parse('packets-math-practice.html'), 'methods'));
  const word = (f) => MP.factWord(f, TH).word;
  it('every way the builder offers has one', () => {
    expect(Object.keys(shown).sort()).toEqual(Object.keys(MP.METHODS).sort());
  });
  it('cover, copy, compare: a × 7 fact, shown with its answer, then covered and typed from memory', () => {
    const plan = MP.planMathPractice({ mode: 'ccc', factSet: 'mul-7' });
    const fact = plan.cards.map((c) => c.fact).find((f) => word(f) === '7 ' + TIMES + ' 8');
    expect(fact).toBeTruthy();
    // Every card of cover, copy, compare starts with the fact and its answer shown.
    expect(plan.cards.every((c) => c.study)).toBe(true);
    const L = labelsOf('math_ccc');
    expect(L.math_ccc_cover).toBe('Cover it');
    expect(shown.ccc).toBe('Example: ' + word(fact) + ' = ' + MP.answerOf(fact) + ' is shown. ' + L.math_ccc_cover + ', then '
      + L.math_ccc_type.charAt(0).toLowerCase() + L.math_ccc_type.slice(1) + ' Answer: ' + MP.answerOf(fact) + '.');
  });
  it('rehearsal: the first cards of the × 7 set, a new fact shown first, then a known fact and the new fact again', () => {
    const plan = MP.planMathPractice({ mode: 'rehearsal', factSet: 'mul-7' });
    const [first, second, third] = plan.cards;
    expect([first.role, first.study, second.role, second.study, third.role, third.study]).toEqual(['new', true, 'known', false, 'new', false]);
    expect(MP.factKey(third.fact)).toBe(MP.factKey(first.fact));
    expect(shown.rehearsal).toBe('Example: The new fact ' + word(first.fact) + ' = ' + MP.answerOf(first.fact) + ' is shown first. Then come ' + word(second.fact)
      + ', a fact the student knows, and ' + word(third.fact) + ' again. ' + labelsOf('math_rehearsal').math_rehearsal_type
      + ' Answer: ' + MP.answerOf(second.fact) + ', then ' + MP.answerOf(third.fact) + '.');
  });
});

describe('Make vocabulary practice: an example under each kind of question', () => {
  const src = read('packets-vocab.js');
  const block = src.slice(src.indexOf('var TYPE_EXAMPLES'), src.indexOf('// END TYPE EXAMPLES'));
  const ctx = {};
  new Function('ctx', block + '\nctx.T = TYPE_EXAMPLES; ctx.text = typeExampleText;')(ctx);
  const T = ctx.T;
  const fixture = require('./fixtures/packets_vocab_bank_fixture.js');
  const WORDS = 'habitat\npredator, prey, cell, bat, adapt, camouflage';

  it('every kind the builder makes has one, and its question is the file\'s own', () => {
    expect(Object.keys(T)).toEqual(V.TYPES.map((t) => t.id));
    for (const t of V.TYPES) expect(T[t.id].q, t.id).toBe(labelsOf(t.activity)[t.activity + '_question']);
  });

  it('the items are the builder\'s own sample questions, the ones a check opens with', async () => {
    await fixture.load();
    const rows = V.draftRows({ words: V.parseWords(WORDS).words, bank: fixture });
    const sample = (type) => V.lessonFromVocab({ loader: TH, rows, types: [type], mode: 'check' }).blocks[0].items[0];
    const meaning = sample('meaning'), word = sample('word'), blank = sample('blank');
    expect([meaning.practice, word.practice, blank.practice]).toEqual([true, true, true]);
    const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
    expect(T.meaning).toMatchObject({ shown: 'The word is ' + meaning.ask + '.', a: lower(meaning.answer) });
    expect(T.word).toMatchObject({ shown: 'The meaning is "' + lower(word.ask) + '."', a: word.answer });
    expect(T.blank).toMatchObject({ shown: blank.ask, a: blank.answer });
    // The picture samples need the picture set; they are read from the builder's table.
    const builderSrc = read('packet_vocab_builder.js');
    expect(builderSrc).toContain("picture: [{ ask: 'dog', answer: 'dog'");
    expect(builderSrc).toContain('SAMPLES.picword = SAMPLES.picture;');
    expect(T.picture).toMatchObject({ shown: 'The word is dog.', a: 'the picture of a dog' });
    expect(T.picword).toMatchObject({ shown: 'A picture of a dog is shown.', a: 'dog' });
    for (const id of Object.keys(T)) expect(ctx.text(id)).toBe('Example: ' + T[id].shown + ' ' + T[id].q + ' Answer: ' + T[id].a + '.');
  });

  it('the page shows each one under its kind of question', async () => {
    const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:file'; w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
    w.fetch = async () => ({ ok: false, status: 404, text: async () => '' });
    for (const script of d.querySelectorAll('script[src]')) {
      const file = script.getAttribute('src');
      w.eval(read(file === 'packets_vocab_bank_en.js' ? 'tests/fixtures/packets_vocab_bank_fixture.js' : file));
    }
    await wait(5);
    d.getElementById('f-words').value = WORDS;
    d.getElementById('f-words').dispatchEvent(new w.Event('input', { bubbles: true }));
    await wait(300);
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    await wait(60);
    const shown = examplesOf(d, 'types');
    // The picture kinds are listed (closed) even without the picture set, so all five are on the page.
    expect(shown.map(([id]) => id)).toEqual(V.TYPES.map((t) => t.id));
    for (const [id, text] of shown) expect(text, id).toBe(ctx.text(id));
  });
});

describe('Make a math check: an example under each of the four cards', () => {
  const page = () => {
    const dom = new JSDOM(read('packets-check.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-check.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    w.fetch = async () => { throw new TypeError('Failed to fetch'); };
    w.HTMLElement.prototype.scrollIntoView = function () {};
    // Emptied first, so what is read after is what the page's script wrote.
    d.querySelectorAll('#checks .choice-example').forEach((node) => { node.textContent = ''; });
    for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
    return d;
  };
  const first = (id) => PC.lessonFromMathForm({ bank: BANK, measure: id, grade: '1', form: 'A' }).blocks[0].items.find((p) => !p.practice);
  const tight = (s) => s.replace(/ /g, NBSP);

  it('each card\'s example is the first problem of grade 1, version A, asked in the file\'s words; the page reads the same before its scripts run', () => {
    const qd = first('quantity_discrimination'), mn = first('missing_number'), mf = first('math_computation');
    const sign = { add: '+', sub: String.fromCharCode(0x2212), mul: TIMES, div: String.fromCharCode(0xF7) };
    const own = PC.parseProblems('6 x 4');
    expect(own).toEqual([{ a: 6, b: 4, op: 'mul' }]);
    const mfLabel = labelsOf('math_computation').math_computation_label;
    const want = [
      ['quantity_discrimination', 'Example: ' + tight(qd.left + ' or ' + qd.right) + '. ' + labelsOf('quantity_discrimination').quantity_discrimination_question + ' Answer: ' + Math.max(qd.left, qd.right) + '.'],
      ['missing_number', 'Example: ' + tight(mn.display) + '. ' + labelsOf('missing_number').missing_number_question + ' Answer: ' + mn.answer + '.'],
      ['math_computation', 'Example: ' + mfLabel.replace('{problem}', tight(mf.a + ' ' + sign[mf.op] + ' ' + mf.b)) + ' Answer: ' + mf.answer + '.'],
      ['own', 'Example: You type 6 x 4. The student sees ' + mfLabel.replace('{problem}', tight('6 ' + TIMES + ' 4')) + ' Answer: ' + 6 * 4 + '.'],
    ];
    // What the problem sets hold today, so a change to them is seen here.
    expect(want.map(([, text]) => text.replace(new RegExp(NBSP, 'g'), ' '))).toEqual([
      'Example: 59 or 95. Which number is bigger? Answer: 95.',
      'Example: __ + 8 = 14. What number is missing? Answer: 6.',
      'Example: 16 + 2. Type the answer. Answer: 18.',
      'Example: You type 6 x 4. The student sees 6 ' + TIMES + ' 4. Type the answer. Answer: 24.',
    ]);
    expect(examplesOf(page(), 'checks')).toEqual(want);
    expect(examplesOf(parse('packets-check.html'), 'checks')).toEqual(want);
  });

  it('the Missing Number card shows its problem once: in the example, not in the line', () => {
    const d = page();
    const card = d.querySelector('#checks input[value="missing_number"]').closest('label');
    expect(card.querySelector('.choice-line').textContent).not.toContain('__');
    expect(card.textContent.split('__').length - 1).toBe(1);
  });
});

describe('the words', () => {
  it('American spelling in every file this pass changed', () => {
    for (const file of ['packets-math-practice.html', 'packets-vocab.js', 'packets-check.html', 'packets-check.js', 'tests/packets_maker_examples.test.js']) {
      // This file's own list of the spellings is left out.
      const text = read(file).split('\n').filter((line) => !line.includes('standardis')).join('\n');
      expect(BRITISH.exec(text), file).toBeNull();
    }
  });
});
