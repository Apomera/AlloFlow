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

  it('treats heading lines and blank lines as unit boundaries on every path', () => {
    // Aaron's 2026-07-16 repro (the "Dreams" leveled text): "## What Dreams
    // Are\nYour body rests..." merged the heading into the first body
    // sentence — the reader painted that whole sentence as a header, TTS
    // spoke both as one clip, and the whole-text splitter (edit/prep/overlay)
    // additionally swallowed the terminator-less "# Dreams" title into the
    // next paragraph while per-paragraph playback did not, so keys diverged
    // and Save-TTS pruned the captured clips.
    loadAlloModule('pure_helpers_module.js');
    const PH = window.AlloModules.PureHelpers;
    const doc = '# Dreams\n\n## What Dreams Are\nYour body rests when you sleep. ' +
      'A dream is a group of pictures.\n\nYour brain works hard all night.';

    // Headings are standalone units; body sentences stand alone.
    const wholeText = KS.splitSentences(doc);
    expect(wholeText).toEqual([
      '# Dreams',
      '## What Dreams Are',
      'Your body rests when you sleep.',
      'A dream is a group of pictures.',
      'Your brain works hard all night.',
    ]);

    // Whole-text (edit/prep/overlay) and per-paragraph (playback/view) callers
    // must produce identical units and identical keys.
    const perParagraph = doc.split(/\n{2,}/).flatMap(p => PH.splitTextToSentences(p, {}));
    expect(wholeText.map(KS.keyFor)).toEqual(perParagraph.map(KS.keyFor));
  });

  it('converges raw and sanitized spellings of the same sentence on one key', () => {
    // Capture stores the SPOKEN spelling (markdown stripped by phase_k
    // sanitizeTtsText); the edit/prep list enumerates the raw resource
    // spelling. Both must resolve the same clip or captures are invisible to
    // Edit Audio and Save-TTS's prune deletes them as stale.
    const store = KS.createStore();
    expect(store.put('What Dreams Are', b64(32), 'audio/mpeg', 'ai-played')).toBeTruthy();
    expect(store.get('## What Dreams Are')).toMatch(/^blob:stored-/);
    expect(KS.keyFor('## What Dreams Are')).toBe(KS.keyFor('What Dreams Are'));
    expect(KS.keyFor('**bold** and *italic* text')).toBe(KS.keyFor('bold and italic text'));
    expect(KS.keyFor('- A list item sentence.')).toBe(KS.keyFor('A list item sentence.'));
    expect(KS.keyFor('See [the guide](https://example.com).')).toBe(KS.keyFor('See the guide.'));
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

describe('KaraokeAudioStore v4 identity migration', () => {
  const profile = {
    voice: 'Kore',
    language: 'English',
    synthesisRate: 1,
    provider: 'gemini',
    voiceResolverVersion: 2,
  };
  const segment = (overrides = {}) => ({
    identityVersion: 4,
    adapterId: 'faq',
    adapterVersion: 1,
    scopeId: 'main',
    segmentId: 'answer/0',
    spokenFingerprint: 'sha256:answer-zero',
    spokenText: 'An exact spoken answer.',
    ...overrides,
  });

  it('isolates repeated text by stable segment identity without resource ids in the portable key', () => {
    const store = KS.createStore();
    const first = segment({ segmentId: 'answer/0' });
    const second = segment({ segmentId: 'answer/1' });

    expect(store.put(first, b64(32, 65), 'audio/mpeg', 'ai', profile)).toMatch(/^blob:stored-/);
    expect(store.put(second, b64(32, 66), 'audio/wav', 'human-teacher', null)).toMatch(/^blob:stored-/);
    expect(store.size()).toBe(2);
    expect(store.getCompatible(first, profile)).toMatch(/^blob:stored-/);
    expect(store.getCompatible(second, { voice: 'Puck' })).toMatch(/^blob:stored-/);

    const payload = store.serialize();
    expect(payload.version).toBe(4);
    expect(Object.values(payload.entries)).toHaveLength(2);
    expect(Object.values(payload.entries).map(entry => entry.mime).sort()).toEqual(['audio/mpeg', 'audio/wav']);
    expect(Object.values(payload.entries).find(entry => entry.identity.segmentId === 'answer/0')).toMatchObject({
      source: 'ai',
      synthesisProfile: {
        voice: 'Kore',
        language: 'English',
        synthesisRate: 1,
        provider: 'gemini',
        voiceResolverVersion: 2,
      },
    });

    expect(KS.portableKeyForIdentity({ ...first, resourceId: 'resource-a' }))
      .toBe(KS.portableKeyForIdentity({ ...first, resourceId: 'resource-b' }));
    const otherResourceStore = KS.createStore();
    expect(otherResourceStore.has(first)).toBe(false);
  });

  it('round-trips v4 entries together with unmatched legacy audio', () => {
    const writer = KS.createStore();
    const identity = segment();
    expect(writer.put('A legacy teacher note.', b64(24), 'audio/wav', 'human-teacher')).toBeTruthy();
    expect(writer.put(identity, b64(48), 'audio/mpeg', 'ai-played', profile)).toBeTruthy();

    const payload = JSON.parse(JSON.stringify(writer.serialize()));
    expect(payload.version).toBe(4);
    expect(payload.legacy.version).toBe(3);
    expect(payload.legacy.sources[KS.keyFor('A legacy teacher note.')]).toBe('human-teacher');

    const reader = KS.createStore();
    expect(reader.hydrate(payload)).toBe(2);
    expect(reader.getCompatible(identity, profile)).toMatch(/^blob:stored-/);
    expect(reader.sourceOf(identity)).toBe('ai-played');
    expect(reader.get('A legacy teacher note.')).toMatch(/^blob:stored-/);
    expect(reader.sourceOf('A legacy teacher note.')).toBe('human-teacher');
    expect(reader.serialize().version).toBe(4);
  });

  it('promotes only compatible exact legacy AI matches and leaves stale clips in the legacy lane', () => {
    const sentence = 'Promote this exact sentence.';
    const legacyWriter = KS.createStore();
    expect(legacyWriter.put(sentence, b64(32), 'audio/mpeg', 'ai', {
      voice: 'Kore',
      speed: 1,
      language: 'English',
      voiceResolverVersion: 2,
    })).toBeTruthy();

    const readyStore = KS.createStore();
    expect(readyStore.hydrate(legacyWriter.serialize())).toBe(1);
    const identity = segment({ spokenText: sentence, spokenFingerprint: 'sha256:promote' });
    expect(readyStore.inspect(identity, profile)).toMatchObject({
      status: 'ready',
      source: 'ai',
      legacy: false,
    });
    const promoted = readyStore.serialize();
    expect(promoted.version).toBe(4);
    expect(Object.values(promoted.entries)).toHaveLength(1);
    expect(promoted.legacy.sentences).not.toHaveProperty(KS.keyFor(sentence));

    const staleStore = KS.createStore();
    expect(staleStore.hydrate(legacyWriter.serialize())).toBe(1);
    expect(staleStore.getCompatible(identity, { ...profile, voice: 'Puck' })).toBeNull();
    expect(staleStore.inspect(identity, { ...profile, voice: 'Puck' }).status).toBe('stale');
    expect(staleStore.serialize().version).toBe(3);
    expect(staleStore.has(sentence)).toBe(true);
  });

  it('reads a compatible legacy human recording without promotion or payload growth', () => {
    const sentence = 'Keep the teacher recording.';
    const legacyWriter = KS.createStore();
    expect(legacyWriter.put(sentence, b64(32), 'audio/wav', 'human-teacher')).toBeTruthy();

    const store = KS.createStore();
    expect(store.hydrate(legacyWriter.serialize())).toBe(1);
    const identity = segment({ spokenText: sentence, spokenFingerprint: 'sha256:human' });
    const beforeSize = store.size();
    const beforeBytes = store.estimateBytes();
    const beforePayload = store.serialize();
    const beforeBlobCount = URL.createObjectURL.mock.calls.length;

    expect(store.inspect(identity, { voice: 'Puck' })).toMatchObject({
      status: 'ready',
      source: 'human-teacher',
      legacy: true,
    });
    expect(store.getCompatible(identity, { voice: 'Kore' })).toMatch(/^blob:stored-/);
    expect(store.has(identity)).toBe(true);
    expect(store.size()).toBe(beforeSize);
    expect(store.estimateBytes()).toBe(beforeBytes);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(beforeBlobCount);
    expect(store.serialize()).toEqual(beforePayload);
    expect(store.serialize()).toMatchObject({ version: 3 });
    expect(store.serialize()).not.toHaveProperty('entries');
  });
  it('protects an identity human recording from automatic AI replacement', () => {
    const store = KS.createStore();
    const identity = segment();
    const humanUrl = store.put(identity, b64(32, 65), 'audio/wav', 'human-teacher');
    expect(humanUrl).toBeTruthy();

    expect(store.put(identity, b64(32, 66), 'audio/mpeg', 'ai', profile)).toBeNull();
    expect(store.lastPutError()).toMatchObject({ code: 'human-recording-protected' });
    expect(store.get(identity)).toBe(humanUrl);
    expect(store.sourceOf(identity)).toBe('human-teacher');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    // A deliberate replacement with another human take remains safe.
    expect(store.put(identity, b64(32, 67), 'audio/wav', 'human-student')).toBeTruthy();
    expect(store.sourceOf(identity)).toBe('human-student');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(humanUrl);
  });

  it('allows an explicit AI replacement when allowReplaceHuman is true', () => {
    const store = KS.createStore();
    const identity = segment();
    const humanUrl = store.put(identity, b64(32), 'audio/wav', 'human-teacher');
    expect(humanUrl).toBeTruthy();

    const aiUrl = store.put(identity, b64(48), 'audio/mpeg', 'ai', profile, {
      allowReplaceHuman: true,
    });
    expect(aiUrl).toBeTruthy();
    expect(aiUrl).not.toBe(humanUrl);
    expect(store.sourceOf(identity)).toBe('ai');
    expect(store.getCompatible(identity, profile)).toBe(aiUrl);
    expect(store.lastPutError()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(humanUrl);
  });

  it('protects human recordings in the legacy lane, including identity writes with matching text', () => {
    const sentence = 'A protected legacy recording.';
    const sameLane = KS.createStore();
    const humanUrl = sameLane.put(sentence, b64(32), 'audio/wav', 'human-teacher');
    expect(humanUrl).toBeTruthy();
    expect(sameLane.put(sentence, b64(32, 66), 'audio/mpeg', 'ai', profile)).toBeNull();
    expect(sameLane.lastPutError()).toMatchObject({ code: 'human-recording-protected' });
    expect(sameLane.get(sentence)).toBe(humanUrl);
    expect(sameLane.sourceOf(sentence)).toBe('human-teacher');

    const crossLane = KS.createStore();
    expect(crossLane.put(sentence, b64(32), 'audio/wav', 'human-teacher')).toBeTruthy();
    const identity = segment({ spokenText: sentence, spokenFingerprint: 'sha256:protected-legacy' });
    expect(crossLane.put(identity, b64(32, 66), 'audio/mpeg', 'ai', profile)).toBeNull();
    expect(crossLane.lastPutError()).toMatchObject({ code: 'human-recording-protected' });
    expect(crossLane.size()).toBe(1);

    expect(crossLane.put(identity, b64(32, 67), 'audio/mpeg', 'ai', profile, {
      allowReplaceHuman: true,
    })).toBeTruthy();
    expect(crossLane.size()).toBe(1);
    expect(crossLane.sourceOf(identity)).toBe('ai');
    expect(crossLane.serialize().legacy.sentences).not.toHaveProperty(KS.keyFor(sentence));
  });

  it('lets legacy string removal delete one unique v4 match but never guess among repeated text', () => {
    const sentence = 'Remove this portable segment.';
    const uniqueStore = KS.createStore();
    const uniqueIdentity = segment({
      spokenText: sentence,
      spokenFingerprint: 'sha256:unique-removal',
    });
    expect(uniqueStore.put(sentence, b64(24), 'audio/wav', 'human-teacher')).toBeTruthy();
    expect(uniqueStore.put(uniqueIdentity, b64(32), 'audio/wav', 'human-teacher')).toBeTruthy();
    expect(uniqueStore.size()).toBe(2);

    uniqueStore.remove(sentence);
    expect(uniqueStore.size()).toBe(0);
    expect(uniqueStore.has(uniqueIdentity)).toBe(false);
    expect(uniqueStore.get(sentence)).toBeNull();

    const repeatedStore = KS.createStore();
    const first = segment({
      segmentId: 'repeat/0',
      spokenText: sentence,
      spokenFingerprint: 'sha256:repeat-zero',
    });
    const second = segment({
      segmentId: 'repeat/1',
      spokenText: sentence,
      spokenFingerprint: 'sha256:repeat-one',
    });
    expect(repeatedStore.put(first, b64(32, 65), 'audio/mpeg', 'ai', profile)).toBeTruthy();
    expect(repeatedStore.put(second, b64(32, 66), 'audio/mpeg', 'ai', profile)).toBeTruthy();

    repeatedStore.remove(sentence);
    expect(repeatedStore.size()).toBe(2);
    expect(repeatedStore.has(first)).toBe(true);
    expect(repeatedStore.has(second)).toBe(true);
  });
  it('enforces clip and resource limits before creating legacy hydration blobs', () => {
    const store = KS.createStore();
    const payload = {
      version: 3,
      format: 'per-entry',
      sentences: {
        'Zulu later.': b64(700, 90),
        'Alpha first.': b64(700, 65),
        'Oversized clip.': b64(1200, 79),
      },
      mimes: {
        'Zulu later.': 'audio/mpeg',
        'Alpha first.': 'audio/wav',
        'Oversized clip.': 'audio/mpeg',
      },
      sources: {
        'Zulu later.': 'ai',
        'Alpha first.': 'human-teacher',
        'Oversized clip.': 'ai',
      },
    };

    expect(store.hydrate(payload, { maxBytes: 1024, maxClipBytes: 1024 })).toBe(1);
    expect(store.has('Alpha first.')).toBe(true);
    expect(store.sourceOf('Alpha first.')).toBe('human-teacher');
    expect(store.has('Zulu later.')).toBe(false);
    expect(store.has('Oversized clip.')).toBe(false);
    expect(store.estimateBytes()).toBe(700);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('enforces clip and resource limits before creating v4 hydration blobs', () => {
    const alpha = segment({
      segmentId: 'hydrate/a',
      spokenText: 'Alpha portable clip.',
      spokenFingerprint: 'sha256:hydrate-alpha',
    });
    const zulu = segment({
      segmentId: 'hydrate/z',
      spokenText: 'Zulu portable clip.',
      spokenFingerprint: 'sha256:hydrate-zulu',
    });
    const oversized = segment({
      segmentId: 'hydrate/oversized',
      spokenText: 'Oversized portable clip.',
      spokenFingerprint: 'sha256:hydrate-oversized',
    });
    const entry = (identity, audio) => ({
      identity,
      audio,
      mime: 'audio/mpeg',
      source: 'ai',
      synthesisProfile: profile,
    });
    const payload = {
      version: 4,
      format: 'per-entry',
      entries: {
        'z-entry': entry(zulu, b64(700, 90)),
        'a-entry': entry(alpha, b64(700, 65)),
        'oversized-entry': entry(oversized, b64(1200, 79)),
      },
      legacy: {
        version: 3,
        format: 'per-entry',
        sentences: {},
        mimes: {},
        sources: {},
        metadata: {},
      },
    };

    const store = KS.createStore();
    expect(store.hydrate(payload, { maxBytes: 1024, maxClipBytes: 1024 })).toBe(1);
    expect(store.has(alpha)).toBe(true);
    expect(store.has(zulu)).toBe(false);
    expect(store.has(oversized)).toBe(false);
    expect(store.estimateBytes()).toBe(700);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('matches an explicitly requested resolver version and defaults legacy callers to v2', () => {
    const v3Profile = { ...profile, voiceResolverVersion: 3 };
    const identityStore = KS.createStore();
    const identity = segment({ segmentId: 'resolver/v3' });
    const identityUrl = identityStore.put(identity, b64(32), 'audio/mpeg', 'ai', v3Profile);
    expect(identityUrl).toBeTruthy();
    expect(identityStore.getCompatible(identity, v3Profile)).toBe(identityUrl);
    expect(identityStore.getCompatible(identity, { ...profile, voiceResolverVersion: 2 })).toBeNull();
    expect(identityStore.getCompatible(identity, { voice: 'Kore' })).toBeNull();

    const legacyStore = KS.createStore();
    const sentence = 'Resolver version three.';
    const legacyUrl = legacyStore.put(sentence, b64(32), 'audio/mpeg', 'ai', {
      voice: 'Kore',
      speed: 1,
      language: 'English',
      voiceResolverVersion: 3,
    });
    expect(legacyStore.getCompatible(sentence, v3Profile)).toBe(legacyUrl);
    expect(legacyStore.getCompatible(sentence, { voice: 'Kore' })).toBeNull();
  });

  it('keeps repeated-text identities exact while legacy string reads choose a compatible entry', () => {
    const sentence = 'The same words can belong to distinct segments.';
    const aiIdentity = segment({
      segmentId: 'repeat/a-ai',
      spokenText: sentence,
      spokenFingerprint: 'sha256:repeat-ai',
    });
    const humanIdentity = segment({
      segmentId: 'repeat/z-human',
      spokenText: sentence,
      spokenFingerprint: 'sha256:repeat-human',
    });
    const store = KS.createStore();
    const aiUrl = store.put(aiIdentity, b64(32, 65), 'audio/mpeg', 'ai', {
      ...profile,
      voice: 'Puck',
    });
    const humanUrl = store.put(humanIdentity, b64(32, 66), 'audio/wav', 'human-teacher');
    expect(store.get(aiIdentity)).toBe(aiUrl);
    expect(store.get(humanIdentity)).toBe(humanUrl);
    expect(store.has(sentence)).toBe(true);
    expect(store.get(sentence)).toBe(humanUrl);
    expect(store.getCompatible(sentence, { voice: 'Kore' })).toBe(humanUrl);
    expect(store.sourceOf(sentence)).toBe('human-teacher');
    expect(store.metadataOf(sentence)).toEqual({ createdAt: expect.any(String) });

    store.remove(sentence);
    expect(store.size()).toBe(2);
    expect(store.has(aiIdentity)).toBe(true);
    expect(store.has(humanIdentity)).toBe(true);

    const aiOnly = KS.createStore();
    const puckIdentity = segment({
      segmentId: 'compatible/a-puck',
      spokenText: sentence,
      spokenFingerprint: 'sha256:compatible-puck',
    });
    const koreIdentity = segment({
      segmentId: 'compatible/z-kore',
      spokenText: sentence,
      spokenFingerprint: 'sha256:compatible-kore',
    });
    const puckUrl = aiOnly.put(puckIdentity, b64(32, 67), 'audio/mpeg', 'ai', {
      ...profile,
      voice: 'Puck',
    });
    const koreUrl = aiOnly.put(koreIdentity, b64(32, 68), 'audio/mpeg', 'ai', profile);
    expect(aiOnly.get(sentence)).toBe(puckUrl);
    expect(aiOnly.getCompatible(sentence, profile)).toBe(koreUrl);
    expect(aiOnly.metadataOf(sentence)).toMatchObject({ voice: 'Puck' });
  });
  it('reports stale identity fingerprints and lets identity removal clear the stable locator', () => {
    const store = KS.createStore();
    const original = segment();
    const edited = segment({
      spokenFingerprint: 'sha256:edited',
      spokenText: 'An edited spoken answer.',
    });
    expect(store.put(original, b64(32), 'audio/mpeg', 'ai', profile)).toBeTruthy();
    expect(store.has(edited)).toBe(true);
    expect(store.sourceOf(edited)).toBe('ai');
    expect(store.metadataOf(edited)).toMatchObject({ voice: 'Kore' });
    expect(store.inspect(edited, profile).status).toBe('stale');
    expect(store.missing([edited], profile)).toEqual([edited]);

    store.remove(edited);
    expect(store.size()).toBe(0);
    expect(store.inspect(original, profile).status).toBe('missing');
  });
});
describe('karaoke capture integration contracts', () => {
  it('coalesces duplicate captures, retries transient reads, and preserves resource identity', () => {
    const host = read('AlloFlowANTI.txt');
    expect(host).toContain('if (_karaokeCaptureInFlight.has(captureKey)) return _karaokeCaptureInFlight.get(captureKey);');
    expect(host).toContain('for (let attempt = 0; attempt < 2; attempt++)');
    expect(host).toContain("const captureKey = String(resourceId || 'unsaved') + '::' + sentenceKey;");
    expect(host).toContain("_persistKaraokeAudioField('karaokeAudio', st.serialize(), resourceId);");
    expect(host).toContain("if (resourceId && currentId && String(currentId) !== String(resourceId)) return gc;");
    expect(host).toContain("return _legacyReadAloudApi.capturePlayed(sentence, url);");
  });

  it('re-synthesizes stored AI takes when the selected voice changes, never human takes', () => {
    // Voice-blind lookups replayed clips captured under Puck after the user
    // switched to Kore, and the has() guard blocked capture from ever
    // replacing them. Playback lookup, capture, and Save-TTS prep all route
    // the mismatch check; human recordings stay voice-setting-independent.
    const host = read('AlloFlowANTI.txt');
    expect(host).toContain('const _karaokeAiVoiceMismatch = (st, sentence) => {');
    expect(host).toContain("if (src.indexOf('human') === 0) return false;");
    expect(host.match(/if \(st\.has\(sentence\) && !_karaokeAiVoiceMismatch\(st, sentence\)\) return false;/g) || []).toHaveLength(2);
    expect(host).toContain('const todo = list.filter(s => _missingSet.has(s) || _karaokeAiVoiceMismatch(st, s));');

    const phaseK = read('phase_k_helpers_module.js');
    expect(phaseK).toContain('const getStoredReadAloudUrl = (storeSentence, spokenSentence, currentVoice) => {');
    expect(phaseK).toContain('getStoredReadAloudUrl(sentences[index], audioStoreSentence, currentVoice)');
    expect(phaseK).toContain('getStoredReadAloudUrl(sentences[targetIdx], textToPreload, targetVoice)');
    expect(read('phase_k_helpers_source.jsx')).toContain('getStoredReadAloudUrl(sentences[index], audioStoreSentence, currentVoice)');
  });

  it('routes every leveled-text TTS entry point through the selected voice', () => {
    // TTS callers must pass the live selection and use Kore only as the
    // application default when no selection exists.
    const host = read('AlloFlowANTI.txt');
    expect(host).not.toMatch(/callTTS\(text, 'Puck'/);
    expect(host).toContain("const _voice = window.__alloSelectedVoice || 'Kore';");
    expect(host).not.toMatch(/callTTS\(sentenceText\)/);
    expect(host).not.toMatch(/callTTS\(items\[i\]\.text\)/);
    expect(host).not.toMatch(/callTTS\(items\[idx\]\.text\)/);
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
      'tts_module.js',
      'immersive_reader_module.js',
      'view_simplified_module.js',
    ].forEach((file) => {
      expect(host).toContain(file + '?v=' + hash8(file));
      expect(build).toContain("'" + file + "'");
      expect(read(file)).toBe(read('desktop/web-app/public/' + file));
    });
  });

  it('host playSequence wrapper honors the module 11-arg recursion (deps never lands in contentId)', () => {
    // The PhaseK module recurses playSequence(…, speakerName, deps, contentId).
    // The host wrapper used to declare contentId as its 10th param, so the
    // module's deps object landed there — 'simplified-main' never matched,
    // silently disabling the read-aloud store AND capture for every sentence
    // after the first, and tripling preload fan-out. The wrapper must
    // disambiguate slot 10 by type and forward the REAL contentId.
    const host = read('AlloFlowANTI.txt');
    expect(host).toContain('speakerName = null, depsOrContentId = null, maybeContentId = null) => {');
    expect(host).toContain("const contentId = typeof depsOrContentId === 'string' ? depsOrContentId : maybeContentId;");
    // The trace must never serialize a non-string contentId again (a mis-typed
    // one exploded every event and truncated the diagnostics paste).
    const module = read('phase_k_helpers_source.jsx');
    expect(module).toContain('const _pkTraceId = (value) => {');
    expect(module).not.toContain('contentId: contentId || null');
    // The active sentence rides the interactive lane, never behind bulk preloads.
    expect(module).toContain("{ maxRetries: 2, priority: 'interactive', reason: 'read-aloud-active' }");
  });
});
