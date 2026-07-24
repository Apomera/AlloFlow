// Fixture-corpus golden for window.AlloPsycheck — the deterministic verifier that
// catches AI-fabricated/mismatched score citations in a drafted psychoeducational
// report BEFORE a clinician trusts it.
//
// WHY (assessment-integrity): report_writer drafts clinical reports via AI; psycheck
// is the safety net that parses the draft, binds each score citation to an
// (assessment, subtest) row, and flags fabrications/mismatches. The verifier itself
// had ZERO coverage. We pin its hallucination-detection contract with a corpus of
// (sources, draft) pairs each carrying ONE planted defect — asserting each is caught
// with the correct discrepancy `kind` — PLUS a clean correct draft that must yield
// zero discrepancies (the false-positive guard that keeps clinicians trusting it).
//
// window.AlloPsycheck is a self-contained IIFE set near the top of the module
// (before any React use), so it is available even if the full module load throws.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let PC;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('report_writer_module.js'); } catch (e) { /* AlloPsycheck is set before any React-dependent code */ }
  PC = window.AlloPsycheck;
  if (!PC || typeof PC.verifyDraft !== 'function') throw new Error('AlloPsycheck not available');
});

// WISC-V standard scores: Verbal Comprehension 112 (High Average, ~79th %ile),
// Working Memory 85 (Low Average).
const SOURCES = [
  { assessment: 'WISC-V', subtest: 'Verbal Comprehension', score: 112, score_type: 'standard' },
  { assessment: 'WISC-V', subtest: 'Working Memory', score: 85, score_type: 'standard' },
];
const kinds = (r) => r.discrepancies.map((d) => d.kind);

describe('classifyScore — standard + T-score bands', () => {
  it('standard-score classification bands', () => {
    expect(PC._classifyScore(100, 'standard')).toBe('Average');
    expect(PC._classifyScore(112, 'standard')).toBe('High Average');
    expect(PC._classifyScore(125, 'standard')).toBe('Superior');
    expect(PC._classifyScore(135, 'standard')).toBe('Very Superior');
    expect(PC._classifyScore(85, 'standard')).toBe('Low Average');
    expect(PC._classifyScore(75, 'standard')).toBe('Below Average');
    expect(PC._classifyScore(65, 'standard')).toBe('Extremely Low');
  });
  it('T-score classification bands', () => {
    expect(PC._classifyScore(50, 't_score')).toBe('Average');
    expect(PC._classifyScore(66, 't_score')).toBe('At-Risk');
    expect(PC._classifyScore(72, 't_score')).toBe('Clinically Significant');
    expect(PC._classifyScore(66, 'T-score')).toBe('At-Risk');
    expect(PC._classifyScore(72, 't score')).toBe('Clinically Significant');
    expect(PC._classifyScore(72, 'TSCORE')).toBe('Clinically Significant');
  });
});

describe('verifyDraft — UI score-type compatibility', () => {
  it('treats the UI T-score spelling as a T-score for classifications and percentiles', () => {
    const sources = [{ assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 66, scoreType: 'T-score' }];
    const draft = 'On the BASC-3 Teacher form, Attention Problems was 66, in the At-Risk range (95th percentile).';
    const result = PC.verifyDraft(sources, draft);
    expect(kinds(result)).not.toContain('classification_mismatch');
    expect(kinds(result)).not.toContain('percentile_mismatch');
  });
});

describe('verifyDraft — input validation', () => {
  it('throws when sources is not an array', () => { expect(() => PC.verifyDraft('nope', 'text')).toThrow(); });
  it('throws when draftText is not a string', () => { expect(() => PC.verifyDraft(SOURCES, 42)).toThrow(); });
});

describe('verifyDraft — clean draft is the false-positive guard', () => {
  it('a correct draft yields ZERO discrepancies and no omissions', () => {
    const draft = "On the WISC-V, the student's Verbal Comprehension index was 112. Working Memory was 85.";
    const r = PC.verifyDraft(SOURCES, draft);
    expect(r.discrepancies).toHaveLength(0);
    expect(r.omitted_scores).toHaveLength(0);
    expect(r.verified.length).toBeGreaterThanOrEqual(2);
  });
});

describe('verifyDraft — each planted defect is caught with the right kind', () => {
  it('fabricated row (subtest not in input) → score_mismatch', () => {
    const draft = 'On the WISC-V, Processing Speed was 130. Verbal Comprehension was 112. Working Memory was 85.';
    const r = PC.verifyDraft(SOURCES, draft);
    expect(kinds(r)).toContain('score_mismatch');
  });
  it('wrong value (no other subtest has it) → score_mismatch citing the real value', () => {
    const draft = 'On the WISC-V, Verbal Comprehension was 120. Working Memory was 85.';
    const r = PC.verifyDraft(SOURCES, draft);
    const d = r.discrepancies.find((x) => x.kind === 'score_mismatch');
    expect(d).toBeTruthy();
    expect(d.data_shows).toMatch(/112/);
  });
  it('subtest attribution swap (value belongs to another subtest) → subtest_attribution [CRITICAL]', () => {
    // 85 is Working Memory's score, but the draft attributes it to Verbal Comprehension.
    const draft = 'On the WISC-V, Verbal Comprehension was 85. Working Memory was 85.';
    const r = PC.verifyDraft(SOURCES, draft);
    expect(kinds(r)).toContain('subtest_attribution');
  });
  it('classification mismatch → classification_mismatch', () => {
    const draft = "On the WISC-V, Verbal Comprehension was 112, in the Average range. Working Memory was 85.";
    const r = PC.verifyDraft(SOURCES, draft);
    expect(kinds(r)).toContain('classification_mismatch');
  });
  it('percentile mismatch → percentile_mismatch', () => {
    // 112 maps to ~79th percentile; the draft claims 95th.
    const draft = 'On the WISC-V, Verbal Comprehension was 112 (95th percentile). Working Memory was 85.';
    const r = PC.verifyDraft(SOURCES, draft);
    expect(kinds(r)).toContain('percentile_mismatch');
  });
  it('omission (input row never cited) → reported in omitted_scores, not discrepancies', () => {
    const draft = 'On the WISC-V, Verbal Comprehension was 112.';
    const r = PC.verifyDraft(SOURCES, draft);
    expect(r.omitted_scores.map((s) => s.subtest)).toContain('Working Memory');
  });
});

describe('verifyDraft — result envelope', () => {
  it('reports counts + tags the inline source', () => {
    const r = PC.verifyDraft(SOURCES, 'On the WISC-V, Verbal Comprehension was 112. Working Memory was 85.');
    expect(r.sources_provided).toBe(2);
    expect(r.citations_extracted).toBeGreaterThanOrEqual(2);
    expect(r._source).toBe('alloflow-inline');
    expect(Array.isArray(r.verified)).toBe(true);
    expect(Array.isArray(r.inconclusive)).toBe(true);
  });
});
