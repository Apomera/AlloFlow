# Track 11: cancellation, dictionary outcomes, and picture retry

This follow-up is implemented as **three isolated patches with 270 passing tests in
12 files**. Shared application source, host, mirrors, and generated application bundles
were not edited. Integration remains with their active owners.

The earlier four enhancements are now present in the inspected shared source:
image ownership, contextual dictionary meanings, paired pronunciations, and retry focus.
The patches here are incremental against that integrated source. Do not reapply the
older patches from `enhancements/` or `FOLLOWUP.md`.

## Baseline and evidence

Initial and final inspected HEAD: `6b63e76e862125e87422f02a54ed60beac68e8fb`.
This is a concurrently edited local checkout; it does not identify the deployed release.
No applicable `AGENTS.md` was found in the workspace or its inspected ancestors.
`baseline.json` records the exact shared source and candidate hashes; `verification.json`
records matching final source hashes and successful read-only patch applicability checks.

Source-confirmed gaps addressed in this batch, all within the P2 recovery lane:

| Rank | Evidence in the inspected shared source | Incremental change |
| --- | --- | --- |
| 1 | `content_engine_source.jsx:3018` awaits AI without a lookup deadline or signal; `content_engine_source.jsx:2952` cancels dictionary/audio but only invalidates AI results. | A per-attempt deadline and AbortController; dismissal, replacement, and retry also settle the local wait when the provider ignores abort. |
| 2 | `dictionary_loader.js:173` returns null for missing entries, provider failures, invalid data, and unavailable transport. `content_engine_source.jsx:2983` therefore cannot distinguish them. | Optional detailed outcomes while keeping the legacy entry-or-null lookup API. |
| 3 | `view_simplified_source.jsx:5209` renders an image error with no recovery action. | A persistent picture action that supports retry without reselection and retains keyboard focus. |
| 4 | The same reader line derives the old definition announcement from `status`, while the engine supplies `aiStatus`; phonics can announce failure despite usable dictionary pronunciation. | New lookup payloads use their independent status regions; legacy payloads retain the legacy announcement. |

These are source gaps, not claims of reproduced failures in the deployed app. Deterministic
candidate tests verify the repaired behavior. No live-provider, browser, deployment, or
production-bundle parity test was performed in this follow-up.

## Behavior and compatibility

**Bounded AI lookup.** Each definition or phonics attempt owns a controller and timer.
The default deadline is 45 seconds. Optional
`window.AlloFlowConfig.timeouts.readingLookupMs` accepts a positive finite value clamped
to 1–180 seconds; invalid or nonpositive values use the default. Timeout changes only
AI status and offers retry; dictionary, prepared help, and the captured passage survive.
Retry uses the original saved grade, language, selection, and occurrence.

The controller is passed through the existing sixth `callGemini` argument, verified at
`gemini_api_source.jsx:875`. There is no provider-signature change. Abort is best effort;
the local cancellation race and existing ownership guards also handle providers that
ignore it. The deadline covers text analysis, not optional legacy eager audio. Definition
and phonics requests have independent ownership. A result that arrives after AI is turned
off settles as disabled and does not populate new AI help.

**Detailed dictionary recovery.** `lookupDetailed(word, options)` resolves to
`{ entry, reason }`. Success uses `reason: null`; failure reasons include `not_found`,
`request_failed`, `invalid_response`, `not_available`, `unsupported_word`, and `cancelled`.
The engine owns the 10-second dictionary deadline and reports `timeout` for that case.
It still supports older dictionary loaders through `lookup()` with a generic outcome.
Only a real 404 creates a cached miss. Explicit retry may bypass that miss; positive
cached entries remain usable. Cancelled or malformed responses never populate the cache.

Dictionary retry remains independent of AI and works with AI disabled. Non-English and
multiword selections accurately explain the dictionary's existing English-word coverage.
No request is sent to the English dictionary for the other bilingual pane.

**Picture recovery and announcements.** The picture button remains mounted through error,
retry, loading, and success, using guarded `aria-disabled` and `aria-busy` states. Repeated
activation during loading or after success does not call the handler. A failed picture
leaves the explanation and dictionary entry intact. AI-disabled readers cannot request a
new picture through this control; an existing picture remains visible.

The reader reuses the already integrated `handleFetchWordImage` ownership checks in
`host_handlers_source.jsx:8406`. This batch does not change the host or add an image
transport timeout. The new lookup status regions announce available dictionary help
and AI failure independently, without the older contradictory loading/failure message.

## Focused acceptance cases and results

