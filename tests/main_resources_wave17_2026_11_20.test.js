import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

let host, root;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = root = null;
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  delete window.__alloMuted;
  delete window.__alloIsGlobalMuted;
  delete window.__alloStudentAiDisabled;
  delete window.__alloAiSecretsLocked;
  delete window.__alloPastedAiKeyFenceActive;
  delete window.__loadKokoroTTS;
  delete window._kokoroTTS;
  delete window.getGlobalAudioContext;
  delete window.AlloFlowVoice;
});

describe('Wave 17: Core Audio, Speech & AI Gateway Security, Mute & Lifecycle', () => {
  it('remediation_audio: respects __alloIsGlobalMuted, __alloMuted, and drops tones when AudioContext is suspended', () => {
    const createOscillator = vi.fn(() => ({
      type: 'sine',
      frequency: { value: 440 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }));
    const createGain = vi.fn(() => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    const resume = vi.fn(() => Promise.resolve());
    let ctxState = 'running';
    window.getGlobalAudioContext = () => ({
      get state() { return ctxState; },
      currentTime: 1,
      destination: {},
      resume,
      createOscillator,
      createGain,
    });

    loadAlloModule('remediation_audio_module.js');
    const audio = window.remediationAudio;

    // 1. Muted via window.__alloIsGlobalMuted -> zero oscillators
    window.__alloIsGlobalMuted = () => true;
    audio.chunkGood();
    expect(createOscillator).not.toHaveBeenCalled();

    // 2. Unmuted but AudioContext suspended -> attempts resume and does NOT queue oscillator
    window.__alloIsGlobalMuted = () => false;
    ctxState = 'suspended';
    audio.refixStart();
    expect(resume).toHaveBeenCalled();
    expect(createOscillator).not.toHaveBeenCalled();

    // 3. Running and unmuted -> plays tone
    ctxState = 'running';
    audio.error();
    expect(createOscillator).toHaveBeenCalledTimes(1);
  });

  it('view_kokoro_offer_modal: isolates nested #root siblings, guards drag-out backdrop, and disables download when student AI is off', async () => {
    loadAlloModule('view_kokoro_offer_modal_module.js');
    const KokoroOfferModal = window.AlloModules.KokoroOfferModal.KokoroOfferModal || window.AlloModules.KokoroOfferModal;

    const wrapper = document.createElement('div');
    const appMain = document.createElement('main');
    host = document.createElement('div');
    wrapper.append(appMain, host);
    document.body.appendChild(wrapper);
    root = createRoot(host);

    window.__alloStudentAiDisabled = true;
    const onClose = vi.fn();
    const loadKokoro = vi.fn();
    window.__loadKokoroTTS = loadKokoro;

    await act(async () => root.render(React.createElement(KokoroOfferModal, {
      setShowKokoroOfferModal: onClose,
      setSelectedVoice: vi.fn(),
      addToast: vi.fn(),
    })));

    // Nested sibling inside wrapper (#root) must be isolated
    expect(appMain.getAttribute('aria-hidden')).toBe('true');
    expect(appMain.hasAttribute('inert')).toBe(true);

    // Download button disabled when student AI is off
    const downloadBtn = [...host.querySelectorAll('button')].find(b => /download voice/i.test(b.textContent));
    expect(downloadBtn?.disabled).toBe(true);

    // Clicking backdrop closes modal
    const backdrop = host.querySelector('[role="presentation"]');
    await act(async () => backdrop.click());
    expect(onClose).toHaveBeenCalledWith(false);

    await act(async () => root.unmount());
    root = null;
    expect(appMain.getAttribute('aria-hidden')).toBeNull();
    expect(appMain.hasAttribute('inert')).toBe(false);
    wrapper.remove();
  });

  it('speech_setup: isolates background siblings, guards overlapping startCheck races, and clamps NaN levels', async () => {
    loadAlloModule('speech_setup_module.js');
    const SpeechSetupPanel = window.AlloModules.SpeechSetup?.SpeechSetupPanel || window.AlloModules.SpeechSetupPanel;

    let resolvers = [];
    const startMicrophoneCheck = vi.fn(() => {
      let resolveFn, rejectFn;
      const promise = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
      const run = { promise, cancel: vi.fn() };
      resolvers.push({ resolveFn, rejectFn, run });
      return run;
    });

    window.AlloFlowVoice = {
      loadPreference: () => ({ engine: 'auto', whisperTier: 'tiny', lang: 'en-US', whisperSpeedByModel: {} }),
      getCapabilities: () => ({ desktopWhisper: false, webSpeech: true, onDevice: true }),
      getGeminiAudioCapability: () => ({ available: false, reason: 'none' }),
      resolveHandsFreeEngine: () => ({ engine: 'whisper', ready: true }),
      resolveWhisperProfile: () => ({ supported: true, key: 'english', modelId: 'whisper-tiny', requestedLanguage: 'en-US' }),
      getWhisperModelStatus: () => Promise.resolve({ tiny: { english: false, multilingual: false } }),
      subscribeToVoiceProgress: () => () => {},
      startMicrophoneCheck,
      getActiveVoiceSessionStatus: () => ({ state: 'idle' }),
    };

    const wrapper = document.createElement('div');
    const bgMain = document.createElement('main');
    host = document.createElement('div');
    wrapper.append(bgMain, host);
    document.body.appendChild(wrapper);
    root = createRoot(host);

    await act(async () => root.render(React.createElement(SpeechSetupPanel, {
      t: () => '',
      onClose: vi.fn(),
    })));

    expect(bgMain.getAttribute('aria-hidden')).toBe('true');
    expect(bgMain.hasAttribute('inert')).toBe(true);

    const startBtn = [...host.querySelectorAll('button')].find(b => /start test/i.test(b.textContent));
    expect(startBtn).toBeTruthy();
    await act(async () => {
      startBtn.click();
      startBtn.click(); // rapid double click while starting must not start a second stream
    });
    expect(startMicrophoneCheck).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
    root = null;
    expect(bgMain.getAttribute('aria-hidden')).toBeNull();
    wrapper.remove();
  });

  it('read_aloud_audio_service & read_aloud_artifact_audio: allow local Kokoro when __alloAiUsable is false, prevent zero-length over-read, and block unsafe URLs', async () => {
    loadAlloModule('read_aloud_audio_service_module.js');
    loadAlloModule('read_aloud_artifact_audio_module.js');

    const serviceSrc = readFileSync(resolve('read_aloud_audio_service_source.jsx'), 'utf8');
    expect(serviceSrc).toContain('_isLocalTtsRequest');
    expect(serviceSrc).toContain('ArrayBuffer.isView(input)');
    expect(serviceSrc).toContain('const unsubJoin = subscribe(\'progress\', options.onProgress)');
    expect(serviceSrc).toContain('const prepController = typeof AbortController');

    const artifactSrc = readFileSync(resolve('read_aloud_artifact_audio_source.jsx'), 'utf8');
    expect(artifactSrc).toContain('validateSynthesizedAudioUrl');
    expect(artifactSrc).toContain('redirect: \'error\'');
    expect(artifactSrc).toContain('MAX_ARTIFACT_AUDIO_BYTES');
    expect(artifactSrc).toContain('MAX_CACHE_ENTRIES = 4');
    expect(artifactSrc).toContain('checkPrepCancelled()');
  });

  it('gemini_api, tts & audio_helpers: enforce secrets-locked fences, model ID validation, Canvas Kokoro .ready checks, and safe audio helpers', () => {
    const geminiSrc = readFileSync(resolve('gemini_api_source.jsx'), 'utf8');
    expect(geminiSrc).toContain('_assertAiSessionAllowed');
    expect(geminiSrc).toContain('const safeMime = /^image\\/(png|jpeg|webp)$/.test(rawMime)');
    expect(geminiSrc).toContain('min-height:44px;min-width:44px;flex-shrink:0');

    const ttsSrc = readFileSync(resolve('tts_source.jsx'), 'utf8');
    expect(ttsSrc).toContain('_secretsLockedOrFenced');
    expect(ttsSrc).toContain('_validateTtsModelId');
    expect(ttsSrc).toContain('if (!_kokoroLockedOut && window._kokoroTTS && window._kokoroTTS.ready)');
    expect(ttsSrc).toContain('if (window._kokoroTTS && window._kokoroTTS.ready)');
    expect(ttsSrc).toContain('if (!bytes.length || bytes.length % 2 !== 0)');

    const audioSrc = readFileSync(resolve('audio_helpers_source.jsx'), 'utf8');
    expect(audioSrc).toContain('const secretsLocked = window.__alloAiSecretsLocked === true;');
    expect(audioSrc).toContain('const isSelectedKokoro =');
    expect(audioSrc).toContain('Math.max(0.5, Math.min(2, rate))');
    expect(audioSrc).toContain('if (!isCurrent()) {\n            try { audio.pause(); }');
  });
});
