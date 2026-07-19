import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let createReadAloudAudioService;
let createReadAloudLegacyBridge;
let KaraokeAudioStore;
let nextBlobId;

const clipB64 = (label) => Buffer.from('audio:' + label).toString('base64');

const resourceAdapter = {
  enumerate: (resource) => resource?.parts || [],
  spokenText: (part) => part.text,
  fields: (part) => ({
    segmentId: part.id,
    storageKey: part.storeKey || part.text,
    ...(part.profile ? { synthesisProfile: part.profile } : {}),
  }),
};

beforeAll(() => {
  loadAlloModule('karaoke_audio_store_module.js');
  loadAlloModule('read_aloud_audio_service_module.js');
  KaraokeAudioStore = window.AlloModules.KaraokeAudioStore;
  createReadAloudAudioService = window.AlloModules.createReadAloudAudioService;
  createReadAloudLegacyBridge = window.AlloModules.createReadAloudLegacyBridge;
  if (!KaraokeAudioStore || !createReadAloudAudioService || !createReadAloudLegacyBridge) {
    throw new Error('ReadAloudAudioService dependencies did not register');
  }
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

function makeHarness(options = {}) {
  let resource = options.resource || {
    id: 'faq-1',
    parts: [
      { id: 'a', text: 'First answer.' },
      { id: 'b', text: 'Second answer.' },
      { id: 'c', text: 'Third answer.' },
    ],
  };
  let profile = options.profile || {
    voice: 'Kore',
    language: 'English',
    synthesisRate: 1,
    provider: 'gemini',
    voiceResolverVersion: 2,
  };
  let storeModule = options.storeModule || {
    createStore: KaraokeAudioStore.createStore,
    current: options.store || KaraokeAudioStore.createStore(),
  };
  const synthesize = options.synthesize || vi.fn(async ({ segment }) => ({
    url: 'blob:synth-' + segment.segmentId,
    b64: clipB64('synth-' + segment.segmentId),
    mime: 'audio/mpeg',
  }));
  const encode = options.encode;
  const persist = options.persist || vi.fn(async () => {});
  const eventSink = options.events || vi.fn();
  const getStoreModule = vi.fn(() => storeModule);
  const getResource = vi.fn(() => resource);
  const getSynthesisProfile = vi.fn(() => profile);
  const normalize = options.normalize || vi.fn((text) => String(text || '').replace(/\*\*/g, '').trim());

  const service = createReadAloudAudioService({
    getStoreModule,
    getResource,
    getSynthesisProfile,
    synthesize,
    ...(encode ? { encode } : {}),
    normalize,
    persist,
    events: eventSink,
  });
  const bound = service.forResource({
    resourceId: resource.id,
    resourceType: options.resourceType || 'faq',
    adapter: options.adapter || resourceAdapter,
    lane: options.lane || 'current',
    persistencePolicy: options.persistencePolicy || 'embedded',
  });

  return {
    service,
    bound,
    synthesize,
    persist,
    eventSink,
    getStoreModule,
    getResource,
    getSynthesisProfile,
    normalize,
    get store() { return storeModule.current; },
    setStoreModule(next) { storeModule = next; },
    setResource(next) { resource = next; },
    setProfile(next) { profile = next; },
  };
}

describe('ReadAloudAudioService factory and adapters', () => {
  it('keeps module, resource, and synthesis profile lookups lazy and live', () => {
    const firstStore = KaraokeAudioStore.createStore();
    firstStore.put('First answer.', clipB64('kore'), 'audio/mpeg', 'ai', {
      voice: 'Kore', language: 'English', speed: 1, voiceResolverVersion: 2,
    });
    const harness = makeHarness({ store: firstStore });

    // Neither factory creation nor resource binding captures another module.
    expect(harness.getStoreModule).not.toHaveBeenCalled();
    expect(harness.getResource).not.toHaveBeenCalled();
    expect(harness.getSynthesisProfile).not.toHaveBeenCalled();

    expect(harness.bound.segments().map((segment) => segment.segmentId)).toEqual(['a', 'b', 'c']);
    expect(harness.getResource).toHaveBeenCalled();
    expect(harness.getStoreModule).not.toHaveBeenCalled();
    expect(harness.getSynthesisProfile).not.toHaveBeenCalled();

    const first = harness.bound.inspect('a');
    expect(first.status).toBe('ready');
    expect(first.metadata.voice).toBe('Kore');

    const secondStore = KaraokeAudioStore.createStore();
    secondStore.put('First answer.', clipB64('puck'), 'audio/mpeg', 'ai', {
      voice: 'Puck', language: 'English', speed: 1, voiceResolverVersion: 2,
    });
    harness.setStoreModule({ createStore: KaraokeAudioStore.createStore, current: secondStore });
    harness.setProfile({ voice: 'Puck', language: 'English', synthesisRate: 1, voiceResolverVersion: 2 });
    harness.setResource({ id: 'faq-1', parts: [{ id: 'a', text: 'First answer.' }] });

    const second = harness.bound.inspect('a');
    expect(second.status).toBe('ready');
    expect(second.metadata.voice).toBe('Puck');
    expect(harness.bound.segments()).toHaveLength(1);
    expect(harness.getStoreModule.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(harness.getSynthesisProfile.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('lets the adapter own enumeration, spoken text, stable fields, and per-segment profile overrides', async () => {
    const adapter = {
      enumerate: (resource) => resource.sections.flatMap((section) => section.lines),
      spokenText: (line) => line.markdown,
      fields: (line) => ({
        segmentId: 'line/' + line.key,
        storageKey: 'stable/' + line.key,
        speakerId: line.speaker,
        synthesisProfile: { voice: line.voice, directionFingerprint: line.direction },
      }),
    };
    const harness = makeHarness({
      resource: {
        id: 'adventure-1',
        sections: [{ lines: [{ key: '7', markdown: '**Welcome home.**', speaker: 'guide', voice: 'Aoede', direction: 'warm' }] }],
      },
      resourceType: 'adventure-storybook',
      adapter,
    });

    const [segment] = harness.bound.segments();
    expect(segment).toMatchObject({
      segmentId: 'line/7',
      storageKey: 'stable/7',
      spokenText: 'Welcome home.',
      speakerId: 'guide',
    });

    await harness.bound.resolve(segment);
    expect(harness.synthesize).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Welcome home.',
      profile: expect.objectContaining({ voice: 'Aoede', directionFingerprint: 'warm' }),
      resourceType: 'adventure-storybook',
    }));
  });
});

describe('ReadAloudAudioService compatibility and resolution', () => {
  it('classifies compatible, stale, human, and missing legacy-store entries', async () => {
    const store = KaraokeAudioStore.createStore();
    store.put('First answer.', clipB64('ready'), 'audio/mpeg', 'ai', {
      voice: 'Kore', language: 'English', speed: 1, voiceResolverVersion: 2,
    });
    store.put('Second answer.', clipB64('stale'), 'audio/mpeg', 'ai', {
      voice: 'Puck', language: 'English', speed: 1, voiceResolverVersion: 2,
    });
    store.put('Third answer.', clipB64('human'), 'audio/mpeg', 'human-teacher', {
      voice: 'Puck', language: 'Spanish', speed: 2,
    });
    const harness = makeHarness({
      store,
      resource: {
        id: 'faq-1',
        parts: [
          { id: 'a', text: 'First answer.' },
          { id: 'b', text: 'Second answer.' },
          { id: 'c', text: 'Third answer.' },
          { id: 'd', text: 'Fourth answer.' },
        ],
      },
    });

    expect(harness.bound.inspect('a').status).toBe('ready');
    expect(harness.bound.inspect('b').status).toBe('stale');
    expect(harness.bound.inspect('c').status).toBe('ready');
    expect(harness.bound.inspect('d').status).toBe('missing');
    expect(harness.bound.summary()).toMatchObject({ total: 4, ready: 2, stale: 1, missing: 1 });

    const storedUrl = await harness.bound.resolve('a');
    expect(storedUrl).toMatch(/^blob:stored-/);
    expect(harness.synthesize).not.toHaveBeenCalled();

    expect(await harness.bound.resolve('b')).toBe('blob:synth-b');
    expect(harness.synthesize).toHaveBeenCalledTimes(1);
    expect(harness.synthesize).toHaveBeenCalledWith(expect.objectContaining({ text: 'Second answer.' }));
  });
});

describe('ReadAloudAudioService mutation and persistence delegation', () => {
  it('captures played clips, saves recordings, regenerates, removes, serializes, and publishes events', async () => {
    const encode = vi.fn(async (audio) => ({
      b64: audio.b64 || clipB64(audio.label),
      mime: audio.mime || 'audio/mpeg',
    }));
    const harness = makeHarness({ encode });
    const listener = vi.fn();
    const unsubscribe = harness.bound.subscribe(listener);

    await harness.bound.capturePlayed('a', { label: 'played' });
    expect(harness.bound.inspect('a')).toMatchObject({ status: 'ready', source: 'ai-played' });

    await harness.bound.saveRecording('b', { label: 'teacher', mime: 'audio/wav' });
    expect(harness.bound.inspect('b')).toMatchObject({ status: 'ready', source: 'human-teacher' });

    await harness.bound.regenerate('c');
    expect(harness.synthesize).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Third answer.', reason: 'regenerate',
    }));
    expect(harness.bound.inspect('c')).toMatchObject({ status: 'ready', source: 'ai-generated' });

    const payload = harness.bound.serialize();
    expect(payload).toMatchObject({ version: 3, format: 'per-entry' });
    expect(Object.keys(payload.sentences)).toHaveLength(3);
    expect(harness.persist).toHaveBeenCalledTimes(3);
    expect(harness.persist).toHaveBeenLastCalledWith(expect.objectContaining({
      resourceId: 'faq-1', resourceType: 'faq', reason: 'regenerate', payload,
    }));

    expect(await harness.bound.remove('a')).toBe(true);
    expect(harness.bound.inspect('a').status).toBe('missing');
    expect(harness.persist).toHaveBeenCalledTimes(4);
    expect(listener.mock.calls.flatMap(([event]) => event.type)).toEqual(expect.arrayContaining(['stored', 'persisted', 'removed']));
    expect(harness.eventSink).toHaveBeenCalled();

    unsubscribe();
    const listenerCount = listener.mock.calls.length;
    await harness.bound.capturePlayed('a', { label: 'played-again' });
    expect(listener).toHaveBeenCalledTimes(listenerCount);
    expect(encode).toHaveBeenCalled();
  });

  it('stores in an ephemeral lane without invoking durable persistence', async () => {
    const persist = vi.fn();
    const harness = makeHarness({ persistencePolicy: 'ephemeral', persist });
    await harness.bound.capturePlayed('a', { b64: clipB64('session'), mime: 'audio/mpeg' });
    expect(harness.bound.inspect('a').status).toBe('ready');
    expect(persist).not.toHaveBeenCalled();
  });

  it('uses a private legacy createStore fallback without mutating a null module lane', async () => {
    const legacyModule = { createStore: KaraokeAudioStore.createStore, current: null };
    const harness = makeHarness({ storeModule: legacyModule });
    await harness.bound.capturePlayed('a', { b64: clipB64('fallback'), mime: 'audio/mpeg' });
    expect(harness.bound.inspect('a').status).toBe('ready');
    expect(harness.bound.serialize().version).toBe(3);
    expect(legacyModule.current).toBeNull();
  });
});

