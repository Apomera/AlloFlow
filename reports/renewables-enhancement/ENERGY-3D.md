# Individual 3D energy workbenches

Added September 12, 2026. Open **Individual 3D energy simulations** from Renewables Lab's launch panel or core library. Every core technology lesson has a matching “Explore … in 3D” link. The national transition sandbox is still available from the studio.

## What learners can investigate

| Workbench | Mechanism and controls | Calculation |
| --- | --- | --- |
| Solar PV | Direct sunlight, panel area, efficiency, and incidence angle; tilting PV array and inverter | Projected irradiance × area × module efficiency × 96% inverter efficiency |
| Wind | Wind stream, rotor radius, power coefficient, generator rating | Cubic wind power, 3 m/s cut-in, generator clipping, 25 m/s protective shutdown |
| Hydropower | Reservoir height, flowing penstock, visible turbine runner, powerhouse | Density × gravity × head × flow × combined efficiency |
| Geothermal | Production/reinjection well cutaway, separate heat exchanger and binary power block | Fluid heat extraction with electricity bounded by a selected fraction of Carnot efficiency |
| Concentrating solar | Heliostat field, receiver, thermal pipe, power block | Direct normal irradiance × mirror area × optical/receiver efficiency × cycle efficiency |
| Wave energy | Moving surface, heaving buoy, power take-off | Deep-water mean wave flux from significant height squared and energy period |
| Tidal stream | Submerged rotor, reversible current, generator | Seawater kinetic power from current magnitude cubed; rating limit and zero power at slack water |
| Biomass | Fuel hopper, boiler, steam turbine | As-fired fuel energy per hour, boiler efficiency, then cycle efficiency |
| Battery storage | Charging supply, cells with energy fill, inverter and load | Exact two-hour charge/discharge cycle with independent power and energy limits |

Each workbench includes:

- A separate 3D scene with orbit, zoom, top/reset camera views, direct component picking, and equivalent numbered component buttons.
- An initially paused animation, explicit play/pause, step, and timeline scrubbing. Motion is illustrative and accelerated; battery accounting uses the labeled minutes.
- Live power and energy accounting, formulas, specific model assumptions, investigation prompts, and concept references.
- An equivalent energy-flow view when WebGL is unavailable or undesired.
- A 25-point response curve that varies one resource input, plus a keyboard-scrollable data table. The battery chart shows stored energy across its full cycle.
- Independent settings, observations, timelines, and up to three saved readings per technology. Saved readings are recalculated rather than trusting old result values.
- JSON export of the current model, settings, explanation, note, and all nine technology notebooks.
- Library, lesson, and national-sandbox navigation. State persists through reload and the existing project-restore event.

## Scientific boundaries

These are mechanism model version 1, separate from national dispatch model version 2. They do not alter the national portfolio. The geometry and default parameters are teaching assumptions, not manufacturer designs, calibrated facilities, or engineering forecasts.

Non-storage benches are steady-condition calculations. Animated rotor motion is not calculated RPM, and moving particles are not computed fluid velocities. Resource power not converted to electricity includes both unextracted energy and conversion losses. Electrical power in kW is distinguished from energy in kWh.

The battery starts at the chosen state of charge, accepts power for minutes 0–60, and delivers power during minutes 60–120. Charging and discharging each use the square root of the selected round-trip efficiency. Capacity and power bounds are enforced analytically, including partial hours. Rewinding or changing conditions recomputes the same deterministic cycle from its initial state. At an empty initial state, 50 kWh of charging with 88% round-trip efficiency returns 44 kWh and loses 6 kWh after complete discharge.

Geothermal output is gross: pumping and other parasitic loads are omitted. Its fixed 25°C sink and constant water heat capacity are explicit. CSP has no thermal-storage or warm-up model. Biomass uses an as-fired heating value and does not double-count moisture; its explanation explicitly avoids assuming carbon neutrality. Wave output is mean power for an irregular deep-water sea, while the animated sinusoid is only an illustration.

Primary references:

