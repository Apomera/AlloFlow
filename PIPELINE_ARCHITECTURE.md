# AlloFlow Document Accessibility Remediation Pipeline
## Architecture Guide for Collaborators

> **Canonical architecture reference.** This is the authoritative document for the remediation pipeline. `PDF_Pipeline_Architecture.md` is a deprecated historical snapshot and should not be used for new work.

**Author:** Aaron Pomeranz, PsyD
**Version:** July 2026 status refresh (covers native tagged-PDF emit, PDF/UA structural self-checks, optional veraPDF QA paths, font-embedding tier, dual-engine OCR, and autonomous retry)
**Status:** Canonical
**Purpose:** This document explains how the remediation pipeline works in plain language so that accessibility experts, learning designers, and institutional partners can understand, evaluate, and help improve the system.

---

## What the Pipeline Does

The pipeline takes an inaccessible PDF (or DOCX/PPTX) and produces a more accessible document package: semantic HTML, an audit report, and a **native tagged PDF** with structural PDF/UA-oriented checks. It uses a 7-phase process that combines deterministic rule-based fixes, AI-powered remediation, automated verification, and optional veraPDF/PAC-style QA for institution-facing review.

**In simple terms:** Upload an inaccessible document, get back an accessible one with a detailed audit report showing what was fixed and what remains.

---

## The Three-Layer Remediation Model

The pipeline uses three complementary approaches, applied in order:

### Layer 1: Deterministic Fixes (Zero AI Cost)

A composed suite of **deterministic, rule-based fixes** (entry point `runDeterministicWcagFixes()`) that run on the HTML with no AI judgment needed — fast, free, and reliable. Several are genuinely **context/geometry-aware**, not blind find-and-replace: e.g. `<th>` scope is assigned by analyzing table geometry (row vs. column headers) rather than a blanket `scope="col"`, and heading hierarchy is repaired with a strict skip-collapse pass. The numbered catalog below is an illustrative list of the violation classes handled, not a literal 1-to-1 registry of functions.

Examples:
- If `<html>` is missing a `lang` attribute, add `lang="en"`
- If heading levels skip (h1 directly to h3), adjust to proper hierarchy (h1 → h2 → h3)
- If an image has no `alt` attribute, add a placeholder
- If a table header (`<th>`) is missing a `scope` attribute, add `scope="col"`
- If a form input has no label, add an `aria-label` from the field's name or placeholder
- If a skip-to-content link is missing, inject one
- If an ARIA role is invalid (e.g., `role="content-info"`), correct it to `role="contentinfo"`

**Why this matters for experts:** These fixes handle the "low-hanging fruit" that accounts for ~60% of common WCAG violations. They run before any AI processing, so the AI can focus on harder problems. If you identify a new common violation pattern, it can be added as a new deterministic fix — no AI retraining needed, just a rule.

**Full list of deterministic fixes:**

