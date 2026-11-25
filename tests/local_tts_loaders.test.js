import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const kokoroSource = readFileSync(resolve(process.cwd(), 'kokoro_tts_loader.js'), 'utf8');
const piperSource = readFileSync(resolve(process.cwd(), 'piper_tts_loader.js'), 'utf8');

let createObjectURL;
let revokeObjectURL;
let originalCreateDescriptor;
let originalRevokeDescriptor;
let createTTS;

beforeAll(() => {
  loadAlloModule('tts_module.js');
  createTTS = window.AlloModules.createTTS;
  if (!createTTS) throw new Error('createTTS did not register');
});

class FakeWorker {
  static instances = [];
  static autoInit = true;
  static batchMode = 'complete';

  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.messages = [];
    this.terminated = false;
    FakeWorker.instances.push(this);
  }

  postMessage(message) {
    this.messages.push(message);
    if (message.type === 'init' && FakeWorker.autoInit) {
      queueMicrotask(() => this.emit({ type: 'ready' }));
      return;
    }
    if (message.type === 'generate' && message.id === '__warmup__') {
      queueMicrotask(() => this.emit({
        type: 'audio',
        id: message.id,
        buffer: new ArrayBuffer(8),
        elapsed: 1,
      }));
      return;
    }
    if (message.type === 'generate_batch' && FakeWorker.batchMode !== 'hold') {
      const incomplete = FakeWorker.batchMode === 'incomplete';
      queueMicrotask(() => this.emit({
        type: 'audio',
        id: message.id,
        buffer: new ArrayBuffer(8),
        elapsed: 1,
        chunks: 1,
        expectedChunks: incomplete ? 2 : 1,
      }));
    }
  }

  emit(data) {
    if (this.onmessage) this.onmessage({ data });
  }

  fail(message = 'synthetic worker crash') {
    if (this.onerror) {
      this.onerror({ message, preventDefault: vi.fn() });
    }
  }

  terminate() {
    this.terminated = true;
  }
}

class FakeAudio {
  static instances = [];

  constructor(src) {
    this.src = src;
    this.currentSrc = '';
    this.playbackRate = 1;
    this.volume = 1;
    this.paused = false;
    FakeAudio.instances.push(this);
  }

  play() {
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

function installUrlMocks() {
  let nextUrl = 0;
  createObjectURL = vi.fn(() => 'blob:tts-test-' + (++nextUrl));
  revokeObjectURL = vi.fn();
  originalCreateDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  originalRevokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });
}

function restoreUrlMocks() {
  if (originalCreateDescriptor) {
    Object.defineProperty(URL, 'createObjectURL', originalCreateDescriptor);
  } else {
    delete URL.createObjectURL;
  }
  if (originalRevokeDescriptor) {
    Object.defineProperty(URL, 'revokeObjectURL', originalRevokeDescriptor);
  } else {
    delete URL.revokeObjectURL;
  }
}

function loadKokoro() {
  delete window._kokoroTTS;
  delete window.__kokoroTTSLoading;
  window.__alloCreateVerifiedWorker = async () => new FakeWorker('blob:verified-kokoro-fixture', { type: 'module' });
  // eslint-disable-next-line no-new-func
  new Function(kokoroSource)();
  return window._kokoroTTS;
}

function loadPiper(lib) {
  delete window._piperTTS;
  window.__alloLoadVerifiedRuntime = vi.fn(async (graph) => {
    if (graph !== 'piper') throw new Error('Unexpected runtime graph');
    return lib;
  });
  // eslint-disable-next-line no-new-func
  new Function(piperSource)();
  return window._piperTTS;
}

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

beforeEach(() => {
  installUrlMocks();
  FakeWorker.instances = [];
  FakeWorker.autoInit = true;
  FakeWorker.batchMode = 'complete';
  FakeAudio.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('Audio', FakeAudio);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  try { window._kokoroTTS?.dispose(); } catch (_) {}
  try { window._piperTTS?.dispose(); } catch (_) {}
  delete window._kokoroTTS;
  delete window.__kokoroTTSLoading;
  delete window._piperTTS;
  delete window.__piperTestLib;
  delete window.__alloLoadVerifiedRuntime;
  delete window.__alloCreateVerifiedWorker;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  restoreUrlMocks();
});

