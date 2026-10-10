# Perception Lab: try one change

**Try one change** adds a fixed starting-view comparison to café wall, ambiguous cube, and moiré. Choose a drawing setting, capture the current view, and adjust the drawing while comparing it with that snapshot at the same scale. The starting view preserves its original drawing settings, impression, note, and measurement-guide visibility. It remains fixed until deliberately replaced or closed.

The guide distinguishes no changed settings, a single change to the chosen setting, a change to a different setting, and several changes. A table shows starting and current setting values. Notes, impressions, and measurement guides do not affect the count. Separate starting/current impression labels and neutral observation prompts support reflection without scoring. The guide explains that changing a hidden grid or face cue may not change the visible image; a count is not proof of a perceptual effect.

The temporary comparison uses the existing side-by-side, stacked, and switch-view layouts. Edits bring the current drawing into view; note and impression edits preserve view selection. Starting-view and live surroundings comparisons replace one another, while the saved pin remains underneath. Closing returns to the saved pin and keeps current settings. New experiment or learner selection discards the temporary session. Ordinary notebook saves and SVG/PNG exports use the current drawing. Saved data formats are unchanged.

Capture pauses moiré on the exact visible angle and waits for the parent state to commit before displaying a new snapshot. Requests validate their learner, experiment, and current model before applying, and validate the committed model afterwards. Delayed writes, updater replay, double activation, and external replacements are covered. Conflicting editing, import, browse, pin, study-start, and drawing-export actions are guarded during capture. Closing the focused workspace during a pending capture does not move focus back into its closed dialog.

Successful capture preserves keyboard focus when appropriate. Closing a comparison reopens collapsed controls before returning focus to **Capture starting view**, including from an expanded drawing area. The guide can be collapsed when idle and opens on capture. Existing themes, 44 px interaction targets, and comparison drawing scales are retained.

Original experiment definitions, normalization, measurements, scene geometry, matching helpers, and study helpers are unchanged. The new change descriptor is separate. Source and desktop copies are identical, and 25 English strings were added to both existing catalogs. No files were committed.

## Verification

- **433 targeted tests passed:** 51 new inquiry cases and 382 regressions across 12 suites covering experiment geometry, notebook preservation, matching starts, free matching, focused browsing/workspace, live comparison, precise controls, PNG export, repeated/guided studies, and surroundings comparison.
- **51 Chromium check groups passed:** all three inquiry activities, immutable snapshots, changed-setting classification, impressions, native numeric blur before capture, moiré pause, keyboard/pointer activation, delayed requests, external replacements, focus return with collapsed controls, notebook saves, and current-drawing exports.
- Ten viewport/text combinations from 320 px to 1440 px, including 200% text, and dark/high-contrast/forced-color themes were checked for reachable controls, 44 px targets, overflow, and targeted WCAG A/AA axe violations. Final screenshots were visually reviewed. No browser runtime errors were reported.
- PNG export produced the actual current drawing at 2400 × 1440 pixels while the starting view was selected. Download transport: **native**.
- All recorded runs use the same final source. This is a targeted unit-test and software-rendered Chromium pass; other browsers and the full repository were not audited.

## Evidence

- [Validation](validation.json)
- [Inquiry tests](inquiry-tests.json)
- [Unit run metadata](inquiry-unit-run.json)
- [Regression summary](regression-summary.json)
- [Browser results](browser-results.json)
- [Phone controls at 200% text](inquiry-controls-390-32.png)
- [Short-window current drawing at 200% text](inquiry-current-760-32.png)
- [Starting view at 200% text](inquiry-starting-1060-32.png)
- [Desktop comparison](desktop-auto.png)
- [Forced dark theme](forced-dark.png)
- [Generated current drawing PNG](current-inquiry.png)

Final source SHA-256: `54885c259a64607b281288067ffab397528b61155c53b0ed464419951f92d3de`.
