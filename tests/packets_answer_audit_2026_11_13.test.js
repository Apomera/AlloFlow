// AlloFlow Packets answer audit (2026-11-13): every question has exactly one right answer among its choices. The audit
// (C:/tmp/packets_build_1111/answer_audit/, RESULTS.txt) built every item the makers can make with the real builders and
// adapters; one test here for each cause it found:
// - Word Sounds is heard. A wrong choice that sounds the same as the answer (burger: /ur/ beside /er/), rhymes with the
//   word, or is graded right by the player's spelling rime (rolled: "glowed" ends in -ed too) is taken off the board; a
//   Word Families ending that, said alone, is another sound (-own for down, -are for bare) is left out; a missing letter
//   that spells a word that sounds the same (see: sea) is swapped; a word that sounds like another word a child knows
//   (bare, bear) gets no typed spelling (word_sounds_packet_builder.js, oneRightAnswer).
// - The sound /y/ played the bank's ee clip (the spelling table maps the letter y to ee): yes began with /ee/, and in
//   Find Sounds /y/ and /ee/ were one sound (word_sounds_take_home_loader.js, phonemeClip).
// - Break it Down graded only one order of two chips that are one sound (murder: ur ... er) (segmentation.js).
// - Read & Match showed two pictures that are the same picture (ask, asked) (decoding.js).
// - Finish the Sentence kept a distractor's spelling for the answer's recording key, and then graded no choice right
//   ("ice  cream"); Read the Story showed two choices that look the same (read_sentence.js, read_passage.js).
// - A math check took a teacher's stated answer that the arithmetic does not give (3 + 4 + 5 = 13), and a problem with a
//   blank or a second = sign (packet_check_builder.js).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
// The maker's words: the bank and the word store (burger, bare and down have their clips only there).
const BANKS = tool.loadBanks();
const PC = require('../packet_check_builder.js');
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
const build = (words, activities, over = {}) => builder.buildPacket({ words, activities, seed: 1, title: 'Answer audit', core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
  createdAt: '2026-11-13T00:00:00.000Z', noFile: true, ...over });
const blockOf = (made, id) => (made.lesson ? made.lesson.blocks.find((b) => b.activity === id) : null);
const itemOf = (made, id, word) => { const b = blockOf(made, id); return b ? b.items.find((i) => i.word === word) : null; };
const reasonOf = (made, word, id) => (made.exceptions.find((e) => e.word === word && e.activity === id) || {}).reason || '';
const sounds = (w) => { const e = core.dictionarySounds(w); return e ? e.sounds.map((s) => (s === 'ir' || s === 'ur' ? 'er' : s)).join(' ') : ''; };
// Every way the dictionary says a word (a recording says one of them).
const allSounds = (w) => { const e = core.dictionarySounds(w); return e ? [e.sounds].concat(e.alternates || []).map((p) => p.map((s) => (s === 'ir' || s === 'ur' ? 'er' : s)).join(' ')) : []; };
const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 12), 44); return 'data:audio/wav;base64,' + b.toString('base64'); };

// A render() in jsdom with the player's ctx: answer() records each graded response and returns 'retry'.
function draw(render, item) {
  const { window } = new JSDOM('<!doctype html><body><main id="app"></main></body>');
  const doc = window.document;
  const el = (tag, attrs, children) => {
    const node = doc.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach((ev) => node.addEventListener(ev, attrs.on[ev]));
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach((c) => { if (c) node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return node;
  };
  const L = Object.assign({}, loader.DEFAULT_LABELS);
  Object.keys(loader.ADAPTERS).forEach((id) => Object.assign(L, loader.ADAPTERS[id].labels));
  const root = doc.createElement('div');
  doc.getElementById('app').appendChild(root);
  const log = [];
  const ctx = { root, el, L, item, fmt: (t, p) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (p && p[k] != null ? p[k] : m)), matches: core.soundAnswerMatches,
    showLetters: false, play: () => new Promise(() => {}), playAll: () => new Promise(() => {}), stop() {}, announce() {}, image: () => null, ordinal: (p) => String(p + 1),
    sound: (l) => '/' + l + '/', support() {}, isDone: () => false, attempts: () => log.length, practice() {},
    answer: (response, isCorrect) => { log.push({ response, isCorrect: !!isCorrect }); return 'retry'; } };
  render(item, ctx);
  return { root, log, L, click: (b) => b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) };
}