describe('ReadAloudAudioService bulk preparation', () => {
  it('skips compatible clips, replaces stale clips, fills missing clips, and reports progress', async () => {
    const store = KaraokeAudioStore.createStore();
    store.put('First answer.', clipB64('ready'), 'audio/mpeg', 'ai', {
      voice: 'Kore', language: 'English', speed: 1, voiceResolverVersion: 2,
    });
    store.put('Second answer.', clipB64('stale'), 'audio/mpeg', 'ai', {
      voice: 'Puck', language: 'English', speed: 1, voiceResolverVersion: 2,
    });
    const harness = makeHarness({ store });
    const onProgress = vi.fn();

    const result = await harness.bound.prepareAll({ onProgress });

    expect(result).toMatchObject({
      total: 3,
      prepared: 2,
      skipped: 1,
      failed: 0,
      summary: { total: 3, ready: 3, stale: 0, missing: 0 },
    });
    expect(harness.synthesize.mock.calls.map(([request]) => request.text)).toEqual([
      'Second answer.',
      'Third answer.',
    ]);
    expect(harness.persist).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls.map(([progress]) => progress.phase)).toEqual([
      'start', 'segment', 'segment', 'segment', 'complete',
    ]);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'complete', completed: 3 }));
  });

  it('honors AbortSignal cancellation between segments', async () => {
    const harness = makeHarness({ persistencePolicy: 'ephemeral' });
    const controller = new AbortController();
    const onProgress = vi.fn((progress) => {
      if (progress.phase === 'segment' && progress.completed === 1) controller.abort();
    });

    await expect(harness.bound.prepareAll({ signal: controller.signal, onProgress })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(harness.synthesize).toHaveBeenCalledTimes(1);
    expect(harness.bound.summary()).toMatchObject({ ready: 1, missing: 2 });
  });
});

