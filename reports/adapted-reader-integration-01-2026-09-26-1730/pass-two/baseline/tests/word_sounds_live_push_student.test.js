// LIVE-SESSION STUDENT PUSH: when a teacher pushes a Word Sounds resource to a
// student device, AlloFlowANTI's hydrateWordSoundsFromSync leaves the host in
// this exact state before the modal mounts:
//   wsPreloadedWords = pack words, wordSoundsActivity = sequence[0] || 'counting',
//   currentWordSoundsWord = null, wordSoundsPhonemes = null,
//   wordSoundsAutoReview = false  (=> initialShowReviewPanel: false)
// The student must land IN the playable activity — never on the teacher's
// word-list review panel (regenerate/reorder/delete tools), and never on the
// dead "Review Panel (loading...)" fallback.
//
// This mounts the modal with a stateful host (real useState wiring like ANTI's
// wsDispatch fields) so startActivity/state updates actually apply.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';
import { makePackItem, makeThrowingAi, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const UI_WORD_SOUNDS = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8')).word_sounds;

function audioRecoveryString(_t, key, params = {}) {
  if (!key.startsWith('word_sounds.audio_')) return key;
  let result = UI_WORD_SOUNDS[key.replace('word_sounds.', '')] || key;
  for (const [name, value] of Object.entries(params)) result = result.replace(`{${name}}`, String(value));
  return result;
}

let React, ReactDOMClient, act, WordSoundsModal;

const mounted = [];
function mount(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ host, root });
  return { host, root };
}

// Mirrors the ANTI host: the ws state fields the modal round-trips through
// setters are real state here, so effect-driven updates (startActivity picking
// a word, review-panel toggles) actually re-render like production.
function makeStatefulHost(overrides) {
  return function StatefulHost() {
    const [activity, setActivity] = React.useState(overrides.wordSoundsActivity);
    const [word, setWord] = React.useState(overrides.currentWordSoundsWord ?? null);
    const [phonemes, setPhonemes] = React.useState(overrides.wordSoundsPhonemes ?? null);
    const [feedback, setFeedback] = React.useState(null);
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [preloaded, setPreloaded] = React.useState(overrides.wsPreloadedWords);
    const [history, setHistory] = React.useState([]);
    const [deliveryAt, setDeliveryAt] = React.useState(overrides.preparedAudioDeliveryAt ?? 0);
    if (typeof overrides.captureDeliveryAtSetter === 'function') overrides.captureDeliveryAtSetter(setDeliveryAt);
    const props = {
      ...baseProps(overrides.wordSoundsActivity),
      ...overrides,
      wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
      currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
      wordSoundsPhonemes: phonemes, setWordSoundsPhonemes: setPhonemes,
      wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
      wordSoundsScore: score, setWordSoundsScore: setScore,
      wsPreloadedWords: preloaded, setWsPreloadedWords: setPreloaded,
      wordSoundsHistory: history, setWordSoundsHistory: setHistory,
      preparedAudioDeliveryAt: deliveryAt,
    };
    return React.createElement(WordSoundsModal, props);
  };
}

function studentPushOverrides(calls, extra = {}) {
  const packItem = makePackItem();
  return {
    // hydrateWordSoundsFromSync end-state
    wsPreloadedWords: [{ ...packItem, _audioRequested: false }],
    wordSoundsActivity: 'counting',
    initialShowReviewPanel: false,
    initialActivitySequence: [],
    isProbeMode: false,
    // student device: pack-only, AI seams must stay cold
    allowRuntimeAi: false,
    callGemini: makeThrowingAi(calls, 'callGemini'),
    callTTS: makeThrowingAi(calls, 'callTTS'),
    callImagen: makeThrowingAi(calls, 'callImagen'),
    glossaryTerms: [],
    // Match production's registered English safety net for the recovery flow;
    // individual tests can replace this with a selected-language pack.
    getWordSoundsString: audioRecoveryString,
    ...extra,
  };
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  // Simulate production load order (misc_components before word_sounds) with a
  // recognizable marker so "review panel rendered" is detectable either way.
  window.WordSoundsReviewPanel = (props) => React.createElement(
    'div', { 'data-testid': 'review-panel-stub' },
    'REVIEW_PANEL_RENDERED',
    React.createElement('button', { onClick: props.onStartActivity }, 'Start Activity'),
  );
  const api = setupWordSounds();
  WordSoundsModal = api.WordSoundsModal;
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* already gone */ }
    host.remove();
  }
});

