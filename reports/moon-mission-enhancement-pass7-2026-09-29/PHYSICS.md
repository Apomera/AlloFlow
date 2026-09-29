# Moon Mission pass 7: outbound trajectory physics

## Model and scope

Phase 3 now integrates a planar spacecraft trajectory under Earth and moving-Moon gravity. A finite Service Propulsion System (SPS) correction changes the trajectory and the Service Module propellant balance. The old straight-line, stationary-Moon coast remains available only as a compatibility helper.

This is an educational circular restricted three-body model. It is not an Apollo 11 ephemeris, a flight-planning tool, or a demonstrated free-return trajectory. The review ends at the first closest lunar approach, an actual surface intersection, or the 120-hour integration horizon. Phase 4 starts its separately disclosed lunar insertion preset; this pass does not silently transform the encounter into the phase 4 initial state.

## Constants and departure

All model quantities use SI units. User angle errors are degrees.

| Quantity | Value |
| --- | ---: |
| Earth gravitational parameter | 3.98600435507 × 10^14 m³/s² |
| Moon gravitational parameter | 4.902800118 × 10^12 m³/s² |
| Earth mean radius | 6,371,000 m |
| Moon mean radius | 1,737,400 m |
| Constant Earth–Moon separation | 384,400,000 m |
| Initial altitude above Earth | 334,436 m |
| Initial Earth-relative speed | 10,834.3 m/s |
| Initial flight-path angle above the local horizontal | 7.367° |
| Initial Moon angle from +x | 2.0456704593962067 rad |
| Initial spacecraft mass | 43,500 kg |
| Non-SPS mass, including the docked LM | 25,500 kg |
| Initial SPS propellant | 18,000 kg |
| SPS thrust | 91,188.5431 N (20,500 lbf) |
| SPS specific impulse | 314 s |
| Standard gravity for specific impulse | 9.80665 m/s² |
| Correction ignition | 86,400 s after the departure preset |

The spacecraft starts on +x and initially travels counterclockwise. The Moon moves counterclockwise with angular rate n = sqrt((muEarth + muMoon) / D³). Its model period is 27.284606 days. This follows the selected circular separation and gravitational parameters; the observed approximately 27.3217-day lunar period is not independently imposed on an incompatible circular model.

Departure altitude, speed and flight-path angle are Apollo-inspired rounded values. The Moon phase was calibrated numerically for an approximately 110 km encounter. It is an explicit scenario input, not a claim about the Moon's actual position at Apollo 11 departure.

## Equations, correction and conservation

The Earth-centered axes keep a fixed orientation. Their origin accelerates with Earth, so the Moon's attraction includes the corresponding indirect acceleration:

a = -muEarth r / |r|³
    + muMoon ((rMoon - r) / |rMoon - r|³ - rMoon / D³)
    + thrustDirection × T / mass.

The direct and indirect terms follow NASA's Earth-centered point-mass equation. No transition to a patched Moon-only orbit occurs.

At ignition, the local radial unit vector points outward from Earth. The transverse vector is its counterclockwise perpendicular. The two commanded delta-v components define one direction that remains fixed in these inertially oriented axes throughout the short burn. The SPS operates at fixed thrust. Its mass flow is T / (Isp g0), and the burn duration follows the rocket equation:

requested propellant = initialMass × (1 - exp(-|commandedDeltaV| / (Isp g0))).

The actual duration is the lesser of the requested and available propellant divided by mass flow. The derivative integrates both mass and thrust delta-v. Exhaustion shuts down thrust and leaves the vehicle coasting.

The Earth-only orbital energy is not conserved while the Moon moves. The model instead exposes the dimensionless Jacobi integral of the circular restricted three-body problem. It also integrates its change during thrust using -2 vRotating · aThrust. The tests verify conservation during coast and close this work balance during the correction.

No correction charges the LM descent propellant. The local SPS budget and subsequent phase presets are distinct modeling scopes.

## Integration and events

