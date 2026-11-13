// @vitest-environment jsdom
// "Hear all" in the activities of AlloFlow Packets files (2026-11-12): one button that plays or reads each answer
// choice in turn, the choice being heard outlined with its number, a short pause between, stopped by pressing it
// again, by any other button of the item or by the keys 1-9, R and Esc, said politely to screen readers, and never
// started by itself unless the student turns on the reading tool "Read the choices when a question opens" (off by
// default, kept like the other tools), and then only after the student's first press in the file (iPad and iPhone
// play sound only after a press). The player part is hearAllIn in word_sounds_take_home_loader.js; each activity
// whose choices can be heard asks for it (ctx.hearAll). Every screen test runs a REAL built file in jsdom.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const TH = loader;
const V = require('../packet_vocab_builder.js');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');

const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
const fake = (name) => new Proxy({}, {
  get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
  getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined),
});
const BANKS = { words: fake('words'), phonemes: fake('phonemes'), isolation: fake('isolation'), instructions: fake('instructions') };
const KNOWN = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top', 'sit', 'fan', 'hop', 'red', 'run', 'mug', 'bat', 'rat', 'man', 'log', 'hen', 'net', 'lip', 'bug', 'rug'];
const CVC = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top'];
const wsFile = async (activities, over = {}) => (await builder.buildPacket({ words: CVC, activities, title: 'Ten words', seed: 7, core, dictionary, banks: BANKS, loader, knownWords: KNOWN,
  createdAt: '2026-11-12T00:00:00.000Z', ...over })).html;
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
// A built file, its script running. Every clip "plays" for 5 ms; the device voice (when given) speaks for 5 ms.
function open(html, { voices = null, storage = null } = {}) {
  const played = [], spoken = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { played.push(this.src); const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 5); return Promise.resolve(); } pause() {} };
    if (voices) {
      w.speechSynthesis = { getVoices: () => voices, cancel() {}, speak(u) { if (u.text) spoken.push(u.text); setTimeout(() => { if (u.onend) u.onend(); }, 5); }, addEventListener() {} };
      w.SpeechSynthesisUtterance = function (text) { this.text = text; };
    }
    if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const q = (s) => d.querySelector(s);
  const seen = (n) => !!n && !n.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const marks = () => [...d.querySelectorAll('[data-hearing]')].map((n) => n.getAttribute('data-hearing'));
  return { w, d, q, seen, button, marks, played, spoken,
    start: () => { d.getElementById('learner-name').value = 'Fox1'; button('Start').click(); },
    hear: () => q('[data-hear-all]'),
    now: () => q('[data-hear-now]').textContent,
    key: (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })),
  };
}

