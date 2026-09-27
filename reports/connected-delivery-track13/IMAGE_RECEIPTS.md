# Track 13 — image checks and prepared-payload receipts

2026-09-27. Baseline: `3752fe48d98ee8096e456d766427f3f513a11b25`. Final observed HEAD: `3752fe48d98ee8096e456d766427f3f513a11b25`. Local source is the authority; this work did not inspect or identify the deployed release. No applicable AGENTS.md was found. The shared Work Log and track ownership ledger were inspected; concurrent work was preserved.

## Implemented result

Scene artwork that was already included in the student payload now participates in recipient image checks and revision matching. The teacher dock now decides whether image status is relevant from the prepared payload, using the same payload for the receipt revision.

| Rank | Reproduced defect | Minimal change and evidence |
| --- | --- | --- |
| P2 | Scene art survived mailbox preparation but was missing from the image manifest. A scene-only resource produced no load check, and replacing its art did not change its receipt revision. | Include sceneImage in the existing image-leaf discovery at live_aac_source.jsx:726. Tests: tests/mailbox_image_delivery.test.js:228. |
| P2 | An unsupported teacher-only image could be omitted during preparation, yet the dock hid the resulting omission receipt because its History-based image set found no deliverable source. | Resolve image eligibility from the prepared payload at view_live_session_dock_source.jsx:14-22. The actual React dock test covers preparation finishing with an unchanged History array/getter at tests/mailbox_image_dock.test.js:29. |
| P2 | When a prepared payload contained no images or omissions, the original teacher image could leave an irrelevant awaiting-device message and retry button visible. | The same prepared-payload lookup now suppresses this status. When preparation is missing, an original can indicate pending work but cannot supply a verified receipt revision. |

The two scene cases and two dock cases failed before the fix. Controls confirmed that private recording/backup containers stay excluded and that a changed or missing prepared revision never accepts an old ready receipt. The dock resolves only displayed resources, reuses each result within a render, and refreshes that lookup on the next render so preparation changes are not hidden by a History-only memo.

## Safeguards and nonfindings

No additional media is exported. Scene images already passed the serializer's format and budget checks. Image checks still exclude recording, private evidence and backup parents, use the existing decode timeout/concurrency, and distinguish omitted images from delivered images that cannot load. The receipt schema, server allowlist, student authorization, count bounds, assignment matching and revision token format are unchanged. Existing text/support/family/citation contracts and audio omission rules remain unchanged.

A teacher's original or cache does not prove receipt. The dock uses the prepared resource to identify the expected image revision and requires a matching student receipt to show loaded. Decode success is image-load evidence, not a statement that a student viewed the picture. The route matrix in README.md remains applicable; this pass improves observation of an existing media field rather than changing route capabilities.

## Validation

- **292 tests passed in 18 files**, run beginning 11:30:52 local tool output; duration 119.83 seconds. This is the HYDRATION.md runtime command plus tests/mailbox_image_dock.test.js and tests/live_dock_end_session.test.js.
- The immediate image/dock checks passed **38 tests in 3 files**. The initial baseline combined run hit a Vitest worker-start timeout; the scene suite was rerun separately to reproduce its two failures. Final validation used the existing single-worker setting and completed without that runner error.
- **18 isolated Chromium cases passed**, with no page errors. Two additions decode valid scene art, reject invalid image bytes, expose a recoverable load failure and reject the older image's ready receipt after a revision change.
- LiveAac and LiveSessionDockView rebuilt successfully. Both generated root/public pairs match their source build functions. All 13 recorded delivery inputs stayed unchanged during broad validation. Scoped whitespace checks passed, with only a line-ending normalization notice.

Commands:

    node node_modules/vitest/vitest.mjs run tests/mailbox_image_delivery.test.js tests/mailbox_image_dock.test.js tests/live_dock_end_session.test.js --maxWorkers=1 --testTimeout=30000
    node reports/connected-delivery-track13/browser-recipients.cjs
    node _build_live_aac_module.js
    node _build_first_wave_view_modules.js LiveSessionDockView

The browser fixture uses disposable profiles, intercepted URLs, real codecs/modules and an in-memory backend. It does not access live Firestore/Mailbox, operate saved user app state, or prove deployed-shell offline boot. No audio playback guarantees were added. Machine evidence: image-receipt-baseline.json, image-receipt-inputs.json, image-receipt-validation.json and browser-results.json.

## Integration handoff

Owned changes: live_aac_source.jsx and view_live_session_dock_source.jsx; their generated root/public module pairs; image receipt/dock tests and the isolated browser fixture; this report directory and Work Log. Shared host/reader files, locales, loader pins and Git state were not changed by this track. No commit, push, other-session contact or deployment occurred.

Integrator 01 should include both updated module pairs and refresh their normal release pins/mirrors. Existing host props already provide the prepared-resource getter; no new host or server change is required for this pass. The earlier hydration-host-integration.patch still applies and remains separately pending. Dependencies 01/02/08 and track 14 portable-audio coordination are unchanged.
