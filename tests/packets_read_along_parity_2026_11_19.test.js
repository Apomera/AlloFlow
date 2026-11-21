// Read-Along <-> Immersive Reader Parity Tests (Waves 1-3, 2026-11-19):
//   Wave 1: One-page scroll mode (up to 120 sentences), editable custom page breaks (--- & Split/Join UI),
//           reopen round-trip, and auto-advance teacher voice recording.
//   Wave 2: Granular Voice speed (0.6x / 0.8x / 1.0x / 1.25x), 1-line & 3-line Reading focus,
//           deterministic zero-AI Parts of Speech highlights (combined cleanly with Syllables).
//   Wave 3: Opt-in local-only student voice recording inside saved offline Read-Along packets
//           (0 mic code when OFF; connect-src 'none' + honest manifest/verifier disclosure when ON).

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const RA = require('../packet_read_along_builder.js');
const VERIFY = require('../packets_verify_core.js');
const TABLE = require('../syllable_table_en.js');
const LOADER_SRC = read('word_sounds_take_home_loader.js');
const HTML = read('packets-read-along.html');
const JS = read('packets-read-along.js');
const ENGINE = read('packets_voice_engine.js');

function loadLoader() {
  const g = { crypto: webcrypto };
  g.window = g;
  new Function('window', LOADER_SRC).call(g, g);
  return g.AlloWordSoundsTakeHome;
}
const loader = loadLoader();
const sureSyl = (word) => { const f = TABLE.lookup(word); return f && !f.check ? f.parts : null; };
const mp3 = (text) => 'data:audio/mpeg;base64,' + Buffer.from('ID3' + text).toString('base64');
const clipsFor = (sentences) => Object.fromEntries(sentences.map((r) => [RA.clipKey(r.text), mp3(r.text)]));

async function openMakerPage() {
  const dom = new JSDOM(HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-read-along.html' });
  const w = dom.window, d = w.document;
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  const page = { w, d, dom, blobs: [] };
  w.URL.createObjectURL = (blob) => { page.blobs.push(blob); return 'blob:https://packets.test/' + page.blobs.length; };
  w.URL.revokeObjectURL = () => {};
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'lame.min.js') w.eval(read('lame.min.js'));
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.eval(LOADER_SRC);
  w.eval(read('packet_read_along_builder.js'));
  w.eval(read('syllable_table_en.js'));
  w.eval(ENGINE);
  w.eval(read('packets_verify_core.js'));
  w.eval(read('packets_reopen.js'));
  w.eval(read('packets_handoff.js'));
  w.eval(read('packets_zip.js'));
  w.eval(JS);
  page.$ = (id) => d.getElementById(id);
  page.until = async (test, what) => { for (let i = 0; i < 400; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 15)); } throw new Error('Timed out: ' + what); };
  page.type = (id, text) => { page.$(id).value = text; page.$(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  return page;
}

describe('Wave 1: One-page scroll, custom page breaks, reopen round-trip, and smooth teacher voice recording', () => {
  it('supports scroll mode up to 120 sentences, custom --- page breaks, and readBack round-trip', () => {
    const raw = 'First sentence. Second sentence.\n---\nThird sentence.\n\n---\n\nFourth sentence.';
    const split = RA.splitPassage(raw);
    expect(split.map((r) => r.text)).toEqual(['First sentence.', 'Second sentence.', 'Third sentence.', 'Fourth sentence.']);
    expect(split.map((r) => !!r.pageBreak)).toEqual([false, false, true, true]);

    expect(RA.pagesOf(split, { pageMode: 'scroll' }).map((p) => p.length)).toEqual([4]);
    expect(RA.pagesOf(split, { pageMode: 'custom' }).map((p) => p.length)).toEqual([2, 1, 1]);
    expect(RA.pagesOf(split, { pageMode: 'auto' }).map((p) => p.length)).toEqual([2, 1, 1]);

    // Full 120-sentence passage fits on 1 scrollable page in scroll mode.
    const big = Array.from({ length: 120 }, (_, i) => 'Line ' + (i + 1) + '.').join(' ');
    const bigMade = RA.lessonFromReadAlong({ loader, title: 'Long story', text: big, clips: {}, pageMode: 'scroll' });
    expect(bigMade.sentences).toBe(120);
    expect(bigMade.pages).toBe(1);
    expect(bigMade.pageMode).toBe('scroll');
    const bigBuilt = RA.buildReadAlongPacket({ made: bigMade, loader });
    expect(bigBuilt.manifest.readAlong.pageMode).toBe('scroll');
    const bigBack = RA.readBack(VERIFY.readParts(bigBuilt.html));
    expect(bigBack.ok).toBe(true);
    expect(bigBack.pageMode).toBe('scroll');
    expect(bigBack.sentences).toHaveLength(120);

    // Custom breaks round-trip cleanly with --- markers preserved.
    const customMade = RA.lessonFromReadAlong({ loader, title: 'Custom pages', text: raw, clips: clipsFor(split), pageMode: 'custom' });
    expect(customMade.pages).toBe(3);
    const customBuilt = RA.buildReadAlongPacket({ made: customMade, loader });
    expect(customBuilt.manifest.readAlong.pageMode).toBe('custom');
    const customBack = RA.readBack(VERIFY.readParts(customBuilt.html));
    expect(customBack.ok).toBe(true);
    expect(customBack.pageMode).toBe('custom');
    expect(customBack.text).toContain('---');
    expect(RA.pagesOf(RA.splitPassage(customBack.text), { pageMode: 'custom' }).map((p) => p.length)).toEqual([2, 1, 1]);
  });

  it('lets teachers switch to one-page scroll or Split/Join pages in Step 3 without losing recordings, and auto-advances mic focus', async () => {
    const page = await openMakerPage();
    let activeRecorder = null;
    try {
      page.w.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) };
      page.w.MediaRecorder = class {
        constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; activeRecorder = this; }
        start() { this.state = 'recording'; }
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) this.ondataavailable({ data: new page.w.Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' }) });
          if (this.onstop) this.onstop();
        }
      };
      page.w.OfflineAudioContext = class {
        decodeAudioData(_buf, ok) {
          const samples = new Float32Array(22050 * 0.3);
          for (let i = 0; i < samples.length; i++) samples[i] = 0.4 * Math.sin(i / 8);
          const decoded = { length: samples.length, numberOfChannels: 1, sampleRate: 22050, getChannelData: () => samples };
          if (ok) ok(decoded);
          return Promise.resolve(decoded);
        }
      };

      page.type('f-text', 'One. Two. Three. Four.');
      await page.until(() => page.d.querySelectorAll('#line-rows .voice-row').length === 4, '4 rows');
      expect(page.$('text-said').textContent).toBe('4 sentences, on 1 page of the file.');

      // Enable auto-advance teacher recording and record sentence 1 -> focus moves to sentence 2 Record button.
      page.$('auto-advance-rec').checked = true;
      page.d.querySelector('[data-record="1"]').click();
      await page.until(() => activeRecorder && activeRecorder.state === 'recording', 'recording 1');
      page.d.querySelector('[data-record="1"]').click();
      await page.until(() => /Ready to record sentence 2/.test(page.$('make-said').textContent), 'auto-advance prompt');
      expect(page.d.activeElement && page.d.activeElement.getAttribute('data-record')).toBe('2');

      // Click Split page before sentence 3 -> switches to custom mode, 2 pages, keeps sentence 1 recording!
      const splitBtn = page.d.querySelector('[data-split-page="2"]');
      expect(splitBtn).toBeTruthy();
      splitBtn.click();
      expect(page.$('f-page-mode').value).toBe('custom');
      expect(page.$('text-said').textContent).toBe('4 sentences, on 2 pages of the file.');
      expect(page.$('f-text').value).toContain('---');
      expect(page.w.AlloPacketReadAlongPage.state.clips['One.']).toBeTruthy();

      // Join page 2 back with page 1 -> back to 1 page, still keeps recording.
      const joinBtn = page.d.querySelector('[data-join-page="2"]');
      expect(joinBtn).toBeTruthy();
      joinBtn.click();
      expect(page.$('text-said').textContent).toBe('4 sentences, on 1 page of the file.');
      expect(page.w.AlloPacketReadAlongPage.state.clips['One.']).toBeTruthy();

      // Switch to scroll mode -> shows one-page scroll header.
      page.$('f-page-mode').value = 'scroll';
      page.$('f-page-mode').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.d.querySelector('[data-page-header="1"]').textContent).toContain('All on one page (scroll down)');
    } finally { page.dom.window.close(); }
  }, 60000);
});

