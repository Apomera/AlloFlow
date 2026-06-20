// Scoring / audit honesty batch (2026-06-20) — closing UI-vs-disclosed-methodology contradictions
// surfaced by the pipeline-enhancement workflow. The engine scores with passFactor=1 (unverified
// passes do NOT buy back deductions), so the UI must not advertise a buyback; count-weighting must
// fire in the CHUNKED path (every multi-page report); a correlated chunk-failure storm must NOT yield
// an artificially-high score; and presence-only structural "passes" must not claim verification.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the chunked-merge occurrence-count derivation (kept in sync via anti-drift) ──
const issueCount = (iss, pagesArr) => Math.max(iss.count || 1, pagesArr.length);
// ── Mirror of the partial-audit floor ──
const coverageTooLow = (totalChunks, failedChunks) => totalChunks > 0 && (failedChunks / totalChunks) > 0.25;

describe('count-weighting fires from the page multiset (chunked path)', () => {
  it('an issue on 3 pages with no AI count → count 3 (not 1)', () => {
    expect(issueCount({}, [5, 12, 20])).toBe(3);
  });
  it('keeps the larger of AI-count and page-count', () => {
    expect(issueCount({ count: 2 }, [5])).toBe(2);
    expect(issueCount({ count: 1 }, [3, 8, 9, 14])).toBe(4);
  });
  it('a single-occurrence issue with no pages → 1', () => {
    expect(issueCount({}, [])).toBe(1);
  });
  it('a 20-page missing-alt now outweighs a 1-page one (the whole point)', () => {
    const twenty = issueCount({}, Array.from({ length: 20 }, (_, i) => i + 1));
    const one = issueCount({}, [4]);
    expect(twenty).toBe(20);
    expect(one).toBe(1);
    expect(twenty).toBeGreaterThan(one);
  });
});

describe('partial-audit floor — null the score past 25% chunk failure', () => {
  it('30% failure → degraded (score nulled)', () => {
    expect(coverageTooLow(10, 3)).toBe(true);
  });
  it('20% failure → still scored', () => {
    expect(coverageTooLow(10, 2)).toBe(false);
  });
  it('exactly 25% is NOT degraded (strict greater-than)', () => {
    expect(coverageTooLow(4, 1)).toBe(false);
  });
  it('50% failure → degraded', () => {
    expect(coverageTooLow(4, 2)).toBe(true);
  });
  it('no failures → scored', () => {
    expect(coverageTooLow(8, 0)).toBe(false);
  });
});

describe('anti-drift: the buyback UI is gone', () => {
  it('no "+N points recovered" badge', () => {
    expect(viewSrc).not.toMatch(/points recovered/);
  });
  it('no "passes recovered +N pts" line', () => {
    expect(viewSrc).not.toMatch(/passes recovered/);
  });
  it('the passBenefit / buyback computation is removed', () => {
    expect(viewSrc).not.toMatch(/const passBenefit/);
    expect(viewSrc).not.toMatch(/const saved = rawDed - Math\.round/);
  });
  it('the "Verified Accessible" overclaim label is replaced', () => {
    expect(viewSrc).not.toMatch(/Verified Accessible/);
    expect(viewSrc).toMatch(/not independently verified/);
  });
  it('the "How AI scores" panel no longer claims passes reduce the score', () => {
    expect(viewSrc).not.toMatch(/Passes reduce total deductions proportionally/);
  });
});

describe('anti-drift: doc_pipeline ships the audit-honesty fixes', () => {
  it('the chunked merge derives count from the page multiset', () => {
    expect(pipeSrc).toMatch(/count: Math\.max\(iss\.count \|\| 1, pagesArr\.length\)/);
  });
  it('the partial-audit floor nulls the score past the threshold', () => {
    expect(pipeSrc).toMatch(/_coverageTooLow = chunks\.length > 0 && \(_failedChunks \/ chunks\.length\) > 0\.25/);
    expect(pipeSrc).toMatch(/score: _coverageTooLow \? null : mergedScore/);
  });
  it('the engine still applies NO pass buyback (passFactor=1 unchanged)', () => {
    expect(pipeSrc).toMatch(/const passFactor = 1;/);
  });
  it('presence-only structural passes no longer overclaim', () => {
    expect(pipeSrc).toMatch(/HTML lang attribute is present/);
    expect(pipeSrc).not.toMatch(/HTML lang attribute is correctly set/);
    expect(pipeSrc).toMatch(/non-empty alt attribute \(description quality not verified\)/);
    expect(pipeSrc).not.toMatch(/'Images have descriptive alt text'/);
  });
});
