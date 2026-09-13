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
