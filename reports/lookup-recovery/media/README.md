# Track 11: picture and pronunciation startup recovery

**Additional pending delta:** [../cache/README.md](../cache/README.md) adds a separate
dictionary cache/provider recovery patch. Its 338-test run uses these unchanged media
candidates alongside the new dictionary candidate. These media patches remain pending
and should be integrated together with that complementary dictionary delta.

This batch prepares three incremental patches for the shared engine, host, and reader.
**318 cases across 12 test files are verified**, including a targeted rerun of one
existing bundle-comparison test that initially exceeded its five-second test budget.
Shared application files and generated application bundles were not edited.

The preceding cancellation, dictionary-outcome, picture-retry, and announcement batch
is now integrated in the inspected shared source. Do not reapply the older patches in
`resilience/` or `enhancements/`.

## Baseline and source evidence

Initial and final HEAD: `2d6010185ecb09dfd69c043d79996eba5060caa5`.
The source hashes in `baseline.json` still matched at final verification. This local
checkout and its public mirror do not identify the deployed release. No applicable
`AGENTS.md` was found in the workspace or inspected ancestors.

| Priority | Source gap | Minimal change |
| --- | --- | --- |
| P2 | `host_handlers_source.jsx:8439` awaits picture generation without a deadline or cancellation signal. A provider that never settles leaves the picture retry control busy. | Bound the wait, abort the provider on timeout or popup cancellation, and expose a retryable timeout reason. |
| P2 | `view_simplified_source.jsx:3504` awaits synthesis, then `view_simplified_source.jsx:3515` awaits playback startup without a deadline. | Bound synthesis plus playback startup; stop and clean up the owned player on timeout, then retain the existing retry action. |
| P2 | `content_engine_source.jsx:2999` cancels the text/dictionary attempts but exposes no popup lifetime signal to the separate picture handler. | Add a transient signal to the immutable lookup request and abort it when that lookup is dismissed or replaced. |

These are confirmed source gaps. The candidate tests reproduce stalled providers and
playback promises deterministically and verify recovery; no deployed-app failure or
live-provider latency was reproduced.

## Behavior and compatibility

**Pictures.** The existing context, cache key, and ownership checks remain intact.
The host passes a signal through the provider's existing fourth options argument,
verified in `AlloFlowANTI.txt:31330`. A hung request becomes retryable after 60 seconds.
Closing the popup, Escape, changing the reading, selecting a new occurrence, or unmounting
aborts the owned provider request through the engine's lifetime signal. The local wait
also settles when a provider ignores cancellation. Late results cannot populate the popup
or image cache after timeout or dismissal. Newly returned images are discarded if AI was
turned off during the request. Already cached pictures remain usable by the host.

The lifetime signal stays valid across AI retries of the same selected occurrence;
an AI text retry does not permanently disable picture requests. It is transient popup
state and must not be saved with an artifact. Older callers without that signal retain
deadline recovery and stale-result guards but cannot trigger immediate transport abort
on close. All three patches should be integrated together.

**Pronunciation.** The startup budget covers synthesis and `audio.play()` together.
The default is 30 seconds. After playback starts, the startup timer is removed, so a long
selected passage can finish playing. Timeout, Stop, dismissal, navigation, and unmount
remove the timer and prevent late audio from starting. Playback error events also settle
the local wait when the underlying play promise hangs.

The existing TTS arguments, selected passage language, voice, shared narration behavior,
and cache ownership contract remain unchanged. The popup cancels its own wait; it does
not abort the shared TTS transport. Late uncached blob URLs are released, while cache-owned
URLs are preserved. Failed and timed-out controls retain focus, show the existing retry
action, and clear their busy state. Dictionary and prepared help remain available.

Optional values under `window.AlloFlowConfig.timeouts`:

| Setting | Default | Accepted range |
| --- | --- | --- |
| `readingPictureMs` | 60,000 ms | Positive finite values clamped to 1,000–180,000 ms |
| `readingAudioStartupMs` | 30,000 ms | Positive finite values clamped to 1,000–120,000 ms |

Invalid or nonpositive values use the defaults. These are bounded UI recovery defaults,
not latency guarantees for every local or cloud provider. Playback stalls after a successful
start are outside this startup change.

## Tests and verification

The initial full run recorded **317 passed and one timeout**. The existing
`ships the speaker in the built and deployed modules` test exceeded its five-second
budget while reading/comparing shared files. Both local bundle hashes matched. A targeted
rerun with a 15-second test budget passed; no assertion, source, or bundle was changed to
obtain that result. `tests.json`, `retry.tests.json`, and `verification.json` retain both
results and reconcile the exact failed test identity. The other 30 tests in that file
were skipped only in the targeted rerun; they passed in the initial full run.

