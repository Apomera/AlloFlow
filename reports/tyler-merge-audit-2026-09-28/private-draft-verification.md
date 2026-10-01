# Private-label draft identity fix

## Outcome

The integration candidate now binds an open private-label draft to the class ID, learner ID, and original codename mapping captured when editing begins. If a roster update changes that identity, the editor closes, the obsolete draft is discarded, and a warning explains the change. Existing stored labels remain unchanged. Callbacks from an obsolete editor cannot save the draft after the identity changes. An unrelated roster edit for the same learner preserves the draft and supports retry after a storage refusal.

This additional fix exists in `C:/tmp/tyler_integration_candidate` only. The earlier review checkout at `C:/tmp/tyler_onboarding_review` was not changed by this work. Main application source was not changed.

## Reproduction and verification

Two new regressions failed against the previous generated teacher module: the original learner's unsaved note was stored under a replacement learner ID, and under another class that reused the codename and learner ID. The same-learner retry control passed. The initial attempt failed to start a Vitest worker and ran no tests; the subsequent reproduction run completed with **2 failures, 1 pass, 34 skipped** in 8.26 seconds at 00:11:22 on September 29, 2026 (America/New_York).

After the fix and `node _build_teacher_module.js`, verification completed at 00:17:23 on September 29, 2026 (America/New_York), with **87 passing tests across 3 suites** in 142.84 seconds:

| Suite | Passed |
| --- | ---: |
| `teacher_private_labels_and_classroom_handoff.test.js` | 37 |
| `classroom_linked_sync.test.js` | 17 |
| `roster_safe_updates.test.js` | 33 |
| **Total** | **87** |

The rebuilt root and public teacher modules have identical hashes. The English catalog and public mirror also match. The new warning is registered as `roster.private_label_draft_discarded`; translations remain separate release work.

## Commands

All commands ran in `C:/tmp/tyler_integration_candidate`.

Before rebuilding the fix:

```powershell
node node_modules/vitest/vitest.mjs run tests/teacher_private_labels_and_classroom_handoff.test.js -t 'private-label drafts stay' --pool=threads --maxWorkers=1 --no-cache --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-private-draft-before.json
```

Build:

```powershell
node _build_teacher_module.js
```

After rebuilding:

```powershell
node node_modules/vitest/vitest.mjs run tests/teacher_private_labels_and_classroom_handoff.test.js tests/classroom_linked_sync.test.js tests/roster_safe_updates.test.js --pool=threads --maxWorkers=1 --no-cache --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-private-draft-after.json
```

## Evidence

- `private-draft-before.json`: completed pre-fix reproduction result.
- `private-draft-after.json`: all 87 tests passing after the fix.
- `private-draft-files.json`: SHA-256 hashes for the six changed source, test, generated, and catalog paths.

No commit, push, deployment, or live Google account operation was performed.
