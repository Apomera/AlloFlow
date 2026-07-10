// ChatGPT-review Phase 2 (2026-07-10) — evidence, durability, telemetry. Goldens + pins.
//
// Finding 5  — sliced audits: failed ranges collapsed into anonymous nulls; ONE surviving slice
//   scored the whole document and the summary claimed all N slices ran. Ranges now keep identity,
//   failed ranges get a calm-gated retry, coverage is explicit, and the before-score is WITHHELD
//   (null) when any range is missing.
// Finding 11 — storage: saveMultiSessionRange swallowed rejections (the caller's user-facing
//   warning could never fire) and checkpoint writes/deletes could complete out of order,
//   resurrecting finished checkpoints. Rethrow + a per-session write chain.
// Finding 14 — WCAG SC report: axe ships compact tags (wcag111) but the parser wanted dotted text —
//   the report rendered EMPTY forever. Pipeline normalizes to wcagCriteria arrays; the view prefers
//   them and converts compact tags as fallback; incomplete findings finally carry WCAG identity.
// Finding 7  — Equal Access governs the headline but had no voice in the loop: the stop condition
//   now requires EA-clean when EA ran, and confirmed EA failures feed the fix instructions.
// Finding 15 — a NULL axe audit counted as "no violations" in run-history success telemetry.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const ci = readFileSync(resolve(process.cwd(), '.github/workflows/verify.yml'), 'utf8');

describe('finding 5 — sliced-audit coverage honesty', () => {
  it('ranges keep identity, failed ranges get one calm-gated sequential retry', () => {
    expect(dp).toContain("const rangeResults = ranges.map(([s, e]) => ({ startPage: s + 1, endPage: e, status: 'pending', audit: null }));");
    expect(dp).toContain("if (rangeResults.some((rr) => rr.status === 'failed') && rangeResults.some((rr) => rr.status === 'ok')) {");
    expect(dp).toContain('retry recovered pages');
  });
  it('partial coverage is explicit and the summary names the missing pages', () => {
    expect(dp).toContain('_sliceCoverage: { successfulSlices: sliceAudits.length, requestedSlices: ranges.length, totalPages, missingPageRanges: _missingRanges }');
    expect(dp).toContain('_partialAudit: _missingRanges.length > 0,');
    expect(dp).toContain('were NOT reviewed (the AI service failed on those slices even after a retry)');
  });
  it('the before-score is WITHHELD on incomplete coverage — min() cannot resurrect it, gains cannot fabricate', () => {
    expect(dp).toContain("const _sliceIncomplete = !!(parsedAudits.length === 1 && parsedAudits[0]._slicedAudit && parsedAudits[0]._partialAudit);");
    expect(dp).toContain('score: _sliceIncomplete ? null : _consolidatedContentScore,');
    expect(dp).toContain("_scoreUnavailableReason: _sliceIncomplete ? 'incomplete-slice-coverage' : undefined,");
    expect(dp).toContain('const governingInitial = (aiOnlyScore === null)');
    expect(dp).toContain('const scoreGain = (finalAfterScore !== null && Number.isFinite(beforeScore)) ? finalAfterScore - beforeScore : null;');
  });
});

