import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Rhythm Clap-Back closes the assessment half of the rhythm gap: across all three
// music tools there was interval, chord, timbre and sight-reading practice but nothing
// that measured a student's timing. The metronome supplies the reference; this scores
// whether the student can reproduce a pattern.
//
// The scoring core is module scope and free of DOM/audio, so it is exercised directly.

const sourcePath = 'stem_lab/stem_tool_music.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

function loadRhythm() {
  const src = read().replace(/\r\n/g, '\n');
  const a = src.indexOf('  // Rhythm Clap-Back — pattern bank and scoring');
  const b = src.indexOf("  window.StemLab.registerTool('musicSynth', {", a);
  expect(a, 'rhythm core block').toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  const out = {};
  new Function('exports', src.slice(a, b) + `
    exports.PATTERNS = RHYTHM_PATTERNS;
    exports.onsetTimes = rhythmOnsetTimes;
    exports.score = scoreRhythm;
    exports.TIGHT = RHYTHM_TIGHT_FRACTION;
    exports.CLOSE = RHYTHM_CLOSE_FRACTION;
    exports.MATCH = RHYTHM_MATCH_FRACTION;
  `)(out);
  return out;
}

const BEAT_120 = 500;

describe('Rhythm Clap-Back — pattern bank', () => {
  it('keeps every onset inside its own bar, sorted and distinct', () => {
    const { PATTERNS } = loadRhythm();
    expect(PATTERNS.length).toBeGreaterThanOrEqual(8);
    for (const p of PATTERNS) {
      expect(p.onsets.length, p.id).toBeGreaterThan(0);
      expect(p.onsets[0], p.id + ' should start on beat 1').toBe(0);
      for (let i = 0; i < p.onsets.length; i += 1) {
        expect(p.onsets[i], p.id + ' onset in bar').toBeGreaterThanOrEqual(0);
        expect(p.onsets[i], p.id + ' onset in bar').toBeLessThan(p.beats);
        if (i > 0) expect(p.onsets[i], p.id + ' sorted/distinct').toBeGreaterThan(p.onsets[i - 1]);
      }
    }
  });

  it('has unique ids and a spread of difficulty levels', () => {
    const { PATTERNS } = loadRhythm();
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(PATTERNS.length);
    expect(new Set(PATTERNS.map((p) => p.level)).size).toBeGreaterThanOrEqual(3);
  });

  it('converts beat positions to milliseconds at the given tempo', () => {
    const { PATTERNS, onsetTimes } = loadRhythm();
    const quarters = PATTERNS.find((p) => p.id === 'quarters');
    expect(onsetTimes(quarters, BEAT_120)).toEqual([0, 500, 1000, 1500]);
    expect(onsetTimes(quarters, 1000)).toEqual([0, 1000, 2000, 3000]);
    expect(onsetTimes(null, BEAT_120)).toEqual([]);
  });
});

