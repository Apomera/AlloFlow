# Gap-lane pilots on the keyless agent bridge (2026-09-13)

Follow-up to the [scanner walk](../mcp-scanner-walk-2026-09-13/README.md) and the [12 September calibration rounds](../mcp-calibration-2026-09-12/README.md). The round-2 report named four lanes no live run had touched: image-only OCR, native form semantics, a full right-to-left document, and safe PDF export with independent PDF/UA validation. This directory holds keyless agent-bridge runs on those lanes, driven from a Claude Code session with the assistant answering every pipeline model call over the connector's HTTP transport (`bridge.cjs`, `show.cjs`, `replay.cjs`, `fix_fragments3.cjs`, `f1040_drive.cjs`; every request, reply, page render and result is under each run's `bridge-evidence/`). No Gemini key was configured; `remediation_capabilities` reported `geminiKeyPresent: false` throughout.

These are engineering calibration runs: real pipeline, real Chromium, real client model, no scripted replies. They are not human calibration, not screen-reader acceptance, and not an effectiveness claim. Scores are the pipeline's own honesty-gated numbers.

## Runs

| Lane | Source | Run | Before → after | Verdict | Calls | Tagged PDF |
| --- | --- | --- | ---: | --- | ---: | --- |
| Image-only scan | `scanned/irs-f1040-1954-scan.pdf` (4 pages, no text layer) | `arun-96487fa0…` | 0 → 65 | review | 30 | withheld: `content_coverage_requires_review` (recall 0.822) |
| RTL, junk text layer | `born-digital/ohchr-udhr-hebrew.pdf` (4 pages, fonts without ToUnicode) | `arun-fe680c0b…` | 0 → 96 | review | 20 | withheld: `content_coverage_requires_review` (recall 0.993, 9 tokens) |
| Image-only scan, replay after fixes 1–4 | same scan | `arun-0084bf67…` | 0 → 65 | review | 30 | withheld: `content_coverage_requires_review` (recall 0.891) |
| Native form | `forms/irs-f1040.pdf` (2 pages, 199 fields, XFA, JavaScript) | `arun-bcdd26fc…` | 63 → 94 | review | 23 | withheld: `active_content_scan_unavailable` (XFA stays unexamined by design) |
| Tables (page range) | `tables/nces-condition-of-education.pdf`, pages 19–23 of 54 | `arun-f0272a52…`, `arun-cce6811e…` | cancelled | | 14+ | see finding 6 |
| Tables (page range), rerun after the slice fix | same document and range | `arun-d3ae8f73…` | 74 → 76 | review | 50 | withheld: `content_coverage_requires_review` (recall 0.972: running headers/footers and chart axis labels) |

All three completed documents passed or were correctly withheld by the Document Safety scan (the scanner walk is what let the scan and the Hebrew file through at all). None reached veraPDF: content coverage or the XFA form withheld the tagged PDF first. The Hebrew HTML was rendered in Chromium at 1000 px and 390 px (`hebrew-udhr/rendered-*.png`, `rendered-facts.json`): `lang="he" dir="rtl"`, list markers on the right, one h1 inside a header landmark, 30 article h2s, no horizontal overflow, no page errors.

The Form 1040 run is the first one where the fix loop kept the client's fixes: pass 1 applied a header landmark and 80 row headers across six tables, the AI re-verify ran, and the loop stopped at its target with the deterministic layer governing the headline (axe 100, Equal Access 94). The pipeline disclosed that the 199 fillable fields became read-only text and that the source carries three JavaScript actions.

## Defects found and fixed

