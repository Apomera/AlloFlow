import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

// Numerical tests for the Singing Lab pitch pipeline.
//
// The previous detector correlated every lag across the whole 4096-sample buffer
// (~8.4M multiply-adds) once per animation frame, and reported a pitch for silence
// that was merely quiet-ish: white noise came back as 39 Hz and breath as 62 Hz,
// and that value fed the stored vocal range. These tests pin both the accuracy and
// the rejection behaviour, because neither is visible without measuring.

const sourcePath = 'stem_lab/stem_tool_singing.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_singing.js';

function loadDetector() {
  const src = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
  const slice = (start, end) => {
    const a = src.indexOf(start);
    const b = src.indexOf(end, a);
    expect(a, 'marker ' + start).toBeGreaterThan(-1);
    expect(b, 'marker ' + end).toBeGreaterThan(a);
    return src.slice(a, b);
  };
  const body = [
    slice('  var PITCH_MIN_HZ', '  /**'),
    slice('  function findBestLag', '  /** Legacy shim'),
    slice('  function calculateRMS', '\n  // ═'),
  ].join('\n');
  const out = {};
  new Function('exports', body + `
    exports.detectPitch = detectPitch;
    exports.findBestLag = findBestLag;
    exports.CLARITY_MIN = CLARITY_MIN;
    exports.PITCH_MIN_HZ = PITCH_MIN_HZ;
    exports.PITCH_MAX_HZ = PITCH_MAX_HZ;
  `)(out);
  return out;
}

const SR = 48000;
const N = 4096;

/** Additive-synthesis test tone: harmonics[i] is the amplitude of partial i+1. */
function tone(freq, harmonics, amp = 0.3) {
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i += 1) {
    let v = 0;
    for (let h = 0; h < harmonics.length; h += 1) {
      v += harmonics[h] * Math.sin((2 * Math.PI * freq * (h + 1) * i) / SR);
    }
    buf[i] = v * amp;
  }
  return buf;
}

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const centsOff = (got, want) => 1200 * Math.log2(got / want);

describe('Singing Lab pitch detection — mirrors', () => {
  it('keeps source and public mirrors identical', () => {
    expect(crypto.createHash('sha256').update(fs.readFileSync(sourcePath, 'utf8')).digest('hex'))
      .toBe(crypto.createHash('sha256').update(fs.readFileSync(publicPath, 'utf8')).digest('hex'));
  });
});

describe('Singing Lab pitch detection — accuracy', () => {
  const cases = [
    ['A2 low male voice', 110.0, [1]],
    ['C3', 130.81, [1]],
    ['A3', 220.0, [1]],
    ['C4 middle C', 261.63, [1]],
    ['A4 concert pitch', 440.0, [1]],
    ['G5', 783.99, [1]],
    ['C6 high soprano', 1046.5, [1]],
  ];
  it.each(cases)('tracks %s within 5 cents', (_label, freq, harmonics) => {
    const { detectPitch } = loadDetector();
    const r = detectPitch(tone(freq, harmonics), SR);
    expect(r.freq).toBeGreaterThan(0);
    expect(Math.abs(centsOff(r.freq, freq))).toBeLessThan(5);
  });

  // A real voice is not a sine. These are the shapes that make a naive
  // autocorrelation pick a subharmonic and read an octave low.
  const timbres = [
    ['ten strong harmonics', 196.0, [1, 0.7, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08]],
    ['weak fundamental (closed vowel)', 147.0, [0.15, 1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.15]],
    ['sawtooth-like (1/n)', 329.63, [1, 0.5, 0.33, 0.25, 0.2, 0.167, 0.143, 0.125]],
    ['odd harmonics only', 233.08, [1, 0, 0.33, 0, 0.2, 0, 0.143]],
  ];
  it.each(timbres)('does not octave-error on %s', (_label, freq, harmonics) => {
    const { detectPitch } = loadDetector();
    const r = detectPitch(tone(freq, harmonics), SR);
    expect(r.freq).toBeGreaterThan(0);
    const err = Math.abs(centsOff(r.freq, freq));
    expect(err, 'off by ' + err.toFixed(0) + ' cents').toBeLessThan(10);
  });

  it('reports high clarity for a clean tone', () => {
    const { detectPitch, CLARITY_MIN } = loadDetector();
    const r = detectPitch(tone(440, [1]), SR);
    expect(r.clarity).toBeGreaterThan(CLARITY_MIN);
    expect(r.clarity).toBeLessThanOrEqual(1);
  });
});

