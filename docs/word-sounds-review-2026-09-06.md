# Word Sounds: improvement and refinement review

Date: September 6, 2026. Scope: current working-tree source, existing regression tests, targeted execution of actual source functions, and an isolated Chromium audio-recovery test. This review adds documentation and diagnostic artifacts; it does not change application code.

Implementation follow-up: [September 7 refinements](word-sounds-refinements-2026-09-07.md). The findings and saved diagnostic output below describe the pre-refinement code; original line references and the source-extraction reproducer may no longer apply to the updated source.


Word Sounds has substantial breadth: 20 activity definitions, teacher preparation and review, portable media, formative checks, learner-scoped history, several response methods, and lesson sequencing. Its highest-value next step is to make linguistic content, task difficulty, and recorded learning evidence consistent across these paths. More activities are a lower priority than reliable answers and clear instructional progression.

## Evidence and limits

- Ran `node node_modules/vitest/vitest.mjs run word_sounds --maxWorkers=2 --reporter=json --outputFile=.tmp/word-sounds-audit-tests.json`: **52 files, 546 tests, 545 passed, 1 failed**.
- The failing test is `tests/word_sounds_setup_deep_contract_regression.test.js:174`. It expects the literal source text `Teacher: Review Words &amp; Audio`; the current JSX correctly uses `Teacher: Review Words & Audio` inside a JavaScript translation fallback. This failure is a stale source assertion, not evidence of a broken launch action.
- Ran the existing isolated Chromium audio-recovery test. It passed the initial blocked-audio UI, focus, retry, and dismissal assertions, then failed because its locator expects `common.play_word`; the current fixture exposes `word_sounds.play_word`.
- Reran a temporary copy changing only that locator. **1 browser test passed**, including the final ready-status and focus assertions. The committed test was left unchanged. Its media APIs are mocked; this verifies recovery behavior, not real codec decoding or pronunciation quality.
- Reproduced the linguistic and adaptation examples below by extracting and executing the current functions, rather than reimplementing their algorithms. Run `node reports/word-sounds-review-2026-09-06/reproduce.cjs` from the repository root.
- Runtime and setup module hashes match their `desktop/web-app/public` mirrors.
- This is not a full styled production-browser, mobile-device, screen-reader, or audio-listening audit. Findings grounded in source are distinguished below from proposed product changes. Existing unrelated working-tree changes were preserved.

## Priority findings

### 1. Fix Sound Sort's linguistic truth before adding more content — high priority, reproduced

The runtime `estimateFirstPhoneme` treats g before e/i/y as the sound in “jam,” without hard-g exceptions. It returns `j` for **get, give, girl, gift, and gig**. The ending estimator returns `e` for **cake, bike, home, and nose**, and `f` for **of**.

This reaches playable boards. With target `jug`, phonemes `['j','u','g']`, and supplied candidate words get/give/girl/gift, `computeSoundSortItem` produces correct options **get, jog, gig**. Only jog shares the target's first sound. The board's find-all completion requires selecting its listed matches. A learner using the correct sound distinction can therefore be prevented from completing the item correctly.

Locations: `word_sounds_module.js:3492` (onset estimator), `:3556` (ending estimator), `:3591` (board builder), `:6220` (find-all scoring), `:16575` (Sound Sort render).

**Refinement:** use one pronunciation representation with canonical sound IDs, grapheme alignment, locale/dialect, provenance, and teacher overrides. Validate target and every candidate using that representation. When pronunciation is uncertain, hold the item for review or use a validated replacement. Add known-answer cases for hard/soft g, silent-e endings, voiced endings, and accepted pronunciation variants. A regex should not be the final authority for a scored sound judgment.

### 2. Make prepared and played boards identical — high priority, reproduced compiler defect plus source-confirmed divergence

The setup compiler has a different sound algorithm and compares literal values. For a pack containing cat/cap/cup/kit/dog, with cat's supplied first phoneme `k`, a deterministic compiler run produces:

```
Target: cat, first sound k
Correct options: kit
Distractors: cap, fan
```

The compiler estimates cap as starting with the grapheme `c`, so it fails to recognize the same /k/ sound. This is an incorrect compiled board.

Separately, the current Sound Sort player rebuilds its board with `computeSoundSortItem` rather than consuming `activityItems.sound_sort`. Consequently, the compiler example is not a claim that this exact cap board is what the current player displays. It demonstrates disagreement between preparation and runtime. Audio preparation collects the compiled board's choices, while runtime may choose different words; whether a missing clip is audible depends on available bank/cache/network fallbacks.

