# Moon Mission simulation enhancement

## Changes

- Powered descent now integrates thrust, propellant mass, changing vehicle mass, engine response, altitude-dependent lunar gravity and lateral motion in SI units. A bounded integration step and contact interpolation retain the actual impact velocity and fuel at touchdown.
- Fuel seconds are ideal upright-hover seconds, derived consistently from propellant mass using the rocket equation. Difficulty and earlier mission decisions still change available reserves and approach drift.
- Added a steady throttle lever, full-thrust override, local flight pause, readable live instruments and braking guidance. Instruments expose altitude, rates, mass, propellant, hover throttle, delta-v, time and displacement. Controls work with keyboard and touch.
- Improved descent terrain, lander detail, shadows, camera framing and fallback rendering. Exhaust expands in vacuum; dust follows deterministic ballistic trajectories using simulation time. Ground motion no longer wraps. Cyan marks the ground below the vehicle; amber shows five seconds of uncorrected drift.
- Outbound and return coasts use smoothly sampled gravity trajectories. Displayed speed is the derivative of displayed distance, and travel-time integration resolves the faster motion close to either body.
- EVA oxygen, sample/instrument cooldowns, sample effects and optional-traverse timers use active seconds. Hidden tabs and XR suspension do not spend reserves.
- Synchronized the standalone module and desktop public copy.

## Scientific scope

This is an educational final-approach simulation. Descent uses 46.7 kN maximum thrust, 311 s specific impulse and 0.11 s engine response from NASA references. The retained vehicle mass is a rounded 7,000 kg teaching assumption. Continuous throttle and assisted attitude control simplify Apollo hardware; separate RCS propellant, detailed staging and terrain-slope landing dynamics are not modeled. The existing landing speed limits are practice thresholds.

Braking height assumes continued full thrust at the current tilt, with an engine-response allowance. It is guidance rather than a guaranteed safe trajectory. The fuel check separately warns when the estimated stopping maneuver exceeds the remaining velocity-change budget.

Scene altitude is compressed for visibility. Terrain relief is illustrative; touchdown is graded against a flat surface. The projection ring and drift arrow are instructional overlays. The coast calculation is radial, with a stationary Moon; the curved route illustrates the mission rather than a numerically integrated free-return orbit. EVA oxygen consumption is an accelerated classroom resource budget. Existing rover movement retains its capped rendering timestep at very low frame rates.

## Sources

- [NASA lunar lander simulation research](https://aviationsystems.arc.nasa.gov/publications/2008/AF2008100.pdf): specific impulse and engine response.
- [NASA lunar module descent engine](https://ntrs.nasa.gov/citations/20090016298): maximum thrust.
- [NASA Moon by the numbers](https://science.nasa.gov/moon/by-the-numbers/): lunar surface gravity and radius.
- [NASA lunar plume and dust research](https://ntrs.nasa.gov/citations/20090022233): ballistic surface ejecta.
- [Apollo Lunar Surface Journal dust observations](https://www.nasa.gov/wp-content/uploads/static/history/alsj/WOTM/WOTM-A17DustObscur.html): lateral dust sheets.

## Validation

All 202 unique Moon Mission unit checks passed across the combined run and targeted rerun. The combined run passed 200/202; one rover test still asserted the previous cooldown variable and was updated without removing its pickup guards, and an existing cloud-geometry test exceeded the default runner allowance. Both complete suites then passed 44/44 with a 30-second test allowance (`verified-unit-tests.json`). A full rerun was interrupted by the terminal-session reset before writing its report; it is not counted as a successful run.

All 13 distinct Chromium scenarios passed: 12 in the existing/new combined browser run, then the desktop-control scenario repeated after final camera refinements plus a full controlled landing. The latter two passed together. Coverage includes real WebGL, keyboard and touch controls, phone layout, pausing/resuming, throttle response, fallback rendering, impact/reset, lunar hop duration, rock collection, rover boarding/driving/exiting, return coast rendering and context cleanup. The controlled landing reached 0.9 m/s vertically and 0.1 m/s laterally with 42 seconds of hover fuel left. Desktop, phone, fallback, final-approach and touchdown screenshots were visually inspected.

JavaScript syntax and scoped whitespace checks passed. Canonical and desktop module SHA-256: `5f6e05f834b646c3cd2bd20f8754244298eff684b6bf1f85dcdf4a09d7cc1b4e`.

No deployment was requested or performed. Unrelated working changes were preserved.

New coverage is in `tests/moonmission_physics_realism.test.js`, `tests/moonmission_eva_resources.test.js`, and `tests/e2e/moon-mission-flight-dynamics.spec.ts`. Browser checks use the repository's local React/Three harness, not the deployed website. Screenshots and runner artifacts are under this report directory.

Reproduce the unit checks with PowerShell:

```powershell
$moonTests = Get-ChildItem -LiteralPath tests -Filter 'moon*.test.js' | ForEach-Object { $_.FullName }
node node_modules/vitest/vitest.mjs run $moonTests --maxWorkers=1 --testTimeout=30000
```

Run the new browser scenarios with:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/moon-mission-flight-dynamics.spec.ts --workers=1 --retries=0
```
