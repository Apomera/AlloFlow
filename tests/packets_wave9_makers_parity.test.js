import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { openMaker } from './helpers/packets_maker_page.js';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const parse = (file) => new JSDOM(read(file)).window.document;
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const verify = require('../packets_verify_core.js');
const reopen = require('../packets_reopen.js');

const ENV = {
  verify,
  creditLine: builder.creditLine,
  codeName: builder.codeName,
  activities: builder.SUPPORTED_ACTIVITIES,
  wordSounds: core.activityIds(),
  labels: dictionary.labels,
  seeds: { A: 1, B: 2, C: 3 },
};

const opened = [];
afterEach(() => {
  while (opened.length) {
    try { opened.pop().close(); } catch (_) {}
  }
});

const lessonFromHtml = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(uri || '').slice(-32))]).toString('base64');

function sampleWav(ms = 120) {
  const rate = 8000;
  const n = Math.round((rate * ms) / 1000);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin(i / 6) * 4000), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return 'data:audio/wav;base64,' + Buffer.concat([h, pcm]).toString('base64');
}

const SAMPLE_MP3_A = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA';
const SAMPLE_MP3_B = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMQAAAAAAAAAAAAAA';
const SAMPLE_MP3_BANK = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMgAAAAAAAAAAAAAA';

const VOCAB_SCRIPTS = [
  'packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_reopen.js',
  'packets_zip.js', 'packets_handoff.js', 'packets_my_words.js', 'packets_vocab_bank_en.js',
  'word_sounds_symbols_en.js', 'word_picture_matcher.js', 'word_sounds_packet_builder.js',
  'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-print-cards.js',
  'packets_word_starters.js', 'packets-vocab.js',
];

async function openVocab({ before = null, afterMyWords = null, afterMedia = null } = {}) {
  const saved = [];
  const dom = new JSDOM(read('packets-vocab.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://site.test/packets-vocab.html',
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
  w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:vocab-w9-' + saved.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  if (before) before(w);
  for (const src of VOCAB_SCRIPTS) {
    if (src === 'packets_vocab_bank_en.js') {
      w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      continue;
    }
    w.eval(read(src));
    if (src === 'packets_my_words.js' && afterMyWords) afterMyWords(w);
    if (src === 'packets_vocab_media.js' && afterMedia) afterMedia(w);
  }
  await wait(10);
  const $ = (id) => d.getElementById(id);
  const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));
  return {
    w, d, $, saved, fire,
    type: async (text) => { $('f-words').value = text; fire($('f-words'), 'input'); await wait(300); },
    waitBuilt: async (minCount = 1) => {
      for (let i = 0; i < 80; i++) {
        const htmls = saved.filter((b) => b.type === 'text/html');
        if (htmls.length >= minCount) return htmls[htmls.length - 1];
        await wait(20);
      }
      return saved.filter((b) => b.type === 'text/html').pop() || null;
    },
  };
}

const SR_SCRIPTS = [
  'packets-page.js', 'packets_zip.js', 'packets_my_words.js', 'packets_verify_core.js', 'packets_reopen.js',
  'word_sounds_take_home_loader.js', 'word_picture_matcher.js', 'symbol_runner_core.js',
  'packet_symbol_runner_builder.js', 'packets-symbol-runner.js',
];

