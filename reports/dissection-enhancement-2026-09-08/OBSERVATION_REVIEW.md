# Specimen-wide observation review

Students can now open **Review observations** at the top of the structure sidebar to revisit inspected structures across every layer of the current specimen.

## Learning flow

- **All inspected** lists known, inspected structures in anatomical layer order. Notes from other specimens and uninspected drafts do not appear.
- **Needs notes** finds a missing evidence note or confidence rating.
- **Low confidence** finds a rating of 1 out of 3, with a prompt to identify a feature or relationship that could help check the identification. A fully documented low-confidence observation remains available in this filter.
- Each entry shows its layer, documentation status, and confidence. **Read saved note** expands the student's exact text.
- **Review note** opens an available layer and focuses the existing note editor. **Review all observations** returns keyboard focus to the review list.
- Filters and counts update after students intentionally revise a note or confidence rating. Empty states explain how to begin or broaden the filter.

Layer locks remain in force. An existing note in a locked layer can be read, but the review does not navigate into that layer. Review navigation does not mark new structures inspected, award identification credit, change confidence, write evidence, or alter scores.

The list is collapsed initially to keep the main workflow compact. It is hidden during quizzes, practicals, flashcards, comparisons, and 3D study. Filter state is temporary and resets when changing or resetting specimens. No save-schema change is required.

## Verification

- Focused reference/discovery/recall/spatial/3D/observation suite: **105 passed**.
- Combined Chromium acceptance: **12 passed** without retries (three new observation-review scenarios and nine existing reference-workbench scenarios).
- Phone panel: zero automated WCAG A/AA axe violations and no horizontal overflow. Its layout was visually inspected.
- Canonical and desktop dissection bundles match; syntax and scoped whitespace checks passed.
- Initial regression run found one older test that selected the first note-panel button. The assertion now targets the intended Continue notes action; the full focused rerun passed.
- New interface copy is English. Physical-device coverage and full translations remain follow-up work.

## Artifacts

- [Focused tests](observation-review-focused-final.log)
- [Browser workflow tests](observation-review-browser.log)
- [Desktop review](observation-review-desktop.png)
- [Phone review](observation-review-mobile.png)

Final disclosure styling was verified with an additional passing phone browser test, a repeated zero-violation scoped accessibility audit, and visual inspection of the refreshed screenshot. See [final phone verification](observation-review-visual.log).
