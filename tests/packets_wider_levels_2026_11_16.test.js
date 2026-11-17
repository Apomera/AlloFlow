// The picker's two wider levels, "More challenging" and "Advanced" (2026-11-16, asked for by the owner: older
// students, enrichment, spelling bees). They are not grade levels: no curriculum document is behind them.
//   challenging: not familiar (the grade levels' rule), in at least 10 of the 400 children's books
//   advanced:    not familiar, in fewer than 10, or in none
// Both: only words on data/word_sounds_wider_en.txt, the held-back words that were read and kept. A word nobody
// read is never offered (it can still be typed).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const dictionary = require('../word_sounds_phonemes_en.js');
const pronunciations = require('../word_sounds_pronunciations.js');
const wordlist = require('../word_sounds_wordlist_en.js');
const builder = require('../word_sounds_packet_builder.js');
const tool = require('../dev-tools/build_word_sounds_wordlist.cjs');
// eslint-disable-next-line no-new-func
const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore(arguments[0]);')({ phonemes: dictionary, pronunciations });
const ctx = (list, seed = 1) => ({ wordlist: list, core, dictionary, seed });
const familiar = (row) => row.known || (row.zipf >= 3.8 && row.books >= 20);
// A wider level takes words of up to 15 letters (the grade levels: 10).
const usable = (row) => /^[a-z]{2,15}$/.test(row.word) && /[aeiouy]/.test(row.word) && row.hasClip && !row.blocked && !row.nearBlocked && !row.soft && !row.british;

describe('the rule, on a word list where the test says which words were read', () => {
  // The same word list with its own "wider" marks replaced: every other held-back word is marked as read.
  const held = wordlist.rows().filter((row) => usable(row) && !familiar(row));
  const marked = new Set(held.filter((row, i) => i % 2 === 0).map((row) => row.word));
  const fake = { meta: wordlist.meta, stages: wordlist.stages, rows: () => wordlist.rows().map((row) => Object.assign({}, row, { wider: marked.has(row.word) })) };
  const all = (level, seed) => builder.pickWords({ count: 100000, level }, ctx(fake, seed));
  const challenging = all('challenging'), advanced = all('advanced');
  const byWord = new Map(wordlist.rows().map((row) => [row.word, row]));

  it('each level holds exactly the marked, unfamiliar words on its side of 10 books', () => {
    const want = (test) => held.filter((row) => marked.has(row.word) && test(row)).map((row) => row.word).sort();
    expect(challenging.words.slice().sort()).toEqual(want((row) => row.books >= 10));
    expect(advanced.words.slice().sort()).toEqual(want((row) => row.books < 10));
    expect(challenging.pool).toBeGreaterThan(1000);
    expect(advanced.pool).toBeGreaterThan(1000);
    for (const word of challenging.words) expect(advanced.words.includes(word), word).toBe(false);
  });

  it('never returns a familiar word, a word that was not read, a blocked word or a word with no recording', () => {
    for (const result of [challenging, advanced]) {
      for (const word of result.words) {
        const row = byWord.get(word);
        expect(familiar(row), word).toBe(false);
        expect(marked.has(word), word).toBe(true);
        expect(usable(row), word).toBe(true);
      }
    }
    expect(advanced.reasons.notReadForTheWiderLevels).toBeGreaterThan(1000);
    expect(advanced.reasons.inTheGradeLevels).toBeGreaterThan(5000);
    expect(advanced.reasons.inTheOtherWiderLevel).toBe(challenging.pool);
  });

  it('is mixed whole by the seed (not A to Z), and the same seed gives the same words', () => {
    const a = builder.pickWords({ count: 30, level: 'advanced' }, ctx(fake, 1)).words;
    const again = builder.pickWords({ count: 30, level: 'advanced' }, ctx(fake, 1)).words;
    const b = builder.pickWords({ count: 30, level: 'advanced' }, ctx(fake, 2)).words;
    expect(again).toEqual(a);
    expect(b).not.toEqual(a);
    expect(new Set(a.map((word) => word[0])).size).toBeGreaterThan(8);
  });

  it('works with a sound and a pattern, and refuses a level it does not know', () => {
    const sh = builder.pickWords({ count: 100000, level: 'advanced', targetSound: 'sh' }, ctx(fake));
    expect(sh.pool).toBeGreaterThan(20);
    for (const word of sh.words.slice(0, 50)) expect([...dictionary.lookup(word)[0]], word).toContain('sh');
    expect(() => builder.pickWords({ level: 'expert' }, ctx(fake))).toThrow(/Unknown level: expert \(use challenging, advanced\)/);
  });

  it('a grade level, and no level at all, answer exactly as before', () => {
    for (const criteria of [{ count: 100000 }, { count: 100000, stage: 'G1 early' }, { count: 12, stage: 'K early' }]) {
      const withMarks = builder.pickWords(criteria, ctx(fake)), plain = builder.pickWords(criteria, ctx(wordlist));
      expect(withMarks.words).toEqual(plain.words);
      expect(Object.keys(withMarks.reasons)).toEqual(['fitsTheCriteria', 'blocked', 'soundsLikeABlockedWord', 'oneDroppedSoundFromABlockedWord', 'usedOnlyWhenTyped', 'britishSpellingOrWord', 'notFamiliarEnough', 'noRecording', 'excluded']);
      for (const word of withMarks.words.slice(0, 300)) expect(familiar(byWord.get(word)), word).toBe(true);
    }
  });
});