| # | Fix | WCAG |
|---|-----|------|
| 1 | Missing alt text on images → add placeholder | 1.1.1 |
| 2 | Ensure exactly one h1 (demote extras to h2) | 1.3.1 |
| 3 | Validate lang attribute (fix "English" → "en", underscores → hyphens) | 3.1.1 |
| 4 | Ensure non-empty `<title>` (derives from filename) | 2.4.2 |
| 5 | Add scope="col" to table headers missing scope | 1.3.1 |
| 6 | Add descriptive text to empty links | 2.4.4 |
| 7 | Inject skip-to-content link if missing | 2.4.1 |
| 8 | Wrap content in `<main>` landmark if missing | 1.3.1 |
| 9 | Fix heading level skips (h1→h3 becomes h1→h2) | 1.3.1 |
| 10 | Remove empty headings | 1.3.1 |
| 11 | Replace "click here" / "read more" with descriptive text | 2.4.4 |
| 12 | Add viewport meta tag for mobile accessibility | 1.4.4 |
| 13 | Fix duplicate element IDs | 4.1.1 |
| 14 | Wrap orphaned `<li>` items in list containers | 1.3.1 |
| 15 | Add labels to form inputs without them | 3.3.2 |
| 16 | Add accessible names to empty buttons | 4.1.2 |
| 17 | Add titles to iframes | 2.4.1 |
| 18 | Normalize tabindex values (remove positive tabindex) | 2.4.3 |
| 19 | Add alt/aria-label to role="img" elements | 1.1.1 |
| 20 | Add accessible names to SVG elements | 1.1.1 |
| 21 | Add dir="rtl" for Arabic/Hebrew/Persian/Urdu content | 1.3.2 |
| 22 | Add role="table" for screen reader compatibility | 1.3.1 |
| 23 | (Reserved — requires URL context) | 2.4.8 |
| 24 | Add aria-label to `<nav>` elements | 1.3.1 |
| 25 | Remove user-scalable=no and maximum-scale=1 | 1.4.4 |
| 26 | Correct or remove invalid ARIA roles | 1.3.1 |
| 27 | Add accessible names to `<select>` elements | 3.3.2 |
| 28 | Add labels to `<object>` and `<embed>` elements | 1.1.1 |
| 29 | Add aria-label to `<aside>` elements | 1.3.1 |
| 30 | Wrap orphaned `<dt>`/`<dd>` in `<dl>` containers | 1.3.1 |
| 31 | Mark layout tables with role="presentation" | 1.3.1 |
| 32 | Add role="contentinfo" to `<footer>` | 1.3.1 |
| 33 | Add role="banner" to `<header>` | 1.3.1 |
| 34 | Fix aria-hidden on elements with focusable children | 2.1.1 |
| 35 | Remove invalid scope attributes from `<td>` elements | 1.3.1 |
| 36 | Add aria-label to unlabeled `<section>` elements | 1.3.1 |
| 37 | Add figcaption/aria-label to `<figure>` elements | 1.3.1 |
| 38 | Detect Arabic script and add lang="ar" spans | 3.1.2 |
| 39 | Add role="list" for Safari VoiceOver compatibility | 1.3.1 |

---

### Layer 2: Surgical AI Micro-Tools (Targeted, Low-Cost)

**34 precision tools** (the `SURGICAL_TOOL_REGISTRY`) that are *diagnosed* by AI but *executed* deterministically. The AI looks at the document and says "image #3 needs better alt text: 'University of Southern Maine campus aerial view'" — then the tool mechanically applies that specific fix.

This is the key architectural insight: **AI decides WHAT to fix, but a deterministic tool does the fixing.** This prevents the AI from accidentally breaking other parts of the document.

**How it works:**
1. Three parallel Gemini calls analyze the document from different perspectives:
   - General accessibility expert
   - Content-focused auditor (alt text, link text, headings)
   - Structure-focused auditor (landmarks, ARIA, tables, forms)
2. The three diagnoses are merged and deduplicated
3. Each prescribed fix is applied by its corresponding micro-tool

**Available micro-tools:**

| Tool | What It Does |
|------|-------------|
| `fix_alt_text` | Updates alt text on a specific image with AI-generated description |
| `fix_heading` | Changes a heading level (e.g., h3 → h2) |
| `fix_link_text` | Replaces generic link text with descriptive text |
| `fix_table_caption` | Adds a descriptive caption to a data table |
| `fix_aria_label` | Adds or updates aria-label on any element |
| `fix_lang` | Sets the document language attribute |
| `fix_th_scope` | Adds scope attributes to table headers |
| `fix_remove_empty_heading` | Removes empty heading elements |
| `fix_input_label` | Adds labels to form inputs |
| `fix_button_name` | Adds accessible names to buttons |
| `fix_iframe_title` | Adds titles to iframe elements |
| `fix_add_landmark` | Wraps content in semantic landmarks |
| `fix_duplicate_id` | Resolves duplicate element IDs |
| `fix_figcaption` | Adds captions to figure elements |
| `fix_title` | Sets the document title |
| `fix_lang_span` | Wraps foreign-language text in lang spans |
| `fix_contrast` | Adjusts text colors for contrast compliance |
| `fix_table_header_row` | Promotes first table row to header with `<th>` |
| `fix_abbreviation` | Wraps abbreviations in `<abbr>` with expansions |
| `fix_image_decorative` | Marks decorative images with empty alt |
| `fix_list_wrap` | Wraps orphaned list items in proper containers |
| `fix_skip_nav` | Adds skip-to-content link |
| `fix_text_spacing` | Adds CSS for proper text spacing |

