# AlloStudio — Design Doc (v0.3, 2026-07-02)

**Status:** **Milestone A BUILT** (same day, Aaron-approved go-ahead): `studio_module.js`
(pure event-sourced core + Tier-2 editor, plain JS on the Video Studio module
pattern), wired into the app (lazy loadModule + CDNModuleGate + Educator Hub card
+ Ctrl+K command), tagged-PDF export riding `createTypesetTaggedPdf`, 39 pure-core
tests in `tests/allostudio_core.test.js`. LOCAL/UNCOMMITTED; Canvas smoke pending.
Tier 1 crop also shipped (see §9). Follow-on Studio polish now includes live
accessibility preflight, expanded templates, worksheet/process exports, layout
helpers, image fit, and export fidelity fixes. Milestones B/C not started.
**Owner:** Aaron. **Positioning decision made in session 2026-07-02.**
**v0.2:** Aaron resolved the §11 open questions same day — name locked (for now),
teacher + student surface, student-visible process timeline, MVP template set
chosen. See §11 (now "Decisions").
**v0.3 build notes (what Milestone A actually shipped):** template picker (core
§11 templates, ledger-seeded); object editor (text/shape/image; drag move +
corner resize + arrows/Shift+arrows/Delete keyboard grammar; inline text edit);
reading-order panel with ↑/↓ (design law 1); properties panel (frame, role→tag,
colors, alt text + decorative); alt gate blocking all exports with per-image Fix
jump (law 3); exports = tagged PDF / accessible HTML / PNG; save-load
`.allostudio.json` with validation; undo/redo as ledger navigation; Process tab
with scrubber, per-actor summary, ≈active-minutes, honesty line, student/teacher
framing toggle.
**Follow-on polish shipped:** live accessibility preflight (alt, contrast, small
text, bounds, empty placeholders, reading-order review), expanded classroom
template gallery, worksheet JSON export, process-notes markdown export, alignment
and duplicate controls, image fill/fit controls, and PNG/HTML image-fit fidelity.
Deliberately deferred to B/C: AI generate/suggest, raster brushes, full
worksheet→doc_pipeline handoff, in-editor image crop, multi-select, rotation.

---

## 1. What this is (and is not)

A flyer / worksheet / digital-art studio inside AlloFlow: a Canva/Figma-style
**object editor** for teachers (flyers, posters, bespoke worksheets) and students
(digital art practice), with an **AI-action provenance ledger** so art teachers can
see what a student did themselves vs. what AI did.

**It is NOT an "open-source Photoshop."** No raster filter stack, no CMYK, no
frequency separation. The competitor is **Canva for Education**, and the moat is
the one thing Canva and Adobe Express structurally don't do:

> **Every export is born accessible.** The scene graph carries required alt text,
> explicit reading order, and real text (never text-as-pixels), and exports run
> through AlloFlow's existing tagged-PDF/HTML pipeline. "Make the flyer and it's
> already Title II-compliant" is the pitch.

Secondary moats, both inherited from AlloFlow's posture:
- **FERPA-clean**: everything client-side, documents live in local save files.
- **Free**, vs. per-seat Canva/Acrobat pricing districts are staring down for the
  2027/2028 ADA Title II deadlines.

**Strategic guard-rail:** the born-accessible claim is only credible after the PDF
pipeline credibility work (UMaine reliability bar) is banked. Build order reflects
that — see §10.

---

## 2. Scope tiers

| Tier | What | Effort | Notes |
|---|---|---|---|
| **1** | Crop images in Document Builder | **SHIPPED 2026-07-02** | §9. Also becomes the studio's crop tool. |
| **2** | Flyer/worksheet studio (object editor: text, shapes, images, templates) | Weeks of sessions | The core product. Worksheets can feed back into doc_pipeline as structured content. |
| **3** | Digital-art mode (raster layers, brushes, pointer pressure) | Larger | Deliberately constrained brush set (few brushes, layers, eraser, fill). Where scope creep lives — gate behind Tier 2 shipping. |
| **AI** | Generate / assist | Small–medium | `callImagen` already exists (imagen-4.0-generate-001, rate-limit-aware queue — reused by figure regeneration + anchor charts). Vision feedback via `callGeminiVision` (**3-arg, prompt-embedded JSON only — no native responseSchema**, per beat-Adobe-3 constraints). No spike needed for generation; "AI edit" = regenerate-with-prompt or vision-guided suggestions, NOT inpainting. |

---

## 3. Architecture

