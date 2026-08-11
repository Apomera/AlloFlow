import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function playerBlock(file = HOST_FILES[0]) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf("if (typeof window !== 'undefined' && !window.AlloSpeechPlayer)");
  const end = source.indexOf('/**', start);
  if (start < 0 || end < 0) throw new Error('shared player block not found in ' + file);
  return source.slice(start, end);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function flush(count = 6) {
  for (let i = 0; i < count; i++) await Promise.resolve();
}

function installPlayer({ callTTS, AudioClass, synthesis, muted = false }) {
  const fakeWindow = new window.EventTarget();
  fakeWindow.speechSynthesis = synthesis;
  fakeWindow.__alloInvalidateTtsUrl = vi.fn();
  fakeWindow.__alloAddToast = vi.fn();
  const events = [];
  fakeWindow.addEventListener('allo-speech-state', (event) => events.push(event.detail));

  class FakeUtterance {
    constructor(text) {
      this.text = text;
      this.rate = 1;
      this.pitch = 1;
      this.lang = '';
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  const factory = new Function(
    'window',
    'CustomEvent',
    'Audio',
    'SpeechSynthesisUtterance',
    'AbortController',
    'isGlobalMuted',
    'callTTS',
    playerBlock() + '\nreturn window.AlloSpeechPlayer;'
  );
  const player = factory(
    fakeWindow,
    window.CustomEvent,
    AudioClass || class {},
    FakeUtterance,
    AbortController,
    () => muted,
    callTTS
  );
  return { player, fakeWindow, events };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('shared AlloSpeechPlayer source contract', () => {
  it('keeps all three host copies identical and continuous read ignores error states', () => {
    const canonical = playerBlock();
    for (const file of HOST_FILES.slice(1)) expect(playerBlock(file), file).toBe(canonical);
    for (const file of ['reading_library_module.js', 'desktop/web-app/public/reading_library_module.js']) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source, file).toContain("(st.status && st.status !== 'idle')");
    }
  });
});

describe('shared AlloSpeechPlayer event ordering', () => {
  it('keeps browser fallback generating and resolves only after utterance start', async () => {
    vi.useFakeTimers();
    let utterance;
    const synthesis = {
      speak: vi.fn((value) => { utterance = value; }),
      cancel: vi.fn(),
    };
    const { player } = installPlayer({
      callTTS: vi.fn(async () => null),
      synthesis,
    });

    let resolved = false;
    const pending = player.speak('bonjour', { locale: 'fr-CA' }).then((value) => {
      resolved = true;
      return value;
    });
    await flush();

    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(player.getState()).toMatchObject({ status: 'generating', currentText: 'bonjour' });
    expect(utterance.lang).toBe('fr-CA');
    expect(resolved).toBe(false);

    utterance.onstart();
    await expect(pending).resolves.toBe(1);
    expect(player.getState().status).toBe('playing');
    player.stop();
  });

  it('handles duplicate media failure callbacks once and preserves cache on NotAllowedError', async () => {
    vi.useFakeTimers();
    const playGate = deferred();
    let audio;
    class ControlledAudio {
      constructor(url) {
        this.url = url;
        this.playbackRate = 1;
        this.pause = vi.fn();
        this.play = vi.fn(() => playGate.promise);
        this.onended = null;
        this.onerror = null;
        this.onplaying = null;
        audio = this;
      }
    }
    let utterance;
    const synthesis = {
      speak: vi.fn((value) => { utterance = value; }),
      cancel: vi.fn(),
    };
    const { player, fakeWindow } = installPlayer({
      callTTS: vi.fn(async () => 'blob:cached'),
      AudioClass: ControlledAudio,
      synthesis,
    });

    const pending = player.speak('salut', { locale: 'fr-CA' });
    await flush();
    const lateError = audio.onerror;
    const blocked = new Error('playback requires a user gesture');
    blocked.name = 'NotAllowedError';
    playGate.reject(blocked);
    await flush();

    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(fakeWindow.__alloInvalidateTtsUrl).not.toHaveBeenCalled();

    lateError(new window.Event('error'));
    await flush();
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(fakeWindow.__alloInvalidateTtsUrl).not.toHaveBeenCalled();

    utterance.onstart();
    await expect(pending).resolves.toBe(1);
    player.stop();
  });

  it('detaches a stopped media attempt so late callbacks cannot invalidate or fall back', async () => {
    vi.useFakeTimers();
    const playGate = deferred();
    let audio;
    class ControlledAudio {
      constructor() {
        this.playbackRate = 1;
        this.pause = vi.fn();
        this.play = vi.fn(() => playGate.promise);
        this.onended = null;
        this.onerror = null;
        this.onplaying = null;
        audio = this;
      }
    }
    const synthesis = { speak: vi.fn(), cancel: vi.fn() };
    const { player, fakeWindow } = installPlayer({
      callTTS: vi.fn(async () => 'blob:cached'),
      AudioClass: ControlledAudio,
      synthesis,
    });

    const pending = player.speak('hola');
    await flush();
    const lateError = audio.onerror;
    player.stop();

    lateError(new window.Event('error'));
    const aborted = new Error('stopped');
    aborted.name = 'AbortError';
    playGate.reject(aborted);
    await flush();

    await expect(pending).resolves.toBeNull();
    expect(fakeWindow.__alloInvalidateTtsUrl).not.toHaveBeenCalled();
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('emits playing once and does not emit another false event when clearing an error', async () => {
    vi.useFakeTimers();
    const playGate = deferred();
    let audio;
    class ControlledAudio {
      constructor() {
        this.playbackRate = 1;
        this.pause = vi.fn();
        this.play = vi.fn(() => playGate.promise);
        this.onended = null;
        this.onerror = null;
        this.onplaying = null;
        audio = this;
      }
    }
    const synthesis = { speak: vi.fn(), cancel: vi.fn() };
    const harness = installPlayer({
      callTTS: vi.fn(async () => 'blob:cached'),
      AudioClass: ControlledAudio,
      synthesis,
    });

    const pending = harness.player.speak('ciao');
    await flush();
    const onPlaying = audio.onplaying;
    onPlaying();
    playGate.resolve();
    await expect(pending).resolves.toBe(1);
    await flush();

    expect(harness.events.filter((state) => state.status === 'playing')).toHaveLength(1);

    const onError = audio.onerror;
    onError(new window.Event('error'));
    await flush();
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = synthesis.speak.mock.calls[0][0];
    utterance.onstart();
    utterance.onerror();
    const eventCount = harness.events.length;
    expect(harness.player.getState().status).toBe('error');

    harness.player.stop();
    expect(harness.events).toHaveLength(eventCount);
    expect(harness.player.getState().status).toBe('idle');
  });
});
