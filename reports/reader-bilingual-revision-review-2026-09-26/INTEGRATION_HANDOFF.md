# Review both language changes before Apply

Status: **verified isolated candidate; ready for Integration 01**. This enhancement has not been applied to shared source or deployed. The user authorized continued improvements and left prioritization to this task. No shared reader, content-engine, host, helper, or generated files were edited; no shared builds, installs, servers, commits, deployments, or messages to other sessions were used.

## Problem and resulting behavior

The current content engine validates and commits a bilingual pair atomically, but the revision popup shows only the selected passage's result. A teacher cannot review the counterpart change before applying the pair.

The candidate shows Before and After for both language panes, with recorded language labels and Selected passage / Matching passage badges. Apply is labeled **Apply both changes**. Missing, incomplete, or mismatched review data disables Apply and explains how to retry. Changing the reading continues to dismiss the existing revision dialog.

The core supplies a frozen pair after its existing pair, occurrence, and citation validation. Its private pending transaction retains the same review object; Apply rejects a replaced or missing object. Mutable legacy replacement metadata remains ignored. Both updates still commit once through the existing transaction; there is no extra translation pass. Existing stale-result checks and citation conservation remain in effect. This is an in-memory review contract, not a new persisted schema.

Single-language revisions and explanations retain their current behavior. Student view does not expose teacher revision controls. The dialog remains viewport-clamped and stacks panes on narrow screens. Each passage has its own language and writing direction. The existing popup speaker reads only the selected change in its recorded language and retains the existing audio ID and cleanup behavior. No TTS provider or karaoke behavior changes are included.

## Integration scope and ownership

Apply **bilingual-review-source.patch** as a bounded delta, not whole-file copies from candidate/. It contains:

1. `content_engine_source.jsx`: immutable review data associated with the already validated transaction; one additional Apply identity check.
2. `view_simplified_source.jsx`: review validation, two-pane Before/After presentation, selected-change audio language, and the Apply label/availability.
3. New `tests/reader_bilingual_revision_review.test.js`: 16 integration cases using the real candidate engine and reader with mocked model/audio calls.

Integration 01 owns merging these shared source changes and rebuilding/mirroring the combined generated modules. Reader ownership includes the six localization keys in **strings.json**; the candidate already has readable English fallbacks and reuses existing Before/After keys. This package deliberately does not edit shared localization files.

This enhancement depends on the integrated track 06 transaction and the current reader popup lifecycle. It leaves vocabulary validation, adaptation preview ownership, narration Save/Retry focus, clip recovery, and immersive preference writes with their existing owners. No cross-session coordination was initiated.

## Baseline and applicability

Captured and final observed HEAD: `452e7cd230b62f4e192f055826817653d5b997f4`. This identifies the local checkout only; it is not a claim about the deployed release.

- Reader source SHA-256: `d953f735f98b5904d52203d0b028bf2a1968e6213df0be37b41e30baebb29b22`.
- Content-engine source SHA-256: `b541b4d6e29c097f8955314acb87f82344e62f6ce2c4418879ddc4275d6edee8`.

Both hashes were unchanged at final packaging. `git apply --check --whitespace=error-all` succeeded against both the captured base and the current checkout. These were checks only; no patch was applied. Recheck if shared source moves. **hashes.json** records the captured inputs, candidate source/modules, test files, build/config files, strings, and patch.

No applicable AGENTS.md instructions were found in the workspace/ancestor inspection for this enhancement.

## Verification

The isolated build compiled and syntax-checked both modules. Babel emitted its normal large-source formatting note.

Final focused run: **5 files, 137 tests passed**, started at local 23:37:49 on September 26, 2026; duration 21.56 seconds. Suites included the new bilingual review cases, existing atomic bilingual transactions, revision targeting, adapted-reading popup read-aloud, and reader keyboard accessibility. All tested revision/reader modules loaded the isolated candidate through environment overrides. The copied transaction suite changes only its setup import and candidate module loader.

The new cases cover selecting either pane, previewing both exact changes, one atomic commit with one model response, frozen review data, replaced review rejection, missing/partial/mismatched review rejection, changed-resource dismissal, recorded versus ambient language, citations and literal dollar replacement characters, narrow viewport bounds, Arabic direction, selected-pane speech, single-language Apply, Explain, and student view.

Initial new-test failures were corrected by supplying the full recorded language profile, using the existing `mono` pane ID, and expecting the existing close-on-resource-change behavior. No production behavior was weakened to satisfy the tests. The underlying artifact-context resolver and its normalization rules remain unchanged.

Reproduction commands (write only within this report's candidate/cache directories):

```powershell
node reports/reader-bilingual-revision-review-2026-09-26/build.cjs
node node_modules/vitest/vitest.mjs run --config reports/reader-bilingual-revision-review-2026-09-26/vitest.config.mjs --configLoader native
node reports/reader-bilingual-revision-review-2026-09-26/package.cjs
```

The config explicitly excludes the packaged copy of the new test to avoid running it twice. `prepare-controls.cjs` is a one-time construction script and must not be rerun.

No live browser, live TTS service, or deployed release was exercised. Before release, the reader owner should visually check the wider dialog on desktop/mobile and translated labels after rebuilding the combined source. Candidate generated modules are test artifacts only; do not copy them into shared generated outputs.
