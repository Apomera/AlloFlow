import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_unitconvert.js', 'unitConvert');
});

describe('Unit Converter scientific core', () => {
  it('uses exact or standards-based factors for common conversions', () => {
    const convert = window.__UnitConvertCore.convertUnitValue;
    expect(convert(1, 'ft', 'in', 'length')).toBeCloseTo(12, 12);
    expect(convert(100, 'km/h', 'm/s', 'speed')).toBeCloseTo(27.7777777778, 9);
    expect(convert(1, 'knots', 'm/s', 'speed')).toBeCloseTo(1852 / 3600, 12);
    expect(convert(1, 'psi', 'Pa', 'pressure')).toBeCloseTo(6894.757293168, 9);
    expect(convert(1, 'oz', 'g', 'weight')).toBeCloseTo(28.349523125, 10);
  });

  it('handles affine temperatures and rejects incompatible units', () => {
    const convert = window.__UnitConvertCore.convertUnitValue;
    expect(convert(0, '\u00B0C', '\u00B0F', 'temperature')).toBeCloseTo(32, 12);
    expect(convert(32, '\u00B0F', 'K', 'temperature')).toBeCloseTo(273.15, 12);
    expect(convert(0, 'K', '\u00B0C', 'temperature')).toBeCloseTo(-273.15, 12);
    expect(convert(1, 'm', 'kg', 'length')).toBeNaN();
    expect(convert('not-a-number', 'm', 'ft', 'length')).toBeNaN();
  });
});

describe('Unit Converter quiz grading', () => {
  it('treats authored tolerances as absolute rather than percentages', () => {
    const evaluate = window.__UnitConvertCore.evaluateNumericAnswer;
    expect(evaluate('28.8', 28.35, 0.5).correct).toBe(true);
    expect(evaluate('28.9', 28.35, 0.5).correct).toBe(false);
    expect(evaluate('40', 28.35, 0.5).correct).toBe(false);
    expect(evaluate('3.83', 3.785, 0.05).correct).toBe(true);
    expect(evaluate('3.90', 3.785, 0.05).correct).toBe(false);
  });

  it('rejects blank, partial, and non-finite numeric input', () => {
    const evaluate = window.__UnitConvertCore.evaluateNumericAnswer;
    expect(evaluate('', 12, 0.01).valid).toBe(false);
    expect(evaluate('12abc', 12, 0.01).valid).toBe(false);
    expect(evaluate('Infinity', 12, 0.01).valid).toBe(false);
    expect(evaluate('12', 12, 0.01)).toMatchObject({ valid: true, correct: true });
  });

  it('provides targeted ratio, prefix, and temperature diagnoses', () => {
    const diagnose = window.__UnitConvertCore.diagnoseNumericAnswer;
    expect(diagnose(1 / 12, 12, 'in', 0.01)).toContain('ratio is reversed');
    expect(diagnose(120, 12, 'in', 0.01)).toContain('metric-prefix slip');
    expect(diagnose(20, 32, '\u00B0F', 0.01)).toContain('offset');
  });

  it('renders valid defaults and a visible keyboard-independent submit control', () => {
    const defaultHtml = renderTool('unitConvert', {});
    expect(defaultHtml).not.toContain('NaN');
    expect(defaultHtml).toContain('Mass');
    expect(defaultHtml).toContain('aria-label="Show next unit fact"');

    const quizHtml = renderTool('unitConvert', {
      unitConvert: {
        tab: 'quiz',
        category: 'length',
        value: 1,
        fromUnit: 'm',
        toUnit: 'ft',
        quizDraft: '',
        quizDraftError: 'Enter a valid number before checking your answer.',
        quiz: { q: 'How many inches in 1 foot?', a: 12, unit: 'in', tol: 0.01, answered: false, startTime: 1 }
      }
    });
    expect(quizHtml).toContain('Check answer');
    expect(quizHtml).toContain('role="alert"');
    expect(quizHtml).toContain('Enter a valid number before checking your answer.');
  });
});
