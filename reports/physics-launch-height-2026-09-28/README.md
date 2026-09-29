# Physics simulator: elevated launches

September 28, 2026. This pass extends the [paired experiments and investigation notebook](../physics-investigations-2026-09-27/README.md) with adjustable launch height, horizontal launches, and evidence that preserves the height used for each flight.

Follow-up: the [visual redesign](../physics-visuals-2026-09-28/README.md) improves the flight scene, controls, graphs, and responsive layouts while retaining this numerical model.

## What students can do

- Set **Launch height** from **0 to 50 m** above ground. Raising the launcher enables **0° horizontal launches**. Returning to ground level restores the minimum angle to 5°.
- Watch the raised launcher and trajectory in a view that scales to accommodate elevation. Launch narration, the canvas height marker, results, formulas, and comparisons identify the launch height.
- Pause before launching, step through the flight, or change playback speed. Initial potential energy includes the elevated starting position.
- Run **Compare vacuum & air drag** from the same captured height. Both flights retain their original launch conditions even when the controls later change.
- Use the new investigation **Does horizontal speed change falling time?** Its two trials launch horizontally from 10 m at 15 and 30 m/s, with Earth gravity and drag off. They change range while keeping falling time equal.
- Save and export height alongside the other launch settings. Reports retain the selected measurements after the recent log is cleared or saved state is restored.
- Read the formula panel in light, dark, or high-contrast mode with explicit colors that meet the small-text contrast target.

The three existing investigation presets explicitly use ground-level launches. Target missions, challenges, and battles also use ground level; their height control is locked. Mission entry and exit preserve the relevant exploration settings. The complementary-angle demonstration explicitly uses ground-level vacuum flights, where its equal-range claim applies.

## Physics and explanations

The current numerical model is **`projectile-v3`**. Launch height is $h_0$, measured above the landing surface. Landing remains at **y = 0**. Maximum height means the highest position above ground, including the starting height.

For drag-free flight, with $v_{x0}=v\cos\theta$, $v_{y0}=v\sin\theta$, and downward gravity of magnitude $g>0$:

\[
T=\frac{v_{y0}+\sqrt{v_{y0}^{2}+2gh_0}}{g},\qquad
R=v_{x0}T,\qquad
H_{\max}=h_0+\frac{v_{y0}^{2}}{2g}.
\]

These expressions cover the supported nonnegative launch angles. For a horizontal launch, $T=\sqrt{2h_0/g}$: changing horizontal speed changes range without changing flight time. The initial mechanical energy is $\tfrac12 mv^2+mgh_0$.

Vacuum motion uses exact constant-acceleration kinematics. Air resistance continues to use quadratic drag opposing velocity, with force magnitude $k|v|^2$, $k=0.004\ \mathrm{kg/m}$, and acceleration obtained by dividing force by mass. The numerical integration resolves the apex and ground contact inside a simulation step. Prediction, live flights, targeting helpers, and the recorded measurements use the same height convention.

The model assumes uniform gravity and a flat landing surface. Wind, spin, buoyancy, and object-specific changes to the drag coefficient remain outside this model. The visible speed range remains 5–50 m/s, gravity 1–25 m/s², mass 1–10 kg, and angle at most 85°.

### Claims that now depend on height

- The general flight-time formula replaces the equal-height shortcut in predictions and last-flight comparisons.
- The angle sweep explains that an elevated vacuum launch has an optimal angle below 45°. Complementary angles generally have different ranges when launch and landing heights differ.
- The experiment log only derives the speed-squared or inverse-gravity range relationship when both flights start at ground level, use no drag, change one supported variable, and have matching recorded numerical model versions.
- Elevated notebook comparisons and reports explain why those ground-level scaling shortcuts do not apply. Height counts as a sixth controlled variable alongside angle, speed, gravity, drag, and mass.
- The horizontal-flight myth explicitly assumes no air drag and zero initial vertical velocity. Its activity now compares two horizontal speeds from the same height; the old instruction to compare with a steep lob did not hold vertical velocity constant.

## Saved evidence and compatibility

Every new completed run records its launch height and `projectile-v3` provenance. Trails capture height at launch, so flight CSV metadata and the first sample describe the actual starting position rather than the current controls. Run CSV includes a `launch_height_m` column; flight CSV includes height in its metadata and preserves the initial elevated position and final ground-contact sample.

For complete legacy observations, an **absent** height field means 0 m. Migration preserves their measurements, IDs, notes, and original model versions. An explicitly supplied invalid height is rejected rather than replaced with a guessed measurement. Saved maximum height must be at least launch height. Paired-model snapshots follow the same validation rules.

