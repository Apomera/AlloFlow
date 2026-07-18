import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderFractions(state = {}) {
  return renderTool('fractions', { _fractions: { navMode: 'practice', ...state } });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fractions.js', 'fractions');
});

describe('Fractions Lab signed operations', () => {
  it('normalizes denominator signs and zero consistently', () => {
    const normalize = window.__FractionsCore.normalizeFractionPair;
    expect(normalize(4, -6)).toEqual([-2, 3]);
    expect(normalize(-4, -6)).toEqual([2, 3]);
    expect(normalize(0, -8)).toEqual([0, 1]);
  });

  it('classifies positive, zero, negative, and undefined results', () => {
    const classify = window.__FractionsCore.classifyFractionResultSign;
    expect(classify(5, false)).toBe('positive');
    expect(classify(0, false)).toBe('zero');
    expect(classify(-2, false)).toBe('negative');
    expect(classify(2, true)).toBe('undefined');
  });

  it('offers an accessible predict-reveal workflow for signed operands', () => {
    const html = renderFractions({ tab: 'operations', signedFractions: true, num1: 1, den1: 2, num2: -3, den2: 4, opMode: 'div' });
    expect(html).toContain('Sign Detective: predict the result');
    expect(html).toContain('name="fraction-sign-prediction"');
    expect(html).toContain('Check sign and reveal');
    expect(html).toContain('Predict the sign before revealing the exact value.');
    expect(html).not.toContain('The exact result is -2/3');
  });

  it('reveals a normalized exact result after a prediction check', () => {
    const html = renderFractions({
      tab: 'operations',
      signedFractions: true,
      num1: 1,
      den1: 2,
      num2: -3,
      den2: 4,
      opMode: 'div',
      signPrediction: 'negative',
      signFeedback: { key: 'div|1|2|-3|4', correct: true, actual: 'negative' }
    });
    expect(html).toContain('The exact result is -2/3, which is negative.');
    expect(html).toContain('aria-live="polite"');
  });

  it('keeps signed controls bounded and invalidates stale predictions', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fractions.js', 'utf8');
    expect(source).toContain("min: signedFractions ? -20 : 0");
    expect(source).toContain("o.signPrediction = null; o.signFeedback = null;");
    expect(source).toContain("opMode: op[0], signPrediction: null, signFeedback: null");
    expect(source).toContain("role: 'switch', 'aria-checked': signedFractions");
  });
});
