import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// Small fixes to the math and vocabulary activities of AlloFlow Packets, 2026-11-13 (the findings list is in
// C:\tmp\packets_build_1111\polish_mv\FINDINGS.md):
//   1. Math fact practice never puts a fact right after itself or its turnaround where it can be helped (the app's
//      Math Fluency rule), and never adds the turnaround of a fact in the file as a "known" fact.
//   2. Math fact practice page: "is used as a known fact" for one added fact; the reasons say "student".
//   3. Vocabulary: word choices never differ only by a first capital, and a blank that opens the sentence gets
//      capital choices; Fill the blank's reason names "the" only when the sentence has it; a word typed in another
//      form ("habitats") says which word its meaning is for.
//   4. The adapters (word_sounds_take_home/check_adapters): Hear it reads a meaning's blank as "blank", and a key
//      of the fact practice pad pressed with the mouse leaves the focus in the answer box. These run the adapter
//      FILES in place of the copies in the loader, so they pass before the loader is rebuilt
//      (node dev-tools/build_word_sounds_take_home.cjs) and after.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const parts = {};
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
for (const id of ['math_ccc', 'math_rehearsal', 'vocab_meaning', 'vocab_word', 'vocab_blank']) TH.CHECK_ADAPTERS[id] = require('../word_sounds_take_home/check_adapters/' + id + '.js');
const MP = require('../packet_math_practice_builder.js');
const V = require('../packet_vocab_builder.js');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');
await bank.load();

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });
const twin = (x, y) => {
  const key = (f) => (f.op === 'add' || f.op === 'mul') && f.b < f.a ? f.op + ':' + f.b + ':' + f.a : f.op + ':' + f.a + ':' + f.b;
  return key(x.fact) === key(y.fact);
};
const pairsIn = (cards) => cards.filter((c, i) => i > 0 && twin(c, cards[i - 1])).length;

describe('math fact practice: a fact never right after itself or its turnaround', () => {
  it('cover, copy, compare: no set has a fact next to its turnaround (Make 10 had 9 + 1 then 1 + 9)', () => {
    for (const set of MP.FAMILIES) {
      const plan = MP.planMathPractice({ mode: 'ccc', factSet: set.id });
      expect(pairsIn(plan.cards), set.id).toBe(0);
      expect(plan.cards.map((c) => MP.factKey(c.fact)).sort(), set.id).toEqual(set.facts.map(MP.factKey).sort());
    }
    // A typed list keeps the teacher's order. 2026-11-13 (second pass, L9): except that a fact and its turnaround are
    // moved apart, as in a fact family (tests/packets_math_vocab_fixes_2026_11_13b.test.js).
    expect(MP.planMathPractice({ mode: 'ccc', facts: '3 + 4, 5 + 5, 6 + 2' }).cards.map((c) => c.fact.a + '+' + c.fact.b)).toEqual(['3+4', '5+5', '6+2']);
    expect(MP.planMathPractice({ mode: 'ccc', facts: '3 + 4, 4 + 3, 5 + 5' }).cards.map((c) => c.fact.a + '+' + c.fact.b)).toEqual(['3+4', '5+5', '4+3']);
  });

  it('rehearsal: known facts added from the set before are never the turnaround of a fact in the file', () => {
    const ten = MP.planMathPractice({ mode: 'rehearsal', factSet: 'mul-10' });
    expect(ten.knownFacts.map(MP.factKey)).not.toContain('mul:2:10');
    const five = MP.planMathPractice({ mode: 'rehearsal', factSet: 'mul-5' });
    expect(five.addedKnown.map(MP.factKey)).not.toContain('mul:10:5');
    for (const plan of [ten, five]) {
      const inFile = plan.facts.map(MP.factKey);
      for (const f of plan.addedKnown) expect(inFile, MP.factKey(f)).not.toContain(MP.factKey(MP.turnaround(f) || f));
      expect(pairsIn(plan.cards)).toBe(0);
    }
  });

  it('rehearsal: new facts stay where the rule puts them, and every set is better or as good as before', () => {
    // The places of the new facts in a rehearsal with 3 new facts (see planMathPractice).
    const NEW_AT = [0, 2, 5, 9, 11, 14, 18, 21, 23, 26, 30, 33];
    for (const set of MP.FAMILIES) {
      let plan;
      try { plan = MP.planMathPractice({ mode: 'rehearsal', factSet: set.id }); } catch (_) { continue; }
      const at = plan.cards.map((c, i) => (c.role === 'new' ? i : -1)).filter((i) => i >= 0);
      if (plan.newFacts.length === 3) expect(at, set.id).toEqual(NEW_AT);
      plan.newFacts.forEach((f) => expect(plan.cards.filter((c) => c.role === 'new' && MP.factKey(c.fact) === MP.factKey(f)), set.id).toHaveLength(4));
      // Make 10 is the one set whose known facts hold a fact and its turnaround (1 + 9, 9 + 1, with 5 + 5). 2026-11-13
      // (second pass, L8): the two take turns as one known fact, so no set has a pair side by side any more (2 were left).
      expect(pairsIn(plan.cards), set.id).toBe(0);
    }
  });

  it('says "student", not "learner", in the reason a rehearsal cannot be made', () => {
    expect(() => MP.planMathPractice({ mode: 'rehearsal', factSet: 'add-0-1' })).toThrow('Rehearsal needs at least 3 facts the student already knows. None are chosen.');
  });
});