describe('Wave 2: Granular Voice speed, 1-line & 3-line Reading focus, and zero-AI Parts of speech', () => {
  it('supports Very slow (0.6x), Slower (0.8x), Normal (1.0x), Faster (1.25x), 3-line Reading focus, and POS + Syllables together', async () => {
    const text = 'The kite sailed quickly over the tall trees. Mia smiled happily all afternoon.';
    const sentences = RA.splitPassage(text);
    const tagged = RA.posText(sentences[0].text);
    expect(tagged).toContain(':n');
    expect(tagged).toContain(':v');
    expect(tagged).toContain(':a');
    expect(tagged).toContain(':j');

    // Adapter rejects malformed/injected pos strings.
    const badPos = loader.CHECK_ADAPTERS.read_along.prepare({ lines: [{ text: 'Hello world.', audio: '', pos: '0:n<script>' }] });
    expect(badPos.item.lines[0].pos).toBeUndefined();

    const made = RA.lessonFromReadAlong({ loader, title: 'Kite POS', sentences, clips: clipsFor(sentences), syllables: sureSyl, partsOfSpeech: true });
    expect(made.partsOfSpeech && made.partsOfSpeech.sentences).toBe(2);
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(built.manifest.readAlong.sentencesWithPos).toBe(2);
    expect(JSON.stringify(built.manifest.attributions)).toContain('Parts of speech: tagged with a built-in word list and grammar rules');
    expect(RA.readBack(VERIFY.readParts(built.html)).partsOfSpeech).toBe(true);

    const played = [];
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/pos.html',
      beforeParse(w) {
        w.Audio = class {
          constructor() { this.playbackRate = 1; this.preservesPitch = false; }
          set src(v) { this._src = v; }
          get src() { return this._src; }
          play() { played.push({ rate: this.playbackRate, pitch: this.preservesPitch }); setTimeout(() => { if (this.onended) this.onended(); }, 5); return Promise.resolve(); }
          pause() {}
        };
      },
    });
    const w = dom.window, d = w.document;
    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out: ' + what); };
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-pos]'), 'pos button');

      // Toggle Parts of speech ON + Syllables ON together -> both work, screen reader aria-label stays plain!
      const posBtn = d.querySelector('[data-read-along-pos]');
      const sylBtn = d.querySelector('[data-read-along-syllables]');
      const legend = d.querySelector('[data-read-along-pos-legend]');
      expect(legend.hidden).toBe(true);
      posBtn.click();
      expect(posBtn.getAttribute('aria-pressed')).toBe('true');
      expect(legend.hidden).toBe(false);
      expect(d.querySelectorAll('[data-read-along-line="1"] [data-pos]').length).toBeGreaterThanOrEqual(4);
      sylBtn.click();
      const line1 = d.querySelector('[data-read-along-line="1"]');
      expect(line1.textContent).toContain('o·ver');
      expect(line1.getAttribute('aria-label')).toBe(sentences[0].text);
      expect(line1.querySelectorAll('[data-pos]').length).toBeGreaterThanOrEqual(4);

      // Granular Voice speeds: Very slow (0.6x) and Faster (1.25x).
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="speed-2"]').click();
      line1.click();
      await until(() => played.length === 1, '0.6x played');
      expect(played[0]).toEqual({ rate: 0.6, pitch: true });

      d.querySelector('[data-tool="speed-3"]').click();
      line1.click();
      await until(() => played.length === 2, '1.25x played');
      expect(played[1]).toEqual({ rate: 1.25, pitch: true });

      // Reading focus: 1 line vs 3 lines height check.
      const readBox = d.querySelector('[data-read]');
      readBox.getBoundingClientRect = () => ({ top: 0, left: 0, width: 320, height: 200, bottom: 200, right: 320 });
      const origRange = d.createRange.bind(d);
      d.createRange = () => {
        const r = origRange();
        r.getClientRects = () => [
          { top: 10, bottom: 34, left: 0, right: 300, width: 300, height: 24 },
          { top: 44, bottom: 68, left: 0, right: 300, width: 300, height: 24 },
          { top: 78, bottom: 102, left: 0, right: 300, width: 300, height: 24 },
        ];
        return r;
      };
      d.querySelector('[data-tool="focus-1"]').click();
      const h1 = parseInt(readBox.querySelector('.lt-line').style.height, 10);
      d.querySelector('[data-tool="focus-2"]').click();
      const h3 = parseInt(readBox.querySelector('.lt-line').style.height, 10);
      expect(h3).toBeGreaterThan(h1 + 20);
    } finally { w.close(); }
  }, 60000);
});

describe('Wave 3: Opt-in local-only student voice recording inside saved Read-Along packets', () => {
  it('emits ZERO microphone code by default, and when opted in passes verifier with connect-src none and click-gated local playback', async () => {
    const sentences = RA.splitPassage('The fox ran fast. It hid in the grass.');
    const clips = clipsFor(sentences);

    // 1. Default (OFF): zero getUserMedia/MediaRecorder code, never includes microphone.
    const offBuilt = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'No Mic', sentences, clips }), loader });
    expect(offBuilt.html).not.toMatch(/getUserMedia|MediaRecorder|takeHomeStudentMic/);
    expect(offBuilt.manifest.never).toContain('microphone');
    expect(offBuilt.manifest.microphone).toBeUndefined();
    const offVerify = VERIFY.verifyPacket(offBuilt.html);
    expect(offVerify.counts.notExpected).toBe(0);

    // 2. Opt-in (ON): still connect-src 'none', honest manifest & About this file, passes verifier cleanly!
    const onMade = RA.lessonFromReadAlong({ loader, title: 'With Student Mic', sentences, clips, studentMic: true });
    const onBuilt = RA.buildReadAlongPacket({ made: onMade, loader });
    expect(onBuilt.manifest.csp).toContain("connect-src 'none'");
    expect(onBuilt.manifest.never).not.toContain('microphone');
    expect(onBuilt.manifest.never).toContain('camera');
    expect(onBuilt.manifest.microphone).toContain('Record my voice');
    expect(onBuilt.manifest.readAlong.studentMic).toBe(true);
    expect(onBuilt.html).toContain('uses the microphone only when you press Record my voice');
    expect(RA.readBack(VERIFY.readParts(onBuilt.html)).studentMic).toBe(true);

    const onVerify = VERIFY.verifyPacket(onBuilt.html);
    expect(onVerify.counts.notExpected).toBe(0);
    expect(onVerify.claims.find((c) => c.id === 'microphone')?.verdict).toBe('agree');
    expect(onVerify.claims.find((c) => c.id === 'never-camera')?.verdict).toBe('agree');

    // 3. In-packet student interaction: strictly click-gated, records -> plays back -> clears, never writes audio to localStorage.
    let micCalls = 0, trackStopped = 0, activeRec = null, playedStudentUrl = '', revokedUrls = [];
    const dom = new JSDOM(onBuilt.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/student-mic.html',
      beforeParse(w) {
        w.navigator.mediaDevices = {
          getUserMedia: async () => {
            micCalls++;
            return { getTracks: () => [{ stop() { trackStopped++; } }] };
          },
        };
        w.MediaRecorder = class {
          constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; activeRec = this; }
          start() { this.state = 'recording'; }
          stop() {
            this.state = 'inactive';
            if (this.ondataavailable) this.ondataavailable({ data: new w.Blob([new Uint8Array([9, 8, 7])], { type: 'audio/webm' }) });
            if (this.onstop) this.onstop();
          }
        };
        w.URL.createObjectURL = () => 'blob:https://packet.test/student-voice-1';
        w.URL.revokeObjectURL = (u) => { revokedUrls.push(u); };
        w.Audio = class {
          constructor(src) { this.src = src || ''; }
          play() { playedStudentUrl = this.src; return Promise.resolve(); }
          pause() {}
        };
      },
    });
    const w = dom.window, d = w.document;
    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out: ' + what); };
    try {
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-student-rec]'), 'student rec button');
      expect(micCalls).toBe(0);

      const recBtn = d.querySelector('[data-student-rec]');
      const playBtn = d.querySelector('[data-student-rec-play]');
      const clearBtn = d.querySelector('[data-student-rec-clear]');
      expect(playBtn.hidden).toBe(true);

      recBtn.click();
      await until(() => activeRec && activeRec.state === 'recording', 'student recording');
      expect(micCalls).toBe(1);
      recBtn.click();
      await until(() => !playBtn.hidden, 'play button ready');
      expect(trackStopped).toBe(1);

      playBtn.click();
      expect(playedStudentUrl).toBe('blob:https://packet.test/student-voice-1');

      clearBtn.click();
      expect(playBtn.hidden).toBe(true);
      expect(revokedUrls).toContain('blob:https://packet.test/student-voice-1');

      // Audio never stored in localStorage.
      const stored = Object.keys(w.localStorage).map((k) => w.localStorage.getItem(k)).join(' ');
      expect(stored).not.toContain('student-voice-1');
    } finally { w.close(); }

    // 4. Reopen on the maker page restores pageMode, partsOfSpeech, and studentMic checkboxes.
    const comboMade = RA.lessonFromReadAlong({
      loader,
      title: 'Combo',
      text: 'The kite sailed.\n---\nMia smiled happily.',
      clips: {},
      pageMode: 'custom',
      partsOfSpeech: true,
      studentMic: true,
    });
    const comboBuilt = RA.buildReadAlongPacket({ made: comboMade, loader });
    const page = await openMakerPage();
    try {
      expect(page.w.AlloPacketReadAlongPage.reopen(comboBuilt.html, 'Combo.html')).toBe(true);
      expect(page.$('f-page-mode').value).toBe('custom');
      expect(page.$('f-pos').checked).toBe(true);
      expect(page.$('f-student-mic').checked).toBe(true);
      expect(page.$('f-text').value).toContain('---');
    } finally { page.dom.window.close(); }
  }, 60000);
});

