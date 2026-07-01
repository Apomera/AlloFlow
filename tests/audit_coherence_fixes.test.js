// Audit-coherence deep-dive fixes (2026-07-01) — regression locks.
// The theme: every place the audit RENDERS an honesty story must be backed by the
// MATH actually implementing that story, on every surface (badge, breakdown,
// expert-edit re-score, downloadable report).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const vw = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('audit coherence — no-text-layer story is enforced by the math', () => {
  it('C1: initial-audit blend EXCLUDES the engines when there is no text layer (AI governs, as the badge claims)', () => {
    expect(dp).toMatch(/const _noTextLayer = triangulated\.hasSearchableText === false;/);
    expect(dp).toMatch(/const governingInitial = _noTextLayer \? aiOnlyScore : _alloComputeHeadline\(aiOnlyScore, deterministicBaseline\);/);
    expect(dp).toMatch(/if \(_noTextLayer\) triangulated\._automatedNA = true;/);
  });

  it('C2: hasSearchableText merges by MAJORITY vote (ties → false), not any-true-wins', () => {
    // The old merge let ONE hallucinated "true" out of N auditor passes disarm the
    // whole no-text honesty layer.
    expect(dp).not.toMatch(/hasSearchableText: parsedAudits\.some\(a => a\.hasSearchableText !== undefined\) \? parsedAudits\.some\(a => a\.hasSearchableText\)/);
    expect(dp).toMatch(/hasSearchableText: \(\(\) => \{ const _v = parsedAudits\.filter\(a => a\.hasSearchableText !== undefined\); if \(!_v\.length\) return undefined; const _t = _v\.filter\(a => a\.hasSearchableText\)\.length; return _t > _v\.length - _t; \}\)\(\),/);
    // Behavior check on the extracted voter:
    const m = dp.match(/hasSearchableText: (\(\(\) => \{ const _v = parsedAudits[\s\S]*?\}\)\(\)),/);
    expect(m).toBeTruthy();
    const vote = new Function('parsedAudits', 'return ' + m[1]);
    expect(vote([{ hasSearchableText: false }, { hasSearchableText: false }, { hasSearchableText: true }])).toBe(false); // 1 hallucination no longer wins
    expect(vote([{ hasSearchableText: true }, { hasSearchableText: true }, { hasSearchableText: false }])).toBe(true);
    expect(vote([{ hasSearchableText: true }, { hasSearchableText: false }])).toBe(false); // tie → conservative
    expect(vote([{}, {}])).toBe(undefined);
  });

  it('C3: the downloadable report renders n/a tiles (not by-construction numbers) for image-only scans', () => {
    expect(dp).toMatch(/const _noTextRpt = !isBeforeAfter && d\.hasSearchableText === false;/);
    expect(dp).toMatch(/\{ automatedNA: _noTextRpt \}/);
    expect(dp).toMatch(/if \(opts && opts\.automatedNA && typeof semantic === 'number'\)/);
    expect(dp).toMatch(/Automated engine checks are not applicable to this document\./);
  });
});

describe('audit coherence — expert-edit re-score cannot inflate past Equal Access', () => {
  it('C4: _reauditAndScore runs EA and takes min(axe, EA) as the deterministic operand', () => {
    expect(vw).toMatch(/_docPipeline\.runEqualAccessAudit\(newHtml\)\.catch\(\(\) => null\)/);
    expect(vw).toMatch(/const \[_wv, _wa, _wea\] = await Promise\.all\(\[auditOutputAccessibility\(newHtml\), runAxeAudit\(newHtml\), _weaP\]\);/);
    expect(vw).toMatch(/const _wdet = _waOk \? \(_weaOk \? Math\.min\(_wa\.score, _wea\.score\) : _wa\.score\) : \(_weaOk \? _wea\.score : null\);/);
    // and the displayed EA audit stays in sync with the score that used it
    expect(vw).toMatch(/secondEngineAudit: _weaOk \? _wea : prev\.secondEngineAudit,/);
  });
});

describe('audit coherence — one modal, one story (display guards)', () => {
  it('C5: the EA baseline line carries the same n/a guard as the axe card beside it', () => {
    expect(vw).toMatch(/\? \(t\('pdf_audit\.score\.ea_na_no_text'\) \|\| 'n\/a \(no text layer — ran on an empty reconstruction\)'\)/);
  });
  it('C6: axe violation/pass COUNTS are n/a-guarded too (not just the score)', () => {
    expect(vw).toMatch(/ran on an empty text reconstruction — counts not meaningful/);
  });
  it('C7: the governed-by caption tells the no-text story instead of guessing from a meaningless operand', () => {
    expect(vw).toMatch(/governed_no_text'\) \|\| 'Automated checks are not applicable \(no text layer\) — the content rubric governs by definition\.'/);
  });
  it('C8: the report button never claims "(0% self-check)" when the self-check simply has not run', () => {
    expect(vw).not.toMatch(/conformancePct \?\? 0/);
    expect(vw).toMatch(/typeof lastTaggedValidation\.pdfUa1Checks\?\.summary\?\.conformancePct === 'number'/);
  });
});
