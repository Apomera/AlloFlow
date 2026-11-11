// Math Fluency review of 2026-11-09: the answer box keeps digits only, the
// Strategy Coach adds tens as tens, and the screens say things in plain words.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const source = readFileSync('math_fluency_module.js', 'utf8');
let M;
beforeAll(() => {
  loadAlloModule('math_fluency_module.js');
  M = window.AlloModules.MathFluencyInternals;
});

const hint = (a, b, attempt) => M.getStrategyHint({ a, b, op: 'add', symbol: '+', answer: a + b }, attempt);

describe('answer box input', () => {
  it('keeps digits and one leading minus sign', () => {
    expect(M.cleanAnswerInput('12')).toBe('12');
    expect(M.cleanAnswerInput('1e5')).toBe('15');
    expect(M.cleanAnswerInput('3.9')).toBe('39');
    expect(M.cleanAnswerInput('-7')).toBe('-7');
    expect(M.cleanAnswerInput('7-')).toBe('7');
    expect(M.cleanAnswerInput(' abc ')).toBe('');
    expect(M.cleanAnswerInput('1234567890')).toHaveLength(8);
  });
  it('is not a number field, which changes its value on the wheel and arrow keys', () => {
    expect(source).not.toMatch(/ref: inputRef, type: 'number'/);
    expect(source).toContain("ref: inputRef, type: 'text', inputMode: touchKeypad ? 'none' : 'numeric'");
  });
});

describe('Strategy Coach adds tens as tens', () => {
  it('a multiple of ten is added as tens, in either order', () => {
    for (const [a, b] of [[55, 30], [30, 55]]) {
      const h = hint(a, b, 1);
      expect(h.title).toBe('Add the tens');
      expect(h.message).toBe('Add 3 tens to 55. The ones digit stays 5.');
      expect(h.model).toMatchObject({ start: 55, change: 30, direction: 'right' });
      expect(h.message).not.toContain(String(a + b));
    }
    expect(hint(7, 10, 1).message).toBe('Add 1 ten to 7. The ones digit stays 7.');
  });
  it('two multiples of ten are thought of in tens', () => {
    expect(hint(40, 30, 1)).toMatchObject({ title: 'Think in tens', message: 'Think 4 tens plus 3 tens.' });
  });
  it('a second try breaks a two-digit addend apart instead of counting on by ones', () => {
    const h = hint(28, 36, 2);
    expect(h.message).toBe('Break 28 into 20 and 8. Add 20 to 36, then 8 more.');
    expect(h.message).not.toContain('count on');
    expect(hint(55, 30, 2).message).toBe('Start with 55 and add 3 tens.');
    // Small facts still count on.
    expect(hint(9, 4, 2).message).toBe('Start with 9 and count on 4 more.');
  });
  it('small facts keep their strategies, and a double is called a double', () => {
    expect(hint(9, 4, 1).title).toBe('Make the next ten');
    expect(hint(8, 7, 1).title).toBe('Use a nearby double');
    expect(hint(10, 10, 1).message).toBe('This is a double: 10 + 10.');
  });
  it('no first or second hint gives the answer away', () => {
    for (const [a, b] of [[55, 30], [40, 30], [28, 36], [47, 48], [63, 9], [7, 10]]) {
      for (const attempt of [1, 2]) expect(hint(a, b, attempt).message, a + '+' + b).not.toMatch(new RegExp('\\b' + (a + b) + '\\b'));
    }
  });
});

describe('plain wording', () => {
  it('the maze setting matches the facts it makes', () => {
    // "Single Digit (0-12)" produced 9 x 12.
    expect(source).not.toContain('Single Digit (0-12)');
    for (let i = 0; i < 200; i++) {
      const p = M.generateMazeProblem('mul', 'single');
      const [a, b] = p.text.split(/\s*\D+\s*/).filter(Boolean).map(Number);
      expect(a).toBeLessThanOrEqual(12);
      expect(b).toBeLessThanOrEqual(12);
    }
  });
  it('students do not see measurement jargon', () => {
    expect(source).not.toContain("' dcpm')");
    expect(source).not.toContain('Full CBM');
    expect(source).not.toContain("'Total Digits'");
    expect(source).not.toContain("'Adaptive') + ': ' + adaptiveLevel");
  });
});
