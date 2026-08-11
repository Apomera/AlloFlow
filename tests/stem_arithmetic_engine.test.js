import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Bank-verification layer for the Arithmetic Strategy Studio, complementing
// the interaction-focused arithmetic_strategy_studio.test.js: every stored
// answer and estimate is recomputed from the tool's own pure functions, so a
// bank edit that breaks the math (or drifts outside the tool's own estimate
// tolerance) fails here instead of reaching a student.

const src = fs.readFileSync('stem_lab/stem_tool_arithmetic.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_arithmetic.js', 'utf8');

const win = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(win);
const Pure = win.ArithmeticStrategyPure;
const { calculate, estimateFor, estimatePlan, assessEstimate, splitPlaceValue } = Pure;

describe('practice bank', () => {
  it('every stored answer and remainder is the true result', () => {
    for (const p of Pure.practice) {
      const r = calculate(p.op, p.a, p.b);
      expect(r.answer, p.id).toBe(p.answer);
      expect(r.remainder, p.id).toBe(p.remainder || 0);
    }
  });

  it('every stored estimate passes the tool\'s OWN grading tolerance', () => {
    // checkPractice grades against estimateFor(), not the stored estimate. If
    // a bank estimate drifted outside tolerance, a solved card would display
    // an estimate the tool itself would reject as unreasonable.
    for (const p of Pure.practice) {
      const check = assessEstimate(p.op, p.a, p.b, String(p.estimate));
      expect(check.reasonable, p.id + ' estimate ' + p.estimate + ' vs benchmark ' + check.benchmark).toBe(true);
    }
  });

  it('each operation offers levels 1-3 with two foundations problems', () => {
    for (const op of ['add', 'subtract', 'multiply', 'divide']) {
      const levels = Pure.practice.filter((p) => p.op === op).map((p) => p.level).sort();
      expect(levels, op).toEqual([1, 1, 2, 2, 3]);
    }
    expect(new Set(Pure.practice.map((p) => p.id)).size).toBe(Pure.practice.length);
  });
});

describe('error-detective bank', () => {
  it('the correct choice exists and distractors do not duplicate it', () => {
    for (const e of Pure.errors) {
      const ids = e.choices.map((c) => c.id);
      expect(ids, e.id).toContain(e.answer);
      expect(new Set(ids).size, e.id).toBe(ids.length);
    }
  });

  it('each explanation\'s arithmetic is true', () => {
    const expected = { e1: '85', e2: '216', e3: '312', e4: '10 remainder 5' };
    expect(calculate('add', 58, 27).answer).toBe(85);
    expect(calculate('subtract', 402, 186).answer).toBe(216);
    expect(calculate('multiply', 24, 13).answer).toBe(312);
    expect(calculate('divide', 65, 6)).toEqual({ answer: 10, remainder: 5 });
    for (const e of Pure.errors) expect(e.explain, e.id).toContain(expected[e.id]);
  });
});

describe('word-problem bank', () => {
  it('every context answer matches its division context', () => {
    for (const w of Pure.wordProblems) {
      const expected = Pure.expectedWordResponse(w);
      expect(expected.answer, w.id).toBe(w.answer);
      if (w.op === 'divide') {
        const raw = calculate('divide', w.a, w.b);
        expect(raw.remainder, w.id + ' stored remainder').toBe(w.remainder);
        if (w.divisionContext === 'round-up') expect(expected.answer).toBe(raw.answer + (raw.remainder ? 1 : 0));
        if (w.divisionContext === 'discard-remainder') expect(expected.answer).toBe(raw.answer);
        if ((w.divisionContext || 'report-remainder') === 'report-remainder') {
          expect(expected.requiresRemainder).toBe(true);
          expect(expected.remainder).toBe(raw.remainder);
        }
      } else {
        expect(calculate(w.op, w.a, w.b).answer, w.id).toBe(w.answer);
      }
    }
  });

  it('the two 67-divided-by-8 stories disagree on purpose (8 teams vs 9 boxes)', () => {
    const teams = Pure.wordProblems.find((w) => w.id === 'full-teams');
    const boxes = Pure.wordProblems.find((w) => w.id === 'supply-boxes');
    expect(teams.a).toBe(boxes.a);
    expect(teams.b).toBe(boxes.b);
    expect(Pure.expectedWordResponse(teams).answer).toBe(8);
    expect(Pure.expectedWordResponse(boxes).answer).toBe(9);
  });

  it('result explanations state the context answer', () => {
    for (const w of Pure.wordProblems) {
      expect(Pure.wordResultExplanation(w), w.id).toContain(String(w.answer));
    }
  });
});

describe('estimation engine', () => {
  it('add/subtract round both operands to the same friendly place', () => {
    expect(estimatePlan('add', 27, 35)).toMatchObject({ estimate: 70, left: 30, right: 40 });
    expect(estimatePlan('subtract', 12003, 4786).estimate).toBe(7000);
    expect(estimatePlan('add', 1249, 875).estimate).toBe(2100);
  });

  it('multiply rounds only the factor with the smaller relative error', () => {
    const plan = estimatePlan('multiply', 308, 24);
    expect(plan.estimate).toBe(7200);
    expect([plan.left, plan.right]).toEqual([300, 24]);
    const facts = estimatePlan('multiply', 7, 8);
    expect(facts.estimate).toBe(70);
  });

  it('divide builds compatible numbers, and handles the degenerate cases', () => {
    expect(estimatePlan('divide', 2496, 24)).toMatchObject({ estimate: 100, left: 2400 });
    expect(estimatePlan('divide', 5, 8).estimate).toBe(0);
    expect(estimatePlan('divide', 5, 0).estimate).toBeNull();
    expect(estimatePlan('multiply', 0, 99).estimate).toBe(0);
  });

  it('assessEstimate flags missing, invalid, and far answers distinctly', () => {
    expect(assessEstimate('add', 27, 35, '').status).toBe('missing');
    expect(assessEstimate('add', 27, 35, 'abc').status).toBe('invalid');
    expect(assessEstimate('add', 27, 35, '500').status).toBe('far');
    expect(assessEstimate('add', 27, 35, '65').status).toBe('reasonable');
  });
});

describe('pure helpers', () => {
  it('splitPlaceValue parts sum back to the number and skip zero digits', () => {
    expect(splitPlaceValue(402)).toEqual([400, 2]);
    expect(splitPlaceValue(12458)).toEqual([10000, 2000, 400, 50, 8]);
    expect(splitPlaceValue(0)).toEqual([0]);
    for (const n of [7, 58, 950, 12003]) {
      expect(splitPlaceValue(n).reduce((s, p) => s + p, 0)).toBe(n);
    }
  });

  it('calculate floors division and refuses dividing by zero', () => {
    expect(calculate('divide', 347, 8)).toEqual({ answer: 43, remainder: 3 });
    expect(calculate('divide', 42, 0)).toEqual({ answer: null, remainder: null });
  });

  it('strategy steps state the true result for each operation', () => {
    expect(Pure.strategySteps('add', 368, 457).join(' ')).toContain('825');
    expect(Pure.strategySteps('subtract', 502, 187).join(' ')).toContain('315');
    expect(Pure.strategySteps('multiply', 47, 26).join(' ')).toContain('1222');
    expect(Pure.strategySteps('divide', 53, 5).join(' ')).toContain('remainder 3');
  });
});

describe('i18n (source pin)', () => {
  it('the place-value row header no longer hardcodes English "first"', () => {
    expect(src).toContain("t('stem.arithmetic.first', \"first\")");
    expect(src).not.toContain(": 'first')");
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
