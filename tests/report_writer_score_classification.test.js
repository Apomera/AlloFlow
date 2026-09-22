// Report Writer score classification, checked against the publishers' manuals.
//
// WHY: the Report Writer labels every score three times — on the score badge,
// in the AI prompt, and in the psycheck verifier that audits the AI's draft.
// Until 2026-09-22 all three used one generic table for every instrument, so:
//   - the verifier flagged the WISC-V manual's own term ("Very Low", 70-79) as
//     an error and accepted "Below Average";
//   - a BASC-3 T of 63 was labelled "High Average" (the manual: At-Risk);
//   - a GARS-3 Autism Index of 100 was labelled "Average" (it is a likelihood
//     scale, not an ability score);
// and the old clinical tests passed because they checked a frozen copy of the
// code that held the same wrong labels.
//
// ORACLE is written from the manuals, NOT copied from the module. It is the
// thing the shipped code is checked against. If a manual is revised, change
// the oracle first and let the module fail. Every band edge is listed so an
// off-by-one in either direction fails. Sources are in
// docs/clinical_validation_log.md.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let PC;
let utils;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  PC = window.AlloPsycheck;
  utils = window.AlloModules && window.AlloModules.ReportWriterUtils;
  if (!PC || !utils) throw new Error('Report Writer did not register');
});

// [assessment, subtest, scoreType, [[score, manual label], ...]]
const ORACLE = [
  // WISC-V Technical and Interpretive Manual (2014): descriptive classifications.
  ['WISC-V', 'Full Scale IQ', 'standard', [
    [130, 'Extremely High'], [129, 'Very High'], [120, 'Very High'], [119, 'High Average'], [110, 'High Average'],
    [109, 'Average'], [90, 'Average'], [89, 'Low Average'], [80, 'Low Average'], [79, 'Very Low'], [70, 'Very Low'],
    [69, 'Extremely Low'], [45, 'Extremely Low']]],
  // WJ IV Technical Manual: classification of standard scores (note 90-110 Average).
  ['WJ-IV COG', 'General Intellectual Ability', 'standard', [
    [131, 'Very Superior'], [130, 'Superior'], [121, 'Superior'], [120, 'High Average'], [111, 'High Average'],
    [110, 'Average'], [90, 'Average'], [89, 'Low Average'], [80, 'Low Average'], [79, 'Low'], [70, 'Low'], [69, 'Very Low']]],
  // KABC-II Manual: descriptive categories.
  ['KABC-II', 'Mental Processing Index', 'standard', [
    [131, 'Upper Extreme'], [130, 'Above Average'], [116, 'Above Average'], [115, 'Average'], [85, 'Average'],
    [84, 'Below Average'], [70, 'Below Average'], [69, 'Lower Extreme']]],
  // Vineland-3 Manual: adaptive levels for domain and ABC standard scores.
  ['Vineland-3', 'Adaptive Behavior Composite', 'standard', [
    [130, 'High'], [129, 'Moderately High'], [115, 'Moderately High'], [114, 'Adequate'], [86, 'Adequate'],
    [85, 'Moderately Low'], [71, 'Moderately Low'], [70, 'Low']]],
  // BASC-3 Manual: clinical scales (higher = more problems).
  ['BASC-3 (Teacher)', 'Attention Problems', 'T-score', [
    [70, 'Clinically Significant'], [69, 'At-Risk'], [60, 'At-Risk'], [59, 'Average'], [41, 'Average'],
    [40, 'Low'], [31, 'Low'], [30, 'Very Low']]],
  // BASC-3 Manual: adaptive scales run the other way (lower = more concern).
  ['BASC-3 (Parent)', 'Social Skills', 'T-score', [
    [70, 'Very High'], [69, 'High'], [60, 'High'], [59, 'Average'], [41, 'Average'],
    [40, 'At-Risk'], [31, 'At-Risk'], [30, 'Clinically Significant']]],
  ['BASC-3 (Teacher)', 'Study Skills', 'T-score', [[35, 'At-Risk'], [65, 'High']]],
  // Conners 4 Manual: T-score guidelines.
  ['Conners-4', 'Hyperactivity', 'T-score', [
    [70, 'Very Elevated'], [69, 'Elevated'], [65, 'Elevated'], [64, 'High Average'], [60, 'High Average'],
    [59, 'Average'], [40, 'Average'], [39, 'Low']]],
  // BRIEF-2 Professional Manual: interpretive ranges (higher = more difficulty).
  ['BRIEF-2', 'Global Executive Composite', 'T-score', [
    [70, 'Clinically Elevated'], [69, 'Potentially Clinically Elevated'], [65, 'Potentially Clinically Elevated'],
    [64, 'Mildly Elevated'], [60, 'Mildly Elevated'], [59, 'Within Normal Limits']]],
  // SRS-2 Manual: T-score ranges.
  ['SRS-2', 'Total Score', 'T-score', [
    [76, 'Severe Range'], [75, 'Moderate Range'], [66, 'Moderate Range'], [65, 'Mild Range'], [60, 'Mild Range'],
    [59, 'Within Normal Limits']]],
  // BOT-2 Manual: descriptive categories for standard scores (mean 50, SD 10).
  ['BOT-2', 'Total Motor Composite', 'standard', [
    [70, 'Well-Above Average'], [69, 'Above Average'], [60, 'Above Average'], [59, 'Average'], [41, 'Average'],
    [40, 'Below Average'], [31, 'Below Average'], [30, 'Well-Below Average']]],
];

