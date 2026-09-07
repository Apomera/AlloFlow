# Core document-remediation review — 2026-09-07

Read-only review of the current `doc_pipeline_source.jsx`. No application edits. Findings below come from current-source execution with a mocked AI adapter and synthetic text; they are acceptance/reconciliation reproductions, not claims that a live provider returned these exact responses. Source SHA-256 is captured in each JSON result.

## What is working well

The implementation already has several substantive protections: selected-page filtering, source and output normalization, per-engine OCR errors, image-data deferral, numeric-loss checks, source-reading-order warnings, table-position checks in the strict acceptance helper, fail-soft original-content fallback, deterministic semantic repairs, and re-verification after initial image recovery. The remaining issues are mainly inconsistencies between alternate paths and assumptions made before the canonical source text is established.

## Confirmed findings

### 1. [P1] Long-document AI fixes bypass the strict content acceptance gate

**Locations:** `doc_pipeline_source.jsx:10715` (single chunk), `:10801` (normal multi-chunk return), `:10822` (half-chunk return), `:9989` (strict table-position gate), `:10915` (warning only).

Short documents call `acceptFixedHtml`, which checks unexpected growth and rejects moved table values. Multi-chunk outputs instead pass independent 90% HTML-length and 95% text-length floors. The table-position check and growth ceilings are absent. Therefore a longer document has weaker content protection than the same material in a short document.

**Reproduction:** `source-probe.cjs`, cases `short-document-score-swap` and `multi-chunk-score-swap`. A table swaps Vocabulary 95 and Block Design 102. The 1,301-character document is correctly kept original. The same table in a 39,871-character document is accepted across three chunks; text retention is 100%, but the two values move rows. The multi-chunk path logs a reading-order warning but keeps the corruption. The final source-order warning only triggers below an 80% sequence ratio (`:30211`), so it does not substitute for cell identity protection.

**Fix direction:** a single acceptance policy supporting full documents and fragments, used by normal, retry, half-chunk, and follow-up paths. Compare table-cell identities and numeric values, growth, source assets, and required semantic structures. A rejection should retain the exact input fragment and publish persistent evidence explaining the fallback.

### 2. [P1] A two-page Vision response can discard a page recovered by Tesseract

**Locations:** `doc_pipeline_source.jsx:26862`–`:26870`, `:15644`–`:15647`, `:27118`.

For a one- or two-page scan, Vision returns a single pseudo-page with no independently validated page boundary. Reconciliation assumes that if that pseudo-page wins page 1, its text covers the entire range and replaces `fullText` with the Vision blob. A Tesseract-only page remains in `rec.pages` but disappears from the canonical source text used for remediation and fidelity checks.

**Reproduction:** `ocr-probe.cjs`, `two-page-vision-omits-second-page`. Tesseract returns both pages, including “Second page essential instruction: complete experiment B.” Vision returns a longer page 1 only. Reconciliation chooses Vision for page 1 and Tesseract for page 2, yet `fullText` omits the second page entirely. Its disagreement list flags page 1's length difference, not the discarded recovered page; low-confidence is empty.

**Fix direction:** explicit `pageStart/pageEnd` and page-boundary provenance. Require per-page Vision outputs even for two pages, or keep unresolved chunk text separate until it can be aligned against the page-level engine. Never exclude a recovered page from canonical text solely because the other engine returned one record.

### 3. [P1] Image-preservation checks count placeholders without checking identity, and omit restored data-image tokens

**Locations:** `doc_pipeline_source.jsx:10645`–`:10660`, `:10708`–`:10710`, `:10772`–`:10774`, `:10822`.

The FINAL guard compares the number of placeholder occurrences. Replacing image 2 with a second copy of image 1 preserves the count and passes. More commonly on follow-up fixes, actual data URLs are converted to `__IMG_DATA_N__`; these tokens are restored only if they survive, but no identity/count gate checks them. The half-chunk acceptance path checks neither token family.

**Reproduction:** `source-probe.cjs`, `equal-count-image-identity-replacement` accepts the duplicate image-1 token and loses image 2; `restored-data-image-token-replacement` accepts replacing `__IMG_DATA_1__` with an unrelated source string and returns no original data URL, with 100% text retention and no content warning.

**Mitigation already present:** initial `fixAndVerifyPdf` has an outer FINAL-token recovery at `:30441`–`:30514`; a missing image can be appended to a disclosed recovery section. This reduces complete loss in that initial lane, but does not repair wrong inline associations or provide the same protection to restored data URLs in later `aiFixChunked` calls.

