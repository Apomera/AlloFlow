# Pasta that responds to spoon handling

Fresh cooks now contain six representative groups of pasta. Sweep a spoon through the visible clumps in the 3D pot or the illustrated pot tool. Contact paths must cross the strands; clicking, holding still, and moving through empty water do not separate them. Completed separation persists when a gesture ends or is cancelled.

Clumped groups cook more slowly. Separating some groups while leaving others clumped creates different cooking histories. Later stirring improves subsequent cooking but preserves the difference already created. A fork sample reveals texture variation; the ordinary pot readout shows visible clumps without disclosing unsampled doneness. Earlier samples remain fixed observations and are marked stale after further cooking or separation.

The spoon tracks the current water surface, including after water has been reserved. The illustrated tool supports touch, focusable groups, keyboard navigation, selected-group controls, and an equivalent simplified stir. Handling pauses simulation time. These are illustrative model effects, not calibrated cooking rates or a test of physical cooking skill.

## Try it

1. Refresh the recipe kitchen and start a fresh cook. Weigh pasta, fill the pot, and bring its water to a boil before adding pasta.
2. Choose **Separate pasta strands** in the 3D tool selector. Sweep through the visible groups, or open **Pasta pot → Separate the pasta strands** below the scene.
3. For comparison, separate only one group, advance cooking time, and check a fork sample. Separating the remaining groups later keeps their earlier cooking differences.

Older saved cooks use `pastaModel: 0`; their reconstructed pot state and action history are preserved. New cooks use `pastaModel: 1`. Replay records each separation, shows the historical clump arrangement, and locks cooking controls. Exported evidence includes pasta handling and sampled texture ranges. The existing prepared rescue challenges continue using their supplied pasta state.

## Verification

- **173 tests passed across 16 kitchen test files**, including 16 new tests for spoon paths, cooking differences, immutable samples, invalid actions, compatibility, all recipe/portion combinations, replay, and asset parity. See [unit-results.json](unit-results.json).
- [Pasta browser checks](browser-results.json) passed: real 3D sweeps through all six groups; click rejection; illustrated mouse and keyboard use; unfinished-stroke cancellation; partial-state restoration; unequal sample observations; graphics-context loss; locked replay and export; genuine older saves; real touch input without WebGL.
- [Recipe regressions](recipe-regression/browser-results.json) passed: mushroom for two and tomato for four, using drawn cuts, spatial transfers, continuous pouring, mixing, saved evidence, and replay.
- [Scene regressions](scene-regression/browser-results.json) passed: ingredient transfers, seven knife strokes, pan sweeps, individual piece turning/movement, and continuous pouring.
- Accessibility scans reported no violations for the tested desktop, 320px, and forced-color views. Narrow layouts had no horizontal overflow. Browser runs reported no page errors.
- All 13 checked source/desktop runtime pairs match: [mirror-check.json](mirror-check.json). Changed JavaScript files pass syntax checks; scoped whitespace checks pass.

Browser testing found and corrected an initial spoon-plane mismatch: contact now follows the water level instead of using a fixed height. The final unit run used a 30-second per-test timeout after replay tests exceeded the default five-second timeout during a heavily contended run. No assertions were skipped or relaxed.

## Screenshots

- [Partially separated strands](pasta-separation-desktop.png)
- [Narrow-screen pot tool](pasta-separation-mobile.png)
- [Uneven texture sample](uneven-pasta-sample.png)
- [Separated pasta in the 3D kitchen](separated-strands-3d.png)
- [Touch controls without WebGL](pasta-touch-no-webgl.png)

The changes are local, mirrored into the desktop public assets, and have not been committed or deployed.
