// @vitest-environment jsdom
// Wave 8 Track A regression suite (F1-F8):
//   F1: packet_vocab_builder withCodeName('') strips manifest.learner + withManifest prototype-key guard
//   F2: takeHomeVocab sayToken/timer/Escape/Stop-audio/onvoiceschanged cleanup + takeHomeCheck speedRate/toolPref/pause(true)
//   F3: packet_vocab_builder pure hasImage (no orphan SVGs/credits), art-less diagrams with svgSafe, AGPL-3.0 diagram credit,
//       packets-vocab.js pic.credit forwarding + safe non-own custom credit formatting, self-naming diagram SVG guard
//   F4: packets_voice_engine data: URI CSP-safe decoding, real AbortSignal guard + abort/timeout race, wavInfo bounds check,
//       addScript expected-global check + timeout handler cleanup, win.setTimeout catalog timeout, disposed _kokoroTTS recovery
//   F5: packets_audio_kit wavInfo fmt-chunk bounds & positive fields, wavToMp3 kbps clamping, fromDataUri MIME params,
//       getMp3 timeout cleanup + documentElement fallback, Safari portableAudio oncomplete order + takeHomeStudentMic error track cleanup
//   F6: quantity_discrimination strict whole()/answer validation, click aria-disabled/isDone guard, aria-labelledby,
//       CHECK_CSS forced-colors/opacity/checkmark & 390px responsive pair styles (preserving exact button textContent)
//   F7: takeHomeVocab 390px mobile flex/wrap, responsive square picture aspect-ratio, vocab_picture_word Check sample revealed alt
//   F8: packet_vocab_builder blankSentence/hasWord curly apostrophes, contraction/hyphen rejection, possessive preservation
import { afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const V = require('../packet_vocab_builder.js');
const PC = require('../packet_check_builder.js');
const art = require('../word_sounds_packet_builder.js');
const symbols = require('../word_sounds_symbols_en.js');
for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));
const matcher = require('../word_picture_matcher.js');
const verify = require('../packets_verify_core.js');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');
await bank.load();

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html)[1]);
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const scriptOf = (html) => [...new JSDOM(html).window.document.querySelectorAll('script')].find((n) => !n.type).textContent;

function wavBytes(ms = 250, rate = 24000) {
  const samples = Math.round(rate * ms / 1000);
  const data = samples * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data, 40);
  return new Uint8Array(buf);
}

const WAV_URI = 'data:audio/wav;base64,' + Buffer.from(wavBytes(250)).toString('base64');
const CLEAN_SVG_URI = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>', 'utf8').toString('base64');

describe('F1: packet_vocab_builder withCodeName & withManifest privacy hardening', () => {
  it('strips manifest.learner on empty/whitespace/null/punctuation code names and stays byte-identical when already unnamed', () => {
    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat').words, bank });
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning'], mode: 'practice' });
    const unnamed = V.buildVocabPacket({ lesson, loader: TH, rows, bank }).html;
    expect(manifestOf(unnamed).learner).toBeUndefined();
    expect(V.withCodeName(unnamed, '')).toBe(unnamed);
    expect(V.withCodeName(unnamed, '   ')).toBe(unnamed);

    const named = V.withCodeName(unnamed, 'Fox1');
    expect(manifestOf(named).learner).toBe('Fox1');
    expect(scriptOf(named)).toBe(scriptOf(unnamed));

    for (const empty of ['', '   ', '!!!', null, undefined]) {
      const stripped = V.withCodeName(named, empty);
      expect(manifestOf(stripped).learner, String(empty)).toBeUndefined();
      expect(stripped).not.toContain('"learner"');
      expect(scriptOf(stripped)).toBe(scriptOf(unnamed));
      const rep = verify.verifyPacket(stripped);
      expect([rep.ok, rep.result, rep.script.verdict]).toEqual([true, 'closed', 'agree']);
      expect(rep.counts).toMatchObject({ notExpected: 0, look: 0 });
    }
  });
});

