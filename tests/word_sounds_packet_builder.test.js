import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
    // Every word that fit is either in the pool or counted under exactly one reason.
    const { fitsTheCriteria, ...dropped } = one.reasons;
    expect(Object.keys(dropped).sort()).toEqual(['blocked', 'britishSpellingOrWord', 'excluded', 'noRecording', 'notFamiliarEnough', 'oneDroppedSoundFromABlockedWord', 'soundsLikeABlockedWord']);
    expect(fitsTheCriteria).toBe(one.pool + Object.values(dropped).reduce((sum, n) => sum + n, 0));
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
    const got = pick({ ...SH, stage: 'G1 early' });
    expect(got.words.length).toBe(got.pool);
    expect(got.pool).toBeGreaterThan(3);
    expect(got.pool).toBeLessThan(10);
    expect(got.reasons.noRecording + got.reasons.notFamiliarEnough).toBeGreaterThan(0);
    expect(got.criteria).toMatchObject({ stage: 'G1 early', framework: 'us-ccss', stageVerified: true, stageBasis: 'standard and common practice',
      minZipf: builder.DEFAULT_MIN_ZIPF, minBooks: builder.DEFAULT_MIN_BOOKS, maxRank: null, british: false, requireClip: true });
    // A row checked against the documents says so; the word PROVISIONAL is kept for rows that were not.
    expect(got.criteria.stageNote).toBe('Checked on ' + wordlist.stages.checked + ' against the Common Core Reading Foundational Skills standards. '
      + 'That document places part of this row at this grade or year; the rest follows common classroom practice, not a standard.');
    expect(pick({ stage: 'K early', count: 1 }).criteria.stageNote).toBe('Checked on ' + wordlist.stages.checked + ' against the Common Core Reading Foundational Skills standards. '
      + 'That document places everything in this row at this grade or year.');
    expect(pick({ stage: 'Year 1', count: 1 }).criteria.stageNote).toMatch(/^Checked on \d{4}-\d{2}-\d{2} against the spelling appendix of the National Curriculum in England\./);
    expect(got.criteria.stageNote).not.toMatch(/PROVISIONAL/);
    expect(pick({ stage: 'Reception', count: 1 }).criteria).toMatchObject({ framework: 'england-nc', stageVerified: false, british: true });
    expect(pick({ stage: 'Reception', count: 1 }).criteria.stageNote).toMatch(/^PROVISIONAL/);
    expect(builder.STAGE_NOTE).not.toMatch(/^PROVISIONAL/);
    expect(builder.STAGE_NOTE).toMatch(/Common Core Reading Foundational Skills standards.*common classroom practice.*PROVISIONAL/);
    // Nothing a built file could carry holds a web address: the sources live in the data file.
    expect(JSON.stringify(got.criteria)).not.toMatch(/https?:/);
    expect(() => pick({ stage: 'Grade 9' })).toThrow(/Unknown stage: Grade 9 \(use K early, K late, G1 early, G1 late, G2, G3\+, Reception, Year 1, Year 2\)/);
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
    // Consonant digraphs are grade 1 in the Common Core (RF.1.3.a), so neither kindergarten row has them.
    expect(pick({ stage: 'G1 early', spellingPattern: 'sh', count: 50 }).words.length).toBeGreaterThan(3);
    expect(pick({ stage: 'K late', spellingPattern: 'sh', count: 50 }).words).toEqual([]);
    expect(pick({ stage: 'K early', spellingPattern: 'sh', count: 50 }).words).toEqual([]);
    // K late adds only s as /z/ and one-letter long vowels in short words (RF.K.3.a, RF.K.3.b).
    const early = pick({ stage: 'K early', count: 1000, requireClip: false }).words, late = pick({ stage: 'K late', count: 1000, requireClip: false }).words;
    expect(early.filter((word) => !late.includes(word))).toEqual([]);
    expect(late.filter((word) => !early.includes(word))).toEqual(expect.arrayContaining(['he', 'me', 'go', 'no', 'is', 'his']));
    // Kindergarten: three sounds at most, and no word that ends in /l/, /r/ or x (RF.K.2.d).
    for (const word of late) {
      expect(wordlist.get(word).sounds, word).toBeLessThanOrEqual(3);
      expect(word, word).not.toMatch(/[lrx]$/);
    }
    expect(pick({ stage: 'G1 early', count: 2000, requireClip: false }).words).toEqual(expect.arrayContaining(['box', 'six', 'bell', 'frog', 'ship']));
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
    // With no word list script on the page there is no stage table, and asking for a stage says so.
    expect(page.AlloPacketBuilder.STAGES).toEqual(builder.STAGES);
    expect(page.AlloPacketBuilder.stageList()).toEqual([]);
    expect(() => page.AlloPacketBuilder.pickWords({ stage: 'K early' }, { wordlist: { rows: () => [] }, core })).toThrow(/needs the stage table/);
  });
});

