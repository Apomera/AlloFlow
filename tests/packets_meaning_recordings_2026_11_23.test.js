// @vitest-environment jsdom
// Meanings recorded ahead of time in vocabulary files (2026-11-23):
//   - packets_vocab_media.js meaningClips finds a meaning's recording by its text, with the same key and file as
//     dev-tools/build_packets_meaning_audio.cjs, uses only an exact text match, and gives {} when the site has none;
//   - packet_vocab_builder.js gives a Word to meaning question its meaning recordings only when ALL 4 choices have one,
//     a Meaning to word question its asked meaning, credits them, and leaves no unused recording in the file;
//   - the player (takeHomeVocab) uses one voice per question: recordings only when every choice has one, else the
//     device voice reads every choice.
import { afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const V = require('../packet_vocab_builder.js');
const verify = require('../packets_verify_core.js');
const M = require('../dev-tools/build_packets_meaning_audio.cjs');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');
await bank.load();

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });
const MP3 = 'data:audio/mpeg;base64,' + Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00').toString('base64');
const WAV = 'data:audio/wav;base64,' + Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt ').toString('base64');
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const rowsOf = () => V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat').words, bank });
const meaningTexts = (lesson) => {
  const out = new Set();
  for (const b of lesson.blocks) for (const it of b.items) {
    if (b.activity === 'vocab_meaning') it.choices.forEach((c) => out.add(c.text));
    if (b.activity === 'vocab_word') out.add(it.ask);
  }
  return [...out];
};

describe('packets_vocab_media meaningClips', () => {
  it('finds recordings by the same key and file as the recording script, exact text only, and {} without a store', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'meaning-media-'));
    try {
      const store = M.openStore(dir);
      const texts = ['The natural home of a plant or animal', 'An animal that hunts other animals for food'];
      for (const t of texts) store.add(M.keyOf(t), { text: t, spoken: M.spokenText(t), seconds: 2, audio: MP3 });
      // A clip whose text is not the text asked for (as a key collision would be) is never used.
      store.add(M.keyOf('A small room in a jail'), { text: 'Something else', spoken: 'x', seconds: 1, audio: MP3 });
      store.flush({});
      const served = (url) => {
        const m = /^packets_meaning_audio\/(index|m-[0-9a-f]{4})\.json$/.exec(String(url));
        return m ? readFileSync(join(dir, m[1] + '.json'), 'utf8') : null;
      };
      delete window.AlloVocabMedia;
      new Function(read('packets_vocab_media.js'))();
      Object.defineProperty(window, 'crypto', { configurable: true, value: webcrypto });
      window.TextEncoder = TextEncoder;
      const fetched = [];
      window.fetch = vi.fn(async (url) => { fetched.push(String(url)); const body = served(url); return body == null ? { ok: false, status: 404, text: async () => '' } : { ok: true, status: 200, text: async () => body }; });
      const got = await window.AlloVocabMedia.meaningClips([...texts, ' The natural  home of a plant or animal ', 'A small room in a jail', 'Not in the store at all']);
      expect(Object.keys(got).sort()).toEqual(texts.slice().sort());
      expect(got[texts[0]]).toBe(MP3);
      // Only the index and the files of meanings the index lists were fetched.
      expect(fetched[0]).toBe('packets_meaning_audio/index.json');
      expect(fetched.every((u) => /^packets_meaning_audio\/(index|m-[0-9a-f]{4})\.json$/.test(u))).toBe(true);
      expect(fetched.length).toBeLessThanOrEqual(4);

      // No store on this site (a 404, or a page served in its place): {} and no error.
      delete window.AlloVocabMedia;
      new Function(read('packets_vocab_media.js'))();
      window.fetch = vi.fn(async () => ({ ok: false, status: 404, text: async () => '' }));
      await expect(window.AlloVocabMedia.meaningClips(texts)).resolves.toEqual({});
      delete window.AlloVocabMedia;
      new Function(read('packets_vocab_media.js'))();
      window.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => '<!doctype html><title>Packets</title>' }));
      await expect(window.AlloVocabMedia.meaningClips(texts)).resolves.toEqual({});
    } finally { rmSync(dir, { recursive: true, force: true }); delete window.AlloVocabMedia; }
  });
});

