# Document remediation pipeline review

Reviewed September 8, 2026 local time; evidence timestamps are September 9 UTC. Review only: application source was not changed.

The pipeline has substantial protections, and the recent work closes the earlier chunk/transposition, OCR page identity, stale-resume-response, independent-PDF-status, and review-navigation findings. The next priority is preserving meaning and associations through accepted fixes, and retaining the evidence when a fix is questionable.

This pass inspected the current shared acceptance/fix path, its fidelity backstops, source-link recovery, review evidence, and the recent export/runtime reports. It executed focused current-source tests and synthetic probes. It did not rerun every pipeline branch, desktop/remote runtime, or complete browser/export suite; earlier reports are historical context, not new validation.

## Findings, in recommended repair order

### 1. P1 — Preserve warnings from accepted candidates

`acceptFixedHtmlDetailed` returns `fabrication` and `readingOrderWarn` alongside `accepted: true`. `_checkCandidate` only records rejections; the single-chunk branch then checks `.accepted` and returns immediately. Consequently, a source reading “The study enrolled participants” can acquire “8742 participants”: the helper detects the invented number, but `aiFixChunked` returns the changed HTML and pass evidence contains no warning. A substituted value and a changed single-digit instruction likewise lose their helper warning through this interface.

The multi-chunk assembly has a separate fabrication log/toast, but these warnings are absent from its structured pass evidence as well. Existing final numeric checks are useful mitigation for removed/replaced multi-digit numbers; they do not flag arbitrary new numbers. Later semantic auditing may notice a change, but it should not have to rediscover known evidence.

**Refinement:** add bounded accepted-candidate warning records to the shared callback/result contract. Persist them through follow-up fixes, project saves, resume, and reports, with the originating revision and affected section. Treat unresolved content changes as fidelity review evidence. Keep acknowledgment separate from resolution. Exercise the same case as a short document and a multi-chunk document.

Locations: [candidate evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10775), [early return](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10828), [assembly warning](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:11040), [final numeric backstop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:30329).

### 2. P1 — Protect table contents and instructional values beyond transposition

The table detector only compares positions when both versions have the same table count and the same cell-value multiset. Changed values, changed cell counts, and missing tables bypass that positional check. Probes returned a table with **95 changed to 96**, and another candidate that replaced the table with div/span elements while retaining its text. The existing true transposition control was correctly rejected.

A separate probe changed **“Complete 3 trials” to “Complete 8 trials.”** The reading-order helper warned, but both fabrication and final numeric-token checks intentionally omit single digits. The final structural net can warn about removed tables when the source includes recognizable Markdown tables; that is a conditional downstream warning, not a source-table preservation contract.

**Refinement:** validate table/cell identity, values, row/column spans, and required relationships, with explicit allowances for header promotion and approved merges. Preserve numbers in instructional text, including single digits, signs, and units; exclude list markers using structure rather than discarding all single-digit values. Retain the original affected fragment when a strict remediation changes a source fact without approval.

Locations: [table comparison skips](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:6439), [single-digit omission](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:1495), [structural backstop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:5263).

### 3. P1 — Bind each hyperlink to its original destination

A candidate changed an existing anchor from `/alpha` to `/bravo`, retaining its visible text and all text/byte counts. The shared acceptance helper returned no warning and the fix stage returned the candidate. Image references are protected, but anchor destinations are not. Fabrication detection strips tags before finding URLs, so it cannot see this href-only change. Source-link recovery skips existing anchors, and the final structural net compares link counts rather than destinations.

**Refinement:** retain a source link map with stable anchor/block identity and normalized destination, including internal fragments and email links. Compare the association after every fix and restore or reject unauthorized destination changes. Permit descriptive anchor-text improvements without changing their destination. The recent PDF link acceptance checks remain useful, but cannot replace this contract in the HTML fix path.

Locations: [reference comparison](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10056), [tag stripping](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:9971), [source-link recovery](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:2187), [link count backstop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:5268).

### 4. P2 — Preserve an image's relationship to its surrounding content

The image contract checks token identities and ordered source attributes. It does not bind an image to its figure, caption, section, or neighboring instructional block. A probe moved the same image from the Sunlight section to the Shade section, preserving image order and all prose. The candidate was returned without a helper warning. This can change the meaning of an illustration even when no asset bytes disappear.

**Refinement:** introduce source-side figure/block associations, starting with a bounded map of images, captions, and section anchors. Compare those associations during acceptance. Permit explicit figure relocation only with supporting source/layout evidence. The existing review reference index is created from the current document and serves navigation; it should not be treated as proof of original placement.

Location: [image identity extraction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10056). Existing review contract: [document references](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/document-remediation-review.md).

### 5. P2 — Avoid rejecting useful accessibility markup solely on relative byte growth

The HTML size ceiling is evaluated before semantic checks. On a short image-only document, adding a 148-character alt description produced a 2.33x byte ratio, so the helper rejected it as `size-growth-unexpected` and the fix returned the original empty alt. The fixture tests the acceptance mechanics, not whether that particular description matches real image pixels.

**Refinement:** separate source-content budgets from accessibility metadata/markup budgets. Allow bounded alt, label, scope, and language additions when source facts and asset identities remain intact. Keep absolute limits and active-content checks. Include small documents in regression coverage so proportional guards do not repeatedly defeat legitimate repairs.

Location: [size ceiling](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10031).

## Further enhancement opportunities

- **Complete independent calibration and assistive-technology acceptance.** The current [human corpus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/fixtures/pdf_calibration/manifest.json:1) is empty. Use the existing artifact-bound ingestion and manual acceptance protocol to collect expert source/output comparisons and actual screen-reader observations. Expand coverage to scans, figures, math, multilingual text, complex tables, and real PDF forms. Do not use synthetic policy cases as human-quality evidence.
- **Measure realistic throughput before tuning concurrency.** The benchmark tools already capture useful identities and trial evidence. Use representative approved documents to establish phase durations, calls/retries per page, rejection rates, review burden, peak memory, and actual provider/fallback identity. Existing scripted trials do not establish production latency, cost, or live-model quality.
- **Build one cross-path preservation corpus.** Run these negative controls through short/chunked, first/follow-up, browser/MCP, and export paths, with positive controls for header promotion, whitespace normalization, and descriptive labels. Assert content associations and persistent evidence, not only scores or exact source strings. The current tests passing alongside these accepted bad candidates demonstrates the coverage gap.
- **Extend the existing reference model incrementally.** Bind source page/block/cell/link/figure IDs before model edits, preserving provenance into the current navigation index. This supports precise review and later reuse of unchanged verified regions without requiring an immediate rewrite of the whole pipeline.

## Evidence and limits

- **125 tests passed in 8 files; 0 failed.** [Focused results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/document-remediation-review-2026-09-09/focused-tests.json).
- **9 local probes:** six undesirable candidates accepted by the fix stage; one bounded accessibility addition rejected; legitimate header promotion accepted; true score transposition rejected. [Probe results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/document-remediation-review-2026-09-09/probe-results.json).
- Probes execute current functions extracted by the existing source-backed harness, using jsdom with DOMParser/NodeFilter and controlled model substitutions. They demonstrate reachable helper/fix-stage behavior, not production incidence, guaranteed final readiness, or a full end-to-end export failure. [Reproduction script](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/document-remediation-review-2026-09-09/probe.cjs).
- Source SHA-256: `7261335b96fd8da8b629b149c8dfafdf016083cd74144fbdcbda91833e1fdcd3`.
- No live model calls, private-document uploads, deployments, commits, or application fixes were performed. Screen-reader usability, full conformance, and production performance were not established by this review.
