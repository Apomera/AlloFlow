# Renewables Lab: US transition sandbox — model version 2

The sandbox is available from Renewables Lab's core library and launch panel. It remains an exploratory learning activity alongside the established technology lessons.

## Planning and simulation

- Construct a portfolio for 2025–2050 using annual solar, wind, and battery additions, fossil retirement, demand growth, efficiency, battery duration, and regional link capacity.
- Choose a **72-hour or 168-hour** test with synthetic summer, winter, or spring conditions and ordinary variability, a prolonged cloudy/low-wind period, or a heat wave.
- **Site new construction by region.** Solar, wind, and battery weights are normalized independently across six illustrative regions. Changing where new capacity is built preserves the national totals; existing 2025 assets stay in place. All-zero weights fall back to the default resource distribution. A “Build near demand” preset uses approximate demand-proportional weights.
- **Shift flexible demand.** The selected fraction of local evening use (17:00–21:00) moves evenly to 10:00–14:00. Total energy remains unchanged for each region over every complete 24-hour cycle.
- **Model transfer losses and timed link outages.** The default end-to-end loss is an explicitly illustrative 3%, adjustable from 0% to 15%. Disconnect one region from the shared hub for a chosen start hour and duration. Its local generation and storage continue operating.
- **Set a battery reserve policy.** Routine discharge uses energy above the reserve target. If local fossil backup cannot cover demand, the reserve is released, still within the battery's remaining hourly power rating.
- Track renewable provenance through transfers and storage, conversion losses, curtailment, delivered transfers, fossil backup, and unmet demand. Nuclear-derived battery discharge is not counted as renewable.

The 3D landscape changes with regional capacity and daylight. Users can click a region, drag to orbit, or use keyboard-accessible camera and region buttons. Solar and wind symbol counts are capped illustrations rather than actual plant counts. Offline links turn red. Turbine animation is opt-in and respects reduced motion. The renderer skips idle, hidden, and offscreen work, disposes on exit, and supports recovery from WebGL context loss.

## Analysis and evidence

- Demand coverage and battery-energy history share one hourly timeline.
- “Find the weak point” reports unserved GWh, the largest GW gap, the longest continuous shortfall, and shifted energy. Shortcuts inspect peak shortages/fossil use, curtailment, battery discharge, and outage start.
- A regional outcomes table distinguishes local unmet demand, curtailment, fossil use, congested link hours, and offline hours.
- The **four-case seven-day stress suite** compares summer variability, a winter renewable lull, a summer heat wave, and a 48-hour Northeast link outage. It keeps the plan's construction, siting, flexibility, and storage policy fixed.
- The **six-milestone adoption study** repeats the same test at 2025, 2030, 2035, 2040, 2045, and 2050.
- Changed assumptions mark cached study results as stale and disable loading them until recalculation. Moving between years in an otherwise unchanged adoption study keeps that study valid.
- Four saved notebook scenarios support notes, restore/remove, changed-setting descriptions, and JSON export. Legacy saved plans are recalculated with model version 2 for consistent comparisons.
- Exports include model version, normalized settings, regional capacities, every hour, regional summaries, notebook comparisons, and current stress-suite/milestone results. Stale analyses are excluded.
- Settings and notebook scenarios persist. Stress-suite and milestone results are held for the current session and can be exported.


## Guided experimentation

- **Three planning challenges** start from an intentionally difficult portfolio: carrying solar into the evening, sharing regional surplus, and preparing for a winter lull. Targets are calculated against fixed starting plans; completion requires satisfying both the targets and the allowed-setting rules. Each challenge has an achievable solution verified against the simulator.
- Changing a fixed assumption shows exactly which rule was broken. “Restore required settings” restores only fixed values and preserves allowed work. Switching challenges keeps the original plan checkpoint. Learners can return to that plan or keep their challenge solution. The active challenge and checkpoint persist through reload.
- **The controlled experiment bench** samples five standard values plus the current baseline for one of eight variables: solar additions, wind additions, battery power additions, battery duration, regional link capacity, demand flexibility, efficiency, or storage reserve.
- Every sampled run retains all other normalized assumptions, including regional siting and outages. The chart compares renewable demand share and demand met on a common percentage scale. The accessible table reports fossil, unmet, and curtailed GWh changes against the captured baseline.
- Loading a sampled value keeps that captured baseline valid. Changing the experiment variable or another assumption marks the comparison stale and disables loading until rerun; stale studies are excluded from export. These are sampled comparisons, not continuous sensitivity estimates or cost optimization.
- **“Explain this hour”** connects the selected 3D/map region to actual dispatch evidence: empty storage, charging/discharging power limits, full batteries, reserve use, unavailable links, fossil capacity, and curtailed surplus. A sources/uses ledger reconciles power; start/end storage and conversion loss explain the energy change. Observed constraints are not claimed as causal investment recommendations.
- Investigation exports include the current challenge assessment, a fresh controlled experiment, its captured baseline and deltas, and the selected hour's explanation and ledger. The dispatch model remains version 2; this expansion adds analysis without changing its physical accounting.

## Accounting and model boundaries

This is an **illustrative electricity classroom model**, not a reconstruction of the US grid, a national forecast, or an annual reliability study. Region definitions, resource weights, baseline capacities, hourly profiles, loss assumptions, and build rates are stated teaching assumptions. Alaska, Hawaii, territories, and international exchanges are excluded.

