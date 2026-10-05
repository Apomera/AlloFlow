# Math feedback and lesson pacing — 2026-10-01

Completed locally, unstaged and uncommitted. No network, deployment, host edits, registry edits or shared handoff edits.

## Confirmed findings and fixes

- The strict math evaluation parser already returns failed evaluations as `verdict: error`, `checked: false`, with no grade or reward. The renderer hid that feedback behind `checked: true`. Added a persistent `role="alert"` with ungraded/saved-work wording and the original error feedback. Existing editable answer and check handler remain available; check button reads “Try checking again”. Errors never render the graded score/XP card. Math helper parsing, answers, state schema, grade and XP logic are unchanged.
- Lesson custom additions previously affected only extensions while the main prompt demanded a 2–3 minute hook, 10–15 minute instruction and 40–60 minute total. Custom requests now apply to the entire lesson. Explicit overall duration takes precedence; all five estimates must add up to it, default segment durations are conditional, and optional extensions remain outside the core total. Raw custom text is preserved; no heuristic duration parser invents an overall duration from an activity duration.

## Owned files

- `view_math_source.jsx`
- `view_math_module.js`
- `desktop/web-app/public/view_math_module.js`
- `prompts_library_source.jsx`
- `prompts_library_module.js`
- `desktop/web-app/public/prompts_library_module.js`
- `tests/math_view_second_pass.test.js` (two new source/runtime retry cases)
- `tests/lesson_prompt_duration_constraints.test.js` (four new prompt contract cases)
- This report directory.

## Validation

Coordinator-granted serial slot; `node _build_view_math_module.js` and `node _build_prompts_library_module.js` passed. One Vitest process, `--maxWorkers=1`: 131/131 cases passed across `math_view_second_pass`, `math_helpers_grading_hardening`, `math_helpers_second_pass`, `math_view_null_content`, and `lesson_prompt_duration_constraints`. Duration 6.30 seconds; no retries or skipped cases. Scoped `git diff --check` passed.

Exact generated pair SHA256:
- Math view: `fbb655d660945dd6145d290d39f7e9c3eec1ddad5c3ab57ec5cc02bc71162468`
- Prompts library: `23aa1e5f0c854fcae147860d8892716adab68a3e83f6c813307670d4840734f6`

## Limits and remaining integration

No live model evaluation or browser acceptance run. Prompt checks establish instruction precedence, not guaranteed model output. Coordinator owns any additional runtime mirrors and host cache pins. Default Windows exec helper failed before process creation with deny-read ACL error; narrowly scoped escalated workspace commands succeeded. No remaining blocker in this owned scope.