describe('Rhythm Clap-Back — scoring', () => {
  const quarters = () => [0, 500, 1000, 1500];

  it('gives a perfect performance full marks', () => {
    const { score } = loadRhythm();
    const r = score(quarters(), quarters(), BEAT_120);
    expect(r.accuracy).toBe(1);
    expect(r.hit).toBe(4);
    expect(r.missed).toBe(0);
    expect(r.extra).toBe(0);
    expect(r.meanAbsMs).toBe(0);
    expect(r.onsets.every((o) => o.grade === 'tight')).toBe(true);
  });

  it('reports which side of the beat the student sits on', () => {
    const { score } = loadRhythm();
    expect(score(quarters(), quarters().map((t) => t + 20), BEAT_120).biasMs).toBeCloseTo(20, 6);
    expect(score(quarters(), quarters().map((t) => t - 20), BEAT_120).biasMs).toBeCloseTo(-20, 6);
  });

  it('keeps one early tap from cascading into a failed pattern', () => {
    const { score } = loadRhythm();
    // This is why matching is greedy over the closest pairs rather than
    // left-to-right: with left-to-right, a tap 200 ms early claims onset 1, pushing
    // every later tap onto the previous onset and failing the whole bar.
    const taps = [quarters()[0] - 200, 500, 1000, 1500];
    const r = score(quarters(), taps, BEAT_120);
    expect(r.missed).toBe(0);
    expect(r.extra).toBe(0);
    expect(r.onsets.filter((o) => o.grade !== 'tight').length).toBe(1);
    expect(r.onsets.slice(1).every((o) => o.grade === 'tight')).toBe(true);
  });

  it('never lets one tap satisfy two onsets', () => {
    const { score } = loadRhythm();
    const r = score([0, 100], [50], BEAT_120);
    expect(r.hit).toBe(1);
    expect(r.missed).toBe(1);
  });

  it('counts missed onsets and marks which they were', () => {
    const { score } = loadRhythm();
    const r = score(quarters(), [0, 500, 1500], BEAT_120);
    expect(r.missed).toBe(1);
    expect(r.hit).toBe(3);
    expect(r.onsets[2].grade).toBe('missed');
    expect(r.onsets[2].tapMs).toBeNull();
    expect(r.accuracy).toBeCloseTo(0.75, 9);
  });

  it('does not reward tapping continuously', () => {
    const { score } = loadRhythm();
    const spam = [];
    for (let t = 0; t <= 1500; t += 60) spam.push(t);
    const r = score(quarters(), spam, BEAT_120);
    // Every onset gets hit, but extra taps are penalised at the weight of a miss.
    expect(r.extra).toBeGreaterThan(15);
    expect(r.accuracy).toBeLessThan(0.5);
  });

  it('scores no taps as zero without dividing by zero', () => {
    const { score } = loadRhythm();
    const r = score(quarters(), [], BEAT_120);
    expect(r.accuracy).toBe(0);
    expect(r.hit).toBe(0);
    expect(r.missed).toBe(4);
    for (const v of [r.meanAbsMs, r.maxAbsMs, r.biasMs]) expect(Number.isFinite(v)).toBe(true);
  });

  it('scales its tolerance with tempo', () => {
    const { score } = loadRhythm();
    // 40 ms is 4% of a beat at 60 BPM but 13% at 200 BPM, so the same absolute error
    // is a different musical size and must not grade the same.
    expect(score([0], [40], 60000 / 60).onsets[0].grade).toBe('tight');
    expect(score([0], [40], 60000 / 200).onsets[0].grade).toBe('close');
    const slow = score([0], [0], 60000 / 60);
    const fast = score([0], [0], 60000 / 200);
    expect(slow.tightMs).toBeGreaterThan(fast.tightMs);
    expect(slow.closeMs).toBeGreaterThan(fast.closeMs);
  });

  it('places its grading bands in a sane order', () => {
    const { TIGHT, CLOSE, MATCH } = loadRhythm();
    expect(TIGHT).toBeLessThan(CLOSE);
    expect(CLOSE).toBeLessThan(MATCH);
    // A match window beyond half a beat could attribute a tap to the wrong onset.
    expect(MATCH).toBeLessThanOrEqual(0.5);
  });

  it('returns finite fields for every degenerate call', () => {
    const { score } = loadRhythm();
    const cases = [
      [null, [0], BEAT_120],
      [quarters(), null, BEAT_120],
      [[], [], BEAT_120],
      [quarters(), quarters(), 0],
      [quarters(), quarters(), NaN],
      [quarters(), quarters(), -100],
      [quarters(), quarters(), undefined],
    ];
    for (const args of cases) {
      const r = score.apply(null, args);
      for (const v of [r.accuracy, r.meanAbsMs, r.maxAbsMs, r.biasMs, r.tightMs, r.closeMs]) {
        expect(Number.isFinite(v), JSON.stringify(args)).toBe(true);
      }
      expect(r.accuracy).toBeGreaterThanOrEqual(0);
      expect(r.accuracy).toBeLessThanOrEqual(1);
    }
  });

  it('accepts taps in any order', () => {
    const { score } = loadRhythm();
    const ordered = score(quarters(), [0, 500, 1000, 1500], BEAT_120);
    const shuffled = score(quarters(), [1000, 0, 1500, 500], BEAT_120);
    expect(shuffled.accuracy).toBe(ordered.accuracy);
    expect(shuffled.hit).toBe(ordered.hit);
  });
});

