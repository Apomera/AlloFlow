// Numeric value-fidelity surfacing (2026-06-20) — from the pipeline-enhancement workflow.
// We already DETECT silently-changed numbers (the value-fidelity gate), but the signal lived only
// in a transient toast + integrityWarning: the persistent fidelity panel and `fidelityLimited`
// (which drives the score's amber asterisk) were keyed on char-coverage % + structural notes ONLY,
// so a green-looking score could sit on a known changed number. This pushes numeric losses into the
// SAME persistent notes, so the panel lists them and the score is flagged. Pins the escalation +
// (anti-drift) the wiring on both sides.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const pipeSrc =readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the shipped fidelityLimited derivation ──
const fidelityLimited = (coverage, notes) => (coverage != null && coverage < 90) || notes.length > 0;

describe('a changed number escalates fidelityLimited even at high char-coverage', () => {
  it('99% coverage + a numeric-loss note → limited (the bug: was false)', () => {
    expect(fidelityLimited(99, [{ kind: 'numeric', msg: '1 value changed' }])).toBe(true);
  });
  it('99% coverage + no notes → not limited (unchanged)', () => {
    expect(fidelityLimited(99, [])).toBe(false);
  });
  it('low coverage still limits regardless', () => {
    expect(fidelityLimited(85, [])).toBe(true);
  });
});

describe('anti-drift: doc_pipeline pushes numeric losses into the persistent notes', () => {
  it('captures the numeric loss out of the integrity try', () => {
    expect(pipeSrc).toMatch(/let _numericLossWarn = null;/);
    expect(pipeSrc).toMatch(/_numericLossWarn = _valWarn;/);
  });
  it('pushes a numeric note into _structuralFidelityNotes (drives the panel + fidelityLimited)', () => {
    expect(pipeSrc).toMatch(/_structuralFidelityNotes\.push\(\{ kind: 'numeric', msg: _numericLossWarn \}\)/);
  });
});

describe('anti-drift: the view surfaces numeric losses + an integrity-aware "What now?"', () => {
  it('the fidelity panel renders the numeric kind with its own icon/color', () => {
    expect(viewSrc).toMatch(/n\.kind === 'numeric' \? '🔢'/);
    // H6 (2026-07-09): the amber emphasis class is shared with the placement kind now.
    expect(viewSrc).toMatch(/\(n\.kind === 'numeric' \|\| n\.kind === 'placement'\) \? 'text-amber-800 font-semibold'/);
  });
  // b4d7ed714 (2026-09-13): the "what now" guidance moved to the workspace header's status line
  // (state.title / state.detail / its one action), built by _pdfWorkspaceState in
  // remediation_workspace_component.jsx. Run it for a limited result.
  it('the "What now?" strip leads with Diff-review (not "share-ready") when fidelity is limited', () => {
    expect(viewSrc).toContain('const _workspaceState = _pdfWorkspaceState({ audit: pdfAuditResult, result: pdfFixResult,');
    expect(viewSrc).toContain('<_PdfWorkspaceHeader t={t} state={_workspaceState}');
    const ws = readFileSync(resolve(process.cwd(), 'remediation_workspace_component.jsx'), 'utf8');
    expect(ws).toContain('<p className="pdf-workspace-status-detail">{state.detail}</p>');
    const fn = (name) => sliceBetween(ws, 'function ' + name + '(', '\nfunction ', { file: 'remediation_workspace_component.jsx', label: name });
    const workspaceState = new Function(['_pdfWorkspaceText', '_pdfWorkspaceHasPreservationConcern', '_pdfWorkspaceState'].map(fn).join('\n') + '\nreturn _pdfWorkspaceState;')();
    const evidence = { fullyVerifiedSuccess: true, allThreeComplete: true, totalEngineFindings: 0, reviewCount: 0, verification: { verificationState: 'complete', engineExecutionComplete: true } };
    for (const result of [{ fidelityLimited: true }, { fidelityNotes: [{ kind: 'numeric', msg: '1 value changed' }] }]) {
      const limited = workspaceState({ result: { accessibleHtml: '<p>Score 12</p>', ...result }, evidence, verdict: { level: 'review' } });
      expect(limited.title).toBe('Needs review');
      expect(limited.detail).toMatch(/^Compare the output with the source/);
      expect(limited.destination).toBe('#pdf-content-fidelity-review');
    }
    const clean = workspaceState({ result: { accessibleHtml: '<p>Score 12</p>' }, evidence, verdict: { level: 'ready' } });
    expect(clean.destination).toBe('#allo-sec-downloads');
  });
});