describe('F2: takeHomeVocab audio/TTS/Escape/Stop cleanup and takeHomeCheck speedRate/toolPref/pause', () => {
  it('prevents askAudio->TTS overlap, cancels TTS on Escape & Stop audio, clears say timers, and cleans up onvoiceschanged on screen change', async () => {
    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat').words, bank });
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning'], mode: 'practice', clips: { habitat: WAV_URI, predator: WAV_URI, prey: WAV_URI, cell: WAV_URI, bat: WAV_URI } });
    const built = V.buildVocabPacket({ lesson, loader: TH, rows, bank });

    const spoken = [];
    const cancels = [];
    const audioControls = [];
    const activeTimers = new Set();
    let fakeNow = 1000;

    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/v.html',
      beforeParse(w) {
        Object.defineProperty(w.performance, 'now', { configurable: true, value: () => fakeNow });
        const origSet = w.setTimeout.bind(w);
        const origClear = w.clearTimeout.bind(w);
        w.setTimeout = (fn, ms) => {
          const id = origSet(() => { activeTimers.delete(id); fn(); }, ms);
          if (ms >= 2000) activeTimers.add(id);
          return id;
        };
        w.clearTimeout = (id) => { activeTimers.delete(id); return origClear(id); };
        w.Audio = class {
          play() {
            const ctrl = { el: this, finish: (ok) => { if (ok) this.onended && this.onended(); else this.onerror && this.onerror(); } };
            audioControls.push(ctrl);
            return Promise.resolve();
          }
          pause() { this.paused = true; }
        };
        w.speechSynthesis = {
          speaking: false,
          onvoiceschanged: null,
          getVoices: () => [{ lang: 'en-US', localService: true, name: 'Local' }],
          cancel() { this.speaking = false; cancels.push(Date.now()); },
          speak(u) { if (u.text) { this.speaking = true; spoken.push(u); } },
          addEventListener() {},
        };
        w.SpeechSynthesisUtterance = function (text) { this.text = text; this.rate = 1; };
      },
    });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    d.getElementById('learner-name').value = 'Owl1';
    d.querySelector('#app button.primary').click();

    // 1. Click Read aloud (plays askAudio clip), then immediately click Hear it on choice 1 (TTS):
    //    askAudio is stopped and when its old promise resolves, say(question) MUST NOT fire over choice 1!
    d.querySelector('[data-read-aloud="question"]').click();
    expect(audioControls.length).toBeGreaterThanOrEqual(1);
    const firstAudio = audioControls[audioControls.length - 1];
    d.querySelector('[data-read-aloud="choice-1"]').click();
    expect(firstAudio.el.paused).toBe(true);
    expect(spoken).toHaveLength(1);
    const choiceText = spoken[0].text;
    firstAudio.finish(true);
    await new Promise((r) => setTimeout(r, 15));
    expect(spoken.map((u) => u.text)).toEqual([choiceText]);

    // 2. Pressing Escape silences speechSynthesis AND clears the long say() fallback timer.
    expect(activeTimers.size).toBeGreaterThan(0);
    const cancelsBefore = cancels.length;
    d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(cancels.length).toBeGreaterThan(cancelsBefore);
    expect(activeTimers.size).toBe(0);

    // 3. Clicking toolbar Stop audio silences active speechSynthesis too.
    d.querySelector('[data-read-aloud="choice-2"]').click();
    expect(w.speechSynthesis.speaking).toBe(true);
    const stopBtn = d.querySelector('[data-player-stop-audio]');
    expect(stopBtn).toBeTruthy();
    stopBtn.hidden = false;
    const cancelsBeforeBtn = cancels.length;
    stopBtn.click();
    expect(cancels.length).toBeGreaterThan(cancelsBeforeBtn);
    expect(activeTimers.size).toBe(0);

    // 4. Moving to next screen clears stale onvoiceschanged and unbinds old Stop audio listener.
    expect(typeof w.speechSynthesis.onvoiceschanged).toBe('function');
    const prevOnVoices = w.speechSynthesis.onvoiceschanged;
    const firstItem = lesson.blocks[0].items[0];
    const rightIdx = firstItem.choices.findIndex((c) => c.text === firstItem.answer) + 1;
    fakeNow += 500;
    d.querySelector('[data-choice="' + rightIdx + '"]').click();
    d.querySelector('[data-next]').click();
    expect(w.speechSynthesis.onvoiceschanged).not.toBe(prevOnVoices);
    // Calling old listener on detached screen does not throw or corrupt state.
    expect(() => prevOnVoices()).not.toThrow();
  });

  it('in Check mode: exposes speedRate and toolPref, and Stop the check (pause) halts Hear all and speechSynthesis', async () => {
    const sylMap = { habitat: ['hab', 'i', 'tat'], predator: ['pred', 'a', 'tor'], camouflage: ['cam', 'ou', 'flage'] };
    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat, camouflage').words, bank });
    const lesson = V.lessonFromVocab({
      loader: TH, rows, types: ['meaning'], mode: 'check',
      syllables: (w) => sylMap[w] || null,
    });
    const built = V.buildVocabPacket({ lesson, loader: TH, rows, bank });

    const spoken = [];
    const cancels = [];
    let fakeNow = 1000;
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/vcheck.html',
      beforeParse(w) {
        Object.defineProperty(w.performance, 'now', { configurable: true, value: () => fakeNow });
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.speechSynthesis = {
          speaking: false,
          getVoices: () => [{ lang: 'en-US', localService: true, name: 'Local' }],
          cancel() { this.speaking = false; cancels.push(Date.now()); },
          speak(u) { if (u.text) { this.speaking = true; spoken.push(u); } },
          addEventListener() {},
        };
        w.SpeechSynthesisUtterance = function (text) { this.text = text; this.rate = 1; };
      },
    });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    d.getElementById('learner-name').value = 'Owl1';
    d.querySelector('#app button.primary').click();
    // Practice sample item first: toggle Syllables on and advance.
    const sylBtn1 = d.querySelector('[data-vocab-syllables]');
    if (sylBtn1) {
      expect(sylBtn1.getAttribute('aria-pressed')).toBe('false');
      sylBtn1.click();
      expect(sylBtn1.getAttribute('aria-pressed')).toBe('true');
    }
    fakeNow += 500;
    d.querySelector('[data-choice="1"]').click();
    d.querySelector('[data-practice-next]').click();
    d.querySelector('[data-check-begin]').click();

    // Check item 1: Syllables preference persisted via ctx.toolPref!
    const sylBtn2 = d.querySelector('[data-vocab-syllables]');
    if (sylBtn1 && sylBtn2) expect(sylBtn2.getAttribute('aria-pressed')).toBe('true');

    // Change speed tool to Faster (speed-3 => 1.25x -> ~1.22 rate) and verify TTS utterance picks it up via ctx.speedRate!
    const fasterBtn = d.querySelector('[data-tool="speed-3"]');
    expect(fasterBtn).toBeTruthy();
    fasterBtn.click();
    d.querySelector('[data-read-aloud="question"]').click();
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken[spoken.length - 1].rate).toBeGreaterThan(1.1);

    // Start Hear all, then click Stop the check -> immediately halts Hear all and cancels speechSynthesis!
    const hearBtn = d.querySelector('[data-hear-all]');
    expect(hearBtn).toBeTruthy();
    hearBtn.click();
    expect(d.querySelector('[data-hearing]')).toBeTruthy();
    const cancelsBeforePause = cancels.length;
    d.querySelector('[data-stop]').click();
    expect(d.querySelector('[data-stop-confirm]').hidden).toBe(false);
    expect(d.querySelector('[data-hearing]')).toBeNull();
    expect(cancels.length).toBeGreaterThan(cancelsBeforePause);
    expect(w.speechSynthesis.speaking).toBe(false);
  });
});

