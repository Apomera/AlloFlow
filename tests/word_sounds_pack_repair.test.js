// FIX IT IN THE PIPELINE, NOT IN THE PANEL.
//
// The "letter-split sounds (generation failed)" and "no rhyme answer" lines on
// the review panel's readiness list are not conditions that develop and then
// get noticed. They are manufactured during generation — when Gemini returns a
// word without phonemes, the pack dropped straight to a spelling heuristic —
// and merely displayed afterwards. So the fix belongs in the fallback ladder
// that produces each word, where the gap never comes into existence, rather
// than in a repair pass over a state the teacher never saw.
//
// Ladder: Gemini, then eSpeak NG (a real grapheme-to-phoneme engine), then the
// spelling heuristic. Only the last rung is a guess, so only the last rung
// raises the teacher-facing "estimated sounds" flag.
//
// These are behavioural: the helpers are pure and contiguous at module scope,
// so the test evaluates the real source rather than asserting on its text.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SOURCE = readFileSync(resolve(process.cwd(), 'word_sounds_setup_source.jsx'), 'utf8');

/** Evaluates the real helper block from the source, fresh each time (the
 *  eSpeak load cache is per-instance, so a test can control it). */
function loadHelpers() {
  const start = SOURCE.indexOf('const PACK_COMMON_WORDS');
  const end = SOURCE.indexOf('// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('helper block not found — did the source move?');
  }
  const block = SOURCE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(
    `${readFileSync(resolve(process.cwd(), 'word_sounds_core.js'), 'utf8')}\nconst WS_CORE = createWordSoundsCore();\n${block}\nreturn { PACK_COMMON_WORDS, packRimeOfWord, derivePackRhyme, espeakPackPhonemes };`,
  )();
}

const originalWindow = global.window;
afterEach(() => {
  if (originalWindow === undefined) delete global.window;
  else global.window = originalWindow;
});

describe('rhyme answers are derived at generation, not left for the device', () => {
  let H;
  beforeEach(() => { H = loadHelpers(); });

  it('finds a rhyme among the words in this session first', () => {
    // A rhyme the child is also being taught is worth more than a stranger.
    expect(H.derivePackRhyme('mat', ['mat', 'sled', 'bat'], true)).toBe('bat');
  });

  it('falls back to the filler pool when the session has none', () => {
    expect(H.derivePackRhyme('bat', ['bat', 'sled'], true)).toBe('cat');
  });

  it('never returns the word itself', () => {
    expect(H.derivePackRhyme('cat', ['cat'], true)).not.toBe('cat');
  });

  it('refuses a one-letter rime rather than assert a bad pair', () => {
    // 'sofa' ends in a bare 'a', which would "rhyme" with half the language.
    // An empty answer that the player derives at runtime beats a wrong one.
    expect(H.derivePackRhyme('sofa', ['sofa', 'panda'], true)).toBe('');
  });

  it('matches on the rime, not the whole word', () => {
    // 'sled' and 'bed' share the rime 'ed'. A consonant cluster on the front
    // is exactly what a rhyming task is asking the child to hear past.
    expect(H.derivePackRhyme('sled', ['sled'], true)).toBe('bed');
  });

  it('returns nothing when no candidate shares the rime', () => {
    // 'moon' is in the filler pool, so this also pins that a word cannot be
    // handed its own rhyme by way of the pool.
    expect(H.derivePackRhyme('moon', ['moon', 'star'], true)).toBe('');
  });

  it('does not put English filler into a non-English pack', () => {
    // Pack boards ride verbatim to student devices, so an English rhyme on a
    // Spanish pack would be shipped to the child as-is.
    const out = H.derivePackRhyme('gato', ['gato', 'pato'], false);
    expect(out, 'matching letters alone do not verify a pronunciation').toBe('');
    expect(H.PACK_COMMON_WORDS).not.toContain('pato');
    expect(H.derivePackRhyme('gato', ['gato'], false)).toBe('');
  });
});

