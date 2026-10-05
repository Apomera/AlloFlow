# Classroom reliability follow-up — October 3, 2026

Four bounded product improvements are applied locally. The extended native bridge journey passed; the coordinator's combined current-source unit, acknowledgement/bootstrap, learner-browser, syntax and candidate-receipt checks are still pending in this draft. Nothing was built or deployed for this follow-up.

<!-- Coordinator: replace pending rows and candidate fields from actual final outputs. Do not count repeated baseline/candidate runs as additional unique checks. -->

## What changed

- **Learner drafts use strict, verified storage with current ownership.** Autosave and retry honor the actual role/session/storage gate. Delayed restore preserves current per-resource edits, an empty restore schedules an already-made edit, failed reads leave saving blocked for retry, and Saved requires an explicit strict write plus matching strict local read-back. Explicit workspace resets retire old reads/writes. Final v2 gives learner work its own generation ref, so ordinary history hydration cannot strand an otherwise eligible save. [Final v2 patch](student-response-v2.patch.json), [14-case mounted fixture](student-response-v2-lifecycle.test.js), [initial audit](LEARNER-PERSISTENCE-AUDIT.md).
- **Removed classroom resources stay removed while old transfers finish.** Removal marks only transfer records that already exist; asynchronous success/failure must still own the captured record. Removed old RIDs are retired without reopening content, while a deliberate new-RID re-share remains possible. Partial collection and failure/replay preserve removal markers. Each old transfer remembers at most 256 distinct removal IDs; on overflow it is conservatively retired even if its eventual decoded resource is unrelated. Fresh transfers remain eligible. This bounds marker entries, with the existing TTL and cache limits; it does not add a global resource blacklist or independent pending/failure count caps. [Receiver review](RECEIVER-LIFECYCLE-REVIEW.md), [guarded replacements](receiver/replacements.json), [8-case fixture](resource_receiver_lifecycle.test.js).
- **Teacher media-removal intent survives a full omission log.** At the 500-entry bound, stripping retains one actual `user-remove-media` entry, and imported over-cap manifests preserve a later explicit entry during normalization. A following autosave cannot mistake that intent for historical session/quota omissions and reinsert still-live media. The schema/log limit and real quota fallback remain unchanged. Client/bridge fetch versions advance through the existing query contract to `ds6-media-removal-intent`; all three host loaders and both client copies are synchronized. [Media review](MEDIA-INTENT-REVIEW.md), [apply evidence](media-intent/applied.json), [16-case fixture](recovery_media_intent.test.js).
- **Native recovery accepts the same meaningful drafts as the host.** History-empty Word Sounds, units, profiles, project and guided-progress work now survives native atomic upsert and normalization. Existing text/topic/builder acceptance, empty/metadata-only rejection, version checks, Compact aging and pinned/newest preservation remain intact. Only five native draft predicates changed across the root/public client and canonical bridge. [Schema review](DRAFT-SCHEMA-REVIEW.md), [apply evidence](draft-schema/applied.json), [20-case fixture](recovery_draft_schema.test.js).

## Current evidence

The new fixtures contain 58 distinct desired cases: learner v2 14, receiver 8, media intent 16 and native draft parity 20. Final current-source totals must come from the combined coordinator result, including its selected existing regressions; isolated/repeated runs are not added to that total.

| Validation | Status in this draft | Evidence |
| --- | --- | --- |
| Combined current-source fixtures and existing regressions | Pending final coordinator result | [Selected suite](followup.vitest.config.js) |
| Native acknowledgement/CAS/bootstrap checks | Pending final coordinator result and exact command | Coordinator to link final output |
| Learner Chromium journey with actual initial hydration and verified writer | Pending final coordinator result | [Runner](accessibility/acceptance.cjs) |
| Extended native bridge journey | Passed at 15:16 UTC | [Actual report](accessibility/bridge-report.json), [runner and scope notes](accessibility/BRIDGE-ACCEPTANCE-NOTES.md) |
| Three-host syntax, canonical/public parity, loader pins and reader verifier | Pending final coordinator result | [Host verifier](verify-current.cjs), `dev-tools/check_reader_release.cjs --json` |
| Before/after selected-input and HEAD stability | Pending final coordinator receipt | [Receipt helper](release/candidate_receipt.cjs) |

The native bridge retained its original keyboard consent, hidden background frame, two acknowledged saves, committed IndexedDB read-back and fresh second-origin restore. It then acknowledged and read back all five history-empty draft types. A real `removeMedia` mutation kept teacher text, remote image/audio links, pin and an actual explicit-removal entry within 500 details. An independent native database read and recreated client restored all **eight committed snapshots** with exact new data. The report captures/rechecks the full canonical client/bridge bytes and runner hash; these two-source browser hashes are separate from the still-pending combined candidate receipt.

Final candidate: **HEAD pending; selected-input count/parity count pending; candidate SHA-256 pending; before/after stability pending.** Current global CI remains unverified.

## Baselines and superseded evidence

Retained failures establish the intended defects: [media baseline](media-intent-baseline.json) passed 5/16 and failed 11; [schema baseline](draft-schema-baseline.json) passed 6/20 and failed 14; [learner v2 baseline](student-v2-baseline-unit.json) passed 1/14 and failed 13. The [initial receiver baseline](receiver-baseline-unit.json) failed its original three removal cases. Later receiver coverage expanded to eight cases, so its original three-case baseline is not an eight-case baseline claim.

The v1 learner patch/report remain historical. Review found that v1 coupled learner ownership to history hydration; final integration uses [v2](student-response-v2.patch.json) and its expanded fixture. The [v1 candidate result](student-candidate-unit.json) does not validate final v2.

The first file labeled [schema candidate](draft-schema-candidate.json) actually repeated the baseline: its invocation supplied `ALLO_RECOVERY_*` overrides instead of the fixture's `ALLO_DRAFT_*` variables, and a following environment-cleanup command masked the failing runner exit. It contains 14 failures and is not a candidate pass. The later [production schema result](draft-schema-current.json) passed 20/20 after reviewed guarded application; the final combined run must repeat that current-source coverage. Early configuration-selection mistakes and isolated candidate results are retained rather than substituted for final validation.

## Scope and release limits

Mounted/helper fixtures use production logic with controlled timing/state/storage bindings. The bridge has real browser frames, postMessage, consent, native IndexedDB transactions and atomic mutation responses; routed fixture bytes and synthetic origins remain explicit. The learner journey uses production effects/views/writer with a supplied storage adapter, loopback transport and synthetic audio. None establishes real Google Canvas partition/session behavior, hosted/CDN bytes, physical-device restart, physical narration output, manual assistive technology, native zoom, exports, installer packaging or current global-CI green status.

All work remains local and uncommitted for coordinated ownership/release handling in the shared dirty checkout. Concurrent work and the shared index were preserved. No push or deployment claim is made; prior classroom evidence remains in [the earlier report](../classroom-reliability-2026-10-01/README.md).
