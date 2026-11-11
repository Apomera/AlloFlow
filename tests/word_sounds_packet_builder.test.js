import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// The packet builder (word_sounds_packet_builder.js) makes a Word Sounds practice file with no AI and
// no app. It carries its own COPY of the prepare + board logic of word_sounds_setup_source.jsx; the
// parity tests below run the app's real code (sliced from the source) beside the copy so it cannot drift.
const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const wordlistTool = require('../dev-tools/build_word_sounds_wordlist.cjs');
const phonemeTool = require('../dev-tools/build_word_sounds_phonemes.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const pronunciations = require('../word_sounds_pronunciations.js');
const BANKS = tool.loadBanks();
const B = builder._internals;

const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const builderSource = readFileSync('word_sounds_packet_builder.js', 'utf8');
const between = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < a) throw Error('Missing production boundary: ' + start);
  return source.slice(a, b);
};
const lists = phonemeTool.appWordLists(core);
const alloData = { SOUND_MATCH_POOL: lists.soundMatchPool, RIME_FAMILIES: { all: lists.rimeFamilies },
  SIGHT_WORD_PRESETS: { all: lists.sightWords }, WORD_FAMILY_PRESETS: { all: lists.wordFamilies } };

// The app's own functions. The one change: its shuffle draws from the test's generator, re-seeded at
// the top of each word exactly where the builder re-seeds (the source is patched in memory, not on disk).
const LOOP_HEAD = 'items.forEach((item, itemIndex) => {\n                const word = normalizePackKey(item.targetWord || item.word || item.term);';
const compileSlice = between('const normalizePackKey =', 'const handleStart =');
const appLogic = (env) => {
  if (compileSlice.split(LOOP_HEAD).length !== 2) throw Error('The per-word loop of compileActivityItems moved: update LOOP_HEAD');
  return new Function('env', `
    const window = env.window;
    ${coreSource}
    const WS_CORE = createWordSoundsCore({ phonemes: env.phonemes, pronunciations: env.pronunciations });
    const instructionalProfile = {}, wordSoundsLanguage = 'en';
    const Math = Object.create(globalThis.Math); Math.random = () => env.random();
    const espeakPackPhonemes = async () => null;
    ${between('function parseWordSoundsAnalysis(', 'function useWordSoundsAiTopic(')}
    ${between('const PACK_COMMON_WORDS =', '// ── eSpeak G2P')}
    ${between('const preparePackRhyme =', '// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY')}
    ${compileSlice.replace(LOOP_HEAD, () => LOOP_HEAD + ' env.reseed(word);')}
    return { preparePackWordAiFree, compileActivityItems, estimatePackPhonemes, PACK_COMMON_WORDS, isUnusableAsPhonicsWord };
  `)(env);
};
const appSide = (seed) => {
  let random = () => { throw Error('shuffle before the first word'); };
  const env = { window: { AlloModules: { AlloData: alloData, WordSoundsPronunciations: pronunciations, WordSoundsPhonemes: dictionary } },
    phonemes: dictionary, pronunciations, random: () => random(), reseed: (word) => { random = B.mulberry32(B.seedFor(seed, word)); } };
  return appLogic(env);
};
const withoutId = (rows) => rows.map((row) => { const copy = { ...row }; delete copy.id; return copy; });

const CVC = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top'];
const DIGRAPHS = ['ship', 'chop', 'thin', 'shop', 'chin', 'rich', 'much', 'fish', 'wish', 'bath'];
// fuzz has no recording; blorp is not in the sound dictionary (the estimate path); the rest stretch the aligner.
const MIXED = ['frog', 'lamp', 'quit', 'cube', 'jumped', 'table', 'fuzz', 'night', 'box', 'blorp'];

// A stand-in converter: any clip becomes a tiny WAV-labelled clip that depends only on its bytes.
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
const build = (over = {}) => builder.buildPacket({ words: CVC.slice(0, 5), activities: ['isolation'], seed: 7, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav, ...over });
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);

