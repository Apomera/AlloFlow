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

// ── Audit batch 4 (2026-06-29): reduce audit-section throttle failures + manual re-audit ──

describe('B4: audit call-volume + pacing reductions to cut throttle failures', () => {
  it('per-pass auditors lowered 3 → 2 (adaptive tiebreaker still adds a 3rd on divergence)', () => {
    expect(dp).toMatch(/const numAudits = 2;/);
    // the adaptive tiebreaker that makes 2 safe must still be present
    expect(dp).toMatch(/rvScores\.length === 2 && Math\.abs\(rvScores\[0\] - rvScores\[1\]\) > 15/);
  });
  it('audit batchSize lowered 6 → 3 to match the concurrency gate (no backlog aging out)', () => {
    expect(dp).toMatch(/const batchSize = 3;/);
    expect(dp).toMatch(/var _GEMINI_MAX_CONCURRENT = 3;/); // batchSize is matched to this gate
  });
  it('does NOT raise the concurrency gate (raising it would worsen throttling)', () => {
    expect(dp).not.toMatch(/_GEMINI_MAX_CONCURRENT = [4-9]/);
  });
});

describe('B4: manual "Re-run audit" recovery button for a throttle-degraded audit', () => {
  it('shown only when the audit was incomplete, and re-audits the current output via the shared helper', () => {
    expect(vp).toMatch(/pdfFixResult\._aiVerificationIncomplete && pdfFixResult\.accessibleHtml &&/);
    expect(vp).toMatch(/_reauditAndScore\(pdfFixResult\.accessibleHtml\)/);
    expect(vp).toMatch(/data-help-key="pdf_audit_reaudit_button"/);
  });
});

// ── Audit batch 5 (2026-06-29): OCR-quality (garbled-text-layer detect, re-OCR gates, low-conf WARN) ──

describe('B5: OCR-quality fixes are wired with the high-precision (U+FFFD) detector', () => {
  it('module-scope helpers exist', () => {
    expect(dp).toMatch(/var _textLayerLooksGarbage = function/);
    expect(dp).toMatch(/var _ocrJunkRatio = function/);
  });
  it('born-digital gate forces OCR over a garbled text layer (auto re-scan)', () => {
    expect(dp).toMatch(/!det\.isScanned && !_forceFullOcr && det\.method !== 'transcript' && _textLayerLooksGarbage\(det\.fullText\)/);
    expect(dp).toMatch(/_forceFullOcr = true;[\s\S]{0,400}?garbled \(broken encoding\)/);
  });
  it('resume-seed gate re-OCRs a garbled banked seed instead of reusing it', () => {
    expect(dp).toMatch(/if \(_textLayerLooksGarbage\(_seed\.text\)\)/);
  });
  it('manual re-OCR splice only adopts a re-scan that is no junkier (no silent degrade)', () => {
    expect(dp).toMatch(/_ocrJunkRatio\(_re\[pg\.pageNum\]\) <= _ocrJunkRatio\(pg\.text\)/);
  });
  it('low-confidence OCR pages are pushed as a durable fidelity WARN', () => {
    expect(dp).toMatch(/window\.__lastOcrLowConfidencePages/);
    expect(dp).toMatch(/kind: 'lowOcrConfidence'/);
  });
  // Review must-fix 1: a false trip of the garbled detector must NOT destroy good text.
  it('forced-OCR is parity-checked — the discarded layer/seed is stashed and restored if OCR is junkier', () => {
    expect(dp).toMatch(/_garbledFallbackText = det\.fullText/);   // born-digital stash
    expect(dp).toMatch(/_garbledFallbackText = _seed\.text/);     // resume stash
    expect(dp).toMatch(/if \(_garbledFallbackText && _ocrJunkRatio\(extractedText\) > _ocrJunkRatio\(_garbledFallbackText\)\)/);
    expect(dp).toMatch(/extractedText = _garbledFallbackText;/);
  });
  // Review must-fix 2: the per-page re-OCR toast reports ADOPTED pages, not merely produced.
  it('per-page re-OCR toast is honest about no-ops (counts adopted, not produced)', () => {
    expect(dp).toMatch(/_adopted\+\+/);
    expect(dp).toMatch(/Re-OCR ran but the new scan was not cleaner/);
  });
});

