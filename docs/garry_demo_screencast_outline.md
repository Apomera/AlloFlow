# Garry Demo Screencast — Outline

**Goal:** demonstrate to Garry (UMaine) that the AlloFlow PDF remediation pipeline works **consistently** on documents UMaine actually uses. The pitch is "works every time" — show, don't tell.

**Length:** 5–8 minutes. Tight. One full walkthrough on one document + montage of the other two.

**Audience:** Garry first; he may forward to Paul Cochrane or the UMaine accessibility committee — assume any frame could be paused and screenshot.

---

## Pre-record checklist (15 minutes)

- [ ] Pick the 3 demo PDFs. Recommended mix:
  - **PDF 1 — ordinary UMaine form/syllabus** (representative everyday document; tests the common path)
  - **PDF 2 — complex-table document** (course catalog, schedule, rubric — tests TH/Scope + Caption + ActualText)
  - **PDF 3 — scanned non-Latin script** (Arabic, CJK, or any non-Latin — tests OCR + Unicode font embedding + the new tag-tree unify Slice 1)
- [ ] Save originals to a temp folder so the screencast doesn't show desktop clutter
- [ ] Close email, Slack, etc. — clean recording window
- [ ] Pre-warm the AlloFlow Canvas tab so the pipeline modules are loaded (no "module loading…" delays)
- [ ] Open the AI Settings panel once to confirm Diagnostics shows fresh-looking model calls (no quota banner)
- [ ] Have `dev-tools/demo/exported_pdf_validator.cjs` ready in a terminal — you'll run it on each exported PDF

---

## The walkthrough (full demo on PDF 1, ~3-4 min)

### 1. Frame the question (15 seconds)
> "You said last time the pipeline doesn't work every time. Here's three real UMaine PDFs end-to-end."

Show the three originals briefly — name each one.

### 2. PDF 1: full walkthrough (~2 min)

1. Upload PDF 1 → click Remediate
2. Watch the pipeline log scroll — point at the visible stages:
   - "Extraction" → "Audit (axe-core + AI)" → "Surgical fixes" → "Full remediation" → "Tag tree" → "Export"
3. When complete, **show the Conformance Report**:
   - Structural score (axe-core) → label it explicitly: *"this is the deterministic automated check"*
   - Semantic score (AI rubric) → *"this is the AI auditor panel"*
   - Divergence note if scores differ >15 pts → *"this is where the pipeline tells you when the two methods disagree, so you don't get lured by an averaged number"*
4. **Content Integrity block** → *"this is the character-coverage check — every source character either survives or is flagged"*
5. **Reliability stats** → *"these are agreement heuristics, not psychometric coefficients — we're honest about what the numbers mean"* (this directly addresses the Knowbility/Rachel Church puncture risk)
6. Click "Download tagged PDF" → save to a temp folder

### 3. Validate the exported PDF (~30s)

Switch to terminal:
```bash
node dev-tools/demo/exported_pdf_validator.cjs path/to/pdf1-tagged.pdf
```

Read out the result. The validator checks:
- StructTreeRoot present ✓
- MarkInfo /Marked true ✓
- /Lang set ✓
- At least one heading ✓
- Every TH has /Scope ✓
- Every TH/TD has /ActualText ✓
- Every Figure has /Alt ✓
- **No orphaned semantic leaves** ✓ (this is the new tag-tree unify Slice 1 win)

If all PASS → frame it: *"this is the file Garry can hand to Paul Cochrane's accessibility team — every check that PAC 2024 or Adobe Accessibility Checker would run, automated, in 2 seconds, on the exported bytes."*

If any FAIL → that's the next conversation, not a stop-the-line. Honesty wins.

---

## Montage (PDFs 2 and 3, ~2-3 min combined)

For each remaining PDF, show only:
- Upload → 5-second time-lapse of pipeline running
- Final Conformance Report (just the score tiles)
- Validator terminal output (just the PASS/FAIL summary)

Pace fast. The full walkthrough above set the pattern; the montage proves consistency.

**Specifically for PDF 3 (scanned non-Latin):**
- Show that the OCR layer covered the non-Latin text (the pipeline reports "OCR coverage: 100%, non-Latin dropped: false")
- Show that the tag-tree validator still passes (the unify Slice 1 retro-patches every leaf for scanned single-page PDFs)
- Frame it: *"this is the case that breaks most PDF tools — the OCR text is searchable AND the structural tree references it, in one pipeline pass, with no manual intervention"*

---

## Close (15 seconds)

> "Three documents, three exports, all validate. That's what consistent looks like. Happy to do a live walkthrough on whatever document you want to throw at it."

Don't over-promise. Don't claim PDF/UA-1 compliance (we self-check, not validate). Don't claim "zero cost" without the Canvas caveat (separate Paul Cochrane doc work pending).

---

## What NOT to show

- Don't open the Symbol Studio / StoryForge / SEL Hub / STEM Lab — they're great features but Garry asked about PDF remediation, stay on point
- Don't read the full audit reports out loud — they're for the reviewer to read, not for you to narrate
- Don't apologize for the orphaned-tag-tree fallback on multi-page scanned docs — that's not part of the demo PDFs (single-page) and bringing it up unnecessarily seeds doubt
- Don't show the AI Model Diagnostics panel unless asked — it's a credibility-debt asterisk you've already addressed; showing it preemptively reads as defensive

---

## If something goes wrong mid-recording

- Pipeline stage fails: stop the recording, fix the PDF or swap it, restart. No fail-and-continue.
- Validator reports FAIL on a check: this is data. Either swap the PDF or fix the issue and re-record. Don't ship a demo where you say "this part doesn't always work."
- Quota banner appears: wait until reset, or use a different API key. The Diagnostics panel will tell you the served-model state.

---

## After the screencast

- Run all 3 PDFs through the validator one final time, save the JSON output: `node dev-tools/demo/exported_pdf_validator.cjs --json --batch path/to/demo-pdfs > demo-summary.json`
- Fill out [docs/garry_demo_summary_template.md](garry_demo_summary_template.md) with the scores
- Use [docs/garry_demo_email_template.md](garry_demo_email_template.md) as the email scaffold
