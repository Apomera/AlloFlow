# Physics: recorded settings and repeat trials

Recorded flights now show a readable settings card across Motion, Forces, Energy, and Data. Each changed control shows its planned next-launch value beneath the original value.

## Improvements

- Names the original launch angle, speed, gravity, mass, launch height, and air drag, with units and run identity.
- Shows whether the next launch matches, changes one setting, or changes several settings. A single action prepares the original six settings for a repeat trial.
- Keeps the selected recorded sample, active view, paused playback, complete evidence, and CSV intact when settings are applied. A new repeat launch reproduces the original recorded points.
- Blocks settings reuse during unfinished flights, pending demonstrations, and active missions, challenges, or battles. Queued and stale actions recheck the current controller and retained evidence.
- Adds original sample numbers to the shared timeline and sparse Data rows, plus a Show on trajectory action that focuses the same selected point on the canvas.
- Uses wrapping cards, grouped values and units, visible keyboard focus, readable disabled controls, and three themes at phone and desktop sizes.

## Verified results

- **356 unit checks passed across 21 files**, including 13 new atomic-update and stale-event cases.
- **82 browser cases passed across 13 files**, with one local Chromium worker and no retries.
- **Nine visual configurations passed**: 1,100, 375, and 320 pixels in light, dark, and high-contrast themes. No horizontal page overflow; minimum text size 12 px; both actions at least 44 × 44 px.
- Minimum measured text contrast: **5.20:1**. Nineteen screenshots cover settings, recording history, and the phone Data table. Previous dated reports are preserved.
- Source and desktop mirror match SHA-256 `34db61cc62bdb6b6a10a3ef6932225e7deaba2fa310d29a690911ad80ef9279c`. The simulation and recording prefix matches the prior physics commit. All 15 new English labels exist in both catalogs.

The browser cases use the repository’s local React harness, actual canvas controller, and compiled app stylesheet. They check original observations and exported CSV. These results cover the local code; a deployed build was not exercised.

Changes were left uncommitted.

## Reproduce

Run from the repository root after installing the project dependencies and local Chromium:

```powershell
node reports/physics-recorded-context-2026-10-02/run-context-checks.cjs
```

The runner executes units and browsers sequentially, then checks the saved reports, original simulation prefix, mirror, catalog keys, and screenshots. The physics CI workflow includes the new browser suite.

## Screenshots

| Theme | Desktop | 375 px | 320 px |
| --- | --- | --- | --- |
| Light | [Open](context-default-1100.png) | [Open](context-default-375.png) | [Open](context-default-320.png) |
| Dark | [Open](context-dark-1100.png) | [Open](context-dark-375.png) | [Open](context-dark-320.png) |
| High contrast | [Open](context-contrast-1100.png) | [Open](context-contrast-375.png) | [Open](context-contrast-320.png) |

[Phone Data table](context-data-320.png) · [Recording history at 320 px](recording-regression/recordings-default-320.png) · [Verification](verification.json)
