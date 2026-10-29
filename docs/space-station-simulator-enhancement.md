# Space Station simulator enhancement

The station tool connects interior momentum, orbital maneuvers, close-range
spacecraft control and station operations. Dedicated labs explore electrical
power, thermal control, attitude, cabin air, water reserves, airlock pressure
and hypervelocity debris shielding.
Existing crew-shift activities, learning checks, keyboard navigation,
reduced-motion behavior and diagram alternatives remain.

## Operations investigation notebook

The Integrated view supports an independent-trial workflow: predict, record a
baseline, change a control, and compare the evidence. Recording evaluates one
92-minute orbit from the displayed starting conditions. It does not feed the
final battery, temperature, air or momentum state into a subsequent orbit.

Each saved trial contains a versioned snapshot of the 22 integrated controls,
including initial battery and cabin temperature, local air mixing and vent
restoration, CMG storage and unloading settings, crew and research demand,
array alignment, eclipse duration, cooling, scrubbing and water recovery.
The results preserve the full-precision minimum and final battery reserve,
peak CO₂, cabin temperature range, peak CMG load, recovery percentage and
daily water makeup requirement. New recordings also preserve final pointing
change in degrees and unloading propellant used in kilograms. These two optional
measurements expose attitude effects that a peak-CMG reading alone can miss;
they do not add flight rules. The model version remains 1 because the underlying
physics is unchanged. Older trials retain their original eight measurements:
missing supplemental evidence is shown as "Not recorded", with "Not comparable"
for its difference, and exported as an empty CSV cell. Recorded zero propellant
remains numeric zero. Changing the current controls never updates
saved inputs, results or predictions. A trial's evidence/reflection field
remains editable; the prediction is captured when that trial is recorded.

Select a saved baseline and compare it with either the current forecast or
another saved trial. The table shows physical units, signed differences and
unrounded GO/CHECK decisions. Percentage changes are reported as percentage
points. A five-rule comparison identifies newly passing checks, newly failing
checks and unchanged decisions. Cabin temperature counts as one rule requiring
both temperature limits; the two rows remain available as supporting readings.
Readings that round to a rule boundary use `<` or `>` to preserve their side of
that boundary. Small nonzero differences keep their sign instead of appearing
unchanged. These displays never change the full-precision recorded measurements.
The integrated system diagram and supporting lab outcome paragraphs use the
same boundary-aware formatting. Diagram colors include the passing endpoints
for battery reserve, water recovery and cabin temperature.
The changed-control list counts controls that are active in either setup.
Differences unused in both setups appear in a separate disclosure: unloading
time, thrust and fuel when unloading is off, and vent-restoration time when
restoration is off or airflow is already at least 90 m³/h. Enabling a feature on
either side keeps its changed settings in the active list. Inertia remains an
active control even when peak CMG is unchanged. Equal summary measurements do
not prove identical trajectories, and changing one active setting does not
necessarily change every outcome. Saved setup details include the prediction
and every recorded input. The comparison trial has its own editable reflection
and read-only setup and prediction, so adding evidence does not require changing
the baseline. Editing either reflection preserves both recorded setups, results,
predictions, selections, clocks and the unfinished next-trial prediction.
Loading comparison controls keeps the baseline and
comparison selections. A separate action switches the comparison to the current
working setup and transfers focus to the rule-change summary.

"Investigate a measurement" connects the comparison table to its supporting
lab. Choose any of the ten measurements, then explicitly load and inspect the
baseline or comparison trial, or inspect the current setup without loading a
record. A saved inspection restores that trial's controls and seeks in the same
update: minima and peaks use their earliest modeled occurrence, final battery,
pointing and propellant use minute 92, and cabin minimum and maximum each use
their own extremum. Fractional times are retained. Water recovery and daily
makeup are setup calculations and leave both the orbit cursor and independent
water/pressure clocks unchanged.

The four orbital lab sliders retain the full inspection time rather than
snapping it to a tenth of a minute. Their visible and spoken time labels use
two decimals; arrow keys move 0.1 minute from the actual cursor, Page Up/Down
move one minute, and Home/End select the endpoints. CMG peak inspection uses
strict comparisons for unsaturated readings so a tiny rise across the 80%
boundary is not mistaken for a tie. A true saturation plateau still opens at
the analytic first-capacity event.

Inspection pauses playback and retains the selected pair, saved evidence,
reflections and unfinished prediction. Its focused banner distinguishes the
recorded value from the current model's recomputed value, including when those
values differ. Changing the setup or cursor removes stale inspection context.
Return to comparison keeps the loaded controls and focuses the measurement
selector's heading. Self-comparison offers one inspection action. An older
trial missing optional pointing or propellant evidence has a disabled action
and a visible explanation; its ordinary Load setup action remains available.

The optional "Compare through the orbit" panel compares the selected baseline
and saved comparison (or current working setup) at the same independent time.
Six channels cover battery reserve, highest-zone CO₂, cabin temperature, CMG
storage, pointing change and unloading propellant. Both curves share a scale;
the baseline is dashed and the comparison is solid. Readout cards identify
each source and its own sunlight/eclipse phase, including different eclipse
durations. Reference lines show classroom comparison values; instantaneous
readings do not replace the full-orbit flight-rule decisions.

The panel recomputes trajectories from canonical setups using the existing
physics models. Curves connect regular model samples and exact event/extremum
times; cursor readouts inspect the requested time directly. These are separate
from recorded evidence, so older trials may be explored without filling their
missing saved measurements. For example, early and late unloading can give
identical final summaries while storing very different momentum mid-orbit.
Opening the panel, selecting a metric, and scrubbing never load either setup,
change lab clocks, edit notes or alter the selected pair. Its own cursor accepts
fractional times, arrow steps of 0.1 minute, one-minute Page Up/Down steps,
Home/End endpoints and pointer inspection. View preferences persist; models
are computed only while open and reused until a compared setup changes.

"Key moments" adds exact event navigation within that paired view. Each
setup has its own labeled, chronological group, including orbit endpoints and
eclipse entry. The selected measurement determines the other events: battery
reserve/full/empty/minimum, ventilation restoration and peak CO₂, cabin extrema
and comfort boundaries, or momentum storage and actual unloading boundaries.
Disabled or inactive actions do not appear. Extrema and planned actions at the
same time keep separate entries rather than losing their meaning.

Selecting an event moves only the independent comparison cursor and focuses
both source readings and their difference. Previous/next moment traverses the
union of distinct raw event times; displayed hundredths never replace model
precision. The event groups refresh when the metric, selected pair or current
setup changes. Reference boundaries may include an initial reading already
outside the range and do not independently decide the full-orbit flight rules.
The disclosure stays compact when closed and supports keyboard access, phone
layouts and forced colors.

"Download comparison CSV" preserves the paired trajectories separately from
the notebook's recorded summaries. Its rectangular table has two rows at every
shared timestamp, baseline followed by comparison, and includes all six
measurements regardless of the selected chart. Times combine both sample grids,
all key moments and the exact selected cursor; only numerically identical times
merge. Both models are inspected at each shared time rather than joining their
separate sample arrays or interpolating values.

Each row identifies the data as recomputed by the current classroom model and
includes model version, orbit duration, selected measurement, side, saved/current
source kind, saved trial ID when applicable, selected-cursor flag, lighting
phase, source-specific event IDs, units and all 22 canonical setup controls.
This makes a Current setup export reproducible after the controls change. The
CSV keeps raw numeric precision and uses UTF-8 with a BOM, quoted fields and
CRLF rows. A click captures one pair; download status and retry handling do not
alter tool state. Temporary download links and object URLs are released.
Legacy missing recorded results remain missing in the notebook export even
when the comparison download contains recomputed readings for those channels.

Up to six valid trials persist with the tool's saved state: the selected baseline
and the five newest other trials. Recording a revised trial keeps that baseline
selected and compares the new record against it automatically. Changing the
baseline selector changes which trial is retained during later recordings.
Download the notebook as CSV to retain a larger record.
The export includes model version, orbit duration, all settings and results,
prediction and reflection, with units and spreadsheet formula escaping for
user-entered text. Invalid saved records are excluded rather than pairing their
results with repaired or missing settings.

The 3-D map includes a direct route to station investigations. Power, cabin air,
thermal and attitude labs have notebook actions and an optional prediction
field. Recording there keeps the selected lab open, pauses its clock at orbit
completion and preserves all starting conditions. Opening the notebook transfers
keyboard focus to its heading. Water-inventory, pressure, debris and human labs
do not offer the integrated-trial record action because their scope differs.

Trial replay appears only when the current canonical controls match the
selected saved setup. Loading a saved trial restores its controls, pauses the
four shared orbital labs, resets the inspection cursor to zero, and keeps both
saved evidence and the unfinished prediction for the next recording. The focused
load notice identifies the loaded trial and retained baseline. Saved predictions
remain with their trial details. Loading the baseline also selects Current setup
for comparison; loading the comparison trial keeps the saved comparison selected.
Replay events inspect that setup's modeled orbit at the start, mid-sunlight,
eclipse entry and completion. Selecting a trial alone does not change the
working setup. This is deterministic model inspection, not a recorded animation.

Operations status and the flight-director debrief now follow the five explicit
comparison rules. An average score cannot turn a failed reserve, air, recovery,
temperature or CMG check into an all-clear message. These remain classroom
comparison rules, not operational certification or measured station telemetry.
The notebook covers power, cabin air, thermal control, attitude and recovery;
the separate water-inventory, airlock, debris and human studies are outside its
scope. The daily water makeup result is a recovery calculation, not a finite
inventory or resupply simulation.

`tests/space_station_ops_trials.test.js` covers input normalization, agreement
with the physics models' defaults and limits, detached snapshots, corrupted
persistence, retained baselines, bounds, JSON round trips, and CSV escaping. With the local preview
running, `node dev-tools/space_station_trials_qa.cjs` exercises the notebook's
native controls, saved/current comparisons, restoration, notes and export on
desktop and phone. Browser run outcomes are recorded separately from this
description of the checks.
`node dev-tools/space_station_inquiry_qa.cjs` also checks the map entry, recording
and playback pause in each shared lab, focus when opening the notebook, and
baseline retention across eight recordings, including phone and forced-colors
accessibility checks.
`tests/space_station_ops_comparison.test.js` covers the five-rule transitions,
strict and inclusive thresholds, invalid inputs, threshold-aware formatting and
small signed differences. `node dev-tools/space_station_comparison_qa.cjs` checks
saved/current comparisons, loading either trial, preserved drafts, independent
clocks, notes, focus, boundary readings and desktop/phone accessibility.
`tests/space_station_ops_learning.test.js` covers active-setting dependencies,
optional attitude evidence, legacy records, JSON persistence and CSV blanks.
`node dev-tools/space_station_learning_qa.cjs` checks the inertia investigation,
independent reflection editing, inactive-setting explanations, supplemental
readings, older records and CSV exports on desktop and phone, including
forced-colors and accessibility checks.
`tests/space_station_ops_inspection.test.js` checks all ten measurement routes,
canonical setup conversion, exact extrema and earliest ties, fixed water math,
and nonmutation. `node dev-tools/space_station_inspection_qa.cjs` exercises
saved/current inspection, load-and-seek consistency, fractional times, playback
pause, legacy evidence, model/record differences, stale-context handling,
return focus and desktop/phone accessibility.
`tests/space_station_ops_trajectory.test.js` checks model agreement, event
sampling, independent phases, fractional inspection and nonmutation.
`node dev-tools/space_station_trajectory_qa.cjs` checks paired curves and all
six readings, identical-summary investigations, current/self comparisons,
legacy records, independent keyboard/pointer seeking, persistence and
desktop/phone accessibility.
`tests/space_station_ops_trajectory_events.test.js` checks measurement-specific
event sets, exact and coincident times, inactive actions, source phases,
boundary semantics and nonmutation without rebuilding the physical models.
`node dev-tools/space_station_trajectory_events_qa.cjs` checks event seeking,
distinct-time navigation, source updates, preserved evidence and clocks,
focus, and desktop/phone accessibility.
`tests/space_station_ops_trajectory_export.test.js` checks the comparison CSV's
schema, source snapshots, exact shared times, model readings, event identities,
legacy separation, validation and nonmutation. The native download workflow,
retry behavior, saved/current/self pairs, accessibility and phone layout are
covered by `node dev-tools/space_station_trajectory_export_qa.cjs`.

