# Physics simulator: explore recorded flight points

September 29, 2026. This pass extends the [visual redesign](../physics-visuals-2026-09-28/README.md) with linked inspection of recorded observations. Changes remain local and uncommitted.

## Using the inspector

1. Launch a projectile. Pause and choose **Inspect paused motion & energy**, or select a time in **Flight Data**.
2. Move the recorded-flight slider, use Previous/Next, or jump to the launch, highest recorded point, or latest point. The native slider supports keyboard navigation.
3. Read position, signed velocity, speed, and energy in the inspection cards. Expand **Forces & acceleration** for the force components and acceleration.

The selected point has a distinct ring on the trajectory, matching cursors on both velocity graphs, and a highlighted table row. Its time and recorded launch settings stay visible. The camera fits the recorded flight even after the next launch's controls change. Closing the inspector restores the normal view. Resuming, stepping, launching again, or clearing trails removes the historical selection.

The inspector pauses playback without moving the simulated projectile. It reads the full recorded sample sequence, including the shortened final integration step. Selecting a point does not change the samples, completed results, saved run log, or CSV export.

## Visual improvements

- Canvas annotation cards now have connector lines to the actual prediction, apex, landing, release, or selected point. Placement keeps cards and connectors clear of other markers and labels.
- Selected-point telemetry and energy use the same captured observation as the cards. Velocity readings include units.
- The inspection panel uses responsive cards, visible units, captured-setting chips, and an expandable force section. Explicit opening moves focus to the slider, with a section fallback for a single recorded point.
- The Flight Data table has theme-aware colors, readable headers, velocity units, and a labelled scroll region on phones. Its summary includes the launch and latest points plus the current selection; CSV still contains every point.
- Each velocity graph highlights the selected full-resolution sample. A paused launch at time zero supports a one-point graph. The ideal range-versus-angle chart continues to describe the current launch controls.

## Scientific interpretation

The numerical model remains **`projectile-v3`**. Inspection adds no integration or resimulation. Force and energy values are derived from the selected recorded position and velocity using that flight's captured mass, gravity, launch speed, launch height, and drag setting.

The highest recorded point is the highest stored sample; the exact apex can lie between samples. At impact, measurements describe the arriving projectile immediately before ground contact. The simulator stops at contact and does not calculate the collision force.

Snapshots are frozen scalar copies. Missing, unsupported, or invalid numerical evidence is rejected instead of filled from current controls. Selection is transient and tied to the latest trail object, preventing a new flight from inheriting an old index. Existing saved text inspections remain readable.

## Verification

| Check | Result |
| --- | --- |
| Complete physics unit suite | **159 tests passed across 13 files**, including 11 new inspection contracts |
| Complete physics browser suite | **34 scenarios passed across 8 files**, retries disabled |
| Responsive inspector audit | **9 combinations passed**: three widths × three themes |
| Inspector and data-table text | **12 px minimum** in the screenshot audit |
| Measured text contrast | Minimum **5.20:1 default**, **6.79:1 dark**, **15.30:1 high contrast** |
| Horizontal page overflow | **Zero** in all nine audited layouts |
| Source/desktop parity, syntax, catalogs and report links | **Passed** |

The final focus review identified that closing the inspector removed its focused button. Closing now returns focus to the persistent Inspect action. After that correction, all **4 inspection browser scenarios** and **4 control/focus unit checks** passed again; these are subsets of the integrated totals. The nine screenshot combinations were captured from that final implementation.

The audit selects a point from an elevated drag flight, changes the current launch controls, and verifies that the canvas, graphs, and inspector continue to use the captured observation. Ball state and every recorded sample remain unchanged. The browser suite separately checks saved records and identical full CSV output before and after selection.

- [Sample calculation contracts](../../tests/physics_sample_inspection.test.js): independent energy/force checks, captured settings, immutable snapshots, short-flight impact time, and invalid evidence.
- [Linked inspection browser scenarios](../../tests/e2e/physics-sample-inspection.spec.ts): keyboard selection, synchronized canvas/graph/table readings, lifecycle resets, unchanged evidence and CSV, one-point elevated launch, and phone themes.
- [Canvas visual regressions](../../tests/e2e/physics-visual-layout.spec.ts): true annotation anchors, connector bounds and card edges, readable text, marker clearance, vectors, and post-landing previews.
- [Screenshot audit](verify-inspection.cjs): 1100, 375, and 320 px in default, dark, and high-contrast themes, using the local React harness and application stylesheet.

The dedicated physics CI workflow includes the new browser suite. Tests and audits in this report run locally; GitHub CI and deployment are outside this pass.

All 36 new labels are registered in both English catalogs. Other language packs use the existing English fallback until translated. No commits were created.

## Preview files

- [Desktop inspector](inspection-default-1100-inspector.png)
- [Phone inspector](inspection-default-320-inspector.png)
- [Selected flight point](inspection-default-1100-canvas.png)
- [Linked velocity graphs](inspection-dark-320-graphs.png)
- [Phone data table](inspection-contrast-320-data.png)
- [Measured results](inspection-results.json)

Reproduce the screenshot audit:

```powershell
node reports/physics-inspection-2026-09-29/verify-inspection.cjs
```
