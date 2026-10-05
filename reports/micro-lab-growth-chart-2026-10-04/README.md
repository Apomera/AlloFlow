# Micro Lab: selected model hour on the Growth chart

This pass adds a guide and exact control/trial values for the selected model hour. The chart uses the same hour as Growth citations and notebook comparisons. Saved predictions and outcomes continue to refer to hour 24.

The visuals use fixed 0–100 arbitrary population units and 0–24 model-hour axes. A dashed control line with an open circle marker and a solid trial line with a diamond marker identify the two series. The selected-hour readout reports control, trial and trial minus control. HTML axis labels and fixed-size marker shapes stay readable as the plot resizes. The selected hour is also highlighted in the accessible data table. In forced-color mode, the curves use system CanvasText and LinkText colors and the guide uses CanvasText.

The chart, citation and notebook selectors share one updater. It changes only growthReviewHour in the latest raw state. The previous generic updater also inserted unrelated display defaults into minimally imported notebooks when an hour was selected. Inspection now preserves the original notebook, settings, notes, metadata, predictions and outcomes without adding those fields.

## Validation scope

The final candidate passes 1,059 unit checks across 28 files and 37 targeted Chromium scenarios across seven specs. The passing phases are `unit-contrast-retry` and `browser-contrast-final`, with zero failures, skips, flaky scenarios or browser retries.

The final candidate is mirrored and syntax checked at SHA-256 `1d85b9949990de9b65108d1de5f500d9bfdd8f246c4b29a4a36e72010c684762`.

The unchanged Micro Lab unit suite contains 1,059 checks across 28 files. The targeted Chromium suite contains 37 scenarios across seven specs: annotation integrity (7), experiment design (6), Growth citations (7), guided resume (5), Growth inspection/export (2), Resistance live visuals (5), and the new Growth visual inspection scenarios (5). This is the relevant browser regression scope for this change. The runners capture 35 test files and ten support inputs, totaling 45 distinct inputs.

Both runtime files must match the final candidate before and after each run. The audit checks the exact file/case counts, zero failures, skips or flaky scenarios, zero retries, raw runner receipts and all captured input hashes. It also checks 1,932 source-used interface labels, the eight new Growth chart labels and registry namespace equality.

## Visual review

The primary agent and an independent agent reviewed six final screenshots: desktop at hour 6, the hour-24 boundary, overlapping series at hour zero, a 320px phone, 400% enlargement and forced colors. Both selected shapes remain visible at the boundaries and when curves overlap. Numeric ticks stay on one line, readouts stack on narrow screens, and focus remains visible. The white forced-color canvas now shows a clear dark dashed control, dark-blue solid trial and dark guide. Browser checks measure at least 3:1 curve and guide contrast against system Canvas in light and dark forced-color palettes. `visual-review.json` records the screenshot hashes and observations.

## Retained diagnostics

The initial focused run passed two scenarios and failed three. One fixture used two optimal profiles that produced identical control curves; its next-run control was changed to a distinct temperature. One assertion assumed that transparent forced-color backgrounds always have black RGB components; it now checks transparency. The state comparison exposed the generic hour updater's unrelated default writes, which were corrected in all three selectors. The refined focused run passed all five scenarios. Screenshot review then found a wrapped hour-24 label; numeric ticks now stay on one line, and browser assertions verify rendered tick height. The next candidate passed 1,059 unit checks and 37 targeted browser scenarios. Independent screenshot review found low-contrast yellow/green curves on the white forced-color canvas; scoped media rules now use system colors, with measured contrast assertions for both palettes. Earlier results and receipts remain available and are excluded from the final passing counts.

The first unit run on the forced-color refinement timed out while starting its single worker. It executed zero tests. The installed runner's worker startup limit is fixed; after available memory recovered, the unchanged suite was retried under a new phase name. The unsuccessful startup receipt is retained and excluded from the final validation.

## Focused local save

The focused tree continues verified Micro Lab commit 827b7bd6374c3d950b29204bd1ec3e93af314311. It contains the canonical/desktop runtime pair, the new Growth visual browser spec, eight Growth chart labels and this report's artifacts.

Registry blobs are built from the immutable parent with exactly those eight labels added. Other working registry changes stay outside this focused tree. Private Git indexes preserve the shared checkout and staging. Runtime, test and report files use exact byte seals. Registry guards seal all 2,051 Micro Lab labels in sorted key order against the immutable tree, so unrelated namespace edits and key ordering can continue while every Micro Lab label remains fixed. Publication keeps an intent receipt before updating the new local branch.

Verification after the local save checks the immutable tree, the full sealed Micro Lab namespace, current source-used labels and the eight Growth chart labels. Unrelated whole-registry hash drift is reported explicitly. Commit identifiers, shared-index preservation and final verification are recorded in the local commit receipts beside this report.