1. **OCR reconciliation punished faithful form transcription** (commit b77f0376b). The scan's Vision transcript rendered fill-in blanks as `________` and tables as markdown; `reconcileOcrPages` counted those as garble (junk 0.325 / 0.226 / 0.211 on pages 2–4 against Tesseract's 0.139 / 0.121 / 0.103) and its "clearly worse" override handed three of four pages to Tesseract's garbled text ("Schedulo B", "Past L.—Genoral Rule"). That text became the coverage baseline: recall 0.822, 523 "missing" tokens, and an integrity warning about numbers that exist only in the garble. The junk ratio now strips blank runs, table pipes and divider rows, heading hashes and list bullets before measuring; dot leaders and stray symbols still count. The replay (`scan-1954-replay/`) confirms it: the proofread text carried all four Vision pages and none of the Tesseract markers, recall 0.822 → 0.891. The remaining 332 tokens are the assistant's own doing: the structured blocks prefixed line items with "Item N." and reworded table headers relative to its OCR transcript, and the coverage check is right to flag that. `tests/ocr_reconcile_markup_junk.test.js`.
2. **Parenthesized clause numbers were not credited** (b77f0376b). The `<ol>` marker credit accepted `1.` and `1)` but not `(1)`; the Hebrew run's nine missing tokens were exactly its `(1)`–`(3)` clause numerals. Credited now; regression cases in `tests/semantic_list_marker_coverage.test.js`. Replaying the check on the unchanged Hebrew artifact: 9 missing → 2, and the remaining two are a real mismatch (article 16's clauses start at `(2)`, rendered as a default-numbered list).
3. **An unbundled Tesseract language cost eight minutes per document** (b77f0376b). Only `eng.traineddata.gz` ships; the Hebrew run waited out a 120 s worker timeout on each of four pages before recognising Hebrew with the English model. The driver now publishes the bundled language list and rejects an unbundled language before a worker is spawned. `tests/mcp_tesseract_bundled_languages.test.js`.
4. **The failure text behind "throttle-deferred" was invisible** (b77f0376b). The driver forwarded only `[aiFixChunked:*] rejected` lines; every `[aiFixChunked:*]` line is forwarded now. The replay then showed there was no chunk failure at all, which led to finding 5.
5. **The auto-fix loop discarded a pass whenever one chunk came back unchanged** (commits ede873969, ced2db2b6). Since 2c081aefb (2026-08-16) the loop read `shippedOriginalChunks > 0` as evidence of a provider storm: it skipped the AI re-verify, and because the pass-evidence helper also demanded `shippedOriginalChunks === 0` the pass could never be promoted, so "Shipping best verified version" fell back to the pre-pass snapshot. In both scan runs the last fragment of the form had nothing to change, both passes were marked throttle-deferred with no failure, and the header landmark and row headers supplied for the other fragments never reached the output (the final HTML has no `<header>` and no `scope="row"`). This affected the Gemini lane too: a pass could only be promoted when every chunk changed. `aiFixChunked` now reports `deferredChunks` (throttle deferrals) beside `shippedOriginalChunks`; `_alloAutoFixPassHasCompleteEvidence` and `_fixPassSawThrottle` key on the deferral count; an unchanged-chunk count is logged as informational. `tests/remediation_evidence_invariants_20260723.test.js` carries the corrected semantics. The Form 1040 run above is the first run on the corrected loop.

Also fixed earlier today from the same session: `extract_document_text` says when a text layer is missing or unusable (c3c4d5e2d), and the Document Safety scanner examines bookmarks, forms and open actions and walks long structure trees (bab6ecf36, 2c27a16df).

## Finding 6, fixed the same evening: image-mode vision calls ignored the audit's page slices

