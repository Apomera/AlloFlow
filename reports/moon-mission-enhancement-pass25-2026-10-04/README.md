# Moon Mission pass 25: release validation

Source and public mirror: `8a17b3ded263d9c526aa7edd97af69c5829bbd5927d0e21bd9b66e6377f0617a`. Pass 25 samples rendered terrain triangles for visual support and ground cues. Flight integration and landing grading retain their existing semantics.

The initial [focused report](unit-focused.json) records 28 passes and one failed fixture. The corrected long-stroke test uses actual Float32 mesh bounds; runtime out-of-bounds rejection is unchanged.

## October 5 validation

All **289 unit cases in 17 files** and **eight native dust/shadow browser workflows** passed, with zero skips or retries. The frozen Moon source hash remained unchanged throughout. Reports and deliberate captures are in [the collective release evidence](../releases/collective-2026-10-05/validation/SUMMARY.json). The original failed report is preserved.

Eight captures received visual review. The reduced-motion landing card obscures some contact geometry, airborne shadow edges are coarse, and fallback/phone dust is faint. Stills alone do not establish motion or continuity; the native workflows carry those checks.

The complete application suite and manual assistive-technology testing were not run in this release check.