describe('(a) parity with the app\'s Prepare lesson', () => {
  for (const [name, words] of [['ten CVC words', CVC], ['ten digraph words', DIGRAPHS], ['a mixed set', MIXED]]) {
    it(name + ': the same prepared rows and, with the same seeded shuffle, the same boards', async () => {
      const seed = 11;
      const app = appSide(seed);
      const mine = B.createPackLogic({ core, knownWords: alloData, seed });
      expect(mine.PACK_COMMON_WORDS).toEqual(app.PACK_COMMON_WORDS);
      const appRows = [], myRows = [];
      for (let i = 0; i < words.length; i++) {
        appRows.push(await app.preparePackWordAiFree({ word: words[i], index: i, batchWords: words, language: 'en', isEnglish: true, activities: null,
          callGemini: undefined, callImagen: undefined, estimate: app.estimatePackPhonemes }));
        myRows.push(await mine.preparePackWordAiFree({ word: words[i], index: i, batchWords: words, isEnglish: true, estimate: mine.estimatePackPhonemes }));
      }
      expect(appRows.every(Boolean)).toBe(true);
      // The row id is the clock in the app and the place in the list here: the one field left out.
      expect(withoutId(myRows)).toEqual(withoutId(appRows));
      expect(myRows.map((row) => row.id)).toEqual(words.map((_, i) => i + 1));
      const appBoards = app.compileActivityItems(structuredClone(appRows));
      const myBoards = mine.compileActivityItems(structuredClone(myRows));
      // With no AI sentence the app makes no reading board either, so the whole set of boards is compared.
      for (let i = 0; i < words.length; i++) {
        expect(Object.keys(myBoards[i].activityItems).sort(), words[i]).toEqual(Object.keys(appBoards[i].activityItems).sort());
        expect(myBoards[i].activityItems, words[i]).toEqual(appBoards[i].activityItems);
      }
      expect(withoutId(myBoards)).toEqual(withoutId(appBoards));
      expect(Object.keys(myBoards[0].activityItems)).toEqual(expect.arrayContaining(builder.SUPPORTED_ACTIVITIES.filter((id) => !['word_families', 'sound_sort'].includes(id))));
    });
  }

  it('the seed reaches the boards: another seed gives another order', async () => {
    const boards = async (seed) => {
      const mine = B.createPackLogic({ core, knownWords: alloData, seed });
      const rows = [];
      for (let i = 0; i < CVC.length; i++) rows.push(await mine.preparePackWordAiFree({ word: CVC[i], index: i, batchWords: CVC, isEnglish: true }));
      return mine.compileActivityItems(rows).map((row) => row.activityItems.segmentation.chips.map((chip) => chip.phoneme).join(' '));
    };
    expect(await boards(1)).toEqual(await boards(1));
    expect(await boards(1)).not.toEqual(await boards(2));
  });
});

