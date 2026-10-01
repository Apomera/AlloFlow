# Track 18 — Device-save completion and native storage verification

This isolated candidate corrects save feedback and request ownership in the earlier DeviceSaveStatus component. Native Chromium verification also establishes that the tested shared-resource snapshots survive a clean browser-process restart and play their saved audio offline without new synthesis. It does **not** establish that every karaoke resource or deployed route saves reliably.

Only `.tmp/device-durability18/` and this report directory were changed. Shared application source, generated application files, host, catalogs, Git and user application data were not modified. No other chat was contacted. Nothing was installed, integrated or deployed.

## Baseline and integration prerequisite

- The initial read found HEAD `c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8`; the frozen implementation/verification snapshot is HEAD `a63e347b7d193cbc95b5fc3a9fec844322f1f455` plus the captured working-file hashes. Packaging HEAD and dependency drift are recorded in [manifest.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/manifest.json). A commit name alone does not describe this working-tree snapshot.
- No applicable AGENTS.md was found in the inspected ancestry, workspace or target directories. The local checkout was not equated with the deployed release.
- This patch is incremental after the [device-save candidate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-device-save-track18-2026-09-27/HANDOFF.md). The [FAQ sentence-targeting candidate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/faq-sentence-targets-track18-2026-09-27/HANDOFF.md) supplies the assembled FAQ used in composition tests. Preserve both candidates' other changes.
- The affected component is from that earlier **isolated candidate**. The findings below are corrections before integration, not claims that this component was already deployed.
- Deliverable: [after-device-save.patch](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/after-device-save.patch), frozen basis and final candidate, dependency manifest, source excerpts, tests, browser fixture and validation artifacts. The patch changes one application module, one existing candidate test, one new test and one new browser fixture. The matching desktop module is included as a mirror artifact.

Packaging HEAD was `cbdace49bcacebd6d1693dced3d5d3fd75e9f36e`. The full host and package manifest changed during this work; the other captured shared dependencies retained their hashes. A final comparison confirmed that all five exercised host sections—sequenced writes, autosave, attachment, canonical enumeration and readiness—still matched the frozen snapshot. All four patch round trips passed, and the resource module mirror matches. Recheck again at integration.

## Ranked evidence and changes

| Priority | Evidence and classification | Minimal change |
| --- | --- | --- |
| P1 | **Reproduced DOM failure.** A newer read clears the previous read's timeout but never settles its awaited promise. If Retry is waiting on that read and the underlying operation hangs, a subsequent successful storage event leaves Retry busy indefinitely. [Basis:322](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/basis/resource_read_aloud_module.js:322), refresh at 333 and cleanup at 367. | Settle superseded waits through a cancellation branch in the bounded promise. Preserve the 15-second operation bound and ignore obsolete results. [Candidate:324](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/candidate/resource_read_aloud_module.js:324). |
| P1 | **Reproduced DOM failure.** Save ownership only compares the resource/context key, so replacement clips in the same resource do not cancel an old request. [Basis:379](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/basis/resource_read_aloud_module.js:379). | Scope save ownership to resource/context, store and revision; send the owned abort signal on replacement/unmount. Ignore late completion. A payload object created by the save itself retains ownership when the selected clips are unchanged. [Candidate:315](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/candidate/resource_read_aloud_module.js:315), cleanup at 378 and retry at 387. This does not promise rollback of an already committed write. |
| P2 | **Source gap, reproduced DOM and native-browser failure.** A false/undefined persistence result is treated as failure at [basis:388](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/basis/resource_read_aloud_module.js:388). The real host attaches bytes to history and returns undefined; the service returns false because it has no durable receipt yet. Autosave runs later. The failure notice at basis:393 remains even after the count confirms the selected bytes are saved. Native baseline capture shows “4/4 saved on this device” beside “Device save could not be completed.” | Distinguish requested/unconfirmed, failed and readback-verified outcomes. Current readback determines the completion message; write receipts never promote saved counts. A delayed explicit autosave failure gives actionable feedback, and a later verified read clears it. [Candidate:387](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/candidate/resource_read_aloud_module.js:387), message at 414. |
| P2 verification | **Source risk; candidate browser checks passed.** The standalone component inherits fixed Tailwind line boxes; the prior FAQ-only correction does not cover every host of this reusable component. This is not a claim of a reproduced native zoom failure. | Give its container and action buttons proportional line heights. Verify the component independently at 320px with spacing overrides and doubled computed fonts. [Candidate:429](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/candidate/resource_read_aloud_module.js:429). |