Follow the **Video Studio precedent**: a lazy-loaded module view (popup editor),
not a STEM-Lab plugin. New files:

```
studio_source.jsx          → studio_module.js        (editor view; BUILD WATCHER pair)
studio_core.js             (PURE: scene ops, ledger reducer, geometry — no DOM, fully unit-testable)
studio_export.js           (scene graph → accessible HTML/SVG → existing doc_pipeline export seams)
tests/studio_core.test.js  (golden master + property tests on the pure core)
```

Rendering: **DOM/SVG scene, not `<canvas>`, for Tier 2.** Objects are absolutely-
positioned DOM/SVG nodes → free hit-testing, free text editing (contenteditable
per text object), free screen-reader access, and the export is nearly the
runtime representation. Tier 3 raster layers are `<canvas>` elements *inside*
the same scene graph (a `raster` object type), so painting doesn't change the
architecture.

Rules learned elsewhere in this codebase that apply here:
- Edit `_source.jsx` only (build watcher compiles); new JSX components go in
  `KNOWN_COMPONENTS`; register in `PLUGIN_FILES`/mirror as applicable.
- No free `t()` in CDN modules (`check_render_refs` blocks it) — alias via ctx.
- Icons must exist in `window.AlloIcons` (both copies).

---

## 4. Scene graph (the document)

```jsonc
{
  "format": "allostudio",
  "version": 1,
  "id": "st_8f3a…",
  "title": "Fall Book Fair Flyer",
  "canvas": { "preset": "letter-portrait", "w": 816, "h": 1056, "dpi": 96,
              "background": { "fill": "#ffffff" } },
  "objects": [                      // ARRAY ORDER = explicit reading order (a11y-first)
    { "id": "o1", "type": "text",
      "frame": { "x": 48, "y": 40, "w": 720, "h": 90, "rotation": 0 },
      "z": 10,
      "role": "heading", "level": 1,             // maps to <h1> / PDF H1 tag on export
      "content": { "runs": [{ "text": "Book Fair!", "style": { "font": "…", "size": 64, "color": "#1e3a5f" } }] } },
    { "id": "o2", "type": "image",
      "frame": { "x": 48, "y": 150, "w": 340, "h": 255 },
      "z": 5,
      "alt": "Students reading under a tree",     // REQUIRED unless decorative:true
      "decorative": false,
      "src": "data:image/jpeg;base64,…",
      "crop": { "x": 0, "y": 120, "w": 1200, "h": 900, "nw": 1200, "nh": 1600 },
      "provenance": { "origin": "upload" } },     // upload | ai | library | import
    { "id": "o3", "type": "shape", "shape": "rect", "decorative": true, "…": "…" },
    { "id": "o4", "type": "raster",               // Tier 3 paint layer
      "frame": { "x": 0, "y": 0, "w": 816, "h": 1056 },
      "checkpoint": "data:image/png;base64,…" }   // latest snapshot; strokes in ledger
  ]
}
```

Design laws:
1. **Reading order is the array order**, always visible/editable in a panel
   (drag list). Z-order (`z`) is separate. Never inferred at export time — this
   is the lesson from the reading-order repair work: don't guess later what the
   author can state now.
2. **Text is text.** No rasterized text objects. Export emits real `<h1>/<p>`
   or tagged PDF text; the studio never bakes words into pixels.