- Classical RK4 with step doubling: one full step is compared with two half steps.
- Accepted states use the two-half-step result. The error estimate divides their difference by 15.
- Local tolerances are 0.01 m per position component and 10^-8 m/s per velocity component.
- Adaptive steps are capped at 300 s during coast and 0.05 s during thrust.
- Steps end exactly at ignition and cutoff. Tiny positive remaining intervals are integrated.
- Closest lunar approach is the first inward-to-outward zero of relative radial motion.
- Surface intersections and speed minima use bracketed roots with 40 bisections.
- A closest point below the surface also brackets a collision, so a grazing impact cannot be missed merely because the step endpoint lies above the surface.
- Event records preserve integrated position, velocity and mass. Ignition/cutoff may create paired records at the same time with different engine states.
- Arbitrary-time playback locates the previous accepted state and integrates the remainder. It does not linearly interpolate the curved trajectory.
- The measured minimum speed is Earth-relative and is not equated to equal Earth/Moon gravitational pulls.

Profiles and nested records are frozen. The cache retains at most six plans. Playback returns a detached sample.

## Controls and result corridor

| Control | Range |
| --- | --- |
| Departure speed error | -5 to +5 m/s |
| Departure flight-path angle error | -0.05 to +0.05 degrees |
| Radial correction delta-v | -20 to +20 m/s |
| Transverse correction delta-v | -20 to +20 m/s |

The correction components are applied at the fixed 24-hour ignition time. Negative radial points toward Earth; positive transverse points counterclockwise around Earth.

Result classifications:

- **encounter:** closest lunar altitude is 60–500 km.
- **hazardous:** a positive closest altitude below 60 km.
- **miss:** closest lunar altitude exceeds 500 km.
- **impact:** the integrated path reaches Earth or the Moon; impactBody identifies which.
- **horizon:** no closest approach or impact occurs before 120 hours.

The 60–500 km corridor is an educational acceptance threshold. It does not certify a real LOI maneuver. Impact results keep closestTime, closestAltitude and closestSpeed null because the unflown closest point was never reached.

## Calibrated results

| Scenario | Outcome | Closest lunar altitude | Time from departure |
| --- | --- | ---: | ---: |
| Nominal, no correction | encounter | 110,010.687 m | 251,713.296 s |
| Departure speed +1 m/s | miss | 746,227.041 m | 250,837.204 s |
| +1 m/s with radial correction -6.1058696657419205 m/s | encounter | 110,010.597 m | 251,179.239 s |
| Departure angle +0.01° | hazardous | 47,022.134 m | 251,584.508 s |
| Departure angle +0.02° | lunar impact | not reached | impact at 251,340.549 s |

The corrected scenario burns for 2.909819185 s, consumes 86.169972921 kg of SPS propellant and retains 17,913.830027079 kg. It recovers the nominal encounter altitude to within 0.1 m in this model, while its arrival time remains different. Neither velocity nor arrival time is replaced with the nominal result.

Nominal Earth-relative minimum speed is 880.574827 m/s at 232,037.268 s (about 64.455 hours). Nominal speed relative to the moving Moon at closest approach is 2,542.552017 m/s.

The historical Apollo 11 correction was also a small SPS maneuver, but these numerical preset values are computed for this simplified model and are not presented as the historical burn solution.

## API

Exports on MoonMissionPure:

- transit: immutable constants.
- normalizeTransitPlan(raw): validates the four controls.
- transitProfile(plan): returns version, controls, samples, events, summary and initialMass.
- transitSample(profile, seconds): returns a detached physical sample.
- transitMoonState(seconds): analytic Moon x, y, vx, vy.

Sample fields:

time, x, y, vx, vy, moonX, moonY, moonVx, moonVy, earthDistance, moonDistance, earthAltitude, moonAltitude, earthSpeed, moonSpeed, moonRadialSpeed, mass, propellant, propellantUsed, thrust, thrustX, thrustY, massFlow, engineOn, phase, idealDeltaV, jacobi, jacobiChange.

Events:

ignition, cutoff, closest, impact and minimumEarthSpeed. Ignition and cutoff have equal times and no thrust for a zero-burn plan. Closest and impact are nullable. MinimumEarthSpeed is a physical sample and can lie between stored rows.

Summary:

