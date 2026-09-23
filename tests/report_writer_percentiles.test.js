// Report Writer percentiles: shown the way score reports print them, and
// checked only against a source that can support them.
//
// WHY (2026-09-23):
//   - The percentile was Math.round of the normal curve, pasted in three
//     places, so an FSIQ of 55 showed "0%ile" and a very high score "100%ile";
//     no score report prints either.
//   - The text handed to the AI said "21th %ile", "22th %ile", which the AI
//     could copy into a report.
//   - The verifier checked T-score percentiles against the normal curve, but
//     BASC-3 / Conners 4 / BRIEF-2 / SRS-2 percentiles come from each manual's
//     norm tables, so a correct manual percentile was flagged as a mismatch.
// Expected values below are standard normal-table figures (z = 1 -> 84.1,
// z = -3 -> 0.13), not read from the module.

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

describe('displayed percentiles', () => {
  it('match the normal table for normalised standard scores', () => {
    const cases = [[100, 50], [115, 84], [85, 16], [130, 98], [70, 2], [60, 0.4], [55, 0.1], [145, 99.9], [140, 99.6]];
    for (const [score, pct] of cases) {
      expect(U.displayPercentile(score, 'standard', 'WISC-V', 'Full Scale IQ'), `SS ${score}`).toBe(pct);
    }
  });
  it('use the instrument\'s own metric (BOT-2 standard scores have mean 50, SD 10)', () => {
    expect(U.displayPercentile(50, 'standard', 'BOT-2', 'Total Motor Composite')).toBe(50);
    expect(U.displayPercentile(30, 'standard', 'BOT-2', 'Total Motor Composite')).toBe(2);
  });
  it('are never 0 or 100 anywhere on the scale', () => {
    for (let s = 40; s <= 160; s++) {
      const p = U.displayPercentile(s, 'standard', 'WISC-V', 'Full Scale IQ');
      expect(p, `SS ${s}`).toBeGreaterThan(0);
      expect(p, `SS ${s}`).toBeLessThan(100);
    }
  });
  it('are not invented for T-scores, whose percentiles come from norm tables', () => {
    expect(U.displayPercentile(66, 'T-score', 'BASC-3 (Teacher)', 'Attention Problems')).toBeNull();
    expect(U.displayPercentile(66, 'T-score', 'Conners-4', 'Hyperactivity')).toBeNull();
  });
});

describe('percentile wording', () => {
  it('uses correct English ordinals', () => {
    const cases = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 11: '11th', 12: '12th', 13: '13th', 21: '21st', 22: '22nd', 23: '23rd', 84: '84th', 99: '99th' };
    for (const [n, word] of Object.entries(cases)) expect(U.percentileText(Number(n))).toBe(`${word} percentile`);
    expect(U.percentileText(0.4)).toBe('0.4 percentile');
  });
});

describe('the verifier checks a percentile only against a source that supports it', () => {
  const basc = { assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 66, scoreType: 'T-score' };
  const kinds = (r) => r.discrepancies.map(d => d.kind);

  it('a manual percentile cited for a T-score is not contradicted by the normal curve', () => {
    // The normal curve puts T 66 at 94.5; a linear-T manual table can say 90.
    // The difference must exceed the 2-point tolerance or this proves nothing.
    const r = PC.verifyDraft([basc], 'On the BASC-3 Teacher form, Attention Problems was 66 (90th percentile).');
    expect(kinds(r)).not.toContain('percentile_mismatch');
  });
  it('a T-score percentile IS checked against one the clinician recorded', () => {
    const src = [{ ...basc, percentile: 93, percentileSource: 'manual' }];
    expect(kinds(PC.verifyDraft(src, 'On the BASC-3 Teacher form, Attention Problems was 66 (97th percentile).'))).toContain('percentile_mismatch');
    expect(kinds(PC.verifyDraft(src, 'On the BASC-3 Teacher form, Attention Problems was 66 (93rd percentile).'))).not.toContain('percentile_mismatch');
  });
  it('a standard-score percentile is still checked against the normal curve', () => {
    const src = [{ assessment: 'WISC-V', subtest: 'Verbal Comprehension', score: 112, score_type: 'standard' }];
    expect(kinds(PC.verifyDraft(src, 'On the WISC-V, Verbal Comprehension was 112 (95th percentile).'))).toContain('percentile_mismatch');
    expect(kinds(PC.verifyDraft(src, 'On the WISC-V, Verbal Comprehension was 112 (79th percentile).'))).not.toContain('percentile_mismatch');
  });
  it('the mismatch message is written in correct English', () => {
    const src = [{ assessment: 'WISC-V', subtest: 'Verbal Comprehension', score: 112, score_type: 'standard' }];
    const d = PC.verifyDraft(src, 'On the WISC-V, Verbal Comprehension was 112 (21st percentile).').discrepancies.find(x => x.kind === 'percentile_mismatch');
    expect(d.detail).toMatch(/21st percentile/);
    expect(d.detail).not.toMatch(/\d(?:1|2|3)th /);
  });
});

describe('saved reports', () => {
  it('recompute a computed percentile but keep one the clinician typed', () => {
    const data = U.validateReportPayload({
      schemaVersion: 1,
      scoreEntries: [
        { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 55, scoreType: 'standard', percentile: 0 },
        { assessment: 'BASC-3 (Parent)', subtest: 'Anxiety', score: 66, scoreType: 'T-score', percentile: 92, percentileSource: 'manual' },
      ],
    });
    expect(data.scoreEntries[0].percentile).toBe(0.1);
    expect(data.scoreEntries[1].percentile).toBe(92);
  });
});
