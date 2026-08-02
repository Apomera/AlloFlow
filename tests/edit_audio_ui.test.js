// Edit Audio mode regression coverage.
//
// Mounts the real SimplifiedView in teacher text-edit mode and exercises the
// per-sentence audio lifecycle against an in-memory KaraokeAudioStore. No live
// TTS provider, microphone, or network access is used.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let SimplifiedView;
let RealKaraokeStore;
let root;
let host;
let audioInstances;

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.duration = 1;
    this.paused = true;
    this.playbackRate = 1;
    this.play = vi.fn(async () => { this.paused = false; });
    this.pause = vi.fn(() => { this.paused = true; });
    audioInstances.push(this);
  }
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_simplified_module.js');
  SimplifiedView = window.AlloModules.SimplifiedView;
  if (!SimplifiedView) throw new Error('SimplifiedView did not register');
  // Keep a handle on the REAL store exports: afterEach deletes the window
  // binding, and the module's double-load guard prevents re-registration.
  loadAlloModule('karaoke_audio_store_module.js');
  RealKaraokeStore = window.AlloModules.KaraokeAudioStore;
  if (!RealKaraokeStore) throw new Error('KaraokeAudioStore did not register');
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
  delete window.__alloRegenerateSentenceAudio;
  delete window.__alloRemoveSentenceAudio;
  delete window.__alloStoreRecordedSentenceAudio;
  delete window.__alloInspectReadAloudAudio;
  delete window.__alloResolveReadAloudAudio;
  if (window.AlloModules) delete window.AlloModules.KaraokeAudioStore;
});

const splitSentences = (text) =>
  String(text || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [];

function baseProps(overrides = {}) {
  const noop = () => {};
  return {
    t: (key) => key,
    generatedContent: {
      id: 'resource-edit-audio',
      type: 'simplified',
      data: 'First sentence. Second sentence.',
    },
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
    callTTS: vi.fn(),
    ...overrides,
  };
}

function mount(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(SimplifiedView, props)); });
}

function button(label) {
  return host.querySelector(`button[aria-label="${label}"]`);
}

