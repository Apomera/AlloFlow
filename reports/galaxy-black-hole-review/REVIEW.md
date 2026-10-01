# Galaxy Explorer: black hole review

## September 28 follow-up

Direct placement, inward/outward throwing, and independently tracked debris have now been implemented. See the follow-up report in `reports/galaxy-black-hole-interaction-2026-09-28/REVIEW.md`. The assessment below records the earlier pass; its placement and debris recommendations are now partly completed.

## Assessment

The main weakness was the experiment itself. Pressing **Drop** played a short, predetermined spiral. Changing the object or black hole mass did little to change what the learner could investigate. More visual effects would not have solved that interaction problem.

This pass replaces that sequence with a repeatable experiment and improves the scene's framing. The largest remaining visual opportunity is a renderer that bends light consistently through the disk, background, and falling objects.

**Scope:** the standalone Black Hole Lab, its integration and state lifecycle, and the separate black hole illustration inside the galaxy view. Implementation changes concentrate on the standalone lab. The galaxy-scale nuclear renderer was inspected and is discussed below.

## What was wrong, and what changed

| Finding in the original implementation | Result of this pass |
| --- | --- |
| Every object followed `radius = 1.6 − 1.31 × easedProgress` and a prescribed angular sweep. Its trajectory did not respond to gravity or release velocity. | A numerical Schwarzschild model determines the object's center trajectory from release radius and angular momentum. Direct fall, orbit, and escape are distinct outcomes. |
| Random launch angle and height made comparisons inconsistent. There was no object to inspect before release. | A repeatable launch position, visible object marker, and dashed trajectory preview appear before release. Release distance and sideways motion are adjustable. |
| Pressing Drop repeatedly accumulated up to four objects while the readout described only the newest. | One experiment is active at a time. Replay, reset, and changing release settings have explicit behavior. |
| A roughly five-second animation disappeared without retaining a useful result. | A persistent trail, outcome announcement, timeline, slow playback, and single-step inspection let the learner revisit any moment. |
| Mass changed a stretch multiplier from `1` to `0.23`. | Tidal gradients now depend on physical mass and radius. At a fixed number of horizon radii they scale as the inverse square of mass. Object deformation remains explicitly illustrative. |
| An arbitrary linear percentage was called the distant received signal. | The display now identifies a static-clock gravitational redshift reference, with its formula and limitations. It does not claim to reproduce a falling object's received signal. |
| Proper-time horizon crossing and an external optical view were mixed together. | Playback follows a modeled traveler to the horizon. The explanation distinguishes this from the delayed light received by a distant observer. |
| Rings, unrelated arcs, and permanent jets competed with the object. | Rings are quieter, the far-side disk illustration uses disk texture, and jets are optional. The disk and jet axes agree. Disk brightness asymmetry responds to viewing inclination. |
| The scene stretched beside a long sidebar, with the release controls far down the page. | The experiment comes first, the stage stays beside the controls on desktop, and explanations are collapsible. A phone release returns the object to view. |
| Animation mixed wall-clock time and per-frame increments. | Disk motion uses accumulated elapsed time. Pausing does not advance the disk behind the scenes, and background/offscreen time is excluded. |
| WebGL failure could leave an enabled Drop button that did nothing. | Experiment actions remain disabled until the renderer is ready and during context loss. Recovery preserves a paused experiment. |

## Scientific model and boundaries

