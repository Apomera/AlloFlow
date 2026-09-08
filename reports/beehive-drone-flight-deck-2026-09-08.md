# Drone flight view and controls

The Bee Tool drone simulator now opens continuous flights in a larger, clearer view. A compact direction guide shows the shortest turn toward the current target, its altitude difference, horizontal range in model metres, energy reserve, and time remaining. The detailed cockpit HUD is available in **Display & flight settings**.

The flight pad sits immediately below the scene. Hold controls support pointer capture and release, while camera, pause, and display settings remain nearby. Overlays have explicit contrasting backgrounds and readable captions. Pausing preserves the scene’s brightness so learners can inspect it.

Paused camera and display changes redraw without advancing flight physics. Resizing updates the actual 3D camera, renderer, and overlay dimensions. Spatial target cues use the active 3D camera projection in cockpit and chase views. Hiding the page pauses continuous flight and clears held inputs; returning leaves the flight paused.

The existing deliberate maneuver mode and saved decision evidence are preserved. Reaching the queen cue is described as completing the game challenge; the overlay explicitly says that this intercept does not model mating. Existing explanations of model scales, human navigation aids, and biological limits remain available.

## Validation

- All 32 distinct focused unit tests passed across five files covering the new director, deliberate gameplay, attitude cues, visual cues, and WebGL runtime. Two decision tests initially exceeded the five-second timeout; the complete eight-test decision file passed with a 30-second timeout. Results: `scratch/bee-drone-deck-unit.json` and `scratch/bee-drone-deck-decision-unit.json`.
- Four distinct browser cases passed across focused runs: existing live WebGL movement; clear-view camera projection, HUD switching, and paused resize; 320px fallback flight, held controls, light/dark layouts, and hidden-page pause; and deliberate maneuvers, both camera directions, and saved debrief evidence.
- Final browser follow-up passed both the clear-view/contrast case and deliberate-mode case after correcting test setup assumptions about initial pause and camera state. Logs: `scratch/bee-drone-deck-verified-browser.log`, `scratch/bee-drone-deck-final-browser.log`, and `scratch/bee-drone-deck-browser.log`.
- Scoped Axe checks found no violations in the direction guide, controls, or training panel. The mobile test also checked horizontal overflow and forced-colour visibility. This is not a whole-app accessibility audit.
- JavaScript syntax and scoped whitespace checks passed. The source and desktop public copy match byte for byte. The full repository test suite was not run.

## Files and visual review

- `stem_lab/stem_tool_beehive.js` and `desktop/web-app/public/stem_lab/stem_tool_beehive.js`
- `tests/beehive_drone_director.test.js`
- `tests/e2e/beehive-drone-flight-deck.spec.ts`
- `tests/e2e/23-beehive-drone-gl.spec.ts` now opens the settings disclosure before changing graphics quality.
- Reviewed screenshots: `scratch/beehive-flight-deck/clear-chase.png`, `detailed-hud.png`, `mobile-clear-view.png`, and `mobile-controls.png`.