describe('Wave 4: Karaoke word sweep, live 1.5x speed, POS filters, Bold start, Chunk view, Resume place, and per-sentence student mic', () => {
  it('sweeps word highlights live, switches playbackRate mid-sentence to 1.5x, filters POS pills, toggles Bold start & Chunk view, and resumes scroll place', async () => {
    const text = 'The kite sailed quickly over the tall trees. Mia smiled happily all afternoon. Then she went home.';
    const sentences = RA.splitPassage(text);
    const clips = clipsFor(sentences);
    const made = RA.lessonFromReadAlong({ loader, title: 'Wave 4 Story', sentences, clips, syllables: sureSyl, partsOfSpeech: true, pageMode: 'scroll', studentMic: true });
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);

    let lastAudio = null;
    let savedDownloads = [];
    let micActiveRec = null;
    let micBlobCounter = 0;

    function openPlayer(initialStorage = {}) {
      const dom = new JSDOM(built.html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'https://packet.test/wave4.html',
        beforeParse(w) {
          for (const [k, v] of Object.entries(initialStorage)) w.localStorage.setItem(k, v);
          w.Audio = class {
            constructor(src) {
              this.src = src || '';
              this.playbackRate = 1;
              this.defaultPlaybackRate = 1;
              this.preservesPitch = true;
              this.currentTime = 0;
              this.duration = 2.0;
              this.paused = true;
              lastAudio = this;
            }
            play() {
              this.paused = false;
              return Promise.resolve();
            }
            pause() { this.paused = true; }
          };
          w.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) };
          w.MediaRecorder = class {
            constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; micActiveRec = this; }
            start() { this.state = 'recording'; }
            stop() {
              this.state = 'inactive';
              if (this.ondataavailable) this.ondataavailable({ data: new w.Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }) });
              if (this.onstop) this.onstop();
            }
          };
          w.URL.createObjectURL = () => 'blob:https://packet.test/take-' + (++micBlobCounter);
          w.URL.revokeObjectURL = () => {};
          w.HTMLAnchorElement.prototype.click = function () { if (this.download) savedDownloads.push({ download: this.download, href: this.href }); };
        },
      });
      return dom;
    }

    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out: ' + what); };

    let storageSnapshot = {};
    const dom1 = openPlayer();
    try {
      const d = dom1.window.document;
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-play]'), 'player ready');

      // Sentence counter shows 1 of 3.
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 1 of 3');

      // Start reading sentence 1, simulate time progress -> word-by-word karaoke highlight moves forward!
      d.querySelector('[data-read-along-line="1"]').click();
      expect(lastAudio && lastAudio.paused).toBe(false);
      lastAudio.currentTime = 0.05;
      if (lastAudio.ontimeupdate) lastAudio.ontimeupdate();
      const firstWord = d.querySelector('[data-read-along-line="1"] [data-word-active="true"]');
      expect(firstWord && firstWord.textContent).toBe('The');

      lastAudio.currentTime = 1.85;
      if (lastAudio.ontimeupdate) lastAudio.ontimeupdate();
      const laterWord = d.querySelector('[data-read-along-line="1"] [data-word-active="true"]');
      expect(laterWord && laterWord.textContent).toBe('trees');

      // Live mid-sentence speed switch to Fastest (1.5x) updates active audioEl immediately!
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="speed-4"]').click();
      expect(lastAudio.playbackRate).toBe(1.5);

      // Finish sentence 1, turn Auto-advance OFF -> Read to me reads sentence 2 and stops (does NOT advance to 3).
      if (lastAudio.onended) lastAudio.onended();
      d.querySelector('[data-read-along-auto]').click();
      expect(d.querySelector('[data-read-along-auto]').getAttribute('aria-pressed')).toBe('false');
      d.querySelector('[data-read-along-line="2"]').click();
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 2 of 3');
      if (lastAudio.onended) lastAudio.onended();
      await new Promise((r) => setTimeout(r, 20));
      d.querySelector('[data-read-along-play]').click();
      expect(d.querySelector('[data-read-along-play]').textContent).toBe('Stop');
      if (lastAudio.onended) lastAudio.onended();
      await new Promise((r) => setTimeout(r, 20));
      expect(d.querySelector('[data-read-along-play]').textContent).toBe('Read to me');
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 2 of 3');

      // Per-sentence student mic: record sentence 2, save recording locally, switch to sentence 3 (no clip yet), switch back to 2 (clip still there!).
      d.querySelector('[data-student-rec]').click();
      await until(() => micActiveRec && micActiveRec.state === 'recording', 'rec s2');
      d.querySelector('[data-student-rec]').click();
      await until(() => !d.querySelector('[data-student-rec-save]').hidden, 'save btn ready');
      d.querySelector('[data-student-rec-save]').click();
      expect(savedDownloads.some((x) => x.download === 'my-reading-sentence-2.webm')).toBe(true);

      // Independent POS filter pills: turn POS ON, then disable Verbs -> no [data-pos="v"] spans remain while Nouns remain!
      d.querySelector('[data-read-along-pos]').click();
      expect(d.querySelectorAll('[data-pos="v"]').length).toBeGreaterThan(0);
      d.querySelector('[data-pos-filter="v"]').click();
      expect(d.querySelectorAll('[data-pos="v"]')).toHaveLength(0);
      expect(d.querySelectorAll('[data-pos="n"]').length).toBeGreaterThan(0);

      // Bold start renders .ra-bionic strong tags while preserving exact textContent!
      d.querySelector('[data-read-along-bold]').click();
      expect(d.querySelectorAll('[data-read-along-line="1"] .ra-bionic').length).toBeGreaterThan(0);
      expect(d.querySelector('[data-read-along-line="1"]').textContent).toBe(sentences[0].text);

      // One sentence (Chunk view) hides non-active sentences and steps with Next sentence / Previous sentence.
      d.querySelector('[data-read-along-chunk]').click();
      expect(d.querySelector('[data-read-along-line="1"]').hidden).toBe(true);
      expect(d.querySelector('[data-read-along-line="2"]').hidden).toBe(false);
      expect(d.querySelector('[data-read-along-line="3"]').hidden).toBe(true);
      d.querySelector('[data-read-along-sent-next]').click();
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 3 of 3');
      expect(d.querySelector('[data-read-along-line="3"]').hidden).toBe(false);
      // Student mic switched to sentence 3 -> Play button hidden until recorded for sentence 3.
      expect(d.querySelector('[data-student-rec-play]').hidden).toBe(true);

      // Snapshot localStorage at sentence 3 for reopen resume test, then test Restart resets to sentence 1.
      for (const k of Object.keys(dom1.window.localStorage)) storageSnapshot[k] = dom1.window.localStorage.getItem(k);
      d.querySelector('[data-read-along-restart]').click();
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 1 of 3');
      expect(d.querySelector('[data-read-along-line="1"]').hidden).toBe(false);
    } finally { dom1.window.close(); }

    // Reopen with saved localStorage at sentence 3 -> click Continue on start screen -> shows "You stopped at sentence 3 of 3." resume banner!
    const dom2 = openPlayer(storageSnapshot);
    try {
      const d = dom2.window.document;
      await until(() => d.querySelector('#app button.primary'), 'continue button');
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-resume]'), 'resume banner');
      expect(d.querySelector('[data-read-along-resume]').textContent).toContain('You stopped at sentence 3 of 3.');
      d.querySelector('[data-read-along-resume-go]').click();
      expect(d.querySelector('[data-read-along-resume]').hidden).toBe(true);
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 3 of 3');
    } finally { dom2.window.close(); }
  }, 60000);
});

