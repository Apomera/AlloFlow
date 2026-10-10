# Word Sounds follow-up — local implementation, 2026-10-08

The five approved improvements are implemented locally. No staging, commit, push, deployment, or live model requests were performed.

## Behavior

- Reviewed recordings extend syllable blending to word-specific sequences of 2–4 syllables. Teachers upload or record each spoken unit, preview the complete sequence, and explicitly confirm it. Label, order, word, language, or audio changes invalidate review. Existing 64 curated English compounds remain available. Recorded fragments never go to TTS.
- Rhyme distractor selection tracks prior exposure across the lesson, with a recent-item penalty inside the phonologically suitable difficulty pool. Prepared and teacher-authored boards retain their choices.
- Teacher review shows saved clip provider, actual resolved voice, and source. Unknown old clips remain labeled unknown. Selective regeneration uses the selected provider strictly, validates replacement audio, and retains prior audio on failure/cancellation. Shared app instructions, feedback, and phonemes can have their own recording source.
- Guided repair upgrades supported legacy syllable boards and fills missing speech while preserving words, authored choices, images, and usable audio. Unsupported custom content is marked for review. Clip selections survive incidental readiness updates.
- History, active-item state, offline serialization, and preview share the updated Word Sounds content. Reviewed instructional recordings survive the actual student-pack/session sanitizers through a bounded, signature-checked whitelist; unrelated learner recordings remain excluded.

Native browser checks exposed an additional sequencing bug: Chromium emits pause immediately before ended at natural completion. Treating every pause as cancellation stopped syllable playback after its first clip. The runtime now distinguishes natural completion from interruption. Browser review also exposed and fixed answer-choice reshuffling on recorded-board save.

## Verification

- Final focused Vitest batch: **102/102 tests across 9 files**, exit 0. Covers syllable startup, feedback ordering, Word Families preload, rhyme sessions, saved History, strict Kokoro routing, readiness, delivery hardening, and student packs.
- Exact production-code regressions: **18 pack-maintenance groups**, **12 recording transport/save groups**, and **7 clip-selection groups** passed after final integration. Editor DOM checks cover three uploads, sequential completion, explicit review/save, review invalidation, target cancellation, failed microphone construction/start cleanup, and cross-editor/runtime playback ownership.
- Earlier integrated checks: 20 recorded-syllable checks, 7 History persistence groups, and 9 rhyme-variety tests passed. Some coverage overlaps the final batch; these counts are not added together.
- **Seven native Chromium audio scenarios** passed against runtime SHA ed8a9115334281bdf7558f8b6e3ea194c1d69e0f67de52e22c0a67a6874bbb14: cold first instruction, incorrect-feedback sequencing, rapid correct taps, ordered syllables, minimize cancellation, manual replay, and lesson-change cancellation. Audio elements used real bank clips and native media events; no overlaps were recorded.
- **Seven teacher-review browser acceptance groups** passed: actual review modules render; clip labels are accurate; selection survives a readiness revision; single-clip strict-Kokoro replacement preserves all unselected assets; repair preserves choices; real upload/decode/ordered preview/review/save works; Start Activity receives the exact saved recordings and choice order. No page errors or native audio overlaps.
- Six module builders passed. Eleven source files parse. All **28 affected module copies**, **21 named host pins**, and **3 embedded canonical cores** match. Scoped git diff --check passed (line-ending notices only).

## Reproduction

From the repository root:

~~~sh
node dev-tools/word_sounds_recorded_syllable_transport_regression.cjs --repo
node dev-tools/word_sounds_recorded_syllable_dom_regression.cjs --repo
node dev-tools/word_sounds_clip_selection_regression.cjs --repo
node dev-tools/word_sounds_pack_maintenance_regression.cjs
node dev-tools/word_sounds_native_audio_acceptance.cjs --case=syllable-native-sequence
node dev-tools/word_sounds_teacher_review_acceptance.cjs
node dev-tools/sync_word_sounds_core.cjs --check
~~~

Run native audio cases in separate browser processes on Windows; the seven case names appear above in the native-audio report filenames. Set WORD_SOUNDS_QA_OUT for a separate output directory. The native harness requires the locally installed Playwright Chromium browser and existing project dependencies.

## Limits and diagnostics

This verifies browser decoding, event order, cancellation, state flow, and local serialization. It does not establish subjective pronunciation quality, microphone hardware behavior, a live provider's pronunciation, real cloud delivery, full application layout, or a full application build. Teacher review is required for custom syllable pronunciation. The teacher-review browser uses real uploads/playback but substitutes local bank fixtures for synthesis. Its screenshot uses harness styling, not production app CSS.

Initial Windows sandbox runs could not find the user-installed browser or write the dependency cache; authorized local retries passed. Earlier integration diagnostics included stale test extraction boundaries (fixed without dropping assertions) and a minimize test that attempted an unsupported prop instead of clicking the real control (corrected). Native natural-end and authored-choice failures were product defects and have regression coverage. Final success reports contain executed source hashes. Shared-checkout changes and the existing index were preserved.
