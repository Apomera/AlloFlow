import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const OUTCOMES = [
  { label: 'Red', count: 2, color: '#ef4444' },
  { label: 'Blue', count: 1, color: '#3b82f6' },
];

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_probability.js', 'probability');
});

describe('Probability Lab marble model', () => {
  it('derives probabilities from marble counts', () => {
    const prepared = window.__ProbabilityCore.marbleOutcomes(OUTCOMES);
    expect(prepared.map((o) => o.count)).toEqual([2, 1]);
    expect(prepared[0].prob).toBeCloseTo(2 / 3);
    expect(prepared[1].prob).toBeCloseTo(1 / 3);
    expect(prepared.reduce((sum, o) => sum + o.prob, 0)).toBeCloseTo(1);
  });

  it('draws through the remaining pool before refilling', () => {
    const draw = window.__ProbabilityCore.drawMarble;
    const first = draw(OUTCOMES, null, 0.99);
    expect(first).toMatchObject({ label: 'Blue', remaining: ['Red', 'Red'], refilled: true });

    const second = draw(OUTCOMES, first.remaining, 0.99);
    expect(second).toMatchObject({ label: 'Red', remaining: ['Red'], refilled: false });

    const third = draw(OUTCOMES, second.remaining, 0.5);
    expect(third).toMatchObject({ label: 'Red', remaining: [], refilled: false });

    const fourth = draw(OUTCOMES, third.remaining, 0.99);
    expect(fourth).toMatchObject({ label: 'Blue', remaining: ['Red', 'Red'], refilled: true });
  });

  it('reports conditional next-draw odds and refill state', () => {
    const odds = window.__ProbabilityCore.marbleOdds;
    const midBag = odds(OUTCOMES, ['Red', 'Red']);
    expect(midBag.total).toBe(2);
    expect(midBag.outcomes.map((o) => o.probability)).toEqual([1, 0]);
    expect(midBag.refillNext).toBe(false);

    const empty = odds(OUTCOMES, []);
    expect(empty.refillNext).toBe(true);
    expect(empty.outcomes[0].probability).toBeCloseTo(2 / 3);
  });

  it('resets simulation-only state and stops Auto-Run', () => {
    expect(window.__ProbabilityCore.resetPatch()).toEqual({
      results: [], trials: 0, convergenceHistory: [], lastResult: null,
      _mbRemaining: null, _piPoints: [], _autoRunning: false, _bestStreak: 0,
    });
  });

  it('renders live conditional odds for learners', () => {
    const html = renderTool('probability', {
      probability: {
        mode: 'marbleBag', mbWithoutReplacement: true,
        customOutcomes: OUTCOMES, _mbRemaining: ['Red', 'Red'],
        results: [], trials: 0, convergenceHistory: [],
      },
    });
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Next draw odds: Red 2/2 (100.0%), Blue 0/2 (0.0%)');
  });

  it('updates progression for manual and automatic core experiments', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_probability.js', 'utf8');
    expect(source).toContain('totalTrials: (current.totalTrials || 0) + trialsAdded');
    expect(source).toContain('totalTrials: (_pd.totalTrials || 0) + 1');
    expect(source).toContain("used[d.mode || 'coin'] = true");
    expect(source).toContain("_used3[_pd.mode || 'coin'] = true");
    expect(source).toContain('onClick: resetTrials');
  });
});