describe('Wave 5: Offline tap-a-word Dictionary, # Headings, Multilingual/RTL, and Rose/Mono/OpenDyslexic formatting', () => {
  it('pre-bakes offline Word meanings, renders # Headings, applies Rose/Mono/OpenDyslexic, and supports RTL languages', async () => {
    const passage = '# Chapter 1\n## The Red Kite\nThe kite sailed over the tall trees.';
    const split = RA.splitPassage(passage);
    expect(split.map((r) => [r.text, r.heading || 0])).toEqual([
      ['Chapter 1', 1],
      ['The Red Kite', 2],
      ['The kite sailed over the tall trees.', 0],
    ]);

    const fakeDict = (w) => ({
      kite: { word: 'kite', pos: 'noun', def: 'A light frame covered with cloth or paper flown in the wind.', example: 'The kite flew high.' },
      sailed: { word: 'sail', pos: 'verb', def: 'To glide smoothly through the air or across water.', example: 'The boat sailed away.' },
    }[w] || null);

    const made = RA.lessonFromReadAlong({
      loader,
      title: 'Kite Chapter',
      text: passage,
      clips: clipsFor(split),
      syllables: sureSyl,
      dictionary: fakeDict,
    });
    expect(made.dictionary && made.dictionary.words).toBe(2);
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(built.manifest.readAlong.dictionaryWords).toBe(2);
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);

    // Reopen round-trip preserves # Headings and dictionary flag.
    const back = RA.readBack(VERIFY.readParts(built.html));
    expect(back.ok).toBe(true);
    expect(back.dictionary).toBe(true);
    expect(back.text).toContain('# Chapter 1');
    expect(back.text).toContain('## The Red Kite');

    // Interactive player check: Headings, Word meanings tap + chip pick, Rose theme, Mono font, hidden OpenDyslexic.
    let audioPlayCount = 0;
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/wave5.html',
      beforeParse(w) {
        w.Audio = class {
          play() { audioPlayCount++; return Promise.resolve(); }
          pause() {}
        };
      },
    });
    const d = dom.window.document;
    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out: ' + what); };
    try {
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-define]'), 'word meanings button');

      expect(d.querySelector('[data-read-along-line="1"]').getAttribute('data-heading')).toBe('1');
      expect(d.querySelector('[data-read-along-line="2"]').getAttribute('data-heading')).toBe('2');

      // Turn Word meanings ON -> tap "sailed" directly inside sentence 3 -> shows definition WITHOUT playing sentence audio!
      d.querySelector('[data-read-along-define]').click();
      expect(d.querySelector('[data-read-along-def-box]').hidden).toBe(false);
      const sailedWord = d.querySelector('[data-read-along-line="3"] [data-def-word="sailed"]');
      expect(sailedWord).toBeTruthy();
      sailedWord.click();
      expect(audioPlayCount).toBe(0);
      expect(d.querySelector('[data-read-along-def-card]').textContent).toContain('sailed (sail) - verb');
      expect(d.querySelector('[data-read-along-def-card]').textContent).toContain('glide smoothly');

      // Keyboard-accessible chip pick works too.
      d.querySelector('[data-def-pick="kite"]').click();
      expect(d.querySelector('[data-read-along-def-card]').textContent).toContain('flown in the wind');

      // Rose theme (colors-7), Mono font (font-5), and OpenDyslexic (font-6 hidden when not installed).
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="colors-7"]').click();
      expect(d.documentElement.getAttribute('data-lt-colors')).toBe('7');
      d.querySelector('[data-tool="font-5"]').click();
      expect(d.documentElement.getAttribute('data-lt-font')).toBe('5');
      expect(d.querySelector('[data-tool="font-6"]').hidden).toBe(true);
    } finally { dom.window.close(); }

    // RTL language (Arabic): sets lang="ar" dir="rtl", skips English-only POS/syllables/dictionary, and round-trips.
    const rtlMade = RA.lessonFromReadAlong({
      loader,
      title: 'قصة',
      text: 'مرحبا بالعالم.',
      clips: {},
      lang: 'ar',
      syllables: sureSyl,
      partsOfSpeech: true,
      dictionary: fakeDict,
    });
    expect(rtlMade.lang).toBe('ar');
    expect(rtlMade.syllables).toBeNull();
    expect(rtlMade.partsOfSpeech).toBeNull();
    expect(rtlMade.dictionary).toBeNull();
    const rtlBuilt = RA.buildReadAlongPacket({ made: rtlMade, loader });
    expect(rtlBuilt.html).toContain('<html lang="ar" dir="rtl">');
    expect(rtlBuilt.manifest.readAlong.lang).toBe('ar');
    expect(RA.readBack(VERIFY.readParts(rtlBuilt.html)).lang).toBe('ar');
    expect(VERIFY.verifyPacket(rtlBuilt.html).counts.notExpected).toBe(0);

    // Maker UI RTL sync: selecting Arabic sets #f-text dir="rtl" and disables English-only #f-pos and #f-dict.
    const page = await openMakerPage();
    try {
      page.$('f-lang').value = 'ar';
      page.$('f-lang').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.$('f-text').getAttribute('dir')).toBe('rtl');
      expect(page.$('f-pos').disabled).toBe(true);
      expect(page.$('f-dict').disabled).toBe(true);
    } finally { page.dom.window.close(); }
  }, 60000);
});

