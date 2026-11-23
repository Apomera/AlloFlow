// Wave 3 (w3-voice-clips): Dictation Studio -> Read-Along Packet Recorded Teacher Voice Clips Handoff.
// Verifies:
//   1. SpeechSetup._pure.alignSegmentsToSentences (exact, punctuation/case, Whisper overlap, merged-blob skip,
//      asymmetric merged-blob skip, abbreviations matching packet_read_along_builder.js, single-sentence case).
//   2. DictationSourceStudio opt-in toggle ([data-testid="dictation-include-voice-clips"]): presence, default ON,
//      toggle OFF omits segments & sets includeVoiceClips:false, toggle ON passes blob segments & includeVoiceClips:true.
//   3. AlloFlowANTI.txt handleSendToReadAlongPacket converts matched blobs into draft.clips ({ uri, source:'teacher' }),
//      supports FileReader and blob.arrayBuffer() fallback, and enforces 2 MB single-clip and 18 MB total clip caps.
//   4. End-to-end compatibility: handleSendToReadAlongPacket -> AlloPacketHandoff -> packets-read-along.js importDraft()
//      populates state.clips with teacher WAV clips and builds a strict-verified offline Read-Along packet.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const RA = require('../packet_read_along_builder.js');
const VERIFY = require('../packets_verify_core.js');

let React, ReactDOMClient, act;
let V, SpeechSetup;
let root, host;

const T = {
  'common.close': 'Close',
  'common.cancel': 'Cancel',
};

function flush() {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function click(el) {
  expect(el, 'expected clickable element').toBeTruthy();
  act(() => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

function makeWavBytes(durationSec = 0.2, sampleRate = 16000) {
  const samples = Math.max(160, Math.round(durationSec * sampleRate));
  const dataBytes = samples * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);
  const put = (at, s) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };
  put(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); put(8, 'WAVE');
  put(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, 'data'); view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples; i++) {
    view.setInt16(44 + i * 2, Math.round(6000 * Math.sin(i / 10)), true);
  }
  return new Uint8Array(buf);
}

function makeWavBlob(durationSec = 0.2, sampleRate = 16000) {
  return new Blob([makeWavBytes(durationSec, sampleRate)], { type: 'audio/wav' });
}

function makeSyntheticSizedWavBlob(byteLength) {
  const bytes = new Uint8Array(byteLength);
  bytes.set([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45], 0);
  return {
    size: byteLength,
    type: 'audio/wav',
    arrayBuffer: async () => bytes.buffer,
  };
}

function extractHandleSendToReadAlongPacket(deps = {}) {
  const src = read('AlloFlowANTI.txt');
  const startMarker = '  const handleSendToReadAlongPacket = async (opts = {}) => {';
  const endMarker = '\n  useEffect(() => {\n    window.__alloRunDictationTextCleanup = runDictationTextCleanup;';
  const start = src.indexOf(startMarker);
  expect(start, 'handleSendToReadAlongPacket start marker').toBeGreaterThan(0);
  const end = src.indexOf(endMarker, start);
  expect(end, 'handleSendToReadAlongPacket end marker').toBeGreaterThan(start);
  const fnSource = src.slice(start, end) + '\nreturn handleSendToReadAlongPacket;';
  const factory = new Function(
    'window', 'FileReader', 'inputText', 'addToast', 't', 'sourceTopic',
    'leveledTextLanguage', 'currentUiLanguage', 'history', 'stickers',
    'stickersMapRef', 'generatedContent', 'warnLog',
    fnSource
  );
  return factory(
    deps.window || window,
    'FileReader' in deps ? deps.FileReader : window.FileReader,
    deps.inputText ?? '',
    deps.addToast || vi.fn(),
    deps.t || (() => ''),
    deps.sourceTopic ?? 'Science Reading',
    deps.leveledTextLanguage ?? 'English',
    deps.currentUiLanguage ?? 'English',
    deps.history ?? [],
    deps.stickers ?? [],
    deps.stickersMapRef ?? { current: {} },
    deps.generatedContent ?? null,
    deps.warnLog || vi.fn()
  );
}

