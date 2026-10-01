import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

/** Evaluate a top-level `var <name> = [ ... ];` array literal from the source. */
function arrayLiteral(src, name) {
  const i = src.indexOf('var ' + name + ' = [');
  if (i === -1) return null;
  const start = src.indexOf('[', i);
  let depth = 0;
  for (let j = start; j < src.length; j += 1) {
    if (src[j] === '[') depth += 1;
    else if (src[j] === ']') { depth -= 1; if (depth === 0) return src.slice(start, j + 1); }
  }
  return null;
}
// eslint-disable-next-line no-new-func
const load = (src, name) => new Function('return ' + arrayLiteral(src, name) + ';')();

describe('Life Skills Lab — budget categories and the 50/30/20 bar', () => {
  it('has category defaults that account for exactly 100% of income', () => {
    // Anything else means the tab opens with money unaccounted for, in a
    // "zero-based budgeting: every dollar gets a job" tool.
    const cats = load(read(SOURCE), 'BUDGET_CATEGORIES');
    const sum = cats.reduce((a, c) => a + c.typical, 0);
    expect(sum).toBe(100);
  });

  it('gives every category a type the bar knows how to group', () => {
    const cats = load(read(SOURCE), 'BUDGET_CATEGORIES');
    for (const c of cats) {
      expect(['need', 'want', 'save'], c.name + ' has an ungrouped type').toContain(c.type);
      expect(c.typical).toBeGreaterThan(0);
    }
  });

  it('explains the gap instead of silently failing its own rule', () => {
    // The shipped defaults are needs 62 / wants 18 / save 20 against a stated
    // 50/30/20 goal, so the tab OPENS failing the rule it teaches. Keeping honest
    // defaults is deliberate — housing at 30% of income is realistic — but the tab
    // must say so, or a student reads a lesson as a bug.
    const cats = load(read(SOURCE), 'BUDGET_CATEGORIES');
    const by = (t) => cats.filter((c) => c.type === t).reduce((a, c) => a + c.typical, 0);
    expect(by('need')).toBeGreaterThan(50); // the premise of the explanation
    const src = read(SOURCE);
    expect(src).toContain('budgetNeedsOverBy');
    expect(src).toContain('stem.lifeskills.budget_needs_over_goal');
    expect(src).toContain('stem.lifeskills.budget_rule_is_a_target');
    // And a success state must exist, or the explanation can never be resolved.
    expect(src).toContain('stem.lifeskills.budget_needs_within_goal');
  });

  it('derives the gap from live totals, not from the shipped defaults', () => {
    // A hard-coded "over by 12" would go stale the moment a student moves a
    // slider. The figures must come from needsTotal / budgetIncome.
    const src = read(SOURCE);
    expect(src).toMatch(/budgetNeedsGap\s*=\s*budgetNeedsPct\s*-\s*BUDGET_GOALS\.need/);
    expect(src).toMatch(/budgetNeedsOverBy\s*=\s*Math\.max\(0,\s*Math\.round\(needsTotal\s*-\s*budgetIncome/);
  });

  it('states goals that sum to 100 and match the rule it names', () => {
    const src = read(SOURCE);
    const m = src.match(/var BUDGET_GOALS = \{[^}]*\}/);
    expect(m, 'BUDGET_GOALS not found').toBeTruthy();
    // eslint-disable-next-line no-new-func
    const goals = new Function('return ' + m[0].replace('var BUDGET_GOALS = ', '') + ';')();
    expect(goals.need + goals.want + goals.save).toBe(100);
    expect([goals.need, goals.want, goals.save]).toEqual([50, 30, 20]);
  });

  it('refuses a negative income instead of showing negative category amounts', () => {
    // isFinite alone let a negative through and every row rendered as "$-150".
    const src = read(SOURCE);
    expect(src).toMatch(/isFinite\(d\.budgetIncome\)\s*&&\s*d\.budgetIncome\s*>=\s*0/);
  });

  it('does not judge a budget with nothing in it', () => {
    // With no spending entered, "Savings 0% — under by 20" scolds a student who
    // has not started. Every verdict is gated on budgetTotalSpent > 0.
    const src = read(SOURCE);
    expect(src).toContain("budgetTotalSpent <= 0 ? '' :");
    expect(src).toMatch(/budgetTotalSpent > 0 && budgetNeedsGap > 0/);
    expect(src).toMatch(/budgetIncome > 0 && budgetTotalSpent > 0 && budgetNeedsOverBy === 0/);
  });

  it('ships the same categories in the desktop mirror', () => {
    expect(arrayLiteral(read(MIRROR), 'BUDGET_CATEGORIES'))
      .toBe(arrayLiteral(read(SOURCE), 'BUDGET_CATEGORIES'));
  });
});

describe('Life Skills Lab — credit and nutrition reference data', () => {
  it('has credit factor weights summing to 100%', () => {
    const f = load(read(SOURCE), 'CREDIT_FACTORS');
    expect(f.reduce((a, x) => a + x.weight, 0)).toBe(100);
  });

  it('covers the whole 300-850 credit range with no gap or overlap', () => {
    // A score landing in a gap would render no band at all.
    const r = load(read(SOURCE), 'CREDIT_RANGES').slice().sort((a, b) => a.min - b.min);
    expect(r[0].min).toBe(300);
    expect(r[r.length - 1].max).toBe(850);
    for (let i = 1; i < r.length; i += 1) expect(r[i].min).toBe(r[i - 1].max + 1);
  });

  it('states nutrition answers that match the label data they are computed from', () => {
    // These are GRADED answers: a wrong one marks a correct student wrong.
    const n = load(read(SOURCE), 'NUTRITION_LABELS');
    const get = (t) => n.find((x) => x.title === t);
    expect(parseFloat(get('Cereal Box').answer)).toBe(get('Cereal Box').calories * 2);
    expect(parseFloat(get('Juice Bottle').answer))
      .toBeCloseTo(get('Juice Bottle').sugar * get('Juice Bottle').servings, 5);
    expect(parseFloat(get('Frozen Pizza').answer))
      .toBe(get('Frozen Pizza').sodium * get('Frozen Pizza').servings);
    const g = get('Granola Bar');
    expect(parseFloat(g.answer)).toBe(Math.round(g.fat * 9 / g.calories * 100));
  });

  it('keeps the pizza sodium claim true against its own numbers', () => {
    // The explanation says one pizza exceeds the 2,300mg daily limit.
    const p = load(read(SOURCE), 'NUTRITION_LABELS').find((x) => x.title === 'Frozen Pizza');
    expect(p.sodium * p.servings).toBeGreaterThan(2300);
  });
});
