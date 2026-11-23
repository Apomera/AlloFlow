// Track 3: Author-added text supports + Kokoro-82M / teacher-mic narration & "Read with supports" playback
// in Read-Along packets. Verifies builder schema, manifest/credits honesty, zero-AI offline CSP, packet
// verification, lossless reopen round-trip, standalone student HTML playback, and maker page workflow.

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
const HTML = read('packets-read-along.html');
const JS = read('packets-read-along.js');
const ENGINE = read('packets_voice_engine.js');
const LOADER_SRC = read('word_sounds_take_home_loader.js');

function loadLoader() {
  const g = { crypto: webcrypto };
  g.window = g;
  new Function('window', LOADER_SRC).call(g, g);
  return g.AlloWordSoundsTakeHome;
}

const loader = loadLoader();
const mp3 = (label) => 'data:audio/mpeg;base64,' + Buffer.from('ID3' + label).toString('base64');
const svgImg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>').toString('base64');
const PASSAGE = 'Green leaves use photosynthesis to make food. Water moves up the stem to every leaf.';

function wavBytes(ms = 180) {
  const samples = Math.round(24000 * ms / 1000);
  const data = samples * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(24000, 24); buf.writeUInt32LE(48000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data, 40);
  for (let i = 0; i < samples; i++) buf.writeInt16LE(Math.round(8000 * Math.sin(i / 8)), 44 + i * 2);
  return new Uint8Array(buf);
}

describe('Read-Along custom supports: builder, verification & lossless reopen', () => {
  it('embeds word-anchored and sentence-level supports with deterministic gN audio IDs, honest manifest/credits, and zero verify findings', () => {
    const sentences = RA.splitPassage(PASSAGE);
    const clips = Object.fromEntries(sentences.map((row) => [RA.clipKey(row.text), mp3('S:' + row.text)]));
    const customSupports = [
      {
        line: 0,
        quote: 'photosynthesis',
        text: 'How green plants use sunlight, water, and air to make their own food.',
        imgUri: svgImg,
        audioUri: mp3('G:photosynthesis'),
        audioSource: 'computer',
      },
      {
        line: 1,
        quote: '',
        text: 'Think of the stem like tiny straws carrying water upward.',
        audioUri: mp3('G:stem-hint'),
        audioSource: 'teacher',
      },
    ];

    expect(RA.supportSpeechText(customSupports[0])).toBe('photosynthesis. How green plants use sunlight, water, and air to make their own food.');
    expect(RA.supportSpeechText(customSupports[1])).toBe('Think of the stem like tiny straws carrying water upward.');

    const made = RA.lessonFromReadAlong({
      loader,
      title: 'How Plants Eat',
      sentences,
      clips,
      voice: 'af_heart',
      customSupports,
    });

    expect(made.customSupports).toBe(2);
    expect(made.supportRecordings).toBe(2);
    expect(made.lesson.audio.g1).toBe(customSupports[0].audioUri);
    expect(made.lesson.audio.g2).toBe(customSupports[1].audioUri);

    const item = made.lesson.blocks[0].items[0];
    expect(item.supports).toEqual([
      {
        id: 'sup1',
        line: 0,
        quote: 'photosynthesis',
        text: 'How green plants use sunlight, water, and air to make their own food.',
        img: 'p1',
        alt: 'photosynthesis',
        audio: 'g1',
      },
      {
        id: 'sup2',
        line: 1,
        text: 'Think of the stem like tiny straws carrying water upward.',
        audio: 'g2',
      },
    ]);
    expect(made.lesson.images.p1).toBe(svgImg);
    // 1-word quoted support is mirrored into glossary with custom flag and audio clip ID.
    expect(item.glossary.photosynthesis).toMatchObject({
      d: 'How green plants use sunlight, water, and air to make their own food.',
      img: 'p1',
      a: 'g1',
      c: true,
    });

    const built = RA.buildReadAlongPacket({ made, loader });
    expect(built.manifest.readAlong.customSupports).toBe(2);
    expect(built.manifest.readAlong.supportRecordings).toBe(2);
    expect(JSON.stringify(built.manifest.attributions)).toContain('Teacher notes & supports: 2 custom supports written by the teacher.');
    expect(JSON.stringify(built.manifest.attributions)).toContain('Support recordings: 1 recorded by the teacher and 1 made ahead of time with Kokoro-82M');

    // Packet verifier and CSP must stay strictly closed and offline.
    const verified = VERIFY.verifyPacket(built.html);
    expect(verified.ok).toBe(true);
    expect(verified.result).toBe('closed');
    expect(verified.counts.notExpected).toBe(0);
    expect(verified.counts.look).toBe(0);
    const csp = new JSDOM(built.html).window.document.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'none'");

    // Lossless reopen round-trip restores customSupports + audio URIs + sources.
    const back = RA.readBack(VERIFY.readParts(built.html));
    expect(back.ok).toBe(true);
    expect(back.customSupports).toHaveLength(2);
    expect(back.customSupports[0]).toMatchObject({
      line: 0,
      quote: 'photosynthesis',
      text: 'How green plants use sunlight, water, and air to make their own food.',
      imgUri: svgImg,
      audioUri: customSupports[0].audioUri,
    });
    expect(back.customSupports[1]).toMatchObject({
      line: 1,
      text: 'Think of the stem like tiny straws carrying water upward.',
      audioUri: customSupports[1].audioUri,
    });
    expect(back.customSupports[1].quote).toBeUndefined();
  });

  it('rejects non-audio support clip URIs and omits customSupports manifest keys when none are present', () => {
    const sentences = RA.splitPassage(PASSAGE);
    const clips = Object.fromEntries(sentences.map((row) => [RA.clipKey(row.text), mp3('S:' + row.text)]));
    expect(() => RA.lessonFromReadAlong({
      loader,
      sentences,
      clips,
      customSupports: [{ line: 0, text: 'Hint', audioUri: 'javascript:alert(1)' }],
    })).toThrow('A recording must be an audio file.');

    const plain = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, sentences, clips }), loader });
    expect(plain.manifest.readAlong.customSupports).toBeUndefined();
    expect(plain.manifest.readAlong.supportRecordings).toBeUndefined();
  });
});

