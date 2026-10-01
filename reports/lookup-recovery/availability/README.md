# Track 11: recover AI availability and display partial phonics

Prepared isolated engine and reader changes for retry after AI becomes available and
for phonics responses that contain useful IPA or syllables without phonetic spelling.
**368 tests passed across 13 files.** Shared application source and generated/public
mirrors were not edited; integration remains pending.

## Baseline and reproduced evidence

Initial inspected HEAD: `3752fe48d98ee8096e456d766427f3f513a11b25`.
Prepared and verified HEAD: `13ebcc73f5784436643adc7c12ff8d83d5b29028`.
The checkout advanced during the work. All relevant source, dependency, patch, and
compiled-candidate fingerprints matched their recorded baseline at final verification.
`baseline.json` and `verification.json` contain the full fingerprints. No applicable
`AGENTS.md` was found in the workspace or inspected ancestors. This checkout does not
identify the deployed release.

| Priority | Current-source evidence | Status |
| --- | --- | --- |
| P2 | `content_engine_source.jsx:3276` treats a missing provider as policy-disabled; `view_simplified_source.jsx:3577` uses a previous disabled status as a continuing block. | Reproduced: enabling AI leaves the existing definition popup without retry; a missing provider is incorrectly described as AI being off. |
| P3 | `content_engine_source.jsx:3396` accepts useful partial phonics; `view_simplified_source.jsx:5478` always renders the phonetic-spelling section. | Reproduced: an IPA-only response produces an empty spelling section. |

Three selected cases failed against frozen modules compiled from the unchanged source;
`source-reproduction.json` records those expected failures. The frozen source and baseline
modules are preserved here. These are jsdom source-level reproductions with deferred
mock providers, not live-provider or deployed-browser observations.

## Changes and existing safeguards

The engine now distinguishes `ready`, `disabled`, and `unavailable` availability. It
checks the current student policy, global policy flag, and guarded provider function
before every attempt and before committing completion. Missing providers yield a
retryable unavailable outcome, while policy-blocked calls stay disabled.

Each transient popup exposes a live `getAiAvailability` callback. The reader evaluates
it during rendering; a previous disabled outcome no longer masks restored availability.
An explicit retry becomes usable when policy and provider allow it. No AI call starts
automatically, and a stale click is checked again by the engine. Legacy popup data
without the callback keeps its conservative disabled behavior. This adds no polling;
the host's normal rerender after availability/policy changes updates the controls.

The original immutable request remains the owner of grade, pane language, passage,
selection context, retry, and cancellation. Useful dictionary/prepared help stays in
place. Closing or navigating still cancels the session and rejects late completion.
The current language contract's saved grade label is preserved (`3rd Grade` in the
integrated popup fixture), even when ambient controls change to grade 12/German.

The phonetic-spelling section renders only when normalized spelling is present. Useful
IPA, syllables, dictionary pronunciations, word audio, and passage audio remain available.
The parser still rejects responses containing no usable phonics information.

Clicked-pane language recovery through `data-reading-language` remains intact. No
renderer language argument, speech signature, saved-artifact field, or cache schema was
added. Existing dictionary/AI ownership and media cancellation safeguards are preserved.

## Verification and acceptance

Twenty new cases cover:

- Restoring definition and phonics retry in both English and Spanish panes without
  reselection, preserving saved grade, dictionary help, request identity, and keyboard focus.
- A missing provider returning, with accurate unavailable messaging and no automatic call.
- A policy change between render and retry click, including state-level policy and the
  provider's blocked marker, with no unauthorized provider call.
- Closing a restored retry before completion, then invoking a saved retry callback.
- IPA-only, syllables-only, whitespace spelling, and spelling-only phonics responses.

The initial focused candidate run passed 156/158 cases. The two new assertions expected
the old numeric grade spelling; they were corrected to the current contract's explicit
`3rd Grade` label. The final run passed **368/368**, with no skipped tests, across the
13 files listed in the command below. `focused-tests.json` preserves the initial run;
`tests.json` is the final complete result.