describe('F3: image/credit integrity, art-less diagrams, AGPL-3.0 credit, pic.credit forwarding & self-naming diagram guard', () => {
  it('leaves zero orphaned SVGs or false Mulberry/OpenMoji credits when picture items are dropped', () => {
    const rows = V.draftRows({ words: V.parseWords('bat, nest, owl, cat, habitat').words, bank, pictures: symbols });
    // Force every picture item to fail image lookup on the 4th choice by using a partial symbol store in lessonFromVocab.
    const partialPics = {
      get: (w) => (V.keyOf(w) === 'owl' ? null : symbols.get(w)),
    };
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'picture'], mode: 'practice', pictures: partialPics, art });
    // Every picture item that needed owl was dropped; any surviving picture items must match lesson.images 1:1.
    const referenced = new Set();
    lesson.blocks.forEach((b) => b.items.forEach((it) => {
      if (it.image) referenced.add(it.image);
      (it.choices || []).forEach((c) => { if (c && c.image) referenced.add(c.image); });
    }));
    expect(Object.keys(lesson.images).sort()).toEqual([...referenced].sort());

    // Now drop ALL picture items (every 4th distractor returns null): 0 images and 0 Mulberry/OpenMoji credits!
    const dropAllPics = {
      get: (w) => (['bat', 'nest'].includes(V.keyOf(w)) ? symbols.get(w) : null),
    };
    const lessonNone = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'picture'], mode: 'practice', pictures: dropAllPics, art });
    expect(lessonNone.blocks.map((b) => b.activity)).toEqual(['vocab_meaning']);
    expect(lessonNone.images).toEqual({});
    const builtNone = V.buildVocabPacket({ lesson: lessonNone, loader: TH, rows, bank });
    expect(builtNone.manifest.attributions.join('\n')).not.toMatch(/Mulberry|OpenMoji/);
    expect(builtNone.manifest.notices || []).toEqual([]);
  });

  it('allows safe concept diagrams without art while still rejecting unsafe SVGs, credits AGPL-3.0, and blocks self-naming diagrams', () => {
    const cleanDiagramMatcher = {
      matchWord: ({ word }) => {
        const k = V.keyOf(word);
        if (k === 'evil') return { set: 'diagram', matchedKey: 'evil', svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' };
        if (k === 'north') return matcher.getDiagram('north');
        if (k === 'equator') return matcher.getDiagram('equator');
        if (k === 'divisor') return matcher.getDiagram('divisor');
        if (k === 'addend') return matcher.getDiagram('addend');
        if (k === 'magnet') return matcher.getDiagram('magnet');
        return matcher.getDiagram(word);
      },
      getDiagram: (word) => {
        const k = V.keyOf(word);
        if (k === 'evil') return { set: 'diagram', matchedKey: 'evil', svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' };
        return matcher.getDiagram(word);
      },
    };

    // 1. Self-naming diagrams (north, equator, divisor, addend, magnet) and unsafe SVG (evil) are rejected in draftRows even without art.
    const guardedRows = V.draftRows({
      words: V.parseWords('north, equator, divisor, addend, magnet, evil, habitat, cell, atom, ecosystem').words,
      bank, diagrams: true, matcher: cleanDiagramMatcher,
    });
    for (const leaked of ['north', 'equator', 'divisor', 'addend', 'magnet', 'evil']) {
      expect(guardedRows.find((r) => r.key === leaked).picture, leaked).toBe('');
    }
    for (const clean of ['habitat', 'cell', 'atom', 'ecosystem']) {
      expect(guardedRows.find((r) => r.key === clean).pictureSource, clean).toBe('diagram');
    }

    // 2. lessonFromVocab + buildVocabPacket work WITHOUT art for diagrams and credit AGPL-3.0 cleanly.
    const diagRows = V.draftRows({
      words: V.parseWords('habitat, cell, atom, ecosystem, erosion').words,
      bank, diagrams: true, matcher,
    });
    const diagLesson = V.lessonFromVocab({ loader: TH, rows: diagRows, types: ['picture', 'picword'], mode: 'practice', diagrams: true, matcher });
    expect(diagLesson.blocks.map((b) => b.activity)).toEqual(['vocab_picture', 'vocab_picture_word']);
    const diagBuilt = V.buildVocabPacket({ lesson: diagLesson, loader: TH, rows: diagRows, bank, diagrams: true });
    const creditsText = diagBuilt.manifest.attributions.join('\n');
    expect(creditsText).toContain('AlloFlow Curriculum Diagrams (AGPL-3.0)');
    expect(creditsText).not.toMatch(/https?:\/\//i);
    const rep = verify.verifyPacket(diagBuilt.html);
    expect([rep.ok, rep.result, rep.script.verdict]).toEqual([true, 'closed', 'agree']);
    expect(rep.counts).toMatchObject({ notExpected: 0, look: 0 });
  });

  it('forwards pic.credit in packets-vocab.js and formats non-own custom picture credits safely without URL schemes', () => {
    expect(read('packets-vocab.js')).toContain('customPicture: { dataUri: pic.dataUri, credit: pic.credit }');
    const edits = {
      words: {
        habitat: {
          customPicture: {
            dataUri: CLEAN_SVG_URI,
            credit: {
              title: 'Forest Meadow',
              author: 'Alex Rivera',
              license: 'CC BY-SA 4.0',
              licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
              source: 'Wikimedia Commons',
              sourceUrl: 'https://commons.wikimedia.org/wiki/File:Forest_Meadow.svg',
              resized: true,
            },
          },
        },
        cell: { customPicture: { dataUri: CLEAN_SVG_URI, credit: { own: true } } },
      },
    };
    const rows = V.draftRows({ words: V.parseWords('habitat, cell, bat, nest, owl').words, bank, edits, pictures: symbols, art });
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['picword'], mode: 'practice', pictures: symbols, art });
    const built = V.buildVocabPacket({ lesson, loader: TH, rows, bank });
    const credits = built.manifest.attributions.join('\n');
    expect(credits).toContain('Picture for habitat: "Forest Meadow" by Alex Rivera, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0/), from Wikimedia Commons (commons.wikimedia.org/wiki/File:Forest_Meadow.svg), made smaller.');
    expect(credits).toContain('Pictures added by the teacher: cell.');
    expect(credits).not.toContain('Pictures added by the teacher: habitat');
    expect(credits).not.toMatch(/https?:\/\//i);
    expect(built.manifest.notices.some((n) => n.id === 'share-alike')).toBe(true);
    const rep = verify.verifyPacket(built.html);
    expect([rep.ok, rep.result, rep.script.verdict]).toEqual([true, 'closed', 'agree']);
    expect(rep.counts).toMatchObject({ notExpected: 0, look: 0 });
  });
});

