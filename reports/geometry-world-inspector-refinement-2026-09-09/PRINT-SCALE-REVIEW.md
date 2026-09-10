# Selected-creation print scale review

The highest-value bounded improvement is an editable physical scale in the existing **Printer profile & scale** disclosure. It currently explains the scale and printer limits but offers no adjustment; an over-limit build instructs the user to choose a smaller scale in Print Lab.

The current dock already distinguishes the retained creation, offers Select/Clear/Focus/Showcase, labels width/depth/height in millimeters, marks individual over-limit axes, and warns about topology. `geometry_world_dock_selection.test.js` verifies that an unrelated inspector measurement does not change the exported selection; `geometry_world_print_presentation.test.js` covers labeled dimensions, printer profile limits and retained scale. Those controls should be retained.

## Bounded implementation

Add 5/10/20 mm-per-block presets plus a labeled custom numeric value and Apply action inside the existing disclosure. Use `builderPrintContext.unitMm`, merging into the live context rather than replacing it. This preserves AI context fields and uses the established export pipeline:

- `printContext` / `printUnit` supply the scale.
- `defaultPrintEnvelope` and `printVolumeSentence` update size, fit and occupied volume.
- `selectedBuildStlDownload` scales a copy of the selected STL coordinates.
- `openSelectedBuildInPrintLab` passes the same `unitMm` alongside the original block-unit geometry.

No construction transforms, selection, camera or exported source model need to change. Keep the existing block-envelope caveat because its dimensions are conservative whole-cell extents for fractional shapes.

## Main risks and verification

`printUnit` silently defaults invalid values to 5 and clamps values into 0.01–1000. The form should instead retain an independent draft, reject blank/nonfinite/out-of-range input on Apply, show an accessible inline error and leave the applied scale unchanged. Preserve the advisory export workflow, rather than blocking export solely because the conservative envelope exceeds the bed.

Verify preset/custom/reset transitions, invalid drafts, returned Print Lab context including AI fields, immediate size/volume/fit updates, and exact geometry/history/selection preservation. Check the download's coordinate scale factor and the handoff's `unitMm` against the same applied value. Numeric editing must continue to suppress world keyboard shortcuts, and preset/Apply controls should retain 44 px targets on phones.

Read-only source review; no production edits or test runs were performed for this recommendation.
