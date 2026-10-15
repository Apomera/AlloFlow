# Machine Lab live motion — October 14, 2026

Completed October 15, 2026. Final validation: 85 existing tests and 123 native browser assertions passed; all three final screenshots were inspected by two reviewers. Both forced-color phase cards meet 4.5:1 text contrast (21:1 inactive, 15.13:1 active).

The active demonstration now has a prominent stroke-position readout, a fill that follows the actual rendered pose, and labeled working/return stages. An “Inspect this pose” button beside the scene invokes the existing exact-pose hold behavior and transfers keyboard focus to the position slider. Narrow layouts stack the action and stages; high contrast uses explicit system colors.

The percentage describes position within the working stroke: it rises on the working stroke and falls on the return. It is not elapsed time or task completion. Reduced motion retains the full-stroke still view without active phase cards. The numeric updates are outside the live region; phase announcements remain separate. A stable React fallback with guarded ref restoration prevents repeating the return announcement when the camera rerenders.

Canonical and desktop source SHA-256: `c007670ebf89440fb6549bc8b26eab54343fa027feb9dee49b1950bca25ad67c`.

The scope verifier restores only `syncShopStroke` and the live phase panel to reproduce baseline `51e17d011`. The scene, motion timing, Hold handler, camera logic, calculations, practice and saved-state handling are unchanged. No additional timer, animation loop or saved state was added.

Final evidence is selected by `verify.cjs`: unit `tests/run-03` and browser `browser/run-07`. The browser uses the real clock and actual onPose callbacks; it does not replace tick or timer behavior. It checks both motion directions, camera rerenders, exact-pose keyboard inspection, saved practice and notes, natural completion, station switching, motion-off behavior and small-screen text/contrast. Desktop, dark-phone and forced-color/enlarged-text captures are retained.

Retained diagnostics:

- Earlier unit runs passed on superseded source candidates and are excluded from final totals.
- Browser runs 01–02 caught a repeated return announcement after camera rerender; run 02 preserves the two identical mutations. The source fix removes that duplicate without suppressing real phase changes.
- Run 03 passed the six-station motion checks but exposed a screenshot-coordinate error; its crop is excluded from visual conclusions. The harness now uses document coordinates with full-page capture.
- Run 04 passed its original assertions, but visual review found an invisible inactive phase card in forced colors. Explicit Canvas/CanvasText colors fix it. Final checks assert both cards' text contrast during both working and return phases.
- Run 05 was interrupted by the workspace session change and produced no result or exit receipt. It is excluded; run 06 uses a wrapper that records native completion. No Node or Chromium processes remained when the work resumed.
- Run 06 confirmed the corrected forced-card colors but failed the enlarged-font assertion before saving raw font measurements; the precise cause is unconfirmed. The final harness uses persistent CSS enlargement rules and records measured layout before assertions. Production code was unchanged.
- Two PowerShell source-write attempts encountered a mapped-file lock without changing the file. The guarded patch succeeded; canonical and mirrored bytes match.

Reproduce the evidence audit with `node reports/machinelab-live-motion-2026-10-14/verify.cjs`. The test runner accepts a fresh output directory; native browser QA is `node dev-tools/ml_live_motion_qa.cjs <fresh-output-directory>`. Native validation is serial. No full application build or deployment.
