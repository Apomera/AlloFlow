# Micro Lab: visual Resistance histories

Micro Lab already includes an animated 80-cell Resistance petri dish with play/pause/step controls, a virtual microscope with focus and magnification, Growth comparison curves and condition sweeps, Gram stain models, and an illustrative Snow investigation map.

This pass adds two visual histories inside **Resistance → Compare saved resistance snapshots**. Choose A and B, then use **Shared comparison round** to inspect the plots alongside the saved counts.

- Resistant-cell counts use a fixed 0–80 scale; resistant share uses 0–100%.
- A uses a solid line and circles. B uses a dashed line and outlined diamonds, so overlapping observations remain distinguishable.
- The selected round has a guide, larger markers and exact HTML readouts. Axis labels stay at normal text size on phones and enlarged layouts.
- The history table keeps whole words readable on narrow screens inside a named region that supports keyboard horizontal scrolling.
- Plots and the accessible history table show only rounds observed in both saved histories. Extinct populations have a real zero resistant-cell count and an undefined resistant share; no share point or line is fabricated.
- Original endpoints, notes, downloads, live playback and XP keep their existing behavior. Inspection reads saved observations without drawing new random outcomes or tracking individual cells between observations.

## Validation evidence

The final suite covers **1,059 unit checks across 28 files** and **84 Chromium scenarios across 13 specs**, including 32 new unit checks and six new browser scenarios. The browser checks verify actual SVG geometry, fixed axes, selected points, extinction, keyboard controls, reloads, real downloads, raw metadata, live playback independence, 320px phones and 400% zoom.

[Validation summary](validation-summary.json) binds the final source hash to raw test results and pre/post input hashes. Both runtime mirrors and all 1,916 source-used interface labels are checked. The PNG helper is included among the captured support inputs.

Earlier focused reports remain available. The first unit sandbox attempt failed during temporary-cache startup before running tests. Subsequent checks found assertions scoped to the old single table or an SVG’s immediate parent; these now target the relevant comparison table, figure and accessible label references. Browser checks also found a chart that was too narrow on a 320px phone; the figure and axis spacing were refined.

The first full run was interrupted by a session reset. Its partial results remain as diagnostic evidence. Separate `unit-final` and `browser-final` runs passed completely. Screenshot review then found fragmented history table headers on narrow screens; a minimum table width and keyboard scrolling checks address that issue. The final verification uses the `unit-polish` and `browser-polish` reports and runner receipts.

The first focused table check used a fixed number of arrow presses that stopped short at 400% zoom. The corrected check presses until each actual scroll endpoint is reached. All six focused visual scenarios then passed, including complete keyboard access to the widened table.

## Local save

The focused tree continues verified Micro Lab commit `f771918`. It contains the runtime pair, new visual tests, a more precise existing table assertion, validation artifacts and fifteen visual history interface labels. Registry blobs are built from the parent with only those fifteen labels added, preserving unrelated translation work. Private Git indexes and an independent verifier protect the shared checkout and staging.
