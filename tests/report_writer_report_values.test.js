// Report Writer: percentiles and confidence intervals come from the score
// report, and the draft may state only what the data holds.
//
// WHY (2026-09-23): the AI was given each score as "88 (Low Average)" and
// nothing else, yet psychological reports state percentiles and confidence
// intervals. It had to compute or invent them. T-score percentiles and every
// confidence interval come from the manuals' tables, so a generic calculation
// is wrong, and the verifier had no way to check an interval at all.
// Now: the clinician can record the report's percentile and interval per score;
// every prompt describes a score with exactly what is recorded; the prompt
// forbids stating a statistic that is not; and psycheck flags one that is
// contradicted (ci_mismatch) or has no source (unsourced_statistic).

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let PC;
let U;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  PC = window.AlloPsycheck;
  U = window.AlloModules.ReportWriterUtils;
});

const kinds = (r) => r.discrepancies.map(d => d.kind);
const fsiq = (extra = {}) => [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard', ...extra }];
const basc = (extra = {}) => [{ assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 66, scoreType: 'T-score', ...extra }];

describe('the score description every prompt receives', () => {
  it('names the metric and states only what is recorded', () => {
    expect(U.scoreFactText({ score: 88, scoreType: 'standard', classification: 'Low Average', percentile: 21 }))
      .toBe('88 (standard score; Low Average; 21st percentile)');
    expect(U.scoreFactText({ score: 88, scoreType: 'standard', classification: 'Low Average', percentile: 21, ciLow: 83, ciHigh: 94, ciLevel: 95 }))
      .toBe('88 (standard score; Low Average; 21st percentile; 95% CI 83-94)');
  });
  it('never supplies a T-score percentile the data does not hold', () => {
    expect(U.scoreFactText({ score: 66, scoreType: 'T-score', classification: 'At-Risk', percentile: null })).toBe('66 (T-score; At-Risk)');
  });
  it('marks a percentile copied from the score report', () => {
    expect(U.scoreFactText({ score: 66, scoreType: 'T-score', classification: 'At-Risk', percentile: 90, percentileSource: 'manual' }))
      .toBe('66 (T-score; At-Risk; 90th percentile (from the score report))');
  });
  it('describes a scaled score as a scaled score', () => {
    expect(U.scoreFactText({ value: 7, scoreType: 'scaled', classification: 'Unclassified', percentile: 16 })).toMatch(/^7 \(scaled score;/);
  });
});

describe('confidence intervals in the draft', () => {
  const recorded = { ciLow: 83, ciHigh: 94, ciLevel: 95 };

  it('an interval matching the recorded one is accepted', () => {
    const r = PC.verifyDraft(fsiq(recorded), 'On the WISC-V, the Full Scale IQ was 88 (95% CI 83-94).');
    expect(r.discrepancies).toEqual([]);
  });
  it('a different interval is a mismatch', () => {
    expect(kinds(PC.verifyDraft(fsiq(recorded), 'On the WISC-V, the Full Scale IQ was 88 (95% CI 80-94).'))).toContain('ci_mismatch');
    expect(kinds(PC.verifyDraft(fsiq(recorded), 'On the WISC-V, the Full Scale IQ was 88, with a 95% confidence interval of 83 to 96.'))).toContain('ci_mismatch');
  });
  it('the right bounds at the wrong confidence level are a mismatch', () => {
    expect(kinds(PC.verifyDraft(fsiq(recorded), 'On the WISC-V, the Full Scale IQ was 88 (90% CI 83-94).'))).toContain('ci_mismatch');
  });
  it('an interval with none recorded is unsourced', () => {
    expect(kinds(PC.verifyDraft(fsiq(), 'On the WISC-V, the Full Scale IQ was 88 (95% CI 83-94).'))).toContain('unsourced_statistic');
  });
  it('an interval that excludes the score is impossible', () => {
    expect(kinds(PC.verifyDraft(fsiq(), 'On the WISC-V, the Full Scale IQ was 88 (95% CI 60-70).'))).toContain('ci_mismatch');
  });
  it('"95%CI" is an interval level, not a 95th-percentile claim', () => {
    const r = PC.verifyDraft(fsiq(recorded), 'On the WISC-V, the Full Scale IQ was 88 (95%CI 83-94).');
    expect(kinds(r)).not.toContain('percentile_mismatch');
  });
});

describe('T-score percentiles in the draft', () => {
  it('one stated with none recorded is unsourced', () => {
    expect(kinds(PC.verifyDraft(basc(), 'On the BASC-3 Teacher form, Attention Problems was 66 (90th percentile).'))).toContain('unsourced_statistic');
  });
  it('one matching the recorded report percentile is accepted', () => {
    const r = PC.verifyDraft(basc({ percentile: 90, percentileSource: 'manual' }), 'On the BASC-3 Teacher form, Attention Problems was 66 (90th percentile).');
    expect(r.discrepancies).toEqual([]);
  });
  it('a standard-score percentile needs no recorded value: the normal curve is its source', () => {
    const r = PC.verifyDraft(fsiq(), 'On the WISC-V, the Full Scale IQ was 88 (21st percentile).');
    expect(r.discrepancies).toEqual([]);
  });
});

describe('saved report values are sanitised on load', () => {
  it('drops unreadable bounds, unknown levels and impossible manual percentiles', () => {
    const data = U.validateReportPayload({
      schemaVersion: 1,
      scoreEntries: [
        { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard', ciLow: 'abc', ciHigh: 94, ciLevel: 42 },
        { assessment: 'BASC-3 (Parent)', subtest: 'Anxiety', score: 66, scoreType: 'T-score', percentile: 150, percentileSource: 'manual' },
        { assessment: 'WISC-V', subtest: 'Verbal Comprehension', score: 102, scoreType: 'standard', ciLow: 95, ciHigh: 108, ciLevel: 90 },
      ],
    });
    expect(data.scoreEntries[0].ciLow).toBeNull();
    expect(data.scoreEntries[0].ciLevel).toBeNull();
    expect(data.scoreEntries[1].percentileSource).toBeUndefined();
    expect(data.scoreEntries[1].percentile).toBeNull();
    expect(data.scoreEntries[2]).toMatchObject({ ciLow: 95, ciHigh: 108, ciLevel: 90 });
  });
});
