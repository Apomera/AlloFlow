# Math generator refinements — 2026-09-07

This implements the Math Fluency/fixed-form and Math Studio/Assessment Builder follow-up to [the review](math-generators-review-2026-09-07.md).

## Math Studio and Assessment Builder

- Both generation entry points now use the same bounded normalization and answer-verification pass. Scaffolds, manipulative responses, real-world context, and alternate `correct_answer` fields survive preparation.
- Topic generation honors its quantity selector; explicit requests such as “3 addition problems and 4 subtraction problems” resolve to seven. Solve One remains a single-problem request.
- Question/expression/answer conflicts preserve the supplied answer and explanation and mark the problem for teacher review. Arithmetic in the visible question is checked when possible. Missing or structurally invalid answers also require review.
- Student checks and self-grade inputs are withheld for flagged items; a flagged set cannot submit a complete self-grade assessment. Teachers retain question/answer editing. Editing either invalidates the old model expression and rechecks the visible question and answer.
- Artifacts record requested, received, accepted, omitted, ready, and review counts. The math view shows requested/available/review/missing counts, so incomplete output remains visible after its toast disappears.
- Builder has a synchronous duplicate-run guard, an accessible busy state, per-section status, a 60-second section timeout, retry of incomplete sections, and an “Open prepared assessment” action. Retries retain the resource identity and replace its history entry; completed sections are reused. Results arriving after the modal closes are ignored.
- Builder follows the host language/translation policy, disambiguates repeated model IDs across sections, clamps each section's quantity control to its advertised maximum of 30, and rejects assessments over the renderer's 200-item capacity before sending requests. Mixed fluency blocks continue to use the separate live probe workflow.

“Ready” means that preparation found no blocking issue; it does not certify the correctness of a word problem, proof, explanation, or symbolic derivation. The numeric evaluator cannot establish those semantics. A request already sent to the model can finish after the modal closes; the late result is not saved. Retry state is retained while Builder remains open.

## Math Fluency and fixed forms

- Adaptive replacements preserve the next item's operation and the selected practice range. Two missed/coached facts can trigger support. Stretch requires six consecutive first-try successes across at least four distinct facts. It no longer switches a Within 10 run to extended operands.
- Practice supplies the requested length, with repeated facts when the selected pool has too few unique items. Counts are bounded at 200.
- A learner name or unique classroom identifier selects separate version-2 history, mastery, and resumable Accuracy Focus storage. Hosts may supply a stable learner ID. Unnamed progress stays in the current session. Legacy unscoped records remain untouched and are not automatically attributed to a learner.
- A keyed session resets state on learner changes, ignores late storage loads for a previous learner, and waits for learner storage before starting. Names are trimmed and matched case-insensitively; use distinct classroom identifiers for learners with the same name. Device accessibility preferences remain shared. Maze totals in the teacher report are explicitly labeled as shared-device totals.
- Comparison keys include learner, grade, mode, operation, difficulty, time limit, actual item count, fixed-form content hash, and relevant supports. Results retain item responses, response times, attempt logs, session identity, and scoring version.
- Fixed forms are checked for supported operations, valid integer operands, correct answers, matching symbols, valid duration, and duplicate items before launch. The shipped K–5 A/B/C forms and their order are unchanged.
- Completing a fixed form before its time limit produces a descriptive result excluded from comparable trends and the Assessment Center's valid benchmark records. Late answers after the deadline are rejected. Existing early-finish and interruption exclusions remain in place.
- The former “Secure” category now reads “Consistent across days” and requires at least three independent correct responses with evidence on two different dates, in addition to the existing accuracy/speed criteria. Coached or revealed answers do not establish independent evidence. This is an instructional label, not a validated mastery cut score; the existing six-second recall heuristic remains.

## Draft alternate forms

`dev-tools/generate_pm_math_forms.cjs` now enforces lower and upper dividend bounds. Draft blueprint version 2 gives each grade a deterministic anchor profile and matches operation order, operand/answer digit lengths, and addition/subtraction regrouping counts in every alternate form. Every operand is checked against its declared range, every answer is recomputed, and duplicates are rejected.

All 120 draft forms remain unpublished. Grade 6 is still provisional. Matching construction features does not establish alternate-form reliability or empirical score equivalence; those require field data and review. The source comments no longer claim equivalence by construction.

## Validation

Evidence is in `reports/math-generators-review-2026-09-07/`:

- `implementation-test-summary.json`: 376/376 tests passing across 18 files, using the latest result for each suite. `implementation-tests.json` records the full run; `implementation-handoff-tests.json` records the passing rerun after updating two handoff source-location assertions for the keyed session wrapper. Coverage includes mounted React tests for Builder retries/double-clicks, learner switching, early form exhaustion, teacher review/editing, and deadline handling.
- `implementation-build-checks.json`: syntax checks and byte-identical public copies for five modules; JSX parsing of the root and both application source copies; deterministic draft regeneration.
- The item audits cover all 450 shipped answers and 3,000 draft answers, including declared ranges and draft slot constraints.
- Targeted `git diff --check` passed.

Earlier `baseline-*`, `followup-*`, `reproduction-results.json`, and `reproduce.cjs` capture the pre-implementation review. The reproduction script is historical evidence, not the acceptance suite for the changed callbacks. Several source-location test contracts were updated to follow the existing extracted sidebar, and an Area Model test harness was supplied its missing `feedback` binding.

No deployment or push was performed.
