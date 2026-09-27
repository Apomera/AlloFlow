# Reader and delivery regression reliability

The eight repaired suites pass together: **127 tests passed, zero failed**, with the normal Vitest timeouts and one worker. All 29 recorded source/test inputs remained unchanged during the final 9.86-second run. This pass changes tests and their fixtures only; it does not change application behavior or deploy anything.

## Why these checks needed repair

The production host had gained draft-transition guards, functional reading-state updates and received-delivery state. Older extracted fixtures omitted those dependencies and therefore reported failures before exercising the intended behavior. The reader-role fixture also omitted the two helper files used by the production builder. An audio fixture evaluated unrelated host statements after the helper it intended to test.

The baseline reproduced 42 failing tests and nine tests blocked by reader setup, alongside 71 passing tests across these eight files. The repairs preserve existing assertions and add five behavioral cases; the final total is 127. This is not a claim that 51 production bugs were fixed or that the full repository CI suite is green.

## Coverage restored and strengthened

- Student homework opening retains its pending payload after a cancelled draft transition and allows a later manual choice to supersede it.
- Opening an original reading uses current saved supports, including a support save queued in the same React state batch as a layout change.
- Homework sharing uses the real asset hydrator. Failed hydration or unresolved references falls back without publishing an incomplete cloud assignment, while retaining the original/adapted pair and curated supports.
- Live and mailbox delivery fixtures expose real received-resource state. Assertions cover successful receipt, student-safe filtering, an empty assignment clearing prior receipts, cancelled/obsolete work, and failure preserving prior delivery state.
- Reader-role tests compile the same helper/source sequence as the reader builder. Audio tests parse and evaluate only the requested host declaration.

## Results and evidence

| Group | Baseline | Passing follow-up |
| --- | --- | --- |
| Assignment restore, original reader, homework selection | 13 passed / 27 failed | 45 passed, including five added cases |
| Live-session and mailbox delivery | 28 passed / 14 failed | 42 passed |
| Reader-role UI and audio review | 30 passed / 1 failed / 9 setup-blocked | 40 passed |
| Final combined run | All eight repaired suites | 127 passed / 0 failed; exit 0 |

`combined-tests.json` records the final test results. `combined-inputs.json` records the exact command selection, baseline HEAD `452e7cd230b62f4e192f055826817653d5b997f4`, before/after SHA-256 values, process exit and zero input drift. The shared checkout included other owners' uncommitted production work; the evidence identifies the tested bytes rather than assuming they equal HEAD or the deployed release.

The group reports preserve two incomplete intermediate runs under local contention: one restore worker failed to start, and one delivery run timed out before all files reported. Individual reruns and the final combined run passed without changing checked-in timeouts, adding exclusions, updating snapshots or weakening assertions. Full-host bytes changed between some group runs; the stable final combined run is the acceptance result.

See `restore-notes.md`, `delivery-summary.md` and `reader-HANDOFF.md` for exact group scope and baseline evidence. Their referenced `.log` files remain local diagnostics because repository policy ignores logs; the JSON reports and Markdown handoffs are the durable record.

## Reproduction

```powershell
node node_modules/vitest/vitest.mjs run tests/student_assignment_restore_readiness.test.js tests/novak_original_reader_handlers.test.js tests/homework_selection_integrity.test.js tests/mailbox_activity_only_intake.test.js tests/live_session_learner_recovery.test.js tests/live_session_reliability.test.js tests/instructional_role_ui.test.js tests/karaoke_tts_review_runtime.test.js --maxWorkers=1
```

No production sources, generated modules, shared catalogs, deployment files or test quarantine entries were changed by this pass. Other chats' ongoing improvements and test-generated images are preserved. The shared `AGENT_HANDOFF.md` entry was updated but is excluded from this commit because it also contains other owners' uncommitted entries.