describe('F4: packets_voice_engine CSP-safe data: decode, AbortSignal, WAV validation, script latch & catalog timeout', () => {
  function bootEngine(overrides = {}) {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { runScripts: 'outside-only', url: 'https://packets.test/packets-voice.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    const fetches = [];
    const scripts = [];
    w.fetch = overrides.fetch || (async (url, opts) => {
      fetches.push({ url: String(url), opts });
      if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1 }) };
      if (String(url).startsWith('blob:')) return { ok: true, arrayBuffer: async () => wavBytes(250).buffer };
      return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
    });
    const realAppend = w.HTMLHeadElement.prototype.appendChild;
    d.head.appendChild = function (node) {
      if (node && node.tagName === 'SCRIPT') {
        const src = node.getAttribute('src');
        scripts.push({ src, node });
        if (overrides.onScript) {
          overrides.onScript(src, node, w);
          return node;
        }
        if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
        if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (cat, target) => { target.__alloCreateVerifiedWorker = () => {}; };
        if (src === 'kokoro_tts_loader.js') w._kokoroTTS = overrides.kokoro || {
          init: async () => true,
          speak: async () => WAV_URI,
        };
        setTimeout(() => node.onload && node.onload(), 0);
        return node;
      }
      return realAppend.call(this, node);
    };
    w.eval(read('packets_voice_engine.js'));
    return { w, d, eng: w.AlloPacketVoiceEngine, fetches, scripts };
  }

  it('decodes data: URLs without calling fetch, rejects 0-data WAVs, handles fake AbortSignal, aborts/times out hung speak(), and recovers from disposed _kokoroTTS', async () => {
    const src = read('packets_voice_engine.js');
    expect(Buffer.byteLength(src, 'utf8')).toBeLessThan(10000);
    expect(src).not.toMatch(/https?:\/\//);

    // 1. data: URL decoded via fromDataUri with zero win.fetch calls after catalog!
    let speakResult = WAV_URI;
    let speakHang = false;
    const { w, eng, fetches } = bootEngine({
      kokoro: {
        init: async () => true,
        speak: async () => (speakHang ? new Promise(() => {}) : speakResult),
      },
    });
    await eng.get();
    expect(fetches.map((f) => f.url)).toEqual(['engine_runtime_integrity.json']);
    const dataWav = await eng.speak('cat', 'af_heart', { word: true });
    expect(dataWav.length).toBe(wavBytes(250).length);
    expect(fetches).toHaveLength(1); // NO fetch() on data: URI!

    // 2. Fake fallback signal { aborted: false } is NOT passed to fetch (no TypeError), and pre-aborted rejects with AbortError.
    speakResult = 'blob:voice/ok';
    const fakeSig = { aborted: false };
    const blobWav = await eng.speak('dog', 'af_heart', { signal: fakeSig });
    expect(blobWav.length).toBe(wavBytes(250).length);
    expect(fetches[fetches.length - 1].opts).toBeUndefined();

    await expect(eng.speak('dog', 'af_heart', { signal: { aborted: true } })).rejects.toMatchObject({ name: 'AbortError' });

    // 3. Real AbortController aborts a hung WASM worker immediately; timeoutMs rejects hung worker cleanly.
    speakHang = true;
    const ac = new w.AbortController();
    const pendingAbort = eng.speak('hang', 'af_heart', { signal: ac.signal });
    setTimeout(() => ac.abort(), 15);
    await expect(pendingAbort).rejects.toMatchObject({ name: 'AbortError' });

    await expect(eng.speak('slow', 'af_heart', { timeoutMs: 30 })).rejects.toMatchObject({ code: 'timeout' });
    speakHang = false;

    // 4. 44-byte header-only WAV (data size 0) is rejected with code 'bad_sound'.
    const emptyWav = wavBytes(0);
    speakResult = 'data:audio/wav;base64,' + Buffer.from(emptyWav).toString('base64');
    await expect(eng.speak('empty', 'af_heart')).rejects.toMatchObject({ code: 'bad_sound' });

    // 5. Disposed _kokoroTTS (ready === false) makes isReady() false and allows get() to re-initialize cleanly.
    let reinitCount = 0;
    w._kokoroTTS = {
      ready: false,
      init: async () => { reinitCount++; w._kokoroTTS.ready = true; return true; },
      speak: async () => WAV_URI,
    };
    expect(eng.isReady()).toBe(false);
    await eng.get();
    expect(reinitCount).toBe(1);
    expect(eng.isReady()).toBe(true);
  });

  it('does not latch addScript when expected global is missing and maps catalog timeout abort to calm message', async () => {
    let attempts = 0;
    const { eng } = bootEngine({
      onScript(src, node, w) {
        if (src === 'packets_audio_kit.js') {
          attempts++;
          if (attempts >= 2) w.eval(read('packets_audio_kit.js'));
        }
        if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (cat, target) => { target.__alloCreateVerifiedWorker = () => {}; };
        if (src === 'kokoro_tts_loader.js') w._kokoroTTS = { init: async () => true, speak: async () => WAV_URI };
        setTimeout(() => node.onload && node.onload(), 0);
      },
    });
    // First get() fails because packets_audio_kit.js did not define AlloPacketAudioKit
    await expect(eng.get()).rejects.toThrow(/did not start: packets_audio_kit\.js/);
    // Second get() retries cleanly because added['packets_audio_kit.js'] was NOT latched!
    await expect(eng.get()).resolves.toBe(true);
    expect(attempts).toBe(2);

    // Catalog timeout maps AbortError to calm timeout message via win.setTimeout.
    const { w: w2, eng: eng2 } = bootEngine({
      fetch: (url, opts) => new Promise((_, reject) => {
        if (opts && opts.signal) opts.signal.addEventListener('abort', () => {
          const e = new Error('aborted'); e.name = 'AbortError'; reject(e);
        });
      }),
    });
    const origSetT = w2.setTimeout.bind(w2);
    w2.setTimeout = (fn, ms) => origSetT(fn, ms === 15000 ? 15 : ms);
    await expect(eng2.get()).rejects.toThrow('The list of voice files timed out.');
  });
});

