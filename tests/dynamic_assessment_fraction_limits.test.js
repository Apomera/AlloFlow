// Fraction Lab's own limit is 20. Dynamic Assessment allowed 24, so an item could promise a fraction the tool then changed.
// A compare item could also name only one fraction, leaving the student to compare against whatever was on screen.
// DA_SRC points the suite at another copy for the fail-first check.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync(process.env.DA_SRC || 'dynamic_assessment_module.js', 'utf8');
const a = src.indexOf('function sanitizeManipulativePreset('), b = src.indexOf('// Phase 3', a);
const sanitize = new Function(src.slice(a, b) + ';return sanitizeManipulativePreset;')();
const title = (() => { const c = src.indexOf('function defaultManipulativeTitle('); const d = src.indexOf('\n  }\n', c); return new Function(src.slice(c, d) + '\n  }\n;return defaultManipulativeTitle;')(); })();

describe('Dynamic Assessment fraction limits match the tool', () => {
  it.each([[24, 24, 20, 20], [21, 25, 20, 20], [20, 20, 20, 20], [3, 4, 3, 4]])('%i/%i becomes %i/%i', (n, d, wantN, wantD) => {
    expect(sanitize('fractions', { numerator: n, denominator: d })).toMatchObject({ numerator: wantN, denominator: wantD });
  });
  it('tells the AI the same limit', () => {
    expect(src).not.toMatch(/fractions[^\n]*\[2, ?24\]/);
    expect(src).toContain('numerator ∈ [0, 20], denominator ∈ [2, 20]');
  });
});

describe('a compare item can name both fractions', () => {
  it('keeps the second fraction', () => {
    expect(sanitize('fractions', { numerator: 3, denominator: 4, num2: 5, den2: 8, tab: 'compare' })).toEqual({ numerator: 3, denominator: 4, num2: 5, den2: 8, tab: 'compare' });
  });
  it('holds the second fraction to the same limit', () => {
    expect(sanitize('fractions', { numerator: 3, denominator: 4, num2: 99, den2: 99, tab: 'compare' })).toMatchObject({ num2: 20, den2: 20 });
  });
  it.each([['x', 8], [5, 'x'], [5, 0], [-1, 8], [5, 1], [null, 8], [5, undefined]])('drops an unusable second fraction %s/%s', (num2, den2) => {
    const out = sanitize('fractions', { numerator: 3, denominator: 4, num2, den2, tab: 'compare' });
    expect(out).toEqual({ numerator: 3, denominator: 4, tab: 'compare' });
  });
  it('ignores a second fraction on any other tab', () => {
    expect(sanitize('fractions', { numerator: 3, denominator: 4, num2: 5, den2: 8, tab: 'wall' })).toEqual({ numerator: 3, denominator: 4, tab: 'wall' });
  });
  it('names both in the title', () => {
    expect(title('fractions', { numerator: 3, denominator: 4, num2: 5, den2: 8 })).toBe('Fraction Bar: 3/4 vs 5/8');
    expect(title('fractions', { numerator: 3, denominator: 4 })).toBe('Fraction Bar: 3/4');
  });
});