describe('eSpeak sits between the AI and the spelling heuristic', () => {
  let H;
  beforeEach(() => { H = loadHelpers(); });

  const withPhonics = (impl) => {
    global.window = {
      AlloPhonics: {
        toPhonemes: impl.toPhonemes,
        buildPhonemes: impl.buildPhonemes,
      },
    };
  };

  it('retains IPA alongside its grapheme spelling', async () => {
    withPhonics({
      toPhonemes: async () => ({ ipa: ['ʃ', 'ɪ', 'p'], count: 3 }),
      buildPhonemes: () => ({
        phonemes: [
          { ipa: 'ʃ', grapheme: 'sh' },
          { ipa: 'ɪ', grapheme: 'i' },
          { ipa: 'p', grapheme: 'p' },
        ],
      }),
    });
    expect(await H.espeakPackPhonemes('ship', 'English')).toEqual([
      {ipa:'ʃ',grapheme:'sh'}, {ipa:'ɪ',grapheme:'i'}, {ipa:'p',grapheme:'p'},
    ]);
  });

  it('falls through when the language has no eSpeak voice', async () => {
    // toPhonemes returns null rather than running the English voice on another
    // language, which would produce confidently wrong sounds.
    withPhonics({ toPhonemes: async () => null, buildPhonemes: () => { throw new Error('must not be called'); } });
    expect(await H.espeakPackPhonemes('sanaa', 'Somali')).toBeNull();
  });

  it('rejects entries that omit the verified sounds', async () => {
    // Missing graphemes alone are allowed, but these entries also omit IPA.
    withPhonics({
      toPhonemes: async () => ({ ipa: ['k', 'æ', 't'], count: 3 }),
      buildPhonemes: () => ({ phonemes: [{ grapheme: 'c' }, { grapheme: '' }, { grapheme: 't' }] }),
    });
    expect(await H.espeakPackPhonemes('cat', 'English')).toBeNull();
  });

  it('survives a G2P engine that throws', async () => {
    withPhonics({ toPhonemes: async () => { throw new Error('wasm exploded'); }, buildPhonemes: () => null });
    expect(await H.espeakPackPhonemes('cat', 'English')).toBeNull();
  });

  it('does not attempt a load when the plugin loader is absent', async () => {
    global.window = {};
    expect(await H.espeakPackPhonemes('cat', 'English')).toBeNull();
  });

  it('caches a failed load, so a 40-word pack cannot serialise 40 timeouts', async () => {
    let loadAttempts = 0;
    global.window = {
      __alloLoadPlugin: async () => { loadAttempts += 1; },
    };
    for (let i = 0; i < 5; i++) await H.espeakPackPhonemes(`word${i}`, 'English');
    expect(loadAttempts, 'the load must be attempted once per session').toBe(1);
  });
});

// The two ladders sit inside the generation loop, so they are run as sliced
// from the real source with the steps around them stubbed. Each eSpeak await
// goes through awaitGeneration, which is what lets Cancel interrupt it.
const AsyncFunction = (async () => {}).constructor;
const LADDER_ARGS = ['wordSoundsLanguage', 'espeakPackPhonemes', 'estimatePackPhonemes', 'awaitGeneration', 'isGenerationActive', 'WS_CORE', 'packIsEnglish'];
const runMainLadder = new AsyncFunction('data', ...LADDER_ARGS,
  `${sliceBetween(SOURCE, 'const _phonemesMissing = !(data.phonemes', 'const preparedRhyme', { label: 'phoneme ladder' })}
  return { phonemes: validatedPhonemes, source: _phonemeSource };`);
const runRescueLadder = new AsyncFunction('rawWord', 'processed', ...LADDER_ARGS,
  `${sliceBetween(SOURCE, 'const _espeakRescue = ', "_phonemeSource: _espeakRescue ? 'espeak' : 'estimated'\n                     });", { label: 'rescue ladder', includeEnd: true })}
  return processed[0];`);

