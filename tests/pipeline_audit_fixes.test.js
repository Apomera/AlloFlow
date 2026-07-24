// Audit fix tranche (2026-06-23) from the audit-docbuilder-pipeline workflow: H-1 stale-OCR-globals leak,
// H-2 pdf.js image-doc worker leak, H-3 PII in the diagnostics buffer, H-4 reading-order WARN wired into the
// high-volume AI fix path. Source-presence guards lock each fix in place + survive the build; H-4 also gets a
// real behavior test (the warn actually fires on a block reorder the magnitude checks can't see).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const gem = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
const dpMod = readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8');
const gemMod = readFileSync(resolve(process.cwd(), 'gemini_api_module.js'), 'utf8');

describe('H-1: stale OCR window globals are reset per run (cross-document text bleed)', () => {
  it('the Step-1 reset block clears all four OCR-text globals', () => {
    // they must be reset in the SAME block that resets __lastGroundTruth* (before AutoRestore reads them)
    const block = dp.slice(dp.indexOf('window.__lastGroundTruthCharCount = 0;'), dp.indexOf('Force-OCR escape hatch'));
    expect(block).toMatch(/window\.__lastOcrTesseractText = ''/);
    expect(block).toMatch(/window\.__lastOcrVisionText = ''/);
    expect(block).toMatch(/window\.__lastOcrDisagreements = \[\]/);
    expect(block).toMatch(/window\.__lastOcrMethod = null/);
    expect(dpMod).toMatch(/__lastOcrTesseractText = ''/);   // survives the build
  });
});

describe('H-2: image-extraction pdf.js doc is destroyed in a finally (worker/transport leak)', () => {
  it('pdfDoc is hoisted to let and released in a finally', () => {
    expect(dp).toMatch(/let pdfDoc = null; \/\/ H-2/);
    expect(dp).toMatch(/pdfDoc = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: pdfBytes \}\)/);   // assignment, not a fresh const
    expect(dp).not.toMatch(/const pdfDoc = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: pdfBytes \}\)/);
    expect(dp).toMatch(/if \(pdfDoc\) \{ try \{ pdfDoc\.destroy\(\); \} catch \(_\) \{\} pdfDoc = null; \}/);
  });
});

describe('H-3: OCR recovery logs LENGTH only — no document text (PII) in the diagnostics buffer', () => {
  it('the Vision truncation-recovery warnLog uses partial.length, not partial.substring', () => {
    const block = gem.slice(gem.indexOf('Response JSON truncated'), gem.indexOf('Vision API returned invalid response'));
    expect(block).toMatch(/warnLog\("\[Vision\] Recovered partial text:", partial\.length \+ ' chars'\)/);
    expect(block).not.toMatch(/partial\.substring\(0, 100\)/);
    expect(gemMod).not.toMatch(/Recovered partial text:", partial\.substring/);   // survives the build
  });
});

describe('H-4: reading-order WARN is wired into the high-volume AI fix path (was magnitude-only)', () => {
  it('acceptFixedHtmlDetailed computes the order check and returns readingOrderWarn (non-blocking)', () => {
    const fn = dp.slice(dp.indexOf('const acceptFixedHtmlDetailed = (fixed, original, opts) => {'), dp.indexOf('const acceptFixedHtml = (fixed, original, opts) =>'));
    expect(fn).toMatch(/checkReadingOrderPreserved\(original, fixed\)/);
    expect(fn).toMatch(/readingOrderWarn: _roWarn/);
    // it must NOT flip `accepted` to false on a reorder (WARN-only this increment)
    expect(fn).not.toMatch(/accepted: false, reason: 'reading-order'/);
  });
  it('acceptFixedHtml surfaces the warn, and aiFixChunked checks the assembled doc vs the source', () => {
    expect(dp).toMatch(/if \(r && r\.accepted && r\.readingOrderWarn\)/);
    expect(dp).toMatch(/checkReadingOrderPreserved\(html, _joined\)/);   // aiFixChunked whole-doc order check
    expect(dp).toMatch(/const _out = _restoreImages\(_joined\)/);        // assembly is image-restored (then fabrication-WARNed, then returned)
  });
});

describe('H-4 behavior: a block reorder that preserves char/word totals raises readingOrderWarn', () => {
  // Extract acceptFixedHtmlDetailed with injected deps + the REAL checkReadingOrderPreserved, so we exercise
  // the actual wiring: magnitude checks pass (identical totals) yet the reorder is caught and surfaced.
  const guardSrc = dp.slice(dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {'), dp.indexOf('\n}', dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {')) + 2);
  const fnSrc = dp.slice(dp.indexOf('const acceptFixedHtmlDetailed = (fixed, original, opts) => {'), dp.indexOf('\n  };', dp.indexOf('const acceptFixedHtmlDetailed = (fixed, original, opts) => {')) + 4);
  const make = () => new Function('textCharCount', 'detectFabrication', 'warnLog',
    guardSrc + '\n' + fnSrc + '\nreturn acceptFixedHtmlDetailed;'
  )((s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, '').length, () => ({ suspected: false }), () => {});
  const accept = make();
  const original = '<body><h2>Alpha section heading</h2><p>first paragraph of content here</p><h2>Beta section heading</h2><p>second paragraph of content here</p></body>';
  const reordered = '<body><h2>Beta section heading</h2><p>second paragraph of content here</p><h2>Alpha section heading</h2><p>first paragraph of content here</p></body>';

  it('accepts the reorder on magnitude (identical totals) but attaches readingOrderWarn', () => {
    const r = accept(reordered, original, {});
    expect(r.accepted).toBe(true);                 // magnitude is identical → not blocked
    expect(r.readingOrderWarn).toBeTruthy();        // …but the reorder is surfaced
    expect(typeof r.readingOrderWarn.droppedToken === 'string' || r.readingOrderWarn.droppedToken === null).toBe(true);
  });
  it('no warn when content + order are unchanged', () => {
    const r = accept(original, original, {});
    expect(r.accepted).toBe(true);
    expect(r.readingOrderWarn).toBeNull();
  });
});

