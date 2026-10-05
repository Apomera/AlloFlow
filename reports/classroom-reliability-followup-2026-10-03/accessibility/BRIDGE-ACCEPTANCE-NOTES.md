# Native bridge follow-up acceptance

Status: new runner authored; no browser, test or production-write execution by this worker. The coordinator owns the serialized run.

`bridge-acceptance.cjs` is derived from the prior completed classroom bridge runner. The earlier runner and reports are unchanged. Initial consent via native keyboard, background-frame hiding, two acknowledged saves, native IndexedDB transaction read-back and a fresh second-origin client restoration remain intact. All original snapshot counts of one/two are asserted before adding new records.

The extension uses the actual `alloDeviceStorage.mutateRecovery` over native nested cross-origin postMessage/IndexedDB, not extracted helpers:

1. Five history-empty snapshots containing only meaningful Word Sounds, units, profiles, project or guided progress are upserted. Each applied response is compared with actual recovery read-back; exact workspace data, zero resource count and pin state are required. Recovery counts progress from three through seven.
2. A pinned workspace with two embedded media values, teacher text, remote image/audio links and 500 earlier session-only omission details is acknowledged and read back with both media values intact. Actual `removeMedia` must acknowledge removal, retain an actual `user-remove-media` image entry within 500 details, report 502 omissions, and preserve text/links/pin. It creates the eighth snapshot and does not add another during removal.
3. An independent native bridge-database transaction reads all eight committed snapshots. Exact new draft data and the entire capped-removal record must equal acknowledged read-back.
4. The first-origin client is recreated after all writes. It must restore all eight exact IDs, five exact draft workspaces and the complete capped-removal snapshot. Earlier history remains revision two. The remembered grant must not show consent again, and bridge-message origins remain exact.

## Actual source and output boundaries

At invocation, the runner reads the complete canonical `allo_device_storage_module.js` and complete canonical `storage_bridge.html`. It records SHA-256 and byte length for those bytes and serves those exact snapshots through route fulfillment. It does not rewrite their code. Both files are reread and required unchanged after all checks; the runner's own bytes/hash are likewise recorded and rechecked. Its captured canonical default bridge URL must use HTTPS with `?v=ds6-media-removal-intent`. Every fulfilled URL records its actual query. The public client mirror and three host loader pins belong to the separate static/frozen-candidate validation; they are not browser-served inputs here.

The fixed output is `accessibility/bridge-report.json`. The coordinator should retain an earlier output under a distinct attempt name before a later rerun. Existing fields `consent`, `twoSaves`, `nativeCommittedRead` and `freshClientRestore` preserve the original two-snapshot scope. New fields are:

| Field | Evidence |
| --- | --- |
| `draftOnlyRoundTrips` | Five applied native mutations, exact workspace read-back, zero history/resource counts, increasing store counts and pin state |
| `explicitMediaRemovalAtCap` | Before/after manifest size, actual removal entry, omission count, acknowledged response, exact store read-back and preserved text/links/pin |
| `extendedNativeCommittedRead` | Independent committed eight-snapshot IDB read with exact new data |
| `freshExtendedRestore` | Recreated client's eight-snapshot restore, five draft workspaces, entire capped-removal record and remembered consent |
| `sources`, `runner`, `runtime`, `bridgeUrl`, `routedRequests` | Captured canonical/runner hashes, runtime versions and actual routed URL/query details |

```powershell
node reports/classroom-reliability-followup-2026-10-03/accessibility/bridge-acceptance.cjs
```

This runner has real browser frames, consent, bridge protocol, atomic mutations and IndexedDB commits within an isolated Chromium context under one synthetic top-level site. Local fixture bytes are intercepted at canonical/synthetic HTTPS URLs. It does not establish hosted CDN bytes, a real Google Canvas partition/session, full App-shell integration, physical-device restart, manual screen-reader behavior or deployed release status. Playback/native zoom are outside this runner.
