// #13 (2026-06-15): the batch HTML report (handed to the institutional sponsor) rendered every
//     un-processed (pending/processing) file as a ❌ failure with a blank error. Make it three-way.
// #4: the chunked audit summary lacked the high-score harsh-wording softening the single-doc
//     branch has, so the summary could contradict a high score on long documents.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('#13 batch report status — three-way (done / failed / not-processed)', () => {
  // mirror of the shipped cell logic
  const statusCell = (status, error) =>
    status === 'done' ? 'OK' : status === 'failed' ? 'FAIL ' + (error || '') : 'NOT-PROCESSED';
  it('done → success, failed → failure-with-error, pending/processing → not-processed', () => {
    expect(statusCell('done')).toBe('OK');
    expect(statusCell('failed', 'timeout')).toBe('FAIL timeout');
    expect(statusCell('pending')).toBe('NOT-PROCESSED');     // pre-fix: rendered ❌ with blank error
    expect(statusCell('processing')).toBe('NOT-PROCESSED');
  });
  it('anti-drift: the shipped cell distinguishes failed from not-processed', () => {
    expect(src).toContain("f.status==='failed'?");
    expect(src).toContain('Not processed');
  });
});

describe('#4 chunked audit summary — high-score tone softening (parity with single-doc)', () => {
  const HARSH = /fails?\s+significantly|severely\s+inaccessible|major\s+concern|critically\s+lacking|fundamentally\s+broken|unusable|fails\s+to\s+meet/i;
  const soften = (score, summary, passCount, issueCount) => {
    if (score >= 80 && summary && HARSH.test(summary)) {
      return `The document scores ${score}/100 with ${passCount} accessibility checks passing and ${issueCount} remaining issue${issueCount !== 1 ? 's' : ''} to address.`;
    }
    return summary;
  };
  it('softens harsh wording on a high merged score', () => {
    const out = soften(88, 'This document is severely inaccessible.', 12, 2);
    expect(out).not.toMatch(HARSH);
    expect(out).toContain('88/100');
    expect(out).toContain('2 remaining issues');
  });
  it('leaves a neutral summary untouched, and never softens a low score', () => {
    expect(soften(88, 'A few items need attention.', 10, 3)).toBe('A few items need attention.');
    expect(soften(40, 'fails to meet several criteria', 2, 9)).toBe('fails to meet several criteria');
  });
  it('anti-drift: the chunked branch applies the softening on mergedScore>=80', () => {
    expect(src).toContain('if (mergedScore >= 80 && summary) {');
    expect(src).toContain('`The document scores ${mergedScore}/100 with ${passCount} accessibility checks passing');
  });
});
