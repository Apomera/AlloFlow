// psycheck verifier coverage: every score the clinician can enter must be one
// the verifier can check.
//
// WHY: until 2026-09-23 the verifier only knew subtest names for six
// instruments. 47 of the 110 subtests offered in Step 4 (all of WJ IV, KABC-II,
// DAS-II, CELF-5, KTEA-3, SRS-2, GARS-3 and BOT-2) were never bound to a draft
// citation, so a WRONG score for them passed silently and the row was listed as
// "not discussed" even when the draft discussed it. A bare "BASC-3" also meant
// the Teacher form, so a Parent score cited that way was reported as fabricated.
//
// The coverage test walks the presets the UI offers (not a copy), so a new
// instrument without verifier support fails here.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let PC;
let presets;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  PC = window.AlloPsycheck;
  presets = window.AlloModules.ReportWriterUtils.assessmentPresets;
});

const kinds = (r) => r.discrepancies.map(d => d.kind);
const typicalScore = (p) => (p.scoreType === 'T-score' ? 66 : (p.mean === 50 ? 45 : 88));

describe('every subtest the clinician can enter is checkable', () => {
  it('a correct citation is verified and a wrong one is flagged, for all presets', () => {
    const unverified = [], unflagged = [];
    for (const [assessment, preset] of Object.entries(presets)) {
      for (const subtest of preset.subtests) {
        const score = typicalScore(preset);
        const src = [{ assessment, subtest, score, scoreType: preset.scoreType }];
        const ok = PC.verifyDraft(src, `On the ${assessment}, ${subtest} was ${score}.`);
        if (ok.verified.length !== 1 || ok.discrepancies.length || ok.omitted_scores.length) unverified.push(`${assessment} ${subtest}`);
        const bad = PC.verifyDraft(src, `On the ${assessment}, ${subtest} was ${score + 7}.`);
        if (!bad.discrepancies.length) unflagged.push(`${assessment} ${subtest}`);
      }
    }
    expect(unverified, 'correct citations the verifier could not bind').toEqual([]);
    expect(unflagged, 'wrong scores the verifier let through').toEqual([]);
  });

  it('common report abbreviations bind to the right subtest', () => {
    const cases = [
      ['WJ-IV COG', 'General Intellectual Ability', 'standard', 'On the WJ IV COG, the GIA was 88.'],
      ['KABC-II', 'Mental Processing Index', 'standard', 'On the KABC-II, the MPI was 92.'],
      ['DAS-II', 'General Conceptual Ability', 'standard', 'On the DAS-II, the GCA was 95.'],
      ['CELF-5', 'Core Language', 'standard', 'On the CELF-5, the Core Language Score (CLS) was 78.'],
      ['KTEA-3', 'Academic Skills Battery', 'standard', 'On the KTEA-3, the ASB was 84.'],
      ['BOT-2', 'Total Motor Composite', 'standard', 'On the BOT-2, the TMC was 38.'],
      ['WJ-IV ACH', 'Letter-Word ID', 'standard', 'On the WJ IV ACH, Letter-Word Identification was 81.'],
    ];
    for (const [assessment, subtest, scoreType, draft] of cases) {
      const score = Number(draft.match(/(\d+)\.$/)[1]);
      const r = PC.verifyDraft([{ assessment, subtest, score, scoreType }], draft);
      expect(r.verified.length, draft).toBe(1);
      expect(r.discrepancies, draft).toEqual([]);
    }
  });
});

