# Track 13 — connected delivery integration handoff

> Current status: see [CONSISTENCY.md](CONSISTENCY.md) and consistency-validation.json. Both historical host patches are now integrated locally. Latest validation: 183 tests in 13 files and 11 isolated Chromium cases passed. The historical pending-integration statements below are superseded.


Updated 2026-09-26. Local HEAD: `fd4044c862ed9b345b340d69cb1411a19c09dafb` (rechecked during final validation). This differs from the previously inspected `d2351f4524abd1e7d6915c25b2b1a49d630bb18f`. The working tree contains concurrent changes from other tracks. This is local source evidence, not a statement about the deployed release.

## Implemented in owned modules

- `live_aac_source.jsx:591`: records bounded, versioned reading-audio and support-picture omission metadata after student serialization. Simplified-reading audio remains omitted on this route. Private student audio is still removed.
- `live_aac_source.jsx:696`: includes object-shaped word-support pictures (`image.src`) and omitted-picture counts in recipient image receipts.
- `shared_activity_source.jsx:302`: computes original/adapted text, both support sets, pictures, reference audio, instructional roles/family IDs, and citation capabilities from supplied resources alone. It does not use History, ambient input, or a teacher audio store.
- `shared_activity_source.jsx:364`: retains the existing summary schema and adds `capabilitySchemaVersion`, an evidence basis, resource change tokens, and capabilities. Reference-only manifests remain unverified; they do not become false “no original / zero supports” descriptions.
- `shared_activity_source.jsx:603`: embeds the description in the serialized assignment packet. Receiver code must recompute it after hydration; sender-authored readiness is not evidence of receipt.
- `view_share_session_surfaces_source.jsx:62`: displays adapted-support and picture counts and explicit audio omission/unchecked states in the existing delivery preview. New translation keys have English fallbacks; shared translation files were not changed.

The three modules and their public mirrors were rebuilt. Shared reader and host files were not edited by this track.

## Route-by-capability matrix

“Included” means present in the resource payload after the relevant checks, not tested playback or citation authenticity. Content-dependent capabilities can still be absent, stale, rejected, or reduced by existing limits.

| Actual recipient route | Original / adapted text | Reviewed supports and pictures | Reference audio | Role, citations, family | Refresh / offline boundary |
| --- | --- | --- | --- | --- | --- |
| Self-contained assignment fragment | Student serializer preserves accepted source snapshot/pair and adapted body | Validated original/adapted envelopes, educator edits, pins, suppression, and accepted bounded pictures | Simplified-reading audio omitted; now explicit | Normalized roles/family/unit and owned reference text travel | Embedded resources can be reopened without asset fetch; actual image decoding remains unchecked |
| Mailbox hosted assignment/full pack | Same assignment builder and serializer | Same preserved support contract and picture limits | Same explicit omission | Same serialized resource fields | Initial hosted-pack fetch requires connectivity or an existing usable local copy; a fresh offline device is not promised access |
| Firestore saved assignment | Student serializer runs before asset upload; recipient must hydrate bodies | Same serializer contract, then external resource bodies | Omitted before upload; uploading cannot restore it | Preserved in hydrated resource bodies | Host patch rejects missing/unresolved assets; it avoids reporting successful load of placeholders |
| Mailbox live per-resource/chunk delivery | Student-safe serialization; source-pair helper may prepend an original | Accepted support envelopes and pictures; picture receipt checks now include `image.src` | Simplified-reading audio omitted | Resource-owned fields travel | Host patch selects the delivered ID after pair expansion; preserves existing curated original in History |
| Firebase live session | Candidate filter → external resource bodies → compact session manifests → hydration | Full resource bodies can retain supports and images; rendering validation still applies | Existing raw-base64 reference entries can survive the asset path; fresh-store fixture confirms hydration. Playback remains unverified | Resource-owned fields travel | Existing live hydration coordinator handles failures/retries; availability still depends on obtaining referenced assets |

Route anchors: `session_transport_module.js:25`, `session_transport_module.js:64`, `module_scope_extras_module.js:528`, `module_scope_extras_module.js:699`, `AlloFlowANTI.txt:24693`, `AlloFlowANTI.txt:25039`, `AlloFlowANTI.txt:25100`, `AlloFlowANTI.txt:25148`, `AlloFlowANTI.txt:25348`, `AlloFlowANTI.txt:25381`, `AlloFlowANTI.txt:34083`, and `AlloFlowANTI.txt:36113`.

