# Submission Inbox autosave performance

Date: 2026-09-19. Local source change; no deployment.

Typing into the class rubric previously serialized and synchronously wrote the entire rubric and anchor collection after each edit. The inbox now retains the latest state references and saves after 300 ms without another edit, with a 2-second checkpoint timer during continuous editing. Closing/unmounting, `pagehide`, and hidden-page transitions flush pending changes. Changes arriving while already hidden also flush. Clearing the session cancels pending work before deleting storage.

The storage key and payload format are unchanged. The component's open content now unmounts when `isOpen` becomes false, so external close operations also save and clean up. The initial empty state is skipped by reference identity, protecting restoration during StrictMode effect replay.

## Measured operation reduction

The Chromium fixture loads the actual generated inbox, imports a synthetic submission through its file input, restores 12 synthetic anchors, and applies 40 DOM input events to the rubric. Both versions retain the final rubric and identical anchors.

| Work in the edit burst | Before | After |
| --- | ---: | ---: |
| Storage writes | 40 | 1 |
| Serialized bytes passed to storage | 18,331,790 | 458,295 |

That is 97.5% fewer writes for this burst. This measures cumulative serialization/storage work in a controlled fixture, not application load time, user-perceived latency, or Core Web Vitals. The fixture uses development React to exercise StrictMode and runs the burst in one browser task for repeatable operation counts. Real typing is covered separately with fake timer intervals in the controller tests.

## Validation

- Chromium: restored rubric/anchors preserved; close/reopen, pagehide, hidden-page edits, clearing pending work, and direct unmount passed. Lifecycle checks passed with and without StrictMode; no page errors.
- Controller tests cover a quiet interval, continuous editing checkpoint, latest-state flush, timer cleanup, cancellation, empty/anchor-only sessions, quota errors, and serialization errors.
- 58 distinct tests passed across the selected suites, including all six autosave tests, generated-component AlloSheet review/handoff, response manifest, accessibility, localization, roster, and work-evidence checks. One existing shell source-text assertion failed: `submission_identity_foundation.test.js:144` expects `return alloStableAssignmentId(history` in the shell. The immutable pre-change shell also lacks that text; see `baseline-identity-assertion.json`. This task changes only the inbox loader hash in that shared shell.
- Initial fixture issues were corrected: importing a submission is required to reveal the rubric editor; timer assertions now count only controller-owned timers because jsdom schedules storage-event callbacks. Initial results are retained in `tests.json`; corrected and adjacent workflow results are in `tests-final.json`.
- Generated module syntax, scoped whitespace, and root/public/app-build byte parity checked.

Reproduce browser checks with `node dev-tools/inbox_autosave_performance.cjs`. The script pins baseline `107e91b21c999fd318e48a85d3287ff87ab4c25e`; override with `INBOX_BASELINE_REF` when comparing another baseline. Detailed operation and lifecycle results: `browser.json`.

Autosaving is intentionally delayed while typing. Normal close/page-hide paths flush immediately; a browser/process crash before the timer or lifecycle event runs can lose the pending interval. Storage failures remain nonfatal as before. Timer deadlines depend on the browser being able to run JavaScript.
