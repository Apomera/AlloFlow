import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hostSource = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const playerStart = hostSource.indexOf("if (typeof window !== 'undefined' && !window.AlloSpeechPlayer)");
const playerSource = hostSource.slice(playerStart, hostSource.indexOf('/**', playerStart));
const helperSource = fs.readFileSync('audio_helpers_module.js', 'utf8');
let cleanups = [];
beforeEach(() => localStorage.removeItem('alloflow_ai_config'));
afterEach(() => {
  cleanups.forEach(fn => fn());
  cleanups = [];
  localStorage.removeItem('alloflow_ai_config');
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function fakeAudioClass(instances, playImpl) {
  return class {
    constructor(url) {
      this.url = url;
      this.volume = 1;
      this.playbackRate = 1;
      this.pause = vi.fn();
      this.play = vi.fn(playImpl || (() => Promise.resolve()));
      instances.push(this);
    }
  };
}
function playerHarness(options = {}) {
  const fakeWindow = new window.EventTarget();
  fakeWindow.__alloSelectedVoice = 'Puck';
  fakeWindow.__alloPlaybackRate = 1.6;
  fakeWindow.__alloVoiceVolume = .3;
  fakeWindow.__alloAddToast = vi.fn();
  const audio = [], utterances = [];
  fakeWindow.speechSynthesis = {
    speak: vi.fn(u => { utterances.push(u); u.onstart?.(); }),
    cancel: vi.fn(), getVoices: () => []
  };
  class Utterance { constructor(text) { this.text = text; this.volume = 1; } }
  const callTTS = options.callTTS || vi.fn(async () => 'blob:voice');
  const player = new Function('window', 'CustomEvent', 'Audio', 'SpeechSynthesisUtterance', 'AbortController', 'isGlobalMuted', 'callTTS', playerSource + '\nreturn window.AlloSpeechPlayer;')(
    fakeWindow, window.CustomEvent, fakeAudioClass(audio, options.play), Utterance, AbortController, () => false, callTTS
  );
  cleanups.push(() => player.stop());
  return { player, fakeWindow, audio, utterances, callTTS };
}

describe('header audio defaults in the shared resource player', () => {
  it('uses the selected voice, playback speed and volume while requesting natural-rate synthesis', async () => {
    const h = playerHarness();
    await h.player.speak('Resource text');
    expect(h.callTTS).toHaveBeenCalledWith('Resource text', 'Puck', 1, expect.any(Object));
    expect(h.audio[0].playbackRate).toBe(1.6);
    expect(h.audio[0].volume).toBe(.3);
    h.fakeWindow.__alloPlaybackRate = .8;
    h.fakeWindow.__alloVoiceVolume = 0;
    h.fakeWindow.dispatchEvent(new window.CustomEvent('alloflow:audio-preferences-changed'));
    expect(h.audio[0].playbackRate).toBe(.8);
    expect(h.audio[0].volume).toBe(0);
  });
  it('preserves explicit per-request settings, including volume zero, across global changes', async () => {
    const h = playerHarness();
    await h.player.speak('Quiet cue', { rate: .7, volume: 0 });
    h.fakeWindow.__alloPlaybackRate = 2;
    h.fakeWindow.__alloVoiceVolume = .9;
    h.fakeWindow.dispatchEvent(new window.CustomEvent('alloflow:audio-preferences-changed'));
    expect(h.audio[0].playbackRate).toBe(.7);
    expect(h.audio[0].volume).toBe(0);
  });
  it('falls back to valid defaults for invalid explicit preferences', async () => {
    const h = playerHarness();
    await h.player.speak('Cue', { rate: NaN, volume: 2 });
    expect(h.audio[0].playbackRate).toBe(1.6);
    expect(h.audio[0].volume).toBe(.3);
  });
  it('uses header volume and speed for browser utterances, including silent volume', async () => {
    const h = playerHarness({ callTTS: vi.fn(async () => null) });
    h.fakeWindow.__alloVoiceVolume = 0;
    await h.player.speak('Browser cue');
    expect(h.utterances).toHaveLength(1);
    expect(h.utterances[0].rate).toBe(1.6);
    expect(h.utterances[0].volume).toBe(0);
  });
  it.each([
    [{ browserTtsFallback: false }, false],
    [{ ttsProvider: 'off', browserTtsFallback: true }, false],
    [{ ttsProvider: 'browser', browserTtsFallback: false }, true],
    [{ browserTtsFallback: true }, true]
  ])('honors browser fallback policy %j', async (config, expected) => {
    localStorage.setItem('alloflow_ai_config', JSON.stringify(config));
    const h = playerHarness({ callTTS: vi.fn(async () => null) });
    await h.player.speak('Cue');
    expect(h.utterances.length > 0).toBe(expected);
  });
  it('rechecks the opt-out when media fails after playback has started', async () => {
    const h = playerHarness();
    await h.player.speak('Cue');
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ browserTtsFallback: false }));
    h.audio[0].onerror(new Error('Media decoding failed'));
    await flush();
    expect(h.utterances).toHaveLength(0);
    expect(h.player.getState().status).toBe('error');
  });
});

