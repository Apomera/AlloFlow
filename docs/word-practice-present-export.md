# Word practice: Present & Export

Present & Export is a shared classroom presenter opened from Word Sounds or Glossary. Word Sounds supplies prepared sounds and activities; Glossary supplies vocabulary definitions and translations. Both use the same word list, presentation settings, and export implementation.

## Entry points

- **Word Sounds setup:** Present & Export uses the selected words immediately. Existing prepared metadata and audio are retained where the word matches.
- **Prepared Word Sounds lesson:** Present & Export uses its prepared word records and saved lesson language.
- **Glossary:** Present & Export uses all words or the current filtered words, as selected in Words to present.

The presentation tools are teacher actions. They do not change the original lesson, glossary, or learner results.

## Formats

| Content | Interactive HTML | PowerPoint |
| --- | --- | --- |
| Word Fluency Pop-Up | Manual or timed presentation, repeated words, shuffle, optional position and size variation | Editable word slides in the generated sequence |
| Word and sound audio | Embedded recordings, played from the controls | Embedded word recording and combined phoneme sequence |
| Vocabulary | Existing definitions, examples, and translations | Existing vocabulary text |
| Spelling | Prompt and reveal | Prompt and answer slides |
| Finish the Sentence | Prepared choices and answer feedback | Prompt and answer slides |

Finish the Sentence uses an existing valid Word Sounds activity. The exporter does not invent sentences or distractors. Exporting a practice set does not reproduce every Word Sounds activity.

HTML includes its player and data, so it can reopen without AlloFlow or an internet connection. Audio must be embedded to travel with the file. Preparing audio is a separate, explicit action; downloading never starts speech generation. Missing phoneme recordings are not replaced with ordinary text-to-speech.

The PowerPoint exporter converts browser recording formats such as WebM to WAV and combines available phoneme recordings into one sequence. Playback support should also be checked in the PowerPoint application used by the school.

Timed pacing is available in the app and HTML. PowerPoint slides advance manually. Sentence prompts withhold answer audio until a correct response or reveal. Imported word sets retain their embedded recordings without inheriting a different language's audio bank from the launcher.

## Source and build

- `word_practice_core.js`: bounded data contract, prepared activity adapter, audio validation, and balanced repetition.
- `word_practice_media.js`: audio preparation and PowerPoint export.
- `word_practice_ui.js`: setup, presenter, and standalone HTML export.
- `_build_word_practice_module.js`: builds the lazy-loaded module and its desktop mirror.

The host uses the existing module registry and PowerPoint loader. Entry views pass an abort signal so a delayed load cannot open after its source view has closed. The default English phoneme bank is not applied to another language.

Rebuild with `node _build_word_practice_module.js`. Use `--check` to verify generated copies. Rebuild the three entry views with their existing `_build_*_module.js` scripts after source changes.

The targeted `tests/word_practice_*.test.js` tests cover the shared contract, integration, UI, and media behavior. `node dev-tools/word_practice_qa.cjs` runs browser and exported-file checks and writes evidence to `reports/word-practice-2026-10-09`. Its synthetic audio is test data, not instructional recordings.

Browser checks cover actual download controls, offline audio playback without network requests, keyboard navigation, timed pacing, review rounds, narrow-screen layout, and automated accessibility. The PowerPoint archive is checked for slides and embedded recordings, including conversion from browser-recorded WebM to WAV. Desktop PowerPoint playback and visual rendering still require a manual spot-check.