describe('Word Sounds: every board keeps one right answer, judged by sound (builder oneRightAnswer)', () => {
  it('Find Sounds never shows two labels of one sound (burger: er and ur), at every Choices level and version', async () => {
    for (const choices of ['easy', 'medium', 'all']) {
      for (const seed of [1, 2, 3]) {
        const made = await build(['burger', 'murder', 'further', 'turner'], ['isolation'], { choices, seed });
        for (const item of blockOf(made, 'isolation').items) {
          const heard = item.choices.map((c) => (c.label === 'ir' || c.label === 'ur' ? 'er' : c.label));
          expect(new Set(heard).size, item.word + ' ' + choices + ' ' + seed).toBe(heard.length);
          expect(item.choices.filter((c) => core.soundAnswerMatches(c.label, item.target)).length).toBe(1);
        }
      }
    }
  });
  it('Rhyme Time has no wrong choice that rhymes by sound or that the player grades right by its spelling (rolled, glowed)', async () => {
    const made = await build(['rolled', 'cat', 'hat', 'sat', 'mat', 'rat', 'pat', 'bug', 'hug', 'rug', 'mug', 'cow', 'how', 'now', 'down', 'bare', 'go', 'so', 'no', 'low', 'show'], ['rhyming'], { choices: 'all' });
    const items = blockOf(made, 'rhyming').items;
    expect(items.length).toBeGreaterThan(8);
    const rimeOf = (s) => { const m = /[aeiou]+[^aeiou]*$/.exec(s); return m ? m[0] : ''; };
    const lastOf = (q) => { const p = q.split(' '); const v = p.map((s, i) => (/^(a|e|i|o|u|ay|ee|ie|oa|oo|oo_short|oy|ow|aw|ar|or|er|air|ear|schwa)$/.test(s) ? i : -1)).filter((i) => i >= 0); return p.slice(v[v.length - 1]).join(' '); };
    const rhymeAny = (a, b) => allSounds(a).some((x) => allSounds(b).some((y) => x !== y && lastOf(x) === lastOf(y)));
    for (const item of items) {
      expect(item.choices.filter((c) => c.ok).length, item.word).toBe(1);
      for (const c of item.choices.filter((x) => !x.answer)) {
        expect(rimeOf(c.text) === rimeOf(item.word) && rimeOf(item.word).length >= 2, item.word + ' / ' + c.text).toBe(false);
        expect(rhymeAny(c.text, item.word), item.word + ' rhymes with ' + c.text).toBe(false);
      }
    }
    expect((itemOf(made, 'rhyming', 'rolled') || { choices: [] }).choices.map((c) => c.text)).not.toContain('glowed');
  });
  it('Word Families is left out when its ending, said alone, is another sound (-own for down, -are for bare); kept for -at', async () => {
    const made = await build(['down', 'bare', 'cat', 'hat', 'sat', 'mat'], ['word_families']);
    expect(reasonOf(made, 'down', 'word_families')).toBe('the ending -own, said alone, does not sound like the end of "down"');
    expect(reasonOf(made, 'bare', 'word_families')).toBe('the ending -are, said alone, does not sound like the end of "bare"');
    const cat = itemOf(made, 'word_families', 'cat');
    expect(cat && cat.rime).toBe('at');
    for (const chip of cat.chips) expect(sounds(chip.text).endsWith('a t'), chip.text).toBe(chip.member);
  });
  it('a word that sounds like another word a child knows gets no Spelling Bee or Sight & Spell, with the reason; others keep them', async () => {
    const made = await build(['bare', 'sun', 'to', 'cat', 'dog'], ['spelling_bee', 'orthography']);
    expect(reasonOf(made, 'bare', 'spelling_bee')).toBe('it sounds the same as "bear", so a student who hears it cannot tell which spelling is meant');
    expect(reasonOf(made, 'sun', 'orthography')).toMatch(/^it sounds the same as "son"/);
    expect(reasonOf(made, 'to', 'spelling_bee')).toMatch(/"too"|"two"/);
    for (const id of ['spelling_bee', 'orthography']) expect(blockOf(made, id).items.map((i) => i.word).sort()).toEqual(['cat', 'dog']);
  });
  // see: the app's letters for the hidden e of s-e-_ include a, which spells sea. The builder swaps it (the app still offers it).
  it('Missing Letter never offers a letter that spells a familiar word that sounds the same, for any version', async () => {
    const pairs = { sun: 'son', son: 'sun', see: 'sea', sea: 'see', meet: 'meat', meat: 'meet', week: 'weak', weak: 'week', road: 'rode', tail: 'tale', made: 'maid', hare: 'hair', pair: 'pear' };
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const made = await build(Object.keys(pairs), ['missing_letter'], { seed });
      for (const item of blockOf(made, 'missing_letter').items) {
        expect(item.options).toContain(item.target);
        expect(new Set(item.options).size).toBe(item.options.length);
        for (const o of item.options.filter((x) => x !== item.target)) {
          const other = item.word.slice(0, item.hiddenIndex) + o + item.word.slice(item.hiddenIndex + 1);
          expect(sounds(other) !== '' && sounds(other) === sounds(item.word) && wordlist.get(other) && !wordlist.get(other).british, item.word + ' -> ' + other).toBe(false);
        }
      }
    }
  });
  it('Blend Sounds never has a wrong choice that sounds the same as the word, in any way the dictionary says them (gist, just)', async () => {
    const made = await build(['sun', 'son', 'one', 'won', 'red', 'read', 'blue', 'blew', 'eight', 'ate', 'hear', 'here', 'sea', 'see', 'gist', 'just', 'fur', 'for'], ['blending'], { choices: 'all' });
    for (const item of blockOf(made, 'blending').items) {
      for (const c of item.choices.filter((x) => x.text !== item.target)) expect(allSounds(c.text).some((x) => allSounds(item.target).includes(x)), item.target + ' / ' + c.text).toBe(false);
    }
  });
});

