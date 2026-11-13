// Missing Letter's wrong letters (2026-11-13, from the AlloFlow Packets review: polish_ws FINDINGS O1 and F5).
// The app's Prepare lesson (word_sounds_setup_source.jsx, compileActivityItems) took the wrong letters from a-z in
// order, so they were always a, b, c (or b, c, d): for a vowel the answer was the one vowel. Now they are three
// letters of the answer's kind (other vowels for a vowel, consonants for a consonant), letters not in the word first,
// ranked by a hash of the word, so each word has its own; the order is the pack's shuffle as before (Math.random in
// the app, the seeded generator in a practice file). The packet builder carries a copy of that function
// (createPackLogic), which tests/word_sounds_packet_builder.test.js runs beside the app's own code, so these
// tests read the boards through the copy. The builder's own post-step that did this for files is gone.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { core, builder } = tool.loadParts();
const B = builder._internals;

const WORDS = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top', 'ship', 'fish', 'frog', 'lamp',
  'boat', 'book', 'night', 'jumped', 'table', 'cube', 'box', 'quit', 'chin', 'much', 'bath', 'rich'];
const VOWELS = 'aeiou';
const boards = async (seed, words = WORDS) => {
  const logic = B.createPackLogic({ core, knownWords: [], seed });
  const rows = [];
  for (let i = 0; i < words.length; i++) {
    rows.push(await logic.preparePackWordAiFree({ word: words[i], index: i, batchWords: words, isEnglish: true, estimate: logic.estimatePackPhonemes }));
  }
  return logic.compileActivityItems(rows.filter(Boolean)).map((row) => ({ word: row.word, ...row.activityItems.missing_letter }));
};
const wrong = (b) => b.options.filter((letter) => letter !== b.correctLetter);

describe('Missing Letter: the wrong letters', () => {
  it('three letters of the answer\'s kind, none of them in the word, all different', async () => {
    const made = await boards(1);
    expect(made).toHaveLength(WORDS.length);
    for (const b of made) {
      expect(b.word[b.hiddenIndex], b.word).toBe(b.correctLetter);
      expect(b.options, b.word).toHaveLength(4);
      expect(new Set(b.options).size, b.word).toBe(4);
      expect(b.options.filter((l) => l === b.correctLetter), b.word).toHaveLength(1);
      const vowel = VOWELS.includes(b.correctLetter);
      for (const letter of wrong(b)) {
        expect(VOWELS.includes(letter), b.word + ': ' + letter).toBe(vowel);
        expect(b.word.includes(letter), b.word + ': ' + letter + ' is in the word').toBe(false);
      }
    }
    // Before: for pig (hidden g) the choices were g, a, b, c; every board took the start of a-z.
    expect(made.filter((b) => wrong(b).join('') === 'abcdefghijklmnopqrstuvwxyz'.split('').filter((l) => l !== b.correctLetter).slice(0, 3).join(''))).toEqual([]);
    // Each word its own: the consonant boards do not share one set.
    const sets = new Set(made.filter((b) => !VOWELS.includes(b.correctLetter)).map((b) => wrong(b).slice().sort().join('')));
    expect(sets.size).toBeGreaterThanOrEqual(15);
  });

  it('the same letters for a word whatever the seed; the order follows the seed and the answer moves about', async () => {
    const one = await boards(1), two = await boards(2), again = await boards(1);
    expect(again).toEqual(one);
    expect(two.map((b) => wrong(b).slice().sort().join(''))).toEqual(one.map((b) => wrong(b).slice().sort().join('')));
    expect(two.map((b) => b.options.join(''))).not.toEqual(one.map((b) => b.options.join('')));
    expect(new Set(one.map((b) => b.options.indexOf(b.correctLetter))).size).toBeGreaterThanOrEqual(3);
  });

  it('a vowel in a word with other vowels: the other vowels; y as the only vowel gets vowels too', async () => {
    const [boat] = await boards(3, ['boat']);
    expect(boat.correctLetter).toBe('a');
    // o is in the word, so the three are the rest: e, i, u.
    expect(wrong(boat).slice().sort()).toEqual(['e', 'i', 'u']);
    const [dry] = await boards(3, ['dry']);
    expect(dry.correctLetter).toBe('y');
    expect(wrong(dry).every((l) => VOWELS.includes(l))).toBe(true);
  });

  it('one implementation: the app\'s source and the module it ships carry the rule; the builder has no post-step', () => {
    const builderSource = readFileSync('word_sounds_packet_builder.js', 'utf8');
    expect(builderSource).not.toContain('missingLetterChoices');
    const line = "? (vowelLetter ? 'aeiou' : 'bcdfghjklmnprstvwz').split('').sort((a, b) => (word.includes(a) - word.includes(b)) || (letterRank(a) - letterRank(b)))";
    expect(builderSource).toContain(line);
    expect(readFileSync('word_sounds_setup_source.jsx', 'utf8')).toContain(line);
    for (const file of ['word_sounds_setup_module.js', 'desktop/web-app/public/word_sounds_setup_module.js', 'desktop/app-build/word_sounds_setup_module.js', 'desktop/web-app/build/word_sounds_setup_module.js']) {
      const shipped = readFileSync(file, 'utf8');
      expect(shipped, file).toContain('(vowelLetter ? "aeiou" : "bcdfghjklmnprstvwz").split("").sort(');
      expect(shipped, file).not.toContain('packIsEnglish ? "abcdefghijklmnopqrstuvwxyz".split("") : shuffleForPack(allPackLetters)');
    }
  });
});