outcome, duration, closestTime, closestAltitude, closestSpeed, impactBody, burnStart, burnEnd, actualBurn, cutoffReason, propellantUsed, propellantRemaining, idealDeltaV, minimumEarthSpeed, minimumEarthSpeedTime.

Optional test-only toleranceScale and propellant inputs bypass the profile cache. They are excluded from normalized saved controls.

## Verification evidence

Command:

    node node_modules/vitest/vitest.mjs run tests/moonmission_transit_physics.test.js --maxWorkers=1 --testTimeout=30000 --reporter=verbose

**13 tests passed**, 29 September 2026. The test file supports MM_SOURCE for the parent's isolated commit-candidate verification.

Checks cover:

1. Departure geometry and consistent circular lunar motion.
2. Direct and indirect lunar acceleration.
3. Jacobi conservation without thrust.
4. Nominal, missed and corrected encounters.
5. Mass flow, rocket-equation delta-v and thrust work.
6. Exact ignition/cutoff and continuous physical state.
7. Fixed inertial burn direction from the ignition radial/transverse basis.
8. Finite and zero propellant.
9. Hazardous passes and lunar impact.
10. Grazing surface crossings.
11. The measured Earth-relative speed minimum.
12. Tighter-tolerance convergence and frame-independent replay.
13. Control validation, bounded cache, frozen profiles and finite values.

Nominal profile: 1,115 stored records. Corrected profile: 1,180 records. Maximum nominal dimensionless Jacobi drift is approximately 1.01 × 10^-8. Tightening tolerances tenfold changes nominal closest altitude by 0.236 m and event time by 0.000376 s; tightening one hundredfold changes it by 0.277 m relative to the default. The corrected profile also stays within 0.5 m and 0.001 s under the tenfold check.

In the focused Vitest run, constructing and checking one nominal trajectory took approximately 7–59 ms depending on initialization and assertions. A standalone Node VM probe took approximately 71–96 ms per uncached profile; cached identical plans return the same frozen object. These measurements establish practical interactivity on the tested host, not a browser performance guarantee.

## Limits

The model omits the Sun, lunar eccentricity/inclination, Earth oblateness, lunar gravity harmonics, atmospheric drag, three-dimensional plane changes, thermal/attitude operations, thrust buildup/tailoff, and navigation uncertainty. It does not simulate the S-IVB burn, transposition/docking or extraction before the post-TLI CSM/LM preset. Tiny commanded burns are an idealized continuous-control exercise, not a model of real SPS minimum impulse or valve timing.

There is no computed return to Earth, no lunar capture, and no claim that the entire mission uses one continuous vehicle state. Those events require their own physically defined initial conditions and propagation.

## Primary references

- [NASA, Astrodynamics Convention and Modeling Reference, NASA/TP-20220014814](https://ntrs.nasa.gov/api/citations/20220014814/downloads/NASA%20TP%2020220014814%20final.pdf): circular restricted three-body dynamics, Jacobi integral, finite propulsion, and Earth-centered direct/indirect acceleration; especially sections 6, 7.5 and 7.6.1.
- [JPL Solar System Dynamics, Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html): Earth and Moon gravitational parameters.
- [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html): mean separation and observed orbital properties.
- [NASA, Apollo 11 Mission Report](https://sma.nasa.gov/SignificantIncidents/assets/a11_missionreport.pdf): departure altitude, space-fixed velocity and flight-path angle in the trajectory table. These informed the rounded educational departure.
- [NASA SPS performance table 2.2-3](https://ntrs.nasa.gov/api/citations/19880020452/downloads/19880020452.pdf): AJ10-137 thrust of 20,500 lbf and 314 s specific impulse.
- [NASA, First Test Firing of the Apollo Service Propulsion System](https://www.nasa.gov/history/60-years-ago-first-test-firing-of-the-apollo-service-propulsion-system/): SPS hardware and mission role.
- [NASA, Apollo 11 mission commentary](https://www.nasa.gov/wp-content/uploads/static/history/afj/ap11fj/pdf/a11-transcript-pao.pdf): historical translunar SPS correction around GET 26:45, separate from this preset's time since departure.

No staging, commit or deployment was performed by the physics subagent.
