# Protected clinical restore boundaries

October 26, 2026. Continued local cybersecurity work for Gemini Canvas / Portland Public Schools, Maine K–12. This pass covers the protected clinical backup importer and its destination checks. The separate security chat retains ownership of CI fixture repairs and release reconciliation. No real records or production services were accessed.

## Reproduced findings

An earlier restore could undo a later deletion. Restore checked that the destination was empty, verified the backup, then imported using a newly read destination revision. The generic vault already refused to replace a nonempty store; that protection worked. However, a deletion completed during verification left an empty deletion marker. The pending restore accepted the new marker and repopulated the deleted store without a new review of that destination. Tests reproduced this with both the in-memory repository and two actual pages sharing native IndexedDB and WebCrypto. The browser fixture deliberately omits cross-window notifications so correctness cannot depend on delivery of a notice.

The importer also reused the caller's mutable backup object after asynchronous verification. A synthetic test changed the original object during verification; the previous implementation could persist a different non-clinical vault before the later clinical-format check rejected it. The file-picker path parses a private object, so this finding demonstrates an exposed service-boundary weakness, not a demonstrated external exploit through a file upload.

Finally, clinical record-type checks ran after generic vault cryptography. A 9,512-byte synthetic backup with 20 unrelated records triggered one key unwrap and 42 record decryptions before clinical rejection. Existing storage was preserved in that case. This is unnecessary processing of invalid input, not a password or encryption bypass. Existing PBKDF2 limits and ciphertext limits remain in place.

Failure tests also found that a committed import could leave the interface reporting a new workspace if its acknowledgement, or the next read needed to open it, failed. The saved vault survived, but the service did not offer the correct unlock/recheck path. This was a recovery-state problem rather than a demonstrated loss of the encrypted records.

## Changes

Restore now captures the original destination's revision and complete value. The connected importer checks that destination before use and commits with its original atomic revision. A newer setup, deletion marker or other destination change rejects the earlier restore. A fresh, explicit restore begun after deletion still works against the newly reviewed empty destination.

The selected backup is checked and copied synchronously before the first asynchronous repository operation. Verification and import consume the same detached copy. The clinical envelope must contain its setup record and at most four unique known record IDs; missing empty feature buckets remain compatible. Unrelated, duplicate, excessive or malformed record lists are rejected before key derivation or record decryption. Authentication and decrypted-content validation still follow; the preliminary shape check does not establish authenticity.

Restore also refuses to replace active or staged protected work. Existing encryption, password/recovery requirements, namespace and record formats, the Canvas real-record gate, and external-AI policy remain unchanged. A conflict preserves the current destination and reconciles the service state. Import acknowledgements and subsequent opening reads share failure recovery: the service reads back the destination without repeating the write, leaves a saved vault locked, or offers “Recheck protected storage” if that read is unavailable. An uncertain result is not evidence that the write was rolled back.

## Validation and delivery

The final combined run passed **110 tests across 11 files**, with no failures or skips. It includes clinical setup/migration, lock/cancellation, hydration, deletion, restore target races, malformed backup and input mutation cases, plus shared vault and device-repository regressions. A behavioral React test verifies that the recovery action rechecks storage without issuing another write. **14 native Edge checks passed**, and both the baseline and final browser runners exited successfully.

Lost-acknowledgement tests verify that a committed restore is found and left locked, that an unavailable reconciliation read preserves the original error and blocks record access, and that an explicit storage recheck finds the saved vault without repeating the import. A successful recheck clears the obsolete error.

The [validation record](clinical-restore-validation.json) records baseline failures, final source hashes, test results, browser checks and scoped host delivery updates. Browser pages and values are synthetic, external page requests are blocked, and the fixtures use the minimum supported PBKDF2 work factor to bound test time. Production defaults were not lowered. This is not a test of district-managed Canvas browser policy or real student-record workflows.

Only the protected-workspace module and its public mirror changed in production code. Its approved hash/size and loader cache string are updated in the three host copies with reversible-edit checks, complete-host parsing and checks against the actual embedded policies. Other assets and embedded policy sources are preserved. The pre-existing canonical policy discrepancy remains a separate release issue; no broad rebuild, commit, push or deployment is included.

Before relying on the fixes, release matching reviewed module bytes and host approvals, reconcile release policy, and test the approved Canvas workflow with synthetic records. Copies of an older application retain their older behavior. Separately retained backups can still be restored by a person holding the required secret; deleting one connected store does not erase backup files or establish district retention compliance.
