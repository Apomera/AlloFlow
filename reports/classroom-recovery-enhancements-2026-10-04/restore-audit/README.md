The native runner executes the complete editable `createHostHandlers` factory and its generated CDN counterpart. It evaluates the canonical host's actual `ALLO_WORKSPACE_RECOVERY` normalization, `invalidateLocalDataHydration`, and local-data hydration effect. Render values stay fixed; generation refs and setters remain stable. Storage reads, builder selection/unpacking/sanitization, and view navigation are controlled boundaries.

The corrected baseline has 20 distinct cases: eight controls pass and twelve failures establish missing workspace replacement ownership, delayed response/draft hydration after restore, obsolete builder success/rejection after replacement, and queued obsolete view navigation. The ordinary stored restore, rejected invalid/busy restore, and uninterrupted local hydration controls pass in both factories.

The runner now adds six cases (three per factory) without changing the original twenty assertions: authoritative clear releases an obsolete restore lock for a new restore; obsolete `finally` cannot release the newer request; and the actual host unmount invalidation call retires refs without lifecycle state writes. These additions await candidate/current receipts and are not included in the existing twenty-case baseline count.

`fixture-incomplete-results.json` is excluded: an initial fixture omitted host-only hydration status/revision setters and caused an unhandled async exception. Those controlled setters were added without changing any production bytes or assertions. `baseline-results.json` is the clean baseline receipt.

Run from the repository root:

```powershell
node reports/classroom-recovery-enhancements-2026-10-04/restore-audit/restore-ownership.cjs
```

`RESTORE_HOST`, `RESTORE_HANDLER_SOURCE`, and `RESTORE_HANDLER_MODULE` select the exact candidate/current inputs. `RESTORE_RESULT` chooses a new receipt destination; set it before candidate/current validation to preserve the baseline. All receipts include input SHA-256 values. This suite does not claim full App rendering, native file/IndexedDB integration, or mailbox delivery coverage.
