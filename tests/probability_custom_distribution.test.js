import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_probability.js', 'probability');
});

describe('Probability Lab custom distributions', () => {
  it('prepares valid fraction and marble-count models', () => {
    const prepare = window.__ProbabilityCore.prepareCustomOutcomes;
    const fractions = prepare([
      { label: 'Win', numerator: 1, denominator: 4 },
      { label: 'Not yet', numerator: 3, denominator: 4 },
    ], 'fraction');
    expect(fractions.valid).toBe(true);
    expect(fractions.total).toBe(1);
    expect(fractions.outcomes.map((o) => o.prob)).toEqual([0.25, 0.75]);

    const marbles = prepare([
      { label: 'Red', count: 3 },
      { label: 'Blue', count: 1 },
    ], 'marbleBag');
    expect(marbles.valid).toBe(true);
    expect(marbles.outcomes.map((o) => o.prob)).toEqual([0.75, 0.25]);
  });

  it('rejects incomplete totals and out-of-range probabilities', () => {
    const prepare = window.__ProbabilityCore.prepareCustomOutcomes;
    const incomplete = prepare([
      { label: 'A', numerator: 1, denominator: 2 },
      { label: 'B', numerator: 2, denominator: 5 },
    ], 'fraction');
    expect(incomplete.valid).toBe(false);
    expect(incomplete.total).toBeCloseTo(0.9);
    expect(incomplete.reason).toContain('90.0%');

    const impossible = prepare([
      { label: 'A', prob: 1.2 },
      { label: 'B', prob: -0.2 },
    ], 'slider');
    expect(impossible.valid).toBe(false);
    expect(impossible.reason).toContain('between 0% and 100%');
  });

  it('requires nonempty, case-insensitively unique outcome names', () => {
    const prepare = window.__ProbabilityCore.prepareCustomOutcomes;
    expect(prepare([
      { label: 'Result', prob: 0.5 },
      { label: ' result ', prob: 0.5 },
    ], 'slider')).toMatchObject({ valid: false });
    expect(prepare([
      { label: '', prob: 0.5 },
      { label: 'B', prob: 0.5 },
    ], 'slider').reason).toContain('every outcome a name');
  });

  it('renders an accessible error and disables simulation for an invalid model', () => {
    const html = renderTool('probability', {
      probability: {
        mode: 'custom', customSubMode: 'fraction',
        customOutcomes: [
          { label: 'A', numerator: 1, denominator: 2, color: '#ef4444' },
          { label: 'B', numerator: 2, denominator: 5, color: '#3b82f6' },
        ],
        results: [], trials: 0, convergenceHistory: [],
      },
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain('Custom model not ready: Probabilities total 90.0%');
    expect(html).toMatch(/aria-label="Run 10 trials"[^>]*disabled/);
    expect(html).toMatch(/aria-label="Start automatic simulation"[^>]*disabled/);
  });

  it('shares preparation and reset behavior across manual edits and Auto-Run', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_probability.js', 'utf8');
    expect(source).toContain('var customModel = probabilityPrepareCustomOutcomes');
    expect(source).toContain('var _customModel3 = probabilityPrepareCustomOutcomes');
    expect(source).toContain('setProbabilityOutcomes(co)');
    expect(source).toContain('probabilityResetPatch(), { customOutcomes: outcomes }');
    expect(source).toContain('disabled: !customCanRun');
  });
});
