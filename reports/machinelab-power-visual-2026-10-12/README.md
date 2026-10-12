# Machine Lab: see the power cost of pace — October 12, 2026

The Power & motion lab now shows how the same task changes when it takes half the current time, the current time, or twice the time. Three horizontal power bars share a single scale, with a dashed marker showing the mechanical input-power budget. Each row retains its time and watt values, and a shared input-work total makes clear that changing pace changes power rather than the energy needed for the task.

The scale is the larger of twice the current required input power and the input-power budget. Every row uses that same scale and the same track width. The current-time row has an accent border. Bars remain proportional, including very small shares; no artificial minimum bar width is applied. Numeric labels use the lab's existing number formatting. Derived comparison times remain unclamped, so half of the minimum editable duration can be 0.005 seconds and twice the maximum can be 7200 seconds. These comparisons do not apply settings.

The surrounding calculation cards use larger values and a balanced responsive layout. The practice area has highlighted givens, a primary Check button and bordered hint/answer feedback, matching the compound lab's visual treatment. Compact skill and RPM unit menu labels remain readable at narrow widths; full calculation titles stay in saved work. Form labels, keyboard focus and the existing polite feedback region remain intact. Dark and forced-color themes retain readable text and chart boundaries.

The existing detailed pace table remains unchanged. There are no changes to math helpers, persisted state, grading, supported skills, callbacks, record versions or exports. The source boundary proof confirms that restoring only the prior `stationPowerLab` presentation reproduces the complete previous source, with the change/save callbacks and original table also identical.

## Verification

Canonical/public source SHA-256: `5580dd78b69dae7a50a6bcac6586262a42de935be58706a64825df8511e71579`.

The final browser run passed 577 checks across ten scenarios with observed native exit 0. Seven screenshots were inspected by both the browser reviewer and primary agent. Every available skill and unit selector was checked at 320 CSS pixels across all six stations. Other checks cover shared rendered chart scales, valid and invalid inputs, extreme budgets/durations, keyboard focus, hints, unit feedback, and saved-record provenance.

- [Desktop pace comparison](browser/run-02/desktop-power-pace.png)
- [Dark phone practice](browser/run-02/dark-phone-power-practice.png)
- [Forced-colors phone practice](browser/run-02/forced-colors-power-practice.png)

The initial browser attempt is retained under `browser/run-01` and excluded from final passing totals. It found selected skill text clipping, fixed with compact menu labels, plus two harness measurement issues: CSS percentage serialization precision and sampling before layout settled. The final harness allows browser serialization/subpixel rounding and waits two animation frames before geometry checks. Exact physical-value checks remain strict. Independent code review also caught unequal row border widths before browser validation; all three tracks now have identical pixel widths.

All 457 existing regression cases pass across seven files in 18 observed successful native processes. There are no failed, interrupted or retried regression runs in this pass. Syntax checks, exact canonical/public parity, source-boundary checks, and the final evidence verifier pass.

`validation-summary.json` binds final native test results, browser checks, source hashes and screenshots. Existing selected regressions cover power calculations and practice, saved work, read-aloud, localization, grade bands, accessibility and views. Each stable assertion inventory position is counted once, with observed child exits and frozen input/receipt/log hashes.

Browser checks use the real React/THREE host in local Chromium with software WebGL. Generated browser HTML and temporary profiles are excluded from committed evidence. This is scoped verification, not a full application build, full repository test run, physical assistive-device session or performance benchmark. No push or deployment is claimed.

Use fresh output directories to reproduce without replacing original receipts:

```powershell
node reports/machinelab-power-visual-2026-10-12/run-regressions.cjs reports/machinelab-power-visual-2026-10-12/regression-rerun
node reports/machinelab-power-visual-2026-10-12/browser/run-native.cjs reports/machinelab-power-visual-2026-10-12/browser-rerun
```

The serial regression runner supports `--resume` only for complete zero-exit runs with matching source, test, receipt and log hashes. An unobserved or incomplete result is never counted as a pass.
