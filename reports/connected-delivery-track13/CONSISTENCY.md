# Track 13 — received capability consistency

> 2026-09-27 follow-up: [HYDRATION.md](HYDRATION.md) closes the module hydration/resharing gap and supplies a separately tested local-autosave host patch. Validation: 273 runtime tests, 15 isolated browser cases, 9 host-candidate tests. The new host patch is pending integration.

2026-09-26. Local baseline and final observed HEAD: `6b63e76e862125e87422f02a54ed60beac68e8fb`. The checkout contains concurrent changes. This is local implementation and fixture evidence, not identification or validation of the deployed release. No applicable AGENTS.md was found in the workspace/ancestor scans.

## Result

Three received-preview defects were reproduced with failing regression fixtures and fixed in the owned delivery modules. The existing recipient host integration is now present locally. This pass did not edit the shared host, reader, transport sanitizer, Git state, or deployment.

| Rank | Reproduced defect | Implemented behavior | Current evidence |
| --- | --- | --- | --- |
| P1 | An unavailable support envelope could retain annotations; the description counted them as active and counted their pictures as included. The legacy support count could contradict the capability state. | Stale/unavailable annotations contribute zero active supports or pictures. Legacy fields derive from the same validated capability result. Valid partial envelopes retain usable entries. | shared_activity_source.jsx:324, shared_activity_source.jsx:337, shared_activity_source.jsx:423; tests/connected_reading_delivery.test.js:176 |
| P2 | Missing adapted-support validation incorrectly became pictures omitted/not-provided. | Picture coverage stays unknown/unverified, or partial when other validated pictures are present. The preview explains that some pictures could not be checked. | shared_activity_source.jsx:360; view_share_session_surfaces_source.jsx:69; tests/connected_reading_delivery.test.js:186 |
| P2 | Malformed or nonstring explicit json-text/v1 envelopes were treated as ready reading text by the description helper. | Explicit envelopes must decode to a string. Invalid envelopes produce unavailable body status and a visible warning. Input resources are not changed, and JSON-looking text/v1 prose remains valid text. | shared_activity_source.jsx:386, shared_activity_source.jsx:402, shared_activity_source.jsx:1755; view_share_session_surfaces_source.jsx:52; tests/connected_reading_delivery.test.js:197; tests/connected_delivery_followup.test.js:85 |

Six new regression cases failed before the changes, then passed. Two additional React cases verify the unreadable-body and unavailable-support messages without leaking fixture content into the summary.

## Contract and safeguards

The route-by-capability matrix in README.md remains applicable. This pass changes capability descriptions and display; it does not export more media, relax budgets, include student recordings, or establish audio playback from a teacher cache. Audio payload presence remains unverified until a recipient-side observation establishes playback. Saved-link reading audio omission remains explicit.

For a malformed adapted body reaching the helper with its explicit envelope marker, the recomputed preview now includes this shape (illustrative subset; family/source capabilities are still evaluated independently):

```json
{
  "schemaVersion": 1,
  "capabilitySchemaVersion": 1,
  "basis": "received-resources",
  "readings": [{
    "id": "adapted",
    "bodyStatus": "unavailable",
    "bodyReason": "invalid-text-envelope",
    "capabilities": {
      "adaptedText": {
        "inclusion": "omitted",
        "availability": "unavailable",
        "reason": "invalid-text-envelope"
      }
    }
  }]
}
```

A resolved resource bundle can have contentsStatus ready while an individual body is unavailable: the former describes asset resolution, and bodyStatus describes text decoding. Sender-authored summaries still do not establish recipient capability.

Three new messages were added to the existing scoped catalog payload: English, Spanish Latin America, Spanish Castilian, Arabic, Simplified Chinese, and Thai, in root/public copies. There are now 23 scoped keys. Other languages use the existing English fallback. Translations are AI-authored and not native-speaker-certified.

## Validation

- **183 tests passed in 13 files**, run beginning 19:05:04 local tool output; duration 20.05 seconds. The first full run had 182 passes and one outdated Mailbox fixture missing the now-integrated recipient-state setter. Updating the fixture also added assertions that failed decode leaves received state empty and successful replay populates it once.
- **11 isolated Chromium cases passed**, with no page errors: cold self-contained open, actual refresh, embedded offline reopen, cold Mailbox receipt, saved assignment hydration, offline hydration failure, fresh live audio store with decoded/muted WAV playback, and four narrow localized layouts.
- SharedActivity and ShareSessionSurfaces were rebuilt. All four delivery module outputs and public mirrors match their source build functions exactly, including the unchanged LiveAac and LiveSessionDockView outputs.
- Scoped locale check reports zero pending catalogs; scoped whitespace check passed.

Commands and full browser limitations remain in FOLLOWUP.md. The browser fixture now captures the host's receivedDeliveryResources state rather than using its broader History. Disposable browser profiles, intercepted fixture URLs, and an in-memory backend are used. No production backend or saved user app state is touched. Offline fixtures do not establish offline boot of the deployed app shell. Muted playback does not establish physical audibility or compatibility with every device.

Machine-readable results and module hashes: consistency-validation.json. Current browser case results: browser-results.json.

## Integration status and remaining source gap

The prior recipient patch is now present in local AlloFlowANTI.txt: wrapper at 11519, scoped received state at 18462, receipt mount at 40408, revision-bearing monitor at 40415, and prepared-payload lookup at 43060. Existing host-delta tests use those actual integrated definitions. The saved-assignment and Mailbox browser fixtures use the actual callbacks. Do not reapply the historical host patches or rerun their generators against already-integrated anchors.

An adjacent source gap remains: firestore_sync_module.js:699-738 catches malformed JSON-text decoding and can replace its encoding with text/v1 while retaining the original string. That can erase the explicit invalid-envelope signal before a downstream preview sees it. This pass validates the description helper's explicit-envelope boundary; it does **not** claim end-to-end rejection of corrupted packets on every hydrated route. No production corruption was reproduced. A future coordinated change should retain a bounded decoding-failure state through hydration, with fixtures for direct saved-link, Firestore asset, refresh, and legitimate JSON-looking prose. This belongs with the canonical text/source boundary owners 01/02 and must preserve existing legacy-text compatibility.

Owned changes in this pass: shared_activity_source.jsx, view_share_session_surfaces_source.jsx, their generated root/public pairs, three scoped messages across the existing catalogs, delivery tests, and this report directory. Integrator 01 owns shared host/mirrors and loader release assembly. Dependencies 01/02/08 continue to own source, identity, role, and support contracts; track 14 owns coordination of the future portable audio contract. No new host patch is needed for this pass. Integrate the new module bytes and catalog changes through the normal release procedure; deployed state remains unverified.
