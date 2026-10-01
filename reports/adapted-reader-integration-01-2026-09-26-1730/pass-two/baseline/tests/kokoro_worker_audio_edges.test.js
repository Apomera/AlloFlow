// KOKORO WAV EDGES, AND THE PROBE THAT MEASURES THEM.
//
// Aaron heard a /t/ or /d/ at the end of "hon" and "bun" from Kokoro, and asked
// whether the app was causing it. Both words end in /n/, which is the tell: the
// model can finish while the nasal is still voiced at full amplitude, and the
// worker wrote those samples straight to PCM. A step at the buffer edge is a
// click, and a click right after a nasal is heard as a stop release. In a
// phonemic-awareness activity that is not cosmetic — a child asked for the last
// sound in "bun" can hear the wrong one.
//
// ★ The worker body lives inside a template literal, so `node --check` on the
// loader says NOTHING about it and neither does any deploy gate. This file
// parses that string and runs the real function out of it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const LOADER = read('kokoro_tts_loader.js');

/** Pull the worker body out of the template literal it is defined in. */
function workerBody(src) {
  const marker = 'const WORKER_SOURCE = `';
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('WORKER_SOURCE not found — did the loader change shape?');
  const open = start + marker.length - 1;
  let i = open + 1;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') return src.slice(open + 1, i);
    i++;
  }
  throw new Error('unterminated WORKER_SOURCE template literal');
}

/** Load the worker body with the globals it touches at definition time. */
function loadWorker(src) {
  const body = workerBody(src).replace(/\$\{[^}]*\}/g, '0');
  const harness = `
    const self = {
      addEventListener: function(){}, postMessage: function(){}, onmessage: null,
      fetch: function(){ return Promise.reject(new Error('no fetch in test')); },
    };
    const importScripts = function(){};
    ${body}
    ;return { float32ToWav, concatWavBuffers, splitSentences };`;
  // eslint-disable-next-line no-new-func
  return new Function(harness)();
}

const SR = 24000;
const lastSampleOf = (wav, n) => new DataView(wav).getInt16(44 + (n - 1) * 2, true);
const sampleAt = (wav, i) => new DataView(wav).getInt16(44 + i * 2, true);

describe('the worker source is valid JavaScript', () => {
  it('parses, which node --check on the loader cannot tell you', () => {
    expect(() => loadWorker(LOADER)).not.toThrow();
  });

  it('the mirror is the same file', () => {
    expect(read('desktop/web-app/public/kokoro_tts_loader.js')).toBe(LOADER);
  });
});

describe('a clip cannot end on a step', () => {
  const { float32ToWav } = loadWorker(LOADER);

  it('a clip that ends at full amplitude is ramped to zero', () => {
    // The worst case, and the one a word-final nasal actually produces.
    const n = Math.round(SR * 0.3);
    const wav = float32ToWav(new Float32Array(n).fill(0.9), SR);
    expect(lastSampleOf(wav, n)).toBe(0);
  });

  it('the ramp does not reach the middle of the word', () => {
    // A fade that ate into the vowel would fix the click by damaging the word.
    const n = Math.round(SR * 0.3);
    const wav = float32ToWav(new Float32Array(n).fill(0.9), SR);
    expect(Math.abs(sampleAt(wav, Math.floor(n / 2)))).toBeGreaterThan(29000);
  });

  it('the fade-in is shorter than the fade-out', () => {
    // A word beginning with a stop carries its burst in the first few
    // milliseconds; softening that would trade one wrong sound for another.
    const n = Math.round(SR * 0.3);
    const wav = float32ToWav(new Float32Array(n).fill(1), SR);
    const at = (ms) => Math.abs(sampleAt(wav, Math.round(SR * ms / 1000)));
    const fromEnd = (ms) => Math.abs(sampleAt(wav, n - 1 - Math.round(SR * ms / 1000)));
    // 3 ms in, the ramp is done; 3 ms from the end it is still ramping.
    expect(at(3)).toBeGreaterThan(32000);
    expect(fromEnd(3)).toBeLessThan(20000);
  });

  it('survives clips too short to fade', () => {
    for (const n of [1, 2, 3, 4]) {
      const wav = float32ToWav(new Float32Array(n).fill(0.5), SR);
      expect(wav.byteLength).toBe(44 + n * 2);
    }
  });

  it('does not silence a short-but-real clip', () => {
    // 40 ms is longer than both ramps put together; the body must survive.
    const n = Math.round(SR * 0.04);
    const wav = float32ToWav(new Float32Array(n).fill(0.8), SR);
    expect(Math.abs(sampleAt(wav, Math.floor(n / 2)))).toBeGreaterThan(20000);
  });
});

describe('cached clips cannot mask the change', () => {
  it('the cache version was bumped past v2', () => {
    // A clip cached under the old key would keep its click for the life of the
    // page, and the fix would look like it did nothing.
    expect(LOADER).toMatch(/'kokoro-v3'/);
    expect(LOADER).not.toMatch(/'kokoro-v2'/);
  });
});

describe('the tail probe measures what it claims to', () => {
  // The probe is the instrument for deciding whether a burst is real. An
  // instrument that flags everything, or nothing, is worse than none.
  const HTML = read('dev-tools/kokoro_tail_probe.html');
  // From the constants, so TAIL_MS is the probe's real value and not a copy
  // that can drift away from it.
  const slice = HTML.slice(HTML.indexOf('const SR_FALLBACK'), HTML.indexOf('function drawTail'));
  // eslint-disable-next-line no-new-func
  const { measure } = new Function(`${slice}\nreturn { measure };`)();

  const tone = (n, amp) => Float32Array.from({ length: n }, (_, i) => amp(i) * Math.sin(i * 0.35));

  it('a clean decay does not flag', () => {
    const n = Math.round(SR * 0.4);
    const decayStart = Math.round(SR * 0.25);
    const m = measure(tone(n, (i) => (i < decayStart ? 0.8 : 0.8 * (1 - (i - decayStart) / (n - decayStart)))), SR);
    expect(m.riseDb).toBeLessThan(6);
  });

  it('a burst at the end does flag', () => {
    // Decay to near-silence, then a short loud release: the shape being hunted.
    const n = Math.round(SR * 0.4);
    const burstAt = n - Math.round(SR * 0.03);
    const m = measure(tone(n, (i) => {
      if (i >= burstAt) return 0.7;
      if (i > Math.round(SR * 0.25)) return 0.02;
      return 0.8;
    }), SR);
    expect(m.riseDb).toBeGreaterThan(6);
    expect(m.riseAtMs).not.toBeNull();
    expect(m.riseAtMs).toBeLessThanOrEqual(60);
  });

  it('reports a non-zero final sample, which is the click itself', () => {
    const n = Math.round(SR * 0.2);
    const m = measure(new Float32Array(n).fill(0.9), SR);
    expect(m.lastSample).toBeGreaterThan(0.5);
  });

  it('reads a real faded clip as ending cleanly', () => {
    // End to end: run the worker's own output through the probe.
    const { float32ToWav } = loadWorker(LOADER);
    const n = Math.round(SR * 0.2);
    const wav = float32ToWav(new Float32Array(n).fill(0.9), SR);
    const view = new DataView(wav);
    const pcm = Float32Array.from({ length: n }, (_, i) => view.getInt16(44 + i * 2, true) / 32768);
    expect(measure(pcm, SR).lastSample).toBe(0);
  });
});
