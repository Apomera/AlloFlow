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
 * Slice calcPlanCost out of the source and RUN it, rather than pinning the
 * spelling of its arithmetic. A spelling pin cannot tell a real regression from
 * a rename, and it goes red on a rewrite that keeps the behaviour.
 */
function loadCalc(file) {
  const body = bodyOf(read(file), 'calcPlanCost');
  if (!body) throw new Error('calcPlanCost not found in ' + file);
  // eslint-disable-next-line no-new-func
  return new Function(body + '; return calcPlanCost;')();
}

// The two plans and the three usage levels the tool ships as defaults. Kept in
// step with the source by the last test in this file, so this suite never holds
// its own private copy of the claim.
const PLAN_A = { premium: 250, deductible: 1500, copay: 30, coinsurance: 20, oop: 6000 };
const PLAN_B = { premium: 450, deductible: 500, copay: 15, coinsurance: 10, oop: 3000 };
const SCENES = {
  low: { visits: 2, bills: 500 },
  medium: { visits: 6, bills: 3000 },
  high: { visits: 12, bills: 15000 },
};

describe('Life Skills Lab — health insurance cost model', () => {
  it('never charges more out-of-pocket than the care actually cost', () => {
    // THE BUG THIS LOCKS OUT. The old model was
    //   Math.min(oop, deductible + coinsurance + copays)
    // which added the FULL deductible whether or not the bills reached it. At low
    // usage that billed $1,560 out-of-pocket on $800 of care — you cannot spend
    // more than you were charged, and "a deductible is a cap on YOUR spending,
    // not a fee" is the single idea this tab exists to teach.
    //
    // Nothing caught it: the number rendered fine, the crossover still looked
    // plausible, and all 19 lifeskills suites were about a11y, 3D and visibility.
    // No suite had ever executed the arithmetic.
    const calc = loadCalc(SOURCE);
    for (const [name, scene] of Object.entries(SCENES)) {
      for (const [label, plan] of [['A', PLAN_A], ['B', PLAN_B]]) {
        const r = calc(plan, scene);
        const incurred = scene.bills + scene.visits * plan.copay;
        expect(r.outOfPocket, `plan ${label} at ${name} usage`).toBeLessThanOrEqual(incurred);
      }
    }
  });

  it('charges only what the bills reached when they fall short of the deductible', () => {
    // $500 of bills against a $1,500 deductible: you pay the $500, not $1,500.
    const calc = loadCalc(SOURCE);
    const r = calc(PLAN_A, SCENES.low);
    expect(r.towardDeductible).toBe(500);
    expect(r.deductibleLeft).toBe(1000);   // shown to the student, never silently dropped
    expect(r.coinsurance).toBe(0);         // coinsurance cannot start before the deductible is met
    expect(r.copays).toBe(60);             // 2 visits x $30
    expect(r.outOfPocket).toBe(560);
    expect(r.total).toBe(560 + 250 * 12);
  });

  it('applies coinsurance only to the part of the bills above the deductible', () => {
    const calc = loadCalc(SOURCE);
    const r = calc(PLAN_A, SCENES.medium); // $3,000 bills, $1,500 deductible
    expect(r.towardDeductible).toBe(1500);
    expect(r.deductibleLeft).toBe(0);
    expect(r.coinsurance).toBe(300);       // 20% of the $1,500 above the deductible
    expect(r.outOfPocket).toBe(1500 + 300 + 180);
  });

  it('caps out-of-pocket at the plan maximum and says so', () => {
    const calc = loadCalc(SOURCE);
    // Bills far past the cap: the plan must absorb the rest.
    const r = calc(PLAN_B, { visits: 12, bills: 200000 });
    expect(r.outOfPocket).toBe(PLAN_B.oop);
    expect(r.cappedByOop).toBe(true);
    // And the ordinary case must NOT claim to be capped.
    expect(calc(PLAN_B, SCENES.low).cappedByOop).toBe(false);
  });

  it('keeps the crossover that makes the comparison worth doing', () => {
    // If one plan won everywhere the tab would teach "always pick the cheap one".
    // The lesson is that the answer depends on how much care you need, so the
    // winner MUST change across the three shipped scenarios.
    const calc = loadCalc(SOURCE);
    const winner = (s) => (calc(PLAN_A, s).total <= calc(PLAN_B, s).total ? 'A' : 'B');
    expect(winner(SCENES.low)).toBe('A');
    expect(winner(SCENES.medium)).toBe('A');
    expect(winner(SCENES.high)).toBe('B');
  });

  it('is monotonic: needing more care never costs you less', () => {
    // A model that dips as bills rise would teach the opposite of the truth.
    const calc = loadCalc(SOURCE);
    for (const plan of [PLAN_A, PLAN_B]) {
      let prev = -1;
      for (let bills = 0; bills <= 40000; bills += 250) {
        const oop = calc(plan, { visits: 4, bills }).outOfPocket;
        expect(oop).toBeGreaterThanOrEqual(prev);
        prev = oop;
      }
    }
  });

  it('costs nothing out-of-pocket when you use no care at all', () => {
    // The premium is still due — that is the point — but nothing else is.
    const calc = loadCalc(SOURCE);
    const r = calc(PLAN_A, { visits: 0, bills: 0 });
    expect(r.outOfPocket).toBe(0);
    expect(r.total).toBe(250 * 12);
  });

  it('reads the same plans and scenarios this suite asserts against', () => {
    // Guards the fixtures above: if the tool ever ships different defaults, this
    // suite must be updated rather than quietly testing numbers nobody sees.
    // (feedback_test_must_not_hold_its_own_copy_of_the_claim)
    const src = read(SOURCE);
    expect(src).toContain('{ premium: 250, deductible: 1500, copay: 30, coinsurance: 20, oop: 6000 }');
    expect(src).toContain('{ premium: 450, deductible: 500, copay: 15, coinsurance: 10, oop: 3000 }');
    expect(src).toContain('low: { visits: 2, bills: 500 }');
    expect(src).toContain('medium: { visits: 6, bills: 3000 }');
    expect(src).toContain('high: { visits: 12, bills: 15000 }');
  });

  it('ships the same model in the desktop mirror', () => {
    // desktop/web-app/public/stem_lab/ is genuinely live (bundled desktop app).
    // A fix that lands in one mirror only is a fix half the users never get.
    const a = bodyOf(read(SOURCE), 'calcPlanCost');
    const b = bodyOf(read(MIRROR), 'calcPlanCost');
    expect(b, 'calcPlanCost missing from the mirror').toBeTruthy();
    expect(b).toBe(a);
  });
});
