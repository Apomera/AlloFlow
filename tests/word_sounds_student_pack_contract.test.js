// STUDENT-PACK CONTRACT: on a student device (runtime AI disallowed), every
// Word Sounds activity must mount, run its effects, and build its board from
// the teacher-prepared pack WITHOUT a single AI call. The golden harness is
// SSR-only (effects skipped), so this test mounts with the real client
// renderer + act so board-building/generation effects actually execute, and
// pins the boundary with callGemini/callTTS/callImagen stubs that THROW.
//
// Covers all 17 activities (the golden list omits word_scramble and
// missing_letter — they are included here).

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, ACTIVITIES } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');

let React, ReactDOMClient, act, WordSoundsModal;

const ALL_ACTIVITIES = [...ACTIVITIES, 'word_scramble', 'missing_letter'];

// ── Prepared pack fixture for "cat" — mirrors compileActivityItems output ──
const B64 = 'AAAA';
const ttsAsset = { mime: 'audio/webm', base64: B64 };
const IMG = `data:image/png;base64,${B64}`;
const PACK_TTS_WORDS = ['cat', 'hat', 'dog', 'sun', 'bed', 'cot', 'cut', 'bat', 'mat', 'at', 'it', 'on', 'up', 'an', 'in', 'rabbit', 'window', 'pencil', 'kite', 'key', 'map', 'kat', 'catt', 'cta'];
const PACK_TTS_SENTENCES = [
  'which word did you hear?', 'which word rhymes with', 'find words that start with the sound',
  'find words that end with the sound', 'as in', 'listen to the syllables and blend them together',
  'how many syllables do you hear? clap for each one', 'find all words in the at family',
  'what is the first sound in cat?', 'what is the 1st sound?',
  "say 'cat'. now say it again, but leave out the first sound.",
];
const packTts = {};
for (const k of [...PACK_TTS_WORDS, ...PACK_TTS_SENTENCES]) packTts[k] = ttsAsset;

const MANIP_TASK = {
  type: 'deletion',
  instruction: "Say 'cat'. Now say it again, but leave out the first sound.",
  targetPhoneme: 'k',
  answer: 'at',
  distractors: ['it', 'on', 'up'],
};

function makePackItem() {
  return {
    id: 1, term: 'cat', word: 'cat', targetWord: 'cat', displayWord: 'cat',
    phonemes: ['k', 'a', 't'], phonemeCount: 3,
    graphemes: ['c', 'a', 't'],
    syllables: ['cat'],
    syllableBlendingOptions: ['cat', 'rabbit', 'window', 'pencil'],
    rhymes: ['hat'], rhymeWord: 'hat', rhymeDistractors: ['dog', 'sun', 'bed'],
    blendingDistractors: ['cot', 'cut', 'bat'],
    orthographyDistractors: ['kat', 'catt', 'cta'],
    familyEnding: '-at', familyMembers: ['hat', 'bat', 'mat'],
    firstSound: 'k', lastSound: 't',
    definition: 'a small pet', image: IMG,
    manipulationTask: MANIP_TASK,
    ttsReady: true,
    _studentPackVersion: 2,
    _ttsAssets: packTts,
    _decodingAssets: { cat: IMG, dog: IMG, sun: IMG, map: IMG },
    _aacAssets: { hat: IMG, bat: IMG, ball: IMG },
    activityItems: {
      counting: { options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '11+'], answer: 3 },
      isolation: { position: 0, correctSound: 'k', options: ['k', 'a', 't', 'm', 's', 'b'] },
      segmentation: {
        chips: [
          { id: 'correct-0', phoneme: 'k', type: 'correct', isDistractor: false },
          { id: 'correct-1', phoneme: 'a', type: 'correct', isDistractor: false },
          { id: 'correct-2', phoneme: 't', type: 'correct', isDistractor: false },
          { id: 'distractor-0', phoneme: 'm', type: 'distractor', isDistractor: true },
          { id: 'distractor-1', phoneme: 's', type: 'distractor', isDistractor: true },
        ],
        slotCount: 3,
      },
      blending: { options: ['cat', 'cot', 'cut', 'bat'], answer: 'cat' },
      rhyming: { options: ['hat', 'dog', 'sun', 'bed'], answer: 'hat' },
      manipulation: { task: MANIP_TASK, options: ['at', 'it', 'on', 'up', 'an', 'in'] },
      syllable_blending: { syllables: ['cat'], options: ['cat', 'rabbit', 'window', 'pencil'], answer: 'cat' },
      syllable_counting: { syllables: ['cat'], answer: 1 },
      orthography: { options: ['cat', 'kat', 'catt', 'cta'], answer: 'cat' },
      mapping: { graphemes: ['c', 'a', 't'], chipOrder: [{ id: 2, text: 't' }, { id: 0, text: 'c' }, { id: 1, text: 'a' }] },
      spelling_bee: { answer: 'cat' },
      word_scramble: { letters: ['t', 'c', 'a'], answer: 'cat' },
      missing_letter: { hiddenIndex: 1, correctLetter: 'a', options: ['a', 'e', 'o', 'u'] },
      sound_sort: { mode: 'first', targetChar: 'k', difficulty: 'easy', options: ['kite', 'key'], distractors: ['sun', 'map'] },
      letter_tracing: { letter: 'c' },
      word_families: { rime: 'at', options: ['hat', 'bat', 'mat'], distractors: ['dog', 'sun'] },
      decoding: { choices: ['cat', 'dog', 'sun', 'map'] },
    },
  };
}

