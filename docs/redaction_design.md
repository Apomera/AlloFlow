# Redaction — design & safety contract (2026-06-15)

Status: **core infrastructure shipped + unit-tested; UI deferred (needs maintainer/visual testing).**

## The one rule that matters

**Redaction must REMOVE the content, never cover it.** A black box drawn over text, or text hidden
with CSS (`display:none`, white-on-white, `visibility:hidden`), leaves the characters in the file —
still copy-pasteable, still machine-readable, still in the PDF's text/extraction layer. For a teacher
redacting a student's name, SSN, DOB, or diagnosis from an IEP before sharing, a fake redaction is a
**FERPA breach that looks done**. So the only acceptable redaction truly deletes the characters and is
**verified** to be gone.

## What shipped (the core)

Three pure, module-scope helpers in `doc_pipeline_source.jsx`, exported from the factory
(`redactDocument`, `redactDocHtml`, `redactionLeaks`):

- **`redactDocHtml(html, targets, opts)` → `{ html, count, redacted }`** — truly removes every
  occurrence of each target from the document's **text nodes** and **text-carrying attributes**
  (`alt` / `title` / `aria-label` — PII hides there too), replacing each with a marker (default
  `[redacted]`). Targets are matched case-insensitively (configurable) with **flexible whitespace**,
  and **longest-first** so a full PII string is removed before any substring of it. `[redacted]` is a
  fixed marker: unlike a length-matched bar it does **not leak the original length**, and it reads as
  "redacted" to a screen reader.
- **`redactionLeaks(html, targets)` → `{ clean, leaks }`** — the **safety verifier**. Re-extracts ALL
  readable text (normalized `textContent` + the same attributes) and confirms no target survives
  *anywhere*. This is what catches a target the per-node pass could not remove (e.g. split across
  elements, `John <b>Doe</b>`): the verifier reads the concatenated text and flags it.
- **`redactDocument(html, targets, opts)` → `{ html, count, redacted, clean, leaks }`** — the SAFE
  one-call API: redact **then verify** in the same call. **The UI must treat `clean === false` as a
  hard block** — a redaction that doesn't verify clean is worse than none.

Covered by `tests/redaction_core.test.js` (10 tests): true removal, all-occurrences/case variants,
attribute scrubbing, whitespace flexibility, longest-first, no-collateral, no-op on empty, clean
verification, **leak flagged when content survives**, attribute-leak detection.

## The critical architectural limitation (read this before wiring the UI)

AlloFlow has two very different deliverables:

| Deliverable | Built from | Does HTML redaction reach it? |
|---|---|---|
| Accessible **HTML**, **Word (DOCX)**, **PPTX**, **EPUB/DAISY** exports | `accessibleHtml` | ✅ yes — these are (re)built from the redacted HTML |
| A **re-rendered** PDF (print/save-as-PDF of the HTML) | `accessibleHtml` | ✅ yes |
| The **"Tagged PDF"** download | the **ORIGINAL uploaded PDF bytes** + an injected tag tree | ❌ **NO** — the original glyphs are untouched |

So redacting `accessibleHtml` protects every HTML-derived export **but not the tagged PDF**, whose
visual+text layer is the original file. **The UI must, when any redaction is active:**
1. **Disable or redirect the "Tagged PDF" download**, OR force it to re-render from the redacted HTML
   (losing original-byte fidelity but guaranteeing removal), and
2. Tell the teacher plainly: *"Redaction applies to the accessible/remediated copy. Do not distribute
   the original PDF — it still contains the text."*

## The UI workflow (deferred — needs visual/maintainer testing)

1. Teacher selects text in the preview (or picks from the PII-detector's confirmed list — see the
   PII detect-and-confirm design).
2. Collect the selected strings as `targets`.
3. `const r = redactDocument(accessibleHtml, targets)`.
4. **If `!r.clean`** → show `r.leaks`, do NOT apply, explain that some occurrences span elements and
   need a manual edit (or widen the selection).
5. If clean → set `accessibleHtml = r.html`, mark the doc "redacted", and apply the tagged-PDF guard above.
6. Re-run the export from the redacted HTML.

## The harder follow-up: redacting the ORIGINAL PDF bytes

True excision from the original content stream (so the *original* PDF can be safely distributed) is a
separate, harder piece: `pdf-lib` draws onto a page but does not parse/rewrite content streams at the
glyph level, so it cannot delete specific glyphs + reflow. Options, in increasing fidelity/effort:
- **(simplest, recommended first)** Don't redact the original at all — make the redacted **re-rendered
  HTML→PDF** the only PDF deliverable when redactions exist (the table above).
- Rasterize the redacted page region (draw the page to canvas, paint the box, re-embed as an image) —
  removes the text under the box but loses selectability/searchability for that region.
- A content-stream-aware excision (parse the stream, drop the `Tj`/`TJ` operators in the region, redraw
  a box) — most faithful, most work, needs a stream parser pdf-lib doesn't provide out of the box.

None of these change the shipped core; they're about *which* PDF the teacher hands out.
