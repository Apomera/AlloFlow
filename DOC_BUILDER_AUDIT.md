# Document Builder — Architecture & Improvement Audit

**Generated**: 2026-05-24 (Claude Opus 4.7)
**Trigger**: After completing the PDF remediation pipeline work, audit the Document Builder sibling feature to map its state and identify improvement opportunities.
**Companion doc**: [PDF_PIPELINE_AUDIT.md](PDF_PIPELINE_AUDIT.md)

## TL;DR

- **Document Builder is an export-customization modal**, not an authoring tool. It styles, themes, and packages AI-generated content into deliverable formats (PDF, HTML, worksheet, slides, LMS packages).
- **Surprisingly broad feature set.** 14-16 resource types, 6 output formats including LMS packages (QTI/IMS/SCORM/Canvas/Blackboard), 3 theme seeds with WCAG AAA option, AI theme generator, live preview, accessibility inspector, custom CSS, save/load presets, paper-worksheet mode with fillable blanks, flashcards in fold-and-cut print format.
- **Real strengths**: depth of output formats is unmatched by free competitors; AAA contrast option built in; live accessibility inspector means users see WCAG ratios while authoring.
- **Honest gaps**: custom CSS injected unsanitized (XSS surface), AI theme generation uncached (cost), 13+ resource toggles is a complexity cliff, no tests for the resource HTML generators, exported annotation runtime is vanilla JS bypass-React (mobile interaction limits), shared 18K-line file with PDF pipeline.
- **Most actionable improvements**: Tier 1 — CSS sanitization (XSS fix), AI theme cache (cost), preset migration safety. Tier 2 — annotation runtime modernization, resource-toggle UX simplification. Tier 3 — LMS export validation against real LMSes, output unit tests.

## What Document Builder is (and isn't)

**It's an *export modal*, not an *authoring environment*.** Users:
1. Generate content via AlloFlow's AI pipeline (Lesson Plan, Glossary, Quiz, Simplified Text, etc.)
2. Click the Document Builder export button
3. Choose theme + format + which resource types to include
4. Live-preview the result
5. Download as PDF / HTML / DOCX / PPTX / LMS package

This is fundamentally different from Word, Google Docs, or even Adobe InDesign. The user doesn't type prose into the Document Builder — they configure how the AI-generated content gets styled and packaged.

That framing matters because it sets the right comparison set: Document Builder competes with the *export step* of curriculum tools (Newsela, ReadWorks, CommonLit, Lumio), not with full WYSIWYG editors.

## The data

### Code footprint

| File | Lines | Role |
|---|---|---|
| `view_export_preview_source.jsx` | 987 | Modal UI component (left config panel + right preview iframe) |
| `doc_pipeline_source.jsx` | 18,278 | **Shared** with PDF remediation. Houses `applyStyleSeedToHtml`, `generateResourceHTML`, `generateFullPackHTML`, theme system, all resource type renderers |
| `export_source.jsx` | 993 | Legacy export handlers (QTI, IMS, PPTX, JSON, research data) |
| `AlloFlowANTI.txt` (lines 9942-10020, 15239-15330, 14354-15430) | ~1,500 | React state, openExportPreview trigger, updateExportPreview callback, STYLE_SEEDS / EXPORT_THEMES definitions |

**Total: ~21,000 lines spread across 4 files**, but only ~3,500 lines are *purely* Document Builder — the rest is shared infrastructure with the PDF remediation pipeline.

### Resource types supported (14)

1. simplified (📖 Leveled Text)
2. analysis (📊 Source Analysis)
3. glossary (📚 Glossary — table / flash-cards / language-cards display modes)
4. quiz (❓ Quiz)
5. outline (🗂️ Graphic Organizer)
6. faq (💬 FAQ)
7. sentence-frames (✍️ Sentence Frames)
8. image (🎨 Visual Support — multi-panel + annotation support)
9. math (🔢 Math)
10. dbq (📜 Document-Based Question)
11. lesson-plan (📋 Lesson Plan)
12. udl-advice (🧩 UDL Strategies)
13. brainstorm (💡 Brainstorm)
14. timeline (📅 Timeline — strip / grid modes)
15. concept-sort (🧩 Concept Sort — interactive drag-to-sort)
16. fluency-record (🎙️ Fluency Record)

