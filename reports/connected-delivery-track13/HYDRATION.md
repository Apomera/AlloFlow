# Track 13 — hydration and resharing follow-up

2026-09-27. Baseline and final observed local HEAD: `af3c6b82ab76dad40a5d44f785bf828d1adea86c`. Current source supersedes the earlier 6b63e76 baseline. The shared working tree contains other owners' work. No applicable AGENTS.md was found; AGENT_HANDOFF.md and the integration ownership ledger were inspected. No deployed revision was verified for these changes.

## Implemented result

Explicit reading text envelopes now keep a failed-decoding signal through cloud hydration and portable resharing. Valid envelopes decode exactly once. The existing received preview can therefore continue to show bodyStatus unavailable / bodyReason invalid-text-envelope instead of describing damaged text as ready. Raw input is retained and not repaired or exposed in the delivery summary.

| Rank | Evidence and reproduced failure | Minimal change | Status |
| --- | --- | --- | --- |
| P1 | firestore_sync_module.js:702 previously relabeled failed json-text/v1 parsing as text/v1. Four malformed/nonstring JSON values then looked ready after hydration. | Only a successful string decode clears the explicit marker; failures preserve it. | Implemented at firestore_sync_module.js:707 and :747. |
| P2 | A snapshot whose text equaled invalid raw envelope bytes could preserve a same-text-supported designation without successful decoding. | Original preservation requires a successfully decoded string whenever json-text/v1 is explicit. | Implemented at firestore_sync_module.js:578; regression at tests/connected_reading_delivery.test.js:227. |
| P2 | Packing a valid explicit envelope without first hydrating it could preserve the encoded wrapper as ordinary prose; invalid input could likewise lose its marker during reading restoration. | Decode valid explicit strings before sanitization; skip original-leaf restoration for unresolved explicit envelopes. | Implemented at live_aac_source.jsx:314 and :425. |
| P1 integration follow-up | AlloFlowANTI.txt:23510 local autosave rewraps already-explicit envelopes. On reopen this loses failed decoding or adds an extra layer to valid text. Eight exact-serializer fixtures reproduced the failures. | Preserve an existing explicit envelope instead of wrapping it again, including the quota fallback save. | Tested candidate only: hydration-host-integration.patch. Shared host is unchanged by this track. |

Nine new module regression fixtures failed before the runtime fixes; all passed afterward. The separate host candidate suite reproduced eight failures and one passing structured-resource control against the current host; all nine pass with the candidate applied in memory.

## Safeguards and scope

No new payload schema or media fields were introduced. Existing json-text/v1 and text/v1 markers retain their meanings. Legacy unmarked prose still uses a matching snapshot to disambiguate JSON-looking text; quoted text, JSON objects as prose, numbers and the word null survive unchanged when they are legitimate text. Existing privacy stripping, teacher-only filtering, source family pairing, audio omissions and size budgets remain intact.

The route-by-capability matrix and received-preview contract in README.md/CONSISTENCY.md remain applicable. These fixes concern decoded text evidence. They neither establish recipient audio playback from a teacher cache nor automatically export reference audio or student recordings. Track 14 still owns coordination of a future portable audio contract.

The module implementation keeps failed envelopes distinguishable for warnings. It does not repair corrupted text or change the shared reader's rendering/recovery behavior. A captured original may remain available independently when the adapted body is unreadable. No production corrupted packet was reproduced.

## Validation

- **273 tests passed across 16 files** (10:51:45 local tool output; 117.14 seconds), covering delivery, curation, roles, source preservation, history reload, session assets/transport, receipt handling, privacy and localized surfaces.
- **15 isolated Chromium cases passed**, with no page errors. Existing 11 recipient cases remain; four additions cover malformed received-and-reshared packets, page refresh, embedded offline reopen and saved-asset hydration. A first browser assertion used array position after automatic original insertion; it was corrected to select the adaptation by ID.
- **9 host-candidate tests passed** (10:57:35; 20.63 seconds). They execute the actual extracted offline serializer with the proposed patch, including two save/reopen cycles, full and quota fallback saves, valid explicit/plain text and a non-reading structured resource. These are candidate checks, not proof that the host fix is integrated.
- LiveAac rebuilt successfully. Root/public LiveAac output matches its source build function; root/public FirestoreSync bytes match. FirestoreSync syntax, exact patch applicability, candidate serializer syntax and scoped whitespace checks passed. Git emitted only line-ending normalization warnings.

Browser fixtures use disposable Chromium profiles, intercepted URLs, real project modules/codecs and an in-memory asset backend. There are no live backend calls, app servers or saved user app operations. Offline reopen tests cover embedded payloads, not deployment-shell boot. The local autosave gap remains until the host candidate is integrated. No physical-speaker or production-device playback claim is made.

Runtime suite command:

    node node_modules/vitest/vitest.mjs run tests/connected_delivery_followup.test.js tests/connected_delivery_host_delta.test.js tests/connected_reading_delivery.test.js tests/novak_reading_curation_delivery.test.js tests/novak_delivery_preview.test.js tests/novak_role_delivery_consistency.test.js tests/novak_reading_delivery_export.test.js tests/novak_selected_assignment.test.js tests/mailbox_image_delivery.test.js tests/session_asset_sync.test.js tests/session_transport.test.js tests/share_session_surfaces_a11y.test.js tests/full_pack_localization.test.js tests/firestore_sync.test.js tests/history_reload_rehydrate.test.js tests/reading_preservation.test.js --maxWorkers=1 --testTimeout=30000

Additional checks:

    node reports/connected-delivery-track13/browser-recipients.cjs
    node node_modules/vitest/vitest.mjs run tests/connected_delivery_offline_envelope.test.js --maxWorkers=1
    node _build_live_aac_module.js
    node --check firestore_sync_module.js

Machine-readable evidence: hydration-baseline.json, hydration-validation.json and browser-results.json. The previous validation artifacts remain historical.

## Integration handoff

Track 13 changed firestore_sync_module.js and its public mirror, live_aac_source.jsx and its root/public generated modules, delivery regression/browser fixtures, and this report directory. The Work Log was updated. Shared reader, host, host mirrors, locale files and loader pins were not edited. No Git state changes, other-chat contact, commit, push or deployment were performed.

Integrator 01 should apply hydration-host-integration.patch alongside these module bytes, regenerate the shared host mirrors through the normal process, and update FirestoreSync/LiveAac loader pins and release outputs. The patch can be regenerated without editing the host with:

    node reports/connected-delivery-track13/prepare-hydration-host-delta.cjs

The helper recognizes an already integrated change. The candidate tests use that actual host when present, otherwise the proposed change in memory. Test both full and quota local saves after integration. Until then, the module changes are locally complete while the autosave portion remains pending.

Dependencies 01/02 own the canonical host/text boundary; 08 remains the reviewed support/role contract dependency. No broader redesign or portable media expansion is required for this fix.
