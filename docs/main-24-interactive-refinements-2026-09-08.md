# Main 24 resources: interactive-resource refinements

Reviewed and implemented 2026-09-08. This is the interactive workstream for the current 24-resource review. It follows the September 4 review and checks current code rather than reopening already-fixed findings.

## Coverage and disposition

| Resource | Current review and disposition |
| --- | --- |
| Activities | Reviewed discussion/jigsaw structured editors, derivative presentation, learner projections, and current activity tests. Named controls and teacher-only answer-key separation remain in place. No further blocking defect established in this bounded pass. Existing activity regressions passed. |
| Interview Mode | Reviewed resume identity, reflection/session ownership, evidence notes, dialog refs, and duplicate-submit guards. Existing runtime regressions passed. No additional implementation change was justified. Cross-resource evidence handoffs remain an optional product refinement. |
| Sequence Builder | Fixed picture-description generation, a separate async path from the previously repaired sequence revision/image handlers. It now rejects results after navigation, reordering, manual edits, picture replacement, or language changes. Manual description edits cancel pending completion immediately. Errors are caught and shown with a retry, and completion status belongs to its own item. |
| Concept Sort | Rechecked teacher review controls and existing keyboard select/place/modal contracts. Earlier canonical-type fixes remain present. The eight focused dialog/keyboard source-contract assertions passed in isolation. No further blocking defect established in this bounded pass. |
| Document-Based Question | Fixed feedback/source/learner ownership, interrupted-request recovery, vocabulary double activation, malformed feedback handling, comparison-only feedback discovery, numeric source IDs, and rubric summary accuracy. Refined rubric controls to native buttons while preserving existing keyboard access. |
| Adventure Mode | Reviewed turn/session completion, cleanup, character editing/settings paths, and current runtime regression coverage. Prior request/session guards and reduced-motion work remain in place. Existing runtime regressions passed; no new concrete defect was established here. This is not a repeat audit of every ambient-audio renderer or adventure scenario. |
| Assess | Guarded all five view-owned AI authoring paths: individual question regeneration, whole-assessment repair, image refinement, one-distractor rewriting, and bulk distractor rewriting. Delayed responses cannot re-open an old assessment or overwrite intervening teacher edits. Duplicate same-operation requests are suppressed. Synchronously throwing bulk providers now reach normal recovery. |

## Confirmed fixes

### DBQ feedback stays attached to the work evaluated

Previously the feedback handlers saved loading strings in learner responses, applied results without checking answer revisions, and could award points after navigation or a profile change. Failed reliability analysis also removed its only retry button. Pending requests now live in component state; completed feedback records include the source/answer fingerprint. Stale results, stale errors and their awards are discarded. New answer versions hide stale feedback and offer a new check. Older feedback without version metadata is explicitly identified.

The host passes the selected profile/session scope and withholds the provider when student AI features are hidden. The view invalidates pending work when that scope or AI availability changes. With AI unavailable, controls are disabled with a local explanation and ordinary learner work remains available.

Feedback shapes and score ranges are checked before saving or awarding points; malformed list/text responses cannot crash feedback rendering. Numeric document IDs work in the essay evidence tracker. Corroboration checks are available when a learner has filled only agreement/disagreement comparisons.

Rubric cells already supported Enter and Space. They now contain native buttons with criterion/level names, descriptions, pressed state, and visible focus, while preserving column and row headers. The self-assessment summary includes only current rubric criteria with valid 1–4 scores, avoiding stale criteria, invalid averages, and disagreement with the completion count.

### Sequence descriptions preserve teacher work

Picture-description generation previously captured an item index and invoked its edit callback after the provider returned. Navigation, reordering or manual editing could therefore apply the description to stale content. The view now checks the exact resource snapshot and language, invalidates on unmount/navigation/manual description changes, and provides recoverable status on failure.

### Assessment authoring preserves the current assessment

The five authoring handlers previously invoked captured host callbacks after awaiting AI, allowing the old assessment snapshot to replace current content. Request ownership now covers the selected resource, its content, source input, grade and teacher mode. Tests exercise the actual extracted handler implementations and the runtime request guard; they verify normal success, duplicate suppression, navigation, edits, unmount and bulk-provider synchronous failure.

## Validation

- 179/179 distinct assertions passed across the merged focused runs.
- Final focused rerun exited 0: 61/61 assertions, including both new regression files and the Concept Sort contract suite.
- The initial consolidated run recorded 170 passing assertions but exited 1 and omitted Concept Sort. The focused rerun resolves the missing-file coverage; this report does not treat the initial shell exit as a clean run.
- Actual React DBQ and Sequence components were mounted to exercise delayed completions, errors, learner/resource/provider changes, feedback revision changes, vocabulary double activation, numeric document IDs, rubric selection, and repeated status announcements.
- Assessment tests execute the actual five authoring handler bodies with controlled providers and callbacks.
- All three changed runtime modules match their desktop public mirrors byte-for-byte.
- The three affected builders now replace files atomically, avoiding observed OneDrive direct-write failures.

Machine-readable evidence: [merged summary](../reports/main24-interactive-summary-2026-09-08.json), [consolidated results](../reports/main24-interactive-validation-2026-09-08.json), [final focused results](../reports/main24-interactive-final-focus-2026-09-08.json).

## Limits

This workstream used deterministic providers and local component/handler tests. It did not call live AI models, send classroom data, deploy the app, run every adventure scenario, or complete seven full browser journeys with assistive technology. Existing DBQ copy and new recovery text are English; no new human-reviewed translations were produced. Stale authoring/description requests are discarded rather than merged into a changed resource. The root review owns host wiring, cache pins, and broader browser integration checks.
