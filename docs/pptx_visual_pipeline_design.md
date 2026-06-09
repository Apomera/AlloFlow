# PPTX Visual Remediation Pipeline — Design Exploration

**Status:** design only (2026-06-09). Nothing here is built. Companion to the
Office-coverage work (deterministic DOCX/PPTX audit + accessible Word export,
commit `1cbafcf3`) which deliberately deferred PPTX *output* and visual analysis.

**The ask (Aaron):** a PowerPoint pipeline where Gemini reviews the slides
*visually*, reconstructs an accessible deck from that visual analysis, paired
with Imagen / image-to-image editing to create visuals — and possibly
extraction of the original visuals.

---

## 1. The two hard constraints (read first)

**C1 — There is no client-side PPTX renderer.** Nothing in a browser can
rasterize a .pptx slide to pixels. "Gemini reviews the slides visually"
therefore needs slide *images* from somewhere:

| Source of slide pixels | Reality |
|---|---|
| Render .pptx in-browser | Does not exist (no JS PPTX renderer with usable fidelity). Violates zero-backend if server-rendered (LibreOffice). |
| Send the .pptx bytes to Gemini Vision inline | Public API does not accept Office MIME types inline (verified 2026-06-09 — this is exactly why the deterministic Office audit exists). Canvas's internal endpoint MAY differ — **needs one explicit smoke test via the AI Diagnostics panel before designing around it.** |
| **Teacher exports the deck to PDF** (File → Export in PowerPoint, one step) | **Works today.** Slides arrive as PDF pages; the existing Vision audit + scanned/per-word OCR + tagging pipeline applies per-slide unchanged. |
| Embedded media extraction via jszip | **Works today** (jszip already loaded; `ppt/media/*` holds the original images at full quality). Gets the *visuals* without rendering the *layout*. |

**C2 — Reconstruction is generative, and slides are the worst case for
fabrication.** Slide text is sparse; layout carries meaning (timelines, cycles,
SmartArt). A model "reconstructing based on visual analysis" is *summarizing a
picture*, and the structured-visual work (d3048e9c) already established the
honest pattern: verbatim/no-invent prompts, shape validation, **always keep the
original image as a sibling**, and a teacher accept/reject gate. A PPTX
pipeline inherits ALL of that or it ships a fabrication machine.

---

## 2. What the pipeline should be (tiers, safest-first)

### T0 — Ship-now guidance (copy only, ~zero code)
In the PPTX flow, tell the teacher the honest best path for *visual* decks:
"For slide decks where the layout matters, export to PDF in PowerPoint
(File → Export) and run the PDF through AlloFlow — every slide gets the full
visual audit, OCR, and tagging treatment." The deterministic text path
(already live) remains for text-heavy decks.

### T1 — Real-visuals extraction + accessible HTML deck (M)
Deterministic core, AI only for description:
1. **jszip extraction**: `ppt/media/*` images + per-slide XML (`p:sp` text
   runs, reading order from `p:spTree` order, `p:notesSlide` speaker notes,
   existing alt text in `p:cNvPr descr` — PowerPoint stores alt there).
2. **Vision alt-text per extracted image** (one call per image, reusing the
   image-description prompt + editable review panel — same UX as the PDF
   image panel). Images that already carry author alt keep it (flag for
   review, don't overwrite).
3. **Reconstruct an accessible HTML deck**: one `<section>` per slide, slide
   title → `<h2>`, body text in source order, real extracted images with alt,
   speaker notes as visible-on-request text. This is *assembly*, not
   generation — the only AI content is image descriptions, clearly scoped.
4. Output: accessible HTML (gold artifact) + the existing **accessible Word
   export** works on it for free.

### T2 — Accessible .pptx OUTPUT via pptxgenjs (M)
The in-kind output, mirroring the accessible-DOCX move:
- pptxgenjs (CDN UMD — verify mirrors + API the same way docx@8.5.0 was
  validated end-to-end in node before wiring) writes real .pptx with: slide
  **titles** (the #1 PowerPoint a11y checker item), **alt text** on every
  image, explicit **reading order** (insertion order = z/reading order),
  speaker notes, and a contrast-checked theme (reuse the deterministic
  contrast math).
- Honest toast: "Verify in PowerPoint: Review → Check Accessibility" — same
  pattern as the Word export pointing at Word's checker.
- Scope honestly: **rebuilt** deck (clean accessible layout), not a visual
  clone of the original. Original deck ships alongside; nothing destroyed.

### T3 — True visual analysis (L; gated on the C1 smoke test)
Only after T1/T2 are stable:
- Slide images via the teacher's PDF export (each PDF page = one slide) OR
  Canvas-inline pptx if the Diagnostics smoke proves it.
- Per-slide Vision pass answers *specific, checkable* questions: reading
  order of regions, text baked into images (→ OCR + real text), color-only
  meaning (→ add labels), decorative vs content images, SmartArt/diagram
  semantics (→ the structured-visual table/list reconstruction path with its
  accept/reject gate).
- Each finding maps to a concrete edit in the T1 reconstruction — never a
  free-form "rewrite this slide."

### T4 — Imagen / image-to-image (L; opt-in, labeled, last)
Two genuinely useful, honesty-compatible uses:
- **Image-to-image contrast/legibility repair**: a chart with 1.8:1 gray-on-gray
  labels, regenerated with compliant contrast while preserving content. High
  value, but output must be verified against the original (text-equality via
  OCR diff) — fabrication risk is real and the detectFabrication pattern
  applies.
- **Decorative generation**: replacing a low-quality decorative image. Low
  risk (decorative = no content claim).
Hard rules carried from Lumen + the AI-hints control plane: **default OFF**,
teacher-only toggle + consent, every generated/edited asset **provenance-
labeled in the deck itself** ("AI-generated/AI-edited image — AlloFlow", like
Lumen's synthetic ◇ marks), original always retained, zero API traffic when
off. Model surface: `callImagen` exists in deps; image models are
Canvas-internal preview names (work in Canvas, 401 on public deploy — this is
a **Canvas-first** feature; see feedback_canvas_preview_models_real).

---

## 3. Risks ledger (what kills this if ignored)

1. **Fabrication** — reconstruction invents content a slide never had.
   Mitigations: T1 is assembly-only; T3 findings are checkable edits;
   detectFabrication (warn-only) on any AI-rewritten slide text; teacher gate.
2. **FERPA/PII** — slides routinely contain student names/photos. The
   extracted-media panel must carry the same consent framing as Export-Backup;
   Imagen editing of photos of *people* should be refused outright.
3. **Cost** — per-slide Vision + per-image calls add up (a 40-slide deck ≈
   40-80 calls at T3). Batch confirm dialog with call estimate (existing
   pattern), deterministic-first always.
4. **Fidelity overclaim** — "reconstructed" must never be presented as a
   visual clone. Copy discipline: "rebuilt for accessibility," original
   attached.
5. **Maintainer load** — every tier needs its golden master before the next
   tier starts (T1: spec-extraction tests on the jszip parser + deck
   assembler; T2: node-validated pptxgenjs build like the docx probe; T3/T4:
   fixture-based e2e).

## 4. Recommended order

T0 (copy, today) → T1 (the real backbone: extraction + assembly + alt-text
review) → T2 (.pptx out — the headline teachers feel) → smoke-test C1 in
Canvas → T3 → T4 last and only opt-in. Each tier is independently shippable
and independently honest.