function ladderSteps({ espeak = null, active = () => true, cancelAwait = false } = {}) {
  const calls = { espeak: [], espeakPromises: [], awaited: [], estimate: [] };
  return {
    calls,
    args: ['English',
      (word, language) => { calls.espeak.push([word, language]); const p = Promise.resolve(espeak); calls.espeakPromises.push(p); return p; },
      (word) => { calls.estimate.push(word); return word.split(''); },
      (p) => { calls.awaited.push(p); return cancelAwait ? Promise.reject(new Error('generation cancelled')) : p; },
      active, new Function(readFileSync('word_sounds_core.js','utf8')+';return createWordSoundsCore();')(), true],
  };
}

describe('only a guess is flagged as a guess', () => {
  it('the ladder runs Gemini, then eSpeak, then the heuristic', async () => {
    let s = ladderSteps({ espeak: ['x'] });
    expect(await runMainLadder({ word: 'ship', phonemes: ['sh', 'i', 'p'] }, ...s.args))
      .toEqual({ phonemes: ['sh', 'i', 'p'], source: 'gemini' });
    expect(s.calls.espeak, 'a Gemini answer must not wait on eSpeak').toEqual([]);

    s = ladderSteps({ espeak: ['sh', 'i', 'p'] });
    expect(await runMainLadder({ word: 'ship', phonemes: [] }, ...s.args)).toEqual({ phonemes: ['sh', 'i', 'p'], source: 'espeak' });
    expect(s.calls.espeak).toEqual([['ship', 'English']]);
    expect(s.calls.awaited[0], 'the eSpeak step must be cancellable').toBe(s.calls.espeakPromises[0]);
    expect(s.calls.estimate).toEqual([]);

    s = ladderSteps({ espeak: null });
    expect(await runMainLadder({ word: 'ship' }, ...s.args)).toEqual({ phonemes: ['s', 'h', 'i', 'p'], source: 'estimated' });
    expect(s.calls.estimate).toEqual(['ship']);
  });

  it('a cancel during the eSpeak step ships nothing', async () => {
    const s = ladderSteps({ espeak: ['sh', 'i', 'p'], active: () => false });
    expect(await runMainLadder({ word: 'ship' }, ...s.args)).toBeUndefined();
    expect(s.calls.estimate).toEqual([]);
    const processed = [];
    await expect(runRescueLadder('ship', processed, ...ladderSteps({ cancelAwait: true }).args)).rejects.toThrow('generation cancelled');
    expect(await runRescueLadder('ship', processed, ...ladderSteps({ espeak: ['sh', 'i', 'p'], active: () => false }).args)).toBeUndefined();
    expect(processed).toEqual([]);
  });

  it('an eSpeak result does NOT raise the estimated-sounds warning', () => {
    // This is the whole point: the warning should mean "a G2P engine could not
    // do this word either", not "Gemini hiccuped".
    expect(SOURCE).toMatch(/_fallbackUsed: \(_phonemeSource === 'estimated'\) \|\| undefined/);
    expect(SOURCE).toMatch(/_fallbackUsed: !_espeakRescue/);
  });

  it('the word that threw gets the same rescue', async () => {
    let s = ladderSteps({ espeak: ['sh', 'i', 'p'] });
    expect(await runRescueLadder('ship', [], ...s.args)).toMatchObject({
      word: 'ship', phonemes: ['sh', 'i', 'p'], phonemeCount: 3, firstSound: 'sh', lastSound: 'p',
      _fallbackUsed: false, _phonemeSource: 'espeak',
    });
    expect(s.calls.espeak).toEqual([['ship', 'English']]);
    expect(s.calls.awaited[0], 'the eSpeak step must be cancellable').toBe(s.calls.espeakPromises[0]);
    expect(s.calls.estimate).toEqual([]);

    s = ladderSteps({ espeak: null });
    expect(await runRescueLadder('ship', [], ...s.args)).toMatchObject({
      phonemes: ['s', 'h', 'i', 'p'], _fallbackUsed: true, _phonemeSource: 'estimated',
    });
  });

  it('provenance is recorded on every path', () => {
    expect(SOURCE).toMatch(/_phonemeSource = !_phonemesMissing\s*\n\s*\? 'gemini'/);
    expect(SOURCE).toMatch(/_rhymeSource:/);
  });

  it('the filler pool is declared once and shared with the board compiler', () => {
    expect(SOURCE).toMatch(/const commonWords = packIsEnglish \? PACK_COMMON_WORDS : \[\];/);
    expect((SOURCE.match(/'cat','dog','sun','map'/g) || []).length,
      'the word list must not be duplicated, or the two copies drift').toBe(1);
  });

  it('the built module carries the change', () => {
    const built = readFileSync(resolve(process.cwd(), 'word_sounds_setup_module.js'), 'utf8');
    expect(built, 'run: node _build_word_sounds_setup_module.js').toMatch(/espeakPackPhonemes/);
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/word_sounds_setup_module.js'), 'utf8'))
      .toMatch(/espeakPackPhonemes/);
  });
});