describe('F5: packets_audio_kit WAV bounds/kbps/MIME/timeout and Safari portableAudio & studentMic leaks', () => {
  function loadAudioKit(extraWin = {}) {
    const scripts = [];
    const doc = extraWin.document || {
      head: { appendChild: (el) => { scripts.push(el); el.parentNode = { removeChild: () => {} }; return el; } },
      documentElement: { appendChild: (el) => { scripts.push(el); el.parentNode = { removeChild: () => {} }; return el; } },
      createElement: () => ({}),
    };
    const win = Object.assign({
      document: doc,
      btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
      atob: (s) => Buffer.from(s, 'base64').toString('binary'),
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    }, extraWin);
    vm.runInNewContext(read('packets_audio_kit.js'), { window: win, DataView, Uint8Array, Int16Array, String, Number, Math, Promise, isFinite });
    return { kit: win.AlloPacketAudioKit, win, scripts };
  }

  it('rejects truncated fmt chunks and zero WAV fields, clamps wavToMp3 kbps, accepts MIME params in fromDataUri, and cleans up getMp3 timeout', async () => {
    const { kit, win } = loadAudioKit();
    // Corrupt 4-byte fmt chunk followed by data chunk MUST return null (not garbage rate 1635017060)
    const corrupt = Buffer.alloc(36);
    corrupt.write('RIFF', 0); corrupt.writeUInt32LE(28, 4); corrupt.write('WAVE', 8);
    corrupt.write('fmt ', 12); corrupt.writeUInt32LE(4, 16);
    corrupt.writeUInt16LE(1, 20); corrupt.writeUInt16LE(1, 22);
    corrupt.write('data', 24); corrupt.writeUInt32LE(4, 28);
    expect(kit.wavInfo(new Uint8Array(corrupt))).toBeNull();
    expect(kit.wavMs(new Uint8Array(corrupt))).toBe(0);

    // Zero sample rate / byteRate / channels rejected
    const zeroRate = Buffer.from(wavBytes(250));
    zeroRate.writeUInt32LE(0, 24);
    expect(kit.wavInfo(new Uint8Array(zeroRate))).toBeNull();

    // Valid WAV works and kbps is clamped to 8..320 (default 64)
    const seenKbps = [];
    win.lamejs = {
      Mp3Encoder: class {
        constructor(_ch, _rate, kbps) { seenKbps.push(kbps); }
        encodeBuffer() { return new Uint8Array([1, 2]); }
        flush() { return new Uint8Array([3]); }
      },
    };
    const good = wavBytes(250);
    expect(kit.wavToMp3(good, undefined)).toBeInstanceOf(Uint8Array);
    expect(kit.wavToMp3(good, -10)).toBeInstanceOf(Uint8Array);
    expect(kit.wavToMp3(good, 2)).toBeInstanceOf(Uint8Array);
    expect(kit.wavToMp3(good, 999)).toBeInstanceOf(Uint8Array);
    expect(kit.wavToMp3(good, 48)).toBeInstanceOf(Uint8Array);
    expect(seenKbps).toEqual([64, 64, 8, 320, 48]);

    // fromDataUri accepts MIME parameters before ;base64,
    const b64 = Buffer.from('hello').toString('base64');
    const decoded = kit.fromDataUri('data:audio/wav;codecs=1;charset=utf-8;base64,' + b64);
    expect(Buffer.from(decoded).toString('utf8')).toBe('hello');

    // getMp3 timeout clears onload/onerror and works when doc.head is absent (uses documentElement)
    const docElScripts = [];
    const { kit: kit2 } = loadAudioKit({
      document: {
        head: null,
        documentElement: { appendChild: (el) => { docElScripts.push(el); el.parentNode = { removeChild: () => {} }; return el; } },
        createElement: () => ({}),
      },
      setTimeout: (fn) => globalThis.setTimeout(fn, 15),
    });
    const ok = await kit2.getMp3();
    expect(ok).toBe(false);
    expect(docElScripts).toHaveLength(1);
    expect(docElScripts[0].onload).toBeNull();
    expect(docElScripts[0].onerror).toBeNull();
  });

  it('portableAudio sets offline.oncomplete before startRendering() and takeHomeStudentMic stops tracks on start() throw or onerror', async () => {
    // Safari race test: OfflineAudioContext fires oncomplete SYNCHRONOUSLY inside startRendering()
    const lesson = { audio: { a1: 'data:audio/webm;base64,' + Buffer.from('abc').toString('base64') } };
    class SyncAudioCtx {
      decodeAudioData(_buf, ok) { ok({ duration: 0.1 }); }
      close() { return Promise.resolve(); }
    }
    class SyncOfflineCtx {
      constructor(_ch, len) { this.len = len; this.destination = {}; }
      createBufferSource() { return { connect() {}, start() {} }; }
      startRendering() {
        if (typeof this.oncomplete === 'function') {
          this.oncomplete({ renderedBuffer: { getChannelData: () => new Float32Array(this.len) } });
        }
        return undefined; // legacy Safari returns undefined, relies strictly on oncomplete!
      }
    }
    const report = await TH.portableAudio(lesson, { AudioContext: SyncAudioCtx, OfflineAudioContext: SyncOfflineCtx });
    expect(report.converted).toBe(1);
    expect(lesson.audio.a1.startsWith('data:audio/wav;base64,')).toBe(true);

    // takeHomeStudentMic track cleanup when recorder.start() throws and when recorder.onerror fires
    const RA = require('../packet_read_along_builder.js');
    const made = RA.lessonFromReadAlong({ loader: TH, text: 'The fox ran.', clips: {}, studentMic: true });
    const built = RA.buildReadAlongPacket({ made, loader: TH });
    let trackStops = 0;
    let mode = 'throw';
    let lastRec = null;
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/ra.html',
      beforeParse(w) {
        w.navigator.mediaDevices = {
          getUserMedia: async () => ({ getTracks: () => [{ stop: () => { trackStops++; } }] }),
        };
        w.MediaRecorder = class {
          constructor() { this.state = 'inactive'; lastRec = this; }
          start() {
            if (mode === 'throw') throw new Error('codec unsupported');
            this.state = 'recording';
          }
          stop() { this.state = 'inactive'; }
        };
      },
    });
    opened.push(dom.window);
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();
    await new Promise((r) => setTimeout(r, 20));
    const recBtn = d.querySelector('[data-student-rec]');
    expect(recBtn).toBeTruthy();

    // Case 1: recorder.start() throws -> tracks stopped immediately!
    recBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(trackStops).toBe(1);

    // Case 2: recorder.onerror fires mid-recording -> tracks stopped immediately!
    mode = 'error';
    recBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(lastRec && typeof lastRec.onerror).toBe('function');
    lastRec.onerror(new Error('device lost'));
    expect(trackStops).toBe(2);
  });
});

