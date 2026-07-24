// Wave-1 regressions for the 2026-07-17 TTS/karaoke/formatting handoff
// (docs/AGENT_HANDOFF_TTS_KARAOKE_FORMATTING_2026-07-17.md).
//
// Pins five confirmed defects with BEHAVIORAL assertions (spies on actual
// callTTS/store calls, never source-string checks):
//  1. Markdown heading glued mid-paragraph ("...(url)## Why the Brain Dreams")
//     is repaired deterministically by normalizeMarkdownBlockBoundaries.
//  2. Adventure prewarm sends the SAME sanitized text + resolved voice that
//     playback will request (identical urlCache key), starting from the same
//     speaker state.
//  3. KaraokeAudioStore.getCompatible refuses a stored Puck AI clip when Kore
//     is selected; human recordings stay voice-independent.
//  4. callTTS's urlCache owns its blob URLs: bounded LRU eviction revokes,
//     window.__alloTtsCacheOwnsUrl reports ownership, and the 150ms settle
//     gap no longer blocks the caller's await.
//  5. The karaoke overlay re-warms look-ahead sentences under a NEW resolver
//     identity (voice/speed/language change) instead of trusting index-only
//     warm state.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let KaraokeReaderOverlay;
let createTTS;
let TPH; // TextPipelineHelpers registry
let PK;  // PhaseKHelpers registry
let KS;  // KaraokeAudioStore namespace
let root;
let host;
let audioInstances = [];

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
  addEventListener(type, listener) { this.listeners.set(type, listener); }
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

  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('karaoke_audio_store_module.js');
  loadAlloModule('tts_module.js');
  loadAlloModule('immersive_reader_module.js');

  TPH = window.AlloModules.createTextPipelineHelpers();
  window.AlloModules.TextPipelineHelpers = TPH;
  PK = window.AlloModules.PhaseKHelpers;
  KS = window.AlloModules.KaraokeAudioStore;
  createTTS = window.AlloModules.createTTS;
  KaraokeReaderOverlay = window.AlloModules.KaraokeReaderOverlay;
  if (!TPH || !PK || !KS || !createTTS || !KaraokeReaderOverlay) {
    throw new Error('A target module did not register');
  }
});

afterEach(() => {
  if (root) { try { act(() => root.unmount()); } catch (_) {} root = null; }
  if (host) { host.remove(); host = null; }
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  audioInstances = [];
  if (window.AlloModules && window.AlloModules.KaraokeAudioStore) {
    window.AlloModules.KaraokeAudioStore.current = null;
  }
  delete window.__alloTtsCacheOwnsUrl;
});

// The exact malformed boundary from the reported Dreams leveled text.
const DREAMS_GLUED =
  'Dreams are stories the mind tells throughout the night. [⁽⁴⁾](https://www.sleepfoundation.org/dreams) [⁽²⁾](https://www.merriam-webster.com/dictionary/dream)## Why the Brain Dreams\n\nScientists study why the brain dreams.';

describe('normalizeMarkdownBlockBoundaries (Dreams heading repair)', () => {
  it('repairs the exact reported Dreams boundary into a real heading', () => {
    const out = TPH.normalizeMarkdownBlockBoundaries(DREAMS_GLUED);
    expect(out).toContain('\n\n## Why the Brain Dreams');
    expect(out).not.toContain(')## Why');
    // Citations stay intact and in place.
    expect(out).toContain('[⁽⁴⁾](https://www.sleepfoundation.org/dreams)');
    expect(out).toContain('[⁽²⁾](https://www.merriam-webster.com/dictionary/dream)');
  });

  it('repairs sentence-punctuation gluing (".## Heading")', () => {
    const out = TPH.normalizeMarkdownBlockBoundaries('The night ended.## What Comes Next\nMore text.');
    expect(out).toContain('.\n\n## What Comes Next');
  });

  it('leaves valid inline hash uses untouched', () => {
    const samples = [
      'C# is a language many programmers enjoy.',
      'See issue # 5 for details.',
      'Use the #hashtag convention online.',
      'Already\n\n## A Real Heading\n\nis untouched.',
    ];
    for (const s of samples) {
      expect(TPH.normalizeMarkdownBlockBoundaries(s)).toBe(s);
    }
  });

  it('never rewrites fenced code blocks', () => {
    const code = 'Intro line.\n\n```js\nconst x = f(a).## not a heading\n```\n\nOutro.';
    expect(TPH.normalizeMarkdownBlockBoundaries(code)).toBe(code);
  });

  it('produces units the splitter and sanitizer both handle (no mid-unit "##")', () => {
    const repaired = TPH.normalizeMarkdownBlockBoundaries(DREAMS_GLUED);
    const PH = window.AlloModules.PureHelpers;
    const units = repaired.split(/\n{2,}/).flatMap((p) => PH.splitTextToSentences(p, {}));
    for (const unit of units) {
      // A unit either IS the heading (leading hashes, stripped for speech)
      // or carries no heading marker at all.
      if (unit.includes('##')) expect(unit.trimStart().startsWith('#')).toBe(true);
      expect(PK.toSpokenText(unit)).not.toContain('#');
    }
  });
});

