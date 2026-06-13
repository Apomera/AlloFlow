# Document Builder — Footnotes & APA Mode Design

**Status:** Design (no code yet). **Source:** workflow wn28xnkgq, 2026-06-13, code-verified against real bytes.
**Two questions answered:** (A) Does the builder support footnotes? (B) Can the left panel be mode-configured (e.g. APA)?

---

## A. Footnotes — current state: **NONE** (verified at byte level)

- **Authoring:** the insert-block registry is a static 21-element array (`view_pdf_audit_source.jsx:9522-9587`, categories layout/content/educational/interactive/media). No footnote/endnote/citation/references/superscript block.
- **docx export:** `_buildDocxBlobFromSpec` (`view_pdf_audit_source.jsx:230-294`) builds `new d.Document({...})` with **no `footnotes:` config, no `FootnoteReferenceRun`**; `_htmlToDocxSpec` (103-223) emits only heading|paragraph|list|table|image; `inlineRuns` carries only `{text,bold,italic,underline,link,br}` — no superscript/`vertAlign`.
- **Tagged-PDF:** `TAG_TO_PDF_ROLE` (`doc_pipeline_source.jsx:14728-14743`) has no `Note`/`Reference`/`BibEntry` role.
- **Closest existing (neither is real footnotes):** (1) the docx IMPORTER already reads `word/footnotes.xml`+`word/endnotes.xml` (`doc_pipeline_source.jsx:4843-4844`) — read-only auditing; (2) AI-grounding citations (`generateBibliographyString`/`processGrounding`, `text_pipeline_helpers_source.jsx:321-375`) — Unicode-superscript markers + a numbered markdown link list, in the CONTENT engine, not the builder; `allobot_source.jsx:560` strips them as noise.

### Staged footnote design (model: numbered notes with anchor+backref collecting into an end-of-doc `<section class="allo-footnotes">`)

- **F1 — HTML anchors + notes section (~1 session, S).** A "Footnote" inline block: superscript anchor `<sup class="allo-fn-ref"><a href="#fn-N" id="fnref-N">N</a></sup>` + auto-appended `<section class="allo-footnotes" aria-label="Footnotes"><ol><li id="fn-N">… <a href="#fnref-N" class="allo-fn-back">↩</a></li></ol></section>`. Only real logic = renumber-on-insert/delete (mirror `renumberCitations`, `content_engine_source.jsx:186-247`). **Works in HTML export + print immediately** (notes section is plain `<ol>`/`<li>` the pipeline already handles). Builds on the static block array + `execCommand('insertHTML')` insert path (`view_pdf_audit_source.jsx:9592+`).
- **F2 — tagged-PDF `Note` role (~½ session, XS).** Add `Note` (+ optionally `Reference`/`BibEntry`) to `TAG_TO_PDF_ROLE` (`doc_pipeline_source.jsx:14728`) + a class→role map so `.allo-footnotes > ol > li` tags as `Note`. Additive; makes F1 PDF/UA-grade.
- **F3 — true OOXML Word footnotes (~1-2 sessions, M, OPTIONAL/DEFER).** `docx@8.5.0` natively supports `footnotes:{[id]:{children:[Paragraph]}}` + `FootnoteReferenceRun(id)` — bundled, unused. Needs an `inlineRuns` run-kind `{footnote:id}` keyed off `.allo-fn-ref`, note-body collection, and a `footnotes` map into `new d.Document(...)`. **Deferred** because the F1 end-of-doc notes section makes docx work with ZERO changes (notes ride the paragraph/list path); F3 is a bottom-of-page polish upgrade.

---

## B. Mode-configurable left panel — current state: **NO conditional display** (but the seam is clean)

- Visibility today is one line (`view_pdf_audit_source.jsx:9658-9660`): a free-text search filter + per-category accordion (`insertBlockOpenCats`). No mode/role/docType/settings flag is consulted. `visible` (9660) is the SINGLE chokepoint feeding the whole render; `_CAT_ORDER`/`_CAT_LABELS` (9589-9590) are single-edit consts.

### Mode-system architecture (two halves, one shared flag)

**(a) Panel reconfiguration** (`view_pdf_audit_source.jsx`): new state `docMode` (default `'standard'`, mirrors `exportPreviewMode` at `view_export_preview_source.jsx:157`); tag blocks with optional `modes:['apa']`/`modeOnly:true` (additive — untagged show in all modes); one filter line after 9660 (`modeFiltered = docMode==='standard' ? visible.filter(b=>!b.modeOnly) : visible.filter(b=>!b.modeOnly||(b.modes&&b.modes.includes(docMode)))`); optional `'academic'` entry in `_CAT_ORDER`/`_CAT_LABELS`.

