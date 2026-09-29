# Lunar orbit insertion physics

## What the model computes

The insertion exercise starts with a specified incoming hyperbola in a Moon-centered orbital plane. It integrates position, velocity, stack mass, SPS propellant, thrust work and ideal engine delta-v. Thrust always points opposite the current velocity. Burn timing and duration change the resulting trajectory through finite force and mass flow; there is no automatic cutoff at a target orbit or replacement of computed velocity.

The arrival vector is a separate teaching preset. It is not inferred from the earlier radial transit diagram. After insertion, the later descent still uses its separately disclosed approach preset.

| Input | Value |
|---|---:|
| Spherical Moon radius | 1,737.4 km |
| Lunar gravitational parameter | 4.9048695 × 10¹² m³/s² |
| Hyperbolic excess speed | 1,000 m/s |
| Unpowered arrival perilune | 110 km |
| Initial time before reference perilune | 900 s |
| Initial docked mass | 43,500 kg |
| Non-SPS mass, including the LM | 25,500 kg |
| Initial SPS propellant | 18,000 kg |
| SPS thrust | 91,188.5 N / 20,500 lbf |
| Specific impulse | 314 s |
| Default ignition lead | 180 s before unpowered reference perilune |
| Default commanded burn | 357.5 s |
| Allowed ignition lead and duration | Each 0–600 s |

The incoming conic is initialized analytically from its excess energy and periapsis radius. Newton iteration solves the hyperbolic Kepler equation for the state 900 seconds before the unpowered closest approach. Cartesian state integration then begins. The initial motion is counterclockwise; unpowered periapsis lies on +x. Earth is represented as a distant observer along −x.

Mass flow is `thrust / (Isp * g0)`. RK4 uses a 0.5 second step during the burn and a 5 second step while coasting. The step ends exactly at ignition, commanded cutoff or fuel exhaustion. Surface crossing and the first inward-to-outward radial turning point use a root search within the integration interval. Paired samples at engine events retain continuous position, velocity and mass with an instantaneous change of engine state.

Playback integrates the remaining fraction of a stored interval, preserving orbital curvature instead of linearly interpolating position. Physics and radio visibility do not depend on canvas size or paint frequency.

## Outcomes and review duration

- **Captured:** negative specific energy, perilune at least 60 km, apolune no greater than 2,000 km, and no surface impact during review.
- **Hazardous:** a bound conic outside those teaching limits.
- **Flyby:** an unbound path that remains clear of the surface.
- **Impact:** the integrated spacecraft position reaches the spherical lunar surface.

The 60 km / 2,000 km corridor is an exercise requirement, not an Apollo operational limit. Negative energy alone does not establish surface clearance. The engine continues for the requested burn unless fuel runs out or the vehicle impacts the Moon.

`summary.duration` includes approach, burn and coast. A bound trajectory is reviewed for one post-cutoff period, capped at 12,000 seconds of coast. A flyby is followed outward for at least 600 seconds after cutoff, until it returns beyond the initial encounter radius, or to the bounded review horizon. Surface impact ends playback at the event. The global simulation cap is 18,000 seconds.

`events.periapsis` identifies the **first** actual radial turning point. With a finite burn, this can precede cutoff and differ from the final orbit's perilune. `summary.minAltitude` covers the whole review. The live orbital elements during thrust describe the unpowered conic that would follow an immediate cutoff; the planned burn can still change it.

Radio loss follows the physical Moon intersection: Earth is visible when `x <= 0` or `abs(y) >= lunarRadius`. Illustrative lighting is independent of this radio geometry.

## Numerical results

Default plan:

| Quantity | Result |
|---|---:|
| Outcome | Captured |
| Burn start / cutoff | 720.0 / 1,077.5 s |
| Burn duration | 357.5 s |
| Cutoff altitude | 108.13 km |
| Cutoff speed | 1,655.23 m/s |
| Perilune × apolune | 99.10 × 234.77 km |
| Period | 124.26 min |
| Propellant used / remaining | 10,586.83 / 7,413.17 kg |
| Ideal engine delta-v | 858.78 m/s |
| Peak thrust load | 0.283 Earth g |
| Complete review duration | 8,533.06 s |

