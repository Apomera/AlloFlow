// Integration regression for the Leveled Text Karaoke save-as-played path.
//
// jsdom cannot decode media or call a live TTS provider, so Audio and the
// provider/encoder boundaries are deterministic fakes. Everything between
// those boundaries is production code: KaraokeReaderOverlay, SimplifiedView's
// visible Edit Audio counter, the legacy read-aloud bridge, and the v4 store.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let SimplifiedView;
let KaraokeReaderOverlay;
let KaraokeAudioStore;
let createReadAloudLegacyBridge;
let root;
let host;
let audioInstances;

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.duration = 1;
    this.playbackRate = 1;
    this.listeners = new Map();
    this.play = vi.fn(() => Promise.resolve());
    this.pause = vi.fn();
    audioInstances.push(this);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  global.requestAnimationFrame = window.requestAnimationFrame = () => 0;
  global.cancelAnimationFrame = window.cancelAnimationFrame = () => {};

  loadAlloModule('karaoke_audio_store_module.js');
  loadAlloModule('read_aloud_audio_service_module.js');
  loadAlloModule('immersive_reader_module.js');
  loadAlloModule('view_simplified_module.js');

  KaraokeAudioStore = window.AlloModules.KaraokeAudioStore;
  createReadAloudLegacyBridge = window.AlloModules.createReadAloudLegacyBridge;
  KaraokeReaderOverlay = window.AlloModules.KaraokeReaderOverlay;
  SimplifiedView = window.AlloModules.SimplifiedView;
  if (!KaraokeAudioStore || !createReadAloudLegacyBridge || !KaraokeReaderOverlay || !SimplifiedView) {
    throw new Error('Leveled Text Karaoke integration dependencies did not register');
  }
});

afterEach(() => {
  if (root) {
    try { act(() => root.unmount()); } catch (_) {}
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  vi.restoreAllMocks();
  localStorage.removeItem('allo_save_karaoke_audio');
  delete window.__alloCaptureKaraokeAudio;
  delete window.__alloResolveReadAloudAudio;
  delete window.__alloGetReadAloudAudioSummary;
  KaraokeAudioStore.current = null;
  KaraokeAudioStore.currentResourceId = null;
});

const splitSentences = (text) =>
  String(text || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [];

function simplifiedProps(resource, callTTS) {
  const noop = () => {};
  return {
    t: (key) => key,
    generatedContent: resource,
    inputText: '',
    gradeLevel: '5',
    leveledTextLanguage: 'English',
    selectedVoice: 'Kore',
    voiceSpeed: 1,
    isTeacherMode: true,
    isEditingLeveledText: true,
    isImmersiveReaderActive: false,
    isCompareMode: false,
    isSideBySide: false,
    isZenMode: true,
    isProcessing: false,
    isPlaying: false,
    interactionMode: 'read',
    history: [],
    textEditorRef: React.createRef(),
    splitTextToSentences: splitSentences,
    getSideBySideContent: () => null,
    handleFormatText: noop,
    handleSimplifiedTextChange: noop,
    callTTS,
  };
}

function mountLeveledText(resource, callTTS, getAudioUrl) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => {
    root.render(React.createElement(React.Fragment, null,
      React.createElement(SimplifiedView, simplifiedProps(resource, callTTS)),
      React.createElement(KaraokeReaderOverlay, {
        text: resource.data,
        sentenceList: splitSentences(resource.data),
        onClose: () => {},
        isOpen: true,
        isTeacher: true,
        captureOn: true,
        getAudioUrl,
      }),
    ));
  });
}

async function flushPlaybackWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 0));
    await Promise.resolve();
  });
}

