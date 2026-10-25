# Sensitive features, passwords, encryption, and recovery

October 24, 2026. This preserves the initial read-only investigation and proposed access design. Its descriptions of plaintext clinical storage and proposed controls describe the application before implementation. The user subsequently approved the work; see the [protected clinical workspace follow-up](protected-clinical-workspace-followup.md) for the implemented behavior, migration coverage, and remaining deployment requirements.

## Recommendation

Keep ordinary lesson preparation, examples, and student activities usable without an educator password. Require protection at the point a user enables real student-record handling. For a district deployment, that means approved storage and providers, verified staff authorization where records or services are shared, encrypted persistence, and a usable recovery arrangement. An optional device access code can add shared-device friction.

| Use | Proposed access and storage behavior |
| --- | --- |
| Public lessons and synthetic examples | Available without a password. No student records are needed. |
| Student activity | Enter through the district's learner route. Server permissions limit the learner to authorized activities and records. An educator password is unnecessary. |
| Clinical reports, behavior records, identifiable assessment data | Require approved protected-workspace setup before real records are entered, imported, saved, or sent. Keep synthetic examples available. |

For Gemini Canvas, a local password alone would not establish approval to process student records. Google's guidance warns about sensitive information and public multi-user app data. PPS account/device restrictions are useful controls, but the exact public-link, account, storage, sharing, and external-service behavior still needs verification. This is a platform warning, not evidence that a particular AlloFlow record has been exposed. [Google Canvas safety guidance](https://support.google.com/gemini/answer/16419134?hl=en)

## What the application actually protects

The educator code and saved-work password are separate mechanisms. [DeviceAccessCode](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/device_access_code_module.js:1) explicitly describes its role as UI friction. It stores a salted password verifier and a browser-local retry delay. The page's exposed service can replace that verifier, and a person controlling the browser can alter local state. This bypasses a navigation restriction; it does not break encryption or decrypt a locked vault. [TeacherGate](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/ui_modals_source.jsx:1426) calls this service before changing the UI.

The separate [AlloCrypto implementation](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/allo_crypto_module.js:190) performs authenticated AES-256-GCM encryption. New password envelopes use PBKDF2-SHA256 with 600,000 iterations, random salts and IVs, and authenticated context. Encryption strength also depends on password quality, key custody, the integrity of code running on the page, and whether plaintext copies exist. Reviewing algorithms and functional tests is not a cryptographic certification. [OWASP cryptographic storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

The optional recovery vault encrypts saved workspace snapshots, including their content and titles. Some metadata remains visible. It does not automatically encrypt every browser store, download, preference, or external request. In particular:

- BehaviorLens writes workspace, ABC, and observation JSON through its own browser-storage path. Its roster and workspace keys do not establish verified staff identity. [Serialization](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_workspace_module.js:1054), [roster loading](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:29081).
- Dynamic Assessment saves JSON through its own local-storage path. [Persistence](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dynamic_assessment_module.js:3247).
- Report Writer defaults to session-only use. Its optional local persistence saves readable clinical JSON. Password-protected project export is a separate choice. [Default](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/report_writer_module.js:3268), [persistence](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/report_writer_module.js:4158).

These independent plaintext copies are a priority gap. Encrypting a recovery snapshot does not protect another readable copy of the same record.

A student choosing teacher mode in a fresh browser does not automatically obtain another teacher's browser storage or decrypt that teacher's vault. A shared browser profile/origin, an already unlocked staff session, or a server endpoint that trusts only UI state presents a different risk. Shared records and teacher-only server operations need server-side permission checks on every request. [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## Recovery and work preservation

The vault already supports an optional offline recovery code with 160 random bits and a transcription checksum. It saves a recovery-wrapped encryption key, never the readable recovery code. Recovery verifies the key and atomically replaces the password wrapper while preserving encrypted records. This is a useful foundation for a setup flow. [Recovery generation](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/allo_crypto_module.js:371), [recovery operation](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/allo_device_vault_module.js:521).

Once the vault is locked, a lost password without that recovery key cannot decrypt it. An already unlocked workspace still offers a chance to preserve accessible work before locking. Exporting the encrypted backup while locked preserves ciphertext; erasing the store deletes the records and is not a recovery method. Educator-code reset should remain independent of this data encryption.

Manual vault locking currently saves the workspace before dropping the key and clearing working state. If saving fails, it leaves the tab unlocked and shows an error, avoiding silent work loss. No automatic idle lock was found in the inspected integration; going into the background schedules a save. Changing the password does not revoke keys already held by unlocked tabs. [Manual lock](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/host_handlers_source.jsx:3749), [password-change disclosure](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/host_handlers_source.jsx:9300).

A proposed protected-workspace setup should therefore:

1. Explain which records and copies will be protected before asking for a password.
2. Create an encrypted backup and offer the recovery key, with confirmation that it has been stored securely under district policy.
3. Verify encryption and recovery before replacing existing readable records. A failed save or migration must preserve the original and show the next recovery action.
4. Keep ordinary tools available if setup is deferred, while preventing unapproved sensitive persistence and transmission.
5. Make idle locking save-aware, clear sensitive working state, and define behavior across tabs. Saving failure needs a visible way to preserve work without silently discarding it.
6. Keep access-code reset, account recovery, vault recovery, and record deletion clearly separate. Avoid a universal password or recovery secret embedded in the application.

## Implementation priority and acceptance checks

First inventory each sensitive module's full create/import/save/export/AI path, including legacy browser stores. Then provide a shared encrypted record boundary for the clinical modules and verified staff authorization for shared services. Add the setup flow and optional idle locking after backup/recovery behavior is proven. A feature classification and explicit real-data choice are more dependable than trying to recognize all personal information from text automatically.

Acceptance checks should demonstrate that changing UI role or resetting the educator code cannot decrypt protected records; learner accounts cannot retrieve staff records; the modules leave no unintended plaintext clinical copies after successful migration; cancellation, storage quota errors, corrupted data, and wrong passwords preserve recoverable work; recovery works from an independent backup; and public Canvas links do not gain staff authority merely by selecting teacher mode.

The current password and encryption paths were inspected read-only. All 67 targeted tests passed across eight files covering the educator code and launch gate, cryptographic envelopes, recovery-key entropy, vault recovery and retention, application lock/recovery integration, and encrypted-export cancellation. These verify existing functional safeguards; they do not establish encrypted coverage for the separate clinical stores. Exact files and hashes are recorded in [password-vault-review-validation.json](password-vault-review-validation.json).

District policy, Canvas approval, provider terms, and server identity requirements from the [original audit](report.md) remain open.
