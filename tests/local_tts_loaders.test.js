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
  // eslint-disable-next-line no-new-func
  new Function(kokoroSource)();
  return window._kokoroTTS;
}

function loadPiper(lib) {
  delete window._piperTTS;
  window.__piperTestLib = lib;
  const importStatement = 'const lib = await import(/* webpackIgnore: true */ PIPER_CDN);';
  const testSource = piperSource.replace(importStatement, 'const lib = window.__piperTestLib;');
  if (testSource === piperSource) throw new Error('Piper dynamic import test seam did not match');
  // eslint-disable-next-line no-new-func
  new Function(testSource)();
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
});
