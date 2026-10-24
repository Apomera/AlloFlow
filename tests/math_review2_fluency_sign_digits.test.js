// Math review 2 (2026-10-19): a wrong sign earned full digit credit.
//
// The fluency keypad has a minus key, and countCorrectDigits compared the digits
// of |expected| and |actual|. So 12 answered as -12 scored 2 of 2 digits correct:
// the same DCPM credit as the right answer, for a wrong answer. CBM digits-correct
// scoring credits each correct digit in its place value; an answer with the
// opposite sign is a different number, so it now earns no digit credit. Zero has
// no sign (-0 scores as 0). Same-sign answers are scored by place value exactly
// as before.
//
// MF_REVIEW2_MODULE lets the mutation check load a copy with the fix reverted.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let M;
beforeAll(() => {
  loadAlloModule(process.env.MF_REVIEW2_MODULE || 'math_fluency_module.js');
  M = window.AlloModules.MathFluencyInternals;
});

describe('countCorrectDigits and answer sign', () => {
  it.each([
    [12, -12],
    [7, -7],
    [105, -105],
    [-12, 12],
  ])('expected %d answered %d earns no digit credit', (expected, actual) => {
    expect(M.countCorrectDigits(expected, actual)).toBe(0);
  });

  it.each([
    [12, 12, 2],
    [12, 13, 1],
    [105, 15, 1],
    [-12, -12, 2],
    [0, 0, 1],
    [0, -0, 1],
  ])('same-sign answers keep place-value credit: %d vs %d -> %d', (expected, actual, digits) => {
    expect(M.countCorrectDigits(expected, actual)).toBe(digits);
  });

  it('a typed "-12" parsed from the keypad scores 0 against 12', () => {
    const parsed = M.parseStudentAnswer('-12');
    expect(parsed).toEqual({ valid: true, value: -12 });
    expect(M.countCorrectDigits(12, parsed.value)).toBe(0);
  });
});