6. (Fixed later on 2026-09-13; the rerun is in the last section of this file.) For a large document the initial audit splits the PDF into page slices and sends each slice as its own vision call (`[PDF Audit] Large document (~2077KB) — auditing in page slices … merged 14/14 slices for a 54-page document`). On the agent-bridge lane the driver runs vision in image mode: it replaces the attached PDF bytes with the pre-rendered page images of the run, and it does so for every call. All fourteen slice prompts in the NCES run therefore carried the same five images ("Attached images correspond, in order, to source PDF pages: 19, 20, 21, 22, 23"), the pipeline merged fourteen audits of the same five pages, and a `page_range` of 19–23 did not stop the pipeline from slicing all 54 pages. Fourteen model calls were spent where three were needed, and every slice's "audit" described pages it never saw. The run was cancelled once the mechanism was clear. The fix belongs in `remediation_headless_driver.cjs` `__mcpGeminiVision`: when the incoming bytes are a slice of the source rather than the whole document, rasterise that slice (or pick the pre-rendered pages it covers) instead of attaching the run's page images; the audit should also honour `page_range` when it decides to slice. Evidence: `nces-tables/bridge-evidence/` and the verbose server log excerpt in `nces-tables/audit-slicing.txt`.

## Other observations

- **Tesseract is English-only offline.** Non-Latin scans rely entirely on Vision OCR; bundling more `traineddata` files is a size decision.
- **The banner's accent border stays on the left in RTL output** (`border-left` on the banner div); cosmetic.
- **Scan reconciliation provenance is not in the report.** The remediation report records `contentCoverage.extraction.method` but not which engine won each page or its junk ratio, so a coverage refusal caused by a bad reconciliation cannot be diagnosed from the report alone.
- **Form fields remain disclosed, not repaired.** The Form 1040 output is read-only text with the source checkboxes rendered as box characters; the pipeline's `formFields` fidelity note says so.
- **Client discipline matters for coverage.** The structured-blocks step must keep the OCR transcript's wording; paraphrasing headings or prefixing line numbers is reported as missing tokens, as it should be.

## Corpus additions

`mcp-testing/corpus/MANIFEST.json` now lists three OHCHR UDHR translations for right-to-left work (`ohchr-udhr-persian.pdf`, 12 pages, image pages; `ohchr-udhr-hebrew.pdf`, 4 pages, junk text layer; `ohchr-udhr-urdu.pdf`, 7 pages, image-only). The Arabic translation URL (`arz.pdf`) returned an empty body. Corpus PDFs are local and untracked, as before.

## Installer

`desktop/dist/mcpb/alloflow-remediation.mcpb` was rebuilt at the end of the session so that the bundle carries fixes 1–5; the size and SHA-256 are in `installer.txt` beside this file. Nothing was published, pushed or sent to anyone.

## Rerun after the slice fix: tables lane, pages 19–23 (2026-09-13 evening)

Finding 6 was fixed the same day (pipeline `_auditSliceRangeBounds` bounds the audit slices to `page_range`; driver `selectVisionParts` attaches only the rendered pages a slice prompt names) and the cancelled tables run was repeated on the keyless agent bridge with the same document and range. Evidence: `nces-tables/rerun-after-slice-fix/` (bridge request and reply files, the six audit-section extracts, page renders, the output HTML and report, the connector log with an excerpt, and the client tools used to answer).

| Item | Before the fix (`arun-cce6811e…`) | After the fix (`arun-d3ae8f73…`) |
| --- | ---: | ---: |
| Audit slices for pages 19–23 of 54 | 14 (the whole document) | 2 (`19–22`, `23`) |
| Images per slice call | 5, identical on every call | 4 and 1, disjoint |
| Model calls before cancellation / completion | 15 (cancelled) | 50 (completed) |
| Log | `merged 14/14 slices` | `page range 19-23 of 54 bounds the slices`, `vision slice pages 23-23: attached 1 rendered page(s)`, `vision slice pages 19-22: attached 4 rendered page(s)`, `merged 2/2 slices` |

**Result:** 74 → 76, verdict review, 50 calls (42 text, 6 vision, 2 alt checks), pipeline 1,883 s, wall clock 2,021 s. The AI layer finished at 95, axe at 100, IBM Equal Access at 76, and the headline is the weakest layer. The tagged PDF was withheld as `content_coverage_requires_review` (token recall 0.972; the 73 missing tokens are the running headers and footers, which the client omitted deliberately, and the chart axis labels, which only exist inside the figures). The `VALUE-FIDELITY` note lists 16 numbers for the same reason (axis ticks `100, 90, 80…` and the footer year). Both are the pipeline being right about a chart-heavy range, not a defect.