function makeMemoryIdb(backingMap = new Map()) {
  const stores = new Map([['files', backingMap]]);
  const makeDb = () => ({
    objectStoreNames: { contains: (name) => stores.has(name) },
    createObjectStore: (name) => { if (!stores.has(name)) stores.set(name, new Map()); return {}; },
    close: () => {},
    transaction: (storeName) => {
      const map = stores.get(storeName) || new Map();
      const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
      const pending = [];
      let scheduled = false;
      const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => {
          for (const fn of pending) fn();
          if (typeof tx.oncomplete === 'function') tx.oncomplete();
        }, 0);
      };
      tx.objectStore = () => ({
        put: (record) => {
          const req = { result: undefined, onsuccess: null, onerror: null };
          pending.push(() => { map.set(record.id, record); if (typeof req.onsuccess === 'function') req.onsuccess(); });
          schedule();
          return req;
        },
        get: (key) => {
          const req = { result: undefined, onsuccess: null, onerror: null };
          pending.push(() => { req.result = map.has(key) ? map.get(key) : undefined; if (typeof req.onsuccess === 'function') req.onsuccess(); });
          schedule();
          return req;
        },
        delete: (key) => {
          const req = { result: undefined, onsuccess: null, onerror: null };
          pending.push(() => { map.delete(key); if (typeof req.onsuccess === 'function') req.onsuccess(); });
          schedule();
          return req;
        },
      });
      return tx;
    },
  });
  return {
    backingMap,
    indexedDB: {
      open: () => {
        const req = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
        setTimeout(() => {
          req.result = makeDb();
          if (typeof req.onupgradeneeded === 'function') req.onupgradeneeded();
          if (typeof req.onsuccess === 'function') req.onsuccess();
        }, 0);
        return req;
      },
    },
  };
}

async function openReadAlongPage({ url = 'https://packets.test/site/packets-read-along.html', idb = null } = {}) {
  const dom = new JSDOM(read('packets-read-along.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url });
  const w = dom.window;
  const d = w.document;
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  if (idb) Object.defineProperty(w, 'indexedDB', { value: idb.indexedDB, configurable: true });
  w.URL.createObjectURL = () => 'blob:https://packets.test/ra-obj';
  w.URL.revokeObjectURL = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.eval(read('word_sounds_take_home_loader.js'));
  w.eval(read('packet_read_along_builder.js'));
  w.eval(read('syllable_table_en.js'));
  w.eval(read('packets_voice_engine.js'));
  w.eval(read('packets_verify_core.js'));
  w.eval(read('packets_reopen.js'));
  w.eval(read('packets_handoff.js'));
  w.eval(read('packets_zip.js'));
  w.eval(read('packets-read-along.js'));
  return {
    w,
    d,
    dom,
    $: (id) => d.getElementById(id),
    until: async (fn, what) => {
      for (let i = 0; i < 300; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 15)); }
      throw new Error('Timed out waiting for ' + what);
    },
  };
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: (k) => T[k] || k });
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

  loadAlloModule('voice_module.js');
  loadAlloModule('speech_setup_module.js');

  V = window.AlloFlowVoice;
  SpeechSetup = window.AlloModules.SpeechSetup;
});

beforeEach(() => {
  localStorage.clear();
  delete window.__alloSendToReadAlongPacket;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error('not-called')) },
  });
  window.AudioContext = function AudioContext() {};
  window.URL.createObjectURL = vi.fn(() => 'blob:https://test.local/clip-1');
  window.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

