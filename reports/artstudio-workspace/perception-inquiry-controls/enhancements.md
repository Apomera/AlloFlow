# Perception Lab: direct inquiry controls

The **Try one change** guide now connects a chosen setting directly to its real control. **Adjust chosen setting**, available in both the guide and comparison area, opens the controls and brings the relevant slider, cube face-cue selector, or surroundings toggle into view with keyboard focus. Choosing a setting in the selector does not move focus automatically. Starting and current values remain visible in the guide even when they are equal, including moiré's fractional angles and named cue/context states.

Two explicit actions make a comparison recoverable. **Restore chosen setting** returns only that setting to its captured value. **Restore other settings** keeps the chosen setting and returns the other changed drawing settings. The pure restore planner preserves normalized current notes, impressions, measurement-guide visibility, and all out-of-scope drawing settings. Buttons are disabled when their scope has no changed settings. The fixed starting view, saved pin, notebook observations, other experiments, and other tool data remain intact.

Restoration pauses moiré and preserves the visible frame outside the requested scope. It uses the guarded inquiry request controller: the active learner, experiment, and current model must still match before applying, and the committed model and immutable baseline are checked afterwards. Pending operations lock conflicting editing, navigation, capture, restore, study, import, browse, pin, and drawing-export actions. Replayed updaters and same-event repeated activations do not apply a second restoration. Stale replacements are retained without an outdated focus jump.

Successful restoration returns focus to the chosen real control, with disclosures opened first. If the learner closes the focused workspace or moves focus elsewhere during a delayed write, completion does not steal focus. Navigation validates the current experiment, learner, selected setting, and dialog state. Selected-value panels use the existing theme colors, stack on narrow screens, and preserve native control labels and 44 px interaction targets.

Original experiment definitions, normalization, measurements, scenes, matching/study helpers, and saved formats are unchanged. The new pure planner is separate. Source and desktop copies are identical, with ten English strings added to both catalogs. Nothing was committed.

## Verification

- **491 targeted tests passed:** 58 new inquiry-controls cases and 433 regressions across 13 existing suites for inquiry capture, experiment geometry, notebook preservation, matching starts/free matching, focus workspace/browsing, live comparison, precise controls, PNG export, repeated/guided studies, and surroundings comparison.
- **58 Chromium check groups passed:** all nine chosen setting choices, scoped restores, exact current/baseline geometry, native numeric blur, pointer and keyboard use, delayed/replayed writes, external replacements, closed dialogs, moved focus, and current-drawing exports.
- Ten viewport/text combinations from 320 px to 1440 px, including 200% text, exercise native scene-to-control navigation for all nine choices. Dark/high-contrast/forced-color themes were checked for control targets, overflow, and targeted WCAG A/AA axe violations. Final screenshots were visually reviewed. No runtime errors were reported.
- A 2400 × 1440 PNG was generated from the current drawing with exact SVG geometry verified. Download transport: **native**.
- Recorded tests and browser checks use the same final source. This is a targeted unit-test and software-rendered Chromium pass; other browsers and the full repository were not audited.

## Evidence

- [Validation](validation.json)
- [New tests](inquiry-controls-tests.json)
- [Unit metadata](inquiry-controls-unit-run.json)
- [Regression summary](regression-summary.json)
- [Browser results](browser-results.json)
- [Desktop inquiry controls](controls-1440-16.png)
- [Phone controls at 200% text](controls-390-32.png)
- [Drawing in a short landscape window](drawing-760-16.png)
- [Forced dark colors](forced-dark.png)

Final source SHA-256: `9e338c48eec53d00ba8233921b0c51f65138641b0ce4c0a9a5f0e360395fa338`.