### Output formats (6)

1. **PDF** — printable, themed, via browser print dialog
2. **HTML** — interactive, embedded CSS, optional student submission encryption (`cfg.classPublicJwk`)
3. **Worksheet** — paper mode with ruled answer lines and bubble responses replacing inputs
4. **Slides (PPTX)** — via `window.PptxGenJS`
5. **LMS standards** — QTI, IMS Common Cartridge (interoperability)
6. **LMS vendor packages** — SCORM, Canvas, Blackboard

### Theme system (3 seeds)

| Seed | Emoji | WCAG Level | Use case |
|---|---|---|---|
| Professional | 💼 | AA | Default. Clean serif. |
| High Contrast | ◼️ | AAA | Black bg / yellow text. Low vision. |
| Match Original | 📎 | Variable | Extracts colors from source PDF (when one was processed). |

Plus **AI Theme Generator**: user prompt → `generateCustomExportStyle` calls Gemini → returns custom CSS. No cache.

## Strengths (real, not pad)

- **Output format breadth.** Six output formats including all major LMS standards is genuinely impressive for a free tool. Adobe InDesign + a separate LMS exporter would cost $200+/month to match.
- **Live accessibility inspector.** WCAG contrast ratios and heading hierarchy visible while authoring, not just at audit time. Bakes accessibility into the workflow rather than treating it as a separate compliance step.
- **AAA contrast option built in.** Newsela and ReadWorks have AA themes but no AAA option. High-vision-impairment users get an out-of-the-box themed export.
- **Preset save/load.** Districts can standardize their export configuration across teachers via shared preset JSON — real institutional value.
- **Paper-worksheet mode auto-replacing inputs with fillable blanks.** Specific, useful, non-obvious. Saves teachers manual layout time.
- **Annotation support in exports** (May 2026 work). Highlights/notes survive the export — uncommon feature.
- **Sibling integration with PDF remediation pipeline.** Both share `STYLE_SEEDS` and `applyStyleSeedToHtml`, so styling is consistent between "generate accessible doc from scratch" and "fix existing inaccessible PDF" paths.

## Honest gaps — ranked by impact × effort

### Tier 1 (high merit, low risk)

#### Custom CSS XSS surface

`customExportCSS` is user-provided CSS injected raw into exported HTML. CSS can carry XSS via:
- `background: url("javascript:...")` (mostly mitigated in modern browsers but historically real)
- `@import` from untrusted hosts
- `expression()` (legacy IE — dead, but worth knowing)
- `behavior:` (legacy IE)
- Modern: `style` attribute injection via `content:` or aria abuses

For a single-teacher use case the risk is low (they're only injecting their own CSS). For a **district-wide shared preset** distributed by an admin to teachers, an attacker who compromises the preset distribution could inject CSS that exfiltrates content. **Fix**: run `customExportCSS` through a CSS sanitizer (CSSO + allowlist, or DOMPurify's CSS mode) before injection. ~30 lines, no behavior change for safe input.

#### AI theme generator caching

`generateCustomExportStyle` calls Gemini on every "Generate Theme" click. Same prompt → identical Gemini call. **Fix**: cache by content-hash of prompt + selected font + grade level. Pattern is already in place from the PDF audit cache (`_AUDIT_CACHE_DB`, `_writeAuditCache`). ~20 lines reusing existing infrastructure. Cost: saved Gemini calls on prompt re-generation. UX: instant repeat-themes.

#### Preset migration safety

Presets are stored in localStorage. As new export config fields are added (the May 2026 round added several), old presets are missing those fields and silently fall back to defaults — which may not be what the preset author intended. **Fix**: add a preset schema version, run migration on load (`v1 → v2 → v3`), warn user when an old preset auto-migrated. Pattern is standard. ~50 lines including migrations for the fields that have been added recently.

### Tier 2 (moderate merit, moderate risk)

#### Annotation runtime modernization

