# School Store and Print Lab review — September 7, 2026

The local administrator presentation now covers the complete store and print workflow. Use [the presenter guide](school_store_admin_walkthrough.md). This review covers the local School Rewards package, its integration with Print Lab, and the root npm dependency graph. It is not a certification of a school's Google Workspace deployment or printer.

## Findings and fixes

| Finding | Change and verification |
| --- | --- |
| A student could accept a stale quote after staff changed its price or material. | Confirmation now requires a fingerprint of the reviewed quote terms, checked under the transaction lock. Missing or stale terms are rejected without reserving points. The portal sends the fingerprint and allows a fresh review after rejection. Repeated confirmation retains idempotency. |
| Drive sharing failures were silently ignored. | Setup and file creation now fail closed if privacy cannot be established and verified. Existing print folders are checked before reuse, including explicit viewers/editors and editor resharing. Regression tests inject failures and a shared folder. |
| Verification checked that a Drive file existed without rechecking its bytes. | Staff review now reads the bounded stored file and checks size, model association, SHA-256 and container format. Tests modify stored bytes and prove download and approval are rejected. |
| Staff lacked a direct private-file download control in the portal. | Staff and administrators can download the exact uploaded asset for local inspection. Students and cashiers are denied server-side. Downloads use a generic filename and do not expose Drive IDs or links. Quotes stay disabled while asset review is pending or rejected. |
| Valid ASCII STL files with a named closing `endsolid` line were rejected by the server. | Server validation now accepts the named terminator used by valid exports. The full browser walkthrough imports a named STL that passes Print Lab preflight, uploads it and retrieves identical bytes. |
| Record redaction and year rollover could overlap an unfinished store transaction. | Both now stop while a signed core transaction awaits recovery. Redaction also respects in-flight mail recipient locks. The recovery regression verifies no ledger or roster changes occur and the original award can resume. |
| Fulfillment did not fully match its referenced reservation. | Fulfillment now checks student, purpose type and request ID as well as amount and state before spending points. A mismatched reservation regression leaves the ledger unchanged. |
| Root npm audit reported five affected dependency packages. | Compatible updates were applied with package lifecycle scripts disabled. The subsequent root audit reported zero vulnerabilities. No direct dependency major-version upgrade was requested. |

Quote fingerprints are freshness checks, not credentials. Role checks still derive identity from the managed Google session. Print Lab visibility remains an administrator-controlled display setting; the backend independently checks roles and student ownership.

The review also exercised existing defenses for student record isolation, role restrictions, rejected HTTP mutations, signed transaction recovery, inventory reconciliation, duplicate requests, reserved balances, refunds, HTML escaping, spreadsheet/CSV formula safety, bounded uploads, and uncertain mail delivery. Existing automated checks use simulated Google services.

## Evidence

Final verification completed successfully: **530 tests across 17 files**, plus a **97-test integration run across 6 files** (38 of those checks overlap the release gate). The full Chromium demonstration passed with no page errors, no horizontal overflow at 390px, exact asset-byte comparison, and the expected balances and inventory. English/Spanish portal coverage is **934/934** catalogue entries. The scoped Git diff check reported no whitespace errors.


- `reports/school-store-review-2026-09-07/regression-results.json`: full release-gate results.
- `reports/school-store-review-2026-09-07/full-demo-results.json`: actual Chromium walkthrough with the real backend logic and simulated Google services.
- Screenshots in that directory: student reservation, staff queue ready for fulfillment, administrator integrity report, and student mobile screen.
- `reports/school-store-review-2026-09-07/npm-audit.json`: original dependency findings; `npm-audit-fix.txt`: remediation result.
- `tests/school_rewards_security_review.test.js`: new adversarial and interrupted-operation regression cases.

The demonstrated values are: 60 → 80 after recognition; 15 reserved; 70 total/55 available after a 10-point Notebook purchase; 55 after print fulfillment; 70 after the print refund. Notebook inventory changes from 5 to 4. The browser check also verifies exact asset bytes, rejects a cross-origin request to the local demo, reports no page errors and no horizontal overflow at 390px.

## Deployment boundaries

Source files and desktop deployment mirrors were updated locally. No live school deployment, Google sharing settings, student records, email recipients or printer configuration was changed. Deploy matching backend and portal files before testing real account access, receipts and physical fulfillment. School acceptance checks are in [the presenter guide](school_store_admin_walkthrough.md#before-using-real-school-records).

The new demonstration server binds only to `127.0.0.1`, keeps its fictional repository in memory, uses an explicit RPC allowlist, checks the Host and Origin headers, and limits request size. It is a local presentation tool and should not be deployed as the school's service.

No review can prove the absence of every bug or vulnerability. The recorded results establish the exercised local behaviors; separate desktop/service dependency trees and the live Google deployment are outside this root-package audit.

## References

The quote change follows the principle of binding confirmation to the transaction's actual terms in [OWASP's transaction authorization guidance](https://cheatsheetseries.owasp.org/Transaction_Authorization_Cheat_Sheet.html). Drive privacy checks use the documented sharing, editor and viewer controls for [Google Apps Script files](https://developers.google.com/apps-script/reference/drive/file) and [folders](https://developers.google.com/apps-script/reference/drive/folder).