describe('Read-Along student HTML playback: Hear meaning & Read with supports', () => {
  it('plays support audio on Hear meaning and sequences anchored supports after each sentence only when Read with supports is toggled ON', async () => {
    const sentences = RA.splitPassage(PASSAGE);
    const clips = Object.fromEntries(sentences.map((row) => [RA.clipKey(row.text), mp3('S:' + row.text)]));
    const customSupports = [
      {
        line: 0,
        quote: 'photosynthesis',
        text: 'How plants make food from sunlight.',
        imgUri: svgImg,
        audioUri: mp3('G:photosynthesis'),
      },
      {
        line: 1,
        quote: '',
        text: 'Water travels up like a straw.',
        audioUri: mp3('G:straw'),
      },
    ];
    const built = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Plants', sentences, clips, customSupports }),
      loader,
    });

    const played = [];
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/plants.html',
      beforeParse(w) {
        w.Audio = class {
          constructor() { this.playbackRate = 1; }
          set src(v) { this._src = v; }
          get src() { return this._src; }
          play() {
            const raw = Buffer.from(String(this._src).split(',')[1], 'base64').toString().slice(3);
            played.push(raw);
            setTimeout(() => { if (this.onended) this.onended(); }, 5);
            return Promise.resolve();
          }
          pause() {}
        };
      },
    });
    const d = dom.window.document;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (test, what) => {
      for (let i = 0; i < 300; i++) { if (test()) return; await wait(10); }
      throw new Error('Timed out waiting for ' + what);
    };

    try {
      d.getElementById('learner-name').value = 'Maya';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-play]'), 'read along page');

      // Inline support chips exist for both sentences.
      const chips = [...d.querySelectorAll('[data-support-chip]')];
      expect(chips).toHaveLength(2);
      expect(chips[0].textContent).toContain('photosynthesis');

      // Clicking a support chip opens the support card with image & Hear meaning button.
      chips[0].click();
      const card = d.querySelector('[data-read-along-support-card]');
      expect(card.hidden).toBe(false);
      expect(card.textContent).toContain('How plants make food from sunlight.');
      expect(card.querySelector('img')).not.toBeNull();
      const hearBtn = card.querySelector('[data-support-hear]');
      expect(hearBtn).not.toBeNull();
      hearBtn.click();
      await until(() => played.length === 1, 'support hear click');
      expect(played[0]).toBe('G:photosynthesis');

      // Default Read with supports is OFF -> Read to me plays only sentences s1, s2.
      const toggle = d.querySelector('[data-read-along-with-supports]');
      expect(toggle).not.toBeNull();
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      played.length = 0;
      const playBtn = d.querySelector('[data-read-along-play]');
      playBtn.click();
      await until(() => playBtn.textContent === 'Read to me' && played.length === 2, 'plain read-through');
      expect(played).toEqual([
        'S:Green leaves use photosynthesis to make food.',
        'S:Water moves up the stem to every leaf.',
      ]);

      // Toggle Read with supports ON -> plays s1 -> g1 -> s2 -> g2 in sequence.
      toggle.click();
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      played.length = 0;
      playBtn.click();
      await until(() => playBtn.textContent === 'Read to me' && played.length === 4, 'read-through with supports');
      expect(played).toEqual([
        'S:Green leaves use photosynthesis to make food.',
        'G:photosynthesis',
        'S:Water moves up the stem to every leaf.',
        'G:straw',
      ]);

      // Notes & supports drawer lists both supports with pick buttons that reveal Hear meaning.
      const drawer = d.querySelector('[data-read-along-supports-box]');
      expect(drawer).not.toBeNull();
      expect(drawer.querySelectorAll('[data-support-pick]')).toHaveLength(2);
    } finally {
      dom.window.close();
    }
  }, 60000);
});