describe('Wave 6: Mid-sentence pause/resume, silent Chunk keyboard nav, 25 Kokoro voices, .txt/.md loader, print glossary, Extra large & custom colors, POS tags, Focus Mode RSVP & Crawl', () => {
  it('supports mid-sentence pause/resume, silent Chunk Arrow/Home/End nav, POS tags, Extra large + custom colors, Focus Mode RSVP, and Cinematic Crawl', async () => {
    const passage = '# Part 1\nThe kite sailed quickly over the tall trees. Mia smiled happily all afternoon. Then she went home.';
    const split = RA.splitPassage(passage);
    const clips = clipsFor(split);
    const made = RA.lessonFromReadAlong({ loader, title: 'Wave 6 Full', text: passage, clips, partsOfSpeech: true, pageMode: 'scroll' });
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);

    let lastAudio = null;
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/wave6.html',
      beforeParse(w) {
        w.Audio = class {
          constructor() { this.currentTime = 0; this.duration = 4.0; this.paused = true; this.playbackRate = 1; lastAudio = this; }
          play() { this.paused = false; return Promise.resolve(); }
          pause() { this.paused = true; }
        };
      },
    });
    const w = dom.window, d = w.document;
    const until = async (test, what) => { for (let i = 0; i < 300; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out: ' + what); };
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-rsvp]'), 'wave 6 ready');

      // 1. Mid-sentence Pause/Resume: start Read to me -> advance currentTime to 1.8s -> Stop -> Read to me resumes at ~1.8s!
      const playBtn = d.querySelector('[data-read-along-play]');
      playBtn.click();
      expect(lastAudio && lastAudio.paused).toBe(false);
      lastAudio.currentTime = 1.8;
      playBtn.click(); // Stop (records pausedTime = 1.8)
      expect(playBtn.textContent).toBe('Read to me');
      playBtn.click(); // Resume!
      expect(lastAudio.currentTime).toBeCloseTo(1.8, 1);
      playBtn.click();

      // 2. POS inline word tags toggle (Show tags -> data-pos-tags="1" and data-pos-tag="N|V|Adj|Adv" while textContent stays plain).
      d.querySelector('[data-read-along-pos]').click();
      d.querySelector('[data-pos-labels]').click();
      expect(d.querySelector('[data-read]').getAttribute('data-pos-tags')).toBe('1');
      expect(d.querySelector('[data-read-along-line="2"] [data-pos-tag="N"]')).toBeTruthy();
      expect(d.querySelector('[data-read-along-line="2"]').textContent).toBe(split[1].text);

      // 3. Extra large text size (size-3) + Custom Background/Text color pickers (and preset clears custom colors).
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="size-3"]').click();
      expect(d.documentElement.getAttribute('data-lt-size')).toBe('3');
      const bgPick = d.querySelector('[data-tool-custom-bg]');
      const inkPick = d.querySelector('[data-tool-custom-ink]');
      bgPick.value = '#eef7ff';
      bgPick.dispatchEvent(new w.Event('input', { bubbles: true }));
      inkPick.value = '#102030';
      inkPick.dispatchEvent(new w.Event('input', { bubbles: true }));
      expect(d.documentElement.style.getPropertyValue('--bg')).toBe('#eef7ff');
      expect(d.documentElement.style.getPropertyValue('--ink')).toBe('#102030');
      d.querySelector('[data-tool="colors-0"]').click();
      expect(d.documentElement.style.getPropertyValue('--bg')).toBe('');

      // 4. Focus Mode (RSVP single-word ORP + multi-word bold-assist chunks + Esc close).
      d.querySelector('[data-read-along-rsvp]').click();
      const rsvpDialog = d.querySelector('[data-rsvp-dialog]');
      expect(rsvpDialog).toBeTruthy();
      expect(rsvpDialog.querySelector('.ra-rsvp-orp')).toBeTruthy();
      const sizeSlider = rsvpDialog.querySelector('[data-rsvp-chunk-size]');
      sizeSlider.value = '3';
      sizeSlider.dispatchEvent(new w.Event('input', { bubbles: true }));
      expect(rsvpDialog.querySelectorAll('.ra-bionic').length).toBeGreaterThanOrEqual(2);
      rsvpDialog.querySelector('[data-rsvp-next]').click();
      expect(rsvpDialog.querySelector('[data-rsvp-count]').textContent).toMatch(/^2 \/ /);
      rsvpDialog.querySelector('[data-rsvp-close]').click();
      expect(d.querySelector('[data-rsvp-dialog]')).toBeNull();

      // 5. Cinematic Crawl overlay (opens, switches theme, closes cleanly).
      d.querySelector('[data-read-along-crawl]').click();
      const crawlDialog = d.querySelector('[data-crawl-dialog]');
      expect(crawlDialog).toBeTruthy();
      const themeSel = crawlDialog.querySelector('[data-crawl-theme]');
      themeSel.value = 'aqua';
      themeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(crawlDialog.style.background).toBeTruthy();
      crawlDialog.querySelector('[data-crawl-close]').click();
      expect(d.querySelector('[data-crawl-dialog]')).toBeNull();
    } finally { w.close(); }

    // 6. Silent-mode keyboard navigation (ArrowRight, ArrowLeft, End, Home work in Chunk mode with 0 audio clips!).
    const silentBuilt = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'Silent Nav', text: 'One. Two. Three.', clips: {} }), loader });
    const domSilent = new JSDOM(silentBuilt.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/silent-nav.html' });
    try {
      const ws = domSilent.window, ds = ws.document;
      ds.getElementById('learner-name').value = 'Sam';
      ds.querySelector('#app button.primary').click();
      await until(() => ds.querySelector('[data-read-along-chunk]'), 'silent chunk button');
      ds.querySelector('[data-read-along-chunk]').click();
      ds.querySelector('#app h2').focus();
      ds.dispatchEvent(new ws.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      expect(ds.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 2 of 3');
      ds.dispatchEvent(new ws.KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      expect(ds.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 3 of 3');
      ds.dispatchEvent(new ws.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      expect(ds.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 1 of 3');
    } finally { domSilent.window.close(); }

    // 7. Maker page: 25 Kokoro voices (including British English), .txt/.md passage loader, and print sheet glossary!
    const page = await openMakerPage();
    try {
      const voiceOpts = [...page.$('f-voice').querySelectorAll('option')].map((o) => o.value);
      expect(voiceOpts.length).toBe(25);
      expect(voiceOpts).toContain('bf_emma');
      expect(voiceOpts).toContain('bm_george');
      expect(page.$('passage-load')).toBeTruthy();

      // Preload stub vocab bank so Word meanings + Print glossary builds synchronously in JSDOM.
      page.w.AlloVocabBank = {
        ready: () => true,
        head: (x) => x,
        senses: (x) => x === 'kite' ? [{ word: 'kite', pos: 'noun', def: 'A light frame flown in the wind.', example: 'The kite soared.' }] : [],
      };
      page.type('f-text', '# Story\nThe kite flew high.');
      page.$('f-dict').checked = true;
      page.$('f-dict').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      await page.until(() => !page.$('print-dict-wrap').hidden, 'print dict checkbox shown');
      page.$('print-dict').checked = true;
      page.$('print-dict').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.$('paper').querySelector('.paper-h').textContent).toBe('Story');
      expect(page.$('paper').querySelector('.paper-gloss').textContent).toContain('A light frame flown in the wind.');
    } finally { page.dom.window.close(); }
  }, 60000);
});

describe('Wave 8: Dictionary-backed zero-AI POS, valley-snapped timings, Tap Speak/Sounds, Chunk pace/moods, Focus/Crawl polish, exact size slider, and UI polish', () => {
  it('supports offline dictionary POS, RMS word timings, local-only deviceVoice opt-in, Sounds syllable card, Chunk pace/moods, Focus/Crawl polish, and exact text size', async () => {
    const until = async (fn, what) => {
      for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 15)); }
      throw new Error('Timed out waiting for ' + what);
    };
    // 1. Dictionary-backed zero-AI POS tagging resolves uncommon words accurately.
    const dictPos = (w) => ({
      photosynthesis: ['noun'],
      abundant: ['adjective'],
      harvest: ['noun', 'verb'],
    }[w] || null);
    const tagged = RA.posText('Abundant photosynthesis will harvest sunlight.', dictPos);
    expect(tagged).toContain('0:j'); // Abundant -> adj
    expect(tagged).toContain('1:n'); // photosynthesis -> noun
    expect(tagged).toContain('3:v'); // will harvest -> verb (context disambiguated!)

    // 2. Deterministic RMS-valley word timings produce monotonic 1..1000 boundaries.
    const sr = 8000;
    const pcm = new Float32Array(sr * 2);
    // Two distinct spoken bursts separated by a quiet valley around 1.0s.
    for (let i = 1000; i < 6500; i++) pcm[i] = 0.4 * Math.sin(i * 0.2);
    for (let i = 9500; i < 15000; i++) pcm[i] = 0.4 * Math.sin(i * 0.25);
    const timings = RA.computeWordTimings('Hello world.', pcm, sr);
    expect(timings).toHaveLength(2);
    expect(timings[0]).toBeGreaterThan(200);
    expect(timings[0]).toBeLessThan(800);
    expect(timings[1]).toBe(1000);

    // 3. Default Read-Along packet emits ZERO speechSynthesis tokens; opt-in deviceVoice passes verifier with local-only voices.
    const text = 'The kite sailed over the trees. Mia smiled happily.';
    const split = RA.splitPassage(text);
    const clips = clipsFor(split);
    const defaultBuilt = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Default Off', sentences: split, clips, syllables: sureSyl }),
      loader,
    });
    expect(defaultBuilt.html).not.toMatch(/\bspeechSynthesis\b/);
    expect(VERIFY.verifyPacket(defaultBuilt.html).counts.notExpected).toBe(0);

    const timingsMap = { [RA.clipKey(split[0].text)]: [120, 260, 480, 660, 820, 1000] };
    const optBuilt = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({
        loader,
        title: 'Wave 8 Full',
        sentences: split,
        clips,
        timings: timingsMap,
        syllables: sureSyl,
        partsOfSpeech: true,
        posLookup: dictPos,
        deviceVoice: true,
      }),
      loader,
    });
    expect(optBuilt.html).toMatch(/\bspeechSynthesis\b/);
    expect(optBuilt.manifest.speech.engine).toBe('speechSynthesis');
    expect(optBuilt.manifest.readAlong.deviceVoice).toBe(true);
    expect(VERIFY.verifyPacket(optBuilt.html).counts.notExpected).toBe(0);

    // 4. Student player: valley-snapped karaoke, Tap Sounds syllable card, Tap Speak local-only voice, Chunk moods, Focus countdown/swatches, Crawl ambient/end, exact size slider, and calm two-tier toolbar.
    let lastAudio = null;
    const spokenLocal = [];
    const dom = new JSDOM(optBuilt.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/wave8.html',
      beforeParse(w) {
        w.Audio = class {
          constructor(src) { this.src = src || ''; this.currentTime = 0; this.duration = 2.0; this.playbackRate = 1; lastAudio = this; }
          play() { return Promise.resolve(); }
          pause() {}
        };
        w.SpeechSynthesisUtterance = class {
          constructor(t) { this.text = t; this.lang = ''; this.rate = 1; this.voice = null; }
        };
        w.speechSynthesis = {
          getVoices: () => [
            { name: 'Cloud Voice', lang: 'en-US', localService: false },
            { name: 'Local English', lang: 'en-US', localService: true },
          ],
          cancel: () => {},
          speak: (u) => { spokenLocal.push({ text: u.text, voice: u.voice && u.voice.name, local: u.voice && u.voice.localService }); if (u.onend) u.onend(); },
        };
      },
    });
    try {
      const w = dom.window, d = w.document;
      // Start screen has zero extra <input> elements before #learner-name.
      expect(d.querySelector('input').id).toBe('learner-name');
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-tools-bar]'), 'two-tier toolbar');

      // Calm two-tier toolbar, progress hairline bar, and keyboard shortcuts disclosure.
      expect(d.querySelector('[data-read-along-main-bar]')).toBeTruthy();
      expect(d.querySelector('[data-read-along-tools-bar]')).toBeTruthy();
      expect(d.querySelector('[data-read-along-progress]')).toBeTruthy();
      expect(d.querySelector('[data-read-along-keys-hint]')).toBeTruthy();

      // Valley-snapped karaoke timing: at t=1.1s of 2.0s (550/1000), word index 3 ("over", end=660) is active!
      d.querySelector('[data-read-along-play]').click();
      lastAudio.currentTime = 1.1;
      if (lastAudio.ontimeupdate) lastAudio.ontimeupdate();
      expect(d.querySelector('[data-word-active="true"]').textContent).toBe('over');
      d.querySelector('[data-read-along-play]').click();

      // Tap: Sounds opens visual syllable tiles card for "over" (o · ver).
      d.querySelector('[data-tap-mode="sounds"]').click();
      const overSpan = [...d.querySelectorAll('[data-tap-word]')].find((el) => el.getAttribute('data-tap-word').toLowerCase() === 'over');
      expect(overSpan).toBeTruthy();
      overSpan.click();
      const soundsCard = d.querySelector('[data-read-along-sounds-card]');
      expect(soundsCard.hidden).toBe(false);
      expect([...soundsCard.querySelectorAll('.ra-syl-tile')].map((x) => x.textContent)).toEqual(['o', 'ver']);

      // Tap: Speak word uses strictly the local voice (never the cloud voice!).
      d.querySelector('[data-tap-mode="speak"]').click();
      const kiteSpan = [...d.querySelectorAll('[data-tap-word]')].find((el) => el.getAttribute('data-tap-word').toLowerCase() === 'kite');
      kiteSpan.click();
      expect(spokenLocal.length).toBeGreaterThanOrEqual(1);
      expect(spokenLocal[spokenLocal.length - 1]).toEqual({ text: 'kite', voice: 'Local English', local: true });

      // Chunk Read timed auto-pace and animation mood selector.
      d.querySelector('[data-read-along-chunk]').click();
      const moodSel = d.querySelector('[data-chunk-mood]');
      moodSel.value = 'popin';
      moodSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(d.querySelector('[data-read-along-text]').getAttribute('data-chunk-mood')).toBe('popin');
      const paceIn = d.querySelector('[data-chunk-pace]');
      paceIn.value = '2000';
      paceIn.dispatchEvent(new w.Event('input', { bubbles: true }));
      expect(d.querySelector('[data-chunk-pace-out]').textContent).toBe('2.0s');

      // Focus Mode: theme picker, 7 ORP swatches, and 3-2-1 countdown on Play.
      d.querySelector('[data-read-along-rsvp]').click();
      const rsvpDlg = d.querySelector('[data-rsvp-dialog]');
      expect(rsvpDlg.querySelectorAll('[data-rsvp-color]').length).toBe(7);
      const blueSwatch = rsvpDlg.querySelector('[data-rsvp-color="#2563eb"]');
      blueSwatch.click();
      expect(blueSwatch.getAttribute('aria-pressed')).toBe('true');
      rsvpDlg.querySelector('[data-rsvp-play]').click();
      expect(rsvpDlg.querySelector('[data-rsvp-countdown]').textContent).toBe('3');
      rsvpDlg.querySelector('[data-rsvp-close]').click();

      // Cinematic Crawl: ambient sound toggle defaults OFF and toggles cleanly; end card exists.
      d.querySelector('[data-read-along-crawl]').click();
      const crawlDlg = d.querySelector('[data-crawl-dialog]');
      const ambBtn = crawlDlg.querySelector('[data-crawl-ambient]');
      expect(ambBtn.getAttribute('aria-pressed')).toBe('false');
      ambBtn.click();
      expect(ambBtn.getAttribute('aria-pressed')).toBe('true');
      expect(crawlDlg.querySelector('[data-crawl-end]')).toBeTruthy();
      crawlDlg.querySelector('[data-crawl-close]').click();

      // Reading tools: Exact text size slider (14-40px), cleared when a preset button is pressed.
      d.querySelector('[data-tools-open]').click();
      const sizeRange = d.querySelector('[data-tool-custom-size]');
      expect(sizeRange).toBeTruthy();
      sizeRange.value = '26';
      sizeRange.dispatchEvent(new w.Event('input', { bubbles: true }));
      expect(d.documentElement.style.fontSize).toBe('26px');
      d.querySelector('[data-tool="size-0"]').click();
      expect(d.documentElement.style.fontSize).toBe('');
    } finally { dom.window.close(); }

    // 5. Maker page: live #passage-stats pill & #f-device-voice reopen round-trip.
    const page = await openMakerPage();
    try {
      expect(page.w.AlloPacketReadAlongPage.reopen(optBuilt.html, 'Wave8.html')).toBe(true);
      expect(page.$('f-device-voice').checked).toBe(true);
      expect(page.$('passage-stats').hidden).toBe(false);
      expect(page.$('passage-stats').textContent).toContain('9 words');
    } finally { page.dom.window.close(); }
  }, 60000);
});

