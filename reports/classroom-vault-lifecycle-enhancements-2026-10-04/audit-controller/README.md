# Controller lifecycle audit

`reproduce.cjs` executes the actual current host getter and actual production Vault, Crypto, and integration modules. Crypto operations run through native Node Web Crypto with the existing minimum 10,000-iteration synthetic configuration. A gate holds only a completed native operation or a completed repository read. The report contains no key, password, recovery code, private payload, or ciphertext bytes.

Expanded `baseline-expanded.json` preserves 44 passing controls and 27 failed expectations across 71 distinct assertions. Each run records exact input SHA256s; fixture expansion adds controls and seams without altering production files. The root executes and retains separate baseline/candidate/final receipts for the remaining fixtures.

Confirmed failures:

- Concurrent first getter calls from two fixed host render closures share stable refs but construct two different controllers. The first caller receives a controller that is no longer current. A current credential action can therefore be silently retired by the prior host controller identity check.
- All eight key-install branches can replace the local null key after `lock()` while actual async crypto work finishes: unlock, recovery, password change, enable, backup import, key rotation, key removal, and already-removed key removal.
- A password failure already in flight before lock and a later correct unlock clears the newly accepted key.
- A failed `_requireUnlockedKey` verification from an older read clears a newly accepted key. Its successful late verification returns the current null key rather than a captured owned key, producing a record-corruption error instead of a lock error.
- The already-enabled enable branch can start a nested fresh unlock after its older initial storage read was retired by lock.
- An older host loader can overwrite a controller cached while its dependencies were pending. Initial loader calls do not coalesce, though current failure retry works.

The preservation controls include accepted durable CAS mutations while the local tab stays locked, reopening those committed mutations with their current password on a separate controller, ordinary wrong-password rejection, ordinary unlock/lock/later unlock, no-write already-removed key behavior, and shared initialization failure cleanup/retry.

Recommended contract: a monotonically increasing controller generation owns local key publication and clear. Every credential operation captures a fresh generation; lock advances it and clears the local key. Successful CAS mutations retain their persisted result and existing success metadata after local key publication is retired. Plain `unlock` has no durable change and should report `VAULT_LOCKED` when its key cannot be installed. Captured key verification checks both generation and key identity before returning or clearing a key. Disable and erase also own their asynchronous null publication. This is a same-controller lifecycle contract and does not revoke another tab's unlocked key.

The host getter should share one stable in-flight request ref across renders, respect a cached controller after dependencies finish, and clear only its own pending request on success or failure. This retains retry after failed loading.

Scope limits: no browser, Vitest, full App shell, cloud service, or other-tab revocation is exercised. The visible Lock button is disabled while a credential action is busy, so direct controller lock races establish the lower-level API contract; root's native host workflow supplies integration reachability. Captured record decryption already in flight is not broadly revoked by the fixture: prior host sync request and status checks suppress stale plaintext publication after lock.

Additional authored fixtures:

- `clear-ownership.cjs`: 27 checks for completed disable/erase CAS cleanup versus a newer accepted protection session, normal current password-error policy, and overlapping credential attempts without an intervening lock.
- `stale-head.cjs`: 18 checks for an already-captured old repository head versus a newly accepted native-encrypted backup with a different data key. The former can otherwise invalidate the current key before `_requireUnlockedKey` captures its own generation. The final design passes method-entry generation into key verification in all five callers.
- `sync-session.cjs`: 58 checks across actual source handlers and the complete generated factory. Real status/decrypted/head continuations are retired by a committed password change or different-key backup import. A current corrupted record still locks and surfaces its original error. Normal and no-generation compatibility controls remain.

Final source review accepted local generation ownership, retained CAS return semantics, all five pre-read generation captures, the optional-generation key-check compatibility contract, the host session-generation sync predicate, and coalesced controller initialization. Earlier synchronous API validation errors may retire a pending older credential operation because a generation begins at method entry; host handlers validate before invoking these methods. A concurrent plaintext key check may be retired when a credential operation begins while its old key remains present. This is deliberate current-session ownership, and the host sync generation predicate suppresses its stale catch before it can lock the newer operation.

Fixture correction: the first `sync-session.cjs` seed omitted `workspace.history`. Actual host `ALLO_WORKSPACE_RECOVERY.normalizeSnapshot` requires that array even when `sourceTopic` already contains a meaningful draft, so the four ordinary/legacy content checks failed in both the original and improved implementations. The 54-pass/4-fail final receipt and earlier baseline receipt remain preserved. Exact original fixture bytes are archived in `sync-session-before-valid-workspace.cjs`. The repaired seed adds only `history: []`, representing a supported draft-only saved workspace; all 58 assertions and existing gates remain unchanged. The single newest snapshot is always retained by the actual host normalization policy, so a different system clock does not explain these failures and no clock or timeout was changed. Root executes the corrected baseline and final with fresh receipt names.