describe('toSpokenText (canonical spoken-text sanitizer)', () => {
  it('removes every citation form and never leaks URLs', () => {
    const raw = 'Dreams matter. [⁽⁴⁾](https://www.sleepfoundation.org/dreams) [1] [Source 2] ⁽³⁾ **bold** [link text](https://example.com)';
    const spoken = PK.toSpokenText(raw);
    expect(spoken).toContain('Dreams matter.');
    expect(spoken).toContain('link text');
    expect(spoken).not.toMatch(/https?:/);
    expect(spoken).not.toMatch(/⁽|⁾/);
    expect(spoken).not.toContain('[1]');
    expect(spoken).not.toContain('[Source 2]');
    expect(spoken).not.toContain('**');
  });

  it('is the same function the store fallback rules mirror (heading + list markers)', () => {
    expect(PK.toSpokenText('## A Heading')).toBe('A Heading');
    expect(PK.toSpokenText('- item one')).toBe('item one');
    expect(PK.toSpokenText('1. first')).toBe('first');
  });
});

describe('sequenceBufferKey (cross-resource buffer identity)', () => {
  it('differs for the same index/voice when the spoken text differs', () => {
    const a = PK.sequenceBufferKey(0, 'Kore', 'Old resource sentence.');
    const b = PK.sequenceBufferKey(0, 'Kore', 'New resource sentence.');
    expect(a).not.toBe(b);
    expect(PK.sequenceBufferKey(0, 'Kore', 'Old resource sentence.')).toBe(a);
  });
});

describe('adventure prewarm/live request parity', () => {
  it('warms with the sanitized text and the exact voice playback will resolve', () => {
    const PH = window.AlloModules.PureHelpers;
    const split = (t) => PH.splitTextToSentences(t, {});
    const voiceMap = { Mira: 'Kore' };
    const sceneText =
      'The dragon roared over the valley. [⁽¹⁾](https://example.com/dragons) "Halt, travelers!" cried Mira.';
    const calls = [];
    const callTTS = vi.fn((text, voice) => { calls.push([text, voice]); return Promise.resolve('blob:warm'); });

    const warmed = PK.prewarmSequenceAudio(sceneText, {
      count: 2,
      voiceMap,
      deps: { callTTS, splitTextToSentences: split, selectedVoice: 'Puck' },
    });
    expect(warmed).toBe(2);

    // Recreate playback's derivation: handleSpeak starts the adventure chain
    // with activeSpeaker = selectedVoice, resolves per-sentence voices via
    // resolveAdventureSentenceVoice, and sanitizes with the shared sanitizer.
    const sentences = split(sceneText).filter((s) => s && s.trim());
    let active = 'Puck';
    const expected = [];
    for (let i = 0; i < 2 && i < sentences.length; i++) {
      const r = PK.resolveAdventureSentenceVoice(sentences, i, active, voiceMap, 'Puck');
      active = r.nextSpeaker;
      expected.push([PK.toSpokenText(sentences[i]), r.currentVoice]);
    }
    expect(calls).toEqual(expected);

    // And the warmed text is genuinely clean: no citation, URL, or markdown.
    for (const [text] of calls) {
      expect(text).not.toMatch(/https?:|⁽|\[|\]/);
    }
  });
});

