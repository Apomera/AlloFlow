# Lesson script spoken directions and saved audio

Implemented locally on codex/lesson-script-spoken-2026-09-13. Nothing pushed or deployed. The commit also preserves the previously unmerged lesson refinements; unrelated checkout and staged work are excluded.

## Using it

Open a saved lesson's Teaching script, then Spoken directions. The isolated dialog displays one step at a time. Previous/Next step, Larger text, Full screen, Copy spoken directions and Print spoken directions are available. Escape or Full script closes it and restores focus. Unsaved edits can be previewed/copied/printed; save edits before preparing audio.

The full script highlights Teacher says and Check for understanding as Say aloud/Ask aloud using labels, quotation marks, borders and background. Teacher actions, possible learner answers, research and conditional guidance stay in the full script. The spoken projection omits a check question already present in the wording and recognized bracketed English delivery cues, while retaining mathematical bracket expressions. Older free-form wording cannot be classified perfectly; the view asks teachers to review it before playback. New generation instructions explicitly separate speech from delivery notes and avoid duplicate questions.

## Audio

Play spoken block uses the existing TTS provider, selected voice and speed, with the script's recorded language. It stops at the end of each block for student participation. Nothing advances or plays conditional guidance automatically.

Save TTS uses the existing ReadAloudAudioService, KaraokeAudioStore and host synthesis/encoding path. A private per-version store is embedded in the saved plan's lessonScriptAudio field. It survives resource serialization/reopening, skips current clips and retries missing/stale/unplayable clips. Wording, language and voice changes cannot reuse incompatible audio. Failed persistence rolls back the unsaved clip. Navigation, role/workspace changes, removed versions and changed wording reject pending results. Version stores are pruned when audio is next saved if their scripts were removed.

## Validation

- 223 tests across 11 files passed: spoken filtering/copy/print, playback pacing, cancellation and late responses, real store save/hydrate/reuse, content/voice invalidation, failed persistence rollback, actual host mutation wiring/ownership, and existing lesson/audio regressions.
- Chromium at 1280px and 320px: isolated modal, navigation, larger text, Escape and focus restoration; no page errors, horizontal overflow or axe WCAG A/AA findings. Phone layout visually reviewed.
- Generated lesson modules/public mirrors, view prop checks and shell generation passed.
- Audio tests use synthetic WAV data and mocked provider responses. No live provider speech was generated; real pronunciation/provider authentication and packaged Desktop playback remain unverified.

Evidence: regression-results.json, browser-results.json and spoken-320.png / spoken-1280.png. Reusable browser check: verify-ui.cjs.
