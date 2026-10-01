import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Timing in this tool used to be driven entirely by setInterval/setTimeout, whose
// error accumulates. That mattered in two places:
//
// 1. The metronome — a reference device. A timer firing a few ms late every beat is
//    several beats adrift after a few minutes, and a metronome that drifts is not a
//    metronome.
// 2. Rhythm Clap-Back — the pattern was played with setTimeout but the student was
//    scored against *ideal* onset times, so scheduler jitter was charged to the
//    student. The tight grading band is only 30 ms at 120 BPM, smaller than a busy
//    page's timer error. The record window also opened on the setTimeout fire, so a
//    late timer shifted every tap earlier by that amount.
//
// Both now schedule on Web Audio's sample-accurate clock and measure against it.

const sourcePath = 'stem_lab/stem_tool_music.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

describe('audio clock — schedulable sound helpers', () => {
  it('lets playClick and playDrum be scheduled ahead', () => {
    const source = read();
    expect(source).toMatch(/function playClick\(accent, when\)/);
    expect(source).toMatch(/function playDrum\(type, when\)/);
  });

  it('falls back to now for a missing, past or non-finite time', () => {
    const source = read();
    // A `when` in the past would play immediately anyway, but being explicit keeps the
    // fallback from depending on Web Audio's tolerance.
    const guards = source.match(/typeof when === 'number' && isFinite\(when\) && when > ctx[A]?\.currentTime\)? \? when : ctx[A]?\.currentTime/g) || [];
    expect(guards.length).toBe(2);
  });

  it('keeps every existing caller working, since `when` is optional', () => {
    const source = read();
    // Single-argument calls must still work; there are several, plus the two that
    // pass a variable type. None of them was touched by adding the optional `when`.
    const singleArg = source.match(/playDrum\((?:'[a-z]+'|[a-zA-Z.]+)\)/g) || [];
    expect(singleArg.length).toBeGreaterThanOrEqual(5);
    expect(source).toMatch(/playDrum\(ps\.type\)/);
  });
});

describe('audio clock — metronome look-ahead', () => {
  const block = () => {
    const source = read();
    const at = source.indexOf('function startMetronome()');
    expect(at).toBeGreaterThan(-1);
    return source.slice(at, source.indexOf('function stopMetronome()', at));
  };

  it('advances an exact next-beat time rather than trusting the timer', () => {
    const b = block();
    // This is the property that stops error accumulating: nextBeatSec is incremented
    // by exactly one beat and never re-derived from the current time.
    expect(b).toMatch(/st\.nextBeatSec \+= secPerBeat;/);
    expect(b).not.toMatch(/st\.nextBeatSec = actx\.currentTime \+ secPerBeat/);
  });

  it('schedules clicks on the audio clock, not on the timer fire', () => {
    const b = block();
    expect(b).toMatch(/playClick\(st\.beat === 0, st\.nextBeatSec\)/);
  });

  it('polls more often than it schedules ahead, so no beat can be skipped', () => {
    const source = read();
    const lookahead = Number(/var METRO_LOOKAHEAD_SEC = ([\d.]+);/.exec(source)[1]);
    const pollMs = Number(/var METRO_POLL_MS = (\d+);/.exec(source)[1]);
    expect(lookahead * 1000).toBeGreaterThan(pollMs * 2);
    // And the window must be shorter than the fastest beat the tempo range allows,
    // or a single poll would schedule two beats of the same index.
    const fastestBeatMs = 60000 / 208;
    expect(lookahead * 1000).toBeLessThan(fastestBeatMs);
  });

  it('cleans up the lamp timers it creates', () => {
    const source = read();
    const at = source.indexOf('function stopMetronome()');
    const stop = source.slice(at, at + 500);
    expect(stop).toMatch(/clearTimeout\(st\.uiTimers\[i\]\)/);
    expect(stop).toMatch(/st\.uiTimers = \[\]/);
    // And the list is bounded during a long session.
    expect(read()).toMatch(/if \(st\.uiTimers\.length > 64\)/);
  });

  it('resumes a suspended context before scheduling into it', () => {
    expect(block()).toMatch(/if \(actx\.state === 'suspended'\) actx\.resume\(\)/);
  });
});

