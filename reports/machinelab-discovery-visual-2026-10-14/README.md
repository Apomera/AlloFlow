# Machine Lab observation challenge visuals

The six existing Motion detective challenges now present a numbered predict, inspect, and explain sequence. A larger question, 44px minimum action targets, visible motion-map heading, larger direction labels, and a framed native disclosure make observation easier to follow. Phone layouts stack the motion arrows and labels; long words can wrap at enlarged text sizes. Focus indicators use the theme's text color and retain the shared forced-color override.

Only `shopMotionMap()` and `shopDiscoveryCard()` presentation changed from baseline `35c3ac417`. Existing clue wording, conditional lever/ramp answers, inspection callback, camera presets, focus/return behavior, SVG direction geometry, calculations, grading, and saved work are preserved. The two new instruction strings use namespaced translation keys. Canonical/public SHA-256: `b1722eb8475bd8992229fc5480a8e8073cac810540b3c58cab019a8c06b3ccd2`.

Final selected unit checks: 91 passed in four serial native processes (`tests/run-04`): discovery 29, clue return 26, accessibility 28, translation hygiene 8. Existing test files were not changed. Static review and the executable scope verifier pass. Browser validation is recorded separately below.

Retained development evidence:

- Tests `run-01` and `run-02` each passed 91 on the initial candidate. A transient OneDrive source-write failure left that source unchanged; the shell continued to run-02. A later mirror-copy failure was resolved with a PowerShell copy before further validation.
- Tests `run-03` passed 91 after the first focus-color correction. Static review and browser evidence prompted the final cascade and long-word fixes.
- Browser `run-01` exited 1 with 198 checks and 10 reported failures. The enlarged wedge question exceeded its text box by 6px. Focus observations exposed interaction with shared focus CSS; final selectors have greater specificity. The slider checks rejected a 0.3125px viewport-edge discrepancy.
- `browser/probe-01` records the focus/layout diagnostic. Final browser checks wait two animation frames before measuring focus paint, retain the 3:1 contrast threshold, and allow an explicit 0.5px scroll-rounding tolerance. No production callbacks or scroll logic were changed.

Final browser `run-02` passed 198 checks with native exit 0 across four mounts and all six station routes. Checks cover keyboard inspection, half-stroke scene agreement, hidden-room framing, Return to clue, native reveal, preserved draft/saved state, exact baseline clue/answer/arrow output, focus contrast, and unclipped 320px layouts with doubled text for every station. Four final screenshots were independently inspected by root and the browser reviewer: desktop before/after, dark phone, and forced-color doubled-text wedge. Browser temp files and the temporary host page were removed after Chromium closed.

Run `node reports/machinelab-discovery-visual-2026-10-14/verify-scope.cjs` and `node reports/machinelab-discovery-visual-2026-10-14/verify-evidence.cjs` to check preservation and the selected final receipts. This focused visual pass does not include a full application build or deployment. Shared handoff changes remain unstaged.