describe('(b) the same inputs and seed give the same file', () => {
  it('twice the same bytes; another seed changes the order and keeps the words', async () => {
    const acts = ['isolation', 'blending', 'segmentation', 'mapping'];
    const one = await build({ activities: acts }), two = await build({ activities: acts }), other = await build({ activities: acts, seed: 8 });
    expect(one.html.length).toBeGreaterThan(10000);
    expect(two.html === one.html).toBe(true);
    expect(two.sha256).toBe(one.sha256);
    expect(one.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(other.html === one.html).toBe(false);
    expect(other.manifest.words.used).toEqual(one.manifest.words.used);
    expect(other.manifest.items).toEqual(one.manifest.items);
    const order = (r) => r.lesson.blocks.find((b) => b.activity === 'segmentation').items.map((item) => JSON.stringify(item));
    expect(order(other)).not.toEqual(order(one));
    expect(order(other).map((s) => JSON.parse(s).word)).toEqual(order(one).map((s) => JSON.parse(s).word));
  });
});

// The same list tests/word_sounds_take_home_packet.test.js applies to a file with no mailbox.
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (text) => FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
const HEADER = '"format","session_id","packet_id","packet_version","form","mode","learner","started_local","finished_local","duration_s","item_n","item_id","activity","activity_title","scored","word","target","responses","correct","first_try","tries","time_ms","supports","flag"';

describe('(c) the built file', () => {
  it('holds nothing that could reach the network, and carries its credits in the manifest', async () => {
    const built = await build({ activities: builder.SUPPORTED_ACTIVITIES });
    expect(built.manifest.activities.built.length).toBeGreaterThanOrEqual(11);
    expect(audit(built.html)).toEqual([]);
    expect(built.html.match(/<script/gi)).toHaveLength(2);
    expect(built.html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video)\b/i);
    const m = manifestOf(built.html);
    expect(m.network).toBe('none');
    expect(m.csp).toBe(/Content-Security-Policy" content="([^"]+)"/.exec(built.html)[1]);
    expect(m.attributions[0]).toContain('Carnegie Mellon');
    expect(m.notices[0].text).toBe(readFileSync('data/vendor/cmudict/LICENSE', 'utf8').replace(/\r\n/g, '\n').trim());
    expect(m.builder).toMatchObject({ name: builder.VERSION, seed: 7, ai: 'none' });
    expect(built.manifest.creditsInFile).toBe(true);
    expect(built.manifest.notices[0].text).toBe(builder.CMUDICT_NOTICE);
    // Every clip the file plays is WAV and is listed with where it came from.
    expect(Object.values(built.lesson.audio).every((uri) => /^data:audio\/wav;base64,/.test(uri))).toBe(true);
    expect(built.manifest.audio.list.map((clip) => clip.id).sort()).toEqual(Object.keys(built.lesson.audio).sort());
    expect(built.manifest.audio.list.every((clip) => ['recorded', 'Kokoro bank'].includes(clip.source) && clip.key)).toBe(true);
  });

  it('plays in jsdom to a results spreadsheet with the SPEC header', async () => {
    const built = await build({ title: 'Short vowels' });
    const saved = [];
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html#learner=BlueHeron7', beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      w.HTMLMediaElement.prototype.pause = function () {};
      w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
      w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    } });
    const w = dom.window, d = w.document;
    const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
    const items = lessonOf(built.html).blocks.flatMap((b) => b.items);
    expect(items.map((item) => item.word)).toEqual(CVC.slice(0, 5));
    expect(d.getElementById('learner-name').value).toBe('BlueHeron7');
    button('Start').click();
    items.forEach((item, i) => {
      const at = item.choices.findIndex((c) => c.label === item.target);
      expect(at, item.word).toBeGreaterThanOrEqual(0);
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: String(at + 1), bubbles: true, cancelable: true }));
      button(i === items.length - 1 ? 'See my results' : 'Next').click();
    });
    d.querySelector('[data-save-csv]').click();
    const csv = saved[saved.length - 1];
    expect(csv.name).toMatch(/^Short-vowels__BlueHeron7__\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = csv.body.split('\r\n');
    expect(lines[0]).toBe('﻿' + HEADER);
    const rows = lines.slice(1).filter((line) => line.startsWith('"alloflow-packet-result/1"'));
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.includes('"' + built.lesson.lessonId + '"') && row.includes('"isolation"'))).toBe(true);
    expect(lines.some((line) => line.startsWith('"#summary"') && line.includes('"correct=5"'))).toBe(true);
    dom.window.close();
  });
});

