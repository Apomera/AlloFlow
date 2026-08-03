import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let createReadAloudAudioService;
let createReadAloudLegacyBridge;
let KaraokeAudioStore;
let nextBlobId;

const clipB64 = (label) => {
  const payload = Buffer.from(String(label || ''), 'utf8');
  const length = Math.max(192, 120 + payload.length);
  const buffer = Buffer.alloc(length);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(length - 8, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(length - 44, 40);
  buffer.set([0xff, 0xe3, 0x18, 0x00], 44);
  buffer.set([0xff, 0xe3, 0x18, 0x00], 116);
  payload.copy(buffer, 120);
  return buffer.toString('base64');
};

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
  loadAlloModule('read_aloud_audio_service_source.jsx');
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
      voice: 'Kore', language: 'English', speed: 1, provider: 'gemini', voiceResolverVersion: 2,
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
      voice: 'Kore', language: 'English', speed: 1, provider: 'gemini', voiceResolverVersion: 2,
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
      voice: 'Kore', language: 'English', speed: 1, provider: 'gemini', voiceResolverVersion: 2,
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
  const getProfile = options.getProfile || vi.fn(() => ({
    voice: 'Kore', language: 'English', synthesisRate: 1,
    provider: 'gemini', voiceResolverVersion: 2,
  }));
  const bridge = createReadAloudLegacyBridge({
    getResource: () => resource,
    getStore,
    getProfile,
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
    getProfile,
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
      get: vi.fn(() => 'blob:stored-stale'),
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

    const inspection = controller.inspect('a', { profile: { provider: 'kokoro', engine: 'local-wasm' } });
    expect(inspection).toMatchObject({
      status: 'stale',
      url: null,
      storedUrl: 'blob:stored-stale',
      source: 'ai-generated',
      identity: { identityVersion: 4, segmentId: 'stable-segment' },
    });
    expect(structuredStore.inspect).toHaveBeenCalledWith('Edited answer.', expect.objectContaining({
      voice: 'Kore', provider: 'kokoro', engine: 'local-wasm',
    }));
    expect(structuredStore.get).toHaveBeenCalledWith('Edited answer.');
    expect(structuredStore.has).not.toHaveBeenCalled();
    expect(structuredStore.getCompatible).not.toHaveBeenCalled();
  });
});