describe('H-9: _reauditAndScore drops a stale write (score must describe the bytes in state)', () => {
  it('the terminal setPdfFixResult bails when the audited html is no longer current', () => {
    const fn = view.slice(view.indexOf('const _reauditAndScore = async'), view.indexOf('const _spliceBlock = '));
    expect(fn).toContain('const _curFix = pdfFixResultRef.current;');
    expect(fn).toContain('const _applied = !!(_reauditIsCurrent() && _curFix && _curFix.accessibleHtml === newHtml);');
    expect(fn).toContain('setPdfFixResult(prev => (prev && prev.accessibleHtml === newHtml) ? _bound : prev);'); // pure CAS stale guard
    expect(fn).toMatch(/stale: !_applied/);                                     // reported to callers
  });
});

describe('Canvas-test fixes (2026-06-23): conformance overclaim, re-scan save, resolution affirmative', () => {
  it('the green "Conformant (veraPDF verified)" header requires a CURRENT tagged PDF (hasChecks)', () => {
    // was: a stale compliant veraPDF result upgraded "Awaiting Tagged PDF" → green "Conformant", next to
    // "No tagged PDF available · 0 rules checked" (a false conformance claim).
    const block = dp.slice(dp.indexOf("conformanceLabel === 'Conformant'"), dp.indexOf("// Reliability block"));
    expect(block).toMatch(/_vera && _vera\.compliant === true && hasChecks &&/);
    expect(block).toMatch(/conformanceLabel = 'Conformant \(veraPDF · ISO 14289-1 verified\)'/);
  });
  it('the veraPDF section shows a STALE note (not "PASSES") when there is no current tagged PDF', () => {
    const veraBlock = dp.slice(dp.indexOf('const _veraBlock = (() =>'), dp.indexOf('// Issue resolution block'));
    expect(veraBlock).toMatch(/if \(!hasChecks\) \{/);
    expect(veraBlock).toMatch(/no current tagged PDF to validate/);
    // the "✓ PASSES PDF/UA-1" label must come AFTER the !hasChecks guard (so it can't show without a tagged PDF)
    expect(veraBlock.indexOf('if (!hasChecks)')).toBeLessThan(veraBlock.indexOf('PASSES PDF/UA-1'));
  });
  it('Re-scan with OCR confirms + offers to save the project before wiping the result', () => {
    const fn = view.slice(view.indexOf('const _reRun = async (force) => {'), view.indexOf('const _reRun = async (force) => {') + 2200);
    expect(fn).toMatch(/REPLACES your current results/);                 // the warning
    expect(fn).toMatch(/saveProjectToFile\(false\)/);                    // saves if the user opts in
    expect(fn).toMatch(/pdf_audit\.rescan_save_first/);
    expect(fn).toMatch(/await askPdfConfirmation/);
    expect(fn).toMatch(/alternativeLabel:[^\n]*rescan_without_save/);
    // the safe-default alert dialog must gate the destructive fixAndVerifyPdf (return on cancel)
    expect(fn).toMatch(/if \(!_rescanDecision\) return;/);
    expect(fn).not.toContain('window.confirm(');
  });
  it('the issue-resolution subheading is state-aware (no-remaining affirmative + new-issues honesty)', () => {
    expect(view).toMatch(/pdf_audit\.resolution\.all_clean/);            // "All N resolved — none remaining"
    expect(view).toMatch(/pdf_audit\.resolution\.all_resolved_new/);     // "All resolved · M new introduced"
    expect(view).toMatch(/s\.persistedCount === 0 && s\.introducedCount === 0/);
  });
});

describe('Auto-fix loop: a PARTIAL audit does not count as "target met" (do not stop early on incomplete coverage)', () => {
  it('the loop entry gate keeps going when the audit was partial (mirrors the per-pass !_rePartial break)', () => {
    expect(dp).toMatch(/const _auditPartial = !!\(verification && verification\._partialAudit\);/);
    // Carry incomplete AI coverage and unresolved manual-review evidence through
    // both halves; neither may masquerade as "target met".
    expect(dp).toMatch(/if \(maxFixPasses > 0 && \(_totalIssues > 0 \|\| _auditPartial \|\| _auditReviewRequired\) && \(bestAxeViolations > 0 \|\| bestAiScore < _targetScore \|\| _auditPartial \|\| _auditReviewRequired\)\)/);
  });
});

describe('Reliability honesty (2026-06-23): no "excellent agreement" on degenerate all-0 / single-pass scores', () => {
  it('the triangulator flags degenerate agreement and downgrades the classification', () => {
    // all passes pinned at the deduction floor (0,0,0,0,0) → SD 0 → icc 1 would have read "excellent"
    expect(dp).toMatch(/const _reliabilityDegenerate = n < 2 \|\| scores\.every\(s => s === 0\)/);
    expect(dp).toMatch(/reliability: _reliabilityDegenerate \? 'n\/a' :/);
    expect(dp).toMatch(/reliabilityDegenerate: _reliabilityDegenerate/);
  });
  it('both report blocks show n/a + a note for the degenerate case (not a number next to "n/a")', () => {
    expect(dp).toMatch(/\$\{ar\.reliabilityDegenerate \? 'n\/a' : \(ar\.icc \?\? 'n\/a'\)\}/);   // Score Stability section
    expect(dp).toMatch(/\$\{audit\.reliabilityDegenerate \? 'N\/A' : \(audit\.icc \?\? 'N\/A'\)\}/); // meta-card report
    // Floored-unanimous copy (2026-07-05, maintainer): a real 0 on an image-only scan is a unanimous
    // deduction-grounded verdict, NOT a degraded measurement — the note must not discredit the score
    // (the old "not meaningful … re-run without throttling" framing did). Only the variance-based
    // index is undefined at the boundary; the copy says exactly that.
    expect(dp).toMatch(/unanimous verdict<\/strong> on the document's pre-remediation accessibility, not a scoring artifact/);
    expect(dp).toMatch(/Only one scoring pass returned, so there is no cross-pass comparison to report/);
    expect(dp).not.toMatch(/Re-run \(ideally without throttling\) for a non-degraded comparison/);
  });
  it('the live UI verdict no longer says "Excellent agreement" when scores are degenerate', () => {
    expect(view).toMatch(/pdfAuditResult\.reliabilityDegenerate\s*\n?\s*\?\s*\(pdfAuditResult\.auditorCount < 2/);
    expect(view).toMatch(/Unanimous at the floor/);
    // the icc value renders n/a (not the misleading 1) when degenerate
    expect(view).toMatch(/pdfAuditResult\.reliabilityDegenerate \? 'n\/a' : pdfAuditResult\.icc/);
  });
});

describe('H-8: Load Project resets per-document holdovers (no cross-document state bleed)', () => {
  it('the results-screen loader clears the palette snapshot ref + the other per-doc state before continuing', () => {
    const _s = view.indexOf('// H-8 (audit 2026-06-23): the component never remounts on Load Project');
    // Harness repair (2026-07-09): M12 added the PDF/UA badge clears inside the block — widened.
    const h = view.slice(_s, _s + 2600);
    expect(h).toMatch(/_paletteSnapshotRef\.current = null;/);   // the dangerous one — stale snapshot drove the doc-A-over-doc-B Revert
    // Clearing through the selector is stronger than mutating the bytes ref directly:
    // it also advances the artifact/validator generations so in-flight work cannot commit.
    expect(h).toMatch(/_selectTaggedArtifact\(null\);/);
    expect(h).toMatch(/setAppliedPalette\(null\);/);
    expect(h).toMatch(/_setIssueEdit\(\{\}\);/);
    expect(h).toMatch(/setRestyleProposals\(null\);/);
    expect(h).toMatch(/setTagOutline\(null\);/);
  });
});