describe('the sound /y/ plays the bank\'s y clip, not its ee clip (loader phonemeClip)', () => {
  it('Break it Down for "yes" gives /y/ and /ee/ their own clips', () => {
    const rows = [{ word: 'yes', targetWord: 'yes', phonemes: ['y', 'e', 's'], phonemeCount: 3,
      activityItems: { segmentation: { chips: [{ phoneme: 'y' }, { phoneme: 'e' }, { phoneme: 's' }, { phoneme: 'ee' }], slotCount: 3 } } }];
    const banks = { words: { yes: wav('yes') }, phonemes: { y: wav('Y'), ee: wav('EE'), e: wav('E'), s: wav('S') }, instructions: { inst_segmentation: wav('inst') } };
    const { lesson } = loader.lessonFromPack(rows, { core, banks, activities: ['segmentation'], title: 'y', lessonId: 'y' });
    const chips = lesson.blocks[0].items[0].chips;
    const clip = (label) => lesson.audio[chips.find((c) => c.label === label).audio];
    expect(clip('y')).toBe(wav('Y'));
    expect(clip('ee')).toBe(wav('EE'));
  });
  it('a real file: Find Sounds for "furious" has /y/ and /ee/ on different clips', async () => {
    for (const seed of [1, 2, 3]) {
      const made = await build(['furious', 'cute', 'yes', 'use', 'music'], ['isolation'], { choices: 'all', seed });
      for (const item of blockOf(made, 'isolation').items) {
        const ids = item.choices.map((c) => c.audio);
        expect(new Set(ids).size, item.word).toBe(ids.length);
      }
    }
  });
});

