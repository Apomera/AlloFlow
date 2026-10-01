// Report Writer score entry: refuse impossible scores, and handle subtest
// SCALED scores as scaled scores.
//
// WHY (2026-09-23):
//   - Any number was accepted, so a typo (8 for 88, 1000) went straight into
//     the report data and the AI prompt.
//   - Custom subtests inherited the instrument's composite metric. WISC-V
//     subtest scores are scaled scores (mean 10, SD 3), so "Block Design 7" was
//     classified Extremely Low at the 0.1st percentile instead of about the 16th.
//   - Scaled scores (1-19) sit below the range the verifier reads as scores, so
//     a scaled row could only ever be listed "not discussed", and a wrong one
//     in the draft passed.

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

const level = (score, type, a, s) => (U.scoreEntryProblem(score, type, a, s) || { level: 'ok' }).level;

describe('the entry guard', () => {
  it('refuses scores no instrument can produce, and says why', () => {
    expect(level(250, 'standard', 'WISC-V', 'Full Scale IQ')).toBe('error');
    expect(level(5, 'T-score', 'BASC-3 (Teacher)', 'Anxiety')).toBe('error');
    expect(level(95, 'standard', 'BOT-2', 'Total Motor Composite')).toBe('error');
    expect(level(25, 'scaled', 'WISC-V', 'Block Design')).toBe('error');
    expect(level('', 'standard', 'WISC-V', 'Full Scale IQ')).toBe('error');
  });
  it('points a single-digit standard score at the scaled-score option', () => {
    const p = U.scoreEntryProblem(7, 'standard', 'WISC-V', 'Full Scale IQ');
    expect(p.level).toBe('error');
    expect(p.message).toMatch(/scaled score/i);
  });
  it('accepts ordinary scores and only warns on rare-but-possible ones', () => {
    expect(level(88, 'standard', 'WISC-V', 'Full Scale IQ')).toBe('ok');
    expect(level(45, 'standard', 'WISC-V', 'Full Scale IQ')).toBe('ok');
    expect(level(35, 'standard', 'WJ-IV ACH', 'Broad Reading')).toBe('warn');
    expect(level(66, 'T-score', 'BASC-3 (Teacher)', 'Anxiety')).toBe('ok');
    expect(level(110, 'T-score', 'BASC-3 (Teacher)', 'Anxiety')).toBe('warn');
    expect(level(7, 'scaled', 'WISC-V', 'Block Design')).toBe('ok');
  });
});

describe('subtest scaled scores', () => {
  it('are not classified on the composite bands', () => {
    const c = U.classifyDisplayScore(7, 'scaled', 'WISC-V', 'Block Design');
    expect(c.label).not.toBe('Extremely Low');
    expect(['red', 'orange']).not.toContain(c.color);
  });
  it('get a scaled-score percentile (mean 10, SD 3)', () => {
    expect(U.displayPercentile(7, 'scaled', 'WISC-V', 'Block Design')).toBe(16);
    expect(U.displayPercentile(10, 'scaled', 'WISC-V', 'Block Design')).toBe(50);
    expect(U.displayPercentile(4, 'scaled', 'WISC-V', 'Block Design')).toBe(2);
  });
  it('a row with a missing or mislabelled score type still uses its instrument\'s own bands', () => {
    expect(U.classifyDisplayScore(63, undefined, 'BASC-3 (Teacher)', 'Attention Problems').label).toBe('At-Risk');
    expect(U.classifyDisplayScore(63, 'standard', 'BASC-3 (Teacher)', 'Attention Problems').label).toBe('At-Risk');
  });
});

describe('the verifier checks scaled-score rows', () => {
  const src = [
    { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 96, scoreType: 'standard' },
    { assessment: 'WISC-V', subtest: 'Block Design', score: 7, scoreType: 'scaled' },
  ];
  it('a correct scaled score is verified, not listed as "not discussed"', () => {
    const r = PC.verifyDraft(src, 'On the WISC-V, the Full Scale IQ was 96. Block Design was 7, a relative weakness.');
    expect(r.discrepancies).toEqual([]);
    expect(r.omitted_scores).toEqual([]);
  });
  it('a wrong scaled score is flagged', () => {
    const r = PC.verifyDraft(src, 'On the WISC-V, the Full Scale IQ was 96. Block Design was 9, a relative weakness.');
    expect(r.discrepancies.map(d => d.kind)).toContain('score_mismatch');
  });
  it('an ordinal or an age after the subtest name is not read as its score', () => {
    const r = PC.verifyDraft(src, 'On the WISC-V, the Full Scale IQ was 96. Block Design was first given at age 8 years; he earned 7.');
    expect(r.discrepancies).toEqual([]);
  });
});