describe('KaraokeAudioStore.getCompatible (stale stored-voice guard)', () => {
  const AUDIO_B64 = Buffer.from('tiny clip bytes').toString('base64');

  function storeWith(source, metadata) {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true, writable: true, value: vi.fn(() => 'blob:stored-clip'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true, writable: true, value: vi.fn(),
    });
    const st = KS.createStore();
    const url = st.put('The sun is hot.', AUDIO_B64, 'audio/mpeg', source, metadata);
    expect(url).toBeTruthy();
    return st;
  }

  it('refuses a stored Puck AI clip when Kore is selected', () => {
    const st = storeWith('ai', { voice: 'Puck', speed: 1, language: 'English', voiceResolverVersion: 2 });
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore', speed: 1, language: 'English' })).toBeNull();
    expect(st.getCompatible('The sun is hot.', { voice: 'Puck', speed: 1, language: 'English' })).toBe('blob:stored-clip');
  });

  it('treats legacy AI clips without voice metadata as a mismatch (self-heal)', () => {
    const st = storeWith('ai', null);
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore' })).toBeNull();
  });

  it('rejects pre-resolver AI metadata even when the recorded label says Kore', () => {
    const st = storeWith('ai', { voice: 'Kore', speed: 1, language: 'English' });
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore', speed: 1, language: 'English' })).toBeNull();
  });

  it('always serves human recordings regardless of the selected voice', () => {
    const st = storeWith('human-teacher', { voice: 'Puck' });
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore', speed: 1.5, language: 'Spanish' })).toBe('blob:stored-clip');
  });

  it('rejects speed and language mismatches for AI clips', () => {
    const st = storeWith('ai', { voice: 'Kore', speed: 1, language: 'English', voiceResolverVersion: 2 });
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore', speed: 1.5, language: 'English' })).toBeNull();
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore', speed: 1, language: 'Spanish' })).toBeNull();
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore', speed: 1, language: 'English' })).toBe('blob:stored-clip');
  });

  it('is case-insensitive on voice names', () => {
    const st = storeWith('ai', { voice: 'kore', voiceResolverVersion: 2 });
    expect(st.getCompatible('The sun is hot.', { voice: 'Kore' })).toBe('blob:stored-clip');
  });
});

describe('callTTS urlCache ownership + bounded eviction', () => {
  function makeTTS(state, isCanvas = true) {
    return createTTS({
      state,
      apiKey: 'test-key',
      GEMINI_MODELS: { tts: 'test-tts' },
      AVAILABLE_VOICES: ['Puck', 'Kore'],
      _isCanvasEnv: isCanvas,
      languageToTTSCode: () => 'en',
      isGlobalMuted: () => false,
      warnLog: () => {},
      debugLog: () => {},
      getLeveledTextLanguage: () => 'English',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({}),
      getAi: () => null,
      setShowKokoroOfferModal: null,
    });
  }

  function stubSynthesis() {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true, writable: true, value: vi.fn(() => 'blob:new-clip'),
    });
    const revoke = vi.fn();
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true, writable: true, value: revoke,
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('pcm').toString('base64') } }] } }],
      }),
    })));
    return revoke;
  }

  it('reports cache ownership, evicts oldest beyond the cap, and revokes ONLY on eviction', async () => {
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    const revoke = stubSynthesis();
    const { callTTS } = makeTTS(state);

    // Pre-fill the cache to its cap so one synthesis triggers one eviction.
    for (let i = 0; i < 150; i++) state.urlCache.set(`key-${i}`, `blob:fake-${i}`);
    expect(window.__alloTtsCacheOwnsUrl('blob:fake-0')).toBe(true);

    const url = await callTTS('hello there friend', 'Puck');
    expect(url).toBe('blob:new-clip');
    expect(state.urlCache.size).toBe(150);

    // Oldest entry evicted AND revoked; the rest untouched.
    expect(state.urlCache.has('key-0')).toBe(false);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:fake-0');

    // Ownership predicate tracks the transition.
    expect(window.__alloTtsCacheOwnsUrl('blob:fake-0')).toBe(false);
    expect(window.__alloTtsCacheOwnsUrl('blob:new-clip')).toBe(true);
    expect(window.__alloTtsCacheOwnsUrl('blob:unrelated')).toBe(false);
  });

  it('replay after playback is a cache hit with the SAME (unrevoked) URL', async () => {
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    const revoke = stubSynthesis();
    const { callTTS } = makeTTS(state);

    const first = await callTTS('replay me please', 'Kore');
    // Host cleanup consults ownership before revoking (releaseBlob guard):
    // a cache-owned URL must NOT be revoked between plays.
    expect(window.__alloTtsCacheOwnsUrl(first)).toBe(true);
    const second = await callTTS('replay me please', 'Kore');
    expect(second).toBe(first);
    expect(revoke).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('keys non-Canvas cloud audio by the resolved Gemini voice', async () => {
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    stubSynthesis();
    const { callTTS } = makeTTS(state, false);

    const first = await callTTS('Cache this resolved voice.', 'not-a-gemini-voice', 1, 0, 'English');
    const second = await callTTS('Cache this resolved voice.', 'Kore', 1, 0, 'English');

    expect(second).toBe(first);
    expect(Array.from(state.urlCache.keys())).toEqual(['cache this resolved voice.__Kore__1__English']);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('resolves the caller without waiting for the 150ms inter-request settle gap', async () => {
    vi.useFakeTimers();
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    stubSynthesis();
    const { callTTS } = makeTTS(state);
    // With fake timers, a caller-side 150ms await would hang this promise.
    let settled = false;
    const p = callTTS('prompt latency check', 'Puck').then((u) => { settled = true; return u; });
    // Drain microtasks only — no timer advancement at all.
    for (let i = 0; i < 20 && !settled; i++) await Promise.resolve();
    await p;
    expect(settled).toBe(true);
  });

  it('starts interactive karaoke audio while the background TTS lane is occupied', async () => {
    const neverFinishes = new Promise(() => {});
    const state = {
      queue: neverFinishes,
      botQueue: Promise.resolve(),
      urlCache: new Map(),
      rateLimitedUntil: 0,
    };
    stubSynthesis();
    const { callTTS } = makeTTS(state);

    const url = await callTTS('Foreground karaoke sentence.', 'Kore', 1, {
      language: 'English',
      maxRetries: 0,
      priority: 'interactive',
    });

    expect(url).toBe('blob:new-clip');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(state.interactiveQueue).toBeTruthy();
  });

  it('honors Karaoke zero-retry requests in the Canvas Gemini path', async () => {
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { callTTS } = makeTTS(state);

    const url = await callTTS('Do not delay this look-ahead.', 'Kore', 1, {
      language: 'English',
      maxRetries: 0,
      priority: 'background',
    });

    expect(url).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the live selected Gemini voice when VoiceConfig loads after the TTS factory', async () => {
    let liveVoices = [];
    let selectedVoice = 'Aoede';
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true, writable: true, value: vi.fn(() => 'blob:live-voice'),
    });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('pcm').toString('base64') } }] } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    // This mirrors production boot: TTS can initialize while AVAILABLE_VOICES
    // is still the original empty array, then VoiceConfig arrives later.
    const { callTTS } = createTTS({
      state,
      apiKey: 'test-key',
      GEMINI_MODELS: { tts: 'test-tts' },
      AVAILABLE_VOICES: [],
      getAvailableVoices: () => liveVoices,
      getSelectedVoice: () => selectedVoice,
      _isCanvasEnv: true,
      languageToTTSCode: () => 'en',
      isGlobalMuted: () => false,
      warnLog: () => {},
      debugLog: () => {},
      getLeveledTextLanguage: () => 'English',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({}),
      getAi: () => null,
      setShowKokoroOfferModal: null,
    });
    liveVoices = ['Kore', 'Puck', 'Aoede'];

    await callTTS('Use the selected voice when omitted.', undefined, 1, 0, 'English');
    selectedVoice = 'Kore';
    await callTTS('Use the selected voice for an invalid request.', 'not-a-real-voice', 1, 0, 'English');

    const requestedVoices = fetchMock.mock.calls.map(([, options]) => {
      const payload = JSON.parse(options.body);
      return payload.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName;
    });
    expect(requestedVoices).toEqual(['Aoede', 'Kore']);
  });
});

