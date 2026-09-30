# Guided physics trial workflow

## Changes

- Guided activities show a card for each trial with the latest matching completed run, current-control status, and an Apply button. The full activity title wraps above the cards on narrow screens.
- **Select recorded trial pair** selects the matching measurements in trial order. It preserves the student's title, prediction, observations, and launch settings.
- **Reference run** changes the baseline for draft comparisons and exported reports. Existing saved reports retain their original copied evidence and reference order.
- **Go to launch controls** moves keyboard focus and scrolls to the Launch button.

Evidence matching requires all six captured launch settings and the current numerical model version. The helper validates completed observations and chooses the largest matching run ID. Current controls, a paused trajectory, or an interrupted flight cannot establish completed trial evidence. Valid legacy measurements remain available for manual selection and their existing provenance warnings.

Restored observations with missing or non-boolean captured air-drag flags are rejected instead of defaulted to drag off.

Selection callbacks read the current log and activity at click time. Clearing the log or switching activities cannot make an old callback select missing or unrelated evidence. Trial progress is derived from recent records, so it also recovers when the session is restored.

Numerical integration, archived report format, and saved-state schema are unchanged. Both source mirrors and English catalog physics sections match.

## Verification

- **220 unit checks passed** across 15 files, including 41 new matching, restoration, and stale-callback checks.
- **56 browser cases verified:** 22 new guided-trial cases and 34 existing investigation, recorded-history, model-comparison, and flight-integrity cases. They cover all four activities, repeated trials, interrupted flights, model provenance, reference changes, restored archives, mission locks, keyboard use, and themes.
- **Nine final visual configurations passed:** default, dark, and contrast at 1100, 375, and 320 px. Checked text is at least 12 px with a minimum contrast of 5.900:1. Controls are at least 44 px high; there is no page overflow or browser error.
- Physical evidence hashes match the desktop and phone baselines. Selecting trials, changing the reference, and navigating to Launch preserve recorded samples and measurements.

The audit collects three real flights: the two speed trials plus an unrelated third flight. The captured trial pair remains correct after current launch controls change. Source and evidence hashes are recorded in `trials-results.json`.

The broad browser run passed 55 cases. The 320 px default guided-trial case completed its assertions and unmounted the page, then timed out during Chromium context cleanup. That case passed a focused rerun, including cleanup, with a separate output folder. The source stayed unchanged between runs.

## Reproduction and artifacts

```powershell
node reports/physics-guided-trials-2026-09-29/verify-trials.cjs
node node_modules/vitest/vitest.mjs run tests/physics_ --maxWorkers=1 --pool=threads --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/physics-guided-trials.spec.ts tests/e2e/physics-investigation-evidence.spec.ts tests/e2e/physics-investigations.spec.ts tests/e2e/physics-flight-history.spec.ts tests/e2e/physics-comparison-visuals.spec.ts tests/e2e/physics-flight-integrity.spec.ts --workers=1 --retries=0
```

- `trials-before-*.png`: original desktop and phone controls.
- `trials-{default,dark,contrast}-*.png`: nine final layouts.
- `trial-selection-*.png`: selected evidence and explicit reference controls on desktop and phone.
- `trials-results.json`: final layout, contrast, control geometry, and evidence audit.

The new browser spec is included in `.github/workflows/physics.yml`.