function openSymbolRunner({ before = null, afterMyWords = null } = {}) {
  const saved = [];
  const dom = new JSDOM(read('packets-symbol-runner.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.example/packets-symbol-runner.html',
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);
  w.matchMedia = () => ({ matches: true });
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
  w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
  w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:sr-w9-' + saved.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  if (before) before(w);
  for (const src of SR_SCRIPTS) {
    w.eval(read(src));
    if (src === 'packets_my_words.js' && afterMyWords) afterMyWords(w);
  }
  return {
    w, d, saved,
    $: (id) => d.getElementById(id),
    waitBuilt: async (minCount = 1) => {
      for (let i = 0; i < 80; i++) {
        const htmls = saved.filter((b) => b.type === 'text/html' || /<!doctype html/i.test(b.body || ''));
        if (htmls.length >= minCount) return htmls[htmls.length - 1];
        await wait(20);
      }
      return saved[saved.length - 1] || null;
    },
  };
}

// ============================================================================
// P0-1: Word Sounds `showLetters` (Sound-Only vs Letter Hints)
// ============================================================================
describe('Wave 9 P0-1: Word Sounds showLetters toggle, persistence, build, and reopen', () => {
  it('defaults OFF with 0 B delta on built packet and untouched default localStorage payload', async () => {
    const p = await openMaker();
    opened.push(p.w);
    expect(p.$('show-letters-field').hidden).toBe(false);
    expect(p.$('f-show-letters').checked).toBe(false);
    expect(p.$('more-1').open).toBe(false);
    expect(p.$('more-1-now').textContent).toBe('Choices: Medium');

    const baseline = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map', 'pig'],
      activities: ['isolation', 'blending'],
      seed: 1,
      title: 'Sound-only check',
      core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    const explicitOff = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map', 'pig'],
      activities: ['isolation', 'blending'],
      seed: 1,
      title: 'Sound-only check',
      showLetters: false,
      core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    expect(explicitOff.html).toBe(baseline.html);
    expect(lessonFromHtml(explicitOff.html).showLetters).toBe(false);

    // Turning ON persists showLetters: true, updates Step 1 summary, and opens #more-1 on reload.
    p.$('f-show-letters').checked = true;
    p.$('f-show-letters').dispatchEvent(new p.w.Event('change', { bubbles: true }));
    expect(p.$('more-1-now').textContent).toBe('Choices: Medium, Letter hints: on');
    const storedOn = JSON.parse(p.w.localStorage.getItem('alloflow-packets-maker/1'));
    expect(storedOn.showLetters).toBe(true);

    // Reloading with saved state restores checkbox checked and auto-opens #more-1.
    const p2 = await openMaker({
      before: (w) => { w.localStorage.setItem('alloflow-packets-maker/1', JSON.stringify(storedOn)); },
    });
    opened.push(p2.w);
    expect(p2.$('f-show-letters').checked).toBe(true);
    expect(p2.$('more-1').open).toBe(true);
    expect(p2.$('more-1-now').textContent).toBe('Choices: Medium, Letter hints: on');

    // Building from the maker with showLetters ON produces lesson.showLetters === true.
    p2.$('next-1').click();
    p2.$('next-2').click();
    await p2.ready();
    const builtOn = lessonFromHtml(p2.built());
    expect(builtOn.showLetters).toBe(true);

    // "Forget my choices" resets showLetters back to false.
    p2.$('forget').click();
    expect(p2.$('f-show-letters').checked).toBe(false);
    expect(p2.$('more-1').open).toBe(false);
    expect(p2.$('more-1-now').textContent).toBe('Choices: Medium');
  });

  it('reads back showLetters in packets_reopen.js and restores it on Word Sounds maker reopen', async () => {
    const packetOn = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map', 'pig'],
      activities: ['isolation', 'blending'],
      seed: 1,
      title: 'With letter hints',
      showLetters: true,
      core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    const packetOff = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map', 'pig'],
      activities: ['isolation', 'blending'],
      seed: 1,
      title: 'Sound only',
      showLetters: false,
      core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    expect(lessonFromHtml(packetOn.html).showLetters).toBe(true);
    expect(reopen.read(packetOn.html, ENV).showLetters).toBe(true);
    expect(reopen.read(packetOff.html, ENV).showLetters).toBe(false);

    // Reopen through the live Word Sounds maker UI.
    const p = await openMaker();
    opened.push(p.w);
    await p.open('with-letter-hints.html', packetOn.html);
    expect(p.$('f-show-letters').checked).toBe(true);
    expect(p.$('more-1').open).toBe(true);
    expect(p.$('reopen-list').textContent).toContain('Letter hints on sound activities: on.');

    // Making the file again keeps showLetters === true.
    p.$('next-1').click();
    p.$('next-2').click();
    await p.ready();
    expect(lessonFromHtml(p.built()).showLetters).toBe(true);
  });
});

// ============================================================================
// P0-2A: AlloPacketMyWords entry.clip in Vocabulary Maker
// ============================================================================
describe('Wave 9 P0-2A: AlloPacketMyWords custom audio in Vocabulary maker', () => {
  it('merges teacher MyWords entry.clip (priority + WAV->MP3 + size cap) offline and surfaces quiet voice-clip link for missing words', async () => {
    const wavUri = sampleWav(100);
    const oversizedUri = 'data:audio/mpeg;base64,' + 'A'.repeat(2 * 1024 * 1024 + 128);
    let wavConverted = 0;
    const p = await openVocab({
      before(w) {
        w.fetch = async () => ({ ok: false, status: 404, text: async () => '' });
        w.AlloPacketAudioKit = {
          getMp3: async () => true,
          wavUriToMp3Uri: (uri) => {
            if (uri === wavUri) { wavConverted++; return SAMPLE_MP3_B; }
            return null;
          },
        };
      },
      afterMyWords(w) {
        w.AlloPacketMyWords = {
          normalizeMediaKey: (k) => String(k || '').trim().toLowerCase(),
          getManyMedia: async (keys) => {
            const out = {};
            for (const k of keys) {
              const nk = String(k || '').toLowerCase();
              if (nk === 'habitat') out[nk] = { clip: { dataUri: SAMPLE_MP3_A, source: 'recorded' } };
              if (nk === 'predator') out[nk] = { clip: { dataUri: wavUri, source: 'recorded' } };
              if (nk === 'prey') out[nk] = { clip: { dataUri: oversizedUri, source: 'recorded' } };
            }
            return out;
          },
          onChange: () => {},
        };
      },
      afterMedia(w) {
        w.AlloVocabMedia = {
          clips: async (words) => {
            const out = {};
            // Bank has habitat (should NOT overwrite teacher's SAMPLE_MP3_A) and cell.
            if (words.includes('habitat')) out.habitat = SAMPLE_MP3_BANK;
            if (words.includes('cell')) out.cell = SAMPLE_MP3_BANK;
            return out;
          },
          pictures: async () => {},
        };
      },
    });

    await p.type('habitat, predator, prey, cell, bat');
    p.$('next-1').click();
    p.$('next-2').click();
    const blob = await p.waitBuilt(1);
    expect(blob).toBeTruthy();

    const lesson = lessonFromHtml(blob.body);
    const embeddedClips = Object.values(lesson.audio || {});
    // Teacher's MP3 for habitat + WAV->MP3 for predator + bank clip for cell; oversized prey dropped.
    expect(wavConverted).toBeGreaterThanOrEqual(1);
    expect(embeddedClips).toContain(SAMPLE_MP3_A);
    expect(embeddedClips).toContain(SAMPLE_MP3_B);
    expect(embeddedClips).toContain(SAMPLE_MP3_BANK);
    expect(embeddedClips).not.toContain(oversizedUri);
    // habitat used teacher clip, never overwritten by bank clip.
    const meaningBlock = lesson.blocks.find((b) => b.activity === 'vocab_meaning');
    const habitatItem = meaningBlock.items.find((it) => String(it.word || '').toLowerCase() === 'habitat');
    expect(lesson.audio[habitatItem.askAudio]).toBe(SAMPLE_MP3_A);

    // Quiet "Record or make a voice clip" link lists missing words (prey, bat) pointing to packets-voice.html.
    const wrap = p.$('voices-missing-wrap');
    const link = p.$('voices-add-link');
    expect(wrap && wrap.hidden).toBe(false);
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Record or make a voice clip');
    expect(link.getAttribute('href')).toContain('packets-voice.html#words=');
    const missingParam = decodeURIComponent(link.getAttribute('href').split('#words=')[1] || '');
    expect(missingParam).toContain('prey');
    expect(missingParam).toContain('bat');
    expect(missingParam).not.toContain('habitat');
    expect(missingParam).not.toContain('predator');
  });

  it('works with MyWords entry.clip even when built-in media download fails offline, and embeds zero audio when readAloud is off', async () => {
    const p = await openVocab({
      before(w) {
        w.fetch = async () => { throw new Error('offline'); };
      },
      afterMyWords(w) {
        w.AlloPacketMyWords = {
          getMany: async (keys) => {
            const out = {};
            for (const k of keys) {
              const nk = String(k || '').toLowerCase();
              if (nk === 'habitat' || nk === 'predator' || nk === 'prey' || nk === 'cell') {
                out[nk] = { clip: { dataUri: SAMPLE_MP3_A } };
              }
            }
            return out;
          },
        };
      },
      afterMedia(w) {
        w.AlloVocabMedia = {
          clips: async () => { throw new Error('network unavailable'); },
        };
      },
    });

    await p.type('habitat, predator, prey, cell');
    p.$('next-1').click();
    p.$('next-2').click();
    const blob = await p.waitBuilt(1);
    const lesson = lessonFromHtml(blob.body);
    expect(Object.values(lesson.audio || {})).toContain(SAMPLE_MP3_A);
    expect(Object.keys(lesson.audio || {}).length).toBe(4);
    // All 4 list words have recordings -> missing-voice link stays hidden.
    const wrap = p.$('voices-missing-wrap');
    expect(!wrap || wrap.hidden).toBe(true);

    // Turning off Read aloud strips all audio and hides the missing-voice link.
    p.$('f-read').checked = false;
    p.$('f-read').dispatchEvent(new p.w.Event('change', { bubbles: true }));
    const blobNoRead = await p.waitBuilt(2);
    expect(Object.keys(lessonFromHtml(blobNoRead.body).audio || {})).toHaveLength(0);
  });
});

// ============================================================================
// P0-2B: AlloPacketMyWords entry.clip in Symbol Runner Maker + Check Mode Rule
// ============================================================================
describe('Wave 9 P0-2B: AlloPacketMyWords custom audio in Symbol Runner maker', () => {
  it('embeds entry.clip (including WAV->MP3 compression and size cap) in Practice mode and shows quiet link for unrecorded words', async () => {
    const wavUri = sampleWav(100);
    const oversizedUri = 'data:audio/mpeg;base64,' + 'B'.repeat(2 * 1024 * 1024 + 128);
    let wavConverted = 0;
    const p = openSymbolRunner({
      before(w) {
        w.AlloPacketAudioKit = {
          getMp3: async () => true,
          wavUriToMp3Uri: (uri) => {
            if (uri === wavUri) { wavConverted++; return SAMPLE_MP3_B; }
            return null;
          },
        };
      },
      afterMyWords(w) {
        w.AlloPacketMyWords = {
          normalizeMediaKey: (k) => String(k || '').trim().toLowerCase(),
          getManyMedia: async (keys) => {
            const out = {};
            for (const k of keys) {
              const nk = String(k || '').toLowerCase();
              if (nk === 'mitosis') out[nk] = { clip: { dataUri: SAMPLE_MP3_A, source: 'recorded' } };
              if (nk === 'osmosis') out[nk] = { clip: { dataUri: wavUri, source: 'kokoro' } };
              if (nk === 'xylem') out[nk] = { clip: { dataUri: oversizedUri, source: 'recorded' } };
            }
            return out;
          },
          onChange: () => {},
        };
      },
    });

    p.$('sr-custom').value = 'mitosis, osmosis, xylem, phloem';
    p.$('sr-custom').dispatchEvent(new p.w.Event('input', { bubbles: true }));
    p.$('sr-save-html').click();
    const blob = await p.waitBuilt(1);
    expect(blob).toBeTruthy();

    const lesson = lessonFromHtml(blob.body);
    const embeddedClips = Object.values(lesson.audio || {});
    expect(wavConverted).toBeGreaterThanOrEqual(1);
    expect(embeddedClips).toContain(SAMPLE_MP3_A);
    expect(embeddedClips).toContain(SAMPLE_MP3_B);
    expect(embeddedClips).not.toContain(oversizedUri);

    // Quiet missing-clip link lists unrecorded words (xylem, phloem) and points to packets-voice.html.
    const note = p.$('sr-clip-missing-note');
    const link = p.$('sr-clip-missing-link');
    expect(note && note.hidden).toBe(false);
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Record or make a voice clip');
    expect(link.getAttribute('href')).toContain('packets-voice.html#words=');
    const missingParam = decodeURIComponent(link.getAttribute('href').split('#words=')[1] || '');
    expect(missingParam).toContain('phloem');
    expect(missingParam).toContain('xylem');
    expect(missingParam).not.toContain('mitosis');
    expect(missingParam).not.toContain('osmosis');
  });

  it('NEVER embeds MyWords entry.clip audio in 1-Minute Check mode and hides the missing-clip link', async () => {
    const p = openSymbolRunner({
      afterMyWords(w) {
        w.AlloPacketMyWords = {
          getMany: async (keys) => {
            const out = {};
            for (const k of keys) out[String(k || '').toLowerCase()] = { clip: { dataUri: SAMPLE_MP3_A } };
            return out;
          },
        };
      },
    });

    p.$('sr-custom').value = 'mitosis, osmosis, phloem';
    p.$('sr-custom').dispatchEvent(new p.w.Event('input', { bubbles: true }));
    const checkRadio = p.d.querySelector('input[name="sr-packet-mode"][value="check"]');
    checkRadio.checked = true;
    checkRadio.dispatchEvent(new p.w.Event('change', { bubbles: true }));

    p.$('sr-save-html').click();
    const blob = await p.waitBuilt(1);
    expect(blob).toBeTruthy();

    const lesson = lessonFromHtml(blob.body);
    expect(lesson.mode).toBe('probe');
    expect(Object.keys(lesson.audio || {})).toHaveLength(0);
    const note = p.$('sr-clip-missing-note');
    expect(!note || note.hidden).toBe(true);
  });
});

// ============================================================================
// P0-4: IT / Privacy Disclosure Sync
// ============================================================================
describe('Wave 9 P0-4: IT & Privacy disclosure sync across packets-it.html, packets-about.html, and packets.html', () => {
  const PROMISES = /\b(?:safely|safety|safer|safe|unsafe|securely|security|secure|insecure|guarantee(?:s|d|ing)?|certifi(?:ed|cation)|compliant|compliance|tamper-proof|trusted|bulletproof)\b/i;
  const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;

  it('discloses alloflow-cdn.pages.dev, opt-in local Student Voice Practice, Device Voice, Sealed QR camera, Curriculum Diagrams, and Reading Tools on packets-it.html', () => {
    const doc = parse('packets-it.html');
    const body = squash(doc.body.textContent);
    expect(body).toContain('alloflow-cdn.pages.dev');
    expect(body).toContain('huggingface.co');
    expect(body).toContain('Student Voice Practice');
    expect(body).toContain('browser memory only');
    expect(body).toContain('Standard practice files and checks never use the microphone.');
    expect(body).toContain('Device Voice');
    expect(body).toContain('Start camera');
    // 2026-11-23: the sentence now names its one exception (the hand-over to Add up results passes through this site's storage).
    expect(body).toContain('Collect by sealed QR keeps nothing in browser storage after the tab closes, with one exception');
    expect(body).toContain('are removed when Add up results reads them');
    expect(body).toContain('AlloFlow Curriculum Diagrams (AGPL-3.0)');
    expect(body).toContain('exact text size');
    expect(body).toContain('custom colors');
    expect(body).toContain('bold start');

    // Still only the exact 2 GitHub URLs in packets-it.html (no https:// before alloflow-cdn.pages.dev).
    const urls = read('packets-it.html').match(/(?:https?:|wss?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [];
    expect(urls).toEqual([
      'https://github.com/Apomera/AlloFlow',
      'https://github.com/Apomera/AlloFlow/blob/main/docs/packets-file-formats.md',
    ]);
  });

  it('keeps packets-about.html and packets.html truthful, consistent, and free of promises, exclamation marks, and British spellings', () => {
    const about = parse('packets-about.html');
    const aboutBody = squash(about.body.textContent);
    expect(aboutBody).toContain('AlloFlow Curriculum Diagrams');
    expect(aboutBody).toContain('sealed QR');
    expect(aboutBody).toContain('Student Voice Practice');
    expect(about.querySelector('time').getAttribute('datetime')).toBe('2026-11-22');

    const front = parse('packets.html');
    const frontCheck = squash(front.getElementById('check').textContent);
    expect(frontCheck).toContain('Device Voice');
    expect(frontCheck).toContain('Standard practice files and checks never use the microphone');
    expect(frontCheck).toContain('Student Voice Practice');
    // 2026-11-23: "never saved" was not true beside a Save my recording button. The page says what is.
    expect(frontCheck).toContain('A recording stays in the browser\'s memory and is never sent.');
    expect(frontCheck).toContain('only if the student presses Save my recording');
    expect(frontCheck).not.toContain('never saved or sent');

    for (const file of ['packets-it.html', 'packets-about.html', 'packets.html']) {
      const raw = read(file);
      const text = raw.replace(/Content-Security-Policy/gi, '').replace(/unsafe-(?:inline|eval|hashes)/g, '');
      expect(PROMISES.exec(text), file).toBeNull();
      expect(BRITISH.exec(raw), file).toBeNull();
      expect(parse(file).body.textContent, file).not.toContain('!');
    }
  });
});
