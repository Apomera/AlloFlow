# Bridge Lab: how rates become energy

## What changed

Students could inspect instantaneous power and energy between two moments, but could not see how the intervening power history explains the transfer. A zero rate at an endpoint can still surround a nonzero transfer; positive and negative input can also cancel in the net work.

The optional **How rates become energy** disclosure now connects those observations inside **Energy between moments**:

- **Interval detail** spreads the selected chronological interval across the plot. Its power range fits the recorded values in that interval, shared by both curves and by A/B when comparing trials.
- **Full event** restores the 0–24 s context and a fixed event power range. Switching views leaves the J/kg totals unchanged.
- Ground input and damping loss have separate curves. Positive input shading is teal; negative input shading is pink with hatching. The displayed net work keeps its sign.
- A circle marks the pinned moment and a diamond marks the inspected moment. Marker size remains legible on a phone. Swapping moments exchanges these roles while preserving chronological shading and totals.
- Visible text summarizes the interval's positive, negative, or mixed input rates and its damping rates. This gives screen-reader users the historical observation as well as the endpoint readings and totals.
- Tiny readings retain scientific notation. True zero, no damping, free settling, and coincident moments have explicit explanations. Coincident moments have zero interval transfer, even when their instantaneous rates are nonzero.

Opening the disclosure pauses playback. The history follows the selected scene trial; graphics fallback uses the current experiment. The local disclosure and view preferences require no new stored record fields.

## Scientific interpretation

The unit connection is **W/kg × s = J/kg**. Signed area under a power curve represents energy transfer. The shading approximates that area from recorded rates; the displayed J/kg totals remain differences of accumulated model work and damping loss, interpolated at the two moments.

The existing illustrative linear modal model, integration, sampled motion, and energy accounting remain unchanged. Values describe relative modal energy per kilogram of modal mass. The history makes those existing quantities inspectable.

## Review refinements

Initial browser captures showed that a short ground-removal interval was hard to distinguish on the full-event axis. Interval detail now gives that small window enough space to inspect, with an explicit reminder that its axes fit the selected interval.

The numerical sweep caught a floating-point zero crossing that rounded to a sample's timestamp and created a zero-duration polygon. Shading now requires a strictly positive timestamp span, with no epsilon cutoff. Fixtures cover rounding to either endpoint; raw rates and accumulated totals are preserved.

Cross-run amplitude comparisons use a tolerance relative to full-event power. Normalized detail comparisons account for division by a potentially tiny interval range. Exact clipped maxima, common A/B ranges, true zeros, signed geometry, and immutable responses are checked independently.

## Validation of the final source

- **62 checks:** complete seismic model and inertia suites.
- **29 checks:** relevant immersive interactions covering rate history, interval evidence, energy questions, force and motion, notebook and print flows. The selected run skips the other 145 interactions; it is not a complete interaction-suite run.
- **10 focused rate checks:** included in the totals above, with endpoint-rounding fixtures, keyboard view changes, accessible summaries, zero/coincident readings, and transient record behavior.
- **10 browser workflows:** three rate-history workflows, four interval workflows, and three energy-question workflows. Coverage includes 1000 px and 320 px layouts, keyboard controls, A/B, the immersive phone drawer, graphics loss and recovery, scientific notation, notes, and overflow checks.
- **144 numerical scenarios:** three modes, four damping ratios, three forcing frequencies, and four amplitudes. The verifier checks 207,504 recorded samples and 415,008 power values, plus 720 detail windows and paired/scaled/zero/synthetic cases.
- **14 final captures**, source syntax, identical canonical and desktop source mirrors, and all **1,287 literal English keys** matching both registries.

The final source fingerprint and machine-readable results are in `source-verification.json`, `model-invariants.json`, `unit-model-results.json`, `unit-interaction-results.json`, `unit-focused-final.json`, and `browser-results.json`. `browser-full-event-initial.json` retains the first browser run before the detail refinement.

From the project root, `node --max-old-space-size=2048 reports/bridgelab-rate-history-2026-10-04/verify-rate-history.cjs` repeats the numerical sweep. `node reports/bridgelab-rate-history-2026-10-04/verify.cjs` checks the saved final reports, captures, source mirrors, syntax, translations, and numerical source fingerprint.

Changes remain uncommitted.