3. **Alt or decorative — no third state.** Export blocks (soft-nag → hard gate,
   same pattern as doc_pipeline's alt-text handling) until every image is
   either alt-texted or explicitly decorative.
4. **Contrast is checked live** for text runs against their effective
   background (reuse the AA matrix approach from docsuite theme work), surfaced
   as a non-blocking badge.

## 5. Provenance ledger ("version history for art")

**The key design decision: attribution by construction, not detection.** AI
operations enter through our own seams (`callImagen`, vision suggestions), so
we know with certainty which ops were AI. We never *classify* pixels.

```jsonc
{
  "ledger": {
    "version": 1,
    "ops": [
      { "seq": 1,  "ts": 1751477000000, "actor": "user",   "type": "object.add",   "target": "o1", "payload": { /* full object */ } },
      { "seq": 2,  "ts": 1751477020000, "actor": "user",   "type": "object.move",  "target": "o1", "payload": { "from": {"x":40,"y":40}, "to": {"x":48,"y":40} } },
      { "seq": 3,  "ts": 1751477090000, "actor": "ai",     "type": "image.generate", "target": "o2",
        "payload": { "prompt": "students reading under a tree, flat illustration", "model": "imagen-4.0-generate-001" } },
      { "seq": 4,  "ts": 1751477150000, "actor": "import", "type": "image.insert", "target": "o5", "payload": { "filename": "photo.jpg" } },
      { "seq": 5,  "ts": 1751478000000, "actor": "user",   "type": "stroke.batch", "target": "o4",
        "payload": { "tool": "brush", "count": 41, "bbox": {"x":100,"y":200,"w":250,"h":180} } }
    ],
    "checkpoints": [ { "atSeq": 50, "objects": "…full scene snapshot…" } ]
  }
}
```

Mechanics:
- **Event-sourced document**: the scene graph is the fold of the ops; the
  editor keeps both (scene for speed, ledger for truth). The reducer lives in
  `studio_core.js` and is pure → property-testable (replay(ledger) === scene).
- **Checkpoints every N=50 ops** (and a raster checkpoint per paint session) so
  replay/scrubbing is seek-then-apply, not replay-ten-thousand-strokes.
- **Stroke batching**: pointermove strokes coalesce into `stroke.batch` ops
  (count + bbox + tool), with the raster checkpoint carrying the pixels.
  Full-fidelity per-point storage is a non-goal (size).
- **Actor taxonomy is closed**: `user | ai | import`. Imports are honestly
  labeled — we cannot see inside a pasted image, and we say so.
- **Undo/redo = ledger navigation** (with an `undone` fence), so history and
  undo can't diverge — retrofitting event-sourcing later is miserable, so the
  ledger goes in from the first commit.

"Process" tab (visible to BOTH teacher and student, per §11 — the student sees
their own timeline as a portfolio):
- Scrubable timeline (Procreate-style replay, but structured and inspectable).
- Per-actor summary: "312 user ops · 2 AI generations · 1 imported image", with
  AI ops listed with their prompts, and time-on-task derived from op gaps.
- **Honesty line printed in the UI** (scientific-integrity rule): *"This shows
  what happened inside this editor. It does not detect AI content in imported
  images."* Never market this as AI detection.

FERPA: the ledger lives **inside the local save file** (`.allostudio.json`,
same versioned-format precedent as `.alloflow.json` resume). Prompts typed by
students are in the ledger → the save file is student work product; no cloud
egress beyond the AI calls themselves (which are already disclosed app-wide).
Replay is also a pedagogy feature (process portfolios), not just oversight.

---

## 6. Export paths (the moat)

| Target | Route | Notes |
|---|---|---|
| **Tagged PDF** | scene → accessible HTML (semantic order = object array; alt/decorative enforced) → existing tagged-PDF exporter | The headline. Canva's PDF export is untagged; ours rides the pipeline that already does PDF/UA work. |
| **Print/PDF (visual)** | print CSS of positioned scene | Flyers need visual fidelity; the tagged variant carries the semantics. |
| **PNG/JPEG** | scene rasterized to canvas | Social/LMS thumbnails. |
| **Single-file HTML** | reuse offline-export refit | Positioned divs + embedded assets; real text, real alt. |
| **Worksheet bridge** | current: worksheet JSON export from title/instructions/numbered prompts; later: generated-content history item | A worksheet made in the studio can join the Document Hub export pack (quiz keys, translations, TTS — for free) once the full handoff lands. |

Export preflight panel (reuses house patterns): alt-text gate, contrast
warnings, small-text warning, empty-placeholder review, reading-order review
prompt, oversized-asset warning.

---

## 7. Editor accessibility (the editor itself, not just its output)

- Every object focusable (roving tabindex in reading order); arrows move
  (Shift = resize, Ctrl = fine), same key grammar as the Tier 1 crop modal.
- All canvas-tool actions available from an object list panel (DOM), so a
  keyboard/SR user can do everything drag can do except freehand paint.
- Live region announces move/resize/reorder results.
- High-contrast selection chrome; respects app theme (☀️/🌙/👁 remap system).

---

## 8. AI integration (facts as of 2026-07-02)

- **Generation exists today**: `callImagen` (imagen-4.0-generate-001) with
  rate-limit queue — reuse as "Generate image" for a selected frame. Every call
  writes an `actor:"ai"` ledger op with the prompt.
- **Vision feedback exists today**: `callGeminiVision(prompt, base64, mime)` —
  3-arg, **prompt-embedded JSON only** (no responseSchema anywhere in the app).
  Use for critique/suggestions ("what would make this poster more readable?"),
  layout lint, and alt-text drafting (teacher approves; AI-drafted alt is
  flagged as such in the ledger).
- **No inpainting/region edit** in the current stack — "AI edit" is
  regenerate-with-revised-prompt on an image object (old src retained by undo).
- **AI-gating**: follow the STEM-catalog AI-gating conventions (deterministic
  first, AI opt-in, disclosed).
- Canvas-only caveat: all AI paths are Canvas-runtime only, not CI-testable —
  keep them behind seams so the pure core tests never touch them.

---

## 9. Tier 1 (shipped 2026-07-02): crop in Document Builder

Generic image crop in the builder preview iframe — click any `<img>` → floating
"✂ Crop" → drag-select modal (pointer events; arrows nudge, Shift+arrows
resize; Esc closes) → `img.src` replaced with cropped pixels.

Decisions that carry forward into the studio:
- **Privacy invariant**: the pre-crop original NEVER enters the DOM (teachers
  crop to *remove* content; an attribute-stashed original would ship the
  cropped-out pixels in every export). Originals live in
  `window.__alloBuilderCropOriginals` (session-only, FIFO-capped 30) keyed by
  `data-allo-crop-id`; exports carry only the crop. The studio inherits this:
  originals in the save file are fine (local), but **exports never carry
  cropped-away pixels**.
- Format rule: JPEG only when the source was JPEG; else PNG (alpha survives).
- All crop chrome tagged `data-allo-crop-ui`, swept at every serialization seam
  (`_removeBuilderCropUi` + write-back clone-strip); floating button self-expires.
- Tests: `tests/builder_image_crop.test.js` (16 — math mirror, format rule,
  FIFO store, anti-drift pins incl. the privacy invariant).
- **Canvas smoke pending** (like all sibling sessions' work).

## 10. Sequencing

1. **Now → pilot window**: nothing further; the PDF-reliability work owns the
   calendar (born-accessible claim depends on it).
2. **Milestone A (studio MVP)**: `studio_core.js` (scene ops + ledger reducer,
   pure, tested) + Tier 2 editor with text/shape/image, teacher + student modes
   (§11), the §11 template set plus expanded classroom templates, tagged-PDF/PNG
   export, alt gate, live preflight, worksheet JSON export, and process-notes
   export. No AI, no raster.
3. **Milestone B**: AI generate + vision suggestions (ledger-attributed),
   full worksheet→doc_pipeline handoff, template gallery refinements.
4. **Milestone C (Tier 3)**: raster object + constrained brush set + pressure +
   process-replay tab (the ledger exists since A; this adds the scrubber UI —
   shown to BOTH roles per §11: teacher assessment view and student portfolio
   view are the same component with different framing copy).
5. **Later / explicitly deferred**: collaboration/live-session broadcast,
   student galleries, inpainting-style AI edit, animation.

## 11. Decisions (resolved by Aaron, 2026-07-02)

1. **Student surface: BOTH teacher and student.** Implementation note: MVP is
   in-app for both roles (student mode = same editor, student-appropriate
   chrome). Embedding the full studio inside the exported single-file student
   HTML is **deferred** — the editor is too large for that payload; art-class
   use is in-app, with `.allostudio.json` save files as the take-home artifact.
   FERPA consequence now in scope for MVP: student save files contain typed AI
   prompts (they are student work product; local-only, disclosed in the UI).
2. **Name: "AlloStudio", locked for now** (Aaron may revisit before go-live;
   avoid baking the string into save-format fields — `"format": "allostudio"`
   stays, since format ids are invisible branding).
3. **MVP template seed set (3 + blank):**
   - **Event flyer** (letter portrait: hero heading, image frame, details
     block, footer strip) — the canonical teacher job-to-be-done.
   - **Worksheet** (title, instructions callout, numbered question blocks with
     answer space) — the highest-synergy template; its question objects are
     what the §6 worksheet→doc_pipeline bridge maps.
   - **Student poster / "About Me"** (portrait; big title, 2–3 image frames,
     caption text) — first-week middle-school staple, works for both classroom
     content posters and art assignments.
   - **Blank canvas** (letter portrait/landscape + square presets) ships as a
     zeroth option, not counted as a template.
   Follow-on gallery now also includes exit ticket, vocabulary poster, lab
   safety poster, checklist, class newsletter, book report poster, CER
   organizer, and compare/contrast organizer.
4. **Ledger visibility: student-visible.** The process timeline is the
   student's own portfolio view (same scrubber as the teacher's Process tab).
   Framing in UI copy: "your process," not "monitoring." The §5 honesty line
   appears in both views.