describe('live-session push: student lands in the activity, not the review panel', () => {
  it('silently preflights prepared clips and reports ready before entry', async () => {
    const originalAudio = globalThis.Audio;
    class PlayableAudio {
      constructor(src = '') { this.src = src; }
      canPlayType() { return 'probably'; }
      load() { if (this.src) Promise.resolve().then(() => this.onloadedmetadata?.()); }
      play() { return Promise.resolve(); }
      pause() {}
      removeAttribute(name) { if (name === 'src') this.src = ''; }
    }
    globalThis.Audio = window.Audio = PlayableAudio;
    try {
      const calls = [];
      const statuses = [];
      const Host = makeStatefulHost(studentPushOverrides(calls, {
        onPreparedAudioStatus: (report) => statuses.push(report),
      }));
      const { host } = mount(React.createElement(Host));
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
      expect(statuses.map((report) => report.status)).toContain('checking');
      expect(statuses.at(-1)).toMatchObject({ status: 'ready', ready: 1, total: 1, failed: 0 });
      expect(host.querySelector('[data-testid="word-sounds-audio-unavailable"]')).toBeFalsy();
      expect(calls).toEqual([]);
    } finally {
      globalThis.Audio = window.Audio = originalAudio;
    }
  });

  it('reports progressive clip counts and binds every status to the assignment nonce', async () => {
    const originalAudio = globalThis.Audio;
    let created = 0;
    class StaggeredAudio {
      constructor(src = '') { this.src = src; this.index = created++; }
      canPlayType() { return 'probably'; }
      load() {
        if (!this.src) return;
        setTimeout(() => this.onloadedmetadata?.(), this.index % 2 === 0 ? 0 : 25);
      }
      play() { Promise.resolve().then(() => this.onended?.()); return Promise.resolve(); }
      pause() {}
      removeAttribute(name) { if (name === 'src') this.src = ''; }
    }
    globalThis.Audio = window.Audio = StaggeredAudio;
    try {
      const calls = [];
      const statuses = [];
      const packItem = makePackItem();
      packItem._ttsRequiredKeys = ['cat', 'dog'];
      packItem._ttsAssets = {
        cat: { mime: 'audio/mpeg', base64: 'QUJDRA==' },
        dog: { mime: 'audio/mpeg', base64: 'RUZHSA==' },
      };
      const Host = makeStatefulHost(studentPushOverrides(calls, {
        wsPreloadedWords: [{ ...packItem, _audioRequested: false }],
        preparedAudioDeliveryAt: 4242,
        onPreparedAudioStatus: (report) => statuses.push(report),
      }));
      mount(React.createElement(Host));
      await act(async () => { await new Promise((r) => setTimeout(r, 70)); });
      expect(statuses).toContainEqual(expect.objectContaining({ status: 'checking', ready: 1, total: 2, failed: 0, deliveryAt: 4242 }));
      expect(statuses.at(-1)).toMatchObject({ status: 'ready', ready: 2, total: 2, failed: 0, deliveryAt: 4242 });
    } finally {
      globalThis.Audio = window.Audio = originalAudio;
    }
  });

  it('opens the first activity after its startup clip passes while the remaining pack checks in the background', async () => {
    const originalAudio = globalThis.Audio;
    class PrioritizedAudio {
      constructor(src = '') { this.src = src; }
      canPlayType() { return 'probably'; }
      load() {
        if (!this.src) return;
        const isStartupClip = this.src.includes('QUJDRA==');
        setTimeout(() => this.onloadedmetadata?.(), isStartupClip ? 0 : 600);
      }
      play() { Promise.resolve().then(() => this.onended?.()); return Promise.resolve(); }
      pause() {}
      removeAttribute(name) { if (name === 'src') this.src = ''; }
    }
    globalThis.Audio = window.Audio = PrioritizedAudio;
    try {
      const calls = [];
      const statuses = [];
      const packItem = makePackItem();
      packItem._ttsRequiredKeys = ['cat', 'dog'];
      packItem._ttsAssets = {
        cat: { mime: 'audio/mpeg', base64: 'QUJDRA==' },
        dog: { mime: 'audio/mpeg', base64: 'RUZHSA==' },
      };
      const Host = makeStatefulHost(studentPushOverrides(calls, {
        wsPreloadedWords: [{ ...packItem, _audioRequested: false }],
        onPreparedAudioStatus: (report) => statuses.push(report),
      }));
      const { host } = mount(React.createElement(Host));
      await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

      expect(statuses).toContainEqual(expect.objectContaining({ status: 'checking', ready: 1, total: 2, failed: 0 }));
      expect(host.querySelector('[data-testid="word-sounds-audio-preparing"]')).toBeFalsy();
      const tiles = Array.from(host.querySelectorAll('button, [role="button"]')).map((button) => button.textContent.trim());
      expect(tiles.some((text) => /^[0-9]+\+?$/.test(text))).toBe(true);

      await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
      expect(statuses.at(-1)).toMatchObject({ status: 'ready', ready: 2, total: 2, failed: 0 });
      expect(calls).toEqual([]);
    } finally {
      globalThis.Audio = window.Audio = originalAudio;
    }
  });

  it('rechecks the mounted activity against a fresh delivery nonce after reconnect or resend', async () => {
    const originalAudio = globalThis.Audio;
    class ReconnectAudio {
      constructor(src = '') { this.src = src; }
      canPlayType() { return 'probably'; }
      load() { if (this.src) Promise.resolve().then(() => this.onloadedmetadata?.()); }
      play() { setTimeout(() => this.onended?.(), 0); return Promise.resolve(); }
      pause() {}
      removeAttribute(name) { if (name === 'src') this.src = ''; }
    }
    globalThis.Audio = window.Audio = ReconnectAudio;
    try {
      const calls = [];
      const statuses = [];
      let setDeliveryAt;
      const Host = makeStatefulHost(studentPushOverrides(calls, {
        preparedAudioDeliveryAt: 101,
        captureDeliveryAtSetter: (setter) => { setDeliveryAt = setter; },
        onPreparedAudioStatus: (report) => statuses.push(report),
      }));
      mount(React.createElement(Host));
      await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
      expect(statuses.at(-1)).toMatchObject({ status: 'ready', deliveryAt: 101 });

      await act(async () => { setDeliveryAt(202); await new Promise((r) => setTimeout(r, 80)); });
      expect(statuses).toContainEqual(expect.objectContaining({ status: 'checking', deliveryAt: 202 }));
      expect(statuses.at(-1)).toMatchObject({ status: 'ready', deliveryAt: 202 });
      expect(calls).toEqual([]);
    } finally {
      globalThis.Audio = window.Audio = originalAudio;
    }
  });

  it('focuses blocked-playback recovery and retries without losing the activity', async () => {
    const originalAudio = globalThis.Audio;
    let playbackAllowed = false;
    let playCalls = 0;
    class GestureAudio {
      constructor(src = '') {
        this.src = src;
        if (src) setTimeout(() => this.oncanplaythrough?.(), 0);
      }
      canPlayType() { return 'probably'; }
      load() { if (this.src) Promise.resolve().then(() => this.onloadedmetadata?.()); }
      play() {
        playCalls += 1;
        if (!playbackAllowed) return Promise.reject(new DOMException('User gesture required', 'NotAllowedError'));
        setTimeout(() => this.onended?.(), 0);
        return Promise.resolve();
      }
      pause() {}
      removeAttribute(name) { if (name === 'src') this.src = ''; }
    }
    globalThis.Audio = window.Audio = GestureAudio;
    try {
      const calls = [];
      const statuses = [];
      const Host = makeStatefulHost(studentPushOverrides(calls, {
        playInstructions: false,
        onPreparedAudioStatus: (report) => statuses.push(report),
      }));
      const { host } = mount(React.createElement(Host));
      await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
      await act(async () => { await new Promise((r) => setTimeout(r, 1500)); });

      expect(playCalls).toBeGreaterThan(0);
      expect(statuses.at(-1)).toMatchObject({ status: 'blocked', failed: 1 });
      const retry = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Try sound again');
      expect(retry).toBeTruthy();
      await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
      expect(document.activeElement).toBe(retry);

      playbackAllowed = true;
      await act(async () => { retry.click(); await new Promise((r) => setTimeout(r, 50)); });
      expect(statuses.at(-1)).toMatchObject({ status: 'ready', failed: 0 });
      expect(host.querySelector('[data-testid="word-sounds-audio-unavailable"]')).toBeFalsy();
      const tiles = Array.from(host.querySelectorAll('button, [role="button"]')).map((button) => button.textContent.trim());
      expect(tiles.some((text) => /^[0-9]+\+?$/.test(text))).toBe(true);
      await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
      expect(host.contains(document.activeElement)).toBe(true);
      expect(calls).toEqual([]);
    } finally {
      globalThis.Audio = window.Audio = originalAudio;
    }
  });

  it('holds entry and reports an unsupported prepared format', async () => {
    const originalAudio = globalThis.Audio;
    class UnsupportedAudio {
      constructor(src = '') { this.src = src; }
      canPlayType() { return ''; }
      load() {}
      play() { return Promise.resolve(); }
      pause() {}
      removeAttribute(name) { if (name === 'src') this.src = ''; }
    }
    globalThis.Audio = window.Audio = UnsupportedAudio;
    try {
      const calls = [];
      const statuses = [];
      const Host = makeStatefulHost(studentPushOverrides(calls, {
        onPreparedAudioStatus: (report) => statuses.push(report),
      }));
      const { host } = mount(React.createElement(Host));
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
      expect(statuses.at(-1)).toMatchObject({ status: 'unsupported', ready: 0, total: 1, failed: 1 });
      expect(host.querySelector('[data-testid="word-sounds-audio-unavailable"]')).toBeTruthy();
      expect(host.textContent).toContain('This audio format is not supported');
      expect(calls).toEqual([]);
    } finally {
      globalThis.Audio = window.Audio = originalAudio;
    }
  });

  it('renders the audio recovery dialog through the selected language pack', async () => {
    const strings = {
      'word_sounds.audio_check': 'Revisión de audio',
      'word_sounds.audio_waiting_title': 'El audio todavía no está disponible',
      'word_sounds.audio_missing_message': 'No llegaron {missing} de {total} clips de audio requeridos. Pide a tu docente que prepare el audio que falta y reenvíe esta actividad.',
      'word_sounds.audio_ask_teacher_resend': 'Pedir al docente que lo reenvíe',
    };
    const localized = (_t, key, params = {}) => {
      let result = strings[key] || key;
      for (const [name, value] of Object.entries(params)) result = result.replace(`{${name}}`, String(value));
      return result;
    };
    const calls = [];
    const packItem = makePackItem();
    delete packItem._ttsAssets;
    const Host = makeStatefulHost(studentPushOverrides(calls, {
      wsPreloadedWords: [{ ...packItem, _audioRequested: false }],
      getWordSoundsString: localized,
    }));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 1300)); });
    expect(host.textContent).toContain('Revisión de audio');
    expect(host.textContent).toContain('El audio todavía no está disponible');
    expect(host.textContent).toContain('No llegaron 1 de 1 clips de audio requeridos');
    expect(host.textContent).toContain('Pedir al docente que lo reenvíe');
    expect(host.textContent).not.toContain('Audio is not available yet');
  });

  it('practice push (no sequence): playable board renders, review panel does not', async () => {
    const calls = [];
    const Host = makeStatefulHost(studentPushOverrides(calls));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(calls).toEqual([]);
    expect(host.innerHTML).not.toContain('REVIEW_PANEL_RENDERED');
    // The counting activity actually started: a word was picked and the
    // number-tile board is on screen (tiles are role=button digits).
    expect(host.innerHTML.length).toBeGreaterThan(200);
    const tiles = Array.from(host.querySelectorAll('button, [role="button"]')).map((b) => b.textContent.trim());
    expect(tiles.some((t) => /^[0-9]+\+?$/.test(t))).toBe(true);
  });

  it('lesson-plan push (sequence): first sequence activity starts', async () => {
    const calls = [];
    const Host = makeStatefulHost(studentPushOverrides(calls, {
      wordSoundsActivity: 'blending',
      initialActivitySequence: ['blending', 'rhyming'],
    }));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(calls).toEqual([]);
    expect(host.innerHTML).not.toContain('REVIEW_PANEL_RENDERED');
    expect(host.innerHTML.length).toBeGreaterThan(200);
  });

  it('holds a pack-only student on a clear recovery screen when prepared audio is missing', async () => {
    const calls = [];
    const packItem = makePackItem();
    delete packItem._ttsAssets;
    const Host = makeStatefulHost(studentPushOverrides(calls, {
      wsPreloadedWords: [{ ...packItem, _audioRequested: false }],
      onPreparedAudioRetry: async (coverage) => {
        calls.push({ retry: coverage });
        return true;
      },
    }));
    const { host } = mount(React.createElement(Host));

    expect(host.querySelector('[data-testid="word-sounds-audio-preparing"]')).toBeTruthy();
    expect(host.innerHTML).not.toContain('REVIEW_PANEL_RENDERED');
    await act(async () => { await new Promise((r) => setTimeout(r, 1300)); });

    expect(calls).toEqual([]);
    expect(host.querySelector('[data-testid="word-sounds-audio-unavailable"]')).toBeTruthy();
    expect(host.textContent).toContain('Ask your teacher to prepare the missing audio and resend this activity.');
    expect(host.innerHTML).not.toContain('REVIEW_PANEL_RENDERED');

    const checkAgain = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Ask teacher to resend');
    expect(checkAgain).toBeTruthy();
    await act(async () => { checkAgain.click(); await Promise.resolve(); });
    expect(host.querySelector('[data-testid="word-sounds-audio-preparing"]')).toBeTruthy();
    expect(calls).toHaveLength(1);
    expect(calls[0].retry).toMatchObject({ ready: 0, total: 1, missing: 1 });
    await act(async () => { await new Promise((r) => setTimeout(r, 1300)); });
    expect(host.textContent).toContain('Request sent');
  });

  it('teacher launch (initialShowReviewPanel: true) still opens the review panel', async () => {
    const calls = [];
    const Host = makeStatefulHost(studentPushOverrides(calls, {
      initialShowReviewPanel: true,
      // teacher device: AI seams live
      allowRuntimeAi: true,
      callGemini: async () => null,
      callTTS: async () => null,
      callImagen: async () => null,
    }));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(host.innerHTML).toContain('REVIEW_PANEL_RENDERED');
  });

  it('review panel resolves window.WordSoundsReviewPanel at render time and the fallback has a Start escape', async () => {
    // Simulate the CDN load-order race: misc_components not loaded yet.
    const RealPanel = window.WordSoundsReviewPanel;
    delete window.WordSoundsReviewPanel;
    try {
      const calls = [];
      const Host = makeStatefulHost(studentPushOverrides(calls, {
        initialShowReviewPanel: true,
        allowRuntimeAi: true,
        callGemini: async () => null,
        callTTS: async () => null,
        callImagen: async () => null,
      }));
      const { host } = mount(React.createElement(Host));
      await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
      // Fallback shows, but is never a dead end: it carries a Start button.
      expect(host.innerHTML).toContain('Review Panel (loading...)');
      const startBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Start Activity'));
      expect(startBtn).toBeTruthy();
      // Late module arrival heals in place (render-time resolution).
      window.WordSoundsReviewPanel = RealPanel;
      await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
      act(() => { startBtn.click(); });
      await act(async () => { await new Promise((r) => setTimeout(r, 150)); });
      // Start from the fallback drops into the playable activity.
      expect(host.innerHTML).not.toContain('Review Panel (loading...)');
    } finally {
      window.WordSoundsReviewPanel = RealPanel;
    }
  });
});