describe('a bare test name is bound to the form that holds the score', () => {
  const both = [
    { assessment: 'BASC-3 (Parent)', subtest: 'Hyperactivity', score: 66, scoreType: 'T-score' },
    { assessment: 'BASC-3 (Teacher)', subtest: 'Hyperactivity', score: 72, scoreType: 'T-score' },
  ];

  it('"BASC-3 Hyperactivity was 66" matches the Parent form, not a fabricated Teacher row', () => {
    const r = PC.verifyDraft(both, 'On the BASC-3, Hyperactivity was 66.');
    expect(r.discrepancies).toEqual([]);
    expect(r.verified[0].assessment).toBe('BASC-3 (Parent)');
    expect(r.omitted_scores.map(s => s.assessment)).toEqual(['BASC-3 (Teacher)']);
  });

  it('a value that matches neither form is still flagged', () => {
    expect(kinds(PC.verifyDraft(both, 'On the BASC-3, Hyperactivity was 70.'))).toContain('score_mismatch');
  });

  it('with only the Parent form entered, a bare "BASC-3" citation verifies', () => {
    const r = PC.verifyDraft([both[0]], 'On the BASC-3, Hyperactivity was 66.');
    expect(r.discrepancies).toEqual([]);
    expect(r.verified).toHaveLength(1);
  });

  it('"WJ IV" alone resolves to the Achievement form for an achievement cluster', () => {
    const src = [{ assessment: 'WJ-IV ACH', subtest: 'Broad Reading', score: 85, scoreType: 'standard' }];
    const r = PC.verifyDraft(src, 'On the WJ IV, Broad Reading was 85.');
    expect(r.discrepancies).toEqual([]);
    expect(r.verified).toHaveLength(1);
  });

  it('a named form still wins over the bare name', () => {
    const r = PC.verifyDraft(both, 'On the BASC-3 Teacher Rating Scales, Hyperactivity was 72.');
    expect(r.discrepancies).toEqual([]);
    expect(r.verified[0].assessment).toBe('BASC-3 (Teacher)');
  });
});

describe('a guessed instrument that is not in the input is inconclusive, not a fabrication', () => {
  const wisc = [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 102, score_type: 'standard' }];

  it('an ordinary word like "planning" before a number does not raise a fabricated-row alarm', () => {
    // "Planning" is a KABC-II subtest name; KABC-II is neither named nor entered.
    const r = PC.verifyDraft(wisc, 'On the WISC-V, the Full Scale IQ was 102. Planning, which his teacher rated 85 on her own checklist, remains a goal.');
    expect(r.discrepancies).toEqual([]);
    expect(r.inconclusive.length).toBeGreaterThan(0);
  });

  it('a confidence-interval bound is not read as a second, wrong score', () => {
    // The interval is recorded, so the draft may state it (report_writer_report_values.test.js).
    const withCI = [{ ...wisc[0], ciLow: 97, ciHigh: 107, ciLevel: 95 }];
    expect(PC.verifyDraft(withCI, 'On the WISC-V, the Full Scale IQ was 102 (95% CI 97-107).').discrepancies).toEqual([]);
    expect(PC.verifyDraft(withCI, 'On the WISC-V, the Full Scale IQ was 102, with a 95% confidence interval of 97 to 107.').discrepancies).toEqual([]);
  });

  it('a subtest named in one sentence does not bind a number in the next', () => {
    const r = PC.verifyDraft(wisc, 'On the WISC-V, the Full Scale IQ was 102. His teacher reports he completed 92 of the assignments.');
    expect(r.discrepancies).toEqual([]);
  });

  it('counts are not read as scores', () => {
    const r = PC.verifyDraft(wisc, 'On the WISC-V, the Full Scale IQ was 102 and he read 45 words correctly, present 88 days.');
    expect(r.discrepancies).toEqual([]);
  });

  it('a wrong score in the SAME sentence as its subtest is still caught', () => {
    expect(kinds(PC.verifyDraft(wisc, 'On the WISC-V, the Full Scale IQ was 97.'))).toContain('score_mismatch');
  });

  it('an instrument named in the same sentence with a subtest it does not have is flagged', () => {
    expect(kinds(PC.verifyDraft(wisc, 'On the WISC-V, the Full Scale IQ was 102. On the WISC-V, Broad Reading was 90.'))).toContain('score_mismatch');
  });

  it('a NAMED instrument missing from the input is still flagged', () => {
    const r = PC.verifyDraft(wisc, 'On the WISC-V, the Full Scale IQ was 102. On the KABC-II, Learning was 85.');
    expect(kinds(r)).toContain('score_mismatch');
  });
});

