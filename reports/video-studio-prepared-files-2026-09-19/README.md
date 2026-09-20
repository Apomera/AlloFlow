# Video Studio prepared-file reliability

Completed September 19, 2026. Local changes only; no deployment.

## Improvements

- Finished-video status distinguishes an up-to-date export, changes since export, and an export belonging to another take. Added Prepare updated export / Prepare selected take and Open prepared take actions.
- Change detection includes title, export choices, trim, captions, zooms, overlays, and source/added audio. Undoing an edit restores parity; preview speed does not change export state. Scene exports retain their separate scene guidance.
- Finished-video bundles and Send use the prepared caption snapshot, including trimmed timings, even when caption output was disabled or captions were subsequently edited. Caption readiness uses that snapshot too.
- Send captures its prepared file before asynchronous thumbnail work. Older preview requests cannot overwrite newer thumbnails or thumbnails for replacement exports.
- Thumbnail generation waits for a decoded frame after seeking, releases its temporary video, and allows 15 seconds before reporting failure. The missing JPEG conversion helper for Download thumbnail is implemented.
- Re-encoding waits for the first kept frame and an active audio context, draws the canvas before recording, and requests its initial frame when supported. Empty output is rejected before replacing the previous prepared file.
- Replaced an existing demo-stop test's fixed 10 ms delay with polling for its actual stop signal.

## Verification

- All 236 tests passed across five Video Studio test files (vitest-final.log). This includes eight prepared-file regression tests covering thumbnail request ordering, export ownership, frame readiness, JPEG conversion, and prepared-caption fallback behavior.
- Full Chromium workflow passed (verify-browser.cjs, results.json): two consecutive real exports, edit/undo/freshness states, direct export update, switching and returning to the prepared take, original transcript and bundle captions with trimmed times, thumbnail rebuild and downloaded JPEG.
- 390px mobile layout fits without horizontal overflow. The final prepared-mobile.png was visually inspected and shows a playable video with the update action and warning.
- Standalone and desktop HTML copies match; JavaScript parses; scoped git diff whitespace check passed.

The initial runs found and resolved an empty-recorder startup race, premature thumbnail drawing, and the missing thumbnail download helper. Early timeout logs are retained for context; vitest-final.log and results.json record the successful final verification. Thread workers avoided a test worker startup timeout on this machine.
