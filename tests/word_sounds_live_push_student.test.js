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
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';
import { makePackItem, makeThrowingAi, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

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
    const [word, setWord] = React.useState(null);
    const [phonemes, setPhonemes] = React.useState(null);
    const [feedback, setFeedback] = React.useState(null);
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [preloaded, setPreloaded] = React.useState(overrides.wsPreloadedWords);
    const [history, setHistory] = React.useState([]);
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