describe('B5: garbled-text detector is high-precision (pure-logic mirror)', () => {
  // exact mirror of _textLayerLooksGarbage (charCode form, no literal control chars in this test source)
  const looksGarbage = (s) => {
    const str = String(s == null ? '' : s);
    let nonWs = 0, bad = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) continue;
      nonWs++;
      if (c === 0xFFFD || (c >= 0 && c <= 8) || c === 11 || c === 12 || (c >= 14 && c <= 31) || (c >= 127 && c <= 159)) bad++;
    }
    if (nonWs < 120 || bad < 6) return false;
    return (bad / nonWs) >= 0.10;
  };
  const R = String.fromCharCode(0xFFFD); // replacement char
  it('clean text of every script → NOT garbage (no false re-OCR)', () => {
    expect(looksGarbage('the quick brown fox jumps over the lazy dog. '.repeat(6))).toBe(false);
    expect(looksGarbage('日本語のテキストです。これはテストです。'.repeat(8))).toBe(false); // CJK
    expect(looksGarbage('E = mc^2 and ∫ f(x) dx = F(b) - F(a) for all x in [a,b]. '.repeat(5))).toBe(false); // math/symbols
  });
  it('a substantially-broken font layer (high U+FFFD density) → garbage', () => {
    expect(looksGarbage(R.repeat(30) + 'a'.repeat(150))).toBe(true); // 30/180 = 16.7% density, 30 bad, 180 non-ws
  });
  it('REGRESSION (review FP): a clean page with a few unmapped ornament glyphs → NOT garbage', () => {
    // the exact measured false-positive: ~6 U+FFFD in ~280 non-ws chars = 2.1% density → must NOT force OCR
    expect(looksGarbage(R.repeat(6) + 'a'.repeat(280))).toBe(false);
  });
  it('too few replacement chars, too short, or too sparse → NOT garbage (conservative)', () => {
    expect(looksGarbage(R.repeat(4) + 'a'.repeat(200))).toBe(false);   // only 4 bad (<6)
    expect(looksGarbage(R.repeat(8) + 'a'.repeat(80))).toBe(false);    // <120 non-ws
    expect(looksGarbage(R.repeat(8) + 'a'.repeat(300))).toBe(false);   // density 8/308 ≈ 2.6% < 10%
  });
});

describe('B5: re-OCR splice gate only adopts non-junkier text (pure-logic mirror)', () => {
  const junk = (s) => { const ns = String(s == null ? '' : s).replace(/\s+/g, ''); if (!ns.length) return 1; const tc = (ns.match(/[\p{L}\p{N}]/gu) || []).length; return 1 - tc / ns.length; };
  const adopt = (newT, oldT) => junk(newT) <= junk(oldT);
  it('adopts when old text is empty (gap-page rescue preserved)', () => {
    expect(adopt('clean recovered text', '')).toBe(true);
  });
  it('keeps old when the re-scan is junkier (fixes the unconditional-overwrite bug)', () => {
    expect(adopt('@#$%^&*@#$%^&*@#$%', 'clean recovered text here')).toBe(false);
  });
  it('adopts equal-or-better re-scans', () => {
    expect(adopt('clean text', 'clean text')).toBe(true);
  });
});

