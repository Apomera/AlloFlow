# i1040 full-document PDF/UA-1 PASS — 126 of 126 pages (2026-08-09, engine 0.2.3)

Re-run of the same-day 126pp pass after fixing the clause 7.2-43 root cause
that run localized. This is the first fully conforming artifact for the
complete document.

```
verdict:           pdf_generated_validation_passed_review_required
veraPDF PDF/UA-1:  PASS — failedRules: [], identifier claimed and EARNED
exit:              0 under --pdf required --verapdf required
outputTextRecall:  1.0      (129,785 plan tokens — byte-identical to pre-fix)
sourceTextRecall:  0.9349   (byte-identical: the fix changed no text tokens)
worksheet:         1,664 items, regenerated against THIS run's HTML
```

## The fix (portable 0.2.3, @008c75de7)

`alloflow_portable.py` now fills empty table cells with a NO-BREAK space
instead of a ZERO-WIDTH space. The ZWSP cut the i1040 UA-1 failures from 22
to 1, but Chromium culls a zero-advance-only cell under some fragmentation
conditions — the IRA Deduction Worksheet part 2 lost exactly one of its two
ZWSP cells per body row while the identically shaped part 1 on the previous
page kept all of its cells. An nbsp has a nonzero advance width, so a text
run (and therefore a /TD) is always emitted; a screen reader still announces
the cell as blank and extraction sees only whitespace, which is why both
recall figures are byte-identical before and after.

Verified three ways:

1. `pdfUaCompliant: true`, `failedRules: []` in this run's report.
2. An independent per-page struct-tree walk (pdfjs `getStructTree`, all 319
   output pages) finds ZERO tables with unequal row widths; pre-fix it found
   exactly one (page 259, `[4,3,3,3,3,3,3]`).
3. All four portable suites green (30/30) after updating the strict-mode
   contract test. Note the suites need `--maxWorkers=1` on this machine —
   parallel workers each spawning Chromium + a JVM produce spurious timeouts
   (a different test each run; individually every test passes).

## Second engine change in 0.2.3

`--verapdf required` used to raise inside the staging TemporaryDirectory
context, which deleted everything and left the out-dir EMPTY on gate failure.
The gate now runs after `publish_staged`: same exit codes (5/6), but the
artifacts and the accessibility report survive for diagnosis. The
`portable_remediation_core` test asserting the old empty-dir contract was
rewritten to assert the new one.

## What this run does NOT establish

Independent verification. The 1,664-item worksheet here was regenerated
against THIS run's HTML (the sha256 bindings must match the artifact a reader
actually checks). It still needs a fresh-context reader who did not author
the tranches, then `verify-check`. `humanReviewRequired` also still stands:
automated checks cannot verify meaning.

## Artifacts

Committed: accessibility report, privacy receipt, worksheet. The tagged PDF
(12.7 MB) and HTML are not committed; regenerate with the commands in
`../2026-08-05_i1040-104pp_portable/NOTES.md`.
