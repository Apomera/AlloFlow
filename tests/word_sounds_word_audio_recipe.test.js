import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// The carrier recipe of dev-tools/build_word_sounds_word_audio.cjs (--recipe sentence, --dtype, --carrier,
// --trim gentle, --loudness, --bitrate), on made-up sound: no browser, no speech model, no ffmpeg.
// The bank recipe (every default) is covered by word_sounds_word_audio_store.test.js and must not move.
const require = createRequire(import.meta.url);
const tool = require('../dev-tools/build_word_sounds_word_audio.cjs');

const scratch = mkdtempSync(join(tmpdir(), 'ws-word-audio-recipe-'));
afterAll(() => { rmSync(scratch, { recursive: true, force: true }); });

const RATE = 24000;
const wavOf = (samples) => tool.pcmToWav(Float32Array.from(samples), RATE).wav;
// A made-up take: quiet, then stretches of tone (or noise) with soft edges, each { at, seconds, level, kind }.
function take(total, pieces) {
  const out = new Float32Array(Math.round(total * RATE));
  let seed = 7;
  const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
  for (const { at, seconds, level, kind = 'tone' } of pieces) {
    const from = Math.round(at * RATE), count = Math.round(seconds * RATE), ramp = Math.round(0.01 * RATE);
    for (let i = 0; i < count && from + i < out.length; i++) {
      const edge = Math.min(1, i / ramp, (count - 1 - i) / ramp);
      out[from + i] += level * edge * (kind === 'noise' ? noise() : Math.sin(2 * Math.PI * 220 * i / RATE));
    }
  }
  return wavOf(out);
}
// "Here is the word..." (0.2 to 0.9 s), a pause, then the word (with a breathy start) and a quiet end.
const sentence = ({ gap = 0.2, word = 0.45, bridge = 0 } = {}) => take(0.9 + gap + word + 0.4, [
  { at: 0.2, seconds: 0.7, level: 0.24 },
  ...(bridge ? [{ at: 0.9, seconds: gap, level: bridge, kind: 'noise' }] : []),
  { at: 0.9 + gap, seconds: 0.05, level: 0.012, kind: 'noise' },
  { at: 0.95 + gap, seconds: word - 0.05, level: 0.22 },
]);

describe('the options', () => {
  it('leave the bank recipe exactly as it was when none is given', () => {
    const options = tool.parseArgs([]);
    expect(tool.recipeOf(options)).toBe(null);
    expect(tool.engineMeta(options)).toBe(tool.ENGINE);
    expect(options).toMatchObject({ dtype: 'q8', carrier: '', trim: 'bank', loudness: null, bitrate: 48, bareFallback: true });
  });

  it('--recipe sentence sets every part, a part given on its own wins, and the store says how it was made', () => {
    const options = tool.parseArgs(['--recipe', 'sentence', '--out', scratch, '--bitrate', '64']);
    expect(options).toMatchObject({ dtype: 'fp32', carrier: 'Here is the word... {word}.', carrierRetry: 'The word is... {word}.', trim: 'gentle', loudness: -20, bitrate: 64 });
    const meta = tool.engineMeta(options);
    expect(meta.engine).toBe('kokoro-js@1.2.1 / onnx-community/Kokoro-82M-v1.0-ONNX (fp32, wasm)');
    expect(meta.post).toMatch(/^carrier "Here is the word\.\.\. \{word\}\." then "The word is\.\.\. \{word\}\." cut at the pause/);
    expect(meta.post).toMatch(/trim\(0\.3% peak, 60ms\/120ms margins, 5ms\/30ms fades\) \+ loudness -20 LUFS .* \+ ffmpeg libopus 64kbps mono webm$/);
    expect(meta.voice).toBe(tool.ENGINE.voice);
  });

  it('refuses what does not fit, and never writes another recipe into the repo store by default', () => {
    expect(() => tool.parseArgs(['--recipe', 'sentence'])).toThrow(/needs --out/);
    expect(() => tool.parseArgs(['--dtype', 'fp32'])).toThrow(/needs --out/);
    expect(() => tool.parseArgs(['--recipe', 'loud', '--out', scratch])).toThrow(/--recipe is one of sentence/);
    expect(() => tool.parseArgs(['--dtype', 'q4', '--out', scratch])).toThrow(/--dtype is one of q8, fp16, fp32/);
    expect(() => tool.parseArgs(['--carrier', 'The word is', '--out', scratch])).toThrow(/needs \{word\} once/);
    expect(() => tool.parseArgs(['--carrier-retry', 'The word is... {word}.', '--out', scratch])).toThrow(/needs --carrier/);
    expect(() => tool.parseArgs(['--trim', 'hard', '--out', scratch])).toThrow(/--trim is bank or gentle/);
    expect(() => tool.parseArgs(['--loudness', 'loud', '--out', scratch])).toThrow(/--loudness is a target in LUFS/);
    expect(() => tool.parseArgs(['--bitrate', '320', '--out', scratch])).toThrow(/--bitrate is 24 to 128/);
  });

  it('a store keeps one recipe: clips made another way are not mixed in', () => {
    const dir = join(scratch, 'one-recipe');
    const bank = tool.openStore(dir, { freeBytes: () => 50 * 1024 ** 3 });
    bank.add('bat', tool.URI_PREFIX + Buffer.alloc(900, 1).toString('base64'));
    bank.flush();
    const meta = tool.engineMeta(tool.parseArgs(['--recipe', 'sentence', '--out', dir]));
    expect(() => tool.openStore(dir, { meta, textForm: 'carrier' })).toThrow(/made with another recipe/);
    expect(tool.openStore(dir).count()).toBe(1);
  });
});

