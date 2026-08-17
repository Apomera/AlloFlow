// Behavior Lab — the cumulative-record generator behind Schedule Sleuth and the
// Schedule Comparison animation.
//
// WHY THIS RUNS THE CODE INSTEAD OF PINNING ITS TEXT
// The render digest for behaviorLab could not have caught what was wrong here:
// the curves are drawn to a canvas and an SVG polyline, and the defects were in
// the NUMBERS, not the markup. All three were shipped and invisible to every
// existing gate:
//
//   • FR deadlocked at exactly `ratio` responses. The post-reinforcement pause
//     fired whenever `cumResp % ratio === 0`, but a paused tick cannot advance
//     cumResp, so the condition was permanently true. Every FR curve rose to 5
//     and then ran flat for 195 ticks — which reads as extinction, while the
//     answer feedback told the student to look for a staircase.
//   • VR and VI overran the y axis (pinned at 60 responses against ~160 and ~95
//     generated), so more than half of each line was drawn outside the viewBox.
//   • FI produced no visible scallop.
//
// So this asserts SHAPE PROPERTIES of the generated record — the same properties
// the puzzle's correct answer claims — rather than a snapshot of its output. A
// digest would have gone green on all three bugs and would go red on a harmless
// re-tune. See reference_stem_tool_three_copies for the same lesson learned on
// sizeDnaCanvas: pin invariants, not spellings.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');

/** Slice a top-level `function name(...) { ... }` out of the source by brace matching. */
function sliceFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function ' + name + ' not found — did it get renamed?');
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('unbalanced braces slicing ' + name);
}

/** Slice `var name = [ ... ];` by bracket matching. */
function sliceArray(src, name) {
  const start = src.indexOf('var ' + name + ' = [');
  if (start < 0) throw new Error('array ' + name + ' not found');
  let i = src.indexOf('[', start);
  let depth = 0;
  for (; i < src.length; i += 1) {
    if (src[i] === '[') depth += 1;
    else if (src[i] === ']') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1) + ';';
    }
  }
  throw new Error('unbalanced brackets slicing ' + name);
}

function readNumber(src, name) {
  const m = new RegExp('var\\s+' + name + '\\s*=\\s*(\\d+)').exec(src);
  if (!m) throw new Error(name + ' not found');
  return Number(m[1]);
}

let SCHEDULES;
let record;
let blocks;
let R_MAX;
let T_MAX;

beforeAll(() => {
  const src = fs.readFileSync(SOURCE, 'utf8');
  R_MAX = readNumber(src, 'BL_SCHED_R');
  T_MAX = readNumber(src, 'BL_SCHED_T');
  const bundle = [
    'var __alloT = function (k, fb) { return fb; };',
    'var BL_SCHED_T = ' + T_MAX + ';',
    'var BL_SCHED_R = ' + R_MAX + ';',
    sliceArray(src, 'SCHEDULE_TYPES'),
    sliceFunction(src, 'blScheduleRecord'),
    sliceFunction(src, 'blScheduleBlocks'),
    'return { SCHEDULE_TYPES: SCHEDULE_TYPES, blScheduleRecord: blScheduleRecord, blScheduleBlocks: blScheduleBlocks };',
  ].join('\n');
  // eslint-disable-next-line no-new-func
  const exported = new Function(bundle)();
  SCHEDULES = exported.SCHEDULE_TYPES;
  record = exported.blScheduleRecord;
  blocks = exported.blScheduleBlocks;
});

const SEEDS = [3, 7, 11, 19, 23, 41, 97, 128];
const byId = (id) => SCHEDULES.find((s) => s.id === id);

/** Lengths of the runs of consecutive ticks with no response. */
function flatRuns(resp) {
  const runs = [];
  let cur = 0;
  for (let i = 1; i < resp.length; i += 1) {
    if (resp[i] === resp[i - 1]) cur += 1;
    else if (cur > 0) { runs.push(cur); cur = 0; }
  }
  if (cur > 0) runs.push(cur);
  return runs;
}