describe('SimplifiedView Edit Audio mode', () => {
  it('opens sentence tools and supports generate, play, and remove for one sentence', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;

    const saved = new Set();
    const urlFor = (sentence) => `blob:${sentence.replace(/\W+/g, '-').toLowerCase()}`;
    const store = {
      keyFor: (sentence) => String(sentence).toLowerCase(),
      has: (sentence) => saved.has(sentence),
      get: (sentence) => saved.has(sentence) ? urlFor(sentence) : null,
      sourceOf: (sentence) => saved.has(sentence) ? 'ai' : null,
      metadataOf: (sentence) => saved.has(sentence) ? {
        voice: 'Kore',
        speed: 1,
        language: 'English',
        voiceResolverVersion: 2,
      } : null,
    };
    window.AlloModules.KaraokeAudioStore = {
      current: store,
      keyFor: store.keyFor,
    };

    window.__alloRegenerateSentenceAudio = vi.fn(async (sentence) => {
      saved.add(sentence);
      return urlFor(sentence);
    });
    window.__alloRemoveSentenceAudio = vi.fn(async (sentence) => {
      saved.delete(sentence);
      return true;
    });
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);

    mount(baseProps());

    const toggle = host.querySelector('button[aria-label^="Edit audio."]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('[role="region"][aria-label="Sentence audio editor"]')).toBeNull();

    act(() => { toggle.click(); });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('[role="region"][aria-label="Sentence audio editor"]')).toBeTruthy();

    const missingPlay = button('Play audio for sentence 1');
    expect(missingPlay).toBeTruthy();
    expect(missingPlay.disabled).toBe(true);
    expect(button('Generate audio for sentence 1')).toBeTruthy();
    expect(button('Record teacher audio for sentence 1')).toBeTruthy();
    expect(button('Remove saved audio for sentence 1')).toBeNull();

    await act(async () => {
      button('Generate audio for sentence 1').click();
      await Promise.resolve();
    });

    expect(window.__alloRegenerateSentenceAudio).toHaveBeenCalledWith(
      'First sentence.',
      expect.objectContaining({
        occurrence: 0,
        identity: 'source:0:0',
        profile: expect.objectContaining({ voice: 'Kore', language: 'English' }),
      }),
    );
    expect(button('Regenerate audio for sentence 1')).toBeTruthy();
    expect(button('Remove saved audio for sentence 1')).toBeTruthy();
    expect(button('Play audio for sentence 1').disabled).toBe(false);

    await act(async () => {
      button('Play audio for sentence 1').click();
      await Promise.resolve();
    });
    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].src).toBe(urlFor('First sentence.'));
    expect(audioInstances[0].play).toHaveBeenCalledTimes(1);

    await act(async () => {
      button('Remove saved audio for sentence 1').click();
      await Promise.resolve();
    });

    expect(window.__alloRemoveSentenceAudio).toHaveBeenCalledWith(
      'First sentence.',
      expect.objectContaining({
        occurrence: 0,
        identity: 'source:0:0',
        profile: expect.objectContaining({ voice: 'Kore', language: 'English' }),
      }),
    );
    expect(audioInstances[0].pause).toHaveBeenCalled();
    expect(button('Generate audio for sentence 1')).toBeTruthy();
    expect(button('Play audio for sentence 1').disabled).toBe(true);
    expect(button('Remove saved audio for sentence 1')).toBeNull();
  });

  it('previews the exact saved stale clip without synthesizing replacement audio', async () => {
    audioInstances = [];
    global.Audio = window.Audio = FakeAudio;

    const rawGet = vi.fn(() => 'blob:store-fallback');
    const store = {
      keyFor: (sentence) => String(sentence).toLowerCase(),
      has: (sentence) => sentence === 'First sentence.',
      get: rawGet,
      sourceOf: () => 'ai-generated',
      metadataOf: () => ({
        voice: 'Puck',
        speed: 0.9,
        language: 'English',
        voiceResolverVersion: 2,
      }),
    };
    window.AlloModules.KaraokeAudioStore = {
      current: store,
      keyFor: store.keyFor,
    };

    window.__alloInspectReadAloudAudio = vi.fn((sentence) => sentence === 'First sentence.' ? {
      status: 'stale',
      url: null,
      storedUrl: 'blob:saved-puck',
      source: 'ai-generated',
      metadata: {
        voice: 'Puck',
        speed: 0.9,
        language: 'English',
        voiceResolverVersion: 2,
      },
    } : {
      status: 'missing',
      url: null,
      storedUrl: null,
      source: null,
      metadata: null,
    });
    window.__alloResolveReadAloudAudio = vi.fn(async () => 'blob:wrong-fresh-clip');
    window.__alloRegenerateSentenceAudio = vi.fn(async () => 'blob:rebuilt');
    window.__alloRemoveSentenceAudio = vi.fn(async () => true);
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);
    const callTTS = vi.fn(async () => 'blob:wrong-direct-tts');

    mount(baseProps({ selectedVoice: 'Kore', voiceSpeed: 1, callTTS }));
    act(() => { host.querySelector('button[aria-label^="Edit audio."]').click(); });

    rawGet.mockClear();
    window.__alloResolveReadAloudAudio.mockClear();
    callTTS.mockClear();
    await act(async () => {
      button('Play audio for sentence 1').click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].src).toBe('blob:saved-puck');
    expect(audioInstances[0].play).toHaveBeenCalledTimes(1);
    expect(window.__alloResolveReadAloudAudio).not.toHaveBeenCalled();
    expect(callTTS).not.toHaveBeenCalled();
    expect(rawGet).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Saved \u00b7 settings changed');
  });

  it('keeps an unreadable saved clip removable and offers to rebuild it', async () => {
    audioInstances = [];
    class UnreadableAudio extends FakeAudio {
      constructor(src) {
        super(src);
        this.error = { code: 4 };
        const error = new Error('The element has no supported sources.');
        error.name = 'NotSupportedError';
        this.play = vi.fn(async () => { throw error; });
      }
    }
    global.Audio = window.Audio = UnreadableAudio;

    const store = {
      keyFor: (sentence) => String(sentence).toLowerCase(),
      has: (sentence) => sentence === 'First sentence.',
      get: vi.fn(() => 'blob:broken-saved-clip'),
      sourceOf: () => 'ai-generated',
      metadataOf: () => ({
        voice: 'Kore',
        speed: 1,
        language: 'English',
        voiceResolverVersion: 2,
      }),
    };
    window.AlloModules.KaraokeAudioStore = {
      current: store,
      keyFor: store.keyFor,
    };

    window.__alloInspectReadAloudAudio = vi.fn((sentence) => sentence === 'First sentence.' ? {
      status: 'ready',
      url: 'blob:broken-saved-clip',
      storedUrl: 'blob:broken-saved-clip',
      source: 'ai-generated',
      metadata: {
        voice: 'Kore',
        speed: 1,
        language: 'English',
        voiceResolverVersion: 2,
      },
    } : {
      status: 'missing',
      url: null,
      storedUrl: null,
      source: null,
      metadata: null,
    });
    window.__alloResolveReadAloudAudio = vi.fn(async () => 'blob:wrong-fresh-clip');
    window.__alloRegenerateSentenceAudio = vi.fn(async () => 'blob:rebuilt');
    window.__alloRemoveSentenceAudio = vi.fn(async () => true);
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);

    mount(baseProps({ selectedVoice: 'Kore', voiceSpeed: 1 }));
    act(() => { host.querySelector('button[aria-label^="Edit audio."]').click(); });

    await act(async () => {
      button('Play audio for sentence 1').click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].src).toBe('blob:broken-saved-clip');
    expect(host.textContent).toContain('Saved \u00b7 unreadable');
    expect(button('Rebuild audio for sentence 1')).toBeTruthy();
    expect(button('Remove saved audio for sentence 1')).toBeTruthy();
    expect(host.textContent).toContain('1/2 saved');
    expect(window.__alloRemoveSentenceAudio).not.toHaveBeenCalled();
    expect(window.__alloResolveReadAloudAudio).not.toHaveBeenCalled();
  });
  it('shows saved voice settings, rebuild guidance, and capture-limit failures', async () => {
    const saved = new Set(['First sentence.']);
    const store = {
      keyFor: (sentence) => String(sentence).toLowerCase(),
      has: (sentence) => saved.has(sentence),
      get: (sentence) => saved.has(sentence) ? 'blob:saved-' + sentence : null,
      sourceOf: (sentence) => saved.has(sentence) ? 'ai-played' : null,
      metadataOf: (sentence) => saved.has(sentence) ? {
        voice: 'Puck',
        speed: 0.9,
        language: 'English',
        provider: 'played-tts-mp3',
      } : null,
      estimateBytes: () => 1024 * 1024,
      limits: () => ({ maxBytes: 12 * 1024 * 1024, maxClipBytes: 2 * 1024 * 1024 }),
    };
    window.AlloModules.KaraokeAudioStore = {
      current: store,
      keyFor: store.keyFor,
    };
    window.__alloRegenerateSentenceAudio = vi.fn(async () => 'blob:rebuilt');
    window.__alloRemoveSentenceAudio = vi.fn(async () => true);
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);

    mount(baseProps({ selectedVoice: 'Kore', voiceSpeed: 1 }));
    const toggle = host.querySelector('button[aria-label^="Edit audio."]');
    act(() => { toggle.click(); });

    expect(button('Rebuild audio for sentence 1')).toBeTruthy();
    expect(host.textContent).toContain('settings changed');
    expect(host.textContent).toContain('AI voice');
    expect(host.textContent).toContain('Puck');
    expect(host.textContent).toContain('1/2 saved');
    expect(host.textContent).toContain('1/12 MB');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-capture', {
        detail: {
          sentence: 'First sentence.',
          resourceId: 'resource-edit-audio',
          status: 'limit',
          code: 'resource-limit',
          reason: 'This resource reached its 12 MB saved read-aloud limit.',
        },
      }));
      await Promise.resolve();
    });

    expect(host.textContent).toContain('Storage limit');
    expect(host.textContent).toContain('1 save issue');
    expect(host.textContent).toContain('This resource reached its 12 MB saved read-aloud limit.');
  });
  it('auto-populates Edit Audio when a played karaoke clip finishes saving', async () => {
    const saved = new Set();
    const store = {
      has: (sentence) => saved.has(sentence),
      get: (sentence) => saved.has(sentence) ? 'blob:saved-' + sentence : null,
      sourceOf: (sentence) => saved.has(sentence) ? 'ai-played' : null,
      metadataOf: (sentence) => saved.has(sentence) ? {
        voice: 'Kore',
        speed: 1,
        language: 'English',
        provider: 'played-tts-mp3',
      } : null,
      estimateBytes: () => saved.size * 2048,
      limits: () => ({ maxBytes: 12 * 1024 * 1024, maxClipBytes: 2 * 1024 * 1024 }),
    };
    window.AlloModules.KaraokeAudioStore = {
      current: store,
      keyFor: (sentence) => String(sentence).toLowerCase(),
    };
    window.__alloRegenerateSentenceAudio = vi.fn();
    window.__alloRemoveSentenceAudio = vi.fn();
    window.__alloStoreRecordedSentenceAudio = vi.fn();

    mount(baseProps());
    const toggle = host.querySelector('button[aria-label^="Edit audio."]');
    expect(toggle.getAttribute('aria-label')).toContain('0 of 2 sentences saved');

    await act(async () => {
      saved.add('First sentence.');
      window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-capture', {
        detail: {
          sentence: 'First sentence.',
          resourceId: 'resource-edit-audio',
          status: 'saved',
          mime: 'audio/mpeg',
        },
      }));
      await Promise.resolve();
    });

    expect(toggle.getAttribute('aria-label')).toContain('1 of 2 sentences saved');
  });
  it('shows clips captured by playback as saved when using the REAL karaoke store (key agreement)', async () => {
    // Aaron's 2026-07-15/16 repro. Playback (phase_k playSequence) captures the
    // clip under the sentence it actually spoke: paragraph text split by
    // splitTextToSentences — headings merge into the following sentence, no
    // length caps. Edit Audio lists sentences via KS.splitSentences. Earlier
    // tests stubbed the store, so a divergence between those two splitters
    // (the 2026-07-15 line-split + 120-char cap) was invisible here: capture
    // succeeded but every edit-mode row stayed "missing". This mounts the real
    // view WITH the real store module and asserts the two paths converge.
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:captured-real-store'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    window.AlloModules.KaraokeAudioStore = RealKaraokeStore;
    const store = RealKaraokeStore.createStore();
    RealKaraokeStore.current = store;
    RealKaraokeStore.currentResourceId = 'resource-edit-audio';

    const longSentence = 'The first sentence keeps going with clause after clause so that any ' +
      'hidden length cap in the sentence splitter would break it into several separate audio units.';
    const data = `Heading without punctuation\n${longSentence} Short second sentence.`;

    // What playSequence captures: the cleaned sentence it spoke (whitespace
    // collapsed, heading merged — splitTextToSentences only splits on .!?).
    const playbackUnits = [
      `Heading without punctuation ${longSentence}`,
      'Short second sentence.',
    ];
    playbackUnits.forEach((sentence) => {
      expect(store.put(sentence, validAudioBase64(), 'audio/mpeg', 'ai-played', {
        voice: 'Kore', speed: 1, language: 'English', provider: 'played-tts-mp3',
      })).toBeTruthy();
    });

    window.__alloRegenerateSentenceAudio = vi.fn();
    window.__alloRemoveSentenceAudio = vi.fn(async () => true);
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);

    mount(baseProps({ generatedContent: { id: 'resource-edit-audio', type: 'simplified', data } }));
    const toggle = host.querySelector('button[aria-label^="Edit audio."]');
    expect(toggle.getAttribute('aria-label')).toContain('2 of 2 sentences saved');
    act(() => { toggle.click(); });

    // Every listed sentence resolves to the captured clip — and the list has
    // exactly the two units playback produced (no extra "missing" rows from a
    // divergent splitter).
    expect(button('Remove saved audio for sentence 1')).toBeTruthy();
    expect(button('Remove saved audio for sentence 2')).toBeTruthy();
    expect(button('Play audio for sentence 1').disabled).toBe(false);
    expect(button('Play audio for sentence 2').disabled).toBe(false);
    expect(button('Play audio for sentence 3')).toBeNull();

    RealKaraokeStore.current = null;
    RealKaraokeStore.currentResourceId = null;
  });
});