- [DOE: How solar works](https://www.energy.gov/cmei/systems/how-does-solar-work)
- [DOE: Understanding wind energy, including the power relation and operating limits](https://www.energy.gov/sites/prod/files/2015/05/f22/Enabling%20Wind%20Power%20Nationwide_18MAY2015_FINAL.pdf)
- [DOE: Types of hydropower plants](https://www.energy.gov/cmei/water/types-hydropower-plants)
- [EIA: Geothermal power plants](https://www.eia.gov/energyexplained/geothermal/geothermal-power-plants.php)
- [DOE: Concentrating solar-thermal power](https://www.energy.gov/cmei/systems/concentrating-solar-thermal-power-basics)
- [DOE: Marine energy basics](https://www.energy.gov/cmei/water/marine-energy-basics)
- [Sandia: Wave resource characterization, equations 6–7](https://www.sandia.gov/app/uploads/sites/273/Wave-Resource-Characterization-MP-9-10-10_jre_Revision_MP.pdf)
- [DOE: Biopower](https://www.energy.gov/cmei/fuels/biopower-energy-heat-and-electricity)
- [EIA: Energy storage for electricity generation](https://www.eia.gov/energyexplained/electricity/energy-storage-for-electricity-generation.php)

These sources support the principles. The selected efficiencies, operating thresholds, geometry, and default conditions remain explicit teaching assumptions.

## Verification

**83 tests pass across six Renewables files**, including 32 new mechanism tests. Coverage includes formula units/scaling, solar incidence, zero-resource behavior, wind cut-in/cut-out and clipping, reversible tides, geothermal limits, wave power scaling, biomass conversion, input sanitization, battery conservation, all nine rendered interfaces, lesson/library entry points, and source/deployment parity.

Chromium tests render and operate all nine WebGL scenes. They check input changes, geometry changes, direct raycast picking, camera controls, one active canvas, component explanations, exact battery checkpoints, playback and end behavior, independent settings, notebook updates/restores, export, reload persistence, lesson navigation, energy-flow switching, and context-loss recovery.

The new screens pass **12 axe WCAG A/AA audits** covering every technology plus expanded light, dark, and mobile states. No page errors, console errors, or document overflow at 390 px were detected. The existing national sandbox browser suite also passes, including its nine accessibility audits. Scene captures and the phone workbench were visually reviewed.

The browser harness mounts the real tool with local React and pinned Three.js. It is an isolated development host, not a deployed full-application test.

Run:

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_energy3d.test.js tests/renewables_transition.test.js tests/renewables_lab_science.test.js tests/renewables_form_controls_a11y.test.js tests/renewables_table_a11y.test.js tests/renewables_diagram_tabs_a11y.test.js --maxWorkers=1
node reports/renewables-enhancement/energy3d-browser-qa.cjs
node reports/renewables-enhancement/browser-qa.cjs
node reports/renewables-enhancement/energy3d-browser-qa.cjs --preview
~~~

The mechanism preview uses port **8790**.

## Review captures

- [Full workbench](energy3d-desktop.png)
- [Phone workbench](energy3d-mobile.png)
- [PV](mechanism-solarPv.png), [wind](mechanism-wind.png), [hydro](mechanism-hydro.png)
- [Geothermal](mechanism-geothermal.png), [CSP](mechanism-solarThermal.png)
- [Wave](mechanism-wave.png), [tidal](mechanism-tidal.png)
- [Biomass](mechanism-biomass.png), [storage](mechanism-storage.png)
- [Browser verification](energy3d-browser-results.json)
- [Exported investigation](mechanisms-investigation.json)


## Changing-condition operating scenarios

The September 12 follow-up adds **18 operating scenarios**, two for each technology. The workbench's original steady mode and two-hour battery cycle remain available.

| Technology | Operating stories |
| --- | --- |
| Solar PV | Passing clouds; sunrise to sunset |
| Wind | Strong wind with protective shutdown; lull and recovery |
| Hydro | Falling river flow; controlled release |
| Geothermal | Fluid-flow interruption; production-flow ramp |
| Concentrating solar | Clouds over the field; increasing haze |
| Wave | Building/easing swell; calm interval |
| Tidal | Reversing current and slack water; weaker reversing currents |
| Biomass | Fuel-feed interruption; lower-energy fuel batch |
| Battery | Charge/wait/meet demand; interrupted charging supply |

**These sequences are synthetic teaching inputs.** They are not meteorological forecasts, astronomical tide calculations, or simulations of reservoir behavior. Generator scenarios linearly interpolate prescribed resource multipliers applied to the resource control's baseline value. Other inputs stay fixed. Effective inputs are bounded by the existing controls; clipping is explicitly indicated.

The timeline selects a real scenario minute. Power is computed for each one-minute interval and energy is summed as power × 1/60 hour. The final endpoint does not contribute an extra interval. Solar-day and tidal stories span 720 minutes, other generator stories span 120 minutes, and the battery schedules span 240 minutes. Animated motion remains schematic and accelerated.

The 3D geometry and energy pathway use the effective resource at the selected minute. Readouts distinguish the resource control's baseline from its current scenario value. Learners can inspect peak and lowest output, the first wind shutdown, and the first unmet battery demand request.

### Scheduled battery accounting

Battery programs prescribe **fixed charging offers and discharge requests**, independent of the battery's selected power or energy capacity. This makes size and power comparisons meaningful.

- Charge / wait / demand: offer 50 kW for minutes 0–60; idle 60–90; request 25 kW for 90–180; request 75 kW for 180–240.
- Interrupted charging: offer 50 kW for 0–30; idle 30–90; offer 25 kW for 90–150; request 50 kW for 150–240.

Acceptance and delivery are limited by requested power, battery power, and available capacity or stored energy. Partial-minute capacity/depletion is represented as an average power for that interval. The plotted stored energy and accumulated quantities are measured at each minute boundary. Power at the final endpoint is zero.

The energy ledger enforces initial stored energy + accepted charging = delivered electricity + conversion losses + remaining storage. Requested discharge energy = delivered electricity + unserved requests. In the default interrupted-charge test, an initially empty battery accepts 50 kWh, delivers 44 kWh, loses 6 kWh, and leaves 31 kWh of the 75 kWh demand request unserved.

### Better investigations

- Name each reading and review its full inputs, operating scenario, meaningful time, and observation.
- Keep a chosen baseline and two recent comparisons. Saving another reading preserves the baseline; any saved comparison can become the baseline.
- Restore the **base inputs**, scenario, and selected minute—not the scenario-adjusted resource as a new baseline.
- Compare current output and accumulated electricity against the baseline, with exact changed inputs and deltas.
- A one-input experiment is identified only when the technology, scenario, and meaningful time match. Changes in multiple inputs or operating context are explicitly flagged. Illustrative animation position does not invalidate steady generation comparisons; storage and scenario minutes do matter.
- A zero-output baseline produces an undefined percentage change rather than an infinite or invented percentage gain.
- Duplicate conditions update the reading's name and observation. Legacy readings without scenario metadata retain their original steady/cycle meaning.
- JSON exports contain the active scenario's complete minute-by-minute results, its baseline inputs and energy totals, named notebooks, and the current comparison. Settings, scenario selection, minute, names, and observations persist.

### Follow-up verification

**102 tests pass across all six Renewables files.** The 19 added tests cover generator energy integration, exclusion of endpoint energy, resource interpolation/clamping, wind shutdown, tidal reversal/cubic scaling, scheduled battery conservation and fixed requests, exact interrupted-charge results, comparison validity, legacy readings, zero baselines, and restored operating UI.

The extended Chromium workflow exercises all 18 programs, scenario timeline stepping and playback endpoints, critical-moment shortcuts, scheduled battery export, baseline replacement and retention, named-reading updates/restores, context warnings, one-input deltas, expanded tables, and reload persistence. The mechanism workflow now includes **24 axe audits** across original and operating screens in light, dark, and phone layouts. Browser evidence is recorded in [energy3d-browser-results.json](energy3d-browser-results.json).

Review the [operating conditions](operating-conditions.png), [battery schedule](operating-battery.png), [comparison panel](operating-comparison.png), [phone operating controls](operating-mobile.png), and [phone comparison](comparison-mobile.png). Example exports: [operating investigation](operating-investigation.json) and [battery schedule](operating-battery.json).


## Controlled experiment bench

The next enhancement adds a parameter-sweep workflow to all nine individual 3D workbenches. Use **Experiment bench** beside the lesson button to jump to it.

1. Choose one input, a lower and upper value, and 5, 9, or 13 requested trials.
2. Optionally set a delivery target and record a prediction.
3. Run the experiment. All other base inputs and the operating scenario remain fixed.
4. Inspect any trial in 3D or restore the original reference conditions.
5. Record a conclusion. Export the trial table as CSV or include all technology experiments in the mechanism investigation JSON.

The sweep snaps values to the existing control steps, includes both range endpoints, and removes duplicate samples. A reversed or collapsed range and invalid delivery target prevent running. A technology keeps its latest completed experiment, separately from its current setup and its three-reading notebook.

### What the comparison measures

- Steady generators compare electrical **power in kW**.
- Operating scenarios compare delivered **energy over the complete sequence in kWh**, regardless of the minute selected for 3D inspection.
- The original battery mode compares electricity delivered over the complete 120-minute cycle.
- Scheduled batteries retain the existing fixed charging offers and discharge requests. Results include unserved energy, conversion losses, and remaining storage.
- The original battery cycle couples requested supply/load power to the selected power control; the interface explains this and points to operating scenarios for fixed-request experiments.
- Holding initial state of charge at a percentage means larger batteries start with more energy. A visible note explains this when varying capacity from a nonempty initial state.

Charts and tables compare each trial with the recorded reference, which can lie outside the sampled range. The highest sampled result includes ties; the model does not assume monotonic improvement. Target results identify the lowest **sampled** input meeting the target, without claiming a continuous threshold or cost optimum. Connected chart lines are only a visual guide. Wind shutdown and effective resource clipping remain explicit.

### Captured conditions and exports

Running an experiment captures normalized base inputs, the selected operating scenario, inspection minute, sweep configuration, and prediction. Changing workbench controls or the experiment setup does not overwrite the completed run. Context messages distinguish the reference, an inspected trial, and unrelated workbench conditions. Inspecting restores all captured conditions and moves keyboard focus to the 3D workbench; it also returns from energy-flow mode to 3D.

Each technology's latest experiment, prediction, conclusion, and selected trial persist through reload. Changing between power and energy measurements clears the setup's delivery target so a kW target cannot silently become a kWh target. The previous completed experiment remains available until replaced.

CSV exports include every sampled setting, complete result, reference delta, target outcome, resource input, remainder, battery accounting, and operating-limit counts. JSON investigation exports additionally include the reference, captured prediction, conclusion, and experiments from all nine technologies. No new physics assumptions, external data feeds, rendering dependencies, or installation forecasts were introduced.

### Experiment verification

The new focused tests cover all nine technologies in steady mode and both operating scenarios, analytic scaling, one-input isolation, battery conservation and saturation, nonmonotonic wind output, signed tidal currents, deduplication, target validity, tiny outputs, serialization, and stored-result rendering.

The dedicated browser workflow checks all nine mechanisms, trial inspection and reference restoration, fixed results through edits, valid and invalid targets/ranges, independent experiments, CSV/JSON exports, reload persistence, and light/dark layouts at 1280, 390, and 320 pixels. It runs 15 accessibility audits.

Run the new focused checks with:

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_experiments.test.js --maxWorkers=1
node reports/renewables-enhancement/experiments-browser-qa.cjs
~~~

Review [desktop experiment](experiment-desktop.png), [dark results](experiment-results-dark.png), [battery saturation](experiment-battery.png), [390-pixel layout](experiment-mobile-390.png), and [320-pixel layout](experiment-mobile-320.png). Data examples: [PV CSV](experiment-solarPv.csv), [complete investigation JSON](experiments-investigation.json). Browser results: [experiments-browser-results.json](experiments-browser-results.json).

Final verification: **125 tests pass across seven Renewables test files.** Both browser workflows pass, including **39 axe WCAG audits** (24 existing workbench/scenario audits and 15 experiment audits), with no page errors, console errors, or document overflow at the tested phone widths. Desktop, phone, and battery experiment captures were visually reviewed. The browser host is an isolated local development preview of the real tool, not a deployed full-application test.


## Storage & demand lab

A dedicated connected-system workspace now pairs any of the eight generator technologies with an electrical load and a battery bank. Open **Storage & demand** from a 3D workbench, or select **Storage & demand lab** in the library. Starter systems explore passing clouds, later-rising demand, and a grid outage.

The first opening from a workbench copies that source's settings and operating scenario, plus battery settings when available. The system keeps its own configuration. Explicit copy buttons refresh source or battery inputs from the workbenches, and the source link returns to its original workbench. System edits preserve mechanism readings and experiments.

### Dispatch and energy accounting

Every one-minute interval follows this order:

1. Generation serves demand directly.
2. Surplus generation charges the battery, bounded by bank power and remaining capacity.
3. If generation is insufficient, the battery serves the deficit, bounded by power and energy above its reserve floor.
4. Available grid backup supplies any remaining deficit. When islanded or inside the outage interval, that deficit remains unserved.
5. Remaining surplus is curtailed. The model does not export electricity or charge from the grid.

Generation units are identical copies of the selected mechanism. Battery units scale both energy capacity and power; each unit retains the workbench's round-trip efficiency and initial state of charge. The square root of round-trip efficiency applies at each conversion. Partial-minute filling and depletion are represented as average power for that interval.

The default Fixed reserve strategy uses a fixed energy floor, including during an outage. The additional strategies described below change when that floor applies. It does not create energy when the battery starts below that floor. Grid backup is assumed to have unlimited import capacity when available. Outages use a half-open interval: the grid is unavailable at the start minute and returns at the end minute.

Generator operating scenarios retain their original 120- or 720-minute durations. Steady sources run for 240 minutes. Three synthetic demand profiles are defined relative to that duration: constant demand, later-rising demand, and a short surge. They are not measured household/community data or calendar forecasts.

Stored energy and accumulated totals are measured at minute boundaries. The final endpoint has zero power and contributes no extra interval. The full electrical ledger is:

**Generation + grid imports + initial storage = served demand + curtailed generation + battery conversion losses + final storage.**

Source conversion losses are already reflected in the generator's electrical output. Initial stored energy has no assigned origin and is not labeled as new renewable generation. The no-battery comparison removes both the bank and its initial stored energy, while preserving generation, demand, and grid availability.

### Investigation workflow

- Switch between the source's 3D mechanism, a 3D battery bank, and a power-flow view. Only one WebGL renderer is active.
- Scrub or play the timeline, inspect components, and jump to the first unmet demand, greatest curtailment, lowest stored energy, or outage start.
- Read current power routing, full-sequence demand coverage, grid imports, unmet demand, and the battery's effect relative to the same system without storage.
- Compare generation/demand/unserved power on one chart and stored energy/reserve on another; the outage interval is shaded.
- Review every minute in an accessible table, save an observation, and export the full configuration and results as JSON or the minute table as CSV.
- Configuration, selected minute, observation, and chosen scene persist. After reloading the development host, reopen Storage & demand from the workbench to return to that system.

The model assumes equipment can operate while islanded; it does not assess real inverter compatibility, voltage, frequency, grid protection, network constraints, degradation, or predictive dispatch schedules. It is an energy-balance teaching model, not an installation design.

### Connected-system validation

The 23 new tests exercise every source in steady mode and both operating scenarios across all three grid modes. They verify per-interval and total conservation, scaling, no-battery equivalence, outage boundaries, no grid charging, reserve behavior, partial-minute saturation/depletion, efficiency losses, zero demand, invalid input recovery, serialization, and workspace rendering.

The dedicated Chromium workflow covers all eight sources, both 3D views, copied inputs and independent workbench settings, starter systems, critical-minute controls, reserves, grid imports, no demand, playback, context recovery, exports, persistence, and library navigation. Thirteen new WCAG A/AA audits cover source systems, expanded light/dark states, and 390- and 320-pixel layouts.

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_microgrid.test.js --maxWorkers=1
node reports/renewables-enhancement/microgrid-browser-qa.cjs
~~~

Review [desktop workspace](microgrid-desktop.png), [battery scene](microgrid-battery.png), [timeline](microgrid-timeline.png), [energy results](microgrid-results.png), [phone controls](microgrid-controls-320.png), and [phone results](microgrid-results-320.png). Examples: [system JSON](microgrid-investigation.json), [minute CSV](microgrid-minutes.csv). Browser evidence: [microgrid-browser-results.json](microgrid-browser-results.json).

Final connected-system verification: **148 tests pass across eight Renewables files.** All three browser workflows pass, totaling **52 WCAG A/AA audits**, with no page errors, console errors, or document overflow in the tested mobile layouts. Desktop layout, phone controls/results, and the outage timeline were visually reviewed. Source and desktop deployment copies are identical. As with earlier passes, browser validation uses the isolated local host of the real tool, not a deployed full-application test.


## Battery strategies and outage timing studies

The storage-and-demand model now offers three explicit dispatch strategies:

| Strategy | While grid backup is available | When grid backup is unavailable |
| --- | --- | --- |
| Fixed reserve | Serve deficits from energy above the selected reserve | Continue holding the selected reserve |
| Release during outages | Serve deficits from energy above the selected reserve | Allow discharge down to empty |
| Save for outages | Hold all stored energy and use grid backup for deficits | Allow discharge down to empty |

All strategies charge only from surplus generation. None purchases charging energy from the grid or uses a forecast to precharge. The last two strategies release stored energy in islanded mode as well, since the grid is unavailable there. The configured reserve remains available for the first two strategies; Save for outages ignores that slider while protecting all stored energy.

Microgrid model **version 2** retains Fixed reserve as the default for old saved systems and unrecognized strategy values. Starter systems reset to that default. Stored energy, power limits, efficiency, and energy conservation are unchanged. The discharge floor now appears as a stepped line on the battery chart and in both the minute table and CSV. Returning to a higher floor after an outage stops further discharge; it does not refill the battery.

### Compare outage timing

Open **Outage timing study** in the Storage & demand header. Select an outage length and 5, 13, or 25 requested start times, then run the study.

- Feasible starts span minute zero through the latest start that permits the whole outage to finish within the source sequence. Starts are rounded to whole minutes, with duplicates removed.
- Every start is evaluated under all three strategies, for at most 75 cases. A full-sequence outage has only one feasible start and three cases.
- Every case replays the same captured source, demand, equipment, reserve setting, and initial charge from minute zero. Battery state is not reset at the outage start.
- The grid is available outside each tested outage, regardless of the live workspace's grid mode. This is stated beside the controls.
- Coverage percentages and complete-coverage counts apply to demand **during the outage**. Zero-demand windows are identified separately, without invented percentages or success counts.
- Results include unmet energy, the first minute interval with unmet demand, peak average power gap, storage at outage start/end, imports before the outage, and full-sequence imports. These make the tradeoff between everyday grid use and backup coverage visible.

The matrix and strategy summaries report sampled outcomes. They are not outage probabilities, real installation reliability estimates, or proof that unsampled timings have the same result.

### Recorded results and 3D inspection

A completed study captures its system inputs and sampling configuration. Changing live controls does not silently replace the study; the interface flags changes to its design or setup. Strategy and live outage changes alone do not invalidate that recorded design, because the study compares all three strategies over its own outage windows.

Selecting a matrix cell restores the captured equipment/resource/load settings, applies that strategy and outage, and opens the battery scene at the first interval with unmet demand (or the outage start if demand is fully met). Keyboard focus follows the 3D scene. Each strategy also offers a shortcut to its largest sampled energy shortfall. **Restore recorded system** returns to the original captured grid settings and strategy at minute zero.

The latest study, selected case, and observation persist alongside the system. JSON exports preserve both the current system and the recorded study, even when their inputs differ. The study CSV provides one row for each outage/strategy case; it leaves coverage blank for no-demand windows. Existing mechanism readings and experiments stay independent.

### Strategy-study verification

**171 tests pass across nine Renewables files.** The 23 new tests cover all eight sources under each strategy/grid state, conservation, legacy defaults, dynamic reserve boundaries, backup preservation, no grid charging, islanded behavior, unique sample bounds, replayed history, outage-only denominators, summary selection, tiny demand, no-demand handling, configuration recovery, serialization, and recorded-result rendering.

The new Chromium workflow passes **14 accessibility audits**, and the existing storage-and-demand workflow was rerun successfully with **13 audits**. Both workflows report no page errors, console errors, or document overflow at the tested phone widths. The maximum 75-case scan took 271 ms in this local test browser; this is a single observed run, not a device-wide performance guarantee. Desktop results and phone summary cards were visually reviewed.

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_resilience.test.js --maxWorkers=1
node reports/renewables-enhancement/resilience-browser-qa.cjs
node reports/renewables-enhancement/microgrid-browser-qa.cjs
~~~

Review [strategy matrix and recorded conditions](resilience-desktop.png), [dynamic discharge floor](resilience-dispatch-floor.png), [phone summary](resilience-summary-320.png), and [phone selected case](resilience-case-320.png). Examples: [combined JSON investigation](resilience-investigation.json), [outage cases CSV](resilience-outages.csv). Evidence: [strategy browser results](resilience-browser-results.json).

As in earlier passes, browser validation runs the real tool in an isolated local development host; this is not a deployed full-application test.

## Battery capacity and power design bench

Open **Storage & demand → Battery design bench**. The bench varies battery energy capacity and charge/discharge power independently, then replays each design with the captured source settings, generation-unit count, load pattern, grid schedule, reserve, dispatch strategy, and efficiency.

### Compare the equipment trade-off

- Choose minimum and maximum per-unit capacity and power, a local-demand coverage target, and a 5 × 5 or 9 × 9 sampling grid (at most 81 cases). Equal axis endpoints are deduplicated. The battery-unit count stays fixed, and matrix labels show the resulting whole-bank ratings.
- **Local demand coverage** counts direct generation plus battery discharge over the entire sequence. Grid imports are excluded even when they serve all otherwise unmet demand. Initial storage has no assigned source, so this is not a renewable-energy percentage.
- The recorded baseline appears beside the target count. **Compact options** are sampled designs that meet the target and have no other passing sampled design with no more capacity and no more power, with at least one strictly lower. This is a set of equipment trade-offs, not a cost ranking or proof of an optimum outside the sample.
- No-demand cases have no coverage percentage and do not pass a target. An absent bank retains its baseline results in the model but produces no candidate grid; the interface asks for at least one battery unit before running.

### Control the starting-energy assumption

The default **Same starting energy (kWh)** preserves the captured initial energy, capped at each candidate's capacity. Both the count of capped designs and each candidate's initial kWh are reported. Increasing the size of an empty bank cannot create initial energy, and the existing no-grid-charging rule remains in effect.

**Same starting percentage (%)** keeps the original state of charge. Larger banks then receive more initial energy; the interface explicitly describes this trade-off. Reserve remains a percentage of each candidate's capacity, so a larger bank at the same initial kWh can protect more energy and supply less demand under Fixed reserve. The comparison evaluates every case directly rather than assuming that bigger equipment always performs better.

### Inspect and record a design

Choose a matrix cell or compact-option button to restore that candidate's recorded conditions, open the battery in 3D, and select the first interval requiring grid supply or leaving demand unmet. A case with no local shortfall opens at minute zero. Keyboard focus follows the scene. Screen-reader button names include bank ratings, local coverage, target status, and compact status.

The selected result reports local coverage, grid imports, unmet demand, initial/final storage, battery losses, and coverage change from the original baseline. Diagnostic counts distinguish intervals where power rating falls below the generation deficit from intervals where energy permitted by the current strategy cannot cover it. These counts can overlap; the latter includes reserve and strategy restrictions, not only an empty battery.

**Restore design baseline** restores the original system and minute zero. Completed studies, their selected case, and observations persist with the sandbox. Editing current inputs or design settings flags the captured result without silently replacing it. The existing outage study and workbench experiments stay independent.

The combined system JSON now includes `batteryDesignStudy` with its captured inputs, baseline, candidate results, sampled compact options, assumptions, and observation. **Export battery designs CSV** produces one row per candidate with bank ratings, starting energy/capping, coverage, target and compact flags, energy totals, and limiting-interval counts. The microgrid simulator remains version 2; the new study result is version 1.

### Design-bench validation

The new `tests/renewables_designs.test.js` includes hand-calculated power-versus-energy limits, starting-energy preservation and capping, percentage comparisons, no grid charging, grid-import exclusion, strategy-held charge, sampled compact choices, zero/tiny demand and targets, unit-count scaling, empty banks, bounded/deduplicated axes, exact replay, reserve effects, serialization, captured UI rendering, and energy conservation for all eight generation technologies.

The design browser workflow exercises the real React tool and Three.js scene in the existing isolated localhost host. It checks 3D and keyboard inspection, captured inputs, baseline restoration, both initial-charge modes, JSON/CSV downloads, persistence, all eight sources, up to 81 cases, collapsed axes, no-demand/no-bank behavior, coexistence with the outage study, and 390/320-pixel layouts. Desktop matrix and the 320-pixel selected-result panel were visually reviewed. Accessibility audits cover light/dark modes, both phone widths, no demand, all eight sources, and the maximum grid.

Review [design matrix](design-desktop.png), [battery timeline](design-battery-timeline.png), [phone summary](design-summary-320.png), and [phone result](design-case-320.png). Export examples: [captured investigation JSON](design-investigation.json), [candidate CSV](design-candidates.csv). Browser evidence: [design results](design-browser-results.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_designs.test.js --maxWorkers=1 --testTimeout=15000
node reports/renewables-enhancement/design-browser-qa.cjs
node reports/renewables-enhancement/resilience-browser-qa.cjs
node reports/renewables-enhancement/microgrid-browser-qa.cjs
~~~

The outage browser harness now scopes its screenshots to the named outage region so the two comparison benches can share visual styles. The final verification run is sequential with 15-second per-test headroom after an initial concurrent run exceeded the default 5-second limit in an existing tidal-physics test. This remains an isolated tool validation, not a deployed full-application check.

Final result: **197 tests pass across 10 Renewables files**, including 26 design-bench tests. All three browser workflows pass with **41 clean accessibility audits** (14 design, 14 outage, 13 storage), no page or console errors, and no document overflow at the tested phone widths. The final maximum 81-design scan took 254 ms in this local browser run. Canonical/deployment source parity, syntax checks, and patch whitespace checks pass. See [verification summary](design-verification.json).

## Two-source renewable systems

Open **Storage & demand → Solar + wind** for a mixed-source starter, or use **Enable second generator** in the new second-source setup panel. Any of the eight generation technologies can serve as either source, including two independently configured installations of the same technology.

### Independent generators, one electrical balance

The second source has its own technology, workbench inputs, installed-unit count, operating scenario, and time offset. Opening its workbench does not overwrite the running system. **Copy second source workbench settings** explicitly imports that workbench's inputs and scenario and resets the offset to zero. Changing the primary technology retains the second source; the existing one-source starter systems disable it.

Primary and second-source electricity are added before dispatch. Their combined generation serves demand, then charges the single shared bank from surplus. Battery discharge, the selected reserve/backup strategy, grid availability, curtailment, and losses use the same existing energy balance. There is no grid charging or attribution of stored battery energy back to a particular generator.

A live **What does the second source change?** panel compares the combined system with a replay that disables only the second source. Both cases keep the same primary equipment, demand, initial storage, bank, grid schedule, and strategy. The panel shows each source's generation, direct supply, battery discharge, grid imports, unserved energy, curtailment, battery losses, and final storage. It explicitly distinguishes adding equipment from an equal-capacity or cost comparison.

The Solar + wind starter combines passing clouds with a delayed wind lull, starts the bank empty, and uses valid workbench bounds. The wind resource is set to 4 m/s with a 10 m rotor radius so the source contributions are useful to compare at the preset demand.

### Native-minute resource timing

The primary source continues to set the system duration: its scenario duration, or four hours for steady operation. The second profile retains its original minute scale. A positive offset moves its events later; a negative offset moves them earlier. Before its first point and after its last point, the resource holds the corresponding endpoint value. Profiles are never stretched or automatically repeated, and a longer profile is truncated by the system horizon.

The current balance reports the second profile's sampled minute and whether it is active or holding an endpoint. A dedicated **How the two timelines align** explanation makes these assumptions visible. The profiles remain synthetic independent conditions, not correlated weather forecasts or astronomical tide predictions.

### 3D inspection and recorded studies

**Source in 3D**, **Second source in 3D**, and **Battery in 3D** share the selected system minute and one WebGL renderer. Each generation scene displays one unit of the appropriate mechanism and uses that source's effective resource settings at that minute. A second source with zero installed units stays available as an explicitly labeled mechanism preview but contributes no electricity. Disabling it while viewing its mechanism returns to the primary scene.

The **Generation mix chart** plots primary, second-source, and combined output with distinct line patterns. The minute table and system CSV include both per-source power columns in addition to the existing total. The combined comparison offers a keyboard-accessible shortcut to that chart.

Outage timing and battery-design studies now capture both generators and the second profile's time offset. Their existing 3D inspection/restore controls reconstruct the entire recorded mixed system. Changes to second-source conditions flag captured results as changed. Both studies include a recorded second-source conditions section, and their CSV exports append source/scenario/unit/offset/settings provenance plus both generation totals.

### Version and export compatibility

The microgrid model and combined system JSON are now **version 3**. Old systems and recorded requests without a companion source normalize to a disabled second source and preserve their single-source energy balances. Study result formats remain version 1 and report microgridVersion 3. Existing primary fields and the original system-CSV column order are preserved; per-source generation columns are appended.

System JSON includes current companion settings, reference/formula/limits, timing assumptions, a summary of the primary-only replay, and independent captured outage/design studies. Turning the current companion off does not remove it from an earlier captured study. Initial stored energy still has no assigned source.

### Hybrid validation

The new tests cover hand-calculated combined PV output and charging, legacy disabled behavior, native positive/negative offsets, endpoint holds, truncation, no endpoint energy, unit scaling, zero-unit previews, resource clipping and shutdown, malformed settings, no demand, all **64 primary/second-source pairings**, conservation, exact study replays, serialization, and recorded UI rendering. One test moves a complete wind lull into the sunny part of a longer solar day and verifies that unmet demand changes while total wind energy remains the same.

The browser workflow exercises every second-source 3D mechanism, all 16 generation scenarios, explicit workbench copying, both timing directions, source traces, matched baseline results, outage/design restoration, current-versus-captured exports, persistence, keyboard controls, zero units, disable-while-inspecting, and 390/320-pixel layouts. It uses the real React tool and Three.js in the isolated localhost host.

Review [second-source 3D scene](hybrid-wind-3d.png), [source controls](hybrid-controls.png), [generation chart](hybrid-generation-chart.png), [combined comparison](hybrid-comparison.png), and [phone comparison](hybrid-comparison-320.png). Export examples: [investigation JSON](hybrid-investigation.json), [minute CSV](hybrid-minutes.csv), [outage CSV](hybrid-outages.csv), and [design CSV](hybrid-designs.csv). Browser evidence: [hybrid results](hybrid-browser-results.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_hybrid.test.js --maxWorkers=1 --testTimeout=15000
node reports/renewables-enhancement/hybrid-browser-qa.cjs
~~~

Final verification: **221 tests pass across 11 Renewables files**, with all 24 hybrid tests rerun successfully after tuning the starter. The hybrid, design, outage, and storage browser workflows pass **56 accessibility audits** (15 + 14 + 14 + 13), with no page or console errors and no document overflow at the tested phone widths. The final hybrid browser run also passed after the starter adjustment. Desktop 3D and comparison layouts and the phone comparison were visually reviewed. Source mirrors, JavaScript syntax, patch whitespace, and the localhost preview were checked. See [verification summary](hybrid-verification.json).


## Demand shifting bench

Open **Storage & demand → Shift demand into daylight** for an example, or use **Demand shifting** to open the bench for any system. The daylight starter moves evening demand into the solar day with no battery installed, so the original-versus-shifted comparison makes the timing effect visible. Add storage or a second generator to explore how the same schedule interacts with the rest of the system.

### Preserve energy while changing timing

Enable shifting, choose a share of the original demand in a source window, and set a receiving window. The model removes that share from each source-window interval and distributes exactly the selected energy uniformly over the receiving window. Both windows stay inside the primary sequence; the final timestamp is an endpoint and carries no additional energy. Receiving windows can be earlier or later than source windows.

The bench reports total requested energy before and after, energy actually moved between minutes, and peak demand. Overlapping windows can cancel part or all of a timing change, so allocated source energy and net moved energy are shown separately. Identical windows with a varying original profile can still flatten that profile. Short receiving windows can concentrate demand into a high peak and increase unserved energy. Zero share, zero demand, and schedules that make no timing change are handled explicitly.

This is a prescribed educational schedule. It does not optimize against generation or model appliance deadlines, comfort, ramping, or rebound losses. Demand is never deleted, shifted outside the sequence, or assumed to become more efficient.

### Compare and inspect the outcome

**Original and shifted demand results** replays the same generation, storage, initial charge, grid schedule, and dispatch strategy with shifting disabled. The comparison includes direct generation, battery discharge, grid imports, unserved energy, curtailment, losses, and final storage. The existing two-generator comparison retains the same demand schedule in both of its cases.

**Compare demand timing** opens a chart with distinct original and scheduled traces, plus shaded source and receiving windows. Exact original demand, removed power, added power, and scheduled demand appear in the minute table and current electricity balance. **Inspect largest demand increase in 3D** selects the earliest minute with the largest added load and opens the battery mechanism at that minute. Both shortcuts move keyboard focus to their destination; the wide comparison table supports keyboard scrolling on phones.

### Captured studies and exports

Outage and battery-design studies capture the full demand schedule alongside both generators. Changing the live schedule flags recorded results as changed, and inspecting a recorded case restores its captured schedule. Study conditions explain the recorded windows. Their CSV files append enabled/share/window fields; the main minute CSV appends baseline demand, shifted-out power, and shifted-in power without changing the preceding columns.

System JSON is now **model version 4** and includes scheduling rules, an independent demand-shift observation, the schedule summary, minute-level components, and the original-demand comparison. Study formats remain version 1 and identify microgridVersion 4. Legacy settings without a schedule normalize to shifting disabled. Turning the live schedule off preserves it in previously captured studies. Schedule settings and observations survive saved-state restoration.

### Demand-shifting validation

The new 26-test suite covers hand-calculated transfers, earlier/later scheduling, overlapping and identical windows, varying source demand, horizon clamping and the final endpoint, tiny/large values, malformed inputs, legacy disabled behavior, zero demand/share, daylight benefits, concentrated peaks that worsen unserved demand, dispatch and storage conservation across all eight generators, independent source settings, exact captured-study replay, serialization, and rendered controls.

Final verification: **247 tests pass across 12 Renewables files**. After visual review expanded the comparison table and removed signed zero display noise, all 26 demand-shifting tests passed again. The final demand-shifting browser workflow also passed after those presentation changes. All five browser workflows pass **72 accessibility audits** (16 demand shifting, 15 hybrid, 14 design, 14 outage, 13 storage), with no page/console errors and no document overflow at the tested phone widths.

The browser checks exercise keyboard focus and horizontal table scrolling, original-versus-shifted energy equality, 3D inspection at the largest load increase, compressed peaks, overlap cancellation, restored studies, JSON/CSV contents, persistence, all eight generators, and 390/320-pixel layouts. Visual review covers the desktop comparison, demand chart, selected battery scene, and phone bench. The comparison now shows every row without a nested vertical scroll.

The final suite uses one thread worker and a 30-second test timeout. An initial fork-based run encountered host worker startup/timeouts and exposed a strict floating-point assertion in the new tests; that assertion now uses a numerical tolerance. The complete thread-based regression run passes. Source parity, syntax, patch whitespace, and exact source delivery from the existing localhost preview were checked. Validation remains an isolated tool check, not a deployed full-application test.

Review [demand bench](demand-shift-desktop.png), [timing chart](demand-shift-timeline.png), [battery inspection](demand-shift-battery-3d.png), and [phone bench](demand-shift-bench-320.png). Examples: [investigation JSON](demand-shift-investigation.json), [minute CSV](demand-shift-minutes.csv), [outage CSV](demand-shift-outages.csv), and [design CSV](demand-shift-designs.csv). Evidence: [browser results](demand-shift-browser-results.json), [unit test results](demand-shift-vitest-results.json), and [verification summary](demand-shift-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_demand_shift.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/demand-shift-browser-qa.cjs
~~~


## Supply gap explorer

Open **Storage & demand → Explain a supply gap** for a reproducible example, or use **Supply gap explorer** to inspect the current system. The explorer recalculates from the existing minute-by-minute dispatch without changing generation, demand, storage, or grid behavior.

### Local supply and unmet demand are different questions

A local supply gap is demand left after direct generation and battery discharge. Grid imports plus unserved demand equal that gap. The two timeline lanes distinguish all local gaps from only unserved demand. Each block represents a continuous period of consecutive gap minutes; its width shows duration, not power. End minutes are excluded, and the sequence endpoint adds no energy. Episode detection ignores gaps no larger than one billionth of the corresponding minute's demand to avoid treating numerical roundoff as an event.

The explorer reports episode count, longest duration, and total gap energy. Filter by local or unserved gaps, sort by energy, duration, or start time, and page through eight periods at a time. Selection uses the period boundaries; if a selected period disappears when inputs change, a valid current period is selected. Changing only explorer preferences or observations does not mark captured studies as changed.

### Ordered accounting of the gap

For a bank with installed units, the analysis first assigns the part of the generation deficit above its power rating. Within that rating, it separates energy that cannot be delivered from the current stored energy (including discharge efficiency) from energy physically available but held by the reserve or backup strategy. With no installed bank, all of the local gap is assigned to no battery bank. These components add to the local gap in each interval and over an episode.

This is an ordered accounting of the current replay. Constraints can overlap, and the component totals are not independent causes or estimates of the benefit from changing equipment. Raising power can expose a storage limit; adding empty capacity creates no electricity; releasing reserve can leave less energy for later deficits. Contextual investigation prompts link to the existing battery, demand-shifting, and outage benches.

The example uses zero PV input, constant 8 kW demand, a 10 kWh bank starting full, 5 kW battery power, 100% round-trip efficiency, a 20% fixed reserve, and a grid outage from minute 90 to 150. Over four hours, its 24 kWh local gap consists of 12 kWh assigned to power and 12 kWh held by strategy. Grid backup supplies 16.5 kWh; 7.5 kWh remains unserved during the outage.

### Inspect and record

The selected period shows its demand balance, peak gap and minute, and stored energy at its start and end. Keyboard-accessible controls open the 3D scene at the period start, peak, or final gap minute. Inspection uses the battery scene when units are installed and the primary generator otherwise. Linked benches receive keyboard focus. Zero demand, fully supplied demand, absent batteries, and zero power ratings have explicit results.

The system JSON now includes supplyGaps with analysis version 1, current normalized settings, both chronological episode lists, every gap minute, accounting rules, view preferences, and observation. The underlying microgrid model remains version 4. Episode CSV includes settings and boundary/energy/accounting fields; minute CSV includes local gap, imports, unserved demand, and the four accounting components, with a zero-power final endpoint. Notes and preferences survive saved-state restoration, while captured outage and battery-design studies retain their own recorded inputs.

### Supply-gap validation

**275 tests pass across 13 Renewables files**, including 28 new supply-gap tests. Coverage includes hand-calculated no-bank/power/energy/strategy cases, partial depletion, discharge efficiency, reserve release, zero/tiny demand, source surplus, shifted-demand episode boundaries, all eight generators across three strategies, minute/episode accounting, stable sorting and pagination, serialization, CSV provenance, and rendered controls.

The final supply-gap, existing storage, and existing demand-shifting browser workflows pass **50 accessibility audits** (21 + 13 + 16), with no page or console errors and no document overflow at 390 or 320 pixels. They verify exact 3D minutes, primary-source inspection with no bank, keyboard focus and selection, study restoration, saved observations, export contents, live updates, and the empty cases. A deliberately alternating synthetic resource produces 31 episodes to stress pagination; it is a test fixture, not a newly shipped weather profile.

An initial rapid-selection audit observed stale inherited child text colors. Period-button colors are now explicitly tied to selection, and accessibility checks wait for a completed paint after state changes. The final stress test passes, and selected desktop/phone layouts were visually reviewed. Source parity, JavaScript syntax, patch whitespace, and exact source delivery from port 8790 pass. Validation uses the isolated local React/Three.js host, not a deployed full-application check.

Review [gap explorer](supply-gaps-desktop.png), [selected outage period](supply-gaps-selected.png), [31-period stress layout](supply-gaps-many.png), [3D inspection](supply-gaps-battery-3d.png), and [phone detail](supply-gaps-selected-320.png). Examples: [investigation JSON](supply-gaps-investigation.json), [local episodes CSV](supply-gaps-local.csv), [unserved episodes CSV](supply-gaps-unserved.csv), and [gap-minute CSV](supply-gaps-minutes.csv). Evidence: [browser results](supply-gaps-browser-results.json), [unit results](supply-gaps-vitest-results.json), and [verification summary](supply-gaps-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_supply_gaps.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/supply-gaps-browser-qa.cjs
~~~


## Limited grid connections

Open **Storage & demand → Limited grid backup** for the new example. **Grid import capacity** in Demand & grid lets you enable a whole-system limit from 0 to 1,000,000 kW, including fractional ratings. Legacy settings and the other starter systems default to unlimited imports. An enabled limit is retained while islanded but has no effect until grid backup is available.

### Supply, availability, and capacity

Generators serve demand first, then the battery discharges within its existing power, stored-energy, efficiency, and strategy limits. Grid imports supply the remaining demand up to the connection rating. The same cap applies to the no-battery comparison. The model separates unmet energy caused by an available connection reaching its capacity from unmet energy while the grid is unavailable. Their sum equals total unserved demand at each minute and across the full sequence.

Grid availability continues to determine battery strategy. **Save for outages** holds the battery while the grid is available, even when the import cap cannot meet demand. A zero-kW limit does not declare an outage. This distinction is explicit in the review panel and model rules. There is no grid charging, export, tariff, voltage/frequency, or protection-dynamics model.

The example has zero PV input, constant 8 kW demand, a full 10 kWh bank, 5 kW battery power, 100% round-trip efficiency, a 20% fixed reserve, and a 2 kW grid connection. Over four hours, the bank supplies 8 kWh and imports supply 8 kWh, leaving 16 kWh unserved because of the connection limit. Unlimited imports supply the full remaining 24 kWh. Adding a minute-90-to-150 outage separates 10.5 kWh of connection-limited shortfall from 7.5 kWh of outage shortfall.

### Review and inspect

**Grid connection review** is a collapsible panel within the full system results, with a header shortcut. It reports peak imports, peak requests while the grid is available, limiting intervals, and both categories of unmet energy. Its paired replay disables only the import cap and retains the same equipment, profiles, demand shifts, initial charge, grid outages, and strategy. Under this dispatch model, the cap changes grid supply and unmet demand without changing generation or battery history.

The **Grid import chart** plots actual imports, requested imports after battery dispatch, and available capacity when a limit is enabled. Capacity uses step boundaries and drops to zero during outages. Requests are also zero while the grid is unavailable. Exact values are in the minute table. Inspection controls jump to the first connection shortfall or largest import request, opening the battery scene when installed and the primary source otherwise. Keyboard focus follows the selected chart or 3D scene.

The supply-gap explorer now carries both categories of unmet energy in its minute records, episode records, and explanations. Grid-covered and unserved energy can coexist within the same minute and episode. Its ordered battery-limit accounting continues to describe the entire local gap.

### Recorded conditions and compatibility

Outage and battery-design studies capture and restore the grid limit together with both generators and shifted demand. Their CSVs append the enabled flag, connection rating, and whole-sequence energy unmet because of the cap or grid unavailability. The existing local-demand-coverage design target still excludes grid imports and does not change simply because the connection rating changes.

The system model and JSON are now **version 5**; study and supply-gap analysis formats remain version 1. System JSON includes grid connection rules, an independent observation, and the unlimited comparison. Minute CSV and table append requested imports, connection-limited and grid-unavailable shortfalls, available capacity, and unused capacity. Unlimited capacity/headroom are null in JSON, blank in CSV, and labeled Unlimited in the table. Outages have zero capacity, and the final endpoint has zero power values. Gap CSVs append both unmet-energy categories without moving existing columns. Genuine tiny shortfalls now use the same relative roundoff threshold in the main and connection-limited interval counters.

Settings, review open/closed state, and observations survive saved-state restoration. Disabling the live cap preserves the cap in earlier recorded studies. Scene geometry and individual energy-mechanism formulas remain unchanged.


### Grid-connection validation

**305 tests pass across 14 Renewables files**, including 30 new grid-limit tests. Coverage includes legacy unlimited behavior, exact capped energy, spare and equal capacity, fractional ratings, malformed inputs, zero demand and sequence endpoints, islanded operation, zero-capacity connections with all battery strategies, the no-battery comparison, no grid charging, shifted demand, two-source generation, tiny shortfalls, unchanged battery history in the unlimited replay, captured study restoration, CSV provenance, and energy conservation across all eight generators, three grid states, and three strategies.

After the final phone usability polish, all 30 grid-limit tests passed again. The new grid-limit workflow and existing supply-gap, storage, and mixed-generator browser workflows pass **70 automated accessibility audits** (21 + 21 + 13 + 15), with no page/console errors or document overflow at 390 or 320 pixels. All four workflows ran against the final source.

The new browser workflow verifies the hand-calculated starter and outage split; bounded imports and stepwise available capacity; unlimited, zero, spare, islanded, no-demand, and no-bank cases; demand-shifting bottlenecks; exact keyboard-driven 3D inspection; a single active renderer; independent captured outage/design conditions; JSON/CSV accounting; and saved controls, review state, and observations. Phone users receive a horizontal-scroll hint for the comparison, and keyboard scrolling is checked for both the comparison and chart.

Desktop review, the outage chart, selected battery scene, and phone controls/comparison were visually inspected. Canonical/mirror bytes, JavaScript syntax, scoped patch whitespace, and exact source delivery from the existing port-8790 preview pass. These checks use the isolated local React/Three.js host, not a deployed full-application test.

Review [grid comparison](grid-limit-desktop.png), [outage import chart](grid-limit-outage-chart.png), [3D inspection](grid-limit-battery-3d.png), [phone comparison](grid-limit-review-320.png), and [phone setup](grid-limit-controls-320.png). Examples: [investigation JSON](grid-limit-investigation.json), [captured studies JSON](grid-limit-captured.json), [minute CSV](grid-limit-minutes.csv), [gap episodes CSV](grid-limit-gap-episodes.csv), [outage CSV](grid-limit-outages.csv), and [design CSV](grid-limit-designs.csv). Evidence: [browser results](grid-limit-browser-results.json), [full unit results](grid-limit-vitest-results.json), [final targeted results](grid-limit-final-vitest-results.json), and [verification summary](grid-limit-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_grid_limits.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/grid-limit-browser-qa.cjs
node reports/renewables-enhancement/supply-gaps-browser-qa.cjs
node reports/renewables-enhancement/microgrid-browser-qa.cjs
node reports/renewables-enhancement/hybrid-browser-qa.cjs
~~~


## Grid capacity experiment

Open **Storage & demand → Grid connection review → Compare connection ratings**, or expand **Grid capacity experiment** within the full system results. Choose a minimum and maximum whole-system import rating, 5/9/17 samples, and a demand-served target. Running the experiment records the complete current system and replays each rating under Fixed reserve, Release during outages, and Save for outages. Equal endpoints produce one rating. Fractional and very small ratings remain distinct; ratings are bounded from zero to 1,000,000 kW.

### Compare the same system

Each candidate enables its tested import cap while retaining the captured grid availability/outage schedule, both generators and their native profiles, shifted demand, battery equipment, initial charge, efficiency, and reserve. Zero kW remains an available connection outside outages, so Save for outages continues to hold the battery then. Islanded cases cannot benefit from larger ratings. The experiment uses the existing version-5 dispatch without changing its energy equations or strategies.

The chart shows unmet energy versus tested capacity, with distinct line patterns for the three strategies and a point at each sample. Connecting lines do not establish simulated results between samples. The comparison matrix reports demand served, unmet energy, and target status. Summary cards identify the lowest *tested* passing rating for each strategy; they do not estimate the exact minimum, cost, optimal installation, or real-world reliability. The original system appears as an independently replayed baseline retaining its original cap and strategy.

Targets include grid imports and measure served energy over the **whole sequence**. A case meeting a target below 100% may still have unmet-demand intervals. No-demand cases leave coverage and target results unevaluated, even at a zero-percent target. Roundoff tolerance scales with sequence demand. The selected case reports connection-limited and grid-unavailable unmet energy separately, plus imported energy, battery discharge, initial/final storage, peak imports, and shortfall timing.

### Inspect and preserve an experiment

Selecting a cell, a lowest-passing option, or the selected-case inspection button restores that candidate's complete captured conditions. It opens the first unmet-demand minute in the battery 3D scene when units are installed, or the source scene without a bank. Fully served cases open at their peak import request, or minute zero when no imports are requested. Keyboard focus follows the 3D scene. A separate action restores the original baseline, including a disabled grid cap when that was recorded.

Live settings and pending range/target changes are distinguished from recorded results. A selected candidate matching the live simulation is recognized without a false changed-input notice. Re-running starts a new comparison and clears the old observation. Saved state retains the request, selection, observation, and panel open state; derived results are recomputed from the request rather than trusted from stored totals.

System JSON adds **gridCapacityStudy** with study version 1, microgrid version 5, captured baseline/settings/configuration, all candidate metrics, rules, and observation. **Export grid capacity CSV** records every rating/strategy, target/coverage, energy categories, storage, timing, peak imports, lowest-passing marker, versions, and the exact normalized candidate settings as JSON. Missing coverage, target, and first-shortfall values are blank. Existing system and study formats remain compatible.


### Grid-capacity experiment validation

**333 tests pass across 15 Renewables files**, including 28 new experiment tests. The new tests cover normalized/reversed/equal/fractional/tiny ranges, exact no-bank energy balances, sampled minimum ratings, whole-sequence targets with remaining outage gaps, no-demand and zero-target behavior, strategy trade-offs with equal initial energy, zero-rated available connections, unchanged battery history across ratings, islanded invariance, both generators and shifted demand, captured replay, CSV provenance, malformed stored selections, and conservation/monotonic shortfall behavior across all eight generators.

The final experiment workflow and existing grid-limit browser regression pass **42 automated accessibility audits** (21 each), with no page/console errors or document overflow at 390 or 320 pixels. Both ran after the final presentation changes. They exercise keyboard 3D inspection and focus, the correct no-bank source scene, one active renderer, exact outage/connection accounting, pending experiment settings, saved requests and observations, baseline restoration, captured source/demand schedules, JSON and CSV exports, no-demand results, a single rating, the maximum 17 ratings, and all eight generation technologies. Phone chart and comparison regions support keyboard scrolling.

Visual review covered the desktop comparison, shortfall chart, battery scene, and phone layout. The five default rows now fit without vertical scrolling; larger experiments remain scrollable. The plot explains overlapping strategy curves, and the selected matrix case has an accessible current-state marker. Syntax, scoped patch whitespace, and canonical/mirror byte equality pass. The stopped localhost preview was restarted, and port 8790 was confirmed to serve the exact tested source. Validation uses an isolated local React/Three.js tool host, not a deployed full-application check.

Review [experiment](grid-study-desktop.png), [shortfall chart](grid-study-chart.png), [3D inspection](grid-study-battery-3d.png), and [phone experiment](grid-study-mobile-320.png). Examples: [recorded JSON](grid-study-investigation.json), [candidate CSV](grid-study-cases.csv), and [no-demand CSV](grid-study-no-demand.csv). Evidence: [browser results](grid-study-browser-results.json), [full unit results](grid-study-vitest-results.json), [integrity checks](grid-study-integrity.json), and [verification summary](grid-study-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_grid_study.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/grid-study-browser-qa.cjs
node reports/renewables-enhancement/grid-limit-browser-qa.cjs
~~~


## Compare two recorded grid cases

After running a **Grid capacity experiment**, choose **Compare selected grid case**, or expand **Compare two grid cases**. Select A and B independently from the tested rating/strategy combinations or the recorded baseline. Selection updates only the comparison; explicit inspection loads a case into the main 3D simulation. The selected-case shortcut uses that case as B and preserves the existing A reference. Swapping A and B reverses the comparison while retaining the cursor.

### Timing and energy trade-offs

The comparison replays two captured configurations from minute zero, keeping both generators, demand shifting, initial energy, battery equipment, grid availability, and outage timing fixed. Rating and strategy can differ. The recorded baseline keeps its original enabled/disabled import limit. A shared normalized experiment setup generates case choices without rerunning all sampled cases just to compare two. Changing only the cursor, chart, or note reuses the paired replay.

Every change is **B minus A**. Summary metrics show changes in total unmet energy, grid imports, and final storage. Minute counters separately identify where B leaves less, more, or equal unmet demand, using a relative roundoff threshold of one billionth of the interval's demand. Critical-moment controls select the first unmet-demand difference, largest reduction, or largest increase; absent moments are disabled. Equal unmet energy over the sequence can still contain intervals of improvement and worsening. When unmet demand matches throughout, grid use or stored energy can still differ.

A reproducible trade-off uses zero PV input, constant 3.75 kW demand, a 10 kWh bank starting at 75%, 5 kW battery power, 100% round-trip efficiency, no reserve, and an outage from minute 90 to 150. Case A uses Fixed reserve with a 3.75 kW connection; B uses Save for outages with a 2.5 kW connection. A has 1.875 kWh unserved, B has 3.75 kWh. B helps in 30 outage minutes and worsens 180 available-grid minutes. At minute 120, A is empty while B retains 5.625 kWh. Increasing B's connection to 3.125 kW makes total unmet energy equal to A's while preserving both improved and worsened intervals.

### Linked charts and exact inspection

Switch between unmet demand, grid imports, and stored energy. Power curves use one-minute steps; storage includes every boundary through the endpoint. Solid A and dashed B share a scale, a selected-minute cursor, and the captured outage shading. The slider, previous/next controls, and critical-moment shortcuts select the same minute for both cases. The selected-minute panel provides A, B, and signed change, with an expandable complete ledger. Another expandable table compares full-sequence energy totals.

**Inspect case A in 3D** and **Inspect case B in 3D** restore that case's exact captured settings at the comparison cursor. A bank uses the battery scene; no installed bank uses the primary source. Keyboard focus moves to the scene, and only one renderer is active. Baseline inspection restores its original cap, strategy, and other conditions without forcing the cursor to zero. At the final endpoint, power is zero and no extra interval is integrated; stored energy is the final boundary value.

### Saved comparisons and exports

The paired selection, cursor, chart, observation, and open/closed state are saved with the experiment. Live input changes and pending experiment configuration changes do not alter the recorded comparison. A new experiment clears the old comparison and note so indices cannot silently refer to different ratings.

System JSON adds **gridCapacityStudy.comparison** with comparison version 1 and microgrid version 5, normalized preferences, both exact case settings and totals, signed energy changes, critical-moment metadata, all compact minute records, and model rules. Closing the panel retains its exportable comparison. **Export comparison minutes CSV** includes each case's power and boundary storage, signed changes, common demand/generation/grid availability, versions, and both normalized settings as JSON on every row. Existing experiment CSV remains unchanged. Raw simulation values are retained in exports.


### Paired grid-case validation

**360 tests pass across 16 Renewables files**, including 27 new comparison tests. They cover baseline/default and malformed selections, exact case replay, signed changes, equal-total timing trade-offs, swapping cases, identical cases, grid/storage differences without unmet-demand differences, exact storage boundaries and terminal power, minute-to-total reconciliation, tiny differences, no demand/bank, zero-capacity availability, islanded invariance, single/17-rating experiments, captured companion and shifted-demand settings, persistence, CSV provenance, rendered controls, and both energy ledgers across all eight generators.

The final paired workflow and existing capacity-experiment regression pass **43 automated accessibility audits** (22 + 21), with no page/console errors or document overflow at 390 or 320 pixels. Both ran against the final source. The paired workflow checks selections that leave live inputs unchanged, separate improvement/worsening shortcuts, equal-total timing differences, shared-minute A/B inspection with one renderer, a source scene without a bank, power-step and storage-boundary plots, keyboard endpoints, baseline restoration, recorded conditions despite later edits, comparison reset on a new experiment, exported closed-panel state, minute CSV settings, saved notes, phone keyboard scrolling, and all eight technologies.

Desktop controls and the unmet-demand trade-off, storage chart through the final boundary, battery inspection, and phone selected-minute layout were visually reviewed. Source/mirror byte equality, syntax, scoped patch whitespace, and exact source delivery from port 8790 pass. The validation host loads the real tool with local React and Three.js; this is an isolated local check, not a deployed full-application test.

Review [paired comparison](grid-pair-desktop.png), [unmet-demand chart](grid-pair-unmet-chart.png), [storage chart](grid-pair-storage-chart.png), [battery at minute 120](grid-pair-battery-3d.png), [phone controls](grid-pair-controls-320.png), and [phone selected minute](grid-pair-minute-320.png). Examples: [recorded comparison JSON](grid-pair-investigation.json) and [comparison minutes CSV](grid-pair-minutes.csv). Evidence: [browser results](grid-pair-browser-results.json), [full unit results](grid-pair-vitest-results.json), [integrity checks](grid-pair-integrity.json), and [verification summary](grid-pair-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_grid_pair.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/grid-pair-browser-qa.cjs
node reports/renewables-enhancement/grid-study-browser-qa.cjs
~~~


## Explore periods of change

Within **Grid capacity experiment → Compare two grid cases**, expand **Explore periods of change**. The explorer groups consecutive minutes where B has less or more unmet demand than A, making timing trade-offs visible even when the two cases have equal total unmet energy. A two-lane map separates improvement from worsening; block width represents duration. Filter by direction and order periods by start time, energy impact, or duration. Six period choices appear per page.

Choosing a period moves the comparison cursor to its selected moment: start, largest power difference, or final affected minute. **Show period on comparison chart** switches to unmet demand, outlines the selected period, and focuses the chart. **Inspect period in case A/B** restores the recorded case at that exact moment in the main 3D scene, updating the comparison cursor and simulation minute together. The battery scene is used with a bank and the source scene without one. A period ending at minute 150 includes minute 149; minute 150 is its excluded endpoint and ending storage boundary.

Each period reports avoided or added unmet energy, duration, peak difference, available/unavailable grid minutes, shared demand, and direct generation. An expandable A/B ledger compares grid imports, battery charge/discharge, curtailment, unmet-energy categories, and storage at the start and end. Storage values are boundary measurements, not accumulated energy. Changes throughout are B minus A.

For the zero-PV, 3.75 kW demand example documented above, A uses a 3.75 kW connection with Fixed reserve and B uses 2.5 kW with Save for outages. The new analysis finds worsening at 0–90 minutes (+1.875 kWh), improvement at 120–150 (−1.875 kWh), and worsening at 150–240 (+1.875 kWh). Keeping improvement and worsening separate explains the net +1.875 kWh change. With B's rating increased to 3.125 kW, the net is effectively zero while all three periods remain.

### Accounting and saved analysis

Periods use the paired replay's demand-relative roundoff threshold of one billionth. Unchanged intervals and direction reversals end a period; a change in grid availability alone does not. The terminal endpoint contributes no power or energy. Separate added/avoided totals plus raw changes in remaining intervals reconcile to the sequence's signed energy difference. Energy ranking uses twelve significant digits and start-time tie breaking, preventing accumulation roundoff from rearranging equivalent impacts; exports retain raw values. The existing version-5 dispatch equations remain unchanged.

Saved comparison preferences now include panel visibility, filter, ranking, page, selected period, and inspection moment. Derived periods are recalculated from the recorded cases. Case changes and swapping clear the old period selection, and rerunning the experiment clears its comparison. Identical cases, no demand, and empty filters have explicit empty states.

**Export all change periods CSV** includes every period in chronological order regardless of the filter, signed impact, power peak, energy ledger, boundary storage, availability counts, versions, and both exact recorded settings. No periods produces a header-only CSV. System JSON includes period analysis version 1, effective selection, rules, and saved preferences, including when the panel is closed. The prior comparison-minute CSV is unchanged.


### Change-period validation

**387 tests pass across 17 Renewables files**, including 27 new period tests. These cover hand-calculated opposing periods, equal-net timing trade-offs, interval boundaries, storage boundary accounting, availability changes, demand-relative roundoff and residual reconciliation, tiny values, the terminal endpoint, swaps, empty cases, normalized preferences, stable ranking, exact inspection moments, pagination, saved inputs, CSV provenance, rendered controls, and energy reconciliation across all eight generators.

The period workflow and existing paired-comparison regression pass **46 automated accessibility audits** (24 + 22) against the final source, with no page/console errors or document overflow at 390 and 320 pixels. Browser checks exercise keyboard period selection, all three moments, synchronized comparison/main simulation cursors, exact recorded A/B settings, chart focus/highlighting, the ending interval, filter/rank behavior, ledger presentation, all-period CSV despite filtering, JSON and state restoration, dark mode, swapping, baseline inspection, experiment resets, no-demand/empty-filter cases, a source scene without a bank, and one active renderer. A temporary alternating-irradiance fixture generates 31 real dispatch periods to verify six-item pagination through the last page; production profiles are unchanged.

Visual review covers the desktop explorer, chart highlight, energy and storage ledger, and phone inspection controls. Canonical and desktop sources match byte for byte; syntax and scoped patch whitespace checks pass. Port 8790 serves the exact tested source. These checks use the real tool in an isolated local React/Three.js host; they do not constitute a deployed full-application test.

Review [period explorer](grid-periods-desktop.png), [selected chart period](grid-periods-highlight.png), [period ledger](grid-periods-ledger.png), [3D inspection](grid-periods-battery-3d.png), and [phone selected period](grid-periods-selected-320.png). Examples: [complete period CSV](grid-periods-all.csv), [empty CSV](grid-periods-empty.csv), and [saved comparison JSON](grid-periods-investigation.json). Evidence: [period browser results](grid-periods-browser-results.json), [paired workflow regression](grid-pair-browser-results.json), [full unit results](grid-periods-vitest-results.json), [integrity checks](grid-periods-integrity.json), and [verification summary](grid-periods-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_grid_periods.test.js tests/renewables_grid_pair.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/grid-periods-browser-qa.cjs
node reports/renewables-enhancement/grid-pair-browser-qa.cjs
~~~


## Inspect the 3D assemblies

Every individual mechanism and every source/battery scene in **Storage & demand** now has a shared set of visual inspection controls. **Exploded view** separates the resource, converter, and generator assemblies; labels follow their assemblies. **Assembled view** returns the groups to their original positions. These are schematic assembly separations, not operating distances or engineering cutaways.

**Isolate selected component** hides the other assemblies and surrounding ground/water context. Selecting another component changes the isolated assembly and reframes it. **Focus selected component** frames the chosen assembly with the current camera angle; rotation, zoom, top view, and camera reset remain available. The framing accounts for the scene's actual geometry, labels, and viewport size. A resize reframes an isolated or focused assembly so the phone view remains useful. **Component labels** toggles the in-scene labels without removing the text explanations below.

**Restore full mechanism** restores assembled geometry, visible labels, all assemblies, and the overview. Switching technology resets the inspection controls. A rendering retry retains the current inspection mode, while switching through the energy-flow view starts a fresh 3D view. Controls are disabled while 3D is unavailable, and the existing calculations and flow fallback remain usable.

Inspection is local visual state, like the camera: it does not change recorded settings, source conditions, simulation time, delivered energy, battery state of charge, experiments, or exports. Geometry still responds to source controls, paused time, and live dispatch. Zero sunlight remains absent and wind shutdown remains stopped in inspection views. There is one active renderer; changing inspection mode reuses it, and changing mechanisms disposes the old scene resources.


### 3D inspection validation

The full Renewables suite passes **387 tests across 17 files**. The new inspection workflow and existing individual-workbench regression pass **52 automated accessibility audits** (28 + 24) against the final source, with no page or console errors. The new workflow checks 390px and 320px layouts without document overflow; the workbench regression also checks 390px.

Browser verification captures the real rendered Three.js scene and camera in the test host. It checks assembly positions and visibility, labels following their assemblies, camera framing of selected geometry, picking after separation, restored geometry, unchanged simulation inputs and battery results, one renderer across inspection changes, disposal on mechanism changes, technology resets, zero resource, protective shutdown, context-loss recovery, the energy-flow fallback, and primary/companion/battery scenes in the microgrid. This instrumentation is only in the browser harness. The existing workflow also verifies all eighteen operating scenarios, geometry responses, playback, saved readings, controlled comparisons, exports, and state restoration.

All nine mechanisms were visually reviewed in exploded or isolated views, plus the 320px battery inspection layout. The source and desktop mirror are byte-identical; syntax and scoped whitespace checks pass. The existing port-8790 preview serves the exact tested source. This is local validation in the isolated React/Three.js host, not a deployed full-application check.

Review [exploded PV](inspection-solarPv-exploded.png), [exploded hydropower](inspection-hydro-exploded.png), [isolated generator](inspection-wind-isolated.png), [exploded geothermal](inspection-geothermal-exploded.png), [exploded concentrating solar](inspection-solarThermal-exploded.png), [exploded wave](inspection-wave-exploded.png), [exploded tidal](inspection-tidal-exploded.png), [exploded biomass](inspection-biomass-exploded.png), [exploded storage](inspection-storage-exploded.png), and [phone inspection](inspection-mobile-320.png). Evidence: [inspection browser results](inspection-browser-results.json), [existing workbench regression](energy3d-browser-results.json), [unit results](inspection-vitest-results.json), [integrity checks](inspection-integrity.json), and [verification summary](inspection-verification.json).

~~~powershell
node reports/renewables-enhancement/inspection-browser-qa.cjs
node reports/renewables-enhancement/energy3d-browser-qa.cjs
~~~


## Two-input design maps

Choose **Two-input map** from an individual mechanism's toolbar, or expand **Two-input design map** below the one-input experiment bench. All nine technologies keep their own recorded map. Defaults pair array area with efficiency, rotor size with generator rating, head with efficiency, geothermal temperatures, mirror area with cycle efficiency, wave height with period, fuel throughput with heating value, and battery capacity with power. Any two distinct controls can be selected.

Set each axis's lower and upper values, request 3, 5, or 7 samples per axis, add an optional delivery target, and record a prediction. **Run design map** captures the workbench's complete base inputs, scenario, and inspection time, then calculates the combinations using the existing mechanism model. Values are snapped to each control's steps and deduplicated independently, so the actual grid may contain fewer than the requested 9/25/49 trials. Duplicate axes, invalid ranges, and invalid targets block a new run while preserving the previous result. A target is cleared when switching between power and energy units.

### Read and inspect a map

Columns vary the horizontal input and rows vary the vertical input. Each cell shows its exact sampled output and a bar on the map's shared output scale. Text identifies target status or highest samples. Selecting a cell updates its review panel without changing the workbench. Shortcuts select the first highest-output trial or the first target match in row order; all tied highest outputs and every target match remain available in the matrix. Results apply to sampled combinations and do not establish an optimum or outcomes between cells.

The reference is replayed independently from the captured settings, even when it lies outside the sampled ranges. Trial review includes signed change from the reference, percent change when defined, energy accounting, battery initial/ending storage and unmet scheduled requests, shutdown minutes, and scenario-input clamping. Steady generators measure kW; operating scenarios and batteries measure full-sequence delivered kWh. Inspecting a minute with no output does not turn the full-sequence result into zero.

**Inspect selected map trial in 3D** restores both varied inputs and all other captured settings, the scenario, and the recorded time. **Restore map reference in 3D** restores the reference at that same time. Both use the shared workbench replay action, stop playback, open the 3D view, and focus the workbench. The existing assembly inspection controls remain available.

For example, steady PV at 1,000 W/m² and normal incidence with areas of 10/20/30 m² and efficiencies of 10/20/30% produces a nine-cell map. A 20 m², 20% reference delivers 3.84 kW. Three sampled combinations meet a 5 kW target, and the 30 m², 30% trial delivers 8.64 kW. Battery scenarios keep external offers and requests fixed across combinations. The original two-hour cycle instead uses selected power for both supply and demand. Initial charge is a percentage, so changing capacity can also change initially stored energy; the review reports it explicitly. When an axis varies the base input used by a resource scenario, its prescribed pattern is applied to each trial and effective values can reach the existing input bounds.

### Preserve the experiment

Later workbench changes do not alter the recorded map. Pending map setup changes are labeled separately; rerunning captures the new conditions, resets selection, and clears the old conclusion. Saved state retains each technology's request, prediction, selected trial, conclusion, and panel visibility. Derived results are recomputed from the recorded request.

**Export design map CSV** includes every combination in row order, both axes and units, output/reference/change, target status, highest-sample marker, energy accounting, operating behavior, map and mechanism versions, and exact trial/reference settings as JSON. **Export mechanism investigation** now includes all recorded design maps, their selected trials, captured predictions, and conclusions, even with panels closed. Existing one-input experiments and notebooks remain available.


### Two-input map validation

**417 tests pass across 18 Renewables files**, including 30 new map tests. They cover every technology in steady operation and both native scenarios; variation of only the two chosen controls; power/energy accounting; analytical PV products; axis transposition; snapped and deduplicated samples; the 49-trial bound; invalid axes, ranges, and targets; unit changes; turbine saturation and shutdown; tidal symmetry; full-sequence results at different inspection times; scenario-input clamping; lossless and scheduled battery balances; initial-energy changes; independent references; serialization; CSV provenance; and rendering of saved trials.

The final map workflow and existing one-input experiment regression pass **36 automated accessibility audits** (21 + 15), with no page/console errors or document overflow at 390px or 320px. Browser checks verify keyboard cell selection, reference and trial restoration, 3D inspection from the flow view, captured inputs despite later edits, pending setup, invalid-run protection, target shortcuts, all combinations in CSV, closed-panel JSON, saved-state restoration, conclusion reset on rerun, power/energy target changes, the final scenario endpoint, 49 cells, phone scrolling, dark mode, zero-output ties, control-step deduplication, fixed battery requests, and independent exported maps for all nine technologies. The regression's screenshot selectors now use the original bench's accessible name so the two experiment panels are identified separately.

Visual review covers the desktop controls and PV example, the full 49-trial matrix, the battery map's capacity/power plateau and energy accounting, and 320px controls and selected-trial panel. Source/mirror equality, syntax, scoped whitespace, and exact delivery of the tested source from port 8790 pass. Validation uses an isolated local React/Three.js host, not a deployed full-application check.

Review [desktop map](design-map-desktop.png), [49-trial matrix](design-map-49-trials.png), [3D trial inspection](design-map-inspection.png), [battery design map](design-map-storage.png), [phone controls](design-map-controls-320.png), and [phone selected trial](design-map-selected-320.png). Examples: [PV trial CSV](design-map-pv.csv), [recorded investigation](design-map-investigation.json), and [all nine exported maps](design-map-all-technologies.json). Evidence: [map browser results](design-map-browser-results.json), [one-input regression](experiments-browser-results.json), [full unit results](design-map-vitest-results.json), [integrity checks](design-map-integrity.json), and [verification summary](design-map-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_design_map.test.js tests/renewables_experiments.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/design-map-browser-qa.cjs
node reports/renewables-enhancement/experiments-browser-qa.cjs
~~~


## Four-case explanations for design-map combinations

Each individual workbench now has **Two-input map → Explain this combination** beneath the selected trial. It compares four complete simulations: the recorded reference, the horizontal input changed on its own, the vertical input changed on its own, and both inputs changed together. The single-input cases use the exact recorded reference coordinates, including values outside the sampled grid. Only the two selected inputs vary; the operating scenario and all other base settings remain captured.

Each card reports output, change from reference, target status, and operating behavior. Its **Inspect … in 3D** action restores that case's full settings, scenario, and recorded inspection minute, stops playback, opens the 3D view, and focuses the shared workbench. An explanatory case outside the sampled grid is recognized by the workbench status notice. Steady generators compare kW, while batteries and operating scenarios compare delivered kWh over their full sequence; inspecting the endpoint can correctly show zero instantaneous power while the full-sequence result stays positive.

The extra combined effect is calculated as:

~~~text
horizontal change alone = horizontal-only output − reference output
vertical change alone = vertical-only output − reference output
joint change = both-input output − reference output
extra combined effect = joint change − horizontal change alone − vertical change alone
~~~

The view also compares two actual paths through the four cases: reference → horizontal-only → both, and reference → vertical-only → both. The second step uses the output difference between those complete cases. These are comparison orders, not operating periods. No synthetic intermediate output, attribution model, efficiency, or energy-loss term is introduced. A positive extra effect does not automatically imply an improvement: reducing both factors in a product can produce a positive extra effect while output falls. Near-zero classification uses a tolerance relative to the four modeled outputs; exports retain the exact unrounded values and the tolerance.

For PV at 1,000 W/m² and normal incidence, a 20 m² / 20% reference produces 3.84 kW. Changing area or efficiency alone to 30 yields 5.76 kW; changing both yields 8.64 kW. Each standalone change adds 1.92 kW, the joint change adds 4.8 kW, and the extra combined effect is 0.96 kW. A lossless empty battery can instead show overlapping limits: from 30 kWh capacity / 10 kW power, changing to 10 kWh / 30 kW gives outputs of 10, 10, 30, and 10 kWh and an extra effect of −20 kWh. Native battery scenarios preserve their external offers and requests; fixed initial state of charge can still imply different initial stored energy when capacity changes.

### Explanation state and exports

Opening the view computes only the two additional single-input simulations. Results are memoized by the recorded map and selected trial, so typing an observation or inspecting a case does not rerun the map. An observation of up to 2,000 characters belongs to the selected combination. Selecting a different trial clears it; selecting the same trial preserves it. A new map run clears the explanation and its observation. Collapsing either panel retains the saved explanation. A stale observation whose trial index differs from the current selection is excluded.

**Export four-case comparison CSV** includes all four exact settings, captured profile and minute, map trial, units, output, target status, energy accounting, storage requests and balances, shutdown/clamping behavior, all six effect terms, numerical tolerance, versions, observation, and comparison rules. **Export mechanism investigation** includes freshly recomputed explanations and observations for all technologies with saved explanation state, even with panels closed. Explanation version is 1; the existing mechanism and map versions remain 1. The underlying physical models are unchanged.


### Four-case explanation validation

**447 tests pass across 19 Renewables files**, including 30 new explanation tests. Coverage includes all nine mechanisms under steady conditions and both native scenarios, exact accounting for every case, analytical PV interaction, both comparison orders, axis transposition, opposite and declining inputs, coincident cases, all-zero outputs and a zero reference, complementary and overlapping battery limits, fixed scheduled requests, changing initial stored energy, full-sequence results at different inspection minutes, off-grid reference coordinates, selection bounds, reproducibility, exact CSV provenance, quoted observations, and saved rendering.

The new workflow and the existing design-map regression pass **42 automated accessibility audits** (21 + 21), with no page or console errors and no document overflow at 390px or 320px. They verify four-case 3D inspection across all nine native scenarios, inspection from the energy-flow view, keyboard operation and focus restoration, unchanged live inputs when selecting or explaining a trial, independent recorded settings, recognition of single-input cases outside the grid, coincident and zero-output cases, negative battery interaction, observation clearing/preservation rules, closed-panel exports, reload persistence, and independent saved explanations for all technologies. The original map regression also confirms its 49-trial grid, targets, CSV exports, validation controls, and existing replay behavior.

Desktop PV, dark battery, and 320px battery explanation screenshots were visually reviewed. Both source bundles are byte-identical; syntax and scoped whitespace checks pass; port 8790 serves the tested source. Validation uses an isolated local React/Three.js host, not a deployed full-application check.

Review [desktop explanation](map-explanation-desktop.png), [battery limit comparison](map-explanation-battery.png), [dark comparison](map-explanation-dark.png), and [320px phone layout](map-explanation-320.png). Examples: [four-case PV CSV](map-explanation-pv.csv), [closed-panel investigation](map-explanation-investigation.json), and [all nine explanations](map-explanation-all-technologies.json). Evidence: [new browser workflow](map-explanation-browser-results.json), [existing map regression](design-map-browser-results.json), [full unit results](map-explanation-vitest-results.json), [integrity checks](map-explanation-integrity.json), and [verification summary](map-explanation-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_map_explanation.test.js tests/renewables_design_map.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/renewables-enhancement/map-explanation-browser-qa.cjs
node reports/renewables-enhancement/design-map-browser-qa.cjs
~~~


## Mechanism studio visual refinement

The individual mechanism studio now uses a consistent set of nine inline SVG technology icons, clearer selected cards, a more distinct title and workbench hierarchy, compact view controls, and refined input, timeline, component, and measurement panels. Light and dark themes continue to use the host's existing theme tokens. The primary output card has a stronger visual emphasis; a small meter repeats the model's conversion fraction for generators or state of charge for batteries. Numeric readings remain available as text, and the redundant meter is hidden from assistive technology.

Every shared 3D scene now includes a technology identity and a live electrical-output reading. Battery scenes label this as discharge output. The reading comes directly from the current run, including native scenario and microgrid dispatch results. A transparent WebGL canvas sits over a restrained dark gradient. A warm key light, cool fill light, soft shadows, and a layered, technology-tinted platform improve depth. Numbered component labels use rounded frames and matching accents. Camera coordinates, geometry interactions, model settings, and the underlying physical equations are unchanged.

Rendering still uses one renderer and the existing paused/visible-frame scheduling. Shadow maps are 1,024 pixels per side, with a bounded directional-light camera. Shadow render targets join geometry, material, and texture cleanup when a scene is replaced or retried. Decorative platform layers stay in the existing context group, so isolating a component removes them. Scene titles and output readings stay outside the canvas and do not obstruct picking or camera controls.

The gallery becomes two columns on small screens; camera and assembly controls wrap; live scene readings remain inside the header at 320px even for the largest tested outputs. Existing accessible button names, focus styles, keyboard controls, flow fallback, and reduced-motion behavior remain available.


### Visual refinement validation

**447 tests pass across 19 Renewables files.** The existing mechanism workflow, assembly-inspection regression, and new visual workflow pass **67 automated accessibility audits** (24 + 28 + 15), with no page or console errors. Both 390px and 320px layouts have no document overflow. Nine technology cards use consistent inline icons, and all nine scene headers remain contained at large tested output values. Live scene output, the zero-output state, battery fill, and native-scenario readings are checked against the model.

The mechanism regression covers all nine scenes and eighteen operating programs, input-driven geometry, direct picking, playback, saved readings, exports, persistence, and context recovery. The inspection regression covers exploded transforms, label placement, isolation, focus and camera framing, transformed picking, technology-switch resets, renderer disposal, context retry, flow fallback, and the microgrid's battery and second-source scenes. Camera and assembly operations leave calculation inputs and results unchanged.

Visual review covers the technology gallery, desktop workbench, dark workbench, output cards, and 320px scene. Source and desktop bundles match exactly; JavaScript syntax, scoped whitespace, and port 8790 delivery pass. The previous preview process was no longer available, so the existing preview was restarted on the same port. Validation uses an isolated local React/Three.js host, not a deployed full-application check.

Review [technology gallery](visual-studio-gallery.png), [workbench](visual-studio-workbench.png), [dark workbench](visual-studio-workbench-dark.png), [live measurements](visual-studio-measurements.png), and [phone scene](visual-studio-scene-320.png). Evidence: [visual browser checks](visual-studio-browser-results.json), [mechanism regression](energy3d-browser-results.json), [inspection regression](inspection-browser-results.json), [unit results](visual-studio-vitest-results.json), [bundle integrity](visual-studio-integrity.json), and [verification summary](visual-studio-verification.json).

~~~powershell
node reports/renewables-enhancement/visual-studio-browser-qa.cjs
node reports/renewables-enhancement/energy3d-browser-qa.cjs
node reports/renewables-enhancement/inspection-browser-qa.cjs
~~~


## Interactive energy pathways and balance graphics

Each shared 3D scene now includes a selectable **Trace the conversion** pathway. Its three cards correspond to the resource, converter, and generator assemblies. Selecting a card uses the existing component-selection action, keeping the 3D highlight, component explanation, isolation, and camera focus synchronized. Selection changes the view only. Keyboard activation works through native buttons with pressed states. The cards remain available if WebGL fails, and also appear in the microgrid's source, companion, and battery scenes.

Readings are derived from the current native run. Models with three measured stages show resource, intermediate, and delivered power. Hydropower, geothermal, and wave models use a combined conversion efficiency in the middle card because they do not resolve a separate intermediate power; that limitation is stated beside the percentage. Batteries show charging power in kW, stored energy in kWh, and discharging power in kW, with a unit explanation. Native scenario labels retain their following-minute meaning. Small positive values use scientific notation rather than rounding to zero in the pathway.

The individual workbench's **Follow the energy accounting** panel now contains a proportional energy-balance graphic. Generator bars partition the original resource power into electricity and model-derived remainder terms; they do not count intermediate power a second time. PV separates unconverted resource energy and inverter loss; wind and tidal separate unextracted stream power from the drivetrain/generator and rating remainder; concentrating solar and biomass separate their two modeled conversion stages. Combined models retain a single remainder. These terms do not claim that all remaining resource power is equipment heat loss.

Battery bars account for accumulated energy up to the selected minute: initial energy plus accepted charging equals delivered electricity plus stored energy plus conversion losses. They do not add charging and discharging power to stored energy. At an endpoint the power readings can be zero while the energy chart remains populated. A zero-input balance has an empty bar and unavailable shares. Exact values and shares come from the existing model; bars use their proportional widths without minimum-sized nonzero segments. Text labels, numbers, units, and percentages accompany the redundant visual bar.

The new pathway projection has version 1 and is exposed as renewablesEnergyModel.pathway(run). Existing physics/model versions and saved-state formats are unchanged. The interface reads the active run directly, so no second simulation, new renderer, or saved derived-result cache is introduced. Pathway cards stack on phones, while the balance legend also becomes a single column.


### Pathway validation

**470 tests pass across 20 Renewables files**, including 23 new pathway tests. The full threads run completed 365 tests in 16 files, then reported four worker-startup timeouts for files that had not run. Those four files were retried using the forks pool: all 105 remaining tests passed. The verification summary checks the exact union of the 20 expected files and all 470 assertions; it does not treat the partial initial report as a complete run. No application change was needed for the test-runner retry.

New tests reconcile the chart at every minute in both native scenarios for all nine mechanisms, as well as steady workbenches and microgrid battery dispatch. They cover analytical PV partitioning, combined efficiencies, protective shutdown, generator clipping, zero and tiny resources, tidal reversal, stored-energy versus power units, battery initial energy and losses, absent battery banks, non-mutation, and accessible rendering. The physics remain the existing mechanism models.

The new browser workflow passes **28 automated accessibility audits**, with no page or console errors. It verifies linked component selection for all nine mechanisms, keyboard activation, live readings, exact underlying proportions, isolated and exploded framing, unchanged calculation state, one renderer, native-scenario endpoints, empty balances, shutdown, battery cycle accounting, dark mode, 390px and 320px layouts, context loss and recovery, the flow fallback, and microgrid source and battery scenes. The proportional-width browser assertion allows normal CSSOM decimal serialization rounding; model conservation retains a relative tolerance of 1e-8.

Visual review covers the PV pathway and partition, dark battery accounting, and the 320px pathway and legend. Source and desktop copies match; syntax, scoped whitespace, and exact preview delivery on port 8790 pass. Validation uses an isolated local React/Three.js host, not a deployed full-application check.

Review [PV pathway](pathway-pv.png), [PV power balance](pathway-pv-budget.png), [combined hydro conversion](pathway-hydro.png), [wind shutdown balance](pathway-wind-shutdown.png), [battery readings](pathway-battery.png), [battery energy balance](pathway-battery-budget.png), [dark budget](pathway-budget-dark.png), and [phone pathway](pathway-phone-320.png). Evidence: [browser checks](pathway-browser-results.json), [initial test report](pathway-vitest-results.json), [targeted retry](pathway-vitest-retry-results.json), [bundle integrity](pathway-integrity.json), and [verification summary](pathway-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_energy_pathway.test.js --maxWorkers=1 --pool=forks --testTimeout=30000
node reports/renewables-enhancement/pathway-browser-qa.cjs
~~~


## Guided component inspector

The individual workbenches now have a **Component guide** shortcut and an expanded inspector below the 3D controls. It presents the selected component's existing explanation, its current pathway reading with units, and bounded **Previous component** / **Next component** navigation through the three assemblies. The inspector stays synchronized with component buttons, pathway cards, and direct 3D selection. Component selection in the individual workbench pauses playback at the current position, making the reading stable while the user inspects it.

Each of the 27 components has a focused exploration question. Relevant control links show the user's base input values, explain the role of each input, and focus the corresponding real slider. The inputs panel highlights the same controls; it retains all controls, including those unrelated to the current guide. Links only move focus and pause playback. They do not change settings, scenario, or timeline position. Under an operating scenario the inspector explicitly distinguishes base settings in the links from effective readings at the current minute.

Guides follow the existing models. The PV inverter explains its fixed 96% efficiency and offers no nonexistent inverter control. Hydropower, geothermal, and wave retain the pathway's combined-efficiency reading instead of inventing an intermediate power. The battery inspector keeps kW and kWh distinct and retains the native scheduled-supply and demand explanations in operating scenarios. Its questions distinguish capacity, initial energy, power limits, and conversion loss.

**Record an observation** focuses the existing investigation notebook without replacing its contents. Guide navigation preserves keyboard focus, announces the current step, disables navigation at the ends, and works in the energy-flow view or while WebGL is unavailable. It reuses the current run, selection, and renderer; model versions and saved-state formats are unchanged. The inspector, control links, and navigation adapt to phone widths and host light/dark themes.
### Guided inspector validation

**470 tests pass across 20 Renewables files** in one full run using the forks pool. The browser workflow checks all **27 component guides and 45 input links**, with **19 automated accessibility audits** reporting no violations and no page or console errors.

Behavior checks cover bounded previous/next navigation, keyboard focus, related-control highlighting, unchanged settings and timeline position after input jumps, observation text preservation, live readings, pause on component selection, base versus effective scenario values, fixed inverter efficiency, combined-efficiency and battery readings, isolated and exploded selection, the energy-flow fallback, WebGL recovery, and a single renderer. At 390px and 320px, the document has no horizontal overflow and linked controls remain visible when focused.

Visual review covers the desktop PV inspector, highlighted input controls, dark battery guide, and 320px layout. Source and desktop bundles are byte-identical; syntax, scoped whitespace, and exact preview delivery on port 8790 pass. Validation uses an isolated local React/Three.js host, not a deployed full-application check.

Review [PV guide](component-guide-pv.png), [highlighted controls](component-guide-inputs.png), [dark battery guide](component-guide-dark.png), and [320px inspector](component-guide-320.png). Evidence: [browser workflow](component-guide-browser-qa.cjs), [browser results](component-guide-browser-results.json), [full test report](component-guide-vitest-results.json), [bundle integrity](component-guide-integrity.json), and [verification summary](component-guide-verification.json).

~~~powershell
node reports/renewables-enhancement/component-guide-browser-qa.cjs
~~~

## Component baseline comparisons

The component inspector now compares the selected assembly against the first saved reading for that technology. **Save a baseline** captures the current inputs, scenario, meaningful time, name, and observation using the existing notebook. It pauses playback and returns keyboard focus to the inspector after the save. Once a baseline exists, **Open saved readings** focuses the notebook without changing inputs, time, or notes. Promoting a different saved reading updates the component comparison immediately.

The baseline and current bars use one shared scale within the selected component. Exact readings accompany each bar, and the signed difference is current minus baseline. Both zero readings produce empty bars; tiny nonzero readings retain scientific notation. The bars do not compare unlike units across components or imply that a greater value is always preferable. Combined efficiencies use **percentage points** for their difference, while battery-cell readings remain in **kWh** and inlet/outlet readings remain in **kW**.

The comparison names both operating contexts and distinguishes matching inputs, one changed input, several changed inputs, and changes of scenario or meaningful time. A disclosure lists the captured base-input differences. The existing comparison rules continue to ignore illustrative animation position for steady generators while treating battery-cycle and scenario minutes as meaningful. Models, public APIs, and saved-state formats are unchanged.

The view works across all 27 components, light/dark themes, the energy-flow fallback, and WebGL recovery. The browser workflow also caught and fixed wrapping of long saved-reading names in the notebook; the names now remain readable without expanding the page at phone widths.

### Component comparison validation

**487 tests pass across 21 Renewables files**, including 17 new comparison tests. The full run passed 486 assertions and hit one 10-second setup-hook timeout in the microgrid file. The complete file passed all 23 tests on a targeted rerun with a 60-second hook allowance. Verification checks the union of all 21 expected files and 487 assertions without counting retry assertions twice. No application change was needed for the retry.

The browser workflow validates baseline capture and preservation, all 27 component comparisons, proportional bars, positive/negative/zero differences, percentage-point and battery units, changed scenarios and minutes, multiple changed inputs, baseline promotion, keyboard focus, playback pausing, retained notes, long names, the flow fallback, and WebGL recovery with one active renderer. **20 automated accessibility audits** report no violations; page and console errors are empty. The 390px and 320px layouts have no document overflow.

Visual review covers the desktop PV comparison, the 320px battery inspector, and the dark battery view. Source, desktop mirror, and preview bytes match; syntax and scoped whitespace checks pass. Validation uses the isolated local React/Three.js host, not a deployed full-application check.

Review [PV comparison](component-comparison-pv.png), [operating-context comparison](component-comparison-context.png), [percentage points](component-comparison-efficiency.png), [dark battery comparison](component-comparison-dark.png), and [320px inspector](component-comparison-320.png). Evidence: [browser workflow](component-comparison-browser-qa.cjs), [browser results](component-comparison-browser-results.json), [full test report](component-comparison-vitest-results.json), [setup-timeout retry](component-comparison-vitest-retry-results.json), [bundle integrity](component-comparison-integrity.json), and [verification summary](component-comparison-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_component_comparison.test.js --pool=forks --maxWorkers=1 --testTimeout=30000
node reports/renewables-enhancement/component-comparison-browser-qa.cjs
~~~

## Scenario milestone explorer

All 18 individual-mechanism operating scenarios now show an **Explore the turning points** panel beneath the timeline. Previous/next buttons and a labeled milestone selector move the existing timeline to a precise minute and pause playback. The selected 3D component, camera mode, base inputs, observations, and saved baseline are retained. Steady generators and the original battery cycle keep their existing timeline without this scenario-specific panel.

Milestones combine the scenario start/end, prescribed resource points or battery request boundaries, every modeled status change, entries/exits from resource control bounds, battery demand-shortfall boundaries, and the first highest/lowest sampled output minutes when output varies. Reasons that coincide share one chronologically ordered milestone. The new renewablesEnergyModel.milestones(study) projection has version 1 and derives its results from an existing complete native scenario study.

Each interval is half-open: its start minute is included and the next milestone minute is excluded. Its energy values come from differences in the scenario's cumulative ledgers. The panel shows delivered energy, duration, and either input resource energy or unmet battery demand. Battery intervals also show starting and ending stored energy. When the timeline is between milestones, the text explicitly identifies the current minute and states that the totals describe the entire interval. At the final endpoint, the panel shows full-scenario delivery and duration and explains that no additional operating minute or energy is added.

The timeline strip uses proportional interval widths and a marker for the current minute; it is redundant with the textual controls and readings. Native keyboard controls, wrapped layouts at phone widths, and host light/dark colors remain available. The explorer operates independently of WebGL and uses the current scenario calculation rather than creating another simulation or renderer.

Peak/low metadata now treats relative differences of at most 1e-12 as numerical ties and retains their first minute. This prevents floating-point interpolation at a flat resource boundary from moving the lowest-output shortcut one minute later. The same metadata feeds existing peak/low shortcuts and milestone selection. Power samples, integrated energy, physical equations, model version, and saved-state formats are unchanged; tiny nonzero resources retain real extrema because the tie tolerance is relative to the compared values.

### Milestone explorer validation

**510 tests pass across 22 Renewables files** in one complete run, including 23 new milestone tests. New checks reconcile every interval against minute-level power and the existing energy ledgers in all 18 scenarios, with default, minimum, and maximum control settings. They cover analytical PV intervals, wind shutdown and recovery, input-driven milestone changes, resource clipping, battery requests and stored-energy changes, shortfalls at zero battery power, constant zero output, numerical ties and tiny resources, tidal reversals, duplicate reasons, non-mutation, unsupported inputs, and endpoint rendering.

The browser workflow verifies **116 milestone jumps across all 18 scenarios**, plus **28 automated accessibility audits**, with no page or console errors. It checks previous/next bounds, native keyboard selection, playback pausing, unchanged inputs/notes/baselines, accurate interval scope, proportional timeline widths, live input-driven recomputation, 3D measurement synchronization, isolated/exploded selection, zero-resource scenarios, final endpoints, the flow fallback, and context recovery with one active renderer. The 390px and 320px layouts have no document overflow.

Visual review covers wind shutdown, the 320px battery interval, dark battery shortfall, and the final endpoint. Source, desktop mirror, and preview bytes match. Syntax and scoped whitespace checks pass. Validation uses the isolated local React/Three.js host, not a deployed full-application check.

Review [wind shutdown](milestones-wind-shutdown.png), [battery shortfall](milestones-battery.png), [dark milestone view](milestones-dark.png), [320px interval](milestones-320.png), and [final endpoint](milestones-endpoint.png). Evidence: [browser workflow](milestones-browser-qa.cjs), [browser results](milestones-browser-results.json), [test report](milestones-vitest-results.json), [bundle integrity](milestones-integrity.json), and [verification summary](milestones-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_milestones.test.js --pool=forks --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node reports/renewables-enhancement/milestones-browser-qa.cjs
~~~

## Custom scenario intervals

The milestone explorer now includes a collapsed **Measure a custom interval** panel for all 18 native scenarios. Start/end sliders choose any ordered pair of whole minutes. **Use current minute as start/end** captures the active timeline position and moves the other boundary if necessary to keep the interval ordered. **Inspect interval start/end** pauses playback and moves the existing 3D timeline without changing inputs or the selected component. Shortcuts select the current milestone interval or the full scenario.

The panel reports delivered energy, average electrical output, input resource energy or unmet battery demand, and the complete energy balance. Its component table compares readings at both boundaries, including signed differences and percentage-point changes for efficiencies. Battery cell readings remain kWh; resource and electrical power readings remain kW. An optional operating-state table groups the selected minutes by modeled state and reports their electricity, with separate counts for resource clipping and battery shortfall minutes.

Component differences within a relative tolerance of 1e-12 are displayed as zero to suppress numerical ties at flat scenario boundaries. Tiny genuine changes remain measurable because the tolerance scales with the boundary readings.

The interval includes its start minute and excludes its end minute. A final endpoint is a boundary reading rather than an extra operating interval. For equal boundaries, every energy total is zero and average power is undefined. Battery accounting starts from energy stored at the selected start minute, rather than reusing the scenario's original initial charge. The selected range graphic is proportional to the full scenario duration, with the current timeline position shown independently.

The new renewablesEnergyModel.interval(study, selection) projection, version 1, reads an existing complete native scenario. Endpoints are bounded, floored, and sorted; invalid saved values fall back to the full scenario bounds. Energy is summed directly from the selected minute samples, using existing accepted power and conversion efficiency, rather than subtracting two large cumulative totals. This retains precision for very small intervals late in a long scenario. No second physical simulation is introduced, and the underlying mechanism samples and equations remain unchanged.

Selections and the panel's open state are stored separately for each technology and scenario in energyLab.intervals. They follow current scenario inputs; they are not frozen experimental results. Existing sessions without this optional field continue to work. **Export this interval** downloads the existing mechanism investigation with a recalculated operatingScenario.selectedInterval, including the selected bounds, base inputs, component differences, ledgers, and state totals. Old saved derived values are not trusted. Existing notebook notes, baseline readings, and other technology settings are preserved.

### Custom interval validation

**532 tests pass across 23 Renewables files**, including 22 new interval tests. The full forks run completed 456 tests in 20 files, but three workers timed out before loading their files. A targeted forks retry passed 53 tests in the grid-limit and resilience files; the microgrid worker again failed to start. Its final targeted threads run passed all 23 tests. The verification script checks the exact union of the 23 expected files and all 532 assertions without counting retry assertions twice. No application changes were made for these runner retries.

New tests reconcile arbitrary, full, reversed, and zero-duration windows in all 18 scenarios, including control extremes, analytical cloud-crossing energy, signed component differences, percentage-point units, battery start-of-interval storage, final endpoints, repeated operating states, invalid saved bounds, tiny resources, numerical ties, non-mutation, and serialized selections.

The browser workflow passes **27 automated accessibility audits**, with no page or console errors. It checks editing and inspection in every scenario, keyboard sliders, playback pausing, endpoint pinning, independent timeline position, per-scenario and serialized selections, preserved inputs/notes/baselines, live recalculation, proportional range display, component values, operating-state totals, zero-duration intervals, isolated/exploded selection, the flow fallback, and WebGL recovery with one active renderer. Solar, battery, and empty-interval downloads match the displayed analysis. The 390px and 320px layouts have no document overflow; wide comparison tables remain keyboard-scrollable within their own regions.

Visual review covers desktop PV, phone battery, and dark battery analyses. Source and desktop bundles match the local preview exactly; syntax and scoped whitespace checks pass. Validation uses an isolated local React/Three.js host, not a deployed full-application check.

Review [PV interval](intervals-pv.png), [battery interval](intervals-battery.png), [dark analysis](intervals-dark.png), [320px analysis](intervals-320.png), and [empty interval](intervals-empty.png). Evidence: [browser workflow](intervals-browser-qa.cjs), [browser results](intervals-browser-results.json), [initial tests](intervals-vitest-results.json), [first targeted retry](intervals-vitest-retry-results.json), [microgrid retry](intervals-vitest-microgrid-results.json), [bundle integrity](intervals-integrity.json), [verification summary](intervals-verification.json), and [verification script](intervals-verify.cjs).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_intervals.test.js --pool=forks --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node reports/renewables-enhancement/intervals-browser-qa.cjs
node reports/renewables-enhancement/intervals-verify.cjs
~~~


## Fitted 3D camera views

All nine individual mechanisms and the shared microgrid source, companion, and battery scenes now offer **Isometric view**, **Front view**, **Side view**, and **Top view**. These use consistent model axes, refit the current mechanism or focused component, and retain assembled, exploded, isolated, and label preferences. The new default is a true isometric direction. The overhead camera uses an explicit up vector to remain stable at exactly 90 degrees.

**Tilt up** and **Tilt down** complement horizontal rotation and pointer orbit. A compact orientation graphic displays the model axes, active standard view or free orbit, and angles around/above the model. Standard-view buttons expose their active state to assistive technology. **Fit mechanism** removes a component focus while retaining the camera direction; within an isolated view it fits that assembly. **Reset camera** returns to the fitted isometric direction. Resizing also refits the current visible scope.

Fitting includes the camera-facing corners of label sprites, so side and overhead views account for their actual screen dimensions. Labels are bounded within the viewport and separated when their projected rectangles overlap; displaced annotations get connector lines back to their original anchors. These use the existing renderer and normal disposal lifecycle. The standard fitted views remain readable with all three annotations; deliberate extreme zoom can still exceed the viewport and can be recovered with **Fit mechanism**.

Camera state is transient and never changes mechanism inputs, scenario time, or simulation calculations. Model axes and illustrative angles are explicitly identified in the interface. Parameter edits retain the chosen camera direction; use a preset or **Fit mechanism** to reframe a changed mechanism. Component buttons and the energy-flow fallback remain available when WebGL is unavailable. A WebGL retry restores the inspection layout with a fresh fitted isometric camera.

### Camera validation

**99 existing regression tests pass across four relevant files**, covering individual energy models and integration, pathway accounting, microgrid dispatch, and form-control accessibility. The camera work does not change physics equations or persisted investigation schemas.

The real Chromium/Three.js workflows pass **20 accessibility audits** with no page or console errors. Geometric assertions cover all four camera directions across nine assembled and exploded mechanisms, all 27 isolated components, label bounds and overlap, focus retention, fit/reset, manual tilt/orbit, pointer drag, zoom, extreme mechanism dimensions, and resize behavior. Displaced annotations were observed in 45 checked frames. Separate projected clicks select the inverter correctly from every standard camera view. Empty sunlight and recovery, focused phone inspection, flow fallback, actual WebGL context loss/retry, and all three microgrid scene choices also pass.

The 390px and 320px layouts have no document overflow. Visual review covers the desktop isometric workbench and the phone overhead view. Only one live renderer is retained, with disposal on mechanism changes and retries. Both JavaScript bundles and the code served at the local preview match exactly. Syntax and scoped whitespace checks pass. Browser validation uses an isolated local React/Three.js host; it is not a deployed full-application test.

Review [isometric PV](camera-pv-isometric.png), [side-view PV](camera-pv-side.png), [front-view hydro](camera-hydro-front.png), [dark camera controls](camera-dark.png), [320px overhead view](camera-phone-320.png), and [focused phone view](camera-phone-focused.png). Evidence: [browser workflow](camera-browser-qa.cjs), [camera results](camera-browser-results.json), [picking workflow](camera-picking-qa.cjs), [picking results](camera-picking-results.json), [regression results](camera-vitest-results.json), [bundle integrity](camera-integrity.json), and [verification summary](camera-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_energy3d.test.js tests/renewables_energy_pathway.test.js tests/renewables_microgrid.test.js tests/renewables_form_controls_a11y.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/camera-browser-qa.cjs
node reports/renewables-enhancement/camera-picking-qa.cjs
~~~


## Live readings on 3D components

All nine mechanisms now display each component's current reading directly on its 3D label. Labels use the existing energy pathway values and explicitly name their meaning: resource or electrical power in kW, combined conversion efficiency in percent for models without a separate intermediate-power stage, and stored battery energy in kWh. They update with input edits, scenario minutes, battery operation, and shared microgrid dispatch. No new physics calculation or persisted investigation field is introduced.

The selected component's label uses the same light highlight as its pathway button. Clicking a visible label selects its component, including a zero-resource component whose geometry is hidden. Selection in the individual workbench pauses playback, just like the existing component buttons. Label picking takes precedence over geometry behind the label. Hidden labels cannot intercept clicks. Mouse hover indicates selectable content, and touch taps also select labels; the existing component buttons remain the keyboard and screen-reader equivalent.

**Live readings** switches between names with values and compact names-only labels. Changing this option reveals labels if they were hidden. **Component labels** hides or shows the annotations independently. **Restore full mechanism** restores live readings, labels, and the assembled view. These preferences are transient, reset on technology changes, and survive WebGL retries within the same scene.

Labels retain their camera-facing orientation and connector lines. Placement first keeps labels near their anchors, then rearranges the visible set if local spacing cannot separate them. Their maximum screen width is 220px with live readings or 180px for names only, also bounded to 62% of the viewport width. This keeps close side views from covering the mechanism with enlarged labels. Tightly packed or deliberately zoomed views can further reduce label size; the larger pathway readings remain available immediately below the scene.

Each label retains a single canvas and texture. Only changed displayed text or selection styling triggers a texture update. Camera movement and value changes hidden by names-only mode do not upload new label pixels. Textures are disposed with the existing scene lifecycle when switching mechanisms or leaving 3D.

### Live label validation

**114 regression tests pass across four relevant files**, covering mechanism models and integration, pathway accounting, component comparisons, and microgrid dispatch. The real Chromium/Three.js workflows pass **19 accessibility audits** with no page or console errors.

Browser checks read the actual strings painted into each label canvas and reconcile them against current pathway readings for all 27 components and all 18 scenarios, including start, intermediate, and final minutes. They cover direct label selection, selected colors, every standard camera view, exploded and isolated inspection, compact and hidden annotations, scenario playback pausing, zero sunlight, protective wind shutdown, battery energy, shared microgrid scenes, dark mode, and actual WebGL context loss/retry.

Texture identities remain stable across edits and inspection changes. Camera movement does not trigger redundant uploads, unaffected stages retain their texture versions, and names-only labels avoid repaints when hidden numeric values change. Separate edge checks verify touch selection, ignored hidden-label hits, and disposal of all three annotation textures on technology and flow-view changes. The 390px and 320px layouts have no document overflow. Visual review covers the desktop and phone workbench and the crowded wave side view; the latter prompted the final screen-size cap.

The canonical JavaScript, desktop bundle, and local preview match exactly. Syntax and scoped whitespace checks pass. Browser validation uses an isolated local React/Three.js host rather than a deployed full-application session.

Review [live PV readings](live-labels-pv.png), [shutdown readings](live-labels-shutdown.png), [stored energy](live-labels-battery.png), [dark scene](live-labels-dark.png), [320px inspection](live-labels-phone-320.png), and [wave side view](live-labels-wave-side.jpg). Evidence: [browser workflow](live-labels-browser-qa.cjs), [browser results](live-labels-browser-results.json), [edge workflow](live-labels-edges-qa.cjs), [edge results](live-labels-edges-results.json), [regression results](live-labels-vitest-results.json), [verification summary](live-labels-verification.json), and [verification script](live-labels-verify.cjs).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_energy3d.test.js tests/renewables_energy_pathway.test.js tests/renewables_microgrid.test.js tests/renewables_component_comparison.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/live-labels-browser-qa.cjs
node reports/renewables-enhancement/live-labels-edges-qa.cjs
node reports/renewables-enhancement/live-labels-verify.cjs
~~~


## Precise input editing and undo

All **35 input controls across the nine individual mechanisms** now pair a slider with a numeric entry field. Numeric drafts do not change the simulation until Enter or blur commits the value. Escape restores the current input without applying the draft. Decimal and scientific-notation values are accepted within each existing model range; empty or non-finite entries retain the current value. Out-of-range entries clamp to the nearest supported boundary with an explanatory message. Each control shows its range and units, and numeric fields have distinct accessible names and descriptions.

Sliders remain synchronized with fractional values instead of silently snapping them to their former coarse steps. Arrow keys retain each control's original increment; Shift+Arrow uses one tenth of that increment. Home and End choose the supported limits, and Page Up/Down move by ten normal increments. Small floating-point artifacts from keyboard arithmetic are rounded to 14 significant digits. Physics equations, parameter bounds, and scenario definitions remain unchanged.

**Undo last input change** restores the previous value of the last adjusted control. A continuous pointer drag or held-arrow gesture is grouped into one adjustment. Each technology keeps its own most recent undo within the current workbench session. The accompanying text states which input and value will be restored. No-op edits do not replace a useful undo. Undo is disabled if a different action has replaced the relevant settings, and resetting inputs clears that technology's undo. This transient UI history is not included in saved investigations.

Applying or undoing a changed input pauses playback while retaining the selected scenario and minute. In a scenario, the number field edits the baseline setting; the scene and results continue to show the prescribed conditions at the selected minute. Battery changes recalculate the same schedule or cycle from its original starting state. Existing component-guide links still focus the real slider. Numeric entry and undo also work in the energy-flow view and while WebGL is unavailable. The shared microgrid input panel is unchanged.

### Precise input validation

**93 regression tests pass across four relevant files**, covering individual energy models and integration, energy-pathway accounting, component comparisons, and form accessibility. The Chromium/Three.js browser workflow passes **15 accessibility audits**, with no page or console errors.

Every one of the 35 controls was edited to a fractional value, checked against the model and slider, and restored with undo. Additional checks cover draft isolation, Enter/blur application, cancellation, blank input, scientific notation, both range boundaries, normal/fine slider keys, Home/End/Page Down, grouped held-key and pointer gestures, no-op entries, independent technology histories, stale-history invalidation, scenario/minute preservation, playback pausing, guide-link focus, and battery recalculation. Existing renderer instances survive these edits.

The 390px and 320px layouts have no document overflow. Dark mode, the flow fallback, and actual WebGL context loss/retry also pass. Visual review covers the wind input panel and 320px battery controls. Source and desktop bundles match the local preview byte-for-byte; syntax and scoped whitespace checks pass. Browser validation uses an isolated local React/Three.js host rather than a deployed full-application session.

Review [wind inputs](precise-inputs-wind.jpg), [dark inputs](precise-inputs-dark.jpg), [390px controls](precise-inputs-phone-390.jpg), and [320px controls](precise-inputs-phone-320.jpg). Evidence: [browser workflow](precise-inputs-browser-qa.cjs), [browser results](precise-inputs-browser-results.json), [regression results](precise-inputs-vitest-results.json), [verification summary](precise-inputs-verification.json), and [verification script](precise-inputs-verify.cjs).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_energy3d.test.js tests/renewables_energy_pathway.test.js tests/renewables_component_comparison.test.js tests/renewables_form_controls_a11y.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/precise-inputs-browser-qa.cjs
node reports/renewables-enhancement/precise-inputs-verify.cjs
~~~


## Reopen exported mechanism readings

**Open reading from file** in the individual mechanism workbench opens a local mechanism investigation JSON export. A preview lists the exported current setup and each supported notebook reading. It shows the selected technology, operating scenario, saved timeline position, and three component readings recalculated by the current model. Expand **Review saved inputs and observation** to see the exact saved input values and observation. Choose **Open selected reading** to apply that entry, or cancel to return focus to the file-opening button without changing the workbench.

Opening applies the chosen technology's inputs, scenario or cycle position, reading name, and draft observation, selects that technology in 3D, pauses playback, and clears its transient input undo. Existing notebook readings, other technologies, experiments, maps, intervals, and microgrid work remain intact. This opens one reading; it does not restore every experiment or replace the complete investigation. The preview explains which current draft values will be replaced and suggests saving the current reading first.

New mechanism exports include a stable format identifier and the current reading name. Existing version-1 mechanism exports remain supported through their title. Saved result fields and scenario totals are ignored: calculations use validated inputs only. Every required input must be a finite number within its existing supported range, and native scenarios and timeline positions must be recognized. Unsupported entries are skipped with reasons when another valid entry can be opened. Unrelated files, unsupported versions, empty valid collections, invalid JSON, and files over 8 MiB produce an inline error without changing saved work. Names longer than 60 characters and observations longer than 3,000 characters are shortened with a visible explanation. Async reads that were cancelled or superseded cannot reopen a stale preview.

### File-opening validation

**97 regression tests pass across three files**, including 29 new import and preservation tests. Real Chromium workflows reopen fractional inputs for all nine technologies and reconcile the resulting output against the model. Checks cover the native file chooser, export/open round trips, saved notebook selection, three legacy exports, scenario minutes, playback pausing, preservation of existing entries and other inputs, cancellation, focus, invalid and oversized files, literal rendering of imported text, skipped entries, and cancelled or superseded file reads. Opening from the flow view returns to the 3D workbench.

**Nine accessibility audits pass**, covering the desktop preview, expanded review, dark theme, 390px and 320px layouts, three error states, and the flow-view preview. No browser page or console errors were recorded. Both phone widths avoid document overflow. Visual review covers the desktop preview and a narrow dark preview with a long filename and observation. Source, desktop bundle, and local preview match byte-for-byte; syntax and scoped whitespace checks pass. Browser validation uses an isolated local React/Three.js host rather than a deployed full-application session.

Review [desktop preview](file-readings-desktop.jpg), [dark preview](file-readings-dark.jpg), and [320px stress case](file-readings-phone-320.jpg). Evidence: [browser workflow](file-readings-browser-qa.cjs), [browser results](file-readings-browser-results.json), [regression results](file-readings-vitest-results.json), [verification summary](file-readings-verification.json), and [verification script](file-readings-verify.cjs).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_file_readings.test.js tests/renewables_energy3d.test.js tests/renewables_component_comparison.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/file-readings-browser-qa.cjs
node reports/renewables-enhancement/file-readings-verify.cjs
~~~


## Compare the complete energy pathway

The investigation notebook now shows a **Comparison baseline** chooser whenever a technology has multiple saved readings. Selecting a reading moves it to the pinned baseline position and immediately updates both the notebook and component comparisons. Selection pauses playback and preserves workbench inputs, the selected time, draft name and observation, and every saved reading. The existing **Use as baseline** action in saved-input details uses the same behavior. The chooser keeps its name-based order while the baseline changes, so arrow keys can traverse every reading. The saved-readings table marks the baseline, and the chosen order persists through technology changes and exports. New saves retain the pinned baseline and the two most recent comparison slots; removing the baseline makes the next remaining entry the baseline.

**Follow the difference through each stage** compares all three mechanism components at once. Each stage includes baseline/current values, a signed difference, and two bars sharing a scale within that stage. Stage scales are independent, with an explicit explanation. Combined conversion differences use percentage points; the battery stage compares stored kWh while charging and delivery stages compare kW. Zero values have empty bars, and small nonzero differences use scientific notation. Baseline/current operating context and the existing controlled-comparison verdict keep scenario or time changes visible.

**Inspect this stage** selects that component and focuses its explanation, keeping the current workbench inputs. These links work in both the 3D and energy-flow views. All nine technologies and 18 prescribed operating scenarios use the same comparison presentation.

Percentage comparisons now support any positive baseline instead of treating small positive values as zero. Non-finite ratios remain unavailable, true zero baselines retain their explicit explanation, and signed changes of at least one million use scientific notation. Long baseline names wrap. An additional layout check caught an extremely small baseline producing hundreds of percentage digits; the final formatting keeps that case within desktop and phone layouts.

### Pathway comparison validation

**115 regression tests pass across four files**, including 18 focused pathway tests alongside existing mechanism, component-comparison, and file-opening checks. Browser checks reconcile all three stages against recalculated model values for nine technologies and all 18 native scenarios, and exercise all 27 component links. Actual notebook actions verify baseline switching without restoring inputs, pin retention during new saves, note preservation, technology switching, restore/removal, the existing detail action, scenario playback pausing, and exported comparison consistency.

**18 accessibility audits pass** across the main and edge workflows. The main browser workflow records no page or console errors. Desktop, dark theme, 390px and 320px layouts were checked, including zero/tiny output, an extreme positive percentage, a 60-character unbroken name, and phone baseline selection. All tested widths avoid document overflow. Visual review covers the desktop comparison and dark 320px comparison. Source and desktop copies match the local preview byte-for-byte; syntax and scoped whitespace checks pass. These checks use an isolated local React/Three.js host rather than a deployed full-application session.

Review [desktop comparison](pathway-comparison-desktop.jpg), [scenario comparison](pathway-comparison-scenario.jpg), [dark comparison](pathway-comparison-dark.jpg), [320px comparison](pathway-comparison-phone-320.jpg), and [phone baseline chooser](pathway-comparison-phone-chooser.jpg). Evidence: [browser workflow](pathway-comparison-browser-qa.cjs), [browser results](pathway-comparison-browser-results.json), [edge workflow](pathway-comparison-edges.cjs), [edge results](pathway-comparison-edge-results.json), [regression results](pathway-comparison-vitest-results.json), [verification summary](pathway-comparison-verification.json), and [verification script](pathway-comparison-verify.cjs).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_pathway_comparison.test.js tests/renewables_energy3d.test.js tests/renewables_component_comparison.test.js tests/renewables_file_readings.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/pathway-comparison-browser-qa.cjs
node reports/renewables-enhancement/pathway-comparison-edges.cjs
node reports/renewables-enhancement/pathway-comparison-verify.cjs
~~~


## 3D handover safety and recoverable failures

Switching technologies can publish new React props before the previous scene's effect has been cleaned up. A browser reproduction caught the outgoing hydropower scene applying another technology's inputs to its penstock geometry, producing invalid coordinates inside Three.js curve calculations. The render loop now checks the scene's technology identity before updating geometry. Camera actions, picking, and resize callbacks also ignore obsolete or failed scene instances. Picking skips a zero-size viewport. A scene identity marker is cleared when setup begins and set only after a successful render, allowing browser checks to wait for the actual replacement scene.

Rendering and component-picking failures now stop the scene's animation loop and show the existing **Retry mechanism 3D** recovery controls. Calculations and input editing remain available. Retry rebuilds the scene from the current workbench state and disposes the previous renderer and geometry. Actual WebGL context loss uses the same failure state. Returning through the energy-flow view also builds a fresh scene. Workbench settings and saved notebook readings survive these recovery paths.

The previously interrupted comparison verification is complete, including keyboard baseline selection through the native Windows chooser. The test explicitly commits the native menu selection before waiting for browser animation frames. Accessibility checks resolve offscreen inherited styles before inspecting colors; no accessibility rules are excluded.

### Handover and recovery validation

**115 regression tests pass**, and the comparison, edge, and recovery workflows pass **19 accessibility audits** on the final source. The complete comparison workflow verifies all nine technologies, 18 operating scenarios, 27 component links, baseline selection, exports, and keyboard navigation. Recovery checks inject rendering and picking failures, trigger real WebGL context loss, edit an input while 3D is unavailable, retry each failure, and retain a saved reading and observation.

Eighteen technology switches produce no invalid pipe geometry. All four camera presets work after recovery. Exactly one renderer remains active in the open workbench after 21 creations and 20 disposals. Recovery and comparison workflows record no page or console errors. Source and desktop copies match the running local preview byte-for-byte; syntax and scoped whitespace checks pass. These are isolated local React/Three.js browser checks rather than a deployed full-application session.

Review [recovery controls](scene-recovery-fallback.jpg). Evidence: [recovery browser workflow](scene-recovery-browser-qa.cjs), [recovery results](scene-recovery-browser-results.json), [combined verification](scene-recovery-verification.json), and [verification script](scene-recovery-verify.cjs).

~~~powershell
node reports/renewables-enhancement/scene-recovery-browser-qa.cjs
node reports/renewables-enhancement/pathway-comparison-verify.cjs
node reports/renewables-enhancement/scene-recovery-verify.cjs
~~~


## Recover the last notebook change

Each technology now has an **Undo notebook change** action beside **Save mechanism reading**. It restores the notebook before the last save, removal, or baseline change. Saving a fourth reading can be undone to recover the comparison displaced by the three-reading limit; updating an existing reading can be undone to recover its saved name and observation. An identical save preserves the existing undo action.

Undo changes only that technology's saved readings. Current inputs, timeline position, operating scenario, draft name and observation, other technologies, experiments, and design maps remain intact. Restoring a workbench reading or opening a file does not consume notebook history. Input undo remains independent. Saving, removing, baseline selection, and undo pause playback. Histories are local to the open mechanism workbench, contain one reversible change per technology, and are neither exported nor persisted across a reload. External notebook replacements invalidate stale history, including changes to inactive technologies.

Removing a reading focuses the undo button so it is immediately reachable by keyboard. Undo focuses the notebook heading after the button becomes disabled. An action-specific hint and live status explain what is recoverable and what was restored.

### Notebook undo validation

**115 regression tests pass across four files.** A browser workflow passes **25 behavior checks**, including the first save, duplicate saves, removing the sole reading and the pinned baseline, both baseline controls, eviction at the reading limit, updating saved text, preserving later input edits and draft observations, restoring and file-opening workbench settings, independent technology histories, stale external replacements, playback pausing, flow-view undo, and export consistency. Saved native scenario readings are removed and recovered for all nine technologies with their inputs and selected minutes intact.

**Seven accessibility audits pass** across pending and restored states, the flow view, dark theme, and 390px/320px layouts. No browser page or console errors were recorded. Phone layouts avoid document overflow; the saved-readings table retains its existing horizontal scroll region. Desktop and dark 320px screenshots were visually reviewed. Canonical source, desktop copy, and running preview match byte-for-byte; syntax and scoped whitespace checks pass. Validation uses an isolated local React/Three.js host rather than a deployed full-application session.

Review [desktop notebook](notebook-undo-desktop.jpg), [dark notebook](notebook-undo-dark.jpg), and [320px notebook](notebook-undo-phone-320.jpg). Evidence: [browser workflow](notebook-undo-browser-qa.cjs), [browser results](notebook-undo-browser-results.json), [regression results](notebook-undo-vitest-results.json), [verification summary](notebook-undo-verification.json), and [verification script](notebook-undo-verify.cjs).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_pathway_comparison.test.js tests/renewables_energy3d.test.js tests/renewables_component_comparison.test.js tests/renewables_file_readings.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/notebook-undo-browser-qa.cjs
node reports/renewables-enhancement/notebook-undo-verify.cjs
~~~


## Compare the entire operating scenario

Saving a baseline in the active operating scenario now reveals **Compare the whole scenario** beneath the scenario results. The overlay recalculates the saved inputs and current inputs from minute zero through the same prescribed sequence, regardless of the baseline's saved minute. It compares electrical output in kW, delivered electricity in kWh, and, for batteries, stored energy in kWh. A dashed baseline and solid current line share one vertical scale. Electrical power is drawn as minute-long steps; cumulative and stored-energy curves connect minute boundaries. Full-scenario electricity totals and a signed difference are shown above the plot. Batteries also compare unserved demand against the same request schedule.

The **Scenario comparison minute** slider stays synchronized with the main workbench timeline. **Inspect largest difference in 3D** pauses playback, selects the earliest largest absolute difference for the chosen metric, switches from the flow view when necessary, and focuses the workbench. Power inspection excludes the terminal endpoint because it is not another energy-producing interval. Exact values at the selected minute appear under the slider, and an expandable table provides every sample for the active metric. Identical setups disable largest-difference inspection. The **Scenario comparison** workbench shortcut and **Review comparison baseline** button provide keyboard navigation between the plot and notebook.

A baseline saved under a different scenario produces an explanation and a link to the notebook; its inputs are not silently reinterpreted under the current scenario. Changing or undoing the notebook baseline updates the overlay. One-input and multiple-input comparisons are distinguished across the full scenario. Inspecting the plot preserves saved readings, observations, and current input settings. Exported investigations include a recalculated scenarioComparison object with input settings, changes, metric metadata, samples, electricity totals, and battery unserved demand. Existing file imports continue to derive results from validated saved inputs.

### Whole-scenario comparison validation

**133 regression tests pass across five files**, including 18 new focused tests. The tests reconcile every native scenario, check analytical PV area scaling and independent power integration, preserve signed and tiny differences, verify earliest-tie behavior, exclude terminal power endpoints, distinguish battery stored and delivered energy, reject mismatched contexts, and check rendered controls, escaping, zero states, and saved-time independence.

A real Chromium workflow exercises all **18 scenarios across nine technologies** and their supported metrics. It checks exact displayed values, synchronized minute selection, largest-difference 3D inspection, unchanged saved work, real notebook save/baseline/undo actions, keyboard navigation, battery flow-to-3D transitions, playback pausing, complete exported comparison data, incompatible baselines, zero/tiny output, and the phone data table. **Nine accessibility audits pass**, covering battery flow mode, incompatible scenarios, desktop power and energy, dark theme, 390px/320px layouts, the expanded phone table, and tiny output. No page or console errors were recorded; phone layouts avoid document overflow. Validation uses an isolated local React/Three.js host rather than a deployed full-application session.

Review [desktop power comparison](scenario-comparison-desktop.jpg), [battery comparison](scenario-comparison-battery.jpg), [dark energy comparison](scenario-comparison-dark.jpg), and [320px comparison](scenario-comparison-phone-320.jpg). Evidence: [browser workflow](scenario-comparison-browser-qa.cjs), [browser results](scenario-comparison-browser-results.json), [regression results](scenario-comparison-vitest-results.json), [verification script](scenario-comparison-verify.cjs), and [verification summary](scenario-comparison-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_scenario_comparison.test.js tests/renewables_pathway_comparison.test.js tests/renewables_energy3d.test.js tests/renewables_component_comparison.test.js tests/renewables_file_readings.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/scenario-comparison-browser-qa.cjs
node reports/renewables-enhancement/scenario-comparison-verify.cjs
~~~


## Compare a selected time window

The whole-scenario overlay now includes **Compare a time window**. Its start and end boundaries are shared with **Measure a custom interval**, with separate selections retained for each technology and operating scenario. Changes in either tool update both. Scrubbing or inspecting the timeline keeps the chosen window fixed. Shortcuts select the active milestone, the full scenario, or the current minute as a boundary; crossing a boundary collapses to an explicit zero-length window. Opening the comparison highlights the selected span on the full-scenario chart. The full curves retain their original meaning, and an explanation distinguishes cumulative values from interval totals.

Both setups are integrated over [start, end): the end boundary contributes no extra operating minute. Results compare electricity delivered, average electrical output, and the minutes when current output is above, below, or equal to the baseline. The largest absolute output gap uses the earliest tied operating minute within the selected window. It and either boundary can be inspected in 3D without changing saved inputs or readings. Equal-output and empty windows disable largest-gap inspection. Empty windows deliver zero electricity and display average power as **Not defined**.

Battery windows additionally compare unserved scheduled demand, stored energy at both boundaries, and each setup's stored-energy change. These state changes remain separate from delivered electricity. Per-sample unserved request power is recorded in kW in comparison rows; the window integrates it into kWh. Interval energy is summed from minute power values rather than subtracted from potentially much larger cumulative totals, preserving very small late-window quantities.

**Export comparison window** includes scenarioComparisonInterval alongside the existing current-scenario selectedInterval. Both use the same normalized boundaries. Changing or undoing the notebook baseline recalculates the comparison without resetting those boundaries. Opening a different scenario with an incompatible saved baseline preserves the selection until a matching comparison is available. Live announcements describe boundary changes without repeating playback's minute updates. Phone charts have larger axis labels and a visible horizontal-scroll hint.

### Comparison-window validation

**152 regression tests pass across six files**, including 19 new tests. Checks independently reconcile interval energy and average power for all 18 scenarios, verify a known constant-cloud PV calculation, window additivity, endpoint exclusion, reversed and out-of-range boundaries, negative and equal gaps, zero-length windows, battery charging/delivery/shortfall distinctions, tiny energy after large cumulative totals, rendering, and shared state.

Two Chromium workflows pass **23 behavior checks and 18 accessibility audits** on the final source. The interval workflow covers every scenario, bidirectional controls, milestone and current-minute shortcuts, playback pausing, 3D focus and flow-to-3D inspection, selection persistence, baseline undo, exports, highlighting, keyboard controls, empty states, dark theme, and 390px/320px layouts. The existing whole-scenario workflow verifies its metric controls, full plots, inspection, notebook actions, and exports after integration. No page or console errors were recorded. Narrow layouts avoid document overflow; wide tables retain their accessible horizontal scroll regions. Desktop and dark 320px window screenshots were visually reviewed. Source, desktop copy, and running local preview match byte-for-byte; syntax and scoped whitespace checks pass. These are isolated local React/Three.js checks rather than a deployed full-application session.

Review [desktop window](comparison-window-desktop.jpg), [highlighted chart](comparison-window-chart.jpg), [battery window](comparison-window-battery.jpg), and [320px battery window](comparison-window-phone-320.jpg). Evidence: [interval browser workflow](comparison-window-browser-qa.cjs), [interval browser results](comparison-window-browser-results.json), [full-scenario browser results](scenario-comparison-browser-results.json), [regression results](comparison-window-vitest-results.json), [verification script](comparison-window-verify.cjs), and [verification summary](comparison-window-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_comparison_window.test.js tests/renewables_scenario_comparison.test.js tests/renewables_pathway_comparison.test.js tests/renewables_energy3d.test.js tests/renewables_component_comparison.test.js tests/renewables_file_readings.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/comparison-window-browser-qa.cjs
node reports/renewables-enhancement/scenario-comparison-browser-qa.cjs
node reports/renewables-enhancement/comparison-window-verify.cjs
~~~


## Explain changes with recorded one-input trials

**Explain changes one input at a time** appears below a compatible scenario comparison. Choose the full scenario or selected comparison window, then run the checks. Each changed input gets an independent trial starting from the saved baseline; only that input takes its current value. The results record both reference setups, the scenario, the selected bounds, the original inspection minute, and each isolated trial. Every technology keeps its latest recorded request.

Trial cards compare delivered electricity in kWh with signed bars sharing a scale centered on zero. A separate calculation shows the sum of isolated effects, the actual combined change, and their remainder. This remainder represents interaction between simultaneous changes, including model limits. Separate trials are not additive causal shares, and the remainder is not an additional energy source. For example, in the constant-cloud PV window, doubling area and increasing efficiency from 20% to 25% produce isolated gains of 0.24 and 0.06 kWh, a combined gain of 0.36 kWh, and an interaction of 0.06 kWh under the tested inputs.

**Inspect this trial in 3D** loads the isolated settings and the earliest minute with the largest absolute power difference within the recorded period. If no power gap occurs, inspection uses its start minute. The recorded result remains available while the live workbench changes. **Restore combined setup in 3D** and **Inspect recorded baseline in 3D** load the recorded settings, scenario, and original minute. Inspection preserves notebook readings, draft names and observations, and interval selections. A notice distinguishes recorded results from the current comparison; changes in settings or scope only replace the recorded request when the user runs the checks again.

New runs require a matching scenario baseline, at least one changed input, and a nonempty period. Existing results remain available after the current setup becomes incompatible or a selected window becomes empty. All scenario integrations begin at minute zero, then measure only [start, end), retaining battery history before a selected window. Battery cards include unserved scheduled demand and explain that changing capacity while holding initial charge percentage fixed can also change initial stored energy. Exports recalculate the latest recorded checks for all technologies in an inputChecks collection; file imports continue to ignore derived analysis fields and use validated saved inputs.

### One-input checks validation

**172 regression tests pass across seven files**, including 20 new tests. The new checks isolate exactly one setting for all 18 native scenarios, independently reconcile delivered and unserved energy, verify analytical positive and negative PV interactions, distinguish zero and single-input effects, retain fractional settings, normalize time bounds, exclude terminal intervals, handle tiny/empty results, reject unsupported scenarios, preserve recorded state, and escape baseline names.

A Chromium workflow verifies all **18 scenarios across nine technologies** and **36 trial inspections**, covering full-scenario and selected-window scopes. Thirteen behavior checks exercise running without changing the workbench, restoration of the recorded combined setup and minute, flow-to-3D inspection, baseline inspection, incompatible scenario recovery, explicit reruns, playback pausing, empty-window gating, per-technology persistence, recalculated exports, signed and zero effects, and literal rendering of baseline names.

**Nine accessibility audits pass**, covering inspected and stale results, empty-window controls, desktop, dark theme, 390px/320px layouts, signed effects, and zero effects. No browser page or console errors were recorded, and narrow layouts avoid document overflow. Desktop and dark 320px screenshots were visually reviewed. Source, desktop copy, and running local preview match byte-for-byte; syntax and scoped whitespace checks pass. Validation uses an isolated local React/Three.js host rather than a deployed full-application session.

Review [desktop checks](input-checks-desktop.jpg), [dark checks](input-checks-dark.jpg), and [320px checks](input-checks-phone-320.jpg). Evidence: [browser workflow](input-checks-browser-qa.cjs), [browser results](input-checks-browser-results.json), [regression results](input-checks-vitest-results.json), [verification script](input-checks-verify.cjs), and [verification summary](input-checks-verification.json).

~~~powershell
node node_modules/vitest/vitest.mjs run tests/renewables_input_checks.test.js tests/renewables_comparison_window.test.js tests/renewables_scenario_comparison.test.js tests/renewables_pathway_comparison.test.js tests/renewables_energy3d.test.js tests/renewables_component_comparison.test.js tests/renewables_file_readings.test.js --pool=threads --maxWorkers=1
node reports/renewables-enhancement/input-checks-browser-qa.cjs
node reports/renewables-enhancement/input-checks-verify.cjs
~~~
