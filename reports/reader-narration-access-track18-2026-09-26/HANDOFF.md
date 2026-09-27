# Track 18 — Narration access and storage review

The recommended flow is **Analysis → Read with supports → Original → Save audio / Manage narration**. Adapted text offers the same narration controls plus **Edit text**. Audio work should not require text Edit or a duplicate passage. The captured original stays protected; use the existing Create adapted companion workflow when a teacher deliberately wants different wording.

This is an isolated reader candidate, not an integrated or deployed release. No shared reader, host, storage service, generated module, Git state, or user data was changed by this work.

## Baseline and patch basis

- Investigation snapshot: 2026-09-26 22:24:31 UTC, working-tree files at HEAD `fd4044c862ed9b345b340d69cb1411a19c09dafb`, including other owners' uncommitted integration. Source hashes are in `basis-snapshot.json`.
- Reader basis SHA-256: `687866a6202a20700ba8dd40bcf59a7b8a5edc0552ffed4091f8c764a01ba9f1`.
- Later observed shared HEAD: `6b63e76e862125e87422f02a54ed60beac68e8fb`. Shared files continued changing. Local HEAD is not evidence of deployed content.
- No applicable AGENTS.md was found in the inspected ancestry or repository search.
- `narration-access.patch` contains four files: reader source, the updated existing Edit Audio fixture, a new narration-access suite, and a browser fixture. `basis/` and `candidate/` contain exact inputs/outputs. Patch reconstruction was checked against normalized line endings.
- This patch is against the captured working tree, **not** directly against either HEAD and **not** against the earlier accessibility candidate. Integrate its narrow semantic changes; do not replace the current reader with the candidate file.

## Existing safeguards and nonfindings

- Analyzed source already opens a stored `simplified` resource in the protected `same-text-supported` form. The host reuses the same original within its source family and adds a new original to history when needed: [captured host](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/AlloFlowANTI.txt:39217).
- The original already exposes Save audio inside Teacher tools. It does not need a second analysis-specific audio store: [captured reader](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/view_simplified_source.jsx:4619).
- Adapted text already has Edit text in the review summary and an Edit toolbar button. Its handler leaves Both view and focuses the adapted textarea; the captured original remains noneditable: [Edit handler](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/view_simplified_source.jsx:2095).
- Shared audio uses sentence occurrence/segment identities, synthesis compatibility, separate reference/student lanes, payload validation, storage limits, and corruption handling. Teacher recordings are distinct from generated voice audio. This candidate preserves those APIs and identities.
- Device preparedness, verified persistence, and inclusion in a delivered package are separate facts. Neither a blob URL nor an in-memory ready count proves all three.

## Ranked evidence

| Priority / classification | Evidence and consequence | Minimal change / ownership |
| --- | --- | --- |
| P1 — source gap; actual data loss not reproduced | The captured host's persistence adapter calls a function that updates React resource/history state and emits an event; it does not await the later IndexedDB history write. The reader can announce that all audio is saved before durable storage completes. [Host attachment](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/AlloFlowANTI.txt:32122), [adapter](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/AlloFlowANTI.txt:32603), [debounced write](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/AlloFlowANTI.txt:23550), [completion notice](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/view_simplified_source.jsx:2808). | Track 15 owns verified storage receipts and save retry; track 02 owns audio readiness presentation. Do not solve this by generating clips again or by adding another store. Integration must distinguish Prepared for this session, Saving to this device, Saved on this device, and Save failed. |
| P2 — source-confirmed access gap | `renderEditAudioSentenceTools` returns null outside text Edit; protected originals cannot enter text Edit. Per-sentence playback/replacement/recording therefore lacks a direct original-reading route. [Guard](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/view_simplified_source.jsx:3259), [protected original](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/view_simplified_source.jsx:1933). | Candidate moves the existing narration panel beside teacher review, independent of text Edit. It keeps the same audio handlers. |
| P2 — source-confirmed discoverability gap | Original readings are excluded from the review summary, hiding the prominent preparedness count and Save action available on adapted text. [Summary gate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.tmp/reader-tts-review/view_simplified_source.jsx:3898). | Candidate includes original audio in review but omits its text-edit row. It explicitly names whether narration belongs to Original or Adapted text. |
| P2 — reproduced in isolated Chromium fixture | At 320 CSS pixels with doubled computed fonts, Both view had a 360-pixel page width. A comparison source selector label shrank to 23 pixels while its text overflowed. | Candidate gives comparison labels a full row at narrow widths and a minimum flex basis above that breakpoint. Page width remains 320 pixels in the reproduced case. This is a fixture finding, not a claim about actual browser text zoom or a deployed release. |
| Verification dependency | Storage quota failure, eviction, immediate close/reopen, interrupted recording, delivered-package audio, real AT announcements, and hardware mobile behavior were not exercised against the application. | Complete the acceptance routes below after assembling 04/09/10 and the 02/15 audio changes. |

The later shared checkout already contains `__alloGetReadAloudReadiness(sentences, lane)` and `__alloRetryReadAloudPersistence(lane, options)` in [the host](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:32893). It also distinguishes verified persistence receipts from mere attachment in [the service](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/read_aloud_audio_service_source.jsx:559). These were observed in source, not end-to-end verified. The captured candidate deliberately retains the earlier summary contract; 01 must carry forward 02/15's newer readiness and receipt handling rather than replacing it with this snapshot.

## Implemented reader delta

