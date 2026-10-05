`native-recovery.cjs` is a bounded native Chromium workflow. It does not boot the complete App. Root runs it serially after integrating the latest vault caller guards.

Four cases cover normal protected unlock and backup staging, older backup completion after a newer selection, actual close plus explicit workspace invalidation during file handling, and an actual unlock whose record decryption completes after lock. Assertions check exact current state, private-work visibility, lock feedback, native picker cleanup and encrypted persistence.

The generated handler factory and canonical Recovery/invalidation/dialog-setter/close/read/secret-clear closures are evaluated without rewrites. FileReader, File/DataTransfer, IndexedDB and Web Crypto remain native; the real vault controller encrypts a synthetic workspace into a native IndexedDB CAS repository. Only module-loader order and one record-decrypt completion are held. Diagnostic file/close controls and an injected active-workspace clear are outside full App rendering. The test uses the crypto module's permitted 10,000-iteration test configuration; it does not change production defaults.

Run from the repository root:

```powershell
node reports/classroom-recovery-enhancements-2026-10-04/native-recovery.cjs
```

Candidate/frozen inputs can be selected with `NATIVE_RECOVERY_HOST`, `NATIVE_RECOVERY_HANDLERS`, and `NATIVE_RECOVERY_HANDLER_SOURCE`. Set `NATIVE_RECOVERY_RESULT` to a fresh report path for each attempt. Success and failure receipts both include raw input SHA-256 values and browser page errors. The author has not executed Chromium; acceptance requires root's receipt.