// ---------------------------------------------------------------------------
// 1. Word Sounds activities whose choices have recordings
// ---------------------------------------------------------------------------
describe('Hear all in Word Sounds files', () => {
  const CASES = { rhyming: 'choices', blending: 'choices', word_families: 'chips', sound_sort: 'chips' };
  for (const [activity, field] of Object.entries(CASES)) {
    it(activity + ': plays every choice in order, each marked with its number, then stops', async () => {
      const html = await wsFile([activity]);
      const lesson = lessonOf(html);
      const item = lesson.blocks[0].items[0];
      const f = open(html);
      f.start();
      await wait(1);
      const hear = f.hear();
      expect(f.seen(hear), 'a Hear all button').toBe(true);
      expect(hear.getAttribute('type')).toBe('button');
      expect(f.q('[data-hear-now]').getAttribute('aria-live')).toBe('polite');
      // The opening sequence is the app's own; Hear all itself has not started.
      expect(f.now()).toBe('');
      f.played.length = 0;
      hear.click();
      expect(hear.textContent).toMatch(/Stop$/);
      expect(f.marks()).toEqual(['1']);
      expect(f.now()).toBe('Choice 1 of ' + item[field].length);
      await wait(item[field].length * 520 + 200);
      expect(f.played).toEqual(item[field].map((c) => lesson.audio[c.audio]));
      expect(f.marks()).toEqual([]);
      expect(f.now()).toBe('');
      expect(hear.textContent).not.toMatch(/Stop$/);
    });
  }

  it('stops when pressed again, when an answer is chosen, and on the keys 1-9, R and Esc', async () => {
    const html = await wsFile(['rhyming']);
    const f = open(html);
    f.start();
    await wait(1);
    const hear = f.hear();
    hear.click(); expect(f.marks()).toEqual(['1']);
    hear.click(); expect(f.marks()).toEqual([]);
    await wait(600);
    expect(f.marks(), 'stays stopped').toEqual([]);
    for (const k of ['Escape', 'r']) {
      hear.click(); expect(f.marks()).toEqual(['1']);
      f.key(k); expect(f.marks(), k).toEqual([]);
    }
    // A Listen button of one choice stops it too, and plays that choice.
    hear.click();
    const listen = [...f.d.querySelectorAll('li.choice button')].find((b) => /Listen/.test(b.textContent));
    listen.click();
    expect(f.marks()).toEqual([]);
    // Choosing an answer stops it.
    hear.click();
    f.d.querySelector('li.choice button.primary').click();
    expect(f.marks()).toEqual([]);
  });

  it('is only in activities whose choices can be heard', async () => {
    const withHear = [];
    for (const id of builder.SUPPORTED_ACTIVITIES) {
      const html = await wsFile([id]);
      const f = open(html);
      f.start();
      await wait(1);
      if (f.hear()) withHear.push(id);
    }
    expect(withHear.sort()).toEqual(['blending', 'isolation', 'mapping', 'rhyming', 'segmentation', 'sound_sort', 'word_families']);
  });

  it('the activities the app exports with choice recordings ask for it too (manipulation, syllable blending), and none starts it by itself', () => {
    for (const id of ['blending', 'rhyming', 'word_families', 'sound_sort', 'manipulation', 'syllable_blending']) {
      const src = TH.ADAPTERS[id].render.toString();
      expect(src, id).toContain('ctx.hearAll(');
      expect(src, id).toContain('auto: false');
    }
    // Activities where hearing the choices would give the answer away, or whose choices are not recordings, have none.
    for (const id of ['decoding', 'read_sentence', 'read_passage', 'sentence_match', 'counting', 'missing_letter', 'orthography', 'spelling_bee', 'word_scramble'])
      expect(TH.ADAPTERS[id].render.toString(), id).not.toContain('hearAll');
    // Find Sounds, Break it Down and Sound Mapping open with the question and the word only: the reading tool may start them.
    for (const id of ['isolation', 'segmentation', 'mapping']) { expect(TH.ADAPTERS[id].render.toString(), id).toContain('ctx.hearAll('); expect(TH.ADAPTERS[id].render.toString(), id).not.toContain('auto: false'); }
  });
});

// ---------------------------------------------------------------------------
// 2. Vocabulary files: the device voice, recordings, and the reading tool
// ---------------------------------------------------------------------------
await bank.load();
const VOICES = [{ lang: 'en-US', localService: true, name: 'On device' }];
const vocab = ({ words = 'habitat, predator, prey, cell, bat, adapt, camouflage, ancient', types = ['meaning', 'word'], mode = 'practice', ...more } = {}) => {
  const rows = V.draftRows({ words: V.parseWords(words).words, bank });
  const lesson = V.lessonFromVocab({ loader: TH, rows, types, mode, ...more });
  return V.buildVocabPacket({ lesson, loader: TH, rows, bank, ...more });
};
const KEY = (html) => { const l = lessonOf(html); return 'alloflow-take-home:' + l.lessonId + ':' + l.revision; };