describe('ReadAloudAudioService resilience contracts', () => {
  it('propagates corrupt inspection state and includes it in summary accounting', () => {
    const structuredStore = {
      inspect: vi.fn(() => ({
        status: 'corrupt',
        url: null,
        source: 'ai-generated',
        quarantine: { code: 'media-error', reason: 'Decoder failure.' },
      })),
      get: vi.fn(() => null),
    };
    const resource = { id: 'corrupt-resource', parts: [{ id: 'a', text: 'Corrupt clip.' }] };
    const service = createReadAloudAudioService({
      getStoreModule: () => structuredStore,
      getResource: () => resource,
      getSynthesisProfile: () => ({ voice: 'Kore', provider: 'gemini', voiceResolverVersion: 2 }),
    });
    const controller = service.forResource({
      resourceId: resource.id,
      resourceType: 'faq',
      adapter: resourceAdapter,
      lane: 'reference',
    });

    expect(controller.inspect('a')).toMatchObject({
      status: 'corrupt',
      url: null,
      quarantine: { code: 'media-error', reason: 'Decoder failure.' },
    });
    expect(controller.summary()).toMatchObject({
      total: 1,
      ready: 0,
      stale: 0,
      corrupt: 1,
      missing: 0,
    });
  });

  it('persists actual synthesis provenance, forwards controls, and aborts removal before mutation', async () => {
    const controller = new AbortController();
    const synthesize = vi.fn(async () => ({
      url: 'blob:kokoro',
      b64: clipB64('kokoro'),
      mime: 'audio/mpeg',
      provider: 'kokoro',
      engine: 'local-wasm',
      engineVersion: '3',
      model: 'kokoro-82m',
      modelVersion: '1.0',
    }));
    const harness = makeHarness({ synthesize });

    await harness.bound.regenerate('a', {
      signal: controller.signal,
      reason: 'teacher-retry',
      priority: 'interactive',
      maxRetries: 3,
      profile: { provider: 'gemini' },
      metadata: { provider: 'stale-caller-value' },
    });

    expect(synthesize).toHaveBeenCalledWith(expect.objectContaining({
      signal: controller.signal,
      reason: 'teacher-retry',
      priority: 'interactive',
      maxRetries: 3,
    }));
    const payload = harness.bound.serialize();
    const metadata = payload.metadata[KaraokeAudioStore.keyFor('First answer.')];
    expect(metadata).toMatchObject({
      provider: 'kokoro',
      engine: 'local-wasm',
      engineVersion: '3',
      model: 'kokoro-82m',
      modelVersion: '1.0',
    });
    expect(harness.persist).toHaveBeenCalledWith(expect.objectContaining({
      signal: controller.signal,
      reason: 'regenerate',
    }));
    expect(harness.bound.inspect('a').status).toBe('stale');

    controller.abort();
    await expect(harness.bound.remove('a', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(harness.store.has(harness.bound.segments()[0].storageKey)).toBe(true);
  });

  it('reconciles unreachable AI clips before preparation and preserves human orphans', async () => {
    const store = KaraokeAudioStore.createStore();
    const compatible = {
      voice: 'Kore',
      language: 'English',
      speed: 1,
      provider: 'gemini',
      voiceResolverVersion: 2,
    };
    store.put('First answer.', clipB64('ready'), 'audio/mpeg', 'ai-generated', compatible);
    store.put('Old AI sentence.', clipB64('orphan-ai'), 'audio/mpeg', 'ai-generated', compatible);
    store.put('Teacher keepsake.', clipB64('orphan-human'), 'audio/mpeg', 'human-teacher', compatible);
    const harness = makeHarness({ store });

    const result = await harness.bound.prepareAll();

    expect(result.reconciliation).toMatchObject({
      removedAi: 1,
      preservedHuman: 1,
      changed: true,
    });
    expect(result.reconciliation.humanOrphans[0]).not.toHaveProperty('b64');
    expect(store.has('Old AI sentence.')).toBe(false);
    expect(store.has('Teacher keepsake.')).toBe(true);
    expect(result.summary).toMatchObject({ ready: 3, corrupt: 0, stale: 0, missing: 0 });
    expect(harness.persist).toHaveBeenCalledWith(expect.objectContaining({ reason: 'prepare-reconcile' }));
  });

  it('forwards occurrence and options through bridge regenerate, recording, quarantine, and remove', async () => {
    const repeated = [
      { spokenText: 'Repeated bridge sentence.', segmentId: 'body/repeat/0', scopeId: 'main' },
      { spokenText: 'Repeated bridge sentence.', segmentId: 'body/repeat/1', scopeId: 'main' },
    ];
    const harness = makeLegacyBridgeHarness({
      enumerateResourceSegments: () => repeated,
    });
    const controller = new AbortController();

    expect(await harness.bridge.regenerate('Repeated bridge sentence.', {
      occurrence: 1,
      signal: controller.signal,
      reason: 'edit-audio',
      priority: 'interactive',
      maxRetries: 2,
      profile: { voice: 'Aoede', provider: 'gemini', voiceResolverVersion: 2 },
      metadata: { engine: 'cloud-tts' },
      storeOptions: { maxClipBytes: 4096 },
    })).toMatch(/^blob:stored-/);
    expect(harness.synthesize).toHaveBeenCalledWith(expect.objectContaining({
      segment: expect.objectContaining({ segmentId: 'body/repeat/1' }),
      signal: controller.signal,
      reason: 'edit-audio',
      priority: 'interactive',
      maxRetries: 2,
      profile: expect.objectContaining({ voice: 'Aoede' }),
    }));
    expect(Object.values(harness.referenceStore.serialize().entries)[0]).toMatchObject({
      identity: { segmentId: 'body/repeat/1' },
      synthesisProfile: expect.objectContaining({ engine: 'cloud-tts' }),
    });
    const synthesisCount = harness.synthesize.mock.calls.length;
    expect(await harness.bridge.regenerate('Repeated bridge sentence.', { occurrence: 2 })).toBeNull();
    expect(harness.synthesize).toHaveBeenCalledTimes(synthesisCount);


    expect(await harness.bridge.saveRecording(
      'Repeated bridge sentence.',
      new Blob(['teacher']),
      { source: 'human-teacher', occurrence: 0, signal: controller.signal },
    )).toBe(true);
    expect(Object.values(harness.referenceStore.serialize().entries).map((entry) => entry.identity.segmentId).sort())
      .toEqual(['body/repeat/0', 'body/repeat/1']);

    expect(await harness.bridge.quarantine(
      'Repeated bridge sentence.',
      { code: 'media-error' },
      { occurrence: 1, signal: controller.signal },
    )).toBe(true);
    expect(harness.bridge.inspect('Repeated bridge sentence.', 'reference', { occurrence: 1 }).status)
      .toBe('corrupt');
    expect(await harness.bridge.remove(
      'Repeated bridge sentence.',
      'reference',
      { occurrence: 1, signal: controller.signal },
    )).toBe(true);
    expect(harness.bridge.inspect('Repeated bridge sentence.', 'reference', { occurrence: 0 }).source)
      .toBe('human-teacher');
  });
});

describe('ReadAloudAudioService legacy compatibility bridge', () => {
  it('resolves a compatible stored clip without synthesizing and exposes its inspection', async () => {
    const harness = makeLegacyBridgeHarness();
    await harness.bridge.regenerate('Already stored.');
    harness.synthesize.mockClear();

    expect(harness.bridge.inspect('Already stored.')).toMatchObject({
      status: 'ready',
      source: 'ai-generated',
      profile: expect.objectContaining({ voice: 'Kore' }),
    });
    expect(await harness.bridge.resolve('Already stored.', {
      priority: 'interactive',
      maxRetries: 1,
      reason: 'karaoke-play',
    })).toMatch(/^blob:stored-/);
    expect(harness.synthesize).not.toHaveBeenCalled();
  });

  it('resolves missing and stale clips with the full playback request contract', async () => {
    let activeVoice = 'Puck';
    const getProfile = vi.fn(() => ({
      voice: activeVoice,
      language: 'English',
      synthesisRate: 1,
      provider: 'gemini',
      voiceResolverVersion: 2,
    }));
    const harness = makeLegacyBridgeHarness({ getProfile });

    await harness.bridge.regenerate('Stale sentence.');
    activeVoice = 'Kore';
    harness.synthesize.mockClear();
    expect(harness.bridge.inspect('Stale sentence.')).toMatchObject({ status: 'stale' });

    const controller = new AbortController();
    const request = {
      priority: 'interactive',
      maxRetries: 1,
      signal: controller.signal,
      reason: 'karaoke-play',
      profile: { voice: 'Aoede', language: 'Spanish', speed: 0.85, synthesisRate: 0.85 },
    };
    await expect(harness.bridge.resolve('Missing sentence.', request)).resolves.toBe('blob:legacy-Missing sentence.');
    await expect(harness.bridge.resolve('Stale sentence.', request)).resolves.toBe('blob:legacy-Stale sentence.');

    expect(harness.synthesize).toHaveBeenCalledTimes(2);
    for (const [synthesisRequest] of harness.synthesize.mock.calls) {
      expect(synthesisRequest).toMatchObject({
        operation: 'resolve',
        priority: 'interactive',
        maxRetries: 1,
        signal: controller.signal,
        reason: 'karaoke-play',
        profile: expect.objectContaining({
          voice: 'Aoede',
          language: 'Spanish',
          speed: 0.85,
          synthesisRate: 0.85,
        }),
      });
    }
  });

  it('captures a played URL into the real v4 store and persists the resource payload', async () => {
    let persistedResource = {
      id: 'simple-played-capture',
      type: 'simplified',
      data: 'Played sentence.',
    };
    const persist = vi.fn(async ({ payload, resourceId }) => {
      expect(resourceId).toBe('simple-played-capture');
      persistedResource = { ...persistedResource, karaokeAudio: payload };
    });
    const harness = makeLegacyBridgeHarness({
      resource: persistedResource,
      persist,
      enumerateResourceSegments: () => [{
        spokenText: 'Played sentence.',
        segmentId: 'body/0/sentence/0',
        scopeId: 'main',
      }],
    });

    expect(await harness.bridge.capturePlayed('Played sentence.', 'blob:played-url')).toBe(true);
    expect(harness.referenceStore.has('Played sentence.')).toBe(true);
    expect(persistedResource.karaokeAudio).toMatchObject({ version: 4 });
    expect(Object.values(persistedResource.karaokeAudio.entries)[0]).toMatchObject({
      source: 'ai-played',
      identity: {
        identityVersion: 4,
        adapterId: 'alloflow.simplified.read-aloud',
        segmentId: 'body/0/sentence/0',
        spokenText: 'Played sentence.',
      },
    });
    expect(harness.bridge.summary(['Played sentence.'])).toMatchObject({
      total: 1,
      ready: 1,
      stale: 0,
      missing: 0,
    });
    expect(harness.notify).toHaveBeenCalledWith(
      'Played sentence.',
      'saved',
      'simple-played-capture',
      expect.any(Object),
    );
  });

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
    expect(await harness.bridge.resolve('Narration.', { reason: 'karaoke-play' })).toBeNull();
    expect(harness.bridge.inspect('Narration.')).toBeNull();
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
    expect(harness.bridge.inspect('Edited answer.')).toMatchObject({
      status: 'stale',
      url: null,
      storedUrl: expect.stringMatching(/^blob:stored-/),
      segment: {
        segmentId: 'faq/0/answer',
        spokenText: 'Edited answer.',
      },
    });
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

  it('captures under the resolution-time profile when voice settings change mid-flight', async () => {
    let activeVoice = 'Kore';
    const getProfile = vi.fn(() => ({
      voice: activeVoice, language: 'English', synthesisRate: 1,
      provider: 'gemini', voiceResolverVersion: 2,
    }));
    const harness = makeLegacyBridgeHarness({
      getProfile,
      enumerateResourceSegments: () => [{
        spokenText: 'Voice pinned sentence.',
        segmentId: 'body/0/sentence/0',
        scopeId: 'main',
      }],
    });

    const url = await harness.bridge.resolve('Voice pinned sentence.', {
      priority: 'interactive', maxRetries: 1, reason: 'karaoke-play',
    });
    expect(url).toBe('blob:legacy-Voice pinned sentence.');

    // Voice settings hydrate/change while generation + audio startup is still
    // pending. The played clip IS Kore audio; capture must not relabel it.
    activeVoice = 'Puck';
    expect(await harness.bridge.capturePlayed('Voice pinned sentence.', url)).toBe(true);

    const entry = Object.values(harness.referenceStore.serialize().entries)[0];
    expect(entry.source).toBe('ai-played');
    expect(entry.synthesisProfile).toMatchObject({ voice: 'Kore', language: 'English' });
  });

  it('resolves and captures duplicated sentences as distinct segments via occurrence', async () => {
    const harness = makeLegacyBridgeHarness({
      enumerateResourceSegments: () => [
        { spokenText: 'Jump up high.', segmentId: 'body/0/sentence/0', scopeId: 'main' },
        { spokenText: 'Jump up high.', segmentId: 'body/0/sentence/1', scopeId: 'main' },
      ],
    });

    const firstUrl = await harness.bridge.resolve('Jump up high.', { occurrence: 0, reason: 'karaoke-play' });
    expect(await harness.bridge.capturePlayed('Jump up high.', firstUrl, { occurrence: 0 })).toBe(true);

    // The twin resolves to the SAME url (synthesis is text-keyed upstream);
    // the occurrence alone must route its capture into the second segment.
    const secondUrl = await harness.bridge.resolve('Jump up high.', { occurrence: 1, reason: 'karaoke-play' });
    expect(secondUrl).toBe(firstUrl);
    expect(await harness.bridge.capturePlayed('Jump up high.', secondUrl, { occurrence: 1 })).toBe(true);

    const entries = Object.values(harness.referenceStore.serialize().entries);
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.identity.segmentId).sort()).toEqual([
      'body/0/sentence/0',
      'body/0/sentence/1',
    ]);
    expect(harness.bridge.summary(['Jump up high.', 'Jump up high.'])).toMatchObject({
      total: 2, ready: 2, stale: 0, missing: 0,
    });
  });
});

