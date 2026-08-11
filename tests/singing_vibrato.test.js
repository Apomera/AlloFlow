import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Vibrato Lab had two measurement problems, both invisible without measuring.
//
// 1. The tile showed `depth` as "N¢" beside "Ideal: 30-80¢", but depth was
//    2 * RMS(deviation). For a sine that is sqrt(2) * amplitude, i.e. 0.707 of the
//    peak-to-peak excursion — so the number displayed was 29% below the width it
//    claimed to be, and "Vibrato width exceeds 100 cents" actually fired at 141.
//
// 2. Rate came from zero-crossing counting with no check that the pitch history was
//    sampled fast enough. At 12 samples/sec a real 6 Hz vibrato reported 1.0 Hz, so a
//    student with healthy vibrato on a slow device was told they had a wobble.

const sourcePath = 'stem_lab/stem_tool_singing.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

function loadVibrato() {
  const src = read().replace(/\r\n/g, '\n');
  const a = src.indexOf('  // Vibrato extent is conventionally the peak-to-peak');
  const b = src.indexOf('\n  // ═', a);
  expect(a, 'vibrato block').toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  const out = {};
  new Function('exports', src.slice(a, b) + `
    exports.analyzeVibrato = analyzeVibrato;
    exports.MIN_HZ = VIBRATO_MIN_SAMPLE_HZ;
    exports.RATIO = VIBRATO_RMS_TO_EXTENT;
    exports.VIB = {
      straight: VIB_STRAIGHT_MAX, healthyMin: VIB_HEALTHY_MIN,
      healthyMax: VIB_HEALTHY_MAX, wide: VIB_WIDE_MAX, developing: VIB_DEVELOPING_MIN
    };
  `)(out);
  return out;
}

/** Sinusoidal vibrato; amplitudeCents is the +/- excursion, so peak-to-peak is 2x. */
function vibrato(rateHz, amplitudeCents, seconds, hz, centreMidi = 60) {
  const out = [];
  const n = Math.round(seconds * hz);
  for (let i = 0; i < n; i += 1) {
    const tSec = i / hz;
    out.push({
      midi: centreMidi + (amplitudeCents * Math.sin(2 * Math.PI * rateHz * tSec)) / 100,
      time: 10000 + tSec * 1000,
    });
  }
  return out;
}

describe('Vibrato Lab — width is a true peak-to-peak measurement', () => {
  const amps = [10, 15, 25, 50, 70, 90];
  it.each(amps)('reports +/-%i cents as its full peak-to-peak width', (amp) => {
    const { analyzeVibrato } = loadVibrato();
    const r = analyzeVibrato(vibrato(6, amp, 3, 25));
    expect(r.extentCents).toBeCloseTo(amp * 2, 0);
  });

  it('is scaled from RMS, so one bad frame moves it far less than max-minus-min', () => {
    const { analyzeVibrato } = loadVibrato();
    const clean = vibrato(6, 50, 3, 25);          // true peak-to-peak 100 cents
    const spiked = clean.slice();
    spiked[10] = { midi: spiked[10].midi + 6, time: spiked[10].time };  // +600 cents

    const rmsBased = analyzeVibrato(spiked).extentCents;
    // What a max-minus-min estimator would have reported on the same data.
    const devs = spiked.map((h) => h.midi);
    const mean = devs.reduce((x, y) => x + y, 0) / devs.length;
    const peakToPeak = (Math.max(...devs) - Math.min(...devs)) * 100;

    // The outlier still pulls the RMS estimate up — squaring guarantees that — but
    // by roughly half as much as taking the extremes would.
    expect(peakToPeak).toBeGreaterThan(600);
    expect(rmsBased).toBeLessThan(peakToPeak * 0.5);
    expect(Number.isFinite(mean)).toBe(true);

    // And on clean input the two agree, so the robustness is not bought with bias.
    expect(analyzeVibrato(clean).extentCents).toBeCloseTo(100, 0);
  });

  it('keeps the exact band boundaries the old depth units expressed', () => {
    const { VIB, RATIO } = loadVibrato();
    // Converting the unit must not change which singing passes which band.
    expect(RATIO).toBeCloseTo(2 * Math.SQRT2, 10);
    expect(VIB.straight).toBeCloseTo(10 * Math.SQRT2, 6);
    expect(VIB.developing).toBeCloseTo(15 * Math.SQRT2, 6);
    expect(VIB.healthyMin).toBeCloseTo(30 * Math.SQRT2, 6);
    expect(VIB.healthyMax).toBeCloseTo(80 * Math.SQRT2, 6);
    expect(VIB.wide).toBeCloseTo(100 * Math.SQRT2, 6);
  });

  it('quotes the thresholds it tests, in the prose the student reads', () => {
    const source = read();
    // "exceeds 100 cents" fired at 141, and the coaching text said 30-80 while the
    // tested band was 42-113.
    expect(source).not.toContain('Vibrato width exceeds 100 cents');
    expect(source).toContain('exceeds 140 cents peak to peak');
    expect(source).not.toContain('Aim for 5-7 Hz rate and 30-80 cents depth');
    expect(source).toContain('42-113 cent width');
    expect(source).toContain('Ideal: 42-113');
  });
});

