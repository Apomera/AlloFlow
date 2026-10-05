# Bridge Lab visual investigation route and energy map

October 3, 2026. Changes remain uncommitted.

## Learning workflow

The earthquake experiment now opens with four responsive action cards: Predict, Inspect, Compare and Explain. They lead to the existing notebook prediction, timeline, saved-trial comparison and notebook explanation. Before a reference exists, Compare focuses Save earthquake trial without saving automatically. The cards invite students to predict one change, follow motion and energy together, compare under the same shaking, and explain using values, units and time.

Students can move between the steps freely. Navigation pauses earthquake playback and vehicle driving while preserving physical inputs, exact inspected time, interval pin, notes, saved trials and scene selection. The scene recorder, damping guide and notebook retain their separate writing fields. No completion or correctness state is inferred from filled notes.

Route button names include their visible step titles for speech navigation. Destination fields, the timeline and comparison have visible keyboard focus. The comparison is named by its heading.

## Visual energy explanation

Follow the energy now includes a responsive diagram of ground interaction, stored mechanical energy and damping loss. Its caption explicitly names the current experiment and inspected time to three decimals, even when the scene displays reference A.

- Net input work and damping loss accumulate since 0 s, in J/kg of modal mass.
- Stored energy is the amount present now. Its kinetic and elastic portions share a labelled proportional bar.
- Connectors show instantaneous transfer rates in W/kg. Input direction follows power, including energy returning while cumulative input remains positive.
- Zero transfer uses a neutral marker. Zero stored energy has empty, finite split fractions.
- At 24 s the caption says Observation ends; it does not claim the bridge has settled.

The three energy cards form a horizontal diagram on desktop and stack in reading order on smaller screens. Decorative arrows turn down or up with the layout; text names the transfer direction. Existing energy bars and power labels retain small signed values in scientific notation and distinguish true zero. All values come from the current experiment's recorded sample, including its interpolated energy fields. The diagram does not recompute energy from displayed scene motion.

The illustrative single-mode physics model, static bridge analysis and saving format are unchanged. The map remains available in labelled 2D and graphics fallback.

## Verification

Run verification: node reports/bridgelab-learning-route-2026-10-03/verify.cjs

Five new interaction checks passed; the other 147 checks were skipped in that focused run. Nine real-WebGL workflows passed: three new route/map workflows, three paired-interval regressions and three notebook-interval regressions. The verifier also parses the source, checks identical source mirrors and compares all 1,208 literal English fallbacks with both registries.

The focused run covers navigation and preserved investigations; optional route visibility and separate writing; recorded exact-time energy consistency and small values; zero input, free vibration and observation boundaries; instantaneous direction independently of scene selection.

Independent source review checked model/source attribution, reading order, power signs and focus behavior. Desktop, phone and graphics-fallback captures were inspected; browser overflow checks passed. Scoped whitespace checks passed and the staging area is empty. No staging or commits.

### Complete-suite limitation

The complete 152-check interaction suite could not finish on this host. An initial run was interrupted by an environment refresh before writing its results. Later attempts with thread and process workers timed out before importing tests, so those attempts ran zero assertions. The last attempt also allowed 180 seconds for startup acknowledgement and 210 seconds for pool startup; it still timed out. The report-local vitest-startup-loader.mjs changes only these two startup timers in memory, preserves assertion/test/hook limits, and leaves installed packages untouched. unit-results.json records the last startup failure. The verifier reports this limitation explicitly and does not count the complete suite as passing.

The previous complete 147-check interaction run remains recorded in ../bridgelab-paired-intervals-2026-10-03. This pass has its focused interaction checks and nine browser workflows; it does not claim a new complete-suite result.

- [Desktop investigation route](bridge-1000-investigation-route.png)
- [Phone investigation route](bridge-320-investigation-route.png)
- [Desktop energy map](bridge-1000-energy-map.png)
- [Phone energy map](bridge-320-energy-map.png)
- [Graphics fallback energy map](bridge-844-fallback-energy-map.png)
