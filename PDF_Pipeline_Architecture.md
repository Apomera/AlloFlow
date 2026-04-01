# AlloFlow PDF Accessibility Pipeline — Technical Architecture

**Version:** 1.0 | **Date:** April 1, 2026 | **Author:** Aaron Pomeranz, PsyD
**Status:** Production (deployed at prismflow-911fe.web.app) | **License:** GNU AGPL v3

---

## Executive Summary

AlloFlow's PDF Accessibility Pipeline transforms inaccessible PDF documents into WCAG 2.1 AA-compliant accessible HTML through a multi-phase automated process. The pipeline combines AI-powered content extraction with deterministic accessibility fixes, industry-standard automated verification (axe-core from Deque), and a self-correcting fix loop with regression guards. The entire process runs in the browser with no server infrastructure required.

**Key metrics:**
- 35-page USM course catalog: 69/100 before, 90+/100 after, zero axe-core violations
- Processing time: approximately 2-4 minutes for a 35-page document
- Cost: free (uses Gemini API daily quota or user-provided API key)
- No student PII stored. No data leaves the browser except API calls.

---

## Architecture Overview

The pipeline operates in five phases:

```
ANALYSIS → EXTRACTION → TRANSFORMATION → VERIFICATION → OUTPUT
```

Each phase is designed with three principles:
1. **Deterministic before AI** — mechanical fixes run first (free, reliable), AI handles what remains
2. **Parallel where possible** — independent operations run concurrently for speed
3. **Self-correcting** — AI fixes are validated by dual auditors with automatic regression rollback

---

## Phase 1: Analysis

### Triangulated AI Accessibility Audit

The initial audit runs **5-10 independent AI auditors** in parallel, each with a different analytical framing:

| Auditor | Perspective |
|---------|------------|
| Standard | General WCAG 2.1 AA compliance review |
| Independent | Fresh auditor with no prior context |
| Strict WCAG | Focused on technical criterion compliance |
| Screen Reader | From the perspective of an assistive technology user |
| Section 508 | Federal accessibility standards |
| Title II ADA | University/government compliance officer |
| Disability Rights | Advocacy perspective |
| Remediation Specialist | Focus on fixability |
| Assistive Technology Expert | JAWS/NVDA testing perspective |
| Compliance Officer | Institutional risk assessment |

**Statistical Analysis:**
- Mean score across all auditors
- Standard deviation and standard error of mean
- 95% confidence interval
- Agreement Score (derived from SD: 1 - SD/50)
- Consistency Score (CV-based + weighted pairwise agreement)
- Issue deduplication with frequency tracking (how many auditors flagged each issue)
- Reliability rating: excellent/good/moderate/variable

**Configurable:** Users can adjust the number of auditors from 1 (quick) to 10 (research-grade) via a slider control.

---

## Phase 2: Extraction

### Text Extraction
- PDF pages processed in 5-page chunks
- Chunks run in **parallel batches of 5** with 500ms pause between batches to avoid rate limiting
- Output: markdown-formatted text with headings, lists, tables, image descriptions, and hyperlinks
- Post-processing: JSON wrapper stripping, escape sequence cleanup, whitespace normalization

### Style Extraction
- AI analyzes the PDF's visual design and extracts a color palette as JSON
- Properties: heading color, accent color, background, header gradient, table styling, body font, border colors
- Used by the deterministic HTML renderer for consistent styling

### Image Extraction (Algorithmic — No AI)
- PDF.js loaded from CDN (lazy, cached after first use)
- PDF binary parsed from base64
- `getOperatorList()` identifies `paintImageXObject` operations per page
- Transform matrices `[a,b,c,d,e,f]` provide exact image positions and dimensions
- Pages rendered to canvas at 2x resolution
- Images cropped precisely using transform coordinates
- Sorted by Y position (top-to-bottom) to match visual reading order
- Exported as PNG base64 data URLs with proper alt text from AI descriptions

---

## Phase 3: Transformation

### JSON Data Pipeline

Content extraction is separated from styling — the AI extracts structured data, deterministic code renders it.

