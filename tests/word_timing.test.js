// WordTiming — deterministic per-word karaoke timing (2026-07-20).
// Pure math over PCM: RMS envelope + syllable/punctuation-weighted allocation
// with valley snapping. These tests build SYNTHETIC speech (noise bursts
// separated by true silence) so the expected boundaries are known exactly.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let WT;

beforeAll(() => {
  global.window = global.window || {};
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'word_timing_module.js'), 'utf8'))(global.window);
  WT = global.window.AlloModules.WordTiming;
});

const SAMPLE_RATE = 24000;

// words: array of {ms, silenceAfterMs} — noise burst then silence.
function synthesize(words) {
  const chunks = [];
  let seed = 42;
  const rand = () => {
    // Deterministic LCG so runs are bit-identical.
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
  for (const word of words) {
    const speech = new Float32Array(Math.round((word.ms / 1000) * SAMPLE_RATE));
    for (let i = 0; i < speech.length; i++) speech[i] = rand() * 0.5;
    chunks.push(speech);
    chunks.push(new Float32Array(Math.round(((word.silenceAfterMs || 0) / 1000) * SAMPLE_RATE)));
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

describe('token weights (shared model with the overlay renderer)', () => {
  it('weights words by length and folds punctuation pauses into the following gap', () => {
    const model = WT.tokenWeights('Hello, world. Done');
    expect(model.parts).toEqual(['Hello,', ' ', 'world.', ' ', 'Done']);
    // gap after 'Hello,' = 1 char + comma bonus 3; gap after 'world.' = 1 + 5
    expect(model.weights).toEqual([6, 4, 6, 6, 4]);
    expect(model.totalWeight).toBe(26);
  });

  it('is deterministic', () => {
    expect(WT.tokenWeights('Same input.')).toEqual(WT.tokenWeights('Same input.'));
  });
});

describe('estimateFromChannel (synthetic PCM with known gaps)', () => {
  it('snaps word boundaries into the true silences', () => {
    // "one two three" — three 300ms bursts with 200ms silences between.
    const channelData = synthesize([
      { ms: 300, silenceAfterMs: 200 },
      { ms: 300, silenceAfterMs: 200 },
      { ms: 300, silenceAfterMs: 0 },
    ]);
    const mapping = WT.estimateFromChannel({ channelData, sampleRate: SAMPLE_RATE, sentence: 'one two three' });
    expect(mapping).toBeTruthy();
    // parts: ['one',' ','two',' ','three'] → boundary after 'one' (index 1)
    // must land inside the first silence [300ms, 500ms].
    const afterOne = mapping.boundaryMs[1];
    expect(afterOne).toBeGreaterThanOrEqual(280);
    expect(afterOne).toBeLessThanOrEqual(520);
    // boundary after 'two' (index 3) inside the second silence [800ms, 1000ms].
    const afterTwo = mapping.boundaryMs[3];
    expect(afterTwo).toBeGreaterThanOrEqual(780);
    expect(afterTwo).toBeLessThanOrEqual(1020);
    // Monotonic boundaries.
    for (let i = 1; i < mapping.boundaryMs.length; i++) {
      expect(mapping.boundaryMs[i]).toBeGreaterThanOrEqual(mapping.boundaryMs[i - 1]);
    }
  });

  it('is bit-identical across runs (deterministic)', () => {
    const channelData = synthesize([
      { ms: 250, silenceAfterMs: 150 },
      { ms: 400, silenceAfterMs: 0 },
    ]);
    const a = WT.estimateFromChannel({ channelData, sampleRate: SAMPLE_RATE, sentence: 'hi there' });
    const b = WT.estimateFromChannel({ channelData, sampleRate: SAMPLE_RATE, sentence: 'hi there' });
    expect(a).toEqual(b);
  });

  it('returns null on malformed input instead of throwing', () => {
    expect(WT.estimateFromChannel({})).toBe(null);
    expect(WT.estimateFromChannel({ channelData: new Float32Array(0), sampleRate: SAMPLE_RATE, sentence: 'x' })).toBe(null);
  });
});

describe('weightPctAtTime (drives the overlay sweep)', () => {
  it('is 0 before speech, 100 after, and monotonic through the clip', () => {
    const channelData = synthesize([
      { ms: 300, silenceAfterMs: 200 },
      { ms: 300, silenceAfterMs: 0 },
    ]);
    const mapping = WT.estimateFromChannel({ channelData, sampleRate: SAMPLE_RATE, sentence: 'alpha beta' });
    expect(WT.weightPctAtTime(mapping, 0)).toBe(0);
    expect(WT.weightPctAtTime(mapping, 999)).toBe(100);
    let last = -1;
    for (let t = 0; t <= 1.1; t += 0.02) {
      const pct = WT.weightPctAtTime(mapping, t);
      expect(pct).toBeGreaterThanOrEqual(last);
      last = pct;
    }
  });

  it('has the first word fully lit while inside the first silence gap', () => {
    const channelData = synthesize([
      { ms: 300, silenceAfterMs: 300 },
      { ms: 300, silenceAfterMs: 0 },
    ]);
    const mapping = WT.estimateFromChannel({ channelData, sampleRate: SAMPLE_RATE, sentence: 'alpha beta' });
    // Mid-gap (t=450ms): 'alpha' (weight 5 of 11) should be fully filled.
    const pct = WT.weightPctAtTime(mapping, 0.45);
    expect(pct).toBeGreaterThanOrEqual((5 / 11) * 100 - 1);
  });
});

describe('proportional fallback + boundary-event mapping', () => {
  it('proportionalMapping spans the full duration with the weight model', () => {
    const mapping = WT.proportionalMapping('one two', 1000);
    expect(mapping.boundaryMs[0]).toBe(0);
    expect(mapping.boundaryMs[mapping.boundaryMs.length - 1]).toBe(1000);
    expect(WT.weightPctAtTime(mapping, 1)).toBe(100);
  });

  it('weightPctAtCharIndex places the fill at the start of the spoken word', () => {
    // 'Hello, world. Done' — boundary event for 'world.' fires at charIndex 7.
    const pct = WT.weightPctAtCharIndex('Hello, world. Done', 7);
    // Cumulative weight before 'world.' = 6 (Hello,) + 4 (gap) = 10 of 26.
    expect(pct).toBeCloseTo((10 / 26) * 100, 5);
    expect(WT.weightPctAtCharIndex('Hello, world. Done', 0)).toBe(0);
  });
});