describe('1. SpeechSetup._pure.alignSegmentsToSentences', () => {
  it('aligns exact matches, punctuation/case differences, and single-sentence Whisper overlaps cleanly', () => {
    const align = SpeechSetup._pure.alignSegmentsToSentences;
    expect(typeof align).toBe('function');

    const b1 = makeWavBlob(0.2);
    const b2 = makeWavBlob(0.2);
    const b3 = makeWavBlob(0.2);
    const text = 'Leaves make food with sunlight! Water travels up the stem. Green plants use photosynthesis and chlorophyll.';

    const aligned = align(text, [
      { id: 's1', text: 'leaves make food with sunlight', blob: b1, mimeType: 'audio/wav' },
      { id: 's2', text: 'Water travels up the stem.', blob: b2, mimeType: 'audio/wav' },
      { id: 's3', text: 'Green plants use photo synthesis and chlorofill', blob: b3, mimeType: 'audio/wav' },
    ]);

    expect(aligned).toHaveLength(3);
    expect(aligned[0]).toMatchObject({ sentence: 'Leaves make food with sunlight!', sentenceIndex: 0, score: 1 });
    expect(aligned[0].segment.blob).toBe(b1);
    expect(aligned[1]).toMatchObject({ sentence: 'Water travels up the stem.', sentenceIndex: 1, score: 1 });
    expect(aligned[1].segment.blob).toBe(b2);
    expect(aligned[2].sentence).toBe('Green plants use photosynthesis and chlorophyll.');
    expect(aligned[2].sentenceIndex).toBe(2);
    expect(aligned[2].score).toBeGreaterThanOrEqual(0.55);
    expect(aligned[2].segment.blob).toBe(b3);
  });

  it('skips multi-sentence merged clips (both balanced and long+short) while keeping clean single-sentence clips', () => {
    const align = SpeechSetup._pure.alignSegmentsToSentences;

    const bMerged = makeWavBlob(0.4);
    const bSingle3 = makeWavBlob(0.2);
    const text = 'Leaves make food with sunlight. Roots pull water from the soil. Flowers attract hungry bees.';
    const aligned = align(text, [
      { id: 'merged', text: 'Leaves make food with sunlight. Roots pull water from the soil.', blob: bMerged },
      { id: 'clean3', text: 'Flowers attract hungry bees.', blob: bSingle3 },
    ]);

    expect(aligned).toHaveLength(1);
    expect(aligned[0]).toMatchObject({ sentence: 'Flowers attract hungry bees.', sentenceIndex: 2, score: 1 });
    expect(aligned[0].segment.blob).toBe(bSingle3);

    // Asymmetric long + short merged blob MUST also be skipped rather than attached to sentence 0.
    const asymText = 'Photosynthesis is the amazing process where green leaves turn sunlight into food. Roots drink water.';
    const asymAligned = align(asymText, [
      { id: 'asym', text: 'Photosynthesis is the amazing process where green leaves turn sunlight into food. Roots drink water.', blob: bMerged },
    ]);
    expect(asymAligned).toEqual([]);
  });

  it('matches packet_read_along_builder.js splitting on abbreviations, keeps best segment per sentence, and handles single-sentence passages', () => {
    const align = SpeechSetup._pure.alignSegmentsToSentences;

    const abbrText = 'Dr. Kim visited St. Louis on Jan. 5. She studied fossils.';
    const builderSentences = RA.splitPassage(abbrText).map((r) => RA.clipKey(r.text));
    expect(builderSentences).toEqual(['Dr. Kim visited St. Louis on Jan. 5.', 'She studied fossils.']);

    const bWorse = makeWavBlob(0.2);
    const bBetter = makeWavBlob(0.2);
    const bSecond = makeWavBlob(0.2);
    const aligned = align(abbrText, [
      { id: 'a1-draft', text: 'Dr Kim visited St Louis', blob: bWorse },
      { id: 'a1-exact', text: 'Dr. Kim visited St. Louis on Jan. 5.', blob: bBetter },
      { id: 'a2', text: 'She studied fossils', blob: bSecond },
      { id: 'no-blob', text: 'She studied fossils.', blob: null },
      { id: 'empty-blob', text: 'She studied fossils.', blob: new Blob([], { type: 'audio/wav' }) },
    ]);

    expect(aligned).toHaveLength(2);
    expect(aligned[0].sentence).toBe(builderSentences[0]);
    expect(aligned[0].segment.blob).toBe(bBetter);
    expect(aligned[1].sentence).toBe(builderSentences[1]);
    expect(aligned[1].segment.blob).toBe(bSecond);

    // Single-sentence / single-segment case works cleanly even with minor edit.
    const singleBlob = makeWavBlob(0.2);
    const singleAligned = align('The quick brown fox jumps over the lazy dog.', [
      { id: 'only', text: 'The quick brown fox jumped over the lazy dog', blob: singleBlob },
    ]);
    expect(singleAligned).toHaveLength(1);
    expect(singleAligned[0]).toMatchObject({ sentence: 'The quick brown fox jumps over the lazy dog.', sentenceIndex: 0 });
    expect(singleAligned[0].segment.blob).toBe(singleBlob);
  });
});

