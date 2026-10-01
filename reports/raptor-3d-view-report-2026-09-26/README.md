# Raptor Lab: matched 3D views and visual reports

This pass makes the frozen 3D observations easier to compare and keep. Learners can return to the camera settings of their first saved moment, then download an illustrated record of their images, simulation readings, and written observations.

## Behavior

- **Match saved view** restores moment A's orbit relative to the bird's heading, elevation, and view distance. It supports custom orbits as well as the four presets. The action leaves the simulation frozen and preserves the original flight camera for the return to flight.
- The control changes to **View matched to A** when the settings match. Orbiting, choosing another preset, or changing the distance updates that state. Removing A makes the remaining moment the reference; saved session restoration also restores the reference.
- The comparison states whether both moments have matching camera settings, different settings, or missing camera metadata. Missing flight identifiers are explicitly reported as unknown. Same-flight speed and height differences remain available; separate flights retain their existing contextual explanation.
- **Download visual report** saves a self-contained HTML file with embedded images, species and mission, pose and view labels, airspeed, height above ground, elapsed time, current written notes, and the comparison context. It works with one or two moments, missing images, and older records without camera metadata. Downloading pauses the flight without toggling an already paused flight back on.
- The report has a responsive layout, offline images, and print styling. It uses system fonts and needs no external assets or scripts. Learner text is added with DOM `textContent`; image sources are restricted to the existing bounded JPEG data URLs. A restrictive content security policy is embedded in the file.

Matching the settings helps learners inspect a pose; it does not make the simulation a controlled trial. The bird can pitch or bank, camera clearance can respond to terrain, and images are cropped individually. The report identifies simulation readings, study lighting, and the lack of a shared image scale. It exports the current working observations, independently of earlier immutable notebook copies.

## Implementation and scope

- Canonical module: `stem_lab/stem_tool_raptorhunt.js`.
- Byte-identical desktop distribution: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`.
- Browser coverage: `tests/e2e/raptor-study-report.spec.ts`.
- `translation-keys.json` inventories 16 new literal translation keys with English fallbacks. Shared language-pack integration remains pending.

The new optional `view` object on `flightStudyMoments` contains a normalized heading-relative azimuth, elevation, distance, and preset identifier. Invalid or absent metadata disables matching without losing the original observation. The existing two-moment capacity and JPEG size budget remain in force. No new rendering loop, model asset, storage service, or host API was added. Shared host, harness, catalogs, language packs, and coordination files were not edited. No commit, push, or deployment was performed.

## Verification

The new real-WebGL checks cover custom orbit and zoom matching, frozen physics and clock, exact flight-camera restoration, persistence across host remount, reference changes after removal, different-view explanations, narrow layouts, reduced motion, forced colors, offline image decoding, export text escaping, legacy data, and one-moment export. Accessibility checks cover the affected application controls and the standalone report.

The initial three new scenarios passed. The final combined run passed **9 of 9 scenarios with no retries**, including the existing study-mode and saved-observation regressions. The scoped accessibility checks reported zero violations. Both distribution files passed JavaScript syntax checks and are byte-identical; whitespace checks passed. `verification.json` records the results and source hash. The broader unit suite was not rerun; its existing baseline failures are documented in the earlier Raptor engagement report.

Reproduce the focused regression run:

```powershell
npx playwright test tests/e2e/raptor-study-report.spec.ts tests/e2e/raptor-study-mode.spec.ts tests/e2e/raptor-study-observations.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-3d-view-report-2026-09-26/final-browser-results
```

Visual review artifacts use illustrative notes and a deterministic local simulation:

- `matched-study.png` and `matched-study-phone.png`: matching control in the live study interface.
- `comparison-desktop.png`: two kept observations with a visual-report download.
- `flight-observations.html`: the actual downloaded, self-contained sample report.
- `report-desktop.png`, `report-phone.png`, and `report-print.png`: rendered report layouts. The print image checks print CSS, not physical printer output or pagination.

These are local Chromium checks, not a classroom engagement study or physical-device benchmark.