// Presets that knowingly get the generic WISC-V-style label because their own
// manual's bands are not encoded yet. A NEW preset must be added to the module's
// RW_INSTRUMENT_SYSTEMS or to this list — it may not fall through silently.
const KNOWINGLY_GENERIC = ['WIAT-4', 'DAS-II', 'CELF-5', 'KTEA-3', 'Custom Assessment'];

const entry = (assessment, subtest, scoreType, score) => ({ assessment, subtest, scoreType, score });

describe('each instrument is labelled with its own manual\'s term', () => {
  for (const [assessment, subtest, scoreType, rows] of ORACLE) {
    it(`${assessment} ${subtest}`, () => {
      for (const [score, label] of rows) {
        expect(utils.classifyDisplayScore(score, scoreType, assessment, subtest).label, `${assessment} ${score}`).toBe(label);
      }
    });
  }
});

describe('the verifier accepts the manual\'s term and rejects the neighbouring band', () => {
  for (const [assessment, subtest, scoreType, rows] of ORACLE) {
    it(`${assessment} ${subtest}`, () => {
      rows.forEach(([score, label], i) => {
        expect(PC._checkClassification(entry(assessment, subtest, scoreType, score), label).status, `${assessment} ${score} '${label}'`).toBe('ok');
        const neighbours = [rows[i - 1], rows[i + 1]].filter(n => n && n[1] !== label);
        for (const [, other] of neighbours) {
          expect(PC._checkClassification(entry(assessment, subtest, scoreType, score), other).status, `${assessment} ${score} '${other}'`).toBe('mismatch');
        }
      });
    });
  }
});

describe('regressions from the 2026-09-22 review (end to end through verifyDraft)', () => {
  const kinds = (r) => r.discrepancies.map(d => d.kind);
  const fsiq75 = [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, score_type: 'standard' }];

  it('WISC-V FSIQ 75 called "Very Low" (the manual\'s term) is verified, not flagged', () => {
    const r = PC.verifyDraft(fsiq75, 'On the WISC-V, the Full Scale IQ was 75, in the Very Low range.');
    expect(r.discrepancies).toHaveLength(0);
    expect(r.terminology_notes).toHaveLength(0);
    expect(r.verified).toHaveLength(1);
  });

  it('the WAIS-IV-era "Borderline" for a WISC-V 75 is a non-blocking terminology note', () => {
    const r = PC.verifyDraft(fsiq75, 'On the WISC-V, the Full Scale IQ was 75, in the Borderline range.');
    expect(r.discrepancies).toHaveLength(0);
    expect(r.terminology_notes).toHaveLength(1);
    expect(r.terminology_notes[0].suggested).toBe('Very Low');
  });

  it('"Average" for a WISC-V 75 is a real error', () => {
    const r = PC.verifyDraft(fsiq75, 'On the WISC-V, the Full Scale IQ was 75, in the Average range.');
    expect(kinds(r)).toContain('classification_mismatch');
  });

  it('BASC-3 T 63 is At-Risk; calling it "High Average" is flagged, not waved through', () => {
    const src = [{ assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 63, scoreType: 'T-score' }];
    const ok = PC.verifyDraft(src, 'On the BASC-3 Teacher form, Attention Problems was 63, in the At-Risk range.');
    expect(ok.discrepancies).toHaveLength(0);
    const bad = PC.verifyDraft(src, 'On the BASC-3 Teacher form, Attention Problems was 63, in the High Average range.');
    expect(kinds(bad)).toContain('classification_mismatch');
  });

  it('a label stored with the score cannot vouch for itself', () => {
    // The input row carries the OLD generic label. The draft copies it. The
    // verifier must judge the score's range, not agree with the stored label.
    const src = [{ assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 63, scoreType: 'T-score', classification: 'High Average' }];
    const r = PC.verifyDraft(src, 'On the BASC-3 Teacher form, Attention Problems was 63, in the High Average range.');
    expect(kinds(r)).toContain('classification_mismatch');
  });

  it('"Very Low" means 69 and below on the WJ IV, so a WJ IV 75 called "Very Low" is flagged', () => {
    expect(PC._checkClassification(entry('WJ-IV ACH', 'Broad Reading', 'standard', 75), 'Very Low').status).toBe('mismatch');
    expect(PC._checkClassification(entry('WJ-IV ACH', 'Broad Reading', 'standard', 75), 'Low').status).toBe('ok');
  });

  it('an informal intensifier is not misread as the band name inside it', () => {
    const src = [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 62, score_type: 'standard' }];
    const r = PC.verifyDraft(src, 'On the WISC-V, the Full Scale IQ was 62, significantly below average for his age.');
    expect(r.discrepancies).toHaveLength(0);
  });
});

