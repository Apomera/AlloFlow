# Assembled acceptance plan

Current result: [pass two](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adapted-reader-integration-01-2026-09-26-1730/pass-two/HANDOFF.md) passes its local focused gate: 900/900 unit tests across 40 files, 71 recovery-copy checks, 36 final reflow/Display checks, all nine browser runs, and three instrumented lifecycle fixtures. Counts overlap where noted. Reader module SHA-256 is `a1b6e04609179cd6352cb10ef01224a88adc162f885eceeedf2e2a5c801ec3e6`; final source/module/test inputs stayed stable. The earlier failures and stale pins described below were resolved. Actual deployment identity, broad release acceptance and the explicitly deferred coverage in the current handoff remain separate.

This document records acceptance intent and the completed local checkpoint. It does not grant release acceptance. Actual counts and artifact identity are in [FINAL_HANDOFF.md](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/adapted-reader-integration-01-2026-09-26-1730/FINAL_HANDOFF.md). Owner candidate results remain separate from assembled results.

## Teacher outcomes

- Editing text, switching Original/Both, changing resources, or closing support review preserves a valid unsaved explanation/picture draft or requires an explicit discard. Failed save does not continue a deferred transition.
- A prepared-audio claim counts current, playable clips. Stale/missing/corrupt clips keep recovery available, and storage/session-only outcomes do not imply durable offline access.
- Requested essential terms are validated at candidate creation and Apply, with missing-term feedback and retained original text. Duplicate/absent/Unicode/bilingual/over-limit cases follow the same contract.
- Student preview has disposable state, scoped IDs and audio/highlights, no teacher grading or learner storage side effects, and predictable focus restoration.
- Assignment preview describes serialized/received resources, including omitted audio and unresolved assets. Failed hydration cannot masquerade as a ready empty reading.

## Student outcomes

- Bookmarks and section answers remain specific to learner and exact text version. Quota/denial/conflict/capacity failures preserve recoverable text and show truthful persistence status.
- Prepared help identifies the selected occurrence; lookup errors preserve dictionary/teacher help and offer retry against the original context. Late requests do not reopen dismissed or changed popups.
- Definition/phonics speech uses the selected passage language and cleans up when the popup, resource, or preview closes.
- Keyboard users can reach close/save/help controls, activate nested links independently, and return to a sensible control after dismissal. Narrow/zoomed layouts keep essential controls visible.
- Spanish, Arabic/RTL, Chinese, and Thai fixtures preserve placeholders, avoid raw translation keys, and do not infer speech language from the UI locale.

## Validation order and boundaries

1. Review each owner patch and test evidence against its recorded base. Preserve track 03's reader-place helper inclusion in the reader builder when merging older isolated deltas.
2. Snapshot completed-owner files before integration. Apply granular source/test changes; do not copy entire generated modules or older host/reader files from isolated workspaces.
3. Run only the builders for changed modules. Synchronize the content-engine source copy separately, then required root/public pairs and exact host loader pins.
4. Run artifact-snapshot.cjs --check; ensure every required file exists, root/public bytes match, all three hosts agree, and the reader content pin matches. Explicitly check pins for every other changed module too.
5. Run combined focused suites selected from the actual changed files. Owner test results remain separate from assembled test results.
6. Run local reader runtime/accessibility/performance fixtures against the assembled generated module, with disposable storage and an explicit artifact fingerprint. Do not infer real assistive-technology or deployed-browser coverage from jsdom or component fixtures.
7. Record genuine failures, excluded/unfinished tracks, and runtime coverage limits. Leave local source/generated changes reviewable; no deployment, push, or live student-data operations.

## Current constraints

The first integration checkpoint is complete at reader module SHA-256 `c8c1e78d39a9df02c6cdd2c4ec8b376e3ed24964a5907a3ee98e4842a9da0ea8`. Its combined run recorded 700 passes and 47 failures across 33 files. Six narration cases passed after obsolete label assertions were corrected. A production-artifact lookup recheck recorded 94 passes, four unresolved provider-AbortSignal assertions and 46 explicitly skipped subsequent-enhancement cases. These overlapping runs must not be summed into a synthetic passing total.

Final browser evidence: 34 reader routes, 17 narration cases, two preview scenarios, eight native-audio cases, nine vocabulary/Apply cases, eight recovery-locale tests and the actual offline Storybook recovery/export route passed within their documented fixture scopes. Performance validation compiled 14 fixtures and completed one smoke case; no comparative performance claim follows.

All 8,227 files compared by the final byte mirror check matched (four documented exclusions). The three hosts and engine source copy matched, and reader/helper/engine/audio/host inputs stayed stable across the recorded validation. Later research/delivery outputs have five stale content-pin targets, so matching mirrors alone do not establish release readiness.

Next-pass acceptance must include the queued lookup abort/deadline/outcome contract, track 17's reported 320px/200%-text adaptation-control overflow, and the newly completed owner increments. Freeze the test fixtures as well as source and generated modules: shared lookup tests advanced to candidate expectations during this checkpoint. Recheck against the actual deployed shell, loader URLs and response-byte hashes after deployment; local HEAD is not deployment evidence.
