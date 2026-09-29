# Micro Lab: resume unfinished investigations

Home now takes learners directly to the case, measurement, explanation, Gram step, or quiz question that needs attention. Mystery and Growth also provide shortcuts through unfinished review work.

## What changed

- **Contextual Home actions:** Mystery revisions come first, followed by unrecorded cases with notes and then untouched cases. Unchecked microscope estimates and saved Growth trials without explanations have specific destinations. Within the same priority, an unfinished current selection is retained; otherwise catalog or notebook order determines the destination. Existing general activity buttons remain available.
- **Exact Gram and quiz continuation:** Gram opens the prediction, next available observation button, interpretation prompt, explanation, report-saving button, or saved report. Opening a stage does not observe it. Quiz opens the first unanswered question, the submission button, or the next missed question that has not been checked correctly in practice. These actions preserve original answers, practice evidence, and grading.
- **Measurement review:** Home opens and focuses the pending estimate's notebook entry. Current microscope settings and the estimate remain intact. The existing Resume working view button lets the learner choose when to restore its saved viewing settings with focus assist.
- **Mystery review navigation:** Next report with working revisions cycles through other pending cases, including after all six reports are recorded. It opens working view and preserves current and previous reports, notes, citations, observed and collapsed evidence, and check state.
- **Growth explanation navigation:** Next trial without an explanation cycles through other saved trials in notebook order. It supports recovered trials lacking a control and preserves the current setup, control, hypothesis, prediction, evidence, and inspection hour. Whitespace-only explanations now consistently appear unfinished.
- **Keyboard focus:** Shortcuts focus their exact destination. Deferred Home focus is cancelled after another learner interaction, tab navigation, or remount. Automatic Resistance persistence and microscope observation bookkeeping do not cancel navigation.

## Validation

**245 focused unit tests pass across 13 files**, including 41 new regressions. They cover deterministic priorities, malformed restoration, JSON persistence, deeply frozen inputs, all six Gram destinations, strict practice checks, preserved evidence, cyclic review navigation, and stale focus cancellation.

**11 Chromium scenarios pass without retries:** five new continuation scenarios and six saved-work regressions. They check actual keyboard focus, JSON reloads, original data, and layouts at 320–390 px. Tests use the local working-tree GlHarness. New scenarios also reject page errors.

The Home cards were visually reviewed on desktop and phone. Phone views were inspected for the pending estimate, Growth explanation queue, Mystery revision queue, Gram interpretation destination, and quiz practice destination. Runtime source and desktop mirror match byte for byte. Both Micro Lab translation namespaces match, with **1,526 extracted keys**, no missing keys, and no stale changed defaults. Syntax and scoped whitespace checks pass.

Exact counts and the validated source hash are in [validation-summary.json](validation-summary.json). Screenshots and detailed test results are alongside this report. This verification covers Micro Lab.

## Earlier verification attempts

Initial results are retained for traceability. The first unit run passed 242 tests and hit an existing 20-second timeout in a Resistance test during host contention. The complete rerun passed all 245 tests, including two added regressions for automatic mount persistence and focus. Early browser runs passed the six existing scenarios but exposed incomplete new fixtures: an omitted default `checked: false` field and a Growth notebook using partial defaults with experiment setup in the wrong object. The corrected Growth fixture checks the real, separate `growthLab` setup as well as the complete saved notebook.

## Evidence behavior

Shortcuts select a destination or view; learners still explicitly observe, check, submit, or record their work. Selecting a saved Growth trial does not reuse its conditions. Pending Mystery revisions remain working notes until explicitly recorded. Previous Mystery reports remain separate recovery snapshots.