// Subtests the clinician adds by hand. Until 2026-09-23 a custom subtest was
// invisible to the checker (a wrong score passed and the row was listed as "not
// discussed"), and two aliases joined different scales: WIAT-4 "Math Problem
// Solving" (a subtest) was checked against the Math Composite, and WISC-IV
// "Perceptual Reasoning" against the WISC-V Visual Spatial index.
describe('subtests the clinician adds by hand', () => {
  const wiat = (subtest, score) => [{ assessment: 'WIAT-4', subtest, score, scoreType: 'standard' }];
  it('a custom subtest is checked: right is verified, wrong is flagged against its own score', () => {
    const ok = PC.verifyDraft(wiat('Pseudoword Decoding', 84), 'On the WIAT-4, Pseudoword Decoding was 84.');
    expect(ok.verified.map(v => v.subtest)).toEqual(['Pseudoword Decoding']);
    expect(ok.omitted_scores).toHaveLength(0);
    const bad = PC.verifyDraft(wiat('Pseudoword Decoding', 84), 'On the WIAT-4, Pseudoword Decoding was 90.');
    expect(bad.discrepancies.map(d => d.data_shows)).toEqual(['Pseudoword Decoding = 84']);
  });
  it('a row named like an alias is checked as itself', () => {
    expect(PC.verifyDraft(wiat('Math Problem Solving', 88), 'On the WIAT-4, Math Problem Solving was 88.').discrepancies).toHaveLength(0);
    const bad = PC.verifyDraft(wiat('Math Problem Solving', 88), 'On the WIAT-4, Math Problem Solving was 80.');
    expect(bad.discrepancies.map(d => d.data_shows)).toEqual(['Math Problem Solving = 88']);
  });
  it('the clinician\'s row name wins over an alias with the same words', () => {
    // "math concepts & applications" is an alias of the preset "Math Concepts".
    const src = [{ assessment: 'KTEA-3', subtest: 'Math Concepts & Applications', score: 90, scoreType: 'standard' }];
    const r = PC.verifyDraft(src, 'On the KTEA-3, Math Concepts & Applications was 90.');
    expect(r.discrepancies).toHaveLength(0);
    expect(r.verified.map(v => v.subtest)).toEqual(['Math Concepts & Applications']);
  });
  it('a subtest is never checked against a composite of another name', () => {
    const r = PC.verifyDraft(wiat('Math Composite', 95), 'On the WIAT-4, Math Problem Solving was 88 and the Math Composite was 95.');
    expect(r.discrepancies.map(d => d.data_shows)).not.toContain('Math Composite = 95');
    expect(r.verified.map(v => v.subtest)).toEqual(['Math Composite']);
    const wisc = [{ assessment: 'WISC-V', subtest: 'Visual Spatial', score: 100, scoreType: 'standard' }];
    expect(PC.verifyDraft(wisc, 'On the WISC-V, Visual Spatial was 100. On the WISC-IV in 2019, Perceptual Reasoning was 86.').discrepancies).toHaveLength(0);
  });
  it('one report\'s custom names do not leak into the next check', () => {
    PC.verifyDraft(wiat('Pseudoword Decoding', 84), 'On the WIAT-4, Pseudoword Decoding was 84.');
    const later = PC.verifyDraft(wiat('Word Reading', 90), 'On the WIAT-4, Word Reading was 90. Pseudoword Decoding was 70.');
    expect(later.discrepancies).toHaveLength(0);
    expect(PC._extractScoreCitations('On the WIAT-4, Pseudoword Decoding was 70.')).toHaveLength(0);
  });
});
