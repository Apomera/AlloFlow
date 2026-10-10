# Perception Lab: fresh matching starting points

Free **Match by eye** now begins with an adjustable value different from the fixed reference and previous comparison. The earlier behavior entered with exactly equal drawing values. **New starting point** selects another bounded integer value, and **Equalize drawing values** explicitly names the former reset action. These changes apply to brightness, circle size, and line length.

Both starting-point actions clear the prior impression and reveal, while retaining notes, surrounding settings, reference values, saved comparisons, notebook observations, and other tool data. Existing saved/loaded matches are preserved. Observe keeps its established equal-target rendering. Controlled repeated studies keep their original three starting positions and remain locked through revealed results.

A pure helper selects the starting value from an invocation-time sample, before the parent updater runs, so updater replay cannot generate a second value. Pending requests lock conflicting actions and validate their experiment, profile, and model before applying. They also validate the committed model, rejecting intervening external changes without overwriting newer settings. Drawing exports, import, study start, focused browsing, and pin actions have synchronous guards as well as disabled controls.

Successful operations return keyboard focus to the comparison slider, with drawing numbers hidden until reveal. If a learner closes the focused workspace or presses Escape before a request finishes, the valid setting still applies, the dialog stays closed, and focus stays on the returned workspace opener. External stale replacements recover the controls without moving focus into a changed drawing.

The live surroundings comparison follows the new matching value, with only context differing between its two drawings. Editing a starting point brings the current drawing into view; the pinned model is preserved. A help paragraph explains which actions clear an impression and distinguishes fresh free matches from controlled repeated studies. No claim is made that a random starting point eliminates starting bias.

Source and desktop copies are identical. Original experiment definitions, normalization, measurements, drawing geometry, and study helpers are unchanged; the new helper is separate. Saved data formats are unchanged. Seven English strings were merged into both existing catalogs. The matching tests and three legacy browser runners were updated for the intentional entry behavior and clearer equality label. Nothing was committed.

## Verification

- **319 targeted tests passed:** 60 new starting-point cases, 29 existing matching cases, and 230 regressions for focused browsing/workspace, live comparison, precise controls, PNG export, repeated studies, guided studies, and surroundings comparison. Suites ran separately on the same final source.
- **47 Chromium check groups passed:** all three matching activities, preserved loaded matches, native numeric blur, pointer/keyboard activation, hidden values, comparison synchronization, study start sequences/locks, delayed operations, external replacements, close/Escape focus continuity, and export creation.
- Ten viewport/text combinations from 320 px to 1440 px, including 200% text, verify reachable controls, 44 px targets, no horizontal overflow, and visible drawing frames after **Go to drawing**. Dark, high-contrast, and forced-color themes passed targeted WCAG A/AA axe checks. Final screenshots were reviewed; no browser runtime errors were reported.
- PNG export evidence uses a real generated 2400 × 1440 image. Download transport: **native**.
- This is a targeted unit-test and Chromium pass with software rendering; other browsers and the full repository were not audited.

## Evidence

- [Validation](validation.json)
- [New tests](match_start-tests.json)
- [Matching tests](matching-tests.json)
- [Regression summary](regression-summary.json)
- [Browser results](browser-results.json)
- [Phone controls at 200% text](matching-controls-390-32.png)
- [Medium window drawing at 200% text](matching-drawing-1060-32.png)
- [Dark theme](dark.png)
- [Generated PNG](current-match.png)

Final source SHA-256: `d079994beb6b17604f75862e3f8a1bb46477eab8ee5f5beeba37a685306b5b19`.
