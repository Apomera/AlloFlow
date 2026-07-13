// Keystone gate fix (2026-06-15): a >5% post-save token-coverage LOSS must downgrade
// roundTrip.ok. Before, ok was finalized from STRUCTURAL checks only (createTaggedPdf
// ~17971), then the text-coverage 'fail' was pushed into checks AFTER without recomputing
// ok — so a shipped PDF silently missing words returned ok:true and sailed past both gates
// (batch EXCLUDE on ok===false; single-file UNVERIFIED decision panel). This pins the
// coupling and that BOTH consumers still gate on ok===false.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// Mirror of the gate logic: structural ok is computed first, then a coverage 'fail' (<0.95)
// downgrades it; a 'warn' (0.95–0.99) still ships.
const covStatus = (coverage) => (coverage < 0.95 ? 'fail' : (coverage < 0.99 ? 'warn' : 'pass'));
const roundTripOk = (structuralOk, coverage) => {
  let ok = structuralOk;
  if (covStatus(coverage) === 'fail') ok = false;
  return ok;
};

describe('round-trip text-coverage feeds the gate', () => {
  it('a >5% word-loss (coverage <0.95) downgrades ok to false — the bug', () => {
    expect(roundTripOk(true, 0.90)).toBe(false);
    expect(roundTripOk(true, 0.80)).toBe(false);
  });
  it('a 95–99% coverage is a WARN and still ships (ok stays true)', () => {
    expect(roundTripOk(true, 0.97)).toBe(true);
    expect(roundTripOk(true, 0.95)).toBe(true);
  });
  it('full coverage and clean structure stays ok', () => {
    expect(roundTripOk(true, 1.0)).toBe(true);
  });
  it('a prior structural failure is never resurrected by good coverage', () => {
    expect(roundTripOk(false, 1.0)).toBe(false);
  });

  it('anti-drift: the coupling exists in createTaggedPdf', () => {
    expect(pipeSrc).toContain("const _covStatus = _coverage < 0.95 ? 'fail' : 'warn';");
    expect(pipeSrc).toContain("if (_covStatus === 'fail') _roundTrip.ok = false;");
  });
  it('anti-drift: both consumers still gate on roundTrip.ok === false', () => {
    // batch path excludes the file from the ZIP
    expect(pipeSrc).toContain('if (rt && rt.ok === false)');
    // single-file path routes to the UNVERIFIED decision panel (no silent download)
    expect(viewSrc).toContain('if (roundTrip && roundTrip.ok === false)');
  });
});