describe('Wave 9: Sticky scroll dock, Offline Picture Dictionary, Simple early-reader toolbar, and Maker live visual preview', () => {
  it('enables sticky dock on long scroll passages, bundles offline word pictures into meanings & print, collapses extra views in simpleBar mode, and draws live page 1 preview', async () => {
    const until = async (fn, what) => {
      for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 15)); }
      throw new Error('Timed out waiting for ' + what);
    };
    const svgUri = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="orange"/></svg>').toString('base64');
    const longPassage = '# Fox Story\nThe fox ran by the kite. It jumped over the tall tree. Next it crossed the river. Then it found a sunny hill. Birds sang in the sky. Clouds drifted past the moon. Soon the fox walked home.';
    const split = RA.splitPassage(longPassage);
    const clips = clipsFor(split);
    const dict = (w) => ({
      fox: { word: 'fox', pos: 'noun', def: 'A small wild animal with a bushy tail.', example: 'The fox ran fast.' },
      kite: { word: 'kite', pos: 'noun', def: 'A light frame flown in the wind.', example: 'The kite flew high.' },
    }[w] || null);
    const pics = (w) => (w === 'fox' || w === 'kite') ? { uri: svgUri, label: w, set: 'mulberry' } : null;

    const made = RA.lessonFromReadAlong({
      loader,
      title: 'Fox Picture Story',
      sentences: split,
      clips,
      syllables: sureSyl,
      partsOfSpeech: true,
      dictionary: dict,
      pictures: pics,
      pageMode: 'scroll',
      simpleBar: true,
    });
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(built.manifest.readAlong.pictureWords).toBe(2);
    expect(built.manifest.readAlong.simpleBar).toBe(true);
    expect(JSON.stringify(built.manifest.attributions)).toContain('Mulberry Symbols');
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);

    // Student player: sticky dock, simpleBar collapsed extra tools, and picture dictionary img inside definition card.
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/wave9.html' });
    try {
      const w = dom.window, d = w.document;
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-dock]'), 'dock rendered');

      // 1. Sticky dock active because long scroll passage has > 6 lines.
      expect(d.querySelector('[data-read-along-dock]').classList.contains('is-sticky')).toBe(true);

      // 2. Simple early-reader toolbar tucks extra tools behind More tools button.
      const moreBtn = d.querySelector('[data-read-along-more-tools]');
      const extraBox = d.querySelector('[data-read-along-extra-tools]');
      expect(moreBtn).toBeTruthy();
      expect(moreBtn.getAttribute('aria-expanded')).toBe('false');
      expect(extraBox.hidden).toBe(true);
      moreBtn.click();
      expect(moreBtn.getAttribute('aria-expanded')).toBe('true');
      expect(extraBox.hidden).toBe(false);

      // 3. Offline Picture Dictionary renders crisp data:image/svg+xml inside the definition card.
      d.querySelector('[data-read-along-define]').click();
      d.querySelector('[data-def-pick="fox"]').click();
      const defImg = d.querySelector('[data-def-img="fox"]');
      expect(defImg).toBeTruthy();
      expect(defImg.getAttribute('src')).toBe(svgUri);
    } finally { dom.window.close(); }

    // 4. Maker page: reopen restores #f-dict-pics and #f-simple-bar, draws #live-preview with headings, POS, and pictures!
    const page = await openMakerPage();
    try {
      page.w.AlloVocabBank = {
        ready: () => true,
        head: (x) => x,
        senses: (x) => dict(x) ? [dict(x)] : [],
      };
      page.w.createWordSoundsSymbols = () => ({
        shards: [],
        ready: () => true,
        has: (x) => x === 'fox' || x === 'kite',
        get: (x) => (x === 'fox' || x === 'kite') ? { svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>', label: x, set: 'mulberry' } : null,
      });
      expect(page.w.AlloPacketReadAlongPage.reopen(built.html, 'FoxPic.html')).toBe(true);
      await page.until(() => !page.$('live-preview').hidden, 'live preview shown');
      expect(page.$('f-dict-pics').checked).toBe(true);
      expect(page.$('f-simple-bar').checked).toBe(true);
      expect(page.$('preview-card').querySelector('.ra-preview-h').textContent).toBe('Fox Story');
      expect(page.$('preview-card').querySelector('.ra-preview-pos-n')).toBeTruthy();
      await page.until(() => page.$('preview-card').querySelectorAll('.ra-preview-pic-img').length >= 1, 'preview picture chips');
      expect(page.$('preview-meta').textContent).toContain('Simple toolbar');
      page.$('print-dict').checked = true;
      page.$('print-dict').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.$('paper').querySelector('.paper-gloss-img')).toBeTruthy();
    } finally { page.dom.window.close(); }
  }, 60000);
});

