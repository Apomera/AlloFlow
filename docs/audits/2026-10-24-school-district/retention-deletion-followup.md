# Retention and deletion implementation

October 24, 2026. This pass adds local implementation and synthetic verification for the [data-flow inventory](data-flow-inventory.md). Dependency/CI/release work and MCP/browser-loader work remain with the other security chats. No production records were read or deleted, and no cloud services were deployed.

## What is covered

| Path | Implemented boundary | Outside that boundary |
| --- | --- | --- |
| Protected clinical records | An unlocked, reviewed deletion flow for the complete three-tool clinical store, with password recheck, retention/hold acknowledgments, a version-protected deletion marker, and reconciliation of uncertain results. | Other tools, general workspace recovery, older downloads/backups, provider copies and noncooperating old app versions. |
| Owned Firebase expired assignment | A reviewed exact-scope plan and dry-run-first operator tool. It enumerates nested records, including missing-parent containers, related assets and signaling; uses document-version preconditions; and verifies deletion. | Google-provisioned Canvas databases, active/unknown assignments, unsupported holds, unrelated projects/records, previously orphaned sessions without ownership evidence, backups and exports. |
| School-owned Apps Script mailbox | Absolute live-capability expiry and coordinated cache lifecycle; a scoped manual Drive deletion runbook and an offline review-packet validator. | Automatic deletion of submitted/delivered Drive files, provider/Vault purge, copies held elsewhere, and records outside the exact reviewed account/folders. |

These are separate paths. Deleting from one does not complete a request across the others.

## Request ownership and retention decisions

Use an opaque request reference and keep the mapping to the student/case in the district's approved records system. Assign a records/privacy owner, record when the request arrived, identify each enabled store, and resolve the applicable disposition and holds before execution. Do not include student names, report text, API/admin/join secrets, or file contents in support tickets or these administrative plans.

