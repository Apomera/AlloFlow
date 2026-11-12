import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { fakeIndexedDB, fakeChannels } from './helpers/packets_fake_indexeddb.js';

// A teacher's own words on the maker page (AlloFlow Packets), end to end:
// (a) the builder's opts.own: a split into sounds (also for a word the sound dictionary does not have), a recording,
//     a picture with its credit. Every part is checked; what fails is left out and listed; blocked words stay refused;
//     the same inputs give the same file; a file with them still reads "cannot connect" on Check a file.
// (b) the panel's sound helpers (packets-words.js): one channel, trimmed, WAV.
// (c) the maker page in jsdom with the store (packets_my_words.js) on the stand-in IndexedDB of tests/packets_my_words.test.js:
//     "Edit this word" closed by default, the messages, Record (a stand-in microphone), a picture from a file,
//     the store read before the file is made, "My words on this device".
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const myWords = require('../packets_my_words.js');
const verify = require('../packets_verify_core.js');
const panelKit = require('../packets-words.js');

const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
// A real WAV: a tone of ms milliseconds, 22,050 samples a second, 16 bits, one channel.
function wav(ms, tone = 8) {
  const rate = 22050, n = Math.round(rate * ms / 1000), pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin(i / tone) * 8000), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return 'data:audio/wav;base64,' + Buffer.concat([h, pcm]).toString('base64');
}
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (bytes = 300, fill = 3) => 'data:image/png;base64,' + Buffer.concat([PNG_HEAD, Buffer.alloc(bytes, fill)]).toString('base64');
const svgUri = (text) => 'data:image/svg+xml;base64,' + Buffer.from(text, 'utf8').toString('base64');
const PLAIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#3730a3"/></svg>';
const ZAYDEN = ['z', 'ay', 'd', 'schwa', 'n'];
const ZAYDEN_SPELLING = [{ text: 'z', size: 1 }, { text: 'ay', size: 1 }, { text: 'd', size: 1 }, { text: 'e', size: 1 }, { text: 'n', size: 1 }];
const BY_SA = { title: 'Six weeks old cat', author: 'Ada Poe', license: 'CC BY-SA 2.5', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5/',
  source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Six_weeks_old_cat.jpg', resized: true };
const BY = { title: 'Dog', author: 'Bo Lee', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', source: 'Openverse', sourceUrl: 'https://openverse.org/image/1' };
const WORDS = ['zayden', 'cat', 'dog', 'sun', 'map'];
const ACTIVITIES = ['isolation', 'blending', 'mapping', 'segmentation'];
const build = (over = {}) => builder.buildPacket({ words: WORDS, activities: ACTIVITIES, seed: 7, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav, ...over });
const allWords = (lesson) => { const out = new Set(); const walk = (v) => { if (typeof v === 'string') { if (/^[a-z]{2,}$/.test(v)) out.add(v); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); }; walk(lesson.blocks); return out; };

describe('(a) the builder takes the teacher\'s own material, and trusts none of it', () => {
  it('its inventory and limits are the sound dictionary\'s and the store\'s', () => {
    expect(builder.SOUND_LABELS).toEqual(dictionary.labels);
    expect(builder.OWN_LIMITS).toEqual({ sounds: myWords.LIMITS.sounds, clipBytes: myWords.LIMITS.clipBytes, pictureBytes: myWords.LIMITS.pictureBytes });
    // The credit sentence is the store's, word for word, for credits that hold nothing that reads like code.
    for (const credit of [BY_SA, BY, { license: 'CC0' }, { author: 'Ann', license: 'Public domain', source: 'Global Symbols' }, { title: 'A "quoted" title', license: 'CC BY 3.0', sourceUrl: 'https://example.org/a' }]) {
      expect(builder.creditLine(credit)).toBe(myWords.creditLine(credit));
    }
    expect(builder.creditLine({ own: true })).toBe('Picture added by the teacher.');
  });

  it('a word that is not in the sound dictionary is used with the teacher\'s sounds, letters and recording, and the file says so', async () => {
    expect(core.dictionarySounds('zayden')).toBeNull();
    const without = await build();
    expect(without.exceptions).toContainEqual({ word: 'zayden', activity: null, reason: 'not in the sound dictionary' });
    const clip = wav(700);
    const built = await build({ own: { zayden: { sounds: { sounds: ZAYDEN, spelling: ZAYDEN_SPELLING }, clip: { dataUri: clip, source: 'teacher', ms: 700 } } } });
    expect(built.manifest.words.used).toEqual(WORDS);
    expect(built.exceptions.filter((e) => e.word === 'zayden')).toEqual([]);
    const lesson = lessonOf(built.html);
    const item = (activity) => lesson.blocks.find((b) => b.activity === activity).items.find((i) => i.word === 'zayden');
    expect(item('mapping').graphemes).toEqual(['z', 'ay', 'd', 'e', 'n']);
    expect(item('segmentation')).toBeTruthy();
    // The word's own recording is the teacher's, byte for byte.
    expect(lesson.audio[item('mapping').wordAudio]).toBe(clip);
    expect(built.manifest.audio.list.filter((c) => c.source === 'teacher recording').map((c) => c.key)).toEqual(['zayden']);
    // Said in the file (About this file lists the attributions) and in both manifests.
    const m = manifestOf(built.html);
    expect(m.attributions).toEqual(expect.arrayContaining(['Sounds set by the teacher: zayden', 'Recorded by the teacher: zayden']));
    expect(m.own).toEqual({ sounds: ['zayden'], recordings: ['zayden'], pictures: [] });
    expect(built.manifest.own).toEqual({ words: ['zayden'], sounds: ['zayden'], recordings: ['zayden'], pictures: [], refused: [] });
    expect(loader.DEFAULT_LABELS.about_credits).toBe('Made with: {list}');
  });

  it('the teacher\'s sounds without a recording: no file question with no sound', async () => {
    const built = await build({ own: { zayden: { sounds: ZAYDEN } } });
    expect(built.manifest.words.used).not.toContain('zayden');
    expect(built.exceptions.some((e) => e.word === 'zayden' && /no recording/.test(e.reason))).toBe(true);
    // Without letters the aligner splits it (z-ay-d-e-n), and Sound Mapping is still asked for.
    expect(core.alignGraphemes('zayden', ZAYDEN).map((c) => c.text)).toEqual(['z', 'ay', 'd', 'e', 'n']);
  });

  it('a teacher\'s recording makes a dictionary word with no recording usable, and replaces a bank recording', async () => {
    expect(wordlist.get('fuzz')).toMatchObject({ hasClip: false, blocked: false });
    const clip = wav(500);
    const built = await build({ words: ['fuzz', 'cat'], own: { fuzz: { clip } } });
    expect(built.manifest.words.used).toEqual(['fuzz', 'cat']);
    expect(manifestOf(built.html).attributions).toContain('Recorded by the teacher: fuzz');
    const mine = wav(400, 5);
    const cat = await build({ words: ['cat', 'dog'], own: { cat: { clip: mine } } });
    const lesson = lessonOf(cat.html);
    const isolation = lesson.blocks.find((b) => b.activity === 'isolation').items.find((i) => i.word === 'cat');
    expect(lesson.audio[isolation.wordAudio]).toBe(mine);
  });

  it('answer choices: a teacher\'s word is a choice only where it is itself a practice word', async () => {
    // A recording for a word that is not on the list changes nothing.
    const plain = await build({ words: ['cat', 'dog', 'sun'], activities: ['blending', 'rhyming'] });
    const stray = await build({ words: ['cat', 'dog', 'sun'], activities: ['blending', 'rhyming'], own: { fuzz: { clip: wav(300) }, zayden: { sounds: ZAYDEN, clip: wav(300) } } });
    expect(stray.html).toBe(plain.html);
    expect(allWords(lessonOf(stray.html)).has('fuzz')).toBe(false);
    expect(stray.manifest).not.toHaveProperty('own');
    // On the list, it may be a choice for another of the teacher's words, as any practice word may.
    const listed = await build({ words: ['zayden', 'cat', 'dog'], activities: ['blending'], own: { zayden: { sounds: ZAYDEN, clip: wav(300) } } });
    const blending = lessonOf(listed.html).blocks.find((b) => b.activity === 'blending');
    expect(blending.items.map((i) => i.word)).toEqual(['zayden', 'cat', 'dog']);
  });

  it('a picture of the teacher\'s replaces the symbol, and About this file gives each credit, with the share-alike notice where it is needed', async () => {
    const symbols = require('../word_sounds_symbols_en.js');
    for (const shard of symbols.shards) symbols.add(JSON.parse(read(shard.url)));
    expect(symbols.has('cat') && symbols.has('dog')).toBe(true);
    const own = { zayden: { sounds: ZAYDEN, clip: wav(600), picture: { dataUri: png(), credit: { own: true } } }, cat: { picture: { dataUri: png(400, 9), credit: BY_SA } } };
    const built = await build({ pictures: true, symbols, own });
    const m = manifestOf(built.html);
    const lesson = lessonOf(built.html);
    const shown = (word) => lesson.blocks.find((b) => b.activity === 'isolation').items.find((i) => i.word === word).wordPicture;
    expect(lesson.images[shown('zayden')]).toBe(own.zayden.picture.dataUri);
    expect(lesson.images[shown('cat')]).toBe(own.cat.picture.dataUri);
    expect(lesson.images[shown('dog')]).toMatch(/^data:image\/svg\+xml;base64,/);
    const catLine = myWords.creditLine(BY_SA);
    expect(catLine).toBe('"Six weeks old cat" by Ada Poe, CC BY-SA 2.5 (creativecommons.org/licenses/by-sa/2.5/), from Wikimedia Commons (commons.wikimedia.org/wiki/File:Six_weeks_old_cat.jpg), made smaller.');
    expect(m.attributions).toEqual(expect.arrayContaining(['Pictures added by the teacher: zayden', 'Picture for cat: ' + catLine.replace(/\.$/, ''), builder.pictureCredit()]));
    expect(m.own.pictures).toEqual([{ word: 'zayden', credit: 'Picture added by the teacher.' }, { word: 'cat', credit: catLine }]);
    expect(m.notices.map((n) => n.id)).toEqual(['cmudict', 'mulberry', 'share-alike']);
    expect(m.notices[2].text).toBe(builder.SHARE_ALIKE_NOTICE + '\ncat: ' + catLine);
    expect(m.pictures).toMatchObject({ set: 'Mulberry Symbols', wordsWithTeacherPicture: 2 });
    expect(built.manifest.pictures.teacher).toEqual(['zayden', 'cat']);
    expect(Object.keys(built.manifest.pictures.files)).not.toContain('cat');
    // A CC BY picture: credited, no share-alike notice. Only the teacher's pictures: no Mulberry credit or notice.
    const onlyMine = await build({ words: ['cat', 'dog'], activities: ['isolation'], pictures: true, own: { cat: { picture: { dataUri: png(), credit: BY } }, dog: { picture: { dataUri: png(200, 5), credit: { own: true } } } } });
    const n = manifestOf(onlyMine.html);
    expect(n.notices.map((x) => x.id)).toEqual(['cmudict']);
    expect(n.attributions).not.toContain(builder.pictureCredit());
    expect(n.pictures).toEqual({ wordsWithPicture: 2, wordsWithoutPicture: 0, wordsWithTeacherPicture: 2 });
    // Without "pictures: true" no picture travels, the teacher's included.
    const off = await build({ words: ['cat', 'dog'], activities: ['isolation'], own: { cat: { picture: { dataUri: png(), credit: BY } } } });
    expect(lessonOf(off.html).images).toEqual({});
    expect(off.html).not.toContain('data:image');
  });

  it('refuses what is not what it says, or too large, or without an open license; an SVG with a script never reaches a file', async () => {
    const big = 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVEfmt '), Buffer.alloc(409600)]).toString('base64');
    const cases = {
      cat: { picture: { dataUri: svgUri('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), credit: { own: true } } },
      dog: { picture: { dataUri: 'data:image/png;base64,' + Buffer.from('GIF89a not a png at all').toString('base64'), credit: { own: true } } },
      sun: { picture: { dataUri: png(), credit: { title: 'x', license: 'CC BY-NC 4.0' } }, clip: 'data:audio/webm;base64,' + Buffer.from('webm bytes').toString('base64') },
      map: { picture: { dataUri: png(204800), credit: { own: true } }, clip: big },
      pen: { picture: { dataUri: png(), credit: { title: 'no license' } }, clip: 'data:audio/wav;base64,' + Buffer.from('not a riff file at all, honestly').toString('base64') },
      top: { sounds: ['k', 'aa', 't'] },
      hat: { sounds: ['h', 'a', 't'], spelling: [{ text: 'h', size: 1 }, { text: 'at', size: 1 }] },
    };
    const built = await build({ words: Object.keys(cases), activities: ['isolation'], pictures: true, own: cases });
    expect(built.manifest.own.refused).toEqual([
      { word: 'cat', part: 'picture', reason: 'the drawing holds a script' },
      { word: 'dog', part: 'picture', reason: 'the picture is not the kind of file its type says' },
      { word: 'sun', part: 'clip', reason: 'not a WAV or MP3 recording' },
      { word: 'sun', part: 'picture', reason: 'the picture has no open license (public domain, CC0, CC BY or CC BY-SA)' },
      { word: 'map', part: 'clip', reason: 'the recording is larger than 400 KB' },
      { word: 'map', part: 'picture', reason: 'the picture is larger than 200 KB' },
      { word: 'pen', part: 'clip', reason: 'the recording is not the kind of file its type says' },
      { word: 'pen', part: 'picture', reason: 'the picture has no open license (public domain, CC0, CC BY or CC BY-SA)' },
      { word: 'top', part: 'sounds', reason: 'not every sound is one this tool knows (1 to 24 sounds)' },
      { word: 'hat', part: 'sounds', reason: 'the letters for each sound do not spell the word' },
    ]);
    expect(lessonOf(built.html).images).toEqual({});
    expect(built.html).not.toContain('alert(1)');
    expect(manifestOf(built.html)).not.toHaveProperty('own');
    // A clean SVG of the teacher's is kept as a drawing.
    const clean = await build({ words: ['cat'], activities: ['isolation'], pictures: true, own: { cat: { picture: { dataUri: svgUri(PLAIN_SVG), credit: { own: true } } } } });
    expect(Object.values(lessonOf(clean.html).images)).toEqual([svgUri(PLAIN_SVG)]);
  });

  it('a blocked word is refused exactly as before, whatever the teacher gave it; a borderline word typed is still used', async () => {
    const own = { gun: { sounds: ['g', 'u', 'n'], clip: wav(300), picture: { dataUri: png(), credit: { own: true } } } };
    const built = await build({ words: ['cat', 'gun', 'map'], activities: ['isolation'], pictures: true, own });
    expect(built.manifest.words.used).toEqual(['cat', 'map']);
    expect(built.exceptions.filter((e) => e.activity === null)).toEqual([{ word: 'gun', activity: null, reason: 'this word is on the blocklist' }]);
    expect(built.html).not.toMatch(/"gun"/);
    expect(built.manifest).not.toHaveProperty('own');
    expect(lessonOf(built.html).images).toEqual({});
    // A word not in the dictionary that is on the blocklist (its extra list) is refused too, sounds or not.
    const extra = wordlist.rows().length && wordlist.get('bollocks');
    expect(extra && extra.blocked).toBe(true);
    const named = await build({ words: ['bollocks', 'cat'], activities: ['isolation'], own: { bollocks: { sounds: ['b', 'o', 'l', 'schwa', 'k', 's'], clip: wav(300) } } });
    expect(named.exceptions).toContainEqual({ word: 'bollocks', activity: null, reason: 'this word is on the blocklist' });
    // The soft tier: typed, it is used, with the teacher's picture.
    const soft = wordlist.rows().find((row) => row.soft && row.hasClip && row.kokoro && row.sounds === 3);
    expect(soft).toBeTruthy();
    const typed = await build({ words: [soft.word, 'cat'], activities: ['isolation'], pictures: true, own: { [soft.word]: { picture: { dataUri: png(), credit: { own: true } } } } });
    expect(typed.manifest.words.used).toEqual([soft.word, 'cat']);
    expect(typed.manifest.pictures.teacher).toEqual([soft.word]);
  });

  it('the same inputs give the same file; no material (or none for these words) gives the file of before', async () => {
    const own = { zayden: { sounds: { sounds: ZAYDEN, spelling: ZAYDEN_SPELLING }, clip: wav(650), picture: { dataUri: png(), credit: { own: true } } }, cat: { picture: { dataUri: png(250), credit: BY_SA } } };
    const one = await build({ pictures: true, own });
    const two = await build({ pictures: true, own: JSON.parse(JSON.stringify(own)) });
    expect(two.html).toBe(one.html);
    expect(two.sha256).toBe(one.sha256);
    const plain = await build({ words: ['cat', 'dog'] });
    for (const over of [{ own: {} }, { own: null }, { own: 'zayden' }, { own: [] }, { own: { zebra: { clip: wav(200) } } }]) {
      expect((await build({ words: ['cat', 'dog'], ...over })).html, JSON.stringify(over).slice(0, 40)).toBe(plain.html);
    }
  });

  it('a file with a teacher\'s recording and pictures still reads "cannot connect" on Check a file, even with credits that look like code', async () => {
    const odd = { title: 'Dog fetch (2) open(door) javascript:alert data:text/html', author: 'Eve eval(1)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dog_(1).chocolate.cookie.jpg' };
    const built = await build({ pictures: true, own: { zayden: { sounds: ZAYDEN, clip: wav(600), picture: { dataUri: png(), credit: { own: true } } }, cat: { picture: { dataUri: png(220), credit: odd } } } });
    const report = verify.verifyPacket(built.html);
    expect([report.kind, report.result, report.headline]).toEqual(['packet', 'closed', verify.HEADLINE.closed]);
    expect(report.counts).toMatchObject({ notExpected: 0, look: 0 });
    expect(report.counts.pictures).toBe(2);
    const line = manifestOf(built.html).own.pictures[1].credit;
    expect(line).toBe('"Dog fetch [2] open[door] javascript -alert data -text/html" by Eve eval[1], CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), from Wikimedia Commons (commons.wikimedia.org/wiki/File:Dog_%281%29.chocolate%2Ecookie.jpg).');
    expect(built.html).not.toMatch(/https?:\/\//);
    expect(manifestOf(built.html).never).toEqual(['internet connection', 'microphone', 'camera', 'cookies', 'AI']);
  });
});

describe('(b) the recording, as the panel keeps it', () => {
  it('trims the quiet before and after the word, and writes 16-bit WAV, one channel, at 22,050 a second', () => {
    const rate = panelKit.RATE;
    expect(rate).toBe(22050);
    const samples = new Float32Array(rate * 2);
    for (let i = Math.round(rate * 0.6); i < Math.round(rate * 1.3); i++) samples[i] = 0.25 * Math.sin(i / 6);
    for (let i = 0; i < samples.length; i += 97) samples[i] += 0.002;
    const word = panelKit.trimSilence(samples, rate);
    expect(word.length / rate).toBeGreaterThan(0.7);
    expect(word.length / rate).toBeLessThan(0.95);
    expect(Math.max(...word.map(Math.abs))).toBeGreaterThan(0.85);
    expect(Math.abs(word[0])).toBeLessThan(0.01);
    const uri = panelKit.encodeWav(word, rate);
    const bytes = Buffer.from(uri.split(',')[1], 'base64');
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect([bytes.toString('ascii', 0, 4), bytes.toString('ascii', 8, 12), bytes.readUInt16LE(20), bytes.readUInt16LE(22), bytes.readUInt32LE(24), bytes.readUInt16LE(34)]).toEqual(['RIFF', 'WAVE', 1, 1, 22050, 16]);
    expect(bytes.length).toBe(44 + word.length * 2);
    // About 44 KB a second: a spoken word is far under the store's limit, and the longest recording (4 s) is too.
    expect(44 + rate * 2 * panelKit.RECORD_MS / 1000).toBeLessThan(myWords.LIMITS.clipBytes);
    // The builder takes it as it is.
    expect(panelKit.trimSilence(new Float32Array(rate), rate)).toBeNull();
    expect(Array.from(panelKit.resample(new Float32Array([0, 1, 0, -1]), 4, 2))).toEqual([0, 0]);
  });

  it('a first guess at a name\'s sounds comes from its letters, and the teacher checks it', () => {
    expect(panelKit.guessSounds('zayden', dictionary.labels)).toEqual(['z', 'ay', 'd', 'e', 'n']);
    expect(panelKit.guessSounds('max', dictionary.labels)).toEqual(['m', 'a', 'k', 's']);
    expect(panelKit.guessSounds('shelly', dictionary.labels)).toEqual(['sh', 'e', 'l', 'ee']);
    for (const word of ['kai', 'quinn', 'xochitl', 'aaliyah']) expect(panelKit.guessSounds(word, dictionary.labels).every((s) => dictionary.labels.includes(s)), word).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (c) The maker page in jsdom
// ---------------------------------------------------------------------------
const SOUND_URLS = ['audio_bank/phonemes.json', 'audio_bank/isolation.json', 'audio_bank/instructions.json', 'word_audio_kokoro_bank.json', 'audio_bank_kokoro.json'];
const tiny = (path) => 'data:audio/webm;base64,' + Buffer.from('clip ' + path).toString('base64');
const shrink = (value, path) => typeof value === 'string' ? (value.startsWith('data:audio') ? tiny(path) : value)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shrink(inner, path + '/' + key)])) : value;
const SOUNDS = Object.fromEntries(SOUND_URLS.map((url) => { const text = read(url); return [url, JSON.stringify(shrink(JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text), url))]; }));
// The browser's decoder, as a stand-in: a clip becomes a short buffer; the recording (8 bytes) becomes two seconds with a word in the middle.
class FakeOffline {
  constructor(channels, length, rate) { this.length = length; this.sampleRate = rate; this.destination = {}; this.played = null; }
  decodeAudioData(buffer, done) {
    if (buffer.byteLength === 8) {
      const rate = this.sampleRate, data = new Float32Array(rate * 2);
      for (let i = Math.round(rate * 0.5); i < Math.round(rate * 1.1); i++) data[i] = 0.3 * Math.sin(i / 5);
      done({ sampleRate: rate, numberOfChannels: 1, length: data.length, getChannelData: () => data });
      return;
    }
    done({ duration: 0.004, bytes: new Uint8Array(buffer) });
  }
  createBufferSource() { const self = this; return { connect() {}, start() {}, set buffer(value) { self.played = value; } }; }
  startRendering() {
    const from = this.played.bytes, samples = new Float32Array(this.length);
    for (let i = 0; i < samples.length; i++) samples[i] = from[from.length - 1 - (i % from.length)] / 128 - 1;
    return Promise.resolve({ getChannelData: () => samples });
  }
}
async function openMaker(options = {}) {
  const dom = new JSDOM(read('packets-make.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-make.html' });
  const w = dom.window, d = w.document;
  const page = { dom, w, d, asked: [], files: [], played: [], micAsks: 0, micStopped: 0, idb: options.idb === undefined ? fakeIndexedDB() : options.idb };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.fetch = async (url, init) => {
    page.asked.push(String(url));
    const body = SOUNDS[url] || null;
    if (init || !body) return { ok: false, status: 404, headers: { get: () => null }, text: async () => '' };
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  if (page.idb) w.indexedDB = page.idb;
  if (options.channels) w.BroadcastChannel = options.channels;
  w.OfflineAudioContext = FakeOffline;
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = (opts && opts.type) || ''; this.size = Buffer.byteLength(this.body); } arrayBuffer() { return Promise.resolve(new ArrayBuffer(8)); } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLMediaElement.prototype.play = function () { page.played.push(this.src); return Promise.resolve(); };
  w.HTMLMediaElement.prototype.pause = function () {};
  if (options.microphone !== false) {
    const track = { stop: () => { page.micStopped++; } };
    Object.defineProperty(w.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      page.micAsks++;
      if (options.microphone === 'refused') throw Object.assign(new Error('no'), { name: 'NotAllowedError' });
      return { getTracks: () => [track] };
    } } });
    w.MediaRecorder = class {
      constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
      start() { this.state = 'recording'; }
      stop() { if (this.state === 'inactive') return; this.state = 'inactive'; this.ondataavailable({ data: new w.Blob(['recorded'], { type: 'audio/webm' }) }); this.onstop(); }
    };
  }
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.set = (id, value) => { const node = page.$(id); node.value = value; node.dispatchEvent(new w.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
  page.choose = (name, value) => { const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.until = async (test, what) => { for (let i = 0; i < 3000; i++) { if (test()) return; await new Promise((resolve) => setTimeout(resolve, 10)); } throw new Error('Timed out waiting for ' + what); };
  page.row = (word) => [...page.$('own-list').children].find((row) => row.querySelector('.w').textContent === word);
  page.says = (word) => page.row(word)?.querySelector('.s').textContent;
  page.panel = (word) => page.row(word)?.querySelector('.wp');
  page.button = (root, name) => root.querySelector('[data-wp="' + name + '"]');
  page.store = w.AlloPacketMyWords;
  page.built = () => page.files[page.files.length - 1].body;
  await page.until(() => !page.seen('loading'), 'the page to open');
  return page;
}
const typeWords = async (page, text, n) => {
  page.$('next-1').click();
  page.choose('mode', 'own');
  page.set('f-own', text);
  await page.until(() => page.$('own-list').children.length === n, 'the checked words');
};

describe('(c) the maker: "Edit this word", the store, and the file', () => {
  it('the panel is closed by default; the messages say what a word needs; sounds set in the panel make a name usable', async () => {
    const page = await openMaker();
    await typeWords(page, 'zayden cat fuzz', 3);
    expect(page.says('zayden')).toBe('Not in the sound dictionary. Set its sounds to use it, or check the spelling.');
    expect(page.says('fuzz')).toBe('No recording yet. Record it yourself, or choose another word.');
    expect(page.says('cat')).toBe('Ready. 3 sounds: k, a, t.');
    // Closed: no panel anywhere, every toggle says so, and "My words" is not on the page while the store is empty.
    expect(page.d.querySelectorAll('.wp')).toHaveLength(0);
    for (const row of page.$('own-list').children) expect(row.querySelector('.e button').getAttribute('aria-expanded')).toBe('false');
    expect(page.$('my-words').hidden).toBe(true);
    // Open it for zayden: three parts, the dictionary has nothing, the first guess comes from the letters.
    page.row('zayden').querySelector('.e button').click();
    const panel = page.panel('zayden');
    expect(panel).toBeTruthy();
    expect(page.row('zayden').querySelector('.e button').getAttribute('aria-expanded')).toBe('true');
    expect(page.d.activeElement).toBe(panel.querySelector('h3'));
    expect([...panel.querySelectorAll('h4')].map((h) => h.textContent)).toEqual(['Sounds', 'Recording', 'Picture']);
    expect(panel.querySelector('.wp-part .wp-line').textContent).toBe('Not in the sound dictionary. Set its sounds to use it.');
    await page.until(() => !page.button(panel, 'change-sounds').disabled, 'the store to answer');
    page.button(panel, 'change-sounds').click();
    const selects = () => [...page.panel('zayden').querySelectorAll('.wp-picks select')];
    expect(selects().map((s) => s.value)).toEqual(['z', 'ay', 'd', 'e', 'n']);
    // Every sound the dictionary knows is offered, and nothing else.
    expect([...selects()[0].querySelectorAll('option')].map((o) => o.value).sort()).toEqual(dictionary.labels.slice().sort());
    expect(selects()[0].querySelector('option[value="ay"]').textContent).toBe('ay, as in day');
    expect(page.panel('zayden').querySelector('input[type="text"]').value).toBe('z ay d e n');
    // The 4th sound is a schwa. Letters that do not spell the word are refused in plain words.
    selects()[3].value = 'schwa';
    selects()[3].dispatchEvent(new page.w.Event('change', { bubbles: true }));
    const letters = page.panel('zayden').querySelector('input[type="text"]');
    letters.value = 'z ay d n';
    letters.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    page.button(page.panel('zayden'), 'keep-sounds').click();
    expect(page.panel('zayden').querySelector('.wp-problem').textContent).toBe('The letters must spell zayden. These spell zaydn.');
    letters.value = 'z ay d e n';
    letters.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    page.button(page.panel('zayden'), 'keep-sounds').click();
    await page.until(() => page.says('zayden') === 'No recording yet. Record it yourself, or choose another word.', 'the sounds to be kept');
    const kept = await page.store.get('zayden');
    expect(kept.sounds).toEqual({ sounds: ZAYDEN, alternates: [], source: 'teacher', spelling: [
      { text: 'z', start: 0, size: 1, at: 0 }, { text: 'ay', start: 1, size: 1, at: 1 }, { text: 'd', start: 2, size: 1, at: 3 }, { text: 'e', start: 3, size: 1, at: 4 }, { text: 'n', start: 4, size: 1, at: 5 }] });
    // The panel stayed open through the redraw, and shows the split.
    expect([...page.panel('zayden').querySelectorAll('.wp-split .wp-letters')].map((n) => n.textContent)).toEqual(['z', 'ay', 'd', 'e', 'n']);
    expect(page.panel('zayden').querySelector('.wp-said').textContent).toBe('Kept. Files you make with this word use these sounds.');
    // My words now lists it, quietly closed.
    await page.until(() => !page.$('my-words').hidden, 'My words');
    expect(page.$('my-words').open).toBe(false);
    expect(page.$('my-words-line').textContent).toMatch(/^My words on this device: 1 word, \d+ KB\.$/);
    page.dom.window.close();
  });

  it('Record: the microphone is asked for only on the button, the recording is kept as WAV, and the word is ready', async () => {
    const page = await openMaker();
    await page.store.put('zayden', { sounds: ZAYDEN });
    await typeWords(page, 'zayden', 1);
    await page.until(() => page.says('zayden') === 'No recording yet. Record it yourself, or choose another word.', 'the stored sounds');
    page.row('zayden').querySelector('.e button').click();
    const panel = () => page.panel('zayden');
    await page.until(() => page.button(panel(), 'record') && !page.button(panel(), 'record').disabled, 'Record');
    expect(page.micAsks).toBe(0);
    expect(panel().querySelector('#' + page.button(panel(), 'record').getAttribute('aria-describedby')).textContent).toBe('The recording stays on this device. The microphone is used only while you record.');
    page.button(panel(), 'record').click();
    await page.until(() => page.button(panel(), 'stop'), 'Stop');
    expect(page.micAsks).toBe(1);
    expect(page.d.activeElement).toBe(page.button(panel(), 'stop'));
    page.button(panel(), 'stop').click();
    await page.until(() => page.button(panel(), 'keep-clip'), 'the recording to be ready');
    expect(page.micStopped).toBe(1);
    page.button(panel(), 'play-new').click();
    await page.until(() => page.played.length === 1, 'play');
    expect(page.played[0]).toMatch(/^data:audio\/wav;base64,UklGR/);
    page.button(panel(), 'keep-clip').click();
    await page.until(() => page.says('zayden') === 'Ready. Uses your sounds and your recording. 5 sounds: z, ay, d, schwa (uh), n.', 'ready');
    const clip = (await page.store.get('zayden')).clip;
    const bytes = Buffer.from(clip.dataUri.split(',')[1], 'base64');
    expect([bytes.toString('ascii', 0, 4), bytes.readUInt16LE(22), bytes.readUInt32LE(24)]).toEqual(['RIFF', 1, 22050]);
    // About 0.6 s of word, plus a little before and after.
    expect(clip.ms).toBeGreaterThan(600);
    expect(clip.ms).toBeLessThan(900);
    expect(clip.bytes).toBeLessThan(60000);
    page.dom.window.close();
  });

  it('a microphone that is refused or missing is said plainly', async () => {
    const refused = await openMaker({ microphone: 'refused' });
    await typeWords(refused, 'fuzz', 1);
    refused.row('fuzz').querySelector('.e button').click();
    await refused.until(() => refused.button(refused.panel('fuzz'), 'record') && !refused.button(refused.panel('fuzz'), 'record').disabled, 'Record');
    refused.button(refused.panel('fuzz'), 'record').click();
    await refused.until(() => refused.panel('fuzz').querySelectorAll('.wp-said')[1].textContent, 'the message');
    expect(refused.panel('fuzz').querySelectorAll('.wp-said')[1].textContent).toBe('The microphone was not allowed, so nothing was recorded. To record, allow the microphone for this site in the browser, then press Record it yourself again.');
    refused.dom.window.close();
    const none = await openMaker({ microphone: false });
    await typeWords(none, 'fuzz', 1);
    none.row('fuzz').querySelector('.e button').click();
    await none.until(() => none.button(none.panel('fuzz'), 'record') && !none.button(none.panel('fuzz'), 'record').disabled, 'Record');
    none.button(none.panel('fuzz'), 'record').click();
    expect(none.panel('fuzz').querySelectorAll('.wp-said')[1].textContent).toBe('This browser cannot record on this page. You can choose another word.');
    expect(none.micAsks).toBe(0);
    none.dom.window.close();
  });

  it('a picture from a file, and the store read just before the file is made: the file holds the teacher\'s recording, picture and credit', async () => {
    const page = await openMaker();
    await page.store.put('zayden', { sounds: { sounds: ZAYDEN, spelling: ZAYDEN_SPELLING }, clip: { dataUri: wav(650), source: 'teacher', ms: 650 } });
    await typeWords(page, 'zayden cat dog', 3);
    await page.until(() => /^Ready\. Uses your sounds and your recording\./.test(page.says('zayden')), 'zayden ready');
    page.row('zayden').querySelector('.e button').click();
    const panel = page.panel('zayden');
    await page.until(() => !page.button(panel, 'use-picture').disabled, 'the picture button');
    const find = page.button(panel, 'find-picture');
    expect([find.getAttribute('href'), find.getAttribute('target'), find.getAttribute('rel'), find.textContent]).toEqual(['packets-pictures.html#word=zayden', '_blank', 'noopener', 'Find a picture online (opens in a new tab)']);
    expect(panel.querySelector('#' + page.button(panel, 'use-picture').getAttribute('aria-describedby')).textContent).toBe('Use only a picture you have the right to share.');
    const input = page.button(panel, 'picture-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [new page.w.File([PLAIN_SVG], 'zayden.svg', { type: 'image/svg+xml' })] });
    input.dispatchEvent(new page.w.Event('change', { bubbles: true }));
    await page.until(() => page.panel('zayden').querySelector('.wp-picture img'), 'the picture');
    expect(page.panel('zayden').querySelector('.wp-picture img').getAttribute('alt')).toBe('Your picture for zayden');
    expect((await page.store.get('zayden')).picture.credit).toEqual({ own: true });
    // A picture added in another tab (Find a picture) reaches this page too.
    const other = page.store.create({ indexedDB: page.idb });
    await other.put('cat', { picture: { dataUri: png(), credit: BY_SA } });
    // No channel between these two stand-ins: the page reads the store again on its own next change.
    await page.store.put('dog', { picture: { dataUri: png(220), credit: { own: true } } });
    page.$('next-2').click();
    await page.until(() => page.seen('summary') || page.seen('build-problem'), 'the file');
    expect(page.seen('summary')).toBe(true);
    expect(page.$('pictures-line').textContent).toBe('Pictures for 3 of 3 words: 3 you added.');
    const html = page.built();
    const m = manifestOf(html);
    expect(m.own.recordings).toEqual(['zayden']);
    expect(m.own.pictures).toEqual([{ word: 'zayden', credit: 'Picture added by the teacher.' }, { word: 'cat', credit: myWords.creditLine(BY_SA) }, { word: 'dog', credit: 'Picture added by the teacher.' }]);
    expect(m.attributions).toEqual(expect.arrayContaining(['Recorded by the teacher: zayden', 'Pictures added by the teacher: zayden, dog', 'Picture for cat: ' + myWords.creditLine(BY_SA).replace(/\.$/, '')]));
    expect(m.notices.map((n) => n.id)).toEqual(['cmudict', 'share-alike']);
    expect(verify.verifyPacket(html).result).toBe('closed');
    // The maker asked the site for the sound files only: nothing about the words, no other site.
    expect(page.asked.every((url) => SOUND_URLS.includes(url) || url.startsWith('word_audio_shards/'))).toBe(true);
    page.dom.window.close();
  });

  it('My words on this device: count and size, remove one, remove all (two presses)', async () => {
    const page = await openMaker();
    await page.store.put('zayden', { sounds: ZAYDEN, clip: { dataUri: wav(500) } });
    await page.store.put('cat', { picture: { dataUri: png(), credit: { own: true } } });
    await typeWords(page, 'cat', 1);
    await page.until(() => !page.$('my-words').hidden && page.$('my-words-list').children.length === 2, 'the summary');
    expect(page.$('my-words-line').textContent).toMatch(/^My words on this device: 2 words, \d+ KB\.$/);
    expect([...page.$('my-words-list').children].map((li) => li.querySelector('.mw-word').textContent + ': ' + li.querySelector('.mw-what').textContent.replace(/\d+ KB/, 'N KB'))).toEqual(['cat: your picture, N KB.', 'zayden: sounds, recording, N KB.']);
    page.$('my-words-list').querySelector('button[aria-label="Remove zayden from my words"]').click();
    await page.until(() => page.$('my-words-list').children.length === 1, 'one removed');
    expect(await page.store.get('zayden')).toBeNull();
    expect(page.$('my-words-said').textContent).toBe('Removed zayden.');
    page.$('my-words-clear').click();
    expect(page.$('my-words-clear').textContent).toBe('Yes, remove all 1 word');
    expect(page.seen('my-words-keep')).toBe(true);
    page.$('my-words-clear').click();
    await page.until(() => page.$('my-words-said').textContent === 'Removed 1 word.', 'all removed');
    expect((await page.store.usage()).count).toBe(0);
    expect(page.$('my-words-line').textContent).toBe('My words on this device: none.');
    page.dom.window.close();
  });

  it('a picked word has "Edit this word" too, one panel under the list at a time; with no storage the panel says so and keeps nothing', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    await page.until(() => page.$('pick-chips').children.length > 2, 'the chips');
    const [first, second] = [...page.$('pick-chips').children].map((chip) => chip.querySelector('span').textContent);
    const edit = (word) => page.$('pick-chips').querySelector('button[aria-label="Edit this word: ' + word + '"]');
    edit(first).click();
    expect(page.seen('pick-edit')).toBe(true);
    expect(page.$('pick-edit').querySelector('.wp-title').textContent).toBe('Edit this word: ' + first);
    expect(edit(first).getAttribute('aria-expanded')).toBe('true');
    edit(second).click();
    expect(page.$('pick-edit').querySelectorAll('.wp')).toHaveLength(1);
    expect(page.$('pick-edit').querySelector('.wp-title').textContent).toBe('Edit this word: ' + second);
    expect(edit(first).getAttribute('aria-expanded')).toBe('false');
    page.$('pick-edit').querySelector('.wp-head button').click();
    expect(page.seen('pick-edit')).toBe(false);
    expect(page.d.activeElement).toBe(edit(second));
    page.dom.window.close();
    // No storage (a browser that keeps nothing for this site).
    const bare = await openMaker({ idb: null });
    bare.$('next-1').click();
    await bare.until(() => bare.$('pick-chips').children.length > 0, 'the chips');
    bare.$('pick-chips').querySelector('button.chip-edit').click();
    const panel = bare.$('pick-edit').querySelector('.wp');
    await bare.until(() => !panel.querySelector('.wp-warn').hidden, 'the warning');
    expect(panel.querySelector('.wp-warn').textContent).toBe('This browser is not keeping your words, so nothing here can be kept.');
    expect(bare.button(panel, 'record').disabled && bare.button(panel, 'use-picture').disabled && bare.button(panel, 'change-sounds').disabled).toBe(true);
    expect(bare.$('my-words').hidden).toBe(true);
    bare.dom.window.close();
  });

  it('another tab\'s change reaches the page over the channel', async () => {
    const Channel = fakeChannels();
    const page = await openMaker({ channels: Channel });
    await typeWords(page, 'fuzz', 1);
    expect(page.says('fuzz')).toBe('No recording yet. Record it yourself, or choose another word.');
    const otherTab = page.store.create({ indexedDB: page.idb, BroadcastChannel: Channel });
    await otherTab.put('fuzz', { clip: { dataUri: wav(400) } });
    await page.until(() => /^Ready\. Uses your recording\./.test(page.says('fuzz')), 'the other tab\'s recording');
    expect(page.says('fuzz')).toBe('Ready. Uses your recording. 3 sounds: f, u, z.');
    page.dom.window.close();
  });

  it('Choose the words yourself: a word added there that needs its sounds or a recording has Edit this word in its row, and joins the list once it is ready', async () => {
    const page = await openMaker();
    page.$('next-1').click();
    await page.until(() => page.$('pick-chips').children.length > 0, 'the chips');
    const chips = () => [...page.$('pick-chips').children].map((chip) => chip.querySelector('span').textContent);
    const list = page.$('pick-list');
    list.open = true;
    list.dispatchEvent(new page.w.Event('toggle'));
    page.$('list-clear').click();
    page.set('f-add', 'zayden, cat');
    page.$('add-words').click();
    expect(page.$('list-said').textContent).toBe('Added and checked: cat. Not usable yet: zayden. It joins your list once it has what the note beside it asks for. You chose 1 word. The file uses all of them, in the order you checked them.');
    expect(chips()).toEqual(['cat']);
    const row = (word) => [...page.$('word-list').querySelectorAll('li.wl')].find((node) => node.querySelector('input').value === word);
    expect(row('zayden').querySelector('.wl-facts').textContent).toBe('You typed it. Not in the sound dictionary. Set its sounds to use it, or check the spelling.');
    expect(row('zayden').querySelector('input').disabled).toBe(true);
    // Edit this word opens in the row, closed by default, one at a time; closing it puts the focus back on its button.
    const toggle = () => row('zayden').querySelector('button.wl-edit');
    expect(toggle().textContent).toBe('Edit this word');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(page.$('word-list').querySelectorAll('.wp')).toHaveLength(0);
    toggle().click();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(row('zayden').querySelector('.wp .wp-title').textContent).toBe('Edit this word: zayden');
    expect(page.$(toggle().getAttribute('aria-controls')).contains(row('zayden').querySelector('.wp'))).toBe(true);
    expect(page.d.activeElement).toBe(row('zayden').querySelector('.wp h3'));
    row('zayden').querySelector('.wp-head button').click();
    expect(page.$('word-list').querySelectorAll('.wp')).toHaveLength(0);
    expect(page.d.activeElement).toBe(toggle());
    // Its sounds, then a recording (here kept by the store as the panel would keep them): checked as soon as it is ready, at the end of the list.
    await page.store.put('zayden', { sounds: ZAYDEN });
    await page.until(() => /No recording yet/.test(row('zayden').querySelector('.wl-facts').textContent), 'the sounds');
    expect(chips()).toEqual(['cat']);
    await page.store.put('zayden', { sounds: ZAYDEN, clip: { dataUri: wav(500) } });
    await page.until(() => chips().length === 2, 'zayden to join');
    expect(chips()).toEqual(['cat', 'zayden']);
    expect(row('zayden').querySelector('input').checked).toBe(true);
    expect(row('zayden').querySelector('.wl-facts').textContent).toBe('You typed it. Ready. Uses your sounds and your recording. 5 sounds: z, ay, d, schwa (uh), n.');
    // The file has both, and the teacher's recording.
    page.$('next-2').click();
    await page.until(() => page.seen('summary') || page.seen('build-problem'), 'the file');
    expect(page.seen('summary')).toBe(true);
    expect(page.$('sum-words').textContent).toBe('2 words: cat, zayden.');
    page.dom.window.close();
  });
});