function makeLegacyBridgeHarness(options = {}) {
  let resource = options.resource || {
    id: 'simple-1',
    type: 'simplified',
    data: 'Unused by the injected enumerator.',
  };
  const referenceStore = options.referenceStore || KaraokeAudioStore.createStore();
  const studentStore = options.studentStore || KaraokeAudioStore.createStore();
  const getStore = options.getStore || vi.fn((lane) => lane === 'student' ? studentStore : referenceStore);
  const synthesize = options.synthesize || vi.fn(async ({ text }) => ({
    url: 'blob:legacy-' + text,
    b64: clipB64('legacy-' + text),
    mime: 'audio/mpeg',
  }));
  const encode = options.encode || vi.fn(async (audio) => {
    if (audio && audio.b64) return audio;
    return { b64: clipB64(String(audio)), mime: 'audio/mpeg' };
  });
  const persist = options.persist || vi.fn(async () => {});
  const notify = options.notify || vi.fn();
  const bridge = createReadAloudLegacyBridge({
    getResource: () => resource,
    getStore,
    getProfile: () => ({
      voice: 'Kore', language: 'English', synthesisRate: 1,
      provider: 'gemini', voiceResolverVersion: 2,
    }),
    synthesize,
    encode,
    persist,
    normalize: (text) => String(text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(),
    notify,
    enumerateResourceSegments: options.enumerateResourceSegments || (() => []),
    isCancelled: options.isCancelled,
  });
  return {
    bridge,
    referenceStore,
    studentStore,
    getStore,
    synthesize,
    encode,
    persist,
    notify,
    setResource(next) { resource = next; },
  };
}

describe('ReadAloudAudioService structured store inspection', () => {
  it('preserves a v4 stale result even when raw has() would report missing', () => {
    const structuredStore = {
      inspect: vi.fn(() => ({
        status: 'stale',
        url: null,
        source: 'ai-generated',
        identity: { identityVersion: 4, segmentId: 'stable-segment' },
        synthesisProfile: { voice: 'Puck' },
        legacy: false,
      })),
      has: vi.fn(() => false),
      getCompatible: vi.fn(() => null),
    };
    const resource = { id: 'faq-structured', parts: [{ id: 'a', text: 'Edited answer.' }] };
    const service = createReadAloudAudioService({
      getStoreModule: () => structuredStore,
      getResource: () => resource,
      getSynthesisProfile: () => ({ voice: 'Kore', language: 'English', voiceResolverVersion: 2 }),
    });
    const controller = service.forResource({
      resourceId: resource.id,
      resourceType: 'faq',
      adapter: resourceAdapter,
      lane: 'reference',
      persistencePolicy: 'durable',
    });

    expect(controller.inspect('a')).toMatchObject({
      status: 'stale',
      source: 'ai-generated',
      identity: { identityVersion: 4, segmentId: 'stable-segment' },
    });
    expect(structuredStore.inspect).toHaveBeenCalledWith('Edited answer.', expect.objectContaining({ voice: 'Kore' }));
    expect(structuredStore.has).not.toHaveBeenCalled();
    expect(structuredStore.getCompatible).not.toHaveBeenCalled();
  });
});

describe('ReadAloudAudioService legacy compatibility bridge', () => {
  it('writes a deterministic v4 identity for the same normalized sentence', async () => {
    const harness = makeLegacyBridgeHarness();

    expect(await harness.bridge.regenerate('  **Stable sentence.**  ')).toMatch(/^blob:stored-/);
    const firstPayload = harness.referenceStore.serialize();
    const firstEntry = Object.values(firstPayload.entries)[0];
    expect(firstPayload.version).toBe(4);
    expect(firstEntry.identity).toMatchObject({
      identityVersion: 4,
      adapterId: 'alloflow.simplified.read-aloud',
      adapterVersion: 1,
      scopeId: 'main',
      spokenText: 'Stable sentence.',
    });
    expect(firstEntry.identity.segmentId).toBe('text/' + firstEntry.identity.spokenFingerprint);

    const firstIdentity = { ...firstEntry.identity };
    harness.referenceStore.remove(firstIdentity);
    await harness.bridge.regenerate('**Stable   sentence.**');
    const secondEntry = Object.values(harness.referenceStore.serialize().entries)[0];
    expect(secondEntry.identity).toEqual(firstIdentity);
  });

  it('enumerates current FAQ questions and answers when no sentence list is supplied', async () => {
    const harness = makeLegacyBridgeHarness({
      resource: {
        id: 'faq-current',
        type: 'faq',
        data: [
          { question: 'What is force?', answer: 'A push or a pull.' },
          { question: 'What is mass?', answer: 'The amount of matter.' },
        ],
      },
    });

    const progress = vi.fn();
    const result = await harness.bridge.prepare(undefined, progress);

    expect(harness.synthesize.mock.calls.map(([request]) => request.text)).toEqual([
      'What is force?',
      'A push or a pull.',
      'What is mass?',
      'The amount of matter.',
    ]);
    expect(progress).toHaveBeenLastCalledWith(4, 4, 'The amount of matter.');
    expect(result).toMatchObject({ ok: true, generated: 4, failed: 0, remaining: 0, attempted: 4, total: 4 });
    expect(harness.bridge.summary()).toMatchObject({ total: 4, ready: 4, stale: 0, missing: 0 });
  });

  it('adapts bulk progress/results and checks a live cancellation getter between sentences', async () => {
    let cancelled = false;
    const harness = makeLegacyBridgeHarness({
      enumerateResourceSegments: () => ['Ignored fallback.'],
      isCancelled: () => cancelled,
    });
    const progress = vi.fn((done) => {
      if (done === 1) cancelled = true;
    });

    const result = await harness.bridge.prepare(['First live sentence.', 'Second live sentence.'], progress);

    expect(progress).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledWith(1, 2, 'First live sentence.');
    expect(harness.synthesize).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      generated: 1,
      failed: 0,
      remaining: 1,
      cancelled: true,
      attempted: 1,
      total: 2,
    });
  });

  it('returns safe legacy fallbacks without touching dependencies for unsupported resources', async () => {
    const harness = makeLegacyBridgeHarness({
      resource: { id: 'adventure-1', type: 'adventure', data: { scenes: [] } },
    });

    expect(await harness.bridge.regenerate('Narration.')).toBeNull();
    expect(await harness.bridge.capturePlayed('Narration.', 'blob:narration')).toBe(false);
    expect(await harness.bridge.saveRecording('Narration.', new Blob(['voice']), 'human-teacher')).toBe(false);
    expect(await harness.bridge.remove('Narration.')).toBe(false);
    expect(harness.bridge.summary()).toBeNull();
    await expect(harness.bridge.prepare(['Narration.'], vi.fn())).resolves.toMatchObject({ ok: false, total: 0 });
    expect(harness.getStore).not.toHaveBeenCalled();
    expect(harness.synthesize).not.toHaveBeenCalled();
    expect(harness.persist).not.toHaveBeenCalled();
    expect(harness.notify).not.toHaveBeenCalled();
  });
});