describe('packet_vocab_builder meaning recordings', () => {
  const rows = rowsOf();
  const plain = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word'], mode: 'practice' });
  const all = Object.fromEntries(meaningTexts(plain).map((t) => [t, MP3]));

  it('gives every choice of Word to meaning, and the asked meaning of Meaning to word, its recording, and credits them', () => {
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word'], mode: 'practice', meaningClips: all });
    const meaningBlock = lesson.blocks.find((b) => b.activity === 'vocab_meaning'), wordBlock = lesson.blocks.find((b) => b.activity === 'vocab_word');
    for (const it of meaningBlock.items) for (const c of it.choices) expect(c.audio).toMatch(/^m/);
    for (const it of wordBlock.items) expect(it.askAudio).toMatch(/^m/);
    for (const id of Object.keys(lesson.audio)) expect(lesson.audio[id]).toBe(MP3);
    const built = V.buildVocabPacket({ lesson, loader: TH, rows, bank });
    expect(built.manifest.attributions.join('\n')).toMatch(/Recordings of \d+ meanings: made ahead of time with Kokoro-82M text-to-speech \(voice af_heart\), a machine voice\. They passed automatic checks; no person has listened to each one\./);
    expect(built.html).toContain('Read aloud plays a recording made ahead of time for some meanings.');
    expect(built.manifest.vocab.meaningRecordings).toBe(Object.keys(lesson.audio).length);
    expect(built.manifest.speech.recordings.meanings).toBe(Object.keys(lesson.audio).length);
    const rep = verify.verifyPacket(built.html);
    expect([rep.ok, rep.result, rep.script.verdict]).toEqual([true, 'closed', 'agree']);
  });

  it('gives a Word to meaning question none when one of its 4 meanings has no recording, and keeps no unused recording', () => {
    const first = plain.blocks.find((b) => b.activity === 'vocab_meaning').items[0];
    const wrong = first.choices.map((c) => c.text).find((t) => t !== first.answer);
    const some = Object.assign({}, all);
    delete some[wrong];
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning'], mode: 'practice', meaningClips: some });
    const items = lesson.blocks[0].items;
    for (const it of items) {
      const texts = it.choices.map((c) => c.text);
      if (texts.includes(wrong)) expect(it.choices.every((c) => !c.audio)).toBe(true);
      else expect(it.choices.every((c) => /^m/.test(c.audio || ''))).toBe(true);
    }
    const used = new Set(items.flatMap((it) => it.choices.map((c) => c.audio).filter(Boolean)));
    expect(Object.keys(lesson.audio).filter((id) => id.charAt(0) === 'm').sort()).toEqual([...used].sort());
  });

  it('uses no meaning recordings with Read aloud or recordings off, or for a WAV or a bad address', () => {
    for (const extra of [{ readAloud: false }, { voices: false }]) {
      const lesson = V.lessonFromVocab(Object.assign({ loader: TH, rows, types: ['meaning', 'word'], mode: 'practice', meaningClips: all }, extra));
      expect(Object.keys(lesson.audio)).toEqual([]);
    }
    const odd = Object.fromEntries(Object.keys(all).map((t, i) => [t, i % 2 ? WAV : 'data:audio/mpeg;base64,<script>']));
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word'], mode: 'practice', meaningClips: odd });
    expect(Object.keys(lesson.audio)).toEqual([]);
  });
});

describe('takeHomeVocab: one voice per question', () => {
  function open(html) {
    const plays = [], spoken = [];
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/v.html',
      beforeParse(w) {
        w.Audio = class { constructor(src) { this.src = src; } play() { plays.push(this.src || ''); setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve(); } pause() { this.paused = true; } };
        w.speechSynthesis = { speaking: false, getVoices: () => [{ lang: 'en-US', localService: true, name: 'Local' }], cancel() {}, speak(u) { if (u.text) spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 0); }, addEventListener() {} };
        w.SpeechSynthesisUtterance = function (t) { this.text = t; };
      },
    });
    opened.push(dom.window);
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Owl1';
    d.querySelector('#app button.primary').click();
    return { d, plays, spoken };
  }

  it('reads every choice with the device voice when only some choices have a recording', () => {
    const rows = rowsOf();
    const plain = V.lessonFromVocab({ loader: TH, rows, types: ['word'], mode: 'practice' });
    const first = plain.blocks[0].items[0];
    // A recording for the right word only: the odd voice would point at the answer.
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['word'], mode: 'practice', clips: { [V.keyOf(first.answer)]: WAV } });
    const item = lessonOf(V.buildVocabPacket({ lesson, loader: TH, rows, bank }).html).blocks[0].items[0];
    expect(item.choices.filter((c) => c.audio).length).toBe(1);
    const { d, plays, spoken } = open(V.buildVocabPacket({ lesson, loader: TH, rows, bank }).html);
    for (let n = 1; n <= item.choices.length; n++) d.querySelector('[data-read-aloud="choice-' + n + '"]').click();
    expect(plays).toEqual([]);
    expect(spoken).toHaveLength(item.choices.length);
  });

  it('plays the recordings when every choice has one', () => {
    const rows = rowsOf();
    const plain = V.lessonFromVocab({ loader: TH, rows, types: ['meaning'], mode: 'practice' });
    const all = Object.fromEntries(meaningTexts(plain).map((t) => [t, MP3]));
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning'], mode: 'practice', meaningClips: all });
    const html = V.buildVocabPacket({ lesson, loader: TH, rows, bank }).html;
    const item = lessonOf(html).blocks[0].items[0];
    expect(item.choices.every((c) => c.audio)).toBe(true);
    const { d, plays, spoken } = open(html);
    for (let n = 1; n <= item.choices.length; n++) d.querySelector('[data-read-aloud="choice-' + n + '"]').click();
    expect(plays.length).toBe(item.choices.length);
    expect(spoken).toEqual([]);
  });
});