The new trajectory integrator uses the Schwarzschild timelike geodesic equations in horizon-radius units, with the speed of light normalized to one. Angular momentum is conserved. A fixed proper-time RK4 integration produces samples shared by playback, replay, and scrubbing. The potential and circular-orbit relationships follow the treatment in [Tevian Dray's Geometry of General Relativity](https://sites.science.oregonstate.edu/physics/coursewikis/GGR/book/ggr/orbits).

The two mass presets are 10 and 4 million solar masses. Their normalized center trajectories match under equivalent release conditions, but the physical tidal gradients differ greatly. NASA's [black hole infall visualization](https://science.nasa.gov/universe/black-holes/supermassive-black-holes/new-nasa-black-hole-visualization-takes-viewers-beyond-the-brink/) explains why compact travelers can encounter much weaker horizon tides around a supermassive black hole.

This remains a teaching model:

- The orbit model is **nonrotating**. The disk's Spin slider changes its appearance; it does not implement Kerr frame dragging.
- Playback time is rescaled. It is not a physical stopwatch for either mass preset.
- Objects are enlarged to remain visible. Their stretching is compressed and capped for inspection, not calculated from a material-strength model.
- The star's center follows a test-particle trajectory. The star and debris are illustrative; a star that has disrupted is not a rigid body that can continue along one center path.
- Debris is a deterministic visual representation, not a hydrodynamics calculation.
- The center and arcs are schematic. The image does not compute the observed shadow or ray-trace the falling object.
- The clock reference excludes Doppler shift, photon travel time, and photon capture probability.

These distinctions appear in the interface. A black hole's observed shadow and its event horizon are different structures; [NASA's anatomy guide](https://science.nasa.gov/universe/black-holes/anatomy/) also explains why the disk's bent images change with viewing angle.

## Improvements with the largest remaining benefit

### 1. Replace decorative lensing with a coherent optical renderer

This is the next substantial visual upgrade. The current scene draws geometry and suggests lensing with arcs. It cannot make an object disappear behind the black hole while showing a physically consistent secondary image, or bend background stars through the same field as the disk.

Start with a nonrotating black hole and a GPU light-path lookup table or bounded ray integration. Use the same solution for the disk, sky, and test objects. Render at an adaptive resolution, with the present diagram available on devices that cannot sustain the optical view. Add Kerr spin only after the nonrotating model has quantitative reference checks.

**Acceptance criteria:** known shadow dimensions, the correct change in the disk's far-side image with inclination, consistent object occlusion and secondary images, and no directional brightness asymmetry when viewed exactly along the disk axis. NASA's [warped-world visualization](https://www.nasa.gov/universe/nasa-visualization-shows-a-black-holes-warped-world/) provides a useful visual reference for those relationships.

### 2. Let the learner place and throw objects

The new controls expose meaningful release conditions, but placement still uses a fixed azimuth. A stronger interaction would let the learner select a launch point on an orbital plane and drag a velocity arrow. Show the predicted path while adjusting it. Provide equivalent position and velocity fields for keyboard and assistive-technology users.

**Acceptance criteria:** dragging an object cannot accidentally orbit the camera; the launch position remains visible; touch has sufficiently large handles; replay uses exactly the previous release; all operations work without dragging.

### 3. Give different objects different disruption behavior

The new models are more recognizable, but affine stretching of a whole mesh is still limited. A probe should separate into panels and a central body; an astronaut teaching model should show differential deformation along its length; a star should develop a stream of material with a spread of orbital energy.

Use a small number of independently tracked segments or parcels. Keep a record of the original object so replay reconstructs it exactly. Label the assumptions about size, structure, and strength.

**Acceptance criteria:** disrupted material follows several related trajectories, no fragment is rendered as an observable object inside the horizon, and mass comparisons change disruption meaningfully without inventing an explosion at the horizon.

### 4. Make comparisons a first-class activity

Save two releases with the same initial conditions and different mass or sideways motion. Synchronize their timelines, show their outcomes together, and let the learner explain the difference. Useful starting questions include “Does everything fall in?” and “Why can a larger black hole produce gentler tides?”

The current implementation provides repeatable releases and replay as the foundation; it does not yet save a comparison notebook.

### 5. Reconcile the galaxy-scale nucleus with the close-up lab

The galaxy view has a separate renderer: three stylized photon rings, five lensing arcs, extra caustic fragments, and orbiting sprites. Their dimensions and behavior are not derived from the close-up model. Several details use additive blending or disable depth testing, making them explanatory overlays rather than a physical view.

Use a shared black hole profile containing mass, accretion state, and presentation assumptions. At galaxy scale, show an appropriately labeled nucleus marker. Transition into the lab through an explicit change of scale. Treat a quiet Milky Way-like nucleus and a luminous active nucleus as different examples. Preserve the existing observing-mode controls while distinguishing actual survey evidence from illustrative overlays.

### 6. Separate the dynamics from the large renderer module

The new equations are pure functions and have independent numerical tests, but they still reside in the standalone plugin to preserve its loading contract. A subsequent refactor should extract dynamics, object visuals, and experiment controls behind explicit interfaces. That would make adding a second observer view or a better renderer safer than extending another long canvas closure.

## Verification and artifacts

- **Final galaxy suite: 368 passed, 2 failed, 370 total.** Both failures are pre-existing literal escape sequences in unrelated portions of the shared English catalog (checked once per mirrored registry). None of the 45 new black hole strings contains those sequences. The failures were left visible rather than changing unrelated work or weakening that test.
- Numerical checks cover analytical radial-fall timing, stable circular orbits, escape, energy conservation during angular infall, deterministic replay, backwards scrubbing, tidal scaling, and invalid saved inputs.
- Real Chromium/WebGL checks cover all three objects, capture/orbit/escape, pause and stepping, replay/reset, appearance changes during a run, context loss and recovery, reduced motion, and desktop/390px/320px layouts.
- The browser run records no page or console errors and no horizontal phone overflow.
- The canonical galaxy plugin and desktop public copy are synchronized.
- Forty-five new English strings are registered in both UI registries and the Galaxy English catalog. Other locales currently use the English fallback for these new strings.
- Full-suite details are in `vitest-results.json`. Browser results are in `browser-results.json`.

Screenshots include `before-desktop.png`, `after-desktop.png`, `after-phone.png`, `after-tidal-stretch.png`, `after-orbit.png`, `after-supermassive-probe.png`, `after-star-disruption.png`, and `after-astronaut.png`.

Run the focused browser checks with:

```text
node dev-tools/galaxy_black_hole_qa.cjs
```

Start the local preview with:

```text
node dev-tools/galaxy_black_hole_qa.cjs --serve
```

The preview prints its local URL and serves only the assets needed by this harness. It runs the actual plugin with local React, Three.js, and the app stylesheet; it is not a full application-host or deployment test.
