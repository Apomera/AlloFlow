# Classroom and School Store: integrated product handoff

This page records the September 8 implementation and verification. The September 9 follow-up adds default-off reviewed class links, with backend changes and its own evidence: see [Reviewed AlloFlow class links in School Store](school_store_class_links.md). Earlier test counts and unchanged-backend statements below apply only to the September 8 pass.

## What is in AlloFlow now

- The Teacher Portal has a separate, reviewed safe-update import. Same-class v4 updates preserve existing histories, settings, groups and learner identities; missing learners are retained and identity conflicts block the update.
- Its Classroom link opens the shipped teacher-only import helper. After approved Google configuration, teachers can authorize read-only roster access, choose a class, review private name/codename matches and download a codename-only roster.
- School Store offers 1/3/5-point shortcuts, explicit recognition review, and reuse of the last confirmed recognition without automatically choosing the next student.
- Pending awards keep an immutable request, original staff identity and retry key. Exact retries recover saved results even after a student/category becomes inactive. Malformed or partial replies do not clear recovery state.
- Account changes prevent old recognition details or undo actions from being attributed to the newly selected staff member.
- The shipped practice page uses the same Portal interface; its fictional response fields now match the production acknowledgement contract.

## Main files

Teacher changes: teacher_source.jsx, _build_teacher_module.js, teacher_module.js.

Classroom: classroom-import.html, classroom_import_app.js, classroom_import_service.js, classroom_import_config.js and _build_classroom_import.js.

Store: apps_script/school_rewards/Portal.html. Existing server ledger and authorization endpoints in Code.gs are unchanged by this pass.

Generated desktop assets and the practice page must be rebuilt with the source. Locale changes belong in the portal catalogue and Spanish source, then the existing i18n builder.

## Verification

Final verification, September 8, 2026:

- 584 tests passed across the final runs. The broad run passed 445 tests in 17 files; its remaining worker timed out before starting. That 139-test Portal file then passed separately against the same final assets. This was a runner startup error, not an ignored failing assertion.
- Six browser surfaces passed: Classroom helper, actual Apps Script Portal and shipped practice page, each at 1280px and 390px, with no recorded browser errors.
- Spanish coverage is 997/997 catalogue entries. Ten checked root/public asset pairs match byte-for-byte, including the helper, Teacher module, Portal, practice page and locale packs. Existing Code.gs has no changes from this pass.
- Evidence: reports/classroom-store-product-2026-09-08/regression-tests.json, portal-regression-tests.json and browser-checks.json. The first report intentionally retains its worker-startup error; the separate report records successful recovery of the skipped file.

Focused recognition regressions cover uncertain saves, exact recovery, changed accounts, malformed single/batch replies and cancellation. Browser checks exercise the actual helper, Apps Script Portal source and shipped practice page at desktop and phone widths using fictional data and simulated Google services.

Reproduce with:

- node dev-tools/check_classroom_store_integration.mjs
- node node_modules/vitest/vitest.mjs run tests/school_rewards tests/classroom_import tests/roster_safe_updates.test.js tests/school_store_design_refinements.test.js --maxWorkers=1 --testTimeout=60000
- If the host cannot start the Portal worker, rerun that file separately: node node_modules/vitest/vitest.mjs run tests/school_rewards_print_portal.test.js --maxWorkers=1 --testTimeout=60000

## Still separate from deployment

Google OAuth remains disabled/unconfigured by default. No live district deployment, real roster import or student-data connection was performed.

Classroom export creates NEW identities for a NEW class. It is not ongoing sync or a Store identity binding. The safe-update pathway accepts existing same-class AlloFlow identities, not a second fresh Google export.

A page reload discards private pending-award details while retaining its retry key/fingerprint. An unresolved request may require administrator reconciliation; private drafts are deliberately not persisted.

## Next planned connection

Review a district-owned mapping between AlloFlow learner IDs and canonical Store student IDs before adding an Allobot quick-award command interface. Voice would be an explicit push-to-talk input with review, not continuous listening. Store and Educator Evaluation roles remain separate from Classroom authorization.

See google_workspace_connections.md and google_classroom_import.md for the permission boundaries and deployment checklist.
