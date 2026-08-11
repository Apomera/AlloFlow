import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// The Beat Pad sequencer computed its own next delay from stored state:
//
//   swingPct  = parseFloat(d.seqSwing || '0') / 100
//   nextDelay = baseMs * (1 +/- swingPct)
//   if (nextDelay < 10) nextDelay = 10          // safety floor
//
// A non-numeric swing makes swingPct NaN, and `NaN < 10` is FALSE, so the floor did
// not catch it. setTimeout(fn, NaN) coerces the delay to 0 and the tick re-arms as
// fast as the event loop allows — a frozen tab and a wall of audio. A bpm of 0 gave
// an infinite delay instead, silently stopping the sequencer.
//
// Neither needed a hostile user: the shared-beat URL loader (#beat=...) applied both
// values with no validation, and saved compositions were trusted the same way.

const sourcePath = 'stem_lab/stem_tool_music.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

function loadGuards() {
  const src = read().replace(/\r\n/g, '\n');
  const a = src.indexOf('          var BPM_MIN = 40');
  const b = src.indexOf('          var tempoBPM = safeBPM(d.seqBPM);');
  expect(a, 'tempo guard block').toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  const out = {};
  new Function('exports', src.slice(a, b) + `
    exports.safeBPM = safeBPM;
    exports.safeSwingFraction = safeSwingFraction;
    exports.BPM_MIN = BPM_MIN;
    exports.BPM_MAX = BPM_MAX;
    exports.SWING_MAX_PCT = SWING_MAX_PCT;
  `)(out);
  return out;
}

/** The tick's delay arithmetic, as it now stands. */
function nextDelay(g, seqBPM, seqSwing, step) {
  const baseMs = (60000 / g.safeBPM(seqBPM)) / 4;
  const swingPct = g.safeSwingFraction(seqSwing);
  let delay = step % 2 === 1 ? baseMs * (1 + swingPct) : baseMs * (1 - swingPct);
  if (!Number.isFinite(delay) || delay < 10) delay = 10;
  return delay;
}

describe('Beat Pad tempo — every input yields a usable delay', () => {
  const inputs = [
    ['normal', 120, '0'],
    ['swung', 120, '30'],
    ['swing "abc" (malformed share URL)', 120, 'abc'],
    ['swing empty string', 120, ''],
    ['swing 500 (out of range)', 120, '500'],
    ['swing negative', 120, '-40'],
    ['swing null', 120, null],
    ['bpm 0', 0, '0'],
    ['bpm empty string', '', '0'],
    ['bpm "fast"', 'fast', '0'],
    ['bpm negative', -60, '0'],
    ['bpm 1e9', 1e9, '0'],
    ['bpm null', null, '0'],
    ['bpm undefined', undefined, '0'],
    ['both malformed', 'x', 'y'],
  ];
  it.each(inputs)('%s produces a finite delay at or above the floor', (_label, bpm, swing) => {
    const g = loadGuards();
    for (const step of [0, 1]) {
      const delay = nextDelay(g, bpm, swing, step);
      expect(Number.isFinite(delay)).toBe(true);
      expect(delay).toBeGreaterThanOrEqual(10);
      // And not absurdly long, which would stall the sequencer instead.
      expect(delay).toBeLessThan(2000);
    }
  });

  it('would have produced NaN before the guards, for the two malformed cases', () => {
    // Pins the actual defect, so the guard cannot be removed as "unnecessary".
    const oldDelay = (seqBPM, seqSwing) => {
      const baseMs = (60000 / (seqBPM || 120)) / 4;
      const swingPct = parseFloat(seqSwing || '0') / 100;
      let delay = baseMs * (1 + swingPct);
      if (delay < 10) delay = 10;
      return delay;
    };
    expect(Number.isNaN(oldDelay(120, 'abc'))).toBe(true);
    expect(Number.isNaN(oldDelay('fast', '0'))).toBe(true);
    // NaN passed to setTimeout is treated as 0 — the tight loop.
    expect(Number.isNaN(oldDelay(120, 'abc')) && !(oldDelay(120, 'abc') < 10)).toBe(true);
  });
});