describe('Wave 10: Expanded offline picture coverage (696 curriculum diagrams, 213 concept cues, irregular lemmas, and teacher AlloPacketMyWords)', () => {
  it('resolves curriculum diagrams, concept cues (predator -> lion/owl/wolf, not date), irregular lemmas, and teacher custom pictures with honest attributions', async () => {
    const matcher = require('../word_picture_matcher.js');
    const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
    const syms = symbolsTool.loadSymbols();

    // 1. WordPictureMatcher: curated concept cues win over prefix stripping (predator -> lion, not date!).
    const pred = matcher.matchWord({ word: 'predator' }, { symbols: syms, preferDiagrams: true });
    expect(pred).toBeTruthy();
    expect(['lion', 'owl', 'wolf']).toContain(pred.word);
    expect(pred.word).not.toBe('date');

    // 2. Curriculum SVG diagrams & irregular lemmas resolve offline without AI.
    const photo = matcher.matchWord({ word: 'photosynthesis' }, { symbols: syms, preferDiagrams: true });
    expect(photo && photo.matchType).toBe('diagram');
    expect(photo.svg).toContain('<svg');
    const wolves = matcher.matchWord({ word: 'wolves' }, { symbols: syms, preferDiagrams: true });
    expect(wolves && wolves.label).toBe('wolf');

    // 3. Maker page combines AlloPacketMyWords custom pictures + 696 curriculum diagrams + concept cues + symbols!
    const customPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const page = await openMakerPage();
    try {
      page.w.AlloWordPictureMatcher = matcher;
      page.w.createWordSoundsSymbols = () => syms;
      page.w.AlloPacketMyWords = {
        getMany: async (words) => words.includes('chameleon') ? {
          chameleon: { word: 'chameleon', picture: { dataUri: customPng, credit: { own: true } } },
        } : {},
        creditLine: () => "The teacher's own picture.",
        onChange: () => () => {},
      };
      page.type('f-text', 'The chameleon watched a predator near photosynthesis and a fraction.');
      await page.until(() => page.w.AlloPacketReadAlongPage.state.sentences.length === 1, 'passage parsed');
      page.$('f-dict-pics').checked = true;
      page.$('f-dict-pics').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      await page.until(() => page.w.AlloPacketReadAlongPage.state.made && page.w.AlloPacketReadAlongPage.state.made.pictures && page.w.AlloPacketReadAlongPage.state.made.pictures.sets.includes('teacher'), '4 expanded pictures matched including teacher');
      const built = page.w.AlloPacketReadAlongPage.state.built;
      const made = page.w.AlloPacketReadAlongPage.state.made;
      expect(made.pictures.sets).toContain('teacher');
      expect(made.pictures.sets).toContain('diagram');
      expect(made.pictures.sets).toContain('mulberry');
      expect(page.$('pics-said').textContent).toMatch(/word pictures? matched/);
      const manifest = JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(built.html)[1]);
      const attrs = JSON.stringify(manifest.attributions);
      expect(attrs).toContain('AlloFlow Curriculum Diagrams');
      expect(attrs).toContain('Mulberry Symbols');
      expect(attrs).toContain("The teacher's own picture.");
      expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);
    } finally { page.dom.window.close(); }
  }, 60000);
});

