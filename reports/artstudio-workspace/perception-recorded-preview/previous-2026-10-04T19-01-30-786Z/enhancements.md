# Perception Lab: inspect recorded drawings

Updated October 4, 2026. Changes are left uncommitted.

Revealed three-match studies now connect their recorded values to the drawings that produced them. A **Recorded drawing** panel is available after revealing the active study and when reviewing a complete revealed saved study. Ready A/B comparisons include a separate preview for each study.

## Inspect actual trials

Choose Trial 1, 2, or 3 to see that trial's saved target sizes or gray fills, surroundings, impression, date, and full observation note. The preview uses the existing experiment renderer and the actual saved trial model. It does not synthesize a drawing from the median. Measurement guides can be toggled for each preview; the revealed recorded-value readout remains available.

A and B have independent trial selectors and guide toggles. Both SVG drawings use the same 800 by 480 drawing coordinate system and equal columns on wide layouts; they stack on narrower screens. The existing comparison results retain their starting-position and multiple-setting warnings. Selecting the same trial number does not establish identical starting positions or paired measurements.

## Preserve drafts and reveal boundaries

Preview controls are transient. They do not write notebook records, alter current experiment settings, change pinned drawings, or affect export content. Filters preserve open previews and their selections. Changing the study, comparison pair, retained study contents, or learner profile resets the affected previews to Trial 1 with guides enabled.

Each preview rechecks the current retained group. Missing or partial groups, inconsistent settings, duplicate trial numbers, incompatible pairs, and studies with any hidden member cannot expose a recorded scene. Deleting a retained match removes the affected previews immediately. Restoring a valid study through Undo starts with the default preview controls.

Each SVG has distinct title and description identifiers for its active, review, A, or B slot. Native trial selectors and pressed-state guide buttons carry their preview context. Author-written notes are rendered as text and preserved up to the existing 500-character limit. The drawings retain a white background and their original colors while surrounding controls follow the selected theme and Windows forced colors.

## Verification

Final evidence will be recorded in [validation.json](validation.json). The new verification files are `tests/perception_lab_recorded_preview.test.js` and `dev-tools/perception_lab_recorded_preview_qa.cjs`. Root and desktop implementations are mirrored, with the Perception English catalog synchronized.
