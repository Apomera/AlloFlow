# Track 18 — Stored-audio preview lifecycle

The isolated candidate prevents delayed Play/resume results from changing a closed or different reading, reports each playback failure once, and preserves visible keyboard focus while a preview loads. Shared application files and saved data remain unchanged.

## Baseline

Captured 2026-09-27T14:24:10.068Z: HEAD `af3c6b82ab76dad40a5d44f785bf828d1adea86c`, reader SHA-256 `dd5f57089b3e9beb79922c8afbd494f7bca56b33607094abcebfa55edaa29a31`. These remained unchanged at packaging and the continuation check. This identifies the local working reader, not the deployed release. No applicable AGENTS.md was found in the inspected ancestry or repository search.

The prerequisite basis adds the earlier isolated sentence-actions cumulative patch, including recording lifecycle/retry improvements. Those changes were not present in the shared reader at capture.

## Ranked evidence

Paths below are relative to this report directory; line numbers refer to its preserved snapshots.

| Priority / classification | Evidence | Minimal change |
| --- | --- | --- |
| P1 — source gap, isolated regression and controlled Chromium reproduction | `raw-basis/view_simplified_source.jsx:3214`: the resumed-element branch awaits Play without checking request ownership. Late success/rejection can update another view or report its clip as damaged. | Guard fresh and resumed requests by element, token, reading/text/language context, panel eligibility and URL. Retire obsolete elements without pausing a newer request on the same element. |
| P1 — source gap and controlled reproduction | `raw-basis/view_simplified_source.jsx:3267` and `:3283` can report the same failure through an error event and rejected promise. `:2671` does not distinguish native media-aborted code 1. | Invalidate the request before reporting. Treat interruption and autoplay denial as retryable, without quarantining the clip. |
| P2 — browser-observed focus obstruction and isolated regression | `raw-basis/view_simplified_source.jsx:3734`: native disabling and a growing status above the nested sentence list can lose or obscure the focused Play control. | Keep the active loading action focusable with busy/unavailable semantics and guarded activation; scroll the existing focused preview control into view when its status changes. |
| P2 — source gap and controlled reproduction | `raw-basis/view_simplified_source.jsx:2630` stops audio without replacing the Playing notice; context/URL changes do not consistently retire paused previews. | Report stopped on Close; stop obsolete previews on text/language or stored-URL changes. If the focused clip disappears, move focus to the same sentence's Generate action. |

Candidate anchors: `candidate/view_simplified_source.jsx:2713` ownership; `:2727` failure handling; `:2735` focus visibility; `:2950` context/URL invalidation; `:3318` Play/resume; `:3546` Close; `:3863` active-preview button semantics.

## Safeguards retained

- Narration remains available for Original and Adapted readings without entering text Edit. Original text stays protected.
- Stored playback continues at playbackRate 1. A voice-only preference change does not invalidate a preview of an existing artifact or human recording.
- Autoplay denial does not certify corruption. A stale failure cannot quarantine a replacement clip.
- Playback readiness and verified device persistence remain separate; this work does not implement or certify storage durability.
- No host API, audio identity, shared generated module, Git state, deployment or other session was changed.

## Validation

The prerequisite-only baseline failed 18 of the 19 new acceptance tests; these are case counts, not 18 independent defects. The final isolated candidate passed **127 tests across seven suites**, built successfully, and produced equal root/desktop generated-module hashes. Both delivered patches reconstruct the candidate against their recorded normalized bases.

**14 Chromium scenarios passed with no page errors.** Nine covered Original/Adapted/Both at 320×640 CSS pixels under normal layout, text-spacing overrides and doubled computed fonts. Five covered delayed resume/navigation, clip replacement, removed paused clips, injected autoplay denial, and one-time reporting of native decoder failure. The fixture uses muted native audio with a local silent WAV and invalid local media. Promise acknowledgements are gated for deterministic races; persistence is mocked. A touch-emulated resume and reduced motion were included.

Earlier browser fixtures are carried as integration dependencies but were not rerun in this step. Actual screen-reader announcements, hardware mobile input, Firefox/WebKit, true browser text/400% zoom and storage after restart remain unverified.

## Focused acceptance and handoff

1. Original, Adapted and Both: focus Play, activate twice while loading, pause and resume. One request runs per attempt; the busy action retains visible focus. Ended audio must not revert to a Playing label when a delayed promise resolves.
2. While resume is pending, Escape or Close. Audio stops, Manage narration receives visible focus, and a late result cannot replace the stopped notice. Repeat after navigating to another reading with the same stored URL; the new reading must remain unaffected.
3. Change text/language without changing the reading ID, replace a clip, remove a paused clip, hide author controls, or unmount. Obsolete playback stops. Removal of the focused clip recovers to its Generate control; focus that the user moved elsewhere is preserved.
4. Trigger an error event plus rejected Play promise. Report one failure. AbortError/native aborted media and autoplay denial permit retry without quarantine.
5. At 320 CSS pixels, user spacing, actual 200% text and 400% zoom, confirm no lost labels/actions or obscured focus. Check every theme, sticky/nested overlays and Close. Verify meaningful sentence context, busy state and result announcements with NVDA and VoiceOver. DOM semantics are not proof of announcements.
6. Reader owner 01: select one patch. `cumulative-from-current-reader.patch` includes prior recording/retry/sentence-action dependencies. `incremental-after-sentence-actions.patch` adds only preview work when those dependencies are already integrated. Do not apply both or overwrite newer reader source with the comparison copy. Regenerate reader modules through the integration build.
7. Preserve 02's audio identity/readiness and 15's persistence contracts. Assemble 04/09/10 before final checks and identify the deployed baseline separately. Real quota/eviction, cancellation and reopen durability checks belong to integration.
8. Add localization keys `simplified.audio_preview_interrupted`, `simplified.audio_preview_changed` and `simplified.audio_preview_stopped`; English fallbacks are included.

W3C guidance: [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) and [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). This is focused verification, not a conformance claim; inline word-target exceptions still apply.

Evidence: `manifest.json`, `snapshot.json`, `validation/preview-before.json`, `validation/preview-after.json`, `validation/preview-browser.json`. Reproduce in an isolated checkout with captured dependencies:

```powershell
node _build_view_simplified_module.js
node node_modules/vitest/vitest.mjs run tests/reader_audio_preview_lifecycle.test.js tests/reader_sentence_audio_actions.test.js tests/reader_recording_lifecycle.test.js tests/edit_audio_ui.test.js tests/reader_narration_access.test.js tests/reader_narration_recovery.test.js tests/reader_audio_readiness.test.js --reporter=json --outputFile=validation/preview-after.json
node dev-tools/reader_audio_preview_lifecycle_browser.cjs
```
