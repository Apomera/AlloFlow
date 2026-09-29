# Moon Mission enhancement, pass 7

Outbound navigation now follows a measured spacecraft trajectory toward a moving Moon. Learners can compare a small departure error with a finite Service Module correction, inspect the engine burn, and verify lunar arrival before planning insertion.

- Earth and Moon gravity act in an Earth-centered planar model, including the acceleration of the Earth-centered reference origin. The Moon moves on a circular orbit. Adaptive integration locates closest approach and surface contact.
- Departure speed and angle errors change the path. Radial and transverse correction commands produce a finite SPS burn at 24 hours, with thrust, mass flow and propellant use calculated together. Position and velocity are never set to a desired arrival.
- The nominal departure reaches about 110.011 km lunar altitude. A +1 m/s departure error reaches about 746.227 km. The corrected preset commands about −6.106 m/s inward radial delta-v, burns for 2.910 seconds, uses 86.170 kg of SPS propellant, and returns to about 110.011 km.
- System and Moon-relative views use measured coordinates with equal distance scales. The lunar trail shows motion during the flight. True-size bodies keep the same centers; enlarged spacecraft graphics remain readable. Exhaust appears only during the finite correction burn.
- Readouts identify Earth-relative and Moon-relative speed separately, along with body-center distances, stack mass, SPS propellant and thrust. Saved planner settings, playback time, view and measured result restore together. Changing the plan clears its result.
- Only a verified encounter within the exercise's 60–500 km clearance corridor unlocks lunar insertion. Wide flybys, low encounters, impacts and time-limit outcomes remain reviewable. Reviewing a result awards no points; advancing awards 15 XP once.
- Service Module corrections no longer subtract Lunar Module hover fuel or add landing drift. Genuine descent-event costs remain active. Earlier saved landing measurements remain intact, while old correction choices are identified as unmeasured decisions.

The departure is an educational preset, separate from the earlier TLI timing exercise. Lunar insertion begins from its own arrival and mass preset, and descent uses its own approach preset. The model stops at first lunar closest approach, impact or 120 hours; it does not claim capture or a guaranteed return. Solar perturbations, inclination, uneven gravity, attitude dynamics and engine transients are omitted. See [physics and primary references](PHYSICS.md).

All **406 distinct unit checks across 43 files** and **nine distinct Chromium workflows** pass. Repeated runs are counted once. Physics checks cover direct and indirect gravity, conservation and thrust work, finite propellant, precise engine events, moving-Moon geometry, closest approach, grazing impacts, step convergence and replay stability. Playback checks cover malformed saves, plan invalidation, one-time progression, event gates, reports, archives and reset.

The 320 px workflow passes keyboard, resize, reload and slider-endpoint checks with all four planning controls expanded. Its scoped WCAG axe audit has **zero violations**. Nine captures were reviewed, including the burn, speed-error miss, corrected encounter, true-size bodies and lunar impact. Canonical and desktop runtimes match; syntax and scoped whitespace checks pass. See [distinct verification results](verification.json), [source verification](source-verification.json) and [browser evidence](transit-verification.json).

The initial phone audit found low contrast in the arrival instructions; the text and background were corrected. A later phone run completed its assertions but timed out while closing its browser context on the busy shared host. The phone-only retry passed with unchanged timeouts. A supplemental candidate run reported an unclassified `STACK_TRACE_ERROR` in one existing trans-Earth slider case; its isolated rerun passed. Original results remain available alongside the successful retries.

The review candidate excludes all 34 hunks of the recorded pre-existing Moonwalk patch while keeping our pending ascent, docking, insertion and navigation enhancements. The working runtime retains that Moonwalk work. Baseline source copies are kept locally and are excluded from the scoped commit file list.

Review captures: [nominal encounter](transit/transit-nominal-encounter-chromium.png), [SPS correction](transit/transit-correction-burn-chromium.png), [corrected encounter](transit/transit-corrected-encounter-chromium.png), [320 px controls](transit/transit-paused-320-chromium.png), [lunar impact](transit/transit-lunar-impact-chromium.png).

Pre-pass source copies and a narrow patch are retained locally for review. Earlier ascent, docking and insertion enhancements are documented in the adjacent pass 5 and pass 6 reports.
