# "Make This Worksheet Fillable" — Design Document

> **Design snapshot note (2026-07-09):** This June 2026 design describes a proposed fillable-worksheet path. Verify the current PDF/Form tagging code, Document Builder behavior, and PDF/UA validation guidance before treating "built," "available," or staged estimates below as current implementation status.

**Status:** Design (no code). **Drafted:** 2026-06-12, with Claude.
**Goal:** a teacher uploads a worksheet (or IEP form, or permission slip) and downloads a version a student or parent can **type into** — real, tagged, keyboard-navigable form fields — without leaving the browser or paying a forms vendor.

---

## 1. Why this is the right moonshot

- **Nobody serves this market.** Form creation is Acrobat Pro territory ($240/yr/seat) or enterprise forms platforms; *accessible* (tagged) form creation is specialist work on top. K-12 lives on printed-and-scanned worksheets precisely because making them digital-fillable is priced out.
- **It completes a story we already tell.** AlloFlow makes documents readable by everyone; fillable makes them *usable* by everyone — a student with dysgraphia types instead of handwrites; a parent completes a permission slip on a phone; a screen-reader user tabs through a worksheet independently.
- **The hard halves are already built** (see §2). What remains is detection + creation, and we control the easiest surface for it.

## 2. What exists today (code-dive findings)

| Capability | Where | State |
|---|---|---|
| **Tagging existing form fields** | `createTaggedPdf` Stage 3: scans page Annots for `/Widget`, creates a `/Form` StructElem with OBJR child per field, assigns StructParent keys | **BUILT** — PDF/UA-correct form tagging, today |
| **Digital-signature safety** | Stage 3 skips form/link annotation edits when `/SigFlags` indicates signatures (byte-range hash would break — parent-signed IEPs) | **BUILT** |
| **Reading filled fields (FERPA-gated)** | AcroForm value extraction, consent-gated safe-by-default (field *names* only without consent) | **BUILT** (dark slice) |
| **Form-fill API** | pdf-lib 1.17.1 `getForm()` — already used read-side; the same API **creates** TextField / CheckBox / RadioGroup / Dropdown | **AVAILABLE** |
| **Typeset path owns its coordinates** | `createTypesetTaggedPdf` draws every line itself — when it renders "Name: ___" it *knows the cursor position* | **THE KEY INSIGHT** |
| Blank patterns in remediated HTML | underscore runs (`____`), `[ ]`/`☐` checkboxes, label-colon-blank shapes survive extraction into `accessibleHtml` | observed; detection not yet built |

**The shape of the build:** detection (find the blanks) → semantics (represent them honestly in HTML) → creation (draw real widgets where we control layout) → overlay (place widgets on original layouts). Each stage ships value alone.

## 3. Staged design

### S0 — Detect blanks → semantic HTML fields (1 session)
A deterministic pass over `accessibleHtml`:
- **Text blanks:** runs of ≥3 underscores (or `…/....` runs) → `<label>` + `<input type="text" data-allo-field="text">`, label text taken from the preceding phrase ("Name:", "Date:", question stems).
- **Checkboxes:** `☐`, `[ ]`, `( )` glyph patterns in list-ish contexts → `<input type="checkbox">` with the following text as its label.
- **Review-first, never silent:** a panel lists every detected blank ("14 text fields, 6 checkboxes") with per-item accept/reject and editable labels — the image-review stepper pattern, reused. Nothing converts without the teacher seeing the list.
- **Instant payoff:** the **HTML export becomes fillable in any browser** (and prints with proper blanks). Every other lane inherits the semantics: audio reads "Name, fill-in field"; translation/plain-language carry labels through their parity checks (`input` joins the structural-skeleton tag set).
- Verification: deterministic — field count in === count out through every later transform; axe label rules already police label↔field association.

### S1 — Real AcroForm fields in the typeset tagged PDF (1–2 sessions)
In `createTypesetTaggedPdf`, when the renderer hits a `data-allo-field` element it draws the label text, then **creates a pdf-lib field at the live cursor position** (TextField sized to the blank's width / CheckBox at glyph size) instead of drawing underscores. Then **Stage 3 tags it automatically — zero new tagging code**, because widget tagging already exists. Field names derive from labels (`name`, `date`, `q3_answer`), de-duplicated; **tab order = reading order** (field creation order follows the render walk). The declaration gate extends naturally: fields present → fields must be tagged, or no PDF/UA claim.
- Output: "📝 Fillable tagged PDF (generated layout)" beside the existing typeset button.

### S2 — Overlay on the ORIGINAL layout (2 sessions, born-digital only)
For born-digital PDFs, pdf.js text items give the **page coordinates of every `___` run**. Place a TextField widget over each blank's rect on the *original* page (same byte-preserving pattern as Stage 4's MCID wraps), tag via existing Stage 3, re-verify, evidence-gate. Visual fidelity preserved — this is the IEP-form dream. The signature guard already protects the cases that must not be touched.
- Risk: coordinate edge cases (rotated pages, multi-column) — mitigate by S2 shipping behind the same review panel with a rendered-preview confirm.

### S3 — Scanned worksheets: **declared out of scope** (honestly)
Locating blank *lines* in a scan is computer vision, not text processing; a wrong field placed over handwriting is worse than none. The honest path for scans: OCR → typeset → S1. The button copy says so.

## 4. Guardrails
1. **Review-first conversion** — the teacher approves the field list; counts shown; each rejectable.
2. **Label-quality floor** — a field with no derivable label gets `aria-label="Fill-in field N"` *and* a review-panel flag, never silence.
3. **Signature preservation** — existing Stage 3 guard applies to S2 unchanged.
4. **FERPA posture** — an empty form is just a form; *filled* forms carry PII, and the existing consent-gated extraction + CONFIDENTIAL filename conventions already govern that side.
5. **Tab order = reading order**, verified in the golden (walk field order vs. struct order).
6. **Evidence gate** — PDF/UA declaration requires every created widget to be reachable in the tag tree (extend the orphan walk to count untagged widgets).

## 5. Test plan
- Golden S0: fixture worksheet html (underscores, checkboxes, edge cases: underscores inside words, table-cell blanks) → exact field counts, label derivation, reject-path byte-identity.
- Golden S1: typeset a fielded fixture → pdf-lib re-open: field count, names, types; struct walk: every widget has a /Form StructElem + OBJR; declaration logic.
- S2 adds a coordinate-tolerance golden on a known fixture PDF.
- veraPDF clause-diff run on a fielded output (forms touch PDF/UA-1 clauses the corpus hasn't exercised).

## 6. Open questions (for Aaron)
1. **Scope of S0 patterns:** underscores + checkbox glyphs first; do we also want multiple-choice circles (`A. B. C.` → radio group) in v1? (Radios are higher-risk to mis-group.)
2. **Word export:** should S0 fields also become Word content controls in the docx builder, or is fillable-PDF + fillable-HTML enough initially?
3. **Naming:** "Make fillable" vs "Digital worksheet" — teacher-facing wording.
4. Demo-priority: is a fillable permission slip a better Jim/Garry artifact than a worksheet? (Same machinery, more universally legible use case.)

## 7. Success criteria
- A real worksheet converts with ≥90% of blanks detected, zero false fields after review, and the fillable tagged PDF passes the full gate stack (axe + EA + struct walk + veraPDF spot-check).
- A keyboard-only user completes the worksheet end-to-end (tab order correct, every field labeled).
- A parent on a phone completes and prints/saves a permission slip without instructions.