The baseline is 240 GW solar, 160 GW wind, 80 GW hydro, 95 GW nuclear, 550 GW fossil, and 30 GW batteries. The demand scale is 500 GW before shaping, growth, and efficiency. These values are not calibrated to EIA observations. Hydro and nuclear capacity remain fixed.

Each region has one independent capacity-limited connection to an ideal hub; this is not an actual US transmission topology. Surplus exports are allocated proportionally, followed by batteries and local fossil backup. The dispatch is deterministic and greedy rather than an optimization.

The numerical checks enforce:

- Regional power: generation + imports + discharge = served demand + charge + exports + curtailment.
- Network energy: gross exports − delivered imports = transmission losses, applied once end-to-end.
- Storage energy: ending − starting energy = charge − discharge − conversion losses, with separate power and energy bounds.
- Batteries start empty. Charge and discharge use the square root of 88% round-trip efficiency. Reserves never bypass power limits or create stored energy.
- Siting changes national allocation without creating or removing installed capacity.
- Demand shifting changes timing without reducing energy use.

The model omits investment cost, prices, land use, permitting, ramping, random plant outages, frequency dynamics, and lifecycle emissions. A selected year constructs a portfolio and reruns a synthetic week or three-day interval; it does not continuously simulate intervening years. Full demand coverage in a short test is not annual reliability.

Concept references:
- [EIA: Energy storage for electricity generation](https://www.eia.gov/energyexplained/electricity/energy-storage-for-electricity-generation.php) explains power capacity, energy capacity, and conversion losses.
- [EIA: Delivery to consumers](https://www.eia.gov/energyexplained/electricity/delivery-to-consumers.php) explains the transmission/distribution system.
- [DOE: Integrating solar into system operations](https://www.energy.gov/cmei/systems/integrating-solar-day-day-system-operations) describes grid flexibility.
- [EIA: Electricity in the United States](https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php) provides observed national statistics.

These references explain concepts; they do not validate the sandbox parameters. In particular, the transfer-loss control is not an estimate of total US transmission and distribution loss.

## Verification

**51 tests passed across all five Renewables test files.** Coverage includes power/energy conservation, charge/discharge limits, renewable attribution bounds, normalized regional allocation, zero-weight fallback, night solar output, exact outage intervals and horizon clipping, demand-energy conservation, reserve release, worst-hour/longest-gap calculations, comparable stress studies, input sanitization, legacy-plan recalculation, one-variable sweeps and freshness, achievable challenge targets and constraint enforcement, dispatch explanations and power ledgers, and existing lab regressions.

Chromium exercised:
- Existing navigation, timeline playback/pause/end, saving/updating/restoring/removing notes and scenarios, export, reload persistence, map/3D switching, and context-loss recovery.
- Regional construction changes with conserved national capacity; 72/168-hour switching and safe hour clamping.
- Flexible demand with conserved total energy; losses, reserves, timed outages, and critical-hour shortcuts.
- Direct 3D region picking and camera dragging without altering the plan.
- Stress studies, stale-result handling, milestone navigation, test loading, and version-2 export containing 168 hours, four stress cases, and six milestones.
- Challenge completion, rule repair, switching with the original checkpoint, returning to the previous plan, keeping a solution, and challenge reload persistence.
- Controlled comparisons, loading a single variable, a preserved baseline, stale-study handling and export exclusion, and the selected-hour evidence ledger.
- Light/dark/mobile axe WCAG A/AA checks, including expanded and stale comparison tables and the guided experiment panels.

There were **no browser page or console errors, no detected axe violations, and no document overflow at 390 px**. Comparison tables remain keyboard-scrollable even when all their action buttons are disabled. Desktop, region, diagnostic, study, and phone captures were visually reviewed. Syntax, scoped whitespace, and source/deployment parity checks passed.

The browser harness mounts the real tool with local React and the pinned Three.js runtime. It is an isolated host, not a deployed full-application end-to-end test.

Reproduce:

```powershell
node node_modules/vitest/vitest.mjs run tests/renewables_transition.test.js tests/renewables_lab_science.test.js tests/renewables_form_controls_a11y.test.js tests/renewables_table_a11y.test.js tests/renewables_diagram_tabs_a11y.test.js --maxWorkers=1
node reports/renewables-enhancement/browser-qa.cjs
node reports/renewables-enhancement/browser-qa.cjs --preview
```

## Review artifacts

- [Desktop workspace](desktop.png)
- [Regional 3D construction](regional-landscape.png)
- [Winter night](winter-night.png)
- [Grid diagnostics](diagnostics.png)
- [Seven-day stress comparisons](stress-suite.png)
- [Adoption milestones](adoption-pathway.png)
- [Phone siting controls](mobile-siting.png)
- [Phone diagnostics](mobile-diagnostics.png)
- [Planning challenges](planning-challenges.png)
- [Selected hour explanation](hour-explanation.png)
- [Controlled experiment](controlled-experiment.png)
- [Phone experiment bench](mobile-experiment.png)
- [Phone challenges](mobile-challenges.png)
- [Guided investigation export](guided-investigation.json)
- [Browser verification](browser-results.json)
- [Version-2 week investigation export](week-investigation.json)

A data-calibrated national planning phase would require versioned observed capacity/demand data, a validated transmission network, longer weather records, and explicit economics. The current sandbox makes its assumptions visible while supporting deeper controlled experiments.
