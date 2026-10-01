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
// 2026-09-23: WIAT-4, KTEA-3, DAS-II, CELF-5 and GARS-3 got their own bands;
// Conners 4 60-64 is "Slightly Elevated" (manual Table 4.1), not the Conners 3
// "High Average"; SRS-2 uses its report legend (Severe/Moderate/Mild/Normal);
// BRIEF-2 below 60 is "Average" (PAR's narratives), not an invented label.
// WIAT-4 and KTEA-3 print 10- or 15-point descriptors, set in Q-global.
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

// [assessment, subtest, scoreType, [[score, manual label], ...], descriptor scale?]
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
  // Conners 4 Manual Table 4.1 "Understanding T-scores and Percentiles"; an MHS
  // sample report prints T 63 as "Slightly Elevated".
  ['Conners-4', 'Hyperactivity', 'T-score', [
    [70, 'Very Elevated'], [69, 'Elevated'], [65, 'Elevated'], [64, 'Slightly Elevated'], [60, 'Slightly Elevated'],
    [59, 'Average'], [40, 'Average'], [39, 'Low']]],
  // BRIEF-2 PAR interpretive reports: 60-64 mildly, 65-69 potentially clinically,
  // 70+ clinically elevated. No named band below 60; narratives say "average range".
  ['BRIEF-2', 'Global Executive Composite', 'T-score', [
    [70, 'Clinically Elevated'], [69, 'Potentially Clinically Elevated'], [65, 'Potentially Clinically Elevated'],
    [64, 'Mildly Elevated'], [60, 'Mildly Elevated'], [59, 'Average']]],
  // SRS-2 WPS report legend: >=76T Severe, 66T-75T Moderate, 60T-65T Mild, <=59T Normal.
  ['SRS-2', 'Total Score', 'T-score', [
    [76, 'Severe'], [75, 'Moderate'], [66, 'Moderate'], [65, 'Mild'], [60, 'Mild'], [59, 'Normal']]],
  // WIAT-4 sample score reports (10-point, what Pearson's samples print).
  ['WIAT-4', 'Reading Composite', 'standard', [
    [130, 'Extremely High'], [129, 'Very High'], [120, 'Very High'], [119, 'High Average'], [110, 'High Average'],
    [109, 'Average'], [90, 'Average'], [89, 'Low Average'], [80, 'Low Average'], [79, 'Very Low'], [70, 'Very Low'],
    [69, 'Extremely Low']]],
  // WIAT-4 15-point: the "Suggested Qualitative Descriptors" profile (Pearson
  // 2020); endpoints per KTEA-3's published 15-point table.
  ['WIAT-4', 'Reading Composite', 'standard', [
    [146, 'Very High'], [145, 'High'], [131, 'High'], [130, 'Above Average'], [116, 'Above Average'],
    [115, 'Average'], [85, 'Average'], [84, 'Below Average'], [70, 'Below Average'], [69, 'Low'], [55, 'Low'],
    [54, 'Very Low']], '15'],
  // KTEA-3 Q-global help, 15-point (what Pearson's KTEA-3 samples print).
  ['KTEA-3', 'Reading Composite', 'standard', [
    [146, 'Very High'], [145, 'High'], [131, 'High'], [130, 'Above Average'], [116, 'Above Average'],
    [115, 'Average'], [85, 'Average'], [84, 'Below Average'], [70, 'Below Average'], [69, 'Low'], [55, 'Low'],
    [54, 'Very Low']]],
  // KTEA-3 Q-global help, 10-point. Same cut points as the WIAT-4, other words.
  ['KTEA-3', 'Reading Composite', 'standard', [
    [130, 'Very High'], [129, 'High'], [120, 'High'], [119, 'Above Average'], [110, 'Above Average'],
    [109, 'Average'], [90, 'Average'], [89, 'Below Average'], [80, 'Below Average'], [79, 'Low'], [70, 'Low'],
    [69, 'Very Low']], '10'],
  // DAS-II: Dumont, Willis & Elliott (2009) Rapid Reference 5.1; Pearson samples agree.
  ['DAS-II', 'General Conceptual Ability', 'standard', [
    [130, 'Very High'], [129, 'High'], [120, 'High'], [119, 'Above Average'], [110, 'Above Average'],
    [109, 'Average'], [90, 'Average'], [89, 'Below Average'], [80, 'Below Average'], [79, 'Low'], [70, 'Low'],
    [69, 'Very Low']]],
  // CELF-5 Examiner's Manual Table 4.5, reproduced in Pearson's "Determining the
  // Severity of a Language Disorder" (2013).
  ['CELF-5', 'Core Language', 'standard', [
    [115, 'Above Average'], [114, 'Average'], [86, 'Average'], [85, 'Below Average'], [78, 'Below Average'],
    [77, 'Low'], [71, 'Low'], [70, 'Very Low']]],
  // GARS-3 Autism Index (Gilliam 2014, as cited by Samadi et al. 2022 and a
  // Prader-Willi screening study): a probability of autism, so HIGH is concern.
  ['GARS-3', 'Autism Index', 'standard', [
    [120, 'Very Likely'], [71, 'Very Likely'], [70, 'Probable'], [55, 'Probable'], [54, 'Unlikely']]],
  // BOT-2 Manual: descriptive categories for standard scores (mean 50, SD 10).
  ['BOT-2', 'Total Motor Composite', 'standard', [
    [70, 'Well-Above Average'], [69, 'Above Average'], [60, 'Above Average'], [59, 'Average'], [41, 'Average'],
    [40, 'Below Average'], [31, 'Below Average'], [30, 'Well-Below Average']]],
];

