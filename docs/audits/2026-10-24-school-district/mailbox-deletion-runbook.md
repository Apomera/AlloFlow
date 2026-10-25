# Mailbox retention and deletion runbook

October 24, 2026. This procedure covers an approved school-owned Apps Script mailbox, its Drive files, and the copies that require separate review. The district data owner sets the retention schedule and decides whether a request is subject to a hold. The offline review tool below makes no Google requests and performs no deletion.

## Establish the scope

Use the district-approved account and script deployment. The script's admin token is a bearer capability; it does not prove district employment. Keep that token, join secrets, participant credentials, student names, and document contents out of the deletion packet. Record an opaque request reference, school account reference, script ID, and the exact mailbox and delivery folder IDs. A folder name alone is insufficient because Drive can contain folders with the same name.

Review the hold status before planning any deletion. Preserve held material and treat an unknown hold status as unresolved. Do not set a retention period merely because the mailbox's live access window is six hours or because a pack has an expiry date. Those are access controls, not a complete school records schedule.

## What the current actions remove

| Action or store | Actual boundary |
| --- | --- |
| Admin `end` or `closeall` | Removes the live marker, cached join capability, and known ephemeral session/message/signaling cache. It does not remove Drive files. |
| Expired live marker | Version 26 validates an absolute six-hour access deadline. Cold and legacy caches can only be rewarmed until that original deadline. Invalid, future, and expired markers fail closed. Cleanup occurs on lookup/pruning or close paths; no scheduled purge is established. |
| Manual Script Property deletion | Does not instantly revoke a previously validated cached envelope. Use the authenticated `end`/`closeall` path; do not treat editing a property as a complete session deletion procedure. |
| Admin `delpack` | Moves the located pack manifest, its declared chunks, and declared activity sidecars to Drive trash. It does not remove completed submission JSON, delivered documents, downloaded files, or all copies of a pack. |
| Completed submissions | Separate `submission-…json` files in the mailbox folder. The payload's `mailboxReceipt.sourceKind/sourceId` identifies its source; a file name alone is not a reliable pack/case index. Reviewing that relationship must occur in the approved account, not in the offline packet. |
| Delivered Docs, Slides, Sheets, PDFs and Forms | Separate items in the delivery folder, except an unsuccessful move may leave a created Form in My Drive. Responses, linked Sheets, copies, downloads, revisions and recipients must be reviewed separately where applicable. |
| Admin recovery note | A credential-recovery file, not a student submission. Removing it does not rotate the Script Property admin token. For offboarding, resolve active sessions and rotate credentials using the existing admin workflow before deciding which recovery copies to retain or remove. |

Source: [mailbox lifecycle and Drive operations](../../../apps_script/session_mailbox/Code.gs), [mailbox setup](../../../apps_script/session_mailbox/README.md).

Version 26 keeps normal polling on a validated cache envelope, without a Script Properties read on every poll. Cache rewarming and open/close/prune mutations share a script lock so a delayed refill cannot restore a capability after a cooperating close or code reuse. Requests already admitted cannot be unsent. The reviewed script must be redeployed before these source changes govern an existing mailbox.

## Review and carry out an approved request

1. Identify the exact account, deployment and folder IDs. Inventory the specific live session codes and Drive file IDs included in the request. Check for duplicate pack files, orphan chunks/sidecars, complete submissions, delivered documents, Form/response stores and items outside the usual folder. An outside-folder item needs a separately approved scope or recipient review; do not relabel or move it to force it into this packet. Do not delete folders or files solely by a name prefix or age.
2. Resolve holds and the district's retention decision. Record each item's current modification time and parent folder. If the item changes, stop and obtain a new review. Approve the desired action for each item explicitly: retain, end session, trash, or permanent deletion. Ending a session and deleting its related files are different actions.
3. Use the mailbox's existing authenticated admin action for session closure and pack trashing, or the authorized Drive/admin interface for the reviewed file IDs. Keep the actual capabilities outside the packet. Recheck identity, parent and modification metadata immediately before a manual action. The offline tool cannot prevent an operator from deleting the wrong live file.
4. Record observations per item. A failure, changed item, inaccessible file or missing outcome remains incomplete. Do not infer that a file was permanently removed because a pack endpoint replied `ok`, a sharing link stopped working, or an item moved to trash. A `not-found` observation describes that account's view; it is not proof of provider purge.
5. Review Drive trash, Vault/provider retention, exports/backups and recipient copies as separate areas. Retained material needs a recorded policy/hold disposition; unresolved areas remain pending. Store the reviewed packet and any district authorization in the approved audit location. The packet can contain sensitive resource identifiers even though it excludes student content and credentials.

Drive trash and permanent deletion are different states. Google documents a 30-day trash period, and Workspace administrators can have a recovery window after trash is emptied. Vault holds and retention rules can preserve data even after user deletion. The district administrator must establish the applicable outcome; this procedure does not bypass a hold or promise immediate physical erasure. [Drive trash and deletion](https://developers.google.com/workspace/drive/api/guides/delete), [Workspace administrator recovery](https://knowledge.workspace.google.com/admin/drive/recover-deleted-files-and-folders-for-drive-users), [Vault retention and holds](https://knowledge.workspace.google.com/vault/retention/how-retention-works).

## Offline evidence review

The [synthetic plan](mailbox-deletion-examples/synthetic-plan.json) and [synthetic receipt](mailbox-deletion-examples/synthetic-receipt.json) intentionally start with unknown holds and pending outcomes. They are examples, not permission to delete files.

```powershell
node dev-tools/security/check_mailbox_deletion_receipt.cjs docs/audits/2026-10-24-school-district/mailbox-deletion-examples/synthetic-plan.json docs/audits/2026-10-24-school-district/mailbox-deletion-examples/synthetic-receipt.json
```

For a real approved packet, review the plan, then compute its binding digest:

```powershell
node -e "const fs=require('fs'),v=require('./dev-tools/security/check_mailbox_deletion_receipt.cjs'); console.log(v.planDigest(JSON.parse(fs.readFileSync(process.argv[1],'utf8'))))" approved-plan.json
```

Place that digest in the receipt's `planSha256` field. A plan change requires a new review and digest. A digest binds the two files; it is not a digital signature or evidence that an authorized person approved them.

The tool accepts only bounded known fields and exact resource/folder scope. It does not detect a name or credential disguised as an opaque identifier. Held or unknown-hold items cannot be planned or reported as deleted; modification changes cannot receive a success claim. It rejects extra or duplicate outcomes and reports missing outcomes as incomplete. It distinguishes trash, reported permanent deletion, session closure, retention, and unresolved external copies.

Exit code 0 means the listed operator observations form a complete review packet. Exit code 1 means unresolved observations or hold reviews remain. Exit code 2 means invalid or unreadable evidence. Even a complete packet reports `providerPurgeVerified: false` and `allCopiesDeleted: false`: the tool did not contact Google, authenticate the reviewer, inspect a file, or verify external/provider copies. Retained holds and policy copies remain visible in its counts.

## Other stores remain separate

This procedure does not clear Canvas/browser storage, protected clinical buckets, workspace recovery, Firebase, Desktop LAN state, local project files, clipboard/print copies, or AI/support-provider records. Use the [data flow inventory](data-flow-inventory.md) to assign a separate verified outcome to each enabled store. Deleting the script or its mailbox folder is not a substitute for that review.
