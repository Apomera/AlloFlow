# Physics: recorded point clarity

Selecting a recorded point now shows its phase or event, height above ground, and time directly on the trajectory. The header identifies the recording, so the point card can focus on the selected moment.

## Changes

- Point cards distinguish Launch point, Rising, At apex, Falling, Vertical velocity is zero, and Ground impact.
- A canonical horizontal-launch apex at time zero reads Highest point at release. An unresolved release remains Launch point; the highest sample in an unfinished ascent remains Rising.
- Height and time come from the original selected observation. Small signed vertical velocities keep their phase near the apex, and changing all six next-launch settings preserves the selected card and CSV evidence.
- Selecting launch, exact apex, or impact replaces the duplicate event card while keeping its marker ring visible.
- Wider inspection cards have eight extra placement choices around the complete reserved arrow bundle. Every choice uses the existing marker, card, plot-boundary, and leader collision checks.

## Verification

- 356 unit tests passed across 21 files.
- 18 browser cases passed across 4 files, using one worker and no retries.
- Nine visual configurations cover 1100, 375, and 320 pixel widths in default, dark, and contrast themes. Every selected card remains visible, matches the original point, and clears actual velocity and gravity shafts and arrowheads.
- No page overflow. Minimum measured font: 12.00 px. Minimum measured text contrast: 8.79:1.
- Numerical and recording helpers match baseline commit 54d638b3213b0fbd484305feff43b769da8902f7 after line-ending normalization. Source and desktop copy are identical; 31 earlier report captures retain their original bytes.

The first visual run exposed a missing wider card in a crowded plot and a measurement issue that counted grid text painted beneath an opaque card. The final source adds safe placement choices; the recorder now measures text painted after its matching card fill. Initial results and traces are retained in initial-layout-results.json and initial-layout-artifacts.

## Visuals

[Phone flight view](velocity-default-320.png) · [Desktop flight view](velocity-default-1100.png) · [Contrast flight view](velocity-contrast-320.png)

[Exact apex](selected-apex.png) · [Highest point at release](horizontal-release-canonical-apex.png) · [Unfinished ascent](unfinished-highest-rising.png)

## Reproduce

Run from the repository root:

```powershell
node reports/physics-point-clarity-2026-10-02/run-checks.cjs
node reports/physics-point-clarity-2026-10-02/verify.cjs
```

Source SHA-256: `6a03a494f50e75343ab912f205832db79bfa287eff45a0a577a1e774f9aebdd1`.

The enhancements are left uncommitted.