Frozen contract evidence: [host excerpts](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/evidence/AlloFlowANTI.txt.txt), notably `AlloFlowANTI.txt:5831` (sequenced writes), `:23417` (history autosave), `:23552` (audio preservation), `:23623` (debounce), `:32197` (attachment), `:32679` (bridge persistence) and `:32922` (readback); [service excerpts](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/evidence/read_aloud_audio_service_source.jsx.txt), `read_aloud_audio_service_source.jsx:466` and `:562`; [storage excerpts](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/evidence/utils_pure_source.jsx.txt), `utils_pure_source.jsx:436`, `:476` and `:535`.

## Existing safeguards and nonfindings

- The host already queues history snapshots and prevents obsolete writes from publishing a current success receipt. Its full snapshot preserves reference and student audio fields; quota fallback intentionally saves text without audio.
- The existing storage wrapper compresses snapshots, requires acknowledged writes and verifies them through strict local readback. No new storage engine, cache, schema or host API was added.
- The service compares the selected clip's bytes and compatible identity against a separately hydrated persisted store. An older take with the same text cannot certify an unsaved replacement.
- Device counts remain separate from preparation and playability. A verified subset is described as “all currently ready clips,” while the denominator still shows the full requested set.
- Retry uses existing audio only. Both actions remain mounted and keyboard reachable, with synchronous duplicate guarding and guarded `aria-disabled`; no focus transfer or nested controls were introduced.
- Routine count feedback stays quiet during active narration. Explicit action completion/error feedback remains polite and atomic. Actual spoken output still requires AT testing.

## Verification performed

**102 tests passed across six suites:** 19 new save-completion cases; 21 existing device-status cases; 15 FAQ/overlay composition cases; 35 shared audio-service cases; eight recovery cases; four storage-wrapper cases. [Final result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/validation/final.json). Previous tasks' totals are not included.

On the prerequisite-only basis, all **17 initial new acceptance cases failed**. These are assertion/acceptance counts, not 17 independent defects. Two additional regression cases were added afterward. The earlier false/undefined-as-failure assertions were replaced by explicit tests of the actual attachment/readback contract. [Baseline result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/validation/baseline-unit.json).

**13 Chromium scenarios passed, with zero page errors and zero unexpected network requests.** The fixture uses native IndexedDB, the checked-in idb-keyval and LZString libraries, actual audio store/service and resource adapters, and source-extracted host attachment, autosave, queue and readback functions. It writes only disposable fixture data in a unique browser profile under `.tmp`. Synthesis returns known PCM WAV bytes; playback uses native media decoding. There is no application server, provider call, microphone, cloud/Canvas bridge or real user profile.

The browser was fully closed and reopened with that disposable profile. After restart the context was taken offline; saved snapshots matched the prior bytes, all tested clips decoded, and no new synthesis occurred. A replaced duplicate FAQ occurrence retained its selected replacement bytes. This goes beyond the earlier memory-only and serialization checks, but is still an isolated storage integration fixture, not the assembled application UI.

| Shared resource model | Canonical clips in restart/offline check | Coverage boundary |
| --- | ---: | --- |
| FAQ | 4 | Question/answer entries with repeated spoken text. |
| Original text | 2 | Stable `simplified` resource with original form metadata. Does not verify every analyzed-text entry point. |
| Adapted text | 2 | Stable `simplified` resource with adapted form metadata. |
| Glossary | 3 | Stable entry id, term, definition and Spanish translation. |
| Memory aid | 3 | Reference target, cue/example and prompt through the shared adapter. |
| Applied challenge | 3 | Reference title, instructions and context through the shared adapter. |

Other browser cases verify attachment-only Retry pending until autosave readback, injected quota failure and text-only fallback, persistence-only recovery, injected read errors, total write failure preserving the old snapshot, actual deletion of the disposable history record, and delayed write ordering retaining newer bytes. Fault injection is at the vendor-storage boundary; it is not physical disk exhaustion or automatic OS/browser eviction.

Three layout cases exercise the storage component at 320 CSS pixels: normal; user spacing (line height 1.5, paragraph spacing 2em, letter spacing .12em, word spacing .16em); doubled computed font sizes. Assertions cover horizontal fit, proportional line boxes, visible keyboard focus, minimum 44px action dimensions, focus retention after Retry and absence of nested controls. The [doubled-text capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/validation/device-durability-200-text.png) was visually inspected. These are not native 200% text-resize or 400% zoom tests.