describe('Rhythm Clap-Back — wiring', () => {
  it('guards against starting a second round mid-round', () => {
    const source = read();
    const at = source.indexOf('function startRhythmRound()');
    expect(at).toBeGreaterThan(-1);
    const body = source.slice(at, at + 400);
    expect(body).toMatch(/if \(d\.rhythmPhase === 'listen' \|\| d\.rhythmPhase === 'record'\) return;/);
  });

  it('clears its schedule on unmount and on leaving the tool', () => {
    const source = read();
    expect(source).toContain('function stopRhythm()');
    const unmountAt = source.indexOf('React.useEffect(function () { return function () { stopSequencer()');
    expect(source.slice(unmountAt, source.indexOf('}, []);', unmountAt))).toContain('stopRhythm()');
    const backAt = source.indexOf('setStemLabTool(null); stopSequencer()');
    expect(source.slice(backAt, backAt + 220)).toContain('stopRhythm()');
  });

  it('collects taps in a ref, not state, so a tap cannot be lost to batching', () => {
    const source = read();
    const at = source.indexOf('function recordRhythmTap()');
    const body = source.slice(at, at + 700);
    // Assert the invariant — taps accumulate on the ref — rather than the exact
    // expression. The timebase moved from Date.now() to the audio clock afterwards,
    // which is a correct change that an expression-level assertion would have failed.
    expect(body).toMatch(/run\.taps\.push\(/);
    expect(body).not.toMatch(/setTaps|useState/);
    // Only the visible counter goes through state.
    expect(body).toMatch(/upd\('rhythmTapCount', run\.taps\.length\)/);
  });

  it('uses a real button for the tap target, so Space and Enter work', () => {
    const source = read();
    // A document-level space handler would fight the piano keys in the same tab.
    const at = source.indexOf("stem.music.rhythm_tap_here");
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(at - 200, at + 400);
    expect(block).toMatch(/React\.createElement\("button"/);
    expect(block).toMatch(/onClick: recordRhythmTap/);
    expect(block).toMatch(/disabled: d\.rhythmPhase !== 'record'/);
  });

  it('awards the quest from a field it actually writes', () => {
    const source = read();
    expect(source).toMatch(/id: 'clap_back'/);
    expect(source).toMatch(/upd\('rhythmPassed', \(d\.rhythmPassed \|\| 0\) \+ 1\)/);
  });

  it('announces every phase for screen-reader users', () => {
    const source = read();
    for (const key of ['sr_rhythm_listen', 'sr_rhythm_go']) {
      expect(source, key).toContain('stem.music.' + key);
    }
    // And the result is announced, not only toasted.
    const at = source.indexOf('function finishRhythmRound');
    expect(source.slice(at, at + 2600)).toMatch(/announceToSR\(msg\)/);
  });

  it('localises all of its own strings', () => {
    const source = read();
    const at = source.indexOf('// ── Rhythm Clap-Back ──');
    const panel = source.slice(at, source.indexOf('// ── Arpeggiator ──', at));
    expect(panel.length).toBeGreaterThan(500);
    // Every prose literal in the panel must be the English fallback of a translator
    // call, i.e. immediately preceded by a 'stem.music.…' key. A literal standing on
    // its own is untranslatable text that would ship English to every locale.
    const bare = [];
    for (const m of panel.matchAll(/(['"])([A-Z][a-z]+ [a-z][^'"]{6,})\1/g)) {
      const before = panel.slice(Math.max(0, m.index - 60), m.index);
      if (!/['"]stem\.music\.[a-z0-9_]+['"]\s*,\s*$/.test(before)) bare.push(m[2]);
    }
    expect(bare).toEqual([]);
  });
});
