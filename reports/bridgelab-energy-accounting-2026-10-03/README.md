# Bridge Lab visible energy accounting

October 3, 2026. Changes remain uncommitted.

## Student experience

The current-experiment energy map now includes Account for the energy. Two aligned bars show net input work since 0 s and the kinetic, elastic and damping amounts that account for it. The displayed relation is net input work ≈ stored now + dissipated since 0 s. A numerical example uses the exact inspected sample and J/kg of modal mass.

The old three separate energy bars and repeated input-work paragraph below the timeline were removed. The map connects the direction of transfer, the stored kinetic/elastic split, the cumulative damping loss and the energy accounting in one place. The timeline, notebook, scene observations, saved comparisons and their existing writing fields keep their roles.

## Meaning of the bars

Both bars share one fixed scale for the full 24-second current experiment. Its maximum comes from the full-event net-input peak and the maximum recorded sum of kinetic, elastic and dissipated energy. Moving through time changes the amounts and partitions while the scale stays fixed. After shaking stops, input work stays constant as stored energy becomes damping loss. With zero damping, cumulative damping stays zero and stored energy remains approximately constant during free vibration.

Zero input produces empty bars and a clear explanation. Tiny nonzero input uses the actual event scale, preserving the same proportions as a stronger version of that experiment. Values retain scientific notation rather than rounding to zero. A short notation explanation appears once when the visible readings need it.

Why use ≈? is an optional keyboard-accessible disclosure. It explains numerical calculation in small time steps and rounding, and shows the recorded balance difference. All energy fields and the residual come from the same recorded/interpolated current sample. Interpolation preserves the recorded balance relationship. There is no correctness badge or estimate of bridge damage or safety.

The chart remains Current experiment at the exact inspected time when scene A is selected, in labelled 2D and through graphics loss and recovery. Decorative bars are hidden from screen readers; labels, totals, the equation and numerical explanation remain readable. Phone layouts wrap totals and legends within the screen.

## Verification

- All 155 checks in the complete immersive interaction suite passed, including three new accounting workflows. This complete run also covers the preceding route and energy-map changes.
- Nine real-WebGL workflows passed: accounting at desktop and 320 px, accounting through graphics fallback, three investigation-route regressions and three paired-evidence regressions.
- 192 accounting snapshots across 48 input combinations passed direct checks of conservation within numerical tolerance, fixed scale, zero input, free vibration, zero damping and quadratic amplitude scaling. Twelve amplitude comparisons confirm small inputs keep their proportions.
- Parsed source; identical canonical/public mirrors; 1,216 matching literal English fallbacks in both registries.
- Desktop, phone, small-value and graphics-fallback captures inspected; browser overflow checks passed.
- Independent source review checked scale, source/time attribution, numerical wording and accessibility.
- Scoped whitespace checks passed. No staging or commits.

The full interaction suite started normally in this pass and completed; its result is recorded in unit-results.json. The preceding pass's worker startup limitation remains documented in its historical report.

Run model verification: node reports/bridgelab-energy-accounting-2026-10-03/verify-accounting.cjs

Run report verification: node reports/bridgelab-energy-accounting-2026-10-03/verify.cjs

- [Desktop energy accounting](bridge-1000-energy-accounting.png)
- [Phone energy accounting](bridge-320-energy-accounting.png)
- [Phone small-value explanation](bridge-320-small-energy-accounting.png)
- [Graphics fallback energy accounting](bridge-844-fallback-energy-accounting.png)