The 38 new cases cover:

- Picture deadline boundaries, configured limits, provider abort rejection, and operation
  without AbortController; retry keeps the original passage and prepared/dictionary help.
- Never-settling picture providers, detached cancellation listeners, already-aborted
  requests, AI disabled during generation, and cached-picture reuse without a new wait.
- One engine lifetime across text retries and a new lifetime for a newly selected pane.
- Real reader → engine → host picture cancellation on close, Escape, navigation, new pane,
  and unmount; timeout retry retains keyboard focus and rejects late cache writes.
- Synthesis timeout and retry in both bilingual panes with ambient settings changed.
- Hung playback, late resolve/reject, immediate playback-error cleanup, Stop while loading,
  dismissal/navigation/unmount, URL ownership, and uninterrupted long-passage playback.
- Audio timeout limits, busy state, actionable messages, and keyboard focus.

Existing regression cases retain saved artifact grade, exact-comparison and bilingual pane
context, prepared help, dictionary/AI independence, retry without reselection, contextual
speech, paired pronunciation recordings, and keyboard behavior.

The candidate tests use frozen engine/reader modules and the extracted candidate host
handler. Dictionary tests use an unchanged frozen dictionary source. Adjacent lifecycle
and AI-guard tests retain their existing production-module loaders. The bundle parity
check compares two local files and does not prove deployment parity. No browser, network
provider, live application, or deployment test was performed.

All three candidates parse, transforms are idempotent, patch application reproduces the
recorded candidate source, and read-only `git apply --check` succeeds. The source, dictionary,
and reader-place dependencies matched their recorded hashes at final verification.

## Integration handoff

- `engine.patch` → content engine owner, after dependency 06. Preserve the transient
  `lookupRequest.signal` lifetime across retries and abort it on session cancellation.
- `host.patch` → host owner. Retain context/meaning checks and the existing image cache;
  pass the cancellation signal through the supported image options argument.
- `reader.patch` → reader/popup owner. Retain owned-player cleanup, TTS cache URL ownership,
  and independent lookup statuses. Normal translation integration should add
  `simplified.word_audio_timeout` and `simplified.lookup_picture_timeout`; English fallback
  copy is provided and shared locale files were not edited.

Dependency 06's revision behavior is preserved. For track 17, selected pane language still
comes from `data-reading-language`; this batch adds no renderer language argument or
language-label mapping. Both panes are exercised with differing ambient settings.
No other session was contacted.

Review and apply these incremental patches, reconcile newer owner changes if needed,
then use the normal mirror and generated-module workflow. Full candidate copies are test
artifacts, not replacements to copy over shared files. Track 11 changed only its preparation
script, focused test harnesses/cases, and handoff artifacts in this batch.

Prepare: `node dev-tools/prepare_reading_lookup_media.cjs`.
Verify without applying: `node dev-tools/prepare_reading_lookup_media.cjs --verify`.
Regenerating candidates changes the target and requires a fresh test run.

The full recorded run used:

```powershell
$env:ALLO_ENGINE_CANDIDATE='reports/lookup-recovery/media/content_engine_module.candidate.js'
$env:ALLO_VIEW_CANDIDATE='reports/lookup-recovery/media/view_simplified_module.candidate.js'
$env:ALLO_DICT_CANDIDATE='reports/lookup-recovery/media/dictionary.baseline.source.js'
$env:ADAPTED_HELP_VIEW='reports/lookup-recovery/media/view_simplified_module.candidate.js'
$env:ALLO_LOOKUP_HOST_CANDIDATE='reports/lookup-recovery/media/host.candidate.source.js'
node node_modules/vitest/vitest.mjs run tests/reading_word_image_ownership.test.js tests/dictionary_lookup_cancellation.test.js tests/reading_lookup_recovery.test.js tests/reading_lookup_popup_adapter.test.js tests/adapted_word_help_lifecycle.test.js tests/adapted_explanation_lifecycle.test.js tests/student_ai_hidden_host_guard.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_ui.test.js tests/adapted_reader_fixes.test.js tests/original_reader_markdown.test.js tests/reader_keyboard_a11y.test.js --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/media/tests.json
```

The targeted rerun used the same reader candidate and:

```powershell
node node_modules/vitest/vitest.mjs run tests/adapted_reading_popup_read_aloud.test.js -t 'ships the speaker in the built and deployed modules' --testTimeout=15000 --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/media/retry.tests.json
```

No deployment, push, Git mutation, app server, or saved app-state change was performed.
