// Math review 2 (2026-10-19): Balance Master ("60+ dice rolls, all within 10%
// of expected") was a coin flip weighted 87:13 in the student's favour. The
// check allowed 10 percentage POINTS around a d6's 16.7% — a 60% relative
// window — so a fair die passed it about 87% of the time at the 60-roll
// minimum, before the law of large numbers had done anything. "Within 10% of
// expected" now means what it says: every face's count within 10% of its own
// expected count. That fails ~99% of the time at 60 rolls and is a near
// certainty by a few thousand, so the badge rewards rolling until the faces
// actually even out.
// MATH_REVIEW2_PROBABILITY_SRC lets a mutation run point this at a variant.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_PROBABILITY_SRC || 'stem_lab/stem_tool_probability.js';

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'probability');
});

function balanceClaimable(results, sides = 6) {
  const html = renderTool('probability', { probability: { mode: 'dice', diceSides: sides, results, trials: results.length, _completedChallenges: [] } });
  const host = document.createElement('div');
  host.innerHTML = html;
  const title = Array.from(host.querySelectorAll('p')).find((p) => p.textContent.startsWith('Balance Master '));
  expect(title, 'Balance Master row not rendered').toBeTruthy();
  return !!title.parentElement.parentElement.querySelector('button[aria-label="Claim"]');
}

const fromCounts = (counts) => counts.flatMap((c, i) => Array(c).fill(i + 1));
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const fairRolls = (rnd, n, sides) => Array.from({ length: n }, () => Math.floor(rnd() * sides) + 1);

describe('Balance Master', () => {
  it('does not pass a lopsided 60-roll sample (13 vs 7 on a d6)', () => {
    // Max deviation 5 points: inside the old 10-point window, but face 1 is
    // 30% over its expected 10 and face 2 is 30% under.
    expect(balanceClaimable(fromCounts([13, 7, 10, 10, 10, 10]))).toBe(false);
  });

  it('passes when every face is within 10% of its expected count', () => {
    expect(balanceClaimable(fromCounts([104, 96, 100, 100, 108, 92]))).toBe(true);
    // 111 is 11% over 100: just outside.
    expect(balanceClaimable(fromCounts([111, 89, 100, 100, 100, 100]))).toBe(false);
  });

  it('still needs the 60-roll minimum', () => {
    expect(balanceClaimable(fromCounts([5, 5, 5, 5, 5, 5]))).toBe(false);
  });

  it('a fair die rarely passes at 60 rolls (was ~87%)', () => {
    const rnd = lcg(20261019);
    let passes = 0;
    const reps = 120;
    for (let r = 0; r < reps; r++) if (balanceClaimable(fairRolls(rnd, 60, 6))) passes++;
    expect(passes / reps, 'fair d6 passed ' + passes + '/' + reps + ' at 60 rolls').toBeLessThan(0.10);
  }, 120000);

  it('stays earnable: a fair die passes almost always by 6,000 rolls', () => {
    const rnd = lcg(7);
    let passes = 0;
    const reps = 30;
    for (let r = 0; r < reps; r++) if (balanceClaimable(fairRolls(rnd, 6000, 6))) passes++;
    expect(passes / reps, 'fair d6 passed ' + passes + '/' + reps + ' at 6,000 rolls').toBeGreaterThan(0.85);
  }, 120000);

  it('tells the student what "within 10%" means', () => {
    const html = renderTool('probability', { probability: { mode: 'dice', results: [], trials: 0 } });
    expect(html).toContain('within 10% of its expected count');
  });
});