The export-side annotation runtime (in doc_pipeline_source.jsx around line 16400+) is **vanilla JavaScript**, not React. Mouse interactions work but touch interactions on tablets/phones are limited (no proper `pointerdown`/`pointerup` chain, no pinch-to-zoom on annotated regions). For students reading exports on iPads, this is a real degradation from the in-app annotation experience.

**Fix**: extract the annotation runtime as a small standalone JS module with proper pointer-event handling. Ship it alongside the exported HTML as a separate file (or inline if size matters). ~150-250 lines. Risk: changes the HTML export structure, could break custom CSS that targets annotation elements by class — would need a deprecation note.

#### Resource toggle UX complexity

13+ resource toggles in a single panel section is a complexity cliff. Users have to know which resource types they generated and which they want in the export. New users get overwhelmed. **Possible fix**: auto-detect which resource types exist in the current history (`responses`/`generatedContent`) and grey out unused ones. Currently all 13 are always shown. ~40 lines. UX win for new users without affecting power users.

#### Submission encryption undocumented

The May 11 2026 submission-encryption feature requires `cfg.classPublicJwk` set up at the class level. Not documented in the About modal feature catalog. Users who don't set up a class public key have dead code paths firing on submission attempts. **Fix**: either document it in `view_info_modal_source.jsx` feature catalog or gate the submission encryption UI behind a feature flag that defaults off until the class key is configured. ~20 lines.

### Tier 3 (high merit, high effort or speculative)

#### LMS export validation against real LMSes

The QTI, IMS, SCORM, Canvas, and Blackboard export paths exist but it's unclear whether they've been validated against actual LMS imports. SCORM in particular is notoriously finicky (manifest.xml schema variations, content packaging quirks across LMS versions). **Fix**: write a small validation harness that imports an AlloFlow-exported package into a Moodle dev instance (Moodle is free, has SCORM/QTI import) and verifies the content lands correctly. Out of scope for an audit, in scope for a "validate before claiming" effort. ~1-2 sessions.

#### Output-renderer unit tests

`generateResourceHTML` is a 14-type switch statement producing HTML per resource type. Each branch is testable in isolation. No tests exist. The same approach we just took for PDF pipeline pure helpers (`_test_pdf_helpers.cjs`) would apply here. **Fix**: copy each resource-type renderer into a test file, write fixtures + snapshot assertions. ~1 session for first pass. Catches regressions when the next May-style expansion lands.

#### Theme generator quality grounding

`generateCustomExportStyle` accepts a free-form prompt and asks Gemini to write CSS. No constraint on the output, no contrast validation, no font fallback safety. A user prompt of "make it look like Sailor Moon" returns whatever Gemini writes — potentially WCAG-failing colors, missing fallback fonts, malformed selectors. **Fix**: pipe Gemini's output through a CSS validator + WCAG contrast check + auto-fix any failures. Pattern already exists from the PDF pipeline's `sanitizeStyleForWCAG`. ~100 lines. Real quality gain for an existing feature.

### Tier 4 (architectural; deferred)

#### Splitting Document Builder out of doc_pipeline_source.jsx

Currently the 18K-line `doc_pipeline_source.jsx` houses both the PDF remediation pipeline AND the Document Builder's HTML generators (`generateResourceHTML`, `generateFullPackHTML`, `applyStyleSeedToHtml`, etc.). This is the same monolith problem the PDF pipeline has. **Fix**: extract Document Builder generators to a new `doc_builder_source.jsx` (or `output_engine_source.jsx`). Both files import shared `STYLE_SEEDS` from a third file. ~2 sessions if pure helpers are stable (we now have tests for the PDF helpers; we'd need similar tests for the Document Builder generators first). Don't attempt without tests.

#### Authoring layer (out of scope but worth flagging)

The honest user complaint hiding here: "I want to write a worksheet from scratch, not generate one." Document Builder doesn't offer that path. AlloFlow's positioning is "AI-generated content + styled export," which is a coherent product. But there's a real market for "I have my own content, I just want it accessible and themed" — a separate authoring entry point. Out of scope for this audit; flagging as a strategic product question. If you wanted to address it, the cleanest path is: add a "Blank Document" entry that opens a markdown editor whose output flows into the existing renderers via a synthetic `resources` array.

