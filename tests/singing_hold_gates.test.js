import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// The four "hold the note" gates in Singing Lab (pitch match, vocal range, sight
// reading, interval singing) used to count how many times the pitch reading
// updated, with thresholds written as "~30 frames (about 1 second)". That was wrong
// in both directions: requestAnimationFrame runs at 60 Hz on most displays, so 30
// updates arrived in about half a second; and once the analysis loop only publishes
// a reading when the value actually moves, a singer holding a dead-steady note
// could stop advancing the counter altogether and never complete the exercise.
//
// These tests pin the property that fixes it: progress is measured in elapsed
// milliseconds and is therefore independent of how often readings arrive.

const sourcePath = 'stem_lab/stem_tool_singing.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

function loadHold() {
  const src = read().replace(/\r\n/g, '\n');
  const a = src.indexOf('  var HOLD_MATCH_MS');
  const b = src.indexOf('  /** RMS volume calculation */', a);
  expect(a, 'hold helper block').toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  const out = {};
  new Function('exports', src.slice(a, b) + `
    exports.accrueHold = accrueHold;
    exports.resetHold = resetHold;
    exports.HOLD_MATCH_MS = HOLD_MATCH_MS;
    exports.HOLD_RANGE_MS = HOLD_RANGE_MS;
    exports.HOLD_SIGHTREAD_MS = HOLD_SIGHTREAD_MS;
    exports.HOLD_INTERVAL_MS = HOLD_INTERVAL_MS;
    exports.HOLD_MAX_STEP_MS = HOLD_MAX_STEP_MS;
  `)(out);
  return out;
}

/** Feeds `durationMs` of held note at `hz` updates/sec; returns accrued ms. */
function holdFor(accrueHold, ref, durationMs, hz, startAt = 10000) {
  const stepMs = 1000 / hz;
  let t = startAt;
  let accrued = 0;
  ref.current = { ms: 0, last: t };
  for (let elapsed = 0; elapsed < durationMs; elapsed += stepMs) {
    t += stepMs;
    accrued = accrueHold(ref, t, 1);
  }
  return accrued;
}

describe('Singing Lab hold gates — rate independence', () => {
  it('accrues the same held time at 12, 25 and 60 updates per second', () => {
    const { accrueHold } = loadHold();
    const results = [12, 25, 60, 144].map((hz) => holdFor(accrueHold, { current: null }, 1000, hz));
    for (const ms of results) {
      // One second of singing reads as one second regardless of update rate.
      expect(ms).toBeGreaterThan(950);
      expect(ms).toBeLessThan(1050);
    }
    expect(Math.max(...results) - Math.min(...results)).toBeLessThan(60);
  });

  it('completes a one-second gate even when readings are sparse', () => {
    const { accrueHold, HOLD_MATCH_MS } = loadHold();
    // A steady note publishes few updates, because the analysis loop suppresses
    // unchanged readings. Five updates across 1.2s must still clear the gate; the
    // old 30-count version needed thirty and would have stalled forever.
    const ref = { current: { ms: 0, last: 0 } };
    let held = 0;
    for (const t of [200, 440, 680, 920, 1160]) held = accrueHold(ref, t, 1);
    expect(held).toBeGreaterThanOrEqual(HOLD_MATCH_MS);
  });

  it('does not complete faster than its threshold at a high frame rate', () => {
    const { accrueHold, HOLD_MATCH_MS } = loadHold();
    // The old counter fired at 30 updates, i.e. half a second at 60 Hz.
    const halfSecond = holdFor(accrueHold, { current: null }, 500, 60);
    expect(halfSecond).toBeLessThan(HOLD_MATCH_MS);
  });

  it('bleeds progress back off when the note is lost, without going negative', () => {
    const { accrueHold } = loadHold();
    const ref = { current: null };
    holdFor(accrueHold, ref, 600, 25);
    const beforeLoss = ref.current.ms;
    expect(beforeLoss).toBeGreaterThan(500);

    // Losing the note at -2 gives progress back twice as fast as it accrued.
    let t = ref.current.last;
    for (let i = 0; i < 5; i += 1) { t += 40; accrueHold(ref, t, -2); }
    expect(ref.current.ms).toBeLessThan(beforeLoss);

    // And it floors at zero rather than going negative, which would otherwise make
    // the next attempt need extra time to climb back to zero.
    for (let i = 0; i < 100; i += 1) { t += 40; accrueHold(ref, t, -2); }
    expect(ref.current.ms).toBe(0);
  });

  it('ignores a huge gap, so a backgrounded tab cannot credit the whole hold', () => {
    const { accrueHold, HOLD_MAX_STEP_MS, HOLD_MATCH_MS } = loadHold();
    const ref = { current: { ms: 0, last: 0 } };
    // Tab hidden for a minute, then one update: requestAnimationFrame is throttled
    // while hidden, so this is a real scenario, and it must not hand out a pass.
    const held = accrueHold(ref, 60000, 1);
    expect(held).toBe(0);
    expect(HOLD_MAX_STEP_MS).toBeLessThan(HOLD_MATCH_MS);
  });

  it('starts from zero on reset without crediting the gap since the last update', () => {
    const { accrueHold, resetHold } = loadHold();
    const ref = { current: null };
    holdFor(accrueHold, ref, 800, 25);
    expect(ref.current.ms).toBeGreaterThan(700);
    resetHold(ref);
    expect(ref.current.ms).toBe(0);
    // The very next update must not credit the wall-clock gap either.
    expect(accrueHold(ref, ref.current.last + 5000, 1)).toBe(0);
  });
});

describe('Singing Lab hold gates — thresholds and wiring', () => {
  it('states every threshold in milliseconds', () => {
    const h = loadHold();
    expect(h.HOLD_MATCH_MS).toBe(1000);
    expect(h.HOLD_RANGE_MS).toBe(1000);
    expect(h.HOLD_SIGHTREAD_MS).toBe(1000);
    // Interval singing kept its original documented intent of ~0.8s.
    expect(h.HOLD_INTERVAL_MS).toBe(800);
  });

  it('leaves no gate counting reading updates', () => {
    const source = read();
    for (const pattern of [
      /LockedRef\.current\+\+/,
      /StableCountRef\.current\+\+/,
      /LockedRef\.current >= \d/,
      /StableCountRef\.current >= \d/,
      /LockedRef\.current = 0/,
      /StableCountRef\.current = 0/,
    ]) {
      expect(source, 'frame-counting gate still present: ' + pattern).not.toMatch(pattern);
    }
  });

  it('averages sight-reading accuracy over the samples actually taken', () => {
    const source = read();
    // avgCents divided by a hardcoded 30 regardless of how many readings arrived,
    // which misreported the student's accuracy once the rate changed.
    expect(source).not.toMatch(/srCentsAccRef\.current \/ 30/);
    expect(source).toMatch(/srCentsAccRef\.current \/ Math\.max\(1, srCentsSamplesRef\.current\)/);
    // Every reset of the accumulator must reset its sample count too, or the next
    // note's average is divided by a stale denominator.
    const accResets = (source.match(/srCentsAccRef\.current = 0;/g) || []).length;
    const sampleResets = (source.match(/srCentsSamplesRef\.current = 0;/g) || []).length;
    expect(sampleResets).toBe(accResets);
  });
});