function makeThrowingAi(calls, label) {
  return (...args) => {
    const entry = `${label}(${String(args[0]).slice(0, 60)})`;
    calls.push(entry);
    throw new Error(`Student-mode contract violated — runtime AI invoked: ${entry}`);
  };
}

function studentProps(activity, calls) {
  const packItem = makePackItem();
  return {
    ...baseProps(activity),
    allowRuntimeAi: false,
    callGemini: makeThrowingAi(calls, 'callGemini'),
    callTTS: makeThrowingAi(calls, 'callTTS'),
    callImagen: makeThrowingAi(calls, 'callImagen'),
    glossaryTerms: [],
    wsPreloadedWords: [packItem],
    currentWordSoundsWord: 'cat',
    // The full per-word pack object (word + phonemes + activityItems), the
    // shape the player receives after fetchWordData resolves a pack word.
    wordSoundsPhonemes: packItem,
  };
}

const mounted = [];
function mount(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ host, root });
  return { host, root };
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  // jsdom has no canvas backend: getContext returns null and the letter-
  // tracing effect (ctx.clearRect on mount) would crash. Real browsers
  // always provide a 2d context; stub one here.
  const ctx2dStub = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'canvas') return null;
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
      return typeof prop === 'string' ? () => {} : undefined;
    },
    set: () => true,
  });
  window.HTMLCanvasElement.prototype.getContext = () => ctx2dStub;
  const api = setupWordSounds();
  WordSoundsModal = api.WordSoundsModal;
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* already gone */ }
    host.remove();
  }
  delete window.__alloStudentAiDisabled;
});

describe('student pack contract: zero AI calls, board renders from pack', () => {
  for (const activity of ALL_ACTIVITIES) {
    it(`${activity}: mounts with effects, no AI, non-empty board`, async () => {
      const calls = [];
      const { host } = mount(React.createElement(WordSoundsModal, studentProps(activity, calls)));
      // Let mount effects + first async continuations run (board building,
      // any would-be generation kicks off in this window).
      await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
      expect(calls).toEqual([]);
      expect(host.innerHTML.length).toBeGreaterThan(200);
    });
  }

  it('window.__alloStudentAiDisabled gates AI when the host omits the prop', async () => {
    window.__alloStudentAiDisabled = true;
    const calls = [];
    const props = studentProps('blending', calls);
    delete props.allowRuntimeAi; // simulate an older host
    const { host } = mount(React.createElement(WordSoundsModal, props));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(calls).toEqual([]);
    expect(host.innerHTML.length).toBeGreaterThan(200);
  });

  it('prepared decoding board renders the packed choices + pack images (no Imagen)', async () => {
    // Decoding is the strictest pack consumer: the grid only reveals when
    // EVERY choice has a picture, and on student devices those pictures can
    // only come from the pack. The choice words surface as aria-labels
    // ("Picture of dog"), which pins the packed board verbatim.
    // (Blending/rhyming hide option text in sound-only mode, and the live
    // orthography view is a letter-tile constructor, so neither can pin
    // verbatim options from markup.)
    const calls = [];
    const { host } = mount(React.createElement(WordSoundsModal, studentProps('decoding', calls)));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    for (const choice of ['dog', 'sun', 'map']) {
      expect(host.innerHTML.toLowerCase()).toContain(choice);
    }
    expect(host.innerHTML).not.toContain('Preparing pictures');
    expect(calls).toEqual([]);
  });
});
