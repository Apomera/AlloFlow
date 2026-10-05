# Micro Lab: live Resistance visual dashboard

This pass improves the live Resistance simulation beside the saved A/B history plots. It adds clearer population counts, an 80-position capacity bar, and a labeled resistant-share trend with a current-round indicator. Sensitive cells, resistant cells and unoccupied positions have distinct visual cues.

The capacity bar uses all 80 model positions. Resistant share uses only living cells, so the bar and percentage answer different questions. The visual changes preserve the existing simulation, controls, saved evidence, downloads, notes and XP.

The dish uses cyan circles for sensitive cells, rose diamonds for resistant cells and open rings for unoccupied positions. The share chart shows observed points on a fixed 0–100% scale and the planned round range. Its percentage labels align with the grid as the chart resizes. Playback controls sit directly below the figures. Narrow cards show the unoccupied count across the last row. The selected saved-history row has a visible border, background and stronger text that follow both chart guides.

## Visual review

The five polished screenshots passed manual review on the final runtime candidate: desktop, 320px phone, 400% enlarged layout, extinction and selected saved history. Both narrow views retain readable legends, counts and nearby keyboard controls. Extinction shows 80 unoccupied positions, zero living cells and an undefined share; the chart preserves the initial observation without adding a false zero endpoint.

The five focused Chromium scenarios also check actual rendered capacity widths, cell shape geometry, raw observation positions, aligned percentage labels, keyboard stepping and playback, saved-history selection, reduced motion, imported evidence, random draws and XP. Viewing the figures preserves the raw saved state. Stepping and playback use the existing simulation actions.

## Validation results

The final candidate passed **1,059 unit checks across 28 files** and **89 Chromium scenarios across 14 specs**, with zero failures, skipped scenarios, flaky results or retries. The unit suite is unchanged. Five new browser scenarios inspect the live visuals and their relationship to the simulation. The runners capture 42 test files and ten support inputs, including the PNG helper, before and after each run.

The identical canonical and desktop runtime SHA-256 is `b17b162e70ccf92049a160ae6018a85b51f0b5c18ba18002c222187f9811547e`. Final evidence is in `unit-polished-results.json`, `browser-final-results.json` and their runner receipts. All 1,924 source-used interface labels and the eight new dashboard labels pass both registry checks. Screenshot review covers desktop, phone, enlarged layout, extinction and selected history. The independent audit verifies the raw results and captured inputs. Unique phase names retain earlier runs without overwriting their receipts.

## Retained diagnostics

The initial unit attempt ended with exit 134 and no complete results. The first browser runner was interrupted before producing results. The next focused browser run failed at an incorrect wrapper assertion. Source review also found an incorrect diamond tag assertion: the labelled population wrapper is a section containing a definition list, and dish diamonds are rotated square rectangles. Those assertions were corrected. Earlier runs and receipts remain available and are excluded from final passing counts. The polished candidate passed the full unit suite and the five focused browser scenarios with no retries. Durable console logs accompany subsequent runs.

## Focused local save

The focused tree continues verified Micro Lab commit `a83872b`. It contains the runtime pair, the new live-visual browser spec, eight dashboard labels and report artifacts. Registry blobs are built from the parent with only those eight labels added. Private Git indexes preserve the shared checkout and staging.

Preparation and publication require all working files to match their seals. Verification after publication checks the immutable committed tree, the source-used working labels and the eight dashboard labels. It reports any whole-registry hash drift caused by later unrelated translation edits without treating those edits as part of this commit.
