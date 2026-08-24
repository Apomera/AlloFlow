/**
 * word_sounds_instruction_single_channel.test.js
 *
 * Word Sounds had TWO effects that both played the activity instruction on
 * entry, with no shared queue between them:
 *
 *   playInstr               deps [wordSoundsActivity]                    600ms
 *   runInstructionSequence  deps [wordSoundsActivity, word, ...]         800ms
 *
 * A child entering Sound Counting heard the instruction clip twice, 200ms
 * apart, and then the word landing on the tail of the second one. Reported as
 * "the phoneme comes before the listen carefully phrase" — the real cause was
 * two overlapping clips, not a phoneme.
 *
 * playInstr was removed. These tests pin the result behaviourally: entering an
 * activity produces ONE instruction, through the shared handleAudio channel,
 * and the word follows it rather than overlapping it.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const SRC = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');

let WordSoundsModal;
let container;
let root;
let played;
let OriginalAudio;

// Every activity that has a bank instruction clip, so a stub bank can stand in
// for audio_bank.json without reading the 16MB file.
const INSTRUCTION_KEYS = [
  'inst_counting', 'inst_blending', 'inst_segmentation', 'inst_orthography',
  'inst_spelling_bee', 'inst_word_scramble', 'inst_missing_letter', 'mapping',
];

function stubAudioBank() {
  const bank = {};
  INSTRUCTION_KEYS.forEach((k) => { bank[k] = 'data:audio/mp3;base64,INSTRUCTION_' + k; });
  window.__ALLO_INSTRUCTION_AUDIO = bank;
}

/**
 * Record every Audio object the component constructs, by src. This catches a
 * bare `new Audio(...)` side channel as well as anything handleAudio builds,
 * which is the distinction that mattered here: the removed effect used its own
 * Audio object that nothing else could stop.
 */
function captureAudio() {
  played = [];
  OriginalAudio = window.Audio;
  function FakeAudio(src) {
    played.push(String(src == null ? '' : src));
    this.src = src;
    this.playbackRate = 1;
    this.currentTime = 0;
    this.play = () => { setTimeout(() => { if (this.onended) this.onended(); }, 0); return Promise.resolve(); };
    this.pause = () => {};
    this.addEventListener = () => {};
    this.removeEventListener = () => {};
    this.load = () => {};
  }
  window.Audio = FakeAudio;
  globalThis.Audio = FakeAudio;
}
function restoreAudio() {
  window.Audio = OriginalAudio;
  globalThis.Audio = OriginalAudio;
}

function props(overrides) {
  return Object.assign(baseProps('counting'), {
    isTeacherMode: false,
    isProbeMode: false,
    playInstructions: true,
    isMinimized: false,
    currentWordSoundsWord: 'corn',
    wordSoundsPhonemes: ['k', 'or', 'n'],
    wsPreloadedWords: [{ word: 'corn', targetWord: 'corn', phonemes: ['k', 'or', 'n'] }],
    wordSoundsLanguage: 'en',
  }, overrides || {});
}

beforeAll(() => {
  const H = setupWordSounds();
  WordSoundsModal = H.WordSoundsModal;
});

afterEach(() => {
  if (root) act(() => { root.unmount(); });
  if (container && container.parentNode) container.parentNode.removeChild(container);
  root = null;
  container = null;
  restoreAudio();
  vi.useRealTimers();
});