function cardHarness(options = {}) {
  const fakeWindow = new window.EventTarget();
  fakeWindow.__alloPlaybackRate = 1.5;
  fakeWindow.__alloVoiceVolume = .2;
  fakeWindow.__alloSelectedVoice = 'Puck';
  fakeWindow.__alloIsGlobalMuted = () => !!fakeWindow.muted;
  const audio = [];
  const helpers = new Function('window', 'Audio', 'AbortController', helperSource + '\nreturn window.AlloModules.AudioHelpers;')(
    fakeWindow, fakeAudioClass(audio, options.play), AbortController
  );
  const deps = {
    generatedContent: { id: 'cards', type: 'flashcards', data: [{ term: 'Term', def: 'Definition' }] },
    selectedVoice: 'Kore', setIsPlaying: vi.fn(), setPlayingContentId: vi.fn(), audioRef: { current: null },
    isPlayingRef: { current: false }, playbackSessionRef: { current: 0 }, playbackRateRef: { current: 1 },
    flashcardIndex: 0, flashcardMode: 'standard', standardDeckLang: 'English Only',
    addBlobUrl: vi.fn(), callTTS: options.callTTS || vi.fn(async () => 'blob:card'),
    stopPlayback: vi.fn(), t: key => key, warnLog: vi.fn(), ...options.deps
  };
  cleanups.push(() => fakeWindow.dispatchEvent(new window.CustomEvent('alloflow:playback-stopped')));
  return { fakeWindow, audio, deps, start: () => helpers.handleCardAudioSequence({ stopPropagation: vi.fn() }, deps) };
}

describe('flashcard audio setting and lifecycle coverage', () => {
  it('honors header voice/speed/volume, live changes, and cleanly finishes the last card segment', async () => {
    vi.useFakeTimers();
    const h = cardHarness();
    await h.start();
    expect(h.deps.callTTS).toHaveBeenCalledWith('Term', 'Puck', 1, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(h.audio[0].playbackRate).toBe(1.5);
    expect(h.audio[0].volume).toBe(.2);
    h.fakeWindow.__alloVoiceVolume = 0;
    h.fakeWindow.__alloPlaybackRate = .8;
    h.fakeWindow.dispatchEvent(new window.CustomEvent('alloflow:audio-preferences-changed'));
    expect(h.audio[0].volume).toBe(0);
    expect(h.audio[0].playbackRate).toBe(.8);
    h.audio[0].onended();
    await vi.advanceTimersByTimeAsync(500);
    expect(h.audio).toHaveLength(2);
    h.audio[1].onended();
    await vi.advanceTimersByTimeAsync(500);
    expect(h.deps.setIsPlaying).toHaveBeenLastCalledWith(false);
    expect(h.deps.isPlayingRef.current).toBe(false);
    expect(h.deps.setPlayingContentId).toHaveBeenLastCalledWith(null);
  });
  it('preserves a teacher group speed override', async () => {
    const h = cardHarness({ deps: { getGroupTtsSpeed: () => .7 } });
    await h.start();
    expect(h.audio[0].playbackRate).toBe(.7);
  });
  it('does not synthesize or start playback while muted', async () => {
    const h = cardHarness();
    h.fakeWindow.muted = true;
    await h.start();
    expect(h.deps.callTTS).not.toHaveBeenCalled();
    expect(h.deps.setIsPlaying).not.toHaveBeenCalled();
  });
  it('cancels an in-flight voice request on mute and ignores its late result', async () => {
    let resolve;
    const h = cardHarness({ callTTS: vi.fn(() => new Promise(done => { resolve = done; })) });
    const start = h.start();
    h.fakeWindow.muted = true;
    h.fakeWindow.dispatchEvent(new window.CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));
    resolve('blob:late');
    await start;
    expect(h.audio).toHaveLength(0);
    expect(h.deps.callTTS.mock.calls[0][3].signal.aborted).toBe(true);
    expect(h.deps.setIsPlaying).toHaveBeenLastCalledWith(false);
  });
  it('does not play a retry that resolves after another resource owns playback', async () => {
    vi.useFakeTimers();
    let resolve;
    const callTTS = vi.fn().mockRejectedValueOnce(new Error('Retry')).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const h = cardHarness({ callTTS });
    const start = h.start();
    await flush();
    await vi.advanceTimersByTimeAsync(1500);
    h.deps.playbackSessionRef.current = 100;
    const callsBefore = h.deps.setIsPlaying.mock.calls.length;
    resolve('blob:late-retry');
    await start;
    expect(h.audio).toHaveLength(0);
    expect(h.deps.setIsPlaying).toHaveBeenCalledTimes(callsBefore);
  });
  it('ends the playing state when the browser rejects media playback', async () => {
    const h = cardHarness({ play: () => Promise.reject(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' })) });
    await h.start();
    expect(h.deps.setIsPlaying).toHaveBeenLastCalledWith(false);
    expect(h.deps.isPlayingRef.current).toBe(false);
    expect(h.audio[0].pause).toHaveBeenCalled();
  });
});