describe('cumulative-record generator', () => {
  it('exposes exactly the four schedules the puzzle offers', () => {
    expect(SCHEDULES.map((s) => s.id)).toEqual(['FR', 'VR', 'FI', 'VI']);
  });

  it('is deterministic in the seed', () => {
    const a = record(byId('FR'), 42);
    const b = record(byId('FR'), 42);
    expect(a.resp).toEqual(b.resp);
    expect(a.reinf).toEqual(b.reinf);
    expect(record(byId('FR'), 43).resp).not.toEqual(a.resp);
  });

  for (const s of ['FR', 'VR', 'FI', 'VI']) {
    it(`${s} never leaves the chart`, () => {
      // The y axis is fixed so that slope stays comparable between schedules,
      // which means the generator — not the renderer — has to stay inside it.
      for (const seed of SEEDS) {
        const rec = record(byId(s), seed);
        expect(rec.resp.length).toBe(T_MAX);
        expect(rec.total).toBeLessThanOrEqual(R_MAX);
        expect(Math.max(...rec.resp)).toBeLessThanOrEqual(R_MAX);
      }
    });

    it(`${s} keeps responding for the whole session`, () => {
      // The bug this replaces: FR stopped dead a fifth of the way in and the
      // remaining 195 ticks were a flat line. No schedule here is extinction.
      for (const seed of SEEDS) {
        const rec = record(byId(s), seed);
        const lastQuarter = rec.resp[T_MAX - 1] - rec.resp[Math.floor(T_MAX * 0.75)];
        expect(lastQuarter, `${s}/${seed} produced nothing in the final quarter`).toBeGreaterThan(0);
        expect(rec.total).toBeGreaterThan(20);
        expect(rec.reinf.length).toBeGreaterThan(2);
      }
    });

    it(`${s} rises monotonically`, () => {
      const rec = record(byId(s), SEEDS[0]);
      for (let i = 1; i < rec.resp.length; i += 1) {
        expect(rec.resp[i]).toBeGreaterThanOrEqual(rec.resp[i - 1]);
      }
    });
  }

  it('FR shows the post-reinforcement pause it is defined by', () => {
    // Break-and-run: a pause follows EVERY reinforcer, so there are about as many
    // long flats as there are reinforcers.
    for (const seed of SEEDS) {
      const rec = record(byId('FR'), seed);
      const longFlats = flatRuns(rec.resp).filter((r) => r >= 4).length;
      expect(longFlats, `FR/${seed}`).toBeGreaterThanOrEqual(Math.floor(rec.reinf.length * 0.7));
    }
  });

  it('VR is high and steady — no post-reinforcement pause', () => {
    // The FR-vs-VR contrast is the single most-tested idea in this panel, so the
    // two must be separable by the feature the answer names, not merely by rate.
    for (const seed of SEEDS) {
      const vr = record(byId('VR'), seed);
      const fr = record(byId('FR'), seed);
      const vrLong = flatRuns(vr.resp).filter((r) => r >= 4).length;
      const frLong = flatRuns(fr.resp).filter((r) => r >= 4).length;
      expect(vrLong, `VR/${seed} paused like a fixed ratio`).toBeLessThan(frLong);
      expect(vr.total, `VR/${seed} was not the faster schedule`).toBeGreaterThan(fr.total);
    }
  });

  it('FI scallops: responding accelerates across each interval', () => {
    // Within every inter-reinforcement gap, the second half must carry clearly
    // more responses than the first. That concavity IS the scallop, and it is
    // what the correct answer rewards the student for seeing.
    for (const seed of SEEDS) {
      const rec = record(byId('FI'), seed);
      let early = 0;
      let late = 0;
      const bounds = [0].concat(rec.reinf);
      for (let k = 0; k < bounds.length - 1; k += 1) {
        const a = bounds[k];
        const b = bounds[k + 1];
        const mid = Math.floor((a + b) / 2);
        early += rec.resp[mid] - rec.resp[a];
        late += rec.resp[b] - rec.resp[mid];
      }
      expect(late, `FI/${seed} showed no acceleration within its intervals`).toBeGreaterThan(early * 1.5);
    }
  });

  it('FI pauses longer after a reinforcer than VI does', () => {
    // The FI-vs-VI pair is the other half of the 2x2, and it is distinguished by
    // shape rather than by rate — so their totals may overlap, but their longest
    // silences must not.
    let fiWins = 0;
    for (const seed of SEEDS) {
      const fi = Math.max(...flatRuns(record(byId('FI'), seed).resp));
      const vi = Math.max(...flatRuns(record(byId('VI'), seed).resp));
      if (fi > vi) fiWins += 1;
    }
    expect(fiWins, 'FI is not reliably the one with the long post-reinforcer silences')
      .toBeGreaterThanOrEqual(SEEDS.length - 1);
  });

  it('VI is steadier than FI', () => {
    for (const seed of SEEDS) {
      const vi = record(byId('VI'), seed);
      const fi = record(byId('FI'), seed);
      const spread = (rec) => {
        const b = blocks(rec, 10).map((x) => x.count);
        const mean = b.reduce((a, c) => a + c, 0) / b.length;
        return Math.sqrt(b.reduce((a, c) => a + (c - mean) ** 2, 0) / b.length) / Math.max(1, mean);
      };
      expect(spread(vi), `VI/${seed} was less even than FI`).toBeLessThanOrEqual(spread(fi) + 0.05);
    }
  });

  it('every reinforcer lands on a response, never on an empty tick', () => {
    // A reinforcer is delivered FOR a response. A tick mark on a flat stretch
    // would be teaching the opposite of the contingency the tool exists to show.
    for (const s of ['FR', 'VR', 'FI', 'VI']) {
      for (const seed of SEEDS) {
        const rec = record(byId(s), seed);
        for (const t of rec.reinf) {
          const before = t === 0 ? 0 : rec.resp[t - 1];
          expect(rec.resp[t], `${s}/${seed}: reinforcer at tick ${t} with no response`).toBe(before + 1);
        }
      }
    }
  });

  it('the numeric table and the drawn curve report the same record', () => {
    // The screen-reader path must not be a separate calculation that can drift.
    for (const s of ['FR', 'VR', 'FI', 'VI']) {
      const rec = record(byId(s), 19);
      const b = blocks(rec, 10);
      expect(b.reduce((a, c) => a + c.count, 0)).toBe(rec.total);
      expect(b[b.length - 1].to).toBe(T_MAX - 1);
    }
  });
});

