// vision-null-audit (2026-06-15): the auto-fix loop's "both engines report 0
// issues → stop" gate treated a NULL AI audit (reVerify === null, i.e. BOTH AI
// engines failed this pass) the same as "AI saw zero issues", so an axe-only clean
// was silently attributed to dual verification and the loop stopped early. The fix
// requires a non-null reVerify before claiming dual-clean; a null audit falls
// through (loop continues, bounded by maxFixPasses / stall / target-score guards).
//
// The stop is a pure boolean over (newAxeViolations, reVerify), so we model the NEW
// predicate and add anti-drift assertions that the shipped source matches it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of the NEW dual-clean break condition.
function shouldDualStop(newAxeViolations, reVerify) {
  if (!reVerify) return false; // no AI signal this pass — never read as dual-clean
  return newAxeViolations === 0 && (!reVerify.issues || reVerify.issues.length === 0);
}
// The OLD (buggy) condition, for the behavior-change assertion.
const oldDualStop = (newAxeViolations, reVerify) =>
  newAxeViolations === 0 && (!reVerify || !reVerify.issues || reVerify.issues.length === 0);

describe('auto-fix dual-clean gate — a null AI audit is not "zero issues"', () => {
  it('null reVerify + axe clean → does NOT stop (the bug)', () => {
    expect(shouldDualStop(0, null)).toBe(false);
  });
  it('null reVerify + axe dirty → does NOT stop', () => {
    expect(shouldDualStop(3, null)).toBe(false);
  });
  it('real empty AI audit + axe clean → stops (legitimate dual-clean preserved)', () => {
    expect(shouldDualStop(0, { issues: [] })).toBe(true);
  });
  it('real AI audit WITH issues + axe clean → does NOT stop', () => {
    expect(shouldDualStop(0, { issues: [{ issue: 'x' }] })).toBe(false);
  });
  it('real empty AI audit + axe dirty → does NOT stop', () => {
    expect(shouldDualStop(2, { issues: [] })).toBe(false);
  });

  it('documents the behavior change: the OLD predicate stopped on a null audit', () => {
    expect(oldDualStop(0, null)).toBe(true);   // old: false dual-clean
    expect(shouldDualStop(0, null)).toBe(false); // new: continues
  });

  it('anti-drift: the buggy null-as-clean clause is gone and the unavailability path is live', () => {
    expect(src).not.toContain('(!reVerify || !reVerify.issues || reVerify.issues.length === 0)');
    expect(src).toContain('AI verification unavailable this pass');
  });
});