- Manage narration is visible for teachers in Original, Adapted, Both, and text Edit. It is hidden in student view, layout preview, and Focus view.
- Existing sentence controls are reused once; no duplicate audio panel or text editor is introduced.
- Enter and Space toggle the disclosure. The expanded state and controlled region are exposed semantically. Closing with Escape or Close narration returns focus to the disclosure. Tab remains ordinary document navigation, with no focus trap.
- Existing playback/recording shutdown behavior remains; a late microphone permission result is released after author controls become hidden. Returning to teacher view does not leave Record disabled by that old request.
- Sentence action buttons are at least 44 CSS pixels tall; long sentence strings wrap. This is a usability improvement, not a finding that every smaller inline word target violates WCAG.
- Sentence splitting and summary lookup are memoized so moving the controls into reading view does not rerun them on every unrelated playback render.
- The original's text Edit remains unavailable. Both → Edit text continues to open and focus only the adapted editor. Creating a companion remains an intentional, separate text-authoring action.

New fallback translation keys: `simplified.manage_narration`, `simplified.close_narration`, `simplified.narration_original_scope`, and `simplified.narration_adapted_scope`. Add these to language packs through the normal localization owner workflow.

## Validation and acceptance

**40 tests passed across three focused suites**: 12 narration access/lifecycle cases, 22 existing readiness cases, and 6 existing Edit Audio cases. These use jsdom and mocked media/storage interfaces. They do not prove real screen-reader or persistent-storage behavior. The existing React test-utils deprecation warning remains.

**17 isolated Chromium scenarios passed**: Original/Adapted/Both × normal, text spacing, doubled computed fonts, dark theme, and contrast theme; plus Both → Edit focus and student control exclusion. The fixture uses 320 × 640 CSS pixels, touch emulation, reduced motion, real browser keyboard events, and no application server or live TTS/storage. Save-error text is checked in a polite status region. The comparison overflow was reproduced before its fix. Root/public generated reader modules in the isolated candidate match byte for byte.

Evidence: `validation/narration-tests.json`, `validation/narration-browser.json`, and the browser fixture in `candidate/dev-tools/`.

| Route / task | Required focus, announcement, visibility, and persistence outcome |
| --- | --- |
| Analysis → Read with supports → Original | Save audio and Manage narration are reachable without text Edit. The original wording, source snapshot, and source family remain unchanged. Reopening selects the same persisted original and its audio. |
| Adapted → Both → Edit text | Edit is visible without expanding Teacher tools. Activation leaves Both, stops conflicting playback, focuses the adapted textarea, and preserves the original. Done editing remains reachable. |
| Manage narration with keyboard | Enter/Space announces expanded/collapsed through the button state. Tab reaches sentence controls and Close. Escape/Close restores the opener with visible focus, without trapping Tab or creating nested interactive controls. |
| Prepare and save narration | Announce progress and completion without moving focus. A control focused during preparation must remain reachable on completion; integration must not remove the active Save/Retry control without restoring focus. Report verified device saving separately from synthesis readiness. |
| Prepared audio, device write fails | Keep usable session audio and teacher recordings. Display Save failed or Not yet saved to this device, with Retry saving. Retry persistence without resynthesizing. A storage-unavailable API must not produce a Saved claim. |
| Partial generation / cancel / voice change | Preserve completed clips, show remaining work, suppress stale completion messages, and generate only missing/incompatible AI clips. Preserve teacher recordings. |
| Close/reopen or browser restart | After a verified device save, rehydrate matching audio and play without a new synthesis call. Simulate denied storage, quota errors, text-only recovery, deletion/eviction, and interrupted writes. Never infer durable success from memory alone. |
| Original and adapted sharing/export | Explicitly verify which reading version and audio are included. Device saving must not imply another device or offline package received narration. |
| 320 px / 200% text / 400% zoom / spacing | All Save, Retry, Record/Stop, Edit/Done, and Close actions remain reachable; no lost content or obscured focus. Apply line-height 1.5, paragraph spacing 2em, letter spacing .12em, word spacing .16em. Use real browser zoom/text resizing for final checks. |
| NVDA/Firefox or Chrome; VoiceOver/Safari; mobile hardware | Confirm names, expanded state, current recording sentence, progress/error/result announcements, touch activation, microphone permission recovery, and focus after close. These remain manual verification, not certified by the fixtures. |

Disclosure behavior follows [W3C APG disclosure guidance](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/). Status announcements and spacing acceptance follow [WCAG 2.2 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) and [Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

## Integration order and ownership

1. **01 — shared reader/host/build integrator:** port the bounded source changes and comparison flex fix to the assembled reader. Keep newer 02/15 audio logic. Do not apply the complete candidate file over concurrent changes. No other sessions were contacted by this track.
2. **02 — reader/audio readiness:** retain current stored-URL playback, URL-scoped errors, accurate counts, and stable focused Save/Retry controls. Apply the same readiness presentation to the now-visible original summary and narration panel.
3. **15 — durable audio/media:** supply verified device receipts, persistence retry without synthesis, and honest export/device scope. Use the existing readiness/retry APIs; do not add a second implementation for originals.
4. **04/09/10 and reader owner:** assemble reading, editing, and navigation dependencies, regenerate root/public reader modules through the standard build, then run the targeted suites/fixture and the manual routes above against the actual release candidate.

No new analysis-specific TTS store or verbatim-copy feature is required for this narration flow. If teachers later need an exact editable copy instead of an AI-created adaptation, that should be an explicit source/reader contract with a new identity and preserved provenance; the existing Create adapted companion action must not be mislabeled as an exact copy.
