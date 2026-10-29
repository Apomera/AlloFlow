import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const Chemistry = require('../stem_lab/kitchen_studio/kitchen_chemistry.js');

describe('Illustrative salt boiling-point comparison', () => {
  it('keeps the pure-water reference and estimates only a small rise at kitchen concentrations', () => {
    expect(Chemistry.boilingPoint(0)).toBe(100);
    expect(Chemistry.boilingPoint(10)).toBeCloseTo(100.17522, 5);
    expect(Chemistry.boilingPoint(20)).toBeCloseTo(100.35044, 5);
  });
  it('increases with dissolved salt throughout the supported dilute comparison', () => {
    for (let grams = 1; grams <= 20; grams++) {
      expect(Chemistry.boilingPoint(grams)).toBeGreaterThan(Chemistry.boilingPoint(grams - 1));
      expect(Chemistry.boilingPoint(grams)).toBeLessThan(100.4);
    }
  });
  it.each([-1, 20.001, NaN, Infinity, -Infinity, '10', null, undefined, {}, []])('rejects invalid or out-of-range salt amount %j', value => {
    expect(() => Chemistry.boilingPoint(value)).toThrow(RangeError);
  });
  it('can load without a DOM and does not require an active kitchen to calculate the comparison', () => {
    const context = { module: { exports: {} } };
    vm.runInNewContext(readFileSync('stem_lab/kitchen_studio/kitchen_chemistry.js', 'utf8'), context);
    expect(context.module.exports.boilingPoint(5)).toBeCloseTo(100.08761, 5);
    expect(Object.keys(context)).not.toContain('document');
  });
});
