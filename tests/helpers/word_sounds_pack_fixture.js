// Shared prepared-pack fixture for Word Sounds live-mount tests
// (student-pack contract + a11y audit). Mirrors compileActivityItems output
// for the word "cat".
import { baseProps } from './word_sounds_harness.js';

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

export const MANIP_TASK = {
  type: 'deletion',
  instruction: "Say 'cat'. Now say it again, but leave out the first sound.",
  targetPhoneme: 'k',
  answer: 'at',
  distractors: ['it', 'on', 'up'],
};

export function makePackItem() {
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

export function makeThrowingAi(calls, label) {
  return (...args) => {
    const entry = `${label}(${String(args[0]).slice(0, 60)})`;
    calls.push(entry);
    throw new Error(`Student-mode contract violated — runtime AI invoked: ${entry}`);
  };
}

export function studentProps(activity, calls) {
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

// jsdom has no canvas backend: getContext returns null and the letter-tracing
// effect (ctx.clearRect on mount) would crash. Real browsers always provide a
// 2d context; install this stub before loading the module.
export function installCanvasStub() {
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
}
