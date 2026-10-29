import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function loadHelpers() {
  const window = { AlloModules: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve('math_helpers_module.js'), 'utf8'), {
    window, console: { log() {}, warn() {} }, setTimeout, clearTimeout, AbortController, Promise,
  });
  return window.AlloModules.MathHelpers;
}

describe('conservative math script notation equivalence', () => {
  it.each([
    ['x^{2}', 'x^2'],
    ['x ^ { 2 } + 3', 'x^2+3'],
    ['x_{1}', 'x_1'],
    ['x^{n}', 'x^n'],
    ['\\(x^{2}\\)', '$x^2$'],
    ['x²', 'x^2'],
    ['x¹²', 'x^{12}'],
    ['x⁻²', 'x^{-2}'],
    ['xⁿ', 'x^n'],
    ['a₁', 'a_1'],
    ['a₁₂', 'a_{12}'],
    ['x^{2^{3}}', 'x^{2^3}'],
  ])('matches %s and %s in either direction', (first, second) => {
    const helpers = loadHelpers();
    expect(helpers.areMathAnswersEquivalent(first, second)).toBe(true);
    expect(helpers.areMathAnswersEquivalent(second, first)).toBe(true);
  });

  it.each([
    ['x^{2}', 'x^3'],
    ['x^{2}', 'x2'],
    ['x²', 'x2'],
    ['a₁', 'a1'],
    ['x^{12}', 'x^12'],
    ['x¹²', 'x^12'],
    ['x_{12}', 'x_12'],
    ['x^{2+1}', 'x^2+1'],
    ['x^{-2}', 'x^2'],
    ['x^{ab}', 'x^ab'],
    ['x^{2', 'x^2'],
    ['x^2}', 'x^2'],
    ['x_2', 'x^2'],
    ['(x+1)^2', 'x^2+1'],
    ['x^{2}', 'x*x'],
    ['x_{1}', 'x_2'],
  ])('keeps %s different from %s', (student, key) => {
    const helpers = loadHelpers();
    expect(helpers.areMathAnswersEquivalent(student, key)).toBe(false);
    expect(helpers.areMathAnswersEquivalent(key, student)).toBe(false);
  });

  it('preserves exact numeric fraction matching and simplify requirements', () => {
    const helpers = loadHelpers();
    expect(helpers.areMathAnswersEquivalent('\\frac{5}{6}', '10/12')).toBe(true);
    expect(helpers.areMathAnswersEquivalent('\\dfrac{1}{2}', '.5')).toBe(true);
    expect(helpers.areMathAnswersEquivalent('\\tfrac{4}{6}', '5/6')).toBe(false);
    const result = helpers.gradeMathSelfAssessment([
      { id: 'simplify', question: 'Simplify 4/6.', taskType: 'simplify', answer: '2/3' },
      { id: 'expression', question: 'Write x squared.', taskType: 'compute', answer: 'x^2' },
    ], { simplify: '4/6', expression: 'x^{2}' });
    expect(result.score).toBe(1);
    expect(result.results.map(row => row.correct)).toEqual([false, true]);
  });

  it('uses the same notation rule for Check My Work without a model call', async () => {
    const helpers = loadHelpers();
    let results = {};
    const deps = {
      mathCheckResults: results, mathHintData: {}, addToast: vi.fn(), t: () => '',
      callGemini: vi.fn(), warnLog: vi.fn(), handleScoreUpdate: vi.fn(),
      setMathCheckResults(update) {
        results = typeof update === 'function' ? update(results) : update;
        deps.mathCheckResults = results;
      },
    };
    await helpers.handleCheckMathWork('notation', 0, 'Write x squared.', 'x^2', [], 'x^{2}', deps);
    expect(deps.callGemini).not.toHaveBeenCalled();
    expect(results.notation[0]).toMatchObject({ verdict: 'correct', score: 100, fastPath: true });
  });
});