describe('GARS-3 is never given an ability label', () => {
  it('an Autism Index of 100 is not "Average" and is not treated as a low-score concern', () => {
    const c = utils.classifyDisplayScore(100, 'standard', 'GARS-3', 'Autism Index');
    expect(c.label).not.toBe('Average');
    expect(c.unclassified).toBe(true);
    expect(['red', 'orange']).not.toContain(utils.classifyDisplayScore(60, 'standard', 'GARS-3', 'Autism Index').color);
    expect(PC._checkClassification(entry('GARS-3', 'Autism Index', 'standard', 100), 'Average').status).toBe('unchecked');
  });
});

describe('low problem scores are not painted as concerns', () => {
  it('a very low BASC-3 Anxiety score is not red or orange', () => {
    const c = utils.classifyDisplayScore(30, 'T-score', 'BASC-3 (Parent)', 'Anxiety');
    expect(c.label).toBe('Very Low');
    expect(['red', 'orange']).not.toContain(c.color);
  });
});

describe('one table, every surface', () => {
  it('the badge and the verifier agree for every preset, subtest and score', () => {
    const presets = utils.assessmentPresets;
    for (const [assessment, preset] of Object.entries(presets)) {
      const subtests = preset.subtests.length ? preset.subtests : ['Custom'];
      for (const subtest of subtests) {
        for (let score = 10; score <= 160; score++) {
          expect(PC._classifyScore(score, preset.scoreType, assessment, subtest), `${assessment} ${subtest} ${score}`)
            .toBe(utils.classifyDisplayScore(score, preset.scoreType, assessment, subtest).label);
        }
      }
    }
  });

  it('every preset the clinician can pick is either mapped to its manual or knowingly generic', () => {
    for (const assessment of Object.keys(utils.assessmentPresets)) {
      const c = utils.classifyDisplayScore(100, utils.assessmentPresets[assessment].scoreType, assessment, utils.assessmentPresets[assessment].subtests[0]);
      const mapped = c.unclassified || c.generic === false;
      expect(mapped || KNOWINGLY_GENERIC.includes(assessment), `${assessment} falls back to generic labels without a decision`).toBe(true);
    }
  });
});

describe('saved reports get their labels recomputed on load', () => {
  it('a WISC-V 75 saved as "Borderline" reloads as "Very Low"', () => {
    const data = utils.validateReportPayload({
      schemaVersion: 1,
      scoreEntries: [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, scoreType: 'standard', classification: 'Borderline', classColor: 'orange' }],
      factChunks: [{ id: 'c1', type: 'score', source: 'BASC-3 (Teacher)', field: 'Attention Problems', value: 63, scoreType: 'T-score', classification: 'High Average' }],
    });
    expect(data.scoreEntries[0].classification).toBe('Very Low');
    expect(data.factChunks[0].classification).toBe('At-Risk');
  });
});
