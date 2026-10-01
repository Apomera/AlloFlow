import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_probability.js', 'probability');
});

describe('Probability Lab sampling uncertainty', () => {
  it('computes published Wilson 95% interval examples', () => {
    const interval = window.__ProbabilityCore.wilsonInterval;

    expect(interval(5, 10)).toMatchObject({ valid: true, successes: 5, trials: 10, observed: 0.5 });
    expect(interval(5, 10).low).toBeCloseTo(0.2366, 3);
    expect(interval(5, 10).high).toBeCloseTo(0.7634, 3);
    expect(interval(0, 10).low).toBe(0);
    expect(interval(0, 10).high).toBeCloseTo(0.2775, 3);
    expect(interval(90, 100).low).toBeCloseTo(0.8256, 3);
    expect(interval(90, 100).high).toBeCloseTo(0.9448, 3);
  });

  it('stays bounded and narrows as evidence accumulates', () => {
    const interval = window.__ProbabilityCore.wilsonInterval;
    const short = interval(0, 5);
    const long = interval(0, 100);
    const empty = interval(0, 0);

    expect(short.low).toBeGreaterThanOrEqual(0);
    expect(short.high).toBeLessThanOrEqual(1);
    expect(long.high - long.low).toBeLessThan(short.high - short.low);
    expect(empty).toMatchObject({ valid: false, observed: null, low: 0, high: 1 });
  });

  it('renders an accessible interval for the outcome tracked by convergence', () => {
    const results = Array(12).fill('H').concat(Array(8).fill('T'));
    const html = renderTool('probability', { probability: {
      mode: 'coin', trials: results.length, results,
      convergenceHistory: [{ t: 10, pct: 70 }, { t: 20, pct: 60 }],
    } });

    expect(html).toContain('Sampling Uncertainty');
    expect(html).toContain('Wilson 95% interval');
    expect(html).toContain('Tracked outcome');
    expect(html).toContain('Heads');
    expect(html).toContain('12 of 20');
    expect(html).toContain('60.0%');
    expect(html).toContain('50.0%');
    expect(html).toContain('Compatible with the model.');
    expect(html).toMatch(/role="img" aria-label="Heads: observed 12 of 20 \(60\.0 percent\); theoretical 50\.0 percent; Wilson 95 percent interval/);
  });

  it('flags an unusual run without declaring the model biased', () => {
    const results = Array(20).fill('H');
    const html = renderTool('probability', { probability: {
      mode: 'coin', trials: results.length, results,
      convergenceHistory: [{ t: 10, pct: 100 }, { t: 20, pct: 100 }],
    } });

    expect(html).toContain('Unusual for this model.');
    expect(html).toContain('One unusual sample can happen');
    expect(html).toContain('before concluding the model is biased');
  });

  it('withholds the binomial interval for dependent draws', () => {
    const results = ['Red', 'Blue', 'Red', 'Blue', 'Red', 'Blue'];
    const html = renderTool('probability', { probability: {
      mode: 'marbleBag', mbWithoutReplacement: true,
      customOutcomes: [
        { label: 'Red', count: 3, color: '#ef4444' },
        { label: 'Blue', count: 3, color: '#3b82f6' },
      ],
      trials: results.length, results,
    } });

    expect(html).toContain('Interval paused:');
    expect(html).toContain('without-replacement pulls are dependent');
    expect(html).not.toContain('Compatible with the model.');
    expect(html).not.toContain('Unusual for this model.');
  });

  it('does not invent an interval from a legacy counter with no sample', () => {
    const html = renderTool('probability', { probability: {
      mode: 'dice', diceSides: 20, trials: 500, results: [],
      convergenceHistory: [{ t: 250, pct: 5 }, { t: 500, pct: 5 }],
    } });

    expect(html).not.toContain('Sampling Uncertainty');
  });
});
