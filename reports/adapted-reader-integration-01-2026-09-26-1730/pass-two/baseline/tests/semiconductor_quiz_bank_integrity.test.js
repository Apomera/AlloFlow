// Semiconductor Lab — the quiz must not be answerable without knowing the physics.
//
// Both banks were authored with the correct answer at index 1: 22 of 30 practice
// questions and 8 of 12 boss rounds, 30 of 42 overall. A student who always picked
// the second choice scored ~71% knowing nothing, which makes the score useless as
// evidence of learning and actively rewards guessing strategy over study. Same class
// as the RoadReady permit bank's length tell.
//
// orderOptions() now places the answer at a hash-chosen slot, so this pins both the
// structural integrity of the banks and the resulting balance.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_semiconductor.js';

let practice, boss, orderOptions;

// Decode \uXXXX so lengths and comparisons are done on what a student SEES.
// "n²/L²" is 15 characters in the file and 5 on screen.
const decode = (s) => s
  .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\'/g, "'");

function collect(src, re) {
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const opts = m[3].split(/',\s*'/).map((s) => decode(s.replace(/^'/, '').replace(/'$/, '').trim()));
    out.push({ q: decode(m[1]), a: decode(m[2]), opts });
  }
  return out;
}

beforeAll(() => {
  const src = readFileSync(SOURCE, 'utf8');
  practice = collect(src, /\{ q: '((?:[^'\\]|\\.)*)', a: '((?:[^'\\]|\\.)*)', opts: \[([^\]]*)\]/g);
  boss = collect(src, /desc: (?:t\([^,]+,\s*)?'((?:[^'\\]|\\.)*)'\)?,\s*answer: (?:t\([^,]+,\s*)?'((?:[^'\\]|\\.)*)'\)?,\s*opts: \[([^\]]*)\]/g);

  resetStemLab();
  loadTool(SOURCE, 'semiconductor');
  orderOptions = window.__SemiconductorCore.orderOptions;
});

describe('question banks are structurally sound', () => {
  it('parses both banks', () => {
    expect(practice.length).toBeGreaterThanOrEqual(30);
    expect(boss.length).toBeGreaterThanOrEqual(10);
  });

  it('always includes the correct answer among the options', () => {
    [...practice, ...boss].forEach((x) => {
      expect(x.opts, x.q.slice(0, 50)).toContain(x.a);
    });
  });

  it('never repeats an option within a question', () => {
    [...practice, ...boss].forEach((x) => {
      expect(new Set(x.opts).size, 'duplicate option in: ' + x.q.slice(0, 50)).toBe(x.opts.length);
    });
  });

  it('offers at least three choices per question', () => {
    [...practice, ...boss].forEach((x) => {
      expect(x.opts.length, x.q.slice(0, 50)).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('orderOptions preserves the question', () => {
  it('returns exactly the same option set, only reordered', () => {
    [...practice, ...boss].forEach((x) => {
      const got = orderOptions(x.q, x.opts, x.a);
      expect(got.length).toBe(x.opts.length);
      expect([...got].sort()).toEqual([...x.opts].sort());
    });
  });

  it('is stable across calls', () => {
    // Re-ordering on every render would move an option out from under the student's
    // pointer and reshuffle the highlighting while a result is on screen.
    [...practice, ...boss].slice(0, 12).forEach((x) => {
      expect(orderOptions(x.q, x.opts, x.a)).toEqual(orderOptions(x.q, x.opts, x.a));
    });
  });

  it('leaves the order alone when the answer is not in the options', () => {
    const opts = ['a', 'b', 'c'];
    expect(orderOptions('q', opts, 'zzz')).toEqual(opts);
  });

  it('handles degenerate inputs without throwing', () => {
    expect(orderOptions('q', [], 'a')).toEqual([]);
    expect(orderOptions('q', ['only'], 'only')).toEqual(['only']);
  });
});

describe('the answer position is not a tell', () => {
  const worstSlotPct = (rows) => {
    const hist = {};
    rows.forEach((x) => {
      const i = orderOptions(x.q, x.opts, x.a).indexOf(x.a);
      hist[i] = (hist[i] || 0) + 1;
    });
    return 100 * Math.max(...Object.values(hist)) / rows.length;
  };

  it('spreads the practice bank across slots', () => {
    // Was 73% at index 1. Chance for 3-4 options is ~25-33%.
    expect(worstSlotPct(practice)).toBeLessThanOrEqual(45);
  });

  it('spreads the boss rounds across slots', () => {
    // Was 67% at index 1.
    expect(worstSlotPct(boss)).toBeLessThanOrEqual(45);
  });

  it('spreads the combined banks', () => {
    expect(worstSlotPct([...practice, ...boss])).toBeLessThanOrEqual(40);
  });
});

describe('the answer length is not a tell', () => {
  // The correct answer used to be the uniquely longest option in 16 of 30 practice
  // questions (53%), against a ~25-33% chance baseline, so "pick the longest" beat
  // studying. Distractors were rewritten to comparable length and it is now 6/30
  // (20%), with every remaining case within 4 characters -- not exploitable.
  //
  // Measured on RENDERED text. The source stores \uXXXX escapes, so "n²/L²" is 15
  // source characters but 5 on screen; measuring the source invents tells that do
  // not exist and hides ones that do.
  const uniqueLongest = (rows) => rows.filter((x) => {
    const lens = x.opts.map((o) => o.length);
    const mx = Math.max(...lens);
    return x.a.length === mx && lens.filter((l) => l === mx).length === 1;
  });
  const pct = (rows) => 100 * uniqueLongest(rows).length / rows.length;

  it('keeps the practice bank at or below chance', () => {
    expect(pct(practice)).toBeLessThanOrEqual(30);
  });

  it('keeps the boss rounds at or below chance', () => {
    expect(pct(boss)).toBeLessThanOrEqual(40);
  });

  it('leaves no large length gap that could be picked off', () => {
    // A one- or two-character edge is noise. A double-digit one is a strategy.
    [...practice, ...boss].forEach((x) => {
      const others = x.opts.filter((o) => o !== x.a);
      const gap = x.a.length - Math.max(...others.map((o) => o.length));
      expect(gap, 'answer is ' + gap + ' chars longer than any distractor: ' + x.q.slice(0, 60))
        .toBeLessThanOrEqual(6);
    });
  });
});