- [Browser result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/validation/device-durability-browser.json)
- [Browser fixture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/candidate/dev-tools/device_durability_browser.cjs)
- [New completion tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/candidate/tests/device_save_completion.test.js)

The first fixture setup lacked the shared test helper, and its first glossary sample used `id` instead of required `entryId`; both were corrected. A separate baseline browser comparison hit a native-media timeout. That is not a storage/source regression; the subsequent feedback-only comparison omitted decoding while retaining native writes/readback and restart, then reproduced the contradictory saved/failure messages. [Baseline browser result](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/validation/baseline-browser.json), [capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/validation/baseline-browser.png), [earlier timeout](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/device-durability-track18-2026-09-27/validation/baseline-media-timeout.json). These comparisons are separate from the successful 13-case candidate run and contribute no additional passing coverage. The optional feedback-only fixture flag was added after that successful full run; the default test path is unchanged.

## Focused acceptance and remaining checks

| Task | Expected outcome |
| --- | --- |
| Retry existing session-only clips, keyboard Enter/Space | One persistence request, no TTS/capture. Focus stays on Retry. Initially show unconfirmed storage, then announce current readback confirmation. Never retain a contradictory failure beside a fully verified count. |
| Delay or fail autosave | Pending differs from an explicit failure. A failed write cannot certify the replacement bytes or erase the previous good snapshot. Check and Retry remain reachable. |
| Supersede a hung read with a storage event or explicit Check | Old waiting work settles; Retry leaves busy state when the current check finishes. Old results cannot replace newer counts. |
| Replace a clip, change resource/profile/store, or leave while waiting | Invalidate old ownership, signal cancellation and ignore late UI results. A save's own equivalent resource-payload attachment must not be mistaken for a new selection. |
| Readback fails, record is deleted, or only text was saved | Say unverified or show the reduced saved count. Never keep a previous success label as evidence for missing current audio. Recovery must use existing clips. |
| Original/Adapted/FAQ/glossary/studio routes after assembly | Recheck actual route entry, Edit availability, stable resource IDs, descriptors and selected settings. Preserve the previous candidates' toolbar, dialog and sentence-targeting work. |
| Full restart and offline use in the deployed shell | Repeat with disposable real resources and the actual deployment/storage backend. Test Chrome/Firefox/Safari, device/browser storage policy, delayed close and reopen, and both reference and personal-recording lanes. The fixture only verified reference audio. |
| NVDA/Chrome and Firefox; VoiceOver/Safari; mobile AT | Confirm distinct ready/saved counts, pending/failure/completion announcements, no routine chatter during playback, stable focus and touch exploration. DOM/native-browser assertions do not establish actual screen-reader behavior. |
| Real text resize, native 400% zoom, themes, forced colors and nested/sticky overlays | No lost content/actions, covered focus or traps. Complete these with assembled 04/09/10 and the reader owner. Inline target exceptions still apply; the 44px action choice is not a blanket WCAG violation threshold. |

The status design follows [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): feedback is available without moving focus, and routine updates should avoid excessive interruption. Clean-restart evidence should not be generalized to every shutdown/storage condition; see [MDN's IndexedDB guidance](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB). These sources define relevant behavior and limits; they do not certify this candidate.

## Ownership and integration handoff

1. **Resource/read-aloud and reader owners:** merge the prior device-save candidate, preserve the FAQ sentence-targeting follow-up, then apply this small ResourceReadAloud/test delta to the current assembled checkout. Do not replace unrelated current reader/host files with snapshots.
2. **02/15 persistence owners:** review the documented receipt/attachment contract and the real-storage fixture. This candidate needs no service, storage or host mutation. Preserve sequenced autosave, strict readback and selected-byte comparison.
3. **Release owner:** synchronize `resource_read_aloud_module.js` and its desktop mirror and update normal loader/integrity metadata in the authorized integration workflow. Recheck hashes and rerun the delivered suites/fixture after assembly.
4. **Catalog owner:** localize `audio_device.retry_verified`, `audio_device.retry_pending` and `audio_device.retry_unverified`; safe English fallbacks are supplied. Existing failure wording remains.
5. **Track 18 + reader owner:** complete actual AT/mobile/zoom and deployed-backend verification after 04/09/10 assembly before accessibility signoff.

Remaining priority: verify Canvas/bridge and actual desktop persistence, unsaved-resource entry paths, student-recording storage, and the separate Story Forge/script/export contracts. Translated Bridge, podcast/script overlays and transient live modes still require explicit save-eligibility decisions. This work neither adds universal saving to those routes nor claims they passed.
