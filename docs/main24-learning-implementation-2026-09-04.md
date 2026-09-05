# Main-resource learning fixes — 2026-09-04

Implemented in the current working tree; no production deployment or full app build was performed by this workstream.

## Changes

- **Timeline:** resource-ID-bound updates use the host `onUpdateResource(id, fullResourceUpdater)` contract, with a safe fallback for older hosts. Text revisions immediately update history with visuals disabled. Late revisions, auto-fixes, verification results, and images keep their original history identity; expected-content checks preserve intervening edits. Request ownership prevents older same-resource revisions winning. Loading-state ownership preserves newer requests, and completing an old revision does not erase a newer input draft. Per-item image updates use the original item identity/index so duplicate event text cannot select the wrong item.
- **DBQ:** only timer deadlines remain in learner response data. A mounted timer effect owns and cleans up its interval, resumes from saved deadlines, ignores legacy interval handles, and stops at expiry. Screen readers do not receive a timer announcement every second. Reliability/source-analysis reward keys now include resource and document IDs.
- **Activities:** teachers can edit Discussion and Jigsaw fields, including grouped questions, talk stems, expert packets, teach-back content, home-group tasks, accountability questions, and teacher answer keys. Add/remove controls support structured lists and groups. Changes use the existing host persistence callback. Learners see no editing or derivative-generation controls.
- **Student projection:** `window.AlloModules.BrainstormView.projectStudentActivityResource(resource)` returns a new, idempotently projected resource containing only discussion/jigsaw learner content, or `null` when no eligible items exist. The allowlist excludes answer keys, teacher notes, guides, worksheets, rubrics, derivative metadata, and arbitrary configuration. Safe artifact identity and language/grade fields are retained.

## Files

- `timeline_revision_source.jsx`, `timeline_revision_module.js`
- `view_dbq_source.jsx`, `view_dbq_module.js`
- `view_brainstorm_source.jsx`, `view_brainstorm_module.js`
- Matching built modules in `desktop/web-app/public/`
- `tests/main24_learning_refinements.test.js`

All three scoped builders completed. Root owns the host callback wiring, delivery/discovery projection integration, UI string registration, and final shell/mirror build.

## Verification

- New `main24_learning_refinements.test.js`: **15 runtime tests passed**. Covers delayed AI responses across resource navigation; nonvisual history saves; intervening edits; older replies; duplicate-text image targeting; auto-fix/verification ownership; newer drafts/loading states; two-stage image batches; DBQ timer resume/unmount/resource switch/expiry; actual feedback reward calls across two DBQs; structured field edits; deep student-projection exclusions, identity retention, immutability and idempotence.
- Initial focused batch: **42 tests passed** across the new behavior suite (before its final two additions), `timeline_topic_mode.test.js`, and `timeline_topic_mode_integration.test.js`.
- Final compatibility batch: **97 passed, 5 failed** across four files. All 15 new behavior tests and `export_activity_state_and_print.test.js` passed. Remaining failures inspect unrelated host/header source or loader pins: two obsolete `Context: ${activity.description}` counts in `activities_resource.test.js:419`; root/desktop loader-pin parity at line 455; two header source assumptions at `activity_setup_placement.test.js:26,37`. Root was notified with exact assertions for host-finalization review.

No application implementation outside this workstream's files was edited. Existing unrelated work was preserved.