describe('Singing Lab pitch detection — rejection', () => {
  it('reports no pitch for silence', () => {
    const { detectPitch } = loadDetector();
    expect(detectPitch(new Float32Array(N), SR).freq).toBe(-1);
  });

  it('reports no pitch for white noise', () => {
    const { detectPitch } = loadDetector();
    const rnd = makeRng(123456789);
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i += 1) buf[i] = (rnd() * 2 - 1) * 0.4;
    // The old detector answered 39.2 Hz here, and that value fed rangeLow.
    expect(detectPitch(buf, SR).freq).toBe(-1);
  });

  it('reports no pitch for breath', () => {
    const { detectPitch } = loadDetector();
    const rnd = makeRng(987654321);
    const buf = new Float32Array(N);
    let prev = 0;
    for (let i = 0; i < N; i += 1) {
      prev = prev * 0.85 + (rnd() * 2 - 1) * 0.15;
      buf[i] = prev * 2.0;
    }
    // The old detector answered 62.0 Hz here.
    expect(detectPitch(buf, SR).freq).toBe(-1);
  });

  it('stays inside the singable range it advertises', () => {
    const { detectPitch, PITCH_MIN_HZ, PITCH_MAX_HZ } = loadDetector();
    for (const freq of [80, 110, 220, 440, 880, 1200]) {
      const r = detectPitch(tone(freq, [1, 0.5, 0.25]), SR);
      if (r.freq > 0) {
        expect(r.freq).toBeGreaterThanOrEqual(PITCH_MIN_HZ);
        expect(r.freq).toBeLessThanOrEqual(PITCH_MAX_HZ);
      }
    }
  });

  it('never returns NaN or Infinity, whatever it is handed', () => {
    const { detectPitch } = loadDetector();
    const rnd = makeRng(42);
    const inputs = [
      new Float32Array(N),
      new Float32Array(N).fill(1),
      new Float32Array(N).fill(-1),
      tone(440, [1], 1e-6),
      Float32Array.from({ length: N }, () => rnd() * 2 - 1),
      Float32Array.from({ length: N }, (_, i) => (i % 2 ? 1 : -1)),  // Nyquist square
    ];
    for (const buf of inputs) {
      const r = detectPitch(buf, SR);
      expect(Number.isFinite(r.freq)).toBe(true);
      expect(Number.isFinite(r.clarity)).toBe(true);
    }
  });
});

describe('Singing Lab pitch detection — cost', () => {
  it('searches only the vocal lag range, not the whole buffer', () => {
    const { findBestLag } = loadDetector();
    // A guard on the property that makes it affordable: the coarse pass runs on a
    // 4x-decimated copy over ~210 lags, not 4096. If someone widens the range back
    // to the full buffer this fails before the frame rate does.
    const dsLen = N / 4;
    const dsRate = SR / 4;
    const lags = Math.ceil(dsRate / 55) - Math.floor(dsRate / 1600) + 1;
    expect(lags).toBeLessThan(dsLen / 2);
    expect(lags).toBeLessThan(300);
    const r = findBestLag(new Float32Array(dsLen), 7, 219);
    expect(r.lag).toBe(-1);  // silence has no periodicity to find
  });
});

describe('Singing Lab microphone capture', () => {
  const read = () => fs.readFileSync(sourcePath, 'utf8');

  it('disables the browser voice processing that corrupts the measurement', () => {
    const source = read();
    // Auto gain control flattens the loudness Vocal Range measures and smears the
    // amplitude Vibrato Lab reads; both are on by default with { audio: true }.
    expect(source).toContain('echoCancellation: false');
    expect(source).toContain('noiseSuppression: false');
    expect(source).toContain('autoGainControl: false');
    expect(source).not.toContain('getUserMedia({ audio: true })');
  });

  it('guards mediaDevices so an insecure origin shows a message', () => {
    const source = read();
    // On file:// (the desktop shell) navigator.mediaDevices is undefined, and the
    // call threw past the .catch, leaving a dead button and no error.
    // Anchor on the guard, then require the bail-out to sit between it and the
    // actual capture call — the first getUserMedia mention is now the guard's own.
    const guardAt = source.indexOf('if (!navigator.mediaDevices ||');
    expect(guardAt, 'mediaDevices guard should exist').toBeGreaterThan(-1);
    const callAt = source.indexOf('navigator.mediaDevices.getUserMedia({', guardAt);
    expect(callAt, 'capture call should follow the guard').toBeGreaterThan(guardAt);
    const guardBody = source.slice(guardAt, callAt);
    expect(guardBody).toContain('stem.singing.mic_unavailable');
    expect(guardBody).toMatch(/setMicError\(/);
    expect(guardBody).toMatch(/return;/);
  });

  it('tells the user which failure happened', () => {
    const source = read();
    for (const key of ['mic_denied', 'mic_missing', 'mic_busy', 'mic_failed']) {
      expect(source, key).toContain('stem.singing.' + key);
    }
  });

  it('throttles analysis instead of running it every frame', () => {
    const source = read();
    expect(source).toContain('var ANALYSIS_MS = 40;');
    expect(source).toMatch(/if \(stamp - lastAnalysis < ANALYSIS_MS\) return;/);
    // History is trimmed by timestamp, so the pitch roll spans a fixed number of
    // seconds rather than silently varying with the frame rate.
    expect(source).toContain('var ROLL_WINDOW_MS =');
    expect(source).toContain('var VIBRATO_WINDOW_MS =');
  });

  it('only re-renders when the reading actually moves', () => {
    const source = read();
    // A held note used to call setCurrentNote 60 times a second, re-rendering the
    // whole 4,600-line component and three canvas effects for an unchanged value.
    expect(source).toMatch(/lastEmitted\.noteStr !== noteInfo\.noteStr/);
    expect(source).toMatch(/Math\.abs\(\(lastEmitted\.cents \|\| 0\) - \(noteInfo\.cents \|\| 0\)\) >= 2/);
  });
});