**Step 1: JSON Structure Extraction**
- AI extracts content as typed JSON blocks (not raw HTML)
- Block types: h1-h4, p, ul, ol, table, image, blockquote, banner, hr, link
- Tables include headers array, rows array, and caption
- Links preserved as `<a href>` within text fields
- Chunks run in parallel batches of 5

**Step 2: 5-Layer JSON Self-Repair**

When AI returns malformed JSON (common with long outputs), a repair pipeline attempts recovery:

| Layer | Strategy |
|-------|----------|
| 1 | Strip preamble/postamble text outside `[ ]` |
| 2 | Direct `JSON.parse()` |
| 3 | Fix common AI errors: trailing commas, unquoted keys, single quotes, missing commas, truncation |
| 4 | Regex extract the array portion |
| 5 | Object-by-object recovery (individual `{type:...}` extraction) |

Fallback: direct HTML generation for chunks where all JSON recovery fails.

**Step 3: Deterministic HTML Rendering**

`renderJsonToHtml(blocks)` converts JSON blocks to styled HTML using the extracted color palette. Every element gets consistent inline CSS from the same style variables — no AI inconsistency.

**Step 4: Polish Passes** (2 by default, configurable 0-3)
- AI unifies heading hierarchy across chunks
- Removes duplicate content at chunk boundaries
- Merges split tables
- Ensures style consistency

**Step 5: Spelling and Grammar Correction**
- AI checks first 5000 characters for OCR artifacts, misspellings, broken words
- Auto-corrects via string replacement

---

## Phase 4: Verification and Self-Correction

### Deterministic Accessibility Fixes (8 patterns, zero API calls)

These run before any AI verification:

| Fix | WCAG Criterion | Method |
|-----|---------------|--------|
| Missing image alt text | 1.1.1 Non-text Content | Derive from figcaption or add placeholder |
| Multiple/missing h1 | 1.3.1 Info and Relationships | Promote first h2 or demote extras |
| Missing html lang | 3.1.1 Language of Page | Add `lang="en"` |
| Empty/missing title | 2.4.2 Page Titled | Derive from h1 or filename |
| Missing th scope | 1.3.1 Info and Relationships | Add `scope="col"` to all table headers |
| Empty links | 2.4.4 Link Purpose | Fill with URL text |
| Missing skip navigation | 2.4.1 Bypass Blocks | Add skip-to-content link |
| Missing main landmark | 1.3.1 Info and Relationships | Wrap content in `<main>` |

### Deterministic Color Contrast Fix (zero API calls)

- Parses every `color:#hex` and `color:rgb()` in inline styles
- Computes WCAG luminance contrast ratio against white background
- Iteratively darkens any color below 4.5:1 (15% per step until passing)
- Fixes low opacity values that reduce effective contrast

### Dual-Engine Verification (parallel)

| Engine | Type | What It Checks |
|--------|------|---------------|
| **AI Audit** | Semantic quality | Alt text quality, heading logic, reading order, link descriptiveness |
| **axe-core** (Deque v4.10.3) | Mechanical compliance | WCAG 2.1 AA technical conformance, 19+ automated checks |

Both run in parallel. axe-core is the industry standard used by browser dev tools, Lighthouse, and enterprise compliance workflows.

### Self-Correcting AI Fix Loop

For remaining axe-core violations after deterministic fixes:

```
For each pass (configurable 0-5, default 2):
    1. Save HTML snapshot
    2. AI attempts targeted fixes for specific violation IDs
    3. Triple verification: 2x AI audit + axe-core (all parallel)
    4. Average 2 AI scores to reduce random variance
    5. Regression guard:
       - If AI score drops >5 AND axe violations increase → REVERT to snapshot
       - If zero violations → stop (success)
       - If no improvement after first pass → stop (plateau)
    6. Keep best-known HTML
```

The dual AI audit averaging prevents false regression signals from random variance in a single AI evaluation.

---

## Phase 5: Output

### Results Dashboard
- Before/after score comparison with gain indicator
- AI verification: remaining issues, verified passes, summary
- axe-core: violations by severity (critical/serious/moderate/minor), expandable passes with rule IDs and WCAG criteria
- Expert referral panel (Knowbility) when score remains below threshold
- Reliability metrics from the initial triangulated audit
- Document statistics: pages processed, characters extracted, HTML size, images identified