describe('F6: quantity_discrimination validation, click guard, aria-labelledby & high-contrast/mobile CSS', () => {
  it('rejects booleans, whitespace, arrays, and empty answer in prepare() while preserving exact valid numbers', () => {
    const QD = TH.CHECK_ADAPTERS.quantity_discrimination;
    expect(QD.prepare({ left: true, right: 5 }).missing).toEqual(['two whole numbers']);
    expect(QD.prepare({ left: false, right: 5 }).missing).toEqual(['two whole numbers']);
    expect(QD.prepare({ left: '   ', right: 5 }).missing).toEqual(['two whole numbers']);
    expect(QD.prepare({ left: [], right: 5 }).missing).toEqual(['two whole numbers']);
    expect(QD.prepare({ left: -3, right: 0, answer: '' }).missing).toEqual(['an answer that is the bigger number']);
    expect(QD.prepare({ left: -3, right: 0, answer: '   ' }).missing).toEqual(['an answer that is the bigger number']);
    expect(QD.prepare({ left: -3, right: 0, answer: false }).missing).toEqual(['an answer that is the bigger number']);
    expect(QD.prepare({ left: '12', right: 7 }).item).toEqual({ word: '12 or 7', left: 12, right: 7, answer: '12' });
    expect(QD.prepare({ left: -3, right: 0, answer: '0' }).item).toEqual({ word: '-3 or 0', left: -3, right: 0, answer: '0' });
  });

  it('links ul.pair via aria-labelledby, guards disabled/done clicks, keeps exact button textContent, and ships high-contrast + 480px CSS', () => {
    const bankText = read('psychometric_math_probes.json');
    const BANK = JSON.parse(bankText.charCodeAt(0) === 0xFEFF ? bankText.slice(1) : bankText);
    const built = PC.buildCheckPacket({ lesson: PC.lessonFromMathForm({ bank: BANK, measure: 'quantity_discrimination', grade: 'K', form: 'A' }), loader: TH });
    expect(built.html).toContain('.pair button.right{border-color:var(--ok);background:var(--ok-bg);opacity:1;position:relative}');
    expect(built.html).toContain('.pair button.right::after{content:"\\2713"');
    expect(built.html).toContain('@media (forced-colors:active){.pair button.right{outline:4px solid Highlight}');
    expect(built.html).toContain('@media (max-width:480px){.pair{gap:14px}.pair button{min-width:min(132px,42vw);font-size:clamp(2rem,10vw,3rem)}}');

    let fakeNow = 1000;
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/qd.html',
      beforeParse(w) { Object.defineProperty(w.performance, 'now', { configurable: true, value: () => fakeNow }); },
    });
    opened.push(dom.window);
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();
    const pair = d.querySelector('ul.pair');
    const lblId = pair.getAttribute('aria-labelledby');
    expect(lblId).toBeTruthy();
    expect(d.getElementById(lblId).textContent).toBe('Which number is bigger?');
    const btns = [...pair.querySelectorAll('button')];
    expect(btns.map((b) => b.textContent)).toEqual(btns.map((b) => b.getAttribute('data-choice')));
    fakeNow += 400;
    btns[0].click();
    expect(btns.every((b) => b.getAttribute('aria-disabled') === 'true')).toBe(true);
    // Button textContent stays pure numeric even when .right is applied!
    expect(btns.map((b) => b.textContent)).toEqual(btns.map((b) => b.getAttribute('data-choice')));
  });
});

