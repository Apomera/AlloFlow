# Native browser evidence

The final run completed with observed child exit **0**, **78 checks**, **4 scenarios**, and **6 screenshots**. `process.json` binds the unchanged canonical/public source, native page, harnesses, native result, console log, screenshots, and visual review. Both reviewers inspected the six screenshots. The final image bytes match those inspected after the preceding run.

The viewport checks cover 1150 px, 441 px (immediately above the 440 px breakpoint), dark 390 px, and forced-colors 320 px. The 320 CSS px check exercises narrow reflow; actual browser zoom and physical assistive technology were not tested.

## Historical diagnostics

- `attempt-1` and `attempt-2` are **duplicate snapshots of the same startup failure**, with identical `process.json` SHA-256 `2547451c97494d8f7759913080ef15c3a56c0811ea7abf294deed57c28c8ac79` and identical start/finish times. An interrupted retry preserved the receipt twice. They do not represent two native browser runs. The initial harness failed before launching Chromium because its VM wrapper did not provide `__dirname`. Each directory includes the exact reconstructed harness, verified against the observed receipt's harness hash `9986ecde5ab8df06cdee7ceff5db594fecb614ec6ed90e5e4cc6ba04c5214f9a`.
- `attempt-3` is the first completed native browser run: 78 checks, 4 scenarios, 6 screenshots, observed exit 1. Three layout assertions included intentional route-arrow pseudo-elements extending 17 px into an 18 px gap. Page and panel boundaries did not overflow. The corrected assertion measures actual route content plus figure/page boundaries. Application behavior passed; no production code changed between this run and the final run. Its observed harness snapshot and all available logs, result, and image files are retained.
- The final run at the top of this directory is the second completed native browser run. It passed all checks. Historical failures are diagnostics, never included in the final pass count.

`visual-review.json` binds the historical receipts and exact harness snapshots and records observations for each final screenshot. Native pages and browser temporary files are regenerable and are not intended as committed evidence.

From the repository root, reproduce with `node reports/machinelab-compound-visual-2026-10-12/run-browser.cjs`. Existing output is copied to the next `attempt-N` directory before a new run; fresh screenshots require a fresh visual review.
# Diagnostic console recovery

The duplicate `attempt-2` startup receipt had an empty interrupted console copy. The exact console bytes were restored from `attempt-1`, whose process receipt and expected console hash are identical. The empty copy remains as `attempt-2/interrupted-empty-console.log`; `attempt-2/console-recovery.json` records the hash-verified recovery. This does not represent another native browser run.