describe('the gentle trim', () => {
  // A breathy start (noise up to 0.75% of the peak, under the bank's 1% floor) and a soft ending (0.6%).
  const breathy = () => take(1.2, [{ at: 0.3, seconds: 0.06, level: 0.0015, kind: 'noise' }, { at: 0.36, seconds: 0.4, level: 0.2 }, { at: 0.76, seconds: 0.06, level: 0.0012, kind: 'noise' }]);

  it('keeps a breathy start and a soft end that the bank trim cuts, with 60 ms / 120 ms of quiet around them', () => {
    const raw = breathy(), bank = tool.trimWav(raw), gentle = tool.gentleTrim(raw);
    expect(bank.trimmedLeadingSeconds).toBeGreaterThan(0.32);
    expect(gentle.first / RATE).toBeLessThan(0.31);
    expect(gentle.last / RATE).toBeGreaterThan(0.8);
    expect((gentle.first - gentle.start) / RATE).toBeCloseTo(0.06, 3);
    expect((gentle.end - 1 - gentle.last) / RATE).toBeCloseTo(0.12, 3);
    expect(gentle.samples.length * 2 + 44).toBe(gentle.wav.length);
    // The fades touch only the kept quiet: the word's own first and last louder samples are untouched.
    expect(Math.abs(gentle.float[gentle.first - gentle.start])).toBeCloseTo(Math.abs(tool.readPcm(raw).samples[gentle.first]), 6);
    expect(tool.checkClip(gentle, 3, tool.RECIPE_GATES).failures).toEqual([]);
  });
});

describe('the cut at the pause', () => {
  it('cuts the word out at a clear pause, with its breathy start and none of the sentence', () => {
    const cut = tool.cutCarrier(sentence(), { bareSeconds: 0.5 });
    expect(cut.failures).toEqual([]);
    expect(cut.ok).toBe(true);
    expect(cut.wordSeconds).toBeGreaterThan(0.44);
    expect(cut.wordSeconds).toBeLessThan(0.47);
    expect(cut.gap.seconds).toBeGreaterThan(0.17);
    expect(cut.beforeSeconds).toBeCloseTo(0.06, 2);
    // The clip starts after the sentence has gone quiet.
    expect(cut.clip.start / RATE).toBeGreaterThan(0.9);
    expect(cut.clip.first / RATE).toBeLessThan(1.11);
    expect(tool.checkClip(cut.clip, 3, tool.RECIPE_GATES).failures).toEqual([]);
  });

  it('refuses a take with no clear pause, a pause where the sentence does not put it, or a cut far from the bare word', () => {
    expect(tool.cutCarrier(sentence({ gap: 0.04 }), { bareSeconds: 0.5 }).failures.join('; ')).toMatch(/no clear pause before the word/);
    expect(tool.cutCarrier(sentence(), { bareSeconds: 0.5, prefixSeconds: 1.3 }).failures.join('; ')).toMatch(/the pause is not where this sentence puts it/);
    expect(tool.cutCarrier(sentence(), { bareSeconds: 0.2 }).failures.join('; ')).toMatch(/the cut is 2\.\d\d x the bare word .*outside 0\.6 to 1\.8/);
    expect(tool.cutCarrier(sentence(), { bareSeconds: 1.0 }).failures.join('; ')).toMatch(/the cut is 0\.\d\d x the bare word/);
  });

  it('refuses two pauses that look alike, and sound from the sentence that runs into the word', () => {
    const twoPauses = take(2.4, [{ at: 0.2, seconds: 0.5, level: 0.2 }, { at: 0.88, seconds: 0.35, level: 0.2 }, { at: 1.4, seconds: 0.45, level: 0.18 }]);
    expect(tool.cutCarrier(twoPauses, { bareSeconds: 0.45 }).failures.join('; ')).toMatch(/two pauses look alike/);
    // A hiss up to 0.5% of the peak across the whole pause: quiet at -40 dB, but the sentence never stops at -50 dB.
    expect(tool.cutCarrier(sentence({ bridge: 0.001 }), { bareSeconds: 0.5 }).failures.join('; ')).toMatch(/the sentence runs into the word/);
  });

  it('reads the word\'s phonemes out of the sentence\'s', () => {
    expect(tool.wordPhonemes('hˈɪɹ ɪz ðə wˈɜːd... hˈæt.', 'hˈɪɹ ɪz ðə wˈɜːd...')).toBe('hˈæt');
    expect(tool.wordPhonemes('ðə wˈɜːd ɪz... ɹˈæbɪt.', 'ðə wˈɜːd ɪz...')).toBe('ɹˈæbɪt');
    expect(tool.carrierText('The word is... {word}.', 'map')).toBe('The word is... map.');
  });
});

