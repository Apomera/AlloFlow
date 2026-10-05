# Bounded backup and boot audit

This audit has two independent findings. Only report-local fixtures and their receipts were written. No production source, browser, Vitest, Git index, or handoff changes were made by this auditor.

## Protected backup export cannot reach its controller

`exportCanvasRecoveryVaultBackup` calls the unqualified `getCanvasRecoveryVaultController()` inside `createHostHandlers(__d)`. The controller factory remains in the host and already has the `__d.getCanvasRecoveryVaultController` getter. No same-named local declaration exists in the extracted factory. The generated module is an isolated IIFE, so the host's component closure is unavailable to that call.

The complete current source and generated factories both catch `getCanvasRecoveryVaultController is not defined`. Neither uses the provided getter nor invokes `exportEncryptedBackup`, so the backup button never produces a file.

`export-backup.node.cjs current` records 24 assertions: 2 pass and 22 fail. These dependent assertions represent one underlying defect. `candidate` evaluates one exact in-memory qualification to `__d.getCanvasRecoveryVaultController()` and passes all 24. Successful controls verify the controller call, serialized encrypted payload, dated JSON filename, click, delayed URL revocation, and no error. Failure controls verify that a genuine controller backup failure is surfaced and creates no download.

The fixtures evaluate the entire factories with native Node Blob and mocked DOM, object URL, and timer interfaces. They do not claim a native browser download. `BACKUP_HANDLER_SOURCE`, `BACKUP_HANDLER_RUNTIME`, and `BACKUP_RESULT` permit fresh root-integrated candidates and output destinations.

## Cancelled boot migration repopulates the student recovery ref

The canonical Canvas boot effect assigns `canvasRecoveryStoreRef.current = store` immediately before its existing `cancelled` and student-entry checks in the plain-store branch. When a legacy migration is pending, the actual effect cleanup retires the old teacher boot. A new student render executes its actual protection path and empties the recovery ref. Completion of the old migration then puts the private teacher snapshots back into that shared ref before returning on the cancellation check. The modal/UI setters remain guarded, which hides the stale ref mutation.

`boot-retirement.node.cjs current` evaluates the whole actual boot effect, its cleanup, and a fresh student effect with immutable role/session values for each render and shared React refs. It records 18 assertions: 17 controls pass and one fails because the supposedly empty student recovery ref contains `teacher-private`. `candidate` moves only that assignment after the existing checks, in memory, and passes all 18. Normal supported boot and current migration still publish the saved workspace, choice dialog, active ID, and loaded status. Retired migration still emits no UI updates and leaves the student recovery decision/modal/ID intact.

Storage completions are deferred fixture promises; this is a closure-level ownership proof, not full-app/native IndexedDB acceptance. `BOOT_HOST` and `BOOT_RESULT` permit fresh root-integrated candidates and output destinations. The audit proposes no new boot generation, persistence cancellation, or blanket lifecycle checks.

Disable/erase controls were inspected but not selected as additional proven findings. Their persistence transactions require a separately justified lifecycle contract; this audit does not treat any later committed disk transaction as automatically reversible.
