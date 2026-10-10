# Word Sounds independent practice — 2026-10-09

Spelling Bee now requires letter entry. Missing Letter and Word Scramble keep the complete answer hidden until the learner explicitly reveals it or receives the later answer reveal. Sound/letter speech transcriptions, and other spoken mismatches, can be checked and retried before an attempt is scored.

## Changes

- Spelling Bee always presents its typed spelling input, even when voice mode was selected in the preceding activity. Its speech-scoring controls are unavailable; the word can still be heard and existing spelling hints remain. Autocorrect, autocomplete, automatic capitalization and spell checking are disabled on the spelling input. This does not attempt to detect external operating-system dictation.
- Spelling startup now plays its instruction and word in one ordered sequence. Manual replay claims the channel and cancels delayed automatic playback. Switching instructions off now schedules word playback because the automatic-start effect observes the setting. Hear slowly now actually plays at half speed; normal replay returns to the selected speed. The native browser trace exposed both the old startup race and the old slow control passing arguments that only preloaded audio.
- Picture visibility controls only pictures. Missing Letter and Word Scramble no longer display their complete target automatically. Their practice-only Show word / Hide word control is explicit, has a pressed state and a minimum 44px target, and records printed-word support immediately. Hiding the word again cannot erase that support. Probe views have no reveal control; other activities retain their text policies.
- The full/compact letter-sound anchor is also hidden in those two activities until the word is revealed. Its example word, sentence, tooltip and accessible labels otherwise could expose the answer, especially words such as cat. The learner's stored anchor mode is preserved when it becomes available again.
- A final isolated-sound or letter transcription shows “I heard…” and asks for confirmation. Other spoken responses also wait for confirmation when the recognized text does not match. Matching whole-word oral responses retain their existing automatic grading. Use this answer submits once; Try again and pointer fallback do not consume an attempt. No answer key or pronunciation-confidence claim appears in the confirmation.
- Confirmation belongs to one exact record, word, answer slot, activity, session, playback run and item advance. Mode changes, replay, new capture, navigation and teardown discard it. Old recognition callbacks or old confirmation buttons cannot score a newer item or newer recording. Microphone errors and silence offer inline recovery without recording an incorrect response. Review receives keyboard focus; returning to buttons/typing returns focus to the activity or input. A prior transcript is suppressed while a new review or recovery notice is displayed.

## Verification

- **59 regression groups passed**: 24 voice-mode/confirmation/spelling groups, 18 microphone lifecycle groups, 7 isolation startup groups and 10 visibility/support groups. These execute production hooks, controls, prompt rendering, actual anchor gating and real core evidence logic. Both native and shared recognition wrappers are covered.
- **99 focused tests across nine files passed** on the final source: feedback ordering, instruction channel, audio status, board lifecycle, student pack contract, teacher controls, view identity, syllable playback and startup.
- **20 native Chromium scenarios passed** with the production Word Sounds modal. Cases cover typed spelling, cancelled inherited capture, native/shared confirmation, duplicate results, retry, mismatches, same-word target edits, pointer/error recovery, picture/text independence, full/compact anchor visibility and portable lesson reopening. Additional spelling checks verify instruction completion before one automatic word, normal/slow/normal native rates, early manual replay and the real instructions-off toggle. The four prior isolation audio checks remain: microphone interruption of sequences, exclusive rapid replay, late TTS cancellation with strict Kokoro/English options, and unmount cancellation.
- Native Audio plays existing local Kokoro word-bank clips and standard-bank instruction/phoneme clips. The harness serializes portable lesson data through the actual live-AAC serializer, performs a JSON round trip, and mounts a fresh modal. No external requests or page errors occurred. This is a production serialization boundary check, not the full host application's saved-lesson picker or cloud delivery.
- Inspected confirmation captures at 390px and 1280px. The transcript, confirmation and recovery controls are readable and contained within the modal. Icon components are substituted by the harness; this is not a full host visual audit.
- Four runtime copies match and all three existing loader references are verified. Studio setup source/module, shared voice module, core and readiness contract match the pre-pass hashes. Syntax and scoped whitespace checks pass; independent reviews found no remaining blocker.

## Initial findings and limits

A later native playback run exposed the Spelling Bee startup race: the word began before its instruction and was cut off, with no completed word playback. The trace is retained under initial-failures/spelling-audio. Startup and manual/slow replay were repaired and covered by final native playback assertions.

The first browser run passed ten speech/spelling scenarios and then exposed the separate anchor answer leak. Its results and screenshots are preserved under initial-failures/browser-anchor. The anchor gate was fixed and visibility checks were strengthened to inspect visible text and accessible labels/descriptions in full and compact modes, after Hide word, and after portable reopening.

One final focused-test attempt timed out while starting a fork worker before any tests ran. Its receipts are retained under initial-failures/test-worker and it is not counted as a pass. Another all-in-one run terminated with a native memory-allocation error. Its partial output is retained under initial-failures/test-memory and is not counted as a pass. The completed final suite used three serialized batches with single thread workers. Earlier successful intermediate-source runs remain in the task workspace and are not substituted for final-source verification.

One browser attempt timed out waiting for native instruction completion: the trace showed playing, but no ended or pause event. Available system memory was approximately 116 MiB when inspected afterward. That failed run is retained under initial-failures/media-stall and is not counted as a pass; the final browser receipt comes from a subsequent run of the same assertions.

The next browser run completed instruction/word ordering, normal-slow-normal replay, and early manual replay, then found a separate silent-start bug: the instructions-off effect omitted the changed setting from its dependencies. That trace is retained under initial-failures/instructions-off. The dependency was added without resetting the manual-play marker, and all final verification was rerun against the corrected source.

The first portable-image assertion used an unsupported URL-encoded SVG fixture. Production student-pack serialization deliberately removes that format. The fixture was corrected to a supported base64 PNG, with exact serialized-image preservation and successful native image-load assertions. No production serializer was changed; the original failed fixture receipt is retained under initial-failures/image-fixture.

A second first-play native-media timeout occurred on the final source, retained under initial-failures/media-stall-final-source. Browser wait limits were increased from 12 to 30 seconds for scheduling tolerance; all completion, ordering, single-play and overlap assertions remain in place.

A later trace showed one native play request, two playing events, and one ended event for the same clip. Browsers may emit playing again when playback resumes after buffering. The fixture now counts explicit play calls to assert one request, checks the rate of every playing event, and still requires natural completion, instruction ordering and exclusive audio. The original overcount is retained under initial-failures/rebuffer-fixture.

Speech events and delayed TTS responses are controlled fixtures. Existing Kokoro recordings are played natively, but no new live-provider generation or pronunciation assessment was performed. Physical microphone hardware, browser permission UI, real speech-service transcription accuracy and full-host delivery still need device-level validation. No full application build, staging, commit, push or deployment was performed. Unrelated shared checkout/index work was preserved.

## Reproduce

Run from the repository:

```text
node dev-tools/word_sounds_voice_mode_regression.cjs
node dev-tools/word_sounds_mic_lifecycle_regression.cjs
node dev-tools/word_sounds_isolation_startup_regression.cjs
node dev-tools/word_sounds_learning_visibility_regression.cjs
node --expose-gc dev-tools/word_sounds_voice_modes_acceptance.cjs
```

Browser checks require Playwright/Chromium. Set `WORD_SOUNDS_QA_OUT` for the evidence directory. Runtime SHA-256: `68200204d6d7d1f049d4889cef8336bb06a67566042494922d2f9e3947ef5c75`.