The candidate run combines freshly generated engine, reader, and host media recovery
with dictionary cache validation and the cache-race fix. The lifecycle and hidden-AI
guard suites retain their existing production-module loaders; focused engine/popup,
dictionary, image, and reader suites use the candidate overrides. The popup suite
exercises the real candidate engine and reader together. Local generated-bundle parity
is not a deployed-release check.

The transforms are idempotent; syntax parsing succeeds; cumulative and incremental
patches reproduce the candidates in memory. Read-only `git apply --check` succeeds for
all four cumulative patches. Final fingerprint verification reports `verified: true`.

## Ownership, dependencies, and integration

Track 11 owns the preparation script, its focused test changes, and this report directory.
Shared engine, reader, host, dictionary, translation, and generated files remain with
their respective owners/integrator. Dependency **06** still applies. Track **17** should
retain the existing language/grade contract and merge the two copy keys in
`strings.delta.json`; English fallbacks are included in the candidate. No other session
was contacted.

This directory refreshes the pending media candidates against current engine/reader
source. It leaves the older media and cache report artifacts untouched. The host and
dictionary candidate content is identical to the prior pending media/cache-race versions.

Choose an integration route after checking current source:

1. If the pending work is not integrated, use `engine.patch`, `reader.patch`, `host.patch`,
   and `dictionary.patch` here. They include the pending media and cache changes plus
   this batch and replace the earlier cumulative patches for those files.
2. If media/cache work is already integrated, use `engine-availability.patch` and
   `reader-availability.patch` for only this batch. Reconcile them against newer owner
   edits and merge `strings.delta.json` through the translation workflow.

Do not apply both routes or copy full candidates over newer shared source. Synchronize
mirrors/generated assets through the normal integration workflow and rerun the combined
checks after merging. The previously reported passage-boundary and long-selection gaps
remain separate planned work; this batch does not change text projection.

Prepare only isolated report artifacts:

```powershell
node dev-tools/prepare_reading_lookup_availability.cjs
```

The recorded final run:

```powershell
$env:ALLO_ENGINE_CANDIDATE='reports/lookup-recovery/availability/content_engine_module.candidate.js'
$env:ALLO_VIEW_CANDIDATE='reports/lookup-recovery/availability/view_simplified_module.candidate.js'
$env:ADAPTED_HELP_VIEW=$env:ALLO_VIEW_CANDIDATE
$env:ALLO_LOOKUP_HOST_CANDIDATE='reports/lookup-recovery/availability/host.candidate.source.js'
$env:ALLO_DICT_CANDIDATE='reports/lookup-recovery/availability/dictionary.candidate.source.js'
node node_modules/vitest/vitest.mjs run tests/reading_word_image_ownership.test.js tests/dictionary_lookup_cancellation.test.js tests/dictionary_lookup_race.test.js tests/reading_lookup_recovery.test.js tests/reading_lookup_popup_adapter.test.js tests/adapted_word_help_lifecycle.test.js tests/adapted_explanation_lifecycle.test.js tests/student_ai_hidden_host_guard.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_ui.test.js tests/adapted_reader_fixes.test.js tests/original_reader_markdown.test.js tests/reader_keyboard_a11y.test.js --testTimeout=15000 --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/availability/tests.json
node dev-tools/prepare_reading_lookup_availability.cjs --verify
```

Source reproduction uses the corresponding `*.baseline.js` engine/reader modules and
`host.baseline.source.js`/`dictionary.baseline.source.js`, the popup suite alone, and
`-t 'restores definition retry in the English pane|keeps useful IPA only|recovers definition when the provider returns'`.
The three baseline failures are expected evidence, separate from the passing final run.
Regenerating a changed candidate requires fresh tests.

No deployment, push, Git mutation, application server, live provider call, or saved
application-state change was performed. Test storage is confined to jsdom.
