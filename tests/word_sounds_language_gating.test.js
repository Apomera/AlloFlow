// Multilingual stage 2: per-activity language capability gating (2026-07-12).
//
// Non-English content sessions must never half-run English-specific
// machinery: sound_sort / word_families / letter_tracing are unavailable,
// letter-tile activities require an alphabetic script, and a pushed sequence
// or preset naming a blocked activity is REDIRECTED to an available one.
// English sessions take the always-true branch and behave exactly as before
// (the golden/contract/a11y batteries pin that; this file pins the es/ar
// behavior plus the English no-redirect case).

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';
import { makePackItem, makeThrowingAi, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');

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

// Stateful host (same pattern as the live-push pins): activity/word state is
// real so startActivity's language redirect actually lands, and the current
// activity is exposed as a probe attribute.
function makeStatefulHost(overrides) {
  return function StatefulHost() {
    const [activity, setActivity] = React.useState(overrides.wordSoundsActivity);
    const [word, setWord] = React.useState(null);
    const [phonemes, setPhonemes] = React.useState(null);
    const [feedback, setFeedback] = React.useState(null);
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [preloaded, setPreloaded] = React.useState(overrides.wsPreloadedWords);
    const props = {
      ...baseProps(overrides.wordSoundsActivity),
      ...overrides,
      wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
      currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
      wordSoundsPhonemes: phonemes, setWordSoundsPhonemes: setPhonemes,
      wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback,
      wordSoundsScore: score, setWordSoundsScore: setScore,
      wsPreloadedWords: preloaded, setWsPreloadedWords: setPreloaded,
    };
    return React.createElement(
      'div', { 'data-activity': activity || '' },
      React.createElement(WordSoundsModal, props),
    );
  };
}

function langProps(lang, activity, calls) {
  return {
    wsPreloadedWords: [{ ...makePackItem(), _audioRequested: false }],
    wordSoundsActivity: activity,
    wordSoundsLanguage: lang,
    initialShowReviewPanel: false,
    initialActivitySequence: [],
    isProbeMode: false,
    allowRuntimeAi: false,
    callGemini: makeThrowingAi(calls, 'callGemini'),
    callTTS: makeThrowingAi(calls, 'callTTS'),
    callImagen: makeThrowingAi(calls, 'callImagen'),
    glossaryTerms: [],
  };
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  const api = setupWordSounds();
  WordSoundsModal = api.WordSoundsModal;
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* gone */ }
    host.remove();
  }
});

describe('blocked activities are redirected, never half-run', () => {
  it('Spanish session preset to sound_sort lands on an available activity', async () => {
    const calls = [];
    const Host = makeStatefulHost(langProps('es-ES', 'sound_sort', calls));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    const landed = host.querySelector('[data-activity]').getAttribute('data-activity');
    expect(landed).not.toBe('sound_sort');
    expect(['counting', 'blending', 'segmentation', 'isolation', 'rhyming', 'manipulation', 'syllable_blending', 'syllable_counting']).toContain(landed);
    expect(calls).toEqual([]);
  });

  it('Arabic session preset to word_scramble (letter tiles, non-alphabetic script) is redirected', async () => {
    const calls = [];
    const Host = makeStatefulHost(langProps('ar-SA', 'word_scramble', calls));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    const landed = host.querySelector('[data-activity]').getAttribute('data-activity');
    expect(landed).not.toBe('word_scramble');
  });

  it('Spanish session KEEPS letter-tile activities (Latin script): spelling_bee is not redirected', async () => {
    const calls = [];
    const Host = makeStatefulHost(langProps('es-ES', 'spelling_bee', calls));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(host.querySelector('[data-activity]').getAttribute('data-activity')).toBe('spelling_bee');
  });

  it('ENGLISH session preset to sound_sort stays on sound_sort (no behavior change)', async () => {
    const calls = [];
    const Host = makeStatefulHost(langProps('en-US', 'sound_sort', calls));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(host.querySelector('[data-activity]').getAttribute('data-activity')).toBe('sound_sort');
  });
});

describe('activity picker reflects language capabilities', () => {
  it('Spanish: English-only activities hidden + honesty chip shown', async () => {
    const calls = [];
    const Host = makeStatefulHost(langProps('es-ES', 'counting', calls));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    // in this harness the module's ts() falls back to the English labels
    expect(host.innerHTML).not.toContain('Sound Sort');
    expect(host.innerHTML).not.toContain('Word Families');
    expect(host.innerHTML).not.toContain('Letter Trace');
    expect(host.innerHTML).toContain('Some activities are English-only');
    // phoneme-core activities remain
    expect(host.innerHTML).toContain('Sound Swap');
  });

  it('English: everything present, no chip', async () => {
    const calls = [];
    const Host = makeStatefulHost(langProps('en-US', 'counting', calls));
    const { host } = mount(React.createElement(Host));
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(host.innerHTML).toContain('Sound Sort');
    expect(host.innerHTML).toContain('Word Families');
    expect(host.innerHTML).not.toContain('Some activities are English-only');
  });
});
