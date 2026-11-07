import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// The breathing pacer passed `{ voice, rate }` into callTTS's voice slot and
// discarded the returned URL, so it was silent for everyone. callTTS is
// (text, voiceName, speed, ...) and resolves an audio URL, or null when no
// cloud voice may speak (student AI off, mute, speech off). The pacer now
// plays the URL, falls back to the device voice when none comes back, and
// cancels speech on stop, step change and unmount.

const require = createRequire(import.meta.url);
let React, ReactDOM, act, M, createTTS;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
  act = React.act || require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils')).act;
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('allohaven_module.js');
  loadAlloModule('tts_module.js');
  M = window.AlloModules.AlloHavenInternals;
  createTTS = window.AlloModules.createTTS;
});

const spoken = [];
function installSpeech() {
  spoken.length = 0;
  const synth = { cancel: vi.fn(), speak: vi.fn((u) => spoken.push(u)) };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  vi.stubGlobal('SpeechSynthesisUtterance', function Utterance(text) { this.text = text; });
  return synth;
}
const audios = [];
function installAudio() {
  audios.length = 0;
  vi.stubGlobal('Audio', function FakeAudio(src) {
    this.src = src; this.volume = 1;
    this.play = vi.fn(() => Promise.resolve());
    this.pause = vi.fn();
    audios.push(this);
  });
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

afterEach(() => {
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers();
  for (const k of ['__alloStudentAiDisabled', '__alloIsGlobalMuted', '__alloPlaybackRate', '__alloVoiceVolume', '__ttsLastRoute']) delete window[k];
  localStorage.clear();
});

// The real tts module's callTTS, so "no cloud request" is measured, not assumed.
function realCallTTS() {
  const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
  return createTTS({ state, apiKey: 'synthetic-key', GEMINI_MODELS: { tts: 'synthetic-tts-model' },
    AVAILABLE_VOICES: ['Kore'], _isCanvasEnv: true, languageToTTSCode: () => 'en', isGlobalMuted: () => false,
    warnLog: vi.fn(), debugLog: vi.fn(), getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => ({}), getAi: () => null, setShowKokoroOfferModal: vi.fn() }).callTTS;
}

describe('AlloHaven breathing pacer voice cue', () => {
  it('teacher: calls callTTS(text, voiceName, speed) and plays the returned URL', async () => {
    const synth = installSpeech(); installAudio();
    const callTTS = vi.fn(async () => 'blob:breathe-in');
    const speaker = M.createBreathCueSpeaker(() => ({ callTTS, voice: 'Kore', rate: 0.85 }));
    await speaker.speak('Breathe in');
    expect(callTTS).toHaveBeenCalledWith('Breathe in', 'Kore', 0.85);
    expect(audios.map((a) => a.src)).toEqual(['blob:breathe-in']);
    expect(audios[0].play).toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    await speaker.speak('Hold'); // step change stops the previous cue
    expect(audios[0].pause).toHaveBeenCalled();
    speaker.stop();
    expect(audios[1].pause).toHaveBeenCalled();
  });

  it('student AI off: no cloud request, the device voice reads the cue', async () => {
    const synth = installSpeech(); installAudio();
    window.__alloStudentAiDisabled = true;
    window.__alloPlaybackRate = 1;
    const fetch = vi.fn(async () => { throw new Error('network'); });
    vi.stubGlobal('fetch', fetch);
    const callTTS = vi.fn(realCallTTS());
    const speaker = M.createBreathCueSpeaker(() => ({ callTTS, voice: 'Kore', rate: 0.85 }));
    await speaker.speak('Breathe out');
    expect(callTTS).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0].text).toBe('Breathe out');
    expect(spoken[0].rate).toBeCloseTo(0.85);
    speaker.stop();
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('respects global mute and speech off; a stopped cue never starts late', async () => {
    const synth = installSpeech(); installAudio();
    window.__alloStudentAiDisabled = true;
    const none = vi.fn(async () => null);
    window.__alloIsGlobalMuted = () => true;
    await M.createBreathCueSpeaker(() => ({ callTTS: none })).speak('Hold');
    delete window.__alloIsGlobalMuted;
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ ttsProvider: 'off' }));
    await M.createBreathCueSpeaker(() => ({ callTTS: none })).speak('Hold');
    expect(synth.speak).not.toHaveBeenCalled();
    localStorage.clear();
    let release;
    const slow = vi.fn(() => new Promise((r) => { release = r; }));
    const speaker = M.createBreathCueSpeaker(() => ({ callTTS: slow }));
    const pending = speaker.speak('Rest');
    speaker.stop();
    release('blob:late');
    await pending;
    expect(audios).toHaveLength(0);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('the mounted pacer speaks on open and cancels on close/unmount', async () => {
    const synth = installSpeech(); installAudio();
    window.__alloStudentAiDisabled = true;
    const callTTS = vi.fn(async () => null);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    await act(async () => {
      root.render(React.createElement(window.AlloModules.AlloHaven, {
        isOpen: true, onClose: () => {}, callTTS, selectedVoice: 'Kore', addToast: () => {}, disableAnimations: true,
      }));
    });
    const btn = host.querySelector('[aria-label="Open breathing pacer for self-care"]');
    expect(btn).toBeTruthy();
    await act(async () => { btn.click(); await flush(); });
    expect(callTTS).toHaveBeenCalledWith('Breathe in', 'Kore', 0.85);
    expect(typeof callTTS.mock.calls[0][1]).toBe('string');
    expect(spoken.map((u) => u.text)).toEqual(['Breathe in']);
    const cancelsBefore = synth.cancel.mock.calls.length;
    await act(async () => { root.unmount(); });
    expect(synth.cancel.mock.calls.length).toBeGreaterThan(cancelsBefore);
    host.remove();
  });
});