describe('Leveled Text Karaoke played-audio persistence', () => {
  it('plays one TTS blob, persists v4 audio, updates the visible counter, and replays without new TTS', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    let nextStoredUrl = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => `blob:persisted-${++nextStoredUrl}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    let resource = {
      id: 'leveled-karaoke-e2e',
      type: 'simplified',
      data: 'Persist this played sentence.',
    };
    let store = KaraokeAudioStore.createStore();
    KaraokeAudioStore.current = store;
    KaraokeAudioStore.currentResourceId = resource.id;

    const callTTS = vi.fn(async () => 'blob:generated-kore-once');
    const synthesize = vi.fn(async ({
      text, profile, signal, reason, priority, maxRetries,
    }) => ({
      url: await callTTS(
        text,
        profile.voice,
        profile.synthesisRate == null ? profile.speed : profile.synthesisRate,
        { signal, reason, priority, maxRetries, language: profile.language },
        profile.language,
      ),
    }));
    const encode = vi.fn(async (url) => ({
      b64: Buffer.from(`encoded:${url}`).toString('base64'),
      mime: 'audio/mpeg',
    }));
    const persist = vi.fn(async ({ payload, resourceId }) => {
      expect(resourceId).toBe(resource.id);
      resource = { ...resource, karaokeAudio: payload };
    });
    const notify = (sentence, status, resourceId, extra) => {
      window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-capture', {
        detail: { sentence, status, resourceId, ...(extra || {}) },
      }));
    };
    const bridge = createReadAloudLegacyBridge({
      getResource: () => resource,
      getStore: () => store,
      getProfile: () => ({
        voice: 'Kore',
        language: 'English',
        synthesisRate: 1,
        provider: 'gemini',
        voiceResolverVersion: 2,
      }),
      synthesize,
      encode,
      persist,
      notify,
      normalize: (text) => String(text || '').replace(/\s+/g, ' ').trim(),
      enumerateResourceSegments: () => [{
        spokenText: 'Persist this played sentence.',
        segmentId: 'body/0/sentence/0',
        scopeId: 'main',
      }],
    });
    window.__alloCaptureKaraokeAudio = bridge.capturePlayed;

    const getAudioUrl = (sentence, requestOptions) => bridge.resolve(sentence, {
      ...(requestOptions || {}),
      profile: {
        voice: 'Kore',
        language: 'English',
        synthesisRate: 1,
        provider: 'gemini',
        voiceResolverVersion: 2,
      },
    });

    mountLeveledText(resource, callTTS, getAudioUrl);
    await flushPlaybackWork();
    expect(callTTS).toHaveBeenCalledTimes(1); // first-sentence warm
    expect(synthesize).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Persist this played sentence.',
      reason: 'karaoke-open-warm',
      priority: 'interactive',
      maxRetries: 1,
      profile: expect.objectContaining({
        voice: 'Kore',
        language: 'English',
        synthesisRate: 1,
      }),
    }));
    expect(callTTS).toHaveBeenCalledWith(
      'Persist this played sentence.',
      'Kore',
      1,
      expect.objectContaining({
        reason: 'karaoke-open-warm',
        priority: 'interactive',
        maxRetries: 1,
        language: 'English',
      }),
      'English',
    );

    const counterBefore = host.querySelector('button[aria-label^="Edit audio."]');
    expect(counterBefore).toBeTruthy();
    expect(counterBefore.getAttribute('aria-label')).toContain('0 of 1 sentences saved');

    const play = host.querySelector('button[aria-label="Play"]');
    expect(play).toBeTruthy();
    act(() => { play.click(); });
    await flushPlaybackWork();

    expect(audioInstances[0].src).toBe('blob:generated-kore-once');
    expect(encode).toHaveBeenCalledWith('blob:generated-kore-once', expect.any(Object));
    expect(persist).toHaveBeenCalledTimes(1);
    expect(resource.karaokeAudio).toMatchObject({ version: 4 });
    expect(Object.values(resource.karaokeAudio.entries)[0]).toMatchObject({
      source: 'ai-played',
      identity: {
        identityVersion: 4,
        adapterId: 'alloflow.simplified.read-aloud',
        segmentId: 'body/0/sentence/0',
        spokenText: 'Persist this played sentence.',
      },
    });
    expect(counterBefore.getAttribute('aria-label')).toContain('1 of 1 sentences saved');
    expect(counterBefore.textContent).toContain('1/1 saved');

    // Simulate reopening the saved resource in a fresh runtime. This removes
    // the overlay's warm-promise cache, so only durable v4 hydration can avoid
    // a second provider request.
    act(() => { root.unmount(); });
    root = null;
    host.remove();
    host = null;
    store = KaraokeAudioStore.createStore();
    expect(store.hydrate(resource.karaokeAudio)).toBe(1);
    KaraokeAudioStore.current = store;
    KaraokeAudioStore.currentResourceId = resource.id;

    mountLeveledText(resource, callTTS, getAudioUrl);
    await flushPlaybackWork();
    const replay = host.querySelector('button[aria-label="Play"]');
    act(() => { replay.click(); });
    await flushPlaybackWork();

    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(audioInstances).toHaveLength(2);
    expect(audioInstances[1].src).toMatch(/^blob:persisted-/);
    expect(host.querySelector('button[aria-label^="Edit audio."]').getAttribute('aria-label'))
      .toContain('1 of 1 sentences saved');
  });

  it('captures duplicated sentences into distinct segments and completes the visible counter', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    let nextStoredUrl = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => `blob:persisted-${++nextStoredUrl}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    let resource = {
      id: 'leveled-karaoke-duplicates',
      type: 'simplified',
      data: 'Jump up high. Jump up high.',
    };
    const store = KaraokeAudioStore.createStore();
    KaraokeAudioStore.current = store;
    KaraokeAudioStore.currentResourceId = resource.id;

    const callTTS = vi.fn(async () => 'blob:generated-twin');
    const synthesize = vi.fn(async ({ text, profile }) => ({ url: await callTTS(text, profile.voice) }));
    const encode = vi.fn(async (url) => ({
      b64: Buffer.from(`encoded:${url}`).toString('base64'),
      mime: 'audio/mpeg',
    }));
    const persist = vi.fn(async ({ payload }) => {
      resource = { ...resource, karaokeAudio: payload };
    });
    const notify = (sentence, status, resourceId, extra) => {
      window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-capture', {
        detail: { sentence, status, resourceId, ...(extra || {}) },
      }));
    };
    const bridge = createReadAloudLegacyBridge({
      getResource: () => resource,
      getStore: () => store,
      getProfile: () => ({
        voice: 'Kore', language: 'English', synthesisRate: 1,
        provider: 'gemini', voiceResolverVersion: 2,
      }),
      synthesize,
      encode,
      persist,
      notify,
      normalize: (text) => String(text || '').replace(/\s+/g, ' ').trim(),
      enumerateResourceSegments: () => [
        { text: 'Jump up high.', segmentId: 'body/0/sentence/0', scopeId: 'main' },
        { text: 'Jump up high.', segmentId: 'body/0/sentence/1', scopeId: 'main' },
      ],
    });
    window.__alloCaptureKaraokeAudio = bridge.capturePlayed;
    window.__alloGetReadAloudAudioSummary = (list, lane) => bridge.summary(list, lane);

    const getAudioUrl = (sentence, requestOptions) => bridge.resolve(sentence, {
      ...(requestOptions || {}),
      profile: {
        voice: 'Kore', language: 'English', synthesisRate: 1,
        provider: 'gemini', voiceResolverVersion: 2,
      },
    });

    mountLeveledText(resource, callTTS, getAudioUrl);
    await flushPlaybackWork();

    const counter = host.querySelector('button[aria-label^="Edit audio."]');
    expect(counter).toBeTruthy();
    expect(counter.getAttribute('aria-label')).toContain('0 of 2 sentences saved');

    const play = host.querySelector('button[aria-label="Play"]');
    act(() => { play.click(); });
    await flushPlaybackWork();
    expect(counter.getAttribute('aria-label')).toContain('1 of 2 sentences saved');

    // Finish the first clip; auto-advance plays the identical twin, which must
    // capture into ITS OWN segment instead of no-oping on its sibling's.
    await act(async () => {
      const ended = audioInstances[0].listeners.get('ended');
      if (ended) ended();
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 320));
    });
    await flushPlaybackWork();

    expect(Object.values(resource.karaokeAudio.entries)
      .map((entry) => entry.identity.segmentId).sort()).toEqual([
      'body/0/sentence/0',
      'body/0/sentence/1',
    ]);
    expect(counter.getAttribute('aria-label')).toContain('2 of 2 sentences saved');
  });

  it('drives the production overlay wiring through window.__alloResolveReadAloudAudio and pins the resolution voice', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    let nextStoredUrl = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => `blob:persisted-${++nextStoredUrl}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    let resource = {
      id: 'leveled-karaoke-wiring',
      type: 'simplified',
      data: 'Wiring pinned sentence.',
      immersiveData: [
        { id: 'w0', text: 'Wiring', pos: 'noun' },
        { id: 'w1', text: 'pinned', pos: 'adj' },
        { id: 'w2', text: 'sentence.', pos: 'noun' },
      ],
    };
    const store = KaraokeAudioStore.createStore();
    KaraokeAudioStore.current = store;
    KaraokeAudioStore.currentResourceId = resource.id;

    // The HOST-side live profile: hydrates to a different voice after the
    // overlay has already resolved its clip.
    let liveVoice = 'Kore';
    const synthesize = vi.fn(async ({ profile }) => ({ url: 'blob:wiring-' + profile.voice }));
    const encode = vi.fn(async (url) => ({
      b64: Buffer.from(`encoded:${url}`).toString('base64'),
      mime: 'audio/mpeg',
    }));
    const persist = vi.fn(async ({ payload }) => {
      resource = { ...resource, karaokeAudio: payload };
    });
    const notify = (sentence, status, resourceId, extra) => {
      window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-capture', {
        detail: { sentence, status, resourceId, ...(extra || {}) },
      }));
    };
    const bridge = createReadAloudLegacyBridge({
      getResource: () => resource,
      getStore: () => store,
      getProfile: () => ({
        voice: liveVoice, language: 'English', synthesisRate: 1,
        provider: 'gemini', voiceResolverVersion: 2,
      }),
      synthesize,
      encode,
      persist,
      notify,
      normalize: (text) => String(text || '').replace(/\s+/g, ' ').trim(),
      enumerateResourceSegments: () => [
        { text: 'Wiring pinned sentence.', segmentId: 'body/0/sentence/0', scopeId: 'main' },
      ],
    });
    const sharedResolve = vi.fn((sentence, options) => bridge.resolve(sentence, options || {}));
    window.__alloResolveReadAloudAudio = sharedResolve;
    window.__alloCaptureKaraokeAudio = vi.fn((sentence, url, options) => (
      bridge.capturePlayed(sentence, url, options || {})
    ));
    window.__alloGetReadAloudAudioSummary = (list, lane) => bridge.summary(list, lane);

    // Render the overlay THROUGH SimplifiedView so playback uses the
    // production getKaraokeAudioUrl → window.__alloResolveReadAloudAudio
    // chain instead of an injected resolver.
    const nullComponent = () => null;
    const passthrough = (props) => props.children || null;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => {
      root.render(React.createElement(SimplifiedView, {
        ...simplifiedProps(resource, vi.fn(async () => 'blob:wrong-direct-calltts')),
        isImmersiveReaderActive: true,
        isKaraokeOverlayActive: true,
        setIsKaraokeOverlayActive: () => {},
        immersiveSettings: { textSize: 18, bgColor: '#ffffff', lineFocus: false },
        immersiveRulerY: 0,
        setImmersiveRulerY: () => {},
        playbackState: { currentIdx: -1 },
        playbackRate: 1,
        setPlaybackRate: () => {},
        lineHeight: 1.5,
        setLineHeight: () => {},
        letterSpacing: 0,
        setLetterSpacing: () => {},
        handleCloseImmersiveReader: () => {},
        handleGeneratePOSData: () => {},
        handleCloseSpeedReader: () => {},
        isFocusReaderActive: false,
        setIsFocusReaderActive: () => {},
        isChunkReaderActive: false,
        setIsChunkReaderActive: () => {},
        chunkReaderIdx: 0,
        setChunkReaderIdx: () => {},
        chunkReaderAutoPlay: false,
        setChunkReaderAutoPlay: () => {},
        chunkReaderSpeed: 1,
        setChunkReaderSpeed: () => {},
        setChunkReaderMood: () => {},
        chunkReaderReadAlong: false,
        setChunkReaderReadAlong: () => {},
        setChunkReaderSweepPct: () => {},
        isCrawlReaderActive: false,
        setIsCrawlReaderActive: () => {},
        chunkReaderSweepAudioRef: React.createRef(),
        chunkReaderSweepRafRef: React.createRef(),
        ImmersiveToolbar: nullComponent,
        ImmersiveWord: nullComponent,
        ErrorBoundary: passthrough,
        FocusReaderOverlay: nullComponent,
        PerspectiveCrawlOverlay: nullComponent,
        KaraokeReaderOverlay,
        ConfettiExplosion: nullComponent,
        ComplexityGauge: nullComponent,
        SourceReferencesPanel: nullComponent,
      }));
    });
    await flushPlaybackWork();

    // The overlay's open-warm already went through the production global chain
    // with the snapshot profile and the occurrence index.
    expect(sharedResolve).toHaveBeenCalledWith('Wiring pinned sentence.', expect.objectContaining({
      reason: 'karaoke-open-warm',
      priority: 'interactive',
      maxRetries: 1,
      occurrence: 0,
      profile: expect.objectContaining({ voice: 'Kore', language: 'English' }),
    }));
    expect(synthesize).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Wiring pinned sentence.',
      profile: expect.objectContaining({ voice: 'Kore' }),
    }));

    // Host voice settings hydrate AFTER resolution but BEFORE play + capture.
    liveVoice = 'Puck';

    const play = host.querySelector('button[aria-label="Play"]');
    expect(play).toBeTruthy();
    act(() => { play.click(); });
    await flushPlaybackWork();

    expect(audioInstances[0].src).toBe('blob:wiring-Kore');
    const entry = Object.values(resource.karaokeAudio.entries)[0];
    expect(entry.source).toBe('ai-played');
    expect(entry.identity.segmentId).toBe('body/0/sentence/0');
    // The persisted metadata carries the RESOLUTION voice, not the hydrated one.
    expect(entry.synthesisProfile).toMatchObject({ voice: 'Kore' });
  });
});
