# Track 18 follow-up — mobile viewport and reader overlays

Completed as an isolated candidate on audited HEAD `fd4044c862ed9b345b340d69cb1411a19c09dafb`, extending the first track-18 candidate. The shared checkout still reports this HEAD and does not yet contain the first candidate's instance-ID or new viewport helper. Concurrent uncommitted source remains separate. This is not a deployed-release verification.

## Fixed, with reproduced evidence

| Priority | Evidence | Correction | Candidate source |
| --- | --- | --- | --- |
| P1 | Chromium with synthetic keyboard-open viewport: visible height changed from 640 to 220 while the popup remained at y=312. Its input and actions were outside the simulated visible area. | Clamp popup bounds to VisualViewport dimensions and offsets. Coalesce resize/scroll events into one animation frame, update only popup styles, and remove listeners/cancel pending work on dismissal. Fall back to window dimensions when the API is absent. Input value and focus survive resizing. | `candidate/view_simplified_source.jsx:1083`, `:1101`, `:3382` |
| P1 | At 320×256, Karaoke's toolbar consumed the available height and its focused passage word was not visible. | Make the overlay scrollable and give its passage a minimum usable height, so users can reach both controls and text. | `candidate/immersive_reader_source.jsx:2251`, `:2412` |
| P1 | Simulated 200% text made Karaoke 361px wide inside a 320px viewport. | Wrap its audio and speed control groups, permit text wrapping, and allow flex children to shrink. | `candidate/immersive_reader_source.jsx:2251` onward |
| P1 | Simulated 200% text made the Immersive/Chunk header overflow to 325px; the Close control was partly offscreen. | Allow the header row to wrap. The final fixture checks that Close fits horizontally and remains visible. | `candidate/immersive_reader_source.jsx:450` |

These are browser-fixture reproductions. The keyboard-open viewport is synthetic, not a real phone keyboard. Before results and screenshots are in `validation/before-*`; final results are in `validation/browser-results.json` and `validation/overlay-results.json`.

## Verification

- **252/252 focused tests passed across 15 suites.** After the final header adjustment, the **38 affected overlay tests passed again**. JSON reports are included.
- **34 Chromium fixture checks passed** on Chromium 148.0.7778.96: the original 12 cases plus 22 follow-up cases.
- Follow-up coverage includes touch-emulated Selected passage dismissal; synthetic keyboard resize and viewport pan; Focus/Crawl/Karaoke Tab loops and Escape return to the surviving parent; short viewports; simulated doubled text; forced-colors focus visibility; Focus/Karaoke dark and sepia layouts; reduced-motion Crawl startup; and Immersive/Chunk toolbar navigation.
- Added viewport lifecycle tests exercise definition, phonics, revision and selection popups, event coalescing, focus preservation, cleanup after close, and API fallback. Prepared word-help uses the same positioning hook.
- Both root/public pairs of generated view and immersive modules match byte-for-byte in the isolated candidate.
- No additional keyboard-loop or Escape failure was reproduced in Focus or Crawl. Existing theme and reduced-motion safeguards remain in place. Passing geometry/visibility checks do not establish color-contrast compliance or screen-reader behavior.

## Integration files

- `track18-followup.patch`: five files; apply after the first track-18 candidate has been integrated.
- `track18-combined.patch`: ten files; includes the first candidate and this follow-up against the audited Git baseline.
- **Choose one patch; do not apply both.** Both were independently checked, applied to disposable starting files, and compared with candidate contents after CRLF/LF normalization. Hashes are in `manifest.json`.
- `candidate/` contains source, tests and fixtures for review. Generated bundles are omitted from the patches; regenerate from the assembled source.

The shared reader owner/integrator should port the source changes into assembled 04/09/10. Do not replace the current shared reader with the baseline snapshot. Preserve concurrent reading-place, generation and word-help changes and any updated build-input concatenation. Track 18 owns the new fixture/test coverage; source ownership spans the reader and immersive-reader owners. Asset builds and host pins remain with the integrator/release owner. No deployment or external coordination was performed.

Build and browser reproduction commands from the integrated checkout:

```powershell
node _build_view_simplified_module.js
node _build_immersive_reader_module.js
$env:READER_EXTENDED_CHECKS='1'
node dev-tools/reader_route_browser.cjs
```

The focused Vitest suite list is the first handoff's 11 suites plus `immersive_reader_dialog_a11y`, `immersive_reader_review_runtime`, `immersive_reader_target_size_a11y`, and `focus_reader_manual_navigation` (all under `tests/`, with `.test.js`). The isolated workspace remains `../../.tmp/reader-a11y-isolated18/`.

## Remaining acceptance gates

Real NVDA/VoiceOver testing, physical touch devices and on-screen keyboards, actual 200% browser text enlargement, and actual 400% browser zoom were not performed. The [first handoff](../reader-accessibility-track18-2026-09-26/HANDOFF.md) contains the route-by-route tasks and expected announcements, focus destinations and visibility outcomes. Complete those after 04/09/10 integration, including background isolation in screen-reader browse mode and save/error announcements. Record the actual deployed release separately if testing deployment.

For the mobile follow-up specifically: open Custom revision, type an instruction, show/hide the keyboard, rotate the phone and pan while zoomed. The input, Continue and Close must remain reachable; entered text and focus must survive repositioning. For Karaoke and Immersive/Chunk: traverse from Close through settings to the passage and back with enlarged text and short landscape height; no focused item or required control may become unreachable.

References: [VisualViewport behavior and events](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [W3C modal-dialog behavior](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
