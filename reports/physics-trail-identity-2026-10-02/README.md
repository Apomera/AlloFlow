# Physics: clearer flight comparisons

Flights launched at the same angle now have distinct line patterns. The focused flight keeps its solid speed colors, and the legend identifies each original run, its launch settings, and whether it used air drag.

## Changes

- Retained paths keep their patterns through selection, comparison toggles, and completion. Unfinished paths receive an explicit label without inventing a completed run number.
- The vacuum reference uses the selected flight's captured angle, speed, gravity, and launch height, including when a newer flight is paused. The next-launch preview has its own caption and settings.
- Each legend swatch matches the canvas path's pattern, color, and opacity. High contrast updates immediately in both directions.
- The selected swatch uses explicit SVG coordinates so its horizontal speed gradient paints correctly. Narrow screens use one column; desktop uses a responsive grid.

Patterns belong to the current canvas presentation. Completed saved flights restore their run-based patterns; an interruption-derived slot assignment can change after reopening. Original run identities and recorded observations are preserved.

## Verification

- **356 unit assertions across 21 files**, all passed in one complete run.
- **28 browser cases across six files**, all passed with one worker and no retries.
- Nine comparison layouts and nine point-inspection layouts cover 1100, 375, and 320 pixel widths in default, dark, and high contrast themes. No page overflow; minimum measured font is 12 px.
- Minimum measured contrast, rounded to two decimal places: comparison legend text 11.64:1, canvas paths against the captured scene 9.07:1, actual focused-swatch pixels 5.87:1, and point-inspection text 8.79:1. Every high contrast layout exceeds 7:1.
- Every focused swatch's center pixels match independently calculated cyan, amber, and rose interpolation across 50 CSS pixels. A temporary old-gradient mutation produces blank paint and fails the detector; restoring the coordinates restores the visible gradient.
- **37 positive captures and one negative-control capture** are verified. All 51 historical artifacts retain their original hashes.
- Numerical and recording helpers match baseline commit `54d638b3213b0fbd484305feff43b769da8902f7` after line-ending normalization. Both simulator copies match, and original selected points, recordings, and CSV remain intact through the tested visual interactions.

Canvas contrast uses actual scene pixels captured before the reference, comparison paths, and focused glow are drawn in the same verified frame. Contrast with overlapping paths is recorded separately in the diagnostic JSON.

Earlier startup failures, fixture corrections, and results from preceding source versions remain in their named archive folders. The final report contains only the final source's results. The blank-gradient reproduction is in `gradient-negative-control`.

## Results

[Verification summary](verification.json) · [Desktop comparison](trails-default-1100.png) · [320 px comparison](trails-default-320.png) · [High contrast comparison](trails-contrast-375.png)

## Reproduce

Run from the repository root with Node 24.19.0:

```powershell
node reports/physics-trail-identity-2026-10-02/run-checks.cjs
node reports/physics-trail-identity-2026-10-02/verify-report.cjs
```

The local run used the bundled executable at `C:\Users\cabba\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`. The private Playwright configuration disables video encoding while retaining trace and screenshot diagnostics. Test budgets and contrast thresholds are unchanged.

Source SHA-256: `71e2d584e2e0b64f910150af0ba344830057312e737d09bf65d02d97e54c0c64`.

The enhancements are left uncommitted.