describe('the math fact practice page', () => {
  it('says "is used as a known fact" when one fact is added from the set before', async () => {
    const dom = new JSDOM(read('packets-math-practice.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-math-practice.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    w.fetch = async () => { throw new TypeError('Failed to fetch'); };
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
    const choose = (name, value) => { const r = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); r.checked = true; r.dispatchEvent(new w.Event('change', { bubbles: true })); };
    choose('kind', 'mul');
    choose('set', 'mul-5');
    d.getElementById('next-1').click();
    choose('method', 'rehearsal');
    const plan = MP.planMathPractice({ mode: 'rehearsal', factSet: 'mul-5' });
    expect(plan.addedKnown).toHaveLength(1);
    expect(d.getElementById('known-sub').textContent).toContain(' from ' + plan.addedFrom[0] + ', the set before, is used as a known fact too.');
  });
});

describe('vocabulary: no capital letter gives an answer away', () => {
  const rowsOf = (words, edits) => V.draftRows({ words: V.parseWords(words).words, bank, edits });
  const lesson = (rows, types, mode = 'practice') => V.lessonFromVocab({ loader: TH, rows, types, mode });
  const texts = (item) => item.choices.map((c) => (typeof c === 'string' ? c : c.text));

  it('a list typed with capitals: the word list\'s own wrong words get a capital too, in Meaning to word', () => {
    const rows = rowsOf('Habitat, Predator, Prey, Cell, Bat, Adapt');
    const block = lesson(rows, ['word']).blocks[0];
    for (const item of block.items) {
      expect(texts(item).every((t) => /^[A-Z]/.test(t)), texts(item).join(' / ')).toBe(true);
      expect(texts(item)).toContain(item.answer);
    }
    // Some wrong words came from the word list in lower case (burrow, herbivore...).
    expect(rows.some((r) => r.wrong.some((c) => c.from === 'bank'))).toBe(true);
  });

  it('a list in lower case is made exactly as before: nothing changes when the first letters agree', () => {
    const rows = rowsOf('habitat, predator, prey, cell, bat, adapt');
    for (const item of lesson(rows, ['word', 'blank']).blocks.flatMap((b) => b.items)) {
      if (/^_{2,}/.test(item.ask)) continue;
      expect(texts(item).every((t) => /^[a-z]/.test(t)), texts(item).join(' / ')).toBe(true);
    }
  });

  it('a check holds the capital form as its answer, so the sealed answer is still one of the choices', () => {
    const rows = rowsOf('Habitat, Predator, Prey, Cell, Bat, Adapt');
    const check = lesson(rows, ['word'], 'check');
    for (const item of check.blocks[0].items) expect(item.choices).toContain(item.answer);
    expect(() => V.buildVocabPacket({ lesson: check, loader: TH, rows, bank })).not.toThrow();
  });

  it('Fill the blank: a blank that opens the sentence gets choices with a capital', () => {
    const rows = rowsOf('habitat, predator, prey, cell, bat, adapt', { senses: { 'prey|n|1': { example: 'Prey must watch for owls.' } } });
    const item = lesson(rows, ['blank']).blocks[0].items.find((it) => /^_{2,}/.test(it.ask));
    expect(item.ask).toBe('___ must watch for owls.');
    expect(texts(item).every((t) => /^[A-Z]/.test(t))).toBe(true);
    expect(item.answer).toBe('Prey');
  });

  it('Fill the blank names "the" only when the sentence has it', () => {
    const rows = rowsOf('habitat, prey, cell', { senses: { 'habitat|n|1': { example: 'Frogs need a habitat with water.' }, 'prey|n|1': { example: 'Owls look for prey.' } } });
    // 2026-11-13 (second pass, L12): the wrong words are of the same kind, so the reason names it (nouns).
    expect(rows.find((r) => r.key === 'prey').blank.why).toBe('Fill the blank needs 3 other nouns from your list. Add words to the list.');
    expect(rows.find((r) => r.key === 'habitat').blank.why).toMatch(/^Fill the blank needs 3 other nouns from your list that can go after "a"/);
  });

  it('a word typed in another form says which word its meaning is for', () => {
    const rows = rowsOf('habitats, predator, cell');
    expect(rows.map((r) => [r.word, r.base])).toEqual([['habitats', 'habitat'], ['predator', ''], ['cell', '']]);
  });
});

describe('vocabulary page: the note for a word typed in another form', () => {
  it('step 2 says the meaning is for the base word', async () => {
    const SCRIPTS = ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_zip.js', 'packets_handoff.js', 'packets_vocab_bank_en.js',
      'word_sounds_symbols_en.js', 'word_sounds_packet_builder.js', 'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-vocab.js'];
    const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    for (const src of SCRIPTS) w.eval(read(src === 'packets_vocab_bank_en.js' ? 'tests/fixtures/packets_vocab_bank_fixture.js' : src));
    await new Promise((r) => setTimeout(r, 5));
    d.getElementById('f-words').value = 'habitats, predator, prey, cell';
    d.getElementById('f-words').dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    d.getElementById('next-1').click();
    const row = d.querySelector('[data-row="habitats"]');
    // 2026-11-13 (second pass, L2): and what Meaning to word does with it (the wrong words written the same way).
    expect(row.querySelector('.v-out').textContent).toMatch(/^The meaning is for habitat\. Students see habitats as you typed it\. To ask about habitat, type habitat in step 1\. In Meaning to word the wrong words are written the same way: \w+s, \w+s and \w+s\.$/);
    expect(d.querySelector('[data-row="prey"] .v-out')).toBeNull();
  });
});

