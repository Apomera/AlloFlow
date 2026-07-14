// Regression guard for the honest run-outcome telemetry (A1, 2026-06-14).
//
// The run-history effect (AlloFlowANTI.txt, the success effect ~L10465) used to
// hard-code outcome:'success' for ANY completed run — so a doc that finished at
// afterScore=35 with residual axe violations landed in the SUCCESS numerator of
// the reliability rate Aaron defends to UMaine/Garry. A1 made the outcome a
// derived tri-state. This test mirrors that derivation + the honest-rate
// computation (view_pdf_audit_source.jsx run-history badge ~L2640) so the metric
// can't silently regress to "every run that didn't crash = success". (Mirror
// pattern, like fixHeadingHierarchy in doc_pipeline_wcag.test.js — keep the two
// derivations in sync with the inline source.)

import { describe, it, expect } from 'vitest';

// Mirror: outcome derivation — `_outcome` in the success effect.
// success = reached the teacher's target with no KNOWN residual violations.
// CONSERVATIVE: a null axe audit (checker didn't run) is NOT downgraded.
function deriveOutcome(afterScore, residualViolations, target) {
  return (afterScore >= target && (residualViolations === 0 || residualViolations == null)) ? 'success' : 'incomplete';
}

// Mirror: honest success rate (run-history badge) — numerator is 'success' ONLY;
// 'incomplete' and 'failed' sit in the denominator; rows with no outcome
// (pre-telemetry / loaded snapshots) are excluded entirely.
function successRate(rows) {
  const outcomed = rows.filter((r) => r.outcome === 'success' || r.outcome === 'incomplete' || r.outcome === 'failed');
  const succeeded = outcomed.filter((r) => r.outcome === 'success');
  return outcomed.length ? Math.round(succeeded.length / outcomed.length * 100) : null;
}

describe('run-outcome telemetry — honest tri-state (regression for A1)', () => {
  const T = 90; // pdfTargetScore default
  it('a high-score, zero-violation run is success', () => {
    expect(deriveOutcome(95, 0, T)).toBe('success');
  });
  it('THE BUG CASE: a completed run at afterScore=35 with violations is incomplete, NOT success', () => {
    expect(deriveOutcome(35, 5, T)).toBe('incomplete');
  });
  it('a high score with residual violations is still incomplete (no free pass)', () => {
    expect(deriveOutcome(95, 3, T)).toBe('incomplete');
  });
  it('completing below target is incomplete', () => {
    expect(deriveOutcome(85, 0, T)).toBe('incomplete');
  });
  it('CONSERVATIVE: a null axe audit (checker did not run) is NOT downgraded', () => {
    expect(deriveOutcome(95, null, T)).toBe('success');
  });
  it('exactly at target counts as success', () => {
    expect(deriveOutcome(90, 0, T)).toBe('success');
  });
  it('honest rate counts ONLY success in the numerator (incomplete + failed in the denominator)', () => {
    const rows = [{ outcome: 'success' }, { outcome: 'success' }, { outcome: 'incomplete' }, { outcome: 'failed' }];
    // 2 of 4 outcomed → 50%. The OLD code (numerator = outcomed − failed) said 75%.
    expect(successRate(rows)).toBe(50);
  });
  it('rows with no outcome (pre-telemetry / loaded snapshots) are excluded from the rate', () => {
    const rows = [{ outcome: 'success' }, {}, { foo: 1 }];
    expect(successRate(rows)).toBe(100); // only the 1 outcomed row counts
  });
});