describe('Read-Along maker page: adding supports and synthesizing them with Kokoro', () => {
  it('lets a teacher add a custom support, records both passage and support with Kokoro, and reopens it cleanly', async () => {
    const dom = new JSDOM(HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-read-along.html' });
    const w = dom.window, d = w.document;
    if (!w.TextEncoder) w.TextEncoder = TextEncoder;
    if (!w.TextDecoder) w.TextDecoder = TextDecoder;
    const spoken = [];
    w.fetch = async (url) => {
      if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
      if (String(url).startsWith('blob:voice/')) return { ok: true, arrayBuffer: async () => wavBytes().buffer };
      return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
    };
    w.URL.createObjectURL = () => 'blob:https://packets.test/1';
    w.URL.revokeObjectURL = () => {};
    const realAppend = w.HTMLHeadElement.prototype.appendChild;
    d.head.appendChild = function (node) {
      if (node && node.tagName === 'SCRIPT') {
        const src = node.getAttribute('src');
        if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
        if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (catalog, target) => { target.__alloCreateVerifiedWorker = () => {}; };
        if (src === 'kokoro_tts_loader.js') w._kokoroTTS = {
          init: async (onProgress) => { onProgress({ stage: 'Ready', pct: 1 }); return true; },
          speak: async (text) => { spoken.push(text); return 'blob:voice/' + spoken.length; },
        };
        if (src === 'lame.min.js') w.eval(read('lame.min.js'));
        setTimeout(() => node.onload && node.onload(), 0);
        return node;
      }
      return realAppend.call(this, node);
    };
    w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.eval(LOADER_SRC);
    w.eval(read('packet_read_along_builder.js'));
    w.eval(ENGINE);
    w.eval(read('packets_verify_core.js'));
    w.eval(read('packets_reopen.js'));
    w.eval(read('packets_handoff.js'));
    w.eval(read('packets_zip.js'));
    w.eval(JS);

    const $ = (id) => d.getElementById(id);
    const until = async (test, what) => {
      for (let i = 0; i < 400; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 15)); }
      throw new Error('Timed out waiting for ' + what);
    };
    const type = (id, text) => { $(id).value = text; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };

    try {
      type('f-title', 'Plants');
      type('f-text', PASSAGE);
      await until(() => d.querySelectorAll('#line-rows .voice-row').length === 2, 'sentence rows');

      // Add a custom support anchored to sentence 1.
      $('sup-line').value = '0';
      type('sup-quote', 'photosynthesis');
      type('sup-text', 'How plants turn sunlight into food.');
      $('sup-add').click();
      await until(() => d.querySelectorAll('#support-rows .voice-row').length === 1, 'custom support row');

      // Get Kokoro voice and record all sentences + custom support.
      $('get-voice').click();
      await until(() => !$('make-all').disabled, 'voice ready');
      $('make-all').click();
      await until(() => !$('save').hidden && spoken.length === 3, 'sentences + support recorded');

      expect(spoken).toEqual([
        'Green leaves use photosynthesis to make food.',
        'Water moves up the stem to every leaf.',
        'photosynthesis. How plants turn sunlight into food.',
      ]);

      const builtHtml = w.AlloPacketReadAlongPage.state.built.html;
      expect(builtHtml).toContain('Read with supports');
      const verified = VERIFY.verifyPacket(builtHtml);
      expect(verified.ok).toBe(true);
      expect(verified.counts.notExpected).toBe(0);

      // Reopen the saved file and verify the custom support and its clip survive intact.
      const reopened = RA.readBack(VERIFY.readParts(builtHtml));
      expect(reopened.ok).toBe(true);
      expect(reopened.customSupports).toHaveLength(1);
      expect(reopened.customSupports[0].quote).toBe('photosynthesis');
      expect(reopened.customSupports[0].audioUri).toMatch(/^data:audio\/mpeg;base64,/);
    } finally {
      dom.window.close();
    }
  }, 60000);
});