describe('the list of words read and kept (data/word_sounds_wider_en.txt)', () => {
  const kept = tool.readWider().flatMap((section) => section.words);
  const set = new Set(kept);

  it('is a list of dictionary words, each once, none of them blocked or typed-only', () => {
    expect(kept.length).toBeGreaterThan(5000);
    expect(set.size).toBe(kept.length);
    for (const word of kept) {
      const row = wordlist.get(word);
      expect(row, word).toBeTruthy();
      expect(row.wider, word).toBe(true);
      expect(row.blocked || row.soft, word).toBe(false);
      expect(row.hasClip, word).toBe(true);
    }
    expect(wordlist.rows().filter((row) => row.wider).length).toBe(kept.length);
    expect(wordlist.meta.widerEntries).toBe(kept.length);
  });

  it('holds ordinary rare words and leaves out names, brands and scraps', () => {
    for (const word of ['esoteric', 'acropolis', 'phenomenon', 'verdict', 'hydrogen', 'starboard', 'plumage', 'deduce']) expect(set.has(word), word).toBe(true);
    for (const word of ['kramer', 'leigh', 'castillo', 'francisco', 'werner', 'dunkin', 'medicaid', 'bopp', 'hanover', 'belize']) expect(set.has(word), word).toBe(false);
  });

  it('the build refuses a kept word that is also on the blocklist', () => {
    const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wider-')), 'wider.txt');
    fs.writeFileSync(file, '## test\nesoteric gun\n');
    expect(() => tool.build({ wider: file })).toThrow(/Wider list: also on the blocklist or its \[soft\] list \(keep one\): gun/);
  });

  it('the real picker offers words at both levels, more than the grade levels hold', () => {
    const grade = builder.pickWords({ count: 100000 }, ctx(wordlist)).pool;
    const challenging = builder.pickWords({ count: 100000, level: 'challenging' }, ctx(wordlist)).pool;
    const advanced = builder.pickWords({ count: 100000, level: 'advanced' }, ctx(wordlist)).pool;
    expect(challenging).toBeGreaterThan(2000);
    expect(advanced).toBeGreaterThan(2000);
    expect(challenging + advanced).toBeGreaterThan(grade);
  });
});