The historical Apollo 11 result differs because this model uses rounded mass, constant nominal thrust and a simple velocity-opposing pointing law. It is not calibrated by forcing the historical endpoint. NASA records Apollo 11 LOI-1 at 357.53 seconds, about 889.25 m/s delta-v and approximately 111 × 314 km afterward. [Apollo by the Numbers](https://www.nasa.gov/wp-content/uploads/2023/04/sp-4029.pdf)

Comparisons at the default 180 second ignition lead:

| Burn duration | Computed result |
|---|---|
| 0 s | Unpowered flyby, 110 km closest approach |
| 50 s | Flyby |
| 200 s | Bound but hazardous: about 106 × 5,698 km |
| 300 s | Captured: about 106 × 1,235 km |
| 357.5 s | Captured: about 99 × 235 km |
| 600 s | Impact after cutoff, at about 1,700 s |

Moving the unchanged 357.5 second burn to a lead of either 0 or 600 seconds also produces an impact. Equal engine delta-v does not imply an equal orbit when burn timing changes. A test with only 1,000 kg SPS propellant exhausts fuel after 33.768 seconds and remains a flyby.

## Verification

All **12 checks** in `tests/moonmission_loi_physics.test.js` passed. They cover the analytical arrival conic, unpowered energy and angular momentum, event continuity, thrust/fuel/mass balance, integrated thrust work, rocket-equation delta-v, computed capture and coast, weak capture and collision outcomes, burn timing, exact fuel cutoff, geometric radio contact, bounded plans and immutable replay data.

Halving both integration steps changes nominal perilune by about 0.000004 m and period by about 0.000000032 s. One post-cutoff orbit returns within 0.000085 m of its cutoff position. The largest nominal specific-energy versus thrust-work residual is below 0.000011 J/kg. These show numerical consistency of the simplified model; they do not measure accuracy against Apollo telemetry.

Observed warm Node runtimes were approximately 3–34 ms per profile, with 2,354 samples for the nominal case. A six-profile cache bounds retained trajectory data.

Focused command: `node node_modules/vitest/vitest.mjs run tests/moonmission_loi_physics.test.js --pool=threads --maxWorkers=1 --testTimeout=30000 --reporter=verbose`

## Limits and sources

The model omits Earth and solar perturbations, lunar mascons and terrain relief, three-dimensional orbital-plane changes, attitude dynamics, RCS steering costs, engine startup/tailoff and historical guidance steering. Very high apolunes from weak burns are two-body predictions; Earth perturbations would matter there, which is one reason the exercise rejects them. The descent-orbit preparation, circularization and subsequent powered-descent approach are not continuous extensions of this model.

- [NASA report, table 2.2-3](https://ntrs.nasa.gov/api/citations/19880020452/downloads/19880020452.pdf): lists the Apollo SPS AJ-10-137 at 20,500 lbf and 314 s vacuum Isp.
- [NASA SPS engine history](https://www.nasa.gov/history/60-years-ago-first-test-firing-of-the-apollo-service-propulsion-system/): independently describes 20,500 lbf thrust, hypergolic propellants and the gimbalable nozzle.
- [NASA MSC internal note 69-FM-180](https://ntrs.nasa.gov/api/citations/19700025089/downloads/19700025089.pdf): navigation simulations used SPS Isp 313.8 s, nominal thrust 20,880 lbf and separate CSM/LM/propellant weights, supporting rounded rather than universal exact engine inputs.
- [Apollo 11 Mission Report](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf): reports 96,061.6 lb at LOI ignition, about 43.57 tonnes, consistent with the 43.5 tonne preset's scale.
- [Apollo by the Numbers](https://www.nasa.gov/wp-content/uploads/2023/04/sp-4029.pdf): gives Apollo 11 ignition altitude 86.7 nautical miles and speed 8,250 ft/s, the 357.53 second insertion burn, and final orbit figures. The model's 1,000 m/s excess speed and 110 km unpowered periapsis are specified educational inputs, not asserted historical measurements.

No source, test or report changes were staged or committed by this subtask. No deployment was performed.
