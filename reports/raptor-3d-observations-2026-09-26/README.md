# Raptor Lab: compare live 3D observations

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.

This pass connects the 3D study camera to the field notebook. Learners can keep two frozen moments, try a maneuver between them, inspect a visual comparison, and transfer an observation with its original readings into an investigation.

## What changed

- **Keep moment** captures a cropped image from the live WebGL scene with the species, mission, camera view, pose, airspeed, height above ground, and elapsed flight time. The existing study lighting remains identified in the interface. Captures are simulation images, not photographs or animal measurements.
- **Review kept moments** returns to paused flight and focuses the comparison below the simulator. It also exits fullscreen when necessary. A single frozen instant cannot be captured twice into the working pair; two saved moments fill the pair until the learner explicitly removes one.
- A responsive comparison presents two images, their readings, and an observation field for each. Within the same flight it shows speed and height changes. Across separate flights it explains that the readings are not a controlled trial. Both cases remind learners that camera angle and multiple changing conditions affect interpretation.
- Typing an observation pauses the flight through an idempotent command. Removing moments and opening the notebook also leave the flight paused. Reading or writing does not advance the simulation clock.
- **Add to notebook** requires a starting prediction and an observation. It copies the original image, readings, and words into the eligible investigation, invalidates its previous self-review, prevents duplicate insertion, and respects the 12-observation notebook limit. Editing or deleting the working pair does not rewrite notebook evidence.
- The notebook displays the saved image and model readings. Its text download includes the original written observation, species, pose, view, mission, speed, height, and elapsed time. TXT downloads do not embed the image.
- A link opens the dive investigation when no eligible notebook is active. Opening it does not silently create evidence or replace other investigation records.
- Study mode now gives the scene the full fullscreen area instead of leaving flight instruments and controls below it. In short fullscreen windows the study panel scrolls within half the viewport. The mobile Run controls give the study action its own row.
- Removing the last moment restores focus to the study button without taking that button out of keyboard tab order.

## Persistence and resource limits

The working pair uses the existing host's `toolData.raptorHunt.flightStudyMoments`. It survives flight restart and host remount with saved session state. Notebook copies use the existing investigation evidence schema with a discriminated `flight-study` reading; calculator readings continue to use their original comparison logic.

Images are 480 × 320 JPEGs captured only on an explicit click. Encoding quality is reduced if needed to keep each image data URL below 48,000 characters. Only two working images are retained. If image readback fails or cannot meet the budget, the readings remain available with a visible image-unavailable state. Display accepts bounded JPEG data URLs, not arbitrary remote image URLs. There is no new storage service, transport, rendering loop, geometry asset, or texture download.

Saving reuses the existing paused renderer and does not run physics, prey movement, or mission timers. Copied notebook readings are separate objects; saved JPEG strings are immutable. The host's existing persistence rules still determine how a lab session is retained.

## Validation

The new real-WebGL browser coverage verifies:

- Image dimensions and nonblank pixel content, bounded encoded size, immutable original images, and readable before/after captures.
- Saved values against the diagnostic speed readout's documented rounding, with the simulation clock unchanged during capture and review.
- A real dive between moments, distinct poses and images, same-flight differences, and different-flight comparison messaging.
- Required prediction and observation, immutable notebook transfer after a later edit, duplicate prevention, original text and readings in the download, and safe removal of both working moments.
- Restart and host-session restoration, graceful image-readback failure, 420px embedded and phone layouts, forced colors, reduced motion, and scoped axe WCAG A/AA checks.
- Short-screen native fullscreen, exiting to the comparison, and repeated note-pause commands without accidentally resuming.

The initial workflow check exposed a test precision error: the existing diagnostic snapshot rounds m/s to two decimal places, while saved readings preserve full precision. The test now uses the resulting conversion tolerance. Both workflow checks passed after correction. The combined run passed 15 checks and exposed a fullscreen-exit focus race. Focus now waits for the browser fullscreen-change event, with listeners and timers removed during cleanup. All three affected observation checks passed afterward with no retries: **16 unique scenarios validated across the combined run and targeted follow-up**, not a clean single combined run. The scoped axe checks reported zero violations. Syntax and whitespace checks passed; the canonical and desktop files are byte-identical. `verification.json` records the runs and final source hash.

Reproduce the combined run:

```powershell
npx playwright test tests/e2e/raptor-study-observations.spec.ts tests/e2e/raptor-study-mode.spec.ts tests/e2e/raptor-investigations.spec.ts tests/e2e/raptor-input-pause.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-3d-observations-2026-09-26/final-browser-results
```

These are local Chromium/WebGL checks, not a physical-device benchmark, whole-lab accessibility certification, or classroom engagement study. The earlier engagement report documents the pre-existing broader unit-suite failures; this pass runs focused browser regression coverage.

## Integration and review

- Canonical source: `stem_lab/stem_tool_raptorhunt.js`.
- Exact desktop distribution mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`.
- New tests: `tests/e2e/raptor-study-observations.spec.ts`.
- `translation-keys.json` inventories 36 new literal keys with English fallbacks. Shared language-pack integration remains pending; shared host, harness, catalogs, and handoff files were not edited.
- `capture-desktop.png` shows the new capture and review controls.
- `comparison-desktop.png` shows a flight-to-dive comparison.
- `comparison-phone.png` shows the narrow layout and explicit image-failure fallback.
- `study-fullscreen-short.png` shows study mode in a short fullscreen viewport.

All changes are local. No commit, push, or deployment was performed.