describe('Kokoro local loader resilience', () => {
  it('fingerprints all exact text, preserves case, and caches neutral-speed bytes', async () => {
    const api = loadKokoro();
    await api.init();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();

    const prefix = 'A'.repeat(220);
    const first = prefix + ' first ending.';
    const second = prefix + ' second ending.';
    const lowerCase = first.toLowerCase();

    const firstUrl = await api.speak(first, 'af_heart', 0.75);
    const secondUrl = await api.speak(second, 'af_heart', 0.75);
    const lowerUrl = await api.speak(lowerCase, 'af_heart', 0.75);
    const firstAtAnotherSpeed = await api.speak(first, 'af_heart', 2);

    expect(new Set([firstUrl, secondUrl, lowerUrl]).size).toBe(3);
    expect(firstAtAnotherSpeed).toBe(firstUrl);

    const batches = FakeWorker.instances[0].messages.filter((item) => item.type === 'generate_batch');
    expect(batches).toHaveLength(3);
    expect(batches.every((item) => item.speed === 1)).toBe(true);
    expect(api.synthesisRate).toBe(1);
  });

  it('force regeneration replaces cached audio only after a complete fresh batch', async () => {
    const api = loadKokoro();
    await api.init();
    const oldUrl = await api.speak('Regenerate this saved sentence.', 'af_heart', 1);
    const freshUrl = await api.speak('Regenerate this saved sentence.', 'af_heart', 1, { force: true });
    expect(freshUrl).not.toBe(oldUrl);
    expect(await api.speak('Regenerate this saved sentence.', 'af_heart', 1)).toBe(freshUrl);
    FakeWorker.batchMode = 'incomplete';
    expect(await api.speak('Regenerate this saved sentence.', 'af_heart', 1, { force: true })).toBeNull();
    expect(await api.speak('Regenerate this saved sentence.', 'af_heart', 1)).toBe(freshUrl);
  });

  it('shares a background batch with a signalled waiter without transferring cancellation', async () => {
    const api = loadKokoro();
    await api.init();
    createObjectURL.mockClear();
    FakeWorker.batchMode = 'hold';
    const worker = FakeWorker.instances[0];
    const text = 'The same Adventure sentence is warmed and then played.';

    const prewarm = api.speak(text, 'af_heart', 1);
    const controller = new AbortController();
    const active = api.speak(text, 'af_heart', 1, { signal: controller.signal });
    const activeRejection = expect(active).rejects.toMatchObject({ name: 'AbortError' });

    const batches = worker.messages.filter((item) => item.type === 'generate_batch');
    expect(batches).toHaveLength(1);
    controller.abort('reader moved on');
    await activeRejection;

    worker.emit({
      type: 'audio',
      id: batches[0].id,
      buffer: new ArrayBuffer(8),
      elapsed: 1,
      chunks: 1,
      expectedChunks: 1,
    });
    const prewarmUrl = await prewarm;
    expect(prewarmUrl).toBeTruthy();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    await expect(api.speak(text, 'af_heart', 1)).resolves.toBe(prewarmUrl);
    expect(worker.messages.filter((item) => item.type === 'generate_batch')).toHaveLength(1);
  });

  it('carries callTTS Adventure prewarm into Kokoro as the owner and lets active playback join it', async () => {
    const api = loadKokoro();
    await api.init();
    createObjectURL.mockClear();
    FakeWorker.batchMode = 'hold';
    const worker = FakeWorker.instances[0];
    const speakSpy = vi.spyOn(api, 'speak');
    const text = 'The Adventure lantern glows beside the hidden door.';
    const state = {
      queue: Promise.resolve(),
      botQueue: Promise.resolve(),
      urlCache: new Map(),
      rateLimitedUntil: 0,
    };
    const { callTTS } = createTTS({
      state,
      apiKey: 'test-key',
      GEMINI_MODELS: { tts: 'test-tts-model' },
      AVAILABLE_VOICES: ['af_heart'],
      _isCanvasEnv: true,
      languageToTTSCode: () => 'en',
      isGlobalMuted: () => false,
      warnLog: () => {},
      debugLog: () => {},
      getLeveledTextLanguage: () => 'Spanish',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({}),
      getAi: () => null,
      setShowKokoroOfferModal: () => {},
    });

    const prewarm = callTTS(text, 'af_heart', 1, {
      language: 'English', priority: 'normal', reason: 'adventure-prewarm', maxRetries: 0,
    });
    await vi.waitFor(() => {
      expect(worker.messages.filter((item) => item.type === 'generate_batch')).toHaveLength(1);
    });
    expect(speakSpy.mock.calls[0][3]).toBeUndefined();

    const controller = new AbortController();
    const active = callTTS(text, 'af_heart', 1, {
      language: 'English', priority: 'interactive', reason: 'read-aloud-active',
      maxRetries: 1, signal: controller.signal,
    });
    await vi.waitFor(() => {
      expect(speakSpy).toHaveBeenCalledTimes(2);
      expect(worker.messages.filter((item) => item.type === 'generate_batch')).toHaveLength(1);
    });
    expect(speakSpy.mock.calls[1][3]?.signal).toBeTruthy();

    // Cancelling the active reader cancels only its wait. The signal-free
    // prewarm remains the batch owner and still fills the reusable cache.
    controller.abort('reader moved on');
    await expect(active).rejects.toMatchObject({ name: 'AbortError' });

    const batch = worker.messages.find((item) => item.type === 'generate_batch');
    worker.emit({
      type: 'audio', id: batch.id, buffer: new ArrayBuffer(8), elapsed: 1,
      chunks: 1, expectedChunks: 1,
    });
    const prewarmUrl = await prewarm;
    expect(prewarmUrl).toBeTruthy();

    const replayUrl = await callTTS(text, 'af_heart', 1, {
      language: 'English', priority: 'interactive', reason: 'read-aloud-active', maxRetries: 1,
    });
    expect(replayUrl).toBe(prewarmUrl);
    expect(worker.messages.filter((item) => item.type === 'generate_batch')).toHaveLength(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('owns cached URLs, invalidates them exactly once, and regenerates after invalidation', async () => {
    const api = loadKokoro();
    await api.init();
    revokeObjectURL.mockClear();

    const first = await api.speak('An exactly owned sentence.', 'af_heart', 1);
    expect(api.ownsUrl(first)).toBe(true);
    expect(api.invalidateUrl(first)).toBe(true);
    expect(api.invalidateUrl(first)).toBe(false);
    expect(api.ownsUrl(first)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);

    const second = await api.speak('An exactly owned sentence.', 'af_heart', 1);
    expect(second).not.toBe(first);
    api.clearCache();
    expect(api.ownsUrl(second)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith(second);
  });

  it('fails closed when batch completeness metadata reports missing audio', async () => {
    const api = loadKokoro();
    await api.init();
    FakeWorker.batchMode = 'incomplete';
    createObjectURL.mockClear();

    await expect(api.speak('A batch that must never return partial audio.', 'af_heart', 1))
      .resolves.toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects a superseded stream and ignores stale chunks without allocating URLs', async () => {
    const api = loadKokoro();
    await api.init();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    const worker = FakeWorker.instances[0];

    const firstPromise = api.speakStreaming('First stream. '.repeat(20), 'af_heart', 1);
    const firstRejection = expect(firstPromise).rejects.toMatchObject({ name: 'AbortError' });
    const secondPromise = api.speakStreaming('Second stream. '.repeat(20), 'af_heart', 1);

    const streams = worker.messages.filter((item) => item.type === 'generate_stream');
    expect(streams).toHaveLength(2);
    await firstRejection;

    worker.emit({
      type: 'stream_chunk',
      id: streams[0].id,
      buffer: new ArrayBuffer(8),
      index: 0,
      total: 1,
    });
    expect(createObjectURL).not.toHaveBeenCalled();

    worker.emit({
      type: 'stream_chunk',
      id: streams[1].id,
      buffer: new ArrayBuffer(8),
      index: 0,
      total: 1,
    });
    worker.emit({
      type: 'stream_done',
      id: streams[1].id,
      total: 1,
      expectedTotal: 1,
      elapsed: 2,
    });

    const url = await secondPromise;
    expect(api.ownsUrl(url)).toBe(true);
    expect(api.stop()).toBe(true);
    expect(api.ownsUrl(url)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('plays each neutral stream chunk at the requested rate once and cleans every URL', async () => {
    const api = loadKokoro();
    await api.init();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    const worker = FakeWorker.instances[0];

    const firstPromise = api.speakStreaming('One sentence. Two sentences. '.repeat(8), 'af_heart', 1.5);
    const request = worker.messages.find((item) => item.type === 'generate_stream');
    expect(request.speed).toBe(1);

    worker.emit({ type: 'stream_chunk', id: request.id, buffer: new ArrayBuffer(8), index: 0, total: 2 });
    worker.emit({ type: 'stream_chunk', id: request.id, buffer: new ArrayBuffer(8), index: 1, total: 2 });
    worker.emit({ type: 'stream_done', id: request.id, total: 2, expectedTotal: 2, elapsed: 2 });

    const firstUrl = await firstPromise;
    const firstAudio = new FakeAudio(firstUrl);
    const done = vi.fn();
    api.chainPlay(firstAudio, 1.5, 0, done);

    expect(firstAudio.playbackRate).toBe(1.5);
    expect(firstAudio.volume).toBe(0);
    firstAudio.onended();
    const secondAudio = FakeAudio.instances.at(-1);
    expect(secondAudio).not.toBe(firstAudio);
    expect(secondAudio.playbackRate).toBe(1.5);
    expect(secondAudio.volume).toBe(0);
    secondAudio.onended();

    expect(done).toHaveBeenCalledTimes(1);
    expect(api.ownsUrl(firstUrl)).toBe(false);
    expect(api.streamQueueLength).toBe(0);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('lets a multi-chunk chain handle stop silently and revoke every owned URL', async () => {
    const api = loadKokoro();
    await api.init();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    const worker = FakeWorker.instances[0];

    const firstPromise = api.speakStreaming('Stop this multi-chunk stream quietly. '.repeat(8), 'af_heart', 1);
    const request = worker.messages.find((item) => item.type === 'generate_stream');
    worker.emit({ type: 'stream_chunk', id: request.id, buffer: new ArrayBuffer(8), index: 0, total: 2 });
    worker.emit({ type: 'stream_chunk', id: request.id, buffer: new ArrayBuffer(8), index: 1, total: 2 });
    worker.emit({ type: 'stream_done', id: request.id, total: 2, expectedTotal: 2, elapsed: 2 });

    const firstUrl = await firstPromise;
    const firstAudio = new FakeAudio(firstUrl);
    const done = vi.fn();
    const handle = api.chainPlay(firstAudio, 1, 1, done);

    expect(handle.stop(false)).toBe(true);
    expect(handle.stop(false)).toBe(false);
    expect(firstAudio.paused).toBe(true);
    expect(done).not.toHaveBeenCalled();
    expect(api.ownsUrl(firstUrl)).toBe(false);
    expect(api.streamQueueLength).toBe(0);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('rejects worker failures, retries cleanly, and cancels pending generation', async () => {
    FakeWorker.autoInit = false;
    const api = loadKokoro();
    const initPromise = api.init();
    await Promise.resolve();
    await Promise.resolve();
    const firstWorker = FakeWorker.instances[0];
    firstWorker.fail('synthetic worker crash');

    await expect(initPromise).rejects.toThrow('synthetic worker crash');
    expect(firstWorker.terminated).toBe(true);
    expect(api.ready).toBe(false);

    FakeWorker.autoInit = true;
    await api.init();
    expect(api.ready).toBe(true);
    expect(FakeWorker.instances).toHaveLength(2);

    FakeWorker.batchMode = 'hold';
    const controller = new AbortController();
    const signalled = api.speak(
      'This generation follows the caller signal.',
      'af_heart',
      1,
      { signal: controller.signal },
    );
    controller.abort('reader moved on');
    await expect(signalled).rejects.toMatchObject({ name: 'AbortError' });

    const disposed = api.speak('This generation will be disposed.', 'af_heart', 1);
    api.dispose();
    await expect(disposed).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.instances.at(-1).terminated).toBe(true);
  });
});

describe('Piper local loader resilience', () => {
  function makeLib(overrides = {}) {
    return {
      download: vi.fn(async () => {}),
      predict: vi.fn(async ({ text }) => new Blob([text], { type: 'audio/wav' })),
      ...overrides,
    };
  }

  it('fingerprints exact case-preserving text and reuses neutral bytes across speeds', async () => {
    const lib = makeLib();
    const api = loadPiper(lib);
    const prefix = 'Z'.repeat(220);
    const first = prefix + ' First.';
    const second = prefix + ' Second.';
    const lower = first.toLowerCase();

    const firstUrl = await api.speak(first, 'fr', 0.75);
    const secondUrl = await api.speak(second, 'fr', 0.75);
    const lowerUrl = await api.speak(lower, 'fr', 0.75);
    const firstAtAnotherSpeed = await api.speak(first, 'fr', 2);

    expect(new Set([firstUrl, secondUrl, lowerUrl]).size).toBe(3);
    expect(firstAtAnotherSpeed).toBe(firstUrl);
    expect(lib.predict).toHaveBeenCalledTimes(3);
    expect(api.synthesisRate).toBe(1);
  });

  it('force regeneration bypasses cached Piper predictions and retains the good clip on failure', async () => {
    const lib = makeLib();
    const api = loadPiper(lib);
    const oldUrl = await api.speak('Une nouvelle lecture.', 'fr', 1);
    const freshUrl = await api.speak('Une nouvelle lecture.', 'fr', 1, { force: true });
    expect(freshUrl).not.toBe(oldUrl);
    expect(lib.predict).toHaveBeenCalledTimes(2);
    lib.predict.mockRejectedValueOnce(new Error('temporary generation failure'));
    expect(await api.speak('Une nouvelle lecture.', 'fr', 1, { force: true })).toBeNull();
    expect(await api.speak('Une nouvelle lecture.', 'fr', 1)).toBe(freshUrl);
  });

  it('deduplicates concurrent voice downloads and tracks URL ownership', async () => {
    const voiceReady = deferred();
    const lib = makeLib({ download: vi.fn(() => voiceReady.promise) });
    const api = loadPiper(lib);

    const first = api.speak('Premi?re phrase.', 'fr', 1);
    const second = api.speak('Deuxi?me phrase.', 'fr', 1);
    await vi.waitFor(() => {
      expect(lib.download).toHaveBeenCalledTimes(1);
    });

    voiceReady.resolve();
    const [firstUrl, secondUrl] = await Promise.all([first, second]);
    expect(api.ownsUrl(firstUrl)).toBe(true);
    expect(api.ownsUrl(secondUrl)).toBe(true);

    expect(api.invalidateUrl(firstUrl)).toBe(true);
    expect(api.invalidateUrl(firstUrl)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    api.clearCache();
    expect(api.ownsUrl(secondUrl)).toBe(false);
  });

  it('honors a caller AbortSignal during an in-flight prediction', async () => {
    const prediction = deferred();
    const lib = makeLib();
    const api = loadPiper(lib);
    await api.init('fr');
    lib.predict.mockImplementationOnce(() => prediction.promise);

    const controller = new AbortController();
    const pending = api.speak(
      'Cette phrase suit le signal.',
      'fr',
      1,
      { signal: controller.signal },
    );
    controller.abort('reader moved on');

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    prediction.resolve(new Blob(['late'], { type: 'audio/wav' }));
  });

  it('stop rejects an in-flight prediction and dispose revokes cached URLs', async () => {
    const prediction = deferred();
    const lib = makeLib();
    const api = loadPiper(lib);
    await api.init('fr');
    lib.predict.mockImplementationOnce(() => prediction.promise);

    const pending = api.speak('Cette phrase est annul?e.', 'fr', 1);
    expect(api.stop('reader stopped')).toBe(true);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    prediction.resolve(new Blob(['late'], { type: 'audio/wav' }));

    const cached = await api.speak('Cette phrase est conserv?e.', 'fr', 1);
    expect(api.ownsUrl(cached)).toBe(true);
    api.dispose();
    expect(api.ready).toBe(false);
    expect(api.ownsUrl(cached)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith(cached);
  });

  it('detects already-stored OPFS Piper models via isLanguageStored without triggering downloads', async () => {
    const lib = makeLib({
      stored: vi.fn(async () => ['es_MX-ald-medium']),
      PATH_MAP: { 'es_MX-ald-medium': 'es/es_MX/ald/medium/es_MX-ald-medium.onnx', 'fr_FR-siwis-medium': 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx' },
    });
    const api = loadPiper(lib);
    expect(api.isLanguageReady('es')).toBe(false);
    await expect(api.isLanguageStored('es')).resolves.toBe(true);
    expect(api.isLanguageReady('es')).toBe(true);
    expect(lib.download).not.toHaveBeenCalled();
    await expect(api.isLanguageStored('fr')).resolves.toBe(false);
    expect(lib.download).not.toHaveBeenCalled();
    lib.remove = vi.fn(async () => {});
    await expect(api.removeLanguage('es')).resolves.toBe(true);
    expect(lib.remove).toHaveBeenCalledWith('es_MX-ald-medium');
    expect(api.isLanguageReady('es')).toBe(false);
  });

  it('routes non-English to Piper first only when preferOfflineNonEnglishVoice is enabled, leaving English on Kokoro/Gemini', async () => {
    const lib = makeLib({
      stored: vi.fn(async () => ['es_MX-ald-medium']),
      PATH_MAP: { 'es_MX-ald-medium': 'es/es_MX/ald/medium/es_MX-ald-medium.onnx' },
    });
    const piperApi = loadPiper(lib);
    await piperApi.isLanguageStored('es');
    const speakSpy = vi.spyOn(piperApi, 'speak');
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    const { callTTS } = createTTS({
      state,
      apiKey: 'test-key',
      GEMINI_MODELS: { tts: 'test-tts-model' },
      AVAILABLE_VOICES: ['Kore', 'af_heart'],
      _isCanvasEnv: true,
      languageToTTSCode: (lang) => (String(lang).toLowerCase().startsWith('span') ? 'es' : 'en'),
      isGlobalMuted: () => false,
      warnLog: () => {},
      debugLog: () => {},
      getLeveledTextLanguage: () => 'Spanish',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({ preferOfflineNonEnglishVoice: true }),
      getAi: () => null,
      setShowKokoroOfferModal: () => {},
    });
    const esUrl = await callTTS('Hola clase.', 'Kore', 1, { language: 'Spanish' });
    expect(esUrl).toBeTruthy();
    expect(speakSpy).toHaveBeenCalledWith('Hola clase.', 'es', 1, expect.any(Object));
    // Verify English stays off Piper (PIPER_HANDLES_ENGLISH = false)
    speakSpy.mockClear();
    const ttsSrc = readFileSync(resolve(process.cwd(), 'tts_source.jsx'), 'utf8');
    expect(ttsSrc).toContain('const PIPER_HANDLES_ENGLISH = false;');
    // Verify Header Voice Settings exposes non-English Piper download, preview, preference, and OS local-voice tip
    const headerSrc = readFileSync(resolve(process.cwd(), 'view_header_source.jsx'), 'utf8');
    expect(headerSrc).toContain('data-piper-get-voice=');
    expect(headerSrc).toContain('data-piper-test-voice=');
    expect(headerSrc).toContain('data-piper-remove-voice=');
    expect(headerSrc).toContain('data-piper-prefer-offline="true"');
    expect(headerSrc).toContain('data-device-voice-tip="true"');
    expect(headerSrc).toContain('PIPER_NON_EN_CODES');
    // Verify main-app, Voice Loop, Student AI-Off, Tour, and Help browser speech fallbacks prefer localService === true first
    const hostSrc = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const phaseKSrc = readFileSync(resolve(process.cwd(), 'phase_k_helpers_source.jsx'), 'utf8');
    const botSrc = readFileSync(resolve(process.cwd(), 'allobot_source.jsx'), 'utf8');
    const tourSrc = readFileSync(resolve(process.cwd(), 'view_misc_panels_source.jsx'), 'utf8');
    const spotSrc = readFileSync(resolve(process.cwd(), 'view_spotlight_tour_source.jsx'), 'utf8');
    const cmdSrc = readFileSync(resolve(process.cwd(), 'allo_commands_source.jsx'), 'utf8');
    const audioHelpSrc = readFileSync(resolve(process.cwd(), 'audio_helpers_source.jsx'), 'utf8');
    expect(hostSrc).toContain('v && v.localService === true');
    expect(phaseKSrc).toContain('voice && voice.localService === true');
    expect(botSrc).toContain('v && v.localService === true');
    expect(tourSrc).toContain('v && v.localService === true');
    expect(spotSrc).toContain('v && v.localService === true');
    expect(cmdSrc).toContain('voice && voice.localService === true');
    expect(audioHelpSrc).toContain('v && v.localService === true');
  });
});

describe('Kokoro init stall watchdog (2026-09-14)', () => {
  it('retries once from a fresh worker when no progress arrives, then succeeds', async () => {
    vi.useFakeTimers();
    try {
      FakeWorker.autoInit = false;
      const api = loadKokoro();
      const stages = [];
      const initPromise = api.init((p) => stages.push(p.stage));
      await Promise.resolve();
      await Promise.resolve();
      expect(FakeWorker.instances).toHaveLength(1);
      // Progress keeps the watchdog quiet; silence for 60 s trips it.
      FakeWorker.instances[0].emit({ type: 'progress', stage: 'Downloading voice model', pct: 0.3 });
      await vi.advanceTimersByTimeAsync(50000);
      expect(FakeWorker.instances).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(11000);
      expect(FakeWorker.instances[0].terminated).toBe(true);
      expect(FakeWorker.instances).toHaveLength(2);
      expect(stages).toContain('Download stalled, retrying');
      // The fresh worker finishes.
      FakeWorker.instances[1].emit({ type: 'ready' });
      await vi.advanceTimersByTimeAsync(0);
      const warm = FakeWorker.instances[1].messages.find((m) => m.type === 'generate' && m.id === '__warmup__');
      if (warm) FakeWorker.instances[1].emit({ type: 'audio', id: '__warmup__', buffer: new ArrayBuffer(8), elapsed: 1 });
      await expect(initPromise).resolves.toBe(true);
      expect(api.ready).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up with a TimeoutError after the second stall, and a later init can try again', async () => {
    vi.useFakeTimers();
    try {
      FakeWorker.autoInit = false;
      const api = loadKokoro();
      const initPromise = api.init(() => {});
      initPromise.catch(() => {});
      await vi.advanceTimersByTimeAsync(61000);
      expect(FakeWorker.instances).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(61000);
      await expect(initPromise).rejects.toMatchObject({ name: 'TimeoutError', code: 'kokoro-init-stalled' });
      expect(FakeWorker.instances[1].terminated).toBe(true);
      expect(api.ready).toBe(false);
      // Not stuck on the rejected promise: a new init starts a third worker.
      FakeWorker.autoInit = true;
      await expect(api.init(() => {})).resolves.toBe(true);
      expect(FakeWorker.instances).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