// ── Level 9: the Pavlov association model ───────────────────────────────────
// Read out of the source rather than re-typed here: a constant copied into a test
// stops being a check on the tool the moment either side moves.
describe('classical conditioning curve', () => {
  let RATE;

  beforeAll(() => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const m = /var\s+BL_CS_RATE\s*=\s*([\d.]+)/.exec(src);
    if (!m) throw new Error('BL_CS_RATE not found');
    RATE = Number(m[1]);
    // The acquisition and extinction steps must both be expressed against it, or
    // the "same process, different asymptote" claim in the comments is a fiction.
    expect(src).toContain('BL_CS_RATE * (100 - blAssocStrength)');
    expect(src).toContain('blAssocStrength * (1 - BL_CS_RATE)');
  });

  const acquire = (n) => {
    let v = 0;
    const out = [];
    for (let i = 0; i < n; i += 1) { v = Math.min(100, Math.round(v + RATE * (100 - v))); out.push(v); }
    return out;
  };
  const extinguish = (from, n) => {
    let v = from;
    const out = [];
    for (let i = 0; i < n; i += 1) { v = Math.max(0, Math.round(v * (1 - RATE))); out.push(v); }
    return out;
  };

  it('acquisition is negatively accelerated, not a straight ramp', () => {
    // The defect this replaces: a flat +18 per pairing, which draws a straight line
    // and teaches that the fifth pairing is worth as much as the first.
    const v = acquire(5);
    const deltas = v.map((x, i) => x - (i === 0 ? 0 : v[i - 1]));
    for (let i = 1; i < deltas.length; i += 1) {
      expect(deltas[i], `pairing ${i + 1} added at least as much as pairing ${i}`)
        .toBeLessThan(deltas[i - 1]);
    }
  });

  it('five pairings still cross the CR threshold with room to spare', () => {
    // The phase machine hands over to the Test phase after 5 pairings and fires the
    // conditioned response above 30. Acquisition may be reshaped; it must not be
    // reshaped into a level that cannot be completed.
    const v = acquire(5);
    expect(v[v.length - 1]).toBeGreaterThan(60);
    expect(v[v.length - 1]).toBeLessThanOrEqual(100);
    expect(v[0], 'a single pairing should not already produce a strong CR').toBeLessThan(60);
  });

  it('extinction decays proportionally and clears the CR threshold', () => {
    const start = acquire(5).pop();
    const e = extinguish(start, 8);
    for (let i = 1; i < e.length; i += 1) {
      expect(e[i]).toBeLessThanOrEqual(e[i - 1]);
    }
    const crossed = e.findIndex((x) => x <= 30);
    expect(crossed, 'extinction never stopped the conditioned response').toBeGreaterThanOrEqual(0);
    // Fast at first, slow at the end — the reason the last traces are hardest to
    // remove, and the setup for spontaneous recovery.
    expect(start - e[0]).toBeGreaterThan(e[e.length - 2] - e[e.length - 1]);
  });
});
