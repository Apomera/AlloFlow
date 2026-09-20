# Word Sounds: prepared Word Families consistency — 2026-09-19

Word Families now uses the matches and distractors prepared for the lesson. Previously the compiler selected one board and packed its media, while the player independently chose another subset. A mounted-player test reproduced the mismatch before this change.

## Changes

- Added a shared validator for prepared family boards. Boards need matches and distractors, distinct nonblank canonical labels, and no overlap. Generated boards must match the target's stated spelling ending. Explicit teacher-edited exceptions retain their authority.
- The compiler normalizes family labels, filters automatically generated members to the selected ending, deduplicates choices, and preserves teacher-edited order when preparing a pack again.
- The player uses valid prepared choices without rerolling or truncating them. Instructions and display use the same resolved family, including during eager activity initialization.
- Automatic instructions and the board replay button use the exact full phrase that setup packs for prepared boards. This removes the requirement for an additional bare-family clip on that path.
- Newer live teacher edits supersede an older prepared board. Older packs and invalid prepared boards continue through the existing fallback resolver.

## Verification

The original full-player test failed when it tried to select the compiled Word Families matches; it now passes. Additional tests check the complete rendered match/distractor set, board validation, compiler normalization, teacher order, teacher overrides, fallback behavior, and the shared audio phrase.

**All 638 tests across 57 files passed in the full regression run**, including 21 additional checks. JavaScript syntax and shared-core synchronization checks passed; both browser-served modules match their source builds.

Reports are saved under `reports/word-sounds-family-parity-2026-09-19/`. The setup module was rebuilt and both browser-served module copies were synchronized.

## Limits

Board validation checks spelling-family structure and scoring consistency. It does not certify pronunciation, instructional decodability, or the quality of a teacher-authored exception. The older fallback resolver remains available for legacy content. Tests use controlled media behavior; this pass does not establish real-device audio decoding quality.

Changes are local; no deployment was performed.
