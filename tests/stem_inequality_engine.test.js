import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Inequality Grapher's math engine: the
// expression parser (simple / compound / absolute-value forms), the
// step-by-step solver, and the quiz banks. The parser and solver are
// render-scope closures, so they are executed from source slices.

const src = fs.readFileSync('stem_lab/stem_tool_inequality.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_inequality.js', 'utf8');

function extractFn(startMarker, endMarker, name) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn ' + name + ';')();
}

const parseIneq = extractFn('var parseIneq = function', 'var ineq = parseIneq(d.expr)', 'parseIneq');
const solveInequality = extractFn('var solveInequality = function', 'var zoomRange', 'solveInequality');

describe('expression parser', () => {
  it('parses simple inequalities with every operator', () => {
    expect(parseIneq('x > 2')).toMatchObject({ compound: false, v: 'x', op: '>', val: 2 });
    expect(parseIneq('x <= -1.5')).toMatchObject({ op: '<=', val: -1.5 });
    expect(parseIneq('x ≥ 0')).toMatchObject({ op: '>=', val: 0 });
  });

  it('parses ascending compounds as written', () => {
    expect(parseIneq('-3 <= x <= 4')).toMatchObject({ compound: true, lo: -3, op1: '<=', op2: '<=', hi: 4 });
    expect(parseIneq('0 < x < 6')).toMatchObject({ lo: 0, hi: 6, op1: '<', op2: '<' });
  });

  it('normalizes descending compounds instead of rendering them backwards (regression pin)', () => {
    // "5 > x > 1" means 1 < x < 5. Before the fix this produced lo=5, hi=1:
    // the interval printed as (5, 1) and test-a-value called every number
    // "not a solution".
    expect(parseIneq('5 > x > 1')).toMatchObject({ compound: true, lo: 1, op1: '<', op2: '<', hi: 5 });
    // 5 >= x > 1  ≡  1 < x <= 5: the = bar must follow its own endpoint.
    expect(parseIneq('5 >= x > 1')).toMatchObject({ lo: 1, op1: '<', op2: '<=', hi: 5 });
    expect(parseIneq('10 ≥ x ≥ -10')).toMatchObject({ lo: -10, op1: '<=', op2: '<=', hi: 10 });
  });

  it('rejects mixed-direction compounds, which describe no interval', () => {
    expect(parseIneq('3 < x > 2')).toBeNull();
    expect(parseIneq('3 > x < 2')).toBeNull();
  });

  it('decomposes absolute values: < into a band, > into a union with absRight', () => {
    expect(parseIneq('|x - 3| < 5')).toMatchObject({ compound: true, lo: -2, hi: 8, op1: '<', op2: '<' });
    expect(parseIneq('|x + 2| <= 4')).toMatchObject({ compound: true, lo: -6, hi: 2, op1: '<=', op2: '<=' });
    const union = parseIneq('|x - 3| > 5');
    expect(union).toMatchObject({ compound: false, op: '<', val: -2 });
    expect(union.absRight).toMatchObject({ op: '>', val: 8 });
    const unionEq = parseIneq('|x - 1| >= 2');
    expect(unionEq).toMatchObject({ op: '<=', val: -1 });
    expect(unionEq.absRight).toMatchObject({ op: '>=', val: 3 });
  });
});

describe('step-by-step solver', () => {
  it('solves ax + b op c with positive coefficients', () => {
    expect(solveInequality('2x+3<7').solution).toBe('x < 2');
    expect(solveInequality('5x-2>8').solution).toBe('x > 2');
    expect(solveInequality('x+4>=6').solution).toBe('x >= 2');
  });

  it('flips the inequality when dividing by a negative, and says so', () => {
    const steps = solveInequality('-3x+1<=10');
    expect(steps.solution).toBe('x >= -3');
    expect(steps.some((s) => s.warning && /FLIP/.test(s.text))).toBe(true);
    expect(solveInequality('-2x-4>2').solution).toBe('x < -3');
  });

  it('keeps unflipped positive divisions honest', () => {
    const steps = solveInequality('4x-1<11');
    expect(steps.solution).toBe('x < 3');
    expect(steps.some((s) => s.warning)).toBe(false);
  });
});

describe('quiz banks', () => {
  const banks = (() => {
    const start = src.indexOf('var QUIZ_EASY = [');
    const end = src.indexOf('var quizTier', start);
    // eslint-disable-next-line no-new-func
    return new Function(src.slice(start, end) + '\nreturn { QUIZ_EASY, QUIZ_MEDIUM, QUIZ_HARD };')();
  })();
  const all = [...banks.QUIZ_EASY, ...banks.QUIZ_MEDIUM, ...banks.QUIZ_HARD];

  it('every question has 4 unique options containing its answer', () => {
    for (const q of all) {
      expect(q.opts.length, q.q).toBe(4);
      expect(new Set(q.opts).size, q.q).toBe(4);
      expect(q.opts, q.q).toContain(q.a);
    }
  });

  it('word problems name the same variable their options use (regression pin)', () => {
    // The roller-coaster prompt once asked about "height h" while every
    // option answered in x.
    for (const q of banks.QUIZ_HARD) {
      expect(q.q, q.q).not.toMatch(/\b(for|variable)\s+[a-wyz]\b(?!\w)/);
    }
    expect(src).not.toContain('height h');
  });

  it('answer semantics match their phrasings', () => {
    const byPrompt = (needle) => all.find((q) => q.q.includes(needle));
    expect(byPrompt('at least 48').a).toBe('x >= 48');
    expect(byPrompt('under 65').a).toBe('x < 65');
    expect(byPrompt('more than 70').a).toBe('x > 70');
    expect(byPrompt('at most -2').a).toBe('x <= -2');
    expect(byPrompt('strictly between 0 and 6').a).toBe('0 < x < 6');
    expect(byPrompt('(inclusive)').a).toBe('-3 <= x <= 4');
  });

  it('options shuffle with Fisher-Yates, not the biased comparator (regression pins)', () => {
    expect(src).not.toContain('sort(function() { return Math.random() - 0.5; })');
    expect(src).toContain('var shuffled = q.opts.slice();');
    expect(src).toContain('shuffled[fy] = shuffled[fj]; shuffled[fj] = ft;');
  });
});

describe('union rendering surfaces (source pins)', () => {
  it('interval notation, set-builder, test-a-value, and the graph all handle absRight', () => {
    // The file stores the union symbol as its \u escape.
    expect(src).toContain("intervalStr += ' \\u222A ' +");
    expect(src).toContain("' or ' + ineq.v + ' ' + rDispOp + ' '");
    expect(src).toContain('if (!testResult && ineq.absRight) {');
    expect(src).toContain('ineq.absRight && (function() {');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
