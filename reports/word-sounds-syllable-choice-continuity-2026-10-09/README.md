# Word Sounds syllable choice continuity — 2026-10-09

Changing a syllable answer choice now preserves the teacher's reviewed recordings. Rebuilding lessons and saving replacement recordings reuse choices only when the prior board belongs to the current word and is compatible with its language.

## Changes

- Studio rejects stale boards for another target, including boards that happen to contain the current answer. A newly reviewed task without choices can retain valid teacher choices from the same item. The new recording remains authoritative: an invalid or incompatible recording is not silently replaced with an older task.
- Runtime choice edits preserve exact clips, their order, recording revision and review signature for both curated-bank words with teacher recordings and words outside that bank. They update the current and prepared item together and require replay before answering.
- Choice editing refuses invalid, wrong-target or unsupported active tasks. It cannot turn a rejected recording placeholder into generated curated audio.
- Runtime generation and recording saves validate the prior choice board's target. Saving replacement recordings also checks its language compatibility. Fallback choices use the current lesson vocabulary, with the English curated bank added only for English activities. The generation callback tracks vocabulary changes.
- Built Studio setup and synchronized eight runtime/setup module copies and all six existing loader references. Desktop relative loading remains intact. Core schemas, readiness rules and recording editor/library code are unchanged.

## Verification

- **24 behavior regression groups passed** by executing the actual Studio compiler and runtime generation, editing and recording-save branches. Cases include wrong-target boards with/without the current answer, malformed choices, frozen original tasks, new recording overrides, supported and unsupported words, English/Spanish context, and exact reviewed asset preservation.
- **89 focused tests across six files passed**: syllable runtime, syllable startup, student-pack contracts, readiness, host persistence and feedback order. Final canonical source hashes match the isolated test inputs. The existing JSDOM fixtures emit React act/deprecation and unavailable AudioContext warnings; assertions pass, with real native playback checked separately below.
- **Eight Chromium scenario groups passed** with the production modal, recording editor, core, CSS and resource serializer. Reviewed sunset and banana clips survive real option edits, actual student-pack serialization and fresh modal reload. Native playback remains ordered with no overlap. Recording saves preserve valid authored choices and reject malformed, wrong-word and wrong-language prior choices. Spanish replacement choices stay within the supplied lesson vocabulary. No page errors or external requests occurred.
- Inspected 390px and 1280px screenshots. The edited choice and replay control render; the narrow modal scrolls for lower content. This pass did not alter the layout or perform a full application visual audit.
- Final syntax, scoped whitespace, module copies, loader pins and shared recording-editor parity checks pass. Independent read-only review found no remaining concrete issue in this delta.

## Initial browser failure and limits

The first browser attempt counted the tail of automatic syllable playback as part of a manual replay. The marker was captured during the deliberate gap between clips, while Playwright waited for the disabled replay button to become available. The final harness records the event boundary on the actual click and retains the exact order and global overlap assertions. Initial evidence is preserved under initial-browser-failure; it is not counted as a pass. No product change was needed for that harness failure.

Browser audio uses local WAV fixtures and controlled synthesis responses. It verifies native decoding, playback and preservation, not pronunciation quality, physical microphone capture, provider output, full Studio generation, cloud delivery or the complete production host. Studio compiler behavior is verified directly by the regression harness. No full application build, staging, commit, push or deployment was performed. Shared repository work and index were preserved.

Run `node dev-tools/word_sounds_syllable_choice_regression.cjs` and `node --expose-gc dev-tools/word_sounds_syllable_choice_acceptance.cjs`. Browser acceptance requires Playwright/Chromium; `WORD_SOUNDS_QA_OUT` selects its evidence directory. Source-only delta for this pass is in source-changes.patch.
