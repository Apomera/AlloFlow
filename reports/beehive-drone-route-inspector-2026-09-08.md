# Drone route inspector and DCA entry band

Continuous flight now includes **Route map & checkpoints** directly after the flight controls. Opening it pauses the simulation for inspection; closing it leaves the pause in place. Learners can resume with the existing flight controls and watch the map update.

The map shows the hive, the drone’s position and heading, the DCA footprint, recent sampled positions, course-obstacle dots, and the bearing to the next target. The queen cue appears after the DCA checkpoint is recorded. Both horizontal axes use the same scale; the view expands to keep the drone and recent path in frame. The legend explains that obstacle height is omitted and that the dashed line is a bearing guide.

Three checkpoint indicators distinguish recorded progress from the current objective. The DCA coach separately explains horizontal range and altitude, including when the drone is close enough but needs to climb or descend. Inspection never awards checkpoints; progress still comes from the existing simulation gates.

## 3D target and educational consistency

The DCA beacon now outlines the accepted game volume with two horizontal golden rings, a translucent band, and vertical markers. Its radius is 72 model metres and its altitude band is 100–130 model feet. A shared parameter supplies the radius to gameplay, geometry, and map feedback. The target cue and direction line point to the band centre at 115 model feet. The extra vertical ring at the DCA was removed; the three earlier cyan approach rings remain.

These are teaching-model dimensions, not measured biological flight boundaries. Existing biological-limit explanations remain available. The debrief now explains simultaneous range and altitude requirements instead of implying that total travel distance alone satisfies entry. The phase announcement describes reaching the queen cue as completing the game challenge, without claiming to simulate mating. Renderer labels are now “3D meadow” and “2D flight view.”

## Verification

- 32 distinct focused unit checks passed: 10 route-overview checks, 6 WebGL runtime checks, 8 visual-cue checks, and 8 deliberate-flight gameplay checks. The new overview setup initially timed out; it passed on the isolated rerun. One expected fallback badge string was updated to match the new label. Results: `scratch/bee-route-unit.json` and `scratch/bee-route-unit-verified.json`.
- All 5 browser cases passed in the final run: existing clear-view/camera/resize behavior; narrow-screen fallback controls and hidden-page pause; deliberate maneuvers and saved evidence; actual 3D volume dimensions and canonical DCA progression; and keyboard route inspection with light/dark mobile layouts and sampled trail positions. Log: `scratch/bee-route-browser.log`.
- Scoped Axe checks passed for the route inspector and existing flight controls/guide. Mobile checks found no horizontal page overflow at 320px. This was not a whole-app accessibility audit.
- Reviewed `route-inspector.png`, `dca-entry-band.png`, and `route-mobile-dark.png` in `scratch/beehive-flight-deck/`.
- JavaScript syntax, scoped whitespace checks, and byte-for-byte source/desktop mirror comparison passed. The full repository suite was not run.

Implementation: `stem_lab/stem_tool_beehive.js` and its desktop public mirror. Tests: `tests/beehive_drone_route_overview.test.js`, the extended `tests/e2e/beehive-drone-flight-deck.spec.ts`, and updated renderer-label expectations in the existing WebGL tests.
