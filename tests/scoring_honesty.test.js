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

// ── Mirror of the chunked-merge occurrence-count derivation (realPages ONLY; chunk-index fallbacks are
//    display-only and never counted, so a boundary-straddling violation counts once) (2026-06-21) ──
const issueCount = (iss, realPageCount) => Math.max(iss.count || 1, realPageCount || 1);
// ── Mirror of the partial-audit floor ──
const coverageTooLow = (totalChunks, failedChunks) => totalChunks > 0 && (failedChunks / totalChunks) > 0.25;

describe('count-weighting fires from DISTINCT REAL pages (chunked path)', () => {
  it('an issue on 3 distinct real pages with no AI count → count 3 (not 1)', () => {
    expect(issueCount({}, 3)).toBe(3);
  });
  it('keeps the larger of AI-count and real-page-count', () => {
    expect(issueCount({ count: 2 }, 1)).toBe(2);
    expect(issueCount({ count: 1 }, 4)).toBe(4);
  });
  it('a single-occurrence issue with no real pages → 1', () => {
    expect(issueCount({}, 0)).toBe(1);
  });
  it('REGRESSION (audit-floor-countweight-1): a boundary straddler seen in 2 adjacent chunks but with NO real page anchor counts ONCE, not 2', () => {
    // Before the fix this was Math.max(count||1, pagesArr.length) where pagesArr = {chunkN, chunkN+1} → 2.
    expect(issueCount({}, 0)).toBe(1);
  });
  it('a 20-page missing-alt now outweighs a 1-page one (the whole point)', () => {
    expect(issueCount({}, 20)).toBe(20);
    expect(issueCount({}, 1)).toBe(1);
    expect(issueCount({}, 20)).toBeGreaterThan(issueCount({}, 1));
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
  it('the chunked merge derives count from DISTINCT REAL pages only (not chunk-index fallbacks that double-count boundary straddlers)', () => {
    // audit-floor-countweight-1 (2026-06-21): count from realPages.size, never pagesArr.length.
    expect(pipeSrc).toMatch(/count: Math\.max\(iss\.count \|\| 1, realPageCount \|\| 1\)/);
    expect(pipeSrc).toMatch(/const realPage = _extractPageNum\(issue\.location\)/);
    expect(pipeSrc).not.toMatch(/count: Math\.max\(iss\.count \|\| 1, pagesArr\.length\)/);
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
