# Physics: inspect recorded moments from the plot

The flight cards now let users choose a recorded flight directly beside the plot. The selected flight exposes its original launch, apex, and impact points, with shortcuts to the full analysis and back to the current or latest flight.

## Changes

- Native buttons support mouse, Enter, and Space. Each card keeps its original run, launch settings, line pattern, and speed swatch. Pressed state identifies an actual inspected flight.
- Moment shortcuts select original recorded indices. Rising flights offer “Latest point”; a canonical horizontal apex uses “Highest point at release.” Older recordings without a resolved apex use “Highest recorded point.” Duplicate indices appear once, in chronological order.
- Selecting an older flight pauses the current ball. Closing inspection keeps playback paused, and resuming continues the current flight from its original state.
- Unfinished paths keep the same identity in the plot, history picker, analysis heading, recorded settings, and accessible selected-sample status. A live card keeps its DOM identity and keyboard focus through landing.
- Visible focus outlines, targets at least 44 × 44 px, and wrapping controls support narrow screens. Closing inspection returns focus to its original card or an available history/inspection control.

Path labels and DOM keys belong to the retained canvas session. They do not add run numbers to unfinished recordings or change saved observations.

## Verification

- **356 unit tests across 21 files** passed in one complete final run.
- **26 browser cases across five files** passed with one worker and no retries: new plot controls, comparison paths, flight history, apex inspection, and velocity clarity.
- Nine new layouts cover 1100, 375, and 320 px widths in default, dark, and high contrast themes. Existing comparison and point-inspection layouts also passed.
- New controls have no page overflow or clipped text. Minimum measured font: 12 px; text contrast: 8.24:1; actual focus-outline contrast: 9.55:1; rendered selected-swatch contrast: 5.87:1. Report minima are rounded to two decimal places. All high contrast layouts meet the 7:1 threshold.
- Actual PNG pixels verify all four sides of the focus outline and the selected SVG speed gradient. Plot captures also require the painted scene and selected original-point marker.
- **64 positive screenshots** are retained across the three visual report sets, along with the existing comparison-gradient negative control.
- Exact selected samples remain linked across the canvas, graphs, table, and CSV after changing every launch control. Ball state, original trail points, recordings, launch counts, and logs remain intact through selection and focus changes.
- Both simulator copies match. Numerical and recording helpers still match baseline commit 54d638b3213b0fbd484305feff43b769da8902f7 after line-ending normalization. All **122 protected files** from previous completed reports retain their hashes.

The history-heading failure and its source version remain in `before-history-heading-fix`. The screenshots captured before the test clock delivered resize redraws remain in `before-canvas-capture-fix`. The final captures use the normal browser animation cycle while the selected flight is paused.

## Results

[Verification summary](verification.json) · [Desktop controls](plot-inspection-default-1100.png) · [320 px controls](moment-focus-default-320.png) · [High contrast controls](moment-focus-contrast-375.png)

## Commands used

The completed run used these commands from the repository root with Node 24.19.0:

```powershell
node reports/physics-plot-inspection-2026-10-04/run-checks.cjs --prepare --unit --plot --trail --regression --point
node reports/physics-plot-inspection-2026-10-04/verify-report.cjs
```

The runner refuses existing suite or visual outputs. Preserve each completed run's results, manifests, and source/test versions in a new archive before rerunning. Keep the existing diagnostic archives in place.

The local run used `C:\Users\cabba\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`. The private browser configuration disables video encoding and retains failure traces and screenshots.

Source SHA-256: `0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28`.

The enhancements are left uncommitted.