describe('F7: takeHomeVocab mobile wrap, responsive square picture aspect & vocab_picture_word Check sample revealed alt', () => {
  it('uses mobile-safe choice button styles, square responsive picture styles, and reveals the actual word as alt on Check sample', () => {
    const rows = V.draftRows({ words: V.parseWords('bat, nest, owl, hunt, habitat, alien, cat').words, bank, pictures: symbols });
    const lesson = V.lessonFromVocab({ loader: TH, rows, types: ['picword'], mode: 'check', pictures: symbols, art });
    const built = V.buildVocabPacket({ lesson, loader: TH, rows, bank });
    let fakeNow = 1000;
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/piccheck.html',
      beforeParse(w) {
        Object.defineProperty(w.performance, 'now', { configurable: true, value: () => fakeNow });
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.speechSynthesis = { getVoices: () => [{ lang: 'en-US', localService: true, name: 'Local' }], cancel() {}, speak() {}, addEventListener() {} };
        w.SpeechSynthesisUtterance = function (t) { this.text = t; };
      },
    });
    opened.push(dom.window);
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Owl1';
    d.querySelector('#app button.primary').click();

    // Practice sample item for vocab_picture_word:
    const img = d.querySelector('#app img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('style')).toContain('width:min(100%,180px)');
    expect(img.getAttribute('style')).toContain('aspect-ratio:1/1');
    expect(img.getAttribute('style')).toContain('height:auto');

    const choiceBtn = d.querySelector('[data-choice="1"]');
    expect(choiceBtn.getAttribute('style')).toContain('flex:1 1 200px');
    expect(choiceBtn.getAttribute('style')).toContain('min-width:0');
    expect(choiceBtn.getAttribute('style')).toContain('overflow-wrap:anywhere');

    fakeNow += 500;
    choiceBtn.click();
    // Revealed alt must be the real answer word ('dog' or 'cat'), NEVER 'Sample picture'!
    expect(img.getAttribute('alt')).not.toBe('Sample picture');
    expect(['dog', 'cat']).toContain(img.getAttribute('alt'));
  });
});

