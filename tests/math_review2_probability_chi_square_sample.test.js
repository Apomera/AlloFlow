// Math review 2 (2026-10-19): two ways the chi-squared fairness tile lied.
//  1. A model with ONE possible outcome has df = 0: there is nothing to test.
//     The tile said "Not yet - needs 5 trials" and kept saying it at 10, 100,
//     1,000 trials. It now says the test does not apply.
//  2. The statistic took its expected counts from d.trials but its observed
//     counts from d.results. A saved state carrying trials without results
//     (or fewer results than trials) scored every missing roll as a zero, so a
//     die nobody rolled read "Biased" with chi-squared = trials. The test now
//     runs on the results it can actually count.
// MATH_REVIEW2_PROBABILITY_SRC lets a mutation run point this at a variant.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_PROBABILITY_SRC || 'stem_lab/stem_tool_probability.js';
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ');
const panel = (html) => { const m = text(html).match(/Statistical Analysis[\s\S]{0,880}/); return m ? m[0] : ''; };
// The verdicts themselves, not the tile label "Fairness (α=0.05)".
const FAIR = '✅ Fair';
const BIASED = '❌ Biased';

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'probability');
});

describe('a model with only one possible outcome', () => {
  const certain = [
    { label: 'A', numerator: 20, denominator: 20, color: '#ef4444' },
    { label: 'B', numerator: 0, denominator: 20, color: '#3b82f6' },
  ];
  const render = (n) => panel(renderTool('probability', { probability: {
    mode: 'custom', customSubMode: 'fraction', customOutcomes: certain, results: Array(n).fill('A'), trials: n } }));

  for (const n of [10, 100, 1000]) {
    it('says the test does not apply at ' + n + ' trials, instead of asking for more', () => {
      const s = render(n);
      expect(s, 'no stats panel').not.toBe('');
      expect(s.includes('needs 5 trials'), s).toBe(false);
      expect(s.includes('Not yet'), s).toBe(false);
      expect(s.includes('N/A here'), s).toBe(true);
      expect(s.includes('only one outcome'), s).toBe(true);
      expect(s.includes(FAIR) || s.includes(BIASED), s).toBe(false);
    });
  }

  it('a one-colour marble bag gets the same answer', () => {
    const s = panel(renderTool('probability', { probability: {
      mode: 'marbleBag', customOutcomes: [{ label: 'Red', count: 6, color: '#ef4444' }],
      results: Array(40).fill('Red'), trials: 40 } }));
    expect(s.includes('N/A here'), s).toBe(true);
    expect(s.includes('needs 5 trials'), s).toBe(false);
  });

  it('a two-outcome model still gets its verdict', () => {
    const s = panel(renderTool('probability', { probability: { mode: 'coin', results: Array(50).fill('H').concat(Array(50).fill('T')), trials: 100 } }));
    expect(s.includes(FAIR), s).toBe(true);
    expect(s.includes('N/A here'), s).toBe(false);
  });
});

describe('a saved run whose results were not kept', () => {
  it('does not call a die nobody rolled biased', () => {
    const s = panel(renderTool('probability', { probability: { mode: 'dice', diceSides: 6, trials: 60 } }));
    expect(s, 'no stats panel').not.toBe('');
    expect(s.includes(BIASED), s).toBe(false);
    expect(s.includes(FAIR), s).toBe(false);
    // chi-squared of nothing against 60 phantom rolls was exactly 60.00.
    expect(/60\.00/.test(s), s).toBe(false);
  });

  it('does not call a coin nobody flipped biased', () => {
    const s = panel(renderTool('probability', { probability: { mode: 'coin', trials: 200 } }));
    expect(s.includes(BIASED), s).toBe(false);
  });

  it('tests the results it has, not the trial counter', () => {
    // 60 recorded rolls, perfectly even, under a counter that claims 600.
    const results = [1, 2, 3, 4, 5, 6].flatMap((f) => Array(10).fill(f));
    const s = panel(renderTool('probability', { probability: { mode: 'dice', diceSides: 6, trials: 600, results } }));
    // Against 600 phantom rolls the 60 real ones scored chi-squared = 486.
    expect(s.includes(BIASED), s).toBe(false);
    expect(/486\.00/.test(s), s).toBe(false);
    expect(s.includes('Statistic 0.00'), 'chi-squared of a perfectly even sample is 0: ' + s).toBe(true);
    expect(s.includes(FAIR), s).toBe(true);
  });
});
