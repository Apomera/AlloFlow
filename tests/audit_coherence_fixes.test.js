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

describe('cross-document OCR guard (review F1/F5)', () => {
  it('C9: _alloDocFingerprint yields the SAME key for base64 and byte views of the same doc, different keys for different docs', () => {
    const m = dp.match(/function _alloDocFingerprint\(input\) \{[\s\S]*?\n\}/);
    expect(m).toBeTruthy();
    const fp = new Function(m[0] + '\n; return _alloDocFingerprint;')();
    const bytesA = new Uint8Array(6000).map((_, i) => (i * 7 + 13) % 256);
    const bytesB = new Uint8Array(6000).map((_, i) => (i * 11 + 5) % 256);
    const b64A = Buffer.from(bytesA).toString('base64');
    expect(fp(bytesA)).toBe(fp(b64A));            // representation-independent
    expect(fp(bytesA)).not.toBe(fp(bytesB));      // discriminates documents
    expect(fp(null)).toBe(null);
    expect(fp(new Uint8Array(0))).toBe('pdf:0:0');
  });
  it('C10: the write site stamps the key and every legacy read is gated on the match', () => {
    expect(dp).toMatch(/window\.__lastGroundTruthDocKey = _alloDocFingerprint\(_base64\);/);
    expect(dp).toMatch(/const _thisDocKey = _alloDocFingerprint\(originalPdfBytes\);/);
    expect(dp).toMatch(/\(_gtGlobalsMatch && window\.__lastGroundTruthMethod\)/);
    expect(dp).toMatch(/\(_gtGlobalsMatch \? window\.__lastGroundTruthPageMap : null\)/);
    expect(dp).toMatch(/\(_gtGlobalsMatch && Array\.isArray\(window\.__lastGroundTruthPageMap\)\)/);
    // and the batch loop clears the globals between files (finally)
    expect(dp).toMatch(/Per-file global hygiene \(review F5, 2026-07-01\)/);
    expect(dp).toMatch(/window\.__lastGroundTruthDocKey = null;/);
  });
});

describe('builder honesty + editor safety (review A2/A4)', () => {
  it('C11: ungrounded generations carry the AI-assistance disclosure footer', () => {
    const ce = readFileSync(resolve(process.cwd(), 'content_engine_source.jsx'), 'utf8');
    expect(ce).toMatch(/if \(!effIncludeCitations \|\| allGroundingChunks\.length === 0\) \{/);
    expect(ce).toMatch(/drafted with AI assistance/);
    expect(ce).toMatch(/review for accuracy before classroom use/);
  });
  it('C12: the editor iframe sanitizes rich-HTML paste/drop and createLink enforces a scheme allowlist', () => {
    const ve = readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8');
    expect(ve).toMatch(/doc\.__alloPasteGuard = true;/);
    expect(ve).toMatch(/querySelectorAll\('script,style,iframe,object,embed,link,meta,base,form'\)/);
    expect(ve).toMatch(/n\.startsWith\('on'\)/);
    expect(ve).toMatch(/\['http', 'https', 'mailto', 'tel'\]\.includes\(_schemeMatch\[1\]\.toLowerCase\(\)\)/);
  });
});

describe('builder review round 2 (A5 merged cells, A3 support stats, A1 capture)', () => {
  it('C13: DOCX spec + builder carry colspan/rowspan through to TableCell', () => {
    const vp = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(vp).toMatch(/colSpan: Math\.max\(1, parseInt\(cell\.getAttribute\('colspan'\)/);
    expect(vp).toMatch(/rowSpan: Math\.max\(1, parseInt\(cell\.getAttribute\('rowspan'\)/);
    expect(vp).toMatch(/\.\.\.\(c\.colSpan > 1 \? \{ columnSpan: c\.colSpan \} : \{\}\),/);
    expect(vp).toMatch(/\.\.\.\(c\.rowSpan > 1 \? \{ rowSpan: c\.rowSpan \} : \{\}\),/);
  });

  it('C14: computeGroundingSupportStats — coverage union + unsupported-citation detection (behavioral)', () => {
    const ce = readFileSync(resolve(process.cwd(), 'content_engine_source.jsx'), 'utf8');
    const m = ce.match(/var computeGroundingSupportStats = function \(text, groundingMetadata\) \{[\s\S]*?\n  \};/);
    expect(m).toBeTruthy();
    const stats = new Function('"use strict"; ' + m[0].replace(/^  var /, 'var ') + ' return computeGroundingSupportStats;')();
    // 100-char text; supports covering [0,30) and [20,50) → union 50 chars.
    // One citation site inside support (pos ~10), one far outside (pos ~80).
    // Second citation sits at pos ~152 — beyond the supports' reach ([0,50) + the ±40
    // proximity window = 90), so it must count as unsupported.
    const text = 'aaaaaaaaa [Sources 1] ' + 'b'.repeat(130) + ' [Sources 2] cccccccc';
    const gm = { groundingSupports: [
      { segment: { endIndex: 30 } },                    // startIndex omitted = 0 (Gemini quirk)
      { segment: { startIndex: 20, endIndex: 50 } },
    ] };
    const r = stats(text, gm);
    expect(r.hasSupports).toBe(true);
    expect(r.supportedChars).toBe(50);                  // union, not sum (60)
    expect(r.citationsTotal).toBe(2);
    expect(r.citationsUnsupported).toBe(1);             // the far one only
    // No supports at all → hasSupports false, nothing counted as unsupported.
    const r2 = stats(text, { groundingSupports: [] });
    expect(r2.hasSupports).toBe(false);
    expect(r2.citationsUnsupported).toBe(0);
  });

  it('C15: support disclosure + ungrounded footer + A1 capture are wired', () => {
    const ce = readFileSync(resolve(process.cwd(), 'content_engine_source.jsx'), 'utf8');
    expect(ce).toMatch(/computeGroundingSupportStats\(rawSection, result\.groundingMetadata\)/);
    expect(ce).toMatch(/Source-support check \(automated, from the grounding engine/);
    expect(ce).toMatch(/it does not guarantee the source states the claim/);
    const ve = readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8');
    expect(ve).toMatch(/window\.__alloBuilderEditedPack = \{ html: '<!DOCTYPE html>\\n' \+ doc\.documentElement\.outerHTML, at: Date\.now\(\) \}/);
  });
});