describe('ReadAloudAudioService legacy bridge identity safety', () => {
  it('allows human replacement only for explicit regenerate', async () => {
    const harness = makeLegacyBridgeHarness();
    const putSpy = vi.spyOn(harness.referenceStore, 'put');

    await harness.bridge.regenerate('Explicit replacement.');
    expect(putSpy).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.any(String),
      'audio/mpeg',
      'ai-generated',
      expect.any(Object),
      { allowReplaceHuman: true },
    );

    putSpy.mockClear();
    await harness.bridge.capturePlayed('Captured playback.', 'blob:captured-playback');
    expect(putSpy.mock.calls[0][5]).toBeUndefined();

    putSpy.mockClear();
    await harness.bridge.prepare(['Bulk prepared.'], vi.fn());
    expect(putSpy.mock.calls[0][5]).toBeUndefined();
  });

  it('prefers injected canonical descriptors for FAQ identity and scope', async () => {
    const enumerateResourceSegments = vi.fn(() => [
      { spokenText: 'Canonical prompt.', segmentId: 'faq-item/custom/prompt', scopeId: 'teacher-guide' },
      { text: 'Canonical response.', segmentId: 'faq-item/custom/response', scopeId: 'teacher-guide' },
    ]);
    const harness = makeLegacyBridgeHarness({
      resource: {
        id: 'faq-canonical',
        type: 'faq',
        data: [{ question: 'Fallback question.', answer: 'Fallback answer.' }],
      },
      enumerateResourceSegments,
    });

    await harness.bridge.prepare(undefined, vi.fn());

    expect(enumerateResourceSegments).toHaveBeenCalled();
    expect(harness.synthesize.mock.calls.map(([request]) => request.text)).toEqual([
      'Canonical prompt.',
      'Canonical response.',
    ]);
    const identities = Object.values(harness.referenceStore.serialize().entries).map((entry) => entry.identity);
    expect(identities).toEqual(expect.arrayContaining([
      expect.objectContaining({ segmentId: 'faq-item/custom/prompt', scopeId: 'teacher-guide' }),
      expect.objectContaining({ segmentId: 'faq-item/custom/response', scopeId: 'teacher-guide' }),
    ]));
  });

  it('classifies edited FAQ text at the same semantic locator as stale', async () => {
    const harness = makeLegacyBridgeHarness({
      resource: {
        id: 'faq-edit',
        type: 'faq',
        data: [{ question: 'Original question?', answer: 'Original answer.' }],
      },
    });
    await harness.bridge.prepare(undefined, vi.fn());

    harness.setResource({
      id: 'faq-edit',
      type: 'faq',
      data: [{ question: 'Original question?', answer: 'Edited answer.' }],
    });

    expect(harness.bridge.summary()).toMatchObject({ total: 2, ready: 1, stale: 1, missing: 0 });
    const storedAnswer = Object.values(harness.referenceStore.serialize().entries)
      .find((entry) => entry.identity.segmentId === 'faq/0/answer');
    expect(storedAnswer.identity.spokenText).toBe('Original answer.');
  });

  it('maps repeated supplied text to canonical descriptors by occurrence order', async () => {
    const harness = makeLegacyBridgeHarness({
      resource: {
        id: 'faq-duplicates',
        type: 'faq',
        data: [
          { question: 'First question?', answer: 'The same answer.' },
          { question: 'Second question?', answer: 'The same answer.' },
        ],
      },
    });

    const result = await harness.bridge.prepare(['The same answer.', 'The same answer.'], vi.fn());
    const entries = Object.values(harness.referenceStore.serialize().entries);

    expect(result).toMatchObject({ ok: true, generated: 2, total: 2, remaining: 0 });
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.identity.segmentId).sort()).toEqual([
      'faq/0/answer',
      'faq/1/answer',
    ]);
    expect(entries.every((entry) => entry.identity.spokenText === 'The same answer.')).toBe(true);
  });

  it('keeps portable identity keys and main scope stable when a resource is copied', async () => {
    const data = [{ question: 'Portable question?', answer: 'Portable answer.' }];
    const harness = makeLegacyBridgeHarness({
      resource: { id: 'faq-original-id', type: 'faq', data },
    });
    await harness.bridge.prepare(undefined, vi.fn());
    const before = harness.referenceStore.serialize();
    const beforeKeys = Object.keys(before.entries).sort();

    harness.setResource({ id: 'faq-copied-id', type: 'faq', data });
    expect(harness.bridge.summary()).toMatchObject({ total: 2, ready: 2, stale: 0, missing: 0 });
    const after = harness.referenceStore.serialize();

    expect(Object.keys(after.entries).sort()).toEqual(beforeKeys);
    expect(Object.values(after.entries).every((entry) => entry.identity.scopeId === 'main')).toBe(true);
  });
});