describe('F8: blankSentence & hasWord contraction, hyphen compound & curly apostrophe handling', () => {
  it('skips contractions and hyphenated compounds, preserves possessives, and matches curly apostrophes', () => {
    // Contractions never blanked
    expect(V.blankSentence("You can't see it.", 'can').ask).toBe('');
    expect(V.blankSentence("I won't give up.", 'won').ask).toBe('');
    expect(V.blankSentence("I'll go home.", 'll').ask).toBe('');
    expect(V.blankSentence("She can't catch the can.", 'can').ask).toBe("She can't catch the ___.");

    // Hyphenated compounds never blanked
    expect(V.blankSentence('She flew a bat-shaped kite.', 'bat').ask).toBe('');
    expect(V.blankSentence('She flew a bat-shaped kite.', 'shaped').ask).toBe('');
    expect(V.blankSentence('The bat flew past a bat-shaped kite.', 'bat').ask).toBe('The ___ flew past a bat-shaped kite.');

    // Possessives preserved (both straight and curly apostrophe)
    expect(V.blankSentence("The bat's wings are wide.", 'bat').ask).toBe("The ___'s wings are wide.");
    expect(V.blankSentence('The bat\u2019s wings are wide.', 'bat').ask).toBe('The ___\u2019s wings are wide.');

    // Multi-word curly apostrophe matches normalized word
    const bird = V.blankSentence('A bird\u2019s eye view of the valley.', "bird's eye");
    expect(bird.ask).toBe('A ___ view of the valley.');
    expect(bird.answer).toBe("bird's eye");

    // hasWord (via wrongProblem) recognizes curly apostrophes too
    const row = { word: "bird's eye", key: "bird's eye", def: 'A view from high above' };
    expect(V.wrongProblem(row, { word: 'view', def: 'Like a bird\u2019s eye looking down' }, bank, [])).toContain('uses the word');
  });
});

describe('Hard byte-budget & isolation guardrails', () => {
  it('stays within bounded MC 5-A Check HTML, Vocab Practice HTML, voice engine (<10KB), and zero speechSynthesis in non-vocab checks', () => {
    const bankText = read('psychometric_math_probes.json');
    const BANK = JSON.parse(bankText.charCodeAt(0) === 0xFEFF ? bankText.slice(1) : bankText);
    const dirs = require('../packets_check_directions.js');
    const mcHtml = PC.buildCheckPacket({
      lesson: PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '5', form: 'A' }),
      loader: TH, directions: dirs, teacherCode: 'tulip-47',
    }).html;
    // Wave 8 Track A baseline was 223,899 B (<225 KB) before a concurrent session added ~6.4 KB to word_sounds_take_home_loader.js.
    expect(Buffer.byteLength(mcHtml, 'utf8')).toBeLessThan(235000);
    expect(mcHtml).not.toMatch(/speechSynthesis/);

    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat, adapt, camouflage, ancient').words, bank });
    const vLesson = V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word', 'blank'], mode: 'practice' });
    const vHtml = V.buildVocabPacket({ lesson: vLesson, loader: TH, rows, bank }).html;
    // Wave 8 Track A baseline was 185,613 B (<186 KB) before the concurrent loader edit.
    expect(Buffer.byteLength(vHtml, 'utf8')).toBeLessThan(196000);
    expect(verify.verifyPacket(vHtml).result).toBe('closed');

    expect(Buffer.byteLength(read('packets_voice_engine.js'), 'utf8')).toBeLessThan(10000);
    expect(TH._vocabChoice.toString()).toContain('v.localService === true');
  });
});