describe('(d) a word with no recording', () => {
  const clipIds = (value, out = []) => {
    if (typeof value === 'string') { if (/^a\d+$/.test(value)) out.push(value); } else if (value && typeof value === 'object') Object.values(value).forEach((v) => clipIds(v, out));
    return out;
  };
  it('is an exception with a plain reason, and no item in the file is silent', async () => {
    expect(wordlist.get('fuzz')).toMatchObject({ hasClip: false, blocked: false });
    const built = await build({ words: ['cat', 'fuzz', 'map'], activities: ['isolation', 'blending', 'segmentation', 'counting', 'spelling_bee'] });
    expect(built.manifest.words).toEqual({ asked: ['cat', 'fuzz', 'map'], used: ['cat', 'map'] });
    const fuzz = built.exceptions.filter((e) => e.word === 'fuzz');
    expect(fuzz.filter((e) => e.activity).map((e) => e.activity).sort()).toEqual(['blending', 'counting', 'isolation', 'segmentation', 'spelling_bee']);
    expect(fuzz.every((e) => e.activity === null || e.reason === 'no recording for this word')).toBe(true);
    expect(fuzz.find((e) => e.activity === null).reason).toBe('no activity could be built for this word');
    const items = built.lesson.blocks.flatMap((b) => b.items);
    expect(items.some((item) => item.word === 'fuzz')).toBe(false);
    expect(JSON.stringify(built.lesson.blocks)).not.toContain('fuzz');
    for (const item of items) {
      const ids = clipIds(item);
      expect(ids.length, item.id).toBeGreaterThan(0);
      for (const id of ids) expect(built.lesson.audio[id], item.id + ' ' + id).toMatch(/^data:audio\/wav;base64,.{20}/);
    }
    expect(built.manifest.items.total).toBe(items.length);
  });

  it('speak() fills the gap when the caller passes one, and the manifest says so', async () => {
    const spoken = [];
    const speak = async (text) => { spoken.push(text); return 'data:audio/wav;base64,' + Buffer.from('RIFF0000WAVEspoken:' + text).toString('base64'); };
    const built = await build({ words: ['cat', 'fuzz'], activities: ['counting'], speak });
    expect(spoken).toEqual(['fuzz']);
    expect(built.manifest.words.used).toEqual(['cat', 'fuzz']);
    expect(built.manifest.audio.list.find((clip) => clip.key === 'fuzz')).toMatchObject({ kind: 'word', source: 'spoken now' });
    expect(built.manifest.audio.list.find((clip) => clip.key === 'cat')).toMatchObject({ kind: 'word', source: 'recorded' });
  });

  it('with no converter a WebM clip is an exception, never shipped quietly; allowUnconverted ships it and says so', async () => {
    const none = await build({ words: ['cat'], activities: ['counting', 'isolation'], toWav: undefined });
    expect(none.html).toBe('');
    expect(none.exceptions.map((e) => e.reason).join(' | ')).toMatch(/WebM and no converter was supplied|no recording for the spoken question/);
    expect(none.manifest.items.total).toBe(0);
    const kept = await build({ words: ['cat'], activities: ['counting'], toWav: undefined, allowUnconverted: true });
    expect(kept.manifest.items.total).toBe(1);
    expect(kept.manifest.audio.list.some((clip) => /not converted/.test(clip.format))).toBe(true);
  });

  it('an activity it cannot build is an exception, not an error', async () => {
    const built = await build({ activities: ['isolation', 'manipulation', 'read_sentence', 'decoding', 'no_such_activity'] });
    expect(built.manifest.activities.built).toEqual(['isolation']);
    expect(built.exceptions.filter((e) => e.word === null).map((e) => [e.activity, e.reason])).toEqual([
      ['manipulation', 'this activity cannot be built without AI or a teacher yet'], ['read_sentence', 'this activity cannot be built without AI or a teacher yet'],
      ['decoding', 'this activity cannot be built without AI or a teacher yet'], ['no_such_activity', 'unknown activity']]);
  });

  it.skipIf(!tool.ffmpegOnPath())('ffmpeg turns a real WebM bank clip into a 22,050 Hz mono WAV', async () => {
    const built = await build({ words: ['cat'], activities: ['counting'], toWav: tool.ffmpegToWav() });
    const prompt = built.manifest.audio.list.find((clip) => clip.kind === 'instruction');
    const bytes = Buffer.from(built.lesson.audio[prompt.id].split(',')[1], 'base64');
    expect(bytes.toString('latin1', 0, 4) + bytes.toString('latin1', 8, 12)).toBe('RIFFWAVE');
    expect(bytes.readUInt32LE(4)).toBe(bytes.length - 8);
    expect(bytes.readUInt16LE(22)).toBe(1);
    expect(bytes.readUInt32LE(24)).toBe(22050);
    expect(bytes.length).toBeGreaterThan(20000);
  });

  it('a recorded word (PCM in the bank) becomes a real WAV with the right lengths', () => {
    const uri = builder.pcmToWavUri(BANKS.words.cat.base64, BANKS.words.cat.sampleRate);
    const bytes = Buffer.from(uri.split(',')[1], 'base64'), pcm = Buffer.from(BANKS.words.cat.base64, 'base64');
    expect(bytes.toString('latin1', 0, 4) + bytes.toString('latin1', 8, 16) + bytes.toString('latin1', 36, 40)).toBe('RIFFWAVEfmt data');
    expect([bytes.readUInt32LE(4), bytes.readUInt32LE(24), bytes.readUInt16LE(34), bytes.readUInt32LE(40)]).toEqual([36 + pcm.length, 24000, 16, pcm.length]);
    expect(bytes.subarray(44).equals(pcm)).toBe(true);
  });
});