Saved investigations copy height into their immutable run snapshots. Restoring them does not require the original recent log. Archived run IDs continue to protect the launch counter from reuse.

Comparisons warn when model versions differ or are unrecorded. This includes old `projectile-v2` observations compared with current `projectile-v3` observations. The original evidence stays available, while fair-test and power-law claims are withheld where numerical-model compatibility is unknown.

## Verification

The focused result is a subset of the integrated totals.

| Check | Result |
| --- | --- |
| Focused height records, saved records, and investigation evidence | **55 tests passed across 3 files** |
| Complete integrated physics unit suite | **148 tests passed across 12 files** |
| Complete physics browser regression suite | **26 scenarios passed across 6 files** |
| Mobile, theme, and visual verification | **9 combinations passed**: 1100, 375, and 320 px in default, dark, and high-contrast themes; zero horizontal overflow |
| Source/desktop-copy parity, syntax, and catalogs | **Passed**; source and mirror match, JavaScript syntax is valid, both English catalogs parse, and 42 new labels are registered |

The first integrated unit attempt passed 94 tests but three workers timed out during startup. Those three files passed all 54 tests on an isolated rerun. The browser run passed 25 scenarios; the remaining scenario initially failed because its assertion expected a lowercase label. After correcting the assertion to check the exact recorded height, it passed. No physics changes were needed for these reruns.

The visual audit then identified formula text with 3.77:1 contrast. Explicit theme colors raised the measured minimum to **5.48:1 in light mode**, **8.11:1 in dark mode**, and **19.56:1 in high-contrast mode**. All 39 learning-panel unit tests passed again after the final color and myth corrections. The completed visual run also verified the paused energy state, physical-to-screen height transform, the elevated angle optimum, and a 50 m drag landing in each theme, with no page errors.

Visual evidence: [measurements](visual-results.json), [horizontal launch at 320 px](height-default-320-canvas.png), [dark formulas at 320 px](height-dark-320-formulas.png), [high-contrast controls](height-contrast-320-controls.png), [completed elevated drag flight](height-dark-landed.png).

The dedicated physics CI workflow includes the new height browser suite. Checks were run locally; this task did not run GitHub CI or deploy the application. New labels are registered in both English catalogs; other language packs use the existing English fallback until translated.

### Added coverage

- [Physics engine tests](../../tests/physics_launch_height.test.js): elevated vacuum results, horizontal flight, optimum angle, quadratic-drag reference cases, no-return cases, and elevated targeting solutions.
- [Height learning tests](../../tests/physics_height_learning.test.js): angle bounds, formulas, captured last-flight height, angle-sweep explanations, horizontal trials, notebook comparisons, and paired-model labels.
- [Height record tests](../../tests/physics_height_records.test.js): legacy migration, invalid heights, horizontal records, mission normalization, immutable archives, comparisons, exports, and suppression of unsupported scaling claims.
- [Height browser tests](../../tests/e2e/physics-launch-height.spec.ts): paused elevated launch and energy, analytic landing time, frame-rate agreement with drag, captured height, paired models, mission restoration, and a complete horizontal investigation.

Existing saved-record and investigation fixtures now explicitly represent ground-level height. Existing paired-model and investigation browser assertions were updated to expect height metadata and `projectile-v3` for newly measured flights. Legacy browser fixtures intentionally remain unversioned and omit height to exercise restoration.

Reproduce the complete physics unit checks:

```powershell
node node_modules/vitest/vitest.mjs run tests/physics_ --maxWorkers=1 --pool=threads --testTimeout=30000
```

Run height-specific browser acceptance and visual checks:

```powershell
npx playwright test tests/e2e/physics-launch-height.spec.ts --workers=1 --retries=0
node reports/physics-launch-height-2026-09-28/verify-height.cjs
```

## Further improvement priorities

1. **Configurable landing height and elevated targets.** Distinguish launch height from landing height throughout impact detection, targeting, diagrams, and saved evidence. Keep ground-contact behavior explicit before introducing slopes or terrain.
2. **Selectable recorded points.** Let students inspect position, velocity, acceleration, and energy at a chosen time, including launch, apex, and impact, with keyboard and screen-reader support.
3. **More controlled drag experiments.** Expose object area or drag coefficient only with clear units, an explained model, and captured per-run metadata. Add wind as a separately recorded condition if introduced.
4. **Classroom evidence workflows.** Add structured prompts for repeated trials and measurement precision, then consider portable import/export of complete investigations and templates for teachers.

This pass concerns the local simulator implementation and verification. Deployment is outside its scope.
