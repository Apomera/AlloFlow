# Direct Listen along — isolated reader enhancement

User authorized continued enhancements and left prioritization to this task. Chosen scope: karaoke discoverability and safe navigation, following the user's uncertainty about karaoke after generating reading supports.

**Status: tested candidate only; no shared reader/helper/host/generated-file writes or shared builds in this enhancement turn.** Integration 01 retains ownership of those files. No messages to other sessions, commits, installations, servers, or deployment.

## Incremental integration

Use `listen-along-source.patch`, not whole-file copies from `candidate/`. Shared source changed after capture. The patch contains only:

1. `view_simplified_source.jsx`: 27 added / 8 removed lines. Adds **Display → Listen along** for a single Original or Adapted reading, reusing the existing playback-only comparison karaoke overlay and sentence/language resolver. Removes the need to enter Immersive Reader or prepare/save immersive word data first.
2. New `tests/reader_listen_along_access.test.js`: 20 focused interaction cases, packaged with repository-relative imports and the normal module fallback.

The candidate module is for isolated testing only. After applying the source delta, rebuild the current combined reader through the integrator's normal build/mirror process. Do not copy the candidate module over current generated artifacts.

## Behavior and safeguards

- The new action stays inside Display; the main reading toolbar gains no extra button. Both view retains its two existing pane-specific Listen along buttons.
- Supports work for Original and Adapted readings, for teachers and students, without rewriting source text or modifying generated supports.
- Opening stops the existing playback and closes overlapping lookup/revision popups. Closing returns keyboard focus to the activating control.
- The overlay is scoped to resource ID, exact text, language, role, learner, view, comparison source, and comparison language. Scope changes or entry into editing dismiss it.
- Student preview explicitly blocks both direct and comparison activation, even if an overlay component is accidentally supplied.
- Editing, missing overlay module, empty prose, and table-only content disable direct activation.
- Bilingual sentence language and duplicate occurrence identities use the existing resolver. No new TTS backend, capture preferences, Save/Retry behavior, clip-compatibility logic, or immersive preference writes are introduced.
- Reuses the already-computed karaoke sentence list for availability. Opening performs the existing sentence-entry extraction. Scope checks compare primitive values without serializing full text on each render.

## Captured baseline and applicability

Observed HEAD: `6b63e76e862125e87422f02a54ed60beac68e8fb`. Captured reader SHA-256: `069c3751a49d02356db0093c996266ed96ba1687501458afd9acee494f8aa595`.

At the final read-only check, shared reader SHA-256 was `afe7ba74c50f3ce9663855883c43289dd8f4e9e7b05d331be80284687dae4995`. `git apply --check` succeeded both against the captured base and against that current shared checkout. No patch was applied to the shared checkout. Recheck applicability before integration if source has moved again.

All captured-input, candidate, test, and patch SHA-256 values are in `hashes.json`. The `base/` directory preserves the three reader build inputs used for validation.

## Validation

```
node reports/reader-listen-along-enhancement-2026-09-26/build.cjs
node node_modules/vitest/vitest.mjs run --config reports/reader-listen-along-enhancement-2026-09-26/vitest.config.mjs --configLoader native
```

Final run: **4 files, 104 tests passed**, started at local 19:04:55 on 2026-09-26, duration 12.40 seconds. Suites: isolated direct-access tests, reader Display controls, reader keyboard accessibility, and reader place/review/adaptation. All three existing suites explicitly loaded the candidate through `ALLO_VIEW_CANDIDATE`.

Candidate compilation and syntax validation passed. Babel emitted its normal large-source formatting note. Patch applicability checks passed. No live TTS service or browser session was exercised: the new tests use the real reader controls and stub the audio overlay/provider; existing reader behavior runs against the candidate.

## Ownership boundaries and remaining work

No shared hunks landed in this enhancement turn. The two-file patch remains proposed for integration 01. Narration Save/Retry focus, clip compatibility/recovery, immersive preference writes, and lifecycle work remain with their existing owners. `prepare-controls.cjs` is a one-time construction script and should not be rerun; `build.cjs` and `package.cjs` can be rerun for isolated verification/packaging.