describe('(e) pickWords', () => {
  const pick = (criteria, seed = 7) => builder.pickWords(criteria, { wordlist, core, dictionary, seed });
  const SH = { targetSound: 'sh', position: 'first', shape: 'CVC', count: 10 };

  it('/sh/ first, CVC: only unblocked words with a recording, the same for the same seed', () => {
    const one = pick(SH), two = pick(SH), other = pick(SH, 8);
    expect(one.words).toHaveLength(10);
    expect(two).toEqual(one);
    expect(other.words).not.toEqual(one.words);
    expect(other.pool).toBe(one.pool);
    expect(one.pool).toBeGreaterThanOrEqual(10);
    for (const word of [...one.words, ...other.words]) {
      const row = wordlist.get(word);
      expect(row, word).toMatchObject({ blocked: false, nearBlocked: false, hasClip: true, shape: 'CVC' });
      expect(dictionary.lookup(word)[0][0], word).toBe('sh');
    }
    expect(one.reasons.fitsTheCriteria).toBe(one.pool + one.reasons.blocked + one.reasons.soundsLikeABlockedWord + one.reasons.notFamiliarEnough + one.reasons.noRecording);
    expect(one.reasons.blocked).toBeGreaterThan(0);
  });

  it('never returns a blocked word, whatever is asked', () => {
    for (const criteria of [{ shape: 'CVC', count: 5000, requireClip: false, maxRank: 40000 }, { sounds: 4, count: 5000, requireClip: false, maxRank: 40000 }, { count: 40000, requireClip: false, maxRank: 40000 }]) {
      const got = pick(criteria);
      expect(got.words.length).toBe(got.pool);
      expect(got.words.filter((word) => wordlist.get(word).blocked || wordlist.get(word).nearBlocked)).toEqual([]);
    }
    for (const word of ['gun', 'hell', 'beer', 'fat']) expect(pick({ sounds: 3, count: 5000, requireClip: false, maxRank: 40000 }).words).not.toContain(word);
  });

  it('says how many fit, so a page can say "only 4 words fit"', () => {
    const got = pick({ ...SH, stage: 'K late' });
    expect(got.words.length).toBe(got.pool);
    expect(got.pool).toBeLessThan(10);
    expect(got.reasons.noRecording + got.reasons.notFamiliarEnough).toBeGreaterThan(0);
    expect(got.criteria).toMatchObject({ stage: 'K late', stageNote: builder.STAGE_NOTE, maxRank: builder.DEFAULT_MAX_RANK, requireClip: true });
    expect(builder.STAGE_NOTE).toMatch(/^PROVISIONAL/);
    expect(() => pick({ stage: 'Grade 9' })).toThrow(/Unknown stage/);
  });

  it('stage K early never returns a digraph, a blend or a long vowel', () => {
    for (const seed of [1, 2, 3]) {
      const got = pick({ stage: 'K early', count: 400, requireClip: false }, seed);
      expect(got.words.length).toBeGreaterThan(100);
      for (const word of got.words) {
        expect(word, word).not.toMatch(/sh|ch|th|ck|ng|wh|ph|qu/);
        const units = B.wordUnits(core, word, [...dictionary.lookup(word)[0]]);
        expect(units.every((u) => u.letters.length === 1 && !u.silentE), word).toBe(true);
        expect(units.some((u, i) => i > 0 && !u.vowel && !units[i - 1].vowel), word).toBe(false);
        expect(units.filter((u) => u.vowel).every((u) => 'aeiou'.includes(u.sounds[0])), word).toBe(true);
      }
    }
    expect(pick({ stage: 'K late', spellingPattern: 'sh', count: 50 }).words.length).toBeGreaterThan(3);
    expect(pick({ stage: 'K early', spellingPattern: 'sh', count: 50 }).words).toEqual([]);
  });

  it('a spelling pattern is matched on the aligned spelling, at the place asked for', () => {
    const ck = pick({ spellingPattern: 'ck', position: 'last', count: 30 });
    expect(ck.words.length).toBeGreaterThan(10);
    expect(ck.words.every((word) => word.endsWith('ck'))).toBe(true);
    const magicE = pick({ spellingPattern: 'a_e', stage: 'G1 late', count: 30 });
    expect(magicE.words.length).toBeGreaterThan(10);
    expect(magicE.words.every((word) => /a[^aeiou]e/.test(word))).toBe(true);
    expect(pick({ shape: 'CVC', exclude: ck.words, spellingPattern: 'ck', position: 'last', count: 30 }).words.filter((word) => ck.words.includes(word))).toEqual([]);
  });

  it('a blocked word typed by the teacher is refused with a reason', async () => {
    const built = await build({ words: ['cat', 'gun', 'map', 'damn'] });
    expect(built.manifest.words.used).toEqual(['cat', 'map']);
    expect(built.exceptions.filter((e) => e.activity === null)).toEqual([
      { word: 'gun', activity: null, reason: 'this word is on the blocklist' }, { word: 'damn', activity: null, reason: 'this word is on the blocklist' }]);
    expect(built.html).not.toMatch(/"gun"|"damn"/);
  });

  it('no blocked word reaches an answer choice of a built file', async () => {
    const built = await build({ words: [...CVC, ...DIGRAPHS], activities: builder.SUPPORTED_ACTIVITIES });
    const shown = new Set();
    const walk = (value) => { if (typeof value === 'string') { if (/^[a-z]{2,}$/.test(value)) shown.add(value); } else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => { if (!['label', 'target', 'sound', 'id'].includes(k)) walk(v); }); };
    built.lesson.blocks.filter((b) => ['blending', 'rhyming', 'word_families', 'sound_sort'].includes(b.activity)).forEach((b) => b.items.forEach((item) => walk(item.choices || item.chips || item)));
    expect(shown.size).toBeGreaterThan(20);
    expect([...shown].filter((word) => wordlist.isBlocked(word) && dictionary.lookup(word).length && wordlist.get(word).sounds > 1)).toEqual([]);
  });
});

