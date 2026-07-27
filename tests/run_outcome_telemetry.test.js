// @vitest-environment jsdom
// Regression guard for the honest run-outcome telemetry (A1, 2026-06-14).
//
// The run-history effect used to hard-code outcome:'success' for ANY completed run — so a doc that
// finished at afterScore=35 with residual axe violations landed in the SUCCESS numerator of the
// reliability rate Aaron defends to UMaine. A1 made the outcome a derived tri-state.
//
// REWRITTEN 2026-07-27 (deep dive). This file used to test two hand-written MIRRORS of the shipped
// derivations. Both had drifted, and one had drifted into asserting the OPPOSITE of shipped
// behaviour: 'cancelled runs are excluded from the reliability denominator' was green while audit
// finding M6 had deliberately put them IN the denominator — stalls and aborts vanishing from both
// sides of the ratio was exactly what made that rate unable to show the failure mode a pilot most
// needs to see. A green test asserting the opposite of the product is worse than no test: the next
// person to read it "fixes" the code back.
//
// Now: the outcome derivation drives the REAL exported remediationOutcome, and the rate rule is
// asserted against the SHIPPED expression in the view rather than a copy of it.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

let outcome;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  outcome = window.AlloModules.createDocPipeline({
    callGemini: async () => 'OK', callGeminiVision: async () => '', callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
  }).remediationOutcome;
});

// A result shaped the way the run-history effect really passes one.
// A COMPLETE AI audit means: a real score, not degraded, not synthesized, and every requested
// section actually read (chunksAudited === chunksRequested, _partialAudit !== true). Anything less
// is 'incomplete' by design — an unverified run must never enter the success numerator.
const result = (over) => Object.assign({
  afterScore: 96,
  axeAudit: { totalViolations: 0, score: 100 },
  equalAccessAudit: { failViolations: 0, score: 100 },
  verificationAudit: { score: 96, issues: [], chunksRequested: 3, chunksAudited: 3 },
  verificationState: 'complete',
  afterScoreVerified: true,
  requiresManualReview: false,
  _aiVerificationIncomplete: false,
}, over || {});

describe('the REAL outcome derivation (regression for A1)', () => {
  it('a run that reached target with a known-clean checker is a success', () => {
    expect(outcome(result(), { targetScore: 95 }).state).toBe('success');
  });

  it('THE BUG CASE: a completed run at afterScore=35 with violations is NOT success', () => {
    expect(outcome(result({ afterScore: 35, axeAudit: { totalViolations: 5, score: 40 } }), { targetScore: 95 }).state).not.toBe('success');
  });

  it('a high score with residual violations is still not a success (no free pass)', () => {
    expect(outcome(result({ axeAudit: { totalViolations: 3, score: 80 } }), { targetScore: 95 }).state).not.toBe('success');
  });

  it('completing below target is not a success', () => {
    expect(outcome(result({ afterScore: 72 }), { targetScore: 95 }).state).not.toBe('success');
  });

  it('an UNKNOWN checker state is not a success — unverified must never enter the numerator', () => {
    // Finding 15 (2026-07-10) reversed the original "conservative" rule, which counted a null axe
    // audit as SATISFYING "no violations". The old mirror in this file still encoded the pre-2026-07-10
    // behaviour and asserted it as correct.
    expect(outcome(result({ axeAudit: null }), { targetScore: 95 }).state).not.toBe('success');
  });

  it('a throttle-degraded AI verification is not a success', () => {
    expect(outcome(result({ _aiVerificationIncomplete: true }), { targetScore: 95 }).state).not.toBe('success');
  });
});

describe('the SHIPPED reliability-rate rule', () => {
  // Pinned against the view's own expression rather than a mirror of it — the mirror is what went
  // stale and started asserting the opposite of the product.
  const block = view.slice(view.indexOf('const _outcomed = _hist.filter('), view.indexOf('const _successRate'));

  it('the numerator is success ONLY', () => {
    expect(view).toContain("const _succeeded = _outcomed.filter((r) => r.outcome === 'success');");
    expect(view).toContain('_successRate = _outcomed.length ? Math.round(_succeeded.length / _outcomed.length * 100) : null;');
  });

  it('incomplete, failed AND cancelled all sit in the denominator (M6)', () => {
    expect(block.length).toBeGreaterThan(0);
    for (const o of ['success', 'incomplete', 'failed', 'cancelled']) {
      expect(block, `outcome '${o}' must be counted in the denominator`).toContain(`r.outcome === '${o}'`);
    }
  });

  it('a run with cancellations does not render as all-green', () => {
    expect(view).toContain('(_failed.length === 0 && _incomplete.length === 0 && _cancelled.length === 0)');
  });
});