describe('Save TTS bilingual per-entry profiles (2026-08-03)', () => {
  // Field report 2026-08-03: Save TTS on a non-English adapted text with a
  // side-by-side English translation. view_simplified_source supplies
  // per-entry { text, language, occurrence, identity } descriptors, but the
  // legacy bridge rebuilt segments from the plain sentence strings, dropping
  // the source-lane language override. Language-agnostic coverage (Spanish
  // as the representative adapted language).
  const bilingualCanonical = () => [
    { text: 'Hola clase.', segmentId: 'source/0/0', scopeId: 'main', language: 'Spanish' },
    { text: 'AlloFlow.', segmentId: 'source/1/0', scopeId: 'main', language: 'Spanish' },
    { text: 'Hello class.', segmentId: 'target/0/0', scopeId: 'main', language: 'English' },
    { text: 'AlloFlow.', segmentId: 'target/1/0', scopeId: 'main', language: 'English' },
  ];
  // Entry shape mirrors view_simplified_source.jsx: occurrence is scoped to
  // identical spoken text ACROSS both lanes, so the duplicated brand word is
  // occurrence 0 in the source lane and occurrence 1 in the target lane.
  const bilingualEntries = () => [
    { text: 'Hola clase.', language: 'Spanish', occurrence: 0, identity: 'source:0:0' },
    { text: 'AlloFlow.', language: 'Spanish', occurrence: 0, identity: 'source:1:0' },
    { text: 'Hello class.', language: 'English', occurrence: 0, identity: 'target:0:0' },
    { text: 'AlloFlow.', language: 'English', occurrence: 1, identity: 'target:1:0' },
  ];

  it('prepare(options.entries) synthesizes each lane under its own language profile', async () => {
    const synthesize = vi.fn(async ({ text }) => ({
      url: 'blob:bilingual-' + text,
      b64: clipB64('bilingual-' + text),
      mime: 'audio/mpeg',
    }));
    // The global profile is ENGLISH: the Spanish source entries only speak
    // Spanish if the per-entry override actually reaches synthesis.
    const harness = makeLegacyBridgeHarness({
      synthesize,
      enumerateResourceSegments: bilingualCanonical,
    });
    const entries = bilingualEntries();

    const result = await harness.bridge.prepare(
      entries.map((entry) => entry.text),
      vi.fn(),
      { entries },
    );

    expect(result).toMatchObject({ ok: true, generated: 4, total: 4, remaining: 0 });
    expect(synthesize).toHaveBeenCalledTimes(4);
    expect(synthesize.mock.calls.map((call) => [call[0].text, call[0].profile.language])).toEqual([
      ['Hola clase.', 'Spanish'],
      ['AlloFlow.', 'Spanish'],
      ['Hello class.', 'English'],
      ['AlloFlow.', 'English'],
    ]);
  });

  it('stores each entry under its canonical segment id with the matching synthesis profile', async () => {
    const harness = makeLegacyBridgeHarness({
      enumerateResourceSegments: bilingualCanonical,
    });
    const entries = bilingualEntries();

    const result = await harness.bridge.prepare(
      entries.map((entry) => entry.text),
      vi.fn(),
      { entries },
    );
    expect(result).toMatchObject({ ok: true, generated: 4, remaining: 0 });

    const stored = Object.values(harness.referenceStore.serialize().entries);
    expect(stored).toHaveLength(4);
    const byId = new Map(stored.map((entry) => [entry.identity.segmentId, entry]));
    expect(Array.from(byId.keys()).sort()).toEqual([
      'source/0/0', 'source/1/0', 'target/0/0', 'target/1/0',
    ]);
    // The duplicated text landed in BOTH canonical twins (no reuse/off-by-one),
    // each labeled with its own lane language.
    expect(byId.get('source/1/0').identity.spokenText).toBe('AlloFlow.');
    expect(byId.get('target/1/0').identity.spokenText).toBe('AlloFlow.');
    expect(byId.get('source/0/0').synthesisProfile).toMatchObject({ language: 'Spanish' });
    expect(byId.get('source/1/0').synthesisProfile).toMatchObject({ language: 'Spanish' });
    expect(byId.get('target/0/0').synthesisProfile).toMatchObject({ language: 'English' });
    expect(byId.get('target/1/0').synthesisProfile).toMatchObject({ language: 'English' });
  });
});
