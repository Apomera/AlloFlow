import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});

describe('Microbiology resistance investigation', () => {
  it('models a resistance advantage consistently', () => {
    const probabilities = window.__MicrobiologyCore.getResistanceKillProbabilities;
    expect(probabilities(0)).toEqual({ sensitive: 0, resistant: 0 });
    expect(probabilities(5).resistant).toBeLessThan(probabilities(5).sensitive);
    expect(probabilities(100)).toEqual({ sensitive: 1, resistant: 0.05 });
  });

  it('classifies and evaluates observed trends', () => {
    const core = window.__MicrobiologyCore;
    expect(core.classifyResistanceTrend(3, 25)).toBe('increase');
    expect(core.classifyResistanceTrend(50, 53)).toBe('similar');
    expect(core.classifyResistanceTrend(30, 20)).toBe('decrease');
    expect(core.evaluateResistancePrediction(3, 25, 'increase')).toMatchObject({ correct: true, observed: 'increase', change: 22 });
  });

  it('adapts the explanation to initial variation', () => {
    const evaluate = window.__MicrobiologyCore.evaluateResistanceExplanation;
    expect(evaluate(3, 'selection')).toMatchObject({ correct: true, expected: 'selection' });
    expect(evaluate(0, 'variation-required')).toMatchObject({ correct: true, expected: 'variation-required' });
    expect(evaluate(0, 'selection').correct).toBe(false);
  });

  it('keeps the workflow explicit and accessible', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
    expect(source).toContain('1. Predict the resistant share after exposure');
    expect(source).toContain('Choose a prediction to unlock the culture controls.');
    expect(source).toContain('disabled: !investigationReady || day >= duration');
    expect(source).toContain("name: 'micro-resistance-prediction'");
    expect(source).toContain('2. Observe: ');
    expect(source).toContain('3. Explain the observed pattern');
    expect(source).toContain("name: 'micro-resistance-explanation'");
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).not.toContain('var killRes = 0.05;');
  });
});