describe('(h) child-book familiarity (CYP-LEX, vendored)', () => {
  const pick = (criteria, seed = 7) => builder.pickWords(criteria, { wordlist, core, dictionary, seed });
  const source = JSON.parse(readFileSync('data/vendor/cyplex/source.json', 'utf8'));
  const bytes = readFileSync('data/vendor/cyplex/' + source.filtered.file);
  const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

  it('source.json says where the file came from, under which licence, and what was changed', () => {
    expect(source).toMatchObject({ id: 'cyplex', doi: '10.1177/17470218241229694', file: 'main_cyplex79.csv', url: 'https://osf.io/download/s73vd/',
      license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', language: 'en-GB' });
    expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(source.citation).toMatch(/Korochkina, M\., Marelli, M\., Brysbaert, M\., & Rastle, K\. \(2024\)/);
    for (const field of ['band', 'repository', 'component', 'retrieved', 'licenseEvidence', 'scope', 'remake']) expect(typeof source[field], field).toBe('string');
    expect(source.limitations).toMatch(/British/);
    expect(source.limitations).toMatch(/weak evidence for kindergarten/);
    expect(Object.keys(source.columnsKept)).toEqual(['Word', 'Zipf_freq', 'CD_book_count_raw']);
    // The columns the original copies from other databases are named as dropped.
    for (const name of ['CPWD_raw', 'CBBC_raw', 'CBeebies_raw', 'SubtlexUK_raw']) expect(JSON.stringify(source.columnsDropped), name).toContain(name);
    expect(source.filtered.changes).toMatch(/^Changed from the original/);
  });

  it('the filtered file is the one source.json describes: same bytes, three columns, notice on top', () => {
    expect(sha256(bytes)).toBe(source.filtered.sha256);
    expect(bytes.length).toBe(source.filtered.bytes);
    expect(bytes.length).toBeLessThan(600000);
    expect(bytes.includes(13)).toBe(false);
    const lines = bytes.toString('utf8').split('\n');
    expect(lines.pop()).toBe('');
    const notice = lines.filter((line) => line[0] === '#'), rows = lines.filter((line) => line[0] !== '#');
    expect(notice).toEqual(source.filtered.header.map((line) => '# ' + line));
    expect(notice.join(' ')).toMatch(/Korochkina.*10\.1177\/17470218241229694.*Creative Commons Attribution 4\.0 International.*Changed from the original/);
    expect(rows).toHaveLength(source.filtered.words);
    expect(rows.every((row) => /^[a-z][a-z']*\t\d\.\d\d\t\d{1,3}$/.test(row))).toBe(true);
    expect(rows.every((row) => dictionary.lookup(row.split('\t')[0]).length > 0)).toBe(true);
    expect(rows.every((row) => Number(row.split('\t')[2]) <= 400)).toBe(true);
    expect(rows.slice().sort()).toEqual(rows);
    expect(wordlist.meta.childBooks).toMatchObject({ id: 'cyplex', sha256: source.filtered.sha256, license: source.license, doi: source.doi });
    expect(wordlistTool.readFamiliarity().map.size).toBe(source.filtered.words);
  });

  it('the word list carries the value beside the old rank', () => {
    expect(wordlist.get('mop')).toMatchObject({ zipf: 3.96, books: 62, rank: 28256, syllables: 1, british: false });
    expect(wordlist.get('cat')).toMatchObject({ zipf: 5.38, books: 265, syllables: 1 });
    expect(wordlist.get('rabbit').syllables).toBe(2);
    expect(wordlist.get('qqqq')).toBe(null);
    const rows = wordlist.rows();
    expect(rows.filter((row) => row.zipf > 0).length).toBe(source.filtered.words);
    expect(rows.every((row) => row.syllables === row.shape.split('V').length - 1 && row.zipf >= 0 && row.zipf < 8 && row.books >= 0 && row.books <= 400)).toBe(true);
  });

  it('a word passes when it is on the app lists OR common enough in children\'s books', () => {
    expect([builder.DEFAULT_MIN_ZIPF, builder.DEFAULT_MIN_BOOKS]).toEqual([3.8, 20]);
    const everyone = pick({ count: 100000, requireClip: false });
    expect(everyone.criteria).toMatchObject({ minZipf: 3.8, minBooks: 20, maxRank: null });
    expect(everyone.words.length).toBe(everyone.pool);
    for (const word of everyone.words) {
      const row = wordlist.get(word);
      expect(row.known || (row.zipf >= 3.8 && row.books >= 20), word).toBe(true);
    }
    // Everyday words the old-book list ranked far down are in; rare or bookish ones are out.
    expect(everyone.words).toEqual(expect.arrayContaining(['mop', 'zip', 'bake', 'cat', 'face', 'rabbit']));
    for (const word of ['membranes', 'hormones', 'indicates', 'domain', 'doth']) expect(everyone.words, word).not.toContain(word);
    // A name sits in few books even when one book says it often: tam, Zipf 4.98 in 6 books.
    expect(wordlist.get('tam')).toMatchObject({ zipf: 4.98, books: 6, known: false, blocked: false });
    expect(everyone.words).not.toContain('tam');
    expect(pick({ count: 100000, requireClip: false, minBooks: 0 }).words).toContain('tam');
    // The cut-off can be moved, and maxRank brings the older rule back as one more way in.
    expect(pick({ count: 100000, requireClip: false, minZipf: 5 }).pool).toBeLessThan(everyone.pool);
    expect(pick({ count: 100000, requireClip: false, minZipf: 2.5, minBooks: 0 }).words).toContain('membranes');
    expect(pick({ count: 100000, requireClip: false, maxRank: 4000 }).words).toContain('membranes');
    // requireClip is what it was: on by default, and only words with a recording pass.
    const clips = pick({ count: 100000 });
    expect(clips.criteria.requireClip).toBe(true);
    expect(clips.words.every((word) => wordlist.get(word).hasClip)).toBe(true);
    expect(clips.reasons.noRecording).toBe(everyone.pool - clips.pool);
  });

  it('a word list with no child-book column falls back to the old rank rule', () => {
    const old = { rows: wordlist.rows, meta: { version: 1 }, stages: wordlist.stages };
    const got = builder.pickWords({ shape: 'CVC', count: 100000, requireClip: false }, { wordlist: old, core, dictionary, seed: 7 });
    expect(got.criteria).toMatchObject({ maxRank: builder.DEFAULT_MAX_RANK, minZipf: null, minBooks: null });
    expect(got.criteria.familiarity).toBe('on the app lists, or reading-library rank <= 4000');
  });

  it('a British spelling or word is not returned unless asked for', () => {
    for (const word of ['colour', 'mum', 'favourite', 'grey', 'centre']) expect(wordlist.get(word), word).toMatchObject({ british: true, blocked: false });
    expect(wordlist.get('color').british).toBe(false);
    const byDefault = pick({ count: 100000, requireClip: false });
    expect(byDefault.criteria.british).toBe(false);
    expect(byDefault.words.filter((word) => wordlist.get(word).british)).toEqual([]);
    expect(byDefault.reasons.britishSpellingOrWord).toBeGreaterThan(50);
    const asked = pick({ count: 100000, requireClip: false, british: true });
    expect(asked.words).toEqual(expect.arrayContaining(['colour', 'mum', 'favourite', 'grey', 'centre']));
    expect(asked.reasons.britishSpellingOrWord).toBe(0);
    // The England rows allow them; a caller can still say no.
    expect(pick({ stage: 'Reception', shape: 'CVC', count: 100000, requireClip: false }).words).toContain('mum');
    expect(pick({ stage: 'Reception', shape: 'CVC', count: 100000, requireClip: false, british: false }).words).not.toContain('mum');
    expect(pick({ stage: 'K early', shape: 'CVC', count: 100000, requireClip: false }).words).not.toContain('mum');
    // It is not a block: a teacher who types the word still gets it.
    expect(wordlist.isBlocked('colour')).toBe(false);
    const listed = wordlistTool.readBritish().flatMap((section) => section.words);
    expect(listed.length).toBeGreaterThan(150);
    expect(listed.filter((word) => wordlist.isBlocked(word))).toEqual([]);
    expect(wordlist.rows().filter((row) => row.british).length).toBe(new Set(listed.filter((word) => dictionary.lookup(word).length)).size);
  });
});

describe('(i) the stage table is data, with its sources', () => {
  const pick = (criteria, seed = 7) => builder.pickWords(criteria, { wordlist, core, dictionary, seed });
  const table = JSON.parse(readFileSync('data/word_sounds_stages_en.json', 'utf8'));
  const stages = table.frameworks.flatMap((framework) => framework.stages.map((stage) => ({ ...stage, framework: framework.id })));
  const unitsOf = (word) => B.wordUnits(core, word, [...dictionary.lookup(word)[0]]);
  // The units a row may use: its own and those of the rows before it in the same table.
  const allowed = (stageId) => {
    const framework = table.frameworks.find((f) => f.stages.some((s) => s.id === stageId));
    const units = new Set();
    for (const stage of framework.stages) {
      stage.groups.forEach((group) => group.units.split(' ').filter(Boolean).forEach((unit) => units.add(unit)));
      if (stage.id === stageId) break;
    }
    return units;
  };

  it('the word list carries the same table, and the builder names the default rows', () => {
    expect(wordlist.stages).toEqual(table);
    expect(wordlistTool.readStages()).toEqual(table);
    expect(table.frameworks.map((framework) => framework.id)).toEqual(['us-ccss', 'england-nc']);
    expect(table.defaultFramework).toBe('us-ccss');
    expect(table.frameworks[0].stages.map((stage) => stage.id)).toEqual(builder.STAGES);
    expect(builder.STAGES).toEqual(['K early', 'K late', 'G1 early', 'G1 late', 'G2', 'G3+']);
    expect(builder.stageList(wordlist.stages).map((stage) => stage.id)).toEqual([...builder.STAGES, 'Reception', 'Year 1', 'Year 2']);
    expect(builder.stageList(wordlist.stages).every((stage) => stage.label.length > 20 && stage.note && ['standard', 'common practice', 'standard and common practice'].includes(stage.basis))).toBe(true);
    // A caller may pass its own table.
    const mine = { defaultFramework: 't', frameworks: [{ id: 't', stages: [{ id: 'Only at', verified: false, limits: { maxSyllables: 1, maxSounds: 2, basis: 'common practice' }, groups: [{ units: 'a>a t>t', basis: 'common practice' }] }] }] };
    const got = builder.pickWords({ stage: 'only  AT', count: 50, requireClip: false }, { wordlist, core, dictionary, seed: 1, stages: mine });
    expect(got.words).toEqual(['at']);
    expect(got.criteria).toMatchObject({ stage: 'Only at', framework: 't', stageVerified: false, stageBasis: 'common practice' });
    expect(got.criteria.stageNote).toMatch(/^PROVISIONAL/);
  });

  it('every row has a source or is marked common practice, and every source names a document that was opened', () => {
    expect(stages).toHaveLength(9);
    for (const stage of stages) {
      const entries = [...stage.groups, stage.limits];
      expect(stage.label.length, stage.id).toBeGreaterThan(20);
      expect(typeof stage.verified, stage.id).toBe('boolean');
      for (const entry of entries) {
        expect(['standard', 'common practice'], stage.id).toContain(entry.basis);
        if (entry.basis === 'standard') expect(entry.sources.length, stage.id + ': ' + (entry.what || 'limits')).toBeGreaterThan(0);
        for (const one of entry.sources || []) {
          const document = table.documents[one.document];
          expect(document, stage.id + ' ' + one.document).toBeTruthy();
          expect(one.url, stage.id).toBe(document.url);
          expect(one.code.length, stage.id).toBeGreaterThan(3);
          expect((one.quote || one.summary).length, stage.id + ' ' + one.code).toBeGreaterThan(3);
          if (one.document === 'ccss') expect(one.code, stage.id).toMatch(/^RF\.[K123]\.[23]\.[a-g]$/);
        }
      }
      expect(entries.some((entry) => (entry.sources || []).length > 0) || entries.every((entry) => entry.basis === 'common practice'), stage.id).toBe(true);
      // PROVISIONAL stays only on a row that was not checked.
      const row = builder.stageList(wordlist.stages).find((item) => item.id === stage.id);
      expect(row.verified, stage.id).toBe(stage.verified);
      expect(/PROVISIONAL/.test(row.note), stage.id).toBe(!stage.verified);
      if (!stage.verified) expect(stage.provisional, stage.id).toMatch(/^PROVISIONAL: /);
      expect(JSON.stringify(stage).includes('PROVISIONAL'), stage.id).toBe(!stage.verified);
    }
    expect(stages.filter((stage) => !stage.verified).map((stage) => stage.id)).toEqual(['Reception']);
    // What the licences ask to be shown when a quote is printed.
    expect(table.documents.ccss.notice).toBe('© Copyright 2010. National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved.');
    expect(table.documents.england.notice).toBe('Contains public sector information licensed under the Open Government Licence v3.0.');
    expect(table.documents.ies.licence).toBe('Public domain');
    for (const document of Object.values(table.documents)) {
      expect(document.url).toMatch(/^https:\/\//);
      expect(document.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(document.opened).toBe(table.checked);
    }
    // Things the documents do not say are written down as such, not passed off as a standard.
    const g1late = stages.find((stage) => stage.id === 'G1 late');
    expect(g1late.groups.find((group) => group.units.includes('ar>ar'))).toMatchObject({ basis: 'common practice' });
    expect(stages.find((stage) => stage.id === 'G1 early').groups.find((group) => group.units.includes('sh>sh')).sources[0].code).toBe('RF.1.3.a');
    expect(stages.find((stage) => stage.id === 'K late').notHere).toMatch(/sh, ch, th and ck are NOT in this row/);
    expect(table.claims.may).toMatch(/^The order of spelling patterns follows the grade placements in the Common Core Reading Foundational Skills standards\./);
    expect(table.claims.mustNot.length).toBeGreaterThan(5);
  });

  it('a stage never returns a unit outside its row, or a word over its length limits', () => {
    for (const stage of stages) {
      const units = allowed(stage.id), limits = stage.limits;
      const got = pick({ stage: stage.id, count: 100000, requireClip: false });
      expect(got.words.length, stage.id).toBe(got.pool);
      expect(got.pool, stage.id).toBeGreaterThan(150);
      const outside = [];
      for (const word of got.words) {
        const row = wordlist.get(word), mine = unitsOf(word);
        if (!units.has('*') && mine.some((unit) => !units.has(unit.key))) outside.push(word + ': unit');
        if (limits.maxSyllables && row.syllables > limits.maxSyllables) outside.push(word + ': syllables');
        if (limits.maxSounds && row.sounds > limits.maxSounds) outside.push(word + ': sounds');
        if (!limits.clusters && mine.some((unit, i) => i > 0 && !unit.vowel && !mine[i - 1].vowel)) outside.push(word + ': cluster');
        if (limits.longVowelsInLongerWords === false && row.syllables > 1 && mine.some((unit) => unit.sounds.some((s) => ['ay', 'ee', 'ie', 'oa', 'oo'].includes(s)))) outside.push(word + ': long vowel in a longer word');
      }
      expect(outside, stage.id).toEqual([]);
    }
    // Each row of a table holds the row before it.
    for (const framework of table.frameworks) {
      const pools = framework.stages.map((stage) => pick({ stage: stage.id, count: 100000, requireClip: false, british: false }).words);
      for (let i = 1; i < pools.length; i++) {
        const later = new Set(pools[i]);
        expect(pools[i - 1].filter((word) => !later.has(word)), framework.stages[i].id).toEqual([]);
        expect(pools[i].length, framework.stages[i].id).toBeGreaterThan(pools[i - 1].length);
      }
    }
  });

  it('grade 1 final e gives short words: no three-syllable word, and none of rotate, donate, locate', () => {
    for (const vowel of ['a', 'i', 'o', 'u']) {
      const got = pick({ spellingPattern: vowel + '_e', stage: 'G1 late', count: 100000, requireClip: false });
      expect(got.pool, vowel).toBeGreaterThan(10);
      for (const word of got.words) {
        expect(wordlist.get(word).syllables, word).toBe(1);
        expect(word, word).toMatch(new RegExp(vowel + '[^aeiou]{1,2}e'));
      }
      for (const word of ['rotate', 'donate', 'locate', 'membranes', 'hormones', 'timezone', 'homegrown']) expect(got.words, word).not.toContain(word);
    }
    expect(pick({ spellingPattern: 'a_e', stage: 'G1 late', count: 100000, requireClip: false }).words).toEqual(expect.arrayContaining(['cake', 'game', 'made', 'wave', 'maze']));
    expect(pick({ spellingPattern: 'o_e', stage: 'G1 late', count: 100000, requireClip: false }).words).toEqual(expect.arrayContaining(['home', 'bone', 'nose', 'rose', 'woke']));
    // No stage before grade 3 returns three syllables; two-syllable words with long vowels start at grade 2 (RF.2.3.c).
    for (const id of ['K early', 'K late', 'G1 early', 'G1 late', 'G2']) {
      expect(pick({ stage: id, count: 100000, requireClip: false }).words.filter((word) => wordlist.get(word).syllables > 2), id).toEqual([]);
    }
    expect(pick({ stage: 'G1 late', syllables: 2, count: 100000, requireClip: false }).words).toEqual(expect.arrayContaining(['rabbit', 'sunset', 'basket', 'winter']));
    expect(pick({ stage: 'G1 late', syllables: 2, count: 100000, requireClip: false }).words).not.toContain('baby');
    expect(pick({ stage: 'G2', syllables: 2, count: 100000, requireClip: false }).words).toEqual(expect.arrayContaining(['baby', 'open', 'happy', 'rabbit']));
    expect(pick({ stage: 'G3+', syllables: 3, count: 100000, requireClip: false }).pool).toBeGreaterThan(100);
  });

  it('the same criteria and seed give the same words, for a stage too', () => {
    for (const criteria of [{ stage: 'K early', shape: 'CVC', count: 20 }, { stage: 'G1 late', spellingPattern: 'ai', count: 20, requireClip: false }, { stage: 'Year 1', syllables: 2, count: 20 }]) {
      const one = pick(criteria, 3), two = pick(criteria, 3), other = pick(criteria, 4);
      expect(two).toEqual(one);
      expect(one.words).toHaveLength(20);
      expect(other.pool).toBe(one.pool);
      expect(other.words).not.toEqual(one.words);
      expect(new Set(one.words).size).toBe(20);
    }
  });
});

describe('(j) the dated additions to the blocklist', () => {
  const pick = (criteria, seed = 7) => builder.pickWords(criteria, { wordlist, core, dictionary, seed });
  it('names, word pieces and crude words found in the output are blocked; ordinary words are not', () => {
    const sections = wordlistTool.readBlocklist();
    const added = sections.filter((section) => /^2026-11-11 /.test(section.name));
    expect(added.length).toBeGreaterThanOrEqual(8);
    expect(added.every((section) => !section.derive)).toBe(true);
    for (const word of ['frank', 'smith', 'santa', 'sherlock', 'sunday', 'latin', 'jeep', 'sod', 'gob', 'wee', 'yep', 'ing', 'san', 'attack', 'sword']) expect(wordlist.isBlocked(word), word).toBe(true);
    // Not derived: "wee" must not take "we" with it.
    for (const word of ['we', 'he', 'so', 'jack', 'kiss', 'fight', 'jail', 'ruby', 'may', 'march', 'will', 'rob', 'smoke', 'bar', 'hi', 'wow']) expect(wordlist.isBlocked(word) || wordlist.get(word).nearBlocked, word).toBe(false);
    const everything = pick({ count: 100000, requireClip: false }).words;
    for (const section of added) expect(section.words.filter((word) => everything.includes(word)), section.name).toEqual([]);
  });
});
