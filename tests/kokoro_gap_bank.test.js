/**
 * kokoro_gap_bank.test.js
 *
 * Pins the Kokoro-generated audio banks and, more importantly, the CONTRACT
 * around them (Aaron, 2026-08-23): Kokoro fills gaps and owns the assessment
 * word bank; it never replaces an existing Gemini recording. That rule is
 * enforced structurally (getAudio checks the Gemini bank first) and these
 * tests pin both the structure and the data:
 *
 *   - the gap bank must not contain any key the Gemini bank already has
 *     (a collision would be invisible at runtime — Gemini wins — but it
 *     would mean the generator is quietly re-recording things it shouldn't);
 *   - getAudio's precedence is proven by RUNNING it, not by reading it;
 *   - every clip is provenance-labeled in the manifest, which is the
 *     developer-side "this is Kokoro, replace me later" record;
 *   - the word bank matches the cull exactly: every kept word present, every
 *     dropped word absent.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
let gemini, kokoro, wordBank, manifest, anti;

beforeAll(() => {
  gemini = JSON.parse(readFileSync(resolve(ROOT, 'audio_bank.json'), 'utf8'));
  kokoro = JSON.parse(readFileSync(resolve(ROOT, 'audio_bank_kokoro.json'), 'utf8'));
  wordBank = JSON.parse(readFileSync(resolve(ROOT, 'word_audio_kokoro_bank.json'), 'utf8'));
  manifest = JSON.parse(readFileSync(resolve(ROOT, 'dev-tools/kokoro_audio_manifest.json'), 'utf8'));
  anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
});

const CATEGORIES = ['instructions', 'isolation', 'phonemes'];

describe('the gap bank', () => {
  it('is labeled machine-generated, with engine and voice', () => {
    expect(kokoro._meta.engine).toMatch(/kokoro/i);
    expect(kokoro._meta.voice).toBe('af_heart');
    expect(kokoro._meta.note).toMatch(/gemini clip.*wins/i);
  });

  it('holds only webm data URIs', () => {
    for (const cat of CATEGORIES) {
      for (const [key, v] of Object.entries(kokoro[cat] || {})) {
        expect(v, cat + '/' + key).toMatch(/^data:audio\/webm;base64,/);
      }
    }
  });

  it('never collides with a Gemini recording — gap-fill only', () => {
    const collisions = [];
    for (const cat of CATEGORIES) {
      for (const key of Object.keys(kokoro[cat] || {})) {
        if (gemini[cat] && gemini[cat][key]) collisions.push(cat + '/' + key);
      }
    }
    expect(collisions, 'Kokoro re-recorded keys Gemini already owns').toEqual([]);
  });

  it('fills exactly the gaps the player looks up', () => {
    expect(Object.keys(kokoro.instructions).sort()).toEqual(
      ['as_in', 'inst_syllable_blending', 'inst_syllable_counting']);
    expect(Object.keys(kokoro.isolation).sort()).toEqual(['11th', '12th', 'last', 'middle']);
    expect(Object.keys(kokoro.phonemes)).toEqual(['schwa']);
  });
});

describe('the word bank', () => {
  it('matches the cull exactly: kept words in, dropped words out', () => {
    const words = Object.keys(wordBank.words);
    const drops = Object.keys(manifest.cull.drops);
    expect(words.length).toBe(manifest.cull.kept);
    const dropped = words.filter((w) => manifest.cull.drops[w]);
    expect(dropped, 'dropped words leaked into the shipped bank').toEqual([]);
    expect(drops.length).toBe(manifest.cull.dropped);
    // spot the poster children
    for (const w of ['whig', 'periwig', 'gun', 'armistice']) {
      expect(wordBank.words[w], w + ' should have been culled').toBeUndefined();
    }
    for (const w of ['cat', 'corn', 'book', 'thingamajig']) {
      expect(wordBank.words[w], w + ' should have survived the cull').toBeTruthy();
    }
  });

  it('holds only playable webm data URIs (the format new Audio() accepts)', () => {
    for (const [w, v] of Object.entries(wordBank.words)) {
      expect(typeof v, w).toBe('string');
      expect(v, w).toMatch(/^data:audio\/webm;base64,/);
    }
  });
});

describe('provenance manifest', () => {
  it('labels every shipped clip with engine, voice, and post-processing', () => {
    const shipped = new Set();
    for (const cat of CATEGORIES) Object.keys(kokoro[cat] || {}).forEach((k) => shipped.add(cat + '/' + k));
    Object.keys(wordBank.words).forEach((w) => shipped.add('words/' + w));
    const listed = new Set(manifest.clips.map((c) => c.category + '/' + c.key));
    const unlisted = [...shipped].filter((k) => !listed.has(k));
    expect(unlisted, 'shipped clips missing from the manifest').toEqual([]);
    for (const c of manifest.clips) {
      expect(c.engine).toMatch(/Kokoro-82M/);
      expect(c.post).toMatch(/ramp\(2ms\/6ms\)/);
    }
  });

  it('flags schwa for human review instead of passing it off as done', () => {
    const schwa = manifest.clips.find((c) => c.key === 'schwa');
    expect(schwa.review).toMatch(/human/i);
  });
});

describe('the shell wiring', () => {
  it('getAudio gives the Gemini bank precedence — proven by running it', () => {
    const m = anti.match(/function getAudio\(category, key\) \{[\s\S]*?\n\}/);
    expect(m, 'getAudio not found in the shell').toBeTruthy();
    // eslint-disable-next-line no-new-func
    // getAudio now kicks a split-bank fetch on a category miss; inject a noop
    // requester so the extracted function runs standalone.
    const make = new Function('_AUDIO_BANK', '_AUDIO_BANK_KOKORO', '_requestAudioCategory',
      'return ' + m[0].replace('function getAudio', 'function'));
    const g = make(
      { phonemes: { collide: 'GEMINI' } },
      { phonemes: { collide: 'KOKORO', only: 'KOKORO-ONLY' } },
      () => {},
    );
    expect(g('phonemes', 'collide')).toBe('GEMINI');
    expect(g('phonemes', 'only')).toBe('KOKORO-ONLY');
    expect(g('phonemes', 'nowhere')).toBe(null);
    // and with the Gemini bank failed to load entirely, the overlay still serves
    const gNoMain = make(null, { phonemes: { only: 'KOKORO-ONLY' } }, () => {});
    expect(gNoMain('phonemes', 'only')).toBe('KOKORO-ONLY');
  });

  it('exposes loadWordAudioBank on window for the CDN-split module', () => {
    // The module substitutes a no-op stub when this property is absent, which
    // is precisely how every recorded word stayed on TTS until now.
    expect(anti).toContain('window.loadWordAudioBank = loadWordAudioBank;');
    expect(anti).toContain("word_audio_kokoro_bank.json'");
    expect(anti).toContain('window._CACHE_WORD_AUDIO_BANK = words;');
  });

  it('fetches the kokoro gap bank independently of the main bank', () => {
    expect(anti).toContain('_initKokoroAudioBank');
    expect(anti).toContain("audio_bank_kokoro.json'");
  });
});

describe('the exposure maps route the new keys', () => {
  it('audio_banks_module lists every gap and routing-fix key', () => {
    const src = readFileSync(resolve(ROOT, 'audio_banks_module.js'), 'utf8');
    for (const k of ['inst_word_families', 'as_in', 'inst_syllable_counting',
      'inst_syllable_blending', "'middle'", "'last'", "'11th'", "'12th'",
      "'aw'", "'dh'", "'zh'", "'ue'", "'oo_short'", "'schwa'"]) {
      expect(src, k + ' missing from exposure').toContain(k);
    }
  });

  it('word_sounds_module keeps the verbatim oo_short clip over the stripped key', () => {
    const src = readFileSync(resolve(ROOT, 'word_sounds_module.js'), 'utf8');
    expect(src).toMatch(/endsWith\("_short"\)\s*&&[\s\S]{0,700}__ALLO_PHONEME_AUDIO_BANK\[normalizedKey\]/);
  });
});
