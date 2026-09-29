# Physics simulator: visual redesign

September 28–29, 2026. This pass follows the [launch-height enhancement](../physics-launch-height-2026-09-28/README.md). It updates the local simulator and its desktop copy.

Follow-up: [recorded flight inspection](../physics-inspection-2026-09-29/README.md) adds a sample timeline, linked canvas and graph markers, structured measurements, and annotation connectors.

## What changed

### Flight scene

- Replaced the decorative landscape with a dark plotting surface, a meter grid, and labeled distance and height axes. The grid follows the physical scale.
- Fit the camera to the predicted flight and active targets. A typical ground-level flight now uses the available phone plot instead of occupying a small corner of a fixed 350 m view.
- Separated launch settings and live readings at the top from energy readings at the bottom. The launcher marks the actual release position, including elevated launches.
- Added a dashed vacuum preview before launch and a continuous cyan–amber–rose speed scale along measured trails. A numeric legend explains the colors.
- Wrapped and positioned prediction, apex, landing, height, and run labels to stay inside the plot without covering one another or the projectile. Important measurements take priority when space is limited.
- Kept the next-flight preview responsive after landing. Old trails are clipped to the plot, and labels for measurements outside the current view are hidden.
- Used one scale for the velocity arrow and its horizontal and vertical components. Arrows stay inside the plot, follow the vector toggle, and disappear at landing. Signed vertical velocity remains visible in the live readings.
- Removed the fixed “wind” arrow: the current model simulates drag opposing motion and has no wind parameter.

### Controls and learning panels

- Added a compact header with launch metrics, the recommended next action, and the learning sequence.
- Grouped launch actions, view controls, and playback controls. Parameter cards now emphasize their current values and use filled slider tracks.
- Preserved a usable width in embedded flex layouts as well as full-page layouts.
- Gave last-flight results, evidence, missions, and learning panels consistent spacing, borders, typography, and theme colors.
- Rebuilt motion graphs with readable axes, stronger curves, endpoint markers, and initial-to-latest velocity summaries.
- Moved current and optimal angle values into dedicated cards around the range graph, keeping the curve and axis labels clear.

The numerical model remains `projectile-v3`. This pass changes presentation; the unit and browser regressions cover calculations, saved evidence, exports, investigations, and paired-model comparisons.

## Visual evidence

- [Desktop flight overview](visual-flight-1100-overview.png)
- [Paused flight on a phone](visual-flight-320-canvas.png)
- [Phone flight scene](visual-default-320-canvas.png)
- [Dark phone overview](visual-dark-320-overview.png)
- [Phone motion graphs](visual-default-320-motion.png)
- [Dark phone range graph](visual-dark-320-range.png)
- [High-contrast scene](visual-contrast-320-canvas.png)
- [Completed elevated flight](visual-dark-landed.png)
- [Measured visual results](visual-results.json)

The visual audit checks 1100, 375, and 320 px widths in default, dark, and high-contrast themes. It measures actual canvas text and scaled SVG text, horizontal overflow, annotation placement, formula contrast, the release-height transform, paused energy, and a 50 m drag landing. These checks use the local React harness and the application stylesheet.

## Verification

| Check | Result |
| --- | --- |
| Complete physics unit suite | **148 tests passed across 12 files** |
| Complete physics browser suite | **29 scenarios passed across 7 files**, retries disabled |
| Responsive visual audit | **9 combinations passed**: 1100, 375, and 320 px in default, dark, and high-contrast themes |
| Canvas typography | **12 px minimum**, measured from actual drawing calls |
| Scaled graph typography | **14.95 px minimum** across the nine audited layouts |
| Formula text contrast | Minimum **5.48:1 default**, **8.11:1 dark**, **19.56:1 high contrast** |
| Horizontal overflow and annotation overlaps | **Zero** in the audited layouts |
| Source and desktop copy, syntax, English catalog parity | **Passed** |

The first browser attempt exposed a width collapse caused by CSS inline-size containment in a flex host. Explicit sizing corrected it; the complete rerun passed. The final review also corrected stale previews after landing, off-screen measurement labels, and cards covering the projectile. All browser work used the local source; this task did not run GitHub CI.

After the full suites passed, Clear Trails moved into the playback group to prevent an oversized grid cell. All **4 control/focus unit checks**, **3 visual browser scenarios**, and **9 screenshot-audit combinations** passed again after that final layout adjustment. These focused checks are subsets of the totals above.

The new [visual layout browser suite](../../tests/e2e/physics-visual-layout.spec.ts) checks 18 scene states at desktop and phone widths across all three themes, with a device pixel ratio of 2. It measures the actual `fillText` calls rather than relying on reported font metadata. A second scenario checks descending high-speed vector geometry, the vector toggle, and recorded samples against independent constant-gravity equations. A third completes a long flight and changes to a short launch, checking the new preview, actual trail clipping, removal of off-screen labels, and preservation of saved samples and records. The existing behavior suite now explicitly checks canvas width in its embedded flex host.

The dedicated [physics CI workflow](../../.github/workflows/physics.yml) includes these checks. The standalone screenshot audit can be reproduced with:

```powershell
node reports/physics-visuals-2026-09-28/verify-visuals.cjs
```

New labels are registered in both English catalogs. Other languages retain the existing English fallback until translated. Local browser checks do not establish coverage for every browser or assistive technology. The application has not been deployed by this task.
