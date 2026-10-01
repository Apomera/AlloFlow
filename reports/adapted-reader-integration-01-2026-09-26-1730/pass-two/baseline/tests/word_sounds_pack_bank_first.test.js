/**
 * word_sounds_pack_bank_first.test.js
 *
 * Bank-first pack building (2026-08-23): when the setup screen packs per-word
 * audio, single words present in the recorded word bank
 * (word_audio_kokoro_bank.json) come from the bank; Gemini TTS is reserved for
 * sentences, phrases, and words the bank lacks. This is both a quota fix (the
 * packing loop has a 429 gate because builds genuinely hit rate limits) and a
 * keyless fix (with no TTS backend, words previously packed NOTHING).
 *
 * The precedence and the asset conversion are exercised by RUNNING the
 * extracted helper against the real shipped bank, not by reading source.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
let src, helperFactory, realBank;

beforeAll(() => {
  src = readFileSync(resolve(ROOT, 'word_sounds_setup_source.jsx'), 'utf8');
  realBank = JSON.parse(readFileSync(resolve(ROOT, 'word_audio_kokoro_bank.json'), 'utf8')).words;

  // Lift recordedBankAssetFor out of the component (established pattern: the
  // module is too large to import; the helper is pure given its two closures).
  const m = src.match(/const recordedBankAssetFor = \(text\) => \{[\s\S]*?\n {13}\};/);
  if (!m) throw new Error('recordedBankAssetFor not found in setup source');
  // eslint-disable-next-line no-new-func
  helperFactory = new Function('packRecordedWordBank', 'normalizePackKey',
    'return ' + m[0].replace('const recordedBankAssetFor = ', ''));
});

const normalizePackKey = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

describe('recordedBankAssetFor', () => {
  it('serves a single word from the real shipped bank as {mime, base64}', () => {
    const f = helperFactory(realBank, normalizePackKey);
    const asset = f('cat');
    expect(asset).toBeTruthy();
    expect(asset.mime).toBe('audio/webm');
    expect(asset.base64.length).toBeGreaterThan(1000);
    // Case and whitespace normalize the same way pack keys do
    expect(f('  Cat ')).toEqual(asset);
  });

  it('never serves sentences, prompts, or phrases — those keep the TTS voice', () => {
    const f = helperFactory(realBank, normalizePackKey);
    expect(f('I can see the corn.')).toBe(null);
    expect(f('Which word rhymes with')).toBe(null);
    expect(f('as in')).toBe(null);
  });

  it('misses words the bank lacks (culled words stay on TTS or absent)', () => {
    const f = helperFactory(realBank, normalizePackKey);
    expect(f('periwig')).toBe(null);
    expect(f('xylophoneish')).toBe(null);
  });

  it('is null-safe with no bank at all (non-English packs, failed fetch)', () => {
    const f = helperFactory(null, normalizePackKey);
    expect(f('cat')).toBe(null);
  });

  it('ignores malformed bank entries rather than packing garbage', () => {
    const f = helperFactory({ cat: { base64: 'x' }, dog: 'not-a-data-uri' }, normalizePackKey);
    expect(f('cat')).toBe(null);
    expect(f('dog')).toBe(null);
  });
});

describe('the packing loop honours the bank', () => {
  it('checks the bank before calling TTS, and outside the TTS-unavailable guard', () => {
    // Order inside runTasks must be: packed cache -> recorded bank -> callTTS.
    // The bank check sitting BEFORE the `ttsGate.aborted || typeof callTTS`
    // guard is what makes keyless packs work.
    const i = src.indexOf('const runTasks = async (list)');
    expect(i).toBeGreaterThan(0);
    const body = src.slice(i, src.indexOf('const was429', i));
    const cacheAt = body.indexOf('packedTtsAssets[key]) {');
    const bankAt = body.indexOf('recordedBankAssetFor(text)');
    const ttsAt = body.indexOf('typeof callTTS');
    expect(cacheAt).toBeGreaterThan(-1);
    expect(bankAt).toBeGreaterThan(cacheAt);
    expect(ttsAt).toBeGreaterThan(bankAt);
  });

  it('loads the bank bounded and gated to English packs', () => {
    const i = src.indexOf('let packRecordedWordBank = null;');
    expect(i).toBeGreaterThan(0);
    const block = src.slice(i - 200, i + 900);
    expect(block).toContain('packIsEnglish &&');
    expect(block).toContain('Promise.race');
    expect(block).toContain('window.loadWordAudioBank()');
  });

  it('records provenance in the pack coverage meta', () => {
    expect(src).toContain('fromRecordedBank: packedFromRecordedBank');
  });

  it('the built module carries all of it', () => {
    const built = readFileSync(resolve(ROOT, 'word_sounds_setup_module.js'), 'utf8');
    for (const marker of ['recordedBankAssetFor', 'fromRecordedBank', 'packRecordedWordBank']) {
      expect(built, marker + ' missing from built module').toContain(marker);
    }
  });
});