describe('Break it Down grades two chips of one sound in either box (murder: ur ... er)', () => {
  it('both orders of the ur and er chips are right; a wrong sound is still wrong', () => {
    const item = { id: 'segmentation-0', word: 'murder', target: 'm ur d er', sounds: ['m', 'ur', 'd', 'er'],
      chips: ['er', 'd', 'm', 'ur', 's'].map((label, i) => ({ label, audio: 'a' + i })), wordAudio: 'w', promptAudio: 'p' };
    const place = (order) => {
      const t = draw(loader.ADAPTERS.segmentation.render, item);
      const tray = [...t.root.querySelectorAll('ul[aria-label] > li')].map((li) => li.querySelectorAll('button')[1]);
      const boxes = [...t.root.querySelectorAll('ol.slots button')];
      order.forEach((ci, bi) => { t.click(tray[ci]); t.click(boxes[bi]); });
      [...t.root.querySelectorAll('button')].filter((b) => b.textContent === t.L.segmentation_check).forEach((b) => t.click(b));
      return t.log[t.log.length - 1].isCorrect;
    };
    expect(place([2, 3, 1, 0])).toBe(true);   // m ur d er
    expect(place([2, 0, 1, 3])).toBe(true);   // m er d ur: heard the same
    expect(place([2, 4, 1, 0])).toBe(false);  // m s d er
  });
});

describe('Read & Match never shows two of the same picture (decoding)', () => {
  it('a wrong word with the answer\'s picture, or a picture already shown, is left off', () => {
    const P1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk';
    const P2 = P1 + 'AA', P3 = P1 + 'BB';
    const rows = [{ word: 'ask', targetWord: 'ask', phonemes: ['a', 's', 'k'], image: P1, activityItems: { decoding: { choices: ['asked', 'ask', 'cat', 'cats', 'dog'] } },
      _decodingAssets: { asked: P1, cat: P2, cats: P2, dog: P3 } }];
    const { lesson } = loader.lessonFromPack(rows, { core, banks: {}, activities: ['decoding'], title: 'd', lessonId: 'd' });
    const item = lesson.blocks[0].items[0];
    expect(item.choices.map((c) => c.text)).toEqual(['ask', 'cat', 'dog']);
    expect(new Set(item.choices.map((c) => c.image)).size).toBe(3);
  });
});

describe('Finish the Sentence and Read the Story: the answer\'s own spelling, one key for prepare and render', () => {
  const env = (word, row) => ({ word, core, isEnglish: true, packClip: () => 'p', wordClip: () => 'w', bankClip: () => 'b', phonemeClip: () => 'f', image: () => null, packImage: () => null, label: (x) => x, packWords: [row] });
  const cases = [['ice cream', 'I like ice cream.', ['ice  cream', 'ice cream', 'cake', 'pie']], ['caf\u00e9', 'We ate at the caf\u00e9.', ['cafe\u0301', 'caf\u00e9', 'park', 'shop']],
    ['cat', 'I see the cat.', ['Cat', 'cat', 'dog', 'hat']]];
  for (const [word, sentence, options] of cases) {
    it('"' + word + '" among ' + JSON.stringify(options) + ': one choice for it, graded right', () => {
      const row = { word, targetWord: word, activityItems: { read_sentence: { sentence, options },
        read_passage: { story: sentence + ' It is fun.', parts: [{ before: sentence.slice(0, sentence.indexOf(word)).trim(), after: sentence.slice(sentence.indexOf(word) + word.length).trim() }, { text: 'It is fun.' }], options } } };
      for (const id of ['read_sentence', 'read_passage']) {
        const made = loader.ADAPTERS[id].prepare(row, env(word, row));
        expect(made.item, id).toBeTruthy();
        expect(made.item.options.filter((o) => o.normalize('NFC').toLowerCase().replace(/\s+/g, ' ') === word.toLowerCase()), id).toEqual([word]);
        const t = draw(loader.ADAPTERS[id].render, Object.assign({ id: id + '-0', word }, made.item));
        [...t.root.querySelectorAll('li.choice button.primary')].forEach((b) => t.click(b));
        expect(t.log.filter((e) => e.isCorrect).map((e) => e.response), id).toEqual([word]);
      }
    });
  }
});