describe('B6: large-document page-slice audit (chunk-first router + reactive fallback)', () => {
  // ── Source-pins: the design is present and the safety net is preserved ──
  it('defines the _auditPdfInSlices helper + tunable threshold constants', () => {
    expect(dp).toMatch(/const _auditPdfInSlices = async \(base64Data, auditPromptBase\)/);
    expect(dp).toMatch(/_AUDIT_SLICE_BYTES_KB = 9000/);
    expect(dp).toMatch(/_AUDIT_SLICE_PAGES\b\s*=\s*20/);
    expect(dp).toMatch(/_AUDIT_SLICE_MAX\s*=\s*40/);
  });
  it('routes large docs to slices FROM THE START (chunk-first), gating the whole-doc fan-out', () => {
    expect(dp).toMatch(/if \(_chunkFirst\)/);
    expect(dp).toMatch(/if \(!_auditedViaSlices\) \{/);
  });
  it('keeps a reactive slice fallback for docs UNDER the threshold that still fail', () => {
    expect(dp).toMatch(/Reactive fallback: whole-document audit produced nothing/);
    expect(dp).toMatch(/parsedAudits\.length === 0 && !_auditedViaSlices && _sliceCapable/);
  });
  it('is strictly additive — the original hard-fail throw is still the final guard', () => {
    expect(dp).toMatch(/if \(parsedAudits\.length === 0\) throw new Error\('All audit attempts failed'\)/);
  });
  it('merges slices to ONE audit object (n=1 → honest n/a reliability, no fabricated agreement)', () => {
    expect(dp).toMatch(/_slicedAudit: true/);
    expect(dp).toMatch(/parsedAudits = \[_slicedFirst\]/);
    expect(dp).toMatch(/parsedAudits = \[_slicedFallback\]/);
  });
  it('page-prefixes slice findings so the existing dedupe keeps page-level issues distinct', () => {
    expect(dp).toMatch(/SLICE CONTEXT/);
    expect(dp).toMatch(/Begin every issue/);
  });
  it('does NOT cache a sliced (lower-fidelity) result', () => {
    expect(dp).toMatch(/if \(_cacheKey && !_auditedViaSlices\)/);
  });

  // ── Pure-logic mirror: slice-range computation (per grows to cap total calls) ──
  const sliceRanges = (totalPages, per0 = 4, max = 40) => {
    let per = per0;
    if (Math.ceil(totalPages / per) > max) per = Math.ceil(totalPages / max);
    const ranges = [];
    for (let sp = 0; sp < totalPages; sp += per) ranges.push([sp, Math.min(sp + per, totalPages)]);
    return ranges;
  };
  it('a small doc is one slice; a 10-page doc is three 4-page slices', () => {
    expect(sliceRanges(4)).toEqual([[0, 4]]);
    expect(sliceRanges(10)).toEqual([[0, 4], [4, 8], [8, 10]]);
  });
  it('a huge doc never exceeds the slice cap (per-slice page count grows instead)', () => {
    const r = sliceRanges(1000);
    expect(r.length).toBeLessThanOrEqual(40);
    expect(r[0]).toEqual([0, 25]);          // per = ceil(1000/40) = 25
    expect(r[r.length - 1][1]).toBe(1000);  // covers the last page
  });
  it('ranges always cover every page exactly once, contiguous with no gaps/overlap', () => {
    for (const n of [1, 3, 7, 40, 161, 999]) {
      const r = sliceRanges(n);
      expect(r[0][0]).toBe(0);
      expect(r[r.length - 1][1]).toBe(n);
      for (let i = 1; i < r.length; i++) expect(r[i][0]).toBe(r[i - 1][1]);
    }
  });

  // ── Pure-logic mirror: the chunk-first threshold decision ──
  const chunkFirst = (kb, pages, BYTES = 9000, PROBE = 1500, PAGES = 20) => {
    if (kb > BYTES) return true;                            // near the inline API limit → certain whole-doc failure
    if (kb > PROBE) return pages != null && pages > PAGES;  // ambiguous band → consult page count
    return false;                                           // small doc → always whole-doc (no fidelity loss)
  };
  it('chunks clearly-large docs by bytes alone (no page probe needed)', () => {
    expect(chunkFirst(12000, null)).toBe(true);
  });
  it('never chunks small docs, even with many pages (preserves whole-doc fidelity)', () => {
    expect(chunkFirst(800, 999)).toBe(false);
  });
  it('chunks mid-band docs only when the page count is high', () => {
    expect(chunkFirst(3000, 25)).toBe(true);
    expect(chunkFirst(3000, 10)).toBe(false);
  });
});

describe('B7: sliced-audit UI honesty (the score/info surfaces disclose the approximate path)', () => {
  const vps = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  // (1) the fabricated "(N-pass self-consistency, SD: 0)" tag is NOT appended for a sliced audit
  it('triangulated summary skips the self-consistency tag for a sliced (n=1) audit', () => {
    expect(dp).toMatch(/parsedAudits\.length === 1 && parsedAudits\[0\]\._slicedAudit\)\s*\n?\s*\?\s*parsedAudits\[0\]\.summary/);
  });
  // (2) the sliced provenance propagates onto the fix result so the UI can disclose it
  it('fixAndVerifyPdf result carries _beforeWasSliced / _beforeSliceCount', () => {
    expect(dp).toMatch(/_beforeWasSliced: !!\(_auditResult && _auditResult\._slicedAudit\)/);
    expect(dp).toMatch(/_beforeSliceCount:/);
  });
  // (3) the post-fix toast does NOT claim "remediated!" / play the success chord on a sliced baseline
  it('a sliced-baseline delta gets a neutral info toast, not the green success branch', () => {
    expect(dp).toMatch(/_auditResult && _auditResult\._slicedAudit && finalAfterScore !== null/);
    expect(dp).toMatch(/page-slice approximation, so this change is approximate/);
  });
  // (4) the permanent compliance report stops asserting "Multi-pass self-consistency" for a sliced audit
  it('the accessibility report methodology is sliced-aware (no false multi-pass claim)', () => {
    expect(dp).toMatch(/auditResult\._slicedAudit\) \|\| \(fixResult && fixResult\._beforeWasSliced\)\) \? `Page-sliced AI review/);
  });
  // (5) the score-badge subtitle: sliced branch + the persona/SD line is gated on scores.length > 1 (no degenerate leak)
  it('subtitle branches on _slicedAudit and gates the persona/SD line on scores.length > 1', () => {
    expect(vps).toMatch(/pdfAuditResult\._slicedAudit\s*\n?\s*\?\s*<p[^>]*>One pass per page-slice/);
    expect(vps).toMatch(/pdfAuditResult\.scores && pdfAuditResult\.scores\.length > 1 &&/);
  });
  // (6) a glanceable "Approximate — N page-slices" pill keys off the flag
  it('renders a glanceable sliced pill on the score badge', () => {
    expect(vps).toMatch(/pdfAuditResult\._slicedAudit && <p[^>]*>🧩 Approximate — audited in/);
  });
  // (7) the PDF/UA quick-chip is warn-aware (amber, warn in denominator) — matches the authoritative badge
  it('PDF/UA dashboard chip is warn-aware (warnOnly → amber, warn in denominator)', () => {
    expect(vps).toMatch(/warnOnly = !fail && _w > 0/);
    expect(vps).toMatch(/warnOnly \? 'bg-amber-100 text-amber-700'/);
    expect(vps).toMatch(/\(_pev\.pass \|\| 0\) \+ \(_pev\.fail \|\| 0\) \+ _w\)/);
  });
  // (8) the before→after green +gain pill is suppressed when the before was sliced (neutral pill instead)
  it('green +gain pill is gated on !_beforeSliced; a sliced baseline shows a neutral approx pill', () => {
    expect(vps).toMatch(/const _beforeSliced = !!pdfFixResult\._beforeWasSliced/);
    expect(vps).toMatch(/gain > 0 && !_aiIncomplete && !_beforeSliced &&/);
    expect(vps).toMatch(/gain > 0 && !_aiIncomplete && _beforeSliced &&/);
  });
});

describe('B8: 2026-06-29 scorecard fixes (export honesty + OCR/foundations/baseline nets)', () => {
  const dpx = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
  const vpx = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  // #1/#2 HIGH: the EXPORTED report mirrors the on-screen honesty (no green +gain on incomplete/sliced runs)
  it('exported audit report neutralizes the after + suppresses +gain for throttle-incomplete / sliced runs', () => {
    expect(dpx).toMatch(/const _rptIncomplete = !!d\._aiVerificationIncomplete/);
    expect(dpx).toMatch(/const _rptSliced = !!\(d\._slicedAudit \|\| d\._beforeWasSliced\)/);
    expect(dpx).toMatch(/score > beforeScore && !_rptIncomplete && !_rptSliced/);
    expect(dpx).toMatch(/NOT a verified content score/);
  });
  it('all three export payloads carry the honesty flags; JSON adds afterScoreVerified + basis', () => {
    expect((vpx.match(/_aiVerificationIncomplete: !!pdfFixResult\._aiVerificationIncomplete, _slicedAudit:/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(vpx).toMatch(/afterScoreVerified: !pdfFixResult\._aiVerificationIncomplete/);
    expect(vpx).toMatch(/afterScoreBasis: pdfFixResult\._aiVerificationIncomplete \?/);
  });
  // #4: foundations "All images have alt" is count-aware, not a single-match overclaim
  it('foundations card claims "All images have alt" ONLY when every image has it (else honest fraction)', () => {
    expect(dpx).toMatch(/_fImgAlt === _fImgTotal\) present\.push\('All images have a non-empty alt/);
    expect(dpx).toMatch(/of ' \+ _fImgTotal \+ ' images have a non-empty alt/);
  });
  // #3: OCR low-confidence net is engine-agnostic (catches garbled Vision-won / all-Vision pages)
  it('OCR low-confidence flag also fires on garbled Vision pages via an absolute junk-ratio gate', () => {
    expect(dpx).toMatch(/else if \(chosen\.text && _ocrJunkRatio\(chosen\.text\) >= 0\.6\)/);
  });
  // #5: web/HTML-paste unmeasured baseline = null (not 0) → excluded from history avg-gain
  it('web/HTML-paste baseline failure sets beforeScore=null (not a fake 0 → N gain)', () => {
    expect(vpx).toMatch(/let beforeScore = null;/);
    expect(vpx).toMatch(/_bAxe \?\? _bAi \?\? null\)/);
    expect(vpx).toMatch(/catch \(_\) \{ beforeScore = null; \}/);
  });
});

describe('B9: 2026-06-30 multi-h1 outline fix + Equal Access shown in the exported report', () => {
  const dpx = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
  const vpx = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  // Extract the pure helper and exercise it (the riskiest logic — the regex demote).
  const m = dpx.match(/var _alloEnsureSingleH1 = function \(html\) \{[\s\S]*?\n\};/);
  const ensureSingleH1 = m ? new Function(m[0] + '\nreturn _alloEnsureSingleH1;')() : null;

  it('the helper collapses a multi-h1 doc to a single h1 (keeps the FIRST, demotes the rest to h2)', () => {
    expect(typeof ensureSingleH1).toBe('function');
    const doc = '<html><body><h1 class="cover">Title</h1><h2>Sec</h2><h1 id="apx">APPENDIX E</h1></body></html>';
    const out = ensureSingleH1(doc);
    expect((out.match(/<h1[\s>]/gi) || []).length).toBe(1);
    expect(out).toMatch(/<h1 class="cover">Title<\/h1>/);   // title kept as h1
    expect(out).toMatch(/<h2 id="apx">APPENDIX E<\/h2>/);   // 2nd h1 demoted, attrs preserved
  });
  it('the helper is idempotent and a no-op on 0- or 1-h1 documents', () => {
    const once = ensureSingleH1('<h1>a</h1><h1>b</h1><h1>c</h1>');
    expect((once.match(/<h1[\s>]/gi) || []).length).toBe(1);
    expect(ensureSingleH1(once)).toBe(once);                // idempotent
    expect(ensureSingleH1('<h1>only</h1>')).toBe('<h1>only</h1>');
    expect(ensureSingleH1('<h2>x</h2>')).toBe('<h2>x</h2>');
  });
  it('the dedup runs BEFORE the final AI audit AND the deterministic engines (so all three see one h1)', () => {
    expect(dpx).toMatch(/accessibleHtml = _alloEnsureSingleH1\(accessibleHtml\)/);
    const dedupIdx = dpx.indexOf('accessibleHtml = _alloEnsureSingleH1(accessibleHtml)');
    const finalAuditIdx = dpx.indexOf('Final authoritative audit: re-run ONE clean audit');
    const eaIdx = dpx.indexOf('eaResults = await runEqualAccessAudit(_scoreHtml)');
    expect(dedupIdx).toBeGreaterThan(0);
    expect(finalAuditIdx).toBeGreaterThan(dedupIdx);        // dedup precedes the final AI verification audit
    expect(eaIdx).toBeGreaterThan(dedupIdx);                // and the Equal Access deterministic audit
  });

  it('_honestReportBlocks accepts a secondEngine arg + renders an Equal Access tile and a "governs" note', () => {
    expect(dpx).toMatch(/_honestReportBlocks = \(structural, semantic, coverage, pdfua, secondEngine\)/);
    expect(dpx).toMatch(/2nd engine \(Equal Access\)/);
    expect(dpx).toMatch(/headline is governed by the IBM Equal Access engine/);
  });
  it('both report generators pass the EA score, and all export after-objects carry secondEngineAudit', () => {
    expect(dpx).toMatch(/_eaScore = isBeforeAfter \? \(d\.after\?\.secondEngineAudit\?\.score\)/);
    expect(dpx).toMatch(/fr\.secondEngineAudit && typeof fr\.secondEngineAudit\.score === 'number'/);
    expect((vpx.match(/secondEngineAudit: pdfFixResult\.secondEngineAudit \|\| null/g) || []).length).toBeGreaterThanOrEqual(4);
  });
  it('the on-screen fix modal explains WHY the automated layer is low (names Equal Access + lists its fails) only when EA governs', () => {
    expect(vpx).toMatch(/typeof afterEa === 'number' && typeof afterAxe === 'number' && afterEa < afterAxe/);
    expect(vpx).toMatch(/ea_governs_lead/);
    expect(vpx).toMatch(/second independent WCAG engine, IBM Equal Access/);
    expect(vpx).toMatch(/pdfFixResult\.secondEngineAudit\.fails\.slice\(0, 12\)/);
  });
});

describe('B10: 2026-06-30 EA-consistency sweep (score labels name the governing engine everywhere)', () => {
  const dpx = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
  const vpx = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  // #1 compact sticky header: tag reflects the GOVERNING layer ("automated" when EA/axe is lower), not always "content"
  it('the compact header tag is governing-aware (shows "automated" when the deterministic layer is lower)', () => {
    expect(vpx).toMatch(/const _govTag = pdfFixResult\._aiVerificationIncomplete/);
    expect(vpx).toMatch(/_hdrDet < _hdrAi\)\s*\n?\s*\?\s*\(t\('pdf_audit\.dashboard\.automated_tag'\)/);
    expect(vpx).toMatch(/uppercase tracking-wide" title=\{_govTag === \(t\('pdf_audit\.dashboard\.automated_tag'\)/);
  });
  // #2/#3 pre-fix audit badge + breakdown: name Equal Access, drop "lower of the two"
  it('the pre-fix audit badge says "lower of AI & automated" and the breakdown shows the baseline Equal Access score', () => {
    expect(vpx).toMatch(/\(lower of AI & automated\)/);
    expect(vpx).not.toMatch(/\(lower of AI &amp; axe-core\)/);
    expect(vpx).toMatch(/' \| Equal Access: ' \+ pdfAuditResult\._baselineSecondEngineAudit\.score/);
    expect(vpx).toMatch(/the lower of the engines — never averaged/);
  });
  // #4 JSON export engines array includes IBM Equal Access when it ran
  it('the JSON export engines array adds IBM Equal Access when the second engine ran', () => {
    expect(vpx).toMatch(/\.concat\(pdfFixResult\.secondEngineAudit \? \['IBM Equal Access \(WCAG 2\.1 AA\)'\] : \[\]\)/);
  });
  // #5 batch HTML report has a per-doc Equal Access column (header + cell)
  it('the batch HTML report has an Equal Access column (header + per-row score/fails cell)', () => {
    expect(dpx).toMatch(/<th>2nd engine \(Equal Access\)<\/th>/);
    expect(dpx).toMatch(/r\?\.secondEngineAudit && typeof r\.secondEngineAudit\.score==='number' \? \(r\.secondEngineAudit\.score/);
  });
  // No-text-layer honesty: the by-construction automated ~100 is shown as "n/a", not a misleading number
  it('an image-only scan (no text layer) shows the automated engines as "n/a", never a by-construction 100', () => {
    expect(vpx).toMatch(/axe-core: \{pdfAuditResult\.hasSearchableText === false \? 'n\/a \(no text layer\)'/);
    expect(vpx).toMatch(/' \| Equal Access: n\/a'/);
    expect(vpx).toMatch(/automated checks ran on an empty text reconstruction — not meaningful; the AI rubric governs/);
    expect(vpx).toMatch(/AI rubric — automated checks N\/A, no text layer/);
    // the fix-modal before→after breakdown also neutralizes the by-construction automated "before" operand
    expect(vpx).toMatch(/\(pdfAuditResult\?\.hasSearchableText === false\) \? 'n\/a' : \(initialAxe \?\? '\?'\)/);
  });
});
