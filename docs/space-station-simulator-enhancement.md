# Space Station simulator enhancement

The station tool connects interior momentum, orbital maneuvers, close-range
spacecraft control and station operations. Dedicated labs explore electrical
power, thermal control, attitude, cabin air, water reserves, airlock pressure
and hypervelocity debris shielding.
Existing crew-shift activities, learning checks, keyboard navigation,
reduced-motion behavior and diagram alternatives remain.

## Physics and scope

- **Momentum bench (Inside → Unity):** SI-unit impulse, coasting, and analytic
  one-dimensional contact between adjustable crew and cargo masses. Catching is
  perfectly inelastic; cushioned contact has an adjustable rebound ratio
  (coefficient of restitution, 0–1); the ideal elastic preset fixes it at 1.
  Restitution sets relative separation speed divided by relative approach speed.
  The lost kinetic energy is ½μ(1−e²)(u₁−u₂)², where μ is the reduced mass.
  Contact impulses are equal and opposite; the pair's momentum is conserved.
  A segmented energy display separates crew motion, cargo motion, and energy
  converted to deformation/heat. A contact forecast becomes a contact report
  when the clock reaches the event, with signed before/after velocities and
  impulses. The center-of-mass diamond maintains constant velocity; one-second
  trail dots and a contact-position marker make the motion easier to inspect.
  Time controls inspect 0.1 s before contact, exact contact, or 2 s afterward
  (clamped to the experiment's end). User-started playback runs at 1×, 4×, or
  10× simulation speed. Changing rebound resets and pauses playback.
  Contact is instantaneous between point masses starting 2.5 m apart. Body sizes,
  vertical offsets, and velocity arrows are schematic. Walls, air drag, orbital
  gradients, finite contact duration, and rotation are omitted. Cargo moving
  away too quickly or meeting beyond the 120 s limit has no contact controls or
  invented energy loss. The cushioned ratio is illustrative, not a measured
  material property.
- **Orbit transfer planner:** two-body Hohmann transfer with signed burns,
  vis-viva speeds, and Kepler-equation time propagation. Both burns are required
  to reach a circular destination orbit. The state display respects the existing
  prediction-before-answer exercise. Impulsive coplanar maneuvers omit finite
  burn duration, inclination changes, and perturbations. The coast can play at
  30×, 120×, or 300×; it stops at arrival and still requires the second burn.
  Motion overlays show the actual velocity vector and Earthward gravitational
  acceleration, each with a fixed independent display scale. Equal-time markers
  use Kepler propagation. Radial speed reports climb/descent separately from
  total speed; the energy inspector separates kinetic and gravitational energy.
  Altitude and speed profiles support pointer/touch inspection and the keyboard
  time slider. Seeking pauses playback and does not fire a burn. Endpoint bars
  show the impulsive velocity changes; instruments use circular states before
  injection and after circularization, with continuous position at both burns.
- **Atmospheric drag investigation:** drag force and secular altitude decay
  depend on density, speed, frontal area, drag coefficient, and station mass.
  Adjustable mass (200–600 t), exposed area (200–1600 m²), and atmospheric
  activity change the 30-day forecast. A 1–20 km reboost on day 10 or 20 uses
  the two-burn Hohmann Δv and the ideal rocket equation with an illustrative
  300 s specific impulse. Consumed propellant reduces mass for subsequent drag.
  Hourly midpoint integration stops at 180 km, with the final crossing resolved
  inside its hour; it does not model reentry or extend the curve past that limit.
  A no-reboost comparison runs from the same initial state and stops separately.
  Pointer/touch chart inspection, a keyboard time slider, before/after burn
  controls, and playback at 1, 5, or 10 simulated days per second drive the same
  altitude, decay-rate, drag-force, and fuel readings. Inspection interpolates
  between hourly samples without interpolating across a burn. Before/after
  controls inspect the two sides of the same event; the forecast compresses
  the transfer's burns and coast into one altitude change. Setup changes reset
  and pause the clock; hiding the comparison leaves the clock untouched.
  Station geometry, Earth curvature, and force arrows are schematic. The
  atmosphere is an illustrative exponential model calibrated to 75 m/day at
  420 km, 420 t, 800 m² and nominal activity, with drag coefficient 2.2.
  Atmospheric rotation, winds, changing attitude, and time-varying space weather
  are omitted. This is not a weather forecast or an operational orbit prediction.
- **Docking:** linear relative orbital dynamics near a circular reference orbit;
  explicit simulation time, finite RCS propellant, inertial coasting, and
  terminal contact checks. Vehicle and thruster parameters are illustrative,
  not specifications for a named real spacecraft. The braking display checks
  remaining propellant using the rocket equation, budgeting both fixed thrust
  axes separately. Its distance estimate assumes constant initial acceleration;
  it is not a full powered trajectory or a guarantee of a clear capture path.
  The coast forecast uses the same relative-motion integrator as live flight,
  with a selectable 30, 60, or 120-second window and all thrusters off, including
  rate hold. The path and accessible readings stop at first contact or approach
  zone exit, using the simulator's actual speed and alignment capture limits.
  Rendezvous, final-approach, and cross-drift practice starts restore the vehicle
  and pause for inspection; retry repeats the selected start. Forecast controls
  never advance time or consume fuel.
  An approach camera keeps the capsule and capture plane in view using the same
  metre scale on both axes; a wide view remains available. Range gates and the
  ±2.5 m alignment opening use that scale. The capsule's drawn nose meets the
  simulator's −5 m contact plane; hardware icons remain schematic.
  Single pulses (0.25, 0.5, 1, or 2 seconds) and five-second coast steps use the
  same fixed-step integrator as live flight, stop at terminal events, and leave
  the clock paused. Pulses respect precision thrust and finite propellant.
  Step feedback separates thrust-delivered Δv from measured velocity changes,
  which also include orbital coupling in the rotating reference frame.
- **Power and eclipse investigation:** the Integrated forecast and Power lab
  share one exact, two-phase energy balance. Solar power supplies constant station
  demand first; surplus charges a finite 210 kWh usable store. Charge and discharge
  conversion efficiencies are each 95% (90.25% round trip), illustrative teaching
  assumptions rather than measured ISS hardware values. Sunlit power remains
  160 kW × sin(array angle); 0° is edge-on and 90° is face-on. This 92-minute
  model treats sunlight and eclipse as constant-power phases.
  Full storage rejects additional solar energy. Empty storage stops discharging
  and records unmet demand instead of supplying imaginary power. Initial energy
  plus collected solar equals loads supplied plus final storage, conversion losses
  and rejected solar; requested demand equals supplied plus unmet energy.
  The exact full/empty and eclipse events appear in both forecasts. The reserve
  flight rule reports the minimum over the whole orbit. A full battery can finish
  below its starting reserve even with surplus daylight; a nominal setup settles
  into a sustainable cycle after rejecting excess charge.
  The interactive lab shows projected array area, sunlight/shadow, live bus flows,
  stored energy and an energy ledger. A lossless comparison uses the same capacity,
  generation and load, and preserves the clock. Playback, captured mouse drag,
  touch taps, a native 0.1-minute keyboard slider and exact event buttons inspect
  the same model. Setup changes reset and pause playback. Presets cover balanced
  operation, full storage and a low-reserve eclipse. The model omits ageing,
  battery temperature/current limits, individual channels and automatic load
  shedding; shortfall is an energy-accounting result, not a failure simulation.
- **Cabin air investigation (Air + water):** a 12 m³ crew zone and a
  388 m³ cabin exchange equal air volumes. One crew member occupies the small
  zone; the others occupy the larger volume. Baseline CO₂ production is
  42 g/hour per person, with an adjustable 1–3× multiplier for the local crew
  member. Both volumes start at the selected uniform concentration. Fixed
  101.325 kPa and 22 °C conditions and the ideal-gas relation convert grams of
  CO₂ to ppm by volume; the volumes and flow rates are illustrative.
  Mixing transfers Q(Czone − Ccabin), never creating or destroying CO₂.
  Scrubber removal is proportional to cabin concentration and an effective
  clean-air throughput of 70 m³/hour at 100%. The total identity is initial
  CO₂ + exhaled − scrubbed = CO₂ remaining in both volumes. A separate
  transfer accumulator also verifies each volume's mass balance.
  Restricted flow can produce a high local concentration while the cabin
  sensor and volume-weighted average remain much lower. A timed recovery
  restores mixing to 90 m³/hour; concentrations remain continuous, and
  subsequent mixing can briefly raise cabin CO₂ as the local pocket clears.
  The no-recovery comparison changes only that intervention. Fan and scrubber
  stop at total electrical loss in the shared power model; respiration
  continues. Partial supply is assumed sufficient for both devices.
  Fourth-order integration uses at most 10-second steps, split at recovery,
  eclipse and battery-empty boundaries; inspection integrates a partial step.
  The first 4000 ppm crossing is refined within its step. A 0.5-second
  convergence run verifies the integration. The shared flight rule and
  quality meter use the orbit's highest modeled zone concentration, so a late
  recovery does not erase an earlier peak. The 4000 ppm line is an
  investigation reference, not a health/exposure limit or operational rule.
  The cutaway, sensor readings, airflow markers, graph, mass budget, exact
  event controls and playback share one clock. Native sliders, captured
  pointer dragging and touch inspection support the same interactions.
  Fan and marker positions follow accumulated circulated volume, so they
  slow with restricted flow and freeze with the fan unpowered.
  Setup changes pause and reset time; component focus and comparison preserve
  it. Presets cover balanced flow, a restricted vent and timed restoration.
  Water recovery and daily oxygen-demand calculations remain below the lab.
  Internal spatial gradients, molecular diffusion, pressure regulation,
  oxygen consumption, adsorption-bed cycling/capacity and individual device
  power budgets are omitted. CO₂ dots, fan motion, geometry and flow-marker
  speed are schematic; the model does not resolve a face-level plume.
- **Water reserves (Air + water → Water reserves):** a separate 30-day model
  tracks a finite 300 L clean-water store and a 100 L wastewater store.
  Crew demand is 3.8 L/person/day. Supplied use enters the wastewater pool;
  treatment returns efficiency × processed volume, with the remainder counted
  as an unrecoverable loss. Treatment is limited by adjustable input throughput,
  available wastewater and free clean-water storage. Empty stores cannot supply
  imaginary water; full clean storage throttles treatment. The teaching model
  counts excess wastewater as an uncontained loss, without suggesting this is
  an actual station operating procedure.
  Adjustable outages stop treatment until the repair time. A timed cargo
  delivery unloads only what the clean tank can hold; rejected cargo remains
  outside station inventory. Exact piecewise-linear flows stop at tank events
  and scheduled boundaries. Inventory is continuous at outage/repair and has
  a vertical jump at an accepted delivery. Before/after delivery inspection
  shows both sides without interpolation. Two accounting identities are checked:
  initial inventory + accepted cargo = remaining stores + treatment losses +
  uncontained wastewater; requested use = supplied use + unmet demand.
  Recycled and consumed volume represent internal circulation, not new inventory.
  Presets demonstrate a steady loop, an outage with a supply shortfall, and a
  delivery that prevents that shortfall while exceeding wastewater capacity.
  A no-delivery comparison keeps all other settings fixed. The forecast retains
  earlier unmet demand even after repair or delivery restores available water.
  A tank/processor schematic uses bladder fill area proportional to capacity
  fraction, avoiding a gravity-dependent flat liquid surface. Flow markers and
  processor rotation follow cumulative circulated volume and freeze when flow
  stops. Native component buttons expose explanations. Playback runs at 1, 5 or
  10 days/second; mouse/touch graph inspection, a 0.1-day keyboard slider and
  exact event buttons pause playback. Setup changes reset the run.
  The Water loop flight rule still compares recovery efficiency; it is marked
  “RECOVERY ONLY” to distinguish it from the longer inventory forecast.
  Tank sizes, rates and starting reserves are illustrative. Constant density
  treats 1 L as 1 kg. Real processing stages, humidity/urine pathways, transport
  delays, water quality, oxygen generation, rationing and fluid motion are
  omitted. This planning model is not coupled to the 92-minute electrical model.
- **Airlock pressure (Air + water → Airlock pressure):** a separate 20-minute
  experiment joins a finite 388 m³ cabin to an adjustable 6–24 m³ airlock through
  a small equalization valve. Both hatches remain closed. A planned sequence
  vents the airlock to vacuum, holds with valves closed, then refills it from
  the cabin. Other presets start with unequal pressures or an outer-seal leak.
  Starting pressure, volume, valve areas, leak area and phase timings are
  adjustable. A higher starting airlock pressure reverses the transfer.
  Fixed reservoir temperature (295.15 K), R = 287.05 J/(kg·K), and pV = mRT
  connect pressure and mass. Ideal compressible restriction flow uses γ = 1.4
  and an illustrative discharge coefficient of 0.72. The flow is choked below
  a downstream/upstream pressure ratio of approximately 0.528, and becomes
  subsonic as the pressures converge. Venting to vacuum has an exact
  exponential mass solution under the constant-temperature assumption.
  Conservative implicit-midpoint exchange is bounded by the equilibrium
  transfer. Symmetric splitting handles simultaneous exchange and leakage,
  with steps of at most 0.5 seconds and exact scheduled boundaries. A 0.05-second
  comparison verifies convergence. Total initial gas equals cabin mass plus
  airlock mass plus cumulative vented mass. Each reservoir's independent mass
  identity and transfer direction are also tested. Separate accumulators drive
  flow markers for the controlled vent and uncontrolled seal leak.
  A live intervention closes both control valves at the selected moment and
  leaves the preceding trajectory intact. An outer-seal leak remains open,
  so airlock gas can continue escaping while cabin mass stays fixed. A
  no-isolation comparison uses the same starting inventory and hardware.
  Clickable hardware hotspots, pressure histories, native time controls,
  exact phase/sonic-transition/equalization events and playback inspect the
  same state. Pressure difference × an illustrative 1 m² hatch area produces
  the displayed loads and force arrows. Equalizing the inner hatch does not
  remove the outer hatch's load against vacuum. The 0.05 kPa event is a graph
  comparison tolerance, not a hatch-operating criterion.
  The constant reservoir temperature assumes heat exchange with structure;
  real rapid venting changes temperature. This uncrewed teaching model omits
  heat transients, molecular flow at very low pressures, gas composition,
  respiration, makeup gas, pressure regulation,
  recovery pumps and detailed valve geometry. It is not a Quest hardware model
  or an EVA procedure and does not share the other experiments' clocks.
- **Hypervelocity shield lab (Debris):** replaces the static impact picture and
  energy-threshold survival verdict with a reversible microsecond experiment.
  Particle material/density, diameter, speed, aluminum bumper thickness,
  standoff and a spread-energy fraction control a normal-incidence shot.
  The cross-section, cloud front, footprint comparison, timeline, energy
  ledger and component inspectors share the same analytic state. Plate and
  particle markers are enlarged; gap and cloud use a common spatial scale.
  Playback ends at first rear-wall contact. Mouse/touch chart seeking and
  a native slider with 0.05 µs keyboard steps pause the clock; all setup
  changes start a new shot. Inspector and comparison changes preserve time.
  The compact, spaced and dense-particle presets reset the complete setup.
  The rear wall also has a captured pointer/touch drag handle, with arrow-key,
  Page Up/Down and Home/End alternatives. The cross-section fits the full
  2–20 cm standoff range for each particle/bumper setup, keeping its spatial
  scale fixed during a drag. Pointer displacement therefore moves the wall
  by the corresponding physical distance; cancellation releases the gesture.
  The ordinary standoff slider remains available. Direct wall changes reset
  and pause the shot, while inspection and velocity-overlay controls preserve
  playback. The velocity inset shows the incoming speed before the bumper,
  then the conserved-momentum forward speed and equal/opposite radial edge
  velocities. Its arrows share one fixed speed scale across time and setups,
  with a dashed 15 km/s guide, so entrainment visibly shortens the forward
  arrow. They are velocity indicators, not travel distances. Rear-wall
  contact values are pre-impact.
  A live transverse cloud probe shares the same microsecond clock. Its
  captured mouse/touch ring, native radius slider and arrow/Page/Home/End
  keys select 0–100% of the cloud radius. Inspection follows the same material
  fraction during playback and preserves the setup, clock and saved reference.
  The selected core is also highlighted in the side view. A fixed spatial
  scale makes expansion visible; optional magnification fills the transverse
  view while labeling the changing physical scale. Exact bumper, mid-flight
  and wall buttons remain available beside the probe. Measurements are
  unavailable before entrainment, and wall values are still pre-impact.
  For fractional radius a in the uniform disk, enclosed mass and forward
  energy scale as a². Integrating radial kinetic energy gives a⁴, because
  radial speed grows linearly with radius. A half-radius core therefore
  contains 25% of the mass and 6.25% of the sideways kinetic energy. The
  probe reports absolute mass, both kinetic energies, radial speed at the
  selected edge and current forward energy per disk area; no spatial internal
  energy distribution is assumed. Zero spread explicitly has no sideways
  energy. Tiny nonzero readings retain scientific notation.
  Sixty-four equal-mass tracer samples use eight equal-area radial shells
  with symmetric azimuths. They move with the model velocities, cancel net
  radial momentum, and reproduce total radial kinetic energy by midpoint
  quadrature in squared radius. These are samples of a continuous disk,
  not predicted individual fragments or a measured fragment distribution.
  Enclosed fractions are integrated analytically, rather than inferred from
  how many displayed dots fall inside the sampling ring.
  A saved reference captures the six setup parameters in a versioned plain
  object. It stays fixed across parameter changes, experiment presets,
  mission presets and mode switches; replacing it or returning to the
  matched 2 cm comparison is explicit. Invalid or incomplete saved records
  fall back to the matched compact setup without changing the stored data.
  Current and reference footprint circles share one spatial scale, including
  when the reference is larger. A parameter table identifies changed inputs.
  Comparative normal loading is factored into forward-energy ratio divided
  by footprint-area ratio, so comparisons with different particles or speeds
  never imply that all energy changes came from spreading. Tiny nonzero
  ratios and fluences use scientific notation instead of rounding to zero.
  A paired side view compares current and saved (or matched 2 cm) designs.
  Its two panels share one isotropic distance scale, fitted to both designs
  at the maximum 20 cm gap and fixed while standoff or time changes. Native
  text readouts keep time, phase, diameter and gap legible on small screens.
  Same-elapsed-time mode uses the main shot's physical clock, with both
  particles launched 4 cm before their bumpers at T+0. Different speeds can
  therefore produce different bumper-contact phases. A reference that
  reaches its wall early is held at that first-contact snapshot, explicitly
  labeled; a slower reference remains in flight (or even inbound).
  The shared range ends at the current design's contact. Each-at-wall mode
  instead inspects the two separate contact events, with each actual time
  displayed. These event snapshots never imply simultaneous arrival.
  Switching modes preserves time and running playback; scrubbing either
  time slider or choosing an event pauses and synchronizes the main shot.
  No second playback clock or post-wall motion is introduced. A sticky
  section navigator provides keyboard and touch links to shot controls,
  the cloud probe, the comparison and the standoff map, moving focus to
  the destination without changing experiment state. The sweep now occupies
  its own section so its chart has more usable width on phones.
  A virtual circular aperture replaces the static footprint thumbnail.
  Both first-contact footprints are center-aligned on a shared physical
  scale. The aperture has an adjustable 0.5–30 mm radius and a radial offset
  in millimeters, shared by both designs. Captured mouse/touch dragging,
  native ranges, arrow keys (0.5 mm), Page keys (5 mm), Home/End and exact
  center/current-edge/reference-edge/outside presets explore the overlap.
  The blue circle is to scale; its crosshair and dotted grab ring are enlarged.
  Map labels retain native screen sizes. The physical ruler chooses a 1/2/5
  length that fits the view, including submillimeter and very wide footprints.
  Reference visibility does not rescale the map or move the aperture.
  A linked radial scan shows forward energy (J) or cloud mass (mg) as the same
  aperture traverses either footprint. Map, chart and native range share one
  offset; pointer capture, touch and keyboard changes preserve playback and
  the saved design. Current and reference curves share absolute linear axes,
  including when the reference is hidden. No curve is normalized independently.
  The cursor uses an exact overlap evaluation rather than interpolating the
  drawn curve. Unit changes persist and do not move the aperture or shot clock.
  Each uniform disk has a constant central region through |R − a|, a partial
  overlap falloff through R + a, then zero. This is the aperture response to a
  uniform cloud, not a radially fading cloud density. The current falloff is
  shaded. Each curve includes exact tangencies and 64 subdivisions within its
  own transition interval, resolving small footprints beside much larger ones.
  Tests bound midpoint interpolation error below 0.1% of each curve's own peak
  across narrow and wide aperture cases, alongside monotonicity, absolute units
  and mass/forward-energy consistency. Readouts retain small values even when
  a much stronger reference dominates the shared vertical scale.
  The map and scan sit beside each other on desktop, with shared controls below;
  they stack on narrow screens, retaining native-size chart labels and markers.
  Measurements integrate overlap area A analytically. For the ideal uniform
  footprint of area Aw, mass is M A/Aw and forward kinetic energy is Kf A/Aw.
  The cloud fraction A/Aw is distinct from aperture coverage A/(πa²); a large
  aperture can contain the entire cloud without being fully covered itself.
  Partial overlap uses two circular-segment areas, with atan2 chord angles
  and a small-angle series to avoid cancellation at grazing contact. Exact
  containment and non-overlap branches handle zero offset, inner/outer
  tangency and disparate circle sizes. Independent strip integration tests
  the partial lenses; boundary tests cover both sides of tangency.
  Readouts distinguish fully inside, partial overlap, whole-footprint
  sampling and outside. Scientific notation retains tiny nonzero readings.
  The offset is bounded to the largest footprint radius plus aperture radius;
  setup changes can therefore bring an out-of-range offset back into view.
  Sampling preserves setup, saved reference and playback; forecasts always
  describe first contact, regardless of the inspected clock time. Uniform
  circular symmetry justifies a one-dimensional radial traverse. It is a
  virtual measurement, not a modeled absorber, damage gauge or pressure sensor.
  The interactive standoff sweep predicts energy per area, cloud diameter or
  bumper-to-wall travel time across 2–20 cm. Every curve holds particle,
  bumper and spread inputs fixed and changes only standoff. Predictions
  use S/u, 2(r + wS/u), and Kf/[π(r + wS/u)²], matching full model evaluations.
  A saved design with different inputs gets a separate dashed curve; a diamond
  marks its actual saved gap. Identical non-gap inputs share one curve.
  Both curves use the same physical axis and fit inside its domain, including
  extreme contrasts. Energy supports log and linear views with explicit units
  and tick values; diameter and travel time use linear axes. Flat zero-spread
  curves retain a finite scale. Log-axis spacing represents equal ratios.
  Pointer/touch capture, a native standoff slider and arrow/Page/Home/End keys
  select the current gap and synchronize the rear-wall handle and setup slider.
  Gap changes pause and reset the shot; switching metrics, axis scale or
  reference visibility preserves its clock. Sweep predictions are independent
  of playback time, and editing the current gap never changes the saved trial.
  The chart explains why spacing redistributes fixed forward energy over area;
  it does not introduce a penetration or wall-survival threshold.
  This is an explicitly idealized conservation model, not a validated
  hypervelocity fragmentation or penetration calculation. A spherical particle
  of mass m entrains a cylindrical aluminum plug with the same cross-section.
  With combined mass M, forward speed u = mv/M conserves momentum. The
  incoming energy K = ½mv² divides into forward kinetic energy Kf = ½Mu²,
  radial expansion f(K − Kf), and internal energy/deformation (1 − f)(K − Kf).
  A uniform thin disk expands homologously, so its edge speed is
  w = √(4f(K − Kf)/M); opposite radial momenta cancel. Its radius at the wall
  is r + wS/u. The sensitivity fraction f is adjustable from 0–30%, with
  a 10% default, and is not a measured material property. At fixed geometry
  and f, the cone angle is speed-independent; speed changes arrival time and
  energy. This is a limitation of the assumed partition, not a general law
  for real debris clouds.
  A 2 cm standoff comparison holds every other parameter fixed. It reports
  footprint diameter, area ratio and normal kinetic energy per area in
  J/cm²; it cannot resolve concentrated fragment loads or infer penetration.
  More spacing changes area and travel time, without removing energy or
  momentum. The 4 cm approach and instantaneous entrainment are illustrative.
  Material choices change only assumed density (aluminum 2,700, glass 2,500,
  steel 7,800 kg/m³). Shock, fracture, phase changes, backward ejecta,
  longitudinal velocity distributions, oblique impacts, multilayer insulation
  and rear-wall response are omitted. NASA references support the shield
  concept and need for impact-test-supported ballistic limits; they do not
  validate this model's plug or energy-partition assumptions.
- **Thermal investigation:** cabin/equipment and external coolant/radiator are
  separate heat stores with 24 and 6 MJ/K capacities. They start at 22 °C
  (adjustable from 16–30 °C) and 4 °C. Finite heat capacity keeps temperatures
  continuous at eclipse and electrical power-loss events. Coolant transfers
  K(Tc − Tr), with up to 4 kW/K conductance. Radiators emit εσA(Tr⁴ − 3⁴)
  using kelvin, emissivity 0.85 and up to 320 m² of active area. The loop and
  area controls scale these values; they do not model fluid flow or panel
  deployment geometry. Heat input is 72% of delivered electrical power plus
  100 W per crew member. Electrical shortfall reduces equipment heat; with no
  electrical supply, the modeled pump stops and metabolism remains.
  Absorbed environmental flux is 6 W/m² throughout the orbit plus 25 W/m²
  in sunlight. These are illustrative teaching parameters, not ISS telemetry.
  Fourth-order integration uses steps no larger than 10 seconds, split exactly
  at eclipse and battery-empty events. Inspection integrates a partial step,
  while comfort-boundary times are refined within a step. Generated plus
  absorbed minus emitted heat equals the change in both stores; coolant
  transfer cancels from that total. A smaller-step convergence check and
  separate store balances verify the numerical model.
  A cutaway heat-path scene shows equipment, circulating coolant and white
  radiator panels. Component inspection explains the selected part without
  moving time. The temperature graph shows cabin, radiator, the 18–27 °C
  comfort band and an optional full-cooling cabin comparison. All instruments,
  the Integrated forecast and the orbit-wide temperature flight rule share
  the same model. Play/pause, selectable clock speeds, mouse drag, touch taps,
  a native keyboard slider and exact event buttons inspect one orbit.
  Setup changes reset and pause time; comparison and focus controls preserve
  it. Balanced, restricted and strong-cooling presets demonstrate thermal
  lag, overheating and overcooling. Automatic thermostats, detailed water/
  ammonia circuits, hardware geometry and temperature-dependent materials
  are omitted; panel geometry and flow markers are schematic.
- **Attitude and momentum management:** a one-axis, ideal rate-hold model uses
  a finite ±19,000 N·m·s gyro momentum envelope. CMGs redirect the momentum of
  constant-speed rotors; saturation does not mean that their spin speed rises.
  A constant external torque adds angular impulse. The controller transfers
  that impulse to the gyros until capacity is reached, after which the excess
  angular momentum rotates the station with ω = Hstation / I. Station angle
  integrates that velocity without damping or a hidden display multiplier.
  The camera fits the rotating hardware and plumes inside the scene while
  preserving the actual pointing angle, including the largest allowed drift.
  A planned unloading burn uses two equal, opposite 1–15 N forces at 8 m
  moment arms. Their net force cancels, their torques add to 2Fr, and their
  combined mass flow is 2F/(Isp·g0), using an illustrative 220 s Isp.
  The finite burn stops at 8% gyro momentum, allocated-fuel exhaustion or
  orbit end. A late burn can stop angular drift while leaving the accumulated
  pointing offset. It does not restore the original orientation automatically.
  Exact constant-torque segments split at capacity and burn boundaries.
  Initial momentum plus disturbance impulse minus thruster impulse equals
  gyro momentum plus station rotational momentum. Burn fuel and removed
  momentum obey the same impulse budget. Inertia is adjustable from
  40–160 million kg·m²; disturbance torque ranges from 0–4 N·m.
  The station cutaway, paired gyro-direction icons, thruster plumes, angular
  velocity, momentum ledger and two interactive graphs share this model.
  Quiet, saturated and preventive-burn presets support comparisons against
  the same setup without a burn. Exact capacity/burn events, captured graph
  dragging, touch inspection, keyboard sliders and playback inspect one
  shared clock. Setup changes reset and pause; focus and comparison preserve
  playback. Control labels retain the precision of their slider steps.
  The Integrated forecast uses the same attitude results and the flight rule
  checks the orbit's peak storage, including before a burn. Completing the
  forecast records its outcome without replacing the initial battery/gyro
  settings and projecting them through another orbit a second time.
  This ideal controller assumes electrically supplied actuators. It omits
  gimbal-rate limits, singularities, three-axis coupling, flexible structures,
  orbital-reference rotation and pointing-restoration feedback. Gyro icons,
  station geometry, usable capacity, inertia and thruster values are
  illustrative, not a hardware steering solution or operational telemetry.
- **EVA torque investigation:** a timed 0.5-second wrench pulse followed by
  2 seconds of free coast, with an optional opposite pulse from 1.50–2.00 s.
  Counter torque ranges from 0–200% of the first pulse. Equal opposite angular
  impulses stop spin at the new orientation; a weaker pulse leaves residual
  spin and a stronger one reverses it. Presets release the model restraint and
  reset time. A signed angular-velocity graph compares the selected sequence
  with free coast; body direction, angular momentum, angle and rotational
  energy all come from the same piecewise analytic torque integration.
  Adjustable initial inertia (16–64 kg·m², default 32) changes the response to the
  same angular impulse. An optional tuck or extension changes inertia linearly
  from 0.75 to 1.25 s, with an adjustable final inertia in the same range.
  External torque is zero during that change, so angular momentum is conserved
  and angular velocity follows L/I. Orientation integrates L/I analytically,
  including the logarithmic term during the linear inertia ramp; it never
  advances by a fixed amount per frame. Spin energy is L²/(2I). The instrument
  panel separates tool work from posture work, whose sum equals spin energy.
  Tucking adds rotational energy and extending removes it; that work does not
  estimate total muscle energy. Matching opposite pulses still stop the spin
  after a posture change without restoring the original orientation.
  Drawn limbs and an inertia ring follow the current model inertia; they are
  schematic and do not derive inertia from anatomical geometry. A held-posture
  comparison uses identical tool pulses; the no-counterpulse comparison uses
  identical posture changes. Native chart labels stay readable on phones, and
  pointer/touch inspection shares the keyboard slider's 0.01 s resolution.
  Before/after posture controls inspect 0.75 and 1.25 s. Changing setup resets
  and pauses time; toggling the reference curve preserves the current state.
  Restraints cancel body torque. Live body angle, angular
  speed and net torque share one analytic model with worksite feedback. The
  worksite's single-pulse task remains separate from the counterpulse trial.
  Playback, scrubbing, and exact cutoff/end-of-coast inspection work with
  keyboard and touch. This illustrative one-axis model prescribes torque and
  omits hand contact, tether tension, three-dimensional joint dynamics and
  damping; it is not an operational EVA procedure.

Playback starts only on request, including with reduced motion enabled. Seeking,
changing an experiment's setup, hiding the page, or leaving the experiment stops
its clock. Saved projects retain elapsed time but never restore active playback.
Delayed React commits are acknowledged as playback frames, so a busy render
does not look like a manual time seek. Long frame stalls are capped to avoid a
large catch-up jump. Changing the
departure altitude discards the old transfer state.

## Physics references

- [NASA Glenn: compressible mass flow and choking](https://www.grc.nasa.gov/www/k-12/BGP/mflchk.html)
- [NASA: Quest airlock](https://www.nasa.gov/international-space-station/quest-airlock/)
- [NASA: 98% recovery milestone and crew water demand](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/)
- [NASA: water recovery and inventory measurement in microgravity](https://www.nasa.gov/ames/space-biosciences/water-recovery-systems/)

- [NASA: atmospheric ventilation and local CO₂ pockets](https://www.nasa.gov/reference/6-0-natural-and-induced-environments-vol-2/)
- [NASA JPL: classroom CO₂ production and mass budget](https://www.jpl.nasa.gov/edu/resources/lesson-plan/the-air-up-there-making-space-breathable/)

- [NASA: space station control moment gyroscopes](https://ntrs.nasa.gov/citations/20100021932)

- [NASA: station coolant loops and radiators](https://ntrs.nasa.gov/citations/20110023292)
- [OpenStax: mechanisms of heat transfer and thermal radiation](https://openstax.org/books/university-physics-volume-2/pages/1-6-mechanisms-of-heat-transfer)

- [NASA: International Space Station lithium-ion batteries and eclipse storage](https://ntrs.nasa.gov/citations/20200000004)

- [NASA Glenn: conservation of momentum](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/conservation-of-momentum-2/)
- [Oxford mechanics: restitution and collision energy, slides 24–25](https://users.physics.ox.ac.uk/~harnew/lectures/mechanics-revision-lecture-1.pdf)
- [OpenStax: center of mass and momentum](https://openstax.org/books/university-physics-volume-1/pages/9-6-center-of-mass)
- [NASA: gravity and orbital motion](https://science.nasa.gov/learn/basics-of-space-flight/chapter3-4/)
- [MIT OpenCourseWare: Clohessy–Wiltshire relative motion](https://ocw.mit.edu/courses/16-346-astrodynamics-fall-2008/e4f0632a9f1c98f7e9b25492e1a30eb1_lec_26.pdf)
- [NASA Glenn: specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/)
- [NASA: standoff and debris-cloud spreading](https://ntrs.nasa.gov/citations/19930000787)
- [NASA: impact regimes and Whipple shield performance](https://ntrs.nasa.gov/citations/20090024821)
- [Wolfram MathWorld: circle–circle intersection area](https://mathworld.wolfram.com/Circle-CircleIntersection.html)
- [NASA Glenn: drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)
- [NASA Glenn: ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/)
- [NASA Glenn: torque and angular acceleration](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/torque-moment/)
- [OpenStax: conservation of angular momentum and changing inertia](https://openstax.org/books/university-physics-volume-1/pages/11-3-conservation-of-angular-momentum)

## Local review

`node dev-tools/space_station_enhancement_qa.cjs --serve` provides a local
working-tree preview. `--capture` exercises the actual browser implementation
and saves desktop/mobile screenshots under `reports/space-station-enhancement-qa`.
Use `--tabs=orbit --orbit-labs=drag` for the focused drag lab checks, including
pointer/touch seeking, keyboard setup changes, burn inspection, and the model
boundary. The default Orbit Lab check covers both transfer and drag experiments.
Use `--tabs=operations` to check the power, thermal, attitude, cabin air, water,
airlock and debris labs, including exact
events, mouse/touch inspection, keyboard controls, energy budgets and eclipse
playback. Select one with `--operation-labs=power`, `--operation-labs=thermal`
`--operation-labs=attitude`, `--operation-labs=air`, `--operation-labs=water`
`--operation-labs=pressure` or `--operation-labs=debris`.
Add `--debris-detector-only` to the debris browser run for the focused aperture
checks and screenshots, including captured map/scan drag and touch, partial
intersection, energy/mass switching, keyboard limits, shared axes and preservation
of the clock and reference. The linked instrument opens at
`?tab=operations&mode=debris#iss-debris-detector-title`.
The local preview accepts `?tab=operations&mode=power#iss-power-lab` and
`?tab=operations&mode=thermal#iss-thermal-lab`. The pointing lab opens with
`?tab=operations&mode=attitude#iss-attitude-lab`. The cabin air lab opens with
`?tab=operations&mode=eclss#iss-air-lab`. Water reserves opens with
`?tab=operations&mode=eclss&lab=water#iss-water-lab`. Airlock pressure opens with
`?tab=operations&mode=eclss&lab=pressure#iss-pressure-lab`. The hypervelocity
shield lab opens with `?tab=operations&mode=debris#iss-debris-lab`.
Use `--tabs=missions --mission-labs=eva` to check the EVA controls, posture
animation, counterpulses, graph inspection, and desktop/mobile layouts.
Add `--accessibility --tabs=interior,operations,map,day,systems,orbit,missions,history,quiz`
to run structural axe checks in Chromium, including the answered quiz and its
keyboard focus transitions. This uses the same rules as the existing jsdom
structural checks; color contrast and page-level regions are outside that scan.

Focused Vitest files cover momentum and energy invariants, orbital transfers,
docking dynamics, coast/contact forecasts and fuel budgets, EVA angular impulse,
thermal energy balances and integration convergence, gyro/body momentum and
finite-burn propellant budgets, two-volume CO₂ conservation and convergence,
vent-restoration/power-loss continuity, finite water inventory and demand balances,
outage/repair continuity, cargo capacity limits, compressible gas transfer,
pressure-force relations, isolation continuity, debris mass/momentum/energy
conservation, dimensional scaling, impact events, footprint loading and
playback lifecycle.
The existing `space_station_tool.test.js` suite covers
the tool's learning, persistence, localization, and accessibility contracts.