describe('2. DictationSourceStudio opt-in voice clips toggle', () => {
  it('renders dictation-include-voice-clips checked by default when blobs exist, omits segments when unchecked, and includes them when re-checked', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    const readAlongSpy = vi.fn();
    const segsWithBlobs = [
      { id: 'seg-1', index: 0, startSec: 0, endSec: 3, text: 'Leaves make food with sunlight.', blob: makeWavBlob(0.2), mimeType: 'audio/wav' },
      { id: 'seg-2', index: 1, startSec: 3, endSec: 6, text: 'Roots pull water from soil.', blob: makeWavBlob(0.2), mimeType: 'audio/wav' },
    ];

    // 1. Without blob segments -> checkbox is hidden, button still works with empty segments.
    await act(async () => {
      root.render(React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: 'Leaves make food with sunlight.',
        onChange: () => {},
        onSendToReadAlong: readAlongSpy,
      }));
    });
    await flush();
    expect(host.querySelector('[data-testid="dictation-include-voice-clips"]')).toBeNull();
    expect(host.querySelector('[data-testid="dictation-send-read-along"]')).toBeTruthy();

    // 2. With blob segments -> checkbox is rendered, checked by default, labeled with exact count.
    await act(async () => {
      root.render(React.createElement(SpeechSetup.DictationStudio, {
        t: (k) => T[k] || k,
        value: 'Leaves make food with sunlight. Roots pull water from soil.',
        onChange: () => {},
        initialSegments: segsWithBlobs,
        onSendToReadAlong: readAlongSpy,
      }));
    });
    await flush();

    const checkbox = host.querySelector('[data-testid="dictation-include-voice-clips"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(true);
    expect(checkbox.closest('label').textContent).toContain('Include my recorded voice clips (2)');

    // Default ON -> clicking Send passes blob segments & includeVoiceClips: true.
    click(host.querySelector('[data-testid="dictation-send-read-along"]'));
    expect(readAlongSpy).toHaveBeenCalledTimes(1);
    expect(readAlongSpy.mock.calls[0][0]).toMatchObject({
      text: 'Leaves make food with sunlight. Roots pull water from soil.',
      includeVoiceClips: true,
    });
    expect(readAlongSpy.mock.calls[0][0].segments).toHaveLength(2);

    // Toggle OFF -> clicking Send omits segments & sets includeVoiceClips: false.
    click(checkbox);
    await flush();
    expect(checkbox.checked).toBe(false);
    click(host.querySelector('[data-testid="dictation-send-read-along"]'));
    expect(readAlongSpy).toHaveBeenCalledTimes(2);
    expect(readAlongSpy.mock.calls[1][0]).toEqual({
      text: 'Leaves make food with sunlight. Roots pull water from soil.',
      segments: [],
      includeVoiceClips: false,
    });

    // Toggle ON again -> passes segments & includeVoiceClips: true.
    click(checkbox);
    await flush();
    expect(checkbox.checked).toBe(true);
    click(host.querySelector('[data-testid="dictation-send-read-along"]'));
    expect(readAlongSpy).toHaveBeenCalledTimes(3);
    expect(readAlongSpy.mock.calls[2][0].includeVoiceClips).toBe(true);
    expect(readAlongSpy.mock.calls[2][0].segments).toHaveLength(2);
  });
});

