# Track 18 — Truthful narration readiness and saving labels

The isolated candidate fixes a misleading readiness badge and contradictory sentence status labels, and clarifies the automatic TTS-capture setting. It does not add a storage system or certify persistence. Original and Adapted narration already have access without text Edit; that behavior remains available.

## Baseline and scope

Captured **2026-09-27T14:50:41.216Z**: HEAD `af3c6b82ab76dad40a5d44f785bf828d1adea86c`, reader SHA-256 `dd5f57089b3e9beb79922c8afbd494f7bca56b33607094abcebfa55edaa29a31`. Both were unchanged at packaging, **2026-09-27T15:00:53.874Z**. The shared Edit Audio test also remained at its captured hash. This is a working-tree baseline, not a verified deployed release. No applicable AGENTS.md was found in the inspected ancestry or repository search.

The isolated prerequisite basis applies the prior preview-lifecycle cumulative patch, including recording lifecycle/retry and sentence-action work. No shared reader, host, generated module, test, Git state, saved application state or deployment was changed. No other sessions were contacted. The previously missing preview-lifecycle HANDOFF.md has also been completed.

## Ranked evidence and minimal changes

All links identify preserved snapshots, so their line numbers do not depend on later shared edits.

| Priority / classification | Evidence | Candidate behavior |
| --- | --- | --- |
| P1 — source gap, reproduced with isolated DOM tests | [Raw summary, line 3007](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/raw-basis/view_simplified_source.jsx:3007) counts ready plus stale clips as `saved`. [Toolbar, line 3710](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/raw-basis/view_simplified_source.jsx:3710) labels that count “ready for playback.” Raw presence also supplies this badge when the shared readiness bridge is absent. Local playback failures reduce `ready` but leave this badge inflated. | Use the existing corrected `summary.ready`; explicitly show “Playback readiness not verified” when unavailable. Two stale clips change from 2/2 ready to 0/2 ready. A locally failed clip is excluded even before the shared summary catches up. |
| P2 — source gap, reproduced with isolated DOM tests | [Sentence status, line 3729](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/raw-basis/view_simplified_source.jsx:3729) combines “ready for playback” with an error or settings-change label. A shared corrupt clip may instead appear missing. A legacy human clip can be called ready without inspection. | Show separate ready, settings-changed, readiness-unverified, repair-needed and missing states. Unknown profile fields remain unverified. Existing stored previews stay available where previously allowed. No presence-only readiness claim. |
| P2 — source ambiguity; candidate browser verification | [Capture checkbox, line 3710](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/raw-basis/view_simplified_source.jsx:3710) is labelled only “Save.” It does not explain capture-as-played or distinguish playback from device persistence. | Name it “Save TTS as it plays,” associate visible help explaining that disabling it keeps existing clips, and direct users to the separate device-save status. Its wrapping label has a 44 CSS-pixel minimum height. The previous target is not declared a WCAG failure from source size alone. |

Candidate anchors: [badge and capture label, line 3835](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/candidate/view_simplified_source.jsx:3835), [sentence state, line 3859](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/candidate/view_simplified_source.jsx:3859), [label/style selection, line 3876](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/candidate/view_simplified_source.jsx:3876).

## Existing safeguards and nonfindings

- The review summary already separates current playback readiness from verified device storage. Its receipt-based status and persistence-only Retry are retained; no new save promise is inferred from a playable URL.
- Original and Adapted narration remain accessible through Manage narration without editing the passage. Both retains access to the adapted text editor. Original text protection is unchanged.
- Stale saved audio can still be previewed as an existing artifact without synthesizing replacement audio. Known local playback errors do not prevent the existing removal/rebuild actions. Capture being turned off does not remove clips.
- The prior isolated preview, recording and sentence-action ownership/focus guards remain dependencies of the cumulative candidate.
- The new static labels do not create additional live regions. Existing polite result announcements remain separate from controls and routine read-aloud activity.
- This change does not expand audio identity, alter the host persistence API or introduce a second cache. Any expansion to additional resource types should reuse 02/15's current identity/readiness/persistence contracts.

## Verification and limits

**143 tests passed across eight suites**, including 16 new label/readiness cases. On the prerequisite-only baseline, **13 of those 16 cases failed**; these are acceptance-case counts, not 13 independent defects. Five older Edit Audio tests encoded the misleading labels and were updated to the new meaning while preserving preview, removal, capture-limit and real-store key-agreement checks. The capture-update case now checks that Play and Remove become available while readiness remains honestly unverified without the shared bridge.

**12 Chromium scenarios passed with no page errors.** Original, Adapted and Both were checked at 320×640 CSS pixels under normal layout, spacing overrides and doubled computed fonts. All nine route/layout combinations retained a 320px document width. The fixture checks accurate labels, independent session/device counts, checkbox accessible name/help, Space activation, visible focus on capture/repair/Close, Escape return to Manage, and absence of invalid nested controls. Three additional scenarios cover background changes, unavailable readiness and touch-emulated label activation. Reduced motion is enabled.

The isolated build succeeded and root/desktop generated modules have matching hashes. Both patches reconstruct the delivered candidate against their recorded normalized bases. Earlier browser fixtures are included for integration but were not rerun or added to this step's browser count.