// A built file, played in jsdom, with a device voice that says what it is given.
function play(html) {
  const spoken = [];
  const time = { t: 1000 };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    w.speechSynthesis = { getVoices: () => [{ lang: 'en-US', localService: true, name: 'On device' }], cancel() {}, speak(u) { spoken.push(u.text); }, addEventListener() {} };
    w.SpeechSynthesisUtterance = function (text) { this.text = text; };
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  return { w, d, spoken, time, q: (s) => d.querySelector(s), start: () => { d.getElementById('learner-name').value = 'Fox1'; button('Start').click(); } };
}

describe('the adapters', () => {
  it('Hear it reads a meaning written with a blank with the word "blank", as Read aloud reads the question', () => {
    const edits = { senses: { 'adapt|v|1': { def: 'If animals ___, they change so they can live in a new place' } } };
    const rows = V.draftRows({ words: V.parseWords('adapt, habitat, predator, prey, cell').words, bank, edits });
    const made = V.lessonFromVocab({ loader: TH, rows, types: ['meaning'], mode: 'practice' });
    const at = made.blocks[0].items.findIndex((it) => it.word === 'adapt');
    const { html } = V.buildVocabPacket({ lesson: made, loader: TH, rows, bank });
    const t = play(html);
    t.start();
    for (let i = 0; i < at; i++) {
      // Answer the questions before it, right, to reach it.
      const item = made.blocks[0].items[i];
      const n = item.choices.findIndex((c) => c.text === item.answer) + 1;
      t.time.t += 400;
      t.q('[data-choice="' + n + '"]').click();
      [...t.d.querySelectorAll('#app button')].find((b) => b.textContent === 'Next').click();
    }
    const item = made.blocks[0].items[at];
    const n = item.choices.findIndex((c) => /_{2,}/.test(c.text)) + 1;
    expect(n).toBeGreaterThan(0);
    t.q('[data-read-aloud="choice-' + n + '"]').click();
    expect(t.spoken[t.spoken.length - 1]).toBe('If animals , blank, , they change so they can live in a new place');
    expect(t.spoken.join(' ')).not.toMatch(/_/);
  });

  it('a pad key pressed with the mouse leaves the focus in the answer box, so Enter sends the answer', () => {
    for (const mode of ['ccc', 'rehearsal']) {
      const input = mode === 'ccc' ? { mode, facts: '7 x 8, 6 x 7, 9 x 3' } : { mode, facts: '7 x 8, 2 x 2, 3 x 3, 4 x 4', known: ['mul:2:2', 'mul:3:3', 'mul:4:4'] };
      const { html } = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, ...input }), loader: TH });
      const t = play(html);
      t.start();
      if (t.q('[data-cover]') && !t.q('[data-cover]').hidden) t.q('[data-cover]').click();
      const box = t.q('[data-pad-input]');
      expect(t.d.activeElement, mode).toBe(box);
      for (const key of ['5', '6']) {
        const down = new t.w.MouseEvent('mousedown', { bubbles: true, cancelable: true });
        t.q('[data-key="' + key + '"]').dispatchEvent(down);
        expect(down.defaultPrevented, mode).toBe(true);
        t.q('[data-key="' + key + '"]').click();
        expect(t.d.activeElement, mode).toBe(box);
      }
      expect(box.value, mode).toBe('56');
      box.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(t.q('#app .status').textContent, mode).toBe('Yes! 7 ' + String.fromCharCode(0xD7) + ' 8 = 56.');
    }
  });
});