Locations: `word_sounds_setup_source.jsx:1436`, `:1530`, `:1622`, `:1748`, `:2214`; `word_sounds_module.js:12090`, `:16575`.

**Refinement:** validate a board once, persist its version and asset dependencies, and use that same board for review, practice, and student delivery. Runtime rebuilding should be an explicit repair path whose replacement assets are checked. Add an integration test that compiles a real pack, mounts it, and compares displayed choices, correct answers, and required media. Current hand-authored pack fixtures can miss compiler/runtime disagreements.

### 3. Make adaptive difficulty more conservative and explainable — high priority, reproduced behavior; policy refinement

`getEffectiveDifficulty` returns **hard after three first-try correct answers** at level 1. It also returns hard for a newly selected activity with no evidence of its own, because fewer than four activity-specific rows fall back to pooled history. Three AAC-supported successes also return hard: the reducer discounts retries but does not distinguish support conditions. Repetition of the same word is not treated differently from success on different words.

Location: `word_sounds_module.js:7561`. Lesson advancement separately uses minimum item counts and a consecutive streak at `:4507`.

These are deterministic policies, not evidence that a learner has mastered harder material. The difficulty classifier itself uses English spelling shape, word length, clusters, and vowel combinations rather than the learner's taught patterns.

**Refinement:** require sufficient recent evidence from the current activity, multiple distinct items, and the relevant support condition. Advance one band at a time; add hysteresis so one miss does not cause oscillation. Show teachers the reason for a change. Treat AAC and other accommodations according to the intended skill being measured, rather than automatically penalizing their use. Keep successful access-supported practice visible as its own evidence.

Acceptance example: three counting successes must not silently establish a learner's segmentation level. Choose and pilot evidence thresholds with educators; the audit does not establish a validated cutoff.

### 4. Distinguish word matching from sentence/story reading evidence — high priority, source-confirmed

Finish the Sentence and Read the Story display the exact target under “Your word” when the target image is absent. This is an intentional, answerable fallback, but it changes the task into visual word matching. The history records activity, correctness, attempts, a general letter-hint mode, and AAC status; it does not record this fallback's actual task type or image availability. A correct first response can therefore be treated as an independent success despite the answer being visible.

Even with an image, a generic frame such as “I can see the ____” can be solved by matching the picture to one word without reading the sentence. The fallback story repeats the same target in three frames and fills all blanks with one choice. It provides connected print exposure but is not strong evidence of passage reading or comprehension.

Locations: `word_sounds_module.js:17135`, `:17242`, `:13266`, `:13284`; `word_sounds_setup_source.jsx:1632`, `:1666`.

**Refinement:** retain the supportive fallback, explicitly record `taskKind`, actual clues shown, and fallback reason, and exclude it from claims of independent connected-text reading. Add short texts and questions where relationships or meaning across words determine the answer. Use a transfer item with a new word or sentence before marking a skill secure. These are design recommendations, not findings of learning effectiveness.

### 5. Give nonvisual learners a usable picture clue — high priority, source-confirmed accessibility barrier

Sentence and story anchor images both use the alternative text **“Picture hint.”** In “I can see the ____,” choices cat/cap/cup/kit are not disambiguated by the surrounding text. A sighted learner sees the target picture; a screen-reader learner is told only that a picture exists.

Locations: `word_sounds_module.js:17132`, `:17238`.

**Refinement:** include a meaningful, reviewed description of the clue, or provide an equivalent accessible task that preserves the intended learning objective and records its response modality. Do not make missing image semantics count as a learner error. Verify the complete item with NVDA and touch screen readers, including clue, choices, feedback, and advancement.

This recommendation follows the principle that alternatives should serve an equivalent purpose. WCAG also has a test/exercise exception when giving equivalent text would invalidate the exercise, so the appropriate alternative must be designed around the actual skill rather than treating a generic alt attribute as sufficient. [W3C: Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html).

### 6. Define decodability relative to instruction — medium priority, source-confirmed design limitation

The sentence gate accepts vocabulary found across the app's sight-word lists, word families, common words, or current session. A teacher-selected word is considered vouched for. This is a useful vocabulary/content screen, but it cannot establish that a particular learner has been taught the sound-spelling patterns needed to read those words. The gate has no taught-pattern or known-irregular-word input. Fallback frames are accepted by construction.

Locations: `word_sounds_setup_source.jsx:891`, `:924`, `:939`, `:954`, `:1000`.

**Refinement:** keep vocabulary review separate from instructional decodability. Add taught grapheme-phoneme correspondences, known irregular words, target pattern, and allowable review patterns. Report which words require untaught patterns. Build purposeful sound-to-letter-to-word-to-text lesson paths, with encoding and later retrieval included.

