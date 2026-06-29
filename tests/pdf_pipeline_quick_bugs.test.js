// Quick correctness bugs from pdf_pipeline_refinement_report + document_builder_refinement_report (2026-06-22):
// DB-B2 (chunk-retry body swap corrupts docs containing $&/$1/$$), PDF-C4 (PDF/UA tile shows NaN% on a
// zero-rules doc), and the timeout/leak trio (extractPdfStructTree, detectPdfBlankFields, the typeset Noto
// font fetch had unbounded pdf.js/fetch awaits + a leaked pdf.js doc). Logic bugs get behavioral mirrors;
// the hang/leak hygiene gets anti-drift on the source (matching the _withTimeout + finally{destroy} pattern).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const vp = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('DB-B2: chunk-retry body swap treats document text as DATA, not a replace pattern', () => {
  // mirror of the fixed swap (function replacer)
  const swapFixed = (html, body) => html.replace(/<body[^>]*>[\s\S]*<\/body>/, () => '<body>' + body + '</body>');
  // the OLD buggy form (string replacement) — kept to prove the corruption it caused
  const swapBuggy = (html, body) => html.replace(/<body[^>]*>[\s\S]*<\/body>/, '<body>' + body + '</body>');
  const doc = '<html><body>OLD</body></html>';
  const tricky = '<p>Total: $5, ref $1, literal $$ and $& and $`</p>';

  it('preserves $-sequences verbatim (fn replacer)', () => {
    expect(swapFixed(doc, tricky)).toBe('<html><body>' + tricky + '</body></html>');
  });
  it('demonstrates the old string form WOULD have corrupted it', () => {
    expect(swapBuggy(doc, tricky)).not.toContain('$&'); // $& expanded to the whole match → corruption
  });
  it('source uses a function replacer at the body-swap site', () => {
    expect(dp).toMatch(/\.replace\(\/<body\[\^>\]\*>\[\\s\\S\]\*<\\\/body>\/, \(\) => '<body>' \+ bodyContent/);
  });
  it('the deterministic-fix handlers (title/lang/lang-span/svg-desc) also use function replacers', () => {
    // these substitute AI-generated p.title/p.lang/p.text/p.desc — same $-token corruption class
    expect(dp).toMatch(/\.replace\(\/<title>\[\^<\]\*<\\\/title>\/i, \(\) => '<title>' \+ p\.title/);
    expect(dp).toMatch(/\.replace\('<\/head>', \(\) => '<title>' \+ p\.title/);
    expect(dp).toMatch(/\(m, g1\) => '<html' \+ g1 \+ 'lang="' \+ p\.lang/); // $1 capture preserved
    expect(dp).toMatch(/\.replace\(new RegExp\(escapeForRegex\(p\.text\)\), \(\) => '<span lang="/);
    expect(dp).toMatch(/\.replace\(\/<\\\/title>\/i, \(\) => '<\/title><desc>' \+ p\.desc/);
    // no remaining string-concat replacement that interpolates p.title/p.lang/p.text/p.desc
    expect(dp).not.toMatch(/\.replace\([^,]+, '<title>' \+ p\.title/);
    expect(dp).not.toMatch(/\.replace\([^,]+, '<html\$1lang="' \+ p\.lang/);
  });
});

describe('PDF-C4: PDF/UA self-check tile never renders NaN% (zero applicable rules)', () => {
  // mirror of the fixed pct — denominator now includes WARN (a warn is not a pass),
  // matching the canonical conformancePct. Guards 0/0 → null (no NaN%).
  const pct = (hasPdfUa, pass, fail, warn) => { const denom = pass + fail + (warn || 0); return (hasPdfUa && denom > 0) ? Math.round((pass / denom) * 100) : null; };
  it('0/0 → null (suppressed), not NaN', () => {
    expect(pct(true, 0, 0, 0)).toBe(null);
    expect(Number.isNaN(pct(true, 0, 0, 0))).toBe(false);
  });
  it('normal rules compute the percentage', () => {
    expect(pct(true, 8, 2)).toBe(80);
    expect(pct(true, 10, 0)).toBe(100);
  });
  it('WARN counts in the denominator (a warn is not a pass)', () => {
    // 8 pass, 0 fail, 2 warn → 8/10 = 80% (NOT 8/8 = 100% — the old warn-excluded bug)
    expect(pct(true, 8, 0, 2)).toBe(80);
  });
  it('source guards the divisor (warn-inclusive) + the tile/warning suppress on null', () => {
    expect(dp).toMatch(/const _pdfuaDenom = hasPdfUa \? \(pdfua\.pass \+ pdfua\.fail \+ \(pdfua\.warn \|\| 0\)\)/);
    expect(dp).toMatch(/const pdfuaPct = \(hasPdfUa && _pdfuaDenom > 0\)/);
    expect(dp).toMatch(/const pdfuaTile = \(hasPdfUa && pdfuaPct !== null\)/);
    expect(dp).toMatch(/if \(hasPdfUa && pdfuaPct !== null && pdfuaPct < 80/);
  });
});

describe('timeout + leak hygiene (PDF-C1/C2/C3, DB-B1) — matches the codebase _withTimeout + finally{destroy} pattern', () => {
  it('extractPdfStructTree: hoisted pdf + timeouts on every pdf.js await + finally destroy', () => {
    expect(dp).toMatch(/let pdf = null; \/\/ hoisted so finally can always destroy/);
    expect(dp).toMatch(/pdf = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: bytes \}\)\.promise, 60000, 'pdf\.js getDocument \(structTree\)'\)/);
    expect(dp).toMatch(/await _withTimeout\(pdf\.getPage\(p\), 30000, 'getPage \(structTree\)/);
    expect(dp).toMatch(/await _withTimeout\(page\.getStructTree\(\), 30000, 'getStructTree/);
    expect(dp).toMatch(/await _withTimeout\(page\.getTextContent\(\{ includeMarkedContent: true \}\), 30000, 'getTextContent \(structTree\)/);
    // the finally{destroy} appears in this function's tail (StructTree-specific message nearby)
    expect(dp).toMatch(/release the pdf\.js worker doc on every path/);
  });
  it('detectPdfBlankFields: timeouts + try/finally so destroy runs even if the loop throws', () => {
    expect(dp).toMatch(/pdoc = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: bytes\.slice\(\) \}\)\.promise, 60000, 'pdf\.js getDocument \(blank fields\)'\)/);
    expect(dp).toMatch(/await _withTimeout\(pdoc\.getPage\(pi\), 30000, 'getPage \(blank fields\)/);
    expect(dp).toMatch(/await _withTimeout\(page\.getTextContent\(\), 30000, 'getTextContent \(blank fields\)/);
    expect(dp).toMatch(/always release the pdf\.js doc, even if the loop throws/);
  });
  it('typeset Noto font fetch is bounded (fetch AND body read)', () => {
    expect(dp).toMatch(/await _withTimeout\(fetch\(u\), 15000, 'Noto font fetch'\)/);
    expect(dp).toMatch(/await _withTimeout\(r\.arrayBuffer\(\), 15000, 'Noto font bytes'\)/);
  });
  it('axe-core CDN fetch loop is bounded (sibling of DB-B1) — fetch AND body read', () => {
    expect(dp).toMatch(/await _withTimeout\(fetch\(u\), 15000, 'axe-core CDN fetch'\)/);
    expect(dp).toMatch(/await _withTimeout\(r\.text\(\), 15000, 'axe-core CDN body'\)/);
  });
});

// ── Audit batch 2 (2026-06-29): honesty/fidelity fixes off the secondary lanes ──

describe('B2-1: aiFixChunked multi-chunk path runs a WARN-only fabrication check (no silent hallucination)', () => {
  it('assembled chunk output is checked with detectFabrication{faithful} vs the source — WARN only', () => {
    // Runs detectFabrication on the IMAGE-RESTORED assembly vs the original `html`, mirroring single-pass.
    expect(dp).toMatch(/const _fabJ = detectFabrication\(_out, html, \{ mode: 'faithful' \}\)/);
    // WARN-only: surfaces via warnLog / addToast, never rejects — still returns the assembled output.
    expect(dp).toMatch(/\[Hallucination\] remediation may have ADDED content not in the source/);
    expect(dp).toMatch(/const _out = _restoreImages\(_joined\);[\s\S]{0,2200}?return _out;/);
  });
});

describe('B2-2: "Fix Remaining" re-fix lane runs the main fidelity sweep + carries notes forward', () => {
  it('doc_pipeline exposes the pure fidelity helpers the re-fix lane reuses', () => {
    expect(dp).toMatch(/computeStructuralFidelityNotes: _computeStructuralFidelityNotes/);
    expect(dp).toMatch(/numericFidelityLosses: _numericFidelityLosses/);
    expect(dp).toMatch(/htmlToPlainText: htmlToPlainText/);
  });
  it('the Fix Remaining handler sweeps THIS run and commits fidelityNotes/fidelityLimited (WARN-only)', () => {
    expect(vp).toMatch(/_docPipeline\.computeStructuralFidelityNotes\(_srcRaw, bestHtml\)/);
    expect(vp).toMatch(/_docPipeline\.numericFidelityLosses\(_srcRaw, _outText\)/);
    expect(vp).toMatch(/_docPipeline\.checkReadingOrderPreserved\(prevSnapshot\.html, bestHtml\)/);
    expect(vp).toMatch(/commit: \{ autoFixPasses:[^}]*fidelityNotes: _refixNotes, fidelityLimited: _refixNotes\.length > 0 \}/);
  });
});

describe('B2-3: /auto agent runs the deterministic net + heading-outline guard (cap only on stable missingH1)', () => {
  it('runs runDeterministicWcagFixes BEFORE the final audit', () => {
    expect(dp).toMatch(/currentHtml = runDeterministicWcagFixes\(currentHtml\);[\s\S]{0,400}?var finalAxe = await runAxeAudit\(currentHtml\)/);
  });
  it('caps the score ONLY on missingH1; skip is WARN-only (parser-divergence safe)', () => {
    expect(dp).toMatch(/_autoHo = _headingOutlineIssue\(currentHtml\)/);
    expect(dp).toMatch(/if \(_autoHo\.missingH1\) finalScore = Math\.max\(0, Math\.min\(finalScore, 90\)\)/);
    // returns the heading-outline state so the verdict is inspectable
    expect(dp).toMatch(/return \{ html: currentHtml, score: finalScore,[^}]*headingOutline: _autoHo \}/);
  });
  // Pure-logic mirror of the cap rule: missingH1 caps to <=90; skip alone does NOT cap.
  const capRule = (score, ho) => ho.missingH1 ? Math.max(0, Math.min(score, 90)) : score;
  it('missingH1 caps a perfect score; a skip-only outline does not', () => {
    expect(capRule(100, { missingH1: true, skip: false })).toBe(90);
    expect(capRule(100, { missingH1: false, skip: true })).toBe(100);
    expect(capRule(100, { missingH1: false, skip: false })).toBe(100);
  });
});

// ── Audit batch 3 (2026-06-29): reliability cluster (leaks, unbounded cache, RTL, state-reset) ──

describe('B3-1: pdf.js worker doc is freed on EVERY createTaggedPdf path (no leak on flat/no-heading PDFs)', () => {
  it('the destroy is an unconditional backstop AFTER the outline try/catch, not nested in the headings if-block', () => {
    // The free now lives right after the outline catch closes, so the no-heading path frees it too.
    expect(dp).toMatch(/\} catch \(outlineErr\) \{[\s\S]{0,400}?\}\s*\n\s*\/\/ Free the pdf\.js worker doc on EVERY path[\s\S]{0,800}?try \{ if \(pdfjsDocForTagging\) \{ await pdfjsDocForTagging\.destroy\(\); pdfjsDocForTagging = null; \} \} catch \(_\) \{\}/);
    // the old headings-only "now its last use" free is gone (replaced by a pointer comment)
    expect(dp).not.toMatch(/Free the pdf\.js worker doc now its last use/);
  });
});

describe('B3-2: __pdfPageCanvases is cleared unconditionally per run (no cross-doc bleed)', () => {
  it('cleared in the ground-truth reset block, right after the OCR globals', () => {
    expect(dp).toMatch(/window\.__lastOcrMethod = null;[\s\S]{0,800}?window\.__pdfPageCanvases = \{\};/);
  });
});

describe('B3-3: PDF audit/remediation IDB cache has a bounded, prefix-scoped eviction sweep', () => {
  it('sweep is prefix-scoped to pdf_audit_/pdf_remed_ ONLY, throttled, and called by both writers', () => {
    expect(dp).toMatch(/_PDF_CACHE_KEY_PREFIXES = \['pdf_audit_', 'pdf_remed_'\]/);
    expect(dp).toMatch(/const _sweepPdfCacheStore = async/);
    expect(dp).toMatch(/_nowTs - _lastPdfCacheSweepAt < 60000/); // throttle: ≤1 sweep / 60s
    // both writers fire-and-forget the sweep
    expect((dp.match(/_sweepPdfCacheStore\(\); \/\/ fire-and-forget bounded eviction/g) || []).length).toBe(2);
  });
  // Pure-logic mirror: the prefix filter must NEVER match the resume / multi-session keys.
  const prefixes = ['pdf_audit_', 'pdf_remed_'];
  const matches = (k) => prefixes.some(p => k.startsWith(p));
  it('the filter excludes resume + multi-session keys (no live-data eviction)', () => {
    expect(matches('pdf_audit_v9_abc_n3_en')).toBe(true);
    expect(matches('pdf_remed_v9_abc_n3_en_t95_p2')).toBe(true);
    expect(matches('pdf_active_batch_files_v1')).toBe(false);   // resume
    expect(matches('pdf_active_batch_status_v1')).toBe(false);  // resume
    expect(matches('msdoc_123')).toBe(false);                   // multi-session (separate DB anyway)
    expect(matches('chunk_123')).toBe(false);                   // chunk progress (separate DB anyway)
  });
});

describe('B3-4: RTL dir is set on the single-file remediation output for RTL languages', () => {
  it('_applyDetectedLang injects dir="rtl" via isRtlLang, idempotently (skips when dir already present)', () => {
    expect(dp).toMatch(/if \(_finalLang && isRtlLang\(_finalLang\)\)/);
    expect(dp).toMatch(/_out\.replace\(\/<html\(\[\^>\]\*\)>\/i, \(m, attrs\) => '<html' \+ attrs \+ ' dir="rtl">'\)/);
    expect(dp).toMatch(/if \(_htmlTag && !\/\\sdir=\/i\.test\(_htmlTag\[0\]\)\)/); // idempotent guard
  });
  // Pure-logic mirror: LTR docs are never given a dir.
  const wantsRtl = (lang, isRtl) => !!(lang && isRtl);
  it('only RTL languages get a dir (LTR untouched)', () => {
    expect(wantsRtl('ar', true)).toBe(true);
    expect(wantsRtl('en', false)).toBe(false);
    expect(wantsRtl('', false)).toBe(false);
  });
});

describe('B3-5: H-8 — the loaded-project loader resets per-doc holdovers (palette snapshot etc.)', () => {
  it('clears _paletteSnapshotRef + the sibling per-doc state after loading a project', () => {
    expect(vp).toMatch(/setPendingPdfFile\(\{ name: project\.fileName \|\| 'loaded-project\.pdf' \}\);[\s\S]{0,900}?_paletteSnapshotRef\.current = null;[\s\S]{0,400}?setTagOutline\(null\);/);
  });
});
