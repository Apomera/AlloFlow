# Classroom persistence follow-up — 2026-10-03

Four reliability fixes are integrated locally. **352 test cases across all 21 configured files pass**, with zero failures or skips. Both isolated native browser workflows pass. Changes remain uncommitted and undeployed to preserve the shared working candidate.

## Improvements

- Student restoration preserves responses written while loading. Empty restores schedule pending edits; failed reads remain retryable. Saving requires an explicit acknowledgement and matching strict local readback. Session, role and storage transitions retire obsolete receipts. A separate learner ownership token prevents history loading from stranding a save; explicit clearing retires old reads.
- Resource removal marks existing transfers before asynchronous decoding finishes. Removed resources cannot reappear or reopen from an older transfer. Record identity checks protect newer same-RID work; retry markers survive failures, while fresh RIDs can deliberately share the resource again.
- Explicit **Remove media** intent survives a full 500-entry omission manifest and later imported normalization. The next workspace save preserves that choice, while session/quota omissions retain their existing behavior.
- Native recovery accepts the same meaningful draft-only work as the host: units, profiles, guided progress, project state and Word Sounds. These drafts survive atomic saves and fresh-client restoration without generated history.

Eight secondary storage fetchers now request `ds6-media-removal-intent`. UtilsPure, PersonaChat and ExportHandlers have fresh selective host URL tokens. Source/runtime/public pairs and all three host copies match. The global release token was preserved.

## Final evidence

| Check | Result |
| --- | --- |
| Focused new regressions | 58 passed: learner14, receiver8, media16, draft schema20 |
| Adjacent regression suites | 270 passed |
| Storage ACK/bootstrap suites | 24 passed |
| Coverage completeness | All19 selected application files plus both ACK files recorded; no rerun counted twice |
| Teacher/learner browser workflow | Native committed save/reopen, actual learner hydration, verified responses, submission/review, keyboard controls, 320/1280 reflow,22 native audio endings and zero learner synthesis calls |
| Cross-origin storage workflow | Consent, native postMessage/IndexedDB, five draft-only roundtrips, capped media removal, eight committed snapshots and exact fresh-client restoration |
| Static checks | Three host syntax checks, five module pins, generated-source checks, runtime/public parity and bridge script syntax |
| Frozen candidate | 124 selected inputs and17 declared pairs unchanged across validation; UI strings separately captured/rechecked by the native learner runner and matched to current bytes |

[Validation summary](validation-summary.json) cross-checks complete test coverage and browser/static source hashes. Individual clean exits and logs are in [the isolated-run manifest](isolated-manifest.json) and `isolated/`; ACK results are in [ack-final-unit.json](ack-final-unit.json). Browser receipts are [learner report](accessibility/report.json) and [bridge report](accessibility/bridge-report.json). Static evidence is [consistency-final.json](consistency-final.json), with [before](release/candidate-before-final.json) and [after](release/candidate-after-final.json) receipts.

Selected candidate SHA-256: `582da40a6d95faa96dcf90ee63c5ce0466e58a1ea71e37549a6253ec76de0fc5`. Recorded HEAD: `55787e4fba8779c0e35968453626a67de3ec51c8`. All three host files match `584569440f0a5b5aba8c446f23c2bdb001d675750eb4cbb1b8c73325d1b48817`.

## Retained failures and corrections

Baseline desired assertions failed: learner13/14, initial receiver3/3, media11/16 and draft schema14/20. The learner v1 candidate passed its original nine cases but review exposed the history-token role-change race; v2 and its expanded14-case suite supersede it.

The first schema candidate run used the wrong environment-variable names and masked the runner exit with cleanup. Its failing output was retained; it is excluded from final evidence. The first combined run exposed the eight stale secondary URLs. These were corrected without weakening its expectations.

Mixed-file Vitest attempts subsequently suffered worker startup/termination failures and omitted suites, despite reporting passing assertions. They are retained and excluded from final totals. Final application validation launches a fresh CLI process per file, with the same assertions, isolation and timeouts. All19 files passed on their first isolated attempt and exited0. The initially omitted mailbox suite also passed its separate31-case diagnostic. No library code or timeout constants were changed.

A concurrent UI-string update invalidated the first native learner source match. Its report was preserved as `accessibility/report-before-ui-strings-change.json`; only that affected browser workflow was repeated against current strings.

## Scope and practical limits

An already-started storage transaction can finish after a session transition; the fix prevents stale Saved receipts and further queued writes while blocked. Each old transfer retains at most256 removal IDs; overflow conservatively retires that transfer. Fresh RIDs remain available. Pending/failure cardinality retains the existing TTL policy. The bounded omission log substitutes one old detail to preserve actual removal intent; historical omission counts remain unchanged, and already-discarded intent cannot be reconstructed.

Browser checks use isolated synthetic origins, loopback transport, a supplied IDB adapter and synthetic440Hz clips. They establish actual native transactions, messaging and media completion within those fixtures. Full App-shell integration, hosted Google Canvas, physical restart, semantic narration, manual assistive technology and global CI were not validated. Native zoom remained blocked by unchanged browser metrics; it is not counted as a pass. No full application build, push or deployment occurred.

[Commit assessment](COMMIT-ASSESSMENT.md) explains why the shared tested bytes remain local. Applied manifests and exact guarded patches are retained in `media-intent/`, `draft-schema/`, `host-integration/` and `cache-coherence/` for coordinated integration.
