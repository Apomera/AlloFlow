# Individual-remediation smoke — real documents, real Canvas (2026-07-10)

**Why this exists:** everything shipped in the July hardening waves (deep dive + all 17
ChatGPT-review findings + verdict strip) is proven by unit goldens and scripted-model e2e runs.
This checklist is the missing step: real documents through the real UI, checking both the output
quality AND whether the honesty surfaces tell the truth about it. ~45–60 min for the core set.

**Setup:** Gemini Canvas, fresh AlloFlow load after the next deploy (verify the cache version is
`20260710-2`: DevTools console → any audit log line shows it in the cache key). Target score at
the default 95. Auto-continue ON.

**For EVERY document below, after Fix & Verify finishes, check the same five things:**

1. **Verdict strip** (NEW — top of Remediation Results): does the one-liner match reality?
   - ✅ *Ready to hand out* → open the exported HTML: is it actually clean and complete?
   - ⚠ *with cautions* → is each caution true? (not crying wolf, not missing anything you can see)
   - 🛑 *Review before handing this out* → is the named reason real when you check the Diff?
2. **Coverage honesty**: fidelity panel % vs a skim of the Diff — is anything missing that the
   panel calls "preserved"?
3. **Score plausibility**: does the number match the visible quality? (a 95+ doc should have alt
   text on images, real headings, working reading order)
4. **Downloads**: accessible HTML opens + tagged PDF downloads; spot-check the tagged PDF in
   Acrobat (or PAC if handy) — text selectable on scans, reading order sane.
5. **No wedged UI**: spinner cleared, buttons re-enabled, no stuck "working…" state.

---

## Core set (do these eight)

- [ ] **1. Clean born-digital PDF** (any typed worksheet/handout, 2–5 pages)
  - Expect: high score, verdict ✅ or ⚠ with only rubric-gap cautions; coverage ≥98%;
    fast run (no OCR).
- [ ] **2. Scanned document** (photocopied worksheet — the King Middle usual)
  - Expect: OCR path banner; verdict likely ⚠ with OCR-confidence caution; tagged PDF has a
    SELECTABLE text layer positioned over the scan (drag-select a paragraph in Acrobat).
  - Also check: any "page-edge lines removed" caution names REAL running heads, not content
    headings (H4 fix); "Chapter N" style headings must survive.
- [ ] **3. Math-heavy document** (worksheet with fractions/equations/scores)
  - Expect: NO numeric-fidelity 🛑 unless numbers genuinely changed — spot-check 5 numbers
    against the source. If the strip says numbers changed, the Diff must show it.
- [ ] **4. Multi-column layout** (newsletter/journal style)
  - Expect: reading order in the output follows columns correctly (not interleaved lines);
    if content got routed to the "Preserved source content" box, the ⚠ placement caution appears.
- [ ] **5. Document with tables** (gradebook/schedule/data table)
  - Expect: tables survive as real `<table>` with headers (not flattened text); if a table
    was lost, the verdict must be 🛑 with the tables reason.
- [ ] **6. DOCX with images + headers/footnotes**
  - Expect: images ride into the export with alt text; footnote/header text present;
    tracked-changes toast if the file has them.
- [ ] **7. Large document (25+ pages)** — triggers the page-slice path
  - Expect: if any slice fails (watch for the retry log), the BEFORE score shows withheld/
    approximate, never a confident number over unseen pages; summary names un-reviewed pages.
  - Auto-continue: stop it mid-run once — the round finishes, "what's done is kept", no zombie
    spinner, no further API calls after ~30s (Network tab).
- [ ] **8. Non-Latin or mixed-script document** (Spanish is fine; Arabic/CJK scan = bonus)
  - Expect: no mojibake in output; scanned non-Latin → per-leaf tagged PDF still verifies
    (download succeeds without the "withheld by a download gate" note, or the note says why).

## Edge set (nice to have, ~15 min)

- [ ] **9. Password-protected or corrupt PDF** → clear friendly error, no spinner wedge.
- [ ] **10. Zip-bomb-shaped Office file** (skip unless curious — any DOCX re-saved with huge
      embedded media): typed "decompression safety limits" message, not a generic failure.
- [ ] **11. Re-run document #1 unchanged** → cache hit (near-instant), same score ±0, and the
      run-history panel shows TWO rows (runId dedup — re-runs no longer collapse into one row).
- [ ] **12. Assessment-mode export of a concept sort** (if you use one) → view-source of the
      export: no `data-category-id` on draggables, no Check button (answer-key leak fix).

## While you're in there (2 min each, no doc needed)

- [ ] Keyboard-only pass over the Remediation Results screen: Tab reaches the verdict strip
      text, score qualifiers, and every download button; nothing important is hover-only.
- [ ] Stop button during auto-continue → stops after the round, result kept, honest toast.
- [ ] Batch tab: drop 3 small PDFs → all process; ZIP contains 3 HTML + tagged PDFs + reports;
      double-click the ZIP button — second click says "already being generated", no double work.

## Recording results

For each ❌: note the doc (keep the file!), what the strip/panel claimed vs what you saw, and
the console's last few `[Integrity]`/`[AutoContinue]` lines. That triple is enough for me to
reproduce and fix. If everything passes, tell me which docs you used and I'll record the corpus
as the reference set for future regressions.
