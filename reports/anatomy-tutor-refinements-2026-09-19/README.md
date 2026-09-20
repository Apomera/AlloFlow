# Anatomy tutor refinements — September 19, 2026

The anatomy tutor now keeps the selected structure’s lesson, references, and saved explanation beside the conversation. Learners can use this material before sending a question and when the service is unavailable.

## Improvements

- **Reference lesson:** The selected structure’s function, science references, and grade-appropriate clinical or healthy-living context are available directly in the tutor. An empty state returns the learner to Explore to choose a structure.
- **Reasoning before sending:** Suggested questions fill an editable draft and focus the question field. They emphasize structure, function, examples, or the selected structure’s authored reasoning prompt. The former “most important structure” ranking and generic clinical-condition prompt are removed.
- **Saved explanations:** Learners can write their own explanation beside the lesson. It uses the existing structure-note record and appears in Explore, Cards, and the study sheet. This writing does not automatically increase mastery.
- **Age continuity:** Conversations are scoped to the learning band. Moving to another band starts a new visible conversation; prior adult discussion is excluded from younger learners’ prompts. Unscoped legacy chat is hidden for young learners. Pending replies are discarded when the band changes.
- **Usable fallback:** Unavailable, rejected, thrown, empty, and malformed service responses display clearly labeled lesson content. Fallback references come from the authored catalog and are clickable. They are not presented as citations validating a generated answer.
- **Request recovery:** A “Stop waiting” action and a 45-second timeout restore use of the tutor. Late replies cannot replace the fallback or a cleared conversation. A new draft written during the wait is preserved. “Stop waiting” ignores the eventual response; it does not claim to abort the provider’s underlying request.
- **Accessible controls:** Draft selection and stopping return focus to the question field. Composition, repeated Enter, and modified Enter do not submit. The log exposes its busy state; read-aloud controls have response-specific names. Text, controls, and wrapping support narrow screens, dark mode, and right-to-left layout. Reduced-motion mode disables tutor transitions, including theme changes.
- **Localization:** 32 active new text keys have French, Latin American Spanish, and Arabic translations in the canonical and desktop language packs.

## Scientific clarity

The kidney function summary now explains filtration from plasma, return of useful substances and water, secretion into the filtrate, and formation of urine. It replaces a compressed list of volume figures and abbreviations with a process explanation. The matching [NIDDK kidney explainer](https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work) is linked from the source disclosure; the previous OpenStax reabsorption reference is retained. The kidney review date is September 19, 2026. Other structure review dates are unchanged.

## Evidence

**936 tests pass across 47 anatomy test files.** A separate final run of all 42 tutor-specific checks also passes. Final results and the source hash are in `verification.json`. The new `tests/anatomy_tutor_refinements.test.js` exercises both module copies, including fallback variants, stopped and late replies, timeouts, duplicate submission, grade changes, saved writing, keyboard composition, and all three languages. The full anatomy suite is recorded in `tests-full.json` and `tests-full.log`.

The browser pass uses Chromium and the existing anatomy harness. It checks draft focus and explicit submission, offline sources, study-sheet continuity, stop/reply behavior, younger grade bands, and the empty state. It covers 1280px, 390px, and 320px viewports, dark mode, and French, Spanish, and Arabic. The changed tutor panel passes **10 scoped accessibility scans with zero violations and zero incomplete checks**; seven screenshots are retained. The desktop, Arabic phone, and dark-mode phone layouts were also visually inspected. These scans do not certify the entire application.

The browser uses stubbed tutor responses. It verifies request handling and supplied lesson context, not the accuracy of a live model’s generated answers. No deployment or commit was performed.

Artifacts: `browser-results.json`, the seven PNG captures, `tests-focused.json`, `tests-full.json`, `strings-english.json`, and `verification.json`.