## Out of scope for this audit

- The upstream AI content generation pipeline (`callGemini`, prompt engineering for each resource type) — separate audit needed
- The annotation in-app UI (separate from the export-side annotation runtime)
- Print-CSS rendering quirks (browser-specific, would need cross-browser test rig)
- LMS API integration (Canvas API, Schoology API) — Document Builder produces *files*, not API calls; that's a separate sync layer
- The `export_source.jsx` legacy handlers — they exist but most output goes through the newer `view_export_preview_source.jsx` path

## Architectural observations (not bugs, worth knowing)

- **State proxy pattern.** Document Builder uses the same `window.__docPipelineState` proxy that the PDF pipeline uses. Public functions bind state on every call via `_bindState()`. Works but is the smell I described in the PDF audit doc — necessary because of the CDN-module loading pattern, not because anyone chose it.
- **Tailwind everywhere.** UI consistency is good. No custom CSS framework drift.
- **Module load order matters.** `view_export_preview_module.js` depends on `doc_pipeline_module.js` and `ExportHandlers`. Load failures here would silently break Document Builder. Defensive `loadModule` calls protect against this but make initialization a slow startup hop.
- **Live preview iframe re-renders the whole document on every config change.** For a 30-page lesson pack with embedded images, this can stutter on slow machines. Could be debounced + diffed but that's a UX-perf project, not a correctness gap.
- **No telemetry on which output formats users actually use.** If 90% of exports go to PDF and 1% to Blackboard, that's a maintenance burden case for deprecating low-traffic formats. Without instrumentation we can't know.
- **The `setError`/`pdfBatchSummary` bug fixed May 11 2026** suggests cross-feature state leaks between PDF remediation and Document Builder when both run in the same session. Worth a single-page audit of "what state is shared between these two features and could one corrupt the other."

## Recommendation order

If you want to act on this audit:

1. **CSS sanitization** (Tier 1 — security fix). Real risk, ~30 lines, no functional change.
2. **AI theme generator caching** (Tier 1 — cost fix). Pattern exists from PDF audit work; trivial to reuse.
3. **Preset migration safety** (Tier 1 — data fix). Add schema version + migrations for the recently-added fields before more accumulate.
4. **Auto-grey unused resource toggles** (Tier 2 — UX fix). New-user friction is the cheapest "make it feel better" improvement.
5. **AI theme output sanitization through WCAG check** (Tier 3 — quality fix). Substantial scope but reuses existing `sanitizeStyleForWCAG`.
6. **Output-renderer unit tests** (Tier 3 — refactor enabler). Necessary prerequisite to the Tier 4 split.
7. **Annotation runtime modernization** (Tier 2 — mobile UX). Real student impact but invasive enough to need a deprecation plan.

Tier 4 (the monolith split) waits until tests exist. Don't attempt Document Builder refactor + PDF pipeline refactor in the same session — they share code and a partial refactor leaves the codebase worse than before.

## What I'd NOT recommend pushing

- **A full authoring layer.** Real product question, not a Document Builder bug. Either it's a strategic direction the maintainer commits to (and then it's months of work, not a tier-N audit item) or it's something the user should NOT expect from this tool. Pretending it's a small fix would be dishonest.
- **More resource types.** Already at 14-16; complexity is the cliff, not capability. Adding more without UX simplification makes the modal more overwhelming.
- **Replacing the iframe live preview with virtual DOM diffing.** Speculative win, real complexity, no user complaints visible.

## Methodology note

This audit was generated by Claude Opus 4.7 after exploring the codebase via the Explore sub-agent for breadth coverage, then doing targeted reads of `view_export_preview_source.jsx` and the relevant sections of `doc_pipeline_source.jsx`. The line counts and feature inventory are accurate as of the May 24 2026 commit. The improvement opportunities reflect my assessment, not a user-research-validated list — the user (Aaron Pomeranz) has direct visibility into what teachers actually struggle with and should weight these against that knowledge.

Companion audit: [PDF_PIPELINE_AUDIT.md](PDF_PIPELINE_AUDIT.md) covers the sibling feature.