describe('audio clock — Clap-Back reference and measurement share one timebase', () => {
  const roundBlock = () => {
    const source = read();
    const at = source.indexOf('function startRhythmRound()');
    return source.slice(at, source.indexOf('function finishRhythmRound', at));
  };

  it('derives the onset list once and uses it for both sound and scoring', () => {
    const source = read();
    const start = roundBlock();
    // Computed once...
    expect(start).toMatch(/var onsets = rhythmOnsetTimes\(pattern, beatMs\);/);
    // ...used to schedule...
    expect(start).toMatch(/playDrum\('rim', audioAt\(barMs \+ onsets\[o\]\)\)/);
    // ...and handed to the scorer, rather than recomputed there.
    expect(start).toMatch(/finishRhythmRound\(pattern, beatMs, onsets\)/);
    expect(source).toMatch(/function finishRhythmRound\(pattern, beatMs, onsets\)/);
    expect(source).toMatch(/var expected = onsets \|\| rhythmOnsetTimes\(pattern, beatMs\)/);
  });

  it('plays every sound at an explicit audio-clock offset', () => {
    const start = roundBlock();
    expect(start).toMatch(/function audioAt\(offsetMs\) \{ return originSec \+ offsetMs \/ 1000; \}/);
    expect(start).toMatch(/playClick\(c === 0, audioAt\(c \* beatMs\)\)/);
    expect(start).toMatch(/playClick\(c2 === 0, audioAt\(barMs \* 2 \+ c2 \* beatMs\)\)/);
    // No sound may be triggered from inside a timer callback any more.
    expect(start).not.toMatch(/at\([^)]*function \(\) \{ playClick\(/);
    expect(start).not.toMatch(/at\([^)]*function \(\) \{ playDrum\(/);
  });

  it('opens the record window at a known audio time, not when the timer fires', () => {
    const start = roundBlock();
    expect(start).toMatch(/run\.recordStartSec = audioAt\(barMs \* 3\)/);
    // The old code stamped Date.now() inside the phase timer, folding the timer's
    // lateness into every tap.
    expect(read()).not.toMatch(/run\.startAt = Date\.now\(\)/);
  });

  it('measures taps against that same audio time', () => {
    const source = read();
    const at = source.indexOf('function recordRhythmTap()');
    const body = source.slice(at, at + 700);
    expect(body).toMatch(/audio\.ctx\.currentTime - run\.recordStartSec/);
    // Strip comments first: the block explains what it replaced, and that prose
    // mentions Date.now().
    const code = body.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/Date\.now\(\)/);
    // A tap before the window is armed must not be recorded against a null origin.
    expect(body).toMatch(/typeof run\.recordStartSec === 'number'/);
  });

  it('gives the first click room so it is not clipped while nodes are built', () => {
    const start = roundBlock();
    expect(start).toMatch(/var LEAD_IN_MS = 120;/);
    expect(start).toMatch(/originSec = actx\.currentTime \+ LEAD_IN_MS \/ 1000/);
    // The UI phase timers are offset by the same lead-in, so they stay aligned.
    expect(start).toMatch(/setTimeout\(fn, Math\.max\(0, LEAD_IN_MS \+ delayMs\)\)/);
  });

  it('bails out cleanly when there is no audio context', () => {
    const start = roundBlock();
    expect(start).toMatch(/if \(!audio \|\| !audio\.ctx\) return;/);
  });
});

describe('audio clock — drift does not accumulate', () => {
  // Exercises the scheduling strategies themselves under a modelled erratic timer.
  // This demonstrates a property of the algorithm; it is not a browser measurement.
  const BPM = 120;
  const secPerBeat = 60 / BPM;
  const RUN_SEC = 300;

  function rng(seed) {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  }

  /** Old strategy: sound whenever the interval fires. */
  function intervalDriven(rnd) {
    const clicks = [];
    let t = 0;
    while (t < RUN_SEC) {
      t += secPerBeat + (0.002 + rnd() * 0.006);   // timers run late, one-directionally
      clicks.push(t);
    }
    return clicks;
  }

  /** New strategy: exact next-beat time, scheduled ahead on the audio clock. */
  function lookAhead(rnd, lookaheadSec = 0.15, pollSec = 0.025) {
    const clicks = [];
    let now = 0;
    let nextBeat = 0.1;
    while (now < RUN_SEC) {
      now += pollSec + rnd() * 0.02 + (rnd() < 0.02 ? 0.25 : 0);   // occasional stall
      while (nextBeat < now + lookaheadSec) {
        clicks.push(nextBeat);
        nextBeat += secPerBeat;
      }
    }
    return clicks.filter((t) => t < RUN_SEC);
  }

  const driftOf = (clicks) => {
    const first = clicks[0];
    return clicks[clicks.length - 1] - (first + (clicks.length - 1) * secPerBeat);
  };

  it('holds exact time where an interval-driven clock drifts past a whole beat', () => {
    const oldClicks = intervalDriven(rng(12345));
    const newClicks = lookAhead(rng(12345));
    expect(Math.abs(driftOf(oldClicks))).toBeGreaterThan(secPerBeat);
    expect(Math.abs(driftOf(newClicks))).toBeLessThan(1e-9);
  });

  it('keeps every gap exactly one beat, whatever the timer does', () => {
    const clicks = lookAhead(rng(777));
    const gaps = clicks.slice(1).map((t, i) => t - clicks[i]);
    for (const g of gaps) expect(Math.abs(g - secPerBeat)).toBeLessThan(1e-9);
  });

  it('loses no beats across repeated stalls', () => {
    for (const seed of [1, 42, 999, 20260811]) {
      const clicks = lookAhead(rng(seed));
      // 300 s at 120 BPM is 600 beats; allow one for the 0.1 s start offset.
      expect(clicks.length, 'seed ' + seed).toBeGreaterThanOrEqual(599);
    }
  });

  it('is why the tight grading band is defensible', () => {
    // 6% of a beat at 120 BPM is 30 ms, which is smaller than an interval-driven
    // scheduler's own error — so scoring against a jittery reference charged the
    // student for the scheduler.
    const tightMs = secPerBeat * 1000 * 0.06;
    const oldClicks = intervalDriven(rng(5));
    const worstGapErr = Math.max(...oldClicks.slice(1).map((t, i) => Math.abs(t - oldClicks[i] - secPerBeat))) * 1000;
    expect(tightMs).toBeLessThan(worstGapErr * 6);
    expect(tightMs).toBeCloseTo(30, 6);
  });
});
