# Trans-Earth orbit model

The former return coast used a radial fall for distance and speed, a separate drawn arc, and a separate approximate ellipse for Earth illumination. The new model uses one incoming Kepler ellipse for position, velocity, time and the crew's angular view of Earth.

## Boundary conditions

The spherical Earth radius, gravitational parameter, entry altitude and entry speed come directly from `MM_ENTRY`: 6,371,000 m, 3.986004418 × 10¹⁴ m³/s², 122,000 m and 11,030 m/s. The chosen interface flight-path angle ranges from −4° to −9°. It is measured below the local horizontal; negative radial velocity means descent.

The coast begins at 384,400,000 m from Earth's center. This is an educational boundary-value preset. Choosing a different entry angle constructs a different departure orbit; it does not command a burn or change an existing spacecraft's velocity instantaneously.

For interface radius `r`, speed `v` and angle `γ`, the specific energy and angular momentum are:

```text
ε = v²/2 − μ/r
h = r v cos γ
a = −μ/(2ε)
e = sqrt(1 + 2εh²/μ²)
n = sqrt(μ/a³)
```

The incoming eccentric anomalies at departure and interface use the negative branch of `acos((1 − r/a)/e)`. Mean anomaly is `M = E − e sin E`; elapsed time is `(M − M_start)/n`. A bracketed solver evaluates the eccentric anomaly at a requested physical time. Samples are calculated from the conic rather than interpolating a displayed speed independently of position.

```text
x  = a(cos E − e)
y  = a sqrt(1 − e²) sin E
vx = −a n sin E / (1 − e cos E)
vy =  a n sqrt(1 − e²) cos E / (1 − e cos E)
vr = (x vx + y vy)/r
vt = (x vy − y vx)/r
γ  = atan2(vr, vt)
```

The nominal −6.5° model coast lasts **226,291.690 s / 62.859 h**. Initial speed is **977.891 m/s**. At interface, total speed is **11,030 m/s**, radial velocity is **−1,248.631 m/s**, and tangential speed is **10,959.098 m/s**. Radial closing speed is `−vr`; it must not be labeled as total Earth-relative speed. The vacuum periapsis is about 38.031 km above the spherical Earth. The coast stops at interface; atmospheric forces determine what happens afterward.

## Separation and rendering

The SM separates exactly **833 model seconds before interface**. Apollo 11's recorded separation at 194:49:12.7 and interface at 195:03:05.7 give this interval. This pass retains the historical timing cue; separation does not impart an impulse or alter the modeled CM orbit. The later SM trajectory and attitude maneuvers are omitted. [Apollo 11 Mission Report, table 3-I](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf).

The whole-return and approach cameras use the same meters-to-pixels scale on both axes. The Earth disc uses its physical radius, the trail uses measured coordinates, and the velocity arrow uses `atan2(−vy, vx)` in canvas coordinates. The spacecraft glyph is enlarged and changes from CSM to CM at separation; there is no coasting exhaust.

The separate crew window uses angular radius `asin(R_earth/r)` and a fixed 80° field of view. A fixed +Y solar direction gives an illuminated fraction `(1 + y/r)/2`. This is a consistent illumination preset; it is not Apollo 11's historical lighting or a geographic reconstruction.

## Verification and limits

Tests check energy and angular-momentum conservation, Cartesian derivatives against central gravity, all selectable angles, radial distance versus curved path length, separation boundaries and immutable bounded caches. An independent forward RK4 integration starts from the computed departure state and reaches the analytic endpoint within the tested limits of 10 m in position and 0.02 m/s in velocity.

This is planar Earth-only motion around a spherical non-rotating Earth. TEI, lunar and solar gravity, inclination, navigation uncertainty, attitude control and engine transients are omitted. The prescribed start distance and neglected perturbations explain why its duration differs from the historical mission. NASA's tutorial describes conic orbits and Kepler's laws; the equations above are the implementation's two-body derivation. [NASA: Gravity and Mechanics](https://science.nasa.gov/learn/basics-of-space-flight/chapter3-3/).
