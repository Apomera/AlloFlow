# Lunar departure physics

## Scope and continuity

The optional phase 8 laboratory fills the previously skipped lunar departure burn. It begins after Lunar Module jettison in the docking exercise's circular 110 km lunar reference orbit. This reference orbit is separate from the earlier achieved insertion ellipse and ascent/rendezvous trajectories. A 10,000 kg CSM mass excluding SPS propellant is an explicit teaching preset. It is not a reconstruction of Apollo 11's vehicle mass.

A validated captured insertion supplies the remaining SPS propellant. An earlier save without verified capture uses the nominal insertion reserve and identifies that origin on screen. No fabricated saved reserve is accepted. Intervening CSM burns, consumables and detailed mass transfers are omitted. The optional laboratory never alters insertion or Earth-return evidence and awards no XP.

[NASA's Apollo 11 journey-home account](https://www.nasa.gov/history/50-years-ago-apollo-11-the-journey-home/) describes the approximately two-and-a-half-minute SPS departure burn behind the Moon. The educational reference command is 151 seconds. It is not fitted to historical telemetry. Engine parameters retain the existing insertion model: 20,500 lbf (91,188.543 N), rounded 314 s specific impulse, standard gravity 9.80665 m/s². The [NASA service propulsion experience report](https://ntrs.nasa.gov/citations/19730023031) supplies historical engineering context.

## Equations and finite engine burn

The state is Cartesian lunar position, velocity and remaining SPS propellant in SI units. The nonrotating spherical Moon retains the insertion model's radius 1,737,400 m and gravitational parameter 4.9048695 × 10¹² m³/s².

Acceleration is −μr/|r|³ plus T/m along velocity while the engine fires. Propellant flow is T/(Isp g₀); mass is the 10,000 kg preset plus remaining propellant. Velocity tracking is simplified attitude guidance, not a reconstruction of an Apollo pointing program. Thrust acceleration grows as fuel is consumed. Velocity is never assigned to a desired orbit.

RK4 integrates a 90 s preburn coast, the finite burn at 0.5 s steps, and the unpowered departure coast at 5 s steps. Every ignition, commanded cutoff and fuel exhaustion is an exact integration boundary. Fuel exhaustion ends thrust immediately. An independent midpoint solver at 0.02 s checks cutoff position, velocity and propellant. A refined 0.25 s full profile checks cutoff and coast-boundary convergence.

Specific orbital energy ε = v²/2 − μ/r distinguishes bound trajectories from lunar escape. Positive energy gives lunar hyperbolic excess speed sqrt(2ε). The eccentricity vector and angular momentum give the outgoing hyperbola direction. Bisection locates zero-energy crossing during the burn and the outward crossing of 10,000 km lunar radius. The coast stops at that radius, one bound revolution, or four hours after cutoff, whichever comes first. A high bound ellipse can reach the radius boundary; its energy still classifies it as bound.

## Timing and geometry

The reference ignition angle is calibrated once with the nominal fuel reserve and the 151 s reference burn, aligning its outgoing lunar direction with fixed Earth at negative x. The calibration retains finite thrust and mass loss. A timing offset rotates the initial circular state by n × offset, with n = sqrt(μ/r³). Changing burn duration or the available fuel does not retarget this angle.

For the reference fuel, a 300 s late ignition rotates the outgoing direction by 15.160594° without changing energy or fuel use. The coast conserves energy and angular momentum while lunar gravity reduces speed.

Earth radio reuses the finite-distance geometry from the lunar environment model: Earth fixed 384,400 km away, nearest spherical surface receiver, straight segment blockage by the Moon, and c = 299,792,458 m/s. A blocked ray ends at the physical lunar limb. [JPL constants](https://ssd.jpl.nasa.gov/astro_par.html) list c; body positions and the mean Earth radius remain the existing teaching presets. Radio direction differs from the outgoing flight direction at finite distance.

The Moon and trajectory use equal physical axes in both burn and coast views. The coast view fits the largest radius reached by the trajectory, including bound ellipses. The spacecraft, plume and velocity vector are enlarged. The dashed purple outgoing hyperbola asymptote is displaced from the lunar focus; its perpendicular distance is |h|/v∞. It is available only after a positive-energy cutoff. It does not represent an Earth targeting corridor.

## Nominal comparisons

| Command | Actual burn | Fuel used | Remaining SPS fuel | Cutoff energy | Lunar excess speed | Direction error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short, 80 s | 80.000 s | 2,369.081 kg | 5,044.087 kg | −0.492431 MJ/kg | Bound | Undefined |
| Reference, 151 s | 151.000 s | 4,471.641 kg | 2,941.528 kg | 0.578072 MJ/kg | 1.075241 km/s | 0.000° |
| Reference, 300 s late | 151.000 s | 4,471.641 kg | 2,941.528 kg | 0.578072 MJ/kg | 1.075241 km/s | 15.161° |
| Command 300 s | 250.331 s | 7,413.169 kg | 0 kg | 2.903761 MJ/kg | 2.409880 km/s | −23.682° |

The reference engine's ideal integrated delta-v is 913.888 m/s. Its zero-energy crossing is at elapsed 205.760695 s, cutoff at 241 s, and the 10,000 km radius boundary at 6,246.154162 s. The reference cutoff mass is 12,941.528 kg. Speed at cutoff is 2.538832 km/s; it falls to 1.461889 km/s at the radius boundary.

## Limits and saved results

Positive Moon-only energy and alignment with fixed Earth cannot establish an Earth intercept or a safe atmospheric entry. Earth and Sun gravity, moving bodies, inclination, navigation burns, attitude dynamics, antenna hardware and real vehicle mass accounting are omitted. The existing Earth-only return keeps its independent preset matched to the selected entry interface. The UI, report and debrief state that boundary explicitly.

Saved departure evidence includes model version, burn duration, ignition offset, fuel amount and fuel origin. Every expected summary field is recomputed and checked. Invalid terminal saves restart at zero; valid review survives rewind, reload and close/reopen. Changing the departure plan clears its optional evidence without touching the Earth-return result. Opening the lab pauses the return clock, and playing either trajectory pauses the other. The debrief, text report and flight archive retain verified measurements, and mission replay resets all departure controls.