describe('3. AlloFlowANTI.txt handleSendToReadAlongPacket voice clip conversion & size caps', () => {
  it('converts matched WAV blobs into data:audio/wav;base64,... draft.clips (teacher source), skips merged blobs, and respects includeVoiceClips:false', async () => {
    const redirected = [];
    const fakeWin = {
      AlloModules: window.AlloModules,
      AlloPacketHandoff: {
        redirectDraft: vi.fn(async (draft, href, newTab) => {
          redirected.push({ draft, href, newTab });
          return true;
        }),
      },
      btoa: window.btoa.bind(window),
    };
    const handler = extractHandleSendToReadAlongPacket({ window: fakeWin, FileReader: undefined });

    const s1 = 'Leaves make food with sunlight.';
    const s2 = 'Water travels up the stem.';
    const s3 = 'Roots hold the plant steady.';
    const passage = `${s1} ${s2} ${s3}`;

    const ok = await handler({
      text: passage,
      includeVoiceClips: true,
      segments: [
        { id: 'c1', text: 'leaves make food with sunlight', blob: makeWavBlob(0.2), mimeType: 'audio/wav' },
        { id: 'merged', text: `${s2} ${s3}`, blob: makeWavBlob(0.4), mimeType: 'audio/wav' },
      ],
    });
    expect(ok).toBe(true);
    expect(redirected).toHaveLength(1);
    const draft1 = redirected[0].draft;
    expect(Object.keys(draft1.clips)).toEqual([s1]);
    expect(draft1.clips[s1].source).toBe('teacher');
    expect(draft1.clips[s1].uri).toMatch(/^data:audio\/wav;base64,[A-Za-z0-9+/]+=*$/);
    expect(draft1.clips[s2]).toBeUndefined();
    expect(draft1.clips[s3]).toBeUndefined();

    // When includeVoiceClips is false, no segment clips are attached.
    await handler({
      text: passage,
      includeVoiceClips: false,
      segments: [{ id: 'c1', text: s1, blob: makeWavBlob(0.2), mimeType: 'audio/wav' }],
    });
    expect(redirected).toHaveLength(2);
    expect(redirected[1].draft.clips).toEqual({});
  });

  it('enforces 2 MB per-clip skip and 18 MB total clip budget cap', async () => {
    const redirected = [];
    const fakeWin = {
      AlloModules: window.AlloModules,
      AlloPacketHandoff: {
        redirectDraft: vi.fn(async (draft) => { redirected.push(draft); return true; }),
      },
      btoa: window.btoa.bind(window),
    };
    // Test arrayBuffer fallback directly (FileReader absent).
    const handler = extractHandleSendToReadAlongPacket({ window: fakeWin, FileReader: undefined });

    // Build 14 distinct sentences. Sentence 1 has a 2.1 MB clip (must be skipped > 2 MB);
    // sentences 2..14 each have a 1.3 MB WAV blob (~1.73 MB base64 URI each, <= 2 MB).
    // 10 clips * ~1.73 MB = ~17.3 MB <= 18 MB; 11th would exceed 18 MB so loop must stop cleanly!
    const topics = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november'];
    const sentences = topics.map((word, i) => `Sentence number ${i + 1} explores distinct science topic ${word}.`);
    const segments = sentences.map((sent, idx) => ({
      id: `cap-${idx}`,
      text: sent,
      blob: makeSyntheticSizedWavBlob(idx === 0 ? (2 * 1024 * 1024 + 1024) : Math.floor(1.3 * 1024 * 1024)),
      mimeType: 'audio/wav',
    }));

    const ok = await handler({ text: sentences.join(' '), includeVoiceClips: true, segments });
    expect(ok).toBe(true);
    expect(redirected).toHaveLength(1);

    const clips = redirected[0].clips;
    // Sentence 0 (> 2 MB) skipped; subsequent valid clips still included up to 18 MB total.
    expect(clips[sentences[0]]).toBeUndefined();
    const keptKeys = Object.keys(clips);
    expect(keptKeys.length).toBe(10);
    const totalUriBytes = keptKeys.reduce((sum, k) => sum + clips[k].uri.length, 0);
    expect(totalUriBytes).toBeLessThanOrEqual(18 * 1024 * 1024);
    expect(totalUriBytes).toBeGreaterThan(15 * 1024 * 1024);
    for (const k of keptKeys) {
      expect(clips[k].uri.length).toBeLessThanOrEqual(2 * 1024 * 1024);
      expect(clips[k].source).toBe('teacher');
    }
  });

  it('works with inline aligner fallback when SpeechSetup module is not loaded and converts via FileReader.readAsDataURL', async () => {
    const redirected = [];
    const readerCalled = vi.fn();
    class MockFileReader {
      readAsDataURL(blob) {
        readerCalled(blob);
        this.result = 'data:audio/wav;base64,' + Buffer.from(makeWavBytes(0.1)).toString('base64');
        if (typeof this.onload === 'function') this.onload();
      }
    }
    const fakeWin = {
      AlloModules: {},
      FileReader: MockFileReader,
      AlloPacketHandoff: {
        redirectDraft: vi.fn(async (draft) => { redirected.push(draft); return true; }),
      },
      btoa: window.btoa.bind(window),
    };
    const handler = extractHandleSendToReadAlongPacket({ window: fakeWin, FileReader: MockFileReader });

    const s1 = 'Oceans hold most of Earth water.';
    const s2 = 'Clouds form when vapor cools.';
    const ok = await handler({
      text: `${s1} ${s2}`,
      includeVoiceClips: true,
      segments: [
        { id: 'f1', text: 'oceans hold most of earth water', blob: makeWavBlob(0.1), mimeType: 'audio/wav' },
        { id: 'f-merged', text: `${s1} ${s2}`, blob: makeWavBlob(0.2), mimeType: 'audio/wav' },
      ],
    });
    expect(ok).toBe(true);
    expect(readerCalled).toHaveBeenCalledTimes(1);
    expect(Object.keys(redirected[0].clips)).toEqual([s1]);
    expect(redirected[0].clips[s1]).toMatchObject({ source: 'teacher' });
    expect(redirected[0].clips[s1].uri).toMatch(/^data:audio\/wav;base64,/);
  });
});

