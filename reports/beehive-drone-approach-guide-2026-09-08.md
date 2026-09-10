# Drone flight approach guide

The clear flight HUD now pairs an altitude strip with separate range and height conditions for entering the DCA. A white pointer shows the drone's current altitude against the gold 100–130 model ft band. Text prompts show the climb, descent, or horizontal gap to the entry boundary. The main direction readout continues to show range to the target centre.

The guide uses the shared 72 model m radius and altitude bounds. It distinguishes conditions being met while paused from a checkpoint actually being recorded by flight progression. After DCA entry, it replaces the strip with a recorded milestone and the queen-cue instruction. This is a read-only teaching aid; it does not change energy, position, scoring, randomness, or biological assumptions.

The mobile clear view has a taller scene. Visual review found that the initial expanded HUD covered part of the drone in chase view, so narrow-view chase framing now aims slightly lower to keep the bee above the instruments. Target labels continue to project through the actual camera. No extra animation was introduced. The detailed instrument panel's stale 70 m description now reads the shared radius.

## Verification

- 26 focused unit checks passed: approach guidance, direction guidance, and route overview. Includes exact boundary cases, sub-unit gaps, unavailable telemetry, and checkpoint integrity. Results: `scratch/bee-approach-unit.json`.
- Four browser cases passed in `tests/e2e/beehive-drone-flight-deck.spec.ts`: camera and resize, narrow-screen 2D fallback and held controls, actual DCA geometry and checkpoint recording, and the new approach guide. Log: `scratch/bee-approach-browser.log`.
- The approach case passed again after the mobile framing adjustment, including a projected bee-position assertion, paused-state checks, 320 px layout, both themes, scoped WCAG checks, and forced-colour visibility. Log: `scratch/bee-approach-final.log`.
- Inspected the desktop guide and initial mobile preview, then inspected the regenerated final mobile preview to verify the complete bee remains visible above the HUD.
- Final source and desktop public copies match. Syntax and scoped whitespace checks passed. No full-repository suite or performance audit was run.

## Previews

- `scratch/beehive-flight-deck/approach-height-guide.png`
- `scratch/beehive-flight-deck/approach-checkpoint.png`
- `scratch/beehive-flight-deck/approach-mobile-light.png`
- `scratch/beehive-flight-deck/approach-mobile-dark.png`

Implementation: `stem_lab/stem_tool_beehive.js` and `desktop/web-app/public/stem_lab/stem_tool_beehive.js`. New unit coverage: `tests/beehive_drone_approach_guide.test.js`.
