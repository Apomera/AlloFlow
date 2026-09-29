# Lunar ascent and final approach physics

## Ascent

The new ascent profile integrates radial velocity, tangential velocity, altitude, angular position, vehicle mass, propellant, attitude, thrust work and ideal delta-v. It uses RK4 with a default 0.25 second step. Playback samples this trajectory independently of canvas size and display frame rate.

The preset uses a 1,737.4 km spherical, nonrotating Moon, gravitational parameter 4.9048695 × 10¹² m³/s², 15,568.8 N fixed APS thrust, 311 s specific impulse, 2,365 kg APS propellant and a 90 kg residual reserve. The 4,890 kg liftoff mass includes 2,525 kg of structure, crew, samples, RCS and other consumables. These are rounded educational inputs. They are not a reconstruction of an individual flight's changing tank pressures or mass properties.

For the first ten seconds, the vehicle rises vertically. A bounded attitude controller then commands the thrust direction to build horizontal speed while approaching 20 km altitude. It changes attitude; it never overwrites velocity or altitude. The APS engine is not throttled. Attitude actuator dynamics and RCS fuel spent turning during ascent are omitted.

Insertion requires a computed bound ellipse with perilune at least 15 km and apolune at least 85 km. A root search finds cutoff within the integration step. Fuel exhaustion can instead produce a surface-crossing `suborbital` outcome, or a surface-clearing `target-miss` orbit below the requested insertion target.

Nominal result on this implementation:

| Quantity | Computed value |
|---|---:|
| APS burn duration | 436.17 s |
| Cutoff altitude | 20.06 km |
| Cutoff inertial speed | 1,685.44 m/s |
| Perilune × apolune | 19.03 × 85.00 km |
| Period | 113.18 min |
| APS propellant remaining | 138.46 kg |
| Peak felt acceleration | 0.596 Earth g |
| Ideal engine delta-v | 1,853.0 m/s |

The profile ends at insertion. It does not reconstruct the subsequent orbit adjustment burns or claim that orbit insertion alone achieves rendezvous. Lunar terrain relief, mascons, Earth perturbations, three-dimensional orbital plane changes, ignition transients and structural dynamics are omitted.

## Final approach

The separate final approach exercise starts 120 m behind and 8 m radially outside a CSM in a circular 110 km reference orbit. It uses the planar Hill equations with x radially outward and y along the orbit:

`xddot = 3*n²*x + 2*n*vy + ax`

`yddot = -2*n*vx + ay`

Here `n = sqrt(mu / r³)`. These linear equations are appropriate to the small separation and circular reference orbit assumed in this exercise. The intervening rendezvous transfer is not simulated.

A pair of 100 lbf thrusters supplies each translation axis at up to 20% average pulse duty. The preset uses 284 s Isp and a 40 kg RCS allocation already included in the vehicle's non-APS mass. Fuel depletion ends the applied thrust at its exact time inside a substep; the vehicle then coasts. Releasing a control does not stop the vehicle. The physics step is at most 1/60 second.

The port is crossed at y = 0. Capture requires radial offset no greater than 0.6 m, positive closing speed no greater than 0.2 m/s, and lateral speed no greater than 0.1 m/s. Contact within a 4 m radial corridor that exceeds these capture limits is a collision; passing farther outside is a miss. These are disclosed teaching tolerances, not Apollo certification limits. The model omits attitude alignment, port mechanism dynamics, out-of-plane translation and plume impingement.

The guided preset reaches the port in about 250.81 s at 0.0801 m/s, with about 0.014 m radial offset and 39.09 kg RCS remaining. The guided controller applies bounded thrust and burns fuel through the same dynamics as manual controls.

## Verification

The two new test files pass 21 checks:

- Ascent mass balance, finite fuel, force integration, specific energy versus thrust work, rocket-equation delta-v, vertical climb, bounded pitch rate, computed orbital elements, fuel-starved failure, target misses, step convergence and immutable cached profiles.
- Docking mass accounting, an independent analytic Hill solution, coast energy and momentum invariants, inertia after input release, bounded control and fuel flow, rocket-equation impulse, exact fuel exhaustion, guided capture, collision/miss conditions, terminal states and frame-rate convergence.

Command: `node node_modules/vitest/vitest.mjs run tests/moonmission_ascent_physics.test.js tests/moonmission_docking_physics.test.js --pool=threads --maxWorkers=1 --testTimeout=30000 --reporter=verbose`

## Primary references

- [NASA TN D-7082: Apollo experience report, ascent propulsion system](https://ntrs.nasa.gov/citations/19730010173): fixed 3,500 lbf thrust requirement; 5,213 lb propellant requirement including 196 lb residuals.
- [Apollo 12 APS final flight evaluation](https://ntrs.nasa.gov/citations/19730018123): flight analysis reports approximately 3,503 lbf and 311 s Isp at standard interface conditions.
- [Apollo 11 mission overview](https://www.nasa.gov/history/apollo-11-mission-overview/): the historical APS burn lasted 435 seconds; later RCS maneuvers and several hours of rendezvous preceded docking.
- [Apollo 11 mission report](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf): reports about 10,776.6 lb ascent stage mass at lunar liftoff, the basis for the rounded 4,890 kg preset.
- [NASA lunar synthetic vision simulation](https://ntrs.nasa.gov/api/citations/20080013635/downloads/20080013635.pdf): Apollo-like simulation with 16 RCS jets, 100 lbf per jet and a 284 s Isp preset.
- [Apollo 11 press kit](https://www.nasa.gov/wp-content/uploads/static/history/afj/ap11fj/pdf/a11-press-kit2.pdf): independently documents four clusters of four 100 lbf LM reaction control thrusters.
- [NASA-hosted relative orbital dynamics thesis](https://ntrs.nasa.gov/api/citations/20050061014/downloads/20050061014.pdf), equations 2.33–2.35: the radial x / along-track y Hill equations and their small-separation, near-circular assumptions.
- [MIT Astrodynamics, Lecture 26](https://ocw.mit.edu/courses/16-346-astrodynamics-fall-2008/e4f0632a9f1c98f7e9b25492e1a30eb1_lec_26.pdf): independent derivation of the same equations using radial ξ / along-track η before changing coordinate notation.

All changes remain uncommitted at the user's request. No staging or deployment was performed by this physics subtask.