describe('one loudness for every clip', () => {
  const sine = (seconds, amplitude, hz = 997, rate = 48000, phase = 0) => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amplitude * Math.sin(2 * Math.PI * hz * i / rate + phase));

  it('measures BS.1770 loudness: a full-scale 997 Hz tone is -3.01 LUFS at 48 kHz and at 24 kHz', () => {
    expect(tool.loudnessOf(sine(2, 1), 48000)).toBeCloseTo(-3.01, 1);
    expect(tool.loudnessOf(sine(2, 1, 997, 24000), 24000)).toBeCloseTo(-3.01, 1);
    expect(tool.loudnessOf(sine(2, 0.1), 48000)).toBeCloseTo(-23.01, 1);
    // Shorter than one 400 ms block: the stretch is its own block.
    expect(tool.loudnessOf(sine(0.3, 0.1), 48000)).toBeCloseTo(-23.01, 1);
  });

  it('finds the true peak between samples (4x oversampled)', () => {
    // A quarter-rate tone sampled 45 degrees off its crests: samples reach 0.707, the wave reaches 1.
    const tone = sine(0.1, 1, 6000, 24000, Math.PI / 4);
    expect(20 * Math.log10(Math.max(...tone.map(Math.abs)))).toBeCloseTo(-3.01, 1);
    expect(tool.truePeakDb(tone)).toBeGreaterThan(-0.6);
  });

  it('brings a clip to the target, lowering the gain when the true peak would pass the ceiling', () => {
    const quiet = tool.gentleTrim(take(1, [{ at: 0.3, seconds: 0.4, level: 0.1 }]));
    const done = tool.normalizeLoudness(quiet, { target: -20 });
    expect(done.ok).toBe(true);
    expect(done.limited).toBe(false);
    expect(tool.loudnessOf(Float32Array.from(done.samples, (v) => v / 32768), RATE, quiet.first - quiet.start, quiet.last + 1 - quiet.start)).toBeCloseTo(-20, 1);
    // A spiky clip: -20 LUFS would put its peak over -1.5 dBTP, so it stops short.
    const spiky = tool.gentleTrim(take(1, [{ at: 0.3, seconds: 0.4, level: 0.05 }, { at: 0.5, seconds: 0.02, level: 0.9 }]));
    const held = tool.normalizeLoudness(spiky, { target: -20 });
    expect(held.limited).toBe(true);
    expect(held.truePeakAfter).toBeCloseTo(-1.5, 5);
    expect(held.loudnessAfter).toBeLessThan(-20);
  });
});

describe('the --dtype engine path', () => {
  it('writes WAV exactly as the loader\'s worker does (its float32ToWav, run beside this one)', () => {
    const source = readFileSync('kokoro_tts_loader.js', 'utf8');
    const from = source.indexOf('const FADE_IN_MS = 2;'), to = source.indexOf('function concatWavBuffers', from);
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const loader = new Function(source.slice(from, to) + '\nreturn float32ToWav;')();
    let seed = 3;
    const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x3fffffff - 1) * 1.1; };
    for (const n of [0, 3, 50, 2400, 24000]) {
      const samples = Float32Array.from({ length: n }, random);
      expect(Buffer.from(tool.floatToWav(samples, 24000)).equals(Buffer.from(loader(samples, 24000)))).toBe(true);
    }
  });
});

