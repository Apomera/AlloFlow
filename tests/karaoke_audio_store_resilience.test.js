import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let KS;
let AudioHelpers;
let nextBlobId;

const b64 = (size, byte = 65) => Buffer.alloc(size, byte).toString('base64');
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const hash8 = (file) => createHash('sha256').update(read(file)).digest('hex').slice(0, 8);

beforeAll(() => {
  loadAlloModule('audio_helpers_module.js');
  loadAlloModule('karaoke_audio_store_module.js');
  AudioHelpers = window.AlloModules.AudioHelpers;
  KS = window.AlloModules.KaraokeAudioStore;
  if (!KS) throw new Error('KaraokeAudioStore did not register');
});

beforeEach(() => {
  nextBlobId = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:stored-' + (++nextBlobId)),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

describe('KaraokeAudioStore resilience', () => {
  it('round-trips a saved resource with provenance and resolves without TTS generation', () => {
    const writer = KS.createStore();
    const sentence = 'Read this instantly.';
    const storedUrl = writer.put(sentence, b64(64), 'audio/mpeg', 'ai-played', {
      voice: 'Kore',
      speed: 0.9,
      language: 'English',
      provider: 'played-tts-mp3',
      createdAt: '2026-07-13T12:00:00.000Z',
    });
    expect(storedUrl).toBeTruthy();

    // This mirrors project/resource JSON serialization, reload, and hydration.
    const transferredResource = JSON.parse(JSON.stringify({
      id: 'leveled-roundtrip',
      type: 'simplified',
      karaokeAudio: writer.serialize(),
    }));
    const reader = KS.createStore();
    expect(reader.hydrate(transferredResource.karaokeAudio)).toBe(1);

    const synthesize = vi.fn(() => 'blob:new-tts');
    const resolveAudio = (text) => reader.get(text) || synthesize(text);
    expect(resolveAudio(sentence)).toMatch(/^blob:stored-/);
    expect(synthesize).not.toHaveBeenCalled();
    expect(reader.metadataOf(sentence)).toEqual({
      voice: 'Kore',
      speed: 0.9,
      language: 'English',
      provider: 'played-tts-mp3',
      createdAt: '2026-07-13T12:00:00.000Z',
    });

    const payload = reader.serialize();
    expect(payload.version).toBe(3);
    expect(payload.sources[KS.keyFor(sentence)]).toBe('ai-played');
  });

  it('hydrates legacy v2 payloads without requiring metadata', () => {
    const sentence = 'Legacy clip.';
    const key = KS.keyFor(sentence);
    const store = KS.createStore();
    expect(store.hydrate({
      version: 2,
      format: 'per-entry',
      sentences: { [key]: b64(32) },
      mimes: { [key]: 'audio/mpeg' },
      sources: { [key]: 'ai' },
    })).toBe(1);
    expect(store.has(sentence)).toBe(true);
    expect(store.metadataOf(sentence)).toBeNull();
  });

  it('splits with the same boundaries playback uses, so store keys converge across paths', () => {
    // Aaron's 2026-07-15/16 repro: Save-TTS/capture keyed off KS.splitSentences
    // while playback (phase_k handleSpeak/playSequence) keyed off
    // PureHelpers.splitTextToSentences. When those diverge (line-splitting or a
    // length cap on ONE side), prepped clips stop serving playback and captured
    // clips never appear in Edit Audio. The exported splitter must therefore
    // delegate to the app's canonical splitter, whatever the input shape.
    loadAlloModule('pure_helpers_module.js');
    const PH = window.AlloModules.PureHelpers;
    expect(typeof PH.splitTextToSentences).toBe('function');

    const longSentence = 'This deliberately long sentence keeps going with clause after clause, ' +
      'so that any hidden length cap inside the karaoke splitter would cut it into ' +
      'multiple units and orphan the clip playback stores under the whole sentence.';
    const paragraph = `A heading without punctuation\nDr. Rivera explains photosynthesis. ${longSentence}`;

    const storeUnits = KS.splitSentences(paragraph);
    const playbackUnits = PH.splitTextToSentences(paragraph.replace(/\s+/g, ' ').trim(), {});
    expect(storeUnits.map(KS.keyFor)).toEqual(playbackUnits.map(KS.keyFor));

    // The symptom-level contract: a clip captured under the sentence playback
    // spoke is found under the sentence the prep/edit list enumerates.
    const store = KS.createStore();
    playbackUnits.forEach((sentence) => {
      expect(store.put(sentence, b64(32), 'audio/mpeg', 'ai-played')).toBeTruthy();
    });
    storeUnits.forEach((sentence) => {
      expect(store.has(sentence)).toBe(true);
      expect(store.get(sentence)).toMatch(/^blob:stored-/);
    });
    expect(store.missing(storeUnits)).toEqual([]);
  });

  it('encodes MP3 cooperatively so background capture yields to playback', async () => {
    const yieldToMain = vi.fn(() => Promise.resolve());
    const encodeBuffer = vi.fn(() => new Uint8Array([1, 2, 3]));
    const flush = vi.fn(() => new Uint8Array([4, 5]));
    window.lamejs = {
      Mp3Encoder: class {
        encodeBuffer(samples) { return encodeBuffer(samples); }
        flush() { return flush(); }
      },
    };

    const pcm = new Uint8Array(new Int16Array(1152 * 3).buffer);
    const blob = await AudioHelpers.pcmToMp3Async(pcm, 24000, 64, {
      blocksPerYield: 1,
      yieldToMain,
    });

    expect(blob.type).toBe('audio/mp3');
    expect(encodeBuffer).toHaveBeenCalledTimes(3);
    expect(yieldToMain).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenCalledTimes(1);
    delete window.lamejs;
  });

  it('rejects an oversized clip without destroying the previously saved take', () => {
    const store = KS.createStore();
    const firstUrl = store.put('One sentence.', b64(100), 'audio/mpeg', 'ai', null, {
      maxBytes: 4096,
      maxClipBytes: 1024,
    });
    expect(firstUrl).toBeTruthy();

    const replacement = store.put('One sentence.', b64(1200), 'audio/mpeg', 'ai', null, {
      maxBytes: 4096,
      maxClipBytes: 1024,
    });
    expect(replacement).toBeNull();
    expect(store.get('One sentence.')).toBe(firstUrl);
    expect(store.lastPutError()).toMatchObject({
      code: 'clip-too-large',
      maxClipBytes: 1024,
    });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('enforces the per-resource byte budget and reports actionable limits', () => {
    const store = KS.createStore();
    expect(store.put('First.', b64(800), 'audio/mpeg', 'ai', null, {
      maxBytes: 1024,
      maxClipBytes: 1024,
    })).toBeTruthy();
    expect(store.put('Second.', b64(400), 'audio/mpeg', 'ai', null, {
      maxBytes: 1024,
      maxClipBytes: 1024,
    })).toBeNull();
    expect(store.lastPutError()).toMatchObject({
      code: 'resource-limit',
      maxBytes: 1024,
    });
    expect(store.size()).toBe(1);
  });
});

describe('karaoke capture integration contracts', () => {
  it('coalesces duplicate captures, retries transient reads, and preserves resource identity', () => {
    const host = read('AlloFlowANTI.txt');
    expect(host).toContain('if (_karaokeCaptureInFlight.has(captureKey)) return _karaokeCaptureInFlight.get(captureKey);');
    expect(host).toContain('for (let attempt = 0; attempt < 2; attempt++)');
    expect(host).toContain("const captureKey = String(resourceId || 'unsaved') + '::' + sentenceKey;");
    expect(host).toContain("_persistKaraokeAudioField('karaokeAudio', st.serialize(), resourceId);");
    expect(host).toContain("if (resourceId && gc.id !== resourceId) return gc;");
  });

  it('keeps saved karaoke audio in offline/project resource serialization', () => {
    const host = read('AlloFlowANTI.txt');
    expect(host).toContain('if (!stripImages && item.karaokeAudio) serializedItem.karaokeAudio = item.karaokeAudio;');
    expect(host).toContain('if (!stripImages && item.karaokeStudentAudio) serializedItem.karaokeStudentAudio = item.karaokeStudentAudio;');
  });

  it('pins every karaoke runtime loader to the generated content hash', () => {
    const host = read('AlloFlowANTI.txt');
    const build = read('build.js');
    [
      'karaoke_audio_store_module.js',
      'immersive_reader_module.js',
      'view_simplified_module.js',
    ].forEach((file) => {
      expect(host).toContain(file + '?v=' + hash8(file));
      expect(build).toContain("'" + file + "'");
      expect(read(file)).toBe(read('prismflow-deploy/public/' + file));
    });
  });
});