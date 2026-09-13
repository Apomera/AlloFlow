# Concept Quest solo enhancements

Implemented locally on September 12, 2026. These changes have not been deployed.

## Experience

- An optional AI game master narrates scenes, portrays a continuing guide, and responds to investigations, dialogue, and learner explanations through the existing configured AI callback.
- Game outcomes remain controlled by the deterministic engine. Model responses cannot change health, inventory, XP, scores, travel, or encounter outcomes.
- Narrative context includes the current assessment format and relevant lesson material. Answer keys for unattempted items are omitted. Distinct source indices remain separate even when questions share their wording.
- AI errors, invalid output, and a 25-second timeout switch to a scripted guide. The game remains playable, with explicit AI retry. Stale replies cannot overwrite a later scene, source, account, or restarted adventure.
- Recent conversation is readable in a disclosure. A bounded story summary and conversation history continue across turns and local resumes.

## Progress and learning coverage

- Every object question is scheduled across the adventure, including all nine current Assess formats. The final encounter cannot finish while source items remain unseen. Early recovery allows learners to reach all items.
- MCQ, multi-select, fill-blank, numeric, sequence, mismatch, and answer-with-evidence responses use deterministic grading. Numeric input includes a units field; structured formats preserve authored choices and visuals.
- Written responses and invalid answer keys use explicit answer-guide comparison and self-review. They receive no automatic accuracy or correctness XP.
- Recaps distinguish partial credit and show the answer guide. Debriefs include every source item, guide, status, practice needs, and separate first-attempt and latest-attempt accuracy.
- Progress, drafts, role, ability, recap, AI preference, and GM memory save on the current device under the account/application/resource scope. Saves expire after 30 days. Conflicting tabs require an explicit choice; corrupt, changed-source, unavailable, and quota-limited storage are handled visibly.
- Unmount and resource/account changes flush the last committed answer. Using inventory items preserves the current answer draft.

## Validation

The browser harness uses the production Assess Games entry point and built solo bundle on a local HTTP origin with real localStorage. It supplies a deterministic mock of the configured AI callback; no external AI provider was called.

Browser checks passed at 1280, 390, and 320 pixels: AI scenes and dialogue, answer feedback, close/resume, reload/resume, conversation continuity, restored Games focus, no horizontal overflow, and no page errors. See `browser-results.json` and the screenshots in this folder.

The focused tests cover source banks through 503 items, storage through 601 items, a 101-item rendered debrief, all question forms, partial grading, written self-review, malformed inputs, stale AI replies, retries/timeouts, persistence conflicts, and resource/account isolation. `tests.json` records the broader assessment-game regression run; `test-suites.json` lists its suites.

All three new UI sources passed the repository's static accessibility checks with no findings. The assessment view-prop checker found no missing-prop candidates across 66 views. These checks are not a claim of complete WCAG conformance.

The solo builder compiles the main, response, and GM JSX files with the existing live engine and new solo/storage helpers, and writes matching root/public bundles. The live Concept Quest engine semantics are unchanged.

Final results: the 36-suite regression run covered 790 tests, with 789 passing initially. The generated-file mirror assertion failed during concurrent workspace activity; direct inspection immediately afterward found all expected files and host wiring matched. All 36 tests in the focused rerun passed, including that mirror assertion, solo feedback, and saved terminal debriefs. Raw results remain in `tests.json` and `verification-tests.json`. The solo builder parity check also passed.