describe('how long a practice word may be', () => {
  const grade = builder.pickWords({ count: 100000 }, ctx(wordlist)).words;
  const advanced = builder.pickWords({ count: 100000, level: 'advanced' }, ctx(wordlist)).words;
  const challenging = builder.pickWords({ count: 100000, level: 'challenging' }, ctx(wordlist)).words;

  it('a grade level keeps to 10 letters; a wider level goes to 15', () => {
    expect([builder.GRADE_MAX_LETTERS, builder.MAX_LETTERS]).toEqual([10, 15]);
    expect(Math.max(...grade.map((word) => word.length))).toBe(10);
    for (const stage of builder.stageList()) expect(Math.max(...builder.pickWords({ count: 100000, stage: stage.id }, ctx(wordlist)).words.map((word) => word.length)), stage.id).toBeLessThanOrEqual(10);
    expect(Math.max(...advanced.map((word) => word.length))).toBe(15);
    expect(Math.max(...challenging.map((word) => word.length))).toBeLessThanOrEqual(15);
    expect(advanced.filter((word) => word.length > 10).length).toBeGreaterThan(2000);
    for (const word of ['photosynthesis', 'hieroglyphics']) expect(advanced.includes(word) || challenging.includes(word), word).toBe(true);
    // 16 letters and more wait: a 15-letter word is the longest any activity screen was checked with.
    expect(wordlist.get('electrocardiogram').wider).toBe(true);
    expect(advanced.includes('electrocardiogram')).toBe(false);
  });

  it('a typed word of up to 15 letters makes questions; 16 letters is refused with the reason', async () => {
    const tool = require('../dev-tools/make_word_sounds_packet.cjs');
    const { loader } = tool.loadParts();
    const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
    const fake = (name) => new Proxy({}, { get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
      getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined) });
    const banks = { words: fake('words'), phonemes: fake('phonemes'), isolation: fake('isolation'), instructions: fake('instructions') };
    const result = await builder.buildPacket({ words: ['chronologically', 'photosynthesis', 'electrocardiogram'], activities: ['spelling_bee', 'word_scramble', 'counting'],
      title: 'Long words', seed: 7, core, dictionary, banks, loader, wordlist, createdAt: '2026-11-16T00:00:00.000Z' });
    expect(result.html).toMatch(/^<!doctype html>/i);
    expect(result.manifest.items.total).toBe(6);
    const refused = result.exceptions.filter((e) => e.word === 'electrocardiogram');
    expect(refused.map((e) => e.reason)).toEqual(['not a usable practice word (letters only, 2 to 15 letters, with a vowel)']);
    expect(result.exceptions.filter((e) => e.word !== 'electrocardiogram')).toEqual([]);
  });

  it('the app\'s own rule for wrong-answer pools is unchanged (still 10), and still matches the app', () => {
    const source = read('word_sounds_packet_builder.js'), app = read('word_sounds_setup_source.jsx');
    const rule = "if (v.length < 2 || v.length > 10) return true;   // \"a\" is a sight word, not a family member";
    expect(source).toContain(rule);
    expect(app).toContain(rule);
  });
});

describe('the maker offers the two levels after the grade levels', () => {
  const page = read('packets-make.js');
  it('by name, with a line that says they are not from a curriculum', () => {
    expect(page).toContain("{ id: 'wider:challenging', level: 'challenging', name: 'More challenging words',");
    expect(page).toContain("{ id: 'wider:advanced', level: 'advanced', name: 'Advanced words',");
    expect(page.split('Chosen by how widely a word is used, not from a curriculum. Any letter pattern, up to 15 letters.').length - 1).toBe(2);
    expect(page).toContain("function maxLetters() { return (builder && builder.MAX_LETTERS) || 10; }");
    expect(page).toContain("widerBox.label = 'Past the grade levels (by how rare a word is)';");
    expect(page).toContain("if (levelRow(now.stage)) asked.level = levelRow(now.stage).level;");
  });
});
