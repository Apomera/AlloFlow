# Physics plot callout improvements

Annotation cards now stay inside the plot interior, leaving axis ticks and titles visible on narrow screens. Their placement uses the full point and velocity-arrow envelope, then searches a bounded set of alternatives when the first positions are crowded. Obstacle-edge positions are clamped and deduplicated before the search limit is applied, so repeated reservations cannot crowd out useful alternatives. Each width attempt tries at most 58 positions before the final duplicate-position check. Selected readouts and recorded-route labels can retry once at 55% of the normal width limit when their first placement fails, retaining the same font and complete values. Their search therefore tries at most 116 positions; other cards retain the 58-position limit.

The selected readout keeps first priority, followed by recorded-route identities and analytical annotations. Routes retain their original newest-first ordering. With multiple comparison routes, the selected readout tries its existing higher position before the nearer one, leaving more space for route identities.

Fallback positions next to an existing card use the same 6px clearance as the collision rule. Marker-edge candidates keep their 10px offset. This lets long translated labels use tight openings that already satisfy the safety checks.

Cards retain the 12px font. Long text wraps to the available width; browsers with `Intl.Segmenter` keep grapheme clusters together, with a Unicode code-point fallback for older browsers. An indivisible cluster that cannot fit causes the card to be omitted instead of clipped. A card is also omitted when its height or a clear placement cannot fit. The recorded observation, plotted point, and native readout remain available.

Connector lines have a narrow dark outline to remain legible over trajectories. The outline starts beyond the card's own point and arrow envelope, with 3px clearance protecting marker and arrow strokes. Other marker boxes also receive 3px connector clearance. Connector paths keep 4px separation from previously placed connectors, including their outlines and antialiased edges. Paths at the same anchor can share its marker bundle, then separate outside that bundle. Higher-priority selected callouts keep their placement; lower-priority cards try another position or are omitted. The foreground connector retains its original rules: start at the marker radius plus 2px from the original plot anchor and terminate at the chosen card edge. Its color and opacity are preserved.

Lower-priority foreground connectors also keep 2px separation from the selected crosshair arms. This covers shared-anchor reference labels whose original foreground starts inside the selected marker bundle; their cards move or are omitted when the path would tint the crosshair.

The launcher barrel excludes the actual axis tick glyph bounds with 2px padding. Overlapping exclusions are merged before clipping, protecting the original tick ink and background while keeping the muzzle at the original release point. The release ring remains outside this barrel-only clip.

## Measurement preservation

These changes affect rendering after `window.StemLab.registerTool('physics',`. The numerical prefix matches `source-before-callouts.js` byte for byte. Equations, original recorded samples, selected values, and point anchors are preserved. The source and desktop mirror match, and JavaScript syntax checks pass.

- Before: `0b9335cba9d4b2d27c6839f48e0457bb6ee88d8146a2b83d1bc6e0b6798aec28`
- Final source and mirror: `90d7922145112ef4c87b0f84c579cc413ed9fa5aa0b2d33a04386dcd9ceacd4b`

## Validation

| Check | Actual result |
| --- | --- |
| Unit tests and files | 356 passed in 21 files |
| Browser cases and files | 35 passed once in 7 files; no retries |
| Positive saved captures | 99 positive PNGs: 35 callout canvases, 27 inspection captures, 18 trail captures, and 19 point/vector captures. The inspection set includes 18 scenes with native canvas paint proof. |
| Text and graphical contrast minima | Actual callout pixels: text 9.44:1, connectors 5.12:1, selected crosshairs 10.72:1, original point rings 11.46:1. Each theme also meets its enforced contrast floors. |
| Minimum font size | 12.00px across all four visual reports |
| Historical files preserved | All 601 protected files retain their original hashes |
| Independent raster, geometry, source, and archive audit | Passed all 20 checks; no missing inputs or failures |
| Manual visual inspection | Reviewed the final 320px dark impact, 1100px high-contrast apex, and long translated comparison-caption PNGs. Callout text, axis labels, selected markers, and connectors remain clear. The HUD stress-test limitation is recorded below. |

The browser checks cover launch, apex, impact, elevated horizontal release, drag, unfinished flights, dense overlays, and long translated text across desktop and narrow layouts. Saved pixels check that axis text, cards, connector lines, and original markers survive the final canvas paint. The archived blank-canvas control is rejected despite matching geometry; the gradient control detects blank paint and verifies restored paint. Neither is counted among the 99 positive captures.

The existing plot-clipping regression now records each complete canvas path and its fill rule. Every `nonzero` trajectory clip still must contain exactly the original plot rectangle. The separate launcher `evenodd` clip must contain the full canvas rectangle followed by finite, positive glyph holes inside its bounds. Both clip types are required, and native drawing calls remain unchanged.

The capture audit derives Playwright's integer document crop independently. It checks three fixed canvas origins against actual axis glyph pixels: continuous layout coordinates, device-pixel rounding, and CSS-pixel rounding. CSS-pixel rounding matches [Chromium's accelerated canvas layer painter](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/paint/html_canvas_painter.cc). One globally verified origin maps every paint witness in each capture; saved-pixel channel errors must be at most 4. Foreground witnesses also compare immediate and completed native canvas pixels to detect later paint covering a connector.

### Current limitation

The artificial long single-word run prefix still clips the HUD scope line in the stress test. Its plot caption wraps fully, and the flight legend and recorded values remain available.

### Preserved failed attempts

- `initial-sandbox-browser-startup/` preserves 44 files. That attempt passed 356 unit tests in 21 files, then failed to launch Chromium because the sandbox used a separate browser-cache path. The simulator never loaded.
- `before-canvas-bounds-fix/` preserves 125 files. That attempt also passed 356 unit tests in 21 files. Its first canvas screenshot was 954px high while the backing bitmap was 952px high because the screenshot crop and canvas backing use different rounding. The capture assertion failed before raster verification; no browser case passed in that attempt.
- `before-clip-path-test-fix/` preserves 1,673 files, including 38 copied invocation inputs, helpers, and proofs plus 1,635 output and artifact files. It passed all 356 unit tests in 21 files, 5 callout cases, 5 inspection cases, and 4 trail cases. The regression suite passed 13 cases, failed one, and skipped one; the point suite did not start. The old recorder kept only the last rectangle in the launcher's glyph mask, then compared that glyph hole with the plot boundary. The archive retains the original test, source and mirror, actual failure, complete snapshots, and saved paint evidence before the recorder was corrected.

These archives retain their source, test, result, and integrity evidence. They are separate from final positive capture totals. The independent verifier rehashed all 44, 125, and 1,673 archived files, checked their original invocation snapshots and actual results, and preserved the recorded failures.

The first independent audit result is retained in `verification-before-archive-stop-message-fix.json`, with its original verifier. Its failed archive assertion assumed empty top-level reporter errors. The corrected audit requires Playwright's exact stop-after-one-failure message for the archived regression and empty errors for the other stages. Production checks and thresholds retain their original requirements.

### Commands used

```powershell
& 'C:\Users\cabba\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' reports/physics-plot-callouts-2026-10-04/run-checks.cjs --prepare --unit --callouts --inspection --trail --regression --point
& 'C:\Users\cabba\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' reports/physics-plot-callouts-2026-10-04/verify-report.cjs
```

The runner refuses to overwrite existing results. Preserve a completed or failed attempt before preparing another run. The checks use one browser worker, no retries, and the existing budgets and contrast thresholds.

Changes remain uncommitted.