describe('Vibrato Lab — rate is only reported when it can be trusted', () => {
  it('recovers the rate accurately once sampling is fast enough', () => {
    const { analyzeVibrato } = loadVibrato();
    for (const trueHz of [4, 5, 6, 7, 8]) {
      const r = analyzeVibrato(vibrato(trueHz, 50, 3, 25));
      expect(Math.abs(r.rate - trueHz) / trueHz, trueHz + ' Hz at 25 samples/sec').toBeLessThan(0.1);
      expect(r.reliable).toBe(true);
    }
  });

  it('never flags a reading reliable while the rate is actually wrong', () => {
    const { analyzeVibrato } = loadVibrato();
    for (const hz of [8, 10, 12, 15, 17, 18, 20, 25, 40, 60]) {
      const r = analyzeVibrato(vibrato(6, 50, 3, hz));
      const accurate = Math.abs(r.rate - 6) / 6 <= 0.15;
      if (r.reliable) expect(accurate, hz + ' samples/sec claimed reliable but read ' + r.rate.toFixed(1)).toBe(true);
    }
  });

  it('withholds reliability at the sampling rates that aliased', () => {
    const { analyzeVibrato } = loadVibrato();
    // A real 6 Hz vibrato read as 1.0 Hz at 12 samples/sec — "Too Slow (Wobble)".
    const r = analyzeVibrato(vibrato(6, 50, 3, 12));
    expect(r.reliable).toBe(false);
  });

  it('reports its own sampling rate', () => {
    const { analyzeVibrato } = loadVibrato();
    for (const hz of [15, 25, 40]) {
      expect(analyzeVibrato(vibrato(6, 50, 3, hz)).sampleHz).toBeCloseTo(hz, 0);
    }
  });

  it('returns finite fields for degenerate input', () => {
    const { analyzeVibrato } = loadVibrato();
    const cases = [
      null,
      undefined,
      [],
      vibrato(6, 50, 0.2, 25),                                                 // too short
      Array.from({ length: 40 }, (_, i) => ({ midi: 60, time: 10000 + i * 40 })), // dead steady
      Array.from({ length: 40 }, () => ({ midi: 60, time: 10000 })),           // zero duration
    ];
    for (const h of cases) {
      const r = analyzeVibrato(h);
      expect(Number.isFinite(r.rate)).toBe(true);
      expect(Number.isFinite(r.extentCents)).toBe(true);
      expect(Number.isFinite(r.sampleHz)).toBe(true);
      expect(r.rate).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Vibrato Lab — the achievement needs a trustworthy reading', () => {
  it('gates the healthy-vibrato award on reliability and on the new unit', () => {
    const source = read();
    const at = source.indexOf('achievedHealthyVibrato && result.reliable');
    expect(at, 'award should require a reliable reading').toBeGreaterThan(-1);
    const block = source.slice(at, at + 320);
    expect(block).toMatch(/result\.extentCents >= VIB_HEALTHY_MIN/);
    expect(block).toMatch(/result\.extentCents <= VIB_HEALTHY_MAX/);
    // The old gate compared result.depth against the pre-conversion numbers.
    expect(source).not.toMatch(/result\.depth >= 30 && result\.depth <= 80/);
  });

  it('shows a measuring state instead of a diagnosis when sampling is too sparse', () => {
    const source = read();
    expect(source).toContain('stem.singing.vibrato_measuring');
    expect(source).toContain('stem.singing.vibrato_low_sample_rate');
    // The rate tile must not print a number it does not trust.
    expect(source).toMatch(/vibratoReliable \? rate\.toFixed\(1\) \+ ' Hz' : '\\u2014'/);
  });

  it('drives every quality band from the peak-to-peak value', () => {
    const source = read();
    for (const pattern of [/depth < 10/, /depth > 100/, /depth > 10\b/, /depth >= 30 && depth <= 80/, /depth >= 15 && depth <= 100/]) {
      expect(source, 'stale depth-based band: ' + pattern).not.toMatch(pattern);
    }
    expect(source).toMatch(/extentCents < VIB_STRAIGHT_MAX/);
    expect(source).toMatch(/extentCents > VIB_WIDE_MAX/);
    expect(source).toMatch(/extentCents >= VIB_HEALTHY_MIN && extentCents <= VIB_HEALTHY_MAX/);
  });
});