## Physics and scope

- **Synchronized integrated telemetry:** The systems diagram and four physical
  readouts now inspect the same orbit instant as the forecast cursor. Battery
  reserve, highest current CO₂ zone, cabin temperature and CMG storage all use
  existing model inspection at that timestamp. Previously the diagram combined
  final battery/temperature/CMG with peak CO₂ regardless of the cursor. Water
  recovery is explicitly a fixed setup value with a separate inventory day clock.
  Integrated playback advances the shared orbit clock only after Play is selected.
  Seeking, recording, loading, changing setup and leaving the view pause it;
  same-time event selection also pauses. Each physical readout opens its lab at
  the current instant, whereas flight-rule cards still inspect the limiting
  reading over the complete orbit. Recovery can therefore improve current
  telemetry while an earlier peak keeps the full-orbit rule at CHECK. Saved
  trial inputs, measurements and notes remain unchanged during inspection.
  `tests/space_station_ops_snapshot.test.js` checks model agreement, fractional
  time, highest-zone selection, recovery, invalid state and nonmutation.
  `node dev-tools/space_station_telemetry_qa.cjs` checks synchronized readings,
  current-versus-orbit outcomes, lab navigation, playback pause paths, saved
  evidence, keyboard focus and desktop/phone accessibility.

- **Flight-rule inspection and orbit events:** Each Operations rule card opens
  the supporting lab at its limiting reading, including an earlier CO₂ peak or
  CMG saturation that later recovers. Battery inspection selects the earliest
  minimum; thermal inspection selects the greatest excursion outside the comfort
  band, or the maximum when comfortable. Inspection pauses playback even if
  that instant was already selected. Its focused context names the current
  setup and reading; changing the setup or cursor removes stale context.
  The integrated event schedule separately orders actual model boundaries,
  eclipse entry, ventilation restoration and unloading start/end. Coincident
  events remain separate. Event seeking retains full model precision, while
  timestamps display hundredths of a minute; cursor arrows move one minute,
  Page Up/Down ten, and Home/End select the orbit endpoints. Boundary events do
  not independently determine GO/CHECK: exactly 25% battery and 18–27°C remain
  passing values. Water recovery stays a static setup inspection and preserves
  its separate day clock. This schedule follows the current controls; saved
  evidence and trial replay retain their existing matching-setup rules.
  `tests/space_station_ops_timeline.test.js` checks event times, units, limiting
  readings, initial violations, equality and coincident events.
  `node dev-tools/space_station_events_qa.cjs` exercises navigation, pause,
  focus, persistence, fractional times and desktop/phone accessibility.

- **Docking event timing and depleted propellant:** Live docking now resolves
  first contact and approach-zone exit within a physics tick before recording
  elapsed time, propellant consumption, thrust delta-v or a completion debrief.
  The maneuver step report and flight result therefore describe the same
  physical instant, rather than a contact position paired with a later clock
  and fuel reading. A partially fueled final tick applies the commanded force
  until depletion and then coasts through the remainder; it does not spread a
  weaker force over the whole tick. The same existing midpoint-mass thrust and
  RK4 orbital model are used, with event location refined inside the tick.
  No-propellant, low-speed flight inside the approach zone remains active.
  The HUD and a one-time screen-reader announcement explain that thrusters
  and Rate hold cannot change the motion; the coast forecast, pause, coast
  stepping and practice restart remain available. Contact and actual zone
  exit still end the attempt once. The existing front-plane contact model,
  training capture envelope and schematic hardware geometry are unchanged.
  `tests/space_station_mission_physics.test.js` covers sub-tick coast and
  powered contact, matching flight/maneuver/debrief clocks and fuel budgets,
  fractional fuel exhaustion, continued fuel-free orbital motion, exact
  approach-zone exits, live/forecast agreement and one-time completion.
  The focused mission physics suite passed all 108 tests for this change;
  browser outcomes are recorded separately.

- **Module exterior detail:** Eleven cylindrical modules now have smoother
  32-segment hulls, dedicated circular end surfaces and raised ochre handrails.
  One shared square atlas provides shield segments, seals, mounting bolts and
  a schematic closed pressure closure without stretching the side-wall skin
  across the ends. Each module batches both end discs into one mesh and all
  grips/supports into another; geometry is built once and uses ordinary scene
  illumination and shadows. Hardware follows the original module orientation
  on all three axes. Separate materials preserve per-module cutaway opacity,
  with end surfaces ghosted along with the hull and their depth writes disabled
  so they do not hide the rack interior. End-on selection includes the visible
  discs and matching selection/hover cues while camera framing
  remains anchored to the original module. This is visual detail; it does not
  add operable hatches or change the simulation's physical state.
  `node dev-tools/space_station_map_hull_qa.cjs --widths=1440,390` checks the
  rendered geometry, native selection, three-axis close-ups, cutaway visibility,
  preserved dynamics and resource cleanup.

- **Live 3D heat flow:** Map's Heat flow toggle adds a radiator temperature
  overlay, signed coolant-transfer arrows and outward infrared-emission arrows.
  Equipment heat, coolant coupling and pump controls preserve stored temperatures
  while pausing the shared clock. Play and +60 s advance the heat stores, orbital
  phase, array motors and arm together; hiding the overlay does not stop the heat
  model. Camera changes, phase edits and preview inspection preserve history.
  Applying a forecast integrates from the original phase through any intervening
  eclipse boundaries. Reset temperatures resets only the two thermal stores.
  Cabin/equipment and radiator capacities are illustrative 24 and 6 MJ/K, starting
  at 22 and 4 °C. Signed transfer uses up to 4 kW/K of coupling; pump off makes
  transfer zero while radiation continues. Radiation uses absolute kelvin to the
  fourth power, emissivity 0.85 and 262.4 m² of effective area. The illustrative
  environment adds 6 W/m² continuously and another 25 W/m² in sunlight. RK4 steps
  of at most five seconds split at analytical shadow crossings, and integrated
  heat budgets track both reservoirs' energy conservation. Both visible panels
  represent one aggregate radiator temperature and budget; colors and arrows are
  explanatory overlays. This is separate from Operations' thermal scenario:
  equipment heat is prescribed independently of the electrical bus, and detailed
  coolant circuits, thermostats, radiative view factors and spatial gradients are
  omitted. `tests/space_station_map_thermal.test.js` covers conservation,
  continuity, convergence, shadow crossings and immutable state. The focused
  browser checks are `node dev-tools/space_station_map_thermal_qa.cjs --widths=1440,390`.

- **Saved arm pose comparison:** Save live pose captures the actual arm's
  joint state and shared simulation time without pausing or changing motion.
  An orange dashed arm and ring remain at that saved configuration; a line
  joins its hand to the displayed live or preview hand. The comparison reports
  signed station-frame X/Y displacement, straight-line separation, elapsed
  simulated time, and shortest signed joint-angle differences in (-180, 180].
  These are endpoint and orientation differences, not path length or total
  rotation traveled. During a preview, elapsed time includes the selected
  future offset while saving still captures the live state. Show/Clear only
  change the inspection; Target saved pose pauses the clock and retargets the
  existing controller, retaining current joint rates and the brake setting.
  The panel remains available during previews and restores focus when a
  control becomes unavailable. The reference overlay is excluded from camera
  bounds. Fourteen comparison tests cover independent forward geometry, rigid
  transformations, angle wrapping, fractional time, and immutable snapshots;
  the comparison, braking, and preview suites pass all 50 tests.
  `node dev-tools/space_station_map_arm_reference_qa.cjs --widths=1440,390`
  passes desktop and phone checks for the rendered saved/live/future geometry,
  unchanged live state during inspection, elapsed time while resting, saved
  target restoration, keyboard/touch input, focus, layout, accessibility,
  and WebGL cleanup.

- **Arm controls beside the 3D view:** A compact live console sits directly
  below the viewport when Arm reach is enabled. Its play/pause, playback-rate,
  and quarter-second step controls use the same clock as the orbit and arrays.
  Live hand speed, reachable-target gap, and separate shoulder/elbow stopping
  bars use the actual joint state. Paused speed is explicitly labeled as stored
  velocity, and unlatched stop times describe hypothetical braking. The bars
  use a fixed zero-to-four-second scale so changes remain comparable.
  Arm brakes, stop preview, Advance to rest, and camera framing are accessible
  from this console. Opening a preview preserves the live state and moves
  keyboard focus to its time control; closing or applying it returns focus to
  the arm brake control. The violet preview controls now include Advance for
  applying the selected time without scrolling. Array brake buttons in the
  viewport explicitly name the arrays. No joint physics or actuator limits
  change in this interface refinement.
  `node dev-tools/space_station_map_arm_stage_qa.cjs --widths=1440,390`
  checks native controls, exact shared-clock stepping, independent stop bars,
  rendered arm geometry, preview isolation, zero-time Apply, keyboard focus,
  responsive layout, structural accessibility, and cleanup. Both viewport
  sizes pass, along with the existing arm-braking browser regression suite.

- **Joint brakes and stopping path:** The arm can decelerate both joints to
  rest while retaining its saved target. Each joint brakes independently at
  the illustrative limit of 0.5 degrees/s²: stopping time is |v|/a and signed
  angular drift is sign(v)·v²/(2a). With the existing 2 degrees/s speed limit,
  either joint stops within four seconds and drifts at most four degrees.
  Exact integration stops each joint at zero velocity without reversing or
  returning toward its target; releasing the brakes restores target following.
  The stopping-path overlay predicts the curved hand trajectory and final arm
  pose from those independent joint motions. While brakes are released, it
  shows the hypothetical result of engaging them from the current live pose
  and rates. The live stopping overlay is hidden while an arm preview is open.
  Opening, scrubbing, or playing a preview preserves live pose and stored
  velocity. Advance steps the shared arm, array, and orbit clock by the selected
  duration. Target current pose updates the saved configuration without
  releasing the brakes. With brakes released, the servo may move past that
  configuration and return while settling.
  This remains a schematic kinematic model with illustrative actuator limits;
  the stopping path does not calculate collisions or payload forces.
  `tests/space_station_map_arm_braking.test.js` covers analytic stopping drift,
  independent stop times, arbitrary time partitions, target retention, wrapped
  angles, forecast agreement, and malformed inputs. The braking, arm, preview,
  and velocity suites pass all 68 tests. The focused browser run
  `node dev-tools/space_station_map_arm_braking_qa.cjs --widths=1440,390`
  verifies rendered stopping geometry against independent equations, native
  mouse/touch/keyboard controls, retained targets, preview isolation, exact
  shared-clock advancement, responsive layout, structural accessibility,
  and WebGL cleanup at both widths.

- **Hand velocity and speed timeline:** The robotic arm inspector can display
  the hand's instantaneous velocity in station coordinates. Cyan is the
  shoulder contribution, gold is the elbow contribution, and green is their
  vector sum. Shoulder motion rotates the entire chain; elbow motion rotates
  only the distal boom. Each contribution is angular velocity crossed with
  its lever arm to the hand. Dashed addition guides explain reinforcement and
  cancellation; component speeds are not added as scalars. All arrows share
  the selected display scale of 2, 5, or 10 seconds, and zero-length arrows
  disappear. This scale multiplies velocity for display and is not a forecast.
  Frame motion explicitly fits an envelope including the largest vectors.
  Inspection settings leave the camera and simulation state unchanged.
  The inspector follows the selected future hand when an arm preview is open,
  and returns to the current hand when it closes. Pausing retains stored joint
  velocity. The preview's speed chart connects one-second samples, while its
  cursor solves the exact selected time. Pointer dragging selects quarter
  seconds; arrows select seconds, Shift + arrows quarter seconds, Page Up/Down
  ten seconds, and Home/End the horizon limits. Capture is released on hide,
  close, cancellation, second-pointer interruption, scrolling, resize and blur.
  `tests/space_station_map_arm_velocity.test.js` independently differentiates
  each joint's hand position and checks cancellation, units and invariants.
  `node dev-tools/space_station_map_arm_velocity_qa.cjs --widths=1440,390`
  checks rendered vector geometry, addition guides, native chart interactions,
  preview/live isolation, layout, accessibility, and resource cleanup.

