# Physics simulator: experiments and investigation notebook

September 27, 2026. This pass builds on the [physics reliability improvements](../physics-deep-review-2026-09-27/implementation.md).

## What changed

### Compare vacuum and air drag

The **Compare vacuum & air drag (2 flights)** button runs two actual flights with the same captured angle, speed, gravity, and mass. The first uses no drag; the second uses quadratic drag. The second launch waits for the first landing. Pause, Step, and playback speed work throughout, and the controls retain the student's settings.

A result table shows measured range, maximum height, flight time, and the difference between the models. Both completed flights also appear in the experiment log, where they can be selected for a saved investigation.

Manual launches, changed launch settings, clearing trajectories, leaving the tool, or entering a mission cancel the sequence. Starting the comparison is disabled during target missions, challenges, and battles. An interrupted sequence never claims two completed results.

### Guided investigations

Open **Guided investigations** beneath the latest flight results. The notebook starts collapsed so it does not lengthen the default launch workflow.

| Activity | Trial 1 | Trial 2 | Held fixed |
| --- | --- | --- | --- |
| Does doubling speed quadruple range? | 15 m/s | 30 m/s | 45°, gravity 9.8 m/s², mass 1 kg, drag off |
| What happens when gravity is halved? | 9.8 m/s² | 4.9 m/s² | 45°, speed 25 m/s, mass 1 kg, drag off |
| Does mass change range through air? | 1 kg | 5 kg | 45°, speed 25 m/s, gravity 9.8 m/s², same drag coefficient |

Each trial button applies its settings together and cancels an unfinished flight. The student chooses when to launch. Applying trials preserves draft notes. Mission controls cannot be overridden through the activity buttons.

Students can also write their own investigation. The notebook contains a question, prediction, observations, and a claim. They select at least two completed runs by their stable run numbers. The first two form an on-screen comparison; all selected runs become part of the saved report.

The comparison identifies changed settings and shows measured differences and percentages. It distinguishes repeat trials, one changed setting, and comparisons with multiple changed settings. Its explanation follows the recorded drag models, rather than the current controls.

### Save and export evidence

Saving copies the selected measurements and notes into an immutable report. The report remains available when the recent log is cleared or the simulator's saved state is restored. It includes run IDs, launch conditions, numerical model version when available, recorded measurements, comparisons, and model assumptions.

**Copy report as text** produces an accessible plain-text report. If automatic copying is unavailable, the displayed report can be selected and copied. Up to 12 reports are retained; reaching the limit requires explicitly deleting a selected report before saving another.

Restoration filters malformed evidence, preserves valid reports, and recovers the launch counter from archived run IDs. Legacy runs without IDs remain selectable after migration. It does not recompute old measurements using today's settings. Differences, percentages, and ratios guard against zero baselines and non-finite values.

Comparisons warn when numerical model versions differ or were not recorded. Those measurements remain available, but are not presented as isolating the effect of a single launch setting: differences may reflect the earlier numerical method.

## Verification

| Check | Result |
| --- | --- |
| Complete physics unit suite | 100 tests passed across 9 files |
| Notebook follow-up after translation-extractor alignment | 42 tests passed |
| Browser regression and legacy-save follow-up | 22 distinct tests passed: 21 in the complete run and the added legacy case separately |
| Mobile/theme checks | All 6 combinations passed for both panels; no horizontal overflow; measured text contrast at least 9.93:1; fields 14 px |
| Source/public equality, syntax, scoped whitespace, catalog JSON | Passed |

- Dedicated paired-model browser checks cover actual results, captured controls, pause/step/speed, and cancellation.
- A complete notebook browser workflow launches both trials, saves selected evidence, clears the log, restores serialized state, and checks the copied report.
- Notebook unit tests cover atomic presets, draft preservation, mission guards, current-state saving, limits, deletion, reopening, and clipboard fallback.
- Evidence unit tests cover immutable copies, malformed saves, stable IDs, counter recovery, comparisons, units, assumptions, and translated reports.
- Mobile checks use actual application styles at 320 and 375 pixels in default, dark, and high-contrast themes. They check document/panel overflow, field sizing, and computed text contrast for both new panels.

The dedicated physics CI workflow now includes both new browser suites. It was updated locally and has not been run on GitHub during this task.

Reproduce the browser acceptance checks:

```powershell
npx playwright test tests/e2e/physics-model-comparison.spec.ts tests/e2e/physics-investigations.spec.ts --workers=1 --retries=0
node reports/physics-investigations-2026-09-27/verify-notebook.cjs
```

Visual evidence: [measurements](visual-results.json), [notebook at 320 px](notebook-default-320.png), [high-contrast model comparison at 320 px](models-contrast-320.png).

## Scope and next opportunities

Source and desktop files are synchronized. The new English strings are registered in both catalogs; non-English packs use the established English fallback until translated. Verification uses local component harnesses, and no deployment was performed.

The simulator still launches and lands at ground level with uniform gravity and a fixed quadratic drag factor. Launch height, elevated targets, and wind remain separate future model extensions. The notebook saves the current draft and immutable reports; editing an archived report in place is not part of this pass.

### September 28 follow-up

[Elevated launches and horizontal-motion investigations](../physics-launch-height-2026-09-28/README.md) now add launch height from 0–50 m, height-aware predictions and saved evidence, and a fourth guided activity. Elevated targets and wind remain future extensions.