describe('Beat Pad tempo — clamps', () => {
  it('keeps safeBPM inside the advertised range', () => {
    const g = loadGuards();
    for (const v of [39, 40, 41, 120, 207, 208, 209, 5000, -1, 0, '150', '150.7', 'x', null, undefined, NaN, Infinity]) {
      const r = g.safeBPM(v);
      expect(Number.isFinite(r), 'safeBPM(' + String(v) + ')').toBe(true);
      expect(r).toBeGreaterThanOrEqual(g.BPM_MIN);
      expect(r).toBeLessThanOrEqual(g.BPM_MAX);
      expect(Number.isInteger(r)).toBe(true);
    }
  });

  it('keeps safeSwingFraction inside [0, SWING_MAX_PCT/100]', () => {
    const g = loadGuards();
    for (const v of ['0', '30', '75', '100', '-20', 'abc', '', null, undefined, NaN, Infinity, 1e9]) {
      const r = g.safeSwingFraction(v);
      expect(Number.isFinite(r), 'safeSwingFraction(' + String(v) + ')').toBe(true);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(g.SWING_MAX_PCT / 100);
    }
  });

  it('preserves valid values unchanged', () => {
    const g = loadGuards();
    expect(g.safeBPM(120)).toBe(120);
    expect(g.safeBPM(90)).toBe(90);
    expect(g.safeSwingFraction('0')).toBe(0);
    expect(g.safeSwingFraction('30')).toBeCloseTo(0.3, 10);
  });
});

describe('Beat Pad tempo — one range, everywhere', () => {
  it('drives both sliders and tap tempo from the shared bounds', () => {
    const source = read();
    // The Beat Pad slider allowed 60-200, the metronome slider 40-208 and tap tempo
    // clamped to 60-200, so a tempo set in one place could sit outside another's range.
    expect((source.match(/min: BPM_MIN, max: BPM_MAX/g) || []).length).toBe(2);
    expect(source).not.toMatch(/min: 60, max: 200/);
    expect(source).toMatch(/upd\('seqBPM', safeBPM\(60000 \/ avg\)\)/);
    expect(source).not.toMatch(/Math\.max\(60, Math\.min\(200/);
  });

  it('sanitises at the point of use, not only at the inputs', () => {
    const source = read();
    // Saved compositions and shared URLs both write straight into tool state, so the
    // tick itself has to be safe regardless of how the value got there.
    expect(source).toMatch(/var bpm = safeBPM\(d\.seqBPM\);/);
    expect(source).toMatch(/var swingPct = safeSwingFraction\(d\.seqSwing\);/);
    expect(source).toMatch(/if \(!isFinite\(nextDelay\) \|\| nextDelay < 10\) nextDelay = 10;/);
  });

  it('validates the shared-beat payload before it reaches stored state', () => {
    const source = read();
    expect(source).toMatch(/if \(obj\.g && typeof obj\.g === 'object' && !Array\.isArray\(obj\.g\)\)/);
    expect(source).toMatch(/if \(Array\.isArray\(obj\.m\)\)/);
    expect(source).toMatch(/upd\('seqBPM', safeBPM\(obj\.b\)\)/);
    expect(source).toMatch(/safeSwingFraction\(obj\.s\)/);
  });
});

describe('Music Synthesizer — quiz feedback is translatable', () => {
  it('routes ternary-shaped toast messages through the translator too', () => {
    const source = read();
    // These start with a condition rather than a literal, so a scanner that only
    // inspects the first token of the argument reports them as already done.
    for (const key of ['quiz_correct', 'quiz_answer_was', 'chord_correct', 'chord_it_was',
      'dictation_perfect', 'dictation_partial', 'dictation_none']) {
      expect(source, key).toContain('stem.music.' + key);
    }
    expect(source).not.toMatch(/addToast\(correct \? '\\u2705 Correct!'/);
    expect(source).not.toMatch(/addToast\(c === 4 \? '\\u2705 Perfect! All 4 notes!'/);
  });

  it('announces dictation results to screen readers, not just as a toast', () => {
    const source = read();
    expect(source).toMatch(/if \(announceToSR\) announceToSR\(dictMsg\);/);
  });
});
