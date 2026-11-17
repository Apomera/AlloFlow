// The main recording store (word_audio_shards/) also holds the basic words of the first word bank (2026-11-16).
// Before: "the", "and", "said" and 108 more had a recording only in word_audio_kokoro_bank.json, which the Word
// Sounds maker loads whole. The vocabulary maker and the Present page read only the store, so those words were
// read by the device's own voice. The clips were copied in as three new files; no existing file was changed.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const index = json('word_audio_shards/index.json');
const bank = json('word_audio_kokoro_bank.json');
const wordlist = require('../word_sounds_wordlist_en.js');

describe('basic words in the main recording store', () => {
  it('every word of the first bank that the word list uses and does not block is in the store', () => {
    const missing = Object.keys(bank.words).filter((word) => { const row = wordlist.get(word); return row && row.kokoro && !wordlist.isBlocked(word) && !index.words[word]; });
    expect(missing).toEqual([]);
    for (const word of ['the', 'and', 'is', 'you', 'said', 'was', 'they', 'went', 'with', 'your']) expect(index.words[word], word).toMatch(/^basic-0[1-3]$/);
  });

  it('the store still holds no blocked word', () => {
    // One word was blocked AFTER it was voiced: "elses" ("else's" with its apostrophe lost) became common enough to be
    // offered when the children's-book counts were re-made on 2026-11-16, and went on the blocklist that day.
    expect(Object.keys(index.words).filter((word) => wordlist.isBlocked(word))).toEqual(['elses']);
    for (const word of ['fat', 'hate', 'shot']) expect(index.words[word], word).toBeUndefined();
  });

  it('the 19 list words CMUdict does not have are in the sound dictionary, the word list and the store', () => {
    const dictionary = require('../word_sounds_phonemes_en.js');
    const SOUNDS = { bathmat: 'b a th m a t', lunchbox: 'l u n ch b o k s', seahorse: 's ee h or s', treehouse: 't r ee h ow s', whiteboard: 'w ie t b or d', teardrop: 't ear d r o p', thingamajig: 'th i ng schwa m schwa j i g' };
    for (const [word, sounds] of Object.entries(SOUNDS)) expect([...dictionary.lookup(word)[0]].join(' '), word).toBe(sounds);
    const all = ['bathmat', 'bookbag', 'cornflake', 'fishtail', 'gumdrop', 'handprint', 'litterbug', 'lovebug', 'lunchbox', 'pigtail', 'sandpit', 'seahorse', 'shutterbug', 'splotch', 'taillight', 'teardrop', 'thingamajig', 'treehouse', 'whiteboard'];
    for (const word of all) {
      expect(dictionary.lookup(word)[0], word).toBeTruthy();
      expect(wordlist.get(word), word).toMatchObject({ kokoro: true, shards: true, hasClip: true, blocked: false });
      expect(index.words[word], word).toBe('basic-04');
    }
    // No bank word is left without its sounds.
    expect(Object.keys(bank.words).filter((word) => !wordlist.get(word))).toEqual([]);
  });

  it('the new files are small, are named by the index, and their names can be published', () => {
    const keys = Object.keys(index.shards).filter((key) => /^basic-/.test(key));
    // basic-04: 19 more words of the bank, copied after they entered the word list (their sounds were written by hand).
    // basic-05, basic-06: 51 words voiced on 2026-11-16 with the store's recipe (everyday child words and forms that had
    // entered the sound dictionary with no recording). These are new recordings, not copies of the bank.
    expect(keys).toEqual(['basic-01', 'basic-02', 'basic-03', 'basic-04', 'basic-05', 'basic-06']);
    let words = 0;
    for (const key of keys) {
      const entry = index.shards[key];
      expect(entry.file).toBe(key + '.json');
      // The site leaves out any file whose name starts with "_", ".", "#" or "~" (dev-tools/check_pages_publish.cjs).
      expect(entry.file).toMatch(/^[a-z0-9][a-z0-9-]*\.json$/);
      expect(existsSync('word_audio_shards/' + entry.file)).toBe(true);
      const text = readFileSync('word_audio_shards/' + entry.file, 'utf8');
      expect(Buffer.byteLength(text)).toBe(entry.bytes);
      const data = JSON.parse(text);
      const inFile = Object.keys(data).filter((word) => word !== '_meta');
      expect(inFile.length).toBe(entry.words);
      expect(inFile.length).toBeLessThanOrEqual(40);
      expect(data._meta.format).toBe('alloflow-word-audio-shard/1');
      expect(data._meta.shard).toBe(key);
      for (const word of inFile) {
        expect(index.words[word], word).toBe(key);
        // A byte copy of the bank's clip: one voice and one recipe for the word wherever it is read from.
        if (key <= 'basic-04') expect(data[word] === bank.words[word], word).toBe(true);
        else { expect(bank.words[word], word).toBeUndefined(); expect(data[word], word).toMatch(/^data:audio\/webm;base64,[A-Za-z0-9+/]+=*$/); expect(data[word].length, word).toBeGreaterThan(6000); }
      }
      words += inFile.length;
    }
    expect(words).toBe(181);
    expect(index.counts.words).toBe(Object.keys(index.words).length);
    expect(index.counts.shards).toBe(Object.keys(index.shards).length);
    // No stray file: every sound file in the folder is one the index names.
    const named = new Set(Object.values(index.shards).map((entry) => entry.file));
    expect(readdirSync('word_audio_shards').filter((name) => /\.json$/.test(name) && name !== 'index.json' && !named.has(name))).toEqual([]);
  });

  it('the 34 words the owner asked for are in the sound dictionary and have a recording', () => {
    const dictionary = require('../word_sounds_phonemes_en.js');
    const everyday = 'bumblebee bunny burrito chipmunk crayon crayons eraser hamburger hamster hoodie ketchup koala ninja panda raccoon scooter selfie smoothie sneakers superhero taco tacos trampoline zombie emoji'.split(' ');
    const school = 'addend antonym autotroph bicameral homograph hypotenuse rhombus scalene trapezoid'.split(' ');
    for (const word of everyday.concat(school)) {
      expect(dictionary.lookup(word)[0], word).toBeTruthy();
      expect(wordlist.get(word), word).toMatchObject({ hasClip: true, shards: true, blocked: false });
      expect(index.words[word], word).toBeTruthy();
    }
    // The everyday words were voiced now; the school terms already had a recording and only lacked their sounds.
    for (const word of everyday) expect(index.words[word], word).toMatch(/^basic-0[56]$/);
    for (const word of school) expect(index.words[word], word).not.toMatch(/^basic-/);
    // Hand-written sounds for the ones the pronunciation source lacks.
    const SOUNDS = { hoodie: 'h oo_short d ee', smoothie: 's m oo dh ee', emoji: 'i m oa j ee', rhombus: 'r o m b schwa s', trapezoid: 't r a p schwa z oy d', hypotenuse: 'h ie p o t schwa n oo s' };
    for (const [word, sounds] of Object.entries(SOUNDS)) expect([...dictionary.lookup(word)[0]].join(' '), word).toBe(sounds);
    // Not marked familiar: a teacher can type them, the picker does not offer them at a grade level.
    for (const word of everyday) expect(wordlist.get(word).known, word).toBe(false);
  });

  it('the recording tool serves its page outside /app/, so the app\'s desktop rule does not stop the model download', () => {
    const tool = readFileSync('dev-tools/build_word_sounds_word_audio.cjs', 'utf8');
    expect(tool).toContain("const PAGE_PATH = '/voice-tool/';");
    expect(tool).toContain('page.goto(origin + PAGE_PATH)');
    // The rule it avoids: a loopback page under /app/ is the desktop app, which may fetch nothing from another site.
    expect(readFileSync('runtime_graph_host.js', 'utf8')).toContain("(target.location.pathname || '').indexOf('/app/') === 0");
    expect(readFileSync('runtime_graph_delivery_policy.js', 'utf8')).toContain('Desktop cross-origin runtime fetch is disabled');
  });

  it('the bank was re-voiced with the recipe of the store, so a copied clip sounds like its neighbors', () => {
    const revoiced = bank._meta.revoiced;
    expect(revoiced.post).toBe(index.post);
    expect(revoiced.voice).toBe(index.voice);
    expect(revoiced.speed).toBe(index.speed);
    expect(revoiced.keptOld).toEqual([]);
    expect(revoiced.words).toBe(Object.keys(bank.words).length);
  });

  it('the word list knows: the copied words are flagged as in the store, and still as in the bank', () => {
    for (const word of ['the', 'and', 'said']) expect(wordlist.get(word)).toMatchObject({ kokoro: true, shards: true, hasClip: true, blocked: false });
    // The Word Sounds maker keeps reading these words from the bank it already loads (packets-make.js inWordStore).
    expect(readFileSync('packets-make.js', 'utf8')).toContain('function inWordStore(word) { var row = wordlist.get(word); return !!row && row.shards && !row.kokoro; }');
  });
});
