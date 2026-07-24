// Audit-scoring hardening (Batch 3, 2026-07-03). Five fixes in auditOutputAccessibility so the chunked
// path can't ship a wrong or undisclosed score:
//   M1 — coerce a non-numeric issue deduction at the producer (_alloWeightedDeductions) so a model
//        "deduction":"moderate" can't poison the sum into a NaN headline (the short path guarded it; the
//        chunked path did not), + a Number.isFinite guard on the merged score.
//   M2 — a chunk reply with no issues[] array (empty {} / {"passes":[]}) counts as a FAILED parse, not a
//        clean audited section (undercounting _failedChunks left _partialAudit false → undisclosed inflation).
//   M3 — drop a fully-redundant tail chunk (new content <= OVERLAP) so it isn't counted as a "requested
//        section" whose throttle falsely reads "N-1/N sections" or NULLs the score.
//   L1 — the score-divergence note states the ACTUAL point difference, not a hardcoded "more than 12 points".
//   L7 — the merged score is clamped to <=100 (a stray negative deduction would otherwise exceed 100).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('M1 — deduction coercion + merged-score finite guard', () => {
  it('the producer derives deductions from canonical severity weights, never model-provided deduction text', () => {
    expect(src).toContain("var severity = String((i && i.severity) || '').toLowerCase();");
    expect(src).toContain('var deduction = Number(SEVERITY_WEIGHTS[severity]) || 0;');
    expect(src).not.toContain('Number(i && i.deduction) || 0');
  });
  it('the chunked merged score is Number.isFinite-guarded (null when degraded)', () => {
    expect(src).toContain('Number.isFinite(adjustedDeductions) ? Math.max(0, Math.min(100, 100 - adjustedDeductions)) : null');
  });
  it('mirror: a non-numeric deduction contributes 0, never NaN', () => {
    const weighted = (issues) => (issues || []).reduce((s, i) => s + (Number(i && i.deduction) || 0) * 1, 0);
    expect(weighted([{ deduction: 'moderate' }, { deduction: 5 }])).toBe(5);
    expect(Number.isFinite(weighted([{ deduction: '5 pts' }, { deduction: 3 }]))).toBe(true);
  });
});

describe('M2 — a chunk reply without issues[] is a failure, not a clean audit', () => {
  it('_auditOneChunk routes replies lacking a valid issues[] schema to self-heal', () => {
    expect(src).toContain('const p = _requireStrictOutputAudit(parseAuditJson(r));');
    expect(src).toContain('_outputAuditIssueArrayIsValid(parsed.issues)');
    expect(src).toMatch(/const p = _requireStrictOutputAudit\(parseAuditJson\(r\)\);[\s\S]{0,500}_auditMemoPut\(_memoKey, p\);[\s\S]{0,100}catch \{ return null; \}/);
  });
  it('mirror: {}, {passes:[]}, null are rejected; {issues:[]} is accepted', () => {
    const ok = (p) => !(!p || !Array.isArray(p.issues));
    expect(ok({})).toBe(false);
    expect(ok({ passes: [] })).toBe(false);
    expect(ok(null)).toBe(false);
    expect(ok({ issues: [] })).toBe(true);
  });
});

describe('M3 — a fully-redundant tail chunk is dropped', () => {
  it('pops a final chunk whose length <= OVERLAP', () => {
    expect(src).toContain('if (chunks.length > 1 && chunks[chunks.length - 1].length <= OVERLAP) chunks.pop();');
  });
  it('mirror: a 1-char tail chunk is redundant; a 5000-char one is not', () => {
    const OVERLAP = 800;
    const redundant = (chs) => chs.length > 1 && chs[chs.length - 1].length <= OVERLAP;
    expect(redundant(['a'.repeat(16000), 'b'])).toBe(true);
    expect(redundant(['a'.repeat(16000), 'b'.repeat(5000)])).toBe(false);
    expect(redundant(['a'.repeat(200)])).toBe(false); // single chunk never dropped
  });
});

describe('L1 — divergence note is honest', () => {
  it('derives the actual difference and drops the hardcoded "more than 12 points"', () => {
    expect(src).toContain('const _sDiv = Math.abs');
    expect(src).not.toContain('they diverged by more than 12 points');
  });
  it('mirror: a 96-vs-95 self-report/recalc is a 1-point difference', () => {
    const div = (ai, disp) => Math.abs((ai || 0) - (disp || 0));
    expect(div(96, 95)).toBe(1);
  });
});

describe('L7 — merged score clamped to <=100', () => {
  it('mirror: a negative deduction is clamped to 100, not >100; NaN -> null', () => {
    const score = (ded) => Number.isFinite(ded) ? Math.max(0, Math.min(100, 100 - ded)) : null;
    expect(score(-20)).toBe(100);
    expect(score(30)).toBe(70);
    expect(score(NaN)).toBe(null);
  });
});