## Ranked findings and evidence level

1. **P1, source-confirmed host defect; tested proposed fix:** `AlloFlowANTI.txt:25354` selects index zero after source-pair expansion. That can substitute the original for a delivered adaptation. The patch selects the received resource ID. The isolated callback fixture checks both the opened adaptation and preservation of an existing curated original.
2. **P1, source-confirmed host defect; tested proposed fix:** `AlloFlowANTI.txt:36127` catches asset-hydration failure and continues with reference-only resources. The patch uses the existing outer error path instead. Offline and unresolved-manifest fixtures assert no History replacement, no pending open, and no success toast.
3. **P1 transport contract gap / route limitation, not universal audio loss:** `firestore_sync_module.js:401` and `firestore_sync_module.js:432` strip binary/audio fields. Selective reference-audio restoration at `live_aac_source.jsx:579` applies to memory-aid and applied-challenge resources, not simplified readings. Conversely, the Firebase live asset route precedes session sanitization and can carry reading reference bytes. The fresh-store fixture validates that distinction. This change reports omission; it does not broaden media exports.
4. **P2, source-confirmed preview defect; tested proposed host fix:** saved assignment preview at `AlloFlowANTI.txt:25478` describes compact manifests. The patch describes the uploaded and hydrated bodies and stores that summary in the assignment. Module code now treats unresolved references as unknown rather than asserting absence.
5. **P2, module receipt gap fixed:** object-shaped reading pictures were outside the image-source discovery at `live_aac_source.jsx:696`. Both successful and failed recipient image-loader fixtures now cover these pictures; size-limit omission preserves the educator note and records the omitted art.

These are source findings and automated fixture results, not reproduced failures in a running deployed app. No deployment or real-device browser playback was tested. Fresh audio-store hydration demonstrates accepted bytes, not audible output or compatibility with every reader segment/profile. Expired asset permissions, device decoding, and first-time offline hosted-link access remain runtime risks.

## Safeguards and nonfindings

- The generic sanitizer and its existing size caps were not relaxed. Student recordings remain excluded (`module_scope_extras_module.js:433`, `module_scope_extras_module.js:440`, and the student serializer).
- Student candidate filtering and source-pair expansion already exist (`session_transport_module.js:25`). Teacher-only resources are not intentionally added to this delivery work.
- Existing exact source identity, family/unit matching, stale-support rejection, educator curation, and suppression contracts are retained. The original and adaptation remain separate resources.
- Support pictures remain limited to the existing accepted inline formats, 32,000 characters per picture and 64,000 per envelope (`instructional_context_module.js:607`). A rejected picture does not discard its written note.
- Presence of a reference list means only that the resource owns that list. Citation authenticity is `not-assessed`; no ambient or other-resource references are borrowed.
- Audio and pictures are never marked playable/decoded solely because a sender preview or local teacher cache says they are ready. Summary metadata does not copy prose, glosses, image data, or audio bytes.

## Serialized received-payload preview

Recompute at the received/hydrated boundary:

```js
SharedActivity.describeAssignmentDelivery(receivedResources, openingId, null, {
  received: true
});
```

Illustrative excerpt for a serialized/reopened adaptation, using the implemented schema (fingerprints shown as placeholders):

```json
{
  "schemaVersion": 1,
  "capabilitySchemaVersion": 1,
  "basis": "received-resources",
  "resourceCount": 2,
  "openingResourceId": "adapted-a",
  "readings": [{
    "id": "adapted-a",
    "resourceRevision": "<content change token>",
    "capabilities": {
      "originalText": { "inclusion": "included", "availability": "ready", "resourceId": "original-a", "fingerprint": "<source fingerprint>" },
      "adaptedText": { "inclusion": "included", "availability": "ready", "fingerprint": "<adapted fingerprint>" },
      "originalSupports": { "inclusion": "included", "availability": "ready", "activeCount": 1, "suppressedCount": 1, "educatorCount": 1 },
      "adaptedSupports": { "inclusion": "included", "availability": "ready", "activeCount": 1, "suppressedCount": 0, "educatorCount": 1, "shown": true },
      "pictures": { "inclusion": "included", "availability": "unverified", "reason": "decode-not-checked", "includedCount": 1, "omittedCount": 0 },
      "referenceAudio": { "inclusion": "omitted", "availability": "unavailable", "reason": "route-unsupported", "includedCount": 0 },
      "instructionalRoles": { "inclusion": "included", "availability": "ready", "reading": "supplemental", "original": "primary", "sourceFamilyId": "family-a", "unitId": "unit-a" },
      "citations": { "inclusion": "unknown", "availability": "unverified", "reason": "no-owned-reference-list" }
    }
  }]
}
```

