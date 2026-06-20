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

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
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
    expect(viewSrc).toMatch(/n\.kind === 'numeric' \? 'text-amber-800 font-semibold'/);
  });
  it('the "What now?" strip leads with Diff-review (not "share-ready") when fidelity is limited', () => {
    expect(viewSrc).toMatch(/pdf_audit\.whatnow\.fidelity/);
    expect(viewSrc).toMatch(/\(pdfFixResult && pdfFixResult\.fidelityLimited\)\s*\n?\s*\? \(t\('pdf_audit\.whatnow\.fidelity'\)/);
  });
});
