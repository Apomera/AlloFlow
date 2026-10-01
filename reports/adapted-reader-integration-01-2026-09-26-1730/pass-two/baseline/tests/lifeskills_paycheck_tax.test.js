import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

/** The body of a top-level `function <name>(...) { ... }`, brace-matched. */
function bodyOf(src, name) {
  const i = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

/**
 * Run the real functions rather than pinning their spelling. calcTaxableIncome
 * closes over STD_DEDUCTION, so the constants are pulled from the source too —
 * this suite must never carry its own copy of a number the tool computes from.
 */
function loadTax(file) {
  const src = read(file);
  const consts = src.match(/var TAX_YEAR = [\s\S]*?var SS_WAGE_CAP = \d+;/);
  if (!consts) throw new Error('tax constants not found');
  const fedTax = bodyOf(src, 'calcFedTax');
  const taxable = bodyOf(src, 'calcTaxableIncome');
  if (!fedTax || !taxable) throw new Error('tax functions not found');
  // eslint-disable-next-line no-new-func
  return new Function(
    consts[0] + '\n' + fedTax + '\n' + taxable +
    '\n; return { calcFedTax: calcFedTax, calcTaxableIncome: calcTaxableIncome,' +
    ' TAX_YEAR: TAX_YEAR, STD_DEDUCTION: STD_DEDUCTION, SS_WAGE_CAP: SS_WAGE_CAP };'
  )();
}

describe('Life Skills Lab — paycheck federal tax', () => {
  it('does not tax the income the standard deduction shields', () => {
    // THE BUG THIS LOCKS OUT. The paycheck tab ran calcFedTax(grossAnnual),
    // taxing from the first dollar. A student on minimum wage was shown $1,131
    // of federal income tax on income that actually owes $0, and $30,000 was
    // overstated by 108%. The error is largest for the lowest earners — the
    // students most likely to be using a paycheck tool for a real first job.
    const { calcFedTax, calcTaxableIncome } = loadTax(SOURCE);
    const gross = 7.25 * 30 * 52; // full-time-ish minimum wage, $11,310
    const { taxable } = calcTaxableIncome(gross, 'single');
    expect(taxable).toBe(0);
    expect(calcFedTax(taxable, 'single').tax).toBe(0);
  });

  it('taxes only the amount above the deduction, at the right brackets', () => {
    const { calcFedTax, calcTaxableIncome } = loadTax(SOURCE);
    // $31,200 single: taxable is 31,200 - 14,600 = 16,600.
    //   10% on the first 11,600 = 1,160
    //   12% on the next  5,000  =   600   => 1,760
    const { taxable } = calcTaxableIncome(31200, 'single');
    expect(taxable).toBe(16600);
    expect(calcFedTax(taxable, 'single').tax).toBeCloseTo(1760, 2);
  });

  it('gives married filers the larger deduction', () => {
    const { calcTaxableIncome, STD_DEDUCTION } = loadTax(SOURCE);
    expect(STD_DEDUCTION.married).toBeGreaterThan(STD_DEDUCTION.single);
    expect(calcTaxableIncome(50000, 'married').taxable)
      .toBe(50000 - STD_DEDUCTION.married);
    // An unknown filing status must fall back, not produce NaN.
    expect(calcTaxableIncome(50000, 'zzz').taxable).toBe(50000 - STD_DEDUCTION.single);
  });

  it('reports the shielded amount as what was actually shielded', () => {
    // Below the deduction you shield only what you earned — the UI prints this
    // in the "0% (deduction)" row, so an inflated figure would be visible and wrong.
    const { calcTaxableIncome, STD_DEDUCTION } = loadTax(SOURCE);
    expect(calcTaxableIncome(9000, 'single').shielded).toBe(9000);
    expect(calcTaxableIncome(90000, 'single').shielded).toBe(STD_DEDUCTION.single);
  });

  it('never lets tax exceed income, or go negative', () => {
    const { calcFedTax, calcTaxableIncome } = loadTax(SOURCE);
    for (let g = 0; g <= 400000; g += 2500) {
      const { taxable } = calcTaxableIncome(g, 'single');
      const { tax } = calcFedTax(taxable, 'single');
      expect(tax).toBeGreaterThanOrEqual(0);
      expect(tax).toBeLessThanOrEqual(g);
    }
  });

  it('has no earnings cliff: earning more never lowers take-home', () => {
    // The classic "a raise pushed me into a higher bracket so I take home less"
    // misconception. A progressive model must make that impossible, and this tab
    // is where a student would check.
    const { calcFedTax, calcTaxableIncome } = loadTax(SOURCE);
    const net = (g) => g - calcFedTax(calcTaxableIncome(g, 'single').taxable, 'single').tax;
    for (let g = 0; g <= 400000; g += 1000) {
      expect(net(g + 1000)).toBeGreaterThanOrEqual(net(g) - 1e-6);
    }
  });

  it('keeps the effective rate below the top marginal rate', () => {
    const { calcFedTax, calcTaxableIncome } = loadTax(SOURCE);
    for (const g of [20000, 60000, 150000, 400000, 2000000]) {
      const { tax } = calcFedTax(calcTaxableIncome(g, 'single').taxable, 'single');
      expect(tax / g).toBeLessThan(0.37);
    }
  });

  it('handles a negative or non-numeric taxable income without producing NaN', () => {
    const { calcFedTax } = loadTax(SOURCE);
    expect(calcFedTax(-5000, 'single').tax).toBe(0);
    expect(Number.isNaN(calcFedTax(0, 'single').tax)).toBe(false);
  });

  it('labels the tax year it actually computes with', () => {
    // Bracket tables and the standard deduction are per-year figures. A tool that
    // shows year-pinned numbers without naming the year goes quietly stale.
    // (feedback_copy_pinned_to_a_date_goes_stale_silently)
    const { TAX_YEAR, STD_DEDUCTION, SS_WAGE_CAP } = loadTax(SOURCE);
    expect(TAX_YEAR).toBe(2024);
    expect(STD_DEDUCTION.single).toBe(14600);
    expect(STD_DEDUCTION.married).toBe(29200);
    expect(SS_WAGE_CAP).toBe(168600);
    // The year must reach the student, not just live in a constant.
    expect(read(SOURCE)).toMatch(/federal_tax_brackets[^)]*\)\s*\+\s*' '\s*\+\s*TAX_YEAR/);
  });

  it('applies the Social Security wage cap but not to Medicare', () => {
    // FICA has no standard deduction and SS stops at the cap; Medicare does not.
    // Both facts are on screen, so the call site must keep using the constant.
    const src = read(SOURCE);
    expect(src).toContain('Math.min(grossAnnual, SS_WAGE_CAP) * 0.062');
    expect(src).toContain('var medicareTax = grossAnnual * 0.0145;');
  });

  it('feeds the brackets taxable income, not gross pay', () => {
    // The regression would be a call site quietly reverting to calcFedTax(grossAnnual).
    const src = read(SOURCE);
    expect(src).toContain('calcFedTax(payTaxable.taxable, payFiling)');
    expect(src).not.toContain('calcFedTax(grossAnnual,');
  });

  it('ships the same tax model in the desktop mirror', () => {
    for (const fn of ['calcFedTax', 'calcTaxableIncome']) {
      expect(bodyOf(read(MIRROR), fn), fn + ' missing from mirror').toBe(bodyOf(read(SOURCE), fn));
    }
  });
});
