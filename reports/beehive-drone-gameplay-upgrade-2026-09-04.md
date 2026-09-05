# Drone Flight: accessible gameplay and visual upgrade

Open **Beehive → Drone Flight**, select **Pause and plan**, then choose a difficulty. Continuous flight remains available. Pace and difficulty are separate choices.

## Gameplay

- Select a maneuver and advance only its stated model time. Reading, choosing, and inspecting evidence have no real-time deadline.
- Use short turns, powered forward flight, powered climb, descent, or reduced thrust. Optional navigation assistance generates ordinary steering inputs through the same physics, energy, obstacle, DCA, and queen proximity checks.
- Read a top-down map, target range, altitude, energy, directions, wind, and nearby hazards. The map uses distinct shapes and has text equivalents.
- Repeat a course from its seed. Matching course, scenario, route configuration, difficulty, and colony condition reproduce the starting conditions. Changed paths can change subsequent encounters; this is not a claim of identical outcomes across different control inputs or frame timings.
- Save up to 100 recent maneuvers with their duration, before/after altitude and energy, target range, and outcome. Ending a deliberate flight also retains its existing maneuver evidence. The debrief records use of navigation assistance and restores keyboard focus to the evidence.

The real-time and deliberate modes share the flight update function. A maneuver uses fixed 1/60-second steps, then renders the resulting state. The ordinary challenge timer advances only with simulated flight, so it continues to represent a flight budget while the learner has unlimited thinking time.

## Visuals and accessibility

The 3D scene has a procedural meadow texture, agricultural fields, a river and low vegetation, alongside the existing bee models, obstacles, clouds, and route beacons. Scene textures use independent randomness and are disposed with the renderer.

Pause-and-plan flight uses a simpler scene caption instead of the dense cockpit gauges. On larger screens the landscape stays alongside the planner; narrow screens use a single column. Camera motion and wing animation stay still while planning. The 2D fallback, keyboard controls, native radio choices, visible focus, text descriptions, local table scrolling, dark theme, and forced-color support remain available.

## Science: corrections and explicit boundaries

**Flapping lift at low speed.** Removed the extra aircraft-like low-speed penalty that blocked slow climbing. Honey bees can generate lift while hovering; the game still approximates forces rather than solving wing-scale aerodynamics. [Altshuler et al., PNAS (2005)](https://pubmed.ncbi.nlm.nih.gov/16330767/)

**Drone behavior.** Replaced unsupported claims about universal mating odds, superlative muscle strength, and fixed sensory distances. The flight explanations now acknowledge orientation flights, multiple congregation areas, and return flights. A tracked drone need not follow the game's single fixed target route. [Woodgate et al., iScience (2021)](https://doi.org/10.1016/j.isci.2021.102499)

**Visual navigation.** The landscape texture helps a person judge movement. Research supports roles for visual motion and airflow cues in honey-bee flight; the camera, symbols, and controller do not recreate a bee's sensory experience. [Roy Khurana and Sane, eLife (2016)](https://elifesciences.org/articles/14449)

The interface explains the remaining divergences at preflight, during deliberate play, and in the debrief:

- Thrust, drag, lift, updraft benefits, energy losses, challenge duration, and collision consequences remain teaching approximations.
- The DCA volume and generous queen-intercept radius are game targets, not a model of mating probability or mechanics.
- Drones do not forage. Route markers and updrafts supply no metabolic energy. Reduced-thrust flight does not establish that drones normally soar like gliders.
- Bodies, vegetation, and wing motion are scaled or slowed for legibility. The camera does not simulate compound-eye or ultraviolet vision.
- Readout values are model scales. Energy displays and new debriefs use percent of the selected difficulty's reserve. Horizontal distance now accumulates the same coordinate scale as the DCA instead of an unrelated multiplier; vertical readouts identify feet correctly.
- A failed game attempt does not establish that a real drone would die. A successful interception ends the game without modeling the mating process.

This remains an educational flight model, with its limits visible at the relevant decisions. The upgrade does not establish real-world predictive validity.

## Verification

- The full Bee unit/regression suite passed all 371 tests across 39 files.
- After the final exit/save and random-cursor refinements, all 12 affected tests were verified. One idle-state case timed out during setup and passed its isolated rerun; no assertions or checks were weakened.
- Three Chromium scenarios passed: continuous 3D flight, complete keyboard-operated deliberate flight, and accessible narrow-screen fallback flight. The final two scenarios were repeated after the completion-focus refinements and both passed.
- Coverage includes a frozen simulation while reading, bounded maneuvers, low-speed climbing, repeated course generation, actual DCA and queen gates, evidence saving on completion and early exit, focus restoration, WebGL pixels, 320/390-pixel layouts, enlarged text, dark mode, forced colors, and scoped WCAG A/AA axe scans including contrast.
- Canonical and public Bee scripts are byte-identical; syntax and diff-whitespace checks pass. Automated accessibility testing is not a substitute for sessions with learners using assistive technology.

## Scene preview

![Active pause-and-plan flight with the updated landscape and concise instruments](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/beehive-flight-upgrade/flight-in-air.png)