- **Arm motion preview:** A violet future arm and sampled hand path show the
  next two minutes under the current joint commands. White dots along the path
  mark ten-second intervals; bunching reveals slower hand motion. Panel and 3D
  controls scrub in quarter-second steps or play the prediction at 10× while
  live time stays paused. The future hand speed uses the two-link Jacobian;
  the remaining gap is measured to the attainable target in schematic units.
  The preview snapshots the same bounded servo as live motion, with 121
  one-second path samples. Selection solves directly from that snapshot,
  including fractional times, rather than interpolating joint poses. Advance
  steps the shared arm, array, and orbit clock once by the selected duration.
  Closing preserves live state; changing a physical control closes the preview.
  Array and arm previews are mutually exclusive. Hiding Arm reach preserves
  the selected preview but pauses its playback; reopening keeps it paused.
  This visual path does not calculate collision clearance or payload dynamics.
  `tests/space_station_map_arm_preview.test.js` checks independent velocity
  derivatives, controller bounds, exact fractional advancement, and immutability.
  `node dev-tools/space_station_map_arm_preview_qa.cjs --widths=1440,390`
  checks rendered geometry, native controls, shared time, responsive layout,
  accessibility, visibility changes, and resource disposal.

- **Interactive robotic arm:** The map's existing two-boom arm now articulates
  toward a draggable target in its fixed station-relative XY plane. Arm reach
  opens the controls; Inspect arm frames the complete workspace. The requested
  target T, a cyan reachable endpoint, and a dashed target configuration remain
  distinct from the solid moving hardware and white actual-hand marker. Two
  inverse-kinematics branches fold the elbow to opposite sides. The link lengths
  are 1.4 and 1.2 schematic scene units, so reachable radii are 0.2 through 2.6.
  Requests outside that annulus retain their requested position, turn amber,
  and show the nearest attainable point. A request at the pivot uses +Y for
  this projection. Sliders, presets, and arrow keys provide the same target
  controls when the movement plane is edge-on. Dragging preserves the initial
  grab offset; camera changes, scrolling, resize, blur, and additional pointers
  release the gesture. Reach guides and visibility affect inspection only.
  Shoulder angle is measured from +Y toward -X; elbow angle is relative to the
  upper boom. Both joints follow the shortest angular error using independent
  critically damped PD servos (response 0.5/s), capped at 2 degrees/s and
  0.5 degrees/s². Trapezoidal position integration uses substeps at most 0.05 s.
  Retargeting pauses the shared clock and preserves actual pose and angular
  velocity. Target current pose requests the current pose while retaining
  momentum and the joint brake setting. With brakes released, the servo brakes
  and settles on that pose. Closing the inspector does not stop
  the motors. Play and explicit clock steps advance the arm alongside the orbit
  and arrays. Array preview playback leaves the actual arm fixed; Advance also
  advances its clock by the selected preview duration. An arm target change
  closes the existing array preview without changing actual array state.
  This is a planar kinematics exercise with illustrative actuator limits, no
  payload forces, torque, joint travel stops, structural flex, or collision
  prevention. Elbow reconfiguration is a joint-space move and may intersect
  station geometry. The real Canadarm2 has seven degrees of freedom; see the
  [Canadian Space Agency data sheet](https://www.asc-csa.gc.ca/eng/iss/canadarm2/data-sheet.asp).
  `tests/space_station_map_arm.test.js` checks independent forward/inverse
  kinematics, reach boundaries, continuity, actuator limits and integration.
  `node dev-tools/space_station_map_arm_qa.cjs --widths=1440,390` checks actual
  rendered geometry, trusted controls, shared time, state isolation, responsive
  layout, structural accessibility, and resource cleanup.
- **3D map orbital lighting:** “Chase the sunrise” links the exterior WebGL
  scene to a circular 420 km orbit. A phase slider, noon/midnight and transition
  presets, and explicit 0.1×/1×/10×/60×/180× playback drive the Sun direction, atmosphere,
  array orientation, shadow indicator and telemetry together. Beta (the Sun's
  angle above the orbit plane) controls eclipse duration. Spherical Earth and
  parallel rays from a point Sun give a cylindrical shadow; grazing orbits have
  no eclipse. Shadow entry/exit presets seek 0.5° past the geometric event.
  Direct station sunlight and solar input are zero in eclipse, while a separate
  light illuminates Earth's day side. Default ideal tracking aligns the array
  front normal with the Sun; the optional motor mode follows that target at a
  limited joint speed. Park flat commands zero joint angles. Input uses the
  actual panel's nonnegative front-face cosine, normalized to a Sun-facing panel,
  following
  [NASA's solar-incidence explanation](https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/).
  It is not an electrical-output or battery calculation. Joint limits, mutual
  shadowing, penumbra and atmospheric refraction are omitted. Display geometry,
  fill light and ground motion remain illustrative. The scene starts paused,
  including under reduced motion; explicit playback uses elapsed time, clamps
  long frame stalls and pauses when hidden. Selection, cutaway and camera
  inspection remain available. GPU resources and captured pointer listeners
  are released at teardown.
- **3D camera and sunlight inspection:** dragging or arrow keys orbit the camera
  around a persistent target while the station's attitude stays fixed. Viewing
  changes do not advance or reset the orbit clock, change playback, or alter
  array incidence. Center or F makes the selected module the target for
  subsequent orbit and zoom; selecting another module leaves that target pinned
  until another focus or view command. Zoom buttons, plus/minus keys, two-finger
  pinch and the scroll wheel on the focused canvas change distance relative to
  that target. Wheel input over an unfocused canvas remains page scrolling.
  Home and Reset view restore the overview; the truss, labs, Russian-segment and
  Earth-facing presets move only the camera. Preset/focus transitions interpolate
  camera and target using elapsed time and are immediate under reduced motion.
  Camera distances are schematic scene units, not physical range measurements.
  Module size and field of view set focus framing and the near zoom limit;
  a conservative y = -3.8 camera floor keeps viewing paths above the illustrated
  Earth's atmosphere. This is an inspection constraint, not a flight or
  collision-avoidance model. Pinch transitions and canceled gestures cannot
  select modules accidentally; hiding or leaving the view releases captures.
  Optional guides share an origin on an array face: the longer gold arrow points
  toward the Sun and the shorter cyan arrow follows the array's outward normal.
  They are direction overlays, not incoming light rays or thrust vectors; their
  lengths do not represent physical magnitudes. A white arc and a 0–180°
  reading show the angle between the unclipped directions, including angles
  greater than 90 degrees when the panel faces away. Ideal tracking aligns both
  arrows; motor tracking can leave an angle while the hardware catches its target.
  The geometric angle remains meaningful in eclipse even though direct solar
  input is zero. Toggling guides preserves the camera and all orbital inputs.
- **Responsive framing and fine playback:** Fit station frames a fixed hardware
  envelope containing the complete array sweep. Inspect array pair centers on
  the representative joint used by the command, forecast and braking overlays;
  short white brackets follow its actual pose. Both modes preserve the current
  viewing direction and use the limiting horizontal/vertical perspective angle
  to fit a padded sphere. Resizing refits the same subject; orbiting keeps the
  fit, while zooming opts out. Motion never makes the camera chase the arrays.
  An interrupted fit transition settles at the subject before manual orbit or
  zoom begins. A range cap reports when the requested envelope cannot fit.
  Camera actions preserve angles, rates, commands, braking, playback and forecast.
  The clock strip below the scene adds slow motion, real time and tenfold speed,
  synchronized with the original orbit speed selector. Phone layouts place help,
  orientation and playback beneath the canvas so those controls cannot obscure
  the inspected hardware. Rate-only changes preserve
  forecasts. +1 s pauses playback and advances exactly one simulated second through
  the existing orbit and joint integrator, including maximum braking; this is a
  physical step and closes any forecast. These controls do not change the model's
  schematic geometry or motor assumptions.
- **3D array pointing workbench:** “Point the arrays” resolves two schematic
  joint angles into the actual exterior wing pose. Rotation around the truss
  spans -180° to +180° and feather spans -90° to +90°. The four large array pairs
  share the same angles. The transform Rx(a) Rz(f) maps the front normal +Y to
  (-sin f, cos a cos f, sin a cos f); the tracking target uses orbital phase for a
  and the negative Sun beta angle for f. The +180° slider endpoint remains
  available as an equivalent orientation to -180°.
  Hold this pointing copies both actual angles. It cancels pending movement in
  speed-only mode; with smooth motors it requests that angle while preserving
  velocity, so moving joints brake and settle rather than stopping instantly.
  Moving a slider from tracking captures the other actual angle before entering
  manual mode; subsequent manual edits preserve the other commanded angle.
  Manual targets stay fixed in the station frame as the orbit advances or its
  phase/beta changes. Face Sun now, Edge-on now and Face away now set manual
  targets for the current Sun direction; they do not continue tracking. Park flat
  commands both angles to zero, matching the original tracking-off control;
  Track the Sun restores a moving tracking target. Pointing changes pause the
  orbit without resetting its phase or moving the camera. The default instant
  mode adopts commands immediately; optional motor mode preserves actual pose
  until simulated time advances. The Sun/normal guides follow actual hardware.
  Gold cell fronts and silver backs distinguish the collecting face in the 3D
  scene; bearing and hinge details make the joint locations visible.
  A linked Sun-view diagram projects the actual joint orientation of a unit-square
  patch. Projected silhouette area is |n·s|, while front-face collection is
  max(0, n·s), for unit normal n and Sun direction s. Direct input is zero in
  eclipse regardless of pointing. Thus a back-facing panel can retain 100%
  projected area while collecting no modeled sunlight; an edge-on patch has zero
  area. The diagram, full 0–180° face angle, solar-input readings and 3D normal
  share the actual pose, including during a slew. Patch scale and arrow lengths
  are illustrative.
  These perpendicular joints demonstrate pointing geometry, not the exact ISS
  mechanism layout or operating limits. The sliders specify angle representation
  rather than certified hardware travel limits. Mechanical interference, mutual
  shading, backside collection, electrical efficiency and batteries are omitted.
  See [NASA's explanation of station solar-array pointing](https://www.nasa.gov/podcasts/houston-we-have-a-podcast/station-solar-arrays/).
- **Optional array drive:** motor mode starts disabled, preserving instantaneous
  pointing and tracking by default. Enabling it starts from the currently shown
  pose. Smooth motors also start disabled, leaving the previous speed-only
  response unchanged. The selectable 0.02, 0.08 and 0.2 degrees per simulated
  second are illustrative requested speed limits for each joint, not measured
  ISS drive limits. Rotation uses the shortest angular error across the ±180°
  representation seam; feather stays within its schematic -90° to +90° range.
  The speed-only integrator advances orbit and actual joints in substeps no
  longer than 0.25 simulated seconds. Both axes move independently at bounded
  speeds and stop on their targets; this mode does not model acceleration.
  Optional smooth motors store each joint's angular velocity and integrate in
  substeps no longer than 0.05 simulated seconds. A bounded proportional-
  derivative controller combines angle error and velocity error, with the
  orbital angular rate as feedforward for Sun-tracking rotation. Its unsaturated
  gains describe a critically damped response; acceleration and requested speed
  constraints also apply. Servo-driven joint position uses the average old and
  new velocity over each substep. Static targets settle to small angle and speed tolerances;
  abrupt retargeting can cause overshoot, braking and reversal.
  The selectable acceleration limits are 0.0005, 0.002 and 0.008 degrees per
  simulated second squared, with 0.002 as the default. These are illustrative
  settings, not ISS specifications. Lowering a requested speed limit preserves
  the current velocity and brakes toward the new limit over time; a joint can
  temporarily exceed the newly selected limit. Signed velocity gauges show both
  axes, with orange ticks for the requested limit. Each minimum braking-angle
  reading is v²/(2a), using the current angular speed and selected acceleration.
  It assumes maximum braking to rest in free motion; it is not a target-arrival
  forecast and excludes travel-stop impacts.
  Feather travel stops clamp the angle and cancel outward velocity as an
  inelastic contact impulse, an explicit exception to the motor acceleration
  bound. The model does not solve torque, joint or station inertia, structural
  flex, reaction motion of the station, power draw, or mechanical coupling.
  Orbit playback, including the stage play/pause control, drives the same clock
  as the joints. The +60 s control pauses playback and advances that clock by
  60 simulated seconds. Unless braking is latched, motors continue following their targets in eclipse;
  actual solar input still becomes zero there. A slower drive can fall behind
  the moving Sun target, making its loss of collecting area visible.
  Commanded and actual angles remain distinct in the controls and readings.
  A dashed violet outline with corner markers shows the target of one
  representative array pair while its joints have a pending error; the solid
  wings show actual orientation. This is an explanatory overlay, not extra
  hardware or a shadow caster. The displayed joint error is the larger of the
  two remaining joint-angle errors; it can differ from the angle between panel
  normals.
  Pausing freezes actual angles and stored velocities. Target edits, Hold this
  pointing, phase/beta seeks, and speed/acceleration changes also pause while
  preserving both. Seeking repositions the Sun and retargets tracking; it does
  not rewind actuator history. Switching between motor modes clears stored
  velocities; disabling motor mode also snaps the actual joints to the current
  command. Camera, module and guide interactions preserve the drive state;
  hiding the page pauses the shared clock, and teardown releases the ghost
  geometry and materials.
- **Maximum-braking experiment:** With motor-limited motion and Smooth motors
  enabled, Apply brakes requests maximum deceleration on both joints without
  replacing their saved pointing commands or tracking setting. The panel and
  compact stage controls share the same brake latch. Engaging or releasing it
  preserves actual angles, stored velocities, orbital phase and the current
  Play/Pause state. A paused experiment reads "Brake armed · paused"; advancing
  the shared clock runs the braking motion. Once both joints stop, the latch
  holds their angles while the orbit and any saved Sun-tracking target continue
  to advance. The status becomes "Braked · targets saved", even if the saved
  target has substantial remaining error. Resume targets releases the latch
  and lets the existing servo accelerate from the current state.
  Explicit pointing edits, including presets, tracking changes and 3D handle
  edits, clear the latch. Orbital phase/beta edits and speed/acceleration changes
  retain it; those settings still pause the clock through the existing edit
  behavior. Switching motion modes clears the latch and stored velocities.
  Camera movement and the stopping-overlay toggle affect only inspection.
  A shared analytical axis helper integrates constant deceleration independently
  of target direction or a reduced requested speed ceiling. For signed initial
  velocity v and acceleration magnitude a, motion lasts min(dt, |v|/a) within a
  step. Displacement is v·t − sign(v)·a·t²/2, then velocity remains zero for the
  rest of that step. This preserves the exact signed stopping travel v·|v|/(2a)
  when the stopping instant falls between integration steps. Zero elapsed time
  preserves velocity, including at a feather boundary. If feather reaches ±90°
  before natural rest, an inelastic contact impulse cancels its outward velocity;
  the contact is identified separately from acceleration-limited motor braking.
  Rotation remains unwrapped inside this helper and is wrapped only for the
  displayed joint pose. Orbital phase advances for the full elapsed duration,
  including time after the joints have stopped.
  An amber dashed array outline and panel-tip path show the predicted stopping
  pose. "If you brake now" identifies the hypothetical result before engaging;
  "Maximum braking" identifies an active maneuver. The violet saved-target
  outline remains distinct. Prediction uses the same axis helper, including
  feather contact, and covers the complete stopping duration even when it
  exceeds the drive step's 3,600-second elapsed-time cap. The trajectory samples
  the corner [0.45, 0.02, 3.7] through simultaneous Rx(alpha) Rz(feather) poses at
  uniformly spaced times, with an adaptive point count for longer angular
  travel. The overlay is hidden during cyan motion-forecast inspection and when
  the joints are already at rest. Toggling it changes no physics, commands,
  playback state or forecast data. Forecast generation copies the brake latch;
  cached samples, fractional replay and Advance preserve that braking state and
  its exact pose and velocity. The maneuver remains a schematic kinematic model:
  it does not calculate motor torque, structural loads or station reaction motion.
- **Actual array surface motion:** An optional inspector follows a material
  point on the representative actual array pair. Select either panel half and
  independently vary its 0–100% span from the inner edge to the tip and its
  0–100% chord across the width. The point's local coordinates are
  `[-0.45 + 0.9 * chord, 0.02, side * (0.3 + 3.4 * span)]`, with `side` equal
  to −1 or +1 and both `span` and `chord` between 0 and 1. These are coordinates of the existing
  schematic geometry, not measured ISS dimensions. Its actual joint transform
  `Rx(alpha) Rz(feather)` gives the position `r` relative to the wing pivot.
  Rotation contributes `(alphaRate * ex) × r`; feather contributes
  `(featherRate * Rx(alpha) ez) × r`, with angular rates converted from degrees
  to radians per simulated second. Their vector sum gives the material point's
  instantaneous velocity relative to the station. This applies the angular-
  velocity addition and rigid-body relation described in
  [MIT's 3D Rigid Body Kinematics lecture](https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/resources/mit16_07f09_lec25/).
  The total speed is the magnitude of that sum: opposing joint contributions
  can cancel even while both joints are moving. The readouts use scene units
  per simulated second and exclude orbital translation and camera motion.
  Playback speed changes how quickly time passes, without multiplying these
  physical-state readings.
  Rose, green and white arrows show rotation, feather and combined velocity
  from the same actual point. Mesh shafts keep these arrows legible when WebGL
  line widths are limited to one pixel. Optional dashed connectors show vector
  addition; a pivot-to-point guide shows the radius. A cyan outline and crosshair
  identify the selected panel half and the probe's span/chord position whenever
  the 3D probe handle is shown. The 100, 300 and 600-second display
  choices multiply all three velocity vectors by one common scale. If any
  arrow would exceed 2.4 scene units, the effective scale becomes
  `min(requestedScale, 2.4 / max(totalSpeed, rotationSpeed, featherSpeed))`.
  The displayed scale reports this reduction; speed readings and the simulated
  motion do not change. Arrow endpoints are instantaneous tangent constructions,
  not predictions of the curved future path. Zero-length arrows are hidden
  while the probe point remains available.
  Moving outward along the span increases the rotation contribution at a fixed
  width. Feather speed is independent of span, but decreases toward the width
  midline as distance from its axis decreases. The small local y = 0.02 offset
  means the midline's feather speed need not be exactly zero.
  The native P button projects the same actual material point into the 3D view.
  Dragging casts a camera ray into the current actual panel plane, inverting
  `Rx(alpha) Rz(feather)` before intersecting local y = 0.02. The initial pointer
  offset from P's center is retained in screen pixels, avoiding a jump when the
  grab starts off-center. Each move uses the current actual pose, even during
  playback. The captured panel half stays fixed; intersections outside its
  rectangular span and width clamp to the nearest edge rather than jumping
  across the central gap. Rays behind the camera, invalid rays, and near-edge-on
  rays with an absolute normalized local y component below 0.08 are rejected.
  P remains keyboard-accessible in an edge-on view: up/down change span and
  left/right change chord by 0.01, Shift increases the step to 0.1, Home selects
  both midpoints, and Escape ends the drag. Both sliders remain available when
  the 3D handle is hidden or outside the viewport. Pointer release/cancellation,
  lost capture, blur, scrolling, resize, camera changes, a second pointer and
  scene cleanup release a captured drag. A pose that becomes edge-on also ends
  the drag rather than amplifying an unstable intersection.
  The inspector requires motor-limited motion with Smooth motors, because those
  modes retain the actual angular velocities. Instant pointing and the
  speed-only drive do not supply stored rates for this measurement. Pausing
  freezes the pose and retains the velocities, so the inspector reports
  "Stored velocity · paused" rather than replacing moving-joint readings with
  zero. During a forecast, the probe continues to identify the live actual
  panel, independently of the selected future pose. Toggling the inspector,
  components or 3D handle, dragging or using the keyboard, selecting a panel
  half, span, chord or display scale, and framing the motion
  preserve the orbit, actual pose, stored rates, commands, brake latch, playback
  and forecast. The separate action that enables Smooth motors changes the drive
  mode through the existing controls.
  Motion framing uses a fixed 4.8-scene-unit envelope around the representative
  pivot, covering the actual array, probe and capped tangent arrows throughout
  their motion. Resizing refits that envelope; orbiting retains it and manual
  zoom opts out. It does not chase the moving material point. The added geometry
  and materials are disposed with the station scene.
- **Array surface speed map:** The motion inspector can color both halves of
  the representative actual array by combined, rotation-only or feather-only
  speed. Each half uses an 11-by-25 grid over the same material plane as P;
  the surface interpolates colors between samples. Values are schematic scene
  units per simulated second, not temperature, solar power or measured ISS
  surface speeds. The model uses the angular-velocity addition and `v = omega
  cross r` relation in the MIT rigid-body reference above. It transforms each
  component's angular velocity into panel coordinates before evaluating the
  cross product at each sample. The selected component's peak is calculated
  at all eight corners of the two rectangles. This is an exact maximum for
  this linear velocity field: its magnitude is convex over each rectangle.
  The automatic color ceiling is the largest corner speed across both halves
  and all three components. Changing components therefore retains a common
  comparison scale at a given instant. Lock color scale captures that positive
  ceiling and retains it across time and component changes, allowing braking
  to darken the surface. Speeds above a locked ceiling saturate at the brightest
  color and are reported explicitly; numerical readings retain the full values.
  Unlocking returns to the current shared maximum. A zero-speed initial state
  cannot create a new lock, but an existing lock remains available at rest.
  The optional dashed cyan line shows the selected component's instantaneous
  rotation axis through the joint pivot. The white line from P ends at its
  perpendicular projection onto that axis. The readings satisfy
  `speed at P = angular speed * perpendicular distance` when angular speed is
  expressed in radians per simulated second; the displayed angular-speed
  readout uses degrees per second. The axis can change as the actual joints
  move and is undefined, and therefore hidden, when that component's angular
  velocity is zero. This is an instantaneous kinematic axis, not a trajectory
  or an extra physical joint.
  Like the point probe, the map requires Smooth motors and uses stored actual
  rates while paused. It follows the current hardware while a separate forecast
  is open, not the selected future pose. Map, component, color-lock and axis
  controls preserve commands, actual pose and rates, the brake latch, clock,
  playback, camera and forecast. The map starts disabled. Its geometry and
  materials are released by the existing scene cleanup.
- **Material-point acceleration:** The motion inspector can replace the velocity
  arrows with amber combined acceleration, cyan turning acceleration, and violet
  changing-spin acceleration at the same draggable P. The calculation is
  `a = omegaDot cross r + omega cross (omega cross r)`, in the station frame.
  For `Rx(alpha) Rz(feather)`, angular velocity is
  `[u, -v sin(alpha), v cos(alpha)]`, where `u` and `v` are the joint rates in
  radians per second. Its derivative includes the moving-axis terms:
  `[uDot, -vDot sin(alpha) - u v cos(alpha), vDot cos(alpha) - u v sin(alpha)]`.
  These terms remain when both joint rates are constant. The MIT rigid-body
  reference above derives this angular-velocity transport and the acceleration
  relation; the visualization does not treat rotations about moving axes as
  independent fixed-axis accelerations.
  Joint accelerations are the right-hand instantaneous response of the existing
  smooth servo, including its tracking feedforward, acceleration and speed limits,
  braking toward a reduced speed limit, and maximum-brake latch. They are not
  estimated from wall-clock frames and do not change the integrator. A stopped
  feather joint cannot accelerate outward through its travel limit. Outward
  nonzero velocity at a stop denotes an impact with undefined finite acceleration;
  the inspector hides its arrows and numeric readings in that state. Instant and
  speed-only drive modes also leave acceleration unavailable.
  The controls preserve the actual pose, stored velocities, commands, clock,
  camera, brake latch, and forecast. Paused readings describe the controller
  response on resume. A stationary point may already have nonzero acceleration;
  `v dot a / |v|` is left undefined at zero speed. Other speed-change values are
  signed, unlike acceleration magnitudes. Acceleration can be nonzero at constant
  speed. All three acceleration arrows share a requested scale of 1000, 10000,
  or 50000 seconds squared, reduced together when necessary to cap their lengths
  at 2.4 scene units. Mesh shafts and dark outlines keep the arrows visible
  against the bright panel surface. Optional velocity arrows retain their own seconds-based
  scale, so their lengths cannot be compared directly. This is schematic
  station-relative kinematics, not force, flexible-panel, or orbital-gravity
  modeling. The overlay starts disabled and its resources follow scene cleanup.
  `tests/space_station_map_acceleration.test.js` checks independent second
  position derivatives, moving-axis terms, pure-turning limits, normalization,
  scaling, and servo/braking/contact edge cases.
  `node dev-tools/space_station_map_acceleration_qa.cjs --widths=1440,390`
  checks native controls, rendered vectors, preserved live and forecast state,
  paused response, braking, lifecycle, layout, and structural accessibility.
- **Local path curvature:** Inside the acceleration inspector, Path curvature
  adds an emerald osculating arc at the same actual material point P. Select
  a 30°, 90°, 180°, or full-circle view; optional guides show its center,
  radius, and a fixed-length white tangent arrow. The circle is an instantaneous
  geometric construction, not an integrated forecast, collision boundary, or
  orbit. Neither velocity nor acceleration arrow magnification changes its size.
  Following [MIT's intrinsic-coordinate treatment](https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/resources/mit16_07f09_lec06/),
  the model uses `T = v / |v|`, signed along-path acceleration `a dot T`,
  `B = (T cross a) / |T cross a|`, and `N = B cross T`. Normal acceleration
  has magnitude `n = |T cross a|`; curvature radius is `R = |v|² / n`, and
  direction-turning rate is `n / |v|` radians per second (displayed in degrees).
  This decomposition differs from the turning/changing-spin split: changing
  angular velocity can contribute to normal as well as tangential acceleration.
  The center is `C = P + R N`. The stable arc formula
  `P + R sin(theta) T + 2 R sin²(theta/2) N` samples 97 points, with P at
  index 48 and positive angle following the velocity. Because this material
  point stays at fixed radius from the joint pivot, `P dot T = 0` and
  `P dot N = -R`. Consequently every point of the osculating circle stays
  on the same pivot-centered sphere. The existing motion-camera envelope
  therefore contains the circle without artificially capping its radius.
  Near-stationary speed (at most 1e-10 scene units/s) or unresolved normal
  acceleration (at most `max(1e-14, |a| * 1e-10)` scene units/s²) suppresses
  the Frenet geometry. Moving but unresolved cases retain signed along-path
  acceleration. A valid radius below 0.005 scene units retains its true numeric
  readings but hides the overlay. The tube uses six radial facets and a physical
  thickness bounded by 0.018 scene units and 4% of R, with a dark outline.
  Geometry buffers are reused and only updated while this inspection is visible.
  All inspection controls preserve live dynamics, clock, camera, brake latch,
  and forecast. Changing a paused motor target may change the on-resume local
  curvature immediately while preserving the actual position and velocity.
  Parent toggles and drive-mode changes hide the overlay without losing its
  settings. Scene cleanup disposes its geometry and materials.
  `tests/space_station_map_curvature.test.js` checks independent position
  derivatives, exact single-axis circles, acceleration reconstruction, sphere
  bounds, time reversal/scaling, numerical thresholds, and tiny radii.
  `node dev-tools/space_station_map_curvature_qa.cjs --widths=1440,390`
  checks native controls, real tube geometry, preserved physics and forecast,
  probe changes, braking, layout, accessibility, and cleanup.
- **Direct 3D array handles:** An optional control shows a rose rotation ring
  and green feather arc on one representative array pivot. Native R/F buttons
  follow their projected target positions; the full rotation ring and ±90°
  feather arc use the same Rx(alpha) Rz(feather) convention as the panel model.
  Dragging intersects the pointer ray with a frozen joint plane and applies
  incremental, wrapped angular differences, so grabbing away from the center
  does not snap the target. Feather commands clamp after every increment;
  reversing immediately leaves a travel limit without an overshoot dead zone.
  Nearly parallel rays, behind-camera intersections and the pivot itself are
  rejected. Edge-on views retain keyboard control and explain how to continue.
  Focused handles use arrows for 1°, Shift+arrows for 0.1°, and Home for zero.
  Their accessible names include commanded angles. Grabbing pauses the shared
  clock and preview; an edit switches to a held command, clears any brake latch
  and invalidates the preview. Both commanded axes are supplied together, preserving the untouched
  target when leaving tracking. With motors enabled, actual angles and stored
  velocities remain unchanged until time advances through the existing drive
  integrator. Camera movement, resize, scrolling, a second pointer, Escape, cancellation,
  blur and hidden-page events release the drag. Off-screen handles are hidden;
  disabling the overlay restores focus if necessary. The rings illustrate
  commands, not added hardware, torque, joint inertia or mechanical clearance.
- **Array motion preview:** Preview next 10 minutes pauses the live simulation
  and copies its current angles, stored angular velocities, commands and brake latch. The
  existing orbit, drive and lighting models propagate that copy into 41 cached
  samples at 15-second intervals over 600 simulated seconds. A cyan outline
  shows one future array pair, with a highlighted corner and its path in the
  station frame. The solid station, current Sun and live readings stay unchanged
  while a slider or either chart selects a time. The 3D view includes
  its own slider, speed selector and Play/Pause controls. Preview playback is
  opt-in, with synchronized 0.1×, 1×, 10× and 60× speed selectors in the panel
  and 3D view (default 60×). Playback stops at the horizon; Play at
  the end restarts from zero. Scrubbing pauses the preview, and hiding the page
  also stops it. The error chart shows the larger remaining joint-angle error;
  future solar input uses the selected actual panel normal, future Sun direction
  and eclipse state.
  Each intermediate pose is propagated from the preceding cached sample with
  its stored velocities, using the same motor integrator. Seeking order cannot
  accumulate drift, and exact snapshot times retain their original values.
  Both sliders scrub in tenths of a second. Chart arrows step one second,
  Shift + arrows step one tenth, Page Up/Down step one minute, and Home/End
  select the endpoints. Displayed times include tenths; playback retains the
  full fractional time when paused. The graph and corner path still connect
  15-second samples, so a continuously solved cursor can depart slightly from
  their straight connecting segments during acceleration.
  Optional **Pause at shadow crossings** stops on the first analytical sunrise
  or sunset crossed by a frame, even when a fast frame spans both ends of a
  sub-second eclipse. It copies the exact event time, then solves that pose and
  motor velocity through the existing forecast sampler. Play resumes past the
  current event and can stop at the next one. An amber status and 3D badge
  identify the crossing without claiming which side the exact boundary occupies.
  Speed and crossing preferences persist across closing and regenerating a
  preview. Changing either preserves the cursor, playback state, live physics
  and camera while resetting the frame timestamp; no old elapsed wall time is
  charged at the new rate. Speed scales the preview clock only, leaving motor
  speed and acceleration in their physical units. Seeking, restarting or
  regenerating clears the previous automatic-stop reason.
  Advance applies that exact selected phase, pose and angular velocity, preserves
  commands and motor settings, adds the preview duration to the motor clock
  when enabled, and closes the preview with playback paused. Closing without
  advancing leaves the live physical state unchanged. Physical edits, time
  stepping and starting live-orbit playback close the preview; camera, module and guide
  interactions preserve it. Generate another preview after a state change.
  The solar-input chart shares the pose cursor and marks Earth shadow with blue
  bands. Entry and exit times come from the circular-orbit shadow geometry,
  independently of the 15-second pose spacing, so a short grazing eclipse is
  retained even when it falls between samples. Separate sunlight and shadow
  segments preserve the discontinuity at each boundary. Actual motor state is
  propagated from the preceding cached sample to evaluate incidence at a
  crossing. The graph lists crossing times and total shadow duration.
  Each crossing has Before, Crossing and After controls. The side probes use
  one second or half the distance to the adjacent event/horizon, whichever is
  shorter, so even a sub-second grazing eclipse can be inspected on both sides.
  These controls retain the exact analytical times rather than rounding to the
  slider step, pause preview playback, and preserve the live simulation.
  Translucent preview panels turn gold in sunlight and blue in shadow; this is
  a visual cue, while the solid station and scene lighting remain at live time.
  Optional future lighting guides start at the positive-side preview panel
  center, Rx(a) Rz(f) [0, 0.02, 2] relative to its wing pivot. A cyan ring marks
  that origin. Dashed gold and cyan arrows show the future Sun direction and
  panel normal; a white arc and 0–180-degree reading show their geometric angle.
  The guides are expressed in the station frame, independently of the camera
  and current solid-panel pose. They remain geometric directions during shadow,
  when the accompanying note identifies blocked direct light. Their lengths
  and arc radius are illustrative, not physical magnitudes. Toggling them
  preserves preview time, playback and the live state; they hide at time zero
  and when the preview closes. The full angle remains meaningful for back-facing
  panels even though front-face collection clamps to zero.
  On narrow screens the preview transport sits below the canvas, keeping the
  future array and lighting guides unobstructed; live controls and orientation
  markers remain anchored to the canvas.
  Solar input is relative to a Sun-facing panel, not electrical output. The
  existing spherical-Earth, parallel-ray model omits penumbra, array self-shadowing
  and electrical conversion; panels facing away can have zero input in sunlight.
  The corner path joins sampled positions; it is not a swept collision volume.
  This prediction reuses the schematic drive response and adds no torque,
  structural flex, interference checks or guarantee of real hardware behavior.
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
  Rendezvous, final-approach, cross-drift, and flyby practice starts restore the vehicle
  and pause for inspection; retry repeats the selected start. Forecast controls
  never advance time or consume fuel.
  The coast inspector samples any time up to that terminal point with partial
  RK4 propagation from the preceding forecast knot; it does not interpolate a
  straight chord through the curved orbit. A magenta outline capsule places its
  nose at that physical position. Equally spaced time markers use 5, 10 or 20 s
  intervals for the selected window; filled dots precede the inspected instant.
  A chevron identifies a predicted point outside the current camera view.
  Selected-time range, axis offset, speed and signed radial/along-track velocities
  update together; the header retains the whole forecast outcome and end time.
  A native range, half-second arrow keys, five-second Page keys, Now and exact
  Forecast end controls do not alter live flight, fuel, Rate hold or pause state.
  End follows the changing forecast endpoint; a fixed look-ahead stays relative
  to the live spacecraft and is clamped to any earlier event. Practice resets
  restore End, and a completed run disables future inspection.
  On wide screens the forecast sits beside the live display so scrubbing and
  motion can be observed together; narrow screens stack the same controls. The
  maneuver-step controls follow this workbench, and the preview time label stays
  above the scene to avoid covering the contact opening.
  Fit coast path adds an isotropic camera containing the complete predicted
  trajectory, live nose, station origin and both edges of the capture opening.
  Its bounds do not depend on the selected time, so scrubbing cannot move the
  view. A dark instrument face keeps speed and braking telemetry legible when
  the recentered station silhouette passes behind it.
  Native clicks or taps near the magenta path select a nearby forecast
  time, using the closest visible segment in CSS pixels. The actual ghost state
  still uses orbital propagation. The hit test clips to the flight scene and
  ignores the wide-camera proximity inset; empty space, modified clicks and
  completed runs cannot select a hidden future. Equal-distance ties choose the
  earlier time. Border-aware coordinates preserve behavior across display sizes.
  Path selection leaves flight time, fuel, Rate hold and thrust unchanged; the
  keyboard slider remains the precise alternative to selecting the drawn curve.
  Closest within forecast numerically refines the minimum station-origin range
  within the existing coast and its first terminal event. It checks knots and
  midpoints and bisects closing-to-opening roots of r·v using the same partial
  RK4 sampler. The earliest equal minimum wins; stationary/retreating motion can
  select Now and a monotone approach can select the exact terminal boundary.
  This is range to the same reference origin as the telemetry, not clearance
  from hardware, and it does not override the capture/contact outcome.
  A cyan diamond identifies an interior minimum. Inspect closest fits the path
  and selects that numeric look-ahead, showing the range to the reference origin;
  it does not track a special closest-follow mode or alter live controls/fuel.
  A zero-duration forecast disables the action. The result is cached with the
  forecast, independently of camera and inspection selection. The new paused
  Flyby start passes outside the station and exposes an interior range minimum.
  A linked range-versus-time chart sits below the live flight controls. Its
  horizontal axis ends at the exact forecast terminal time; range starts at zero.
  Axis bounds come from the full forecast and stay fixed during inspection.
  The curve includes forecast knots plus the exact selected and closest samples;
  the magenta cursor, cyan minimum marker, time/range cards and signed closing
  rate all follow the same coast sample. Positive closing rate means shrinking
  station-origin range, not necessarily motion along the docking axis.
  Captured mouse/touch drags select time horizontally, clamp at either end and
  remain active outside the chart until release. Cancellation, capture loss,
  focus loss, window/document hiding, reset and horizon changes end the gesture.
  Arrow/Page/Home/End keys share the main inspector behavior; numeric endpoint
  selection stays distinct from following End. End and Inspect closest also
  cancel an active drag. Completed forecasts disable seeking without dividing
  by a zero time span. The responsive SVG keeps a fixed 184-pixel height and
  11-pixel axis labels at normal viewport widths, including phones.
  Save coast freezes the unpowered forecast, its mission-time epoch, horizon,
  terminal metadata and physics mode. Amber paths and outline capsules compare
  that saved prediction with the current coast at the same absolute mission
  time, including after pulses or coast steps advance the live clock.
  The timeline crops the reference to the current forecast's shared interval,
  samples its exact boundary and selected point, and never extends it beyond
  the original contact, exit or horizon. A small endpoint circle identifies
  the end of the visible reference. Range change is current minus saved range
  at that shared mission time; it is not a difference between two unrelated
  closest-approach events or a guarantee that a maneuver improves clearance.
  Shared endpoint selects the last instant both forecasts cover. A valid
  zero-width overlap remains inspectable when the current coast has a future;
  unavailable selected times show dashes, and expired references are identified.
  The range scale and fitted spatial camera include the visible saved path and
  remain independent of inspection time. Save, replace, clear and shared seeking
  preserve live flight, fuel and controls; horizon changes keep the snapshot,
  while a scenario/reset/physics-mode change clears it. Saved data and public
  snapshots are copied so later propagation cannot mutate the reference.
  Range and Closing rate buttons switch the existing timeline without changing
  the selected instant, forecast, live flight, camera or saved coast. The view
  preference survives practice resets and horizon changes; switching ends an
  active chart drag. Closing rate is −(x vx + y vy)/range: positive means closing,
  negative means opening. Zero closing rate can coexist with sideways velocity;
  the cyan closest marker retains its actual rate at Now/contact/horizon minima.
  Closing mode uses shared symmetric axes, a solid zero line and fill toward
  zero. Bounds are independent of inspection and cover every point in the current
  and visible saved coasts. Since |closing rate| ≤ speed, a conservative speed
  envelope supplies the limit: HCW Coriolis terms do no speed work, so
  d(speed)/dt ≤ 3n²|x| and d|x|/dt ≤ speed. For each knot interval Δt, the bound is
  speed₀ cosh(√3 n Δt) + √3 n |x₀| sinh(√3 n Δt), with a 5% display margin and
  outward 1/2/5 rounding. In inertial mode it reduces to constant speed. This
  bounds between-knot states too; selecting a sample never expands the axes.
  A 0.05 m/s minimum half-span keeps stationary and completed plots finite.
  The saved comparison follows the selected quantity with signed m/s values
  and current − saved closing-rate change at the same mission time. Positive
  change means closing faster or opening more slowly, not necessarily a safer
  approach. Raw data retain full precision while displayed negative zero is
  normalized. Mode buttons, units, title, help and accessible slider text stay
  synchronized; time seeking uses the same pointer/touch and keyboard controls.
  A linked velocity map plots along-track velocity horizontally and radial
  velocity vertically in the rotating station frame. Both axes use one m/s
  scale, including narrow nested phone panels: the SVG view width matches its
  actual CSS width, rather than stretching a clamped coordinate system.
  Current and saved velocity paths use the full visible forecast and a shared
  speed envelope independent of inspection. The arrow from zero velocity ends
  at the exact propagated sample; its length is total relative speed. Dashed
  component guides can be hidden without changing flight, preview or camera.
  The cyan closest-range marker retains its physical velocity, making nonzero
  sideways motion visible even when closing rate is approximately zero. Zero
  speed renders as an origin point without an arbitrary directional arrowhead.
  Amber uses the same saved mission-time alignment and terminal clipping as the
  other comparisons. An unavailable selected reference hides its vector while
  retaining any shared portion of the saved velocity path.
  Native clicks/taps within 18 CSS pixels of the current velocity path select
  the closest projected segment; the resulting time uses the shared RK4 sampler.
  Only the square plot region is eligible, and exact selected/closest samples
  are added to the drawn paths without changing the base picking segments.
  Velocity is not a unique clock: overlapping segment ties prefer the instant
  nearest the existing selection, then the earlier time; zero-length segments
  retain or clamp that selection. If every knot stays within 10⁻⁶ m/s of the
  first velocity, the path does not pick at all, so constant inertial motion never
  rewinds unexpectedly to Now. The existing time slider and diagram keyboard
  arrows/Page/Home/End remain available for precise inspection. Completed runs,
  empty-space and modified clicks preserve flight and selection. All paths are
  unpowered predictions; vector arrows indicate velocity, not thrust or safety.
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
  A linked radial scan shows forward energy (J), sideways energy (J), or cloud
  mass (mg) as the same
  aperture traverses either footprint. Map, chart and native range share one
  offset; pointer capture, touch and keyboard changes preserve playback and
  the saved design. Current and reference curves share absolute axes,
  including when the reference is hidden. Linear is the default; Small signals
  selects a shared soft-log view. No curve is normalized independently.
  The cursor uses an exact overlap evaluation rather than interpolating the
  drawn curve. Unit changes persist and do not move the aperture or shot clock.
  Mass and forward-energy curves have a constant central region through |R − a|, a partial
  overlap falloff through R + a, then zero. This is the aperture response to a
  uniform cloud, not a radially fading cloud density. The current falloff is
  shaded. Each curve includes exact tangencies and 64 subdivisions within its
  own transition interval, resolving small footprints beside much larger ones.
  For mass and forward-energy scans, tests bound midpoint interpolation error
  below 0.1% of each curve's own peak
  across narrow and wide aperture cases, alongside monotonicity, absolute units
  and mass/forward-energy consistency. Readouts retain small values even when
  a much stronger reference dominates the shared vertical scale.
  Small signals uses log1p(1000 × value/high) / log1p(1000) for vertical
  position. The common maximum stays unchanged, zero maps exactly to zero,
  and tick values use the inverse transform in physical J or mg. Both curves
  retain their absolute readings; the view is explicitly labeled nonlinear.
  A value 1000 times smaller than the axis maximum occupies about 10% of the
  plot height. This view does not imply proportional heights or equal ratios
  between equally spaced ticks. Quarter/midpoint display-error checks add
  samples recursively near curved edges, with a 0.312 plot-unit subdivision
  threshold on the 208-unit plot and a depth cap of ten. Tests bound independently
  sampled interpolation error below 0.4 plot units, including grazing lenses,
  tiny footprints and zero spread. Exact cursor readings never use interpolation.
  A comparison strip reports Current − reference and the current/reference
  ratio at the same aperture position. A zero reference gives no ratio;
  two zero readings are stated explicitly. Hiding the reference hides the
  strip but preserves both axes. Scale, metric and aperture inspection preserve
  playback, the saved setup and the clock; the scale preference persists.
  The same instrument can compare two positions within the current design.
  Mark position A retains a physical offset in meters; B is the live aperture.
  A violet dashed aperture and scan cursor keep A visible, while a thin bracket
  shows the A–B interval without changing the meaning of overlap shading.
  Native A/B badges remain separate at coincident positions. Exact A and B
  readings follow the selected mass or energy metric, with signed B − A and
  displacement in millimeters. A uses the same analytic aperture evaluation as B;
  it is never read from a curve or confused with the saved design reference.
  Mark, replace, return and clear preserve playback, elapsed time and the saved
  design. Metric, scale, reference visibility and view switches preserve A.
  Physics or aperture-size edits clear A permanently with a status message.
  Saving a different reference preserves A if it still fits the scan range;
  otherwise A clears explicitly rather than silently moving. Restoring a prior
  setup does not resurrect a cleared mark. Stored marks include a version,
  radius and full current setup; invalid, nonfinite and stale marks are rejected.
  Coincident positions and zero sideways energy return exact zero differences.
  The scan now identifies the current design maximum and offers an inspect
  action that moves the aperture to it without rounding to the drag increment.
  A triangle marks the selected maximum; a capped line marks flat maximum
  intervals. Mass and forward energy use exact containment plateaus from
  zero through |R − a|. Sideways energy has the same whole-cloud plateau when
  a ≥ R; equal radii yield a central maximum. Zero sideways energy is handled
  separately with no peak marker and a disabled inspect action.
  For a smaller aperture, the sideways peak is refined around the largest
  sampled value using bracketed golden-section search (at most 48 iterations,
  ending at a width of max(10⁻¹⁵ m, (R+a)×10⁻¹¹)). The original best sample
  and every evaluated candidate remain eligible, so refinement cannot lower
  the peak. Readings come directly from the aperture integral. The selected
  peak enters the plotted sample set before shared-axis sizing and soft-log
  refinement. A near-flat peak is reported as near a position, not as an
  experimentally exact location. Dense offset searches, dimensional scaling,
  equal-radius cases, plateaus and zero states validate the result. Inspecting
  a maximum preserves A, the saved reference and playback; metric and scale
  changes do not introduce a second clock or an independent axis.
  A half-maximum span now brackets the radial offsets whose reading reaches
  at least 50% of the current maximum. The dashed threshold line, capped ends
  and baseline guides use the same physical coordinates as the aperture;
  inspect actions move exactly to each boundary. If the center already meets
  the threshold, the interval begins at zero and the action says Inspect center.
  Zero energy has no half-maximum interval or boundary actions. This is a span
  of nonnegative radial offsets, not a full-width diameter measurement.
  Crossing positions use direct aperture evaluations and bracketed bisection
  (at most 48 iterations, tolerance max(10⁻¹⁵ m, (R+a)×10⁻¹²)). Their samples
  enter the plotted curve before display refinement. Half means half the
  physical J or mg value; soft-log view changes neither the interval nor the
  threshold. The result is specific to the current design, independent of
  reference visibility and scale. Boundary inspection preserves A, the saved
  reference and active playback. Tests check the analytic contained-aperture
  inner crossing, physical residuals, extreme radius ratios and zero states.
  An optional aperture-size comparison opens below the shared controls. It
  holds the current physical cloud fixed and compares a smaller, current and
  larger aperture. Alternative radii approximate half and double the current
  radius, rounded to the existing 0.5 mm increment and bounded to 0.5–30 mm;
  repeated limit values are removed and the current radius stays exact.
  Curves use one linear physical axis and extend to the same outer offset
  with a zero endpoint. Distinct line styles, labeled cards and peak markers
  identify the apertures without relying on color alone. The cards report
  collecting-area ratio, total peak reading and each curve's own half-maximum
  radial span. The study contains only the current design; the saved reference
  and main plot's display scale cannot change it. There is no claim that
  half-maximum span grows monotonically with aperture size.
  The comparison offers Total collected and Per cm² views. Per-area values
  divide by each aperture's full area πa²×10⁴ cm², including uncovered regions.
  Units are J/cm² or mg/cm²; sideways energy per area describes the modeled
  lateral kinetic energy, not normal loading or pressure. Curves, live readings,
  maxima and half-maximum thresholds receive the same positive scale factor
  for each radius, preserving positions, widths, coverage and probe bounds.
  The area view derives a shared rounded linear axis from the scaled peaks
  with 2% headroom; the total view retains its existing axis. Zero scans use
  finite unit-height axes, zero readings and unavailable half-maximum spans.
  Physical aperture area remains visible on each card. Switching basis is a
  view preference and preserves both probes, A, playback and the saved design.
  Fully contained forward-energy and mass averages are radius-independent in
  this uniform cloud; sideways energy per area retains the radial speed weighting.
  The comparison now has an independent probe over its complete radial range,
  including the outer tail of a larger candidate aperture. A neutral cursor and
  filled square markers show exact readings at that offset; hollow circles
  continue to identify maxima. Each card reports the live total and aperture
  coverage, so a zero signal outside the cloud differs from zero sideways
  energy in a covered aperture. Values come directly from the aperture integral,
  not interpolation of a plotted line. Axis, domain, maxima and widths remain
  unchanged while the cursor moves.
  Captured mouse/touch gestures and a native offset slider share the probe:
  arrows move 0.5 mm, Page keys 5 mm, Home centers, End reaches exact outer
  tangency. Pointer dragging snaps intermediate positions to 0.5 mm; endpoints
  and Match main position preserve full precision. The latter copies the main
  aperture's offset without moving it or changing A, time, playback or baseline.
  A main position beyond the comparison range disables matching with a visible
  explanation. The stored comparison offset survives view/metric/radius changes;
  the rendered value clamps to the current comparison range. Size buttons keep
  their existing main-aperture behavior and do not copy this independent probe.
  A spatial footprint map links to the same independent comparison probe. All
  candidate apertures share a center, drawn on equal horizontal and vertical
  physical scales. A fixed frame includes the full largest aperture even at the
  outer limit (R + 2a_max from the cloud center); moving the probe never zooms
  the cloud or changes relative circle sizes. Three distinct outlines show the
  openings, with a single cloud-clipped fill for the current aperture's overlap.
  That fill represents geometry, not an additive energy signal from three sensors.
  Forward energy and mass use uniform field shading. Sideways-energy shading
  qualitatively illustrates the radial speed gradient; numeric readings still
  come from the exact aperture model. Zero sideways energy has a separate
  neutral field and explanatory text. Shading is not a calibrated color scale.
  Dragging the map uses its aspect-preserving SVG frame, including letterboxing,
  and the same pointer capture, keyboard steps and endpoint clamps as the plot.
  Center, Cloud rim and Outside all buttons inspect exact physical landmarks.
  The map, plot, native range and cards stay synchronized without altering the
  main detector position, A, simulation time, playback or saved reference.
  The footprint map also offers First contact and Follow experiment modes.
  First contact remains the default, independent of experiment time. Follow
  experiment uses the existing shared clock and the same inspected physical
  state as the main scene. Before bumper impact it shows the incoming particle;
  afterward the transverse cloud projection grows as r0 + v_edge × flight time.
  A dashed final-envelope circle and the apertures stay at the original physical
  scale. This projection does not represent cloud material at the wall. The
  filled overlap and numeric wall coverage appear only at first contact; before
  then the map explicitly reports Pending arrival. Zero spread still has finite
  flight time and pending coverage despite an unchanged cloud radius.
  The comparison curves/cards remain first-contact predictions in both modes;
  visible notes, chart labeling and the map's accessible value text say so.
  A linked local time range and start/bumper/mid-flight/wall buttons use the
  existing seek path, pausing playback and synchronizing the main time control.
  Arrow keys seek 0.05 µs, Page keys 0.5 µs and Home/End select exact endpoints.
  Mode, probe and basis changes preserve active playback. There is one playback
  component and no second animation loop; a link returns to its main controls.
  A synchronized side view places the particle/cloud along the axial flight path.
  Its fixed isotropic frame includes the incoming sphere, final radial envelope
  and full range of the current aperture slice. Dashed lines join the initial
  cloud radius at the bumper to its radius at the wall. The cloud is represented
  as a plane, and drawing strokes do not assert physical cloud/plate thickness.
  The mint segment at the wall is a central slice through the selected aperture;
  its length is not a captured mass/energy fraction or intersection area.
  First contact mode presents a read-only image. Follow experiment presents a
  time slider: captured mouse/touch dragging along the side view inverts the
  physical axial trajectory. The incoming branch uses the incoming speed;
  the post-bumper branch uses the entrained cloud's axial speed, continuous at
  bumper contact. Seeking is clamped to exact start/contact and pauses the
  existing clock; keyboard behavior matches the adjacent time range. SVG
  letterboxing is included in pointer conversion. Time inspection leaves
  comparison offsets, first-contact readings, position A and saved design intact.
  The flight inspector offers Position, Speed history, Impact budget and Material
  motion panels, displaying
  only the selected view. Speed history plots forward speed and radial edge
  speed against elapsed time on a common linear ordinate. Incoming speed is
  the configured projectile speed; at the bumper, forward speed becomes p/M
  and radial edge speed becomes sqrt(4K_radial/M). The latter is edge speed,
  not mean or RMS speed. Separate horizontal path segments and open-before,
  filled-after event markers represent the instantaneous idealized transition
  without inventing a finite collision ramp. At exact impact the inspected
  readings use the post-impact branch. At first wall contact the same speeds
  remain; wall stopping/penetration are outside this model. Zero spread retains
  a flat zero radial-speed trace. All speed readouts use km/s while helper
  values stay in SI. Native-size markers and independent tick labels stay
  legible when the chart stretches at different viewport widths.
  Follow experiment makes the speed plot another shared-time slider, with
  captured horizontal mouse/touch gestures and the existing keyboard steps.
  First contact mode leaves it read-only. Release/cancel cleanup remains
  active across mode switches. Switching flight-inspector panels preserves
  playback, both probes, A, saved design and first-contact predictions; it does
  not add an animation loop. The selected panel is retained as a view preference.
  Impact budget pairs the incoming particle with the post-bumper cloud on
  identical incoming-energy scales. The stationary bumper plug contributes
  mass but no initial momentum or kinetic energy. Displayed forward momenta
  satisfy m v = (m + plug) u; forward, radial and unresolved internal energies
  sum to the incoming kinetic energy. Segments use exact fractions without
  minimum visible widths, including literal zero sideways energy at zero spread.
  Selecting a component highlights its segment and explains its meaning using
  native buttons. The radial explanation distinguishes the spread setting's
  available-collision-energy denominator from the bars' incoming-energy basis.
  Internal energy is unresolved; heating, deformation and fragmentation are not
  separately modeled. These whole-cloud quantities are independent of aperture
  size, probe offset and total/per-area display. In Follow experiment, the
  active card changes at exact bumper contact; beforehand the after card is
  labeled Predicted. First contact always shows the after state. Component
  focus is retained as a view preference without changing the shared clock,
  playback, probes, A or saved design. Each inspector has a distinct root key
  so switching views cannot reuse a node holding another panel's pointer capture.
  Material motion follows a selected fraction f of the expanding disk radius.
  Its sample radius is f R(t), outward velocity is f w, forward velocity is u,
  resultant speed is sqrt(u² + (f w)²), and angle from forward is atan2(f w, u).
  This is a local material speed, not a disk-average or RMS speed. A transverse
  field uses a fixed spatial frame based on final radius, with symmetric sample
  locations and opposing outward arrows. At the center, the locations merge
  into one marker. Field-arrow lengths share a rim-speed scale within a design;
  they are not spatial displacements. The separate velocity triangle uses one
  speed scale for both axes, fixed across sample choices and flight phases.
  Zero radial motion omits outward arrows; forward and resultant arrows coincide.
  Before impact, material sampling is pending, no cloud markers are drawn, and
  the velocity diagram shows the incoming particle. Native range and preset
  buttons choose center, mid-radius or rim without changing physical setup,
  time, playback, probes or saved comparisons. Arrow keys adjust 1 percentage
  point, Page keys 10, and Home/End select center/rim. Only the selected inspector
  is mounted; its position evolves with the existing shared clock. Markers sample
  the continuous idealized cloud and do not predict fragments or fragment counts.
  After impact, the transverse material field also acts as a vertical radius
  selector. Captured pointer and touch gestures sample the absolute distance
  above or below the center, rounded to one percentage point. The mapping
  accounts for SVG letterboxing and uses the current cloud radius on every move,
  so sampling while playback continues does not use an outdated radius. Keyboard
  steps match the range. Before impact it remains a noninteractive image; the
  separate range and presets retain the pending selection. Setup/mode guards,
  primary-pointer ownership and always-mounted release/cancel handlers prevent
  stale gestures from changing a different experiment. Sampling never seeks or
  pauses the shared clock.
  The second diagram can switch between Velocity and Path to wall. The path
  frame uses one physical length scale on both axes; selected tracks extend from
  the initial offset f r₀ at the bumper to f R_wall at first contact. Solid mint
  progress and current points appear only after impact; hollow landing markers
  remain predictions. The path slope is f w/u, and the remaining diagonal
  distance equals the sample speed times remaining flight time. Endpoints clamp
  to exact first contact with zero remaining time/distance. Center selection
  deduplicates coincident tracks; zero spread leaves parallel straight paths.
  No wall penetration, stopping or rebound is extrapolated. Diagram choice is a
  retained view preference and preserves clock, playback, probes and references.
  In Follow experiment, horizontal captured gestures on the path seek the shared
  clock by physical forward position: the bumper maps to impact and the wall to
  first contact. Pointer positions outside that interval clamp to those endpoints;
  the path does not depict the incoming approach. Keyboard controls retain the
  full clock domain: arrows step 0.05 microseconds, Page keys 0.5, Home returns to
  launch and End to wall contact. Seeking pauses playback while retaining the
  radial material sample, detector probes and saved comparisons. First contact
  remains an image. Pointer ownership, letterbox-aware geometry, setup/mode guards
  and keyed diagram roots isolate gestures across view or experiment changes.
  A moving vertical cursor aligns with the sample position after impact. The
  native time caption follows the inspected clock. A 1/2/5 physical scale bar
  uses the same metric scale as both axes and remains fixed throughout a flight;
  its drawn length is between 32 and 80 SVG units for readable setup comparisons.
  Material motion can mark a post-impact instant for a displacement comparison.
  The mark stores its physical setup and time, not a cached material radius or
  energy. A strict version, finite-time and setup check rejects malformed or
  incompatible marks. Amber diamonds, a dashed reference cloud ring and a path
  cursor show the marked geometry. The current radial coordinate is used for both
  instants, so changing the selected fraction still compares the same material.
  Signed time, forward displacement and outward displacement are current minus
  marked. Scrubbing backward gives negative deltas; coincidence gives exact zeros.
  In free flight these obey delta-x = u delta-t and delta-r = f w delta-t, with
  exact wall endpoints. Before impact the mark remains available, but ghosts are
  hidden and displacement readings are pending. Mark and Clear preserve clock,
  playback, detector probes and saved designs. Return to mark enters Follow
  experiment and seeks the shared clock, pausing playback. Clear returns focus to
  the radial coordinate range; no second playback clock or wall response is added.
  A displacement triangle connects the marked and current upper sample (or center
  sample at zero radius). Blue forward and purple outward legs use the same metric
  scale as the path; a dashed amber resultant connects the two physical positions.
  Arrows reverse when scrubbing earlier than the mark, zero-length legs are omitted,
  and coincidence shows no triangle. These legs are vector components, not extra
  travel. A fourth reading reports unsigned separation, hypot(delta-x, delta-r),
  while the component and time differences retain their signs. Before impact all
  four readings are pending. The guide follows the existing mark and clock.
  An optional equal-time guide samples that same material at 0%, 25%, 50%, 75%
  and 100% of bumper-to-wall flight. Five positions form four equal time intervals;
  the first and last use exact impact and wall-contact times. These dots are
  temporal samples, not fragments. Their uniform spatial spacing illustrates
  constant free-flight velocity. Fixed-size hollow dots indicate upcoming samples;
  filled dots have been reached in the currently displayed frame. Current points
  and marked-instant diamonds stay on top. Before impact all guide dots are
  predictions; the First contact view shows all reached. Five keyboard-accessible
  buttons seek exact sample times, enter Follow experiment and pause playback.
  Each accessible label gives flight progress, elapsed time and reached/upcoming
  status, distinct from the separate radial material coordinate. Toggling the
  guide or switching diagrams preserves time, playback, probes and the mark.
  The guide is off by default and is only drawn in the path diagram; its buttons
  wrap to three columns on a phone. No extra clock or automatic motion is added.
  The radial range and presets sit inside the Across the cloud card, directly
  beside the sample they control. This also keeps the range earlier in the mobile
  reading order and balances the expanded path guide on a wide screen.
  Closed comparisons skip all additional scan calculations. Applying a size
  clears position A, clamps the offset to the new detector range (including
  the saved footprint), and preserves the physical setup, saved design and
  active playback. Focus returns to the persistent comparison toggle so an
  option disappearing at a radius limit cannot strand keyboard focus.
  The map and scan sit beside each other on desktop, with shared controls below;
  they stack on narrow screens, retaining native-size chart labels and markers.
  Sideways-energy mode also reveals a sampled velocity field on the map.
  Sixteen arrows use the existing material velocities at first wall contact;
  their positions follow the common map scale, and arrow lengths use a fixed
  speed scale across designs. Brighter arrows begin inside the aperture. They
  illustrate a continuous field rather than fragments or a particle count.
  The Inside current rim control places an aperture wholly within the cloud
  whenever it fits, making equal-mass center/rim measurements easy to compare.
  An aperture can have equal mass and forward energy at both positions while
  sampling much greater sideways energy near the rim.
  With cloud radius R and radial edge speed w, the existing homologous model
  gives local sideways speed wρ/R. Its aperture sideways energy is
  M w²/(2πR⁴) times the integral of ρ² over the overlap. The mean squared
  radius is R²/2 for the entire cloud and d² + a²/2 for an aperture wholly
  inside it. Partial lenses use 16-point Gauss-Legendre quadrature on each
  side of the radical axis after a sin² coordinate transform, with R scaled
  to one. Only the mean squared radius comes from quadrature; the original
  analytic overlap still supplies mass and forward energy. Cartesian strip
  integration checks mean-squared-radius error below 5×10⁻⁷ R², including
  extreme radius ratios and grazing lenses. RMS sideways speed is
  w√(mean squared radius)/R; it is unavailable when no material is sampled.
  The entire cloud recovers exactly M w²/4 and centered subdisks retain the
  fourth-power radial-energy law. Sideways scans sample the central region
  as well as the edge transition, fit off-center maxima on the common axis,
  and reserve 2% headroom before rounding the axis maximum. Zero spread
  gives a flat zero-energy curve with an explicit explanation and finite axis.
  Neither sideways energy nor RMS speed is a wall-damage or pressure model.
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
- [OpenStax: kinetic energy of a particle and a system](https://openstax.org/books/university-physics-volume-1/pages/7-2-kinetic-energy)
- [NASA Glenn: drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)
- [NASA Glenn: ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/)
- [NASA Glenn: torque and angular acceleration](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/torque-moment/)
- [MIT OpenCourseWare: 3D rigid-body kinematics, angular-velocity addition and instantaneous point velocity](https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/resources/mit16_07f09_lec25/)
- [OpenStax: conservation of angular momentum and changing inertia](https://openstax.org/books/university-physics-volume-1/pages/11-3-conservation-of-angular-momentum)

## Local review

`node dev-tools/space_station_enhancement_qa.cjs --serve` provides a local
working-tree preview. `--capture` exercises the actual browser implementation
and saves desktop/mobile screenshots under `reports/space-station-enhancement-qa`.

With that preview running at port 4179,
`node dev-tools/space_station_map_framing_qa.cjs --widths=1440,390` checks fitted
hardware projection, native framing and clock controls, preserved physics and
forecasts, responsive fit versus manual zoom, exact shared-time progression,
rendered focus brackets, accessibility and teardown. The independent perspective
and playback validation cases are in `tests/space_station_map_framing.test.js`.
`node dev-tools/space_station_map_camera_qa.cjs --widths=1440,390` checks camera
orbit, target-relative zoom, native touch pinch/cancellation, focused wheel input,
F/Home, independent lighting, direction guides, responsive controls and teardown.
`node dev-tools/space_station_map_camera_motion_qa.cjs` checks rendered camera
transitions with normal motion, module framing, native interruption and stable physics.
`node dev-tools/space_station_map_arrays_qa.cjs` checks manual pointing, presets,
held angles, projected silhouette versus solar input, rendered front/back faces,
keyboard/touch interaction and preservation through camera and module changes.
`node dev-tools/space_station_map_drive_qa.cjs` checks optional motor controls,
command versus actual pose, shared-clock stepping, tracking lag, seek/hold
semantics, the rendered target outline and cleanup.
`node dev-tools/space_station_map_smooth_drive_qa.cjs` checks smooth-mode controls,
velocity and braking-angle gauges, retargeting with stored velocity, speed-limit
braking, pause/seek/hold semantics, rendered actual and commanded geometry, and
cleanup on desktop and phone layouts. The pure
`tests/space_station_map_smooth_drive.test.js` covers acceleration bounds, ramp-up,
reversal, speed-limit changes, angular wrapping, hard-stop contact, static and
moving-target convergence, input sanitization and partitioned-time agreement.
`tests/space_station_map_braking.test.js` covers exact maximum deceleration,
fractional stopping steps, signed travel, feather contact and zero-time boundary
behavior, input limits, partition invariance, latched rest and resumed targets,
simultaneous 3D corner trajectories, full stopping predictions beyond 3,600 seconds,
and braking-mode propagation through cached and fractional forecast samples.
`node dev-tools/space_station_map_braking_qa.cjs` checks native brake/resume
controls, preserved commands and clock state, target-edit and setting lifecycle,
real WebGL stopping geometry, visual-only overlay changes, forecast interaction,
hard-stop reporting, and desktop/phone layout. Its browser results are recorded
separately from the pure numerical checks.
`npx vitest run tests/space_station_map_motion_probe.test.js --maxWorkers=1`
checks independent central differences of the rotated material point,
angular-velocity cross products, radial orthogonality, degree/radian conversion,
both wings and span endpoints, feather-speed independence from span, exact
cancellation with nonzero joint contributions, signed-rate reversal, input
normalization, immutable results, shared arrow scaling and the 2.4-unit cap.
With the local preview running,
`node dev-tools/space_station_map_motion_probe_qa.cjs --widths=1440,390` checks
native inspector controls, independently differentiated surface velocity,
actual WebGL point and arrow geometry, the common display cap, motion framing
and resize, playback-rate independence and paused stored velocities. It also
checks the actual probe during future-pose inspection, exact +1 s braking,
the stationary marker, motion-mode availability changes, desktop/phone layout,
structural accessibility and scene disposal. Its browser results are recorded
separately from the unit checks.
`tests/space_station_map_surface_drag.test.js` checks independent forward-matrix
recovery of span/chord through the inverse ray intersection, both panel halves
and ray directions, normalized edge-on rejection, behind-camera and invalid
inputs, locked-half edge clamps, positive ray-scale invariance, and material
point velocity across the full panel width.
`node dev-tools/space_station_map_surface_drag_qa.cjs --widths=1440,390` exercises
trusted pointer and keyboard input on P, off-center capture, actual rendered
point alignment, span/chord controls, edge-on behavior, drag interruption,
preserved physics and forecast state, continued playback, responsive controls,
accessibility and disposal. Browser run outcomes are recorded separately from
the unit results.
`tests/space_station_map_motion_field.test.js` covers surface-field kinematics,
shared component scaling, corner maxima, locked-scale saturation and
instantaneous-axis relationships. With the preview running,
`node dev-tools/space_station_map_motion_field_qa.cjs --widths=1440,390` is the
browser check for native field controls, rendered colors and axis geometry,
probe linkage, preserved simulation and forecast state, mode availability,
responsive layout and cleanup. Run outcomes are recorded separately from this
description of the checks.
`tests/space_station_map_joint_handles.test.js` covers ring bases, ray-plane
projection, camera and ray-scale invariance, singular views, wrapped dragging,
feather limit reversal and preserved velocity during retargeting.
`node dev-tools/space_station_map_joint_handles_qa.cjs` checks native mouse,
touch and keyboard handles, actual WebGL ring geometry, command versus actual
motion, forecast invalidation, interrupted capture, layout and accessibility.
`node dev-tools/space_station_map_forecast_qa.cjs` checks continuous-time inspection,
rendered future geometry, keyboard/mouse/touch scrubbing, live-state preservation,
exact selected-state advance, invalidation, accessibility and cleanup on desktop and phone.
`tests/space_station_map_forecast.test.js` covers velocity-preserving propagation,
future illumination and eclipse, corner transforms and angular wrapping, input
sanitization and snapshot independence.
`tests/space_station_map_continuous_forecast.test.js` covers fractional replay,
cached-knot continuity, speed and acceleration bounds, braking, rigid geometry,
grazing eclipses between samples, and order-independent, mutation-free seeking.
`tests/space_station_map_forecast_inspection.test.js` covers event-side probes,
sub-second eclipses, future panel-center transforms, full incidence angles,
stable aligned/opposite direction arcs and immutable guide geometry.
`node dev-tools/space_station_map_forecast_inspection_qa.cjs` checks the rendered
future arrows, ring and arc, native crossing controls, guide visibility,
live-state preservation, cleanup and desktop/phone layouts.
`tests/space_station_map_forecast_playback.test.js` covers the four playback
rates, sanitized elapsed time, exact crossing stops and resume, frame overshoot,
closely spaced events, fractional horizons, immutable inputs and motor-state
sampling at stopped events. `node dev-tools/space_station_map_forecast_playback_qa.cjs`
checks both native speed selectors, automatic pauses through a 0.8-second
grazing eclipse, exact position/velocity advancement, preference persistence,
hidden-page pause, actual rendered geometry, accessibility and phone layout.
It advances controlled timestamps through native animation frames so transport
timing is repeatable while real WebGL renders each selected state.
`tests/space_station_map_sun_timeline.test.js` covers analytical shadow intervals,
short grazing eclipses, event boundaries, high-beta sunlight and motor-propagated
incidence at crossings. `node dev-tools/space_station_map_sun_preview_qa.cjs`
checks shared solar-chart scrubbing, continuous preview playback and stopping,
fractional apply with preserved velocities, rendered preview fill, preserved live
state, accessibility and desktop/phone layouts.
`node dev-tools/space_station_map_lighting_qa.cjs --widths=1440,390` checks the
shared eclipse/array model, controls and real planet/station render separation.
`node dev-tools/space_station_map_bloom_qa.cjs` checks both preloaded and lazily
loaded postprocessing, preserved color/depth between scene passes, final pixels
and cleanup. It requires the six production Three r128 addons from the CDN and
fails explicitly if they cannot be fetched. These standalone scripts accept
`--base=http://127.0.0.1:4179` and `--out=reports/my-run` overrides and save their
results and screenshots separately. Pure camera/lighting/array/drive checks can be run with
`npx vitest run tests/space_station_map_camera.test.js tests/space_station_map_lighting.test.js tests/space_station_map_arrays.test.js tests/space_station_map_drive.test.js tests/space_station_map_smooth_drive.test.js tests/space_station_map_braking.test.js tests/space_station_map_forecast.test.js tests/space_station_map_sun_timeline.test.js tests/space_station_map_continuous_forecast.test.js --maxWorkers=1`.

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
Use `--debris-sideways-only --widths=1440,820,390` for the focused sideways-energy
checks: equal-mass center/rim sampling, RMS speed, the linked velocity field,
mouse/touch chart dragging, keyboard limits, zero spread and structural axe.
These checks also cover Small signals, unchanged physical readings, signed
comparisons, zero-reference ratios and native tick-label widths. Position A/B
checks exercise exact differences, coincident labels, pointer/touch movement,
return/clear focus, marker invalidation, and preservation of the clock and saved
design. Maximum checks inspect a refined peak at full precision, verify the
flat-top/zero states and keep the A marker and experiment time unchanged.
Half-maximum checks exercise both boundaries, central intervals, zero states,
physical threshold placement on each scale and exact inspection offsets. Aperture
comparison checks exercise keyboard opening/applying, common axes, radius limits,
metric and zero states, saved-design independence and structural axe. The focused
preview opens at
`?tab=operations&mode=debris&scan=expansion&scale=softlog#iss-debris-detector-title`.
Add `&aperture=compare#iss-debris-aperture-study-title` to open the size study.
Use `--aperture-study-only --widths=1440,820,390` for native marker sizing,
keyboard focus at the aperture limits, independent mouse/touch probing, exact
main-position matching, total/per-area normalization, live readings, zero coverage
states, spatial-map geometry, exact map landmarks and linked pointer/keyboard
controls, shared-clock flight inspection, inverse axial seeking and pending-arrival
semantics, speed-history steps and shared-time gestures, conserved impact budgets,
component focus, exact zero-energy segments, material-following sample geometry,
velocity triangles, sample keyboard and captured pointer controls, projected
material paths and exact wall endpoints, horizontal path time scrubbing, physical
scale-bar geometry and pointer lifecycle, marked-instant ghost geometry, signed
displacements and return/clear behavior, signed displacement triangles and unsigned
separation, equal-time guide spacing and exact-step
seeking, plus comparison screenshots.
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
