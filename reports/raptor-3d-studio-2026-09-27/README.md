# Raptor Lab: studio presentation for 3D study

Study mode now opens against a quiet radial backdrop with warm key light, soft sky fill, and a cool rim light. The aim is to make the existing bird's feather layers, face, beak, and silhouette easier to inspect. The **Studio / Habitat** switch brings the environment back without moving the camera or changing the frozen pose. The choice persists between study sessions in the current flight; restarting starts in Studio.

The header has a restrained gradient, a clearly selected presentation button, and 44-pixel controls. The study camera measures both the header and control panel before framing the bird, keeping phone and short-fullscreen layouts usable. There is no automatic orbit or added animation loop.

## Saved observations

- Kept moments record their presentation in the validated camera settings and carry a readable lighting label in their image alternative text, captions, notebook readings, text exports, and visual report.
- **Match saved view** restores presentation as well as anatomy region, orbit, and distance. Different lighting cannot be mistaken for an exact view match.
- Comparisons made in different presentations explain that lighting and background can change the appearance of feathers, and offer the existing matching action.
- Older valid camera records without a presentation use Habitat, matching the previous rendering. Unrecognized presentation values disable matching while preserving the observation.

## Rendering and scope

The existing live bird, materials, morph weights, physics, and timing are unchanged. Studio uses three lights without shadow maps and one lazily allocated 512-by-512 canvas texture. Its synchronous draw temporarily hides the other scene roots, removes fog, and uses a fixed exposure. A `try/finally` restores root visibility, background, fog, and exposure, including after a render failure. Normal habitat rendering continues through its existing path. Leaving Studio refreshes habitat shadows; teardown removes the lights and disposes the texture.

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. New dedicated coverage: `tests/e2e/raptor-study-studio.spec.ts`. Shared host code, catalogs, language packs, and test harness are untouched. Eight new translation keys have English fallbacks; shared language-pack integration remains pending in `translation-keys.json`.

This is a local change; no commit, push, or deployment was performed. Images are simulation illustrations with presentation lighting, not calibrated color or scale measurements.

## Validation

The three new Chromium/WebGL scenarios passed without retries after correcting a test probe that assumed the bundled Three.js texture had a `userData` field. The product code did not require a correction for that probe error. The tests cover actual render isolation, exact frozen model and habitat state, restoration after an injected renderer exception, no idle rendering, view matching, saved image metadata, offline report content, legacy and invalid records, a nocturnal owl, phone layout, keyboard activation, reduced motion, forced colors, scoped axe accessibility, restart, and texture disposal.

All 12 existing anatomy, study-mode, observation, and report regression scenarios passed in one clean run (5.9 minutes, no retries), bringing this pass to **15 unique scenarios validated** across the two successful runs. Scoped axe checks reported zero violations. Both source files passed syntax checks, scoped whitespace checks passed, and their SHA-256 hashes match. Results and the synchronized source hash are recorded in `verification.json`. Browser checks use the repository's Chromium/WebGL harness at low graphics quality; these are not physical-device benchmarks or measured engagement outcomes.

```powershell
npx playwright test tests/e2e/raptor-study-studio.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-3d-studio-2026-09-27/refined-test-results
npx playwright test tests/e2e/raptor-study-anatomy.spec.ts tests/e2e/raptor-study-mode.spec.ts tests/e2e/raptor-study-observations.spec.ts tests/e2e/raptor-study-report.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-3d-studio-2026-09-27/regression-test-results
```

## Visual artifacts

- `peregrine-studio.png` and `peregrine-habitat.png`: the same frozen pose and camera in both presentations.
- `peregrine-head-studio.png`: a close-up showing the face, beak, and feather texture.
- `owl-studio.png`, `owl-studio-phone.png`, and `owl-habitat-phone.png`: a nocturnal perched owl on desktop and phone.
- `studio-observations.html`: an actual downloaded report with Studio and Habitat observations.

Screenshots were visually inspected. The existing anatomy, observation, and report tests also regenerate their dedicated Raptor artifacts.
