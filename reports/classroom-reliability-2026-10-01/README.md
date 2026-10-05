# Classroom save, reopen and student delivery reliability

Focused local implementation and acceptance completed on October 3, 2026. The final candidate passed **211 unique application checks**, both isolated Chromium journeys, and the reader/host consistency checks. No application build, commit, push or deployment was performed for this work.

The [machine-readable summary](validation-summary.json) reconciles unit totals, native browser results, declared source fingerprints and separately captured React runtime-library hashes. `summarize-validation.cjs` creates this summary from the retained evidence and rejects mismatches.

## Changes

- Integrated twelve guarded audio changes into all three source hosts and synchronized the audio-service and reader loader pins (`7f606aad` and `6ba838c8`). Captured audio is tied to the current resource/revision and persistence ownership; obsolete capture/write work cannot report a current save. [Host patch](host-0.patch), [integration receipt](host-integration-applied.json), [pins](loader-pins.json).
- Added storage-disabled and Canvas policy dependencies to the actual history autosave effect. Changing policy cancels pending work and prevents an obsolete write from announcing a successful save; re-enabling storage saves the unchanged history. [Policy patches and receipt](history-policy.json), [mounted production-effect tests](../../tests/classroom_history_save_policy.test.js).
- Fixed repeated recovery saves deleting valid images/audio after an earlier session-only blob or quota omission had marked the snapshot `text-only`. Only an explicit teacher removal carries that blanket removal policy forward; real quota fallback still reduces media after a rejected write. Historical labels/schema remain unchanged, and already-lost media is not reconstructed. [Guarded preparation/apply evidence](release/media-preservation/), [current-source preservation tests](../../tests/report_storage_mixed_recovery.test.js).
- Applied three bounded Evolution replacements to canonical/public runtime partners: complete offspring reports remain hidden until the offspring step, returning to earlier steps hides them again, and terminal states show existing review guidance. Historical playback and the survivor cohort remain intact. [Evolution evidence](evolution/README.md).

## Evidence

| Final checks | Result | Evidence |
| --- | --- | --- |
| Host audio, autosave cancellation, reload, media preservation and writer behavior | 61/61, no skips | [Final unit report](host-save-tests-complete-20261003.json) |
| Storage acknowledgement/recovery and adapter bootstrap | 24/24, no skips | [Final storage report](storage-ack-complete-20261003.json) |
| Evolution mounted reveal cases and existing regressions | 6/6 + 120/120, no skips | [Mounted cases](evolution/current-integrated-unit.json), [regressions](evolution/current-regressions-unit.json) |
| Reader compilation/output, host syntax, module parity and loader pins | Passed | [Reader verifier](reader-release-complete-20261003.json), [host consistency](current-consistency-complete-20261003.json) |
| Teacher save/reopen, student delivery, navigation, playback, response reload/submission and storage isolation | Passed | [Chromium report](accessibility/report.json) |
| Native device bridge consent, two committed recovery saves and fresh second-origin restore | Passed | [Bridge report](accessibility/bridge-report.json) |

The policy baseline failed **six of nine** mounted cases, exposing obsolete saves remaining eligible after policy changes. The media baseline failed **two of eighteen** cases, exposing valid media loss on a later save. These failures are retained in [policy baseline](history-policy-baseline.json) and [media baseline](media-preservation-baseline.json); the final eighteen mixed-recovery cases run unconditionally against production source. Repeated baseline/candidate runs and the six report-helper Node tests are excluded from the 211 application checks.

The classroom browser finished all **22 recorded clips** through native `ended` events with zero synthesis calls; both student responses survived reload and reached teacher review. Native teacher IndexedDB contained zero student-work records. Reflow passed at 320 and 1280 CSS pixels. It uses production views/writer/host helpers, a supplied IndexedDB adapter, a loopback mailbox and synthetic non-silent audio. The bridge uses real nested cross-origin messaging and IndexedDB with intercepted fixture bytes under synthetic origins. These boundaries do not establish a real Google Canvas session, hosted service delivery, semantic narration or physical speaker output.

## Exact candidate and remaining release work

The [final before receipt](release/candidate-before-complete-20261003.json) and [final after receipt](release/candidate-after-complete-20261003.json) cover **76 selected inputs and 14 declared parity pairs**. All selected inputs and HEAD remained unchanged; declared mirrors matched. Candidate SHA-256 is `5b94e0e0fb9050550a5e08c42adca2d93c9bad833b68a972d7e4d407d96121b2`, at HEAD `b86093eb51350a2386e08f229ebd24254ef1a9ac`. Earlier receipts containing translation drift and failed fixture attempts remain historical evidence; [execution notes](accessibility/EXECUTION-NOTES.md) explain their corrections.

Runners are [classroom browser acceptance](accessibility/acceptance.cjs), [native bridge acceptance](accessibility/bridge-acceptance.cjs), [host consistency](verify-current.cjs), `dev-tools/check_reader_release.cjs --json`, and the [capture/compare helper](release/candidate_receipt.cjs). [Release validation instructions](release/README.md) retain the receipt command contract and verifier limits.

**Current global CI, manual screen readers, native browser zoom, the complete hosted app, physical-device restart, exports and installer/released bytes remain unverified.** The automated native zoom attempt was blocked because browser metrics did not change; it is not counted as passed. Historical CI failures do not establish the current candidate's CI status.

Changes remain local because the host/pin integration depends on uncommitted coordinated reader/audio module contracts, while whole-file staging would include other owners' changes. The [commit-scope assessment](release/commit-scope-assessment.md) records the concrete prerequisites and owned patch files. The shared index and concurrent work were preserved.
