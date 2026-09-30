# Lunar orbit radio and sunlight model

## Continuity with insertion

The optional coast starts at the final position and velocity of the existing recorded lunar insertion profile. It retains that state’s mass and remaining SPS propellant. A captured orbit is required. An ellipse derived from the state advances for exactly one orbital period by solving Kepler’s equation. It preserves the same lunar gravitational parameter and radius used by insertion: 4.9048695 × 10¹² m³/s² and 1,737,400 m. No new burn or fuel reset occurs in this view.

For the nominal 357.5 s insertion burn, the achieved orbit is 99.099 by 234.766 km, with a period of 7,455.561 s (124.259 min). The mass is 32,913.169 kg and remaining SPS propellant is 7,413.169 kg.

## Radio geometry and delay

Earth is fixed at (−384,400,000 m, 0), with a spherical mean radius of 6,371,000 m. The receiver is the nearest Earth surface point to the spacecraft. The minimum distance between that segment and the lunar centre determines Moon blockage. A blocked ray ends at the first physical surface intersection in the diagram. A clear link’s one-way propagation time is surface range divided by c; round trip is twice that value. Blocked states show no direct signal. Geometric light time remains available internally for hypothetical clear-link extrema.

The fixed Earth distance and spherical radius are explicit teaching presets. The model does not represent a particular ground station, antenna attitude, relay network, Earth rotation, lunar terrain, diffraction or communications hardware. The earlier insertion card retains its distant-Earth approximation; this optional coast uses finite-distance geometry.

The speed of light is 299,792,458 m/s. The au is 149,597,870,700 m. Both constants are listed by [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/astro_par.html); c is also specified in the [NIST CODATA record](https://physics.nist.gov/cuu/Constants/Value/c.html).

## Finite-disc eclipses

A fixed Sun at 1 au can be placed at 45°, 90° or 135° in the orbital plane. These orientations compare geometry; they are not Apollo 11 ephemerides. The Sun uses the nominal 695,700,000 m solar radius from [IAU Resolution B3](https://www.iau.org/common/Uploaded%20files/IAUGA2015-Resolution-B3-recommended-nominal-conversion.pdf).

From the spacecraft, the angular radii are asin(body radius / body distance). The angle between the Sun and lunar centre directions determines the overlap. A flat angular-disc overlap formula gives the visible fraction of a uniformly bright Sun. This approximation is suitable for the small solar angular radius, but does not include limb darkening, refraction, diffraction or topography. Independent three-dimensional ray sampling across the solar disc agrees within 0.004 fraction in tested partial contacts.

Full sunlight, partial eclipse and total eclipse are distinct states. Visible Sun-disc fraction indicates illumination; it does not predict solar-panel output, battery charge or temperature. The shadow polygon is a small-angle cone sketch at the same physical scale as the orbit; readouts and contact times use angular geometry. Both Earth and Sun are off scale. The spacecraft glyph is enlarged. No engine plume is drawn during the coast.

The Moon’s far side receives sunlight during the lunar day, as explained in [NASA Moon Facts](https://science.nasa.gov/moon/facts/). For spacecraft, radio loss and sunlight depend on different directions. [NASA’s Apollo 8 history](https://www.nasa.gov/history/50-years-ago-apollo-8-in-lunar-orbit/) describes radio loss during its approximately two-hour lunar orbits. Historical durations provide context; this exercise’s timings are computed from its own achieved orbit.

## Contacts and integration

A 5 s sample grid brackets sign changes in Earth-link clearance and the outer/inner eclipse angular margins. Bisection refines contacts. Intervals split at all contacts; their durations yield radio-blocked, fully sunlit, partial and total eclipse totals. Composite Simpson integration with 64 subdivisions per partial interval gives sunlight-equivalent seconds. Light-time extrema are sampled at 5 s resolution rather than optimized continuously.

| Sun direction | Radio blocked | Total eclipse | Partial eclipse | Fully sunlit |
| --- | ---: | ---: | ---: | ---: |
| 45° | 2,669.430 s | 2,758.316 s | 22.966 s | 4,674.280 s |
| 90° | 2,669.430 s | 2,700.465 s | 21.187 s | 4,733.909 s |
| 135° | 2,669.430 s | 2,650.879 s | 20.027 s | 4,784.656 s |

Nominal hypothetical one-way light time spans 1.254407–1.267110 s. Radio geometry is unchanged by changing the Sun orientation. Eclipse timing shifts. At the 45° preset’s starting state, Earth is blocked while the spacecraft is fully sunlit.

## Saved evidence

The optional saved run includes the insertion ignition lead, burn duration, Sun angle, model version and clock. Completion summaries are recomputed and checked against every saved field. A changed insertion or Sun plan invalidates that evidence. An unverified terminal save restarts at zero. Valid completion survives rewind and reload and appears in the debrief, plain-text flight report and archive. Replay clears the optional controls. Review awards no XP and adds no required mission gate.
