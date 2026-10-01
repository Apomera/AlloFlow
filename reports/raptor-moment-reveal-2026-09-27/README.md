# Raptor Lab: interactive saved-image comparison

Two saved 3D moments now unlock **Compare images with a slider**. Learners can inspect a larger composite image, drag directly across it, use a native keyboard-accessible range control, or choose Show A, Split view, and Show B. The viewer identifies both moments and invites learners to trace a visible feature before writing an observation.

The original saved images are displayed without cropping, resampling into new evidence, or changing their stored contents. The reveal clips moment B over moment A. Each image retains its original framing; matching camera settings does not promise identical size or alignment across species and poses. Existing camera, region, background, lighting, and flight-identity caveats remain visible in the viewer. The original cards and readings remain below it.

## Interaction and state

- Opening or using the viewer pauses flight through the existing idempotent pause command. Closing it does not resume flight.
- The split position is transient React UI state. It does not change saved images, measurements, notebook copies, or exported reports.
- A replacement pair starts closed at 50%. Editing observation text preserves the current reveal position.
- The feature appears only when both records contain permitted JPEG data URLs. If an image cannot decode, the viewer displays a readable fallback while preserving the saved readings and observation cards.
- Horizontal pointer dragging uses element pointer capture, which is released on completion or cancellation. There are no document/window drag listeners or animation loops. Vertical touch scrolling and pinch zoom remain permitted; the native range and buttons provide alternative controls.
- Phone controls retain 44-pixel minimum target heights. Keyboard operation, reduced motion, and forced colors are covered by the browser checks.

## Verification

The final Chromium run passed all **9 scenarios in 2.7 minutes**, with no failures, skips, or retries, across the new reveal, saved-observation, and report suites. Source syntax, desktop mirror parity, scoped whitespace, and all eleven translation-manifest entries passed. Final results and source hashes are recorded in `verification.json`. The dedicated browser suite captures two actual simulated flight moments, verifies the rendered left and right halves against the endpoint images, checks mouse dragging and release, keyboard endpoints and increments, touch dragging and cancellation, immutable saved data, no simulation redraws while using the viewer, preserved notebook images, and two original images in the offline export. It also covers viewing caveats, replacement pairs, missing/unsafe/unreadable images, responsive layouts, scoped accessibility, and forced colors.

The initial slider-only run passed all three new scenarios. Adding direct dragging exposed a focus issue: the browser's default mouse-down handling blurred the range after it was focused. The mouse pointer handler now prevents that default while retaining touch scrolling. The corrected pointer run passed all three scenarios before the final regression run.

`comparison-desktop.png`, `real-comparison-phone.png`, `real-a.png`, `real-b.png`, and `real-split.png` use actual captured flight images. `comparison-phone.png`, `comparison-forced-colors.png`, and `viewing-caveats.png` use simple synthetic image fixtures to isolate interaction and accessibility checks; they are not bird-model previews. `real-reveal-checks.json` records the pixel comparisons and evidence checks.

The original images remain 480 × 320, so enlarging them does not create additional detail. This pass adds image compositing and interface elements, but no Three.js geometry, textures, lights, render passes, or simulation animation loops. Tests use local Chromium; they are not physical-device performance measurements.

## Scope

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Eleven English-fallback translation keys are listed in `translation-keys.json`; shared language-pack integration remains pending. Shared hosts, catalogs, harnesses, and language packs are untouched. All changes are local; no commit, push, or deployment was performed.
