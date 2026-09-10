# Drone updraft visuals and learning feedback

The drone meadow now shows updrafts as full-height orange columns with visible lower and upper boundaries and upward airflow arrows. The column radius and 250 model ft ceiling match the existing lift rule. Previously the scene drew a tapered column only 70 scene units tall, while lift extended to 250 model ft.

The arrows use filled orange shapes that face the camera while retaining their vertical direction. Visual review found the first thin-line treatment too faint against the meadow. Eco draws four arrows per visible column; higher tiers draw nine. Each column uses one shared buffer for its arrows. Distant columns are hidden beyond 1,100 model horizontal units. Arrow travel uses simulation time, and the current reduced-motion preference keeps travel static without rebuilding the world.

A compact readout below the flight controls explains whether the drone is inside an updraft, outside its radius, or above the lift ceiling. It distinguishes paused flight from active lift and explains that updrafts never replenish energy. Its nearest-edge distance accounts for column radius, and the active state includes overlapping lift sources. The 2D fallback outlines the same boundaries and includes upward motion cues.

The shared ceiling constant replaces the existing literal in physics without changing the lift calculation, radial falloff, energy drain, or checkpoint rules. The display helpers read flight state without modifying it. The arrows and columns remain human learning aids for this simplified model.

## Verification

- Nine new lift/readout assertions passed, covering radial falloff, strict radius and height boundaries, overlapping columns, unavailable data, nearest-edge distance, and paused wording.
- Six existing WebGL runtime assertions passed in the same run. The runner timed out while terminating that worker and exited before reaching the remaining test file. These results are recorded in `scratch/bee-lift-unit.json` and the shutdown warning in `scratch/bee-lift-unit.log`.
- The eight remaining visual safeguards passed in a separate clean run: `scratch/bee-lift-visual-unit.json`. Total: 23 passing assertions.
- The existing clear-view/camera/resize browser case passed. The first new updraft run found a motion-preference mismatch; the arrows now read the current preference directly. Both updraft browser cases then passed: `scratch/bee-lift-final.log`.
- The 3D case passed again after the filled-arrow polish: `scratch/bee-lift-polish.log`. It checks actual mesh bounds, Eco/High density, unchanged paused flight, current motion preferences, active lift and the altitude ceiling.
- Mobile fallback checks passed at 320 px in both themes, including scoped WCAG checks, forced colours, and energy continuing to drain inside an active updraft.
- Inspected the initial and final 3D previews and the mobile feedback preview. Final source and desktop public copies match; syntax and scoped whitespace checks passed. No full-repository suite or performance audit was run.

## Previews

- `scratch/beehive-flight-deck/updraft-approach.png`
- `scratch/beehive-flight-deck/updraft-feedback.png`
- `scratch/beehive-flight-deck/updraft-mobile-light.png`
- `scratch/beehive-flight-deck/updraft-mobile-dark.png`

Implementation: `stem_lab/stem_tool_beehive.js` and `desktop/web-app/public/stem_lab/stem_tool_beehive.js`. Tests: `tests/beehive_drone_lift_readout.test.js` and the updraft cases in `tests/e2e/beehive-drone-flight-deck.spec.ts`.
