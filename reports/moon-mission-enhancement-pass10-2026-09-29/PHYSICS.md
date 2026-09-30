# Finite S-IVB injection model

The departure begins in the existing 185 km circular parking reference. The fixed launch simulation leaves 83,463.329 kg of propellant. Its third-stage dry mass (11,500 kg) and payload (47,000 kg) give a retained mass of 58,500 kg and an initial departure mass of 141,963.329 kg. The 1,000 kg stage reserve is protected. This connects the launch model's tank budget to the departure experiment; it does not propagate the small eccentricity of the launch insertion into the separate circular timing preset.

## Forces and integration

The spherical Earth has radius 6,371,000 m and gravitational parameter 3.986004418 × 10¹⁴ m³/s². The same J-2 model used by launch supplies 920,782 N with 425 s specific impulse and 4,167.826 m/s exhaust velocity. The classroom engine is either on or off.

For position **r**, velocity **v**, mass m, thrust F and exhaust velocity vₑ:

- d**r**/dt = **v**
- d**v**/dt = −μ **r** / |**r**|³ + (F/m) **v** / |**v**|
- dm/dt = −F/vₑ
- ideal engine Δv = vₑ ln(m₀/m)

Fourth-order Runge–Kutta integrates Cartesian position, velocity and decreasing mass with steps no larger than 0.25 s. A step crossing the protected reserve is split at exhaustion; the remaining part coasts under gravity. Fixed profiles retain one-second states. Seeking integrates the fraction after the preceding stored state, preserving the linked position, speed, mass and energy instead of interpolating separate instruments.

Specific orbital energy ε = |**v**|²/2 − μ/r and angular momentum h = x vᵧ − y vₓ define the osculating orbit. The eccentricity vector is ((v² − μ/r)**r** − (**r**·**v**)**v**)/μ. With e its magnitude and p = h²/μ, perigee radius is p/(1+e). A bound orbit has apogee radius p/(1−e). Zero or positive energy gives an open trajectory without finite apogee.

The lunar-distance test uses geocentric radius 384,400,000 m. Its corresponding altitude is 378,029 km. It compares a bound apogee radius to that radius, rather than mixing altitude and geocentric distance. An open trajectory also passes the radial-reach gate, with an explicit escape result. Neither result establishes a lunar encounter.

## Computed cutoffs

| Command | Outcome | Propellant used | Propellant left | Specific energy | Apogee altitude |
|---|---|---:|---:|---:|---:|
| 300 s | Falls short | 66,277.850 kg | 17,185.479 kg | −6.590503 MJ/kg | 47,534.097 km |
| 342 s | Bound, reaches lunar distance | 75,556.749 kg | 7,906.580 kg | −0.820901 MJ/kg | 472,607.176 km |
| 350 s | Earth escape | 77,324.158 kg | 6,139.171 kg | +0.403115 MJ/kg | No finite apogee |

The 342 s case ends at 325.515 km altitude and 10.835374 km/s. Its radial speed is +1,380.451 m/s and tangential speed is 10,747.078 m/s. Ideal engine Δv is 3,166.600 m/s, exceeding the change in inertial speed because gravity acts during the finite burn. Engine acceleration increases from about 6.49 to 13.86 m/s² as mass falls, then becomes zero at cutoff.

## Visuals, persistence and progression

The close camera follows a curved Earth surface. The forecast rotates with the recorded timing position and draws the current osculating conic if thrust stops. Both cameras use equal physical axes. Only the spacecraft and velocity arrow are enlarged; Earth's radius and the lunar-distance ring retain scale. The dashed forecast has no time-propagated Moon position. The plume points opposite velocity because this preset aligns thrust with velocity instantly.

Ignition records the live timing state and opens the finite burn without awarding points. Review records measured evidence without awarding points. A matching recorded result that reaches lunar distance unlocks the separate outbound navigation exercise. Its proceed reward is paid once. A short result, missing result, mismatched plan or corrupted result cannot unlock it. Timing is recomputed from the saved ignition checkpoint; a claimed timing grade cannot override it. Valid completion survives rewind and reload; changing cutoff clears it. Playback freezes when hidden, and resumes without accumulating hidden wall time. Replay archives measured evidence and clears the injection fields. Later-phase legacy saves remain readable without invented injection evidence.

## Scope and primary sources

This is an educational prograde experiment, not reconstructed Apollo guidance. It omits restart and cutoff transients, attitude dynamics, drag, Earth rotation effects, nonspherical gravity, Moon and Sun gravity, venting, spacecraft extraction and lunar targeting. Outbound navigation retains its own departure state and moving-Moon gravity model. The UI states that boundary.

The existing launch model supplies the rounded engine and mass parameters. NASA's [J-2 propulsion history](https://ntrs.nasa.gov/citations/20100027318) describes the single restarting S-IVB engine. NASA's [Apollo 11 mission report, Table 7-III](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf) reports a 347.3 s TLI firing. That measured duration does not calibrate the present 342 s educational mass and guidance choice. NASA's [Saturn V cutoff guidance report](https://ntrs.nasa.gov/citations/19650021049) describes the real targeting problem; the present velocity-aligned integrator is much simpler.
