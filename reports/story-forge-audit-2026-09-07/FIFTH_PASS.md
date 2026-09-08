# Story Forge: optional coach safety and comic suggestions

Implemented locally on September 8, 2026. No deployment.

## Completed

- Added bounded, tool-specific response normalization for Help Me, Senses, Show vs Tell, Character Arcs, Dialogue, Mentor Match, and Revision Plan. Malformed collections or object-valued display fields are rejected before rendering. Mentor links require HTTP(S), and uncertain excerpts are withheld.
- Optional coaches check the current draft context before accepting results and identify their latest request. An older request cannot replace a newer result. Failures explain that writing is safe and that students may retry or use the self-check.
- The five story-wide analysis coaches now use authored comic content, including speech and thoughts. Dialogue analysis no longer rejects bubble dialogue merely because it lacks quotation marks.
- Imported grading feedback passes through the same validator as live grading. Invalid optional feedback is discarded without discarding the writing, and the import requires a fresh review. Valid legacy feedback remains supported. The importer explains the recovery.
- Draft Bubbles and Tighten Bubbles now create previews instead of applying text immediately. The preview shows current and proposed text and directions, with Apply suggestions and Keep my version.
- Apply saves a checkpoint first and uses the existing recoverable edit mechanism. It rejects a proposal if the project changed, preserves the current writing if checkpoint storage fails, and supports Undo. Loading another project clears pending comic proposals.

## Evidence

Six unit regression cases cover malformed coach output, bounded text, mentor link/excerpt rules, and valid/invalid imported grading feedback. The existing reviewed-import fixture now contains a valid feedback structure instead of a score-only placeholder.

`verify-fifth-pass.cjs` verifies the original malformed Show vs Tell response no longer crashes the isolated editor; comic speech is included in coaching; stale coaching is rejected; bubble generation leaves authored speech unchanged; discard, apply, and Undo work; and stale Apply is rejected. Browser checks passed without JavaScript errors. The mobile suggestion preview was visually inspected.

Full-suite results are recorded in `fifth-pass/tests.json`; browser results and the mobile screenshot are in the same directory. Root and desktop bundles were rebuilt.

Tests use synthetic content, controlled AI responses, and an isolated Chromium component. They do not certify live services, the entire host shell, microphone hardware, or every export format.

## Remaining audit work

Stable dictation targets, broader rubric support, project identity migration, and full host/export testing remain separate follow-up work. Camera-only generation and other artwork operations still need their own replacement-safety review. This pass does not add a global error boundary or cancel controls to every optional coach.

Final validation: the full run passed 157 tests, with six recovery tests unable to run because their setup timed out. A separate recovery-and-coach rerun passed all 12 tests, verifying all 163 distinct Story Forge tests across the two runs. See `fifth-pass/recovery-retry.json`. Module mirrors and English fallback labels match, and diff whitespace checks pass.