States distinguish inclusion (`included`, `partial`, `omitted`, `unknown`, `not-applicable`) from availability (`ready`, `unavailable`, `unverified`). Reasons include `route-unsupported`, `not-provided`, `asset-not-resolved`, `missing-asset`, `validator-unavailable`, `source-unavailable`, `body-unavailable`, `stale-identity`, `invalid-or-over-budget`, `decode-not-checked`, and `playback-not-checked`. Failed asset hydration should be passed as `assetStatus: 'failed'` when describing an unresolved manifest. The resource revision is a change token, not a security digest or delivery receipt.

## Validation completed

Final run: **150 tests passed, 11 files**, 2026-09-26 at 17:42 local tool output. Focused builds completed for LiveAac, SharedActivity, and ShareSessionSurfaces; root/public bytes match. Scoped `git diff --check` passed (only an existing line-ending conversion warning was printed).

```text
node _build_live_aac_module.js
node _build_shared_activity_module.js
node _build_first_wave_view_modules.js ShareSessionSurfaces
node node_modules/vitest/vitest.mjs run tests/connected_delivery_host_delta.test.js tests/connected_reading_delivery.test.js tests/novak_reading_curation_delivery.test.js tests/novak_delivery_preview.test.js tests/novak_role_delivery_consistency.test.js tests/novak_reading_delivery_export.test.js tests/novak_selected_assignment.test.js tests/mailbox_image_delivery.test.js tests/session_asset_sync.test.js tests/session_transport.test.js tests/share_session_surfaces_a11y.test.js --maxWorkers=1
```

The added fixtures cover serialized refresh/reopen; absent teacher cache; forged sender readiness; valid reference audio in a fresh Firebase-live recipient store; suppressed and stale supports; cross-family isolation; owned references; original/adapted role identity; object-shaped pictures; failed image decoding; oversized picture omission with note retention; and saved-link missing/unresolved assets. Firestore and image loading are dependency-injected mocks, not calls to live data.

## Integration ownership and next steps

Integrator 01 owns the shared host and reader. `host-integration.patch` contains five bounded host hunks: preserve the received resource ID; hydrate uploaded assignment bodies before preview; save that preview; reuse it in the dialog; fail saved assignment loading when asset hydration fails. `prepare-host-delta.cjs` regenerates this artifact from exact anchors and never writes the host. `tests/connected_delivery_host_delta.test.js` applies the patch only in memory until the host is integrated, then tests the actual host. Patch drift causes a test failure.

Apply/reconcile those hunks with the current shared host, then run the focused command again. Regenerate host mirrors and update loader cache versions using the repository's integration procedure. This track did not perform those shared-host actions, commit, push, or deploy. A read-back failure during assignment creation uses its existing full-pack fallback. Receiver capability recomputation is exposed and tested; this patch does not introduce a new recipient UI or a live-session receipt protocol.

Dependencies 01/02/08 remain the source/role/support/reader contracts. Coordinate with track 14 before enabling simplified-reading audio export: use an explicit portable reference lane, validated resource/segment identity and provenance, route budgets, omission reasons, and receiver decode/identity evidence. Never convert the general sanitizer into an audio allow-all or include student recordings. Existing contracts are sufficient for this bounded implementation; no new dependency gate was introduced.

Generated SHA-256 values at handoff:

| Root module (matching public mirror) | SHA-256 |
| --- | --- |
| `live_aac_module.js` | `9123F24923C4574672115FD73F0EDF01B04BD64D303A84C2B3FD68E484598343` |
| `shared_activity_module.js` | `4B9886B097C8844C5687B9E09C17D4DCB2E503BA213391F76EBC41238437E768` |
| `view_share_session_surfaces_module.js` | `1A3BB26224B16A795A8E32D68E1B482A80EFA07B82570F337B7C32A6D34F8042` |