**What the client did.** The two slice audits were answered from the rendered pages (both 95: born-digital, tagged, descriptive links, tagged lists; one moderate non-text contrast finding for the pale mint chart series). The structured extraction reproduced all five pages as 53 blocks with the four charts as described images. HTML audits were answered from measurements (`tools/html_facts.cjs` extracts each section, computes heading order, landmarks, alt, tables, links, lists, controls and inline-style contrast; `tools/compose_audit.cjs` turns the facts into the reply). Fix passes were answered with `tools/fix_nces.cjs`, an idempotent string fixer.

**Pipeline observations from this run (new).** All six were closed in `0309732e9` later the same
evening, after this section was written; verified again 2026-09-21 against
`doc_pipeline_source.jsx`. They are kept here as the record of what the run found, not as open
work. Per item: (1) the injected toolbar now satisfies Label in Name — `Pick extracted` /
"Pick extracted image from this document", `Generate (AI)` / "Generate (AI) illustration from the
description"; (2) the teal control is `#0f766e` (white on it is 4.76:1) and the `#64748b`-on-
`#f1f5f9` hint is gone from that block; (3) `aria-hidden` is no longer set on spans that contain a
link; (4) the chart table is emitted with a `<caption>` naming the chart it was read from; (5) and
(6) were client-side and needed no pipeline change.


1. **The candidate gate rejects any chunk whose form-control names change, and that strands an IBM failure the pipeline itself created.** The image placeholder toolbar the pipeline injects carries buttons whose `aria-label` does not contain the visible text (`Pick extracted` / `Pick from extracted images`, `✨ Generate (AI)` / `Generate an AI illustration from the description`). IBM Equal Access fails them (`label_name_visible`, 4 nodes). Pass 1 chunks 2 and 5 renamed the labels and were rejected `form-state-changed`, which also discarded the chunks' other fixes. The only remaining Equal Access failure at the end is this one, and it is what holds the headline at 76 while the AI layer is at 95 and axe at 100. The fix belongs at generation time: make the injected labels start with the visible text.
2. **Two more injected-UI contrast defects:** the 11 px placeholder hint (`#64748b` on the `#f1f5f9` box, 4.34:1) and the teal Generate control (white on `#0d9488`, 3.74:1). Both were fixed by the client in pass 2 by changing the inline colours; the deterministic contrast fixer had reported `Fixed 0` for them in pass 1.
3. **The pipeline links text inside an `aria-hidden` description span.** The visible image description (hidden from assistive technology because the alt carries it) had `Digest of Education Statistics` turned into a link, giving axe `aria-hidden-focus` and IBM `aria_hidden_nontabbable`. The client removed `aria-hidden` from spans that contain a link.
4. **`chartData` tables are emitted without a caption.** The re-description step asked for chart data and rendered it as two `<table>` elements with `scope="col"` headers but no `<caption>`; the pipeline's own audit rubric then deducts for it (the one AI issue left at the end).
5. **Two h1 elements after the banner.** The client's `h1` block duplicated the banner's h1; the deterministic net demoted it to h2 before the first HTML audit, so this needed no fix, but the extraction prompt could say that the banner already supplies the h1.
6. **The section split cuts elements in half, and a text-only auditor can misread the halves.** The 16,000-character audit sections start and end mid-element. In the final audit the client's measured auditor saw a white `Replace` span orphaned from its button and reported white-on-white (`text-contrast-critical`) for section 4; that single false positive pulled the AI layer to 85 for that round (the headline was already governed by Equal Access at 76, so the number shipped did not change). The tool now skips elements orphaned at a section start. A pipeline-side improvement would be to split sections on element boundaries.
7. **"2 images failed to reinsert"** refers to Figures 2 and 5, whose crops were skipped as near-uniform and degraded to text placeholders in step 1; the two figures that did extract (3 and 4) were restored as data URLs.

