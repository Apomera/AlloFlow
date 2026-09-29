# Moon Mission enhancement, pass 6

## Delivered

The lunar-orbit phase now simulates the insertion burn instead of starting on a scripted orbit. Learners choose ignition timing and burn duration, inspect the measured path, and verify a suitable orbit before undocking.

- **Physical insertion:** a Moon-centered incoming hyperbola, fixed SPS thrust, changing mass, finite propellant and numerical gravity. The engine burns for the requested duration unless fuel is depleted or the spacecraft reaches the surface. The model does not set velocity to a desired result.
- **Meaningful planning:** the default burn reaches a 99.10 × 234.77 km orbit. No burn produces a flyby; a weak burn can leave a bound but unsuitable orbit; excessive braking or poorly timed ignition can produce an impact. Every outcome follows the integrated trajectory.
- **Readable flight instruments:** orbital energy, mass, fuel, thrust, radial/tangential speed, and orbit endpoints if the engine stopped immediately. Milestones identify ignition, cutoff and the first actual periapsis. The slider reaches the exact end of the computed encounter.
- **Physical visuals:** equal distance scales, a detailed docked spacecraft with stowed LM legs, retrograde thrust and velocity arrows, vacuum exhaust, and a measured trajectory. Radio contact follows lunar line-of-sight geometry; the blocked ray stops at the physical lunar limb. Display size does not affect signal loss.
- **Geography retained:** a separate near-side atlas preserves the real landing-site coordinates, maria, Apollo landing labels, and the landing-day lighting lesson. It is clearly distinct from the orbital-plane diagram.
- **Saved progress and gates:** changing the plan clears the old result. Capture, playback and plan restore together; malformed or legacy ready flags cannot unlock descent. Review awards no points, and undocking awards 15 XP once. Mission events and focus handling remain intact. The flight history, report and mission reset include the insertion record.

The default plan ignites 180 seconds before the unpowered arrival's reference perilune and burns for 357.5 seconds. It uses about 10,586.83 kg of SPS propellant, leaving 7,413.17 kg. Computed period is 124.26 minutes. These are results of the educational preset, not reconstructed Apollo telemetry.

The incoming encounter is separate from the earlier simplified coast. The model omits three-dimensional motion, lunar gravity variations, Earth perturbations, engine transients and attitude dynamics. Its 60 km minimum perilune and 2,000 km maximum apolune are exercise limits. The later descent begins from its own approach preset. See [physics, numerical checks and primary references](PHYSICS.md).

## Verification

**381 distinct unit checks across 41 files passed. Eight distinct Chromium scenarios passed:** seven new insertion workflows and one migrated mission regression. Targeted reruns are counted once.

- Physics tests cover the analytical incoming conic, energy/angular momentum, force and fuel integration, rocket-equation impulse, engine events, coast-orbit closure, capture/flyby/impact outcomes, fuel depletion, step convergence and radio geometry.
- Playback and progression tests cover hostile saves, plan invalidation, result retention while reviewing, one-time rewards, unresolved events, reporting, archives, reset and keyboard focus.
- Browser tests cover the planner, measured readouts, unsafe outcomes, reload, pause/resize, hidden clocks, keyboard controls and viewport-independent radio visibility.
- Reviewed six desktop/phone captures. The 320 px workflow has no overflow or clipped controls; its scoped WCAG 2 A/AA and 2.1 A/AA axe audit returns zero violations.
- Canonical and desktop sources match exactly. JavaScript syntax and scoped whitespace checks pass. See [source verification](source-verification.json) and [distinct unit results](verification.json).

The initial phone browser case assumed that a default plan had already been written into the save. The fixture now reads the normalized default, and the focused rerun passes. No product failure was masked. Windows temporarily held mapped-file locks during source writes; normal retries completed successfully.

## Review captures

- [SPS burn and radio blackout](loi/loi-sps-burn-chromium.png)
- [Captured orbit](loi/loi-captured-chromium.png)
- [No-burn flyby](loi/loi-flyby-chromium.png)
- [Excessive burn and impact](loi/loi-overburn-chromium.png)
- [320 px keyboard and atlas view](loi/loi-paused-320-chromium.png)
- [Radio reacquisition](loi/loi-radio-reacquired-chromium.png)

## Scope and saved work

Changed the canonical/public Moon Mission runtime, added three focused unit suites and a browser suite, and migrated the directly affected phase-four expectations in the existing dashboard, event, focus, Moon/splash and browser tests. The earlier ascent, docking, entry, descent, rover and Moonwalk work remains intact.

Both pre-pass runtime files are saved under `baseline/`; their SHA-256 is `a5d3ed0b81b1be17858fa5ce6c7c42fa875f867cf24bdc2663b0dfe769d953f0`. The narrow patch records this pass against that baseline, independently of earlier uncommitted enhancements.

**All pass 6 changes remain unstaged and uncommitted, as requested. No push, deployment or packaged build was performed. Unrelated workspace and index changes are preserved.**