describe('finding 11 — storage durability', () => {
  it('multi-session save failures REACH the caller (the user-facing warning can finally fire)', () => {
    const at = dp.indexOf("warnLog('[MultiSession] Save failed:', e && e.message);");
    expect(at).toBeGreaterThan(-1);
    expect(dp.slice(at, at + 700)).toContain('throw e;');
  });
  it('all four writers on the shared store are serialized per session id', () => {
    expect(dp).toContain('var _chunkWriteChains = new Map();');
    expect(dp).toContain('var _chainChunkWrite = function (sessionId, fn) {');
    const chained = dp.match(/_chainChunkWrite\(sessionId, function \(\) \{/g) || [];
    expect(chained.length).toBe(4); // saveChunkProgress, clearChunkProgress, saveMultiSessionRange, clearMultiSession
  });
  it('BEHAVIORAL: a slow earlier write cannot land after a later delete (ordering holds)', async () => {
    const start = dp.indexOf('var _chunkWriteChains = new Map();');
    const end = dp.indexOf('var saveChunkProgress', start);
    const { _chainChunkWrite } = new Function(dp.slice(start, end) + '\nreturn { _chainChunkWrite };')();
    const order = [];
    const slow = _chainChunkWrite('s1', () => new Promise((r) => setTimeout(() => { order.push('write'); r(); }, 40)));
    const del = _chainChunkWrite('s1', () => { order.push('delete'); return Promise.resolve(); });
    await Promise.all([slow, del]);
    expect(order).toEqual(['write', 'delete']);
  });
});

describe('finding 14 — WCAG Success-Criteria normalization', () => {
  const start = dp.indexOf('var _alloWcagScFromTags = function (tags) {');
  const end = dp.indexOf('\n};', start) + 3;
  const sc = new Function(dp.slice(start, end) + '\nreturn _alloWcagScFromTags;')();
  it('BEHAVIORAL: compact tags convert; conformance-level and non-wcag tags are excluded', () => {
    expect(sc(['wcag111', 'wcag2a', 'cat.text-alternatives'])).toEqual(['1.1.1']);
    expect(sc(['wcag412'])).toEqual(['4.1.2']);
    expect(sc(['wcag1412'])).toEqual(['1.4.12']);
    expect(sc(['wcag21aa', 'wcag2aaa'])).toEqual([]);
    expect(sc(['wcag111', 'wcag111'])).toEqual(['1.1.1']); // dedup
    expect(sc(null)).toEqual([]);
  });
  it('every axe result bucket ships wcagCriteria; incomplete findings finally carry WCAG identity', () => {
    const wired = dp.match(/wcagCriteria: _alloWcagScFromTags\(/g) || [];
    expect(wired.length).toBeGreaterThanOrEqual(6); // critical/serious/moderate/minor/passes/incomplete
    expect(dp).toContain('finding 14: incomplete findings used to omit WCAG identity entirely');
  });
  it('the view prefers the normalized arrays and converts compact tags as the legacy fallback', () => {
    expect(view).toContain('const extractScList = (entry) => {');
    expect(view).toContain('if (entry && Array.isArray(entry.wcagCriteria) && entry.wcagCriteria.length) return entry.wcagCriteria;');
    expect(view).toContain('extractScList(p).forEach(sc => addToSc(sc, \'passes\'));');
    expect(view).not.toContain('const sc = extractSc(p.wcag);'); // the always-null parser is gone
  });
});

describe('finding 7 — Equal Access joins the loop it governs', () => {
  it('the axe-clean stop also requires EA-clean when EA ran', () => {
    expect(anti).toContain("const _eaFails = (cur.secondEngineAudit && typeof cur.secondEngineAudit.failViolations === 'number') ? cur.secondEngineAudit.failViolations : 0;");
    expect(anti).toContain('if (_vio === 0 && _aiIssues.length === 0 && _eaFails === 0) break;');
  });
  it('confirmed EA failures feed the next round\'s fix instructions', () => {
    expect(anti).toContain("EQUAL-ACCESS-CONFIRMED: ");
    expect(anti).toContain('.concat(_eaLines).join');
  });
});

describe('finding 15 — success telemetry requires KNOWN-clean verifiers', () => {
  it('a NULL axe audit (checker never ran) can no longer enter the success numerator', () => {
    expect(anti).toContain('const _outcome = (cur.afterScore >= pdfTargetScore && _resid === 0 && !cur._aiVerificationIncomplete) ? \'success\' : \'incomplete\';');
    expect(anti).not.toContain('(_resid === 0 || _resid == null)');
  });
});

describe('CI — the whole-pipeline behavioral suites are BLOCKING', () => {
  it('fault-injection + corpus run in the blocking tag-tree job', () => {
    expect(ci).toContain('remediation_fault_injection_golden.spec.ts');
    expect(ci).toContain('remediation_corpus_golden.spec.ts');
    // ...and inside the BLOCKING job (before the continue-on-error verapdf job), not a soft one:
    const tagTreeAt = ci.indexOf('Tagged-PDF goldens (BLOCKING)');
    const verapdfAt = ci.indexOf('verapdf:');
    const fiAt = ci.indexOf('remediation_fault_injection_golden.spec.ts');
    expect(fiAt).toBeGreaterThan(tagTreeAt);
    expect(fiAt).toBeLessThan(verapdfAt);
  });
});
