# Learner persistence follow-up

Read-only source audit on 2026-10-03. Production files are unchanged by this lane. The focused mounted regression candidate has not been run; the coordinator owns serialized execution and source integration.

## Concrete findings

1. **Classroom suppression is omitted from autosave eligibility.** `AlloFlowANTI.txt:13230` passes `null` as session code, and the save effect dependencies at line 13252 omit `activeSessionCode`. The gate at line 2003 explicitly suppresses device storage for a non-teacher with a session code. Hydration at line 28433 passes the actual session code. The in-app live join path sets it at line 34672 without requiring a URL student-entry flag. A draft already loaded before an in-app join can therefore reach the save callback despite classroom suppression. Fix the current gate, dependencies, queued-write ownership, and retry eligibility together.

2. **Delayed hydration can discard or strand a current draft.** The non-strict work read at `AlloFlowANTI.txt:28445` replaces all responses at line 28447 and sets only the loaded ref at line 28448. An edit made while that read waits is overwritten when saved work exists. With a missing record, readiness changes no state/dependency, so an edit whose save was skipped while unloaded is not scheduled when the read completes. Merge restored resources with current per-resource drafts taking precedence and make readiness a render-visible save dependency. A storage-read failure must leave saving blocked and current drafts available for retry; `utils_pure_module.js:491–527` otherwise normalizes non-strict failures to the same null as a missing record.

3. **Learner Saved status lacks a verified read-back.** `AlloFlowANTI.txt:13240–13245` performs a non-strict set, rejects only explicit `false`, and then publishes Saved. Existing production `writeVerifiedStorageSnapshot` at `utils_pure_module.js:588–600` requires a strict write returning exactly true and a matching strict local read, with freshness checks before acknowledgement. Use that same contract while preserving the existing serialized latest-write ordering and retry behavior. Native IDB success alone is not evidence that a separate verified read matched the draft.

## Minimal integration constraints

- `lzLoaded` is declared at `AlloFlowANTI.txt:11904`, `isStorageDisabled` at line 11928, and `showStudentEntry` at line 12932. These precede the learner state/effect block.
- `activeSessionCode` is a standalone `useState(null)` declaration at line 16712. Adding it directly to the earlier effect's dependency array creates a temporal-dead-zone failure. Moving that one declaration before learner state has no initializer dependencies and preserves the contiguous state/save effect fixture boundary. The coordinator owns that change.
- The existing acceptance fixture extracts from studentResponses onward and supplies only isTeacherMode/showStudentEntry. Moving activeSessionCode before that boundary still excludes its declaration, so the report-local browser fixture also needs explicit synthetic activeSessionCode/lzLoaded/isStorageDisabled values once those are referenced.
- `isStorageDisabled` is an initialization/capability failure flag (lines 12032–12037), not a user privacy toggle. Avoid presenting it as an opt-out preference.
- Existing workspace hydration-generation invalidation is separate (`AlloFlowANTI.txt:21690–21693`, 23483–23492); pending learner reads currently use only effect cancellation. Clear/restore ownership must not allow a stale read to repopulate intentionally reset responses.

## Regression candidate

`student-response-lifecycle.test.js` mounts the actual current React state/save/hydration effects and existing hydration-generation invalidator with controlled storage timing. It includes nine behavioral cases: pending-debounce session suppression, blocked retry, delayed restore preserving drafts, empty restore scheduling the last edit, explicit reset retiring a delayed read, read-error retry, explicit write acknowledgement, matching local readback/retry, and overlapping write ordering. Canonical functions are extracted without modifying them; exact-source extraction fails closed when its boundaries change. It is a controlled timing/storage test, not native IndexedDB or whole-app certification.

Prepared command, coordinator only:

```powershell
npx vitest run --config reports/classroom-reliability-followup-2026-10-03/student-response.vitest.config.js
```

`ALLO_ANTI_CANDIDATE` and `ALLO_UTILS_CANDIDATE` can select report-local source candidates. Baseline failures are expected for the unmet desired behavior; none have been claimed as executed proof yet. Retain exact source hashes, command/exit, totals, failures, and tested patch bytes when execution is authorized.

## Source candidate prepared

`student-response.patch.json` contains seven exact, ordered, unique before/after replacements. The coordinator can apply them to each current host alongside other patches without overwriting from a stale full source. It relocates only the standalone session-state declaration, uses the existing verified writer and serial queue, adds a readiness revision that schedules pending edits after a successful strict restore, preserves current response entries during hydration, retries failed reads, and fences reads/writes with the existing reset generation.

`build-student-response-candidate.cjs` applies those replacements to the current source and writes only this report directory's candidate and authoring receipt. It refuses missing or duplicate anchors and checks the input did not change while authoring. It has not been executed by this worker.

```powershell
node reports/classroom-reliability-followup-2026-10-03/build-student-response-candidate.cjs
```

The existing invalidator runs during explicit clear/project-reset paths and unmount. Its candidate addition remains ref-only, with no state scheduling during unmount. Marking the cleared response map as authoritative permits the actual subsequent reset setter to save empty work instead of stranding new edits behind a retired restore. The generation mismatch prevents the delayed old read or queued old write from resurrecting the prior map. An already-started native transaction is not retroactively cancelled; stale completion cannot publish a verified Saved status.

The prior synthetic classroom acceptance completed at `2026-10-03T14:24:04.650Z`: [report](../classroom-reliability-2026-10-01/accessibility/report.json). It proved its scoped two-resource native playback, persistence, submission, isolation, keyboard panels, and reflow, while native zoom remained blocked and manual AT was untested. Its learner fixture forces initial loaded readiness, so that success does not cover the hydration races above.