*The table above is a representative subset. The live registry has **34** tools — additions since include a table-refinement family (`fix_table_header_col`, `fix_table_mark_layout`, `fix_table_merge_row`, `fix_table_unmerge_cell`, `fix_complex_table`), landmark builders (`fix_add_nav`, `fix_add_aside`, `fix_add_header`, `fix_add_footer`), `fix_color_contrast`, and `fix_svg_accessibility`. `SURGICAL_TOOL_REGISTRY` in `doc_pipeline_source.jsx` is the source of truth.*

**Why this matters for experts:** If you notice the AI consistently misdiagnoses a certain violation type, the fix is in the diagnosis prompt — not in the tool itself. You can also add new micro-tools for institution-specific patterns (e.g., a tool that recognizes your university's specific course catalog structure).

---

### Layer 3: Full AI Rewrite (For Complex Structural Issues)

For violations that can't be fixed surgically — like a document with no semantic structure at all, or tables built from tab-separated text — the pipeline sends the violations and the current HTML to Gemini and asks it to rewrite the affected sections.

This is the most powerful but least predictable layer. It can restructure entire sections, convert visual formatting to semantic markup, and resolve complex multi-element violations. But it can also introduce new issues, which is why:

- **Deterministic fixes run AFTER every AI rewrite** to catch common AI mistakes (invalid ARIA roles, bad lang values, broken list structure)
- **A fresh AI rubric audit, axe-core, and IBM Equal Access each contribute verification evidence** before the result can be marked fully verified
- **A regression guard reverts the change** if the score drops more than 5 points

---

## How Scoring Works

### The Rubric

Every audit starts at 100 and deducts points per unique violation type:

| Severity | Deduction | Examples |
|----------|-----------|---------|
| **Critical** | -15 | Missing lang attribute, no page title, images without alt text, no main landmark, contrast below 3:1 |
| **Serious** | -10 | No h1 heading, heading level skips, data tables without th/scope, form inputs without labels, contrast below 4.5:1 |
| **Moderate** | -5 | Missing skip-to-content link, missing landmarks, non-descriptive link text, bullet characters instead of semantic lists |
| **Minor** | -2 | Missing document metadata, extra whitespace in alt text, multiple h1 elements, inconsistent heading granularity |

**Important:** Each violation TYPE is counted once, regardless of how many times it appears. A document with 50 images missing alt text gets one -15 deduction for "images without alt text," not 50 × -15.

### Pass Credit — removed (2026-06-21)

An earlier design granted proportional deduction credit for model-asserted "passing checks" (`passFactor`). This was removed: unverified model-asserted passes no longer buy back deductions. Every displayed AI score is the deduction-grounded recalculation from the issue list — never the model's self-reported number.

### Three-Engine Verification and Evidence State (weakest layer governs)

When all required evidence is fresh, the headline score is **`min(AI Rubric Score, deterministic engine score)`** — the weakest verified layer, not an average:

1. **AI Rubric Score** — Gemini evaluates the HTML against the WCAG rubric (chunked for long documents, deduplicated), recomputed from the issue deductions
2. **Deterministic engines** — axe-core and IBM Equal Access (the more conservative of the two governs); local, zero API cost, no AI variance

A canonical evidence state prevents a numeric score from being mistaken for complete verification. **Complete** requires fresh AI, axe-core, and Equal Access evidence with no manual or potential findings. **Review required** means all engines ran but at least one finding needs human judgment. **Partial** means some, but not all, engines completed. **Unavailable** means no required engine completed. Scores and engine details may still be useful in the latter states, but are explicitly unverified.

Verification evidence is bound to the exact remediated HTML using a versioned SHA-256 record plus paired, non-serializable in-memory witnesses for both the HTML and its digest. This prevents either a same-length HTML edit or a digest-only swap from inheriting a prior claim. Saved projects re-hash restored HTML before recovering verified state; legacy, mismatched, or stale projects load as unverified until a fresh three-engine audit completes. PDF/UA and veraPDF results are additionally scoped to the exact tagged-PDF artifact so an asynchronous result cannot attest to newer bytes.

Averaging was abandoned (2026-06-21) because the engines measure different things — the midpoint described neither, and an inflated automated result could mask a failing content result. Engine scores and coverage are shown separately in the UI, and PDF/UA status is kept separate from HTML/WCAG scoring: the in-app structural self-check is a preflight, while veraPDF/PAC-style review is the institution-facing QA path.

### Multi-Auditor Triangulation

For the initial PDF audit, the pipeline runs **2-10 independent AI auditors** — starting with 3 and adaptively escalating to the configured count (the auditor slider sets the cap) when scores diverge or confidence is low (2026-07-02). Each auditor takes a slightly different perspective:

- Base WCAG evaluator
- Document remediation specialist
- Independent accessibility analyst
- Strict compliance officer
- Screen reader user perspective
- (and more, up to 10 variants)

Each auditor's score is **always** the deduction-grounded rubric recalculation of its issue list — the model's self-reported number is never displayed (it is preserved for disclosure, and a >12-point divergence is additionally logged). The final score is the arithmetic mean of all auditors.

**Statistical reliability metrics reported:**
- Standard Deviation (SD) — how much auditors disagree
- Standard Error of Mean (SEM) — precision of the average
- 95% Confidence Interval — range containing the true score
- Auditor Consistency (ICC-like) — custom `1 − (SD/50)` index, scaled for small auditor panels (n=2–10). Not the textbook intraclass correlation coefficient, which requires ANOVA components the pipeline does not compute.
- Auditor Consistency (Cronbach-like) — hybrid of CV-based dispersion and weighted pairwise proximity. Pragmatic substitute for Cronbach's α on score vectors (no per-item variance available).

**Adaptive auditing:** If auditors diverge by more than 20 points or any auditor reports low confidence, up to 2 additional auditors are automatically added.

---

## The Fix Loop

After the initial remediation, the pipeline enters a self-correcting loop:

```
For each pass (up to 8 by default):
  1. Send remaining violations to Gemini for AI fix
     (a reverted or no-op previous pass adds a note saying WHY, so the
      retry isn't an identical re-roll)
  2. Run deterministic cleanup (list, contrast, ARIA roles, lang)
  3. If the pass changed nothing, skip re-audit (results are identical) and count a stall
  4. Run a fresh AI audit, axe-core, and IBM Equal Access
     (unchanged AI sections come from a temp-0 memo, not re-billed)
  5. Check:
     - Target score reached with canonical COMPLETE evidence and no automated failures? → STOP
     - Plateau (2 consecutive passes with no meaningful improvement)? → STOP
     - Regression (axe much worse, OR AI dropped >5 without an axe gain)? → REVERT
       (retry once with feedback; 2 consecutive reverts → STOP)
     - Otherwise → continue to next pass
  Keep-best: the shipped HTML is the best accepted pass; its evidence state is preserved,
  and partial, unavailable, or review-required evidence is never labeled verified.
```

**The target score** is configurable via a slider (default 95/100, raised from 90 on 2026-06-23). Users can set it higher for critical documents or lower for quick processing.

**Plateau detection** requires improvement beyond a 2-point noise floor; audits run at temperature 0, so re-prompt variance is engineered out rather than estimated per pass (the earlier "1.5× SEM across parallel audits" design measured near-zero variance between byte-identical temp-0 calls — it always degenerated to this floor).

**Hands-off / autonomous mode.** `runAutonomousRemediation()` wraps the loop as a self-driving, bounded (default 5-pass) orchestration with target-score gating, plateau detection (stops after 2 non-improving passes), and permanent-failure skipping. Chunk-level transforms additionally auto-retry transient failures (timeout / quota / RECITATION) with backoff, and every bare PDF.js/OCR/network await is wrapped with a per-request `AbortController` timeout — so a hung call can't stall the whole run. This is the reliability work behind "it works every time" for institutional use.

---

## What the Pipeline Produces

### Remediated HTML Document
- Fully semantic HTML5 with proper landmarks, headings, lists, tables
- Inline CSS with accessibility features (high contrast support, reduced motion, print styles)
- Skip-to-content link, proper lang attribute, descriptive title
- Images with alt text, tables with headers and captions
- Styled via a unified **Style Seed** system (Professional, Academic, Kid-Friendly, Minimalist, High Contrast/AAA, Nature, Print, Dark Mode, Magazine, Match Original) — AI prompt instructions during remediation + deterministic CSS fallback for preview/offline
- All styling paths run through `sanitizeStyleForWCAG()` — a deterministic style validator that enforces measurable contrast and font-size constraints where it can. It reduces risk from AI output, theme settings, and preview edits, but does not by itself certify full WCAG conformance.

### Accessibility Audit Report
A professional PDF-ready report containing:
- Before/after scores with improvement
- Reliability metrics (SD, SEM, CI, ICC)
- Document properties (searchable text, images, tables, page count)
- Issues by severity (Critical, Serious, Moderate, Minor) with WCAG codes
- Passing accessibility checks
- After-remediation remaining issues
- axe-core automated verification results
- Scoring methodology explanation
- Standards compliance references (WCAG 2.2 AA, ADA Title II, Section 508, EN 301 549)
- Knowbility referral for documents needing expert human review

### Alternative Formats
- **ePub 3.0** — read-along EPUB3 with Media Overlays, for e-readers / mobile devices
- **DAISY** — Digital Accessible Information System, for dedicated assistive readers
- **ODT** — OpenDocument Text (LibreOffice / Google Docs)
- **Accessible PDF** and **HTML** — the primary outputs (see "How the Output Works")

### Batch Processing
- Process multiple PDFs in sequence with automatic retry
- CSV report with per-file scores, evidence coverage, verification state, and review reasons
- JSON telemetry for institutional analytics without treating processed files as verified files
- HTML summary dashboard that separates processed, fully verified, review-required, and verified-at-target counts
- ZIP download containing all outputs

---

## Where Expert Input Is Most Valuable

### 1. Rubric Weights
The current deduction weights (-15/-10/-5/-2) are based on WCAG severity and industry consensus. An accessibility expert might argue that certain violations should be weighted differently for specific document types. For example, missing alt text on a chemistry diagram is more critical than missing alt text on a decorative border.

**How to adjust:** Change the severity weights in the `AUDIT_RUBRIC_PROMPT` and the score recalculation blocks. This is a text change, not a code change.

### 2. Deterministic Fix Priorities
The deterministic fixes run in order. An expert might identify that certain fixes should run earlier (or later) to avoid conflicts. They might also identify new patterns specific to their institution's documents.

**How to adjust:** Each fix is a numbered block that can be reordered, modified, or extended. New fixes follow the same pattern: regex match → transform → count.

### 3. Surgical Tool Prompts
The AI diagnosis prompt determines which micro-tools get called. An expert can refine the prompt to better describe their institution's common violation patterns.

**How to adjust:** Edit the diagnosis prompt text to emphasize specific violation types or add institution-specific context.

### 4. Post-Remediation Review Points
The pipeline flags documents that may need expert review:
- Score below 70 after remediation
- Critical axe-core violations remaining
- Complex elements (forms, interactive content, deeply nested structures)

An expert can define additional triggers for their institution's specific compliance requirements.

### 5. Document Type Templates
Different document types have different accessibility patterns. A syllabus, a research paper, and a course catalog need different handling. Experts can help define document-type-specific prompts and fix priorities.

---

## Additional Capabilities

### Reading Level & Cognitive Accessibility Analysis
AlloFlow includes a **Simplified/Leveled Text** tool that can rewrite content at specific grade levels (K-12 and college), and an **Analyze Source Text** feature that evaluates reading level using standard readability metrics. The pipeline can analyze the remediated document's reading level and include it in the audit report, helping institutions ensure documents are accessible not just structurally but cognitively.

### Screen Reader Compatibility Simulation
While the pipeline cannot run physical screen reader software (JAWS, NVDA, VoiceOver), it simulates screen reader compatibility through two mechanisms:
- **axe-core** evaluates the same accessibility tree that screen readers use, checking for the same structural requirements (landmarks, headings, ARIA attributes, focus order)
- **AI auditors** include a "screen reader user perspective" variant that evaluates the document as a screen reader would experience it

### Visual Design Quality Assessment
Gemini's vision capabilities can evaluate the visual design of remediated documents — analyzing typography quality, spacing consistency, color harmony, visual hierarchy, and overall readability. The **AI Style Studio** provides one-click design presets (Academic, Kid-Friendly, Dark Mode, Magazine, Minimal) and can also match an uploaded brand reference document. Users can also describe a custom style in natural language and Gemini generates the CSS.

---

## How the Output Works

The pipeline uses HTML as its working format internally because HTML provides full semantic control over accessibility features (landmarks, ARIA attributes, heading hierarchy, table structure) that the original PDF format lacks. However, from the user's perspective:

- **PDF in → PDF out, as a *native tagged PDF*.** The remediated HTML is converted to a real accessible PDF by `createTaggedPdf()` (using **pdf-lib**) — **not** a browser print-to-PDF. It builds an actual PDF `/StructTreeRoot` from the remediated structure (headings, lists, tables with cell `/Scope`, figures with `/Alt`), sets `MarkInfo/Marked`, document `/Lang`, and title, and tags link annotations. `window.print()` survives only as an optional preview, not the export path.
- **Fonts are embedded (PDF/UA §7.21.4.1).** A dedicated stage substitutes metric-compatible embeddable fonts (Liberation/DejaVu), subsets them via **fontkit**, and writes `FontFile2` into the font dictionary. Non-embedded fonts are treated as a first-class veto on the PDF/UA pass claim.
- **Multiple output formats available.** The same remediated document can also be downloaded as read-along **ePub 3.0**, **DAISY**, **ODT**, accessible PDF, or kept as HTML.
- **The original PDF is not modified.** The pipeline creates a new, accessible version rather than editing the original file. This preserves the original for reference.
- **Provenance disclosure.** Remediated output carries a machine-generated disclosure (original filename, page count, transform date, WCAG 2.2 AA); content-altering PDF/UA repairs (font substitution, artifact-marking) are surfaced as "REVIEW" notices.

---

## PDF/UA-1 Validation (ISO 14289-1)

Beyond the HTML-level axe-core + AI scoring, the pipeline keeps PDF-level status separate from the content score:

1. **Automatic post-export self-check.** `view_pdf_validator_module.js` re-parses the produced PDF bytes (via `window.PDFLib`) on export and surfaces a structural Conformance Report. This is an AlloFlow preflight, not certification.
2. **Optional browser veraPDF companion.** Current builds include a CheerpJ-based companion validator that can run Java veraPDF in a popup or hidden iframe when browser policy allows it. It is useful for immediate feedback, can be blocked by popup/CSP/runtime constraints, and should not be treated as the only review artifact.
3. **Reproducible local/institutional QA.** For handoff to a district, university accessibility team, or external reviewer, use the local veraPDF/PAC-style workflow documented in `docs/verapdf_install.md` so reviewers can rerun the check on the exact exported file.

The practical rule: AlloFlow can provide structural self-checks and optional veraPDF evidence, but final PDF/UA reliance should include external validator review and human checks for reading order, alt-text quality, and document intent.

---

## Current Limitations

1. **Promise 100% compliance** — No automated tool can promise full WCAG compliance. The pipeline typically gets much of the remediation work done, with remaining issues clearly documented in the audit report for expert review. This is why the Knowbility referral exists for high-stakes documents.

2. **Complex interactive content** — Forms with complex validation logic, embedded multimedia players, and JavaScript-dependent widgets may need manual remediation.

3. **Scanned image-only PDFs** — PDFs that are purely scanned images (no text layer) require OCR first. The pipeline detects this (low text density per page) and OCRs client-side via **Tesseract.js** (deterministic, on-device, no hallucination) in parallel with **Gemini Vision**, then reconciles the two **page by page** (winner-take-all per page with junk-ratio and confidence overrides — not word-level token merging; page boundaries come from a model-emitted sentinel with an equal-split fallback). Document language is auto-detected first. OCR accuracy still depends on scan quality, and low-confidence pages are flagged for review.

---

## Technical Architecture Summary

```
Input: PDF/DOCX/PPTX
  │
  ├── Phase 1: Multi-auditor AI audit (2-10 parallel Gemini calls)
  │   └── axe-core baseline on extracted text
  │
  ├── Phase 2: Text extraction (Gemini Vision API, chunked for long docs)
  │   └── Style Seed applied to transform prompt (unified STYLE_SEEDS system)
  │
  ├── Phase 3: HTML generation
  │   ├── 3a: deterministic fixes (runDeterministicWcagFixes, zero API cost)
  │   ├── 3b: AI transform to semantic HTML
  │   └── 3c: Surgical micro-tools (AI diagnosis → deterministic execution)
  │
  ├── Phase 4: Three-engine verification + canonical evidence state
  │   ├── AI audit (chunked, deduplicated)
  │   ├── axe-core + IBM Equal Access automated/manual-potential checks
  │   └── SHA-256 binding + paired runtime witness for the exact verified HTML
  │
  ├── Phase 5: Self-correcting fix loop (up to 8 passes)
  │   ├── AI fix attempt (revert/no-op feedback on retries)
  │   ├── Deterministic cleanup (ARIA roles, lang, lists, contrast)
  │   ├── Fresh AI audit (chunk-memoized) + axe-core + Equal Access
  │   └── Plateau/regression/target detection + keep-best
  │
  ├── Phase 6: Final audit + weakest-layer headline
  │   ├── Full chunked AI audit + structural pass detection
  │   ├── axe-core + Equal Access verification
  │   └── headline = min(AI, deterministic), verified only when evidence is complete
  │
  └── Phase 7: Native tagged-PDF emit + PDF/UA validation
      ├── createTaggedPdf (pdf-lib): /StructTreeRoot, MarkInfo, /Lang, /Alt, /Scope
      ├── Font embedding (fontkit, ISO 14289-1 §7.21.4.1)
      ├── Post-export self-check (view_pdf_validator_module.js)
      └── PDF/UA self-check + optional browser/local veraPDF QA
  │
Output: Native tagged PDF + Accessible HTML + Audit Report + ePub3/DAISY/ODT
```

---

## File Locations

| File | Size | Purpose |
|------|------|---------|
| `doc_pipeline_source.jsx` | ~29,900 lines | Core pipeline logic — auditing, fixes, scoring, native tagged-PDF emit, font embedding, OCR, reports, exports |
| `doc_pipeline_module.js` | compiled | Browser-ready version loaded via CDN |
| `view_pdf_audit_source.jsx` | ~14,700 lines | Audit/remediation UI, tagging export, optional browser veraPDF QA, format exports |
| `view_pdf_validator_module.js` | module | In-browser post-export PDF/UA structural self-check (Conformance Report) |
| `AlloFlowANTI.txt` (pipeline UI sections) | ~3,500 lines | Score display, audit panels, preview, style seed picker, AI restyle, settings |

---

## Unified Style Seed System

The pipeline uses a **Style Seed** model that unifies pre-remediation AI styling with post-remediation preview themes into a single system. Each seed contains:

- **`promptInstructions`** — Injected into the Gemini prompt during Phase 3, so the AI generates styled HTML that matches the desired aesthetic
- **`cssVars`** — Deterministic CSS properties (colors, fonts, spacing) for instant restyling in the preview without re-running remediation
- **`wcagLevel`** — `'AA'` or `'AAA'` (High Contrast targets AAA = 7:1 contrast ratio)

### Available Seeds
| Seed | WCAG | Description |
|------|------|-------------|
| Professional | AA | Inter font, navy/blue, corporate |
| Academic | AA | Georgia serif, navy/gold, scholarly |
| Kid-Friendly | AA | Comic Sans, bright colors, rounded corners |
| Minimalist | AA | Georgia, muted grays, whitespace |
| High Contrast | AAA | Atkinson Hyperlegible, black/white, bold borders |
| Nature & Calm | AA | Lexend, greens, calming |
| Print Optimized | AA | Times New Roman, black/white, page breaks |
| Dark Mode | AA | Charcoal background, light text, indigo accents |
| Magazine | AA | Large headings, pull quotes, editorial |
| Match Original | AA | Extracts colors from the original PDF |

### WCAG Style Sanitizer (`sanitizeStyleForWCAG`)

A deterministic function that runs **after every styling change** — whether from AI-generated CSS, theme/seed application, or user edits in the preview. It enforces measurable style checks:

1. **Background detection** — Parses the document's actual `<body>` background color instead of assuming white
2. **Contrast enforcement** — Adjusts any text color below the target ratio (4.5:1 for AA, 7:1 for AAA)
3. **Font size floor** — Clamps any `font-size` below 12px up to 12px
4. **Safety-net CSS** — Injects override rules for common utility classes that fail contrast

**Key safety claim:** AI output, theme settings, and user edits all pass through this sanitizer before styled content is displayed or exported. That makes contrast regressions much less likely, but it is still a style preflight rather than a complete accessibility certification.

---

## Standards Alignment

The pipeline is designed to support alignment with:
- **WCAG 2.2 Level AA** — Web Content Accessibility Guidelines
- **ADA Title II** (28 CFR Part 35 Subpart H) — Americans with Disabilities Act web/mobile accessibility rule, with DOJ-extended compliance dates of April 26, 2027 for state/local entities with populations of 50,000 or more and April 26, 2028 for smaller entities and special district governments ([ADA.gov fact sheet](https://www.ada.gov/resources/2024-03-08-web-rule/)); verify entity-specific obligations with counsel.
- **Section 508** — Federal accessibility requirements
- **EN 301 549** — European accessibility standard

---

## Partnership: Knowbility

AlloFlow partners with [Knowbility](https://knowbility.org/) (AccessWorks program) for documents that need expert human remediation. The audit report includes a Knowbility referral when:
- The remediated document scores below 70
- Critical axe-core violations remain after automated remediation
- The document contains complex interactive elements

This ensures that the hardest documents get the human expertise they need, while the pipeline handles the bulk of the workload.

---

*This document is intended for accessibility professionals, learning designers, and institutional partners evaluating or collaborating on the AlloFlow remediation pipeline. For technical implementation details, see the source code comments in `doc_pipeline_source.jsx`.*