`tests.json` records **270 passed, 0 failed, 12 files**. The candidates were frozen before
this run. Coverage added or strengthened includes:

- A never-settling provider: close resolves the handler and aborts its signal; all timers
  are removed. Late success/rejection cannot reopen the popup.
- Retry supersedes an older attempt while the independently owned dictionary continues.
- At 44,999 ms AI remains loading; at 45,000 ms it times out with prepared/dictionary
  help intact. Retry uses the same prompt after ambient grade/language change and DOM removal.
- Timeout configuration bounds and environments without AbortController.
- AI switched off before success or rejection: dictionary help remains; late AI is not shown.
- Real 404 versus offline/server/invalid JSON/malformed data; transient failures remain
  uncached and retryable. Aborted results cannot create a cached miss.
- Dictionary deadline wins over an abort-triggered transport completion.
- Both popup types display timeout and service-specific messages; AI-off dictionary retry
  succeeds without an AI call. Spanish coverage does not invoke the English dictionary.
- Button, Escape, backdrop, reading identity/text change, comparison change, and unmount
  abort pending work. Late completion does not restore the popup.
- Picture retry retains the same focused button through repeated failure, loading, and
  success; busy/ready activation is ignored; AI-off behavior preserves existing pictures.
- Dictionary success and AI failure produce accurate status announcements in both popups.

The three focused recovery suites contain 132 candidate tests. Five adjacent reader
suites contain 104 tests against the frozen reader candidate. The image suite contains
12 tests against the unchanged integrated host snapshot. The remaining 22 tests in
three lifecycle/AI-guard suites use their existing production-module loaders; they are
adjacent regression checks, not candidate engine parity evidence.

Existing coverage also preserves saved artifact grade over ambient settings, both bilingual
and exact-comparison panes, repeated-word and multi-block context, dictionary-success/AI-failure
ordering, prepared help, contextual speech, paired recordings, and retry focus.

## Ownership and integration handoff

Track 11 owns the preparation/verification scripts, the focused recovery tests, and this
report directory. Shared source changes are only in:

- `dictionary.patch` → dictionary loader owner (`dictionary_loader.js`).
- `engine.patch` → content engine owner (`content_engine_source.jsx`), after dependency 06.
- `reader.patch` → shared reader/popup owner (`view_simplified_source.jsx`).

Dependency 06's revision behavior is preserved. Track 17 should retain the current
language contract: lookup context is captured from the clicked `data-reading-language`
pane with saved artifact fallback; no extra renderer language argument is needed.
Dictionary capability is separate from passage and speech language. New `simplified.lookup_*`
message keys in the reader patch use English fallback copy and need the normal translation
workflow; shared locale files were not edited. No other session was contacted.

The integrator should review and apply these three incremental patches against the recorded
baseline, reconcile any newer owner changes, then perform the repository's usual source-mirror
and generated-module synchronization. Do not copy the full candidate sources over shared
files. Candidate modules are test artifacts, not deployment replacements.

Preparation: `node dev-tools/prepare_reading_lookup_resilience.cjs`.
Verification: `node dev-tools/verify_reading_lookup_resilience.cjs`.
The latter only checks application files and writes `verification.json`; it never applies patches.
Regenerating candidates changes the test target, so rerun the focused suites afterward.

The recorded test run used these environment variables:

```powershell
$env:ALLO_ENGINE_CANDIDATE='reports/lookup-recovery/resilience/content_engine_module.candidate.js'
$env:ALLO_VIEW_CANDIDATE='reports/lookup-recovery/resilience/view_simplified_module.candidate.js'
$env:ALLO_DICT_CANDIDATE='reports/lookup-recovery/resilience/dictionary.candidate.source.js'
$env:ADAPTED_HELP_VIEW='reports/lookup-recovery/resilience/view_simplified_module.candidate.js'
$env:ALLO_LOOKUP_HOST_CANDIDATE='reports/lookup-recovery/resilience/host.baseline.source.js'
node node_modules/vitest/vitest.mjs run tests/reading_word_image_ownership.test.js tests/dictionary_lookup_cancellation.test.js tests/reading_lookup_recovery.test.js tests/reading_lookup_popup_adapter.test.js tests/adapted_word_help_lifecycle.test.js tests/adapted_explanation_lifecycle.test.js tests/student_ai_hidden_host_guard.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_ui.test.js tests/adapted_reader_fixes.test.js tests/original_reader_markdown.test.js tests/reader_keyboard_a11y.test.js --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/resilience/tests.json
```

No deployment, push, Git mutation, app server, or saved app-state change was performed.
