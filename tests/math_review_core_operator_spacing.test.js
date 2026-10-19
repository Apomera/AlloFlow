// Self-grade has no AI fallback: an answer counts only if it matches the key.
// A space next to an operator made a right answer wrong ("5x + 3" for a key of
// "5x+3", "x>3" for "x > 3"); the four right answers below scored 0/4.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const HELPERS = process.env.MATH_REVIEW_HELPERS_MODULE || 'math_helpers_module.js';

function loadHelpers() {
  const window = { AlloModules: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(HELPERS), 'utf8'), {
    window, console: { log() {}, warn() {} }, setTimeout, clearTimeout, AbortController, Promise,
  });
  return window.AlloModules.MathHelpers;
}

describe('answer matching ignores spacing beside operators', () => {
  it('self-grade accepts right answers spaced differently from the key', () => {
    const H = loadHelpers();
    const grade = H.gradeMathSelfAssessment([
      { id: 'a', question: '2x + 3x + 3', taskType: 'simplify', answer: '5x+3' },
      { id: 'b', question: '2x > 6', taskType: 'solve', answer: 'x > 3' },
      { id: 'c', question: 'x^2 + 5x + 6', taskType: 'factor', answer: '(x+2)(x+3)' },
      { id: 'd', question: 'Find the vertex of y = (x - 2)^2 - 1', taskType: 'compute', answer: '(2, -1)' },
    ], { a: '5x + 3', b: 'x>3', c: '(x + 2)(x + 3)', d: '(2,-1)' });
    expect(grade.results.map(result => result.correct)).toEqual([true, true, true, true]);
    expect(grade.score).toBe(4);
  });

  it.each([
    ['4 + 2', '42'],
    ['1 1/2', '11/2'],
    ['2 x', '2xy'],
    ['x > 3', 'x < 3'],
  ])('still rejects %s for %s', (student, key) => {
    expect(loadHelpers().areMathAnswersEquivalent(student, key)).toBe(false);
  });
});