describe('karaoke overlay warm-state reset on resolver signature change', () => {
  function renderKaraoke(props) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const render = (nextProps) => {
      act(() => { root.render(React.createElement(KaraokeReaderOverlay, nextProps)); });
    };
    render(props);
    return { render };
  }

  it('re-warms look-ahead sentences through a NEW resolver after a signature change', async () => {
    vi.useFakeTimers();
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;
    const sentences = ['First sentence.', 'Second sentence.', 'Third sentence.', 'Fourth sentence.'];

    const resolverA = vi.fn((s) => Promise.resolve('blob:A-' + s));
    const resolverB = vi.fn((s) => Promise.resolve('blob:B-' + s));
    const baseProps = {
      text: sentences.join(' '),
      sentenceList: sentences,
      onClose: () => {},
      isOpen: true,
      isTeacher: false,
      captureOn: false,
      getAudioUrl: resolverA,
    };
    const view = renderKaraoke(baseProps);

    const play = host.querySelector('button[aria-label="Play"]');
    expect(play).toBeTruthy();
    await act(async () => { play.click(); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); await Promise.resolve(); });

    // Resolver A served the current sentence and warmed the look-ahead.
    const aWarmed = resolverA.mock.calls.map((c) => c[0]);
    expect(aWarmed).toContain('Second sentence.');

    // Voice change → parent memoizes a NEW resolver identity.
    resolverA.mockClear();
    view.render({ ...baseProps, getAudioUrl: resolverB });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); await Promise.resolve(); });

    // Index-only warm state would skip these; the signature reset re-warms
    // through the NEW resolver so the audio matches the new voice.
    const bCalls = resolverB.mock.calls.map((c) => c[0]);
    expect(bCalls).toContain('Second sentence.');
    expect(resolverA).not.toHaveBeenCalled();
  });
});
