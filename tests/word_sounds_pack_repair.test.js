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

const SOURCE = readFileSync(resolve(process.cwd(), 'word_sounds_setup_source.jsx'), 'utf8');

/** Evaluates the real helper block from the source, fresh each time (the
 *  eSpeak load cache is per-instance, so a test can control it). */
function loadHelpers() {
  const start = SOURCE.indexOf('const PACK_COMMON_WORDS');
  const end = SOURCE.indexOf('const WordSoundsGenerator = React.memo(');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('helper block not found — did the source move?');
  }
  const block = SOURCE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(
    `${block}\nreturn { PACK_COMMON_WORDS, packRimeOfWord, derivePackRhyme, espeakPackPhonemes };`,
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
    expect(out).toBe('pato');
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

  it('returns grapheme clusters, because the audio bank is keyed by grapheme', async () => {
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
    expect(await H.espeakPackPhonemes('ship', 'English')).toEqual(['sh', 'i', 'p']);
  });

  it('falls through when the language has no eSpeak voice', async () => {
    // toPhonemes returns null rather than running the English voice on another
    // language, which would produce confidently wrong sounds.
    withPhonics({ toPhonemes: async () => null, buildPhonemes: () => { throw new Error('must not be called'); } });
    expect(await H.espeakPackPhonemes('sanaa', 'Somali')).toBeNull();
  });

  it('rejects an alignment with a hole in it', async () => {
    // A blank grapheme has no audio clip and no letters to show, so half a
    // board is worse than falling through to the heuristic.
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

describe('only a guess is flagged as a guess', () => {
  it('the ladder runs Gemini, then eSpeak, then the heuristic', () => {
    expect(SOURCE).toMatch(/_espeakPhonemes = await espeakPackPhonemes\(data\.word, wordSoundsLanguage\)/);
    expect(SOURCE).toMatch(/\(_espeakPhonemes \|\| estimatePackPhonemes\(data\.word\)\)/);
  });

  it('an eSpeak result does NOT raise the estimated-sounds warning', () => {
    // This is the whole point: the warning should mean "a G2P engine could not
    // do this word either", not "Gemini hiccuped".
    expect(SOURCE).toMatch(/_fallbackUsed: \(_phonemeSource === 'estimated'\) \|\| undefined/);
    expect(SOURCE).toMatch(/_fallbackUsed: !_espeakRescue/);
  });

  it('the word that threw gets the same rescue', () => {
    expect(SOURCE).toMatch(/_espeakRescue = await espeakPackPhonemes\(rawWord, wordSoundsLanguage\)/);
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
