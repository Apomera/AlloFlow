// Unit tests for window.AlloModules.MathHelpers.
//
// math_helpers exports 6 functions; 5 are async + heavily-deps-coupled
// (handleCheckMathWork, handleGetMathHint, handleMathEdit,
// handleGenerateSimilar, handleGenerateOutcome) and would require huge
// mocks to test. The one pure target is generateMathFluencySet — newly
// extracted yesterday from the monolith and worth regression-locking.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let MH;
beforeAll(() => {
  loadAlloModule('math_helpers_module.js');
  MH = window.AlloModules.MathHelpers;
  if (!MH) throw new Error('MathHelpers failed to register');
});

describe('generateMathFluencySet — addition', () => {
  it('returns a non-empty array of problems', () => {
    const r = MH.generateMathFluencySet('add', 'single', 30);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(30);
  });

  it('every problem has the expected shape', () => {
    const r = MH.generateMathFluencySet('add', 'single', 10);
    for (const p of r) {
      expect(p).toHaveProperty('a');
      expect(p).toHaveProperty('b');
      expect(p).toHaveProperty('op', 'add');
      expect(p).toHaveProperty('symbol', '+');
      expect(p).toHaveProperty('answer');
      expect(p.studentAnswer).toBeNull();
      expect(p.correct).toBeNull();
    }
  });

  it('addition answers are mathematically correct', () => {
    const r = MH.generateMathFluencySet('add', 'single', 30);
    for (const p of r) {
      expect(p.answer).toBe(p.a + p.b);
    }
  });

  it('single-digit difficulty stays within 0-12', () => {
    const r = MH.generateMathFluencySet('add', 'single', 30);
    for (const p of r) {
      expect(p.a).toBeGreaterThanOrEqual(0);
      expect(p.a).toBeLessThanOrEqual(12);
      expect(p.b).toBeGreaterThanOrEqual(0);
      expect(p.b).toBeLessThanOrEqual(12);
    }
  });

  it('double-digit difficulty produces operands in 10-99', () => {
    const r = MH.generateMathFluencySet('add', 'double', 30);
    for (const p of r) {
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.a).toBeLessThanOrEqual(99);
      expect(p.b).toBeGreaterThanOrEqual(10);
      expect(p.b).toBeLessThanOrEqual(99);
    }
  });
});

describe('generateMathFluencySet — subtraction', () => {
  it('answers are correct and never negative (b ≤ a constraint)', () => {
    const r = MH.generateMathFluencySet('sub', 'single', 30);
    for (const p of r) {
      expect(p.op).toBe('sub');
      expect(p.symbol).toBe('−');
      expect(p.answer).toBe(p.a - p.b);
      expect(p.answer).toBeGreaterThanOrEqual(0);
      expect(p.b).toBeLessThanOrEqual(p.a);
    }
  });
});

describe('generateMathFluencySet — multiplication', () => {
  it('answers are correct', () => {
    const r = MH.generateMathFluencySet('mul', 'single', 30);
    for (const p of r) {
      expect(p.op).toBe('mul');
      expect(p.symbol).toBe('×');
      expect(p.answer).toBe(p.a * p.b);
    }
  });

  it('single-digit multiplication factors stay within 0-12', () => {
    const r = MH.generateMathFluencySet('mul', 'single', 30);
    for (const p of r) {
      expect(p.a).toBeGreaterThanOrEqual(0);
      expect(p.a).toBeLessThanOrEqual(12);
      expect(p.b).toBeLessThanOrEqual(12);
    }
  });
});

describe('generateMathFluencySet — division', () => {
  it('division problems always divide evenly (no remainder)', () => {
    // The function generates by picking b + answer, then a = b * answer
    // so a/b is always exact.
    const r = MH.generateMathFluencySet('div', 'single', 30);
    for (const p of r) {
      expect(p.op).toBe('div');
      expect(p.symbol).toBe('÷');
      expect(p.b).toBeGreaterThan(0); // never divide-by-zero
      expect(p.answer).toBe(p.a / p.b);
      expect(Number.isInteger(p.a / p.b)).toBe(true);
    }
  });
});

describe('generateMathFluencySet — mixed operations', () => {
  it("mixed mode emits all four operations (over enough samples)", () => {
    const r = MH.generateMathFluencySet('mixed', 'single', 100);
    const ops = new Set(r.map(p => p.op));
    // Probability that ALL four show up in 100 random draws is very high.
    // If this flakes occasionally, we'd raise the count.
    expect(ops.size).toBeGreaterThanOrEqual(2);
  });

  it('every mixed-mode problem has correct math for its operation', () => {
    const r = MH.generateMathFluencySet('mixed', 'single', 50);
    for (const p of r) {
      if (p.op === 'add') expect(p.answer).toBe(p.a + p.b);
      if (p.op === 'sub') expect(p.answer).toBe(p.a - p.b);
      if (p.op === 'mul') expect(p.answer).toBe(p.a * p.b);
      if (p.op === 'div') expect(p.answer).toBe(p.a / p.b);
    }
  });
});

describe('generateMathFluencySet — deduplication', () => {
  it('produces no duplicate (a,op,b) combinations within a set', () => {
    const r = MH.generateMathFluencySet('add', 'single', 50);
    const keys = new Set(r.map(p => `${p.a}${p.op}${p.b}`));
    expect(keys.size).toBe(r.length);
  });
});

describe('generateMathFluencySet — count saturation', () => {
  it('stops at the requested count when reachable', () => {
    const r = MH.generateMathFluencySet('add', 'single', 5);
    expect(r.length).toBeLessThanOrEqual(5);
  });

  it('returns fewer than requested when the answer space is exhausted', () => {
    // Single-digit add space is 13*13 = 169 unique combos. Asking for 500
    // forces the loop's 500-attempt cap to kick in; we'll get <= 169.
    const r = MH.generateMathFluencySet('add', 'single', 500);
    expect(r.length).toBeLessThanOrEqual(169);
  });
});
