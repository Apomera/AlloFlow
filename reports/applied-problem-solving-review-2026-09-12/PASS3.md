# Applied Problem Solving — third refinement pass

Implemented September 12, 2026. This pass improves feedback coverage, recovery, source review, and teacher task review while preserving the five-stage learner flow.

## What changed

- **Feedback covers every populated evidence row and every saved check.** It includes all writing sections, linked-work explanations, up to 12 evidence rows, six checks, and 24 recorded self-check entries. Source connections carry the fact ID, revision, and teacher-review state. Plans, observations, and decisions remain separate.
- **Long-input handling is visible.** Ordinary entries are sent in full. When the serialized reference context would exceed 90,000 characters, long fields are shortened across the context while retaining every item. The prompt records each shortened field; learners see saved coverage counts and the number of shortened fields. Saved writing is unchanged. Coverage survives submissions and teacher/full exports, including the export fallback. Older feedback without coverage is labeled accordingly.
- **Undo restores removed evidence, removed checks, and replaced custom questions.** Up to ten recent changes are held in the current open workspace. Restoring an item preserves its position, identifiers, source connection, and check details. Later edits to other items survive. A newer question is protected; the earlier question remains available to copy. Recovery clears on resource/profile/mode changes, closing, or reloading, and never enters submitted work.
- **Source quotation review distinguishes four states:** found, missing, not found in the available excerpt, or no excerpt available. Matching ignores whitespace differences and normalizes Unicode. A match locates words; it does not verify a fact or a learner claim. Teachers can inspect the full source when the stored excerpt is incomplete.
- **Teachers can request a task-quality review.** The three checks cover dependence on lesson reasoning, defensible alternatives and tradeoffs, and feasibility with the stated time/materials. Each review gives a reason and a practical teacher next step. Missing source/time/material information stays uncertain. Editing task context marks saved reviews outdated; a result for changed context or a different task is discarded. The three manual review questions remain available offline.
- **Generation guidance is stronger.** It asks the generator to test whether a learner could satisfy the task without applying the lesson, whether choices involve a meaningful tradeoff, and whether creating and checking the product fits the classroom limits. Existing bounded repair for structural omissions remains in place; semantic quality is not automatically certified.
- **Teacher review notes remain outside learner submissions and student packs.** Learner drafts are excluded from task-quality requests. Existing linked-artifact boundaries remain explicit: feedback sees the explanation supplied in the workspace, not the linked artifact.

## Validation

- **108/108 tests passed across nine suites**, including recovery order/capacity, preservation of newer edits, final-row feedback coverage, maximum escaped-text context size, stale AI requests, provider rerenders, source matching, export fallbacks, and ownership/privacy boundaries.
- Browser checks exercised the actual built component and shared response boundary with an authored fixture and mocked AI.
- **Zero axe violations in eight tested states** and zero browser page errors. States included initial desktop/mobile views, evidence entry, linked-work review, recovery, teacher source/task review, and offline teacher review.
- No horizontal overflow at 1280, 390, or 320 pixels. The initial learner view retains one visible writing field. Its first-field position is unchanged from pass two: 841, 1051, and 1218 pixels respectively, including the shared workspace toolbar.
- Syntax checks and root/public mirror checks passed for Applied Challenge, generation, export, student-pack delivery, shared response handling, and UI strings. The dispatcher source mirror also matches.
- Mobile and teacher-panel screenshots were visually inspected.

The tests establish behavior for the exercised cases. They do not establish live model accuracy or educational effectiveness. No learner trial or deployment was performed.

## Review artifacts

- [Current interactive preview](current-preview.html) — authored scenario, mocked AI, no real student data.
- [Proposed learner usability trial](LEARNER-TRIAL.md).
- [Test results](pass3-tests.json), [browser results](pass3-browser-results.json), and [build/mirror results](pass3-build-results.json).
- [Teacher quality review](pass3-quality-panel.png), [source review](pass3-source-panel.png), [mobile recovery](pass3-recovery-390.png), and [390px initial view](pass3-390.png).

For teacher review, open the preview with `?teacher`; add `&offline` to inspect the manual review path. The previous review and pass-two records remain historical snapshots.
