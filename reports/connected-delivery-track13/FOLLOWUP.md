# Track 13 follow-up implementation

> Current status: see [CONSISTENCY.md](CONSISTENCY.md) and consistency-validation.json. Both historical host patches are now integrated locally. Latest validation: 183 tests in 13 files and 11 isolated Chromium cases passed. The historical pending-integration statements below are superseded.

2026-09-26. Validation began at fd4044c862ed9b345b340d69cb1411a19c09dafb. The final observed local HEAD is 6b63e76e862125e87422f02a54ed60beac68e8fb after a concurrent Cephalopod Hunter commit. The validated module bytes remain unchanged and the recipient patch still applies. The shared working tree has concurrent changes; this report does not identify the deployed revision.

## Result

The follow-up module fixes are implemented and validated. The first host patch (adaptation identity, saved-link hydration failure, hydrated-body preview) is now present in the local shared host. The additional recipient wiring remains a tested integration artifact for integrator 01. This track did not edit the shared host or reader, change Git state, contact other chats, or deploy.

- Picture omissions now retain bounded support identity tokens instead of an unscoped historical count. Repairing, removing, or suppressing the affected support clears its warning; an unchanged omission survives serialization. Tokens do not contain the gloss or picture bytes. Old aggregate-only omission counts cannot be attributed to a support and are not carried into a newly serialized resource.
- A missing adapted-support validator yields unknown/unverified with no invented zero count. Stale and partially available adapted supports have explicit preview copy.
- Preview revisions include the paired original, so revising its curation invalidates the adaptation row's prior description. Other families and input-array ordering do not change that association.
- Whole-pack manifests report pending/unavailable contents. Advertised counts are separate from verified counts; total resourceCount is null while the whole manifest remains unresolved. Conversion is disabled until the full resource set is known.
- ReceivedReadingDelivery recomputes its description from supplied received resources. It accepts neither a sender-authored delivery summary nor a teacher audio store as evidence.
- Image receipts can use a compact media revision within the existing bounded resourceId field. The server's field allowlist and version remain unchanged. A teacher compares against the prepared, resized/filtered payload rather than the original in History. Missing revisions, older receipts, and changed pictures stay waiting instead of displaying a current ready receipt.

Sources: live_aac_source.jsx:596, live_aac_source.jsx:1015, shared_activity_source.jsx:321, shared_activity_source.jsx:401, shared_activity_source.jsx:409, shared_activity_source.jsx:1726, view_share_session_surfaces_source.jsx:45, view_share_session_surfaces_source.jsx:65, and view_live_session_dock_source.jsx:10.

## Localization

Twenty delivery messages are registered in the English catalog and translated into Spanish Latin America, Spanish Castilian, Arabic, Simplified Chinese, and Thai. Both root and public copies were merged independently, preserving unrelated work. Other languages retain the English fallback; this is not an all-language localization claim. Translations are AI-authored, not native-speaker-certified.

The exact payload is delivery-locales.json. Run the guarded merge with:

    node reports/connected-delivery-track13/apply-delivery-locales.cjs --apply
    node reports/connected-delivery-track13/apply-delivery-locales.cjs --check

Check verifies existing scoped values and placeholders and reports zero pending catalogs. A differing existing translation is rejected rather than overwritten.

## Validation

Final focused suite: **175 passed in 13 files**, 18:28:49 local tool output, duration 16.71 seconds. The earlier translation-fixture timeouts were corrected by reading each large catalog once outside timed test bodies; final validation did not relax the application assertions.

    node node_modules/vitest/vitest.mjs run tests/connected_delivery_followup.test.js tests/connected_delivery_host_delta.test.js tests/connected_reading_delivery.test.js tests/novak_reading_curation_delivery.test.js tests/novak_delivery_preview.test.js tests/novak_role_delivery_consistency.test.js tests/novak_reading_delivery_export.test.js tests/novak_selected_assignment.test.js tests/mailbox_image_delivery.test.js tests/session_asset_sync.test.js tests/session_transport.test.js tests/share_session_surfaces_a11y.test.js tests/full_pack_localization.test.js --maxWorkers=1 --testTimeout=30000

**11 Chromium acceptance cases passed**, with no page errors:

- Cold self-contained open, actual page refresh, and offline reopen of the embedded payload.
- Saved assignment asset hydration, plus an offline asset read that produces an error without opening placeholders or reporting success.
- Cold Mailbox per-resource intake through the actual host callback, real chunk validation, and real pack codec; the adaptation keeps its identity.
- A fresh Firebase-live recipient audio store hydrates actual encoded WAV bytes; Chromium decodes and completes muted playback. The serialized summary still says playback is unverified because it does not consume that test observation as a runtime receipt.
- Narrow recipient layout in Spanish Latin America, Arabic, Simplified Chinese, and Thai. The Arabic screenshot was visually inspected for wrapping and RTL layout.

    node reports/connected-delivery-track13/browser-recipients.cjs

The browser fixture uses disposable profiles, an intercepted fixture origin, real codecs/modules, and an in-memory asset backend. No app server, external network, live Firestore/Mailbox, or saved user app state is used. Offline cases block fixture asset access; they do not prove that the deployed application shell can bootstrap offline. Muted browser playback does not verify a physical speaker, user gesture policy, or every device/codec. Hosted-pack backend access remains covered by dependency-injected tests rather than a live hosted service.

Builds completed for LiveAac, SharedActivity, ShareSessionSurfaces, and LiveSessionDockView. Each root module and public mirror exactly matches the current source build function. Scoped whitespace checks passed. Hashes and results are in followup-validation.json and browser-results.json.

## Integration for 01

Use recipient-integration.patch, regenerated without writing the host by:

    node reports/connected-delivery-track13/prepare-recipient-delta.cjs

The patch:

1. Adds transient receivedDeliveryResources state, cleared across live-session scope changes.
2. Populates it only at successful Firebase-live hydration, Mailbox pack hydration, saved assignment hydration, fragment/hosted assignment intake, and Mailbox per-resource receipt/removal. This is separate from the broader History cache.
3. Mounts the recipient-only reading details using that received bundle and the open resource ID.
4. Enables revision-bearing image receipts and supplies the teacher dock with the existing prepared-resource cache getter.

The actual updated host callbacks are exercised in memory by connected_delivery_host_delta.test.js; recipient rendering and patch applicability are checked by connected_delivery_followup.test.js. Once the host is integrated, these tests use its integrated definitions. The current patch was verified to apply at final validation.

Integrate the patch together with all four module outputs, regenerate shared host mirrors and loader versions through the normal integration procedure, and rerun the focused suite. Loading the new dock with an old host is conservative: without the prepared-payload revision it reports waiting rather than asserting readiness. Do not represent the new recipient surface as shipped before the host patch and loader updates land.

Changed owned sources: live_aac_source.jsx, shared_activity_source.jsx, view_share_session_surfaces_source.jsx, view_live_session_dock_source.jsx; their four root/public generated module pairs; the twenty scoped English and five-locale catalog additions; delivery regression tests and this report directory. Unrelated existing changes were preserved.

Dependencies 01/02/08 remain the existing reading/source/role/support contracts. Track 14 still owns coordination of a future explicit portable reading-audio contract. This work does not widen audio exports, include learner recordings, or relax picture/resource budgets.