describe('Wave 11: Definition stop-token precision, multi-word curriculum phrases, Print Cards diagrams, and inline Hide/Replace picture curation', () => {
  it('filters noisy vague stop-words out of definition fallback without hurting curriculum diagrams or concept cues', () => {
    const matcher = require('../word_picture_matcher.js');
    const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
    const syms = symbolsTool.loadSymbols();

    // Noisy definition words ("come", "first", "bad", "good", "taking") must NOT produce misleading icons.
    const disc = matcher.matchWord({ word: 'discrimination', definition: 'Unfair treatment that can come from bias.' }, { symbols: syms, preferDiagrams: true });
    expect(!disc || disc.word !== 'come').toBe(true);
    const grasp = matcher.matchWord({ word: 'grasp', definition: 'To hold at first or get firmly.' }, { symbols: syms, preferDiagrams: true });
    expect(!grasp || grasp.word !== 'first').toBe(true);
    const terr = matcher.matchWord({ word: 'terribly', definition: 'In a very bad way.' }, { symbols: syms, preferDiagrams: true });
    expect(!terr || terr.word !== 'bad').toBe(true);
    const expl = matcher.matchWord({ word: 'exploit', definition: 'Taking unfair advantage of good people.' }, { symbols: syms, preferDiagrams: true });
    expect(!expl || (expl.word !== 'taking' && expl.word !== 'good')).toBe(true);

    // Genuine curriculum diagrams & concrete definitions remain intact.
    const wc = matcher.matchWord({ word: 'water cycle' }, { symbols: syms, preferDiagrams: true });
    expect(wc && wc.matchType).toBe('diagram');
    const fw = matcher.matchWord({ word: 'food web' }, { symbols: syms, preferDiagrams: true });
    expect(fw && fw.matchType).toBe('diagram');
  });

  it('matches multi-word curriculum phrases in Read-Along (water cycle, food web) and lets teachers Hide/Restore pictures inline in Step 4 preview', async () => {
    const matcher = require('../word_picture_matcher.js');
    const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
    const syms = symbolsTool.loadSymbols();

    // 1. Maker page with multi-word curriculum phrases + inline Hide / Restore controls in Step 4 preview.
    const page = await openMakerPage();
    try {
      page.w.AlloWordPictureMatcher = matcher;
      page.w.createWordSoundsSymbols = () => syms;
      page.type('f-text', 'The water cycle shapes every food web and volcano.');
      await page.until(() => page.w.AlloPacketReadAlongPage.state.sentences.length === 1, 'passage parsed');
      page.$('f-dict-pics').checked = true;
      page.$('f-dict-pics').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      await page.until(() => page.w.AlloPacketReadAlongPage.state.made && page.w.AlloPacketReadAlongPage.state.made.pictures && page.w.AlloPacketReadAlongPage.state.made.pictures.count >= 3, 'phrases and volcano matched');

      const item0 = page.w.AlloPacketReadAlongPage.state.made.lesson.blocks[0].items[0];
      expect(item0.glossary['water cycle']).toBeTruthy();
      expect(item0.glossary['water cycle'].img).toBeTruthy();
      expect(item0.glossary['food web']).toBeTruthy();
      expect(item0.glossary['food web'].img).toBeTruthy();

      // Saved student file renders multi-word phrases as tappable passage spans AND Word Meanings chips.
      const builtHtml = page.w.AlloPacketReadAlongPage.state.built.html;
      expect(VERIFY.verifyPacket(builtHtml).counts.notExpected).toBe(0);
      const sdom = new JSDOM(builtHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/phrases.html' });
      try {
        const sw = sdom.window, sd = sw.document;
        sd.getElementById('learner-name').value = 'Kai';
        sd.querySelector('#app button.primary').click();
        await new Promise((r) => setTimeout(r, 30));
        const defBtn = [...sd.querySelectorAll('#app button')].find((b) => b.textContent === 'Word meanings');
        expect(defBtn).toBeTruthy();
        defBtn.click();
        const phraseSpan = sd.querySelector('[data-def-word="water cycle"]');
        expect(phraseSpan).toBeTruthy();
        phraseSpan.click();
        expect(sd.querySelector('[data-def-img="water cycle"]')).toBeTruthy();
      } finally { sdom.window.close(); }

      // Inline Hide button removes "volcano" picture from preview & built file, and Restore brings it back!
      const hideVolcano = page.$('preview-card').querySelector('[data-pic-hide="volcano"]');
      expect(hideVolcano).toBeTruthy();
      expect(page.$('preview-card').querySelector('[data-pic-replace="volcano"]')).toBeTruthy();
      hideVolcano.click();
      await page.until(() => !!page.$('preview-card').querySelector('[data-pic-restore-all]'), 'restore button shown');
      expect(page.w.AlloPacketReadAlongPage.state.made.lesson.blocks[0].items[0].glossary.volcano).toBeUndefined();
      page.$('preview-card').querySelector('[data-pic-restore-all]').click();
      await page.until(() => !page.$('preview-card').querySelector('[data-pic-restore-all]'), 'restore button cleared');
      expect(page.w.AlloPacketReadAlongPage.state.made.lesson.blocks[0].items[0].glossary.volcano).toBeTruthy();
    } finally { page.dom.window.close(); }
  }, 60000);

  it('expands Print Cards pictures via optional matcher (696 curriculum diagrams + lemmas) with honest diagram credit and teacher override precedence', () => {
    const cards = require('../packets-print-cards.js');
    const matcher = require('../word_picture_matcher.js');
    const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
    const syms = symbolsTool.loadSymbols();
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const own = {
      photosynthesis: { picture: { none: true } },
      fraction: { picture: { dataUri: PNG, credit: { own: true } } },
    };
    const pics = cards.picturesOf(['mitosis', 'volcano', 'photosynthesis', 'fraction', 'water cycle', 'wolves'], own, syms, matcher);
    expect(pics.mitosis && pics.mitosis.set).toBe('diagram');
    expect(pics.mitosis.uri).toMatch(/^data:image\/svg\+xml/);
    expect(pics.volcano && pics.volcano.uri).toMatch(/^data:image\/svg\+xml/);
    expect(pics['water cycle'] && pics['water cycle'].set).toBe('diagram');
    expect(pics.wolves && pics.wolves.uri).toMatch(/^data:image\/svg\+xml/);
    expect(pics.photosynthesis).toBeNull();
    expect(pics.fraction).toEqual({ uri: PNG, set: 'own', credit: { own: true } });

    const credits = cards.creditsFor(['mitosis', 'water cycle', 'wolves'], pics, syms);
    expect(credits.some((line) => line.includes('AlloFlow Curriculum Diagrams'))).toBe(true);
  });
});

describe('Wave 12: Expanded Word Sounds matcher pictures, K-5 concept cues, and Find-a-Picture offline diagram browser', () => {
  it('resolves new everyday K-5 concept cues (happy, mom, box, hat, chicken, climb, kick, pet, chimp, moonlight) and filters remaining vague definition tokens', () => {
    const matcher = require('../word_picture_matcher.js');
    const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
    const syms = symbolsTool.loadSymbols();

    for (const w of ['happy', 'mom', 'dad', 'box', 'hat', 'chicken', 'climb', 'kick', 'brush', 'clean', 'pet', 'chimp', 'moonlight', 'giant']) {
      const hit = matcher.matchWord({ word: w }, { symbols: syms, preferDiagrams: true });
      expect(hit && hit.svg, 'expected picture for ' + w).toBeTruthy();
    }
    // Vague definition fallback words ("makes", "past", "future", "before") must not create noisy fallback pictures.
    const vague = matcher.matchWord({ word: 'not', definition: 'Something that makes it past or before the future.' }, { symbols: syms, preferDiagrams: true });
    expect(!vague || !['makes', 'past', 'future', 'before'].includes(vague.word)).toBe(true);
  });

  it('wires WordPictureMatcher into word_sounds_packet_builder.js for curriculum diagrams + concept cues with honest attributions', async () => {
    const matcher = require('../word_picture_matcher.js');
    const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
    const syms = symbolsTool.loadSymbols();
    const wsTool = require('../dev-tools/make_word_sounds_packet.cjs');
    const { dictionary, core, loader: wsLoader, wordlist, builder: wsBuilder } = wsTool.loadParts();
    const BANKS = wsTool.loadBanks({ shards: false });
    const fakeWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=';
    const banksWithClips = {
      ...BANKS,
      kokoroWords: { ...(BANKS.kokoroWords || {}), happy: fakeWav, kick: fakeWav, pet: fakeWav, cat: fakeWav },
    };
    const toWav = async () => fakeWav;

    const built = await wsBuilder.buildPacket({
      words: ['happy', 'kick', 'pet', 'cat'],
      activities: ['isolation'],
      title: 'Expanded WS Pictures',
      seed: 1,
      core,
      dictionary,
      banks: banksWithClips,
      loader: wsLoader,
      wordlist,
      toWav,
      pictures: true,
      symbols: syms,
      matcher,
    });
    // Without matcher, only 'cat' has an exact Mulberry symbol; with matcher, all 4 get pictures!
    expect(built.manifest.pictures.withPicture).toEqual(['happy', 'kick', 'pet', 'cat']);
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);
  });

  it('mounts the offline built-in diagrams browser on packets-pictures.html with zero external fetch and 1-click Save', async () => {
    const matcher = require('../word_picture_matcher.js');
    const saved = {};
    const dom = new JSDOM(readFileSync('packets-pictures.html', 'utf8'), {
      runScripts: 'outside-only',
      url: 'https://packets.test/packets-pictures.html#word=volcano',
      pretendToBeVisual: true,
    });
    try {
      const w = dom.window, d = w.document;
      let fetchCalls = 0;
      w.fetch = () => { fetchCalls++; return Promise.reject(new Error('unexpected fetch')); };
      w.AlloWordPictureMatcher = matcher;
      w.AlloPacketMyWords = {
        LIMITS: { wordMax: 24, pictureSide: 256 },
        normalizeWord: (s) => String(s || '').trim().toLowerCase(),
        available: async () => true,
        list: async () => Object.keys(saved).map((word) => ({ word, picture: true })),
        getMany: async (words) => Object.fromEntries(words.filter((k) => saved[k]).map((k) => [k, saved[k]])),
        put: async (word, data) => { saved[word] = { word, picture: data.picture }; return saved[word]; },
        creditLine: () => "Your own picture.",
        onChange: () => () => {},
      };
      w.eval(readFileSync('packets-page.js', 'utf8'));
      w.eval(readFileSync('packets-pictures.js', 'utf8'));
      await new Promise((r) => setTimeout(r, 30));

      const btn = d.getElementById('offline-search');
      expect(btn).toBeTruthy();
      expect(fetchCalls).toBe(0);
      btn.click();
      await new Promise((r) => setTimeout(r, 30));
      expect(fetchCalls).toBe(0);
      const cards = [...d.querySelectorAll('#pics-offline li')];
      expect(cards.length).toBeGreaterThanOrEqual(1);
      cards[0].querySelector('button').click();
      await new Promise((r) => setTimeout(r, 30));
      expect(saved.volcano && saved.volcano.picture && saved.volcano.picture.dataUri).toMatch(/^data:image\/svg\+xml/);
      expect(d.getElementById('saved').hidden).toBe(false);
    } finally { dom.window.close(); }
  });
});
