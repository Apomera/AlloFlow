# Roster review continuation — 2026-09-28

## Status

Completed the roster continuation in `C:/tmp/tyler_onboarding_review`, the existing detached review checkout of Tyler's onboarding branch at `d7bb1b940`. Changes remain uncommitted. Nothing was merged into the main checkout, pushed, or deployed.

## Where Claude left off

The checkout already contained all seven roster fixes, all nine English `roster.*` keys, and both remaining wording fixes:

- `docs/google_workspace_connections.md` explains that teachers can explicitly save a sync key for another device.
- `classroom-import.html` says both downloading and sending are blocked when names are missing.

The original eight-suite run reproduced all 155 passing tests. Root files and browser copies matched.

## Additional fixes completed

1. **Legacy label migration:** single-word and hyphenated codenames such as `Owl` and `Quiet-Owl` could be mistaken for learner IDs. Their old labels survived removal and could transfer to a new learner. Label storage now uses version 2 with explicit migration metadata for each class. Unopened legacy classes migrate separately. Departed legacy codenames are dropped, while migrated learner-ID labels survive an undo. Edits migrate the latest stored class before changing a label.
2. **Sync-key write failures:** linking, loading or unlinking no longer reports success when browser storage refuses the write. Linking saves the key successfully before replacing the roster; failure leaves the roster and existing keys intact and reports an actionable error.
3. **Stale confirmation:** a Classroom roster waiting for confirmation is rejected if the destination roster changed in the meantime. No key is saved for the stale confirmation.

Registered two additional English strings in `ui_strings.js` and its browser copy: `roster.classroom_sync_key_storage_failed` and `roster.classroom_roster_changed`.

Changed during this continuation: `teacher_source.jsx`, both generated `teacher_module.js` copies, the private-label and linked-sync test files, and both `ui_strings.js` copies. The generated modules were rebuilt from source.

## Verification

**Final focused run: 173 passed, 0 failed, 0 skipped, across nine files.** The JSON result is in `roster-continuation-tests.json` beside this note.

| Test file | Passed |
| --- | ---: |
| classroom_import_app.test.js | 38 |
| classroom_import_service.test.js | 38 |
| classroom_linked_sync.test.js | 17 |
| teacher_private_labels_and_classroom_handoff.test.js | 22 |
| roster_safe_updates.test.js | 33 |
| roster_privacy_print.test.js | 16 |
| roster_panel_compact_toolbar.test.js | 2 |
| roster_group_profile_crash.test.js | 2 |
| roster_reading_preferences.test.js | 5 |

- The handoff's original 155 tests plus 13 new regressions pass; reading preferences adds five tests.
- Twelve added regression cases were observed failing before the fixes. The additional latest-store migration test also passes.
- Five deliberate in-memory mutations were caught: retaining an orphan legacy label, losing migration metadata, ignoring a failed key write, committing after failed persistence, and skipping the stale-roster guard. Live files were not mutated.
- Five other modified onboarding suites passed 71 tests: onboarding review fixes, guided default path, independent mode surfaces, launch-pad accessibility, and role-specific tool labels.
- Twelve root/browser file pairs match. Compiling the teacher source in memory matches the generated module. Script syntax, JSON catalog parsing, all eleven relevant strings, and `{max}` / `{count}` placeholders pass.
- `git diff --check` passes for the files edited during this continuation.

Run the focused tests from the review checkout:

```powershell
node node_modules/vitest/vitest.mjs run tests/classroom_import_app.test.js tests/classroom_import_service.test.js tests/classroom_linked_sync.test.js tests/teacher_private_labels_and_classroom_handoff.test.js tests/roster_safe_updates.test.js tests/roster_privacy_print.test.js tests/roster_panel_compact_toolbar.test.js tests/roster_group_profile_crash.test.js tests/roster_reading_preferences.test.js --maxWorkers=1 --reporter=json --outputFile=roster-continuation-tests.json --silent
```

## Existing failures outside the focused run

The wider checks are not fully green. These failures predate the roster changes:

| Test file | Existing failures | Evidence |
| --- | ---: | --- |
| guided_host_wiring.test.js | 7 | Actual isolated HEAD/current runs both produced the same 20 passes and seven failures. Assertions inspect host code that moved into extracted modules. |
| post_session_follow_up_planner.test.js | 3 | Reproduced the handoff's failures and two `_alloHostHandlers` harness errors. Unchanged HEAD tests expect implementation bodies where HEAD already contains extracted-module wrappers. |
| roster_wiring.test.js | 1 | Same existing host-handler extraction mismatch. |
| roster_session_history.test.js | 1 | Unchanged test expects `text-rose-600`; unchanged source uses `text-rose-800`. |

The existing 20-class sync-key limit and eight-class private-label limit remain in place. Raising those limits is a separate product decision. No fresh real-browser session was run during this continuation; UI behavior was exercised through the rendered component tests.
