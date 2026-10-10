# Physics status and energy layout

Status and energy readouts now wrap to the available canvas width. Long translated labels and extreme values retain readable text instead of clipping or shrinking. The main heading stays at 14px and the remaining readings at 12px. Short labels retain their compact arrangement.

The canvas grows by the extra space needed above and below the graph. The graph keeps its usable height, scale, original point positions relative to the plot, and recorded measurements. Value fields use columns when they fit and flow onto additional lines when necessary. The energy bar retains its original colors and proportions.

The complete readout text is also available through the canvas's accessible description. Wrapping uses grapheme clusters where `Intl.Segmenter` is available, with a code-point fallback. An indivisible cluster wider than the entire text band displays an ellipsis; its original text remains in the description.

## Measurement preservation

The numerical source before `window.StemLab.registerTool('physics',` is identical to the previous version after normalizing LF/CRLF line endings. The existing simulation-step and apex bookkeeping block was moved intact before measurement and painting so the current readouts and plotted point use the same completed step. Equations, numeric formatting, energy calculations, and recorded samples are preserved. Source and mirror hashes are compared without normalization.

- Previous source: `90d7922145112ef4c87b0f84c579cc413ed9fa5aa0b2d33a04386dcd9ceacd4b`
- Current source and desktop mirror: `862666ca23a82fa5d15b73917b011fa9eb157554ac3d76302a4cb4d4a051abe0`

## Validation

| Check | Result |
| --- | --- |
| Numerical and saved-state tests | 356 passed in 21 files |
| Layout and apex browser tests | 9 passed |
| Controls and energy browser tests | 14 passed |
| New readout browser tests | 3 passed; 19 saved canvases |
| Callout and velocity regressions | 5 and 6 passed |
| Total browser tests | 37 passed across 7 files in the final runs; no retries |
| Saved positive canvases | 73: 19 readout, 35 callout, and 19 velocity captures |
| Evidence audit | Passed; see `verification.json` |

The new tests cover 1100px, 375px, and 320px viewports in all three themes, extreme parameters, paused stepping, long translations, Arabic and emoji, energy visibility, and repeated resizing. They verify native text bounds, non-overlap, final canvas ink, unchanged recorded data, and restoration of the compact layout. Thin antialiased ellipses are checked against native glyph masks and the actual canvas backdrop.

Manually reviewed the final `hud/long-translation.png`, `hud/growth-restored.png`, and `hud/oversized-grapheme.png`. Text, graph labels, energy readings, and selected markers remain clear. An independent source review found no blocking issue. Browser coverage uses Chromium with one worker, no retries, and the existing test budgets. The new spec is included in the physics CI workflow.

The final callout run uses `callout.config.ts` with trace recording off. Native paint assertions, PNG comparisons, test budgets, browser settings, and memory limits are unchanged. This avoids recording thousands of extra trace steps while retaining the suite's own pixel evidence. Its full nine-layout case passed within the original 300-second budget; all five cases passed in 5.9 minutes.

### Preserved attempts

- `before-selection-fixture-fix/`: 188 files. The fixture disabled comparison buttons that it later tried to select.
- `before-ellipsis-ink-fix/`: 270 files. The initial ink assertion required opaque pixels in a thin antialiased ellipsis.
- `before-point-spacing-fix/`: 231 files. An existing assertion required doubled spaces; its comparison now normalizes whitespace while retaining the exact values.
- `callout-timeout/`: 148 files. The 300-second budget expired during generally slow execution. All 31 recorded canvas snapshots had stable dimensions. The failing screenshot began after teardown started; the eight earlier screenshots succeeded. The underlying resource bottleneck was not established.
- `callout-timeout-2/`: 199 files. Another attempt reached the same budget while an unrelated WebGL suite also ran. No paint assertion failed before timeout.
- `callout-raster-failure/`: 134 files. One saved dark-theme canvas became blank during capture despite valid native pixels beforehand. The unchanged raster assertion rejected it. The cause remains unconfirmed; every final capture passed that assertion.
- `interrupted-callout-validation/` and `interrupted-callout-validation-2/`: 256 and 128 files from interrupted runs without completed suite results.

The previous-source control in `baseline-results.json` also reached the 300-second timeout. Its assertions differ only in file paths needed to load the saved prior source and helpers. Its partial captures are excluded from successful totals. The audit checks this control's source and spec identities.

These attempts are excluded from final successful totals. The audit verified hashes for all 1,170 archived failure files and 384 interrupted-run files. Production source, assertion thresholds, and time budgets were unchanged for the final callout run.

Run `node reports/physics-hud-layout-2026-10-09/verify-results.cjs` to check source identity, complete results, native paint evidence, capture hashes, and archived files. The verification script does not independently decode every saved PNG glyph. Its first raw prefix comparison rejected line-ending differences; the final comparison explicitly normalizes LF/CRLF and retains exact whole-file hashes.

Changes remain uncommitted.
