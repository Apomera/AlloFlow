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
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('M4/H3 — the "fully verified!" claim gates on !needsExpertReview', () => {
  let selectToast;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    selectToast = window.AlloModules.createDocPipeline.selectCompletionToast;
  });

  // These used to be source-substring pins plus a hand-written MIRROR of the branch logic. Audit
  // finding H3 (2026-07-26) found the guarding pin had been dead for some time — it asserted a
  // string that no longer appeared anywhere in the file — and the mirror exercised a local arrow
  // function, so it passed no matter what the pipeline did. Meanwhile the real ladder HAD lost the
  // gate: a document that lost a hyperlink or a table, or whose alt text is information-free, sets
  // needsExpertReview WITHOUT setting integrityWarning, so the structural audits come back clean,
  // the score clears target, and it played "PDF remediated and fully verified!" plus the victory
  // chord over known fidelity damage.
  //
  // The ladder is a pure selector now, so these drive the REAL decision.
  const shape = (over) => Object.assign({
    outcomeState: 'success', integrityWarning: null, aiVerificationIncomplete: false,
    slicedAudit: false, needsExpertReview: false, finalAfterScore: 95,
  }, over || {});

  it('a clean success is still the triumphant branch', () => {
    expect(selectToast(shape())).toBe('success');
  });

  it('a high score WITH needsExpertReview is NOT — the defect H3 found', () => {
    expect(selectToast(shape({ needsExpertReview: true }))).toBe('expert-review');
  });

  it('the expert-review branch survives an outcome the policy layer calls a success', () => {
    // _alloRemediationOutcome never reads needsExpertReview or the fidelity notes — it is fed only
    // ai/axe/EqualAccess evidence — so 'success' and 'needs a human' genuinely co-occur.
    expect(selectToast(shape({ needsExpertReview: true, finalAfterScore: 99 }))).not.toBe('success');
  });

  it('the earlier, louder disclosures still win over both', () => {
    expect(selectToast(shape({ integrityWarning: 'text may be missing', needsExpertReview: true }))).toBe('integrity');
    expect(selectToast(shape({ aiVerificationIncomplete: true }))).toBe('ai-incomplete');
    expect(selectToast(shape({ slicedAudit: true }))).toBe('sliced-baseline');
  });

  it('a non-success with a score falls to the neutral "improved" toast', () => {
    expect(selectToast(shape({ outcomeState: 'partial', finalAfterScore: 72 }))).toBe('improved');
  });

  it('no score at all falls to the plain transformed message', () => {
    expect(selectToast(shape({ outcomeState: 'partial', finalAfterScore: null }))).toBe('transformed');
    expect(selectToast(shape({ outcomeState: 'partial', finalAfterScore: undefined }))).toBe('transformed');
  });

  it('the ladder in the pipeline really is driven by this selector', () => {
    expect(dp).toContain('const _toastBranch = _alloSelectCompletionToast({');
    expect(dp).toContain("} else if (_toastBranch === 'expert-review') {");
    expect(dp).toContain('needs an expert review before distributing');
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
  // Re-pinned 2026-07-26: both source pins here had gone stale — the flag was renamed and the
  // chord guard gained a third term — so they were red for reasons that had nothing to do with the
  // behaviour they guard. Pinned to the DECISION now, not to one spelling of it.
  it('detects a user abort and reports "Batch stopped" instead of "Batch complete"', () => {
    expect(dp).toContain('_batchAbortCtrl.signal.aborted');
    expect(dp).toContain('Batch stopped:'); // emoji prefix stored as a \uXXXX escape (codebase convention)
    const iStopped = dp.indexOf('Batch stopped:');
    const iComplete = dp.indexOf('Batch complete:');
    expect(iStopped).toBeGreaterThan(0);
    expect(iComplete).toBeGreaterThan(iStopped); // the abort branch is reached FIRST
  });
  it('gates the triumphant chord on a genuine full completion', () => {
    const tail = dp.slice(dp.indexOf('// Audio: triumphant chord ONLY on a genuine full completion'));
    const guard = tail.slice(0, tail.indexOf('sessionComplete()'));
    expect(guard).toContain('!_quotaStopped');
    expect(guard).toContain('!_aborted');
    expect(guard).toContain('!_batchHandoffStopped'); // added after this pin was written
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