The IES guide supports linking speech sounds with letters, teaching decoding and word parts, and daily connected-text reading. Applying that guidance to a taught-pattern inventory is this review's product recommendation. [IES foundational reading practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published).

### 7. Reduce preparation work and clarify readiness — medium priority, source-confirmed opportunity

The compiler builds many activity boards per word, and the audio planner collects choices, prompts, sentences, stories, and line-by-line story clips across those boards. That work is not restricted here to the selected lesson sequence. Broad preparation supports later activity switching, but it can be expensive for a teacher preparing one narrow lesson. The setup header also says “words ready” whenever a word array exists; that count is not a complete delivery-readiness check.

Locations: `word_sounds_setup_source.jsx:1510`, `:2199`, `:2506`. The review panel already distinguishes portable audio gaps from local playback failures at `misc_components_source.jsx:775`; preserve that useful distinction.

**Refinement:** offer “Prepare this lesson” and “Prepare all activities.” For a locked lesson, compute assets only from its selected boards, with an explicit expansion path for other activities. Show separate progress for content reviewed, required media packed, and student-device playback verified. Provide a short launch summary: skill, words/patterns, activities, supports, duration estimate, and unresolved blockers. Put recording-library and fine-grained controls behind advanced options.

### 8. Improve test fidelity, accessible labels, and maintainability — medium priority

The current runtime file is **19,043 lines / 879,552 bytes**. Setup source is 244,547 bytes. There are repeated activity definitions, phoneme estimators, matching rules, and content assembly paths. The sound-sort disagreement is a concrete consequence of this duplication.

The test suite is valuable, but many tests assert source substrings. Golden rendering deliberately skips effects. Its handcrafted pack fixture supplies a good Sound Sort board without running the compiler, which leaves the actual compiler's errors outside that contract. The two stale-label failures found in this review are examples of test brittleness rather than product failures.

Setup activity checkboxes share the generic accessible name `common.toggle_enabled`, and count sliders share `common.adjust_lesson_plan`; visible activity labels are adjacent rather than explicitly associated. Translation work is also incomplete in setup controls and explanatory copy.

Locations: `tests/helpers/word_sounds_harness.js:1`, `tests/helpers/word_sounds_pack_fixture.js:1`, `tests/word_sounds_setup_deep_contract_regression.test.js:174`, `tests/e2e/23-word-sounds-audio-recovery.spec.ts:113`, `word_sounds_setup_source.jsx:3009`, `:3031`.

**Refinement:** extract a shared linguistic core, activity registry, pack compiler, scoring/adaptation functions, and audio service incrementally. Add behavior tests for compile-to-player round trips and objective-specific learning evidence. Name each control for its activity, e.g. “Enable Sound Counting” and “Sound Counting item count.” Test real rendered roles and localized labels. Broaden device validation to actual audio decoding, offline delivery, keyboard-only completion, touch use, and interrupted sessions.

## Strengths to preserve

- Tracing is explicitly marked practice-only and excluded from graded accuracy.
- Retry counts are recorded, and several mastery calculations distinguish first-try success, retries, and AAC-supported responses.
- Host history and phoneme-mastery storage have learner/language scoping; fixed forms have dedicated integrity safeguards.
- Activities already have many tap/keyboard alternatives to dragging, focus management, announcements, and reduced-motion support. These deserve continued behavioral verification, not replacement.
- Teacher review and editing are gated away from ordinary student access.
- Prepared media, recorded-bank-first audio, and recoverable playback errors address important classroom delivery problems.
- Unsupported language/activity combinations are gated instead of indiscriminately applying all English activities.

## Suggested implementation order

1. **Content and evidence integrity:** shared sound equivalence; hard/soft and ending exceptions; compiler/player board parity; actual task/support attribution; accessible clue semantics. Validate with compile-to-play known-answer cases.
2. **Instructional refinement:** gradual activity-specific adaptation, distinct-word evidence, taught-pattern decodability, meaningful connected-text transfer, and teacher-readable reasons for progression.
3. **Preparation and maintenance:** selected-lesson asset planning, unified readiness, simpler default setup, activity-specific accessible labels, behavioral test repair, and incremental module extraction.

Do not start with a wholesale rewrite. The existing workflows and regression coverage provide a useful base for small, verifiable corrections.

## Saved evidence

See `reports/word-sounds-review-2026-09-06/`: `reproduce.cjs`, `reproduction-output.txt`, `unit-results.json`, `browser-original.log`, and `browser-corrected-locator.log`.

