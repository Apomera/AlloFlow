# Raptor Lab: live 3D study

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.

This pass adds **Study this moment** to the existing flight simulation. A learner can freeze the live bird, inspect its current pose from several directions, make a prediction, and resume the same flight to test it.

## Experience

- Enter from the Run controls or the existing pause card. The original simulation pauses: bird movement, wildlife, wing animation, mission time, stamina, and calories stop advancing.
- The study camera frames the actual frozen model. It measures the current morphed vertices once per pose, so folded wings do not leave a perched owl looking tiny inside an unfolded-wingspan frame.
- Side, front, above, and behind buttons provide predictable views. Dragging or arrow keys on the canvas orbit the bird; a labeled distance slider changes the viewing distance. There is no automatic rotation.
- A restrained study panel replaces the flight overlays. A temporary light makes night-flight details readable; the header explicitly identifies this as study lighting.
- Prompts differ for gliding, diving, and resting. They ask learners to inspect wings, tail, and feet, predict what a maneuver will change, and compare a second frozen moment. A labeled simulation snapshot displays speed and height; these are model values, not animal measurements.
- **Close study** returns to the paused flight and restores its original camera. **Resume from this moment** restores the view and resumes without advancing the mission clock by the time spent studying. The first-person return view is preserved too.

## Accessibility and lifecycle

The view has named controls, 44px action targets, selected-view states, canvas instructions, visible focus, keyboard orbit, and Escape to close from the canvas or study controls. Focus moves to the species heading on entry and to Resume on close. Container queries adapt the panel to narrow embedded labs as well as phones. Forced-colors styles retain readable controls.

Study reuses the existing pause and render functions. It adds no animation loop, downloads, geometry assets, textures, or network requests. Pose bounds are cached during orbit. The supplemental light does not cast a new shadow map. Turning on reduced motion while studying also removes dive widening and camera roll from the saved return view. Restart removes the old study DOM, handlers, light, and exposed canvas commands.

## Validation

The dedicated real-WebGL browser suite checks:

- Frozen bird and wildlife positions, wing angle, energy, mission time, and strike recovery through presets, pointer orbit, keyboard orbit, distance changes, and a simulated 60-second wait.
- No background scene rendering during that frozen wait; exact camera restoration when motion preferences have not changed; a 25ms simulation step after resuming advances only 25ms.
- Actual rendered-vertex framing above the panel, including a settled owl with folded wings at night.
- A 420px embedded pane inside a wide desktop viewport and a 420px phone viewport.
- First-person restoration, reduced motion enabled during a dive, Escape from the slider, focus restoration, and restarting during study without duplicate controls or lights.
- Automated axe checks of the new header and panel against configured WCAG 2.0/2.1/2.2 A/AA rules, plus forced-colors control contrast.

Existing regression coverage includes flight continuity, landing/takeoff, input ownership, pause/resume, scenic overlays, resizing, camera switches, zoom, and reduced-motion framing. **12/12 browser checks passed** with no retries. The scoped axe scan reported **zero violations**. Source syntax and whitespace checks passed, and the canonical/desktop files are byte-identical. Results and the source hash are recorded in `verification.json`. These checks are not a hardware performance benchmark or a classroom engagement study.

Reproduce:

```powershell
npx playwright test tests/e2e/raptor-study-mode.spec.ts tests/e2e/raptor-flight-continuity.spec.ts tests/e2e/raptor-scenic-pause.spec.ts tests/e2e/raptor-input-pause.spec.ts tests/e2e/raptor-motion-framing.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-3d-study-2026-09-26/final-browser-results
```

## Integration

- Canonical source: `stem_lab/stem_tool_raptorhunt.js`.
- Exact desktop distribution mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`.
- New tests: `tests/e2e/raptor-study-mode.spec.ts`.
- The 20 new literal translation keys and English fallbacks are inventoried in `translation-keys.json`. Language-pack integration remains with the shared localization work; no shared catalog or host files were edited.
- This is a local implementation. No commit, push, or deployment was performed. The earlier engagement report records the pre-existing unit-suite and localization coverage failures; this pass uses focused real-WebGL regression coverage.

## Visual review

- `side-desktop.png`: live red-tailed hawk in side view.
- `above-desktop.png`: wing and tail inspection from above.
- `dive-desktop.png`: frozen peregrine dive and its comparison prompt.
- `owl-phone.png`: folded owl pose at night with a narrow study panel.
