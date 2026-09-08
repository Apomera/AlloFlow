# Main-resource refinement pass: studios, planning, and alignment

Date: 2026-09-08. This pass reviewed the current implementation of six of the main 24 resources, read the September 4 review and its implementation follow-up, and made the bounded changes below. Existing unrelated working-tree edits were preserved.

## Coverage and disposition

| Main resource | Current paths reviewed | Disposition |
| --- | --- | --- |
| Note-Taking Templates | Six-template dispatch, response-boundary integration, feedback readiness/parsing, XP, callback lifetime, feedback dismissal, focus and reduced-motion tests | Fixed feedback request ownership, current-resource dismissal, and malformed response handling. Existing learner-response isolation and export paths remain covered. |
| Anchor Chart | Rubric authoring, interactive dialog, learner feedback, stable-section icon writes, keyboard reorder, focus targets, shared response boundary | Fixed late rubric suggestions overwriting typed criteria or appearing after chart navigation/dialog dismissal. Existing stable icon targeting and learner response persistence remain covered. |
| Memory Aid Studio | Per-card async tokens, abort/cleanup, profile/resource ownership, latest-input comparison, private practice, teacher review and export contracts, read-aloud | No additional confirmed blocker in the reviewed paths. Existing operation-token and response-boundary design already handles the lifecycle failures found in older resources. Revalidated the relevant suites and generated-module freshness. |
| Applied Challenge Studio | Hint, stress-test and feedback lifetimes; resource/profile/preview changes; permission/read-only changes; draft fingerprints; phase navigation; learner export and shared read-aloud | Fixed abandoned requests committing or showing errors after leaving the view or changing the active learner/context/capabilities. New resource requests are immediately available; old completions cannot clear the new request's busy state. |
| Lesson Plan / Study Guide / Family Guide | Shared role-specific view, edit/copy/print/PDF actions, extension-guide display and host wiring, next-lesson options, station saving and action naming | No new confirmed blocker in the reviewed paths. Existing station-save recovery and named navigation actions passed. Exact generation-dependency provenance remains the previously documented product opportunity; this pass does not invent metadata from current history. |
| Standards & UDL Alignment / Curriculum Audit | Audit scope, content fingerprints, modified/removed dependencies, date fallback, stale/unverifiable notices, rendered nine-dimension report | Fixed an early return that skipped version/deletion checks for saved reports lacking a usable date. Such reports now show what can be verified and explain that new-resource detection requires rerunning the audit. |

## Fixed findings

### Notes: stale callbacks and unchecked model output

The dismissal callback had an empty dependency list and retained its first resource updater across same-template resource changes. It now follows the current updater. Feedback requests receive a serial token, invalidate on resource/profile/preview or capability changes and on unmount, and only the current request can report errors or clear its busy state.

Parsed JSON previously went directly into saved feedback and the visible panel. Nested objects in text fields could become invalid React children, while nonnumeric rubric fields could yield NaN scores. The parser now requires usable strengths and next steps, limits displayed feedback text, selects only supported fields, and clamps finite numeric rubric values. Invalid responses show the existing retry message without saving feedback or awarding XP.

### Anchor Chart: rubric suggestions could overwrite newer work

A pending rubric request previously wrote its captured result into local rubric state without checking whether the teacher had changed the text, changed charts, closed/reopened the dialog, lost permission, or left the view.

Suggestions now belong to one request, chart, open dialog, rubric draft, and chart-content snapshot. Only an unchanged current context accepts the result. Chart/role changes close the dialog, and abandoned errors stay silent. Accepting a current suggestion still fills the editable draft; canonical rubric changes occur when the teacher explicitly arms the chart.

### Applied Challenge: late operations survived their view/context

Draft/resource fingerprints already rejected changed inputs, but there was no mounted lifecycle or invalidation for changed learner profile, preview mode, AI availability, or read-only permissions. An old request could still call the captured update/toast functions, and the prior resource could leave the new view busy until its network request ended.

The shared request token now has a mounted lifecycle and context invalidation. Hint, stress-test, and feedback check current ownership after awaiting the provider and before reporting errors or clearing busy state. Current-draft changes still receive the existing useful stale-draft explanation; requests abandoned by navigation or context changes are ignored.

These guards stop stale application effects. This change does not claim to cancel provider-side generation or charges.

### Curriculum Audit: unavailable dates bypassed available evidence

The freshness helper returned null when both the audit date and saved resource timestamp were missing or malformed. That bypassed even stored content fingerprints and removed-resource checks.

The helper now compares available evidence regardless of date validity. An explicit unknown-date notice explains the remaining limitation. A valid saved-resource timestamp remains the fallback for malformed audit metadata.

## Validation

**390/390 distinct checks passed across 20 suites, including 38 new checks.**

- New real React/deferred-provider tests cover rubric draft protection, normal suggestion acceptance, chart navigation, close/reopen, permission changes, unmount, all three Applied Challenge request types, profile/preview/read-only changes, overlapping old/new requests, Notes dismissal ownership, malformed feedback and bounded XP.
- Four new audit checks cover absent/malformed dates, modified content, removed dependencies, visible qualification, and saved-timestamp fallback.
- Related suites cover Notes helpers/focus, Anchor helpers/hooks/dialogs/reorder/icon persistence, Applied Challenge interaction/export, Memory Aid schema/review/audit contracts, shared studio read-aloud/response ownership, curriculum audit logic/rendering, and Lesson Plan station saving/action names.
- The initial 20-suite batch passed 386/390. One old interaction assertion expected a toast after leaving a resource; it was updated for intentionally silent abandonment. Three old source assertions expected settings and expand-all markup inside the host; they were updated to check the current extracted sidebar and its host props. The four affected suites then passed. No application behavior was altered to satisfy the moved-markup assertions.
- The earlier first focused invocation wrote a zero-test result without diagnostics. A diagnostic rerun collected tests normally; an incorrect new Cornell fixture was corrected to the actual cues/notes schema before the passing runs.

Final merged evidence: [main24-studios-final-summary.json](../scratch/main24-studios-final-summary.json). It identifies the source reports and computes distinct final results by suite.

## Builds and integration

Rebuilt the four changed source modules. Each root runtime is byte-identical to its desktop public mirror:

| Module | SHA-256 prefix |
| --- | --- |
| note_taking_templates_module.js | 689d23ad |
| anchor_charts_module.js | 8254a377 |
| applied_challenge_module.js | a4c406f8 |
| view_alignment_report_module.js | c9f628a7 |

No new strings were added to the shared catalog: the new audit qualification follows the report's existing English rendering and language declaration. The coordinating pass owns host cache pins and aggregate integration validation.

## Explicit limits

This was code review and deterministic component/contract validation, including the accessibility checks present in the related suites. It was not a fresh six-resource visual-browser matrix, manual screen-reader session, live model-quality evaluation, real multi-device classroom delivery, or physical-print test. It does not claim WCAG conformance or a complete repository test run.

Human-reviewed translations, realistic classroom/assistive-technology checks, and exact Lesson Plan dependency provenance remain product work. No live deployment or commit was performed.

