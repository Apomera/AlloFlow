# AlloFlow main 24 resources — implemented refinements
Date: 2026-09-04

The confirmed correctness and integration fixes from the [24-resource review](main-24-resource-review-2026-09-04.md) are implemented in the local working tree. The local desktop shell and generated modules have been rebuilt. No production deployment was performed.

## What changed

| Area | Result |
| --- | --- |
| Shared resource edits | Updates target the resource ID and preserve its current metadata. Late AI results cannot overwrite a newly opened resource or silently discard newer edits. |
| Analyze Source Material | Grammar fixes and dismissals persist to history. Corrections preserve undo bookkeeping, recalculate text complexity, and invalidate stale checks. Resolved notes are no longer selected again. |
| Concept Sort | Canonical type checks repaired; edit, regenerate, upload and clear-image actions work. Clear Image no longer references undefined variables. Updates retain history metadata, and superseded image requests cannot display stale results/errors. |
| Writing Scaffolds | Paragraph input, completion, grading and reading/export use the same response positions. Save failures show an error and retry instead of reporting success. |
| Lesson Images | Replacements persist to the resource, so reopening, downloading and exporting agree with the displayed image. Descriptions/provenance follow the replacement; restoring the original restores its description too. |
| Notes and Anchor Charts | Learner work uses the shared response boundary with autosave, profile isolation, explicit teacher preview and bounded submissions. Feedback persists and rejects outdated drafts. Anchor icons update the original resource and stable section. |
| Notebook and learner export | Notes, Anchor Charts, Memory Aids and Applied Challenges appear together. The shelf displays learner responses and reopens canonical resources. Submission/export paths use the intended learner projections and fail closed if the response module is unavailable. |
| AI capability controls | Notes, Charts and Notebook honor restricted student AI settings. Explicitly disabled providers cannot fall back to global providers. |
| Sequence Builder | Text-only revisions persist. Async revision, verification, auto-fix and image updates preserve resource identity and intervening edits. |
| Lesson Plan extensions | Guides attach to the original extension, preserve concurrently completed guides and newer lesson edits, and reject changed/deleted activities. |
| DBQ | The timer has a mounted lifecycle and cleanup; only its deadline is saved. Feedback/reward identifiers include the resource ID. |
| Activities | Discussion/Jigsaw have structured editors. Learner projections include activity instructions and exclude answer keys, private notes and teacher derivatives through Firebase, mailbox and live-follow paths. |
| Generation planning/reuse | Quiz visual settings and activity mode/protocol/group size affect reuse. Equivalent activity defaults normalize consistently. Full Pack planning/retries and Blueprint execution/rebuild preserve per-row settings. |
| Curriculum Audit | Content fingerprints detect edits to existing audited resources, including changes that leave the resource ID unchanged. Older reports without content snapshots are identified as unverifiable/stale. |
| Assignment Directions | Choice-board text and linked resource IDs survive translation/cloning, including directions without objectives. |
| FAQ and Word Sounds | Launch, reading and disclosure copy uses translation keys with English fallbacks. Word Sounds uses logical text alignment and respects reduced-motion preferences. New keys are ready for language packs; this change does not provide new human translations. |
| Generated artifacts | Memory Aid source/build drift is resolved. Changed runtime modules and desktop public copies match. |

## Validation

**385/385 distinct checks passed across the final batches and focused reruns.** The merged result record is `scratch/main24-final-validation-summary.json`; its source reports are retained alongside it.

- Local app build: `node build.js --mode=dev` completed; generated `desktop/web-app/src/App.jsx` parses successfully.
- All **22 changed runtime/UI-file mirrors** are byte-identical to their desktop public copies.
- Generation smoke: **63/63** deterministic cases across source, root module and desktop module.
- Tool catalog: **22 tools**, no errors or warnings.
- View-prop scan: **64 views**, no parse failures or missing-prop candidates.
- Module registry: **209 consumers**, no missing or suspect producers.
- Memory Aid, Anchor Chart and Notes generated freshness checks passed.
- Actual-component and actual-host tests cover delayed AI results, navigation, resource deletion, concurrent edits, profile separation, save failures, restricted providers, accessibility, student projection, submission and export.

The consolidated 318-test run initially passed 316 checks. An obsolete Word Sounds hardcoded-copy assertion was updated for localized labels, and an accessibility scan timed out under the combined run; both passed in the isolated 18-test rerun. Two obsolete Activities context assertions were also updated and its final 60-test suite passed. Existing unrelated header assertions in `tests/activity_setup_placement.test.js` still expect the former menu markup/comment and were left outside this change.

These checks use deterministic providers and simulated transports. They do not represent live model-quality evaluation, live classroom delivery, all 24 end-to-end browser journeys, or the complete repository test suite.

## Remaining product opportunities

The original review's broader ideas remain proposals: reusable evidence handoffs among Interview, Adventure, STEAM and assessment; deeper dependency tracking for lesson plans; a unified route-specific package-readiness summary; and unconfirmed glossary/organizer consistency investigations. No additional blocking defect was established for those areas during this pass.

Detailed workstream notes: [Foundations](resource-review-foundations-2026-09-04.md), [Learning implementation](main24-learning-implementation-2026-09-04.md), [Studios](resource-review-studios-2026-09-04.md).
