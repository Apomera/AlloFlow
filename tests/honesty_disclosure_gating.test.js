// Honesty/disclosure gating (Batch 2, 2026-07-03). Five fixes so a green headline / triumphant chord /
// "Full text preserved." never contradicts the review state the teacher must act on:
//   M4 — success toast + victory chord gate on !needsExpertReview (a fidelity concern that didn't set
//        integrityWarning — garbled OCR, weak alt, dropped link/table — no longer plays "remediated!").
//   M5 — the DOWNLOADABLE report surfaces integrityWarning + fidelityNotes and suppresses "Full text
//        preserved." when any concern exists (was a dead disclosure — the filed artifact read clean).
//   M6 — an aborted batch reports "Batch stopped", not "✅ Batch complete", and the chord is gated on a
//        genuine full completion (not a quota pause or user abort).
//   M7 — the extraction "quality" is an AI self-rating on a 4KB sample, not a verification: no "✅ verified"
//        badge, and missingContent (a previously dead field) is consumed.
//   L6 — the content-integrity toast says "% of source characters present", not "% coverage verified".
// These live inside fixAndVerifyPdf / the batch runner / the report generators (need axe/EA/pdf), so this
// pins the control flow + mirrors the pure decisions (the documented harness boundary).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('M4 — success toast + chord gate on !needsExpertReview', () => {
  it('the >=80 "remediated!" + sessionComplete branch requires !needsExpertReview', () => {
    expect(dp).toContain('finalAfterScore !== null && finalAfterScore >= 80 && !needsExpertReview');
  });
  it('a high score WITH needsExpertReview routes to the neutral toast + non-triumphant sound', () => {
    expect(dp).toContain('finalAfterScore !== null && finalAfterScore >= 80 && needsExpertReview');
    expect(dp).toContain('needs an expert review before distributing');
  });
  it('mirror: score 90 + needsExpertReview is NOT the triumphant branch', () => {
    const successBranch = (score, needsExpert) => score !== null && score >= 80 && !needsExpert;
    expect(successBranch(90, true)).toBe(false);
    expect(successBranch(90, false)).toBe(true);
  });
});

describe('M5 — report surfaces fidelity concerns; no "Full text preserved." over a warning', () => {
  it('the result object carries integrityWarning for the downloadable report', () => {
    expect(dp).toContain('integrityWarning: integrityWarning || null');
  });
  it('_honestReportBlocks builds a fidelity-notes block from integrityWarning + fidelityNotes', () => {
    expect(dp).toContain('const _fidelityItems = (() => {');
    expect(dp).toContain('Fidelity notes — review before distributing');
  });
  it('suppresses "Full text preserved." when any fidelity concern exists', () => {
    expect(dp).toContain('See the fidelity notes below before distributing.');
    expect(dp).toMatch(/const _covNote = _fidelityItems\.length/);
  });
  it('BOTH report call sites thread integrityWarning + fidelityNotes', () => {
    expect(dp).toContain('integrityWarning: d.integrityWarning, fidelityNotes: d.fidelityNotes');
    expect(dp).toContain('integrityWarning: fr.integrityWarning, fidelityNotes: fr.fidelityNotes');
  });
  it('mirror: a concern present → "see fidelity notes"; none → "Full text preserved."', () => {
    const covNote = (items, coverage) => items.length
      ? 'See the fidelity notes below before distributing.'
      : (coverage < 97 ? 'Some characters differ from the source' : 'Full text preserved.');
    expect(covNote([{ msg: 'numeric loss' }], 100)).toContain('fidelity notes');
    expect(covNote([], 100)).toBe('Full text preserved.');
  });
});

describe('M6 — aborted batch is not a completion', () => {
  it('detects a user abort and reports "Batch stopped" instead of "Batch complete"', () => {
    expect(dp).toContain('const _aborted = !!(_batchAbortCtrl && _batchAbortCtrl.signal && _batchAbortCtrl.signal.aborted)');
    expect(dp).toContain('Batch stopped:'); // emoji prefix stored as a \uXXXX escape (codebase convention)
  });
  it('gates the triumphant chord on a genuine full completion', () => {
    expect(dp).toContain('if (!_quotaStopped && !_aborted) {');
  });
  it('mirror: abort → not "complete"; chord skipped', () => {
    const branch = (quotaStopped, aborted) => quotaStopped ? 'paused' : aborted ? 'stopped' : 'complete';
    const chord = (quotaStopped, aborted) => !quotaStopped && !aborted;
    expect(branch(false, true)).toBe('stopped');
    expect(chord(false, true)).toBe(false);
    expect(chord(false, false)).toBe(true);
  });
});

describe('M7 — extraction quality is an AI self-rating, missingContent is consumed', () => {
  it('drops the "✅ Extraction verified" badge and self-rates on a sample', () => {
    expect(dp).not.toContain('✅ Extraction verified');
    expect(dp).toContain('AI self-rated');
  });
  it('consumes missingContent (was a dead field) — warns even at a high self-rating', () => {
    expect(dp).toContain('const _missing = verification.missingContent === true;');
    expect(dp).toContain('flagged possibly MISSING content');
  });
  it('mirror: missingContent=true warns even at quality 9', () => {
    const warn = (quality, missing) => (quality < 6 || missing === true);
    expect(warn(9, true)).toBe(true);
    expect(warn(9, false)).toBe(false);
  });
});

describe('L6 — content-integrity toast does not overstate a bulk char-count', () => {
  it('says "% of source characters present", not "% coverage verified"', () => {
    expect(dp).toContain('% of source characters present');
  });
});
