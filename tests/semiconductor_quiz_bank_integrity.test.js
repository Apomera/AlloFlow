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

function collect(src, re) {
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const opts = m[3].split(/',\s*'/).map((s) => s.replace(/^'/, '').replace(/'$/, '').trim());
    out.push({ q: m[1], a: m[2], opts });
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
  // KNOWN GAP, pinned so it cannot worsen: the correct answer is the uniquely
  // longest option in 16 of 30 practice questions (53%), against a ~25-33% chance
  // baseline. Reordering cannot fix this -- it needs the distractors rewritten to
  // comparable length, which is a content job and is NOT done here.
  const uniqueLongestPct = (rows) => {
    let n = 0;
    rows.forEach((x) => {
      const lens = x.opts.map((o) => o.length);
      const mx = Math.max(...lens);
      if (x.a.length === mx && lens.filter((l) => l === mx).length === 1) n += 1;
    });
    return 100 * n / rows.length;
  };

  it('does not get worse in the practice bank', () => {
    expect(uniqueLongestPct(practice)).toBeLessThanOrEqual(55);
  });

  it('does not get worse in the boss rounds', () => {
    expect(uniqueLongestPct(boss)).toBeLessThanOrEqual(40);
  });
});