**(b) Formatting defaults — existing hooks that ALREADY do this:**
- **STYLE_SEEDS** (`doc_pipeline_source.jsx:20995`) is already a style-mode engine: each seed bundles `bodyFont`, colors, `extraCSS` hatch, `wcagLevel`, `promptInstructions`; injects sentinel-wrapped CSS into canonical `accessibleHtml` via `applyStyleSeedToHtml` (17207) → WCAG sanitizer → rides every export (HTML CSS / docx EXPORT_THEMES cssVars 21048-21052 / tagged-PDF themed html). Already has `academic` (21001) + `print` TNR-12pt (21029) seeds.
- **BUILT_IN_PRESETS + applyExportPreset** (`AlloFlowANTI.txt:10628-10632,10700-10707`) — the exact precedent for "one click reconfigures multiple settings" (atomically sets exportConfig+theme+previewMode+refresh; user-savable, schema-migrated).
- **Composable:** a mode toggle sets `docMode` (panel) AND applies a coordinated preset (`exportTheme='apa'` + `format='print'` + config). Only genuinely new state = persisted `docMode` + one filter line.

**Honesty guardrail:** APA mode reconfigures *which blocks appear* + *how content formats* — it NEVER fabricates citation content. Footnote/References/Title-Page blocks are empty teacher-filled templates; AI `promptInstructions` steer formatting only ("format references in APA 7"), not claim generation. Safe for IEP/psych-eval use.

---

## C. APA capability matrix

| APA element | Status | Hook |
|---|---|---|
| Academic serif theme | have | `academic` STYLE_SEED 21001 |
| 1-inch margins (HTML/print) | have | margin buttons `@page{margin:1in}` view_export_preview 236-257 |
| 1-inch margins (docx) | needs-build | no `sectPr` on section (9291) |
| Heading structure (H1-6 → Word styles + PDF roles) | have | `_htmlToDocxSpec:181`, tagger 14728 |
| Times New Roman / Calibri | needs-build | `FONT_OPTIONS` (`ui_font_library_module.js:29`) lacks TNR/Calibri; docx ignores font |
| Double-spacing | needs-build | `.prose` hardcodes 1.6; docx Paragraph has no `spacing` |
| References + hanging indent | HARD | no path emits `text-indent:-0.5in`/docx `indent:{hanging:720}`; needs formatter + alphabetization |
| In-text (Author, Year) | needs-build | only numeric superscript exists; no author-year, no anchor↔ref link |
| Title page | needs-build | no block; `_htmlToDocxSpec:212` DROPS HR/pagebreak |
| Running head + page numbers | HARD (least-supported) | docx has no headers/footers/PageNumber; HTML `@page` counters unreliable; PDF needs Artifact page-number drawing |

### Session-1 slice (HTML/print APA, mostly CSS — the 80%)

1. Add an `apa` STYLE_SEED (TNR 12pt; `extraCSS` for `line-height:2`, `.allo-footnotes/.allo-references li{text-indent:-0.5in;padding-left:0.5in}`, centered bold h1; `promptInstructions` → APA-7 reference formatting).
2. Add Times New Roman to `FONT_OPTIONS`.
3. Add an `apa` BUILT_IN_PRESET (theme apa + format print + config).
4. Add `docMode='apa'` + the one filter line + an "Academic" category surfacing Footnote / In-text Citation / References / Title Page blocks.
5. A References block with hanging-indent CSS (styled by the apa seed); empty template, optionally seeded as an editable draft from `generateBibliographyString`.

Ships: APA-correct **HTML + print PDF** (serif, double-space, 1in margins, hanging-indent refs, working footnotes) — the dominant psych-eval / student-paper cases.

### Design-doc-first (the hard parts; none block Session 1)
docx APA fidelity (`spacing:{line:480}` + `indent:{hanging:720}` + default run font + `sectPr` margins — all `docx@8.5.0`-supported, builder gap only); running head + page numbers (cross-engine, least-supported); true OOXML footnotes F3; in-text↔reference linkage + author-year formatter.

---

## D. Recommendation

Build the **Session-1 slice** first — it is **NOT a design-doc-first big bet**; it's a direct one-session implementation riding four existing hooks (STYLE_SEEDS, BUILT_IN_PRESETS, the `visible` filter chokepoint, the `execCommand` insert path).

**First commit, dependency order:** (1) **F1 footnote block** (standalone value even without APA — the single most-requested missing capability), (2) **F2 tagger `Note` role** (XS; makes F1 a11y-grade), (3) **`apa` STYLE_SEED + TNR font + `apa` preset + `docMode` filter line** (the APA shell).

**Defer to one design doc:** docx APA fidelity, running head + page numbers, true OOXML footnotes. Bundle so priority is set against pilot demand.
