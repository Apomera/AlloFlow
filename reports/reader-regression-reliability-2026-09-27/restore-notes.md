# Restore fixture reliability

Baseline HEAD: `452e7cd230b62f4e192f055826817653d5b997f4`. Only the three assigned test files were edited. Production source, generated modules, catalogs, baselines, Git index and release state were not changed by this lane.

| Test file | Baseline passed / failed | After passed / failed |
| --- | --- | --- |
| `student_assignment_restore_readiness.test.js` | 2 / 11 | 14 / 0 |
| `novak_original_reader_handlers.test.js` | 0 / 14 | 16 / 0 |
| `homework_selection_integrity.test.js` | 11 / 2 | 15 / 0 |

The 27 baseline failures came from missing host dependencies or incorrect fixture state semantics: draft-session refs and transition requests, the live resource mutation ref, functional content updates, and homework asset hydration. Existing source-selection, exact-text, serialization, assignment cancellation and privacy assertions remain intact.

The fixtures now invoke the actual draft-session helper and, for homework, the actual `ModuleScopeExtras.hydrateSessionAssets` implementation. Five added cases cover cancelled manual restoration without losing waiting homework, queued support-save preservation, cancelled/deferred opening of the latest saved artifact, and rejected or unresolved hydration without publishing an incomplete cloud assignment. Successful homework assertions also check delivery-summary consistency.

## Validation

The baseline command targeted all three files with `--maxWorkers=1`; `restore-baseline.json` records 13 passing and 27 failing tests.

The same three-file after command completed 30 passing tests in the restore/Novak files, but the homework forks worker timed out before executing its file. The process exited 1. **The JSON reporter's `success: true` only describes the completed test files; it is not a clean combined-run result.** No code changed in response to that infrastructure failure. A focused homework recheck then passed all 15 tests, exit 0. Thus 45 distinct tests passed across completed runs; a clean combined integration run remains with the parent.

Evidence: `restore-after.json`, `restore-homework-recheck.json`, and `restore-summary.json`. The summary records process outcomes and relevant input hashes after the recheck. Concurrent `AlloFlowANTI.txt` changes were present; these hashes are a read-only checkpoint, not a frozen release snapshot. Scoped `git diff --check` passed.

```powershell
npm test -- tests/student_assignment_restore_readiness.test.js tests/novak_original_reader_handlers.test.js tests/homework_selection_integrity.test.js --maxWorkers=1
```

No demonstrated production bug was found in this bounded fixture-repair task.