### Differentiation Tools (post-remediation)
- **Bionic Reading:** instant client-side application (bold first half of each word)
- **Translation:** 17 languages with RTL support, stackable (multiple translations in one document)
- **Simplification:** K-10th grade target levels, stackable
- **Full Pipeline:** feeds content into AlloFlow's complete differentiation system

### Preview and Edit
- Live editable iframe with `designMode='on'`
- 6 themes + automatic brand matching from extracted color palette
- Custom color pickers with live WCAG contrast ratio display
- Formatting toolbar: bold, italic, headings, lists, tables, links, highlighting
- Layout tools: columns, callout boxes, page breaks, headers/footers, document templates
- AI image generation (Imagen) and editing (GeminiImageEdit) in-document
- Screen reader simulator: shows what assistive technology announces for each element
- Accessibility inspector: color-coded overlays for headings, images, tables, ARIA roles
- Re-audit capability: run axe-core on edited content without leaving preview

### Export Formats
- **Accessible PDF:** opens in new tab with print-to-PDF banner
- **HTML:** direct download
- **Formatted Audit Report:** professional document with scores, reliability metrics, issues, passes (PDF or HTML)
- **JSON Data:** raw structured data for research and programmatic analysis
- **Project File (.alloflow.json):** saves complete state for later resumption

### Project Save/Load
- Saves entire remediation state: accessible HTML (with all translations/simplifications), audit scores, axe-core results, document metadata
- Loadable from the main upload bar or pre-audit dialog — no need to re-run pipeline
- Use case: teacher remediates syllabus once, loads it next semester to add a translation for a new student

---

## Technical Specifications

| Specification | Detail |
|---------------|--------|
| Runtime | Browser-based (no server required) |
| PDF parsing | PDF.js v3.11.174 (CDN, lazy-loaded) |
| WCAG verification | axe-core v4.10.3 (CDN, lazy-loaded) |
| AI engine | Gemini API (2.5 Flash for content, 2.5 Flash Preview TTS for audio) |
| Image generation | Imagen 4.0 (via Gemini API) |
| Deployment | Firebase Hosting or self-hosted |
| License | GNU AGPL v3 (open source) |
| Data storage | Zero PII. No data persists beyond the browser session. |
| Accessibility | The pipeline's own UI is WCAG AA compliant (VPAT 2.5 self-assessment available) |

---

## Limitations and Scope

### What the pipeline handles well (70-80% of educational documents):
- Text-heavy documents: syllabi, handouts, course catalogs, newsletters, policies
- Tables with clear header rows
- Documents with images (descriptions generated, images extracted from PDF)
- Multi-page documents (tested up to 35 pages)

### What requires expert human remediation (20-30%):
- Fillable PDF forms with interactive fields
- Multi-column scientific papers with complex layouts
- Mathematical equations and chemical formulas
- Architectural drawings and technical diagrams
- Documents where the original PDF has no text layer (scanned images only)

When the pipeline detects it cannot adequately remediate a document (score remains below 70 after the full fix loop, or critical axe-core violations persist), it displays a referral panel recommending expert accessibility services.

---

## Cost Comparison

| Approach | Cost per Page | 1,000 Pages | 10,000 Pages |
|----------|-------------|-------------|--------------|
| **Vendor remediation** | $5-25 | $5,000-25,000 | $50,000-250,000 |
| **AlloFlow pipeline** | ~$0.01 (API) | ~$10 | ~$100 |
| **Savings** | 99.8%+ | $4,990-24,990 | $49,900-249,900 |

---

*This document describes the architecture as deployed on April 1, 2026. The pipeline is actively developed and improved based on audit findings — each new pattern identified by the AI auditor is converted into a deterministic fix, making the pipeline progressively more effective over time.*

*Contact: Aaron Pomeranz, PsyD — apomeranz@alloflow.org*
*Source: github.com/Apomera/AlloFlow (GNU AGPL v3)*