describe('(f) the word list and the blocklist', () => {
  it('the generated word list is current (--check)', () => {
    const out = execFileSync(process.execPath, ['dev-tools/build_word_sounds_wordlist.cjs', '--check'], { encoding: 'utf8' });
    expect(out).toMatch(/^Verified word list: \d+ words/);
  });

  it('every blocklist entry is flagged, in the dictionary or not, and the file says it needs review', () => {
    const sections = wordlistTool.readBlocklist();
    const entries = sections.flatMap((section) => section.words);
    expect(entries.length).toBeGreaterThan(900);
    expect(sections.filter((section) => section.derive).length).toBeGreaterThanOrEqual(2);
    let inDictionary = 0;
    for (const word of new Set(entries)) {
      expect(wordlist.isBlocked(word), word).toBe(true);
      if (dictionary.lookup(word).length) { inDictionary++; expect(wordlist.get(word).notInDictionary, word).toBeUndefined(); }
    }
    expect(inDictionary).toBeGreaterThan(700);
    expect(wordlist.rows()).toHaveLength(dictionary.wordCount);
    expect(wordlist.rows().filter((row) => row.blocked).length).toBe(new Set(entries.filter((w) => dictionary.lookup(w).length)).size);
    expect(readFileSync('data/word_sounds_blocklist_en.txt', 'utf8')).toMatch(/FIRST PASS THAT NEEDS HUMAN REVIEW/);
    // Ordinary words stay usable.
    for (const word of ['cat', 'ship', 'bill', 'will', 'rose', 'but', 'horse', 'ask']) expect(wordlist.isBlocked(word), word).toBe(false);
    expect(wordlist.get('dam').nearBlocked).toBe(true);
    expect(wordlist.get('gas').dropBlocked).toBe(true);
  });

  it('a row says what the picker needs', () => {
    expect(wordlist.get('cat')).toMatchObject({ word: 'cat', shape: 'CVC', sounds: 3, recorded: true, hasClip: true, blocked: false, known: true });
    expect(wordlist.get('ship')).toMatchObject({ shape: 'CVC', sounds: 3, hasClip: true });
    expect(wordlist.get('frog').shape).toBe('CCVC');
    expect(wordlist.get('the').rank).toBe(1);
    expect(wordlist.get('CAT ')).toBe(wordlist.get('cat'));
    expect(wordlist.get('qqqq')).toBe(null);
  });
});

describe('(g) the builder file itself', () => {
  it('has no way to reach the network and no code-from-text', () => {
    for (const [name, pattern] of [['fetch(', /fetch\s*\(/], ['XMLHttpRequest', /XMLHttpRequest/], ['import(', /\bimport\s*\(/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
      ['a web address', /https?:\/\//i], ['WebSocket', /WebSocket/], ['sendBeacon', /sendBeacon/], ['require(', /\brequire\s*\(/], ['React', /\bReact\b\./]]) {
      expect(pattern.test(builderSource), name).toBe(false);
    }
  });

  it('registers in a browser page with no module system', () => {
    const page = {};
    new Function('window', 'module', builderSource)(page, undefined);
    expect(Object.keys(page)).toEqual(['AlloPacketBuilder']);
    expect(typeof page.AlloPacketBuilder.buildPacket).toBe('function');
    expect(typeof page.AlloPacketBuilder.pickWords).toBe('function');
    expect(page.AlloPacketBuilder.SUPPORTED_ACTIVITIES).toEqual(builder.SUPPORTED_ACTIVITIES);
  });
});
