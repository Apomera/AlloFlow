# Save and adventure recovery improvements

Completed another focused K5 follow-up. Changes remain uncommitted.

## Behavior

- Project Save waits for its module and, when a password is entered, the crypto module. Save shows a spinner and busy state. Repeated pointer, Enter or voice requests cannot start duplicate pending downloads. Enter during text composition does not submit the filename.
- Cancel, a changed filename or password, another project, a changed learner or live class, and component teardown invalidate a pending save. The save helper also checks after a Document Builder snapshot, privacy confirmation and encryption, so closing the dialog during those operations prevents a later download.
- A password save now stops if the crypto API is missing or encryption fails. Previously, an unavailable crypto module let this path download plain JSON. Successful encrypted files retain the existing `.enc.json` format.
- Student progress save metadata updates after the browser accepts the download. Declined, cancelled, failed or blocked downloads leave that metadata untouched.
- Adventure setup and dice completion wait for their modules. Changed stories, turns, settings, roles or classes invalidate their pending requests. Duplicate setup clicks open one setup; only the latest pending dice completion runs. Image-only refreshes can still complete the current turn.
- Adventure restart checks its original context again after its confirmation dialog, before clearing the current story. Old callbacks invoked after teardown do nothing.

## Verification

- **202 targeted checks passed across 11 files** in `final-serial-tests.json`. This includes 73 checks in the two new maintained files: `tests/k5_save_adventure_readiness.test.js` and `tests/project_save_cancellation_encryption.test.js`.
- Three full local app workflows passed: plain project download; Cancel during a delayed crypto load followed by an explicit encrypted retry; and a crypto connection failure followed by a successful retry. Both encrypted downloads were decrypted with the real crypto module and matched the saved lesson. Each flow had no page exceptions or unhandled rejections. See `full-app-results.json`.
- Chromium screenshots of the Save busy state and recoverable encryption failure were inspected: `full-app-save-loading.png` and `full-app-encryption-failure.png`.
- Six intentional regressions failed at their intended assertions: stale project Save, stale adventure setup, stale dice completion, plaintext download with unavailable encryption, download after Cancel, and restart after the story changed during confirmation. Isolated candidates were used; shared sources were never mutated. See `proof-results.json`.
- All three host copies parse and match. Phase K, Adventure Handlers and Crypto public mirrors match. Both edited modules match their builders. Source outside the two edited module handlers is preserved. The validation selection and identity inputs were extended without removing coverage. All 15 audit checks passed, and zero declared inputs changed during final verification. See `final-audit.json`.

### Raw attempts retained

The parallel final run recorded 201/202 passes. Its existing synchronous Adventure build check took 24.9 seconds and exceeded the 15-second test budget. The complete serial recheck used a 60-second budget and passed all 202 checks. Earlier reports retain an encrypted-file test that read a nonexistent `settings.inputText` field; the corrected test checks the actual history schema and decrypted lesson title.

Initial browser attempts used an ambiguous role selector, then tried importing a project while crypto was deliberately delayed. The final harness selects `role_teacher` and seeds the supported offline history snapshot with the actual idb-keyval vendor before the app restores it. `full-app-results-initial.json` and `full-app-results-second.json` preserve those unsuccessful attempts; their timeouts are not counted as verification.

These are targeted local checks. Live AI rehearsal, the remaining synchronous helper caller review, and the normal shared-tree release validation remain separate work.

## Evidence and recovery

`completion.json` summarizes the result. `before/` and `before.json` preserve the working-tree inputs before these changes. `own-changes.patch` compares those existing files with the result; the two new maintained tests are also present in `tests/`.

The verification-only shell, full-app browser harness and isolated proof candidates are under `C:/tmp/alloflow_dispatch/wave2/startup-recovery-2026-09-29/`. The local preview was stopped after verification. No normal app build, Git staging, commit, push or deployment was performed.