describe('one rate limit no longer costs the whole pack', () => {
  it('the abort is not a one-way switch any more', () => {
    // It used to be: the first 429 anywhere set prewarmAborted and every
    // remaining word packed nothing. A pack shipped with six clips for five
    // words because of it.
    expect(SOURCE).not.toMatch(/let prewarmAborted = false;/);
    expect(SOURCE).not.toMatch(/prewarmAborted = true;/);
  });

  it('it waits out the cooldown and retries what is still missing', () => {
    // The limit is a ~60 second cooldown, not a permanent failure.
    expect(SOURCE).toMatch(/const TTS_COOLDOWN_MS = 15000;/);
    expect(SOURCE).toMatch(/ttsGate\.cooldowns \+= 1;/);
    expect(SOURCE).toMatch(/const stillMissing = taskList\.filter\(\(text\) => !packedTtsAssets\[normalizePackKey\(text\)\]\)/);
    expect(SOURCE).toMatch(/results = await runTasks\(stillMissing\)/);
  });

  it('it does give up eventually, rather than stalling a teacher for minutes', () => {
    expect(SOURCE).toMatch(/const TTS_MAX_COOLDOWNS = 2;/);
    expect(SOURCE).toMatch(/ttsGate\.cooldowns < TTS_MAX_COOLDOWNS/);
    expect(SOURCE).toMatch(/ttsGate\.aborted = true;/);
  });

  it('the Kokoro offer still fires on the first limit', () => {
    // Kokoro is local and rate-limit-free, so it is the actual way out.
    const idx = SOURCE.indexOf('ttsGate.rateLimited = true;');
    expect(idx).toBeGreaterThan(0);
    expect(SOURCE.slice(idx, idx + 500)).toMatch(/onRequestKokoroOffer\('word_sounds'\)/);
  });

  it('what the run managed is recorded on the pack', () => {
    // A pack that lost its audio looks identical to a complete one from the
    // outside; this is the only place the difference is knowable.
    expect(SOURCE).toMatch(/_ttsCoverage = \{/);
    expect(SOURCE).toMatch(/requiredClips: requiredTtsKeys\.size/);
    expect(SOURCE).toMatch(/_ttsRequiredKeys = \[\.\.\.requiredTtsKeys\]/);
    expect(SOURCE).toMatch(/wordsWithAudio: processed\.filter\(\(it\) => it\.ttsReady\)\.length/);
    expect(SOURCE).toMatch(/rateLimited: ttsGate\.rateLimited/);
    expect(SOURCE).toMatch(/gaveUp: ttsGate\.aborted/);
  });

  it('and the readiness line explains it instead of just counting', () => {
    const misc = readFileSync(resolve(process.cwd(), 'misc_components_source.jsx'), 'utf8');
    expect(misc).toMatch(/_ttsCoverage/);
    expect(misc).toMatch(/cut short by a rate limit/);
    expect(misc).toMatch(/hit a rate limit and recovered/);
  });
});
