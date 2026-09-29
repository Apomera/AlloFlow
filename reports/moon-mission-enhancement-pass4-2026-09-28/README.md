# Moon Mission: launch and Earth orbit enhancement

## What changed

The launch instruments, staging events and orbital cutoff now share one numerical flight profile. The model integrates motion around a spherical Earth with gravity, atmospheric drag, thrust, fuel consumption and changing vehicle mass. Engine pressure effects, center-engine cutoff, stage/tower mass removal, and brief coasts before upper-stage ignition affect the same trajectory.

The nominal teaching profile reaches cutoff at **648.38 s**, at **188.61 km** and **7.794 km/s**. Its computed orbit is **180.00 by 191.53 km**. Maximum dynamic pressure is **34.64 kPa** at **76.25 s / 11.01 km**; peak crew load is **4.00 g**. About **83.5 t** of propellant remains for the next burn. These are simulation outputs, not claimed Apollo telemetry.

- Twelve readable launch instruments distinguish inertial speed, speed through air, vertical/horizontal velocity, mass, fuel, thrust and dynamic pressure.
- A saved timeline, selectable speeds, milestone buttons, two plots and explicit result review support paused and reduced-motion use. The last five countdown seconds run in real time.
- Staging, pitch, plumes and sky transition follow the profile. Paused frames remain stable; resizing repaints the view. Captions distinguish separation coasts from engine ignition.
- A completed bound-orbit result gates progression. Reviewing the result awards no XP; proceeding awards the launch reward once. Old animation saves restart with a migration note and clear their old Max Q observation.
- The compact launch outcome is retained in the flight archive and readable mission report.
- Earth orbit uses the circular speed and period at 185 km, with Earth shadow, sunrise counts, a detailed S-IVB stack and motion/gravity arrows. Its clock and burn window pause together, survive reloads, and avoid hidden-tab catch-up.
- An explicit advance-to-window control moves and pauses the orbit without firing the engine. TLI grading reads the actual current orbit snapshot.

## Model limits

This is an educational planar launch model. It uses rounded hardware constants, constant drag coefficient, a prescribed early pitch program and simplified upper-stage guidance. It omits winds, vehicle flex, roll, changing launch latitude and separation impulses. Rotation is represented by an initial eastward speed near Cape Kennedy. Camera scale, exhaust and visible separation motion are illustrative.

Phase 2 deliberately uses a circular **185 km reference orbit** (about **7.797 km/s**, **88.05 min**) for the timing exercise. It is not a continuation of the launch's small eccentricity. The readiness threshold and burn-window width are teaching choices. The model notes in both phases explain these approximations.

Hardware references: [Saturn V SA-507 Flight Manual](https://www.nasa.gov/wp-content/uploads/static/history/afj/ap12fj/pdf/a12_sa507-flightmanual.pdf), [AS-506 technical summary](https://ntrs.nasa.gov/citations/19700011707), [F-1 engine](https://ntrs.nasa.gov/citations/20100027316), [J-2 engine](https://ntrs.nasa.gov/citations/20100027318), and [Apollo 11 Mission Report](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf).

## Validation

- **319 distinct unit checks across 34 Moon Mission files passed**, combining the focused launch/orbit run, its corrected reset rerun, the remaining regression run, and three worker-startup reruns. `full-unit-tests.json` records each case once and verifies that every Moon Mission test file is covered.
- **12 distinct Chromium scenarios passed** across the new launch/orbit suite and existing header-pause/orbit tests. Coverage includes independently checked pressure, staging mass changes, cutoff, rewards, malformed saves, phone/keyboard/reduced-motion controls, resize/reload, real-time countdown, orbit physics, late burns, and hidden clocks.
- Physics checks include mass/jettison accounting, thrust/flow consistency, energy balance, computed orbital elements, and step-halving convergence. Orbit checks cross physical sunrise and burn-window boundaries at 30/60/120 Hz.
- Final source syntax passes. The validated working-tree canonical and desktop files match SHA256 `65d3ea31e3323581a50d13a50247e6fd3797668301664985dae8a9f59025958e`.

Local evidence is in `full-unit-tests.json`, `launch-save-tests.json`, and `launch-orbit/` beside this report. Desktop cutoff, Max Q, staging and phone orbit/launch screenshots were inspected. The first browser run exposed an exact-zero floating-point assertion (air-relative speed was 5.7e-14 m/s); the assertion now uses numerical tolerance and its rerun passed. Older orbit canvas tests were migrated to the new layout and focused around physical event boundaries to avoid thousands of redundant renders.

The broad regression passed 238 assertions but three fork workers timed out before starting. Those three suites passed all 30 checks with one thread worker. A reset fixture also exceeded its original five-second limit under load; replacing its unnecessary trajectory calculation with a valid compact save preserved the assertions and passed the focused rerun. These runner/fixture issues and their reruns are retained in the local reports.

## Workspace preservation

Pre-existing Moonwalk/terrain/material changes were present in both runtime files at the start. Their exact baseline and patch are saved locally in `baseline/`. They and their tests are excluded from this enhancement's commit. The shared handoff and all unrelated files remain with their owners. No deployment was requested or performed.

The normal commit hook also found a desktop source duplicate missing an existing canonical fix in `content_engine_source.jsx` (the pending-revision toast guard). The matching three lines were synchronized in `desktop/web-app/src/content_engine_source.jsx`; that synchronization remains outside the Moon Mission commit with its owner's changes.

An isolated Git index contains only this enhancement. Reapplying the preserved baseline patch reconstructs the working files' Git content hashes exactly; the staged canonical and desktop blobs also match. The broader regression includes the preserved Moonwalk changes in the working tree.
