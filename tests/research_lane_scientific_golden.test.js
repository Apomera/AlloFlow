// Scientific lane (Phenomenon Workbench) golden master — validator integrity.
//
// Pins the AI-output validators the 2026-06-07 review named:
//   * steelmanValidate — the "another reading" must cite >=2 REAL evidence
//     cards by id with a quoted snippet that actually appears in the card, and
//     its framing note must stay non-directive. (Anti-fabrication: the AI can't
//     invent evidence or smuggle in "the correct reading".)
//   * honestUncertaintyValidate — the AI may flag calibration but must NOT
//     rewrite the student's own claim label (student authorship is preserved).
//
// Logic only — no React render. The scientific LoopBackPicker source/artifact
// drift (the P0) is guarded separately by check_research_drift.cjs.

import { describe, it, expect, beforeAll } from 'vitest';
import { setupLane, laneInternals } from './helpers/research_lane_harness.js';

beforeAll(() => setupLane('scientific'));
const S = () => laneInternals('scientific');

// ── steelmanValidate ──────────────────────────────────────────────────────
describe('Scientific · steelmanValidate', () => {
  const journal = {
    evidenceCards: [
      { id: 'e1', text: 'the wire heated up faster when it was thicker' },
      { id: 'e2', text: 'thinner wires showed less current flow overall' },
    ],
    stageNotes: { interpret_argue: { text: '', steelmanText: '' } },
  };
  // Post-strip shape: another_reading has NO `summary` — the hub footgun-strip
  // (/^summary$/i) deletes it before steelmanValidate runs (by design), so the
  // prompt no longer requests it, the validator no longer checks it, and the UI
  // no longer renders it (2026-06-07 fix).
  const validOut = () => ({
    another_reading: {
      cited_evidence: [
        { card_id: 'e1', quoted_snippet: 'wire heated up faster' },
        { card_id: 'e2', quoted_snippet: 'less current flow' },
      ],
      assumptions_required_questions: ['What would have to hold for this reading?'],
      disconfirmer_questions: ['What observation would disconfirm it?'],
    },
    framing_note: 'This is another reading of the same evidence, not a verdict.',
  });

  it('accepts a well-formed another-reading citing two real cards (no summary needed)', () => {
    const res = S().steelmanValidate(validOut(), journal);
    expect(res.__rejected).toBeFalsy();
  });

  it('no longer runs a summary paraphrase guard (removed with the footgun-stripped field)', () => {
    // A journal whose reading the summary echoes verbatim would have tripped the
    // old `summary_paraphrases_student` 6-gram guard. Since summary is stripped
    // by design, that guard was dead code and is gone — this must NOT reject.
    const echoJournal = Object.assign({}, journal, {
      stageNotes: { interpret_argue: { text: 'the wire heated up faster when it was thicker conductor geometry', steelmanText: '' } },
    });
    const out = validOut();
    out.another_reading.summary = 'the wire heated up faster when it was thicker conductor geometry';
    const res = S().steelmanValidate(out, echoJournal);
    expect(res.__rejected).toBeFalsy();
  });

  it('rejects when another_reading is missing', () => {
    const res = S().steelmanValidate({}, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('missing_another_reading');
  });

  it('rejects fewer than two cited evidence cards', () => {
    const out = validOut();
    out.another_reading.cited_evidence = [{ card_id: 'e1', quoted_snippet: 'wire heated up faster' }];
    const res = S().steelmanValidate(out, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('too_few_cited_evidence');
  });

  it('rejects a citation to a card id that does not exist (anti-fabrication)', () => {
    const out = validOut();
    out.another_reading.cited_evidence[0].card_id = 'ghost';
    const res = S().steelmanValidate(out, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('cited_card_not_found');
  });

  it('rejects a quoted snippet that is not actually in the cited card', () => {
    const out = validOut();
    out.another_reading.cited_evidence[0].quoted_snippet = 'a snippet never present in the card';
    const res = S().steelmanValidate(out, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('quoted_snippet_not_in_card');
  });

  it('rejects a directive framing note ("the correct reading")', () => {
    const out = validOut();
    out.framing_note = 'This is the correct reading you should instead adopt.';
    const res = S().steelmanValidate(out, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('framing_note_directive');
  });
});

// ── honestUncertaintyValidate ─────────────────────────────────────────────
describe('Scientific · honestUncertaintyValidate', () => {
  const journal = { claims: [{ label: 'supported' }], evidenceCards: [{ id: 'e1', text: 'x' }] };

  it('accepts a per_claim entry that preserves the student label', () => {
    const out = { per_claim: [{ student_label: 'supported', calibration_flag: 'worth-reexamining' }] };
    const res = S().honestUncertaintyValidate(out, journal);
    expect(res.__rejected).toBeFalsy();
  });

  it('rejects if the AI altered the student-authored label (authorship guard)', () => {
    const out = { per_claim: [{ student_label: 'refuted', calibration_flag: 'over-confident' }] };
    const res = S().honestUncertaintyValidate(out, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('student_label_modified');
  });

  it('rejects a per_claim length mismatch with the journal claims', () => {
    const out = { per_claim: [] };
    const res = S().honestUncertaintyValidate(out, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('per_claim_length_mismatch');
  });

  it('rejects a citation to a non-existent evidence card', () => {
    const out = { per_claim: [{ student_label: 'supported', calibration_flag: 'over-confident', evidence_cited: [{ card_id: 'ghost' }] }] };
    const res = S().honestUncertaintyValidate(out, journal);
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('cited_card_not_found');
  });
});