// Presets that knowingly get the generic WISC-V-style label because their own
// manual's bands are not encoded yet. A NEW preset must be added to the module's
// RW_INSTRUMENT_SYSTEMS or to this list — it may not fall through silently.
const KNOWINGLY_GENERIC = ['Custom Assessment'];

const entry = (assessment, subtest, scoreType, score, descriptorScale) => ({ assessment, subtest, scoreType, score, descriptorScale });
const title = (assessment, subtest, scheme) => `${assessment} ${subtest}${scheme ? ` (${scheme}-point)` : ''}`;

describe('each instrument is labelled with its own manual\'s term', () => {
  for (const [assessment, subtest, scoreType, rows, scheme] of ORACLE) {
    it(title(assessment, subtest, scheme), () => {
      for (const [score, label] of rows) {
        expect(utils.classifyDisplayScore(score, scoreType, assessment, subtest, scheme).label, `${assessment} ${score}`).toBe(label);
      }
    });
  }
});

describe('the verifier accepts the manual\'s term and rejects the neighbouring band', () => {
  for (const [assessment, subtest, scoreType, rows, scheme] of ORACLE) {
    it(title(assessment, subtest, scheme), () => {
      rows.forEach(([score, label], i) => {
        expect(PC._checkClassification(entry(assessment, subtest, scoreType, score, scheme), label).status, `${assessment} ${score} '${label}'`).toBe('ok');
        const neighbours = [rows[i - 1], rows[i + 1]].filter(n => n && n[1] !== label);
        for (const [, other] of neighbours) {
          expect(PC._checkClassification(entry(assessment, subtest, scoreType, score, scheme), other).status, `${assessment} ${score} '${other}'`).toBe('mismatch');
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

describe('GARS-3 is a probability of autism, never an ability label', () => {
  const gars = (score) => utils.classifyDisplayScore(score, 'standard', 'GARS-3', 'Autism Index');
  it('HIGH is the concern: an index of 100 is Very Likely, and a low index is not a deficit', () => {
    expect(gars(100).label).toBe('Very Likely');
    expect(gars(100).direction).toBe('high');
    expect(['red', 'orange']).toContain(gars(100).color);
    expect(['red', 'orange']).not.toContain(gars(50).color);
    expect(utils.classifyDisplayScore(100, 'standard', 'WISC-V', 'Full Scale IQ').direction).toBe('low');
  });
  it('calling an index of 100 "Average" hides the concern and is flagged', () => {
    expect(PC._checkClassification(entry('GARS-3', 'Autism Index', 'standard', 100), 'Average').status).toBe('mismatch');
  });
  const src = [{ assessment: 'GARS-3', subtest: 'Autism Index', score: 62, score_type: 'standard' }];
  it('a GARS-3 sentence is checked in the manual\'s words', () => {
    expect(PC.verifyDraft(src, 'On the GARS-3, the Autism Index was 62, in the Probable range.').discrepancies).toHaveLength(0);
    const bad = PC.verifyDraft(src, 'On the GARS-3, the Autism Index was 62, meaning autism is very likely.');
    expect(bad.discrepancies.map(d => d.kind)).toContain('classification_mismatch');
  });
  it('"unlikely" in a sentence about another test is an ordinary word and does not hide that test\'s label', () => {
    const wisc = [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, score_type: 'standard' }];
    const r = PC.verifyDraft(wisc, 'On the WISC-V, the Full Scale IQ was 88, making a disability unlikely, in the Average range.');
    expect(r.discrepancies.map(d => d.kind)).toContain('classification_mismatch');
  });
});

describe('WIAT-4 and KTEA-3 descriptor scales (set in Q-global)', () => {
  const ktea = (score, scheme) => utils.classifyDisplayScore(score, 'standard', 'KTEA-3', 'Reading Composite', scheme).label;
  it('each instrument defaults to what its publisher\'s sample reports print', () => {
    expect(utils.descriptorScales['KTEA-3'].default).toBe('15');
    expect(utils.descriptorScales['WIAT-4'].default).toBe('10');
    expect(ktea(75)).toBe('Below Average');
    expect(utils.classifyDisplayScore(85, 'standard', 'WIAT-4', 'Reading Composite').label).toBe('Low Average');
  });
  it('an unknown scale falls back to the default instead of dropping the instrument\'s bands', () => {
    expect(ktea(75, '99')).toBe('Below Average');
    expect(utils.classifyDisplayScore(75, 'standard', 'KTEA-3', 'Reading Composite', '99').generic).toBe(false);
  });
  it('the verifier checks the draft against the scale the score report used', () => {
    const src = (scale) => [{ assessment: 'KTEA-3', subtest: 'Reading Composite', score: 75, score_type: 'standard', descriptorScale: scale }];
    const text = 'On the KTEA-3, the Reading Composite was 75, in the Low range.';
    expect(PC.verifyDraft(src('10'), text).discrepancies).toHaveLength(0);
    const r = PC.verifyDraft(src(undefined), text);
    expect(r.discrepancies.map(d => d.kind)).toContain('classification_mismatch');
    expect(r.discrepancies[0].detail).toContain('KTEA-3 10-point scale');
    expect(r.discrepancies[0].detail).toContain('Descriptors in Step 4');
  });
  it('a mismatch on no other scale gets no such hint', () => {
    const r = PC.verifyDraft([{ assessment: 'KTEA-3', subtest: 'Reading Composite', score: 75, score_type: 'standard' }],
      'On the KTEA-3, the Reading Composite was 75, in the Average range.');
    expect(r.discrepancies[0].detail).not.toContain('Descriptors in Step 4');
  });
  it('a saved report keeps a valid scale, drops an invalid one, and is relabelled with it', () => {
    const data = utils.validateReportPayload({
      schemaVersion: 1,
      scoreEntries: [
        { assessment: 'KTEA-3', subtest: 'Reading Composite', score: 75, scoreType: 'standard', descriptorScale: '10', classification: 'Below Average' },
        { assessment: 'KTEA-3', subtest: 'Math Composite', score: 75, scoreType: 'standard', descriptorScale: 'x' },
        { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, scoreType: 'standard', descriptorScale: '10' },
      ],
      factChunks: [{ id: 'c1', type: 'score', source: 'KTEA-3', field: 'Reading Composite', value: 75, scoreType: 'standard', descriptorScale: '10' }],
    });
    expect(data.scoreEntries.map(r => [r.descriptorScale, r.classification])).toEqual([['10', 'Low'], [undefined, 'Below Average'], [undefined, 'Very Low']]);
    expect(data.factChunks[0].classification).toBe('Low');
  });
  it('the score table names the descriptor scale only where there is a choice', () => {
    const text = utils.scoreTableText([
      { assessment: 'KTEA-3', subtest: 'Reading Composite', score: 75, scoreType: 'standard', descriptorScale: '10', classification: 'Low' },
      { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, scoreType: 'standard', classification: 'Very Low' },
    ]);
    expect(text).toContain('KTEA-3 (classifications: KTEA-3 10-point scale)');
    expect(text).toMatch(/^WISC-V$/m);
  });
});

describe('labels from another scale', () => {
  it('a specific band name from another metric is flagged, a plain comparison is not', () => {
    // "High Average" is a standard-score band; no T-score manual uses it.
    expect(PC._checkClassification(entry('BASC-3 (Teacher)', 'Attention Problems', 'T-score', 63), 'High Average').status).toBe('mismatch');
    expect(PC._checkClassification(entry('BASC-3 (Teacher)', 'Hyperactivity', 'T-score', 38), 'Below Average').status).toBe('unchecked');
    expect(PC._checkClassification(entry('Vineland-3', 'Communication', 'standard', 100), 'Normal').status).toBe('unchecked');
    // GARS-3's words belong to GARS-3 alone, even on the same metric.
    expect(PC._checkClassification(entry('WISC-V', 'Full Scale IQ', 'standard', 60), 'Unlikely').status).toBe('unchecked');
  });
  it('"within normal limits" is read as the SRS-2 legend\'s "Normal"', () => {
    const src = [{ assessment: 'SRS-2', subtest: 'Total Score', score: 55, score_type: 'T-score' }];
    expect(PC.verifyDraft(src, 'On the SRS-2, the Total Score was 55, within normal limits.').discrepancies).toHaveLength(0);
    const high = [{ assessment: 'SRS-2', subtest: 'Total Score', score: 70, score_type: 'T-score' }];
    expect(PC.verifyDraft(high, 'On the SRS-2, the Total Score was 70, within normal limits.').discrepancies.map(d => d.kind)).toContain('classification_mismatch');
  });
  it('"marginal" is CELF-5\'s Below Average (78-85)', () => {
    const src = [{ assessment: 'CELF-5', subtest: 'Core Language', score: 80, score_type: 'standard' }];
    expect(PC.verifyDraft(src, 'On the CELF-5, the Core Language score was 80, in the marginal range.').discrepancies).toHaveLength(0);
    const low = [{ assessment: 'CELF-5', subtest: 'Core Language', score: 72, score_type: 'standard' }];
    expect(PC.verifyDraft(low, 'On the CELF-5, the Core Language score was 72, in the marginal range.').discrepancies.map(d => d.kind)).toContain('classification_mismatch');
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

describe('diagnostic references in the AI prompt are raised only by scores that bear on them', () => {
  const ctx = (rows) => utils.buildReferenceContext(rows.map(([assessment, subtest, score, scoreType]) => ({ assessment, subtest, score, scoreType })), 10);
  const ID = 'DSM-5 Reference (ID)';
  const ADHD = 'DSM-5 Reference (ADHD)';

  it('BOT-2 scores (mean 50) never raise intellectual disability', () => {
    expect(ctx([['BOT-2', 'Total Motor Composite', 45, 'standard'], ['BOT-2', 'Fine Manual Control', 38, 'standard']])).not.toContain(ID);
  });
  it('low achievement alone does not raise intellectual disability', () => {
    expect(ctx([['WIAT-4', 'Reading Composite', 68, 'standard']])).not.toContain(ID);
  });
  it('a low global cognitive composite does, including the measurement-error margin', () => {
    expect(ctx([['WISC-V', 'Full Scale IQ', 73, 'standard']])).toContain(ID);
    expect(ctx([['WISC-V', 'Full Scale IQ', 76, 'standard']])).not.toContain(ID);
  });
  it('an elevated anxiety or social-responsiveness score does not raise ADHD', () => {
    expect(ctx([['BASC-3 (Parent)', 'Anxiety', 75, 'T-score'], ['SRS-2', 'Total Score', 72, 'T-score']])).not.toContain(ADHD);
  });
  it('a high BASC-3 adaptive score (a strength) does not raise ADHD', () => {
    expect(ctx([['BASC-3 (Teacher)', 'Adaptive Skills', 68, 'T-score']])).not.toContain(ADHD);
  });
  it('an elevated attention scale does', () => {
    expect(ctx([['BASC-3 (Teacher)', 'Attention Problems', 70, 'T-score']])).toContain(ADHD);
    expect(ctx([['Conners-4', 'Inattention/Executive Dysfunction', 66, 'T-score']])).toContain(ADHD);
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
