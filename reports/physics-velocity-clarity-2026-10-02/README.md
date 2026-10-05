# Physics: velocity and trajectory clarity

The flight view now distinguishes launch speed from the speed at the displayed point. Directional component arrows and a named legend explain how velocity changes through the flight.

## Changes

- The launch header labels speed as v₀. The live or selected point shows its current speed |v|, calculated from the displayed horizontal and vertical components.
- Dashed horizontal and vertical arrows have solid heads that follow their signed direction. Exact zero draws no component arrow, and tiny nonzero components retain their proportional length.
- Small live values keep their sign and magnitude instead of rounding to a misleading zero near the apex.
- The legend names total velocity, horizontal velocity, vertical velocity, and gravity. Patterns and units distinguish velocity from downward acceleration. It explains the shared velocity scale, separate gravity scale, and speed at the apex.
- Annotation cards reserve space around the complete arrow bundle so labels cannot cover shafts or arrowheads.

## Verification

- 356 unit tests passed across 21 files.
- 52 browser cases passed across 10 files, using one worker and no retries.
- Nine velocity layouts cover 1100, 375, and 320 pixel widths in default, dark, and contrast themes. Actual painted cards, arrows, and glyphs were measured.
- Every layout keeps the selected-point annotation visible and clear of all velocity and gravity arrows.
- No page overflow. Minimum measured font: 12.00 px. Minimum text contrast: 8.79:1. Minimum symbol contrast: 7.32:1.
- The speed reading stays at least 110.38 px clear of the gravity and mass readings.
- Numerical and recording helpers match baseline commit 54d638b3213b0fbd484305feff43b769da8902f7 after line-ending normalization. Recorded points, captured settings, and CSV output retain their original values.
- Source and desktop copy are identical. All 21 earlier report captures were restored; this run retains its new copies in context-regression and recording-regression.

An initial broader run exhausted memory in test workers. Its results and failure evidence are preserved in memory-limited-browser-results.json and memory-limited-browser-artifacts. The final run uses a smaller worker heap and nursery.

## Visuals

[Phone flight view](velocity-default-320.png) · [Desktop flight view](velocity-default-1100.png) · [Contrast flight view](velocity-contrast-320.png)

## Reproduce

Run from the repository root:

```powershell
node reports/physics-velocity-clarity-2026-10-02/run-checks.cjs
node reports/physics-velocity-clarity-2026-10-02/verify.cjs
```

Source SHA-256: `596e6ca995da835bc29767b4671d491be3af1e535131c3abed0a65c5e6f6b4e9`.

The enhancements are left uncommitted.
