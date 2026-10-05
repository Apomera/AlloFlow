# Vault and import ownership audit

This read-only audit confirmed two races in the current generated handlers. Production files were not changed. The native Node reproductions assert that the defects are present; they are baseline evidence, not fixed-code tests.

## A retired plaintext read can reopen a locked recovery view

`host_handlers_source.jsx` `syncCanvasRecoveryVaultState` reads unlocked status, awaits `readUnlockedCanvasRecoveryVaultStore`, then publishes the returned plaintext and captured unlocked status. Its failure branch also calls `controller.lock()` without checking whether the read still owns the operation.

The actual vault controller's `readPlainStore` captures the decrypted vault key before awaiting record decryption. Dropping the controller's key with `lock()` does not cancel an already-started Web Crypto operation. An independently started automatic policy refresh can consequently finish its plaintext synchronization after the explicit lock handler clears the view.

[Native reproduction](late-vault-sync.node.cjs) uses the actual crypto helpers, actual controller, actual generated sync and lock handlers, and one held record-decrypt boundary. [Observed result](late-vault-sync.json): after successful lock, the controller remains locked while the recovery view becomes unlocked and the private title/content sentinel reappears.

Suggested fix: give synchronization reads a distinct owner and invalidate it synchronously when locking or replacing the controller. Check owner and exact controller identity after each await and before either success publication or failure cleanup. A latest-status read should also confirm that the controller is still unlocked before exposing plaintext. A retired read must not lock a newer unlock or overwrite a replacement store.

## An earlier file choice can replace the latest selected backup

`host_handlers_source.jsx` `handleCanvasRecoveryImport` creates an independent FileReader for each selection, then awaits the vault module loader before it writes `canvasRecoveryVaultImportRef`, changes the import form, or calls the workspace/project importer. It has no selection owner. The import buttons remain available while reading.

[Native reproduction](late-import-selection.node.cjs) uses the actual generated handler, real encryption and actual backup validation. Only the module-loader completion order is controlled. [Observed result](late-import-selection.json): selecting A then B, completing B, and finally completing A leaves backup A ready for import. The older callback also clears the shared busy status.

Suggested fix: establish one intake owner at selection time and retire it on a later selection, dialog close, or workspace clear. Validate ownership before state changes, importing/restoring, errors and cleanup; an obsolete reader must not clear a newer input or busy state. Handle FileReader construction/read failures with the same owner-aware cleanup. Restore-level ownership alone does not preserve selection order because the obsolete read may initiate its restore later.

## Scope

The controlled tests certify handler/controller ordering under local async boundaries. They do not cover hosted storage, the full App shell or a browser journey. They do not test encryption strength. This audit found no reason to alter encryption format, CAS behavior or recovery-key semantics.