describe('4. End-to-end Read-Along importDraft() compatibility with teacher voice clips', () => {
  it('hands off draft with teacher WAV clips through AlloPacketHandoff into packets-read-along.js state.clips and builds a verified offline packet', async () => {
    const idb = makeMemoryIdb();
    const s1 = 'Dr. Kim studied how green leaves make food.';
    const s2 = 'Water moves up the stem to every leaf.';
    const s3 = 'Sunlight gives energy to the whole plant.';
    const passage = `${s1} ${s2} ${s3}`;

    // Run real AlloFlowANTI.txt handleSendToReadAlongPacket writing to the shared memory IndexedDB!
    const opened = [];
    const hostWin = {
      AlloModules: window.AlloModules,
      indexedDB: idb.indexedDB,
      open: (url, target, features) => { opened.push({ url, target, features }); return {}; },
      btoa: window.btoa.bind(window),
    };
    const handler = extractHandleSendToReadAlongPacket({
      window: hostWin,
      sourceTopic: 'Teacher Voice Plants',
      FileReader: window.FileReader,
    });

    const handed = await handler({
      text: passage,
      includeVoiceClips: true,
      segments: [
        { id: 'v1', text: 'dr kim studied how green leaves make food', blob: makeWavBlob(0.25), mimeType: 'audio/wav' },
        { id: 'v2-merged', text: `${s2} ${s3}`, blob: makeWavBlob(0.5), mimeType: 'audio/wav' },
      ],
    });
    expect(handed).toBe(true);
    expect(opened).toEqual([{ url: 'packets-read-along.html#import-draft', target: '_blank', features: 'noopener' }]);
    expect(idb.backingMap.has('draft')).toBe(true);

    // Open packets-read-along.html#import-draft with the same IndexedDB and verify importDraft() populates state.clips!
    const page = await openReadAlongPage({
      url: 'https://packets.test/site/packets-read-along.html#import-draft',
      idb,
    });
    try {
      await page.until(() => page.$('f-title').value === 'Teacher Voice Plants', 'draft auto-imported');
      const st = page.w.AlloPacketReadAlongPage.state;

      expect(st.sentences.map((r) => r.text)).toEqual([s1, s2, s3]);
      expect(st.clips[s1]).toBeTruthy();
      expect(st.clips[s1].source).toBe('teacher');
      expect(st.clips[s1].uri).toMatch(/^data:audio\/wav;base64,[A-Za-z0-9+/]+=*$/);
      expect(st.clips[s2]).toBeUndefined();
      expect(st.clips[s3]).toBeUndefined();

      // Built student packet succeeds and passes strict offline verification with teacher voice clip embedded.
      await page.until(() => st.built && st.built.html && !page.$('save').hidden, 'packet built');
      const verified = VERIFY.verifyPacket(st.built.html);
      expect(verified.ok).toBe(true);
      expect(verified.counts.notExpected).toBe(0);
      expect(st.made.recorded).toBe(1);
    } finally {
      page.dom.window.close();
    }
  }, 45000);
});