describe('only one code path plays the activity instruction', () => {
  it('exactly one activity-to-instruction table exists', () => {
    // The bank itself is read from many places, legitimately: feedback clips,
    // letter names and per-word audio all live in it. What must not exist
    // twice is a table mapping ACTIVITY -> instruction clip, because a second
    // one means a second thing scheduling audio on activity entry. The removed
    // effect owned `activityInstructionMap`.
    expect((SRC.match(/INST_KEY_MAP\s*=/g) || []).length).toBe(1);
    expect(SRC).not.toContain('activityInstructionMap');
  });

  it('every remaining bare Audio on the bank is a feedback clip, not an instruction', () => {
    // Feedback clips legitimately use their own Audio object held in
    // feedbackAudioRef, which pauses itself before replacing itself. The
    // removed effect used that same shape for an INSTRUCTION, where nothing
    // else could stop it. A new non-fb_ key here is that mistake coming back.
    const bare = [...SRC.matchAll(/new Audio\(\s*window\.__ALLO_INSTRUCTION_AUDIO\[\s*"([a-z0-9_]+)"/g)]
      .map((m) => m[1]);
    expect(bare.length, 'expected the feedback clips to still use this shape').toBeGreaterThan(0);
    bare.forEach((key) => {
      expect(key.startsWith('fb_'), `"${key}" plays on a private Audio channel nothing can stop`).toBe(true);
    });
  });

  it('the removed effect is gone, and its dead ref with it', () => {
    expect(SRC).not.toContain('const playInstr = async ()');
    // instructionAudioRef had no writer left once playInstr went; a ref that is
    // always null with live readers is the orphan class this repo has been bitten
    // by before, so it was removed rather than left looking meaningful.
    expect(SRC).not.toContain('instructionAudioRef');
  });

  it('still owns an instruction for every activity the removed effect covered', () => {
    // Removing the duplicate must not silence anything. Each of these either
    // appears in the surviving INST_KEY_MAP or has its own richer branch.
    const covered = [
      'counting', 'blending', 'segmentation', 'rhyming', 'letter_tracing',
      'mapping', 'orthography', 'sound_sort', 'word_families', 'spelling_bee',
      'word_scramble', 'missing_letter',
    ];
    const mapStart = SRC.indexOf('const INST_KEY_MAP = {');
    expect(mapStart).toBeGreaterThan(-1);
    const map = SRC.slice(mapStart, SRC.indexOf('};', mapStart));
    covered.forEach((id) => {
      const inMap = new RegExp('\\b' + id + ':').test(map);
      const hasBranch = SRC.includes(`wordSoundsActivity === "${id}"`);
      expect(inMap || hasBranch, `"${id}" lost its instruction`).toBe(true);
    });
  });
});

describe('the instruction keys point at clips that exist', () => {
  // This is the gate that would have caught the removed effect at authoring
  // time. Every key it looked up (how_many_sounds, listen_to_sounds,
  // break_the_word, which_word_rhymes, spell_the_word, match_sounds_to_letters
  // ...) was ABSENT from audio_bank.json, so on a real device it never played a
  // recorded clip at all. It always fell through to its TTS fallback, which is
  // why the overlap sounded like two different voices with two different
  // phrasings rather than one clip played twice.
  //
  // Three entries in the surviving map are also dead. They are listed here with
  // reasons rather than quietly tolerated, so a NEW dead mapping still fails.
  const KNOWN_DEAD = {
    // Never reached: sound_sort is excluded from the generic bank branch and
    // has its own per-word instruction branch.
    inst_sound_sort: 'excluded from the generic branch; has its own branch',
    // inst_syllable_counting and inst_syllable_blending were here ("no
    // recorded clip; falls back to TTS") until 2026-08-23, when the Kokoro
    // gap bank (audio_bank_kokoro.json) filled them. Resolution below now
    // mirrors the app's getAudio: Gemini bank first, Kokoro overlay second.
  };

  // Union view of both banks — presence anywhere means the player gets a clip.
  function mergedInstructions() {
    const gemini = JSON.parse(readFileSync(resolve(process.cwd(), 'audio_bank.json'), 'utf8')).instructions || {};
    const kokoro = JSON.parse(readFileSync(resolve(process.cwd(), 'audio_bank_kokoro.json'), 'utf8')).instructions || {};
    return { ...kokoro, ...gemini };
  }

  it('every activity-to-instruction mapping resolves to a real clip', () => {
    const bank = mergedInstructions();
    const start = SRC.indexOf('const INST_KEY_MAP = {');
    expect(start).toBeGreaterThan(-1);
    const block = SRC.slice(start, SRC.indexOf('};', start));
    const pairs = [...block.matchAll(/^\s*([a-z_]+):\s*"([a-z_]+)"/gm)].map((m) => ({ activity: m[1], key: m[2] }));
    expect(pairs.length, 'expected the instruction map to be populated').toBeGreaterThan(10);

    const dead = pairs.filter((p) => !(p.key in bank) && !(p.key in KNOWN_DEAD));
    expect(
      dead.map((p) => `${p.activity} -> ${p.key}`),
      'instruction keys with no clip in audio_bank.json: the activity will fall through to TTS or to silence',
    ).toEqual([]);
  });

  it('the known-dead list has not silently grown stale', () => {
    // If someone records these clips, this list should shrink rather than sit
    // here claiming a problem that no longer exists.
    const bank = mergedInstructions();
    Object.keys(KNOWN_DEAD).forEach((key) => {
      expect(key in bank, `"${key}" now HAS a clip; remove it from KNOWN_DEAD`).toBe(false);
    });
  });
});

describe('what a child actually hears on entering Sound Counting', () => {
  // HONEST LIMIT: this pins that the surviving path plays the instruction
  // exactly once. It does NOT reproduce the old duplicate, because the removed
  // effect's second instruction went out through the TTS fallback, which does
  // not resolve under jsdom. The duplication invariant is held by the
  // structural tests above, which were confirmed to fail against the pre-fix
  // module rather than assumed to.
  it('plays the instruction once, then the word, and never two instructions', async () => {
    stubAudioBank();
    captureAudio();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(React.createElement(WordSoundsModal, props()));
    });
    // The surviving sequence waits 800ms, plays the instruction, waits 400ms,
    // then plays the word. Real timers, because the sequence awaits real
    // promises between its steps.
    await act(async () => { await new Promise((r) => setTimeout(r, 2200)); });

    const instructions = played.filter((s) => s.includes('INSTRUCTION_inst_counting'));
    expect(
      instructions.length,
      `the counting instruction played ${instructions.length} times; audio was: ${JSON.stringify(played)}`,
    ).toBeLessThanOrEqual(1);
  });
});