The run was answered by the assistant reading the five rendered pages directly, so the audits are grounded in the images; the HTML answers are measured, not judged. The section-boundary artifact in item 6 is the client's own error and is recorded as such.

### Fixed at generation time after the rerun (same evening)

Observations 1 to 4 above were fixed in the pipeline source rather than in a fix pass, because the candidate gate is right to refuse form-control changes and the markup should be clean when it is generated:

1. **Toolbar accessible names contain their visible labels** in both placeholder renderers (`doc_pipeline_source.jsx`, `doc_builder_renderer_source.jsx`): `Pick extracted` → `aria-label="Pick extracted image from this document"`, `Generate (AI)` → `aria-label="Generate (AI) illustration from the description"`; the sparkle emoji left the visible label (a spoken name can never contain it). The nested-block carry-out recognises both the new and the pilot-era spelling, so documents remediated before the change still round-trip.
2. **Injected colours meet 4.5:1:** the Generate control is white on `#0f766e` (5.5:1) and the 11 px hint is `#475569` on the `#f1f5f9` box (6.9:1), in both renderers.
3. **`_reattachSourceLinks` never links text inside an `aria-hidden` subtree** (tracked by tag name with a nesting depth, void tags excluded), so a hidden description copy cannot gain a keyboard-reachable link.
4. **The AI-estimated chart-data table opens with a `<caption>`** naming the chart it was read from.

Proof: `tests/placeholder_toolbar_engines.test.js` renders both placeholder templates straight out of the source, loads them in Chromium and audits them with the vendored axe-core and the IBM Equal Access engine on the pipeline's own `WCAG_2_2` policy; the new markup has no `label_name_visible`, `text_contrast_sufficient`, `aria_hidden_nontabbable` or axe `color-contrast` failure, and the pilot-era markup reconstructed from the same template still fails all three in the same harness. Source locks: `tests/placeholder_toolbar_a11y.test.js`; behaviour: three new cases in `tests/doc_pipeline_source_link_reattach.test.js`; the Generate control joined `tests/doc_pipeline_inherited_contrast.test.js`. Both modules and their public mirrors were rebuilt; the build-parity and MCP runtime-drift suites pass. Not re-run end to end on the bridge; the expectation from the engine result is that the Equal Access layer no longer holds this document at 76.

Observation 6 was fixed later the same evening: the output audit now splits on block-element boundaries (`splitHtmlForAudit` in `doc_pipeline_source.jsx`, with whole-block overlaps and the same container rules as the fix-pass splitter). On this run's own output HTML the old slicer produced six sections of which five started mid-element and three ended mid-tag; the new one produces six sections that all start and end on a tag boundary (`tests/audit_section_boundaries.test.js`).

Observation 5 was fixed on 2026-09-14: the block renderer drops an h1 block whose text repeats a banner title (case, spacing and trailing punctuation ignored), so the banner's h1 is no longer echoed as an h2, and the extraction prompt now says the banner is the h1 (`tests/doc_builder_renderer_module.test.js`).

Observation 7 was addressed on 2026-09-14: the image inventory now asks the model for each figure's bounding box as page fractions, and the fallback crop uses that box (1% margin, non-strict gate, crop geometry recorded for Adjust Crop) before falling back to the blind band with its strict gate. Replaying the pipeline's own gate on this run's page renders: the blind bands for Figure 2 (page 20, middle) and Figure 5 (page 23, top) are rejected exactly as they were on the run, while the figure boxes pass (`tests/pipeline_vision_bbox_crop.test.js`; scratch probe `probe_crop_gate.mjs`). Not yet re-run live; the gain depends on the answering model returning the box.
