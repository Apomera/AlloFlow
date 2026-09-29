# Powered lunar approach physics

The new phase 5 exercise integrates the computer-flown portion of a lunar descent before the existing 300 m landing practice. This is an educational preset. It is not a reconstruction of Apollo 11 guidance or telemetry.

## State and forces

The state is physical time, radius, central angle, radial velocity, tangential velocity, vehicle mass and actual throttle. Radial velocity is positive upward. Tangential velocity is positive downrange. The Moon is spherical and does not rotate.

- Lunar radius: 1,737,500 m, shared with landing practice.
- Surface gravity: 1.624 m/s²; μ = g R².
- Departure: a circular orbit at 15,000 m altitude, 1,672.587 m/s sideways, zero radial velocity.
- Initial mass: an assumed 15,200 kg; retained mass after descent propellant is exhausted: 7,000 kg.
- DPS maximum thrust: 46,700 N; specific impulse: 311 s.
- Exhaust velocity: Isp × 9.80665 m/s².
- Engine response: first-order throttle lag with 0.11 s time constant.

For thrust F at pitch α from local upward vertical:

```
dr/dt  = vr
dθ/dt  = vt/r
dvr/dt = F cos(α)/m − μ/r² + vt²/r
dvt/dt = F sin(α)/m − vr vt/r
dm/dt  = −F/(Isp g0)
dq/dt  = (q_command − q)/0.11
F       = 46,700 q
```

The curvature and radial/tangential coupling terms are essential. With an empty engine, the model conserves orbital energy and angular momentum; sideways velocity may change as radius changes without atmospheric drag. During a burn, thrust performs work and exerts torque.

A fourth-order Runge–Kutta integration uses steps no longer than 0.1 s. The available propellant bounds each integration slice, so an almost-empty engine cannot create more impulse than its remaining fuel supplies. A root search locates the 300 m crossing inside its last step. Inspected times re-integrate from the preceding stored sample rather than interpolating position separately from speed.

## Guidance and measured results

Cubic Hermite references request altitude from 15 km to 300 m with radial endpoints 0 and −9 m/s. A second reference requests sideways speed from the initial orbital speed to +4 m/s with endpoint accelerations −2 and 0 m/s². Feedback corrects errors. Gravity and curvature feed-forward terms convert requested acceleration into a thrust vector; the engine caps force at its maximum. The reference curves do not assign spacecraft position or velocity.

| Guidance duration | Actual crossing | DPS propellant used | DPS propellant left | Surface downrange | Time requesting maximum thrust |
| --- | --- | --- | --- | --- | --- |
| 600 s | 600.004 s | 7,021.2 kg | 1,178.8 kg | 440.4 km | 135.3 s |
| 720 s | 720.002 s | 7,225.9 kg | 974.1 kg | 513.7 km | 0 s |
| 900 s | 900.001 s | 7,583.3 kg | 616.7 kg | 615.2 km | 0 s |

The nominal crossing is 300 m, −9.00059 m/s radial speed and +3.99987 m/s sideways speed. Its integrated engine delta-v is 1,967.44 m/s. Longer flight spends additional fuel supporting the vehicle; the shorter plan reaches the force ceiling and temporarily deviates from the requested trajectory before recovering.

The existing landing practice starts from rounded 300 m speeds and resets its reserve according to difficulty and mission decisions. Approach fuel is displayed and recorded in kilograms, and is not silently carried into that separate exercise. Service Module burns remain separate from the DPS tank.

## Views and persistence

Whole-approach and local views project the same spherical geometry with equal metres per pixel on both axes. The local frame rotates to the current lunar radial direction. The enlarged lander points along computed thrust; the plume follows actual throttle. The yellow arrow follows physical velocity. Surface texture is schematic and has no collision or slope effect.

Pause, rate, seek, plan and view are saved. Review awards no XP. Recorded evidence survives rewind and reload; choosing another duration clears it. Every saved result field is recomputed, and a corrupt claimed completion restarts at departure and clears the stored result. Hidden pages freeze the model clock and resume with a fresh timestamp. Canvas removal disconnects its observer and visibility listener.

## Limits and primary references

Continuous throttle, instantaneous commanded thrust direction, a spherical non-rotating Moon, a rounded initial mass and cubic reference guidance are teaching assumptions. Earth gravity, lunar gravity anomalies, terrain, RCS consumption, attitude dynamics, descent-orbit insertion and historical navigation errors are omitted. These assumptions are stated beside the controls.

- [NASA: Apollo lunar descent guidance](https://ntrs.nasa.gov/citations/19740044219) describes the orbital-to-surface guidance problem and computer control of the descent engine. Our reference curves and control gains are our own simplified guidance.
- [NASA: Apollo 11 Mission Report](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf) documents braking, approach and landing phases and the actual descent sequence.
- [NASA: Apollo experience report, Descent propulsion system](https://ntrs.nasa.gov/citations/19730011150) documents the lunar descent engine and propulsion system.
- [NASA Ames: lunar lander simulation reference](https://aviationsystems.arc.nasa.gov/publications/2008/AF2008100.pdf) is the engine reference already used by the final-approach model for thrust, specific impulse and response assumptions.
