# Word Sounds voice modes and isolation replay — 2026-10-09

Voice mode now renders in Find Sounds, Spelling Bee, Word Scramble and Missing Letter. Switching response mode cancels the current capture; the microphone button explicitly starts or cancels listening. Find Sounds also recovers when a session temporarily clears and restores the same word.

## Changes

- Restore the missing voice overlay with an accessible start/cancel button, pressed state, listening status and recognized transcript. Correct the activity mode buttons and Check button labels. Disable manual Check during voice mode because a final spoken answer already submits itself.
- Compare microphone answers with the displayed activity's answer: the selected sound in Find Sounds, the hidden letter in Missing Letter, the reviewed changed word in Sound Swap, and the matching prepared rhyme in Rhyme Time. Missing, unreviewed or stale targets cannot start capture. Changing the target or answer position cancels the old attempt, even when the anchor word remains unchanged.
- Require an exact normalized transcript for spelling, scramble, letter and isolated-sound answers. Whole-word oral activities retain their existing homophone acceptance. Strict mismatches use the existing local-grading sentinels so the shared phoneme-equivalence map cannot turn a mismatch into a correct response. No speculative letter-name or phoneme recognition aliases were added.
- Give Find Sounds replay one managed playback channel. Starting a new replay cancels the old sequence; every awaited word, option, pause and instruction generation checks ownership before continuing. Replay waits for spoken feedback. Delayed instruction generation cannot interrupt a newer microphone capture or restart after the view closes.
- Keep isolation instruction playback in English, matching the existing English prompt. Kokoro instruction generation explicitly disallows provider fallback. Prepared/banked audio remains preferred. The dormant dictionary-recording button also uses the managed explicit-media path, but its current caller does not supply dictionary audio, so no newly reachable dictionary feature is claimed.
- Clear the Find Sounds initialization marker together with the board during session reset, missing data or activity exit. Reject lagging data for another word. Restoring the same prepared word now reinstalls its board instead of remaining on “Loading phonemes…”.

## Verification

- **38 regression groups passed**: 13 voice-mode and answer-target groups, 18 existing microphone lifecycle groups, and 7 startup/reset groups. Harnesses execute extracted production logic; the startup harness runs the actual effect with real core logic. Both native and shared speech-wrapper paths are covered in the lifecycle checks.
- **99 focused tests across nine files passed** on the final runtime hash: feedback order, instruction channel, audio status, board lifecycle, student pack contract, teacher controls, view identity, syllable playback and syllable startup.
- **14 Chromium scenarios passed** with the full production Word Sounds modal, React, local production CSS and native Audio playback of local tone fixtures. Coverage includes all four voice screens, mode switching, answer matching, stale same-word edits, microphone interruption of Play All, rapid instruction replay, late TTS completion and unmount. No page errors or external requests occurred. Recognition events and TTS results are controlled fixtures.
- Inspected 390px and 1280px listening-state captures. The listening control/status is visible at both sizes; lower controls remain in the scrollable activity. The harness substitutes icon components and does not validate the complete host layout or production icon rendering.
- Four runtime copies match and all three loader references are verified. Studio setup source/module, shared voice module, core and readiness contract match their pre-pass hashes. Syntax and scoped whitespace checks pass. Independent source review found no blocker.

## Initial failures and limits

The first focused-test attempt lost a worker; it is retained as failure evidence and not counted as a pass. A later serialized run passed, followed by another complete pass after the startup fix. The first browser run exposed the real Find Sounds reset-marker bug described above. A subsequent fixture expected “Switch to Typing” while the actual translated control is “Typing”; the harness was corrected to use the application's translated label. Final browser receipts are separate from those failures.

This validates lifecycle, comparison and audio sequencing with deterministic recognition events and native playback. Physical microphone capture, browser permission UI, speech-service transcription of individual sounds/letters, live Kokoro/Gemini pronunciation and full-host application behavior were not tested. Speech recognition can still transcribe an intended sound or homophone differently; this pass does not establish phonetic recognition accuracy. No full application build, staging, commit, push or deployment was performed.

## Reproduce

Run these from the repository:

```text
node dev-tools/word_sounds_voice_mode_regression.cjs
node dev-tools/word_sounds_mic_lifecycle_regression.cjs
node dev-tools/word_sounds_isolation_startup_regression.cjs
node --expose-gc dev-tools/word_sounds_voice_modes_acceptance.cjs
```

Browser checks require installed Playwright/Chromium. Set `WORD_SOUNDS_QA_OUT` to choose the evidence directory. The report includes final receipts, screenshots, prior failure evidence and the source delta relative to this pass's baseline. Runtime SHA-256: `343891f98534e317a663e5b997eb17a7e0bed957995bbad1e7a636a2afe593eb`.