describe('a math check takes a stated answer only when the arithmetic gives it (packet_check_builder.js)', () => {
  const make = (problems) => () => PC.lessonFromMathProblems({ problems });
  it('refuses a wrong stated answer, with the right one in the reason', () => {
    expect(make([{ display: '3 + 4 + 5', answer: 13 }])).toThrow('Problem 1: 3 + 4 + 5 is 12, not 13.');
    expect(make([{ display: '10 - 3 - 2', answer: 9 }])).toThrow('Problem 1: 10 - 3 - 2 is 5, not 9.');
    expect(make([{ display: '2 x 3', answer: -6 }])).toThrow('Problem 1: 2 x 3 is 6, not -6.');
    expect(make([{ display: '2 + 3 x 4', answer: 20 }])).toThrow('Problem 1: 2 + 3 x 4 is 14, not 20. Times and divide are worked out before plus and minus: use brackets, like (2 + 3) x 4.');
    expect(make([{ display: '7 / 2', answer: 3 }])).toThrow('Problem 1: 7 / 2 does not come out to a whole number.');
    expect(make([{ display: '8 \u00F7 0', answer: 1 }])).toThrow('Problem 1: 8 \u00F7 0 divides by 0.');
  });
  it('refuses a blank or a second = sign', () => {
    expect(make([{ display: '__ + 3', answer: 5 }])).toThrow('Problem 1: it has a blank (__). Write the whole problem, like 3 + 4 + 5 = 12.');
    expect(make([{ display: '4 + 4 = 8', answer: 8 }])).toThrow('Problem 1: write the problem with one = sign, before its answer.');
  });
  it('takes right ones, and words it cannot work out', () => {
    for (const [display, answer] of [['3 + 4 + 5', 12], ['2 + 3 x 4', 14], ['(2 + 3) x 4', 20], ['10 - 3 - 2', 5], ['-3 + 5', 2], ['12 \u2212 5', 7], ['8 \u00F7 2', 4], ['0 / 5', 0],
      ['12000 + 3500 + 25', 15525], ['half of 10', 5]]) {
      expect(PC.lessonFromMathProblems({ problems: [{ display, answer }] }).blocks[0].items[0], display).toMatchObject({ display, answer });
    }
  });
});

describe('vocabulary: a word of the list that a student could take for the word is never one of its wrong answers', () => {
  const VB = require('../packet_vocab_builder.js');
  const bank = require('../packets_vocab_bank_en.js');
  const { readFileSync } = require('node:fs');
  if (!bank.ready()) bank.shards.forEach((s, i) => bank.add(JSON.parse(readFileSync(s.url, 'utf8')), i + 1));
  const rowOf = (words, word) => VB.draftRows({ words, bank }).find((r) => r.word === word);
  const all = (r) => [r.blank.wrong, r.wrong.map((c) => c.word), r.wordAsk.wrong].map((list) => list.map((w) => w.toLowerCase()));
  it('one word with two spellings (afterward, afterwards), and a word inside a longer one (sun, sunlight)', () => {
    for (const list of all(rowOf(['afterwards', 'afterward', 'soon', 'often', 'never', 'always', 'quickly', 'later'], 'afterwards'))) expect(list).not.toContain('afterward');
    for (const list of all(rowOf(['sunlight', 'sun', 'moon', 'star', 'cloud', 'rain', 'wind'], 'sunlight'))) expect(list).not.toContain('sun');
  });
  it('a word that a meaning of the other names (seem: "To look like or appear to be something"; photo: "A picture ...")', () => {
    for (const list of all(rowOf(['seem', 'appear', 'look', 'feel', 'sound', 'become', 'remain'], 'seem'))) expect(list).not.toContain('appear');
    for (const list of all(rowOf(['photo', 'picture', 'drawing', 'map', 'poster', 'letter'], 'photo'))) expect(list).not.toContain('picture');
  });
  it('after "a", the choices start with the same kind of letter as the answer (a unified whole)', () => {
    const r = rowOf(['unify', 'organize', 'include', 'invite', 'order', 'expand', 'combine', 'connect', 'separate'], 'unify');
    expect(r.blank.answer).toBe('unified');
    for (const w of r.blank.wrong) expect(/^[aeiou]/.test(w), w).toBe(true);
    expect(r.blank.why).toBe('Fill the blank needs 3 other verbs from your list that can be written like unified and start with a vowel, as "unified" does after "a". Add words to the list, or edit the sentence.');
  });
});
