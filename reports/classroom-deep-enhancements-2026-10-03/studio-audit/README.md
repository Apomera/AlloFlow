# Studio restore attempt ownership audit

Source audit and report-local candidate prepared on 2026-10-03. This audit agent made no production changes and ran no tests. Root reported the actual-source baseline: nine cases, five controls passed and all four overlap behaviors failed. Root's [candidate receipt](candidate-results.json) records nine passed, zero failed against the frozen candidate. This report establishes candidate behavior; production integration and hosted/native browser acceptance remain root-owned.

## Confirmed source behavior

`studio_response_module.js:317–328` has one asynchronous restore handler per mounted Boundary. It records resource, profile/role identity and the response object, but has no restore-attempt owner. Success checks the mounted/resource/identity guards and rejects changed work. Its catch checks only `mounted.current` before replacing restore feedback.

Two restore selections on the same resource can therefore interfere:

1. Select an older file whose `text()` stays pending, then restore a newer valid file. The newer file writes normally and announces success. Reject the old `text()` or complete the old valid file: the old catch replaces the newer success with “Choose a text backup…” feedback.
2. Select an older valid file whose `text()` stays pending, then select a newer invalid file. The newer selection reports failure without changing the response object. When the old read completes, all existing success guards pass and its obsolete writing is applied.
3. Select two pending valid files and complete the older one first. It writes before the newer selection settles; the newer completion then rejects because the response changed, leaving the older writing and invalid feedback.

These races use the same mounted resource/profile. The host's four Boundary callsites at `AlloFlowANTI.txt:43045–43100` key the component by resource/profile/role, so a normal resource/profile switch remounts it. The existing unmount check is a useful control; this report does not claim an ordinary cross-resource stale error remains reachable through those keyed callsites.

## Focused regression

`restore-ownership.cjs` is a native Node assertion runner. It loads the complete actual module into a VM, mounts the real exported Boundary with installed desktop React and jsdom, dispatches the real hidden file input change handler, and controls file-read completion without timers or copied restore implementation.

Nine cases cover five controls (current valid restore, current invalid preservation, oversize before read, learner edit preservation, unmount) plus four overlapping restore outcomes. Every backup comes from the actual `serializeBackup`/`readBackup` implementation. It records actual DOM feedback and learner response writes, and accepts a frozen candidate through `STUDIO_RESPONSE_SOURCE`.

From the workspace root, root may run:

```powershell
$env:STUDIO_RESTORE_RESULT = 'reports/classroom-deep-enhancements-2026-10-03/studio-audit/baseline.json'
node reports/classroom-deep-enhancements-2026-10-03/studio-audit/restore-ownership.cjs
```

For a candidate, set `STUDIO_RESPONSE_SOURCE` to its absolute path and choose a distinct result path. The runner writes only the explicitly requested receipt; it does not alter source or require a Vitest worker.

## Minimal fix proposal

Add a per-Boundary attempt ref. Increment it on every nonempty file selection, before size validation or the asynchronous read. Capture that attempt and require it to remain current in both the success and failure paths, along with the existing mounted/resource/identity/role checks. Preserve the current response-reference check so a learner edit still wins and the current restore still reports its failure. Guard success feedback again after `onResponseChange` in case that callback synchronously starts a newer restore. Unmount already retires the Boundary through the mounted ref.

This makes the newest file selection own response changes and feedback, including when the new selection is invalid. It needs no persistent resource tombstone, global store reset, protocol change, or altered backup validation.

The prepared [candidate](candidate/studio_response_module.js) implements this proposal with exactly two unique source substitutions. [Preparation receipt](prepare-receipt.json) records canonical/public preimage SHA256 `3e9f72bf73832605fc68993f7eb5be663b14a0a696240ec39950bba1b66c7cb5`, candidate SHA256 `9277bb543b6614e1d819fef6ca0586081f37c75dfc5fcb1d56c746c75f475f23`, LF line endings, exact byte reversal and syntax parsing without execution. Original bytes are retained at [source-before/studio_response_module.js](source-before/studio_response_module.js); [restore-operations.json](restore-operations.json) contains the exact before/after anchors. The guarded [preparer](prepare-restore-candidate.cjs) has no production-write or apply mode and refuses to overwrite those receipts.

The owner ref is unconditional and keeps one current object token. Mount effect cleanup also clears ownership, so a StrictMode cleanup/setup that restores `mounted.current = true` cannot revive an earlier request. Empty picker selections leave the current request alone. Actual file selections replace it before oversize validation or reading. The success status rechecks ownership after the learner callback, covering a synchronous newer selection or unmount. These lifecycle points were source-reviewed; the nine-case receipt does not separately execute a StrictMode cleanup/setup or synchronous callback re-selection case.

## Source topology and cache facts

- Canonical hand-authored runtime: `studio_response_module.js`; matching desktop runtime: `desktop/web-app/public/studio_response_module.js`. Both read as SHA256 `3e9f72bf73832605fc68993f7eb5be663b14a0a696240ec39950bba1b66c7cb5` during this audit. No Studio JSX authoring or HostHandlers manifest entry was found for this module.
- `build.js:1315–1318` registers this runtime in `MODULES`; its desktop public copy is included by the generic `MODULES.map` copy at `build.js:2640` onward.
- All three current source hosts (`AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, `desktop/web-app/src/App.jsx`) load StudioResponse at line 14885 with `studio_response_module.js?v=6770c29ca`. Local development and bundled desktop rewrite the CDN prefix to the colocated public file (`AlloFlowANTI.txt:14028–14031`). Hosted use keeps the configured CDN URL.
- StudioResponse is absent from `build.js:2445–2480` `CONTENT_HASH_PINNED`. The URL transformation uses a content pin for listed modules and otherwise the Git hash (`build.js:2519`). Thus there is no Studio-specific hash manifest/pin that automatically needs regeneration today. If root chooses a narrow new content pin for hosted cache invalidation, all three Studio loader URLs must agree, and adding the filename to `CONTENT_HASH_PINNED` prevents a future build from reverting that pin. A broad shared-version bump would affect unrelated modules.

Existing relevant regressions: `tests/studio_workflow.test.js:27` exercises one ordinary restore through the real learner lane; `tests/fix0928_studio_feedback_kept.test.js:90` covers backup feedback fingerprints; `tests/studio_response_boundary.test.js` covers learner/teacher response ownership. None of the inspected restore cases owns overlapping asynchronous attempts.

## Submission/delivery audit outcome

The latest readiness guard in `host_handlers_source.jsx:4169–4173` explicitly returns retryable `studio-tools-not-ready` when required adapters are absent. `_alloMailboxCall` rejects non-OK server responses; the mailbox server's final `putSubmission` path writes the submission before returning its saved receipt. No additional confirmed delivery defect was identified in that inspection. This proposal is limited to actual restore attempt ownership.