Storage and audio-service outcomes in the browser fixture are mocked. This does not prove device persistence, actual NVDA/VoiceOver announcements, hardware touch, Firefox/WebKit behavior, real 200% text resizing, 400% browser zoom, all themes, or assembled sticky/nested overlay behavior. No live app failure is claimed from the DOM reproduction.

## Focused route acceptance

| Route / task | Expected outcome and remaining verification |
| --- | --- |
| Original, Adapted, Both: supply one ready, one stale and one corrupt clip; Tab to Manage; Enter | Badge reports 1/3 ready. Rows distinguish ready, settings changed and repair. Narration is reachable without text Edit. Original text remains unchanged. |
| Same routes: remove the readiness bridge, or expose stored legacy audio without a current inspection | Header/row explicitly state unverified rather than claiming current compatibility. Existing preview/remove access remains when previously supported. No new durable-save claim. |
| Same routes: a playback decoder failure precedes the shared summary update | Exclude that clip from the badge; show repair status without “ready” on the failing sentence. Existing failure announcement remains intelligible and should occur once. |
| Same routes: focus Save TTS as it plays; Space; activate its label by touch | Checkbox name and checked state are meaningful; help explains capture, preservation of existing clips and the device-save distinction. Space/touch changes the preference without invoking preparation, generation or removal. Focus remains visible. |
| Background ready count changes while Manage is focused | Update the count without moving focus. If device persistence is session-only, retain 0 saved on device even when every clip is ready. Actual announcement behavior remains an AT check. |
| Enter the panel; navigate to the last repair action and Close; Escape | Each action remains reachable. Close/Escape returns visible focus to Manage; no trap or hidden control. Preserve the separate text Edit path in Both. |
| 320 CSS pixels, spacing overrides, actual 200% text and 400% browser zoom | No lost badge/status/help/control, unintended horizontal document scrolling or obscured focus. Automated fixtures cover only 320px, spacing and doubled computed fonts. Test actual zoom manually. |
| Themes, reduced motion, sticky toolbar and nested overlays on assembled 04/09/10 | Verify contrast/focus indication, scrolling and close/save access without traps. These are unverified integration cases; the focused fixture is not a complete theme/overlay audit. |
| NVDA with Firefox/Chromium; VoiceOver with Safari; hardware mobile | Verify the capture name/help, group sentence context, busy states and a clear result announcement without unwanted focus movement or duplicate speech. Confirm mobile reading/touch order. |
| Real storage: denial/quota/eviction, successful retry and app restart | “Saved on this device” must follow verified receipts and remain accurate after reopening. A failed or unconfirmed write must retain truthful session-only/recovery status. Confirm original and adapted audio do not collide. No fixture count proves this. |

These checks apply [WCAG status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) and [reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). They are not a conformance declaration. Inline word targets have relevant exceptions; no blanket sub-44px violation is asserted.

## File ownership and integration handoff

1. **01, reader/integration owner:** choose one patch. [Cumulative patch](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/cumulative-from-current-reader.patch) includes recording lifecycle, recording retry, sentence actions, preview lifecycle and this label improvement. It supersedes applying earlier cumulative patches separately. [Incremental patch](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/incremental-after-preview-lifecycle.patch) adds only this step when the preview prerequisites are already integrated. Reconcile newer shared edits; candidate source copies are comparison artifacts, not overwrite instructions.
2. This step changes only `view_simplified_source.jsx`, updates `tests/edit_audio_ui.test.js`, and adds `tests/reader_narration_labels.test.js` plus `dev-tools/reader_narration_labels_browser.cjs`. Regenerate root/desktop reader modules through the owner build process. No generated overwrite artifacts are in the patch.
3. **02, audio/readiness owner:** preserve authoritative inspection status, unknown profile fields, local quarantine handling and human-recording compatibility. **15, persistence owner:** preserve receipt validation, persistence-only retry and truthful session/device state. This patch does not change either API.
4. Assemble **04/09/10** and latest 02/15 before final route, AT, theme, mobile and durability checks. Recheck working source and deployed baseline independently.
5. Localization keys: `simplified.audio_playback_unverified`, `simplified.audio_ready_count`, `simplified.audio_save_as_played`, `simplified.audio_save_as_played_help`, `simplified.audio_clip_repair`, `simplified.audio_clip_settings_changed`, `simplified.audio_clip_unverified`. English fallbacks are present; retain prior cumulative keys.
6. Run these focused checks against the integrated reader, then complete the manual cases above. Do not convert mocked persistence results into a durability claim.

```powershell
node _build_view_simplified_module.js
node node_modules/vitest/vitest.mjs run tests/reader_narration_labels.test.js tests/reader_audio_preview_lifecycle.test.js tests/reader_sentence_audio_actions.test.js tests/reader_recording_lifecycle.test.js tests/edit_audio_ui.test.js tests/reader_narration_access.test.js tests/reader_narration_recovery.test.js tests/reader_audio_readiness.test.js --reporter=json --outputFile=validation/labels-after.json
node dev-tools/reader_narration_labels_browser.cjs
```

Evidence: [snapshot](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/snapshot.json), [manifest and hashes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/manifest.json), [before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/validation/labels-before.json), [after](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/validation/labels-after.json), [browser](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-labels-track18-2026-09-27/validation/labels-browser.json).