**Fix direction:** immutable asset IDs plus exact multiset and placement checks before every candidate is accepted. Restore bytes from an asset map independent of provider-authored `src` values. Prefer retaining the original inline figure to appending it elsewhere.

### 4. [P2] The image-retry path can accept an almost-empty fragment

**Location:** `doc_pipeline_source.jsx:10788`–`:10790`; aggregate fallback at `:10896`–`:10902`.

When the first response drops a FINAL image token, the retry is accepted if it has 90% of the original HTML bytes and enough placeholder occurrences. No text floor is applied before the immediate return. Markup or attributes can satisfy byte size while source prose disappears. The aggregate 85% floor only rejects large whole-document losses.

**Reproduction:** `source-probe.cjs`, `image-retry-bypasses-text-floor`. A nine-chunk, 132,361-character document receives an image retry containing the image plus attribute padding but no first-chunk prose. The result is accepted with text ratio 0.883332: 11.7% of source text is lost. A seven-chunk control was rejected at 84.4%, demonstrating the aggregate boundary rather than a missing test harness dependency.

**Fix direction:** apply the shared content gate to image retries before accepting them. Keep the original fragment if a retry only recovers the image. The aggregate floor is a backstop, not a replacement for per-fragment preservation.

### 5. [P2] Equal-character Vision page splitting creates false page identity

**Location:** `doc_pipeline_source.jsx:27026`–`:27030`, consumed by `:15506`–`:15515`.

When Vision omits the `[[PAGE BREAK]]` sentinel, extraction splits a two-page chunk into equal-sized character slices and labels them as physical pages. Page-wise winner selection then compares texts from different source regions. If page 1 is long and page 2 short, the “page 2” Vision slice includes much of page 1 and wins against the actual short page 2.

**Reproduction:** `ocr-probe.cjs`, `equal-character-fallback-with-uneven-pages`. Complete source text totals 1,044 characters. Equal-character fallback followed by the real reconciler yields 1,521 characters, duplicating 477 characters while both page texts were available. Disagreement warnings exist, but the canonical ground truth is already inflated.

**Fix direction:** an unsegmented chunk must remain unsegmented. Reissue that chunk per physical page or align it against Tesseract page text with an explicit confidence threshold; do not assign absolute page numbers to equal-character slices.

### 6. [P2] Material OCR disagreements are invisible when lengths match

**Locations:** `doc_pipeline_source.jsx:15510`–`:15513`, `:15625`–`:15627`.

OCR reconciliation chooses the longer text (Tesseract on ties), while `disagreements` only compares character-count differences. Equal-length changes to scores, dates, signs, names, or negation are not flagged. OCR plausibility/confidence is not an agreement check.

**Reproduction:** `ocr-probe.cjs`, `equal-length-score-conflict`. Tesseract “Vocabulary 95. Block Design 102.” versus Vision “Vocabulary 96. Block Design 103.” returns the former with `disagreements: []` and `lowConfidence: []`.

**Fix direction:** compare aligned token sequences and typed values, prioritizing numeric/date/unit/negation differences. Keep both readings with physical-page and bounding-box provenance for focused review. Do not treat either engine's chosen answer as independently verified source truth.

## Suggested pipeline improvements

1. Introduce a small canonical document model with stable page/block/cell/asset IDs, coordinates, extraction source, and confidence. Render HTML, DOCX, EPUB, and PDF tags from that model rather than repeatedly asking AI to rewrite whole HTML fragments.
2. Route AI to bounded semantic edits: heading role, table-header association, image description, contrast fix. Require exact identity preservation for facts, equations, links, controls, and visual assets.
3. Preserve source extraction evidence separately from the selected canonical text. Validate page completeness before setting ground truth, and expose OCR disagreement as review work with the smallest affected region.
4. Persist acceptance warnings and rejected-candidate reasons in the result/checkpoint, not only the diagnostic log. Run the same gate after all fix, retry, plain-language, translation, and restoration paths, with explicit policy differences where wording is allowed to change.
5. Replace mirrored threshold/source-string assertions with cross-path behavioral contracts. The existing `aifix_chunk_gates.test.js` pins weak 90%/95% gates, and `ocr_reconcile_pseudopage.test.js` mirrors the assumption that a single Vision record represents every page. Add the current reproductions to the normal regression corpus after fixing them.

## Evidence

- `source-probe.cjs` and `source-probe-results.json`: five actual-source mocked-AI cases, production 16,000-character chunk limit and jsdom DOM APIs.
- `ocr-probe.cjs` and `ocr-probe-results.json`: three actual-source OCR reconciliation cases.
- All eight probes execute without live provider calls or application mutations. These are deterministic vulnerability/correctness demonstrations; their frequency in real workloads requires corpus measurements.