describe('Hear all in vocabulary files', () => {
  it('reads each choice with the device voice, in order, and shows only where a voice that runs on the device is there', async () => {
    const made = vocab();
    const f = open(made.html, { voices: VOICES });
    f.start();
    const item = lessonOf(made.html).blocks[0].items[0];
    expect(f.seen(f.hear())).toBe(true);
    f.hear().click();
    await wait(item.choices.length * 520 + 300);
    expect(f.spoken).toEqual(item.choices.map((c) => c.text));
    // No voice on the device: no Hear all (and no Read aloud).
    const g = open(made.html, { voices: [{ lang: 'en-US', localService: false, name: 'Online' }] });
    g.start();
    expect(g.seen(g.hear())).toBe(false);
    // Read aloud off in the file: none either.
    const off = vocab({ readAloud: false });
    const h = open(off.html, { voices: VOICES });
    h.start();
    expect(h.seen(h.hear())).toBe(false);
  });

  it('the reading tool "Read the choices when a question opens" is off by default, starts Hear all on each new question once on, and is kept', async () => {
    const made = vocab();
    const f = open(made.html, { voices: VOICES });
    const group = f.q('[data-tool-group="choices"]');
    expect(f.seen(group) || !group.hidden).toBe(true);
    expect(group.querySelector('.lt-l').textContent).toBe('Read the choices when a question opens');
    expect(f.q('[data-tool="choices-0"]').getAttribute('aria-pressed')).toBe('true');
    f.start();
    expect(f.marks(), 'off by default: nothing starts by itself').toEqual([]);
    f.q('[data-tool="choices-1"]').click();
    expect(JSON.parse(f.w.localStorage.getItem(KEY(made.html))).tools).toEqual({ choices: 1 });
    // Answer, go on: the next question reads its choices by itself.
    f.d.querySelector('[data-choice="1"]').click();
    if (!f.button('Next')) f.d.querySelector('[data-choice="2"]').click();
    if (!f.button('Next')) f.d.querySelector('[data-choice="3"]').click();
    f.spoken.length = 0;
    f.button('Next').click();
    expect(f.marks()).toEqual(['1']);
    await wait(2600);
    expect(f.spoken.length).toBeGreaterThanOrEqual(4);
    const saved = JSON.parse(f.w.localStorage.getItem(KEY(made.html)));
    expect(saved.items[1].supports.readChoices).toBe(1);
    // Kept: the file opened again on this device starts with it on.
    const g = open(made.html, { voices: VOICES, storage: { [KEY(made.html)]: JSON.stringify(saved) } });
    expect(g.q('[data-tool="choices-1"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('never starts before the student has pressed something in the file (iPad and iPhone)', async () => {
    const made = vocab();
    const lesson = lessonOf(made.html);
    // A check that resumes on its own screen with the tool on: no press yet, so nothing starts.
    const checkFile = vocab({ mode: 'check' });
    const ck = lessonOf(checkFile.html);
    const key = 'alloflow-take-home:' + ck.lessonId + ':' + ck.revision;
    const f = open(checkFile.html, { voices: VOICES, storage: { [key]: JSON.stringify({ tools: { choices: 1 } }) } });
    expect(f.marks()).toEqual([]);
    expect(lesson.blocks.length).toBeGreaterThan(0);
  });

  it('a file whose choices cannot be read shows no such tool, and its tools behave as before', async () => {
    const html = await wsFile(['counting']);
    const f = open(html);
    expect(f.q('[data-tool-group="choices"]').hidden).toBe(true);
    // The mark does not move (no animation or transition), so reduced motion needs nothing more (tests/packet_check_mode.test.js: the files are calm).
    const rules = read('word_sounds_take_home_loader.js').split('\n').filter((l) => l.includes('[data-hearing]'));
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(rule).not.toMatch(/animation|transition|@keyframes/);
  });
});

describe('the reading tool in a Word Sounds file', () => {
  it('Find Sounds: with "Read the choices" on, the sounds play in turn once the question and the word have played', async () => {
    const html = await wsFile(['isolation']);
    const lesson = lessonOf(html);
    const f = open(html);
    expect(f.q('[data-tool-group="choices"]').hidden).toBe(false);
    f.q('[data-tool="choices-1"]').click();
    f.start();
    const item = lesson.blocks[0].items[0];
    await wait(60);
    expect(f.marks()).toEqual(['1']);
    await wait(item.choices.length * 520 + 300);
    expect(f.played).toEqual(item.introAudio.concat(item.choices.map((c) => c.audio)).map((id) => lesson.audio[id]));
  });
});

describe('small layout fixes of the same day (C:/tmp/packets_build_1111/ux_review/NOTES.md)', () => {
  it('a file with more than one activity says where the student is in all of it; a file with one does not', async () => {
    const two = open(await wsFile(['isolation', 'rhyming']));
    two.start();
    const total = lessonOf(two.d.documentElement.outerHTML).blocks.reduce((n, b) => n + b.items.length, 0);
    expect(two.q('[data-progress]').textContent).toBe('Question 1 of ' + total + ' in all');
    const one = open(await wsFile(['isolation']));
    one.start();
    expect(one.q('[data-progress]')).toBeNull();
    expect(one.q('[data-next]')).toBeTruthy();
  });

  it('on phones a choice keeps its two buttons side by side and Next spans the card; nothing moves', () => {
    const css = read('word_sounds_take_home_loader.js');
    expect(css).toContain('@media (max-width:480px){.choice:not([style]){flex-direction:row;align-items:stretch}.choice:not([style])>button{flex:1 1 0;min-width:0}[data-next],[data-practice-next]{width:100%}}');
    expect(css).toContain("feedback.scrollIntoView({ block: 'nearest' })");
  });
});

// ---------------------------------------------------------------------------
// 3. Recordings made ahead of time for the words
// ---------------------------------------------------------------------------
describe('recordings of the words in vocabulary files', () => {
  const wav = (w) => clip('rec/' + w);
  const clips = { habitat: wav('habitat'), predator: wav('predator'), prey: wav('prey'), cell: wav('cell'), bat: wav('bat') };

  it('play for the word itself; the device voice reads the meanings; the file credits them and says how many', async () => {
    const made = vocab({ clips });
    const lesson = lessonOf(made.html);
    const meaning = lesson.blocks.find((b) => b.activity === 'vocab_meaning').items;
    const withClip = meaning.filter((it) => it.askAudio);
    expect(withClip.length).toBeGreaterThan(0);
    for (const it of withClip) expect(lesson.audio[it.askAudio]).toBe(clips[it.word]);
    const words = lesson.blocks.find((b) => b.activity === 'vocab_word').items;
    for (const it of words) for (const c of it.choices) if (clips[c.text]) expect(lesson.audio[c.audio]).toBe(clips[c.text]); else expect(c.audio).toBeUndefined();
    expect(made.manifest.attributions.find((l) => /^Recordings of /.test(l))).toMatch(/made ahead of time with Kokoro-82M text-to-speech \(voice af_heart\), a machine voice/);
    expect(made.manifest.speech.recordings).toMatchObject({ humanReviewed: false });
    // Read aloud on a question with a recording: the recording, then the question in the device voice.
    const f = open(made.html, { voices: VOICES });
    f.start();
    const first = lesson.blocks[0].items[0];
    f.q('[data-read-aloud="question"]').click();
    await wait(60);
    if (first.askAudio) { expect(f.played).toContain(clips[first.word]); expect(f.spoken).toEqual(['What does this word mean?']); }
    // Turned off, or Read aloud off: no recording in the file.
    expect(Object.keys(lessonOf(vocab({ clips, voices: false }).html).audio)).toEqual([]);
    expect(Object.keys(lessonOf(vocab({ clips, readAloud: false }).html).audio)).toEqual([]);
  });

  it('a word choice with a recording can be heard on a device with no voice', async () => {
    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat, adapt, camouflage, ancient').words, bank });
    const all = Object.fromEntries(V.wordsToHear(rows, ['word']).map((w) => [w, wav(w)]));
    const made = vocab({ clips: all, types: ['word'] });
    const f = open(made.html, { voices: [] });
    f.start();
    expect(f.seen(f.hear())).toBe(true);
    f.hear().click();
    await wait(4 * 520 + 200);
    const item = lessonOf(made.html).blocks[0].items[0];
    expect(f.played).toEqual(item.choices.map((c) => all[c.text]));
  });
});

// ---------------------------------------------------------------------------
// 4. The page's loader: what a page gets from this site only
// ---------------------------------------------------------------------------
describe('packets_vocab_media.js', () => {
  it('asks only for this site\'s files, by relative address, and converts with the loader\'s own converter', () => {
    const src = read('packets_vocab_media.js');
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).toContain("var INDEX = 'word_audio_shards/index.json';");
    expect(src).toContain('loader.portableAudio(');
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|innerHTML/);
  });
});
