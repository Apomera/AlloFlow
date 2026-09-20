# Body Systems accuracy and participation follow-up — 2026-09-19

Both Body Systems editions now use the same native lesson content. The original had retained outdated circulation, digestion, coordination, memory-cue, and investigation wording after the illustrated edition was revised. This pass aligns the original with the corrected illustrated baseline and improves remaining issues in both.

## Changes

- Preserved arteries/veins as direction-of-flow terms, the lung and body circuits, the initial lymph pathway for many fats, and the heart's own pacemaker. Removed remaining prompts that treated the nervous system as the only coordinator or implied a fixed order of responses.
- Replaced the exercise-and-volunteer requirement with three explicitly fictional cases. Each supplies breathing and pulse counts at three times, a clear 15-second counting window, and the conversion to per-minute estimates. No exercise or personal physiological data are needed.
- Separated numerical observations from explanations. Counts cannot establish oxygen consumption, the first coordinating signal, or an exact recovery time between observations. Invented values are not health or fitness targets.
- Reworked the parallel example to demonstrate a counting-window conversion and its evidence limits. Revised the rubric, response frames, questions, and directions to match the actual task.
- Added response choices to memory activities: writing, drawing, speech, pointing, a communication device, or optional movement. Personal activity examples are optional; imagined examples work throughout.
- Improved two quiz items, including distinguishing the lesson's oxygen and glucose pathways. Original IDs, answer-key validity, and lesson references remain intact.
- Kept revised facts marked `factVerified: false`, with source references and hashes under `pending-educator-review`. This is an AI-assisted source check, not a completed educator review.

## Preservation and regression protection

The migration asserts identical artwork and alt-text field hashes before and after editing, and unchanged resource ID/type lists. Existing illustrated tests also verify all 34 image placements against the embedded files and alt hashes. The original retains 11 resources and the illustrated edition 15.

The final refinement layer reapplies the new Body Systems corrections after older illustration refiners, preventing those historical scripts from undoing the activity changes. The edition-parity test compares the actual saved files directly, excluding artwork and the illustrated picture-panel directions. It does not obtain its expected content by running the migration.

The current source-to-illustrated content audit now contains zero content differences for this pack. This means the two current editions agree; it does not mean that no revision occurred. This report documents that alignment. Across the catalog, 2,210 current source-to-illustrated audit records remain.

## Verification

- 511 tests passed across Body Systems quality, illustrated preservation, all-pack answer integrity, edition consistency, and catalog download/load validation.
- Production native memory and challenge views rendered offline at desktop and mobile sizes. Browser automation opened the learner's lesson-reference and limits disclosures and confirmed the supplied case data and participation options were visible.
- Production student and teacher HTML exports completed; no browser errors or model calls.
- All 105 files / 1,247 resources imported through the production offline host bridge with original fields preserved.
- Full-catalog refinement verifier passed: 25 outlines, 33 exact-match inherited review attributions, 43 complete original/illustrated resource pairs.
- Whitespace checks passed for affected existing files.

Screenshots were captured as supporting artifacts; they were not manually visually inspected. These checks do not constitute a signed-in community-library publication test or a complete pedagogical review of all packs.

## Sources

- [NHLBI: How the heart beats](https://www.nhlbi.nih.gov/health/heart/heart-beats) — pacemaker/conduction and adjustment of heart rate.
- [NHLBI: The heart](https://www.nhlbi.nih.gov/health/heart) — circulation and interacting control systems.
- [NIDDK: Your digestive system and how it works](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works) — digestion, absorption, and lymph transport of fats.

## Artifacts and scope

- `dev-tools/refine_body_systems_20260919.cjs`: reproducible migration with preservation assertions.
- `dev-tools/lib/allopack_body_quality_20260919.cjs`: final wording/provenance layer.
- `tests/allopack_body_quality.test.js`: direct edition parity, fictional-data calculations, facts, references, and key validity.
- `dev-tools/qa_body_systems_quality.cjs`: offline native rendering and export check.
- `scratch/body-systems-quality/report.json`, `native-text.json`, screenshots, and student/teacher HTML.
- `imports.json`: refreshed full-catalog import results.

All changes are local. No commit, deployment, upload, or live catalog publication occurred in this pass. There are still 43 illustrated catalog entries; this pass refines an existing pack rather than adding one.
