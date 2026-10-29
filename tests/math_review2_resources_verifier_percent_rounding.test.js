// Math review 2 (2026-10-19): the generated-math verifier misread % and rounding.
//
// verifyGeneratedMathProblems evaluates a problem's numeric expression and
// compares it with the answer key. Two defects:
// 1. "%" went straight to JavaScript, where it is the remainder operator:
//    "15% + 5" is 15 % (+5) = 0, so a correct key of 5.15 was flagged
//    "needs teacher review", and "17 % 5" was "verified" as a remainder.
//    In K-12 problems % means percent. N% is now N/100 where that reading is
//    unambiguous (N% is a factor of * or /, or the whole expression); "80 + 15%"
//    (80.15 or 92?) and "17 % 5" are left unverified rather than guessed.
// 2. Any answer within 0.01 earned the "Answer computationally verified" badge,
//    so 0.33 and 0.3333 were "verified" as 1/3. Verified now means exact
//    agreement (float noise aside), or agreement after the rounding the question
//    states ("nearest hundredth", "2 decimal places"). A close-but-rounded key
//    without a stated rounding requires review without being called a mismatch. A stated rounding
//    also stops a correctly rounded key (7/2 -> 4) from being flagged.
//
// MATH_REVIEW2_GEN_MODULE lets the mutation check load a copy with the fix reverted.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';

const MODULE = process.env.MATH_REVIEW2_GEN_MODULE || 'generation_helpers_module.js';
let verify;

beforeAll(() => {
  const window = { AlloModules: {}, addEventListener() {}, removeEventListener() {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(MODULE), 'utf8'), {
    window, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, AbortController, Promise,
  });
  verify = window.AlloModules.GenerationHelpers.verifyGeneratedMathProblems;
});

const check = problem => verify([problem])[0]._verification;

describe('% is percent, never remainder', () => {
  it.each([
    ['Add 15% to 5.', '15% + 5', '5.15'],
    ['What is 80 increased by 15%?', '80 + 15%', '92'],
    ['What is 80 increased by 15%?', '80 + 15%', '80.15'],
  ])('%s: an additive percent (%s) is requires review without a mismatch claim', (question, expression, answer) => {
    const v = check({ question, expression, answer });
    expect(v.reviewRequired, JSON.stringify(v)).toBe(true);
    expect(v.mismatch).toBe(false);
    expect(v.verified).toBe(false);
    expect(v.computed).toBeNull();
  });

  it('a bare numeric question with an additive percent requires review too', () => {
    const v = check({ question: '15% + 5', answer: '5.15' });
    expect(v.reviewRequired, JSON.stringify(v)).toBe(true);
    expect(v.verified).toBe(false);
  });

  it.each([
    ['15% * 80', '12'],
    ['80 * 15%', '12'],
    ['80 - 25% * 80', '60'],
    ['50%', '0.5'],
  ])('a multiplicative percent %s = %s is verified', (expression, answer) => {
    const v = check({ question: 'Find the value.', expression, answer });
    expect(v.verified, JSON.stringify(v)).toBe(true);
    expect(v.reviewRequired).toBeFalsy();
  });

  it('a wrong key on a multiplicative percent is still flagged', () => {
    const v = check({ question: 'What is 15% of 80?', expression: '15% * 80', answer: '15' });
    expect(v.reviewRequired).toBe(true);
    expect(v.computed).toBe(12);
  });

  it('"17 % 5" is not evaluated as a remainder', () => {
    const v = check({ question: 'Find the remainder.', expression: '17 % 5', answer: '2' });
    expect(v.verified).toBe(false);
    expect(v.computed).toBeNull();
    expect(v.reviewRequired).toBe(true);
  });
});

describe('verified means exact, or exact after the stated rounding', () => {
  it.each(['0.33', '0.3333'])('%s is not verified as 1/3 when no rounding is stated', answer => {
    const v = check({ question: 'Write 1/3 as a decimal.', expression: '1/3', answer });
    expect(v.verified, JSON.stringify(v)).toBe(false);
    expect(v.mismatch).toBe(false);
    expect(v.reviewRequired).toBe(true);
  });

  it('a bare "1 / 3" question with a 0.33 key is not verified', () => {
    expect(check({ question: '1 / 3', answer: '0.33' }).verified).toBe(false);
  });

  it.each([
    ['Write 1/3 as a decimal rounded to the nearest hundredth.', '1/3', '0.33'],
    ['Round 2/3 to 2 decimal places.', '2/3', '0.67'],
    ['Divide 7 by 2 and round to the nearest whole number.', '7/2', '4'],
    ['Estimate 1234 / 10 to the nearest ten.', '1234 / 10', '120'],
    ['Give 1.005 to the nearest hundredth.', '1.005', '1.01'],
  ])('%s -> %s = %s is verified', (question, expression, answer) => {
    const v = check({ question, expression, answer });
    expect(v.verified, JSON.stringify(v)).toBe(true);
    expect(v.reviewRequired).toBeFalsy();
  });

  it('a key rounded to the wrong place is not verified', () => {
    const v = check({ question: 'Write 1/3 as a decimal rounded to the nearest tenth.', expression: '1/3', answer: '0.33' });
    expect(v.verified).toBe(false);
  });

  it('a key far from the rounded value is still flagged', () => {
    const v = check({ question: 'Round 7/2 to the nearest whole number.', expression: '7/2', answer: '5' });
    expect(v.reviewRequired).toBe(true);
    expect(v.reason).toBe('answer_expression_conflict');
  });

  it('floating-point noise is not disagreement', () => {
    expect(check({ question: 'Add.', expression: '0.1 + 0.2', answer: '0.3' }).verified).toBe(true);
    expect(check({ question: 'Multiply.', expression: '0.15 * 80', answer: '12' }).verified).toBe(true);
  });

  it('exact integer agreement and integer conflicts behave as before', () => {
    expect(check({ question: 'Multiply.', expression: '6 * 7', answer: '42' }).verified).toBe(true);
    const wrong = check({ question: 'Multiply.', expression: '6 * 7', answer: '41' });
    expect(wrong).toMatchObject({ verified: false, mismatch: true, computed: 42, reviewRequired: true });
  });
});