Maine's student-information privacy law requires covered operators to delete student data within 45 days of a school or school administrative unit's request. This is a request deadline, not a universal 45-day retention period. Track the deadline and unresolved stores; the district records owner must resolve applicable retention, holds and other obligations, with documented escalation rather than a false completion claim. [Maine 20-A §953](https://legislature.maine.gov/statutes/20-A/title20-Asec953.html)

This implementation does not assign an automatic age-based purge to clinical or school records. Access expiry, cache eviction, moving a file to trash, and verified deletion have different meanings. Existing backups, browser caches, exports and provider retention must receive their own recorded outcome. A retained hold or pending review remains visible in the request status.

## Protected clinical store

Use the clinical tool's protected-records controls to review deletion of all BehaviorLens, Dynamic Assessment and Report Writer records on this device/bridge store. This is a whole-store operation, not deletion of one student or one report. Finish preserving or explicitly discarding temporary/session-only work and close other clinical-tool windows first. Confirm the exact scope, current saved-records password, typed confirmation and the retention/hold acknowledgments.

Review stages and saves editor work before unmounting it, and pauses the workspace so later edits cannot silently change the reviewed state. Cancel returns to the saved work. A changed store, policy restriction, missing confirmation, wrong password, or newly discovered readable legacy clinical copy blocks completion. Readable legacy copies are not silently deleted by this operation.

Deletion atomically replaces the exact reviewed encrypted store with a non-content marker. It clears this service's working keys, record maps, transfers and preserved-copy metadata. The marker prevents stale cooperating vault writers from treating the missing store as permission to recreate it. A cooperating tab verifies the durable marker before clearing its own state; an old application version is not a remotely erasable device.

If a storage acknowledgment or verification fails after a deletion attempt, the UI keeps the workspace paused for reconciliation. It does not reopen ordinary editing or automatically retry deletion against a changed store. Reconnection can confirm the matching marker, establish that the reviewed original remains, or leave a conflict unresolved. The UI must not report deletion as verified solely because a write was attempted.

An encrypted backup saved earlier is a separate copy. Explicitly restoring it can restore the old records into a new workspace. A deletion marker does not invalidate every exported key or erase earlier backups. Decide their disposition under the same request. Logical replacement is not a claim of forensic erasure from storage media or the hosting provider's backups.

An optional deployment setting can block manual clinical deletion or record a general hold:

```js
window.ALLOFLOW_SENSITIVE_RECORD_RETENTION_POLICY = {
  version: 1,
  allowManualDeletion: false,
  legalHold: true
};
```

An absent policy permits the reviewed manual flow with the operator acknowledgments. Invalid policy fails closed for deletion. This browser configuration does not discover external holds or establish a district-authorized identity, and it is not a server-side hold enforcement system.

## Owned Firebase assignment cleanup

The [operator CLI](../../../dev-tools/security/school_firestore_retention.cjs) and [pure planner/executor](../../../dev-tools/security/school_firestore_retention_core.cjs) cover one expired assignment with an existing, owner-matching parent in an explicitly selected owned project. They do not select a default project or add a student-facing deletion endpoint. Use an authorized district-controlled operator environment and installed server SDK; do not paste service-account keys into app/browser code.

The tool requests whitelisted metadata and update timestamps, not lesson/answer content fields. Its plan contains exact paths, owner UID and approval reference, so protect it as an administrative artifact. Receipts hash record paths and omit record bodies; identifiers and ticket references can still be sensitive.

Create a plan after the disposition and hold review. Substitute the exact approved identifiers and choose a new output file; existing plans/receipts are never overwritten:

```powershell
node dev-tools/security/school_firestore_retention.cjs plan --project YOUR_DISTRICT_PROJECT --app-id YOUR_APP_ID --session YOUR_ASSIGNMENT_CODE --owner-uid YOUR_HOST_UID --approval-ref YOUR_REQUEST_REF --holds-reviewed --out reviewed-plan.json
```

Inspect the complete plan and its printed hash. Apply defaults to a dry run and writes a receipt:

```powershell
node dev-tools/security/school_firestore_retention.cjs apply --plan reviewed-plan.json --reviewed-hash REVIEWED_SHA256 --confirm-project YOUR_DISTRICT_PROJECT --receipt dry-run-receipt.json
```

Before actual execution, stop the relevant writers, including host tabs/integrations. The tool cannot establish a complete IAM write freeze or discover every external legal hold. Execution requires the same reviewed hash/project and explicit `--execute --holds-reviewed --writers-paused` acknowledgments, with a different receipt file. Those acknowledgments are operator statements, not technical or legal proof. Plans expire after fifteen minutes; a changed, expired or incomplete plan requires renewed review.

The supported metadata hold conventions are `legalHold`, `retentionHold`, `holdUntil`, `retentionHoldUntil`, and `retention.hold/holdUntil`. Active or malformed holds block planning. A school using another hold system must review it separately; absence of these fields does not establish absence of a hold. Malformed assignment expiry, mismatched ownership and oversized/unknown scope fail closed.

The tool traverses the exact assignment's children, associated `session_assets` and the three signaling trees. It handles missing intermediate documents, deletes descendants before parents, uses each reviewed update timestamp as a server precondition, and reads back each result. Every deletion also reads and compares the original parent version inside the same server transaction, so a concurrent parent change or newly added hold cannot slip between a separate parent check and child deletion. A final rescan checks for new work before deleting the parent last and verifies the scoped result afterward. Actual writer shutdown remains necessary because discovering an arbitrary future child write cannot be made atomic by a parent-only check.

Partial failures, changed records, newly created records and unverified acknowledgments remain incomplete. A receipt saying `verified-empty-at-check` means the selected backend scope was absent at that check; it does not cover other stores or future writes. A crash leaves an `in-progress-unverified` receipt rather than a success claim. Previously orphaned sessions without independently established ownership require authorized admin review instead of unsafe automatic owner inference.

No client-side parent deletion or TTL configuration replaces this verification. Firestore does not automatically remove subcollections when a parent is deleted, and TTL is asynchronous. [Firestore deletion behavior](https://firebase.google.com/docs/firestore/manage-data/delete-data), [Firestore TTL](https://firebase.google.com/docs/firestore/ttl)

## Mailbox and Drive

Use the [mailbox deletion runbook](mailbox-deletion-runbook.md) for exact account/script/folder/file review. `end` and `closeall` clear live access state. `delpack` trashes located pack material; it does not delete completed submissions, delivered documents, Form responses, exports, or every duplicate.

Mailbox version 26 binds cached live access to the original six-hour deadline and coordinates close/prune/cache-rewarm changes. This prevents a cache hit or legacy refill from extending that access window. Cleanup remains request-driven. Manual Script Property editing does not instantly revoke an already validated cached envelope; use the authenticated lifecycle actions.

The [offline receipt reviewer](../../../dev-tools/security/check_mailbox_deletion_receipt.cjs) validates scoped operator observations without contacting Google or deleting anything. Trash never counts as permanent deletion. Unknown holds, changed/missing observations and unresolved external areas remain pending. Even a complete review packet does not assert that Google purged every retained copy.

## Validation and release

All 474 tests passed across 23 files, including the clinical/core/CLI/host checks and 297 mailbox/receipt regressions. The actual server SDK passed 37 loopback-emulator checks, including nested deletion, missing intermediate documents, version conflicts, no-op acknowledgments and a parent hold added immediately before deletion. The native Edge run passed 26 checks; it verified review/cancel focus, latest-draft preservation, confirmation, durable deletion, reload behavior and preservation of unrelated recovery data. Seven mailbox baseline/candidate controls demonstrate the old access-age problems and corrected remaining cache lifetime. All test records were synthetic.

Exact tests, synthetic emulator/browser evidence, source hashes and remaining limitations are recorded in [retention-deletion-validation.json](retention-deletion-validation.json). Only synthetic data was used. The server integration verifies actual SDK enumeration, timestamp types and version-preconditioned deletion against a loopback demo project; it does not test a district account or Google Canvas's provisioned backend.

Ship the changed clinical module, mailbox revision, generated/public copies and matching host integrity metadata together through the coordinated release. Existing mailbox deployments must be updated before their access-age behavior changes. Administrative tools must be reviewed and exercised by the district operator in the actual approved environment before a real disposition. No automatic rollout or production cleanup has been performed here.