describe('one word, with a pretend engine', () => {
  const carrier = 'Here is the word... {word}.', retry = 'The word is... {word}.';
  const bare = take(1.1, [{ at: 0.25, seconds: 0.05, level: 0.012, kind: 'noise' }, { at: 0.3, seconds: 0.45, level: 0.22 }]);
  function pretend(takes) {
    const calls = [];
    return { calls, synthTake: async (text) => { calls.push(text); const got = takes[text]; return typeof got === 'function' ? got() : got; }, synth: async () => { throw new Error('not used'); } };
  }
  const deps = (engine) => ({ engine, encode: (wav) => Buffer.concat([Buffer.from('webm'), wav.subarray(44, 44 + 1500)]), prefixSeconds: [0.7, 0.7], prefixPhonemes: ['hˈɪɹ ɪz ðə wˈɜːd...', 'ðə wˈɜːd ɪz...'] });
  const options = { carrier, carrierRetry: retry, trim: 'gentle', loudness: -20 };
  const entry = { word: 'hat', sounds: 3 };

  it('takes the word from the sentence when the cut is clean and the voice read it as it reads it alone', async () => {
    const engine = pretend({ hat: { wav: bare, phonemes: 'hˈæt' }, 'Here is the word... hat.': { wav: sentence(), phonemes: 'hˈɪɹ ɪz ðə wˈɜːd... hˈæt.' } });
    const voiced = await tool.voiceWordCarrier(entry, deps(engine), options, 0);
    expect(voiced.failures).toEqual([]);
    expect(voiced).toMatchObject({ ok: true, form: 'carrier', attempts: 2 });
    expect(voiced.cut.ratio).toBeGreaterThan(0.6);
    expect(voiced.measures.loudness).toBeCloseTo(-20, 5);
    expect(engine.calls).toEqual(['hat', 'Here is the word... hat.']);
  });

  it('tries the second sentence when the first has no clean cut, then the bare word; a different reading is refused', async () => {
    const second = pretend({ hat: { wav: bare, phonemes: 'hˈæt' }, 'Here is the word... hat.': { wav: sentence({ gap: 0.03 }), phonemes: 'hˈɪɹ ɪz ðə wˈɜːd... hˈæt.' },
      'The word is... hat.': { wav: sentence(), phonemes: 'ðə wˈɜːd ɪz... hˈæt.' } });
    const two = await tool.voiceWordCarrier(entry, deps(second), options, 0);
    expect(two).toMatchObject({ ok: true, form: 'carrier2', attempts: 3 });
    expect(two.failures.join('; ')).toMatch(/\(carrier\): no clear pause/);

    const misread = pretend({ hat: { wav: bare, phonemes: 'hˈæt' }, 'Here is the word... hat.': { wav: sentence(), phonemes: 'hˈɪɹ ɪz ðə wˈɜːd... hˈeɪt.' },
      'The word is... hat.': { wav: sentence({ gap: 0.03 }), phonemes: 'ðə wˈɜːd ɪz... hˈæt.' } });
    const fallback = await tool.voiceWordCarrier(entry, deps(misread), options, 0);
    expect(fallback).toMatchObject({ ok: true, form: 'bare' });
    expect(fallback.failures.join('; ')).toMatch(/read as \/hˈeɪt\/ in the sentence, \/hˈæt\/ alone/);

    const none = await tool.voiceWordCarrier(entry, deps(misread), Object.assign({}, options, { bareFallback: false }), 0);
    expect(none.ok).toBe(false);
  });

  it('uses earlier bare lengths when given, and voices the bare word only when it needs it', async () => {
    const engine = pretend({ 'Here is the word... hat.': { wav: sentence(), phonemes: 'hˈɪɹ ɪz ðə wˈɜːd... hˈæt.' } });
    engine.phonemes = async (words) => Object.fromEntries(words.map((word) => [word, 'hˈæt']));
    const voiced = await tool.voiceWordCarrier(entry, Object.assign(deps(engine), { bareSeconds: () => 0.5 }), options, 0);
    expect(voiced).toMatchObject({ ok: true, form: 'carrier' });
    expect(engine.calls).toEqual(['Here is the word... hat.']);
  });
});
