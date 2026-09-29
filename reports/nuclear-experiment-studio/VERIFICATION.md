# Nuclear Lab experiment studio

Nuclear Lab now opens with a short experiment instead of displaying all topic panels at once. Learners predict, collect observations, and explain the evidence before recording a discovery.

## Included changes

- Six introductions cover half-life, distance, radiation paths, shielding, detector counting, and chain reactions. Visual scenes and observation tables use the tool's existing models.
- A collapsed experiment chooser, optional hints, and prediction summaries reduce the amount of text shown at once.
- Guidance identifies the next observation needed. Setup shortcuts prepare a comparison without recording a measurement.
- The chooser shows progress and can resume an unfinished experiment with its saved observations.
- A discovery recap supports revisiting activities and writing an optional takeaway of up to 300 characters. Notes remain when an experiment is reset or the learner switches views; clearing a note preserves the discovery.
- The existing topic routes and reactor controls remain available from the workspace navigation.

## Verification — 2026-09-29

- **49 unit tests passed** against the exact source prepared for commit. Coverage includes model outputs, evidence requirements, saved state, setup shortcuts, resume selection, translation fallbacks, malformed state, and takeaway retention.
- **13 Chromium tests passed** against that same source. Coverage includes keyboard interaction and focus, 320px and 390px layouts with larger text, light and dark themes, forced colors, reduced motion, and targeted axe scans using the app stylesheet. The takeaway editor was visually reviewed at 320px.
- The integration verifier and its four negative cases passed: all four source copies match, active English keys match in four registries, the production loader mapping exists, and the earlier lesson implementation is preserved.
- Earlier isolated mutations were rejected for incorrect distance, chain, counting, radiation-path, and setup behavior. These mutations did not modify production files.

The focused browser suite covers the new studio and navigation to the existing lesson and reactor. It does not replace a complete audit of every legacy topic or platform.

## Commit scope

The commit contains the root and tracked public module, only the studio's added English registry keys in both tracked registries, the two focused test files, and this summary. The two ignored build mirrors are synchronized locally. Pre-existing lesson translation edits and unrelated shared registry edits remain in the working tree.
