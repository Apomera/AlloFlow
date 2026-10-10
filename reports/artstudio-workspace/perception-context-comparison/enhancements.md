# Perception Lab: live surroundings comparison

**Compare surroundings** now opens two drawings at the same scale, with only their context differing. Both follow the current settings, including unequal visual matches and their reveal state. Learners can adjust one variable, inspect full-width stacked drawings, or switch between them in the same position. Drawing edits bring the current experiment into view; notes and predictions preserve the selected view.

The six experiments use explicit labels: with/without surroundings, tiles visible/removed, face cue visible/removed, and both grids/first grid only. The cube requires a selected face cue; without one, a linked explanation describes how to enable a meaningful comparison. A collapsible comparison guide explains the flat gray field when tiles are removed and the limitations of cube face cues.

This comparison is a local viewing preference. It keeps the pinned drawing and notebook untouched, and closing it restores the saved pin and returns keyboard focus to **Compare surroundings**. Pinning the current drawing or a saved observation exits the temporary comparison and shows the new pin. Saving an observation and exporting a drawing continue to use the current experiment even when the other context is visible; the guide explains this behavior.

Opening the comparison pauses moiré at its visible frame. Repeated studies, including their completed/revealed results, block activation. Pending study, import, and focused browsing operations also block it, with synchronous guards covering clicks before the next render. Changing experiment or profile clears the temporary view; opening and closing the focused workspace preserves it. Moiré playback also stays disabled while focused browsing is pending.

The source and desktop copy are identical. Experiment definitions, SVG geometry, normalization, measurements, study helpers, and saved data formats are unchanged. Twenty-one English strings were merged into the existing catalogs. Nothing was committed.

## Verification

- **230 targeted tests passed:** 38 new context-comparison cases and 192 regressions for focused browsing/workspace, live comparison, precision controls, PNG export, repeated studies, and guided studies. Each suite ran separately on the same final source.
- **40 Chromium check groups passed:** all six experiments, exact scene equivalence apart from context, native numeric blur, matching privacy, saved pin/notebook retention, current-only saving and PNG export, moiré pause, delayed operations, all three layouts, profile/browse reset, and focused-workspace continuity.
- Ten viewport/text combinations from 320 px to 1440 px, including 200% text, verify equal drawing scale, accessible controls, no horizontal overflow, and visibility of at least 98% of each frame after **Go to drawing**. The checks account for clipping ancestors and verify that actual drawing content remains visible.
- Dark, high-contrast, and forced-color themes passed targeted WCAG A/AA axe checks. Browser drawing colors are preserved. No browser runtime errors were reported. Final screenshots were reviewed.
- This is a targeted unit-test and Chromium pass with software rendering; other browsers and the full repository were not audited.

## Evidence

- [Validation](validation.json)
- [New tests](context-comparison-tests.json)
- [Regression summary](regression-summary.json)
- [Browser results](browser-results.json)
- [Side-by-side drawing](desktop-auto.png)
- [Stationary switch view](desktop-switch.png)
- [Phone drawing at 200% text](drawing-reference-390-32.png)
- [Medium window at 200% text](drawing-current-1060-32.png)
- [Dark theme](dark.png)
- [Current-only PNG export](current-from-context.png)

Final source SHA-256: `7656a39cebc2183db3550704f804da7dc629788031807ef448c97a44a4c0ddc1`.
